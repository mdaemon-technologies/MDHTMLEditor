/**
 * CodeSample (toggleCodeSample) tests.
 *
 * HTMLEditor swaps CodeBlock for CodeBlockLowlight, which Jest mocks away, so
 * these run on bare TipTap editors with the real CodeBlock. The HTMLEditor and
 * toolbar path is covered in __tests__/core/CodeSample.test.ts.
 */

import { Editor, Node } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Bold } from '@tiptap/extension-bold';
import { BulletList } from '@tiptap/extension-bullet-list';
import { ListItem } from '@tiptap/extension-list-item';
import { TextAlign } from '@tiptap/extension-text-align';
import { CodeBlock } from '@tiptap/extension-code-block';
import { UndoRedo } from '@tiptap/extensions';

import { CodeSample } from '../../src/extensions/CodeSample';

/** An inline atom a code block cannot hold, like a mention. */
const Chip = Node.create({
  name: 'chip',
  group: 'inline',
  inline: true,
  atom: true,
  parseHTML: () => [{ tag: 'span[data-chip]' }],
  renderHTML: () => ['span', { 'data-chip': '' }],
});

const extensions = () => [
  Chip,
  Document,
  Paragraph,
  Text,
  HardBreak,
  Bold,
  BulletList,
  ListItem,
  TextAlign.configure({ types: ['paragraph'] }),
  CodeBlock,
  UndoRedo,
  CodeSample,
];

const editors: Editor[] = [];

function bare(content: string): Editor {
  const tt = new Editor({ extensions: extensions(), content });
  editors.push(tt);
  return tt;
}

/** Put the caret `offset` characters (a `<br>` counts as one) into the first paragraph. */
function caretAt(tt: Editor, offset: number): void {
  tt.commands.setTextSelection(1 + offset);
}

/** Select from `from` to `to` characters into the first paragraph. */
function select(tt: Editor, from: number, to: number): void {
  tt.commands.setTextSelection({ from: 1 + from, to: 1 + to });
}

afterEach(() => {
  editors.splice(0).forEach((tt) => tt.destroy());
});

describe('CodeSample', () => {
  describe('in a paragraph with line breaks', () => {
    it('leaves the earlier lines as text when the cursor is on an empty last line', () => {
      const tt = bare('<p>Hi team,</p>');
      tt.commands.setTextSelection(tt.state.doc.content.size - 1);
      tt.commands.setHardBreak();
      tt.commands.insertContent('Please run:');
      tt.commands.setHardBreak();

      expect(tt.commands.toggleCodeSample()).toBe(true);

      expect(tt.getHTML()).toBe('<p>Hi team,<br>Please run:</p><pre><code></code></pre>');
      expect(tt.state.selection.$from.parent.type.name).toBe('codeBlock');
    });

    it('converts only the middle line when the cursor is on it', () => {
      const tt = bare('<p>a<br>b<br>c</p>');
      caretAt(tt, 3); // after "b"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre><p>c</p>');
    });

    it('converts only the first line when the cursor is on it', () => {
      const tt = bare('<p>a<br>b</p>');
      caretAt(tt, 0);

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<pre><code>a</code></pre><p>b</p>');
    });

    it('turns a selection across several lines into one code block with newlines', () => {
      const tt = bare('<p>a<br>b<br>c<br>d</p>');
      select(tt, 2, 5); // "b" through "c"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b\nc</code></pre><p>d</p>');
      const { $from, $to } = tt.state.selection;
      expect($from.parent.type.name).toBe('codeBlock');
      expect([$from.parentOffset, $to.parentOffset]).toEqual([0, 3]);
    });

    it('keeps the cursor at the same place in the text', () => {
      const tt = bare('<p>a<br>bcd<br>e</p>');
      caretAt(tt, 4); // between "b" and "c"

      tt.commands.toggleCodeSample();

      const { $from, empty } = tt.state.selection;
      expect(empty).toBe(true);
      expect($from.parent.type.name).toBe('codeBlock');
      expect($from.parentOffset).toBe(2);
    });

    it('keeps paragraph attributes and inline formatting on the lines before and after', () => {
      const tt = bare('<p style="text-align: center"><strong>a</strong><br>b<br><strong>c</strong></p>');
      caretAt(tt, 2); // on "b"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe(
        '<p style="text-align: center;"><strong>a</strong></p>' +
          '<pre><code>b</code></pre>' +
          '<p style="text-align: center;"><strong>c</strong></p>'
      );
    });

    it('drops inline formatting inside the code block', () => {
      const tt = bare('<p>a<br><strong>b</strong></p>');
      caretAt(tt, 3);

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre>');
    });

    it('keeps the cursor in place when an inline node the code block cannot hold is removed', () => {
      const tt = bare('<p>a<br><span data-chip></span> xy<br>c</p>');
      caretAt(tt, 4); // between " " and "x", after the chip

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code> xy</code></pre><p>c</p>');
      const { $from, empty } = tt.state.selection;
      expect(empty).toBe(true);
      expect($from.parent.type.name).toBe('codeBlock');
      expect($from.parentOffset).toBe(1);
    });

    it('leaves out the line a selection ends at the very start of', () => {
      const tt = bare('<p>a<br>b<br>c<br>d</p>');
      select(tt, 2, 4); // from the start of "b" to the start of "c"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre><p>c<br>d</p>');
      const { $from, $to } = tt.state.selection;
      expect($from.parent.type.name).toBe('codeBlock');
      expect($to.parent.type.name).toBe('codeBlock');
      expect([$from.parentOffset, $to.parentOffset]).toEqual([0, 1]);
    });

    it('leaves out the line a selection starts at the very end of', () => {
      const tt = bare('<p>a<br>b<br>c</p>');
      select(tt, 1, 3); // from the end of "a" to the end of "b"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre><p>c</p>');
      const { $from, $to } = tt.state.selection;
      expect($from.parent.type.name).toBe('codeBlock');
      expect([$from.parentOffset, $to.parentOffset]).toEqual([0, 1]);
    });

    it('keeps the direction of a backward selection', () => {
      const tt = bare('<p>a<br>bc<br>d</p>');
      tt.commands.setTextSelection({ from: 5, to: 3 }); // head before anchor, over "bc"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>bc</code></pre><p>d</p>');
      const { anchor, head, $head } = tt.state.selection;
      expect(head).toBeLessThan(anchor);
      expect($head.parent.type.name).toBe('codeBlock');
      expect($head.parentOffset).toBe(0);
    });

    it('keeps empty lines just above the code block as empty paragraphs', () => {
      // A paragraph ending in <br> shows that last empty line in the editor but
      // not in a browser, so the text before the code block must not end in one.
      const tt = bare('<p>a<br><br><br>b</p>');
      caretAt(tt, 4); // on "b"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><p></p><p></p><pre><code>b</code></pre>');
      const { $from } = tt.state.selection;
      expect($from.parent.type.name).toBe('codeBlock');
      expect($from.parentOffset).toBe(0);
    });

    it('converts the empty line the cursor is on between two lines', () => {
      const tt = bare('<p>a<br><br>b</p>');
      caretAt(tt, 2); // on the empty line

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code></code></pre><p>b</p>');
    });

    it('converts only the selected empty line when a selection covers both its breaks', () => {
      const tt = bare('<p>a<br><br>b</p>');
      select(tt, 1, 3); // the end of "a" to the start of "b"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code></code></pre><p>b</p>');
    });

    it('leaves out both edge lines when a selection starts at a line end and ends at a line start', () => {
      const tt = bare('<p>a<br>b<br>c</p>');
      select(tt, 1, 4); // the end of "a" to the start of "c"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre><p>c</p>');
    });

    it('is reverted by a single undo', () => {
      const tt = bare('<p>a<br>b<br>c</p>');
      const before = tt.getHTML();
      caretAt(tt, 2);

      tt.commands.toggleCodeSample();
      expect(tt.getHTML()).not.toBe(before);

      tt.commands.undo();
      expect(tt.getHTML()).toBe(before);
    });

    it('converts a second line of a list item inside the item', () => {
      const tt = bare('<ul><li><p>a<br>b</p></li></ul>');
      tt.commands.setTextSelection(3 + 3); // ul, li, p open; then "a", br, "b"

      tt.commands.toggleCodeSample();

      expect(tt.getHTML()).toBe('<ul><li><p>a</p><pre><code>b</code></pre></li></ul>');
    });

    it('reports it can run without changing the document', () => {
      const tt = bare('<p>a<br>b</p>');
      const before = tt.getHTML();
      caretAt(tt, 2);

      expect(tt.can().toggleCodeSample()).toBe(true);
      expect(tt.getHTML()).toBe(before);
    });
  });

  describe('falling back to toggleCodeBlock', () => {
    /** Run `toggleCodeSample` and `toggleCodeBlock` on the same start and compare. */
    function expectSameAsToggleCodeBlock(content: string, place: (tt: Editor) => void): void {
      const sample = bare(content);
      place(sample);
      const block = bare(content);
      place(block);

      sample.commands.toggleCodeSample();
      block.commands.toggleCodeBlock();

      expect(sample.getHTML()).toBe(block.getHTML());
    }

    it('converts a paragraph without line breaks the same way', () => {
      expectSameAsToggleCodeBlock('<p>a</p><p>b</p>', (tt) => tt.commands.setTextSelection(4));
    });

    it('turns a code block back into text the same way', () => {
      expectSameAsToggleCodeBlock('<pre><code>a\nb</code></pre>', (tt) => tt.commands.setTextSelection(2));
    });

    it('converts a selection across several blocks the same way', () => {
      expectSameAsToggleCodeBlock('<p>a<br>b</p><p>c</p>', (tt) => tt.commands.setTextSelection({ from: 3, to: 6 }));
    });

    it('converts a selection of just a line break the same way', () => {
      expectSameAsToggleCodeBlock('<p>a<br>b</p>', (tt) => tt.commands.setTextSelection({ from: 2, to: 3 }));
    });

    it("converts a list item's first line the same way", () => {
      expectSameAsToggleCodeBlock('<ul><li><p>a<br>b</p></li></ul>', (tt) => tt.commands.setTextSelection(4));
    });

    it('does nothing without a code block in the schema', () => {
      const tt = new Editor({ extensions: [Document, Paragraph, Text, HardBreak, CodeSample], content: '<p>a<br>b</p>' });
      editors.push(tt);
      caretAt(tt, 0);

      expect(tt.commands.toggleCodeSample()).toBe(false);
      expect(tt.getHTML()).toBe('<p>a<br>b</p>');
    });
  });

  describe('keyboard shortcut', () => {
    function pressCtrlAltC(tt: Editor): void {
      const event = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, altKey: true, bubbles: true, cancelable: true });
      tt.view.dom.dispatchEvent(event);
    }

    it('binds Ctrl+Alt+C to toggleCodeSample ahead of CodeBlock', () => {
      const tt = bare('<p>a<br>b</p>');
      caretAt(tt, 2);

      pressCtrlAltC(tt);

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre>');
    });

    it('wins over CodeBlock whichever is registered first', () => {
      // Registration order alone would let CodeBlock's binding run first here,
      // so this passes only because of CodeSample's priority.
      const tt = new Editor({
        extensions: [Document, Paragraph, Text, HardBreak, CodeSample, CodeBlock],
        content: '<p>a<br>b</p>',
      });
      editors.push(tt);
      caretAt(tt, 2);

      pressCtrlAltC(tt);

      expect(tt.getHTML()).toBe('<p>a</p><pre><code>b</code></pre>');
    });
  });
});
