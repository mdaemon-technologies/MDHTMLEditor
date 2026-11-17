/**
 * Format painter style Tests
 * Compiles editor.scss and checks the cursor that shows the painter is on:
 * the plugin puts md-format-painter on the editing root while it is.
 */

import { compileString } from 'sass';
import * as fs from 'fs';
import * as path from 'path';

const scssPath = path.resolve(__dirname, '../../src/styles/editor.scss');
const css = compileString(fs.readFileSync(scssPath, 'utf-8'), { loadPaths: [path.dirname(scssPath)] }).css;

const rules: Array<{ selectors: string[]; body: string }> = [];
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  rules.push({ selectors: match[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: match[2] });
}

function declarations(selector: string): string {
  return rules.filter((r) => r.selectors.includes(selector)).map((r) => r.body).join(';');
}

describe('Format painter styles', () => {
  // Over the text and every element in it, so links and images don't show their own cursor instead.
  it.each(['.md-editor-body.md-format-painter', '.md-editor-body.md-format-painter *'])(
    'shows the copy cursor on %s',
    (selector) => {
      expect(declarations(selector)).toMatch(/cursor:\s*copy/);
    },
  );

  it('uses no image for the cursor, which a Content Security Policy could block', () => {
    const painterRules = rules.filter((r) => r.selectors.some((s) => s.includes('md-format-painter')));
    expect(painterRules.length).toBeGreaterThan(0);
    for (const rule of painterRules) expect(rule.body).not.toMatch(/url\(/);
  });
});
