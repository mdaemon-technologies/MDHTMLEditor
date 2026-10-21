/**
 * Code sample toggle through HTMLEditor.
 *
 * A line break inside a paragraph (Shift+Enter, or a loaded `<br>`) looks like
 * a new line, but the lines on either side are still one paragraph. Turning
 * Code sample on must convert only the lines the selection touches, from the
 * toolbar button and from Ctrl+Alt+C alike.
 *
 * The global Jest mock for CodeBlockLowlight has no `codeBlock` node, so this
 * file swaps in the real CodeBlock. The swap only affects this file.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';

jest.mock('@tiptap/extension-code-block-lowlight', () => {
  const { CodeBlock } = jest.requireActual('@tiptap/extension-code-block');
  return { CodeBlockLowlight: CodeBlock };
});

interface Block {
  type: string;
  text: string;
}

/** The document's top-level blocks, with each line break shown as `\n`. */
function blocks(editor: HTMLEditor): Block[] {
  const result: Block[] = [];
  editor.getTipTap()!.state.doc.forEach((node) => {
    result.push({ type: node.type.name, text: node.textBetween(0, node.content.size, undefined, '\n') });
  });
  return result;
}

/** Click the toolbar's Code sample button. */
function clickCodeSample(container: HTMLElement): void {
  const button = container.querySelector<HTMLButtonElement>('[data-button="codesample"]');
  expect(button).not.toBeNull();
  button!.click();
}

/** Press Ctrl+Alt+C in the editor. */
function pressCtrlAltC(editor: HTMLEditor): void {
  const event = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, altKey: true, bubbles: true, cancelable: true });
  editor.getTipTap()!.view.dom.dispatchEvent(event);
}

describe('Code sample', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container, { toolbar: 'codesample' });
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  /** Type two lines with Shift+Enter between them, then Shift+Enter again. */
  function typeLinesThenNewLine(): void {
    const tiptap = editor.getTipTap()!;
    tiptap.commands.setContent('<p>Hi team,</p>');
    tiptap.commands.setTextSelection(tiptap.state.doc.content.size - 1);
    tiptap.commands.setHardBreak();
    tiptap.commands.insertContent('Please run:');
    tiptap.commands.setHardBreak();
  }

  it('starts the code block on the cursor line, leaving earlier lines as text', () => {
    typeLinesThenNewLine();

    clickCodeSample(container);

    expect(blocks(editor)).toEqual([
      { type: 'paragraph', text: 'Hi team,\nPlease run:' },
      { type: 'codeBlock', text: '' },
    ]);
  });

  it('converts only the cursor line of loaded content with <br> between lines', () => {
    editor.setContent('<p>Hi team,<br>npm install</p>');
    const tiptap = editor.getTipTap()!;
    // Inside "npm install": 1 (paragraph start) + "Hi team," (8) + br (1) + "npm in" (6).
    tiptap.commands.setTextSelection(1 + 8 + 1 + 6);

    clickCodeSample(container);

    expect(blocks(editor)).toEqual([
      { type: 'paragraph', text: 'Hi team,' },
      { type: 'codeBlock', text: 'npm install' },
    ]);
    expect(editor.getContent()).toContain('<pre><code>npm install</code></pre>');
  });

  it('starts the code block on the cursor line from Ctrl+Alt+C', () => {
    typeLinesThenNewLine();

    pressCtrlAltC(editor);

    expect(blocks(editor)).toEqual([
      { type: 'paragraph', text: 'Hi team,\nPlease run:' },
      { type: 'codeBlock', text: '' },
    ]);
  });

  it('still converts just the new paragraph after Enter', () => {
    editor.setContent('<p>Hi team,</p><p></p>');
    const tiptap = editor.getTipTap()!;
    tiptap.commands.setTextSelection(tiptap.state.doc.content.size - 1);

    clickCodeSample(container);

    expect(blocks(editor)).toEqual([
      { type: 'paragraph', text: 'Hi team,' },
      { type: 'codeBlock', text: '' },
    ]);
  });

  it('shows the button as active inside the new code block', () => {
    typeLinesThenNewLine();

    clickCodeSample(container);

    const button = container.querySelector('[data-button="codesample"]');
    expect(button?.classList.contains('md-toolbar-btn-active')).toBe(true);
  });
});
