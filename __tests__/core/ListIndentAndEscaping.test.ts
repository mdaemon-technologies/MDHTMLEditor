/**
 * Regression tests for two bugs seen in the templates feature:
 *  1. Content whose closing-tag slashes were backslash-escaped (`<\/p>`) by the
 *     host imported as literal text instead of real tags.
 *  2. Tab / Shift+Tab did not change list-item indentation — which turned out to
 *     be a consequence of (1): the mangled markup produced a malformed list with
 *     no real sibling items to nest. With a well-formed list, the second and
 *     later items indent; the first item at a level does not nest (stock
 *     TipTap `sinkListItem`).
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

describe('escaped closing tags on import', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
  });
  afterEach(() => { editor?.destroy(); container?.remove(); });

  it('setContent parses <\\/tag> as real closing tags, not text', () => {
    editor.setContent(
      '<p>Last Week<\\/p>' +
      '<ul><li>Completed the following<\\/li>' +
      '<li>Fixed the following<\\/li><\\/ul>',
    );
    const text = editor.getTipTap()!.getText();
    // The literal "</p>", "</li>", "</ul>" must NOT survive in the text.
    expect(text).not.toContain('/p>');
    expect(text).not.toContain('/li>');
    expect(text).not.toContain('/ul>');
    expect(text).toContain('Last Week');
    expect(text).toContain('Completed the following');

    // The list structure is real: a bullet list with two items.
    const html = editor.getContent();
    expect(html).toContain('<ul>');
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
    expect(html).not.toContain('<\\/');
  });

  it('insertContent repairs escaped slashes too', () => {
    editor.setContent('');
    editor.insertContent('<ul><li>a<\\/li><li>b<\\/li><\\/ul>');
    const html = editor.getContent();
    expect(html).toContain('<ul>');
    expect(html).not.toContain('\\/');
  });
});

describe('list-item Tab indentation (TinyMCE parity)', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
  });
  afterEach(() => { editor?.destroy(); container?.remove(); });

  function placeCursorIn(word: string): void {
    const tt = editor.getTipTap()!;
    tt.commands.focus();
    let pos = 0;
    tt.state.doc.descendants((node, p) => {
      if (node.isText && node.text === word) pos = p;
      return true;
    });
    tt.commands.setTextSelection(pos + 1);
  }

  it('indents a non-first item by nesting it under its previous sibling', () => {
    const tt = editor.getTipTap()!;
    editor.setContent('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
    placeCursorIn('two');
    expect(tt.commands.sinkListItem('listItem')).toBe(true);
    // "two" is now inside a nested list under "one".
    expect(editor.getContent()).toMatch(/one<\/p>.*<ul>.*two/s);
  });

  it('does NOT indent the first item at a level (no bullet to nest under)', () => {
    const tt = editor.getTipTap()!;
    editor.setContent('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
    placeCursorIn('one');
    const before = editor.getContent();
    // The first item cannot sink — the list is left unchanged.
    expect(tt.commands.sinkListItem('listItem')).toBe(false);
    expect(editor.getContent()).toBe(before);
  });

  it('Shift+Tab (liftListItem) outdents a nested item back to the top level', () => {
    const tt = editor.getTipTap()!;
    editor.setContent('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
    placeCursorIn('two');
    tt.commands.sinkListItem('listItem');  // two -> nested under one
    placeCursorIn('two');
    tt.commands.liftListItem('listItem');  // two -> back out
    // Back to a flat two-item list.
    expect((editor.getContent().match(/<ul>/g) ?? []).length).toBe(1);
    expect((editor.getContent().match(/<li>/g) ?? []).length).toBe(2);
  });
});
