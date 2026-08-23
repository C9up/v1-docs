# Ream Core

This section documents `@c9up/ream` as a practical reference.

## Recommended path

1. [Ignitor and bootstrap](/en/ream/ignitor)
2. [Application lifecycle](/en/ream/lifecycle)
3. [IoC container](/en/ream/ioc-container)
4. [HTTP kernel and routing](/en/ream/http-kernel)
5. [Errors and exception handling](/en/ream/errors)
6. [Security and operations](/en/ream/security-ops)

## Positioning

- Ream orchestrates agnostic modules.
- The core defines framework conventions (providers, lifecycle, middleware).
- Surface is still evolving toward an Adonis/Laravel-like DX.

## HTTP Context

### Per-request logger — `ctx.logger`

Every request context carries `ctx.logger`, a logger scoped to that request. It
resolves the container's `'logger'` binding (a `@c9up/spectrum` logger) as a child
scoped to the request id, so every line is correlated to the request; when no
logger is registered it falls back to `console`. The signature is **message-first**:

```ts
router.get('/orders/:id', async (ctx) => {
  ctx.logger.info('saved', { id: ctx.params.id })
})
```

### Ambient access — `HttpContext.get()` / `getOrFail()`

`HttpContext` exposes the current request context through `AsyncLocalStorage`, so
any code anywhere in the call stack can reach it without threading `ctx` through
every function (AdonisJS parity).

```ts
import { HttpContext } from '@c9up/ream'

const ctx = HttpContext.get()        // current context, or undefined outside a request
const ctx2 = HttpContext.getOrFail() // throws if called outside a request
```

`get()` returns `undefined` outside a request; `getOrFail()` throws — use it when a
request context is required.

### Request session — `ctx.session`

When `SessionMiddleware` is registered, the request session is exposed as a
top-level `ctx.session` (AdonisJS parity) — `ctx.session.get()` / `.put()` /
`.forget()` / `.regenerate()`. It's top-level so consumers and Warden's session
guard read `ctx.session` directly rather than fishing it out of `ctx.store`. It's
`undefined` when no session middleware ran.

### Session drivers

Five drivers ship with ream:

| driver | where the session lives | notes |
|---|---|---|
| `cookie` | in the signed cookie itself | no server state; a payload over ~4KB does not fit |
| `memory` | in the process | fine for one instance, lost on restart; capped at 10 000 live sessions |
| `file` | one file per session on disk | survives a restart without a Redis; one machine only |
| `database` | a `sessions` table | shared across instances when they share a database |
| `redis` | on a Redis server | shared across instances, survives restarts |

The `file` driver takes the directory to write to; the `database` driver takes a
connection exposing `query()` / `execute()` and, optionally, the table name:

```ts
// config/session.ts
export default { driver: 'file', location: app.tmpPath('sessions') }

// or
export default {
  driver: 'database',
  dbConnection: db.connection(),
  tableName: 'sessions',   // default
}
```

The `database` table is `id` (varchar, primary key), `data` (text) and
`expires_at` (bigint, epoch ms). Nothing prunes it on its own — call
`driver.prune()` from a scheduled job.

### Session config

Both spellings are accepted, so an AdonisJS `config/session.ts` runs unchanged:

```ts
export default defineConfig({
  store: 'redis',                          // AdonisJS; `driver` also works
  stores: { redis: { driver: 'redis' } },  // the named store supplies the driver
  age: '2h',                               // AdonisJS; `maxAge: 7200` also works
})
```

`age` accepts seconds or a duration string (`30m`, `2h`, `7d`). A value it
cannot read throws at construction rather than becoming `NaN` — which would
expire every session at once.

### Flash messages

`flashAll()` takes **no argument**: it reads the request's own input, which is
what repopulates a form after a redirect back.

```ts
session.flashAll()                       // the whole input
session.flashOnly(['email'])             // just these keys
session.flashExcept(['password'])        // everything but these
session.flash({ notice: 'Saved' })       // a key/value or an object
session.flashErrors({ email: 'Taken' })  // into `errorsBag`
session.flashValidationErrors(error)     // inputErrorsBag + errorsBag + input
```

`reflash()` / `reflashOnly(keys)` / `reflashExcept(keys)` keep the PREVIOUS
request's flash for one more hop — what a redirect chain needs so a message
survives.

Templates read the same data through `flashMessages`, `old()` and the
`@error` / `@errors` / `@inputError` / `@flashMessage` tags.

### Intended URL

Store where the user was heading before sending them to a login page, then read
it back after:

```ts
session.setIntendedUrl(ctx.request.url(true))
// …after a successful login
return response.redirect(session.pullIntendedUrl() ?? '/dashboard')
```

`getIntendedUrl()` reads without consuming; `clearIntendedUrl()` drops it.

The `redis` driver takes a client, or names a [Quasar](/en/modules/quasar) connection:

```ts
// config/session.ts
export default {
  driver: 'redis',
  connection: 'sessions',   // a quasar connection; omit for the default one
  prefix: 'ream:session:',
}
```

Nothing is dialled while the config is read: the connection resolves on the first request that touches a session. `@c9up/quasar` is an **optional** peer — cookie and memory sessions never reach for it. An app that already holds a client can pass it directly as `client` instead of naming a connection.
