/**
 * TableDialog Tests
 * The Insert table, Table properties, Row properties and Cell properties dialogs.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';

function dialog(): HTMLElement | null {
  const overlays = Array.from(document.querySelectorAll('.md-table-dialog')) as HTMLElement[];
  return overlays.find((el) => (el.closest('.md-dialog-overlay') as HTMLElement | null)?.style.display !== 'none') ?? null;
}

function field(name: string): HTMLInputElement | HTMLSelectElement | null {
  return dialog()?.querySelector(`[name="${name}"]`) ?? null;
}

function setField(name: string, value: string): void {
  const el = field(name);
  if (!el) throw new Error(`No field ${name}`);
  el.value = value;
}

function save(): void {
  (dialog()!.querySelector('.md-table-dialog-save') as HTMLButtonElement).click();
}

function outTable(editor: HTMLEditor): HTMLTableElement {
  const host = document.createElement('div');
  host.innerHTML = editor.getContent();
  return host.querySelector('table')!;
}

function cellPositions(editor: HTMLEditor): number[][] {
  const rows: number[][] = [];
  editor.getTipTap()!.state.doc.descendants((node, pos) => {
    if (node.type.name === 'tableRow') rows.push([]);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') rows[rows.length - 1].push(pos);
    return true;
  });
  return rows;
}

function cursorIn(editor: HTMLEditor, r: number, c: number): void {
  editor.getTipTap()!.commands.setTextSelection(cellPositions(editor)[r][c] + 2);
}

const TABLE =
  '<table border="1" cellpadding="4" style="width: 50%; margin-left: auto; margin-right: auto; border-style: dashed; border-color: red; background-color: yellow">' +
  '<caption>Results</caption><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';

describe('TableDialog', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  const create = (config: EditorConfig = {}, content = TABLE) => {
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
    document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
  });

  describe('Insert table', () => {
    it('inserts a table of the entered size', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      expect(editor.execCommand('mceInsertTableDialog')).toBe(true);
      expect(dialog()!.textContent).toContain('Insert table');
      setField('cols', '4');
      setField('rows', '2');
      save();
      const table = outTable(editor);
      expect(table.querySelectorAll('tr')).toHaveLength(2);
      expect(table.querySelectorAll('tr')[0].children).toHaveLength(4);
      expect(dialog()).toBeNull();
    });

    it('keeps the dialog open for a size over 100', () => {
      create({}, '<p>x</p>');
      editor.execCommand('mceInsertTableDialog');
      setField('cols', '101');
      save();
      expect(editor.getContent()).not.toContain('<table');
      expect(field('cols')!.getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps the dialog open and marks a field that is not a positive number', () => {
      create({}, '<p>x</p>');
      editor.execCommand('mceInsertTableDialog');
      setField('rows', '0');
      save();
      expect(editor.getContent()).not.toContain('<table');
      expect(dialog()).not.toBeNull();
      expect(field('rows')!.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Table properties', () => {
    it('does not open outside a table', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      expect(editor.execCommand('mceTableProps')).toBe(false);
      expect(dialog()).toBeNull();
    });

    it('shows the current values of the table', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      expect(field('width')!.value).toBe('50%');
      expect(field('border')!.value).toBe('1');
      expect(field('cellpadding')!.value).toBe('4');
      expect(field('caption')!.value).toBe('Results');
      expect(field('align')!.value).toBe('center');
      expect(field('borderstyle')!.value).toBe('dashed');
      expect(field('bordercolor')!.value).toBe('red');
      expect(field('backgroundcolor')!.value).toBe('yellow');
    });

    it('applies the changed values', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      setField('width', '400');
      setField('cellpadding', '8');
      setField('cellspacing', '2');
      setField('caption', 'New caption');
      setField('align', 'right');
      setField('backgroundcolor', '');
      save();
      const table = outTable(editor);
      expect(table.style.width).toBe('400px');
      expect(table.getAttribute('cellpadding')).toBe('8');
      expect(table.getAttribute('cellspacing')).toBe('2');
      expect(table.querySelector('caption')!.textContent).toBe('New caption');
      expect(table.style.cssFloat).toBe('right');
      expect(table.style.marginLeft).toBe('');
      expect(table.style.backgroundColor).toBe('');
      expect(table.style.borderStyle).toBe('dashed');
    });

    it('drops a value that is not allowed', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      setField('backgroundcolor', 'url(javascript:alert(1))');
      setField('width', 'calc(100% - 1px)');
      save();
      expect(editor.getContent()).not.toMatch(/url\(|calc/);
    });

    it('removes the caption when its field is emptied', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      setField('caption', '  ');
      save();
      expect(editor.getContent()).not.toContain('<caption');
    });

    it('hides the appearance fields when table_appearance_options is false', () => {
      create({ table_appearance_options: false });
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      for (const name of ['cellspacing', 'cellpadding', 'border', 'caption']) {
        expect(field(name)).toBeNull();
      }
      expect(field('width')).not.toBeNull();
    });

    it('has General and Advanced tabs, and no Advanced tab when table_advtab is false', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      expect(Array.from(dialog()!.querySelectorAll('.md-table-dialog-tab')).map((t) => t.textContent)).toEqual([
        'General',
        'Advanced',
      ]);
      (dialog()!.querySelector('.md-table-dialog-cancel') as HTMLButtonElement).click();
      editor.destroy();

      create({ table_advtab: false });
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      expect(dialog()!.querySelectorAll('.md-table-dialog-tab')).toHaveLength(0);
      expect(field('borderstyle')).toBeNull();
    });

    it('switches tabs', () => {
      create();
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      const [general, advanced] = Array.from(dialog()!.querySelectorAll('.md-table-dialog-tab')) as HTMLButtonElement[];
      advanced.click();
      expect(advanced.getAttribute('aria-selected')).toBe('true');
      expect(general.getAttribute('aria-selected')).toBe('false');
      expect((field('borderstyle')!.closest('.md-table-dialog-panel') as HTMLElement).hidden).toBe(false);
      expect((field('width')!.closest('.md-table-dialog-panel') as HTMLElement).hidden).toBe(true);
    });

    it('closes without changes on Cancel and on Escape', () => {
      create();
      cursorIn(editor, 0, 0);
      const before = editor.getContent();
      editor.execCommand('mceTableProps');
      setField('width', '10px');
      (dialog()!.querySelector('.md-table-dialog-cancel') as HTMLButtonElement).click();
      expect(dialog()).toBeNull();
      editor.execCommand('mceTableProps');
      setField('width', '10px');
      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(dialog()).toBeNull();
      expect(editor.getContent()).toBe(before);
    });

    it('fires tablemodified with style: true on save', () => {
      create();
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableProps');
      setField('width', '300px');
      save();
      expect(onModified).toHaveBeenCalledWith(expect.objectContaining({ style: true }));
    });
  });

  describe('Row properties', () => {
    it('applies the row type, height, alignment and background', () => {
      create();
      cursorIn(editor, 1, 0);
      editor.execCommand('mceTableRowProps');
      expect(field('rowtype')!.value).toBe('body');
      setField('rowtype', 'header');
      setField('height', '40');
      setField('align', 'center');
      setField('backgroundcolor', '#00ff00');
      save();
      const row = outTable(editor).querySelectorAll('tr')[1];
      expect(Array.from(row.children).map((c) => c.tagName)).toEqual(['TH', 'TH']);
      expect(row.style.height).toBe('40px');
      expect(row.style.textAlign).toBe('center');
      expect(row.style.backgroundColor).toBe('rgb(0, 255, 0)');
    });
  });

  describe('changed fields only', () => {
    it('applies only the changed field to each selected row, keeping the rest of its style', () => {
      create({}, '<table><tbody><tr style="background-color: red"><td>a</td></tr><tr style="height: 40px; border-color: blue"><td>b</td></tr></tbody></table>');
      const cells = cellPositions(editor);
      editor.getTipTap()!.commands.setCellSelection({ anchorCell: cells[0][0], headCell: cells[1][0] });
      editor.execCommand('mceTableRowProps');
      setField('align', 'center');
      save();
      const [first, second] = Array.from(outTable(editor).querySelectorAll('tr'));
      expect(first.style.backgroundColor).toBe('red');
      expect(first.style.textAlign).toBe('center');
      expect(second.style.backgroundColor).toBe('');
      expect(second.style.height).toBe('40px');
      expect(second.style.borderColor).toBe('blue');
      expect(second.style.textAlign).toBe('center');
    });

    it.each(['mceTableProps', 'mceTableRowProps', 'mceTableCellProps'])('%s changes nothing when saved unchanged', (command) => {
      create();
      cursorIn(editor, 0, 0);
      const onModified = jest.fn();
      editor.on('tablemodified', onModified);
      editor.setDirty(false);
      editor.execCommand(command);
      const focus = jest.spyOn(editor, 'focus');
      save();
      expect(dialog()).toBeNull();
      expect(onModified).not.toHaveBeenCalled();
      expect(editor.isDirty()).toBe(false);
      // Focus goes back to the editor, as it does on Cancel.
      expect(focus).toHaveBeenCalled();
    });
  });

  describe('Cell properties', () => {
    it('applies the cell settings', () => {
      create();
      cursorIn(editor, 0, 1);
      editor.execCommand('mceTableCellProps');
      setField('celltype', 'th');
      setField('scope', 'col');
      setField('halign', 'center');
      setField('valign', 'middle');
      setField('width', '120');
      setField('height', '30px');
      setField('borderwidth', '2px');
      setField('borderstyle', 'solid');
      setField('bordercolor', 'blue');
      setField('backgroundcolor', 'pink');
      save();
      const table = outTable(editor);
      const cell = table.querySelectorAll('tr')[0].children[1] as HTMLTableCellElement;
      expect(cell.tagName).toBe('TH');
      expect(cell.getAttribute('scope')).toBe('col');
      expect(cell.style.textAlign).toBe('center');
      expect(cell.style.verticalAlign).toBe('middle');
      expect(cell.style.height).toBe('30px');
      expect(cell.style.borderWidth).toBe('2px');
      expect(cell.style.borderStyle).toBe('solid');
      expect(cell.style.borderColor).toBe('blue');
      expect(cell.style.backgroundColor).toBe('pink');
      // The width is the column's: every cell in it gets it.
      expect(table.querySelectorAll('col')[1].style.width).toBe('120px');
      expect(table.querySelectorAll('tr')[1].children[1].getAttribute('colwidth')).toBe('120');
    });

    it('rejects a width that is not a number of pixels, leaving the column alone', () => {
      create({}, '<table><tbody><tr><td colwidth="80">a</td></tr></tbody></table>');
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCellProps');
      setField('width', '50%');
      save();
      expect(dialog()).not.toBeNull();
      expect(field('width')!.getAttribute('aria-invalid')).toBe('true');
      expect(editor.getContent()).toContain('colwidth="80"');
      setField('width', '120px');
      save();
      expect(dialog()).toBeNull();
      expect(editor.getContent()).toContain('colwidth="120"');
    });

    it('shows the current values of the cell', () => {
      create({}, '<table><tbody><tr><td style="vertical-align: bottom; background-color: red; text-align: right">a</td></tr></tbody></table>');
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCellProps');
      expect(field('celltype')!.value).toBe('td');
      expect(field('valign')!.value).toBe('bottom');
      expect(field('halign')!.value).toBe('right');
      expect(field('backgroundcolor')!.value).toBe('red');
    });

    it('applies to every selected cell', () => {
      create();
      const cells = cellPositions(editor);
      editor.getTipTap()!.commands.setCellSelection({ anchorCell: cells[0][0], headCell: cells[1][1] });
      editor.execCommand('mceTableCellProps');
      setField('backgroundcolor', 'red');
      save();
      outTable(editor).querySelectorAll('td').forEach((cell) => expect(cell.style.backgroundColor).toBe('red'));
    });

    it('has no Advanced tab when table_cell_advtab is false', () => {
      create({ table_cell_advtab: false });
      cursorIn(editor, 0, 0);
      editor.execCommand('mceTableCellProps');
      expect(field('borderwidth')).toBeNull();
      expect(field('valign')).not.toBeNull();
    });
  });

  describe('read-only', () => {
    it('opens no dialog', () => {
      create({ readonly: true });
      cursorIn(editor, 0, 0);
      expect(editor.execCommand('mceTableProps')).toBe(false);
      expect(editor.execCommand('mceInsertTableDialog')).toBe(false);
      expect(dialog()).toBeNull();
    });
  });
});
