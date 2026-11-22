# Routing

This guide covers routing:

- Defining Routes
- Resource Routes
- Route Groups
- Domains
- Duplicates are refused
- Matchers
- Catch-all params
- Fluent Route Builder
- Route Shortcuts
- Module Routes

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

## Domains

`.domain()` scopes a route, or every route of a group, to a host:

```typescript
router.get('/', [AdminController, 'index']).domain('admin.example.com')

router.group(() => {
  router.get('/dashboard', [TenantController, 'dashboard'])
}).domain(':tenant.example.com')

router.get('/status', [StatusController, 'show']).domain('*.example.com')
```

A domain is exact (`admin.example.com`), parameterised (`:tenant.example.com`) or
a wildcard (`*.example.com`, any depth). Each `:name` captures exactly **one**
label of letters, digits, `-` or `_`, in any position (`api.:tenant.example.com`,
`:tenant.:region.example.com`): `a.b.example.com` and `.example.com` name no
tenant. The host is compared without its port and case-insensitively.

The router resolves the request's host to **one** registered domain before it
looks at the path — an exact domain first, then a parameterised one, then a
wildcard, whatever the order they were registered in. When a domain matches,
only that domain's routes are candidates: there is **no fallback** to the routes
registered without a domain, so a domain-less `/` can never answer for
`admin.example.com`. When no domain matches, or the request has no host, only
the domain-less routes are.

The captured values are on `ctx.subdomains`:

```typescript
// acme.example.com/dashboard
async dashboard({ subdomains, response }: HttpContext) {
  response.json({ tenant: subdomains.tenant })   // { tenant: 'acme' }
}
```

`ctx.subdomains` is empty for a route without a parameterised domain. The host's
own labels are `ctx.request.subdomains()`. A parameter without a name, or the
same name twice, throws `E_INVALID_ROUTE_DOMAIN` when the routes are committed.

## Duplicates are refused

Registering the same method and path twice, or reusing a route name for a
different path, throws instead of overwriting silently:

```
E_DUPLICATE_ROUTE       Duplicate route found. "GET: /admin" route already exists.
E_DUPLICATE_ROUTE_NAME  A route with name "users.show" already exists
```

A silent overwrite is how an authenticated endpoint gets shadowed by a later,
unguarded route on the same path — with nothing in the logs. One name across the
verbs of a **single** path is still allowed: `route(['PUT','PATCH'], …)` and
`resource().update` are one logical route.

## Matchers

`.where()` constrains a param. A route's own matcher **replaces** the global one
for that param, so a route can loosen what the app narrowed:

```typescript
router.where('id', /^[0-9]+$/)                            // global
router.get('/posts/:id', show).where('id', /^[a-z-]+$/)   // this route takes slugs
```

## Catch-all params

A `*` segment swallows the rest of the path, and `params['*']` is the **array of
segments** — joining them would lose the boundary between a segment containing an
encoded `/` and a real separator:

```typescript
router.get('/assets/*', serve)
// GET /assets/css/main.css → params['*'] === ['css', 'main.css']
```

`request.param('*')` joins them for convenience; `request.params()` gives the
array. A matcher on `*` is tested against **every** segment.

### What that costs the type of `ctx.params`

Because a catch-all yields an array, `ctx.params` is typed
`Record<string, string | string[]>`. So the idiomatic destructuring reads as a
union and needs narrowing:

```typescript
async show({ params }: HttpContext) {
  await User.find(params.id)        // string | string[] — does not compile
}
```

Reach for `request.param()` rather than writing your own accessor. It
returns `string | undefined`, and joins a catch-all with
`/`:

```typescript
async show({ request }: HttpContext) {
  await User.find(request.param('id'))   // string | undefined
}
```

> **Why not `any`.** A catch-all really is an array at runtime, so typing
> `ctx.params` as `Record<string, any>` would only hide it. The honest type is
> kept: a value that can be an array should not be typed as though it cannot,
> and the compiler catching it beats a `.toUpperCase()` on an array in
> production.

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

`.guard('jwt')` names the guards that may vouch for the request — being
authenticated by another one is not enough. A request already authenticated by
one of them passes; otherwise the gate calls
`ctx.auth.authenticateUsing(guards)`, as `middleware.auth({ guards })` does, and
a guard's `401` (with its login redirect or `WWW-Authenticate` challenge) is
the answer. A session-authenticated request on a `.guard('jwt')` route is
refused, so a cross-site form post riding the session cookie cannot reach an
endpoint meant for bearer tokens. An auth state that does not report
`authenticatedViaGuard` and has no `authenticateUsing` is refused too. Several
guards — from the route, its group and `@Guard` on the controller — form one
list: any of them may authenticate. RPC methods and GraphQL resolvers apply the
same check.

`.permission()` checks the authenticated user's own permissions, as the auth
layer resolves them: when `ctx.auth.hasAllPermissions()` exists (warden's
authenticator provides it and asks its rights resolver), its answer decides and
a stale `permissions` list on the payload is ignored; without it, the gate reads
`ctx.auth.permissions` or `ctx.auth.user.permissions`. When the
request was authenticated with a token (`ctx.auth.user.currentAccessToken`), the
token must also allow each permission: a token scope never grants a permission
the user lacks, and a narrow token does not carry every permission of its user.
RPC methods and GraphQL resolvers apply the same rule.

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

## Next Steps
- [Middleware](/en/guides/basics/middleware) — Server, router, and named middleware
- [Container](/en/guides/concepts/dependency-injection) — Dependency injection and `@inject()`
- [Warden](/en/guides/auth/introduction) — Authentication and authorization
