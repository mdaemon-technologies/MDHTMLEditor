/**
 * Labels the host supplies (a custom button's text, template and style titles,
 * translations) are text, as in TinyMCE: markup in one shows as written and is
 * never parsed into the toolbar, its menus or the dialogs.
 */

import { HTMLEditor, setTranslate, resetTranslate } from '../../src/core/HTMLEditor';
import { AnchorDialog } from '../../src/extensions/AnchorDialog';
import { LinkEditor } from '../../src/extensions/LinkEditor';
import { SearchReplace } from '../../src/extensions/SearchReplace';
import { SourceEditor } from '../../src/extensions/SourceEditor';
import { CharacterMap } from '../../src/extensions/CharacterMap';
import { EmojiPicker } from '../../src/extensions/Emoji';
import { SpeechToText } from '../../src/extensions/SpeechToText';

const MARKUP = '<b class="injected">Bold</b> & co';
const marked = (key: string): string => `<b class="injected">${key}</b>`;

/** No markup from a label was parsed into an element anywhere on the page. */
const expectNoInjected = (): void => {
  expect(document.querySelector('.injected')).toBeNull();
};

describe('Labels are text, not HTML', () => {
  let container: HTMLElement;
  let editor: HTMLEditor | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    editor = undefined;
    resetTranslate();
    container.remove();
    document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  describe('toolbar', () => {
    it("shows a custom button's text as written", () => {
      editor = new HTMLEditor(container, {
        toolbar: 'mybutton',
        setup: (ed) => {
          ed.ui.registry.addButton('mybutton', { text: MARKUP, onAction: jest.fn() });
        },
      });

      expectNoInjected();
      expect(container.querySelector('[data-button="mybutton"] .md-toolbar-btn-text')?.textContent).toBe(MARKUP);
    });

    it("shows a template's title and description as written", () => {
      editor = new HTMLEditor(container, {
        toolbar: 'template',
        templates: [{ title: MARKUP, description: `${MARKUP} desc`, content: '<p>x</p>' }],
      });

      expectNoInjected();
      const item = document.querySelector('[data-dropdown-menu="template"] .md-toolbar-dropdown-item');
      expect(item?.querySelector('.md-toolbar-dropdown-item-label')?.textContent).toBe(MARKUP);
      expect(item?.querySelector('.md-toolbar-dropdown-item-desc')?.textContent).toBe(`${MARKUP} desc`);
    });

    it("shows a style format's title as written", () => {
      editor = new HTMLEditor(container, {
        toolbar: 'styles',
        style_formats: [{ title: MARKUP, inline: 'span', classes: 'note' }],
      });

      expectNoInjected();
      expect(
        document.querySelector('[data-dropdown-menu="styles"] .md-toolbar-dropdown-item-label')?.textContent,
      ).toBe(MARKUP);
    });

    it('shows table border width and style titles as written, with the icon face kept', () => {
      editor = new HTMLEditor(container, {
        toolbar: 'tablecellborderwidth tablecellborderstyle',
        table_border_widths: [{ title: MARKUP, value: '1px' }],
        table_border_styles: [{ title: `${MARKUP} style`, value: 'solid' }],
      });

      expectNoInjected();
      const labels = (name: string) =>
        Array.from(document.querySelectorAll(`[data-dropdown-menu="${name}"] .md-toolbar-dropdown-item-label`)).map(
          (el) => el.textContent,
        );
      expect(labels('tablecellborderwidth')).toContain(MARKUP);
      expect(labels('tablecellborderstyle')).toContain(`${MARKUP} style`);
      // The trigger shows the built-in icon, still parsed as SVG.
      expect(
        container.querySelector('[data-dropdown="tablecellborderwidth"] .md-toolbar-dropdown-label .md-icon-tablecellborderwidth svg'),
      ).not.toBeNull();
    });

    it('shows translated dropdown and color picker labels as written', () => {
      setTranslate(marked);
      editor = new HTMLEditor(container, { toolbar: 'fontfamily forecolor' });

      expectNoInjected();
      expect(
        container.querySelector('[data-dropdown="fontfamily"] .md-toolbar-dropdown-label')?.textContent,
      ).toBe(marked('Font'));
      expect(document.querySelector('.md-toolbar-colorpicker-apply')?.textContent).toBe(marked('Apply'));
    });
  });

  describe('dialogs', () => {
    const headingText = (): string | null | undefined =>
      document.querySelector('.md-dialog-overlay h3')?.textContent;

    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('anchor dialog', () => {
      new AnchorDialog({ editor: editor!, trans: marked }).open();
      expectNoInjected();
      expect(headingText()).toBe(marked('Insert anchor'));
    });

    it('link dialog', () => {
      new LinkEditor({ editor: editor!, trans: marked }).open();
      expectNoInjected();
      expect(headingText()).toBe(marked('Insert/Edit Link'));
      const options = Array.from(document.querySelectorAll('.md-dialog-overlay option')).map((o) => o.textContent);
      expect(options).toEqual([marked('Current window'), marked('New window')]);
    });

    it('find and replace dialog', () => {
      new SearchReplace({ editor: editor!, trans: marked }).open();
      expectNoInjected();
      expect(headingText()).toBe(marked('Find and Replace'));
    });

    it('source code dialog', () => {
      new SourceEditor({ editor: editor!, trans: marked }).open();
      expectNoInjected();
      expect(headingText()).toBe(marked('Source code'));
    });

    it('special character dialog', () => {
      new CharacterMap({ onSelect: jest.fn(), trans: marked }).open();
      expectNoInjected();
      expect(headingText()).toBe(marked('Special Character'));
    });

    it('emoticons dialog', () => {
      new EmojiPicker({ onSelect: jest.fn(), trans: marked }).open();
      expectNoInjected();
      expect(headingText()).toBe(marked('Emoticons'));
    });

    describe('speech to text dialog', () => {
      const win = window as unknown as { SpeechRecognition?: unknown };
      let original: unknown;

      beforeEach(() => {
        original = win.SpeechRecognition;
        win.SpeechRecognition = class {
          continuous = false;
          interimResults = false;
          lang = '';
          start(): void {}
          stop(): void {}
          abort(): void {}
        };
      });

      afterEach(() => {
        win.SpeechRecognition = original;
      });

      it('shows its heading as written', () => {
        const dialog = new SpeechToText({ editor: editor!, trans: marked });
        dialog.open();
        expectNoInjected();
        expect(headingText()).toBe(marked('Speech to Text'));
        dialog.destroy();
      });
    });
  });
});
