/**
 * ImageUpload Tests
 */

import { ImageUpload, sanitizeSVG } from '../../src/extensions/ImageUpload';

describe('ImageUpload', () => {
  let imageUpload: ImageUpload;
  let onInsertMock: jest.Mock;
  let transMock: jest.Mock;

  beforeEach(() => {
    onInsertMock = jest.fn();
    transMock = jest.fn((key) => key);

    imageUpload = new ImageUpload({
      onInsert: onInsertMock,
      trans: transMock,
    });
  });

  afterEach(() => {
    imageUpload?.destroy();
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  describe('Dialog Open/Close', () => {
    it('should open dialog', () => {
      imageUpload.open();

      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create dialog elements', () => {
      imageUpload.open();

      const dialog = document.querySelector('.md-image-upload-dialog');
      expect(dialog).not.toBeNull();

      const header = document.querySelector('.md-dialog-header');
      expect(header).not.toBeNull();

      const body = document.querySelector('.md-dialog-body');
      expect(body).not.toBeNull();
    });

    it('should have upload and URL tabs', () => {
      imageUpload.open();

      const tabs = document.querySelectorAll('.md-image-upload-tab');
      expect(tabs.length).toBe(2);
      expect(tabs[0].textContent).toBe('Upload');
      expect(tabs[1].textContent).toBe('URL');
    });

    it('should default to upload tab active', () => {
      imageUpload.open();

      const tabs = document.querySelectorAll('.md-image-upload-tab');
      expect(tabs[0].classList.contains('md-image-upload-tab-active')).toBe(true);
      expect(tabs[1].classList.contains('md-image-upload-tab-active')).toBe(false);
    });

    it('should close dialog', () => {
      imageUpload.open();
      imageUpload.close();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should reopen dialog without creating new one', () => {
      imageUpload.open();
      imageUpload.close();
      imageUpload.open();

      const overlays = document.querySelectorAll('.md-dialog-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should close on overlay click', () => {
      imageUpload.open();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay.click();

      expect(overlay.style.display).toBe('none');
    });

    it('should close on close button click', () => {
      imageUpload.open();

      const closeBtn = document.querySelector('.md-dialog-close') as HTMLElement;
      closeBtn.click();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay.style.display).toBe('none');
    });

    it('should close on cancel button click', () => {
      imageUpload.open();

      const cancelBtn = document.querySelector('.md-image-upload-cancel') as HTMLElement;
      cancelBtn.click();

      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay.style.display).toBe('none');
    });
  });

  describe('Tab Switching', () => {
    it('should switch to URL tab', () => {
      imageUpload.open();

      const tabs = document.querySelectorAll('.md-image-upload-tab');
      (tabs[1] as HTMLElement).click();

      expect(tabs[1].classList.contains('md-image-upload-tab-active')).toBe(true);
      expect(tabs[0].classList.contains('md-image-upload-tab-active')).toBe(false);

      const uploadPanel = document.querySelector('.md-image-upload-panel-upload') as HTMLElement;
      const urlPanel = document.querySelector('.md-image-upload-panel-url') as HTMLElement;
      expect(uploadPanel.style.display).toBe('none');
      expect(urlPanel.style.display).toBe('');
    });

    it('should switch back to upload tab', () => {
      imageUpload.open();

      const tabs = document.querySelectorAll('.md-image-upload-tab');
      (tabs[1] as HTMLElement).click();
      (tabs[0] as HTMLElement).click();

      expect(tabs[0].classList.contains('md-image-upload-tab-active')).toBe(true);

      const uploadPanel = document.querySelector('.md-image-upload-panel-upload') as HTMLElement;
      expect(uploadPanel.style.display).toBe('');
    });
  });

  describe('Dropzone', () => {
    it('should have a dropzone', () => {
      imageUpload.open();

      const dropzone = document.querySelector('.md-image-upload-dropzone');
      expect(dropzone).not.toBeNull();
    });

    it('should have a browse button', () => {
      imageUpload.open();

      const browseBtn = document.querySelector('.md-image-upload-browse');
      expect(browseBtn).not.toBeNull();
    });

    it('should add active class on dragover', () => {
      imageUpload.open();

      const dropzone = document.querySelector('.md-image-upload-dropzone') as HTMLElement;
      const dragOverEvent = new Event('dragover', { bubbles: true }) as DragEvent;
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { dropEffect: 'none' },
      });
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(dragOverEvent, 'stopPropagation', { value: jest.fn() });

      dropzone.dispatchEvent(dragOverEvent);
      expect(dropzone.classList.contains('md-image-upload-dropzone-active')).toBe(true);
    });

    it('should remove active class on dragleave', () => {
      imageUpload.open();

      const dropzone = document.querySelector('.md-image-upload-dropzone') as HTMLElement;

      // First trigger dragover
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { dropEffect: 'none' },
      });
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(dragOverEvent, 'stopPropagation', { value: jest.fn() });
      dropzone.dispatchEvent(dragOverEvent);

      // Then trigger dragleave
      const dragLeaveEvent = new Event('dragleave', { bubbles: true });
      Object.defineProperty(dragLeaveEvent, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(dragLeaveEvent, 'stopPropagation', { value: jest.fn() });
      dropzone.dispatchEvent(dragLeaveEvent);

      expect(dropzone.classList.contains('md-image-upload-dropzone-active')).toBe(false);
    });
  });

  describe('Insert Button State', () => {
    it('should start with insert button disabled', () => {
      imageUpload.open();

      const insertBtn = document.querySelector('.md-image-upload-insert') as HTMLButtonElement;
      expect(insertBtn.disabled).toBe(true);
    });
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
        onInsert: jest.fn(),
        trans: transMock,
        uploadMaxSize: 100, // 100 bytes
      });

      const file = new File(['x'.repeat(200)], 'test.png', { type: 'image/png' });
      await expect(customUpload.uploadFile(file)).rejects.toThrow('File too large');

      customUpload.destroy();
    });
  });

  describe('URL Input', () => {
    it('should have URL input field', () => {
      imageUpload.open();

      // Switch to URL tab
      const tabs = document.querySelectorAll('.md-image-upload-tab');
      (tabs[1] as HTMLElement).click();

      const urlInput = document.querySelector('.md-image-upload-url-input');
      expect(urlInput).not.toBeNull();
    });
  });

  describe('Alt Text', () => {
    it('should have alt text input', () => {
      imageUpload.open();

      const altInput = document.querySelector('.md-image-upload-alt-input');
      expect(altInput).not.toBeNull();
    });
  });

  describe('Destroy', () => {
    it('should remove dialog from DOM', () => {
      imageUpload.open();
      imageUpload.destroy();

      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).toBeNull();
    });

    it('should handle destroy without open', () => {
      expect(() => imageUpload.destroy()).not.toThrow();
    });
  });

  describe('Reset on Reopen', () => {
    it('should reset state when reopened', () => {
      imageUpload.open();

      // Switch to URL tab
      const tabs = document.querySelectorAll('.md-image-upload-tab');
      (tabs[1] as HTMLElement).click();

      // Close and reopen
      imageUpload.close();
      imageUpload.open();

      // Should be back to upload tab
      expect(tabs[0].classList.contains('md-image-upload-tab-active')).toBe(true);
    });
  });

  describe('i18n', () => {
    it('should call translate for dialog strings', () => {
      imageUpload.open();

      expect(transMock).toHaveBeenCalledWith('Insert image');
      expect(transMock).toHaveBeenCalledWith('Upload');
      expect(transMock).toHaveBeenCalledWith('URL');
      expect(transMock).toHaveBeenCalledWith('Drop image here or click to browse');
      expect(transMock).toHaveBeenCalledWith('Browse...');
      expect(transMock).toHaveBeenCalledWith('Alt text');
      expect(transMock).toHaveBeenCalledWith('Insert');
      expect(transMock).toHaveBeenCalledWith('Cancel');
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
