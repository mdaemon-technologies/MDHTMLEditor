import { containsTabSpan, isBareTabSpan, isTabSpan } from '../../src/utils/tabSpan';

function el(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild!;
}

describe('isTabSpan', () => {
  it('accepts a span of tabs kept by white-space: pre or pre-wrap', () => {
    expect(isTabSpan(el('<span style="white-space: pre">\t</span>'))).toBe(true);
    expect(isTabSpan(el('<span style="white-space:pre-wrap;">\t\t</span>'))).toBe(true);
    expect(isTabSpan(el('<span style="font-size: 11pt; white-space: pre">\t</span>'))).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isTabSpan(el('<span>\t</span>'))).toBe(false);
    expect(isTabSpan(el('<span style="white-space: normal">\t</span>'))).toBe(false);
    expect(isTabSpan(el('<span style="white-space: pre">a\t</span>'))).toBe(false);
    expect(isTabSpan(el('<span style="white-space: pre"></span>'))).toBe(false);
    expect(isTabSpan(el('<b style="white-space: pre">\t</b>'))).toBe(false);
    expect(isTabSpan(el('<span style="white-space: pre">\t<img src="a.png"></span>'))).toBe(false);
  });

  it('accepts white-space: break-spaces, which keeps a tab too', () => {
    expect(isTabSpan(el('<span style="white-space: break-spaces">\t</span>'))).toBe(true);
  });
});

describe('isBareTabSpan', () => {
  it('accepts a tab span whose style states white-space and nothing else', () => {
    expect(isBareTabSpan(el('<span style="white-space: pre;">\t</span>'))).toBe(true);
    expect(isBareTabSpan(el('<span style=" white-space:pre ">\t\t</span>'))).toBe(true);
  });

  it('rejects a tab span with any other style, and spans that are not tab spans', () => {
    expect(isBareTabSpan(el('<span style="white-space: pre; font-size: 11pt">\t</span>'))).toBe(false);
    expect(isBareTabSpan(el('<span style="color: red; white-space: pre">\t</span>'))).toBe(false);
    expect(isBareTabSpan(el('<span style="white-space: pre">x</span>'))).toBe(false);
  });
});

describe('containsTabSpan', () => {
  it('finds a tab span on the element or inside it', () => {
    expect(containsTabSpan(el('<span style="white-space: pre">\t</span>'))).toBe(true);
    expect(containsTabSpan(el('<p><b><span style="white-space: pre">\t</span></b></p>'))).toBe(true);
    expect(containsTabSpan(el('<p><span>\t</span></p>'))).toBe(false);
  });
});
