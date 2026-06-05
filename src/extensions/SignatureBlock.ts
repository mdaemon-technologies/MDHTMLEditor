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
        // Higher priority than the generic div->paragraph rule used when
        // forced_root_block is 'div', so the signature wrapper still matches.
        tag: 'div[id="signature"]',
        priority: 100,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});
