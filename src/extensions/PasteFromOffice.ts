/**
 * PasteFromOffice Extension
 * Detects and cleans HTML pasted from Microsoft Word and Excel,
 * preserving formatting while stripping Office-specific cruft.
 */

import { Extension } from '@tiptap/core';

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

interface ListStyleInfo {
  listId: string;
  level: number;
  isOrdered: boolean;
}

/**
 * Parse the <style> block for @list rules to determine numbering format.
 * Word embeds list formatting like:
 *   @list l0:level1 { mso-level-number-format: bullet; }
 *   @list l1:level1 { mso-level-number-format: decimal; }
 */
function parseListStyles(doc: Document): Map<string, boolean> {
  const styleMap = new Map<string, boolean>(); // "l0:level1" => isOrdered
  const styleEls = doc.querySelectorAll('style');

  for (const styleEl of Array.from(styleEls)) {
    const css = styleEl.textContent ?? '';
    // Match @list declarations
    const listRulePattern = /@list\s+(l\d+):level(\d+)\s*\{([^}]*)\}/gi;
    let match: RegExpExecArray | null;
    while ((match = listRulePattern.exec(css)) !== null) {
      const listId = match[1];
      const level = match[2];
      const body = match[3];
      const key = `${listId}:level${level}`;

      // Check number format
      const formatMatch = /mso-level-number-format:\s*([^;]+)/i.exec(body);
      if (formatMatch) {
        const format = formatMatch[1].trim().toLowerCase();
        // bullet = unordered, everything else = ordered
        styleMap.set(key, format !== 'bullet');
      } else {
        // Default: ordered if no format specified (Word default for numbered lists)
        styleMap.set(key, true);
      }
    }
  }

  return styleMap;
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
    isOrdered: false, // Will be resolved from style rules
  };
}

// --- List conversion ---

/**
 * Convert Word's fake list paragraphs to proper <ul>/<ol> + <li>.
 * Word outputs lists as:
 *   <p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1">
 *     <span>·<span>&nbsp;</span></span>Item text
 *   </p>
 */
function convertWordLists(doc: Document): void {
  const listStyles = parseListStyles(doc);

  // Find all list paragraphs (class starts with MsoList)
  const listParagraphs = Array.from(doc.body.querySelectorAll('[class*="MsoList"]'));
  if (listParagraphs.length === 0) return;

  // Group consecutive list paragraphs into list blocks
  const groups: HTMLElement[][] = [];
  let currentGroup: HTMLElement[] = [];

  for (const p of listParagraphs) {
    const el = p as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    if (!parseListStyle(style)) continue;

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

function convertListGroup(
  doc: Document,
  paragraphs: HTMLElement[],
  listStyles: Map<string, boolean>,
): void {
  if (paragraphs.length === 0) return;

  // Build a nested list structure
  const rootInfo = parseListStyle(paragraphs[0].getAttribute('style') ?? '');
  if (!rootInfo) return;

  const parent = paragraphs[0].parentNode;
  if (!parent) return;

  // Determine if the top-level list is ordered or unordered
  const rootKey = `${rootInfo.listId}:level${rootInfo.level}`;
  const isRootOrdered = listStyles.get(rootKey) ?? false;

  const rootList = doc.createElement(isRootOrdered ? 'ol' : 'ul');

  // Track list nesting using a stack
  interface ListFrame {
    element: HTMLElement;
    level: number;
  }
  const stack: ListFrame[] = [{ element: rootList, level: rootInfo.level }];

  for (const p of paragraphs) {
    const style = p.getAttribute('style') ?? '';
    const info = parseListStyle(style);
    if (!info) continue;

    const key = `${info.listId}:level${info.level}`;
    const isOrdered = listStyles.get(key) ?? false;

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
      const subList = doc.createElement(isOrdered ? 'ol' : 'ul');
      lastLi.appendChild(subList);
      stack.push({ element: subList, level: info.level });
    }

    // Create <li> with the paragraph's content
    const li = doc.createElement('li');

    // Remove list marker spans (Word inlines bullets/numbers as text)
    removeListMarkers(p);

    // Move content from paragraph to li
    while (p.firstChild) {
      li.appendChild(p.firstChild);
    }

    // Preserve any useful inline styles (font, color, etc.)
    const cleanedStyle = cleanMsoStyles(style);
    if (cleanedStyle) {
      li.setAttribute('style', cleanedStyle);
    }

    stack[stack.length - 1].element.appendChild(li);
  }

  // Replace the first paragraph with the list, remove the rest
  parent.insertBefore(rootList, paragraphs[0]);
  for (const p of paragraphs) {
    p.remove();
  }
}

/**
 * Remove Word's list marker spans — these are the bullet/number characters
 * that Word inlines as text content. They usually look like:
 *   <span style="mso-list:Ignore">·<span style="font:...">&nbsp;</span></span>
 *   <span style="mso-list:Ignore">1.<span>&nbsp;</span></span>
 */
function removeListMarkers(el: HTMLElement): void {
  const spans = Array.from(el.querySelectorAll('span'));
  for (const span of spans) {
    const style = span.getAttribute('style') ?? '';
    if (/mso-list:\s*Ignore/i.test(style)) {
      span.remove();
    }
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
