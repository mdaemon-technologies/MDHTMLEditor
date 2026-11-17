/**
 * A link address as the user typed it, made usable as an href. Shared by the
 * link dialog and the image dialog's Link tab.
 */

/**
 * Domain-like input typed without a scheme ("www.example.com",
 * "example.com/path") would otherwise resolve as a relative path and produce
 * a broken link, so a default protocol is added. Anchors (#...),
 * relative/absolute paths, protocol-relative URLs (//host) and anything with
 * an existing scheme are left alone.
 */
export function normalizeLinkAddress(url: string): string {
  if (!url) return url;

  // Already has a scheme (http:, https:, mailto:, tel:, ftp:, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;

  // Protocol-relative, anchor, or relative/absolute path — leave untouched
  if (
    url.startsWith('//') ||
    url.startsWith('#') ||
    url.startsWith('/') ||
    url.startsWith('./') ||
    url.startsWith('../')
  ) {
    return url;
  }

  // Looks like a bare domain ("www.example.com", "example.com/path") — add protocol
  if (/^(www\.|[^\s/?#@]+\.[a-z]{2,})(?:[/?#:]|$)/i.test(url)) {
    return `http://${url}`;
  }

  return url;
}
