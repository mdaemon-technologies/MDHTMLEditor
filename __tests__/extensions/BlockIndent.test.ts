/**
 * Block indentation (CKEditor-style Tab) tests.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

function pressKey(tt: any, key: string, shift = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key, code: key, shiftKey: shift, bubbles: true, cancelable: true,
  });
  tt.view.dom.dispatchEvent(event);
  return event;
}

function pressTab(tt: any, shift = false): KeyboardEvent {
  return pressKey(tt, 'Tab', shift);
}

describe('BlockIndent', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
  });
  afterEach(() => { editor?.destroy(); container?.remove(); });

  function caretIn(word: string): void {
    const tt = editor.getTipTap()!;
    tt.commands.focus();
    let pos = 0;
    tt.state.doc.descendants((n, p) => { if (n.isText && n.text === word) pos = p; return true; });
    tt.commands.setTextSelection(pos + 1);
  }

  describe('commands', () => {
    it('indentBlock adds a left margin in 40px steps', () => {
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      expect(editor.getTipTap()!.commands.indentBlock()).toBe(true);
      expect(editor.getContent()).toContain('margin-left: 40px');
      editor.getTipTap()!.commands.indentBlock();
      expect(editor.getContent()).toContain('margin-left: 80px');
    });

    it('outdentBlock removes a step, and clears the style at zero', () => {
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      editor.getTipTap()!.commands.indentBlock();
      editor.getTipTap()!.commands.outdentBlock();
      expect(editor.getContent()).not.toContain('margin-left');
    });

    it('outdentBlock at zero indent is a no-op (returns false)', () => {
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      expect(editor.getTipTap()!.commands.outdentBlock()).toBe(false);
    });

    it('caps the indent at the configured maximum', () => {
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      const tt = editor.getTipTap()!;
      for (let i = 0; i < 20; i += 1) tt.commands.indentBlock();
      expect(editor.getContent()).toContain('margin-left: 400px');
      expect(editor.getContent()).not.toContain('440px');
    });

    it('indents headings as well as paragraphs', () => {
      editor.setContent('<h2>Title</h2>');
      caretIn('Title');
      editor.getTipTap()!.commands.indentBlock();
      expect(editor.getContent()).toMatch(/<h2[^>]*margin-left: 40px/);
    });

    it('round-trips the indent through set/getContent', () => {
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      editor.getTipTap()!.commands.indentBlock();
      const html = editor.getContent();
      editor.setContent(html);
      expect(editor.getContent()).toBe(html);
    });

    it('parses an incoming margin-left as an existing indent', () => {
      editor.setContent('<p style="margin-left: 80px">hello</p>');
      caretIn('hello');
      // Outdent should step down from the parsed 80px, not from zero.
      editor.getTipTap()!.commands.outdentBlock();
      expect(editor.getContent()).toContain('margin-left: 40px');
    });
  });

  describe('Tab key', () => {
    it('Tab indents a paragraph instead of escaping the editor', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      const ev = pressTab(tt);
      expect(editor.getContent()).toContain('margin-left: 40px');
      // Tab is consumed — it does not bubble out to move focus.
      expect(ev.defaultPrevented).toBe(true);
      pressTab(tt, true);
      expect(editor.getContent()).not.toContain('margin-left');
    });

    it('Tab is always consumed, even in a paragraph already at max indent', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p style="margin-left: 400px">hello</p>');
      caretIn('hello');
      const ev = pressTab(tt);
      // Capped (no change past 400px) but still consumed — never escapes.
      expect(editor.getContent()).toContain('margin-left: 400px');
      expect(editor.getContent()).not.toContain('440px');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('Tab in a non-first list item sinks it (nests under the sibling)', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
      caretIn('two');
      const ev = pressTab(tt);
      // two is nested under one; no margin-left applied.
      expect(editor.getContent()).toMatch(/one<\/p><ul>/);
      expect(editor.getContent()).not.toContain('margin-left');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('Tab in the first list item indents its content instead of nesting', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
      caretIn('one');
      const ev = pressTab(tt);
      // No new nested list; the item's own paragraph gets the indent.
      expect(editor.getContent()).not.toMatch(/<li><ul>/);
      expect(editor.getContent()).toMatch(/<li><p[^>]*margin-left: 40px/);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('Shift+Tab in an indented first list item reduces the indent, then lifts', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<ul><li><p>one</p></li></ul>');
      caretIn('one');
      pressTab(tt);                       // inner indent -> 40px
      expect(editor.getContent()).toContain('margin-left: 40px');
      pressTab(tt, true);                 // reduce indent -> 0
      expect(editor.getContent()).not.toContain('margin-left');
      expect(editor.getContent()).toContain('<li>');
      pressTab(tt, true);                 // lift the item out of the list
      expect(editor.getContent()).not.toContain('<li>');
    });

    it('Tab inside a table does not indent (leaves cell navigation to Table)', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>');
      caretIn('a');
      const before = tt.state.selection.from;
      pressTab(tt);
      expect(editor.getContent()).not.toContain('margin-left');
      // Tab moved the selection to the next cell instead.
      expect(tt.state.selection.from).not.toBe(before);
    });
  });

  describe('Esc-then-Tab escape (WCAG no-keyboard-trap)', () => {
    it('Esc arms a one-shot mode; the next Tab moves focus instead of indenting', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      pressKey(tt, 'Escape');
      expect((tt as any).storage.blockIndent.escapeArmed).toBe(true);
      pressTab(tt);
      // Did not indent, and the one-shot flag was consumed.
      expect(editor.getContent()).not.toContain('margin-left');
      expect((tt as any).storage.blockIndent.escapeArmed).toBe(false);
    });

    it('after the escape Tab, indentation works again', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      pressKey(tt, 'Escape');
      pressTab(tt);               // escapes (consumes the armed flag)
      caretIn('hello');
      pressTab(tt);               // normal indent again
      expect(editor.getContent()).toContain('margin-left: 40px');
    });

    it('any other key disarms the escape, so a later Tab still indents', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      pressKey(tt, 'Escape');
      pressKey(tt, 'a');          // disarms
      expect((tt as any).storage.blockIndent.escapeArmed).toBe(false);
      pressTab(tt);
      expect(editor.getContent()).toContain('margin-left: 40px');
    });

    it('a bare Shift press does not disarm (so Esc then Shift+Tab escapes)', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p style="margin-left: 40px">hello</p>');
      caretIn('hello');
      pressKey(tt, 'Escape');
      pressKey(tt, 'Shift', true);           // modifier alone must not disarm
      expect((tt as any).storage.blockIndent.escapeArmed).toBe(true);
      pressTab(tt, true);                     // Shift+Tab escapes, does not outdent
      expect(editor.getContent()).toContain('margin-left: 40px');
      expect((tt as any).storage.blockIndent.escapeArmed).toBe(false);
    });
  });

  describe('execCommand routing', () => {
    it("execCommand('indent') indents a plain block", () => {
      editor.setContent('<p>hello</p>');
      caretIn('hello');
      editor.execCommand('indent');
      expect(editor.getContent()).toContain('margin-left: 40px');
    });

    it("execCommand('outdent') removes a block indent", () => {
      editor.setContent('<p style="margin-left: 40px">hello</p>');
      caretIn('hello');
      editor.execCommand('outdent');
      expect(editor.getContent()).not.toContain('margin-left');
    });
  });
});
