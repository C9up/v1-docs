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
