/**
 * BlockFontStyle Extension
 *
 * Inlines the DEFAULT font-family and font-size onto block elements
 * (<p>/<div>/<hN>) so exported HTML carries the base font on the block itself,
 * instead of relying on the editor's container CSS being present on the
 * receiving end (e.g. an email body rendered in another client).
 *
 * It provides the *defaults*, plus `setBlockFontFamily`/`setBlockFontSize`
 * commands that rewrite those block attributes for the blocks touched by the
 * selection. Per-selection font changes over existing text are still handled by
 * the inline mark extensions (FontSize and TipTap's FontFamily, which produce
 * <span style="…">), and those spans override the block default for the text
 * they wrap. So a single paragraph can still mix sizes/fonts (e.g. "this is
 * A BIG font, and this is a small font").
 *
 * The block commands exist because an inline mark cannot represent "the font
 * the user will type in next" when there is nothing to mark yet: with a
 * collapsed cursor, setMark only parks a stored mark on the selection, and
 * ProseMirror drops stored marks on the next transaction that moves the
 * selection. Writing the block attribute instead makes the choice persistent.
 * HTMLEditor routes font changes to these commands when the cursor sits in an
 * empty block.
 *
 * Notes:
 * - font-family defaults are applied to paragraphs AND headings (harmless to
 *   heading sizing).
 * - font-size defaults are applied to paragraphs only — headings derive their
 *   size from their level (h1=2em, h2=1.5em, …) and a forced default would
 *   clobber that.
 */

import { Extension } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockFontStyle: {
      /**
       * Set the font-family on the block(s) in the current selection.
       */
      setBlockFontFamily: (family: string) => ReturnType;
      /**
       * Set the font-size on the block(s) in the current selection.
       */
      setBlockFontSize: (size: string) => ReturnType;
    };
  }
}

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

/**
 * Write `attribute` onto every block of one of `types` that the selection
 * touches. A collapsed cursor counts as touching its own block, which is the
 * case that matters: it is how a font chosen in an empty paragraph is made to
 * stick.
 */
function setBlockAttribute(
  { tr, state, dispatch }: CommandProps,
  types: string[],
  attribute: string,
  value: string
): boolean {
  const { from, to } = state.selection;
  let applied = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!types.includes(node.type.name)) {
      return;
    }

    applied = true;
    if (dispatch) {
      tr.setNodeAttribute(pos, attribute, value);
    }
  });

  return applied;
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

  addCommands() {
    return {
      setBlockFontFamily:
        (family: string) =>
        (props) =>
          setBlockAttribute(props, this.options.fontFamilyTypes, 'blockFontFamily', family),

      setBlockFontSize:
        (size: string) =>
        (props) =>
          setBlockAttribute(props, this.options.fontSizeTypes, 'blockFontSize', size),
    };
  },
});
