/**
 * Skinned popup Tests
 * Menus and dialogs are added to document.body, outside the editor, so they
 * escape its overflow. The skin rules are written under the skin class
 * (.md-editor-oxide-dark .md-dialog, ...), so each of them must sit inside an
 * element carrying the editor's skin class, or it shows the light styles.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';

type Skin = NonNullable<EditorConfig['skin']>;

const TABLE = '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';

describe('Skinned popups', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  const create = (skin: Skin, config: EditorConfig = {}) => {
    editor = new HTMLEditor(container, { skin, ...config });
    return editor;
  };

  /** The skin class on the nearest ancestor of `el` that has one, outside the editor itself. */
  const skinOf = (el: Element | null): string | null => {
    const host = el?.parentElement?.closest('[class*="md-editor-"]');
    if (!host || host.classList.contains('md-editor')) return null;
    return Array.from(host.classList).find((c) => /^md-editor-(oxide|confab)/.test(c)) ?? null;
  };

  const click = (selector: string) => {
    (container.querySelector(selector) as HTMLElement).click();
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

  describe('toolbar menus', () => {
    it.each<Skin>(['oxide', 'oxide-dark', 'confab', 'confab-dark'])('puts the dropdown menus inside the %s skin', (skin) => {
      create(skin);
      const menu = document.querySelector('[data-dropdown-menu="fontsize"]');
      expect(menu).not.toBeNull();
      expect(skinOf(menu)).toBe(`md-editor-${skin}`);
    });

    it('puts the color menus inside the skin', () => {
      create('oxide-dark');
      expect(skinOf(document.querySelector('[data-colorpicker-menu="forecolor"]'))).toBe('md-editor-oxide-dark');
    });

    it('puts the table menu inside the skin', () => {
      create('confab-dark');
      expect(skinOf(document.querySelector('[data-dropdown-menu="table"]'))).toBe('md-editor-confab-dark');
    });

    it('keeps the menus outside the editor, so its overflow does not clip them', () => {
      create('oxide-dark');
      const menu = document.querySelector('[data-dropdown-menu="fontsize"]')!;
      expect(container.contains(menu)).toBe(false);
    });

    it('leaves no skin host behind when the editor is destroyed', () => {
      create('oxide-dark');
      editor.destroy();
      expect(document.querySelector('[data-dropdown-menu]')).toBeNull();
      expect(document.body.querySelector(':scope > .md-editor-oxide-dark')).toBeNull();
    });

    it('still opens a menu and closes it on a click outside', () => {
      create('oxide-dark');
      click('[data-dropdown="fontsize"] .md-toolbar-dropdown-btn');
      const menu = document.querySelector('[data-dropdown-menu="fontsize"]') as HTMLElement;
      expect(menu.style.display).toBe('block');

      // A click inside the menu keeps it open...
      menu.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(menu.style.display).toBe('block');

      // ...and one elsewhere closes it.
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(menu.style.display).toBe('none');
    });

    it("puts the table toolbar's own menus inside the skin", () => {
      create('oxide-dark', { table_toolbar: 'tablecellbackgroundcolor tablecellvalign' });
      editor.setContent(TABLE);
      const menus = document.querySelectorAll('.md-table-toolbar-menu');
      expect(menus.length).toBeGreaterThan(0);
      menus.forEach((menu) => expect(skinOf(menu)).toBe('md-editor-oxide-dark'));
    });
  });

  describe('dialogs opened from the toolbar', () => {
    it.each([
      ['emoticons', '.md-emoji-dialog'],
      ['charmap', '.md-charmap-dialog'],
      ['image', '.md-image-upload-dialog'],
      ['searchreplace', '.md-searchreplace-dialog'],
    ])('opens the %s dialog inside the skin', (button, dialog) => {
      create('confab-dark', { toolbar: button });
      click(`[data-button="${button}"]`);
      const el = document.querySelector(dialog);
      expect(el).not.toBeNull();
      expect(skinOf(el)).toBe('md-editor-confab-dark');
    });

    it('opens the speech to text dialog inside the skin', () => {
      const original = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = class {
        start(): void { /* no-op */ }
        stop(): void { /* no-op */ }
        abort(): void { /* no-op */ }
      };
      try {
        create('oxide-dark', { toolbar: 'speechtotext' });
        click('[data-button="speechtotext"]');
        expect(skinOf(document.querySelector('.md-speechtotext-dialog'))).toBe('md-editor-oxide-dark');
      } finally {
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = original;
      }
    });
  });
});
