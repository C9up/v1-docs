# Folder structure

This guide covers the layout of a ream application:

- app/modules/
- app/exceptions/
- app/middleware/
- bin/
- config/
- database/migrations/
- providers/
- start/
- tests/
- reamrc.ts

A Ream application using framework mode follows this structure. Each directory has a single, well-defined purpose — no guessing where a file belongs.

![The tree of a ream application. app/ holds your code: modules/<module>/ with one folder per domain (controllers, entities, services, validators, events, listeners, routes.ts), middleware/ and exceptions/handler.ts. The wiring: bin/server.ts and bin/console.ts, config/ with one file per package, providers/AppProvider.ts, start/routes.ts, start/kernel.ts, start/env.ts and reamrc.ts. Data and tests: database/migrations/ and tests/. At the root, .env, package.json and tsconfig.json.](/images/folder-structure-en.webp){width=640 height=640 loading=lazy}

`ream new` writes `bin/`, `providers/`, `start/`, `tests/` and `reamrc.ts` (and, with
the `web` template, `config/` and `app/middleware/`); the other folders appear as the
application grows.

---

## app/modules/

All application logic lives here, organized by domain rather than by technical layer.

**Correct — domain-first:**
```
app/modules/task/controllers/TasksController.ts
app/modules/task/services/TaskService.ts
app/modules/task/entities/Task.ts
```

**Incorrect — layer-first:**
```
app/controllers/TasksController.ts   # Scattered, no cohesion
app/services/TaskService.ts          # Hard to move or decouple
```

Each module is a self-contained bounded context. All the code needed to understand and modify the `task` domain lives inside `app/modules/task/`.

A module's `routes.ts` and `events.ts` are loaded once `reamrc.ts` names the modules
folder (see [reamrc.ts](#reamrc-ts)). A new app has none yet and declares its routes in
`start/routes.ts`.

### controllers/

Controller classes handle HTTP requests. They receive an `HttpContext`, call services, and write a response. Controllers are never instantiated by hand — the IoC container constructs them and resolves their dependencies automatically.

```typescript
// app/modules/task/controllers/TasksController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}

  async index({ response }: HttpContext) {
    response.json(await this.tasks.all())
  }

  async show({ request, response, params }: HttpContext) {
    const task = await this.tasks.find(params.id)
    response.json(task)
  }
}
```

### services/

Business logic lives in service classes. Services are registered as singletons and injected into controllers (and other services) through the container.

```typescript
// app/modules/task/services/TaskService.ts
import { Service } from '@c9up/ream'

@Service({ scope: 'singleton' })
export class TaskService {
  private tasks: Task[] = []

  async all(): Promise<Task[]> {
    return this.tasks
  }

  async find(id: string): Promise<Task | undefined> {
    return this.tasks.find((t) => t.id === id)
  }
}
```

### entities/

Atlas entity classes that map to database tables. Decorated with `@Entity()` and `@Column()`.

```typescript
// app/modules/task/entities/Task.ts
import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'

@Entity('tasks')
export class Task extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare title: string
  @Column() declare done: boolean
}
```

### validators/

Rune validation schemas, one per use case. Keep them small and focused — one schema per form or API endpoint.

```typescript
// app/modules/task/validators/CreateTaskValidator.ts
import { rules, schema } from '@c9up/rune'

export const CreateTaskValidator = schema({
  title: rules.string().min(1).max(255).trim(),
  done: rules.boolean().optional(),
})
```

### events/

Typed event payload classes. Each file is a plain class that extends `BaseEvent` and declares the event's data as constructor parameters.

```typescript
// app/modules/task/events/TaskDeclared.ts
import { BaseEvent } from '@c9up/ream/events'

export default class TaskDeclared extends BaseEvent {
  constructor(
    public taskId: string,
    public residenceId: string,
    public declarantId: string,
  ) {
    super()
  }
}
```

### listeners/

Listener classes that respond to events. Each listener has a `handle()` method and may use `@inject()` for dependency injection.

```typescript
// app/modules/task/listeners/LogTaskEvent.ts
import { inject, Inject } from '@c9up/ream'
import { Logger } from '@c9up/spectrum'
import type TaskDeclared from '../events/TaskDeclared.js'

@inject()
export default class LogTaskEvent {
  constructor(@Inject('logger') private logger: Logger) {}

  async handle(event: TaskDeclared) {
    this.logger.child({ module: 'task' }).info(
      `Task ${event.taskId} declared in residence ${event.residenceId}`,
    )
  }
}
```

### events.ts

Wires event classes to their listener classes. Auto-discovered and loaded by the framework during the start phase — no central registration step needed.

```typescript
// app/modules/task/events.ts
import app from '@c9up/ream/services/app'
import { Emitter } from '@c9up/ream/events'
import TaskDeclared from './events/TaskDeclared.js'
import LogTaskEvent from './listeners/LogTaskEvent.js'

const emitter = await app.container.make(Emitter)
emitter.on(TaskDeclared, LogTaskEvent)
```

`events.ts` is loaded with `routes.ts` by default; an explicit `autoload` list in `reamrc.ts` has to name it:

```typescript
modules: {
  path: './app/modules',
  autoload: ['routes', 'events'],
}
```

### routes.ts

The module's route definitions. This file is auto-discovered and loaded by the framework during the start phase. Import the router service — do not construct a `Router` instance yourself.

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

---

## app/exceptions/

### handler.ts

The global exception handler. Extend `ExceptionHandler` from `@c9up/ream` and override `handle()` or `report()`. The framework calls this for any exception that escapes a controller or middleware.

```typescript
// app/exceptions/handler.ts
import { ExceptionHandler } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'

export default class Handler extends ExceptionHandler {
  protected debug = process.env.NODE_ENV !== 'production'
  protected ignoreStatuses = [400, 401, 404, 422]

  async report(error: unknown, ctx: HttpContext) {
    // Custom logging — call super for the default behaviour
    await super.report(error, ctx)
  }
}
```

Register it in `start/kernel.ts` via the server:

```typescript
import server from '@c9up/ream/services/server'
server.errorHandler(() => import('#app/exceptions/handler.js'))
```

---

## app/middleware/

Middleware classes that conform to the `{ handle(ctx, next) }` shape. Register them globally (via `server.use()`) or as named middleware (via `router.named()`).

```typescript
// app/middleware/log_request_middleware.ts
import type { HttpContext } from '@c9up/ream'

export default class LogRequestMiddleware {
  async handle({ request }: HttpContext, next: () => Promise<void>) {
    const start = Date.now()
    await next()
    console.log(`${request.method()} ${request.url()} — ${Date.now() - start}ms`)
  }
}
```

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import auth from '@c9up/warden/services/main'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const header = ctx.request.header('authorization') ?? ''
    if (header.startsWith('Bearer ')) {
      // The token is verified before ctx.auth is set; a guard rejects the rest.
      const result = await auth.verify(header.slice(7))
      if (result.authenticated && result.user) {
        ctx.auth = { isAuthenticated: true, user: result.user }
      }
    }
    await next()
  }
}
```

---

## bin/

### server.ts

The HTTP entry point, the file Node.js runs. It builds the `Ignitor`, validates the
environment before anything boots, loads the rc file and starts the HTTP server.

```typescript
// bin/server.ts
import { Ignitor, prettyPrintError } from '@c9up/ream'
import { createHyperServerFactory } from '@c9up/ream/bootstrap'

const APP_ROOT = new URL('../', import.meta.url)

new Ignitor(APP_ROOT, {
  serverFactory: createHyperServerFactory(),
})
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env.js')
    })
  })
  .useRcFile((await import('../reamrc.js')).default)
  .httpServer()
  .start()
  .then(async (app) => {
    console.log(`\n  ➜ Ream ready on http://${app.host()}:${await app.port()}\n`)
  })
  .catch((err) => {
    prettyPrintError(err)
    process.exit(1)
  })
```

### console.ts

The entry of `ream <command>`: the same application, started as a console instead of
a server. It validates the environment and reads the rc file the same way.

---

## config/

One file per concern, each exporting a plain object as its default export. The framework reads every file in this directory during the register phase and stores its value under the file's basename. `config/auth.ts` becomes `app.config.get('auth')`.

### config/auth.ts

```typescript
// config/auth.ts
import env from '#start/env.js'

export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: env.get('JWT_SECRET').release(),
    expiresInSeconds: 3600,
  },
}
```

### config/database.ts

```typescript
// config/database.ts
export default {
  connection: 'postgres',
  connections: {
    postgres: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? 'ream',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
    },
  },
}
```

### config/logger.ts

```typescript
// config/logger.ts
export default {
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: process.env.NODE_ENV !== 'production',
}
```

---

## database/migrations/

Database migration files. Run by the `ream` CLI (`ream migrate`). Each file exports an `up()` and `down()` function.

---

## providers/

Custom provider classes for application-level service registrations. A provider receives the `AppContext` (container + config store) and follows the `register → boot → start → ready → shutdown` lifecycle.

### providers/AppProvider.ts

Register only app-specific services here — database clients, cache adapters, mailers. Framework packages (Atlas, Warden, Spectrum) ship their own providers that you list in `reamrc.ts`.

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'

export default class AppProvider extends Provider {
  register() {
    // Synchronous binding — no await here
    this.app.container.singleton('mailer', () => new Mailer(
      this.app.config.get('mail')
    ))
  }

  async boot() {
    // Verify connections, validate required env vars
  }
}
```

---

## start/

Files in `start/` are imported during the **start phase** of the lifecycle — after all providers have booted, before the HTTP server begins listening. List them in `reamrc.ts` under `preloads`.

### start/routes.ts

The routes of the application, imported as a preload. A new app answers `/` from here.

```typescript
// start/routes.ts
import router from '@c9up/ream/services/router'

router.get('/', async ({ response }) => {
  response.status(200).json({ name: 'my-app', status: 'running' })
})
```

### start/kernel.ts

Registers server and router middleware. Import the `server` and `router` service singletons provided by `@c9up/ream`.

```typescript
// start/kernel.ts
import server from '@c9up/ream/services/server'
import router from '@c9up/ream/services/router'

// Global server middleware — runs on every request
server.use([
  () => import('#app/middleware/log_request_middleware.js'),
])

// Named middleware — opt-in per route
export const middleware = router.named({
  auth: () => import('#app/middleware/auth_middleware.js'),
})

// Custom exception handler
server.errorHandler(() => import('#app/exceptions/handler.js'))
```

### start/env.ts

The environment's schema. `bin/server.ts` and `bin/console.ts` import it in a
`booting` hook, before any provider, so a missing or malformed variable stops the
application at once; `env.get('PORT')` is then typed as a number.

```typescript
// start/env.ts
import { Env } from '@c9up/ream'

export default await Env.create(new URL('../', import.meta.url), {
  APP_NAME: Env.schema.string(),
  APP_KEY: Env.schema.secret(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  DB_CONNECTION: Env.schema.enum(['postgres', 'sqlite'] as const),
  DB_FILENAME: Env.schema.string(),
})
```

---

## tests/

`tests/bootstrap.ts` starts the application for the suites (on a free port, in test
mode) and gives every suite the HTTP client; `tests/functional/` holds the suites that
need the server. `ream test` runs them; see [Testing](/en/guides/testing/introduction).

---

## reamrc.ts

The project manifest. Declares providers, preload files, and the modules directory path. `defineConfig()` is a typed pass-through that gives editor autocompletion.

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/ream/events/provider'),
    () => import('#providers/AppProvider.js'),
  ],
  preloads: [
    () => import('#start/kernel.js'),
  ],
  modules: {
    path: './app/modules',
    autoload: ['routes', 'events'],   // Load routes.ts and events.ts from each module subdirectory
  },
})
```

`autoload: ['routes', 'events']` tells the framework to import both `routes.ts` and `events.ts` from every direct subdirectory of `app/modules/`. Adding a new module directory is enough — there is no central registration step.
Without `autoload`, `['routes', 'events']` is the default. A file missing from one module
is skipped; an entry that matches no module at all is reported with a warning at boot,
since it is usually a typo. An entry with a trailing slash (`'services/'`) loads every
file of that directory in each module.

---

## Next Steps
- [Quick Start](/en/start/tutorial) — See all of this wired together in a working API
- [Application Lifecycle](/en/guides/concepts/lifecycle) — The four phases in depth
- [Routing](/en/guides/basics/routing) — Groups, guards, named routes, param matchers
- [Providers](/en/guides/concepts/providers) — Writing and registering providers
