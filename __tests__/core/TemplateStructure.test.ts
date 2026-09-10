/**
 * Regression tests for importing a *wrapped* email template with placeholder
 * links — the second half of the stored-template import problem (the first,
 * pretty-printed whitespace, is covered by TemplateWhitespace.test.ts).
 *
 * Real stored templates arrive from mail clients and CMSes swaddled in
 * container `<div>`s, and their anchors are frequently placeholders: the author
 * wrote the link text and left the target for later, or an upstream sanitizer
 * blanked it. CKEditor in MDaemon's legacy LookOut theme keeps both intact, and
 * it is the reference for what the import should produce.
 *
 * Two independent defects showed up here:
 *
 *  1. `<a href="">` was deleted outright — TipTap's link parse rule opens with
 *     `if (!href || !isAllowedUri(href)) return false`, so an empty href
 *     short-circuits to "not a link" before validation is ever consulted. The
 *     text survived; the anchor did not.
 *  2. Every container `<div>` became a stray blank line. A block cannot contain
 *     a block in the schema, so the ProseMirror parser opens a paragraph for the
 *     wrapper, closes it again to place the first block child, and leaves the
 *     wrapper behind as an empty paragraph — five nested wrappers, four blank
 *     lines above the template.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

/** A block with no content but the export filler `<br>`. */
const BLANK_LINE = /<div[^>]*>\s*<br>\s*<\/div>/g;

/**
 * Verbatim shape of the stored template that exposed both defects: five nested
 * wrapper divs, `&nbsp;`-only spacer lines, placeholder anchors both bare and
 * inside a `<span>`, and the run of unmatched closing tags the source carries
 * (which the HTML parser discards).
 */
const TEMPLATE =
  '<div><div><div><div>' +
  '<div>Lorem ipsum dolor sit amet,</div>' +
  '<div>\u00a0</div>' +
  '<div><span>Consectetur adipiscing elit at </span>' +
  '<a href="">https://example.com/elit</a>' +
  '<span> sed do eiusmod tempor.</span></div>' +
  '<div>\u00a0</div>' +
  '<div><span>Ut enim ad <a href="">lorem@example.com</a> minim veniam, ' +
  '<a href="">quis nostrud</a>.</span></div>' +
  '</div></div></div></div>' +
  '</a></a></div></div>';

/**
 * A full-length body in the exact shape the reported one had — five nested
 * wrappers, eight placeholder anchors (four of them inside a `<span>`), four
 * `&nbsp;` spacer lines, blank lines between the top-level blocks, and a run of
 * unmatched closing tags the HTML parser discards. Lorem ipsum stands in for
 * the reported body's own (private) text; only the structure matters here, and
 * it is the structure that was broken. Mirrored by template 8 in
 * test/test-main.ts.
 *
 * Kept at full length rather than reduced: several of these hazards only
 * interact at scale (an anchor inside a `<span>` inside a wrapper, a spacer
 * between two link-bearing lines), and the reduced TEMPLATE above already
 * covers the minimal case.
 */
const LONG_TEMPLATE = `<div>
<div>
<div>
<div>
<div>Lorem ipsum dolor sit amet,</div>

<div>&nbsp;</div>

<div>consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>

<div>&nbsp;</div>

<div><span>Duis aute irure dolor in reprehenderit in </span><a href="">https://example.com/voluptate</a><span> velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum, aut </span><a href="">https://example.com/laborum</a><span> perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. </span></div>

<div>&nbsp;</div>

<div><span>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, scribe ad <a href="">lorem@example.com</a> sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt, neque porro quisquam est <a href="">qui dolorem ipsum</a>.</span></div>

<div>&nbsp;</div>

<div>At vero eos et accusamus et iusto odio dignissimos ducimus (<a href="">qui blanditiis praesentium</a>). Voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint <a href="">occaecati cupiditate</a> non provident, similique sunt in culpa qui officia deserunt mollitia animi, <a href="">id est laborum</a>. Et harum quidem rerum facilis est et expedita distinctio, nam libero tempore <a href="">cum soluta nobis</a>.</div>
</div>
</div>
</div>
</div>
</a></a></a></a></div></div></a></a></span></div></div></span></a></span></a></span></div></div></div></div></div></div></div></div></div>`;

describe('A full-length wrapped body', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container, {
      forced_root_block: 'div',
      format_empty_lines: true,
    });
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  it.each([
    ['setContent', (html: string) => editor.setContent(html)],
    ['insertContent', (html: string) => editor.insertContent(html)],
  ])('imports intact via %s', (_label, load) => {
    load(LONG_TEMPLATE);
    const html = editor.getContent();

    // All eight links survive. Every one of them was deleted down to bare text
    // before the fix, silently stripping the links out of the mail the template
    // was used to send.
    expect(html.match(/<a /g)).toHaveLength(8);
    expect(html.match(/href=""/g)).toHaveLength(8);
    expect(html).toContain('>https://example.com/voluptate</a>');
    expect(html).toContain('>lorem@example.com</a>');
    expect(html).toContain('>cum soluta nobis</a>');

    // The five wrappers do not become five blank lines.
    expect(html).not.toMatch(/^<div[^>]*>\s*<br>/);
    expect(html.match(BLANK_LINE)).toBeNull();

    // The four &nbsp; spacers are content, and stay bare.
    expect(html.match(/&nbsp;/g)).toHaveLength(4);
    expect(html).not.toContain('&nbsp;<br>');

    // Nine lines: five of text, four spacers. No literal tabs or newlines from
    // the pretty-printed source survive into the text.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.body.children).toHaveLength(9);
    expect(doc.body.firstElementChild?.textContent).toBe('Lorem ipsum dolor sit amet,');
    expect(doc.body.textContent).not.toMatch(/[\t\n]/);
  });

  it('round-trips without drift', () => {
    editor.setContent(LONG_TEMPLATE);
    const once = editor.getContent();
    editor.setContent(once);
    expect(editor.getContent()).toBe(once);
  });
});

describe('Wrapped template with placeholder links', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container, {
      forced_root_block: 'div',
      format_empty_lines: true,
    });
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  describe('placeholder links survive', () => {
    it('keeps an <a href=""> as a link', () => {
      editor.setContent('<div><a href="">text</a></div>');
      expect(editor.getContent()).toContain('<a');
      expect(editor.getContent()).toContain('href=""');
    });

    it('keeps every placeholder link in the template, on both import paths', () => {
      editor.setContent(TEMPLATE);
      expect(editor.getContent().match(/<a /g)).toHaveLength(3);

      editor.setContent('<div><br></div>');
      editor.insertContent(TEMPLATE);
      expect(editor.getContent().match(/<a /g)).toHaveLength(3);
    });

    it('still refuses a javascript: target', () => {
      // The empty-href allowance must not become a hole in URI validation.
      editor.setContent('<div><a href="javascript:alert(1)">text</a></div>');
      const html = editor.getContent();
      expect(html).not.toContain('<a');
      expect(html).not.toContain('javascript:');
      expect(html).toContain('text');
    });

    it('still keeps the link kinds that already worked', () => {
      for (const href of ['#', 'https://example.com', 'mailto:a@b.com', '/docs/x.html']) {
        editor.setContent(`<div><a href="${href}">text</a></div>`);
        expect(editor.getContent()).toContain(`href="${href}"`);
      }
    });

    it('round-trips a placeholder link through getContent/setContent', () => {
      editor.setContent('<div><a href="">text</a></div>');
      const once = editor.getContent();
      editor.setContent(once);
      expect(editor.getContent()).toBe(once);
    });
  });

  describe('wrapper divs do not become blank lines', () => {
    it('imports the template with no leading blank lines', () => {
      editor.setContent(TEMPLATE);
      const html = editor.getContent();
      expect(html).not.toMatch(/^<div[^>]*>\s*<br>/);
      // The only blank-looking blocks left are the two &nbsp; spacers the
      // author typed, and those are content, not blank lines.
      expect(html.match(BLANK_LINE)).toBeNull();
      expect(html.match(/&nbsp;/g)).toHaveLength(2);
      expect(html).not.toContain('&nbsp;<br>');
    });

    it('produces exactly the five lines the template has', () => {
      editor.setContent(TEMPLATE);
      const doc = new DOMParser().parseFromString(editor.getContent(), 'text/html');
      expect(doc.body.children).toHaveLength(5);
      expect(doc.body.firstElementChild?.textContent).toBe('Lorem ipsum dolor sit amet,');
    });

    it('leaves the compose body its own leading blank line on insertContent', () => {
      // That blank line is legitimate — the user's cursor sits on it.
      editor.setContent('<div><br></div>');
      editor.insertContent(TEMPLATE);
      const html = editor.getContent();
      expect((html.match(BLANK_LINE) ?? []).length).toBeLessThanOrEqual(1);
    });

    it('carries a wrapper font down to the lines it wrapped', () => {
      // The LookOut shape — one font div around the whole body. The font used to
      // be stranded on the blank block the wrapper became, silently restyling
      // every real line to the editor default.
      editor.setContent(
        '<div style="font-family:Georgia;font-size:10pt"><div>A</div><div>B</div></div>',
      );
      const html = editor.getContent();
      expect(html.match(/font-family: Georgia/g)).toHaveLength(2);
      expect(html.match(/font-size: 10pt/g)).toHaveLength(2);
      expect(html.match(BLANK_LINE)).toBeNull();
    });

    it('keeps a genuine blank line', () => {
      editor.setContent('<div><br></div><div>A</div>');
      expect(editor.getContent().match(BLANK_LINE)).toHaveLength(1);
    });

    it('keeps the signature container intact', () => {
      editor.setContent('<div><div id="signature"><div>sig</div></div></div>');
      const html = editor.getContent();
      expect(html).toContain('id="signature"');
      expect(html).toContain('sig');
      expect(html).not.toMatch(/^<div[^>]*>\s*<br>/);
    });

    it('does not indent or duplicate a wrapped list', () => {
      editor.setContent('<div><ul><li>a</li><li>b</li></ul></div>');
      const html = editor.getContent();
      expect(html.match(/<li/g)).toHaveLength(2);
      expect(html.match(/<ul/g)).toHaveLength(1);
      expect(html).not.toMatch(/^<div[^>]*>\s*<br>/);
    });
  });
});
