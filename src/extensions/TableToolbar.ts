/**
 * TableToolbar
 * TinyMCE's table context toolbar (table_toolbar): a small toolbar shown above
 * the table the cursor is in, while the editor has focus and is editable.
 *
 * It is a second Toolbar of the same editor, so its buttons are the main
 * toolbar's (icons, tooltips, enabled state, custom buttons). It is fixed to
 * the viewport and portaled to document.body, like the toolbar's menus, so the
 * editor's own overflow does not clip it. Pressing its buttons does not take
 * focus from the editor, so the selection in the table stays put.
 */

import type { Editor as TipTapEditor } from '@tiptap/core';
import { isInTable } from '@tiptap/pm/tables';
import type { HTMLEditor } from '../core/HTMLEditor';
import { Toolbar } from '../core/Toolbar';
import type { IconSet } from '../icons';
import type { EditorConfig, ToolbarButtonSpec } from '../types';
import { tableElementAtSelection } from './TableCommands';

export interface TableToolbarOptions {
  editor: HTMLEditor;
  /** The buttons, as a toolbar string. */
  buttons: string;
  config: EditorConfig;
  iconSet: IconSet;
  customButtons: Map<string, ToolbarButtonSpec>;
  trans: (key: string) => string;
}

/** Gap between the table and the toolbar, in pixels. */
const GAP = 6;

export class TableToolbar {
  private options: TableToolbarOptions;
  private host: HTMLElement;
  private container: HTMLElement;
  private toolbar: Toolbar;
  /** Whether the editor has focus; the toolbar shows only while it does. */
  private focused = false;
  private framePending = false;
  /** Marks this toolbar's own menus, which are portaled to document.body. */
  private readonly menuClass: string;
  private readonly update = () => this.refresh();
  private readonly onBlur = ({ event }: { event: FocusEvent }) => {
    // Focus moving into the toolbar, or into one of its dropdown or color
    // menus (portaled to document.body), keeps it up until the user goes
    // somewhere else on the page.
    if (this.isOwnUi(event.relatedTarget)) {
      this.watchLeavingMenus(true);
      return;
    }
    this.blur();
  };
  private readonly onFocus = () => {
    this.watchLeavingMenus(false);
    this.focused = true;
    this.refresh();
  };
  /** After focus went into a menu: a press or focus anywhere else ends it. */
  private readonly onPageInteraction = (e: Event) => {
    const target = e.target;
    const tiptap = this.tiptap;
    if (this.isOwnUi(target) || (target instanceof Node && tiptap?.view.dom.contains(target))) return;
    this.blur();
  };
  private readonly reposition = () => {
    if (this.container.style.display !== 'none') this.schedulePosition();
  };

  constructor(options: TableToolbarOptions) {
    this.options = options;
    this.menuClass = `md-table-toolbar-menu-${options.editor.id}`;
    const skin = options.config.skin ?? 'oxide';

    this.host = document.createElement('div');
    this.host.className = `md-editor-${skin} md-table-toolbar-host`;
    this.container = document.createElement('div');
    this.container.className = 'md-table-toolbar';
    this.container.setAttribute('role', 'toolbar');
    this.container.style.display = 'none';
    this.host.appendChild(this.container);
    document.body.appendChild(this.host);

    const toolbarEl = document.createElement('div');
    this.container.appendChild(toolbarEl);
    this.toolbar = new Toolbar(toolbarEl, {
      editor: options.editor,
      buttons: options.buttons,
      mode: 'wrap',
      sticky: false,
      customButtons: options.customButtons,
      config: options.config,
      iconSet: options.iconSet,
      narrowBreakpoint: 0,
      priorityOverrides: {},
      shortcuts: false,
      overflowToggle: false,
      menuClassName: `md-table-toolbar-menu ${this.menuClass}`,
      isVisible: () => this.container.style.display !== 'none',
    });
    this.label();

    // Keep focus (and so the selection) in the editor when a button is pressed.
    this.container.addEventListener('mousedown', (e) => {
      if (!(e.target as HTMLElement).closest('input, select, textarea')) e.preventDefault();
    });

    const tiptap = this.tiptap;
    this.focused = tiptap?.isFocused ?? false;
    tiptap?.on('transaction', this.update);
    tiptap?.on('focus', this.onFocus);
    tiptap?.on('blur', this.onBlur);
    window.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);
  }

  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }

  private label(): void {
    this.container.setAttribute('aria-label', this.options.trans('Table'));
  }

  /** Show the toolbar at the table the cursor is in, or hide it. */
  refresh(): void {
    const tiptap = this.tiptap;
    const show = !!tiptap && this.focused && !this.options.editor.isReadOnly() && isInTable(tiptap.state);
    const wasShown = this.container.style.display !== 'none';
    this.container.style.display = show ? '' : 'none';
    if (show) {
      if (!wasShown) this.toolbar.refreshState();
      this.schedulePosition();
    } else if (wasShown) {
      this.toolbar.closeMenus();
    }
  }

  /** The toolbar itself or one of its dropdown / color menus (portaled to document.body). */
  private isOwnUi(target: EventTarget | null): boolean {
    return target instanceof Element && (this.container.contains(target) || !!target.closest(`.${this.menuClass}`));
  }

  private blur(): void {
    this.watchLeavingMenus(false);
    this.focused = false;
    this.refresh();
  }

  private watchLeavingMenus(on: boolean): void {
    const method = on ? 'addEventListener' : 'removeEventListener';
    document[method]('mousedown', this.onPageInteraction, true);
    document[method]('focusin', this.onPageInteraction, true);
  }

  /** Position on the next frame, once per frame however many transactions come in. */
  private schedulePosition(): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.position();
      return;
    }
    if (this.framePending) return;
    this.framePending = true;
    requestAnimationFrame(() => {
      this.framePending = false;
      if (this.container.style.display !== 'none') this.position();
    });
  }

  /** Re-render the buttons, for a change of language. */
  rebuild(): void {
    this.toolbar.rebuild();
    this.label();
  }

  destroy(): void {
    const tiptap = this.tiptap;
    tiptap?.off('transaction', this.update);
    tiptap?.off('focus', this.onFocus);
    tiptap?.off('blur', this.onBlur);
    this.watchLeavingMenus(false);
    window.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
    this.toolbar.destroy();
    this.host.remove();
  }

  /** Above the table, or below it when there is no room above, kept on screen. */
  private position(): void {
    const table = this.tiptap ? tableElementAtSelection(this.tiptap.view) : null;
    if (!table) return;
    const rect = table.getBoundingClientRect();
    const bar = this.container.getBoundingClientRect();
    let top = rect.top - bar.height - GAP;
    if (top < 0) top = rect.bottom + GAP;
    top = Math.max(0, Math.min(top, window.innerHeight - bar.height));
    const left = Math.max(0, Math.min(rect.left, window.innerWidth - bar.width));
    this.container.style.top = `${top}px`;
    this.container.style.left = `${left}px`;
  }
}
