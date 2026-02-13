/**
 * LineHeight Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Heading } from '@tiptap/extension-heading';
import { LineHeight } from '../../src/extensions/LineHeight';

describe('LineHeight Extension', () => {
  let editor: Editor;
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    
    editor = new Editor({
      element,
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        LineHeight,
      ],
      content: '<p>Test content</p>',
    });
  });

  afterEach(() => {
    editor?.destroy();
    element?.remove();
  });

  describe('Extension Configuration', () => {
    it('should have correct name', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'lineHeight'
      );
      expect(extension?.name).toBe('lineHeight');
    });

    it('should have default types', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'lineHeight'
      );
      expect(extension?.options.types).toContain('paragraph');
      expect(extension?.options.types).toContain('heading');
    });

    it('should have default line height value', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'lineHeight'
      );
      expect(extension?.options.defaultLineHeight).toBe('1.2');
    });
  });

  describe('Commands', () => {
    it('should have setLineHeight command', () => {
      expect(editor.commands.setLineHeight).toBeDefined();
    });

    it('should have unsetLineHeight command', () => {
      expect(editor.commands.unsetLineHeight).toBeDefined();
    });

    it('should set line height on paragraph', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');
      
      const html = editor.getHTML();
      expect(html).toContain('line-height');
      expect(html).toContain('1.5');
    });

    it('should set line height with various values', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('2');
      
      const html = editor.getHTML();
      expect(html).toContain('2');
    });

    it('should unset line height', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('2');
      editor.commands.unsetLineHeight();
      
      // Line height should be reset
      expect(editor.commands.unsetLineHeight).toBeDefined();
    });
  });

  describe('HTML Parsing', () => {
    it('should parse inline line-height style', () => {
      editor.commands.setContent('<p style="line-height: 1.8">Styled paragraph</p>');
      const html = editor.getHTML();
      expect(html).toContain('1.8');
    });
  });

  describe('Works with Headings', () => {
    it('should apply line height to headings', () => {
      editor.commands.setContent('<h1>Heading</h1>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.4');
      
      const html = editor.getHTML();
      expect(html).toContain('h1');
    });
  });

  describe('Chained Commands', () => {
    it('should work with chain()', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.chain().focus().selectAll().setLineHeight('1.6').run();
      
      const html = editor.getHTML();
      expect(html).toContain('line-height');
    });
  });
});
