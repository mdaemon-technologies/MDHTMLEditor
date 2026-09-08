/**
 * Root-block elements the editor emits for a line. An empty one of these
 * represents a blank line the user typed.
 */
const BLOCK_SELECTOR = 'p, div, h1, h2, h3, h4, h5, h6';

/**
 * Elements that give a block visible content/height on their own. A block
 * containing any of these is NOT a blank line and must be left alone. This is
 * also what keeps the transform idempotent: once we insert a <br>, the block is
 * no longer considered empty.
 */
const CONTENT_BEARING =
  'br, img, hr, input, video, audio, iframe, object, embed, canvas, svg, table, picture, source';

/**
 * Whitespace that collapses to nothing when HTML is rendered: the ASCII set the
 * HTML spec calls "space characters". Deliberately NOT `\s` and NOT
 * `String#trim()` — both of those also match U+00A0, the non-breaking space,
 * which is the one whitespace character that does *not* collapse. A block
 * holding only `&nbsp;` is a blank the author typed on purpose: it already has
 * height, so it must not be treated as an empty line by either pass below.
 * Reading it as empty is how `<div>&nbsp;</div>` used to acquire a filler <br>
 * and render at double height in a sent message.
 */
const COLLAPSIBLE_WHITESPACE = /[ \t\n\r\f\v]+/g;

/** True when the element renders any text at all, `&nbsp;` included. */
function hasVisibleText(el: Element): boolean {
  return (el.textContent ?? '').replace(COLLAPSIBLE_WHITESPACE, '') !== '';
}

/**
 * A block is a "blank line" when it renders no text, contains no
 * content-bearing/void element, and is a leaf (no nested block). Empty inline
 * wrappers are allowed — e.g. a <span> carrying a font the user set on an empty
 * line, or the block's own inlined default font (BlockFontStyle renders the
 * font onto the block's style attribute, so an empty block still serializes as
 * `<p style="font-family:…"></p>`). Those still render as a collapsed blank
 * line and should be filled; the selector is attribute-agnostic so the inlined
 * style does not hide them.
 */
function isBlankLine(el: Element): boolean {
  if (hasVisibleText(el)) return false;
  if (el.querySelector(CONTENT_BEARING)) return false;
  if (el.querySelector(BLOCK_SELECTOR)) return false; // container of blocks, not a line
  return true;
}

/**
 * Give empty block elements a <br> so blank lines keep their height when the
 * HTML is rendered outside the editor. TipTap/ProseMirror serializes a blank
 * line as a bare `<div></div>` (or `<p></p>`) — the live-editing
 * `ProseMirror-trailingBreak` is a view decoration, not part of the document,
 * so it is absent from `getHTML()`. That bare empty block collapses to zero
 * height in mail clients, so the blank lines the user typed appear to vanish on
 * send.
 *
 * This mirrors TinyMCE's `format_empty_lines`: it runs only at serialization
 * time (see `HTMLEditor.getContent()`) and never touches the live editor DOM.
 * Applying it at the schema/renderHTML level instead would collide with
 * ProseMirror's own trailing break and risk doubled lines and caret glitches.
 *
 * Idempotent: a block already holding a <br> is content-bearing, so re-running
 * this never accumulates `<br><br>`.
 */
export function fillEmptyBlocks(html: string): string {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    if (isBlankLine(el)) el.appendChild(doc.createElement('br'));
  });

  return doc.body.innerHTML;
}

/**
 * A block is a "filled blank line" — the exact shape `fillEmptyBlocks` emits —
 * when it renders no text, has no nested block, and its only content-bearing
 * element is a single `<br>`. That lone `<br>` is the export artifact standing
 * in for a blank line; empty inline wrappers around it (a `<span>` carrying a
 * font, say) are ignored, mirroring `isBlankLine`. A block with real content
 * (`<div>hello<br></div>` — a user's Shift+Enter) has text, so it fails here
 * and is left alone. It shares `hasVisibleText` with `isBlankLine` for the same
 * reason it shares the selectors: if the two ever disagreed on what "empty"
 * means, a block this pass strips but that pass declines to refill would lose a
 * line break on every round-trip. `<div>&nbsp;<br></div>` is exactly that case.
 */
function isFilledBlankLine(el: Element): { br: Element } | null {
  if (hasVisibleText(el)) return null;
  if (el.querySelector(BLOCK_SELECTOR)) return null; // container of blocks, not a line
  const contentBearing = el.querySelectorAll(CONTENT_BEARING);
  if (contentBearing.length === 1 && contentBearing[0].tagName === 'BR') {
    return { br: contentBearing[0] };
  }
  return null;
}

/**
 * Inverse of {@link fillEmptyBlocks}: strip the lone `<br>` back out of an
 * otherwise-empty block so the importer sees a genuinely empty block.
 *
 * A `<br>` inside an empty block is an export artifact for non-editor renderers
 * (see `fillEmptyBlocks`), not real editor content. If it survives into
 * `setContent`, TipTap parses it as a `hardBreak` node inside the block — which,
 * on top of ProseMirror's own trailing-break decoration, renders the single
 * blank line as *two*. Stripping it first makes TipTap model the block as one
 * empty line, so `setContent(getContent(x))` reproduces the original state
 * instead of growing a blank line on every round-trip.
 *
 * Runs only at import time (see `HTMLEditor.setContent()`), gated on the same
 * `format_empty_lines` flag as its inverse, and shares `BLOCK_SELECTOR` /
 * `CONTENT_BEARING` so the two can never drift apart on what "empty" means.
 *
 * Narrow and source-agnostic: `<div><br></div>` unambiguously means "one blank
 * line" in HTML regardless of who authored it (this editor, a legacy theme,
 * another client), so collapsing it to one empty editor line is correct for all
 * inputs. Idempotent — a block with no `<br>` is left untouched.
 */
export function stripEmptyLineBreaks(html: string): string {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    const match = isFilledBlankLine(el);
    if (match) match.br.remove();
  });

  return doc.body.innerHTML;
}
