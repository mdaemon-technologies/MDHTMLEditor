/**
 * Mention Extension
 * Handles inline @mention spans as atomic, non-editable nodes.
 * Parses and renders <span class="composer-mention" contenteditable="false" data-jid="..." data-display="...">@Display</span>
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const Mention = Node.create({
  name: 'mention',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: true,

  draggable: false,

  addAttributes() {
    return {
      jid: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-jid'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.jid) return {};
          return { 'data-jid': attributes.jid };
        },
      },
      display: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-display'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.display) return {};
          return { 'data-display': attributes.display };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.composer-mention',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          class: 'composer-mention',
          contenteditable: 'false',
        },
        HTMLAttributes
      ),
      `@${node.attrs.display}`,
    ];
  },
});
