/**
 * MDHTMLEditor Type Definitions
 * TinyMCE-compatible interfaces for drop-in replacement
 */

import type { Editor as TipTapEditor } from '@tiptap/core';

/**
 * Template object for email templates
 */
export interface Template {
  id?: number | string;
  title: string;
  description?: string;
  content: string;
}

/**
 * Custom toolbar button definition
 */
export interface ToolbarButtonSpec {
  tooltip?: string;
  icon?: string;
  text?: string;
  onSetup?: (api: ToolbarButtonAPI) => void | (() => void);
  onAction?: (api: ToolbarButtonAPI) => void;
  disabled?: boolean;
}

export interface ToolbarButtonAPI {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  isActive: () => boolean;
  setActive: (active: boolean) => void;
}

/**
 * UI Registry for custom buttons (TinyMCE-compatible)
 */
export interface UIRegistry {
  addButton: (name: string, spec: ToolbarButtonSpec) => void;
  getButton: (name: string) => ToolbarButtonSpec | undefined;
}

/**
 * Main editor configuration
 * Compatible with TinyMCE configuration options
 */
export interface EditorConfig {
  // Editor mode
  basicEditor?: boolean;
  /** Start the editor in read-only mode. */
  readonly?: boolean;
  /**
   * Root block element produced when the user presses Enter.
   * 'p' (default) emits <p>; 'div' emits <div> (CKEditor ENTER_DIV parity).
   */
  forced_root_block?: 'p' | 'div';
  
  // Templates
  includeTemplates?: boolean;
  templates?: Template[];
  
  // Cloud integrations
  dropbox?: boolean;
  
  // Image upload
  images_upload_url?: string;
  images_upload_credentials?: boolean;
  images_upload_base_path?: string;
  images_upload_max_size?: number;
  images_upload_headers?: Record<string, string>;
  /**
   * Comma- or space-separated list of accepted image file extensions
   * (e.g. 'jpg,jpeg,png,gif,bmp'). When set, restricts uploads to these
   * types. When omitted, the default permissive set is used.
   */
  images_file_types?: string;
  /**
   * Optional validation hook run before an image upload starts. Return a
   * non-null string to reject the file (the string is shown via
   * images_upload_error / the dialog). Return null to allow.
   */
  images_upload_validate?: (file: File) => string | null;
  /**
   * Caller-supplied alert/notification used to report upload rejections and
   * failures from drag-drop / paste (which have no dialog to show errors in).
   * Mirrors the CKEditor simpleuploads newAlert flow.
   */
  images_upload_error?: (message: string) => void;

  // Font configuration
  font_family_formats?: string;
  font_size_formats?: string;
  /** CKEditor alias for font_size_formats (space-separated sizes). */
  fontSize_sizes?: string;
  /** CKEditor alias for font_family_formats (semicolon list). */
  font_names?: string;
  fontName?: string;  // Default font
  fontSize?: string;  // Default font size
  /** Block format dropdown definitions, TinyMCE-style 'Paragraph=p;Heading 1=h1;...'. */
  block_formats?: string;
  /** Named style definitions for the Styles dropdown (CKEditor stylesSet-compatible). */
  style_formats?: StyleFormat[];
  
  // Directionality
  directionality?: 'ltr' | 'rtl';
  
  // Localization
  language?: string;
  
  // Appearance
  height?: string | number;
  min_height?: string | number;
  max_height?: string | number;
  auto_focus?: string;
  setFocus?: string;
  skin?: 'oxide' | 'oxide-dark' | 'confab' | 'confab-dark';
  content_css?: 'default' | 'dark' | 'confab' | 'confab-dark';
  content_style?: string;
  
  // Toolbar
  toolbar?: string;
  toolbar_mode?: 'sliding' | 'floating' | 'wrap';
  toolbar_sticky?: boolean;
  toolbar_narrow_breakpoint?: number;
  toolbar_priority?: Record<string, number>;
  menubar?: boolean;
  
  // Context menu
  contextmenu?: boolean | string;
  
  // Quickbars
  quickbars_selection_toolbar?: string;
  quickbars_image_toolbar?: boolean;
  quickbars_insert_toolbar?: boolean;
  
  // Paste from Office
  paste_from_office?: boolean;

  // Speech to Text
  speech_to_text?: boolean;

  // Misc
  browser_spellcheck?: boolean;
  elementpath?: boolean;
  entity_encoding?: 'raw' | 'named' | 'numeric';
  valid_children?: string;
  convert_unsafe_embeds?: boolean;
  format_empty_lines?: boolean;
  
  // Plugins - for compatibility, but we use extensions
  plugins?: string;
  
  // Setup callback
  setup?: (editor: MDHTMLEditor) => void;
}

/**
 * Named style definition for the Styles dropdown.
 * CKEditor stylesSet-compatible shape. Either `inline` or `block` identifies
 * how the style is applied; `element` is the legacy/CKEditor tag name and is
 * treated as inline unless `block` is set.
 */
export interface StyleFormat {
  /** Display name in the Styles dropdown. */
  title: string;
  /** Inline element to apply (e.g. 'span'). */
  inline?: string;
  /** Block element to apply (e.g. 'h3', 'p'). */
  block?: string;
  /** CKEditor-style element name (mapped to inline unless block is set). */
  element?: string;
  /** Inline CSS styles to apply (e.g. { color: 'Blue' }). */
  styles?: Record<string, string>;
  /** Space-separated CSS class names to apply. */
  classes?: string;
  /** HTML attributes to apply (e.g. { dir: 'rtl' }). */
  attributes?: Record<string, string>;
}

/**
 * Event callback types
 */
export type InitCallback = (editor: MDHTMLEditor) => void;
export type DirtyCallback = (dirty: boolean) => void;
export type ChangeCallback = (content: string) => void;
export type FocusCallback = () => void;
export type BlurCallback = () => void;
export type LanguageChangeCallback = (code: string) => void;
export type TemplateChangeCallback = (template: Template) => void;

export interface EditorEvents {
  init?: InitCallback;
  dirty?: DirtyCallback;
  change?: ChangeCallback;
  focus?: FocusCallback;
  blur?: BlurCallback;
}

/**
 * Command execution interface (TinyMCE-compatible)
 */
export type CommandCallback = (ui?: boolean, value?: unknown) => boolean;

export interface Commands {
  [command: string]: CommandCallback;
}

/**
 * Main HTMLEditor class interface
 */
export interface MDHTMLEditor {
  // Properties
  readonly id: string;
  readonly ui: { registry: UIRegistry };
  
  // Content methods
  getContent(): string;
  setContent(html: string): void;
  insertContent(html: string): void;
  
  // Command execution
  execCommand(command: string, ui?: boolean, value?: unknown): boolean;
  
  // State
  isDirty(): boolean;
  setDirty(state: boolean): void;
  setReadOnly(state: boolean): void;
  isReadOnly(): boolean;
  
  // Focus
  focus(): void;
  hasFocus(): boolean;
  
  // Events
  on<K extends keyof EditorEventMap>(event: K, callback: EditorEventMap[K]): void;
  off<K extends keyof EditorEventMap>(event: K, callback: EditorEventMap[K]): void;
  fire<K extends keyof EditorEventMap>(event: K, ...args: Parameters<EditorEventMap[K]>): void;
  
  // Lifecycle
  destroy(): void;
  
  // Language
  setLanguage(code: string): void;
  
  // Internal TipTap editor access
  getTipTap(): TipTapEditor | null;
}

export interface EditorEventMap {
  init: InitCallback;
  dirty: DirtyCallback;
  change: ChangeCallback;
  focus: FocusCallback;
  blur: BlurCallback;
  languagechange: LanguageChangeCallback;
  templatechange: TemplateChangeCallback;
}

/**
 * Toolbar configuration
 */
export interface ToolbarConfig {
  buttons: string;
  mode: 'sliding' | 'floating' | 'wrap';
  sticky: boolean;
}

/**
 * Color picker color
 */
export interface ColorOption {
  value: string;
  label?: string;
}

/**
 * Font option
 */
export interface FontOption {
  label: string;
  value: string;
}

/**
 * Character map character
 */
export interface CharMapChar {
  char: string;
  name: string;
  category?: string;
}

/**
 * Search/Replace options
 */
export interface SearchReplaceOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

/**
 * Image upload result
 */
export interface ImageUploadResult {
  location: string;
}

/**
 * Image upload handler
 */
export type ImageUploadHandler = (
  blobInfo: { blob: () => Blob; filename: () => string },
  progress: (percent: number) => void
) => Promise<ImageUploadResult>;

/**
 * Dropbox file
 */
export interface DropboxFile {
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
}

/**
 * Dropbox choose options
 */
export interface DropboxChooseOptions {
  success: (files: DropboxFile[]) => void;
  cancel?: () => void;
  linkType?: 'preview' | 'direct';
  multiselect?: boolean;
  extensions?: string[];
}

/**
 * Translation function type
 */
export type TranslateFunction = (key: string) => string;

/**
 * Global configuration
 */
export interface GlobalConfig {
  translate?: TranslateFunction;
  getFileSrc?: (path: string) => string;
}

declare global {
  interface Window {
    Dropbox?: {
      choose: (options: DropboxChooseOptions) => void;
    };
  }
}
