/**
 * svgIcon Tests
 * Turning icon markup into nodes to draw inline: only SVG drawing elements are
 * kept, so markup cannot run script when the icon is shown.
 */

import { parseSvgIcon } from '../../src/utils/svgIcon';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Parse into a holder element, so the result can be queried. */
function render(markup: string): HTMLElement {
  const holder = document.createElement('span');
  holder.appendChild(parseSvgIcon(markup));
  return holder;
}

describe('parseSvgIcon', () => {
  const clock =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

  it('keeps an ordinary icon, with its drawing attributes', () => {
    const holder = render(clock);
    const svg = holder.querySelector('svg')!;
    expect(svg.namespaceURI).toBe(SVG_NS);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(holder.querySelector('circle')?.getAttribute('r')).toBe('10');
    expect(holder.querySelector('polyline')).not.toBeNull();
  });

  it('keeps gradients, clip paths and links inside the icon', () => {
    const holder = render(
      '<svg viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient>' +
        '<clipPath id="c"><rect width="10" height="10"/></clipPath><symbol id="s"><path d="M0 0h1"/></symbol></defs>' +
        '<g clip-path="url(#c)"><use href="#s"/><use xlink:href="#s"/></g></svg>',
    );
    expect(holder.querySelector('linearGradient stop')).not.toBeNull();
    expect(holder.querySelector('clipPath rect')).not.toBeNull();
    const uses = holder.querySelectorAll('use');
    expect(uses).toHaveLength(2);
    expect(uses[0].getAttribute('href')).toBe('#s');
    expect(uses[1].getAttribute('xlink:href')).toBe('#s');
  });

  it('accepts a copied file, with an XML prolog and comments', () => {
    const holder = render(`<?xml version="1.0" encoding="UTF-8"?>\n<!-- clock -->\n${clock}`);
    expect(holder.querySelector('svg circle')).not.toBeNull();
    expect(holder.innerHTML).not.toMatch(/<!--|<\?/);
  });

  it('removes script and event handlers', () => {
    const holder = render(
      '<svg onload="alert(1)" viewBox="0 0 24 24"><script>alert(2)</script>' +
        '<circle cx="12" cy="12" r="10" onclick="alert(3)" OnMouseOver="alert(4)"/></svg>',
    );
    expect(holder.querySelector('script')).toBeNull();
    expect(holder.innerHTML).not.toMatch(/alert/);
    expect(holder.querySelector('circle')).not.toBeNull();
  });

  it.each([
    ['a link', '<a href="javascript:alert(1)"><path d="M0 0h1"/></a>'],
    ['foreign HTML content', '<foreignObject><img src="x" onerror="alert(1)"></foreignObject>'],
    ['an animation that rewrites a link', '<a><set attributeName="href" to="javascript:alert(1)"/></a>'],
    ['an animate element', '<animate attributeName="href" values="javascript:alert(1)"/>'],
    ['a style element', '<style>@import url(https://example.test/x.css)</style>'],
    ['an iframe', '<iframe src="https://example.test"></iframe>'],
    ['an external image', '<image href="https://example.test/track.png"/>'],
  ])('removes %s', (_label, inner) => {
    const holder = render(`<svg viewBox="0 0 24 24">${inner}<rect width="1" height="1"/></svg>`);
    expect(holder.querySelector('a, foreignObject, set, animate, style, iframe, image, img')).toBeNull();
    expect(holder.innerHTML).not.toMatch(/javascript|example\.test|alert/);
    expect(holder.querySelector('rect')).not.toBeNull();
  });

  it.each([
    'javascript:alert(1)',
    'https://example.test/sprite.svg#icon',
    'data:image/svg+xml,<svg onload="alert(1)"/>',
  ])('removes a reference to %j that is not a link inside the icon', (href) => {
    const holder = render(`<svg><use href="${href.replace(/"/g, '&quot;')}" xlink:href="${href.replace(/"/g, '&quot;')}"/></svg>`);
    const use = holder.querySelector('use')!;
    expect(use.hasAttribute('href')).toBe(false);
    expect(use.hasAttribute('xlink:href')).toBe(false);
  });

  it('drops HTML outside or around the svg', () => {
    const holder = render(`<img src="x" onerror="alert(1)"><b>bold</b>${clock}<div>${clock}</div>`);
    expect(holder.querySelector('img, b, div')).toBeNull();
    expect(holder.querySelectorAll('svg')).toHaveLength(1);
  });

  it('draws nothing for markup with no svg in it', () => {
    expect(render('<img src="x" onerror="alert(1)">').innerHTML).toBe('');
  });
});
