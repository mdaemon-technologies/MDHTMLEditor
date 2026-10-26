/**
 * MarkedQuote Extension
 * The editor's blockquote node, extended to keep the class a host uses to mark
 * a reply's quoted original (the `quote_marker_class` option, `markerClass`
 * here). The host finds the quote again by that class in getContent(), so it
 * has to survive the editor's parse/serialize cycle the way div#signature does
 * (see SignatureBlock). With no marker configured this is TipTap's Blockquote.
 *
 * Editor content renders in the host page, not in an iframe as in TinyMCE or
 * CKEditor, so a class, id, data-* or style from an email could reach the host
 * app's CSS and scripts. Only an exact-value allowlist is kept:
 * - `class` exactly the marker on a <blockquote> or <div>;
 * - on such an element, the box properties in QUOTE_STYLE_RULES whose values
 *   match their pattern.
 * Everything else is dropped, as on any other blockquote.
 *
 * A marked <div> becomes a blockquote node that renders back as a <div>, so
 * editing inside either form is editing inside a blockquote: the toolbar
 * button, TipTap's Backspace handling and TextDirection's dir all apply.
 */

import { mergeAttributes } from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import type { BlockquoteOptions } from '@tiptap/extension-blockquote';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node as PMNode, NodeType } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { isMarkedQuote, normalizeQuoteMarkerClass } from '../utils/markedQuote';

export interface MarkedQuoteOptions extends BlockquoteOptions {
  /** The class that marks a reply's quoted original; null turns marking off. */
  markerClass: string | null;
}

const LENGTH = /^(0|\d+(\.\d+)?(px|pt|em))$/;
const BORDER_STYLE = /^(none|solid|dashed|dotted|double)$/;
// A color name, but not a CSS-wide keyword, which is not a color.
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?(\s*,\s*[\d.]+%?){2,3}\s*\)|(?!(inherit|initial|unset|revert|revert-layer)$)[a-z]+)$/i;

/**
 * The style a marked quote may keep: its box
 * (`PADDING-LEFT: 5px; MARGIN-LEFT: 5px; BORDER-LEFT: #000000 2px solid`).
 * Values are read through the CSSOM, so they are already parsed and
 * normalized, and then matched: no url(), calc(), var() or negative length.
 */
const QUOTE_STYLE_RULES: Array<[string, RegExp]> = ['top', 'right', 'bottom', 'left'].flatMap(
  (side): Array<[string, RegExp]> => [
    [`margin-${side}`, LENGTH],
    [`padding-${side}`, LENGTH],
    [`border-${side}-width`, LENGTH],
    [`border-${side}-style`, BORDER_STYLE],
    [`border-${side}-color`, COLOR],
  ]
);

/** The allowed part of a marked quote's style, or null when nothing is allowed. */
function quoteStyle(element: HTMLElement): string | null {
  const kept = element.ownerDocument.createElement('div').style;
  for (const [property, allowed] of QUOTE_STYLE_RULES) {
    const value = element.style.getPropertyValue(property).trim();
    if (value && allowed.test(value)) kept.setProperty(property, value);
  }
  return kept.cssText || null;
}

/** True when `fragment` holds a marked quote of `type` at any depth. */
function holdsMarkedQuote(fragment: Fragment, type: NodeType): boolean {
  let found = false;
  fragment.descendants((node) => {
    if (node.type === type && node.attrs.marked) found = true;
    return !found;
  });
  return found;
}

/**
 * True when `doc` holds a marked quote of `type` that is not wholly inside
 * `from`–`to`: one that survives replacing that range.
 */
function holdsMarkedQuoteOutside(doc: PMNode, from: number, to: number, type: NodeType): boolean {
  let found = false;
  doc.descendants((node, pos) => {
    if (node.type === type && node.attrs.marked && (pos < from || pos + node.nodeSize > to)) found = true;
    return !found;
  });
  return found;
}

/** `node` with `content`, made a plain blockquote if it is a marked quote of `type`. */
function withContent(node: PMNode, content: Fragment, type: NodeType): PMNode {
  return node.type === type && node.attrs.marked
    ? type.create({ ...node.attrs, marked: false, quoteTag: 'blockquote', quoteStyle: null }, content, node.marks)
    : node.copy(content);
}

/**
 * `fragment` with every marked quote of `type` made a plain blockquote, at any
 * depth, so nested quotes are unmarked too.
 */
function unmarkQuotes(fragment: Fragment, type: NodeType): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    nodes.push(node.isText ? node : withContent(node, unmarkQuotes(node.content, type), type));
  });
  return Fragment.fromArray(nodes);
}

/**
 * `fragment` with the marked quotes on its open edges made plain: the ones a
 * slice only opens into, because it holds part of them. A quote the slice
 * holds whole keeps its marker.
 */
function unmarkOpenEdges(fragment: Fragment, openStart: number, openEnd: number, type: NodeType): Fragment {
  const last = fragment.childCount - 1;
  const nodes: PMNode[] = [];
  fragment.forEach((node, _offset, index) => {
    const start = index === 0 ? openStart : 0;
    const end = index === last ? openEnd : 0;
    if (node.isText || (!start && !end)) {
      nodes.push(node);
      return;
    }
    const content = unmarkOpenEdges(node.content, Math.max(start - 1, 0), Math.max(end - 1, 0), type);
    nodes.push(withContent(node, content, type));
  });
  return Fragment.fromArray(nodes);
}

export const MarkedQuote = Blockquote.extend<MarkedQuoteOptions>({
  addOptions() {
    return {
      ...(this.parent?.() as BlockquoteOptions),
      markerClass: null,
    };
  },

  parseHTML() {
    const markerClass = normalizeQuoteMarkerClass(this.options.markerClass);
    const rules = this.parent?.() ?? [];
    if (!markerClass) return rules;
    return [
      ...rules,
      {
        // Higher priority than the generic div->paragraph rule used when
        // forced_root_block is 'div'. getAttrs, not a div.<marker> selector,
        // because a selector matches the class by token.
        tag: 'div[class]',
        priority: 100,
        getAttrs: (element: HTMLElement) => (isMarkedQuote(element, markerClass) ? null : false),
      },
    ];
  },

  addAttributes() {
    const markerClass = normalizeQuoteMarkerClass(this.options.markerClass);
    return {
      ...this.parent?.(),
      marked: {
        default: false,
        rendered: false,
        parseHTML: (element: HTMLElement) => isMarkedQuote(element, markerClass),
      },
      quoteTag: {
        default: 'blockquote',
        rendered: false,
        parseHTML: (element: HTMLElement) => (element.tagName === 'DIV' ? 'div' : 'blockquote'),
      },
      quoteStyle: {
        default: null,
        parseHTML: (element: HTMLElement) => (isMarkedQuote(element, markerClass) ? quoteStyle(element) : null),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.quoteStyle ? { style: attributes.quoteStyle } : {},
      },
    };
  },

  addProseMirrorPlugins() {
    if (!normalizeQuoteMarkerClass(this.options.markerClass)) return [];
    const type = this.type;
    // Set by handleDrop when a drag within the editor copies a marked quote,
    // and acted on by appendTransaction once the drop is applied.
    let copiedQuote = false;

    // The marker means "the quoted original that was loaded", and a second
    // marked quote before the real one would be found first.
    return [
      new Plugin({
        key: new PluginKey('markedQuotePaste'),
        props: {
          transformPasted: (slice, view) => {
            if (!holdsMarkedQuote(slice.content, type)) return slice;
            // A drag within this editor: part of a quote dragged out of it is
            // not the original, though the quote's wrapper comes with it. A
            // whole quote is, if it moves; whether it does is only known at
            // drop time (handleDrop).
            if (view.dragging) {
              return new Slice(unmarkOpenEdges(slice.content, slice.openStart, slice.openEnd, type), slice.openStart, slice.openEnd);
            }
            // A paste is unmarked while a marked quote stays in the document
            // beside it. With none outside what the paste replaces, the
            // original was cut to be moved, or is being pasted over.
            const { from, to } = view.state.selection;
            return holdsMarkedQuoteOutside(view.state.doc, from, to, type)
              ? new Slice(unmarkQuotes(slice.content, type), slice.openStart, slice.openEnd)
              : slice;
          },
          handleDrop: (view, _event, slice, moved) => {
            copiedQuote = !!view.dragging && !moved && holdsMarkedQuote(slice.content, type);
            return false;
          },
        },
        // A copy of the quote dropped within the editor: unmark what was
        // dropped, which ProseMirror leaves selected.
        appendTransaction: (transactions, _oldState, newState) => {
          if (!copiedQuote || !transactions.some((tr) => tr.getMeta('uiEvent') === 'drop')) return null;
          copiedQuote = false;
          const { from, to } = newState.selection;
          const tr = newState.tr;
          newState.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type === type && node.attrs.marked) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, marked: false, quoteTag: 'blockquote', quoteStyle: null });
            }
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    const markerClass = normalizeQuoteMarkerClass(this.options.markerClass);
    // Only a marked quote keeps the div form: unmarked, a div would import
    // again as ordinary lines.
    if (!node.attrs.marked || !markerClass) return ['blockquote', attrs, 0];
    // class first, so a plain substring search for `<blockquote class="<marker>`
    // finds the quote; TextDirection's dir would otherwise be written before
    // it. Exactly the marker, as on input.
    delete attrs.class;
    // Only the two tags a marked quote is parsed from, whatever the attribute holds.
    const tag = node.attrs.quoteTag === 'div' ? 'div' : 'blockquote';
    return [tag, { class: markerClass, ...attrs }, 0];
  },
});
