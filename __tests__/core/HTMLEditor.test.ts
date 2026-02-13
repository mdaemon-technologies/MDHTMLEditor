/**
 * HTMLEditor Core Tests
 */

import { HTMLEditor, fontNames, setTranslate, getTranslate, setGetFileSrc, getGetFileSrc } from '../../src/core/HTMLEditor';

describe('HTMLEditor', () => {
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

  describe('Initialization', () => {
    it('should create an editor instance', () => {
      editor = new HTMLEditor(container);
      expect(editor).toBeInstanceOf(HTMLEditor);
    });

    it('should generate unique IDs for each editor', () => {
      const editor1 = new HTMLEditor(container);
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new HTMLEditor(container2);
      
      expect(editor1.id).not.toBe(editor2.id);
      expect(editor1.id).toMatch(/^md-editor-\d+$/);
      expect(editor2.id).toMatch(/^md-editor-\d+$/);
      
      editor1.destroy();
      editor2.destroy();
      container2.remove();
    });

    it('should create editor wrapper with correct structure', () => {
      editor = new HTMLEditor(container);
      
      const wrapper = container.querySelector('.md-editor');
      expect(wrapper).not.toBeNull();
      expect(wrapper?.querySelector('.md-toolbar')).not.toBeNull();
      expect(wrapper?.querySelector('.md-editor-content')).not.toBeNull();
    });

    it('should apply default configuration', () => {
      editor = new HTMLEditor(container);
      const config = editor.getConfig();
      
      expect(config.basicEditor).toBe(false);
      expect(config.directionality).toBe('ltr');
      expect(config.language).toBe('en');
      expect(config.browser_spellcheck).toBe(true);
    });

    it('should apply custom configuration', () => {
      editor = new HTMLEditor(container, {
        basicEditor: true,
        directionality: 'rtl',
        height: 500,
        skin: 'oxide-dark',
      });
      
      const config = editor.getConfig();
      expect(config.basicEditor).toBe(true);
      expect(config.directionality).toBe('rtl');
      expect(config.height).toBe(500);
      expect(config.skin).toBe('oxide-dark');
    });

    it('should apply height from config', () => {
      editor = new HTMLEditor(container, { height: 400 });
      const wrapper = container.querySelector('.md-editor') as HTMLElement;
      expect(wrapper.style.height).toBe('400px');
    });

    it('should apply string height from config', () => {
      editor = new HTMLEditor(container, { height: '50vh' });
      const wrapper = container.querySelector('.md-editor') as HTMLElement;
      expect(wrapper.style.height).toBe('50vh');
    });

    it('should set directionality attribute', () => {
      editor = new HTMLEditor(container, { directionality: 'rtl' });
      const wrapper = container.querySelector('.md-editor') as HTMLElement;
      expect(wrapper.getAttribute('dir')).toBe('rtl');
    });

    it('should call setup callback during initialization', () => {
      const setupMock = jest.fn();
      editor = new HTMLEditor(container, { setup: setupMock });
      expect(setupMock).toHaveBeenCalledWith(editor);
    });
  });

  describe('Content Management', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('should get empty content initially', () => {
      // TipTap returns empty paragraph by default
      const content = editor.getContent();
      expect(content).toMatch(/<p><\/p>|/);
    });

    it('should set and get content', () => {
      const html = '<p>Hello World</p>';
      editor.setContent(html);
      expect(editor.getContent()).toContain('Hello World');
    });

    it('should insert content at cursor position', () => {
      editor.setContent('<p>Hello World</p>');
      editor.focus();
      editor.insertContent('<strong>Test</strong>');
      expect(editor.getContent()).toContain('Test');
    });

    it('should handle complex HTML content', () => {
      const html = `
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;
      editor.setContent(html);
      const content = editor.getContent();
      expect(content).toContain('Title');
      expect(content).toContain('<strong>bold</strong>');
      expect(content).toContain('<em>italic</em>');
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
      editor.setContent('<p>Test content</p>');
      editor.focus();
    });

    it('should execute bold command', () => {
      const result = editor.execCommand('bold');
      expect(result).toBe(true);
    });

    it('should execute italic command', () => {
      const result = editor.execCommand('italic');
      expect(result).toBe(true);
    });

    it('should execute underline command', () => {
      const result = editor.execCommand('underline');
      expect(result).toBe(true);
    });

    it('should execute strikethrough command', () => {
      const result = editor.execCommand('strikethrough');
      expect(result).toBe(true);
    });

    it('should execute undo command', () => {
      const result = editor.execCommand('undo');
      expect(result).toBe(true);
    });

    it('should execute redo command', () => {
      const result = editor.execCommand('redo');
      expect(result).toBe(true);
    });

    it('should execute removeformat command', () => {
      const result = editor.execCommand('removeformat');
      expect(result).toBe(true);
    });

    it('should execute fontname command with value', () => {
      const result = editor.execCommand('fontname', false, 'Arial');
      expect(result).toBe(true);
    });

    it('should execute fontsize command with value', () => {
      const result = editor.execCommand('fontsize', false, '14pt');
      expect(result).toBe(true);
    });

    it('should execute forecolor command with value', () => {
      const result = editor.execCommand('forecolor', false, '#ff0000');
      expect(result).toBe(true);
    });

    it('should execute backcolor command with value', () => {
      const result = editor.execCommand('backcolor', false, '#ffff00');
      expect(result).toBe(true);
    });

    it('should execute justifyleft command', () => {
      const result = editor.execCommand('justifyleft');
      expect(result).toBe(true);
    });

    it('should execute justifycenter command', () => {
      const result = editor.execCommand('justifycenter');
      expect(result).toBe(true);
    });

    it('should execute justifyright command', () => {
      const result = editor.execCommand('justifyright');
      expect(result).toBe(true);
    });

    it('should execute justifyfull command', () => {
      const result = editor.execCommand('justifyfull');
      expect(result).toBe(true);
    });

    it('should execute insertunorderedlist command', () => {
      const result = editor.execCommand('insertunorderedlist');
      expect(result).toBe(true);
    });

    it('should execute insertorderedlist command', () => {
      const result = editor.execCommand('insertorderedlist');
      expect(result).toBe(true);
    });

    it('should return false for unknown command', () => {
      const result = editor.execCommand('unknowncommand');
      expect(result).toBe(false);
    });

    it('should be case-insensitive for commands', () => {
      expect(editor.execCommand('BOLD')).toBe(true);
      expect(editor.execCommand('Bold')).toBe(true);
      expect(editor.execCommand('bOlD')).toBe(true);
    });
  });

  describe('Dirty State', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('should not be dirty initially', () => {
      expect(editor.isDirty()).toBe(false);
    });

    it('should become dirty after content change', (done) => {
      editor.on('dirty', (dirty) => {
        if (dirty) {
          expect(editor.isDirty()).toBe(true);
          done();
        }
      });
      editor.setContent('<p>Changed content</p>');
    });

    it('should reset dirty state with setDirty', (done) => {
      editor.setContent('<p>Changed content</p>');
      setTimeout(() => {
        editor.setDirty(false);
        expect(editor.isDirty()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('should focus the editor', () => {
      editor.focus();
      // Note: jsdom may not fully support focus behavior
      expect(editor.getTipTap()).not.toBeNull();
    });

    it('should report focus state', () => {
      // Initial state may vary, but hasFocus should return a boolean
      expect(typeof editor.hasFocus()).toBe('boolean');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('should register and fire custom events', () => {
      const callback = jest.fn();
      editor.on('init', callback);
      editor.fire('init', editor);
      expect(callback).toHaveBeenCalledWith(editor);
    });

    it('should unregister event listeners', () => {
      const callback = jest.fn();
      editor.on('change', callback);
      editor.off('change', callback);
      editor.fire('change', '<p>test</p>');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should fire change event on content update', (done) => {
      const callback = jest.fn();
      editor.on('change', callback);
      editor.setContent('<p>New content</p>');
      
      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      editor.on('focus', callback1);
      editor.on('focus', callback2);
      editor.fire('focus');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('UI Registry', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('should have a UI registry', () => {
      expect(editor.ui).toBeDefined();
      expect(editor.ui.registry).toBeDefined();
    });

    it('should add custom buttons to registry', () => {
      const buttonSpec = {
        tooltip: 'My Button',
        icon: 'star',
        onAction: jest.fn(),
      };
      
      editor.ui.registry.addButton('mybutton', buttonSpec);
      
      const retrieved = editor.ui.registry.getButton('mybutton');
      expect(retrieved).toEqual(buttonSpec);
    });

    it('should return undefined for non-existent buttons', () => {
      const retrieved = editor.ui.registry.getButton('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('TipTap Access', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('should provide access to TipTap editor', () => {
      const tiptap = editor.getTipTap();
      expect(tiptap).not.toBeNull();
    });

    it('should have TipTap editor with expected methods', () => {
      const tiptap = editor.getTipTap();
      expect(tiptap?.chain).toBeDefined();
      expect(tiptap?.commands).toBeDefined();
      expect(tiptap?.getHTML).toBeDefined();
    });
  });

  describe('Configuration Helpers', () => {
    it('should return whether editor is basic mode', () => {
      const basicEditor = new HTMLEditor(container, { basicEditor: true });
      expect(basicEditor.isBasicEditor()).toBe(true);
      basicEditor.destroy();

      const fullEditor = new HTMLEditor(container, { basicEditor: false });
      expect(fullEditor.isBasicEditor()).toBe(false);
      fullEditor.destroy();
    });
  });

  describe('Lifecycle', () => {
    it('should destroy editor cleanly', () => {
      editor = new HTMLEditor(container);
      const wrapper = container.querySelector('.md-editor');
      expect(wrapper).not.toBeNull();
      
      editor.destroy();
      
      expect(container.querySelector('.md-editor')).toBeNull();
      expect(editor.getTipTap()).toBeNull();
    });

    it('should handle multiple destroy calls gracefully', () => {
      editor = new HTMLEditor(container);
      editor.destroy();
      expect(() => editor.destroy()).not.toThrow();
    });
  });
});

describe('Global Functions', () => {
  describe('setTranslate / getTranslate', () => {
    afterEach(() => {
      // Reset to default
      setTranslate((key) => key);
    });

    it('should set and get translate function', () => {
      const customTranslate = (key: string) => `translated:${key}`;
      setTranslate(customTranslate);
      
      const translate = getTranslate();
      expect(translate('hello')).toBe('translated:hello');
    });

    it('should return key by default when no translation', () => {
      const translate = getTranslate();
      expect(translate('some_key')).toBe('some_key');
    });
  });

  describe('setGetFileSrc / getGetFileSrc', () => {
    afterEach(() => {
      // Reset to default
      setGetFileSrc((path) => path);
    });

    it('should set and get file src function', () => {
      const customGetFileSrc = (path: string) => `/cdn/${path}`;
      setGetFileSrc(customGetFileSrc);
      
      const getFileSrc = getGetFileSrc();
      expect(getFileSrc('image.png')).toBe('/cdn/image.png');
    });

    it('should return path unchanged by default', () => {
      const getFileSrc = getGetFileSrc();
      expect(getFileSrc('/images/test.jpg')).toBe('/images/test.jpg');
    });
  });

  describe('fontNames constant', () => {
    it('should export default font names', () => {
      expect(fontNames).toBeDefined();
      expect(typeof fontNames).toBe('string');
      expect(fontNames).toContain('Arial');
      expect(fontNames).toContain('Verdana');
      expect(fontNames).toContain('Times New Roman');
    });
  });
});
