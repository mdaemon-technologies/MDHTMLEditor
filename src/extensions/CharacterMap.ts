/**
 * CharacterMap
 * Special character picker dialog
 */

export interface CharMapOptions {
  onSelect: (char: string) => void;
  trans: (key: string) => string;
}

// Character map data organized by category
export const CHAR_MAP: Array<{ category: string; chars: Array<{ char: string; name: string }> }> = [
  {
    category: 'Currency',
    chars: [
      { char: '€', name: 'Euro' },
      { char: '£', name: 'Pound' },
      { char: '¥', name: 'Yen' },
      { char: '¢', name: 'Cent' },
      { char: '₹', name: 'Rupee' },
      { char: '₽', name: 'Ruble' },
      { char: '₿', name: 'Bitcoin' },
      { char: '₩', name: 'Won' },
      { char: '₪', name: 'Shekel' },
      { char: '฿', name: 'Baht' },
    ],
  },
  {
    category: 'Math',
    chars: [
      { char: '±', name: 'Plus-minus' },
      { char: '×', name: 'Multiplication' },
      { char: '÷', name: 'Division' },
      { char: '≠', name: 'Not equal' },
      { char: '≈', name: 'Approximately' },
      { char: '≤', name: 'Less than or equal' },
      { char: '≥', name: 'Greater than or equal' },
      { char: '∞', name: 'Infinity' },
      { char: '√', name: 'Square root' },
      { char: '∑', name: 'Sum' },
      { char: '∏', name: 'Product' },
      { char: '∫', name: 'Integral' },
      { char: 'π', name: 'Pi' },
      { char: '∆', name: 'Delta' },
      { char: 'Ω', name: 'Omega' },
      { char: '∂', name: 'Partial' },
      { char: '∈', name: 'Element of' },
      { char: '∉', name: 'Not element of' },
      { char: '⊂', name: 'Subset' },
      { char: '∪', name: 'Union' },
      { char: '∩', name: 'Intersection' },
    ],
  },
  {
    category: 'Arrows',
    chars: [
      { char: '←', name: 'Left arrow' },
      { char: '→', name: 'Right arrow' },
      { char: '↑', name: 'Up arrow' },
      { char: '↓', name: 'Down arrow' },
      { char: '↔', name: 'Left-right arrow' },
      { char: '↕', name: 'Up-down arrow' },
      { char: '⇐', name: 'Double left arrow' },
      { char: '⇒', name: 'Double right arrow' },
      { char: '⇑', name: 'Double up arrow' },
      { char: '⇓', name: 'Double down arrow' },
      { char: '⇔', name: 'Double left-right arrow' },
      { char: '↵', name: 'Return arrow' },
    ],
  },
  {
    category: 'Symbols',
    chars: [
      { char: '©', name: 'Copyright' },
      { char: '®', name: 'Registered' },
      { char: '™', name: 'Trademark' },
      { char: '§', name: 'Section' },
      { char: '¶', name: 'Paragraph' },
      { char: '†', name: 'Dagger' },
      { char: '‡', name: 'Double dagger' },
      { char: '•', name: 'Bullet' },
      { char: '◦', name: 'White bullet' },
      { char: '…', name: 'Ellipsis' },
      { char: '‰', name: 'Per mille' },
      { char: '°', name: 'Degree' },
      { char: '′', name: 'Prime' },
      { char: '″', name: 'Double prime' },
      { char: '№', name: 'Numero' },
      { char: '✓', name: 'Check mark' },
      { char: '✗', name: 'Cross mark' },
      { char: '★', name: 'Star' },
      { char: '☆', name: 'White star' },
      { char: '♠', name: 'Spade' },
      { char: '♣', name: 'Club' },
      { char: '♥', name: 'Heart' },
      { char: '♦', name: 'Diamond' },
    ],
  },
  {
    category: 'Greek',
    chars: [
      { char: 'α', name: 'Alpha' },
      { char: 'β', name: 'Beta' },
      { char: 'γ', name: 'Gamma' },
      { char: 'δ', name: 'Delta' },
      { char: 'ε', name: 'Epsilon' },
      { char: 'ζ', name: 'Zeta' },
      { char: 'η', name: 'Eta' },
      { char: 'θ', name: 'Theta' },
      { char: 'ι', name: 'Iota' },
      { char: 'κ', name: 'Kappa' },
      { char: 'λ', name: 'Lambda' },
      { char: 'μ', name: 'Mu' },
      { char: 'ν', name: 'Nu' },
      { char: 'ξ', name: 'Xi' },
      { char: 'ο', name: 'Omicron' },
      { char: 'π', name: 'Pi' },
      { char: 'ρ', name: 'Rho' },
      { char: 'σ', name: 'Sigma' },
      { char: 'τ', name: 'Tau' },
      { char: 'υ', name: 'Upsilon' },
      { char: 'φ', name: 'Phi' },
      { char: 'χ', name: 'Chi' },
      { char: 'ψ', name: 'Psi' },
      { char: 'ω', name: 'Omega' },
    ],
  },
  {
    category: 'Punctuation',
    chars: [
      { char: '«', name: 'Left guillemet' },
      { char: '»', name: 'Right guillemet' },
      { char: '‹', name: 'Single left guillemet' },
      { char: '›', name: 'Single right guillemet' },
      { char: '"', name: 'Left double quote' },
      { char: '"', name: 'Right double quote' },
      { char: '\u2018', name: 'Left single quote' },
      { char: '\u2019', name: 'Right single quote' },
      { char: '–', name: 'En dash' },
      { char: '—', name: 'Em dash' },
      { char: '‐', name: 'Hyphen' },
      { char: '·', name: 'Middle dot' },
      { char: '¡', name: 'Inverted exclamation' },
      { char: '¿', name: 'Inverted question' },
    ],
  },
];

export class CharacterMap {
  private options: CharMapOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  
  constructor(options: CharMapOptions) {
    this.options = options;
  }
  
  open(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
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
    this.dialog.className = 'md-dialog md-charmap-dialog';
    
    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${this.options.trans('Special Character')}</h3>
      <button type="button" class="md-dialog-close">×</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());
    
    // Body with tabs
    const body = document.createElement('div');
    body.className = 'md-dialog-body md-charmap-body';
    
    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'md-charmap-tabs';
    
    const charContainer = document.createElement('div');
    charContainer.className = 'md-charmap-chars';
    
    CHAR_MAP.forEach((category, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'md-charmap-tab' + (index === 0 ? ' md-charmap-tab-active' : '');
      tab.textContent = category.category;
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.md-charmap-tab').forEach(t => t.classList.remove('md-charmap-tab-active'));
        tab.classList.add('md-charmap-tab-active');
        this.renderChars(charContainer, category.chars);
      });
      tabs.appendChild(tab);
    });
    
    // Initial render
    this.renderChars(charContainer, CHAR_MAP[0].chars);
    
    // Preview
    const preview = document.createElement('div');
    preview.className = 'md-charmap-preview';
    preview.innerHTML = `
      <span class="md-charmap-preview-char"></span>
      <span class="md-charmap-preview-name"></span>
    `;
    
    body.appendChild(tabs);
    body.appendChild(charContainer);
    body.appendChild(preview);
    
    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
  }
  
  private renderChars(container: HTMLElement, chars: Array<{ char: string; name: string }>): void {
    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'md-charmap-grid';
    
    chars.forEach(({ char, name }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'md-charmap-char';
      btn.textContent = char;
      btn.title = name;
      
      btn.addEventListener('mouseenter', () => {
        const preview = this.dialog?.querySelector('.md-charmap-preview');
        if (preview) {
          preview.querySelector('.md-charmap-preview-char')!.textContent = char;
          preview.querySelector('.md-charmap-preview-name')!.textContent = name;
        }
      });
      
      btn.addEventListener('click', () => {
        this.options.onSelect(char);
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
    }
  }
}
