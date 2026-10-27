/**
 * ContextMenu Tests
 * The editor's right-click menu (contextmenu), which has a table section.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';

const CONTENT = '<p>before</p><table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';

describe('ContextMenu', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  const create = (config: EditorConfig = {}) => {
    editor = new HTMLEditor(container, config);
    editor.setContent(CONTENT);
    return editor;
  };

  const menu = () => document.querySelector('.md-context-menu') as HTMLElement | null;
  const visible = () => !!menu() && menu()!.style.display !== 'none';

  /** Right-click `target`; returns the event so the caller can see whether it was handled. */
  const rightClick = (target: Element, init: MouseEventInit = {}) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 50, ...init });
    target.dispatchEvent(event);
    return event;
  };

  const cell = (text: string) =>
    Array.from(container.querySelectorAll('.md-editor-body td')).find((td) => td.textContent === text)!.querySelector('p')!;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
  });

  it('leaves the browser menu alone by default', () => {
    create();
    const event = rightClick(cell('a'));
    expect(event.defaultPrevented).toBe(false);
    expect(visible()).toBe(false);
  });

  it('shows the table menu on a right-click in a table when contextmenu includes "table"', () => {
    create({ contextmenu: 'link table' });
    const event = rightClick(cell('d'));
    expect(event.defaultPrevented).toBe(true);
    expect(visible()).toBe(true);
    expect(menu()!.style.left).toBe('40px');
    expect(menu()!.style.top).toBe('50px');
    const top = Array.from(menu()!.querySelectorAll(':scope > .md-table-menu-entry > .md-toolbar-dropdown-item')).map((el) =>
      el.getAttribute('data-value')
    );
    expect(top).toEqual(['cell', 'row', 'column', 'tableprops', 'tablecaption', 'tabledelete']);
  });

  it('moves the cursor into the cell that was right-clicked', () => {
    create({ contextmenu: 'table' });
    rightClick(cell('d'));
    expect(editor.getTipTap()!.state.selection.$from.parent.textContent).toBe('d');
  });

  it('runs an action on that cell and closes', () => {
    create({ contextmenu: 'table' });
    rightClick(cell('c'));
    const row = menu()!.querySelector('[data-value="row"]') as HTMLButtonElement;
    row.click();
    (menu()!.querySelector('[data-value="tabledeleterow"]') as HTMLButtonElement).click();
    expect(editor.getContent()).not.toContain('>c<');
    expect(editor.getContent()).toContain('>a<');
    expect(visible()).toBe(false);
  });

  it('leaves the browser menu alone outside a table, with Ctrl held, and when read-only', () => {
    create({ contextmenu: 'table' });
    expect(rightClick(container.querySelector('.md-editor-body > p')!).defaultPrevented).toBe(false);
    expect(rightClick(cell('a'), { ctrlKey: true }).defaultPrevented).toBe(false);
    editor.setReadOnly(true);
    expect(rightClick(cell('a')).defaultPrevented).toBe(false);
    expect(visible()).toBe(false);
  });

  it('is off when contextmenu is false', () => {
    create({ contextmenu: false });
    expect(rightClick(cell('a')).defaultPrevented).toBe(false);
  });

  it('closes on Escape and on a click outside it', () => {
    create({ contextmenu: 'table' });
    rightClick(cell('a'));
    (menu()!.querySelector('[data-value="tableprops"]') as HTMLButtonElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(visible()).toBe(false);
    rightClick(cell('a'));
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(visible()).toBe(false);
  });

  it('gives focus back to the editor when it closes with Escape', () => {
    create({ contextmenu: 'table' });
    rightClick(cell('a'));
    const focus = jest.spyOn(editor, 'focus');
    (menu()!.querySelector('[data-value="tableprops"]') as HTMLButtonElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(focus).toHaveBeenCalled();
  });

  it('opens a submenu to the left when there is no room on the right', () => {
    create({ contextmenu: 'table' });
    rightClick(cell('a'));
    const row = menu()!.querySelector('[data-value="row"]') as HTMLButtonElement;
    const submenu = row.nextElementSibling as HTMLElement;
    jest.spyOn(submenu, 'getBoundingClientRect').mockReturnValue({
      left: window.innerWidth - 50,
      right: window.innerWidth + 140,
      top: 10,
      bottom: 200,
      width: 190,
      height: 190,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    row.click();
    expect(submenu.classList.contains('md-table-submenu-left')).toBe(true);
  });

  it('is removed with the editor', () => {
    create({ contextmenu: 'table' });
    rightClick(cell('a'));
    editor.destroy();
    expect(menu()).toBeNull();
  });
});
