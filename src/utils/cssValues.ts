/**
 * The value checks behind every inline style the editor keeps from imported
 * HTML. Editor content renders in the host page, not in an iframe, so a style
 * is never passed through whole: each node keeps a short list of properties,
 * and only values that match their pattern (no url(), calc(), var(), negative
 * length or CSS-wide keyword).
 */

/** A non-negative length in px, pt or em. */
export const CSS_LENGTH = /^(0|\d+(\.\d+)?(px|pt|em))$/;
/** A non-negative length in px, pt or em, or a percentage. */
export const CSS_LENGTH_OR_PERCENT = /^(0|\d+(\.\d+)?(px|pt|em|%))$/;
/** Every CSS border style. */
export const CSS_BORDER_STYLE = /^(none|hidden|solid|dotted|dashed|double|groove|ridge|inset|outset)$/;
// A color name, but not a CSS-wide keyword, which is not a color.
export const CSS_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?(\s*,\s*[\d.]+%?){2,3}\s*\)|(?!(inherit|initial|unset|revert|revert-layer)$)[a-z]+)$/i;

/** The properties a node may keep, each with the pattern its value must match. */
export type StyleRules = ReadonlyArray<readonly [string, RegExp]>;

/**
 * The allowed part of `style`, or null when nothing is allowed. Values are
 * read through the CSSOM, so they are already parsed and normalized before
 * they are matched.
 */
export function pickStyle(style: CSSStyleDeclaration, rules: StyleRules, doc: Document = document): string | null {
  const kept = doc.createElement('div').style;
  for (const [property, allowed] of rules) {
    const value = style.getPropertyValue(property).trim();
    if (value && allowed.test(value)) kept.setProperty(property, value);
  }
  return kept.cssText || null;
}

/**
 * `style` with `changes` applied (an empty or null value removes the
 * property), filtered through `rules`; null when nothing is left.
 */
export function mergeStyle(
  style: unknown,
  changes: Record<string, string | null | undefined>,
  rules: StyleRules,
  doc: Document = document
): string | null {
  const merged = doc.createElement('div').style;
  if (typeof style === 'string') merged.cssText = style;
  for (const [property, value] of Object.entries(changes)) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) merged.setProperty(property, trimmed);
    else merged.removeProperty(property);
  }
  return pickStyle(merged, rules, doc);
}

/** The value of `property` in a style string, or '' (also for a value that is not a string). */
export function styleProperty(style: unknown, property: string, doc: Document = document): string {
  if (typeof style !== 'string' || !style) return '';
  const parsed = doc.createElement('div').style;
  parsed.cssText = style;
  return parsed.getPropertyValue(property).trim();
}

/** `value` filtered through `rules`, or null when it is not a string or nothing is allowed. */
export function sanitizeStyle(value: unknown, rules: StyleRules, doc: Document = document): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = doc.createElement('div').style;
  parsed.cssText = value;
  return pickStyle(parsed, rules, doc);
}
