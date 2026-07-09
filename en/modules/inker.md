# Inker — Server-side Templates

Inker is the server-side templating module in the Ream ecosystem (`@c9up/inker`). It is a hand-rolled **AdonisJS Edge** clone: the same `@`-directive syntax, the same `{{ }}` interpolation, the same layouts / sections / components / slots — with a Rust lexer + parser and a Node evaluator.

> Status: full Edge-parity engine. `{{ }}` interpolation evaluates real JavaScript expressions; `@if`/`@elseif`/`@else`/`@unless`, `@each`, `@let`, `@layout` + `@section`/`@super`, `@include`/`@includeIf`, `@component` + `@slot` with `$props`/`$slots`, core globals, registered helpers, `@eval`/`@dump`, and custom tags (`registerTag`) all ship. The Ream provider and the agnostic `@c9up/inker/testing` sub-path are wired.

## Architecture — Rust parses, Node evaluates (the Edge model)

The epic forbids pulling in a templating dependency (Handlebars, Mustache, Eta, EJS, Pug, Nunjucks, even Edge.js itself). Inker is hand-rolled, split across a Rust core and a Node renderer:

- **Rust (`inker-engine`)** — a single forward-scan lexer and a linear parser turn a `.inker` source into a **JSON AST** (`parseTemplate` / `parseTemplateJson` over NAPI). This is the CPU-bound work; each node carries the *verbatim source* of its expressions.
- **Node (`renderNode.ts`)** — walks the JSON AST and evaluates each expression's source in Node's own **V8**, with the registered helpers, core globals, and the render scope all in lexical scope — exactly like Edge (one runtime; helpers are plain functions callable anywhere, including inside arrow functions and loop-scoped arguments).

> The expression source is author-controlled (`.inker` files) — the same trust level as the rest of the app's code. That is Edge's model, and it is why a helper can be called *inside* a rich expression (`{{ users.filter(u => can(u)).map(u => u.name).join(', ') }}`).

> **Trust boundary (security).** Because expressions run in V8, a template *is code*. Never feed untrusted input to `renderString`, and never load `.inker` templates from an untrusted source (a CMS field, a user upload) — that is arbitrary code execution, exactly as it would be in Edge. As a bar-raise (a named deviation from strict Edge parity), the dangerous Node globals — `process`, `globalThis`, `global`, `require`, `module`, `exports`, `Function`, `eval` — are shadowed to `undefined` in the expression scope, so `{{ process.env.SECRET }}` or `@eval(require('child_process')…)` fail. This is **not** a sandbox: a determined property-chain escape (`({}).constructor.constructor(…)`) is not blocked. Treat templates as trusted code.

This keeps the package zero-runtime-dep, agnostic by construction, and free of any embedded JS VM (an earlier QuickJS spike was dropped: two runtimes meant a crash-prone FFI bridge, and V8-in-Node is both simpler and faster).

## File convention

Templates live as `<root>/<name>.inker` files. The caller resolves the root once (absolute path) and passes it at construction. There is no implicit search path, no auto-resolution against `process.cwd()`, no `~` expansion — explicit beats implicit:

```ts
import path from 'node:path'
import { Templates } from '@c9up/inker'

const templates = new Templates({
  root: path.join(process.cwd(), 'resources/templates'),
})

const html = await templates.render('invoice', {
  customer: { name: 'Alice' },
  total: 42,
})
```

The constructor throws `InkerRenderError({ code: 'E_INKER_INVALID_PATH' })` if `root` is relative, missing, or points at a file rather than a directory.

## Interpolation & expressions

Inker mirrors Adonis Edge for output:

```inker
<!-- Escaped (HTML-safe by default — defends against stored XSS) -->
<h1>Hello {{ customer.name }}</h1>

<!-- Raw / unescaped (use deliberately for pre-trusted HTML fragments) -->
<div>{{{ richBody }}}</div>
```

The `expr` between braces is a **full JavaScript expression**, evaluated in V8 with helpers, globals, and the render scope in scope:

```inker
{{ n > 1 ? n * 2 : 0 }}
{{ items.map(i => i.title).join(', ') }}
{{ users.filter(u => u.active).length }}
{{ truncate(post.body, 120) }}
{{ customer?.address?.city ?? 'n/a' }}
```

A value that is a `SafeString` is emitted raw (even in the escaped `{{ }}` form); `null` / `undefined` render as the empty string; scalars stringify (numbers without a trailing `.0`, `-0` → `0`). An expression that references an unknown identifier (or navigates into `null`/`undefined`) throws `E_INKER_UNKNOWN_IDENTIFIER` with the source position.

### Escape characters, comments, whitespace

Use `\{{` / `\}}` to emit literal braces (the backslash is consumed). Edge-style comments are supported and stripped entirely — they emit nothing, and their contents are never parsed:

```inker
Use \{{ name \}} to interpolate.     →   Use {{ name }} to interpolate.
{{-- this note, and any {{ x }} inside it, is stripped --}}
```

An unterminated `{{--` is a hard lex error, so a stray comment open cannot silently swallow the rest of a template.

## Control flow

Adonis-style block tags. `@if` / `@elseif` / `@else` / `@endif`, its negation `@unless`, and `@each` / `@endeach`:

```inker
@if(cart.items.length > 0)
  <p>{{ cart.items.length }} item(s)</p>
@elseif(cart.savedForLater.length)
  <p>Nothing in the cart, but you have saved items.</p>
@else
  <p>Your cart is empty.</p>
@endif

@unless(user.verified)
  <banner>Please verify your email.</banner>
@endunless
```

`@each` iterates arrays, objects, `Map`s, and `Set`s, with an optional `@else` for the empty case:

```inker
@each(item in cart.items)
  <li>{{ item.title }} — {{ item.price }}</li>
@else
  <li>empty</li>
@endeach

@each((value, key) in settings)
  <tr><td>{{ key }}</td><td>{{ value }}</td></tr>
@endeach
```

`(value, index)` binds the element and its position (numeric index for arrays/Sets, property key for objects). Iterating a `null`/`undefined` value throws `E_INKER_INVALID_ITERABLE` and points you at wrapping the loop in `@if()`.

`@let` adds a block-scoped binding for every sibling that follows it, evaluated in a restricted pure-expression grammar:

```inker
@let(total = cart.items.reduce((s, i) => s + i.price, 0))
<p>Total: {{ total }}</p>
```

## Layouts & sections

A child template declares its layout with `@layout` (which must be the first node); the layout injects the child body at `{{> body }}` and named sections at their `@section` yields:

```inker
{{-- layouts/main.inker --}}
<html>
  <head><title>@section('title')Default title@endsection</title></head>
  <body>{{> body }}</body>
</html>
```

```inker
{{-- home.inker --}}
@layout('layouts/main')
@section('title')Home — @super@endsection
<h1>Welcome</h1>
```

In a layout a `@section('name')…@endsection` is a **yield** with default content; in a child it **fills** the matching yield. `@super` inside a child section injects the layout's default content for that section. Names resolve by position — no separate declaration.

## Partials

`@include('name')` renders another template's nodes in the **same** scope; `@includeIf(condition, 'name')` includes only when the condition is truthy:

```inker
@include('partials/header')
@includeIf(user.isAdmin, 'partials/admin-bar')
```

## Components

`@component('name', { props })` renders a component template with its **own** scope built from the passed props (it does not inherit the caller's data). Block body content and `@slot('name')…@endslot` blocks render in the **caller's** scope and are injected at the component's slot outlets:

```inker
{{-- components/card.inker --}}
<div {{ $props.only(['id']).toAttrs() }} class="{{ $props.get('class', 'card') }}">
  <header>{{ title }}</header>
  {{ $slots.main() }}
  @if($slots.footer)<footer>{{ $slots.footer() }}</footer>@endif
</div>
```

```inker
@component('components/card', { title: 'Invoice', class: 'card lg' })
  <p>Body goes to the default (main) slot.</p>
  @slot('footer')<a href="/pay">Pay now</a>@endslot
@endcomponent
```

Inside a component:

- `$props` is a chainable API — `all()`, `get(key, fallback)`, `has(key)`, `only(keys)`, `except(keys)`, `merge(defaults)` (caller props win; `class` is combined), and `toAttrs()` (serialise to an HTML attribute string).
- `$slots.main()` renders the default (body) slot; `$slots.<name>()` a named slot; `$slots.<name>` is `undefined` when absent, so `@if($slots.footer)` works.

## Helpers & globals

Two function layers are always in expression scope:

- **Core globals** — string casing (`camelCase`, `pascalCase`, `snakeCase`, `dashCase`, `titleCase`), text (`truncate`, `excerpt`, `nl2br`), `pluralize`, formatting (`prettyBytes`, `prettyMs`, `ordinal`), `inspect`, and the `html` helpers (`html.attrs`, `html.classNames`, `html.safe`). These mirror Edge's built-in globals.
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

## Custom tags — `registerTag`

Register a custom `@`-tag (AdonisJS/Edge `edge.registerTag` parity). The definition is an object — `{ tagName, block, seekable, compile(parser, buffer, token) }` — and it makes the parser recognise `@<tagName>(jsArg)` in every template:

```ts
import fs from 'node:fs'

templates.registerTag({
  tagName: 'svg',
  block: false,     // inline tag (block tags are not supported yet)
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

Inside `compile`:

- `token.properties.jsArg` is the **verbatim** argument source between the parens.
- `buffer.writeRaw(text)` emits verbatim markup.
- `buffer.outputExpression(jsExpression, filename, line, escape)` evaluates a template expression (a JS source string) in the render scope and emits its value — escaped when `escape` is `true`.
- A `seekable: false` tag rejects any argument; `block: true` is rejected (only inline tags ship for now).

> **Inker deviation (named):** Edge runs `compile` once at template *compilation* (it emits JS). Inker parses in Rust and renders by walking the JSON AST, so `compile` runs at **render** time — the authoring model is identical, there is just no compile phase to imitate. Because a tag name changes how a template *parses*, `registerTag` clears the AST cache; register your tags during boot, before rendering. Registering a name that collides with a built-in directive, or an invalid identifier, throws `E_INKER_INVALID_PATH`; an unregistered `@word` is inert (rendered as literal text, Edge parity).

Types `InkerTag`, `InkerTagBuffer`, `InkerTagToken`, `InkerTagParser` are exported from `@c9up/inker`.

## Debugging — `@eval` / `@dump`

`@eval(expr)` evaluates an expression for its side effects and emits nothing; `@dump(expr)` pretty-prints a value inside a `<pre class="inker-dump">` for debugging:

```inker
@eval(logger.debug('rendering invoice'))
@dump(invoice)
```

## Main API

```ts
import { Templates, InkerRenderError } from '@c9up/inker'

const templates = new Templates({
  root: '/abs/path/to/templates',
  cacheMode: 'auto',  // 'auto' (default) | 'mtime' | 'never'
  helpers: new Map(), // optional registered helpers
})

await templates.render(name, data)      // async; loads <root>/<name>.inker
templates.renderString(source, data)    // sync; renders an in-memory string (no disk directives)
templates.registerTag(definition)       // register a custom @tag (clears the cache)
templates.clearCache()                  // drop the entire AST cache
templates.mount('admin', '/abs/admin')  // named disk → render 'admin::dashboard'
templates.unmount('admin')              // remove a named disk
```

### `render(name, data)`

Async. Resolves `<root>/<name>.inker` from disk, parses (cached), composes layouts / partials / components, and renders with the supplied data. Missing templates throw `InkerRenderError({ code: 'E_INKER_TEMPLATE_NOT_FOUND', context: { templatePath } })` — strict by default; the original `fs.readFile` ENOENT is preserved on `.cause`.

### `renderString(source, data)`

Sync. Renders an in-memory string. It cannot resolve disk-backed directives (`@layout`, `@include`, `@component`, `{{> body }}`) — those throw `E_INKER_DISK_REQUIRED`; use `render(name, data)` instead. Custom tags and every in-string directive (`@if`, `@each`, …) work.

### `mount(diskName, dir)` / `unmount(diskName)`

Named **disks** — AdonisJS/Edge `edge.mount(name, dir)` parity. Mount a second templates directory under a namespace, then address its templates as `diskName::template`:

```ts
templates.mount('admin', '/abs/path/to/admin-templates')

await templates.render('admin::dashboard')   // <admin>/dashboard.inker
await templates.render('home')                // <default root>/home.inker
```

A **bare** name always resolves against the default (constructor `root`) disk; a `disk::name` name resolves against the mounted disk — exactly like Edge. References inside a template resolve the same way, so cross-disk composition is explicit:

```inker
@layout('admin::layout')
@include('admin::partials/sidebar')
@component('admin::button', { label: 'Save' })
```

This is how a **package ships its own views**: it resolves the host's shared renderer, `mount`s its package templates dir under its own namespace, and renders `pkg::template` — see how [Station](./station) mounts its admin views. Containment is enforced against each disk's **own** root (the same path-shape validation and symlink guard as the default root), so mounting a directory never widens traversal out of any root. A disk name must be identifier-shaped (`[A-Za-z0-9_-]+`); path separators and `::` are rejected. `unmount(name)` removes a disk (no-op if absent). Re-mounting a name overwrites its directory.

## Cache semantics

The cache is a per-instance `Map<absPath, { ast, mtimeMs }>` (two `Templates` instances with different roots do NOT share entries — keep `Templates` per-tenant).

The `cacheMode` option resolves ONCE at construction:

| Mode      | Behaviour                                                                           |
|-----------|-------------------------------------------------------------------------------------|
| `'auto'`  | `process.env.NODE_ENV === 'production' ? 'never' : 'mtime'`                          |
| `'mtime'` | Dev posture — `stat()` on every render; reparse when mtime advances                 |
| `'never'` | Prod posture — **never invalidate**; first render wins forever (until `clearCache`) |

`'never'` means "never re-stat / never invalidate", not "never cache" — cached forever is the prod posture. Use `clearCache()` (or `registerTag`, which clears it) to force a re-read.

## Errors

Inker has a single typed error class with a discriminated `code`:

```ts
import { InkerRenderError } from '@c9up/inker'

try {
  await templates.render('invoice', {})
} catch (e) {
  if (e instanceof InkerRenderError) {
    console.error(e.code)                 // 'E_INKER_UNKNOWN_IDENTIFIER'
    console.error(e.context.line)         // 4
    console.error(e.context.column)       // 12
    console.error(e.context.templatePath) // '/abs/path/invoice.inker'
  }
}
```

| Code                              | When                                                                                     |
|-----------------------------------|------------------------------------------------------------------------------------------|
| `E_INKER_TEMPLATE_NOT_FOUND`      | The `<root>/<name>.inker` file does not exist (ENOENT). Original error on `.cause`.       |
| `E_INKER_PARSE_ERROR`             | Lexer or parser rejected the source.                                                     |
| `E_INKER_UNKNOWN_IDENTIFIER`      | An expression referenced an unknown identifier or navigated into `null`/`undefined`.     |
| `E_INKER_INVALID_EXPRESSION`      | An expression failed to compile or produced a non-interpolable value.                    |
| `E_INKER_INVALID_ITERABLE`        | `@each` was given a value that is not an array / object / Map / Set.                      |
| `E_INKER_UNKNOWN_HELPER`          | An unknown helper name was called in an expression.                                      |
| `E_INKER_UNKNOWN_TAG`             | A `@tag` was parsed as a custom tag but no handler is registered.                         |
| `E_INKER_DISK_REQUIRED`          | A disk-backed directive (`@layout`/`@include`/`@component`) was used from `renderString`. |
| `E_INKER_INVALID_PATH`            | Invalid constructor `root`, disk name, or `registerTag` definition.                      |
| `E_INKER_UNCLOSED_INTERPOLATION` / `E_INKER_UNCLOSED_BLOCK` / `E_INKER_MISMATCHED_BLOCK_END` | Structural source errors (unbalanced braces / block tags). |

All errors include `context.line` / `context.column` (1-based) when the failure is source-locatable.

## HTML-escape vs raw

```inker
{{ comment.body }}     <!-- xss-safe by default -->
{{{ comment.body }}}   <!-- explicit raw output -->
```

The escape map covers the HTML-context set plus the two JS line-separator code points (which can break inline `<script>` context):

| Char        | Escapes to  |
|-------------|-------------|
| `&`         | `&amp;`     |
| `<`         | `&lt;`      |
| `>`         | `&gt;`      |
| `"`         | `&quot;`    |
| `'`         | `&#39;`     |
| `` ` ``     | `&#96;`     |
| U+2028      | `&#x2028;`  |
| U+2029      | `&#x2029;`  |

`null` and `undefined` coerce to the empty string in both escape and raw modes — no `"null"` / `"undefined"` strings ever bleed into the output. A `SafeString` returned by a helper (or an expression) is emitted raw even inside `{{ }}`.

## Strict-by-default

Inker shares the framework posture established by Atlas, Rune, and Warden: misconfiguration throws loud, descriptively, immediately.

- Missing templates throw — they do not return `null`.
- Unknown identifiers throw with the source position — they do not render blank.
- Invalid root paths throw at construction — they do not lazy-fail at first render.
- Parse errors throw with line + column — they do not best-effort partial render.

The trade-off is fewer "blank invoice" production bugs at the cost of more discipline up front; for the framework's data-rendering surface (admin pages, invoices, emails), this is the right side of the trade.

## Aurora islands

A helper can return a [SafeString](#html-escape-vs-raw) of server-rendered [Aurora](/en/modules/aurora) markup, embedding a reactive island inside an Inker template — `renderToString(component(data))` on the server, `hydrate(el, component)` on the client. No glue code lives in either package. See [Embedding aurora in inker templates](/en/modules/aurora#embedding-aurora-in-inker-templates).

## Production checklist

- Resolve `root` to an absolute path against your project layout — do not pass relative paths.
- Leave `cacheMode` on `'auto'` so prod gets the fast cached-forever posture without ceremony.
- Register all custom tags at boot (before the first render) — `registerTag` clears the cache.
- Wrap every `render()` / `renderString()` call in a `try/catch` only at the route boundary — let the strict-by-default errors bubble through helpers and view models so misconfiguration is loud.
- Bind `Templates` as a container singleton (the `InkerProvider` does this) — never re-instantiate per request.
- For multi-tenant scenarios with different template roots, keep one `Templates` instance per tenant — the cache is per-instance by design.
