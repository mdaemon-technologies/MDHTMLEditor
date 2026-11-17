/**
 * Paste as text (TinyMCE's pastetext, mceTogglePlainTextPaste, paste_as_text).
 *
 * While the mode is on, a paste inserts the clipboard's plain text, split into
 * paragraphs and lines as TinyMCE does, with none of its formatting. The
 * pastes are dispatched as real ClipboardEvents on the editor's DOM, so
 * prosemirror-view's own paste handling runs around the extension's.
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { HTMLEditor } from '../../src/core/HTMLEditor';
import { PasteAsText, pastePlainText } from '../../src/extensions/PasteAsText';
import StarterKit from '@tiptap/starter-kit';
import { CellSelection } from '@tiptap/pm/tables';

/** A DataTransfer good enough for the paste path. */
function clipboard(data: Record<string, string>, files: File[] = []): DataTransfer {
  return {
    types: [...Object.keys(data), ...(files.length ? ['Files'] : [])],
    getData: (type: string) => data[type] ?? '',
    files,
    // As a browser lists them: one item per file, beside the text flavours.
    items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
  } as unknown as DataTransfer;
}

function pasteInto(dom: HTMLElement, data: Record<string, string>, files: File[] = []): ClipboardEvent {
  const event = new ClipboardEvent('paste', {
    clipboardData: clipboard(data, files),
    bubbles: true,
    cancelable: true,
  } as ClipboardEventInit);
  dom.dispatchEvent(event);
  return event;
}

describe('Paste as text', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
  });

  const paste = (data: Record<string, string>) => pasteInto(editor.getTipTap()!.view.dom, data);
  /** getContent() without the default font style every paragraph carries. */
  const html = () =>
    editor.getContent().split(' style="font-family: arial, helvetica, sans-serif; font-size: 12pt;"').join('');

  describe('the mode', () => {
    it('is off by default', () => {
      editor = new HTMLEditor(container);

      expect(editor.isPasteAsTextEnabled()).toBe(false);
    });

    it('starts on with paste_as_text', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      expect(editor.isPasteAsTextEnabled()).toBe(true);
    });

    it('toggles with mceTogglePlainTextPaste, in any letter case', () => {
      editor = new HTMLEditor(container);

      expect(editor.execCommand('mceTogglePlainTextPaste')).toBe(true);
      expect(editor.isPasteAsTextEnabled()).toBe(true);

      editor.execCommand('mcetoggleplaintextpaste');
      expect(editor.isPasteAsTextEnabled()).toBe(false);
    });

    it('treats anything but true as off', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      editor.setPasteAsText('yes' as unknown as boolean);

      expect(editor.isPasteAsTextEnabled()).toBe(false);
    });

    it("fires pasteplaintexttoggle with { state }, as TinyMCE's PastePlainTextToggle, on a change only", () => {
      editor = new HTMLEditor(container);
      const callback = jest.fn();
      editor.on('pasteplaintexttoggle', callback);

      editor.setPasteAsText(true);
      editor.setPasteAsText(true);
      editor.execCommand('mceTogglePlainTextPaste');

      expect(callback.mock.calls).toEqual([[{ state: true }], [{ state: false }]]);
    });

    it('turns Markdown mode off when it turns on, and the other way round', () => {
      editor = new HTMLEditor(container, { paste_markdown: true });
      const markdown = jest.fn();
      const text = jest.fn();
      editor.on('pastemarkdownchange', markdown);
      editor.on('pasteplaintexttoggle', text);

      editor.setPasteAsText(true);
      expect(editor.isPasteMarkdownEnabled()).toBe(false);
      expect(markdown).toHaveBeenCalledWith(false);

      editor.setPasteMarkdown(true);
      expect(editor.isPasteAsTextEnabled()).toBe(false);
      expect(text).toHaveBeenLastCalledWith({ state: false });
    });

    it('has turned the other mode off by the time its event fires', () => {
      editor = new HTMLEditor(container, { paste_markdown: true });
      let markdownDuringText: boolean | null = null;
      let textDuringMarkdown: boolean | null = null;
      editor.on('pasteplaintexttoggle', ({ state }) => {
        if (state) markdownDuringText = editor.isPasteMarkdownEnabled();
      });
      editor.on('pastemarkdownchange', (on) => {
        if (on) textDuringMarkdown = editor.isPasteAsTextEnabled();
      });

      editor.setPasteAsText(true);
      editor.setPasteMarkdown(true);

      expect(markdownDuringText).toBe(false);
      expect(textDuringMarkdown).toBe(false);
    });

    it('wins over paste_markdown when both are set', () => {
      editor = new HTMLEditor(container, { paste_as_text: true, paste_markdown: true });

      expect(editor.isPasteAsTextEnabled()).toBe(true);
      expect(editor.isPasteMarkdownEnabled()).toBe(false);
    });
  });

  describe('pasting', () => {
    it('inserts the plain text of a paste that also carries HTML, with no formatting', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      const event = paste({
        'text/html': '<p><strong>Bold</strong> and <a href="https://example.com/">a link</a></p>',
        'text/plain': 'Bold and a link',
      });

      expect(event.defaultPrevented).toBe(true);
      expect(html()).toBe('<p>Bold and a link</p>');
    });

    it('starts a paragraph at a blank line, and breaks the line at a single line break, as TinyMCE', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/html': '<h1>Hi,</h1><ul><li>Thanks</li></ul>', 'text/plain': 'Hi,\n\nThanks\nBob' });

      expect(html()).toBe('<p>Hi,</p><p>Thanks<br>Bob</p>');
    });

    it('reads Windows line breaks, and splits paragraphs at each pair of line breaks, as TinyMCE', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      // A third line break starts the next paragraph with a line break; a
      // fourth leaves an empty paragraph between.
      paste({ 'text/plain': 'a\r\nb\r\n\r\n\r\nc\n\n\n\nd' });

      expect(html()).toBe('<p>a<br>b</p><p><br>c</p><p><br></p><p>d</p>');
    });

    it('starts no paragraph for blank lines before the first text or after the last', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/plain': '\n\nabc\n\n' });

      expect(html()).toBe('<p>abc</p>');
    });

    it('keeps runs of spaces, and spaces at the start of a line, as non-breaking spaces, as TinyMCE', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/plain': '  lead  two' });

      // Plain spaces would collapse to one wherever the HTML is shown.
      const nbsp = '(?:&nbsp;| )';
      expect(html()).toMatch(new RegExp(`^<p>${nbsp}${nbsp}lead${nbsp} two</p>$`));
    });

    it("gives the text the caret's formatting, as typing would", () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<p><strong>bold text</strong> <a href="https://example.com/">a link</a></p>');
      const tiptap = editor.getTipTap()!;
      tiptap.commands.setTextSelection(3);
      paste({ 'text/plain': 'X' });
      // Inside the link, past "a l".
      const linkFrom = tiptap.state.doc.textContent.indexOf('a link') + 1;
      tiptap.commands.setTextSelection(linkFrom + 3);
      paste({ 'text/plain': 'M' });

      expect(html()).toMatch(/<strong>boXld text<\/strong>/);
      expect(html()).toMatch(/<a [^>]*>a lMink<\/a>/);
    });

    it('links nothing, not even a URL pasted over selected text, as TinyMCE in this mode', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<p>click here now</p>');
      editor.getTipTap()!.commands.setTextSelection({ from: 7, to: 11 });

      paste({ 'text/plain': 'https://example.com/' });

      expect(html()).toBe('<p>click https://example.com/ now</p>');
    });

    it('takes the formatting of a selection it replaces, as typing over it would', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<p>plain <strong>bold</strong> end</p>');
      editor.getTipTap()!.commands.setTextSelection({ from: 7, to: 11 });

      paste({ 'text/plain': 'NEW' });

      expect(html()).toBe('<p>plain <strong>NEW</strong> end</p>');
    });

    it('takes formatting turned on at the caret before the paste', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<p>abc</p>');
      const tiptap = editor.getTipTap()!;
      tiptap.commands.setTextSelection(4);
      tiptap.commands.toggleBold();

      paste({ 'text/plain': 'B\nC' });

      expect(html()).toBe('<p>abc<strong>B<br>C</strong></p>');
    });

    it("keeps the HTML's tabs and mentions in its text", () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({
        'text/html':
          '<p>A1<span style="white-space: pre;">\t</span>B1 hi ' +
          '<span class="composer-mention" data-jid="ann@example.com" data-display="Ann">@Ann</span> there</p>',
      });

      expect(editor.getTipTap()!.state.doc.textBetween(0, editor.getTipTap()!.state.doc.content.size, '\n', (leaf) =>
        leaf.type.name === 'tabCharacter' ? '\t' : '')).toBe('A1\tB1 hi @Ann there');
    });

    it('does not lengthen a link the caret is at the end of', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<p><a href="https://example.com/">link</a></p>');
      editor.getTipTap()!.commands.setTextSelection(5);

      paste({ 'text/plain': ' after' });

      // The pasted text's leading space is kept as a non-breaking one.
      expect(html()).toMatch(/<a [^>]*>link<\/a>&nbsp;after<\/p>$/);
    });

    it('fills every cell of a cell selection, as a paste does', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr><tr><td><p>c</p></td><td><p>d</p></td></tr></tbody></table>');
      const tiptap = editor.getTipTap()!;
      const cells: number[] = [];
      tiptap.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableCell') cells.push(pos);
      });
      tiptap.view.dispatch(tiptap.state.tr.setSelection(CellSelection.create(tiptap.state.doc, cells[0], cells[3])));

      paste({ 'text/html': '<b>X</b>', 'text/plain': 'X' });

      const texts: string[] = [];
      tiptap.state.doc.descendants((node) => {
        if (node.type.name === 'tableCell') texts.push(node.textContent);
      });
      expect(texts).toEqual(['X', 'X', 'X', 'X']);
      expect(html()).not.toContain('<strong>');
    });

    it('fills every selected cell with text of several lines', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>');
      const tiptap = editor.getTipTap()!;
      const cells: number[] = [];
      tiptap.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableCell') cells.push(pos);
      });
      tiptap.view.dispatch(tiptap.state.tr.setSelection(CellSelection.create(tiptap.state.doc, cells[0], cells[1])));

      paste({ 'text/plain': 'X\nY' });

      expect(html().match(/X<br>Y/g)).toHaveLength(2);
    });

    it('changes nothing in a read-only editor, even through pastePlainText', () => {
      editor = new HTMLEditor(container, { readonly: true });
      const before = html();

      expect(pastePlainText(editor.getTipTap()!.view, 'ro')).toBeNull();

      expect(html()).toBe(before);
    });

    it('inserts nothing from HTML that has no text, such as a rule or an image', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      editor.setContent('<p>Text</p>');
      const before = html();

      paste({ 'text/html': '<h1></h1><hr><img src="https://example.com/a.png" alt="Logo">' });

      expect(html()).toBe(before);
    });

    it('uses the HTML when the plain text is only whitespace', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/plain': '  ', 'text/html': '<b>Hi</b>' });

      expect(html()).toBe('<p>Hi</p>');
    });

    it('keeps Markdown and HTML in the text as they are', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/plain': '# Not a heading <b>not bold</b>' });

      expect(html()).toBe('<p># Not a heading &lt;b&gt;not bold&lt;/b&gt;</p>');
    });

    it('formats nothing the editor would format in a paste: emphasis marks, code, highlight or links', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      const text = 'a **bold** and *it* and _u_ and ~~s~~ and `code` and ==hi== see https://example.com/x';

      paste({ 'text/plain': text });

      expect(html()).toBe(`<p>${text}</p>`);
    });

    it('does not autolink a URL followed by more text', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/plain': 'see https://example.com/ here\n\nnext' });

      expect(html()).not.toContain('<a');
    });

    it('uses the text of the HTML when the clipboard has no plain text', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/html': '<p><em>Only</em> HTML</p>' });

      expect(html()).toBe('<p>Only HTML</p>');
    });

    it("keeps the HTML's paragraphs and line breaks, and none of its script", () => {
      editor = new HTMLEditor(container, { paste_as_text: true });

      paste({ 'text/html': '<p>one</p><p>two</p><div>three<br>four</div><script>var a = 1</script>' });

      expect(html()).toBe('<p>one</p><p>two</p><p>three<br>four</p>');
    });

    it('pastes the text of a copy that also carries a picture of it (cells from a spreadsheet), and uploads no picture', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      const upload = jest.spyOn(HTMLEditor.prototype as unknown as { handleImageFileUpload: () => void }, 'handleImageFileUpload');
      try {
        pasteInto(
          editor.getTipTap()!.view.dom,
          { 'text/html': '<table><tr><td><b>A1</b></td></tr></table>', 'text/plain': 'A1' },
          [new File(['x'], 'image.png', { type: 'image/png' })],
        );

        expect(html()).toBe('<p>A1</p>');
        expect(upload).not.toHaveBeenCalled();
      } finally {
        upload.mockRestore();
      }
    });

    it('still uploads a copied image, whose HTML has no text, without inserting the image from the HTML too', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      const upload = jest
        .spyOn(HTMLEditor.prototype as unknown as { handleImageFileUpload: () => void }, 'handleImageFileUpload')
        .mockImplementation(() => {});
      try {
        pasteInto(
          editor.getTipTap()!.view.dom,
          { 'text/html': '<img src="https://example.com/a.png">' },
          [new File(['x'], 'image.png', { type: 'image/png' })],
        );

        expect(upload).toHaveBeenCalledTimes(1);
        expect(html()).not.toContain('<img');
      } finally {
        upload.mockRestore();
      }
    });

    it('uploads no picture beside HTML that has text', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      const upload = jest.spyOn(HTMLEditor.prototype as unknown as { handleImageFileUpload: () => void }, 'handleImageFileUpload');
      try {
        pasteInto(
          editor.getTipTap()!.view.dom,
          { 'text/html': '<table><tr><td>A1</td></tr></table>' },
          [new File(['x'], 'image.png', { type: 'image/png' })],
        );

        expect(html()).toBe('<p>A1</p>');
        expect(upload).not.toHaveBeenCalled();
      } finally {
        upload.mockRestore();
      }
    });

    it('tells TipTap listeners about the paste, once, with the paste event itself', () => {
      editor = new HTMLEditor(container, { paste_as_text: true });
      const onPaste = jest.fn();
      editor.getTipTap()!.on('paste', onPaste);

      const event = paste({ 'text/plain': 'Text' });

      expect(onPaste).toHaveBeenCalledTimes(1);
      expect(onPaste.mock.calls[0][0].event).toBe(event);
    });

    it('keeps the formatting while the mode is off', () => {
      editor = new HTMLEditor(container);

      paste({ 'text/html': '<p><strong>Bold</strong></p>', 'text/plain': 'Bold' });

      expect(html()).toContain('<strong>Bold</strong>');
    });
  });
});

describe('PasteAsText extension', () => {
  it.each([
    ['only a file', {}, true],
    // "Copy image" in a browser: the file, and HTML that is only the image.
    // Claimed, so the HTML's image isn't inserted; HTMLEditor uploads the file.
    ['a file and HTML with no text', { 'text/html': '<img src="https://example.com/a.png">' }, false],
  ])('leaves a paste of %s to the handlers after it: %s', (_name, data: Record<string, string>, passedOn: boolean) => {
    const later = jest.fn(() => true);
    const Later = Extension.create({
      name: 'later',
      priority: 1,
      addProseMirrorPlugins: () => [new Plugin({ key: new PluginKey('later'), props: { handlePaste: later } })],
    });
    const tiptap = new Editor({
      element: document.createElement('div'),
      extensions: [Document, Paragraph, Text, PasteAsText.configure({ isEnabled: () => true }), Later],
    });

    pasteInto(tiptap.view.dom, data, [new File(['x'], 'image.png', { type: 'image/png' })]);

    expect(later).toHaveBeenCalledTimes(passedOn ? 1 : 0);
    tiptap.destroy();
  });
});

describe('PasteAsText in a code block', () => {
  it('pastes the text as it is, line breaks and all', () => {
    // Jest replaces the editor's own code block; StarterKit's has the same schema.
    const tiptap = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit.configure({ link: false }), PasteAsText.configure({ isEnabled: () => true })],
      content: '<pre><code>x</code></pre>',
    });
    tiptap.commands.setTextSelection(2);

    pasteInto(tiptap.view.dom, { 'text/plain': 'a\n\nb **c**' });

    expect(tiptap.state.doc.firstChild!.type.name).toBe('codeBlock');
    expect(tiptap.state.doc.firstChild!.textContent).toBe('xa\n\nb **c**');
    tiptap.destroy();
  });
});
