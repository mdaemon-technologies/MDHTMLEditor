/**
 * Links whose address uses an application's own URL scheme.
 *
 * Desktop applications register schemes of their own (`notes:`, `outlook:`,
 * `x-example-app:`, or one with a dot such as `example.dms:`), and a link to
 * one is kept on every way into the editor: loading content, pasting, the
 * Source view and the Link dialog. Only `javascript:`, `vbscript:`,
 * `mhtml:`, `data:`, `file:` and `blob:` are refused, as TinyMCE does; the
 * link's text is kept either way.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { LinkEditor } from '../../src/extensions/LinkEditor';
import { SourceEditor } from '../../src/extensions/SourceEditor';

const APP_LINKS = [
  'example.dms:1|<ID>',
  'example.dms:1%7C%3CID%3E',
  'outlook:00000000ABC',
  'notes://server/db',
  'x-example-app:open?id=42',
];

/** Escape a value for a double-quoted HTML attribute. */
function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

/** getContent() parsed back into a DOM, so attributes are read, not matched as text. */
function output(): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = editor.getContent();
  return div;
}

/** The href of every link in getContent(). */
function hrefs(): (string | null)[] {
  return Array.from(output().querySelectorAll('a')).map((a) => a.getAttribute('href'));
}

describe('a link with an application scheme', () => {
  it.each(APP_LINKS)('is kept by setContent(): %j', (href) => {
    editor.setContent(`<p><a href="${attr(href)}">125</a></p>`);
    expect(hrefs()).toEqual([href]);
    expect(output().textContent).toBe('125');
  });

  it('is kept when pasted as HTML from the clipboard', () => {
    editor.getTipTap()!.view.pasteHTML(
      '<!--StartFragment --><a href="example.dms:1|<ID>">125</a><!--EndFragment -->'
    );
    expect(hrefs()).toEqual(['example.dms:1|<ID>']);
  });

  it('is kept when getContent() is loaded back in', () => {
    editor.setContent('<p><a href="example.dms:1|&lt;ID&gt;">125</a></p>');
    editor.setContent(editor.getContent());
    expect(hrefs()).toEqual(['example.dms:1|<ID>']);
  });

  it('is kept when the Source view is saved', () => {
    const source = new SourceEditor({ editor, trans: (key) => key });
    source.open();
    const textarea = document.querySelector<HTMLTextAreaElement>('.md-dialog textarea')!;
    textarea.value = '<p><a href="notes://server/db">db</a></p>';
    document.querySelector<HTMLButtonElement>('.md-source-editor-save')!.click();
    expect(hrefs()).toEqual(['notes://server/db']);
    source.destroy();
  });

  it('is set by the setLink command', () => {
    editor.setContent('<p>125</p>');
    const tiptap = editor.getTipTap()!;
    tiptap.commands.setTextSelection({ from: 1, to: 4 });
    expect(tiptap.commands.setLink({ href: 'example.dms:1|x' })).toBe(true);
    expect(hrefs()).toEqual(['example.dms:1|x']);
  });

  describe('in the Link dialog', () => {
    let dialog: LinkEditor;

    beforeEach(() => {
      dialog = new LinkEditor({ editor, trans: (key: string) => key });
    });

    afterEach(() => dialog.destroy());

    function save(url: string): void {
      dialog.open();
      const [urlInput] = Array.from(document.querySelectorAll<HTMLInputElement>('.md-link-editor-input'));
      urlInput.value = url;
      document.querySelector<HTMLElement>('.md-link-editor-save')!.click();
    }

    it('links the selected text', () => {
      editor.setContent('<p>125</p>');
      editor.getTipTap()!.commands.setTextSelection({ from: 1, to: 4 });
      save('example.dms:1|x');
      expect(hrefs()).toEqual(['example.dms:1|x']);
      expect(output().textContent).toBe('125');
    });

    it('inserts a link at the caret', () => {
      editor.setContent('<p></p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      save('x-example-app:open');
      expect(hrefs()).toEqual(['x-example-app:open']);
    });
  });
});

describe('a link the editor refuses', () => {
  it.each([
    ['javascript:alert(1)'],
    ['JAVASCRIPT:alert(1)'],
    [' javascript:alert(1)'],
    ['java\tscript:alert(1)'],
    ['java&#9;script:alert(1)'],
    ['java\u0085script:alert(1)'],
    ['vbscript:msgbox(1)'],
    ['mhtml:file://x!y'],
    ['data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['data:image/png;base64,AAAA'],
    ['file:///c:/x'],
    ['blob:https://example.com/1'],
    ['filesystem:https://example.com/temporary/x.html'],
  ])('loses its link and keeps its text: %j', (source) => {
    editor.setContent(`<p><a href="${source}">text</a></p>`);
    expect(output().querySelector('a')).toBeNull();
    expect(output().textContent).toBe('text');
  });

  it.each(['javascript:alert(1)', 'vbscript:x', 'mhtml:x', 'data:text/html,x', 'file:///c:/x', 'blob:https://example.com/1'])(
    'is not set by the setLink command: %j',
    (href) => {
      editor.setContent('<p>text</p>');
      const tiptap = editor.getTipTap()!;
      tiptap.commands.setTextSelection({ from: 1, to: 5 });
      expect(tiptap.commands.setLink({ href })).toBe(false);
      expect(output().querySelector('a')).toBeNull();
    }
  );

  it('loses its link when pasted', () => {
    editor.getTipTap()!.view.pasteHTML('<a href="javascript:alert(1)">text</a>');
    expect(output().querySelector('a')).toBeNull();
    expect(output().textContent).toBe('text');
  });
});

describe('links that behave as before', () => {
  it.each([
    'https://example.com/',
    'http://example.com/',
    'mailto:info@example.com',
    'tel:+15550100',
    'cid:part1@example.com',
    '#anchor',
    '/relative',
    '',
  ])('keeps %j', (href) => {
    editor.setContent(`<p><a href="${href}">text</a></p>`);
    expect(hrefs()).toEqual([href]);
  });

  it('keeps a percent-encoded "scheme" as the relative address it is', () => {
    // Browsers never decode a scheme, so this is a path, not a javascript: link.
    editor.setContent('<p><a href="java%73cript:alert(1)">text</a></p>');
    expect(hrefs()).toEqual(['java%73cript:alert(1)']);
  });
});

describe('several editors on one page', () => {
  it('keep application links in one editor after another is created and destroyed', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const other = new HTMLEditor(host);
    other.setContent('<p><a href="example.dms:1|x">x</a></p>');
    other.destroy();
    host.remove();

    editor.setContent('<p><a href="example.dms:1|y">y</a></p>');
    expect(hrefs()).toEqual(['example.dms:1|y']);
  });

  it('can each be created and destroyed in turn', () => {
    expect(() => {
      for (let i = 0; i < 2; i++) {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const other = new HTMLEditor(host);
        other.setContent('<p><a href="example.dms:1">x</a></p>');
        other.destroy();
        host.remove();
      }
    }).not.toThrow();
  });
});
