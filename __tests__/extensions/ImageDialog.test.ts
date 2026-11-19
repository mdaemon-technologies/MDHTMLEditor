/**
 * The image dialog: insert an image, or edit the selected one.
 */

import { closeHistory } from '@tiptap/pm/history';
import { NodeSelection } from '@tiptap/pm/state';
import { HTMLEditor, resetTranslate } from '../../src/core/HTMLEditor';
import { getLocale } from '../../src/i18n';
import { ImageDialog, imageSource } from '../../src/extensions/ImageDialog';
import type { EditorConfig } from '../../src/types';

const SRC = 'https://example.com/photo.png';
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

let container: HTMLElement;
let editor: HTMLEditor;
let dialog: ImageDialog;

function make(config: EditorConfig = {}, content = '<p>Hello</p>'): HTMLEditor {
  editor = new HTMLEditor(container, config);
  editor.setContent(content);
  dialog = new ImageDialog({ editor, trans: (key) => key });
  return editor;
}

const tiptap = () => editor.getTipTap()!;
/** End the current undo step, so the next change is one of its own. */
const newUndoStep = () => tiptap().view.dispatch(closeHistory(tiptap().state.tr));
const root = () => document.querySelector('.md-image-dialog') as HTMLElement | null;
const overlay = () => document.querySelector('.md-dialog-overlay') as HTMLElement | null;
const field = <T extends HTMLElement = HTMLInputElement>(name: string) =>
  root()?.querySelector(`[name="${name}"]`) as T;
const saveButton = () => root()?.querySelector('.md-image-dialog-save') as HTMLButtonElement;
const cancelButton = () => root()?.querySelector('.md-image-dialog-cancel') as HTMLButtonElement;

/** Type into a field as the user would: the value, then an input event. */
function type(name: string, value: string): void {
  const input = field(name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(keyName: string, target: EventTarget = document.activeElement ?? document.body, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

/** The images in the document, as their attributes. */
function images(): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  tiptap().state.doc.descendants((node) => {
    if (node.type.name === 'image') found.push(node.attrs);
  });
  return found;
}

/** The first image of getContent(), parsed. */
function outputImage(): HTMLImageElement | null {
  return new DOMParser().parseFromString(editor.getContent(), 'text/html').body.querySelector('img');
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  dialog?.destroy();
  editor?.destroy();
  container?.remove();
  document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
  resetTranslate();
});

describe('imageSource', () => {
  it.each([
    [SRC, SRC],
    ['  https://example.com/a b.png ', 'https://example.com/a%20b.png'],
    ['http://example.com/a.gif', 'http://example.com/a.gif'],
    ['/images/a.png', '/images/a.png'],
    ['images/a.png', 'images/a.png'],
    [PNG, PNG],
    ['data:image/jpeg;base64,/9j/4AAQ', 'data:image/jpeg;base64,/9j/4AAQ'],
  ])('accepts %s', (value, expected) => {
    expect(imageSource(value)).toBe(expected);
  });

  it.each([
    ['javascript:alert(1)'],
    ['java\u0001script:alert(1)'],
    ['JAVASCRIPT:alert(1)'],
    ['vbscript:x'],
    ['data:text/html,<script>alert(1)</script>'],
    ['data:image/png'],
    ['data:,hello'],
    ['file:///etc/passwd'],
    [''],
    ['   '],
  ])('refuses %j', (value) => {
    expect(imageSource(value)).toBeNull();
  });

  it('strips control characters before checking', () => {
    expect(imageSource('https://example.com/\u0000a.png')).toBe('https://example.com/a.png');
  });

  describe('an SVG data URI', () => {
    const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${body}</svg>`;

    it('keeps a harmless SVG, re-encoded', () => {
      const out = imageSource(`data:image/svg+xml;base64,${btoa(svg('<rect width="5" height="5"/>'))}`);
      expect(out).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(atob(out!.split(',')[1])).toContain('<rect');
    });

    it('cleans a script out of a base64 SVG', () => {
      const out = imageSource(`data:image/svg+xml;base64,${btoa(svg('<script>alert(1)</script><rect width="5" height="5"/>'))}`);
      expect(out).not.toBeNull();
      expect(atob(out!.split(',')[1])).not.toContain('script');
    });

    it('cleans a URL-encoded SVG', () => {
      const out = imageSource(`data:image/svg+xml,${encodeURIComponent(svg('<rect onload="alert(1)" width="5" height="5"/>'))}`);
      expect(out).not.toBeNull();
      expect(atob(out!.split(',')[1])).not.toContain('onload');
    });

    it('refuses one that is not an SVG', () => {
      expect(imageSource(`data:image/svg+xml;base64,${btoa('<html><body>x</body></html>')}`)).toBeNull();
      expect(imageSource('data:image/svg+xml;base64,@@@')).toBeNull();
    });
  });
});

describe('opening', () => {
  it('opens a modal dialog titled Insert image when no image is selected', () => {
    make();
    dialog.open();
    expect(root()?.getAttribute('role')).toBe('dialog');
    expect(root()?.getAttribute('aria-modal')).toBe('true');
    const title = root()?.querySelector('h3');
    expect(title?.textContent).toBe('Insert image');
    expect(root()?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(saveButton().textContent).toBe('Insert');
  });

  it('takes the skin of the editor', () => {
    make({ skin: 'oxide-dark' });
    dialog.open();
    expect(root()?.closest('.md-editor-oxide-dark')).not.toBeNull();
  });

  it('focuses the Source field', () => {
    make();
    dialog.open();
    expect(document.activeElement).toBe(field('src'));
  });

  it('labels each field', () => {
    make();
    dialog.open();
    for (const [name, label] of [['src', 'Source'], ['alt', 'Alt text']]) {
      const input = field(name);
      expect(root()?.querySelector(`label[for="${input.id}"]`)?.textContent).toBe(label);
    }
  });

  it('is built again on each open, in the current language', () => {
    make();
    let words = (k: string) => k;
    dialog = new ImageDialog({ editor, trans: (k) => words(k) });
    dialog.open();
    dialog.close();
    words = (k) => (k === 'Insert image' ? 'Bild einfügen' : k);
    dialog.open();
    expect(root()?.querySelector('h3')?.textContent).toBe('Bild einfügen');
    expect(document.querySelectorAll('.md-image-dialog')).toHaveLength(1);
  });

  it('says whether it is open', () => {
    make();
    expect(dialog.isOpen()).toBe(false);
    dialog.open();
    expect(dialog.isOpen()).toBe(true);
    dialog.close();
    expect(dialog.isOpen()).toBe(false);
  });
});

describe('inserting', () => {
  it('keeps Insert off until Source is an image address', () => {
    make();
    dialog.open();
    expect(saveButton().disabled).toBe(true);
    type('src', 'javascript:alert(1)');
    expect(saveButton().disabled).toBe(true);
    type('src', SRC);
    expect(saveButton().disabled).toBe(false);
    type('src', '');
    expect(saveButton().disabled).toBe(true);
  });

  it('inserts the image with its alt text at the caret, and closes', () => {
    make();
    tiptap().commands.setTextSelection(6);
    dialog.open();
    type('src', SRC);
    type('alt', '  A photo ');
    saveButton().click();
    expect(images()).toEqual([expect.objectContaining({ src: SRC, alt: 'A photo' })]);
    expect(tiptap().state.doc.textContent).toBe('Hello');
    expect(dialog.isOpen()).toBe(false);
  });

  it('writes no alt attribute when none is given', () => {
    make();
    dialog.open();
    type('src', SRC);
    saveButton().click();
    expect(outputImage()?.hasAttribute('alt')).toBe(false);
  });

  it('inserts a data:image address', () => {
    make();
    dialog.open();
    type('src', PNG);
    saveButton().click();
    expect(images()[0].src).toBe(PNG);
  });

  it('inserts in one undo step', () => {
    make();
    newUndoStep();
    dialog.open();
    type('src', SRC);
    saveButton().click();
    tiptap().commands.undo();
    expect(images()).toHaveLength(0);
    expect(tiptap().state.doc.textContent).toBe('Hello');
  });

  it('inserts when Enter is pressed in a text field', () => {
    make();
    dialog.open();
    type('src', SRC);
    const event = key('Enter', field('src'));
    expect(event.defaultPrevented).toBe(true);
    expect(images()).toHaveLength(1);
  });

  it('does nothing on Enter while Source is not valid', () => {
    make();
    dialog.open();
    type('src', 'javascript:alert(1)');
    key('Enter', field('src'));
    expect(images()).toHaveLength(0);
    expect(dialog.isOpen()).toBe(true);
  });

  it('inserts nothing into a read-only editor', () => {
    make();
    dialog.open();
    type('src', SRC);
    editor.setReadOnly(true);
    saveButton()?.click();
    expect(images()).toHaveLength(0);
  });
});

describe('closing', () => {
  it.each([
    ['Cancel', () => cancelButton().click()],
    ['the close button', () => (root()?.querySelector('.md-dialog-close') as HTMLButtonElement).click()],
    ['Escape', () => key('Escape')],
    ['a click beside the dialog', () => overlay()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))],
  ])('closes without inserting on %s, and gives focus back to the editor', (_name, close) => {
    make();
    dialog.open();
    type('src', SRC);
    const focus = jest.spyOn(editor, 'focus');
    close();
    expect(dialog.isOpen()).toBe(false);
    expect(images()).toHaveLength(0);
    expect(focus).toHaveBeenCalled();
  });

  it('stops hearing the page keys once closed', () => {
    make();
    dialog.open();
    dialog.close();
    const event = key('Escape', document.body);
    expect(event.defaultPrevented).toBe(false);
  });

  it('keeps Tab within the dialog', () => {
    make();
    dialog.open();
    const close = root()!.querySelector('.md-dialog-close') as HTMLButtonElement;
    cancelButton().focus();
    const event = key('Tab', cancelButton());
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    key('Tab', close, { shiftKey: true });
    expect(document.activeElement).toBe(cancelButton());
  });

  it('counts a select among what Tab cycles through', () => {
    make();
    dialog.open();
    // With the buttons after it out of the way, Alignment is the last stop.
    (root()!.querySelector('.md-dialog-close') as HTMLButtonElement).disabled = true;
    cancelButton().disabled = true;
    const align = field<HTMLSelectElement>('align');
    align.focus();
    const event = key('Tab', align);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(root()!.querySelector('[role="tab"][aria-selected="true"]'));
  });

  it('skips the tabs that are not selected, which the arrow keys reach', () => {
    make();
    dialog.open();
    const tabs = Array.from(root()!.querySelectorAll<HTMLElement>('[role="tab"]'));
    const close = root()!.querySelector('.md-dialog-close') as HTMLButtonElement;
    close.focus();
    key('Tab', close, { shiftKey: true });
    expect(document.activeElement).not.toBe(tabs[tabs.length - 1]);
  });
});

describe('editing the selected image', () => {
  const IMG = `<p>a<img src="${SRC}" alt="Old" title="T">b</p>`;

  function select(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }

  it('opens titled Image properties, with the fields filled from the image', () => {
    make({}, IMG);
    select();
    dialog.open();
    expect(root()?.querySelector('h3')?.textContent).toBe('Image properties');
    expect(saveButton().textContent).toBe('Save');
    expect(saveButton().disabled).toBe(false);
    expect(field('src').value).toBe(SRC);
    expect(field('alt').value).toBe('Old');
  });

  it('changes the image in place, keeping what the dialog does not show', () => {
    make({}, `<p>a<img src="${SRC}" alt="Old" width="200" height="100" usemap="#m">b</p><map name="m"><area shape="rect" coords="0,0,1,1" href="https://example.com/x" alt="x"></map>`);
    select();
    dialog.open();
    type('alt', 'New');
    saveButton().click();
    expect(images()).toEqual([expect.objectContaining({ src: SRC, alt: 'New', width: 200, height: 100, usemap: '#m' })]);
    expect(tiptap().state.doc.firstChild?.textContent).toBe('ab');
  });

  it('keeps the image selected after saving', () => {
    make({}, IMG);
    select();
    dialog.open();
    type('alt', 'New');
    saveButton().click();
    const selection = tiptap().state.selection;
    expect(selection instanceof NodeSelection && selection.node.type.name).toBe('image');
    expect(selection.from).toBe(2);
  });

  it('saves in one undo step', () => {
    make({}, IMG);
    newUndoStep();
    select();
    dialog.open();
    type('alt', 'New');
    saveButton().click();
    tiptap().commands.undo();
    expect(images()[0].alt).toBe('Old');
  });

  it('clears the alt text when the field is emptied', () => {
    make({}, IMG);
    select();
    dialog.open();
    type('alt', '');
    saveButton().click();
    expect(images()[0].alt).toBeNull();
  });

  it('saves an unchanged address the insert check would refuse', () => {
    make({}, '<p>a<img src="cid:part1@example.test" alt="Old">b</p>');
    select();
    dialog.open();
    expect(saveButton().disabled).toBe(false);
    type('alt', 'New');
    saveButton().click();
    expect(images()[0]).toEqual(expect.objectContaining({ src: 'cid:part1@example.test', alt: 'New' }));
  });

  it('refuses a new address that is not an image address', () => {
    make({}, IMG);
    select();
    dialog.open();
    type('src', 'javascript:alert(1)');
    expect(saveButton().disabled).toBe(true);
    saveButton().click();
    expect(images()[0].src).toBe(SRC);
  });

  it('does nothing when the image changed while the dialog was open', () => {
    make({}, IMG);
    select();
    dialog.open();
    type('alt', 'New');
    tiptap().commands.setContent(`<p>other <img src="https://example.com/other.png"></p>`);
    saveButton().click();
    expect(images()).toEqual([expect.objectContaining({ src: 'https://example.com/other.png', alt: null })]);
    expect(dialog.isOpen()).toBe(false);
  });

  it('opens in insert mode when the caret, not the image, is selected', () => {
    make({}, IMG);
    tiptap().commands.setTextSelection(1);
    dialog.open();
    expect(root()?.querySelector('h3')?.textContent).toBe('Insert image');
    expect(field('src').value).toBe('');
  });
});

describe('the General tab', () => {
  const IMG = `<p>a<img src="${SRC}" alt="Old" title="T" width="200" height="100">b</p>`;

  function select(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }

  /** The preview image, made to have loaded at the given natural size. */
  function loadPreview(width: number, height: number): void {
    const img = root()!.querySelector('.md-image-dialog-preview img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
    img.dispatchEvent(new Event('load'));
  }

  const lock = () => root()!.querySelector('.md-image-dialog-lock') as HTMLButtonElement;
  const reset = () => root()!.querySelector('.md-image-dialog-reset') as HTMLButtonElement;

  describe('width and height', () => {
    it('are filled from the image', () => {
      make({}, IMG);
      select();
      dialog.open();
      expect(field('width').value).toBe('200');
      expect(field('height').value).toBe('100');
    });

    it('are saved as the image attributes, a percentage as written', () => {
      make({}, IMG);
      select();
      dialog.open();
      lock().click();
      type('width', '50%');
      type('height', '');
      saveButton().click();
      expect(images()[0]).toEqual(expect.objectContaining({ width: '50%', height: null }));
      expect(outputImage()?.getAttribute('width')).toBe('50%');
      expect(outputImage()?.hasAttribute('height')).toBe(false);
    });

    it('take a number with px as pixels', () => {
      make();
      dialog.open();
      type('src', SRC);
      lock().click();
      type('width', '120px');
      type('height', ' 80 ');
      saveButton().click();
      expect(images()[0]).toEqual(expect.objectContaining({ width: 120, height: 80 }));
    });

    it.each(['auto', '-5', '1.5em', 'calc(1px)', '100" onerror="x', '12.5'])('mark %j, and hold Save until it is fixed', (value) => {
      make();
      dialog.open();
      type('src', SRC);
      lock().click();
      type('width', value);
      expect(field('width').getAttribute('aria-invalid')).toBe('true');
      expect(saveButton().disabled).toBe(true);
      type('width', '');
      expect(field('width').hasAttribute('aria-invalid')).toBe(false);
      expect(saveButton().disabled).toBe(false);
    });

    it('keep an unchanged value the dialog would not write', () => {
      make({}, `<p>a<img src="${SRC}" width="auto">b</p>`);
      select();
      dialog.open();
      type('alt', 'x');
      saveButton().click();
      expect(images()[0].width).toBe('auto');
    });

    it('have labels', () => {
      make();
      dialog.open();
      expect(root()?.querySelector(`label[for="${field('width').id}"]`)?.textContent).toBe('Width');
      expect(root()?.querySelector(`label[for="${field('height').id}"]`)?.textContent).toBe('Height');
    });
  });

  describe('Constrain proportions', () => {
    it('is a labelled toggle, on at first', () => {
      make();
      dialog.open();
      expect(lock().getAttribute('aria-pressed')).toBe('true');
      expect(lock().getAttribute('aria-label')).toBe('Constrain proportions');
      lock().click();
      expect(lock().getAttribute('aria-pressed')).toBe('false');
    });

    it('keeps the ratio of the given size while on', () => {
      make({}, IMG);
      select();
      dialog.open();
      type('width', '300');
      expect(field('height').value).toBe('150');
      type('height', '50');
      expect(field('width').value).toBe('100');
    });

    it("keeps the image's own ratio once it has loaded, when no size is set", () => {
      make();
      dialog.open();
      type('src', SRC);
      loadPreview(400, 300);
      type('width', '200');
      expect(field('height').value).toBe('150');
    });

    it("keeps the shape a sized image has, not the picture's own, once it has loaded", () => {
      make({}, IMG);
      select();
      dialog.open();
      loadPreview(640, 480);
      type('width', '300');
      expect(field('height').value).toBe('150');
    });

    it('leaves the other side alone while off', () => {
      make({}, IMG);
      select();
      dialog.open();
      lock().click();
      type('width', '300');
      expect(field('height').value).toBe('100');
    });

    it('clears the height for a percentage width', () => {
      make({}, IMG);
      select();
      dialog.open();
      type('width', '50%');
      expect(field('height').value).toBe('');
    });

    it('leaves the other side alone when no ratio is known', () => {
      make();
      dialog.open();
      type('src', SRC);
      type('width', '300');
      expect(field('height').value).toBe('');
    });
  });

  describe('Reset size', () => {
    it("fills in the image's own size", () => {
      make({}, IMG);
      select();
      dialog.open();
      loadPreview(640, 480);
      reset().click();
      expect(field('width').value).toBe('640');
      expect(field('height').value).toBe('480');
      expect(reset().getAttribute('aria-label')).toBe('Reset size');
    });

    it('clears the size while the image has not loaded', () => {
      make({}, IMG);
      select();
      dialog.open();
      reset().click();
      expect(field('width').value).toBe('');
      expect(field('height').value).toBe('');
    });
  });

  it('has no size fields with image_dimensions off, and keeps the size', () => {
    make({ image_dimensions: false }, IMG);
    select();
    dialog.open();
    expect(field('width')).toBeNull();
    expect(lock()).toBeNull();
    expect(reset()).toBeNull();
    type('alt', 'x');
    saveButton().click();
    expect(images()[0]).toEqual(expect.objectContaining({ width: 200, height: 100 }));
  });

  describe('Title', () => {
    it('is there with image_title on', () => {
      make({ image_title: true }, IMG);
      select();
      dialog.open();
      expect(field('title').value).toBe('T');
      type('title', ' New title ');
      saveButton().click();
      expect(images()[0].title).toBe('New title');
    });

    it('is not on the General tab with image_title off, and the title is kept', () => {
      make({}, IMG);
      select();
      dialog.open();
      const general = root()!.querySelector('.md-image-dialog-panel')!;
      expect(general.querySelector('[name="title"]')).toBeNull();
      type('alt', 'x');
      saveButton().click();
      expect(images()[0].title).toBe('T');
    });
  });

  describe('Alt text', () => {
    it('is not there with image_description off, and the alt text is kept', () => {
      make({ image_description: false }, IMG);
      select();
      dialog.open();
      expect(field('alt')).toBeNull();
      type('src', 'https://example.com/new.png');
      saveButton().click();
      expect(images()[0]).toEqual(expect.objectContaining({ src: 'https://example.com/new.png', alt: 'Old' }));
    });
  });

  describe('Image is decorative', () => {
    const decorative = () => field('decorative');

    it('is there only with a11y_advanced_options on', () => {
      make();
      dialog.open();
      expect(decorative()).toBeNull();
    });

    it('writes an empty alt and turns the alt field off', () => {
      make({ a11y_advanced_options: true });
      dialog.open();
      type('src', SRC);
      type('alt', 'Words');
      decorative().click();
      expect(field('alt').disabled).toBe(true);
      saveButton().click();
      expect(images()[0].alt).toBe('');
      expect(outputImage()?.getAttribute('alt')).toBe('');
    });

    it('is labelled', () => {
      make({ a11y_advanced_options: true });
      dialog.open();
      expect(root()?.querySelector(`label[for="${decorative().id}"]`)?.textContent).toBe('Image is decorative');
    });

    it('is on for an image whose alt is empty', () => {
      make({ a11y_advanced_options: true }, `<p>a<img src="${SRC}" alt="">b</p>`);
      select();
      dialog.open();
      expect(decorative().checked).toBe(true);
      expect(field('alt').disabled).toBe(true);
    });

    it('is off for an image with no alt', () => {
      make({ a11y_advanced_options: true }, `<p>a<img src="${SRC}">b</p>`);
      select();
      dialog.open();
      expect(decorative().checked).toBe(false);
    });

    it('turned off, lets the alt text be saved again', () => {
      make({ a11y_advanced_options: true }, `<p>a<img src="${SRC}" alt="">b</p>`);
      select();
      dialog.open();
      decorative().click();
      type('alt', 'Now described');
      saveButton().click();
      expect(images()[0].alt).toBe('Now described');
    });
  });

  describe('Alignment', () => {
    const align = () => field<HTMLSelectElement>('align');
    const choose = (value: string) => {
      align().value = value;
      align().dispatchEvent(new Event('change', { bubbles: true }));
    };

    it('offers None, Left and Right', () => {
      make();
      dialog.open();
      expect(Array.from(align().options).map((o) => [o.value, o.textContent])).toEqual([
        ['', 'None'], ['left', 'Left'], ['right', 'Right'],
      ]);
    });

    it('floats the image', () => {
      make();
      dialog.open();
      type('src', SRC);
      choose('right');
      saveButton().click();
      expect(outputImage()?.getAttribute('style')).toBe('float: right;');
    });

    it('is read from the image, and None removes only the float', () => {
      make({}, `<p>a<img src="${SRC}" style="float: left; margin-left: 4px">b</p>`);
      select();
      dialog.open();
      expect(align().value).toBe('left');
      choose('');
      saveButton().click();
      expect(images()[0].style).toBe('margin-left: 4px;');
    });

    it('shows float: none as no alignment, and keeps it unless changed', () => {
      make({}, `<p>a<img src="${SRC}" style="float: none">b</p>`);
      select();
      dialog.open();
      expect(align().value).toBe('');
      type('alt', 'x');
      saveButton().click();
      expect(images()[0].style).toBe('float: none;');
    });
  });
});

describe('the Link tab', () => {
  const tab = (label: string) =>
    Array.from(root()!.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((b) => b.textContent === label)!;
  const href = () => field('href');
  const target = () => field<HTMLSelectElement>('target');

  function select(pos = 2): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, pos)));
  }

  /** The links of getContent(), as [href, target, what they hold]. */
  function links(): Array<[string | null, string | null, string]> {
    const body = new DOMParser().parseFromString(editor.getContent(), 'text/html').body;
    return Array.from(body.querySelectorAll('a')).map((a) => [
      a.getAttribute('href'),
      a.getAttribute('target'),
      a.querySelector('img') ? `img${a.textContent ? `+${a.textContent}` : ''}` : a.textContent ?? '',
    ]);
  }

  it('is a second tab, and the tabs switch panels', () => {
    make();
    dialog.open();
    const tabs = Array.from(root()!.querySelectorAll('[role="tab"]')).map((b) => b.textContent);
    expect(tabs.slice(0, 2)).toEqual(['General', 'Link']);
    expect(tab('General').getAttribute('aria-selected')).toBe('true');
    expect(href().closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(true);
    tab('Link').click();
    expect(tab('Link').getAttribute('aria-selected')).toBe('true');
    expect(href().closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(false);
    expect(field('src').closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('labels its fields and offers Current window and New window', () => {
    make();
    dialog.open();
    expect(root()?.querySelector(`label[for="${href().id}"]`)?.textContent).toBe('URL');
    expect(root()?.querySelector(`label[for="${target().id}"]`)?.textContent).toBe('Open link in...');
    expect(Array.from(target().options).map((o) => [o.value, o.textContent])).toEqual([
      ['', 'Current window'], ['_blank', 'New window'],
    ]);
  });

  it('inserts the image linked, opening in the current window', () => {
    make();
    dialog.open();
    type('src', SRC);
    type('href', 'https://example.com/page');
    saveButton().click();
    expect(links()).toEqual([['https://example.com/page', null, 'img']]);
  });

  it('inserts the image linked to open in a new window', () => {
    make();
    dialog.open();
    type('src', SRC);
    type('href', 'https://example.com/page');
    target().value = '_blank';
    saveButton().click();
    expect(links()).toEqual([['https://example.com/page', '_blank', 'img']]);
  });

  it.each([
    ['www.example.com:8080/page', 'http://www.example.com:8080/page'],
    ['localhost:3000', 'http://localhost:3000'],
  ])('adds http:// to %j, a host and port, as the link dialog does', (value, expected) => {
    make();
    dialog.open();
    type('src', SRC);
    type('href', value);
    saveButton().click();
    expect(links()[0][0]).toBe(expected);
  });

  it('adds http:// to a bare domain, as the link dialog does', () => {
    make();
    dialog.open();
    type('src', SRC);
    type('href', 'www.example.com/page');
    saveButton().click();
    expect(links()[0][0]).toBe('http://www.example.com/page');
  });

  it.each(['example.dms:1|x', 'notes://server/db'])('links to the application scheme %j, as the link dialog does', (value) => {
    make();
    dialog.open();
    type('src', SRC);
    type('href', value);
    expect(saveButton().disabled).toBe(false);
    saveButton().click();
    expect(links()[0][0]).toBe(value);
  });

  it.each([
    'javascript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'mhtml:file://x!y', 'file:///c:/x', 'blob:https://example.com/1',
  ])('refuses %j as a link', (value) => {
    make();
    dialog.open();
    type('src', SRC);
    type('href', value);
    expect(saveButton().disabled).toBe(true);
    expect(href().getAttribute('aria-invalid')).toBe('true');
    saveButton().click();
    expect(images()).toHaveLength(0);
    type('href', 'https://example.com/ok');
    expect(saveButton().disabled).toBe(false);
    expect(href().hasAttribute('aria-invalid')).toBe(false);
  });

  it('inserts no link when the URL is empty', () => {
    make();
    dialog.open();
    type('src', SRC);
    saveButton().click();
    expect(links()).toEqual([]);
  });

  describe('on a linked image', () => {
    const LINKED = `<p>a<a href="https://example.com/old" target="_blank" title="Old link"><img src="${SRC}" alt="A"></a>b</p>`;

    it('is filled from the link', () => {
      make({}, LINKED);
      select();
      dialog.open();
      expect(href().value).toBe('https://example.com/old');
      expect(target().value).toBe('_blank');
    });

    it('changes the link, keeping its title', () => {
      make({}, LINKED);
      select();
      dialog.open();
      type('href', 'https://example.com/new');
      target().value = '';
      saveButton().click();
      expect(links()).toEqual([['https://example.com/new', null, 'img']]);
      const a = new DOMParser().parseFromString(editor.getContent(), 'text/html').body.querySelector('a');
      expect(a?.getAttribute('title')).toBe('Old link');
    });

    it('removes the link when the URL is emptied', () => {
      make({}, LINKED);
      select();
      dialog.open();
      type('href', '');
      saveButton().click();
      expect(links()).toEqual([]);
      expect(images()).toHaveLength(1);
    });

    it('keeps the link when only other fields change', () => {
      make({}, LINKED);
      select();
      dialog.open();
      type('alt', 'New');
      saveButton().click();
      expect(links()).toEqual([['https://example.com/old', '_blank', 'img']]);
    });

    it('changes the link and the image in one undo step', () => {
      make({}, LINKED);
      newUndoStep();
      select();
      dialog.open();
      type('alt', 'New');
      type('href', 'https://example.com/new');
      saveButton().click();
      tiptap().commands.undo();
      expect(links()).toEqual([['https://example.com/old', '_blank', 'img']]);
      expect(images()[0].alt).toBe('A');
    });

    it('changes the whole link around the image and text, as one link', () => {
      make({}, `<p><a href="https://example.com/old">see <img src="${SRC}"> here</a></p>`);
      select(5);
      dialog.open();
      type('href', 'https://example.com/new');
      saveButton().click();
      // A link imported without a target takes the link mark's default, a new window.
      expect(links()).toEqual([['https://example.com/new', '_blank', 'img+see  here']]);
    });

    it('removes the whole link around the image and text', () => {
      make({}, `<p><a href="https://example.com/old">see <img src="${SRC}"> here</a></p>`);
      select(5);
      dialog.open();
      type('href', '');
      saveButton().click();
      expect(links()).toEqual([]);
      expect(tiptap().state.doc.textContent).toBe('see  here');
    });

    it('leaves a neighbouring link of its own alone', () => {
      make({}, `<p><a href="https://example.com/text">text</a><a href="https://example.com/old"><img src="${SRC}"></a></p>`);
      select(5);
      dialog.open();
      expect(href().value).toBe('https://example.com/old');
      type('href', 'https://example.com/new');
      saveButton().click();
      expect(links()).toEqual([
        ['https://example.com/text', '_blank', 'text'],
        ['https://example.com/new', '_blank', 'img'],
      ]);
    });

    it('saves an unchanged link the check would refuse, as it is', () => {
      make({}, `<p>a<img src="${SRC}">b</p>`);
      tiptap().view.dispatch(tiptap().state.tr.addMark(2, 3, tiptap().schema.marks.link.create({ href: 'news:old', target: null })));
      select();
      dialog.open();
      expect(saveButton().disabled).toBe(false);
      type('alt', 'x');
      saveButton().click();
      let kept: unknown = null;
      tiptap().state.doc.descendants((node) => {
        if (node.type.name === 'image') kept = node.marks.find((m) => m.type.name === 'link')?.attrs.href;
      });
      expect(kept).toBe('news:old');
    });
  });
});

describe('the Upload tab', () => {
  const png = () => new File(['x'], 'photo.png', { type: 'image/png' });

  /** An uploader the test answers: each upload waits for resolve() or reject(). */
  function fakeUploader(validate: (file: File) => string | null = () => null) {
    const pending: Array<{ resolve: (url: string) => void; reject: (err: Error) => void; progress: (pct: number) => void }> = [];
    const uploader = {
      validateFile: jest.fn(validate),
      uploadFile: jest.fn((_file: File, onProgress?: (pct: number) => void) => new Promise<string>((resolve, reject) => {
        pending.push({ resolve, reject, progress: (pct) => onProgress?.(pct) });
      })),
    };
    return { uploader, pending };
  }

  function makeWithUploader(config: EditorConfig = {}, validate?: (file: File) => string | null) {
    const fake = fakeUploader(validate);
    make(config);
    dialog = new ImageDialog({ editor, trans: (k) => k, uploader: fake.uploader });
    return fake;
  }

  const tab = (label: string) =>
    Array.from(root()!.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((b) => b.textContent === label);
  const fileInput = () => root()!.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
  const errorText = () => root()!.querySelector('.md-image-dialog-upload-error') as HTMLElement;
  const progressText = () => root()!.querySelector('.md-image-dialog-progress-text') as HTMLElement;
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  function choose(file: File): void {
    Object.defineProperty(fileInput(), 'files', { value: [file], configurable: true });
    fileInput().dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('is the third tab', () => {
    makeWithUploader();
    dialog.open();
    expect(Array.from(root()!.querySelectorAll('[role="tab"]')).map((b) => b.textContent)).toEqual(['General', 'Link', 'Upload']);
  });

  it('is not there with image_uploadtab off', () => {
    makeWithUploader({ image_uploadtab: false });
    dialog.open();
    expect(tab('Upload')).toBeUndefined();
  });

  it('is not there without an uploader', () => {
    make();
    dialog.open();
    expect(tab('Upload')).toBeUndefined();
  });

  it('only takes image files in the file chooser', () => {
    makeWithUploader();
    dialog.open();
    expect(fileInput().accept).toBe('image/*');
  });

  it('uploads a chosen file at once, then fills Source and shows the General tab', async () => {
    const { uploader, pending } = makeWithUploader();
    dialog.open();
    tab('Upload')!.click();
    choose(png());
    expect(uploader.uploadFile).toHaveBeenCalledTimes(1);
    pending[0].resolve('https://example.com/uploaded.png');
    await flush();
    expect(field('src').value).toBe('https://example.com/uploaded.png');
    expect(tab('General')!.getAttribute('aria-selected')).toBe('true');
    expect(saveButton().disabled).toBe(false);
    saveButton().click();
    expect(images()[0].src).toBe('https://example.com/uploaded.png');
  });

  it('takes a file dropped on it', async () => {
    const { uploader, pending } = makeWithUploader();
    dialog.open();
    const zone = root()!.querySelector('.md-image-dialog-dropzone') as HTMLElement;
    const drop = new Event('drop', { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown };
    drop.dataTransfer = { files: [png()] };
    zone.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(uploader.uploadFile).toHaveBeenCalledTimes(1);
    pending[0].resolve(PNG);
    await flush();
    expect(field('src').value).toBe(PNG);
  });

  it('shows progress, and holds Save, while uploading', async () => {
    const { pending } = makeWithUploader();
    dialog.open();
    type('src', SRC);
    choose(png());
    expect(saveButton().disabled).toBe(true);
    expect(root()!.getAttribute('aria-busy')).toBe('true');
    pending[0].progress(40);
    expect(progressText().textContent).toBe('40%');
    pending[0].resolve('https://example.com/up.png');
    await flush();
    expect(root()!.hasAttribute('aria-busy')).toBe(false);
    expect(saveButton().disabled).toBe(false);
  });

  it('shows why a file is refused, without uploading it', () => {
    const { uploader } = makeWithUploader({}, () => 'Invalid file type');
    dialog.open();
    choose(png());
    expect(uploader.uploadFile).not.toHaveBeenCalled();
    expect(errorText().textContent).toBe('Invalid file type');
    expect(errorText().getAttribute('role')).toBe('alert');
  });

  it("shows the server's message for a failed upload, and lets the user try again", async () => {
    const { pending } = makeWithUploader();
    dialog.open();
    choose(png());
    pending[0].reject(new Error('Server says no'));
    await flush();
    expect(errorText().textContent).toBe('Server says no');
    expect(field('src').value).toBe('');
    choose(png());
    expect(errorText().textContent).toBe('');
    pending[1].resolve('https://example.com/second.png');
    await flush();
    expect(field('src').value).toBe('https://example.com/second.png');
  });

  it('says Upload failed when the failure has no message', async () => {
    const { pending } = makeWithUploader();
    dialog.open();
    choose(png());
    pending[0].reject(new Error(''));
    await flush();
    expect(errorText().textContent).toBe('Upload failed');
  });

  it('refuses an address from the server that is not an image address', async () => {
    const { pending } = makeWithUploader();
    dialog.open();
    choose(png());
    pending[0].resolve('javascript:alert(1)');
    await flush();
    expect(field('src').value).toBe('');
    expect(errorText().textContent).toBe('Invalid image URL');
  });

  it('ignores an upload that finishes after the dialog was closed and opened again', async () => {
    const { pending } = makeWithUploader();
    dialog.open();
    choose(png());
    dialog.close();
    dialog.open();
    pending[0].resolve('https://example.com/late.png');
    await flush();
    expect(field('src').value).toBe('');
    expect(saveButton().disabled).toBe(true);
  });
});

describe('the Advanced tab', () => {
  const tabs = () => Array.from(root()!.querySelectorAll('[role="tab"]')).map((b) => b.textContent);
  const label = (name: string) => root()?.querySelector(`label[for="${field(name).id}"]`)?.textContent;
  const choose = (name: string, value: string) => {
    const select = field<HTMLSelectElement>(name);
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  function select(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }

  function insertWith(config: EditorConfig, fill: () => void): Record<string, unknown> {
    make({ image_advtab: true, ...config });
    dialog.open();
    type('src', SRC);
    fill();
    saveButton().click();
    return images()[0];
  }

  it('is not there by default', () => {
    make();
    dialog.open();
    expect(tabs()).not.toContain('Advanced');
    expect(field('style')).toBeNull();
  });

  it('is the last tab with image_advtab on', () => {
    make({ image_advtab: true });
    dialog.open();
    expect(tabs()).toEqual(['General', 'Link', 'Advanced']);
  });

  it('labels its fields', () => {
    make({ image_advtab: true });
    dialog.open();
    expect([
      'style', 'vspace', 'hspace', 'borderwidth', 'borderstyle', 'dir', 'lang', 'title',
    ].map(label)).toEqual([
      'Style', 'Vertical space', 'Horizontal space', 'Border width', 'Border style', 'Text direction', 'Language', 'Title',
    ]);
  });

  it('has the Title field only when the General tab does not', () => {
    make({ image_advtab: true, image_title: true });
    dialog.open();
    expect(root()!.querySelectorAll('[name="title"]')).toHaveLength(1);
    expect(field('title').closest('.md-image-dialog-panel')?.id).toMatch(/-panel-0$/);
  });

  it('saves the Title from the Advanced tab', () => {
    expect(insertWith({}, () => type('title', 'Advisory')).title).toBe('Advisory');
  });

  describe('spacing', () => {
    it('writes vertical space as top and bottom margins, a number as pixels', () => {
      expect(insertWith({}, () => type('vspace', '5')).style).toBe('margin-top: 5px; margin-bottom: 5px;');
    });

    it('writes horizontal space as left and right margins', () => {
      expect(insertWith({}, () => type('hspace', '1em')).style).toBe('margin-right: 1em; margin-left: 1em;');
    });

    it.each([
      ['hspace', '-5'],
      ['vspace', 'calc(1px)'],
      ['vspace', 'abc'],
      ['borderwidth', '10%'],
    ])('marks %s %j, which an image may not keep, and holds Save', (name, value) => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="margin: 10px">b</p>`);
      select();
      dialog.open();
      type(name, value);
      expect(field(name).getAttribute('aria-invalid')).toBe('true');
      expect(saveButton().disabled).toBe(true);
    });

    it('shows the space of an image whose two sides match, and none otherwise', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="margin: 4px 6px 4px 9px">b</p>`);
      select();
      dialog.open();
      expect(field('vspace').value).toBe('4px');
      expect(field('hspace').value).toBe('');
    });

    it('keeps sides it shows no space for, unless changed', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="margin: 4px 6px 4px 9px">b</p>`);
      select();
      dialog.open();
      type('vspace', '2');
      saveButton().click();
      expect(images()[0].style).toBe('margin: 2px 6px 2px 9px;');
    });
  });

  describe('border', () => {
    it('offers the border styles', () => {
      make({ image_advtab: true });
      dialog.open();
      expect(Array.from(field<HTMLSelectElement>('borderstyle').options).map((o) => o.value)).toEqual([
        '', 'solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden',
      ]);
    });

    it('draws a solid border for a width given with no style', () => {
      expect(insertWith({}, () => type('borderwidth', '2')).style).toBe('border-width: 2px; border-style: solid;');
    });

    it('keeps the style chosen with the width', () => {
      expect(insertWith({}, () => {
        type('borderwidth', '3px');
        choose('borderstyle', 'dashed');
      }).style).toBe('border-width: 3px; border-style: dashed;');
    });

    it('keeps the border color of the image when only the width changes', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="border: 1px dotted red">b</p>`);
      select();
      dialog.open();
      expect(field('borderwidth').value).toBe('1px');
      expect(field<HTMLSelectElement>('borderstyle').value).toBe('dotted');
      type('borderwidth', '4');
      saveButton().click();
      const style = images()[0].style as string;
      expect(style).toContain('border-width: 4px');
      expect(style).toContain('border-style: dotted');
      expect(style).toMatch(/border-color: (red|rgb\(255, 0, 0\))/);
    });

    it('removes the border width when emptied', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="border-width: 2px; border-style: solid">b</p>`);
      select();
      dialog.open();
      type('borderwidth', '');
      saveButton().click();
      expect(images()[0].style).toBe('border-style: solid;');
    });
  });

  describe('Style', () => {
    it("shows the image's style", () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="float: left; margin-top: 3px">b</p>`);
      select();
      dialog.open();
      expect(field('style').value).toBe('float: left; margin-top: 3px;');
    });

    it('keeps only what an image may have', () => {
      expect(insertWith({}, () => type('style', 'float: right; position: fixed; background: url(x); border-color: blue')).style)
        .toBe('float: right; border-color: blue;');
    });

    it('fills the other fields as it is typed', () => {
      make({ image_advtab: true });
      dialog.open();
      type('style', 'float: left; margin: 3px 7px; border-width: 2px; border-style: double');
      expect(field<HTMLSelectElement>('align').value).toBe('left');
      expect(field('vspace').value).toBe('3px');
      expect(field('hspace').value).toBe('7px');
      expect(field('borderwidth').value).toBe('2px');
      expect(field<HTMLSelectElement>('borderstyle').value).toBe('double');
    });

    it('follows the other fields as they change', () => {
      make({ image_advtab: true });
      dialog.open();
      type('style', 'border-color: red');
      type('hspace', '8');
      choose('align', 'right');
      expect(field('style').value).toBe('float: right; margin-right: 8px; margin-left: 8px; border-color: red;');
    });

    it('saves what the Style field and the other fields agree on', () => {
      expect(insertWith({}, () => {
        type('style', 'margin: 1px 2px 3px 4px');
        type('vspace', '9');
      }).style).toBe('margin: 9px 2px 9px 4px;');
    });

    it('clears the style when emptied', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="float: left">b</p>`);
      select();
      dialog.open();
      type('style', '');
      saveButton().click();
      expect(images()[0].style).toBeNull();
    });
  });

  describe('Text direction and Language', () => {
    it('offers no direction, left to right and right to left', () => {
      make({ image_advtab: true });
      dialog.open();
      expect(Array.from(field<HTMLSelectElement>('dir').options).map((o) => [o.value, o.textContent])).toEqual([
        ['', ''], ['ltr', 'Left to right'], ['rtl', 'Right to left'],
      ]);
    });

    it('are saved', () => {
      const attrs = insertWith({}, () => {
        choose('dir', 'rtl');
        type('lang', ' ar ');
      });
      expect(attrs).toEqual(expect.objectContaining({ dir: 'rtl', lang: 'ar' }));
      expect(outputImage()?.getAttribute('dir')).toBe('rtl');
      expect(outputImage()?.getAttribute('lang')).toBe('ar');
    });

    it('are filled from the image', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" dir="rtl" lang="he">b</p>`);
      select();
      dialog.open();
      expect(field<HTMLSelectElement>('dir').value).toBe('rtl');
      expect(field('lang').value).toBe('he');
    });

    it('marks a language that is not a language tag, and holds Save', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" lang="fr">b</p>`);
      select();
      dialog.open();
      type('lang', 'fr_CA');
      expect(field('lang').getAttribute('aria-invalid')).toBe('true');
      expect(saveButton().disabled).toBe(true);
      saveButton().click();
      expect(images()[0].lang).toBe('fr');
    });

    it('are kept when the tab is not shown', () => {
      make({}, `<p>a<img src="${SRC}" dir="rtl" lang="he" style="margin-top: 2px">b</p>`);
      select();
      dialog.open();
      type('alt', 'x');
      saveButton().click();
      expect(images()[0]).toEqual(expect.objectContaining({ dir: 'rtl', lang: 'he', style: 'margin-top: 2px;' }));
    });
  });
});

describe('the preview', () => {
  const box = () => root()!.querySelector('.md-image-dialog-preview') as HTMLElement;
  const shown = () => box().querySelector('img') as HTMLImageElement;
  const note = () => box().querySelector('.md-image-dialog-preview-error') as HTMLElement;
  const choose = (name: string, value: string) => {
    const select = field<HTMLSelectElement>(name);
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('shows the image in sample text, so its wrap can be seen', () => {
    make();
    dialog.open();
    type('src', SRC);
    expect(shown().getAttribute('src')).toBe(SRC);
    expect(box().textContent?.length).toBeGreaterThan(100);
  });

  it('shows nothing for an address that is not an image address', () => {
    make();
    dialog.open();
    type('src', 'javascript:alert(1)');
    expect(shown().hasAttribute('src')).toBe(false);
  });

  it('follows the size', () => {
    make();
    dialog.open();
    type('src', SRC);
    (root()!.querySelector('.md-image-dialog-lock') as HTMLButtonElement).click();
    type('width', '120');
    type('height', '50%');
    expect(shown().getAttribute('width')).toBe('120');
    expect(shown().getAttribute('height')).toBe('50%');
    type('width', 'junk');
    expect(shown().hasAttribute('width')).toBe(false);
  });

  it('follows the alignment, spacing and border', () => {
    make({ image_advtab: true });
    dialog.open();
    type('src', SRC);
    choose('align', 'right');
    type('hspace', '6');
    type('borderwidth', '2');
    expect(shown().style.getPropertyValue('float')).toBe('right');
    expect(shown().style.marginLeft).toBe('6px');
    expect(shown().style.borderWidth).toBe('2px');
    expect(shown().style.borderStyle).toBe('solid');
  });

  it('shows only the style an image may keep', () => {
    make({ image_advtab: true });
    dialog.open();
    type('src', SRC);
    type('style', 'position: fixed; float: left');
    expect(shown().style.position).toBe('');
    expect(shown().style.getPropertyValue('float')).toBe('left');
  });

  it('starts from the selected image', () => {
    make({}, `<p>a<img src="${SRC}" width="80" style="float: left">b</p>`);
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
    dialog.open();
    expect(shown().getAttribute('src')).toBe(SRC);
    expect(shown().getAttribute('width')).toBe('80');
    expect(shown().style.getPropertyValue('float')).toBe('left');
  });

  it('says when the image does not load, until one does', () => {
    make();
    dialog.open();
    type('src', SRC);
    shown().dispatchEvent(new Event('error'));
    expect(note().textContent).toBe('Invalid image URL');
    expect(note().hidden).toBe(false);
    type('src', 'https://example.com/other.png');
    shown().dispatchEvent(new Event('load'));
    expect(note().hidden).toBe(true);
  });

  it('is hidden from assistive technology, which has the fields', () => {
    make();
    dialog.open();
    expect(box().querySelector('.md-image-dialog-preview-text')?.getAttribute('aria-hidden')).toBe('true');
    expect(shown().getAttribute('alt')).toBe('');
  });
});

describe('from the editor', () => {
  const IMG = `<p>a<img src="${SRC}" alt="Old">b</p>`;
  const button = () => container.querySelector('[data-button="image"]') as HTMLButtonElement;
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  function create(config: EditorConfig = {}, content = IMG): HTMLEditor {
    editor = new HTMLEditor(container, { toolbar: 'image', ...config });
    editor.setContent(content);
    return editor;
  }

  function selectImage(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }

  /** Double-click the image as the browser would: two mousedowns, the second with detail 2. */
  function doubleClickImage(): void {
    const img = tiptap().view.dom.querySelector('img.md-editor-image') as HTMLElement;
    const { view } = tiptap();
    jest.spyOn(view, 'posAtCoords').mockReturnValue({ pos: 2, inside: 2 });
    for (const detail of [1, 2]) {
      img.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail, clientX: 1, clientY: 1 }));
      img.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, detail, clientX: 1, clientY: 1 }));
    }
  }

  it("opens with execCommand('mceImage') in insert mode", () => {
    create();
    tiptap().commands.setTextSelection(1);
    expect(editor.execCommand('mceImage')).toBe(true);
    expect(root()?.querySelector('h3')?.textContent).toBe('Insert image');
  });

  it("opens with execCommand('mceImage') on the selected image to edit it", () => {
    create();
    selectImage();
    editor.execCommand('mceImage');
    expect(root()?.querySelector('h3')?.textContent).toBe('Image properties');
    expect(field('alt').value).toBe('Old');
  });

  it('opens from the toolbar button', () => {
    create();
    button().click();
    expect(root()).not.toBeNull();
  });

  it('shows the toolbar button pressed while an image is selected', () => {
    // The toolbar refreshes its buttons' states every 100ms.
    jest.useFakeTimers();
    try {
      create();
      tiptap().commands.setTextSelection(1);
      jest.advanceTimersByTime(100);
      expect(button().classList.contains('md-toolbar-btn-active')).toBe(false);
      selectImage();
      jest.advanceTimersByTime(100);
      expect(button().classList.contains('md-toolbar-btn-active')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('opens on a double-click on an image, to edit it', () => {
    create();
    doubleClickImage();
    expect(root()?.querySelector('h3')?.textContent).toBe('Image properties');
    expect(field('src').value).toBe(SRC);
  });

  it('does not open on a double-click in a read-only editor', () => {
    create({ readonly: true });
    doubleClickImage();
    expect(root()).toBeNull();
  });

  it("leaves the selection alone on a double-click it doesn't handle (read-only)", () => {
    create({ readonly: true });
    tiptap().commands.setTextSelection(4);
    const { view } = tiptap();
    const image = view.state.doc.nodeAt(2)!;
    const handled = view.someProp('handleDoubleClickOn', (f) => f(view, 2, image, 2, new MouseEvent('dblclick'), true));
    expect(handled).toBeFalsy();
    expect(view.state.selection.from).toBe(4);
  });

  it('returns false and opens nothing in a read-only editor', () => {
    create();
    editor.setReadOnly(true);
    expect(editor.execCommand('mceImage')).toBe(false);
    expect(root()).toBeNull();
  });

  it('closes when the editor is made read-only', () => {
    create();
    editor.execCommand('mceImage');
    editor.setReadOnly(true);
    expect(root()).toBeNull();
  });

  it('is not in the basic editor, which has no images', () => {
    editor = new HTMLEditor(container, { basicEditor: true, toolbar: 'image bold' });
    expect(button()).toBeNull();
    expect(editor.execCommand('mceImage')).toBe(false);
    expect(root()).toBeNull();
  });

  it('is removed with the editor', () => {
    create();
    editor.execCommand('mceImage');
    editor.destroy();
    expect(root()).toBeNull();
  });

  it('opens in the language set since', () => {
    create();
    editor.execCommand('mceImage');
    (root()!.querySelector('.md-image-dialog-cancel') as HTMLButtonElement).click();
    editor.setLanguage('de');
    editor.execCommand('mceImage');
    expect(root()?.querySelector('h3')?.textContent).toBe(getLocale('de')['Insert image']);
  });

  it("uploads through the editor's own uploader, as an embedded image without an upload address", async () => {
    create({}, '<p>Hello</p>');
    editor.execCommand('mceImage');
    const input = root()!.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['png'], 'a.png', { type: 'image/png' })] });
    input.dispatchEvent(new Event('change'));
    for (let i = 0; i < 5 && !field('src').value; i++) await flush();
    expect(field('src').value).toMatch(/^data:image\/png;base64,/);
  });

  it("refuses a file the editor's upload settings refuse", () => {
    create({ images_upload_validate: () => 'Not this one' }, '<p>Hello</p>');
    editor.execCommand('mceImage');
    const input = root()!.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['png'], 'a.png', { type: 'image/png' })] });
    input.dispatchEvent(new Event('change'));
    expect(root()!.querySelector('.md-image-dialog-upload-error')?.textContent).toBe('Not this one');
  });
});

describe('the options together', () => {
  const names = () => Array.from(root()!.querySelectorAll<HTMLInputElement>('[name]')).map((el) => el.name);
  const tabs = () => Array.from(root()!.querySelectorAll('[role="tab"]')).map((b) => b.textContent);

  it('with everything off, has Source, Alignment and the Link tab', () => {
    make({ image_dimensions: false, image_description: false, image_uploadtab: false });
    dialog.open();
    expect(tabs()).toEqual(['General', 'Link']);
    expect(names()).toEqual(['src', 'align', 'href', 'target']);
  });

  it('with everything on, has every field, Title once', () => {
    make({ image_advtab: true, image_title: true, a11y_advanced_options: true });
    dialog.open();
    expect(tabs()).toEqual(['General', 'Link', 'Advanced']);
    expect(names()).toEqual([
      'src', 'alt', 'decorative', 'title', 'width', 'height', 'align',
      'href', 'target',
      'style', 'vspace', 'hspace', 'borderwidth', 'borderstyle', 'dir', 'lang',
    ]);
  });

  it('marks an image decorative with no Alt text field', () => {
    make({ image_description: false, a11y_advanced_options: true });
    dialog.open();
    type('src', SRC);
    field('decorative').click();
    saveButton().click();
    expect(images()[0].alt).toBe('');
  });

  it('reads the options each time it opens', () => {
    make();
    dialog.open();
    expect(tabs()).not.toContain('Advanced');
    dialog.close();
    (editor.getConfig() as EditorConfig).image_advtab = true;
    dialog.open();
    expect(tabs()).toContain('Advanced');
  });
});

describe('changes the user takes back, and other edges', () => {
  function select(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }
  const choose = (name: string, value: string) => {
    const select = field<HTMLSelectElement>(name);
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  describe('with the Advanced tab', () => {
    it('saves no float for Alignment set to Left and back to None', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}">b</p>`);
      select();
      dialog.open();
      choose('align', 'left');
      choose('align', '');
      expect(field('style').value).toBe('');
      saveButton().click();
      expect(images()[0].style).toBeNull();
    });

    it('keeps the margins of a spacing typed and cleared again', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}" style="margin-top: 5px; margin-bottom: 20px">b</p>`);
      select();
      dialog.open();
      type('vspace', '1');
      type('vspace', '');
      saveButton().click();
      expect(images()[0].style).toBe('margin-top: 5px; margin-bottom: 20px;');
    });

    it('adds no border for a width typed and cleared again', () => {
      make({ image_advtab: true }, `<p>a<img src="${SRC}">b</p>`);
      select();
      dialog.open();
      type('borderwidth', '2');
      type('borderwidth', '');
      expect(field('style').value).toBe('');
      saveButton().click();
      expect(images()[0].style).toBeNull();
    });
  });

  it("keeps the ratio while a size is typed digit by digit, before the image's own size is known", () => {
    make({}, `<p>a<img src="${SRC}" width="400" height="200">b</p>`);
    select();
    dialog.open();
    for (const value of ['3', '30', '300']) type('width', value);
    expect(field('height').value).toBe('150');
  });

  it('takes the shape the size has when Constrain proportions is turned back on', () => {
    make({}, `<p>a<img src="${SRC}" width="400" height="200">b</p>`);
    select();
    dialog.open();
    const lock = root()!.querySelector('.md-image-dialog-lock') as HTMLButtonElement;
    lock.click();
    type('height', '400');
    lock.click();
    type('width', '200');
    expect(field('height').value).toBe('200');
  });

  it('keeps an empty alt when only other fields change', () => {
    make({}, `<p>a<img src="${SRC}" alt="" width="40" height="20">b</p>`);
    select();
    dialog.open();
    (root()!.querySelector('.md-image-dialog-lock') as HTMLButtonElement).click();
    type('width', '80');
    saveButton().click();
    expect(images()[0].alt).toBe('');
    expect(outputImage()?.getAttribute('alt')).toBe('');
  });

  it('shows the size the ratio gives in the preview at once', () => {
    make({}, `<p>a<img src="${SRC}" width="400" height="200">b</p>`);
    select();
    dialog.open();
    type('width', '200');
    const shown = root()!.querySelector('.md-image-dialog-preview img') as HTMLImageElement;
    expect(shown.getAttribute('height')).toBe('100');
  });

  it('shows the reset size in the preview', () => {
    make({}, `<p>a<img src="${SRC}" width="400" height="200">b</p>`);
    select();
    dialog.open();
    (root()!.querySelector('.md-image-dialog-reset') as HTMLButtonElement).click();
    const shown = root()!.querySelector('.md-image-dialog-preview img') as HTMLImageElement;
    expect(shown.hasAttribute('width')).toBe(false);
  });

  it('keeps an address with a line break in it, unchanged', () => {
    make({}, '<p>a<img src="cid:part1@example.test">b</p>');
    const node = images()[0];
    expect(node.src).toBe('cid:part1@example.test');
    tiptap().view.dispatch(tiptap().state.tr.setNodeMarkup(2, undefined, { ...node, src: 'cid:part1\n@example.test' }));
    select();
    dialog.open();
    expect(saveButton().disabled).toBe(false);
    type('alt', 'x');
    saveButton().click();
    expect(images()[0].src).toBe('cid:part1\n@example.test');
  });

  it("says nothing about an image's own address the preview can't load", () => {
    make({}, '<p>a<img src="cid:part1@example.test">b</p>');
    select();
    dialog.open();
    const shown = root()!.querySelector('.md-image-dialog-preview img') as HTMLImageElement;
    shown.dispatchEvent(new Event('error'));
    expect((root()!.querySelector('.md-image-dialog-preview-error') as HTMLElement).hidden).toBe(true);
  });

  it('does not save on Enter while an input method is composing', () => {
    make();
    dialog.open();
    type('src', SRC);
    key('Enter', field('src'), { isComposing: true });
    expect(images()).toHaveLength(0);
    expect(dialog.isOpen()).toBe(true);
  });

  it("keeps Escape from the page's own handlers", () => {
    make();
    dialog.open();
    const pageHandler = jest.fn();
    document.body.addEventListener('keydown', pageHandler);
    key('Escape', field('src'));
    document.body.removeEventListener('keydown', pageHandler);
    expect(pageHandler).not.toHaveBeenCalled();
    expect(dialog.isOpen()).toBe(false);
  });

  it('checks a Source once per change, not on every keystroke elsewhere', () => {
    make();
    dialog.open();
    const svg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg"></svg>')}`;
    type('src', svg);
    const parse = jest.spyOn(DOMParser.prototype, 'parseFromString');
    type('alt', 'a');
    type('alt', 'ab');
    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
  });
});

describe('imageSource, hardened', () => {
  it.each([
    ['a backslash, which some clients read as a network path', '\\\\evil.example\\x.png'],
    ['a backslash in a path', 'images\\a.png'],
    ['a data:image that is not base64', 'data:image/png;charset=x,<script>alert(1)</script>'],
    ['a data:image whose data is not base64', 'data:image/png;base64,<b>'],
  ])('refuses %s', (_name, value) => {
    expect(imageSource(value)).toBeNull();
  });
});

describe('keyboard, focus and the remaining edges', () => {
  function select(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }
  const tabs = () => Array.from(root()!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

  describe('the tab list', () => {
    it.each([
      ['ArrowRight', 0, 1],
      ['ArrowLeft', 0, 2],
      ['ArrowRight', 2, 0],
      ['End', 0, 2],
      ['Home', 2, 0],
    ])('moves on %s from tab %i to tab %i, selecting and focusing it', (keyName, from, to) => {
      make({ image_advtab: true });
      dialog.open();
      tabs()[from].click();
      tabs()[from].focus();
      const event = key(keyName as string, tabs()[from]);
      expect(event.defaultPrevented).toBe(true);
      expect(tabs()[to as number].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[to as number].tabIndex).toBe(0);
      expect(document.activeElement).toBe(tabs()[to as number]);
    });

    it('leaves other keys alone', () => {
      make();
      dialog.open();
      tabs()[0].focus();
      expect(key('ArrowDown', tabs()[0]).defaultPrevented).toBe(false);
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('marking what cannot be saved', () => {
    it('marks a Source that is not an image address', () => {
      make();
      dialog.open();
      type('src', 'javascript:alert(1)');
      expect(field('src').getAttribute('aria-invalid')).toBe('true');
      type('src', '');
      expect(field('src').hasAttribute('aria-invalid')).toBe(false);
      type('src', SRC);
      expect(field('src').hasAttribute('aria-invalid')).toBe(false);
    });

    it('does not mark an unchanged size the dialog would not write', () => {
      make({}, `<p>a<img src="${SRC}" width="auto">b</p>`);
      select();
      dialog.open();
      expect(field('width').hasAttribute('aria-invalid')).toBe(false);
      expect(saveButton().disabled).toBe(false);
    });
  });

  describe('the Style field', () => {
    const options = (name: string) => Array.from(field<HTMLSelectElement>(name).options).map((o) => o.value);

    it('shows float: none as no alignment, and keeps it unless changed', () => {
      make({}, `<p>a<img src="${SRC}" style="float: none">b</p>`);
      select();
      dialog.open();
      expect(options('align')).toEqual(['', 'left', 'right']);
      expect(field<HTMLSelectElement>('align').value).toBe('');
    });

    it('fills the other fields only with what an image may keep', () => {
      make({ image_advtab: true });
      dialog.open();
      type('style', 'float: inherit; border-style: unset');
      type('style', 'float: initial');
      expect(options('align')).toEqual(['', 'left', 'right']);
      expect(options('borderstyle')).not.toContain('unset');
    });
  });

  it('gives focus to Source after an upload fills it', async () => {
    const pending: Array<(url: string) => void> = [];
    make();
    dialog = new ImageDialog({
      editor,
      trans: (k) => k,
      uploader: { validateFile: () => null, uploadFile: () => new Promise<string>((resolve) => pending.push(resolve)) },
    });
    dialog.open();
    const upload = tabs().find((t) => t.textContent === 'Upload')!;
    upload.click();
    const input = root()!.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
    (root()!.querySelector('.md-image-dialog-browse') as HTMLButtonElement).focus();
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
    input.dispatchEvent(new Event('change'));
    pending[0]('https://example.com/up.png');
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.activeElement).toBe(field('src'));
  });

  it('keeps only the second of two files chosen while the first uploads', async () => {
    const pending: Array<(url: string) => void> = [];
    make();
    dialog = new ImageDialog({
      editor,
      trans: (k) => k,
      uploader: { validateFile: () => null, uploadFile: () => new Promise<string>((resolve) => pending.push(resolve)) },
    });
    dialog.open();
    const input = root()!.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
    const choose = () => {
      Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
      input.dispatchEvent(new Event('change'));
    };
    choose();
    choose();
    pending[1]('https://example.com/second.png');
    pending[0]('https://example.com/first.png');
    await new Promise((resolve) => setTimeout(resolve));
    expect(field('src').value).toBe('https://example.com/second.png');
  });

  it('clears a refusal once a later upload succeeds', async () => {
    const pending: Array<(url: string) => void> = [];
    let refuse = false;
    make();
    dialog = new ImageDialog({
      editor,
      trans: (k) => k,
      uploader: {
        validateFile: () => (refuse ? 'Not this one' : null),
        uploadFile: () => new Promise<string>((resolve) => pending.push(resolve)),
      },
    });
    dialog.open();
    const input = root()!.querySelector('.md-image-dialog-upload input[type="file"]') as HTMLInputElement;
    const choose = () => {
      Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
      input.dispatchEvent(new Event('change'));
    };
    choose();
    refuse = true;
    choose();
    expect(root()!.querySelector('.md-image-dialog-upload-error')?.textContent).toBe('Not this one');
    pending[0]('https://example.com/first.png');
    await new Promise((resolve) => setTimeout(resolve));
    expect(root()!.querySelector('.md-image-dialog-upload-error')?.textContent).toBe('');
  });

  it('changes only the target of a linked image', () => {
    make({}, `<p>a<a href="https://example.com/x" target="_blank"><img src="${SRC}"></a>b</p>`);
    select();
    dialog.open();
    const target = field<HTMLSelectElement>('target');
    target.value = '';
    target.dispatchEvent(new Event('change', { bubbles: true }));
    saveButton().click();
    const a = new DOMParser().parseFromString(editor.getContent(), 'text/html').body.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com/x');
    expect(a?.hasAttribute('target')).toBe(false);
  });

  it('lets Image is decorative be turned off with no Alt text field', () => {
    make({ image_description: false, a11y_advanced_options: true }, `<p>a<img src="${SRC}" alt="">b</p>`);
    select();
    dialog.open();
    field('decorative').click();
    saveButton().click();
    expect(images()[0].alt).toBeNull();
  });
});

describe('final edges', () => {
  function select(): void {
    tiptap().view.dispatch(tiptap().state.tr.setSelection(NodeSelection.create(tiptap().state.doc, 2)));
  }
  const preview = () => root()!.querySelector('.md-image-dialog-preview img') as HTMLImageElement;
  function loadPreview(width: number, height: number): void {
    const img = preview();
    Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
    img.dispatchEvent(new Event('load'));
  }

  it("keeps the new picture's shape once Source changes to another picture", () => {
    make();
    dialog.open();
    type('src', 'https://example.com/wide.png');
    loadPreview(100, 50);
    type('src', 'https://example.com/tall.png');
    loadPreview(50, 100);
    type('width', '100');
    expect(field('height').value).toBe('200');
  });

  it.each(['0', '0%', '0px'])('marks a size of %j, which would hide the image', (value) => {
    make();
    dialog.open();
    type('src', SRC);
    (root()!.querySelector('.md-image-dialog-lock') as HTMLButtonElement).click();
    type('width', value);
    expect(field('width').getAttribute('aria-invalid')).toBe('true');
    expect(saveButton().disabled).toBe(true);
  });

  it('keeps a target it does not offer when only the link address changes', () => {
    make({}, `<p>a<a href="https://example.com/old" target="_top"><img src="${SRC}"></a>b</p>`);
    select();
    dialog.open();
    type('href', 'https://example.com/new');
    saveButton().click();
    const a = new DOMParser().parseFromString(editor.getContent(), 'text/html').body.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com/new');
    expect(a?.getAttribute('target')).toBe('_top');
  });

  it('opens nothing on a basic editor, which has no images', () => {
    editor = new HTMLEditor(container, { basicEditor: true });
    dialog = new ImageDialog({ editor, trans: (k) => k });
    dialog.open();
    expect(dialog.isOpen()).toBe(false);
    expect(root()).toBeNull();
  });

  it('takes the error note away when Source is emptied', () => {
    make();
    dialog.open();
    type('src', SRC);
    preview().dispatchEvent(new Event('error'));
    type('src', '');
    expect((root()!.querySelector('.md-image-dialog-preview-error') as HTMLElement).hidden).toBe(true);
  });
});
