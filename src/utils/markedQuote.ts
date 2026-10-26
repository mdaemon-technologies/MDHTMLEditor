/**
 * The quote marker (`quote_marker_class`): the class a host puts on the element
 * wrapping a reply's quoted original. Shared by the MarkedQuote node, which
 * parses it, and flattenWrapperBlocks, which must not dissolve it, so the two
 * cannot disagree on what a marked quote is.
 */

/**
 * The configured marker as a single class name, or null when marking is off:
 * nothing configured, an empty value, or more than one class name (an exact
 * match against several would be ambiguous).
 */
export function normalizeQuoteMarkerClass(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed && !/\s/.test(trimmed) ? trimmed : null;
}

/**
 * True when the element's class is exactly the marker. `class="foo <marker>"`
 * is not a quote: the allowlist matches the whole value, not a token.
 */
export function isMarkedQuote(element: Element, markerClass: string | null): boolean {
  return !!markerClass && (element.getAttribute('class') ?? '').trim() === markerClass;
}
