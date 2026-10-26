/**
 * Links on images.
 *
 * An image is inline, as in TinyMCE and in mail HTML, so it sits in a line of
 * text and can carry the link mark. As a block node it was lifted out of its
 * paragraph on import, the <a> around it was dropped, and an image between
 * words split its paragraph into three blocks.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { EditorConfig } from '../../src/types';

const IMG = '<img src="https://example.com/logo.png" alt="logo">';
const LINKED_IMG = `<a href="https://www.example.com/">${IMG}</a>`;

let container: HTMLElement;
let editor: HTMLEditor;

function make(config: EditorConfig = {}): HTMLEditor {
  editor = new HTMLEditor(container, config);
  return editor;
}

/** getContent() parsed, so assertions don't depend on attribute order or block style. */
function output(): HTMLElement {
  return new DOMParser().parseFromString(editor.getContent(), 'text/html').body;
}

/** The href of the link around the first image, or null when it has none. */
function imageHref(): string | null {
  const img = output().querySelector('img');
  return img?.closest('a')?.getAttribute('href') ?? null;
}

/** Node-select the first image in the document. */
function selectImage(): void {
  const tiptap = editor.getTipTap()!;
  let imagePos = -1;
  tiptap.state.doc.descendants((node, pos) => {
    if (imagePos === -1 && node.type.name === 'image') imagePos = pos;
  });
  tiptap.commands.setNodeSelection(imagePos);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  editor?.destroy();
  container?.remove();
});

describe('links on images', () => {
  it('keeps the link around an image in a paragraph', () => {
    make().setContent(`<p>${LINKED_IMG}</p>`);
    expect(imageHref()).toBe('https://www.example.com/');
    expect(output().children).toHaveLength(1);
  });

  it('keeps the link with div blocks, without an empty block before it', () => {
    make({ forced_root_block: 'div', format_empty_lines: true }).setContent(`<div>${LINKED_IMG}</div>`);
    const body = output();
    expect(imageHref()).toBe('https://www.example.com/');
    expect(body.children).toHaveLength(1);
    expect(body.firstElementChild!.tagName).toBe('DIV');
    expect(body.querySelector('div > a > img')).not.toBeNull();
  });

  it('wraps a linked image outside any block in a block, keeping the link', () => {
    make().setContent(LINKED_IMG);
    const body = output();
    expect(imageHref()).toBe('https://www.example.com/');
    expect(body.querySelector('p > a > img')).not.toBeNull();
  });

  it('keeps a mailto: link on an image', () => {
    make().setContent(`<p><a href="mailto:sales@example.com">${IMG}</a></p>`);
    expect(imageHref()).toBe('mailto:sales@example.com');
  });

  it('keeps a placeholder link (href="") on an image', () => {
    make().setContent(`<p><a href="">${IMG}</a></p>`);
    expect(output().querySelector('a[href=""] > img')).not.toBeNull();
  });

  it('keeps the link when a linked image is inserted with insertContent()', () => {
    make().setContent('<p>Logo: </p>');
    editor.getTipTap()!.commands.setTextSelection(editor.getTipTap()!.state.doc.content.size - 1);
    editor.insertContent(LINKED_IMG);
    expect(imageHref()).toBe('https://www.example.com/');
  });

  it('keeps two images in one link inside that link', () => {
    make().setContent(`<p><a href="https://www.example.com/">${IMG}<img src="https://example.com/b.png"></a></p>`);
    const links = output().querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].querySelectorAll('img')).toHaveLength(2);
  });

  it('keeps the link on an image inside the signature block', () => {
    make().setContent(`<div id="signature"><p>${LINKED_IMG}</p></div>`);
    const img = output().querySelector('#signature img');
    expect(img?.closest('a')?.getAttribute('href')).toBe('https://www.example.com/');
  });

  it('removes the link from a selected image with unlink, keeping the image', () => {
    make().setContent(`<p>${LINKED_IMG}</p>`);
    expect(imageHref()).toBe('https://www.example.com/');

    selectImage();
    editor.execCommand('unlink');

    expect(output().querySelector('img')).not.toBeNull();
    expect(imageHref()).toBeNull();
  });

  // Security guard: passes before and after the fix by design.
  it('drops a javascript: link around an image and keeps the image', () => {
    make().setContent('<p><a href="javascript:alert(1)">' + IMG + '</a></p>');
    expect(output().querySelector('img')).not.toBeNull();
    expect(output().querySelector('a')).toBeNull();
  });
});

describe('images in a line of text', () => {
  it('keeps an image between words in one block', () => {
    make().setContent('<p>Hello <img src="https://example.com/a.png"> world</p>');
    const body = output();
    expect(body.children).toHaveLength(1);
    expect(body.firstElementChild!.textContent).toBe('Hello  world');
    expect(body.querySelector('p > img')).not.toBeNull();
  });
});
