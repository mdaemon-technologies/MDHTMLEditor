/**
 * TableMenu Tests
 * The table toolbar dropdown (size grid, Cell / Row / Column submenus) and the
 * individual table toolbar buttons.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { DEFAULT_ICONS, CONFAB_ICONS } from '../../src/icons';
import { TABLE_BUTTON_NAMES } from '../../src/extensions/TableMenu';
import type { EditorConfig } from '../../src/types';

const TABLE = '<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';

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

function grid(editor: HTMLEditor): string[][] {
  const host = document.createElement('div');
  host.innerHTML = editor.getContent();
  return Array.from(host.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.children).map((cell) => `${cell.tagName.toLowerCase()}:${cell.textContent ?? ''}`)
  );
}

/** Wait for the toolbar's state refresh (it runs every 100ms). */
const refresh = () => new Promise((resolve) => setTimeout(resolve, 130));

describe('Table menu', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  const create = (config: EditorConfig = {}, content = TABLE) => {
    editor = new HTMLEditor(container, config);
    editor.setContent(content);
    return editor;
  };

  /** Open the table dropdown, closing it first if it is already open. */
  const openMenu = (): HTMLElement => {
    const button = container.querySelector('[data-dropdown="table"] .md-toolbar-dropdown-btn') as HTMLButtonElement;
    const menu = document.querySelector('.md-table-menu') as HTMLElement;
    if (menu.style.display !== 'none') button.click();
    button.click();
    return menu;
  };

  const item = (menu: HTMLElement, value: string) =>
    menu.querySelector(`.md-toolbar-dropdown-item[data-value="${value}"]`) as HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
    document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
  });

  describe('dropdown', () => {
    it('lists Insert table, the Cell, Row and Column submenus, and the table actions', () => {
      create();
      const menu = openMenu();
      expect(menu.style.display).toBe('block');
      const top = Array.from(menu.querySelectorAll(':scope > .md-table-menu-entry > .md-toolbar-dropdown-item')).map(
        (el) => el.getAttribute('data-value')
      );
      expect(top).toEqual(['insert', 'cell', 'row', 'column', 'tableprops', 'tablecaption', 'tabledelete']);
    });

    it('inserts a table of the size picked in the grid', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      const menu = openMenu();
      item(menu, 'insert').click();
      const cell = menu.querySelector('.md-table-grid-cell[data-row="2"][data-col="3"]') as HTMLButtonElement;
      cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(menu.querySelector('.md-table-grid-label')!.textContent).toBe('3 × 2');
      expect(menu.querySelectorAll('.md-table-grid-cell-active')).toHaveLength(6);
      cell.click();
      expect(grid(editor)).toEqual([
        ['td:', 'td:', 'td:'],
        ['td:', 'td:', 'td:'],
      ]);
      expect(menu.style.display).toBe('none');
    });

    it('opens the Insert table dialog instead of the grid when table_grid is false', () => {
      create({ table_grid: false }, '<p>x</p>');
      const menu = openMenu();
      expect(menu.querySelector('.md-table-grid')).toBeNull();
      item(menu, 'insert').click();
      expect(document.querySelector('.md-table-dialog')).not.toBeNull();
    });

    it('disables what needs a table when the cursor is outside one', () => {
      create({}, '<p>x</p>');
      editor.getTipTap()!.commands.setTextSelection(1);
      const menu = openMenu();
      expect(item(menu, 'insert').disabled).toBe(false);
      for (const value of ['cell', 'row', 'column', 'tableprops', 'tablecaption', 'tabledelete']) {
        expect(item(menu, value).disabled).toBe(true);
      }
    });

    it('runs a row action from the Row submenu and closes', () => {
      create();
      cursorIn(editor, 0, 0);
      const menu = openMenu();
      item(menu, 'row').click();
      expect((item(menu, 'row').nextElementSibling as HTMLElement).hidden).toBe(false);
      item(menu, 'tableinsertrowafter').click();
      expect(grid(editor)).toHaveLength(3);
      expect(menu.style.display).toBe('none');
    });

    it('enables the paste items only once a row or column is copied', () => {
      create();
      cursorIn(editor, 0, 0);
      let menu = openMenu();
      expect(item(menu, 'tablepasterowafter').disabled).toBe(true);
      item(menu, 'tablecopyrow').click();
      menu = openMenu();
      expect(item(menu, 'tablepasterowafter').disabled).toBe(false);
      expect(item(menu, 'tablepastecolumnafter').disabled).toBe(true);
    });

    it('shows and toggles the header row state', () => {
      create();
      cursorIn(editor, 0, 0);
      let menu = openMenu();
      expect(item(menu, 'tablerowheader').getAttribute('aria-checked')).toBe('false');
      item(menu, 'tablerowheader').click();
      expect(grid(editor)[0]).toEqual(['th:a', 'th:b']);
      menu = openMenu();
      expect(item(menu, 'tablerowheader').getAttribute('aria-checked')).toBe('true');
    });

    it('enables Merge cells only for a selection of several cells', () => {
      create();
      cursorIn(editor, 0, 0);
      let menu = openMenu();
      expect(item(menu, 'tablemergecells').disabled).toBe(true);
      const cells = cellPositions(editor);
      editor.getTipTap()!.commands.setCellSelection({ anchorCell: cells[0][0], headCell: cells[0][1] });
      menu = openMenu();
      expect(item(menu, 'tablemergecells').disabled).toBe(false);
    });

    it('opens the Table properties dialog', () => {
      create();
      cursorIn(editor, 0, 0);
      item(openMenu(), 'tableprops').click();
      expect(document.querySelector('.md-table-dialog')!.textContent).toContain('Table properties');
    });

    it('gives focus back to the editor when the menu closes with Escape', () => {
      create();
      cursorIn(editor, 0, 0);
      const menu = openMenu();
      const focus = jest.spyOn(editor, 'focus');
      item(menu, 'tableprops').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(menu.style.display).toBe('none');
      expect(focus).toHaveBeenCalled();
    });

    it('closes an open submenu with Escape and returns to the menu', () => {
      create();
      cursorIn(editor, 0, 0);
      const menu = openMenu();
      item(menu, 'row').click();
      const sub = item(menu, 'row').nextElementSibling as HTMLElement;
      item(menu, 'tableinsertrowafter').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(sub.hidden).toBe(true);
    });
  });

  describe('toolbar buttons', () => {
    const BUTTONS =
      'tableprops tabledelete tablecellprops tablemergecells tablesplitcells tableinsertrowbefore tableinsertrowafter ' +
      'tabledeleterow tablerowprops tablecutrow tablecopyrow tablepasterowbefore tablepasterowafter tableinsertcolbefore ' +
      'tableinsertcolafter tabledeletecol tablecutcol tablecopycol tablepastecolbefore tablepastecolafter tableinsertdialog ' +
      'tablecaption tablerowheader tablecolheader tablecellvalign tablecellborderwidth tablecellborderstyle ' +
      'tablecellbackgroundcolor tablecellbordercolor';

    const button = (name: string) =>
      container.querySelector(`[data-button="${name}"], [data-dropdown="${name}"] .md-toolbar-dropdown-btn, [data-colorpicker="${name}"] .md-toolbar-colorpicker-btn`) as HTMLButtonElement;

    it('renders every table button', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      create({ toolbar: BUTTONS });
      for (const name of BUTTONS.split(' ')) {
        expect(button(name)).not.toBeNull();
      }
      expect(warn.mock.calls.filter(([message]) => String(message).startsWith('Unknown toolbar button'))).toEqual([]);
      warn.mockRestore();
    });

    it('does not take an Object.prototype name for a table button', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      create({ toolbar: 'constructor tostring' });
      expect(container.querySelector('[data-button="constructor"]')).toBeNull();
      expect(warn.mock.calls.filter(([message]) => String(message).startsWith('Unknown toolbar button'))).toHaveLength(2);
      warn.mockRestore();
    });

    it('disables the buttons outside a table and enables them inside one', async () => {
      create({ toolbar: 'tableinsertrowafter tablecellvalign tablecellbackgroundcolor tableinsertdialog' }, `<p>x</p>${TABLE}`);
      editor.getTipTap()!.commands.setTextSelection(1);
      await refresh();
      expect(button('tableinsertrowafter').disabled).toBe(true);
      expect(button('tablecellvalign').disabled).toBe(true);
      expect(button('tablecellbackgroundcolor').disabled).toBe(true);
      expect(button('tableinsertdialog').disabled).toBe(false);
      cursorIn(editor, 0, 0);
      await refresh();
      expect(button('tableinsertrowafter').disabled).toBe(false);
      expect(button('tablecellvalign').disabled).toBe(false);
    });

    it('runs its command', () => {
      create({ toolbar: 'tableinsertrowafter tabledeletecol' });
      cursorIn(editor, 0, 0);
      button('tableinsertrowafter').click();
      expect(grid(editor)).toHaveLength(3);
      cursorIn(editor, 0, 0);
      button('tabledeletecol').click();
      expect(grid(editor)[0]).toHaveLength(1);
    });

    it('toggles the header row, header column and caption, showing their state', async () => {
      create({ toolbar: 'tablerowheader tablecolheader tablecaption' });
      cursorIn(editor, 1, 1);
      button('tablerowheader').click();
      expect(grid(editor)[1]).toEqual(['th:c', 'th:d']);
      await refresh();
      expect(button('tablerowheader').classList.contains('md-toolbar-btn-active')).toBe(true);
      button('tablerowheader').click();
      button('tablecolheader').click();
      expect(grid(editor).map((row) => row[1])).toEqual(['th:b', 'th:d']);
      button('tablecaption').click();
      expect(editor.getContent()).toContain('<caption>Caption</caption>');
      await refresh();
      expect(button('tablecaption').classList.contains('md-toolbar-btn-active')).toBe(true);
    });

    it('sets the vertical alignment of the cell from its menu', () => {
      create({ toolbar: 'tablecellvalign' });
      cursorIn(editor, 0, 0);
      button('tablecellvalign').click();
      (document.querySelector('[data-dropdown-menu="tablecellvalign"] [data-value="top"]') as HTMLButtonElement).click();
      expect(editor.getContent()).toContain('vertical-align: top');
    });

    it('lists the default border widths and the configured border styles', () => {
      create({
        toolbar: 'tablecellborderwidth tablecellborderstyle',
        table_border_styles: [{ title: 'Solid', value: 'solid' }, { title: 'Dotted', value: 'dotted' }],
      });
      const values = (name: string) =>
        Array.from(document.querySelectorAll(`[data-dropdown-menu="${name}"] .md-toolbar-dropdown-item`)).map((el) =>
          el.getAttribute('data-value')
        );
      expect(values('tablecellborderwidth')).toEqual(['', '1px', '2px', '3px', '4px', '5px']);
      expect(values('tablecellborderstyle')).toEqual(['', 'solid', 'dotted']);
      cursorIn(editor, 0, 0);
      button('tablecellborderstyle').click();
      (document.querySelector('[data-dropdown-menu="tablecellborderstyle"] [data-value="dotted"]') as HTMLButtonElement).click();
      expect(editor.getContent()).toContain('border-style: dotted');
    });

    it('sets and removes the cell background color, using table_background_color_map', () => {
      create({ toolbar: 'tablecellbackgroundcolor', table_background_color_map: ['#123456', 'Navy'] });
      cursorIn(editor, 0, 0);
      const swatches = document.querySelectorAll('[data-colorpicker-menu="tablecellbackgroundcolor"] .md-toolbar-colorpicker-swatch');
      expect(swatches).toHaveLength(1);
      (swatches[0] as HTMLButtonElement).click();
      expect(editor.getContent()).toMatch(/background-color: (#123456|rgb\(18, 52, 86\))/);
      (document.querySelector('[data-colorpicker-menu="tablecellbackgroundcolor"] .md-toolbar-colorpicker-remove') as HTMLButtonElement).click();
      expect(editor.getContent()).not.toContain('background-color');
    });

    it('sets the cell border color', () => {
      create({ toolbar: 'tablecellbordercolor' });
      cursorIn(editor, 0, 0);
      const swatch = document.querySelector('[data-colorpicker-menu="tablecellbordercolor"] .md-toolbar-colorpicker-swatch') as HTMLButtonElement;
      swatch.click();
      expect(editor.getContent()).toContain('border-color');
    });
  });

  describe('icons', () => {
    it.each(TABLE_BUTTON_NAMES)('has a %s icon in both icon sets', (name) => {
      expect(DEFAULT_ICONS[name]).toContain('<svg');
      expect(CONFAB_ICONS[name]).toContain('<svg');
    });
  });
});
