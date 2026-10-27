/**
 * TableMenu
 * TinyMCE's table menu: an Insert table entry (a size grid, or the Insert
 * table dialog when table_grid is false), Cell, Row and Column submenus, and
 * the table-wide actions. The toolbar's `table` dropdown and the table context
 * menu are both built from it.
 *
 * TABLE_ACTIONS is the one list of table actions, keyed by their TinyMCE
 * toolbar button / menu item names, so the menu, the toolbar buttons and the
 * context toolbar agree on what each does and when it is available. Every
 * action runs through editor.execCommand, so it fires the table events.
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import { selectedTable } from './TableCommands';

export interface TableAction {
  /** English label, translated when shown. */
  label: string;
  /** The execCommand name. */
  command: string;
  /** The command's value, worked out when the action runs. */
  value?: (editor: HTMLEditor) => unknown;
  /** For a toggle: whether it is on at the selection. */
  isActive?: (editor: HTMLEditor) => boolean;
}

const rowIsHeader = (editor: HTMLEditor) => editor.queryCommandValue('mceTableRowType') === 'header';
const columnIsHeader = (editor: HTMLEditor) => editor.queryCommandValue('mceTableColType') === 'th';

/** Every table action, by TinyMCE toolbar button / menu item name. */
export const TABLE_ACTIONS: Record<string, TableAction> = {
  tableinsertdialog: { label: 'Insert table', command: 'mceInsertTableDialog' },
  tableprops: { label: 'Table properties', command: 'mceTableProps' },
  tabledelete: { label: 'Delete table', command: 'mceTableDelete' },
  tablecellprops: { label: 'Cell properties', command: 'mceTableCellProps' },
  tablemergecells: { label: 'Merge cells', command: 'mceTableMergeCells' },
  tablesplitcells: { label: 'Split cell', command: 'mceTableSplitCells' },
  tableinsertrowbefore: { label: 'Insert row before', command: 'mceTableInsertRowBefore' },
  tableinsertrowafter: { label: 'Insert row after', command: 'mceTableInsertRowAfter' },
  tabledeleterow: { label: 'Delete row', command: 'mceTableDeleteRow' },
  tablerowprops: { label: 'Row properties', command: 'mceTableRowProps' },
  tablecutrow: { label: 'Cut row', command: 'mceTableCutRow' },
  tablecopyrow: { label: 'Copy row', command: 'mceTableCopyRow' },
  tablepasterowbefore: { label: 'Paste row before', command: 'mceTablePasteRowBefore' },
  tablepasterowafter: { label: 'Paste row after', command: 'mceTablePasteRowAfter' },
  tableinsertcolbefore: { label: 'Insert column before', command: 'mceTableInsertColBefore' },
  tableinsertcolafter: { label: 'Insert column after', command: 'mceTableInsertColAfter' },
  tabledeletecol: { label: 'Delete column', command: 'mceTableDeleteCol' },
  tablecutcol: { label: 'Cut column', command: 'mceTableCutCol' },
  tablecopycol: { label: 'Copy column', command: 'mceTableCopyCol' },
  tablepastecolbefore: { label: 'Paste column before', command: 'mceTablePasteColBefore' },
  tablepastecolafter: { label: 'Paste column after', command: 'mceTablePasteColAfter' },
  tablecaption: {
    label: 'Toggle caption',
    command: 'mceTableToggleCaption',
    isActive: (editor) => {
      const state = editor.getTipTap()?.state;
      return !!(state && selectedTable(state)?.attrs.caption);
    },
  },
  tablerowheader: {
    label: 'Toggle header row',
    command: 'mceTableRowType',
    value: (editor) => ({ type: rowIsHeader(editor) ? 'body' : 'header' }),
    isActive: rowIsHeader,
  },
  tablecolheader: {
    label: 'Toggle header column',
    command: 'mceTableColType',
    value: (editor) => ({ type: columnIsHeader(editor) ? 'td' : 'th' }),
    isActive: columnIsHeader,
  },
};

/** TinyMCE's menu item names for the column actions, which differ from the button names. */
const COLUMN_MENU_NAMES: Record<string, string> = {
  tableinsertcolumnbefore: 'tableinsertcolbefore',
  tableinsertcolumnafter: 'tableinsertcolafter',
  tabledeletecolumn: 'tabledeletecol',
  tablecutcolumn: 'tablecutcol',
  tablecopycolumn: 'tablecopycol',
  tablepastecolumnbefore: 'tablepastecolbefore',
  tablepastecolumnafter: 'tablepastecolafter',
};

/**
 * The toolbar button names that are table actions or table cell controls,
 * each of which has an icon in both icon sets.
 */
export const TABLE_BUTTON_NAMES: string[] = [
  ...Object.keys(TABLE_ACTIONS),
  'tablecellvalign',
  'tablecellborderwidth',
  'tablecellborderstyle',
  'tablecellbackgroundcolor',
  'tablecellbordercolor',
];

export function runTableAction(editor: HTMLEditor, action: TableAction): boolean {
  return editor.execCommand(action.command, false, action.value?.(editor));
}

export function isTableActionEnabled(editor: HTMLEditor, action: TableAction): boolean {
  return editor.isTableCommandEnabled(action.command, action.value?.(editor));
}

const CELL_ITEMS = ['tablecellprops', 'tablemergecells', 'tablesplitcells'];
const ROW_ITEMS = [
  'tableinsertrowbefore', 'tableinsertrowafter', 'tabledeleterow', 'tablerowprops', '|',
  'tablecutrow', 'tablecopyrow', 'tablepasterowbefore', 'tablepasterowafter', '|', 'tablerowheader',
];
const COLUMN_ITEMS = [
  'tableinsertcolumnbefore', 'tableinsertcolumnafter', 'tabledeletecolumn', '|',
  'tablecutcolumn', 'tablecopycolumn', 'tablepastecolumnbefore', 'tablepastecolumnafter', '|', 'tablecolheader',
];
const TABLE_ITEMS = ['tableprops', 'tablecaption', 'tabledelete'];

/** Rows and columns of the Insert table grid, as in TinyMCE. */
const GRID_SIZE = 10;

export interface TableMenuOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
  /** Include the Insert table entry (the context menu leaves it out). */
  withInsert: boolean;
  /** Called after an action ran or the menu was dismissed, to close the menu. */
  onClose: () => void;
}

interface MenuEntry {
  button: HTMLButtonElement;
  action?: TableAction;
  /** For a submenu parent: its items, enabled when any of them is. */
  children?: MenuEntry[];
  submenu?: HTMLElement;
  /** Enabled without a table (Insert table). */
  always?: boolean;
}

export class TableMenu {
  /** The menu's root element; the caller positions it and shows or hides it. */
  readonly element: HTMLElement;
  private options: TableMenuOptions;
  private entries: MenuEntry[] = [];
  private grid: HTMLElement | null = null;

  constructor(options: TableMenuOptions) {
    this.options = options;
    this.element = document.createElement('div');
    this.element.className = 'md-table-menu';
    this.element.setAttribute('role', 'menu');
    this.build();
    this.element.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  private get editor(): HTMLEditor {
    return this.options.editor;
  }

  /** Update every item's enabled and checked state for the current selection, and close the submenus. */
  refresh(): void {
    const update = (entry: MenuEntry): boolean => {
      let enabled: boolean;
      if (entry.children) {
        enabled = entry.children.map(update).some(Boolean);
      } else if (entry.always) {
        enabled = !this.editor.isReadOnly();
      } else {
        enabled = !!entry.action && isTableActionEnabled(this.editor, entry.action);
      }
      entry.button.disabled = !enabled;
      if (entry.action?.isActive) entry.button.setAttribute('aria-checked', String(enabled && entry.action.isActive(this.editor)));
      return enabled;
    };
    this.entries.forEach(update);
    this.closeSubmenus();
    this.highlightGrid(0, 0);
  }

  destroy(): void {
    this.element.remove();
  }

  private build(): void {
    const t = this.options.trans;
    if (this.options.withInsert) {
      if (this.editor.getConfig().table_grid !== false) {
        const entry = this.addSubmenu(this.element, 'insert', t('Insert table'), []);
        entry.always = true;
        entry.children = undefined;
        this.grid = this.buildGrid();
        entry.submenu!.appendChild(this.grid);
      } else {
        const entry = this.addItem(this.element, 'insert', t('Insert table'), TABLE_ACTIONS.tableinsertdialog);
        entry.always = true;
      }
    }
    this.addSubmenu(this.element, 'cell', t('Cell'), CELL_ITEMS);
    this.addSubmenu(this.element, 'row', t('Row'), ROW_ITEMS);
    this.addSubmenu(this.element, 'column', t('Column'), COLUMN_ITEMS);
    this.addSeparator(this.element);
    for (const name of TABLE_ITEMS) this.addItem(this.element, name, t(TABLE_ACTIONS[name].label), TABLE_ACTIONS[name]);
  }

  private addSeparator(parent: HTMLElement): void {
    const separator = document.createElement('div');
    separator.className = 'md-table-menu-separator';
    separator.setAttribute('role', 'separator');
    parent.appendChild(separator);
  }

  private createButton(value: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-toolbar-dropdown-item';
    button.setAttribute('data-value', value);
    const text = document.createElement('span');
    text.className = 'md-toolbar-dropdown-item-label';
    text.textContent = label;
    button.appendChild(text);
    return button;
  }

  private addItem(parent: HTMLElement, value: string, label: string, action: TableAction, list = this.entries): MenuEntry {
    const wrapper = document.createElement('div');
    wrapper.className = 'md-table-menu-entry';
    const button = this.createButton(value, label);
    button.setAttribute('role', action.isActive ? 'menuitemcheckbox' : 'menuitem');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (button.disabled) return;
      this.options.onClose();
      runTableAction(this.editor, action);
    });
    wrapper.appendChild(button);
    parent.appendChild(wrapper);
    const entry: MenuEntry = { button, action };
    list.push(entry);
    return entry;
  }

  private addSubmenu(parent: HTMLElement, value: string, label: string, names: string[]): MenuEntry {
    const wrapper = document.createElement('div');
    wrapper.className = 'md-table-menu-entry';
    const button = this.createButton(value, label);
    button.classList.add('md-table-menu-parent');
    button.setAttribute('role', 'menuitem');
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    const submenu = document.createElement('div');
    submenu.className = 'md-table-submenu';
    submenu.setAttribute('role', 'menu');
    submenu.hidden = true;

    const children: MenuEntry[] = [];
    for (const name of names) {
      if (name === '|') {
        this.addSeparator(submenu);
        continue;
      }
      const action = TABLE_ACTIONS[COLUMN_MENU_NAMES[name] ?? name];
      this.addItem(submenu, name, this.options.trans(action.label), action, children);
    }

    const open = () => {
      if (button.disabled) return;
      this.closeSubmenus(submenu);
      submenu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      this.keepOnScreen(submenu);
    };
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open();
    });
    wrapper.addEventListener('mouseenter', open);
    wrapper.append(button, submenu);
    parent.appendChild(wrapper);

    const entry: MenuEntry = { button, children, submenu };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Open `submenu` to the left of its item when there is no room on the
   * right, and lift it when it would run off the bottom of the window.
   */
  private keepOnScreen(submenu: HTMLElement): void {
    submenu.classList.remove('md-table-submenu-left');
    submenu.style.top = '';
    const rect = submenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) submenu.classList.add('md-table-submenu-left');
    if (rect.bottom > window.innerHeight) submenu.style.top = `${Math.round(window.innerHeight - rect.bottom) - 4}px`;
  }

  /** Close every open submenu except `keep`. */
  private closeSubmenus(keep?: HTMLElement): void {
    for (const entry of this.entries) {
      if (entry.submenu && entry.submenu !== keep) {
        entry.submenu.hidden = true;
        entry.button.setAttribute('aria-expanded', 'false');
      }
    }
  }

  private buildGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'md-table-grid';
    const cells = document.createElement('div');
    cells.className = 'md-table-grid-cells';
    for (let row = 1; row <= GRID_SIZE; row++) {
      for (let col = 1; col <= GRID_SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'md-table-grid-cell';
        cell.setAttribute('data-row', String(row));
        cell.setAttribute('data-col', String(col));
        cell.setAttribute('aria-label', `${col} × ${row}`);
        cell.addEventListener('mouseover', () => this.highlightGrid(row, col));
        cell.addEventListener('focus', () => this.highlightGrid(row, col));
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.options.onClose();
          this.editor.execCommand('mceInsertTable', false, { rows: row, columns: col });
        });
        cells.appendChild(cell);
      }
    }
    const label = document.createElement('div');
    label.className = 'md-table-grid-label';
    grid.append(cells, label);
    return grid;
  }

  private highlightGrid(rows: number, cols: number): void {
    if (!this.grid) return;
    this.grid.querySelectorAll('.md-table-grid-cell').forEach((cell) => {
      const active = Number(cell.getAttribute('data-row')) <= rows && Number(cell.getAttribute('data-col')) <= cols;
      cell.classList.toggle('md-table-grid-cell-active', active);
    });
    (this.grid.querySelector('.md-table-grid-label') as HTMLElement).textContent = rows && cols ? `${cols} × ${rows}` : '';
  }

  /** Arrow keys move through the items, Right/Left open and leave a submenu, Escape closes. */
  private handleKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const container = (target.closest('.md-table-submenu, .md-table-menu') as HTMLElement | null) ?? this.element;
    const items = Array.from(
      container.querySelectorAll(':scope > .md-table-menu-entry > .md-toolbar-dropdown-item')
    ).filter((el) => !(el as HTMLButtonElement).disabled) as HTMLButtonElement[];
    const index = items.indexOf(target as HTMLButtonElement);
    const parentButton = container === this.element ? null : (container.previousElementSibling as HTMLButtonElement | null);

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!items.length) return;
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        items[(index + step + items.length) % items.length].focus();
        break;
      }
      case 'ArrowRight':
        if (target.classList.contains('md-table-menu-parent')) {
          e.preventDefault();
          target.click();
          const submenu = target.nextElementSibling as HTMLElement;
          (submenu.querySelector('.md-toolbar-dropdown-item:not([disabled]), .md-table-grid-cell') as HTMLElement | null)?.focus();
        }
        break;
      case 'ArrowLeft':
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (parentButton) {
          this.closeSubmenus();
          parentButton.focus();
        } else if (e.key === 'Escape') {
          this.options.onClose();
          // The focused item is now hidden: give focus back to the editor.
          this.editor.focus();
        }
        break;
    }
  }
}
