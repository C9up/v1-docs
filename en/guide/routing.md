# Routing

Routes are defined as side-effects in module route files. The router singleton is imported from `@c9up/ream/services/router` and accessed after the Ignitor has initialized it.

## Defining Routes

### Basic Routes

```typescript
import router from '@c9up/ream/services/router'

router.get('/users', async ({ response }) => {
  response.json({ users: [] })
})

router.post('/users', async ({ request, response }) => {
  const data = request.all()
  response.status(201).json({ user: data })
})
```

### Available Methods

```typescript
router.get('/resource', handler)
router.post('/resource', handler)
router.put('/resource/:id', handler)
router.patch('/resource/:id', handler)
router.delete('/resource/:id', handler)
router.head('/resource', handler)
router.options('/resource', handler)
router.any('/resource', handler)   // matches all HTTP methods
```

### Route Parameters

Parameters are extracted from the URL pattern and available on both `ctx.params` and via `request.param()`:

```typescript
router.get('/users/:id', async ({ request, response }) => {
  const id = request.param('id')
  response.json({ id })
})

router.get('/orders/:orderId/items/:itemId', async ({ params, response }) => {
  const { orderId, itemId } = params
  response.json({ orderId, itemId })
})
```

### Parameter Matchers

Constrain a parameter to a specific pattern. Requests that do not match fall through to the next route:

```typescript
// Built-in matchers
router.get('/users/:id', handler).where('id', router.matchers.number())
router.get('/posts/:slug', handler).where('slug', router.matchers.slug())
router.get('/tasks/:id', handler).where('id', router.matchers.uuid())

// Custom regex
router.get('/files/:name', handler).where('name', /^[\w-]+\.pdf$/)
```

| Matcher | Pattern |
|---|---|
| `router.matchers.number()` | Digits only (`\d+`) |
| `router.matchers.uuid()` | UUID v4 |
| `router.matchers.slug()` | Lowercase alphanumeric with hyphens |

## Controllers

Controllers are classes decorated with `@inject()`, which registers them for transient IoC resolution. The container auto-resolves constructor dependencies on every request.

```typescript
// app/modules/user/controllers/UsersController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  async index({ response }: HttpContext) {
    const users = await this.userService.findAll()
    response.json({ data: users })
  }

  async store({ request, response }: HttpContext) {
    const data = request.all()
    const user = await this.userService.create(data)
    response.status(201).json({ data: user })
  }

  async show({ request, response }: HttpContext) {
    const user = await this.userService.findById(request.param('id')!)
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  async update({ request, response }: HttpContext) {
    const user = await this.userService.update(request.param('id')!, request.all())
    response.json({ data: user })
  }

  async destroy({ request, response }: HttpContext) {
    await this.userService.delete(request.param('id')!)
    response.noContent()
  }
}
```

### Binding Controllers to Routes

Use the controller tuple syntax `[ControllerClass, 'methodName']`. The container instantiates the controller and resolves its dependencies per request:

```typescript
import router from '@c9up/ream/services/router'
import UsersController from './controllers/UsersController.js'

router.get('/users', [UsersController, 'index'])
router.post('/users', [UsersController, 'store'])
router.get('/users/:id', [UsersController, 'show'])
router.put('/users/:id', [UsersController, 'update'])
router.delete('/users/:id', [UsersController, 'destroy'])
```

## Resource Routes

`router.resource()` registers the full set of CRUD routes for a controller in one call:

```typescript
router.resource('posts', PostsController)
// GET    /posts        → PostsController.index
// POST   /posts        → PostsController.store
// GET    /posts/:id    → PostsController.show
// PUT    /posts/:id    → PostsController.update
// PATCH  /posts/:id    → PostsController.update
// DELETE /posts/:id    → PostsController.destroy
```

Routes are automatically named (`posts.index`, `posts.store`, `posts.show`, etc.). `resource()` returns a `GroupBuilder`, so you can chain prefix, middleware, and guards:

```typescript
router.resource('posts', PostsController).prefix('/api/v1').guard('jwt')
```

## Route Groups

Groups apply shared configuration (prefix, middleware, guards) to a set of routes. The preferred syntax is the fluent callback form:

```typescript
router.group(() => {
  router.get('/users', [UsersController, 'index'])
  router.post('/users', [UsersController, 'store'])
  router.get('/users/:id', [UsersController, 'show'])
}).prefix('/api/v1').middleware('throttle').guard('jwt')
```

The legacy config-object form is also supported:

```typescript
router.group({ prefix: '/api/v1', guards: ['jwt'] }, (r) => {
  r.get('/users', [UsersController, 'index'])
})
```

Groups can be nested:

```typescript
router.group(() => {
  router.group(() => {
    router.resource('users', UsersController)
  }).prefix('/v1')

  router.group(() => {
    router.resource('users', UsersController)
  }).prefix('/v2')
}).prefix('/api').guard('jwt')
```

## Named Routes

Name a route with `.as()`, then build URLs from the name with `urlFor` — never hard-code paths:

```typescript
router.get('/users/:id', [UsersController, 'show']).as('users.show')

const url = router.urlFor('users.show', { id: '42' })
// → /users/42
```

> `router.makeUrl()` is a **deprecated** alias of `urlFor()` (AdonisJS v7 renamed `makeUrl` → `urlFor`). Prefer `urlFor`.

Resource routes are named automatically: `posts.index`, `posts.store`, `posts.show`, `posts.update`, `posts.destroy`.

### URLs in the browser

To build the same URLs client-side, serialize the named-route map with `router.namedManifest()` (only **named** routes are exposed — unnamed routes stay private to the server) and hand it to your page renderer; Aurora's isomorphic `urlFor` resolves against it. See [Aurora → URL builder](../modules/aurora.md#url-builder--urlfor).

```typescript
const routes = router.namedManifest()
// → { 'users.show': '/users/:id', ... }
```

## Fluent Route Builder

Every route registration returns a `RouteBuilder` that supports full chaining:

```typescript
router
  .post('/orders', [OrdersController, 'store'])
  .middleware('throttle')        // named middleware
  .guard('jwt')                  // auth guard
  .role('admin')                 // require role
  .permission('orders:write')    // require permission
  .validate('CreateOrderSchema') // attach validator
  .as('orders.store')            // named route
  .where('id', router.matchers.uuid())
```

### Inline Middleware

Attach a one-off middleware function directly to a route with `.use()`:

```typescript
router.get('/special', [SpecialController, 'index']).use(async (ctx, next) => {
  ctx.store.set('feature-flag', true)
  await next()
})
```

## Route Shortcuts

```typescript
// Render a view (requires a view provider)
router.on('/').render('home')
router.on('/').render('home', { title: 'Welcome' })

// Redirect permanently or temporarily
router.on('/old-page').redirect('/new-page')         // 302
router.on('/old-page').redirect('/new-page', 301)    // 301

// Redirect to a named route
router.on('/go').redirectToRoute('users.show', { id: '1' })
```

## Module Routes

Each module declares its routes in `app/modules/<name>/routes.ts`. These files are auto-loaded by the Ignitor when `modules.path` is set in `reamrc.ts`:

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  modules: { path: './app/modules' },
})
```

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.group(() => {
  router.resource('tasks', TasksController)
}).prefix('/api/v1').guard('jwt')
```

The Ignitor scans every subdirectory of `modules.path` and imports the `routes.ts` file it finds there. No manual registration is required.

## The HttpContext

Every handler and middleware receives an `HttpContext` instance. Destructure only what you need:

```typescript
router.get('/example', async ({ request, response, params, auth, id }: HttpContext) => {
  // request  — typed Request (method, path, params, body, headers, qs)
  // response — typed Response builder (json, send, status, header, redirect, noContent)
  // params   — route params extracted from URL pattern { id: '...' }
  // auth     — { authenticated, user?, roles?, permissions? }
  // id       — correlation ID (from x-request-id header or auto-generated UUID)
})
```

### Request API

```typescript
request.method()            // 'GET' | 'POST' | ...
request.path()              // '/users/42'
request.url()               // '/users/42?page=1'
request.param('id')         // Route param
request.qs()                // Parsed query string as object
request.input('name')       // Single value from body or qs
request.all()               // Merged body + qs
request.only(['name', 'email'])
request.except(['password'])
request.header('authorization')
request.ip()
request.is(['json'])        // Content-type check
request.accepts(['json'])   // Accept header negotiation
```

### Response API

```typescript
response.json({ data })             // Sets content-type and stringifies
response.send('Hello')              // Auto-detects content-type
response.status(201).json({ data }) // Chainable status
response.noContent()                // 204 No Content
response.header('x-trace', id)      // Set header
response.type('application/xml')    // Set content-type
response.cookie('session', token, { httpOnly: true, maxAge: 3600 })
response.redirect().toPath('/login')
response.redirect().status(301).toPath('/new')
response.redirect().toRoute('users.show', { id: '1' })
```

## Next Steps

- [Middleware](/en/guide/middleware) — Server, router, and named middleware
- [Container](/en/guide/container) — Dependency injection and `@inject()`
- [Warden](/en/modules/warden) — Authentication and authorization
