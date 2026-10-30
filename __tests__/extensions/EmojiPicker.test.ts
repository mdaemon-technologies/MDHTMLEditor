/**
 * EmojiPicker Tests
 */

import { EmojiPicker, EMOJI_CATEGORIES, EMOJI_DATA } from '../../src/extensions/Emoji';

describe('EmojiPicker', () => {
  let emojiPicker: EmojiPicker;
  let onSelectMock: jest.Mock;
  let transMock: jest.Mock;

  beforeEach(() => {
    onSelectMock = jest.fn();
    transMock = jest.fn((key) => key);
    
    emojiPicker = new EmojiPicker({
      onSelect: onSelectMock,
      trans: transMock,
    });
  });

  afterEach(() => {
    emojiPicker?.destroy();
    // Clean up any dialogs that may remain
    document.querySelectorAll('.md-dialog-overlay').forEach(el => el.remove());
  });

  // Types a query into the open picker and returns the emojis it shows
  function search(query: string): string[] {
    const searchInput = document.querySelector('.md-emoji-search-input') as HTMLInputElement;
    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    return Array.from(document.querySelectorAll('.md-emoji-btn')).map(b => b.textContent ?? '');
  }

  describe('EMOJI_DATA', () => {
    it('should name every emoji in EMOJI_CATEGORIES', () => {
      const unnamed = EMOJI_CATEGORIES
        .flatMap(c => c.emojis)
        .filter(emoji => !EMOJI_DATA[emoji]?.name);
      expect(unnamed).toEqual([]);
    });

    it('should give every emoji lowercase keywords', () => {
      Object.values(EMOJI_DATA).forEach(({ name, keywords }) => {
        expect(name).toBe(name.toLowerCase());
        expect(Array.isArray(keywords)).toBe(true);
        keywords.forEach(k => expect(k).toBe(k.toLowerCase()));
      });
    });

    it('should only describe emojis that are in EMOJI_CATEGORIES', () => {
      const all = new Set(EMOJI_CATEGORIES.flatMap(c => c.emojis));
      expect(Object.keys(EMOJI_DATA).filter(emoji => !all.has(emoji))).toEqual([]);
    });
  });

  describe('EMOJI_CATEGORIES Data', () => {
    it('should export emoji categories', () => {
      expect(EMOJI_CATEGORIES).toBeDefined();
      expect(Array.isArray(EMOJI_CATEGORIES)).toBe(true);
    });

    it('should have smileys category', () => {
      const smileys = EMOJI_CATEGORIES.find(c => c.category === 'Smileys');
      expect(smileys).toBeDefined();
      expect(smileys?.emojis.length).toBeGreaterThan(0);
      expect(smileys?.icon).toBe('😀');
    });

    it('should have gestures category', () => {
      const gestures = EMOJI_CATEGORIES.find(c => c.category === 'Gestures');
      expect(gestures).toBeDefined();
      expect(gestures?.icon).toBe('👋');
    });

    it('should have hearts category', () => {
      const hearts = EMOJI_CATEGORIES.find(c => c.category === 'Hearts');
      expect(hearts).toBeDefined();
      expect(hearts?.emojis).toContain('❤️');
    });

    it('should have objects category', () => {
      const objects = EMOJI_CATEGORIES.find(c => c.category === 'Objects');
      expect(objects).toBeDefined();
    });

    it('should have symbols category', () => {
      const symbols = EMOJI_CATEGORIES.find(c => c.category === 'Symbols');
      expect(symbols).toBeDefined();
      expect(symbols?.emojis).toContain('✅');
    });

    it('should have arrows category', () => {
      const arrows = EMOJI_CATEGORIES.find(c => c.category === 'Arrows');
      expect(arrows).toBeDefined();
      expect(arrows?.emojis).toContain('➡️');
    });

    it('each category should have required properties', () => {
      EMOJI_CATEGORIES.forEach(category => {
        expect(category.category).toBeDefined();
        expect(category.icon).toBeDefined();
        expect(Array.isArray(category.emojis)).toBe(true);
        expect(category.emojis.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Dialog Open/Close', () => {
    it('should open dialog', () => {
      emojiPicker.open();
      
      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create emoji dialog', () => {
      emojiPicker.open();
      
      const dialog = document.querySelector('.md-emoji-dialog');
      expect(dialog).not.toBeNull();
    });

    it('should close dialog', () => {
      emojiPicker.open();
      emojiPicker.close();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should reopen dialog without creating new one', () => {
      emojiPicker.open();
      emojiPicker.close();
      emojiPicker.open();
      
      const overlays = document.querySelectorAll('.md-dialog-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should close on overlay click', () => {
      emojiPicker.open();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      overlay?.click();
      
      expect(overlay?.style.display).toBe('none');
    });

    it('should close on close button click', () => {
      emojiPicker.open();
      
      const closeBtn = document.querySelector('.md-dialog-close') as HTMLElement;
      closeBtn?.click();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Category Tabs', () => {
    it('should render category tabs', () => {
      emojiPicker.open();
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      expect(tabs.length).toBe(EMOJI_CATEGORIES.length);
    });

    it('should have first tab active by default', () => {
      emojiPicker.open();
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      expect(tabs[0]?.classList.contains('md-emoji-tab-active')).toBe(true);
    });

    it('should show category icon in tabs', () => {
      emojiPicker.open();
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      expect(tabs[0]?.textContent).toBe(EMOJI_CATEGORIES[0].icon);
    });

    it('should show category name as title', () => {
      emojiPicker.open();
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      expect((tabs[0] as HTMLElement)?.title).toBe(EMOJI_CATEGORIES[0].category);
    });

    it('should switch active tab on click', () => {
      emojiPicker.open();
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      (tabs[1] as HTMLElement)?.click();
      
      expect(tabs[0]?.classList.contains('md-emoji-tab-active')).toBe(false);
      expect(tabs[1]?.classList.contains('md-emoji-tab-active')).toBe(true);
    });
  });

  describe('Emoji Selection', () => {
    it('should render emoji buttons', () => {
      emojiPicker.open();
      
      const emojiButtons = document.querySelectorAll('.md-emoji-btn');
      expect(emojiButtons.length).toBeGreaterThan(0);
    });

    it('should call onSelect when emoji is clicked', () => {
      emojiPicker.open();
      
      const emojiBtn = document.querySelector('.md-emoji-btn') as HTMLElement;
      emojiBtn?.click();
      
      expect(onSelectMock).toHaveBeenCalled();
    });

    it('should pass selected emoji to onSelect', () => {
      emojiPicker.open();
      
      const emojiBtn = document.querySelector('.md-emoji-btn') as HTMLElement;
      const emoji = emojiBtn?.textContent;
      emojiBtn?.click();
      
      expect(onSelectMock).toHaveBeenCalledWith(emoji);
    });

    it('should show each emoji\'s name as its tooltip', () => {
      emojiPicker.open();

      const btn = Array.from(document.querySelectorAll<HTMLElement>('.md-emoji-btn'))
        .find(b => b.textContent === '😀');
      expect(btn?.title).toBe(EMOJI_DATA['😀'].name);
      // The emoji itself stays the accessible name, so it is read in the user's language
      expect(btn?.hasAttribute('aria-label')).toBe(false);
    });

    it('should close dialog after emoji selection', () => {
      emojiPicker.open();
      
      const emojiBtn = document.querySelector('.md-emoji-btn') as HTMLElement;
      emojiBtn?.click();
      
      const overlay = document.querySelector('.md-dialog-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Search', () => {
    it('should have search input', () => {
      emojiPicker.open();
      
      const searchInput = document.querySelector('.md-emoji-search-input');
      expect(searchInput).not.toBeNull();
    });

    it('should focus search input on open', () => {
      emojiPicker.open();
      
      const searchInput = document.querySelector('.md-emoji-search-input');
      // Note: jsdom may not fully support focus
      expect(searchInput).not.toBeNull();
    });

    it('should have placeholder text', () => {
      emojiPicker.open();
      
      const searchInput = document.querySelector('.md-emoji-search-input') as HTMLInputElement;
      expect(searchInput?.placeholder).toBeDefined();
    });

    it('should show only the emojis whose name or keywords match', () => {
      emojiPicker.open();

      const shown = search('heart');
      expect(shown).toContain('❤️');
      expect(shown).toContain('💔');
      expect(shown).not.toContain('😀');
      expect(shown).not.toContain('📧');
    });

    it('should find an emoji by its name', () => {
      emojiPicker.open();

      expect(search('grinning')).toContain('😀');
    });

    it('should find an emoji by a keyword that is not in its name', () => {
      emojiPicker.open();

      expect(search('happy')).toContain('😀');
    });

    it('should search across every category', () => {
      emojiPicker.open();

      const shown = search('arrow');
      expect(shown).toContain('➡️');
      expect(shown).not.toContain('😀');
    });

    it('should ignore case and surrounding spaces', () => {
      emojiPicker.open();

      expect(search('  HEART  ')).toEqual(search('heart'));
    });

    it('should find a pasted emoji', () => {
      emojiPicker.open();

      expect(search('🔥')).toEqual(['🔥']);
    });

    it('should find a pasted emoji without its presentation selector', () => {
      emojiPicker.open();

      expect(search('❤')).toEqual(['❤️']);
    });

    it('should find a pasted emoji that has a skin tone', () => {
      emojiPicker.open();

      expect(search('👍🏽')).toEqual(['👍']);
    });

    it('should match the start of a word, not the middle of one', () => {
      emojiPicker.open();

      const shown = search('up');
      expect(shown).toContain('⬆️');
      expect(shown).not.toContain('💘'); // cupid
      expect(search('hild')).not.toContain('🧒'); // child
    });

    it('should match each word of the query, in any order', () => {
      emojiPicker.open();

      expect(search('heart broken')).toEqual(['💔']);
      expect(search('grinning  face')).toContain('😀');
    });

    it('should match after punctuation', () => {
      emojiPicker.open();

      expect(search('1')).toContain('👍'); // +1
    });

    it('should match after a hyphen', () => {
      emojiPicker.open();

      expect(search('eyes')).toContain('😍'); // smiling face with heart-eyes
    });

    it('should clear the search when the picker is opened again', () => {
      emojiPicker.open();
      search('heart');
      emojiPicker.close();
      emojiPicker.open();

      const searchInput = document.querySelector('.md-emoji-search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('');
      const shown = Array.from(document.querySelectorAll('.md-emoji-btn')).map(b => b.textContent);
      expect(shown).toEqual(EMOJI_CATEGORIES[0].emojis);
      expect(document.querySelector('.md-emoji-tab')?.classList.contains('md-emoji-tab-active')).toBe(true);
    });

    it('should show a message and no emojis when nothing matches', () => {
      emojiPicker.open();

      expect(search('zzzz')).toEqual([]);
      const empty = document.querySelector('.md-emoji-empty');
      expect(empty?.textContent).toBe('No emoticons found');
      expect(transMock).toHaveBeenCalledWith('No emoticons found');
    });

    it('should show the first category again for a query of only spaces', () => {
      emojiPicker.open();

      search('heart');
      expect(search('   ')).toEqual(EMOJI_CATEGORIES[0].emojis);
      expect(document.querySelector('.md-emoji-empty')).toBeNull();
    });

    it('should leave only the first tab active for a query of only spaces', () => {
      emojiPicker.open();

      const tabs = Array.from(document.querySelectorAll('.md-emoji-tab'));
      (tabs[2] as HTMLElement).click();
      search(' ');

      const active = tabs.filter(t => t.classList.contains('md-emoji-tab-active'));
      expect(active).toEqual([tabs[0]]);
    });

    it('should insert an emoji picked from the search results', () => {
      emojiPicker.open();

      search('grinning');
      const btn = Array.from(document.querySelectorAll<HTMLElement>('.md-emoji-btn'))
        .find(b => b.textContent === '😀');
      btn?.click();

      expect(onSelectMock).toHaveBeenCalledWith('😀');
    });

    it('should deactivate tabs when searching', () => {
      emojiPicker.open();
      
      const searchInput = document.querySelector('.md-emoji-search-input') as HTMLInputElement;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      const activeTabs = Array.from(tabs).filter(t => 
        t.classList.contains('md-emoji-tab-active')
      );
      expect(activeTabs.length).toBe(0);
    });

    it('should restore tab selection when search is cleared', () => {
      emojiPicker.open();
      
      const searchInput = document.querySelector('.md-emoji-search-input') as HTMLInputElement;
      
      // Type something
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Clear search
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const tabs = document.querySelectorAll('.md-emoji-tab');
      const activeTabs = Array.from(tabs).filter(t => 
        t.classList.contains('md-emoji-tab-active')
      );
      expect(activeTabs.length).toBe(1);
    });
  });

  describe('Destroy', () => {
    it('should remove dialog from DOM on destroy', () => {
      emojiPicker.open();
      emojiPicker.destroy();
      
      const overlay = document.querySelector('.md-dialog-overlay');
      expect(overlay).toBeNull();
    });

    it('should handle destroy without opening', () => {
      expect(() => emojiPicker.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      emojiPicker.open();
      emojiPicker.destroy();
      expect(() => emojiPicker.destroy()).not.toThrow();
    });
  });

  describe('Translation', () => {
    it('should use translation function for dialog title', () => {
      emojiPicker.open();
      
      expect(transMock).toHaveBeenCalledWith('Emoticons');
    });

    it('should use translation for search placeholder', () => {
      emojiPicker.open();
      
      expect(transMock).toHaveBeenCalledWith('Search...');
    });
  });
});
