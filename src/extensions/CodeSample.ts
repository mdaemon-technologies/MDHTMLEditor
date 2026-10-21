/**
 * CodeSample Extension
 * Toggles a code block on the lines the selection touches.
 *
 * A line break inside a paragraph (Shift+Enter, or a loaded `<br>`) looks like
 * a new line, but the lines on either side are one paragraph, and CodeBlock's
 * `toggleCodeBlock()` converts the whole paragraph. Here the paragraph is
 * split at the line breaks around the selection first, and only the middle
 * part becomes a code block. Everything else (turning a code block back into
 * text, a selection across blocks, a paragraph without line breaks) is left to
 * `toggleCodeBlock()`.
 */

import { Extension } from '@tiptap/core';
import { Fragment, type Node as PMNode, type NodeType } from '@tiptap/pm/model';
import { TextSelection, type EditorState } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeSample: {
      /**
       * Toggle a code block on the lines the selection touches, leaving the
       * other lines of a paragraph with line breaks as text
       */
      toggleCodeSample: () => ReturnType;
    };
  }
}

interface LineRange {
  /**
   * Offsets in the textblock of the line break before the selection and of
   * each line break directly before it, latest first. Empty if none.
   */
  before: number[];
  /** Offset in the textblock of the first line break at or after the selection end, if any. */
  after: number | null;
}

/**
 * The line breaks around the selection, when the selection lies in one
 * textblock that has a line break before or after it and the lines it touches
 * can become a code block where they are. Otherwise null.
 */
function findLineRange(state: EditorState, codeBlock: NodeType): LineRange | null {
  const { $from, $to } = state.selection;
  const block = $from.parent;
  const linebreak = state.schema.linebreakReplacement;

  if (!linebreak || !$from.sameParent($to) || !block.isTextblock || block.type.spec.code) {
    return null;
  }

  // A selection that starts right before a line break (dragging from past the
  // end of a line) touches none of that line, and one that ends right after a
  // line break (dragging or Shift+Down to the start of the next line) touches
  // none of the next line, so those lines are left out. A selection of just a
  // line break keeps both lines.
  let start = $from.parentOffset;
  let end = $to.parentOffset;
  if (!state.selection.empty) {
    if (block.childAfter(start).node?.type === linebreak) start += 1;
    if (block.childBefore(end).node?.type === linebreak) end -= 1;
    if (start > end) {
      start = $from.parentOffset;
      end = $to.parentOffset;
    }
  }

  let last = -1;
  let after: number | null = null;
  block.forEach((child, offset) => {
    if (child.type !== linebreak) return;
    if (offset < start) {
      last = offset;
    } else if (after === null && offset >= end) {
      after = offset;
    }
  });

  // A textblock ending in a line break shows that last empty line in the
  // editor but not in a browser, so the text before the code block must not
  // end in one: each line break directly before the last one is split at too,
  // which turns the empty lines above the code block into empty textblocks.
  const before: number[] = [];
  for (let offset = last; offset >= 0; offset -= 1) {
    if (block.childAfter(offset).node?.type !== linebreak) break;
    before.push(offset);
  }

  if (before.length === 0 && after === null) return null;

  // The split result must fit the container: a list item, for one, must start
  // with a paragraph, so its first line can't become a code block there.
  const parts: PMNode[] = [];
  before.forEach(() => parts.push(block.type.create()));
  parts.push(codeBlock.create());
  if (after !== null) parts.push(block.type.create());
  const container = $from.node(-1);
  const index = $from.index(-1);
  if (!container.canReplace(index, index + 1, Fragment.fromArray(parts))) return null;

  return { before, after };
}

export const CodeSample = Extension.create({
  name: 'codeSample',

  // CodeBlock binds Mod-Alt-c to toggleCodeBlock() at the default priority
  // (100); the higher priority makes this binding run first.
  priority: 101,

  addCommands() {
    return {
      toggleCodeSample:
        () =>
        ({ state, tr, dispatch, commands }) => {
          const codeBlock = state.schema.nodes.codeBlock;
          if (!codeBlock) return false;

          const range = findLineRange(state, codeBlock);
          if (!range) return commands.toggleCodeBlock();

          if (dispatch) {
            const { $from, anchor, head } = state.selection;
            const blockStart = $from.start();
            const { before, after } = range;

            // Split from the later break to the earlier ones so positions stay
            // valid. Each split copies the textblock, attributes included.
            for (const offset of after === null ? before : [after, ...before]) {
              tr.delete(blockStart + offset, blockStart + offset + 1).split(blockStart + offset);
            }

            // Each split before the middle part moves it one position on (a
            // removed break, then a closing and an opening token).
            const shift = before.length;
            const lineStart = blockStart + (before.length === 0 ? 0 : before[0] + 1) + shift;
            const lineEnd = blockStart + (after === null ? $from.parent.content.size : after) + shift;

            // linebreakReplacement makes setBlockType turn the line breaks
            // inside the code block into newlines, but it also removes inline
            // nodes a code block can't hold (a mention, say), so the selection
            // is mapped through its steps. An end of the selection on a line
            // that was left out moves to the nearer edge of the code block.
            const steps = tr.steps.length;
            tr.setBlockType(lineStart, lineEnd, codeBlock);
            const map = tr.mapping.slice(steps);
            const place = (pos: number) =>
              map.map(Math.min(Math.max(pos + shift, lineStart), lineEnd));
            tr.setSelection(TextSelection.create(tr.doc, place(anchor), place(head)));
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.toggleCodeSample(),
    };
  },
});
