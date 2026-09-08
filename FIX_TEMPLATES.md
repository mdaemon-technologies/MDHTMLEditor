# Fix: email templates import wrong in `@mdaemon/html-editor`

**Target repo:** `github.com/mdaemon-technologies/MDHTMLEditor`
**Affected version:** 1.12.1 (reproduced); `vite/` uses `^1.12.0`, `Confab/` uses `^1.12.1`
**Affected consumers:** MDaemon WorldClient **Confab theme** and **Pro theme** — both go through
`@mdaemon/html-editor` (Pro via `@mdaemon/html-editor-react`), so both show the identical defect.

Everything below was **measured** by driving the real published package in jsdom, not inferred
from reading. The reproduction is included so you can confirm before and after.

---

## 1. Symptom

Applying a saved email template from the editor's **Templates** dropdown mangles it:

* A 2-bullet list imports as **4 bullets** — an empty bullet inserted before each real one.
* An empty `<div>` appears between every pair of blocks.
* Literal newline + tab characters survive into the document and render as visible line breaks
  (the editor surface is `white-space: pre-wrap`, so they are not collapsed at display time).
* A block containing only `&nbsp;` gains a trailing `<br>`, doubling its height in the sent mail.

The same template applied in MDaemon's legacy **LookOut** theme (CKEditor) imports correctly.
LookOut is the reference for what the output should look like.

### Input (a real stored template)

Stored HTML is pretty-printed, with **real** newlines and tabs between block elements:

```html
<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Last Week</div>

<ul>
	<li>
	<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Completed the following</div>
	</li>
	<li>
	<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Fixed the following</div>
	</li>
</ul>

<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">&nbsp;</div>
```

Note the whitespace-only text nodes that are **direct children of `<ul>`** (between `<ul>` and
`<li>`, and between `</li>` and `<li>`). Those are the ones that become extra bullets.

### What CKEditor (LookOut) produces — the target

```html
<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Last Week</div>
<ul>
	<li>
	<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Completed the following</div>
	</li>
	<li>
	<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Fixed the following</div>
	</li>
</ul>
<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">&nbsp;</div>
```

Two `<li>`. No stray blocks. `&nbsp;` with no `<br>`.

### What `@mdaemon/html-editor` currently produces

```html
<ul>
  <li><div style="font-family: Georgia; font-size: 11pt;">
	<br></div></li>
  <li><div style="font-family: Georgia; font-size: 11pt;">
	<br></div><div style="font-family: arial, helvetica, sans-serif; font-size: 12pt;">Completed the following</div><div style="font-family: Georgia; font-size: 11pt;">
	<br></div></li>
  <li><div style="font-family: Georgia; font-size: 11pt;">
	<br></div></li>
  <li>… Fixed the following …</li>
</ul>
…
<div style="font-family: arial, helvetica, sans-serif; font-size: 12pt;">&nbsp;<br></div>
```

Four `<li>`. Literal `\n\t` inside the empty divs. `&nbsp;<br>`.

---

## 2. Reproduction

Drop this in a jsdom test in the consuming app (or adapt to the editor's own harness). It passes
either way — read the `console.log` output.

```ts
import { HTMLEditor } from "@mdaemon/html-editor";

const TEMPLATE =
  '<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Last Week</div>\n\n'
  + '<ul>\n\t<li>\n\t<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Completed the following</div>\n\t</li>\n'
  + '\t<li>\n\t<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">Fixed the following</div>\n\t</li>\n</ul>\n\n'
  + '<div style="font-family:arial, helvetica, sans-serif;font-size:12pt">&nbsp;</div>\n';

const COMPOSE_BODY =
  '<div style="font-family:Georgia;font-size:10pt"><br></div>'
  + '<div id="signature"><div style="font-family:Georgia;font-size:11pt"><br></div></div>';

function make() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return new (HTMLEditor as any)(el, {
    forced_root_block: "div",
    format_empty_lines: true,
    fontName: "Georgia",
    fontSize: "10pt",
  }) as any;
}

function report(label: string, out: string) {
  console.log(`\n===== ${label} =====`);
  console.log("li count           :", (out.match(/<li/g) || []).length);
  console.log("literal tab present:", out.includes("\t"));
  console.log("nbsp+br            :", out.includes("&nbsp;<br"));
  console.log(out);
}

it("setContent path", () => {
  const e = make();
  e.setContent(TEMPLATE);
  report("setContent(TEMPLATE)", e.getContent());
});

it("insertContent path (what the Templates dropdown uses)", () => {
  const e = make();
  e.setContent(COMPOSE_BODY);
  e.insertContent(TEMPLATE);
  report("setContent(BODY) + insertContent(TEMPLATE)", e.getContent());
});
```

### Measured result on 1.12.1

| Path | `<li>` count | literal tabs | `&nbsp;<br>` |
|---|---|---|---|
| `setContent(TEMPLATE)` | **2** ✅ | no ✅ | **yes** ❌ |
| `setContent(BODY)` + `insertContent(TEMPLATE)` | **4** ❌ | **yes** ❌ | **yes** ❌ |

**This asymmetry is the key clue.** `setContent` handles the template correctly; `insertContent`
does not. Do not go looking for a global whitespace setting — that was the first hypothesis and
measurement ruled it out.

---

## 3. Root cause 1 — `insertContent` parses with whitespace preserved

### Why this path

The Templates dropdown inserts via `insertContent`, not `setContent`. In the built bundle
(`dist/index.mjs`), `createTemplateDropdown` does:

```js
this.createDropdown("template", this.trans("Templates"), t, (t) => {
  this.options.editor.focus(), this.options.editor.insertContent(t.value);
  let n = e.find((e) => e.content === t.value);
  n && this.options.editor.fire("templatechange", n);
});
```

and the wrapper's `insertContent` is:

```js
insertContent(e) {
  this.tiptap?.commands.insertContent(this.formatInput(e));
}
```

No `parseOptions` is passed. TipTap's `insertContentAt` defaults to
`{ preserveWhitespace: "full", ...options.parseOptions }`, whereas the `setContent` command takes
a different branch that collapses whitespace — hence the asymmetry in the table above.

### Why it produces extra bullets specifically

With whitespace preserved, the `\n\t` runs between `<ul>` and `<li>` survive as text nodes.
ProseMirror's `bullet_list` content expression is `list_item+`, so a bare text node cannot sit
there — the parser wraps each one in its own `list_item`. One extra empty bullet per whitespace
run. The same mechanism promotes each inter-block `\n\n` to an empty top-level block.

### The fix

Pass explicit parse options in the wrapper's `insertContent` (find it in `src/` — it is the method
next to `setContent`/`getContent`, alongside `formatInput`/`formatOutput`):

```ts
insertContent(html: string): void {
  this.tiptap?.commands.insertContent(this.formatInput(html), {
    parseOptions: { preserveWhitespace: false },
  });
}
```

`preserveWhitespace: false` is ProseMirror's "collapse per HTML rules" mode — exactly what a
browser and CKEditor do with insignificant inter-block whitespace.

**Verified:** this exact change was patched into the published bundle and the probe re-run.
Result: `<li>` count **4 → 2**, literal tabs gone, spurious empty divs gone. The patch was then
reverted; the package in the consuming repo is untouched.

### Safety notes

* **`<pre>` / code blocks are not affected.** The CodeBlock extension declares
  `preserveWhitespace: "full"` on its own parse rule, which wins per-node over the document-level
  option.
* **Paste is not affected.** Pasting goes through ProseMirror's clipboard parser, a separate code
  path with its own whitespace setting. `insertContent` is the programmatic API.
* Other callers of `insertContent` in the consuming apps (e.g. inserting a Dropbox link) pass
  single-line HTML, so there is nothing for the change to alter there.
* Consider whether `setContent` should be made explicit too, for symmetry and to pin the behaviour
  against future TipTap changes — it currently gets the right result by accident of which branch
  the command takes.

---

## 4. Root cause 2 — `&nbsp;`-only blocks are misclassified as empty

Independent of the above, and present on **both** paths (see the table: `setContent` also shows
`&nbsp;<br>`).

The emptiness predicate used by `fillEmptyBlocks` (bundle symbol `Iw`, called from `Lw`) is:

```js
function isEmptyBlock(el) {
  return !((el.textContent ?? "").trim() !== ""
    || el.querySelector(VOID_SELECTOR)
    || el.querySelector(BLOCK_SELECTOR));
}
```

JavaScript's `String.prototype.trim()` strips **U+00A0 (non-breaking space)** — it is included in
the spec's WhiteSpace production. So `<div>&nbsp;</div>` has `textContent === " "`,
`" ".trim() === ""`, and the block is judged empty. `fillEmptyBlocks` then appends a `<br>`,
giving `<div>&nbsp;<br></div>` — a double-height blank line in the sent message.

### The fix

Treat only ASCII whitespace as blank, so NBSP counts as real content:

```ts
(el.textContent ?? "").replace(/[ \t\n\r\f\v]+/g, "") !== ""
```

Do **not** use `/\s/` — in JavaScript regex `\s` also matches U+00A0, which reintroduces the bug.

Apply this to the `fillEmptyBlocks` side (`isEmptyBlock`). The inverse used by `formatInput`
(bundle symbol `Rw`, which strips the export-only `<br>` on the way back in) still behaves
correctly if left as-is: for `<div>&nbsp;</div>` it finds no `<br>` to remove and returns early.
Check it against your source, but expect no change needed there.

### Note on severity

This one is self-consistent across an in/out round trip inside the editor — `formatOutput` adds
the `<br>` and `formatInput` strips it again — so it does **not** compound over repeated saves.
It still ships in the outgoing email and still differs from LookOut, so it is worth fixing.

---

## 5. Acceptance criteria

Using the reproduction in section 2, after both fixes:

* `setContent(TEMPLATE)` → `<li>` count **2**, no literal tabs, **no** `&nbsp;<br>`.
* `setContent(BODY)` + `insertContent(TEMPLATE)` → `<li>` count **2**, no literal tabs,
  **no** `&nbsp;<br>`, and exactly one empty block (the compose body's own leading blank line —
  that one is legitimate).
* A `<pre>` block round-trips with its internal whitespace intact (guards the section 3 change).
* Pasting multi-line HTML into the editor is unchanged.

Please add the two cases above as regression tests in the package's own suite.

---

## 6. Explicitly out of scope

These remaining differences from LookOut are **not** bugs and should not be "fixed" as part of
this work:

* **Font representation.** LookOut wraps the whole body in one
  `<div style="font-size:10pt;font-family:Georgia">`; this editor puts the font on each block via
  the `BlockFontStyle` extension. Visually equivalent, and per-block is more robust for email —
  wrapper inheritance is unreliable in Outlook. Changing it means reworking the editor's font
  model; do not do so without a separate decision from the WorldClient team.
* **Inline style string formatting.** `font-family: Georgia; font-size: 11pt;` versus CKEditor's
  `font-size:10pt;font-family:Georgia` — property order and spacing from the DOM style serializer.
  Cosmetic; renders identically.
* Some blocks showing 11pt where LookOut shows 10pt. Most of those were the whitespace artifacts
  themselves. **Re-check this after fix 1** — it is expected to largely disappear. If a genuine
  discrepancy remains, report it rather than patching around it.

---

## 7. Release / rollout

1. Land both fixes in `MDHTMLEditor` with the regression tests from section 5.
2. Publish a new `@mdaemon/html-editor`.
3. Bump in the MDaemon repo:
   * `WorldClient/Confab/package.json` (currently `^1.12.1`)
   * `WorldClient/vite/package.json` (currently `^1.12.0`), and
     `@mdaemon/html-editor-react` if it pins the core version.
4. Re-verify in both themes against a real LookOut-authored template.

### Related, already handled — do not duplicate

The package's `formatInput` calls `unescapeTagSlashes` (`<\/p>` → `</p>`). That was a workaround
for a **separate** WorldClient bug: templates are stored in the shared `StandardResponse.js` with
`/` backslash-escaped, and the Confab client had a broken un-escaper. That has now been fixed
properly on the WorldClient side, so escaped tags no longer reach the editor. Leave
`unescapeTagSlashes` in place as belt-and-braces — but do not treat it as related to the two bugs
above, and do not extend it.

---

*Working note: this file is a hand-off artifact, not a deliverable. Per `WorldClient/CLAUDE.md` it
must not be added to TFVC. Delete it once the fix has landed.*
