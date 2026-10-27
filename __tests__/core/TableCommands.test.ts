/**
 * Table commands Tests
 * The TinyMCE table commands (execCommand / queryCommandValue) and events.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { Plugin } from '@tiptap/pm/state';
import type { EditorConfig } from '../../src/types';

/** The table in getContent() as rows of `tag:text` cells, e.g. [['th:a', 'td:b']]. */
function grid(editor: HTMLEditor): string[][] {
  const host = document.createElement('div');
  host.innerHTML = editor.getContent();
  return Array.from(host.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.children).map((cell) => `${cell.tagName.toLowerCase()}:${cell.textContent ?? ''}`)
  );
}

function tableEl(editor: HTMLEditor): HTMLTableElement | null {
  const host = document.createElement('div');
  host.innerHTML = editor.getContent();
  return host.querySelector('table');
}

/** Document positions of every table cell, row by row. */
function cellPositions(editor: HTMLEditor): number[][] {
  const rows: number[][] = [];
  editor.getTipTap()!.state.doc.descendants((node, pos) => {
    if (node.type.name === 'tableRow') rows.push([]);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') rows[rows.length - 1].push(pos);
    return true;
  });
  return rows;
}

/** Put the cursor in the cell at row `r`, column `c` (cells in document order). */
function cursorIn(editor: HTMLEditor, r: number, c: number): void {
  editor.getTipTap()!.commands.setTextSelection(cellPositions(editor)[r][c] + 2);
}

/** Select the cells from (r1, c1) to (r2, c2). */
function selectCells(editor: HTMLEditor, r1: number, c1: number, r2: number, c2: number): void {
  const cells = cellPositions(editor);
  editor.getTipTap()!.commands.setCellSelection({ anchorCell: cells[r1][c1], headCell: cells[r2][c2] });
}

const TABLE_2X2 = '<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';
const TABLE_3X3 =
  '<table><tbody>' +
  '<tr><td>a</td><td>b</td><td>c</td></tr>' +
  '<tr><td>d</td><td>e</td><td>f</td></tr>' +
  '<tr><td>g</td><td>h</td><td>i</td></tr>' +
  '</tbody></table>';

describe('Table commands', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  const create = (config: EditorConfig = {}, content = TABLE_2X2) => {
    editor = new HTMLEditor(container, config);
    editor.setContent(content);
    return editor;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
    jest.restoreAllMocks();
  });

  describe('mceInsertTable', () => {
    it('caps the size at 100 rows and 100 columns', () => {
      create({}, '<p>x</p>');
      editor.execCommand('mceInsertTable', false, { rows: 5000, columns: 2 });
      expect(grid(editor)).toHaveLength(100);
    });

    it('inserts a table of the given size, with no header row by default', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      expect(editor.execCommand('mceInsertTable', false, { rows: 2, columns: 3 })).toBe(true);
      expect(grid(editor)).toEqual([
        ['td:', 'td:', 'td:'],
        ['td:', 'td:', 'td:'],
      ]);
    });

    it('gives the table the default border and style', () => {
      create({}, '<p>x</p>');
      editor.execCommand('mceInsertTable', false, { rows: 1, columns: 1 });
      const table = tableEl(editor)!;
      expect(table.getAttribute('border')).toBe('1');
      expect(table.style.borderCollapse).toBe('collapse');
      expect(table.style.width).toBe('100%');
    });

    it('uses table_default_attributes and table_default_styles', () => {
      create({ table_default_attributes: { border: '0', cellpadding: '6' }, table_default_styles: { 'background-color': 'red' } }, '<p>x</p>');
      editor.execCommand('mceInsertTable', false, { rows: 1, columns: 1 });
      const table = tableEl(editor)!;
      expect(table.getAttribute('border')).toBe('0');
      expect(table.getAttribute('cellpadding')).toBe('6');
      expect(table.style.backgroundColor).toBe('red');
      expect(table.style.borderCollapse).toBe('');
    });

    it('adds header rows and columns from the options', () => {
      create({}, '<p>x</p>');
      editor.execCommand('mceInsertTable', false, { rows: 3, columns: 3, options: { headerRows: 1, headerColumns: 1 } });
      expect(grid(editor)).toEqual([
        ['th:', 'th:', 'th:'],
        ['th:', 'td:', 'td:'],
        ['th:', 'td:', 'td:'],
      ]);
    });

    it('falls back to table_default_header_rows and table_default_header_cols', () => {
      create({ table_default_header_rows: 1, table_default_header_cols: 0 }, '<p>x</p>');
      editor.execCommand('mceInsertTable', false, { rows: 2, columns: 2 });
      expect(grid(editor)).toEqual([
        ['th:', 'th:'],
        ['td:', 'td:'],
      ]);
    });
  });

  describe('rows and columns', () => {
    it('inserts a row before and after the current row', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableInsertRowBefore');
      cursorIn(editor, 2, 0);
      editor.execCommand('mceTableInsertRowAfter');
      expect(grid(editor).map((row) => row.join(' '))).toEqual(['td: td:', 'td:a td:b', 'td:c td:d', 'td: td:']);
    });

    it('inserts a column before and after the current column', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableInsertColBefore');
      cursorIn(editor, 0, 2);
      editor.execCommand('mceTableInsertColAfter');
      expect(grid(editor)[0]).toEqual(['td:', 'td:a', 'td:b', 'td:']);
    });

    it('deletes the current row and column', () => {
      create({}, TABLE_3X3);
      cursorIn(editor, 1, 1);
      editor.execCommand('mceTableDeleteRow');
      cursorIn(editor, 0, 1);
      editor.execCommand('mceTableDeleteCol');
      expect(grid(editor)).toEqual([
        ['td:a', 'td:c'],
        ['td:g', 'td:i'],
      ]);
    });

    it('deletes the table when its only row is deleted', () => {
      create({}, '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table><p>after</p>');
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableDeleteRow');
      expect(editor.getContent()).not.toContain('<table');
      expect(editor.getContent()).toContain('after');
    });

    it('deletes the table when every column is deleted', () => {
      create({}, `${TABLE_2X2}<p>after</p>`);
      selectCells(editor, 0, 0, 0, 1);
      editor.execCommand('mceTableDeleteCol');
      expect(editor.getContent()).not.toContain('<table');
    });

    it('deletes the table', () => {
      create({}, `${TABLE_2X2}<p>after</p>`);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableDelete');
      expect(editor.getContent()).not.toContain('<table');
    });
  });

  describe('merging and splitting', () => {
    it('merges a 2x2 selection into one cell without leaving an empty row', () => {
      create();
      selectCells(editor, 0, 0, 1, 1);
      editor.execCommand('mceTableMergeCells');
      const out = editor.getContent();
      expect(out).not.toContain('<tr></tr>');
      expect(out).not.toContain('rowspan');
      expect(out).toContain('colspan="2"');
      expect(grid(editor)).toEqual([['td:abcd']]);
    });

    it('keeps the rowspan when the merged rows still have other cells', () => {
      create({}, TABLE_3X3);
      selectCells(editor, 0, 0, 1, 0);
      editor.execCommand('mceTableMergeCells');
      expect(editor.getContent()).toContain('rowspan="2"');
    });

    it('splits a merged cell', () => {
      create({}, '<table><tbody><tr><td colspan="2">ab</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>');
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableSplitCells');
      expect(grid(editor)[0]).toHaveLength(2);
    });
  });

  describe('cut, copy and paste', () => {
    it('copies a row and pastes it after the current row', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCopyRow');
      cursorIn(editor, 1, 0);
      editor.execCommand('mceTablePasteRowAfter');
      expect(grid(editor).map((row) => row.join(' '))).toEqual(['td:a td:b', 'td:c td:d', 'td:a td:b']);
    });

    it('cuts a row and pastes it before another', () => {
      create({}, TABLE_3X3);
      cursorIn(editor, 2, 0);
      editor.execCommand('mceTableCutRow');
      expect(grid(editor)).toHaveLength(2);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTablePasteRowBefore');
      expect(grid(editor).map((row) => row.join(' '))).toEqual(['td:g td:h td:i', 'td:a td:b td:c', 'td:d td:e td:f']);
    });

    it('pads a pasted row that is narrower than the table', () => {
      create({}, `${TABLE_2X2}${TABLE_3X3}`);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCopyRow');
      cursorIn(editor, 2, 0); // first row of the second table
      editor.execCommand('mceTablePasteRowBefore');
      expect(grid(editor)[2]).toEqual(['td:a', 'td:b', 'td:']);
    });

    it('widens the table for a pasted row that is wider than it', () => {
      create({}, `${TABLE_3X3}${TABLE_2X2}`);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCopyRow');
      cursorIn(editor, 3, 0); // first row of the second table
      editor.execCommand('mceTablePasteRowAfter');
      const rows = grid(editor).slice(3);
      expect(rows[1]).toEqual(['td:a', 'td:b', 'td:c']);
      expect(rows.every((row) => row.length === 3)).toBe(true);
    });

    it('copies a column and pastes it after the current column', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCopyCol');
      cursorIn(editor, 0, 1);
      editor.execCommand('mceTablePasteColAfter');
      expect(grid(editor)).toEqual([
        ['td:a', 'td:b', 'td:a'],
        ['td:c', 'td:d', 'td:c'],
      ]);
    });

    it('cuts a column and pastes it before another', () => {
      create({}, TABLE_3X3);
      cursorIn(editor, 0, 2);
      editor.execCommand('mceTableCutCol');
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTablePasteColBefore');
      expect(grid(editor)[0]).toEqual(['td:c', 'td:a', 'td:b']);
    });

    it('does not paste a row as a column', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCopyRow');
      expect(editor.execCommand('mceTablePasteColAfter')).toBe(false);
      expect(grid(editor)[0]).toHaveLength(2);
    });

    it('pastes nothing before anything is copied', () => {
      create();
      cursorIn(editor, 0, 0);
      expect(editor.execCommand('mceTablePasteRowAfter')).toBe(false);
      expect(grid(editor)).toHaveLength(2);
    });
  });

  describe('row, column and cell types', () => {
    it('makes the current row a header row and back', () => {
      create();
      cursorIn(editor, 1, 0);
      editor.execCommand('mceTableRowType', false, { type: 'header' });
      expect(grid(editor)[1]).toEqual(['th:c', 'th:d']);
      expect(editor.queryCommandValue('mceTableRowType')).toBe('header');
      editor.execCommand('mceTableRowType', false, { type: 'body' });
      expect(grid(editor)[1]).toEqual(['td:c', 'td:d']);
      expect(editor.queryCommandValue('mceTableRowType')).toBe('body');
    });

    it('makes the current column header cells', () => {
      create();
      cursorIn(editor, 0, 1);
      editor.execCommand('mceTableColType', false, { type: 'th' });
      expect(grid(editor)).toEqual([
        ['td:a', 'th:b'],
        ['td:c', 'th:d'],
      ]);
      expect(editor.queryCommandValue('mceTableColType')).toBe('th');
    });

    it('changes the type of every selected cell', () => {
      create();
      selectCells(editor, 0, 0, 0, 1);
      editor.execCommand('mceTableCellType', false, { type: 'th' });
      expect(grid(editor)[0]).toEqual(['th:a', 'th:b']);
      expect(editor.queryCommandValue('mceTableCellType')).toBe('th');
    });

    it('returns an empty value outside a table', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      expect(editor.queryCommandValue('mceTableRowType')).toBe('');
      expect(editor.queryCommandValue('mceTableCellType')).toBe('');
    });
  });

  describe('mceTableApplyCellStyle', () => {
    it('styles every selected cell, even when the first already has the value', () => {
      create({}, '<table><tbody><tr><td style="background-color: red">a</td><td>b</td></tr></tbody></table>');
      selectCells(editor, 0, 0, 0, 1);
      editor.execCommand('mceTableApplyCellStyle', false, { 'background-color': 'red', 'border-style': 'dashed' });
      const cells = tableEl(editor)!.querySelectorAll('td');
      cells.forEach((cell) => {
        expect(cell.style.backgroundColor).toBe('red');
        expect(cell.style.borderStyle).toBe('dashed');
      });
    });

    it('removes a style given an empty value', () => {
      create({}, '<table><tbody><tr><td style="background-color: red; vertical-align: top">a</td></tr></tbody></table>');
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableApplyCellStyle', false, { 'background-color': '' });
      const cell = tableEl(editor)!.querySelector('td')!;
      expect(cell.style.backgroundColor).toBe('');
      expect(cell.style.verticalAlign).toBe('top');
    });

    it('takes camelCase property names, as TinyMCE does', () => {
      create();
      cursorIn(editor, 0, 0);
      expect(editor.execCommand('mceTableApplyCellStyle', false, { backgroundColor: 'red', verticalAlign: 'top' })).toBe(true);
      const cell = tableEl(editor)!.querySelector('td')!;
      expect(cell.style.backgroundColor).toBe('red');
      expect(cell.style.verticalAlign).toBe('top');
    });

    it('does nothing for a property a cell does not keep', () => {
      create();
      cursorIn(editor, 0, 0);
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      expect(editor.execCommand('mceTableApplyCellStyle', false, { position: 'fixed' })).toBe(false);
      expect(onModified).not.toHaveBeenCalled();
    });

    it('does nothing, and fires nothing, given no style', () => {
      create();
      cursorIn(editor, 0, 0);
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      expect(editor.execCommand('mceTableApplyCellStyle', false, {})).toBe(false);
      expect(editor.execCommand('mceTableApplyCellStyle', false, { 'background-color': 5 })).toBe(false);
      expect(onModified).not.toHaveBeenCalled();
    });

    it('ignores a value that is not allowed', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableApplyCellStyle', false, { 'background-color': 'url(javascript:alert(1))', position: 'fixed' });
      expect(editor.getContent()).not.toMatch(/url\(|position/);
    });
  });

  describe('mceTableToggleCaption', () => {
    it('adds a caption and removes it again', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableToggleCaption');
      expect(editor.getContent()).toContain('<caption>Caption</caption>');
      editor.execCommand('mceTableToggleCaption');
      expect(editor.getContent()).not.toContain('<caption');
    });
  });

  describe('outside a table', () => {
    it('does nothing and returns false', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      const before = editor.getContent();
      expect(editor.execCommand('mceTableDeleteRow')).toBe(false);
      expect(editor.execCommand('mceTableCopyRow')).toBe(false);
      expect(editor.getContent()).toBe(before);
    });
  });

  describe('read-only', () => {
    it('does not change the table', () => {
      create({ readonly: true });
      cursorIn(editor, 0, 0);
      const before = editor.getContent();
      expect(editor.execCommand('mceTableInsertRowAfter')).toBe(false);
      expect(editor.getContent()).toBe(before);
    });
  });

  describe('unsupported TinyMCE commands', () => {
    it.each(['mceTableSizingMode', 'mceTableToggleClass', 'mceTableCellToggleClass'])('%s is reported as unknown', (command) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      create();
      cursorIn(editor, 0, 0);
      expect(editor.execCommand(command, false, 'x')).toBe(false);
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('fires tablemodified with structure: true for a structural change', () => {
      create();
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableInsertRowAfter');
      expect(onModified).toHaveBeenCalledTimes(1);
      const event = onModified.mock.calls[0][0];
      expect(event.table).toBeInstanceOf(HTMLTableElement);
      expect(event.structure).toBe(true);
      expect(event.style).toBe(false);
    });

    it('fires tablemodified with style: true for a style change', () => {
      create();
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableApplyCellStyle', false, { 'background-color': 'red' });
      expect(onModified).toHaveBeenCalledWith(expect.objectContaining({ structure: false, style: true }));
    });

    it('fires newrow for an inserted row and newcell for each new cell', () => {
      create();
      const onRow = jest.fn();
      const onCell = jest.fn();
      editor.on('newrow', onRow);
      editor.on('newcell', onCell);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableInsertRowAfter');
      expect(onRow).toHaveBeenCalledTimes(1);
      expect(onRow.mock.calls[0][0].node).toBeInstanceOf(HTMLTableRowElement);
      expect(onCell).toHaveBeenCalledTimes(2);
      onCell.mockClear();
      editor.execCommand('mceTableInsertColAfter');
      expect(onCell).toHaveBeenCalledTimes(3);
      expect(onCell.mock.calls[0][0].node).toBeInstanceOf(HTMLTableCellElement);
    });

    it('fires newcell only for cells created, not for spanning cells that changed', () => {
      create({}, '<table><tbody><tr><td colspan="2">ab</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>');
      const onCell = jest.fn();
      editor.on('newcell', onCell);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableSplitCells');
      expect(onCell).toHaveBeenCalledTimes(1);
      onCell.mockClear();
      editor.setContent('<table><tbody><tr><td colspan="2">ab</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>');
      cursorIn(editor, 1, 0);
      editor.execCommand('mceTableInsertColAfter');
      // The new column falls inside the spanning cell, which only widens.
      expect(onCell).toHaveBeenCalledTimes(1);
    });

    it('maps through steps other plugins append, so only the new row and cells are reported', () => {
      create();
      const tiptap = editor.getTipTap()!;
      // A plugin that answers a change to the table by adding a paragraph at
      // the start, moving everything after it.
      tiptap.registerPlugin(
        new Plugin({
          appendTransaction: (transactions, _old, state) => {
            if (!transactions.some((tr) => tr.docChanged) || state.doc.firstChild?.type.name !== 'table') return null;
            return state.tr.insert(0, state.schema.nodes.paragraph.create());
          },
        })
      );
      const onRow = jest.fn();
      const onCell = jest.fn();
      editor.on('newrow', onRow);
      editor.on('newcell', onCell);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableInsertRowAfter');
      expect(onRow).toHaveBeenCalledTimes(1);
      expect(onCell).toHaveBeenCalledTimes(2);
    });

    it('fires newrow and tablemodified when Tab in the last cell adds a row', () => {
      create();
      const onRow = jest.fn();
      const onModified = jest.fn();
      editor.on('newrow', onRow);
      editor.on('tablemodified', onModified);
      cursorIn(editor, 1, 1);
      const tiptap = editor.getTipTap()!;
      let changes = 0;
      tiptap.on('transaction', ({ transaction }) => {
        if (transaction.docChanged) changes++;
      });
      tiptap.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true }));
      expect(grid(editor)).toHaveLength(3);
      expect(onRow).toHaveBeenCalledTimes(1);
      expect(onModified).toHaveBeenCalledTimes(1);
      // The cursor moves into the new row, in one change (one undo step).
      expect(tiptap.state.selection.$from.parent.textContent).toBe('');
      expect(changes).toBe(1);
    });

    it('does not fire tablemodified when the command does nothing', () => {
      create({}, '<p>x</p>');
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      editor.getTipTap()!.commands.setTextSelection(1);
      editor.execCommand('mceTableInsertRowAfter');
      expect(onModified).not.toHaveBeenCalled();
    });
  });

  describe('table_tab_navigation', () => {
    const pressTab = () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
      editor.getTipTap()!.view.dom.dispatchEvent(event);
    };

    it('moves to the next cell by default', () => {
      create();
      cursorIn(editor, 0, 0);
      pressTab();
      const { $from } = editor.getTipTap()!.state.selection;
      expect($from.parent.textContent).toBe('b');
    });

    it('indents the paragraph in the cell instead when false', () => {
      create({ table_tab_navigation: false });
      cursorIn(editor, 0, 0);
      pressTab();
      const { $from } = editor.getTipTap()!.state.selection;
      expect($from.parent.textContent).toBe('a');
      expect(editor.getContent()).toContain('margin-left: 40px');
    });
  });
});
