/**
 * LinkEditor
 * Insert/Edit link dialog for the editor
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import { getMarkRange } from '@tiptap/core';
import type { Editor as TipTapEditor } from '@tiptap/core';
import { LINK_ESCAPE_META } from './LinkEscape';

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

  /**
   * The range of the link at a collapsed caret — where clicking a link, or
   * pasting one, leaves it — so the dialog edits that link as a whole. Null
   * when something is selected or the caret is not on a link.
   */
  private linkRangeAtCaret(): { from: number; to: number } | null {
    const tiptap = this.tiptap;
    const linkType = tiptap?.schema.marks.link;
    if (!tiptap || !linkType || !tiptap.state.selection.empty) return null;
    return getMarkRange(tiptap.state.selection.$from, linkType) ?? null;
  }

  /**
   * True when the range holds an inline node that is not text, such as an
   * image, a mention or a named anchor (a line break aside). Display text can't
   * stand in for one (textBetween skips it), so as in TinyMCE the text field
   * is disabled and the range is relinked rather than replaced.
   */
  private rangeHoldsInlineNode(from: number, to: number): boolean {
    let found = false;
    this.tiptap?.state.doc.nodesBetween(from, to, (node) => {
      if (node.isInline && node.isLeaf && !node.isText && node.type.name !== 'hardBreak') found = true;
      return !found;
    });
    return found;
  }

  private populateFromSelection(): void {
    const tiptap = this.tiptap;
    if (!tiptap) return;

    const attrs = tiptap.getAttributes('link');
    const { from, to } = this.linkRangeAtCaret() ?? tiptap.state.selection;
    const selectedText = tiptap.state.doc.textBetween(from, to, '');

    if (this.urlInput) this.urlInput.value = attrs.href ?? '';
    if (this.textInput) {
      this.textInput.value = selectedText;
      this.textInput.disabled = this.rangeHoldsInlineNode(from, to);
    }
    if (this.titleInput) this.titleInput.value = attrs.title ?? '';
    if (this.targetSelect) this.targetSelect.value = attrs.target ?? '';
  }

  /**
   * Ensure a user-entered URL is usable as an href. Domain-like input typed
   * without a scheme (e.g. "www.example.com", "example.com/path") would
   * otherwise resolve as a relative path and produce a broken link, so prepend
   * a default protocol. Anchors (#...), relative/absolute paths, protocol-
   * relative URLs (//host) and anything with an existing scheme are left alone.
   */
  private normalizeUrl(url: string): string {
    if (!url) return url;

    // Already has a scheme (http:, https:, mailto:, tel:, ftp:, etc.)
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;

    // Protocol-relative, anchor, or relative/absolute path — leave untouched
    if (
      url.startsWith('//') ||
      url.startsWith('#') ||
      url.startsWith('/') ||
      url.startsWith('./') ||
      url.startsWith('../')
    ) {
      return url;
    }

    // Looks like a bare domain ("www.example.com", "example.com/path") — add protocol
    if (/^(www\.|[^\s/?#@]+\.[a-z]{2,})(?:[/?#:]|$)/i.test(url)) {
      return `http://${url}`;
    }

    return url;
  }

  private save(): void {
    const tiptap = this.tiptap;
    if (!tiptap) return;

    const url = this.normalizeUrl(this.urlInput?.value.trim() ?? '');
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

    // A caret on a link edits that link: select it, so the branches below
    // update or retitle it instead of inserting a second one beside it.
    const linkRange = this.linkRangeAtCaret();
    if (linkRange) tiptap.commands.setTextSelection(linkRange);

    const { from, to } = tiptap.state.selection;
    const currentText = tiptap.state.doc.textBetween(from, to, '');

    // Inserted linked text leaves the caret at the link's end; LINK_ESCAPE_META
    // moves it out, so what the user types next is not added to the link.
    const insertLinkedText = (linkText: string, replaceSelection: boolean): void => {
      const chain = tiptap.chain().focus();
      if (replaceSelection) chain.deleteSelection();
      chain
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: linkAttrs }],
        })
        .setMeta(LINK_ESCAPE_META, true)
        .run();
    };

    if (text && text !== currentText && !this.rangeHoldsInlineNode(from, to)) {
      // User changed the display text — replace selection with new text and apply link
      insertLinkedText(text, true);
    } else if (from === to) {
      // No selection — insert the text, or the URL when no text was given, as linked text
      insertLinkedText(text || url, false);
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
