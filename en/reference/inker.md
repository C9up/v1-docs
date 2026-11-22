# inker

This guide covers the inker API, cache, errors and production checklist:

- Main API
- Cache semantics
- Errors
- Production checklist

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

Named **disks**. Mount a second templates directory under a namespace, then address its templates as `diskName::template`:

```ts
templates.mount('admin', '/abs/path/to/admin-templates')

await templates.render('admin::dashboard')   // <admin>/dashboard.inker
await templates.render('home')                // <default root>/home.inker
```

A **bare** name resolves against the default disk — the constructor `root`, until `templates.mount(dir)` (or `mount('default', dir)`) re-points it; `templates.mounted.default` reports the root in force. A `disk::name` name resolves against the mounted disk. An in-memory template (`registerTemplate`) answers only the name it was registered under, disk prefix included. A name already registered is refused with `E_INKER_TEMPLATE_COLLISION` rather than replaced — two packages shipping a template under one name would otherwise render each other's markup; `removeTemplate(name)` first is the explicit replace. References inside a template resolve the same way, so cross-disk composition is explicit:

```inker
@layout('admin::layout')
@include('admin::partials/sidebar')
@component('admin::button', { label: 'Save' })
```

This is how a **package ships its own views**: it resolves the host's shared renderer, `mount`s its package templates dir under its own namespace, and renders `pkg::template` — see how [Station](/en/guides/digging-deeper/admin/) mounts its admin views. Containment is enforced against each disk's **own** root (the same path-shape validation and symlink guard as the default root), so mounting a directory never widens traversal out of any root. A disk name must be identifier-shaped (`[A-Za-z0-9_-]+`); path separators and `::` are rejected. `unmount(name)` removes a disk (no-op if absent). Re-mounting a name overwrites its directory.

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
| `E_INKER_UNKNOWN_IDENTIFIER`      | An expression navigated into `null`/`undefined`.                                          |
| `E_INKER_INVALID_EXPRESSION`      | An expression failed to compile or produced a non-interpolable value.                    |
| `E_INKER_INVALID_ITERABLE`        | `@each` was given a value that is not an array / object / Map / Set.                      |
| `E_INKER_RENDER_DEPTH`            | Partials/components nested more than 100 deep, or a helper overflowed the stack.          |
| `E_INKER_ENGINE_MISSING`          | `inker.share().render()` ran before `InkerProvider` built an engine.                      |
| `E_INKER_UNKNOWN_TAG`             | A `@tag` was parsed as a custom tag but no handler is registered.                         |
| `E_INKER_DISK_REQUIRED`          | A disk-backed directive (`@layout`/`@include`/`@component`) was used from `renderString`. |
| `E_INKER_INVALID_PATH`            | Invalid constructor `root`, disk name, or `registerTag` definition.                      |
| `E_INKER_TEMPLATE_COLLISION`      | `registerTemplate` was given a name already registered (`removeTemplate` it first).      |
| `E_INKER_UNCLOSED_INTERPOLATION` / `E_INKER_UNCLOSED_BLOCK` / `E_INKER_MISMATCHED_BLOCK_END` | Structural source errors (unbalanced braces / block tags). |

All errors include `context.line` / `context.column` (1-based) when the failure is source-locatable.

## Production checklist

- Resolve `root` to an absolute path against your project layout — do not pass relative paths.
- Leave `cacheMode` on `'auto'` so prod gets the fast cached-forever posture without ceremony.
- Register all custom tags at boot (before the first render) — `registerTag` clears the cache.
- Wrap every `render()` / `renderString()` call in a `try/catch` only at the route boundary — let the strict-by-default errors bubble through helpers and view models so misconfiguration is loud.
- Bind `Templates` as a container singleton (the `InkerProvider` does this) — never re-instantiate per request.
- For multi-tenant scenarios with different template roots, keep one `Templates` instance per tenant — the cache is per-instance by design.
