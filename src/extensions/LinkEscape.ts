/**
 * LinkEscape — move the caret out of a link that a paste or an insert has just
 * left it at the end of.
 *
 * The link mark is inclusive (TipTap ties inclusivity to autolink), so text
 * typed at a link's right edge joins the link. That is the browser's own
 * behavior when the caret is put at the end of a link, but pasting a URL,
 * pasting HTML that ends in a link, and inserting a link from the Link dialog
 * all leave the caret at exactly that edge, and the next words the user typed,
 * spaces included, became part of the link.
 *
 * After such a transaction, if the caret sits at a link's right edge, the link
 * is dropped from the stored marks. Typing then produces plain text, while the
 * link itself is untouched. `isActive('link')` reads the stored marks, so it
 * reports false at that caret (the Link button shows inactive, as Bold does
 * when the next keystroke will not be bold); `getAttributes('link')` also reads
 * the marks at the caret, so the Link dialog still pre-fills from the link.
 * Moving the caret clears stored marks as usual, so putting the caret back at
 * the link's end later extends it again.
 *
 * Pastes are recognised by ProseMirror's `uiEvent: 'paste'` meta. Anything
 * else that inserts a link at the caret opts in by setting `LINK_ESCAPE_META`
 * on its transaction.
 */

import { Extension } from '@tiptap/core';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/** Transaction meta that asks for the caret to be moved out of a link it ends at. */
export const LINK_ESCAPE_META = 'linkEscape';

const linkEscapeKey = new PluginKey<boolean>('linkEscape');

function requestsEscape(tr: Transaction): boolean {
  return tr.getMeta('uiEvent') === 'paste' || tr.getMeta(LINK_ESCAPE_META) === true;
}

/** A transaction that drops the link from the stored marks, or null if the caret is not at a link's end. */
function escapeLink(state: EditorState): Transaction | null {
  const linkType = state.schema.marks.link;
  const { selection } = state;
  if (!linkType || !selection.empty) return null;
  const $cursor = selection.$from;
  const link = linkType.isInSet(state.storedMarks ?? $cursor.marks());
  if (!link) return null;
  // Inside the link, not at its end: typing there belongs to the link.
  if ($cursor.nodeAfter && link.isInSet($cursor.nodeAfter.marks)) return null;
  return state.tr.removeStoredMark(linkType);
}

export const LinkEscape = Extension.create({
  name: 'linkEscape',

  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key: linkEscapeKey,
        state: {
          init: () => false,
          // Set by a paste or an opted-in insert and kept through the
          // transactions other plugins append to it — TipTap's paste rules
          // apply the pasted URL's link in one — so the check below runs once
          // the link is in place. The next transaction of its own clears it.
          apply: (tr, pending) => {
            if (tr.getMeta('appendedTransaction')) return pending;
            return requestsEscape(tr);
          },
        },
        appendTransaction: (_transactions, _oldState, newState) => {
          if (!linkEscapeKey.getState(newState)) return null;
          return escapeLink(newState);
        },
      }),
    ];
  },
});
