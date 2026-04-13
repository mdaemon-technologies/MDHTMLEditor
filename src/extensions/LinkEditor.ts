/**
 * LinkEditor
 * Insert/Edit link dialog for the editor
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import type { Editor as TipTapEditor } from '@tiptap/core';

export interface LinkEditorOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

export class LinkEditor {
  private options: LinkEditorOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private urlInput: HTMLInputElement | null = null;
  private textInput: HTMLInputElement | null = null;
  private titleInput: HTMLInputElement | null = null;
  private targetSelect: HTMLSelectElement | null = null;

  constructor(options: LinkEditorOptions) {
    this.options = options;
  }

  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }

  open(): void {
    if (!this.overlay) {
      this.createDialog();
    }

    this.populateFromSelection();
    this.overlay!.style.display = 'flex';
    this.urlInput?.focus();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  private populateFromSelection(): void {
    const tiptap = this.tiptap;
    if (!tiptap) return;

    const attrs = tiptap.getAttributes('link');
    const { from, to } = tiptap.state.selection;
    const selectedText = tiptap.state.doc.textBetween(from, to, '');

    if (this.urlInput) this.urlInput.value = attrs.href ?? '';
    if (this.textInput) this.textInput.value = selectedText;
    if (this.titleInput) this.titleInput.value = attrs.title ?? '';
    if (this.targetSelect) this.targetSelect.value = attrs.target ?? '';
  }

  private save(): void {
    const tiptap = this.tiptap;
    if (!tiptap) return;

    const url = this.urlInput?.value.trim() ?? '';
    const text = this.textInput?.value ?? '';
    const title = this.titleInput?.value.trim() ?? '';
    const target = this.targetSelect?.value ?? '';

    // If URL is empty, remove the link
    if (!url) {
      tiptap.chain().focus().unsetLink().run();
      this.close();
      return;
    }

    const linkAttrs: { href: string; target?: string | null; title?: string | null } = { href: url };
    if (target) {
      linkAttrs.target = target;
    } else {
      linkAttrs.target = null;
    }
    if (title) {
      linkAttrs.title = title;
    } else {
      linkAttrs.title = null;
    }

    const { from, to } = tiptap.state.selection;
    const currentText = tiptap.state.doc.textBetween(from, to, '');

    if (text && text !== currentText) {
      // User changed the display text — replace selection with new text and apply link
      tiptap
        .chain()
        .focus()
        .deleteSelection()
        .insertContent({
          type: 'text',
          text: text,
          marks: [{ type: 'link', attrs: linkAttrs }],
        })
        .run();
    } else if (from === to && text) {
      // No selection, insert new linked text
      tiptap
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: text,
          marks: [{ type: 'link', attrs: linkAttrs }],
        })
        .run();
    } else if (from === to && !text) {
      // No selection, no text — insert URL as linked text
      tiptap
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: url,
          marks: [{ type: 'link', attrs: linkAttrs }],
        })
        .run();
    } else {
      // Selection exists, text unchanged — just set link attributes
      tiptap.chain().focus().setLink(linkAttrs).run();
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

    // Theme wrapper
    const themeWrapper = document.createElement('div');
    themeWrapper.className = `md-editor-${skin}`;
    themeWrapper.style.display = 'contents';

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-link-editor-dialog';

    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${trans('Insert/Edit Link')}</h3>
      <button type="button" class="md-dialog-close">\u00d7</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());

    // Body
    const body = document.createElement('div');
    body.className = 'md-dialog-body';

    // URL field
    const urlRow = document.createElement('div');
    urlRow.className = 'md-link-editor-row';
    urlRow.innerHTML = `<label>${trans('URL')}</label>`;
    this.urlInput = document.createElement('input');
    this.urlInput.type = 'text';
    this.urlInput.className = 'md-link-editor-input';
    urlRow.appendChild(this.urlInput);

    // Text to display field
    const textRow = document.createElement('div');
    textRow.className = 'md-link-editor-row';
    textRow.innerHTML = `<label>${trans('Text to display')}</label>`;
    this.textInput = document.createElement('input');
    this.textInput.type = 'text';
    this.textInput.className = 'md-link-editor-input';
    textRow.appendChild(this.textInput);

    // Title field
    const titleRow = document.createElement('div');
    titleRow.className = 'md-link-editor-row';
    titleRow.innerHTML = `<label>${trans('Title')}</label>`;
    this.titleInput = document.createElement('input');
    this.titleInput.type = 'text';
    this.titleInput.className = 'md-link-editor-input';
    titleRow.appendChild(this.titleInput);

    // Open link in... dropdown
    const targetRow = document.createElement('div');
    targetRow.className = 'md-link-editor-row';
    targetRow.innerHTML = `<label>${trans('Open link in...')}</label>`;
    this.targetSelect = document.createElement('select');
    this.targetSelect.className = 'md-link-editor-select';
    this.targetSelect.innerHTML = `
      <option value="">${trans('Current window')}</option>
      <option value="_blank">${trans('New window')}</option>
    `;
    targetRow.appendChild(this.targetSelect);

    body.appendChild(urlRow);
    body.appendChild(textRow);
    body.appendChild(titleRow);
    body.appendChild(targetRow);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'md-link-editor-footer';
    footer.innerHTML = `
      <button type="button" class="md-btn md-link-editor-cancel">${trans('Cancel')}</button>
      <button type="button" class="md-btn md-btn-primary md-link-editor-save">${trans('Save')}</button>
    `;

    footer.querySelector('.md-link-editor-cancel')?.addEventListener('click', () => this.close());
    footer.querySelector('.md-link-editor-save')?.addEventListener('click', () => this.save());

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
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.urlInput = null;
      this.textInput = null;
      this.titleInput = null;
      this.targetSelect = null;
    }
  }
}
