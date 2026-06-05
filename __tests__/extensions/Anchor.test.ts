/**
 * Anchor extension + AnchorDialog tests
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { AnchorDialog } from '../../src/extensions/AnchorDialog';

describe('Anchor', () => {
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
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  describe('extension', () => {
    it('parses an existing named anchor (a[id] without href)', () => {
      editor.setContent('<p>Hello <a id="sec1"></a>world</p>');
      expect(editor.getContent()).toContain('id="sec1"');
    });

    it('inserts an anchor via the setAnchor command', () => {
      editor.setContent('<p>Hello</p>');
      editor.getTipTap()?.commands.setAnchor('top');
      expect(editor.getContent()).toContain('id="top"');
    });

    it('does not capture real links (a[href]) as anchors', () => {
      editor.setContent('<p><a href="https://example.com">link</a></p>');
      const html = editor.getContent();
      expect(html).toContain('href="https://example.com"');
    });
  });

  describe('AnchorDialog', () => {
    let dialog: AnchorDialog;

    beforeEach(() => {
      dialog = new AnchorDialog({ editor, trans: (k) => k });
    });

    afterEach(() => {
      dialog.destroy();
    });

    it('opens and renders a single name field', () => {
      dialog.open();
      expect(document.querySelector('.md-anchor-dialog')).not.toBeNull();
      expect(document.querySelector('.md-anchor-dialog-input')).not.toBeNull();
    });

    it('inserts an anchor on save', () => {
      editor.setContent('<p>Hello</p>');
      dialog.open();
      const input = document.querySelector('.md-anchor-dialog-input') as HTMLInputElement;
      input.value = 'jump';
      (document.querySelector('.md-anchor-dialog-save') as HTMLButtonElement).click();
      expect(editor.getContent()).toContain('id="jump"');
    });

    it('rejects an empty name with an error', () => {
      dialog.open();
      (document.querySelector('.md-anchor-dialog-save') as HTMLButtonElement).click();
      const error = document.querySelector('.md-anchor-dialog-error') as HTMLElement;
      expect(error.style.display).toBe('block');
      expect(error.textContent).toBe('Anchor name is required');
    });

    it('rejects a name with spaces', () => {
      dialog.open();
      const input = document.querySelector('.md-anchor-dialog-input') as HTMLInputElement;
      input.value = 'has spaces';
      (document.querySelector('.md-anchor-dialog-save') as HTMLButtonElement).click();
      const error = document.querySelector('.md-anchor-dialog-error') as HTMLElement;
      expect(error.style.display).toBe('block');
      expect(error.textContent).toBe('Anchor name cannot contain spaces');
    });
  });
});
