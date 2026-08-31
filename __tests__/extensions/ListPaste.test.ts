/**
 * List paste regression tests.
 *
 * Covers three reported defects:
 *  1. Pasting a numbered list added an extra indent level — Outlook/Word email
 *     HTML already contains a real <ol>, and the Word-list converter wrapped it
 *     in a second list (<ol><ol>…</ol></ol>), and Word's own
 *     margin-left/text-indent was copied onto every <li>.
 *  2. Decrease indent could not undo that indent (see BlockIndent tests).
 *  3. A pasted lettered list (A, B, C) came out numbered — the Word converter
 *     threw away `mso-level-number-format`, and non-Office HTML kept its `type`
 *     attribute but the editor stylesheet overrode it.
 */

import { transformOfficeHTML } from '../../src/extensions/PasteFromOffice';
import { normalizePastedLists } from '../../src/extensions/ListPasteNormalizer';
import { HTMLEditor } from '../../src/core/HTMLEditor';

/**
 * Outlook / Word email HTML: the list is ALREADY a real <ol>, and it is the
 * <li> elements that carry the MsoListParagraph class and the mso-list style.
 */
const OUTLOOK_REAL_OL_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word">
<head><style>
@list l0:level1 { mso-level-number-format: decimal; }
</style></head>
<body><div class=WordSection1>
<ol style='margin-top:0in' start=1 type=1>
<li class=MsoListParagraph style='margin-left:0in;mso-list:l0 level1 lfo1'>One</li>
<li class=MsoListParagraph style='margin-left:0in;mso-list:l0 level1 lfo1'>Two</li>
</ol>
</div></body></html>`;

const OUTLOOK_REAL_UL_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word">
<head><style>
@list l0:level1 { mso-level-number-format: bullet; }
</style></head>
<body><div class=WordSection1>
<ul style='margin-top:0in'>
<li class=MsoListParagraph style='margin-left:0in;mso-list:l0 level1 lfo1'>One</li>
<li class=MsoListParagraph style='margin-left:0in;mso-list:l0 level1 lfo1'>Two</li>
</ul>
</div></body></html>`;

/**
 * Build a Word "fake list" clipboard: paragraphs carrying `mso-list`, with the
 * marker inlined in a `mso-list:Ignore` span. Pass an empty `numberFormat` to
 * omit the `@list` rule entirely (a very common shape in real clipboards).
 */
function wordList(numberFormat: string, markers: string[], extraLevelRules = ''): string {
  const paragraphs = markers
    .map(
      (marker, i) =>
        `<p class=MsoListParagraph style='margin-left:.5in;mso-add-space:auto;text-indent:-.25in;mso-list:l1 level1 lfo2'>` +
        `<span style='mso-list:Ignore'>${marker}<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span>` +
        `Item ${i + 1}</p>`,
    )
    .join('\n');
  const rule = numberFormat
    ? `@list l1:level1 { mso-level-number-format: ${numberFormat}; ${extraLevelRules} }`
    : '';
  return `
<html xmlns:w="urn:schemas-microsoft-com:office:word">
<head><style>${rule}</style></head>
<body>${paragraphs}</body></html>`;
}

function withEditor(fn: (editor: HTMLEditor) => void): void {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const editor = new HTMLEditor(container);
  try {
    fn(editor);
  } finally {
    editor.destroy();
    container.remove();
  }
}

describe('Office lists that are already real <ol>/<ul>', () => {
  it('does not wrap an existing <ol> in a second list', () => {
    const result = transformOfficeHTML(OUTLOOK_REAL_OL_HTML);
    expect((result.match(/<ol/g) ?? []).length).toBe(1);
    expect(result).not.toMatch(/<ol[^>]*>\s*<ol/);
    expect(result).toContain('One');
    expect(result).toContain('Two');
    expect((result.match(/<li/g) ?? []).length).toBe(2);
  });

  it('does not wrap an existing <ul> in a second list', () => {
    const result = transformOfficeHTML(OUTLOOK_REAL_UL_HTML);
    expect((result.match(/<ul/g) ?? []).length).toBe(1);
    expect(result).not.toMatch(/<ul[^>]*>\s*<ul/);
    expect((result.match(/<li/g) ?? []).length).toBe(2);
  });

  it('still strips Office classes and mso-list styles from those items', () => {
    const result = transformOfficeHTML(OUTLOOK_REAL_OL_HTML);
    expect(result).not.toContain('MsoListParagraph');
    expect(result).not.toContain('mso-list');
  });

  it('imports as one flat list with no phantom empty item', () => {
    withEditor((editor) => {
      editor.setContent(transformOfficeHTML(OUTLOOK_REAL_OL_HTML));
      const html = editor.getContent();
      expect((html.match(/<ol/g) ?? []).length).toBe(1);
      expect((html.match(/<li>/g) ?? []).length).toBe(2);
      expect(html).not.toContain('<br>');
    });
  });
});

describe('Word list indentation is not carried into the editor', () => {
  it('drops margin-left / text-indent from converted list items', () => {
    const result = transformOfficeHTML(wordList('decimal', ['1.', '2.']));
    expect(result).toContain('<ol');
    expect(result).not.toContain('margin-left');
    expect(result).not.toContain('text-indent');
  });

  it('drops margin-left from list items left in place', () => {
    expect(transformOfficeHTML(OUTLOOK_REAL_OL_HTML)).not.toContain('margin-left');
  });

  it('keeps margin-left on ordinary (non-list) paragraphs', () => {
    const html =
      `<html xmlns:w="urn:schemas-microsoft-com:office:word"><body>` +
      `<p class=MsoNormal style="margin-left: 36pt">Indented</p></body></html>`;
    expect(transformOfficeHTML(html)).toContain('margin-left: 36pt');
  });
});

describe('Word ordered-list numbering style', () => {
  it.each([
    ['alpha-upper', ['A.', 'B.'], 'A'],
    ['alpha-lower', ['a.', 'b.'], 'a'],
    ['roman-upper', ['I.', 'II.'], 'I'],
    ['roman-lower', ['i.', 'ii.'], 'i'],
  ])('keeps a %s list in its own numbering style', (format, markers, type) => {
    const result = transformOfficeHTML(wordList(format as string, markers as string[]));
    expect(result).toMatch(new RegExp(`<ol[^>]*type="${type}"`));
  });

  it('leaves a decimal list without a type attribute', () => {
    const result = transformOfficeHTML(wordList('arabic', ['1.', '2.']));
    expect(result).toContain('<ol');
    expect(result).not.toContain('type=');
  });

  it('carries mso-level-start-at onto the start attribute', () => {
    const result = transformOfficeHTML(wordList('decimal', ['3.', '4.'], 'mso-level-start-at: 3;'));
    expect(result).toMatch(/<ol[^>]*start="3"/);
  });

  it('round-trips a lettered list through the editor', () => {
    withEditor((editor) => {
      editor.setContent(transformOfficeHTML(wordList('alpha-upper', ['A.', 'B.'])));
      expect(editor.getContent()).toMatch(/<ol[^>]*type="A"/);
    });
  });

  it('applies the numbering style per nesting level', () => {
    const html = `
<html xmlns:w="urn:schemas-microsoft-com:office:word">
<head><style>
@list l1:level1 { mso-level-number-format: decimal; }
@list l1:level2 { mso-level-number-format: alpha-upper; }
</style></head>
<body>
<p class=MsoListParagraph style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>1.</span>Top</p>
<p class=MsoListParagraph style='mso-list:l1 level2 lfo2'><span style='mso-list:Ignore'>A.</span>Nested</p>
</body></html>`;
    const result = transformOfficeHTML(html);
    expect(result).toMatch(/<ol[^>]*type="A"/);
    expect((result.match(/<ol/g) ?? []).length).toBe(2);
  });
});

describe('Word lists with no @list rules in the clipboard', () => {
  it('infers an ordered list from a numeric marker', () => {
    const result = transformOfficeHTML(wordList('', ['1.', '2.']));
    expect(result).toContain('<ol');
    expect(result).not.toContain('<ul');
  });

  it.each([
    [['A.', 'B.'], 'A'],
    [['a.', 'b.'], 'a'],
    [['I.', 'II.'], 'I'],
    [['i.', 'ii.'], 'i'],
  ])('infers the numbering style from the marker text %s', (markers, type) => {
    const result = transformOfficeHTML(wordList('', markers as string[]));
    expect(result).toMatch(new RegExp(`<ol[^>]*type="${type}"`));
  });

  it('infers an unordered list from a bullet marker', () => {
    const result = transformOfficeHTML(wordList('', ['·', '·']));
    expect(result).toContain('<ul');
    expect(result).not.toContain('<ol');
  });

  it('prefers the @list rule over the marker text when both are present', () => {
    expect(transformOfficeHTML(wordList('bullet', ['1.', '2.']))).toContain('<ul');
  });

  it('infers the start number from a numeric marker', () => {
    expect(transformOfficeHTML(wordList('', ['5.', '6.']))).toMatch(/<ol[^>]*start="5"/);
  });
});

describe('normalizePastedLists', () => {
  it('strips margin-left and padding-left from pasted lists', () => {
    const result = normalizePastedLists(
      '<ol style="margin-left:40px;padding-left:48px"><li>One</li></ol>',
    );
    expect(result).not.toContain('margin-left');
    expect(result).not.toContain('padding-left');
  });

  it('strips margin-left and text-indent from pasted list items', () => {
    const result = normalizePastedLists(
      '<ul><li style="margin-left:36pt;text-indent:-18pt;color:red">One</li></ul>',
    );
    expect(result).not.toContain('margin-left');
    expect(result).not.toContain('text-indent');
    // Non-indent styling on the item survives.
    expect(result).toContain('color');
  });

  it('drops the style attribute entirely when only indentation was set', () => {
    const result = normalizePastedLists('<ol style="margin-left:40px"><li>One</li></ol>');
    expect(result).not.toContain('style');
  });

  it('leaves indentation on non-list elements alone', () => {
    const html = '<p style="margin-left:40px">Indented</p><blockquote style="padding-left:1em">Q</blockquote>';
    const result = normalizePastedLists(html);
    expect(result).toContain('margin-left');
    expect(result).toContain('padding-left');
  });

  it('preserves structural nesting', () => {
    const result = normalizePastedLists(
      '<ol style="margin-left:40px"><li>One<ol style="margin-left:40px"><li>Nested</li></ol></li></ol>',
    );
    expect((result.match(/<ol/g) ?? []).length).toBe(2);
    expect(result).toContain('Nested');
  });

  it('preserves the ordered list type and start attributes', () => {
    const result = normalizePastedLists('<ol type="A" start="3" style="margin-left:40px"><li>One</li></ol>');
    expect(result).toContain('type="A"');
    expect(result).toContain('start="3"');
  });

  it('does not corrupt a value containing a semicolon', () => {
    const result = normalizePastedLists(
      '<ul><li style="margin-left:40px;background:url(data:image/gif;base64,R0lGOD)">One</li></ul>',
    );
    expect(result).toContain('url(data:image/gif;base64,R0lGOD)');
    expect(result).not.toContain('margin-left');
  });

  it('does not treat a quoted font name as a declaration boundary', () => {
    const result = normalizePastedLists(
      `<ul><li style="font-family:'Foo;Bar';margin-left:40px">One</li></ul>`,
    );
    expect(result).toContain('Foo;Bar');
    expect(result).not.toContain('margin-left');
  });

  it('leaves HTML with no lists untouched', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(normalizePastedLists(html)).toBe(html);
  });

  it('leaves a list with no indentation untouched', () => {
    const html = '<ol><li>One</li><li>Two</li></ol>';
    expect(normalizePastedLists(html)).toBe(html);
  });

  it('keeps list-style-type, which is where a lettered list states its style', () => {
    // A `list-style-type` in the style attribute is how TipTap derives `type`;
    // it must survive normalization so lettering is not lost.
    const result = normalizePastedLists('<ol style="list-style-type:upper-alpha;margin-left:40px"><li>One</li></ol>');
    expect(result).toContain('list-style-type');
    expect(result).not.toContain('margin-left');
  });
});

describe('pasted lists in the editor (end to end)', () => {
  it('keeps a lettered list lettered', () => {
    withEditor((editor) => {
      editor.getTipTap()!.view.pasteHTML('<ol type="A"><li>One</li><li>Two</li></ol>');
      expect(editor.getContent()).toMatch(/<ol[^>]*type="A"/);
    });
  });

  it('keeps a list styled with list-style-type lettered', () => {
    withEditor((editor) => {
      editor.getTipTap()!.view.pasteHTML(
        '<ol style="list-style-type:upper-alpha"><li>One</li><li>Two</li></ol>',
      );
      expect(editor.getContent()).toMatch(/<ol[^>]*type="A"/);
    });
  });

  it('does not indent a pasted list that carried a margin', () => {
    withEditor((editor) => {
      editor.getTipTap()!.view.pasteHTML(
        '<ol style="margin-left:40px"><li style="margin-left:40px;text-indent:-18px">One</li></ol>',
      );
      expect(editor.getContent()).not.toContain('margin-left');
    });
  });

  it('does not indent a pasted Google Docs list', () => {
    withEditor((editor) => {
      editor.getTipTap()!.view.pasteHTML(
        '<ol style="padding-inline-start:48px"><li style="margin-left:36pt"><p>One</p></li></ol>',
      );
      expect(editor.getContent()).not.toContain('margin-left');
    });
  });

  it('still indents a pasted paragraph that carried a margin', () => {
    withEditor((editor) => {
      // The first pasted block merges into the caret's own empty paragraph
      // (standard ProseMirror paste), so assert on the second one.
      editor.getTipTap()!.view.pasteHTML(
        '<p>First</p><p style="margin-left:40px">Indented</p>',
      );
      expect(editor.getContent()).toMatch(/<p[^>]*margin-left: 40px[^>]*>Indented/);
    });
  });

  it('imports an Outlook numbered list flat and un-indented', () => {
    withEditor((editor) => {
      editor.getTipTap()!.view.pasteHTML(OUTLOOK_REAL_OL_HTML);
      const html = editor.getContent();
      expect((html.match(/<ol/g) ?? []).length).toBe(1);
      expect((html.match(/<li>/g) ?? []).length).toBe(2);
      expect(html).not.toContain('margin-left');
    });
  });

  it('imports a Word lettered list lettered', () => {
    withEditor((editor) => {
      editor.getTipTap()!.view.pasteHTML(wordList('alpha-upper', ['A.', 'B.']));
      expect(editor.getContent()).toMatch(/<ol[^>]*type="A"/);
    });
  });
});
