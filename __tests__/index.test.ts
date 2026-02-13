/**
 * Index Exports Tests
 */

import {
  HTMLEditor,
  fontNames,
  setTranslate,
  getTranslate,
  setGetFileSrc,
  getGetFileSrc,
  Toolbar,
  FontSize,
  LineHeight,
  TextDirection,
  CharacterMap,
  CHAR_MAP,
  EmojiPicker,
  EMOJI_CATEGORIES,
  SearchReplace,
} from '../src';

describe('Package Exports', () => {
  describe('Core Exports', () => {
    it('should export HTMLEditor class', () => {
      expect(HTMLEditor).toBeDefined();
      expect(typeof HTMLEditor).toBe('function');
    });

    it('should export Toolbar class', () => {
      expect(Toolbar).toBeDefined();
      expect(typeof Toolbar).toBe('function');
    });

    it('should export fontNames constant', () => {
      expect(fontNames).toBeDefined();
      expect(typeof fontNames).toBe('string');
    });

    it('should export setTranslate function', () => {
      expect(setTranslate).toBeDefined();
      expect(typeof setTranslate).toBe('function');
    });

    it('should export getTranslate function', () => {
      expect(getTranslate).toBeDefined();
      expect(typeof getTranslate).toBe('function');
    });

    it('should export setGetFileSrc function', () => {
      expect(setGetFileSrc).toBeDefined();
      expect(typeof setGetFileSrc).toBe('function');
    });

    it('should export getGetFileSrc function', () => {
      expect(getGetFileSrc).toBeDefined();
      expect(typeof getGetFileSrc).toBe('function');
    });
  });

  describe('Extension Exports', () => {
    it('should export FontSize extension', () => {
      expect(FontSize).toBeDefined();
      expect(FontSize.name).toBe('fontSize');
    });

    it('should export LineHeight extension', () => {
      expect(LineHeight).toBeDefined();
      expect(LineHeight.name).toBe('lineHeight');
    });

    it('should export TextDirection extension', () => {
      expect(TextDirection).toBeDefined();
      expect(TextDirection.name).toBe('textDirection');
    });
  });

  describe('UI Component Exports', () => {
    it('should export CharacterMap class', () => {
      expect(CharacterMap).toBeDefined();
      expect(typeof CharacterMap).toBe('function');
    });

    it('should export CHAR_MAP data', () => {
      expect(CHAR_MAP).toBeDefined();
      expect(Array.isArray(CHAR_MAP)).toBe(true);
    });

    it('should export EmojiPicker class', () => {
      expect(EmojiPicker).toBeDefined();
      expect(typeof EmojiPicker).toBe('function');
    });

    it('should export EMOJI_CATEGORIES data', () => {
      expect(EMOJI_CATEGORIES).toBeDefined();
      expect(Array.isArray(EMOJI_CATEGORIES)).toBe(true);
    });

    it('should export SearchReplace class', () => {
      expect(SearchReplace).toBeDefined();
      expect(typeof SearchReplace).toBe('function');
    });
  });

  describe('Editor Instantiation', () => {
    let container: HTMLElement;
    let editor: HTMLEditor;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      editor?.destroy();
      container?.remove();
    });

    it('should create HTMLEditor instance from export', () => {
      editor = new HTMLEditor(container);
      expect(editor).toBeInstanceOf(HTMLEditor);
    });

    it('should be able to use setTranslate with editor', () => {
      const translate = (key: string) => `translated_${key}`;
      setTranslate(translate);
      
      editor = new HTMLEditor(container);
      
      const currentTranslate = getTranslate();
      expect(currentTranslate('test')).toBe('translated_test');
      
      // Reset
      setTranslate((key) => key);
    });
  });
});

describe('Type Exports', () => {
  // These tests verify that types can be imported without errors
  // The actual type checking is done by TypeScript compiler
  
  it('should be able to import types without errors', async () => {
    // Dynamic import to test types
    const types = await import('../src/types');
    
    // Verify the module loaded
    expect(types).toBeDefined();
  });
});
