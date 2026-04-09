/**
 * i18n Tests
 */

import { getLocale, createTranslateFunction, availableLocales, TRANSLATION_KEYS } from '../../src/i18n';
import { en } from '../../src/i18n/en';

describe('i18n', () => {
  describe('TRANSLATION_KEYS', () => {
    it('should contain all expected keys', () => {
      expect(TRANSLATION_KEYS).toContain('Bold');
      expect(TRANSLATION_KEYS).toContain('Italic');
      expect(TRANSLATION_KEYS).toContain('Find and Replace');
      expect(TRANSLATION_KEYS).toContain('Search...');
      expect(TRANSLATION_KEYS).toContain('Special Character');
      expect(TRANSLATION_KEYS).toContain('Apply');
      expect(TRANSLATION_KEYS).toContain('Enter image URL:');
    });

    it('should match the English locale keys', () => {
      expect(TRANSLATION_KEYS).toEqual(Object.keys(en));
    });
  });

  describe('availableLocales', () => {
    it('should list all 31 locale codes', () => {
      expect(availableLocales).toHaveLength(31);
    });

    it('should include expected locale codes', () => {
      expect(availableLocales).toContain('en');
      expect(availableLocales).toContain('de');
      expect(availableLocales).toContain('fr');
      expect(availableLocales).toContain('ja');
      expect(availableLocales).toContain('ar');
      expect(availableLocales).toContain('zh');
      expect(availableLocales).toContain('zh-tw');
      expect(availableLocales).toContain('en-gb');
      expect(availableLocales).toContain('fr-ca');
      expect(availableLocales).toContain('ko');
      expect(availableLocales).toContain('es');
    });
  });

  describe('getLocale', () => {
    it('should return English locale for "en"', () => {
      const locale = getLocale('en');
      expect(locale['Bold']).toBe('Bold');
      expect(locale['Italic']).toBe('Italic');
    });

    it('should return German locale for "de"', () => {
      const locale = getLocale('de');
      expect(locale['Bold']).toBe('Fett');
      expect(locale['Italic']).toBe('Kursiv');
      expect(locale['Find and Replace']).toBe('Suchen und Ersetzen');
    });

    it('should return French locale for "fr"', () => {
      const locale = getLocale('fr');
      expect(locale['Bold']).toBe('Gras');
      expect(locale['Copy']).toBe('Copier');
    });

    it('should return Japanese locale for "ja"', () => {
      const locale = getLocale('ja');
      expect(locale['Bold']).toBe('太字');
    });

    it('should fall back to English for unknown codes', () => {
      const locale = getLocale('xx-unknown');
      expect(locale['Bold']).toBe('Bold');
      expect(locale).toEqual(en);
    });

    it('should return locale with all expected keys', () => {
      for (const code of availableLocales) {
        const locale = getLocale(code);
        for (const key of TRANSLATION_KEYS) {
          expect(locale[key]).toBeDefined();
        }
      }
    });
  });

  describe('createTranslateFunction', () => {
    it('should return a function that translates keys', () => {
      const t = createTranslateFunction('de');
      expect(t('Bold')).toBe('Fett');
      expect(t('Italic')).toBe('Kursiv');
    });

    it('should fall back to the key for unknown keys', () => {
      const t = createTranslateFunction('de');
      expect(t('NonExistentKey')).toBe('NonExistentKey');
    });

    it('should fall back to English for unknown locale codes', () => {
      const t = createTranslateFunction('zz');
      expect(t('Bold')).toBe('Bold');
    });
  });
});
