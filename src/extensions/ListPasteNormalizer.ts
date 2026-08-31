/**
 * ListPasteNormalizer Extension
 *
 * Strips left-indentation from pasted lists, whatever their source.
 *
 * Mail clients, Word, Google Docs and most WYSIWYG editors express a list's
 * position with inline indentation on the list or its items — Word writes
 * `margin-left:.5in;text-indent:-.25in` on every item, Google Docs writes
 * `padding-inline-start:48px` on the list. Carried into the editor, that
 * indentation stacks on top of the editor's own list padding, so a pasted list
 * lands one level further right than a list created with the toolbar.
 *
 * A list's *structure* already carries its nesting (`<ol><li><ol>…`), so this
 * inline indentation is pure presentation from another document's page layout
 * and is safe to drop. Indentation on non-list blocks (paragraphs, blockquotes)
 * is meaningful and is left alone — as is everything else on the list, notably
 * an ordered list's `type` / `start` and its `list-style-type`, which is where
 * a lettered list's numbering style lives.
 *
 * Runs on every paste, not just Office content, and composes with
 * PasteFromOffice: TipTap chains each extension's `transformPastedHTML`, so the
 * Office cleaner converts Word's fake lists into real ones first and this
 * normalizes whatever indentation is left (this extension is registered after
 * it, and both use the default priority, so the chain order follows
 * registration order).
 */

import { Extension } from '@tiptap/core';

/**
 * Inline CSS properties that push a list to the right. `text-indent` is
 * included because Word pairs it with `margin-left` to produce a hanging
 * indent; left behind on its own it pulls the marker out of the list.
 */
const INDENT_PROPERTIES = [
  'margin-left',
  'padding-left',
  'margin-inline-start',
  'padding-inline-start',
  'text-indent',
];

/** Elements whose inline indentation is dropped. */
const LIST_SELECTOR = 'ol, ul, li';

/**
 * Split an inline style into its declarations, ignoring the semicolons inside
 * quotes and parentheses — a naive `split(';')` cuts a `url(data:image/png;
 * base64,…)` in half and corrupts it on the way back out.
 */
function splitDeclarations(style: string): string[] {
  const declarations: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;

  for (const char of style) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && depth === 0) {
      declarations.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  declarations.push(current);

  return declarations;
}

/**
 * Remove the indentation declarations from an inline style string, keeping
 * every other declaration (colors, fonts, `list-style-type`) intact. Returns
 * the cleaned string, empty if nothing is left.
 */
export function stripIndentDeclarations(style: string): string {
  return splitDeclarations(style)
    .filter(declaration => {
      const property = declaration.split(':')[0].trim().toLowerCase();
      return property !== '' && !INDENT_PROPERTIES.includes(property);
    })
    .map(declaration => declaration.trim())
    .join('; ');
}

/**
 * Drop inline left-indentation from every list and list item in a fragment of
 * pasted HTML. Returns the input unchanged when there is nothing to strip, so
 * a paste that needs no normalization is never re-serialized.
 */
export function normalizePastedLists(html: string): string {
  // Cheap bail-out: no list markup, nothing to do.
  if (!/<(?:ol|ul|li)\b/i.test(html)) {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  let changed = false;

  for (const el of Array.from(doc.body.querySelectorAll(LIST_SELECTOR))) {
    const style = el.getAttribute('style');
    if (!style) {
      continue;
    }

    const cleaned = stripIndentDeclarations(style);
    if (cleaned === style) {
      continue;
    }

    changed = true;
    if (cleaned) {
      el.setAttribute('style', cleaned);
    } else {
      el.removeAttribute('style');
    }
  }

  return changed ? doc.body.innerHTML : html;
}

export const ListPasteNormalizer = Extension.create({
  name: 'listPasteNormalizer',

  transformPastedHTML(html: string) {
    return normalizePastedLists(html);
  },
});
