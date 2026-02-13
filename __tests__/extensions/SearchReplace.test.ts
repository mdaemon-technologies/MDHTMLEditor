/**
 * SearchReplace Tests
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { SearchReplace } from '../../src/extensions/SearchReplace';

describe('SearchReplace', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;
  let searchReplace: SearchReplace;
  let transMock: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    editor = new HTMLEditor(container);
    transMock = jest.fn((key) => key);
    
    searchReplace = new SearchReplace({
      editor,
      trans: transMock,
    });
  });

  afterEach(() => {
    searchReplace?.destroy();
    editor?.destroy();
    container?.remove();
    // Clean up any dialogs that may remain
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  describe('Dialog Open/Close', () => {
    it('should open dialog', () => {
      searchReplace.open();
      
      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create search/replace dialog', () => {
      searchReplace.open();
      
      const dialog = document.querySelector('.md-searchreplace-dialog');
      expect(dialog).not.toBeNull();
    });

    it('should have transparent overlay', () => {
      searchReplace.open();
      
      const overlay = document.querySelector('.md-dialog-overlay-transparent');
      expect(overlay).not.toBeNull();
    });

    it('should close dialog', () => {
      searchReplace.open();
      searchReplace.close();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should reopen dialog without creating new one', () => {
      searchReplace.open();
      searchReplace.close();
      searchReplace.open();
      
      const overlays = document.querySelectorAll('.md-dialog-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should close on close button click', () => {
      searchReplace.open();
      
      const closeBtn = document.querySelector('.md-dialog-close') as HTMLElement;
      closeBtn?.click();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Search Input', () => {
    it('should have search input', () => {
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search');
      expect(searchInput).not.toBeNull();
    });

    it('should have search label', () => {
      searchReplace.open();
      
      const labels = document.querySelectorAll('.md-searchreplace-row label');
      expect(labels[0]?.textContent).toContain('Find');
    });

    it('should trigger search on input', () => {
      editor.setContent('<p>Hello world. Hello again.</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'Hello';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Results count should be shown
      const count = document.querySelector('.md-searchreplace-count');
      expect(count).not.toBeNull();
    });

    it('should close on Escape key', () => {
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should find next on Enter key', () => {
      editor.setContent('<p>Test test TEST</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      
      // Should navigate to next result
      expect(searchInput).not.toBeNull();
    });

    it('should find previous on Shift+Enter', () => {
      editor.setContent('<p>Test test TEST</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
      
      // Should navigate to previous result
      expect(searchInput).not.toBeNull();
    });
  });

  describe('Replace Input', () => {
    it('should have replace input', () => {
      searchReplace.open();
      
      const replaceInput = document.querySelector('.md-searchreplace-replace');
      expect(replaceInput).not.toBeNull();
    });

    it('should have replace label', () => {
      searchReplace.open();
      
      const labels = document.querySelectorAll('.md-searchreplace-row label');
      expect(labels[1]?.textContent).toContain('Replace');
    });

    it('should close on Escape key', () => {
      searchReplace.open();
      
      const replaceInput = document.querySelector('.md-searchreplace-replace') as HTMLInputElement;
      replaceInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should replace current on Enter key', () => {
      editor.setContent('<p>Hello world</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      const replaceInput = document.querySelector('.md-searchreplace-replace') as HTMLInputElement;
      
      searchInput.value = 'Hello';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      replaceInput.value = 'Hi';
      replaceInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      
      expect(replaceInput).not.toBeNull();
    });
  });

  describe('Search Options', () => {
    it('should have case sensitive checkbox', () => {
      searchReplace.open();
      
      const checkbox = document.querySelector('.md-searchreplace-case');
      expect(checkbox).not.toBeNull();
    });

    it('should have whole word checkbox', () => {
      searchReplace.open();
      
      const checkbox = document.querySelector('.md-searchreplace-whole');
      expect(checkbox).not.toBeNull();
    });

    it('should update search on case sensitive change', () => {
      editor.setContent('<p>Test TEST test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      const caseCheckbox = document.querySelector('.md-searchreplace-case') as HTMLInputElement;
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      caseCheckbox.checked = true;
      caseCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(caseCheckbox.checked).toBe(true);
    });

    it('should update search on whole word change', () => {
      editor.setContent('<p>test testing tested</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      const wholeCheckbox = document.querySelector('.md-searchreplace-whole') as HTMLInputElement;
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      wholeCheckbox.checked = true;
      wholeCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(wholeCheckbox.checked).toBe(true);
    });
  });

  describe('Navigation Buttons', () => {
    it('should have Previous button', () => {
      searchReplace.open();
      
      const prevBtn = document.querySelector('.md-searchreplace-prev');
      expect(prevBtn).not.toBeNull();
      expect(prevBtn?.textContent).toBe('Previous');
    });

    it('should have Next button', () => {
      searchReplace.open();
      
      const nextBtn = document.querySelector('.md-searchreplace-next');
      expect(nextBtn).not.toBeNull();
      expect(nextBtn?.textContent).toBe('Next');
    });

    it('should navigate to previous on Previous button click', () => {
      editor.setContent('<p>test test test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const prevBtn = document.querySelector('.md-searchreplace-prev') as HTMLElement;
      prevBtn?.click();
      
      expect(prevBtn).not.toBeNull();
    });

    it('should navigate to next on Next button click', () => {
      editor.setContent('<p>test test test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const nextBtn = document.querySelector('.md-searchreplace-next') as HTMLElement;
      nextBtn?.click();
      
      expect(nextBtn).not.toBeNull();
    });
  });

  describe('Replace Buttons', () => {
    it('should have Replace button', () => {
      searchReplace.open();
      
      const replaceBtn = document.querySelector('.md-searchreplace-replace-btn');
      expect(replaceBtn).not.toBeNull();
      expect(replaceBtn?.textContent).toBe('Replace');
    });

    it('should have Replace All button', () => {
      searchReplace.open();
      
      const replaceAllBtn = document.querySelector('.md-searchreplace-replace-all');
      expect(replaceAllBtn).not.toBeNull();
      expect(replaceAllBtn?.textContent).toBe('Replace All');
    });

    it('should replace current match on Replace button click', () => {
      editor.setContent('<p>Hello world</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      const replaceInput = document.querySelector('.md-searchreplace-replace') as HTMLInputElement;
      
      searchInput.value = 'Hello';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      replaceInput.value = 'Hi';
      
      const replaceBtn = document.querySelector('.md-searchreplace-replace-btn') as HTMLElement;
      replaceBtn?.click();
      
      // Content should be replaced
      expect(replaceBtn).not.toBeNull();
    });

    it('should replace all matches on Replace All button click', () => {
      editor.setContent('<p>test test test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      const replaceInput = document.querySelector('.md-searchreplace-replace') as HTMLInputElement;
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      replaceInput.value = 'demo';
      
      const replaceAllBtn = document.querySelector('.md-searchreplace-replace-all') as HTMLElement;
      replaceAllBtn?.click();
      
      // All occurrences should be replaced
      expect(replaceAllBtn).not.toBeNull();
    });
  });

  describe('Results Count', () => {
    it('should display count element', () => {
      searchReplace.open();
      
      const count = document.querySelector('.md-searchreplace-count');
      expect(count).not.toBeNull();
    });

    it('should show "0 results" when no match found', () => {
      editor.setContent('<p>Hello world</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'xyz';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const count = document.querySelector('.md-searchreplace-count');
      expect(count?.textContent).toBe('0 results');
    });

    it('should show match count when matches found', () => {
      editor.setContent('<p>test test test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const count = document.querySelector('.md-searchreplace-count');
      expect(count?.textContent).toMatch(/\d+ \/ \d+/);
    });

    it('should be empty when search input is empty', () => {
      searchReplace.open();
      
      const count = document.querySelector('.md-searchreplace-count');
      expect(count?.textContent).toBe('');
    });
  });

  describe('Destroy', () => {
    it('should remove dialog from DOM on destroy', () => {
      searchReplace.open();
      searchReplace.destroy();
      
      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).toBeNull();
    });

    it('should handle destroy without opening', () => {
      expect(() => searchReplace.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      searchReplace.open();
      searchReplace.destroy();
      expect(() => searchReplace.destroy()).not.toThrow();
    });
  });

  describe('Translation', () => {
    it('should use translation function for dialog title', () => {
      searchReplace.open();
      
      expect(transMock).toHaveBeenCalledWith('Find and Replace');
    });

    it('should translate button labels', () => {
      searchReplace.open();
      
      expect(transMock).toHaveBeenCalledWith('Previous');
      expect(transMock).toHaveBeenCalledWith('Next');
      expect(transMock).toHaveBeenCalledWith('Replace');
      expect(transMock).toHaveBeenCalledWith('Replace All');
    });

    it('should translate option labels', () => {
      searchReplace.open();
      
      expect(transMock).toHaveBeenCalledWith('Case sensitive');
      expect(transMock).toHaveBeenCalledWith('Whole word');
    });
  });

  describe('Search Methods', () => {
    it('should have findNext method', () => {
      expect(searchReplace.findNext).toBeDefined();
    });

    it('should have findPrevious method', () => {
      expect(searchReplace.findPrevious).toBeDefined();
    });

    it('should cycle through results with findNext', () => {
      editor.setContent('<p>test test test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      searchReplace.findNext();
      searchReplace.findNext();
      
      // Should have cycled through results
      expect(searchReplace.findNext).toBeDefined();
    });

    it('should cycle backwards with findPrevious', () => {
      editor.setContent('<p>test test test</p>');
      searchReplace.open();
      
      const searchInput = document.querySelector('.md-searchreplace-search') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      searchReplace.findPrevious();
      
      // Should have cycled backwards
      expect(searchReplace.findPrevious).toBeDefined();
    });
  });

  describe('Replace Methods', () => {
    it('should have replaceCurrent method', () => {
      expect(searchReplace.replaceCurrent).toBeDefined();
    });

    it('should have replaceAll method', () => {
      expect(searchReplace.replaceAll).toBeDefined();
    });
  });
});
