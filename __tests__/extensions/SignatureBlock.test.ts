/**
 * SignatureBlock Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { SignatureBlock } from '../../src/extensions/SignatureBlock';

describe('SignatureBlock Extension', () => {
  let editor: Editor;
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    editor = new Editor({
      element,
      extensions: [Document, Paragraph, Text, SignatureBlock],
      content: '<p>Test content</p>',
    });
  });

  afterEach(() => {
    editor?.destroy();
    element?.remove();
  });

  describe('Extension Configuration', () => {
    it('should have correct name', () => {
      const ext = editor.extensionManager.extensions.find(
        (e) => e.name === 'signatureBlock'
      );
      expect(ext).toBeDefined();
      expect(ext?.name).toBe('signatureBlock');
    });

    it('should be a node extension', () => {
      const ext = editor.extensionManager.extensions.find(
        (e) => e.name === 'signatureBlock'
      );
      expect(ext?.type).toBe('node');
    });

    it('should have default id attribute of "signature"', () => {
      const ext = editor.extensionManager.extensions.find(
        (e) => e.name === 'signatureBlock'
      );
      const schema = editor.schema.nodes.signatureBlock;
      expect(schema).toBeDefined();
      expect(schema.spec.attrs?.id?.default).toBe('signature');
    });
  });

  describe('HTML Parsing', () => {
    it('should parse <div id="signature"> from HTML', () => {
      editor.commands.setContent(
        '<p>Body text</p><div id="signature"><p>Best regards,</p><p>John</p></div>'
      );
      const html = editor.getHTML();
      expect(html).toContain('id="signature"');
      expect(html).toContain('Best regards,');
      expect(html).toContain('John');
    });

    it('should preserve signature block content through round-trip', () => {
      const input = '<p>Body</p><div id="signature"><p>Signed,</p><p>Alice</p></div>';
      editor.commands.setContent(input);
      const output = editor.getHTML();
      expect(output).toContain('id="signature"');
      expect(output).toContain('Signed,');
      expect(output).toContain('Alice');
    });

    it('should not parse div without id="signature"', () => {
      editor.commands.setContent('<p>Body</p><div id="other"><p>Content</p></div>');
      const html = editor.getHTML();
      // Should not create a signatureBlock node — the div is treated as generic content
      expect(html).not.toContain('id="other"');
    });

    it('should handle nested block content inside signature', () => {
      editor.commands.setContent(
        '<div id="signature"><p>Line 1</p><p>Line 2</p><p>Line 3</p></div>'
      );
      const html = editor.getHTML();
      expect(html).toContain('id="signature"');
      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
      expect(html).toContain('Line 3');
    });
  });

  describe('HTML Rendering', () => {
    it('should render as <div> element', () => {
      editor.commands.setContent(
        '<div id="signature"><p>Signature</p></div>'
      );
      const html = editor.getHTML();
      expect(html).toMatch(/<div\s[^>]*id="signature"[^>]*>/);
    });

    it('should render with id attribute', () => {
      editor.commands.setContent(
        '<div id="signature"><p>Signature</p></div>'
      );
      const html = editor.getHTML();
      expect(html).toContain('id="signature"');
    });
  });

  describe('Schema Properties', () => {
    it('should be in the block group', () => {
      const nodeType = editor.schema.nodes.signatureBlock;
      expect(nodeType.spec.group).toBe('block');
    });

    it('should accept block content', () => {
      const nodeType = editor.schema.nodes.signatureBlock;
      expect(nodeType.spec.content).toBe('block+');
    });

    it('should be defining', () => {
      const nodeType = editor.schema.nodes.signatureBlock;
      expect(nodeType.spec.defining).toBe(true);
    });

    it('should be isolating', () => {
      const nodeType = editor.schema.nodes.signatureBlock;
      expect(nodeType.spec.isolating).toBe(true);
    });
  });

  describe('Signature Querying', () => {
    it('should be findable via querySelector on rendered DOM', () => {
      editor.commands.setContent(
        '<p>Body</p><div id="signature"><p>My Signature</p></div>'
      );
      const editorEl = element.querySelector('.ProseMirror') ?? element;
      const sigDiv = editorEl.querySelector('#signature');
      expect(sigDiv).not.toBeNull();
      expect(sigDiv?.textContent).toContain('My Signature');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content set after signature', () => {
      editor.commands.setContent(
        '<p>Body</p><div id="signature"><p>Sig</p></div>'
      );
      expect(editor.getHTML()).toContain('id="signature"');

      editor.commands.setContent('<p>New body</p>');
      expect(editor.getHTML()).not.toContain('id="signature"');
      expect(editor.getHTML()).toContain('New body');
    });

    it('should handle signature with only whitespace content', () => {
      editor.commands.setContent(
        '<div id="signature"><p> </p></div>'
      );
      const html = editor.getHTML();
      expect(html).toContain('id="signature"');
    });
  });
});
