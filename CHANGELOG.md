# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.20.0] - 2026-11-17

### Added

- **`selectall` toolbar button** and the **`SelectAll` command**, as in TinyMCE: select the whole document, as Ctrl+A does, and focus the editor without scrolling it. The button is not in the default toolbars; add it to your `toolbar` string. It works in the basic editor too.
- **Translation key** `Select all`, translated in every locale. It is the `selectall` button's tooltip.
- **`print` toolbar button** and the **`mcePrint` command**, as in TinyMCE: print the content on its own, without the page around it, as `getContent()` returns it, so blank lines keep their height. It prints from a hidden frame in the page instead of a popup, so a popup blocker can't stop it, and the frame is sandboxed without scripts and carries the same Content Security Policy as Preview, so nothing in the content can run. The printed page takes the host page's title, or "Print" when it has none, and the editor's `directionality`. Printing leaves focus where it was. `mcePrint` also works in a read-only editor (the toolbar, the button included, is disabled there). The button is not in the default toolbars; with it in the toolbar, Ctrl+P in the editor (Cmd+P on macOS, where Ctrl+P moves the cursor) prints the content too, as in TinyMCE, instead of the whole page. The shortcut matches the P key on any keyboard layout, and leaves alone a key press the host page has already handled.
- **Translation key** `Print`, translated in every locale. It is the `print` button's tooltip.
- **`visualblocks` toolbar button** and the **`mceVisualBlocks` command**, as in TinyMCE: Show blocks turns on and off a dashed outline around each block, labeled with its tag (`P`, `DIV`, `H1` to `H6`, `BLOCKQUOTE`, `UL`, `OL`, `PRE` and `TABLE`), so you can see how the content is structured. It changes only how the editor shows the content: `getContent()` is the same with it on or off, and turning it on or off doesn't mark the editor dirty or move focus. Each label sits in a little room above its block's text, so it never covers the words. The button shows whether the mode is on (`aria-pressed`), and the mode stays on through `setLanguage()`. The command also works in a read-only editor. The button is not in the default toolbars.
- **`visualblocks_default_state` option** (TinyMCE's name) starts the editor with Show blocks on. It defaults to `false`.
- **`isVisualBlocksEnabled()` and `setVisualBlocks(on)`** read and set whether Show blocks is on.
- **`visualblocks` event**, TinyMCE's `VisualBlocks` event: fires with `{ state }` when Show blocks is turned on or off, and only on a change. A host can save the user's choice from it and pass it back as `visualblocks_default_state`. The `VisualBlocksEvent` and `VisualBlocksCallback` types are exported.
- **Translation key** `Show blocks`, translated in every locale. It is the `visualblocks` button's tooltip.
- **`formatpainter` toolbar button** and the **`mceToggleFormatPainter`, `mceRetrieveFormats` and `mcePaintFormats` commands**, as in TinyMCE's Format Painter: copy the inline formatting of one piece of text and paint it onto another. A click on the button copies the formatting at the selection and paints the next selection you make with the mouse; a double-click keeps painting every selection until you click the button again or press Escape. Clicking into a word paints the whole word, and clicking where there is no word paints what you type next. Painting replaces the target's own inline formatting with the source's, and is undone in one step. It copies bold, italic, underline, strikethrough, subscript, superscript, inline code, highlight, text color, font, size and style class. Links are neither copied nor removed (inline code, which can't share text with a link, isn't painted onto linked text), and block formatting (alignment, indent, line height) is left alone. A table cell selection is painted cell by cell; clicking an image or a right-click doesn't paint, and a drag released outside the editor still paints. A paragraph's own font is painted as a font on the text, and painting never wraps text in a span of the font it already shows. The button shows whether the painter is on (`aria-pressed`), and the editor shows a copy cursor while it is. `mceRetrieveFormats` copies without turning the painter on, and `mcePaintFormats` paints the copied formatting onto the selection, for hosts that bind their own keys. Nothing is painted in a read-only editor, and making the editor read-only turns the painter off. The button is not in the default toolbars.
- **`FormatPainter` extension** and **`isFormatPainterActive(state)`**, exported for hosts that build their own TipTap editor or toolbar.
- **Translation key** `Format painter`, translated in every locale. It is the `formatpainter` button's tooltip.
- **`media` toolbar button** and the **`mceMedia` command**, as in TinyMCE: the Insert video dialog takes a YouTube, Vimeo or Dailymotion link and inserts the video's thumbnail, linked to the video. An embedded player isn't inserted: the editor keeps no iframes, and mail clients remove them, while a linked image shows everywhere. Vimeo has no thumbnail at a fixed address, so a Vimeo video goes in as a plain link. The link and thumbnail are rebuilt from the video's id, which is strictly checked, so nothing else of the pasted text reaches the content. Links from the address bar, share buttons, Shorts, embeds and players are all read (a playlist embed, which is not one video, is not), and a YouTube start time and an unlisted Vimeo video's hash are kept. In a code block, which holds plain text only, the video goes in a line of its own after the block. The dialog is modal and gives focus back to the editor when it closes. The dialog says so, and stays open, for a link it can't insert. The insert is one undo step. The button isn't in the default toolbars, and isn't available in the basic editor, which has no images, or in a read-only editor; making the editor read-only closes the dialog.
- **`media_url_resolver` option** (TinyMCE's name, but not its signature: TinyMCE's gets `{ url }` for any link and returns an embed's `{ html }`, so a TinyMCE resolver has to be rewritten): a function the dialog asks about each video, with `{ provider, id, href, thumbnail }`, to supply the inserted `href`, `thumbnail` and `title`, for example through the host's own server so that readers' clients load no image from the video site. It may return a promise; `null`, a rejection or an error keeps the defaults. What it returns is checked: an `href` must be an http(s) link, and a `thumbnail` an http(s) or relative address without a backslash, or the default is used. The `title` becomes the image's alt text, or a plain link's text. Insert is disabled while it works, and an answer for a dialog closed in the meantime is ignored. The editor doesn't ask the video site about a video; the inserted thumbnail loads like any image. The `MediaVideo`, `MediaResolution` and `MediaUrlResolver` types are exported.
- **`pastetext` toolbar button**, the **`mceTogglePlainTextPaste` command** and the **`paste_as_text` option**, as in TinyMCE: while the mode is on, every paste (Ctrl/Cmd+V and the `paste` button) inserts the clipboard's plain text with none of its formatting, links or images. As in TinyMCE, each pair of line breaks starts a new paragraph, a single line break becomes a line break, and spaces at the start of a line or in a run are kept as non-breaking spaces; in a code block the text goes in as it is. The text takes the formatting at the caret or of the selection it replaces, as typed text would (without lengthening a link at its end), and fills every cell of a table cell selection. Nothing in the text is turned into formatting: Markdown such as `**bold**` or `` `code` ``, HTML and URLs stay literal (the editor's paste rules and autolinking don't run), and as in TinyMCE not even a URL pasted over selected text links it. A clipboard with HTML but no plain text gives the HTML's text, its paragraphs, line breaks, tabs and mentions kept, and HTML with no text (an image, a rule) inserts nothing. A copy with text beside a picture of itself (cells from a spreadsheet) is pasted as text, without uploading the picture; a copied image, which has no text, still uploads. TipTap's `paste` event gets the user's paste event, and each mode's event fires once the other mode is already off. It and paste-as-Markdown exclude each other: turning one on turns the other off, each firing its own event, and `paste_as_text` wins when both options are set. The button shows the mode (`aria-pressed`, and a tooltip that says on or off). It is not in the default toolbars.
- **`isPasteAsTextEnabled()` and `setPasteAsText(on)`**, and the **`pasteplaintexttoggle` event** with `{ state }` (TinyMCE's `PastePlainTextToggle`), fired on a change only, so a host can save the choice and pass it back as `paste_as_text`. The `PasteAsText` extension, `pastePlainText(view, text)` and `clipboardHtmlText(html, schema)` (for a host's own paste button), and the `PastePlainTextToggleEvent`/`PastePlainTextToggleCallback` types are exported.
- **Translation keys** `Paste as text`, `Paste as text: on` and `Paste as text: off`, translated in every locale.
- **`MediaDialog` and `parseVideoUrl(url)`** are exported, for hosts with their own toolbar or link handling.
- **Translation keys** `Insert video`, `Video URL`, `Paste a YouTube, Vimeo or Dailymotion link`, `This is not a YouTube, Vimeo or Dailymotion link` and `Video` (the thumbnail's default alt text), translated in every locale.
- Show blocks styles: the outline and label colors come from the `--md-visualblocks-color` and `--md-visualblocks-label-color` custom properties, which the `oxide-dark`, `confab` and `confab-dark` skins set to suit them.
- **`toolbar_expanded` option** starts the editor with the toolbar's More (`…`) toggle open, showing every row. It defaults to `false`.
- **`isToolbarExpanded()` and `setToolbarExpanded(expanded)`** read and set whether the More toggle is open.
- **`toolbarexpandedchange` event** fires with the new state when the More toggle is opened or closed, by the user or `setToolbarExpanded`, and only on a change. A host can save the user's choice from it and pass it back as `toolbar_expanded`. The `ToolbarExpandedChangeCallback` type is exported.
- The More toggle has `aria-expanded`, `aria-controls` (the buttons container, which now has an id) and an `aria-label`, so assistive technology hears what it is and whether it is open.
- **Image properties: the image dialog edits the selected image.** The `image` toolbar button, the **`mceImage` command** (TinyMCE's name) and a double-click on an image open the dialog. With an image selected it opens as Image properties, filled in from the image, and Save changes the image in place in one undo step, keeping the attributes the dialog doesn't show (an image map's `usemap`, say) and leaving the image selected. Otherwise it opens as Insert image. The image may not change underneath it: an image changed or moved while the dialog was open is left alone. The `image` button shows pressed while an image is selected. `mceImage` returns false, and a double-click opens nothing, in the basic editor and in a read-only editor; making the editor read-only closes the dialog. The dialog is modal, keeps Tab inside it, moves between its tabs with the arrow keys, Home and End, as the WAI-ARIA tabs pattern does, marks a field whose value can't be saved and holds Save until it is fixed or emptied, closes on Escape, saves on Enter in a text field (not while an input method is composing), gives focus back to the editor, and is built afresh each time it opens, so it is in the current language and follows the current options.
- **Image dialog General tab**: Source, Alt text, Title, Width and Height, Alignment and a preview. Source must be an http(s) or relative address (without a backslash, which some mail clients read as a network path) or a base64 `data:image` URI, with control characters removed first; a `data:image/svg+xml` one, base64 or URL-encoded, is cleaned as an uploaded SVG is and stored as base64. An image's own address is kept as it is when not changed, so an image with a `cid:` address can still be edited, and the preview doesn't call it invalid when it can't load it. An image's alt text is left alone unless changed, so an image with an empty alt stays decorative. Width and Height take pixels (`200`, `200px`) or a percentage (`50%`); anything else, zero included, is marked, and an unchanged value is kept as it is. **Constrain proportions** (a toggle, on at first) keeps the shape the image has (stretched or not), the picture's own once the preview has loaded it when no size is set, or the shape when the toggle was turned back on or Reset size was used, never a side it worked out itself; a percentage on one side clears the other. **Reset size** fills in the image's own size, or clears the size while it is unknown. **Alignment** (None, Left, Right) floats the image, as CKEditor 4's field does; `float: none` shows as None and is kept unless changed. The preview shows the image in sample text at its size and with its float, spacing and border, and says when the image doesn't load.
- **Image dialog Link tab**: a URL and Open link in... (current or new window) for a link around the image. A bare domain gets `http://`, as in the link dialog, and an address links don't allow (`javascript:`, `data:`) is marked and can't be saved. On a linked image the link is filled in, and changes or goes as a whole, as an `<a>` does, even when it holds text or other images too; its title, and a target the dialog doesn't offer (`_top`, say), are kept unless changed.
- **Image dialog Upload tab**: drop a file on it or browse for one, and it uploads straight away (TinyMCE's flow), shows its progress, then fills in Source and shows the General tab. It uses the editor's upload settings, as dropped and pasted images do. A refused or failed upload shows its message (worded by `images_upload_error_message` when set) and can be tried again; an upload that finishes after the dialog was closed or opened again is ignored, and an address the server returns that is not an image address is refused. Unlike TinyMCE's, the tab shows without `images_upload_url`, because an upload then embeds the image as a data URI.
- **Image dialog Advanced tab** (`image_advtab`): Style, Vertical space, Horizontal space, Border width, Border style, Text direction and Language, and Title when `image_title` is off (TinyMCE has no Title field then). Spacing is saved as margins and a bare number as pixels, as TinyMCE does; a border width with no border style draws a solid border, as CKEditor 4 does. The Style field and the other fields follow each other as you type. Everything goes through what an image may keep: a property the Style field holds that isn't allowed is dropped, and a spacing, border width or language an image can't keep is marked.
- **Image dialog options**, TinyMCE's names and defaults: `image_advtab` (false), `image_title` (false), `image_dimensions` (true), `image_description` (true), `image_uploadtab` (true) and `a11y_advanced_options` (false), which adds an **Image is decorative** checkbox that saves `alt=""` and turns the Alt text field off. An image whose `alt` is empty opens as decorative.
- **Images keep their float, spacing and border, text direction and language.** An image keeps a `style` limited to `float`, the four margins, `border-width`, `border-style` and `border-color`, each value checked on the way in and again on the way out, and `dir` (`ltr`, `rtl`) and `lang` (a language tag). The older `align`, `hspace`, `vspace` and `border` attributes are read into that style, and a pixel size written as style (`width: 200px`) into the `width` and `height` attributes when the image has none. In the editor, a resizable image (the default) shows its float and margins on its wrapper (with the `md-image-styled` class, which also keeps a percentage width relative to the editor) and its border on the image; with `object_resizing: false` the image carries its style itself.
- **`ImageDialog`, `imageSource(value)`, `ImageAttributes` and `IMAGE_STYLE_RULES`** are exported, with the `ImageDialogOptions` and `ImageUploader` types, for hosts with their own toolbar or TipTap editor.
- **Translation keys** `Image properties`, `Source`, `Image is decorative`, `Constrain proportions`, `Reset size`, `Horizontal space`, `Vertical space`, `Style`, `Text direction` and `Link`, translated in every locale.

### Changed

- **The image dialog has General, Link, Upload and Advanced tabs** in place of its Upload and URL tabs. Source on the General tab takes an address, and a file chosen or dropped on the Upload tab uploads at once instead of on Insert. Its classes are `md-image-dialog-*` instead of `md-image-upload-*`, so a host's style overrides for it need the new names.
- **An image inserted without alt text has no `alt` attribute.** It got `alt=""` before, which marks an image as decorative; Image is decorative (`a11y_advanced_options`) does that now.
- **A mention reads as `@Name` in plain text.** `getText()` and other plain-text output now include a mention as it shows (`@` and its display name); it was left out before.
- **`||` in a toolbar string starts a new row**, which the More toggle shows and hides, so the first row holds what you put before it whatever the editor's width. It was treated as `|` before. Where the toolbar is one line (narrow mode, which scrolls, and the table context toolbar) it still shows as a separator. Empty rows and a `||` at either end are ignored.
- **The source is linted with ESLint**, in CI and before publishing. `npm run lint` runs `eslint src` with `eslint.config.mjs`: promises nobody handles, HTML written into the page from anything but a constant or escaped text, `==`, stray `console.log` calls and a few other slips are errors. Unused code is still left to `tsc`. Contributors only; the published package is unchanged.

### Fixed

- **Cells pasted from a spreadsheet go in once.** A copy of spreadsheet cells carries a picture of the cells beside their table, and the editor pasted the table and then uploaded the picture too, so the cells showed twice: once as a table and once as an image. A pasted picture now uploads only when the clipboard has no text beside it; a copied image or a screenshot still uploads.
- **Cells pasted from Excel keep their formatting.** Excel puts most of a cell's formatting in class rules in a `<style>` block (`.xl65 { background: #92D050; font-weight: 700 }`), not on the cell, and the editor dropped the classes and the block, so a pasted table lost its fills, borders, alignment, fonts and colors. The rules are now written onto the cells first: a cell keeps its fill, borders and alignment, and its text its font, size, color, bold, italic, underline and strikethrough, including a run formatted differently within the cell (`<font class="font5">`). Excel's automatic color (`windowtext`) is black on a border and the editor's own color on text, and the sheet's defaults (black text, bottom alignment, no border) are not copied, only its font. Excel's own border styles (`hairline`, `dot-dash`, `dot-dot-dash`, `slant-dash-dot`), which CSS doesn't have, are drawn as the nearest CSS ones. Only a rule for a single element or class is read; other selectors, at-rules and nested blocks are skipped.
- **A cell keeps each side's border.** A cell's style can now hold `border-top-width`, `border-left-style` and the rest of each side's border, as Excel's cells need: it draws each gridline once, so most cells turn one or two sides off, and a cell whose sides differ lost all its borders. `mceTableApplyCellStyle` takes them too.
- **An image copied or dragged from a web page goes in once.** The browser puts the image on the clipboard, or in the drag, twice, as a file and as HTML holding an `<img>` that points at the page's copy, and the editor inserted that `<img>` and then uploaded the file as well. A pasted or dropped picture with no text beside it is now uploaded in place of the paste or drop, so only the upload goes in. When there is HTML, its text decides whether the picture comes with text, since a browser may put the image's address in the plain text. TipTap's `paste` and `drop` events still fire for such a paste or drop. If the upload is refused or fails, nothing goes in and `images_upload_error` is told, as for a pasted screenshot.
- **A read-only editor takes no pasted or dropped image.** Pasting or dropping an image into a read-only editor uploaded it and inserted it, and an upload still running when the editor was made read-only was inserted when it finished. Neither happens now; a dropped image is still kept from opening in the browser's window.
- **A custom toolbar button with a text label is as wide as its label.** Every button was a fixed square, so a label such as `💬 Words` wrapped onto two lines; a button with `text` (and no icon) now fits its label on one line, and has the `md-toolbar-btn-labelled` class.
- **The `image` button is left out of the basic editor**, which has no images; listed in its toolbar, it showed a dialog that could insert nothing.
- **Preview shows right-to-left content right to left.** With `directionality: 'rtl'`, paragraphs without a `dir` of their own showed left to right in the Preview window, because the direction is set on the editor rather than in the content. The preview document now carries it.
- **The More toggle keeps its state through a narrow width.** Going narrow closed it, so a toolbar the user had opened was closed again once the editor was wide.
- **Hidden toolbar buttons can't be reached with Tab.** While the More toggle is closed, the buttons on the rows it hides were clipped from view but still in the tab order, so focus could land on a button no one could see. They are now `inert` until the toggle opens; in narrow mode, where every button scrolls into view, they stay reachable. Closing the toggle with `setToolbarExpanded(false)` while a hidden button has focus moves focus to the toggle.
- **The More toggle shows only when there is more than one row.** It stayed visible after it was closed on a toolbar whose buttons all fit on one row, and an open toggle showed on a toolbar with nothing to hide. It now shows whenever, and only when, the buttons take more than one row.
- **The build no longer warns about the Vite config.** `vite build` warned that the config used ESM syntax in a file loaded as CommonJS, which Vite's coming native config loader won't support. The config is now `vite.config.mts`, an ES module, and builds with either loader. This affects only building the package from source; the published output is unchanged.
- **`npm run demo` serves over HTTPS again.** It serves `test/`, where Vite looked for its config and found none, so the self-signed certificate that speech-to-text and dictation need was never set up and the demo ran on plain HTTP. The script now names the config (`--config vite.config.mts`).
- **Labels the host supplies show as text, as in TinyMCE.** A custom button's `text`, the titles and descriptions of `templates`, the titles of `style_formats`, `table_border_widths` and `table_border_styles`, font names and the strings a `setTranslate()` function returns were written into the toolbar, its menus and the dialogs as HTML, so a title such as `Q&A <draft>` showed wrong and markup in one became part of the page. They are set as text now; the built-in icons are the only markup the toolbar writes. The speech-to-text transcript, which was already escaped, is built the same way.

## [1.19.0] - 2026-11-10

### Added

- **`skin` option** on `EmojiPicker` and `CharacterMap`, so a dialog opened outside an editor's toolbar can take a skin. It defaults to `oxide`; the toolbar passes the editor's own skin.
- **`ui.registry.addIcon(name, svg)`** and **`ui.registry.getIcon(name)`**, as in TinyMCE: register SVG markup under a name and use that name as a custom button's `icon`. A custom button's `icon` can also be the name of a built-in toolbar icon, such as `'link'`, or SVG markup given directly. Icon markup is cleaned before it is drawn: only SVG drawing elements are kept, without script, event handlers, links, animations or `<foreignObject>`, so an icon can't run script.

### Fixed

- **Menus and dialogs follow the editor's skin.** The toolbar's dropdown menus (Format, Styles, Font, Font size, Line height, Templates and the Table menu), its color menus, the table toolbar's own menus, and the Emoticons, Special character, Insert image, Find and replace and Speech to Text dialogs always showed the light styles, whatever the `skin`. They are added to `document.body`, outside the editor, and the skin rules only reach elements inside the skin class. Each now sits inside a `display: contents` wrapper carrying that class, as the link, anchor, source code and table dialogs and the right-click menu already did. In the `confab` skin this also gives the menus their confab borders, corners and shadow.
- **Dark styles for every dialog control.** In `oxide-dark`, the emoji search box, tabs and buttons, the character map's tabs, characters and preview, the find and replace fields, and the image dialog's tabs and fields kept their light colors; in `confab-dark`, so did the emoji search box and tabs, the character map's tabs and characters, the dialog header and its close button. Muted text such as field labels, a dropdown item's description, "No emoticons found" and the Speech to Text status line is lightened to stay readable in both dark skins.
- **Dialogs use the editor's font and sizing.** Like the menus, the dialogs now get the editor's font and its `box-sizing: border-box` baseline instead of the page's, so the emoji search box no longer runs past the dialog's edge.
- **Menu items on hover.** In the `oxide-dark`, `confab` and `confab-dark` skins, hovering a disabled item in a menu, such as Paste row before in the table menu with no row copied, gave it the hover background as if it could be chosen; it now stays plain. In `oxide-dark`, hovering the selected item of a dropdown, such as the current font size, no longer hides its highlight.
- **Custom button icons follow the skin.** A custom button's `icon` was always drawn as an `<img>`, so an SVG icon drawn with `currentColor` came out black in every skin, including the dark ones. An icon given by name or as SVG markup is now drawn inline, the same way as the built-in buttons' icons, so it takes the button's text color. Any other value is still used as an image URL, which keeps its own colors.
- **Anchor dialog layout.** The Insert anchor dialog had no styles of its own: its name field, error and buttons now match the link dialog, in every skin.

## [1.18.0] - 2026-10-28

### Added

- **`EMOJI_DATA`** is exported: an English name and search keywords for every emoji in `EMOJI_CATEGORIES`, keyed by the emoji. `EMOJI_CATEGORIES` itself is unchanged.
- **Emoji name tooltips.** Each emoji button in the picker shows the emoji's English name, such as "grinning face", as its tooltip, as the character map does for its characters. The emoji itself stays the button's accessible name.
- **Translation key** `No emoticons found`, translated in every locale. The emoji picker shows it when a search matches nothing.
- **`TabCharacter` extension** is exported: the TipTap node behind a typed tab, with an `insertTab` command.

### Fixed

- **Tab types a tab at the cursor.** With the cursor in a paragraph or heading, Tab added a left margin to the whole line, so the line moved as if the tab had gone in at its start, wherever the cursor was. It now types a tab at the cursor, written as `<span style="white-space: pre;">\t</span>` so it keeps its tab stops in exported HTML instead of collapsing to a space; `setContent()`, `insertContent()` and paste read that span, which other editors write too, back as a tab, keeping a font set on it; a span holding several tabs reads as that many tabs. Any other tab that reaches a line of text becomes a tab the same way, whether it is in text that keeps its whitespace (`white-space: pre-wrap`, as Google Docs writes), in pasted plain text, or in a code block turned into a paragraph; inside a code block a tab stays a plain tab in the code, and a line turned into a code block keeps its tabs that way. A line holding only a tab is not treated as blank, so it gets no filler `<br>`. With a selection, Tab still indents the selected paragraphs, and lists, code blocks and tables keep their own Tab. The Increase indent button and `execCommand('indent')` still indent the paragraph. With `table_tab_navigation: false`, Tab in a cell types a tab too.
- **Backspace removes a tab.** A tab is one character: one Backspace (or Shift+Backspace) or Delete removes it, and one undo takes it back. Backspace at the start of an indented paragraph or heading now removes one indent step, instead of joining the line to the one above with the indent left in place. An empty line is still removed in one press, and right after an input rule (such as `> ` making a quote) it still undoes the rule.
- **Emoji picker search.** Typing in the search box showed every emoji, whatever the query. It now shows only the emojis whose English name or keywords have a word starting with each word of the query, in any order (so "heart" finds ❤️ and 💔, "happy" finds 😀, "heart broken" finds 💔, and "up" finds ⬆️ but not the "cupid" in 💘), across all categories in category order. A word can start after a space, hyphen or other punctuation, so "eyes" finds "heart-eyes" and "1" finds "+1". Case and extra spaces are ignored. A pasted emoji finds itself, with or without its presentation selector or a skin tone. A query of only spaces shows the first category again, and a query that matches nothing says so. Opening the picker again starts with an empty search instead of the last one's results.

## [1.17.0] - 2026-10-27

### Added

- **`ImageMap` extension.** The TipTap node behind image maps is exported, along with the `ImageMapArea` and `ImageMapOptions` types. It also adds the `usemap` attribute to the `image` node.
- **Translation key** `Image map: hotspots work in the saved content, not while editing`, translated in every locale. It is the tooltip and accessible name of the image-map marker in the editor.
- **Table menu.** The `table` toolbar button now opens TinyMCE's table menu: Insert table (a 10×10 size grid, or the Insert table dialog with `table_grid: false`), Cell, Row and Column submenus, Table properties, Toggle caption and Delete table. Items that cannot apply are disabled, and toggles show whether they are on. The menu works with the keyboard: arrow keys move, Right and Left open and leave a submenu, Escape closes.
- **Row and column clipboard.** Cut, copy and paste whole rows (above or below) and columns (left or right) through the editor's own table clipboard, as in TinyMCE. A pasted row narrower than the table is padded with empty cells, and a wider one widens the table.
- **Header rows, header columns and cell types.** Toggle the current row or column between header cells and data cells, and make selected cells header cells, from the menu, toolbar buttons or commands.
- **Table, Row and Cell properties dialogs, and an Insert table dialog.** Table: width, height, cell spacing, cell padding, border width, caption, alignment. Row: row type, alignment, height. Cell: width (the column's), height, cell type, scope, horizontal and vertical alignment. Each has an Advanced tab for border style, border color and background color, and the cell's adds border width. Only changed fields are applied, so a dialog opened on several rows or cells that differ leaves the rest alone.
- **Table toolbar buttons**, under TinyMCE's names: `tableinsertdialog`, `tableprops`, `tabledelete`, `tablecellprops`, `tablerowprops`, `tablemergecells`, `tablesplitcells`, `tableinsertrowbefore`, `tableinsertrowafter`, `tabledeleterow`, `tableinsertcolbefore`, `tableinsertcolafter`, `tabledeletecol`, `tablecutrow`, `tablecopyrow`, `tablepasterowbefore`, `tablepasterowafter`, `tablecutcol`, `tablecopycol`, `tablepastecolbefore`, `tablepastecolafter`, `tablecaption`, `tablerowheader`, `tablecolheader`, the `tablecellvalign`, `tablecellborderwidth` and `tablecellborderstyle` menus, and the `tablecellbackgroundcolor` and `tablecellbordercolor` color pickers. They are disabled where they cannot apply, and have icons in every skin.
- **Table context toolbar** (`table_toolbar`). While the cursor is in a table, a toolbar floats above it with TinyMCE's default buttons (Table properties, Delete table, insert and delete rows and columns). `table_toolbar` sets its buttons as a toolbar string, and `false` turns it off. It is off by default in the basic editor, and hidden while the editor is read-only or does not have focus. Pressing its buttons keeps the cursor where it was.
- **Right-click table menu** (`contextmenu`). With `contextmenu: 'table'` (or `true`), a right-click in a table opens the table menu for the cell under the pointer, or for the selected cells when it is one of them. It is off by default, because it replaces the browser's menu and its spelling suggestions. Ctrl+right-click, and a right-click outside a table, still show the browser's menu. The `contextmenu` option was accepted before but did nothing.
- **Table commands.** `execCommand` runs TinyMCE's table commands: `mceInsertTable` (with `rows`, `columns` and `options.headerRows` / `options.headerColumns`), `mceInsertTableDialog`, `mceTableProps`, `mceTableRowProps`, `mceTableCellProps`, `mceTableInsertRowBefore` / `After`, `mceTableDeleteRow`, `mceTableInsertColBefore` / `After`, `mceTableDeleteCol`, `mceTableCutRow`, `mceTableCopyRow`, `mceTablePasteRowBefore` / `After`, `mceTableCutCol`, `mceTableCopyCol`, `mceTablePasteColBefore` / `After`, `mceTableMergeCells`, `mceTableSplitCells`, `mceTableDelete`, `mceTableToggleCaption`, `mceTableRowType`, `mceTableColType`, `mceTableCellType` and `mceTableApplyCellStyle`. A table command returns `false` when it did not apply: outside a table, in a read-only editor, or with nothing to do. `mceInsertTable` inserts at most 100 rows and 100 columns. `mceTableApplyCellStyle` takes camelCase names (`backgroundColor`) as TinyMCE does, and ignores properties a cell does not keep.
- **`queryCommandValue(command)`**, TinyMCE's method, for `mceTableRowType` (`'header'` or `'body'`), `mceTableColType` and `mceTableCellType` (`'th'` or `'td'`). It returns `''` outside a table and for other commands.
- **`isTableCommandEnabled(command, value?)`** tells whether a table command would apply at the selection, without running it, for custom table buttons.
- **`tablemodified`, `newrow` and `newcell` events**, TinyMCE's. `tablemodified` receives `{ table, structure, style }`; `newrow` and `newcell` receive `{ node }` for each row and cell a command created. They fire for the table menus, buttons, dialogs and commands, and for Tab adding a row in the last cell. A copy, a command that did nothing, dragging a column border and editing cell content fire none of them.
- **Table options**, under TinyMCE's names: `table_toolbar`, `table_grid`, `table_default_attributes` (default `{ border: '1' }`), `table_default_styles` (default `{ 'border-collapse': 'collapse', width: '100%' }`), `table_default_header_rows`, `table_default_header_cols` (both default 0), `table_tab_navigation`, `table_appearance_options`, `table_advtab`, `table_row_advtab`, `table_cell_advtab`, `table_border_widths`, `table_border_styles`, `table_background_color_map` and `table_border_color_map`.
- **Table exports.** The `StyledTable`, `StyledTableRow`, `StyledTableCell` and `StyledTableHeader` nodes, `StyledTableView`, the `TableCommands` extension and its query helpers, the `TableDialog`, `TableMenu`, `TableToolbar` and `ContextMenu` classes, `TABLE_ACTIONS`, `TABLE_BUTTON_NAMES`, `BORDER_STYLE_CHOICES`, `DEFAULT_TABLE_TOOLBAR`, the `TABLE_STYLE_RULES`, `ROW_STYLE_RULES` and `CELL_STYLE_RULES` allowlists, and their types, including `TableModifiedEvent`, `NewRowEvent` and `NewCellEvent`.
- **60 translation keys** for the table menu, buttons and dialogs (from `Cell` to `Hidden`), translated in every locale.
- **Table styles** for all four skins: the menu, submenus and size grid, the context toolbar, the dialogs, the cell selection highlight (`--md-table-selection-color`) and the column resize handle (`--md-table-resize-color`).

### Changed

- **A new table has borders in the saved HTML and no header row.** It is inserted with `border="1"` and `border-collapse: collapse; width: 100%`, TinyMCE's defaults, so its borders show in mail clients, which do not have the editor's stylesheet. It has no header row unless `table_default_header_rows` or `table_default_header_cols` asks for one; the table dropdown used to insert a 3×3 table with a header row.
- **Toggle header row acts on the row the cursor is in**, as TinyMCE's does, instead of always on the first row. Toggle header column likewise acts on the current column.
- **Deleting the last row or column deletes the table**, as in TinyMCE. Before, it did nothing.
- **Tab in a table.** With the new `table_tab_navigation: false`, Tab and Shift+Tab indent the paragraph in the cell instead of moving between cells. The default is unchanged.

### Fixed

- **Image maps are kept.** An `<img usemap="#name">` and the `<map name="name">` with its `<area>` hotspots were dropped when content was loaded, inserted, pasted or saved from the Source view, so `getContent()` returned the image with no map. They are now kept in the full editor. Each `<area>` keeps `shape`, `coords`, `href`, `alt`, `target`, `title` and `rel`, in that order, including an area nested inside other content of the map. A map written in the same line as its image stays there, and a line holding only a map is not treated as a blank line. Content a map holds besides its areas, such as text links repeating the hotspots, is kept just after the map. Values are checked when content is loaded and again when it is written out: an area `href` gets the same check as a link's, so `javascript:` and `data:` targets are dropped and the area kept; `target` must be `_blank`, `_self`, `_parent` or `_top`, and `_blank` gets `rel="noopener noreferrer"` added, as links do; `shape` must be one HTML defines; `coords` must be numbers; and `usemap` must be `#` followed by a name. A `<map>` with only an `id`, which browsers also match, keeps it as its `name`. A `<map>` with no usable `name` or `id` is dropped with its areas, as is an `<area>` outside a map. `id`, `class`, `style`, `data-*` and event attributes are not kept on either element. The editor's content is part of the host page rather than an iframe, and a map name is global to the page. So in the editor a map is shown as a small marker instead of a live map, and the image is shown without its `usemap`, so it can't pick up a map from elsewhere on the page. The hotspots work in the saved HTML, not while editing, as the marker's tooltip says. An image with a map has no resize handles, because a new size would move its hotspots off what they mark. The basic editor has no images, so it still drops maps.
- **Tables keep their formatting.** Loading, inserting, pasting or saving from the Source view dropped a table's `border`, `cellpadding` and `cellspacing`, its width, height, alignment, background and borders, its rows' and cells' backgrounds, borders, heights and vertical alignment, and its header cells' `scope`; only text alignment survived. They are now kept, with values checked: a table, row and cell each keep a short list of style properties, and `url()`, `calc()`, `var()`, negative lengths and CSS-wide keywords are dropped, as are `class`, `id`, `data-*` and every other property. The legacy `bgcolor`, `valign`, `width`, `height` and `align` attributes common in email are read into the same style. Cell shading and borders pasted from Word and Excel are kept too.
- **A table caption stays a caption.** A `<caption>` became an extra first row of the table. It is now kept as the table's caption, written as plain text, and shown above the table in the editor.
- **A cell selection is visible.** Selecting several cells (to merge them, say) showed nothing; the selected cells are now highlighted.
- **Column borders show they can be dragged.** The resize handle and cursor had no styles, so nothing showed that a column border could be dragged.
- **Column resizing works after read-only.** An editor created read-only and made editable with `setReadOnly(false)` could never resize columns.
- **Merging cells leaves no empty rows.** Merging whole rows left an empty `<tr></tr>` in the output for each row merged away, with a `rowspan` counting it. The empty rows are now removed and the `rowspan` shortened.

## [1.16.0] - 2026-10-23

### Added

- **Image resizing with drag handles.** Click an image in the full editor to select it, and eight handles appear on its corners and sides. Corners keep the aspect ratio (hold Shift to stretch freely); sides change only the width or only the height. A label shows the size while dragging, Escape puts the image back (without also reaching the page's own Escape handlers), and touch and pen work as well as the mouse; a second finger or pointer doesn't affect a drag in progress. An image can't go below 20px on either side or grow wider than the editor or table cell it sits in. The new size is saved in the image's `width` and `height` attributes, as TinyMCE does, as one undo step that also marks the editor dirty and fires `change`. A resize is its own undo step even when typing comes right before or after it, including typing that replaces the still-selected image. Handles are hidden in read-only mode.
- **`object_resizing` option** (TinyMCE name, default `true`). `false` turns image resizing off. A string is a CSS selector, as in TinyMCE: each image is matched against it, so `'img[alt]'` limits resizing to images with alt text and TinyMCE's own default list works. An invalid selector matches no image. In the editor each image sits in a wrapper element, so child (`td > img`) and sibling-position selectors don't match as they would in the saved HTML; descendant and attribute selectors do.
- **`resize_img_proportional` option** (TinyMCE name, default `true`). Set it to `false` and corners stretch freely, with Shift keeping the aspect ratio instead.
- **`objectresizestart` and `objectresized` events.** Both receive `{ target, width, height, handle }`: the starting size when a drag begins, and the new size when a resize is saved. `objectresized` is not fired for a cancelled drag or an unchanged size.
- **`ResizableImage` extension.** The TipTap extension behind image resizing is exported, along with `computeImageResize`, `isImageResizable`, `MIN_IMAGE_SIZE` and the `ResizableImageOptions`, `ImageResizeInput`, `ImageResizeHandle`, `ObjectResizeEvent` and `ObjectResizeCallback` types. It is TipTap's Image node with the same name, schema and HTML, so the output is unchanged.
- **Image resize styles** for all four skins. The handle and outline color comes from the `--md-image-resize-color` custom property; the confab skins use the host app's `--theme-primary`.
- **`quote_marker_class` option: marked quotes.** Names the class a host uses to mark the quoted original of a reply or forward, so the quote can be found again in `getContent()`. A `<blockquote>` or `<div>` whose class is exactly that value keeps it, written first (`<blockquote class="…"`), and its margin, padding and border: positive `px`, `pt` or `em` lengths, plain border styles, and hex, `rgb()` or named colors. The `<div>` form is not dissolved as a wrapper, the paragraphs directly inside a marked quote keep a font it carries, and nested quotes keep their own marker. Editing inside a marked quote works as in any blockquote: splitting one leaves both halves marked. Content loaded with `setContent()` or `insertContent()` is marked as written, but editing doesn't create a second marked quote: while the document holds a marked quote, a marked quote pasted in (or part of one copied and pasted elsewhere) becomes a plain blockquote, and so does part of a quote dragged out of it or a copy dragged from it. Cutting the quote and pasting it somewhere else, pasting it over itself, or dragging the whole quote to move it keeps the marker. Joining a marked quote with a plain blockquote right next to it (Backspace or Delete at their boundary) gives one quote that is marked only if the first of the two was. The editor's content is part of the host page rather than an iframe, so this is an exact-value allowlist: a class that only contains the marker is not kept, and every other `class`, `id`, `data-*` and `style` is still dropped. Off by default, and off for an empty value or one holding more than one class name.
- **`MarkedQuote` extension.** The editor's blockquote node with the marked-quote behavior (`markerClass` option, `MarkedQuoteOptions` type) is exported. With no `markerClass` it behaves as TipTap's Blockquote.

### Changed

- **Images are shown at their `width` and `height` attributes.** Previously the editor's `height: auto` style ignored an image's `height` attribute, so an image saved with a stretched size looked unstretched in the editor but stretched in a mail client. The editor now shows a resizable image at its stored size, and an image wider than the editor is scaled down to fit without being distorted. A resizable image sits in its line of text on the baseline, like any other image, with no margin of its own: the space below it is the line's, as in the saved HTML (a `<p>` line's margin, none for a `<div>` line). A percentage width stays relative to the editor. Images that can't be resized (`object_resizing: false`, or not matched by its selector) are shown exactly as before.
- **An image is always inside a line.** Images are now inline (see Fixed), so an `<img>` that is not already in a line of text (at the top level of imported HTML, or directly inside a table cell, list item, quote or the signature) is put in one: a `<p>`, or a `<div>` with `forced_root_block: 'div'`, carrying the block font like any other line. With `<p>` lines, such an image also gets the paragraph's margin in the saved HTML.

### Fixed

- **Linked images keep their link.** An image inside `<a href>` lost the link when it was loaded, pasted or inserted, and an image between words split its paragraph into three blocks. Images are now inline, as in TinyMCE and in mail HTML, so a link on an image survives, the Link dialog and `unlink` work on a selected image, and an image stays in its line of text. When the selection holds an image (or a mention or named anchor), the Link dialog's "Text to display" is disabled, as in TinyMCE, and the selection is relinked rather than replaced by text. `javascript:` and other rejected links are still dropped, keeping the image.

## [1.15.0] - 2026-10-22

### Added

- **`CustomTranslateFunction` type.** The type of the function `setTranslate()` accepts: `(key: string) => string | null | undefined`. Existing functions that always return a string still match it.
- **`sr-latn` locale (Serbian, Latin script).** `language: 'sr-latn'` gives the editor in Latin-script Serbian. It is the `sr` locale transliterated key for key, so the two always say the same thing; `sr` stays Cyrillic. Speech-to-Text and Dictation recognize Serbian (`sr-RS`) for it, as they do for `sr`.
- **`images_upload_error_message` option.** Words the message for a failed upload from the server's reply. It receives the parsed JSON body (`null` when the body is not JSON) and the HTTP status, and is called for a 2xx reply with no `location`/`url`/`link`, a reply that is not a JSON object, and an HTTP error status. It returns the message to show, or `null`/`undefined` for the editor's own translated message; a blank or non-string result, or a hook that throws (which also logs a console warning), falls back to that message too. It is not called for a network error, an aborted request or a successful upload. The message is shown as text in the image dialog, and passed to `images_upload_error` for a dropped or pasted image. This lets a server that refuses an upload with HTTP 200 and `{"error": "<code>"}` show its own reason instead of "No URL returned from server".
- **Translation keys** for the upload and file-read failures: `No URL returned from server`, `Invalid server response`, `Network error`, `Upload aborted`, `Invalid SVG file` and `Failed to read file`, translated in every locale.
- **Translation keys with a placeholder** for the two messages that include a number: `Upload failed: {status}` (an upload refused with an HTTP error status) and `Confidence: {percent}%` (the Speech-to-Text dialog's confidence reading). The translation decides where the number goes and how it is punctuated, so French reads `Confiance : 85 %`, Turkish `Güvenilirlik: %85` and Japanese `信頼度：85%`; each locale follows its language's usual percent format. A custom `setTranslate()` function that supplies these keys must keep the `{status}` or `{percent}` placeholder.

### Changed

- **The built-in locale is the fallback for a custom translate function.** Previously, once `setTranslate()` was called, the built-in locale was no longer used at all, so any string the custom function returned as `null`, `undefined` or `''` showed up empty (or as `null`/`undefined`) in toolbar titles and dialogs. The custom function is still tried first for every string, but when it returns `null`, `undefined` or an empty string, the built-in locale is used, and the key itself when that locale has no entry either. Like the custom function, the fallback locale is global: it is the `language` of the most recently created editor, or the code from the most recent `setLanguage()` call. A custom function now only needs to supply the strings it wants to change. Whitespace-only strings are still returned as they are. `getTranslate()` returns the combined function rather than the exact function passed to `setTranslate()`; passing it back to `setTranslate()` still restores the custom function that was active when it was obtained.
- **`setLanguage()` keeps a custom translate function.** It used to replace the function set with `setTranslate()` with the built-in locale, so custom strings were lost after a language change. It now changes only the fallback locale, and the custom function still takes priority. `resetTranslate()` removes the custom function as before.
- **Upload replies with a non-string URL, or a JSON number, boolean or array body.** The URL is now the first of `location`, `url` and `link` that is a non-empty string, so a `location` that is not a string no longer hides a usable `url` or `link`; when none of them is a string, the upload fails as "No URL returned from server". Such replies used to fail as "Invalid server response". A reply whose body is a JSON number, boolean or array now fails as "Invalid server response"; it used to fail as "No URL returned from server". Other replies fail as before.
- **The Find and Replace dialog's field labels no longer end in a colon.** The colon was added after the translated text, so it could not follow a language's own punctuation (French puts a space before it, Chinese and Japanese use a full-width colon). The labels now show only the translated `Find` and `Replace`, like the labels of the other dialogs.

### Deprecated

- **`Confidence` translation key.** The Speech-to-Text dialog now shows its confidence reading with `Confidence: {percent}%`. `Confidence` stays in every locale and in `TRANSLATION_KEYS`, but the editor no longer uses it.

### Fixed

- **Untranslated Link dialog, Save buttons and speech errors.** Nine strings showed in English in every language: the Link dialog's title and labels (`Insert/Edit Link`, `Text to display`, `Title`, `Open link in...`, `Current window`, `New window`), the Save button of the Link, Anchor and Source dialogs, and the Speech-to-Text messages `No microphone found` and `Network error - speech recognition requires internet`. They are now translated in every locale except English (UK).
- **Garbled text in the Speech-to-Text dialog and on Insert buttons.** In most locales, characters outside Western European text had been lost from the Speech-to-Text dialog's strings (title, Start, Stop, Clear, Language, Confidence, Listening..., and its unsupported-browser, no-speech and microphone-denied messages) and from the `Insert` button label. They showed as question marks or replacement characters, or with accents dropped (for example `?????` for the Russian Start button, or `dostepu` for `dostępu` in Polish). The strings are restored in every affected locale.
- **Upload and file-read failure messages are translated.** "No URL returned from server", "Invalid server response", "Upload failed: <status>", "Network error", "Upload aborted", "Invalid SVG file" and "Failed to read file" were always shown in English. They now use the editor's language (and a custom `setTranslate()` function).
- **The image dialog's Insert button works again after a failed upload.** It stayed disabled after the upload failed (a refused upload, a network error or an aborted request), so retrying meant picking the file again. It is now enabled again next to the error message. The failure of an upload started before the dialog was closed no longer shows in the reopened dialog.
- **Dropped and pasted image messages follow `setLanguage()`.** After a language change, the failure messages for a dropped or pasted image stayed in the language the editor had when the first such image was uploaded. They now use the current language.
- **Wrong or unnatural wording in 24 locales.** Strings that said the wrong thing, or not what software in that language normally says where the string appears, are reworded:
  - Turkish: Save said "keep/hide" (*Sakla*); it is now *Kaydet*. The table menu's insert-row and insert-column entries now say above/below and left/right.
  - Romanian: *Încărcare eșuată* (Upload failed) was misspelled.
  - Swedish: Upload failed is *Uppladdningen misslyckades*, the definite form Swedish uses for a message about one upload.
  - French: upload is now *Importer* (*Importation en cours...*, *Échec de l'importation*, *Importation annulée*); *Télécharger* reads as "download" in France. Canadian French keeps *Téléverser*.
  - German: the Find and Replace dialog's Previous and Next buttons are *Vorheriges* and *Nächstes* (not *Zurück*/*Weiter*), Listening... is *Hört zu...*, and Case sensitive is *Groß-/Kleinschreibung beachten*.
  - Greek: an HTML anchor is *άγκυρα* (it said *αγκύρωση*, "anchoring") in the five anchor strings.
  - Hungarian: the table menu's insert entries say above/below and left/right instead of an incomplete "in front of/behind"; *Mikrofon-hozzáférés* and *kép-URL* are hyphenated.
  - Vietnamese and Thai: Dictate is *Nhập bằng giọng nói* and *พิมพ์ด้วยเสียง* (voice typing); both had named a classroom dictation exercise. Vietnamese inserts rows above/below.
  - Italian: No speech detected is *Nessuna voce rilevata* (*discorso* is a speech or talk), and Dictate is *Detta*, the imperative form the other Italian buttons use.
  - Finnish: the toolbar's More button is *Näytä lisää*; *Lisää* is also Finnish for Insert.
  - Japanese: More is *その他*. Korean: the Link dialog's Title is *제목*.
  - Danish, Slovenian and Indonesian: Confidence is *Pålidelighed*, *Zanesljivost* and *Tingkat keyakinan* (each had said "trust"). Russian: Confidence is *Достоверность* (it said *Точность*, "accuracy").
  - Serbian (both scripts): Browse... is *Прегледај...*/*Pregledaj...* (it said "Search"), the image drop zone's text matches it, and Network error is *Мрежна грешка*/*Mrežna greška*.
  - Catalan: Cut is *Retallar*, Open link in... uses the infinitive like the rest of the locale, and the image drop zone uses the same formal address as the other Catalan messages.
  - Spanish and Romanian: the Enter URL prompts use the same informal address as the image drop zone. Portuguese: URL is feminine throughout (*a URL*, *URL de imagem inválida*), as Brazilian Portuguese uses it.
  - Russian: *запрещён* is written with ё, like the rest of the locale.
  - Chinese (Simplified and Traditional) and Japanese: no space between Chinese or Japanese text and a Latin word (*无效的SVG文件*), matching the rest of each locale, and the Enter URL prompts say *URL* like the image dialog instead of *链接*/*網址*.

## [1.14.0] - 2026-10-21

### Added

- **`CodeSample` extension.** The TipTap extension behind the Code sample fix below is exported alongside the other extensions. It adds the `toggleCodeSample()` command and binds Ctrl+Alt+C (Cmd+Option+C on macOS) to it.

### Changed

- **Upgraded TipTap from 3.31.3 to 3.32.0.** All 21 `@tiptap/*` dependencies were bumped together. TipTap's Link extension now ends a link at whitespace typed at the link's end, which on its own would keep only the first word of a retyped link's text (for example a template's placeholder link) linked, and leave words typed after a space at the end of a link outside it. The editor keeps its documented behavior instead: put the caret at the end of a link and type, spaces included, and the link extends; select link text and retype it, and the whole new text stays linked with its title and target. Typed URLs are still autolinked, and text typed after a paste or a link inserted from the Link dialog is still kept out of the link.

### Fixed

- **Code sample starts on the cursor's line.** A line break inside a paragraph (Shift+Enter, or content loaded with `<br>` between lines, as in email and signatures) looks like a new line, but the lines on either side are still one paragraph, and turning **Code sample** on converted all of it, so the lines typed before the cursor went into the code block too. The `codesample` toolbar button and Ctrl+Alt+C now convert only the lines the selection touches: the paragraph is split at the line breaks around them, the lines before and after stay text with their formatting (font, alignment, indent), and a selection across several lines becomes one code block (a selection that starts at the very end of a line, or ends at the very start of one, leaves that line out). Empty lines just above the code block become empty paragraphs, so they still show once the content is sent. One undo reverts it. Turning a code block back into text, a selection across several blocks, and a paragraph without line breaks behave as before, and so does the first line of a list item, which still removes the list.

## [1.13.1] - 2026-09-29

### Fixed

- **Text typed after a pasted or inserted link is no longer added to the link.** Pasting a URL or email address linked it, but everything typed straight afterwards, spaces included, was added to that link until Enter started a new block. The same happened after pasting HTML that ends in a link, after pasting a Markdown link with Paste Markdown on, after `insertContent()` (and so a Templates entry) ending in a link, and after inserting a link from the Link dialog with nothing selected. The link mark is inclusive (TipTap ties that to autolink), so it extends to text typed at its right edge, and each of these leaves the caret exactly there. After them, the caret is now moved out of the link, so the next text is plain. The link itself is untouched and the Link dialog still edits it (see below); the Link toolbar button shows inactive at that caret, the way Bold does when the next keystroke will not be bold. Everything else about typing at a link is deliberately unchanged: putting the caret at the end of a link and typing still extends it, as in the browser's own editing and TinyMCE, and retyping selected link text (for example a template's placeholder link) keeps the link with its title and target.
- **Pasting a URL after Ctrl+A now replaces the content.** Pasting a URL or email address over a selection turned the selected text into a link and discarded the pasted text, whatever the selection was, so pressing Ctrl+A and pasting a URL linked the whole document instead of replacing it. A pasted URL now links the selection only when the selection lies inside one paragraph (selected text, or a selected inline item such as a mention). Over a larger selection (Ctrl+A, several paragraphs, a table cell selection) it replaces the selection like any other paste, and a URL copied from outside the editor is linked. Pasting anything other than a single URL was never affected.
- **Clicking a link in the editor no longer opens it.** StarterKit v3 bundles its own Link extension, which ran beside the configured one with TipTap's defaults, so its click handler opened links in a new window despite `openOnClick: false`, and its paste handler linked selections as above. StarterKit's copy is now disabled, which also removes `link` from the "Duplicate extension names" warning logged when an editor is created.
- **The Link dialog edits the link under the caret instead of inserting a second one.** With the caret on a link and nothing selected (where clicking a link, or pasting one, leaves it), the dialog pre-filled the URL but left the text field empty, and Save inserted a new linked copy of the URL beside the original instead of changing it. The dialog now pre-fills the link's text too, and Save updates that link's URL, text, title and target in place.

## [1.13.0] - 2026-09-22

### Added

- **Paste Markdown as formatting.** Chat apps, AI assistants and README files hand out Markdown, which until now pasted in as the raw `#`, `*` and `|` characters. A new mode reads a paste as Markdown and inserts it as real formatting: headings, bold, italic, strikethrough, inline code, links, images, bullet/ordered/nested lists, blockquotes, horizontal rules, fenced code blocks with their language, and GFM tables. It is **off by default** and stays on until turned off, the way TinyMCE's *Paste as text* does, because pasting Markdown is a thing people do in bursts rather than always. Turn it on with the new `pastemarkdown` toolbar button, the `paste_markdown: true` config, `editor.setPasteMarkdown(true)` or `editor.execCommand('mceTogglePasteMarkdown')`; read it back with `editor.isPasteMarkdownEnabled()`. The button is deliberately **not** in the default toolbars, so no existing toolbar changes — add `pastemarkdown` to a `toolbar` string to offer it. While the mode is on the button carries the active background, a dot badge and `aria-pressed="true"`, since a mode left on by mistake quietly changes every paste. Its icon is the Markdown mark's M and down arrow drawn edge to edge — the mark's own rounded frame is left off, because at a 16px button size the frame squeezed the glyph into a few unreadable pixels. The toolbar's `paste` button follows the mode as well.
- **`pastemarkdownchange` event**, fired with the new boolean whenever the mode changes (and only when it actually changes), so a host can remember the user's choice and pass it back as `paste_markdown`. The mode is per editor instance and is not persisted by the editor itself.
- Two decisions worth stating, because they differ from a strict Markdown reading. **A single newline is a line break**, not a continuation of the same paragraph: chat and assistant output is written that way, and the alternative silently joins lines. A blank line still starts a new paragraph. **Task lists paste as plain bullets** — `- [ ] item` becomes a bullet reading `item` — because the editor has no checkbox node to put there.
- Markdown mode takes precedence over the built-in code-block paste. VS Code and editors that copy the way it does mark the clipboard as code, which the editor otherwise pastes as a syntax-highlighted code block — so copying Markdown out of an editor, the most likely place to have Markdown in the first place, would have ignored the mode entirely. While the mode is on it converts instead; with the mode off the code-block behaviour is unchanged. A URL pasted over a selection still becomes a link either way.
- While the mode is on, the clipboard's `text/html` is ignored and its `text/plain` is used. Editors, code viewers and web pages put syntax-highlighted HTML on the clipboard beside the raw text, and converting that would paste coloured code instead of formatting. Pastes that carry files (images) are untouched, Markdown pasted inside a code block stays literal, a URL pasted over a selection still becomes a link, and drag-and-drop is never converted.
- `marked` (MIT, pinned to `18.0.14`) is now a dependency. As with the rest of the stack it is bundled into the published output, which grows by roughly 45 KB unminified (about 10 KB gzipped); the UMD bundle is now about 900 KB raw / 256 KB gzipped. It is pinned rather than carets-ranged because it parses untrusted input and the converter depends on specific renderer and lexer internals — upgrade it deliberately, re-running the security and size-guard tests.
- New public exports: `PasteMarkdown`, `pasteMarkdownText`, `PasteMarkdownOptions` and `PasteMarkdownChangeCallback`. There is deliberately no public "Markdown to HTML string" helper — see Security below.
- Three new UI strings (`Paste Markdown`, `Paste Markdown: on`, `Paste Markdown: off`) translated across all 31 bundled locales.

### Security

- **Pasted Markdown cannot run script.** Three independent layers, in order: raw HTML inside the Markdown is escaped to visible text, so `<img onerror=…>` pastes as characters rather than an element (this also stops a paste forging the editor's own mention, signature and anchor elements); the converted HTML is parsed and sanitized in an inert document and handed to ProseMirror as nodes, never as a string re-parsed in the live page; and the schema then keeps only the attributes it knows. The middle layer is the one that matters most: sanitizing HTML, serializing it and parsing it again in the live document is exactly how a mutation-XSS payload (`<math><mtext><table><mglyph><style><img onerror=…>`) recovers its handler, which was confirmed in Chromium against the pre-fix shape and is now covered by tests. Links are limited to the schemes TipTap allows, so `javascript:` targets — including tab- and control-character-disguised forms — lose the link and keep their text.
- **The shared paste sanitizer is hardened**, which also benefits Word/Excel paste. It now removes `style`, `link`, `meta`, `base`, `noscript`, `template`, `svg`, `math`, `frame` and `frameset` (elements whose content is parsed differently from ordinary markup, which is what mutation payloads are built from) on top of the scripting and form elements it already removed; checks every URL-bearing attribute (`formaction`, `xlink:href`, `poster`, `background`, `data`, `cite`, `srcset`, `ping`) rather than only `href`/`src`/`action`; and strips ASCII whitespace and C0/C1 control characters before testing a URL, so `java&#9;script:` is caught the way the browser would resolve it. `data:image/...` is still allowed on `src`, so pasted and embedded images keep working, and is now rejected on `href`.
- **A crafted paste can no longer freeze the tab.** marked's inline tokenizer backtracks over unmatched emphasis, so cost follows the shape of the Markdown rather than its size: 220 KB of ordinary prose parses in about 15 ms, while 43 KB of `*a **a ` repeated takes six seconds and a few MB of nested lists exhausts the heap. Since any page can put whatever it likes on the clipboard, that was reachable from outside, and no size limit separates the two cases. Conversion is therefore run on a budget rather than guessed at: the parse is split into its block pass and its inline pass, the inline runs are tokenized one at a time, and the whole thing is abandoned after 750 ms (or immediately if the input exceeds 256 KB, or any single paragraph, heading, list item or table cell exceeds 5,000 characters). Deeply nested input that overflows the parser's stack is caught rather than thrown — an escaping error would have let the browser's own paste handling write raw clipboard HTML into the editor. An abandoned conversion is not a lost paste: the text goes in as an ordinary paste instead. The trade-off is that a genuine paragraph over 5,000 characters, or a document that genuinely needs more than 750 ms, pastes unconverted.
- **Large unlabelled code blocks paste as plain text.** A fenced block with no language (or any indented block) would otherwise be run through every syntax grammar to guess one, costing seconds on a large block and repeating that on each keystroke inside it. Over 10,000 characters the block is marked `language-plaintext` instead. Blocks with a stated language are unaffected.

### Changed

- The paste sanitizer moved from `PasteFromOffice` into a shared `sanitizeDocument` used by both paste paths. Two of the hardening changes also apply to Word/Excel paste and are worth knowing about: an `<svg>` or `<math>` element (a drawing or an equation) is now dropped rather than passed to the schema, which discarded it anyway, and a `data:` URL is rejected on attributes other than `src` — so `srcset="data:image/…"` no longer survives while `src="data:image/…"` still does.
- The toolbar's `paste` button now reads the clipboard's plain text even when HTML is present (it needs it for Markdown mode), and while the mode is on, text it cannot convert (in a code block, or over the size limits) goes in through ProseMirror's own plain-text paste rather than `insertContent`, which treats a string as HTML — so that text stays literal and multi-line text becomes separate lines instead of one run-on paragraph. With the mode off the button behaves exactly as before.

## [1.12.5] - 2026-09-22

### Security

- **The Preview window now carries a Content Security Policy that blocks script.** `preview` opens a blank window and writes `getContent()` into it with `document.write`, and that window inherits the host page's origin — so anything script-like that ever reached the written HTML would run with the host application's privileges, including access back through `window.opener`. Nothing the editor's schema renders can do that: `script` elements, `on*` handlers and raw-text/foreign elements are all dropped on the way in. But Preview is the one place where editor content is re-parsed as HTML in a live, same-origin document, and that should not depend on the schema staying airtight. This is defense in depth, not a fix for a reachable hole.
- The written `<head>` now opens with `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob: cid:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`. It is the first element because a meta policy does not apply to markup parsed before it, and is ignored altogether if it ends up in the body. Verified in Chromium: with the meta, an inline `<script>`, an `<img onerror>` and a `javascript:` URL in the previewed markup all stay inert; with it removed, the script and the handler both run.
- `default-src 'none'` covers script, inline event handlers, `javascript:` URLs and eval, along with frames, media, fonts and network requests, none of which the schema can emit. The exceptions are what a preview genuinely needs. Images keep working from every source the editor produces — `*` does not extend to non-network schemes, so `data:` (base64 and pasted images), `blob:` and `cid:` (an email template's inline attachments) are listed explicitly — and `style-src 'unsafe-inline'` keeps both the preview's own `<style>` block and the inline `style` attributes the editor writes for font, color, alignment, indent and direction. `base-uri` and `form-action` are not covered by `default-src`, so they are stated to close the `<base>`-hijack and form-submission paths.
- Nothing else about Preview changed: the same `getContent()` output, title and stylesheet are written, so previewed content renders exactly as before.

## [1.12.3] - 2026-09-10

### Fixed

- **A link with an empty `href` is no longer deleted on import.** `<a href="">` — the shape a stored email template carries when the author wrote the link text and left the target for later, or when an upstream sanitizer blanked it — arrived as plain text: the anchor element was discarded and only its words survived. TipTap's link parse rule opens with `if (!href || !isAllowedUri(href)) return false`, so an empty string short-circuits to "not a link" before URI validation is ever consulted. A real template with nine such anchors lost all nine, while CKEditor in the legacy LookOut theme keeps them. The parse rule now accepts the empty-string case, which is also the shape TipTap itself *emits* — its `renderHTML` rewrites a URI it rejects to `href=""`, so declining to read back what it writes was the inconsistency. Nothing else about link handling changed: an absent `href` still fails (that is a named anchor, see the `anchor` button), and every non-empty href is still put through `isAllowedUri`, so `javascript:` and `data:` targets are rejected exactly as before.
- **Container `<div>`s no longer import as a run of blank lines.** Mail clients and CMSes wrap stored HTML in several nested `<div>`s around the real content. The editor's schema has one block node per line and its content expression is `inline*`, so a block cannot contain a block: the ProseMirror parser opened a paragraph for each wrapper, immediately closed it again to place the first block child, and left the wrapper behind as an empty paragraph. A template swaddled in five `<div>`s therefore opened with four blank lines that were never in the source. Import now dissolves a `<div>`/`<p>` that holds only block-level children and no text of its own, hoisting its children into the parent. Nothing is lost that was not already lost — the nesting is destroyed by the schema either way — and the invented blank line is not.
- **A wrapper's font now reaches the lines it wrapped.** Following from the above: a body wrapped in one `<div style="font-family:Georgia;font-size:10pt">` (the shape LookOut produces) stranded that style on the empty block the wrapper became, and every real line silently fell back to the editor's default font — the "11pt where the source says 10pt" drift seen on imported templates. The inherited properties (`font-family`, `font-size`, `font-weight`, `font-style`, `color`, `line-height`, `text-align`, `text-indent`, `direction`) are now carried down to the children instead, never overriding one a child already states. Box properties are not: border, background, padding and margin describe the wrapper itself and cannot be re-expressed on *n* children.
- Blocks that own their nesting are exempt from the flattening above and keep their structure: `<blockquote>`, list items and table cells are real nodes with block content, the signature container (`<div id="signature">`) is left intact for `SignatureBlock` to claim, and a genuinely empty `<div></div>` is a blank line the author typed rather than a wrapper. `<pre>`/code blocks are untouched.

## [1.12.2] - 2026-09-08

### Fixed

- **A pretty-printed template no longer imports with extra bullets and stray blank blocks.** Stored email templates are usually kept as authored — indented, one block per line — so real newlines and tabs sit between the block elements, including as direct children of `<ul>`. `insertContent()` (the path the Templates dropdown uses) preserved that whitespace, and since ProseMirror cannot place a bare text node inside `bullet_list` (its content expression is `list_item+`), it wrapped each whitespace run in a list item of its own: a 2-bullet list arrived as **4** bullets, each inter-block newline run became an empty `<div>`, and the surviving tabs rendered as visible breaks on the `white-space: pre-wrap` editing surface. Both `setContent()` and `insertContent()` now parse with `preserveWhitespace: false`, ProseMirror's collapse-per-HTML-rules mode — the same result a browser or CKEditor produces. The two commands previously disagreed because TipTap's `insertContentAt` hard-defaults to `preserveWhitespace: 'full'` while `setContent` takes a collapsing branch; stating the option on both also pins the behavior against future TipTap changes. Content that declares its own whitespace handling is unaffected: a `<pre>`/code block keeps its indentation (CodeBlock's parse rule sets `preserveWhitespace: 'full'` per-node, which outranks the document-level setting), and Ctrl+V still goes through ProseMirror's separate clipboard parser.
- **A block containing only `&nbsp;` is no longer treated as an empty line.** `format_empty_lines` appends a `<br>` to blank blocks so they keep their height outside the editor, but its emptiness test was built on `String.prototype.trim()` — which strips U+00A0, the non-breaking space. A deliberate `<div>&nbsp;</div>` spacer therefore exported as `<div>&nbsp;<br></div>` and rendered at double height in the sent message. Both the serializer and its import-time inverse now measure emptiness against ASCII whitespace only (deliberately not `\s`, which also matches U+00A0), so an `&nbsp;` counts as the visible content it is. Fixing the two passes together matters: had only the serializer changed, the importer would have kept judging such a block empty and stripped the `<br>` from `<div>&nbsp;<br></div>` — a real Shift+Enter — losing a line break on every round-trip.

## [1.12.1] - 2026-09-04

### Changed

- **Upgraded TipTap from 3.27.4 to 3.31.3.** All 21 `@tiptap/*` dependencies (`core`, `pm`, `starter-kit` and the 18 individual extensions) were bumped together, so the whole ProseMirror stack resolves to a single 3.31.3 version and no duplicate copies end up in the bundle. This is a patch-level move inside TipTap 3.x: no public API, config, or runtime behavior changes on this package's surface, and the TinyMCE-compatible facade is untouched. The full Jest suite (807 tests), `tsc --noEmit`, the production build, and the built-UMD smoke tests all pass against the new versions.
- The `npm run update:tiptap` helper script already covers every one of these packages, so a future bump stays a one-command operation.

## [1.12.0] - 2026-08-31

### Added

- **Ordered lists keep their numbering style.** `<ol type="A">`, `type="a"`, `type="I"`, `type="i"` and `start="N"` now round-trip through `setContent()` / `getContent()` *and render as written* in the editor. They were already preserved in the model, but `.md-editor-body ol { list-style-type: decimal }` overrode them on screen — an HTML `type` attribute is only a presentational hint, which any author CSS outranks — so every lettered or roman list displayed as 1, 2, 3. The nesting defaults are now scoped with `:not([type])` and each `type` value has an explicit rule of its own, so a host-app CSS reset cannot strip the markers off a typed list either. A list that states its style in CSS (`<ol style="list-style-type:upper-alpha">`) is read the same way and exported as `<ol type="A">`.
- **Increase/Decrease indent work inside lists.** The toolbar buttons, `execCommand('indent' | 'outdent')` and Tab / Shift+Tab now share one context-aware pair of commands (`indentSelection` / `outdentSelection`), so the three can no longer disagree. In a list, indent nests the item where it can and otherwise adds a `margin-left`; outdent takes that margin back first and then un-nests. The margin is written to the `<li>` rather than the paragraph inside it, so the bullet or number moves with the text, and it survives in exported HTML without the editor's stylesheet.

### Fixed

- **Pasting a numbered list no longer indents it an extra level.** Word and Outlook email HTML often contains a genuine `<ol>` whose `<li>`s *also* carry Word's `MsoListParagraph` class and `mso-list` metadata. The Word-list converter treated those items as fake-list paragraphs and built a second list around them, producing `<ol><ol>…</ol></ol>` — which imported as a phantom empty item plus a list one level too deep. Such items are now cleaned in place instead.
- **Pasted lists no longer carry the source document's indentation.** Word writes `margin-left:.5in;text-indent:-.25in` on every list paragraph and Google Docs writes `padding-inline-start:48px` on the list; stacked on top of the editor's own list indent, a pasted list sat further right than one built with the toolbar. A new `ListPasteNormalizer` extension strips inline left-indentation from pasted `<ol>`/`<ul>`/`<li>` — nesting is structural, so nothing is lost — for every paste, not just Office content. Indentation on pasted paragraphs and blockquotes is untouched.
- **Pasting a lettered list from Word no longer renumbers it.** The converter reduced Word's `mso-level-number-format` to a single ordered/unordered boolean, discarding `alpha-upper`, `alpha-lower`, `roman-upper` and `roman-lower`. It now maps them to the list's `type`, and reads `mso-level-start-at` into `start`.
- **A Word list pasted without `@list` rules is no longer turned into a bullet list.** Many clipboards carry no `@list` block at all, and the missing rule defaulted to unordered. The numbering is now inferred from the marker text Word inlines in its `mso-list:Ignore` spans (`1.`, `A.`, `iv.`, `·`), including the starting number; an explicit `@list` rule still wins.
- Decrease indent was a silent no-op on the first item of a list (it only tried `liftListItem`, with no fallback), as was Increase indent (`sinkListItem` only) — the Tab key already had the fallback the buttons lacked.
- `indentBlock` could apply two steps for one press once list items became indentable, by indenting both a node and its descendants; it now adjusts only the outermost indentable node in each branch.

## [1.11.1] - 2026-08-17

### Fixed

- Replaced the confab skin's `blockquote` toolbar icon. The old icon drew two closing curly quotation marks whose tails made it read as "99"; it is now a quote bar beside indented text lines, matching the other line-based icons in the set.

## [1.11.0] - 2026-08-12

### Added

- **The text color and highlight color pickers now have separate palettes, and the text palette is built for readable text.** Both pickers previously shared one 26-swatch list chosen for highlighting: a grayscale ramp, the fully-saturated hues, and eight pale tints. Roughly half of it was unusable as a font color — `#FFFF00`, `#00FF00`, `#00FFFF`, `#FF00FF` and every pastel are illegible as text on a white background, and there were no dark shades at all.
  - **`forecolor` (text)** now offers 40 colors in four rows of ten, aligned by hue column: the grayscale ramp, the saturated hues, and two rows of progressively darker shades (`#CC0000`, `#38761D`, `#1155CC`, `#351C75`, `#741B47`, …). The hue columns are red berry, red, orange, yellow, green, cyan, cornflower blue, blue, purple, magenta.
  - **`backcolor` (highlight)** keeps the original 26 colors unchanged — the pale tints are exactly what makes a good marker.
- **Both palettes are now configurable, with TinyMCE-compatible keys.** `color_map_foreground` and `color_map_background` set one picker each; `color_map` sets both and is overridden by either specific key. All three accept TinyMCE's flat form (`['#FF0000', 'Red', ...]`) or an array of `ColorOption` objects. Omitting them keeps the per-picker built-in defaults.
- **Added a `Remove color` entry to both pickers.** Color could previously only be cleared with `removeformat`, which strips *every* mark on the selection — clearing a font color also lost its bold, italic, and font size. The new entry calls `unsetColor` / `unsetHighlight`, so only the color goes. `execCommand` gained the matching behavior: passing `''` or `'none'` as the value to `forecolor`, `backcolor`, or `hilitecolor` clears instead of setting.

### Fixed

- The `forecolor`/`backcolor` menus are portaled to `document.body` and carried nothing to identify which picker they belonged to; they now carry a `data-colorpicker-menu` attribute.
- Removed a duplicated `padding` declaration on `.md-toolbar-colorpicker-menu`.
- `README.md` claimed both pickers offered 28 preset colors; the actual count was 26 for both.

## [1.10.1] - 2026-07-24

### Fixed

- **The `change` event now emits exactly what `getContent()` returns, and every content path shares the same `format_empty_lines` pair.** The blank-line handling added in 1.9.1/1.9.3 lived only in `getContent()` (serialize: fill each empty block with a `<br>`) and `setContent()` (parse: strip it back out). Every other way HTML crossed the editor boundary went straight to the TipTap instance and skipped both halves, so the two directions disagreed depending on which door the content used:
  - **`change` payload** — the event fired the engine's raw `getHTML()`. A host that saved the payload (the common pattern for autosave/draft sync) stored content whose blank lines had *no* `<br>` and therefore collapsed to zero height in mail clients, while the same host calling `getContent()` got the corrected HTML. The payload is now the serialized output, so the two are byte-identical.
  - **`insertContent()`** — applied the `<\/` tag-slash repair but not the blank-line strip, so inserting a fragment previously produced by `getContent()` (a template, a saved snippet) handed the export-only `<br>` to TipTap as a `hardBreak` and grew each blank line into two.
  - **Templates dropdown** — inserted through the TipTap chain directly rather than `insertContent()`, so it inherited neither pass on its own.
  - **Source dialog** — showed raw `getHTML()` and saved through the raw TipTap `setContent`, so opening it and pressing Save without editing anything was not a no-op: the displayed HTML and the editor's real output differed, and the round-trip could double blank lines.
  - **Preview** — rendered raw `getHTML()` in the new window, which is precisely the out-of-editor rendering context `format_empty_lines` exists for, so previewed blank lines collapsed while the sent content kept them.

  The two passes are now a single pair of private helpers on `HTMLEditor` (`formatOutput` / `formatInput`) that all of these route through, so the directions cannot drift apart again. `format_empty_lines: false` still opts out of both halves on every path.

## [1.10.0] - 2026-07-20

### Added

- **`Tab` / `Shift+Tab` are now always handled, so the key never escapes the editor and moves focus to the next element on the page (CKEditor parity).** Previously, indentation only worked inside lists; anywhere else `Tab` jumped keyboard focus out of the editor. A new `BlockIndent` extension adds a left indent (inline `margin-left`, in 40px steps up to 400px) to the paragraph(s) or heading(s) in the selection, and binds `Tab` / `Shift+Tab` to it. The routing mirrors CKEditor and covers every context:
  - **In a table** — deferred to the Table extension, so `Tab` moves between cells.
  - **In a code block** — inserts a literal tab character.
  - **In a list item that can nest** (has a preceding sibling) — sinks the item; **Shift+Tab** lifts it.
  - **In a list item that cannot nest** (e.g. the first item at a level) — indents the item's own content instead of doing nothing, so `Tab` still adds a "tab inside the `<li>`".
  - **Everywhere else** (paragraphs, headings) — indents/outdents the block, and consumes the key even at the min/max indent so focus never leaves the editor.

  The `indent` / `outdent` toolbar buttons and `execCommand('indent'|'outdent')` follow the same rule (list → nest, otherwise → block margin). The indent is stored on the element as inline `margin-left`, so it survives in mail clients and other consumers that do not load the editor stylesheet, and an incoming `margin-left` is parsed back as the starting indent. `BlockIndent` (with an `indentBlock` / `outdentBlock` command pair and `BlockIndentOptions` for `types` / `step` / `max`) is exported.

  Because Tab is captured, a keyboard escape is provided so the editor is not a focus trap (WCAG 2.1.2 "No Keyboard Trap"): pressing **`Esc` then `Tab`** (CodeMirror's convention) moves focus to the next focusable element outside the editor instead of indenting, and **`Esc` then `Shift+Tab`** moves to the previous one. `Esc` arms this for a single key press only; any other key disarms it, so a stray `Esc` never makes a later Tab jump out of the editor.

### Fixed

- **Content whose closing-tag slashes were backslash-escaped (`<\/p>`, `<\/li>`, `<\/ul>`) now imports as real tags instead of literal text.** Some hosts serialize the editor's HTML through encoders that escape `/` as `\/` — most notably PHP's `json_encode`, which does this by default unless `JSON_UNESCAPED_SLASHES` is set. The slash-free *opening* tags still built a real element tree, but the browser's HTML parser (the one TipTap uses in `setContent`/`insertContent`) does not treat `<\` as a tag opener, so the closing tags rendered as visible garbage text (`</p>`-looking characters) mid-content — a half-parsed list with broken markup. TinyMCE's hand-rolled parser silently tolerated the escaped slash, so restoring that leniency is part of preserving the facade: `setContent`, `insertContent`, and the Templates dropdown now normalize `<\/` back to `</` (a new `unescapeTagSlashes` utility) before parsing. The rewrite is limited to the `<\/` sequence — genuine text containing `<\/` would have arrived HTML-escaped as `&lt;\/`, so it can only ever repair a mangled closing tag — and is idempotent. This also restores `Tab` / `Shift+Tab` list indentation, which had only *appeared* broken because the mangled markup produced a malformed list with no real sibling items to nest; a well-formed list indents the second and later items as before (`Tab` on the first item at a level is a no-op, matching TipTap's `sinkListItem`).

## [1.9.3] - 2026-07-17

### Fixed

- **A blank line no longer doubles every time content is round-tripped through the editor.** `getContent()` fills each empty block with a `<br>` (the `format_empty_lines` fix from 1.9.1) so blank lines survive outside the editor. But `setContent()` had no inverse: re-importing that output — which every consumer does on skin/root-block change, and mail apps do when reloading a saved draft — handed the `<br>` to TipTap, which parsed it as a `hardBreak` node *inside* the block. On top of ProseMirror's own trailing-break decoration, that single blank line then rendered as **two**, growing by one line on every save/reload cycle. `setContent()` now runs the exact inverse of `fillEmptyBlocks` (a new `stripEmptyLineBreaks` utility, paired with it in the same module and gated on the same `format_empty_lines` flag): it removes the lone `<br>` from an otherwise-empty block before TipTap parses it, so the block is modeled as one genuinely empty line. `setContent(getContent(x))` now reproduces the original blank-line state and is stable across any number of round-trips. The strip is narrow and source-agnostic — `<div><br></div>` unambiguously means "one blank line" in HTML no matter who authored it, so it is collapsed for all inputs (this editor's output, a legacy theme, another client), while a genuine trailing hard break (`<div>hello<br></div>` from Shift+Enter) has text content and is left untouched. Opting out with `format_empty_lines: false` disables both halves.

## [1.9.2] - 2026-07-17

### Fixed

- **`Ctrl/Cmd+B`, `Ctrl+I`, `Ctrl+U`, and `Ctrl+Z` keyboard shortcuts work again.** The toolbar registered its own `document`-level `keydown` listener that re-ran `toggleBold`/`toggleItalic`/`toggleUnderline`/`undo` for these chords. But TipTap's Bold/Italic/Underline/History extensions already bind them natively on the editor DOM, and ProseMirror calls `preventDefault` without `stopPropagation` — so every one of those key presses was handled *twice*. The two toggles cancelled out (net no-op for `Ctrl+B/I/U`) and `Ctrl+Z` undid two steps at once. Worse, because the listener compared `event.key` case-sensitively, holding Shift slipped past it: `Ctrl+Shift+B` fell through to TipTap's blockquote binding, and `Ctrl+Shift+I`/`Ctrl+Shift+U` reached TipTap's uppercase italic/underline bindings — so the marks only appeared to work with Shift held. The redundant bold/italic/underline/undo/redo bindings have been removed; these shortcuts are now owned solely by TipTap (matching the documented behavior). `Ctrl/Cmd+F` (Find & Replace) has no native TipTap binding and is still handled by the toolbar.

## [1.9.1] - 2026-07-17

### Fixed

- **Blank lines no longer vanish when the content is rendered outside the editor.** TipTap/ProseMirror serializes an empty line as a bare `<div></div>` (or `<p></p>`) — the live-editing trailing break is a view decoration, not part of the document, so it is absent from `getHTML()`. Bare empty blocks collapse to zero height in mail clients and other consumers, so the blank lines a user typed appeared to disappear on send. `getContent()` now injects a `<br>` into each empty block at serialization time (a new `fillEmptyBlocks` utility), mirroring TinyMCE's `format_empty_lines` and CKEditor's `fillEmptyBlocks`. This is gated on the existing `format_empty_lines` option, which already defaults to `true`; setting `format_empty_lines: false` opts out and restores the old pass-through. The transform runs only on serialized output — it never touches the live editor DOM, so it does not collide with ProseMirror's own trailing break. It is idempotent (a block already holding a `<br>` is left alone, so round-tripping content never accumulates `<br><br>`), attribute-agnostic (empty blocks carrying an inlined default font from `BlockFontStyle` are still filled), and leaves table cells, list items, and blocks containing void/embedded elements untouched.

## [1.9.0] - 2026-07-13

### Added

- **The font dropdowns now show the font and size at the cursor.** The `fontfamily` and `fontsize` toolbar buttons displayed the static words "Font" and "Font size", which told the user nothing about the text they were editing. They now read the value in effect at the cursor — "Times New Roman", "12pt" — and track it as the caret moves, the way TinyMCE and word processors do. The family is displayed by its configured name (the label from `font_family_formats`), not its raw CSS stack; a font that is not in the configured list (pasted from another editor, say) is shown by its first family name. When there is no single value to show, the button falls back to the generic word, so no new translatable strings were added.

### Changed

- **`getFontFamily()` / `getFontSize()` now return `''` for a selection that spans more than one value.** They previously read the attributes at the selection *head*, so a selection covering both 12pt and 18pt text confidently reported "12pt". With the value now displayed on the toolbar face, that head-biased answer would actively mislead, so a mixed selection reports no value instead — matching TinyMCE, which blanks the control in the same situation. Collapsed cursors and single-value selections are unaffected. This also fixes the dropdown menu check-marking a font that only applies to part of the selection.
- New `.md-toolbar-dropdown-label` rules give the two font dropdowns a fixed label width with ellipsis truncation (the full text is on the button's `title`). The width is pinned deliberately: the toolbar measures button widths to decide the `||` primary/overflow row split, so a label that resized with the caret would make buttons hop between rows while typing.

## [1.8.0] - 2026-07-13

### Added

- **`getFontFamily()` / `getFontSize()`** on `HTMLEditor` — report the font in effect at the cursor, resolving inline `<span>` override → block font → configured default. The toolbar font dropdowns now use these to highlight the current font when opened; previously they read only the inline mark and so showed nothing selected whenever the font came from the block default (i.e. almost always).
- **`setBlockFontFamily` / `setBlockFontSize` commands** on the `BlockFontStyle` extension — set the font on every block the selection touches. Available on the TipTap instance via `getTipTap()`.

### Fixed

- **A font picked before typing is no longer silently discarded.** Choosing a font or size from the `fontfamily`/`fontsize` toolbar dropdowns (or via `execCommand('fontname'|'fontsize', …)`) while the cursor sat in an empty block applied it as an inline mark. With nothing to mark, that only parked a ProseMirror *stored mark* on the selection — and stored marks are discarded by the next transaction that moves the selection or changes the document. Clicking into the body, or a host app calling `setTextSelection`, dropped the font before the user typed a character. Font changes made in an empty block are now written to the block's own `font-family`/`font-size`, so they persist and land in the exported HTML. Changes made with text selected still produce an inline `<span>` override, and changes made mid-text still use a stored mark, as before.
- **The configured `fontName`/`fontSize` are no longer re-applied as inline marks on `init`.** The editor used to run `setFontFamily`/`setFontSize` in TipTap's `onCreate`, which had the same stored-mark problem (the marks never survived to the first keystroke) and additionally **stole focus** — `chain().focus()` pulled focus into the editor body on every init, overriding `auto_focus`/`setFocus` and any focus the host app had placed elsewhere. The defaults are carried by the `BlockFontStyle` extension (added in 1.6.0), which already renders them on every block, so the `onCreate` calls were dead weight; they have been removed. Text typed immediately after init also no longer gets wrapped in a redundant `<span>` repeating the block's own font.

## [1.7.0] - 2026-06-22

### Added

- **UMD bundle for browser / CDN usage** — the build now emits a third output, `dist/index.umd.js`, alongside the existing ES (`dist/index.mjs`) and CJS (`dist/index.js`) bundles. The UMD file is fully self-contained (all TipTap dependencies inlined) and exposes the entire public API under the `MDHTMLEditor` browser global, so the editor can be dropped into a static HTML page with a plain `<script>` tag — no bundler required.
- The package now advertises the UMD file to CDNs via the `unpkg` and `jsdelivr` fields, and exposes it through the `@mdaemon/html-editor/umd` export subpath. CDN usage (`<script src="https://unpkg.com/@mdaemon/html-editor">`) is documented in the README. Note that styles (`dist/styles.css`) must be loaded separately, as the UMD bundle contains JS only.

### Changed

- **Production builds are now minified.** Removed `minify: false` from `vite.config.ts` so the production build uses the default Rolldown/Oxc minifier. The published bundles shrank substantially (e.g. `dist/index.umd.js` ~1.59 MB → ~856 KB). The development build (`npm run build:dev`) remains unminified with sourcemaps.
- **New `npm run demo:umd` script** — builds the package and serves a standalone UMD demo (`test/umd.html`) as raw static files via a tiny dependency-free Node server (`test/serve-umd.mjs`). Unlike `npm run demo` (which runs the source through Vite's dev pipeline), this loads the built `dist/index.umd.js` and `dist/styles.css` exactly as a CDN/`<script>` consumer would.
- **UMD packaging tests.** `__tests__/packaging.test.ts` guards against config drift (asserts `package.json` `unpkg`/`jsdelivr`/`exports["./umd"]` and the `vite.config.ts` `formats`/filename stay consistent) and runs as part of `npm test`. A new `npm run test:dist` script builds the package and runs a post-build smoke test (`__tests__/dist-umd.smoke.ts`) that loads the built UMD bundle in a sandbox and verifies it registers `window.MDHTMLEditor.HTMLEditor`.

## [1.6.1] - 2026-06-12

### Changed

- Upgraded the build toolchain from **Vite 7 to Vite 8** (`vite@^8.0.0`), which replaces Rollup + esbuild with the Rust-based **Rolldown** bundler and **Oxc** transformer. No public API, runtime, or config changes — the existing `rollupOptions` in `vite.config.ts` is accepted via Vite 8's compatibility layer. Node.js requirement is unchanged (`^20.19.0 || >=22.12.0`).
- The published bundle is ~70 KB smaller thanks to Rolldown tree-shaking (`dist/index.mjs` 1,611 KB → 1,539 KB; `dist/index.js` likewise). The exported API surface is byte-identical — all 34 public exports unchanged. Full test suite (605 tests) and `typecheck` pass.

## [1.6.0] - 2026-06-10

Per-selection font changes are unchanged: selecting text and choosing a font or size from the toolbar still produces an inline `<span>` that overrides the block default, so a single paragraph can mix fonts and sizes (e.g. "this is **A BIG font**, and this is a small font").

Font-size defaults are applied to paragraphs only — headings keep their level-based sizing (`h1` = 2em, etc.). Font-family defaults apply to paragraphs and headings.

### Added

- **Block-level default font styling** — the default font family and font size are now inlined directly on every block element in the exported HTML (`font-family` on `<p>`/`<div>`/`<hN>`, `font-size` on `<p>`/`<div>`), instead of relying on the editor's container CSS being present on the receiving end. This fixes sent messages losing their font when rendered elsewhere (e.g. an email body opened in another client). The defaults come from the `fontName` / `fontSize` config options and fall back to `arial, helvetica, sans-serif` / `12pt`.
- New `BlockFontStyle` extension (and `BlockFontStyleOptions` type) exported from the package entry point.

## [1.4.2] - 2026-06-09

### Added

- **`trailingNode` option** — new boolean config (default `false`) that appends an empty trailing paragraph when the document ends in a block node (table, image, code block, etc.), so the cursor can be placed after it. Enabling it maps to TipTap StarterKit's built-in trailing-node behavior.

### Changed

- Added a `document.elementFromPoint` polyfill to the Jest setup so the suite runs under jsdom (newer TipTap placeholder viewport tracking calls it during editor construction).

### Fixed

- **Insert/Edit Link** — URLs typed without a scheme (e.g. `www.example.com`, `example.com/path`) now have `http://` prepended automatically instead of being saved as relative links that resolve against the current page and break. Existing schemes (`https:`, `mailto:`, `tel:`, `ftp:`, …), anchors (`#…`), absolute/relative paths (`/`, `./`, `../`), and protocol-relative URLs (`//host`) are left untouched.
- **Paste toolbar button** — replaced the deprecated, browser-blocked `document.execCommand('paste')` with the async Clipboard API. The button now reads the clipboard (prompting for permission on first use), prefers `text/html` to preserve formatting, falls back to plain text, and strips the browser's clipboard scaffolding (`<meta>`, `StartFragment`/`EndFragment` markers) before inserting. Browsers that block programmatic clipboard reads (e.g. Firefox) fall back to Ctrl/Cmd+V, which the engine handles directly.
- **confab skin** — replaced the `removeformat` toolbar icon with a clearer eraser glyph.

## [1.4.1] - 2026-06-05

### Changed

- Dependency and lockfile maintenance — bumped `@babel/*` to 7.29.7, `esbuild` platform binaries to 0.27.7, `@emnapi` core/runtime to 1.10.0 (and `wasi-threads` to 1.2.1), and `@adobe/css-tools` to 4.5.0; refreshed `package-lock.json`. No functional or API changes.

## [1.4.0] - 2026-06-05

### Added

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

### Changed

- Added `@tiptap/extension-subscript`, `@tiptap/extension-superscript`, and a direct `@tiptap/extension-paragraph` dependency

## [1.3.0] - 2026-05-21

### Added

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

## [1.2.0] - 2026-05-14

### Added

- Added paste-from-Office support — detects and cleans HTML pasted from Microsoft Word and Excel while preserving formatting (bold, italic, underline, font family/size, colors, highlights, lists, tables, text alignment, line height, indentation)
  - Word list conversion: transforms Word's fake list paragraphs (`MsoListParagraph`) into proper `<ul>`/`<ol>` with correct nesting
  - Excel table normalization: preserves table structure, colspan/rowspan, and cell formatting while stripping Excel-specific attributes
  - Security hardening: strips `<script>`, `<iframe>`, event handlers, `javascript:` URLs, and `file://` references (defense-in-depth alongside TipTap's schema enforcement)
  - New `paste_from_office` config option (default: `true`) to enable/disable the feature
  - No new dependencies — zero bundle size impact

### Changed

- Updated all TipTap packages from 3.23.1 to 3.23.4

## [1.0.14] - 2026-05-11

### Added

- Added responsive toolbar with priority-based button visibility for narrow containers (≤768px)
  - Tier 1 buttons (bold, italic, underline, undo, redo, link, forecolor) remain visible; all others collapse behind the existing toggle button
  - Container-width detection via ResizeObserver — works in sidebars, modals, and narrow panels regardless of viewport size
  - New `toolbar_narrow_breakpoint` config option to customize the width threshold (default: 768)
  - New `toolbar_priority` config option to override default button tier assignments
- Added touch device support via `@media (pointer: coarse)` — enlarges toolbar buttons to 44×44px on touch devices to meet WCAG 2.5.5 target size recommendations

## [1.0.13] - 2026-05-04

### Added

- Added Mention extension for inline @mention support (`span.composer-mention` atom nodes)
  - Enables `insertContent()` to correctly handle mention spans instead of escaping them as text
  - Parses and renders `<span class="composer-mention" contenteditable="false" data-jid="..." data-display="...">@Name</span>`
  - Inline, atomic, non-editable node that round-trips through the editor without data loss

### Fixed

- Fixed clicking empty space in `.md-editor-content` not focusing the editor when content doesn't fill the container

## [1.0.12] - 2026-04-27

### Added

- Added confab skin (light and dark) with CSS custom property theming
- Added custom icon set support
- Added SignatureBlock extension
- Added SourceEditor dialog for raw HTML editing
- Added LinkEditor dialog for link creation and editing
- Added scoped CSS reset to protect editor internals from host-app CSS resets (e.g. Tailwind preflight)

### Changed

- Upgraded to TypeScript 6
- Unified toolbar overflow into a single container for consistent button wrapping
- Positioned toolbar dropdown and color picker menus as fixed, appended to document.body, to prevent misalignment caused by parent CSS transforms
- Replaced text-based dropdown arrows with inline SVGs to prevent host-app font-size overrides from inflating arrow size
- Many feature updates and refinements

### Fixed

- Fixed TSC compilation error
- Fixed Markdown table formatting in README
- Fixed dropdown menus appearing offset when host app uses CSS transforms on ancestor elements
- Fixed color picker not closing other open menus when opened
- Fixed dropdown item styles being overridden by scoped button reset (CSS specificity)

## [1.0.0] - 2026-02-13

### Added

- Created TipTap-based HTML editor as a TinyMCE-compatible replacement
- Added comprehensive test suite
- Upgraded to TipTap v3
- Updated all dependencies to latest versions
- Updated license

[1.20.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.20.0
[1.19.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.19.0
[1.18.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.18.0
[1.17.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.17.0
[1.16.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.16.0
[1.15.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.15.0
[1.14.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.14.0
[1.13.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.13.1
[1.13.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.13.0
[1.12.5]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.12.5
[1.12.3]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.12.3
[1.12.2]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.12.2
[1.12.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.12.1
[1.12.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.12.0
[1.11.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.11.1
[1.11.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.11.0
[1.10.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.10.1
[1.10.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.10.0
[1.9.3]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.9.3
[1.9.2]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.9.2
[1.9.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.9.1
[1.9.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.9.0
[1.8.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.8.0
[1.7.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.7.0
[1.6.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.6.1
[1.6.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.6.0
[1.4.2]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.4.2
[1.4.1]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.4.1
[1.4.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.4.0
[1.3.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.3.0
[1.2.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.2.0
[1.0.14]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.0.14
[1.0.13]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.0.13
[1.0.12]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.0.12
[1.0.0]: https://www.npmjs.com/package/@mdaemon/html-editor/v/1.0.0
