# Ream — Core Framework

Ream (`@c9up/ream`) is the framework core: app bootstrap, IoC, providers, HTTP server, middleware pipeline, error handling, lifecycle, and module orchestration (`atlas`, `rune`, `warden`, `spectrum`, etc.).

> Status: actively evolving. The target is an Adonis/Laravel-like DX with agnostic modular architecture.

## What the core actually does

1. Boots and configures the app through `Ignitor`.
2. Loads config and providers.
3. Wires router, HTTP kernel, and server.
4. Runs lifecycle (`register -> boot -> start -> ready -> shutdown`).
5. Exposes framework primitives (container, middleware, exceptions, services).

## Minimal bootstrap

```ts
import { Ignitor } from '@c9up/ream'

await new Ignitor({ port: 3333 })
  .httpServer()
  .routes((router) => {
    router.get('/health', (ctx) => {
      ctx.response.status(200).json({ ok: true })
    })
  })
  .start()
```

## Runtime modes

- `httpServer()` for web/API.
- `console()` for CLI commands.
- `testMode()` for testing scenarios.

```ts
const ignitor = new Ignitor({ port: 3333 }).httpServer()
await ignitor.start()
```

## Lifecycle (critical)

Execution order:

1. `register` - container bindings, config, providers.
2. `boot` - external deps initialization.
3. `start` - server/runtime start.
4. `ready` - app is operational.
5. `shutdown` - graceful teardown.

Practical rule:

- `register`: no blocking IO.
- `boot`: DB/bus/cache connections.
- `shutdown`: close resources, workers, timers.

## Providers (recommended pattern)

```ts
import { Provider } from '@c9up/ream'
import { CacheManager, MemoryDriver } from '@c9up/echo'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton('cache', () => {
      return new CacheManager(new MemoryDriver(), { prefix: 'app', ttl: 300 })
    })
  }
}
```

## IoC container

The container is used to:

- register singletons/services,
- resolve class dependencies,
- swap implementations (tests/env).

Best practices:

- bind via stable tokens (`'cache'`, `'db'`, `'bus'`),
- keep factory side effects minimal,
- centralize bindings in providers.

## Routing and middleware

```ts
await new Ignitor()
  .httpServer()
  .use(async (ctx, next) => {
    const start = Date.now()
    await next()
    ctx.response.header('x-duration-ms', String(Date.now() - start))
  })
  .routes((router) => {
    router.get('/users/:id', async (ctx) => {
      ctx.response.json({ id: ctx.params.id })
    })
  })
  .start()
```

Recommended pipeline order:

1. technical middleware (request-id, timing, body parser),
2. security middleware (cors, headers, rate limit, shield),
3. auth/acl middleware,
4. business route/controller logic.

## Error handling

Use framework exceptions (`E_UNAUTHORIZED`, `E_FORBIDDEN`, etc.) and a central handler.

```ts
import { E_UNAUTHORIZED } from '@c9up/ream'

if (!token) {
  throw new E_UNAUTHORIZED('Bearer token required')
}
```

Rules:

- never return raw internal errors to clients,
- log actionable context without leaking secrets,
- map business errors to coherent HTTP status codes.

## Core surface exports

Core exports include:

- `Ignitor`, `Application`, `Provider`,
- `Router`, `Server`, `HttpContext`, `Request`, `Response`,
- `MiddlewareRegistry`,
- `ReamError` and HTTP exceptions,
- lifecycle utilities (`HealthCheck`, graceful shutdown, hot reload).

## Validating a request

`request.validateUsing(validator)` runs a validator over the request — body and
query merged, with `params`, `headers` and `cookies` nested under their own
keys so a form field can never rename a route parameter.

```typescript
const data = await request.validateUsing(CreateUser)
```

It throws `E_VALIDATION_ERROR` on failure; `tryValidateUsing` answers
`[error, null]` / `[null, data]` instead, for a handler that re-renders the
form itself.

Two hooks make a validator request-aware without the schema knowing anything
about it. A package installs them once, at boot:

```typescript
import { RequestValidator } from '@c9up/ream'

RequestValidator.messagesProvider = (ctx) => ctx.i18n.createMessagesProvider()
RequestValidator.errorReporter = (ctx) => ctx.myReporter
```

An option passed at the call site outranks either hook, and nothing else in the
framework reads them — a validator called directly keeps whatever it was built
with.

## Signed URLs

`SignedUrl` (from `@c9up/ream/security`) emits HMAC-SHA256-signed URLs
with an optional expiry. The receiving handler calls `verify()` to
re-derive the signature and reject tampered or expired links.

```ts
import { SignedUrl } from '@c9up/ream/security'

const su = new SignedUrl({ secret: process.env.SIGNING_SECRET! })

// 1-hour link to /downloads/<id>
const url = su.make('/downloads/abc-123', { expiresIn: '1h' })

// Verifier handler
if (!su.verify(req.url)) {
  return res.status(403).json({ error: 'E_BAD_SIGNATURE' })
}
```

`expiresIn` accepts a numeric seconds value or a suffixed string
(`s`/`m`/`h`/`d`). `expiresIn: 0` stamps the current epoch as the
expiry — the URL is valid for the current second only and becomes
invalid as soon as the wall clock advances. The previous truthy guard
silently treated `0` as "no expiry", which was a security bug; the
current behaviour matches caller intent.

`purpose` binds the URL to a named flow:

```ts
const reset = su.make('/auth/reset', { expiresIn: '30m', purpose: 'pwd-reset' })
if (!su.verify(reset, 'pwd-reset')) return /* 403 */
```

A token issued for one purpose can't be replayed against another.

## Static files

Register the provider and `public/` is served — that is the whole setup.

```ts
// reamrc.ts
providers: [() => import('@c9up/ream/storage/provider')]
```

`public/logo.png` is then `GET /logo.png`. No route is declared for it, and a
request that matches no file falls through to the router untouched.

Defaults, tuned in `config/static.ts`:

```ts
import { defineStaticConfig } from '@c9up/ream'

export default defineStaticConfig({
  maxAge: 86_400_000,   // milliseconds; `Cache-Control: max-age` is seconds
  immutable: true,      // only honoured alongside a maxAge
})
```

| Option | Default | What it does |
| --- | --- | --- |
| `enabled` | `true` | `false` makes every request fall through |
| `root` | `public/` | Directory served |
| `acceptRanges` | `true` | `206` for `Range`, so a client can seek in audio and video |
| `cacheControl` | `true` | Emit `Cache-Control`; `false` ignores `maxAge` and `immutable` |
| `dotFiles` | `'ignore'` | `'deny'` answers 403, `'allow'` serves them |
| `etag` | `true` | `ETag` and `If-None-Match` |
| `extensions` | none | **Fallback** list: `['html']` makes `/about` serve `about.html` |
| `immutable` | `false` | Adds `immutable` to `Cache-Control` |
| `index` | `'index.html'` | Index file for a directory request; `false` disables |
| `lastModified` | `true` | `Last-Modified` and `If-Modified-Since` |
| `maxAge` | `0` | Milliseconds |
| `prefix` | none | Serve only under a URL prefix |

`extensions` is a fallback list, not an allowlist — there is no allowlist, and
every extension is served. What keeps a file private is not publishing it here.

### What cannot be reached

A request cannot leave the root. Traversal is normalised away before anything
is opened, percent-encoded forms included (`%2e%2e%2f`), and a malformed
sequence is refused rather than raised. A symlink planted inside the root that
points outside it is refused, whether it is a file or a directory, and so is a
sibling directory that merely shares a name prefix with the root.

The file is opened with `O_NOFOLLOW` and its metadata read from the descriptor
rather than re-read by path, so the bytes served are the ones that passed the
checks — a symlink swapped in after the check fails the open instead of
redirecting the read.

Dotfiles are ignored by default, so an `.env` that ends up in the served
directory is not published by accident. A file without a leading dot is: the
directory is the public one.

## Module integration

## Module integration

The core is the orchestrator. Modules remain standalone, but Ream simplifies composition:

- `atlas` ORM,
- the event bus (core),
- `warden` auth,
- `rune` validation,
- `spectrum` logging,
- `echo` cache,
- `bay` queue/jobs.

## Production checklist

1. set `NODE_ENV=production`.
2. enable security middleware (configured shield/rate limit/cors).
3. centralize exception handling with safe output.
4. verify graceful shutdown behavior (SIGTERM/SIGINT).
5. enforce explicit timeouts (DB, outbound HTTP, jobs).
6. include correlation IDs in logs/errors.
7. expose health/readiness endpoints.

## Known current limits

- API surface is still evolving,
- some documentation areas are still catching up,
- ongoing convergence toward stricter Adonis-like conventions.

## Useful links

- Lifecycle guide: `/en/guide/lifecycle`
- Providers guide: `/en/guide/providers`
- Routing guide: `/en/guide/routing`
- Middleware guide: `/en/guide/middleware`
- Ream package corrections: `/en/corrections/ream`
