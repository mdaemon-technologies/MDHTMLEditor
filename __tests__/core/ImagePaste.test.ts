/**
 * Pasting an image file: HTMLEditor uploads a pasted picture, but not one that
 * comes beside text, which the editor has already pasted as HTML. A copy of
 * spreadsheet cells carries a picture of the cells as well as their table, so
 * uploading it too would paste the cells twice.
 *
 * The pastes are dispatched as real ClipboardEvents on the editor's DOM, so
 * prosemirror-view's own paste handling runs before the editor's listener.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

/** A DataTransfer good enough for the paste path. */
function clipboard(data: Record<string, string>, files: File[] = []): DataTransfer {
  return {
    types: [...Object.keys(data), ...(files.length ? ['Files'] : [])],
    getData: (type: string) => data[type] ?? '',
    files,
    // As a browser lists them: one item per file, beside the text flavours.
    items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
  } as unknown as DataTransfer;
}

const picture = () => new File(['x'], 'image.png', { type: 'image/png' });

/** Cells copied from a spreadsheet: a table, its text, and a picture of the cells. */
const SPREADSHEET_HTML =
  '<table><tr><td><b>Name</b></td><td><b>Total</b></td></tr><tr><td>Widgets</td><td>42</td></tr></table>';
const SPREADSHEET_TEXT = 'Name\tTotal\r\nWidgets\t42\r\n';

describe('Image paste', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;
  let upload: jest.SpyInstance;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    upload = jest
      .spyOn(HTMLEditor.prototype as unknown as { handleImageFileUpload: () => void }, 'handleImageFileUpload')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    upload.mockRestore();
    editor?.destroy();
    container.remove();
  });

  const paste = (data: Record<string, string>, files: File[] = []): void => {
    const event = new ClipboardEvent('paste', {
      clipboardData: clipboard(data, files),
      bubbles: true,
      cancelable: true,
    } as ClipboardEventInit);
    editor.getTipTap()!.view.dom.dispatchEvent(event);
  };

  it('pastes cells copied from a spreadsheet once, as a table, without uploading their picture', () => {
    editor = new HTMLEditor(container);

    paste({ 'text/html': SPREADSHEET_HTML, 'text/plain': SPREADSHEET_TEXT }, [picture()]);

    expect(upload).not.toHaveBeenCalled();
    const content = editor.getContent();
    expect(content.match(/<table/g)).toHaveLength(1);
    expect(content).toContain('Widgets');
    expect(content).not.toContain('<img');
  });

  it('uploads no picture beside HTML that has text, when the clipboard has no plain text', () => {
    editor = new HTMLEditor(container);

    paste({ 'text/html': SPREADSHEET_HTML }, [picture()]);

    expect(upload).not.toHaveBeenCalled();
    expect(editor.getContent().match(/<table/g)).toHaveLength(1);
  });

  it('uploads no picture beside plain text alone', () => {
    editor = new HTMLEditor(container);

    paste({ 'text/plain': 'Widgets\t42' }, [picture()]);

    expect(upload).not.toHaveBeenCalled();
    expect(editor.getContent()).toContain('Widgets');
  });

  it('uploads a pasted picture that comes with no text, such as a screenshot', () => {
    editor = new HTMLEditor(container);
    const file = picture();

    paste({}, [file]);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(file);
  });

  it('pastes an image copied from a web page once, as its upload, not also as the image in its HTML', () => {
    editor = new HTMLEditor(container);
    const file = picture();

    paste({ 'text/html': '<img src="https://example.com/a.png" alt="">' }, [file]);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(file);
    expect(editor.getContent()).not.toContain('<img');
  });

  it('uploads nothing pasted into a read-only editor', () => {
    editor = new HTMLEditor(container, { readonly: true });

    paste({}, [picture()]);
    paste({ 'text/html': '<img src="https://example.com/a.png">' }, [picture()]);

    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads nothing pasted once the editor is made read-only', () => {
    editor = new HTMLEditor(container);
    editor.setReadOnly(true);

    paste({}, [picture()]);

    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads nothing dropped on a read-only editor, and keeps the browser from opening the file', () => {
    editor = new HTMLEditor(container, { readonly: true });
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: clipboard({}, [picture()]) });

    editor.getTipTap()!.view.dom.dispatchEvent(event);

    expect(upload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([[false], [true]])(
    'uploads an image copied in a browser that also puts its address in the plain text (paste as text: %s)',
    (pasteAsText) => {
      editor = new HTMLEditor(container, { paste_as_text: pasteAsText });
      const file = picture();

      paste({ 'text/html': '<img src="https://example.com/a.png">', 'text/plain': 'https://example.com/a.png' }, [file]);

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(file);
      expect(editor.getContent()).not.toContain('<img');
      expect(editor.getContent()).not.toContain('example.com');
    },
  );

  it("tells TipTap's paste listeners about an image it uploads", () => {
    editor = new HTMLEditor(container);
    const onPaste = jest.fn();
    editor.getTipTap()!.on('paste', onPaste);

    paste({}, [picture()]);

    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(onPaste.mock.calls[0][0].event).toBeInstanceOf(ClipboardEvent);
  });

  describe('dropping', () => {
    /** Drop `data` on the editor; jsdom has no layout, so the drop is given a position. */
    const drop = (data: Record<string, string>, files: File[]): DragEvent => {
      const view = editor.getTipTap()!.view;
      jest.spyOn(view, 'posAtCoords').mockReturnValue({ pos: 1, inside: -1 });
      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(event, 'dataTransfer', { value: clipboard(data, files) });
      view.dom.dispatchEvent(event);
      return event;
    };

    it('uploads a dropped image file', () => {
      editor = new HTMLEditor(container);
      const file = picture();

      const event = drop({}, [file]);

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(file);
      expect(event.defaultPrevented).toBe(true);
    });

    it('drops an image dragged from a web page once, as its upload, not also as the image in its HTML', () => {
      editor = new HTMLEditor(container);

      drop({ 'text/html': '<img src="https://example.com/a.png">' }, [picture()]);

      expect(upload).toHaveBeenCalledTimes(1);
      expect(editor.getContent()).not.toContain('<img');
    });

    it('drops text that comes with a picture as its text, and uploads no picture', () => {
      editor = new HTMLEditor(container);

      drop({ 'text/html': SPREADSHEET_HTML, 'text/plain': SPREADSHEET_TEXT }, [picture()]);

      expect(upload).not.toHaveBeenCalled();
    });
  });
});

describe('Image upload finishing after the editor is made read-only', () => {
  it('inserts nothing', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new HTMLEditor(container);
    try {
      // No upload URL: the picture is read into a data URI, which takes a turn of the event loop.
      editor.getTipTap()!.view.dom.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: clipboard({}, [new File(['x'], 'image.png', { type: 'image/png' })]),
          bubbles: true,
          cancelable: true,
        } as ClipboardEventInit),
      );
      editor.setReadOnly(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(editor.getContent()).not.toContain('<img');
    } finally {
      editor.destroy();
      container.remove();
    }
  });
});
