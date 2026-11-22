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
    const id = request.param('id')
    const user = id ? await this.userService.findById(id) : null
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  async update({ request, response }: HttpContext) {
    const id = request.param('id')
    if (!id) return response.status(404).json({ error: 'Not found' })
    const user = await this.userService.update(id, request.all())
    response.json({ data: user })
  }

  async destroy({ request, response }: HttpContext) {
    const id = request.param('id')
    if (!id) return response.status(404).json({ error: 'Not found' })
    await this.userService.delete(id)
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

## Named Routes

Name a route with `.as()`, then build URLs from the name with `urlFor` — never hard-code paths:

```typescript
router.get('/users/:id', [UsersController, 'show']).as('users.show')

const url = router.urlFor('users.show', { id: '42' })
// → /users/42
```

> `router.makeUrl()` is a **deprecated** alias of `urlFor()`. Prefer `urlFor`.

Resource routes are named automatically: `posts.index`, `posts.store`, `posts.show`, `posts.update`, `posts.destroy`.

### Building a URL piece by piece

`urlFor` takes everything at once. When the pieces arrive separately — params
here, a query string there, a prefix from config — `router.builder()` is the
fluent form:

```typescript
router.builder().params({ id: '42' }).qs({ tab: 'posts' }).make('users.show')
// → /users/42?tab=posts

router.builderForDomain('https://acme.test').params({ id: '42' }).make('users.show')
// → https://acme.test/users/42

router.builder().prefixUrl('https://acme.test').makeSigned('invite', { expiresIn: '1h' })
// signed, with the query string folded into the signature

router.builder().disableRouteLookup().make('/a/literal/path')
```

It defers to `urlFor` and `makeSignedUrl`, so a missing param fails the same way
whichever spelling you used.

### Inspecting the route table

```typescript
router.toJSON()        // { root: [...routes], 'blog.example.com': [...] }
router.usingDomains    // is any route domain-scoped?
router.parsePattern('/posts/:id?')   // [{ name: 'id', optional: true }]
router.commit()        // build the lookup index now, not on the first request
router.commited        // has it been built?
```

`toJSON()` groups by the domain a route answers on, with `root` for the ones
that answer everywhere — what a route list, an OpenAPI generator or a debug
screen reads.

### URLs in the browser

To build the same URLs client-side, serialize the named-route map with `router.namedManifest()` (only **named** routes are exposed — unnamed routes stay private to the server) and hand it to your page renderer; Aurora's isomorphic `urlFor` resolves against it. See [Aurora → URL builder](../modules/aurora.md#url-builder-—-urlfor).

```typescript
const routes = router.namedManifest()
// → { 'users.show': '/users/:id', ... }
```

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

## WebSockets

`router.ws()` declares a route that accepts WebSocket connections. It is a GET
route like any other — it takes `.as()`, `.use()`, `.middleware()`, groups and
prefixes — and its handler receives the context with a `socket` on it:

```typescript
router.ws('/chat/:room', ({ socket, params, auth }) => {
  socket.send(JSON.stringify({ joined: params.room }))
  socket.on('message', (data, isBinary) => {
    // data: a string for a text message, a Uint8Array for a binary one
  })
  socket.on('close', (code, reason) => {})
}).use(middleware.auth())
```

The middleware and guards run on the **handshake**, before any socket exists:
a client the auth middleware refuses gets its `401` as a plain HTTP answer and
never an open connection. Only once the handler is reached is the request
answered `101 Switching Protocols`. A plain GET to the same path is answered
`426` with `Upgrade: websocket`; a handler that throws answers like any other
route, and no socket opens.

Attach the listeners in the handler: messages can arrive as soon as the
handshake completes, and one with no `message` listener is dropped.

| On `socket` | |
|---|---|
| `send(data)` | A string goes as text, a `Uint8Array` as binary. `false` when the socket is closing, or when the message would take the client's backlog past `maxBufferedBytes` — the connection is then closed with `1013` instead of buffering for a client that does not read. |
| `close(code?, reason?)` | Closes once what is queued has been written. `code` is `1000` (default), `1001`–`1014`, or `3000`–`4999`; `reason` at most 123 bytes. |
| `on('message' \| 'close', listener)`, `off(...)` | A listener that throws is reported, never allowed to take the process down. |
| `closed` | A promise of `{ code, reason }`: the client's close code, the server's, or `1006` when the connection dropped. |
| `bufferedAmount`, `readyState` | Bytes waiting for the client; `open`, `closing` or `closed`. |
| `acceptProtocol(name)`, `protocol`, `offeredProtocols` | Choose one of the subprotocols the client offered (`Sec-WebSocket-Protocol`), in the handler. |

Before your code runs, the server refuses on its own a malformed handshake
(`400`), a WebSocket version other than 13 (`426`), and a browser `Origin` it
does not allow (`403`). A browser sends the site's cookies with a WebSocket
handshake from any page, and WebSockets are not covered by the same-origin
policy: by default only the request's own origin is accepted. Other origins are
listed in `config/app.ts`, with the connection limits (see
[Configuration](/en/guide/configuration)).

WebSocket over HTTP/2 (RFC 8441) is not offered: browsers open WebSockets over
HTTP/1.1. `permessage-deflate` compression is not negotiated.

### Testing a WebSocket route

`TestClient.ws()` opens a socket on the booted application, with the client's
default headers. Messages queue until a test reads them; a refused handshake
rejects with `WebSocketRefused`, which carries the status.

```typescript
import { WebSocketRefused } from '@c9up/ream/testing'

const socket = await client.ws('/chat/general', { headers: { cookie } })
socket.send('hi')
expect(await socket.next()).toBe('hi')
socket.close()

await expect(client.ws('/chat/general')).rejects.toBeInstanceOf(WebSocketRefused)
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
  // auth     — { isAuthenticated, user?, roles?, permissions? }
  // id       — correlation ID (from x-request-id header or auto-generated UUID)
  // subdomains — what the route's domain captured { tenant: 'acme' } (see Domains)
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

The body behind `input()`, `all()`, `only()`, `except()` and `body()` is what the body parser produced: register `@c9up/ream/bodyparser_middleware` (see [File uploads](/en/guide/file-uploads#enabling-the-parser)), or those methods see `{}` plus the query string.

#### Behind a reverse proxy

`request.ip()`, `request.ips()`, `request.protocol()` / `request.secure()` and
`request.host()` believe `X-Forwarded-For`, `X-Forwarded-Proto` and
`X-Forwarded-Host` only when the connection comes from a proxy listed with
`server.trustedProxies()`. The list is empty by default, so the headers are
ignored and a client reaching the app port directly cannot choose them.

```typescript
// start/kernel.ts
server.trustedProxies(['10.0.0.0/8'])   // or 'loopback', 'uniquelocal', '*'
```

`request.ips()` is the trusted chain, closest hop first: the proxy that
connected, then each forwarded address a trusted proxy vouched for. Its last
entry is `request.ip()`. A TLS connection is always `https`. What counts is
the peer that connected: a trusted proxy's `X-Forwarded-Proto` and
`X-Forwarded-Host` are honoured whether or not it also sends
`X-Forwarded-For`.

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
