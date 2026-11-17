/**
 * FormatPainter Extension
 *
 * Copies the inline formatting at one place and paints it onto another, as
 * TinyMCE's Format Painter and CKEditor's Copy Formatting do. Only inline
 * formatting is copied: bold, italic, underline, strikethrough, subscript,
 * superscript, inline code, highlight, and the text style (color, font, size,
 * style class). Links are neither copied nor removed, and block formatting
 * (alignment, indent, line height) is left alone.
 *
 * Painting replaces the target's own inline formatting, so the painted text
 * looks like the source. A paragraph's font is stored on the paragraph (see
 * BlockFontStyle), and every paragraph carries the configured default there,
 * so a font is copied only when it differs from that default, and painted only
 * where it differs from the target paragraph's own font: painting never wraps
 * text in a span of the font it already shows.
 *
 * With the painter on, the next selection made with the mouse is painted, and
 * the painter turns off; in sticky mode it stays on until it is turned off or
 * Escape is pressed.
 */

import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Selection, Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Mark, Node as ProseMirrorNode, ResolvedPos, Schema } from '@tiptap/pm/model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formatPainter: {
      /** Copy the inline formatting at the selection, without turning the painter on. */
      retrieveFormat: () => ReturnType;
      /** Paint the copied formatting onto the selection, or onto the word at a collapsed caret. */
      paintFormat: () => ReturnType;
      /** Copy the formatting at the selection and paint the next mouse selection (every one, when sticky). */
      startFormatPainter: (options?: { sticky?: boolean }) => ReturnType;
      /** Stop painting mouse selections. */
      stopFormatPainter: () => ReturnType;
    };
  }
}

/** The marks the painter copies, and clears from the text it paints. */
const FORMAT_MARKS = ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'code', 'highlight', 'textStyle'];

/** The block attributes BlockFontStyle keeps a paragraph's font in. */
const BLOCK_FONT = { fontFamily: 'blockFontFamily', fontSize: 'blockFontSize' } as const;

interface CopiedFormat {
  /** The formatting marks, apart from the text style. */
  marks: Mark[];
  /** The text style's attributes, apart from the font. */
  textStyle: Record<string, unknown>;
  /** The font to paint, or null for none (the text shows its paragraph's font). */
  fontFamily: string | null;
  fontSize: string | null;
}

interface FormatPainterState {
  /** What was last copied, kept after the painter turns off for a later paint. */
  format: CopiedFormat | null;
  /** Painting mouse selections. */
  active: boolean;
  /** Painting every mouse selection rather than only the next. */
  sticky: boolean;
}

const formatPainterKey = new PluginKey<FormatPainterState>('formatPainter');

/** Whether the painter is on, painting mouse selections. */
export function isFormatPainterActive(state: EditorState): boolean {
  return formatPainterKey.getState(state)?.active ?? false;
}

const isFormatMark = (mark: Mark) => FORMAT_MARKS.includes(mark.type.name);

/** An attribute value that says something: parsed HTML leaves unset styles as ''. */
const isSet = (value: unknown) => value !== null && value !== undefined && value !== '';

/**
 * Whether adding `mark` would push out one of `marks` the painter doesn't own:
 * inline code excludes every other mark, the link included.
 */
const pushesOut = (mark: Mark, marks: readonly Mark[]) =>
  marks.some((other) => !isFormatMark(other) && mark.type.excludes(other.type));

/**
 * Whether a press landed on its element's own scrollbar (a wide table or code
 * block scrolls inside the editor): beyond the element's content box.
 */
function onScrollbar(event: MouseEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return (target.clientWidth > 0 && event.offsetX > target.clientWidth)
    || (target.clientHeight > 0 && event.offsetY > target.clientHeight);
}

/** A node selected on its own (an image, a mention) is not text to paint. */
const canPaint = (selection: Selection) => !(selection instanceof NodeSelection);

/** A font value as the browser reads it: quotes, letter case and spacing don't change which font it names. */
const fontKey = (value: string) => value.replace(/['"]/g, '').replace(/\s*,\s*/g, ',').trim().toLowerCase();

/** Whether two font families or sizes name the same font. */
const sameFont = (a: unknown, b: unknown) =>
  typeof a === 'string' && typeof b === 'string' && fontKey(a) === fontKey(b);

/** The block's font attribute when it is not the default every block of its type carries; else null. */
function ownBlockFont(block: ProseMirrorNode, attribute: string): string | null {
  const value = block.attrs[attribute];
  if (typeof value !== 'string' || !value) return null;
  return sameFont(value, block.type.spec.attrs?.[attribute]?.default) ? null : value;
}

/**
 * The formatting at the selection: the first text it holds in the document
 * (whichever way it was made; a cell selection lists the cell the drag ended
 * in first), or what a caret would type with.
 */
function readFormat(state: EditorState): CopiedFormat {
  const { selection, doc } = state;
  let marks: readonly Mark[] = state.storedMarks ?? selection.$from.marks();
  let block: ProseMirrorNode = selection.$from.parent;

  if (!selection.empty) {
    const ranges = [...selection.ranges].sort((a, b) => a.$from.pos - b.$from.pos);
    let found = false;
    for (const range of ranges) {
      doc.nodesBetween(range.$from.pos, range.$to.pos, (node, _pos, parent) => {
        if (found) return false;
        if (node.isText && parent) {
          marks = node.marks;
          block = parent;
          found = true;
        }
        return !found;
      });
      if (found) break;
    }
  }

  const formatting = marks.filter(isFormatMark);
  const textStyle = formatting.find((mark) => mark.type.name === 'textStyle');
  const { fontFamily, fontSize, ...rest } = textStyle?.attrs ?? {};
  return {
    marks: formatting.filter((mark) => mark !== textStyle),
    textStyle: Object.fromEntries(Object.entries(rest).filter(([, value]) => isSet(value))),
    fontFamily: (typeof fontFamily === 'string' && fontFamily) || ownBlockFont(block, BLOCK_FONT.fontFamily),
    fontSize: (typeof fontSize === 'string' && fontSize) || ownBlockFont(block, BLOCK_FONT.fontSize),
  };
}

/** The marks to paint onto text in `block`: the font only where the block doesn't already show it. */
function marksFor(format: CopiedFormat, block: ProseMirrorNode, schema: Schema): Mark[] {
  const marks = [...format.marks];
  const attrs: Record<string, unknown> = { ...format.textStyle };
  if (format.fontFamily && !sameFont(block.attrs[BLOCK_FONT.fontFamily], format.fontFamily)) attrs.fontFamily = format.fontFamily;
  if (format.fontSize && !sameFont(block.attrs[BLOCK_FONT.fontSize], format.fontSize)) attrs.fontSize = format.fontSize;
  const textStyle = schema.marks.textStyle;
  if (textStyle && Object.keys(attrs).length > 0) marks.push(textStyle.create(attrs));
  return marks;
}

/** Replace the inline formatting of `from`..`to` with the copied formatting. */
function paintRange(tr: Transaction, from: number, to: number, format: CopiedFormat): void {
  const { schema } = tr.doc.type;
  for (const name of FORMAT_MARKS) {
    const type = schema.marks[name];
    if (type) tr.removeMark(from, to, type);
  }
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    const start = Math.max(from, pos + 1);
    const end = Math.min(to, pos + 1 + node.content.size);
    if (start >= end) return false;
    const marks = marksFor(format, node, schema);
    // Child by child, so a mark goes only where it pushes out none of the
    // text's other marks. addMark skips blocks that don't allow a mark.
    node.forEach((child, offset) => {
      const childFrom = Math.max(start, pos + 1 + offset);
      const childTo = Math.min(end, pos + 1 + offset + child.nodeSize);
      if (childFrom >= childTo) return;
      for (const mark of marks) {
        if (!pushesOut(mark, child.marks)) tr.addMark(childFrom, childTo, mark);
      }
    });
    return false;
  });
}

// Letters with their combining marks (Thai tone and vowel marks, a decomposed
// accent), digits, connectors such as _, and both apostrophes (don't, don’t).
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}\p{Pc}'’]/u;

/** The word around a caret, or null when the caret is not in one. */
function wordAt($pos: ResolvedPos): { from: number; to: number } | null {
  const block = $pos.parent;
  if (!block.isTextblock) return null;
  // One character per inline leaf (image, line break), so offsets match positions.
  const text = block.textBetween(0, block.content.size, undefined, '￼');
  let start = $pos.parentOffset;
  let end = start;
  while (start > 0 && WORD_CHARACTER.test(text[start - 1])) start--;
  while (end < text.length && WORD_CHARACTER.test(text[end])) end++;
  if (start === end) return null;
  return { from: $pos.start() + start, to: $pos.start() + end };
}

/**
 * Paint the selection (each cell of a cell selection), the word at a caret, or
 * what a caret outside a word types next.
 */
function paintSelection(tr: Transaction, format: CopiedFormat): void {
  const { selection } = tr;
  if (!selection.empty) {
    for (const range of selection.ranges) paintRange(tr, range.$from.pos, range.$to.pos, format);
    return;
  }
  const word = wordAt(selection.$from);
  if (word) {
    paintRange(tr, word.from, word.to, format);
    return;
  }
  const kept = (tr.storedMarks ?? selection.$from.marks()).filter((mark) => !isFormatMark(mark));
  const painted = marksFor(format, selection.$from.parent, tr.doc.type.schema).filter((mark) => !pushesOut(mark, kept));
  tr.setStoredMarks([...kept, ...painted]);
}

export const FormatPainter = Extension.create({
  name: 'formatPainter',

  addCommands() {
    return {
      retrieveFormat:
        () =>
        ({ state, tr, dispatch }) => {
          if (dispatch) tr.setMeta(formatPainterKey, { format: readFormat(state) });
          return true;
        },
      paintFormat:
        () =>
        ({ state, tr, dispatch, editor }) => {
          const format = formatPainterKey.getState(state)?.format;
          if (!editor.isEditable || !format || !canPaint(state.selection)) return false;
          if (dispatch) paintSelection(tr, format);
          return true;
        },
      startFormatPainter:
        (options = {}) =>
        ({ state, tr, dispatch, editor }) => {
          if (!editor.isEditable) return false;
          if (dispatch) {
            tr.setMeta(formatPainterKey, { format: readFormat(state), active: true, sticky: options.sticky === true });
          }
          return true;
        },
      stopFormatPainter:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(formatPainterKey, { active: false, sticky: false });
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // false, so the other Escape handlers (BlockIndent's, open dialogs) still run.
      Escape: () => {
        if (isFormatPainterActive(this.editor.state)) this.editor.commands.stopFormatPainter();
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    // A left-button press inside the editor arms the paint; its release paints,
    // wherever it happens (a drag can end outside the editor), once the
    // selection the press made has settled.
    let release: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const disarm = () => {
      release?.();
      release = null;
    };

    const paintSoon = (view: EditorView) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (view.isDestroyed) return;
        // Read a selection the browser made but ProseMirror hasn't yet (it
        // otherwise waits for selectionchange), so the paint goes where the
        // user just selected.
        const observer = (view as unknown as { domObserver?: { flush(): void; forceFlush?: () => void } }).domObserver;
        if (observer?.forceFlush) observer.forceFlush();
        else observer?.flush();
        const painter = formatPainterKey.getState(view.state);
        if (!view.editable || !painter?.active || !painter.format) return;
        // A click that selected an image or a mention is not a paint; stay on.
        if (!canPaint(view.state.selection)) return;
        const tr = view.state.tr;
        paintSelection(tr, painter.format);
        if (!painter.sticky) tr.setMeta(formatPainterKey, { active: false });
        view.dispatch(tr);
      }, 0);
    };

    return [
      new Plugin<FormatPainterState>({
        key: formatPainterKey,
        state: {
          init: () => ({ format: null, active: false, sticky: false }),
          apply: (tr, value) => {
            const meta = tr.getMeta(formatPainterKey) as Partial<FormatPainterState> | undefined;
            return meta ? { ...value, ...meta } : value;
          },
        },
        props: {
          // Merged into the root's classes, so the cursor shows the painter is on.
          attributes: (state): Record<string, string> =>
            isFormatPainterActive(state) ? { class: 'md-format-painter' } : {},
          handleDOMEvents: {
            // A press that becomes a drag (moving text or an image) ends without a
            // mouseup; without this, the next click anywhere on the page would paint.
            dragstart: () => {
              disarm();
              return false;
            },
            mousedown: (view, event) => {
              disarm();
              // Only the left button selects: a right-click opens a menu, a middle-click pastes.
              if (event.button !== 0 || !view.editable || !isFormatPainterActive(view.state)) return false;
              if (onScrollbar(event)) return false;
              const doc = view.dom.ownerDocument;
              const onUp = (up: MouseEvent) => {
                if (up.button !== 0) return;
                disarm();
                paintSoon(view);
              };
              // Capture, so a handler that stops the event on its way can't hide the release.
              doc.addEventListener('mouseup', onUp, true);
              // A release can go to another window (alt-tab mid-press) and never reach
              // this page; leaving the window ends the press, so the next click doesn't paint.
              const win = doc.defaultView;
              const onBlur = () => disarm();
              win?.addEventListener('blur', onBlur);
              release = () => {
                doc.removeEventListener('mouseup', onUp, true);
                win?.removeEventListener('blur', onBlur);
              };
              return false;
            },
          },
        },
        view: () => ({
          destroy: () => {
            disarm();
            if (timer) clearTimeout(timer);
            timer = null;
          },
        }),
      }),
    ];
  },
});
