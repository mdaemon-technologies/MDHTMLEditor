/**
 * TableAttributes Tests
 * The table, row and cell nodes keep their formatting through a parse/serialize
 * cycle, but only the allowlisted properties and values.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { columnResizingPluginKey } from '@tiptap/pm/tables';

/** getContent() with the block font styles on paragraphs left out. */
function html(editor: HTMLEditor): string {
  return editor.getContent().replace(/<p style="[^"]*">/g, '<p>');
}

describe('TableAttributes', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  const create = (config = {}) => {
    editor = new HTMLEditor(container, config);
    return editor;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
  });

  describe('table', () => {
    it('keeps the border, cellpadding and cellspacing attributes', () => {
      create().setContent('<table border="1" cellpadding="4" cellspacing="0"><tbody><tr><td>a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('border="1"');
      expect(out).toContain('cellpadding="4"');
      expect(out).toContain('cellspacing="0"');
    });

    it('drops a non-numeric border, cellpadding or cellspacing', () => {
      create().setContent('<table border="x" cellpadding="javascript:1" cellspacing="-2"><tbody><tr><td>a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).not.toContain('border=');
      expect(out).not.toContain('cellpadding');
      expect(out).not.toContain('cellspacing');
    });

    it('keeps the allowlisted style properties', () => {
      create().setContent(
        '<table style="width: 80%; border-collapse: collapse; background-color: #ffeeee; border-style: dashed; border-color: red; border-width: 2px; float: right"><tbody><tr><td>a</td></tr></tbody></table>'
      );
      const table = container.ownerDocument.createElement('div');
      table.innerHTML = html(editor);
      const style = (table.querySelector('table') as HTMLElement).style;
      expect(style.width).toBe('80%');
      expect(style.borderCollapse).toBe('collapse');
      expect(style.backgroundColor).toBe('rgb(255, 238, 238)');
      expect(style.borderStyle).toBe('dashed');
      expect(style.borderColor).toBe('red');
      expect(style.borderWidth).toBe('2px');
      expect(style.cssFloat).toBe('right');
    });

    it('keeps a centered table centered', () => {
      create().setContent('<table style="margin-left: auto; margin-right: auto"><tbody><tr><td>a</td></tr></tbody></table>');
      expect(html(editor)).toMatch(/margin-left: auto; margin-right: auto/);
    });

    it('drops style properties and values that are not allowlisted', () => {
      create().setContent(
        '<table style="position: fixed; z-index: 9999; background-image: url(https://example.test/x.png); width: calc(100% - 1px); color: red"><tbody><tr><td>a</td></tr></tbody></table>'
      );
      const out = html(editor);
      expect(out).not.toMatch(/position|z-index|url\(|calc|color: red/);
    });

    it('drops class, id, data-* and event handler attributes', () => {
      create().setContent('<table class="modal" id="main" data-bs-toggle="modal" onclick="alert(1)"><tbody><tr><td>a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).not.toMatch(/modal|id="main"|data-bs|onclick/);
    });

    it('reads the legacy width, bgcolor and align attributes as style', () => {
      create().setContent('<table width="600" bgcolor="#eeeeee" align="center"><tbody><tr><td>a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('width: 600px');
      expect(out).toMatch(/background-color: (#eeeeee|rgb\(238, 238, 238\))/);
      expect(out).toContain('margin-left: auto');
      expect(out).toContain('margin-right: auto');
    });

    it('reads a percentage width attribute', () => {
      create().setContent('<table width="100%"><tbody><tr><td>a</td></tr></tbody></table>');
      expect(html(editor)).toContain('width: 100%');
    });

    it('keeps the computed min-width beside a style without a width', () => {
      create().setContent('<table style="border-collapse: collapse"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('min-width: 50px');
      expect(out).toContain('border-collapse: collapse');
    });

    it('keeps the width of resized columns beside a background', () => {
      create().setContent(
        '<table style="background-color: yellow"><tbody><tr><td colwidth="100">a</td><td colwidth="150">b</td></tr></tbody></table>'
      );
      const out = html(editor);
      expect(out).toContain('width: 250px');
      expect(out).toContain('background-color: yellow');
    });

    it('lets a style width win over the computed one', () => {
      create().setContent('<table style="width: 100%"><tbody><tr><td colwidth="100">a</td></tr></tbody></table>');
      expect(html(editor)).toMatch(/<table [^>]*style="width: 100%;"/);
    });

    it('sanitizes a style set through the document JSON too', () => {
      create();
      editor.getTipTap()!.commands.setContent({
        type: 'doc',
        content: [{
          type: 'table',
          attrs: { style: 'background-image: url(javascript:alert(1)); background-color: red' },
          content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph' }] }] }],
        }],
      });
      const out = html(editor);
      expect(out).not.toContain('url(');
      expect(out).toContain('background-color: red');
    });
  });

  describe('caption', () => {
    it('keeps a caption as a caption, not as a row', () => {
      create().setContent('<table><caption>Quarterly results</caption><tbody><tr><td>a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('<caption>Quarterly results</caption>');
      expect(out.match(/<tr>/g)).toHaveLength(1);
      expect(out).not.toContain('<p>Quarterly results</p>');
    });

    it('writes the caption before the colgroup', () => {
      create().setContent('<table><caption>Cap</caption><tbody><tr><td>a</td></tr></tbody></table>');
      expect(html(editor)).toMatch(/<table[^>]*><caption>Cap<\/caption><colgroup>/);
    });

    it('keeps the caption as text, so markup in it is escaped', () => {
      create().setContent('<table><caption>a &lt;b&gt; <img src=x onerror=alert(1)></caption><tbody><tr><td>a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('<caption>a &lt;b&gt;</caption>');
      expect(out).not.toContain('onerror');
    });

    it('shows the caption in the editor without making it editable', () => {
      create().setContent('<table><caption>Shown</caption><tbody><tr><td>a</td></tr></tbody></table>');
      const caption = container.querySelector('.md-editor-body table caption') as HTMLElement;
      expect(caption).not.toBeNull();
      expect(caption.textContent).toBe('Shown');
      expect(caption.getAttribute('contenteditable')).toBe('false');
    });
  });

  describe('row', () => {
    it('keeps the allowlisted row style and the legacy bgcolor', () => {
      create().setContent(
        '<table><tbody><tr style="height: 40px; text-align: center; position: absolute"><td>a</td></tr><tr bgcolor="red"><td>b</td></tr></tbody></table>'
      );
      const out = html(editor);
      expect(out).toContain('<tr style="height: 40px; text-align: center;">');
      expect(out).toContain('<tr style="background-color: red;">');
      expect(out).not.toContain('position');
    });
  });

  describe('cell', () => {
    it('keeps the allowlisted cell style', () => {
      create().setContent(
        '<table><tbody><tr><td style="background-color: #ff0; vertical-align: top; height: 30px; border-style: solid; border-width: 1px; border-color: blue; font-size: 99px">a</td></tr></tbody></table>'
      );
      const out = html(editor);
      expect(out).toMatch(/background-color: (#ff0|rgb\(255, 255, 0\))/);
      expect(out).toContain('vertical-align: top');
      expect(out).toContain('height: 30px');
      expect(out).toContain('border-style: solid');
      expect(out).toContain('border-width: 1px');
      expect(out).toContain('border-color: blue');
      expect(out).not.toContain('font-size: 99px');
    });

    it('keeps text-align beside the cell style', () => {
      create().setContent('<table><tbody><tr><td style="text-align: center; background-color: red">a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('text-align: center');
      expect(out).toContain('background-color: red');
    });

    it('reads the legacy bgcolor and valign attributes', () => {
      create().setContent('<table><tbody><tr><td bgcolor="green" valign="bottom">a</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('background-color: green');
      expect(out).toContain('vertical-align: bottom');
    });

    it('reads a bgcolor written without its #, as browsers do', () => {
      create().setContent('<table><tbody><tr><td bgcolor="ffcc00">a</td><td bgcolor="0f0">b</td></tr></tbody></table>');
      const out = html(editor);
      expect(out).toMatch(/background-color: (#ffcc00|rgb\(255, 204, 0\))/);
      expect(out).toMatch(/background-color: (#0f0|rgb\(0, 255, 0\))/);
    });

    it('keeps a valid scope on a header cell and drops an invalid one', () => {
      create().setContent('<table><tbody><tr><th scope="col">a</th><th scope="javascript">b</th></tr></tbody></table>');
      const out = html(editor);
      expect(out).toContain('<th scope="col">');
      expect(out).not.toContain('scope="javascript"');
    });

    it('drops a background image from a cell', () => {
      create().setContent('<table><tbody><tr><td style="background: url(https://example.test/t.png) red">a</td></tr></tbody></table>');
      expect(html(editor)).not.toContain('url(');
    });
  });

  describe('editor view', () => {
    it('shows the table style and attributes in the editor', () => {
      create().setContent('<table border="2" style="background-color: red"><tbody><tr><td>a</td></tr></tbody></table>');
      const table = container.querySelector('.md-editor-body table') as HTMLTableElement;
      expect(table.getAttribute('border')).toBe('2');
      expect(table.style.backgroundColor).toBe('red');
    });

    it('shows a style width in the editor, not only in the output', () => {
      create().setContent('<table style="width: 300px"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>');
      expect((container.querySelector('.md-editor-body table') as HTMLTableElement).style.width).toBe('300px');
    });

    it('updates the editor view when the table attributes change', () => {
      create().setContent('<table><tbody><tr><td>a</td></tr></tbody></table>');
      const tiptap = editor.getTipTap()!;
      let tablePos = -1;
      tiptap.state.doc.descendants((node, pos) => {
        if (node.type.name === 'table') tablePos = pos;
      });
      const node = tiptap.state.doc.nodeAt(tablePos)!;
      tiptap.view.dispatch(tiptap.state.tr.setNodeMarkup(tablePos, null, { ...node.attrs, caption: 'Later', style: 'background-color: blue' }));
      const table = container.querySelector('.md-editor-body table') as HTMLTableElement;
      expect(table.querySelector('caption')?.textContent).toBe('Later');
      expect(table.style.backgroundColor).toBe('blue');
    });
  });

  describe('column resizing', () => {
    it('is available after a read-only editor is made editable', () => {
      create({ readonly: true });
      editor.setReadOnly(false);
      expect(columnResizingPluginKey.getState(editor.getTipTap()!.state)).toBeDefined();
    });
  });
});
