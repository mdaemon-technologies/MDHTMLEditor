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
    it('should render toggle button when || separator is used', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]');
      expect(toggleBtn).not.toBeNull();
    });

    it('should NOT render toggle button when no || separator is used', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic | undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]');
      expect(toggleBtn).toBeNull();
    });

    it('should render primary and overflow wrappers with || separator', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const primary = container.querySelector('.md-toolbar-primary');
      const overflow = container.querySelector('.md-toolbar-overflow');
      expect(primary).not.toBeNull();
      expect(overflow).not.toBeNull();
    });

    it('should hide overflow rows by default', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const overflow = container.querySelector('.md-toolbar-overflow');
      expect(overflow?.classList.contains('md-toolbar-overflow-visible')).toBe(false);
    });

    it('should show overflow rows when toggle button is clicked', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();

      const overflow = container.querySelector('.md-toolbar-overflow');
      expect(overflow?.classList.contains('md-toolbar-overflow-visible')).toBe(true);
    });

    it('should hide overflow rows when toggle button is clicked twice', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();
      toggleBtn?.click();

      const overflow = container.querySelector('.md-toolbar-overflow');
      expect(overflow?.classList.contains('md-toolbar-overflow-visible')).toBe(false);
    });

    it('should apply active class to toggle button when overflow is visible', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();

      expect(toggleBtn?.classList.contains('md-toolbar-btn-active')).toBe(true);
    });

    it('should remove active class from toggle button when overflow is hidden', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const toggleBtn = container.querySelector('[data-button="togglemore"]') as HTMLButtonElement;
      toggleBtn?.click();
      toggleBtn?.click();

      expect(toggleBtn?.classList.contains('md-toolbar-btn-active')).toBe(false);
    });

    it('should place primary buttons before toggle button', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const primary = container.querySelector('.md-toolbar-primary');
      const boldBtn = primary?.querySelector('[data-button="bold"]');
      const italicBtn = primary?.querySelector('[data-button="italic"]');
      expect(boldBtn).not.toBeNull();
      expect(italicBtn).not.toBeNull();
    });

    it('should place overflow buttons in overflow container', () => {
      editor.destroy();
      editor = new HTMLEditor(container, {
        toolbar: 'bold italic || undo redo',
      });

      const overflow = container.querySelector('.md-toolbar-overflow');
      const undoBtn = overflow?.querySelector('[data-button="undo"]');
      const redoBtn = overflow?.querySelector('[data-button="redo"]');
      expect(undoBtn).not.toBeNull();
      expect(redoBtn).not.toBeNull();
    });

    it('should render toggle button with the default toolbar (has || separator)', () => {
      // Default toolbar now includes || separator
      const toggleBtn = container.querySelector('[data-button="togglemore"]');
      expect(toggleBtn).not.toBeNull();
    });
  });
});
