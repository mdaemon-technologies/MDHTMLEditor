/**
 * SignatureBlock Extension
 * Preserves <div id="signature"> elements through the editor's parse/serialize cycle.
 * This allows email signature replacement logic to locate and swap signatures
 * via querySelector("#signature").
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const SignatureBlock = Node.create({
  name: 'signatureBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      id: {
        default: 'signature',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[id="signature"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});
