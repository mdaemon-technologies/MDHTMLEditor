/**
 * ImageMap Extension
 * Client-side image maps: an <img usemap="#name"> and the <map name> holding its
 * <area> hotspots. The map is an inline atom, so it stays in the line of the
 * image it belongs to, and its areas are kept as an attribute.
 *
 * The editor's content is part of the host page, not an iframe, and a map name
 * is global to the page, so in the editor the map is shown as a marker instead
 * of a live <map>, and the image is shown without its usemap: its hotspots work
 * in the saved HTML, not while editing.
 */

import { Node, getRenderedAttributes, mergeAttributes } from '@tiptap/core';
import type { Editor, ExtensionAttribute } from '@tiptap/core';
import { isAllowedUri } from '@tiptap/extension-link';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { NodeView } from '@tiptap/pm/view';
import { liftMapContent, mapAreas } from '../utils/liftMapContent';

/** One <area> of a map. Only these attributes are kept, each checked. */
export interface ImageMapArea {
  shape?: string;
  coords?: string;
  href?: string;
  alt?: string;
  target?: string;
  title?: string;
  rel?: string;
}

export interface ImageMapOptions {
  /** Translates the marker's note in the editor. */
  trans: (key: string) => string;
}

/** The marker's tooltip and accessible name. */
export const IMAGE_MAP_NOTE = 'Image map: hotspots work in the saved content, not while editing';

const MARKER_CLASS = 'md-image-map';

/** A map name: at least one character, no whitespace (HTML's rule), and no '#'. */
const MAP_NAME = /^[^\s#]+$/;
const USEMAP = /^#[^\s#]+$/;
const SHAPES = new Set(['rect', 'circle', 'poly', 'default', 'rectangle', 'circ', 'polygon']);
const TARGETS = new Set(['_blank', '_self', '_parent', '_top']);
const COORDS = /^[\d\s.,+-]+$/;
const REL = /^[a-z-]+(?:\s+[a-z-]+)*$/i;

function validName(name: unknown): string | null {
  return typeof name === 'string' && MAP_NAME.test(name) ? name : null;
}

/**
 * A map's name. Browsers also match usemap against a map's id (the older XHTML
 * form), so a map with only an id keeps it, written out as its name.
 */
function mapName(map: Element): string | null {
  return validName(map.getAttribute('name')) ?? validName(map.getAttribute('id'));
}

function validUsemap(usemap: unknown): string | null {
  return typeof usemap === 'string' && USEMAP.test(usemap) ? usemap : null;
}

/** An area that opens a new window gets noopener and noreferrer, as the editor's links do. */
function withOpenerGuard(area: ImageMapArea): ImageMapArea {
  if (area.target !== '_blank') return area;
  const tokens = area.rel ? area.rel.split(/\s+/) : [];
  for (const token of ['noopener', 'noreferrer']) {
    if (!tokens.some((t) => t.toLowerCase() === token)) tokens.push(token);
  }
  return { ...area, rel: tokens.join(' ') };
}

/**
 * The area's kept attributes, in the order they are written out. Used both when
 * HTML is parsed and when a node is written out, so an area that did not come
 * from HTML (a command, JSON content) gets the same checks.
 */
function cleanArea(get: (name: string) => unknown): ImageMapArea {
  const result: ImageMapArea = {};
  const text = (name: string): string | null => {
    const value = get(name);
    return typeof value === 'string' ? value : null;
  };

  const shape = text('shape')?.trim().toLowerCase();
  if (shape && SHAPES.has(shape)) result.shape = shape;
  const coords = text('coords')?.trim();
  if (coords && COORDS.test(coords)) result.coords = coords;
  // The check a link's href gets: the editor's Link uses TipTap's default
  // protocols, so javascript:, data: and the like are dropped.
  const href = text('href');
  if (href !== null && isAllowedUri(href)) result.href = href;
  const alt = text('alt');
  if (alt !== null) result.alt = alt;
  const target = text('target')?.trim().toLowerCase();
  if (target && TARGETS.has(target)) result.target = target;
  const title = text('title');
  if (title !== null) result.title = title;
  const rel = text('rel')?.trim();
  if (rel && REL.test(rel)) result.rel = rel;

  return result;
}

/**
 * An image's attributes as shown in the editor: what renderHTML writes, without
 * usemap, so the image can't use a map from elsewhere on the host page.
 */
export function editorImageAttributes(
  node: PMNode,
  attributes: ExtensionAttribute[],
  HTMLAttributes: Record<string, unknown>
): Record<string, unknown> {
  const { usemap: _usemap, ...attrs } = mergeAttributes(HTMLAttributes, getRenderedAttributes(node, attributes));
  return attrs;
}

/** Give a marker its note, in the current language. */
function labelMarker(marker: Element, trans: (key: string) => string): void {
  const note = trans(IMAGE_MAP_NOTE);
  marker.setAttribute('title', note);
  marker.setAttribute('aria-label', note);
}

/** Translate the markers already shown in `root` again, after a language change. */
export function relabelImageMapMarkers(root: Element, trans: (key: string) => string): void {
  root.querySelectorAll(`.${MARKER_CLASS}`).forEach((marker) => labelMarker(marker, trans));
}

/** What an image view needs from the editor, looked up once per editor. */
interface ImageRendering {
  attributes: ExtensionAttribute[];
  HTMLAttributes: Record<string, unknown>;
}

function imageRendering(editor: Editor, type: string): ImageRendering {
  const options = editor.extensionManager.extensions.find((e) => e.name === type)?.options as
    | { HTMLAttributes?: Record<string, unknown> }
    | undefined;
  return {
    attributes: editor.extensionManager.attributes.filter((a) => a.type === type),
    HTMLAttributes: options?.HTMLAttributes ?? {},
  };
}

/**
 * How an image that has no node view of its own (object_resizing off) is shown
 * in the editor: as renderHTML would, without usemap. Like the img ProseMirror
 * makes from renderHTML, it is made again when the image changes, so ProseMirror
 * keeps owning the element's selection class and decorations.
 */
class ImageView implements NodeView {
  dom: HTMLImageElement;

  constructor(private node: PMNode, rendering: ImageRendering) {
    this.dom = document.createElement('img');
    const attrs = editorImageAttributes(node, rendering.attributes, rendering.HTMLAttributes);
    for (const [name, value] of Object.entries(attrs)) {
      if (value != null) this.dom.setAttribute(name, String(value));
    }
  }

  update(node: PMNode): boolean {
    if (!node.sameMarkup(this.node)) return false;
    this.node = node;
    return true;
  }
}

export const ImageMap = Node.create<ImageMapOptions>({
  name: 'imageMap',

  inline: true,

  group: 'inline',

  atom: true,

  selectable: false,

  draggable: false,

  addOptions() {
    return {
      trans: (key: string) => key,
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element: HTMLElement) => mapName(element),
      },
      areas: {
        default: [],
        rendered: false,
        parseHTML: (element: HTMLElement) =>
          mapAreas(element).map((area) => cleanArea((name) => area.getAttribute(name))),
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['image'],
        attributes: {
          usemap: {
            default: null,
            parseHTML: (element: HTMLElement) => validUsemap(element.getAttribute('usemap')),
            renderHTML: (attributes: Record<string, unknown>) => {
              const usemap = validUsemap(attributes.usemap);
              return usemap ? { usemap } : {};
            },
          },
        },
      },
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'map',
        // A map no image could point to is dropped, with its areas.
        getAttrs: (element: HTMLElement) => (mapName(element) ? null : false),
      },
    ];
  },

  renderHTML({ node }) {
    const name = validName(node.attrs.name);
    const areas: unknown[] = Array.isArray(node.attrs.areas) ? node.attrs.areas : [];
    return [
      'map',
      name ? { name } : {},
      ...areas.map((area) => {
        const stored = (area && typeof area === 'object' ? area : {}) as Record<string, unknown>;
        return ['area', { ...withOpenerGuard(cleanArea((attr) => stored[attr])) }];
      }),
    ];
  },

  renderText() {
    return '';
  },

  transformPastedHTML(html: string) {
    return liftMapContent(html);
  },

  addNodeView() {
    return () => {
      const dom = document.createElement('span');
      dom.className = MARKER_CLASS;
      dom.setAttribute('contenteditable', 'false');
      dom.setAttribute('role', 'img');
      labelMarker(dom, this.options.trans);
      return { dom, ignoreMutation: () => true };
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    let rendering: ImageRendering | null = null;
    return [
      new Plugin({
        key: new PluginKey('imageMapImageView'),
        props: {
          // ProseMirror takes the editor's own node views first, so this one is
          // used only for an image that has none (ResizableImage has its own,
          // which also leaves usemap off).
          nodeViews: {
            image: (node) => new ImageView(node, (rendering ??= imageRendering(editor, node.type.name))),
          },
        },
      }),
    ];
  },
});
