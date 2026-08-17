# MDHTMLEditor Changelog

## 1.11.1 (August 13, 2026)

### Bug Fixes
- Replaced the confab skin's `blockquote` toolbar icon. The old icon drew two closing curly quotation marks whose tails made it read as "99"; it is now a quote bar beside indented text lines, matching the other line-based icons in the set.

## 1.11.0 (August 12, 2026)

### New Features
- **The text color and highlight color pickers now have separate palettes, and the text palette is built for readable text.** Both pickers previously shared one 26-swatch list chosen for highlighting: a grayscale ramp, the fully-saturated hues, and eight pale tints. Roughly half of it was unusable as a font color — `#FFFF00`, `#00FF00`, `#00FFFF`, `#FF00FF` and every pastel are illegible as text on a white background, and there were no dark shades at all.
  - **`forecolor` (text)** now offers 40 colors in four rows of ten, aligned by hue column: the grayscale ramp, the saturated hues, and two rows of progressively darker shades (`#CC0000`, `#38761D`, `#1155CC`, `#351C75`, `#741B47`, …). The hue columns are red berry, red, orange, yellow, green, cyan, cornflower blue, blue, purple, magenta.
  - **`backcolor` (highlight)** keeps the original 26 colors unchanged — the pale tints are exactly what makes a good marker.
- **Both palettes are now configurable, with TinyMCE-compatible keys.** `color_map_foreground` and `color_map_background` set one picker each; `color_map` sets both and is overridden by either specific key. All three accept TinyMCE's flat form (`['#FF0000', 'Red', ...]`) or an array of `ColorOption` objects. Omitting them keeps the per-picker built-in defaults.
- **Added a `Remove color` entry to both pickers.** Color could previously only be cleared with `removeformat`, which strips *every* mark on the selection — clearing a font color also lost its bold, italic, and font size. The new entry calls `unsetColor` / `unsetHighlight`, so only the color goes. `execCommand` gained the matching behavior: passing `''` or `'none'` as the value to `forecolor`, `backcolor`, or `hilitecolor` clears instead of setting.

### Bug Fixes
- The `forecolor`/`backcolor` menus are portaled to `document.body` and carried nothing to identify which picker they belonged to; they now carry a `data-colorpicker-menu` attribute.
- Removed a duplicated `padding` declaration on `.md-toolbar-colorpicker-menu`.
- `README.md` claimed both pickers offered 28 preset colors; the actual count was 26 for both.

## 1.10.1 (July 24, 2026)

### Bug Fixes
- **The `change` event now emits exactly what `getContent()` returns, and every content path shares the same `format_empty_lines` pair.** The blank-line handling added in 1.9.1/1.9.3 lived only in `getContent()` (serialize: fill each empty block with a `<br>`) and `setContent()` (parse: strip it back out). Every other way HTML crossed the editor boundary went straight to the TipTap instance and skipped both halves, so the two directions disagreed depending on which door the content used:
  - **`change` payload** — the event fired the engine's raw `getHTML()`. A host that saved the payload (the common pattern for autosave/draft sync) stored content whose blank lines had *no* `<br>` and therefore collapsed to zero height in mail clients, while the same host calling `getContent()` got the corrected HTML. The payload is now the serialized output, so the two are byte-identical.
  - **`insertContent()`** — applied the `<\/` tag-slash repair but not the blank-line strip, so inserting a fragment previously produced by `getContent()` (a template, a saved snippet) handed the export-only `<br>` to TipTap as a `hardBreak` and grew each blank line into two.
  - **Templates dropdown** — inserted through the TipTap chain directly rather than `insertContent()`, so it inherited neither pass on its own.
  - **Source dialog** — showed raw `getHTML()` and saved through the raw TipTap `setContent`, so opening it and pressing Save without editing anything was not a no-op: the displayed HTML and the editor's real output differed, and the round-trip could double blank lines.
  - **Preview** — rendered raw `getHTML()` in the new window, which is precisely the out-of-editor rendering context `format_empty_lines` exists for, so previewed blank lines collapsed while the sent content kept them.

  The two passes are now a single pair of private helpers on `HTMLEditor` (`formatOutput` / `formatInput`) that all of these route through, so the directions cannot drift apart again. `format_empty_lines: false` still opts out of both halves on every path.

## 1.10.0 (July 20, 2026)

### New Features
- **`Tab` / `Shift+Tab` are now always handled, so the key never escapes the editor and moves focus to the next element on the page (CKEditor parity).** Previously, indentation only worked inside lists; anywhere else `Tab` jumped keyboard focus out of the editor. A new `BlockIndent` extension adds a left indent (inline `margin-left`, in 40px steps up to 400px) to the paragraph(s) or heading(s) in the selection, and binds `Tab` / `Shift+Tab` to it. The routing mirrors CKEditor and covers every context:
  - **In a table** — deferred to the Table extension, so `Tab` moves between cells.
  - **In a code block** — inserts a literal tab character.
  - **In a list item that can nest** (has a preceding sibling) — sinks the item; **Shift+Tab** lifts it.
  - **In a list item that cannot nest** (e.g. the first item at a level) — indents the item's own content instead of doing nothing, so `Tab` still adds a "tab inside the `<li>`".
  - **Everywhere else** (paragraphs, headings) — indents/outdents the block, and consumes the key even at the min/max indent so focus never leaves the editor.

  The `indent` / `outdent` toolbar buttons and `execCommand('indent'|'outdent')` follow the same rule (list → nest, otherwise → block margin). The indent is stored on the element as inline `margin-left`, so it survives in mail clients and other consumers that do not load the editor stylesheet, and an incoming `margin-left` is parsed back as the starting indent. `BlockIndent` (with an `indentBlock` / `outdentBlock` command pair and `BlockIndentOptions` for `types` / `step` / `max`) is exported.

  Because Tab is captured, a keyboard escape is provided so the editor is not a focus trap (WCAG 2.1.2 "No Keyboard Trap"): pressing **`Esc` then `Tab`** (CodeMirror's convention) moves focus to the next focusable element outside the editor instead of indenting, and **`Esc` then `Shift+Tab`** moves to the previous one. `Esc` arms this for a single key press only; any other key disarms it, so a stray `Esc` never makes a later Tab jump out of the editor.

### Bug Fixes
- **Content whose closing-tag slashes were backslash-escaped (`<\/p>`, `<\/li>`, `<\/ul>`) now imports as real tags instead of literal text.** Some hosts serialize the editor's HTML through encoders that escape `/` as `\/` — most notably PHP's `json_encode`, which does this by default unless `JSON_UNESCAPED_SLASHES` is set. The slash-free *opening* tags still built a real element tree, but the browser's HTML parser (the one TipTap uses in `setContent`/`insertContent`) does not treat `<\` as a tag opener, so the closing tags rendered as visible garbage text (`</p>`-looking characters) mid-content — a half-parsed list with broken markup. TinyMCE's hand-rolled parser silently tolerated the escaped slash, so restoring that leniency is part of preserving the facade: `setContent`, `insertContent`, and the Templates dropdown now normalize `<\/` back to `</` (a new `unescapeTagSlashes` utility) before parsing. The rewrite is limited to the `<\/` sequence — genuine text containing `<\/` would have arrived HTML-escaped as `&lt;\/`, so it can only ever repair a mangled closing tag — and is idempotent. This also restores `Tab` / `Shift+Tab` list indentation, which had only *appeared* broken because the mangled markup produced a malformed list with no real sibling items to nest; a well-formed list indents the second and later items as before (`Tab` on the first item at a level is a no-op, matching TipTap's `sinkListItem`).

## 1.9.3 (July 17, 2026)

### Bug Fixes
- **A blank line no longer doubles every time content is round-tripped through the editor.** `getContent()` fills each empty block with a `<br>` (the `format_empty_lines` fix from 1.9.1) so blank lines survive outside the editor. But `setContent()` had no inverse: re-importing that output — which every consumer does on skin/root-block change, and mail apps do when reloading a saved draft — handed the `<br>` to TipTap, which parsed it as a `hardBreak` node *inside* the block. On top of ProseMirror's own trailing-break decoration, that single blank line then rendered as **two**, growing by one line on every save/reload cycle. `setContent()` now runs the exact inverse of `fillEmptyBlocks` (a new `stripEmptyLineBreaks` utility, paired with it in the same module and gated on the same `format_empty_lines` flag): it removes the lone `<br>` from an otherwise-empty block before TipTap parses it, so the block is modeled as one genuinely empty line. `setContent(getContent(x))` now reproduces the original blank-line state and is stable across any number of round-trips. The strip is narrow and source-agnostic — `<div><br></div>` unambiguously means "one blank line" in HTML no matter who authored it, so it is collapsed for all inputs (this editor's output, a legacy theme, another client), while a genuine trailing hard break (`<div>hello<br></div>` from Shift+Enter) has text content and is left untouched. Opting out with `format_empty_lines: false` disables both halves.

## 1.9.2 (July 17, 2026)

### Bug Fixes
- **`Ctrl/Cmd+B`, `Ctrl+I`, `Ctrl+U`, and `Ctrl+Z` keyboard shortcuts work again.** The toolbar registered its own `document`-level `keydown` listener that re-ran `toggleBold`/`toggleItalic`/`toggleUnderline`/`undo` for these chords. But TipTap's Bold/Italic/Underline/History extensions already bind them natively on the editor DOM, and ProseMirror calls `preventDefault` without `stopPropagation` — so every one of those key presses was handled *twice*. The two toggles cancelled out (net no-op for `Ctrl+B/I/U`) and `Ctrl+Z` undid two steps at once. Worse, because the listener compared `event.key` case-sensitively, holding Shift slipped past it: `Ctrl+Shift+B` fell through to TipTap's blockquote binding, and `Ctrl+Shift+I`/`Ctrl+Shift+U` reached TipTap's uppercase italic/underline bindings — so the marks only appeared to work with Shift held. The redundant bold/italic/underline/undo/redo bindings have been removed; these shortcuts are now owned solely by TipTap (matching the documented behavior). `Ctrl/Cmd+F` (Find & Replace) has no native TipTap binding and is still handled by the toolbar.

## 1.9.1 (July 17, 2026)

### Bug Fixes
- **Blank lines no longer vanish when the content is rendered outside the editor.** TipTap/ProseMirror serializes an empty line as a bare `<div></div>` (or `<p></p>`) — the live-editing trailing break is a view decoration, not part of the document, so it is absent from `getHTML()`. Bare empty blocks collapse to zero height in mail clients and other consumers, so the blank lines a user typed appeared to disappear on send. `getContent()` now injects a `<br>` into each empty block at serialization time (a new `fillEmptyBlocks` utility), mirroring TinyMCE's `format_empty_lines` and CKEditor's `fillEmptyBlocks`. This is gated on the existing `format_empty_lines` option, which already defaults to `true`; setting `format_empty_lines: false` opts out and restores the old pass-through. The transform runs only on serialized output — it never touches the live editor DOM, so it does not collide with ProseMirror's own trailing break. It is idempotent (a block already holding a `<br>` is left alone, so round-tripping content never accumulates `<br><br>`), attribute-agnostic (empty blocks carrying an inlined default font from `BlockFontStyle` are still filled), and leaves table cells, list items, and blocks containing void/embedded elements untouched.

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
