# Application Lifecycle

Ream follows a four-phase startup sequence inspired by AdonisJS. Every provider, preload file, and module route file has a defined moment when it runs. Understanding this sequence tells you exactly where to put initialization code.

```
REGISTER → BOOT → START → READY → [running] → SHUTDOWN
```

## `bin/server.ts` — the entry point

The canonical entry point for a Ream HTTP server:

```typescript
// bin/server.ts
import 'reflect-metadata'
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

`import 'reflect-metadata'` must be the first statement in the file. It enables TypeScript decorator metadata for constructor injection.

## Ignitor constructor

```typescript
new Ignitor(APP_ROOT, config)
```

| Parameter | Type | Description |
|---|---|---|
| `APP_ROOT` | `URL` | `new URL('../', import.meta.url)` from `bin/server.ts` |
| `config.port` | `number` | Port to listen on (default `3000`) |
| `config.serverFactory` | `(port: number) => HyperServerLike` | Factory that creates the HTTP server instance |
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
    const db = this.app.container.make('db') as DatabaseManager
    await db.connect()
    await db.query('SELECT 1') // verify the connection
  }
}
```

## Phase 3 — START

What happens, in order:

1. Preload files from `reamrc.preloads` are imported. This is when `start/kernel.ts` runs and sets up server middleware.
2. Module routes are auto-loaded. The Ignitor reads `reamrc.modules.path`, scans each subdirectory, and imports any file named `routes.ts` (or the filenames listed in `reamrc.modules.autoload`).
3. `provider.start()` is called on each provider.

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
5. Hot-reload watcher starts in dev mode.

After `ready()` returns, the application is fully operational. Log your readiness message here.

```typescript
export default class AppProvider extends Provider {
  async ready(): Promise<void> {
    console.log('Application ready — accepting requests')
  }
}
```

## Shutdown

Shutdown is triggered by `app.terminate()` (called from signal handlers) or by `ignitor.stop()`. The sequence is:

1. The hot-reload watcher is stopped.
2. The HTTP server is closed (no new connections accepted, in-flight requests drain).
3. The error boundary is uninstalled.
4. `provider.shutdown()` is called on providers in **reverse** registration order.

```typescript
export default class AtlasProvider extends Provider {
  async shutdown(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
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

Calls `app.shutdown()` (all providers in reverse order) then `process.exit(0)`.

### `app.booting(callback)`

Registers a callback that runs at the start of the BOOT phase, before any provider's `boot()` method.

### `app.booted(callback)`

Registers a callback that runs after all providers have booted. If called after the app is already booted, the callback runs immediately.

## Environment properties

```typescript
app.inProduction  // process.env.NODE_ENV === 'production'
app.inDev         // NODE_ENV is not 'production' and not 'test'
app.inTest        // process.env.NODE_ENV === 'test'
app.managedByPm2  // 'PM2_HOME' or 'pm_id' is in process.env
```

## `prettyPrintError(error)`

Formats a boot-time error for the terminal and writes it to `stderr`. `ReamError` instances include a structured message with hint and context. Plain `Error` instances print the message and stack trace.

```typescript
.start()
.catch((error) => {
  process.exitCode = 1
  prettyPrintError(error)
})
```

## Service singletons

Three singleton proxies are initialized by the Ignitor before any preload file runs. Import them in route files, kernel files, and providers.

### `@c9up/ream/services/app`

```typescript
import app from '@c9up/ream/services/app'

app.container.make(MyService)
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

## Next steps

- [Providers](/en/guide/providers) — Writing providers for each lifecycle phase
- [IoC Container](/en/guide/container) — Dependency injection and service resolution
- [Routing](/en/guide/routing) — Defining routes in module route files
