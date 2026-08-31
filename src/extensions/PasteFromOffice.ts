/**
 * PasteFromOffice Extension
 * Detects and cleans HTML pasted from Microsoft Word and Excel,
 * preserving formatting while stripping Office-specific cruft.
 */

import { Extension } from '@tiptap/core';
import { stripIndentDeclarations } from './ListPasteNormalizer';

export interface PasteFromOfficeOptions {
  /**
   * Enable/disable paste-from-office cleaning.
   * When false, pasted content passes through unchanged.
   */
  enabled: boolean;
}

// --- Detection ---

const WORD_MARKERS = [
  'xmlns:o="urn:schemas-microsoft-com:office:office"',
  'xmlns:w="urn:schemas-microsoft-com:office:word"',
  'class="Mso',
  'class=Mso',
  'style="mso-',
  'style=\'mso-',
];

const EXCEL_MARKERS = [
  'xmlns:x="urn:schemas-microsoft-com:office:excel"',
  'ProgId content=Excel.Sheet',
  'ProgId content="Excel.Sheet"',
];

function isWordContent(html: string): boolean {
  return WORD_MARKERS.some(marker => html.includes(marker));
}

function isExcelContent(html: string): boolean {
  return EXCEL_MARKERS.some(marker => html.includes(marker));
}

export function isOfficeContent(html: string): boolean {
  return isWordContent(html) || isExcelContent(html);
}

// --- Conditional comments ---

/**
 * Remove IE/Office conditional comments: <!--[if ...]>...<![endif]-->
 * These wrap VML shapes, browser-specific rendering, etc.
 */
function removeConditionalComments(html: string): string {
  // Remove nested conditional comments (non-greedy, handles typical nesting)
  // Pattern: <!--[if ...]> ... <![endif]--> (may span multiple lines)
  return html.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
}

// --- Office namespace elements ---

/** Tags from Office XML namespaces to remove entirely */
const OFFICE_NS_TAG_PATTERN = /(?:<\/?)(?:o|w|v|m|x|st\d):/i;

/**
 * Remove elements from Office XML namespaces (o:p, w:sdt, v:shape, etc.)
 * and strip xmlns:* namespace declarations from remaining elements.
 */
function removeOfficeElements(doc: Document): void {
  // Remove namespace elements by walking the tree
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of allElements) {
    const tagName = el.tagName.toLowerCase();
    if (OFFICE_NS_TAG_PATTERN.test(`<${tagName}`)) {
      // Preserve text content of <o:p> (it's usually just &nbsp; but could have text)
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    }
  }

  // Remove xmlns:* attributes from all elements
  const remaining = Array.from(doc.body.querySelectorAll('*'));
  for (const el of remaining) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (attr.name.startsWith('xmlns:') || attr.name === 'xmlns') {
        el.removeAttribute(attr.name);
      }
    }
  }
}

// --- Style extraction ---

/** HTML `type` values for an ordered list's numbering style. */
type OrderedListType = 'A' | 'a' | 'I' | 'i';

/** How one level of one Word list is numbered. */
interface ListLevelStyle {
  /** Ordered (`<ol>`) or bulleted (`<ul>`). */
  ordered: boolean;
  /** Numbering style of an ordered level; undefined renders as plain decimal. */
  type?: OrderedListType;
  /** First number of an ordered level, when it does not start at 1. */
  start?: number;
}

/**
 * Word's `mso-level-number-format` values → the HTML ordered-list `type` that
 * reproduces them. Formats that render as plain numbers (and anything not
 * listed) map to no `type` at all, which is the browser default.
 */
const MSO_NUMBER_FORMATS = new Map<string, OrderedListType>([
  ['alpha-upper', 'A'],
  ['alpha-lower', 'a'],
  ['roman-upper', 'I'],
  ['roman-lower', 'i'],
]);

/** Which list a paragraph belongs to, and how deeply it is nested. */
interface ListStyleInfo {
  listId: string;
  level: number;
}

/**
 * Parse the <style> block for @list rules to determine numbering format.
 * Word embeds list formatting like:
 *   @list l0:level1 { mso-level-number-format: bullet; }
 *   @list l1:level1 { mso-level-number-format: alpha-upper; mso-level-start-at: 3; }
 */
function parseListStyles(doc: Document): Map<string, ListLevelStyle> {
  const styleMap = new Map<string, ListLevelStyle>(); // "l0:level1" => level style
  const styleEls = doc.querySelectorAll('style');

  for (const styleEl of Array.from(styleEls)) {
    const css = styleEl.textContent ?? '';
    // Match @list declarations
    const listRulePattern = /@list\s+(l\d+):level(\d+)\s*\{([^}]*)\}/gi;
    let match: RegExpExecArray | null;
    while ((match = listRulePattern.exec(css)) !== null) {
      styleMap.set(`${match[1]}:level${match[2]}`, parseLevelRule(match[3]));
    }
  }

  return styleMap;
}

/** Read one `@list lN:levelM { … }` rule body into a level style. */
function parseLevelRule(body: string): ListLevelStyle {
  const formatMatch = /mso-level-number-format:\s*([^;]+)/i.exec(body);
  // No format at all is Word's default for a numbered level, so only an
  // explicit "bullet" makes the level unordered.
  const format = formatMatch ? formatMatch[1].trim().toLowerCase() : '';
  const level: ListLevelStyle = { ordered: format !== 'bullet' };

  const type = MSO_NUMBER_FORMATS.get(format);
  if (level.ordered && type) {
    level.type = type;
  }

  const startMatch = /mso-level-start-at:\s*(\d+)/i.exec(body);
  if (startMatch) {
    const start = parseInt(startMatch[1], 10);
    if (Number.isFinite(start) && start > 1) {
      level.start = start;
    }
  }

  return level;
}

/**
 * Extract list metadata from mso-list style property.
 * Format: mso-list:l0 level1 lfo1
 */
function parseListStyle(style: string): ListStyleInfo | null {
  const match = /mso-list:\s*(l\d+)\s+level(\d+)\s+/i.exec(style);
  if (!match) return null;
  return {
    listId: match[1],
    level: parseInt(match[2], 10),
  };
}

function levelKey(info: ListStyleInfo): string {
  return `${info.listId}:level${info.level}`;
}

// --- Marker inspection ---

/**
 * Strip the punctuation and spacing Word wraps a marker in, so "1.", "(a)" and
 * "iii)" reduce to "1", "a" and "iii".
 */
function normalizeMarker(text: string): string {
  // \s already covers the non-breaking spaces Word pads its markers with.
  return text.replace(/[\s.)(\][]/g, '');
}

/** Well-formed roman numeral (also matches the empty string, so test length first). */
const ROMAN_PATTERN = /^m*(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i;

const ROMAN_VALUES: ReadonlyArray<readonly [string, number]> = [
  ['m', 1000], ['cm', 900], ['d', 500], ['cd', 400],
  ['c', 100], ['xc', 90], ['l', 50], ['xl', 40],
  ['x', 10], ['ix', 9], ['v', 5], ['iv', 4], ['i', 1],
];

function romanToNumber(marker: string): number {
  const lower = marker.toLowerCase();
  let total = 0;
  let index = 0;
  while (index < lower.length) {
    const match = ROMAN_VALUES.find(
      ([numeral]) => lower.startsWith(numeral, index),
    );
    if (!match) return 0;
    total += match[1];
    index += match[0].length;
  }
  return total;
}

function numberToRoman(value: number): string {
  let remaining = value;
  let roman = '';
  for (const [numeral, amount] of ROMAN_VALUES) {
    while (remaining >= amount) {
      roman += numeral;
      remaining -= amount;
    }
  }
  return roman;
}

/** "a" → 1, "z" → 26, "aa" → 27 (Word's lettered sequence). */
function alphaToNumber(marker: string): number {
  const lower = marker.toLowerCase();
  let value = 0;
  for (const char of lower) {
    value = value * 26 + (char.charCodeAt(0) - 96);
  }
  return value;
}

/**
 * Decide whether an ambiguous marker (one that reads as both a roman numeral
 * and a letter — i, v, x, l, c, d, m) is roman, by checking whether the next
 * marker in the list is its roman successor. With nothing to compare against,
 * roman wins: a lettered list normally starts at "a"/"A", so a list opening on
 * "i" is far more likely to be roman.
 */
function isRomanSequence(markers: string[]): boolean {
  if (markers.length < 2) return true;
  return markers[1].toLowerCase() === numberToRoman(romanToNumber(markers[0]) + 1);
}

/**
 * Infer how a list level is numbered from the marker text Word inlines in its
 * `mso-list:Ignore` spans ("1.", "A.", "iv.", "·"). This is the fallback for
 * clipboards that carry no `@list` rules at all — without it a numbered Word
 * list pasted as a bullet list.
 */
function detectMarkerStyle(markers: string[]): ListLevelStyle | null {
  const cleaned = markers.map(normalizeMarker).filter(marker => marker.length > 0);
  if (cleaned.length === 0) return null;

  const first = cleaned[0];

  if (/^\d+$/.test(first)) {
    const start = parseInt(first, 10);
    return start > 1 ? { ordered: true, start } : { ordered: true };
  }

  const looksRoman = ROMAN_PATTERN.test(first);
  const looksAlpha = /^[a-z]{1,2}$/i.test(first);
  if (!looksRoman && !looksAlpha) {
    // A bullet glyph (·, o, §, Wingdings) or something unrecognized.
    return { ordered: false };
  }

  const roman = looksRoman && (!looksAlpha || isRomanSequence(cleaned));
  const upper = first === first.toUpperCase();
  const start = roman ? romanToNumber(first) : alphaToNumber(first);

  const level: ListLevelStyle = {
    ordered: true,
    type: roman ? (upper ? 'I' : 'i') : (upper ? 'A' : 'a'),
  };
  if (start > 1) {
    level.start = start;
  }
  return level;
}

/**
 * Resolve how one list level is numbered: the clipboard's `@list` rule wins,
 * falling back to the marker text. A rule that does not say where the level
 * starts still borrows the start number from the markers.
 */
function resolveLevelStyle(
  info: ListStyleInfo,
  markers: string[],
  listStyles: Map<string, ListLevelStyle>,
): ListLevelStyle {
  const fromRule = listStyles.get(levelKey(info));
  const fromMarkers = detectMarkerStyle(markers);

  if (!fromRule) {
    return fromMarkers ?? { ordered: false };
  }

  if (fromRule.ordered && fromRule.start === undefined && fromMarkers?.ordered && fromMarkers.start) {
    return { ...fromRule, start: fromMarkers.start };
  }

  return fromRule;
}

/**
 * Remove Word's list marker spans and return the marker text they held.
 * The markers are the bullet/number characters Word inlines as content:
 *   <span style="mso-list:Ignore">·<span style="font:...">&nbsp;</span></span>
 *   <span style="mso-list:Ignore">1.<span>&nbsp;</span></span>
 * They are meaningless once the element is a real list item, but their text is
 * the most reliable record of how the list was numbered.
 */
function takeListMarkers(el: HTMLElement): string[] {
  const markers: string[] = [];
  for (const span of Array.from(el.querySelectorAll('span'))) {
    // Spans nested inside an already-removed marker are detached — skip them
    // so their padding whitespace is not mistaken for a marker.
    if (!el.contains(span)) continue;
    if (/mso-list:\s*Ignore/i.test(span.getAttribute('style') ?? '')) {
      markers.push(span.textContent ?? '');
      span.remove();
    }
  }
  return markers;
}

// --- List conversion ---

/**
 * Convert Word's fake list paragraphs to proper <ul>/<ol> + <li>.
 * Word outputs lists as:
 *   <p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1">
 *     <span>·<span>&nbsp;</span></span>Item text
 *   </p>
 *
 * Items that are already inside a real <ol>/<ul> are cleaned in place instead:
 * Outlook and Word emit genuine lists whose <li>s carry the very same
 * MsoListParagraph class and mso-list style, and building another list around
 * those nested them a level too deep.
 */
function convertWordLists(doc: Document): void {
  const listStyles = parseListStyles(doc);

  // Find all list paragraphs (class starts with MsoList) that carry list metadata
  const candidates = Array.from(
    doc.body.querySelectorAll<HTMLElement>('[class*="MsoList"]'),
  ).filter(el => parseListStyle(el.getAttribute('style') ?? '') !== null);
  if (candidates.length === 0) return;

  const toConvert: HTMLElement[] = [];
  for (const el of candidates) {
    if (el.closest('ol, ul')) {
      cleanExistingListItem(el, listStyles);
    } else {
      toConvert.push(el);
    }
  }

  // Group consecutive list paragraphs into list blocks
  const groups: HTMLElement[][] = [];
  let currentGroup: HTMLElement[] = [];

  for (const el of toConvert) {
    // Check if this paragraph is adjacent to the previous one
    if (currentGroup.length > 0) {
      const lastEl = currentGroup[currentGroup.length - 1];
      let nextSibling = lastEl.nextElementSibling;
      // Skip whitespace-only text nodes
      while (nextSibling && nextSibling !== el && nextSibling.textContent?.trim() === '') {
        nextSibling = nextSibling.nextElementSibling;
      }
      if (nextSibling !== el) {
        // Not adjacent — start new group
        groups.push(currentGroup);
        currentGroup = [];
      }
    }
    currentGroup.push(el);
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Convert each group to a proper list
  for (const group of groups) {
    convertListGroup(doc, group, listStyles);
  }
}

/**
 * Clean a Word list item that is already inside a real <ol>/<ul>: drop its
 * inlined marker and its page indentation, and record the numbering style on
 * the owning <ol> when the markup itself does not already carry one.
 */
function cleanExistingListItem(
  el: HTMLElement,
  listStyles: Map<string, ListLevelStyle>,
): void {
  const info = parseListStyle(el.getAttribute('style') ?? '');
  const markers = takeListMarkers(el);

  const list = el.closest('ol, ul');
  if (info && list && list.tagName.toLowerCase() === 'ol' && !list.hasAttribute('type')) {
    const level = resolveLevelStyle(info, markers, listStyles);
    if (level.ordered && level.type) {
      list.setAttribute('type', level.type);
    }
  }

  applyItemStyle(el, el.getAttribute('style') ?? '');
}

/**
 * Write a list item's surviving inline style, minus Word's page indentation.
 * The editor supplies a list's indentation itself, so carrying Word's
 * margin-left/text-indent over stacks a second indent on top of it.
 */
function applyItemStyle(el: HTMLElement, style: string): void {
  const cleaned = stripIndentDeclarations(cleanMsoStyles(style));
  if (cleaned) {
    el.setAttribute('style', cleaned);
  } else {
    el.removeAttribute('style');
  }
}

/** Create the <ol>/<ul> for one list level, carrying its numbering style. */
function createListElement(doc: Document, level: ListLevelStyle): HTMLElement {
  const list = doc.createElement(level.ordered ? 'ol' : 'ul');
  if (level.ordered) {
    if (level.type) {
      list.setAttribute('type', level.type);
    }
    if (level.start !== undefined) {
      list.setAttribute('start', String(level.start));
    }
  }
  return list;
}

function convertListGroup(
  doc: Document,
  paragraphs: HTMLElement[],
  listStyles: Map<string, ListLevelStyle>,
): void {
  if (paragraphs.length === 0) return;

  // First pass: read each paragraph's list metadata and take its marker away.
  // Markers are collected per level so an ambiguous first marker ("i.") can be
  // resolved against the ones that follow it.
  const entries: Array<{ el: HTMLElement; info: ListStyleInfo }> = [];
  const markersByLevel = new Map<string, string[]>();

  for (const el of paragraphs) {
    const info = parseListStyle(el.getAttribute('style') ?? '');
    if (!info) continue;
    const key = levelKey(info);
    markersByLevel.set(key, [...(markersByLevel.get(key) ?? []), ...takeListMarkers(el)]);
    entries.push({ el, info });
  }
  if (entries.length === 0) return;

  const parent = entries[0].el.parentNode;
  if (!parent) return;

  const resolved = new Map<string, ListLevelStyle>();
  const styleFor = (info: ListStyleInfo): ListLevelStyle => {
    const key = levelKey(info);
    let level = resolved.get(key);
    if (!level) {
      level = resolveLevelStyle(info, markersByLevel.get(key) ?? [], listStyles);
      resolved.set(key, level);
    }
    return level;
  };

  const rootList = createListElement(doc, styleFor(entries[0].info));

  // Track list nesting using a stack
  interface ListFrame {
    element: HTMLElement;
    level: number;
  }
  const stack: ListFrame[] = [{ element: rootList, level: entries[0].info.level }];

  for (const { el, info } of entries) {
    // Adjust nesting
    while (stack.length > 1 && stack[stack.length - 1].level >= info.level) {
      stack.pop();
    }

    if (info.level > stack[stack.length - 1].level) {
      // Need to nest deeper — create sub-list inside the last <li>
      const currentList = stack[stack.length - 1].element;
      let lastLi = currentList.lastElementChild as HTMLElement | null;
      if (!lastLi || lastLi.tagName.toLowerCase() !== 'li') {
        lastLi = doc.createElement('li');
        currentList.appendChild(lastLi);
      }
      const subList = createListElement(doc, styleFor(info));
      lastLi.appendChild(subList);
      stack.push({ element: subList, level: info.level });
    }

    // Create <li> with the paragraph's content
    const li = doc.createElement('li');

    // Move content from paragraph to li
    while (el.firstChild) {
      li.appendChild(el.firstChild);
    }

    // Preserve any useful inline styles (font, color, etc.), minus indentation
    applyItemStyle(li, el.getAttribute('style') ?? '');

    stack[stack.length - 1].element.appendChild(li);
  }

  // Replace the first paragraph with the list, remove the rest
  parent.insertBefore(rootList, entries[0].el);
  for (const { el } of entries) {
    el.remove();
  }
}

// --- Style cleaning ---

/** MSO CSS properties to strip (after extracting list metadata) */
const MSO_PROPERTY_PATTERN = /\bmso-[^:]+:[^;]+;?\s*/gi;

/** MSO class names to strip */
const MSO_CLASS_PATTERN = /\bMso\w*|\bxl\d+/g;

/**
 * Remove mso-* CSS properties from an inline style string,
 * keeping standard CSS properties.
 */
export function cleanMsoStyles(style: string): string {
  // Remove mso-* properties
  let cleaned = style.replace(MSO_PROPERTY_PATTERN, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/;\s*;/g, ';').replace(/^\s*;\s*/, '').replace(/\s*;\s*$/, '').trim();

  return cleaned || '';
}

/**
 * Clean font-family values by removing fallbacks and quotes.
 * "Calibri",sans-serif → Calibri
 */
function cleanFontFamily(value: string): string {
  // Take only the first font family
  const first = value.split(',')[0].trim();
  // Remove quotes
  return first.replace(/^["']|["']$/g, '');
}

/**
 * Process all elements: clean styles, strip MSO classes, preserve formatting.
 */
function cleanElementStyles(doc: Document): void {
  const allElements = Array.from(doc.body.querySelectorAll('*'));

  for (const el of allElements) {
    // Clean class attribute
    const className = el.getAttribute('class');
    if (className) {
      const cleaned = className.replace(MSO_CLASS_PATTERN, '').trim();
      if (cleaned) {
        el.setAttribute('class', cleaned);
      } else {
        el.removeAttribute('class');
      }
    }

    // Clean style attribute
    const style = el.getAttribute('style');
    if (style) {
      let cleaned = cleanMsoStyles(style);

      // Clean font-family values
      const fontFamilyMatch = /font-family:\s*([^;]+)/i.exec(cleaned);
      if (fontFamilyMatch) {
        const cleanedFont = cleanFontFamily(fontFamilyMatch[1]);
        cleaned = cleaned.replace(fontFamilyMatch[0], `font-family: ${cleanedFont}`);
      }

      if (cleaned) {
        el.setAttribute('style', cleaned);
      } else {
        el.removeAttribute('style');
      }
    }

    // Remove Word-specific attributes
    const attrsToRemove = Array.from(el.attributes).filter(attr =>
      attr.name.startsWith('v:') ||
      attr.name.startsWith('o:') ||
      attr.name === 'lang'
    );
    for (const attr of attrsToRemove) {
      el.removeAttribute(attr.name);
    }
  }
}

// --- Empty element cleanup ---

/**
 * Remove empty wrapper elements that Word leaves behind.
 * Collapse <span> with no attributes and no meaningful content.
 */
function removeEmptyWrappers(doc: Document): void {
  // Remove empty spans with no attributes
  let changed = true;
  while (changed) {
    changed = false;
    const spans = Array.from(doc.body.querySelectorAll('span'));
    for (const span of spans) {
      if (span.attributes.length === 0) {
        // Unwrap: move children to parent
        const parent = span.parentNode;
        if (parent) {
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          parent.removeChild(span);
          changed = true;
        }
      }
    }
  }

  // Remove completely empty paragraphs (unless they're the only content)
  const emptyParas = Array.from(doc.body.querySelectorAll('p'));
  for (const p of emptyParas) {
    if (p.innerHTML.trim() === '' && doc.body.children.length > 1) {
      p.remove();
    }
  }
}

// --- Excel table normalization ---

/**
 * Clean Excel-specific attributes and normalize table formatting.
 */
function normalizeExcelTables(doc: Document): void {
  const tables = Array.from(doc.body.querySelectorAll('table'));

  for (const table of tables) {
    // Remove Excel-specific attributes from table
    removeExcelAttributes(table);

    // Process all cells
    const cells = Array.from(table.querySelectorAll('td, th'));
    for (const cell of cells) {
      removeExcelAttributes(cell);

      // Clean styles on cells
      const style = cell.getAttribute('style');
      if (style) {
        const cleaned = cleanMsoStyles(style);
        if (cleaned) {
          cell.setAttribute('style', cleaned);
        } else {
          cell.removeAttribute('style');
        }
      }
    }

    // Process rows
    const rows = Array.from(table.querySelectorAll('tr'));
    for (const row of rows) {
      removeExcelAttributes(row);
    }
  }
}

/** Excel-specific attributes to remove from table elements */
const EXCEL_ATTRS = [
  'x:num', 'x:str', 'x:fmla', 'x:autofilter',
  'mso-number-format',
];

function removeExcelAttributes(el: Element): void {
  for (const attr of EXCEL_ATTRS) {
    el.removeAttribute(attr);
  }
  // Also remove class if it only had MSO classes
  const className = el.getAttribute('class');
  if (className) {
    const cleaned = className.replace(MSO_CLASS_PATTERN, '').trim();
    if (cleaned) {
      el.setAttribute('class', cleaned);
    } else {
      el.removeAttribute('class');
    }
  }
}

// --- Security hardening ---

/** Tags to remove entirely (defense-in-depth alongside TipTap schema) */
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'applet',
  'form', 'input', 'textarea', 'select', 'button',
];

const EVENT_ATTR_PATTERN = /^on/i;
const DANGEROUS_URL_PATTERN = /^\s*(javascript|vbscript|data\s*:(?!image))/i;

/**
 * Remove dangerous elements and attributes.
 * Defense-in-depth: TipTap's schema will also reject these,
 * but we strip them early to be safe.
 */
function sanitize(doc: Document): void {
  // Remove dangerous elements
  for (const tag of DANGEROUS_TAGS) {
    const elements = Array.from(doc.body.querySelectorAll(tag));
    for (const el of elements) {
      el.remove();
    }
  }

  // Remove dangerous attributes from all elements
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of allElements) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      // Remove event handlers
      if (EVENT_ATTR_PATTERN.test(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Remove dangerous URLs
      if ((attr.name === 'href' || attr.name === 'src' || attr.name === 'action') &&
        DANGEROUS_URL_PATTERN.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }

    // Strip file:// URLs (Word-local image references)
    const src = el.getAttribute('src');
    if (src && src.startsWith('file://')) {
      el.removeAttribute('src');
    }
    const href = el.getAttribute('href');
    if (href && href.startsWith('file://')) {
      el.removeAttribute('href');
    }
  }
}

// --- Style block removal ---

/**
 * Remove <style> blocks that Word/Excel injects.
 * These contain mso-* rules that aren't useful after cleaning.
 */
function removeStyleBlocks(doc: Document): void {
  const styles = Array.from(doc.querySelectorAll('style'));
  for (const s of styles) {
    s.remove();
  }
}

// --- Meta/link/head cleanup ---

/**
 * Remove <meta>, <link>, and other head-like elements that Office injects into the body.
 */
function removeHeadElements(doc: Document): void {
  const selectors = ['meta', 'link', 'title', 'xml'];
  for (const selector of selectors) {
    const elements = Array.from(doc.body.querySelectorAll(selector));
    for (const el of elements) {
      el.remove();
    }
  }
}

// --- Main transform ---

/**
 * Transform pasted Office HTML into clean, standard HTML.
 * This is the main entry point called by the TipTap extension.
 */
export function transformOfficeHTML(html: string): string {
  if (!isOfficeContent(html)) {
    return html;
  }

  // Step 1: Remove conditional comments before DOM parsing
  // (they can confuse the parser)
  let cleaned = removeConditionalComments(html);

  // Step 2: Parse into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, 'text/html');

  // Step 3: Remove head-like elements
  removeHeadElements(doc);

  // Step 4: Convert Word lists (before stripping mso-list metadata)
  if (isWordContent(html)) {
    convertWordLists(doc);
  }

  // Step 5: Remove Office namespace elements
  removeOfficeElements(doc);

  // Step 6: Normalize Excel tables
  if (isExcelContent(html)) {
    normalizeExcelTables(doc);
  }

  // Step 7: Clean styles and classes on all elements
  cleanElementStyles(doc);

  // Step 8: Remove style blocks (after extracting list info)
  removeStyleBlocks(doc);

  // Step 9: Remove empty wrappers
  removeEmptyWrappers(doc);

  // Step 10: Security hardening
  sanitize(doc);

  return doc.body.innerHTML;
}

// --- TipTap Extension ---

export const PasteFromOffice = Extension.create<PasteFromOfficeOptions>({
  name: 'pasteFromOffice',

  addOptions() {
    return {
      enabled: true,
    };
  },

  addStorage() {
    return {};
  },

  transformPastedHTML(html: string) {
    if (!this.options.enabled) {
      return html;
    }

    return transformOfficeHTML(html);
  },
});
