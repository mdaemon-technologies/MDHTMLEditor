/**
 * Toolbar Tests
 */

import { HTMLEditor, setTranslate, resetTranslate } from '../../src/core/HTMLEditor';
import { Toolbar } from '../../src/core/Toolbar';
import { PREVIEW_CSP } from '../../src/utils/previewDocument';
import { CONFAB_ICONS } from '../../src/icons';
import { AllSelection } from '@tiptap/pm/state';
import { nextFrame, withFocusElsewhere } from '../helpers';
import { isFormatPainterActive } from '../../src/extensions/FormatPainter';

describe('Toolbar', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new HTMLEditor(container);
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  describe('Rendering', () => {
    it('should render toolbar with correct class', () => {
      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar).not.toBeNull();
    });

    it('should render toolbar groups', () => {
      const groups = container.querySelectorAll('.md-toolbar-group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should render toolbar separators between groups', () => {
      const separators = container.querySelectorAll('.md-toolbar-separator');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should render buttons in groups', () => {
      const buttons = container.querySelectorAll('.md-toolbar-btn');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Basic Editor Mode', () => {
    it('should render basic toolbar for basic editor', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true });
      
      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar).not.toBeNull();
      
      // Basic editor should not have image button
      const imageBtn = toolbar?.querySelector('[data-button="image"]');
      expect(imageBtn).toBeNull();
    });
  });

  describe('Built-in Buttons', () => {
    it('should render bold button', () => {
      const boldBtn = container.querySelector('[data-button="bold"]');
      expect(boldBtn).not.toBeNull();
      expect(boldBtn?.getAttribute('title')).toBe('Bold');
    });

    it('should use the built-in locale for titles the custom translate leaves empty', () => {
      editor.destroy();
      setTranslate((key) => (key === 'Italic' ? 'Custom italic' : ''));
      try {
        editor = new HTMLEditor(container, { language: 'de' });
        expect(container.querySelector('[data-button="bold"]')?.getAttribute('title')).toBe('Fett');
        expect(container.querySelector('[data-button="italic"]')?.getAttribute('title')).toBe('Custom italic');
      } finally {
        resetTranslate();
      }
    });

    it('should render italic button', () => {
      const italicBtn = container.querySelector('[data-button="italic"]');
      expect(italicBtn).not.toBeNull();
      expect(italicBtn?.getAttribute('title')).toBe('Italic');
    });

    it('should render underline button', () => {
      const underlineBtn = container.querySelector('[data-button="underline"]');
      expect(underlineBtn).not.toBeNull();
      expect(underlineBtn?.getAttribute('title')).toBe('Underline');
    });

    it('should render strikethrough button', () => {
      const strikeBtn = container.querySelector('[data-button="strikethrough"]');
      expect(strikeBtn).not.toBeNull();
    });

    it('should render undo button', () => {
      const undoBtn = container.querySelector('[data-button="undo"]');
      expect(undoBtn).not.toBeNull();
      expect(undoBtn?.getAttribute('title')).toBe('Undo');
    });

    it('should render redo button', () => {
      const redoBtn = container.querySelector('[data-button="redo"]');
      expect(redoBtn).not.toBeNull();
      expect(redoBtn?.getAttribute('title')).toBe('Redo');
    });
  });

  describe('Confab Skin Icons', () => {
    let confabContainer: HTMLElement;
    let confabEditor: HTMLEditor;

    beforeEach(() => {
      confabContainer = document.createElement('div');
      document.body.appendChild(confabContainer);
      confabEditor = new HTMLEditor(confabContainer, {
        skin: 'confab',
        toolbar: 'bold italic undo redo',
      });
    });

    afterEach(() => {
      confabEditor?.destroy();
      confabContainer?.remove();
    });

    it('should render SVG icons for bold in confab skin', () => {
      const boldBtn = confabContainer.querySelector('[data-button="bold"]');
      const svg = boldBtn?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('should render SVG icons for italic in confab skin', () => {
      const italicBtn = confabContainer.querySelector('[data-button="italic"]');
      const svg = italicBtn?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('should render SVG icons for undo in confab skin', () => {
      const undoBtn = confabContainer.querySelector('[data-button="undo"]');
      const svg = undoBtn?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('should render SVG icons for redo in confab skin', () => {
      const redoBtn = confabContainer.querySelector('[data-button="redo"]');
      const svg = redoBtn?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('should render text icons for bold in oxide skin', () => {
      const boldBtn = container.querySelector('[data-button="bold"]');
      const svg = boldBtn?.querySelector('svg');
      expect(svg).toBeNull();
      expect(boldBtn?.textContent?.trim()).toBe('B');
    });
  });

  describe('Button Click Actions', () => {
    it('should toggle bold on button click', () => {
      const boldBtn = container.querySelector('[data-button="bold"]') as HTMLButtonElement;
      editor.setContent('<p>Test text</p>');
      editor.focus();
      
      boldBtn?.click();
      
      // Button should be clickable without error
      expect(boldBtn).not.toBeNull();
    });

    it('should toggle italic on button click', () => {
      const italicBtn = container.querySelector('[data-button="italic"]') as HTMLButtonElement;
      editor.setContent('<p>Test text</p>');
      editor.focus();
      
      italicBtn?.click();
      expect(italicBtn).not.toBeNull();
    });

    it('should execute undo on button click', () => {
      const undoBtn = container.querySelector('[data-button="undo"]') as HTMLButtonElement;
      editor.setContent('<p>Test text</p>');
      editor.focus();
      
      undoBtn?.click();
      expect(undoBtn).not.toBeNull();
    });
  });

  describe('Keyboard shortcuts', () => {
    // Regression: the toolbar used to bind Ctrl+B/I/U and Ctrl+Z on `document`.
    // TipTap already binds those natively on the editor DOM; ProseMirror
    // preventDefaults but does not stopPropagation, so the event still bubbled
    // to this document handler, which ran the command a SECOND time — toggling
    // the mark TipTap had just applied straight back off (net no-op for the
    // user on Ctrl+B/I/U) and undoing twice on Ctrl+Z.
    //
    // In jsdom a keydown dispatched on `document` does NOT reach ProseMirror's
    // native keymap (that lives on the editor DOM), so these tests exercise the
    // document handler in isolation: after the fix it must be inert for
    // B/I/U/Z, which is exactly what stops the double-application in a browser.
    // (jsdom also can't focus a contenteditable element, so `isFocused` is
    // forced to satisfy the handler's focus guard.)
    let tt: NonNullable<ReturnType<HTMLEditor['getTipTap']>>;

    beforeEach(() => {
      editor.setContent('<p>hello</p>');
      tt = editor.getTipTap()!;
      Object.defineProperty(tt, 'isFocused', { get: () => true, configurable: true });
    });

    const modKey = (key: string, opts: Partial<KeyboardEventInit> = {}) =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, ...opts }),
      );

    it('does not apply bold itself on Ctrl+B (delegated to TipTap)', () => {
      tt.commands.selectAll();
      expect(tt.isActive('bold')).toBe(false);

      modKey('b');

      // Before the fix the document handler toggled bold on here; in a browser
      // that landed on top of TipTap's own toggle, cancelling it out.
      expect(tt.isActive('bold')).toBe(false);
    });

    it('does not apply italic or underline itself on Ctrl+I / Ctrl+U', () => {
      tt.commands.selectAll();

      modKey('i');
      modKey('u');

      expect(tt.isActive('italic')).toBe(false);
      expect(tt.isActive('underline')).toBe(false);
    });

    it('does not undo itself on Ctrl+Z (delegated to TipTap History)', () => {
      tt.commands.insertContent(' world');
      const before = editor.getContent();
      expect(before).toContain('world');

      modKey('z');

      // The document handler no longer undoes; content is unchanged. Before the
      // fix this leg ran a second undo on top of History's.
      expect(editor.getContent()).toBe(before);
    });

    it('still opens Search/Replace on Ctrl+F (no native binding to delegate to)', () => {
      modKey('f');

      expect(document.querySelector('.md-searchreplace-dialog')).not.toBeNull();
    });
  });

  describe('Dropdown Buttons', () => {
    it('should have font family dropdown', () => {
      const fontFamilyDropdown = container.querySelector('[data-dropdown="fontfamily"]');
      expect(fontFamilyDropdown).not.toBeNull();
    });

    it('should have font size dropdown', () => {
      const fontSizeDropdown = container.querySelector('[data-dropdown="fontsize"]');
      expect(fontSizeDropdown).not.toBeNull();
    });

    it('should have line height dropdown', () => {
      const lineHeightDropdown = container.querySelector('[data-dropdown="lineheight"]');
      expect(lineHeightDropdown).not.toBeNull();
    });
  });

  describe('Font Dropdown Labels', () => {
    // The labels are refreshed from the toolbar's state-update interval, so the
    // editor has to be built while fake timers are installed.
    beforeEach(() => {
      editor.destroy();
      jest.useFakeTimers();
      editor = new HTMLEditor(container);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const labelOf = (name: string): string =>
      container.querySelector(`[data-dropdown="${name}"] .md-toolbar-dropdown-label`)?.textContent ?? '';

    const titleOf = (name: string): string =>
      container.querySelector(`[data-dropdown="${name}"] .md-toolbar-dropdown-btn`)?.getAttribute('title') ?? '';

    const select = (from: number, to: number) => {
      editor.getTipTap()?.commands.setTextSelection({ from, to });
      jest.advanceTimersByTime(150);
    };

    it('should show the default font and size rather than generic words', () => {
      jest.advanceTimersByTime(150);
      expect(labelOf('fontfamily')).toBe('Arial');
      expect(labelOf('fontsize')).toBe('12pt');
    });

    it('should show the font name for the family at the cursor', () => {
      editor.setContent('<p><span style="font-family: times new roman, times">Hello</span></p>');
      select(3, 3);
      expect(labelOf('fontfamily')).toBe('Times New Roman');
    });

    it('should show the size at the cursor', () => {
      editor.setContent('<p><span style="font-size: 18pt">Hello</span></p>');
      select(3, 3);
      expect(labelOf('fontsize')).toBe('18pt');
    });

    it('should show an unconfigured font by its first family name', () => {
      editor.setContent('<p><span style="font-family: Calibri, sans-serif">Hello</span></p>');
      select(3, 3);
      expect(labelOf('fontfamily')).toBe('Calibri');
    });

    it('should fall back to the generic label for a size inside a heading', () => {
      editor.setContent('<h1>Title</h1>');
      select(3, 3);
      expect(labelOf('fontsize')).toBe('Font size');
    });

    it('should fall back to the generic label for a selection spanning two sizes', () => {
      editor.setContent('<p><span style="font-size: 18pt">AAA</span><span style="font-size: 24pt">BBB</span></p>');
      select(1, 7);
      expect(labelOf('fontsize')).toBe('Font size');
    });

    it('should carry the untruncated label on the button title', () => {
      editor.setContent('<p><span style="font-family: times new roman, times">Hello</span></p>');
      select(3, 3);
      expect(titleOf('fontfamily')).toBe('Times New Roman');
    });
  });

  describe('Color Pickers', () => {
    it('should have forecolor button', () => {
      const forecolorBtn = container.querySelector('[data-colorpicker="forecolor"]');
      expect(forecolorBtn).not.toBeNull();
      const btn = forecolorBtn?.querySelector('button');
      expect(btn?.getAttribute('title')).toBe('Text color');
    });

    it('should have backcolor button', () => {
      const backcolorBtn = container.querySelector('[data-colorpicker="backcolor"]');
      expect(backcolorBtn).not.toBeNull();
      const btn = backcolorBtn?.querySelector('button');
      expect(btn?.getAttribute('title')).toBe('Background color');
    });

    // The picker menus are portaled to document.body, not the container
    const swatchValues = (name: string): string[] => {
      const menu = document.querySelector(`[data-colorpicker-menu="${name}"]`);
      return Array.from(menu?.querySelectorAll('.md-toolbar-colorpicker-swatch') ?? [])
        .map(el => el.getAttribute('data-color') ?? '');
    };

    const rebuild = (config: Record<string, unknown>) => {
      editor.destroy();
      editor = new HTMLEditor(container, config);
    };

    describe('palettes', () => {
      it('should give text and highlight pickers different default palettes', () => {
        expect(swatchValues('forecolor')).not.toEqual(swatchValues('backcolor'));
      });

      it('should render 40 text colors and 26 highlight colors by default', () => {
        expect(swatchValues('forecolor')).toHaveLength(40);
        expect(swatchValues('backcolor')).toHaveLength(26);
      });

      it('should omit the pale highlight tints from the text palette', () => {
        const fore = swatchValues('forecolor');
        // These read fine behind text but are illegible as font colors
        ['#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#CFE2F3', '#D9D2E9', '#EAD1DC']
          .forEach(tint => expect(fore).not.toContain(tint));
      });

      it('should include dark shades in the text palette', () => {
        const fore = swatchValues('forecolor');
        ['#980000', '#A61C00', '#38761D', '#1155CC', '#351C75', '#741B47']
          .forEach(dark => expect(fore).toContain(dark));
      });

      it('should keep the pale tints in the highlight palette', () => {
        const back = swatchValues('backcolor');
        expect(back).toContain('#FFF2CC');
        expect(back).toContain('#D9EAD3');
      });

      it('should label swatches with their color name', () => {
        const menu = document.querySelector('[data-colorpicker-menu="forecolor"]');
        const swatch = menu?.querySelector('[data-color="#1155CC"]');
        expect(swatch?.getAttribute('title')).toBe('Dark Cornflower Blue 2');
      });
    });

    describe('color_map configuration', () => {
      it('should let color_map override both pickers', () => {
        rebuild({ color_map: ['#111111', 'One', '#222222', 'Two'] });
        expect(swatchValues('forecolor')).toEqual(['#111111', '#222222']);
        expect(swatchValues('backcolor')).toEqual(['#111111', '#222222']);
      });

      it('should let color_map_foreground override only the text picker', () => {
        rebuild({ color_map_foreground: ['#123456', 'My Color'] });
        expect(swatchValues('forecolor')).toEqual(['#123456']);
        expect(swatchValues('backcolor')).toHaveLength(26);
      });

      it('should let color_map_background override only the highlight picker', () => {
        rebuild({ color_map_background: ['#123456', 'My Color'] });
        expect(swatchValues('backcolor')).toEqual(['#123456']);
        expect(swatchValues('forecolor')).toHaveLength(40);
      });

      it('should let a per-picker key win over the shared color_map', () => {
        rebuild({
          color_map: ['#111111', 'Shared'],
          color_map_foreground: ['#222222', 'Text only'],
        });
        expect(swatchValues('forecolor')).toEqual(['#222222']);
        expect(swatchValues('backcolor')).toEqual(['#111111']);
      });

      it('should read the TinyMCE flat form as value/label pairs', () => {
        rebuild({ color_map_foreground: ['#123456', 'My Color'] });
        const swatch = document.querySelector('[data-colorpicker-menu="forecolor"] [data-color="#123456"]');
        expect(swatch?.getAttribute('title')).toBe('My Color');
      });

      it('should use the value as the label when a trailing label is missing', () => {
        rebuild({ color_map_foreground: ['#123456'] });
        const swatch = document.querySelector('[data-colorpicker-menu="forecolor"] [data-color="#123456"]');
        expect(swatch?.getAttribute('title')).toBe('#123456');
      });

      it('should accept the ColorOption object form', () => {
        rebuild({ color_map_foreground: [{ value: '#abcdef', label: 'Objecty' }] });
        const swatch = document.querySelector('[data-colorpicker-menu="forecolor"] [data-color="#abcdef"]');
        expect(swatch?.getAttribute('title')).toBe('Objecty');
      });
    });

    describe('remove color', () => {
      const removeButton = (name: string) =>
        document.querySelector(`[data-colorpicker-menu="${name}"] .md-toolbar-colorpicker-remove`) as HTMLElement | null;

      it('should render a Remove color entry in both pickers', () => {
        expect(removeButton('forecolor')?.textContent).toBe('Remove color');
        expect(removeButton('backcolor')?.textContent).toBe('Remove color');
      });

      it('should unset the text color without touching other marks', () => {
        editor.setContent('<p><strong><span style="color: #ff0000">Hello</span></strong></p>');
        const tiptap = editor.getTipTap();
        tiptap?.commands.selectAll();

        removeButton('forecolor')?.click();

        const html = editor.getContent();
        expect(html).not.toContain('#ff0000');
        expect(html).toContain('<strong>');
      });

      it('should unset the highlight color', () => {
        editor.setContent('<p><mark data-color="#ffff00" style="background-color: #ffff00">Hello</mark></p>');
        const tiptap = editor.getTipTap();
        tiptap?.commands.selectAll();

        removeButton('backcolor')?.click();

        expect(editor.getContent()).not.toContain('background-color');
      });

      it('should reset the button preview to its default', () => {
        const menu = document.querySelector('[data-colorpicker-menu="forecolor"]');
        const preview = container.querySelector(
          '[data-colorpicker="forecolor"] .md-toolbar-colorpicker-preview'
        ) as HTMLElement;

        (menu?.querySelector('[data-color="#CC0000"]') as HTMLElement)?.click();
        expect(preview.style.backgroundColor).not.toBe('rgb(0, 0, 0)');

        removeButton('forecolor')?.click();
        expect(preview.style.backgroundColor).toBe('rgb(0, 0, 0)');
      });
    });
  });

  describe('List Buttons', () => {
    it('should have bullet list button', () => {
      const bullistBtn = container.querySelector('[data-button="bullist"]');
      expect(bullistBtn).not.toBeNull();
      expect(bullistBtn?.getAttribute('title')).toBe('Bullet list');
    });

    it('should have numbered list button', () => {
      const numlistBtn = container.querySelector('[data-button="numlist"]');
      expect(numlistBtn).not.toBeNull();
      expect(numlistBtn?.getAttribute('title')).toBe('Numbered list');
    });

    it('should have indent button', () => {
      const indentBtn = container.querySelector('[data-button="indent"]');
      expect(indentBtn).not.toBeNull();
    });

    it('should have outdent button', () => {
      const outdentBtn = container.querySelector('[data-button="outdent"]');
      expect(outdentBtn).not.toBeNull();
    });
  });

  describe('Alignment Buttons', () => {
    it('should have align left button', () => {
      const alignLeftBtn = container.querySelector('[data-button="alignleft"]');
      expect(alignLeftBtn).not.toBeNull();
    });

    it('should have align center button', () => {
      const alignCenterBtn = container.querySelector('[data-button="aligncenter"]');
      expect(alignCenterBtn).not.toBeNull();
    });

    it('should have align right button', () => {
      const alignRightBtn = container.querySelector('[data-button="alignright"]');
      expect(alignRightBtn).not.toBeNull();
    });

    it('should have justify button', () => {
      const alignJustifyBtn = container.querySelector('[data-button="alignjustify"]');
      expect(alignJustifyBtn).not.toBeNull();
    });
  });

  describe('Special Feature Buttons', () => {
    it('should have link button', () => {
      const linkBtn = container.querySelector('[data-button="link"]');
      expect(linkBtn).not.toBeNull();
    });

    it('should have charmap button', () => {
      const charmapBtn = container.querySelector('[data-button="charmap"]');
      expect(charmapBtn).not.toBeNull();
    });

    it('should have emoticons button', () => {
      const emoticonsBtn = container.querySelector('[data-button="emoticons"]');
      expect(emoticonsBtn).not.toBeNull();
    });

    it('should have search/replace button', () => {
      const searchBtn = container.querySelector('[data-button="searchreplace"]');
      expect(searchBtn).not.toBeNull();
    });
  });

  describe('Select all button', () => {
    const selectAllButton = () => container.querySelector('[data-button="selectall"]') as HTMLButtonElement | null;

    it('is not in the default toolbars', () => {
      expect(selectAllButton()).toBeNull();

      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true });
      expect(container.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(selectAllButton()).toBeNull();
    });

    it('is labelled Select all', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold | selectall' });

      expect(selectAllButton()?.getAttribute('title')).toBe('Select all');
    });

    const expectWholeDocumentSelected = () => {
      const { selection, doc } = editor.getTipTap()!.state;
      expect(selection).toBeInstanceOf(AllSelection);
      expect(selection.from).toBe(0);
      expect(selection.to).toBe(doc.content.size);
    };

    it('selects the whole document and focuses the editor', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold | selectall' });
      editor.setContent('<p>First</p><p>Second</p>');
      editor.getTipTap()?.commands.setTextSelection(2);

      await withFocusElsewhere(async () => {
        expect(editor.hasFocus()).toBe(false);
        expect(selectAllButton()).not.toBeNull();

        selectAllButton()?.click();
        await nextFrame();

        expectWholeDocumentSelected();
        expect(editor.hasFocus()).toBe(true);
      });
    });

    it('works in the basic editor', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true, toolbar: 'bold | selectall' });
      editor.setContent('<p>Note</p>');
      editor.getTipTap()?.commands.setTextSelection(2);
      expect(selectAllButton()).not.toBeNull();

      selectAllButton()?.click();

      expectWholeDocumentSelected();
    });
  });

  describe('Print button', () => {
    const printButton = () => container.querySelector('[data-button="print"]') as HTMLButtonElement | null;

    it('is not in the default toolbars', () => {
      expect(printButton()).toBeNull();

      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true });
      expect(container.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(printButton()).toBeNull();
    });

    it('is labelled Print', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'preview print' });

      expect(printButton()?.getAttribute('title')).toBe('Print');
    });

    it('runs mcePrint', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'preview print' });
      const exec = jest.spyOn(editor, 'execCommand');
      expect(printButton()).not.toBeNull();

      printButton()?.click();

      expect(exec).toHaveBeenCalledWith('mcePrint');
      expect(document.querySelectorAll('iframe.md-print-frame')).toHaveLength(1);
    });

    it('works in the basic editor', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true, toolbar: 'bold | print' });
      expect(printButton()).not.toBeNull();

      printButton()?.click();

      expect(document.querySelectorAll('iframe.md-print-frame')).toHaveLength(1);
    });

    describe('Ctrl/Cmd+P', () => {
      /** Press Ctrl+P (or another key combination) with the editor focused; returns the event. */
      const press = (init: KeyboardEventInit = { key: 'p', ctrlKey: true }) => {
        // jsdom cannot focus a contenteditable; satisfy the shortcut's focus guard.
        Object.defineProperty(editor.getTipTap()!, 'isFocused', { get: () => true, configurable: true });
        const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
        document.dispatchEvent(event);
        return event;
      };
      const printFrames = () => document.querySelectorAll('iframe.md-print-frame');

      it('prints the content instead of the page when the toolbar has a print button', () => {
        editor.destroy();
        editor = new HTMLEditor(container, { toolbar: 'bold | print' });

        const event = press();

        expect(event.defaultPrevented).toBe(true);
        expect(printFrames()).toHaveLength(1);
      });

      describe('on macOS', () => {
        beforeEach(() => {
          jest.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
          editor.destroy();
          editor = new HTMLEditor(container, { toolbar: 'bold | print' });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('prints on Cmd+P', () => {
          expect(press({ key: 'p', metaKey: true }).defaultPrevented).toBe(true);
          expect(printFrames()).toHaveLength(1);
        });

        it('leaves Ctrl+P alone, which moves the cursor up a line there', () => {
          expect(press({ key: 'p', ctrlKey: true }).defaultPrevented).toBe(false);
          expect(printFrames()).toHaveLength(0);
        });
      });

      it('leaves the Windows key + P alone outside macOS', () => {
        editor.destroy();
        editor = new HTMLEditor(container, { toolbar: 'bold | print' });

        expect(press({ key: 'p', metaKey: true }).defaultPrevented).toBe(false);
        expect(printFrames()).toHaveLength(0);
      });

      it('matches the P key on layouts where it types another letter', () => {
        editor.destroy();
        editor = new HTMLEditor(container, { toolbar: 'bold | print' });

        // Ctrl+P on a Russian layout: the key types з.
        expect(press({ key: 'з', code: 'KeyP', ctrlKey: true }).defaultPrevented).toBe(true);
        expect(printFrames()).toHaveLength(1);
      });

      it('leaves a Ctrl+P the host already handled, and a held key, alone', () => {
        editor.destroy();
        editor = new HTMLEditor(container, { toolbar: 'bold | print' });
        const handled = (e: Event) => e.preventDefault();
        document.addEventListener('keydown', handled, { capture: true });
        try {
          press();
        } finally {
          document.removeEventListener('keydown', handled, { capture: true });
        }
        press({ key: 'p', ctrlKey: true, repeat: true });

        expect(printFrames()).toHaveLength(0);
      });

      it("leaves the browser's print alone without a print button", () => {
        const event = press();

        expect(event.defaultPrevented).toBe(false);
        expect(printFrames()).toHaveLength(0);
      });

      it('leaves Ctrl+Shift+P and Ctrl+Alt+P alone', () => {
        editor.destroy();
        editor = new HTMLEditor(container, { toolbar: 'bold | print' });

        expect(press({ key: 'P', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
        expect(press({ key: 'p', ctrlKey: true, altKey: true }).defaultPrevented).toBe(false);
        expect(printFrames()).toHaveLength(0);
      });

      it('does nothing while the editor does not have focus', () => {
        editor.destroy();
        editor = new HTMLEditor(container, { toolbar: 'bold | print' });
        const event = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true });

        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(printFrames()).toHaveLength(0);
      });
    });
  });

  describe('Show blocks button', () => {
    const showBlocksButton = () => container.querySelector('[data-button="visualblocks"]') as HTMLButtonElement | null;
    const showsBlocks = () => container.querySelector('.md-editor')!.classList.contains('md-editor-visualblocks');
    const isPressed = (button: HTMLButtonElement | null) =>
      button?.classList.contains('md-toolbar-btn-active') && button.getAttribute('aria-pressed') === 'true';
    const isReleased = (button: HTMLButtonElement | null) =>
      !button?.classList.contains('md-toolbar-btn-active') && button?.getAttribute('aria-pressed') === 'false';

    it('is not in the default toolbars', () => {
      expect(showBlocksButton()).toBeNull();

      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true });
      expect(container.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(showBlocksButton()).toBeNull();
    });

    it('is labelled Show blocks', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold | visualblocks' });

      expect(showBlocksButton()?.getAttribute('title')).toBe('Show blocks');
    });

    it('turns Show blocks on and off, and shows whether it is on', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold | visualblocks' });
      expect(isReleased(showBlocksButton())).toBe(true);

      showBlocksButton()?.click();
      expect(editor.isVisualBlocksEnabled()).toBe(true);
      expect(showsBlocks()).toBe(true);
      expect(isPressed(showBlocksButton())).toBe(true);

      showBlocksButton()?.click();
      expect(editor.isVisualBlocksEnabled()).toBe(false);
      expect(showsBlocks()).toBe(false);
      expect(isReleased(showBlocksButton())).toBe(true);
    });

    it('starts pressed with visualblocks_default_state', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'visualblocks', visualblocks_default_state: true });

      expect(isPressed(showBlocksButton())).toBe(true);
    });

    it('follows a change made by command, straight away', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'visualblocks' });

      editor.execCommand('mceVisualBlocks');
      expect(isPressed(showBlocksButton())).toBe(true);

      editor.setVisualBlocks(false);
      expect(isReleased(showBlocksButton())).toBe(true);
    });

    it('stays pressed when the language changes', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'visualblocks' });
      showBlocksButton()?.click();

      editor.setLanguage('de');

      expect(showBlocksButton()?.getAttribute('title')).toBe('Blöcke anzeigen');
      expect(isPressed(showBlocksButton())).toBe(true);
    });
  });

  describe('Insert video button', () => {
    const mediaButton = () => container.querySelector('[data-button="media"]') as HTMLButtonElement | null;

    afterEach(() => {
      document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
    });

    it('is not in the default toolbars', () => {
      expect(mediaButton()).toBeNull();
    });

    it('is labelled Insert video, and opens the Insert video dialog', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'image media' });

      expect(mediaButton()?.getAttribute('title')).toBe('Insert video');
      mediaButton()!.click();

      expect(document.querySelector('.md-media-dialog')).not.toBeNull();
    });

    it('is left out of the basic editor, which has no images', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true, toolbar: 'bold media' });

      expect(container.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(mediaButton()).toBeNull();
    });
  });

  describe('Format painter button', () => {
    const painterButton = () => container.querySelector('[data-button="formatpainter"]') as HTMLButtonElement | null;
    const isOn = () => isFormatPainterActive(editor.getTipTap()!.state);
    /** A click as the browser sends it: detail is the click count, 0 from the keyboard. */
    const click = (detail: number) =>
      painterButton()!.dispatchEvent(new MouseEvent('click', { detail, bubbles: true, cancelable: true }));
    const isPressed = () =>
      painterButton()!.classList.contains('md-toolbar-btn-active') && painterButton()!.getAttribute('aria-pressed') === 'true';
    const isReleased = () =>
      !painterButton()!.classList.contains('md-toolbar-btn-active') && painterButton()!.getAttribute('aria-pressed') === 'false';

    function selectText(text: string): void {
      const tiptap = editor.getTipTap()!;
      let from = -1;
      tiptap.state.doc.descendants((node, pos) => {
        if (from < 0 && node.isText && node.text!.includes(text)) from = pos + node.text!.indexOf(text);
        return from < 0;
      });
      tiptap.commands.setTextSelection({ from, to: from + text.length });
    }

    /** A mouse selection in the editor, as the painter sees one, and the state poll after it. */
    async function mouseSelect(text: string): Promise<void> {
      const dom = editor.getTipTap()!.view.dom;
      dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      selectText(text);
      dom.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    beforeEach(() => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold | formatpainter' });
      editor.setContent('<p><strong>Source</strong> one two</p>');
      selectText('Source');
    });

    it('is not in the default toolbars', () => {
      editor.destroy();
      editor = new HTMLEditor(container);
      expect(painterButton()).toBeNull();

      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true });
      expect(container.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(painterButton()).toBeNull();
    });

    it('is labelled Format painter, and starts released', () => {
      expect(painterButton()?.getAttribute('title')).toBe('Format painter');
      expect(isReleased()).toBe(true);
    });

    it('turns on with a click, pressed, and off with another', () => {
      click(1);
      expect(isOn()).toBe(true);
      expect(isPressed()).toBe(true);

      click(1);
      expect(isOn()).toBe(false);
      expect(isReleased()).toBe(true);
    });

    it('turns on and off from the keyboard, which clicks with detail 0', () => {
      click(0);
      expect(isOn()).toBe(true);

      click(0);
      expect(isOn()).toBe(false);
    });

    it('paints one selection after a click, then releases', async () => {
      click(1);

      await mouseSelect('one');
      await mouseSelect('two');

      expect(editor.getContent()).toMatch(/<strong>Source<\/strong> <strong>one<\/strong> two<\/p>$/);
      expect(isReleased()).toBe(true);
    });

    it('stays on after a double-click, painting every selection until clicked again', async () => {
      // A double-click reaches the button as a click, then a click with detail 2.
      click(1);
      click(2);

      await mouseSelect('one');
      await mouseSelect('two');
      expect(isOn()).toBe(true);
      expect(isPressed()).toBe(true);

      click(1);
      expect(isOn()).toBe(false);
      expect(editor.getContent()).toMatch(/<strong>Source<\/strong> <strong>one<\/strong> <strong>two<\/strong><\/p>$/);
    });
  });

  describe('Direction Buttons', () => {
    it('should have LTR button', () => {
      const ltrBtn = container.querySelector('[data-button="ltr"]');
      expect(ltrBtn).not.toBeNull();
      expect(ltrBtn?.getAttribute('title')).toBe('Left to right');
    });

    it('should have RTL button', () => {
      const rtlBtn = container.querySelector('[data-button="rtl"]');
      expect(rtlBtn).not.toBeNull();
      expect(rtlBtn?.getAttribute('title')).toBe('Right to left');
    });
  });

  describe('Custom Toolbar Configuration', () => {
    it('should render only specified buttons', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic',
      });

      const boldBtn = container.querySelector('[data-button="bold"]');
      const italicBtn = container.querySelector('[data-button="italic"]');
      const underlineBtn = container.querySelector('[data-button="underline"]');

      expect(boldBtn).not.toBeNull();
      expect(italicBtn).not.toBeNull();
      expect(underlineBtn).toBeNull();
    });

    it('should create toolbar groups based on pipe separators', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const groups = container.querySelectorAll('.md-toolbar-group');
      expect(groups.length).toBe(2);
    });
  });

  describe('Custom Buttons via Setup', () => {
    it('should render custom buttons added via ui.registry', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', {
            tooltip: 'My Custom Button',
            text: 'Custom',
            onAction: jest.fn(),
          });
        },
      });

      const customBtn = container.querySelector('[data-button="mybutton"]');
      expect(customBtn).not.toBeNull();
      expect(customBtn?.classList.contains('md-toolbar-btn-custom')).toBe(true);
    });

    it('marks a button with a text label, so it is as wide as its label', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'wordcount timestamp',
        setup: (ed) => {
          ed.ui.registry.addButton('wordcount', { text: '💬 Words', onAction: jest.fn() });
          ed.ui.registry.addButton('timestamp', { icon: 'https://example.com/clock.png', onAction: jest.fn() });
        },
      });

      const text = container.querySelector('[data-button="wordcount"]');
      expect(text?.classList.contains('md-toolbar-btn-labelled')).toBe(true);
      expect(text?.querySelector('.md-toolbar-btn-text')?.textContent).toBe('💬 Words');
      const icon = container.querySelector('[data-button="timestamp"]');
      expect(icon?.classList.contains('md-toolbar-btn-labelled')).toBe(false);
    });

    it('should call onAction when custom button is clicked', () => {
      const onAction = jest.fn();
      
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', {
            text: 'Click Me',
            onAction,
          });
        },
      });

      const customBtn = container.querySelector('[data-button="mybutton"]') as HTMLButtonElement;
      customBtn?.click();
      
      expect(onAction).toHaveBeenCalled();
    });

    it('should call onSetup when custom button is created', () => {
      const onSetup = jest.fn();
      
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', {
            text: 'Test',
            onSetup,
          });
        },
      });

      expect(onSetup).toHaveBeenCalled();
    });

    it('should provide button API to onSetup callback', () => {
      let buttonApi: any;
      
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', {
            text: 'Test',
            onSetup: (api) => {
              buttonApi = api;
            },
          });
        },
      });

      expect(buttonApi).toBeDefined();
      expect(typeof buttonApi.isEnabled).toBe('function');
      expect(typeof buttonApi.setEnabled).toBe('function');
      expect(typeof buttonApi.isActive).toBe('function');
      expect(typeof buttonApi.setActive).toBe('function');
    });

    it('should enable/disable custom button via API', () => {
      let buttonApi: any;
      
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', {
            text: 'Test',
            onSetup: (api) => {
              buttonApi = api;
            },
          });
        },
      });

      const customBtn = container.querySelector('[data-button="mybutton"]') as HTMLButtonElement;
      
      expect(buttonApi.isEnabled()).toBe(true);
      
      buttonApi.setEnabled(false);
      expect(customBtn.disabled).toBe(true);
      expect(buttonApi.isEnabled()).toBe(false);
      
      buttonApi.setEnabled(true);
      expect(customBtn.disabled).toBe(false);
    });

    it('should toggle active state on custom button via API', () => {
      let buttonApi: any;
      
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', {
            text: 'Test',
            onSetup: (api) => {
              buttonApi = api;
            },
          });
        },
      });

      const customBtn = container.querySelector('[data-button="mybutton"]') as HTMLButtonElement;
      
      expect(buttonApi.isActive()).toBe(false);
      
      buttonApi.setActive(true);
      expect(customBtn.classList.contains('md-toolbar-btn-active')).toBe(true);
      expect(buttonApi.isActive()).toBe(true);
      
      buttonApi.setActive(false);
      expect(customBtn.classList.contains('md-toolbar-btn-active')).toBe(false);
    });

    // Built-in icons are inline, so they take the button's text color (light
    // in the dark skins). A custom icon given as SVG must be drawn the same
    // way: inside an <img> its currentColor is always black.
    describe('icon', () => {
      const svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor"/></svg>';

      const buttonWithIcon = (icon: string, config: Record<string, unknown> = {}) => {
        editor.destroy();
        editor = new HTMLEditor(container, {
          toolbar: 'mybutton',
          ...config,
          setup: (ed) => {
            ed.ui.registry.addIcon('clock', svg);
            ed.ui.registry.addButton('mybutton', { icon, tooltip: 'Clock', onAction: jest.fn() });
          },
        });
        return container.querySelector('[data-button="mybutton"]') as HTMLButtonElement;
      };

      it('draws an icon registered with addIcon inline, like the built-in icons', () => {
        const btn = buttonWithIcon('clock');
        expect(btn.querySelector('img')).toBeNull();
        expect(btn.querySelector('.md-toolbar-btn-icon > svg circle')).not.toBeNull();
      });

      it('draws SVG markup given as the icon inline', () => {
        const btn = buttonWithIcon(svg);
        expect(btn.querySelector('img')).toBeNull();
        expect(btn.querySelector('.md-toolbar-btn-icon > svg circle')).not.toBeNull();
      });

      it.each([
        ['registered with addIcon', 'evil'],
        ['given as markup', '<svg onload="alert(1)"><script>alert(2)</script><circle r="1" onclick="alert(3)"/></svg>'],
      ])('draws an icon %s without its script or event handlers', (_label, icon) => {
        editor.destroy();
        editor = new HTMLEditor(container, {
          toolbar: 'mybutton',
          setup: (ed) => {
            ed.ui.registry.addIcon('evil', '<svg onload="alert(1)"><script>alert(2)</script><circle r="1" onclick="alert(3)"/></svg>');
            ed.ui.registry.addButton('mybutton', { icon, onAction: jest.fn() });
          },
        });
        const btn = container.querySelector('[data-button="mybutton"]')!;
        expect(btn.querySelector('.md-toolbar-btn-icon circle')).not.toBeNull();
        expect(btn.querySelector('script')).toBeNull();
        expect(btn.innerHTML).not.toMatch(/alert/);
      });

      it('draws SVG markup copied from a file, with its XML prolog, inline', () => {
        const btn = buttonWithIcon(`<?xml version="1.0" encoding="UTF-8"?>\n<!-- clock -->\n${svg}`);
        expect(btn.querySelector('img')).toBeNull();
        expect(btn.querySelector('.md-toolbar-btn-icon svg circle')).not.toBeNull();
      });

      it('draws a built-in icon name as that icon', () => {
        const btn = buttonWithIcon('link', { skin: 'confab-dark' });
        const builtIn = container.ownerDocument.createElement('span');
        builtIn.innerHTML = CONFAB_ICONS.link;
        expect(btn.querySelector('img')).toBeNull();
        expect(btn.querySelector('.md-toolbar-btn-icon')?.innerHTML).toBe(builtIn.innerHTML);
      });

      it('gives a built-in icon name the same styling class as the built-in button', () => {
        const btn = buttonWithIcon('bold');
        const builtIn = container.ownerDocument.createElement('div');
        editor.destroy();
        editor = new HTMLEditor(builtIn, { toolbar: 'bold' });
        const expected = builtIn.querySelector('[data-button="bold"] .md-toolbar-btn-icon');
        expect(btn.querySelector('.md-toolbar-btn-icon')?.className).toBe(expected?.className);
        expect(expected?.classList.contains('md-icon-bold')).toBe(true);
      });

      it('prefers a registered icon over a built-in one of the same name', () => {
        editor.destroy();
        editor = new HTMLEditor(container, {
          toolbar: 'mybutton',
          skin: 'confab',
          setup: (ed) => {
            ed.ui.registry.addIcon('link', svg);
            ed.ui.registry.addButton('mybutton', { icon: 'link', onAction: jest.fn() });
          },
        });
        expect(container.querySelector('[data-button="mybutton"] .md-toolbar-btn-icon circle')).not.toBeNull();
      });

      it('still draws anything else as an image URL', () => {
        const btn = buttonWithIcon('/icons/custom.png');
        const img = btn.querySelector('img.md-toolbar-btn-icon-img');
        expect(img?.getAttribute('src')).toBe('/icons/custom.png');
        expect(btn.querySelector('.md-toolbar-btn-icon')).toBeNull();
      });

      it('draws a registered icon inline on the table toolbar too', () => {
        editor.destroy();
        editor = new HTMLEditor(container, {
          toolbar: 'bold',
          table_toolbar: 'mybutton',
          setup: (ed) => {
            ed.ui.registry.addIcon('clock', svg);
            ed.ui.registry.addButton('mybutton', { icon: 'clock', onAction: jest.fn() });
          },
        });
        const btn = document.querySelector('.md-table-toolbar [data-button="mybutton"]');
        expect(btn).not.toBeNull();
        expect(btn?.querySelector('img')).toBeNull();
        expect(btn?.querySelector('.md-toolbar-btn-icon > svg circle')).not.toBeNull();
      });
    });
  });

  describe('Toolbar Mode', () => {
    it('should default to wrap mode', () => {
      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-wrap')).toBe(true);
    });

    it('should apply wrap mode class', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar_mode: 'wrap' });

      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-wrap')).toBe(true);
    });

    it('should apply sliding mode class', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar_mode: 'sliding' });

      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-sliding')).toBe(true);
    });

    it('should apply floating mode class', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar_mode: 'floating' });

      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-floating')).toBe(true);
    });

    it('should apply sticky class when toolbar_sticky is true', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar_sticky: true });

      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-sticky')).toBe(true);
    });

    it('should not apply sticky class when toolbar_sticky is false', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar_sticky: false });

      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-sticky')).toBe(false);
    });

    it('should default toolbar_sticky to true', () => {
      const toolbar = container.querySelector('.md-toolbar');
      expect(toolbar?.classList.contains('md-toolbar-sticky')).toBe(true);
    });
  });

  describe('Toolbar Toggle (Overflow)', () => {
    it('should always render toggle button', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]');
      expect(toggleBtn).not.toBeNull();
    });

    it('should render toggle button with a || row break', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]');
      expect(toggleBtn).not.toBeNull();
    });

    it('should render all buttons in a single .md-toolbar-buttons container', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const buttonsEl = container.querySelector('.md-toolbar-buttons');
      expect(buttonsEl).not.toBeNull();
      expect(buttonsEl?.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(buttonsEl?.querySelector('[data-button="undo"]')).not.toBeNull();
    });

    it('should not be expanded by default', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const buttonsEl = container.querySelector('.md-toolbar-buttons');
      expect(buttonsEl?.classList.contains('md-toolbar-expanded')).toBe(false);
    });

    it('should expand when toggle button is clicked', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();

      const buttonsEl = container.querySelector('.md-toolbar-buttons');
      expect(buttonsEl?.classList.contains('md-toolbar-expanded')).toBe(true);
    });

    it('should collapse when toggle button is clicked twice', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();
      toggleBtn?.click();

      const buttonsEl = container.querySelector('.md-toolbar-buttons');
      expect(buttonsEl?.classList.contains('md-toolbar-expanded')).toBe(false);
    });

    it('should apply active class to toggle button when expanded', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();

      expect(toggleBtn?.classList.contains('md-toolbar-btn-active')).toBe(true);
    });

    it('should remove active class from toggle button when collapsed', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();
      toggleBtn?.click();

      expect(toggleBtn?.classList.contains('md-toolbar-btn-active')).toBe(false);
    });

    it('should place all buttons in the same container', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const buttonsEl = container.querySelector('.md-toolbar-buttons');
      const boldBtn = buttonsEl?.querySelector('[data-button="bold"]');
      const italicBtn = buttonsEl?.querySelector('[data-button="italic"]');
      const undoBtn = buttonsEl?.querySelector('[data-button="undo"]');
      const redoBtn = buttonsEl?.querySelector('[data-button="redo"]');
      expect(boldBtn).not.toBeNull();
      expect(italicBtn).not.toBeNull();
      expect(undoBtn).not.toBeNull();
      expect(redoBtn).not.toBeNull();
    });

    it('should keep || rows in the one buttons container', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const buttonsEl = container.querySelector('.md-toolbar-buttons');
      // All buttons in the same container, no separate primary/overflow
      expect(buttonsEl?.querySelector('[data-button="bold"]')).not.toBeNull();
      expect(buttonsEl?.querySelector('[data-button="undo"]')).not.toBeNull();
      expect(container.querySelector('.md-toolbar-primary')).toBeNull();
      expect(container.querySelector('.md-toolbar-overflow')).toBeNull();
    });

    it('should render toggle button with the default toolbar', () => {
      const toggleBtn = container.querySelector('[data-button="togglemore"]');
      expect(toggleBtn).not.toBeNull();
    });
  });

  describe('Row breaks (||)', () => {
    /** The buttons container's children, by kind: a group's buttons, `|`, `||` (separator + break). */
    const layout = () =>
      Array.from(container.querySelector('.md-toolbar-buttons')!.children).map((el) => {
        if (el.classList.contains('md-toolbar-row-break')) return 'break';
        if (el.classList.contains('md-toolbar-row-separator')) return 'row-separator';
        if (el.classList.contains('md-toolbar-separator')) return '|';
        return Array.from(el.querySelectorAll('[data-button]')).map((b) => b.getAttribute('data-button')).join(' ');
      });

    const build = (toolbar: string) => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar });
    };

    it('starts a new row after ||, with a separator for when the rows are one line', () => {
      build('bold italic | underline || undo redo');

      expect(layout()).toEqual(['bold italic', '|', 'underline', 'row-separator', 'break', 'undo redo']);
    });

    it('marks the row break as presentation only', () => {
      build('bold || undo');

      expect(container.querySelector('.md-toolbar-row-break')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('leaves a toolbar without || as one run of groups', () => {
      build('bold italic | undo redo');

      expect(layout()).toEqual(['bold italic', '|', 'undo redo']);
    });

    it('breaks once per ||, ignoring empty rows and a || at either end', () => {
      build('|| bold || || italic | underline || undo ||');

      expect(layout()).toEqual([
        'bold', 'row-separator', 'break', 'italic', '|', 'underline', 'row-separator', 'break', 'undo',
      ]);
    });
  });

  describe('Expanded state', () => {
    const toggle = () => container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
    const buttonsEl = () => container.querySelector('.md-toolbar-buttons') as HTMLElement;
    const isShownExpanded = () =>
      buttonsEl().classList.contains('md-toolbar-expanded') &&
      toggle().classList.contains('md-toolbar-btn-active') &&
      toggle().getAttribute('aria-expanded') === 'true';
    const isShownCollapsed = () =>
      !buttonsEl().classList.contains('md-toolbar-expanded') &&
      !toggle().classList.contains('md-toolbar-btn-active') &&
      toggle().getAttribute('aria-expanded') === 'false';

    const build = (config: ConstructorParameters<typeof HTMLEditor>[1] = {}) => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold italic || undo redo', ...config });
    };

    const recordChanges = () => {
      const changes: boolean[] = [];
      editor.on('toolbarexpandedchange', (expanded) => changes.push(expanded));
      return changes;
    };

    it('starts collapsed by default', () => {
      build();

      expect(isShownCollapsed()).toBe(true);
      expect(editor.isToolbarExpanded()).toBe(false);
      expect(editor.getConfig().toolbar_expanded).toBe(false);
    });

    it('starts expanded with toolbar_expanded: true', () => {
      build({ toolbar_expanded: true });

      expect(isShownExpanded()).toBe(true);
      expect(editor.isToolbarExpanded()).toBe(true);
    });

    it('fires toolbarexpandedchange with the new state when the toggle is clicked', () => {
      build();
      const changes = recordChanges();

      toggle().click();
      expect(isShownExpanded()).toBe(true);
      toggle().click();
      expect(isShownCollapsed()).toBe(true);

      expect(changes).toEqual([true, false]);
      expect(editor.getConfig().toolbar_expanded).toBe(false);
    });

    it('expands and collapses with setToolbarExpanded, firing only on a change', () => {
      build();
      const changes = recordChanges();

      editor.setToolbarExpanded(true);
      expect(isShownExpanded()).toBe(true);
      expect(editor.isToolbarExpanded()).toBe(true);
      expect(editor.getConfig().toolbar_expanded).toBe(true);

      editor.setToolbarExpanded(true);
      editor.setToolbarExpanded(false);
      expect(isShownCollapsed()).toBe(true);

      expect(changes).toEqual([true, false]);
    });

    // jsdom has no layout, so every row "fits": nothing overflows.
    it('hides the toggle on collapse when every button fits on one row', () => {
      build({ toolbar: 'bold italic | undo redo', toolbar_expanded: true });
      expect(toggle().style.display).toBe('');

      toggle().click();

      expect(toggle().style.display).toBe('none');
    });

    it('keeps the buttons of rows the toggle hides out of reach until it opens', () => {
      build({ toolbar: 'bold italic | underline || undo redo || ltr' });
      const reachable = (name: string) =>
        container.querySelector(`[data-button="${name}"]`)!.closest('[inert]') === null;

      expect(['bold', 'italic', 'underline'].every(reachable)).toBe(true);
      expect(['undo', 'redo', 'ltr'].some(reachable)).toBe(false);
      expect(reachable('togglemore')).toBe(true);

      toggle().click();
      expect(['bold', 'undo', 'redo', 'ltr'].every(reachable)).toBe(true);

      toggle().click();
      expect(reachable('undo')).toBe(false);
    });

    it('keeps every button reachable in a toolbar without ||', () => {
      build({ toolbar: 'bold italic | undo redo' });

      expect(container.querySelector('.md-toolbar [inert]')).toBeNull();
    });

    it('fires toolbarexpandedchange with a boolean, whatever setToolbarExpanded is given', () => {
      build();
      const changes = recordChanges();

      (editor.setToolbarExpanded as (value: unknown) => void)(1);
      (editor.setToolbarExpanded as (value: unknown) => void)(true);

      expect(changes).toEqual([true]);
      expect(editor.isToolbarExpanded()).toBe(true);
    });

    it('keeps the state when the language changes', () => {
      build();
      editor.setToolbarExpanded(true);

      editor.setLanguage('de');

      expect(isShownExpanded()).toBe(true);
    });

    it('does not expand the table toolbar', () => {
      build({ toolbar_expanded: true });
      const tableButtons = document.querySelector('.md-table-toolbar .md-toolbar-buttons');

      expect(tableButtons).not.toBeNull();
      expect(tableButtons?.classList.contains('md-toolbar-expanded')).toBe(false);
    });

    // jsdom has no layout: these tests drive the toolbar's ResizeObserver by
    // hand and give elements the widths and positions a browser would.
    describe('with layout', () => {
      const OriginalResizeObserver = window.ResizeObserver;
      let callbacks: ResizeObserverCallback[];

      beforeEach(() => {
        callbacks = [];
        window.ResizeObserver = class {
          constructor(callback: ResizeObserverCallback) {
            callbacks.push(callback);
          }
          observe() {}
          unobserve() {}
          disconnect() {}
        } as unknown as typeof ResizeObserver;
      });

      afterEach(() => {
        window.ResizeObserver = OriginalResizeObserver;
      });

      /** Give the editor `width` and run the toolbar's resize handling. */
      const resizeTo = (width: number) => {
        const root = container.querySelector('.md-editor') as HTMLElement;
        Object.defineProperty(root, 'offsetWidth', { value: width, configurable: true });
        callbacks.forEach((callback) => callback([], {} as ResizeObserver));
      };

      /**
       * Lay the toolbar out on two lines: from the group holding `buttonName`
       * on, every item of the buttons container sits on the second line.
       */
      const wrapFrom = (buttonName: string) => {
        const first = container.querySelector(`[data-button="${buttonName}"]`)!.closest('.md-toolbar-group')!;
        let second = false;
        Array.from(buttonsEl().children).forEach((el) => {
          if (el === first) second = true;
          Object.defineProperty(el, 'offsetTop', { value: second ? 40 : 4, configurable: true });
        });
      };

      it('keeps the user\'s choice through a narrow width, without firing', () => {
        build();
        wrapFrom('undo');
        editor.setToolbarExpanded(true);
        const changes = recordChanges();

        resizeTo(400);
        expect(container.querySelector('.md-editor')?.classList.contains('md-editor-narrow')).toBe(true);
        expect(editor.isToolbarExpanded()).toBe(true);

        resizeTo(1200);
        expect(container.querySelector('.md-editor')?.classList.contains('md-editor-narrow')).toBe(false);
        expect(isShownExpanded()).toBe(true);
        expect(toggle().style.display).toBe('');
        expect(changes).toEqual([]);
      });

      it('makes the rows after || reachable while narrow, where they scroll into view', () => {
        build();
        const undoReachable = () =>
          container.querySelector('[data-button="undo"]')!.closest('[inert]') === null;
        expect(undoReachable()).toBe(false);

        resizeTo(400);
        expect(undoReachable()).toBe(true);

        resizeTo(1200);
        expect(undoReachable()).toBe(false);
      });

      it('hides an open toggle when every button fits on one line, and shows it once they wrap', () => {
        build({ toolbar: 'bold italic | undo redo', toolbar_expanded: true });

        resizeTo(1200);
        expect(toggle().style.display).toBe('none');
        expect(editor.isToolbarExpanded()).toBe(true);

        wrapFrom('undo');
        resizeTo(900);
        expect(toggle().style.display).toBe('');
      });

      it('keeps buttons that wrap onto a hidden line out of reach until the toggle opens', () => {
        build({ toolbar: 'bold italic | undo redo' });
        const reachable = (name: string) =>
          container.querySelector(`[data-button="${name}"]`)!.closest('[inert]') === null;

        wrapFrom('undo');
        resizeTo(900);
        expect(reachable('bold')).toBe(true);
        expect(reachable('undo')).toBe(false);

        toggle().click();
        expect(reachable('undo')).toBe(true);

        toggle().click();
        expect(reachable('undo')).toBe(false);

        resizeTo(400);
        expect(reachable('undo')).toBe(true);
      });
    });

    it('moves focus to the toggle when collapsing hides the focused button', () => {
      build();
      editor.setToolbarExpanded(true);
      const undo = container.querySelector('[data-button="undo"]') as HTMLButtonElement;
      undo.focus();
      expect(document.activeElement).toBe(undo);

      editor.setToolbarExpanded(false);

      expect(document.activeElement).toBe(toggle());
    });

    it('leaves focus alone when collapsing does not hide the focused button', () => {
      build();
      editor.setToolbarExpanded(true);
      const bold = container.querySelector('[data-button="bold"]') as HTMLButtonElement;
      bold.focus();

      editor.setToolbarExpanded(false);

      expect(document.activeElement).toBe(bold);
    });

    it('names the toggle and ties it to the buttons it shows', () => {
      build();

      expect(toggle().getAttribute('aria-label')).toBe('More');
      expect(toggle().getAttribute('aria-controls')).toBe(buttonsEl().id);
      expect(buttonsEl().id).not.toBe('');
    });
  });

  describe('Paste Markdown button', () => {
    const withButton = (): HTMLElement => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'bold pastemarkdown paste' });
      const btn = container.querySelector<HTMLElement>('[data-button="pastemarkdown"]');
      expect(btn).not.toBeNull();
      return btn!;
    };

    it('should not be in the default toolbars', () => {
      expect(container.querySelector('[data-button="pastemarkdown"]')).toBeNull();

      editor.destroy();
      editor = new HTMLEditor(container, { basicEditor: true });
      expect(container.querySelector('[data-button="pastemarkdown"]')).toBeNull();
    });

    it('should render when the toolbar string asks for it', () => {
      expect(withButton().getAttribute('title')).toBe('Paste Markdown: off');
    });

    it('should toggle the mode on click', () => {
      const btn = withButton();

      btn.click();
      expect(editor.isPasteMarkdownEnabled()).toBe(true);

      btn.click();
      expect(editor.isPasteMarkdownEnabled()).toBe(false);
    });

    it('should show the pressed state while the mode is on', () => {
      const btn = withButton();

      expect(btn.classList.contains('md-toolbar-btn-active')).toBe(false);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      btn.click();

      expect(btn.classList.contains('md-toolbar-btn-active')).toBe(true);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('title')).toBe('Paste Markdown: on');
    });

    it('should follow a change made through the editor API', () => {
      const btn = withButton();

      editor.setPasteMarkdown(true);
      // updateButtonStates runs on an interval; a click on any button also runs
      // it, so nudge it the way a user interaction would.
      container.querySelector<HTMLElement>('[data-button="bold"]')!.click();

      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('Paste as text button', () => {
    const button = () => container.querySelector('[data-button="pastetext"]') as HTMLButtonElement | null;

    it('is not in the default toolbars', () => {
      expect(button()).toBeNull();
    });

    it('is named Paste as text, and its tooltip says whether the mode is on', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste pastetext' });

      expect(button()?.getAttribute('aria-label')).toBe('Paste as text');
      expect(button()?.title).toBe('Paste as text: off');
      expect(button()?.getAttribute('aria-pressed')).toBe('false');
    });

    it('turns the mode on and off, pressed while it is on', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'pastetext' });

      button()!.click();
      expect(editor.isPasteAsTextEnabled()).toBe(true);
      expect(button()!.getAttribute('aria-pressed')).toBe('true');
      expect(button()!.classList.contains('md-toolbar-btn-active')).toBe(true);
      expect(button()!.title).toBe('Paste as text: on');

      button()!.click();
      expect(editor.isPasteAsTextEnabled()).toBe(false);
      expect(button()!.getAttribute('aria-pressed')).toBe('false');
    });

    it('starts pressed with paste_as_text, and follows a change made by code straight away', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'pastetext pastemarkdown', paste_as_text: true });
      expect(button()!.getAttribute('aria-pressed')).toBe('true');

      // Markdown mode on turns this one off.
      editor.setPasteMarkdown(true);

      expect(button()!.getAttribute('aria-pressed')).toBe('false');
      expect(container.querySelector('[data-button="pastemarkdown"]')!.getAttribute('aria-pressed')).toBe('true');

      // And the other way round, by command.
      editor.execCommand('mceTogglePlainTextPaste');

      expect(button()!.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('[data-button="pastemarkdown"]')!.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('Paste button with paste as text on', () => {
    let read: jest.Mock;

    beforeEach(() => {
      read = jest.fn();
      (navigator.clipboard as unknown as { read: jest.Mock }).read = read;
    });

    afterEach(() => {
      delete (navigator.clipboard as unknown as { read?: jest.Mock }).read;
    });

    const clipboardWith = (data: Record<string, string>) => [
      {
        types: Object.keys(data),
        getType: async (type: string) => ({ text: async () => data[type] }),
      },
    ];

    const clickPaste = async (): Promise<void> => {
      container.querySelector<HTMLElement>('[data-button="paste"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };

    const html = () =>
      editor.getContent().split(' style="font-family: arial, helvetica, sans-serif; font-size: 12pt;"').join('');

    it('inserts the plain text, not the HTML', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste', paste_as_text: true });
      read.mockResolvedValue(
        clipboardWith({ 'text/html': '<p><strong>One</strong></p><h2>Two</h2>', 'text/plain': 'One\n\nTwo **3**\nfour' }),
      );

      await clickPaste();

      expect(html()).toBe('<p>One</p><p>Two **3**<br>four</p>');
    });

    it('inserts the text of the HTML when the plain text is only whitespace, as Ctrl+V does', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste', paste_as_text: true });
      read.mockResolvedValue(clipboardWith({ 'text/plain': '  ', 'text/html': '<b>Hi</b>' }));

      await clickPaste();

      expect(html()).toBe('<p>Hi</p>');
    });

    it('inserts the text of the HTML when the clipboard has no plain text', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste', paste_as_text: true });
      read.mockResolvedValue(clipboardWith({ 'text/html': '<p><em>Only</em> HTML</p>' }));

      await clickPaste();

      expect(html()).toBe('<p>Only HTML</p>');
    });
  });

  describe('Paste button with Markdown mode on', () => {
    let read: jest.Mock;

    beforeEach(() => {
      // setup.ts installs a clipboard mock with only writeText/readText, and the
      // property is not configurable, so add read() to the object it made.
      read = jest.fn();
      (navigator.clipboard as unknown as { read: jest.Mock }).read = read;
    });

    afterEach(() => {
      delete (navigator.clipboard as unknown as { read?: jest.Mock }).read;
    });

    /** Clipboard with both flavours, as a code editor would provide. */
    const clipboardWith = (data: Record<string, string>) => [
      {
        types: Object.keys(data),
        getType: async (type: string) => ({ text: async () => data[type] }),
      },
    ];

    const clickPaste = async (): Promise<void> => {
      container.querySelector<HTMLElement>('[data-button="paste"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };

    it('should convert the plain text even when the clipboard also has HTML', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste', paste_markdown: true });
      read.mockResolvedValue(
        clipboardWith({ 'text/plain': '# Heading', 'text/html': '<span style="color:#f00"># Heading</span>' })
      );

      await clickPaste();

      expect(editor.getContent()).toMatch(/<h1[^>]*>Heading<\/h1>/);
      expect(editor.getContent()).not.toContain('color:');
    });

    it('should insert literal text when the mode is off', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste' });
      read.mockResolvedValue(clipboardWith({ 'text/plain': '# Heading' }));

      await clickPaste();

      expect(editor.getContent()).toContain('# Heading');
      expect(editor.getContent()).not.toContain('<h1');
    });

    it('should keep text typed after pasted HTML that ends in a link out of the link', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste' });
      read.mockResolvedValue(clipboardWith({ 'text/html': 'see <a href="https://example.com">site</a>' }));

      await clickPaste();
      const view = editor.getTipTap()!.view;
      for (const ch of ' more') {
        const at = view.state.selection.from;
        view.dispatch(view.state.tr.insertText(ch, at, at));
      }

      expect(editor.getContent()).toMatch(/<a [^>]*>site<\/a> more/);
    });

    it('should use the clipboard HTML when the plain text is only whitespace', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste', paste_markdown: true });
      read.mockResolvedValue(clipboardWith({ 'text/plain': '   \n  ', 'text/html': '<p>from html</p>' }));

      await clickPaste();

      expect(editor.getContent()).toContain('from html');
    });

    it('should fall back to a plain-text paste when the Markdown is too expensive', async () => {
      editor.destroy();
      editor = new HTMLEditor(container, { toolbar: 'paste', paste_markdown: true });
      read.mockResolvedValue(clipboardWith({ 'text/plain': '# ' + 'a'.repeat(5001) }));

      await clickPaste();

      expect(editor.getTipTap()!.getText()).toContain('# aaa');
      expect(editor.getContent()).not.toContain('<h1');
    });
  });

  describe('Preview', () => {
    let openSpy: jest.Spied<typeof window.open>;
    let write: jest.Mock;
    let close: jest.Mock;

    beforeEach(() => {
      write = jest.fn();
      close = jest.fn();
      openSpy = jest
        .spyOn(window, 'open')
        .mockReturnValue({ document: { write, close } } as unknown as Window);
    });

    afterEach(() => {
      openSpy.mockRestore();
    });

    /** Click Preview and return the markup written into the popup. */
    const openPreview = (): string => {
      const btn = container.querySelector<HTMLElement>('[data-button="preview"]');
      expect(btn).not.toBeNull();
      btn!.click();
      expect(write).toHaveBeenCalledTimes(1);
      return write.mock.calls[0][0] as string;
    };

    it('should put the CSP meta first in the head', () => {
      const doc = new DOMParser().parseFromString(openPreview(), 'text/html');
      const meta = doc.head.firstElementChild;

      expect(meta?.tagName).toBe('META');
      expect(meta?.getAttribute('http-equiv')).toBe('Content-Security-Policy');
      expect(meta?.getAttribute('content')).toBe(PREVIEW_CSP);
    });

    it('should write the CSP meta before any other element', () => {
      // A meta CSP governs only what is parsed after it, and one written into
      // the body is ignored outright. Assert on the raw string, because the
      // parser hoists a stray meta into <head> and hides that.
      const written = openPreview();
      const csp = written.search(/<meta[^>]*Content-Security-Policy/i);

      expect(csp).toBeGreaterThan(-1);
      expect(csp).toBeLessThan(written.indexOf('<title'));
      expect(csp).toBeLessThan(written.indexOf('<style'));
    });

    it('should pin the policy to one that blocks script but keeps images and inline styles', () => {
      // Pinned whole: a directive dropped from the middle is a silent weakening
      // that per-directive checks would miss.
      expect(PREVIEW_CSP).toBe(
        "default-src 'none'; img-src * data: blob: cid:; " +
          "style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
      );
      expect(PREVIEW_CSP).toContain("default-src 'none'");
      expect(PREVIEW_CSP).not.toContain('script-src');
      expect(PREVIEW_CSP).not.toContain("'unsafe-eval'");
      // 'unsafe-inline' is for styles only — the content carries inline style
      // attributes everywhere (font size, color, alignment).
      expect(PREVIEW_CSP).toContain("style-src 'unsafe-inline'");
      expect(PREVIEW_CSP.match(/'unsafe-inline'/g)).toHaveLength(1);
      expect(PREVIEW_CSP).toContain('img-src * data: blob: cid:');
      // Neither is covered by default-src, so both have to be stated.
      expect(PREVIEW_CSP).toContain("base-uri 'none'");
      expect(PREVIEW_CSP).toContain("form-action 'none'");
    });

    it("should show the content right to left with directionality: 'rtl'", () => {
      editor.destroy();
      editor = new HTMLEditor(container, { directionality: 'rtl' });

      const doc = new DOMParser().parseFromString(openPreview(), 'text/html');

      expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    });

    it('should still write the editor content and close the document', () => {
      editor.setContent('<p>Hello <strong>world</strong></p>');

      const doc = new DOMParser().parseFromString(openPreview(), 'text/html');

      expect(doc.body.textContent).toContain('Hello world');
      expect(doc.body.querySelector('strong')).not.toBeNull();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('should not throw when the popup is blocked', () => {
      openSpy.mockReturnValue(null);

      const btn = container.querySelector<HTMLElement>('[data-button="preview"]');
      expect(() => btn!.click()).not.toThrow();
      expect(write).not.toHaveBeenCalled();
    });
  });
});
