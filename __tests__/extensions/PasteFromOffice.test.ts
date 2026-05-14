/**
 * PasteFromOffice Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Underline } from '@tiptap/extension-underline';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import {
  PasteFromOffice,
  isOfficeContent,
  transformOfficeHTML,
  cleanMsoStyles,
} from '../../src/extensions/PasteFromOffice';
import { FontSize } from '../../src/extensions/FontSize';
import { HTMLEditor } from '../../src/core/HTMLEditor';

// --- Test fixtures: Real Word paste HTML samples ---

const WORD_SIMPLE_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta name=Generator content="Microsoft Word 15">
<style>
@list l0:level1 { mso-level-number-format: bullet; }
@list l1:level1 { mso-level-number-format: decimal; }
</style>
</head>
<body lang=EN-US style='tab-interval:.5in;word-wrap:break-word'>
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
<p class=MsoNormal><b><span style='font-size:14.0pt;font-family:"Calibri",sans-serif;
color:#2E74B5'>Bold Heading</span></b></p>
<p class=MsoNormal><span style='font-size:11.0pt;font-family:"Calibri",sans-serif'>
Normal text with <i>italic</i> and <u>underline</u>.</span></p>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
</body>
</html>`;

const WORD_LIST_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<style>
@list l0:level1 { mso-level-number-format: bullet; }
@list l0:level2 { mso-level-number-format: bullet; }
@list l1:level1 { mso-level-number-format: decimal; }
</style>
</head>
<body>
<p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'>
<span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span>First bullet</p>
<p class=MsoListParagraphCxSpMiddle style='mso-list:l0 level2 lfo1'>
<span style='mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span>Nested bullet</p>
<p class=MsoListParagraphCxSpLast style='mso-list:l0 level1 lfo1'>
<span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span>Second bullet</p>
</body>
</html>`;

const WORD_ORDERED_LIST_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<style>
@list l1:level1 { mso-level-number-format: decimal; }
</style>
</head>
<body>
<p class=MsoListParagraph style='mso-list:l1 level1 lfo2'>
<span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span>First item</p>
<p class=MsoListParagraph style='mso-list:l1 level1 lfo2'>
<span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span>Second item</p>
</body>
</html>`;

const EXCEL_TABLE_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta name=ProgId content=Excel.Sheet>
<style>
.xl65 { mso-number-format: General; font-size: 11pt; color: black; font-weight: 700; }
.xl66 { mso-number-format: General; background: #FFC000; text-align: center; }
</style>
</head>
<body>
<table border=0 cellpadding=0 cellspacing=0 width=192 style='border-collapse:collapse;width:144pt'>
<col width=64 span=3 style='width:48pt'>
<tr height=20 style='height:15.0pt'>
  <td class=xl65 height=20 width=64 style='height:15.0pt;width:48pt' x:num>Name</td>
  <td class=xl65 width=64 style='width:48pt' x:str>Age</td>
  <td class=xl65 width=64 style='width:48pt'>City</td>
</tr>
<tr height=20 style='height:15.0pt'>
  <td class=xl66 height=20 style='height:15.0pt'>Alice</td>
  <td class=xl66 x:num="30">30</td>
  <td class=xl66 colspan=1>NYC</td>
</tr>
</table>
</body>
</html>`;

const NORMAL_HTML = `<p>This is <strong>normal</strong> HTML with <em>formatting</em>.</p>`;

const PLAIN_TEXT = `Just some plain text without any HTML.`;

const XSS_PAYLOAD_HTML = `
<html xmlns:o="urn:schemas-microsoft-com:office:office">
<body>
<p class=MsoNormal>Safe text</p>
<script>alert('xss')</script>
<p onclick="alert('xss')" class=MsoNormal>Click me</p>
<img src="javascript:alert('xss')">
<iframe src="https://evil.com"></iframe>
<a href="javascript:alert(1)">link</a>
<p class=MsoNormal><a href="file:///C:/Users/secret/doc.txt">local file</a></p>
</body>
</html>`;

// --- Detection tests ---

describe('PasteFromOffice', () => {
  describe('Detection', () => {
    it('should detect Word content', () => {
      expect(isOfficeContent(WORD_SIMPLE_HTML)).toBe(true);
      expect(isOfficeContent(WORD_LIST_HTML)).toBe(true);
    });

    it('should detect Excel content', () => {
      expect(isOfficeContent(EXCEL_TABLE_HTML)).toBe(true);
    });

    it('should not detect normal HTML', () => {
      expect(isOfficeContent(NORMAL_HTML)).toBe(false);
    });

    it('should not detect plain text', () => {
      expect(isOfficeContent(PLAIN_TEXT)).toBe(false);
    });

    it('should detect by class="Mso" pattern', () => {
      expect(isOfficeContent('<p class="MsoNormal">text</p>')).toBe(true);
    });

    it('should detect by mso- style pattern', () => {
      expect(isOfficeContent('<p style="mso-bidi-font-size:12pt">text</p>')).toBe(true);
    });
  });

  // --- cleanMsoStyles tests ---

  describe('cleanMsoStyles', () => {
    it('should remove mso-* properties', () => {
      const input = 'font-size: 12pt; mso-bidi-font-size: 10pt; color: red;';
      const result = cleanMsoStyles(input);
      expect(result).toContain('font-size: 12pt');
      expect(result).toContain('color: red');
      expect(result).not.toContain('mso-');
    });

    it('should return empty string if only mso properties', () => {
      const input = 'mso-bidi-font-size: 10pt; mso-ansi-language: EN;';
      expect(cleanMsoStyles(input)).toBe('');
    });

    it('should preserve standard CSS properties', () => {
      const input = 'font-family: Calibri; font-size: 14pt; color: #2E74B5; mso-themecolor: accent1;';
      const result = cleanMsoStyles(input);
      expect(result).toContain('font-family: Calibri');
      expect(result).toContain('font-size: 14pt');
      expect(result).toContain('color: #2E74B5');
      expect(result).not.toContain('mso-themecolor');
    });

    it('should handle empty input', () => {
      expect(cleanMsoStyles('')).toBe('');
    });
  });

  // --- Word HTML transformation tests ---

  describe('Word HTML Transformation', () => {
    it('should remove conditional comments', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('<!--[if');
      expect(result).not.toContain('<![endif]-->');
      expect(result).not.toContain('AllowPNG');
    });

    it('should remove Office namespace elements', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('<o:p>');
      expect(result).not.toContain('</o:p>');
      expect(result).not.toContain('<o:');
    });

    it('should remove xmlns attributes', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('xmlns:');
    });

    it('should remove MsoNormal class', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('MsoNormal');
    });

    it('should remove style blocks', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('<style>');
      expect(result).not.toContain('</style>');
    });

    it('should remove meta elements', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('<meta');
    });

    it('should preserve bold text', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).toContain('<b>');
      expect(result).toContain('Bold Heading');
    });

    it('should preserve italic text', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).toContain('<i>');
      expect(result).toContain('italic');
    });

    it('should preserve underline text', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).toContain('<u>');
      expect(result).toContain('underline');
    });

    it('should preserve font-size', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).toContain('font-size');
      expect(result).toContain('14.0pt');
    });

    it('should clean font-family (remove fallbacks)', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).toContain('font-family: Calibri');
      expect(result).not.toContain('sans-serif');
    });

    it('should preserve color', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).toContain('color');
      expect(result).toContain('#2E74B5');
    });

    it('should strip mso-* style properties', () => {
      const result = transformOfficeHTML(WORD_SIMPLE_HTML);
      expect(result).not.toContain('mso-');
    });
  });

  // --- Word list conversion tests ---

  describe('Word List Conversion', () => {
    it('should convert bullet list paragraphs to <ul>/<li>', () => {
      const result = transformOfficeHTML(WORD_LIST_HTML);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('First bullet');
      expect(result).toContain('Second bullet');
    });

    it('should handle nested list items', () => {
      const result = transformOfficeHTML(WORD_LIST_HTML);
      expect(result).toContain('Nested bullet');
      // Should have nested <ul> for level 2
      const ulCount = (result.match(/<ul>/g) || []).length;
      expect(ulCount).toBeGreaterThanOrEqual(2);
    });

    it('should convert ordered list paragraphs to <ol>/<li>', () => {
      const result = transformOfficeHTML(WORD_ORDERED_LIST_HTML);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
      expect(result).toContain('First item');
      expect(result).toContain('Second item');
    });

    it('should remove list marker spans', () => {
      const result = transformOfficeHTML(WORD_LIST_HTML);
      // Bullet characters and number markers should be gone
      expect(result).not.toContain('mso-list:Ignore');
      expect(result).not.toContain('mso-list: Ignore');
    });

    it('should not contain MsoListParagraph class after conversion', () => {
      const result = transformOfficeHTML(WORD_LIST_HTML);
      expect(result).not.toContain('MsoListParagraph');
    });
  });

  // --- Excel table tests ---

  describe('Excel Table Transformation', () => {
    it('should preserve table structure', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).toContain('<table');
      expect(result).toContain('<tr');
      expect(result).toContain('<td');
    });

    it('should preserve cell content', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('City');
      expect(result).toContain('Alice');
      expect(result).toContain('30');
      expect(result).toContain('NYC');
    });

    it('should remove Excel-specific attributes', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).not.toContain('x:num');
      expect(result).not.toContain('x:str');
    });

    it('should remove Excel MSO classes', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).not.toContain('xl65');
      expect(result).not.toContain('xl66');
    });

    it('should strip mso-number-format', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).not.toContain('mso-number-format');
    });

    it('should preserve colspan', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).toContain('colspan');
    });

    it('should remove meta ProgId', () => {
      const result = transformOfficeHTML(EXCEL_TABLE_HTML);
      expect(result).not.toContain('ProgId');
      expect(result).not.toContain('Excel.Sheet');
    });
  });

  // --- Security tests ---

  describe('Security', () => {
    it('should remove script tags', () => {
      const result = transformOfficeHTML(XSS_PAYLOAD_HTML);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('</script>');
      expect(result).not.toContain("alert('xss')");
    });

    it('should remove onclick and other event handlers', () => {
      const result = transformOfficeHTML(XSS_PAYLOAD_HTML);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: URLs from src', () => {
      const result = transformOfficeHTML(XSS_PAYLOAD_HTML);
      expect(result).not.toContain('javascript:');
    });

    it('should remove iframe elements', () => {
      const result = transformOfficeHTML(XSS_PAYLOAD_HTML);
      expect(result).not.toContain('<iframe');
    });

    it('should strip file:// URLs', () => {
      const result = transformOfficeHTML(XSS_PAYLOAD_HTML);
      expect(result).not.toContain('file:///');
    });

    it('should preserve safe text content', () => {
      const result = transformOfficeHTML(XSS_PAYLOAD_HTML);
      expect(result).toContain('Safe text');
    });
  });

  // --- Passthrough tests ---

  describe('Passthrough', () => {
    it('should not modify normal HTML', () => {
      const result = transformOfficeHTML(NORMAL_HTML);
      expect(result).toBe(NORMAL_HTML);
    });

    it('should not modify plain text', () => {
      const result = transformOfficeHTML(PLAIN_TEXT);
      expect(result).toBe(PLAIN_TEXT);
    });

    it('should not modify HTML without Office markers', () => {
      const html = '<p style="color: red;"><strong>Bold</strong> and <em>italic</em></p>';
      expect(transformOfficeHTML(html)).toBe(html);
    });
  });

  // --- TipTap Extension integration tests ---

  describe('TipTap Extension', () => {
    let editor: Editor;
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      editor?.destroy();
      element?.remove();
    });

    it('should have correct extension name', () => {
      editor = new Editor({
        element,
        extensions: [Document, Paragraph, Text, PasteFromOffice],
        content: '<p>Test</p>',
      });

      const ext = editor.extensionManager.extensions.find(
        (e) => e.name === 'pasteFromOffice'
      );
      expect(ext).toBeDefined();
      expect(ext?.name).toBe('pasteFromOffice');
    });

    it('should have default options', () => {
      editor = new Editor({
        element,
        extensions: [Document, Paragraph, Text, PasteFromOffice],
        content: '<p>Test</p>',
      });

      const ext = editor.extensionManager.extensions.find(
        (e) => e.name === 'pasteFromOffice'
      );
      expect(ext?.options.enabled).toBe(true);
    });

    it('should accept enabled: false option', () => {
      editor = new Editor({
        element,
        extensions: [
          Document,
          Paragraph,
          Text,
          PasteFromOffice.configure({ enabled: false }),
        ],
        content: '<p>Test</p>',
      });

      const ext = editor.extensionManager.extensions.find(
        (e) => e.name === 'pasteFromOffice'
      );
      expect(ext?.options.enabled).toBe(false);
    });
  });

  // --- HTMLEditor integration tests ---

  describe('HTMLEditor Integration', () => {
    let container: HTMLElement;
    let editor: HTMLEditor;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      editor?.destroy();
      container?.remove();
    });

    it('should include PasteFromOffice extension by default', () => {
      editor = new HTMLEditor(container);
      const tiptap = editor.getTipTap();
      const ext = tiptap?.extensionManager.extensions.find(
        (e) => e.name === 'pasteFromOffice'
      );
      expect(ext).toBeDefined();
    });

    it('should not include PasteFromOffice when paste_from_office is false', () => {
      editor = new HTMLEditor(container, { paste_from_office: false });
      const tiptap = editor.getTipTap();
      const ext = tiptap?.extensionManager.extensions.find(
        (e) => e.name === 'pasteFromOffice'
      );
      expect(ext).toBeUndefined();
    });

    it('should include PasteFromOffice when paste_from_office is true', () => {
      editor = new HTMLEditor(container, { paste_from_office: true });
      const tiptap = editor.getTipTap();
      const ext = tiptap?.extensionManager.extensions.find(
        (e) => e.name === 'pasteFromOffice'
      );
      expect(ext).toBeDefined();
    });
  });

  // --- Edge cases ---

  describe('Edge Cases', () => {
    it('should handle empty HTML string', () => {
      expect(transformOfficeHTML('')).toBe('');
    });

    it('should handle HTML with only conditional comments', () => {
      const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><!--[if gte mso 9]><xml></xml><![endif]--></body></html>';
      const result = transformOfficeHTML(html);
      expect(result).not.toContain('<!--[if');
    });

    it('should handle Word HTML with no lists', () => {
      const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><p class=MsoNormal>Simple paragraph</p></body></html>';
      const result = transformOfficeHTML(html);
      expect(result).toContain('Simple paragraph');
      expect(result).not.toContain('MsoNormal');
    });

    it('should handle Excel table with empty cells', () => {
      const html = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <body>
        <table><tr><td x:num>1</td><td></td><td x:str>text</td></tr></table>
        </body></html>`;
      const result = transformOfficeHTML(html);
      expect(result).toContain('<table>');
      expect(result).toContain('1');
      expect(result).toContain('text');
      expect(result).not.toContain('x:num');
      expect(result).not.toContain('x:str');
    });

    it('should handle deeply nested formatting spans', () => {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>
        <p class=MsoNormal><span><span><span style="font-size: 12pt">Deep text</span></span></span></p>
      </body></html>`;
      const result = transformOfficeHTML(html);
      expect(result).toContain('Deep text');
      expect(result).toContain('font-size: 12pt');
    });

    it('should preserve background-color for highlights', () => {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>
        <p class=MsoNormal><span style="background-color: yellow; mso-highlight: yellow">Highlighted</span></p>
      </body></html>`;
      const result = transformOfficeHTML(html);
      expect(result).toContain('background-color: yellow');
      expect(result).toContain('Highlighted');
      expect(result).not.toContain('mso-highlight');
    });

    it('should preserve text-align', () => {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>
        <p class=MsoNormal style="text-align: center; mso-layout-grid-align: none">Centered</p>
      </body></html>`;
      const result = transformOfficeHTML(html);
      expect(result).toContain('text-align: center');
      expect(result).toContain('Centered');
      expect(result).not.toContain('mso-layout-grid-align');
    });

    it('should preserve margin-left for indentation', () => {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>
        <p class=MsoNormal style="margin-left: 36pt; mso-add-space: auto">Indented</p>
      </body></html>`;
      const result = transformOfficeHTML(html);
      expect(result).toContain('margin-left: 36pt');
      expect(result).not.toContain('mso-add-space');
    });

    it('should preserve line-height', () => {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>
        <p class=MsoNormal style="line-height: 1.5; mso-line-height-rule: exactly">Spaced</p>
      </body></html>`;
      const result = transformOfficeHTML(html);
      expect(result).toContain('line-height: 1.5');
      expect(result).not.toContain('mso-line-height-rule');
    });
  });
});
