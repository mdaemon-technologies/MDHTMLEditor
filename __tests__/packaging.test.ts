/**
 * Packaging / build-config drift guards.
 *
 * These do NOT build anything — they assert that the package metadata and Vite
 * config stay consistent with the documented UMD output. If someone renames the
 * UMD file or drops the format, these fail fast (see dist-umd.smoke.ts for the
 * post-build check that the file actually exists and works).
 */

import { existsSync, readFileSync } from 'fs';
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

  it('points the demo script at the root Vite config, which turns on HTTPS', () => {
    // `vite test` serves test/ and looks for a config there, so without --config
    // the dev server would skip the basic-ssl plugin and serve plain HTTP.
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
    expect(scripts.demo).toMatch(/--config\s+vite\.config\.mts/);
  });
});

describe('Lint', () => {
  it('lints src, and CI and publishing run it', () => {
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
    expect(scripts.lint).toBe('eslint src');
    expect(existsSync(resolve(ROOT, 'eslint.config.mjs'))).toBe(true);
    expect(read('.github/workflows/ci.yml')).toContain('npm run lint');
    expect(read('.github/workflows/publish.yml')).toContain('npm run lint');
  });
});

describe('Build config (vite.config.mts)', () => {
  const cfg = read('vite.config.mts');

  it('is an ES module file, so Vite loads it as ESM rather than CommonJS', () => {
    // package.json has no "type": "module", so a .ts config would be loaded as
    // CommonJS and Vite warns that its native config loader can't handle it.
    expect(existsSync(resolve(ROOT, 'vite.config.ts'))).toBe(false);
    expect(cfg).not.toMatch(/__dirname/);
  });

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
