import type { TranslateFunction } from '../types';

import { en } from './en';
import { ar } from './ar';
import { ca } from './ca';
import { zh } from './zh';
import { cs } from './cs';
import { da } from './da';
import { enGb } from './en-gb';
import { fi } from './fi';
import { fr } from './fr';
import { frCa } from './fr-ca';
import { de } from './de';
import { el } from './el';
import { hu } from './hu';
import { id } from './id';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { nl } from './nl';
import { nb } from './nb';
import { pl } from './pl';
import { pt } from './pt';
import { ro } from './ro';
import { ru } from './ru';
import { sr } from './sr';
import { sl } from './sl';
import { es } from './es';
import { sv } from './sv';
import { zhTw } from './zh-tw';
import { th } from './th';
import { tr } from './tr';
import { vi } from './vi';

const locales: Record<string, Record<string, string>> = {
  en,
  ar,
  ca,
  zh,
  cs,
  da,
  'en-gb': enGb,
  fi,
  fr,
  'fr-ca': frCa,
  de,
  el,
  hu,
  id,
  it,
  ja,
  ko,
  nl,
  nb,
  pl,
  pt,
  ro,
  ru,
  sr,
  sl,
  es,
  sv,
  'zh-tw': zhTw,
  th,
  tr,
  vi,
};

/**
 * Get the locale string map for a given language code.
 * Falls back to English if the code is not found.
 */
export function getLocale(code: string): Record<string, string> {
  return locales[code] ?? locales['en'];
}

/**
 * Create a TranslateFunction for a given language code.
 * Returns a function that looks up keys in the locale map,
 * falling back to the key itself if not found.
 */
export function createTranslateFunction(code: string): TranslateFunction {
  const locale = getLocale(code);
  return (key: string) => locale[key] ?? key;
}

/** List of all supported locale codes */
export const availableLocales: string[] = Object.keys(locales);

/** All translation keys used by the editor */
export const TRANSLATION_KEYS: string[] = Object.keys(en);
