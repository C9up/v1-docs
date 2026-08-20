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

Three drivers ship with ream:

| driver | where the session lives | notes |
|---|---|---|
| `cookie` | in the signed cookie itself | no server state; a payload over ~4KB does not fit |
| `memory` | in the process | fine for one instance, lost on restart |
| `redis` | on a Redis server | shared across instances, survives restarts |

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
