/**
 * A link address as the user typed it, made usable as an href. Shared by the
 * link dialog and the image dialog's Link tab.
 */

import { SCHEME } from './linkScheme';

/**
 * A dotted host ("www.example.com", "127.0.0.1") or "localhost", then a port,
 * then a path, query, fragment or nothing.
 */
const HOST_AND_PORT = /^(?:[^\s/?#@:.]+(?:\.[^\s/?#@:.]+)+|localhost):\d+(?:[/?#]|$)/i;

/**
 * Domain-like input typed without a scheme ("www.example.com",
 * "example.com/path") would otherwise resolve as a relative path and produce
 * a broken link, so a default protocol is added. Anchors (#...),
 * relative/absolute paths, protocol-relative URLs (//host) and anything with
 * an existing scheme are left alone.
 */
export function normalizeLinkAddress(url: string): string {
  if (!url) return url;

  // A host and port ("example.com:8080/page", "localhost:3000") reads as a
  // scheme ("example.com:"), so it is caught first. A dotted application
  // scheme followed by more than digits ("example.dms:1|x") is left as typed,
  // and so is a scheme without a dot ("x-example-app:12345"), as a name
  // without one can't be told from a scheme.
  if (HOST_AND_PORT.test(url)) return `http://${url}`;

  // Already has a scheme (http:, https:, mailto:, tel:, ftp:, etc.)
  if (SCHEME.test(url)) return url;

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
