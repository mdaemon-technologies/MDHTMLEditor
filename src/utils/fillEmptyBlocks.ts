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
 * A block is a "blank line" when it has no visible text, contains no
 * content-bearing/void element, and is a leaf (no nested block). Empty inline
 * wrappers are allowed — e.g. a <span> carrying a font the user set on an empty
 * line, or the block's own inlined default font (BlockFontStyle renders the
 * font onto the block's style attribute, so an empty block still serializes as
 * `<p style="font-family:…"></p>`). Those still render as a collapsed blank
 * line and should be filled; the selector is attribute-agnostic so the inlined
 * style does not hide them.
 */
function isBlankLine(el: Element): boolean {
  if ((el.textContent ?? '').trim() !== '') return false;
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
