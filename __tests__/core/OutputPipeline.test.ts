/**
 * Every path that moves HTML across the editor boundary must share one pair of
 * passes: getContent()'s serialization (fillEmptyBlocks) on the way out, and
 * setContent()/insertContent()'s parse (tag-slash repair + stripEmptyLineBreaks)
 * on the way in. These tests pin the UI callers that used to bypass them by
 * reaching into the TipTap instance directly — the template dropdown, the source
 * dialog, and preview — because a mismatched pair grows a blank line on every
 * round-trip.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

describe('content pipeline consistency', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
    document.querySelectorAll('.md-dialog-overlay, .md-toolbar-dropdown-menu').forEach(el => el.remove());
  });

  describe('template dropdown', () => {
    const template = {
      title: 'Blank line template',
      description: 'has an empty line',
      content: '<div>a</div><div><br></div><div>b</div>',
    };

    // Dropdown menus are appended to document.body (they render fixed-position),
    // so the item is not under `container` — find it by its label.
    function selectTemplate(title: string): void {
      container.querySelector<HTMLElement>('[data-dropdown="template"] .md-toolbar-dropdown-btn')?.click();
      const item = Array.from(
        document.querySelectorAll<HTMLElement>('.md-toolbar-dropdown-item'),
      ).find(el => el.textContent?.startsWith(title));
      expect(item).toBeDefined();
      item!.click();
    }

    it('inserts through editor.insertContent, so blank lines do not double', () => {
      editor = new HTMLEditor(container, {
        forced_root_block: 'div',
        toolbar: 'template',
        templates: [template],
      });
      editor.setContent('');

      selectTemplate(template.title);

      // The template's export-only <br> was stripped on import: the document
      // holds one genuinely empty block, not a hardBreak that renders as two.
      expect(editor.getTipTap()?.getHTML() ?? '').not.toContain('<br');
      // And it serializes back to exactly the fragment we started from.
      expect(editor.getContent()).toMatch(/<div[^>]*>\s*<br[^>]*>\s*<\/div>/);
      expect(editor.getContent()).not.toContain('<br><br>');
    });

    it('still repairs backslash-escaped closing tags in template content', () => {
      editor = new HTMLEditor(container, {
        toolbar: 'template',
        templates: [{ title: 'Escaped', content: '<ul><li>a<\\/li><li>b<\\/li><\\/ul>' }],
      });
      editor.setContent('');

      selectTemplate('Escaped');

      const html = editor.getContent();
      expect(html).toContain('<ul>');
      expect(html).not.toContain('\\/');
      expect((html.match(/<li>/g) ?? []).length).toBe(2);
    });

    it('still fires templatechange', () => {
      editor = new HTMLEditor(container, {
        toolbar: 'template',
        templates: [template],
      });
      const fired: unknown[] = [];
      editor.on('templatechange', (t: unknown) => fired.push(t));

      selectTemplate(template.title);

      expect(fired).toEqual([template]);
    });
  });

  describe('source dialog', () => {
    function openSource(): HTMLTextAreaElement {
      container.querySelector<HTMLElement>('[data-button="code"]')?.click();
      const textarea = document.querySelector<HTMLTextAreaElement>('.md-source-editor-textarea');
      expect(textarea).not.toBeNull();
      return textarea!;
    }

    it('shows getContent() output and saves it back through setContent()', () => {
      editor = new HTMLEditor(container, {
        forced_root_block: 'div',
        toolbar: 'code',
      });
      editor.setContent('<div>a</div><div></div><div>b</div>');
      const expected = editor.getContent();

      const textarea = openSource();
      // What the user sees is the editor's real output, blank-line <br> included.
      expect(textarea.value).toBe(expected);

      // Saving it unchanged must be a no-op, not a line-doubling round-trip.
      document.querySelector<HTMLElement>('.md-source-editor-save')?.click();
      expect(editor.getContent()).toBe(expected);
      expect(editor.getTipTap()?.getHTML() ?? '').not.toContain('<br');
    });
  });
});
