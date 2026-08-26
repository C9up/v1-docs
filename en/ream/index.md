# Ream Core

This section documents `@c9up/ream` as a practical reference.

## Recommended path

1. [Ignitor and bootstrap](/en/ream/ignitor)
2. [Application lifecycle](/en/ream/lifecycle)
3. [IoC container](/en/ream/ioc-container)
4. [HTTP kernel and routing](/en/ream/http-kernel)
5. [Errors and exception handling](/en/ream/errors)
6. [Security and operations](/en/ream/security-ops)

## Positioning

- Ream orchestrates agnostic modules.
- The core defines framework conventions (providers, lifecycle, middleware).
- Surface is still evolving toward an Adonis/Laravel-like DX.

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
every function (AdonisJS parity).

```ts
import { HttpContext } from '@c9up/ream'

const ctx = HttpContext.get()        // current context, or null outside a request
const ctx2 = HttpContext.getOrFail() // throws if called outside a request
```

`get()` returns `null` outside a request — upstream's contract is
`HttpContext | null`, so a migrated `=== null` check keeps working. `getOrFail()`
throws instead; use it when a request context is required.

`runOutsideContext()` runs a callback with the ambient context cleared, so
background work does not inherit and pin the request's context.

### Turning ambient tracking off

`usingAsyncLocalStorage` reports whether tracking is on, and
`useAsyncLocalStorage()` switches it:

```ts
HttpContext.usingAsyncLocalStorage      // true
HttpContext.useAsyncLocalStorage(false) // get() now always answers null
```

::: tip Named deviation
Tracking is **on by default**, where AdonisJS makes it opt-in through
`useAsyncLocalStorage` in `config/app.ts`. Ream's own middleware and service
accessors read the ambient context, so defaulting it off would break the
framework's own wiring rather than just an app's. The switch is there for a
benchmark or a worker process that wants the cost back.
:::

### Request session — `ctx.session`

When `SessionMiddleware` is registered, the request session is exposed as a
top-level `ctx.session` (AdonisJS parity) — `ctx.session.get()` / `.put()` /
`.forget()` / `.regenerate()`. It's top-level so consumers and Warden's session
guard read `ctx.session` directly rather than fishing it out of `ctx.store`. It's
`undefined` when no session middleware ran.

### Cleaning up expired sessions

The **database** store sweeps expired rows on a fraction of its writes
(`gcProbability`, a percentage, default `2` — the AdonisJS default). Nothing
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

`SessionMiddleware` drives it, and the two methods are the AdonisJS ones:
`session.initiate()` loads the session from its store (idempotent — calling it
twice is a no-op), and `session.commit()` persists it. `commit()` writes a
modified session, touches an untouched pre-existing one to slide its expiry,
writes nothing for a brand-new untouched one, and — when the handler called
`regenerate()` — writes under the new id before dropping the old, so a crash
between the two leaves a valid session rather than none.

### Writing a session store

A store implements `read` / `write` / `destroy` / `touch`. `read()` answers
`null` when it holds nothing for that id, and the record when it does —
AdonisJS's `SessionStoreContract`:

```typescript
class MyStore implements SessionDriver {
  async read(id: string): Promise<Record<string, unknown> | null> {
    const row = await lookup(id)
    return row ?? null      // NOT {}
  }
  async write(id: string, data: Record<string, unknown>, ttl: number) { /* … */ }
  async destroy(id: string) { /* … */ }
  async touch(id: string, ttl: number) { /* … */ }
}
```

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

The database store uses a nullable `user_id` column on the sessions table, as
AdonisJS does. The redis store keeps a set per user and prunes members whose
session key has expired, since Redis cannot expire set members individually.

### Session state

`session.fresh` (created during this request), `session.isEmpty` (nothing
stored, flash data included), `session.hasBeenModified` (the AdonisJS spelling
of `isDirty()`), and `session.readonly` — always `false`, since ream has no
read-only session mode.

### Session drivers

Five drivers ship with ream:

| driver | where the session lives | notes |
|---|---|---|
| `cookie` | in the signed cookie itself | no server state; a payload over ~4KB does not fit |
| `memory` | in the process | fine for one instance, lost on restart; capped at 10 000 live sessions |
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

The `database` table is `id` (varchar, primary key), `data` (text) and
`expires_at` (bigint, epoch ms). Nothing prunes it on its own — call
`driver.prune()` from a scheduled job.

### Session config

Both spellings are accepted, so an AdonisJS `config/session.ts` runs unchanged:

```ts
export default defineConfig({
  store: 'redis',                          // AdonisJS; `driver` also works
  stores: { redis: { driver: 'redis' } },  // the named store supplies the driver
  age: '2h',                               // AdonisJS; `maxAge: 7200` also works
})
```

`age` accepts seconds or a duration string (`30m`, `2h`, `7d`). A value it
cannot read throws at construction rather than becoming `NaN` — which would
expire every session at once.

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

The `redis` driver takes a client, or names a [Quasar](/en/modules/quasar) connection:

```ts
// config/session.ts
export default {
  driver: 'redis',
  connection: 'sessions',   // a quasar connection; omit for the default one
  prefix: 'ream:session:',
}
```

Nothing is dialled while the config is read: the connection resolves on the first request that touches a session. `@c9up/quasar` is an **optional** peer — cookie and memory sessions never reach for it. An app that already holds a client can pass it directly as `client` instead of naming a connection.

## The request

Beyond `input()` / `all()` / `qs()`, the request carries what AdonisJS's does:

```ts
ctx.request.id()            // the x-request-id the proxy set, or undefined
ctx.request.completeUrl()   // protocol://host/path, `true` to keep the query
ctx.request.parsedUrl()     // { pathname, search, query }
ctx.request.ajax()          // X-Requested-With: xmlhttprequest
ctx.request.pjax()
ctx.request.prefetch()      // a speculative fetch, not a real navigation
ctx.request.types()         // every accepted media type, best first
ctx.request.languages()     // …and languages, charsets, encodings
ctx.request.cookiesList()
ctx.request.serialize()     // a JSON-safe view, for logs
```

`body()` returns the request body; `all()` returns the body **merged with the
query string** — two different things, as upstream.

`id()` does not invent a UUID when the header is absent: a correlation id nobody
else knows correlates nothing.

`serialize()` and `toJSON()` deliberately omit the body — it may hold
credentials, and a log line is the last place they should land.

`prefetch()` is worth checking before anything with a side effect. A browser may
fetch a link the user never clicks; counting that as a visit, or acting on it,
attributes an intention nobody had.

### Where the user came from

```ts
const back = ctx.request.getPreviousUrl(['admin.example.com'], '/dashboard')
```

The `Referer` header is **supplied by the client**. Redirecting back to it
unchecked is an open redirect, so the host must be this request's own or one of
the hosts you list; anything else falls back.

## The response

```ts
ctx.response.onFinish(() => unlink(tempFile))   // after the answer is sent
await ctx.response.stream(fs.createReadStream(path))
ctx.response.attachment(path, 'rapport-échéance.pdf')
ctx.response.cookie('prefs', { theme: 'dark' }, { maxAge: '2h' })
```

- **`onFinish`** runs the work that must happen but must not delay the reply — a
  temp file deleted, a metric recorded. A callback that throws does not stop the
  others: by then the client already has its answer.
- **`maxAge`** takes seconds or a duration string. `'2h'` previously reached the
  header as the invalid `Max-Age=2h`, and the cookie was dropped without a word.
- **`plainCookie`** packs its value as base64url JSON, so an object comes back an
  object and a number a number. Pass `encode: false` for a value a browser script
  must read verbatim, or one that is already protected.
- **`attachment`** escapes the filename and adds the RFC 6266 extended form, so a
  non-ASCII name survives a Latin-1 header instead of arriving mangled.

Two named deviations on `stream()`: the response crosses a NAPI boundary, so the
stream is **consumed** rather than piped, and no Node `ServerResponse` reaches an
`onFinish` callback. For real streaming, use `response.sse()`.

## Encryption

```ts
const token = encryption.encrypt(userId, 3_600_000, 'password-reset')
encryption.decrypt(token, 'password-reset')   // the id
encryption.decrypt(token, 'session')          // null
```

`purpose` is what stops a value sealed for one use being replayed into another —
a reset token presented as a session cookie fails here rather than being
honoured. `expiresIn` is in milliseconds. Both work on `sign()` / `unsign()` too.

The APP_KEY is validated at construction: absent throws `E_MISSING_APP_KEY`,
shorter than 16 characters throws `E_INSECURE_APP_KEY`.

> **Named deviation.** Ream encrypts with **aes-256-gcm**, where authentication
> is part of the cipher. AdonisJS uses `aes-256-cbc` plus a hand-assembled HMAC —
> encrypt-then-MAC done by hand is a known source of subtle breaks, and there is
> no reason to reproduce it. The consequence, plainly: a cookie encrypted by an
> AdonisJS app **cannot be decrypted here**. Migrating invalidates the encrypted
> cookies already in users' browsers — they are signed out once, at deploy.
> Everything the app *calls* behaves the same.

## Application mode

```ts
async start() {
  if (this.app.getMode() !== 'run') return
  await startQueueWorkers()
}
```

`getMode()` is `run` or `warmup`. A codegen or listing command sets `warmup`, so
a provider can skip its **side effects** — starting workers, opening a connection
— while still registering every binding. It must never change *which* bindings
exist: the app being inspected has to match the app that runs, or the generated
types describe something else. `setMode()` refuses after boot.
