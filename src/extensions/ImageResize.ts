/**
 * ImageResize Extension
 * Drag handles on the corners and sides of an image to resize it, like
 * TinyMCE's object_resizing. Corners keep the aspect ratio (resize_img_proportional),
 * sides stretch one dimension. The new size is stored in the image's width and
 * height attributes, so the output HTML is the same as TinyMCE's.
 */

import { getRenderedAttributes, mergeAttributes } from '@tiptap/core';
import type { Editor, ExtensionAttribute } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { NodeView } from '@tiptap/pm/view';
import { closeHistory } from '@tiptap/pm/history';
import { Image } from '@tiptap/extension-image';
import type { ImageOptions } from '@tiptap/extension-image';
import type { ImageResizeHandle, ObjectResizeCallback } from '../types';

export interface ImageResizeInput {
  handle: ImageResizeHandle;
  /** Rendered size of the image when the drag started. */
  startWidth: number;
  startHeight: number;
  /** Pointer movement since the drag started. */
  dx: number;
  dy: number;
  /** Keep the aspect ratio. Applies to corner handles only. */
  proportional: boolean;
  /** Widest the image may become (the editor's content width). */
  maxWidth?: number;
}

/** Smallest width or height a drag can produce. */
export const MIN_IMAGE_SIZE = 20;

const HANDLES: ImageResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** The size an image becomes when a handle is dragged by (dx, dy). */
export function computeImageResize(input: ImageResizeInput): { width: number; height: number } {
  const { handle, startWidth, startHeight, dx, dy, proportional, maxWidth } = input;

  // Dragging a left or top handle outwards means moving left or up.
  const xSign = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
  const ySign = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;

  let width = startWidth + xSign * dx;
  let height = startHeight + ySign * dy;

  if (proportional && xSign !== 0 && ySign !== 0) {
    // Scale by whichever axis moved further, so a corner dragged straight
    // down still resizes.
    const sx = width / startWidth;
    const sy = height / startHeight;
    let scale = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
    // The minimum wins over maxWidth when a space is narrower than it.
    if (maxWidth) scale = Math.min(scale, maxWidth / startWidth);
    scale = Math.max(scale, MIN_IMAGE_SIZE / startWidth, MIN_IMAGE_SIZE / startHeight);
    width = startWidth * scale;
    height = startHeight * scale;
  } else {
    if (maxWidth) width = Math.min(width, maxWidth);
    width = Math.max(width, MIN_IMAGE_SIZE);
    height = Math.max(height, MIN_IMAGE_SIZE);
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/** Whether object_resizing can allow any image at all: not false, and not an empty selector. */
export function isObjectResizingOn(objectResizing: boolean | string | undefined): boolean {
  return typeof objectResizing === 'string' ? objectResizing.trim() !== '' : objectResizing !== false;
}

/**
 * Whether TinyMCE's object_resizing value lets this image be resized: true, or
 * a CSS selector that matches the image. An invalid selector matches nothing.
 */
export function isImageResizable(image: Element, objectResizing: boolean | string | undefined): boolean {
  if (!isObjectResizingOn(objectResizing)) return false;
  if (typeof objectResizing !== 'string') return true;
  try {
    return image.matches(objectResizing);
  } catch {
    return false;
  }
}

/** A width/height attribute as a pixel number, or null for '50%', 'auto' and the like. */
function toPixels(value: unknown): number | null {
  if (typeof value === 'number') return value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const match = /^\s*(\d+(?:\.\d+)?)\s*(?:px)?\s*$/i.exec(value);
  return match && Number(match[1]) > 0 ? Number(match[1]) : null;
}

export interface ResizableImageOptions extends ImageOptions {
  /** TinyMCE's object_resizing: true, false, or a CSS selector each image is matched against. */
  objectResizing: boolean | string;
  /** Corner handles keep the aspect ratio; Shift inverts it for one drag. */
  proportional: boolean;
  onResizeStart?: ObjectResizeCallback;
  onResized?: ObjectResizeCallback;
}

interface DragState {
  handle: ImageResizeHandle;
  /** The pointer that started the drag; others are ignored. Undefined for synthetic events. */
  pointerId?: number;
  startX: number;
  startY: number;
  /** Rendered size at the start, unrounded so the aspect ratio is exact. */
  startWidth: number;
  startHeight: number;
  maxWidth?: number;
  width: number;
  height: number;
}

class ImageResizeView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private label: HTMLElement;
  private handles: HTMLElement[] = [];
  /** The node's rendered HTML attributes, as last applied. */
  private attrs: Record<string, unknown> = {};
  private node: PMNode;
  private readonly attributes: ExtensionAttribute[];
  private drag: DragState | null = null;

  constructor(
    node: PMNode,
    private readonly editor: Editor,
    private readonly getPos: () => number | undefined,
    private readonly options: ResizableImageOptions
  ) {
    this.node = node;
    this.attributes = editor.extensionManager.attributes.filter((a) => a.type === node.type.name);

    this.dom = document.createElement('span');
    this.dom.className = 'md-image-resize';

    this.img = document.createElement('img');
    this.dom.appendChild(this.img);

    this.label = document.createElement('span');
    this.label.className = 'md-image-resize-size';
    this.label.setAttribute('aria-hidden', 'true');
    this.dom.appendChild(this.label);

    this.render();
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render();
    return true;
  }

  /** Keep ProseMirror out of handle presses, and stop a move-drag during a resize. */
  stopEvent(event: Event): boolean {
    if (event.type === 'dragstart' && this.drag) {
      event.preventDefault();
      return true;
    }
    return event.target instanceof Element && event.target.classList.contains('md-image-resize-handle');
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    if (this.drag) this.endDrag();
  }

  /** Copy the node's rendered attributes onto the img, as renderHTML would. */
  private render(): void {
    const attrs = mergeAttributes(
      this.options.HTMLAttributes,
      getRenderedAttributes(this.node, this.attributes)
    );

    // style belongs to this view (aspect ratio, drag preview), not the node.
    for (const name of this.img.getAttributeNames()) {
      if (name !== 'style' && attrs[name] == null) this.img.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(attrs)) {
      // Setting src again, even to the same value, makes the browser reload
      // the image; a pasted image's data: URI can be megabytes.
      if (value != null && this.img.getAttribute(name) !== String(value)) {
        this.img.setAttribute(name, String(value));
      }
    }

    this.attrs = attrs;

    // A selector can depend on the image's attributes, so check it each time.
    // It can also name ancestors, which only match once ProseMirror has put
    // the view in the page (right after the constructor returns).
    this.refreshResizable();
    if (!this.dom.isConnected) queueMicrotask(() => this.refreshResizable());
  }

  private refreshResizable(): void {
    this.setResizable(isImageResizable(this.img, this.options.objectResizing));
    // A drag owns the inline sizes until it ends.
    if (!this.drag) this.layOut();
  }

  /**
   * Size the wrapper and img from the attributes. An image that can't be
   * resized gets none of this, so it looks as a plain img does.
   */
  private layOut(): void {
    const resizable = this.handles.length > 0;
    const attrs = this.attrs;
    this.dom.classList.toggle('md-image-resizable', resizable);

    // The editor's CSS caps images at max-width: 100% with height: auto, which
    // would ignore the height attribute. An aspect ratio from the attributes
    // keeps a stretched image stretched, and scales it without distortion
    // when the cap applies.
    const width = toPixels(attrs.width);
    const height = toPixels(attrs.height);
    this.img.style.aspectRatio = resizable && width && height ? `${width} / ${height}` : '';

    // The resizable wrapper shrinks to fit the image, so a percentage width on
    // the img would be a percentage of the image itself. Put it on the wrapper,
    // where it is relative to the editor as before.
    const percent = resizable && typeof attrs.width === 'string' && attrs.width.trim().endsWith('%')
      ? attrs.width.trim()
      : '';
    this.dom.style.width = percent;
    this.img.style.width = percent ? '100%' : '';
    this.img.style.height = '';
  }

  private setResizable(resizable: boolean): void {
    if (resizable === this.handles.length > 0) return;

    if (!resizable) {
      if (this.drag) this.endDrag();
      this.handles.forEach((el) => el.remove());
      this.handles = [];
      return;
    }

    for (const handle of HANDLES) {
      const el = document.createElement('span');
      el.className = 'md-image-resize-handle';
      el.dataset.handle = handle;
      el.setAttribute('aria-hidden', 'true');
      el.addEventListener('pointerdown', (e) => this.onPointerDown(e, handle));
      // The wrapper is draggable (to move the image); a press on a handle must
      // not start that drag or a text selection.
      el.addEventListener('mousedown', (e) => e.preventDefault());
      this.dom.appendChild(el);
      this.handles.push(el);
    }
  }

  private onPointerDown(event: PointerEvent, handle: ImageResizeHandle): void {
    if (!this.editor.isEditable || this.drag || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = this.img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // preventDefault keeps the browser from focusing the editor, so do it
    // here; otherwise Delete or Ctrl+Z after the resize would go nowhere.
    this.editor.view.focus();
    const pos = this.getPos();
    if (pos !== undefined) this.editor.commands.setNodeSelection(pos);

    this.drag = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      maxWidth: this.availableWidth(),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    // Touch and pen keep sending moves to the handle even off the image.
    const target = event.currentTarget as HTMLElement | null;
    if (event.pointerId !== undefined) {
      try {
        target?.setPointerCapture?.(event.pointerId);
      } catch {
        // No active pointer with that id (synthetic events); document listeners still work.
      }
    }

    const doc = this.dom.ownerDocument;
    doc.addEventListener('pointermove', this.onPointerMove);
    doc.addEventListener('pointerup', this.onPointerUp);
    doc.addEventListener('pointercancel', this.onCancel);
    // Capture phase, so the Escape that cancels a resize is handled before
    // (and kept from) the host page's own Escape handlers.
    doc.addEventListener('keydown', this.onKeyDown, true);

    // The wrapper follows the pixel preview, not a percentage width.
    this.dom.style.width = '';
    this.dom.classList.add('md-image-resize-active');
    this.options.onResizeStart?.({
      target: this.img,
      width: this.drag.width,
      height: this.drag.height,
      handle,
    });
  }

  /** Whether a pointer event comes from the pointer that started the drag. */
  private isDragPointer(event: PointerEvent): boolean {
    return this.drag?.pointerId === undefined || event.pointerId === this.drag.pointerId;
  }

  private onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || !this.isDragPointer(event)) return;

    const { width, height } = computeImageResize({
      handle: drag.handle,
      startWidth: drag.startWidth,
      startHeight: drag.startHeight,
      dx: event.clientX - drag.startX,
      dy: event.clientY - drag.startY,
      proportional: this.options.proportional !== event.shiftKey,
      maxWidth: drag.maxWidth,
    });
    drag.width = width;
    drag.height = height;

    this.img.style.width = `${width}px`;
    this.img.style.height = `${height}px`;
    this.label.textContent = `${width} × ${height}`;
  };

  private onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || !this.isDragPointer(event)) return;
    this.endDrag();

    if (drag.width === Math.round(drag.startWidth) && drag.height === Math.round(drag.startHeight)) return;
    // The editor may have been made read-only during the drag.
    if (!this.editor.isEditable) return;

    const pos = this.getPos();
    if (pos === undefined) return;
    // One transaction in its own history group, so one undo step that does
    // not also undo an edit made just before the resize.
    this.editor
      .chain()
      .command(({ tr }) => {
        closeHistory(tr);
        return true;
      })
      .setNodeSelection(pos)
      .updateAttributes(this.node.type.name, { width: drag.width, height: drag.height })
      .run();

    // run() reports whether the commands could run, not whether a plugin let
    // the transaction through; update() has stored the node if it did.
    const { width, height } = this.node.attrs;
    if (Number(width) !== drag.width || Number(height) !== drag.height) return;
    // Close the group after it too: the image stays selected, and typing that
    // replaces it would otherwise merge into the resize's undo step.
    this.editor.view.dispatch(closeHistory(this.editor.state.tr));

    this.options.onResized?.({
      target: this.img,
      width: drag.width,
      height: drag.height,
      handle: drag.handle,
    });
  };

  private onCancel = (event: PointerEvent): void => {
    if (this.drag && this.isDragPointer(event)) this.endDrag();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.drag) {
      event.preventDefault();
      event.stopPropagation();
      this.endDrag();
    }
  };

  /** Stop listening and remove the preview; the node's attributes are untouched. */
  private endDrag(): void {
    this.drag = null;
    const doc = this.dom.ownerDocument;
    doc.removeEventListener('pointermove', this.onPointerMove);
    doc.removeEventListener('pointerup', this.onPointerUp);
    doc.removeEventListener('pointercancel', this.onCancel);
    doc.removeEventListener('keydown', this.onKeyDown, true);

    this.layOut();
    this.label.textContent = '';
    this.dom.classList.remove('md-image-resize-active');
  }

  /** Content width of the block the image sits in (the editor, or a table cell). */
  private availableWidth(): number | undefined {
    const parent = this.dom.parentElement;
    if (!parent) return undefined;
    const style = parent.ownerDocument.defaultView?.getComputedStyle(parent);
    const padding = style ? (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0) : 0;
    const width = parent.clientWidth - padding;
    return width > 0 ? width : undefined;
  }
}

/**
 * The Image node with resize handles. Same name, schema, commands and HTML as
 * Image; only the editing view differs.
 */
export const ResizableImage = Image.extend<ResizableImageOptions>({
  addOptions() {
    return {
      ...(this.parent?.() as ImageOptions),
      objectResizing: true,
      proportional: true,
      onResizeStart: undefined,
      onResized: undefined,
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => new ImageResizeView(node, editor, getPos, this.options);
  },
});
