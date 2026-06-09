# MDHTMLEditor

A TinyMCE-compatible HTML editor built on TipTap. This is the core vanilla TypeScript package - for React usage, see `@mdaemon/html-editor-react`.

## Installation

```bash
npm install @mdaemon/html-editor
```

## Usage

### Vanilla JavaScript/TypeScript

```typescript
import { HTMLEditor } from '@mdaemon/html-editor';
import '@mdaemon/html-editor/styles';

// Create editor with built-in language support
const container = document.getElementById('editor');
const editor = new HTMLEditor(container, {
  height: 400,
  language: 'de', // German UI — see Localization section for supported codes
  basicEditor: false, // Full toolbar
  includeTemplates: true,
  templates: [
    { title: 'Greeting', content: '<p>Hello!</p>' }
  ],
  fontName: 'Arial',
  fontSize: '12pt',
});

// Get/set content
const html = editor.getContent();
editor.setContent('<p>New content</p>');

// Insert content at cursor
editor.insertContent('<b>Bold text</b>');

// Execute commands (TinyMCE compatible)
editor.execCommand('bold');
editor.execCommand('fontsize', false, '14pt');

// Listen to events
editor.on('change', (content) => {
  console.log('Content changed:', content);
});

editor.on('dirty', (isDirty) => {
  console.log('Editor dirty state:', isDirty);
});

// Clean up
editor.destroy();
```

### Custom Toolbar Buttons

```typescript
const editor = new HTMLEditor(container, {
  setup: (ed) => {
    ed.ui.registry.addButton('myButton', {
      tooltip: 'My Custom Button',
      text: 'Click Me',
      onAction: () => {
        ed.insertContent('<p>Custom content!</p>');
      },
    });
  },
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basicEditor` | boolean | false | Use simplified toolbar for notes/tasks |
| `readonly` | boolean | false | Start the editor in read-only mode (see `setReadOnly`) |
| `forced_root_block` | 'p' \| 'div' | 'p' | Block element produced on Enter. `'div'` gives CKEditor `ENTER_DIV` parity |
| `trailingNode` | boolean | false | Append an empty trailing paragraph when the document ends in a block node (table, image, code block) so the cursor can be placed after it |
| `includeTemplates` | boolean | false | Show template dropdown |
| `templates` | Template[] | [] | Array of templates |
| `dropbox` | boolean | false | Enable Dropbox integration |
| `images_upload_url` | string | - | URL for image uploads |
| `images_upload_credentials` | boolean | true | Include credentials in CORS upload requests |
| `images_upload_base_path` | string | '/' | Base path prefix for uploaded image URLs |
| `images_upload_max_size` | number | 10485760 | Maximum upload file size in bytes (default 10 MB) |
| `images_upload_headers` | Record\<string, string\> | - | Custom HTTP headers for upload requests |
| `images_file_types` | string | *(permissive)* | Comma/space-separated accepted extensions (e.g. `'jpg,jpeg,png,gif,bmp'`). Restricts uploads when set |
| `images_upload_validate` | (file: File) => string \| null | - | Pre-upload hook; return a message to reject the file, or null to allow |
| `images_upload_error` | (message: string) => void | - | Caller-supplied alert for drag-drop/paste upload rejections & failures (no dialog to show errors in) |
| `font_family_formats` | string | *(TinyMCE defaults)* | Semicolon-separated font list (`Name=family,...`) |
| `font_size_formats` | string | '8pt 9pt 10pt 12pt 14pt 18pt 24pt 36pt' | Space-separated font sizes |
| `font_names` | string | - | CKEditor alias for `font_family_formats` |
| `fontSize_sizes` | string | - | CKEditor alias for `font_size_formats` |
| `block_formats` | string | 'Paragraph=p;Heading 1=h1;…' | Block-format dropdown definitions (`blocks` button) |
| `style_formats` | StyleFormat[] | *(subset)* | Named styles for the Styles dropdown (`styles` button) |
| `fontName` | string | - | Default font family |
| `fontSize` | string | - | Default font size |
| `directionality` | 'ltr' \| 'rtl' | 'ltr' | Text direction |
| `language` | string | 'en' | UI language code (built-in translations for 31 languages) |
| `height` | string \| number | 300 | Editor height (fixed) |
| `min_height` | string \| number | - | Minimum editor height |
| `max_height` | string \| number | - | Maximum editor height |
| `auto_focus` | string | - | Auto-focus the editor on init |
| `skin` | 'oxide' \| 'oxide-dark' \| 'confab' \| 'confab-dark' | 'oxide' | Theme (see Theming section) |
| `content_css` | 'default' \| 'dark' \| 'confab' \| 'confab-dark' | 'default' | Content area styling |
| `content_style` | string | - | Custom CSS injected into the content area |
| `toolbar` | string | *(see Toolbar section)* | Custom toolbar button layout |
| `toolbar_mode` | 'sliding' \| 'floating' \| 'wrap' | 'wrap' | Toolbar overflow behavior |
| `toolbar_sticky` | boolean | true | Keep toolbar pinned at the top while scrolling |
| `browser_spellcheck` | boolean | true | Enable browser spell-check |
| `entity_encoding` | 'raw' \| 'named' \| 'numeric' | 'raw' | HTML entity encoding mode |
| `convert_unsafe_embeds` | boolean | true | Sanitize embedded content |
| `format_empty_lines` | boolean | true | Format empty lines |
| `paste_from_office` | boolean | true | Clean and preserve formatting when pasting from Microsoft Word and Excel |
| `speech_to_text` | boolean | true | Enable Speech to Text and Dictate toolbar buttons (requires Web Speech API: Chrome, Edge, Safari) |
| `setup` | (editor) => void | - | Callback invoked before init — use to register custom buttons |

### Toolbar Toggle

The toolbar supports a `||` (double pipe) separator to split buttons into a **primary row** and **collapsible overflow rows**. When `||` is present, a toggle button (`…`) appears at the far right of the primary row. Clicking it shows or hides the overflow buttons.

```typescript
const editor = new HTMLEditor(container, {
  // Buttons before || are always visible; buttons after || are toggled
  toolbar: 'bold italic underline strikethrough | fontfamily fontsize || alignleft aligncenter alignright | forecolor backcolor | undo redo',
});
```

The default `FULL_TOOLBAR` and `BASIC_TOOLBAR` presets include `||` so the toggle button appears out of the box. The overflow rows start collapsed.

If your custom toolbar string contains no `||`, all buttons render in a single flat toolbar with no toggle button (backwards compatible).

## API Reference

### Methods

- `getContent(): string` - Get HTML content
- `setContent(html: string): void` - Set HTML content
- `insertContent(html: string): void` - Insert HTML at cursor
- `execCommand(cmd: string, ui?: boolean, value?: any): boolean` - Execute editor command
- `isDirty(): boolean` - Check if content has changed
- `setDirty(state: boolean): void` - Set dirty state
- `setReadOnly(state: boolean): void` - Toggle read-only mode (disables editing and dims the toolbar)
- `isReadOnly(): boolean` - Check if the editor is read-only
- `focus(): void` - Focus the editor
- `hasFocus(): boolean` - Check if editor has focus
- `setLanguage(code: string): void` - Change UI language at runtime (rebuilds toolbar)
- `getTipTap(): Editor | null` - Access the underlying TipTap editor instance
- `getConfig(): EditorConfig` - Get the resolved editor configuration
- `isBasicEditor(): boolean` - Check if the editor is in basic mode
- `on(event, callback): void` - Subscribe to an editor event
- `off(event, callback): void` - Unsubscribe from an editor event
- `fire(event, ...args): void` - Fire an editor event manually
- `destroy(): void` - Clean up and remove editor

### Events

- `init` - Editor initialized
- `change` - Content changed (debounced)
- `dirty` - Dirty state changed
- `focus` - Editor focused
- `blur` - Editor blurred
- `languagechange` - UI language changed (receives language code)
- `templatechange` - A template was applied (receives the `Template` object)

### Supported Commands

The following TinyMCE-compatible commands are supported:

- `bold`, `italic`, `underline`, `strikethrough`
- `fontname`, `fontsize`, `lineheight`
- `forecolor`, `hilitecolor`, `backcolor`
- `justifyleft`, `justifycenter`, `justifyright`, `justifyfull`
- `insertunorderedlist`, `insertorderedlist`
- `indent`, `outdent`
- `undo`, `redo`
- `removeformat`
- `mceremoveeditor` - Destroys the editor instance

## Templates

The editor supports a template dropdown that lets users insert predefined HTML snippets. Enable it with `includeTemplates: true` and provide a `templates` array.

### Template interface

```typescript
interface Template {
  id?: number | string;  // Optional identifier
  title: string;         // Display name in the dropdown
  description?: string;  // Tooltip/description shown in the dropdown
  content: string;       // HTML content to insert
}
```

### Configuration

```typescript
const editor = new HTMLEditor(container, {
  includeTemplates: true,
  templates: [
    {
      id: 1,
      title: 'Greeting',
      description: 'A simple greeting message',
      content: '<h2>Hello!</h2><p>Thank you for reaching out.</p>',
    },
    {
      id: 2,
      title: 'Meeting Notes',
      description: 'Template for meeting minutes',
      content: '<h2>Meeting Notes</h2><p><strong>Date:</strong> [date]</p><h3>Agenda</h3><ol><li>Item 1</li></ol>',
    },
  ],
  // Make sure 'template' appears in the toolbar string
  toolbar: 'bold italic | template | undo redo',
});
```

### Listening for template changes

When a user selects a template, the `templatechange` event fires with the full `Template` object:

```typescript
editor.on('templatechange', (template) => {
  console.log('Applied template:', template.title);
  console.log('Template ID:', template.id);
  console.log('Content:', template.content);
});
```

This event fires in addition to the standard `change` event, so consumers can distinguish a template insertion from regular edits and react accordingly (e.g. populate form fields, trigger a save, or log analytics).

## Toolbar Buttons

All built-in toolbar button names that can be used in the `toolbar` config string:

| Button | Description |
|--------|-------------|
| `bold` | Toggle bold |
| `italic` | Toggle italic |
| `underline` | Toggle underline |
| `strikethrough` | Toggle strikethrough |
| `subscript` | Toggle subscript |
| `superscript` | Toggle superscript |
| `bullist` | Toggle bullet list |
| `numlist` | Toggle numbered list |
| `outdent` | Decrease indent |
| `indent` | Increase indent |
| `blockquote` | Toggle block quote |
| `fontfamily` | Font family dropdown |
| `fontsize` | Font size dropdown |
| `lineheight` | Line height dropdown (1, 1.2, 1.4, 1.6, 2) |
| `blocks` | Block format dropdown (Paragraph, Heading 1–6; alias `formatselect`) |
| `styles` | Named styles dropdown (configurable via `style_formats`) |
| `table` | Table dropdown (insert table + row/column/cell operations) |
| `hr` | Insert horizontal rule |
| `template` | Template dropdown (requires `includeTemplates: true`) |
| `alignleft` | Align left |
| `aligncenter` | Align center |
| `alignright` | Align right |
| `alignjustify` | Justify text |
| `forecolor` | Text color picker (28 preset colors + custom hex input) |
| `backcolor` | Highlight color picker (28 preset colors + custom hex input) |
| `removeformat` | Clear all formatting |
| `copy` | Copy selection |
| `cut` | Cut selection |
| `paste` | Paste from clipboard (async Clipboard API; prefers HTML, falls back to plain text) |
| `undo` | Undo last change |
| `redo` | Redo last undo |
| `image` | Insert image dialog (upload file or enter URL) |
| `charmap` | Special character picker (currency, math, arrows, symbols, Greek, punctuation) |
| `emoticons` | Emoji picker with search (smileys, gestures, hearts, objects, symbols, arrows) |
| `code` | Open HTML source code editor dialog |
| `link` | Open Insert/Edit Link dialog |
| `unlink` | Remove the link at the cursor |
| `anchor` | Insert a named anchor (`<a id>` target) |
| `codesample` | Toggle code sample block |
| `fullscreen` | Toggle fullscreen editing mode |
| `preview` | Open content preview in a new window |
| `searchreplace` | Open Find & Replace dialog |
| `speechtotext` | Open Speech to Text dialog (browser support required) |
| `dictate` | Toggle inline dictation — inserts speech directly at cursor (browser support required) |
| `ltr` | Set text direction to left-to-right |
| `rtl` | Set text direction to right-to-left |

### Default toolbars

**Full toolbar** (default when `basicEditor: false`):

```
bold italic underline strikethrough subscript superscript | blocks styles | bullist numlist outdent indent blockquote | fontfamily fontsize | lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | image table charmap emoticons hr | fullscreen preview | code link unlink anchor codesample | ltr rtl | searchreplace
```

**Basic toolbar** (when `basicEditor: true`):

```
bold italic underline strikethrough subscript superscript | bullist numlist outdent indent | fontfamily fontsize blockquote | lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | charmap emoticons | link unlink | ltr rtl | searchreplace
```

## Image Upload

The image button opens a two-tab dialog:

- **Upload** — Drag-and-drop or browse for a local file. Supports JPEG, PNG, GIF, WebP, and SVG.
- **URL** — Enter an image URL directly.

If `images_upload_url` is configured, files are sent as `multipart/form-data` to that endpoint. The server response must be JSON containing a `location`, `url`, or `link` field with the resulting image URL. When no upload URL is set, images are embedded as base64 data URIs.

SVG files are automatically sanitized — dangerous elements (`<script>`, `<foreignObject>`, `<animate*>`) and event-handler attributes are stripped before insertion.

```typescript
const editor = new HTMLEditor(container, {
  images_upload_url: '/api/upload',
  images_upload_credentials: true, // send cookies with CORS requests
  images_upload_base_path: '/files/', // prefix for returned URLs
  images_upload_max_size: 5 * 1024 * 1024, // 5 MB limit
  images_upload_headers: {
    'X-CSRF-Token': token,
  },
});
```

### Restricting file types and rejecting uploads

`images_file_types` restricts which extensions are accepted (matched against the
file name, falling back to MIME for clipboard pastes that have no name). The
`images_upload_validate` hook runs before every upload — return a message to
reject the file. For drag-drop and clipboard-paste uploads there is no dialog to
show the message in, so rejections and failures are routed to `images_upload_error`
(supply your own alert/notification — the CKEditor `simpleuploads` `newAlert` flow).

```typescript
const editor = new HTMLEditor(container, {
  images_upload_url: '/api/upload',
  images_file_types: 'jpg,jpeg,png,gif,bmp', // CKEditor simpleuploads parity
  images_upload_validate: (file) =>
    file.size === 0 ? 'Empty files are not allowed' : null,
  images_upload_error: (message) => myApp.showAlert(message),
});
```

## Source Code Editor

The `code` toolbar button opens a modal dialog for viewing and editing the raw HTML source of the editor content. The dialog features a full-size monospace textarea with the current HTML, **Cancel** and **Save** buttons, and supports Escape to close and Tab to indent.

The dialog inherits the active skin theme — oxide, oxide-dark, confab, and confab-dark are all supported automatically.

## Insert/Edit Link

The `link` toolbar button opens a modal dialog for inserting or editing hyperlinks with the following fields:

- **URL** — the link destination
- **Text to display** — the visible link text (pre-populated from selection)
- **Title** — the HTML `title` attribute (shown as a tooltip on hover)
- **Open link in…** — dropdown to choose between _Current window_ or _New window_ (`target="_blank"`)

When editing an existing link, all fields are pre-populated from the current link attributes. Clearing the URL and saving removes the link. The dialog inherits the active skin theme. The separate `unlink` toolbar button removes the link at the cursor without opening the dialog.

**URL normalization:** a URL entered without a scheme that looks like a bare domain (e.g. `www.example.com` or `example.com/path`) is saved with `http://` prepended, so it resolves as an external link instead of a broken relative path. URLs that already carry a scheme (`https:`, `mailto:`, `tel:`, `ftp:`, …), anchors (`#section`), absolute/relative paths (`/`, `./`, `../`), and protocol-relative URLs (`//host`) are left exactly as typed.

## Named Anchors

The `anchor` toolbar button opens a dialog to insert a named anchor — an `<a id="name">` target for in-page linking. The anchor name is required and may not contain spaces. Existing anchors in loaded content (`<a id>` with no `href`) are preserved through the editor's parse/serialize cycle.

```typescript
// Programmatic insertion via the TipTap command:
editor.getTipTap()?.commands.setAnchor('section-1');
```

## Tables

The `table` toolbar button is a dropdown that inserts a table and edits the one under the cursor:

- **Insert table** — inserts a 3×3 table with a header row.
- **Insert/delete row**, **Insert/delete column**, **Merge cells**, **Split cell**, **Toggle header row**, **Delete table**.

Tables are resizable by dragging column borders.

## Block & Style Formats

- The `blocks` button (alias `formatselect`) is a block-format dropdown — Paragraph and Heading 1–6 by default. Customize it with `block_formats` (TinyMCE syntax):

  ```typescript
  const editor = new HTMLEditor(container, {
    block_formats: 'Paragraph=p;Title=h1;Subtitle=h2',
  });
  ```

- The `styles` button is a named-styles dropdown driven by `style_formats` (CKEditor `stylesSet`-compatible). Each entry applies a block element and/or inline color/background/class to the selection:

  ```typescript
  const editor = new HTMLEditor(container, {
    style_formats: [
      { title: 'Blue Title', block: 'h3', styles: { color: 'Blue' } },
      { title: 'Marker', inline: 'span', styles: { 'background-color': 'Yellow' } },
      { title: 'Callout', inline: 'span', classes: 'callout' },
    ],
  });
  ```

  > Note: block elements map to headings/paragraph, `color`/`background-color` map to the editor's text-color/highlight marks, and `classes` apply a CSS class to the selection. Arbitrary element wrapping from CKEditor's stylesSet (e.g. `big`, `tt`, `cite`) is not supported by the underlying TipTap schema.

## Read-Only Mode

Start the editor read-only with `readonly: true`, or toggle it at runtime. Read-only mode disables editing and dims/blocks the toolbar.

```typescript
const editor = new HTMLEditor(container, { readonly: true });

editor.setReadOnly(false); // make editable
editor.setReadOnly(true);  // back to read-only
console.log(editor.isReadOnly());
```

## Enter Behavior (`forced_root_block`)

By default, pressing Enter creates a new `<p>` block. Set `forced_root_block: 'div'` for CKEditor `ENTER_DIV` parity, so new blocks (and the serialized output) use `<div>` instead. The `<div id="signature">` signature block is still preserved in either mode.

```typescript
const editor = new HTMLEditor(container, { forced_root_block: 'div' });
```

## Search & Replace

The `searchreplace` toolbar button (or **Ctrl/Cmd+F**) opens a Find & Replace dialog with:

- Case-sensitive matching toggle
- Whole-word matching toggle
- Find next / Find previous navigation
- Replace current match
- Replace all matches

**Dialog keyboard shortcuts:** Enter = find next, Shift+Enter = find previous, Escape = close.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd+B | Toggle bold |
| Ctrl/Cmd+I | Toggle italic |
| Ctrl/Cmd+U | Toggle underline |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| Ctrl/Cmd+F | Open Find & Replace |

## Localization

The editor ships with built-in translations for 31 languages. Set the language at construction or switch dynamically at runtime.

### Setting the language

```typescript
// At construction
const editor = new HTMLEditor(container, { language: 'fr' });

// Change at runtime — toolbar and dialogs update immediately
editor.setLanguage('ja');

// Listen for language changes
editor.on('languagechange', (code) => {
  console.log('Language changed to:', code);
});
```

### Custom translations

If you need translations the built-in locales don't cover, you can provide your own function. A custom `setTranslate()` call takes priority over the built-in locale at construction time.

```typescript
import { setTranslate, TRANSLATION_KEYS } from '@mdaemon/html-editor';

// See all keys that need translating
console.log(TRANSLATION_KEYS);

// Provide a custom translation function
setTranslate((key) => myCustomLookup(key));
```

### Supported languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| `en` | English | `nl` | Nederlands |
| `ar` | العربية | `nb` | Norsk bokmål |
| `ca` | Català | `pl` | Polski |
| `zh` | 中文 | `pt` | Português |
| `cs` | Česky | `ro` | Româna |
| `da` | Dansk | `ru` | Русский |
| `en-gb` | English (UK) | `sr` | Srpski |
| `fi` | Suomi | `sl` | Slovenščina |
| `fr` | Français | `es` | Español |
| `fr-ca` | Canadien français | `sv` | Svenska |
| `de` | Deutsch | `zh-tw` | 繁體中文 (Taiwan) |
| `el` | Ελληνικά | `th` | ไทย |
| `hu` | Magyar | `tr` | Türkçe |
| `id` | Bahasa Indonesia | `vi` | Tiếng Việt |
| `it` | Italiano | | |
| `ja` | 日本語 | | |
| `ko` | 한글 | | |

### Discovering available locales

```typescript
import { availableLocales, getLocale } from '@mdaemon/html-editor';

console.log(availableLocales); // ['en', 'ar', 'ca', ...]
console.log(getLocale('de'));  // { Bold: 'Fett', Italic: 'Kursiv', ... }
```

## Global Utilities

These functions are exported from the package and operate globally (affecting all editor instances).

### Translation

```typescript
import { setTranslate, getTranslate, resetTranslate, createTranslateFunction } from '@mdaemon/html-editor';

// Override translations for all editors
setTranslate((key) => myLookup(key));

// Get the current translate function
const t = getTranslate();

// Reset to built-in locale translations
resetTranslate();

// Create a translate function for a specific locale
const translateDe = createTranslateFunction('de');
console.log(translateDe('Bold')); // 'Fett'
```

### File source resolver

The file source resolver lets you transform image `src` attributes (e.g. to prepend a CDN URL or resolve relative paths).

```typescript
import { setGetFileSrc, getGetFileSrc } from '@mdaemon/html-editor';

setGetFileSrc((path) => `https://cdn.example.com${path}`);

const resolver = getGetFileSrc();
console.log(resolver('/img/photo.jpg')); // 'https://cdn.example.com/img/photo.jpg'
```

### Exported constants

```typescript
import { fontNames, CHAR_MAP, EMOJI_CATEGORIES, TRANSLATION_KEYS } from '@mdaemon/html-editor';

// fontNames — default semicolon-separated font family string
// CHAR_MAP — array of character categories for the character map dialog
// EMOJI_CATEGORIES — array of emoji categories for the emoji picker
// TRANSLATION_KEYS — array of all translation key strings
```

## Custom Toolbar Button API

The `setup` callback receives a TinyMCE-compatible editor API. Use `ui.registry.addButton()` to register custom buttons.

```typescript
const editor = new HTMLEditor(container, {
  toolbar: 'bold italic | myButton | undo redo',
  setup: (ed) => {
    ed.ui.registry.addButton('myButton', {
      tooltip: 'My Custom Button',
      text: 'Click Me',        // text label on the button
      icon: '/icons/custom.svg', // image URL (alternative to text)
      disabled: false,
      onSetup: (api) => {
        // Called when the button is created
        // api.setActive(true) — toggle active state
        // api.setEnabled(false) — disable the button
        // Return a teardown function (optional)
        return () => { /* cleanup */ };
      },
      onAction: (api) => {
        ed.insertContent('<p>Custom content!</p>');
      },
    });
  },
});
```

### ToolbarButtonAPI

The `api` object passed to `onSetup` and `onAction`:

| Method | Description |
|--------|-------------|
| `isEnabled()` | Whether the button is currently enabled |
| `setEnabled(enabled)` | Enable or disable the button |
| `isActive()` | Whether the button is in an active/pressed state |
| `setActive(active)` | Toggle the active/pressed visual state |

## Theming

### Light and dark themes

Set `skin` to switch between light and dark chrome:

```typescript
const editor = new HTMLEditor(container, {
  skin: 'oxide-dark', // dark toolbar and dialogs
  content_css: 'dark', // dark content area
});
```

### Confab skin

The `confab` and `confab-dark` skins integrate with the WorldClient theming system. They use CSS custom properties from the host application so the editor automatically adapts when the app theme changes.

The confab skins also replace the default text/emoji toolbar icons with clean SVG line icons for a more polished look.

```typescript
// Light mode
const editor = new HTMLEditor(container, {
  skin: 'confab',
  content_css: 'confab',
});

// Dark mode
const editor = new HTMLEditor(container, {
  skin: 'confab-dark',
  content_css: 'confab-dark',
});
```

The confab skins expect the following CSS custom properties to be defined by the host application:

| Variable | Purpose |
|----------|---------|
| `--theme-primary` | Primary brand color (buttons, active states) |
| `--theme-primary-hover` | Hover state for primary color |
| `--color-confab-gray-50` to `--color-confab-gray-900` | Gray scale for backgrounds, text, borders |
| `--color-confab-500` | Focus ring color |
| `--color-dark-bg-primary` | Dark mode primary background |
| `--color-dark-bg-secondary` | Dark mode toolbar/panel background |
| `--color-dark-bg-tertiary` | Dark mode inset/recessed background |
| `--color-dark-bg-hover` | Dark mode hover state |
| `--color-dark-text-primary` | Dark mode primary text |
| `--color-dark-text-secondary` | Dark mode secondary text |
| `--color-dark-text-muted` | Dark mode muted text |
| `--color-dark-border` | Dark mode border color |

All variables include fallback values so the editor remains usable without the host CSS, though colors may not match the intended design.

### Custom content styles

Inject additional CSS into the editor content area:

```typescript
const editor = new HTMLEditor(container, {
  content_style: 'body { font-family: Georgia, serif; font-size: 16px; }',
});
```

### CSS classes

The editor DOM uses BEM-style classes you can target for further customization:

- `.md-editor` — outer wrapper
- `.md-editor-fullscreen` — applied in fullscreen mode
- `.md-editor-oxide` / `.md-editor-oxide-dark` — oxide theme variant
- `.md-editor-confab` / `.md-editor-confab-dark` — confab theme variant
- `.md-toolbar` — toolbar container
- `.md-toolbar-sticky` — sticky toolbar
- `.md-toolbar-primary` / `.md-toolbar-overflow` — primary and collapsible toolbar rows
- `.md-toolbar-btn` / `.md-toolbar-btn-active` — toolbar buttons

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

LGPL 3.0 or later - MDaemon Technologies
