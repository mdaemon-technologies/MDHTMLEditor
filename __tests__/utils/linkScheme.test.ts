/**
 * Which link addresses the editor keeps.
 *
 * TipTap's own check allows a short list of schemes. On top of it, any other
 * scheme is allowed except the ones that run script, hold a whole document or
 * point at local or page-owned objects, as TinyMCE does.
 */

import { isAllowedLinkHref, isSafeCustomSchemeHref } from '../../src/utils/linkScheme';

const APP_SCHEMES = [
  'example.dms:1|<ID>',
  'example.dms:1%7C%3CID%3E',
  'x-example-app:open?id=42',
  'notes://server/db',
  'outlook:00000000ABC',
  'APP+X.Y-Z:1',
];

const REFUSED = [
  'javascript:alert(1)',
  'JAVASCRIPT:alert(1)',
  ' javascript:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  '\u0001javascript:alert(1)',
  'java\u0085script:alert(1)',
  'data\u0085:text/html,x',
  'vbscript:msgbox(1)',
  'mhtml:file://x!y',
  'data:text/html,<script>alert(1)</script>',
  'data:image/png;base64,AAAA',
  'file:///c:/x',
  'blob:https://example.com/1',
  'filesystem:https://example.com/temporary/x.html',
];

describe('isSafeCustomSchemeHref', () => {
  it.each(APP_SCHEMES)('accepts %j', (href) => {
    expect(isSafeCustomSchemeHref(href)).toBe(true);
  });

  it.each(REFUSED)('refuses %j', (href) => {
    expect(isSafeCustomSchemeHref(href)).toBe(false);
  });

  it.each([
    ['an address without a scheme', 'example.com/page'],
    ['an anchor', '#top'],
    ['a path', '/contact'],
    ['an empty address', ''],
    ['a scheme starting with a digit', '1abc:x'],
  ])('does not treat %s as a scheme of its own', (_name, href) => {
    expect(isSafeCustomSchemeHref(href)).toBe(false);
  });
});

describe('isAllowedLinkHref', () => {
  it.each(APP_SCHEMES)('allows %j', (href) => {
    expect(isAllowedLinkHref(href)).toBe(true);
  });

  it.each([
    'https://example.com/',
    'http://example.com/',
    'mailto:info@example.com',
    'tel:+15550100',
    'cid:part1@example.com',
    '#top',
    '/contact',
    '',
  ])('still allows %j, as TipTap does', (href) => {
    expect(isAllowedLinkHref(href)).toBe(true);
  });

  it.each(REFUSED)('refuses %j', (href) => {
    expect(isAllowedLinkHref(href)).toBe(false);
  });
});
