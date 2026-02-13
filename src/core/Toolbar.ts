/**
 * MDHTMLEditor Toolbar
 * Vanilla JS toolbar with TinyMCE-compatible button layout
 */

import type { Editor as TipTapEditor } from '@tiptap/core';
import type {
  EditorConfig,
  FontOption,
  ToolbarButtonSpec,
  ColorOption,
} from '../types';
import { HTMLEditor, fontNames as defaultFontNames, getTranslate } from './HTMLEditor';
import { CharacterMap } from '../extensions/CharacterMap';
import { EmojiPicker } from '../extensions/Emoji';
import { SearchReplace } from '../extensions/SearchReplace';

interface ToolbarOptions {
  editor: HTMLEditor;
  buttons: string;
  mode: 'sliding' | 'floating' | 'wrap';
  sticky: boolean;
  customButtons: Map<string, ToolbarButtonSpec>;
  config: EditorConfig;
}

interface ToolbarState {
  isFullscreen: boolean;
  showMoreButtons: boolean;
}

// Default colors for color picker
const DEFAULT_COLORS: ColorOption[] = [
  { value: '#000000', label: 'Black' },
  { value: '#434343', label: 'Dark Gray 4' },
  { value: '#666666', label: 'Dark Gray 3' },
  { value: '#999999', label: 'Dark Gray 2' },
  { value: '#B7B7B7', label: 'Dark Gray 1' },
  { value: '#CCCCCC', label: 'Gray' },
  { value: '#D9D9D9', label: 'Light Gray 1' },
  { value: '#EFEFEF', label: 'Light Gray 2' },
  { value: '#F3F3F3', label: 'Light Gray 3' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#FF0000', label: 'Red' },
  { value: '#FF9900', label: 'Orange' },
  { value: '#FFFF00', label: 'Yellow' },
  { value: '#00FF00', label: 'Green' },
  { value: '#00FFFF', label: 'Cyan' },
  { value: '#0000FF', label: 'Blue' },
  { value: '#9900FF', label: 'Purple' },
  { value: '#FF00FF', label: 'Magenta' },
  { value: '#F4CCCC', label: 'Light Red' },
  { value: '#FCE5CD', label: 'Light Orange' },
  { value: '#FFF2CC', label: 'Light Yellow' },
  { value: '#D9EAD3', label: 'Light Green' },
  { value: '#D0E0E3', label: 'Light Cyan' },
  { value: '#CFE2F3', label: 'Light Blue' },
  { value: '#D9D2E9', label: 'Light Purple' },
  { value: '#EAD1DC', label: 'Light Magenta' },
];

/**
 * Parse font formats string into FontOption array
 */
function parseFontFormats(formats: string): FontOption[] {
  return formats.split(';').map(font => {
    const [label, value] = font.split('=');
    return {
      label: label.trim(),
      value: value?.trim() ?? label.trim().toLowerCase(),
    };
  });
}

/**
 * Parse font size formats string
 */
function parseFontSizes(formats: string): string[] {
  return formats.split(' ').map(s => s.trim()).filter(Boolean);
}

export class Toolbar {
  private container: HTMLElement;
  private options: ToolbarOptions;
  private state: ToolbarState;
  private buttonElements: Map<string, HTMLElement> = new Map();
  private dropdowns: Map<string, HTMLElement> = new Map();
  private charMap: CharacterMap | null = null;
  private emojiPicker: EmojiPicker | null = null;
  private searchReplace: SearchReplace | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(container: HTMLElement, options: ToolbarOptions) {
    this.container = container;
    this.options = options;
    this.state = {
      isFullscreen: false,
      showMoreButtons: false,
    };
    
    this.render();
    this.bindEvents();
    this.startStateUpdates();
  }
  
  private get tiptap(): TipTapEditor | null {
    return this.options.editor.getTipTap();
  }
  
  private get trans(): (key: string) => string {
    return getTranslate();
  }
  
  private render(): void {
    this.container.innerHTML = '';
    this.container.className = `md-toolbar md-toolbar-${this.options.mode}${this.options.sticky ? ' md-toolbar-sticky' : ''}`;
    
    // Parse toolbar string into groups
    const groups = this.options.buttons.split('|').map(g => g.trim());
    
    groups.forEach((group, index) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'md-toolbar-group';
      
      const buttons = group.split(' ').filter(Boolean);
      buttons.forEach(buttonName => {
        const buttonEl = this.createButton(buttonName);
        if (buttonEl) {
          groupEl.appendChild(buttonEl);
          this.buttonElements.set(buttonName, buttonEl);
        }
      });
      
      this.container.appendChild(groupEl);
      
      // Add separator except after last group
      if (index < groups.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'md-toolbar-separator';
        this.container.appendChild(separator);
      }
    });
  }
  
  private createButton(name: string): HTMLElement | null {
    // Check for custom button first
    const customSpec = this.options.customButtons.get(name);
    if (customSpec) {
      return this.createCustomButton(name, customSpec);
    }
    
    // Built-in buttons
    switch (name.toLowerCase()) {
      case 'bold':
        return this.createActionButton('bold', 'B', this.trans('Bold'), () => {
          this.tiptap?.chain().focus().toggleBold().run();
        }, () => this.tiptap?.isActive('bold') ?? false);
        
      case 'italic':
        return this.createActionButton('italic', 'I', this.trans('Italic'), () => {
          this.tiptap?.chain().focus().toggleItalic().run();
        }, () => this.tiptap?.isActive('italic') ?? false);
        
      case 'underline':
        return this.createActionButton('underline', 'U', this.trans('Underline'), () => {
          this.tiptap?.chain().focus().toggleUnderline().run();
        }, () => this.tiptap?.isActive('underline') ?? false);
        
      case 'strikethrough':
        return this.createActionButton('strikethrough', 'S', this.trans('Strikethrough'), () => {
          this.tiptap?.chain().focus().toggleStrike().run();
        }, () => this.tiptap?.isActive('strike') ?? false);
        
      case 'bullist':
        return this.createActionButton('bullist', '•', this.trans('Bullet list'), () => {
          this.tiptap?.chain().focus().toggleBulletList().run();
        }, () => this.tiptap?.isActive('bulletList') ?? false);
        
      case 'numlist':
        return this.createActionButton('numlist', '1.', this.trans('Numbered list'), () => {
          this.tiptap?.chain().focus().toggleOrderedList().run();
        }, () => this.tiptap?.isActive('orderedList') ?? false);
        
      case 'outdent':
        return this.createActionButton('outdent', '←', this.trans('Decrease indent'), () => {
          if (this.tiptap?.isActive('listItem')) {
            this.tiptap?.chain().focus().liftListItem('listItem').run();
          }
        });
        
      case 'indent':
        return this.createActionButton('indent', '→', this.trans('Increase indent'), () => {
          if (this.tiptap?.isActive('listItem')) {
            this.tiptap?.chain().focus().sinkListItem('listItem').run();
          }
        });
        
      case 'blockquote':
        return this.createActionButton('blockquote', '"', this.trans('Blockquote'), () => {
          this.tiptap?.chain().focus().toggleBlockquote().run();
        }, () => this.tiptap?.isActive('blockquote') ?? false);
        
      case 'fontfamily':
        return this.createFontFamilyDropdown();
        
      case 'fontsize':
        return this.createFontSizeDropdown();
        
      case 'lineheight':
        return this.createLineHeightDropdown();
        
      case 'alignleft':
        return this.createActionButton('alignleft', '⬛', this.trans('Align left'), () => {
          this.tiptap?.chain().focus().setTextAlign('left').run();
        }, () => this.tiptap?.isActive({ textAlign: 'left' }) ?? false);
        
      case 'aligncenter':
        return this.createActionButton('aligncenter', '⬛', this.trans('Align center'), () => {
          this.tiptap?.chain().focus().setTextAlign('center').run();
        }, () => this.tiptap?.isActive({ textAlign: 'center' }) ?? false);
        
      case 'alignright':
        return this.createActionButton('alignright', '⬛', this.trans('Align right'), () => {
          this.tiptap?.chain().focus().setTextAlign('right').run();
        }, () => this.tiptap?.isActive({ textAlign: 'right' }) ?? false);
        
      case 'alignjustify':
        return this.createActionButton('alignjustify', '⬛', this.trans('Justify'), () => {
          this.tiptap?.chain().focus().setTextAlign('justify').run();
        }, () => this.tiptap?.isActive({ textAlign: 'justify' }) ?? false);
        
      case 'forecolor':
        return this.createColorPicker('forecolor', this.trans('Text color'), (color) => {
          this.tiptap?.chain().focus().setColor(color).run();
        });
        
      case 'backcolor':
        return this.createColorPicker('backcolor', this.trans('Background color'), (color) => {
          this.tiptap?.chain().focus().setHighlight({ color }).run();
        });
        
      case 'removeformat':
        return this.createActionButton('removeformat', '✕', this.trans('Remove formatting'), () => {
          this.tiptap?.chain().focus().unsetAllMarks().clearNodes().run();
        });
        
      case 'copy':
        return this.createActionButton('copy', '📋', this.trans('Copy'), () => {
          document.execCommand('copy');
        });
        
      case 'cut':
        return this.createActionButton('cut', '✂', this.trans('Cut'), () => {
          document.execCommand('cut');
        });
        
      case 'paste':
        return this.createActionButton('paste', '📄', this.trans('Paste'), () => {
          document.execCommand('paste');
        });
        
      case 'undo':
        return this.createActionButton('undo', '↩', this.trans('Undo'), () => {
          this.tiptap?.chain().focus().undo().run();
        });
        
      case 'redo':
        return this.createActionButton('redo', '↪', this.trans('Redo'), () => {
          this.tiptap?.chain().focus().redo().run();
        });
        
      case 'image':
        return this.createActionButton('image', '🖼', this.trans('Insert image'), () => {
          this.openImageDialog();
        });
        
      case 'charmap':
        return this.createActionButton('charmap', 'Ω', this.trans('Special character'), () => {
          this.openCharMap();
        });
        
      case 'emoticons':
        return this.createActionButton('emoticons', '😀', this.trans('Emoticons'), () => {
          this.openEmojiPicker();
        });
        
      case 'fullscreen':
        return this.createActionButton('fullscreen', '⛶', this.trans('Fullscreen'), () => {
          this.toggleFullscreen();
        }, () => this.state.isFullscreen);
        
      case 'preview':
        return this.createActionButton('preview', '👁', this.trans('Preview'), () => {
          this.openPreview();
        });
        
      case 'code':
        return this.createActionButton('code', '</>', this.trans('Source code'), () => {
          this.openSourceCode();
        });
        
      case 'link':
        return this.createActionButton('link', '🔗', this.trans('Insert link'), () => {
          this.openLinkDialog();
        }, () => this.tiptap?.isActive('link') ?? false);
        
      case 'codesample':
        return this.createActionButton('codesample', '{}', this.trans('Code sample'), () => {
          this.tiptap?.chain().focus().toggleCodeBlock().run();
        }, () => this.tiptap?.isActive('codeBlock') ?? false);
        
      case 'ltr':
        return this.createActionButton('ltr', '⇐', this.trans('Left to right'), () => {
          this.tiptap?.chain().focus().setTextDirection('ltr').run();
        });
        
      case 'rtl':
        return this.createActionButton('rtl', '⇒', this.trans('Right to left'), () => {
          this.tiptap?.chain().focus().setTextDirection('rtl').run();
        });
        
      case 'searchreplace':
        return this.createActionButton('searchreplace', '🔍', this.trans('Find and replace'), () => {
          this.openSearchReplace();
        });
        
      case 'template':
        return this.createTemplateDropdown();
        
      default:
        console.warn(`Unknown toolbar button: ${name}`);
        return null;
    }
  }
  
  private createActionButton(
    name: string,
    icon: string,
    tooltip: string,
    onClick: () => void,
    isActive?: () => boolean
  ): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-toolbar-btn';
    button.setAttribute('data-button', name);
    button.title = tooltip;
    button.innerHTML = `<span class="md-toolbar-btn-icon md-icon-${name}">${icon}</span>`;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
      this.updateButtonStates();
    });
    
    if (isActive) {
      button.setAttribute('data-has-active', 'true');
    }
    
    return button;
  }
  
  private createCustomButton(name: string, spec: ToolbarButtonSpec): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-toolbar-btn md-toolbar-btn-custom';
    button.setAttribute('data-button', name);
    
    if (spec.tooltip) {
      button.title = spec.tooltip;
    }
    
    if (spec.icon) {
      button.innerHTML = `<img src="${spec.icon}" class="md-toolbar-btn-icon-img" />`;
    } else if (spec.text) {
      button.innerHTML = `<span class="md-toolbar-btn-text">${spec.text}</span>`;
    }
    
    const api = {
      isEnabled: () => !button.disabled,
      setEnabled: (enabled: boolean) => { button.disabled = !enabled; },
      isActive: () => button.classList.contains('md-toolbar-btn-active'),
      setActive: (active: boolean) => {
        button.classList.toggle('md-toolbar-btn-active', active);
      },
    };
    
    if (spec.onSetup) {
      spec.onSetup(api);
    }
    
    if (spec.onAction) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        spec.onAction!(api);
      });
    }
    
    return button;
  }
  
  private createFontFamilyDropdown(): HTMLElement {
    const fonts = parseFontFormats(this.options.config.font_family_formats ?? defaultFontNames);
    return this.createDropdown('fontfamily', this.trans('Font'), fonts, (font) => {
      this.tiptap?.chain().focus().setFontFamily(font.value).run();
    }, () => {
      const attrs = this.tiptap?.getAttributes('textStyle');
      return attrs?.fontFamily ?? '';
    });
  }
  
  private createFontSizeDropdown(): HTMLElement {
    const sizes = parseFontSizes(this.options.config.font_size_formats ?? '8pt 9pt 10pt 12pt 14pt 18pt 24pt 36pt');
    const options = sizes.map(s => ({ label: s, value: s }));
    return this.createDropdown('fontsize', this.trans('Font size'), options, (size) => {
      this.tiptap?.chain().focus().setFontSize(size.value).run();
    }, () => {
      const attrs = this.tiptap?.getAttributes('textStyle');
      return attrs?.fontSize ?? '';
    });
  }
  
  private createLineHeightDropdown(): HTMLElement {
    const heights = [
      { label: '1', value: '1' },
      { label: '1.2', value: '1.2' },
      { label: '1.4', value: '1.4' },
      { label: '1.6', value: '1.6' },
      { label: '2', value: '2' },
    ];
    return this.createDropdown('lineheight', this.trans('Line height'), heights, (height) => {
      this.tiptap?.chain().focus().setLineHeight(height.value).run();
    });
  }
  
  private createTemplateDropdown(): HTMLElement {
    const templates = this.options.config.templates ?? [];
    const options = templates.map(t => ({
      label: t.title,
      value: t.content,
      description: t.description,
    }));
    
    return this.createDropdown('template', this.trans('Templates'), options, (template) => {
      this.tiptap?.chain().focus().insertContent(template.value).run();
    });
  }
  
  private createDropdown(
    name: string,
    label: string,
    options: Array<{ label: string; value: string; description?: string }>,
    onSelect: (option: { label: string; value: string }) => void,
    getCurrentValue?: () => string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'md-toolbar-dropdown';
    wrapper.setAttribute('data-dropdown', name);
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-toolbar-dropdown-btn';
    button.title = label;
    button.innerHTML = `
      <span class="md-toolbar-dropdown-label">${label}</span>
      <span class="md-toolbar-dropdown-arrow">▼</span>
    `;
    
    const menu = document.createElement('div');
    menu.className = 'md-toolbar-dropdown-menu';
    menu.style.display = 'none';
    
    options.forEach(option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'md-toolbar-dropdown-item';
      item.setAttribute('data-value', option.value);
      
      let html = `<span class="md-toolbar-dropdown-item-label">${option.label}</span>`;
      if (option.description) {
        html += `<span class="md-toolbar-dropdown-item-desc">${option.description}</span>`;
      }
      item.innerHTML = html;
      
      // Apply font preview for font family dropdown
      if (name === 'fontfamily') {
        item.style.fontFamily = option.value;
      }
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(option);
        menu.style.display = 'none';
        wrapper.classList.remove('md-toolbar-dropdown-open');
      });
      
      menu.appendChild(item);
    });
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Close other dropdowns
      this.dropdowns.forEach((dropdown, key) => {
        if (key !== name) {
          dropdown.classList.remove('md-toolbar-dropdown-open');
          const m = dropdown.querySelector('.md-toolbar-dropdown-menu') as HTMLElement;
          if (m) m.style.display = 'none';
        }
      });
      
      const isOpen = menu.style.display !== 'none';
      menu.style.display = isOpen ? 'none' : 'block';
      wrapper.classList.toggle('md-toolbar-dropdown-open', !isOpen);
      
      // Update selected state
      if (!isOpen && getCurrentValue) {
        const currentVal = getCurrentValue();
        menu.querySelectorAll('.md-toolbar-dropdown-item').forEach(item => {
          const val = item.getAttribute('data-value');
          item.classList.toggle('md-toolbar-dropdown-item-selected', val === currentVal);
        });
      }
    });
    
    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    
    this.dropdowns.set(name, wrapper);
    
    return wrapper;
  }
  
  private createColorPicker(
    name: string,
    tooltip: string,
    onSelect: (color: string) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'md-toolbar-colorpicker';
    wrapper.setAttribute('data-colorpicker', name);
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-toolbar-btn md-toolbar-colorpicker-btn';
    button.title = tooltip;
    button.innerHTML = `
      <span class="md-toolbar-colorpicker-icon md-icon-${name}">A</span>
      <span class="md-toolbar-colorpicker-preview" style="background-color: ${name === 'forecolor' ? '#000' : '#ff0'}"></span>
      <span class="md-toolbar-dropdown-arrow">▼</span>
    `;
    
    const menu = document.createElement('div');
    menu.className = 'md-toolbar-colorpicker-menu';
    menu.style.display = 'none';
    
    const grid = document.createElement('div');
    grid.className = 'md-toolbar-colorpicker-grid';
    
    DEFAULT_COLORS.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'md-toolbar-colorpicker-swatch';
      swatch.title = color.label ?? color.value;
      swatch.style.backgroundColor = color.value;
      swatch.setAttribute('data-color', color.value);
      
      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(color.value);
        
        // Update preview
        const preview = button.querySelector('.md-toolbar-colorpicker-preview') as HTMLElement;
        if (preview) {
          preview.style.backgroundColor = color.value;
        }
        
        menu.style.display = 'none';
        wrapper.classList.remove('md-toolbar-colorpicker-open');
      });
      
      grid.appendChild(swatch);
    });
    
    // Custom color input
    const customRow = document.createElement('div');
    customRow.className = 'md-toolbar-colorpicker-custom';
    customRow.innerHTML = `
      <input type="color" class="md-toolbar-colorpicker-input" value="#000000" />
      <button type="button" class="md-toolbar-colorpicker-apply">${this.trans('Apply')}</button>
    `;
    
    const colorInput = customRow.querySelector('input') as HTMLInputElement;
    const applyBtn = customRow.querySelector('button') as HTMLButtonElement;
    
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(colorInput.value);
      
      const preview = button.querySelector('.md-toolbar-colorpicker-preview') as HTMLElement;
      if (preview) {
        preview.style.backgroundColor = colorInput.value;
      }
      
      menu.style.display = 'none';
      wrapper.classList.remove('md-toolbar-colorpicker-open');
    });
    
    menu.appendChild(grid);
    menu.appendChild(customRow);
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isOpen = menu.style.display !== 'none';
      menu.style.display = isOpen ? 'none' : 'block';
      wrapper.classList.toggle('md-toolbar-colorpicker-open', !isOpen);
    });
    
    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    
    this.dropdowns.set(name, wrapper);
    
    return wrapper;
  }
  
  private bindEvents(): void {
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.md-toolbar-dropdown, .md-toolbar-colorpicker')) {
        this.closeAllDropdowns();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.tiptap?.isFocused) return;
      
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod && e.key === 'b') {
        e.preventDefault();
        this.tiptap?.chain().focus().toggleBold().run();
      } else if (isMod && e.key === 'i') {
        e.preventDefault();
        this.tiptap?.chain().focus().toggleItalic().run();
      } else if (isMod && e.key === 'u') {
        e.preventDefault();
        this.tiptap?.chain().focus().toggleUnderline().run();
      } else if (isMod && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.tiptap?.chain().focus().redo().run();
        } else {
          this.tiptap?.chain().focus().undo().run();
        }
      } else if (isMod && e.key === 'f') {
        e.preventDefault();
        this.openSearchReplace();
      }
    });
  }
  
  private closeAllDropdowns(): void {
    this.dropdowns.forEach(dropdown => {
      dropdown.classList.remove('md-toolbar-dropdown-open', 'md-toolbar-colorpicker-open');
      const menu = dropdown.querySelector('.md-toolbar-dropdown-menu, .md-toolbar-colorpicker-menu') as HTMLElement;
      if (menu) {
        menu.style.display = 'none';
      }
    });
  }
  
  private startStateUpdates(): void {
    // Update button states periodically
    this.updateInterval = setInterval(() => {
      this.updateButtonStates();
    }, 100);
  }
  
  private updateButtonStates(): void {
    this.buttonElements.forEach((button, name) => {
      if (button.getAttribute('data-has-active') !== 'true') return;
      
      let isActive = false;
      
      switch (name) {
        case 'bold':
          isActive = this.tiptap?.isActive('bold') ?? false;
          break;
        case 'italic':
          isActive = this.tiptap?.isActive('italic') ?? false;
          break;
        case 'underline':
          isActive = this.tiptap?.isActive('underline') ?? false;
          break;
        case 'strikethrough':
          isActive = this.tiptap?.isActive('strike') ?? false;
          break;
        case 'bullist':
          isActive = this.tiptap?.isActive('bulletList') ?? false;
          break;
        case 'numlist':
          isActive = this.tiptap?.isActive('orderedList') ?? false;
          break;
        case 'blockquote':
          isActive = this.tiptap?.isActive('blockquote') ?? false;
          break;
        case 'alignleft':
          isActive = this.tiptap?.isActive({ textAlign: 'left' }) ?? false;
          break;
        case 'aligncenter':
          isActive = this.tiptap?.isActive({ textAlign: 'center' }) ?? false;
          break;
        case 'alignright':
          isActive = this.tiptap?.isActive({ textAlign: 'right' }) ?? false;
          break;
        case 'alignjustify':
          isActive = this.tiptap?.isActive({ textAlign: 'justify' }) ?? false;
          break;
        case 'link':
          isActive = this.tiptap?.isActive('link') ?? false;
          break;
        case 'codesample':
          isActive = this.tiptap?.isActive('codeBlock') ?? false;
          break;
        case 'fullscreen':
          isActive = this.state.isFullscreen;
          break;
      }
      
      button.classList.toggle('md-toolbar-btn-active', isActive);
    });
  }
  
  // Dialog methods
  
  private openImageDialog(): void {
    const url = prompt(this.trans('Enter image URL:'));
    if (url) {
      this.tiptap?.chain().focus().setImage({ src: url }).run();
    }
  }
  
  private openLinkDialog(): void {
    const previousUrl = this.tiptap?.getAttributes('link').href ?? '';
    const url = prompt(this.trans('Enter URL:'), previousUrl);
    
    if (url === null) return;
    
    if (url === '') {
      this.tiptap?.chain().focus().unsetLink().run();
    } else {
      this.tiptap?.chain().focus().setLink({ href: url }).run();
    }
  }
  
  private openCharMap(): void {
    if (!this.charMap) {
      this.charMap = new CharacterMap({
        onSelect: (char) => {
          this.tiptap?.chain().focus().insertContent(char).run();
        },
        trans: this.trans,
      });
    }
    this.charMap.open();
  }
  
  private openEmojiPicker(): void {
    if (!this.emojiPicker) {
      this.emojiPicker = new EmojiPicker({
        onSelect: (emoji) => {
          this.tiptap?.chain().focus().insertContent(emoji).run();
        },
        trans: this.trans,
      });
    }
    this.emojiPicker.open();
  }
  
  private openSearchReplace(): void {
    if (!this.searchReplace) {
      this.searchReplace = new SearchReplace({
        editor: this.options.editor,
        trans: this.trans,
      });
    }
    this.searchReplace.open();
  }
  
  private openSourceCode(): void {
    const html = this.tiptap?.getHTML() ?? '';
    const newHtml = prompt(this.trans('Edit HTML source:'), html);
    if (newHtml !== null) {
      this.tiptap?.commands.setContent(newHtml);
    }
  }
  
  private openPreview(): void {
    const html = this.tiptap?.getHTML() ?? '';
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.trans('Preview')}</title>
          <style>body { font-family: sans-serif; padding: 20px; }</style>
        </head>
        <body>${html}</body>
        </html>
      `);
      previewWindow.document.close();
    }
  }
  
  private toggleFullscreen(): void {
    this.state.isFullscreen = !this.state.isFullscreen;
    
    const editorWrapper = this.container.closest('.md-editor');
    if (editorWrapper) {
      editorWrapper.classList.toggle('md-editor-fullscreen', this.state.isFullscreen);
    }
    
    if (this.state.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    this.updateButtonStates();
  }
  
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.charMap?.destroy();
    this.emojiPicker?.destroy();
    this.searchReplace?.destroy();
    
    this.buttonElements.clear();
    this.dropdowns.clear();
    this.container.innerHTML = '';
  }
}
