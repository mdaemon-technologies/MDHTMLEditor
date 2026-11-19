# @mdaemon/html-editor

[![npm](https://img.shields.io/npm/v/@mdaemon/html-editor?color=blue)](https://www.npmjs.com/package/@mdaemon/html-editor)
[![license](https://img.shields.io/npm/l/@mdaemon/html-editor?color=green)](LICENSE)
[![node](https://img.shields.io/node/v/@mdaemon/html-editor)](https://nodejs.org)
[![install size](https://img.shields.io/npm/unpacked-size/@mdaemon/html-editor)](https://packagephobia.com/result?p=@mdaemon/html-editor)
[![CI](https://github.com/mdaemon-technologies/MDHTMLEditor/actions/workflows/ci.yml/badge.svg)](https://github.com/mdaemon-technologies/MDHTMLEditor/actions/workflows/ci.yml)

A TinyMCE-compatible HTML editor built on TipTap

MDHTMLEditor is the core vanilla TypeScript package - for React usage, see `@mdaemon/html-editor-react`.

## Install

```bash
npm install @mdaemon/html-editor
```

TipTap and ProseMirror are **bundled into the published output** (currently TipTap `3.32.x`) —
there are no peer dependencies to install and no TipTap version for the host app to match. If
your app uses TipTap directly as well, note that the copy inside this package is separate from
yours; pass content across the boundary as HTML (`getContent()` / `setContent()`) rather than
sharing ProseMirror nodes or extension instances between the two.

## Usage

### Basic usage

```ts
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

### Browser (UMD)

For static pages without a bundler, load the self-contained UMD bundle via a `<script>` tag.
It exposes the entire public API under the `MDHTMLEditor` global. Styles must be loaded
separately — the UMD bundle contains JavaScript only.

```html
<link rel="stylesheet" href="https://unpkg.com/@mdaemon/html-editor/dist/styles.css">
<script src="https://unpkg.com/@mdaemon/html-editor"></script>
<script>
  const editor = new MDHTMLEditor.HTMLEditor(
    document.getElementById('editor'),
    { height: 400 }
  );
</script>
```

`unpkg` and `jsdelivr` both serve the package; pin a version for production
(e.g. `https://unpkg.com/@mdaemon/html-editor@1.7.0`).

### Custom Toolbar Buttons

```ts
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
| `trailingNode` | boolean | false | Append an empty trailing paragraph when the document ends in a block node (table, code block) so the cursor can be placed after it |
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
| `images_upload_error_message` | (response: unknown, status: number) => string \| null \| undefined | - | Words the message for a failed upload from the server's reply (parsed JSON body, or null, and the HTTP status). Return null/undefined for the editor's own translated message |
| `image_advtab` | boolean | false | Show the image dialog's Advanced tab: Style, spacing, border, text direction and language. See [Image Dialog](#image-dialog) |
| `image_title` | boolean | false | Show the image's Title field on the dialog's General tab (without it, Title is on the Advanced tab when that is shown) |
| `image_dimensions` | boolean | true | Show the image's Width and Height, with Constrain proportions and Reset size |
| `image_description` | boolean | true | Show the image's Alt text field |
| `image_uploadtab` | boolean | true | Show the image dialog's Upload tab |
| `a11y_advanced_options` | boolean | false | Add an "Image is decorative" checkbox to the image dialog, which saves an empty `alt` |
| `object_resizing` | boolean \| string | true | Show drag handles on a selected image to resize it. A string is a CSS selector, as in TinyMCE: only images that match it can be resized. See [Resizing images](#resizing-images) |
| `resize_img_proportional` | boolean | true | Corner handles keep the image's aspect ratio. Holding Shift while dragging does the opposite for that drag |
| `table_toolbar` | string \| false | *(see [Tables](#table-context-toolbar))* | Buttons of the toolbar shown above a table while the cursor is in it, as a toolbar string. `false` or `''` turns it off. Off by default in the basic editor |
| `table_grid` | boolean | true | Insert tables from a size grid in the table menu. `false` opens the Insert table dialog instead |
| `table_default_attributes` | Record\<string, string\> | `{ border: '1' }` | Attributes of a table the user inserts. Only `border`, `cellpadding` and `cellspacing` are used |
| `table_default_styles` | Record\<string, string\> | `{ 'border-collapse': 'collapse', width: '100%' }` | Style of a table the user inserts, as CSS property/value pairs. Only properties and values a table keeps are used (see [Formatting a table keeps](#formatting-a-table-keeps)) |
| `table_default_header_rows` | number | 0 | Header rows of a table inserted from the menu, grid or dialog |
| `table_default_header_cols` | number | 0 | Header columns of a table inserted from the menu, grid or dialog |
| `table_tab_navigation` | boolean | true | Tab and Shift+Tab move between table cells. `false` makes them work in a cell as they do outside a table: Tab types a tab at the cursor, and Shift+Tab outdents |
| `table_appearance_options` | boolean | true | Show Cell spacing, Cell padding, Border width and Caption in the Table properties dialog |
| `table_advtab` | boolean | true | Show the Advanced tab (border style, border color, background color) in the Table properties dialog |
| `table_row_advtab` | boolean | true | Show the Advanced tab in the Row properties dialog |
| `table_cell_advtab` | boolean | true | Show the Advanced tab (adds border width) in the Cell properties dialog |
| `table_border_widths` | { title, value }[] | 1px to 5px | Choices of the `tablecellborderwidth` menu |
| `table_border_styles` | { title, value }[] | every CSS border style | Choices of the `tablecellborderstyle` menu |
| `table_background_color_map` | string[] \| ColorOption[] | `color_map` | Palette of the `tablecellbackgroundcolor` picker |
| `table_border_color_map` | string[] \| ColorOption[] | `color_map` | Palette of the `tablecellbordercolor` picker |
| `contextmenu` | string \| boolean | `''` | Right-click menu. A string naming `table` (or `true`) shows the table menu on a right-click in a table. Off by default, because it replaces the browser's menu and its spelling suggestions — see [Right-click menu](#right-click-menu) |
| `font_family_formats` | string | *(TinyMCE defaults)* | Semicolon-separated font list (`Name=family,...`) |
| `font_size_formats` | string | '8pt 9pt 10pt 12pt 14pt 18pt 24pt 36pt' | Space-separated font sizes |
| `font_names` | string | - | CKEditor alias for `font_family_formats` |
| `fontSize_sizes` | string | - | CKEditor alias for `font_size_formats` |
| `block_formats` | string | 'Paragraph=p;Heading 1=h1;…' | Block-format dropdown definitions (`blocks` button) |
| `style_formats` | StyleFormat[] | *(subset)* | Named styles for the Styles dropdown (`styles` button) |
| `color_map` | string[] \| ColorOption[] | - | Palette for both color pickers (see [Color Pickers](#color-pickers)) |
| `color_map_foreground` | string[] \| ColorOption[] | *(40 text colors)* | Palette for the `forecolor` picker; overrides `color_map` |
| `color_map_background` | string[] \| ColorOption[] | *(26 highlight colors)* | Palette for the `backcolor` picker; overrides `color_map` |
| `fontName` | string | `arial, helvetica, sans-serif` | Default font family, inlined on every block element (see [Font Family & Size](#font-family--size)) |
| `fontSize` | string | `12pt` | Default font size, inlined on every paragraph (see [Font Family & Size](#font-family--size)) |
| `directionality` | 'ltr' \| 'rtl' | 'ltr' | Text direction |
| `language` | string | 'en' | UI language code (built-in translations for 32 languages) |
| `height` | string \| number | 300 | Editor height (fixed) |
| `min_height` | string \| number | - | Minimum editor height |
| `max_height` | string \| number | - | Maximum editor height |
| `auto_focus` | string | - | Auto-focus the editor on init |
| `skin` | 'oxide' \| 'oxide-dark' \| 'confab' \| 'confab-dark' | 'oxide' | Theme of the editor and of its menus and dialogs (see [Theming](#theming)) |
| `content_css` | 'default' \| 'dark' \| 'confab' \| 'confab-dark' | 'default' | Content area styling |
| `content_style` | string | - | Custom CSS injected into the content area |
| `toolbar` | string | *(see Toolbar section)* | Custom toolbar button layout |
| `toolbar_mode` | 'sliding' \| 'floating' \| 'wrap' | 'wrap' | Toolbar overflow behavior |
| `toolbar_sticky` | boolean | true | Keep toolbar pinned at the top while scrolling |
| `toolbar_expanded` | boolean | false | Start with the More (`…`) toggle open, showing every toolbar row (see [Toolbar Toggle](#toolbar-toggle)) |
| `visualblocks_default_state` | boolean | false | Start with Show blocks on: each block outlined and labeled with its tag (see [Show Blocks](#show-blocks)) |
| `media_url_resolver` | (video) => { href?, thumbnail?, title? } \| null, or a promise of one | - | Supplies the link, thumbnail and title of each video the Insert video dialog inserts (see [Insert Video](#insert-video)) |
| `browser_spellcheck` | boolean | true | Enable browser spell-check |
| `entity_encoding` | 'raw' \| 'named' \| 'numeric' | 'raw' | HTML entity encoding mode |
| `convert_unsafe_embeds` | boolean | true | Sanitize embedded content |
| `format_empty_lines` | boolean | true | Preserve blank lines in exported content. When `true`, every path that hands HTML *out* of the editor (`getContent()`, the `change` event payload, the source dialog, preview) injects a `<br>` into each empty block so blank lines keep their height in mail clients and other consumers that would otherwise collapse a bare `<div></div>`/`<p></p>` to zero height, and every path that brings HTML *in* (`setContent()`, `insertContent()`, the Templates dropdown, saving the source dialog) runs the exact inverse — stripping that `<br>` back out on import so a blank line is not re-parsed as a doubled line. This keeps `setContent(getContent(x))` stable across round-trips (skin/root-block changes, saved-draft reloads). A block holding only a non-breaking space (`<div>&nbsp;</div>`) is *not* a blank line — an `&nbsp;` is visible content that already gives the block height — so it is left exactly as it is by both passes. Set `false` to pass the engine's output through unchanged in both directions. |
| `paste_from_office` | boolean | true | Clean and preserve formatting when pasting from Microsoft Word and Excel |
| `quote_marker_class` | string | - | Class that marks a reply's quoted original. A `<blockquote>` or `<div>` whose class is exactly this keeps it — see [Quoted original of a reply](#quoted-original-of-a-reply) |
| `paste_markdown` | boolean | false | Start with paste-as-Markdown mode on. While on, a paste is read as Markdown and inserted as formatting — see [Pasting Markdown](#pasting-markdown) |
| `paste_as_text` | boolean | false | Start with paste-as-text mode on (TinyMCE's option): every paste inserts the clipboard's plain text, without formatting. Excludes `paste_markdown`, and wins when both are set — see [Pasting as Text](#pasting-as-text) |
| `speech_to_text` | boolean | true | Enable Speech to Text and Dictate toolbar buttons (requires Web Speech API: Chrome, Edge, Safari) |
| `setup` | (editor) => void | - | Callback invoked before init — use to register custom buttons |

### Toolbar Toggle

The toolbar shows one row of buttons. Buttons that don't fit wrap onto more rows, which stay hidden until the user opens the More toggle (`…`) at the right of the first row. The toggle only appears when the buttons need more than one row.

A `||` (double pipe) in the toolbar string starts a new row, so you choose what the first row holds instead of leaving it to the editor's width:

```ts
const editor = new HTMLEditor(container, {
  // The first row is always visible; the row after || is shown by the More toggle
  toolbar: 'bold italic underline strikethrough | fontfamily fontsize || alignleft aligncenter alignright | forecolor backcolor | undo redo',
});
```

A row can still wrap if it is wider than the editor. While the toggle is closed, the buttons on the rows it hides are `inert`, so Tab and screen readers skip them. Where the toolbar is one line, as in narrow mode (which scrolls instead of wrapping) and the table context toolbar, a `||` shows as an ordinary separator. The default toolbars contain no `||`.

The More toggle starts closed. Set `toolbar_expanded: true` to start with every row shown. To remember the user's choice, save it from the `toolbarexpandedchange` event and pass it back as `toolbar_expanded` next time:

```ts
const editor = new HTMLEditor(container, {
  toolbar_expanded: loadSetting('toolbarExpanded') === true, // a boolean, not the string 'true'
});
editor.on('toolbarexpandedchange', (expanded) => saveSetting('toolbarExpanded', expanded));
```

`editor.isToolbarExpanded()` and `editor.setToolbarExpanded(true | false)` read and change it from code. Narrow mode does not change it: once the editor is wide again, the toolbar is open or closed as the user left it.

## API Reference

### Methods

- `getContent(): string` - Get HTML content (applies the `format_empty_lines` serialization pass; the `change` event payload is identical)
- `setContent(html: string): void` - Set HTML content. Backslash-escaped closing tags (`<\/p>`, produced by hosts that pass HTML through PHP `json_encode` and similar `/`→`\/` encoders) are repaired to real tags before parsing, matching TinyMCE's lenient parser, and the `format_empty_lines` import pass is applied. Insignificant whitespace between block elements is collapsed per the HTML spec, so pretty-printed (indented, multi-line) source imports the same way a browser would render it — see [Importing pretty-printed HTML](#importing-pretty-printed-html)
- `insertContent(html: string): void` - Insert HTML at cursor (same `<\/` repair, whitespace handling, and `format_empty_lines` import pass as `setContent`, so inserting a fragment produced by `getContent()` does not double its blank lines)
- `execCommand(cmd: string, ui?: boolean, value?: any): boolean` - Execute editor command. A table command returns `false` when it did not apply (outside a table, in a read-only editor, or with nothing to do)
- `queryCommandValue(cmd: string): string` - The value of a command at the selection, as TinyMCE's: `mceTableRowType` gives `'header'` or `'body'`, `mceTableColType` and `mceTableCellType` give `'th'` or `'td'`. `''` outside a table and for other commands
- `isTableCommandEnabled(cmd: string, value?: unknown): boolean` - Whether a table command would apply at the selection, without running it. For custom table buttons that should be disabled when they can do nothing
- `isPasteMarkdownEnabled(): boolean` - Whether pastes are currently read as Markdown
- `setPasteMarkdown(on: boolean): void` - Turn paste-as-Markdown on or off. Per editor instance and not remembered between sessions — see [Pasting Markdown](#pasting-markdown)
- `isPasteAsTextEnabled(): boolean` - Whether pastes insert plain text only
- `setPasteAsText(on: boolean): void` - Turn paste-as-text on or off; on turns paste-as-Markdown off. Fires `pasteplaintexttoggle` on a change — see [Pasting as Text](#pasting-as-text)
- `isToolbarExpanded(): boolean` - Whether the toolbar's More (`…`) toggle is open, showing every row
- `setToolbarExpanded(expanded: boolean): void` - Open or close the More toggle. Fires `toolbarexpandedchange` when the state changes — see [Toolbar Toggle](#toolbar-toggle)
- `isVisualBlocksEnabled(): boolean` - Whether Show blocks is on
- `setVisualBlocks(on: boolean): void` - Turn Show blocks on or off. Fires `visualblocks` when the state changes — see [Show Blocks](#show-blocks)
- `getFontFamily(): string` - Font family in effect at the cursor (inline override → block font → configured default). Returns `''` when the selection spans more than one family
- `getFontSize(): string` - Font size in effect at the cursor (same resolution order). Returns `''` when the selection spans more than one size, and inside a heading with no inline override (headings size by level)
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
- `change` - Content changed (debounced). The payload is byte-identical to `getContent()`, so saving the event's HTML and polling `getContent()` produce the same result
- `dirty` - Dirty state changed
- `focus` - Editor focused
- `blur` - Editor blurred
- `languagechange` - UI language changed (receives language code)
- `templatechange` - A template was applied (receives the `Template` object)
- `pastemarkdownchange` - Paste-as-Markdown mode was turned on or off (receives the new boolean). Fires only on an actual change, so a host can save the user's choice
- `pasteplaintexttoggle` - Paste-as-text mode was turned on or off (receives `{ state }`, as TinyMCE's `PastePlainTextToggle` event). Fires only on an actual change, so a host can save the user's choice
- `toolbarexpandedchange` - The toolbar's More (`…`) toggle was opened or closed, by the user or `setToolbarExpanded` (receives the new boolean). Fires only on an actual change, not when the editor goes narrow, so a host can save the user's choice
- `visualblocks` - Show blocks was turned on or off, by the user or code (receives `{ state }`, as TinyMCE's `VisualBlocks` event). Fires only on an actual change, so a host can save the user's choice
- `objectresizestart` - The user started dragging an image resize handle (receives `{ target, width, height, handle }` with the starting size)
- `objectresized` - The user finished resizing an image (receives `{ target, width, height, handle }` with the new size). Not fired when the drag is cancelled or the size is unchanged
- `tablemodified` - A table command changed a table (receives `{ table, structure, style }`: the table in the editor, and whether rows, columns or cells changed or only formatting). Not fired by a copy, or by a command that did nothing
- `newrow` / `newcell` - A table command created a row or cell (receives `{ node }`, the new `<tr>` or `<td>`/`<th>` in the editor). Fired by inserting and pasting rows and columns, splitting cells, inserting a table, and Tab in the last cell. Table commands include the menus, buttons, dialogs and Tab; dragging a column border, and editing or deleting cell content, fire none of the three

### Supported Commands

The following TinyMCE-compatible commands are supported:

- `mceTogglePasteMarkdown` - turn paste-as-Markdown mode on or off
- `mceTogglePlainTextPaste` - turn paste-as-text mode on or off, as in TinyMCE
- `bold`, `italic`, `underline`, `strikethrough`
- `fontname`, `fontsize`, `lineheight`
- `forecolor`, `hilitecolor`, `backcolor` — pass `''` or `'none'` as the value to clear the color instead of setting one
- `justifyleft`, `justifycenter`, `justifyright`, `justifyfull`
- `insertunorderedlist`, `insertorderedlist`
- `indent`, `outdent` — context-aware, see [Lists & Indentation](#lists--indentation)
- `undo`, `redo`
- `SelectAll` - select the whole document and focus the editor
- `mcePrint` - print the content (see the `print` button)
- `mceVisualBlocks` - turn Show blocks on or off (see [Show Blocks](#show-blocks))
- `mceToggleFormatPainter` - turn the format painter on (copying the formatting at the selection) or off
- `mceRetrieveFormats` - copy the inline formatting at the selection, without turning the painter on
- `mcePaintFormats` - paint the copied formatting onto the selection (see [Format Painter](#format-painter))
- `mceImage` - open the image dialog: Image properties for the selected image, or Insert image (see [Image Dialog](#image-dialog)). Returns false in the basic editor and in a read-only editor
- `mceMedia` - open the Insert video dialog (see [Insert Video](#insert-video)). Returns false in the basic editor and in a read-only editor
- `removeformat`
- `mceremoveeditor` - Destroys the editor instance
- Table commands — see [Table commands](#table-commands)

## Templates

The editor supports a template dropdown that lets users insert predefined HTML snippets. Enable it with `includeTemplates: true` and provide a `templates` array.

### Template interface

```ts
interface Template {
  id?: number | string;  // Optional identifier
  title: string;         // Display name in the dropdown (plain text)
  description?: string;  // Description shown in the dropdown (plain text)
  content: string;       // HTML content to insert
}
```

### Configuration

```ts
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

```ts
editor.on('templatechange', (template) => {
  console.log('Applied template:', template.title);
  console.log('Template ID:', template.id);
  console.log('Content:', template.content);
});
```

This event fires in addition to the standard `change` event, so consumers can distinguish a template insertion from regular edits and react accordingly (e.g. populate form fields, trigger a save, or log analytics).

### Importing pretty-printed HTML

Template bodies are often stored as they were authored — indented, one block per line — rather than minified. `setContent()` and `insertContent()` collapse the insignificant whitespace between block elements exactly as the HTML spec (and a browser) does, so the source below imports as a two-item list and nothing else:

```html
<div>Last Week</div>

<ul>
	<li>
	<div>Completed the following</div>
	</li>
	<li>
	<div>Fixed the following</div>
	</li>
</ul>
```

The newlines and tabs between `<ul>` and `<li>` are dropped rather than becoming empty list items, and the blank lines between top-level blocks do not become empty blocks. Whitespace that *is* significant is untouched: text inside a block, a non-breaking space (`&nbsp;`), and the contents of a `<pre>`/code block all survive verbatim. Pasting with Ctrl+V goes through a separate clipboard parser and is unaffected either way.

### Importing wrapped HTML

Template bodies also tend to arrive swaddled in container `<div>`s — mail clients and CMSes nest several around the real content. The editor's schema has one block node per line and a block cannot contain a block, so that nesting cannot survive the parse. On import, a `<div>` or `<p>` that contains only block-level children and no text of its own is dissolved and its children hoisted, rather than being left behind as an empty block:

```html
<!-- imported -->
<div><div><div>
  <div>Hello</div>
  <div>World</div>
</div></div></div>

<!-- becomes two lines, not two blank lines followed by two lines -->
<div>Hello</div>
<div>World</div>
```

Inherited style on a dissolved wrapper (`font-family`, `font-size`, `font-weight`, `font-style`, `color`, `line-height`, `text-align`, `text-indent`, `direction`) is carried down to the children it wrapped, unless a child already states that property. A body wrapped in a single `<div style="font-family:Georgia;font-size:10pt">` therefore keeps its font on every line. Box properties (border, background, padding, margin) describe the wrapper itself and cannot be re-expressed on *n* children, so they are dropped.

Blocks that own their nesting are never dissolved: a `<blockquote>`, `<li>` or table cell holding blocks is a real node in the schema, the signature container (`<div id="signature">`) is left intact, and so is the quoted original of a reply (a `<div>` whose class is exactly the marker; see [Quoted original of a reply](#quoted-original-of-a-reply)). A genuinely empty `<div></div>` is a blank line the author typed, not a wrapper, and is preserved.

### Placeholder links

An `<a href="">` — a link whose target the author has not filled in yet, or that an upstream sanitizer has blanked — is preserved as a link on import, matching TinyMCE and CKEditor. URI validation is otherwise unchanged: a `javascript:` or `data:` target is still rejected and its anchor unwrapped to plain text (see [Link addresses](#link-addresses)).

### Links on images

Images are inline, as in TinyMCE and in mail HTML: an image sits in a line of text, so a link around it is kept on import and paste (`<p><a href="https://example.com/"><img src="logo.png"></a></p>` comes back unchanged), and an image between words stays in its paragraph. Select an image and use the Link dialog or `unlink` to link or unlink it. An `<img>` that is not already in a line of text (at the top level, or directly in a table cell, list item, quote or the signature) is put in one (`<p>`, or `<div>` with `forced_root_block: 'div'`); with `<p>` lines it then has the paragraph's margin in the saved HTML. When the selection holds an image (or a mention or named anchor), the Link dialog's "Text to display" is disabled, as in TinyMCE, so the selection is relinked rather than replaced by text. A link the editor rejects, such as `javascript:`, is dropped and the image kept. The image dialog's Link tab also sets, changes or removes the link on an image (see [Image Dialog](#image-dialog)).

### Image maps

In the full editor, an image map survives loading, `insertContent()`, paste and the Source view: the image keeps its `usemap`, and the `<map>` keeps its `name` and its `<area>` hotspots.

```html
<p><img src="https://example.com/office.jpg" alt="Office" usemap="#office"><map name="office"><area shape="rect" coords="34,44,270,350" href="https://example.com/desk" alt="Desk" target="_blank"></map></p>
```

A map written in the same line as its image stays in that line; one written after the image's paragraph gets a line of its own, which adds no blank line to the saved HTML. Content a `<map>` holds besides its areas (text links repeating the hotspots, say) is kept, just after the map. Each `<area>` keeps `shape`, `coords`, `href`, `alt`, `target`, `title` and `rel`, and each value is checked:

- `href` gets the same check as a link's (see [Link addresses](#link-addresses)), so an application scheme such as `notes:` is kept, while a `javascript:` or `data:` target is dropped and the area kept.
- `target` must be `_blank`, `_self`, `_parent` or `_top`. An area with `target="_blank"` gets `rel="noopener noreferrer"` added, as the editor's links do. `shape` must be one HTML defines, and `coords` must be numbers.
- `usemap` must be `#` followed by a name. A `<map>` with only an `id` (the older XHTML form, which browsers also match) keeps it, written out as `name`. A `<map>` with neither usable is dropped with its areas.
- The values are checked again when the content is written out, so an area added through a command or JSON content gets the same checks.
- `id`, `class`, `style`, `data-*` and event attributes are not kept, and neither is an `<area>` outside a `<map>`.

The editor's content is part of the host page rather than an iframe, and a map name is global to the page. So while editing, a map is shown as a small marker instead of a live map, and the image is shown without its `usemap` (so it can't pick up a map from elsewhere on the page): the hotspots do nothing. They work in the saved HTML. The marker's tooltip says so, translated into the editor's language (`Image map: hotspots work in the saved content, not while editing`). Maps have no toolbar button: edit them in the Source view. An image with a map has no resize handles (see [Resizing images](#resizing-images)). The basic editor has no images, so it drops maps.

The TipTap node behind this, `ImageMap`, is exported along with its `ImageMapArea` and `ImageMapOptions` types. It also adds the `usemap` attribute to the `image` node, and shows an image that has no node view of its own without that attribute. If you give the `image` node your own node view, leave `usemap` off the element it shows.

### Quoted original of a reply

A host can mark the quoted original of a reply or forward with a class of its choosing and find the quote again by that class in `getContent()`. Name the class in `quote_marker_class` and the editor keeps it:

```ts
const editor = new HTMLEditor(container, { quote_marker_class: 'quoted-original' });

editor.setContent(
  '<p>Thanks, see below.</p>' +
  '<blockquote class="quoted-original" style="margin-left: 5px; padding-left: 5px; border-left: 2px solid #000">' +
  '<p>The original message.</p></blockquote>'
);

editor.getContent();
// … <blockquote class="quoted-original" style="margin-left: 5px; padding-left: 5px; border-left: 2px solid rgb(0, 0, 0);"><p …>The original message.</p></blockquote>
```

It is off by default, and off for an empty value or one holding more than one class name. With it set:

| Element | Attribute | Kept when |
|---------|-----------|-----------|
| `<blockquote>` | `class` | the value is exactly the marker (surrounding whitespace ignored) |
| `<div>` | `class` | the same; only then is the `<div>` kept as a quote rather than handled as an ordinary line or wrapper |
| either, when marked | `style` | only `margin-*` and `padding-*` (`0` or a positive `px`, `pt` or `em` length), `border-*-width` (the same), `border-*-style` (`none`, `solid`, `dashed`, `dotted`, `double`) and `border-*-color` (hex, `rgb()`/`rgba()` or a color name, not `inherit`, `initial`, `unset` or `revert`) |

The class is written first, so a plain substring search for `<blockquote class="quoted-original"` finds the quote. Nested quotes keep their own marker. A marked quote is a blockquote to the editor, so the Blockquote button, Enter and Backspace work in it as in any blockquote, and the button never creates a marked one. Splitting a marked quote (lifting a line out of it, say) leaves both halves marked, since both are still the quoted original. Content loaded with `setContent()` or `insertContent()` is marked as written. Editing doesn't create a second marked quote that could be found before the real one: while the document holds a marked quote, a marked quote that is pasted in (or part of the quoted original copied and pasted elsewhere in the reply) becomes a plain blockquote, and so does part of a quote dragged out of it or a copy dragged from it. Cutting the quote and pasting it somewhere else, pasting it over itself, or dragging the whole quote to move it keeps the marker. A font on a marked quote reaches the paragraphs directly inside it, not those inside a nested list, table or plain blockquote. Joining a marked quote with a plain blockquote directly next to it (Backspace or Delete at their boundary) merges them into one quote, which is marked only if the first of the two was.

Apart from naming the class, the list is deliberately short and not configurable. The editor's content is part of the host page, not an iframe as in TinyMCE or CKEditor, so a `class`, `id`, `data-*` attribute or `style` from an email could pick up the host app's CSS (an overlay class, say), collide with its ids, or trigger its data-attribute handlers. A class that only *contains* the marker (`class="foo quoted-original"`) is not kept, every other `class`, `id`, `data-*` and `style` is dropped, and adding an entry is a code change.

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
| `outdent` | Decrease indent (see [Lists & Indentation](#lists--indentation)) |
| `indent` | Increase indent (see [Lists & Indentation](#lists--indentation)) |
| `blockquote` | Toggle block quote |
| `fontfamily` | Font family dropdown (button shows the family at the cursor) |
| `fontsize` | Font size dropdown (button shows the size at the cursor) |
| `lineheight` | Line height dropdown (1, 1.2, 1.4, 1.6, 2) |
| `blocks` | Block format dropdown (Paragraph, Heading 1–6; alias `formatselect`) |
| `styles` | Named styles dropdown (configurable via `style_formats`) |
| `table` | Table menu: an Insert table size grid, Cell / Row / Column submenus, Table properties, caption and Delete table (see [Tables](#tables)) |
| `tableinsertdialog` | Open the Insert table dialog |
| `tableprops` / `tablerowprops` / `tablecellprops` | Open the Table / Row / Cell properties dialog |
| `tabledelete` | Delete the table |
| `tableinsertrowbefore` / `tableinsertrowafter` / `tabledeleterow` | Insert a row above / below, delete the row |
| `tableinsertcolbefore` / `tableinsertcolafter` / `tabledeletecol` | Insert a column left / right, delete the column |
| `tablecutrow` / `tablecopyrow` / `tablepasterowbefore` / `tablepasterowafter` | Cut or copy the row, paste it above / below |
| `tablecutcol` / `tablecopycol` / `tablepastecolbefore` / `tablepastecolafter` | Cut or copy the column, paste it left / right |
| `tablemergecells` / `tablesplitcells` | Merge the selected cells, split a merged cell |
| `tablerowheader` / `tablecolheader` | Toggle the row / column between header cells and data cells |
| `tablecaption` | Add or remove the table's caption |
| `tablecellvalign` | Menu: the cells' vertical alignment |
| `tablecellborderwidth` / `tablecellborderstyle` | Menus: the cells' border width / style (`table_border_widths`, `table_border_styles`) |
| `tablecellbackgroundcolor` / `tablecellbordercolor` | Color pickers: the cells' background / border color (`table_background_color_map`, `table_border_color_map`) |
| `hr` | Insert horizontal rule |
| `template` | Template dropdown (requires `includeTemplates: true`) |
| `alignleft` | Align left |
| `aligncenter` | Align center |
| `alignright` | Align right |
| `alignjustify` | Justify text |
| `forecolor` | Text color picker (40 preset colors + custom hex input + Remove color) |
| `backcolor` | Highlight color picker (26 preset colors + custom hex input + Remove color) |
| `removeformat` | Clear all formatting |
| `copy` | Copy selection |
| `cut` | Cut selection |
| `paste` | Paste from clipboard (async Clipboard API; prefers HTML, falls back to plain text). Follows the paste-as-text and Markdown modes when one is on |
| `pastemarkdown` | Toggle paste-as-Markdown mode. Not in the default toolbars — add it to your `toolbar` string |
| `pastetext` | Toggle paste-as-text mode, as TinyMCE's `pastetext`: while it is pressed, every paste inserts plain text (see [Pasting as Text](#pasting-as-text)). Not in the default toolbars |
| `selectall` | Select the whole document, as Ctrl/Cmd+A does. Not in the default toolbars — add it to your `toolbar` string |
| `undo` | Undo last change |
| `redo` | Redo last undo |
| `image` | Insert an image, or edit the selected one, in the image dialog (see [Image Dialog](#image-dialog)). Shown pressed while an image is selected. Not in the basic editor |
| `charmap` | Special character picker (currency, math, arrows, symbols, Greek, punctuation) |
| `emoticons` | Emoji picker (smileys, gestures, hearts, objects, symbols, arrows). Its search matches English emoji names and keywords, such as "heart" or "happy" |
| `code` | Open HTML source code editor dialog |
| `link` | Open Insert/Edit Link dialog |
| `unlink` | Remove the link at the cursor |
| `anchor` | Insert a named anchor (`<a id>` target) |
| `codesample` | Toggle code sample block (also Ctrl+Alt+C, Cmd+Option+C on macOS). In a paragraph with line breaks (`<br>`, Shift+Enter), only the lines the selection touches become the code block; the lines before and after stay text. A selection across several blocks, and the first line of a list item, still convert whole paragraphs |
| `fullscreen` | Toggle fullscreen editing mode |
| `preview` | Open content preview in a new window (the window carries a Content Security Policy that blocks script; images and inline styles still render) |
| `print` | Print the content on its own, without the page around it, as `getContent()` returns it. It prints from a hidden frame that can't run script, so no popup opens. With the button in the toolbar, Ctrl+P (Cmd+P on macOS) in the editor prints this way too. Not in the default toolbars |
| `visualblocks` | Show blocks: outline each block with its tag name while editing (see [Show Blocks](#show-blocks)). Not in the default toolbars |
| `formatpainter` | Format painter: click to copy the inline formatting at the selection and paint it onto the next selection made with the mouse; double-click to keep painting until clicked again or Esc (see [Format Painter](#format-painter)). Not in the default toolbars |
| `media` | Insert video: a YouTube, Vimeo or Dailymotion link goes in as the video's thumbnail, linked to the video (see [Insert Video](#insert-video)). Not in the default toolbars, nor in the basic editor |
| `searchreplace` | Open Find & Replace dialog |
| `speechtotext` | Open Speech to Text dialog (browser support required) |
| `dictate` | Toggle inline dictation — inserts speech directly at cursor (browser support required) |
| `ltr` | Set text direction to left-to-right |
| `rtl` | Set text direction to right-to-left |

### Default toolbars

**Full toolbar** (default when `basicEditor: false`):

```text
bold italic underline strikethrough subscript superscript | blocks styles | bullist numlist outdent indent blockquote | fontfamily fontsize | lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | image table charmap emoticons hr | fullscreen preview | code link unlink anchor codesample | ltr rtl | searchreplace
```

**Basic toolbar** (when `basicEditor: true`):

```text
bold italic underline strikethrough subscript superscript | bullist numlist outdent indent | fontfamily fontsize blockquote | lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste | undo redo | charmap emoticons | link unlink | ltr rtl | searchreplace
```

## Image Dialog

The `image` toolbar button, `execCommand('mceImage')` and a double-click on an image open the image dialog. With an image selected it opens as **Image properties**, filled in from that image, and **Save** changes it in place as one undo step. Otherwise it opens as **Insert image** and **Insert** puts a new image at the cursor. The option names and defaults are TinyMCE's.

- **General**
  - **Source**: the image's address. It must be http(s), relative (without a backslash), or a base64 `data:image/…` URI; an SVG one, base64 or URL-encoded, is cleaned as an uploaded SVG is. An image's own address is kept as it is when you don't change it (a `cid:` one, for example).
  - **Alt text** (`image_description`), and **Image is decorative** (`a11y_advanced_options`), which saves `alt=""`. An image inserted with no alt text has no `alt` attribute, and an image's alt is left alone unless you change it.
  - **Title** with `image_title`.
  - **Width** and **Height** (`image_dimensions`): pixels, or a percentage such as `50%` (not zero). **Constrain proportions** (on at first) keeps the image's ratio as you change one side, and **Reset size** fills in the image's own size.
  - **Alignment**: None, Left or Right, saved as `float` (CKEditor's field; TinyMCE has none).
  - A preview of the image in sample text, at its size and with its float, spacing and border.
- **Link**: a **URL** and **Open link in...** (current or new window). A bare domain gets `http://`, and an address links don't allow (`javascript:`, `data:`; see [Link addresses](#link-addresses)) can't be saved. On a linked image the link changes or goes as a whole, even when it also holds text.
- **Upload** (`image_uploadtab`): drop or browse for a file. It uploads straight away, then fills in Source and shows the General tab. See [Uploading images](#uploading-images).
- **Advanced** (`image_advtab`): **Style**, **Vertical space**, **Horizontal space**, **Border width**, **Border style**, **Text direction** and **Language**, and Title when `image_title` is off. A border width with no border style draws a solid border. The Style field and the others follow each other as you type.
- A field whose value can't be saved (a Source that isn't an image address, a link links don't allow, a size, spacing or language an image can't keep) is marked (`aria-invalid`), and Save waits until it is fixed or emptied. The arrow keys, Home and End move between the tabs.

```ts
const editor = new HTMLEditor(container, {
  image_advtab: true,           // the Advanced tab
  image_title: true,            // Title on the General tab
  a11y_advanced_options: true,  // "Image is decorative"
});
```

### What an image keeps

Editor content is part of your page, so an image keeps only checked values:

- its `style`, limited to `float` (left, right or none), the four margins, and `border-width`, `border-style` and `border-color` (exported as `IMAGE_STYLE_RULES`); anything else in a style, such as `position` or a `url()`, is dropped;
- `dir` (`ltr` or `rtl`) and `lang` (a language tag such as `fr-CA`);
- the older `align="left|right"`, `hspace`, `vspace` and `border` attributes, read into that style on load and saved as CSS;
- a size written as style in pixels (`style="width: 200px"`), read into the `width` and `height` attributes when the image has none.

Images still don't keep `id` or `class`. The dialog doesn't write them either. The TipTap extension behind this, `ImageAttributes`, is exported for hosts that build their own TipTap editor. The `ImageDialog` class (with its `ImageDialogOptions` and `ImageUploader` types) is exported for hosts with their own toolbar; it takes the `HTMLEditor` it works on. `imageSource(value)` gives the address the dialog would store for a Source, or `null` when it would refuse it.

### Uploading images

The Upload tab supports JPEG, PNG, GIF, WebP, BMP and SVG. Unlike TinyMCE, it is shown even without `images_upload_url`, because uploads then embed the image.

If `images_upload_url` is configured, files are sent as `multipart/form-data` to that endpoint. The server response must be JSON containing a `location`, `url`, or `link` field with the resulting image URL. When no upload URL is set, images are embedded as base64 data URIs.

An image pasted from the clipboard or dropped on the editor uploads the same way, in place of the paste or drop: an image copied or dragged from a web page goes in as the upload only, not also as the `<img>` in its HTML. If the upload is refused or fails, nothing goes in. A read-only editor takes no pasted or dropped image. A paste that has text beside its picture is pasted once, as its HTML (or its text, in paste-as-text mode), and the picture isn't uploaded: cells copied from a spreadsheet, for example, carry a picture of themselves as well as their table.

SVG files are automatically sanitized — dangerous elements (`<script>`, `<foreignObject>`, `<animate*>`) and event-handler attributes are stripped before insertion.

```ts
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

```ts
const editor = new HTMLEditor(container, {
  images_upload_url: '/api/upload',
  images_file_types: 'jpg,jpeg,png,gif,bmp', // CKEditor simpleuploads parity
  images_upload_validate: (file) =>
    file.size === 0 ? 'Empty files are not allowed' : null,
  images_upload_error: (message) => myApp.showAlert(message),
});
```

### Wording failed uploads

When an upload fails, the editor shows a translated message of its own: "No URL
returned from server" for a 2xx reply with no string `location`, `url` or `link`,
"Invalid server response" for a reply that is not a JSON object, and "Upload
failed: <status>" for an HTTP error status. A network error, an aborted request,
an SVG that can't be parsed or a file that can't be read also get translated
messages.

When your server explains a refusal in its reply, `images_upload_error_message`
lets you word the message yourself. It receives the parsed JSON body (`null` when
the body is not JSON) and the HTTP status, and returns the message to show, or
`null`/`undefined` to keep the editor's own. It is not called for a network
error or an aborted request, which have no reply. The message is shown in the
image dialog as text, and passed to `images_upload_error` for a dropped or pasted
image.

```ts
const UPLOAD_ERRORS: Record<string, string> = {
  ContentBlocked: 'Files of this type are blocked.',
  UploadRefused: 'The server refused the upload.',
};

const editor = new HTMLEditor(container, {
  images_upload_url: '/api/upload',
  // The server answers a refusal with HTTP 200 and {"error": "<code or reason>"}
  images_upload_error_message: (response) => {
    const error = (response as { error?: unknown } | null)?.error;
    if (typeof error !== 'string') return null;
    return UPLOAD_ERRORS[error] ?? error;
  },
  images_upload_error: (message) => myApp.showAlert(message),
});
```

### Resizing images

Click an image in the full editor to select it. Eight handles appear, one on each corner and one on each side. Drag one to resize the image:

- **Corners** keep the aspect ratio. Hold **Shift** to stretch freely instead. With `resize_img_proportional: false`, corners stretch freely and Shift keeps the ratio.
- **Sides** change only the width (left and right) or only the height (top and bottom).
- A label shows the size in pixels while you drag. An image can't be made smaller than 20px on either side, or wider than the space it sits in (the editor, or a table cell).
- An image with an [image map](#image-maps) (`usemap`) has no handles: its hotspots' `coords` are in the image's pixels, so a new size would move them off what they mark.
- Press **Escape** during a drag to put the image back to its starting size.
- Touch and pen work too. The handles are larger on touch screens.

When you let go, the size is saved in the image's `width` and `height` attributes, the same form TinyMCE uses. The resize is one undo step, and it marks the editor dirty and fires `change` like any other edit:

```html
<img class="md-editor-image" src="photo.jpg" width="320" height="240">
```

The image dialog's Width and Height set the same attributes. A double-click on an image opens the dialog; a double-click on a handle doesn't.

The editor shows a resizable image at its `width` and `height` attributes, even when they don't match the picture's own shape. An image wider than the editor is scaled down to fit without being distorted. Images with a percentage size (`width="50%"`) keep that size relative to the editor, and get pixel sizes once they are resized. A resizable image has 1em of space below it, as a paragraph does.

Handles are hidden in read-only mode. Turn resizing off with `object_resizing: false`. Images then look and behave as they did before this feature. A CSS selector limits resizing to the images that match it (`'img[alt]'`, for example), and TinyMCE's own selector lists work too. Images it doesn't match also look as before. In the editor each image sits inside its own wrapper element, so selectors that use the image's direct parent or its position among siblings (`td > img`, `img:first-child`) don't match as they would in the saved HTML; descendant selectors (`td img`) and attribute selectors do. The basic editor has no images, so these options don't apply to it.

```ts
const editor = new HTMLEditor(container, {
  object_resizing: 'img',          // or true (default) / false / any selector
  resize_img_proportional: true,   // corners keep the aspect ratio (default)
});

editor.on('objectresized', ({ width, height, handle }) => {
  console.log(`Resized to ${width} × ${height} with the ${handle} handle`);
});
```

The TipTap extension behind this, `ResizableImage`, is exported for use in your own TipTap editor. It is TipTap's `Image` node with the same name, schema and HTML, plus a `proportional` option and `onResizeStart`/`onResized` callbacks.

## Source Code Editor

The `code` toolbar button opens a modal dialog for viewing and editing the raw HTML source of the editor content. The dialog features a full-size monospace textarea with the current HTML, **Cancel** and **Save** buttons, and supports Escape to close and Tab to indent.

The dialog inherits the active skin theme — oxide, oxide-dark, confab, and confab-dark are all supported automatically.

## Insert/Edit Link

The `link` toolbar button opens a modal dialog for inserting or editing hyperlinks with the following fields:

- **URL** — the link destination
- **Text to display** — the visible link text (pre-populated from selection)
- **Title** — the HTML `title` attribute (shown as a tooltip on hover)
- **Open link in…** — dropdown to choose between _Current window_ or _New window_ (`target="_blank"`)

When editing an existing link, all fields are pre-populated from the current link attributes. With the caret on a link and nothing selected, the dialog edits that whole link, text included, and Save updates it in place. Clearing the URL and saving removes the link. The dialog inherits the active skin theme. The separate `unlink` toolbar button removes the link at the cursor without opening the dialog.

**Typing after a link:** after a paste or a link inserted from the dialog leaves the caret at the end of a link, the next text typed is plain, so a pasted URL does not swallow the words that follow it. This covers pasted URLs and email addresses, pasted HTML or Markdown that ends in a link (Ctrl+V or the Paste button), `editor.insertContent()` (and so the Templates dropdown), and dialog inserts. Otherwise links behave as in the browser's own editing: put the caret at the end of a link and type, and the link extends; select link text and retype it, and the link is kept.
**Pasting a URL:** a URL or email address pasted at the caret is linked. Pasted over selected text (or a selected inline item such as a mention) within one paragraph, it turns that selection into a link instead of replacing it. Over a larger selection (all content selected with Ctrl+A, or a selection spanning several paragraphs), it replaces the selection like any other paste, and the pasted URL is linked. (Text copied from inside the editor pastes exactly as it was copied, linked or not.)

**Clicking a link** in the editor places the caret; it does not open the link.

**URL normalization:** a URL entered without a scheme that looks like a bare domain (e.g. `www.example.com` or `example.com/path`) is saved with `http://` prepended, so it resolves as an external link instead of a broken relative path. So is a host with a dot, or `localhost`, followed by a port and then a path or nothing (`example.com:8080/page`, `127.0.0.1:3000`, `localhost:3000`), which would otherwise read as a scheme. An application's own scheme is left as typed: `example.dms:1|ABC` has more than a port after the colon, and `x-example-app:12345` has no dot. A dotted scheme followed by digits alone, such as `example.dms:12345`, can't be told from a host and port, so typed in a dialog it gets `http://`; load it with `setContent()` or the Source view instead. Saving a link without changing its URL keeps the address it had, as is. Control characters (a pasted tab, say) are removed from a typed URL. URLs that already carry a scheme (`https:`, `mailto:`, `tel:`, `ftp:`, …), anchors (`#section`), absolute/relative paths (`/`, `./`, `../`), and protocol-relative URLs (`//host`) are left exactly as typed.

### Link addresses

A link may use any URL scheme, including an application's own: `notes://server/db`, `outlook:00000000ABC`, `zoommtg:`, or one with a dot, such as `example.dms:1|ABC`. This applies to every way a link gets in: `setContent()`, pasted HTML, the Source view, the Link dialog, the image dialog's Link tab and an image map's `<area href>`. Only these schemes are refused:

- `javascript:`, `vbscript:` and `mhtml:`, which run script, and `data:`, which holds a whole document. TinyMCE refuses these too.
- `file:`, `blob:` and `filesystem:`, which point at local files or the page's own objects. TinyMCE keeps these, but they never work for the reader of saved content.

A refused link becomes plain text with its text kept. The Link dialog and the image dialog's Link tab won't save one: the URL field is marked, and the dialog stays open until it is fixed. The scheme is checked after whitespace and control characters are removed, so `java&#9;script:` is refused too. Addresses without a scheme (`#section`, `/path`, `page.html`) are always allowed.

## Named Anchors

The `anchor` toolbar button opens a dialog to insert a named anchor — an `<a id="name">` target for in-page linking. The anchor name is required and may not contain spaces. Existing anchors in loaded content (`<a id>` with no `href`) are preserved through the editor's parse/serialize cycle.

```ts
// Programmatic insertion via the TipTap command:
editor.getTipTap()?.commands.setAnchor('section-1');
```

## Tables

Table editing follows TinyMCE's table plugin: the same menu, toolbar buttons, dialogs, commands, events and options.

### Table menu

The `table` toolbar button opens the table menu:

- **Insert table** — a 10×10 grid: point at the size you want and click. With `table_grid: false` it opens the Insert table dialog (columns and rows, 1 to 100 each) instead. A new table has `border="1"` and `border-collapse: collapse; width: 100%` (`table_default_attributes`, `table_default_styles`), so its borders show in mail clients, and no header row unless `table_default_header_rows` / `table_default_header_cols` say otherwise.
- **Cell** — Cell properties, Merge cells, Split cell.
- **Row** — Insert row before / after, Delete row, Row properties, Cut / Copy row, Paste row before / after, Toggle header row.
- **Column** — Insert column before / after, Delete column, Cut / Copy column, Paste column before / after, Toggle header column.
- **Table properties**, **Toggle caption**, **Delete table**.

Items that cannot apply are disabled: everything but Insert table outside a table, Merge cells unless several cells are selected, and the paste items until a row or column was cut or copied. Select several cells by dragging across them, or with Shift+arrow keys; most row, column and cell actions then apply to all of them.

Deleting the last row or the last column of a table deletes the table, as in TinyMCE. Merging cells across whole rows leaves no empty rows behind. Rows and columns are cut, copied and pasted through the editor's own table clipboard, separate from the system clipboard: a pasted row narrower than the table is padded with empty cells, and one wider than it widens the table. Ctrl+C / Ctrl+V of selected cells still use the system clipboard and paste into the cells of the table.

Columns are resized by dragging their borders.

### Table context toolbar

While the cursor is in a table, a small toolbar floats above it, with TinyMCE's default buttons: Table properties, Delete table, Insert row before / after, Delete row, Insert column before / after, Delete column. `table_toolbar` sets its buttons as a toolbar string (any of the table buttons in [Toolbar Buttons](#toolbar-buttons), and custom buttons), and `table_toolbar: false` turns it off. It is off by default in the basic editor and hidden while the editor is read-only or does not have focus.

### Right-click menu

With `contextmenu: 'table'`, a right-click in a table opens the table menu (without Insert table) for the cell under the pointer, or for the selected cells when it is one of them. It is off by default because it replaces the browser's own menu, and with it the spelling suggestions; Ctrl+right-click still shows the browser's menu, and so does a right-click outside a table.

### Properties dialogs

- **Table properties** — width, height, cell spacing, cell padding, border width, caption and alignment (left and right float the table, center centers it); the Advanced tab has border style, border color and background color. `table_appearance_options: false` hides cell spacing, cell padding, border width and caption, and `table_advtab: false` the Advanced tab.
- **Row properties** — row type (header or body), alignment and height, with the same Advanced tab (`table_row_advtab`).
- **Cell properties** — width, height, cell type (cell or header cell), scope, horizontal and vertical alignment; the Advanced tab adds border width (`table_cell_advtab`). A cell's width is its column's, so it applies to every cell in the column.

A size without a unit is pixels. Only the fields you change are applied, so opening a dialog on several rows or cells that differ leaves the rest alone. A value the editor does not keep (see below) is dropped.

### Table commands

| Command | Value | Action |
|---------|-------|--------|
| `mceInsertTable` | `{ rows, columns, options?: { headerRows, headerColumns } }` | Insert a table, of at most 100 rows and 100 columns |
| `mceInsertTableDialog` | - | Open the Insert table dialog |
| `mceTableProps` / `mceTableRowProps` / `mceTableCellProps` | - | Open the Table / Row / Cell properties dialog |
| `mceTableInsertRowBefore` / `mceTableInsertRowAfter` / `mceTableDeleteRow` | - | Insert a row above / below, delete the selected rows |
| `mceTableInsertColBefore` / `mceTableInsertColAfter` / `mceTableDeleteCol` | - | Insert a column left / right, delete the selected columns |
| `mceTableCutRow` / `mceTableCopyRow` / `mceTablePasteRowBefore` / `mceTablePasteRowAfter` | - | Cut or copy the selected rows, paste them above / below |
| `mceTableCutCol` / `mceTableCopyCol` / `mceTablePasteColBefore` / `mceTablePasteColAfter` | - | Cut or copy the selected columns, paste them left / right |
| `mceTableMergeCells` / `mceTableSplitCells` | - | Merge the selected cells, split a merged cell |
| `mceTableDelete` | - | Delete the table |
| `mceTableToggleCaption` | - | Add a caption (the word "Caption", to edit in Table properties) or remove it |
| `mceTableRowType` | `{ type: 'header' \| 'body' }` | Make the selected rows header or body rows (`'footer'` is not supported) |
| `mceTableColType` / `mceTableCellType` | `{ type: 'th' \| 'td' }` | Make the cells of the selected columns / the selected cells header or data cells |
| `mceTableApplyCellStyle` | `{ 'background-color'?, 'border-color'?, 'border-style'?, 'border-width'?, 'vertical-align'?, height? }` | Style the selected cells; an empty value removes a property. Each side's border (`'border-top-width'` and so on) can be set too. camelCase names (`backgroundColor`) work too; other properties are ignored, and with none left the command does nothing |

`queryCommandValue('mceTableRowType' | 'mceTableColType' | 'mceTableCellType')` reads the types back. Table commands do nothing, and return `false`, in a read-only editor. They fire `tablemodified`, and those that create rows or cells fire `newrow` and `newcell` first (see [Events](#events)).

### Formatting a table keeps

The editor's content is part of the host page, not an iframe as in TinyMCE, so a table's attributes are not passed through whole. A table keeps its `border`, `cellpadding` and `cellspacing` (as plain numbers) and its caption (as plain text), and each part keeps only these style properties, with values checked (no `url()`, `calc()`, `var()`, negative length or CSS-wide keyword):

- **Table** — `width`, `height`, `border-collapse`, `float`, `margin-left`, `margin-right`, `background-color`, `border-width`, `border-style`, `border-color`
- **Row** — `height`, `text-align`, `vertical-align`, `background-color`, `border-width`, `border-style`, `border-color`
- **Cell** — `height`, `vertical-align`, `background-color`, `border-width`, `border-style`, `border-color`, each side's border (`border-top-width`, `border-left-style` and so on, for a cell whose sides differ), plus `text-align`, `scope`, `colspan`, `rowspan` and the column width

The legacy `bgcolor`, `valign`, `width`, `height` and `align` attributes common in email are read into the same style. Everything else — `class`, `id`, `data-*`, other properties — is dropped. This is also what keeps cell shading and borders pasted from Word and Excel.

### Pasting from Excel

Cells copied from Excel keep their formatting: fills, borders, alignment, and the text's font, size, color, bold, italic, underline and strikethrough, including a run formatted differently within a cell. Excel puts most of that in class rules in a `<style>` block rather than on the cells, so the editor writes those rules onto the cells before it drops the classes. A cell keeps what a cell may keep (above), and its text formatting goes on its text. Excel's automatic color is drawn as black on borders, and left to the editor's text color on text. The sheet's default text color, alignment and borders are not copied, as they are not formatting chosen for the cells.

The picture of the cells Excel puts on the clipboard beside the table is not pasted. `paste_from_office: false` turns this off with the rest of the Office cleaning.

### Not supported

- Inserting or deleting a single cell: neither TinyMCE nor this editor does it, as it would break the table's grid. Merge, split, and clearing selected cells with Delete cover those cases.
- `<thead>`, `<tfoot>` and footer rows: header rows are kept as header cells (`<th>`) in `<tbody>`, which is TinyMCE's `table_header_type: 'cells'`. Their content is kept; only the grouping is lost.
- Table, row and cell classes (`table_class_list`, `table_cell_class_list`, `table_row_class_list`, `tableclass`, `tablecellclass`, `mceTableToggleClass`, `mceTableCellToggleClass`), because classes from content are not kept.
- `table_sizing_mode`, `mceTableSizingMode`, `table_column_resizing`, `table_use_colgroups: false` and dragging row heights: column widths are pixels, written to a `<colgroup>`, and only columns can be dragged.
- `table_clone_elements`, `table_header_type`, `table_style_by_css: false`, and the premium `advtable` features (sorting, series).

## Lists & Indentation

### Increase / decrease indent

`indent` and `outdent` — the toolbar's **Increase indent** / **Decrease indent** buttons, `execCommand('indent' | 'outdent')`, and the <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> keys — all resolve to the same behavior, chosen by what is under the cursor (with one exception for <kbd>Tab</kbd>, below):

| Context | Increase indent | Decrease indent |
| --- | --- | --- |
| Code block | Inserts a literal tab | Nothing |
| List item with a previous sibling | Nests it one level deeper | Reduces its own indent, then un-nests it one level |
| First list item at its level | Adds a `margin-left` to the `<li>` | Reduces that margin, then lifts the item out of the list |
| Paragraph, heading | Adds a `margin-left` in 40px steps (max 400px) | Removes one step |

Inside a list the indent is written to the `<li>` rather than to the paragraph inside it, so the bullet or number moves with the text. Because it is an inline `margin-left`, it survives in exported HTML — in a mail client, say — without the editor's stylesheet. In a table, <kbd>Tab</kbd> still moves between cells; the toolbar buttons indent the paragraph in the cell.

<kbd>Backspace</kbd> at the start of an indented paragraph or heading removes one indent step, instead of joining the line to the one above. An empty line is still removed in one press.

### Tab characters

In a paragraph or heading, <kbd>Tab</kbd> with nothing selected types a tab at the cursor, wherever it is in the line, as a word processor does. To indent the whole paragraph, select text in it first, or use the **Increase indent** button. In a list, a code block or a table, <kbd>Tab</kbd> works as described above.

A tab is written as `<span style="white-space: pre;">&#9;</span>`, the form other editors use too, so it keeps its tab stops in exported HTML instead of collapsing to a space. The same span is read back as a tab by `setContent()`, `insertContent()` and paste, keeping any font set on it; a span holding several tabs reads as that many tabs. Any other tab that reaches a line of text becomes one too: a tab in text that keeps its whitespace (`white-space: pre-wrap`, as Google Docs writes), in pasted plain text, or in a code block turned into a paragraph. Inside a code block a tab stays a plain tab in the code, and a line turned into a code block keeps its tabs that way. A tab is one character: one <kbd>Backspace</kbd> or <kbd>Delete</kbd> removes it, and one undo takes it back.

### Ordered list numbering

An ordered list's numbering style is preserved rather than normalized to `1, 2, 3`. `<ol type="A">`, `type="a"`, `type="I"`, `type="i"` and `start="5"` round-trip through `setContent()` / `getContent()` and render as written. A list that states its style with CSS instead (`<ol style="list-style-type:upper-alpha">`) is read the same way and exported as `<ol type="A">`.

Lists that say nothing keep the editor's nesting defaults: decimal, then lower-alpha, then lower-roman for ordered lists; disc, circle, then square for bullets.

### Pasting a list

Lists pasted from Word, Outlook, Google Docs, another editor or a web page are normalized on the way in:

- **Indentation is dropped.** Those sources position a list with inline `margin-left` / `padding-left` / `text-indent` from their own page layout. Carried over, that stacks on top of the editor's list indent, so a pasted list sits a level further right than one built with the toolbar. Nesting is structural (`<ol><li><ol>`), so nothing is lost by dropping it. Indentation on non-list blocks (paragraphs, blockquotes) is left alone.
- **A list that is already a real `<ol>`/`<ul>` stays one list.** Word and Outlook email HTML often marks up a genuine list whose `<li>`s also carry Word's `MsoListParagraph` class and `mso-list` metadata; those items are cleaned in place instead of being wrapped in a second list.
- **Word's numbering style is kept.** `mso-level-number-format` (and `mso-level-start-at`) become the list's `type` and `start`, so a lettered or roman Word list is not renumbered. When the clipboard carries no `@list` rules at all — common — the style is inferred from the marker text Word inlines (`A.`, `iv.`, `1.`, `·`), which also keeps a numbered list from arriving as a bullet list.

Word/Excel cleaning as a whole can be turned off with `paste_from_office: false`; list indentation is normalized either way.

## Pasting as Text

TinyMCE's *Paste as text*: while the mode is on, every paste (Ctrl/Cmd+V, and the `paste` toolbar button) inserts the clipboard's plain text, with none of its formatting, links or images. As in TinyMCE, each pair of line breaks starts a new paragraph and a single line break becomes a line break (`<br>`), and spaces at the start of a line or in a run are kept as non-breaking spaces, so they don't collapse wherever the HTML is shown; in a code block the text goes in as it is. The text takes the formatting at the caret or of the selection it replaces, as typed text would (but doesn't lengthen a link it is pasted at the end of), and over selected table cells it fills every cell. Nothing in the text is turned into formatting: Markdown (`**bold**`, `` `code` ``), HTML and URLs stay literal, and as in TinyMCE not even a URL pasted over selected text links it. A clipboard with HTML but no plain text gives the HTML's text, its paragraphs, line breaks, tabs and mentions kept; HTML with no text (an image, a rule) inserts nothing. A copy that has text beside a picture of itself (cells from a spreadsheet) is pasted as text, with no picture; a copied image, which has no text, still goes to the image upload as usual.

The mode is **off by default** and stays on until it is turned off. Turn it on with the `pastetext` toolbar button, `paste_as_text: true`, `editor.setPasteAsText(true)`, or `editor.execCommand('mceTogglePlainTextPaste')`. It and paste-as-Markdown exclude each other: turning one on turns the other off, and each fires its own event. To remember the user's choice:

```ts
const editor = new HTMLEditor(container, {
  toolbar: 'paste pastetext pastemarkdown',
  paste_as_text: localStorage.getItem('md-paste-text') === 'true',
});
editor.on('pasteplaintexttoggle', ({ state }) => localStorage.setItem('md-paste-text', String(state)));
```

## Pasting Markdown

Chat apps, AI assistants and README files hand out Markdown, which pastes into an editor as the raw `#`, `*` and `|` characters. Turn on paste-as-Markdown mode and a paste is converted to real formatting instead.

The mode is **off by default** and stays on until it is turned off, like [Pasting as Text](#pasting-as-text), which it excludes: turning one on turns the other off. Turn it on with the `pastemarkdown` toolbar button, `paste_markdown: true`, `editor.setPasteMarkdown(true)`, or `editor.execCommand('mceTogglePasteMarkdown')`.

```js
const editor = new HTMLEditor(el, {
  toolbar: 'bold italic | bullist numlist | pastemarkdown paste',
  paste_markdown: false,
});

// Hosts that want to remember the choice can save it and pass it back:
editor.on('pastemarkdownchange', (enabled) => localStorage.setItem('md-paste', String(enabled)));
```

The button is **not** in the default toolbars, so existing toolbars are unchanged; add `pastemarkdown` to your own `toolbar` string. While the mode is on the button is highlighted, carries a dot and reports `aria-pressed="true"`, because a mode left on by mistake quietly changes every paste.

### What is converted

Headings, bold, italic, strikethrough, inline code, links, images, bullet/ordered/nested lists, blockquotes, horizontal rules, fenced code blocks (with their language) and GFM tables.

- **A single newline is a line break.** `line one⏎line two` pastes as two lines, not one run-on paragraph, which matches how chat and AI output is written. A blank line still starts a new paragraph.
- **Task lists become plain bullets.** `- [ ] item` pastes as a bullet reading `item`; the editor has no checkbox node.
- **Raw HTML in the Markdown is shown as literal text.** Pasting `<u>x</u>` gives you the visible characters `<u>x</u>`, not an underline. This keeps a paste from injecting markup, including the editor's own mention and signature elements.
- **Large unlabelled code blocks** are treated as plain text rather than auto-detected, which keeps a big paste from stalling the editor.

### What is left alone

The mode only affects pasting, and even then only some pastes:

- **The clipboard's HTML is ignored while the mode is on.** Code editors and web pages put syntax-highlighted HTML on the clipboard beside the raw text; converting that would paste coloured code instead of formatting.
- **Copying from a code editor converts too.** VS Code (and editors that copy the way it does) marks the clipboard as code, which the editor would otherwise paste as a code block. While the mode is on, Markdown conversion takes precedence; with the mode off, that code-block behaviour is unchanged.
- **Images and files** paste and upload exactly as before.
- **Inside a code block** the Markdown stays literal.
- **A URL pasted over selected text** within a paragraph still turns that text into a link (see [Insert/Edit Link](#insertedit-link)).
- **Drag-and-drop is never converted** — only pastes are.
- **Very large or pathological Markdown** (over 256 KB, or a single paragraph over 5,000 characters) is pasted unconverted rather than risking a frozen tab.

With the mode **off**, pasting is unchanged. Note that TipTap's own paste rules already turn some inline syntax (`**bold**`, `*italic*`) into formatting as you paste — that is not this feature, and it applies either way. Block syntax such as `# Heading` or `- item` only converts while the mode is on.

### Security

Pasted Markdown cannot run script in the editor: raw HTML is escaped to text, the converted HTML is parsed and sanitized in an inert document (never through `innerHTML` on the live page) and links get the same check as any other link (see [Link addresses](#link-addresses)), so `javascript:` targets lose the link and keep their text. Images do load from their URLs when pasted, exactly as they do for an HTML paste, so a remote image reveals the reader's IP to that server. There is deliberately no public "Markdown to HTML string" helper, because that invites host code to write it back into a page with `innerHTML`; hosts that need to insert Markdown use `pasteMarkdownText(view, text)`, which inserts through the editor.

## Block & Style Formats

- The `blocks` button (alias `formatselect`) is a block-format dropdown — Paragraph and Heading 1–6 by default. Customize it with `block_formats` (TinyMCE syntax):

  ```ts
  const editor = new HTMLEditor(container, {
    block_formats: 'Paragraph=p;Title=h1;Subtitle=h2',
  });
  ```

- The `styles` button is a named-styles dropdown driven by `style_formats` (CKEditor `stylesSet`-compatible). Each entry applies a block element and/or inline color/background/class to the selection, and its `title` (plain text) names it in the menu:

  ```ts
  const editor = new HTMLEditor(container, {
    style_formats: [
      { title: 'Blue Title', block: 'h3', styles: { color: 'Blue' } },
      { title: 'Marker', inline: 'span', styles: { 'background-color': 'Yellow' } },
      { title: 'Callout', inline: 'span', classes: 'callout' },
    ],
  });
  ```

  > Note: block elements map to headings/paragraph, `color`/`background-color` map to the editor's text-color/highlight marks, and `classes` apply a CSS class to the selection. Arbitrary element wrapping from CKEditor's stylesSet (e.g. `big`, `tt`, `cite`) is not supported by the underlying TipTap schema.

## Color Pickers

The `forecolor` (text) and `backcolor` (highlight) pickers have **different default
palettes**, because a color that reads well behind text often does not read well as
text. Both are 10 swatches wide:

- **Text (`forecolor`)** — 40 colors: a grayscale ramp, the saturated hues, and two
  rows of darker shades. Hue columns are red berry, red, orange, yellow, green, cyan,
  cornflower blue, blue, purple, magenta.
- **Highlight (`backcolor`)** — 26 colors: a grayscale ramp, the saturated hues, and
  the pale tints that work as marker colors but are illegible as font colors.

Both pickers also offer a custom hex input and a **Remove color** entry, which clears
only that color and leaves other formatting on the selection intact (unlike
`removeformat`, which strips everything).

Override either palette with `color_map_foreground` / `color_map_background`, or both
at once with `color_map`. A per-picker key wins over `color_map`. Both TinyMCE's flat
form and an array of `ColorOption` objects are accepted:

```ts
const editor = new HTMLEditor(container, {
  // TinyMCE flat form: alternating value and label
  color_map_foreground: [
    '#000000', 'Black',
    '#1155CC', 'Dark Blue',
    '#38761D', 'Dark Green',
  ],
  // ColorOption[] form
  color_map_background: [
    { value: '#FFF2CC', label: 'Light Yellow' },
    { value: '#D9EAD3', label: 'Light Green' },
  ],
});
```

Colors can also be set programmatically, including clearing them:

```ts
editor.execCommand('forecolor', false, '#1155CC');
editor.execCommand('forecolor', false, '');       // clear the text color
editor.execCommand('backcolor', false, 'none');   // clear the highlight
```

> Note: swatch labels are used verbatim as tooltips and are not run through the
> translation layer.

## Font Family & Size

The editor inlines a **default font directly on the block elements** of the
exported HTML so content keeps its font when rendered outside the editor (for
example, an email body opened in another client that doesn't load the editor's
CSS). Set the base font with `fontName` / `fontSize`:

```ts
const editor = new HTMLEditor(container, {
  fontName: 'Georgia, serif',
  fontSize: '14pt',
});
```

With the config above, `getContent()` produces blocks that carry the font inline:

```html
<p style="font-family: Georgia, serif; font-size: 14pt;">Hello</p>
```

Defaults when the options are omitted: `arial, helvetica, sans-serif` and `12pt`.

- `font-family` is inlined on paragraphs **and** headings.
- `font-size` is inlined on paragraphs only — headings keep their level-based
  sizing (`h1` = 2em, `h2` = 1.5em, …), which a forced default would otherwise
  clobber.

**Per-selection changes still work.** Selecting text and picking a font or size
from the `fontfamily` / `fontsize` toolbar dropdowns (or `execCommand('fontname', …)`
/ `execCommand('fontsize', …)`) produces an inline `<span>` that overrides the
block default for just that text — so a single paragraph can mix fonts and sizes:

```html
<p style="font-family: Georgia, serif; font-size: 14pt;">
  this is <span style="font-size: 24pt;">A BIG font</span>, and this is a small font
</p>
```

### Where a font change is stored

A font change has to be recorded somewhere that survives until the user actually
types, so the editor picks the target based on the selection:

| Selection when the font is picked | Where it goes | Result |
| --- | --- | --- |
| Text is selected | Inline `<span>` mark | Overrides the block default for that text only |
| Cursor in an **empty** block (e.g. a fresh, empty message body) | The block's own `font-family` / `font-size` | Persists; everything typed into that block gets it |
| Cursor inside existing text | Stored mark, as in any editor | Applies to what you type next, until you move the cursor |

The empty-block rule matters: an inline mark has no text to attach to there, so
it can only be parked as a ProseMirror *stored mark* — which is discarded by the
very next transaction that moves the selection or changes the document. Clicking
into the body, or a host app calling `setTextSelection`, would silently drop the
font before a single character was typed. Writing it to the block instead makes
the choice stick and puts it in the exported HTML.

Use `getFontFamily()` / `getFontSize()` to read back the font in effect at the
cursor, wherever it happens to be stored.

**The toolbar dropdowns show the current font.** The `fontfamily` and `fontsize`
buttons display the value in effect at the cursor — "Times New Roman", "12pt" —
and update as the caret moves, rather than showing the static words "Font" and
"Font size". A family is shown by its configured name (the label side of
`font_family_formats`); a font that isn't in the configured list, such as one
pasted from another editor, is shown by its first family name. The labels are
width-constrained and ellipsized to keep the toolbar from reflowing as the caret
moves, with the full text on each button's `title`.

Where no single value applies, the button falls back to the generic word. That
happens for a selection spanning two different fonts or sizes, and for font size
inside a heading (headings size by level and carry no block font-size).

This is handled by the exported `BlockFontStyle` extension (block defaults and the
`setBlockFontFamily` / `setBlockFontSize` commands) layered with the inline
`FontSize` mark and TipTap's `FontFamily` mark (per-selection overrides).

## Show Blocks

Show blocks draws a dashed outline around each block, labeled with its tag (`P`, `DIV`, `H1` to `H6`, `BLOCKQUOTE`, `UL`, `OL`, `PRE` and `TABLE`), so you can see how the content is built: where one paragraph ends and the next begins, or what a quote or list holds. Each label sits in a little room above its block's text, so blocks move down a little while it is on.

It changes only how the editor shows the content. `getContent()` is the same with it on or off, and turning it on or off doesn't mark the editor dirty.

Turn it on with the `visualblocks` toolbar button, `editor.setVisualBlocks(true)`, or `editor.execCommand('mceVisualBlocks')`, which toggles it. It is off unless `visualblocks_default_state: true` says otherwise. To remember the user's choice, save it from the `visualblocks` event:

```ts
const editor = new HTMLEditor(container, {
  toolbar: 'bold italic | blocks | visualblocks',
  visualblocks_default_state: loadSetting('showBlocks') === true, // a boolean, not the string 'true'
});
editor.on('visualblocks', ({ state }) => saveSetting('showBlocks', state));
```

The outline and label colors come from two CSS custom properties, which the `oxide-dark`, `confab` and `confab-dark` skins set on `.md-editor-<skin> .md-editor-body`. To use your own, set them with a selector that outranks that one, so they apply whichever stylesheet loads last:

```css
.md-editor.md-editor-confab .md-editor-body {
  --md-visualblocks-color: #9ca3af;       /* the dashed outline */
  --md-visualblocks-label-color: #6b7280; /* the tag label */
}
```

## Format Painter

The format painter copies the inline formatting of one piece of text and paints it onto another, as TinyMCE's Format Painter does. Add `formatpainter` to your `toolbar` string to use it; it is not in the default toolbars.

- **Click** the button to copy the formatting at the selection (or at the caret). The button stays pressed and the editor shows a copy cursor. The next selection you make with the mouse is painted, and the painter turns off.
- **Double-click** the button to keep painting: every selection you make is painted until you click the button again or press Esc.
- Clicking into a word paints the whole word; clicking where there is no word paints what you type next.

Painting replaces the target's own inline formatting, so it looks like the source, and one undo takes it back. What is copied:

- bold, italic, underline, strikethrough, subscript, superscript and inline code;
- highlight and text color;
- font, size and style class (from the Styles menu).

Links are neither copied nor removed (so inline code, which can't share text with a link, isn't painted onto linked text), and block formatting (alignment, indent, line height, the block type) is left alone. Painting a table cell selection paints every selected cell; clicking an image doesn't paint it, and a right-click never paints. A paragraph's own font (set with the font menu on the whole paragraph) is painted as a font on the text. Text in the editor's default font paints no font, so the painted text shows its own paragraph's font, and painting never wraps text in a span of the font it already shows.

From code, `execCommand('mceToggleFormatPainter')` turns the painter on or off. `mceRetrieveFormats` copies the formatting at the selection without turning it on, and `mcePaintFormats` paints what was copied onto the selection. A host can bind those two to keys of its own. The editor adds no shortcut, because TinyMCE's Ctrl+Alt+C is Code sample here.

Nothing is painted in a read-only editor, and making the editor read-only turns the painter off.

## Insert Video

The `media` toolbar button and `execCommand('mceMedia')` open the Insert video dialog. Paste a YouTube, Vimeo or Dailymotion link (from the address bar, a share button, a Short, an embed or a player; a playlist is not one video, so it isn't read) and the video goes in as its thumbnail, linked to the video:

```html
<a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v=abcDEF12345"><img class="md-editor-image" src="https://img.youtube.com/vi/abcDEF12345/hqdefault.jpg" alt="Video"></a>
```

An embedded player isn't inserted: the editor keeps no iframes, and mail clients remove them, while a linked image shows everywhere. Vimeo has no thumbnail at a fixed address, so a Vimeo video goes in as a plain link. The link and thumbnail are rebuilt from the video's id, which is strictly checked, so nothing else of the pasted text reaches the content, apart from a YouTube start time (`t=1m30s` or `start=90`, kept as `&t=90s`) and an unlisted Vimeo video's hash, without which it can't be watched. A link the dialog can't read gets a message, and the dialog stays open. In a code block, which holds plain text only, the video goes in a line of its own after the block. The button isn't available in the basic editor, which has no images, or in a read-only editor; making the editor read-only closes the dialog.

### media_url_resolver

The editor doesn't ask the video site about a video; the inserted thumbnail loads from the site's fixed address like any other image. To supply a video's link, thumbnail or title yourself, for example through your own server so that readers' mail clients don't load images from the video site, or to give Vimeo videos a thumbnail, set `media_url_resolver`. The dialog asks it about each video it inserts:

```ts
const editor = new HTMLEditor(container, {
  toolbar: 'bold italic | link image media',
  media_url_resolver: async (video) => {
    // video: { provider: 'youtube' | 'vimeo' | 'dailymotion', id, href, thumbnail? }
    const response = await fetch(`/api/video-preview?provider=${video.provider}&id=${video.id}`);
    if (!response.ok) return null; // keep the defaults
    const { thumbnailUrl, title } = await response.json();
    return { thumbnail: thumbnailUrl, title };
  },
});
```

Return any of `href`, `thumbnail` and `title`; what you leave out keeps its default, and `null`, a rejected promise or an error keeps them all. What it returns is checked like anything else inserted: an `href` must be an http(s) link, and a `thumbnail` an http(s) or relative address, or the default is used. The `title` becomes the image's alt text, or a plain link's text. Insert is disabled while the resolver works, and an answer that comes after the dialog was closed is ignored.

**Not TinyMCE's signature.** TinyMCE calls its `media_url_resolver` with `{ url }` for any link and expects `{ html }` (an embed) back. Here it is asked only about a YouTube, Vimeo or Dailymotion video the dialog has already read, gets `{ provider, id, href, thumbnail }`, and returns `{ href, thumbnail, title }`; an embed is never inserted. A resolver written for TinyMCE has to be rewritten: as it is, it reads `url`, which is undefined, and its `html` is ignored, so the defaults go in.

`parseVideoUrl(url)` is exported too: it returns the same `{ provider, id, href, thumbnail }` for a link, or `null`.

## Read-Only Mode

Start the editor read-only with `readonly: true`, or toggle it at runtime. Read-only mode disables editing and dims/blocks the toolbar.

```ts
const editor = new HTMLEditor(container, { readonly: true });

editor.setReadOnly(false); // make editable
editor.setReadOnly(true);  // back to read-only
console.log(editor.isReadOnly());
```

## Enter Behavior (`forced_root_block`)

By default, pressing Enter creates a new `<p>` block. Set `forced_root_block: 'div'` for CKEditor `ENTER_DIV` parity, so new blocks (and the serialized output) use `<div>` instead. The `<div id="signature">` signature block is still preserved in either mode.

```ts
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
| Ctrl+P (Cmd+P on macOS) | Print the content instead of the whole page (only when the toolbar has a `print` button; otherwise the browser prints the page) |
| Ctrl/Cmd+Alt+C | Toggle code sample on the lines the selection touches (same as the `codesample` button) |
| Tab | Always handled (never escapes the editor). Types a tab at the cursor in a paragraph or heading, adds a left margin to the selected paragraphs/headings when there is a selection, nests the current list item (or, for an item that can't nest, indents its content), inserts a tab in a code block, or moves to the next cell in a table (adding a row in the last cell; with `table_tab_navigation: false` it works in the cell as it does outside a table) |
| Shift+Tab | Reduces the current block's left margin, lifts the current list item, or moves to the previous table cell |
| Backspace | Removes a tab in one press. At the start of an indented paragraph or heading, removes one indent step |
| Shift+Arrow keys (in a table) | Extend a cell selection across cells |
| Esc (while the format painter is on) | Turn the format painter off. Esc still arms the Tab focus escape below |
| Esc, then Tab | Moves focus out of the editor to the next focusable element (Shift+Tab → previous), so Tab is not a keyboard trap. Esc arms this for the next key press only; any other key cancels it |

## Localization

The editor ships with built-in translations for 32 languages. Set the language at construction or switch dynamically at runtime.

### Setting the language

```ts
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

If you need translations the built-in locales don't cover, you can provide your own function. The custom function set with `setTranslate()` is tried first for every string. When it returns `null`, `undefined` or an empty string, the built-in locale is used instead, so you only need to supply the strings you want to change. Like the custom function, the fallback locale is global: it is the `language` of the most recently created editor, or the code from the most recent `setLanguage()` call. `setLanguage()` keeps the custom function and only changes the fallback locale. A translation is plain text, as every label is: markup in one shows as written.

```ts
import { setTranslate, TRANSLATION_KEYS } from '@mdaemon/html-editor';
import type { CustomTranslateFunction } from '@mdaemon/html-editor';

// See all keys that need translating
console.log(TRANSLATION_KEYS);

// Provide a custom translation function. Keys it has no entry for return
// undefined and fall back to the built-in locale.
const myTranslate: CustomTranslateFunction = (key) => myCustomStrings[key];
setTranslate(myTranslate);
```

Two keys hold a placeholder for a number, so a translation can put the number where its language does: `Upload failed: {status}` (an upload refused with an HTTP error status) and `Confidence: {percent}%` (the Speech-to-Text confidence reading). Keep `{status}` or `{percent}` in your text, for example `'Confidence: {percent}%': 'Güvenilirlik: %{percent}'`.

### Supported languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| `en` | English | `nl` | Nederlands |
| `ar` | العربية | `nb` | Norsk bokmål |
| `ca` | Català | `pl` | Polski |
| `zh` | 中文 | `pt` | Português |
| `cs` | Čeština | `ro` | Română |
| `da` | Dansk | `ru` | Русский |
| `en-gb` | English (UK) | `sr` | Српски |
| `fi` | Suomi | `sr-latn` | Srpski (latinica) |
| `fr` | Français | `sl` | Slovenščina |
| `fr-ca` | Français (Canada) | `es` | Español |
| `de` | Deutsch | `sv` | Svenska |
| `el` | Ελληνικά | `zh-tw` | 繁體中文 (Taiwan) |
| `hu` | Magyar | `th` | ไทย |
| `id` | Bahasa Indonesia | `tr` | Türkçe |
| `it` | Italiano | `vi` | Tiếng Việt |
| `ja` | 日本語 | | |
| `ko` | 한국어 | | |

### Discovering available locales

```ts
import { availableLocales, getLocale } from '@mdaemon/html-editor';

console.log(availableLocales); // ['en', 'ar', 'ca', ...]
console.log(getLocale('de'));  // { Bold: 'Fett', Italic: 'Kursiv', ... }
```

## Global Utilities

These functions are exported from the package and operate globally (affecting all editor instances).

### Translation

```ts
import { setTranslate, getTranslate, resetTranslate, createTranslateFunction } from '@mdaemon/html-editor';

// Override translations for all editors. Returning null, undefined or ''
// falls back to the built-in locale (the most recently applied language).
setTranslate((key) => myLookup(key));

// Get the current translate function (custom first, then the built-in locale)
const t = getTranslate();

// Remove the custom function; editors created afterwards use their built-in locale
resetTranslate();

// Create a translate function for a specific locale
const translateDe = createTranslateFunction('de');
console.log(translateDe('Bold')); // 'Fett'
```

### File source resolver

The file source resolver lets you transform image `src` attributes (e.g. to prepend a CDN URL or resolve relative paths).

```ts
import { setGetFileSrc, getGetFileSrc } from '@mdaemon/html-editor';

setGetFileSrc((path) => `https://cdn.example.com${path}`);

const resolver = getGetFileSrc();
console.log(resolver('/img/photo.jpg')); // 'https://cdn.example.com/img/photo.jpg'
```

### Exported constants

```ts
import { fontNames, CHAR_MAP, EMOJI_CATEGORIES, EMOJI_DATA, TRANSLATION_KEYS, DEFAULT_TABLE_TOOLBAR, TABLE_BUTTON_NAMES } from '@mdaemon/html-editor';

// fontNames — default semicolon-separated font family string
// CHAR_MAP — array of character categories for the character map dialog
// EMOJI_CATEGORIES — array of emoji categories for the emoji picker
// EMOJI_DATA — English name and search keywords for each emoji, keyed by the emoji: EMOJI_DATA['😀'].name is 'grinning face'
// TRANSLATION_KEYS — array of all translation key strings
// DEFAULT_TABLE_TOOLBAR — the default table_toolbar string
// TABLE_BUTTON_NAMES — every table toolbar button name
// TABLE_STYLE_RULES, ROW_STYLE_RULES, CELL_STYLE_RULES — the style properties a table, row and cell keep
// IMAGE_STYLE_RULES — the style properties an image keeps (float, margins, border)
```

## Custom Toolbar Button API

The `setup` callback receives a TinyMCE-compatible editor API. Use `ui.registry.addButton()` to register custom buttons, and `ui.registry.addIcon()` to register SVG icons for them.

```ts
const editor = new HTMLEditor(container, {
  toolbar: 'bold italic | myButton | undo redo',
  setup: (ed) => {
    ed.ui.registry.addIcon('my-icon', '<svg viewBox="0 0 24 24" stroke="currentColor">…</svg>');
    ed.ui.registry.addButton('myButton', {
      tooltip: 'My Custom Button',
      text: 'Click Me',        // text label on the button (plain text, not HTML)
      icon: 'my-icon',         // icon name (alternative to text; see Icons below)
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

### Icons

A custom button's `icon` can be:

| Value | Example | Drawn as |
|-------|---------|----------|
| The name of an icon registered with `ui.registry.addIcon(name, svg)` | `'my-icon'` | Inline SVG |
| The name of a built-in toolbar icon | `'link'` | Inline, like the built-in button |
| SVG markup | `'<svg …>…</svg>'` | Inline SVG |
| Anything else: an image URL | `'/icons/custom.png'` | An `<img>` |

Inline icons are drawn the same way as the built-in buttons' icons, so an SVG that uses `currentColor` takes the button's text color and follows the skin (light in the dark skins). An image URL keeps its own colors in every skin, because a browser can't apply the page's colors to an image, even an SVG one. Use a URL only for icons that should keep fixed colors, such as a full-color logo. A registered icon takes precedence over a built-in icon of the same name. `ui.registry.getIcon(name)` returns a registered icon's markup.

Icon markup, registered or given directly, is cleaned before it is drawn: only the `<svg>` and its drawing elements (shapes, paths, groups, text, gradients, clip paths, masks, markers, patterns and `<use>`) are kept. Script, event-handler attributes, links, animations, `<foreignObject>`, `<image>`, `<style>` and anything outside the `<svg>` are removed, and an `href` is kept only when it points inside the document (`#id`). An icon can't run script, whatever markup it is given.

A button's `text` is different: it is inserted as HTML without cleaning, so build it only from your own strings, never from user input.

## Theming

### Light and dark themes

Set `skin` to switch between light and dark chrome:

```ts
const editor = new HTMLEditor(container, {
  skin: 'oxide-dark', // dark toolbar and dialogs
  content_css: 'dark', // dark content area
});
```

### Menus and dialogs

The toolbar's dropdown and color menus, the table toolbar and right-click menu, and every dialog are added to `document.body` rather than inside the editor, so a container with `overflow: hidden` cannot clip them. Each one sits inside a wrapper carrying the editor's skin class (`md-editor-oxide-dark`, ...), with `display: contents` so the wrapper has no box of its own, and so takes the same skin as the editor. Two editors on one page with different skins each get menus and dialogs in their own skin.

To style them from your own CSS, scope the rule to the skin class just as the editor's own rules are, for example `.md-editor-oxide-dark .md-dialog`.

Using `EmojiPicker` or `CharacterMap` on their own, outside an editor's toolbar, pass the `skin` option to give the dialog that skin; it defaults to `oxide`.

### Confab skin

The `confab` and `confab-dark` skins integrate with the WorldClient theming system. They use CSS custom properties from the host application so the editor automatically adapts when the app theme changes.

The confab skins also replace the default text/emoji toolbar icons with clean SVG line icons for a more polished look.

```ts
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

```ts
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
- `.md-toolbar-buttons` / `.md-toolbar-expanded` — the container of every toolbar row, and the class it has while the More toggle is open
- `.md-toolbar-row-break` / `.md-toolbar-row-separator` — what a `||` renders: the row break, and the separator shown in its place where the toolbar is one line
- `.md-toolbar-btn` / `.md-toolbar-btn-active` — toolbar buttons; `.md-toolbar-btn-labelled` — a custom button with a `text` label, which is as wide as its label
- `.md-image-resize` / `.md-image-resizable` / `.md-image-resize-active` — wrapper around an image in the editor, the class it has when the image can be resized, and the class it has while being resized. Set `--md-image-resize-color` on it to change the outline and handle color
- `.md-image-resize-handle` — a resize handle (`data-handle` is `nw`, `n`, `ne`, `e`, `se`, `s`, `sw` or `w`)
- `.md-image-resize-size` — the size label shown while resizing
- `.md-image-styled` — an image wrapper that carries the image's float or margins
- `.md-image-dialog` — the image dialog (its parts were `.md-image-upload-*` before 1.20.0 and are `.md-image-dialog-*` now)
- `.md-table-menu`, `.md-table-submenu`, `.md-table-grid` — the table menu, its submenus and its size grid; `.md-context-menu` — the right-click menu
- `.md-table-toolbar` — the table context toolbar
- `.md-table-dialog` — the table dialogs
- `.selectedCell` — a cell in a cell selection; set `--md-table-selection-color` on the editor to change its highlight
- `.column-resize-handle` — the column border being dragged; set `--md-table-resize-color` to change its color

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

Clone the repo and install dependencies with `npm install`, then use:

```bash
npm run build        # production build → dist/ (ES, CJS, UMD, .d.ts, styles.css)
npm run build:dev    # development build (unminified, sourcemaps)
npm run dev          # rebuild on change (watch mode)
npm test             # run the Jest suite
npm run test:dist    # build, then smoke-test the built UMD bundle
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint src
```

### Demos

```bash
npm run demo         # live demo from TypeScript source (Vite dev server, HTTPS)
npm run demo:umd     # build, then serve the UMD/script-tag demo as static files
```

- **`npm run demo`** serves `test/index.html` through Vite's dev server, importing the editor
  directly from `src/`. Use this for day-to-day feature work — it hot-reloads and exercises the
  full toolbar. It runs over HTTPS (self-signed cert) so microphone-dependent features
  (Speech-to-Text, Dictation) work.
- **`npm run demo:umd`** runs a production build and then serves `test/umd.html` as raw static
  files (via `test/serve-umd.mjs`), loading the built `dist/index.umd.js` and `dist/styles.css`
  exactly the way a CDN / `<script>`-tag consumer would. Use this to verify the UMD bundle and
  the `MDHTMLEditor` global.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Published under the [LGPL-3.0-or-later](LICENSE) license.

Published by **MDaemon Technologies, Ltd.**  
Simple Secure Email  
[https://www.mdaemon.com](https://www.mdaemon.com)
