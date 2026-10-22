/**
 * Link edge behavior.
 *
 * Pasting a URL at the caret (Link's paste rule) and pasting HTML that ends in
 * a link both leave the caret at the link's right edge. The link mark is
 * inclusive, so without intervention the next text typed there joins the
 * link; after a paste the caret is moved out of the link instead. Everywhere
 * else the link stays inclusive, as in the browser's own editing and TinyMCE,
 * including the whitespace TipTap's autolink would end it at. The Link dialog and Markdown paste cases live in LinkEditor.test.ts and
 * PasteMarkdown.test.ts.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { LinkEditor } from '../../src/extensions/LinkEditor';

interface Run {
  text: string;
  href: string | null;
}

/** The first block's text, split into runs of equal link href. */
function runs(editor: HTMLEditor): Run[] {
  const doc = editor.getTipTap()!.state.doc;
  const result: Run[] = [];
  doc.firstChild!.forEach((node) => {
    if (!node.isText) return;
    const link = node.marks.find((mark) => mark.type.name === 'link');
    const href = link ? (link.attrs.href as string) : null;
    const last = result[result.length - 1];
    if (last && last.href === href) {
      last.text += node.text;
    } else {
      result.push({ text: node.text ?? '', href });
    }
  });
  return result;
}

/**
 * Type `text` one character at a time, replacing the selection with the first
 * one. Each keystroke goes where a real one does: through the
 * `handleTextInput` props first, then ProseMirror's default `insertText`.
 */
function type(editor: HTMLEditor, text: string): void {
  const view = editor.getTipTap()!.view;
  for (const ch of text) {
    const { from, to } = view.state.selection;
    const deflt = () => view.state.tr.insertText(ch, from, to);
    const handled = view.someProp('handleTextInput', (f) => f(view, from, to, ch, deflt));
    if (!handled) view.dispatch(deflt());
  }
}

/** Put the caret `offset` characters into the first block. */
function caretAt(editor: HTMLEditor, offset: number): void {
  editor.getTipTap()!.commands.setTextSelection(1 + offset);
}

/** Select the first block's text from offset `from` to offset `to`. */
function select(editor: HTMLEditor, from: number, to: number): void {
  editor.getTipTap()!.commands.setTextSelection({ from: 1 + from, to: 1 + to });
}

/**
 * Paste the way Ctrl+V does: a paste event on the editor DOM, so every
 * `handlePaste` prop (link-on-paste included) and the paste rules see it.
 */
function paste(editor: HTMLEditor, data: Record<string, string>): void {
  const clipboardData = {
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? '',
    files: [],
    items: [],
  } as unknown as DataTransfer;
  const event = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true } as ClipboardEventInit);
  editor.getTipTap()!.view.dom.dispatchEvent(event);
}

describe('Link edges', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
    document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
  });

  describe('typing after a pasted link', () => {
    it('keeps text typed after a pasted URL out of the link', () => {
      caretAt(editor, 0);
      paste(editor, { 'text/plain': 'https://example.com' });
      type(editor, ' hello');

      expect(runs(editor)).toEqual([
        { text: 'https://example.com', href: 'https://example.com' },
        { text: ' hello', href: null },
      ]);
    });

    it('keeps text typed after a pasted email address out of the mailto link', () => {
      caretAt(editor, 0);
      paste(editor, { 'text/plain': 'user@example.com' });
      type(editor, ' hi');

      expect(runs(editor)).toEqual([
        { text: 'user@example.com', href: 'mailto:user@example.com' },
        { text: ' hi', href: null },
      ]);
    });

    it('keeps text typed after pasted HTML that ends in a link out of the link', () => {
      caretAt(editor, 0);
      paste(editor, { 'text/html': 'see <a href="https://example.com">site</a>' });
      type(editor, ' more');

      expect(runs(editor)).toEqual([
        { text: 'see ', href: null },
        { text: 'site', href: 'https://example.com' },
        { text: ' more', href: null },
      ]);
    });

    it('keeps text typed after a URL pasted into the middle of a sentence out of the link', () => {
      editor.setContent('<p>go now</p>');
      caretAt(editor, 'go '.length);
      paste(editor, { 'text/plain': 'https://example.com' });
      type(editor, 'x');

      expect(runs(editor)).toEqual([
        { text: 'go ', href: null },
        { text: 'https://example.com', href: 'https://example.com' },
        { text: 'xnow', href: null },
      ]);
    });

    it('keeps text typed after insertContent() HTML that ends in a link out of the link', () => {
      caretAt(editor, 0);
      editor.insertContent('see <a href="https://example.com">site</a>');
      type(editor, ' thanks');

      expect(runs(editor)).toEqual([
        { text: 'see ', href: null },
        { text: 'site', href: 'https://example.com' },
        { text: ' thanks', href: null },
      ]);
    });

    it('still extends the link when the caret is put back at its end and typing resumes', () => {
      caretAt(editor, 0);
      paste(editor, { 'text/plain': 'https://example.com' });
      type(editor, ' ');
      caretAt(editor, 'https://example.com'.length);
      type(editor, '/a');

      expect(runs(editor)).toEqual([
        { text: 'https://example.com/a', href: 'https://example.com' },
        { text: ' ', href: null },
      ]);
    });

    it('still pre-fills the Link dialog with the pasted link', () => {
      caretAt(editor, 0);
      paste(editor, { 'text/plain': 'https://example.com' });

      const linkEditor = new LinkEditor({ editor, trans: (key: string) => key });
      linkEditor.open();
      const url = (document.querySelector('.md-link-editor-input') as HTMLInputElement).value;
      linkEditor.destroy();

      expect(url).toBe('https://example.com');
    });

    // Like Bold, the Link button reflects what typing would produce, and the
    // next keystroke at this caret is plain.
    it('shows the Link button inactive at the caret the paste left', () => {
      caretAt(editor, 0);
      paste(editor, { 'text/plain': 'https://example.com' });

      expect(editor.getTipTap()!.isActive('link')).toBe(false);
    });
  });

  describe('typing at the edge of an existing link (unchanged)', () => {
    beforeEach(() => {
      editor.setContent('<p><a href="https://example.com">https://example.com</a></p>');
    });

    // Decision: a link already in the content extends when the caret is put at
    // its end and text is typed, as in the browser's own editing and TinyMCE.
    // Only the operations above move the caret out of the link.
    it('extends a link when typing at its end', () => {
      caretAt(editor, 'https://example.com'.length);
      type(editor, 'x');

      expect(runs(editor)).toEqual([
        { text: 'https://example.comx', href: 'https://example.com' },
      ]);
    });

    it('extends a link with spaces typed at its end', () => {
      caretAt(editor, 'https://example.com'.length);
      type(editor, ' more');

      expect(runs(editor)).toEqual([
        { text: 'https://example.com more', href: 'https://example.com' },
      ]);
    });

    it('keeps text typed inside a link in the link', () => {
      caretAt(editor, 4);
      type(editor, 'Z');

      expect(runs(editor)).toEqual([
        { text: 'httpZs://example.com', href: 'https://example.com' },
      ]);
    });
  });

  describe('typing over selected link text (unchanged)', () => {
    beforeEach(() => {
      editor.setContent('<p><a href="https://example.com" title="Example" target="_blank">click here</a> after</p>');
    });

    it('keeps the link, with its attributes, when its whole text is retyped', () => {
      select(editor, 0, 'click here'.length);
      type(editor, 'Register now');

      expect(runs(editor)).toEqual([
        { text: 'Register now', href: 'https://example.com' },
        { text: ' after', href: null },
      ]);
      const html = editor.getContent();
      expect(html).toContain('title="Example"');
      expect(html).toContain('target="_blank"');
    });

    it('keeps the link when the end of its text is retyped', () => {
      select(editor, 'click '.length, 'click here'.length);
      type(editor, 'now');

      expect(runs(editor)).toEqual([
        { text: 'click now', href: 'https://example.com' },
        { text: ' after', href: null },
      ]);
    });
  });

  describe('pasting a URL over a selection', () => {
    it('links the selected text when the selection is inside one paragraph', () => {
      editor.setContent('<p>see the docs today</p>');
      select(editor, 'see the '.length, 'see the docs'.length);
      paste(editor, { 'text/plain': 'https://example.com' });

      expect(runs(editor)).toEqual([
        { text: 'see the ', href: null },
        { text: 'docs', href: 'https://example.com' },
        { text: ' today', href: null },
      ]);
    });

    it('links a selected inline node rather than deleting it', () => {
      editor.setContent('<p>ask <span class="composer-mention" data-jid="a@b.com" data-display="Ann">@Ann</span> today</p>');
      const tiptap = editor.getTipTap()!;
      tiptap.commands.setNodeSelection(1 + 'ask '.length);
      paste(editor, { 'text/plain': 'https://example.com' });

      let mention: { linked: boolean } | null = null;
      tiptap.state.doc.descendants((node) => {
        if (node.type.name === 'mention') {
          mention = { linked: node.marks.some((mark) => mark.type.name === 'link') };
        }
      });
      expect(mention).toEqual({ linked: true });
      expect(tiptap.getText()).not.toContain('https://example.com');
    });

    it('replaces everything when all content is selected (Ctrl+A)', () => {
      editor.setContent('<p>only line</p>');
      editor.getTipTap()!.commands.selectAll();
      paste(editor, { 'text/plain': 'https://example.com' });

      expect(runs(editor)).toEqual([
        { text: 'https://example.com', href: 'https://example.com' },
      ]);
    });

    it('replaces a selection that spans several paragraphs', () => {
      editor.setContent('<p>first line</p><p>second line</p>');
      editor.getTipTap()!.commands.selectAll();
      paste(editor, { 'text/plain': 'https://example.com' });

      expect(editor.getTipTap()!.getText()).toBe('https://example.com');
    });

    it('keeps text typed after the replacing URL out of the link', () => {
      editor.setContent('<p>only line</p>');
      editor.getTipTap()!.commands.selectAll();
      paste(editor, { 'text/plain': 'https://example.com' });
      type(editor, ' hi');

      expect(runs(editor)).toEqual([
        { text: 'https://example.com', href: 'https://example.com' },
        { text: ' hi', href: null },
      ]);
    });
  });

  describe('clicking a link', () => {
    it('does not open the link, as openOnClick: false asks', () => {
      editor.setContent('<p><a href="https://example.com">site</a></p>');
      const open = jest.spyOn(window, 'open').mockImplementation(() => null);
      const anchor = editor.getTipTap()!.view.dom.querySelector('a')!;

      anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      anchor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

      expect(open).not.toHaveBeenCalled();
      open.mockRestore();
    });
  });

  describe('unchanged link behavior', () => {
    it('still autolinks a typed URL and nothing after it', () => {
      caretAt(editor, 0);
      type(editor, 'see https://example.com ok');

      expect(runs(editor)).toEqual([
        { text: 'see ', href: null },
        { text: 'https://example.com', href: 'https://example.com' },
        { text: ' ok', href: null },
      ]);
    });

    it('round-trips the title attribute and adds rel="noopener noreferrer"', () => {
      editor.setContent('<p><a href="https://example.com" title="Example">site</a></p>');
      const html = editor.getContent();

      expect(html).toContain('title="Example"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it('keeps a link with an empty href', () => {
      editor.setContent('<p><a href="">placeholder</a></p>');

      expect(runs(editor)).toEqual([{ text: 'placeholder', href: '' }]);
    });
  });
});
