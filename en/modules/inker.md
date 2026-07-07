# Inker — Server-side Templates

Inker is the server-side templating module in the Ream ecosystem (`@c9up/inker`).

> Status: Story 53.1 has landed the minimum credible engine — hand-rolled lexer + parser + renderer with HTML-escape-by-default interpolation, member-access expression resolution, and a per-instance AST cache. Layouts (53.2), control flow (53.3), helpers (53.4), the Ream provider (53.5), and the agnostic `@c9up/inker/testing` sub-path (53.6) all land in subsequent stories.

## Why hand-rolled

The epic explicitly forbids pulling in a templating dependency (Handlebars, Mustache, Eta, EJS, Pug, Nunjucks, even Edge.js itself). Inker is a hand-rolled lexer + AST + renderer trifecta:

- The lexer is a single forward scan over the source — no regex-only paths.
- The parser walks the token stream linearly, freezes the AST, and uses a TypeScript exhaustiveness check so a new node kind in 53.2-53.4 is a compile-time error if the renderer forgets to extend.
- The renderer accumulates into a `string[]` buffer and joins at the end (memory-friendly vs. `+=` concatenation).

This makes the package zero-peer-dep, agnostic by construction, and easy to extend story by story.

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

## Interpolation syntax

Inker mirrors Adonis Edge for output:

```inker
<!-- Escaped (HTML-safe by default — defends against stored XSS) -->
<h1>Hello {{ customer.name }}</h1>

<!-- Raw / unescaped (use deliberately for pre-trusted HTML fragments) -->
<div>{{{ richBody }}}</div>
```

The `expr` between braces is a **member-access path**, not a JavaScript expression. 53.1 supports:

| Form               | Resolves to                              |
|--------------------|------------------------------------------|
| `name`             | `data.name`                              |
| `customer.name`    | `data.customer.name`                     |
| `items[0]`         | `data.items[0]` (non-negative int only)  |
| `items["weird k"]` | `data["weird k"]` (`\"`/`\'`/`\\` only)  |
| `items[0].title`   | nested mix                               |

Arithmetic (`a + b`), function calls (`fn(x)`), ternaries (`a ? b : c`), optional chaining (`a?.b`), and template literals all throw `E_INKER_PARSE_ERROR` with a descriptive reason — full JS-expression evaluation arrives with helpers in Story 53.4.

### Escape characters

Use `\{{` and `\}}` to emit literal `{{` / `}}` in the rendered output (the backslash is consumed):

```inker
Use \{{ name \}} to interpolate.   →   Use {{ name }} to interpolate.
```

### Whitespace and comments

53.1 preserves every byte outside interpolation braces verbatim. Edge's `{{- expr -}}` whitespace-trim syntax and `{{-- comment --}}` comment syntax are NOT implemented in 53.1 (deferred per Story 53.1 D7); render output is byte-stable against the source.

## Main API

```ts
import { Templates, InkerRenderError } from '@c9up/inker'

const templates = new Templates({
  root: '/abs/path/to/templates',
  cacheMode: 'auto',  // 'auto' (default) | 'mtime' | 'never'
})

await templates.render(name, data)      // async; loads <root>/<name>.inker
templates.renderString(source, data)    // sync; renders an in-memory string
templates.clearCache()                  // drop the entire AST cache
templates.mount('admin', '/abs/admin')  // named disk → render 'admin::dashboard'
templates.unmount('admin')              // remove a named disk
```

### `render(name, data)`

Async. Resolves `<root>/<name>.inker` from disk, parses (cached), renders with the supplied data object:

```ts
const html = await templates.render('invoice', {
  customer: { name: 'Alice' },
  total: 42,
})
```

Missing templates throw `InkerRenderError({ code: 'E_INKER_TEMPLATE_NOT_FOUND', context: { templatePath } })` — strict by default; no silent fallback. The original `fs.readFile` ENOENT is preserved on `.cause`.

### `renderString(source, data)`

Sync. Useful for inline templates, one-shot rendering, and the controller-side `inker.render()` Story 53.5 builds on top:

```ts
const fragment = templates.renderString(
  '<li>{{ item.title }}</li>',
  { item: { title: 'Widget' } },
)
```

No cache key — the caller is responsible for caching its own template sources.

### `clearCache()`

Drops every cached AST. Used by Story 53.5's provider on `shutdown` and by tests asserting cache-bust behaviour.

### `mount(diskName, dir)` / `unmount(diskName)`

Named **disks** — AdonisJS/Edge `edge.mount(name, dir)` parity. Mount a second templates directory under a namespace, then address its templates as `diskName::template`:

```ts
templates.mount('admin', '/abs/path/to/admin-templates')

await templates.render('admin::dashboard')   // <admin>/dashboard.inker
await templates.render('home')                // <default root>/home.inker
```

A **bare** name always resolves against the default (constructor `root`) disk; a `disk::name` name resolves against the mounted disk — exactly like Edge. References inside a template are resolved the same way, so cross-disk composition is explicit:

```inker
{% layout 'admin::layout' %}
{% include 'admin::partials/sidebar' %}
{% component 'admin::button' { label: 'Save' } %}
```

This is how a **package ships its own views**: it resolves the host's shared renderer, `mount`s its package templates dir under its own namespace, and renders `pkg::template` — see how [Station](./station) mounts its admin views. Containment is enforced against each disk's **own** root (the same path-shape validation and symlink guard as the default root), so mounting a directory never widens traversal out of any root. A disk name must be identifier-shaped (`[A-Za-z0-9_-]+`); path separators and `::` are rejected. `unmount(name)` removes a disk (no-op if absent). Re-mounting a name overwrites its directory.

## Cache semantics

The cache is a per-instance `Map<absPath, { ast, mtimeMs }>` (two `Templates` instances with different roots do NOT share entries — keep `Templates` per-tenant).

The `cacheMode` option resolves ONCE at construction:

| Mode      | Behaviour                                                                           |
|-----------|-------------------------------------------------------------------------------------|
| `'auto'`  | `process.env.NODE_ENV === 'production' ? 'never' : 'mtime'`                         |
| `'mtime'` | Dev posture — `stat()` on every render; reparse when mtime advances                 |
| `'never'` | Prod posture — **never invalidate**; first render wins forever (until `clearCache`) |

Note: `'never'` means "never re-stat / never invalidate", not "never cache" — cached forever is the prod posture. Use `clearCache()` to force a re-read.

```ts
// dev (auto-derived from NODE_ENV !== 'production')
const dev = new Templates({ root })

// CI / test scenario where you want explicit hot-reload
const reload = new Templates({ root, cacheMode: 'mtime' })

// explicit prod (also implicit when NODE_ENV=production)
const prod = new Templates({ root, cacheMode: 'never' })
```

## Errors

Inker has a single typed error class with a discriminated `code`:

```ts
import { InkerRenderError } from '@c9up/inker'

try {
  await templates.render('invoice', {})
} catch (e) {
  if (e instanceof InkerRenderError) {
    console.error(e.code)              // 'E_INKER_UNKNOWN_IDENTIFIER'
    console.error(e.context.line)      // 4
    console.error(e.context.column)    // 12
    console.error(e.context.expression)// 'customer.name'
    console.error(e.context.templatePath) // '/abs/path/invoice.inker'
  }
}
```

| Code                              | When                                                                                     |
|-----------------------------------|------------------------------------------------------------------------------------------|
| `E_INKER_TEMPLATE_NOT_FOUND`      | The `<root>/<name>.inker` file does not exist (ENOENT). Original error on `.cause`.      |
| `E_INKER_PARSE_ERROR`             | Lexer or path parser rejected the source (empty interpolation, JS-expression, bad path). |
| `E_INKER_UNKNOWN_IDENTIFIER`      | The data object did not own the resolved member-access path (strict; no silent fallback).|
| `E_INKER_INVALID_PATH`            | The constructor's `root` is relative, missing, or points at a file.                      |
| `E_INKER_UNCLOSED_INTERPOLATION`  | The lexer hit EOF or an asymmetric brace before a matching close.                        |

All errors include `context.line` / `context.column` (1-based, source-position) when the failure is source-locatable, and `context.expression` (the verbatim text of the offending interpolation).

## HTML-escape vs raw

```inker
<!-- xss-safe by default -->
{{ comment.body }}

<!-- explicit raw output -->
{{{ comment.body }}}
```

The escape map matches the canonical OWASP HTML-context escape set:

| Char | Escapes to |
|------|------------|
| `&`  | `&amp;`    |
| `<`  | `&lt;`     |
| `>`  | `&gt;`     |
| `"`  | `&quot;`   |
| `'`  | `&#39;`    |

`null` and `undefined` coerce to the empty string in both escape and raw modes — no `"null"` / `"undefined"` strings ever bleed into the output.

## Strict-by-default

Inker shares the framework posture established by Atlas, Rune, and Warden: misconfiguration throws loud, descriptively, immediately. Specifically:

- Missing templates throw — they do not return `null`.
- Unknown identifiers throw with the path consumed so far — they do not render blank.
- Invalid root paths throw at construction — they do not lazy-fail at first render.
- Parse errors throw with line + column — they do not best-effort partial render.

The trade-off is fewer "blank invoice" production bugs at the cost of more discipline up front; for the framework's data-rendering surface (admin pages, invoices, emails), this is the right side of the trade.

## Limitations in 53.1

These are deliberate and tracked by the named follow-up story:

- **No layouts / partials** — Story 53.2 adds `{% layout %}` / `{% include %}`.
- **No control flow** — Story 53.3 adds `@if` / `@each` / `@component` (Adonis-style block tags).
- **No helpers** — Story 53.4 adds `t()` / `csrfField()` / `url()` / `asset()` and the helpers-aware expression evaluator.
- **No Ream provider** — Story 53.5 adds `inker.render(ctx, name, data)` and the container-singleton wiring.
- **No `@c9up/inker/testing`** — Story 53.6 adds the agnostic fake renderer with `assertRendered(name, dataMatcher)` style assertions.

## Aurora islands

A helper can return a [SafeString](#html-escape-vs-raw) of server-rendered [Aurora](/en/modules/aurora) markup, embedding a reactive island inside an Inker template — `renderToString(component(data))` on the server, `hydrate(el, component)` on the client. No glue code lives in either package. See [Embedding aurora in inker templates](/en/modules/aurora#embedding-aurora-in-inker-templates).

## Production checklist

- Resolve `root` to an absolute path against your project layout — do not pass relative paths.
- Leave `cacheMode` on `'auto'` so prod gets the fast cached-forever posture without ceremony.
- Wrap every `render()` / `renderString()` call in a `try/catch` only at the route boundary — let the strict-by-default errors bubble through helpers and view models so misconfiguration is loud.
- Bind `Templates` as a container singleton (Story 53.5's `InkerProvider` will do this for you) — never re-instantiate per request.
- For multi-tenant scenarios with different template roots, keep one `Templates` instance per tenant — the cache is per-instance by design.
