/**
 * Image resizing tests: the size math, then the node view and drag handling
 * inside a full HTMLEditor.
 */

import { computeImageResize } from '../../src/extensions/ImageResize';
import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';
import { Plugin } from '@tiptap/pm/state';

describe('computeImageResize', () => {
  const start = { startWidth: 200, startHeight: 100 };

  it('changes only the width for a side handle', () => {
    expect(computeImageResize({ ...start, handle: 'e', dx: 50, dy: 30, proportional: true }))
      .toEqual({ width: 250, height: 100 });
  });

  it('changes only the height for a top or bottom handle', () => {
    expect(computeImageResize({ ...start, handle: 's', dx: 40, dy: 20, proportional: true }))
      .toEqual({ width: 200, height: 120 });
  });

  it('keeps the aspect ratio for a corner handle when proportional', () => {
    expect(computeImageResize({ ...start, handle: 'se', dx: 100, dy: 0, proportional: true }))
      .toEqual({ width: 300, height: 150 });
  });

  it('follows whichever axis moved further for a proportional corner', () => {
    // Dragging straight down still grows the image.
    expect(computeImageResize({ ...start, handle: 'se', dx: 0, dy: 50, proportional: true }))
      .toEqual({ width: 300, height: 150 });
  });

  it('stretches freely for a corner handle when not proportional', () => {
    expect(computeImageResize({ ...start, handle: 'se', dx: 100, dy: 10, proportional: false }))
      .toEqual({ width: 300, height: 110 });
  });

  it('reverses the movement for the left and top handles', () => {
    expect(computeImageResize({ ...start, handle: 'w', dx: -50, dy: 0, proportional: false }))
      .toEqual({ width: 250, height: 100 });
    expect(computeImageResize({ ...start, handle: 'n', dx: 0, dy: -20, proportional: false }))
      .toEqual({ width: 200, height: 120 });
    expect(computeImageResize({ ...start, handle: 'nw', dx: 20, dy: 20, proportional: false }))
      .toEqual({ width: 180, height: 80 });
  });

  it('does not go below 20px on either side', () => {
    expect(computeImageResize({ ...start, handle: 'se', dx: -500, dy: -500, proportional: false }))
      .toEqual({ width: 20, height: 20 });
  });

  it('keeps the aspect ratio when a proportional corner hits the minimum', () => {
    expect(computeImageResize({ ...start, handle: 'se', dx: -500, dy: 0, proportional: true }))
      .toEqual({ width: 40, height: 20 });
  });

  it('does not go wider than maxWidth', () => {
    expect(computeImageResize({ ...start, handle: 'e', dx: 900, dy: 0, proportional: false, maxWidth: 400 }))
      .toEqual({ width: 400, height: 100 });
  });

  it('keeps the aspect ratio when a proportional corner hits maxWidth', () => {
    expect(computeImageResize({ ...start, handle: 'se', dx: 900, dy: 0, proportional: true, maxWidth: 400 }))
      .toEqual({ width: 400, height: 200 });
  });

  it('never goes below 20px, even when maxWidth is narrower', () => {
    const tall = { startWidth: 50, startHeight: 400, maxWidth: 10 };
    expect(computeImageResize({ ...tall, handle: 'se', dx: 0, dy: 0, proportional: true }))
      .toEqual({ width: 20, height: 160 });
    expect(computeImageResize({ ...tall, handle: 'e', dx: 0, dy: 0, proportional: false }))
      .toEqual({ width: 20, height: 400 });
  });

  it('rounds to whole pixels', () => {
    expect(computeImageResize({ startWidth: 300, startHeight: 200, handle: 'se', dx: 1, dy: 0, proportional: true }))
      .toEqual({ width: 301, height: 201 });
  });
});

// ---------------------------------------------------------------------------
// Inside a full HTMLEditor
// ---------------------------------------------------------------------------

const IMG = '<img src="https://example.com/a.png" alt="A" width="200" height="100">';

let container: HTMLElement;
let editor: HTMLEditor;

const view = () => editor.getTipTap()!.view.dom as HTMLElement;
const img = () => view().querySelector('img') as HTMLImageElement;
const wrapper = () => view().querySelector('.md-image-resize') as HTMLElement;
const handle = (name: string) => view().querySelector(`[data-handle="${name}"]`) as HTMLElement;

/** jsdom has no layout: give the image a rendered size. */
function layOut(width = 200, height = 100): void {
  jest.spyOn(img(), 'getBoundingClientRect').mockReturnValue({
    width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
}

/** A clean editor holding `content`, with the image laid out at 200 × 100. */
function make(config: EditorConfig = {}, content = IMG): HTMLEditor {
  editor = new HTMLEditor(container, config);
  editor.setContent(content);
  editor.setDirty(false);
  layOut();
  return editor;
}

// jsdom has no PointerEvent; a MouseEvent with a pointer* type carries the same
// fields, plus pointerId when one is given.
const pointer = (type: string, init: MouseEventInit & { pointerId?: number } = {}) => {
  const { pointerId, ...mouse } = init;
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...mouse });
  if (pointerId !== undefined) Object.defineProperty(event, 'pointerId', { value: pointerId });
  return event;
};
const escape = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });

function drag(name: string, dx: number, dy: number, init: MouseEventInit = {}): void {
  handle(name).dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
  document.dispatchEvent(pointer('pointermove', { clientX: dx, clientY: dy, ...init }));
  document.dispatchEvent(pointer('pointerup', { clientX: dx, clientY: dy, ...init }));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  editor?.destroy();
  container?.remove();
  jest.restoreAllMocks();
});

describe('Image resize node view', () => {
  it('wraps the image with eight hidden-from-assistive-tech handles', () => {
    make();
    expect(wrapper()).not.toBeNull();
    expect(wrapper().contains(img())).toBe(true);

    const handles = Array.from(wrapper().querySelectorAll<HTMLElement>('.md-image-resize-handle'));
    expect(handles.map((h) => h.dataset.handle).sort()).toEqual(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w']);
    handles.forEach((h) => expect(h.getAttribute('aria-hidden')).toBe('true'));
  });

  it('keeps the image attributes on the img element', () => {
    make();
    expect(img()).toHaveClass('md-editor-image');
    expect(img().getAttribute('src')).toBe('https://example.com/a.png');
    expect(img().getAttribute('alt')).toBe('A');
    expect(img().getAttribute('width')).toBe('200');
    expect(img().getAttribute('height')).toBe('100');
  });

  it('sets the aspect ratio from numeric width and height so a capped image is not distorted', () => {
    make();
    expect(img().style.aspectRatio).toBe('200 / 100');
  });

  it('sets no aspect ratio for a percentage width', () => {
    make({}, '<img src="https://example.com/a.png" width="50%" height="100">');
    expect(img().style.aspectRatio).toBe('');
    expect(img().getAttribute('width')).toBe('50%');
  });

  it('keeps a percentage width relative to the editor, not the wrapper', () => {
    make({}, '<img src="https://example.com/a.png" width="50%">');
    expect(wrapper().style.width).toBe('50%');
    expect(img().style.width).toBe('100%');

    // While dragging, the wrapper follows the pixel preview.
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    expect(wrapper().style.width).toBe('');
    expect(img().style.width).toBe('250px');

    document.dispatchEvent(pointer('pointerup', { clientX: 50 }));
    expect(editor.getContent()).toContain('width="250"');
    expect(wrapper().style.width).toBe('');
    expect(img().style.width).toBe('');
  });

  it('puts a cancelled percentage-width image back to its percentage', () => {
    make({}, '<img src="https://example.com/a.png" width="50%">');
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    document.dispatchEvent(escape());
    expect(wrapper().style.width).toBe('50%');
    expect(img().style.width).toBe('100%');
  });

  it('marks a resizable image with md-image-resizable', () => {
    make();
    expect(wrapper()).toHaveClass('md-image-resizable');
  });

  it('keeps the wrapper and handles out of getContent()', () => {
    make();
    const html = editor.getContent();
    expect(html).not.toContain('md-image-resize');
    expect(html).not.toContain('aspect-ratio');
    expect(html).toContain('width="200"');
    expect(html).toContain('height="100"');
  });

  it('updates the img when the image attributes change', () => {
    make();
    editor.getTipTap()!.chain().setNodeSelection(0).updateAttributes('image', { width: 120, height: 90, alt: 'B' }).run();
    expect(img().getAttribute('width')).toBe('120');
    expect(img().getAttribute('height')).toBe('90');
    expect(img().getAttribute('alt')).toBe('B');
    expect(img().style.aspectRatio).toBe('120 / 90');
  });

  it('does not set an unchanged src again, so the image is not reloaded', () => {
    make();
    const setAttribute = jest.spyOn(img(), 'setAttribute');
    editor.getTipTap()!.chain().setNodeSelection(0).updateAttributes('image', { width: 120, height: 90 }).run();
    expect(setAttribute).toHaveBeenCalledWith('width', '120');
    expect(setAttribute).not.toHaveBeenCalledWith('src', expect.anything());
  });
});

describe('Image resize dragging', () => {
  it('saves the new size when a corner is dragged, keeping the aspect ratio', () => {
    make();
    drag('se', 100, 0);
    expect(editor.getContent()).toContain('width="300"');
    expect(editor.getContent()).toContain('height="150"');
  });

  it('stretches one dimension when a side is dragged', () => {
    make();
    drag('e', 100, 40);
    expect(editor.getContent()).toContain('width="300"');
    expect(editor.getContent()).toContain('height="100"');
  });

  it('lets Shift stretch a corner freely', () => {
    make();
    drag('se', 100, 10, { shiftKey: true });
    expect(editor.getContent()).toContain('width="300"');
    expect(editor.getContent()).toContain('height="110"');
  });

  it('stretches corners freely with resize_img_proportional: false', () => {
    make({ resize_img_proportional: false });
    drag('se', 100, 10);
    expect(editor.getContent()).toContain('height="110"');
  });

  it('keeps proportions on a Shift-dragged corner with resize_img_proportional: false', () => {
    make({ resize_img_proportional: false });
    drag('se', 100, 10, { shiftKey: true });
    expect(editor.getContent()).toContain('height="150"');
  });

  it('previews the size while dragging and clears the preview when done', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));

    expect(wrapper()).toHaveClass('md-image-resize-active');
    expect(img().style.width).toBe('250px');
    expect(img().style.height).toBe('125px');
    expect(wrapper().querySelector('.md-image-resize-size')?.textContent).toBe('250 × 125');

    document.dispatchEvent(pointer('pointerup', { clientX: 50 }));
    expect(wrapper()).not.toHaveClass('md-image-resize-active');
    expect(img().style.width).toBe('');
    expect(img().style.height).toBe('');
    expect(img().style.aspectRatio).toBe('250 / 125');
  });

  it('keeps the image selected after a resize', () => {
    make();
    drag('se', 100, 0);
    const { selection } = editor.getTipTap()!.state;
    expect((selection as unknown as { node?: { type: { name: string } } }).node?.type.name).toBe('image');
  });

  it('is undone in one step that does not also undo the change before it', () => {
    make();
    drag('se', 100, 0);
    editor.execCommand('Undo');
    expect(editor.getContent()).toContain('width="200"');
    expect(editor.getContent()).toContain('height="100"');
  });

  it('keeps typing done right after a resize in its own undo step', () => {
    make({}, `${IMG}<p>text</p>`);
    drag('se', 100, 0);
    const tt = editor.getTipTap()!;
    tt.commands.insertContentAt(tt.state.doc.content.size - 1, 'X');
    expect(editor.getContent()).toContain('textX');

    editor.execCommand('Undo');
    expect(editor.getContent()).not.toContain('textX');
    expect(editor.getContent()).toContain('width="300"');
  });

  it('keeps typing that replaces the just-resized image in its own undo step', () => {
    make({}, `${IMG}<p>text</p>`);
    drag('se', 100, 0);
    // The image is still selected, so typing replaces it.
    editor.getTipTap()!.commands.insertContent('X');
    expect(editor.getContent()).not.toContain('<img');

    editor.execCommand('Undo');
    expect(editor.getContent()).toContain('width="300"');
  });

  it('keeps the preview when the image re-renders during a drag', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    editor.getTipTap()!.chain().setNodeSelection(0).updateAttributes('image', { alt: 'B' }).run();
    expect(img().style.width).toBe('250px');
    expect(img().style.height).toBe('125px');
    document.dispatchEvent(pointer('pointerup', { clientX: 50 }));
    expect(editor.getContent()).toContain('width="250"');
  });

  it('focuses the editor when a resize starts, so the keyboard works afterwards', () => {
    make();
    const focus = jest.spyOn(editor.getTipTap()!.view, 'focus');
    handle('se').dispatchEvent(pointer('pointerdown'));
    expect(focus).toHaveBeenCalled();
    document.dispatchEvent(pointer('pointerup'));
  });

  it('marks the editor dirty and fires change', async () => {
    make();
    await wait(30);
    const onChange = jest.fn();
    editor.on('change', onChange);

    drag('se', 100, 0);
    expect(editor.isDirty()).toBe(true);
    await wait(30);
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('width="300"'));
  });

  it('puts the image back when Escape is pressed during a drag', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    document.dispatchEvent(escape());
    document.dispatchEvent(pointer('pointerup', { clientX: 50 }));

    expect(editor.getContent()).toContain('width="200"');
    expect(editor.isDirty()).toBe(false);
    expect(img().style.width).toBe('');
    expect(wrapper()).not.toHaveClass('md-image-resize-active');
  });

  it('puts the image back when the pointer is cancelled', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    document.dispatchEvent(pointer('pointercancel'));

    expect(editor.getContent()).toContain('width="200"');
    expect(editor.isDirty()).toBe(false);
  });

  it('changes nothing for a click without a drag', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointerup'));
    expect(editor.isDirty()).toBe(false);
  });

  it('does not resize in read-only mode', () => {
    make();
    editor.setReadOnly(true);
    // setReadOnly() itself marks the editor dirty; only the drag is under test.
    editor.setDirty(false);
    drag('se', 100, 0);
    expect(editor.getContent()).toContain('width="200"');
    expect(editor.isDirty()).toBe(false);
  });

  it('does not grow wider than the space the image sits in', () => {
    make();
    jest.spyOn(view(), 'clientWidth', 'get').mockReturnValue(320);
    drag('e', 500, 0);
    expect(editor.getContent()).toContain('width="320"');
  });

  it('keeps the shape of an image whose rendered size is fractional', () => {
    make({}, '<img src="https://example.com/a.png" width="1200" height="800">');
    layOut(601.5, 401); // 1200 × 800 scaled down by max-width
    drag('se', 298.5, 0);
    expect(editor.getContent()).toContain('width="900"');
    expect(editor.getContent()).toContain('height="600"');
  });

  it('ignores a second pointer during a drag', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown', { pointerId: 1 }));
    document.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 50 }));
    document.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 400 }));
    expect(img().style.width).toBe('250px');

    document.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 400 }));
    expect(wrapper()).toHaveClass('md-image-resize-active');
    expect(editor.isDirty()).toBe(false);

    document.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 50 }));
    expect(editor.getContent()).toContain('width="250"');
  });

  it('does not save a drag that ends after the editor became read-only', () => {
    make();
    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 50 }));
    editor.setReadOnly(true);
    editor.setDirty(false);
    document.dispatchEvent(pointer('pointerup', { clientX: 50 }));

    expect(editor.getContent()).toContain('width="200"');
    expect(editor.isDirty()).toBe(false);
    expect(wrapper()).not.toHaveClass('md-image-resize-active');
  });

  it('keeps the Escape that cancels a drag from reaching the host page', () => {
    make();
    const hostOnDocument = jest.fn();
    const hostOnWindow = jest.fn();
    document.addEventListener('keydown', hostOnDocument);
    window.addEventListener('keydown', hostOnWindow);
    try {
      handle('se').dispatchEvent(pointer('pointerdown'));
      document.body.dispatchEvent(escape());
      expect(hostOnDocument).not.toHaveBeenCalled();
      expect(hostOnWindow).not.toHaveBeenCalled();

      // Without a drag, Escape goes through as usual.
      document.body.dispatchEvent(escape());
      expect(hostOnDocument).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', hostOnDocument);
      window.removeEventListener('keydown', hostOnWindow);
    }
  });

  it('stops the handle mousedown from selecting text or starting a drag', () => {
    make();
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    handle('se').dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });
});

describe('objectresizestart and objectresized events', () => {
  it('fires objectresizestart with the starting size and objectresized with the new size', () => {
    make();
    const start = jest.fn();
    const resized = jest.fn();
    editor.on('objectresizestart', start);
    editor.on('objectresized', resized);

    handle('ne').dispatchEvent(pointer('pointerdown'));
    expect(start).toHaveBeenCalledWith({ target: img(), width: 200, height: 100, handle: 'ne' });
    expect(resized).not.toHaveBeenCalled();

    document.dispatchEvent(pointer('pointermove', { clientX: 100 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 100 }));
    expect(resized).toHaveBeenCalledTimes(1);
    expect(resized).toHaveBeenCalledWith({ target: img(), width: 300, height: 150, handle: 'ne' });
  });

  it('does not fire objectresized when the resize could not be applied', () => {
    make();
    // A plugin that blocks every document change.
    editor.getTipTap()!.registerPlugin(new Plugin({ filterTransaction: (tr) => !tr.docChanged }));
    const resized = jest.fn();
    editor.on('objectresized', resized);

    drag('se', 100, 0);
    expect(editor.getContent()).toContain('width="200"');
    expect(resized).not.toHaveBeenCalled();
  });

  it('does not fire objectresized for a cancelled drag', () => {
    make();
    const resized = jest.fn();
    editor.on('objectresized', resized);

    handle('se').dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 100 }));
    document.dispatchEvent(escape());
    document.dispatchEvent(pointer('pointerup', { clientX: 100 }));
    expect(resized).not.toHaveBeenCalled();
  });
});

describe('object_resizing', () => {
  const handleCount = (image: Element) =>
    image.parentElement?.querySelectorAll('.md-image-resize-handle').length ?? 0;

  /** Whether the (first) image has handles and can be resized by a drag. */
  const resizable = (config: EditorConfig): boolean => {
    make(config);
    if (handleCount(img()) === 0) return false;
    drag('e', 100, 0);
    return editor.getContent().includes('width="300"');
  };

  it('is on by default', () => {
    expect(resizable({})).toBe(true);
  });

  it('is off with false, leaving the image as a plain img', () => {
    expect(resizable({ object_resizing: false })).toBe(false);
    expect(wrapper()).toBeNull();
    expect(img().style.aspectRatio).toBe('');
    expect(editor.getContent()).toContain('width="200"');
  });

  it('is off with an empty selector, leaving the image as a plain img', () => {
    expect(resizable({ object_resizing: '' })).toBe(false);
    expect(wrapper()).toBeNull();
  });

  it('is on with a selector that matches img', () => {
    expect(resizable({ object_resizing: 'img' })).toBe(true);
  });

  it("is on with TinyMCE's default selector list", () => {
    expect(resizable({ object_resizing: 'table,img,figure.image,div,video,iframe' })).toBe(true);
  });

  it('is off with a selector that does not match img, leaving the image looking as before', () => {
    expect(resizable({ object_resizing: 'table' })).toBe(false);
    expect(wrapper()).not.toHaveClass('md-image-resizable');
    expect(img().style.aspectRatio).toBe('');
    expect(wrapper().style.width).toBe('');
  });

  it('is off with an invalid selector', () => {
    expect(resizable({ object_resizing: '[[' })).toBe(false);
  });

  it('matches the selector against each image', () => {
    make(
      { object_resizing: 'img[alt]' },
      '<img src="https://example.com/a.png" alt="A" width="200" height="100">' +
      '<img src="https://example.com/b.png" width="200" height="100">'
    );
    const [withAlt, withoutAlt] = Array.from(view().querySelectorAll('img'));
    expect(handleCount(withAlt)).toBe(8);
    expect(handleCount(withoutAlt)).toBe(0);
  });

  it('matches a selector that names the image\'s ancestors', async () => {
    make({ object_resizing: '.md-editor-body img' });
    // The node view is built before ProseMirror puts it in the page.
    await Promise.resolve();
    expect(handleCount(img())).toBe(8);
  });

  it('checks the selector again when the image attributes change', () => {
    make({ object_resizing: 'img[alt]' }, '<img src="https://example.com/b.png" width="200" height="100">');
    expect(handleCount(img())).toBe(0);
    editor.getTipTap()!.chain().setNodeSelection(0).updateAttributes('image', { alt: 'B' }).run();
    expect(handleCount(img())).toBe(8);
  });
});
