# HTTP context

This guide covers the HTTP context a handler receives:

- The HttpContext
- HTTP Context

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

The body behind `input()`, `all()`, `only()`, `except()` and `body()` is what the body parser produced: register `@c9up/ream/bodyparser_middleware` (see [File uploads](/en/guides/basics/body-parser#enabling-the-parser)), or those methods see `{}` plus the query string.

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

## HTTP Context

### Per-request logger — `ctx.logger`

Every request context carries `ctx.logger`, a logger scoped to that request. It
resolves the container's `'logger'` binding (a `@c9up/spectrum` logger) as a child
scoped to the request id, so every line is correlated to the request; when no
logger is registered it falls back to `console`. The signature is **message-first**:

```ts
router.get('/orders/:id', async (ctx) => {
  ctx.logger.info('saved', { id: ctx.params.id })
})
```

### Ambient access — `HttpContext.get()` / `getOrFail()`

`HttpContext` exposes the current request context through `AsyncLocalStorage`, so
any code anywhere in the call stack can reach it without threading `ctx` through
every function.

```ts
import { HttpContext } from '@c9up/ream'

const ctx = HttpContext.get()        // current context, or null outside a request
const ctx2 = HttpContext.getOrFail() // throws if called outside a request
```

`get()` returns `null` outside a request, so test it with `=== null`.
`getOrFail()` throws instead; use it when a request context is required.

`runOutsideContext()` runs a callback with the ambient context cleared, so
background work does not inherit and pin the request's context.

### Turning ambient tracking off

`usingAsyncLocalStorage` reports whether tracking is on, and
`useAsyncLocalStorage()` switches it:

```ts
HttpContext.usingAsyncLocalStorage      // true
HttpContext.useAsyncLocalStorage(false) // get() now always answers null
```

::: tip On by default
Tracking is **on by default**. Ream's own middleware and service accessors read
the ambient context, so defaulting it off would break the framework's own wiring
rather than just an app's. The switch is there for a
benchmark or a worker process that wants the cost back.
:::

### Request session — `ctx.session`

When `SessionMiddleware` is registered, the request session is exposed as a
top-level `ctx.session` — `ctx.session.get()` / `.put()` /
`.forget()` / `.regenerate()`. It's top-level so consumers and Warden's session
guard read `ctx.session` directly rather than fishing it out of `ctx.store`. It's
`undefined` when no session middleware ran.

### Cleaning up expired sessions

The **database** store sweeps expired rows on a fraction of its writes
(`gcProbability`, a percentage, default `2`). Nothing
else collects them: a `read()` drops only the row it happens to look at, so a
session whose owner never returns would sit in the table forever.

```typescript
{ store: 'database', gcProbability: 2 }  // 0 turns it off
```

A failed sweep never fails the request that drew it — the session was written,
which is what the request needed, and the next write that draws will retry.
Set `gcProbability: 0` and call `driver.prune()` from a scheduled job if you
prefer to control when the delete runs.

### Session lifecycle

`SessionMiddleware` drives it through two methods:
`session.initiate()` loads the session from its store (idempotent — calling it
twice is a no-op), and `session.commit()` persists it. `commit()` writes a
modified session, touches an untouched pre-existing one to slide its expiry,
writes nothing for a brand-new untouched one, and — when the handler called
`regenerate()` — writes under the new id before dropping the old, so a crash
between the two leaves a valid session rather than none.

A modified session that existed when the request came in is written only over
its entry: if that entry is gone by then — the user logged out in another tab,
or every session of theirs was destroyed — nothing is written, and the
response sends no session cookie. A slow request that read the signed-in
session before a logout therefore cannot put it back after.

### The cookie store

With `store: 'cookie'` the session lives in the browser, encrypted. The value
is sealed with its expiry, the session's `age`, and checked by the server: a
copy of the cookie stops working when the session would have ended, whatever
the browser does with `maxAge`. Each re-emission (every response under
`rolling: true`) moves that expiry forward, to one `age` after the request READ
the session, not after its response: a request that runs for an hour cannot
hand back the data it read with a fresh lifetime, and one that outlasted the
session sends no cookie at all. A session regenerated during the request (a
login) counts from the response. It is also sealed for the cookie's name, so a
value encrypted for another cookie under the same key is refused.

What the cookie store cannot do on its own is revoke: a logout replaces the
cookie in that browser, and nothing on the server can delete a copy —
`ctx.session.revocable` is `false`. Warden's session guard refuses to sign
anyone in on it without a `blacklist` (see
[SessionStrategy](/en/guides/auth/session-guard#sessionstrategy)); the other choice is a
server-side store — `database` or `redis`.

::: warning Signed out once
A cookie written before this change carries no expiry and is refused: users of
an application on the cookie store sign in again once, after the upgrade.
:::

### Writing a session store

A store implements `read` / `write` / `update` / `destroy` / `touch`. `read()` answers
`null` when it holds nothing for that id, and the record when it does:

```typescript
class MyStore implements SessionDriver {
  async read(id: string): Promise<Record<string, unknown> | null> {
    const row = await lookup(id)
    return row ?? null      // NOT {}
  }
  async write(id: string, data: Record<string, unknown>, ttl: number) { /* … */ }
  // Write only over an entry that is still there, in one step.
  async update(id: string, data: Record<string, unknown>, ttl: number): Promise<boolean> { /* … */ }
  async destroy(id: string) { /* … */ }
  async touch(id: string, ttl: number) { /* … */ }
}
```

`update()` answers `false` when the entry is gone and writes nothing. The
memory, redis (`SET … XX`) and database (one `UPDATE`) stores do it in one
step; the file store, which has no conditional write, takes a lock per session
(a directory created beside its file) around every change, so a `destroy()`
cannot land between its check and its write. A store without `update()` is
refused when it is attached (`E_SESSION_STORE_NOT_CONDITIONAL`): a read
followed by a write would leave that race open.

::: warning Breaking for custom stores
`read()` used to return a bare record, so a store had to answer `{}` both for
"no session here" and for "a session that happens to be empty". The difference
is load-bearing: a cookie can outlive the row it points at, and that session
looked live — `commit()` then touched a row that was not there. Return `null`
for an absent, expired, destroyed or unparseable entry.
:::

The store is the authority on existence, so `initiate()` marks a session
**fresh** when the store has nothing for its id, however old the cookie is.

### Tagging a session to a user

`session.tag(userId)` associates the session with a user, so every session that
user holds can be found later — what "log out from all my devices" and "your
active sessions" are built on. Tag at login, untag at logout:

```typescript
await ctx.session.tag(String(user.id))   // login
await ctx.session.untag(String(user.id)) // logout
```

To end every session a user has, list them from the store and destroy each:

```typescript
for (const { id } of await store.tagged(user.id)) {
  await store.destroy(id)
}
```

Only the stores that keep a queryable index can answer: **memory**, **redis**
and **database**. `session.supportsTagging()` says whether the configured one
does; calling `tag()` on a store that cannot throws rather than doing nothing,
because a login that believes it tagged the session would leave the feature
silently logging nobody out.

The database store uses a nullable `user_id` column on the sessions table.
The redis store keeps a set per user and prunes members whose
session key has expired, since Redis cannot expire set members individually.

### Session state

```ts
ctx.session.fresh                  // no stored row when it was read
ctx.session.isEmpty                // nothing stored, flash data included
ctx.session.hasBeenModified        // same as isDirty()
ctx.session.hasRegeneratedSession  // regenerate() ran this request
ctx.session.readonly               // always false — ream has no read-only mode
ctx.session.flashKey               // where the flash bag lives inside the payload
ctx.session.responseFlashMessages  // what has been flashed for the NEXT request
ctx.session.config                 // { fresh, ttl }
```

`hasRegeneratedSession` matters when something outside the session holds the id
— a cookie already written, an external store keyed by it. It was tracked
internally and never exposed, so only the session itself could act on it.

### Session drivers

Five drivers ship with ream:

| driver | where the session lives | notes |
|---|---|---|
| `cookie` | in the signed cookie itself | no server state; a payload over ~4KB does not fit |
| `memory` | in the process | fine for one instance, lost on restart; capped at 10 000 live sessions, the least recently used dropped first |
| `file` | one file per session on disk | survives a restart without a Redis; one machine only |
| `database` | a `sessions` table | shared across instances when they share a database |
| `redis` | on a Redis server | shared across instances, survives restarts |

The `file` driver takes the directory to write to; the `database` driver takes a
connection exposing `query()` / `execute()` and, optionally, the table name:

```ts
// config/session.ts
export default { driver: 'file', location: app.tmpPath('sessions') }

// or
export default {
  driver: 'database',
  dbConnection: db.connection(),
  tableName: 'sessions',   // default
}
```

The `database` table is `id` (varchar, primary key), `data` (text),
`expires_at` (bigint, epoch ms) and `user_id` (varchar, nullable — set at login
by `session.tag()`). Expired rows are swept by `gcProbability` (see
[Cleaning up expired sessions](/en/guides/basics/http-context#cleaning-up-expired-sessions)).

### Session config

Both spellings are accepted:

```ts
export default defineConfig({
  store: 'redis',                          // `driver` also works
  stores: { redis: { driver: 'redis' } },  // the named store supplies the driver
  age: '2h',                               // `maxAge: 7200` also works
})
```

`age` accepts seconds or a duration string (`30m`, `2h`, `7d`). A value it
cannot read throws at construction rather than becoming `NaN` — which would
expire every session at once.

A store has to be chosen, in every environment: with neither `store` nor
`driver` set, `defineConfig` and `SessionMiddleware` throw
`E_SESSION_STORE_NOT_CONFIGURED` instead of falling back to the memory store,
which a restart, a second instance or enough anonymous traffic empties.
`store: 'memory'` is accepted when it is written out — in tests, or for a single
development instance.

`cookie` sets the session cookie's attributes, for every store:

```ts
export default defineConfig({
  store: 'redis',
  cookie: {
    sameSite: 'strict',      // default 'lax'
    domain: 'example.com',   // default: none (host-only)
    path: '/',               // default '/'
    secure: true,            // default: on when NODE_ENV is production
  },
})
```

The cookie's lifetime still comes from `age` and `clearWithBrowser`. The cookie
is always `HttpOnly`: `httpOnly: false` throws `E_SESSION_COOKIE_NOT_HTTP_ONLY`.

### Flash messages

`flashAll()` takes **no argument**: it reads the request's own input, which is
what repopulates a form after a redirect back.

```ts
session.flashAll()                       // the whole input
session.flashOnly(['email'])             // just these keys
session.flashExcept(['password'])        // everything but these
session.flash({ notice: 'Saved' })       // a key/value or an object
session.flashErrors({ email: 'Taken' })  // into `errorsBag`
session.flashValidationErrors(error)     // inputErrorsBag + errorsBag + input
```

Flash data lives for exactly one following request. That request takes it out
of the session and writes the session back without it, even when it only reads
— so a message, its validation errors and the flashed input do not reappear on
the page after.

`reflash()` / `reflashOnly(keys)` / `reflashExcept(keys)` keep the PREVIOUS
request's flash for one more hop — what a redirect chain needs so a message
survives.

Templates read the same data through `flashMessages`, `old()` and the
`@error` / `@errors` / `@inputError` / `@flashMessage` tags.

### Intended URL

Store where the user was heading before sending them to a login page, then read
it back after:

```ts
session.setIntendedUrl(ctx.request.url(true))
// …after a successful login
return response.redirect(session.pullIntendedUrl() ?? '/dashboard')
```

`getIntendedUrl()` reads without consuming; `clearIntendedUrl()` drops it.

The redirect builder does both steps through the request's session:

```ts
// in an auth middleware, on a page that needs a login
return ctx.response.redirect().withIntendedUrl().toPath('/login')
// …after a successful login
return ctx.response.redirect().toIntended('/dashboard')
```

`withIntendedUrl()` stores the URL only for a GET that is not an XHR and matched
a route. `toIntended(fallback)` and `toIntendedRoute(name, params)` consume it,
and fall back when it is missing or points off-site.

The `redis` driver takes a client, or names a [Quasar](/en/guides/database/redis) connection:

```ts
// config/session.ts
export default {
  driver: 'redis',
  connection: 'sessions',   // a quasar connection; omit for the default one
  prefix: 'ream:session:',
}
```

Nothing is dialled while the config is read: the connection resolves on the first request that touches a session. `@c9up/quasar` is an **optional** peer — cookie and memory sessions never reach for it. An app that already holds a client can pass it directly as `client` instead of naming a connection.
