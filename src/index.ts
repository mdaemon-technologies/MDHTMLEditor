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
  GlobalConfig,
  LanguageChangeCallback,
} from './types';

// Import styles
import './styles/editor.scss';
