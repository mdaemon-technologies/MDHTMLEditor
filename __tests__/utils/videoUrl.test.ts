/**
 * videoUrl Tests
 * parseVideoUrl reads a YouTube, Vimeo or Dailymotion link as pasted from the
 * address bar or a share button, and rebuilds the canonical link and thumbnail
 * from the video's id alone: nothing of the pasted string is passed through.
 */

import { parseVideoUrl } from '../../src/utils/videoUrl';

const YT = 'abcDEF12345';
const youtube = {
  provider: 'youtube',
  id: YT,
  href: `https://www.youtube.com/watch?v=${YT}`,
  thumbnail: `https://img.youtube.com/vi/${YT}/hqdefault.jpg`,
};

describe('parseVideoUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${YT}`,
    `https://m.youtube.com/watch?feature=share&v=${YT}`,
    `http://www.youtube.com/watch?v=${YT}`,
    `www.youtube.com/watch?v=${YT}`,
    `https://youtu.be/${YT}`,
    `https://youtu.be/${YT}?si=abc`,
    `youtu.be/${YT}`,
    `https://www.youtube.com/shorts/${YT}`,
    `https://www.youtube.com/embed/${YT}`,
    `https://www.youtube-nocookie.com/embed/${YT}`,
    `https://www.youtube.com/live/${YT}`,
    `https://www.youtube.com/v/${YT}`,
    `  https://YOUTU.BE/${YT}  `,
  ])('reads the YouTube link %s', (input) => {
    expect(parseVideoUrl(input)).toEqual(youtube);
  });

  it.each([
    ['https://vimeo.com/123456789', '123456789', 'https://vimeo.com/123456789'],
    ['https://www.vimeo.com/123456789?share=copy', '123456789', 'https://vimeo.com/123456789'],
    ['https://player.vimeo.com/video/123456789', '123456789', 'https://vimeo.com/123456789'],
    ['https://vimeo.com/channels/staffpicks/123456789', '123456789', 'https://vimeo.com/123456789'],
    // An unlisted video can only be watched with its hash, which embed codes give as h=.
    ['https://vimeo.com/123456789/a1b2c3d4e5', '123456789', 'https://vimeo.com/123456789/a1b2c3d4e5'],
    ['https://player.vimeo.com/video/123456789?h=a1b2c3d4e5', '123456789', 'https://vimeo.com/123456789/a1b2c3d4e5'],
    ['https://vimeo.com/123456789?h=a1b2c3d4e5', '123456789', 'https://vimeo.com/123456789/a1b2c3d4e5'],
    ['https://player.vimeo.com/video/123456789?h=zz%22', '123456789', 'https://vimeo.com/123456789'],
  ])('reads the Vimeo link %s, which has no thumbnail of its own', (input, id, href) => {
    expect(parseVideoUrl(input)).toEqual({ provider: 'vimeo', id, href });
  });

  it.each([
    'https://www.dailymotion.com/video/x8abc12',
    'https://dailymotion.com/video/x8abc12?playlist=x6hynp',
    'https://dai.ly/x8abc12',
    'https://www.dailymotion.com/embed/video/x8abc12',
    'https://www.dailymotion.com/video/x8abc12_product-tour',
    'https://geo.dailymotion.com/player.html?video=x8abc12',
    'https://geo.dailymotion.com/player/xabcd.html?video=x8abc12',
  ])('reads the Dailymotion link %s', (input) => {
    expect(parseVideoUrl(input)).toEqual({
      provider: 'dailymotion',
      id: 'x8abc12',
      href: 'https://www.dailymotion.com/video/x8abc12',
      thumbnail: 'https://www.dailymotion.com/thumbnail/video/x8abc12',
    });
  });

  it.each([
    [`https://youtube.com/watch?v=${YT}&t=42s`, 42],
    [`https://youtu.be/${YT}?t=42`, 42],
    [`https://www.youtube.com/watch?v=${YT}&t=1m30s`, 90],
    [`https://www.youtube.com/watch?v=${YT}&t=1h2m3s`, 3723],
    [`https://www.youtube.com/embed/${YT}?start=15`, 15],
  ])('keeps the start time of %s', (input, seconds) => {
    expect(parseVideoUrl(input)).toEqual({ ...youtube, href: `${youtube.href}&t=${seconds}s` });
  });

  it.each([`https://youtu.be/${YT}?t=0`, `https://youtu.be/${YT}?t=abc`, `https://youtu.be/${YT}?t=42%22`, `https://youtu.be/${YT}?t=1000000`, `https://youtu.be/${YT}?t=99999999999999999999999`])(
    'ignores a start time that is zero or not a time: %s',
    (input) => {
      expect(parseVideoUrl(input)).toEqual(youtube);
    },
  );

  it.each([
    ['an empty string', ''],
    ['text that is not a link', 'my video'],
    ['another site', 'https://example.com/watch?v=abcDEF12345'],
    ['a host ending in a video site', `https://notyoutube.com/watch?v=${YT}`],
    ['a host starting with a video site', `https://youtube.com.example.test/watch?v=${YT}`],
    ['a video site under another host', `https://youtu.be.example.test/${YT}`],
    ['a script link', `javascript:alert(1)//youtube.com/watch?v=${YT}`],
    ['another protocol', `ftp://youtube.com/watch?v=${YT}`],
    ['a YouTube id too short', 'https://youtu.be/abcDEF1234'],
    ['a YouTube id too long', 'https://youtu.be/abcDEF123456'],
    ['a YouTube id with other characters', 'https://www.youtube.com/watch?v=abcDE%2212345'],
    ['a YouTube page without a video', 'https://www.youtube.com/@channel'],
    // Embed codes for a playlist and a channel's live stream: 11 characters, but not a video.
    ['a YouTube playlist embed', 'https://www.youtube.com/embed/videoseries?list=PLabcdef123'],
    ['a YouTube live stream embed', 'https://www.youtube.com/embed/live_stream?channel=UCabcdef'],
    ['a Vimeo id that is not a number', 'https://vimeo.com/about'],
    ['a Vimeo hash with other characters', 'https://vimeo.com/123456789/zz"><b'],
    ['a Dailymotion id with other characters', 'https://www.dailymotion.com/video/x8a-c12'],
    ['credentials in the link', `https://user:pass@youtube.com/watch?v=${YT}`],
    ['a port in the link', `https://youtube.com:8443/watch?v=${YT}`],
  ])('rejects %s', (_name, input) => {
    expect(parseVideoUrl(input)).toBeNull();
  });
});
