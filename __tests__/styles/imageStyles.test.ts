/**
 * Image style Tests
 * Compiles editor.scss and checks the editing view of an image with spacing:
 * its float and margins sit on the image's wrapper (ImageResize), which takes
 * vertical margins only as an inline-block.
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

describe('Image styles', () => {
  it('makes a floated or spaced image wrapper an inline-block, so its vertical margins apply', () => {
    expect(declarations('.md-editor-body .md-image-styled')).toMatch(/display:\s*inline-block/);
  });
});
