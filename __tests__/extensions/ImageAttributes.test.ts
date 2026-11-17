/**
 * Image attributes: the style, direction and language an image keeps.
 *
 * Editor content renders in the host page, so an image's style is never kept
 * whole: only float, margins and border, each value checked, on every way in
 * (HTML, JSON content) and out (getContent()).
 */

import { HTMLEditor, resetTranslate } from '../../src/core/HTMLEditor';
import { IMAGE_STYLE_RULES } from '../../src/extensions/ImageAttributes';
import type { EditorConfig } from '../../src/types';

const SRC = 'https://example.com/photo.png';

let container: HTMLElement;
let editor: HTMLEditor;

function make(config: EditorConfig = {}): HTMLEditor {
  editor = new HTMLEditor(container, config);
  return editor;
}

/** The first img of getContent(), parsed. */
function outputImage(): HTMLImageElement | null {
  return new DOMParser().parseFromString(editor.getContent(), 'text/html').body.querySelector('img');
}

/** The image node's attributes in the document. */
function imageAttrs(): Record<string, unknown> {
  let attrs: Record<string, unknown> = {};
  editor.getTipTap()!.state.doc.descendants((node) => {
    if (node.type.name === 'image') attrs = node.attrs;
  });
  return attrs;
}

function load(img: string, config: EditorConfig = {}): HTMLImageElement | null {
  make(config).setContent(`<p>${img} text</p>`);
  return outputImage();
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  editor?.destroy();
  container?.remove();
  resetTranslate();
});

describe('IMAGE_STYLE_RULES', () => {
  it('lists float, the four margins and the border', () => {
    expect(IMAGE_STYLE_RULES.map(([property]) => property)).toEqual([
      'float',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'border-width',
      'border-style',
      'border-color',
    ]);
  });
});

describe('style', () => {
  it.each([
    [false, 'resizable'],
    [true, 'not resizable'],
  ])('keeps float, margins and border through setContent and getContent (%s: %s)', (off) => {
    const img = load(
      `<img src="${SRC}" style="float: left; margin: 4px 10px; border-width: 2px; border-style: solid; border-color: #ff0000">`,
      off ? { object_resizing: false } : {}
    );
    expect(img?.style.getPropertyValue('float')).toBe('left');
    expect(img?.style.marginTop).toBe('4px');
    expect(img?.style.marginRight).toBe('10px');
    expect(img?.style.marginBottom).toBe('4px');
    expect(img?.style.marginLeft).toBe('10px');
    expect(img?.style.borderWidth).toBe('2px');
    expect(img?.style.borderStyle).toBe('solid');
    expect(img?.style.borderColor).toMatch(/^(#ff0000|rgb\(255, 0, 0\))$/);
    expect(img?.getAttribute('class')).toBe('md-editor-image');
  });

  it('keeps float right and none', () => {
    expect(load(`<img src="${SRC}" style="float: right">`)?.style.getPropertyValue('float')).toBe('right');
    editor.destroy();
    expect(load(`<img src="${SRC}" style="float: none">`)?.style.getPropertyValue('float')).toBe('none');
  });

  it('writes no style attribute for an image without one', () => {
    expect(load(`<img src="${SRC}">`)?.hasAttribute('style')).toBe(false);
    expect(imageAttrs().style).toBeNull();
  });

  describe('drops what is not on the list', () => {
    it.each([
      ['position', 'position: fixed; top: 0'],
      ['display', 'display: none'],
      ['width (the attribute holds the size)', 'width: 100px'],
      ['url()', 'border-image: url(https://example.test/x.png)'],
      ['background', 'background: url(javascript:alert(1))'],
      ['behavior', 'behavior: url(x.htc)'],
      ['z-index', 'z-index: 9999'],
    ])('%s', (_name, style) => {
      const img = load(`<img src="${SRC}" style="${style}; float: left">`);
      expect(img?.getAttribute('style')).toBe('float: left;');
    });
  });

  describe('drops a listed property whose value is not allowed', () => {
    it.each([
      ['a negative margin', 'margin-left: -20px'],
      ['calc()', 'margin-left: calc(100% - 2px)'],
      ['var()', 'margin-left: var(--x)'],
      ['a CSS-wide keyword', 'margin-left: inherit'],
      ['float: inline-start', 'float: inline-start'],
      ['a keyword border width', 'border-width: thin'],
      ['a viewport unit', 'margin-left: 1vw'],
      ['a rem margin', 'margin-top: 2rem'],
      ['a CSS-wide color keyword', 'border-color: unset'],
    ])('%s', (_name, style) => {
      const img = load(`<img src="${SRC}" style="${style}">`);
      expect(img?.hasAttribute('style')).toBe(false);
    });
  });

  it('checks the style of JSON content again on the way out', () => {
    make();
    editor.getTipTap()!.commands.setContent({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'image', attrs: { src: SRC, style: 'position: fixed; float: right; background: url(x)' } }],
      }],
    });
    expect(outputImage()?.getAttribute('style')).toBe('float: right;');
  });

  it('keeps nothing from JSON content whose style is not a string', () => {
    make();
    editor.getTipTap()!.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { src: SRC, style: { float: 'left' } } }] }],
    });
    expect(outputImage()?.hasAttribute('style')).toBe(false);
  });

  it('shows the kept style in the editor when object resizing is off', () => {
    load(`<img src="${SRC}" style="float: left; position: fixed">`, { object_resizing: false });
    const shown = container.querySelector('.md-editor-body img.md-editor-image') as HTMLImageElement;
    expect(shown.style.getPropertyValue('float')).toBe('left');
    expect(shown.style.position).toBe('');
  });

  it('is not there in the basic editor, which has no images', () => {
    make({ basicEditor: true }).setContent(`<p><img src="${SRC}" style="float: left"></p>`);
    expect(outputImage()).toBeNull();
  });
});

describe('legacy attributes, read into the style', () => {
  it.each([
    ['align="left"', 'float: left;'],
    ['align="RIGHT"', 'float: right;'],
    ['hspace="10"', 'margin-right: 10px; margin-left: 10px;'],
    ['vspace="5"', 'margin-top: 5px; margin-bottom: 5px;'],
    ['border="2"', 'border-width: 2px; border-style: solid;'],
    ['hspace="8px"', 'margin-right: 8px; margin-left: 8px;'],
  ])('%s', (attribute, style) => {
    expect(load(`<img src="${SRC}" ${attribute}>`)?.getAttribute('style')).toBe(style);
  });

  it('writes none of the old attributes back out', () => {
    const img = load(`<img src="${SRC}" align="left" hspace="10" vspace="5" border="2">`);
    for (const name of ['align', 'hspace', 'vspace', 'border']) expect(img?.hasAttribute(name)).toBe(false);
  });

  it('lets the style win over an old attribute for the same property', () => {
    const img = load(`<img src="${SRC}" align="left" hspace="10" border="2" style="float: right; margin-left: 3px; border-style: dashed">`);
    expect(img?.style.getPropertyValue('float')).toBe('right');
    expect(img?.style.marginLeft).toBe('3px');
    expect(img?.style.marginRight).toBe('10px');
    expect(img?.style.borderStyle).toBe('dashed');
    expect(img?.style.borderWidth).toBe('2px');
  });

  it.each([
    ['border="0", which only turned off old link borders', 'border="0"'],
    ['align="middle", a vertical alignment', 'align="middle"'],
    ['align="center"', 'align="center"'],
    ['a negative hspace', 'hspace="-5"'],
    ['a non-number vspace', 'vspace="5em; position: fixed"'],
    ['an enormous border', 'border="99999"'],
  ])('reads nothing from %s', (_name, attribute) => {
    expect(load(`<img src="${SRC}" ${attribute}>`)?.hasAttribute('style')).toBe(false);
  });
});

describe('width and height written as style', () => {
  it('become the width and height attributes', () => {
    const img = load(`<img src="${SRC}" style="width: 200px; height: 150px; float: left">`);
    expect(img?.getAttribute('width')).toBe('200');
    expect(img?.getAttribute('height')).toBe('150');
    expect(img?.getAttribute('style')).toBe('float: left;');
  });

  it('give way to the attributes when both are there', () => {
    const img = load(`<img src="${SRC}" width="300" height="100" style="width: 200px; height: 150px">`);
    expect(img?.getAttribute('width')).toBe('300');
    expect(img?.getAttribute('height')).toBe('100');
  });

  it('render each attribute once', () => {
    load(`<img src="${SRC}" style="width: 200px">`);
    expect(editor.getContent().match(/width=/g)).toHaveLength(1);
  });

  it.each([
    ['a percentage', 'width: 50%'],
    ['em', 'width: 20em'],
    ['auto', 'width: auto'],
    ['calc()', 'width: calc(100px + 1px)'],
  ])('keep nothing from %s', (_name, style) => {
    const img = load(`<img src="${SRC}" style="${style}">`);
    expect(img?.hasAttribute('width')).toBe(false);
  });

  it('keep the size an image is resized to', () => {
    load(`<img src="${SRC}" style="width: 200px; height: 150px">`);
    expect(imageAttrs().width).toBe(200);
    expect(imageAttrs().height).toBe(150);
  });
});

describe('dir and lang', () => {
  it.each(['ltr', 'rtl'])('keeps dir="%s"', (dir) => {
    expect(load(`<img src="${SRC}" dir="${dir}">`)?.getAttribute('dir')).toBe(dir);
  });

  it('reads dir in any case', () => {
    expect(load(`<img src="${SRC}" dir="RTL">`)?.getAttribute('dir')).toBe('rtl');
  });

  it.each(['auto', 'auto2', 'ltr rtl', ''])('drops dir="%s"', (dir) => {
    expect(load(`<img src="${SRC}" dir="${dir}">`)?.hasAttribute('dir')).toBe(false);
  });

  it.each(['en', 'fr-CA', 'zh-Hant-TW', 'sr-Latn', 'haw'])('keeps lang="%s"', (lang) => {
    expect(load(`<img src="${SRC}" lang="${lang}">`)?.getAttribute('lang')).toBe(lang);
  });

  it.each(['x onerror', 'e', 'english-language-code', 'en_US', '"><script>', 'en-'])('drops lang="%s"', (lang) => {
    const img = load(`<img src="${SRC}" lang='${lang}'>`);
    expect(img?.hasAttribute('lang')).toBe(false);
  });

  it('checks dir and lang of JSON content again on the way out', () => {
    make();
    editor.getTipTap()!.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { src: SRC, dir: 'sideways', lang: 'x y' } }] }],
    });
    const img = outputImage();
    expect(img?.hasAttribute('dir')).toBe(false);
    expect(img?.hasAttribute('lang')).toBe(false);
  });
});
