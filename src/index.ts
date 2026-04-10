/**
 * MDHTMLEditor - Main Entry Point
 * A TinyMCE-compatible HTML editor built on TipTap
 */

// Core
export { HTMLEditor, fontNames, setTranslate, getTranslate, resetTranslate, setGetFileSrc, getGetFileSrc } from './core/HTMLEditor';
export { Toolbar } from './core/Toolbar';

// Icons
export { DEFAULT_ICONS, CONFAB_ICONS } from './icons';
export type { IconSet } from './icons';

// Extensions
export { FontSize } from './extensions/FontSize';
export { LineHeight } from './extensions/LineHeight';
export { TextDirection } from './extensions/TextDirection';
export { CharacterMap, CHAR_MAP } from './extensions/CharacterMap';
export { EmojiPicker, EMOJI_CATEGORIES } from './extensions/Emoji';
export { SearchReplace } from './extensions/SearchReplace';
export { SignatureBlock } from './extensions/SignatureBlock';
export { SourceEditor } from './extensions/SourceEditor';
export type { SourceEditorOptions } from './extensions/SourceEditor';
export { LinkEditor } from './extensions/LinkEditor';
export type { LinkEditorOptions } from './extensions/LinkEditor';

// i18n
export { getLocale, createTranslateFunction, availableLocales, TRANSLATION_KEYS } from './i18n';

// Types
export type {
  EditorConfig,
  EditorEvents,
  EditorEventMap,
  MDHTMLEditor,
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
  GlobalConfig,
  LanguageChangeCallback,
} from './types';

// Import styles
import './styles/editor.scss';
