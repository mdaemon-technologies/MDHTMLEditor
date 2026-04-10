/**
 * SourceEditor Tests
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { SourceEditor } from '../../src/extensions/SourceEditor';

describe('SourceEditor', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;
  let sourceEditor: SourceEditor;
  let transMock: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new HTMLEditor(container);
    transMock = jest.fn((key) => key);

    sourceEditor = new SourceEditor({
      editor,
      trans: transMock,
    });
  });

  afterEach(() => {
    sourceEditor?.destroy();
    editor?.destroy();
    container?.remove();
    // Clean up any dialogs that may remain
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  describe('Dialog Open/Close', () => {
    it('should open dialog', () => {
      sourceEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create source editor dialog', () => {
      sourceEditor.open();

      const dialog = document.querySelector('.md-source-editor-dialog');
      expect(dialog).not.toBeNull();
    });

    it('should have a textarea', () => {
      sourceEditor.open();

      const textarea = document.querySelector('.md-source-editor-textarea');
      expect(textarea).not.toBeNull();
      expect(textarea?.tagName).toBe('TEXTAREA');
    });

    it('should close dialog', () => {
      sourceEditor.open();
      sourceEditor.close();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should reopen dialog without creating new one', () => {
      sourceEditor.open();
      sourceEditor.close();
      sourceEditor.open();

      const overlays = document.querySelectorAll('.md-dialog-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should close on close button click', () => {
      sourceEditor.open();

      const closeBtn = document.querySelector('.md-dialog-close') as HTMLElement;
      closeBtn?.click();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should close on cancel button click', () => {
      sourceEditor.open();

      const cancelBtn = document.querySelector('.md-source-editor-cancel') as HTMLElement;
      cancelBtn?.click();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should close on overlay click', () => {
      sourceEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay?.click();

      expect(overlay?.style.display).toBe('none');
    });

    it('should close on Escape key', () => {
      sourceEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Dialog Content', () => {
    it('should have header with title', () => {
      sourceEditor.open();

      const header = document.querySelector('.md-dialog-header h3');
      expect(header?.textContent).toBe('Source code');
    });

    it('should have save and cancel buttons', () => {
      sourceEditor.open();

      const saveBtn = document.querySelector('.md-source-editor-save');
      const cancelBtn = document.querySelector('.md-source-editor-cancel');
      expect(saveBtn).not.toBeNull();
      expect(cancelBtn).not.toBeNull();
    });

    it('should use translation function for labels', () => {
      sourceEditor.open();

      expect(transMock).toHaveBeenCalledWith('Source code');
      expect(transMock).toHaveBeenCalledWith('Cancel');
      expect(transMock).toHaveBeenCalledWith('Save');
    });
  });

  describe('Theme Integration', () => {
    it('should add skin class to theme wrapper inside overlay', () => {
      sourceEditor.open();

      const overlay = document.querySelector('.md-dialog-overlay');
      const themeWrapper = overlay?.querySelector('.md-editor-oxide');
      expect(themeWrapper).not.toBeNull();
    });
  });

  describe('Destroy', () => {
    it('should remove overlay from DOM on destroy', () => {
      sourceEditor.open();

      expect(document.querySelector('.md-dialog-overlay')).not.toBeNull();

      sourceEditor.destroy();

      expect(document.querySelector('.md-dialog-overlay')).toBeNull();
    });
  });
});
