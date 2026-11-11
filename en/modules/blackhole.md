# Blackhole — Security

`@c9up/blackhole` is a Rust-native security filter for any Node.js framework. The checks run in Rust via NAPI — a rejected request is answered before your handler runs. Use it with Ream (provider + middleware) or standalone with Express / Fastify.

## Installation

```bash
pnpm add @c9up/blackhole
ream configure @c9up/blackhole
```

The package ships these entry points:
- `@c9up/blackhole/provider` — Ream IoC provider (reads `config/blackhole.ts`)
- `@c9up/blackhole/server_middleware` — Ream server-tier middleware (rate limit, shield, CORS, protective headers — on every request, a 404 included)
- `@c9up/blackhole/middleware` — Ream router-tier middleware (CSRF; every check when it runs alone)
- `@c9up/blackhole/express` — `blackholeExpress(options)` for Express
- `@c9up/blackhole/fastify` — `blackholeFastify(options)` Fastify plugin
- `@c9up/blackhole/hono` — `blackholeHono(options)` Hono middleware
- `@c9up/blackhole` — `createBlackhole(options)` low-level API to wire into any framework yourself

Every adapter shares one pipeline (`./core`): there is no duplicated security logic between them.

### Usage

```ts
// Ream — config/blackhole.ts + start/kernel.ts (what `ream configure` writes)
server.use([() => import('@c9up/blackhole/server_middleware')])
router.use([
  () => import('@c9up/ream/bodyparser_middleware'),
  () => import('@c9up/ream/session_middleware'),
  // After the session: CSRF tokens are bound to it.
  () => import('@c9up/blackhole/middleware'),
])

// Hono
import { blackholeHono } from '@c9up/blackhole/hono'
app.use(blackholeHono({ csrf: true, secret: process.env.APP_KEY, clientIp: (c) => getConnInfo(c).remote.address ?? '' }))
// the token: c.get('csrfToken'); the CSP nonce: c.get('cspNonce')

// Express
import { blackholeExpress } from '@c9up/blackhole/express'
app.use(blackholeExpress({ csrf: true, secret: process.env.APP_KEY, rateLimit: { max: 100, windowSeconds: 60 } }))

// Fastify
import { blackholeFastify } from '@c9up/blackhole/fastify'
fastify.register(blackholeFastify({ csrf: true, secret: process.env.APP_KEY }))
```

After it runs, the CSRF token is on `request.csrfToken` and the CSP nonce on `response.nonce`. The protective headers it set are also in `ctx.store` (`securityHeaders`), so a view layer with headers of its own, such as Photon, knows that a header left out was left out on purpose.

In Ream the work is split across two tiers. The server-tier middleware runs
before route matching, so a request for a route that does not exist is
rate-limited, shielded and gets the protective headers too. The router-tier
one runs the CSRF check, which needs the parsed body, and skips what the first
already did — each request is counted once. When `rateLimit.keyFor` is set, the
limit is taken on the router tier instead: the key may read what a router
middleware sets, such as the authenticated user. Registered alone, the
router-tier middleware runs every check, as before.

The router-tier middleware goes **after** the body parser and the session
middleware: the CSRF check reads `_csrf` from the parsed body, and the token is
bound to the session. `ream configure` appends it at the end of the router tier
for that reason. When the application has a session config
(`config/session.ts`) and blackhole runs first, every request is refused with
`E_BLACKHOLE_SESSION_NOT_READY` rather than given a token bound to nothing.

Hono has no runtime-neutral client address: pass `clientIp` (the default reads
the socket of `@hono/node-server`). The scheme and host compared with the Origin
are the request URL's; behind a proxy, pass `protocol` and `host`.

## Architecture

```
                ┌─ request phase ─────────────────────────────┐
HTTP Request →  │ CORS → rate-limit → path-traversal →        │ → your handler
                │ param-pollution → CSRF (all in Rust)        │
                └─────────────────────────────────────────────┘
                ┌─ response phase ─────────────────────────────┐
your handler →  │ security headers → XSS sanitize (xss: true)  │ → HTTP Response
                └──────────────────────────────────────────────┘
```

The request-filter checks run in Rust (rejected requests are answered before your handler). Security headers + CORS are computed in the thin TS facade (header logic, not CPU-bound). XSS sanitization, when `xss` is on, runs on the **response** body.

## Configuration

Declare it in `config/blackhole.ts` (booted by the provider):

```ts
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  xss: false,                                 // sanitize every text/html fragment sent (default: false)
  csrf: true,                                 // or a { exceptRoutes, methods, cookie } object
  rateLimit: { max: 100, windowSeconds: 60 }, // omit to disable
  pathTraversal: true,                        // reject `..` / `%2e%2e` (default: true)
  paramPollution: true,                       // reject duplicate query keys (default: true)
  xFrame: { enabled: true, action: 'DENY' }, // protective headers: one key each, on by default
  csp: { enabled: true, directives: { scriptSrc: ["'self'", '@nonce'] } },
  cors: { origin: ['https://app.test'], credentials: true }, // omit to leave CORS unmanaged
})
```

With defaults, CSRF validation and every protective header are on; the
automatic XSS pass, rate limiting and CORS are off until configured. The config
`ream configure` writes has `csrf: true`.

## Security headers

Each protective header has its own top-level key, `{ enabled, ... }`, and is
**on with a hardened default when the key is omitted** — turn one off with
`{ enabled: false }`. An object given without `enabled` is on.

| Key | Header | Default |
| --- | --- | --- |
| `xFrame` (`action`: `DENY` / `SAMEORIGIN` / `ALLOW-FROM`, `domain`) | `X-Frame-Options` | `SAMEORIGIN` |
| `hsts` (`maxAge`, `includeSubDomains`, `preload`) | `Strict-Transport-Security` | 180 days, subdomains included |
| `contentTypeSniffing` | `X-Content-Type-Options: nosniff` | on |
| `csp` (`directives`, `useDefaults`, `policy`, `reportOnly`) | `Content-Security-Policy` | see below |
| `referrerPolicy` (`policy`) | `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `permissionsPolicy` (`policy`) | `Permissions-Policy` | camera, microphone, geolocation denied |

```ts
export default defineConfig({
  hsts: { enabled: true, maxAge: '180 days', includeSubDomains: true }, // seconds, or a duration
  csp: {
    enabled: true,
    directives: {
      scriptSrc: ["'self'", '@nonce', 'https://cdn.example'], // camelCase or 'script-src'
      imgSrc: ["'self'", 'data:'],
    },
    reportOnly: false,
  },
  referrerPolicy: { enabled: true, policy: 'no-referrer' },
})
```

- Without `directives` or `policy`, the CSP is
  `default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' @nonce`.
- `directives` merge a hardened baseline under yours (`useDefaults: false` to
  start from nothing; `getDefaultDirectives()` returns it, to extend a
  directive rather than replace it). The baseline's `scriptSrc` has no
  `@nonce`: name it again when you set `scriptSrc`.
- `policy` takes the whole header as a string instead of `directives`.
- Both are validated when the filter is created: an unquoted keyword (`self`,
  `none`, `nonce-…`, `sha256-…`…) or a directive given twice throws; with
  `directives`, so do a `;` or `,` inside a source and a policy without
  `default-src`. A directive set to `null` is dropped; `default-src` only
  through `dangerouslyDisableDefaultSrc`.
- `@nonce` is replaced per request with `'nonce-…'`; the raw value is
  `response.nonce`.
- `hsts.maxAge: 0` is valid: it tells browsers to drop the policy.

The headers are set before the handler runs and added afterwards only where
missing: a route that sets its own `X-Frame-Options` or CSP keeps it. An
unknown key inside one of these objects throws, and so does a
`securityHeaders` key — the headers are configured by the keys above.

## CORS

```ts
cors: {
  origin: ['https://app.test'],  // true reflects any origin, '*' is the literal wildcard,
                                 // a comma-separated string, or (origin, ctx) => boolean | string | string[]
  methods: ['GET', 'POST'],
  headers: true,                 // false, a list, a string, or (headers, ctx) => …
  exposeHeaders: ['X-Total'],    // `exposedHeaders` is accepted too
  credentials: true,
  maxAge: 90,
  enabled: true,                 // or (ctx) => boolean
}
```

`origin: true` or `'*'` combined with `credentials: true` is refused at boot —
it would hand every site the user's cookies. An unknown option throws, so a
misspelt key cannot drop its setting without a word. A preflight asking for a
method or a header outside the allowed ones gets no CORS headers.

## XSS Sanitization

`sanitizeResponse(body, contentType)` cleans a `text/html` body as untrusted
markup — what to call on user input before storing or echoing it. It always
sanitizes, whatever `xss` says:

```ts
import { createBlackhole } from '@c9up/blackhole'

const filter = createBlackhole({ csrf: false })
const safe = filter.sanitizeResponse(comment.body, 'text/html')
```

It uses [ammonia](https://crates.io/crates/ammonia) (the html5ever parser used by Firefox/Servo), not naive entity escaping:

- `text/html` fragments are parsed and rebuilt from an allow-list: scripts, styles, frames and event handlers go (`<script>`, `on*` handlers, `javascript:` URIs), and so do forms, inputs, buttons, SVG and media; any tag outside the list — custom elements and web components included — is unwrapped, its content kept. Existing entities are never double-encoded.
- Every other content type (`text/plain`, JSON, CSV…) is returned unchanged: with `X-Content-Type-Options: nosniff` (a default header) the browser never reads it as markup, and escaping it would only corrupt it.
- Fragments lose `id`, `is`, `slot`, `part` and `data-*`: `<a id="config">` shadows `window.config` (DOM clobbering), `is` builds a customized element, client-side frameworks read bindings from `data-*`, and `slot`/`part` reach into shadow DOM.

`xss: true` runs the same pass over every `text/html` fragment the application
sends; a server-rendered **full document** (opening with `<!doctype>` or
`<html>`) is left intact. It is **off by default**: the application's own
partials — a form fragment with its `_csrf` field, an `<svg>` icon, a `<video>` —
would lose everything outside the allow-list. Turn it on only where every
fragment may carry untrusted markup. The object form turns it on and opts
attributes back in, for when nothing reads them from untrusted markup:
`xss: { allowAttributes: ['id', 'data-*'] }`.

Request query strings and bodies are **not** mutated; user input is neutralized where it is stored or rendered, not silently rewritten on the way in.

## CSRF Protection

Stateless **signed double-submit cookie** validation (HMAC-SHA256). The `XSRF-TOKEN` cookie carries `<random>.<HMAC(secret, random)>`. A state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) must echo that exact token **and** the token must carry a valid signature. There is no server-side token store, so it scales horizontally — every instance only needs the same `secret`.

Signing is what makes this *signed* double-submit (the OWASP-recommended shape): a naive double-submit accepts any self-consistent pair, so an attacker who can plant an `XSRF-TOKEN` cookie (a sibling subdomain, a MITM on an HTTP sibling) could forge one. A signed token can't be forged without the secret.

**Bound to the session.** Under the Ream middleware, with the session
middleware registered before blackhole's, the signature also covers a
per-session secret (`csrf-secret`, kept in the session): a token issued to one
session is refused for any other, and dies with its session. The secret is
replaced whenever the session is regenerated — at login and at logout — so a
token issued before either is refused after it, and the response carries a new
one. The standalone adapters have no session; there, the token is signed but
bound to nothing, and the Origin check below is what stops a replayed one.

`csrf.session` makes the binding mandatory: a request that reaches the check
without a session is refused with `E_BLACKHOLE_SESSION_NOT_READY` (500). The
Ream provider turns it on when the application has a session config; set
`csrf: { session: false }` for an application whose CSRF-protected routes run
without one.

::: warning Requires a secret (breaking)
When CSRF is enabled, a `secret` is **required**. `createBlackhole({ csrf: true })` without a secret **throws** — there is no silent fallback to an unsigned token. Pass `secret: env.get('APP_KEY')` in `config/blackhole.ts` (the provider also falls back to `process.env.APP_KEY`). `secret` takes a string or a `Secret`, such as the one `Env.schema.secret()` returns: it is released once, when the filter is built, so the config keeps it wrapped. The secret must be a stable, high-entropy value (use your `APP_KEY`) and **shared across instances** — tokens signed by one instance must verify on another.
:::

### How it works

1. **Seed** — On every request the middleware ensures an `XSRF-TOKEN` cookie exists (minting `<random>.<HMAC>` with CSPRNG randomness via `getrandom` if absent) and publishes the token as `ctx.request.csrfToken` and in `ctx.store` (`csrfToken`) for templating.
2. **Submit** — On an unsafe request the client echoes the same token, via **any** of:
   - the `X-XSRF-TOKEN` header (Axios / Angular `HttpClient` read the cookie automatically),
   - the `X-CSRF-TOKEN` header (manual SPA clients),
   - the `_csrf` form field (server-rendered forms — see `csrfField()` below).
3. **Validate** — The submitted token must equal the cookie (constant-time) **and** carry a valid HMAC signature under the secret. A mismatch, a forged/unsigned value, or a missing token is rejected with `403 E_BAD_CSRF_TOKEN`.

```
POST /orders                                       → 403 E_BAD_CSRF_TOKEN (no token)
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG
              X-XSRF-TOKEN: a1b2.SIG               → 200 OK
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG  X-XSRF-TOKEN: ZZZ      → 403 E_BAD_CSRF_TOKEN
POST /orders  cookie: XSRF-TOKEN=forged   X-XSRF-TOKEN: forged    → 403 E_BAD_CSRF_TOKEN (no valid signature)
```

### Origin check

Before the token, a guarded request that carries an `Origin` (or, failing
that, a `Referer`) must come from the same origin — the same host **and the
same scheme** as the request — or from one of `csrf.trustedOrigins`. A page
served over plain `http://app.test` is another origin than `https://app.test`:
it is what a MITM controls, so it is refused with
`403 E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` even with a valid token. The scheme is
the one the host framework resolved (Ream's `request.protocol()`, Express's
`req.protocol`, Fastify's `request.protocol`, each behind its trusted-proxy
setting), and so is the host (Ream's `request.host()`, Express's
`req.hostname`, Fastify's `request.host`; Hono's `host` option) — behind a
proxy that rewrites `Host`, the forwarded host is compared, not the upstream
name. A trusted origin written with a scheme matches that scheme only; without
one, any. An empty `Origin` counts as absent, and the `Referer` is checked. A
request with neither header — a non-browser client — goes on to the token
check. Both checks belong to the `csrf` switch.

### Configuration

```ts
// config/blackhole.ts
import env from '#start/env'
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  secret: env.get('APP_KEY'),                   // HMAC key (string or Secret) — REQUIRED when csrf is on
  csrf: {
    exceptRoutes: ['/webhooks/:provider', '/api/hooks/*'], // route patterns, or paths
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // guarded verbs (default shown)
    cookie: { sameSite: 'lax' },                 // XSRF-TOKEN cookie attributes
  },
})
```

`csrf: true` / `csrf: false` is shorthand for enabling/disabling with defaults. `GET`, `HEAD`, and `OPTIONS` are never guarded.

**Cookie attributes.** The `XSRF-TOKEN` cookie now defaults `Secure` in production (`NODE_ENV === 'production'`) — no need to set it by hand. It is intentionally **not** `httpOnly`: the double-submit flow needs the browser JS to read the cookie and echo it as `X-XSRF-TOKEN`. Setting `cookie: { httpOnly: true }` makes the cookie unreadable and every non-form POST will `403` — blackhole logs a warning if you do. Only enable it for an all-server-rendered app that submits exclusively via the `_csrf` form field.

> Bearer/JWT routes are CSRF-immune (the browser can't attach an `Authorization` header cross-site), so list your token-authed API prefixes in `exceptRoutes`; reserve CSRF for cookie/session-authed routes.

### Templating helpers

Rendered forms and SPAs read the token through `@c9up/inker` helpers:

- `{{ csrfField() }}` → `<input type="hidden" name="_csrf" value="…">`
- `{{ csrfMeta() }}` → `<meta name="csrf-token" content="…">` (for AJAX clients)

In a controller, the raw token is `ctx.request.csrfToken`.

### Fail-close signal — `request.csrfProtected`

The middleware also publishes `ctx.request.csrfProtected: boolean` — `true` **only** when CSRF was enabled, the request method guarded, the route not excepted, **and** the token validated. It is the trustworthy answer to "was this request CSRF-verified?". Unlike `csrfToken` (seeded on every passing request, even a `GET`, a `csrf: false` route, or an excepted path), a consumer that must **fail-close** — refuse to mutate unless CSRF was genuinely enforced — reads this flag, never the mere presence of a token:

```ts
if (ctx.request.csrfProtected !== true) {
  // blackhole unwired, csrf: false, or this route is excepted → refuse
  return ctx.response.status(403).send('CSRF required')
}
```

`@c9up/station` uses exactly this to fail-close every admin write route.

## Rate Limiting

Tracks requests per client within a sliding time window. The in-process counter
keeps two counters per key — the current window and the previous one, weighted
by how much of it still overlaps — so its memory does not grow with `max`. The
default key is the client IP; an IPv6 client counts under its /64, since one
host holds the whole /64. `keyFor(ctx)` picks another key.

```ts
rateLimit: { max: 100, windowSeconds: 60 } // 100 requests / 60s
```

When the limit is exceeded:

```json
{ "error": { "code": "E_BLACKHOLE_RATE_LIMITED", "message": "Too many requests" } }
```

HTTP status: `429 Too Many Requests`

The rate limiter:
- Buckets per resolved client IP — a request with **no** resolvable IP is rejected (`400 E_BLACKHOLE_MISSING_IP`) rather than sharing a global bucket (which would let one client DoS everyone). IP resolution (trusted proxies) is the host framework's job.
- Requires `max` and `windowSeconds` to be positive whole numbers: `createBlackhole` throws otherwise, rather than run a limit of 0 or a window of 0 that would let every request through
- Admits a request when the sliding count is below `max` (no burst of twice the limit across a window boundary)
- Periodically evicts stale entries, and caps the number of keys held

## Per-route limits

A limit defined once by name, attached to the routes it belongs to:

```ts
// start/limiter.ts
import limiter from '@c9up/blackhole/services/limiter'

export const throttle = limiter.define('api', (ctx) =>
  limiter.allowRequests(60).every('1 minute').usingKey(ctx.auth?.user?.id),
)

export const loginThrottle = limiter.define('login', () =>
  limiter.allowRequests(5).every('1 minute').blockFor('20 mins'),
)

// start/routes.ts
router.post('/login', [AuthController, 'login']).use(loginThrottle)
```

The key is `<name>_<usingKey>`, or `<name>_ip_<client IP>` (IPv6 by /64). Over
the limit the middleware throws `ThrottleException` (`E_TOO_MANY_REQUESTS`,
`429`), rendered with `X-RateLimit-*` and `Retry-After` as text, JSON or
JSON:API depending on `Accept`, its message translated under
`errors.E_TOO_MANY_REQUESTS` when the context has an `i18n`.
`limitExceeded((error) => error.setMessage(…))` adjusts it first; a builder
returning `limiter.noLimit()` lets the request through uncounted. A passing
response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

By hand:

```ts
const login = limiter.use({ requests: 5, duration: '1 minute', blockDuration: '20 mins' })

// Count failures only: a wrong password costs an attempt, a right one clears them.
const [error, user] = await login.penalize(`login_${email}`, () => verify(email, password))

await login.attempt(key, () => sendResetMail()) // runs only while there is budget
await login.consume(key)                        // throws once over
```

`Limiter` also has `increment`, `decrement`, `get`, `set`, `block`, `delete`,
`remaining`, `availableIn`, `isBlocked` and `clear`. Counting is a fixed window
per key, opened by its first request.

The stores live under `limiter` in `config/blackhole.ts` (default: one memory
store):

```ts
import { defineConfig, limiterStores } from '@c9up/blackhole'

export default defineConfig({
  limiter: {
    default: env.get('LIMITER_STORE', 'memory'),
    stores: {
      memory: limiterStores.memory(),
      redis: limiterStores.redis({ connection: 'main' }),
    },
  },
})
```

The Redis store's `clear()` deletes its own keys (by prefix), not the database.

## Filter Results

The request phase resolves to one of:

| Result | Meaning |
|--------|---------|
| `Allow` | Request passed all checks — your handler runs |
| `Reject` | Request blocked — `400` (`E_BLACKHOLE_PATH_TRAVERSAL` / `E_BLACKHOLE_PARAMETER_POLLUTION` / `E_BLACKHOLE_MISSING_IP`), `403` (`E_BAD_CSRF_TOKEN` / `E_BLACKHOLE_CSRF_ORIGIN_MISMATCH`), or `429` (`E_BLACKHOLE_RATE_LIMITED`) |

A rejection carries the same protective headers (CSP, HSTS, `nosniff`…) as a
page, and so does a CORS preflight. They are set before the handler runs, so an
error page built after a throw has them too.

## Next Steps

- [Warden (Auth)](/en/modules/warden) — Application-level authentication and authorization
- [Middleware](/en/guide/middleware) — Node.js middleware pipeline

## CSRF options

```ts
csrf: {
  enabled: true,
  enableXsrfCookie: true,                                    // default
  exceptRoutes: (ctx) => ctx.request.url().startsWith('/webhooks/'), // or a list
  cookieOptions: { sameSite: 'lax' },                        // `cookie` also works
}
```

- **`enableXsrfCookie`** gates the readable `XSRF-TOKEN` cookie. An all-SSR app
  sends the token in the `_csrf` field and has no use for it — and a cookie not
  set is one less thing to leak. The token stays available for the form field.
- **`exceptRoutes`** takes a list or a predicate. An entry matches the pattern
  of the route the request matched (`'/webhooks/:provider'`) on Ream and
  Fastify, and the request path — exactly, or by prefix with a trailing `*` —
  on every adapter (Express and Hono have no matched route at that point). The
  predicate receives the request context: the HTTP context itself on Ream; on
  the standalone adapters, `{ request: { method(), url(), header() }, route }`.
- **`cookieOptions`** and `cookie` are two names for the same option.

### Rejection

A rejected token answers `403 E_BAD_CSRF_TOKEN`. On Ream, a browser form
(`Accept: text/html`) is redirected back with the form fields (minus `_csrf`,
`_method` and passwords) and the message flashed; an Inertia visit
(`X-Inertia`) gets the same redirect without the form fields re-flashed; a JSON
client gets the JSON body. When the context has an `i18n`, the message is
translated under `errors.E_BAD_CSRF_TOKEN`.
