# Quick Start

Build a working Tasks API from scratch. By the end you will have a running HTTP server with JWT auth, a CRUD controller backed by a service, and module-based routing — all tested with `curl`.

## Prerequisites

```bash
npm install @c9up/ream @c9up/warden reflect-metadata
```

Your `tsconfig.json` must enable decorators:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

---

## 1. Project Configuration — reamrc.ts

The `reamrc.ts` file is the project manifest. It declares providers, preload files (middleware, kernel), and which module directories to auto-load routes from.

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/ream/events/provider'),
    () => import('./providers/AppProvider.js'),
  ],
  preloads: [
    () => import('./start/kernel.js'),
  ],
  modules: {
    // Auto-load routes.ts and events.ts from every subdirectory of app/modules/
    path: './app/modules',
    autoload: ['routes', 'events'],
  },
})
```

---

## 2. Config Files

The framework reads every file in `config/` during startup and stores each one under its filename (without extension). `config/auth.ts` is available as `app.config.get('auth')` inside providers.

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-min-32-chars-long!!!!!',
    expiresInSeconds: 3600,
  },
}
```

```typescript
// config/database.ts
export default {
  connection: 'postgres',
  connections: {
    postgres: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? 'ream_dev',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
    },
  },
}
```

```typescript
// config/logger.ts
export default {
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: process.env.NODE_ENV !== 'production',
}
```

---

## 3. The Task Module

### Entity

```typescript
// app/modules/task/entities/Task.ts
import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'

@Entity('tasks')
export class Task extends BaseEntity {
  @PrimaryKey()
  declare id: string

  @Column()
  declare title: string

  @Column()
  declare done: boolean

  @Column()
  declare createdAt: Date
}
```

### Service

```typescript
// app/modules/task/services/TaskService.ts
import { Service } from '@c9up/ream'
import { Task } from '../entities/Task.js'
import { randomUUID } from 'node:crypto'

@Service({ scope: 'singleton' })
export class TaskService {
  // In-memory store — replace with an Atlas repository backed by your database
  private store: Task[] = []

  async all(): Promise<Task[]> {
    return this.store
  }

  async find(id: string): Promise<Task | undefined> {
    return this.store.find((t) => t.id === id)
  }

  async create(data: { title: string }): Promise<Task> {
    const task = Object.assign(new Task(), {
      id: randomUUID(),
      title: data.title,
      done: false,
      createdAt: new Date(),
    })
    this.store.push(task)
    return task
  }

  async update(id: string, data: { title?: string; done?: boolean }): Promise<Task | undefined> {
    const task = await this.find(id)
    if (!task) return undefined
    Object.assign(task, data)
    return task
  }

  async delete(id: string): Promise<boolean> {
    const index = this.store.findIndex((t) => t.id === id)
    if (index === -1) return false
    this.store.splice(index, 1)
    return true
  }
}
```

### Controller

```typescript
// app/modules/task/controllers/TasksController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}

  // GET /tasks
  async index({ response }: HttpContext) {
    const all = await this.tasks.all()
    response.json({ data: all })
  }

  // POST /tasks
  async store({ request, response }: HttpContext) {
    const title = request.input<string>('title')
    if (!title) {
      response.status(422).json({ error: 'title is required' })
      return
    }
    const task = await this.tasks.create({ title })
    response.status(201).json({ data: task })
  }

  // GET /tasks/:id
  async show({ params, response }: HttpContext) {
    const task = await this.tasks.find(params.id)
    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.json({ data: task })
  }

  // PUT /tasks/:id
  async update({ params, request, response }: HttpContext) {
    const task = await this.tasks.update(params.id, {
      title: request.input<string>('title'),
      done: request.input<boolean>('done'),
    })
    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.json({ data: task })
  }

  // DELETE /tasks/:id
  async destroy({ params, response }: HttpContext) {
    const deleted = await this.tasks.delete(params.id)
    if (!deleted) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.noContent()
  }
}
```

### Module Routes

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.get('/api/tasks', [TasksController, 'index']).guard('jwt')
router.post('/api/tasks', [TasksController, 'store']).guard('jwt')
router.get('/api/tasks/:id', [TasksController, 'show']).guard('jwt')
router.put('/api/tasks/:id', [TasksController, 'update']).guard('jwt')
router.delete('/api/tasks/:id', [TasksController, 'destroy']).guard('jwt')
```

Routes that need authentication call `.guard('jwt')`. The guard is fed by the global `AuthMiddleware` (registered in `start/kernel.ts`) which best-effort populates `ctx.auth` — the guard itself enforces `ctx.auth.authenticated === true` and emits a 401 when missing.

### Module Events

When a task is created you can emit a typed event. Add an event class, a listener, and an `events.ts` wiring file alongside the routes.

```typescript
// app/modules/task/events/TaskCreated.ts
import { BaseEvent } from '@c9up/ream/events'

export default class TaskCreated extends BaseEvent {
  constructor(
    public taskId: string,
    public title: string,
  ) {
    super()
  }
}
```

```typescript
// app/modules/task/listeners/LogTaskCreated.ts
import { inject, Inject } from '@c9up/ream'
import { Logger } from '@c9up/spectrum'
import type TaskCreated from '../events/TaskCreated.js'

@inject()
export default class LogTaskCreated {
  constructor(@Inject('logger') private logger: Logger) {}

  async handle(event: TaskCreated) {
    this.logger.info(`Task created: ${event.taskId} — "${event.title}"`)
  }
}
```

```typescript
// app/modules/task/events.ts
import app from '@c9up/ream/services/app'
import { Emitter } from '@c9up/ream/events'
import TaskCreated from './events/TaskCreated.js'
import LogTaskCreated from './listeners/LogTaskCreated.js'

const emitter = app.container.make(Emitter)
emitter.on(TaskCreated, LogTaskCreated)
```

Then dispatch from `TaskService.create()`:

```typescript
// Inside TaskService.create()
this.store.push(task)
TaskCreated.dispatch(task.id, task.title)
return task
```

---

## 4. Auth Middleware

The middleware does **one** thing — populate `ctx.auth` when a valid Bearer token is present. It never rejects; rejection is the route guard's job (`.guard('jwt')`). That split lets public routes still read `ctx.auth.user?.id` defensively without paying the 401 cost.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import auth from '@c9up/warden/services/main'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const header = ctx.request.header('authorization') ?? ''
    if (header.startsWith('Bearer ')) {
      const token = header.slice(7)
      const result = await auth.verify(token)
      if (result.authenticated && result.user) {
        ctx.auth = {
          authenticated: true,
          user: result.user,
          roles: result.user.roles ?? [],
          permissions: result.user.permissions ?? [],
        }
      }
    }
    await next()
  }
}
```

Inside a guarded controller you can dereference `auth.user!.id` directly — the guard already rejected anonymous requests:

```typescript
async store({ request, response, auth }: HttpContext) {
  const userId = auth.user!.id as string
  // …
}
```

---

## 5. The Kernel — start/kernel.ts

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'
import server from '@c9up/ream/services/server'

// Custom error handler
server.errorHandler(() => import('#app/exceptions/handler.js'))

// Global middleware — runs on every routed request.
// AuthMiddleware best-effort populates ctx.auth so guarded routes
// (and any controller that reads `ctx.auth.user?.id`) work uniformly.
router.use([
  () => import('#app/middleware/auth_middleware.js'),
])
```

There's no separate "named middleware" map anymore — `.guard('jwt')` on a route is sufficient. The guard reads `ctx.auth` set by the global middleware.

---

## 6. AppProvider — providers/AppProvider.ts

The provider registers Warden's `AuthManager` with a `JwtStrategy` wired up to your user store. For this quick start the user lookup is a hardcoded stub — replace it with a real database query.

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'
import { JwtStrategy } from '@c9up/warden'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton(AuthManager, () => {
      const authConfig = this.app.config.get<{
        defaultStrategy: string
        jwt: { secret: string; expiresInSeconds: number }
      }>('auth')!

      const jwtStrategy = new JwtStrategy({
        secret: authConfig.jwt.secret,
        expiresInSeconds: authConfig.jwt.expiresInSeconds,
        verifyCredentials: async (email, password) => {
          // Replace with a real database lookup + password verification
          if (email === 'admin@example.com' && password === 'secret') {
            return { id: 'user-1', email, roles: ['admin'], permissions: ['tasks.create'] }
          }
          return null
        },
        findUser: async (id) => {
          if (id === 'user-1') {
            return { id, email: 'admin@example.com', roles: ['admin'], permissions: ['tasks.create'] }
          }
          return null
        },
      })

      return new AuthManager({
        defaultStrategy: authConfig.defaultStrategy,
        strategies: { jwt: jwtStrategy },
      })
    })
  }
}
```

---

## 7. The Server Entry Point — bin/server.ts

```typescript
// bin/server.ts
import 'reflect-metadata'
import { Ignitor } from '@c9up/ream'
import reamrc from '../reamrc.js'

new Ignitor(new URL('../', import.meta.url), {
  importer: (path) => import(path),
  port: Number(process.env.PORT) || 3000,
})
  .httpServer()
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listen('SIGINT', () => app.terminate())
  })
  .useRcFile(reamrc)
  .start()
  .then(async (ignitor) => {
    const port = await ignitor.port()
    console.log(`Ream listening on http://localhost:${port}`)
  })
```

---

## 8. Run and Test

Start the server:

```bash
node --loader ts-node/esm bin/server.ts
# Ream listening on http://localhost:3000
```

**Authenticate and get a token:**

```bash
curl -s -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"secret"}' | jq .
```

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Create a task:**

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Write docs"}' | jq .
```

```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "title": "Write docs",
    "done": false,
    "createdAt": "2026-04-03T10:00:00.000Z"
  }
}
```

**List all tasks:**

```bash
curl -s http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Get a specific task:**

```bash
curl -s http://localhost:3000/api/tasks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Mark a task done:**

```bash
curl -s -X PUT http://localhost:3000/api/tasks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"done":true}' | jq .
```

**Delete a task:**

```bash
curl -s -X DELETE http://localhost:3000/api/tasks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $TOKEN"
# HTTP 204 No Content
```

**Request without a token — expect 401:**

```bash
curl -s http://localhost:3000/api/tasks | jq .
```

```json
{
  "error": {
    "code": "E_UNAUTHORIZED",
    "message": "Bearer token required"
  }
}
```

---

## What Happened Under the Hood

1. `bin/server.ts` constructed an `Ignitor` with the `reamrc.ts` manifest.
2. The Ignitor's **register** phase loaded `config/auth.ts`, `config/database.ts`, `config/logger.ts` into `app.config`, then called `AppProvider.register()` — binding `AuthManager` into the container.
3. The **boot** phase called `AppProvider.boot()`.
4. The **start** phase imported `start/kernel.ts` (registering the `auth` named middleware), then auto-loaded `app/modules/task/routes.ts` (registering the five task routes) and `app/modules/task/events.ts` (wiring `TaskCreated` to `LogTaskCreated`).
5. The **ready** phase started the HyperServer. Each request flows through the middleware pipeline: `LogRequestMiddleware` → named middleware (`AuthMiddleware` for protected routes) → controller.
6. The container resolved `TasksController` per request, injecting its `TaskService` singleton automatically.

---

## Next Steps

- [Folder Structure](/en/guide/folder-structure) — Every directory and file explained
- [Routing](/en/guide/routing) — Route groups, guards, param matchers, named routes
- [Warden](/en/modules/warden) — Multi-strategy auth, RBAC, JWT details
- [Atlas](/en/modules/atlas) — Replacing the in-memory store with a real database
- [Event Bus](/en/ream/events) — Full typed event system with Emitter and BaseEvent
