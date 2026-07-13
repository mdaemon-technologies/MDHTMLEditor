# MDHTMLEditor Changelog

## 1.9.0 (July 13, 2026)

### New Features
- **The font dropdowns now show the font and size at the cursor.** The `fontfamily` and `fontsize` toolbar buttons displayed the static words "Font" and "Font size", which told the user nothing about the text they were editing. They now read the value in effect at the cursor — "Times New Roman", "12pt" — and track it as the caret moves, the way TinyMCE and word processors do. The family is displayed by its configured name (the label from `font_family_formats`), not its raw CSS stack; a font that is not in the configured list (pasted from another editor, say) is shown by its first family name. When there is no single value to show, the button falls back to the generic word, so no new translatable strings were added.

### Changed
- **`getFontFamily()` / `getFontSize()` now return `''` for a selection that spans more than one value.** They previously read the attributes at the selection *head*, so a selection covering both 12pt and 18pt text confidently reported "12pt". With the value now displayed on the toolbar face, that head-biased answer would actively mislead, so a mixed selection reports no value instead — matching TinyMCE, which blanks the control in the same situation. Collapsed cursors and single-value selections are unaffected. This also fixes the dropdown menu check-marking a font that only applies to part of the selection.

### Styles
- New `.md-toolbar-dropdown-label` rules give the two font dropdowns a fixed label width with ellipsis truncation (the full text is on the button's `title`). The width is pinned deliberately: the toolbar measures button widths to decide the `||` primary/overflow row split, so a label that resized with the caret would make buttons hop between rows while typing.

## 1.8.0 (July 13, 2026)

### Bug Fixes
- **A font picked before typing is no longer silently discarded.** Choosing a font or size from the `fontfamily`/`fontsize` toolbar dropdowns (or via `execCommand('fontname'|'fontsize', …)`) while the cursor sat in an empty block applied it as an inline mark. With nothing to mark, that only parked a ProseMirror *stored mark* on the selection — and stored marks are discarded by the next transaction that moves the selection or changes the document. Clicking into the body, or a host app calling `setTextSelection`, dropped the font before the user typed a character. Font changes made in an empty block are now written to the block's own `font-family`/`font-size`, so they persist and land in the exported HTML. Changes made with text selected still produce an inline `<span>` override, and changes made mid-text still use a stored mark, as before.
- **The configured `fontName`/`fontSize` are no longer re-applied as inline marks on `init`.** The editor used to run `setFontFamily`/`setFontSize` in TipTap's `onCreate`, which had the same stored-mark problem (the marks never survived to the first keystroke) and additionally **stole focus** — `chain().focus()` pulled focus into the editor body on every init, overriding `auto_focus`/`setFocus` and any focus the host app had placed elsewhere. The defaults are carried by the `BlockFontStyle` extension (added in 1.6.0), which already renders them on every block, so the `onCreate` calls were dead weight; they have been removed. Text typed immediately after init also no longer gets wrapped in a redundant `<span>` repeating the block's own font.

### New Features
- **`getFontFamily()` / `getFontSize()`** on `HTMLEditor` — report the font in effect at the cursor, resolving inline `<span>` override → block font → configured default. The toolbar font dropdowns now use these to highlight the current font when opened; previously they read only the inline mark and so showed nothing selected whenever the font came from the block default (i.e. almost always).
- **`setBlockFontFamily` / `setBlockFontSize` commands** on the `BlockFontStyle` extension — set the font on every block the selection touches. Available on the TipTap instance via `getTipTap()`.

## 1.7.0 (June 19, 2026)

### New Features
- **UMD bundle for browser / CDN usage** — the build now emits a third output, `dist/index.umd.js`, alongside the existing ES (`dist/index.mjs`) and CJS (`dist/index.js`) bundles. The UMD file is fully self-contained (all TipTap dependencies inlined) and exposes the entire public API under the `MDHTMLEditor` browser global, so the editor can be dropped into a static HTML page with a plain `<script>` tag — no bundler required.
- The package now advertises the UMD file to CDNs via the `unpkg` and `jsdelivr` fields, and exposes it through the `@mdaemon/html-editor/umd` export subpath. CDN usage (`<script src="https://unpkg.com/@mdaemon/html-editor">`) is documented in the README. Note that styles (`dist/styles.css`) must be loaded separately, as the UMD bundle contains JS only.

### Build / Tooling
- **Production builds are now minified.** Removed `minify: false` from `vite.config.ts` so the production build uses the default Rolldown/Oxc minifier. The published bundles shrank substantially (e.g. `dist/index.umd.js` ~1.59 MB → ~856 KB). The development build (`npm run build:dev`) remains unminified with sourcemaps.
- **New `npm run demo:umd` script** — builds the package and serves a standalone UMD demo (`test/umd.html`) as raw static files via a tiny dependency-free Node server (`test/serve-umd.mjs`). Unlike `npm run demo` (which runs the source through Vite's dev pipeline), this loads the built `dist/index.umd.js` and `dist/styles.css` exactly as a CDN/`<script>` consumer would.
- **UMD packaging tests.** `__tests__/packaging.test.ts` guards against config drift (asserts `package.json` `unpkg`/`jsdelivr`/`exports["./umd"]` and the `vite.config.ts` `formats`/filename stay consistent) and runs as part of `npm test`. A new `npm run test:dist` script builds the package and runs a post-build smoke test (`__tests__/dist-umd.smoke.ts`) that loads the built UMD bundle in a sandbox and verifies it registers `window.MDHTMLEditor.HTMLEditor`.

## 1.6.1 (June 12, 2026)

### Build / Tooling
- Upgraded the build toolchain from **Vite 7 to Vite 8** (`vite@^8.0.0`), which replaces Rollup + esbuild with the Rust-based **Rolldown** bundler and **Oxc** transformer. No public API, runtime, or config changes — the existing `rollupOptions` in `vite.config.ts` is accepted via Vite 8's compatibility layer. Node.js requirement is unchanged (`^20.19.0 || >=22.12.0`).
- The published bundle is ~70 KB smaller thanks to Rolldown tree-shaking (`dist/index.mjs` 1,611 KB → 1,539 KB; `dist/index.js` likewise). The exported API surface is byte-identical — all 34 public exports unchanged. Full test suite (605 tests) and `typecheck` pass.

## 1.6.0 (June 9, 2026)

### New Features
- **Block-level default font styling** — the default font family and font size are now inlined directly on every block element in the exported HTML (`font-family` on `<p>`/`<div>`/`<hN>`, `font-size` on `<p>`/`<div>`), instead of relying on the editor's container CSS being present on the receiving end. This fixes sent messages losing their font when rendered elsewhere (e.g. an email body opened in another client). The defaults come from the `fontName` / `fontSize` config options and fall back to `arial, helvetica, sans-serif` / `12pt`.
- New `BlockFontStyle` extension (and `BlockFontStyleOptions` type) exported from the package entry point.

### Notes
- Per-selection font changes are unchanged: selecting text and choosing a font or size from the toolbar still produces an inline `<span>` that overrides the block default, so a single paragraph can mix fonts and sizes (e.g. "this is **A BIG font**, and this is a small font").
- Font-size defaults are applied to paragraphs only — headings keep their level-based sizing (`h1` = 2em, etc.). Font-family defaults apply to paragraphs and headings.

## 1.4.2 (June 9, 2026)

### New Features
- **`trailingNode` option** — new boolean config (default `false`) that appends an empty trailing paragraph when the document ends in a block node (table, image, code block, etc.), so the cursor can be placed after it. Enabling it maps to TipTap StarterKit's built-in trailing-node behavior.

### Bug Fixes
- **Insert/Edit Link** — URLs typed without a scheme (e.g. `www.example.com`, `example.com/path`) now have `http://` prepended automatically instead of being saved as relative links that resolve against the current page and break. Existing schemes (`https:`, `mailto:`, `tel:`, `ftp:`, …), anchors (`#…`), absolute/relative paths (`/`, `./`, `../`), and protocol-relative URLs (`//host`) are left untouched.
- **Paste toolbar button** — replaced the deprecated, browser-blocked `document.execCommand('paste')` with the async Clipboard API. The button now reads the clipboard (prompting for permission on first use), prefers `text/html` to preserve formatting, falls back to plain text, and strips the browser's clipboard scaffolding (`<meta>`, `StartFragment`/`EndFragment` markers) before inserting. Browsers that block programmatic clipboard reads (e.g. Firefox) fall back to Ctrl/Cmd+V, which the engine handles directly.
- **confab skin** — replaced the `removeformat` toolbar icon with a clearer eraser glyph.

### Internal
- Added a `document.elementFromPoint` polyfill to the Jest setup so the suite runs under jsdom (newer TipTap placeholder viewport tracking calls it during editor construction).

## 1.4.1 (June 5, 2026)

### Improvements
- Dependency and lockfile maintenance — bumped `@babel/*` to 7.29.7, `esbuild` platform binaries to 0.27.7, `@emnapi` core/runtime to 1.10.0 (and `wasi-threads` to 1.2.1), and `@adobe/css-tools` to 4.5.0; refreshed `package-lock.json`. No functional or API changes.

## 1.4.0 (June 5, 2026)

### New Features
- Added CKEditor feature parity for sites migrating off CKEditor 4:
  - **Read-only mode** — new `readonly` config option plus `setReadOnly(state)` / `isReadOnly()` methods; disables editing and dims/blocks the toolbar
  - **`forced_root_block` option** — set to `'div'` so Enter produces `<div>` blocks (CKEditor `ENTER_DIV` parity); defaults to `'p'`. The `<div id="signature">` signature block is preserved in either mode
  - **Subscript / Superscript** — new `subscript` and `superscript` toolbar buttons, `execCommand` support, and TipTap extensions
  - **Horizontal rule** — new `hr` toolbar button and `inserthorizontalrule` command
  - **Tables** — new `table` toolbar dropdown to insert tables and run row/column/cell operations (insert/delete row & column, merge/split cells, toggle header row, delete table)
  - **Block format dropdown** — new `blocks` button (alias `formatselect`) for Paragraph / Heading 1–6, customizable via `block_formats`
  - **Styles dropdown** — new `styles` button driven by a configurable, CKEditor `stylesSet`-compatible `style_formats` option (block elements, inline color/background, and CSS classes)
  - **Named anchors** — new `anchor` toolbar button and dialog inserting `<a id="name">` targets; preserves existing anchors through the parse/serialize cycle
  - **Unlink** — new `unlink` toolbar button and command to remove the link at the cursor
- Image upload improvements (CKEditor `simpleuploads` parity):
  - New `images_file_types` option to restrict accepted extensions (e.g. `'jpg,jpeg,png,gif,bmp'`); added BMP support
  - New `images_upload_validate` cancelable pre-upload hook (return a message to reject a file)
  - New `images_upload_error` callback so drag-drop and clipboard-paste rejections/failures route to a caller-supplied alert
- Added CKEditor config aliases `font_names` (→ `font_family_formats`) and `fontSize_sizes` (→ `font_size_formats`) for drop-in compatibility
- New default toolbars surface the new buttons; existing custom `toolbar` strings are unaffected
- Translated the new UI strings into all 31 supported locales

### Improvements
- Added `@tiptap/extension-subscript`, `@tiptap/extension-superscript`, and a direct `@tiptap/extension-paragraph` dependency

## 1.3.0 (May 21, 2026)

### New Features
- Added Speech to Text plugin — browser-native voice recognition using the Web Speech API
  - Full dialog with live transcript display (final + interim results), language selector, confidence indicator
  - Continuous recognition mode with auto-restart on browser timeout
  - Supports 31 languages matching the editor's locale system
  - Start/Stop toggle, Insert (at cursor position), and Clear controls
  - New `speech_to_text` config option (default: `true`) to enable/disable the feature
  - Graceful degradation: button shown disabled with tooltip in unsupported browsers (Firefox)
  - Dark mode support for oxide-dark and confab-dark skins
  - No external dependencies — uses built-in Web Speech API (Chrome, Edge, Safari)
- Added Dictate button — inline speech-to-text that inserts directly at the cursor without a dialog
  - Single-click toggle: click to start dictating, click again to stop
  - Text is inserted at the cursor in real-time as speech is recognized
  - Visual feedback: button turns red with pulsing indicator while active
  - Uses the same `speech_to_text` config option and language detection as the dialog version
  - Toolbar button name: `dictate` (place alongside or instead of `speechtotext`)

## 1.2.0 (May 14, 2026)

### New Features
- Added paste-from-Office support — detects and cleans HTML pasted from Microsoft Word and Excel while preserving formatting (bold, italic, underline, font family/size, colors, highlights, lists, tables, text alignment, line height, indentation)
  - Word list conversion: transforms Word's fake list paragraphs (`MsoListParagraph`) into proper `<ul>`/`<ol>` with correct nesting
  - Excel table normalization: preserves table structure, colspan/rowspan, and cell formatting while stripping Excel-specific attributes
  - Security hardening: strips `<script>`, `<iframe>`, event handlers, `javascript:` URLs, and `file://` references (defense-in-depth alongside TipTap's schema enforcement)
  - New `paste_from_office` config option (default: `true`) to enable/disable the feature
  - No new dependencies — zero bundle size impact

### Improvements
- Updated all TipTap packages from 3.23.1 to 3.23.4

## 1.0.14 (May 11, 2026)

### New Features
- Added responsive toolbar with priority-based button visibility for narrow containers (≤768px)
  - Tier 1 buttons (bold, italic, underline, undo, redo, link, forecolor) remain visible; all others collapse behind the existing toggle button
  - Container-width detection via ResizeObserver — works in sidebars, modals, and narrow panels regardless of viewport size
  - New `toolbar_narrow_breakpoint` config option to customize the width threshold (default: 768)
  - New `toolbar_priority` config option to override default button tier assignments
- Added touch device support via `@media (pointer: coarse)` — enlarges toolbar buttons to 44×44px on touch devices to meet WCAG 2.5.5 target size recommendations

## 1.0.13 (May 4, 2026)

### New Features
- Added Mention extension for inline @mention support (`span.composer-mention` atom nodes)
  - Enables `insertContent()` to correctly handle mention spans instead of escaping them as text
  - Parses and renders `<span class="composer-mention" contenteditable="false" data-jid="..." data-display="...">@Name</span>`
  - Inline, atomic, non-editable node that round-trips through the editor without data loss

### Bug Fixes
- Fixed clicking empty space in `.md-editor-content` not focusing the editor when content doesn't fill the container

## 1.0.12 (April 27, 2026)

### New Features
- Added confab skin (light and dark) with CSS custom property theming
- Added custom icon set support
- Added SignatureBlock extension
- Added SourceEditor dialog for raw HTML editing
- Added LinkEditor dialog for link creation and editing
- Added scoped CSS reset to protect editor internals from host-app CSS resets (e.g. Tailwind preflight)

### Improvements
- Upgraded to TypeScript 6
- Unified toolbar overflow into a single container for consistent button wrapping
- Positioned toolbar dropdown and color picker menus as fixed, appended to document.body, to prevent misalignment caused by parent CSS transforms
- Replaced text-based dropdown arrows with inline SVGs to prevent host-app font-size overrides from inflating arrow size
- Many feature updates and refinements

### Bug Fixes
- Fixed TSC compilation error
- Fixed Markdown table formatting in README
- Fixed dropdown menus appearing offset when host app uses CSS transforms on ancestor elements
- Fixed color picker not closing other open menus when opened
- Fixed dropdown item styles being overridden by scoped button reset (CSS specificity)

## 1.0.0 (February 13, 2026)

### Initial Public Release
- Created TipTap-based HTML editor as a TinyMCE-compatible replacement
- Added comprehensive test suite
- Upgraded to TipTap v3
- Updated all dependencies to latest versions
- Updated license
