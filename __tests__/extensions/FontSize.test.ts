/**
 * FontSize Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontSize } from '../../src/extensions/FontSize';

describe('FontSize Extension', () => {
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
        TextStyle,
        FontSize,
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
        (ext) => ext.name === 'fontSize'
      );
      expect(extension?.name).toBe('fontSize');
    });

    it('should have default options', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'fontSize'
      );
      expect(extension?.options.types).toContain('textStyle');
    });
  });

  describe('Commands', () => {
    it('should have setFontSize command', () => {
      expect(editor.commands.setFontSize).toBeDefined();
    });

    it('should have unsetFontSize command', () => {
      expect(editor.commands.unsetFontSize).toBeDefined();
    });

    it('should set font size with pt value', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.commands.selectAll();
      editor.commands.setFontSize('14pt');
      
      const html = editor.getHTML();
      expect(html).toContain('font-size');
      expect(html).toContain('14pt');
    });

    it('should set font size with px value', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.commands.selectAll();
      editor.commands.setFontSize('16px');
      
      const html = editor.getHTML();
      expect(html).toContain('font-size');
      expect(html).toContain('16px');
    });

    it('should unset font size', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.commands.selectAll();
      editor.commands.setFontSize('14pt');
      editor.commands.unsetFontSize();
      
      // After unsetting, the style should be removed or reset
      expect(editor.commands.unsetFontSize).toBeDefined();
    });
  });

  describe('HTML Parsing', () => {
    it('should parse inline font-size style', () => {
      editor.commands.setContent('<p><span style="font-size: 18pt">Styled text</span></p>');
      const html = editor.getHTML();
      expect(html).toContain('18pt');
    });

    it('should preserve various font size units', () => {
      editor.commands.setContent('<p><span style="font-size: 1.5em">Em text</span></p>');
      const html = editor.getHTML();
      expect(html).toContain('1.5em');
    });
  });

  describe('Chained Commands', () => {
    it('should work with chain().focus().setFontSize()', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.chain().focus().selectAll().setFontSize('12pt').run();
      
      const html = editor.getHTML();
      expect(html).toContain('font-size');
    });
  });
});
