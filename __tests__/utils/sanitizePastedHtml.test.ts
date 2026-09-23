/**
 * Shared paste sanitizer.
 *
 * Extracted from PasteFromOffice so the Markdown paste path can reuse it. It
 * works on a parsed, inert document and mutates it in place — deliberately not
 * on an HTML string, because serializing sanitized DOM and re-parsing it is the
 * mutation-XSS path (a `<math><mtext><table><mglyph><style><img onerror>` payload
 * survives that round trip).
 */

import { sanitizeDocument } from '../../src/utils/sanitizePastedHtml';

/** Sanitize a fragment the way the paste paths do, and hand back the body. */
function sanitize(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeDocument(doc);
  return doc.body;
}

describe('sanitizeDocument', () => {
  describe('dangerous elements', () => {
    it.each([
      'script',
      'iframe',
      'object',
      'embed',
      'applet',
      'form',
      'input',
      'textarea',
      'select',
      'button',
    ])('should remove <%s>', (tag) => {
      const body = sanitize(`<p>before</p><${tag}></${tag}><p>after</p>`);

      expect(body.querySelector(tag)).toBeNull();
      expect(body.textContent).toContain('before');
      expect(body.textContent).toContain('after');
    });

    it('should remove a script with content', () => {
      const body = sanitize('<p>a</p><script>alert(1)</script>');

      expect(body.querySelector('script')).toBeNull();
      expect(body.innerHTML).not.toContain('alert(1)');
    });
  });

  describe('event handler attributes', () => {
    it.each(['onerror', 'onload', 'onclick', 'ONERROR', 'onfocus'])(
      'should remove %s',
      (attr) => {
        const body = sanitize(`<img src="x" ${attr}="alert(1)">`);

        expect(body.querySelector('img')?.hasAttribute(attr)).toBe(false);
        expect(body.innerHTML).not.toContain('alert(1)');
      }
    );

    it('should keep the element the handler was on', () => {
      const body = sanitize('<img src="pic.png" onerror="alert(1)">');

      expect(body.querySelector('img')?.getAttribute('src')).toBe('pic.png');
    });
  });

  describe('dangerous URLs', () => {
    it('should strip a javascript: href', () => {
      const body = sanitize('<a href="javascript:alert(1)">x</a>');

      expect(body.querySelector('a')?.hasAttribute('href')).toBe(false);
      expect(body.textContent).toBe('x');
    });

    it('should strip a vbscript: href', () => {
      expect(
        sanitize('<a href="vbscript:msgbox(1)">x</a>').querySelector('a')?.hasAttribute('href')
      ).toBe(false);
    });

    it('should strip a javascript: src', () => {
      expect(
        sanitize('<img src="javascript:alert(1)">').querySelector('img')?.hasAttribute('src')
      ).toBe(false);
    });

    it('should keep ordinary URLs', () => {
      const body = sanitize('<a href="https://example.com/a?b=1">x</a><img src="/img/a.png">');

      expect(body.querySelector('a')?.getAttribute('href')).toBe('https://example.com/a?b=1');
      expect(body.querySelector('img')?.getAttribute('src')).toBe('/img/a.png');
    });

    it('should keep a data:image src', () => {
      const src = 'data:image/png;base64,iVBORw0KGgo=';

      expect(sanitize(`<img src="${src}">`).querySelector('img')?.getAttribute('src')).toBe(src);
    });

    it('should strip a non-image data: URL', () => {
      expect(
        sanitize('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')
          .querySelector('a')
          ?.hasAttribute('href')
      ).toBe(false);
    });

    it('should strip file:// URLs, which Word uses for local images', () => {
      const body = sanitize('<img src="file:///C:/temp/image001.png"><a href="file:///C:/x.doc">x</a>');

      expect(body.querySelector('img')?.hasAttribute('src')).toBe(false);
      expect(body.querySelector('a')?.hasAttribute('href')).toBe(false);
    });
  });

  describe('hardening', () => {
    // These are the shapes a blocklist sanitizer is usually defeated by: elements
    // whose content is parsed as raw text (so a re-parse can reveal markup), and
    // URL attributes beyond href/src.
    it.each([
      'style',
      'link',
      'meta',
      'base',
      'noscript',
      'template',
      'svg',
      'math',
      'frame',
      'frameset',
    ])('should remove <%s>', (tag) => {
      const body = sanitize(`<p>before</p><${tag}></${tag}><p>after</p>`);

      expect(body.querySelector(tag)).toBeNull();
      expect(body.textContent).toContain('before');
      expect(body.textContent).toContain('after');
    });

    it('should remove a <style> block with rules', () => {
      const body = sanitize('<style>body { background: url(javascript:alert(1)) }</style><p>a</p>');

      expect(body.querySelector('style')).toBeNull();
      expect(body.innerHTML).not.toContain('javascript');
    });

    it.each([
      ['a tab inside the scheme', 'java\tscript:alert(1)'],
      ['a newline inside the scheme', 'java\nscript:alert(1)'],
      ['a leading control character', '\u0001javascript:alert(1)'],
      ['a leading space', '  javascript:alert(1)'],
      ['mixed case', 'JaVaScRiPt:alert(1)'],
    ])('should strip a javascript: href disguised by %s', (_name, href) => {
      const a = sanitize(`<a href="${href.replace(/"/g, '&quot;')}">x</a>`).querySelector('a');

      expect(a?.hasAttribute('href')).toBe(false);
    });

    it.each(['formaction', 'poster', 'background', 'data', 'cite', 'ping', 'srcset'])(
      'should strip a javascript: %s',
      (attr) => {
        // On a <p>, because the tags these attributes belong to are removed outright.
        const body = sanitize(`<p ${attr}="javascript:alert(1)">x</p>`);

        expect(body.querySelector('p')?.hasAttribute(attr)).toBe(false);
      }
    );

    it('should strip a javascript: xlink:href', () => {
      const body = sanitize('<p xlink:href="javascript:alert(1)">x</p>');

      expect(body.querySelector('p')?.hasAttribute('xlink:href')).toBe(false);
    });

    it('should keep a data:image src but strip a data:image href', () => {
      const src = 'data:image/png;base64,iVBORw0KGgo=';
      const body = sanitize(`<img src="${src}"><a href="${src}">x</a>`);

      expect(body.querySelector('img')?.getAttribute('src')).toBe(src);
      expect(body.querySelector('a')?.hasAttribute('href')).toBe(false);
    });

    it('should not run a mutation payload that survives a serialize/re-parse', () => {
      // The sanitizer sees the <img> as text inside <style>; removing <style>
      // takes the payload with it, so a later re-parse cannot revive it.
      const body = sanitize(
        '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>'
      );

      expect(body.innerHTML).not.toContain('onerror');
      expect(body.querySelector('img[onerror]')).toBeNull();
    });
  });

  it('should leave ordinary markup alone', () => {
    const body = sanitize(
      '<p style="color: red">a <strong>b</strong> <em>c</em></p><table><tbody><tr><td>d</td></tr></tbody></table>'
    );

    expect(body.querySelector('p')?.getAttribute('style')).toBe('color: red');
    expect(body.querySelector('strong')?.textContent).toBe('b');
    expect(body.querySelector('td')?.textContent).toBe('d');
  });
});
