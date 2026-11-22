# Application

This guide covers what the core does and how an application starts:

- What the core actually does
- Minimal bootstrap
- Runtime modes
- Routing and middleware
- Core surface exports
- Module integration
- Production checklist
- Known current limits
- Useful links
- Recommended path
- Positioning
- Application mode
- Minimal bootstrap
- Modes
- Key points

Ream (`@c9up/ream`) is the framework core: app bootstrap, IoC, providers, HTTP server, middleware pipeline, error handling, lifecycle, and module orchestration (`atlas`, `rune`, `warden`, `spectrum`, etc.).

> Status: actively evolving. The target is a batteries-included, convention-first DX with agnostic modular architecture.

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

## Core surface exports

Core exports include:

- `Ignitor`, `Application`, `Provider`,
- `Router`, `Server`, `HttpContext`, `Request`, `Response`,
- `MiddlewareRegistry`,
- `ReamError` and HTTP exceptions,
- lifecycle utilities (`HealthCheck`, graceful shutdown, hot reload).

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
- conventions are still being tightened.

## Useful links

- Lifecycle guide: `/en/guides/concepts/lifecycle`
- Providers guide: `/en/guides/concepts/providers`
- Routing guide: `/en/guides/basics/routing`
- Middleware guide: `/en/guides/basics/middleware`

This section documents `@c9up/ream` as a practical reference.

## Recommended path

1. [Ignitor and bootstrap](/en/guides/concepts/application)
2. [Application lifecycle](/en/guides/concepts/lifecycle)
3. [IoC container](/en/guides/concepts/dependency-injection)
4. [HTTP kernel and routing](/en/guides/basics/middleware)
5. [Errors and exception handling](/en/guides/basics/exception-handling)
6. [Security and operations](/en/guides/security/production)

## Positioning

- Ream orchestrates agnostic modules.
- The core defines framework conventions (providers, lifecycle, middleware).
- Surface is still evolving toward a batteries-included, convention-first DX.

## Application mode

```ts
async start() {
  if (this.app.getMode() !== 'run') return
  await startQueueWorkers()
}
```

`getMode()` is `run` or `warmup`. A codegen or listing command sets `warmup`, so
a provider can skip its **side effects** — starting workers, opening a connection
— while still registering every binding. It must never change *which* bindings
exist: the app being inspected has to match the app that runs, or the generated
types describe something else. `setMode()` refuses after boot.

`Ignitor` is the core entry point: it configures and starts the application.

## Minimal bootstrap

```ts
import { Ignitor } from '@c9up/ream'

await new Ignitor({ port: 3333 })
  .httpServer()
  .routes((router) => {
    router.get('/health', (ctx) => ctx.response.json({ ok: true }))
  })
  .start()
```

## Modes

- `httpServer()` for web/API
- `console()` for commands
- `testMode()` for test scenarios

## Key points

- `useRcFile()` to load framework config
- `provider()` for inline providers
- `use()` / `named()` for global/named middleware
- `onError()` for cross-cutting error handling
