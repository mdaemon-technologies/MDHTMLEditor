/**
 * Paste-Markdown mode.
 *
 * The pastes here are dispatched as real ClipboardEvents on the editor's DOM, so
 * prosemirror-view's own paste handling runs: `view.pasteHTML()`/`pasteText()`
 * build a synthetic event with no clipboardData, which this feature deliberately
 * falls through on.
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Heading } from '@tiptap/extension-heading';
import { Bold } from '@tiptap/extension-bold';
import { closeHistory } from '@tiptap/pm/history';
import { HTMLEditor } from '../../src/core/HTMLEditor';
import { PasteMarkdown, pasteMarkdownText } from '../../src/extensions/PasteMarkdown';

/** A DataTransfer good enough for the paste path. */
function clipboard(data: Record<string, string>, files: File[] = []): DataTransfer {
  return {
    types: [...Object.keys(data), ...(files.length ? ['Files'] : [])],
    getData: (type: string) => data[type] ?? '',
    files,
    items: [],
  } as unknown as DataTransfer;
}

function paste(editor: HTMLEditor, data: Record<string, string>, files: File[] = []): ClipboardEvent {
  const event = new ClipboardEvent('paste', {
    clipboardData: clipboard(data, files),
    bubbles: true,
    cancelable: true,
  } as ClipboardEventInit);
  editor.getTipTap()!.view.dom.dispatchEvent(event);
  return event;
}

/** Put the caret inside the first text node holding `text`. */
function caretIn(editor: HTMLEditor, text: string): void {
  const tt = editor.getTipTap()!;
  let pos: number | null = null;
  tt.state.doc.descendants((node, nodePos) => {
    if (pos === null && node.isText && node.text?.includes(text)) {
      pos = nodePos + (node.text.indexOf(text) + text.length);
    }
    return pos === null;
  });
  tt.commands.setTextSelection(pos ?? 1);
}

describe('PasteMarkdown', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container, { paste_markdown: true });
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  describe('when the mode is off', () => {
    beforeEach(() => {
      editor.setPasteMarkdown(false);
    });

    it('should leave block Markdown literal', () => {
      paste(editor, { 'text/plain': '# Heading' });

      expect(editor.getContent()).toContain('# Heading');
      expect(editor.getContent()).not.toContain('<h1>');
    });

    it('should leave a list literal', () => {
      paste(editor, { 'text/plain': '- a\n- b' });

      expect(editor.getContent()).not.toContain('<ul>');
    });
  });

  describe('when the mode is on', () => {
    it('should convert block Markdown', () => {
      paste(editor, { 'text/plain': '# Heading\n\n- a\n- b' });

      const html = editor.getContent();
      expect(html).toMatch(/<h1[^>]*>Heading<\/h1>/);
      expect(html).toContain('<ul>');
      expect(html).not.toContain('# Heading');
    });

    it('should claim the paste', () => {
      const event = paste(editor, { 'text/plain': '# Heading' });

      expect(event.defaultPrevented).toBe(true);
    });

    it('should ignore the clipboard HTML', () => {
      // Editors put syntax-highlighted HTML next to the raw Markdown; converting
      // that would paste coloured code instead of formatting.
      paste(editor, {
        'text/plain': '# Heading',
        'text/html': '<span style="color:#f00">#</span> Heading',
      });

      const html = editor.getContent();
      expect(html).toMatch(/<h1[^>]*>Heading<\/h1>/);
      expect(html).not.toContain('color:');
    });

    it('should merge an inline paste into the current paragraph', () => {
      editor.setContent('<p>foobar</p>');
      caretIn(editor, 'foo');

      paste(editor, { 'text/plain': 'use `npm` and **b**' });

      const html = editor.getContent();
      expect(html).toContain('<code>npm</code>');
      expect(html).toContain('<strong>b</strong>');
      // One paragraph, not three.
      expect(html.match(/<(p|div)[ >]/g) ?? []).toHaveLength(1);
      expect(editor.getTipTap()!.getText()).toBe('foouse npm and bbar');
    });

    it('should turn a single newline into a line break', () => {
      editor.setContent('<p>foobar</p>');
      caretIn(editor, 'foo');

      paste(editor, { 'text/plain': 'a\nb' });

      expect(editor.getContent()).toContain('fooa<br>bbar');
    });

    it('should paste a task list as plain bullets', () => {
      paste(editor, { 'text/plain': '- [ ] a\n- [x] b' });

      const html = editor.getContent();
      expect(html).toContain('<ul>');
      expect(html).not.toContain('<input');
      expect(html).not.toContain('[ ]');
      expect(editor.getTipTap()!.getText()).toContain('a');
    });

    it('should keep the text after the caret out of a pasted table', () => {
      editor.setContent('<p>foobar</p>');
      caretIn(editor, 'foo');

      paste(editor, { 'text/plain': '| a |\n| --- |\n| c |' });

      const html = editor.getContent();
      expect(html).toContain('<table');
      // `bar` belongs after the table, not inside its last cell.
      expect(html).not.toMatch(/<td[^>]*>[\s\S]*bar[\s\S]*<\/td>/);
      expect(html).toMatch(/<\/table>[\s\S]*bar/);
    });

    it('should not re-run paste rules over the converted text', () => {
      paste(editor, { 'text/plain': '\\*not italic\\*' });

      const html = editor.getContent();
      expect(html).toContain('*not italic*');
      expect(html).not.toContain('<em>');
    });

    it('should be a single undo step', () => {
      editor.setContent('<p>start</p>');
      const tt = editor.getTipTap()!;
      // setContent is in the history too, and history groups changes made within
      // half a second, so close the group before pasting.
      tt.view.dispatch(closeHistory(tt.state.tr));
      const before = editor.getContent();

      paste(editor, { 'text/plain': '# Heading\n\n- a\n- b' });
      expect(editor.getContent()).toContain('<ul>');

      tt.commands.undo();

      expect(editor.getContent()).toBe(before);
    });

    it('should merge a leading heading into a non-empty paragraph, as an HTML paste does', () => {
      editor.setContent('<p>start</p>');
      caretIn(editor, 'start');

      paste(editor, { 'text/plain': '# Heading\n\n- a' });

      // ProseMirror merges the first pasted block into the block holding the
      // caret, so the heading arrives as text. Pasted into an empty block it
      // stays an <h1> (see 'should convert block Markdown').
      expect(editor.getContent()).toContain('startHeading');
      expect(editor.getContent()).toContain('<ul>');
    });

    it('should emit TipTap\'s paste event once, with the converted slice', () => {
      const onPaste = jest.fn();
      editor.getTipTap()!.on('paste', onPaste);

      paste(editor, { 'text/plain': '# Heading' });

      expect(onPaste).toHaveBeenCalledTimes(1);
      expect(onPaste.mock.calls[0][0].slice.content.firstChild?.type.name).toBe('heading');
    });
  });

  describe('fall-through', () => {
    it('should not convert when the clipboard holds files', () => {
      const file = new File(['x'], 'a.png', { type: 'image/png' });

      paste(editor, { 'text/plain': '# Heading' }, [file]);

      expect(editor.getContent()).not.toContain('<h1');
    });

    it('should not swallow the paste when nothing survives the schema', () => {
      // The basic editor has no image node, so this converts to an empty slice.
      // Replacing the selection with it would delete the selected text and put
      // nothing back.
      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true, paste_markdown: true });
      editor.setContent('<p>keep me</p>');
      editor.getTipTap()!.commands.setTextSelection({ from: 1, to: 9 });

      paste(editor, { 'text/plain': '![a](https://example.com/a.png)' });

      // Falls through to an ordinary paste, which replaces the selection with
      // the literal text. The bug was replacing it with nothing at all.
      expect(editor.getTipTap()!.getText()).toContain('example.com/a.png');
      expect(editor.getTipTap()!.getText().trim()).not.toBe('');
    });

    it('should not convert while the editor is read-only', () => {
      editor.setContent('<p>locked</p>');
      editor.setReadOnly(true);

      paste(editor, { 'text/plain': '# Heading' });
      expect(pasteMarkdownText(editor.getTipTap()!.view, '# Heading')).toBe(false);

      expect(editor.getContent()).not.toContain('<h1');
      expect(editor.getTipTap()!.getText()).toContain('locked');
    });

    it('should not convert when clipboardData is null', () => {
      // This is the shape prosemirror-view's own pasteHTML() produces.
      editor.getTipTap()!.view.pasteHTML('<p>plain</p>');

      expect(editor.getContent()).toContain('plain');
      expect(editor.getContent()).not.toContain('<h1>');
    });

    it('should not convert whitespace-only text, so the clipboard HTML is used', () => {
      paste(editor, { 'text/plain': '   \n  ', 'text/html': '<p>from html</p>' });

      expect(editor.getContent()).toContain('from html');
    });

    it('should not convert Markdown that is too expensive to parse', () => {
      // One inline run over the limit. A plain run rather than the pathological
      // `*a **a ` shape, because what is being tested here is the fall-through,
      // and the cheap input keeps the suite quick — the timing itself is covered
      // in the markdownToDom tests.
      const oversized = '# ' + 'a'.repeat(5001);

      paste(editor, { 'text/plain': oversized });

      // Fell through to a normal paste: the Markdown arrives as text.
      expect(editor.getTipTap()!.getText()).toContain('# aaa');
      expect(editor.getContent()).not.toContain('<h1');
    });

    it('should let a URL pasted over a selection become a link', () => {
      editor.setContent('<p>link me</p>');
      const tt = editor.getTipTap()!;
      tt.commands.setTextSelection({ from: 1, to: 8 });

      paste(editor, { 'text/plain': 'https://example.com' });

      expect(editor.getContent()).toContain('href="https://example.com"');
      expect(editor.getContent()).toContain('link me');
    });
  });

  describe('against the code-block paste handler', () => {
    // TipTap's CodeBlock claims any paste carrying VS Code's `vscode-editor-data`
    // flag and wraps the text in a code block — which is what copying Markdown
    // out of VS Code does. Markdown mode has to win that race, or the whole
    // point of the mode is lost for the most common source of Markdown.
    //
    // HTMLEditor's CodeBlockLowlight is mocked away in Jest, so the ordering is
    // exercised on a bare editor whose extension order mirrors buildExtensions
    // (PasteMarkdown registered before the code block).
    const bare = () =>
      new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Heading,
          Bold,
          PasteMarkdown.configure({ isEnabled: () => true }),
          CodeBlock,
        ],
        content: '<p></p>',
      });

    const vscodePaste = (tt: Editor, text: string) => {
      const event = new ClipboardEvent('paste', {
        clipboardData: clipboard({
          'text/plain': text,
          'vscode-editor-data': '{"version":1,"isFromEmptySelection":false,"mode":"markdown"}',
        }),
        bubbles: true,
        cancelable: true,
      } as ClipboardEventInit);
      tt.view.dom.dispatchEvent(event);
    };

    it('should convert Markdown copied from a code editor', () => {
      const tt = bare();
      tt.commands.setTextSelection(1);

      vscodePaste(tt, '# Heading\n\nsome **bold** text');

      expect(tt.getHTML()).toContain('<h1>Heading</h1>');
      expect(tt.getHTML()).toContain('<strong>bold</strong>');
      expect(tt.getHTML()).not.toContain('<pre>');

      tt.destroy();
    });

    it('should still let the code-block handler run when the mode is off', () => {
      const tt = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Heading,
          PasteMarkdown.configure({ isEnabled: () => false }),
          CodeBlock,
        ],
        content: '<p></p>',
      });
      tt.commands.setTextSelection(1);

      vscodePaste(tt, '# Heading');

      expect(tt.getHTML()).toContain('<pre>');
      expect(tt.getHTML()).not.toContain('<h1>');

      tt.destroy();
    });
  });

  describe('inside a code block', () => {
    // HTMLEditor swaps CodeBlock for CodeBlockLowlight, which Jest mocks away, so
    // the code-block branch runs on a bare TipTap editor.
    const bare = (content: string) =>
      new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          CodeBlock,
          PasteMarkdown.configure({ isEnabled: () => true }),
        ],
        content,
      });

    it('should keep Markdown literal', () => {
      const tt = bare('<pre><code>code</code></pre>');
      tt.commands.setTextSelection(3);

      expect(pasteMarkdownText(tt.view, '# Heading')).toBe(false);
      expect(tt.getHTML()).not.toContain('<h1>');

      tt.destroy();
    });

    it('should not claim a paste event', () => {
      const tt = bare('<pre><code>code</code></pre>');
      tt.commands.setTextSelection(3);
      const event = new ClipboardEvent('paste', {
        clipboardData: clipboard({ 'text/plain': '# Heading' }),
        bubbles: true,
        cancelable: true,
      } as ClipboardEventInit);

      tt.view.dom.dispatchEvent(event);

      expect(tt.getHTML()).not.toContain('<h1>');
      tt.destroy();
    });

    it('should paste a fenced block without a trailing blank line', () => {
      const tt = bare('<p></p>');
      tt.commands.setTextSelection(1);

      expect(pasteMarkdownText(tt.view, '```\nx = 1;\ny\n```')).toBe(true);
      expect(tt.getHTML()).toContain('x = 1;\ny</code></pre>');

      tt.destroy();
    });
  });

  describe('basic editor', () => {
    it('should convert without crashing and drop the image', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true, paste_markdown: true });

      paste(editor, { 'text/plain': '# Heading\n\n![alt](https://example.com/a.png)' });

      const html = editor.getContent();
      expect(html).toMatch(/<h1[^>]*>Heading<\/h1>/);
      expect(html).not.toContain('<img');
    });
  });
});
