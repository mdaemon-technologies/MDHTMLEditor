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
    it('should list all 32 locale codes', () => {
      expect(availableLocales).toHaveLength(32);
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

    // A value equal to the English text is an untranslated string, except for words
    // that really are the same in that language (listed here; '*' = every locale).
    const SAME_AS_ENGLISH: Record<string, string[]> = {
      'URL': ['*'],
      'Format': ['ca', 'da', 'fr', 'fr-ca', 'de', 'id', 'nb', 'pl', 'ro', 'sv', 'sr-latn'],
      'Emoticons': ['de', 'nl', 'pt'],
      'Styles': ['fr', 'fr-ca'],
      'Start': ['da', 'nb'],
      'Font': ['id', 'ro', 'sr-latn'],
      'Upload': ['da'],
      'Subscript': ['nl'],
      'Superscript': ['nl'],
      'Stop': ['da'],
      'Cell': ['sv'],
    };

    it('translates every key in every non-English locale', () => {
      for (const code of availableLocales) {
        if (code === 'en' || code === 'en-gb') continue;
        const locale = getLocale(code);
        const untranslated = TRANSLATION_KEYS.filter((key) => {
          const same = SAME_AS_ENGLISH[key] ?? [];
          return locale[key] === en[key] && !same.includes('*') && !same.includes(code);
        });
        expect({ code, untranslated }).toEqual({ code, untranslated: [] });
      }
    });

    it('labels the Speech to Text and Dictate buttons differently in every locale', () => {
      const same = availableLocales.filter((code) => getLocale(code)['Speech to Text'] === getLocale(code)['Dictate']);
      expect(same).toEqual([]);
    });

    it('has no text lost to an encoding conversion', () => {
      // A lossy conversion leaves the replacement character or turns each
      // character it can't map into '?'
      const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);
      const questionMarks = (text: string) => text.split('?').length - 1;
      for (const code of availableLocales) {
        const locale = getLocale(code);
        const damaged = TRANSLATION_KEYS.filter((key) =>
          locale[key].includes(REPLACEMENT_CHAR) || questionMarks(locale[key]) > questionMarks(en[key]));
        expect({ code, damaged }).toEqual({ code, damaged: [] });
      }
    });

    it('keeps every placeholder of the English text', () => {
      const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
      for (const code of availableLocales) {
        const locale = getLocale(code);
        const broken = TRANSLATION_KEYS.filter((key) =>
          JSON.stringify(placeholders(locale[key])) !== JSON.stringify(placeholders(en[key])));
        expect({ code, broken }).toEqual({ code, broken: [] });
      }
    });

    it('writes the confidence percentage the way the language does', () => {
      // CLDR's percent format (85%, 85 %, %85), with Latin digits and no bidi marks
      const BIDI_MARKS = /[‎‏؜]/g;
      for (const code of availableLocales) {
        const expected = new Intl.NumberFormat(`${code}-u-nu-latn`, { style: 'percent' })
          .format(0.85).replace(BIDI_MARKS, '');
        const shown = getLocale(code)['Confidence: {percent}%'].replace('{percent}', '85');
        expect({ code, endsWith: shown.endsWith(expected) }).toEqual({ code, endsWith: true });
      }
    });

    it('puts no space between Chinese or Japanese text and a Latin word', () => {
      const CJK = '぀-ヿ㐀-鿿＀-￯';
      const spaced = new RegExp(`[${CJK}] +[A-Za-z]|[A-Za-z] +[${CJK}]`);
      for (const code of ['ja', 'zh', 'zh-tw']) {
        const locale = getLocale(code);
        const keys = TRANSLATION_KEYS.filter((key) => spaced.test(locale[key]));
        expect({ code, keys }).toEqual({ code, keys: [] });
      }
    });

    // Wording that was wrong, or unnatural for where the string appears
    it.each([
      ['ca', 'Cut', 'Retallar'],
      ['ca', 'Open link in...', 'Obrir l\'enllaç a...'],
      ['ca', 'Drop image here or click to browse', 'Deixeu anar la imatge aquí o feu clic per explorar'],
      ['da', 'Confidence', 'Pålidelighed'],
      ['de', 'Previous', 'Vorheriges'],
      ['de', 'Next', 'Nächstes'],
      ['de', 'Listening...', 'Hört zu...'],
      ['de', 'Case sensitive', 'Groß-/Kleinschreibung beachten'],
      ['el', 'Insert anchor', 'Εισαγωγή άγκυρας'],
      ['el', 'Anchor', 'Άγκυρα'],
      ['el', 'Anchor name', 'Όνομα άγκυρας'],
      ['el', 'Anchor name is required', 'Απαιτείται όνομα άγκυρας'],
      ['el', 'Anchor name cannot contain spaces', 'Το όνομα της άγκυρας δεν μπορεί να περιέχει κενά'],
      ['es', 'Enter image URL:', 'Introduce la URL de la imagen:'],
      ['es', 'Enter URL:', 'Introduce la URL:'],
      ['fi', 'More', 'Näytä lisää'],
      ['fr', 'Upload', 'Importer'],
      ['fr', 'Uploading...', 'Importation en cours...'],
      ['fr', 'Upload failed', 'Échec de l\'importation'],
      ['fr', 'Upload aborted', 'Importation annulée'],
      ['hu', 'Insert row before', 'Sor beszúrása fölé'],
      ['hu', 'Insert row after', 'Sor beszúrása alá'],
      ['hu', 'Insert column before', 'Oszlop beszúrása balra'],
      ['hu', 'Insert column after', 'Oszlop beszúrása jobbra'],
      ['hu', 'Microphone access denied', 'Mikrofon-hozzáférés megtagadva'],
      ['hu', 'Invalid image URL', 'Érvénytelen kép-URL'],
      ['id', 'Confidence', 'Tingkat keyakinan'],
      ['it', 'No speech detected', 'Nessuna voce rilevata'],
      ['it', 'Dictate', 'Detta'],
      ['ja', 'More', 'その他'],
      ['ko', 'Title', '제목'],
      ['pt', 'Enter image URL:', 'Insira a URL da imagem:'],
      ['pt', 'Enter URL:', 'Insira a URL:'],
      ['pt', 'Invalid image URL', 'URL de imagem inválida'],
      ['ro', 'Upload failed', 'Încărcare eșuată'],
      ['ro', 'Enter image URL:', 'Introdu URL-ul imaginii:'],
      ['ro', 'Enter URL:', 'Introdu URL-ul:'],
      ['ru', 'Microphone access denied', 'Доступ к микрофону запрещён'],
      ['ru', 'Confidence', 'Достоверность'],
      ['sv', 'Upload failed', 'Uppladdningen misslyckades'],
      ['sl', 'Confidence', 'Zanesljivost'],
      ['sr', 'Browse...', 'Прегледај...'],
      ['sr', 'Drop image here or click to browse', 'Превуците слику овде или кликните за избор'],
      ['sr', 'Network error', 'Мрежна грешка'],
      ['sr', 'Network error - speech recognition requires internet', 'Мрежна грешка - препознавање говора захтева интернет'],
      ['th', 'Dictate', 'พิมพ์ด้วยเสียง'],
      ['tr', 'Save', 'Kaydet'],
      ['tr', 'Insert row before', 'Üste satır ekle'],
      ['tr', 'Insert row after', 'Alta satır ekle'],
      ['tr', 'Insert column before', 'Sola sütun ekle'],
      ['tr', 'Insert column after', 'Sağa sütun ekle'],
      ['vi', 'Dictate', 'Nhập bằng giọng nói'],
      ['vi', 'Insert row before', 'Chèn hàng phía trên'],
      ['vi', 'Insert row after', 'Chèn hàng phía dưới'],
      ['zh', 'Enter image URL:', '输入图片URL：'],
      ['zh', 'Enter URL:', '输入URL：'],
      ['zh-tw', 'Enter image URL:', '輸入圖片URL：'],
      ['zh-tw', 'Enter URL:', '輸入URL：'],
    ])('%s translates "%s" as "%s"', (code, key, expected) => {
      expect(getLocale(code)[key]).toBe(expected);
    });
  });

  describe('sr-latn', () => {
    // Serbian Cyrillic to Latin (Gaj's alphabet); Љ Њ Џ become two letters
    const CYR_TO_LAT: Record<string, string> = {
      А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J', К: 'K',
      Л: 'L', Љ: 'Lj', М: 'M', Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', Ћ: 'Ć', У: 'U',
      Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č', Џ: 'Dž', Ш: 'Š',
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k',
      л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u',
      ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
    };
    const toLatin = (text: string): string =>
      Array.from(text).map((ch, i, all) => {
        const lat = CYR_TO_LAT[ch] ?? ch;
        // an all-caps word keeps a digraph all caps: ЉУБАВ → LJUBAV
        const next = all[i + 1];
        return lat.length === 2 && next && next !== next.toLowerCase() ? lat.toUpperCase() : lat;
      }).join('');

    it('is listed', () => {
      expect(availableLocales).toContain('sr-latn');
    });

    it('is the sr locale in Latin script, key for key', () => {
      const sr = getLocale('sr');
      const srLatn = getLocale('sr-latn');
      for (const key of TRANSLATION_KEYS) {
        expect({ key, value: srLatn[key] }).toEqual({ key, value: toLatin(sr[key]) });
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
