/**
 * Icon markup, as given to `ui.registry.addIcon` or as a custom button's
 * `icon`, turned into nodes that are safe to draw inline.
 *
 * Only SVG drawing elements are kept: script, event handlers, links,
 * animations (which can rewrite a link), `foreignObject` (which holds HTML)
 * and anything outside the `<svg>` are dropped, so an icon can never run
 * script, whatever markup it was given.
 *
 * As in `sanitizePastedHtml`, the markup is parsed once, into an inert
 * document, cleaned there, and handed on as nodes. It is never serialized and
 * parsed again, which is how mutation-XSS payloads get past a check.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The SVG elements an icon may use. Everything else is removed with its contents. */
const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc',
  'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect',
  'text', 'tspan',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'marker',
]);

/** Remove disallowed elements and attributes from `el` and everything inside it. */
function clean(el: Element): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
    } else if ((name === 'href' || name.endsWith(':href')) && !attr.value.startsWith('#')) {
      // Only a link to another part of the icon (`<use href="#id">`).
      el.removeAttribute(attr.name);
    }
  }
  for (const child of Array.from(el.children)) {
    if (child.namespaceURI === SVG_NS && ALLOWED_ELEMENTS.has(child.localName)) {
      clean(child);
    } else {
      child.remove();
    }
  }
}

/**
 * The `<svg>` elements at the top level of `markup`, cleaned, in a fragment
 * owned by the current document. Anything else at the top level (an XML
 * prolog, comments, text, HTML) is left out. Empty when there is no `<svg>`.
 */
export function parseSvgIcon(markup: string): DocumentFragment {
  // A DOMParser document is inert: nothing in it loads or runs.
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  const fragment = document.createDocumentFragment();
  for (const child of Array.from(parsed.body.children)) {
    if (child.namespaceURI === SVG_NS && child.localName === 'svg') {
      clean(child);
      fragment.appendChild(document.adoptNode(child));
    }
  }
  return fragment;
}
