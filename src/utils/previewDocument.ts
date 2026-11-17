/**
 * The standalone page that Preview (a popup) and Print (a hidden frame) show
 * the editor's content in.
 */

/**
 * Content Security Policy for the preview and print documents.
 *
 * They are the places where editor content is re-parsed as HTML in a live,
 * same-origin document (a popup written with `document.write`, or a frame's
 * `srcdoc`), so anything that ever slipped through the schema would run there
 * with the host page's privileges. Nothing the schema renders can do that today;
 * this makes the document unable to run script whatever the content turns out
 * to hold. (The print frame is also sandboxed without `allow-scripts`.)
 *
 * `default-src 'none'` covers script, inline handlers, `javascript:` URLs and
 * eval. The exceptions are what the document genuinely needs: images (`*` does
 * not cover non-network schemes, so `data:`/`blob:`/`cid:` are listed — `cid:` is
 * how an email template references an inline attachment) and inline styles,
 * which the content carries as `style` attributes and the document uses for its
 * own `<style>` block. `base-uri`/`form-action` are not covered by `default-src`,
 * so they are stated to close the `<base>`-hijack and form-submission paths.
 *
 * Two things to know before changing it. `base-uri 'none'` means a `<base href>`
 * written into the document is ignored, so relative URLs keep resolving against
 * the host page as they do in the editor. And the value is interpolated into the
 * attribute unescaped, so it has to stay a literal with no double quotes; a
 * configurable policy would need escaping.
 *
 * Not part of the public API (`src/index.ts` does not export it). Keep it the
 * first element in `<head>`: a meta policy does not apply to markup parsed
 * before it, and one that ends up in the body is ignored entirely.
 */
export const PREVIEW_CSP =
  "default-src 'none'; img-src * data: blob: cid:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

/** `text` with the characters that are markup in HTML text escaped. */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A complete HTML document showing `html` (the editor's serialized output,
 * from getContent()) under `title`, with PREVIEW_CSP as the first element of
 * its head. `title` is written as text. `dir` is the editor's
 * `directionality`: in the editor it sits on the wrapper, not in the content,
 * so right-to-left content needs it on the document to read the same way.
 */
export function buildPreviewDocument(html: string, title: string, dir: 'ltr' | 'rtl' = 'ltr'): string {
  return `<!DOCTYPE html>
<html${dir === 'rtl' ? ' dir="rtl"' : ''}>
<head>
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">
<title>${escapeText(title)}</title>
<style>body { font-family: sans-serif; padding: 20px; }</style>
</head>
<body>${html}</body>
</html>`;
}
