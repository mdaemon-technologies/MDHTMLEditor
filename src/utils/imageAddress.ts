/**
 * The check an image address passes before a dialog stores it: the image
 * dialog's Source and the Insert video dialog's thumbnail. Content inserted as
 * nodes skips the parse rules, so the dialogs check it themselves.
 */

// eslint-disable-next-line no-control-regex
export const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

const isWebProtocol = (protocol: string) => protocol === 'https:' || protocol === 'http:';

/**
 * An http(s) address, as the browser reads it, or a relative one (which the
 * page's own address makes http(s)), without control characters. Null for
 * anything else, including an address with a backslash: browsers read it as a
 * slash, and some mail clients read a leading pair as a network path.
 */
export function webImageAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Cleaned first, and checked as stored: a control character inside a scheme
  // (java\u0001script:) would otherwise read as a relative path, pass, and
  // become a scheme again once removed.
  const text = value.replace(CONTROL_CHARACTERS, '').trim();
  if (!text || text.includes('\\')) return null;
  try {
    const url = new URL(text);
    return isWebProtocol(url.protocol) ? url.href : null;
  } catch {
    // Not absolute: relative to the page.
  }
  try {
    return isWebProtocol(new URL(text, 'https://relative.invalid/').protocol) ? text : null;
  } catch {
    return null;
  }
}
