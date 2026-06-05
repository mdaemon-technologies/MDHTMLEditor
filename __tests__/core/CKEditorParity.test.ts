/**
 * CKEditor-parity feature tests
 * Covers: read-only mode, forced_root_block, new execCommands, font-list
 * aliases, and presence of the new toolbar buttons.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

describe('CKEditor parity features', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  describe('Read-only mode', () => {
    it('starts read-only when configured', () => {
      editor = new HTMLEditor(container, { readonly: true });
      expect(editor.isReadOnly()).toBe(true);
      expect(editor.getTipTap()?.isEditable).toBe(false);
      expect(container.querySelector('.md-editor-readonly')).not.toBeNull();
      expect(container.querySelector('.md-toolbar-disabled')).not.toBeNull();
    });

    it('toggles read-only at runtime', () => {
      editor = new HTMLEditor(container);
      expect(editor.isReadOnly()).toBe(false);

      editor.setReadOnly(true);
      expect(editor.isReadOnly()).toBe(true);
      expect(editor.getTipTap()?.isEditable).toBe(false);
      expect(container.querySelector('.md-toolbar-disabled')).not.toBeNull();

      editor.setReadOnly(false);
      expect(editor.isReadOnly()).toBe(false);
      expect(editor.getTipTap()?.isEditable).toBe(true);
      expect(container.querySelector('.md-toolbar-disabled')).toBeNull();
    });
  });

  describe('forced_root_block', () => {
    it('emits <p> by default', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p>Hello</p>');
      expect(editor.getContent()).toContain('<p>');
    });

    it('emits <div> when forced_root_block is "div"', () => {
      editor = new HTMLEditor(container, { forced_root_block: 'div' });
      editor.setContent('<p>Hello</p>');
      const html = editor.getContent();
      expect(html).toContain('<div');
      expect(html).toContain('Hello');
      expect(html).not.toMatch(/<p[ >]/);
    });

    it('preserves the signature block in div mode', () => {
      editor = new HTMLEditor(container, { forced_root_block: 'div' });
      editor.setContent('<div id="signature"><p>Sig</p></div>');
      expect(editor.getContent()).toContain('id="signature"');
    });
  });

  describe('execCommand additions', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
      editor.setContent('<p>Hello world</p>');
    });

    it('handles subscript / superscript', () => {
      expect(editor.execCommand('subscript')).toBe(true);
      expect(editor.execCommand('superscript')).toBe(true);
    });

    it('handles unlink', () => {
      expect(editor.execCommand('unlink')).toBe(true);
    });

    it('inserts a horizontal rule', () => {
      expect(editor.execCommand('inserthorizontalrule')).toBe(true);
      expect(editor.getContent()).toContain('<hr');
    });
  });

  describe('CKEditor font-list aliases', () => {
    it('maps fontSize_sizes -> font_size_formats', () => {
      editor = new HTMLEditor(container, { fontSize_sizes: '10px 20px 30px' });
      expect(editor.getConfig().font_size_formats).toBe('10px 20px 30px');
    });

    it('maps font_names -> font_family_formats', () => {
      editor = new HTMLEditor(container, { font_names: 'Arial=arial;Verdana=verdana' });
      expect(editor.getConfig().font_family_formats).toBe('Arial=arial;Verdana=verdana');
    });

    it('prefers the TinyMCE key when both are present', () => {
      editor = new HTMLEditor(container, {
        font_size_formats: '8pt 12pt',
        fontSize_sizes: '10px 20px',
      });
      expect(editor.getConfig().font_size_formats).toBe('8pt 12pt');
    });
  });

  describe('new toolbar buttons', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('renders the new action buttons in the full toolbar', () => {
      for (const name of ['subscript', 'superscript', 'hr', 'anchor', 'unlink']) {
        expect(container.querySelector(`[data-button="${name}"]`)).not.toBeNull();
      }
    });

    it('renders the new dropdowns in the full toolbar', () => {
      for (const name of ['table', 'blocks', 'styles']) {
        expect(container.querySelector(`[data-dropdown="${name}"]`)).not.toBeNull();
      }
    });
  });

  describe('dropdown actions', () => {
    const openAndPick = (dropdown: string, value: string) => {
      const btn = container.querySelector(`[data-dropdown="${dropdown}"] .md-toolbar-dropdown-btn`) as HTMLButtonElement;
      btn.click();
      const item = Array.from(document.querySelectorAll('.md-toolbar-dropdown-item'))
        .find(i => i.getAttribute('data-value') === value) as HTMLButtonElement;
      item.click();
    };

    beforeEach(() => {
      editor = new HTMLEditor(container);
      editor.setContent('<p>Hello</p>');
      editor.focus();
    });

    it('inserts a table from the table dropdown', () => {
      openAndPick('table', 'insert');
      expect(editor.getContent()).toContain('<table');
    });

    it('applies a heading from the format dropdown', () => {
      openAndPick('blocks', 'h1');
      expect(editor.getContent()).toContain('<h1');
    });

    it('applies a style format that maps to a heading', () => {
      // Default style_formats[0] = "Blue Title" -> h3
      openAndPick('styles', '0');
      expect(editor.getContent()).toContain('<h3');
    });
  });
});
