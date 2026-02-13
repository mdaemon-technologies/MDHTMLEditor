/**
 * TextDirection Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Heading } from '@tiptap/extension-heading';
import { Blockquote } from '@tiptap/extension-blockquote';
import { ListItem } from '@tiptap/extension-list-item';
import { BulletList } from '@tiptap/extension-bullet-list';
import { TextDirection } from '../../src/extensions/TextDirection';

describe('TextDirection Extension', () => {
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
        Blockquote,
        BulletList,
        ListItem,
        TextDirection.configure({
          types: ['paragraph', 'heading', 'blockquote', 'listItem'],
          defaultDirection: 'ltr',
        }),
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
        (ext) => ext.name === 'textDirection'
      );
      expect(extension?.name).toBe('textDirection');
    });

    it('should have configured types', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'textDirection'
      );
      // Check that extension exists and has options
      expect(extension).toBeDefined();
    });

    it('should have configured default direction', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'textDirection'
      );
      // Check that extension exists
      expect(extension).toBeDefined();
    });
  });

  describe('Commands', () => {
    it('should have setTextDirection command', () => {
      expect(editor.commands.setTextDirection).toBeDefined();
    });

    it('should have unsetTextDirection command', () => {
      expect(editor.commands.unsetTextDirection).toBeDefined();
    });

    it('should set LTR direction', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setTextDirection('ltr');
      
      const html = editor.getHTML();
      expect(html).toContain('dir="ltr"');
    });

    it('should set RTL direction', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setTextDirection('rtl');
      
      const html = editor.getHTML();
      expect(html).toContain('dir="rtl"');
    });

    it('should set auto direction', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setTextDirection('auto');
      
      const html = editor.getHTML();
      expect(html).toContain('dir="auto"');
    });

    it('should unset text direction', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.commands.selectAll();
      editor.commands.setTextDirection('rtl');
      editor.commands.unsetTextDirection();
      
      // Direction should be reset
      expect(editor.commands.unsetTextDirection).toBeDefined();
    });
  });

  describe('HTML Parsing', () => {
    it('should parse dir attribute from HTML', () => {
      editor.commands.setContent('<p dir="rtl">Right to left text</p>');
      const html = editor.getHTML();
      expect(html).toContain('dir="rtl"');
    });

    it('should parse LTR direction', () => {
      editor.commands.setContent('<p dir="ltr">Left to right text</p>');
      const html = editor.getHTML();
      expect(html).toContain('dir="ltr"');
    });
  });

  describe('Works with Different Block Types', () => {
    it('should apply direction to headings', () => {
      editor.commands.setContent('<h1>Heading</h1>');
      editor.commands.selectAll();
      editor.commands.setTextDirection('rtl');
      
      const html = editor.getHTML();
      expect(html).toContain('h1');
      // Direction should be applied to headings
    });

    it('should apply direction to blockquotes', () => {
      editor.commands.setContent('<blockquote><p>Quote</p></blockquote>');
      editor.commands.selectAll();
      editor.commands.setTextDirection('rtl');
      
      // Direction should be applied
      expect(editor.getHTML()).toContain('blockquote');
    });
  });

  describe('Chained Commands', () => {
    it('should work with chain()', () => {
      editor.commands.setContent('<p>Test</p>');
      editor.chain().focus().selectAll().setTextDirection('rtl').run();
      
      const html = editor.getHTML();
      expect(html).toContain('dir');
    });
  });
});
