# Middleware

Middleware intercepts HTTP requests before they reach the route handler. Ream uses an onion pattern: code before `await next()` runs on the way in, code after runs on the way out. All middleware is registered in `start/kernel.ts`.

## Middleware Classes

The standard form is a class with a `handle` method. This matches the `MiddlewareClass` interface expected by `server.use()` and `router.use()`:

```typescript
// app/middleware/log_request_middleware.ts
import type { HttpContext } from '@c9up/ream'

export default class LogRequestMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`${ctx.request.method()} ${ctx.request.path()} ${ctx.response.getStatus()} — ${ms}ms`)
  }
}
```

## The Kernel File

Register all middleware in `start/kernel.ts`. This file is a preload — the Ignitor imports it before handling any requests:

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'
import server from '@c9up/ream/services/server'

// Custom error handler
server.errorHandler(() => import('#exceptions/handler.js'))

// Server middleware — runs on ALL requests, even 404s
server.use([
  () => import('#middleware/log_request_middleware.js'),
  () => import('#middleware/cors_middleware.js'),
])

// Router middleware — runs only on matched routes
router.use([
  () => import('#middleware/auth_middleware.js'),
])

// Named middleware — must be explicitly assigned to routes
export const middleware = router.named({
  admin: () => import('#middleware/admin_middleware.js'),
  throttle: () => import('#middleware/throttle_middleware.js'),
})
```

Register the kernel as a preload in `reamrc.ts`:

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  preloads: [
    () => import('./start/kernel.js'),
  ],
  modules: { path: './app/modules' },
})
```

## Three Levels of Middleware

### Server Middleware

Registered via `server.use()`. Runs on every HTTP request — including requests that do not match any route. This is the right place for logging, CORS headers, and request tracing.

```typescript
server.use([
  () => import('#middleware/log_request_middleware.js'),
])
```

### Router Middleware

Registered via `router.use()`. Runs only when a route matches. Executes after server middleware and before any route-specific middleware:

```typescript
router.use([
  () => import('#middleware/auth_middleware.js'),
])
```

### Named Middleware

Registered via `router.named()`. Must be explicitly assigned to individual routes or groups. The return value is a typed map — export it so route files can reference the names:

```typescript
export const middleware = router.named({
  admin: () => import('#middleware/admin_middleware.js'),
  throttle: () => import('#middleware/throttle_middleware.js'),
})
```

Assign to a route:

```typescript
router.get('/admin/dashboard', [AdminController, 'index']).middleware('admin')
router.post('/orders', [OrdersController, 'store']).middleware('throttle')
```

Assign to a group:

```typescript
router.group(() => {
  router.get('/users', [UsersController, 'index'])
  router.post('/users', [UsersController, 'store'])
}).prefix('/admin').middleware('admin')
```

## Inline Middleware

Attach a one-off middleware function directly to a route with `.use()`. Useful for route-specific logic that does not warrant a full class:

```typescript
router.get('/report', [ReportController, 'index']).use(async (ctx, next) => {
  ctx.store.set('report-format', ctx.request.input('format', 'json'))
  await next()
})
```

Multiple inline middleware execute in the order they are chained:

```typescript
router
  .post('/upload', [UploadController, 'store'])
  .use(validateContentType)
  .use(checkQuota)
```

## Execution Order

For a matched route the pipeline executes in this fixed order:

```
1. Server middleware        (server.use — runs on all requests)
2. Router middleware        (router.use — runs on matched routes)
3. Named middleware         (route.middleware('name') or group.middleware('name'))
4. Inline middleware        (route.use(fn))
5. Guard enforcement        (route.guard / .role / .permission)
6. Route handler
```

All layers wrap each other in the onion pattern, so code after `await next()` runs in reverse order:

```typescript
// Example illustrating order
export default class TraceMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    console.log('before handler')   // runs first
    await next()
    console.log('after handler')    // runs last
  }
}
```

## Short-Circuiting

A middleware can stop the pipeline by not calling `next()`. The handler and all downstream middleware will not execute:

```typescript
export default class MaintenanceModeMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    if (process.env.MAINTENANCE === 'true') {
      ctx.response.status(503).json({ error: 'Service temporarily unavailable' })
      return   // next() is not called — pipeline stops here
    }
    await next()
  }
}
```

## Lazy Loading

All entries passed to `server.use()`, `router.use()`, and `router.named()` are lazy imports — functions that return a promise. The module is loaded on the first request that hits that middleware and then cached:

```typescript
// This is a lazy import — the module is not loaded until needed
() => import('#middleware/heavy_middleware.js')
```

Direct middleware functions (two-parameter `(ctx, next)` functions) are also accepted when you do not need a class:

```typescript
server.use([
  async (ctx, next) => {
    ctx.response.header('x-powered-by', 'Ream')
    await next()
  },
])
```

## Writing Auth Middleware

A typical auth middleware reads a token, verifies it, and populates `ctx.auth`:

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { TokenService } from '#services/token_service.js'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const header = ctx.request.header('authorization') ?? ''
    const token = header.replace(/^Bearer\s+/, '')

    if (token) {
      const payload = await TokenService.verify(token)
      if (payload) {
        ctx.auth = {
          authenticated: true,
          user: { id: payload.sub, email: payload.email },
          roles: payload.roles ?? [],
          permissions: payload.permissions ?? [],
        }
      }
    }

    await next()
  }
}
```

Once `ctx.auth` is populated, route-level guards (`.guard('jwt')`, `.role('admin')`, `.permission('orders:write')`) are enforced automatically by the pipeline — you do not need to check them manually in the middleware.

## The HttpContext in Middleware

Every middleware receives the same `HttpContext` that flows through the full pipeline. Use `ctx.store` to pass data between middleware layers:

```typescript
// Upstream middleware sets a value
ctx.store.set('tenant-id', resolveTenant(ctx.request))

// Downstream middleware or handler reads it
const tenantId = ctx.store.get('tenant-id') as string
```

Key properties available in every middleware:

```typescript
ctx.id                      // Correlation ID (x-request-id or UUID)
ctx.request.method()        // 'GET' | 'POST' | ...
ctx.request.path()          // '/api/users'
ctx.request.header('key')   // Single header value
ctx.request.ip()            // Client IP
ctx.auth                    // { authenticated, user?, roles?, permissions? }
ctx.params                  // Route params { id: '...' }
ctx.response.status(code)   // Set response status (chainable)
ctx.response.header(k, v)   // Set response header (chainable)
ctx.response.json(data)      // Send JSON response
ctx.store                   // Per-request Map for passing data downstream
```

## Next Steps

- [Routing](/en/guide/routing) — Controllers, groups, and named routes
- [Warden](/en/modules/warden) — Authentication strategies and RBAC
- [Container](/en/guide/container) — Dependency injection in middleware classes
