import { unescapeTagSlashes } from '../../src/utils/unescapeTagSlashes';

describe('unescapeTagSlashes', () => {
  it('repairs backslash-escaped closing tags', () => {
    expect(unescapeTagSlashes('<p>Hi<\\/p>')).toBe('<p>Hi</p>');
    expect(unescapeTagSlashes('<ul><li>a<\\/li><\\/ul>')).toBe('<ul><li>a</li></ul>');
  });

  it('repairs every occurrence', () => {
    const input = '<p>Last Week<\\/p><ul><li>x<\\/li><li>y<\\/li><\\/ul>';
    expect(unescapeTagSlashes(input)).toBe('<p>Last Week</p><ul><li>x</li><li>y</li></ul>');
  });

  it('leaves clean HTML untouched (idempotent)', () => {
    const clean = '<p>Hi</p><ul><li>a</li></ul>';
    expect(unescapeTagSlashes(clean)).toBe(clean);
    expect(unescapeTagSlashes(unescapeTagSlashes('<p>Hi<\\/p>'))).toBe('<p>Hi</p>');
  });

  it('does not touch a lone escaped slash that is not a closing tag', () => {
    // A backslash-slash inside text (not preceded by "<") is left alone.
    expect(unescapeTagSlashes('<p>a\\/b</p>')).toBe('<p>a\\/b</p>');
  });

  it('handles empty / falsy input', () => {
    expect(unescapeTagSlashes('')).toBe('');
  });
});
