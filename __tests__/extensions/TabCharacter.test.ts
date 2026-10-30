/**
 * Tab character tests: Tab inserts a tab at the caret, and Backspace / Delete
 * remove it in one press.
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { CodeBlock } from '@tiptap/extension-code-block';
import { HardBreak } from '@tiptap/extension-hard-break';
import { closeHistory } from '@tiptap/pm/history';

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { CodeSample } from '../../src/extensions/CodeSample';
import { TabCharacter } from '../../src/extensions/TabCharacter';

/** A tab as getContent() writes it. */
const TAB = '<span style="white-space: pre;">\t</span>';

function pressKey(tt: any, key: string, shift = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key, code: key, shiftKey: shift, bubbles: true, cancelable: true,
  });
  tt.view.dom.dispatchEvent(event);
  return event;
}

describe('TabCharacter', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
  });
  afterEach(() => { editor?.destroy(); container?.remove(); });

  /** Put the caret `offset` characters into the text node `word`. */
  function caretAt(word: string, offset: number): void {
    const tt = editor.getTipTap()!;
    tt.commands.focus();
    let pos = -1;
    tt.state.doc.descendants((n, p) => { if (n.isText && n.text === word) pos = p; return true; });
    if (pos < 0) throw new Error(`no text node "${word}"`);
    tt.commands.setTextSelection(pos + offset);
  }

  function tabCount(): number {
    let count = 0;
    editor.getTipTap()!.state.doc.descendants((n) => { if (n.type.name === 'tabCharacter') count += 1; return true; });
    return count;
  }

  describe('Tab key', () => {
    it('inserts a tab at the caret after typed text, not at the start of the line', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretAt('hello', 3);
      const ev = pressKey(tt, 'Tab');
      expect(ev.defaultPrevented).toBe(true);
      expect(editor.getContent()).toContain(`hel${TAB}lo`);
      expect(editor.getContent()).not.toContain('margin-left');
    });

    it('inserts a tab at the end of a line', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretAt('hello', 5);
      pressKey(tt, 'Tab');
      expect(editor.getContent()).toContain(`hello${TAB}`);
    });

    it('inserts a tab at the start of a line', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretAt('hello', 0);
      pressKey(tt, 'Tab');
      expect(editor.getContent()).toContain(`${TAB}hello`);
      expect(editor.getContent()).not.toContain('margin-left');
    });

    it('inserts a tab in a heading', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<h2>title</h2>');
      caretAt('title', 2);
      pressKey(tt, 'Tab');
      expect(editor.getContent()).toMatch(new RegExp(`<h2[^>]*>ti${TAB}tle</h2>`));
    });

    it('leaves the caret after the tab, so typing continues the line', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretAt('hello', 5);
      pressKey(tt, 'Tab');
      expect(tt.state.selection.$from.nodeBefore?.type.name).toBe('tabCharacter');
      tt.commands.insertContent('x');
      expect(editor.getContent()).toContain(`hello${TAB}x`);
    });

    it('keeps the font of the text it is typed in', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p><span style="font-family: Georgia">hello</span></p>');
      caretAt('hello', 5);
      pressKey(tt, 'Tab');
      const node = tt.state.selection.$from.nodeBefore!;
      expect(node.type.name).toBe('tabCharacter');
      expect(node.marks.map((mark) => mark.type.name)).toContain('textStyle');
    });

    it('is reverted by a single undo', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      // Keep setContent out of the Tab's undo step.
      tt.view.dispatch(closeHistory(tt.state.tr));
      caretAt('hello', 3);
      pressKey(tt, 'Tab');
      expect(tabCount()).toBe(1);
      editor.execCommand('Undo');
      expect(tabCount()).toBe(0);
      expect(tt.state.doc.textContent).toBe('hello');
    });
  });

  describe('Backspace and Delete', () => {
    it('Backspace right after a tab removes the tab, and only the tab', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretAt('hello', 3);
      pressKey(tt, 'Tab');
      const ev = pressKey(tt, 'Backspace');
      expect(ev.defaultPrevented).toBe(true);
      expect(tabCount()).toBe(0);
      expect(tt.state.doc.textContent).toBe('hello');
      // The caret stays where the tab was.
      expect(tt.state.selection.$from.parentOffset).toBe(3);
    });

    it('Backspace removes a tab at the start of a line without joining it to the line above', () => {
      const tt = editor.getTipTap()!;
      editor.setContent(`<p>one</p><p>${TAB}two</p>`);
      caretAt('two', 0);
      pressKey(tt, 'Backspace');
      expect(tabCount()).toBe(0);
      expect(tt.state.doc.childCount).toBe(2);
      expect(tt.state.doc.child(1).textContent).toBe('two');
    });

    it('Delete right before a tab removes the tab', () => {
      const tt = editor.getTipTap()!;
      editor.setContent(`<p>hel${TAB}lo</p>`);
      caretAt('hel', 3);
      const ev = pressKey(tt, 'Delete');
      expect(ev.defaultPrevented).toBe(true);
      expect(tabCount()).toBe(0);
      expect(tt.state.doc.textContent).toBe('hello');
    });

    it('Shift+Backspace removes a tab as Backspace does', () => {
      const tt = editor.getTipTap()!;
      editor.setContent(`<p>hel${TAB}lo</p>`);
      caretAt('lo', 0);
      const ev = pressKey(tt, 'Backspace', true);
      expect(ev.defaultPrevented).toBe(true);
      expect(tabCount()).toBe(0);
      expect(tt.state.doc.textContent).toBe('hello');
    });

    it('leaves Backspace that is not next to a tab to the editor', () => {
      const tt = editor.getTipTap()!;
      editor.setContent(`<p>${TAB}hello</p>`);
      caretAt('hello', 3);
      const ev = pressKey(tt, 'Backspace');
      expect(ev.defaultPrevented).toBe(false);
      expect(tabCount()).toBe(1);
    });
  });

  describe('HTML', () => {
    it('round-trips through getContent / setContent', () => {
      const tt = editor.getTipTap()!;
      editor.setContent('<p>hello</p>');
      caretAt('hello', 3);
      pressKey(tt, 'Tab');
      const html = editor.getContent();
      editor.setContent(html);
      expect(tabCount()).toBe(1);
      expect(editor.getContent()).toBe(html);
    });

    it('gives a tab as \\t in the editor text', () => {
      editor.setContent(`<p>a${TAB}b</p>`);
      expect(editor.getTipTap()!.getText()).toBe('a\tb');
    });

    it('parses the white-space: pre tab span other editors write', () => {
      editor.setContent(
        '<p>a<span style="white-space:pre;">\t</span>b</p>' +
        '<p>c<span style="white-space: pre-wrap">\t</span>d</p>',
      );
      expect(tabCount()).toBe(2);
    });

    it('parses a span holding several tabs as that many tabs', () => {
      editor.setContent('<p>a<span style="white-space:pre">\t\t</span>b</p>');
      expect(tabCount()).toBe(2);
      expect(editor.getContent()).toContain(`a${TAB}${TAB}b`);
    });

    it('keeps the font on a tab span, which sets the width of the tab', () => {
      editor.setContent('<p>a<span style="font-size: 20px; white-space: pre">\t</span>b</p>');
      expect(tabCount()).toBe(1);
      let marks: string[] = [];
      editor.getTipTap()!.state.doc.descendants((n) => {
        if (n.type.name === 'tabCharacter') marks = n.marks.map((mark) => `${mark.type.name}:${mark.attrs.fontSize}`);
        return true;
      });
      expect(marks).toEqual(['textStyle:20px']);
      expect(editor.getContent()).toMatch(/<span style="font-size: 20px;?">\s*<span style="white-space: pre;">\t<\/span>/);
    });

    it('leaves a tab span in a code block as a tab in the code', () => {
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, CodeBlock, TabCharacter],
        content: '<pre><code>a<span style="white-space: pre">\t</span>b</code></pre>',
      });
      expect(tt.state.doc.firstChild!.type.name).toBe('codeBlock');
      expect(tt.state.doc.textContent).toBe('a\tb');
      tt.destroy();
    });

    it('reads a tab inside a text run that keeps its whitespace as a tab', () => {
      // Google Docs writes each run as a white-space: pre-wrap span, with any
      // tab inline in its text.
      editor.setContent('<p><span style="font-size: 11pt; white-space: pre-wrap">Name:\tAda</span></p>');
      expect(tabCount()).toBe(1);
      expect(editor.getTipTap()!.getText()).toBe('Name:\tAda');
      expect(editor.getContent()).toMatch(/Name:<span style="white-space: pre;">\t<\/span>.*Ada/);
    });

    it('turns a tab in pasted plain text into a tab', () => {
      editor.setContent('<p>x</p>');
      caretAt('x', 1);
      editor.getTipTap()!.view.pasteText('a\tb');
      expect(tabCount()).toBe(1);
      expect(editor.getContent()).toContain(`a${TAB}b`);
    });

    // A bare TipTap editor: under Jest, HTMLEditor's code block is a mock with no node.
    function countTabs(tt: Editor): number {
      let count = 0;
      tt.state.doc.descendants((n) => { if (n.type.name === 'tabCharacter') count += 1; return true; });
      return count;
    }

    it('turns the tabs of a code block made a paragraph into tabs', () => {
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, CodeBlock, TabCharacter],
        content: '<pre><code>a\tb</code></pre>',
      });
      expect(countTabs(tt)).toBe(0);
      tt.commands.setTextSelection(2);
      tt.commands.setParagraph();
      expect(countTabs(tt)).toBe(1);
      expect(tt.getHTML()).toBe(`<p>a${TAB}b</p>`);
      tt.destroy();
    });

    it('keeps the tabs of a line made a code block, as tabs in the code', () => {
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, CodeBlock, TabCharacter],
        content: `<p>a${TAB}${TAB}b${TAB}</p>`,
      });
      tt.commands.setTextSelection(2);
      tt.commands.toggleCodeBlock();
      expect(tt.state.doc.firstChild!.type.name).toBe('codeBlock');
      expect(tt.state.doc.textContent).toBe('a\t\tb\t');
      tt.destroy();
    });

    it('keeps the tabs of a line the code sample button converts', () => {
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, HardBreak, CodeBlock, CodeSample, TabCharacter],
        content: `<p>one<br>a${TAB}b<br>two</p>`,
      });
      let pos = 0;
      tt.state.doc.descendants((n, p) => { if (n.isText && n.text === 'a') pos = p; return true; });
      tt.commands.setTextSelection(pos + 1);
      tt.commands.toggleCodeSample();
      const code = tt.state.doc.child(1);
      expect(code.type.name).toBe('codeBlock');
      expect(code.textContent).toBe('a\tb');
      tt.destroy();
    });

    it('still removes a tab deleted from a line of text', () => {
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, CodeBlock, TabCharacter],
        content: `<p>a${TAB}b</p>`,
      });
      tt.commands.deleteRange({ from: 2, to: 3 });
      expect(tt.getHTML()).toBe('<p>ab</p>');
      tt.destroy();
    });

    it('turns tabs in the initial content of a bare TipTap editor into tabs', async () => {
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, TabCharacter],
        content: '<p style="white-space: pre-wrap">a\tb</p>',
      });
      // TipTap emits `create` on the next tick.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(countTabs(tt)).toBe(1);
      tt.destroy();
    });

    it('does not report that conversion as an edit', async () => {
      const onUpdate = jest.fn();
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, TabCharacter],
        content: '<p style="white-space: pre-wrap">a\tb</p>',
        onUpdate,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(countTabs(tt)).toBe(1);
      expect(onUpdate).not.toHaveBeenCalled();
      tt.destroy();
    });

    it('keeps a tab-only line as a line, without a filler line break', () => {
      editor.setContent(`<p>${TAB}</p>`);
      expect(tabCount()).toBe(1);
      expect(editor.getContent()).not.toContain('<br>');
    });

    it('pastes a tab span as a tab', () => {
      editor.setContent('<p>x</p>');
      caretAt('x', 1);
      editor.getTipTap()!.view.pasteHTML('<p>a<span style="white-space:pre;">\t</span>b</p>');
      expect(tabCount()).toBe(1);
    });

    it('pastes a span holding several tabs as that many tabs', () => {
      editor.setContent('<p>x</p>');
      caretAt('x', 1);
      editor.getTipTap()!.view.pasteHTML('<p>a<span style="white-space:pre">\t\t\t</span>b</p>');
      expect(tabCount()).toBe(3);
    });

    describe('only a tab span becomes a tab', () => {
      it('a tab span that also holds an image keeps the image', () => {
        editor.setContent('<p><span style="white-space: pre">\t<img src="https://example.com/a.png"></span>x</p>');
        expect(editor.getContent()).toContain('<img');
      });

      it('a white-space: break-spaces tab span is a tab', () => {
        editor.setContent('<p>a<span style="white-space: break-spaces">\t</span>b</p>');
        expect(tabCount()).toBe(1);
      });

      it('a white-space: pre span holding text stays text', () => {
        editor.setContent('<p><span style="white-space: pre">hello</span></p>');
        expect(tabCount()).toBe(0);
        expect(editor.getTipTap()!.state.doc.textContent).toBe('hello');
      });

      it('a tab in a span without white-space: pre is ordinary whitespace', () => {
        editor.setContent('<p>a<span>\t</span>b</p>');
        expect(tabCount()).toBe(0);
      });

      it('a tab span writes only white-space: pre, whatever else it carried', () => {
        editor.setContent('<p>a<span style="white-space: pre; position: fixed; top: 0">\t</span>b</p>');
        expect(tabCount()).toBe(1);
        const html = editor.getContent();
        expect(html).toContain(TAB);
        expect(html).not.toContain('position');
        expect(html).not.toContain('top');
      });
    });
  });
});
