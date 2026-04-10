/**
 * LinkEditor Tests
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { LinkEditor } from '../../src/extensions/LinkEditor';

describe('LinkEditor', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;
  let linkEditor: LinkEditor;
  let transMock: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new HTMLEditor(container);
    transMock = jest.fn((key) => key);

    linkEditor = new LinkEditor({
      editor,
      trans: transMock,
    });
  });

  afterEach(() => {
    linkEditor?.destroy();
    editor?.destroy();
    container?.remove();
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  describe('Dialog Open/Close', () => {
    it('should open dialog', () => {
      linkEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create link editor dialog', () => {
      linkEditor.open();

      const dialog = document.querySelector('.md-link-editor-dialog');
      expect(dialog).not.toBeNull();
    });

    it('should close dialog', () => {
      linkEditor.open();
      linkEditor.close();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should reopen dialog without creating new one', () => {
      linkEditor.open();
      linkEditor.close();
      linkEditor.open();

      const overlays = document.querySelectorAll('.md-dialog-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should close on close button click', () => {
      linkEditor.open();

      const closeBtn = document.querySelector('.md-dialog-close') as HTMLElement;
      closeBtn?.click();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should close on cancel button click', () => {
      linkEditor.open();

      const cancelBtn = document.querySelector('.md-link-editor-cancel') as HTMLElement;
      cancelBtn?.click();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should close on overlay click', () => {
      linkEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay?.click();

      expect(overlay?.style.display).toBe('none');
    });

    it('should close on Escape key', () => {
      linkEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Dialog Content', () => {
    it('should have header with title', () => {
      linkEditor.open();

      const header = document.querySelector('.md-dialog-header h3');
      expect(header?.textContent).toBe('Insert/Edit Link');
    });

    it('should have URL input', () => {
      linkEditor.open();

      const inputs = document.querySelectorAll('.md-link-editor-input');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should have text to display input', () => {
      linkEditor.open();

      const inputs = document.querySelectorAll('.md-link-editor-input');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('should have title input', () => {
      linkEditor.open();

      const inputs = document.querySelectorAll('.md-link-editor-input');
      expect(inputs.length).toBe(3);
    });

    it('should have target select dropdown', () => {
      linkEditor.open();

      const select = document.querySelector('.md-link-editor-select') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select?.options.length).toBe(2);
    });

    it('should have save and cancel buttons', () => {
      linkEditor.open();

      const saveBtn = document.querySelector('.md-link-editor-save');
      const cancelBtn = document.querySelector('.md-link-editor-cancel');
      expect(saveBtn).not.toBeNull();
      expect(cancelBtn).not.toBeNull();
    });

    it('should use translation function for labels', () => {
      linkEditor.open();

      expect(transMock).toHaveBeenCalledWith('Insert/Edit Link');
      expect(transMock).toHaveBeenCalledWith('URL');
      expect(transMock).toHaveBeenCalledWith('Text to display');
      expect(transMock).toHaveBeenCalledWith('Title');
      expect(transMock).toHaveBeenCalledWith('Open link in...');
      expect(transMock).toHaveBeenCalledWith('Current window');
      expect(transMock).toHaveBeenCalledWith('New window');
      expect(transMock).toHaveBeenCalledWith('Cancel');
      expect(transMock).toHaveBeenCalledWith('Save');
    });
  });

  describe('Theme Integration', () => {
    it('should add skin class to theme wrapper inside overlay', () => {
      linkEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay');
      const themeWrapper = overlay?.querySelector('.md-editor-oxide');
      expect(themeWrapper).not.toBeNull();
    });
  });

  describe('Destroy', () => {
    it('should remove overlay from DOM on destroy', () => {
      linkEditor.open();

      expect(document.querySelector('.md-dialog-overlay')).not.toBeNull();

      linkEditor.destroy();

      expect(document.querySelector('.md-dialog-overlay')).toBeNull();
    });
  });
});
