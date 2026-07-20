/**
 * Normalize closing tags whose forward slash was backslash-escaped (`<\/p>` →
 * `</p>`) before the HTML is handed to TipTap.
 *
 * Some hosts serialize the editor's output through encoders that escape `/` as
 * `\/` — most notably PHP's `json_encode`, which does this by default unless
 * `JSON_UNESCAPED_SLASHES` is set. A closing tag then arrives as `<\/p>`. The
 * browser's HTML parser (the one TipTap/ProseMirror uses in `setContent` /
 * `insertContent`) does NOT treat `<\` as a tag opener, so `<\/p>`, `<\/li>`,
 * `<\/ul>` render as *literal text* while the slash-free opening tags still
 * build a real element tree — producing a half-parsed list with visible
 * `</p>`-looking garbage. TinyMCE's hand-rolled parser silently tolerated the
 * escaped slash, so restoring that leniency is part of preserving the TinyMCE
 * facade.
 *
 * Only the `<\/` sequence is rewritten. A lone `\/` inside real text is left
 * alone, and genuine text that contained `<\/` would have reached us
 * HTML-escaped as `&lt;\/` — so this can only ever undo a mangled closing tag,
 * never corrupt legitimate content. Idempotent: unescaped HTML has no `<\/`.
 */
export function unescapeTagSlashes(html: string): string {
  if (!html) return html;
  return html.replace(/<\\\//g, '</');
}
