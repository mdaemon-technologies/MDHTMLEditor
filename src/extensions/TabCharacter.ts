/**
 * TabCharacter Extension
 *
 * A tab typed in a line of text, as a word processor inserts one. It is an
 * inline atom rendered as `<span style="white-space: pre;">\t</span>` (see
 * utils/tabSpan): a bare `\t` would collapse to a space in exported HTML and on
 * import, while the span keeps a tab with real tab stops in mail clients and
 * other consumers that do not load the editor's stylesheet. Being one node, it
 * is also one character to the caret: a single Backspace or Delete removes it.
 *
 * BlockIndent's Tab key inserts it through `insertTab` when the caret is in a
 * paragraph or heading; lists, code blocks and tables keep their own Tab.
 *
 * A `\t` that reaches a line of text any other way becomes a tab node too, so
 * it cannot be exported as collapsible text: a tab inside a run that keeps its
 * whitespace (Google Docs writes `white-space: pre-wrap` runs with the tab
 * inline), several tabs in one span (Apple Mail), plain text pasted with tabs,
 * or a code block turned into a paragraph. A code block keeps its tabs as text,
 * including those of a line turned into one.
 */

import { Node, combineTransactionSteps, getChangedRanges } from '@tiptap/core';
import type { Mark, Node as PMNode, NodeType } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { ReplaceAroundStep, ReplaceStep } from '@tiptap/pm/transform';
import { isBareTabSpan } from '../utils/tabSpan';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tabCharacter: {
      /** Replace the selection with a tab, keeping the marks (font, color) at the caret. */
      insertTab: () => ReturnType;
    };
  }
}

/**
 * Replace each `\t` in the textblocks between `from` and `to` with a tab node
 * carrying the same marks, wherever the textblock can hold one. A code block
 * cannot (its content is text), so its tabs stay text. A textblock the range
 * touches is read whole: a block-type change (code block to paragraph) only
 * marks the block's edges as changed.
 */
function tabsToNodes(tr: Transaction, type: NodeType, from: number, to: number): void {
  const tabs: { pos: number; marks: readonly Mark[] }[] = [];
  tr.doc.nodesBetween(from, to, (block, blockPos) => {
    if (!block.isTextblock) return true;
    if (!block.textContent.includes('\t')) return false;
    block.forEach((node, offset, index) => {
      const text = node.text ?? '';
      if (!text.includes('\t') || !block.canReplaceWith(index, index + 1, type)) return;
      for (let i = text.indexOf('\t'); i >= 0; i = text.indexOf('\t', i + 1)) {
        tabs.push({ pos: blockPos + 1 + offset + i, marks: node.marks });
      }
    });
    return false;
  });
  // A character for a one-position node: no position moves.
  for (const { pos, marks } of tabs) {
    tr.replaceWith(pos, pos + 1, type.create(null, null, marks));
  }
}

/**
 * True when a step may have brought a `\t` into a line of text: it inserts one,
 * or changes a block around its content (a code block made a paragraph). Lets
 * the plugin skip ordinary typing without reading the blocks.
 */
function mayAddTabText(transactions: readonly Transaction[]): boolean {
  return transactions.some((transaction) =>
    transaction.steps.some(
      (step) =>
        step instanceof ReplaceAroundStep ||
        (step instanceof ReplaceStep && step.slice.content.textBetween(0, step.slice.content.size).includes('\t')),
    ),
  );
}

/**
 * Where, in the document after `transactions`, a tab was removed from a line
 * that has since become a code block. Changing a line's type removes the
 * inline nodes the new type cannot hold, one single-node step each
 * (setBlockType's clearIncompatible); a code block holds a tab as the `\t`
 * text it is put back as. A tab deleted from a line that stays a line is gone.
 */
function tabsClearedIntoCode(transactions: readonly Transaction[], type: NodeType, doc: PMNode): number[] {
  const positions: number[] = [];
  transactions.forEach((transaction, t) => {
    transaction.steps.forEach((step, i) => {
      if (!(step instanceof ReplaceStep) || step.slice.size || step.to !== step.from + 1) return;
      if (transaction.docs[i].nodeAt(step.from)?.type !== type) return;
      let pos = transaction.mapping.slice(i + 1).map(step.from);
      for (const later of transactions.slice(t + 1)) pos = later.mapping.map(pos);
      if (doc.resolve(pos).parent.type.spec.code) positions.push(pos);
    });
  });
  return positions;
}

export const TabCharacter = Node.create({
  name: 'tabCharacter',

  inline: true,

  group: 'inline',

  atom: true,

  // Moved over like a character, never selected as an object.
  selectable: false,

  parseHTML() {
    // The span this node writes, styled by nothing but its white-space, ahead
    // of TextStyle's span[style] rule (priority 50), which would otherwise wrap
    // the tab in an empty <span> mark. Any other tab span is left to TextStyle,
    // which turns its font into a mark on the text, and the tab in that text
    // becomes a node (see tabsToNodes) with the font still on it. Not in a
    // <pre>: a code block holds only text, so there the tab stays a `\t`.
    const isBareTab = (element: HTMLElement): boolean => isBareTabSpan(element) && !element.closest('pre');
    return [
      {
        tag: 'span',
        priority: 60,
        getAttrs: (element) => (isBareTab(element) && element.textContent === '\t' ? null : false),
      },
      {
        // Several tabs in one bare span: read its tabs as text (the span's
        // white-space keeps them) without the empty mark.
        tag: 'span',
        priority: 60,
        skip: true,
        getAttrs: (element) => (isBareTab(element) ? null : false),
      },
    ];
  },

  // Only the tab's own style: whatever else the span carried is not kept.
  renderHTML() {
    return ['span', { style: 'white-space: pre;' }, '\t'];
  },

  renderText() {
    return '\t';
  },

  addCommands() {
    return {
      insertTab:
        () =>
        ({ tr, dispatch }) => {
          const { $from, $to } = tr.selection;
          if (!$from.sameParent($to) || !$from.parent.canReplaceWith($from.index(), $to.index(), this.type)) {
            return false;
          }
          if (dispatch) {
            tr.replaceSelectionWith(this.type.create(), true).scrollIntoView();
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    // Removes the tab next to the caret. The stock Backspace / Delete handlers
    // only act at the edges of a block, so mid-line they leave the key to the
    // browser; handling it here makes a tab one key press wherever it is.
    const deleteTab = (forward: boolean): boolean => {
      const { selection } = this.editor.state;
      if (!selection.empty) return false;
      const { $from } = selection;
      const node = forward ? $from.nodeAfter : $from.nodeBefore;
      if (node?.type !== this.type) return false;
      const from = forward ? $from.pos : $from.pos - node.nodeSize;
      return this.editor.commands.deleteRange({ from, to: from + node.nodeSize });
    };

    return {
      Backspace: () => deleteTab(false),
      // The stock keymap treats Shift+Backspace as Backspace.
      'Shift-Backspace': () => deleteTab(false),
      Delete: () => deleteTab(true),
    };
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        // Every change, whatever made it: only the ranges it touched are read.
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          const tr = newState.tr;
          if (mayAddTabText(transactions)) {
            getChangedRanges(combineTransactionSteps(oldState.doc, [...transactions])).forEach(({ newRange }) =>
              tabsToNodes(tr, type, newRange.from, newRange.to),
            );
          }
          // After tabsToNodes, which moves no position; last first, so each
          // insert leaves the positions before it alone.
          tabsClearedIntoCode(transactions, type, newState.doc)
            .sort((a, b) => b - a)
            .forEach((pos) => tr.insert(pos, newState.schema.text('\t')));
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },

  // Content given to the editor when it is created arrives without a
  // transaction, so the plugin above never sees it. Not an edit: it neither
  // enters the undo history nor emits `update`.
  onCreate() {
    const tr = this.editor.state.tr;
    tabsToNodes(tr, this.type, 0, tr.doc.content.size);
    if (tr.docChanged) {
      this.editor.view.dispatch(tr.setMeta('addToHistory', false).setMeta('preventUpdate', true));
    }
  },
});
