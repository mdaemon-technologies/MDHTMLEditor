/**
 * ImageUpload
 * Checks and uploads an image file, for the image dialog's Upload tab and for
 * images dropped or pasted into the editor. Without an upload address the
 * image is embedded as a data URI. An SVG is cleaned before it goes anywhere.
 */

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];

// Map of file extensions to MIME types for the configurable file-type guard.
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/**
 * Parse an images_file_types spec (e.g. 'jpg,jpeg,png,gif,bmp' or
 * 'jpg jpeg png') into a normalized list of lowercase extensions.
 */
export function parseImageFileTypes(spec?: string): string[] | null {
  if (!spec) return null;
  const exts = spec
    .split(/[\s,|]+/)
    .map(s => s.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);
  return exts.length > 0 ? exts : null;
}

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
  uploadUrl?: string;
  uploadCredentials?: boolean;
  uploadBasePath?: string;
  uploadMaxSize?: number;
  uploadHeaders?: Record<string, string>;
  /** Accepted file extensions spec (images_file_types). When set, restricts uploads. */
  fileTypes?: string;
  /** Optional pre-upload validation hook; return a non-null message to reject. */
  validate?: (file: File) => string | null;
  /** Caller-supplied alert for failures with no dialog context (drag-drop/paste). */
  onError?: (message: string) => void;
  /** Words a failed upload's message from the reply (images_upload_error_message). */
  errorMessage?: (response: unknown, status: number) => string | null | undefined;
  trans: (key: string) => string;
}

export class ImageUpload {
  private options: ImageUploadOptions;

  constructor(options: ImageUploadOptions) {
    this.options = options;
  }

  /** Whether the file matches the configured/default accepted image types. */
  private isAcceptedType(file: File): boolean {
    const exts = parseImageFileTypes(this.options.fileTypes);
    if (!exts) {
      return ACCEPTED_IMAGE_TYPES.includes(file.type);
    }
    const name = (file.name ?? '').toLowerCase();
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot + 1) : '';
    if (ext && exts.includes(ext)) return true;
    // Fall back to MIME match (clipboard files may have no/blank name)
    const acceptedMimes = exts.map(e => EXT_TO_MIME[e]).filter(Boolean);
    return !!file.type && acceptedMimes.includes(file.type);
  }

  /**
   * Validate a file before upload. Returns an error message (translated) to
   * reject, or null to allow. Runs the caller's validate hook, then the
   * type and size guards.
   */
  validateFile(file: File): string | null {
    const t = this.options.trans;
    if (this.options.validate) {
      const msg = this.options.validate(file);
      if (msg) return msg;
    }
    if (!this.isAcceptedType(file)) {
      return t('Invalid file type');
    }
    const maxSize = this.options.uploadMaxSize ?? DEFAULT_MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return t('File too large');
    }
    return null;
  }

  /**
   * Upload a file (or embed it as a data URI when there is no upload URL),
   * resolving its address. `onProgress` hears the upload's progress in whole
   * percent, when the browser knows the size.
   */
  uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
    // Validate (custom hook, then type + size guards)
    const validationError = this.validateFile(file);
    if (validationError) {
      return Promise.reject(new Error(validationError));
    }

    // Sanitize SVG files before processing
    if (file.type === 'image/svg+xml') {
      return this.sanitizeAndUploadSVG(file, onProgress);
    }

    // If no upload URL, use base64 fallback
    if (!this.options.uploadUrl) {
      return this.readAsBase64(file);
    }

    return this.uploadViaXHR(file, onProgress);
  }

  private sanitizeAndUploadSVG(file: File, onProgress?: (percent: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const svgText = reader.result as string;
        const sanitized = sanitizeSVG(svgText);
        if (!sanitized) {
          reject(new Error(this.options.trans('Invalid SVG file')));
          return;
        }

        const sanitizedBlob = new Blob([sanitized], { type: 'image/svg+xml' });
        const sanitizedFile = new File([sanitizedBlob], file.name, { type: 'image/svg+xml' });

        if (!this.options.uploadUrl) {
          this.readAsBase64(sanitizedFile).then(resolve, reject);
        } else {
          this.uploadViaXHR(sanitizedFile, onProgress).then(resolve, reject);
        }
      };
      reader.onerror = () => reject(new Error(this.options.trans('Failed to read file')));
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
          reject(new Error(this.options.trans('Failed to read file')));
        }
      };
      reader.onerror = () => reject(new Error(this.options.trans('Failed to read file')));
      reader.readAsDataURL(file);
    });
  }

  private uploadViaXHR(file: File, onProgress?: (percent: number) => void): Promise<string> {
    const t = this.options.trans;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file, file.name);

      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable || !e.total) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct);
      });

      xhr.addEventListener('load', () => {

        let response: unknown = null;
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          // not JSON: the hook receives null
        }

        // The caller's wording for a failed upload, else the editor's own
        const fail = (fallback: string) => {
          let message: string | null | undefined;
          try {
            message = this.options.errorMessage?.(response, xhr.status);
          } catch (err) {
            console.warn('[html-editor] images_upload_error_message threw; using the default message.', err);
            message = null;
          }
          reject(new Error(typeof message === 'string' && message.trim() ? message : fallback));
        };

        if (xhr.status < 200 || xhr.status >= 300) {
          fail(t('Upload failed: {status}').replace('{status}', String(xhr.status)));
          return;
        }
        if (!response || typeof response !== 'object' || Array.isArray(response)) {
          fail(t('Invalid server response'));
          return;
        }
        const reply = response as Record<string, unknown>;
        const location = [reply.location, reply.url, reply.link]
          .find((value): value is string => typeof value === 'string' && value !== '');
        if (!location) {
          fail(t('No URL returned from server'));
          return;
        }
        let url = location;

        // Prepend base path if relative URL
        const basePath = this.options.uploadBasePath ?? '/';
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
          url = basePath.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
        }

        resolve(url);
      });

      xhr.addEventListener('error', () => {
        reject(new Error(t('Network error')));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error(t('Upload aborted')));
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

  /** Nothing to release: kept so owners can treat it like the editor's other helpers. */
  destroy(): void {
    // No dialog, listeners or requests are held between uploads.
  }
}
