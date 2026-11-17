/**
 * Print HTML on its own, without the page around it.
 *
 * TinyMCE prints the iframe its content lives in. This editor's content is part
 * of the host page, so `window.print()` would print the whole page. Instead the
 * content goes into a hidden frame of its own, which is printed. A frame, not a
 * popup like Preview's, so a popup blocker cannot stop it.
 */

import { buildPreviewDocument } from './previewDocument';

/**
 * No `allow-scripts`, so nothing in the frame can run, whatever the content
 * holds (its document also carries PREVIEW_CSP). `allow-modals` is what lets a
 * sandboxed frame print; `allow-same-origin` lets the page call its `print()`.
 */
const PRINT_FRAME_SANDBOX = 'allow-same-origin allow-modals';

/**
 * Print `html` (the editor's serialized output) under `title`, the name a
 * browser puts in the page header and offers when saving as PDF, in direction
 * `dir`. Returns the hidden frame it prints from, which the caller removes when
 * it is no longer needed: print dialogs close at different times in different
 * browsers, and removing the frame while one is open can cancel the print.
 */
export function printHtml(html: string, title: string, dir: 'ltr' | 'rtl' = 'ltr'): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.className = 'md-print-frame';
  frame.setAttribute('sandbox', PRINT_FRAME_SANDBOX);
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // Hidden, but not display: none, which some browsers print as a blank page.
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });

  const onLoad = () => {
    // Print the srcdoc document only: some engines fire a load for the frame's
    // initial, empty about:blank document first, which would print a blank page.
    if (frame.contentDocument?.URL !== 'about:srcdoc') return;
    frame.removeEventListener('load', onLoad);

    const win = frame.contentWindow;
    // Focusing the frame's window (which some browsers need, to print the
    // frame rather than the page) moves the page's focus to the frame. Give it
    // back afterwards, so the keyboard is not left in a hidden frame.
    const previous = document.activeElement;
    try {
      win?.focus();
      win?.print();
    } catch (err) {
      console.warn('[html-editor] Print: the browser did not print the content.', err);
    } finally {
      if (previous instanceof HTMLElement && previous !== frame && document.activeElement !== previous) {
        previous.focus({ preventScroll: true });
      }
    }
  };
  frame.addEventListener('load', onLoad);

  frame.srcdoc = buildPreviewDocument(html, title, dir);
  document.body.appendChild(frame);
  return frame;
}
