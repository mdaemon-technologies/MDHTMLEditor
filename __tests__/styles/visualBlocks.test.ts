/**
 * Show blocks style Tests
 * Compiles editor.scss and checks the rules behind Show blocks: while the
 * wrapper has md-editor-visualblocks, each block gets a dashed outline and a
 * label with its tag name, in colors each skin can set.
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

const scope = '.md-editor-visualblocks .md-editor-body';
const DIV = 'div:not(.tableWrapper):not(.ProseMirror-widget)';

/** The selectors of every Show blocks rule, without their pseudo-elements. */
const showBlocksSelectors = rules
  .flatMap((r) => r.selectors)
  .filter((s) => s.startsWith(scope))
  .map((s) => s.replace(/::before$/, ''));

/** Each outlined block, as the selector the rules use, and the label it gets. */
const BLOCKS: Array<[string, string]> = [
  ['p', 'P'],
  ['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3'], ['h4', 'H4'], ['h5', 'H5'], ['h6', 'H6'],
  ['blockquote', 'BLOCKQUOTE'],
  ['ul', 'UL'],
  ['ol', 'OL'],
  ['pre', 'PRE'],
  [DIV, 'DIV'],
  // The table view wraps every table in div.tableWrapper; it carries the table's outline.
  ['.tableWrapper', 'TABLE'],
];

describe('Show blocks styles', () => {
  it.each(BLOCKS)('outlines %s and labels it %s', (block, label) => {
    const box = declarations(`${scope} ${block}`);
    expect(box).toMatch(/outline:\s*1px dashed var\(--md-visualblocks-color,\s*#[0-9a-f]+\)/i);
    // The label is positioned against the block, in room the block makes above its text.
    expect(box).toMatch(/position:\s*relative/);
    // !important: a block's own inline padding (a quoted reply often has
    // padding: 0 0 0 4pt) would otherwise take the room away, and the label
    // would sit on its first child's label.
    expect(box).toMatch(/padding-top:\s*\d+px\s*!important/);

    // The label fits in that room, so it never covers the first line of text.
    const room = Number(/padding-top:\s*(\d+)px/.exec(box)![1]);
    const labelRule = declarations(`${scope} ${block}::before`);
    const top = Number(/(?:^|;)\s*top:\s*(\d+)px/.exec(labelRule)![1]);
    const lineHeight = Number(/font:\s*\d+px\/(\d+)px/.exec(labelRule)![1]);
    expect(top + lineHeight).toBeLessThanOrEqual(room);

    const before = declarations(`${scope} ${block}::before`);
    expect(before).toContain(`content: "${label}"`);
    expect(before).toMatch(/position:\s*absolute/);
    expect(before).toMatch(/inset-inline-start:\s*0/);
    expect(before).toMatch(/color:\s*var\(--md-visualblocks-label-color,\s*#[0-9a-f]+\)/i);
    expect(before).toMatch(/pointer-events:\s*none/);
    expect(before).toMatch(/user-select:\s*none/);
  });

  it('leaves table cells, list items and the gap cursor alone', () => {
    for (const selector of ['td', 'th', 'li', '.ProseMirror-gapcursor', 'div']) {
      expect(declarations(`${scope} ${selector}`)).toBe('');
    }
  });

  describe('in an editor', () => {
    let wrapper: HTMLElement;
    const element = (selector: string) => wrapper.querySelector(selector)!;
    const outlined = (el: Element) => showBlocksSelectors.some((s) => el.matches(s));

    beforeEach(() => {
      // The shape the editor renders: ProseMirror marks each widget decoration
      // (the gap cursor, a table's column-resize handle) with ProseMirror-widget.
      wrapper = document.createElement('div');
      wrapper.className = 'md-editor md-editor-visualblocks';
      wrapper.innerHTML =
        '<div class="md-editor-body">' +
        '<p>Text</p>' +
        '<div class="tableWrapper"><table><tbody><tr><td><p>Cell</p>' +
        '<div class="column-resize-handle ProseMirror-widget" contenteditable="false"></div>' +
        '</td></tr></tbody></table></div>' +
        '<div class="ProseMirror-gapcursor ProseMirror-widget" contenteditable="false"></div>' +
        '<div id="signature"><p>Sig</p></div>' +
        '</div>';
      document.body.appendChild(wrapper);
    });

    afterEach(() => wrapper.remove());

    it('outlines content blocks', () => {
      expect(outlined(element('p'))).toBe(true);
      expect(outlined(element('.tableWrapper'))).toBe(true);
      expect(outlined(element('#signature'))).toBe(true);
    });

    it("leaves ProseMirror's widgets alone, such as a table's column-resize handle", () => {
      expect(outlined(element('.column-resize-handle'))).toBe(false);
      expect(outlined(element('.ProseMirror-gapcursor'))).toBe(false);
    });
  });

  it('draws nothing while Show blocks is off', () => {
    const outside = rules.filter((r) =>
      /--md-visualblocks-(label-)?color/.test(r.body) && /outline|content/.test(r.body)
      && r.selectors.some((s) => !s.startsWith(scope)));
    expect(outside).toEqual([]);
  });

  it.each(['.md-editor-oxide-dark', '.md-editor-confab', '.md-editor-confab-dark'])(
    'sets the outline and label colors for %s',
    (skin) => {
      const body = declarations(`${skin} .md-editor-body`);
      expect(body).toMatch(/--md-visualblocks-color:/);
      expect(body).toMatch(/--md-visualblocks-label-color:/);
    },
  );
});
