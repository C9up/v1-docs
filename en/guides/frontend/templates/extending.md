# Helpers and custom tags

This guide covers extending the template engine:

- Helpers & globals
- Contributing from another package
- Custom tags — `registerTag`

## Helpers & globals

Two function layers are always in expression scope:

- **Core globals** — string casing (`camelCase`, `pascalCase`, `snakeCase`, `dashCase`, `titleCase`), text (`truncate` keeps the tags of HTML input and closes the ones it cuts open, `excerpt` strips them and counts each paragraph end as a space — both whole words and a `...` suffix by default, `{ strict: true }` to cut at exactly the length — and `nl2br`), `pluralize`, formatting (`prettyBytes`, `prettyMs`, `ordinal`, and `toBytes` / `toMs`, which parse `'2.5 MB'` or `'1h'` back to a number and give `null` for anything else, in time linear in the input's length), `inspect`, and the `html` helpers (`html.attrs`, `html.classNames`, `html.safe`). There is also `html.jsonLd(data, cspNonce())`, which writes a page's structured data as `<script type="application/ld+json">` — the value escaped as `js.stringify` does, so no value can end the script, and the nonce on the tag. A value JSON cannot hold (a function, a symbol, a bigint, `NaN`/`Infinity`, a cycle, data nested deeper than 512 levels) is refused with `E_INKER_INVALID_JSON_LD` rather than written as invalid structured data; the message names its path, such as `offers[1].price is NaN`. A getter or `toJSON` of the data that throws is reported as `E_INKER_HELPER_THROW` with that path and the original error as its `cause`.
- **Registered helpers** — passed to the constructor (`helpers` option) or wired by the provider: `t()` (i18n), `route`/`urlFor` and `signedUrlFor`, `asset`, `csrfField` / `csrfMeta`, etc. A registered name overrides a core global of the same name.

```ts
const templates = new Templates({
  root,
  helpers: new Map([
    ['t', (key) => i18n.translate(String(key))],
  ]),
})
```

A helper (or global) that returns a `SafeString` is emitted raw — this is how a helper embeds pre-trusted markup (e.g. a CSRF hidden field, or a server-rendered Aurora island).

### Rendering in a request — `ctx.view`

`InkerProvider` gives every HTTP context a `view`: a renderer of its own,
created on first access and kept for the request, with `request` already
shared. Whatever a middleware `share()`s on it reaches the controller's render.

```ts
async create({ view }: HttpContext) {
  return view.render('posts/create', { categories })
}
```

Every render through `ctx.view` (`render`, `renderSync`, `renderString`,
`renderRaw`, `renderRawSync`, and those of a `clone()`) sees the same request as
`inker.render(ctx, …)`: `t()` translates in `ctx.locale`, `csrfField()` /
`csrfMeta()` write this request's token, `cspNonce()` returns its nonce.

The provider needs a router in the container. `@c9up/rosetta` is optional:
without it the engine, `ctx.view` and the `inker` service still come up, and
inker registers no `t()` of its own — a template that calls it fails with
"'t' is not a helper, a global or a function". Install rosetta to translate.

## Contributing from another package

A package that ships globals or tags of its own — rosetta's `t()` is the one
every app sees — pushes them in through the package's default export:

```ts
import inker from '@c9up/inker'

inker.use((engine) => {
  engine.global('money', (cents: number) => `${(cents / 100).toFixed(2)} €`)
})
```

Call it whenever you like. `use()` only queues: the engine runs its plugins
once, just before the first render, so a plugin registered before the engine
was configured still observes the engine as it ends up. That is why this is
a module import and not a container binding — the engine's binding is only
resolvable after the application has started, and a package that wants to
contribute usually runs earlier than that.

A provider doing this should check the flag first, so it stays installable in
an app with no template engine at all:

```ts
async boot() {
  if (this.app.usingInker !== true) return
  const inker = await import('@c9up/inker')
  inker.default.use(myPlugin)
}
```

`usingInker` is set by `InkerProvider`'s constructor, which runs before any
provider boots.

### Rendering outside a request

A package that renders templates with no HTTP request around — a mailer — goes
through the same default export. `share(state)` binds values that every
partial and component of the render sees, and `render(template, data)` renders
with the engine `InkerProvider` built:

```ts
if (this.app.usingInker === true) {
  const inker = await import('@c9up/inker')
  const html = await inker.default.share(sharedState).render('emails/welcome', data)
}
```

Rendering before `InkerProvider` has started throws `E_INKER_ENGINE_MISSING`.

## Custom tags — `registerTag`

Register a custom `@`-tag. The definition is an object — `{ tagName, block, seekable, compile(parser, buffer, token) }` — and it makes the parser recognise `@<tagName>(jsArg)` in every template:

```ts
import fs from 'node:fs'

templates.registerTag({
  tagName: 'svg',
  block: false,     // inline tag: no body
  seekable: true,   // accepts an argument between parens
  compile(parser, buffer, token) {
    const name = token.properties.jsArg.trim().replace(/['"]/g, '')
    buffer.writeRaw(fs.readFileSync(`./assets/icons/${name}.svg`, 'utf-8'))
  },
})
```

```inker
@svg('user')
<p>Rendered: @time()</p>
```

A tag registered with `block: true` takes a body, closed by `@end<tagName>` —
or no body at all when written self-closed, `@!<tagName>(…)`. Its `compile`
gets the body already rendered, on demand, from `token.renderBody()`:

```ts
templates.registerTag({
  tagName: 'card',
  block: true,
  seekable: true,
  async compile(parser, buffer, token) {
    buffer.writeRaw('<section class="card"><h2>')
    buffer.outputExpression(token.properties.jsArg, token.filename, token.loc.start.line, true)
    buffer.writeRaw('</h2>')
    buffer.writeRaw(await token.renderBody())
    buffer.writeRaw('</section>')
  },
})
```

```inker
@card(invoice.title)
  <p>{{ invoice.total }}</p>
@endcard
```

Inside `compile`:

- `token.properties.jsArg` is the **verbatim** argument source between the parens.
- `buffer.writeRaw(text)` emits verbatim markup.
- `buffer.outputExpression(jsExpression, filename, line, escape)` evaluates a template expression (a JS source string) in the render scope and emits its value — escaped when `escape` is `true`.
- `token.renderBody(locals?)` renders a block tag's body in the tag's scope, plus any `locals` you hand it, and returns the HTML (a string, or a promise when the body awaited something); an inline tag's body is `""`. A tag that never calls it never pays for its body.
- `token.evaluate(expression)` evaluates a template expression in the scope the tag was reached in.
- `compile` may be `async`: the render waits for it, and what it wrote lands in order.
- A `seekable: false` tag rejects any argument (`E_INKER_INVALID_EXPRESSION`).

> **When `compile` runs:** inker parses in Rust and renders by walking the JSON AST, so a tag's `compile` runs at **render** time. Because a tag name changes how a template *parses*, `registerTag` clears the AST cache; register your tags during boot, before rendering. Registering a name that collides with a built-in directive, or an invalid identifier, throws `E_INKER_INVALID_PATH`; an unregistered `@word` is inert (rendered as literal text).

Types `InkerTag`, `InkerTagBuffer`, `InkerTagToken`, `InkerTagParser` are exported from `@c9up/inker`.
