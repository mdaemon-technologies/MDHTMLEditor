/**
 * Marked quotes (quote_marker_class).
 *
 * A host can mark a reply's quoted original by wrapping it in a <blockquote> or
 * <div> whose class is a fixed marker, and find the quote again by that class in
 * getContent(). The marker is the host's to choose, so it is a config option.
 * Editor content renders in the host page, not an iframe, so the marker is kept
 * through an exact-value allowlist: every other class, id, data-* and style is
 * still dropped.
 */

import { Fragment, Slice } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';

const MARKER = 'quoted-original';

// The three shapes of a quoted original, attribution included.
const ATTRIBUTION = 'From: a@b.test<BR>To: c@d.test<BR>';
const PREFIXED =
  `<BR><BLOCKQUOTE class="${MARKER}" style="PADDING-RIGHT: 0px; PADDING-LEFT: 5px; MARGIN-LEFT: 5px; ` +
  `BORDER-LEFT: #000000 2px solid; MARGIN-RIGHT: 0px">${ATTRIBUTION}<p>original text</p></BLOCKQUOTE>`;
const INCLUDED = `<BR><div class="${MARKER}">${ATTRIBUTION}<p>original text</p></div>`;
const INDENTED = `<BR><div class="${MARKER}" style="MARGIN-LEFT: 15px;">${ATTRIBUTION}<p>original text</p></div>`;

let container: HTMLElement;
let editor: HTMLEditor;

/** An editor with MARKER configured as the quote marker, unless `config` says otherwise. */
function make(config: EditorConfig = {}): HTMLEditor {
  editor = new HTMLEditor(container, { quote_marker_class: MARKER, ...config });
  return editor;
}

/** getContent() parsed. */
function output(): HTMLElement {
  return new DOMParser().parseFromString(editor.getContent(), 'text/html').body;
}

/** Elements whose class is exactly the marker. */
function quotes(): HTMLElement[] {
  return Array.from(output().querySelectorAll<HTMLElement>('[class]')).filter(
    (el) => el.getAttribute('class') === MARKER,
  );
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  editor?.destroy();
  container?.remove();
});

describe.each(['p', 'div'] as const)('with forced_root_block: %s', (rootBlock) => {
  const config: EditorConfig = { forced_root_block: rootBlock, format_empty_lines: true };

  it('keeps the prefixed shape as a marked blockquote with its box style', () => {
    make(config).setContent(PREFIXED);

    const [quote] = quotes();
    expect(quote?.tagName).toBe('BLOCKQUOTE');
    expect(quote.style.paddingLeft).toBe('5px');
    expect(quote.style.paddingRight).toBe('0px');
    expect(quote.style.marginLeft).toBe('5px');
    expect(quote.style.marginRight).toBe('0px');
    expect(quote.style.borderLeftWidth).toBe('2px');
    expect(quote.style.borderLeftStyle).toBe('solid');
    expect(quote.style.borderLeftColor).toBe('rgb(0, 0, 0)');
    expect(quote.textContent).toContain('From: a@b.test');
    expect(quote.textContent).toContain('original text');
    // A plain substring search finds the quote.
    expect(editor.getContent()).toContain(`<blockquote class="${MARKER}"`);
  });

  it('keeps the included shape as a marked div', () => {
    make(config).setContent(INCLUDED);

    const [quote] = quotes();
    expect(quote?.tagName).toBe('DIV');
    expect(quote.textContent).toContain('From: a@b.test');
    expect(quote.textContent).toContain('original text');
    expect(editor.getContent()).toContain(`<div class="${MARKER}"`);
  });

  it('keeps the indented shape as a marked div with its margin', () => {
    make(config).setContent(INDENTED);

    const [quote] = quotes();
    expect(quote?.tagName).toBe('DIV');
    expect(quote.style.marginLeft).toBe('15px');
    expect(quote.textContent).toContain('original text');
  });

  it('keeps the font of a marked div on its attribution lines and its blocks', () => {
    make(config).setContent(
      `<div class="${MARKER}" style="font-family: Georgia">From: a@b.test<BR>To: c@d.test<BR><p>Body</p></div>`,
    );

    const lines = Array.from(quotes()[0].children) as HTMLElement[];
    expect(lines.map((line) => line.textContent)).toEqual(['From: a@b.testTo: c@d.test', 'Body']);
    lines.forEach((line) => expect(line.style.fontFamily).toBe('Georgia'));
  });

  it('keeps a marked div that holds only blocks', () => {
    make(config).setContent(`<div class="${MARKER}" style="margin-left: 15px"><p>From</p><p>original</p></div>`);

    const [quote] = quotes();
    expect(quote?.tagName).toBe('DIV');
    expect(quote.style.marginLeft).toBe('15px');
    expect(quote.children).toHaveLength(2);
  });

  it('keeps the marker on nested quotes, the inner inside the outer', () => {
    make(config).setContent(
      `<blockquote class="${MARKER}"><p>outer</p><blockquote class="${MARKER}"><p>inner</p></blockquote></blockquote>`,
    );

    const [outer, inner] = quotes();
    expect(quotes()).toHaveLength(2);
    expect(outer.contains(inner)).toBe(true);
    expect(inner.textContent).toBe('inner');
  });

  it('writes the class first even when the quote has a direction', () => {
    make(config).setContent(`<blockquote class="${MARKER}" dir="rtl"><p>t</p></blockquote>`);

    expect(editor.getContent()).toContain(`<blockquote class="${MARKER}"`);
    expect(quotes()[0]?.getAttribute('dir')).toBe('rtl');
  });

  it('keeps the marker on content inserted with insertContent()', () => {
    make(config).setContent('<p>Reply</p>');
    editor.insertContent(`<blockquote class="${MARKER}"><p>original</p></blockquote>`);

    expect(quotes()).toHaveLength(1);
  });

  it.each([
    ['prefixed', PREFIXED],
    ['included', INCLUDED],
    ['indented', INDENTED],
  ])('round-trips the %s shape unchanged', (_name, html) => {
    make(config).setContent(html);
    const once = editor.getContent();
    editor.setContent(once);

    expect(editor.getContent()).toBe(once);
    expect(quotes()).toHaveLength(1);
  });
});

describe('the allowlist', () => {
  /** The marked quote's inline style after import of `style`. */
  function keptStyle(style: string): CSSStyleDeclaration {
    make().setContent(`<blockquote class="${MARKER}" style="${style}"><p>t</p></blockquote>`);
    return quotes()[0].style;
  }

  it.each([
    ['background: url(https://tracker.example/x.gif)', 'background-image'],
    ['color: red', 'color'],
    ['position: fixed', 'position'],
    ['display: none', 'display'],
    ['margin-left: -50px', 'margin-left'],
    ['margin-left: calc(10px + 2px)', 'margin-left'],
    ['padding-left: 10%', 'padding-left'],
    ['border-left-style: hidden', 'border-left-style'],
    ['border-left-color: var(--x)', 'border-left-color'],
    ['border-left-color: inherit', 'border-left-color'],
    ['border-left-color: revert', 'border-left-color'],
    ['border-left-color: unset', 'border-left-color'],
  ])('drops `%s` from a marked quote', (declaration, property) => {
    expect(keptStyle(`${declaration}; margin-top: 1px`).getPropertyValue(property)).toBe('');
  });

  it('keeps the allowed box properties and value forms', () => {
    const style = keptStyle(
      'padding-top: 1.5em; margin-bottom: 0; border-bottom: 1pt dashed red; border-top: 3px double #abc',
    );

    expect(style.paddingTop).toBe('1.5em');
    expect(style.marginBottom).toBe('0px');
    expect(style.borderBottomWidth).toBe('1pt');
    expect(style.borderBottomStyle).toBe('dashed');
    expect(style.borderBottomColor).toBe('red');
    expect(style.borderTopWidth).toBe('3px');
    expect(style.borderTopStyle).toBe('double');
    expect(style.borderTopColor).toBe('rgb(170, 187, 204)');
  });

  it('drops every other attribute on a marked quote, keeping dir', () => {
    make().setContent(
      `<blockquote class="${MARKER}" id="q1" data-x="1" title="t" onclick="alert(1)" dir="rtl"><p>t</p></blockquote>`,
    );

    const quote = quotes()[0];
    expect(quote.getAttributeNames().sort()).toEqual(['class', 'dir']);
  });

  it('still drops class and style from a plain blockquote', () => {
    make().setContent('<blockquote class="foo" style="color: red; margin-left: 5px"><p>t</p></blockquote>');

    const quote = output().querySelector('blockquote')!;
    expect(quote.hasAttribute('class')).toBe(false);
    expect(quote.hasAttribute('style')).toBe(false);
  });

  it('does not mark a blockquote whose class only contains the marker', () => {
    make().setContent(`<blockquote class="foo ${MARKER}" style="margin-left: 5px"><p>t</p></blockquote>`);

    const quote = output().querySelector('blockquote')!;
    expect(quote.hasAttribute('class')).toBe(false);
    expect(quote.hasAttribute('style')).toBe(false);
  });

  it('does not keep a div whose class only contains the marker', () => {
    make().setContent(`<div class="${MARKER} foo"><p>a</p><p>b</p></div>`);

    expect(output().querySelector('[class]')).toBeNull();
    expect(output().textContent).toBe('ab');
  });

  it('marks a quote whose class is the marker with surrounding whitespace', () => {
    make().setContent(`<blockquote class=" ${MARKER} "><p>t</p></blockquote>`);

    expect(quotes()).toHaveLength(1);
  });
});

describe('editing a marked quote', () => {
  const PLAIN = '<blockquote><p>one</p><p>two</p></blockquote>';
  const MARKED = `<blockquote class="${MARKER}"><p>one</p><p>two</p></blockquote>`;

  /** Run `edit` on `html` and return the result with the marker removed. */
  function afterEdit(html: string, edit: (tiptap: NonNullable<ReturnType<HTMLEditor['getTipTap']>>) => void): string {
    make().setContent(html);
    edit(editor.getTipTap()!);
    const result = editor.getContent().split(` class="${MARKER}"`).join('');
    editor.destroy();
    container.innerHTML = '';
    return result;
  }

  /** Position at the start of the n-th paragraph (0-based) in the quote. */
  function startOfLine(n: number): number {
    let found = -1;
    let index = 0;
    editor.getTipTap()!.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        if (index === n) found = pos + 1;
        index += 1;
      }
    });
    return found;
  }

  it.each<[string, (tiptap: NonNullable<ReturnType<HTMLEditor['getTipTap']>>) => void]>([
    ['typing', (t) => { t.commands.setTextSelection(startOfLine(1)); t.commands.insertContent('x'); }],
    ['Enter mid-line', (t) => { t.commands.setTextSelection(startOfLine(1) + 1); t.commands.keyboardShortcut('Enter'); }],
    ['Backspace at the start of the first line', (t) => { t.commands.setTextSelection(startOfLine(0)); t.commands.keyboardShortcut('Backspace'); }],
    ['Backspace at the start of a later line', (t) => { t.commands.setTextSelection(startOfLine(1)); t.commands.keyboardShortcut('Backspace'); }],
    ['select all and delete', (t) => { t.commands.selectAll(); t.commands.deleteSelection(); }],
  ])('behaves like a plain blockquote for %s', (_name, edit) => {
    expect(afterEdit(MARKED, edit)).toBe(afterEdit(PLAIN, edit));
  });

  it('keeps the marker while the user types in the quote', () => {
    make().setContent(MARKED);
    editor.getTipTap()!.commands.setTextSelection(startOfLine(1));
    editor.getTipTap()!.commands.insertContent('x');

    expect(quotes()).toHaveLength(1);
    expect(quotes()[0].textContent).toBe('onextwo');
  });

  it('makes a plain blockquote with the Blockquote button', () => {
    make().setContent('<p>quote me</p>');
    editor.getTipTap()!.commands.setTextSelection(2);
    // What the toolbar button runs (Toolbar.ts).
    editor.getTipTap()!.commands.toggleBlockquote();

    const quote = output().querySelector('blockquote')!;
    expect(quote.getAttributeNames()).toEqual([]);
  });

  it('lifts a line out of a marked quote with the Blockquote button, leaving the quote marked', () => {
    make().setContent(MARKED);
    editor.getTipTap()!.commands.setTextSelection(startOfLine(1) + 1);
    editor.getTipTap()!.commands.toggleBlockquote();

    expect(quotes()).toHaveLength(1);
    expect(quotes()[0].textContent).toBe('one');
    expect(output().lastElementChild!.textContent).toBe('two');
  });
});

describe('the marker comes from loaded content only', () => {
  /** Paste the way Ctrl+V does. */
  function paste(html: string): void {
    const clipboardData = {
      types: ['text/html'],
      getData: (type: string) => (type === 'text/html' ? html : ''),
      files: [],
      items: [],
    } as unknown as DataTransfer;
    const event = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true } as ClipboardEventInit);
    editor.getTipTap()!.view.dom.dispatchEvent(event);
  }

  /** A reply holding its quoted original, with the caret on the empty line above it. */
  function makeReply(): void {
    make().setContent(`<p>Reply</p><p></p><blockquote class="${MARKER}"><p>original</p></blockquote>`);
    // On an empty line, so the pasted blocks stay blocks.
    editor.getTipTap()!.commands.setTextSelection(8);
  }

  it('pastes a marked quote as a plain blockquote when the quoted original is there', () => {
    makeReply();
    paste(`<blockquote class="${MARKER}" style="margin-left: 5px"><p>pasted</p><p>lines</p></blockquote>`);

    expect(output().querySelectorAll('blockquote')).toHaveLength(2);
    expect(quotes().map((quote) => quote.textContent)).toEqual(['original']);
  });

  it('keeps the marker when the quoted original is cut and pasted somewhere else', () => {
    make().setContent('<p>Reply</p><p></p>');
    editor.getTipTap()!.commands.setTextSelection(editor.getTipTap()!.state.doc.content.size - 1);
    paste(`<blockquote class="${MARKER}"><p>original</p></blockquote>`);

    expect(quotes().map((quote) => quote.textContent)).toEqual(['original']);
  });

  it('pastes a marked div as a plain blockquote when the quoted original is there', () => {
    makeReply();
    paste(`<div class="${MARKER}"><p>pasted</p><p>lines</p></div>`);

    expect(quotes().map((quote) => quote.textContent)).toEqual(['original']);
    expect(output().querySelector('blockquote:not([class])')?.textContent).toBe('pastedlines');
  });

  it('keeps the marker when the quote is pasted over itself', () => {
    make().setContent(`<blockquote class="${MARKER}"><p>original</p></blockquote><p>end</p>`);
    editor.getTipTap()!.commands.selectAll();
    paste(`<blockquote class="${MARKER}"><p>original</p></blockquote>`);

    expect(quotes().map((quote) => quote.textContent)).toEqual(['original']);
  });

  /**
   * Drop a copy of the whole quote at the end, the way ProseMirror does: the
   * handleDrop prop learns whether the drop moves, then a transaction marked
   * as a drop inserts the slice and selects it. Nothing is deleted here, so
   * a move leaves both quotes in place.
   */
  function dropWholeQuote(moved: boolean): void {
    const tiptap = editor.getTipTap()!;
    const quote = tiptap.state.doc.firstChild!;
    const plugin = tiptap.state.plugins.find((p) => (p as unknown as { key: string }).key.startsWith('markedQuotePaste'))!;
    const slice = new Slice(Fragment.from(quote), 0, 0);
    // A drag within the editor: ProseMirror holds the dragged slice until the drop.
    tiptap.view.dragging = { slice, move: moved };
    plugin.props.handleDrop!.call(plugin, tiptap.view, new Event('drop') as DragEvent, slice, moved);
    tiptap.view.dragging = null;

    const end = tiptap.state.doc.content.size;
    const tr = tiptap.state.tr.insert(end, quote);
    tr.setSelection(NodeSelection.create(tr.doc, end));
    tiptap.view.dispatch(tr.setMeta('uiEvent', 'drop'));
  }

  it('keeps the marker on a whole quote dragged to a new place', () => {
    make().setContent(`<blockquote class="${MARKER}"><p>q</p></blockquote><p>end</p>`);
    dropWholeQuote(true);

    expect(quotes()).toHaveLength(2);
  });

  it('unmarks the copy when the whole quote is copy-dragged', () => {
    make().setContent(`<blockquote class="${MARKER}"><p>q</p></blockquote><p>end</p>`);
    dropWholeQuote(false);

    expect(quotes()).toHaveLength(1);
    expect(output().querySelectorAll('blockquote')).toHaveLength(2);
  });

  it('unmarks a quote that a dragged part of the original only opens into', () => {
    make().setContent(`<blockquote class="${MARKER}"><p>Hello world</p></blockquote>`);
    const tiptap = editor.getTipTap()!;
    // "world", as a drag takes it (selection.content(): with its parents), so
    // the slice is open through the paragraph and the marked quote.
    const slice = tiptap.state.doc.slice(8, 13, true);
    expect(slice.openStart).toBe(2);
    const plugin = tiptap.state.plugins.find((p) => (p as unknown as { key: string }).key.startsWith('markedQuotePaste'))!;
    const transformPasted = plugin.props.transformPasted!;
    const view = { dragging: { slice, move: true }, state: tiptap.state } as unknown as Parameters<typeof transformPasted>[1];

    const result = transformPasted.call(plugin, slice, view, false);
    expect(result.content.firstChild!.type.name).toBe('blockquote');
    expect(result.content.firstChild!.attrs.marked).toBe(false);
  });

  it('renders only a div or a blockquote, whatever quoteTag is set to', () => {
    make().setContent(`<blockquote class="${MARKER}"><p>q</p></blockquote>`);
    editor.getTipTap()!.commands.setTextSelection(2);
    editor.getTipTap()!.commands.updateAttributes('blockquote', { quoteTag: 'script' });

    expect(editor.getContent()).not.toContain('<script');
    expect(quotes()[0]?.tagName).toBe('BLOCKQUOTE');
  });

  it('renders an unmarked quote as a blockquote, whatever its tag was', () => {
    make().setContent(`<div class="${MARKER}"><p>a</p><p>b</p></div>`);
    editor.getTipTap()!.commands.setTextSelection(2);
    editor.getTipTap()!.commands.updateAttributes('blockquote', { marked: false });

    expect(output().querySelector('blockquote')?.textContent).toBe('ab');
  });
});

describe('the quote_marker_class option', () => {
  it('is off by default: the class is dropped and a marked div is an ordinary wrapper', () => {
    make({ quote_marker_class: undefined }).setContent(
      `<blockquote class="${MARKER}" style="margin-left: 5px"><p>q</p></blockquote>` +
        `<div class="${MARKER}"><p>a</p><p>b</p></div>`,
    );

    expect(editor.getContent()).not.toContain(MARKER);
    expect(output().querySelector('blockquote')!.getAttributeNames()).toEqual([]);
    expect(output().querySelectorAll('blockquote')).toHaveLength(1);
  });

  it.each([[''], ['   '], [`${MARKER} other`]])('is off for the value %p', (value) => {
    make({ quote_marker_class: value }).setContent(`<blockquote class="${MARKER}"><p>q</p></blockquote>`);

    expect(editor.getContent()).not.toContain(MARKER);
  });

  it('ignores whitespace around the configured class', () => {
    make({ quote_marker_class: `  ${MARKER} ` }).setContent(`<blockquote class="${MARKER}"><p>q</p></blockquote>`);

    expect(quotes()).toHaveLength(1);
  });

  it('marks only the configured class', () => {
    make({ quote_marker_class: 'other-marker' }).setContent(
      `<blockquote class="${MARKER}"><p>q</p></blockquote><blockquote class="other-marker"><p>r</p></blockquote>`,
    );

    expect(editor.getContent()).not.toContain(MARKER);
    expect(editor.getContent()).toContain('<blockquote class="other-marker"');
  });
});

describe('beside the signature', () => {
  it('keeps the signature block above the quote', () => {
    make().setContent(`<div id="signature"><p>sig</p></div>${PREFIXED}`);

    expect(output().querySelector('#signature')?.textContent).toBe('sig');
    expect(quotes()).toHaveLength(1);
  });

  it('parses a div that is both the signature and marked as the signature', () => {
    make().setContent(`<div id="signature" class="${MARKER}"><p>sig</p></div>`);

    expect(output().querySelector('#signature')?.textContent).toBe('sig');
    expect(quotes()).toHaveLength(0);
  });
});
