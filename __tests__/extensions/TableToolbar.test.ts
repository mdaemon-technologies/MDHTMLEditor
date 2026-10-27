/**
 * TableToolbar Tests
 * The context toolbar shown above a table while the cursor is in it (table_toolbar).
 */

import { HTMLEditor, setTranslate, resetTranslate } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';

const CONTENT = '<p>before</p><table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';

function cursorInCell(editor: HTMLEditor): void {
  let cellPos = -1;
  editor.getTipTap()!.state.doc.descendants((node, pos) => {
    if (cellPos < 0 && node.type.name === 'tableCell') cellPos = pos;
    return cellPos < 0;
  });
  editor.getTipTap()!.commands.setTextSelection(cellPos + 2);
}

describe('TableToolbar', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  /** Fire TipTap's focus or blur event (jsdom cannot focus a contenteditable). */
  const emit = (type: 'focus' | 'blur', relatedTarget: EventTarget | null = null) => {
    const tiptap = editor.getTipTap()!;
    tiptap.emit(type, { editor: tiptap, event: new FocusEvent(type, { relatedTarget }), transaction: tiptap.state.tr });
  };

  /** An editor with the content loaded, given focus unless `focused` is false. */
  const create = (config: EditorConfig = {}, focused = true) => {
    editor = new HTMLEditor(container, config);
    if (focused) emit('focus');
    editor.setContent(CONTENT);
    return editor;
  };

  const bar = () => document.querySelector('.md-table-toolbar') as HTMLElement | null;
  const visible = () => !!bar() && bar()!.style.display !== 'none';
  const buttonNames = () => Array.from(bar()!.querySelectorAll('[data-button]')).map((b) => b.getAttribute('data-button'));

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
    resetTranslate();
  });

  it('shows TinyMCE\'s default table toolbar while the cursor is in a table', () => {
    create();
    editor.getTipTap()!.commands.setTextSelection(2);
    expect(visible()).toBe(false);
    cursorInCell(editor);
    expect(visible()).toBe(true);
    expect(buttonNames()).toEqual([
      'tableprops',
      'tabledelete',
      'tableinsertrowbefore',
      'tableinsertrowafter',
      'tabledeleterow',
      'tableinsertcolbefore',
      'tableinsertcolafter',
      'tabledeletecol',
    ]);
  });

  it('hides when the cursor leaves the table', () => {
    create();
    cursorInCell(editor);
    editor.getTipTap()!.commands.setTextSelection(2);
    expect(visible()).toBe(false);
  });

  it('hides when the editor loses focus and shows again when it regains it', () => {
    create();
    cursorInCell(editor);
    emit('blur');
    expect(visible()).toBe(false);
    emit('focus');
    expect(visible()).toBe(true);
  });

  it('is not shown before the editor has had focus', () => {
    create({}, false);
    cursorInCell(editor);
    expect(visible()).toBe(false);
  });

  it('stays up while focus is in one of its menus', () => {
    create({ table_toolbar: 'tablecellvalign tablecellbackgroundcolor' });
    cursorInCell(editor);
    const item = document.querySelector('[data-dropdown-menu="tablecellvalign"] .md-toolbar-dropdown-item') as HTMLElement;
    emit('blur', item);
    expect(visible()).toBe(true);
    const swatch = document.querySelector('[data-colorpicker-menu="tablecellbackgroundcolor"] .md-toolbar-colorpicker-swatch') as HTMLElement;
    emit('blur', swatch);
    expect(visible()).toBe(true);
  });

  it('hides once focus leaves one of its menus for the rest of the page', () => {
    create({ table_toolbar: 'tablecellvalign' });
    cursorInCell(editor);
    const item = document.querySelector('[data-dropdown-menu="tablecellvalign"] .md-toolbar-dropdown-item') as HTMLElement;
    emit('blur', item);
    expect(visible()).toBe(true);
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    elsewhere.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(visible()).toBe(false);
    elsewhere.remove();
  });

  it('closes its open menus when it hides', () => {
    create({ table_toolbar: 'tablecellborderstyle' });
    cursorInCell(editor);
    (bar()!.querySelector('[data-dropdown="tablecellborderstyle"] .md-toolbar-dropdown-btn') as HTMLButtonElement).click();
    const menu = document.querySelector('[data-dropdown-menu="tablecellborderstyle"]') as HTMLElement;
    expect(menu.style.display).toBe('block');
    editor.getTipTap()!.commands.setTextSelection(2);
    expect(visible()).toBe(false);
    expect(menu.style.display).toBe('none');
  });

  it('marks its menus as its own, so they stack above it', () => {
    create({ table_toolbar: 'tablecellvalign tablecellbordercolor' });
    expect(document.querySelectorAll('.md-table-toolbar-menu')).toHaveLength(2);
  });

  it("does not stay up for another editor's menu", () => {
    create({ table_toolbar: 'tablecellvalign' });
    cursorInCell(editor);
    const other = document.createElement('div');
    other.className = 'md-toolbar-dropdown-menu';
    const item = document.createElement('button');
    other.appendChild(item);
    document.body.appendChild(other);
    emit('blur', item);
    expect(visible()).toBe(false);
    other.remove();
  });

  it('does not refresh its buttons while hidden', async () => {
    create();
    cursorInCell(editor);
    emit('blur');
    expect(visible()).toBe(false);
    const check = jest.spyOn(editor, 'isTableCommandEnabled');
    await new Promise((resolve) => setTimeout(resolve, 150));
    // The main toolbar has no table controls; the hidden table toolbar is idle.
    expect(check).not.toHaveBeenCalled();
  });

  it('uses the configured buttons', () => {
    create({ table_toolbar: 'tableinsertrowafter | tablecellprops' });
    cursorInCell(editor);
    expect(buttonNames()).toEqual(['tableinsertrowafter', 'tablecellprops']);
  });

  it.each([false, ''] as const)('is not created when table_toolbar is %p', (value) => {
    create({ table_toolbar: value });
    cursorInCell(editor);
    expect(bar()).toBeNull();
  });

  it('is off by default in the basic editor', () => {
    create({ basicEditor: true });
    cursorInCell(editor);
    expect(bar()).toBeNull();
  });

  it('stays hidden in a read-only editor', () => {
    create();
    editor.setReadOnly(true);
    cursorInCell(editor);
    expect(visible()).toBe(false);
  });

  it('runs a button\'s action', () => {
    create();
    cursorInCell(editor);
    (bar()!.querySelector('[data-button="tableinsertrowafter"]') as HTMLButtonElement).click();
    expect(editor.getContent().match(/<tr>/g)).toHaveLength(3);
  });

  it('keeps the editor focused when a button is pressed', () => {
    create();
    cursorInCell(editor);
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    bar()!.querySelector('[data-button="tabledeleterow"]')!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it('does not bind a second Ctrl+F handler', () => {
    create({ toolbar: 'bold' });
    cursorInCell(editor);
    const tiptap = editor.getTipTap()!;
    Object.defineProperty(tiptap, 'isFocused', { get: () => true, configurable: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
    expect(document.querySelectorAll('.md-search-replace, .md-searchreplace-dialog').length).toBeLessThanOrEqual(1);
  });

  it('is translated again when the language changes', () => {
    create();
    cursorInCell(editor);
    setTranslate((key) => (key === 'Table properties' ? 'Tabelleneigenschaften' : key));
    editor.setLanguage('de');
    expect((bar()!.querySelector('[data-button="tableprops"]') as HTMLElement).title).toBe('Tabelleneigenschaften');
  });

  it('is removed with the editor', () => {
    create();
    cursorInCell(editor);
    editor.destroy();
    expect(bar()).toBeNull();
  });
});
