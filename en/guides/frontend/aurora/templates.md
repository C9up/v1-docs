# Templates

This guide covers aurora templates:

- Where a slot may not go
- URLs that navigate or load code

## Templates — `html`

The `html` tag returns a `TemplateResult`. It does not touch the DOM by itself; the renderer (`render`, `renderToString`, `hydrate`) is what attaches the result somewhere.

```ts
import { html } from '@c9up/aurora'

const greeting = (name: string) => html`<p>Hello, ${name}!</p>`
```

Slots inside templates are typed positions:

- **Text slot** — `<p>${value}</p>` interpolates a string, number, or signal as a text node.
- **Attribute slot** — `<a href="${url}">` sets an attribute; if the value is a signal, the attribute re-renders on change. A slot that is the whole value leaves the attribute out for `null`, `undefined` or `false` and writes it empty for `true`, on the server as in the browser; joined with static text (`class="a ${x}"`), `null`, `undefined` and `false` add nothing.
- **Property slot** — `<input .value="${signal}">` (dotted prefix) writes a DOM property.
- **Boolean attribute** — `<button ?disabled="${signal}">` toggles the attribute presence.
- **Event slot** — `<button @click="${handler}">` adds a listener.
- **Nested template** — see the example below.

  ```ts
  html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`
  ```

Templates are cached by their static string array, so re-rendering the same template is cheap.

### Where a slot may not go

A slot is escaped for the position it lands in. Five positions have no escaping
that would make them safe, so they are refused by name — the same error from
`renderToString`, `render` and `hydrate` alike, because the two render paths used
to disagree and each shipped a different bug.

| Refused | Code | Why, and what to write instead |
|---|---|---|
| `<${tag}>` | `E_AURORA_SLOT_IN_TAG_NAME` | The template compiles once into a fragment and a slot is a node position; a tag name is not one. Write the tag out, or pick between two templates. |
| `<img ${name}="v">` | `E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | Same reason. Write the attribute out and bind its value. |
| `<!-- ${x} -->`, `<!x ${x}>`, `<?${x}>`, `<![CDATA[${x}]]>` | `E_AURORA_SLOT_IN_COMMENT` | A slot there binds nothing, and the comment aurora anchors a text slot with would end the author's comment early, turning the rest of it into markup. Move the slot out. Comments end where the browser ends them: `<!-->` and `<!--->` at once, `--!>` like `-->`; `<!x …`, `<?…` and `</ …` at the first `>`, quotes or not; and a `<` that is not followed by a letter, `/`, `!` or `?` is plain text. |
| `onclick="${code}"` | `E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | That value is JavaScript; escaping it as HTML does not stop it running. Use `@click="${handler}"`, which binds a function. |
| `srcdoc="${doc}"` | `E_AURORA_SLOT_IN_SRCDOC` | The iframe decodes the value and parses it as a whole document. Point it at a URL you serve. |
| `<script src="${url}">`, `.src` on a script, `href`/`xlink:href` on an SVG script | `E_AURORA_SLOT_IN_SCRIPT_SOURCE` | Whatever the URL points at runs with the page's authority — `https://` on another origin and a `blob:` included — and no check on the value can tell the script you meant from one the value picked. Write the URL into the template; a script chosen at runtime belongs in code that creates the element. |
| `<script>`, `<style>`, `<textarea>`, `<title>`… | `E_AURORA_SLOT_IN_RAW_TEXT` | The parser does not read their content as markup. For `<textarea>` and `<title>` the content IS text, but the comments aurora anchors a slot with would be part of it — bind the property: `<textarea .value="${value}">`. For the rest, build the value outside the template. `<plaintext>` has no end tag, so every slot after it is refused. A `/` does not close an HTML element — `<script/>` opens a script like `<script>` does. |
| `.text`, `.textContent`, `.innerText` on `<script>` or `<style>` | `E_AURORA_SLOT_IN_RAW_TEXT` | The property spelling of a slot inside the element: it writes the source the browser runs. |
| `.innerHTML`, `.outerHTML`, `.srcdoc` | `E_AURORA_SLOT_IN_HTML_PROPERTY` | These properties parse their value as HTML, handlers and all. Put the content in a text slot, or pass a nested `html` template. |
| A nested `` html`…` `` template (or an array holding one) as an attribute value or a `.value` | `E_AURORA_TEMPLATE_IN_ATTRIBUTE` | Markup has no meaning in an attribute. Pass a string — for a prop typed `string \| TemplateResult`, bind its string form to `title`/`aria-label`. |

Inside `<svg>` and `<math>` the raw-text rules are suspended, because the parser
never switches state in foreign content — `<svg><title>${label}</title></svg>` is
an ordinary text slot. Two things still hold there:

- A `<script>` or `<style>` **runs its content** in SVG and MathML too, so a slot
  inside one is refused wherever it is.
- The HTML rules come back at an **HTML integration point** — `foreignObject`,
  `desc` and `title` in SVG; `mi`, `mo`, `mn`, `ms`, `mtext` and `annotation-xml`
  in MathML — and after an HTML tag that ends foreign content (`<p>`, `<div>`,
  `<br>`, `<span>`, `<table>`…), which the parser reads as HTML however the
  markup is nested.

**`.value` is the one property the server renders.** `.prop` bindings are
client-only — there is no markup for `textContent` — but an `<input>` carries its
value as an attribute and a `<textarea>` as its content, so both are written:

```ts
html`<input name="title" .value="${title}">`      // → <input name="title" value="Draft">
html`<textarea name="bio" .value="${bio}">`       // → <textarea name="bio">Bio</textarea>
```

Which is what makes the refusal above workable: a server-rendered form arrives
filled, and a submit before hydration sends the values.

An `<input type="file">` is the exception: a script may only clear it. A
non-empty `.value` there throws `E_AURORA_FILE_INPUT_VALUE` on the server, on the
client render and on hydration, wherever the `type` is written in the tag; bind
`""` to reset the field.

### URLs that navigate or load code

`href`, `xlink:href`, `action` and `formaction` are checked on every element, and
`src` on `<iframe>`, `<frame>` and `<embed>`, `data` on `<object>` — the elements
that run what they load. A `<script>`'s URL takes no slot at all (see above). A value whose scheme would execute —
`javascript:`, `vbscript:`, `data:` — is prefixed with
`unsafe:` rather than rejected. A URL in an `href` is usually data, and throwing
there would trade an XSS for a blank page; the attribute stays in place, inert,
and legible to whoever comes looking.

The whole value is judged, not each slot: `href="java${'script:alert(1)'}"` is
safe in each half and a running script once they meet. `src` on an `<img>`,
`<video>` or `<source>` is left alone, because a `data:` URI is how an inline
image is written and that position runs nothing.

A `.prop` binding gets the same check: `.href`, `.src`, `.action`, `.formAction`
and `.data` are neutralised wherever the attribute they write would be.

Two more positions navigate without an `href`:

- `to`, `from`, `by` and `values` on an SVG `<set>` or `<animate>` —
  `<set attributeName="href" to="javascript:…">` gives a link a target no `href`
  held. They are checked whatever the animation sets, since `attributeName` may
  come later in the tag; in `values`, each `;`-separated item is.
- `content` on a `<meta>`, when it reads as a refresh (`0;url=…`): the target is
  checked and the whole value prefixed, which stops the refresh. A description or
  a viewport is left alone.

A slot in `<base href>` (or `.href` on a `<base>`) is refused with
`E_AURORA_SLOT_IN_BASE_URL`: it rebases every relative URL on the page, the
scripts it loads included, and no scheme check covers a base on another origin.
