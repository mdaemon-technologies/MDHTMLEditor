/**
 * Icons Tests
 * Validates icon sets used by toolbar buttons
 */

import { DEFAULT_ICONS, CONFAB_ICONS } from '../../src/icons';
import type { IconSet } from '../../src/icons';

/** Toolbar button names that require icons */
const EXPECTED_BUTTON_NAMES = [
  'bold', 'italic', 'underline', 'strikethrough',
  'bullist', 'numlist', 'outdent', 'indent', 'blockquote',
  'alignleft', 'aligncenter', 'alignright', 'alignjustify',
  'removeformat', 'copy', 'cut', 'paste',
  'undo', 'redo',
  'image', 'charmap', 'emoticons',
  'fullscreen', 'preview', 'code', 'link', 'codesample',
  'ltr', 'rtl', 'searchreplace', 'togglemore',
];

describe('Icons', () => {
  describe('DEFAULT_ICONS', () => {
    it('should be an object', () => {
      expect(typeof DEFAULT_ICONS).toBe('object');
      expect(DEFAULT_ICONS).not.toBeNull();
    });

    it('should contain all expected toolbar button icons', () => {
      for (const name of EXPECTED_BUTTON_NAMES) {
        expect(DEFAULT_ICONS).toHaveProperty(name);
      }
    });

    it('should have non-empty string values for all icons', () => {
      for (const [key, value] of Object.entries(DEFAULT_ICONS)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('should have valid SVG for alignment icons', () => {
      const svgIcons = ['alignleft', 'aligncenter', 'alignright', 'alignjustify'];
      for (const name of svgIcons) {
        expect(DEFAULT_ICONS[name]).toContain('<svg');
        expect(DEFAULT_ICONS[name]).toContain('</svg>');
      }
    });

    it('should have valid SVG for image icon', () => {
      expect(DEFAULT_ICONS.image).toContain('<svg');
      expect(DEFAULT_ICONS.image).toContain('</svg>');
    });

    it('should have valid SVG for code icon', () => {
      expect(DEFAULT_ICONS.code).toContain('<svg');
      expect(DEFAULT_ICONS.code).toContain('</svg>');
    });

    it('should use text/emoji for simple formatting buttons', () => {
      expect(DEFAULT_ICONS.bold).toBe('B');
      expect(DEFAULT_ICONS.italic).toBe('I');
      expect(DEFAULT_ICONS.underline).toBe('U');
      expect(DEFAULT_ICONS.strikethrough).toBe('S');
    });
  });

  describe('CONFAB_ICONS', () => {
    it('should be an object', () => {
      expect(typeof CONFAB_ICONS).toBe('object');
      expect(CONFAB_ICONS).not.toBeNull();
    });

    it('should contain all expected toolbar button icons', () => {
      for (const name of EXPECTED_BUTTON_NAMES) {
        expect(CONFAB_ICONS).toHaveProperty(name);
      }
    });

    it('should have non-empty string values for all icons', () => {
      for (const [key, value] of Object.entries(CONFAB_ICONS)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('should use SVG for most icons', () => {
      const svgButtons = [
        'bold', 'italic', 'underline', 'strikethrough',
        'bullist', 'numlist', 'outdent', 'indent', 'blockquote',
        'alignleft', 'aligncenter', 'alignright', 'alignjustify',
        'removeformat', 'copy', 'cut', 'paste',
        'undo', 'redo', 'image', 'fullscreen', 'preview',
        'code', 'link', 'codesample', 'ltr', 'rtl',
        'searchreplace', 'togglemore',
      ];
      for (const name of svgButtons) {
        expect(CONFAB_ICONS[name]).toContain('<svg');
        expect(CONFAB_ICONS[name]).toContain('</svg>');
      }
    });

    it('should use consistent SVG viewBox', () => {
      for (const [key, value] of Object.entries(CONFAB_ICONS)) {
        if (value.includes('<svg')) {
          expect(value).toContain('viewBox="0 0 24 24"');
        }
      }
    });

    it('should use currentColor for stroke', () => {
      for (const [key, value] of Object.entries(CONFAB_ICONS)) {
        if (value.includes('<svg')) {
          expect(value).toContain('stroke="currentColor"');
        }
      }
    });
  });

  describe('Icon Set Consistency', () => {
    it('should have the same keys in both icon sets', () => {
      const defaultKeys = Object.keys(DEFAULT_ICONS).sort();
      const confabKeys = Object.keys(CONFAB_ICONS).sort();
      expect(defaultKeys).toEqual(confabKeys);
    });

    it('should share alignment SVG icons between sets', () => {
      // Alignment icons use the same shared SVG constants
      expect(DEFAULT_ICONS.alignleft).toBe(CONFAB_ICONS.alignleft);
      expect(DEFAULT_ICONS.aligncenter).toBe(CONFAB_ICONS.aligncenter);
      expect(DEFAULT_ICONS.alignright).toBe(CONFAB_ICONS.alignright);
      expect(DEFAULT_ICONS.alignjustify).toBe(CONFAB_ICONS.alignjustify);
    });

    it('should share image SVG icon between sets', () => {
      expect(DEFAULT_ICONS.image).toBe(CONFAB_ICONS.image);
    });

    it('should share code SVG icon between sets', () => {
      expect(DEFAULT_ICONS.code).toBe(CONFAB_ICONS.code);
    });
  });
});
