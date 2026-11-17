/**
 * ImageAttributes
 * The style an image keeps: float, margins and border, as the image dialog
 * writes them and as older mail and editors set them.
 *
 * Editor content renders in the host page, not in an iframe, so the style is
 * never kept whole. Each property on IMAGE_STYLE_RULES is kept only when its
 * value matches, on the way in (HTML) and again on the way out (renderHTML),
 * because JSON content and the dialog's own inserts skip the parse rules.
 */

import { Extension } from '@tiptap/core';
import { CSS_BORDER_STYLE, CSS_COLOR, CSS_LENGTH, pickStyle, sanitizeStyle } from '../utils/cssValues';
import type { StyleRules } from '../utils/cssValues';

/** The style an image may keep. */
export const IMAGE_STYLE_RULES: StyleRules = [
  ['float', /^(left|right|none)$/],
  ['margin-top', CSS_LENGTH],
  ['margin-right', CSS_LENGTH],
  ['margin-bottom', CSS_LENGTH],
  ['margin-left', CSS_LENGTH],
  ['border-width', CSS_LENGTH],
  ['border-style', CSS_BORDER_STYLE],
  ['border-color', CSS_COLOR],
];

/** A legacy pixel attribute (`10`, `10px`) as a CSS length, or '' for anything else. */
function legacyPixels(value: string | null): string {
  const match = /^\s*(\d{1,4})(px)?\s*$/i.exec(value ?? '');
  return match ? `${Number(match[1])}px` : '';
}

/**
 * The allowed style of an imported image, or null. The presentational
 * attributes older mail and editors write (align, hspace, vspace, border) are
 * read in where the style does not already set the property.
 */
function imageStyleOf(element: HTMLElement): string | null {
  const style = element.ownerDocument.createElement('div').style;
  style.cssText = element.style.cssText;
  const fill = (property: string, value: string) => {
    if (value && !style.getPropertyValue(property)) style.setProperty(property, value);
  };
  const align = element.getAttribute('align')?.trim().toLowerCase();
  if (align === 'left' || align === 'right') fill('float', align);
  const hspace = legacyPixels(element.getAttribute('hspace'));
  fill('margin-left', hspace);
  fill('margin-right', hspace);
  const vspace = legacyPixels(element.getAttribute('vspace'));
  fill('margin-top', vspace);
  fill('margin-bottom', vspace);
  // border="0" only turned off the border old browsers drew around a linked image.
  const border = legacyPixels(element.getAttribute('border'));
  if (border && border !== '0px') {
    fill('border-width', border);
    fill('border-style', 'solid');
  }
  return pickStyle(style, IMAGE_STYLE_RULES, element.ownerDocument);
}

/**
 * A size written as style (`width: 200px`), as the image's own attribute holds
 * it, or null. Only pixels: the attribute has no other unit but percent, and a
 * percentage of what the style meant is not known here.
 */
function styleSize(element: HTMLElement, property: 'width' | 'height'): number | null {
  const match = /^(\d+(\.\d+)?)px$/.exec(element.style.getPropertyValue(property).trim());
  return match ? Math.round(Number(match[1])) : null;
}

/**
 * The image's width or height when only its style gives one. The image's own
 * attribute is read after this one and wins when the img has the attribute.
 */
function styleSizeAttribute(property: 'width' | 'height') {
  return {
    default: null,
    rendered: false,
    parseHTML: (element: HTMLElement) => styleSize(element, property),
  };
}

/** An image's text direction: `dir` other than auto, which an image has no text to apply to. */
const DIR = /^(ltr|rtl)$/;
/** A language tag: a two- or three-letter language and optional subtags (`en`, `fr-CA`, `zh-Hant-TW`). */
const LANG = /^[a-z]{2,3}(-[a-z0-9]{1,8})*$/i;

/** `value` lowercased (for dir) or as is, when it matches `pattern`; else null. */
function checked(value: unknown, pattern: RegExp, lower = false): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = lower ? value.trim().toLowerCase() : value.trim();
  return pattern.test(trimmed) ? trimmed : null;
}

/** An image's text direction as it may be stored (`ltr` or `rtl`), or null. */
export const imageDir = (value: unknown): string | null => checked(value, DIR, true);

/** An image's language tag as it may be stored, or null. */
export const imageLang = (value: unknown): string | null => checked(value, LANG);

/** A plain attribute kept only when its value matches `pattern`, in and out. */
function checkedAttribute(name: string, pattern: RegExp, lower = false) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => checked(element.getAttribute(name), pattern, lower),
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = checked(attributes[name], pattern, lower);
      return value ? { [name]: value } : {};
    },
  };
}

export const ImageAttributes = Extension.create({
  name: 'imageAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['image'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element: HTMLElement) => imageStyleOf(element),
            renderHTML: (attributes: Record<string, unknown>) => {
              const style = sanitizeStyle(attributes.style, IMAGE_STYLE_RULES);
              return style ? { style } : {};
            },
          },
          dir: checkedAttribute('dir', DIR, true),
          lang: checkedAttribute('lang', LANG),
          width: styleSizeAttribute('width'),
          height: styleSizeAttribute('height'),
        },
      },
    ];
  },
});
