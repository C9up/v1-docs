# Tutorial

This guide covers building a first application, step by step:

- Prerequisites
- 1. Project Configuration — reamrc.ts
- 2. Config Files
- 3. The Task Module
- 4. Auth Middleware
- 5. The Kernel — start/kernel.ts
- 6. The Server Entry Point — bin/server.ts
- 7. Run and Test
- What Happened Under the Hood

Build a working Tasks API from scratch. By the end you will have a running HTTP server with JWT auth, a CRUD controller backed by a service, and module-based routing — all tested with `curl`.

## Prerequisites

Create the project with the `api` template (see [Installation](/en/start/installation#create-a-new-project)), then add the logger:

```bash
npm install -g @c9up/ream-cli
ream new tasks --template api --db sqlite
cd tasks
ream configure @c9up/spectrum
```

`ream new` installs `@c9up/ream`, `@c9up/warden`, `@c9up/atlas` and `@c9up/spectrum`. It also writes `tsconfig.json` with decorators enabled, the `#app/*`, `#middleware/*`, `#providers/*` and `#start/*` import aliases of `package.json`, `start/env.ts`, `.env` and `bin/server.ts`. `ream configure @c9up/spectrum` registers the logger's provider and writes `config/logger.ts`.

The API signs its tokens with `JWT_SECRET`. Declare it in `start/env.ts`, next to the variables `ream new` wrote:

```typescript
// start/env.ts — add this line to the schema
  JWT_SECRET: Env.schema.secret(),
```

Then give it a value in `.env`: at least 32 random characters, for example the output of `openssl rand -hex 32`.

```bash
# .env
JWT_SECRET=<the output of openssl rand -hex 32>
```

---

## 1. Project Configuration — reamrc.ts

The `reamrc.ts` file is the project manifest. It declares providers, preload files (routes, kernel), and which module directories to auto-load routes from. Replace the generated one:

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/spectrum/provider'),
    () => import('@c9up/warden/provider'),
    () => import('@c9up/blackhole/provider'),
    () => import('@c9up/ream/events/provider'),
    () => import('#providers/AppProvider.js'),
  ],
  preloads: [
    () => import('#start/routes.js'),
    () => import('#start/kernel.js'),
  ],
  modules: {
    // Auto-load routes.ts and events.ts from every subdirectory of app/modules/
    path: './app/modules',
    autoload: ['routes', 'events'],
  },
  tests: {
    suites: [
      { name: 'unit', files: ['tests/unit/**/*.test.ts'], timeout: 2000 },
      { name: 'functional', files: ['tests/functional/**/*.test.ts'], timeout: 30000 },
    ],
  },
})
```

---

## 2. Config Files

The framework reads every file in `config/` during startup and stores each one under its filename (without extension). Warden's provider reads `config/auth.ts` as `app.config.get('auth')` and builds its guards from it:

```typescript
// config/auth.ts
import { defineConfig, jwtGuard } from '@c9up/warden'
import env from '#start/env.js'

// The quick start's only user. Replace both lookups with your user model, and
// verifyCredentials with authFinder({ hash, findForAuth }) from @c9up/warden:
// it checks a password hash, and pays one for an unknown email too, so the
// response time does not reveal which accounts exist.
const admin = {
  id: 'user-1',
  email: 'admin@example.com',
  roles: ['admin'],
  permissions: ['tasks.create'],
}

export default defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      // No fallback: start/env.ts refuses to boot when JWT_SECRET is missing.
      secret: env.get('JWT_SECRET').release(),
      expiresIn: '1h',
      verifyCredentials: async (email, password) =>
        email === admin.email && password === 'secret' ? admin : null,
      findUser: async (id) => (id === admin.id ? admin : null),
    }),
  },
})
```

`JWT_SECRET` is declared `Env.schema.secret()` in `start/env.ts` (see [Configuration](/en/start/configuration#environment-variables)), so `env.get()` hands back a value that prints as `[redacted]` and `.release()` reads it. Never write a fallback such as `process.env.JWT_SECRET ?? '…'`: `config/auth.ts` is committed, so the fallback is a secret anyone can read, and an environment that forgets the variable would sign every token with it — anyone could then mint a token for any user.

The other files of `config/` stay as `ream new` and `ream configure` wrote them.

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
    // Only what the request sent: a field left out keeps its value.
    if (data.title !== undefined) task.title = data.title
    if (data.done !== undefined) task.done = data.done
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
  async show({ request, response }: HttpContext) {
    // The route always carries an id: the default only satisfies the type.
    const task = await this.tasks.find(request.param('id', ''))
    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.json({ data: task })
  }

  // PUT /tasks/:id
  async update({ request, response }: HttpContext) {
    const task = await this.tasks.update(request.param('id', ''), {
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
  async destroy({ request, response }: HttpContext) {
    const deleted = await this.tasks.delete(request.param('id', ''))
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

router
  .group(() => {
    router.get('/api/tasks', [TasksController, 'index'])
    router.post('/api/tasks', [TasksController, 'store'])
    router.get('/api/tasks/:id', [TasksController, 'show'])
    router.put('/api/tasks/:id', [TasksController, 'update'])
    router.delete('/api/tasks/:id', [TasksController, 'destroy'])
  })
  .middleware('auth')
  .guard('jwt')
```

The group protects its five routes. `.middleware('auth')` runs the named `auth` middleware (section 4, declared in `start/kernel.ts`): it refuses a request nobody is signed in to with a 401. `.guard('jwt')` then requires that the `jwt` guard is the one that vouched for the request.

### Login Route

The token the guarded routes expect comes from a login route. `auth.authenticate()` runs the default guard's `verifyCredentials`, from `config/auth.ts`:

```typescript
// app/modules/auth/routes.ts
import router from '@c9up/ream/services/router'
import auth from '@c9up/warden/services/main'

router.post('/api/login', async ({ request, response }) => {
  const result = await auth.authenticate(request.only(['email', 'password']))
  if (result.strategyCrash) return response.status(503).json({ error: 'Try again later' })
  if (!result.authenticated || !result.user) {
    return response.unauthorized({ error: 'Invalid credentials' })
  }
  // The JWT strategy returns the signed token on the user it authenticated.
  response.json({ data: { token: result.user.token } })
})
```

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
import emitter from '@c9up/ream/events/services/main'
import TaskCreated from './events/TaskCreated.js'
import LogTaskCreated from './listeners/LogTaskCreated.js'

emitter.on(TaskCreated, [LogTaskCreated])
```

Then dispatch from `TaskService.create()`:

```typescript
// At the top of TaskService.ts
import TaskCreated from '../events/TaskCreated.js'

// Inside TaskService.create()
this.store.push(task)
TaskCreated.dispatch(task.id, task.title)
return task
```

---

## 4. Auth Middleware

Two middlewares share the work, as in a project made with `ream new --template web`:

- `@c9up/warden/silent-auth` runs on every routed request (section 5). It reads the Bearer token, and when the token is valid it signs the user in on `ctx.auth`, recording the guard that vouched for the request. It never refuses anybody, so a public route can still read `ctx.auth.user?.id`.
- The `auth` middleware below refuses a request nobody is signed in to. Routes use it by name, `.middleware('auth')`.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { errors } from '@c9up/ream'

export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: () => Promise<void>,
    options: { guards?: string[] } = {},
  ) {
    // Without Warden's authenticator on ctx.auth, nobody can be signed in.
    if (typeof ctx.auth.authenticateUsing !== 'function') {
      throw new errors.E_UNAUTHORIZED_ACCESS()
    }
    // Throws E_UNAUTHORIZED_ACCESS (401) when no guard vouches for the request.
    await ctx.auth.authenticateUsing(options.guards)
    await next()
  }
}
```

Do not fill `ctx.auth` by hand: Warden's authenticator records which guard authenticated the request (`authenticatedViaGuard`), and `.guard('jwt')` answers 401 without it. To pass the guards, use the factory form, `.use(middleware.auth({ guards: ['jwt'] }))`.

Inside a guarded controller the middleware has already rejected anonymous requests, but `auth.user` stays optional in the type: narrow it once and the rest of the handler reads it as present:

```typescript
async store({ request, response, auth }: HttpContext) {
  const user = auth.user
  if (!user) return response.unauthorized({ error: 'Unauthorized' }) // unreachable behind .guard('jwt')
  const userId = user.id
  // …
}
```

---

## 5. The Kernel — start/kernel.ts

Replace the generated kernel:

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'
import server from '@c9up/ream/services/server'

// Runs on every request, even one no route matches.
server.use([
  () => import('@c9up/blackhole/server_middleware'),
])

// Runs on every request with a matched route. Silent auth reads who is
// signed in and never refuses anybody.
router.use([
  () => import('@c9up/ream/bodyparser_middleware'),
  () => import('@c9up/blackhole/middleware'),
  () => import('@c9up/warden/silent-auth'),
])

// Attached to the routes that need it, by name: `.middleware('auth')`.
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware.js'),
})
```

The body parser reads request bodies: without it every JSON POST reads as `{}`. Blackhole adds the protective headers and the rate limit. A name given to `.middleware()` must be declared in `router.named()`: a misspelt `.middleware('auht')` stops the server at boot with `E_MIDDLEWARE_NOT_FOUND`.

---

## 6. The Server Entry Point — bin/server.ts

`ream new` wrote `bin/server.ts`: keep it. It loads `start/env.ts` first (a missing `JWT_SECRET` stops it there), reads `reamrc.ts`, and starts the HTTP server on `PORT`.

---

## 7. Run and Test

Start the server:

```bash
node --import @swc-node/register/esm-register bin/server.ts
#   ➜ Ream ready on http://localhost:3000
```

`npm run dev` does the same and restarts on every change.

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
    "code": "E_UNAUTHORIZED_ACCESS",
    "message": "Unauthorized access"
  }
}
```

---

## What Happened Under the Hood

1. `bin/server.ts` constructed an `Ignitor` with the `reamrc.ts` manifest, and validated `.env` against `start/env.ts`.
2. The Ignitor's **register** phase loaded every file of `config/` into `app.config`. Warden's provider built the `jwt` guard from `config/auth.ts` and bound `AuthManager` into the container; Spectrum's provider bound the logger.
3. The **boot** phase made `@c9up/warden/services/main` usable, which the login route calls.
4. The **start** phase imported `start/routes.ts` and `start/kernel.ts` (the router middleware and the named `auth` middleware), then auto-loaded `app/modules/auth/routes.ts` (the login route), `app/modules/task/routes.ts` (the five task routes) and `app/modules/task/events.ts` (wiring `TaskCreated` to `LogTaskCreated`).
5. The **ready** phase built the HTTP kernel, checking that every name given to `.middleware()` is declared, and started the HyperServer. Each request flows through the middleware pipeline: Blackhole → the body parser, Blackhole and silent auth → the `auth` middleware → the group's `.guard('jwt')` (protected routes only) → controller.
6. The container resolved `TasksController` per request, injecting its `TaskService` singleton automatically.

---

## Next Steps
- [Folder Structure](/en/start/folder-structure) — Every directory and file explained
- [Routing](/en/guides/basics/routing) — Route groups, guards, param matchers, named routes
- [Protecting routes](/en/guides/auth/protecting-routes) — Guards, roles, permissions and the auth middleware
- [Warden](/en/guides/auth/introduction) — Multi-strategy auth, RBAC, JWT details
- [Atlas](/en/guides/database/orm/) — Replacing the in-memory store with a real database
- [Event Bus](/en/guides/digging-deeper/emitter) — Full typed event system with Emitter and BaseEvent
