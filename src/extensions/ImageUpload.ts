/**
 * ImageUpload
 * Image upload dialog with drag-drop, file picker, and URL input
 */

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// Elements and attributes that are dangerous in SVG context
const SVG_DANGEROUS_TAGS = [
  'script', 'foreignobject', 'set', 'animate', 'animatetransform', 'animatemotion',
  'handler', 'listener',
];
const SVG_EVENT_ATTR_PATTERN = /^on/i;
const SVG_DANGEROUS_ATTR_VALUES = /javascript:|data:text\/html/i;

/**
 * Sanitize SVG content by removing dangerous elements and attributes.
 * Returns the cleaned SVG string, or null if parsing fails.
 */
export function sanitizeSVG(svgText: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return null;
  }

  const walk = (node: Element) => {
    // Remove dangerous elements
    const tagName = node.tagName.toLowerCase();
    if (SVG_DANGEROUS_TAGS.includes(tagName)) {
      node.remove();
      return;
    }

    // Remove dangerous attributes
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      if (SVG_EVENT_ATTR_PATTERN.test(attr.name)) {
        node.removeAttribute(attr.name);
      } else if (SVG_DANGEROUS_ATTR_VALUES.test(attr.value)) {
        node.removeAttribute(attr.name);
      }
    }

    // Process children (iterate a copy since we may remove nodes)
    const children = Array.from(node.children);
    for (const child of children) {
      walk(child);
    }
  };

  walk(doc.documentElement);
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export interface ImageUploadOptions {
  onInsert: (src: string, alt?: string) => void;
  uploadUrl?: string;
  uploadCredentials?: boolean;
  uploadBasePath?: string;
  uploadMaxSize?: number;
  uploadHeaders?: Record<string, string>;
  trans: (key: string) => string;
}

export class ImageUpload {
  private options: ImageUploadOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private activeTab: 'upload' | 'url' = 'upload';
  private currentFile: File | null = null;
  private fileInput: HTMLInputElement | null = null;
  private uploading = false;

  constructor(options: ImageUploadOptions) {
    this.options = options;
  }

  open(): void {
    if (this.overlay) {
      this.reset();
      this.overlay.style.display = 'flex';
      return;
    }
    this.createDialog();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    this.reset();
  }

  private reset(): void {
    this.currentFile = null;
    this.uploading = false;

    if (!this.dialog) return;

    // Reset file input
    if (this.fileInput) {
      this.fileInput.value = '';
    }

    // Reset dropzone text
    const dropzoneText = this.dialog.querySelector('.md-image-upload-dropzone-text');
    if (dropzoneText) {
      dropzoneText.textContent = this.options.trans('Drop image here or click to browse');
    }

    // Reset URL input
    const urlInput = this.dialog.querySelector('.md-image-upload-url-input') as HTMLInputElement;
    if (urlInput) {
      urlInput.value = '';
    }

    // Reset alt input
    const altInput = this.dialog.querySelector('.md-image-upload-alt-input') as HTMLInputElement;
    if (altInput) {
      altInput.value = '';
    }

    // Reset preview
    const preview = this.dialog.querySelector('.md-image-upload-preview') as HTMLElement;
    if (preview) {
      preview.innerHTML = '';
      preview.style.display = 'none';
    }

    // Reset progress
    const progress = this.dialog.querySelector('.md-image-upload-progress') as HTMLElement;
    if (progress) {
      progress.style.display = 'none';
    }

    // Reset insert button
    const insertBtn = this.dialog.querySelector('.md-image-upload-insert') as HTMLButtonElement;
    if (insertBtn) {
      insertBtn.disabled = true;
    }

    // Reset error
    const error = this.dialog.querySelector('.md-image-upload-error') as HTMLElement;
    if (error) {
      error.style.display = 'none';
      error.textContent = '';
    }

    // Switch to upload tab
    this.switchTab('upload');
  }

  private createDialog(): void {
    const t = this.options.trans;

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-image-upload-dialog';

    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${t('Insert image')}</h3>
      <button type="button" class="md-dialog-close">×</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());

    // Body
    const body = document.createElement('div');
    body.className = 'md-dialog-body';

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'md-image-upload-tabs';

    const uploadTab = document.createElement('button');
    uploadTab.type = 'button';
    uploadTab.className = 'md-image-upload-tab md-image-upload-tab-active';
    uploadTab.textContent = t('Upload');
    uploadTab.addEventListener('click', () => this.switchTab('upload'));

    const urlTab = document.createElement('button');
    urlTab.type = 'button';
    urlTab.className = 'md-image-upload-tab';
    urlTab.textContent = t('URL');
    urlTab.addEventListener('click', () => this.switchTab('url'));

    tabs.appendChild(uploadTab);
    tabs.appendChild(urlTab);

    // Upload panel
    const uploadPanel = document.createElement('div');
    uploadPanel.className = 'md-image-upload-panel md-image-upload-panel-upload';

    // File input (hidden)
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput?.files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });

    // Dropzone
    const dropzone = document.createElement('div');
    dropzone.className = 'md-image-upload-dropzone';
    dropzone.innerHTML = `
      <div class="md-image-upload-dropzone-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <div class="md-image-upload-dropzone-text">${t('Drop image here or click to browse')}</div>
      <button type="button" class="md-btn md-btn-primary md-image-upload-browse">${t('Browse...')}</button>
    `;

    dropzone.querySelector('.md-image-upload-browse')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput?.click();
    });

    dropzone.addEventListener('click', () => {
      this.fileInput?.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('md-image-upload-dropzone-active');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('md-image-upload-dropzone-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('md-image-upload-dropzone-active');

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });

    uploadPanel.appendChild(this.fileInput);
    uploadPanel.appendChild(dropzone);

    // URL panel
    const urlPanel = document.createElement('div');
    urlPanel.className = 'md-image-upload-panel md-image-upload-panel-url';
    urlPanel.style.display = 'none';

    const urlRow = document.createElement('div');
    urlRow.className = 'md-image-upload-row';
    urlRow.innerHTML = `
      <label>${t('URL')}</label>
      <input type="url" class="md-image-upload-url-input" placeholder="https://..." />
    `;

    const urlInput = urlRow.querySelector('.md-image-upload-url-input') as HTMLInputElement;
    urlInput.addEventListener('input', () => {
      this.handleUrlInput(urlInput.value);
    });

    urlPanel.appendChild(urlRow);

    // Shared preview area
    const preview = document.createElement('div');
    preview.className = 'md-image-upload-preview';
    preview.style.display = 'none';

    // Alt text input
    const altRow = document.createElement('div');
    altRow.className = 'md-image-upload-row';
    altRow.innerHTML = `
      <label>${t('Alt text')}</label>
      <input type="text" class="md-image-upload-alt-input" />
    `;

    // Error message
    const errorEl = document.createElement('div');
    errorEl.className = 'md-image-upload-error';
    errorEl.style.display = 'none';

    // Progress bar
    const progressEl = document.createElement('div');
    progressEl.className = 'md-image-upload-progress';
    progressEl.style.display = 'none';
    progressEl.innerHTML = `
      <div class="md-image-upload-progress-bar"><div class="md-image-upload-progress-fill"></div></div>
      <span class="md-image-upload-progress-text">${t('Uploading...')}</span>
    `;

    // Footer buttons
    const footer = document.createElement('div');
    footer.className = 'md-image-upload-footer';
    footer.innerHTML = `
      <button type="button" class="md-btn md-image-upload-cancel">${t('Cancel')}</button>
      <button type="button" class="md-btn md-btn-primary md-image-upload-insert" disabled>${t('Insert')}</button>
    `;

    footer.querySelector('.md-image-upload-cancel')?.addEventListener('click', () => this.close());
    footer.querySelector('.md-image-upload-insert')?.addEventListener('click', () => this.handleInsert());

    body.appendChild(tabs);
    body.appendChild(uploadPanel);
    body.appendChild(urlPanel);
    body.appendChild(preview);
    body.appendChild(errorEl);
    body.appendChild(progressEl);
    body.appendChild(altRow);
    body.appendChild(footer);

    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
  }

  private switchTab(tab: 'upload' | 'url'): void {
    this.activeTab = tab;
    if (!this.dialog) return;

    const tabs = this.dialog.querySelectorAll('.md-image-upload-tab');
    tabs[0]?.classList.toggle('md-image-upload-tab-active', tab === 'upload');
    tabs[1]?.classList.toggle('md-image-upload-tab-active', tab === 'url');

    const uploadPanel = this.dialog.querySelector('.md-image-upload-panel-upload') as HTMLElement;
    const urlPanel = this.dialog.querySelector('.md-image-upload-panel-url') as HTMLElement;

    if (uploadPanel) uploadPanel.style.display = tab === 'upload' ? '' : 'none';
    if (urlPanel) urlPanel.style.display = tab === 'url' ? '' : 'none';
  }

  private showError(message: string): void {
    const errorEl = this.dialog?.querySelector('.md-image-upload-error') as HTMLElement;
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  private clearError(): void {
    const errorEl = this.dialog?.querySelector('.md-image-upload-error') as HTMLElement;
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  }

  private handleFileSelected(file: File): void {
    this.clearError();
    const t = this.options.trans;

    // Validate type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.showError(t('Invalid file type'));
      return;
    }

    // Validate size
    const maxSize = this.options.uploadMaxSize ?? DEFAULT_MAX_FILE_SIZE;
    if (file.size > maxSize) {
      this.showError(t('File too large'));
      return;
    }

    this.currentFile = file;

    // Show preview
    this.showFilePreview(file);

    // Update dropzone text
    const dropzoneText = this.dialog?.querySelector('.md-image-upload-dropzone-text');
    if (dropzoneText) {
      dropzoneText.textContent = file.name;
    }

    // Enable insert button
    const insertBtn = this.dialog?.querySelector('.md-image-upload-insert') as HTMLButtonElement;
    if (insertBtn) {
      insertBtn.disabled = false;
    }
  }

  private showFilePreview(file: File): void {
    const preview = this.dialog?.querySelector('.md-image-upload-preview') as HTMLElement;
    if (!preview) return;

    const objectUrl = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = objectUrl;
    img.alt = 'Preview';
    img.onload = () => URL.revokeObjectURL(objectUrl);

    preview.innerHTML = '';
    preview.appendChild(img);
    preview.style.display = 'block';
  }

  private handleUrlInput(url: string): void {
    this.clearError();
    const preview = this.dialog?.querySelector('.md-image-upload-preview') as HTMLElement;
    const insertBtn = this.dialog?.querySelector('.md-image-upload-insert') as HTMLButtonElement;

    if (!url.trim()) {
      if (preview) {
        preview.innerHTML = '';
        preview.style.display = 'none';
      }
      if (insertBtn) insertBtn.disabled = true;
      return;
    }

    if (!this.isValidUrl(url)) {
      if (insertBtn) insertBtn.disabled = true;
      return;
    }

    // Show preview
    if (preview) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Preview';
      img.onerror = () => {
        preview.innerHTML = '';
        preview.style.display = 'none';
        if (insertBtn) insertBtn.disabled = true;
        this.showError(this.options.trans('Invalid image URL'));
      };
      img.onload = () => {
        if (insertBtn) insertBtn.disabled = false;
      };
      preview.innerHTML = '';
      preview.appendChild(img);
      preview.style.display = 'block';
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async handleInsert(): Promise<void> {
    if (this.uploading) return;

    const altInput = this.dialog?.querySelector('.md-image-upload-alt-input') as HTMLInputElement;
    const alt = altInput?.value?.trim() || undefined;

    if (this.activeTab === 'url') {
      const urlInput = this.dialog?.querySelector('.md-image-upload-url-input') as HTMLInputElement;
      const url = urlInput?.value?.trim();
      if (url && this.isValidUrl(url)) {
        this.options.onInsert(url, alt);
        this.close();
      }
      return;
    }

    // Upload tab
    if (!this.currentFile) return;

    try {
      const src = await this.uploadFile(this.currentFile);
      this.options.onInsert(src, alt);
      this.close();
    } catch (err) {
      this.showError(this.options.trans('Upload failed'));
    }
  }

  uploadFile(file: File): Promise<string> {
    // Validate type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return Promise.reject(new Error('Invalid file type'));
    }

    // Validate size
    const maxSize = this.options.uploadMaxSize ?? DEFAULT_MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return Promise.reject(new Error('File too large'));
    }

    // Sanitize SVG files before processing
    if (file.type === 'image/svg+xml') {
      return this.sanitizeAndUploadSVG(file);
    }

    // If no upload URL, use base64 fallback
    if (!this.options.uploadUrl) {
      return this.readAsBase64(file);
    }

    return this.uploadViaXHR(file);
  }

  private sanitizeAndUploadSVG(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const svgText = reader.result as string;
        const sanitized = sanitizeSVG(svgText);
        if (!sanitized) {
          reject(new Error('Invalid SVG file'));
          return;
        }

        const sanitizedBlob = new Blob([sanitized], { type: 'image/svg+xml' });
        const sanitizedFile = new File([sanitizedBlob], file.name, { type: 'image/svg+xml' });

        if (!this.options.uploadUrl) {
          this.readAsBase64(sanitizedFile).then(resolve, reject);
        } else {
          this.uploadViaXHR(sanitizedFile).then(resolve, reject);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private uploadViaXHR(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.uploading = true;
      const progressEl = this.dialog?.querySelector('.md-image-upload-progress') as HTMLElement;
      const progressFill = this.dialog?.querySelector('.md-image-upload-progress-fill') as HTMLElement;
      const progressText = this.dialog?.querySelector('.md-image-upload-progress-text') as HTMLElement;
      const insertBtn = this.dialog?.querySelector('.md-image-upload-insert') as HTMLButtonElement;

      if (progressEl) progressEl.style.display = 'flex';
      if (insertBtn) insertBtn.disabled = true;

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file, file.name);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && progressFill && progressText) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width = `${pct}%`;
          progressText.textContent = `${pct}%`;
        }
      });

      xhr.addEventListener('load', () => {
        this.uploading = false;
        if (progressEl) progressEl.style.display = 'none';

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            let url: string = response.location || response.url || response.link;
            if (!url) {
              reject(new Error('No URL returned from server'));
              return;
            }

            // Prepend base path if relative URL
            const basePath = this.options.uploadBasePath ?? '/';
            if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
              url = basePath.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
            }

            resolve(url);
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        this.uploading = false;
        if (progressEl) progressEl.style.display = 'none';
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        this.uploading = false;
        if (progressEl) progressEl.style.display = 'none';
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', this.options.uploadUrl!);

      if (this.options.uploadCredentials !== false) {
        xhr.withCredentials = true;
      }

      // Add custom headers
      if (this.options.uploadHeaders) {
        for (const [key, value] of Object.entries(this.options.uploadHeaders)) {
          xhr.setRequestHeader(key, value);
        }
      }

      xhr.send(formData);
    });
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.fileInput = null;
    }
  }
}
