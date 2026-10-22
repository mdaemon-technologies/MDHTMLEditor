/**
 * Markdown → inert DOM conversion.
 *
 * `markdownToDom` returns the body of an inert document, so these tests read
 * `innerHTML` rather than assigning it. Reading is safe; assigning into the live
 * page is the thing the whole design avoids.
 */

import { Lexer, Marked } from 'marked';
import { markdownToDom, MAX_INLINE_RUN, MAX_MARKDOWN_CHARS, MAX_PARSE_MS } from '../../src/utils/markdownToDom';

/** The rendered markup, for shape assertions. */
function html(src: string): string {
  const body = markdownToDom(src);
  expect(body).not.toBeNull();
  return body!.innerHTML;
}

describe('markdownToDom', () => {
  it('should return the body of an inert document, not one in the live page', () => {
    const body = markdownToDom('hello')!;

    expect(body.tagName).toBe('BODY');
    expect(body.ownerDocument).not.toBe(document);
    expect(body.ownerDocument.defaultView).toBeNull();
  });

  describe('block syntax', () => {
    it('should convert headings', () => {
      expect(html('# One\n\n## Two')).toContain('<h1>One</h1>');
      expect(html('# One\n\n## Two')).toContain('<h2>Two</h2>');
    });

    it('should convert plain prose to a paragraph', () => {
      expect(html('just words')).toBe('<p>just words</p>\n');
    });

    it('should convert bullet, ordered and nested lists', () => {
      expect(html('- a\n- b')).toContain('<ul>');
      expect(html('1. a\n2. b')).toContain('<ol>');
      expect(html('- a\n  - b')).toMatch(/<ul>[\s\S]*<ul>/);
    });

    it('should convert a blockquote and a horizontal rule', () => {
      expect(html('> quoted')).toContain('<blockquote>');
      expect(html('---')).toContain('<hr>');
    });

    it('should convert a GFM table', () => {
      const out = html('| a | b |\n| --- | --- |\n| 1 | 2 |');

      expect(out).toContain('<table>');
      expect(out).toContain('<th>a</th>');
      expect(out).toContain('<td>1</td>');
    });
  });

  describe('inline syntax', () => {
    it('should convert bold, italic, strikethrough and code', () => {
      expect(html('**b**')).toContain('<strong>b</strong>');
      expect(html('*i*')).toContain('<em>i</em>');
      expect(html('~~s~~')).toContain('<del>s</del>');
      expect(html('`c`')).toContain('<code>c</code>');
    });

    it('should convert links', () => {
      expect(html('[text](https://example.com)')).toContain('<a href="https://example.com">text</a>');
    });

    it('should keep escaped syntax literal', () => {
      expect(html('\\*not italic\\*')).toContain('*not italic*');
      expect(html('\\*not italic\\*')).not.toContain('<em>');
    });
  });

  describe('line breaks (breaks: true)', () => {
    it('should turn a single newline into a <br> in a paragraph', () => {
      expect(html('line one\nline two')).toBe('<p>line one<br>line two</p>\n');
    });

    it('should turn a single newline into a <br> in a list item and a blockquote', () => {
      expect(html('- a\nb')).toContain('a<br>b');
      expect(html('> q1\n> q2')).toContain('q1<br>q2');
    });

    it('should start a new paragraph on a blank line', () => {
      const out = html('one\n\ntwo');

      expect(out).toContain('<p>one</p>');
      expect(out).toContain('<p>two</p>');
      expect(out).not.toContain('<br>');
    });

    it('should not leave a stray <br> at the end of a block', () => {
      expect(html('line one\nline two\n')).not.toContain('<br></p>');
      expect(html('only\n')).toBe('<p>only</p>\n');
    });

    it('should not add <br> inside fenced code', () => {
      expect(html('```\nx = 1;\ny\n```')).toContain('x = 1;\ny');
      expect(html('```\nx = 1;\ny\n```')).not.toContain('<br>');
    });

    it('should handle CRLF input', () => {
      expect(html('line one\r\nline two')).toBe('<p>line one<br>line two</p>\n');
      expect(html('one\r\n\r\ntwo')).toContain('<p>two</p>');
    });
  });

  describe('code blocks', () => {
    it('should keep the language class', () => {
      expect(html('```js\nx = 1;\n```')).toContain('<code class="language-js">');
    });

    it('should not end a code block with a blank line', () => {
      expect(html('```js\nx = 1;\ny\n```')).toContain('x = 1;\ny</code></pre>');
      expect(html('```\nplain\n```')).toContain('plain</code></pre>');
      expect(html('    indented')).toContain('indented</code></pre>');
    });

    it('should render an empty fence as an empty code block', () => {
      expect(html('```\n```')).toContain('<pre><code></code></pre>');
    });

    it('should mark a large unlabelled block as plaintext, so it is not auto-detected', () => {
      const big = 'x'.repeat(10_001);
      const small = 'x'.repeat(100);

      expect(html('```\n' + big + '\n```')).toContain('<code class="language-plaintext">');
      expect(html('    ' + big)).toContain('<code class="language-plaintext">');
      expect(html('```\n' + small + '\n```')).toContain('<pre><code>');
      // An explicit language is never overridden.
      expect(html('```js\n' + big + '\n```')).toContain('<code class="language-js">');
    });
  });

  describe('task lists', () => {
    it('should render tight task items as plain bullets', () => {
      const out = html('- [ ] a\n- [x] b');

      expect(out).toContain('<li>a</li>');
      expect(out).toContain('<li>b</li>');
      expect(out).not.toContain('<input');
      expect(out).not.toContain('[ ]');
    });

    it('should render loose task items as plain bullets', () => {
      const out = html('- [ ] a\n\n- [x] b');

      expect(out).toContain('<p>a</p>');
      expect(out).not.toContain('<input');
    });

    it('should render ordered and nested task items as plain items', () => {
      expect(html('1. [ ] a')).not.toContain('<input');
      expect(html('- [ ] a\n  - [x] b')).not.toContain('<input');
    });

    it('should keep inline formatting in a task item', () => {
      expect(html('- [ ] **a** b')).toContain('<li><strong>a</strong> b</li>');
    });

    it('should leave a checkbox with no text literal, as GFM does', () => {
      expect(html('- [ ]')).toContain('[ ]');
    });
  });

  describe('security', () => {
    // Raw HTML is rendered as text. These payloads are well-formed on purpose:
    // marked degrades malformed raw HTML to text on its own, which would make a
    // test pass without testing anything. The control below proves that.
    const payloads: [string, string][] = [
      ['block img', '<img src="x" onerror="alert(1)">'],
      ['inline img', 'text <img src="x" onerror="alert(1)"> more'],
      ['mutation payload', '<math><mtext><table><mglyph><style><img src="x" onerror="alert(1)"></style></mglyph></table></mtext></math>'],
      ['noscript', '<noscript><p title="</noscript><img src=&quot;x&quot; onerror=&quot;alert(1)&quot;>"></p></noscript>'],
      ['svg style', '<svg><style><img src="x" onerror="alert(1)"></style></svg>'],
      ['iframe srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
      ['form formaction', '<form><button formaction="javascript:alert(1)">x</button></form>'],
      ['body onload', '<body onload="alert(1)">'],
      ['details ontoggle', '<details ontoggle="alert(1)" open="open">x</details>'],
      ['base', '<base href="https://evil.example/">'],
      ['raw html in a heading', '# <img src="x" onerror="alert(1)">'],
      ['raw html in a quote', '> <img src="x" onerror="alert(1)">'],
      ['raw html in a table cell', '| a |\n| --- |\n| <img src="x" onerror="alert(1)"> |'],
    ];

    it.each(payloads)('should not produce script or handlers from %s', (_name, src) => {
      const body = markdownToDom(src)!;

      // The payload may well appear as visible text — that is the point. What
      // must not exist is an element carrying it as markup.
      for (const el of Array.from(body.querySelectorAll('*'))) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name.toLowerCase()).not.toMatch(/^on/);
          expect(attr.value.replace(/[\u0000- ]/g, '').toLowerCase()).not.toMatch(
            /^(javascript|vbscript|data:(?!image))/
          );
        }
      }
      expect(body.querySelector('script, iframe, style, svg, math, base, noscript, form, input')).toBeNull();
    });

    it('should render raw HTML as visible text', () => {
      const out = html('<img src="x" onerror="alert(1)">');

      expect(out).toContain('&lt;img');
      expect(markdownToDom('<b>bold</b>')!.textContent).toContain('<b>bold</b>');
    });

    it('control: the payloads really are markup to an unconfigured marked', () => {
      // If this ever fails, the payloads have gone malformed and the tests above
      // would be passing for the wrong reason.
      const plain = new Marked({ gfm: true, breaks: true, async: false });

      for (const [, src] of payloads) {
        expect(plain.parse(src, { async: false })).toMatch(/<(img|iframe|style|svg|math|base|noscript|form|body|details)/i);
      }
    });

    it.each([
      ['plain', '[x](javascript:alert(1))'],
      ['entity tab', '[x](java&#9;script:alert(1))'],
      ['upper case', '[x](JAVASCRIPT:alert(1))'],
      ['data url', '[x](data:text/html;base64,PHNjcmlwdD4=)'],
    ])('should strip a dangerous link href (%s)', (_name, src) => {
      const a = markdownToDom(src)!.querySelector('a');

      expect(a?.hasAttribute('href')).toBe(false);
      expect(a?.textContent).toBe('x');
    });

    it('should strip a javascript: image src and keep a data:image one', () => {
      expect(markdownToDom('![a](javascript:alert(1))')!.querySelector('img')?.hasAttribute('src')).toBe(false);

      const data = 'data:image/png;base64,iVBORw0KGgo=';
      expect(markdownToDom(`![a](${data})`)!.querySelector('img')?.getAttribute('src')).toBe(data);
    });

    it('should escape quotes marked writes into its own attributes', () => {
      const body = markdownToDom('![a" onerror="alert(1)](x)')!;
      const img = body.querySelector('img')!;

      // The quote stays inside the alt text instead of starting a new attribute.
      expect(img.hasAttribute('onerror')).toBe(false);
      expect(img.getAttribute('alt')).toBe('a" onerror="alert(1)');
      expect(body.innerHTML).toContain('&quot;');
    });
  });

  describe('size guard', () => {
    // How much inline parsing a conversion did, counted in `inlineTokens` calls
    // rather than timed, so how fast the test machine is cannot fail these
    // assertions.
    let inlineRuns: jest.SpiedFunction<typeof Lexer.prototype.inlineTokens>;

    beforeEach(() => {
      inlineRuns = jest.spyOn(Lexer.prototype, 'inlineTokens');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should refuse input over the character limit', () => {
      expect(markdownToDom('a'.repeat(MAX_MARKDOWN_CHARS + 1))).toBeNull();
    });

    it('should refuse a single inline run over the limit', () => {
      expect(markdownToDom('a'.repeat(MAX_INLINE_RUN + 1))).toBeNull();
      // Same run, split over single-newline lines: still one inline run under breaks: true.
      expect(markdownToDom(('a'.repeat(70) + '\n').repeat(90))).toBeNull();
      expect(markdownToDom('# ' + 'a'.repeat(MAX_INLINE_RUN + 1))).toBeNull();
      expect(markdownToDom('| a |\n| --- |\n| ' + 'a'.repeat(MAX_INLINE_RUN + 1) + ' |')).toBeNull();
    });

    it('should refuse a pathological emphasis run without inline parsing it', () => {
      expect(markdownToDom('*a **a '.repeat(3000))).toBeNull();
      expect(inlineRuns).not.toHaveBeenCalled();
    });

    it('should refuse many pathological runs that each fit under the per-run limit', () => {
      // Cost follows shape, not size: each of these 52 paragraphs is under the
      // per-run cap, but together they would take ~20 seconds to parse. Every
      // size check passes, so null here comes from the time budget.
      //
      // The clock is the test's own: each run costs RUN_MS of it, about what
      // one of these paragraphs really takes, so the run that crosses the
      // budget is the same on every machine. The parse must stop right after
      // it, not finish and throw the result away.
      const RUN_MS = 400;
      let now = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      inlineRuns.mockImplementation(() => {
        now += RUN_MS;
        return [];
      });

      expect(markdownToDom(('*a **a '.repeat(625) + '\n\n').repeat(52))).toBeNull();
      expect(inlineRuns).toHaveBeenCalledTimes(Math.floor(MAX_PARSE_MS / RUN_MS) + 1);
    });

    it('should keep the time budget to at most a second', () => {
      // A refused paste waits for the block pass, this budget and one more
      // inline run before it falls through to an ordinary paste.
      expect(MAX_PARSE_MS).toBeLessThanOrEqual(1000);
    });

    it('should return null rather than throw on deeply nested input', () => {
      // Nested blockquotes recurse per level and overflow the parser's stack.
      // Letting that throw would abandon the paste mid-flight and leave the
      // browser's own handling to run instead.
      //
      // How deep it takes to overflow depends on the stack size the process was
      // started with, so the guarantee under test is "never throws"; 10,000
      // levels overflows even with an enlarged stack, and converting it would be
      // just as acceptable as refusing it.
      expect(() => markdownToDom('> '.repeat(10_000) + 'x')).not.toThrow();
      expect(() => markdownToDom('- '.repeat(10_000) + 'x')).not.toThrow();
    });

    it('should convert input at the limit and large input split into blocks', () => {
      expect(markdownToDom('a'.repeat(MAX_INLINE_RUN))).not.toBeNull();
      // The spy sees the converter's inline parsing, one call per plain run, so
      // the counts in the tests above are of real calls.
      expect(inlineRuns).toHaveBeenCalledTimes(1);
      expect(markdownToDom(('a'.repeat(100) + '\n\n').repeat(500))).not.toBeNull();
      // A big fenced block is not an inline run, so it is not refused.
      expect(markdownToDom('```\n' + 'x'.repeat(80_000) + '\n```')).not.toBeNull();
    });
  });
});
