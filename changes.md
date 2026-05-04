# MDHTMLEditor Changelog

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
