/**
 * Reads a YouTube, Vimeo or Dailymotion link, as pasted from the address bar
 * or a share button, into the video it points at. The link and thumbnail are
 * rebuilt from the video's id, so nothing of the pasted string reaches the
 * content beyond a strictly checked id, a YouTube start time (in seconds) and
 * an unlisted Vimeo video's hash.
 */

import type { MediaVideo } from '../types';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[0-9a-f]{6,20}$/;
const DAILYMOTION_ID = /^[A-Za-z0-9]{5,12}$/;

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com']);
const DAILYMOTION_HOSTS = new Set(['dailymotion.com', 'www.dailymotion.com']);

/** Path segments of `/a/b/c`, without empty ones. */
const segments = (url: URL) => url.pathname.split('/').filter(Boolean);

/**
 * A start time in seconds from YouTube's `t` (`42`, `42s`, `1m30s`, `1h2m3s`) or
 * `start` parameter, or null for none, zero or anything else.
 */
function startSeconds(url: URL): number | null {
  const value = url.searchParams.get('t') ?? url.searchParams.get('start');
  if (!value) return null;
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(value);
  if (!parts || !parts.slice(1).some(Boolean)) return null;
  const [hours, minutes, seconds] = parts.slice(1).map((part) => Number(part ?? 0));
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 && total < 1e6 ? total : null;
}

// Embed paths for a playlist and a channel's live stream: 11 characters, but not a video id.
const YOUTUBE_NOT_IDS = new Set(['videoseries', 'live_stream']);

function youtube(id: string | null | undefined, url: URL): MediaVideo | null {
  if (!id || !YOUTUBE_ID.test(id) || YOUTUBE_NOT_IDS.has(id)) return null;
  const start = startSeconds(url);
  return {
    provider: 'youtube',
    id,
    href: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`,
    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
}

function vimeo(id: string | undefined, hash?: string | null): MediaVideo | null {
  if (!id || !VIMEO_ID.test(id)) return null;
  // An unlisted video can only be watched with its hash.
  const unlisted = hash && VIMEO_HASH.test(hash) ? `/${hash}` : '';
  return { provider: 'vimeo', id, href: `https://vimeo.com/${id}${unlisted}` };
}

function dailymotion(id: string | undefined): MediaVideo | null {
  if (!id || !DAILYMOTION_ID.test(id)) return null;
  return {
    provider: 'dailymotion',
    id,
    href: `https://www.dailymotion.com/video/${id}`,
    thumbnail: `https://www.dailymotion.com/thumbnail/video/${id}`,
  };
}

/**
 * Whether the text starts with a scheme (`https:`, `javascript:`). A link
 * copied without one (`youtu.be/…`) is a web link; `host:8443` is a port, not
 * a scheme.
 */
const hasScheme = (text: string) => /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text);

/** The video a link points at, or null when it is not a YouTube, Vimeo or Dailymotion video link. */
export function parseVideoUrl(input: string): MediaVideo | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(hasScheme(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  const path = segments(url);

  if (host === 'youtu.be') return path.length === 1 ? youtube(path[0], url) : null;
  if (YOUTUBE_HOSTS.has(host)) {
    if (path.length === 1 && path[0] === 'watch') return youtube(url.searchParams.get('v'), url);
    if (path.length === 2 && ['shorts', 'embed', 'live', 'v'].includes(path[0])) return youtube(path[1], url);
    return null;
  }

  // An embed code gives an unlisted video's hash as h=.
  const vimeoHash = url.searchParams.get('h');
  if (host === 'player.vimeo.com') return path.length === 2 && path[0] === 'video' ? vimeo(path[1], vimeoHash) : null;
  if (VIMEO_HOSTS.has(host)) {
    if (path.length === 1) return vimeo(path[0], vimeoHash);
    if (path.length === 2 && VIMEO_ID.test(path[0])) return VIMEO_HASH.test(path[1]) ? vimeo(path[0], path[1]) : null;
    if (path.length === 3 && path[0] === 'channels') return vimeo(path[2]);
    return null;
  }

  if (host === 'dai.ly') return path.length === 1 ? dailymotion(path[0]) : null;
  if (DAILYMOTION_HOSTS.has(host)) {
    // /video/{id}, or /video/{id}_{title} as the site's own links have it.
    if (path.length === 2 && path[0] === 'video') return dailymotion(path[1].split('_')[0]);
    if (path.length === 3 && path[0] === 'embed' && path[1] === 'video') return dailymotion(path[2]);
    return null;
  }
  // The player: geo.dailymotion.com/player.html?video={id}, or /player/{player}.html?video={id}.
  if (host === 'geo.dailymotion.com') {
    const isPlayer = (path.length === 1 && path[0] === 'player.html')
      || (path.length === 2 && path[0] === 'player' && path[1].endsWith('.html'));
    return isPlayer ? dailymotion(url.searchParams.get('video') ?? undefined) : null;
  }

  return null;
}
