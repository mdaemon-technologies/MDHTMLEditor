/**
 * Image maps.
 *
 * An <img usemap="#name"> and the <map name> with its <area> hotspots are kept
 * through every way HTML enters the editor (setContent, insertContent, Source
 * view, paste) and come back out of getContent(). The editor shows the map as a
 * marker rather than a live <map>, because its content is part of the host page.
 */

import { NodeSelection, Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { HTMLEditor, resetTranslate } from '../../src/core/HTMLEditor';
import { SourceEditor } from '../../src/extensions/SourceEditor';
import type { EditorConfig } from '../../src/types';

const IMG = '<img src="https://example.com/workplace.jpg" alt="Workplace" usemap="#workmap">';
const AREA_RECT = '<area shape="rect" coords="34,44,270,350" alt="Computer" target="_blank" href="https://example.com/computer">';
const AREA_CIRCLE = '<area shape="circle" coords="337,300,44" alt="Coffee" target="_blank" href="https://example.com/coffee">';
const MAP = `<map name="workmap">\n  ${AREA_RECT}\n  ${AREA_CIRCLE}\n</map>`;
const IMAGE_MAP = `${IMG}\n${MAP}`;

const NOTE = 'Image map: hotspots work in the saved content, not while editing';

let container: HTMLElement;
let editor: HTMLEditor;

function make(config: EditorConfig = {}): HTMLEditor {
  editor = new HTMLEditor(container, config);
  return editor;
}

/** getContent() parsed, so assertions don't depend on block style. */
function output(): HTMLElement {
  return new DOMParser().parseFromString(editor.getContent(), 'text/html').body;
}

/** Each area of the named map in getContent(), as its attributes in order. */
function areas(name = 'workmap'): Array<Array<[string, string]>> {
  const map = output().querySelector(`map[name="${name}"]`);
  return Array.from(map?.querySelectorAll('area') ?? []).map((area) =>
    Array.from(area.attributes).map((a): [string, string] => [a.name, a.value]));
}

function attrs(area: Array<[string, string]>): Record<string, string> {
  return Object.fromEntries(area);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  editor?.destroy();
  container?.remove();
  document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
  resetTranslate();
});

describe('loading and saving', () => {
  it('keeps usemap, the map and every area through setContent() and getContent()', () => {
    make().setContent(IMAGE_MAP);
    const body = output();
    expect(body.querySelector('img')?.getAttribute('usemap')).toBe('#workmap');
    expect(body.querySelectorAll('map')).toHaveLength(1);
    expect(areas()).toEqual([
      [['shape', 'rect'], ['coords', '34,44,270,350'], ['href', 'https://example.com/computer'], ['alt', 'Computer'], ['target', '_blank'], ['rel', 'noopener noreferrer']],
      [['shape', 'circle'], ['coords', '337,300,44'], ['href', 'https://example.com/coffee'], ['alt', 'Coffee'], ['target', '_blank'], ['rel', 'noopener noreferrer']],
    ]);
  });

  it('gives an area that opens a new window noopener and noreferrer, as links get', () => {
    make().setContent(`${IMG}<map name="workmap"><area shape="default" href="https://example.com/" target="_blank" rel="nofollow noopener"></map>`);
    expect(attrs(areas()[0]).rel).toBe('nofollow noopener noreferrer');
  });

  it('keeps a map named only by id, writing the name out', () => {
    make().setContent(`${IMG}<map id="workmap">${AREA_RECT}</map>`);
    const map = output().querySelector('map')!;
    expect(map.getAttributeNames()).toEqual(['name']);
    expect(map.getAttribute('name')).toBe('workmap');
    expect(areas()).toHaveLength(1);
  });

  it('keeps the map in the line of its image', () => {
    make().setContent(IMAGE_MAP);
    const map = output().querySelector('map');
    expect(map?.parentElement?.querySelector('img')).not.toBeNull();
  });

  it('keeps an area\'s title and rel', () => {
    make().setContent(`${IMG}<map name="workmap"><area shape="default" href="https://example.com/" title="Home" rel="noopener noreferrer"></map>`);
    expect(attrs(areas()[0])).toEqual({ shape: 'default', href: 'https://example.com/', title: 'Home', rel: 'noopener noreferrer' });
  });

  it('keeps usemap on an image that cannot be resized', () => {
    make({ object_resizing: false }).setContent(IMAGE_MAP);
    expect(output().querySelector('img')?.getAttribute('usemap')).toBe('#workmap');
    expect(areas()).toHaveLength(2);
  });

  it('is stable when its own output is loaded again', () => {
    make().setContent(IMAGE_MAP);
    const first = editor.getContent();
    editor.setContent(first);
    expect(editor.getContent()).toBe(first);
  });

  it('keeps an area that is inside another element of the map', () => {
    make().setContent(`${IMG}<map name="workmap"><span>${AREA_RECT}</span>${AREA_CIRCLE}</map>`);
    expect(areas().map((a) => attrs(a).alt)).toEqual(['Computer', 'Coffee']);
  });

  it('keeps a map with no areas', () => {
    make().setContent(`${IMG}<map name="workmap"></map>`);
    const map = output().querySelector('map[name="workmap"]');
    expect(map).not.toBeNull();
    expect(map?.children).toHaveLength(0);
  });

  it('keeps the areas of a map nested in another map in their own map', () => {
    make().setContent(`<img src="https://example.com/b.png" usemap="#inner"><map name="outer"><map name="inner">${AREA_RECT}</map>${AREA_CIRCLE}</map>`);
    expect(areas('inner').map((a) => attrs(a).alt)).toEqual(['Computer']);
    expect(areas('outer').map((a) => attrs(a).alt)).toEqual(['Coffee']);
  });

  it('keeps two maps in one document', () => {
    make().setContent(
      `<p>${IMG}<map name="workmap">${AREA_RECT}</map></p>` +
      '<p><img src="https://example.com/b.png" usemap="#other"><map name="other">' + AREA_CIRCLE + '</map></p>'
    );
    expect(areas('workmap')).toHaveLength(1);
    expect(areas('other')).toHaveLength(1);
    expect(Array.from(output().querySelectorAll('img')).map((img) => img.getAttribute('usemap'))).toEqual(['#workmap', '#other']);
  });

  it('keeps a map that no image points to', () => {
    make().setContent(`<p>Text</p><map name="lonely">${AREA_RECT}</map>`);
    expect(areas('lonely')).toHaveLength(1);
  });

  it('adds no blank line to a line that holds only a map', () => {
    make().setContent(`<p>${IMG}</p>${MAP}`);
    const map = output().querySelector('map');
    expect(map?.parentElement?.querySelector('br')).toBeNull();
    const first = editor.getContent();
    editor.setContent(first);
    expect(editor.getContent()).toBe(first);
  });

  it('keeps a map inside a wrapper div', () => {
    make().setContent(`<div><p>${IMG}</p>${MAP}</div>`);
    expect(areas()).toHaveLength(2);
  });

  it('keeps the map through insertContent()', () => {
    make().setContent('<p></p>');
    editor.insertContent(IMAGE_MAP);
    expect(output().querySelector('img')?.getAttribute('usemap')).toBe('#workmap');
    expect(areas()).toHaveLength(2);
  });

  it('keeps the other content of a map, after the map', () => {
    make().setContent(`${IMG}<map name="workmap"><a href="https://example.com/computer">Computer</a> | ${AREA_RECT}</map>`);
    const body = output();
    expect(body.querySelector('a[href="https://example.com/computer"]')?.textContent).toBe('Computer');
    expect(body.querySelector('map a')).toBeNull();
    expect(areas()).toHaveLength(1);
  });

  it('leaves content without a map unchanged', () => {
    make().setContent('<p>Hello <img src="https://example.com/a.png" alt="a"> world</p>');
    expect(editor.getContent()).not.toContain('map');
    expect(output().querySelector('img')?.hasAttribute('usemap')).toBe(false);
  });
});

describe('what is dropped', () => {
  it('drops an area href the editor would not allow on a link, and keeps the area', () => {
    make().setContent(
      `${IMG}<map name="workmap">` +
      '<area shape="rect" coords="0,0,10,10" href="javascript:alert(1)" alt="a">' +
      '<area shape="rect" coords="0,0,10,10" href="data:text/html,<b>x</b>" alt="b">' +
      '<area shape="rect" coords="0,0,10,10" href="java&#9;script:alert(1)" alt="c">' +
      '</map>'
    );
    const kept = areas().map(attrs);
    expect(kept.map((a) => a.alt)).toEqual(['a', 'b', 'c']);
    expect(kept.every((a) => !('href' in a))).toBe(true);
  });

  it('keeps mailto, in-page and relative area links', () => {
    make().setContent(
      `${IMG}<map name="workmap">` +
      '<area shape="rect" coords="0,0,1,1" href="mailto:info@example.com">' +
      '<area shape="rect" coords="0,0,1,1" href="#top">' +
      '<area shape="rect" coords="0,0,1,1" href="/contact">' +
      '</map>'
    );
    expect(areas().map((a) => attrs(a).href)).toEqual(['mailto:info@example.com', '#top', '/contact']);
  });

  it.each([
    ['javascript:x'],
    ['workmap'],
    ['#'],
    ['#two words'],
  ])('drops usemap="%s"', (usemap) => {
    make().setContent(`<img src="https://example.com/a.png" usemap="${usemap}">`);
    expect(output().querySelector('img')?.hasAttribute('usemap')).toBe(false);
  });

  it('drops a target, shape or coords value outside what HTML allows', () => {
    make().setContent(`${IMG}<map name="workmap"><area shape="star" coords="1,2,x()" target="evil" href="https://example.com/" alt="a"></map>`);
    expect(attrs(areas()[0])).toEqual({ href: 'https://example.com/', alt: 'a' });
  });

  it('drops id, class, style, data and event attributes from the map and its areas', () => {
    make().setContent(
      `${IMG}<map name="workmap" id="m" class="c" style="color:red" data-x="1" onclick="alert(1)">` +
      '<area shape="rect" coords="0,0,1,1" id="a" class="c" style="color:red" data-x="1" onclick="alert(1)" onmouseover="alert(1)">' +
      '</map>'
    );
    const map = output().querySelector('map')!;
    expect(map.getAttributeNames()).toEqual(['name']);
    expect(map.querySelector('area')!.getAttributeNames()).toEqual(['shape', 'coords']);
  });

  it('drops an area outside any map', () => {
    make().setContent(`<p>${IMG}${AREA_RECT}</p>`);
    expect(output().querySelector('area')).toBeNull();
  });

  it.each([
    ['<map>'],
    ['<map name="">'],
    ['<map name="two words">'],
  ])('drops %s, which has no usable name', (open) => {
    make().setContent(`${IMG}${open}${AREA_RECT}</map>`);
    expect(output().querySelector('map')).toBeNull();
    expect(output().querySelector('area')).toBeNull();
  });

  it('drops the map in the basic editor, which has no images', () => {
    make({ basicEditor: true }).setContent(`<p>Text</p>${MAP}`);
    expect(output().querySelector('map')).toBeNull();
  });

  it('adds no blank line in the basic editor where it drops a map', () => {
    // A marked quote with a font is where a run of inline content gets its own line.
    const quote = (inner: string) => `<blockquote class="quoted" style="font-family: Georgia"><p>a</p>${inner}<p>b</p></blockquote>`;
    make({ basicEditor: true, quote_marker_class: 'quoted' }).setContent(quote(''));
    const without = editor.getContent();
    editor.setContent(quote(MAP));
    expect(editor.getContent()).toBe(without);
  });

  it('checks areas that do not come from HTML when writing them out', () => {
    make().setContent('<p></p>');
    editor.getTipTap()!.commands.insertContent({
      type: 'imageMap',
      attrs: { name: 'm', areas: [{ shape: 'rect', href: 'javascript:alert(1)', target: 'evil', onmouseover: 'alert(1)' }] },
    });
    const map = output().querySelector('map[name="m"]')!;
    expect(map.querySelector('area')!.getAttributeNames()).toEqual(['shape']);
  });
});

describe('Source view', () => {
  it('keeps the map when the source is saved and when it is opened again', () => {
    make();
    const source = new SourceEditor({ editor, trans: (key) => key });
    source.open();
    const textarea = document.querySelector<HTMLTextAreaElement>('.md-source-editor-textarea, .md-dialog textarea')!;
    textarea.value = IMAGE_MAP;
    document.querySelector<HTMLButtonElement>('.md-source-editor-save')!.click();

    expect(output().querySelector('img')?.getAttribute('usemap')).toBe('#workmap');
    expect(areas()).toHaveLength(2);

    source.open();
    expect(textarea.value).toContain('<map name="workmap">');
    expect(textarea.value).toContain('coords="337,300,44"');
    source.destroy();
  });
});

describe('paste', () => {
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

  it('keeps a pasted image map', () => {
    make().setContent('<p></p>');
    paste(IMAGE_MAP);
    expect(output().querySelector('img')?.getAttribute('usemap')).toBe('#workmap');
    expect(areas()).toHaveLength(2);
  });
});

describe('in the editor', () => {
  function view(): HTMLElement {
    return editor.getTipTap()!.view.dom as HTMLElement;
  }

  it('shows a marker instead of a live map, so the hotspots do nothing while editing', () => {
    make().setContent(IMAGE_MAP);
    expect(view().querySelector('map')).toBeNull();
    expect(view().querySelector('area')).toBeNull();
    expect(view().querySelector('.md-image-map')).not.toBeNull();
  });

  it.each([
    ['a resizable image', {}],
    ['an image that cannot be resized', { object_resizing: false }],
  ])('leaves usemap off %s in the editor, so it cannot use a map elsewhere on the page', (_label, config: EditorConfig) => {
    make(config).setContent(IMAGE_MAP);
    const img = view().querySelector('img.md-editor-image')!;
    expect(img.getAttribute('src')).toBe('https://example.com/workplace.jpg');
    expect(img.hasAttribute('usemap')).toBe(false);
    expect(output().querySelector('img')?.getAttribute('usemap')).toBe('#workmap');
  });

  it('updates an image that cannot be resized when its attributes change', () => {
    make({ object_resizing: false }).setContent(IMAGE_MAP);
    editor.getTipTap()!.commands.command(({ tr }) => {
      tr.doc.descendants((node, pos) => {
        if (node.type.name === 'image') tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt: 'Changed' });
      });
      return true;
    });
    const img = view().querySelector('img.md-editor-image')!;
    expect(img.getAttribute('alt')).toBe('Changed');
    expect(img.hasAttribute('usemap')).toBe(false);
  });

  it('says on the marker that the hotspots work in the saved content', () => {
    make().setContent(IMAGE_MAP);
    const marker = view().querySelector('.md-image-map')!;
    expect(marker.getAttribute('title')).toBe(NOTE);
    expect(marker.getAttribute('aria-label')).toBe(NOTE);
    expect(marker.getAttribute('contenteditable')).toBe('false');
  });

  it('says it in the editor\'s language', () => {
    make({ language: 'de' }).setContent(IMAGE_MAP);
    const title = view().querySelector('.md-image-map')!.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).not.toBe(NOTE);
  });

  it('says it in the new language after setLanguage()', () => {
    make().setContent(IMAGE_MAP);
    editor.setLanguage('de');
    const marker = view().querySelector('.md-image-map')!;
    expect(marker.getAttribute('title')).not.toBe(NOTE);
    expect(marker.getAttribute('aria-label')).toBe(marker.getAttribute('title'));
  });

  it('keeps what ProseMirror puts on an image that cannot be resized when the image changes', () => {
    make({ object_resizing: false }).setContent(IMAGE_MAP);
    const tiptap = editor.getTipTap()!;
    let imagePos = -1;
    tiptap.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') imagePos = pos;
    });
    tiptap.commands.setNodeSelection(imagePos);
    const img = view().querySelector('img.md-editor-image')!;
    // jsdom doesn't reflect contentEditable as an attribute; draggable shows.
    expect(img.getAttribute('draggable')).toBe('true');

    // Changed with the image still selected.
    tiptap.commands.command(({ tr }) => {
      tr.setNodeMarkup(imagePos, undefined, { ...tr.doc.nodeAt(imagePos)!.attrs, alt: 'Changed' });
      tr.setSelection(NodeSelection.create(tr.doc, imagePos));
      return true;
    });
    const changed = view().querySelector('img.md-editor-image')!;
    expect(changed.getAttribute('alt')).toBe('Changed');
    expect(changed.classList.contains('ProseMirror-selectednode')).toBe(true);
    expect(changed.getAttribute('draggable')).toBe('true');
    expect(changed.hasAttribute('usemap')).toBe(false);
  });

  it('keeps a decoration on an image that cannot be resized when the image changes', () => {
    make({ object_resizing: false }).setContent(IMAGE_MAP);
    const tiptap = editor.getTipTap()!;
    const imagePos = (): number => {
      let found = -1;
      tiptap.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') found = pos;
      });
      return found;
    };
    tiptap.registerPlugin(new Plugin({
      props: {
        decorations: (state) => {
          let pos = -1;
          state.doc.descendants((node, p) => {
            if (node.type.name === 'image') pos = p;
          });
          return DecorationSet.create(state.doc, [Decoration.node(pos, pos + 1, { class: 'highlight' })]);
        },
      },
    }));
    tiptap.commands.command(({ tr }) => {
      tr.setNodeMarkup(imagePos(), undefined, { ...tr.doc.nodeAt(imagePos())!.attrs, alt: 'Changed' });
      return true;
    });
    const img = view().querySelector('img.md-editor-image')!;
    expect(img.getAttribute('alt')).toBe('Changed');
    expect(img.classList.contains('highlight')).toBe(true);
  });

  it('gives an image with a map no resize handles, since resizing would move it off its hotspots', () => {
    make().setContent(`<p>${IMG}<map name="workmap">${AREA_RECT}</map> <img src="https://example.com/b.png" alt="Plain"></p>`);
    const wrappers = Array.from(view().querySelectorAll('.md-image-resize'));
    expect(wrappers).toHaveLength(2);
    const handles = (alt: string) =>
      wrappers.find((w) => w.querySelector(`img[alt="${alt}"]`))!.querySelectorAll('.md-image-resize-handle').length;
    expect(handles('Workplace')).toBe(0);
    expect(handles('Plain')).toBeGreaterThan(0);
  });
});
