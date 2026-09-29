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
router.use([() => import('@c9up/blackhole/middleware')])

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

After it runs, the CSRF token is on `request.csrfToken` and the CSP nonce on `response.nonce`.

In Ream the work is split across two tiers. The server-tier middleware runs
before route matching, so a request for a route that does not exist is
rate-limited, shielded and gets the protective headers too. The router-tier
one runs the CSRF check, which needs the parsed body, and skips what the first
already did — each request is counted once. When `rateLimit.keyFor` is set, the
limit is taken on the router tier instead: the key may read what a router
middleware sets, such as the authenticated user. Registered alone, the
router-tier middleware runs every check, as before.

Hono has no runtime-neutral client address: pass `clientIp` (the default reads
the socket of `@hono/node-server`). The scheme compared with the Origin is the
request URL's; behind a proxy, pass `protocol`.

## Architecture

```
                ┌─ request phase ─────────────────────────────┐
HTTP Request →  │ CORS → rate-limit → path-traversal →        │ → your handler
                │ param-pollution → CSRF (all in Rust)        │
                └─────────────────────────────────────────────┘
                ┌─ response phase ───────────────┐
your handler →  │ security headers → XSS sanitize │ → HTTP Response
                └─────────────────────────────────┘
```

The request-filter checks run in Rust (rejected requests are answered before your handler). Security headers + CORS are computed in the thin TS facade (header logic, not CPU-bound). XSS sanitization runs on the **response** body.

## Configuration

Declare it in `config/blackhole.ts` (booted by the provider):

```ts
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  xss: true,                                  // response sanitization (default: true)
  csrf: true,                                 // or a { exceptRoutes, methods, cookie } object
  rateLimit: { max: 100, windowSeconds: 60 }, // omit to disable
  pathTraversal: true,                        // reject `..` / `%2e%2e` (default: true)
  paramPollution: true,                       // reject duplicate query keys (default: true)
  securityHeaders: { csp: "default-src 'self'" }, // Helmet-style; `false` to disable
  cors: { origin: ['https://app.test'], credentials: true }, // omit to leave CORS unmanaged
})
```

With defaults, XSS sanitization and CSRF validation are on; rate limiting and CORS are off until configured.

## XSS Sanitization

Outgoing **response** bodies are sanitized with [ammonia](https://crates.io/crates/ammonia) (the html5ever parser used by Firefox/Servo), not naive entity escaping:

- `text/html` fragments are parsed and rebuilt from an allow-list: dangerous nodes are removed (`<script>`, `on*` handlers, `javascript:` URIs), and any tag outside the list — custom elements and web components included — is unwrapped, its content kept. Existing entities are never double-encoded.
- Every other content type (`text/plain`, JSON, CSV…) is sent unchanged: with `X-Content-Type-Options: nosniff` (a default header) the browser never reads it as markup, and escaping it would only corrupt it.
- A server-rendered **full document** (opening with `<!doctype>` or `<html>`) is left intact — ammonia is for fragments, and treating a whole document as one would strip its wrappers.

Request query strings and bodies are **not** mutated; user input is neutralized where it is rendered (the response), not silently rewritten on the way in.

## CSRF Protection

Stateless **signed double-submit cookie** validation (HMAC-SHA256), with an AdonisJS-compatible API. The `XSRF-TOKEN` cookie carries `<random>.<HMAC(secret, random)>`. A state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) must echo that exact token **and** the token must carry a valid signature. There is no server-side token store, so it scales horizontally — every instance only needs the same `secret`.

Signing is what makes this *signed* double-submit (the OWASP-recommended shape): a naive double-submit accepts any self-consistent pair, so an attacker who can plant an `XSRF-TOKEN` cookie (a sibling subdomain, a MITM on an HTTP sibling) could forge one. A signed token can't be forged without the secret.

::: warning Requires a secret (breaking)
When CSRF is enabled, a `secret` is **required**. `createBlackhole({ csrf: true })` without a secret **throws** — there is no silent fallback to an unsigned token. Pass `secret: env.get('APP_KEY')` in `config/blackhole.ts` (the provider also falls back to `process.env.APP_KEY`). The secret must be a stable, high-entropy value (use your `APP_KEY`) and **shared across instances** — tokens signed by one instance must verify on another.
:::

### How it works

1. **Seed** — On every request the middleware ensures an `XSRF-TOKEN` cookie exists (minting `<random>.<HMAC>` with CSPRNG randomness via `getrandom` if absent) and publishes the token as `ctx.request.csrfToken` (Adonis idiom) and in `ctx.store` (`csrfToken`) for templating.
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
setting). A trusted origin written with a scheme matches that scheme only;
without one, any. A request with neither header — a non-browser client — goes
on to the token check.

### Configuration

```ts
// config/blackhole.ts
import env from '#start/env'
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  secret: env.get('APP_KEY'),                   // HMAC key — REQUIRED when csrf is on
  csrf: {
    exceptRoutes: ['/api/webhooks/*'],          // skip CSRF (exact or trailing-* prefix)
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

Tracks requests per client IP within a sliding time window.

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
- Resets the counter when the time window expires
- Periodically evicts stale entries to prevent unbounded memory growth

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
  exceptRoutes: (req) => req.path.startsWith('/webhooks/'),  // or a pattern list
  cookieOptions: { sameSite: 'lax' },                        // `cookie` also works
}
```

- **`enableXsrfCookie`** gates the readable `XSRF-TOKEN` cookie. An all-SSR app
  sends the token in the `_csrf` field and has no use for it — and a cookie not
  set is one less thing to leak. The token stays available for the form field.
- **`exceptRoutes`** takes patterns or a predicate. The array form is evaluated
  in Rust with the rest of the check; a **predicate runs in JS before it**, since
  a function cannot cross the NAPI boundary.
- **`cookieOptions`** is the AdonisJS key; `cookie` is ours. Both work.
