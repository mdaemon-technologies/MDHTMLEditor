/**
 * BlockIndent Extension
 *
 * Adds CKEditor-style block indentation to paragraphs and headings: an `indent`
 * toolbar command / Tab key increases a left margin on the block(s) in the
 * selection, and outdent / Shift+Tab decreases it. The indent is stored as a
 * pixel value and inlined as `margin-left` on the block — the same block-
 * attribute approach BlockFontStyle uses — so exported HTML carries the indent
 * on the element itself and survives in mail clients and other consumers that
 * do not load the editor's stylesheet.
 *
 * Keyboard behavior (mirrors CKEditor): Tab is ALWAYS handled, so it never
 * escapes the editor and moves focus to the next element on the page. What it
 * does depends on context:
 * - In a table: deferred to the Table extension so Tab moves between cells.
 * - In a code block: inserts a literal tab character.
 * - In a list item that can be nested (has a preceding sibling): sinks the item.
 * - In a list item that cannot be nested (e.g. the first item at a level):
 *   indents the item's own content instead, so Tab still adds a "tab inside the
 *   `<li>`" rather than doing nothing.
 * - Everywhere else (paragraphs, headings): indents the block.
 *
 * Shift+Tab is the inverse and is likewise always handled (reduce an inner
 * indent, else lift the list item, else outdent the block).
 *
 * Keyboard escape (WCAG 2.1.2 "No Keyboard Trap"): because Tab is captured, the
 * editor would otherwise trap keyboard focus. Pressing `Esc` arms a one-shot
 * "Tab moves focus" mode (CodeMirror's convention) — the very next Tab /
 * Shift+Tab moves focus to the next / previous focusable element outside the
 * editor instead of indenting. Any other key press disarms it, so a stale Esc
 * never makes a later Tab unexpectedly leave the editor.
 */

import { Extension } from '@tiptap/core';
import type { CommandProps, Editor } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockIndent: {
      /** Increase the left indent of the block(s) in the selection by one step. */
      indentBlock: () => ReturnType;
      /** Decrease the left indent of the block(s) in the selection by one step. */
      outdentBlock: () => ReturnType;
    };
  }
}

export interface BlockIndentOptions {
  /** Node types that can be indented. */
  types: string[];
  /** Pixels added/removed per indent step. */
  step: number;
  /** Maximum indent in pixels. */
  max: number;
}

/**
 * Shift the `blockIndent` attribute of every indentable block the selection
 * touches by `delta` steps, clamped to `[0, max]`. Returns true if any block
 * actually changed — so the caller (a Tab handler) can tell whether it consumed
 * the key or should let it fall through.
 */
function adjustIndent(
  { tr, state, dispatch }: CommandProps,
  options: BlockIndentOptions,
  delta: number
): boolean {
  const { from, to } = state.selection;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!options.types.includes(node.type.name)) {
      return;
    }

    const current: number = node.attrs.blockIndent || 0;
    const next = Math.max(0, Math.min(options.max, current + delta * options.step));
    if (next === current) {
      return;
    }

    changed = true;
    if (dispatch) {
      tr.setNodeAttribute(pos, 'blockIndent', next);
    }
  });

  return changed;
}

/** Elements that participate in the Tab order. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Move focus out of the editor to the next (`dir > 0`) or previous focusable
 * element in the document, skipping anything inside the editor's own wrapper
 * (its toolbar included). Used by the Esc-armed Tab escape. Falls back to simply
 * blurring the editor if there is nothing to move to.
 */
function moveFocusOut(editor: Editor, dir: number): void {
  const dom = editor.view.dom as HTMLElement;
  const wrapper = dom.closest('.md-editor') ?? dom;

  const focusable = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => !wrapper.contains(el));

  const following = focusable.filter(
    (el) => wrapper.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
  );
  const preceding = focusable.filter(
    (el) => wrapper.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING
  );

  const target = dir > 0 ? following[0] : preceding[preceding.length - 1];

  editor.commands.blur();
  target?.focus();
}

export const BlockIndent = Extension.create<BlockIndentOptions>({
  name: 'blockIndent',

  // Run this keymap ahead of the stock list-item / table Tab bindings so its
  // Tab handler decides how the key is used; it defers explicitly where those
  // extensions should win (see addKeyboardShortcuts).
  priority: 1000,

  addStorage() {
    // One-shot flag: set by Esc, consumed by the next Tab / Shift+Tab.
    return { escapeArmed: false };
  },

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      step: 40,
      max: 400,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          blockIndent: {
            default: 0,
            parseHTML: element => {
              const ml = parseInt(element.style.marginLeft, 10);
              return Number.isFinite(ml) && ml > 0 ? ml : 0;
            },
            renderHTML: attributes => {
              if (!attributes.blockIndent) {
                return {};
              }

              return {
                style: `margin-left: ${attributes.blockIndent}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indentBlock:
        () =>
        (props) =>
          adjustIndent(props, this.options, +1),

      outdentBlock:
        () =>
        (props) =>
          adjustIndent(props, this.options, -1),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Arm the one-shot Tab-moves-focus escape (see the storage flag). Return
      // false so other Escape handlers (open dialogs, fullscreen) still run.
      Escape: () => {
        this.storage.escapeArmed = true;
        return false;
      },
      Tab: () => {
        const editor = this.editor;
        // Esc was just pressed: let this Tab move focus out instead of indenting.
        if (this.storage.escapeArmed) {
          this.storage.escapeArmed = false;
          moveFocusOut(editor, 1);
          return true;
        }
        // Let the Table extension use Tab to move between cells.
        if (editor.isActive('table')) {
          return false;
        }
        // Code blocks: a literal tab is the natural indent. Insert it as raw
        // text (insertContent would parse '\t' as collapsible HTML whitespace).
        if (editor.isActive('codeBlock')) {
          return editor.commands.command(({ tr, dispatch }) => {
            if (dispatch) tr.insertText('\t');
            return true;
          });
        }
        // Lists: nest the item when it has a sibling to nest under; otherwise
        // (e.g. the first item) indent its content so Tab still does something.
        if (editor.isActive('listItem')) {
          if (editor.commands.sinkListItem('listItem')) {
            return true;
          }
          editor.commands.indentBlock();
          return true;
        }
        // Paragraphs, headings, everything else: indent the block, and consume
        // Tab regardless (even at max indent) so focus never leaves the editor.
        editor.commands.indentBlock();
        return true;
      },
      'Shift-Tab': () => {
        const editor = this.editor;
        if (this.storage.escapeArmed) {
          this.storage.escapeArmed = false;
          moveFocusOut(editor, -1);
          return true;
        }
        if (editor.isActive('table')) {
          return false;
        }
        if (editor.isActive('codeBlock')) {
          // No structural outdent inside a code block; consume to stay put.
          return true;
        }
        if (editor.isActive('listItem')) {
          // Reduce an inner indent first; otherwise lift the item out a level.
          if (editor.commands.outdentBlock()) {
            return true;
          }
          editor.commands.liftListItem('listItem');
          return true;
        }
        editor.commands.outdentBlock();
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        props: {
          // Disarm the Esc-triggered escape on any key that is not Esc, Tab, or a
          // bare modifier — so arming it then typing something else does not leave
          // a stale flag that makes a later Tab jump out of the editor.
          handleKeyDown: (_view, event) => {
            if (
              storage.escapeArmed &&
              event.key !== 'Escape' &&
              event.key !== 'Tab' &&
              !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)
            ) {
              storage.escapeArmed = false;
            }
            return false;
          },
        },
      }),
    ];
  },
});
