/**
 * ImageUpload Tests: checking and uploading a file. The dialog that uses it is
 * tested in ImageDialog.test.ts.
 */

import { ImageUpload, sanitizeSVG } from '../../src/extensions/ImageUpload';

describe('ImageUpload', () => {
  let imageUpload: ImageUpload;
  let transMock: jest.Mock;

  beforeEach(() => {
    transMock = jest.fn((key) => key);
    imageUpload = new ImageUpload({ trans: transMock });
  });

  it('keeps nothing open between uploads', () => {
    expect(() => imageUpload.destroy()).not.toThrow();
    expect(document.querySelector('.md-dialog-overlay')).toBeNull();
  });

  describe('File Validation', () => {
    it('should reject non-image files', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(imageUpload.uploadFile(file)).rejects.toThrow('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      const largeContent = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'large.png', { type: 'image/png' });

      await expect(imageUpload.uploadFile(file)).rejects.toThrow('File too large');
    });

    it('should accept valid image files with base64 fallback', async () => {
      const file = new File(['fakepngdata'], 'test.png', { type: 'image/png' });

      const result = await imageUpload.uploadFile(file);
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should accept jpeg files', async () => {
      const file = new File(['fakejpgdata'], 'photo.jpg', { type: 'image/jpeg' });

      const result = await imageUpload.uploadFile(file);
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should accept gif files', async () => {
      const file = new File(['fakegifdata'], 'anim.gif', { type: 'image/gif' });

      const result = await imageUpload.uploadFile(file);
      expect(result).toMatch(/^data:image\/gif;base64,/);
    });

    it('should accept webp files', async () => {
      const file = new File(['fakewebpdata'], 'image.webp', { type: 'image/webp' });

      const result = await imageUpload.uploadFile(file);
      expect(result).toMatch(/^data:image\/webp;base64,/);
    });

    it('should accept svg files', async () => {
      const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });

      const result = await imageUpload.uploadFile(file);
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('should respect custom max size', async () => {
      const customUpload = new ImageUpload({
        trans: transMock,
        uploadMaxSize: 100, // 100 bytes
      });

      const file = new File(['x'.repeat(200)], 'test.png', { type: 'image/png' });
      await expect(customUpload.uploadFile(file)).rejects.toThrow('File too large');

      customUpload.destroy();
    });
  });
});

describe('sanitizeSVG', () => {
  it('should return sanitized SVG for clean input', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).toContain('<rect');
  });

  it('should remove script elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect width="10" height="10"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<rect');
  });

  it('should remove foreignObject elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('foreignObject');
    expect(result).not.toContain('alert');
  });

  it('should remove event handler attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onload="alert(1)" onclick="alert(2)" onmouseover="alert(3)"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('onload');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('alert');
  });

  it('should remove javascript: URLs in attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('javascript:');
  });

  it('should remove animate elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="javascript:alert(1)"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('<animate');
    expect(result).not.toContain('javascript');
  });

  it('should remove set elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="onmouseover" to="alert(1)"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('<set');
  });

  it('should return null for invalid SVG', () => {
    const result = sanitizeSVG('not xml at all <<<');
    expect(result).toBeNull();
  });

  it('should preserve safe SVG attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" stroke="blue"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).toContain('viewBox');
    expect(result).toContain('fill="red"');
    expect(result).toContain('stroke="blue"');
  });

  it('should handle deeply nested malicious content', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g><g><g><script>alert(1)</script></g></g></g></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
  });

  it('should remove data:text/html attribute values', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html,%3Cscript%3Ealert(1)%3C/script%3E"/></svg>';
    const result = sanitizeSVG(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain('data:text/html');
  });
});
