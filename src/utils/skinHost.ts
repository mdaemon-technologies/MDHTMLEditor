import type { EditorConfig } from '../types';

/**
 * A wrapper carrying the editor's skin class, for menus and dialogs added to
 * document.body. The skin rules are written under that class
 * (`.md-editor-oxide-dark .md-dialog`, ...), so UI placed outside the editor
 * only gets them from inside such a wrapper. `display: contents` gives the
 * wrapper no box of its own: its child lays out, positions and takes clicks as
 * if the wrapper were not there.
 *
 * @param child Put in the wrapper, when given.
 */
export function createSkinHost(skin: EditorConfig['skin'], child?: HTMLElement): HTMLDivElement {
  const host = document.createElement('div');
  host.className = `md-editor-${skin ?? 'oxide'}`;
  host.style.display = 'contents';
  if (child) host.appendChild(child);
  return host;
}
