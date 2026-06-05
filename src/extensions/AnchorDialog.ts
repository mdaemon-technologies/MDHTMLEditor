/**
 * AnchorDialog
 * Insert named-anchor dialog (CKEditor link/anchor parity). One required
 * "Anchor name" field; the name may not contain whitespace.
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import type { Editor as TipTapEditor } from '@tiptap/core';

export interface AnchorDialogOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

export class AnchorDialog {
  private options: AnchorDialogOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private errorEl: HTMLElement | null = null;

  constructor(options: AnchorDialogOptions) {
    this.options = options;
  }

  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }

  open(): void {
    if (!this.overlay) {
      this.createDialog();
    }
    if (this.nameInput) this.nameInput.value = '';
    this.clearError();
    this.overlay!.style.display = 'flex';
    this.nameInput?.focus();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  private clearError(): void {
    if (this.errorEl) {
      this.errorEl.style.display = 'none';
      this.errorEl.textContent = '';
    }
  }

  private showError(message: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = message;
      this.errorEl.style.display = 'block';
    }
  }

  private save(): void {
    const trans = this.options.trans;
    const name = this.nameInput?.value.trim() ?? '';

    if (!name) {
      this.showError(trans('Anchor name is required'));
      return;
    }
    if (/\s/.test(name)) {
      this.showError(trans('Anchor name cannot contain spaces'));
      return;
    }

    this.tiptap?.chain().focus().insertContent({ type: 'anchor', attrs: { id: name, name } }).run();
    this.close();
  }

  private createDialog(): void {
    const trans = this.options.trans;
    const skin = this.options.editor.getConfig().skin ?? 'oxide';

    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    const themeWrapper = document.createElement('div');
    themeWrapper.className = `md-editor-${skin}`;
    themeWrapper.style.display = 'contents';

    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-anchor-dialog';

    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${trans('Insert anchor')}</h3>
      <button type="button" class="md-dialog-close">×</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());

    const body = document.createElement('div');
    body.className = 'md-dialog-body';

    const nameRow = document.createElement('div');
    nameRow.className = 'md-anchor-dialog-row';
    nameRow.innerHTML = `<label>${trans('Anchor name')}</label>`;
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.className = 'md-anchor-dialog-input';
    nameRow.appendChild(this.nameInput);

    this.errorEl = document.createElement('div');
    this.errorEl.className = 'md-anchor-dialog-error';
    this.errorEl.style.display = 'none';

    const footer = document.createElement('div');
    footer.className = 'md-anchor-dialog-footer';
    footer.innerHTML = `
      <button type="button" class="md-btn md-anchor-dialog-cancel">${trans('Cancel')}</button>
      <button type="button" class="md-btn md-btn-primary md-anchor-dialog-save">${trans('Save')}</button>
    `;
    footer.querySelector('.md-anchor-dialog-cancel')?.addEventListener('click', () => this.close());
    footer.querySelector('.md-anchor-dialog-save')?.addEventListener('click', () => this.save());

    body.appendChild(nameRow);
    body.appendChild(this.errorEl);
    body.appendChild(footer);

    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    themeWrapper.appendChild(this.dialog);
    this.overlay.appendChild(themeWrapper);

    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Enter') {
        this.save();
      }
    });

    document.body.appendChild(this.overlay);
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.nameInput = null;
      this.errorEl = null;
    }
  }
}
