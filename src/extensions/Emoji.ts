/**
 * EmojiPicker
 * Emoji selection dialog
 */

export interface EmojiPickerOptions {
  onSelect: (emoji: string) => void;
  trans: (key: string) => string;
}

// Emoji categories with commonly used emojis
export const EMOJI_CATEGORIES: Array<{ category: string; icon: string; emojis: string[] }> = [
  {
    category: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
      '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
      '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
      '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯',
      '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
    ],
  },
  {
    category: 'Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂',
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
      '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩',
    ],
  },
  {
    category: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
      '💋', '💌', '💐', '🌹', '🥀', '🌷', '🌸', '💮', '🏵️', '🌻',
    ],
  },
  {
    category: 'Objects',
    icon: '📧',
    emojis: [
      '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭',
      '📮', '📝', '💼', '📁', '📂', '📅', '📆', '📇', '📈', '📉',
      '📊', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '📒', '📓',
      '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📰', '🔖', '🏷️',
      '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️',
    ],
  },
  {
    category: 'Symbols',
    icon: '✅',
    emojis: [
      '✅', '❌', '❓', '❗', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡',
      '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹',
      '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '▪️', '▫️', '◾', '◽',
      '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪',
      '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '🎉', '🎊', '🏆',
      '🥇', '🥈', '🥉', '🏅', '🎖️', '📣', '📢', '🔔', '🔕', '🎵',
    ],
  },
  {
    category: 'Arrows',
    icon: '➡️',
    emojis: [
      '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️',
      '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜',
      '🔝', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔀', '🔁',
      '🔂', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳',
    ],
  },
];

export class EmojiPicker {
  private options: EmojiPickerOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  
  constructor(options: EmojiPickerOptions) {
    this.options = options;
  }
  
  open(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.searchInput?.focus();
      return;
    }
    
    this.createDialog();
  }
  
  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }
  
  private createDialog(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    
    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-emoji-dialog';
    
    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${this.options.trans('Emoticons')}</h3>
      <button type="button" class="md-dialog-close">×</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());
    
    // Search
    const searchContainer = document.createElement('div');
    searchContainer.className = 'md-emoji-search';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = this.options.trans('Search...');
    this.searchInput.className = 'md-emoji-search-input';
    searchContainer.appendChild(this.searchInput);
    
    // Body with tabs
    const body = document.createElement('div');
    body.className = 'md-dialog-body md-emoji-body';
    
    // Category tabs
    const tabs = document.createElement('div');
    tabs.className = 'md-emoji-tabs';
    
    const emojiContainer = document.createElement('div');
    emojiContainer.className = 'md-emoji-container';
    
    EMOJI_CATEGORIES.forEach((category, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'md-emoji-tab' + (index === 0 ? ' md-emoji-tab-active' : '');
      tab.textContent = category.icon;
      tab.title = category.category;
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.md-emoji-tab').forEach(t => t.classList.remove('md-emoji-tab-active'));
        tab.classList.add('md-emoji-tab-active');
        this.renderEmojis(emojiContainer, category.emojis);
        if (this.searchInput) {
          this.searchInput.value = '';
        }
      });
      tabs.appendChild(tab);
    });
    
    // Search handler
    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      if (query) {
        // Search all emojis
        const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
        // For now, just show all emojis when searching (proper search would need emoji names)
        this.renderEmojis(emojiContainer, allEmojis);
        tabs.querySelectorAll('.md-emoji-tab').forEach(t => t.classList.remove('md-emoji-tab-active'));
      } else {
        // Show first category
        tabs.querySelector('.md-emoji-tab')?.classList.add('md-emoji-tab-active');
        this.renderEmojis(emojiContainer, EMOJI_CATEGORIES[0].emojis);
      }
    });
    
    // Initial render
    this.renderEmojis(emojiContainer, EMOJI_CATEGORIES[0].emojis);
    
    body.appendChild(tabs);
    body.appendChild(searchContainer);
    body.appendChild(emojiContainer);
    
    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    
    this.searchInput.focus();
  }
  
  private renderEmojis(container: HTMLElement, emojis: string[]): void {
    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'md-emoji-grid';
    
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'md-emoji-btn';
      btn.textContent = emoji;
      
      btn.addEventListener('click', () => {
        this.options.onSelect(emoji);
        this.close();
      });
      
      grid.appendChild(btn);
    });
    
    container.appendChild(grid);
  }
  
  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.searchInput = null;
    }
  }
}
