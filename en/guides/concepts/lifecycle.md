# Application lifecycle

This guide covers the phases of an application:

- `bin/server.ts` — the entry point
- Ignitor constructor
- Builder methods
- Phase 1 — REGISTER
- Phase 2 — BOOT
- Phase 3 — START
- Phase 4 — READY
- Shutdown
- Application hooks
- Environment properties
- Service singletons
- Lifecycle summary
- Execution order
- Practical rules
- Recommendation
- Lifecycle (critical)

Ream follows a four-phase startup sequence. Every provider, preload file, and module route file has a defined moment when it runs. Understanding this sequence tells you exactly where to put initialization code.

![The lifecycle of a ream application, started by bin/server.ts. 1 REGISTER, synchronous: load every file of config/, instantiate the providers of reamrc.ts, provider.register() binds services in the container. 2 BOOT: booting hooks (start/env.ts validates the environment), provider.boot() connects services, booted hooks. 3 START, no request served yet: provider.start(), starting hooks, preloads start/routes.ts and start/kernel.ts, module routes and events of app/modules. 4 READY: the HTTP server listens, provider.ready(), ready hooks. 5 SHUTDOWN, on SIGTERM, SIGINT or app.terminate(): terminating hooks, the HTTP server drains in-flight requests for up to 30 seconds, provider.shutdown() in reverse order.](/images/lifecycle-en.webp){width=640 height=640 loading=lazy}

## `bin/server.ts` — the entry point

The canonical entry point for a Ream HTTP server:

```typescript
// bin/server.ts
import { Ignitor, prettyPrintError } from '@c9up/ream'

const APP_ROOT = new URL('../', import.meta.url)

new Ignitor(APP_ROOT, { port: 3000 })
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .useRcFile((await import('../reamrc.js')).default)
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
```

### reflect-metadata

Constructor injection reads the constructor types that TypeScript records on a decorated class (`emitDecoratorMetadata`). TypeScript only records them if the `reflect-metadata` package is loaded before the class is defined. Otherwise it skips them without an error, and the container has nothing to inject.

You do not import it yourself. `@c9up/ream` loads it at the top of its entry, and so do `@c9up/atlas` and `@c9up/warden`. A module runs its imports before its own code. So a class that imports `@inject()`, `@Column()` or `@Guard()` from these packages is always defined after `reflect-metadata` is loaded.

One case needs care: a class decorated only with your own decorator (or another library's), in a file that runs before anything imports `@c9up/ream`. Keep `@c9up/ream` as the first import of `bin/server.ts`, as above, and this cannot happen.

Your `package.json` does not need to list `reflect-metadata` either: `@c9up/ream` depends on it. The `ream` commands load it through `@c9up/ream`, and the files `ream new` writes do not import it.

## Ignitor constructor

```typescript
new Ignitor(APP_ROOT, config)
```

| Parameter | Type | Description |
|---|---|---|
| `APP_ROOT` | `URL` | `new URL('../', import.meta.url)` from `bin/server.ts` |
| `config.port` | `number` | Port to listen on (default `3000`) |
| `config.host` | `string` | Address to bind to. Falls back to `process.env.HOST`, then `0.0.0.0` in production and `localhost` elsewhere |
| `config.serverFactory` | `(port: number, host: string) => HyperServerLike` | Factory that creates the HTTP server instance |
| `config.importer` | `(filePath: string) => Promise<unknown>` | Custom module loader (optional) |
| `config.watchDirs` | `string[]` | Directories to watch for hot-reload in dev mode |

The constructor immediately registers framework services in the container (`'router'`, `'server'`, `'middleware'`, `'app'`) and initializes the service singletons so route files can import them.

## Builder methods

The Ignitor uses a fluent builder API. All methods except `.start()` return `this`.

### `.tap(callback)`

Access the `Application` instance before the lifecycle starts. Use it for signal handlers and booting/booted hooks.

```typescript
.tap((app) => {
  app.listen('SIGTERM', () => app.terminate())
  app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())

  app.booting(async () => {
    // runs at the start of the BOOT phase, before providers boot
  })

  app.booted(async () => {
    // runs after all providers have booted
  })
})
```

### `.useRcFile(reamrc)`

Load the application configuration. Pass the default export of `reamrc.ts`.

```typescript
.useRcFile((await import('../reamrc.js')).default)
```

### `.httpServer()`

Sets the environment to `'web'`. Required before `.start()` when running an HTTP server. Validates that a `serverFactory` was provided.

### `.start()`

Runs all four lifecycle phases in order. Returns `Promise<Ignitor>`. Chain `.catch(prettyPrintError)` to handle boot-time failures gracefully.

## Phase 1 — REGISTER

What happens, in order:

1. The Ignitor scans the `config/` directory and imports every `.ts` / `.js` file it finds. Each file's default export is stored in `app.config` under its filename (e.g., `config/database.ts` → `app.config.get('database')`).
2. Each provider listed in `reamrc.providers` is imported and instantiated.
3. `provider.register()` is called synchronously on each provider in list order.

`register()` is the only synchronous lifecycle method. Do not perform async work here. Do not resolve services that depend on other providers — those providers may not have registered yet.

```typescript
export default class AtlasProvider extends Provider {
  register(): void {
    this.app.container.singleton('db', () => {
      return new DatabaseManager(this.app.config.get('database'))
    })
  }
}
```

## Phase 2 — BOOT

What happens, in order:

1. `app.booting()` hooks run (registered via `.tap()`).
2. `provider.boot()` is called on each provider in list order.
3. `app.booted()` hooks run.

By the time `boot()` runs, every provider has already registered its bindings. It is safe to resolve other services here.

```typescript
export default class AtlasProvider extends Provider {
  async boot(): Promise<void> {
    const db = await this.app.container.make<DatabaseManager>('db')
    await db.connect()
    await db.query('SELECT 1') // verify the connection
  }
}
```

## Phase 3 — START

What happens, in order:

1. `provider.start()` is called on each provider.
2. `app.starting()` hooks run.
3. Preload files from `reamrc.preloads` are imported. This is when `start/kernel.ts` runs and sets up server middleware.
4. Module routes are auto-loaded. The Ignitor reads `reamrc.modules.path`, scans each subdirectory, and imports any file named `routes.ts` (or the filenames listed in `reamrc.modules.autoload`).

The HTTP server is not yet accepting requests during this phase. This is the right moment to define routes, register named middleware, and warm caches.

```typescript
// start/kernel.ts
import server from '@c9up/ream/services/server'
import router from '@c9up/ream/services/router'

server.errorHandler(() => import('../app/exceptions/Handler.js'))
server.use([() => import('../app/middleware/RequestId.js')])

router.use([() => import('../app/middleware/Auth.js')])
```

```typescript
// app/modules/users/routes.ts
import router from '@c9up/ream/services/router'
import UsersController from './UsersController.js'

router.get('/users', [UsersController, 'index'])
router.get('/users/:id', [UsersController, 'show'])
router.post('/users', [UsersController, 'store'])
```

## Phase 4 — READY

What happens, in order:

1. The `Server` instance is booted (resolves the lazy error handler).
2. The HTTP server is started — `serverFactory` is called, `onRequest` is wired to the kernel, and `listen()` is awaited.
3. The error boundary is installed (catches unhandled rejections and `uncaughtException`).
4. `provider.ready()` is called on each provider.
5. `app.ready()` hooks run.
6. Hot-reload watcher starts in dev mode, then the application is marked ready (`app.isReady`).

After `ready()` returns, the application is fully operational. Log your readiness message here.

```typescript
export default class AppProvider extends Provider {
  async ready(): Promise<void> {
    console.log('Application ready — accepting requests')
  }
}
```

## Shutdown

Shutdown is triggered by `app.terminate()` (called from signal handlers) or by `ignitor.stop()`. `app.terminate()` runs the `terminating` hooks in reverse order, then shuts the providers down; the Ignitor that opened the HTTP server registers a `terminating` hook that calls `ignitor.stop()`, so every path drains the server. The `ignitor.stop()` sequence is:

1. The hot-reload watcher is stopped.
2. The HTTP server is closed (no new connections accepted, in-flight requests drain).
3. The error boundary is uninstalled.
4. `provider.shutdown()` is called on providers in **reverse** registration order.

When it starts an HTTP server, the Ignitor installs its own `SIGTERM` / `SIGINT` handlers (pass `gracefulShutdown: false` in the Ignitor config to opt out). The first signal runs `app.terminate()` with a **30-second drain timeout**; the process then exits with `0`, or `1` when the shutdown threw or the drain ran out of time. A second signal during the drain exits with `1` at once.

```typescript
export default class AtlasProvider extends Provider {
  async shutdown(): Promise<void> {
    const db = await this.app.container.make<DatabaseManager>('db')
    await db.disconnect()
  }
}
```

## Application hooks

Register hooks inside `.tap()` before calling `.start()`.

```typescript
new Ignitor(APP_ROOT, config)
  .tap((app) => {
    // Runs at the start of BOOT, before providers boot
    app.booting(async () => {
      await import('./start/env.js') // validate environment variables
    })

    // Runs after all providers have booted
    app.booted(async () => {
      console.log('All providers booted')
    })

    // Handle OS signals for graceful shutdown
    app.listen('SIGTERM', () => app.terminate())

    // Only attach SIGINT handler when managed by PM2
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
```

### `app.listen(signal, callback)`

Attaches a `process.on(signal, callback)` listener.

### `app.listenIf(condition, signal, callback)`

Same as `app.listen()`, but only attaches if `condition` is `true`. Used with `app.managedByPm2` to avoid intercepting `SIGINT` (Ctrl+C) in local development.

### `app.terminate()`

Runs the `terminating` hooks in reverse order (the HTTP server's close is one of them), then `app.shutdown()` (all providers in reverse order). A second call while one is running is ignored. It does not close the server itself and does not call `process.exit()`: the process ends when nothing holds the event loop any more, or when the Ignitor's signal handler finishes its drain (see [Shutdown](/en/guides/concepts/lifecycle#shutdown)).

### `app.terminating(callback)`

Registers a hook that `app.terminate()` runs before shutting the providers down — last registered, first run. Whatever opens a socket or a long-lived handle registers the hook that closes it.

### `app.booting(callback)`

Registers a callback that runs at the start of the BOOT phase, before any provider's `boot()` method.

### `app.booted(callback)`

Registers a callback that runs after all providers have booted. If called after the app is already booted, the callback runs immediately.

### `app.starting(callback)`

Registers a callback that runs during the START phase, after every provider's `start()` and before the preload files. A warm-up runs it too. Returns the application, so calls chain.

### `app.ready(callback)`

Registers a callback that runs once every provider's `ready()` has returned, before the application is marked ready. Called on an application that is already ready, the callback runs at once (`await app.ready(...)` waits for it). A callback that throws fails the start.

```typescript
app.ready(async () => {
  await warmCaches()
})
```

### `app.import(id)` and `app.importDefault(id)`

Import a module through the importer the application was given (`new Ignitor(APP_ROOT, { importer: (filePath) => import(filePath) })`), so a `#` subpath such as `#listeners/send_email` resolves against the application's `package.json`. `importDefault` returns the default export and names the module when it has none; it also accepts a thunk (`() => import('./x.js')`). Without an importer, both throw `E_APP_MISSING_IMPORTER`.

## Environment properties

```typescript
app.inProduction  // process.env.NODE_ENV === 'production'
app.inDev         // NODE_ENV is not 'production' and not 'test'
app.inTest        // process.env.NODE_ENV === 'test'
app.managedByPm2  // 'PM2_HOME' or 'pm_id' is in process.env
```

## Service singletons

Three singleton proxies are initialized by the Ignitor before any preload file runs. Import them in route files, kernel files, and providers.

### `@c9up/ream/services/app`

```typescript
import app from '@c9up/ream/services/app'

await app.container.make(MyService)
app.config.get('database')
app.inProduction
```

### `@c9up/ream/services/router`

```typescript
import router from '@c9up/ream/services/router'

router.get('/health', ({ response }) => response.json({ status: 'ok' }))
router.group('/api/v1', () => {
  router.get('/users', [UsersController, 'index'])
})
```

### `@c9up/ream/services/server`

```typescript
import server from '@c9up/ream/services/server'

server.errorHandler(() => import('../app/exceptions/Handler.js'))
server.use([() => import('../app/middleware/RequestId.js')])
```

All three are `Proxy` objects that delegate to the underlying instance. Accessing them before the Ignitor constructs throws a descriptive error.

## Lifecycle summary

| Phase | Triggered by | Async | Purpose |
|---|---|---|---|
| REGISTER | `phaseRegister()` | No (register) | Auto-load config, register container bindings |
| BOOT | `phaseBoot()` | Yes | Connect services, run booting/booted hooks |
| START | `phaseStart()` | Yes | Import preloads, auto-load module routes, call start() |
| READY | `phaseReady()` | Yes | Start HTTP server, call ready() |
| SHUTDOWN | `stop()` / `terminate()` | Yes | Reverse-order provider cleanup |

## Execution order

1. `register`
2. `boot`
3. `start`
4. `ready`
5. `shutdown`

## Practical rules

- `register`: IoC bindings, no heavy IO
- `boot`: DB/bus/cache initialization
- `start`: open HTTP/console runtime
- `ready`: app is serving
- `shutdown`: graceful teardown

## Recommendation

Test shutdown explicitly (SIGTERM/SIGINT) to validate long-lived resource cleanup.

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

## Next steps
- [Providers](/en/guides/concepts/providers) — Writing providers for each lifecycle phase
- [IoC Container](/en/guides/concepts/dependency-injection) — Dependency injection and service resolution
- [Routing](/en/guides/basics/routing) — Defining routes in module route files
