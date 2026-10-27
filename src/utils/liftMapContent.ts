/**
 * The areas that belong to a map: every <area> inside it, at any depth (HTML
 * lets them sit inside other content of the map), but not those of a map
 * nested in it.
 */
export function mapAreas(map: Element): Element[] {
  return Array.from(map.querySelectorAll('area')).filter((area) => area.closest('map') === map);
}

/** Whether a map holds anything but its areas, whitespace and comments. */
function holdsMoreThanAreas(map: Element): boolean {
  return Array.from(map.childNodes).some((node) =>
    node.nodeType === 1 /* Node.ELEMENT_NODE */
      ? (node as Element).tagName !== 'AREA'
      : node.nodeType === 3 /* Node.TEXT_NODE */ && /[^ \t\n\r\f]/.test(node.textContent ?? ''));
}

/**
 * Move everything but the <area>s out of each <map>, to just after it.
 *
 * A <map> can hold other content beside its areas (often text links repeating
 * the hotspots), and the browser shows it. The editor keeps a map as one atom
 * holding only its areas, and ProseMirror does not parse inside an atom, so
 * without this pass that content would be lost. Runs on every way HTML enters
 * the editor: setContent()/insertContent() and paste.
 */
export function liftMapContent(html: string): string {
  if (!/<map[\s>]/i.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const maps = Array.from(doc.body.querySelectorAll('map'));
  // Pasted HTML has been sanitized as a tree already; only write it out again
  // (and have it parsed once more) when there is something to move.
  if (!maps.some(holdsMoreThanAreas)) return html;

  // Last first, so a map nested in another is lifted out of it, with its own
  // areas, before its parent is handled.
  for (const map of maps.reverse()) {
    const areas = mapAreas(map);
    areas.forEach((area) => area.remove());
    map.after(...Array.from(map.childNodes));
    map.append(...areas);
  }

  return doc.body.innerHTML;
}
