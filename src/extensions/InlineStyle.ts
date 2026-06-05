/**
 * InlineStyle Extension
 * Adds a passthrough `class` attribute to the textStyle mark so the Styles
 * dropdown can apply named CSS classes (CKEditor stylesSet parity for
 * class-based inline styles). Color and background are handled by the
 * existing Color / Highlight extensions; block elements by Heading / Paragraph.
 */

import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

export interface InlineStyleOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineStyle: {
      /** Apply a CSS class to the current selection via the textStyle mark. */
      setInlineClass: (className: string) => ReturnType;
      /** Remove the textStyle class. */
      unsetInlineClass: () => ReturnType;
    };
  }
}

export const InlineStyle = Extension.create<InlineStyleOptions>({
  name: 'inlineStyle',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          styleClass: {
            default: null,
            parseHTML: element => element.getAttribute('class') || null,
            renderHTML: attributes => {
              if (!attributes.styleClass) {
                return {};
              }
              return { class: attributes.styleClass };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setInlineClass:
        (className: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { styleClass: className }).run();
        },
      unsetInlineClass:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { styleClass: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});
