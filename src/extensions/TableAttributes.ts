/**
 * TableAttributes
 * The editor's table, row and cell nodes: TipTap's, extended to keep a table's
 * formatting through the parse/serialize cycle (borders, padding, spacing,
 * backgrounds, sizes, alignment and the caption).
 *
 * Editor content renders in the host page, not in an iframe as in TinyMCE, so
 * nothing is passed through whole. Each node keeps the style properties in its
 * rules whose values match their pattern (see cssValues), and the table keeps
 * border, cellpadding and cellspacing only as plain numbers. The legacy bgcolor,
 * valign, width, height and align attributes common in email are read into
 * the same style. Everything else is dropped.
 *
 * The caption is kept as plain text on the table node rather than as a node of
 * its own: prosemirror-tables treats every child of a table as a row. It is
 * shown above the table in the editor and edited from the table properties.
 */

import { mergeAttributes } from '@tiptap/core';
import type { Attribute } from '@tiptap/core';
import { Table, TableView, createColGroup, updateColumns } from '@tiptap/extension-table';
import type { TableOptions } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import type { DOMOutputSpec, Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { columnResizing, columnResizingPluginKey } from '@tiptap/pm/tables';
import type { EditorView, NodeView } from '@tiptap/pm/view';
import {
  CSS_BORDER_STYLE,
  CSS_COLOR,
  CSS_LENGTH,
  CSS_LENGTH_OR_PERCENT,
  pickStyle,
  sanitizeStyle,
  styleProperty,
} from '../utils/cssValues';
import type { StyleRules } from '../utils/cssValues';

const HORIZONTAL_ALIGN = /^(left|center|right|justify)$/;
const VERTICAL_ALIGN = /^(top|middle|bottom|baseline)$/;
const MARGIN = /^(auto|0|\d+(\.\d+)?(px|pt|em|%))$/;

const BOX_RULES: StyleRules = [
  ['background-color', CSS_COLOR],
  ['border-width', CSS_LENGTH],
  ['border-style', CSS_BORDER_STYLE],
  ['border-color', CSS_COLOR],
];

/** The style a table may keep. */
export const TABLE_STYLE_RULES: StyleRules = [
  ['width', CSS_LENGTH_OR_PERCENT],
  ['height', CSS_LENGTH_OR_PERCENT],
  ['border-collapse', /^(collapse|separate)$/],
  ['float', /^(left|right|none)$/],
  ['margin-left', MARGIN],
  ['margin-right', MARGIN],
  ...BOX_RULES,
];

/** The style a row may keep. */
export const ROW_STYLE_RULES: StyleRules = [
  ['height', CSS_LENGTH_OR_PERCENT],
  ['text-align', HORIZONTAL_ALIGN],
  ['vertical-align', VERTICAL_ALIGN],
  ...BOX_RULES,
];

/**
 * The style a cell may keep. Its width is the column width TipTap already
 * keeps, and its text-align is TipTap's `align` attribute.
 */
export const CELL_STYLE_RULES: StyleRules = [
  ['height', CSS_LENGTH_OR_PERCENT],
  ['vertical-align', VERTICAL_ALIGN],
  ...BOX_RULES,
];

const SCOPE = /^(row|col|rowgroup|colgroup)$/;

/** The most rows, and the most columns, a table can be inserted with. */
export const MAX_TABLE_SIZE = 100;
const SMALL_NUMBER = /^\s*(\d{1,3})(px)?\s*$/i;

/**
 * A border, cellpadding or cellspacing value as the plain number it is
 * written as (`2` or `2px` gives `'2'`), or null for anything else.
 */
export function smallNumber(value: unknown): string | null {
  return SMALL_NUMBER.exec(String(value ?? ''))?.[1] ?? null;
}

/** A legacy size attribute (`600`, `600px`, `100%`) as a CSS length, or ''. */
function legacyLength(value: string | null): string {
  const match = /^\s*(\d+(\.\d+)?)\s*(px|%)?\s*$/i.exec(value ?? '');
  if (!match) return '';
  return match[3] === '%' ? `${match[1]}%` : `${match[1]}px`;
}

/** A legacy color attribute as CSS: browsers read a bare hex value (`ffcc00`) as `#ffcc00`. */
function legacyColor(value: string | null): string {
  const trimmed = value?.trim() ?? '';
  return /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? `#${trimmed}` : trimmed;
}

/**
 * The allowed style of `element` under `rules`, with the legacy presentational
 * attributes read in where the style does not already set the property.
 */
function styleOf(element: HTMLElement, rules: StyleRules): string | null {
  const style = element.ownerDocument.createElement('div').style;
  style.cssText = element.style.cssText;
  const fill = (property: string, value: string) => {
    if (value && !style.getPropertyValue(property)) style.setProperty(property, value);
  };
  fill('background-color', legacyColor(element.getAttribute('bgcolor')));
  fill('vertical-align', element.getAttribute('valign')?.trim().toLowerCase() ?? '');
  fill('height', legacyLength(element.getAttribute('height')));
  if (element.tagName === 'TABLE') {
    fill('width', legacyLength(element.getAttribute('width')));
    const align = element.getAttribute('align')?.trim().toLowerCase();
    if (align === 'center') {
      fill('margin-left', 'auto');
      fill('margin-right', 'auto');
    } else if (align === 'left' || align === 'right') {
      fill('float', align);
    }
  } else if (element.tagName === 'TR') {
    fill('text-align', element.getAttribute('align')?.trim().toLowerCase() ?? '');
  }
  return pickStyle(style, rules, element.ownerDocument);
}

/** A `style` attribute for a node, kept through `rules` on the way in and out. */
function styleAttribute(rules: StyleRules): Attribute {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => styleOf(element, rules),
    renderHTML: (attributes: Record<string, unknown>) => {
      const style = sanitizeStyle(attributes.style, rules);
      return style ? { style } : {};
    },
  };
}

/** One of the table's numeric presentational attributes. */
function numberAttribute(name: string): Attribute {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => smallNumber(element.getAttribute(name)),
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = smallNumber(attributes[name]);
      return value ? { [name]: value } : {};
    },
  };
}

/** The text of a table's own <caption>, whitespace collapsed, or null. */
function captionOf(table: HTMLElement): string | null {
  const caption = Array.from(table.children).find((child) => child.tagName === 'CAPTION');
  const text = caption?.textContent?.replace(/\s+/g, ' ').trim();
  return text || null;
}

/** The table's own style joined with the width TipTap computes from its columns. */
function tableStyle(node: PMNode, cellMinWidth: number): string {
  const { tableWidth, tableMinWidth } = createColGroup(node, cellMinWidth);
  const own = sanitizeStyle(node.attrs.style, TABLE_STYLE_RULES) ?? '';
  const sizing = /(^|;)\s*width\s*:/.test(own)
    ? ''
    : tableWidth
      ? `width: ${tableWidth}`
      : tableMinWidth
        ? `min-width: ${tableMinWidth}`
        : '';
  return [sizing, own].filter(Boolean).join('; ');
}

const NUMBER_ATTRIBUTES = ['border', 'cellpadding', 'cellspacing'] as const;

/**
 * The editor view of a table: TipTap's, with the table's style, numeric
 * attributes and caption applied, and kept up to date when they change.
 */
export class StyledTableView extends TableView {
  private captionEl: HTMLElement | null = null;

  constructor(node: PMNode, cellMinWidth: number, view?: EditorView, HTMLAttributes: Record<string, unknown> = {}) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.applyAttributes();
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.applyAttributes();
    return true;
  }

  private applyAttributes(): void {
    const { attrs } = this.node;
    const style = sanitizeStyle(attrs.style, TABLE_STYLE_RULES) ?? '';
    this.table.style.cssText = style;
    updateColumns(this.node, this.colgroup, this.table, this.cellMinWidth);
    // updateColumns clears the width when the style sets one (it only sizes
    // tables without one), so put it back for the editor to show.
    const width = styleProperty(style, 'width', this.table.ownerDocument);
    if (width) this.table.style.width = width;
    for (const name of NUMBER_ATTRIBUTES) {
      const value = smallNumber(attrs[name]);
      if (value) this.table.setAttribute(name, value);
      else this.table.removeAttribute(name);
    }
    if (attrs.caption) {
      if (!this.captionEl) {
        this.captionEl = document.createElement('caption');
        this.captionEl.setAttribute('contenteditable', 'false');
        this.captionEl.className = 'md-table-caption';
        this.table.insertBefore(this.captionEl, this.table.firstChild);
      }
      this.captionEl.textContent = String(attrs.caption);
    } else if (this.captionEl) {
      this.captionEl.remove();
      this.captionEl = null;
    }
  }
}

export interface StyledTableOptions extends TableOptions {
  /** Attributes given to a table the user inserts: only border, cellpadding and cellspacing are used. */
  defaultAttributes: Record<string, string>;
  /** Style given to a table the user inserts, kept through TABLE_STYLE_RULES. */
  defaultStyles: Record<string, string>;
  /** Tab and Shift+Tab move between cells (TinyMCE's table_tab_navigation). */
  tabNavigation: boolean;
  /**
   * Runs when Tab in the last cell adds a row, in place of adding it here, so
   * the editor can add it as a table command and fire its events. Should add a
   * row after the current one and move into it.
   */
  onTabAddRow: (() => boolean) | null;
}

export interface InsertStyledTableOptions {
  rows?: number;
  cols?: number;
  /** How many rows at the top are header rows. */
  headerRows?: number;
  /** How many columns at the left are header columns. */
  headerCols?: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledTable: {
      /**
       * Insert a table with the configured default attributes and style, and
       * the given number of header rows and columns.
       */
      insertStyledTable: (options?: InsertStyledTableOptions) => ReturnType;
    };
  }
}

/** The default attributes for an inserted table: its numeric attributes and its style. */
function defaultTableAttrs(options: StyledTableOptions): Record<string, string | null> {
  const attrs: Record<string, string | null> = {};
  for (const name of NUMBER_ATTRIBUTES) {
    attrs[name] = smallNumber(options.defaultAttributes[name]);
  }
  const declarations = Object.entries(options.defaultStyles)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
  attrs.style = sanitizeStyle(declarations, TABLE_STYLE_RULES);
  return attrs;
}

export const StyledTable = Table.extend<StyledTableOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      View: StyledTableView,
      defaultAttributes: {},
      defaultStyles: {},
      tabNavigation: true,
      onTabAddRow: null,
    } as StyledTableOptions;
  },

  addKeyboardShortcuts() {
    const shortcuts = { ...this.parent?.() };
    if (!this.options.tabNavigation) {
      delete shortcuts.Tab;
      delete shortcuts['Shift-Tab'];
    } else if (this.options.onTabAddRow) {
      const onTabAddRow = this.options.onTabAddRow;
      shortcuts.Tab = () => {
        if (this.editor.commands.goToNextCell()) return true;
        if (!this.editor.can().addRowAfter()) return false;
        return onTabAddRow();
      };
    }
    return shortcuts;
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      // Rendered by renderHTML, which joins it with the computed width.
      style: { ...styleAttribute(TABLE_STYLE_RULES), rendered: false },
      border: numberAttribute('border'),
      cellpadding: numberAttribute('cellpadding'),
      cellspacing: numberAttribute('cellspacing'),
      caption: {
        default: null,
        rendered: false,
        parseHTML: (element: HTMLElement) => captionOf(element),
      },
    };
  },

  parseHTML() {
    // The caption's text is read by the `caption` attribute; its content must
    // not also be parsed, or it becomes a row of its own.
    return [...(this.parent?.() ?? []), { tag: 'caption', ignore: true }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { colgroup } = createColGroup(node, this.options.cellMinWidth);
    const style = tableStyle(node, this.options.cellMinWidth);
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {});
    const children: DOMOutputSpec[] = [];
    if (node.attrs.caption) children.push(['caption', String(node.attrs.caption)]);
    if (colgroup) children.push(colgroup);
    const table: DOMOutputSpec = ['table', attrs, ...children, ['tbody', 0]];
    return this.options.renderWrapper ? ['div', { class: 'tableWrapper' }, table] : table;
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertStyledTable:
        ({ rows = 3, cols = 3, headerRows = 0, headerCols = 0 }: InsertStyledTableOptions = {}) =>
        ({ tr, dispatch, editor }) => {
          const { schema } = editor;
          rows = Math.min(Math.max(rows, 1), MAX_TABLE_SIZE);
          cols = Math.min(Math.max(cols, 1), MAX_TABLE_SIZE);
          const rowNodes: PMNode[] = [];
          for (let r = 0; r < rows; r++) {
            const cells: PMNode[] = [];
            for (let c = 0; c < cols; c++) {
              const type = r < headerRows || c < headerCols ? schema.nodes.tableHeader : schema.nodes.tableCell;
              const cell = type.createAndFill();
              if (cell) cells.push(cell);
            }
            rowNodes.push(schema.nodes.tableRow.createChecked(null, cells));
          }
          const table = this.type.createChecked(defaultTableAttrs(this.options), rowNodes);

          if (dispatch) {
            const offset = tr.selection.from + 1;
            tr.replaceSelectionWith(table).scrollIntoView().setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() ?? [];
    // TipTap adds column resizing only when the editor is editable as it is
    // created, so a read-only editor made editable later could never resize.
    // The plugin itself ignores the mouse while the view is not editable.
    const hasResizing = plugins.some((plugin) => (plugin as { spec?: { key?: unknown } }).spec?.key === columnResizingPluginKey);
    if (!this.options.resizable || hasResizing) return plugins;
    return [
      columnResizing({
        handleWidth: this.options.handleWidth,
        cellMinWidth: this.options.cellMinWidth,
        defaultCellMinWidth: this.options.cellMinWidth,
        View: this.options.View,
        lastColumnResizable: this.options.lastColumnResizable,
      }),
      ...plugins,
    ];
  },

  addNodeView() {
    // With resizing, the columnResizing plugin creates the view (see above).
    if (this.options.resizable) return null;
    const View = this.options.View;
    if (!View) return null;
    return ({ node, view, HTMLAttributes }) =>
      new View(node, this.options.cellMinWidth, view, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)) as NodeView;
  },
});

export const StyledTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute(ROW_STYLE_RULES),
    };
  },
});

/** The attributes a data or header cell adds to TipTap's. */
function cellAttributes(): Record<string, Attribute> {
  return {
    style: styleAttribute(CELL_STYLE_RULES),
    scope: {
      default: null,
      parseHTML: (element: HTMLElement) => {
        const scope = element.getAttribute('scope')?.trim().toLowerCase() ?? '';
        return SCOPE.test(scope) ? scope : null;
      },
      renderHTML: (attributes: Record<string, unknown>) =>
        typeof attributes.scope === 'string' && SCOPE.test(attributes.scope) ? { scope: attributes.scope } : {},
    },
  };
}

export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});

export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});
