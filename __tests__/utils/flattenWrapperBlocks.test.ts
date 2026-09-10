import { flattenWrapperBlocks } from '../../src/utils/flattenWrapperBlocks';

describe('flattenWrapperBlocks', () => {
  describe('dissolving wrappers', () => {
    it('unwraps a div whose children are all blocks', () => {
      expect(flattenWrapperBlocks('<div><div>A</div><div>B</div></div>')).toBe(
        '<div>A</div><div>B</div>',
      );
    });

    it('unwraps nested wrappers down to a fixpoint', () => {
      // The shape a mail client or CMS produces: several container divs, one
      // inside the next, before any real line. Each one used to import as its
      // own blank line.
      expect(flattenWrapperBlocks('<div><div><div><div><div>A</div></div></div></div></div>')).toBe(
        '<div>A</div>',
      );
    });

    it('unwraps a wrapper around a list', () => {
      expect(flattenWrapperBlocks('<div><ul><li>a</li></ul></div>')).toBe('<ul><li>a</li></ul>');
    });

    it('unwraps a wrapper around a table', () => {
      const table = '<table><tbody><tr><td>a</td></tr></tbody></table>';
      expect(flattenWrapperBlocks(`<div>${table}</div>`)).toBe(table);
    });

    it('unwraps a wrapper whose only block child is separated by insignificant whitespace', () => {
      // Pretty-printed source: newlines and tabs around the block child are
      // whitespace the HTML spec collapses, so they must not count as text.
      expect(flattenWrapperBlocks('<div>\n\t<div>A</div>\n</div>')).toBe('\n\t<div>A</div>\n');
    });

    it('is idempotent', () => {
      const once = flattenWrapperBlocks('<div><div><div>A</div></div></div>');
      expect(flattenWrapperBlocks(once)).toBe(once);
    });
  });

  describe('blocks it must leave alone', () => {
    it('keeps a genuinely empty div — that is a blank line, not a wrapper', () => {
      expect(flattenWrapperBlocks('<div></div><div>A</div>')).toBe('<div></div><div>A</div>');
    });

    it('keeps a div that has text of its own alongside a block', () => {
      // ProseMirror already opens a paragraph for the leading text, so there is
      // nothing to gain and an ordering risk in touching this.
      expect(flattenWrapperBlocks('<div>lead<div>A</div></div>')).toBe('<div>lead<div>A</div></div>');
    });

    it('keeps a div holding only a non-breaking space', () => {
      // U+00A0 does not collapse: it is visible content, so the div is a line.
      // (Re-serialized as the entity by the DOM, as with the other HTML passes.)
      expect(flattenWrapperBlocks('<div>\u00a0</div>')).toBe('<div>&nbsp;</div>');
    });

    it('keeps the signature container', () => {
      // SignatureBlock parses div[id="signature"] at priority 100; dissolving it
      // would scatter the signature into ordinary paragraphs.
      expect(flattenWrapperBlocks('<div id="signature"><div>s</div></div>')).toBe(
        '<div id="signature"><div>s</div></div>',
      );
    });

    it('unwraps around the signature container without touching it', () => {
      expect(flattenWrapperBlocks('<div><div id="signature"><div>s</div></div></div>')).toBe(
        '<div id="signature"><div>s</div></div>',
      );
    });

    it('keeps a blockquote around blocks', () => {
      // blockquote is a real node with block content — its nesting survives the
      // parse, so it is not a wrapper.
      expect(flattenWrapperBlocks('<blockquote><div>A</div></blockquote>')).toBe(
        '<blockquote><div>A</div></blockquote>',
      );
    });

    it('keeps the block inside a list item and a table cell', () => {
      expect(flattenWrapperBlocks('<ul><li><div>a</div></li></ul>')).toBe(
        '<ul><li><div>a</div></li></ul>',
      );
      expect(flattenWrapperBlocks('<table><tbody><tr><td><div>a</div></td></tr></tbody></table>')).toBe(
        '<table><tbody><tr><td><div>a</div></td></tr></tbody></table>',
      );
    });

    it('leaves a <pre> and its indentation untouched', () => {
      const pre = '<pre><code>a\n\tb\n</code></pre>';
      expect(flattenWrapperBlocks(pre)).toBe(pre);
    });

    it('handles empty input', () => {
      expect(flattenWrapperBlocks('')).toBe('');
    });
  });

  describe('inherited style', () => {
    it('carries the wrapper font down to the lines it wrapped', () => {
      // The LookOut shape: one font div around the whole body. Without this the
      // font was stranded on the empty block the wrapper became, and every real
      // line silently fell back to the editor default.
      const out = flattenWrapperBlocks(
        '<div style="font-family:Georgia;font-size:10pt"><div>A</div><div>B</div></div>',
      );
      expect(out).toContain('font-family: Georgia');
      expect(out.match(/font-size: 10pt/g)).toHaveLength(2);
      expect(out).not.toContain('<div><div>');
    });

    it('does not override a property the child already states', () => {
      // The child is the more specific author intent, and would have won by CSS
      // inheritance anyway. Untouched, so its style attribute is left verbatim.
      const out = flattenWrapperBlocks(
        '<div style="font-size:10pt"><div style="font-size:20pt">A</div></div>',
      );
      expect(out).toBe('<div style="font-size:20pt">A</div>');
    });

    it('carries inherited style through several wrapper levels', () => {
      const out = flattenWrapperBlocks(
        '<div style="color:#ff0000"><div style="font-size:10pt"><div>A</div></div></div>',
      );
      expect(out).toContain('font-size: 10pt');
      expect(out).toContain('color: rgb(255, 0, 0)');
    });

    it('drops box properties that cannot be re-expressed on the children', () => {
      // border/background describe the wrapper itself; ProseMirror discards the
      // wrapper either way, so there is nothing to carry down.
      const out = flattenWrapperBlocks(
        '<div style="border:1px solid red;background:blue"><div>A</div></div>',
      );
      expect(out).not.toContain('border');
      expect(out).not.toContain('background');
    });
  });
});
