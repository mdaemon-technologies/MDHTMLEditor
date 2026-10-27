/**
 * Table style Tests
 * Compiles editor.scss and checks the rules the table features depend on:
 * without them a cell selection and the column resize handle are invisible,
 * and the table menus, toolbar and dialogs have no layout.
 */

import { compileString } from 'sass';
import * as fs from 'fs';
import * as path from 'path';

const scssPath = path.resolve(__dirname, '../../src/styles/editor.scss');
const css = compileString(fs.readFileSync(scssPath, 'utf-8'), { loadPaths: [path.dirname(scssPath)] }).css;

/** The declarations of the first rule whose selector list matches `selector`. */
function rule(selector: RegExp): string {
  const match = new RegExp(`(?:^|\\})\\s*[^{}]*${selector.source}[^{}]*\\{([^}]*)\\}`, 'm').exec(css);
  return match ? match[1] : '';
}

describe('Table styles', () => {
  describe('in the editor', () => {
    it('highlights the cells of a cell selection', () => {
      const declarations = rule(/\.md-editor-body table \.selectedCell::after/);
      expect(declarations).toMatch(/content:\s*""/);
      expect(declarations).toMatch(/position:\s*absolute/);
      expect(declarations).toMatch(/background:\s*var\(--md-table-selection-color/);
      expect(declarations).toMatch(/pointer-events:\s*none/);
    });

    it('positions cells so the highlight and handle sit on them', () => {
      expect(rule(/\.md-editor-body table td,\s*\.md-editor-body table th/)).toMatch(/position:\s*relative/);
    });

    it('shows the column resize handle and its cursor', () => {
      const handle = rule(/\.md-editor-body table \.column-resize-handle/);
      expect(handle).toMatch(/position:\s*absolute/);
      expect(handle).toMatch(/width:\s*4px/);
      expect(handle).toMatch(/pointer-events:\s*none/);
      expect(rule(/\.md-editor-body\.resize-cursor/)).toMatch(/cursor:\s*col-resize/);
    });

    it('styles the caption', () => {
      expect(rule(/\.md-editor-body table caption/)).toMatch(/caption-side:\s*top/);
    });
  });

  describe('menus', () => {
    it('lets the submenus out of the table menu', () => {
      expect(css).toMatch(/\.md-table-menu\s*\{[^}]*overflow:\s*visible/);
      expect(rule(/\.md-table-submenu/)).toMatch(/position:\s*absolute/);
      expect(rule(/\.md-table-submenu/)).toMatch(/left:\s*100%/);
    });

    it('dims disabled items and lays out the size grid', () => {
      expect(rule(/\.md-toolbar-dropdown-item:disabled/)).toMatch(/opacity/);
      expect(rule(/\.md-table-grid-cells/)).toMatch(/grid-template-columns:\s*repeat\(10/);
      expect(rule(/\.md-table-grid-cell-active/)).toMatch(/background/);
    });

    it('marks a checked item', () => {
      expect(css).toMatch(/\.md-toolbar-dropdown-item\[aria-checked=["']?true["']?\]::before/);
    });
  });

  describe('table toolbar and dialogs', () => {
    it('floats the table toolbar', () => {
      expect(css).toMatch(/\.md-table-toolbar\s*\{[^}]*position:\s*fixed/);
      // Above the fullscreen editor (z-index 9999).
      expect(css).toMatch(/\.md-table-toolbar\s*\{[^}]*z-index:\s*10000/);
    });

    it("puts the table toolbar's menus above it, and flips a submenu that would run off screen", () => {
      expect(css).toMatch(/\.md-table-toolbar-menu\s*\{[^}]*z-index:\s*10001/);
      expect(css).toMatch(/\.md-table-submenu-left\s*\{[^}]*right:\s*100%/);
    });

    it('lays out the dialog tabs and fields, and shows an invalid field', () => {
      expect(css).toMatch(/\.md-table-dialog-tab\[aria-selected=["']?true["']?\]/);
      expect(css).toMatch(/\.md-table-dialog-panel\[hidden\]\s*\{[^}]*display:\s*none/);
      expect(css).toMatch(/\.md-table-dialog-input\[aria-invalid=["']?true["']?\]/);
    });

    it.each(['oxide-dark', 'confab', 'confab-dark'])('themes the table UI for the %s skin', (skin) => {
      expect(css).toMatch(new RegExp(`\\.md-editor-${skin} \\.md-table-toolbar`));
      expect(css).toMatch(new RegExp(`\\.md-editor-${skin} \\.md-table-submenu`));
      expect(css).toMatch(new RegExp(`\\.md-editor-${skin} \\.md-table-dialog-input`));
    });
  });
});
