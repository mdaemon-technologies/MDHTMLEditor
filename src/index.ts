/**
 * MDHTMLEditor - Main Entry Point
 * A TinyMCE-compatible HTML editor built on TipTap
 */

// Core
export {
  HTMLEditor,
  fontNames,
  setTranslate,
  getTranslate,
  resetTranslate,
  setGetFileSrc,
  getGetFileSrc,
  DEFAULT_TABLE_TOOLBAR,
} from './core/HTMLEditor';
export type { TableChange } from './core/HTMLEditor';
export { Toolbar } from './core/Toolbar';

// Icons
export { DEFAULT_ICONS, CONFAB_ICONS } from './icons';
export type { IconSet } from './icons';

// Extensions
export { FontSize } from './extensions/FontSize';
export { BlockFontStyle } from './extensions/BlockFontStyle';
export type { BlockFontStyleOptions } from './extensions/BlockFontStyle';
export { BlockIndent } from './extensions/BlockIndent';
export type { BlockIndentOptions } from './extensions/BlockIndent';
export { TabCharacter } from './extensions/TabCharacter';
export { LineHeight } from './extensions/LineHeight';
export { TextDirection } from './extensions/TextDirection';
export { CharacterMap, CHAR_MAP } from './extensions/CharacterMap';
export { EmojiPicker, EMOJI_CATEGORIES, EMOJI_DATA } from './extensions/Emoji';
export { SearchReplace } from './extensions/SearchReplace';
export { SignatureBlock } from './extensions/SignatureBlock';
export { MarkedQuote } from './extensions/MarkedQuote';
export type { MarkedQuoteOptions } from './extensions/MarkedQuote';
export { Mention } from './extensions/Mention';
export { Anchor } from './extensions/Anchor';
export type { AnchorOptions } from './extensions/Anchor';
export { AnchorDialog } from './extensions/AnchorDialog';
export type { AnchorDialogOptions } from './extensions/AnchorDialog';
export { InlineStyle } from './extensions/InlineStyle';
export type { InlineStyleOptions } from './extensions/InlineStyle';
export { SourceEditor } from './extensions/SourceEditor';
export type { SourceEditorOptions } from './extensions/SourceEditor';
export { LinkEditor } from './extensions/LinkEditor';
export type { LinkEditorOptions } from './extensions/LinkEditor';
export { PasteFromOffice } from './extensions/PasteFromOffice';
export type { PasteFromOfficeOptions } from './extensions/PasteFromOffice';
export { ListPasteNormalizer, normalizePastedLists, stripIndentDeclarations } from './extensions/ListPasteNormalizer';
export { PasteMarkdown, pasteMarkdownText } from './extensions/PasteMarkdown';
export type { PasteMarkdownOptions } from './extensions/PasteMarkdown';
export { CodeSample } from './extensions/CodeSample';
export { ResizableImage, computeImageResize, isImageResizable, MIN_IMAGE_SIZE } from './extensions/ImageResize';
export type { ResizableImageOptions, ImageResizeInput } from './extensions/ImageResize';
export { ImageMap } from './extensions/ImageMap';
export type { ImageMapArea, ImageMapOptions } from './extensions/ImageMap';
export {
  StyledTable,
  StyledTableRow,
  StyledTableCell,
  StyledTableHeader,
  StyledTableView,
  TABLE_STYLE_RULES,
  ROW_STYLE_RULES,
  CELL_STYLE_RULES,
} from './extensions/TableAttributes';
export type { StyledTableOptions, InsertStyledTableOptions } from './extensions/TableAttributes';
export {
  TableCommands,
  getTableRowType,
  getTableColumnType,
  getTableCellType,
  selectedCellPositions,
  selectedTable,
} from './extensions/TableCommands';
export type {
  TableClipboard,
  TableCommandsStorage,
  TableAttributeChanges,
  CellAttributeChanges,
} from './extensions/TableCommands';
export { TableDialog, BORDER_STYLE_CHOICES } from './extensions/TableDialog';
export type { TableDialogOptions, TableDialogKind } from './extensions/TableDialog';
export { TableMenu, TABLE_ACTIONS, TABLE_BUTTON_NAMES } from './extensions/TableMenu';
export type { TableAction, TableMenuOptions } from './extensions/TableMenu';
export { TableToolbar } from './extensions/TableToolbar';
export type { TableToolbarOptions } from './extensions/TableToolbar';
export { ContextMenu } from './extensions/ContextMenu';
export type { ContextMenuOptions } from './extensions/ContextMenu';
export { SpeechToText, isSpeechRecognitionSupported } from './extensions/SpeechToText';
export type { SpeechToTextOptions } from './extensions/SpeechToText';
export { Dictation } from './extensions/Dictation';
export type { DictationOptions } from './extensions/Dictation';

// i18n
export { getLocale, createTranslateFunction, availableLocales, TRANSLATION_KEYS } from './i18n';

// Types
export type {
  EditorConfig,
  EditorEvents,
  EditorEventMap,
  MDHTMLEditor,
  StyleFormat,
  Template,
  ToolbarButtonSpec,
  ToolbarButtonAPI,
  UIRegistry,
  FontOption,
  ColorOption,
  CharMapChar,
  SearchReplaceOptions,
  ImageUploadResult,
  ImageUploadHandler,
  DropboxFile,
  DropboxChooseOptions,
  TranslateFunction,
  CustomTranslateFunction,
  GlobalConfig,
  LanguageChangeCallback,
  PasteMarkdownChangeCallback,
  ImageResizeHandle,
  ObjectResizeEvent,
  ObjectResizeCallback,
  TableModifiedEvent,
  TableModifiedCallback,
  NewRowEvent,
  NewRowCallback,
  NewCellEvent,
  NewCellCallback,
} from './types';

// Import styles
import './styles/editor.scss';
