/**
 * ContextMenu
 * The editor's right-click menu (TinyMCE's contextmenu option). It has one
 * section so far, `table`: a right-click in a table opens the table menu
 * (Cell, Row and Column submenus, Table properties, caption, Delete table) for
 * the cell under the pointer.
 *
 * It is off unless `contextmenu` names `table`, because it replaces the
 * browser's own menu, and with it the spelling suggestions. Holding Ctrl
 * while right-clicking shows the browser's menu, as in TinyMCE, and so does a
 * right-click anywhere the editor has no menu for.
 */

import type { Editor as TipTapEditor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { CellSelection, cellAround } from '@tiptap/pm/tables';
import type { HTMLEditor } from '../core/HTMLEditor';
import { TableMenu } from './TableMenu';

export interface ContextMenuOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

/** The sections a `contextmenu` value turns on; `true` is TinyMCE's default, which includes `table`. */
export function contextMenuSections(value: boolean | string | undefined): string[] {
  if (value === true) return ['table'];
  if (!value) return [];
  return value.split(/[\s|,]+/).filter(Boolean);
}

export class ContextMenu {
  private options: ContextMenuOptions;
  private host: HTMLElement;
  private menu: TableMenu;
  private readonly onContextMenu = (e: MouseEvent) => this.handleContextMenu(e);
  private readonly onDocumentMouseDown = (e: MouseEvent) => {
    if (!this.menu.element.contains(e.target as Node)) this.close();
  };
  private readonly onWindowChange = () => this.close();

  constructor(options: ContextMenuOptions) {
    this.options = options;
    const skin = options.editor.getConfig().skin ?? 'oxide';
    this.host = document.createElement('div');
    this.host.className = `md-editor-${skin}`;
    this.host.style.display = 'contents';
    this.menu = new TableMenu({ editor: options.editor, trans: options.trans, withInsert: false, onClose: () => this.close() });
    this.menu.element.classList.add('md-toolbar-dropdown-menu', 'md-context-menu');
    this.menu.element.style.display = 'none';
    this.host.appendChild(this.menu.element);
    document.body.appendChild(this.host);
    this.tiptap?.view.dom.addEventListener('contextmenu', this.onContextMenu);
  }

  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }

  isOpen(): boolean {
    return this.menu.element.style.display !== 'none';
  }

  close(): void {
    if (!this.isOpen()) return;
    this.menu.element.style.display = 'none';
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
    window.removeEventListener('blur', this.onWindowChange);
    window.removeEventListener('resize', this.onWindowChange);
  }

  destroy(): void {
    this.close();
    this.tiptap?.view.dom.removeEventListener('contextmenu', this.onContextMenu);
    this.host.remove();
  }

  private handleContextMenu(e: MouseEvent): void {
    const tiptap = this.tiptap;
    if (!tiptap || e.ctrlKey || this.options.editor.isReadOnly()) return;
    const cell = (e.target as HTMLElement | null)?.closest?.('td, th');
    if (!cell || !tiptap.view.dom.contains(cell)) return;

    e.preventDefault();
    this.selectCell(tiptap, cell as HTMLElement);
    this.menu.refresh();
    const element = this.menu.element;
    element.style.display = 'block';
    element.style.left = `${e.clientX}px`;
    element.style.top = `${e.clientY}px`;
    // Keep it on screen.
    const rect = element.getBoundingClientRect();
    if (rect.right > window.innerWidth) element.style.left = `${Math.max(0, window.innerWidth - rect.width)}px`;
    if (rect.bottom > window.innerHeight) element.style.top = `${Math.max(0, window.innerHeight - rect.height)}px`;
    (element.querySelector('.md-toolbar-dropdown-item:not([disabled])') as HTMLElement | null)?.focus();

    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    window.addEventListener('blur', this.onWindowChange);
    window.addEventListener('resize', this.onWindowChange);
  }

  /**
   * Put the cursor in the right-clicked cell, unless it is part of a cell
   * selection, which the menu then acts on as a whole.
   */
  private selectCell(tiptap: TipTapEditor, cell: HTMLElement): void {
    const { view, state } = tiptap;
    const $cell = cellAround(state.doc.resolve(view.posAtDOM(cell, 0)));
    if (!$cell) return;
    const cellPos = $cell.pos;
    const cellEnd = cellPos + $cell.nodeAfter!.nodeSize;

    const { selection } = state;
    if (selection instanceof CellSelection) {
      let inSelection = false;
      selection.forEachCell((_node, pos) => {
        if (pos === cellPos) inSelection = true;
      });
      if (inSelection) return;
    } else if (selection.from > cellPos && selection.to < cellEnd) {
      return;
    }
    view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(cellPos + 1))));
  }
}
