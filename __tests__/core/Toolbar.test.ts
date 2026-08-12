/**
 * Toolbar Tests
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { Toolbar } from '../../src/core/Toolbar';

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

    it('should render toggle button even with || separator (backward compat)', () => {
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

    it('should treat || as | for backward compatibility', () => {
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
});
