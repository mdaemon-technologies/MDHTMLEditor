import { fillEmptyBlocks } from '../../src/utils/fillEmptyBlocks';

describe('fillEmptyBlocks', () => {
  it('fills a bare empty <div> (the reported blank-line case)', () => {
    const out = fillEmptyBlocks('<div>line1</div><div></div><div>line2</div>');
    expect(out).toBe('<div>line1</div><div><br></div><div>line2</div>');
  });

  it('fills an empty <p>', () => {
    expect(fillEmptyBlocks('<p></p>')).toBe('<p><br></p>');
  });

  it('fills consecutive blank lines', () => {
    expect(fillEmptyBlocks('<div></div><div></div>')).toBe('<div><br></div><div><br></div>');
  });

  it('fills a styled-but-empty block (font set on a blank line)', () => {
    const out = fillEmptyBlocks('<div><span style="font-family:Arial"></span></div>');
    expect(out).toBe('<div><span style="font-family:Arial"></span><br></div>');
  });

  it('fills a block whose default font is inlined on the block itself', () => {
    // BlockFontStyle renders the configured font onto the block's style attr, so
    // an empty line serializes as `<p style="…"></p>`, not a bare `<p></p>`.
    const out = fillEmptyBlocks('<p style="font-family:Arial;font-size:12pt"></p>');
    expect(out).toBe('<p style="font-family:Arial;font-size:12pt"><br></p>');
  });

  it('fills empty headings', () => {
    expect(fillEmptyBlocks('<h1></h1><h3></h3>')).toBe('<h1><br></h1><h3><br></h3>');
  });

  it('does not touch blocks that already have a <br>', () => {
    expect(fillEmptyBlocks('<div><br></div>')).toBe('<div><br></div>');
  });

  it('is idempotent (no <br><br> accumulation)', () => {
    const once = fillEmptyBlocks('<div></div>');
    expect(fillEmptyBlocks(once)).toBe(once);
  });

  it('leaves blocks with text alone', () => {
    expect(fillEmptyBlocks('<div>hello</div>')).toBe('<div>hello</div>');
  });

  it('leaves blocks with only whitespace text alone-but-fills them (whitespace is not visible content)', () => {
    // Whitespace-only text collapses to nothing when rendered, so it is treated
    // as a blank line and filled.
    expect(fillEmptyBlocks('<div>   </div>')).toBe('<div>   <br></div>');
  });

  it('does not fill blocks whose only content is a void/embedded element', () => {
    expect(fillEmptyBlocks('<div><img src="cid:x"></div>')).toBe('<div><img src="cid:x"></div>');
  });

  it('does not fill a container that only holds nested blocks (only the inner blank line is filled)', () => {
    expect(fillEmptyBlocks('<div><div></div></div>')).toBe('<div><div><br></div></div>');
  });

  it('does not fill empty table cells or list items', () => {
    expect(fillEmptyBlocks('<table><tr><td></td></tr></table>')).toContain('<td></td>');
    expect(fillEmptyBlocks('<ul><li></li></ul>')).toContain('<li></li>');
  });

  it('returns empty input unchanged', () => {
    expect(fillEmptyBlocks('')).toBe('');
  });
});
