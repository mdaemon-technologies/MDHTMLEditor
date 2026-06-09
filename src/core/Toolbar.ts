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
import type { IconSet } from '../icons';
import { HTMLEditor, fontNames as defaultFontNames, getTranslate } from './HTMLEditor';
import { CharacterMap } from '../extensions/CharacterMap';
import { EmojiPicker } from '../extensions/Emoji';
import { ImageUpload } from '../extensions/ImageUpload';
import { SearchReplace } from '../extensions/SearchReplace';
import { SourceEditor } from '../extensions/SourceEditor';
import { LinkEditor } from '../extensions/LinkEditor';
import { AnchorDialog } from '../extensions/AnchorDialog';
import { SpeechToText, isSpeechRecognitionSupported } from '../extensions/SpeechToText';
import { Dictation } from '../extensions/Dictation';
import type { StyleFormat } from '../types';

interface ToolbarOptions {
  editor: HTMLEditor;
  buttons: string;
  mode: 'sliding' | 'floating' | 'wrap';
  sticky: boolean;
  customButtons: Map<string, ToolbarButtonSpec>;
  config: EditorConfig;
  iconSet: IconSet;
  narrowBreakpoint: number;
  priorityOverrides: Record<string, number>;
}

interface ToolbarState {
  isFullscreen: boolean;
  showMoreButtons: boolean;
  isNarrow: boolean;
}

// Default button priority tiers: 1 = always visible in narrow mode, 2 = collapsed behind toggle
const DEFAULT_BUTTON_PRIORITY: Record<string, number> = {
  bold: 1,
  italic: 1,
  underline: 1,
  undo: 1,
  redo: 1,
  link: 1,
  forecolor: 1,
};

// Default block-format dropdown definitions (TinyMCE-style "Label=tag;...").
const DEFAULT_BLOCK_FORMATS = 'Paragraph=p;Heading 1=h1;Heading 2=h2;Heading 3=h3;Heading 4=h4;Heading 5=h5;Heading 6=h6';

// Default Styles dropdown definitions (subset of CKEditor's stylesSet that maps
// cleanly onto the TipTap schema: headings with color, and highlight markers).
const DEFAULT_STYLE_FORMATS: StyleFormat[] = [
  { title: 'Blue Title', block: 'h3', styles: { color: 'Blue' } },
  { title: 'Red Title', block: 'h3', styles: { color: 'Red' } },
  { title: 'Marker: Yellow', inline: 'span', styles: { 'background-color': 'Yellow' } },
  { title: 'Marker: Green', inline: 'span', styles: { 'background-color': 'Lime' } },
];

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
  private bodyMenus: HTMLElement[] = [];
  private charMap: CharacterMap | null = null;
  private emojiPicker: EmojiPicker | null = null;
  private imageUpload: ImageUpload | null = null;
  private searchReplace: SearchReplace | null = null;
  private sourceEditor: SourceEditor | null = null;
  private linkEditor: LinkEditor | null = null;
  private anchorDialog: AnchorDialog | null = null;
  private speechToText: SpeechToText | null = null;
  private dictation: Dictation | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private buttonsEl: HTMLElement | null = null;
  private toggleBtn: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  
  constructor(container: HTMLElement, options: ToolbarOptions) {
    this.container = container;
    this.options = options;
    this.state = {
      isFullscreen: false,
      showMoreButtons: false,
      isNarrow: false,
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
  
  private icon(name: string): string {
    return this.options.iconSet[name] ?? name;
  }
  
  private render(): void {
    this.container.innerHTML = '';
    this.container.className = `md-toolbar md-toolbar-${this.options.mode}${this.options.sticky ? ' md-toolbar-sticky' : ''}`;
    
    // All buttons go into a single wrapping container
    this.buttonsEl = document.createElement('div');
    this.buttonsEl.className = 'md-toolbar-buttons';
    
    // Normalize || to | for backward compatibility
    const buttonsStr = this.options.buttons.replace(/\|\|/g, '|');
    this.renderGroups(buttonsStr, this.buttonsEl);
    
    this.container.appendChild(this.buttonsEl);
    
    // Toggle button sits outside the wrapping container so it's always visible
    this.toggleBtn = this.createToggleButton();
    this.container.appendChild(this.toggleBtn);
    
    // Apply initial state
    if (this.state.showMoreButtons) {
      this.buttonsEl.classList.add('md-toolbar-expanded');
      this.toggleBtn.classList.add('md-toolbar-btn-active');
    }
    
    // Auto-hide toggle when all buttons fit on one row
    this.observeOverflow();
  }
  
  private observeOverflow(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    const editorRoot = this.container.closest('.md-editor') as HTMLElement | null;
    
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.buttonsEl || !this.toggleBtn) return;
      
      // Detect narrow container and toggle class on the editor root
      if (editorRoot) {
        const width = editorRoot.offsetWidth;
        const breakpoint = this.options.narrowBreakpoint;
        const wasNarrow = this.state.isNarrow;
        this.state.isNarrow = width <= breakpoint;
        editorRoot.classList.toggle('md-editor-narrow', this.state.isNarrow);
        
        if (this.state.isNarrow) {
          // In narrow mode: hide toggle, collapse if expanded, enable scroll indicators
          this.toggleBtn.style.display = 'none';
          if (this.state.showMoreButtons) {
            this.state.showMoreButtons = false;
            this.buttonsEl.classList.remove('md-toolbar-expanded');
            this.toggleBtn.classList.remove('md-toolbar-btn-active');
          }
          this.updateScrollIndicators();
          if (!wasNarrow) {
            this.bindScrollIndicators();
          }
        } else {
          // Wide mode: restore toggle visibility based on overflow
          if (wasNarrow) {
            this.unbindScrollIndicators();
          }
          const hasOverflow = this.buttonsEl.scrollHeight > this.buttonsEl.clientHeight;
          this.toggleBtn.style.display = hasOverflow || this.state.showMoreButtons ? '' : 'none';
        }
      } else {
        // No editor root — just handle toggle visibility
        const hasOverflow = this.buttonsEl.scrollHeight > this.buttonsEl.clientHeight;
        this.toggleBtn.style.display = hasOverflow || this.state.showMoreButtons ? '' : 'none';
      }
    });
    
    // Observe both the buttons container and the editor root for resize
    this.resizeObserver.observe(this.buttonsEl!);
    if (editorRoot) {
      this.resizeObserver.observe(editorRoot);
    }
  }
  
  private scrollHandler: (() => void) | null = null;
  
  private bindScrollIndicators(): void {
    if (!this.buttonsEl) return;
    this.scrollHandler = () => this.updateScrollIndicators();
    this.buttonsEl.addEventListener('scroll', this.scrollHandler, { passive: true });
  }
  
  private unbindScrollIndicators(): void {
    if (this.buttonsEl && this.scrollHandler) {
      this.buttonsEl.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
    // Remove scroll indicator classes
    this.container.classList.remove('md-toolbar-scroll-start', 'md-toolbar-scroll-middle', 'md-toolbar-scroll-end');
  }
  
  private updateScrollIndicators(): void {
    if (!this.buttonsEl) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.buttonsEl;
    const maxScroll = scrollWidth - clientWidth;
    
    // Not scrollable at all — no indicators
    if (maxScroll <= 1) {
      this.container.classList.remove('md-toolbar-scroll-start', 'md-toolbar-scroll-middle', 'md-toolbar-scroll-end');
      return;
    }
    
    const atStart = scrollLeft <= 1;
    const atEnd = scrollLeft >= maxScroll - 1;
    
    this.container.classList.remove('md-toolbar-scroll-start', 'md-toolbar-scroll-middle', 'md-toolbar-scroll-end');
    if (atStart) {
      this.container.classList.add('md-toolbar-scroll-start');
    } else if (atEnd) {
      this.container.classList.add('md-toolbar-scroll-end');
    } else {
      this.container.classList.add('md-toolbar-scroll-middle');
    }
  }
  
  private getButtonPriority(name: string): number {
    const overrides = this.options.priorityOverrides;
    if (overrides[name] !== undefined) return overrides[name];
    return DEFAULT_BUTTON_PRIORITY[name] ?? 2;
  }

  private renderGroups(buttonsStr: string, parent: HTMLElement): void {
    const groups = buttonsStr.split('|').map(g => g.trim()).filter(Boolean);
    
    groups.forEach((group, index) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'md-toolbar-group';
      
      const buttons = group.split(' ').filter(Boolean);
      let groupMinPriority = 2;
      buttons.forEach(buttonName => {
        const buttonEl = this.createButton(buttonName);
        if (buttonEl) {
          const priority = this.getButtonPriority(buttonName);
          buttonEl.setAttribute('data-priority', String(priority));
          if (priority < groupMinPriority) groupMinPriority = priority;
          groupEl.appendChild(buttonEl);
          this.buttonElements.set(buttonName, buttonEl);
        }
      });
      
      // Mark group with its highest priority (lowest number)
      groupEl.setAttribute('data-priority', String(groupMinPriority));
      parent.appendChild(groupEl);
      
      // Add separator except after last group
      if (index < groups.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'md-toolbar-separator';
        parent.appendChild(separator);
      }
    });
  }
  
  private createToggleButton(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-toolbar-btn md-toolbar-toggle-btn';
    button.setAttribute('data-button', 'togglemore');
    button.title = this.trans('More');
    button.innerHTML = `<span class="md-toolbar-btn-icon">${this.icon('togglemore')}</span>`;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleOverflow();
    });
    
    return button;
  }
  
  private toggleOverflow(): void {
    this.state.showMoreButtons = !this.state.showMoreButtons;
    
    if (this.buttonsEl) {
      this.buttonsEl.classList.toggle('md-toolbar-expanded', this.state.showMoreButtons);
    }
    if (this.toggleBtn) {
      this.toggleBtn.classList.toggle('md-toolbar-btn-active', this.state.showMoreButtons);
      // Keep toggle visible while expanded so user can collapse
      if (this.state.showMoreButtons) {
        this.toggleBtn.style.display = '';
      }
    }
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
        return this.createActionButton('bold', this.icon('bold'), this.trans('Bold'), () => {
          this.tiptap?.chain().focus().toggleBold().run();
        }, () => this.tiptap?.isActive('bold') ?? false);
        
      case 'italic':
        return this.createActionButton('italic', this.icon('italic'), this.trans('Italic'), () => {
          this.tiptap?.chain().focus().toggleItalic().run();
        }, () => this.tiptap?.isActive('italic') ?? false);
        
      case 'underline':
        return this.createActionButton('underline', this.icon('underline'), this.trans('Underline'), () => {
          this.tiptap?.chain().focus().toggleUnderline().run();
        }, () => this.tiptap?.isActive('underline') ?? false);
        
      case 'strikethrough':
        return this.createActionButton('strikethrough', this.icon('strikethrough'), this.trans('Strikethrough'), () => {
          this.tiptap?.chain().focus().toggleStrike().run();
        }, () => this.tiptap?.isActive('strike') ?? false);

      case 'subscript':
        return this.createActionButton('subscript', this.icon('subscript'), this.trans('Subscript'), () => {
          this.tiptap?.chain().focus().toggleSubscript().run();
        }, () => this.tiptap?.isActive('subscript') ?? false);

      case 'superscript':
        return this.createActionButton('superscript', this.icon('superscript'), this.trans('Superscript'), () => {
          this.tiptap?.chain().focus().toggleSuperscript().run();
        }, () => this.tiptap?.isActive('superscript') ?? false);

      case 'hr':
        return this.createActionButton('hr', this.icon('hr'), this.trans('Horizontal rule'), () => {
          this.tiptap?.chain().focus().setHorizontalRule().run();
        });

      case 'blocks':
      case 'formatselect':
        return this.createFormatDropdown();

      case 'styles':
        return this.createStylesDropdown();

      case 'table':
        return this.createTableDropdown();

      case 'anchor':
        return this.createActionButton('anchor', this.icon('anchor'), this.trans('Insert anchor'), () => {
          this.openAnchorDialog();
        });

      case 'unlink':
        return this.createActionButton('unlink', this.icon('unlink'), this.trans('Unlink'), () => {
          this.tiptap?.chain().focus().unsetLink().run();
        }, () => this.tiptap?.isActive('link') ?? false);

      case 'bullist':
        return this.createActionButton('bullist', this.icon('bullist'), this.trans('Bullet list'), () => {
          this.tiptap?.chain().focus().toggleBulletList().run();
        }, () => this.tiptap?.isActive('bulletList') ?? false);
        
      case 'numlist':
        return this.createActionButton('numlist', this.icon('numlist'), this.trans('Numbered list'), () => {
          this.tiptap?.chain().focus().toggleOrderedList().run();
        }, () => this.tiptap?.isActive('orderedList') ?? false);
        
      case 'outdent':
        return this.createActionButton('outdent', this.icon('outdent'), this.trans('Decrease indent'), () => {
          if (this.tiptap?.isActive('listItem')) {
            this.tiptap?.chain().focus().liftListItem('listItem').run();
          }
        });
        
      case 'indent':
        return this.createActionButton('indent', this.icon('indent'), this.trans('Increase indent'), () => {
          if (this.tiptap?.isActive('listItem')) {
            this.tiptap?.chain().focus().sinkListItem('listItem').run();
          }
        });
        
      case 'blockquote':
        return this.createActionButton('blockquote', this.icon('blockquote'), this.trans('Blockquote'), () => {
          this.tiptap?.chain().focus().toggleBlockquote().run();
        }, () => this.tiptap?.isActive('blockquote') ?? false);
        
      case 'fontfamily':
        return this.createFontFamilyDropdown();
        
      case 'fontsize':
        return this.createFontSizeDropdown();
        
      case 'lineheight':
        return this.createLineHeightDropdown();
        
      case 'alignleft':
        return this.createActionButton('alignleft', this.icon('alignleft'), this.trans('Align left'), () => {
          this.tiptap?.chain().focus().setTextAlign('left').run();
        }, () => this.tiptap?.isActive({ textAlign: 'left' }) ?? false);
        
      case 'aligncenter':
        return this.createActionButton('aligncenter', this.icon('aligncenter'), this.trans('Align center'), () => {
          this.tiptap?.chain().focus().setTextAlign('center').run();
        }, () => this.tiptap?.isActive({ textAlign: 'center' }) ?? false);
        
      case 'alignright':
        return this.createActionButton('alignright', this.icon('alignright'), this.trans('Align right'), () => {
          this.tiptap?.chain().focus().setTextAlign('right').run();
        }, () => this.tiptap?.isActive({ textAlign: 'right' }) ?? false);
        
      case 'alignjustify':
        return this.createActionButton('alignjustify', this.icon('alignjustify'), this.trans('Justify'), () => {
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
        return this.createActionButton('removeformat', this.icon('removeformat'), this.trans('Remove formatting'), () => {
          this.tiptap?.chain().focus().unsetAllMarks().clearNodes().run();
        });
        
      case 'copy':
        return this.createActionButton('copy', this.icon('copy'), this.trans('Copy'), () => {
          document.execCommand('copy');
        });
        
      case 'cut':
        return this.createActionButton('cut', this.icon('cut'), this.trans('Cut'), () => {
          document.execCommand('cut');
        });
        
      case 'paste':
        return this.createActionButton('paste', this.icon('paste'), this.trans('Paste'), () => {
          void this.pasteFromClipboard();
        });
        
      case 'undo':
        return this.createActionButton('undo', this.icon('undo'), this.trans('Undo'), () => {
          this.tiptap?.chain().focus().undo().run();
        });
        
      case 'redo':
        return this.createActionButton('redo', this.icon('redo'), this.trans('Redo'), () => {
          this.tiptap?.chain().focus().redo().run();
        });
        
      case 'image':
        return this.createActionButton('image', this.icon('image'), this.trans('Insert image'), () => {
          this.openImageDialog();
        });
        
      case 'charmap':
        return this.createActionButton('charmap', this.icon('charmap'), this.trans('Special character'), () => {
          this.openCharMap();
        });
        
      case 'emoticons':
        return this.createActionButton('emoticons', this.icon('emoticons'), this.trans('Emoticons'), () => {
          this.openEmojiPicker();
        });
        
      case 'fullscreen':
        return this.createActionButton('fullscreen', this.icon('fullscreen'), this.trans('Fullscreen'), () => {
          this.toggleFullscreen();
        }, () => this.state.isFullscreen);
        
      case 'preview':
        return this.createActionButton('preview', this.icon('preview'), this.trans('Preview'), () => {
          this.openPreview();
        });
        
      case 'code':
        return this.createActionButton('code', this.icon('code'), this.trans('Source code'), () => {
          this.openSourceCode();
        });
        
      case 'link':
        return this.createActionButton('link', this.icon('link'), this.trans('Insert link'), () => {
          this.openLinkDialog();
        }, () => this.tiptap?.isActive('link') ?? false);
        
      case 'codesample':
        return this.createActionButton('codesample', this.icon('codesample'), this.trans('Code sample'), () => {
          this.tiptap?.chain().focus().toggleCodeBlock().run();
        }, () => this.tiptap?.isActive('codeBlock') ?? false);
        
      case 'ltr':
        return this.createActionButton('ltr', this.icon('ltr'), this.trans('Left to right'), () => {
          this.tiptap?.chain().focus().setTextDirection('ltr').run();
        });
        
      case 'rtl':
        return this.createActionButton('rtl', this.icon('rtl'), this.trans('Right to left'), () => {
          this.tiptap?.chain().focus().setTextDirection('rtl').run();
        });
        
      case 'searchreplace':
        return this.createActionButton('searchreplace', this.icon('searchreplace'), this.trans('Find and replace'), () => {
          this.openSearchReplace();
        });
        
      case 'speechtotext': {
        if (this.options.config.speech_to_text === false) return null;
        if (!isSpeechRecognitionSupported()) {
          const btn = this.createActionButton('speechtotext', this.icon('speechtotext'), this.trans('Speech to text is not supported in this browser'), () => {});
          btn.classList.add('md-toolbar-btn-disabled');
          btn.setAttribute('aria-disabled', 'true');
          return btn;
        }
        return this.createActionButton('speechtotext', this.icon('speechtotext'), this.trans('Speech to Text'), () => {
          this.openSpeechToText();
        });
      }

      case 'dictate': {
        if (this.options.config.speech_to_text === false) return null;
        if (!isSpeechRecognitionSupported()) {
          const btn = this.createActionButton('dictate', this.icon('dictate'), this.trans('Speech to text is not supported in this browser'), () => {});
          btn.classList.add('md-toolbar-btn-disabled');
          btn.setAttribute('aria-disabled', 'true');
          return btn;
        }
        return this.createActionButton('dictate', this.icon('dictate'), this.trans('Dictate'), () => {
          this.toggleDictation();
        });
      }
        
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

  /**
   * Paste clipboard contents into the editor.
   *
   * `document.execCommand('paste')` is deprecated and blocked by every modern
   * browser (a page is not allowed to silently read the clipboard), so we use
   * the async Clipboard API instead. It prompts the user for clipboard-read
   * permission on first use. We focus the editor *before* awaiting the read —
   * the Clipboard API rejects with "Document is not focused" if the page has
   * lost focus, and focusing first also restores the editor selection so the
   * content lands where the cursor was. HTML is preferred when the clipboard
   * provides it; otherwise we fall back to plain text.
   *
   * Note: some browsers (notably Firefox) block clipboard reads from web pages
   * by default; in that case nothing can be pasted programmatically and the
   * user must use Ctrl/Cmd+V, which the engine handles directly.
   */
  private async pasteFromClipboard(): Promise<void> {
    if (!this.tiptap) {
      return;
    }

    // Restore focus/selection to the editor up front (also satisfies the
    // Clipboard API's "document must be focused" requirement).
    this.tiptap.commands.focus();

    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard || (typeof clipboard.read !== 'function' && typeof clipboard.readText !== 'function')) {
      // eslint-disable-next-line no-console
      console.warn('[html-editor] Paste button: the Clipboard API is unavailable. Use Ctrl/Cmd+V instead.');
      return;
    }

    let html: string | null = null;
    let text: string | null = null;

    try {
      // Prefer the richer read() so we can keep HTML formatting when present.
      if (typeof clipboard.read === 'function') {
        const items = await clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            html = await (await item.getType('text/html')).text();
          } else if (item.types.includes('text/plain') && text === null) {
            text = await (await item.getType('text/plain')).text();
          }
        }
      }
    } catch (err) {
      // read() can reject (no HTML on clipboard, or read() unsupported on this
      // browser) — fall back to readText() below. Genuine permission denials
      // are surfaced by the readText() catch.
      // eslint-disable-next-line no-console
      console.debug('[html-editor] clipboard.read() failed, falling back to readText():', err);
    }

    if (html === null && text === null) {
      try {
        if (typeof clipboard.readText === 'function') {
          text = await clipboard.readText();
        }
      } catch (err) {
        // Permission denied or unsupported — nothing we can do programmatically.
        // eslint-disable-next-line no-console
        console.warn('[html-editor] Paste button: clipboard read was blocked by the browser. Use Ctrl/Cmd+V instead.', err);
        return;
      }
    }

    // Clipboard HTML is wrapped in document scaffolding (a <meta charset> tag
    // and Start/EndFragment comments) that ProseMirror does not parse cleanly;
    // strip it down to the actual fragment before inserting.
    const content = html !== null ? this.extractClipboardFragment(html) : text;
    if (!content) {
      return;
    }

    this.tiptap.chain().focus().insertContent(content).run();
    this.updateButtonStates();
  }

  /**
   * Reduce a raw `text/html` clipboard payload to the meaningful fragment:
   * unwrap the `<html>/<body>` scaffolding browsers add and drop the
   * `<!--StartFragment-->`/`<!--EndFragment-->` markers and leading `<meta>`.
   */
  private extractClipboardFragment(html: string): string {
    const start = html.indexOf('<!--StartFragment-->');
    const end = html.indexOf('<!--EndFragment-->');
    if (start !== -1 && end !== -1) {
      return html.slice(start + '<!--StartFragment-->'.length, end).trim();
    }

    const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    if (bodyMatch) {
      return bodyMatch[1].trim();
    }

    // No scaffolding — just strip any leading <meta>/<html> noise.
    return html.replace(/^\s*<meta[^>]*>/i, '').trim();
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
    
    return this.createDropdown('template', this.trans('Templates'), options, (selected) => {
      this.tiptap?.chain().focus().insertContent(selected.value).run();
      const matched = templates.find(t => t.content === selected.value);
      if (matched) {
        this.options.editor.fire('templatechange', matched);
      }
    });
  }

  private createFormatDropdown(): HTMLElement {
    const spec = this.options.config.block_formats ?? DEFAULT_BLOCK_FORMATS;
    const options = spec.split(';').map(entry => {
      const [label, value] = entry.split('=');
      return { label: this.trans(label.trim()), value: (value ?? label).trim().toLowerCase() };
    }).filter(o => o.value);

    return this.createDropdown('blocks', this.trans('Format'), options, (option) => {
      const chain = this.tiptap?.chain().focus();
      if (!chain) return;
      const m = /^h([1-6])$/.exec(option.value);
      if (m) {
        chain.toggleHeading({ level: Number(m[1]) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
      } else {
        chain.setParagraph().run();
      }
    }, () => {
      for (let level = 1; level <= 6; level++) {
        if (this.tiptap?.isActive('heading', { level })) return `h${level}`;
      }
      return this.tiptap?.isActive('paragraph') ? 'p' : '';
    });
  }

  private getStyleFormats(): StyleFormat[] {
    return this.options.config.style_formats ?? DEFAULT_STYLE_FORMATS;
  }

  private createStylesDropdown(): HTMLElement {
    const formats = this.getStyleFormats();
    const options = formats.map((f, i) => ({ label: f.title, value: String(i) }));

    return this.createDropdown('styles', this.trans('Styles'), options, (option) => {
      const fmt = formats[Number(option.value)];
      if (fmt) this.applyStyleFormat(fmt);
    });
  }

  /**
   * Apply a StyleFormat to the current selection. Block elements map to
   * heading/paragraph; color and background map to the existing Color /
   * Highlight marks; classes map to the InlineStyle textStyle class.
   * (Arbitrary element wrapping from CKEditor stylesSet is not supported.)
   */
  private applyStyleFormat(fmt: StyleFormat): void {
    const chain = this.tiptap?.chain().focus();
    if (!chain) return;

    const blockEl = fmt.block;
    if (blockEl) {
      const m = /^h([1-6])$/.exec(blockEl);
      if (m) {
        chain.setHeading({ level: Number(m[1]) as 1 | 2 | 3 | 4 | 5 | 6 });
      } else if (blockEl === 'p') {
        chain.setParagraph();
      }
    }

    if (fmt.styles) {
      if (fmt.styles.color) {
        chain.setColor(fmt.styles.color);
      }
      const bg = fmt.styles['background-color'];
      if (bg) {
        chain.setHighlight({ color: bg });
      }
    }

    if (fmt.classes) {
      chain.setInlineClass(fmt.classes);
    }

    chain.run();
  }

  private createTableDropdown(): HTMLElement {
    const t = this.trans;
    const options = [
      { label: t('Insert table'), value: 'insert' },
      { label: t('Insert row before'), value: 'rowBefore' },
      { label: t('Insert row after'), value: 'rowAfter' },
      { label: t('Delete row'), value: 'deleteRow' },
      { label: t('Insert column before'), value: 'colBefore' },
      { label: t('Insert column after'), value: 'colAfter' },
      { label: t('Delete column'), value: 'deleteCol' },
      { label: t('Merge cells'), value: 'merge' },
      { label: t('Split cell'), value: 'split' },
      { label: t('Toggle header row'), value: 'headerRow' },
      { label: t('Delete table'), value: 'deleteTable' },
    ];

    return this.createDropdown('table', this.trans('Table'), options, (option) => {
      const chain = this.tiptap?.chain().focus();
      if (!chain) return;
      switch (option.value) {
        case 'insert': chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
        case 'rowBefore': chain.addRowBefore().run(); break;
        case 'rowAfter': chain.addRowAfter().run(); break;
        case 'deleteRow': chain.deleteRow().run(); break;
        case 'colBefore': chain.addColumnBefore().run(); break;
        case 'colAfter': chain.addColumnAfter().run(); break;
        case 'deleteCol': chain.deleteColumn().run(); break;
        case 'merge': chain.mergeCells().run(); break;
        case 'split': chain.splitCell().run(); break;
        case 'headerRow': chain.toggleHeaderRow().run(); break;
        case 'deleteTable': chain.deleteTable().run(); break;
      }
    });
  }

  /**
   * Position a fixed-position menu below its trigger button.
   * Uses getBoundingClientRect so the menu escapes any overflow:hidden ancestor.
   */
  private positionMenu(button: HTMLElement, menu: HTMLElement): void {
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom}px`;
    menu.style.left = `${rect.left}px`;
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
      <span class="md-toolbar-dropdown-arrow"><svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M0 2l4 4 4-4z"/></svg></span>
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
          dropdown.classList.remove('md-toolbar-dropdown-open', 'md-toolbar-colorpicker-open');
        }
      });
      this.bodyMenus.forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      
      const isOpen = menu.style.display !== 'none';
      menu.style.display = isOpen ? 'none' : 'block';
      wrapper.classList.toggle('md-toolbar-dropdown-open', !isOpen);

      // Position the fixed menu below its trigger button
      if (!isOpen) {
        this.positionMenu(button, menu);
      }
      
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
    document.body.appendChild(menu);
    this.bodyMenus.push(menu);
    
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
      <span class="md-toolbar-dropdown-arrow"><svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M0 2l4 4 4-4z"/></svg></span>
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
      
      // Close other dropdowns
      this.dropdowns.forEach((dropdown, key) => {
        if (key !== name) {
          dropdown.classList.remove('md-toolbar-dropdown-open', 'md-toolbar-colorpicker-open');
        }
      });
      this.bodyMenus.forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      
      const isOpen = menu.style.display !== 'none';
      menu.style.display = isOpen ? 'none' : 'block';
      wrapper.classList.toggle('md-toolbar-colorpicker-open', !isOpen);

      // Position the fixed menu below its trigger button
      if (!isOpen) {
        this.positionMenu(button, menu);
      }
    });
    
    wrapper.appendChild(button);
    document.body.appendChild(menu);
    this.bodyMenus.push(menu);
    
    this.dropdowns.set(name, wrapper);
    
    return wrapper;
  }
  
  private bindEvents(): void {
    // Remove any previously bound handlers
    this.unbindEvents();

    // Close dropdowns when clicking outside
    this.boundClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const inDropdown = target.closest('.md-toolbar-dropdown, .md-toolbar-colorpicker');
      const inBodyMenu = this.bodyMenus.some(m => m.contains(target));
      if (!inDropdown && !inBodyMenu) {
        this.closeAllDropdowns();
      }
    };
    document.addEventListener('click', this.boundClickHandler);
    
    // Keyboard shortcuts
    this.boundKeydownHandler = (e: KeyboardEvent) => {
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
    };
    document.addEventListener('keydown', this.boundKeydownHandler);
  }

  private unbindEvents(): void {
    if (this.boundClickHandler) {
      document.removeEventListener('click', this.boundClickHandler);
      this.boundClickHandler = null;
    }
    if (this.boundKeydownHandler) {
      document.removeEventListener('keydown', this.boundKeydownHandler);
      this.boundKeydownHandler = null;
    }
  }
  
  private closeAllDropdowns(): void {
    this.dropdowns.forEach(dropdown => {
      dropdown.classList.remove('md-toolbar-dropdown-open', 'md-toolbar-colorpicker-open');
    });
    this.bodyMenus.forEach(menu => {
      menu.style.display = 'none';
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
        case 'subscript':
          isActive = this.tiptap?.isActive('subscript') ?? false;
          break;
        case 'superscript':
          isActive = this.tiptap?.isActive('superscript') ?? false;
          break;
        case 'unlink':
          isActive = this.tiptap?.isActive('link') ?? false;
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
    if (!this.imageUpload) {
      this.imageUpload = new ImageUpload({
        onInsert: (src, alt) => {
          this.tiptap?.chain().focus().setImage({ src, alt: alt ?? '' }).run();
        },
        uploadUrl: this.options.config.images_upload_url,
        uploadCredentials: this.options.config.images_upload_credentials,
        uploadBasePath: this.options.config.images_upload_base_path,
        uploadMaxSize: this.options.config.images_upload_max_size,
        uploadHeaders: this.options.config.images_upload_headers,
        fileTypes: this.options.config.images_file_types,
        validate: this.options.config.images_upload_validate,
        onError: this.options.config.images_upload_error,
        trans: this.trans,
      });
    }
    this.imageUpload.open();
  }
  
  private openLinkDialog(): void {
    if (!this.linkEditor) {
      this.linkEditor = new LinkEditor({
        editor: this.options.editor,
        trans: this.trans,
      });
    }
    this.linkEditor.open();
  }
  
  private openAnchorDialog(): void {
    if (!this.anchorDialog) {
      this.anchorDialog = new AnchorDialog({
        editor: this.options.editor,
        trans: this.trans,
      });
    }
    this.anchorDialog.open();
  }

  /**
   * Enable or disable the whole toolbar (used for read-only mode).
   * Blocks pointer interaction and dims the toolbar via CSS.
   */
  setEnabled(enabled: boolean): void {
    this.container.classList.toggle('md-toolbar-disabled', !enabled);
    if (!enabled) {
      this.closeAllDropdowns();
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
  
  private openSpeechToText(): void {
    if (!this.speechToText) {
      this.speechToText = new SpeechToText({
        editor: this.options.editor,
        trans: this.trans,
      });
    }
    this.speechToText.open();
  }

  private toggleDictation(): void {
    if (!this.dictation) {
      this.dictation = new Dictation({
        editor: this.options.editor,
        trans: this.trans,
        onStateChange: (isActive) => {
          const btn = this.buttonElements.get('dictate');
          if (btn) {
            btn.classList.toggle('md-toolbar-btn-active', isActive);
            btn.classList.toggle('md-toolbar-btn-dictating', isActive);
          }
        },
      });
    }
    this.dictation.toggle();
  }
  
  private openSourceCode(): void {
    if (!this.sourceEditor) {
      this.sourceEditor = new SourceEditor({
        editor: this.options.editor,
        trans: this.trans,
      });
    }
    this.sourceEditor.open();
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
  
  rebuild(): void {
    this.charMap?.destroy();
    this.charMap = null;
    this.emojiPicker?.destroy();
    this.emojiPicker = null;
    this.imageUpload?.destroy();
    this.imageUpload = null;
    this.searchReplace?.destroy();
    this.searchReplace = null;
    this.speechToText?.destroy();
    this.speechToText = null;
    this.dictation?.destroy();
    this.dictation = null;
    this.anchorDialog?.destroy();
    this.anchorDialog = null;
    this.linkEditor?.destroy();
    this.linkEditor = null;
    this.sourceEditor?.destroy();
    this.sourceEditor = null;
    this.buttonElements.clear();
    this.dropdowns.clear();
    this.removeBodyMenus();
    this.buttonsEl = null;
    this.toggleBtn = null;
    this.render();
    this.bindEvents();
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.unbindScrollIndicators();
    this.unbindEvents();
    this.charMap?.destroy();
    this.emojiPicker?.destroy();
    this.imageUpload?.destroy();
    this.searchReplace?.destroy();
    this.speechToText?.destroy();
    this.dictation?.destroy();
    this.anchorDialog?.destroy();
    this.linkEditor?.destroy();
    this.sourceEditor?.destroy();

    this.buttonElements.clear();
    this.dropdowns.clear();
    this.removeBodyMenus();
    this.container.innerHTML = '';
  }

  private removeBodyMenus(): void {
    this.bodyMenus.forEach(menu => {
      menu.remove();
    });
    this.bodyMenus = [];
  }
}
