/**
 * CharacterMap Tests
 */

import { CharacterMap, CHAR_MAP } from '../../src/extensions/CharacterMap';

describe('CharacterMap', () => {
  let charMap: CharacterMap;
  let onSelectMock: jest.Mock;
  let transMock: jest.Mock;

  beforeEach(() => {
    onSelectMock = jest.fn();
    transMock = jest.fn((key) => key);
    
    charMap = new CharacterMap({
      onSelect: onSelectMock,
      trans: transMock,
    });
  });

  afterEach(() => {
    charMap?.destroy();
    // Clean up any dialogs that may remain
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  describe('CHAR_MAP Data', () => {
    it('should export character map data', () => {
      expect(CHAR_MAP).toBeDefined();
      expect(Array.isArray(CHAR_MAP)).toBe(true);
    });

    it('should have currency category', () => {
      const currency = CHAR_MAP.find(c => c.category === 'Currency');
      expect(currency).toBeDefined();
      expect(currency?.chars.length).toBeGreaterThan(0);
    });

    it('should have math category', () => {
      const math = CHAR_MAP.find(c => c.category === 'Math');
      expect(math).toBeDefined();
      expect(math?.chars).toContainEqual(expect.objectContaining({ char: '±' }));
    });

    it('should have arrows category', () => {
      const arrows = CHAR_MAP.find(c => c.category === 'Arrows');
      expect(arrows).toBeDefined();
      expect(arrows?.chars).toContainEqual(expect.objectContaining({ char: '→' }));
    });

    it('should have symbols category', () => {
      const symbols = CHAR_MAP.find(c => c.category === 'Symbols');
      expect(symbols).toBeDefined();
      expect(symbols?.chars).toContainEqual(expect.objectContaining({ char: '©' }));
    });

    it('should have greek category', () => {
      const greek = CHAR_MAP.find(c => c.category === 'Greek');
      expect(greek).toBeDefined();
      expect(greek?.chars).toContainEqual(expect.objectContaining({ char: 'α' }));
    });

    it('should have punctuation category', () => {
      const punctuation = CHAR_MAP.find(c => c.category === 'Punctuation');
      expect(punctuation).toBeDefined();
    });

    it('each character should have char and name properties', () => {
      CHAR_MAP.forEach(category => {
        category.chars.forEach(charItem => {
          expect(charItem.char).toBeDefined();
          expect(charItem.name).toBeDefined();
          expect(typeof charItem.char).toBe('string');
          expect(typeof charItem.name).toBe('string');
        });
      });
    });
  });

  describe('Dialog Open/Close', () => {
    it('should open dialog', () => {
      charMap.open();
      
      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create dialog elements', () => {
      charMap.open();
      
      const dialog = document.querySelector('.md-charmap-dialog');
      expect(dialog).not.toBeNull();
      
      const header = document.querySelector('.md-dialog-header');
      expect(header).not.toBeNull();
      
      const body = document.querySelector('.md-charmap-body');
      expect(body).not.toBeNull();
    });

    it('should close dialog', () => {
      charMap.open();
      charMap.close();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should reopen dialog without creating new one', () => {
      charMap.open();
      charMap.close();
      charMap.open();
      
      const overlays = document.querySelectorAll('.md-dialog-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should close on overlay click', () => {
      charMap.open();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay?.click();
      
      expect(overlay?.style.display).toBe('none');
    });

    it('should close on close button click', () => {
      charMap.open();
      
      const closeBtn = document.querySelector('.md-dialog-close') as HTMLElement;
      closeBtn?.click();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Category Tabs', () => {
    it('should render category tabs', () => {
      charMap.open();
      
      const tabs = document.querySelectorAll('.md-charmap-tab');
      expect(tabs.length).toBe(CHAR_MAP.length);
    });

    it('should have first tab active by default', () => {
      charMap.open();
      
      const tabs = document.querySelectorAll('.md-charmap-tab');
      expect(tabs[0]?.classList.contains('md-charmap-tab-active')).toBe(true);
    });

    it('should switch active tab on click', () => {
      charMap.open();
      
      const tabs = document.querySelectorAll('.md-charmap-tab');
      (tabs[1] as HTMLElement)?.click();
      
      expect(tabs[0]?.classList.contains('md-charmap-tab-active')).toBe(false);
      expect(tabs[1]?.classList.contains('md-charmap-tab-active')).toBe(true);
    });
  });

  describe('Character Selection', () => {
    it('should render character buttons', () => {
      charMap.open();
      
      const charButtons = document.querySelectorAll('.md-charmap-char');
      expect(charButtons.length).toBeGreaterThan(0);
    });

    it('should call onSelect when character is clicked', () => {
      charMap.open();
      
      const charBtn = document.querySelector('.md-charmap-char') as HTMLElement;
      charBtn?.click();
      
      expect(onSelectMock).toHaveBeenCalled();
    });

    it('should close dialog after character selection', () => {
      charMap.open();
      
      const charBtn = document.querySelector('.md-charmap-char') as HTMLElement;
      charBtn?.click();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should have title attribute on character buttons', () => {
      charMap.open();
      
      const charBtn = document.querySelector('.md-charmap-char') as HTMLElement;
      expect(charBtn?.title).toBeDefined();
      expect(charBtn?.title.length).toBeGreaterThan(0);
    });
  });

  describe('Character Preview', () => {
    it('should have preview area', () => {
      charMap.open();
      
      const preview = document.querySelector('.md-charmap-preview');
      expect(preview).not.toBeNull();
    });

    it('should update preview on character hover', () => {
      charMap.open();
      
      const charBtn = document.querySelector('.md-charmap-char') as HTMLElement;
      const mouseEnter = new MouseEvent('mouseenter', { bubbles: true });
      charBtn?.dispatchEvent(mouseEnter);
      
      const previewChar = document.querySelector('.md-charmap-preview-char');
      expect(previewChar?.textContent).toBeDefined();
    });
  });

  describe('Destroy', () => {
    it('should remove dialog from DOM on destroy', () => {
      charMap.open();
      charMap.destroy();
      
      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).toBeNull();
    });

    it('should handle destroy without opening', () => {
      expect(() => charMap.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      charMap.open();
      charMap.destroy();
      expect(() => charMap.destroy()).not.toThrow();
    });
  });

  describe('Translation', () => {
    it('should use translation function for dialog title', () => {
      charMap.open();
      
      expect(transMock).toHaveBeenCalledWith('Special Character');
    });
  });
});
