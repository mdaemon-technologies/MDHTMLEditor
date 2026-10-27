/**
 * cssValues Tests
 * The value checks behind every style the editor keeps from imported HTML.
 */

import {
  CSS_COLOR,
  CSS_LENGTH,
  CSS_LENGTH_OR_PERCENT,
  CSS_BORDER_STYLE,
  mergeStyle,
  pickStyle,
  sanitizeStyle,
} from '../../src/utils/cssValues';
import type { StyleRules } from '../../src/utils/cssValues';

describe('cssValues', () => {
  describe('CSS_LENGTH', () => {
    it.each(['0', '1px', '1.5pt', '2em'])('accepts %s', (value) => {
      expect(CSS_LENGTH.test(value)).toBe(true);
    });

    it.each(['-1px', '10%', 'calc(1px + 2px)', 'var(--x)', '1vw', 'auto', ''])('rejects %s', (value) => {
      expect(CSS_LENGTH.test(value)).toBe(false);
    });
  });

  describe('CSS_LENGTH_OR_PERCENT', () => {
    it.each(['100%', '50.5%', '300px', '0'])('accepts %s', (value) => {
      expect(CSS_LENGTH_OR_PERCENT.test(value)).toBe(true);
    });

    it.each(['-10%', 'calc(100% - 1px)', 'inherit'])('rejects %s', (value) => {
      expect(CSS_LENGTH_OR_PERCENT.test(value)).toBe(false);
    });
  });

  describe('CSS_COLOR', () => {
    it.each(['#fff', '#ff0000', 'rgb(255, 0, 0)', 'rgba(0, 0, 0, 0.5)', 'red'])('accepts %s', (value) => {
      expect(CSS_COLOR.test(value)).toBe(true);
    });

    it.each(['inherit', 'initial', 'unset', 'url(x)', 'var(--c)', 'expression(alert(1))'])('rejects %s', (value) => {
      expect(CSS_COLOR.test(value)).toBe(false);
    });
  });

  describe('CSS_BORDER_STYLE', () => {
    it.each(['none', 'hidden', 'solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset'])(
      'accepts %s',
      (value) => {
        expect(CSS_BORDER_STYLE.test(value)).toBe(true);
      }
    );

    it('rejects anything else', () => {
      expect(CSS_BORDER_STYLE.test('wavy')).toBe(false);
    });
  });

  const RULES: StyleRules = [
    ['background-color', CSS_COLOR],
    ['width', CSS_LENGTH_OR_PERCENT],
    ['border-style', CSS_BORDER_STYLE],
  ];

  describe('pickStyle', () => {
    it('keeps only listed properties whose values match', () => {
      const el = document.createElement('td');
      el.setAttribute('style', 'background-color: red; width: 50%; color: blue; position: fixed');
      expect(pickStyle(el.style, RULES)).toBe('background-color: red; width: 50%;');
    });

    it('drops a listed property whose value does not match', () => {
      const el = document.createElement('td');
      el.setAttribute('style', 'background-color: url(x); width: -5px');
      expect(pickStyle(el.style, RULES)).toBeNull();
    });

    it('returns null when nothing is kept', () => {
      expect(pickStyle(document.createElement('td').style, RULES)).toBeNull();
    });
  });

  describe('mergeStyle', () => {
    it('sets, replaces and removes properties, keeping the rest', () => {
      expect(mergeStyle('background-color: red; width: 10px', { 'background-color': 'blue', width: '' }, RULES)).toBe(
        'background-color: blue;'
      );
      expect(mergeStyle(null, { 'border-style': 'solid' }, RULES)).toBe('border-style: solid;');
    });

    it('ignores properties and values that are not allowed', () => {
      expect(mergeStyle('width: 10px', { position: 'fixed', 'background-color': 'url(x)' }, RULES)).toBe('width: 10px;');
    });

    it('returns null when nothing is left', () => {
      expect(mergeStyle('width: 10px', { width: null }, RULES)).toBeNull();
    });
  });

  describe('sanitizeStyle', () => {
    it('filters a style string through the rules', () => {
      expect(sanitizeStyle('border-style: dashed; behavior: url(x.htc); width: 10px', RULES)).toBe(
        'width: 10px; border-style: dashed;'
      );
    });

    it('returns null for an empty, invalid or non-string value', () => {
      expect(sanitizeStyle('', RULES)).toBeNull();
      expect(sanitizeStyle('color: red', RULES)).toBeNull();
      expect(sanitizeStyle(null, RULES)).toBeNull();
      expect(sanitizeStyle(42, RULES)).toBeNull();
    });
  });
});
