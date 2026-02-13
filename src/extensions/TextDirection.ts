/**
 * TextDirection Extension
 * Adds LTR/RTL text direction support
 */

import { Extension } from '@tiptap/core';

export interface TextDirectionOptions {
  types: string[];
  defaultDirection: 'ltr' | 'rtl';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textDirection: {
      /**
       * Set the text direction
       */
      setTextDirection: (direction: 'ltr' | 'rtl' | 'auto') => ReturnType;
      /**
       * Unset the text direction
       */
      unsetTextDirection: () => ReturnType;
    };
  }
}

export const TextDirection = Extension.create<TextDirectionOptions>({
  name: 'textDirection',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote', 'listItem'],
      defaultDirection: 'ltr',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null,
            parseHTML: element => element.getAttribute('dir'),
            renderHTML: attributes => {
              if (!attributes.dir) {
                return {};
              }

              return {
                dir: attributes.dir,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (direction: 'ltr' | 'rtl' | 'auto') =>
        ({ commands }) => {
          return this.options.types.every(type =>
            commands.updateAttributes(type, { dir: direction })
          );
        },
      unsetTextDirection:
        () =>
        ({ commands }) => {
          return this.options.types.every(type =>
            commands.resetAttributes(type, 'dir')
          );
        },
    };
  },
});
