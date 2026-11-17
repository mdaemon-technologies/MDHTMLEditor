/**
 * ImageDialog
 * The image dialog (`image` button, `mceImage`): inserts an image, or, when an
 * image is selected, edits it in place.
 *
 * Everything the dialog writes is checked here, because content inserted as
 * nodes does not pass through the parse rules that check pasted HTML: the
 * address must be an image address (http(s), relative, or a data:image URI,
 * an SVG one cleaned first), and the image's own attributes check their values
 * again on the way out (ImageAttributes).
 */

import { getMarkRange } from '@tiptap/core';
import { isAllowedUri } from '@tiptap/extension-link';
import type { Mark, Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import type { HTMLEditor } from '../core/HTMLEditor';
import { CSS_LENGTH, mergeStyle, sanitizeStyle, styleProperty } from '../utils/cssValues';
import { CONTROL_CHARACTERS, webImageAddress } from '../utils/imageAddress';
import { normalizeLinkAddress } from '../utils/linkAddress';
import { createSkinHost } from '../utils/skinHost';
import { IMAGE_STYLE_RULES, imageDir, imageLang } from './ImageAttributes';
import { BORDER_STYLE_CHOICES } from './TableDialog';
import { sanitizeSVG } from './ImageUpload';
import { insertMedia } from './MediaDialog';

/** What the Upload tab needs: the editor's own uploader, as paste and drop use it. */
export interface ImageUploader {
  /** A message to refuse the file with, or null to upload it. */
  validateFile(file: File): string | null;
  /** Upload the file and resolve its address, reporting progress in whole percent. */
  uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string>;
}

export interface ImageDialogOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
  /** Uploads a chosen file. Without one there is no Upload tab. */
  uploader?: ImageUploader;
}

let dialogCounter = 0;

/** The preview's sample text: placeholder words, the same in every language. */
const PREVIEW_TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et '
  + 'dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo '
  + 'consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

const LOCK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const RESET_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';


/** A data:image URI: its type, its parameters (`;base64`) and its data. */
const DATA_IMAGE = /^data:image\/([a-z0-9.+-]+)((?:;[a-z0-9=._+-]+)*),(.*)$/is;

/** UTF-8 text from base64. Throws on input that is not base64. */
function fromBase64(data: string): string {
  const bytes = atob(data);
  return decodeURIComponent(Array.from(bytes, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
}

/** UTF-8 text as base64. */
function toBase64(text: string): string {
  return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
}

/**
 * A data:image URI as it may be stored, or null. An SVG one is cleaned as an
 * uploaded SVG is (sanitizeSVG) and stored as base64.
 */
function dataImage(text: string): string | null {
  const match = DATA_IMAGE.exec(text);
  if (!match) return null;
  const [, type, params, data] = match;
  // Any other image is base64, as uploads and pasted images are: data in
  // another form is refused rather than stored as typed.
  if (type.toLowerCase() !== 'svg+xml') {
    return /;base64$/i.test(params) && /^[A-Za-z0-9+/]+={0,2}$/.test(data) ? text : null;
  }
  let svg: string;
  try {
    svg = /;base64$/i.test(params) ? fromBase64(data) : decodeURIComponent(data);
  } catch {
    return null;
  }
  const clean = sanitizeSVG(svg);
  // sanitizeSVG takes any well-formed XML; only an SVG is an SVG image.
  if (!clean || !/^<svg[\s>]/.test(clean)) return null;
  return `data:image/svg+xml;base64,${toBase64(clean)}`;
}

/**
 * The address an image may be given: an http(s) address as the browser reads
 * it, a relative one (which the page's own address makes http(s)), or a
 * data:image URI. Control characters are removed first, so one inside a
 * scheme (java\u0001script:) can't read as a relative path. Null for anything
 * else.
 */
export function imageSource(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(CONTROL_CHARACTERS, '').trim();
  return /^data:/i.test(text) ? dataImage(text) : webImageAddress(text);
}

/**
 * A width or height as the dialog saves it: a whole number of pixels (`200`,
 * `200px`) as a number, or a whole percentage (`50%`) as written. Null for
 * anything else, which leaves the attribute out.
 */
export function imageSize(value: string): number | string | null {
  // Zero is no size: it would hide the image.
  const pixels = /^\s*(\d{1,5})(px)?\s*$/i.exec(value);
  if (pixels) return Number(pixels[1]) > 0 ? Number(pixels[1]) : null;
  const percent = /^\s*(\d{1,3})%\s*$/.exec(value);
  return percent && Number(percent[1]) > 0 ? `${Number(percent[1])}%` : null;
}

/** A length as typed: a bare number is pixels. */
function cssLength(value: string): string {
  const trimmed = value.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
}

/** The fields that each set part of the style, which the Style field follows. */
const STYLE_FIELDS = ['align', 'vspace', 'hspace', 'borderwidth', 'borderstyle'];

/** A size attribute as the text of its field. */
const sizeText = (value: unknown): string => (typeof value === 'number' || typeof value === 'string' ? String(value) : '');

/** A field's whole number of pixels, or null (a percentage, empty, anything else). */
function pixels(value: string): number | null {
  const size = imageSize(value);
  return typeof size === 'number' && size > 0 ? size : null;
}

/** An image's style as the dialog shows it: only what it may keep, or ''. */
const sanitizeImageStyle = (style: unknown): string => sanitizeStyle(style, IMAGE_STYLE_RULES) ?? '';

/** What the spacing, border and alignment fields show for a style. */
function styleFieldValues(style: unknown): Record<string, string> {
  const get = (property: string) => styleProperty(style, property);
  const same = (a: string, b: string) => (get(a) === get(b) ? get(a) : '');
  return {
    // float: none floats nothing, as no alignment does.
    align: get('float') === 'none' ? '' : get('float'),
    vspace: same('margin-top', 'margin-bottom'),
    hspace: same('margin-left', 'margin-right'),
    borderwidth: get('border-width'),
    borderstyle: get('border-style'),
  };
}

/** Set a field's value; a select gets the value as an extra choice when it does not list it. */
function setFieldValue(field: HTMLInputElement | HTMLSelectElement, value: string): void {
  if (field instanceof HTMLSelectElement && value && !Array.from(field.options).some((o) => o.value === value)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    field.appendChild(option);
  }
  field.value = value;
}

/** The image the dialog edits: the node and where it was when the dialog opened. */
interface Target {
  pos: number;
  node: PMNode;
}

interface Tab {
  label: string;
  panel: HTMLElement;
}

type Field = HTMLInputElement | HTMLSelectElement;

interface Size {
  width: number;
  height: number;
}

export class ImageDialog {
  private options: ImageDialogOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private fields = new Map<string, Field>();
  /** Each field's value when the dialog opened, so an untouched field keeps the image's own value. */
  private initial = new Map<string, string>();
  /** The image's own size, once the preview has loaded it. */
  private natural: Size | null = null;
  /** Width over height, which Constrain proportions keeps, or null when unknown. */
  private ratio: number | null = null;
  /** Whether the ratio is the picture's own, which a new picture's replaces. */
  private ratioFromPicture = false;
  /** The style the Style field holds before the other fields' changes: the image's, or as last typed there. */
  private styleBase: string | null = null;
  /** Whether Image is decorative was on when the dialog opened. */
  private wasDecorative = false;
  /** The last Source checked, and its result, so it is checked once per change. */
  private checkedSource: { typed: string; src: string | null } | null = null;
  private constrain = true;
  private preview: HTMLImageElement | null = null;
  private previewError: HTMLElement | null = null;
  /** Counts uploads, opens and closes, so an upload that finishes late is ignored. */
  private request = 0;
  private uploading = false;
  private uploadErrorEl: HTMLElement | null = null;
  private progressEl: HTMLElement | null = null;
  /** Show the tab at this index. */
  private selectTab: (index: number) => void = () => {};
  /** The selected image, in edit mode; null when inserting. */
  private target: Target | null = null;
  /** Stops listening to the page's keys; set while the dialog is open. */
  private stopKeys: (() => void) | null = null;
  private id = '';

  constructor(options: ImageDialogOptions) {
    this.options = options;
  }

  /**
   * Open the dialog, built afresh so it is in the current language: to edit
   * the selected image, or to insert one.
   */
  open(): void {
    this.close();
    // The basic editor has no images to insert or edit.
    if (this.options.editor.isBasicEditor()) return;
    this.target = this.selectedImage();
    this.build();
    this.fields.get('src')?.focus();
  }

  isOpen(): boolean {
    return !!this.overlay;
  }

  /**
   * Close the dialog. `returnFocus` gives focus back to the editor, as the
   * user's own closes (Cancel, ×, Escape, a click beside the dialog) do.
   */
  close(returnFocus = false): void {
    const wasOpen = !!this.overlay;
    this.request++;
    this.uploading = false;
    this.uploadErrorEl = null;
    this.progressEl = null;
    this.selectTab = () => {};
    this.stopKeys?.();
    this.stopKeys = null;
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
    this.saveButton = null;
    this.fields.clear();
    this.initial.clear();
    this.natural = null;
    this.ratio = null;
    this.ratioFromPicture = false;
    this.styleBase = null;
    this.wasDecorative = false;
    this.checkedSource = null;
    this.constrain = true;
    this.preview = null;
    this.previewError = null;
    this.target = null;
    if (returnFocus && wasOpen) this.options.editor.focus();
  }

  destroy(): void {
    this.close();
  }

  private selectedImage(): Target | null {
    const selection = this.options.editor.getTipTap()?.state.selection;
    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      return { pos: selection.from, node: selection.node };
    }
    return null;
  }

  private value(name: string): string {
    return this.fields.get(name)?.value ?? '';
  }

  /** Whether the field is there and the user changed it. */
  private changed(name: string): boolean {
    return this.fields.has(name) && this.value(name) !== this.initial.get(name);
  }

  /** The address to save, or null when Source can't be saved. */
  private source(): string | null {
    const typed = this.value('src');
    // An image's own address is kept as it is (a cid: or blob: one, say),
    // even though a new address like it would be refused. Unchanged means the
    // field still holds what it opened with: a field drops line breaks from
    // its value, so the address itself can differ from it.
    const current = this.target?.node.attrs.src;
    if (typeof current === 'string' && !this.changed('src')) return current;
    if (this.checkedSource?.typed !== typed) this.checkedSource = { typed, src: imageSource(typed) };
    return this.checkedSource.src;
  }

  /** The image's link mark, in edit mode. */
  private link(): Mark | undefined {
    return this.target?.node.marks.find((mark) => mark.type.name === 'link');
  }

  /**
   * The link address to save: '' for no link, the address as typed when the
   * user did not change it, else the typed address made usable and checked as
   * links are. Null when it can't be saved.
   */
  private linkAddress(): string | null {
    if (!this.changed('href')) return this.initial.get('href') ?? '';
    const typed = this.value('href').replace(CONTROL_CHARACTERS, '').trim();
    if (!typed) return '';
    const href = normalizeLinkAddress(typed);
    return isAllowedUri(href) ? href : null;
  }

  /**
   * The fields whose value can't be saved: marked (aria-invalid), and Save
   * waits until they are fixed or emptied, rather than saving something else.
   * An untouched size or spacing is kept as the image has it, so only a
   * changed one is checked.
   */
  private invalidFields(src: string | null): Set<string> {
    const invalid = new Set<string>();
    const filled = (name: string) => this.value(name).trim() !== '';
    if (filled('src') && !src) invalid.add('src');
    if (this.fields.has('href') && this.linkAddress() === null) invalid.add('href');
    if (filled('lang') && !imageLang(this.value('lang'))) invalid.add('lang');
    for (const name of ['width', 'height']) {
      if (this.changed(name) && filled(name) && imageSize(this.value(name)) === null) invalid.add(name);
    }
    for (const name of ['vspace', 'hspace', 'borderwidth']) {
      if (this.changed(name) && filled(name) && !CSS_LENGTH.test(cssLength(this.value(name)))) invalid.add(name);
    }
    return invalid;
  }

  /** Allow saving only when every field can be saved, and show what Source points to. */
  private refresh(): void {
    const src = this.source();
    const invalid = this.invalidFields(src);
    for (const [name, field] of this.fields) {
      if (invalid.has(name)) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
    if (this.saveButton) this.saveButton.disabled = this.uploading || !src || invalid.size > 0;
    this.updatePreview(src);
  }

  /** Show the image as it would be saved: its address, size and style. */
  private updatePreview(src: string | null): void {
    const img = this.preview;
    if (!img) return;
    if (!src) {
      img.removeAttribute('src');
      if (this.previewError) this.previewError.hidden = true;
    } else if (img.getAttribute('src') !== src) {
      this.natural = null;
      if (this.previewError) this.previewError.hidden = true;
      img.src = src;
    }
    for (const name of ['width', 'height']) {
      const value = this.fields.has(name) ? this.value(name) : sizeText(this.target?.node.attrs[name]);
      const size = imageSize(value);
      if (size === null) img.removeAttribute(name);
      else img.setAttribute(name, String(size));
    }
    img.style.cssText = this.style() ?? '';
  }

  /**
   * The image attributes the dialog's fields give. A field the dialog does not
   * show leaves the image's own value alone, as does a size or alignment the
   * user did not change.
   */
  private attributes(src: string): Record<string, unknown> {
    const attrs: Record<string, unknown> = { src };
    const decorative = this.fields.get('decorative') as HTMLInputElement | undefined;
    // An image's alt is left alone unless the user changed it: an empty alt
    // marks an image decorative, which an unchanged empty field must not undo.
    const decorativeChanged = !!decorative && decorative.checked !== this.wasDecorative;
    if (decorative?.checked) {
      attrs.alt = '';
    } else if (this.fields.has('alt') && (!this.target || decorativeChanged || this.changed('alt'))) {
      attrs.alt = this.value('alt').trim() || null;
    } else if (decorativeChanged) {
      // Turned off with no Alt text field: no longer marked decorative.
      attrs.alt = null;
    }
    if (this.fields.has('title')) attrs.title = this.value('title').trim() || null;
    for (const name of ['width', 'height']) {
      if (this.changed(name)) attrs[name] = imageSize(this.value(name));
    }

    if (this.fields.has('style') || Object.keys(this.styleChanges()).length > 0) attrs.style = this.style();
    if (this.fields.has('dir')) attrs.dir = imageDir(this.value('dir'));
    if (this.fields.has('lang')) attrs.lang = imageLang(this.value('lang'));
    return attrs;
  }

  /** The style changes the spacing, border and alignment fields make: only those the user changed. */
  private styleChanges(): Record<string, string> {
    const changes: Record<string, string> = {};
    if (this.changed('align')) changes.float = this.value('align');
    if (this.changed('vspace')) {
      changes['margin-top'] = changes['margin-bottom'] = cssLength(this.value('vspace'));
    }
    if (this.changed('hspace')) {
      changes['margin-left'] = changes['margin-right'] = cssLength(this.value('hspace'));
    }
    if (this.changed('borderwidth')) changes['border-width'] = cssLength(this.value('borderwidth'));
    if (this.changed('borderstyle')) changes['border-style'] = this.value('borderstyle');
    return changes;
  }

  /**
   * The style the fields give: the Style field's text, or the image's own
   * style without that field, with the other fields' changes on top, kept
   * through IMAGE_STYLE_RULES. A border width given with no border style draws
   * a solid border, as a width alone shows nothing.
   */
  private style(): string | null {
    const base = this.fields.has('style') ? this.styleBase : this.target?.node.attrs.style;
    const style = mergeStyle(base, this.styleChanges(), IMAGE_STYLE_RULES);
    if (this.changed('borderwidth') && styleProperty(style, 'border-width') && !styleProperty(style, 'border-style')) {
      return mergeStyle(style, { 'border-style': 'solid' }, IMAGE_STYLE_RULES);
    }
    return style;
  }

  /** After a field changes: keep the Style field and the fields it covers in step. */
  private fieldChanged(name: string): void {
    const styleField = this.fields.get('style');
    if (!styleField) return;
    if (STYLE_FIELDS.includes(name)) {
      styleField.value = this.style() ?? '';
    } else if (name === 'style') {
      // What was typed is the base now, and the fields show it as their
      // baseline, so they change nothing on save unless changed again.
      this.styleBase = styleField.value;
      // Only what an image may keep, so a field never shows a value that
      // would not be saved.
      for (const [field, value] of Object.entries(styleFieldValues(sanitizeImageStyle(styleField.value)))) {
        const input = this.fields.get(field);
        if (!input) continue;
        setFieldValue(input, value);
        this.initial.set(field, input.value);
      }
    }
  }

  private save(): void {
    const { editor } = this.options;
    if (!this.overlay || this.uploading || this.saveButton?.disabled || editor.isReadOnly()) return;
    if (this.invalidFields(this.source()).size > 0) return;
    const tiptap = editor.getTipTap();
    const src = this.source();
    const href = this.linkAddress();
    if (!tiptap || !src || href === null) return;
    const attrs = this.attributes(src);
    const target = this.target;
    // Current window is no target: the link mark's default is a new window.
    const linkTarget = this.value('target') || null;

    if (!target) {
      this.close();
      const marks = href ? [{ type: 'link', attrs: { href, target: linkTarget } }] : [];
      insertMedia(tiptap, { type: 'image', attrs, marks });
      return;
    }
    // Read now: closing clears the fields.
    const targetChanged = this.changed('target');
    const relink = this.changed('href') || targetChanged;
    const oldLink = this.link();
    // The image was changed or moved while the dialog was open.
    if (tiptap.state.doc.nodeAt(target.pos) !== target.node) {
      this.close(true);
      return;
    }
    this.close();
    tiptap
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, ...attrs });
        const linkType = tr.doc.type.schema.marks.link;
        if (relink && linkType) {
          // The link is one link however much it holds (image and text, two
          // images), as an <a> is: it changes, or goes, as a whole.
          const range = (oldLink && getMarkRange(tr.doc.resolve(target.pos), linkType, oldLink.attrs))
            || { from: target.pos, to: target.pos + target.node.nodeSize };
          tr.removeMark(range.from, range.to, linkType);
          // A target the dialog doesn't offer (_top, say) is kept unless changed.
          const opens = targetChanged || !oldLink ? linkTarget : oldLink.attrs.target;
          if (href) tr.addMark(range.from, range.to, linkType.create({ ...oldLink?.attrs, href, target: opens }));
        }
        // The image is replaced, which leaves a caret: select it again.
        tr.setSelection(NodeSelection.create(tr.doc, target.pos));
        return true;
      })
      .run();
  }

  /** Keep Tab within the dialog, which is modal, wherever on the page focus is. */
  private trapTab(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])') ?? [],
    ).filter((el) => !el.closest('[hidden]') && el.tabIndex !== -1);
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

  /** A labelled text field in `panel`. */
  private textField(panel: HTMLElement, name: string, label: string, value: string, type = 'text'): HTMLInputElement {
    const row = document.createElement('div');
    row.className = 'md-image-dialog-row';
    const labelEl = document.createElement('label');
    labelEl.htmlFor = `${this.id}-${name}`;
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.type = type;
    input.id = `${this.id}-${name}`;
    input.name = name;
    input.className = 'md-image-dialog-input';
    input.autocomplete = 'off';
    input.value = value;
    input.addEventListener('input', () => {
      this.fieldChanged(name);
      this.refresh();
    });
    row.append(labelEl, input);
    panel.appendChild(row);
    this.register(name, input);
    return input;
  }

  private register(name: string, field: Field): void {
    this.fields.set(name, field);
    this.initial.set(name, field.value);
  }

  /** A labelled select in `panel`. A current value the choices don't list is shown as an extra choice. */
  private selectField(panel: HTMLElement, name: string, label: string, choices: Array<[string, string]>, value: string): HTMLSelectElement {
    const row = document.createElement('div');
    row.className = 'md-image-dialog-row';
    const labelEl = document.createElement('label');
    labelEl.htmlFor = `${this.id}-${name}`;
    labelEl.textContent = label;
    const select = document.createElement('select');
    select.id = `${this.id}-${name}`;
    select.name = name;
    select.className = 'md-image-dialog-input';
    for (const [optionValue, text] of choices) {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = text;
      select.appendChild(option);
    }
    setFieldValue(select, value);
    select.addEventListener('change', () => {
      this.fieldChanged(name);
      this.refresh();
    });
    row.append(labelEl, select);
    panel.appendChild(row);
    this.register(name, select);
    return select;
  }

  /** Image is decorative: an empty alt, with the Alt text field turned off. */
  private decorativeField(panel: HTMLElement, on: boolean): void {
    const row = document.createElement('div');
    row.className = 'md-image-dialog-row md-image-dialog-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `${this.id}-decorative`;
    input.name = 'decorative';
    input.checked = on;
    const labelEl = document.createElement('label');
    labelEl.htmlFor = input.id;
    labelEl.textContent = this.options.trans('Image is decorative');
    const sync = () => {
      const alt = this.fields.get('alt');
      if (alt) alt.disabled = input.checked;
    };
    input.addEventListener('change', sync);
    row.append(input, labelEl);
    panel.appendChild(row);
    this.fields.set('decorative', input);
    this.wasDecorative = on;
    sync();
  }

  /** Width and Height, with Constrain proportions and Reset size. */
  private sizeFields(panel: HTMLElement, attrs: Record<string, unknown>): void {
    const t = this.options.trans;
    const row = document.createElement('div');
    row.className = 'md-image-dialog-size';
    const width = this.textField(row, 'width', t('Width'), sizeText(attrs.width));
    const height = this.textField(row, 'height', t('Height'), sizeText(attrs.height));
    this.takeRatio();

    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'md-image-dialog-lock';
    lock.setAttribute('aria-label', t('Constrain proportions'));
    lock.title = t('Constrain proportions');
    lock.setAttribute('aria-pressed', 'true');
    // eslint-disable-next-line no-unsanitized/property -- LOCK_ICON is a constant SVG of the editor's
    lock.innerHTML = LOCK_ICON;
    lock.addEventListener('click', () => {
      this.constrain = !this.constrain;
      lock.setAttribute('aria-pressed', String(this.constrain));
      // Turned on, it keeps the shape the size has now.
      if (this.constrain) this.takeRatio();
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'md-image-dialog-reset';
    reset.setAttribute('aria-label', t('Reset size'));
    reset.title = t('Reset size');
    // eslint-disable-next-line no-unsanitized/property -- RESET_ICON is a constant SVG of the editor's
    reset.innerHTML = RESET_ICON;
    reset.addEventListener('click', () => {
      width.value = this.natural ? String(this.natural.width) : '';
      height.value = this.natural ? String(this.natural.height) : '';
      if (this.natural) {
        this.ratio = this.natural.width / this.natural.height;
        this.ratioFromPicture = true;
      }
      this.refresh();
    });

    width.addEventListener('input', () => this.keepRatio(width, height, (w, ratio) => w / ratio));
    height.addEventListener('input', () => this.keepRatio(height, width, (h, ratio) => h * ratio));
    row.append(lock, reset);
    panel.appendChild(row);
  }

  /** Take the shape of the size in the fields as the ratio to keep, when it is in pixels. */
  private takeRatio(): void {
    const width = pixels(this.value('width'));
    const height = pixels(this.value('height'));
    if (width && height) {
      this.ratio = width / height;
      this.ratioFromPicture = false;
    }
  }

  /**
   * With Constrain proportions on, follow a change to one side with the other,
   * by a ratio taken once (the size at opening, the image's own once loaded,
   * or the size when the lock was turned on), never from a side it computed,
   * which would drift as the user types. A percentage on one side leaves the
   * other empty, as its ratio is unknown.
   */
  private keepRatio(changed: HTMLInputElement, other: HTMLInputElement, follow: (value: number, ratio: number) => number): void {
    if (this.constrain) {
      const value = pixels(changed.value);
      if (/%\s*$/.test(changed.value)) {
        other.value = '';
      } else if (value && this.ratio) {
        other.value = String(Math.max(1, Math.round(follow(value, this.ratio))));
      }
    }
    this.refresh();
  }

  private generalTab(): Tab {
    const t = this.options.trans;
    const config = this.options.editor.getConfig();
    const attrs: Record<string, unknown> = this.target?.node.attrs ?? {};
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    const panel = document.createElement('div');
    // A text field, so the browser's own url check doesn't mark a relative,
    // cid: or data: address as invalid.
    this.textField(panel, 'src', t('Source'), text(attrs.src));
    if (config.image_description !== false) this.textField(panel, 'alt', t('Alt text'), text(attrs.alt));
    if (config.a11y_advanced_options) this.decorativeField(panel, attrs.alt === '');
    if (config.image_title) this.textField(panel, 'title', t('Title'), text(attrs.title));
    if (config.image_dimensions !== false) this.sizeFields(panel, attrs);
    this.selectField(panel, 'align', t('Alignment'), [['', t('None')], ['left', t('Left')], ['right', t('Right')]],
      styleFieldValues(sanitizeImageStyle(attrs.style)).align);
    panel.appendChild(this.previewBox());
    return { label: t('General'), panel };
  }

  /** The Advanced tab: the style, spacing and border, text direction, language, and Title when General has none. */
  private advancedTab(): Tab {
    const t = this.options.trans;
    const attrs: Record<string, unknown> = this.target?.node.attrs ?? {};
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    const style = sanitizeImageStyle(attrs.style);
    this.styleBase = style;
    const shown = styleFieldValues(style);
    const panel = document.createElement('div');
    this.textField(panel, 'style', t('Style'), style);
    this.textField(panel, 'vspace', t('Vertical space'), shown.vspace);
    this.textField(panel, 'hspace', t('Horizontal space'), shown.hspace);
    this.textField(panel, 'borderwidth', t('Border width'), shown.borderwidth);
    this.selectField(panel, 'borderstyle', t('Border style'),
      [['', ''], ...BORDER_STYLE_CHOICES.map(([value, label]): [string, string] => [value, t(label)])], shown.borderstyle);
    this.selectField(panel, 'dir', t('Text direction'), [['', ''], ['ltr', t('Left to right')], ['rtl', t('Right to left')]],
      imageDir(attrs.dir) ?? '');
    this.textField(panel, 'lang', t('Language'), text(attrs.lang));
    if (!this.options.editor.getConfig().image_title) this.textField(panel, 'title', t('Title'), text(attrs.title));
    return { label: t('Advanced'), panel };
  }

  private linkTab(): Tab {
    const t = this.options.trans;
    const link = this.link();
    const panel = document.createElement('div');
    this.textField(panel, 'href', t('URL'), typeof link?.attrs.href === 'string' ? link.attrs.href : '');
    this.selectField(panel, 'target', t('Open link in...'), [['', t('Current window')], ['_blank', t('New window')]],
      link?.attrs.target === '_blank' ? '_blank' : '');
    return { label: t('Link'), panel };
  }

  /** The Upload tab: a chosen or dropped file is uploaded at once, and fills Source. */
  private uploadTab(): Tab {
    const t = this.options.trans;
    const panel = document.createElement('div');
    const wrap = document.createElement('div');
    wrap.className = 'md-image-dialog-upload';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      // Cleared, so the same file can be chosen again after a failure.
      input.value = '';
      if (file) void this.upload(file);
    });

    const zone = document.createElement('div');
    zone.className = 'md-image-dialog-dropzone';
    const text = document.createElement('div');
    text.className = 'md-image-dialog-dropzone-text';
    text.textContent = t('Drop image here or click to browse');
    const browse = document.createElement('button');
    browse.type = 'button';
    browse.className = 'md-btn md-btn-primary md-image-dialog-browse';
    browse.textContent = t('Browse...');
    browse.addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('md-image-dialog-dropzone-active');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('md-image-dialog-dropzone-active'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('md-image-dialog-dropzone-active');
      const file = (e as DragEvent).dataTransfer?.files?.[0];
      if (file) void this.upload(file);
    });
    zone.append(text, browse);

    const progress = document.createElement('div');
    progress.className = 'md-image-dialog-progress';
    progress.hidden = true;
    progress.innerHTML = '<div class="md-image-dialog-progress-bar"><div class="md-image-dialog-progress-fill"></div></div>'
      + '<span class="md-image-dialog-progress-text"></span>';
    this.progressEl = progress;

    const error = document.createElement('div');
    error.className = 'md-image-dialog-upload-error';
    error.setAttribute('role', 'alert');
    this.uploadErrorEl = error;

    wrap.append(input, zone, progress, error);
    panel.appendChild(wrap);
    return { label: t('Upload'), panel };
  }

  private uploadError(message: string): void {
    if (this.uploadErrorEl) this.uploadErrorEl.textContent = message;
  }

  private showProgress(percent: number | null): void {
    if (!this.progressEl) return;
    this.progressEl.hidden = percent === null;
    const fill = this.progressEl.querySelector<HTMLElement>('.md-image-dialog-progress-fill');
    const text = this.progressEl.querySelector<HTMLElement>('.md-image-dialog-progress-text');
    if (fill) fill.style.width = `${percent ?? 0}%`;
    if (text) text.textContent = percent === null ? '' : `${percent}%`;
  }

  /** While a file uploads, Save waits and the dialog says it is busy. */
  private setUploading(on: boolean): void {
    this.uploading = on;
    if (on) this.dialog?.setAttribute('aria-busy', 'true');
    else this.dialog?.removeAttribute('aria-busy');
    this.showProgress(on ? 0 : null);
    this.refresh();
  }

  private async upload(file: File): Promise<void> {
    const { uploader, trans: t } = this.options;
    if (!uploader || !this.overlay) return;
    this.uploadError('');
    const refusal = uploader.validateFile(file);
    if (refusal) {
      this.uploadError(refusal);
      return;
    }
    const request = ++this.request;
    this.setUploading(true);
    let url: string;
    try {
      url = await uploader.uploadFile(file, (percent) => {
        if (request === this.request) this.showProgress(percent);
      });
    } catch (err) {
      if (request !== this.request) return;
      this.setUploading(false);
      this.uploadError(err instanceof Error && err.message ? err.message : t('Upload failed'));
      return;
    }
    // Closed, or opened again, or another file chosen, while this one uploaded.
    if (request !== this.request) return;
    this.setUploading(false);
    const src = imageSource(url);
    const field = this.fields.get('src');
    if (!src || !field) {
      this.uploadError(t('Invalid image URL'));
      return;
    }
    field.value = src;
    this.uploadError('');
    this.refresh();
    this.selectTab(0);
    // The Upload tab, and the button that had focus, are hidden now.
    field.focus();
  }

  /**
   * The preview: the image set in sample text, so its size, float, spacing and
   * border show as they would in a message. The image also gives its own size
   * once loaded, for Constrain proportions and Reset size. It is hidden from
   * assistive technology, which has the fields themselves.
   */
  private previewBox(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'md-image-dialog-preview';
    const text = document.createElement('div');
    text.className = 'md-image-dialog-preview-text';
    text.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.alt = '';
    img.addEventListener('load', () => {
      this.natural = img.naturalWidth > 0 && img.naturalHeight > 0
        ? { width: img.naturalWidth, height: img.naturalHeight }
        : null;
      // The picture's own shape, unless the image already has a size, whose
      // shape (stretched, perhaps) is the one to keep.
      if (this.natural && (this.ratio === null || this.ratioFromPicture)) {
        this.ratio = this.natural.width / this.natural.height;
        this.ratioFromPicture = true;
      }
      if (this.previewError) this.previewError.hidden = true;
    });
    img.addEventListener('error', () => {
      this.natural = null;
      // An image's own address may not load here (a cid: one, say) and still
      // be right where the content is shown; only a new address is questioned.
      if (this.previewError) this.previewError.hidden = !!this.target && !this.changed('src');
    });
    text.append(img, PREVIEW_TEXT);
    const error = document.createElement('div');
    error.className = 'md-image-dialog-preview-error';
    error.textContent = this.options.trans('Invalid image URL');
    error.hidden = true;
    box.append(error, text);
    this.preview = img;
    this.previewError = error;
    return box;
  }

  private build(): void {
    const { trans: t, editor } = this.options;
    const id = `md-image-dialog-${++dialogCounter}`;
    this.id = id;
    const editing = !!this.target;

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
        // The dialog's, not the page's: a host's own Escape handler must not act too.
        e.preventDefault();
        e.stopPropagation();
        this.close(true);
      } else if (e.key === 'Enter' && !e.isComposing && e.target instanceof HTMLInputElement && this.dialog?.contains(e.target)) {
        e.preventDefault();
        this.save();
      } else if (e.key === 'Tab') {
        this.trapTab(e);
      }
    };
    document.addEventListener('keydown', onKey, true);
    this.stopKeys = () => document.removeEventListener('keydown', onKey, true);

    const dialog = document.createElement('div');
    this.dialog = dialog;
    dialog.className = 'md-dialog md-image-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', `${id}-title`);

    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    const title = document.createElement('h3');
    title.id = `${id}-title`;
    title.textContent = t(editing ? 'Image properties' : 'Insert image');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'md-dialog-close';
    closeButton.setAttribute('aria-label', t('Cancel'));
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.close(true));
    header.append(title, closeButton);

    const body = document.createElement('div');
    body.className = 'md-dialog-body';
    const tabs = [this.generalTab(), this.linkTab()];
    if (this.options.uploader && editor.getConfig().image_uploadtab !== false) tabs.push(this.uploadTab());
    if (editor.getConfig().image_advtab) tabs.push(this.advancedTab());
    this.addTabs(body, tabs);

    const footer = document.createElement('div');
    footer.className = 'md-image-dialog-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'md-btn md-image-dialog-cancel';
    cancel.textContent = t('Cancel');
    cancel.addEventListener('click', () => this.close(true));
    this.saveButton = document.createElement('button');
    this.saveButton.type = 'button';
    this.saveButton.className = 'md-btn md-btn-primary md-image-dialog-save';
    this.saveButton.textContent = t(editing ? 'Save' : 'Insert');
    this.saveButton.addEventListener('click', () => this.save());
    footer.append(cancel, this.saveButton);

    body.appendChild(footer);
    dialog.append(header, body);
    this.overlay.appendChild(createSkinHost(editor.getConfig().skin, dialog));
    document.body.appendChild(this.overlay);
    this.refresh();
  }

  /** The tabs' panels in `body`, with a tab list when there is more than one. */
  private addTabs(body: HTMLElement, tabs: Tab[]): void {
    const id = this.id;
    const buttons: HTMLButtonElement[] = [];
    const select = (index: number) => {
      buttons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      tabs.forEach((tab, i) => {
        tab.panel.hidden = i !== index;
      });
    };
    if (tabs.length > 1) {
      const list = document.createElement('div');
      list.className = 'md-image-dialog-tabs';
      list.setAttribute('role', 'tablist');
      tabs.forEach((tab, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'md-image-dialog-tab';
        button.id = `${id}-tab-${index}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `${id}-panel-${index}`);
        button.textContent = tab.label;
        button.addEventListener('click', () => select(index));
        buttons.push(button);
        list.appendChild(button);
      });
      body.appendChild(list);
    }
    tabs.forEach((tab, index) => {
      tab.panel.className = 'md-image-dialog-panel';
      tab.panel.id = `${id}-panel-${index}`;
      if (tabs.length > 1) {
        tab.panel.setAttribute('role', 'tabpanel');
        tab.panel.setAttribute('aria-labelledby', `${id}-tab-${index}`);
      }
      body.appendChild(tab.panel);
    });
    select(0);
    this.selectTab = select;
    // The tabs pattern: one tab stop for the list, the arrow keys (and Home,
    // End) move between the tabs, selecting each.
    const move: Record<string, (i: number) => number> = {
      ArrowRight: (i) => (i + 1) % tabs.length,
      ArrowLeft: (i) => (i - 1 + tabs.length) % tabs.length,
      Home: () => 0,
      End: () => tabs.length - 1,
    };
    buttons.forEach((button, index) => {
      button.addEventListener('keydown', (e) => {
        const next = move[e.key]?.(index);
        if (next === undefined) return;
        e.preventDefault();
        select(next);
        buttons[next].focus();
      });
    });
  }
}
