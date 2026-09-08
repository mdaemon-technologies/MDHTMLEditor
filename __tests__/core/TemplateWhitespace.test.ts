/**
 * Regression tests for importing a *pretty-printed* email template.
 *
 * A real stored template is not minified: newlines and tabs sit between its
 * block elements, including as direct children of `<ul>` (between `<ul>` and
 * `<li>`, and between `</li>` and `<li>`). That whitespace is insignificant per
 * the HTML spec — every browser, and CKEditor in MDaemon's legacy LookOut
 * theme, collapses it away.
 *
 * The importer must do the same. When whitespace is preserved instead,
 * ProseMirror cannot place a bare text node inside `bullet_list` (its content
 * expression is `list_item+`), so it wraps each whitespace run in a list_item of
 * its own: a 2-bullet list arrives as 4 bullets, and each inter-block newline
 * run becomes a spurious empty top-level block.
 *
 * The second concern here is `&nbsp;`: a block holding only a non-breaking
 * space is *visible* content, not a blank line, so the `format_empty_lines`
 * serializer must not give it a filler `<br>` (which doubles its height in a
 * sent message).
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

const FONT = 'font-family:arial, helvetica, sans-serif;font-size:12pt';

/**
 * Verbatim shape of a stored WorldClient template: blank lines between the
 * top-level blocks, tab-indented list markup, and an `&nbsp;`-only trailing
 * block (a deliberate blank line the author typed).
 */
const TEMPLATE =
  `<div style="${FONT}">Last Week</div>\n\n` +
  `<ul>\n\t<li>\n\t<div style="${FONT}">Completed the following</div>\n\t</li>\n` +
  `\t<li>\n\t<div style="${FONT}">Fixed the following</div>\n\t</li>\n</ul>\n\n` +
  `<div style="${FONT}">&nbsp;</div>\n`;

/** A compose body: one genuine blank line, then the signature container. */
const COMPOSE_BODY =
  '<div style="font-family:Georgia;font-size:10pt"><br></div>' +
  '<div id="signature"><div style="font-family:Georgia;font-size:11pt"><br></div></div>';

/** Literal tab or newline surviving into the document. */
const RAW_WHITESPACE = /[\t\n]/;

/** A filler `<br>` appended to a block whose only content is a non-breaking space. */
const NBSP_THEN_BR = /(?:&nbsp;| )\s*<br/;

describe('pretty-printed template import', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
    document.querySelectorAll('.md-dialog-overlay, .md-toolbar-dropdown-menu').forEach(el => el.remove());
  });

  function makeEditor(): HTMLEditor {
    return new HTMLEditor(container, {
      forced_root_block: 'div',
      format_empty_lines: true,
      fontName: 'Georgia',
      fontSize: '10pt',
      toolbar: 'bold',
    });
  }

  /** The two bullets survive as bullets, with nothing invented around them. */
  function expectCleanList(html: string): void {
    expect((html.match(/<li/g) ?? []).length).toBe(2);
    expect(html).toContain('Completed the following');
    expect(html).toContain('Fixed the following');
    // The editor surface is `white-space: pre-wrap`, so a surviving tab or
    // newline renders as a visible break rather than collapsing at display time.
    expect(html).not.toMatch(RAW_WHITESPACE);
  }

  it('imports through setContent with two list items and no whitespace artifacts', () => {
    editor = makeEditor();
    editor.setContent(TEMPLATE);

    const html = editor.getContent();
    expectCleanList(html);
    expect(html).toContain('&nbsp;');
    expect(html).not.toMatch(NBSP_THEN_BR);
  });

  it('imports through insertContent identically (the Templates dropdown path)', () => {
    editor = makeEditor();
    editor.setContent(COMPOSE_BODY);
    editor.insertContent(TEMPLATE);

    const html = editor.getContent();
    expectCleanList(html);
    expect(html).toContain('&nbsp;');
    expect(html).not.toMatch(NBSP_THEN_BR);
    // Exactly one blank line survives — the compose body's own leading one.
    // Any other <br> in the output would be a whitespace artifact.
    expect((html.match(/<br/g) ?? []).length).toBe(1);
  });

  it('inserts a pretty-printed template cleanly from the Templates dropdown', () => {
    editor = new HTMLEditor(container, {
      forced_root_block: 'div',
      toolbar: 'template',
      templates: [{ title: 'Pretty', content: TEMPLATE }],
    });
    editor.setContent('');

    // Dropdown menus render fixed-position on document.body, so the item is not
    // under `container` — find it by its label.
    container.querySelector<HTMLElement>('[data-dropdown="template"] .md-toolbar-dropdown-btn')?.click();
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('.md-toolbar-dropdown-item'),
    ).find(el => el.textContent?.startsWith('Pretty'));
    expect(item).toBeDefined();
    item!.click();

    expectCleanList(editor.getContent());
  });

  it('still collapses whitespace when format_empty_lines is off', () => {
    // The parse-time whitespace mode is a property of the importer, not of the
    // blank-line pass, so opting out of one must not re-enable the other's bug.
    editor = new HTMLEditor(container, {
      forced_root_block: 'div',
      format_empty_lines: false,
      toolbar: 'bold',
    });
    editor.setContent('<div>a</div>');
    editor.insertContent(TEMPLATE);

    expectCleanList(editor.getContent());
  });

  // The companion guard — that a <pre> keeps its internal whitespace despite the
  // document-level collapse — lives in __tests__/dist-umd.smoke.ts. It needs the
  // real CodeBlockLowlight extension (which declares `preserveWhitespace: 'full'`
  // on its own parse rule), and this suite maps that package to a stub with no
  // node in it, so a `<pre>` here would never reach a code block at all.
});
