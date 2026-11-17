/**
 * FormatPainter Extension Tests
 * Copies the inline formatting at one place and paints it onto another, as
 * TinyMCE's Format Painter (mceToggleFormatPainter, mceRetrieveFormats,
 * mcePaintFormats) and CKEditor's Copy Formatting do. Run through HTMLEditor,
 * so the painter works against the schema the editor really builds.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { isFormatPainterActive } from '../../src/extensions/FormatPainter';
import { NodeSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

/** Let a setTimeout(0) the painter queued run. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('FormatPainter', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
  });

  const tiptap = () => editor.getTipTap()!;

  /** getContent() without the default font style every paragraph carries (see BlockFontStyle). */
  const DEFAULT_BLOCK_STYLE = ' style="font-family: arial, helvetica, sans-serif; font-size: 12pt;"';
  const html = () => editor.getContent().split(DEFAULT_BLOCK_STYLE).join('');

  /** The marks on the text node holding `text`, comparable between two texts: unset attributes (null or '') left out. */
  const marksOf = (text: string) =>
    tiptap().state.doc.nodeAt(rangeOf(text).from)!.marks
      .map((mark) => {
        const set = Object.entries(mark.attrs).filter(([, value]) => value !== null && value !== '');
        return `${mark.type.name} ${JSON.stringify(Object.fromEntries(set))}`;
      })
      .sort();

  /** The document range of the first occurrence of `text` (within one text node). */
  function rangeOf(text: string): { from: number; to: number } {
    let found: { from: number; to: number } | null = null;
    tiptap().state.doc.descendants((node, pos) => {
      if (found || !node.isText) return !found;
      const index = node.text!.indexOf(text);
      if (index >= 0) found = { from: pos + index, to: pos + index + text.length };
      return false;
    });
    if (!found) throw new Error(`"${text}" not found`);
    return found;
  }

  function select(text: string): void {
    tiptap().commands.setTextSelection(rangeOf(text));
  }

  /** Put the caret inside `text`, `offset` characters from its start. */
  function caretIn(text: string, offset = 1): void {
    tiptap().commands.setTextSelection(rangeOf(text).from + offset);
  }

  function copyFrom(text: string): void {
    select(text);
    expect(editor.execCommand('mceRetrieveFormats')).toBe(true);
  }

  function paintOnto(text: string): void {
    select(text);
    expect(editor.execCommand('mcePaintFormats')).toBe(true);
  }

  /** A mouse selection in the editor, as the painter sees one: mousedown, the selection, mouseup. */
  async function mouseSelect(text: string): Promise<void> {
    const dom = tiptap().view.dom;
    dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    select(text);
    dom.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await tick();
  }

  describe('copying and painting', () => {
    it('paints bold and a text color onto other text', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong><span style="color: #ff0000">Source</span></strong> and target</p>');

      copyFrom('Source');
      paintOnto('target');

      expect(marksOf('target')).toEqual(marksOf('Source'));
      expect(html()).toMatch(/<span style="color: rgb\(255, 0, 0\);?"><strong>target<\/strong><\/span>/);
    });

    it('paints every inline format: italic, underline, strikethrough, superscript and highlight', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><em><u><s><sup><mark data-color="#ffff00" style="background-color: #ffff00; color: inherit">Src</mark></sup></s></u></em> target</p>');
      expect(marksOf('Src')).toHaveLength(5);

      copyFrom('Src');
      paintOnto('target');

      expect(marksOf('target')).toEqual(marksOf('Src'));
    });

    it('paints subscript', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><sub>low</sub> target</p>');

      copyFrom('low');
      paintOnto('target');

      expect(html()).toBe('<p><sub>low</sub> <sub>target</sub></p>');
    });

    it('paints inline code', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><code>code</code> target</p>');

      copyFrom('code');
      paintOnto('target');

      expect(html()).toBe('<p><code>code</code> <code>target</code></p>');
    });

    it("replaces the target's own formatting", () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Source</strong> <em><span style="color: #0000ff">target</span></em></p>');

      copyFrom('Source');
      paintOnto('target');

      expect(html()).toBe('<p><strong>Source</strong> <strong>target</strong></p>');
    });

    it('clears the formatting of text painted from plain text', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p>Plain <strong><em>target</em></strong></p>');

      copyFrom('Plain');
      paintOnto('target');

      expect(html()).toBe('<p>Plain target</p>');
    });

    it("keeps the target's link, and does not copy the source's", () => {
      editor = new HTMLEditor(container);
      editor.setContent(
        '<p><a href="https://example.com/a"><strong>Source</strong></a> ' +
        '<a href="https://example.com/b"><em>target</em></a> plain</p>',
      );

      copyFrom('Source');
      paintOnto('target');
      paintOnto('plain');

      const html = editor.getContent();
      expect(html).toMatch(/<a [^>]*href="https:\/\/example\.com\/b"[^>]*><strong>target<\/strong><\/a>/);
      expect(html).toContain(' <strong>plain</strong>');
      expect(html.match(/<a /g)).toHaveLength(2);
    });

    it('copies the formatting at the start of a mixed selection', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Bold</strong><em>Italic</em> target</p>');
      tiptap().commands.setTextSelection({ from: rangeOf('Bold').from, to: rangeOf('Italic').to });
      editor.execCommand('mceRetrieveFormats');

      paintOnto('target');

      expect(html()).toContain(' <strong>target</strong>');
    });

    it('paints across several paragraphs', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Src</strong></p><p>one</p><p>two</p>');
      copyFrom('Src');

      tiptap().commands.setTextSelection({ from: rangeOf('one').from, to: rangeOf('two').to });
      editor.execCommand('mcePaintFormats');

      expect(html()).toBe('<p><strong>Src</strong></p><p><strong>one</strong></p><p><strong>two</strong></p>');
    });

    it('paints the word around a collapsed caret', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Src</strong> paint this word</p>');
      copyFrom('Src');

      caretIn('this', 2);
      expect(editor.execCommand('mcePaintFormats')).toBe(true);

      expect(html()).toBe('<p><strong>Src</strong> paint <strong>this</strong> word</p>');
    });

    it.each([
      ['Thai, with its tone and vowel marks', 'ที่นี่'],
      ['a decomposed accent', 'cafés'],
      ['a curly apostrophe', 'don’t'],
    ])('paints a whole word with %s', (_name, word) => {
      editor = new HTMLEditor(container);
      editor.setContent(`<p><strong>Src</strong> ${word} end</p>`);
      copyFrom('Src');

      caretIn(word, 1);
      editor.execCommand('mcePaintFormats');

      expect(html()).toBe(`<p><strong>Src</strong> <strong>${word}</strong> end</p>`);
    });

    it('paints what is typed next at a caret outside any word', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Src</strong></p><p></p>');
      copyFrom('Src');

      const empty = tiptap().state.doc.child(1);
      tiptap().commands.setTextSelection(tiptap().state.doc.child(0).nodeSize + 1);
      expect(empty.content.size).toBe(0);
      editor.execCommand('mcePaintFormats');
      tiptap().commands.insertContent('typed');

      expect(html()).toBe('<p><strong>Src</strong></p><p><strong>typed</strong></p>');
    });

    it('is undone in one step', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Source</strong> <em>target</em></p>');
      const before = html();
      copyFrom('Source');
      paintOnto('target');
      expect(html()).not.toBe(before);

      editor.execCommand('Undo');

      expect(html()).toBe(before);
    });

    it('paints every cell of a cell selection', () => {
      editor = new HTMLEditor(container);
      editor.setContent(
        '<p><strong>Src</strong></p><table><tbody>' +
        '<tr><td><p>a1</p></td><td><p>b1</p></td></tr>' +
        '<tr><td><p>a2</p></td><td><p>b2</p></td></tr>' +
        '</tbody></table>',
      );
      copyFrom('Src');
      // A cell's position is two before its first text: the cell, then its paragraph.
      const cellOf = (text: string) => rangeOf(text).from - 2;
      const { state } = tiptap();
      tiptap().view.dispatch(state.tr.setSelection(CellSelection.create(state.doc, cellOf('b1'), cellOf('b2'))));

      expect(editor.execCommand('mcePaintFormats')).toBe(true);

      expect(marksOf('b1')).toEqual(marksOf('Src'));
      expect(marksOf('b2')).toEqual(marksOf('Src'));
      expect(marksOf('a1')).toEqual([]);
    });

    it('keeps a link under painted inline code, which would otherwise push it out', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><code>code</code> <a href="https://example.com/">target</a> plain</p>');

      copyFrom('code');
      paintOnto('target');
      paintOnto('plain');

      expect(html()).toMatch(/<a [^>]*href="https:\/\/example\.com\/"[^>]*>target<\/a>/);
      expect(html()).toContain(' <code>plain</code>');
    });

    it('adds no empty span when the copied font is the one the target already shows', () => {
      editor = new HTMLEditor(container);
      // Parsed, the span's unset size and color are '' rather than null.
      editor.setContent('<p><span style="font-family: arial, helvetica, sans-serif">Source</span> target</p>');

      copyFrom('Source');
      paintOnto('target');

      expect(html()).toMatch(/ target<\/p>$/);
    });

    it('does not paint an image, mention or other node selected on its own', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Src</strong> <img src="https://example.com/a.png" alt="a"></p>');
      copyFrom('Src');
      let imagePos = -1;
      tiptap().state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') imagePos = pos;
      });
      const { state } = tiptap();
      tiptap().view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, imagePos)));
      const before = html();

      expect(editor.execCommand('mcePaintFormats')).toBe(false);

      expect(html()).toBe(before);
    });

    it('has nothing to paint before anything is copied', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><em>target</em></p>');
      const before = html();
      select('target');

      expect(editor.execCommand('mcePaintFormats')).toBe(false);
      expect(html()).toBe(before);
    });
  });

  describe('fonts', () => {
    const FONT = 'georgia, serif';

    it("paints a paragraph's own font as a font on the painted text", () => {
      editor = new HTMLEditor(container);
      editor.setContent(`<p style="font-family: ${FONT}">Source</p><p>target</p>`);

      copyFrom('Source');
      paintOnto('target');

      expect(html()).toMatch(new RegExp(`<span style="font-family: ${FONT};?">target</span>`));
    });

    it('does not wrap text in a span of the default font', () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Source</strong></p><p>target</p>');

      copyFrom('Source');
      paintOnto('target');

      expect(html()).toMatch(/<strong>target<\/strong><\/p>$/);
      expect(html()).not.toContain('<span');
    });

    it("removes the target's own font when the source is in the default font", () => {
      editor = new HTMLEditor(container);
      editor.setContent(`<p>Source <span style="font-family: ${FONT}; font-size: 18pt">target</span></p>`);

      copyFrom('Source');
      paintOnto('target');

      expect(html()).not.toContain('<span');
    });

    it('paints no font from text in the default font onto a heading or a paragraph in another font', () => {
      editor = new HTMLEditor(container);
      editor.setContent(`<p><strong>Source</strong></p><h2>heading</h2><p style="font-family: ${FONT}">other</p>`);

      copyFrom('Source');
      paintOnto('heading');
      paintOnto('other');

      // The heading keeps its size by level and the paragraph its own font.
      expect(html()).toContain('<h2 style="font-family: arial, helvetica, sans-serif;"><strong>heading</strong></h2>');
      expect(html()).toMatch(/<strong>other<\/strong><\/p>$/);
      expect(html()).not.toContain('<span');
    });

    it("adds no span where the target's paragraph is already in the copied font", () => {
      editor = new HTMLEditor(container);
      editor.setContent(`<p style="font-family: ${FONT}">Source</p><p style="font-family: ${FONT}">target</p>`);

      copyFrom('Source');
      paintOnto('target');

      expect(html()).not.toContain('<span');
    });

    it("paints a paragraph's own size, and adds none where the target's paragraph has it", () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p style="font-size: 18pt">Source</p><p>target</p><p style="font-size: 18pt">same</p>');

      copyFrom('Source');
      paintOnto('target');
      paintOnto('same');

      expect(html()).toMatch(/<span style="font-size: 18pt;?">target<\/span>/);
      expect(html()).toMatch(/<p style="[^"]*font-size: 18pt;?">same<\/p>$/);
    });

    it('compares fonts as the browser does: quotes, letter case and spacing aside', () => {
      editor = new HTMLEditor(container);
      editor.setContent(
        '<p><span style="font-family: \'Times New Roman\', serif">Source</span></p>' +
        '<p style="font-family: Times New Roman, serif">target</p>' +
        '<p style="font-family: Arial, Helvetica,sans-serif">Default</p><p>plain</p>',
      );

      copyFrom('Source');
      paintOnto('target');
      // A paragraph in the default font, spelled differently, has no font of its own to copy.
      copyFrom('Default');
      paintOnto('plain');

      expect(html()).toMatch(/serif;[^"]*">target<\/p>/);
      expect(html()).toMatch(/<p>plain<\/p>$/);
    });

    it('copies from the first selected cell of a cell selection', () => {
      editor = new HTMLEditor(container);
      editor.setContent(
        '<table><tbody>' +
        '<tr><td><p><em>a1</em></p></td><td><p><strong>b1</strong></p></td></tr>' +
        '<tr><td><p>a2</p></td><td><p><u>b2</u></p></td></tr>' +
        '</tbody></table><p>target</p><p>other</p>',
      );
      const cellOf = (text: string) => rangeOf(text).from - 2;
      // Dragged down and dragged up: either way, the first cell in the document.
      for (const [anchor, head, target] of [['b1', 'b2', 'target'], ['b2', 'b1', 'other']]) {
        const { state } = tiptap();
        tiptap().view.dispatch(state.tr.setSelection(CellSelection.create(state.doc, cellOf(anchor), cellOf(head))));
        editor.execCommand('mceRetrieveFormats');

        paintOnto(target);

        expect(marksOf(target)).toEqual(marksOf('b1'));
      }
    });

    it('paints an inline font and size', () => {
      editor = new HTMLEditor(container);
      editor.setContent(`<p><span style="font-family: ${FONT}; font-size: 18pt">Source</span> target</p>`);

      copyFrom('Source');
      paintOnto('target');

      expect(html()).toMatch(new RegExp(`<span style="font-family: ${FONT}; font-size: 18pt;?">target</span>`));
    });
  });

  describe('painting with the mouse', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Source</strong> one two three</p>');
    });

    it('turns on with mceToggleFormatPainter, copying the formatting at the selection', () => {
      select('Source');

      expect(editor.execCommand('mceToggleFormatPainter')).toBe(true);

      expect(isFormatPainterActive(tiptap().state)).toBe(true);
    });

    it('paints the next mouse selection, then turns off', async () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');

      await mouseSelect('one');
      await mouseSelect('three');

      expect(html()).toBe('<p><strong>Source</strong> <strong>one</strong> two three</p>');
      expect(isFormatPainterActive(tiptap().state)).toBe(false);
    });

    it('in sticky mode, paints every mouse selection until it is turned off', async () => {
      select('Source');
      tiptap().commands.startFormatPainter({ sticky: true });

      await mouseSelect('one');
      await mouseSelect('two');
      expect(isFormatPainterActive(tiptap().state)).toBe(true);

      editor.execCommand('mceToggleFormatPainter');
      await mouseSelect('three');

      expect(html()).toBe('<p><strong>Source</strong> <strong>one</strong> <strong>two</strong> three</p>');
      expect(isFormatPainterActive(tiptap().state)).toBe(false);
    });

    it('turns off with Escape', async () => {
      select('Source');
      tiptap().commands.startFormatPainter({ sticky: true });

      tiptap().view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await mouseSelect('one');

      expect(isFormatPainterActive(tiptap().state)).toBe(false);
      expect(html()).toBe('<p><strong>Source</strong> one two three</p>');
    });

    it('leaves Escape to the other handlers', () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

      tiptap().view.dom.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('does not paint a selection whose mouse press began outside the editor', async () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');

      select('one');
      tiptap().view.dom.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toBe('<p><strong>Source</strong> one two three</p>');
      expect(isFormatPainterActive(tiptap().state)).toBe(true);
    });

    it('does not paint on a right-click or a middle-click', async () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      const dom = tiptap().view.dom;

      for (const button of [1, 2]) {
        dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button }));
        select('one');
        dom.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button }));
        await tick();
      }

      expect(html()).toBe('<p><strong>Source</strong> one two three</p>');
      expect(isFormatPainterActive(tiptap().state)).toBe(true);
    });

    it('paints a drag released outside the editor', async () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');

      tiptap().view.dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      select('one');
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toBe('<p><strong>Source</strong> <strong>one</strong> two three</p>');
    });

    it('is not left armed by a press whose release it missed', async () => {
      select('Source');
      tiptap().commands.startFormatPainter({ sticky: true });
      const dom = tiptap().view.dom;

      // A press in the editor released outside it, then a release in the editor
      // of a press that began outside: only the first is the user's selection.
      dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      select('one');
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();
      select('three');
      dom.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toBe('<p><strong>Source</strong> <strong>one</strong> two three</p>');
    });

    it('hears the release even when the page stops it on its way', async () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      const stop = (e: Event) => e.stopPropagation();
      container.addEventListener('mouseup', stop);
      try {
        await mouseSelect('one');
      } finally {
        container.removeEventListener('mouseup', stop);
      }

      expect(html()).toBe('<p><strong>Source</strong> <strong>one</strong> two three</p>');
    });

    it('is not left armed by a press whose release went to another window', async () => {
      select('Source');
      tiptap().commands.startFormatPainter({ sticky: true });

      tiptap().view.dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      window.dispatchEvent(new Event('blur'));
      // Back in the page, a click outside the editor.
      select('one');
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toBe('<p><strong>Source</strong> one two three</p>');
    });

    it('is not left armed by a press that became a drag, which ends without a mouseup', async () => {
      select('Source');
      tiptap().commands.startFormatPainter({ sticky: true });
      const dom = tiptap().view.dom;

      dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      dom.dispatchEvent(new Event('dragstart', { bubbles: true }));
      // Later, a click elsewhere on the page (a toolbar button, say).
      select('one');
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toBe('<p><strong>Source</strong> one two three</p>');
    });

    it("does not paint on a press on a wide table's scrollbar", async () => {
      editor.setContent('<p><strong>Source</strong> one two three</p><table><tbody><tr><td><p>wide</p></td></tr></tbody></table>');
      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      // The table view's wrapper scrolls a table wider than the editor.
      const scroller = tiptap().view.dom.querySelector<HTMLElement>('.tableWrapper')!;
      Object.defineProperty(scroller, 'clientWidth', { value: 300 });
      Object.defineProperty(scroller, 'clientHeight', { value: 40 });
      select('one');

      // Below the content box: the horizontal scrollbar.
      const press = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(press, 'offsetX', { value: 100 });
      Object.defineProperty(press, 'offsetY', { value: 45 });
      scroller.dispatchEvent(press);
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toMatch(/^<p><strong>Source<\/strong> one two three<\/p>/);
      expect(isFormatPainterActive(tiptap().state)).toBe(true);
    });

    it('leaves a clicked image alone, and stays on for the next selection', async () => {
      editor.setContent('<p><strong>Source</strong> one <img src="https://example.com/a.png" alt="a"></p>');
      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      let imagePos = -1;
      tiptap().state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') imagePos = pos;
      });
      const before = html();

      const dom = tiptap().view.dom;
      dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, imagePos)));
      dom.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await tick();

      expect(html()).toBe(before);
      expect(isFormatPainterActive(tiptap().state)).toBe(true);
    });

    it('shows a painter cursor while on', () => {
      const root = tiptap().view.dom;
      expect(root.classList.contains('md-format-painter')).toBe(false);

      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      expect(root.classList.contains('md-format-painter')).toBe(true);
      expect(root.classList.contains('md-editor-body')).toBe(true);

      editor.execCommand('mceToggleFormatPainter');
      expect(root.classList.contains('md-format-painter')).toBe(false);
    });

    it('turns off without painting when toggled again', async () => {
      select('Source');
      editor.execCommand('mceToggleFormatPainter');
      editor.execCommand('mceToggleFormatPainter');

      await mouseSelect('one');

      expect(html()).toBe('<p><strong>Source</strong> one two three</p>');
    });
  });

  describe('read-only', () => {
    it('neither turns on nor paints', async () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Source</strong> target</p>');
      copyFrom('Source');
      editor.setReadOnly(true);
      const before = html();

      select('target');
      expect(editor.execCommand('mcePaintFormats')).toBe(false);
      expect(editor.execCommand('mceToggleFormatPainter')).toBe(false);
      expect(isFormatPainterActive(tiptap().state)).toBe(false);
      expect(html()).toBe(before);
    });

    it('stops painting when the editor turns read-only', async () => {
      editor = new HTMLEditor(container);
      editor.setContent('<p><strong>Source</strong> target</p>');
      select('Source');
      editor.execCommand('mceToggleFormatPainter');

      editor.setReadOnly(true);
      await mouseSelect('target');

      expect(html()).toBe('<p><strong>Source</strong> target</p>');
      // Off, so the painter cursor goes and making it editable again doesn't resume it.
      expect(isFormatPainterActive(tiptap().state)).toBe(false);
      expect(tiptap().view.dom.classList.contains('md-format-painter')).toBe(false);
    });
  });
});
