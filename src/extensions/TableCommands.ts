/**
 * TableCommands Extension
 * The table operations TinyMCE has and TipTap does not: deleting the last row
 * or column deletes the table, merging leaves no empty rows, rows and columns
 * can be cut, copied and pasted, rows, columns and cells change type, and the
 * table, row and cell attributes are set through their allowlists.
 *
 * The row/column clipboard is per editor, as in TinyMCE: it is separate from
 * the system clipboard, which Ctrl+C/Ctrl+V keep using.
 */

import { Extension } from '@tiptap/core';
import type { Node as PMNode, NodeType, Slice } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import {
  CellSelection,
  TableMap,
  addColumn,
  addRow,
  findTable,
  isInTable,
  mergeCells,
  selectedRect,
  selectionCell,
  __insertCells,
  __pastedCells,
} from '@tiptap/pm/tables';
import type { Rect, TableRect } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';
import { mergeStyle, sanitizeStyle } from '../utils/cssValues';
import { CELL_STYLE_RULES, ROW_STYLE_RULES, TABLE_STYLE_RULES } from './TableAttributes';

/** A cut or copied set of whole rows or whole columns. */
export interface TableClipboard {
  kind: 'row' | 'column';
  slice: Slice;
}

export interface TableCommandsStorage {
  clipboard: TableClipboard | null;
}

/** Table attributes that can be set; style is filtered through TABLE_STYLE_RULES. */
export interface TableAttributeChanges {
  style?: string | null;
  border?: string | null;
  cellpadding?: string | null;
  cellspacing?: string | null;
  caption?: string | null;
}

/** Cell attributes that can be set; style is filtered through CELL_STYLE_RULES. */
export interface CellAttributeChanges {
  style?: string | null;
  align?: 'left' | 'center' | 'right' | null;
  scope?: 'row' | 'col' | 'rowgroup' | 'colgroup' | null;
  colwidth?: number[] | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableCommands: {
      /** Delete the selected rows, or the table when they are all of its rows. */
      deleteTableRows: () => ReturnType;
      /** Delete the selected columns, or the table when they are all of its columns. */
      deleteTableColumns: () => ReturnType;
      /** Merge the selected cells, then drop any row the merge left empty. */
      mergeTableCells: () => ReturnType;
      copyTableRows: () => ReturnType;
      cutTableRows: () => ReturnType;
      pasteTableRows: (before: boolean) => ReturnType;
      copyTableColumns: () => ReturnType;
      cutTableColumns: () => ReturnType;
      pasteTableColumns: (before: boolean) => ReturnType;
      setTableAttributes: (changes: TableAttributeChanges) => ReturnType;
      /** Apply style properties to every selected row; an empty value removes one. */
      applyTableRowStyle: (changes: Record<string, string | null>) => ReturnType;
      /** Set attributes on every selected cell. */
      setTableCellAttributes: (changes: CellAttributeChanges) => ReturnType;
      /** Apply style properties to every selected cell; an empty value removes one. */
      applyTableCellStyle: (changes: Record<string, string | null>) => ReturnType;
      /** Make every selected cell a data cell (`td`) or a header cell (`th`). */
      setTableCellType: (type: 'td' | 'th') => ReturnType;
      /** Make every cell in the selected columns a data or header cell. */
      setTableColumnType: (type: 'td' | 'th') => ReturnType;
      /** Make the selected rows header rows (all `th`) or body rows (all `td`). */
      setTableRowType: (type: 'header' | 'body') => ReturnType;
      /** Set the width of the selected columns in pixels, as dragging their border would; null clears it. */
      setTableColumnWidth: (width: number | null) => ReturnType;
    };
  }
}

/**
 * The table the selection's head is in (where isInTable looks), or null. A
 * selection dragged into a table from outside it is in that table.
 */
export function tableAtSelection(state: EditorState): { node: PMNode; pos: number; start: number } | null {
  return findTable(state.selection.$head) ?? null;
}

/** The editor's <table> element for the table at the selection, or null. */
export function tableElementAtSelection(view: EditorView): HTMLTableElement | null {
  const found = tableAtSelection(view.state);
  const dom = found ? view.nodeDOM(found.pos) : null;
  if (dom instanceof HTMLTableElement) return dom;
  return dom instanceof HTMLElement ? dom.querySelector('table') : null;
}

/** The selected rectangle of the table at the selection, or null outside a table. */
export function tableRect(state: EditorState): TableRect | null {
  return isInTable(state) ? selectedRect(state) : null;
}

/** Document positions of the selected cells: the cell selection, or the cell at the cursor. */
export function selectedCellPositions(state: EditorState): number[] {
  if (!isInTable(state)) return [];
  const { selection } = state;
  if (selection instanceof CellSelection) {
    const positions: number[] = [];
    selection.forEachCell((_node, pos) => positions.push(pos));
    return positions;
  }
  return [selectionCell(state).pos];
}

/** Document positions of the cells overlapping `rect` in its table. */
function cellsIn(rect: TableRect, area: Rect): number[] {
  return rect.map.cellsInRect(area).map((pos) => rect.tableStart + pos);
}

/** Document positions of the selected rows. */
function rowPositions(rect: TableRect): number[] {
  const positions: number[] = [];
  let pos = rect.tableStart;
  for (let row = 0; row < rect.bottom; row++) {
    if (row >= rect.top) positions.push(pos);
    pos += rect.table.child(row).nodeSize;
  }
  return positions;
}

/** True when every node at `positions` is a header cell. */
function allHeaders(doc: PMNode, positions: number[]): boolean {
  return positions.length > 0 && positions.every((pos) => doc.nodeAt(pos)?.type.name === 'tableHeader');
}

/** `'header'` or `'body'` for the selected rows, or '' outside a table. */
export function getTableRowType(state: EditorState): '' | 'header' | 'body' {
  const rect = tableRect(state);
  if (!rect) return '';
  return allHeaders(state.doc, cellsIn(rect, { left: 0, right: rect.map.width, top: rect.top, bottom: rect.bottom }))
    ? 'header'
    : 'body';
}

/** `'th'` or `'td'` for the selected columns, or '' outside a table. */
export function getTableColumnType(state: EditorState): '' | 'td' | 'th' {
  const rect = tableRect(state);
  if (!rect) return '';
  return allHeaders(state.doc, cellsIn(rect, { left: rect.left, right: rect.right, top: 0, bottom: rect.map.height }))
    ? 'th'
    : 'td';
}

/** `'th'` or `'td'` for the selected cells, or '' outside a table. */
export function getTableCellType(state: EditorState): '' | 'td' | 'th' {
  const positions = selectedCellPositions(state);
  if (!positions.length) return '';
  return allHeaders(state.doc, positions) ? 'th' : 'td';
}

/** The table node at the selection, or null outside a table. */
export function selectedTable(state: EditorState): PMNode | null {
  return tableRect(state)?.table ?? null;
}

/** Change every cell at `positions` to `type`, keeping its attributes and content. */
function retype(tr: Transaction, positions: number[], type: NodeType): void {
  for (const pos of positions) {
    const cell = tr.doc.nodeAt(pos);
    if (cell && cell.type !== type) tr.setNodeMarkup(pos, type, cell.attrs);
  }
}

/**
 * Drop the rows of the table at `tableStart` that have no cells (a merge
 * across whole rows leaves them behind), shortening the rowspans that crossed
 * them, so the output has no `<tr></tr>`.
 */
function removeEmptyRows(tr: Transaction, tableStart: number): void {
  const table = tr.doc.nodeAt(tableStart - 1);
  if (!table) return;
  const empty: number[] = [];
  table.forEach((row, _offset, index) => {
    if (row.childCount === 0) empty.push(index);
  });
  if (!empty.length) return;

  table.forEach((row, rowOffset, index) => {
    row.forEach((cell, cellOffset) => {
      const crossed = empty.filter((e) => e > index && e < index + cell.attrs.rowspan).length;
      if (crossed) {
        tr.setNodeMarkup(tableStart + rowOffset + 1 + cellOffset, null, { ...cell.attrs, rowspan: cell.attrs.rowspan - crossed });
      }
    });
  });

  // setNodeMarkup moved nothing, so the offsets are still good bottom-up.
  for (const index of empty.reverse()) {
    let pos = tableStart;
    for (let i = 0; i < index; i++) pos += table.child(i).nodeSize;
    tr.delete(pos, pos + table.child(index).nodeSize);
  }
}

/**
 * Write `cells` into `area` of the table at `tableStart`, splitting any span
 * that crosses its edges and growing the table when the cells do not fit.
 * prosemirror-tables' paste logic. It maps positions through every step of
 * the transaction it is given, so it runs on a fresh state of the current
 * document and its steps are then added to `tr`.
 */
function insertCells(tr: Transaction, tableStart: number, area: Rect, cells: NonNullable<ReturnType<typeof __pastedCells>>): void {
  __insertCells(EditorState.create({ doc: tr.doc }), (pasted) => {
    for (const step of pasted.steps) tr.step(step);
    tr.setSelection(pasted.selection.getBookmark().resolve(tr.doc));
  }, tableStart, area, cells);
}

export const TableCommands = Extension.create<Record<string, never>, TableCommandsStorage>({
  name: 'tableCommands',

  addStorage() {
    return { clipboard: null };
  },

  addCommands() {
    const copy =
      (kind: 'row' | 'column') =>
      ({ state, dispatch }: { state: EditorState; dispatch?: unknown }) => {
        const rect = tableRect(state);
        if (!rect) return false;
        if (dispatch) {
          const { map, tableStart } = rect;
          const lastRow = map.height - 1;
          const [anchor, head] =
            kind === 'row'
              ? [map.map[rect.top * map.width], map.map[(rect.bottom - 1) * map.width + map.width - 1]]
              : [map.map[rect.left], map.map[lastRow * map.width + rect.right - 1]];
          const $anchor = state.doc.resolve(tableStart + anchor);
          const $head = state.doc.resolve(tableStart + head);
          const selection = kind === 'row' ? CellSelection.rowSelection($anchor, $head) : CellSelection.colSelection($anchor, $head);
          this.storage.clipboard = { kind, slice: selection.content() };
        }
        return true;
      };

    const paste =
      (kind: 'row' | 'column', before: boolean) =>
      ({ state, tr, dispatch }: { state: EditorState; tr: Transaction; dispatch?: unknown }) => {
        const clipboard = this.storage.clipboard;
        const rect = tableRect(state);
        if (!clipboard || clipboard.kind !== kind || !rect) return false;
        const cells = __pastedCells(clipboard.slice);
        if (!cells) return false;
        if (!dispatch) return true;

        const { tableStart } = rect;
        const count = kind === 'row' ? cells.height : cells.width;
        const index = kind === 'row' ? (before ? rect.top : rect.bottom) : before ? rect.left : rect.right;
        // Empty rows or columns first, the full width or height of the table,
        // so pasted cells narrower or shorter than it leave the rest empty.
        for (let i = 0; i < count; i++) {
          const table = tr.doc.nodeAt(tableStart - 1)!;
          // addRow and addColumn only read map, tableStart and table.
          const target: TableRect = { map: TableMap.get(table), tableStart, table, left: 0, top: 0, right: 0, bottom: 0 };
          if (kind === 'row') addRow(tr, target, index);
          else addColumn(tr, target, index);
        }
        const area =
          kind === 'row'
            ? { left: 0, top: index, right: cells.width, bottom: index + cells.height }
            : { left: index, top: 0, right: index + cells.width, bottom: cells.height };
        insertCells(tr, tableStart, area, cells);
        return true;
      };

    return {
      deleteTableRows:
        () =>
        ({ state, commands }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          return rect.top === 0 && rect.bottom === rect.map.height ? commands.deleteTable() : commands.deleteRow();
        },

      deleteTableColumns:
        () =>
        ({ state, commands }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          return rect.left === 0 && rect.right === rect.map.width ? commands.deleteTable() : commands.deleteColumn();
        },

      mergeTableCells:
        () =>
        ({ state, tr, dispatch }) => {
          const rect = tableRect(state);
          if (!rect || !mergeCells(state)) return false;
          if (dispatch) {
            // mergeCells adds its steps to the command's transaction (state.tr).
            mergeCells(state, () => {});
            removeEmptyRows(tr, rect.tableStart);
          }
          return true;
        },

      copyTableRows: () => copy('row'),
      copyTableColumns: () => copy('column'),

      cutTableRows:
        () =>
        ({ commands }) =>
          commands.copyTableRows() && commands.deleteTableRows(),

      cutTableColumns:
        () =>
        ({ commands }) =>
          commands.copyTableColumns() && commands.deleteTableColumns(),

      pasteTableRows: (before: boolean) => paste('row', before),
      pasteTableColumns: (before: boolean) => paste('column', before),

      setTableAttributes:
        (changes: TableAttributeChanges) =>
        ({ state, tr, dispatch }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          if (dispatch) {
            const attrs: Record<string, unknown> = { ...rect.table.attrs, ...changes };
            if ('style' in changes) attrs.style = sanitizeStyle(changes.style, TABLE_STYLE_RULES);
            if ('caption' in changes) attrs.caption = changes.caption?.replace(/\s+/g, ' ').trim() || null;
            tr.setNodeMarkup(rect.tableStart - 1, null, attrs);
          }
          return true;
        },

      applyTableRowStyle:
        (changes: Record<string, string | null>) =>
        ({ state, tr, dispatch }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          if (dispatch) {
            for (const pos of rowPositions(rect)) {
              const row = tr.doc.nodeAt(pos)!;
              tr.setNodeMarkup(pos, null, { ...row.attrs, style: mergeStyle(row.attrs.style, changes, ROW_STYLE_RULES) });
            }
          }
          return true;
        },

      setTableCellAttributes:
        (changes: CellAttributeChanges) =>
        ({ state, tr, dispatch }) => {
          const positions = selectedCellPositions(state);
          if (!positions.length) return false;
          if (dispatch) {
            for (const pos of positions) {
              const cell = tr.doc.nodeAt(pos)!;
              const attrs: Record<string, unknown> = { ...cell.attrs, ...changes };
              if ('style' in changes) attrs.style = sanitizeStyle(changes.style, CELL_STYLE_RULES);
              tr.setNodeMarkup(pos, null, attrs);
            }
          }
          return true;
        },

      applyTableCellStyle:
        (changes: Record<string, string | null>) =>
        ({ state, tr, dispatch }) => {
          const positions = selectedCellPositions(state);
          if (!positions.length) return false;
          if (dispatch) {
            for (const pos of positions) {
              const cell = tr.doc.nodeAt(pos)!;
              tr.setNodeMarkup(pos, null, { ...cell.attrs, style: mergeStyle(cell.attrs.style, changes, CELL_STYLE_RULES) });
            }
          }
          return true;
        },

      setTableCellType:
        (type: 'td' | 'th') =>
        ({ state, tr, dispatch }) => {
          const positions = selectedCellPositions(state);
          if (!positions.length) return false;
          if (dispatch) retype(tr, positions, state.schema.nodes[type === 'th' ? 'tableHeader' : 'tableCell']);
          return true;
        },

      setTableColumnType:
        (type: 'td' | 'th') =>
        ({ state, tr, dispatch }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          if (dispatch) {
            const positions = cellsIn(rect, { left: rect.left, right: rect.right, top: 0, bottom: rect.map.height });
            retype(tr, positions, state.schema.nodes[type === 'th' ? 'tableHeader' : 'tableCell']);
          }
          return true;
        },

      setTableRowType:
        (type: 'header' | 'body') =>
        ({ state, tr, dispatch }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          if (dispatch) {
            const positions = cellsIn(rect, { left: 0, right: rect.map.width, top: rect.top, bottom: rect.bottom });
            retype(tr, positions, state.schema.nodes[type === 'header' ? 'tableHeader' : 'tableCell']);
          }
          return true;
        },

      setTableColumnWidth:
        (width: number | null) =>
        ({ state, tr, dispatch }) => {
          const rect = tableRect(state);
          if (!rect) return false;
          if (dispatch) {
            // TipTap keeps a column's width on every cell in it, one entry per
            // column a cell spans, as column resizing does.
            const { map, tableStart, left, right } = rect;
            for (const pos of map.cellsInRect({ left, right, top: 0, bottom: map.height })) {
              const cell = tr.doc.nodeAt(tableStart + pos)!;
              const cellLeft = map.findCell(pos).left;
              const colwidth: number[] = Array.isArray(cell.attrs.colwidth)
                ? [...cell.attrs.colwidth]
                : new Array(cell.attrs.colspan).fill(0);
              for (let col = Math.max(left, cellLeft); col < Math.min(right, cellLeft + cell.attrs.colspan); col++) {
                colwidth[col - cellLeft] = width ?? 0;
              }
              tr.setNodeMarkup(tableStart + pos, null, { ...cell.attrs, colwidth: colwidth.some((w) => w > 0) ? colwidth : null });
            }
          }
          return true;
        },
    };
  },
});
