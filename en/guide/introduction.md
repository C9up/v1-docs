# Introduction

Ream is a TypeScript server framework for Node.js with a Rust-powered HTTP core. It follows the same developer experience conventions as AdonisJS — providers, dependency injection, a fluent router, a defined lifecycle, and modular architecture — while running the HTTP layer through a native Rust binary (HyperServer) via NAPI.

## What Ream Is

**TypeScript-first.** Decorators, typed HTTP context, typed config, typed errors. Everything flows through well-defined types rather than loosely typed dictionaries.

**AdonisJS-compatible DX.** If you know AdonisJS v6, the patterns transfer directly: `@inject()`, controller tuples, `container.make()`, providers with a `register/boot/start/ready/shutdown` lifecycle, `reamrc.ts` for project configuration.

**Rust HTTP core.** The HTTP server, event bus, and security primitives run in Rust through NAPI bindings, not in the Node.js event loop. Lower latency, smaller memory footprint, native Argon2id and HMAC-SHA256 without pulling in pure-JS cryptography packages.

**Modular by design.** Application code lives in domain modules: `app/modules/task/`, `app/modules/user/`. Each module ships its own controllers, services, entities, validators, and a `routes.ts` file. The framework auto-loads every module's `routes.ts` — no central route registry to maintain.

## Framework Packages

| Package | Purpose |
|---|---|
| `@c9up/ream` | Core — Container, Router, HttpKernel, Ignitor, providers, exceptions |
| `@c9up/atlas` | ORM — `@Entity()`, `QueryBuilder`, `BaseRepository` |
| `@c9up/warden` | Auth — `AuthManager`, `JwtStrategy`, RBAC decorators |
| `@c9up/rune` | Validation — fluent schema builder, custom validators |
| `@c9up/spectrum` | Logging — structured logger with levels and channel support |
| `@c9up/pulsar` | Event bus — Rust-native pub/sub via NAPI |

## Key Concepts

### Dependency Injection

The container auto-constructs any class decorated with `@inject()` or `@Service()`. You declare dependencies as constructor parameters — the container resolves them.

```typescript
import { inject } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}
}
```

`@inject()` marks a class for transient resolution (one instance per `container.make()` call). `@Service()` marks a class as a singleton. Named string tokens work too via `@Inject('token-name')`.

### Controller Tuples

Routes reference controllers as `[ControllerClass, 'methodName']` tuples. The container resolves the controller (and all its dependencies) at request time — no explicit instantiation or binding needed.

```typescript
router.get('/tasks', [TasksController, 'index'])
router.post('/tasks', [TasksController, 'store'])
```

### Modular Routing

Each module defines its own routes by importing the router service. The framework discovers and loads these files automatically:

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.get('/tasks', [TasksController, 'index'])
router.post('/tasks', [TasksController, 'store'])
router.get('/tasks/:id', [TasksController, 'show'])
router.put('/tasks/:id', [TasksController, 'update'])
router.delete('/tasks/:id', [TasksController, 'destroy'])
```

### Providers

Providers register services into the container and run setup code at defined lifecycle phases:

```typescript
import { Provider } from '@c9up/ream'

export default class AppProvider extends Provider {
  register() {
    // Synchronous — add bindings to the container
    this.app.container.singleton('mailer', () => new Mailer(
      this.app.config.get('mail')
    ))
  }

  async boot() {
    // Async — verify connections, validate config
  }
}
```

### The Lifecycle

Every Ream application boots through four sequential phases:

1. **register** — All providers call `register()`. Bindings are added to the container. No async work.
2. **boot** — Providers call `boot()`. Database connections open, config is validated.
3. **start** — Preload files are imported (`start/kernel.ts`, module `routes.ts` files). The HTTP server is not yet listening.
4. **ready** — The HTTP server begins accepting connections. Providers call `ready()`.

Shutdown reverses the order: providers call `shutdown()` in reverse registration order.

## Architecture Overview

```
Request
  │
  ▼
HyperServer (Rust / NAPI)
  │
  ▼
HttpKernel (TypeScript)
  ├── Server middleware  (every request)
  ├── Router middleware  (matched routes only)
  ├── Named middleware   (per-route)
  ├── Guard enforcement  (auth, roles, permissions)
  └── Controller handler
```

The `HttpKernel` is a plain TypeScript function that accepts and returns JSON strings. The Rust layer calls it via NAPI, so the transport boundary is minimal and your application logic stays in TypeScript.

## Rust Components

### HyperServer

Built on [Hyper](https://hyper.rs/), a production-grade Rust HTTP library. It exposes a single NAPI binding — `onRequest(callback)` — that the TypeScript `HttpKernel` plugs into.

### Pulsar Event Bus

`@c9up/pulsar` provides a typed publish/subscribe event bus backed by a Rust core. The Rust layer handles the dispatch loop; TypeScript subscribes and emits with full type inference.

### Security Primitives

Password hashing (Argon2id) and JWT signing/verification are implemented in the `ream-security` Rust crate and exposed through `@c9up/warden`. This provides constant-time comparisons and memory-hard hashing without pure-JS cryptography libraries.

## TypeScript Decorators

Ream requires experimental decorators and `reflect-metadata`. These are configured in the starter template:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

| Decorator | Package | Purpose |
|---|---|---|
| `@inject()` | `@c9up/ream` | Transient IoC resolution for controllers |
| `@Service()` | `@c9up/ream` | Singleton service registration |
| `@Inject('token')` | `@c9up/ream` | Named constructor parameter injection |
| `@Lazy()` | `@c9up/ream` | Break circular dependency cycles |
| `@Entity()` | `@c9up/atlas` | Mark a class as a database entity |
| `@Guard('jwt')` | `@c9up/warden` | Require an auth strategy on a route method |
| `@Role('admin')` | `@c9up/warden` | Require a role |
| `@Permission('x')` | `@c9up/warden` | Require a permission string |

## Two Modes

**Framework mode** uses `reamrc.ts`, providers, auto-loaded module routes, and the full lifecycle:

```typescript
// bin/server.ts
import { Ignitor, defineConfig } from '@c9up/ream'

new Ignitor(new URL('../', import.meta.url), {
  importer: (path) => import(path),
  port: 3000,
})
  .httpServer()
  .useRcFile(defineConfig({
    providers: [() => import('#providers/AppProvider.js')],
    preloads: [() => import('#start/kernel.js')],
    modules: { path: './app/modules', autoload: ['routes'] },
  }))
  .start()
```

**Toolkit mode** skips all conventions. You wire the router, middleware, and kernel manually — useful for microservices or embedding Ream inside an existing Node.js app.

## Next Steps

- [Quick Start](/en/guide/quick-start) — Build a working Tasks API from scratch
- [Folder Structure](/en/guide/folder-structure) — Where each file belongs and why
- [Application Lifecycle](/en/guide/lifecycle) — The four-phase boot process in depth
- [Container](/en/guide/container) — Dependency injection patterns and testing
