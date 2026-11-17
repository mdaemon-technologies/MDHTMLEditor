import { escapeHtml } from '../../src/utils/escapeHtml';

describe('escapeHtml', () => {
  it('escapes the characters that are markup in content and quoted attributes', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('escapes & first, so an entity in the text stays as written', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('shows as the original text when parsed as HTML', () => {
    const text = `<img src=x onerror="alert(1)"> & 'quoted' "text"`;
    const el = document.createElement('div');
    el.innerHTML = `<span title="${escapeHtml(text)}">${escapeHtml(text)}</span>`;
    const span = el.firstElementChild as HTMLElement;
    expect(span.textContent).toBe(text);
    expect(span.title).toBe(text);
    expect(el.querySelector('img')).toBeNull();
  });
});
