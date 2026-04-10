/**
 * SourceEditor
 * HTML source code editing dialog for the editor
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import type { Editor as TipTapEditor } from '@tiptap/core';

export interface SourceEditorOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

export class SourceEditor {
  private options: SourceEditorOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;

  constructor(options: SourceEditorOptions) {
    this.options = options;
  }

  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }

  open(): void {
    if (this.overlay) {
      // Re-populate textarea with current HTML
      if (this.textarea) {
        this.textarea.value = this.tiptap?.getHTML() ?? '';
      }
      this.overlay.style.display = 'flex';
      this.textarea?.focus();
      return;
    }

    this.createDialog();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  private save(): void {
    if (this.textarea) {
      this.tiptap?.commands.setContent(this.textarea.value);
    }
    this.close();
  }

  private createDialog(): void {
    const trans = this.options.trans;
    const skin = this.options.editor.getConfig().skin ?? 'oxide';

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Theme wrapper — carries the skin class so nested theme selectors match
    const themeWrapper = document.createElement('div');
    themeWrapper.className = `md-editor-${skin}`;
    themeWrapper.style.display = 'contents';

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-source-editor-dialog';

    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${trans('Source code')}</h3>
      <button type="button" class="md-dialog-close">\u00d7</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());

    // Body
    const body = document.createElement('div');
    body.className = 'md-dialog-body';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'md-source-editor-textarea';
    this.textarea.value = this.tiptap?.getHTML() ?? '';
    this.textarea.spellcheck = false;

    // Allow Tab key inside textarea
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea!.selectionStart;
        const end = this.textarea!.selectionEnd;
        this.textarea!.value =
          this.textarea!.value.substring(0, start) +
          '  ' +
          this.textarea!.value.substring(end);
        this.textarea!.selectionStart = this.textarea!.selectionEnd = start + 2;
      }
    });

    body.appendChild(this.textarea);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'md-source-editor-footer';
    footer.innerHTML = `
      <button type="button" class="md-btn md-source-editor-cancel">${trans('Cancel')}</button>
      <button type="button" class="md-btn md-btn-primary md-source-editor-save">${trans('Save')}</button>
    `;

    footer.querySelector('.md-source-editor-cancel')?.addEventListener('click', () => this.close());
    footer.querySelector('.md-source-editor-save')?.addEventListener('click', () => this.save());

    body.appendChild(footer);

    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    themeWrapper.appendChild(this.dialog);
    this.overlay.appendChild(themeWrapper);

    // Escape key to close
    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });

    document.body.appendChild(this.overlay);
    this.textarea.focus();
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.textarea = null;
    }
  }
}
