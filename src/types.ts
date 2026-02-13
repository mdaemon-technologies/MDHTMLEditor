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
  
  // Templates
  includeTemplates?: boolean;
  templates?: Template[];
  
  // Cloud integrations
  dropbox?: boolean;
  
  // Image upload
  images_upload_url?: string;
  images_upload_credentials?: boolean;
  images_upload_base_path?: string;
  
  // Font configuration
  font_family_formats?: string;
  font_size_formats?: string;
  fontName?: string;  // Default font
  fontSize?: string;  // Default font size
  
  // Directionality
  directionality?: 'ltr' | 'rtl';
  
  // Localization
  language?: string;
  
  // Appearance
  height?: string | number;
  auto_focus?: string;
  setFocus?: string;
  skin?: 'oxide' | 'oxide-dark';
  content_css?: 'default' | 'dark';
  content_style?: string;
  
  // Toolbar
  toolbar?: string;
  toolbar_mode?: 'sliding' | 'floating' | 'wrap';
  toolbar_sticky?: boolean;
  menubar?: boolean;
  
  // Context menu
  contextmenu?: boolean | string;
  
  // Quickbars
  quickbars_selection_toolbar?: string;
  quickbars_image_toolbar?: boolean;
  quickbars_insert_toolbar?: boolean;
  
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
 * Event callback types
 */
export type InitCallback = (editor: MDHTMLEditor) => void;
export type DirtyCallback = (dirty: boolean) => void;
export type ChangeCallback = (content: string) => void;
export type FocusCallback = () => void;
export type BlurCallback = () => void;

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
  
  // Focus
  focus(): void;
  hasFocus(): boolean;
  
  // Events
  on<K extends keyof EditorEventMap>(event: K, callback: EditorEventMap[K]): void;
  off<K extends keyof EditorEventMap>(event: K, callback: EditorEventMap[K]): void;
  fire<K extends keyof EditorEventMap>(event: K, ...args: Parameters<EditorEventMap[K]>): void;
  
  // Lifecycle
  destroy(): void;
  
  // Internal TipTap editor access
  getTipTap(): TipTapEditor | null;
}

export interface EditorEventMap {
  init: InitCallback;
  dirty: DirtyCallback;
  change: ChangeCallback;
  focus: FocusCallback;
  blur: BlurCallback;
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
