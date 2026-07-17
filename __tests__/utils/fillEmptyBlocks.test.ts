import { fillEmptyBlocks, stripEmptyLineBreaks } from '../../src/utils/fillEmptyBlocks';

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

describe('stripEmptyLineBreaks', () => {
  it('strips the lone <br> from a bare empty <div> (the export artifact)', () => {
    expect(stripEmptyLineBreaks('<div><br></div>')).toBe('<div></div>');
  });

  it('strips the lone <br> from an empty <p>', () => {
    expect(stripEmptyLineBreaks('<p><br></p>')).toBe('<p></p>');
  });

  it('strips from consecutive filled blank lines', () => {
    expect(stripEmptyLineBreaks('<div><br></div><div><br></div>')).toBe('<div></div><div></div>');
  });

  it('strips from empty headings', () => {
    expect(stripEmptyLineBreaks('<h1><br></h1><h3><br></h3>')).toBe('<h1></h1><h3></h3>');
  });

  it('strips from a styled-but-empty block, keeping the inline wrapper (font on a blank line)', () => {
    // fillEmptyBlocks emits <span>…</span><br>; the <span> is not content-bearing
    // so the <br> is still the sole content element and is removed.
    const out = stripEmptyLineBreaks('<div><span style="font-family:Arial"></span><br></div>');
    expect(out).toBe('<div><span style="font-family:Arial"></span></div>');
  });

  it('strips from a block whose default font is inlined on the block itself', () => {
    const out = stripEmptyLineBreaks('<p style="font-family:Arial;font-size:12pt"><br></p>');
    expect(out).toBe('<p style="font-family:Arial;font-size:12pt"></p>');
  });

  it('leaves a real trailing hard break alone (user pressed Shift+Enter)', () => {
    // The block has text content, so the <br> is genuine content, not a filler.
    expect(stripEmptyLineBreaks('<div>hello<br></div>')).toBe('<div>hello<br></div>');
  });

  it('leaves a hard break between two lines of text alone', () => {
    expect(stripEmptyLineBreaks('<div>a<br>b</div>')).toBe('<div>a<br>b</div>');
  });

  it('leaves two stacked <br> alone (two intentional breaks, not one filler)', () => {
    expect(stripEmptyLineBreaks('<div><br><br></div>')).toBe('<div><br><br></div>');
  });

  it('does not touch a block whose only content is a void/embedded element', () => {
    expect(stripEmptyLineBreaks('<div><img src="cid:x"></div>')).toBe('<div><img src="cid:x"></div>');
  });

  it('does not touch empty table cells or list items', () => {
    expect(stripEmptyLineBreaks('<table><tr><td><br></td></tr></table>')).toContain('<td><br></td>');
    expect(stripEmptyLineBreaks('<ul><li><br></li></ul>')).toContain('<li><br></li>');
  });

  it('is idempotent (a block with no <br> is left untouched)', () => {
    const once = stripEmptyLineBreaks('<div><br></div>');
    expect(stripEmptyLineBreaks(once)).toBe(once);
  });

  it('returns empty input unchanged', () => {
    expect(stripEmptyLineBreaks('')).toBe('');
  });

  it('is the inverse of fillEmptyBlocks (strip ∘ fill = identity on blank lines)', () => {
    const original = '<div>a</div><div></div><div>b</div>';
    expect(stripEmptyLineBreaks(fillEmptyBlocks(original))).toBe(original);
  });
});
