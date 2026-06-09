/**
 * BlockFontStyle Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Heading } from '@tiptap/extension-heading';
import { Text } from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from '../../src/extensions/FontSize';
import { BlockFontStyle } from '../../src/extensions/BlockFontStyle';

describe('BlockFontStyle Extension', () => {
  let editor: Editor;
  let element: HTMLElement;

  function createEditor(content: string): Editor {
    return new Editor({
      element,
      extensions: [
        Document,
        Paragraph,
        Heading,
        Text,
        TextStyle,
        FontFamily,
        FontSize,
        BlockFontStyle.configure({
          defaultFontFamily: 'arial, helvetica, sans-serif',
          defaultFontSize: '12pt',
        }),
      ],
      content,
    });
  }

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    editor?.destroy();
    element?.remove();
  });

  it('should have correct name', () => {
    editor = createEditor('<p>Hi</p>');
    const ext = editor.extensionManager.extensions.find(e => e.name === 'blockFontStyle');
    expect(ext?.name).toBe('blockFontStyle');
  });

  it('inlines the default font-family and font-size on a paragraph', () => {
    editor = createEditor('<p>Hello</p>');
    const html = editor.getHTML();
    expect(html).toContain('font-family: arial, helvetica, sans-serif');
    expect(html).toContain('font-size: 12pt');
  });

  it('inlines font-family on headings but not the default font-size', () => {
    editor = createEditor('<h1>Title</h1>');
    const html = editor.getHTML();
    expect(html).toContain('font-family: arial, helvetica, sans-serif');
    // headings keep their level-based sizing, no forced font-size
    expect(html).not.toContain('font-size: 12pt');
  });

  it('uses configured defaults', () => {
    editor = new Editor({
      element,
      extensions: [
        Document,
        Paragraph,
        Text,
        TextStyle,
        FontSize,
        BlockFontStyle.configure({
          defaultFontFamily: 'Courier New, monospace',
          defaultFontSize: '14pt',
        }),
      ],
      content: '<p>Hi</p>',
    });
    const html = editor.getHTML();
    expect(html).toContain('font-family: Courier New, monospace');
    expect(html).toContain('font-size: 14pt');
  });

  it('parses an explicit block font-size instead of the default', () => {
    editor = createEditor('<p style="font-size: 20pt">Big block</p>');
    const html = editor.getHTML();
    expect(html).toContain('font-size: 20pt');
    expect(html).not.toContain('font-size: 12pt');
  });

  it('lets an inline span override the block default for part of a paragraph', () => {
    // "this is A BIG font, and this is a small font" — mixed sizes in one block
    editor = createEditor('<p>start</p>');
    editor.commands.setContent('<p>start</p>');
    editor.commands.selectAll();
    editor.commands.setFontSize('24pt');

    const html = editor.getHTML();
    // block default still present on the paragraph
    expect(html).toContain('font-size: 12pt');
    // inline override present as a span
    expect(html).toContain('font-size: 24pt');
    expect(html).toContain('<span');
  });
});
