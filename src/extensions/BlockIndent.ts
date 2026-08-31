/**
 * BlockIndent Extension
 *
 * Adds CKEditor-style block indentation to paragraphs, headings and list items:
 * an `indent` toolbar command / Tab key increases a left margin on the block(s)
 * in the selection, and outdent / Shift+Tab decreases it. The indent is stored
 * as a pixel value and inlined as `margin-left` on the block — the same block-
 * attribute approach BlockFontStyle uses — so exported HTML carries the indent
 * on the element itself and survives in mail clients and other consumers that
 * do not load the editor's stylesheet. Inside a list the margin goes on the
 * `<li>`, not the paragraph within it, so the bullet or number moves with the
 * text.
 *
 * `indentSelection` / `outdentSelection` hold that context-dependent behavior in
 * one place, so the Tab key, the toolbar buttons and `execCommand` cannot drift
 * apart. What they do:
 * - In a code block: inserts a literal tab character (indent only).
 * - In a list item that can be nested (has a preceding sibling): sinks the item.
 * - In a list item that cannot be nested (e.g. the first item at a level):
 *   indents the item itself, so indent still does something rather than nothing.
 * - Everywhere else (paragraphs, headings): indents the block.
 * Outdent is the inverse, and unwinds a margin indent before it un-nests: from
 * the innermost state outwards, margin → nesting level → out of the list.
 *
 * Keyboard behavior (mirrors CKEditor): Tab is ALWAYS handled, so it never
 * escapes the editor and moves focus to the next element on the page. It adds
 * one exception to the above — in a table it is deferred to the Table extension
 * so Tab moves between cells (the toolbar button still indents the paragraph in
 * the cell). Shift+Tab is likewise always handled.
 *
 * Keyboard escape (WCAG 2.1.2 "No Keyboard Trap"): because Tab is captured, the
 * editor would otherwise trap keyboard focus. Pressing `Esc` arms a one-shot
 * "Tab moves focus" mode (CodeMirror's convention) — the very next Tab /
 * Shift+Tab moves focus to the next / previous focusable element outside the
 * editor instead of indenting. Any other key press disarms it, so a stale Esc
 * never makes a later Tab unexpectedly leave the editor.
 */

import { Extension, isActive } from '@tiptap/core';
import type { CommandProps, Editor } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockIndent: {
      /** Increase the left indent of the block(s) in the selection by one step. */
      indentBlock: () => ReturnType;
      /** Decrease the left indent of the block(s) in the selection by one step. */
      outdentBlock: () => ReturnType;
      /**
       * Increase indentation the way the context calls for: a tab inside a code
       * block, a nesting level inside a list, a margin everywhere else.
       */
      indentSelection: () => ReturnType;
      /** The inverse of `indentSelection`. */
      outdentSelection: () => ReturnType;
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
 *
 * Only the outermost indentable node in any branch is adjusted: a list item and
 * the paragraph inside it are both indentable, and indenting both would move
 * the text two steps for one press — and only the `<li>` carries the marker, so
 * that is the one to move.
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
      return true;
    }

    const current: number = node.attrs.blockIndent || 0;
    const next = Math.max(0, Math.min(options.max, current + delta * options.step));
    if (next !== current) {
      changed = true;
      if (dispatch) {
        tr.setNodeAttribute(pos, 'blockIndent', next);
      }
    }

    // Stop here: this branch's indentation belongs to this node.
    return false;
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
      // `listItem` is indentable so a list can be shifted left or right as a
      // whole: the margin lands on the <li>, which moves its bullet/number with
      // the text. Indenting the paragraph inside the item would leave the
      // marker behind.
      types: ['paragraph', 'heading', 'listItem'],
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

      // The single definition of "indent", shared by the Tab key, the toolbar's
      // Increase indent button and execCommand('indent'), so the three cannot
      // drift apart. Tables are deliberately not special-cased here — only the
      // Tab keymap defers to them, so the toolbar button still indents the
      // paragraph inside a cell.
      indentSelection:
        () =>
        (props) => {
          const { state, commands, tr, dispatch } = props;

          // Code blocks: a literal tab is the natural indent. Insert it as raw
          // text (insertContent would parse '\t' as collapsible HTML whitespace).
          if (isActive(state, 'codeBlock')) {
            if (dispatch) tr.insertText('\t');
            return true;
          }

          // Lists: nest the item under its previous sibling when it has one.
          if (isActive(state, 'listItem') && commands.sinkListItem('listItem')) {
            return true;
          }

          // Otherwise (a first list item, a paragraph, a heading) add a margin.
          return adjustIndent(props, this.options, +1);
        },

      outdentSelection:
        () =>
        (props) => {
          const { state, commands } = props;

          // No structural outdent inside a code block.
          if (isActive(state, 'codeBlock')) {
            return false;
          }

          // Take back a margin indent first — that is the one the user just
          // added, and the one a pasted list arrives with.
          if (adjustIndent(props, this.options, -1)) {
            return true;
          }

          // Nothing left to unwind: lift the item out one nesting level (and,
          // at the top level, out of the list entirely — TinyMCE's behavior).
          if (isActive(state, 'listItem')) {
            return commands.liftListItem('listItem');
          }

          return false;
        },
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
        // A tab in a code block, a nesting level in a list, a margin elsewhere.
        // Consume Tab regardless of whether anything changed (e.g. a paragraph
        // already at max indent) so focus never leaves the editor.
        editor.commands.indentSelection();
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
        // Reduce a margin indent, else lift the list item out a level. Always
        // consumed, so Shift+Tab never escapes the editor either.
        editor.commands.outdentSelection();
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
