/**
 * MediaDialog
 * The Insert video dialog (`media` button, `mceMedia`). A YouTube, Vimeo or
 * Dailymotion link goes in as the video's thumbnail linked to the video, or,
 * for Vimeo, which has no thumbnail at a fixed address, as a plain link. An
 * embedded player is not an option: the editor keeps no iframes, and mail
 * clients remove them. A host's `media_url_resolver` can supply the link,
 * thumbnail and title; what it returns is checked here, since content
 * inserted as nodes does not pass through the parse rules that check pasted
 * HTML.
 */

import { isAllowedUri } from '@tiptap/extension-link';
import type { Editor as TipTapEditor, JSONContent } from '@tiptap/core';
import { Selection, TextSelection } from '@tiptap/pm/state';
import type { HTMLEditor } from '../core/HTMLEditor';
import type { MediaResolution, MediaUrlResolver, MediaVideo } from '../types';
import { createSkinHost } from '../utils/skinHost';
import { parseVideoUrl } from '../utils/videoUrl';
import { webImageAddress } from '../utils/imageAddress';
import { LINK_ESCAPE_META } from './LinkEscape';

export interface MediaDialogOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
  /** Asked in place of the editor's `media_url_resolver`, which is read at each insert otherwise. */
  resolver?: MediaUrlResolver;
}

let dialogCounter = 0;

const isWebProtocol = (protocol: string) => protocol === 'https:' || protocol === 'http:';

/**
 * An absolute http(s) link that the editor's links allow, as the browser reads
 * it (a tab inside the scheme, say, is dropped), so the stored link is the one
 * that was checked. Null for anything else.
 */
function webLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return isWebProtocol(url.protocol) && isAllowedUri(url.href) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * The content to insert for a video: its thumbnail linked to it, or, with no
 * thumbnail, a link. What the resolver returned is used only where it passes
 * the checks; anything else keeps the default.
 */
export function mediaContent(
  video: MediaVideo,
  answer: MediaResolution | null,
  defaultAlt: string,
  /** False where the editor has no images (the basic editor): a plain link then. */
  images = true,
): JSONContent {
  const href = webLink(answer?.href) ?? video.href;
  const thumbnail = images ? webImageAddress(answer?.thumbnail) ?? video.thumbnail : undefined;
  const title = typeof answer?.title === 'string' && answer.title.trim() ? answer.title.trim() : null;
  const marks = [{ type: 'link', attrs: { href } }];
  return thumbnail
    ? { type: 'image', attrs: { src: thumbnail, alt: title ?? defaultAlt }, marks }
    : { type: 'text', text: title ?? href, marks };
}

/**
 * Insert a video's content at the selection. A code block holds plain text
 * only, and inserting there would split it, so the video goes in a line of its
 * own after the block. The caret is moved out of the link afterwards, so what
 * is typed next is not part of it.
 */
export function insertMedia(tiptap: TipTapEditor, content: JSONContent): boolean {
  return tiptap
    .chain()
    .focus()
    .command(({ tr }) => {
      // A selection is replaced, as by any insert, before the place is chosen.
      // Deleting can leave another node selected (a rule at the document's end
      // after the selected one is gone): then insert where the selection was,
      // without replacing that node too.
      let at: number | null = null;
      if (!tr.selection.empty) {
        const start = tr.selection.from;
        tr.deleteSelection();
        if (!tr.selection.empty) at = start;
      }
      const $from = at === null ? tr.selection.$from : tr.doc.resolve(at);
      const node = tr.doc.type.schema.nodeFromJSON(content);
      if ($from.parent.type.spec.code) {
        const paragraph = tr.doc.type.schema.nodes.paragraph.create(null, node);
        const after = $from.after();
        tr.insert(after, paragraph);
        // The caret after the video, at the end of its new line.
        tr.setSelection(TextSelection.create(tr.doc, after + paragraph.nodeSize - 1));
      } else if (at === null) {
        tr.replaceSelectionWith(node, false);
      } else {
        const steps = tr.steps.length;
        tr.replaceRangeWith(at, at, node);
        // The caret just after what was inserted.
        tr.setSelection(Selection.near(tr.doc.resolve(tr.mapping.slice(steps).map(at, 1)), -1));
      }
      return true;
    })
    .setMeta(LINK_ESCAPE_META, true)
    .run();
}

export class MediaDialog {
  private options: MediaDialogOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private errorEl: HTMLElement | null = null;
  private insertButton: HTMLButtonElement | null = null;
  /** Stops listening to the page's keys; set while the dialog is open. */
  private stopKeys: (() => void) | null = null;
  /** Counts opens and closes, so a resolver's late answer for a closed dialog is ignored. */
  private request = 0;

  constructor(options: MediaDialogOptions) {
    this.options = options;
  }

  /** Open the dialog, empty, built afresh so it is in the current language. */
  open(): void {
    this.close();
    this.build();
    this.input?.focus();
  }

  /**
   * Close the dialog. `returnFocus` gives focus back to the editor, as the
   * user's own closes (Cancel, ×, Escape, a click beside the dialog) do.
   */
  close(returnFocus = false): void {
    const wasOpen = !!this.overlay;
    this.request++;
    this.stopKeys?.();
    this.stopKeys = null;
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
    this.input = null;
    this.errorEl = null;
    this.insertButton = null;
    if (returnFocus && wasOpen) this.options.editor.focus();
  }

  destroy(): void {
    this.close();
  }

  private showError(message: string): void {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.style.display = 'block';
  }

  private clearError(): void {
    if (!this.errorEl) return;
    this.errorEl.textContent = '';
    this.errorEl.style.display = 'none';
  }

  private async insert(): Promise<void> {
    const { trans, editor } = this.options;
    // Read now, so a resolver the host set on the config since is the one asked.
    const resolver = this.options.resolver ?? editor.getConfig().media_url_resolver;
    if (!this.input || this.insertButton?.disabled || editor.isReadOnly()) return;
    const video = parseVideoUrl(this.input.value);
    if (!video) {
      this.showError(trans('This is not a YouTube, Vimeo or Dailymotion link'));
      this.input.focus();
      return;
    }
    this.clearError();

    const request = ++this.request;
    let answer: MediaResolution | null = null;
    if (resolver) {
      // Busy: the link being looked up can't be edited, nor sent twice.
      if (this.insertButton) this.insertButton.disabled = true;
      this.input.readOnly = true;
      this.dialog?.setAttribute('aria-busy', 'true');
      try {
        answer = (await resolver({ ...video })) ?? null;
      } catch {
        answer = null;
      }
    }
    // Closed, or opened again, while the resolver worked; or the editor was
    // made read-only meanwhile (which also closes the dialog).
    if (request !== this.request || !this.overlay || editor.isReadOnly()) return;

    const tiptap = editor.getTipTap();
    if (!tiptap) return;
    const content = mediaContent(video, answer, trans('Video'), !!tiptap.schema.nodes.image);
    this.close();
    insertMedia(tiptap, content);
  }

  /** Keep Tab within the dialog, which is modal, wherever on the page focus is. */
  private trapTab(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outside = !this.dialog?.contains(active);
    if (outside || (event.shiftKey ? active === first : active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  private build(): void {
    const { trans, editor } = this.options;
    const id = `md-media-dialog-${++dialogCounter}`;

    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.style.display = 'flex';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close(true);
    });
    // The page's keys, not only the dialog's: a click on the title or the
    // padding leaves focus on the page, where Escape and Tab must still work.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close(true);
      } else if (e.key === 'Enter' && e.target === this.input) {
        e.preventDefault();
        void this.insert();
      } else if (e.key === 'Tab') {
        this.trapTab(e);
      }
    };
    document.addEventListener('keydown', onKey, true);
    this.stopKeys = () => document.removeEventListener('keydown', onKey, true);

    const dialog = document.createElement('div');
    this.dialog = dialog;
    dialog.className = 'md-dialog md-media-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', `${id}-title`);

    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    const title = document.createElement('h3');
    title.id = `${id}-title`;
    title.textContent = trans('Insert video');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'md-dialog-close';
    closeButton.setAttribute('aria-label', trans('Cancel'));
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.close(true));
    header.append(title, closeButton);

    const body = document.createElement('div');
    body.className = 'md-dialog-body';

    const row = document.createElement('div');
    row.className = 'md-media-dialog-row';
    const label = document.createElement('label');
    label.htmlFor = `${id}-url`;
    label.textContent = trans('Video URL');
    this.input = document.createElement('input');
    this.input.type = 'url';
    this.input.id = `${id}-url`;
    this.input.className = 'md-media-dialog-input';
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-describedby', `${id}-hint ${id}-error`);
    row.append(label, this.input);

    const hint = document.createElement('div');
    hint.id = `${id}-hint`;
    hint.className = 'md-media-dialog-hint';
    hint.textContent = trans('Paste a YouTube, Vimeo or Dailymotion link');

    this.errorEl = document.createElement('div');
    this.errorEl.id = `${id}-error`;
    this.errorEl.className = 'md-media-dialog-error';
    this.errorEl.setAttribute('role', 'alert');
    this.errorEl.style.display = 'none';

    const footer = document.createElement('div');
    footer.className = 'md-media-dialog-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'md-btn md-media-dialog-cancel';
    cancel.textContent = trans('Cancel');
    cancel.addEventListener('click', () => this.close(true));
    this.insertButton = document.createElement('button');
    this.insertButton.type = 'button';
    this.insertButton.className = 'md-btn md-btn-primary md-media-dialog-insert';
    this.insertButton.textContent = trans('Insert');
    this.insertButton.addEventListener('click', () => void this.insert());
    footer.append(cancel, this.insertButton);

    body.append(row, hint, this.errorEl, footer);
    dialog.append(header, body);
    this.overlay.appendChild(createSkinHost(editor.getConfig().skin, dialog));
    document.body.appendChild(this.overlay);
  }
}
