// Minimal dependency-free static file server for the UMD / script-tag demo.
//
// The UMD bundle is meant to be consumed WITHOUT a bundler, so this serves the
// built files (`dist/index.umd.js`, `dist/styles.css`) as raw static assets with
// correct MIME types — unlike `npm run demo`, which runs the source through Vite's
// dev pipeline. Run via `npm run demo:umd` (which builds first).
//
// Serves the project root so `/test/umd.html` can reference `../dist/...`.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url))); // project root
const PORT = Number(process.env.PORT) || 5174;
const ENTRY = '/test/umd.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = ENTRY;

    // Resolve against ROOT and prevent path traversal outside it.
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(filePath);
    if (info.isDirectory()) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}${ENTRY}`;
  console.log(`\n  UMD demo serving the project root as static files (no bundler).`);
  console.log(`  ➜  ${url}\n`);

  // Best-effort: open the default browser. Harmless if it fails (URL is printed above).
  const opener =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] :
    process.platform === 'darwin' ? ['open', [url]] :
    ['xdg-open', [url]];
  try {
    spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* ignore — user can open the URL manually */
  }
});
