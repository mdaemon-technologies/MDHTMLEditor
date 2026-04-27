/**
 * CSS Reset Protection Tests
 *
 * Compiles editor.scss and asserts that defensive CSS rules are present
 * in the output. This guards against accidental removal of rules that
 * protect the editor from host-app CSS resets (Tailwind preflight, etc.).
 */

import { compileString } from 'sass';
import * as fs from 'fs';
import * as path from 'path';

const scssPath = path.resolve(__dirname, '../../src/styles/editor.scss');
const scss = fs.readFileSync(scssPath, 'utf-8');
const result = compileString(scss, {
  loadPaths: [path.dirname(scssPath)],
});
const css = result.css;

describe('CSS Reset Protection', () => {
  describe('Layer 2 — Content area defensive defaults', () => {
    describe('list styles', () => {
      it('should set list-style-type: disc on ul', () => {
        expect(css).toMatch(/\.md-editor-body\s+ul\s*\{[^}]*list-style-type:\s*disc/);
      });

      it('should set list-style-type: decimal on ol', () => {
        expect(css).toMatch(/\.md-editor-body\s+ol\s*\{[^}]*list-style-type:\s*decimal/);
      });

      it('should set list-style-type: circle on nested ul ul', () => {
        expect(css).toMatch(/\.md-editor-body\s+ul\s+ul\s*\{[^}]*list-style-type:\s*circle/);
      });

      it('should set list-style-type: square on deeply nested ul ul ul', () => {
        expect(css).toMatch(/\.md-editor-body\s+ul\s+ul\s+ul\s*\{[^}]*list-style-type:\s*square/);
      });

      it('should set list-style-type: lower-alpha on nested ol ol', () => {
        expect(css).toMatch(/\.md-editor-body\s+ol\s+ol\s*\{[^}]*list-style-type:\s*lower-alpha/);
      });

      it('should set list-style-type: lower-roman on deeply nested ol ol ol', () => {
        expect(css).toMatch(/\.md-editor-body\s+ol\s+ol\s+ol\s*\{[^}]*list-style-type:\s*lower-roman/);
      });

      it('should set margin and padding-left on ul and ol', () => {
        expect(css).toMatch(/\.md-editor-body\s+ul,\s*\.md-editor-body\s+ol\s*\{[^}]*margin:/);
        expect(css).toMatch(/\.md-editor-body\s+ul,\s*\.md-editor-body\s+ol\s*\{[^}]*padding-left:/);
      });
    });

    describe('heading font sizes', () => {
      it('should set font-size: 2em on h1', () => {
        expect(css).toMatch(/\.md-editor-body\s+h1\s*\{[^}]*font-size:\s*2em/);
      });

      it('should set font-size: 1.5em on h2', () => {
        expect(css).toMatch(/\.md-editor-body\s+h2\s*\{[^}]*font-size:\s*1\.5em/);
      });

      it('should set font-size: 1.17em on h3', () => {
        expect(css).toMatch(/\.md-editor-body\s+h3\s*\{[^}]*font-size:\s*1\.17em/);
      });

      it('should set font-size: 1em on h4', () => {
        expect(css).toMatch(/\.md-editor-body\s+h4\s*\{[^}]*font-size:\s*1em/);
      });

      it('should set font-size: 0.83em on h5', () => {
        expect(css).toMatch(/\.md-editor-body\s+h5\s*\{[^}]*font-size:\s*0\.83em/);
      });

      it('should set font-size: 0.67em on h6', () => {
        expect(css).toMatch(/\.md-editor-body\s+h6\s*\{[^}]*font-size:\s*0\.67em/);
      });

      it('should set font-weight: bold on all headings', () => {
        expect(css).toMatch(
          /\.md-editor-body\s+h1,\s*\.md-editor-body\s+h2,\s*\.md-editor-body\s+h3,\s*\.md-editor-body\s+h4,\s*\.md-editor-body\s+h5,\s*\.md-editor-body\s+h6\s*\{[^}]*font-weight:\s*bold/
        );
      });
    });

    describe('inline text elements', () => {
      it('should set font-weight: bold on b and strong', () => {
        expect(css).toMatch(/\.md-editor-body\s+b,\s*\.md-editor-body\s+strong\s*\{[^}]*font-weight:\s*bold/);
      });

      it('should set font-style: italic on i and em', () => {
        expect(css).toMatch(/\.md-editor-body\s+i,\s*\.md-editor-body\s+em\s*\{[^}]*font-style:\s*italic/);
      });

      it('should set font-size: 80% on small', () => {
        expect(css).toMatch(/\.md-editor-body\s+small\s*\{[^}]*font-size:\s*80%/);
      });

      it('should set vertical-align: sub on sub', () => {
        expect(css).toMatch(/\.md-editor-body\s+sub\s*\{[^}]*vertical-align:\s*sub/);
      });

      it('should set vertical-align: super on sup', () => {
        expect(css).toMatch(/\.md-editor-body\s+sup\s*\{[^}]*vertical-align:\s*super/);
      });
    });

    describe('block elements', () => {
      it('should set visible hr styling with border-top', () => {
        expect(css).toMatch(/\.md-editor-body\s+hr\s*\{[^}]*border-top:/);
      });

      it('should set border: none on hr to remove default borders', () => {
        expect(css).toMatch(/\.md-editor-body\s+hr\s*\{[^}]*border:\s*none/);
      });

      it('should set display: inline-block on img', () => {
        expect(css).toMatch(/\.md-editor-body\s+img\s*\{[^}]*display:\s*inline-block/);
      });

      it('should set margin on p', () => {
        expect(css).toMatch(/\.md-editor-body\s+p\s*\{[^}]*margin:/);
      });

      it('should set blockquote border-left', () => {
        expect(css).toMatch(/\.md-editor-body\s+blockquote\s*\{[^}]*border-left:/);
      });
    });
  });

  describe('Layer 3 — Scoped UI baseline', () => {
    it('should scope box-sizing: border-box to all elements inside .md-editor', () => {
      expect(css).toMatch(/\.md-editor\s+\*/);
      expect(css).toMatch(/\.md-editor\s+\*::before/);
      expect(css).toMatch(/\.md-editor\s+\*::after/);
      expect(css).toContain('box-sizing: border-box');
    });

    it('should reset button styles inside .md-editor', () => {
      expect(css).toMatch(/\.md-editor\s+button\s*\{/);
      // Check key reset properties are present in the button block
      const buttonMatch = css.match(/\.md-editor\s+button\s*\{([^}]*)\}/);
      expect(buttonMatch).not.toBeNull();
      const buttonBlock = buttonMatch![1];
      expect(buttonBlock).toContain('appearance: none');
      expect(buttonBlock).toContain('border: none');
      expect(buttonBlock).toContain('padding: 0');
      expect(buttonBlock).toContain('margin: 0');
      expect(buttonBlock).toContain('cursor: pointer');
    });

    it('should reset input, select, textarea styles inside .md-editor', () => {
      expect(css).toMatch(/\.md-editor\s+input,\s*\.md-editor\s+select,\s*\.md-editor\s+textarea\s*\{/);
    });
  });
});
