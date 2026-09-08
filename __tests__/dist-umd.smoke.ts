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

  /**
   * The companion to __tests__/core/TemplateWhitespace.test.ts. Importing HTML
   * collapses insignificant whitespace document-wide (IMPORT_PARSE_OPTIONS), and
   * the guarantee that this does not reach into a code block rests on
   * CodeBlock's own parse rule declaring `preserveWhitespace: 'full'` — a
   * per-node setting that outranks the document-level one.
   *
   * That guarantee can only be checked here: the default Jest run maps
   * `@tiptap/extension-code-block-lowlight` to a stub with no node in it, so a
   * <pre> there never reaches a code block at all. The built bundle contains the
   * real extension.
   */
  it('keeps whitespace inside a code block when importing content', () => {
    const src = readFileSync(UMD_PATH, 'utf8');
    const globalObj = globalThis as unknown as {
      MDHTMLEditor?: { HTMLEditor?: new (el: HTMLElement, cfg?: unknown) => {
        setContent(html: string): void;
        insertContent(html: string): void;
        getContent(): string;
        destroy(): void;
      } };
    };
    delete globalObj.MDHTMLEditor;
    // eslint-disable-next-line no-new-func
    new Function(src).call(globalObj);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new globalObj.MDHTMLEditor!.HTMLEditor!(container, {
      forced_root_block: 'div',
      toolbar: 'bold',
    });

    try {
      const code = 'function f() {\n\treturn 1;\n}';
      editor.setContent(`<pre><code>${code}</code></pre>`);
      expect(editor.getContent()).toContain(code);

      // Same guarantee on the insertContent path, which is the one that changed.
      editor.setContent('<div>before</div>');
      editor.insertContent(`<pre><code>${code}</code></pre>`);
      expect(editor.getContent()).toContain(code);

      // And the collapse itself still happens outside the code block.
      editor.setContent('<div>a</div>\n\n<ul>\n\t<li>one</li>\n\t<li>two</li>\n</ul>\n');
      const html = editor.getContent();
      expect((html.match(/<li/g) ?? []).length).toBe(2);
      expect(html).not.toMatch(/[\t\n]/);
    } finally {
      editor.destroy();
      container.remove();
    }
  });
});
