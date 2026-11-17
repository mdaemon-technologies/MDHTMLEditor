/**
 * MediaDialog Tests
 * mceMedia opens the Insert video dialog. A YouTube, Vimeo or Dailymotion link
 * is inserted as a thumbnail linked to the video (Vimeo, which has no fixed
 * thumbnail address, as a plain link), since mail and most hosts drop embedded
 * players. A host's media_url_resolver can supply the link, thumbnail and
 * title instead; what it returns is checked as anything else inserted is.
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import type { MediaUrlResolver } from '../../src/types';
import { closeHistory } from '@tiptap/pm/history';
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { MediaDialog, insertMedia, mediaContent } from '../../src/extensions/MediaDialog';
import { parseVideoUrl } from '../../src/utils/videoUrl';
import { nextFrame } from '../helpers';

const YT = 'abcDEF12345';
const YT_HREF = `https://www.youtube.com/watch?v=${YT}`;
const YT_THUMB = `https://img.youtube.com/vi/${YT}/hqdefault.jpg`;

/** Let pending promises and timers settle. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('MediaDialog', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
    document.querySelectorAll('.md-dialog-overlay').forEach((el) => el.remove());
  });

  const dialog = () => document.querySelector<HTMLElement>('.md-media-dialog');
  const input = () => document.querySelector<HTMLInputElement>('.md-media-dialog-input')!;
  const insertButton = () => document.querySelector<HTMLButtonElement>('.md-media-dialog-insert')!;
  const errorText = () => document.querySelector<HTMLElement>('.md-media-dialog-error')!;
  const isOpen = () => !!dialog() && dialog()!.closest<HTMLElement>('.md-dialog-overlay')!.style.display !== 'none';

  /** getContent() with the default font style every paragraph carries left out. */
  const html = () =>
    editor.getContent().split(' style="font-family: arial, helvetica, sans-serif; font-size: 12pt;"').join('');

  async function insertVideo(url: string): Promise<void> {
    expect(editor.execCommand('mceMedia')).toBe(true);
    input().value = url;
    insertButton().click();
    await settle();
  }

  /** The inserted link and image, read back from getContent(). */
  function inserted(): { href: string | null; src: string | null; alt: string | null; text: string } {
    const doc = new DOMParser().parseFromString(editor.getContent(), 'text/html');
    const link = doc.querySelector('a');
    const img = doc.querySelector('img');
    return {
      href: link?.getAttribute('href') ?? null,
      src: img?.getAttribute('src') ?? null,
      alt: img?.getAttribute('alt') ?? null,
      text: link?.textContent ?? '',
    };
  }

  describe('the dialog', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('opens with mceMedia, titled Insert video, with its field labelled and focused', () => {
      expect(editor.execCommand('mceMedia')).toBe(true);

      expect(isOpen()).toBe(true);
      expect(dialog()!.querySelector('h3')?.textContent).toBe('Insert video');
      const label = dialog()!.querySelector<HTMLLabelElement>(`label[for="${input().id}"]`);
      expect(label?.textContent).toBe('Video URL');
      expect(document.activeElement).toBe(input());
    });

    it('wraps itself in the editor skin', () => {
      editor.destroy();
      editor = new HTMLEditor(container, { skin: 'oxide-dark' });

      editor.execCommand('mceMedia');

      expect(dialog()!.closest('.md-editor-oxide-dark')).not.toBeNull();
    });

    it('opens empty each time', () => {
      editor.execCommand('mceMedia');
      input().value = 'https://example.com/';
      document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click();

      editor.execCommand('mceMedia');

      expect(input().value).toBe('');
      expect(errorText().style.display).toBe('none');
    });

    it('closes with Cancel or Escape, inserting nothing', () => {
      editor.setContent('<p>Text</p>');
      const before = editor.getContent();

      editor.execCommand('mceMedia');
      input().value = YT_HREF;
      document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click();
      expect(isOpen()).toBe(false);

      editor.execCommand('mceMedia');
      input().value = YT_HREF;
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(isOpen()).toBe(false);

      expect(editor.getContent()).toBe(before);
    });

    it('inserts on Enter', async () => {
      editor.execCommand('mceMedia');
      input().value = YT_HREF;
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle();

      expect(inserted().href).toBe(YT_HREF);
    });

    it('says so, and stays open, for a link it cannot insert', async () => {
      editor.setContent('<p>Text</p>');
      const before = editor.getContent();

      await insertVideo('https://example.com/video.mp4');

      expect(isOpen()).toBe(true);
      expect(errorText().style.display).toBe('block');
      expect(errorText().textContent).toBe('This is not a YouTube, Vimeo or Dailymotion link');
      expect(editor.getContent()).toBe(before);
    });
  });

  describe('inserting', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
    });

    it('inserts a YouTube video as its thumbnail, linked to the video', async () => {
      await insertVideo(`https://youtu.be/${YT}?si=share`);

      expect(isOpen()).toBe(false);
      expect(inserted()).toEqual({ href: YT_HREF, src: YT_THUMB, alt: 'Video', text: '' });
    });

    it('inserts a Dailymotion video as its thumbnail', async () => {
      await insertVideo('https://dai.ly/x8abc12');

      expect(inserted().href).toBe('https://www.dailymotion.com/video/x8abc12');
      expect(inserted().src).toBe('https://www.dailymotion.com/thumbnail/video/x8abc12');
    });

    it('inserts a Vimeo video as a link, with no thumbnail to show', async () => {
      await insertVideo('https://vimeo.com/123456789');

      expect(inserted()).toEqual({ href: 'https://vimeo.com/123456789', src: null, alt: null, text: 'https://vimeo.com/123456789' });
    });

    it('inserts at the place the dialog was opened from', async () => {
      editor.setContent('<p>Before after</p>');
      editor.getTipTap()!.commands.setTextSelection(8);

      await insertVideo(YT_HREF);

      expect(html()).toMatch(/^<p>Before <a [^>]*><img [^>]*><\/a>after<\/p>$/);
    });

    it('can be undone in one step', async () => {
      editor.setContent('<p>Text</p>');
      // End the undo step setContent began, as a moment's pause would: edits
      // within half a second of each other are otherwise undone together.
      const tiptap = editor.getTipTap()!;
      tiptap.view.dispatch(closeHistory(tiptap.state.tr));
      const before = editor.getContent();
      await insertVideo(YT_HREF);

      editor.execCommand('Undo');

      expect(editor.getContent()).toBe(before);
    });
  });

  describe('media_url_resolver', () => {
    function withResolver(resolver: MediaUrlResolver): jest.Mock {
      const mock = jest.fn(resolver);
      editor = new HTMLEditor(container, { media_url_resolver: mock });
      return mock;
    }

    it('is asked about the video the link points at', async () => {
      const resolver = withResolver(async () => null);

      await insertVideo(`https://youtu.be/${YT}`);

      expect(resolver).toHaveBeenCalledWith({ provider: 'youtube', id: YT, href: YT_HREF, thumbnail: YT_THUMB });
    });

    it("inserts the link, thumbnail and title it returns", async () => {
      withResolver(async () => ({
        href: 'https://media.example.com/watch/1',
        thumbnail: 'https://media.example.com/thumbs/1.jpg',
        title: '  Product tour  ',
      }));

      await insertVideo(YT_HREF);

      expect(inserted()).toEqual({
        href: 'https://media.example.com/watch/1',
        src: 'https://media.example.com/thumbs/1.jpg',
        alt: 'Product tour',
        text: '',
      });
    });

    it('can give Vimeo a thumbnail, and a relative thumbnail address is kept', async () => {
      withResolver(async () => ({ thumbnail: '/thumbnails/123456789.jpg' }));

      await insertVideo('https://vimeo.com/123456789');

      expect(inserted().href).toBe('https://vimeo.com/123456789');
      expect(inserted().src).toBe('/thumbnails/123456789.jpg');
    });

    it('titles a Vimeo link with the title it returns', async () => {
      withResolver(async () => ({ title: 'Product tour' }));

      await insertVideo('https://vimeo.com/123456789');

      expect(inserted().text).toBe('Product tour');
    });

    it.each([
      ['a script link', 'javascript:alert(1)'],
      ['a data link', 'data:text/html,<b>x</b>'],
      ['a mail link', 'mailto:someone@example.com'],
    ])('keeps the video link in place of %s', async (_name, href) => {
      withResolver(async () => ({ href }));

      await insertVideo(YT_HREF);

      expect(inserted().href).toBe(YT_HREF);
    });

    it.each([
      ['a script address', 'javascript:alert(1)'],
      ['a data address', 'data:image/svg+xml,<svg onload="alert(1)"/>'],
      // Control characters the browser would drop, hiding the scheme from a check.
      ['a script address with a control character in it', 'java\u0001script:alert(1)'],
      // Some mail clients read a leading pair of backslashes as a network path.
      ['an address with backslashes', '\\\\host.example\\thumbs\\1.jpg'],
      ['a data address with a control character in it', 'da\u0002ta:image/svg+xml,<svg/>'],
    ])('keeps the default thumbnail in place of %s', async (_name, thumbnail) => {
      withResolver(async () => ({ thumbnail }));

      await insertVideo(YT_HREF);

      expect(inserted().src).toBe(YT_THUMB);
    });

    it.each([
      ['returns null', async () => null],
      ['rejects', async () => { throw new Error('offline'); }],
      ['throws', () => { throw new Error('bug'); }],
    ] as Array<[string, MediaUrlResolver]>)('inserts the defaults when it %s', async (_name, resolver) => {
      withResolver(resolver);

      await insertVideo(YT_HREF);

      expect(inserted()).toEqual({ href: YT_HREF, src: YT_THUMB, alt: 'Video', text: '' });
    });

    it('disables Insert while it works, and inserts nothing if the dialog is closed meanwhile', async () => {
      let answer: (value: null) => void = () => {};
      withResolver(() => new Promise((resolve) => { answer = resolve; }));
      editor.setContent('<p>Text</p>');
      const before = editor.getContent();

      editor.execCommand('mceMedia');
      input().value = YT_HREF;
      insertButton().click();
      expect(insertButton().disabled).toBe(true);

      document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click();
      answer(null);
      await settle();

      expect(editor.getContent()).toBe(before);
    });

    it('shows that it is busy while the resolver works, with the field read-only', () => {
      withResolver(() => new Promise(() => {}));
      editor.execCommand('mceMedia');
      input().value = YT_HREF;

      insertButton().click();

      expect(dialog()!.getAttribute('aria-busy')).toBe('true');
      expect(input().readOnly).toBe(true);
    });

    it('ignores an answer for a dialog closed and opened again since', async () => {
      const answers: Array<(value: null) => void> = [];
      withResolver(() => new Promise((resolve) => { answers.push(resolve); }));
      editor.setContent('<p>Text</p>');
      const before = editor.getContent();

      editor.execCommand('mceMedia');
      input().value = YT_HREF;
      insertButton().click();
      document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click();
      editor.execCommand('mceMedia');
      answers[0](null);
      await settle();

      expect(editor.getContent()).toBe(before);
      expect(isOpen()).toBe(true);
    });

    it('asks once, even when Enter is pressed again while it works', async () => {
      const resolver = withResolver(() => new Promise(() => {}));
      editor.execCommand('mceMedia');
      input().value = YT_HREF;

      insertButton().click();
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle();

      expect(resolver).toHaveBeenCalledTimes(1);
    });

    it('uses the resolver the editor has when Insert is pressed', async () => {
      editor = new HTMLEditor(container);
      editor.execCommand('mceMedia');
      document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click();
      editor.getConfig().media_url_resolver = async () => ({ title: 'Set later' });

      await insertVideo(YT_HREF);

      expect(inserted().alt).toBe('Set later');
    });

    it('stores the link it returns as the browser reads it', async () => {
      withResolver(async () => ({ href: 'ht\ttps://media.example.com/watch/a b' }));

      await insertVideo(YT_HREF);

      expect(inserted().href).toBe('https://media.example.com/watch/a%20b');
    });

    it('inserts nothing if the editor turns read-only while it works', async () => {
      let answer: (value: null) => void = () => {};
      withResolver(() => new Promise((resolve) => { answer = resolve; }));
      editor.setContent('<p>Text</p>');
      const before = editor.getContent();
      editor.execCommand('mceMedia');
      input().value = YT_HREF;
      insertButton().click();

      editor.setReadOnly(true);
      answer(null);
      await settle();

      expect(editor.getContent()).toBe(before);
    });
  });

  describe('focus and keyboard', () => {
    beforeEach(() => {
      editor = new HTMLEditor(container);
      editor.setContent('<p>Text</p>');
    });

    it.each([
      ['Cancel', () => document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click()],
      ['the close button', () => document.querySelector<HTMLButtonElement>('.md-dialog-close')!.click()],
      ['Escape', () => input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))],
      ['a click beside the dialog', () => {
        const overlay = dialog()!.closest<HTMLElement>('.md-dialog-overlay')!;
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }],
    ])('gives focus back to the editor after %s', async (_name, closeIt) => {
      editor.execCommand('mceMedia');
      expect(document.activeElement).toBe(input());

      closeIt();
      await nextFrame();

      expect(editor.hasFocus()).toBe(true);
    });

    it('is modal, keeping Tab within the dialog', () => {
      editor.execCommand('mceMedia');
      expect(dialog()!.getAttribute('aria-modal')).toBe('true');
      const first = dialog()!.querySelector<HTMLButtonElement>('.md-dialog-close')!;

      insertButton().focus();
      const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      insertButton().dispatchEvent(forward);
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(first);

      const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      first.dispatchEvent(back);
      expect(back.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(insertButton());
    });

    it('still hears Escape and Tab after a click on a part of the dialog that takes no focus', () => {
      editor.execCommand('mceMedia');
      // A click on the title or the padding leaves focus on the page.
      input().blur();
      expect(dialog()!.contains(document.activeElement)).toBe(false);

      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.body.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(true);
      expect(dialog()!.contains(document.activeElement)).toBe(true);

      input().blur();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      expect(isOpen()).toBe(false);
    });

    it('stops listening to the page once closed', () => {
      editor.execCommand('mceMedia');
      document.querySelector<HTMLButtonElement>('.md-media-dialog-cancel')!.click();

      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.body.dispatchEvent(tab);

      expect(tab.defaultPrevented).toBe(false);
    });
  });

  describe('where it is not available', () => {
    it('closes its dialog when the editor turns read-only', () => {
      editor = new HTMLEditor(container);
      editor.execCommand('mceMedia');

      editor.setReadOnly(true);

      expect(isOpen()).toBe(false);
    });

    it('is not in the basic editor, which has no images', () => {
      editor = new HTMLEditor(container, { basicEditor: true });

      expect(editor.execCommand('mceMedia')).toBe(false);
      expect(dialog()).toBeNull();
    });

    it('is not in a read-only editor', () => {
      editor = new HTMLEditor(container, { readonly: true });

      expect(editor.execCommand('mceMedia')).toBe(false);
      expect(dialog()).toBeNull();
    });

    it('removes its dialog when the editor is destroyed', () => {
      editor = new HTMLEditor(container);
      editor.execCommand('mceMedia');

      editor.destroy();

      expect(dialog()).toBeNull();
    });
  });
});

describe('insertMedia in a code block', () => {
  // Jest replaces the editor's own code block, so this uses StarterKit's, which
  // has the same schema: plain text, no marks, no images.
  let tiptap: Editor;

  beforeEach(() => {
    tiptap = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit.configure({ link: false }), Image.configure({ inline: true }), Link],
      content: '<pre><code>let a = 1;\nlet b = 2;</code></pre>',
    });
  });

  afterEach(() => tiptap.destroy());

  it('puts the video in a line of its own after the code block, leaving the code whole', () => {
    tiptap.commands.setTextSelection(5);
    const video = parseVideoUrl('https://youtu.be/abcDEF12345')!;

    expect(insertMedia(tiptap, mediaContent(video, null, 'Video'))).toBe(true);

    const html = tiptap.getHTML();
    // StarterKit adds an empty paragraph at the end (its trailing node).
    expect(html).toMatch(/^<pre><code>let a = 1;\nlet b = 2;<\/code><\/pre><p><a [^>]*><img [^>]*><\/a><\/p>(<p><\/p>)?$/);
  });

  it('replaces a selection that runs out of the code block, as any insert does', () => {
    tiptap.commands.setContent('<pre><code>codeline</code></pre><p>end</p>');
    // From inside "codeline" to inside "end".
    tiptap.commands.setTextSelection({ from: 5, to: 13 });
    const video = parseVideoUrl('https://youtu.be/abcDEF12345')!;

    insertMedia(tiptap, mediaContent(video, null, 'Video'));

    expect(tiptap.getHTML()).not.toContain('line');
    expect(tiptap.getHTML()).toContain('<img');
  });

  it('keeps a Vimeo link a link, after the code block', () => {
    tiptap.commands.setTextSelection(5);
    const video = parseVideoUrl('https://vimeo.com/123456789')!;

    insertMedia(tiptap, mediaContent(video, null, 'Video'));

    expect(tiptap.getHTML()).toMatch(/<\/pre><p><a [^>]*href="https:\/\/vimeo\.com\/123456789"[^>]*>https:\/\/vimeo\.com\/123456789<\/a><\/p>(<p><\/p>)?$/);
  });
});

describe('a MediaDialog a host builds itself', () => {
  it('inserts nothing if the editor turns read-only while the resolver works', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new HTMLEditor(container);
    editor.setContent('<p>Text</p>');
    const before = editor.getContent();
    let answer: (value: null) => void = () => {};
    // The editor closes only its own dialog when it turns read-only.
    const dialog = new MediaDialog({
      editor,
      trans: (key) => key,
      resolver: () => new Promise((resolve) => { answer = resolve; }),
    });
    dialog.open();
    document.querySelector<HTMLInputElement>('.md-media-dialog-input')!.value = 'https://youtu.be/abcDEF12345';
    document.querySelector<HTMLButtonElement>('.md-media-dialog-insert')!.click();

    editor.setReadOnly(true);
    answer(null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editor.getContent()).toBe(before);
    dialog.destroy();
    editor.destroy();
    container.remove();
  });
});

describe('insertMedia over a selected node', () => {
  it('replaces only the selected rule, at the end of the document', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new HTMLEditor(container);
    editor.setContent('<p>x</p><hr><hr>');
    const tiptap = editor.getTipTap()!;
    let lastRule = -1;
    tiptap.state.doc.forEach((node, offset) => {
      if (node.type.name === 'horizontalRule') lastRule = offset;
    });
    tiptap.view.dispatch(tiptap.state.tr.setSelection(NodeSelection.create(tiptap.state.doc, lastRule)));

    insertMedia(tiptap, mediaContent(parseVideoUrl('https://youtu.be/abcDEF12345')!, null, 'Video'));

    expect(editor.getContent().match(/<hr/g)).toHaveLength(1);
    expect(editor.getContent()).toContain('<img');
    editor.destroy();
    container.remove();
  });
});

describe('a MediaDialog on the basic editor, which has no images', () => {
  it('inserts the video as a plain link', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new HTMLEditor(container, { basicEditor: true });
    const dialog = new MediaDialog({ editor, trans: (key) => key });
    dialog.open();
    document.querySelector<HTMLInputElement>('.md-media-dialog-input')!.value = 'https://youtu.be/abcDEF12345';
    document.querySelector<HTMLButtonElement>('.md-media-dialog-insert')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const html = editor.getContent();
    expect(html).toMatch(/<a [^>]*href="https:\/\/www\.youtube\.com\/watch\?v=abcDEF12345"[^>]*>https:\/\/www\.youtube\.com\/watch\?v=abcDEF12345<\/a>/);
    expect(html).not.toContain('<img');
    dialog.destroy();
    editor.destroy();
    container.remove();
  });
});
