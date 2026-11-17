/**
 * Escapes text for HTML markup, so it shows as written in element content and
 * in quoted attribute values. Markup built with `innerHTML` passes every value
 * that isn't a constant through this; eslint's no-unsanitized rules accept it.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
