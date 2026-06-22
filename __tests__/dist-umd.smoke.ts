/**
 * Post-build smoke test for the UMD bundle.
 *
 * This requires `dist/` to exist, so it is NOT part of the default `npm test`
 * run (its `.smoke.ts` suffix is excluded from the default testMatch). Run it via
 * `npm run test:dist`, which builds first.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const UMD_PATH = resolve(ROOT, 'dist/index.umd.js');

describe('dist/index.umd.js (built output)', () => {
  it('exists after a build', () => {
    expect(existsSync(UMD_PATH)).toBe(true);
  });

  it('is a UMD bundle exposing the MDHTMLEditor global', () => {
    const head = readFileSync(UMD_PATH, 'utf8').slice(0, 600);
    // UMD wrapper: CJS (exports/module), AMD (define.amd), and a browser global.
    expect(head).toMatch(/exports/);
    expect(head).toMatch(/define\.amd/);
    expect(head).toMatch(/MDHTMLEditor/);
  });

  it('is self-contained (no unbundled @tiptap/lowlight imports)', () => {
    const src = readFileSync(UMD_PATH, 'utf8');
    expect(src).not.toMatch(/require\(["']@tiptap/);
    expect(src).not.toMatch(/from\s*["']@tiptap/);
    expect(src).not.toMatch(/require\(["']lowlight["']\)/);
  });

  it('loads in a sandbox and registers window.MDHTMLEditor.HTMLEditor', () => {
    const src = readFileSync(UMD_PATH, 'utf8');
    // Execute the UMD factory against a minimal browser-like global. jsdom provides
    // window/document; the bundle attaches itself to the global object.
    const globalObj = globalThis as unknown as { MDHTMLEditor?: { HTMLEditor?: unknown } };
    delete globalObj.MDHTMLEditor;
    // eslint-disable-next-line no-new-func
    new Function(src).call(globalObj);
    expect(globalObj.MDHTMLEditor).toBeDefined();
    expect(typeof globalObj.MDHTMLEditor!.HTMLEditor).toBe('function');
  });
});
