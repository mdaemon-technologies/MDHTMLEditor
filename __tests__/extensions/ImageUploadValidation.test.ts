/**
 * ImageUpload file-type guard / validation-hook tests (CKEditor simpleuploads parity)
 */

import { ImageUpload, parseImageFileTypes } from '../../src/extensions/ImageUpload';

const makeFile = (name: string, type: string, size = 10): File => {
  const file = new File(['x'.repeat(size)], name, { type });
  return file;
};

describe('ImageUpload validation', () => {
  describe('parseImageFileTypes', () => {
    it('returns null for empty/undefined', () => {
      expect(parseImageFileTypes(undefined)).toBeNull();
      expect(parseImageFileTypes('')).toBeNull();
    });

    it('parses comma/space/pipe separated specs to extensions', () => {
      expect(parseImageFileTypes('jpg, jpeg ,png|gif')).toEqual(['jpg', 'jpeg', 'png', 'gif']);
      expect(parseImageFileTypes('.PNG .Gif')).toEqual(['png', 'gif']);
    });
  });

  describe('validateFile', () => {
    it('accepts a default image type when no fileTypes set', () => {
      const iu = new ImageUpload({ onInsert: jest.fn(), trans: (k) => k });
      expect(iu.validateFile(makeFile('a.png', 'image/png'))).toBeNull();
    });

    it('restricts to the configured extensions', () => {
      const iu = new ImageUpload({ onInsert: jest.fn(), trans: (k) => k, fileTypes: 'jpg,png' });
      expect(iu.validateFile(makeFile('a.png', 'image/png'))).toBeNull();
      expect(iu.validateFile(makeFile('a.gif', 'image/gif'))).toBe('Invalid file type');
      expect(iu.validateFile(makeFile('a.exe', 'application/octet-stream'))).toBe('Invalid file type');
    });

    it('matches by MIME when the file has no extension (clipboard paste)', () => {
      const iu = new ImageUpload({ onInsert: jest.fn(), trans: (k) => k, fileTypes: 'png' });
      expect(iu.validateFile(makeFile('image', 'image/png'))).toBeNull();
    });

    it('runs the caller validate hook first', () => {
      const iu = new ImageUpload({
        onInsert: jest.fn(),
        trans: (k) => k,
        validate: (f) => (f.name.includes('bad') ? 'rejected by host' : null),
      });
      expect(iu.validateFile(makeFile('bad.png', 'image/png'))).toBe('rejected by host');
      expect(iu.validateFile(makeFile('ok.png', 'image/png'))).toBeNull();
    });

    it('enforces the max size', () => {
      const iu = new ImageUpload({ onInsert: jest.fn(), trans: (k) => k, uploadMaxSize: 5 });
      expect(iu.validateFile(makeFile('a.png', 'image/png', 100))).toBe('File too large');
    });
  });

  describe('uploadFile', () => {
    it('rejects an invalid type with the guard message', async () => {
      const iu = new ImageUpload({ onInsert: jest.fn(), trans: (k) => k, fileTypes: 'jpg' });
      await expect(iu.uploadFile(makeFile('a.exe', 'application/octet-stream'))).rejects.toThrow('Invalid file type');
    });
  });
});
