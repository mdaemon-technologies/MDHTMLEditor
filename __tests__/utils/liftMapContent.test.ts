import { liftMapContent } from '../../src/utils/liftMapContent';

describe('liftMapContent', () => {
  it('leaves HTML without a map untouched', () => {
    const html = '<p>No <b>map</b> here, <a href="#mapping">mapping</a></p>';
    expect(liftMapContent(html)).toBe(html);
  });

  it('leaves a map holding only areas as it is', () => {
    const html = '<map name="m"><area shape="rect" coords="0,0,1,1"></map>';
    expect(liftMapContent(html)).toBe(html);
  });

  it('returns the HTML it was given when no map has anything to move', () => {
    // Not parsed and written out again: the uppercase tags would not survive that.
    const html = '<P>Text</P><MAP name="m">\n  <AREA shape="rect" coords="0,0,1,1">\n</MAP>';
    expect(liftMapContent(html)).toBe(html);
  });

  it('moves other content to just after the map, keeping the areas in it', () => {
    expect(liftMapContent('<p><map name="m"><a href="/a">A</a> | <area coords="0,0,1,1"></map>end</p>'))
      .toBe('<p><map name="m"><area coords="0,0,1,1"></map><a href="/a">A</a> | end</p>');
  });

  it('keeps an area that sits inside other content of the map', () => {
    expect(liftMapContent('<map name="m"><span>text<area coords="1,1,2,2"></span></map>'))
      .toBe('<map name="m"><area coords="1,1,2,2"></map><span>text</span>');
  });

  it('handles every map, in order', () => {
    expect(liftMapContent('<map name="a">x<area alt="1"></map><map name="b">y<area alt="2"></map>'))
      .toBe('<map name="a"><area alt="1"></map>x<map name="b"><area alt="2"></map>y');
  });
});
