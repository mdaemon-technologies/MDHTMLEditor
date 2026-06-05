/**
 * Anchor Extension
 * Named anchors — <a id="name"> targets with no href — for in-page linking.
 * CKEditor parity for the link/anchor plugin. Rendered as an inline atom so
 * the (empty) anchor survives the editor's parse/serialize cycle.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface AnchorOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    anchor: {
      /** Insert a named anchor at the cursor. */
      setAnchor: (name: string) => ReturnType;
    };
  }
}

export const Anchor = Node.create<AnchorOptions>({
  name: 'anchor',

  inline: true,

  group: 'inline',

  atom: true,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: { class: 'md-anchor' },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('id'),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.id ? { id: attributes.id } : {},
      },
      name: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('name'),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.name ? { name: attributes.name } : {},
      },
    };
  },

  parseHTML() {
    // Match anchors that carry an id but no href (named anchors, not links).
    return [{ tag: 'a[id]:not([href])', priority: 60 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setAnchor:
        (name: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { id: name, name } }),
    };
  },
});
