import { CONTENT_BEARING } from './fillEmptyBlocks';
import { isMarkedQuote, normalizeQuoteMarkerClass } from './markedQuote';

/**
 * Elements that occupy a line of their own. A block whose children include one
 * of these is a *container* of lines, not a line itself.
 */
const BLOCK_LEVEL =
  'address, article, aside, blockquote, div, dl, fieldset, figure, footer, form,' +
  ' h1, h2, h3, h4, h5, h6, header, hr, main, nav, ol, p, pre, section, table, ul';

/**
 * The block elements this pass will consider unwrapping. Deliberately just the
 * two generic ones: a `<blockquote>`, `<li>` or `<td>` holding blocks is a real
 * node in the schema with block content, so its nesting survives the parse and
 * must be kept. Only `<div>` and `<p>` map onto the editor's single-line
 * paragraph node, which is where the nesting cannot survive.
 */
const UNWRAPPABLE = 'div, p';

/**
 * Blocks that own their nesting and must never be unwrapped, however
 * block-shaped their contents. `div[id="signature"]` is SignatureBlock's parse
 * target (priority 100, see src/extensions/SignatureBlock.ts): unwrapping it
 * would dissolve the signature into ordinary paragraphs. A div whose class is
 * exactly the configured quote marker is protected too (see isQuoteContainer),
 * or a quote holding only blocks would lose the marker it is found by.
 */
const PROTECTED = 'div[id="signature"]';

/**
 * A div MarkedQuote parses as a reply's quoted original. Only a div: that node
 * has no rule for a marked <p>, which is unwrapped like any other.
 */
function isQuoteContainer(el: Element, markerClass: string | null): boolean {
  return el.tagName === 'DIV' && isMarkedQuote(el, markerClass);
}

/** Whitespace that collapses to nothing when HTML is rendered. Not `\s` — that
 * also matches U+00A0, which does not collapse and is real content. */
const COLLAPSIBLE_WHITESPACE = /[ \t\n\r\f\v]+/g;

/**
 * Inherited style properties worth carrying down when a wrapper is dissolved.
 * Restricted to the ones that CSS inherits anyway, so hoisting them onto the
 * children reproduces what the wrapper was already doing. Box properties
 * (border, background, padding, margin) are deliberately absent: they describe
 * the wrapper itself and cannot be re-expressed on n children.
 */
const INHERITED_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'line-height',
  'text-align',
  'text-indent',
  'direction',
];

/** A text node that renders nothing: only whitespace the HTML spec collapses. */
function isCollapsibleText(node: Node): boolean {
  return node.nodeType === 3 /* Node.TEXT_NODE */ && (node.nodeValue ?? '').replace(COLLAPSIBLE_WHITESPACE, '') === '';
}

/**
 * True when the element is a wrapper: a `<div>`/`<p>` that contains at least one
 * block-level element and no text of its own.
 *
 * The "no text of its own" half matters — `<div>lead text<div>A</div></div>`
 * has a line's worth of content before the nested block, and ProseMirror
 * already handles that case correctly by opening a paragraph for the text.
 * Unwrapping it would gain nothing and risk reordering.
 *
 * A genuinely empty `<div></div>` is not a wrapper either: it has no block
 * child, so it fails the first test and is left alone. That is a blank line the
 * author typed, and `format_empty_lines` is what decides its fate.
 */
function isWrapper(el: Element, markerClass: string | null): boolean {
  if (el.matches(PROTECTED) || isQuoteContainer(el, markerClass)) return false;
  // Cheap bail for the overwhelmingly common case — an ordinary line of text
  // holds no block at any depth, so it never reaches the child scans below.
  if (!el.querySelector(BLOCK_LEVEL)) return false;

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3 /* Node.TEXT_NODE */ && !isCollapsibleText(node)) return false;
  }

  // At least one *direct* child is a block; a block buried inside an inline
  // (invalid HTML the parser has usually already fixed) is not our business.
  return Array.from(el.children).some((child) => child.matches(BLOCK_LEVEL));
}

/**
 * Push the wrapper's inherited style onto a child, without overriding anything
 * the child already states. The child is the more specific author intent, and
 * in CSS it would have won by inheritance rules anyway.
 */
function inheritStyle(wrapper: Element, child: Element): void {
  const from = (wrapper as HTMLElement).style;
  if (!from || from.length === 0) return;
  if (!(child as HTMLElement).style) return;
  const to = (child as HTMLElement).style;

  for (const property of INHERITED_PROPERTIES) {
    const value = from.getPropertyValue(property);
    if (!value) continue;
    if (to.getPropertyValue(property)) continue;
    to.setProperty(property, value, from.getPropertyPriority(property));
  }
}

/** True when the element states one of the INHERITED_PROPERTIES. */
function hasInheritedStyle(el: Element): boolean {
  const style = (el as HTMLElement).style;
  return !!style && INHERITED_PROPERTIES.some((property) => style.getPropertyValue(property) !== '');
}

/** Elements that never render as text: wrapping them in a line would add a blank line. */
const NOT_RENDERED = 'style, script, template, meta, link, title';

/**
 * True when the node would show something in a line: visible text, or one of
 * the elements fillEmptyBlocks counts as content (a line break, an image…).
 * Comments, `<style>` and whitespace-only inline elements between blocks are
 * not a line of text.
 */
function rendersInline(node: Node): boolean {
  if (node.nodeType === 3 /* Node.TEXT_NODE */) return !isCollapsibleText(node);
  if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) return false;
  const el = node as Element;
  if (el.matches(NOT_RENDERED)) return false;
  if (el.matches(CONTENT_BEARING) || el.querySelector(CONTENT_BEARING)) return true;
  return (el.textContent ?? '').replace(COLLAPSIBLE_WHITESPACE, '') !== '';
}

/**
 * Wrap each run of inline content sitting directly in `container` (a reply's
 * attribution, `From: …<br>To: …<br>`) in a `<p>`, so the run can carry the
 * container's inherited style. ProseMirror would wrap the run in a paragraph
 * anyway; doing it here only gives that paragraph an element to style.
 * Runs that render nothing are left alone, and so is a run holding blocks (a
 * `<span>` around paragraphs): a line can't contain them.
 */
function wrapInlineRuns(container: Element): void {
  let run: ChildNode[] = [];
  const flush = (before: ChildNode | null): void => {
    const holdsBlock = run.some((node) => node.nodeType === 1 /* Node.ELEMENT_NODE */ && (node as Element).querySelector(BLOCK_LEVEL));
    if (!holdsBlock && run.some(rendersInline)) {
      const line = container.ownerDocument.createElement('p');
      container.insertBefore(line, before);
      line.append(...run);
    }
    run = [];
  };

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === 1 /* Node.ELEMENT_NODE */ && (node as Element).matches(BLOCK_LEVEL)) flush(node);
    else run.push(node);
  }
  flush(null);
}

/**
 * Dissolve block-only wrapper `<div>`/`<p>` elements, hoisting their children
 * into the parent, before the HTML reaches TipTap.
 *
 * The editor's schema has one block node for a line of text (`paragraph`,
 * rendered as `<div>` under `forced_root_block: 'div'`) and its content
 * expression is `inline*` — a block cannot contain another block. So a wrapper
 * `<div>` around other blocks cannot survive the parse *whatever* we do: the
 * ProseMirror parser opens a paragraph for the wrapper, immediately has to
 * close it to place the first block child, and the wrapper is left behind as an
 * empty paragraph — a blank line that was never in the source. Deeply wrapped
 * HTML (`<div><div><div><div><div>…`, the shape mail clients and CMSes produce)
 * therefore imports with a run of blank lines above it, one per wrapper.
 *
 * Removing the wrapper up front loses nothing that was not already lost —
 * the nesting is destroyed either way — and it stops the empty line being
 * invented. It also rescues the wrapper's *font*: a body wrapped in a single
 * `<div style="font-family:Georgia;font-size:10pt">` previously stranded that
 * style on the empty paragraph while every real line fell back to the editor
 * default, silently restyling an imported template. The inherited properties
 * are copied down instead (see INHERITED_PROPERTIES).
 *
 * `quoteMarkerClass` is the editor's `quote_marker_class`: a div with exactly
 * that class is a marked quote and is kept.
 *
 * Runs at import time only, from `HTMLEditor.formatInput()`, so it applies to
 * `setContent()` and `insertContent()` alike. Idempotent, and a fixpoint over
 * nesting: unwrapping the outer of two nested wrappers exposes the inner one,
 * so the pass repeats until nothing changes.
 */
export function flattenWrapperBlocks(html: string, quoteMarkerClass?: string | null): string {
  if (!html) return html;

  const markerClass = normalizeQuoteMarkerClass(quoteMarkerClass);

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Bounded so a pathological document cannot spin: each pass removes at least
  // one level of nesting, and real content is nowhere near this deep.
  const MAX_PASSES = 20;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const wrappers = Array.from(doc.body.querySelectorAll(UNWRAPPABLE)).filter((el) => isWrapper(el, markerClass));
    if (wrappers.length === 0) break;

    // Innermost first, so a child wrapper is dissolved before its parent tries
    // to pass style down to it — the style then lands on the real lines rather
    // than on a wrapper that is about to disappear.
    for (const wrapper of wrappers.reverse()) {
      for (const child of Array.from(wrapper.children)) inheritStyle(wrapper, child);
      wrapper.replaceWith(...Array.from(wrapper.childNodes));
    }
  }

  // A marked quote is kept, but its lines inherit from it as they did when a
  // marked div was dissolved (or, with div lines, parsed as a line itself):
  // MarkedQuote keeps only its box style, so a font it carries, or
  // received from a wrapper above, would otherwise be lost. Document order, so
  // a nested quote has received its parent's style before passing it on.
  const quotes = markerClass
    ? Array.from(doc.body.querySelectorAll('div[class], blockquote[class]')).filter((el) => isMarkedQuote(el, markerClass))
    : [];
  for (const quote of quotes) {
    if (!hasInheritedStyle(quote)) continue;
    wrapInlineRuns(quote);
    for (const child of Array.from(quote.children)) inheritStyle(quote, child);
  }

  return doc.body.innerHTML;
}
