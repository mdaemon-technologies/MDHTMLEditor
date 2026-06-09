/**
 * BlockFontStyle Extension
 *
 * Inlines the DEFAULT font-family and font-size onto block elements
 * (<p>/<div>/<hN>) so exported HTML carries the base font on the block itself,
 * instead of relying on the editor's container CSS being present on the
 * receiving end (e.g. an email body rendered in another client).
 *
 * This only provides the *defaults* — it has no commands. Per-selection font
 * changes are still handled by the inline mark extensions (FontSize and
 * TipTap's FontFamily, which produce <span style="…">), and those spans
 * override the block default for the text they wrap. So a single paragraph can
 * still mix sizes/fonts (e.g. "this is A BIG font, and this is a small font").
 *
 * Notes:
 * - font-family defaults are applied to paragraphs AND headings (harmless to
 *   heading sizing).
 * - font-size defaults are applied to paragraphs only — headings derive their
 *   size from their level (h1=2em, h2=1.5em, …) and a forced default would
 *   clobber that.
 */

import { Extension } from '@tiptap/core';

export interface BlockFontStyleOptions {
  /** Node types that receive the default font-family. */
  fontFamilyTypes: string[];
  /** Node types that receive the default font-size. */
  fontSizeTypes: string[];
  /** Default font-family inlined on every matching block. */
  defaultFontFamily: string;
  /** Default font-size inlined on every matching block. */
  defaultFontSize: string;
}

export const BlockFontStyle = Extension.create<BlockFontStyleOptions>({
  name: 'blockFontStyle',

  addOptions() {
    return {
      fontFamilyTypes: ['paragraph', 'heading'],
      fontSizeTypes: ['paragraph'],
      defaultFontFamily: 'arial, helvetica, sans-serif',
      defaultFontSize: '12pt',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.fontFamilyTypes,
        attributes: {
          // Named blockFontFamily to avoid colliding with the inline
          // FontFamily mark's `fontFamily` attribute on textStyle.
          blockFontFamily: {
            default: this.options.defaultFontFamily,
            parseHTML: element =>
              element.style.fontFamily?.replace(/['"]+/g, '') || this.options.defaultFontFamily,
            renderHTML: attributes => {
              if (!attributes.blockFontFamily) {
                return {};
              }

              return {
                style: `font-family: ${attributes.blockFontFamily}`,
              };
            },
          },
        },
      },
      {
        types: this.options.fontSizeTypes,
        attributes: {
          // Named blockFontSize to avoid colliding with the inline FontSize
          // mark's `fontSize` attribute on textStyle.
          blockFontSize: {
            default: this.options.defaultFontSize,
            parseHTML: element =>
              element.style.fontSize?.replace(/['"]+/g, '') || this.options.defaultFontSize,
            renderHTML: attributes => {
              if (!attributes.blockFontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.blockFontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});
