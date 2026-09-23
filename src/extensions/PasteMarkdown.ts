/**
 * PasteMarkdown Extension
 *
 * While the mode is on, a paste is read as Markdown and inserted as formatting.
 * It reads the clipboard's `text/plain` and ignores its `text/html`: editors and
 * code viewers put syntax-highlighted HTML on the clipboard next to the raw text,
 * and converting that would paste coloured code rather than formatted Markdown.
 */

import { Extension } from '@tiptap/core';
import { DOMParser, Slice } from '@tiptap/pm/model'; // shadows the global DOMParser in this file
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { markdownToDom } from '../utils/markdownToDom';

export interface PasteMarkdownOptions {
  /** Read on every paste. HTMLEditor passes `() => this.pasteMarkdownEnabled`. */
  isEnabled: () => boolean;
}

/**
 * Whether a slice carries anything worth inserting: text, a leaf such as an
 * image, horizontal rule or hard break, or a node that is meaningful while
 * empty (an empty code block or table is still a code block or a table).
 * A bare empty paragraph is not — that is what a dropped node leaves behind.
 */
function hasContent(slice: Slice): boolean {
  let found = false;
  slice.content.descendants((node) => {
    if (found) return false;
    found = node.isText
      ? !!node.text?.trim()
      : node.isLeaf || !!node.type.spec.code || node.type.name === 'table';
    return !found;
  });
  return found;
}

/**
 * Convert and insert, returning the inserted slice, or null to let the paste go
 * through unconverted.
 */
function insertMarkdown(view: EditorView, text: string): Slice | null {
  // A read-only editor takes no paste. prosemirror-view already gates its own
  // paste handling on this, but the toolbar button calls in here directly.
  if (!view.editable) return null;

  const { $from } = view.state.selection;
  // In a code block the Markdown is the content, so leave it as typed. This is
  // the same test prosemirror-view uses, so it does not depend on the code-block
  // node's name.
  if ($from.parent.type.spec.code || !text.trim()) return null;

  // The nodes come from an inert document and are handed to the parser as nodes.
  // Never route this through `innerHTML` in the live page.
  const dom = markdownToDom(text);
  if (!dom) return null; // too large or too expensive to convert

  const parser =
    view.someProp('clipboardParser') || view.someProp('domParser') || DOMParser.fromSchema(view.state.schema);
  // An open slice, so a one-line paste merges into the current block instead of
  // splitting it. `preserveWhitespace: false` because marked puts newlines
  // between block tags; code blocks keep theirs through their own parse rule.
  const parsed = parser.parseSlice(dom, { preserveWhitespace: false, context: $from });
  // parseSlice opens into isolating nodes, which would pull the text after the
  // caret into a pasted table's last cell. Reopen without them, as
  // prosemirror-view does.
  // Deliberately no `uiEvent: 'paste'` meta on the transaction below: that is
  // what TipTap's paste rules key off, and re-scanning already-converted text
  // would turn marked's literal `*not italic*` back into emphasis.
  const slice = Slice.maxOpen(parsed.content, false);
  // Nothing survived the schema — an image pasted into the basic editor, which
  // has no image node, converts to a single empty paragraph. Replacing the
  // selection with that would delete what is selected and put nothing back, so
  // let the paste go through unconverted instead.
  if (!hasContent(slice)) return null;
  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
  return slice;
}

/**
 * Convert `text` as Markdown and insert it, reporting whether it was converted.
 * Used by the toolbar's paste button, which has no clipboard event of its own.
 */
export function pasteMarkdownText(view: EditorView, text: string): boolean {
  return insertMarkdown(view, text) !== null;
}

export const PasteMarkdown = Extension.create<PasteMarkdownOptions>({
  name: 'pasteMarkdown',

  /**
   * Above CodeBlock (100), below Link (1000).
   *
   * ProseMirror stops at the first paste handler that claims the paste.
   * CodeBlock claims any paste carrying VS Code's `vscode-editor-data` flag and
   * wraps it in a code block, which is exactly what copying Markdown out of an
   * editor looks like — so at equal priority the code block would win and the
   * mode would do nothing for its most common source. Link still goes first, so
   * a URL pasted over a selection keeps turning that selection into a link.
   */
  priority: 500,

  addOptions() {
    return {
      isEnabled: () => false,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('pasteMarkdown'),
        props: {
          // Arrow function so `this` stays the extension context.
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            if (!this.options.isEnabled() || !data) return false;
            // Let image paste and uploads run untouched.
            if (data.files.length > 0 || data.types.includes('Files')) return false;

            const slice = insertMarkdown(view, data.getData('text/plain'));
            if (!slice) return false;

            // Claiming the paste means TipTap's own paste handler never runs, so
            // emit its event here; hosts listening through getTipTap() still hear
            // about every paste, with the content that was actually inserted.
            editor.emit('paste', { editor, event, slice });
            return true;
          },
        },
      }),
    ];
  },
});
