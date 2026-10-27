/**
 * MDHTMLEditor Core
 * A TinyMCE-compatible HTML editor built on TipTap
 */

import { Editor as TipTapEditor, EditorOptions, AnyExtension, mergeAttributes } from '@tiptap/core';
import type { ChainedCommands } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { AllSelection, Plugin } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Mapping, RemoveMarkStep } from '@tiptap/pm/transform';
import { isInTable } from '@tiptap/pm/tables';
import { StarterKit } from '@tiptap/starter-kit';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link, isAllowedUri } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

import { Toolbar } from './Toolbar';
import { DEFAULT_ICONS, CONFAB_ICONS } from '../icons';
import type { IconSet } from '../icons';
import { FontSize } from '../extensions/FontSize';
import { BlockFontStyle } from '../extensions/BlockFontStyle';
import { BlockIndent } from '../extensions/BlockIndent';
import { LineHeight } from '../extensions/LineHeight';
import { TextDirection } from '../extensions/TextDirection';
import { LinkEscape, LINK_ESCAPE_META } from '../extensions/LinkEscape';
import { SignatureBlock } from '../extensions/SignatureBlock';
import { MarkedQuote } from '../extensions/MarkedQuote';
import { Mention } from '../extensions/Mention';
import { Anchor } from '../extensions/Anchor';
import { InlineStyle } from '../extensions/InlineStyle';
import { PasteFromOffice } from '../extensions/PasteFromOffice';
import { ListPasteNormalizer } from '../extensions/ListPasteNormalizer';
import { PasteMarkdown } from '../extensions/PasteMarkdown';
import { CodeSample } from '../extensions/CodeSample';
import { ResizableImage, isObjectResizingOn } from '../extensions/ImageResize';
import { ImageMap, relabelImageMapMarkers } from '../extensions/ImageMap';
import {
  StyledTable,
  StyledTableRow,
  StyledTableCell,
  StyledTableHeader,
  CELL_STYLE_RULES,
  MAX_TABLE_SIZE,
} from '../extensions/TableAttributes';
import {
  TableCommands,
  getTableCellType,
  getTableColumnType,
  getTableRowType,
  selectedTable,
  tableAtSelection,
  tableElementAtSelection,
} from '../extensions/TableCommands';
import { TableDialog } from '../extensions/TableDialog';
import { TableToolbar } from '../extensions/TableToolbar';
import { ContextMenu, contextMenuSections } from '../extensions/ContextMenu';
import type { TableDialogKind } from '../extensions/TableDialog';
import { fillEmptyBlocks, stripEmptyLineBreaks } from '../utils/fillEmptyBlocks';
import { unescapeTagSlashes } from '../utils/unescapeTagSlashes';
import { flattenWrapperBlocks } from '../utils/flattenWrapperBlocks';
import { liftMapContent } from '../utils/liftMapContent';
import { normalizeQuoteMarkerClass } from '../utils/markedQuote';
import { ImageUpload } from '../extensions/ImageUpload';

import type {
  EditorConfig,
  EditorEventMap,
  MDHTMLEditor as IMDHTMLEditor,
  ToolbarButtonSpec,
  UIRegistry,
  TranslateFunction,
  CustomTranslateFunction,
} from '../types';

import { createTranslateFunction } from '../i18n';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Default font names (same as TinyMCE)
export const fontNames = 'Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva';

// Default toolbar configurations
const FULL_TOOLBAR = 'bold italic underline strikethrough subscript superscript | blocks styles | bullist numlist outdent indent blockquote | fontfamily fontsize | lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | image table charmap emoticons hr | fullscreen preview | code link unlink anchor codesample | ltr rtl | searchreplace';
/**
 * What a table command changes, for the events it fires: 'insert' creates rows
 * or cells (newrow/newcell, then tablemodified), 'structure' and 'style' fire
 * tablemodified, 'none' fires nothing.
 */
export type TableChange = 'insert' | 'structure' | 'style' | 'none';

/** The style properties a cell keeps: what mceTableApplyCellStyle can set. */
const CELL_STYLE_PROPERTIES = new Set(CELL_STYLE_RULES.map(([property]) => property));

/** Positions of the rows and cells of the table at the selection, or none outside a table. */
function tablePartPositions(state: EditorState): number[] {
  const table = tableAtSelection(state);
  const positions: number[] = [];
  table?.node.descendants((node, pos) => {
    const role = node.type.spec.tableRole;
    if (role === 'row' || role === 'cell' || role === 'header_cell') positions.push(table.start + pos);
    return true;
  });
  return positions;
}

/** A whole-number command argument of at least `min`, or `fallback`. */
function tableCount(value: unknown, min: number, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n >= min ? Math.min(n, MAX_TABLE_SIZE) : fallback;
}

/** TinyMCE's default table_toolbar: shown above a table while the cursor is in it. */
export const DEFAULT_TABLE_TOOLBAR =
  'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol';
const BASIC_TOOLBAR = 'bold italic underline strikethrough subscript superscript | bullist numlist outdent indent | fontfamily fontsize blockquote | lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | charmap emoticons | link unlink | ltr rtl | searchreplace';

// Default font sizes
const DEFAULT_FONT_SIZES = '8pt 9pt 10pt 12pt 14pt 18pt 24pt 36pt';

// Base font inlined on every block element (paragraph/div) when the consumer
// has not configured fontName/fontSize. Inlining on the block keeps the font
// associated with the content in exported HTML (e.g. an email body) instead of
// relying on the editor's container CSS being present on the receiving end.
const DEFAULT_FONT_FAMILY = 'arial, helvetica, sans-serif';
const DEFAULT_FONT_SIZE = '12pt';

/**
 * How ProseMirror must parse HTML handed to the editor through setContent() /
 * insertContent(). `preserveWhitespace: false` is its "collapse per the HTML
 * spec" mode — what a browser, and what CKEditor in the legacy LookOut theme,
 * does with the insignificant whitespace between block elements.
 *
 * This has to be stated explicitly because TipTap's two import commands do NOT
 * agree by default: `insertContentAt` hard-defaults to `preserveWhitespace:
 * 'full'`, while `setContent` takes a collapsing branch whenever the option is
 * anything other than `'full'`. A pretty-printed email template — real newlines
 * and tabs between the blocks, including as direct children of a <ul> — was
 * therefore imported correctly by setContent and mangled by insertContent (the
 * path the Templates dropdown uses): a whitespace text node cannot sit inside
 * `bullet_list`, whose content expression is `list_item+`, so the parser wrapped
 * each run in a list_item of its own and a 2-bullet list arrived as 4 bullets.
 *
 * Pinning both commands here also stops a future TipTap release from silently
 * changing which branch setContent takes.
 *
 * A node that declares `preserveWhitespace: 'full'` on its own parse rule — as
 * CodeBlock does — still wins for its own subtree, so <pre> content is safe.
 * Ctrl+V is unaffected: pasting goes through ProseMirror's clipboard parser,
 * which is a separate code path with its own whitespace handling.
 */
const IMPORT_PARSE_OPTIONS = { preserveWhitespace: false } as const;

let editorIdCounter = 0;

// Global translation: the custom function (setTranslate) is tried first, and the
// built-in locale (set from the editor's language) fills in when it returns
// null, undefined or an empty string.
let customTranslate: CustomTranslateFunction | null = null;
let builtInTranslate: TranslateFunction = (key: string) => key;

function resolveTranslation(custom: CustomTranslateFunction | null, key: string): string {
  const result = custom?.(key);
  return result === null || result === undefined || result === '' ? builtInTranslate(key) : result;
}

// Internal translate: always uses the current custom function and locale
const globalTranslate: TranslateFunction = (key: string) => resolveTranslation(customTranslate, key);
let globalGetFileSrc: (path: string) => string = (path: string) => path;

/**
 * Set global translation function. It takes priority over the built-in locale;
 * when it returns null, undefined or an empty string, the built-in locale is used.
 */
export function setTranslate(fn: CustomTranslateFunction): void {
  customTranslate = fn;
}

/**
 * Get global translation function (the current custom function with the built-in
 * locale as fallback). The custom function is captured, so the result can be
 * passed back to setTranslate() to restore it.
 */
export function getTranslate(): TranslateFunction {
  const custom = customTranslate;
  return (key: string) => resolveTranslation(custom, key);
}

/**
 * Remove the custom translation function and reset the built-in locale to the
 * identity function. The next editor created applies the built-in locale for
 * its language config.
 */
export function resetTranslate(): void {
  customTranslate = null;
  builtInTranslate = (key: string) => key;
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
  /** Paste-Markdown mode. Per instance, not persisted; hosts save it via `pastemarkdownchange`. */
  private pasteMarkdownEnabled = false;
  private dirty = false;
  private customButtons: Map<string, ToolbarButtonSpec> = new Map();
  private eventListeners: Map<keyof EditorEventMap, Set<EditorEventMap[keyof EditorEventMap]>> = new Map();
  private changeTimeout: ReturnType<typeof setTimeout> | null = null;
  private imageUploadHelper: ImageUpload | null = null;
  private tableDialog: TableDialog | null = null;
  private tableToolbar: TableToolbar | null = null;
  private contextMenu: ContextMenu | null = null;
  
  constructor(container: HTMLElement, config: EditorConfig = {}) {
    this.id = `md-editor-${++editorIdCounter}`;
    this.container = container;
    this.config = this.normalizeConfig(config);
    this.pasteMarkdownEnabled = this.config.paste_markdown ?? false;
    
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
      readonly: config.readonly ?? false,
      forced_root_block: config.forced_root_block ?? 'p',
      includeTemplates: config.includeTemplates ?? false,
      templates: config.templates ?? [],
      dropbox: config.dropbox ?? false,
      images_upload_url: config.images_upload_url,
      images_upload_credentials: config.images_upload_credentials ?? true,
      images_upload_base_path: config.images_upload_base_path ?? '/',
      images_upload_max_size: config.images_upload_max_size,
      images_upload_headers: config.images_upload_headers,
      images_file_types: config.images_file_types,
      images_upload_validate: config.images_upload_validate,
      images_upload_error: config.images_upload_error,
      images_upload_error_message: config.images_upload_error_message,
      // CKEditor aliases: font_names / fontSize_sizes map to the TinyMCE keys
      font_family_formats: config.font_family_formats ?? config.font_names ?? fontNames,
      font_size_formats: config.font_size_formats ?? config.fontSize_sizes ?? DEFAULT_FONT_SIZES,
      block_formats: config.block_formats,
      style_formats: config.style_formats,
      // Color picker palettes: left undefined so Toolbar can fall back to the
      // per-picker built-in defaults (text and highlight palettes differ).
      color_map: config.color_map,
      color_map_foreground: config.color_map_foreground,
      color_map_background: config.color_map_background,
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
      object_resizing: config.object_resizing ?? true,
      resize_img_proportional: config.resize_img_proportional ?? true,
      browser_spellcheck: config.browser_spellcheck ?? true,
      elementpath: config.elementpath ?? false,
      entity_encoding: config.entity_encoding ?? 'raw',
      valid_children: config.valid_children,
      convert_unsafe_embeds: config.convert_unsafe_embeds ?? true,
      format_empty_lines: config.format_empty_lines ?? true,
      toolbar_narrow_breakpoint: config.toolbar_narrow_breakpoint,
      toolbar_priority: config.toolbar_priority,
      paste_from_office: config.paste_from_office ?? true,
      paste_markdown: config.paste_markdown ?? false,
      quote_marker_class: normalizeQuoteMarkerClass(config.quote_marker_class) ?? undefined,
      speech_to_text: config.speech_to_text ?? true,
      table_toolbar: config.table_toolbar ?? (config.basicEditor ? false : DEFAULT_TABLE_TOOLBAR),
      table_grid: config.table_grid ?? true,
      table_default_attributes: config.table_default_attributes ?? { border: '1' },
      table_default_styles: config.table_default_styles ?? { 'border-collapse': 'collapse', width: '100%' },
      table_default_header_rows: config.table_default_header_rows ?? 0,
      table_default_header_cols: config.table_default_header_cols ?? 0,
      table_tab_navigation: config.table_tab_navigation ?? true,
      table_appearance_options: config.table_appearance_options ?? true,
      table_advtab: config.table_advtab ?? true,
      table_row_advtab: config.table_row_advtab ?? true,
      table_cell_advtab: config.table_cell_advtab ?? true,
      table_border_widths: config.table_border_widths,
      table_border_styles: config.table_border_styles,
      table_background_color_map: config.table_background_color_map,
      table_border_color_map: config.table_border_color_map,
    };
  }
  
  private createEditor(): void {
    // Apply the built-in locale (the fallback when a custom translate is set)
    builtInTranslate = createTranslateFunction(this.config.language ?? 'en');

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
      editable: !this.config.readonly,
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
      onCreate: () => {
        // NOTE: the configured fontName/fontSize are deliberately NOT applied
        // here as inline marks. With an empty document the cursor is collapsed,
        // so setFontFamily/setFontSize would only park a *stored mark* on the
        // selection — and ProseMirror discards stored marks on the next
        // transaction that moves the selection or changes the doc. Any click
        // into the body (or a host app calling setTextSelection) drops them
        // before the user ever types, and they would never reach the exported
        // HTML. The defaults are carried by the BlockFontStyle extension
        // instead (see buildExtensions), which puts them on the block node's
        // attributes, so they persist and are rendered on every <p>/<div>.
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
      narrowBreakpoint: this.config.toolbar_narrow_breakpoint ?? 768,
      priorityOverrides: this.config.toolbar_priority ?? {},
    });

    // The table context toolbar and the right-click menu
    if (this.config.table_toolbar) {
      this.tableToolbar = new TableToolbar({
        editor: this,
        buttons: this.config.table_toolbar,
        config: this.config,
        iconSet,
        customButtons: this.customButtons,
        trans: globalTranslate,
      });
    }
    if (contextMenuSections(this.config.contextmenu).includes('table')) {
      this.contextMenu = new ContextMenu({ editor: this, trans: globalTranslate });
    }

    // Apply initial read-only state
    if (this.config.readonly) {
      this.editorWrapper.classList.add('md-editor-readonly');
      this.toolbar.setEnabled(false);
    }

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
        fileTypes: this.config.images_file_types,
        validate: this.config.images_upload_validate,
        onError: this.config.images_upload_error,
        errorMessage: this.config.images_upload_error_message,
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
    }).catch((err: unknown) => {
      // No dialog for inline drop/paste — route the reason to the caller's alert.
      const message = err instanceof Error && err.message ? err.message : globalTranslate('Upload failed');
      this.config.images_upload_error?.(message);
    });
  }

  private buildExtensions(): AnyExtension[] {
    const useDivBlocks = this.config.forced_root_block === 'div';

    const extensions: AnyExtension[] = [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
        // StarterKit v3 bundles its own Link. Left enabled, its plugins run
        // beside the configured Link below with TipTap's defaults: its click
        // handler opened links despite openOnClick: false, and its
        // link-on-paste handler linked selections the one below declines.
        link: false,
        // Replaced by MarkedQuote below, which keeps the quote_marker_class marker.
        blockquote: false,
        // When forced_root_block is 'div', swap StarterKit's <p> paragraph for
        // a custom Paragraph that renders as <div> (CKEditor ENTER_DIV parity).
        // StarterKit enables trailingNode by default; it accepts `false` to
        // disable or an options object, but not `true`. Map our boolean toggle:
        // truthy → undefined (use StarterKit's default/enabled), otherwise disable.
        trailingNode: this.config.trailingNode ? undefined : false,
        ...(useDivBlocks ? { paragraph: false } : {}),
      }),
      // Before MarkedQuote: their div rules share priority 100, so a div that
      // is both the signature and marked parses as the signature.
      SignatureBlock,
      MarkedQuote.configure({ markerClass: this.config.quote_marker_class ?? null }),
      Mention,
      Anchor,
      Subscript,
      Superscript,
      Underline,
      TextStyle,
      InlineStyle,
      // Inline (mark-based) font styling for per-selection changes: produces
      // <span style="font-family|font-size:…"> so a single paragraph can mix
      // fonts/sizes.
      FontFamily,
      FontSize,
      // Block-level default font: inlines font-family on <p>/<div>/<hN> and
      // font-size on <p>/<div>, from the configured fontName/fontSize, so
      // exported content carries the base font on the block itself. Inline
      // spans above still override it for the text they wrap.
      BlockFontStyle.configure({
        defaultFontFamily: this.config.fontName ?? DEFAULT_FONT_FAMILY,
        defaultFontSize: this.config.fontSize ?? DEFAULT_FONT_SIZE,
      }),
      // Block indentation (margin-left) for paragraphs/headings, plus the Tab /
      // Shift+Tab keymap that indents the block when the cursor is not in a list.
      BlockIndent.configure({ tableTabNavigation: this.config.table_tab_navigation !== false }),
      LineHeight,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.extend({
        /**
         * A URL pasted over a selection links that selection only when it lies
         * inside one textblock, the way a phrase (or a selected inline node,
         * such as a mention) is linked.
         *
         * TipTap's link-on-paste handler (the only Link plugin with a
         * handlePaste prop) marks any non-empty selection and never inserts
         * the pasted text, so Ctrl+A then pasting a URL linked the whole
         * document instead of replacing it. For an AllSelection, a cell
         * selection, a selected block node, or a range spanning blocks,
         * decline so the paste replaces the selection as any other paste
         * does; a URL from outside the editor is then linked by Link's paste
         * rule.
         *
         * Whitespace typed at the end of a link stays in the link. Since
         * TipTap 3.32 the autolink plugin (the only Link plugin with an
         * appendTransaction) unlinks whitespace typed at a link's end and
         * drops the link from the stored marks, so retyping a placeholder
         * link's text ("Register now") would keep only its first word linked.
         * The link mark stays inclusive here, as in the browser's own editing
         * and TinyMCE, so the link's removal (its RemoveMarkSteps and the
         * stored-mark change) is dropped and the links autolink adds are
         * kept. Text typed after a paste or a dialog insert is kept out of
         * the link by LinkEscape instead.
         */
        addProseMirrorPlugins() {
          const linkType = this.type;
          return (this.parent?.() ?? []).map((plugin) => {
            const appendTransaction = plugin.spec.appendTransaction;
            if (appendTransaction) {
              // Same spec; only the link's removal dropped, every other step kept.
              return new Plugin({
                ...plugin.spec,
                appendTransaction(transactions, oldState, newState) {
                  const tr = appendTransaction.call(plugin, transactions, oldState, newState);
                  if (!tr) return tr;
                  const kept = newState.tr;
                  tr.steps.forEach((step) => {
                    if (step instanceof RemoveMarkStep && step.mark.type === linkType) return;
                    kept.step(step);
                  });
                  return kept.steps.length ? kept : null;
                },
              });
            }
            const handlePaste = plugin.props.handlePaste;
            if (!handlePaste) return plugin;
            // Same spec (key, state, every other prop); only handlePaste gated.
            return new Plugin({
              ...plugin.spec,
              props: {
                ...plugin.spec.props,
                handlePaste(view, event, slice) {
                  const { selection } = view.state;
                  const { $from, $to } = selection;
                  const inBlock = !(selection instanceof AllSelection)
                    && $from.sameParent($to) && $from.parent.inlineContent;
                  return inBlock ? handlePaste.call(plugin, view, event, slice) : false;
                },
              },
            });
          });
        },
        /**
         * Keep placeholder links (`<a href="">`) as links.
         *
         * TipTap's own rule opens with `if (!href || !isAllowedUri(href))
         * return false`, so an empty href short-circuits to "not a link"
         * before validation is ever consulted and the anchor is discarded —
         * its text survives, the element does not. Stored email templates are
         * full of such anchors: an author writes the link text first and fills
         * the target in later, or an upstream sanitizer has already blanked it.
         * TinyMCE and CKEditor both keep them, and TipTap itself *emits* this
         * exact shape — `renderHTML` rewrites a URI it rejects to `href=""` —
         * so refusing to read back what we write is the inconsistency here.
         *
         * Only the empty-string case is added. `href` genuinely absent still
         * fails (that is a named anchor, see the Anchor node), and every
         * non-empty href is still put through `isAllowedUri`, so
         * `javascript:`/`data:` targets are rejected exactly as before.
         */
        parseHTML() {
          return [
            {
              tag: 'a[href]',
              getAttrs: (element: HTMLElement) => {
                const href = element.getAttribute('href');
                if (href === null) return false;
                if (href === '') return null;
                const allowed = this.options.isAllowedUri(href, {
                  defaultValidate: (url: string) => !!isAllowedUri(url, this.options.protocols),
                  protocols: this.options.protocols,
                  defaultProtocol: this.options.defaultProtocol,
                });
                return allowed ? null : false;
              },
            },
          ];
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            title: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute('title'),
              renderHTML: (attributes: Record<string, unknown>) => {
                if (!attributes.title) return {};
                return { title: attributes.title };
              },
            },
          };
        },
      }).configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      // Moves the caret out of a link a paste or the Link dialog has just left
      // it at the end of, so the next words typed are not added to the link.
      LinkEscape,
      CharacterCount,
      Placeholder.configure({
        placeholder: '',
      }),
      TextDirection,
    ];

    // forced_root_block: 'div' — Enter produces <div> instead of <p>.
    // The custom Paragraph keeps the 'paragraph' node name (so TextAlign,
    // FontSize, etc. still apply) but parses/renders as <div>. SignatureBlock's
    // div[id="signature"] rule has a higher parse priority so it still wins.
    if (useDivBlocks) {
      extensions.push(
        Paragraph.extend({
          parseHTML() {
            return [{ tag: 'p' }, { tag: 'div' }];
          },
          renderHTML({ HTMLAttributes }) {
            return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
          },
        }),
      );
    }

    // Add paste-from-office cleaning
    if (this.config.paste_from_office !== false) {
      extensions.push(PasteFromOffice);
    }

    // Drop the page indentation pasted lists carry from their source document
    // (Word, Outlook, Google Docs, another editor) so they land at the editor's
    // own list indent. Registered after PasteFromOffice so the Office cleaner
    // has already turned Word's fake lists into real ones.
    extensions.push(ListPasteNormalizer);

    // Markdown paste. Registered whether or not the mode starts on, because it
    // can be switched at runtime and the engine is only built once.
    extensions.push(
      PasteMarkdown.configure({
        isEnabled: () => this.pasteMarkdownEnabled,
      })
    );

    // Add image extension for full editor
    if (!this.config.basicEditor) {
      const imageOptions = {
        // Inline, as in TinyMCE and in mail HTML: the image sits in a line of
        // text and can carry the link mark. As a block node it was lifted out
        // of its paragraph and the <a> around it was dropped.
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'md-editor-image',
        },
      };
      // Resizable images render through a node view with drag handles; the
      // schema and output HTML are the same as the plain Image. A selector is
      // matched against each image in the view; false or '' turns it all off.
      extensions.push(
        isObjectResizingOn(this.config.object_resizing)
          ? ResizableImage.configure({
              ...imageOptions,
              objectResizing: this.config.object_resizing ?? true,
              proportional: this.config.resize_img_proportional !== false,
              onResizeStart: (e) => this.fire('objectresizestart', e),
              onResized: (e) => this.fire('objectresized', e),
            })
          : Image.configure(imageOptions),
        // <map>/<area> hotspots for the images, and their usemap attribute.
        ImageMap.configure({ trans: globalTranslate })
      );
    }
    
    // Add code block with syntax highlighting. CodeSample's toggle converts
    // only the lines the selection touches (the codesample button, Mod-Alt-c).
    extensions.push(
      CodeBlockLowlight.configure({
        lowlight,
      }),
      CodeSample
    );
    
    // Add table support
    extensions.push(
      StyledTable.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'md-editor-table',
        },
        defaultAttributes: this.config.table_default_attributes,
        defaultStyles: this.config.table_default_styles,
        tabNavigation: this.config.table_tab_navigation !== false,
        // A row added by Tab in the last cell fires newrow / tablemodified too.
        onTabAddRow: () => this.runTableCommand('insert', (c) => c.addRowAfter().goToNextCell()),
      }),
      StyledTableRow,
      StyledTableCell,
      StyledTableHeader,
      TableCommands
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

    // The payload must be what getContent() would return: a consumer that saves
    // the `change` html and one that polls getContent() have to agree, or blank
    // lines survive one path and collapse on the other.
    const content = this.formatOutput(html);
    this.changeTimeout = setTimeout(() => {
      this.fire('change', content);
    }, 20);
  }

  /**
   * The single serialization pass every path that hands HTML *out* of the editor
   * must run — getContent(), the `change` event, source view, preview. See
   * fillEmptyBlocks; formatInput() is its inverse.
   */
  private formatOutput(html: string): string {
    return this.config.format_empty_lines ? fillEmptyBlocks(html) : html;
  }

  /**
   * The single parse pass every path that brings HTML *into* the editor must run
   * — setContent(), insertContent(). Repairs backslash-escaped closing tags
   * (`<\/p>` → `</p>`, see unescapeTagSlashes), moves what a `<map>` holds
   * besides its areas out of it (see liftMapContent), dissolves block-only wrapper
   * `<div>`s that would otherwise each import as a stray blank line (see
   * flattenWrapperBlocks), and strips the export-only <br> from empty blocks so
   * a blank line does not import as a hardBreak (which would render as two
   * lines). Inverse of formatOutput().
   *
   * Order matters: the tag repair has to run first or the map and wrapper passes
   * parse a half-broken tree, and flattening has to precede the blank-line strip so the
   * latter judges the real lines rather than the wrappers around them.
   */
  private formatInput(html: string): string {
    const normalized = flattenWrapperBlocks(liftMapContent(unescapeTagSlashes(html)), this.config.quote_marker_class);
    return this.config.format_empty_lines ? stripEmptyLineBreaks(normalized) : normalized;
  }

  // Public API methods

  getContent(): string {
    return this.formatOutput(this.tiptap?.getHTML() ?? '');
  }

  setContent(html: string): void {
    this.tiptap?.commands.setContent(this.formatInput(html), { parseOptions: IMPORT_PARSE_OPTIONS });
  }

  insertContent(html: string): void {
    // Same import pass as setContent: a fragment produced by getContent() (a
    // template, a saved snippet) carries the export-only <br> in its blank
    // blocks, and inserting that verbatim would grow a blank line into two.
    // IMPORT_PARSE_OPTIONS is not optional here — this is the command TipTap
    // defaults to `preserveWhitespace: 'full'`, and the Templates dropdown is
    // its highest-traffic caller. LINK_ESCAPE_META: content ending in a link
    // leaves the caret at the link's end, and what is typed next should not
    // join it.
    this.tiptap
      ?.chain()
      .insertContent(this.formatInput(html), { parseOptions: IMPORT_PARSE_OPTIONS })
      .setMeta(LINK_ESCAPE_META, true)
      .run();
  }
  
  /**
   * True when the cursor is collapsed inside a block that has no content yet.
   *
   * Font changes made here cannot be expressed as an inline mark: there is no
   * text to wrap, so setMark would only leave a stored mark that ProseMirror
   * discards as soon as the selection moves. In that case the font belongs on
   * the block node instead (see BlockFontStyle), where it persists and renders
   * into the exported HTML.
   */
  private inEmptyBlock(): boolean {
    if (!this.tiptap) return false;

    const { empty, $from } = this.tiptap.state.selection;
    return empty && $from.parent.isTextblock && $from.parent.content.size === 0;
  }

  /**
   * The one value `resolve` reports across every text node in a non-empty
   * selection, or '' when the selection spans more than one — a range covering
   * both 12pt and 18pt text has no single size to report, and saying "12pt"
   * because that is what sits at the selection head would be a lie.
   *
   * Returns null when the range holds no text at all (an image selection, say)
   * or when the selection is collapsed, leaving the caller on its cursor path.
   */
  private resolveOverSelection(
    resolve: (node: ProseMirrorNode, parent: ProseMirrorNode | null) => string
  ): string | null {
    if (!this.tiptap) return null;

    const { empty, from, to } = this.tiptap.state.selection;
    if (empty) return null;

    let found: string | null = null;
    let mixed = false;

    this.tiptap.state.doc.nodesBetween(from, to, (node, _pos, parent) => {
      if (mixed) return false;
      if (!node.isText) return true;

      const value = resolve(node, parent);
      if (found === null) {
        found = value;
      } else if (found !== value) {
        mixed = true;
        return false;
      }
      return true;
    });

    if (mixed) return '';
    return found;
  }

  /**
   * The font family in effect at the cursor: an inline <span> override if the
   * selection carries one, otherwise the block's font, otherwise the configured
   * default. A selection spanning two different families reports '' — see
   * {@link resolveOverSelection}.
   */
  getFontFamily(): string {
    if (!this.tiptap) return this.config.fontName ?? DEFAULT_FONT_FAMILY;

    const fallback = this.config.fontName ?? DEFAULT_FONT_FAMILY;

    const overSelection = this.resolveOverSelection((node, parent) => {
      const inline = node.marks.find(m => m.type.name === 'textStyle')?.attrs.fontFamily;
      if (typeof inline === 'string' && inline) return inline;

      const block = parent?.attrs.blockFontFamily;
      if (typeof block === 'string' && block) return block;

      return fallback;
    });
    if (overSelection !== null) return overSelection;

    const inline = this.tiptap.getAttributes('textStyle').fontFamily;
    if (typeof inline === 'string' && inline) return inline;

    const block = this.tiptap.getAttributes('paragraph').blockFontFamily
      ?? this.tiptap.getAttributes('heading').blockFontFamily;
    if (typeof block === 'string' && block) return block;

    return fallback;
  }

  /**
   * The font size in effect at the cursor. Same resolution order as
   * {@link getFontFamily}. Headings carry no block font-size (they size by
   * level), so inside a heading this reports the inline override or ''.
   */
  getFontSize(): string {
    if (!this.tiptap) return this.config.fontSize ?? DEFAULT_FONT_SIZE;

    const fallback = this.config.fontSize ?? DEFAULT_FONT_SIZE;

    const overSelection = this.resolveOverSelection((node, parent) => {
      const inline = node.marks.find(m => m.type.name === 'textStyle')?.attrs.fontSize;
      if (typeof inline === 'string' && inline) return inline;

      const block = parent?.attrs.blockFontSize;
      if (typeof block === 'string' && block) return block;

      return parent?.type.name === 'heading' ? '' : fallback;
    });
    if (overSelection !== null) return overSelection;

    const inline = this.tiptap.getAttributes('textStyle').fontSize;
    if (typeof inline === 'string' && inline) return inline;

    const block = this.tiptap.getAttributes('paragraph').blockFontSize;
    if (typeof block === 'string' && block) return block;

    return this.tiptap.isActive('heading') ? '' : fallback;
  }

  execCommand(command: string, _ui?: boolean, value?: unknown): boolean {
    if (!this.tiptap) return false;

    const tableResult = this.execTableCommand(command.toLowerCase(), value);
    if (tableResult !== undefined) return tableResult;

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
      case 'subscript':
        chain.toggleSubscript().run();
        return true;
      case 'superscript':
        chain.toggleSuperscript().run();
        return true;
      case 'fontname':
        if (typeof value === 'string') {
          if (this.inEmptyBlock()) {
            chain.setBlockFontFamily(value).run();
          } else {
            chain.setFontFamily(value).run();
          }
        }
        return true;
      case 'fontsize':
        if (typeof value === 'string') {
          if (this.inEmptyBlock()) {
            chain.setBlockFontSize(value).run();
          } else {
            chain.setFontSize(value).run();
          }
        }
        return true;
      case 'lineheight':
        if (typeof value === 'string') {
          chain.setLineHeight(value).run();
        }
        return true;
      case 'forecolor':
        if (typeof value === 'string') {
          // An empty value or 'none' clears the color, matching the picker's
          // "Remove color" without stripping other marks the way removeformat does
          if (value === '' || value === 'none') {
            chain.unsetColor().run();
          } else {
            chain.setColor(value).run();
          }
        }
        return true;
      case 'hilitecolor':
      case 'backcolor':
        if (typeof value === 'string') {
          if (value === '' || value === 'none') {
            chain.unsetHighlight().run();
          } else {
            chain.setHighlight({ color: value }).run();
          }
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
        // In a list, indent nests the item; elsewhere it adds a block margin.
        chain.indentSelection().run();
        return true;
      case 'outdent':
        chain.outdentSelection().run();
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
      case 'unlink':
        chain.unsetLink().run();
        return true;
      case 'inserthorizontalrule':
        chain.setHorizontalRule().run();
        return true;
      case 'mcetogglepastemarkdown':
        this.setPasteMarkdown(!this.pasteMarkdownEnabled);
        return true;
      case 'mceremoveeditor':
        this.destroy();
        return true;
      default:
        console.warn(`Unknown command: ${command}`);
        return false;
    }
  }
  
  /**
   * The value of a command at the selection, as TinyMCE's queryCommandValue:
   * the row, column and cell types of a table ('header'/'body', 'th'/'td').
   * '' for any other command, or outside a table.
   */
  queryCommandValue(command: string): string {
    const state = this.tiptap?.state;
    if (!state) return '';
    switch (command.toLowerCase()) {
      case 'mcetablerowtype':
        return getTableRowType(state);
      case 'mcetablecoltype':
        return getTableColumnType(state);
      case 'mcetablecelltype':
        return getTableCellType(state);
      default:
        return '';
    }
  }

  /**
   * TinyMCE's table commands (mceInsertTable, mceTable*), lower-cased. The
   * result is whether the command applied — false outside a table, in a
   * read-only editor, or when there is nothing to do — and undefined for a
   * command that is not a table command. With `dryRun`, nothing changes and
   * the result is whether the command would apply.
   */
  private execTableCommand(command: string, value: unknown, dryRun = false): boolean | undefined {
    const arg = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const type = typeof value === 'string' ? value : arg.type;
    const run = (kind: TableChange, build: (chain: ChainedCommands) => ChainedCommands) => {
      if (!dryRun) return this.runTableCommand(kind, build);
      return !!this.tiptap && !this.isReadOnly() && build(this.tiptap.can().chain()).run();
    };
    const dialog = (kind: TableDialogKind) => {
      if (!this.tiptap || this.isReadOnly()) return false;
      if (kind !== 'insert' && !isInTable(this.tiptap.state)) return false;
      if (dryRun) return true;
      this.tableDialog ??= new TableDialog({ editor: this, trans: globalTranslate });
      return this.tableDialog.open(kind);
    };

    switch (command) {
      case 'mceinserttabledialog':
        return dialog('insert');
      case 'mcetableprops':
        return dialog('table');
      case 'mcetablerowprops':
        return dialog('row');
      case 'mcetablecellprops':
        return dialog('cell');
      case 'mceinserttable': {
        const options = (arg.options && typeof arg.options === 'object' ? arg.options : {}) as Record<string, unknown>;
        return run('insert', (c) =>
          c.insertStyledTable({
            rows: tableCount(arg.rows, 1, 3),
            cols: tableCount(arg.columns, 1, 3),
            headerRows: tableCount(options.headerRows, 0, this.config.table_default_header_rows ?? 0),
            headerCols: tableCount(options.headerColumns, 0, this.config.table_default_header_cols ?? 0),
          })
        );
      }
      case 'mcetableinsertrowbefore':
        return run('insert', (c) => c.addRowBefore());
      case 'mcetableinsertrowafter':
        return run('insert', (c) => c.addRowAfter());
      case 'mcetabledeleterow':
        return run('structure', (c) => c.deleteTableRows());
      case 'mcetableinsertcolbefore':
        return run('insert', (c) => c.addColumnBefore());
      case 'mcetableinsertcolafter':
        return run('insert', (c) => c.addColumnAfter());
      case 'mcetabledeletecol':
        return run('structure', (c) => c.deleteTableColumns());
      case 'mcetablemergecells':
        return run('structure', (c) => c.mergeTableCells());
      case 'mcetablesplitcells':
        return run('insert', (c) => c.splitCell());
      case 'mcetabledelete':
        return run('structure', (c) => c.deleteTable());
      case 'mcetablecutrow':
        return run('structure', (c) => c.cutTableRows());
      case 'mcetablecopyrow':
        return run('none', (c) => c.copyTableRows());
      case 'mcetablepasterowbefore':
        return run('insert', (c) => c.pasteTableRows(true));
      case 'mcetablepasterowafter':
        return run('insert', (c) => c.pasteTableRows(false));
      case 'mcetablecutcol':
        return run('structure', (c) => c.cutTableColumns());
      case 'mcetablecopycol':
        return run('none', (c) => c.copyTableColumns());
      case 'mcetablepastecolbefore':
        return run('insert', (c) => c.pasteTableColumns(true));
      case 'mcetablepastecolafter':
        return run('insert', (c) => c.pasteTableColumns(false));
      case 'mcetabletogglecaption': {
        const table = this.tiptap ? selectedTable(this.tiptap.state) : null;
        if (!table) return false;
        const caption = table.attrs.caption ? null : globalTranslate('Caption');
        return run('structure', (c) => c.setTableAttributes({ caption }));
      }
      case 'mcetablerowtype':
        // A footer needs a <tfoot>, which the editor does not keep.
        if (type !== 'header' && type !== 'body') return false;
        return run('structure', (c) => c.setTableRowType(type));
      case 'mcetablecoltype':
        if (type !== 'th' && type !== 'td') return false;
        return run('structure', (c) => c.setTableColumnType(type));
      case 'mcetablecelltype':
        if (type !== 'th' && type !== 'td') return false;
        return run('structure', (c) => c.setTableCellType(type));
      case 'mcetableapplycellstyle': {
        // TinyMCE takes `backgroundColor` as well as `background-color`.
        const changes: Record<string, string | null> = {};
        for (const [key, styleValue] of Object.entries(arg)) {
          const property = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          if (typeof styleValue === 'string' && CELL_STYLE_PROPERTIES.has(property)) changes[property] = styleValue;
        }
        if (!Object.keys(changes).length) return false;
        return run('style', (c) => c.applyTableCellStyle(changes));
      }
      default:
        return undefined;
    }
  }

  /**
   * Whether a table command (an execCommand name) would apply at the
   * selection: false outside a table, in a read-only editor, or when there is
   * nothing to do (merging a single cell, pasting before anything was copied).
   * The editor's table menus and buttons use it to disable what cannot run.
   */
  isTableCommandEnabled(command: string, value?: unknown): boolean {
    return this.execTableCommand(command.toLowerCase(), value, true) ?? false;
  }

  /**
   * Run a table command and fire TinyMCE's table events for it: newrow and
   * newcell for each row and cell it created, then tablemodified. Commands
   * that change nothing (a copy) fire nothing.
   */
  runTableCommand(kind: TableChange, build: (chain: ChainedCommands) => ChainedCommands): boolean {
    const tiptap = this.tiptap;
    if (!tiptap || this.isReadOnly()) return false;

    // The rows and cells there were before, so the ones the command created
    // can be told apart. Positions, mapped through the command's steps, not
    // DOM elements: ProseMirror redraws a cell whose span changed, which is
    // not a new cell.
    const before = kind === 'insert' ? tablePartPositions(tiptap.state) : null;
    const mapping = new Mapping();
    // Steps other plugins append (appendTransaction) move positions too.
    const record = ({ transaction, appendedTransactions }: { transaction: Transaction; appendedTransactions: Transaction[] }) => {
      for (const tr of [transaction, ...appendedTransactions]) mapping.appendMapping(tr.mapping);
    };
    tiptap.on('transaction', record);
    let done: boolean;
    try {
      done = build(tiptap.chain().focus()).run();
    } finally {
      tiptap.off('transaction', record);
    }
    if (!done || kind === 'none') return done;

    if (before) {
      const kept = new Set(before.map((pos) => mapping.map(pos, 1)));
      for (const pos of tablePartPositions(tiptap.state)) {
        if (kept.has(pos)) continue;
        const node = tiptap.view.nodeDOM(pos);
        if (node instanceof HTMLTableRowElement) this.fire('newrow', { node });
        else if (node instanceof HTMLTableCellElement) this.fire('newcell', { node });
      }
    }

    const table = tableElementAtSelection(tiptap.view);
    if (table) this.fire('tablemodified', { table, structure: kind !== 'style', style: kind === 'style' });
    return true;
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

  /**
   * Toggle read-only mode. Disables editing and dims the toolbar.
   * Mirrors CKEditor's editor.setReadOnly(bool).
   */
  setReadOnly(state: boolean): void {
    this.config.readonly = state;
    this.tiptap?.setEditable(!state);
    this.editorWrapper?.classList.toggle('md-editor-readonly', state);
    this.toolbar?.setEnabled(!state);
    this.tableToolbar?.refresh();
    if (state) this.contextMenu?.close();
  }

  isReadOnly(): boolean {
    return this.config.readonly ?? false;
  }

  /**
   * Whether pastes are read as Markdown. Off unless `paste_markdown` says
   * otherwise, and per editor instance.
   */
  isPasteMarkdownEnabled(): boolean {
    return this.pasteMarkdownEnabled;
  }

  /**
   * Turn paste-as-Markdown on or off. The editor does not remember the choice
   * between sessions; a host that wants to can save it on `pastemarkdownchange`
   * and pass it back as `paste_markdown`.
   */
  setPasteMarkdown(on: boolean): void {
    if (this.pasteMarkdownEnabled === on) return;
    this.pasteMarkdownEnabled = on;
    this.config.paste_markdown = on;
    this.fire('pastemarkdownchange', on);
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
    this.tableToolbar?.destroy();
    this.tableToolbar = null;
    this.contextMenu?.destroy();
    this.contextMenu = null;
    this.toolbar = null;
    this.tiptap?.destroy();
    this.tiptap = null;
    this.imageUploadHelper?.destroy();
    this.imageUploadHelper = null;
    this.tableDialog?.destroy();
    this.tableDialog = null;
    
    if (this.editorWrapper) {
      this.editorWrapper.remove();
    }
    this.editorWrapper = null;
    
    this.eventListeners.clear();
    this.customButtons.clear();
  }
  
  /** Recreate the right-click menu, so its labels are in the current language. */
  private rebuildContextMenu(): void {
    if (!this.contextMenu) return;
    this.contextMenu.destroy();
    this.contextMenu = new ContextMenu({ editor: this, trans: globalTranslate });
  }

  getTipTap(): TipTapEditor | null {
    return this.tiptap;
  }
  
  /**
   * Set the UI language, updating all toolbar and dialog translations.
   * A custom translate function set with setTranslate() still takes priority.
   */
  setLanguage(code: string): void {
    this.config.language = code;
    builtInTranslate = createTranslateFunction(code);
    this.toolbar?.rebuild();
    this.tableToolbar?.rebuild();
    this.rebuildContextMenu();
    if (this.tiptap) relabelImageMapMarkers(this.tiptap.view.dom, globalTranslate);
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
