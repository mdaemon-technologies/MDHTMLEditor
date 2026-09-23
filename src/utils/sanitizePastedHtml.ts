/**
 * Shared paste sanitizer.
 *
 * Defense-in-depth for every path that turns outside HTML into editor content:
 * the TipTap schema already drops what it does not know, but content is stripped
 * here first so nothing dangerous is ever held in a DOM the host page can reach.
 *
 * It takes a parsed `Document` and mutates it in place. It deliberately does not
 * offer a string-in/string-out form: sanitizing a document, serializing it and
 * re-parsing the result is how mutation-XSS payloads get through, because the
 * second parse can build a different tree from the one that was checked (for
 * example `<math><mtext><table><mglyph><style><img onerror>`). Callers parse once,
 * into an inert document, sanitize that, and hand the nodes on as nodes.
 */

/**
 * Tags removed entirely, whatever they contain.
 *
 * The second row is not dangerous in itself — the schema renders none of it — but
 * each one is parsed differently from ordinary markup (`style`, `noscript` and
 * `template` hold raw text; `svg` and `math` open a foreign namespace), which is
 * exactly what mutation-XSS payloads are built out of. Dropping them keeps the
 * tree that was checked and the tree that is used the same shape.
 */
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'applet',
  'form', 'input', 'textarea', 'select', 'button',
  'style', 'link', 'meta', 'base', 'noscript',
  'template', 'svg', 'math', 'frame', 'frameset',
];

const EVENT_ATTR_PATTERN = /^on/i;
const DANGEROUS_URL_PATTERN = /^(javascript|vbscript|data:(?!image))/i;

/** Attributes whose value is a URL, so it has to be checked before it is kept. */
const URL_ATTRS = new Set([
  'href', 'src', 'action', 'formaction', 'xlink:href',
  'poster', 'background', 'data', 'cite', 'srcset', 'ping',
]);

/**
 * Reduce a URL to what the browser will act on: it ignores ASCII whitespace and
 * C0/C1 control characters anywhere in the scheme, so `java&#9;script:` navigates
 * exactly like `javascript:` while reading as harmless to a naive check.
 */
function normalizeUrl(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000- \u007F-\u009F]/g, '');
}

/** `data:image/...` is how a pasted or embedded image travels; other data: URLs are not. */
function isDangerousUrl(attrName: string, value: string): boolean {
  const url = normalizeUrl(value);
  if (attrName !== 'src' && /^data:/i.test(url)) return true;
  return DANGEROUS_URL_PATTERN.test(url);
}

/**
 * Remove dangerous elements and attributes.
 * Defense-in-depth: TipTap's schema will also reject these,
 * but we strip them early to be safe.
 */
export function sanitizeDocument(doc: Document): void {
  // Remove dangerous elements
  for (const tag of DANGEROUS_TAGS) {
    const elements = Array.from(doc.body.querySelectorAll(tag));
    for (const el of elements) {
      el.remove();
    }
  }

  // Remove dangerous attributes from all elements
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of allElements) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      // Remove event handlers
      if (EVENT_ATTR_PATTERN.test(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Remove dangerous URLs
      if (URL_ATTRS.has(attr.name.toLowerCase()) && isDangerousUrl(attr.name.toLowerCase(), attr.value)) {
        el.removeAttribute(attr.name);
      }
    }

    // Strip file:// URLs (Word-local image references)
    const src = el.getAttribute('src');
    if (src && src.startsWith('file://')) {
      el.removeAttribute('src');
    }
    const href = el.getAttribute('href');
    if (href && href.startsWith('file://')) {
      el.removeAttribute('href');
    }
  }
}
