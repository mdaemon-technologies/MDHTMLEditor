/**
 * Print Tests
 * printHtml prints HTML from a hidden, sandboxed frame, so the host page is not
 * printed and no popup is needed.
 */

import { printHtml } from '../../src/utils/printContent';
import { buildPreviewDocument } from '../../src/utils/previewDocument';

describe('printHtml', () => {
  let frame: HTMLIFrameElement | null = null;

  afterEach(() => {
    jest.restoreAllMocks();
    frame?.remove();
    frame = null;
  });

  /**
   * Make the frame's document the srcdoc document, as a browser does once it
   * has loaded it (jsdom does not load srcdoc: its frame stays on about:blank).
   */
  const markSrcdocLoaded = (target: HTMLIFrameElement) => {
    Object.defineProperty(target.contentDocument!, 'URL', { value: 'about:srcdoc', configurable: true });
  };

  /** Stub the frame's print and focus. */
  const stub = (target: HTMLIFrameElement) => {
    const win = target.contentWindow!;
    const print = jest.spyOn(win, 'print').mockImplementation(() => {});
    const focus = jest.spyOn(win, 'focus').mockImplementation(() => {});
    return { print, focus };
  };

  /** Stub the frame's print and focus, then fire the srcdoc document's load. */
  const load = (target: HTMLIFrameElement) => {
    const spies = stub(target);
    markSrcdocLoaded(target);
    target.dispatchEvent(new Event('load'));
    return spies;
  };

  it('does not print the empty document a frame starts with', () => {
    frame = printHtml('<p>Hi</p>', 'Notes');
    const { print } = stub(frame);

    // Some engines fire a load for the initial about:blank document first.
    frame.dispatchEvent(new Event('load'));
    expect(print).not.toHaveBeenCalled();

    markSrcdocLoaded(frame);
    frame.dispatchEvent(new Event('load'));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('adds a hidden frame to the page', () => {
    frame = printHtml('<p>Hi</p>', 'Notes');

    expect(frame.isConnected).toBe(true);
    expect(frame.getAttribute('aria-hidden')).toBe('true');
    expect(frame.tabIndex).toBe(-1);
    expect(frame.style.visibility).toBe('hidden');
    expect(frame.style.width).toBe('0px');
    expect(frame.style.height).toBe('0px');
  });

  it('sandboxes the frame so nothing in it can run', () => {
    frame = printHtml('<p>Hi</p>', 'Notes');

    // allow-modals is what lets a sandboxed frame print; allow-same-origin lets
    // the page call its print(). No allow-scripts.
    expect(frame.getAttribute('sandbox')).toBe('allow-same-origin allow-modals');
  });

  it('loads the preview document, with its Content Security Policy', () => {
    frame = printHtml('<p>Hello <strong>world</strong></p>', 'Notes');

    expect(frame.getAttribute('srcdoc')).toBe(buildPreviewDocument('<p>Hello <strong>world</strong></p>', 'Notes'));
  });

  it('prints once the frame has loaded, and only once', () => {
    frame = printHtml('<p>Hi</p>', 'Notes');
    const { print, focus } = load(frame);
    frame.dispatchEvent(new Event('load'));

    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('gives focus back to where it was once printing is done', () => {
    const field = document.createElement('input');
    document.body.appendChild(field);
    try {
      field.focus();
      frame = printHtml('<p>Hi</p>', 'Notes');
      const target = frame;
      const win = target.contentWindow!;
      // A browser moves the page's focus to the frame whose window is focused.
      jest.spyOn(win, 'focus').mockImplementation(() => target.focus());
      const print = jest.spyOn(win, 'print').mockImplementation(() => {
        expect(document.activeElement).toBe(target);
      });

      markSrcdocLoaded(target);
      target.dispatchEvent(new Event('load'));

      expect(print).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(field);
    } finally {
      field.remove();
    }
  });

  it('writes the direction into the printed document', () => {
    frame = printHtml('<p>مرحبا</p>', 'Notes', 'rtl');

    const doc = new DOMParser().parseFromString(frame.getAttribute('srcdoc') ?? '', 'text/html');
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('does not throw when the browser refuses to print', () => {
    frame = printHtml('<p>Hi</p>', 'Notes');
    const win = frame.contentWindow!;
    jest.spyOn(win, 'focus').mockImplementation(() => {});
    jest.spyOn(win, 'print').mockImplementation(() => {
      throw new Error('blocked');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    markSrcdocLoaded(frame);

    expect(() => frame!.dispatchEvent(new Event('load'))).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
