/**
 * Popup style Tests
 * Compiles editor.scss and checks the rules for the menus and dialogs added to
 * document.body: the baseline they get in place of the editor's own (they are
 * outside .md-editor), and the dark skins' rules for each of their controls,
 * without which a control keeps its light colors in a dark dialog.
 */

import { compileString } from 'sass';
import * as fs from 'fs';
import * as path from 'path';

const scssPath = path.resolve(__dirname, '../../src/styles/editor.scss');
const css = compileString(fs.readFileSync(scssPath, 'utf-8'), { loadPaths: [path.dirname(scssPath)] }).css;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every rule, in order: its selectors (whitespace normalized) and declarations. */
const rules: Array<{ selectors: string[]; body: string }> = [];
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  rules.push({ selectors: match[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: match[2] });
}

/** The declarations of every rule whose selector list includes `selector` exactly, joined. */
function declarations(selector: string): string {
  return rules.filter((r) => r.selectors.includes(selector)).map((r) => r.body).join(';');
}

/** The position of the last rule whose selector list includes `selector`, or -1. */
function lastRule(selector: string): number {
  return rules.map((r) => r.selectors.includes(selector)).lastIndexOf(true);
}

/** Whether both rules exist and `later` comes after `earlier`, so it wins at equal specificity. */
function after(later: string, earlier: string): boolean {
  const e = lastRule(earlier);
  return e >= 0 && lastRule(later) > e;
}

describe('Popup styles', () => {
  describe('baseline outside the editor', () => {
    it.each(['.md-dialog-overlay', '.md-toolbar-dropdown-menu', '.md-toolbar-colorpicker-menu'])(
      'gives %s the editor font',
      (selector) => {
        expect(declarations(selector)).toMatch(/font-family:/);
        expect(declarations(selector)).toMatch(/font-size:/);
      },
    );

    it('sizes the dialog contents by their border box, as inside the editor', () => {
      expect(declarations('.md-dialog-overlay *')).toMatch(/box-sizing:\s*border-box/);
    });
  });

  describe('anchor dialog', () => {
    it('lays out the name field like the link dialog', () => {
      const input = declarations('.md-anchor-dialog-input');
      expect(input).toMatch(/width:\s*100%/);
      expect(input).toMatch(/padding:/);
      expect(input).toMatch(/border:/);
      expect(input).toMatch(/background:\s*#fff/);
      expect(declarations('.md-anchor-dialog-footer')).toMatch(/justify-content:\s*flex-end/);
      expect(declarations('.md-anchor-dialog-error')).toMatch(/color:/);
    });
  });

  describe('Insert video dialog', () => {
    it('lays out its field like the link and anchor dialogs', () => {
      const input = declarations('.md-media-dialog-input');
      expect(input).toMatch(/width:\s*100%/);
      expect(input).toMatch(/padding:/);
      expect(input).toMatch(/border:/);
      expect(input).toMatch(/background:\s*#fff/);
      expect(declarations('.md-media-dialog-footer')).toMatch(/justify-content:\s*flex-end/);
      expect(declarations('.md-media-dialog-error')).toMatch(/color:/);
      expect(declarations('.md-media-dialog-hint')).toMatch(/color:/);
    });

    it('shows a disabled button as disabled (Insert, while the resolver works), with no hover', () => {
      const disabled = declarations('.md-btn:disabled');
      expect(disabled).toMatch(/opacity:/);
      expect(disabled).toMatch(/cursor:\s*default/);
      expect(disabled).toMatch(/pointer-events:\s*none/);
    });
  });

  describe('image dialog', () => {
    it('lays out its fields like the other dialogs', () => {
      const input = declarations('.md-image-dialog-input');
      expect(input).toMatch(/width:\s*100%/);
      expect(input).toMatch(/padding:/);
      expect(input).toMatch(/border:/);
      expect(input).toMatch(/background:\s*#fff/);
      expect(declarations('.md-image-dialog-footer')).toMatch(/justify-content:\s*flex-end/);
    });

    it('puts the size fields and their buttons on one line', () => {
      expect(declarations('.md-image-dialog-size')).toMatch(/display:\s*flex/);
    });

    it('hides the progress bar and the upload error until there is something to show', () => {
      expect(declarations('.md-image-dialog-progress[hidden]')).toMatch(/display:\s*none/);
      expect(declarations('.md-image-dialog-upload-error:empty')).toMatch(/display:\s*none/);
      expect(declarations('.md-image-dialog-preview-error[hidden]')).toMatch(/display:\s*none/);
    });

    it('marks the tab that is shown, and Constrain proportions while on', () => {
      expect(declarations('.md-image-dialog-tab[aria-selected=true]')).toMatch(/background:/);
      expect(declarations('.md-image-dialog-lock[aria-pressed=true]')).toMatch(/border-color:/);
    });

    it('lets the preview scroll rather than grow the dialog', () => {
      const preview = declarations('.md-image-dialog-preview');
      expect(preview).toMatch(/max-height:/);
      expect(preview).toMatch(/overflow:\s*auto/);
    });
  });

  describe('link dialog', () => {
    it("marks an address that can't be saved", () => {
      expect(declarations('.md-link-editor-input[aria-invalid=true]')).toMatch(/border-color:/);
      expect(after('.md-link-editor-input[aria-invalid=true]', '.md-link-editor-input')).toBe(true);
    });
  });

  describe.each(['oxide-dark', 'confab', 'confab-dark'])('the link dialog in the %s skin', (skin) => {
    it("keeps an address that can't be saved marked, after the skin's own field border", () => {
      const invalid = `.md-editor-${skin} .md-link-editor-input[aria-invalid=true]`;
      expect(declarations(invalid)).toMatch(/border-color:/);
      expect(after(invalid, `.md-editor-${skin} .md-link-editor-input`)).toBe(true);
    });
  });

  describe.each(['oxide-dark', 'confab', 'confab-dark'])('the image dialog in the %s skin', (skin) => {
    it("keeps a field that can't be saved marked, after the skin's own field border", () => {
      const invalid = `.md-editor-${skin} .md-image-dialog-input[aria-invalid=true]`;
      expect(declarations(invalid)).toMatch(/border-color:/);
      expect(after(invalid, `.md-editor-${skin} .md-image-dialog-input`)).toBe(true);
    });
  });

  describe.each(['oxide-dark', 'confab-dark'])('the %s skin', (skin) => {
    const scoped = (selector: string) => declarations(`.md-editor-${skin} ${selector}`);

    it.each([
      '.md-emoji-search-input',
      '.md-searchreplace-input',
      '.md-image-dialog-input',
      '.md-anchor-dialog-input',
      '.md-media-dialog-input',
    ])('darkens the %s field', (selector) => {
      const rules = scoped(selector);
      expect(rules).toMatch(/background:/);
      expect(rules).toMatch(/color:/);
      expect(rules).toMatch(/border-color:/);
    });

    it.each(['.md-emoji-tab', '.md-charmap-tab', '.md-charmap-char', '.md-image-dialog-tab', '.md-dialog-close'])(
      'gives %s a light text color and a dark hover',
      (selector) => {
        expect(scoped(selector)).toMatch(/color:/);
        expect(scoped(`${selector}:hover`)).toMatch(/background:/);
      },
    );

    it.each([
      ['.md-charmap-tab', '.md-charmap-tab-active'],
      ['.md-emoji-tab', '.md-emoji-tab-active'],
    ])('keeps the active %s marked', (tab, active) => {
      expect(scoped(`${tab}.${active.slice(1)}`)).toMatch(/border-color:/);
    });

    it.each([
      '.md-emoji-empty',
      '.md-charmap-preview-name',
      '.md-searchreplace-row label',
      '.md-searchreplace-count',
      '.md-image-dialog-row label',
      '.md-image-dialog-check label',
      '.md-image-dialog-progress-text',
      '.md-toolbar-dropdown-item-desc',
      '.md-media-dialog-hint',
      '.md-media-dialog-row label',
    ])('lightens the muted %s text', (selector) => {
      expect(scoped(selector)).toMatch(/color:/);
    });

    it('keeps the selected image dialog tab marked', () => {
      expect(scoped('.md-image-dialog-tab[aria-selected=true]')).toMatch(/border-color:/);
      expect(after(`.md-editor-${skin} .md-image-dialog-tab[aria-selected=true]`, `.md-editor-${skin} .md-image-dialog-tab:hover`)).toBe(true);
    });

    it.each(['.md-image-dialog-lock', '.md-image-dialog-reset'])('gives the image dialog %s button a light color and a dark hover', (selector) => {
      expect(scoped(selector)).toMatch(/color:/);
      expect(scoped(selector)).toMatch(/border-color:/);
      expect(scoped(`${selector}:hover`)).toMatch(/background:/);
    });

    it('keeps Constrain proportions marked while on, after its hover', () => {
      const pressed = '.md-image-dialog-lock[aria-pressed=true]';
      expect(scoped(pressed)).toMatch(/border-color:/);
      expect(after(`.md-editor-${skin} ${pressed}`, `.md-editor-${skin} .md-image-dialog-lock:hover`)).toBe(true);
    });

    it('darkens the image dialog preview, drop area and upload error', () => {
      expect(scoped('.md-image-dialog-preview')).toMatch(/background:/);
      expect(scoped('.md-image-dialog-preview')).toMatch(/border-color:/);
      expect(scoped('.md-image-dialog-preview-text')).toMatch(/color:/);
      expect(scoped('.md-image-dialog-dropzone')).toMatch(/border-color:/);
      expect(scoped('.md-image-dialog-upload-error')).toMatch(/color:/);
      expect(scoped('.md-image-dialog-preview-error')).toMatch(/color:/);
      expect(scoped('.md-image-dialog-progress-bar')).toMatch(/background:/);
    });

    it('darkens the dialog header', () => {
      expect(scoped('.md-dialog-header')).toMatch(/background:/);
    });

    it('lightens the Speech to Text status, and keeps it colored while listening', () => {
      expect(scoped('.md-speechtotext-status')).toMatch(/color:/);
      expect(scoped('.md-speechtotext-status.md-speechtotext-status-active')).toMatch(/color:/);
      expect(
        after(`.md-editor-${skin} .md-speechtotext-status.md-speechtotext-status-active`, `.md-editor-${skin} .md-speechtotext-status`),
      ).toBe(true);
    });

    it('lightens the anchor and video dialog errors to stay readable', () => {
      expect(scoped('.md-anchor-dialog-error')).toMatch(/color:/);
      expect(scoped('.md-media-dialog-error')).toMatch(/color:/);
    });

    it('gives the active emoji tab a plain fallback before its color-mix background', () => {
      const active = scoped('.md-emoji-tab.md-emoji-tab-active');
      const plain = active.search(/background:\s*rgba\(/);
      expect(plain).toBeGreaterThanOrEqual(0);
      const mixed = active.search(/background:\s*color-mix\(/);
      if (mixed >= 0) expect(mixed).toBeGreaterThan(plain);
    });
  });

  // The toolbar's menus now sit inside the skin, so each skin's item hover
  // (one class more specific than the base rules) must not undo the base
  // disabled and selected looks.
  describe.each(['oxide-dark', 'confab', 'confab-dark'])('dropdown items in the %s skin', (skin) => {
    const item = `.md-editor-${skin} .md-toolbar-dropdown-item`;

    it('keeps a disabled item transparent on hover', () => {
      expect(declarations(`${item}:disabled`)).toMatch(/background:\s*transparent/);
      expect(after(`${item}:disabled`, `${item}:hover`)).toBe(true);
    });

    it('keeps the selected item highlighted on hover', () => {
      expect(declarations(`${item}.md-toolbar-dropdown-item-selected`)).toMatch(/background:/);
      expect(after(`${item}.md-toolbar-dropdown-item-selected`, `${item}:hover`)).toBe(true);
    });
  });

  it('has no rules for class names nothing uses', () => {
    expect(css).not.toMatch(new RegExp(escape('.md-charmap-btn')));
  });
});
