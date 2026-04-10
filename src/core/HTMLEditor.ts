/**
 * MDHTMLEditor Core
 * A TinyMCE-compatible HTML editor built on TipTap
 */

import { Editor as TipTapEditor, EditorOptions, AnyExtension } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

import { Toolbar } from './Toolbar';
import { DEFAULT_ICONS, CONFAB_ICONS } from '../icons';
import type { IconSet } from '../icons';
import { FontSize } from '../extensions/FontSize';
import { LineHeight } from '../extensions/LineHeight';
import { TextDirection } from '../extensions/TextDirection';
import { SignatureBlock } from '../extensions/SignatureBlock';
import { ImageUpload } from '../extensions/ImageUpload';

import type {
  EditorConfig,
  EditorEventMap,
  MDHTMLEditor as IMDHTMLEditor,
  ToolbarButtonSpec,
  UIRegistry,
  TranslateFunction,
} from '../types';

import { createTranslateFunction } from '../i18n';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Default font names (same as TinyMCE)
export const fontNames = 'Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva';

// Default toolbar configurations
const FULL_TOOLBAR = 'bold italic underline strikethrough | bullist numlist outdent indent blockquote | fontfamily fontsize || lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | image charmap emoticons | fullscreen preview | code link codesample | ltr rtl | searchreplace';
const BASIC_TOOLBAR = 'bold italic underline strikethrough | bullist numlist outdent indent | fontfamily fontsize blockquote || lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | charmap emoticons | link | ltr rtl | searchreplace';

// Default font sizes
const DEFAULT_FONT_SIZES = '8pt 9pt 10pt 12pt 14pt 18pt 24pt 36pt';

let editorIdCounter = 0;

// Global translate function
let globalTranslate: TranslateFunction = (key: string) => key;
let globalTranslateCustomized = false;
let globalGetFileSrc: (path: string) => string = (path: string) => path;

/**
 * Set global translation function
 */
export function setTranslate(fn: TranslateFunction): void {
  globalTranslate = fn;
  globalTranslateCustomized = true;
}

/**
 * Get global translation function
 */
export function getTranslate(): TranslateFunction {
  return globalTranslate;
}

/**
 * Reset the global translation function to the default identity function.
 * This also clears the customized flag so that the next editor created
 * will auto-apply the built-in locale based on its language config.
 */
export function resetTranslate(): void {
  globalTranslate = (key: string) => key;
  globalTranslateCustomized = false;
}

/**
 * Set global file source resolver
 */
export function setGetFileSrc(fn: (path: string) => string): void {
  globalGetFileSrc = fn;
}

/**
 * Get global file source resolver
 */
export function getGetFileSrc(): (path: string) => string {
  return globalGetFileSrc;
}

/**
 * MDHTMLEditor - Main editor class
 */
export class HTMLEditor implements IMDHTMLEditor {
  readonly id: string;
  readonly ui: { registry: UIRegistry };
  
  private tiptap: TipTapEditor | null = null;
  private container: HTMLElement;
  private editorWrapper: HTMLElement | null = null;
  private toolbar: Toolbar | null = null;
  private config: EditorConfig;
  private dirty = false;
  private customButtons: Map<string, ToolbarButtonSpec> = new Map();
  private eventListeners: Map<keyof EditorEventMap, Set<EditorEventMap[keyof EditorEventMap]>> = new Map();
  private changeTimeout: ReturnType<typeof setTimeout> | null = null;
  private imageUploadHelper: ImageUpload | null = null;
  
  constructor(container: HTMLElement, config: EditorConfig = {}) {
    this.id = `md-editor-${++editorIdCounter}`;
    this.container = container;
    this.config = this.normalizeConfig(config);
    
    // UI registry for custom buttons
    this.ui = {
      registry: {
        addButton: (name: string, spec: ToolbarButtonSpec) => {
          this.customButtons.set(name, spec);
        },
        getButton: (name: string) => this.customButtons.get(name),
      },
    };
    
    // Call setup if provided (before creating editor)
    if (config.setup) {
      config.setup(this);
    }
    
    this.createEditor();
  }
  
  private normalizeConfig(config: EditorConfig): EditorConfig {
    return {
      basicEditor: config.basicEditor ?? false,
      includeTemplates: config.includeTemplates ?? false,
      templates: config.templates ?? [],
      dropbox: config.dropbox ?? false,
      images_upload_url: config.images_upload_url,
      images_upload_credentials: config.images_upload_credentials ?? true,
      images_upload_base_path: config.images_upload_base_path ?? '/',
      images_upload_max_size: config.images_upload_max_size,
      images_upload_headers: config.images_upload_headers,
      font_family_formats: config.font_family_formats ?? fontNames,
      font_size_formats: config.font_size_formats ?? DEFAULT_FONT_SIZES,
      fontName: config.fontName,
      fontSize: config.fontSize,
      directionality: config.directionality ?? 'ltr',
      language: config.language ?? 'en',
      height: config.height ?? 300,
      min_height: config.min_height,
      max_height: config.max_height,
      auto_focus: config.auto_focus,
      setFocus: config.setFocus,
      skin: config.skin ?? 'oxide',
      content_css: config.content_css ?? 'default',
      content_style: config.content_style,
      toolbar: config.toolbar ?? (config.basicEditor ? BASIC_TOOLBAR : FULL_TOOLBAR),
      toolbar_mode: config.toolbar_mode ?? 'wrap',
      toolbar_sticky: config.toolbar_sticky ?? true,
      menubar: config.menubar ?? false,
      contextmenu: config.contextmenu ?? '',
      quickbars_selection_toolbar: config.quickbars_selection_toolbar ?? 'bold italic | quicklink blockquote',
      quickbars_image_toolbar: config.quickbars_image_toolbar ?? false,
      quickbars_insert_toolbar: config.quickbars_insert_toolbar ?? false,
      browser_spellcheck: config.browser_spellcheck ?? true,
      elementpath: config.elementpath ?? false,
      entity_encoding: config.entity_encoding ?? 'raw',
      valid_children: config.valid_children,
      convert_unsafe_embeds: config.convert_unsafe_embeds ?? true,
      format_empty_lines: config.format_empty_lines ?? true,
    };
  }
  
  private createEditor(): void {
    // Auto-apply built-in locale if no custom translate was set
    if (!globalTranslateCustomized) {
      globalTranslate = createTranslateFunction(this.config.language ?? 'en');
    }

    // Create wrapper structure
    this.editorWrapper = document.createElement('div');
    this.editorWrapper.className = `md-editor md-editor-${this.config.skin}`;
    this.editorWrapper.id = this.id;
    this.editorWrapper.setAttribute('dir', this.config.directionality ?? 'ltr');
    
    // Apply height
    if (this.config.height) {
      if (typeof this.config.height === 'number') {
        this.editorWrapper.style.height = `${this.config.height}px`;
      } else {
        this.editorWrapper.style.height = this.config.height;
      }
    }
    
    // Apply min-height
    if (this.config.min_height) {
      if (typeof this.config.min_height === 'number') {
        this.editorWrapper.style.minHeight = `${this.config.min_height}px`;
      } else {
        this.editorWrapper.style.minHeight = this.config.min_height;
      }
    }
    
    // Apply max-height
    if (this.config.max_height) {
      if (typeof this.config.max_height === 'number') {
        this.editorWrapper.style.maxHeight = `${this.config.max_height}px`;
      } else {
        this.editorWrapper.style.maxHeight = this.config.max_height;
      }
    }
    
    // Create toolbar container
    const toolbarContainer = document.createElement('div');
    toolbarContainer.className = 'md-editor-toolbar';
    this.editorWrapper.appendChild(toolbarContainer);
    
    // Create editor content area
    const editorContent = document.createElement('div');
    editorContent.className = 'md-editor-content';
    this.editorWrapper.appendChild(editorContent);
    
    // Append to container
    this.container.appendChild(this.editorWrapper);
    
    // Build TipTap extensions
    const extensions = this.buildExtensions();
    
    // Create TipTap editor
    const editorOptions: Partial<EditorOptions> = {
      element: editorContent,
      extensions,
      content: '',
      editorProps: {
        attributes: {
          class: 'md-editor-body',
          spellcheck: this.config.browser_spellcheck ? 'true' : 'false',
        },
      },
      onUpdate: ({ editor }) => {
        this.handleChange(editor.getHTML());
      },
      onFocus: () => {
        this.fire('focus');
      },
      onBlur: () => {
        this.fire('blur');
      },
      onCreate: ({ editor }) => {
        // Apply default font and size
        if (this.config.fontName) {
          editor.chain().focus().setFontFamily(this.config.fontName).run();
        }
        if (this.config.fontSize) {
          editor.chain().focus().setFontSize(this.config.fontSize).run();
        }
        
        // Fire init event
        this.fire('init', this);
      },
    };
    
    this.tiptap = new TipTapEditor(editorOptions);
    
    // Create toolbar
    const iconSet: IconSet = this.config.skin?.startsWith('confab') ? CONFAB_ICONS : DEFAULT_ICONS;
    this.toolbar = new Toolbar(toolbarContainer, {
      editor: this,
      buttons: this.config.toolbar ?? BASIC_TOOLBAR,
      mode: this.config.toolbar_mode ?? 'sliding',
      sticky: this.config.toolbar_sticky ?? true,
      customButtons: this.customButtons,
      config: this.config,
      iconSet,
    });
    
    // Handle auto focus
    if (this.config.auto_focus) {
      setTimeout(() => this.focus(), 10);
    } else if (this.config.setFocus) {
      setTimeout(() => {
        const element = document.querySelector(this.config.setFocus!) as HTMLElement;
        if (element) {
          element.focus();
        }
      }, 10);
    }

    // Setup image drag-drop and paste handling for full editor
    if (!this.config.basicEditor) {
      this.setupImageHandlers(editorContent);
    }
  }
  
  private getImageUploadHelper(): ImageUpload {
    if (!this.imageUploadHelper) {
      this.imageUploadHelper = new ImageUpload({
        onInsert: () => { /* not used for inline uploads */ },
        uploadUrl: this.config.images_upload_url,
        uploadCredentials: this.config.images_upload_credentials,
        uploadBasePath: this.config.images_upload_base_path,
        uploadMaxSize: this.config.images_upload_max_size,
        uploadHeaders: this.config.images_upload_headers,
        trans: globalTranslate,
      });
    }
    return this.imageUploadHelper;
  }

  private setupImageHandlers(editorContent: HTMLElement): void {
    // Drag-over visual feedback
    editorContent.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.editorWrapper?.classList.add('md-editor-dragover');
      }
    });

    editorContent.addEventListener('dragleave', (e) => {
      // Only remove if actually leaving the content area
      const related = e.relatedTarget as Node | null;
      if (!related || !editorContent.contains(related)) {
        this.editorWrapper?.classList.remove('md-editor-dragover');
      }
    });

    // Drop handler
    editorContent.addEventListener('drop', (e) => {
      this.editorWrapper?.classList.remove('md-editor-dragover');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const imageFile = Array.from(files).find(f => f.type.startsWith('image/'));
      if (!imageFile) return;

      e.preventDefault();
      e.stopPropagation();

      this.handleImageFileUpload(imageFile);
    });

    // Paste handler
    editorContent.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this.handleImageFileUpload(file);
            return;
          }
        }
      }
    });
  }

  private handleImageFileUpload(file: File): void {
    const helper = this.getImageUploadHelper();
    helper.uploadFile(file).then((src) => {
      this.tiptap?.chain().focus().setImage({ src }).run();
    }).catch(() => {
      // Upload failed — silently fail for inline operations
    });
  }

  private buildExtensions(): AnyExtension[] {
    const extensions: AnyExtension[] = [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      SignatureBlock,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      CharacterCount,
      Placeholder.configure({
        placeholder: '',
      }),
      TextDirection,
    ];
    
    // Add image extension for full editor
    if (!this.config.basicEditor) {
      extensions.push(
        Image.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: 'md-editor-image',
          },
        })
      );
    }
    
    // Add code block with syntax highlighting
    extensions.push(
      CodeBlockLowlight.configure({
        lowlight,
      })
    );
    
    // Add table support
    extensions.push(
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'md-editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader
    );
    
    return extensions;
  }
  
  private handleChange(html: string): void {
    if (!this.dirty) {
      this.dirty = true;
      this.fire('dirty', true);
    }
    
    // Debounce change events
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }
    
    this.changeTimeout = setTimeout(() => {
      this.fire('change', html);
    }, 20);
  }
  
  // Public API methods
  
  getContent(): string {
    return this.tiptap?.getHTML() ?? '';
  }
  
  setContent(html: string): void {
    this.tiptap?.commands.setContent(html);
  }
  
  insertContent(html: string): void {
    this.tiptap?.commands.insertContent(html);
  }
  
  execCommand(command: string, _ui?: boolean, value?: unknown): boolean {
    if (!this.tiptap) return false;
    
    const chain = this.tiptap.chain().focus();
    
    // Map TinyMCE commands to TipTap
    switch (command.toLowerCase()) {
      case 'bold':
        chain.toggleBold().run();
        return true;
      case 'italic':
        chain.toggleItalic().run();
        return true;
      case 'underline':
        chain.toggleUnderline().run();
        return true;
      case 'strikethrough':
        chain.toggleStrike().run();
        return true;
      case 'fontname':
        if (typeof value === 'string') {
          chain.setFontFamily(value).run();
        }
        return true;
      case 'fontsize':
        if (typeof value === 'string') {
          chain.setFontSize(value).run();
        }
        return true;
      case 'lineheight':
        if (typeof value === 'string') {
          chain.setLineHeight(value).run();
        }
        return true;
      case 'forecolor':
        if (typeof value === 'string') {
          chain.setColor(value).run();
        }
        return true;
      case 'hilitecolor':
      case 'backcolor':
        if (typeof value === 'string') {
          chain.setHighlight({ color: value }).run();
        }
        return true;
      case 'justifyleft':
        chain.setTextAlign('left').run();
        return true;
      case 'justifycenter':
        chain.setTextAlign('center').run();
        return true;
      case 'justifyright':
        chain.setTextAlign('right').run();
        return true;
      case 'justifyfull':
        chain.setTextAlign('justify').run();
        return true;
      case 'insertunorderedlist':
        chain.toggleBulletList().run();
        return true;
      case 'insertorderedlist':
        chain.toggleOrderedList().run();
        return true;
      case 'indent':
        // TipTap doesn't have direct indent, use sink list item
        if (this.tiptap.isActive('listItem')) {
          chain.sinkListItem('listItem').run();
        }
        return true;
      case 'outdent':
        if (this.tiptap.isActive('listItem')) {
          chain.liftListItem('listItem').run();
        }
        return true;
      case 'undo':
        chain.undo().run();
        return true;
      case 'redo':
        chain.redo().run();
        return true;
      case 'removeformat':
        chain.unsetAllMarks().clearNodes().run();
        return true;
      case 'mceremoveeditor':
        this.destroy();
        return true;
      default:
        console.warn(`Unknown command: ${command}`);
        return false;
    }
  }
  
  isDirty(): boolean {
    return this.dirty;
  }
  
  setDirty(state: boolean): void {
    this.dirty = state;
    if (!state) {
      this.fire('dirty', false);
    }
  }
  
  focus(): void {
    this.tiptap?.commands.focus();
  }
  
  hasFocus(): boolean {
    return this.tiptap?.isFocused ?? false;
  }
  
  // Event handling
  
  on<K extends keyof EditorEventMap>(event: K, callback: EditorEventMap[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as EditorEventMap[keyof EditorEventMap]);
  }
  
  off<K extends keyof EditorEventMap>(event: K, callback: EditorEventMap[K]): void {
    this.eventListeners.get(event)?.delete(callback as EditorEventMap[keyof EditorEventMap]);
  }
  
  fire<K extends keyof EditorEventMap>(event: K, ...args: Parameters<EditorEventMap[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        (callback as (...args: unknown[]) => void)(...args);
      });
    }
  }
  
  // Lifecycle
  
  destroy(): void {
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }
    
    this.toolbar?.destroy();
    this.toolbar = null;
    this.tiptap?.destroy();
    this.tiptap = null;
    this.imageUploadHelper?.destroy();
    this.imageUploadHelper = null;
    
    if (this.editorWrapper) {
      this.editorWrapper.remove();
    }
    this.editorWrapper = null;
    
    this.eventListeners.clear();
    this.customButtons.clear();
  }
  
  getTipTap(): TipTapEditor | null {
    return this.tiptap;
  }
  
  /**
   * Set the UI language, updating all toolbar and dialog translations.
   */
  setLanguage(code: string): void {
    this.config.language = code;
    globalTranslate = createTranslateFunction(code);
    this.toolbar?.rebuild();
    this.fire('languagechange', code);
  }

  /**
   * Get the editor config
   */
  getConfig(): EditorConfig {
    return this.config;
  }
  
  /**
   * Check if the editor is in basic mode
   */
  isBasicEditor(): boolean {
    return this.config.basicEditor ?? false;
  }
}
