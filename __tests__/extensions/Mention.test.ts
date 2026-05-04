/**
 * Mention Extension Tests
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Mention } from '../../src/extensions/Mention';

describe('Mention Extension', () => {
  let editor: Editor;
  let element: HTMLElement;

  const mentionHTML = '<span class="composer-mention" contenteditable="false" data-jid="arron@example.com" data-display="Arron Caruth">@Arron Caruth</span>';

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    editor = new Editor({
      element,
      extensions: [
        Document,
        Paragraph,
        Text,
        Mention,
      ],
      content: '<p>Hello world</p>',
    });
  });

  afterEach(() => {
    editor?.destroy();
    element?.remove();
  });

  describe('Extension Configuration', () => {
    it('should have correct name', () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'mention'
      );
      expect(extension?.name).toBe('mention');
    });

    it('should be inline and atom', () => {
      const schema = editor.schema.nodes.mention;
      expect(schema).toBeDefined();
      expect(schema.isInline).toBe(true);
      expect(schema.isAtom).toBe(true);
    });
  });

  describe('parseHTML', () => {
    it('should parse a mention span from content', () => {
      editor.commands.setContent(`<p>Hello ${mentionHTML} how are you?</p>`);

      const html = editor.getHTML();
      expect(html).toContain('composer-mention');
      expect(html).toContain('data-jid="arron@example.com"');
      expect(html).toContain('data-display="Arron Caruth"');
      expect(html).toContain('@Arron Caruth');
    });

    it('should parse multiple mentions', () => {
      const mention2 = '<span class="composer-mention" contenteditable="false" data-jid="bob@example.com" data-display="Bob Smith">@Bob Smith</span>';
      editor.commands.setContent(`<p>${mentionHTML} and ${mention2}</p>`);

      const html = editor.getHTML();
      expect(html).toContain('data-jid="arron@example.com"');
      expect(html).toContain('data-jid="bob@example.com"');
      expect(html).toContain('@Arron Caruth');
      expect(html).toContain('@Bob Smith');
    });
  });

  describe('insertContent', () => {
    it('should insert a mention via insertContent', () => {
      editor.commands.setContent('<p>Hello </p>');
      editor.commands.focus('end');
      editor.commands.insertContent(mentionHTML);

      const html = editor.getHTML();
      expect(html).toContain('composer-mention');
      expect(html).toContain('data-jid="arron@example.com"');
      expect(html).toContain('data-display="Arron Caruth"');
    });

    it('should not escape mention HTML as text', () => {
      editor.commands.setContent('<p></p>');
      editor.commands.focus('end');
      editor.commands.insertContent(mentionHTML);

      const html = editor.getHTML();
      // Should NOT contain escaped HTML entities
      expect(html).not.toContain('&lt;span');
      expect(html).not.toContain('&gt;');
    });
  });

  describe('renderHTML', () => {
    it('should render with contenteditable false', () => {
      editor.commands.setContent(`<p>${mentionHTML}</p>`);

      const html = editor.getHTML();
      expect(html).toContain('contenteditable="false"');
    });

    it('should render with composer-mention class', () => {
      editor.commands.setContent(`<p>${mentionHTML}</p>`);

      const html = editor.getHTML();
      expect(html).toContain('class="composer-mention"');
    });
  });

  describe('Round-trip', () => {
    it('should preserve mention through setContent/getContent cycle', () => {
      const fullContent = `<p>Hey ${mentionHTML} check this out</p>`;
      editor.commands.setContent(fullContent);

      const html = editor.getHTML();
      expect(html).toContain('composer-mention');
      expect(html).toContain('data-jid="arron@example.com"');
      expect(html).toContain('data-display="Arron Caruth"');
      expect(html).toContain('@Arron Caruth');
      expect(html).toContain('Hey');
      expect(html).toContain('check this out');
    });
  });
});
