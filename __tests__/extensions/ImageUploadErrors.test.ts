/**
 * ImageUpload failure messages: translated, and worded by the caller's errorMessage hook
 */

import { ImageUpload, ImageUploadOptions } from '../../src/extensions/ImageUpload';
import { HTMLEditor, resetTranslate } from '../../src/core/HTMLEditor';
import { getLocale } from '../../src/i18n';
import type { EditorConfig } from '../../src/types';

class FakeXHR {
  static last: FakeXHR;
  status = 0;
  responseText = '';
  withCredentials = false;
  upload = { addEventListener: jest.fn() };
  private listeners: Record<string, () => void> = {};
  open = jest.fn();
  setRequestHeader = jest.fn();
  send = jest.fn();
  constructor() { FakeXHR.last = this; }
  addEventListener(type: string, cb: () => void) { this.listeners[type] = cb; }
  respond(status: number, body: string) {
    this.status = status;
    this.responseText = body;
    this.listeners.load?.();
  }
  fire(type: 'error' | 'abort') { this.listeners[type]?.(); }
}

// A FileReader whose every read fails
class FailingFileReader {
  result: unknown = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsText() { setTimeout(() => this.onerror?.()); }
  readAsDataURL() { setTimeout(() => this.onerror?.()); }
}

const pngFile = () => new File(['x'], 'a.png', { type: 'image/png' });
const svgFile = (text: string) => new File([text], 'a.svg', { type: 'image/svg+xml' });

const makeUpload = (options: Partial<ImageUploadOptions> = {}) =>
  new ImageUpload({ uploadUrl: '/upload', trans: (k) => 'T:' + k, ...options });

describe('ImageUpload failure messages', () => {
  const originalXHR = window.XMLHttpRequest;
  const originalFileReader = window.FileReader;

  beforeEach(() => {
    (window as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
  });

  afterEach(() => {
    window.XMLHttpRequest = originalXHR;
    window.FileReader = originalFileReader;
  });

  describe('translated messages', () => {
    it.each([
      ['a 2xx reply with no URL', 200, '{"error":"ContentBlocked"}', 'T:No URL returned from server'],
      ['a 2xx reply that is not JSON', 200, 'not json', 'T:Invalid server response'],
      ['an HTTP error status', 500, 'oops', 'T:Upload failed: 500'],
    ])('rejects %s with a translated message', async (_label, status, body, expected) => {
      const result = makeUpload().uploadFile(pngFile());
      FakeXHR.last.respond(status, body);
      await expect(result).rejects.toThrow(expected);
    });

    it('places the HTTP status where the translation puts it', async () => {
      const trans = (key: string) => (key === 'Upload failed: {status}' ? 'Erreur {status} : échec' : key);
      const result = makeUpload({ trans }).uploadFile(pngFile());
      FakeXHR.last.respond(503, 'oops');
      await expect(result).rejects.toThrow('Erreur 503 : échec');
    });

    it.each([
      ['error', 'T:Network error'],
      ['abort', 'T:Upload aborted'],
    ] as const)('rejects a request %s with a translated message', async (type, expected) => {
      const result = makeUpload().uploadFile(pngFile());
      FakeXHR.last.fire(type);
      await expect(result).rejects.toThrow(expected);
    });

    it('rejects an SVG that cannot be parsed with a translated message', async () => {
      await expect(makeUpload().uploadFile(svgFile('not xml at all <<<'))).rejects.toThrow('T:Invalid SVG file');
    });

    it('rejects a file that cannot be read with a translated message', async () => {
      (window as unknown as { FileReader: unknown }).FileReader = FailingFileReader;
      await expect(makeUpload({ uploadUrl: undefined }).uploadFile(pngFile())).rejects.toThrow('T:Failed to read file');
      await expect(makeUpload().uploadFile(svgFile('<svg/>'))).rejects.toThrow('T:Failed to read file');
    });

    it('still resolves a successful upload to the URL under the base path', async () => {
      const result = makeUpload().uploadFile(pngFile());
      FakeXHR.last.respond(200, '{"location":"img/a.png"}');
      await expect(result).resolves.toBe('/img/a.png');
    });

    it.each([
      ['a JSON number', '42'],
      ['a JSON string', '"img/a.png"'],
      ['a JSON array', '[]'],
      ['JSON null', 'null'],
    ])('rejects %s as an invalid server response', async (_label, body) => {
      const result = makeUpload().uploadFile(pngFile());
      FakeXHR.last.respond(200, body);
      await expect(result).rejects.toThrow('T:Invalid server response');
    });

    it('rejects a reply whose location is not a string as having no URL', async () => {
      const result = makeUpload().uploadFile(pngFile());
      FakeXHR.last.respond(200, '{"location":42}');
      await expect(result).rejects.toThrow('T:No URL returned from server');
    });

    it('uses a string url or link when location is not a string', async () => {
      const result = makeUpload().uploadFile(pngFile());
      FakeXHR.last.respond(200, '{"location":{"href":"x"},"url":"img/a.png"}');
      await expect(result).resolves.toBe('/img/a.png');
    });
  });

  describe('errorMessage hook', () => {
    const blockedType = (response: unknown) =>
      (response as { error?: string } | null)?.error === 'ContentBlocked' ? 'Blocked type' : null;

    it('words a 2xx reply with no URL from the parsed body', async () => {
      const errorMessage = jest.fn(blockedType);
      const result = makeUpload({ errorMessage }).uploadFile(pngFile());
      FakeXHR.last.respond(200, '{"error":"ContentBlocked"}');
      await expect(result).rejects.toThrow('Blocked type');
      expect(errorMessage).toHaveBeenCalledWith({ error: 'ContentBlocked' }, 200);
    });

    it('falls back to the translated message when the hook returns null', async () => {
      const result = makeUpload({ errorMessage: blockedType }).uploadFile(pngFile());
      FakeXHR.last.respond(200, '{"error":"Other"}');
      await expect(result).rejects.toThrow('T:No URL returned from server');
    });

    it('passes null for a body that is not JSON', async () => {
      const errorMessage = jest.fn(() => 'From hook');
      const result = makeUpload({ errorMessage }).uploadFile(pngFile());
      FakeXHR.last.respond(200, 'not json');
      await expect(result).rejects.toThrow('From hook');
      expect(errorMessage).toHaveBeenCalledWith(null, 200);
    });

    it('passes the parsed body and status of an HTTP error', async () => {
      const errorMessage = jest.fn(() => 'From hook');
      const result = makeUpload({ errorMessage }).uploadFile(pngFile());
      FakeXHR.last.respond(500, '{"error":"Disk full"}');
      await expect(result).rejects.toThrow('From hook');
      expect(errorMessage).toHaveBeenCalledWith({ error: 'Disk full' }, 500);
    });

    it.each([
      ['an object', { code: 5 }],
      ['a number', 5],
      ['a blank string', '  '],
    ])('falls back to the translated message when the hook returns %s', async (_label, value) => {
      const errorMessage = (() => value) as unknown as ImageUploadOptions['errorMessage'];
      const result = makeUpload({ errorMessage }).uploadFile(pngFile());
      FakeXHR.last.respond(200, '{}');
      await expect(result).rejects.toThrow('T:No URL returned from server');
    });

    it('falls back to the translated message, and warns, when the hook throws', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const hookError = new Error('hook failed');
        const errorMessage = () => { throw hookError; };
        const result = makeUpload({ errorMessage }).uploadFile(pngFile());
        FakeXHR.last.respond(500, '');
        await expect(result).rejects.toThrow('T:Upload failed: 500');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('images_upload_error_message'), hookError);
      } finally {
        warn.mockRestore();
      }
    });

    it.each([
      ['a network error', () => FakeXHR.last.fire('error')],
      ['an abort', () => FakeXHR.last.fire('abort')],
      ['a successful upload', () => FakeXHR.last.respond(200, '{"url":"https://cdn/a.png"}')],
    ])('is not called for %s', async (_label, finish) => {
      const errorMessage = jest.fn(() => 'From hook');
      const result = makeUpload({ errorMessage }).uploadFile(pngFile());
      finish();
      await result.catch(() => undefined);
      expect(errorMessage).not.toHaveBeenCalled();
    });
  });

  describe('editor config', () => {
    let container: HTMLElement;
    let editor: HTMLEditor;
    const flush = () => new Promise((resolve) => setTimeout(resolve));
    const createEditor = (config: EditorConfig) => {
      editor = new HTMLEditor(container, { images_upload_url: '/upload', ...config });
      return editor;
    };
    // The drop and paste handlers both hand the file to this method
    const dropImage = (file: File) =>
      (editor as unknown as { handleImageFileUpload(file: File): void }).handleImageFileUpload(file);

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      editor?.destroy();
      container.remove();
      resetTranslate();
    });

    it('words a dropped or pasted image failure with images_upload_error_message', async () => {
      const onError = jest.fn();
      createEditor({ images_upload_error: onError, images_upload_error_message: () => 'From config' });
      dropImage(pngFile());
      FakeXHR.last.respond(200, '{"error":"ContentBlocked"}');
      await flush();
      expect(onError).toHaveBeenCalledWith('From config');
    });

    describe('image dialog', () => {
      const uploadError = () => document.querySelector('.md-image-dialog-upload-error')?.textContent;
      const source = () => (document.querySelector('.md-image-dialog [name="src"]') as HTMLInputElement).value;
      // Opens the dialog and picks a PNG on the Upload tab, which starts the upload
      const uploadFromDialog = () => {
        (container.querySelector('[data-button="image"]') as HTMLButtonElement).click();
        const input = document.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
        Object.defineProperty(input, 'files', { value: [pngFile()], configurable: true });
        input.dispatchEvent(new Event('change'));
      };

      it('words a failure with images_upload_error_message', async () => {
        createEditor({ images_upload_error_message: () => 'From config' });
        uploadFromDialog();
        FakeXHR.last.respond(200, '{"error":"ContentBlocked"}');
        await flush();
        expect(uploadError()).toBe('From config');
      });

      it('fills Source with the address the server returns', async () => {
        createEditor({});
        uploadFromDialog();
        FakeXHR.last.respond(200, '{"location":"https://example.com/up.png"}');
        await flush();
        expect(source()).toBe('https://example.com/up.png');
      });

      it.each([
        ['a refused upload', () => FakeXHR.last.respond(200, '{"error":"ContentBlocked"}')],
        ['a network error', () => FakeXHR.last.fire('error')],
        ['an abort', () => FakeXHR.last.fire('abort')],
      ])('lets the user retry after %s', async (_label, fail) => {
        createEditor({});
        uploadFromDialog();
        const save = document.querySelector('.md-image-dialog-save') as HTMLButtonElement;
        expect(save.disabled).toBe(true);
        fail();
        await flush();
        expect(uploadError()).not.toBe('');
        const input = document.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
        input.dispatchEvent(new Event('change'));
        FakeXHR.last.respond(200, '{"location":"https://example.com/again.png"}');
        await flush();
        expect(source()).toBe('https://example.com/again.png');
      });

      it('ignores the failure of an upload from before the dialog was closed', async () => {
        createEditor({});
        uploadFromDialog();
        const staleUpload = FakeXHR.last;
        (document.querySelector('.md-image-dialog-cancel') as HTMLButtonElement).click();
        (container.querySelector('[data-button="image"]') as HTMLButtonElement).click();
        staleUpload.respond(500, '');
        await flush();
        expect(uploadError()).toBe('');
      });
    });

    it('translates a dropped or pasted image failure in the language set by setLanguage()', async () => {
      const onError = jest.fn();
      createEditor({ language: 'de', images_upload_error: onError });
      dropImage(pngFile());
      FakeXHR.last.fire('error');
      await flush();
      expect(onError).toHaveBeenLastCalledWith(getLocale('de')['Network error']);

      editor.setLanguage('fr');
      dropImage(pngFile());
      FakeXHR.last.fire('error');
      await flush();
      expect(onError).toHaveBeenLastCalledWith(getLocale('fr')['Network error']);
    });
  });

  describe('progress', () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve));

    /** Report upload progress as the browser would. */
    function progress(loaded: number, total: number, lengthComputable = true): void {
      const call = FakeXHR.last.upload.addEventListener.mock.calls.find(([type]) => type === 'progress');
      (call?.[1] as (e: Partial<ProgressEvent>) => void)({ lengthComputable, loaded, total });
    }

    it('is reported to the callback in whole percent', async () => {
      const onProgress = jest.fn();
      const result = makeUpload().uploadFile(pngFile(), onProgress);
      progress(1, 3);
      progress(3, 3);
      FakeXHR.last.respond(200, '{"location":"https://example.com/a.png"}');
      await expect(result).resolves.toBe('https://example.com/a.png');
      expect(onProgress.mock.calls).toEqual([[33], [100]]);
    });

    it('is not reported when the size is not known', async () => {
      const onProgress = jest.fn();
      const result = makeUpload().uploadFile(pngFile(), onProgress);
      progress(5, 0, false);
      FakeXHR.last.respond(200, '{"location":"https://example.com/a.png"}');
      await result;
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('is reported for a cleaned SVG too', async () => {
      const onProgress = jest.fn();
      const before = FakeXHR.last;
      const result = makeUpload().uploadFile(svgFile('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), onProgress);
      // The SVG is read and cleaned before its request starts.
      for (let i = 0; i < 50 && FakeXHR.last === before; i++) await flush();
      progress(1, 2);
      FakeXHR.last.respond(200, '{"location":"https://example.com/a.svg"}');
      await result;
      expect(onProgress).toHaveBeenCalledWith(50);
    });
  });
});
