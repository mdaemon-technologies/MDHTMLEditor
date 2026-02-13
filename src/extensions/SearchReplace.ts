/**
 * SearchReplace
 * Find and replace dialog for the editor
 */

import type { HTMLEditor } from '../core/HTMLEditor';
import type { Editor as TipTapEditor } from '@tiptap/core';

export interface SearchReplaceOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

interface SearchResult {
  from: number;
  to: number;
  text: string;
}

export class SearchReplace {
  private options: SearchReplaceOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private replaceInput: HTMLInputElement | null = null;
  private currentResults: SearchResult[] = [];
  private currentIndex = -1;
  private caseSensitive = false;
  private wholeWord = false;
  
  constructor(options: SearchReplaceOptions) {
    this.options = options;
  }
  
  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }
  
  open(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.searchInput?.focus();
      this.searchInput?.select();
      return;
    }
    
    this.createDialog();
  }
  
  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    this.clearHighlights();
  }
  
  private createDialog(): void {
    const trans = this.options.trans;
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay md-dialog-overlay-transparent';
    
    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-searchreplace-dialog';
    
    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${trans('Find and Replace')}</h3>
      <button type="button" class="md-dialog-close">×</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());
    
    // Body
    const body = document.createElement('div');
    body.className = 'md-dialog-body md-searchreplace-body';
    
    // Search row
    const searchRow = document.createElement('div');
    searchRow.className = 'md-searchreplace-row';
    searchRow.innerHTML = `
      <label>${trans('Find')}:</label>
      <input type="text" class="md-searchreplace-input md-searchreplace-search" />
      <span class="md-searchreplace-count"></span>
    `;
    this.searchInput = searchRow.querySelector('.md-searchreplace-search') as HTMLInputElement;
    
    // Replace row
    const replaceRow = document.createElement('div');
    replaceRow.className = 'md-searchreplace-row';
    replaceRow.innerHTML = `
      <label>${trans('Replace')}:</label>
      <input type="text" class="md-searchreplace-input md-searchreplace-replace" />
    `;
    this.replaceInput = replaceRow.querySelector('.md-searchreplace-replace') as HTMLInputElement;
    
    // Options row
    const optionsRow = document.createElement('div');
    optionsRow.className = 'md-searchreplace-options';
    optionsRow.innerHTML = `
      <label class="md-searchreplace-option">
        <input type="checkbox" class="md-searchreplace-case" />
        <span>${trans('Case sensitive')}</span>
      </label>
      <label class="md-searchreplace-option">
        <input type="checkbox" class="md-searchreplace-whole" />
        <span>${trans('Whole word')}</span>
      </label>
    `;
    
    const caseCheckbox = optionsRow.querySelector('.md-searchreplace-case') as HTMLInputElement;
    const wholeCheckbox = optionsRow.querySelector('.md-searchreplace-whole') as HTMLInputElement;
    
    caseCheckbox.addEventListener('change', () => {
      this.caseSensitive = caseCheckbox.checked;
      this.doSearch();
    });
    
    wholeCheckbox.addEventListener('change', () => {
      this.wholeWord = wholeCheckbox.checked;
      this.doSearch();
    });
    
    // Buttons row
    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'md-searchreplace-buttons';
    buttonsRow.innerHTML = `
      <button type="button" class="md-btn md-searchreplace-prev">${trans('Previous')}</button>
      <button type="button" class="md-btn md-searchreplace-next">${trans('Next')}</button>
      <button type="button" class="md-btn md-searchreplace-replace-btn">${trans('Replace')}</button>
      <button type="button" class="md-btn md-searchreplace-replace-all">${trans('Replace All')}</button>
    `;
    
    buttonsRow.querySelector('.md-searchreplace-prev')?.addEventListener('click', () => this.findPrevious());
    buttonsRow.querySelector('.md-searchreplace-next')?.addEventListener('click', () => this.findNext());
    buttonsRow.querySelector('.md-searchreplace-replace-btn')?.addEventListener('click', () => this.replaceCurrent());
    buttonsRow.querySelector('.md-searchreplace-replace-all')?.addEventListener('click', () => this.replaceAll());
    
    // Search on input
    this.searchInput.addEventListener('input', () => this.doSearch());
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
    
    this.replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.replaceCurrent();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
    
    body.appendChild(searchRow);
    body.appendChild(replaceRow);
    body.appendChild(optionsRow);
    body.appendChild(buttonsRow);
    
    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    
    this.searchInput.focus();
  }
  
  private doSearch(): void {
    const query = this.searchInput?.value ?? '';
    this.currentResults = [];
    this.currentIndex = -1;
    
    if (!query || !this.tiptap) {
      this.updateCount();
      this.clearHighlights();
      return;
    }
    
    const content = this.tiptap.getText();
    const searchText = this.caseSensitive ? query : query.toLowerCase();
    const textToSearch = this.caseSensitive ? content : content.toLowerCase();
    
    let pos = 0;
    let startPos = 0;
    
    while ((startPos = textToSearch.indexOf(searchText, pos)) !== -1) {
      const endPos = startPos + query.length;
      
      // Check whole word
      if (this.wholeWord) {
        const before = startPos === 0 || /\W/.test(content[startPos - 1]);
        const after = endPos === content.length || /\W/.test(content[endPos]);
        
        if (!before || !after) {
          pos = startPos + 1;
          continue;
        }
      }
      
      this.currentResults.push({
        from: startPos,
        to: endPos,
        text: content.substring(startPos, endPos),
      });
      
      pos = endPos;
    }
    
    this.updateCount();
    
    if (this.currentResults.length > 0) {
      this.currentIndex = 0;
      this.highlightCurrent();
    }
  }
  
  private updateCount(): void {
    const countEl = this.dialog?.querySelector('.md-searchreplace-count');
    if (countEl) {
      if (this.currentResults.length > 0) {
        countEl.textContent = `${this.currentIndex + 1} / ${this.currentResults.length}`;
      } else {
        countEl.textContent = this.searchInput?.value ? '0 results' : '';
      }
    }
  }
  
  private highlightCurrent(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.currentResults.length) {
      return;
    }
    
    // TipTap's selection doesn't map directly to text positions
    // For a proper implementation, we would need to track positions in the document
    // For now, we'll use a simplified approach
    
    // Note: A full implementation would need to use ProseMirror's TextSelection
    // and properly map text positions to document positions
    
    this.updateCount();
  }
  
  private clearHighlights(): void {
    // Clear any highlighting marks if we implemented them
  }
  
  findNext(): void {
    if (this.currentResults.length === 0) {
      this.doSearch();
      return;
    }
    
    this.currentIndex = (this.currentIndex + 1) % this.currentResults.length;
    this.highlightCurrent();
  }
  
  findPrevious(): void {
    if (this.currentResults.length === 0) {
      this.doSearch();
      return;
    }
    
    this.currentIndex = (this.currentIndex - 1 + this.currentResults.length) % this.currentResults.length;
    this.highlightCurrent();
  }
  
  replaceCurrent(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.currentResults.length || !this.tiptap) {
      return;
    }
    
    const replaceText = this.replaceInput?.value ?? '';
    const result = this.currentResults[this.currentIndex];
    
    // Get current HTML and do text replacement
    // Note: This is a simplified approach - proper implementation would use ProseMirror transactions
    let html = this.tiptap.getHTML();
    
    // Simple replace using the stored result
    // This is a basic implementation - proper search/replace in rich text is complex
    html = html.replace(result.text, replaceText);
    this.tiptap.commands.setContent(html);
    
    // Re-search
    this.doSearch();
  }
  
  replaceAll(): void {
    if (this.currentResults.length === 0 || !this.tiptap) {
      return;
    }
    
    const searchText = this.searchInput?.value ?? '';
    const replaceText = this.replaceInput?.value ?? '';
    
    if (!searchText) return;
    
    let html = this.tiptap.getHTML();
    
    // Build regex for replacement
    let flags = 'g';
    if (!this.caseSensitive) flags += 'i';
    
    let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (this.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const regex = new RegExp(pattern, flags);
    html = html.replace(regex, replaceText);
    
    this.tiptap.commands.setContent(html);
    
    // Clear results
    this.currentResults = [];
    this.currentIndex = -1;
    this.updateCount();
  }
  
  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.searchInput = null;
      this.replaceInput = null;
    }
  }
}
