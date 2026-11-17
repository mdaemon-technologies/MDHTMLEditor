/**
 * Toolbar row style Tests
 * Compiles editor.scss and checks the rules behind `||`: a row break that
 * starts a new line of buttons while the toolbar wraps, and a separator that
 * takes its place where the buttons are one line (narrow mode, which scrolls,
 * and the table toolbar, which does not wrap).
 */

import { compileString } from 'sass';
import * as fs from 'fs';
import * as path from 'path';

const scssPath = path.resolve(__dirname, '../../src/styles/editor.scss');
const css = compileString(fs.readFileSync(scssPath, 'utf-8'), { loadPaths: [path.dirname(scssPath)] }).css;

/** Every rule, in order: its selectors (whitespace normalized) and declarations. */
const rules: Array<{ selectors: string[]; body: string }> = [];
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  rules.push({ selectors: match[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: match[2] });
}

/** The declarations of every rule whose selector list includes `selector` exactly, joined. */
function declarations(selector: string): string {
  return rules.filter((r) => r.selectors.includes(selector)).map((r) => r.body).join(';');
}

describe('a toolbar button with a text label', () => {
  it('is as wide as its label, which stays on one line', () => {
    const rule = declarations('.md-toolbar-btn.md-toolbar-btn-labelled');
    expect(rule).toMatch(/width:\s*auto/);
    expect(rule).toMatch(/white-space:\s*nowrap/);
    expect(rule).toMatch(/padding:/);
  });
});

describe('Toolbar row styles', () => {
  it('makes the row break a full-width, zero-height item, so what follows starts a new line', () => {
    const body = declarations('.md-toolbar-row-break');
    expect(body).toMatch(/flex-basis:\s*100%/);
    expect(body).toMatch(/height:\s*0/);
  });

  it('hides the row separator while the toolbar wraps', () => {
    expect(declarations('.md-toolbar-row-separator')).toMatch(/display:\s*none/);
  });

  it.each(['.md-editor-narrow', '.md-table-toolbar'])('in %s, shows the separator instead of the break', (scope) => {
    expect(declarations(`${scope} .md-toolbar-row-break`)).toMatch(/display:\s*none/);
    expect(declarations(`${scope} .md-toolbar-row-separator`)).toMatch(/display:\s*block/);
  });
});
