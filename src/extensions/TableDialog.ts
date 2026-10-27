/**
 * TableDialog
 * TinyMCE's table dialogs: Insert table, Table properties, Row properties and
 * Cell properties, each with a General tab and, unless turned off by
 * table_advtab / table_row_advtab / table_cell_advtab, an Advanced tab for
 * borders and background.
 *
 * Only the fields the user changed are applied, so a dialog opened on several
 * rows or cells that differ leaves alone what was not touched. Every value
 * still goes through the table, row and cell allowlists, so one that is not
 * allowed is dropped.
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import type { Node as PMNode } from '@tiptap/pm/model';
import { mergeStyle, styleProperty } from '../utils/cssValues';
import { MAX_TABLE_SIZE, TABLE_STYLE_RULES, smallNumber } from './TableAttributes';
import {
  getTableCellType,
  getTableRowType,
  selectedCellPositions,
  tableRect,
} from './TableCommands';
import type { CellAttributeChanges, TableAttributeChanges } from './TableCommands';

export interface TableDialogOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

/** Which dialog to open. */
export type TableDialogKind = 'insert' | 'table' | 'row' | 'cell';

interface FieldSpec {
  name: string;
  label: string;
  value: string;
  /** A select's choices as [value, label]; a text field when absent. */
  choices?: Array<[string, string]>;
}

interface TabSpec {
  label: string;
  fields: FieldSpec[];
}

/** Returns true when the values were applied and the dialog can close. */
type SaveHandler = (values: Record<string, string>, changed: (name: string) => boolean) => boolean;

/** TinyMCE's border style choices, in its order. */
export const BORDER_STYLE_CHOICES: ReadonlyArray<[string, string]> = [
  ['solid', 'Solid'],
  ['dotted', 'Dotted'],
  ['dashed', 'Dashed'],
  ['double', 'Double'],
  ['groove', 'Groove'],
  ['ridge', 'Ridge'],
  ['inset', 'Inset'],
  ['outset', 'Outset'],
  ['none', 'None'],
  ['hidden', 'Hidden'],
];

let dialogCounter = 0;

const styleValue = (style: unknown, property: string): string => styleProperty(style, property);

/** A size as typed: a bare number is pixels. */
function cssLength(value: string): string {
  const trimmed = value.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
}


export class TableDialog {
  private options: TableDialogOptions;
  private overlay: HTMLElement | null = null;

  constructor(options: TableDialogOptions) {
    this.options = options;
  }

  private get trans(): (key: string) => string {
    return this.options.trans;
  }

  /** Open a dialog. False, and nothing opens, when a properties dialog is asked for outside a table. */
  open(kind: TableDialogKind): boolean {
    switch (kind) {
      case 'insert':
        return this.openInsert();
      case 'table':
        return this.openTable();
      case 'row':
        return this.openRow();
      case 'cell':
        return this.openCell();
    }
  }

  isOpen(): boolean {
    return !!this.overlay;
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  destroy(): void {
    this.close();
  }

  private alignChoices(withJustify = false): Array<[string, string]> {
    const t = this.trans;
    const choices: Array<[string, string]> = [['', t('None')], ['left', t('Left')], ['center', t('Center')], ['right', t('Right')]];
    if (withJustify) choices.push(['justify', t('Justify')]);
    return choices;
  }

  private borderStyleChoices(): Array<[string, string]> {
    return [['', ''], ...BORDER_STYLE_CHOICES.map(([value, label]): [string, string] => [value, this.trans(label)])];
  }

  /** The Advanced tab: border style and color, background color, and optionally border width. */
  private advancedTab(style: unknown, withWidth: boolean): TabSpec {
    const t = this.trans;
    const fields: FieldSpec[] = [];
    if (withWidth) fields.push({ name: 'borderwidth', label: t('Border width'), value: styleValue(style, 'border-width') });
    fields.push(
      { name: 'borderstyle', label: t('Border style'), value: styleValue(style, 'border-style'), choices: this.borderStyleChoices() },
      { name: 'bordercolor', label: t('Border color'), value: styleValue(style, 'border-color') },
      { name: 'backgroundcolor', label: t('Background color'), value: styleValue(style, 'background-color') }
    );
    return { label: t('Advanced'), fields };
  }

  /** The style changes from the Advanced tab fields the user changed. */
  private advancedChanges(values: Record<string, string>, changed: (name: string) => boolean): Record<string, string> {
    const changes: Record<string, string> = {};
    if (changed('borderwidth')) changes['border-width'] = cssLength(values.borderwidth);
    if (changed('borderstyle')) changes['border-style'] = values.borderstyle;
    if (changed('bordercolor')) changes['border-color'] = values.bordercolor.trim();
    if (changed('backgroundcolor')) changes['background-color'] = values.backgroundcolor.trim();
    return changes;
  }

  private openInsert(): boolean {
    const t = this.trans;
    const config = this.options.editor.getConfig();
    this.show(t('Insert table'), [{
      label: t('General'),
      fields: [
        { name: 'cols', label: t('Columns'), value: '2' },
        { name: 'rows', label: t('Rows'), value: '2' },
      ],
    }], (values) => {
      const invalid = ['cols', 'rows'].filter((name) => {
        const size = /^\s*\d+\s*$/.test(values[name]) ? Number(values[name]) : 0;
        return size < 1 || size > MAX_TABLE_SIZE;
      });
      this.markInvalid(invalid);
      if (invalid.length) return false;
      this.options.editor.execCommand('mceInsertTable', false, {
        rows: Number(values.rows),
        columns: Number(values.cols),
        options: { headerRows: config.table_default_header_rows ?? 0, headerColumns: config.table_default_header_cols ?? 0 },
      });
      return true;
    });
    return true;
  }

  private openTable(): boolean {
    const state = this.options.editor.getTipTap()?.state;
    const rect = state ? tableRect(state) : null;
    if (!rect) return false;
    const t = this.trans;
    const config = this.options.editor.getConfig();
    const { attrs } = rect.table;
    const style = attrs.style;
    const float = styleValue(style, 'float');
    const marginLeft = styleValue(style, 'margin-left');
    const align =
      float === 'left' || float === 'right'
        ? float
        : marginLeft === 'auto' && styleValue(style, 'margin-right') === 'auto'
          ? 'center'
          : '';

    const general: FieldSpec[] = [
      { name: 'width', label: t('Width'), value: styleValue(style, 'width') },
      { name: 'height', label: t('Height'), value: styleValue(style, 'height') },
    ];
    if (config.table_appearance_options !== false) {
      general.push(
        { name: 'cellspacing', label: t('Cell spacing'), value: attrs.cellspacing ?? '' },
        { name: 'cellpadding', label: t('Cell padding'), value: attrs.cellpadding ?? '' },
        { name: 'border', label: t('Border width'), value: attrs.border ?? '' },
        { name: 'caption', label: t('Caption'), value: attrs.caption ?? '' }
      );
    }
    general.push({ name: 'align', label: t('Alignment'), value: align, choices: this.alignChoices() });

    const tabs: TabSpec[] = [{ label: t('General'), fields: general }];
    if (config.table_advtab !== false) tabs.push(this.advancedTab(style, false));

    this.show(t('Table properties'), tabs, (values, changed) => {
      const styleChanges: Record<string, string> = this.advancedChanges(values, changed);
      if (changed('width')) styleChanges.width = cssLength(values.width);
      if (changed('height')) styleChanges.height = cssLength(values.height);
      if (changed('align')) {
        styleChanges.float = values.align === 'left' || values.align === 'right' ? values.align : '';
        if (values.align === 'center') {
          styleChanges['margin-left'] = 'auto';
          styleChanges['margin-right'] = 'auto';
        } else if (align === 'center') {
          styleChanges['margin-left'] = '';
          styleChanges['margin-right'] = '';
        }
      }
      const changes: TableAttributeChanges = {};
      if (Object.keys(styleChanges).length) changes.style = mergeStyle(style, styleChanges, TABLE_STYLE_RULES);
      for (const name of ['cellspacing', 'cellpadding', 'border'] as const) {
        if (changed(name)) changes[name] = smallNumber(values[name]);
      }
      if (changed('caption')) changes.caption = values.caption;
      if (Object.keys(changes).length) this.options.editor.runTableCommand('style', (c) => c.setTableAttributes(changes));
      return true;
    });
    return true;
  }

  private openRow(): boolean {
    const state = this.options.editor.getTipTap()?.state;
    const rect = state ? tableRect(state) : null;
    if (!state || !rect) return false;
    const t = this.trans;
    const config = this.options.editor.getConfig();
    const style = rect.table.child(rect.top).attrs.style;

    const tabs: TabSpec[] = [{
      label: t('General'),
      fields: [
        { name: 'rowtype', label: t('Row type'), value: getTableRowType(state), choices: [['header', t('Header')], ['body', t('Body')]] },
        { name: 'align', label: t('Alignment'), value: styleValue(style, 'text-align'), choices: this.alignChoices(true) },
        { name: 'height', label: t('Height'), value: styleValue(style, 'height') },
      ],
    }];
    if (config.table_row_advtab !== false) tabs.push(this.advancedTab(style, false));

    this.show(t('Row properties'), tabs, (values, changed) => {
      const styleChanges = this.advancedChanges(values, changed);
      if (changed('align')) styleChanges['text-align'] = values.align;
      if (changed('height')) styleChanges.height = cssLength(values.height);
      const type = values.rowtype === 'header' ? 'header' : 'body';
      const restyle = Object.keys(styleChanges).length > 0;
      if (!changed('rowtype') && !restyle) return true;
      this.options.editor.runTableCommand(changed('rowtype') ? 'structure' : 'style', (c) => {
        let chain = c;
        if (changed('rowtype')) chain = chain.setTableRowType(type);
        // Each row keeps the rest of its own style.
        if (restyle) chain = chain.applyTableRowStyle(styleChanges);
        return chain;
      });
      return true;
    });
    return true;
  }

  private openCell(): boolean {
    const state = this.options.editor.getTipTap()?.state;
    const positions = state ? selectedCellPositions(state) : [];
    if (!state || !positions.length) return false;
    const t = this.trans;
    const config = this.options.editor.getConfig();
    const cell = state.doc.nodeAt(positions[0]) as PMNode;
    const { attrs } = cell;
    const style = attrs.style;
    const width = Array.isArray(attrs.colwidth) && attrs.colwidth[0] ? String(attrs.colwidth[0]) : '';

    const tabs: TabSpec[] = [{
      label: t('General'),
      fields: [
        { name: 'width', label: t('Width'), value: width },
        { name: 'height', label: t('Height'), value: styleValue(style, 'height') },
        { name: 'celltype', label: t('Cell type'), value: getTableCellType(state), choices: [['td', t('Cell')], ['th', t('Header cell')]] },
        {
          name: 'scope',
          label: t('Scope'),
          value: attrs.scope ?? '',
          choices: [['', t('None')], ['row', t('Row')], ['col', t('Column')], ['rowgroup', t('Row group')], ['colgroup', t('Column group')]],
        },
        { name: 'halign', label: t('Horizontal alignment'), value: attrs.align ?? '', choices: this.alignChoices() },
        {
          name: 'valign',
          label: t('Vertical alignment'),
          value: styleValue(style, 'vertical-align'),
          choices: [['', t('None')], ['top', t('Top')], ['middle', t('Middle')], ['bottom', t('Bottom')]],
        },
      ],
    }];
    if (config.table_cell_advtab !== false) tabs.push(this.advancedTab(style, true));

    this.show(t('Cell properties'), tabs, (values, changed) => {
      const styleChanges = this.advancedChanges(values, changed);
      if (changed('height')) styleChanges.height = cssLength(values.height);
      if (changed('valign')) styleChanges['vertical-align'] = values.valign;
      const cellChanges: CellAttributeChanges = {};
      if (changed('halign')) cellChanges.align = (values.halign || null) as CellAttributeChanges['align'];
      if (changed('scope')) cellChanges.scope = (values.scope || null) as CellAttributeChanges['scope'];
      // A column width is pixels; a percentage or anything else is not one.
      const widthMatch = /^\s*(\d{1,5})\s*(px)?\s*$/i.exec(values.width);
      const invalid = changed('width') && values.width.trim() !== '' && !widthMatch;
      this.markInvalid(invalid ? ['width'] : []);
      if (invalid) return false;
      const columnWidth = widthMatch ? Number(widthMatch[1]) : 0;
      const restyle = Object.keys(styleChanges).length > 0;
      const reattribute = Object.keys(cellChanges).length > 0;
      if (!changed('celltype') && !restyle && !reattribute && !changed('width')) return true;

      this.options.editor.runTableCommand(changed('celltype') ? 'structure' : 'style', (c) => {
        let chain = c;
        if (changed('celltype')) chain = chain.setTableCellType(values.celltype === 'th' ? 'th' : 'td');
        if (reattribute) chain = chain.setTableCellAttributes(cellChanges);
        if (restyle) chain = chain.applyTableCellStyle(styleChanges);
        if (changed('width')) chain = chain.setTableColumnWidth(columnWidth > 0 ? columnWidth : null);
        return chain;
      });
      return true;
    });
    return true;
  }

  private markInvalid(names: string[]): void {
    this.overlay?.querySelectorAll('[name]').forEach((el) => {
      const invalid = names.includes(el.getAttribute('name') ?? '');
      if (invalid) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    });
  }

  private show(title: string, tabs: TabSpec[], onSave: SaveHandler): void {
    this.close();
    const t = this.trans;
    const skin = this.options.editor.getConfig().skin ?? 'oxide';
    const id = `md-table-dialog-${++dialogCounter}`;
    const initial = new Map<string, string>();
    const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();

    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.style.display = 'flex';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.cancel();
    });

    const themeWrapper = document.createElement('div');
    themeWrapper.className = `md-editor-${skin}`;
    themeWrapper.style.display = 'contents';

    const dialog = document.createElement('div');
    dialog.className = 'md-dialog md-table-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', `${id}-title`);

    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    const heading = document.createElement('h3');
    heading.id = `${id}-title`;
    heading.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'md-dialog-close';
    closeBtn.setAttribute('aria-label', t('Cancel'));
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.cancel());
    header.append(heading, closeBtn);
    dialog.appendChild(header);

    const body = document.createElement('div');
    body.className = 'md-dialog-body';

    const tabButtons: HTMLButtonElement[] = [];
    const panels: HTMLElement[] = [];
    const selectTab = (index: number) => {
      tabButtons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      panels.forEach((panel, i) => {
        panel.hidden = i !== index;
      });
    };

    if (tabs.length > 1) {
      const tabList = document.createElement('div');
      tabList.className = 'md-table-dialog-tabs';
      tabList.setAttribute('role', 'tablist');
      tabs.forEach((tab, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'md-table-dialog-tab';
        button.id = `${id}-tab-${index}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `${id}-panel-${index}`);
        button.textContent = tab.label;
        button.addEventListener('click', () => selectTab(index));
        tabButtons.push(button);
        tabList.appendChild(button);
      });
      dialog.appendChild(tabList);
    }

    tabs.forEach((tab, index) => {
      const panel = document.createElement('div');
      panel.className = 'md-table-dialog-panel';
      panel.id = `${id}-panel-${index}`;
      if (tabs.length > 1) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `${id}-tab-${index}`);
      }
      for (const spec of tab.fields) {
        const row = document.createElement('div');
        row.className = 'md-table-dialog-row';
        const label = document.createElement('label');
        label.htmlFor = `${id}-${spec.name}`;
        label.textContent = spec.label;
        let input: HTMLInputElement | HTMLSelectElement;
        if (spec.choices) {
          const select = document.createElement('select');
          for (const [value, text] of spec.choices) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
          }
          // A value the choices do not list (an unusual border style, say)
          // still shows, rather than reading as the first choice.
          if (spec.value && !spec.choices.some(([value]) => value === spec.value)) {
            const option = document.createElement('option');
            option.value = spec.value;
            option.textContent = spec.value;
            select.appendChild(option);
          }
          input = select;
        } else {
          const text = document.createElement('input');
          text.type = 'text';
          input = text;
        }
        input.id = `${id}-${spec.name}`;
        input.name = spec.name;
        input.className = 'md-table-dialog-input';
        input.value = spec.value;
        initial.set(spec.name, input.value);
        inputs.set(spec.name, input);
        row.append(label, input);
        panel.appendChild(row);
      }
      panels.push(panel);
      body.appendChild(panel);
    });

    const footer = document.createElement('div');
    footer.className = 'md-table-dialog-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'md-btn md-table-dialog-cancel';
    cancelBtn.textContent = t('Cancel');
    cancelBtn.addEventListener('click', () => this.cancel());
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'md-btn md-btn-primary md-table-dialog-save';
    saveBtn.textContent = t('Save');
    const save = () => {
      const values: Record<string, string> = {};
      inputs.forEach((input, name) => {
        values[name] = input.value;
      });
      const changed = (name: string) => inputs.has(name) && values[name] !== initial.get(name);
      if (onSave(values, changed)) {
        this.close();
        this.options.editor.focus();
      }
    };
    saveBtn.addEventListener('click', save);
    footer.append(cancelBtn, saveBtn);
    body.appendChild(footer);

    dialog.appendChild(body);
    themeWrapper.appendChild(dialog);
    overlay.appendChild(themeWrapper);

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      } else if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        e.preventDefault();
        save();
      }
    });

    selectTab(0);
    document.body.appendChild(overlay);
    this.overlay = overlay;
    (inputs.values().next().value as HTMLElement | undefined)?.focus();
  }

  private cancel(): void {
    this.close();
    this.options.editor.focus();
  }
}
