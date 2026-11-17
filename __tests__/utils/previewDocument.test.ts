/**
 * Preview document Tests
 * The standalone page that Preview and Print show the editor's content in.
 */

import { buildPreviewDocument, PREVIEW_CSP } from '../../src/utils/previewDocument';

describe('buildPreviewDocument', () => {
  const parse = (markup: string) => new DOMParser().parseFromString(markup, 'text/html');

  it('puts the CSP meta first in the head', () => {
    const doc = parse(buildPreviewDocument('<p>Hi</p>', 'Preview'));
    const meta = doc.head.firstElementChild;

    expect(meta?.tagName).toBe('META');
    expect(meta?.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    expect(meta?.getAttribute('content')).toBe(PREVIEW_CSP);
  });

  it('writes the CSP meta before any other element', () => {
    // The parser hoists a stray meta into <head>, so check the raw string.
    const markup = buildPreviewDocument('<p>Hi</p>', 'Preview');
    const csp = markup.search(/<meta[^>]*Content-Security-Policy/i);

    expect(csp).toBeGreaterThan(-1);
    expect(csp).toBeLessThan(markup.indexOf('<title'));
    expect(csp).toBeLessThan(markup.indexOf('<style'));
  });

  it('puts the content in the body', () => {
    const doc = parse(buildPreviewDocument('<p>Hello <strong>world</strong></p>', 'Preview'));

    expect(doc.body.textContent).toContain('Hello world');
    expect(doc.body.querySelector('strong')).not.toBeNull();
  });

  it('sets dir="rtl" on the document for right-to-left content', () => {
    expect(parse(buildPreviewDocument('<p>Hi</p>', 'Preview', 'rtl')).documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('leaves the direction to the browser default otherwise', () => {
    expect(parse(buildPreviewDocument('<p>Hi</p>', 'Preview', 'ltr')).documentElement.hasAttribute('dir')).toBe(false);
    expect(parse(buildPreviewDocument('<p>Hi</p>', 'Preview')).documentElement.hasAttribute('dir')).toBe(false);
  });

  it('writes the title as text', () => {
    const doc = parse(buildPreviewDocument('<p>Hi</p>', 'Q&A <b>notes</b>'));

    expect(doc.title).toBe('Q&A <b>notes</b>');
    expect(doc.head.querySelector('b')).toBeNull();
  });
});
