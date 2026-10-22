# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
