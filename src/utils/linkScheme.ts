/**
 * Which link addresses the editor keeps.
 *
 * TipTap's own check allows only a short list of schemes (http, https, ftp,
 * ftps, mailto, tel, callto, sms, cid, xmpp) plus addresses without one.
 * Desktop applications register schemes of their own (`notes:`, `outlook:`,
 * or one with a dot, such as `example.dms:`), and the schemes differ from one
 * site to the next, so no list can name them all. Like TinyMCE, the editor
 * allows any other scheme too, except the ones that are never a link target.
 */

import { isAllowedUri } from '@tiptap/extension-link';
import { normalizeUrl } from './sanitizePastedHtml';

/** A URL scheme as RFC 3986 spells it: a letter, then letters, digits, "+", "-" or ".". */
export const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Never a link target: script (`javascript:`, `vbscript:`, `mhtml:`) and a
 * whole document (`data:`), which TinyMCE refuses too, plus local files
 * (`file:`) and the page's own objects (`blob:`, `filesystem:`), which never
 * work for the reader of saved content.
 */
const BLOCKED = /^(?:javascript|vbscript|mhtml|data|file|blob|filesystem):/i;

/**
 * True when `href` uses one of the blocked schemes.
 *
 * The check runs with whitespace and control characters removed, so
 * `java&#9;script:` is `javascript:`. TipTap's own check removes fewer of
 * them, so this one runs first. No percent-decoding is needed: a scheme
 * can't hold a `%`, and browsers never decode one, so `java%73cript:` is a
 * relative path.
 */
export function isBlockedSchemeHref(href: string | undefined): boolean {
  return !!href && BLOCKED.test(normalizeUrl(href));
}

/** True when `href` names a scheme of its own that is not a blocked one. */
export function isSafeCustomSchemeHref(href: string): boolean {
  return SCHEME.test(normalizeUrl(href)) && !isBlockedSchemeHref(href);
}

/**
 * The check every link in the editor gets: a text link, an image's link and an
 * image-map area's link. TipTap's own check, widened to application schemes,
 * with the blocked schemes refused first.
 *
 * `defaultValidate` is TipTap's check; the Link mark passes its own, which
 * knows the mark's `protocols` option.
 */
export function isAllowedLinkHref(
  href: string,
  defaultValidate: (url: string) => boolean = (url) => !!isAllowedUri(url),
): boolean {
  // TipTap passes an absent href through as well, which its own check allows.
  if (isBlockedSchemeHref(href)) return false;
  return defaultValidate(href) || (!!href && isSafeCustomSchemeHref(href));
}
