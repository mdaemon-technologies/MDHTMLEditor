/**
 * The HTML shape of a tab: `<span style="white-space: pre;">\t</span>`. A bare
 * tab collapses to a space wherever HTML is rendered (and on import, which
 * collapses whitespace the same way); `white-space: pre` keeps it a tab with
 * real tab stops. Google Docs, Apple Mail and other editors write the same
 * span, sometimes with several tabs in one, so these checks serve the
 * TabCharacter node's parse rules and the output passes that must count a tab
 * as content.
 */

/** `white-space` values that keep a tab a tab. */
const KEEPS_TABS = ['pre', 'pre-wrap', 'break-spaces'];

/**
 * True when `el` is a span holding only tab text (no elements), kept by a
 * `white-space` that preserves it.
 */
export function isTabSpan(el: Element): boolean {
  if (el.tagName !== 'SPAN' || !/^\t+$/.test(el.textContent ?? '')) return false;
  if (!Array.from(el.childNodes).every((node) => node.nodeType === 3 /* Node.TEXT_NODE */)) return false;
  return KEEPS_TABS.includes((el as HTMLElement).style?.getPropertyValue('white-space') ?? '');
}

/**
 * True when `el` is a tab span whose style states `white-space` and nothing
 * else — the shape TabCharacter writes. Read from the attribute, not from
 * `style.length`: browsers now expand `white-space` into its longhands, so the
 * one declaration counts as several properties there.
 */
export function isBareTabSpan(el: Element): boolean {
  if (!isTabSpan(el)) return false;
  const declarations = (el.getAttribute('style') ?? '').split(';').map((d) => d.trim()).filter(Boolean);
  return declarations.length === 1 && /^white-space\s*:/i.test(declarations[0]);
}

/** True when `el` is, or contains, a tab span. */
export function containsTabSpan(el: Element): boolean {
  return isTabSpan(el) || Array.from(el.querySelectorAll('span')).some(isTabSpan);
}
