# Providers

Providers are the integration layer between the Ream framework and everything else — databases, authentication, mail, queues, and your own business services. Every capability that must be set up before the application accepts requests goes through a provider.

## Provider lifecycle

A provider is a class that extends `Provider` and implements up to five lifecycle methods. The methods are called in order during startup and in reverse order on shutdown.

```
register() → boot() → start() → ready() → [running] → shutdown()
```

```typescript
import { Provider } from '@c9up/ream'

export default class DatabaseProvider extends Provider {
  /** Phase 1 — synchronous. Register container bindings only. */
  register(): void {
    this.app.container.singleton('db', () => {
      return new DatabaseManager(this.app.config.get('database'))
    })
  }

  /** Phase 2 — async. Verify connections and prepare the module. */
  async boot(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    await db.connect()
  }

  /** Phase 3 — async. Runs before the HTTP server starts. */
  async start(): Promise<void> {
    // Warm caches, run health checks, register dynamic routes
  }

  /** Phase 4 — async. HTTP server is now accepting requests. */
  async ready(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    console.log(`Database ready — connected to ${db.host}`)
  }

  /** Shutdown — cleanup in reverse provider order. */
  async shutdown(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    await db.disconnect()
  }
}
```

### What belongs in each phase

| Phase | Sync/Async | Allowed work |
|---|---|---|
| `register()` | Sync | Container bindings, nothing else |
| `boot()` | Async | Connect to external services, verify config |
| `start()` | Async | Dynamic routes, cache warming, health checks |
| `ready()` | Async | Log readiness, start background workers |
| `shutdown()` | Async | Close connections, flush buffers |

`register()` is the only synchronous method. All others may be `async`. No method is required — only implement the ones you need.

## Registering providers in `reamrc.ts`

List providers as dynamic imports in `reamrc.ts`. Ream imports each one during the REGISTER phase and calls its lifecycle methods in order.

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/spectrum/provider'),
    () => import('@c9up/atlas/provider'),
    () => import('@c9up/warden/provider'),
    () => import('./providers/AppProvider.js'),
  ],
  preloads: [() => import('./start/kernel.js')],
  modules: { path: './app/modules' },
})
```

Providers execute in the order listed. Shutdown reverses that order — the last provider registered is the first shut down.

### Environment-scoped providers

A provider can be restricted to specific environments by using the object form:

```typescript
providers: [
  () => import('@c9up/atlas/provider'),
  {
    file: () => import('./providers/DevToolsProvider.js'),
    environment: ['web'],
  },
]
```

The `environment` field matches against the value set by `.httpServer()`, `.console()`, or `.testMode()` on the Ignitor.

## Framework providers

Ream's official packages each ship their own provider. Add them to `reamrc.ts` and they self-configure from your `config/` directory.

### `@c9up/spectrum/provider`

Registers the HTTP layer, server middleware pipeline, and exception handler.

### `@c9up/atlas/provider`

Reads `config/database.ts`, connects the ORM, and registers the database manager in the container.

```typescript
// config/database.ts
export default {
  connection: 'pg',
  connections: {
    pg: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? 'myapp',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
    },
  },
}
```

Inside the provider, Atlas reads this via `this.app.config.get('database')`. You never call `this.app.config.set(...)` manually — the Ignitor scans the `config/` directory automatically during REGISTER.

### `@c9up/warden/provider`

Reads `config/auth.ts`, registers guards, and sets up the authentication manager.

```typescript
// config/auth.ts
export default {
  guard: 'jwt',
  guards: {
    jwt: {
      driver: 'jwt',
      secret: process.env.JWT_SECRET ?? 'change-me',
    },
  },
}
```

## How config auto-loading works

During Phase 1 (REGISTER), the Ignitor scans the `config/` directory in your project root and imports every `.ts` / `.js` file it finds. Each file's default export is stored in `app.config` under the filename (without extension).

```
config/
  database.ts   → app.config.get('database')
  auth.ts       → app.config.get('auth')
  mail.ts       → app.config.get('mail')
```

This happens before any provider's `register()` method runs, so config is always available inside providers.

Files are sorted alphabetically before import. There is no manual registration step — dropping a file in `config/` is sufficient.

## App-level providers

Create `providers/AppProvider.ts` for your own business services. This is the right place to register application-specific singletons that don't belong to a framework module.

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'
import { UserRepository } from '../app/repositories/UserRepository.js'
import { MailService } from '../app/services/MailService.js'

export default class AppProvider extends Provider {
  register(): void {
    // Register application services in the container
    this.app.container.singleton('mail', () => {
      const config = this.app.config.get<{ apiKey: string }>('mail')
      return new MailService(config!.apiKey)
    })
  }

  async boot(): Promise<void> {
    // Verify the mail service can connect
    const mail = this.app.container.make<MailService>('mail')
    await mail.verify()
  }

  async shutdown(): Promise<void> {
    const mail = this.app.container.make<MailService>('mail')
    await mail.drain()
  }
}
```

If your services are decorated with `@Service()`, you do not need to register them in a provider — the container discovers them automatically. Providers are for services that require async setup or explicit factory control.

## Reading config inside a provider

```typescript
import { Provider } from '@c9up/ream'

interface RedisConfig {
  host: string
  port: number
  password?: string
}

export default class CacheProvider extends Provider {
  register(): void {
    this.app.container.singleton('cache', () => {
      const config = this.app.config.get<RedisConfig>('redis')!
      return new RedisCache(config)
    })
  }

  async boot(): Promise<void> {
    const cache = this.app.container.make<RedisCache>('cache')
    await cache.ping()
  }
}
```

`this.app.config.get(key)` returns the default export of `config/<key>.ts`. The generic type parameter is optional but recommended.

## Execution order summary

Given this `reamrc.ts`:

```typescript
providers: [
  () => import('@c9up/atlas/provider'),    // AtlasProvider
  () => import('@c9up/warden/provider'),   // WardenProvider
  () => import('./providers/AppProvider.js'), // AppProvider
]
```

The call sequence is:

```
AtlasProvider.register()
WardenProvider.register()
AppProvider.register()

AtlasProvider.boot()
WardenProvider.boot()
AppProvider.boot()

AtlasProvider.start()
WardenProvider.start()
AppProvider.start()

AtlasProvider.ready()
WardenProvider.ready()
AppProvider.ready()

--- application running ---

AppProvider.shutdown()
WardenProvider.shutdown()
AtlasProvider.shutdown()   ← reversed
```

## Next steps

- [Lifecycle](/en/guide/lifecycle) — Full Ignitor boot sequence and application hooks
- [IoC Container](/en/guide/container) — Registering and resolving dependencies
- [Configuration](/en/guide/configuration) — Typed config with `defineModuleConfig`
