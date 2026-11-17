/**
 * Cells pasted from a spreadsheet keep their formatting. Excel writes most of
 * a cell's formatting as class rules in a <style> block (`.xl65 { ... }`), not
 * on the cell, so PasteFromOffice writes those rules onto the cells before the
 * classes and the <style> block are dropped. The pastes are dispatched as real
 * ClipboardEvents, so the HTML goes through the editor's whole paste path.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { transformOfficeHTML } from '../../src/extensions/PasteFromOffice';

/** Excel's clipboard HTML, trimmed to what matters but in Excel's own form. */
const EXCEL_HTML = `<html xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv=Content-Type content="text/html; charset=utf-8">
<meta name=ProgId content=Excel.Sheet>
<meta name=Generator content="Microsoft Excel 15">
<style>
<!--table
	{mso-displayed-decimal-separator:"\\.";
	mso-displayed-thousand-separator:"\\,";}
@page
	{margin:.75in .7in .75in .7in;
	mso-header-margin:.3in;
	mso-footer-margin:.3in;}
tr
	{mso-height-source:auto;}
col
	{mso-width-source:auto;}
br
	{mso-data-placement:same-cell;}
td
	{padding-top:1px;
	padding-right:1px;
	padding-left:1px;
	mso-ignore:padding;
	color:black;
	font-size:11.0pt;
	font-weight:400;
	font-style:normal;
	text-decoration:none;
	font-family:Calibri, sans-serif;
	mso-font-charset:0;
	mso-number-format:General;
	text-align:general;
	vertical-align:bottom;
	border:none;
	mso-background-source:auto;
	mso-pattern:auto;
	mso-protection:locked visible;
	white-space:nowrap;
	mso-rotate:0;}
.xl65
	{font-weight:700;
	font-family:Calibri, sans-serif;
	mso-font-charset:0;
	text-align:center;
	border:.5pt solid windowtext;
	background:#92D050;
	mso-pattern:black none;}
.xl66
	{color:white;
	font-style:italic;
	text-decoration:underline;
	text-underline-style:single;
	border:.5pt solid windowtext;
	background:#0070C0;
	mso-pattern:black none;}
.xl67
	{color:windowtext;
	border:.5pt solid windowtext;}
.font5
	{color:#FF0000;
	font-size:11.0pt;
	font-weight:700;
	font-style:normal;
	text-decoration:none;
	font-family:Calibri, sans-serif;
	mso-font-charset:0;}
-->
</style>
</head>
<body link="#0563C1" vlink="#954F72">
<table border=0 cellpadding=0 cellspacing=0 width=128 style='border-collapse:collapse;width:96pt'>
<!--StartFragment-->
 <col width=64 span=2 style='width:48pt'>
 <tr height=20 style='height:15.0pt'>
  <td height=20 class=xl65 width=64 style='height:15.0pt;width:48pt'>Name</td>
  <td class=xl65 width=64 style='border-left:none;width:48pt'>Total</td>
 </tr>
 <tr height=20 style='height:15.0pt'>
  <td height=20 class=xl66 style='height:15.0pt;border-top:none'>Widgets</td>
  <td class=xl67 align=right style='border-top:none;border-left:none'>42</td>
 </tr>
 <tr height=20 style='height:15.0pt'>
  <td height=20 class=xl67 style='height:15.0pt;border-top:none'>Amount <font class="font5">due</font></td>
  <td class=xl67 align=right style='border-top:none;border-left:none;background:yellow'>7</td>
 </tr>
<!--EndFragment-->
</table>
</body>
</html>`;

/** A DataTransfer good enough for the paste path. */
function clipboard(data: Record<string, string>): DataTransfer {
  return {
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? '',
    files: [],
    items: [],
  } as unknown as DataTransfer;
}

describe('Pasting cells from Excel', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;
  /** The pasted table's cells, read back from getContent(). */
  let cells: HTMLTableCellElement[];

  /** The pasted text `text`, as an element: the innermost one holding it. */
  const textElement = (text: string): HTMLElement => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('#pasted *'));
    const found = all.filter((el) => el.textContent?.includes(text)).pop();
    if (!found) throw new Error(`no element holds "${text}"`);
    return found;
  };

  /** The value of a style property on `el` or the nearest element above it that sets it. */
  const inherited = (el: HTMLElement, property: string): string => {
    for (let node: HTMLElement | null = el; node && node.id !== 'pasted'; node = node.parentElement) {
      const value = node.style.getPropertyValue(property);
      if (value) return value;
    }
    return '';
  };

  const isBold = (el: HTMLElement): boolean => !!el.closest('strong, b');

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
    editor.getTipTap()!.view.dom.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: clipboard({ 'text/html': EXCEL_HTML, 'text/plain': 'Name\tTotal\r\nWidgets\t42\r\nAmount due\t7\r\n' }),
        bubbles: true,
        cancelable: true,
      } as ClipboardEventInit),
    );
    const pasted = document.createElement('div');
    pasted.id = 'pasted';
    pasted.innerHTML = editor.getContent();
    document.body.appendChild(pasted);
    cells = Array.from(pasted.querySelectorAll('td, th'));
  });

  afterEach(() => {
    document.getElementById('pasted')?.remove();
    editor.destroy();
    container.remove();
  });

  it('pastes one table of six cells', () => {
    expect(document.querySelectorAll('#pasted table')).toHaveLength(1);
    expect(cells.map((cell) => cell.textContent)).toEqual(['Name', 'Total', 'Widgets', '42', 'Amount due', '7']);
  });

  it("gives each cell the fill of its class, or its own", () => {
    expect(cells[0].style.backgroundColor).toBe('rgb(146, 208, 80)');
    expect(cells[1].style.backgroundColor).toBe('rgb(146, 208, 80)');
    expect(cells[2].style.backgroundColor).toBe('rgb(0, 112, 192)');
    expect(cells[3].style.backgroundColor).toBe('');
    expect(cells[5].style.backgroundColor).toBe('yellow');
  });

  it('gives each cell the borders of its class, less the sides the cell turns off', () => {
    // A side with no style has no border, as a side styled `none` has (jsdom
    // reads `none` as no style at all).
    const sides = (cell: HTMLTableCellElement) =>
      ['top', 'right', 'bottom', 'left'].map((side) => cell.style.getPropertyValue(`border-${side}-style`) || 'none');

    expect(sides(cells[0])).toEqual(['solid', 'solid', 'solid', 'solid']);
    expect(cells[0].style.getPropertyValue('border-top-width')).toBe('0.5pt');
    expect(sides(cells[1])).toEqual(['solid', 'solid', 'solid', 'none']);
    expect(sides(cells[3])).toEqual(['none', 'solid', 'solid', 'none']);
  });

  it("draws Excel's automatic border color as black", () => {
    expect(cells[0].style.getPropertyValue('border-top-color')).toBe('black');
    expect(cells[0].getAttribute('style')).not.toContain('windowtext');
  });

  it('keeps the alignment of a class, and of the cell itself', () => {
    expect(cells[0].style.textAlign).toBe('center');
    expect(cells[3].style.textAlign).toBe('right');
  });

  it('keeps bold, italic and underline from the class', () => {
    expect(isBold(textElement('Name'))).toBe(true);
    expect(isBold(textElement('Widgets'))).toBe(false);
    expect(textElement('Widgets').closest('em, i')).not.toBeNull();
    expect(textElement('Widgets').closest('u')).not.toBeNull();
  });

  it("keeps a class's text color", () => {
    expect(inherited(textElement('Widgets'), 'color')).toBe('white');
  });

  it("leaves Excel's automatic text color to the editor", () => {
    expect(inherited(textElement('Name'), 'color')).toBe('');
    expect(inherited(textElement('42'), 'color')).toBe('');
  });

  it("keeps the sheet's font and size", () => {
    expect(inherited(textElement('Name'), 'font-family')).toBe('Calibri');
    expect(inherited(textElement('Name'), 'font-size')).toBe('11pt');
  });

  it('keeps the formatting of a run of text within a cell', () => {
    const due = textElement('due');
    expect(due.textContent).toBe('due');
    expect(inherited(due, 'color')).toBe('rgb(255, 0, 0)');
    expect(isBold(due)).toBe(true);
    expect(isBold(textElement('Amount'))).toBe(false);
  });

  it("leaves none of Excel's classes, <font> elements or mso- properties", () => {
    const html = editor.getContent();
    expect(html).not.toMatch(/class="?(xl|font)\d/);
    expect(html).not.toContain('<font');
    expect(html).not.toContain('mso-');
  });
});

describe('Pasting Excel cells with struck-through text', () => {
  it('keeps the strikethrough', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new HTMLEditor(container);
    try {
      const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=ProgId content=Excel.Sheet><style>
.xl68 { text-decoration:line-through; }
</style></head><body><table><tr><td class=xl68>Gone</td><td>Kept</td></tr></table></body></html>`;
      editor.getTipTap()!.view.dom.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: clipboard({ 'text/html': html, 'text/plain': 'Gone\tKept' }),
          bubbles: true,
          cancelable: true,
        } as ClipboardEventInit),
      );

      expect(editor.getContent()).toMatch(/<s>Gone<\/s>/);
      expect(editor.getContent()).not.toMatch(/<s>Kept/);
    } finally {
      editor.destroy();
      container.remove();
    }
  });
});

describe('transformOfficeHTML and class rules', () => {
  it("doesn't write Word's class rules onto its paragraphs", () => {
    const word = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"><head><style>
p.MsoNormal { color: red; font-family: "Times New Roman"; }
</style></head><body><p class=MsoNormal>Text</p></body></html>`;

    const result = transformOfficeHTML(word);

    expect(result).not.toContain('red');
    expect(result).not.toContain('Times New Roman');
  });

  it('ignores rules it cannot read, and selectors other than an element or a class', () => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=ProgId content=Excel.Sheet><style>
<!--
@font-face { font-family: X; }
table td.xl70 { color: red; }
#cell, .xl70 > b { color: blue; }
.xl70 { background: #FFFF00 }
/* a comment { color: green } */
.xl71 { color: green
-->
</style></head><body><table><tr><td class="xl70 xl71">A</td></tr></table></body></html>`;

    const result = transformOfficeHTML(html);

    expect(result).not.toMatch(/red|blue|green/);
    expect(result).toMatch(/background(-color)?: (#ffff00|rgb\(255, 255, 0\))/i);
  });

  it('reads a rule that follows an at-rule with no block', () => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=ProgId content=Excel.Sheet><style>
@charset "utf-8";
.xl70 { background: #FFFF00; }
</style></head><body><table><tr><td class=xl70>A</td></tr></table></body></html>`;

    expect(transformOfficeHTML(html)).toMatch(/background-color: (#ffff00|rgb\(255, 255, 0\))/i);
  });

  it("draws Excel's own border styles as the nearest CSS ones", () => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=ProgId content=Excel.Sheet><style>
.xl70 { border: .5pt hairline windowtext; }
.xl71 { border-bottom: .5pt dot-dot-dash windowtext; }
.xl72 { border-top: 1.0pt slant-dash-dot windowtext; border-left: .5pt dot-dash windowtext; }
</style></head><body><table><tr><td class=xl70>A</td><td class=xl71>B</td><td class=xl72>C</td></tr></table></body></html>`;
    const cells = new DOMParser().parseFromString(transformOfficeHTML(html), 'text/html').querySelectorAll('td');

    expect(cells[0].style.borderTopStyle).toBe('solid');
    expect(cells[0].style.borderLeftStyle).toBe('solid');
    expect(cells[1].style.borderBottomStyle).toBe('dashed');
    expect(cells[2].style.borderTopStyle).toBe('dashed');
    expect(cells[2].style.borderLeftStyle).toBe('dashed');
  });

  it("takes the sheet's font from its first declaration, and maps border styles only in borders", () => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=ProgId content=Excel.Sheet><style>
td { font-family: "Hairline Sans", sans-serif; font-size: 10.0pt; }
</style></head><body><table><tr><td>A</td></tr></table></body></html>`;

    expect(transformOfficeHTML(html)).toMatch(/font-family: "?Hairline Sans"?/);
  });

  it('lets a script-free style through only: no url() reaches a cell', () => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=ProgId content=Excel.Sheet><style>
.xl70 { background: url(https://example.com/x.png); color: red; }
</style></head><body><table><tr><td class=xl70>A</td></tr></table></body></html>`;

    expect(transformOfficeHTML(html)).not.toContain('url(');
  });
});
