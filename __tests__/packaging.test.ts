/**
 * Packaging / build-config drift guards.
 *
 * These do NOT build anything — they assert that the package metadata and Vite
 * config stay consistent with the documented UMD output. If someone renames the
 * UMD file or drops the format, these fail fast (see dist-umd.smoke.ts for the
 * post-build check that the file actually exists and works).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const UMD_FILE = 'dist/index.umd.js';

describe('Packaging metadata (package.json)', () => {
  const pkg = JSON.parse(read('package.json')) as {
    version: string;
    unpkg?: string;
    jsdelivr?: string;
    exports: Record<string, unknown>;
  };

  it('advertises the UMD bundle to CDNs via unpkg/jsdelivr', () => {
    expect(pkg.unpkg).toBe(UMD_FILE);
    expect(pkg.jsdelivr).toBe(UMD_FILE);
  });

  it('exposes the UMD bundle through the ./umd export subpath', () => {
    expect(pkg.exports['./umd']).toBe(`./${UMD_FILE}`);
  });

  it('declares a demo:umd script that builds before serving', () => {
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['demo:umd']).toBeDefined();
    expect(scripts['demo:umd']).toContain('build');
    expect(scripts['demo:umd']).toContain('serve-umd.mjs');
  });
});

describe('Build config (vite.config.ts)', () => {
  const cfg = read('vite.config.ts');

  it('emits the umd format alongside es and cjs', () => {
    const formats = cfg.match(/formats:\s*\[([^\]]*)\]/);
    expect(formats).not.toBeNull();
    const list = formats![1];
    expect(list).toContain("'es'");
    expect(list).toContain("'cjs'");
    expect(list).toContain("'umd'");
  });

  it('names the umd output index.umd.js', () => {
    expect(cfg).toContain("return 'index.umd.js'");
  });

  it('keeps the MDHTMLEditor global name (required for UMD)', () => {
    expect(cfg).toMatch(/name:\s*'MDHTMLEditor'/);
  });
});
