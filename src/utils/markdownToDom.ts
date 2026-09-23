/**
 * Markdown → sanitized, inert DOM.
 *
 * Internal to the paste-Markdown path and deliberately not exported from
 * `src/index.ts`: it hands back DOM, never an HTML string, so a caller cannot put
 * the result into the live page with `innerHTML`. That is the whole point — a
 * sanitized string that is parsed a second time in the live document is how a
 * mutation-XSS payload gets its `onerror` back (see `sanitizePastedHtml`).
 */

import { Marked, Renderer } from 'marked';
import { sanitizeDocument } from './sanitizePastedHtml';

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Highlighting an unlabelled code block means trying every grammar, which costs
 * seconds on a large one and is paid again on each keystroke in that block. Past
 * this size, say it is plain text instead.
 */
const MAX_AUTODETECT_CODE_CHARS = 10_000;

const md = new Marked({ gfm: true, breaks: true, async: false }, {
  renderer: {
    // Raw HTML in the Markdown renders as literal text, never as markup. This
    // keeps every tag-based attack out of the pipeline rather than relying on the
    // sanitizer to recognize it, and stops raw HTML forging the editor's own
    // nodes (mentions, the signature block, anchors).
    html({ text }) {
      return escapeHtml(text);
    },
    // Task lists become plain bullets. The default renderer emits
    // '<input … type="checkbox"> ' including the trailing space, so returning ''
    // removes the box and the space together.
    checkbox() {
      return '';
    },
    code(token) {
      const rendered = Renderer.prototype.code.call(this, token);
      // The default renderer always puts a newline before </code></pre>. Kept, it
      // becomes a blank last line in the code block, because CodeBlock parses
      // <pre> with preserveWhitespace: 'full'. The pattern is anchored to that
      // output, so raw <pre> HTML in the Markdown is untouched.
      const trimmed = rendered.replace(/\n<\/code><\/pre>\n$/, '</code></pre>\n');
      if (token.lang || token.text.length <= MAX_AUTODETECT_CODE_CHARS) return trimmed;
      return trimmed.replace('<pre><code>', '<pre><code class="language-plaintext">');
    },
  },
});

/**
 * Anything a page can put on the clipboard can reach the parser, so conversion
 * runs on a budget.
 *
 * Cost follows the *shape* of the Markdown rather than its size: marked's inline
 * tokenizer backtracks over unmatched emphasis, so 220 KB of ordinary prose
 * parses in about 15 ms while 43 KB of `*a **a ` repeated takes six seconds, and
 * a single 5,000-character run of it takes nearly one. Deeply nested blockquotes
 * overflow the stack outright. No size limit separates those cases, so instead of
 * guessing, the parse is driven one inline run at a time and abandoned when it
 * runs long.
 */
export const MAX_MARKDOWN_CHARS = 256 * 1024;
export const MAX_INLINE_RUN = 5000;
/**
 * Wall-clock budget for the parse. Checked after the block pass and between
 * inline runs, so the worst case is the block pass (bounded by the size cap at
 * about a second) plus this plus one inline run (a 5,000-character pathological
 * run is about 0.9 s).
 */
export const MAX_PARSE_MS = 750;

/**
 * Markdown → HTML, or null when it is too large, too slow, or throws.
 *
 * This is marked's own `lex` + `parse`, split apart so the inline pass can be
 * timed: `blockTokens` is cheap and fills a queue of inline runs, and draining
 * that queue is the expensive half. The loop is indexed rather than a for-of
 * because tokenizing one run can append more, which is how marked drives it too.
 */
function convert(src: string): string | null {
  if (src.length > MAX_MARKDOWN_CHARS) return null;
  // The options are copied because the Lexer constructor writes a tokenizer into
  // the object it is handed, and `md.defaults` is shared with `md.parse`.
  const options = { ...md.defaults };
  const deadline = Date.now() + MAX_PARSE_MS;

  try {
    const lexer = new md.Lexer(options);
    // Fenced and indented code is never queued as an inline run, so a big code
    // block is not refused by either check below.
    const tokens = lexer.blockTokens(src.replace(/\r\n?/g, '\n'), []);
    if (Date.now() > deadline) return null;

    for (let i = 0; i < lexer.inlineQueue.length; i++) {
      const run = lexer.inlineQueue[i];
      if (run.src.length > MAX_INLINE_RUN) return null;
      lexer.inlineTokens(run.src, run.tokens);
      if (Date.now() > deadline) return null;
    }

    return md.Parser.parse(tokens, options);
  } catch {
    // Chiefly a stack overflow on deeply nested input (`'> '.repeat(3000)`).
    // Whatever it is, an unconverted paste beats a broken one: letting this
    // escape would leave the browser's own paste handling to run instead.
    return null;
  }
}

/**
 * Convert Markdown to the body of an inert, sanitized document, or null when the
 * input cannot be converted within budget — the caller then falls through to an
 * ordinary paste.
 *
 * The returned nodes are meant to be handed to a parser as nodes. Never assign
 * their HTML into the live page.
 */
export function markdownToDom(src: string): HTMLElement | null {
  const html = convert(src);
  if (html === null) return null;
  // `window.DOMParser` is spelled out because the paste extension imports
  // ProseMirror's DOMParser under the same name.
  const doc = new window.DOMParser().parseFromString(html, 'text/html');
  sanitizeDocument(doc);
  return doc.body;
}
