/**
 * PasteAsText Extension
 *
 * TinyMCE's "Paste as text": while the mode is on, a paste inserts the
 * clipboard's plain text with none of its formatting. As in TinyMCE, each pair
 * of line breaks starts a new paragraph and a single line break becomes a line
 * break (`<br>`), and spaces at the start of a line or in a run are kept as
 * non-breaking spaces; in a code block the text goes in as it is. The text
 * takes the formatting at the caret, as typed text would. A clipboard with HTML
 * but no plain text gives the HTML's text, its blocks and line breaks kept;
 * HTML with no text (an image, a rule) inserts nothing. A paste that is only
 * files (an image) is left to the handlers after this one, so it still uploads.
 *
 * The text is inserted here rather than through ProseMirror's own text paste,
 * whose transaction is marked as a paste: TipTap's paste rules would then turn
 * `**bold**`, `_it_`, `` `code` ``, `==mark==` and URLs into formatting.
 */

import { Extension, getTextSerializersFromSchema } from '@tiptap/core';
import { DOMParser as ProseMirrorDOMParser, Fragment, Slice } from '@tiptap/pm/model';
import type { Mark, Node as ProseMirrorNode, ResolvedPos, Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { CellSelection, handlePaste as pasteIntoCells } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';

export interface PasteAsTextOptions {
  /** Whether the mode is on; read at each paste. */
  isEnabled: () => boolean;
}

const NBSP = ' ';

/**
 * The text of a slice parsed from clipboard HTML: blocks as blank lines, line
 * breaks as line breaks, and other leaves (a tab, a mention) as the text their
 * extension gives them.
 */
function sliceText(slice: Slice, schema: Schema): string {
  const serializers = getTextSerializersFromSchema(schema);
  return slice.content.textBetween(0, slice.content.size, '\n\n', (leaf: ProseMirrorNode) => {
    if (leaf.type.name === 'hardBreak') return '\n';
    const serializer = serializers[leaf.type.name];
    if (serializer) {
      return serializer({ node: leaf, pos: 0, parent: leaf, index: 0, range: { from: 0, to: 0 } });
    }
    const leafText = leaf.type.spec.leafText;
    return leafText ? leafText(leaf) : '';
  });
}

/** A line's spaces as TinyMCE pastes them: at the start, and in runs, non-breaking, so they don't collapse. */
function keepSpaces(line: string): string {
  return line
    .replace(/^ +/, (spaces) => NBSP.repeat(spaces.length))
    .replace(/ {2,}/g, (spaces) => NBSP.repeat(spaces.length - 1) + ' ');
}

/**
 * The text as content for `$pos`, in `marks`: in a code block, the text
 * itself; elsewhere, as TinyMCE pastes text, a paragraph at each pair of line
 * breaks and a line break at a single one. Open at both ends, so the first and
 * last lines join the text around the paste. Null for text that is only line
 * breaks.
 */
function textSlice(text: string, $pos: ResolvedPos, schema: Schema, marks: readonly Mark[]): Slice | null {
  const normalized = text.replace(/\r\n?/g, '\n');
  if ($pos.parent.type.spec.code) {
    return normalized ? new Slice(Fragment.from(schema.text(normalized)), 0, 0) : null;
  }

  const { paragraph, hardBreak } = schema.nodes;
  const blocks = normalized.split('\n\n');
  // Blank lines before the first text or after the last start no paragraph.
  while (blocks.length && !blocks[0]) blocks.shift();
  while (blocks.length && !blocks[blocks.length - 1]) blocks.pop();
  if (blocks.length === 0) return null;

  const paragraphs = blocks.map((block) => {
    const inline: ProseMirrorNode[] = [];
    block.split('\n').forEach((line, index) => {
      if (index > 0) inline.push(hardBreak ? hardBreak.create(null, null, marks) : schema.text(' ', marks));
      if (line) inline.push(schema.text(keepSpaces(line), marks));
    });
    return paragraph.create(null, inline);
  });
  return new Slice(Fragment.from(paragraphs), 1, 1);
}

/**
 * The marks pasted text takes, as typed text would: those turned on at the
 * caret, those of a selection it replaces, or the caret's; except a link the
 * caret is at the end of, which the paste must not lengthen.
 */
function caretMarks(state: EditorState): readonly Mark[] {
  const { selection } = state;
  const { $from } = selection;
  const marks = state.storedMarks
    ?? (selection.empty ? $from.marks() : $from.marksAcross(selection.$to) ?? $from.marks());
  const after = $from.nodeAfter?.marks ?? [];
  return marks.filter((mark) => mark.type.name !== 'link' || mark.isInSet(after));
}

/**
 * The text of clipboard HTML, read as the editor reads HTML (script and style
 * left out), its blocks as blank lines and line breaks as line breaks.
 */
export function clipboardHtmlText(html: string, schema: Schema): string {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return sliceText(ProseMirrorDOMParser.fromSchema(schema).parseSlice(body), schema);
}

/**
 * Insert text at the selection as paste-as-text does: paragraphs and line
 * breaks as TinyMCE makes them, in the caret's formatting, and nothing else
 * turned into formatting. Returns the slice inserted, or null for text with
 * nothing to insert.
 */
export function pastePlainText(view: EditorView, text: string): Slice | null {
  if (!view.editable) return null;
  const { state } = view;
  // Text over a cell selection takes no caret's marks: it fills every cell.
  const cells = state.selection instanceof CellSelection;
  const slice = textSlice(text, state.selection.$from, state.schema, cells ? [] : caretMarks(state));
  if (!slice) return null;
  // Over a cell selection, the tables' own paste puts the text in every
  // selected cell (a plain replace would empty all but one).
  if (cells && pasteIntoCells(view, new ClipboardEvent('paste'), slice)) return slice;
  // Marked a paste, but not as a paste UI event, which would run the paste
  // rules; and no autolinking of the URLs in the text either.
  view.dispatch(
    view.state.tr.replaceSelection(slice).scrollIntoView().setMeta('paste', true).setMeta('preventAutolink', true),
  );
  return slice;
}

export const PasteAsText = Extension.create<PasteAsTextOptions>({
  name: 'pasteAsText',

  /**
   * Above every other paste handler: PasteMarkdown (500), the code block's rule
   * that turns a paste from a code editor into a code block, the tables' cell
   * paste (which pastePlainText calls itself for a cell selection), and Link
   * (1000), which links a URL pasted over a selection. In this mode a paste is
   * never converted or linked, as in TinyMCE, whose plain-text paste skips its
   * smart paste.
   */
  priority: 1100,

  addOptions() {
    return {
      isEnabled: () => false,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('pasteAsText'),
        props: {
          // Arrow function so `this` stays the extension context.
          handlePaste: (view, event, parsed) => {
            const data = event.clipboardData;
            if (!this.options.isEnabled() || !data) return false;

            // The plain text, or else the text of the clipboard HTML as
            // ProseMirror read it (`parsed`, script and style left out).
            const plain = data.getData('text/plain');
            const text = plain.trim() ? plain : sliceText(parsed, view.state.schema);
            if (!text.trim()) {
              // Only a file (an image): let image paste and uploads run untouched.
              if (!data.getData('text/html')) return false;
              // HTML with no text (a rule, or a copied image, whose file beside
              // it HTMLEditor's image paste uploads): nothing of it goes in.
              return true;
            }

            // Text beside a file (cells copied from a spreadsheet carry a picture
            // of themselves) is pasted as text; HTMLEditor's image paste leaves
            // it alone too.
            const slice = pastePlainText(view, text);
            if (!slice) return false;
            // Claiming the paste means TipTap's own paste handler never runs, so
            // emit its event here, with the user's paste, as PasteMarkdown does.
            editor.emit('paste', { editor, event, slice });
            return true;
          },
        },
      }),
    ];
  },
});
