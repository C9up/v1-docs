# Blackhole — Security

`@c9up/blackhole` is a Rust-native security filter for any Node.js framework. The checks run in Rust via NAPI — a rejected request is answered before your handler runs. Use it with Ream (provider + middleware) or standalone with Express / Fastify.

## Installation

```bash
pnpm add @c9up/blackhole
ream configure @c9up/blackhole
```

The package ships these entry points:
- `@c9up/blackhole/provider` — Ream IoC provider (reads `config/blackhole.ts`)
- `@c9up/blackhole/middleware` — Ream middleware
- `@c9up/blackhole/express` — `blackholeExpress(options)` for Express
- `@c9up/blackhole/fastify` — `blackholeFastify(options)` Fastify plugin
- `@c9up/blackhole` — `createBlackhole(options)` low-level API to wire into any framework yourself

All three adapters share one pipeline (`./core`): there is no duplicated security logic between them.

### Usage

```ts
// Ream — config/blackhole.ts + start/kernel.ts
router.use([() => import('@c9up/blackhole/middleware')])
// equivalent direct form: import { blackholeMiddleware } from '@c9up/blackhole/middleware'
//                         router.use([blackholeMiddleware])

// Express
import { blackholeExpress } from '@c9up/blackhole/express'
app.use(blackholeExpress({ csrf: true, rateLimit: { max: 100, windowSeconds: 60 } }))

// Fastify
import { blackholeFastify } from '@c9up/blackhole/fastify'
fastify.register(blackholeFastify({ csrf: true }))
```

After it runs, the CSRF token is on `request.csrfToken` and the CSP nonce on `response.nonce`.

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

- `text/html` responses are parsed and dangerous nodes neutralized (`<script>`, `on*` handlers, `javascript:` URIs) while custom tags / web components are preserved and existing entities are never double-encoded.
- `text/plain` responses are entity-escaped.
- A server-rendered **full document** (opening with `<!doctype>` or `<html>`) is left intact — ammonia is for fragments, and treating a whole document as one would strip its wrappers.

Request query strings and bodies are **not** mutated; user input is neutralized where it is rendered (the response), not silently rewritten on the way in.

## CSRF Protection

Stateless **double-submit cookie** validation, with an AdonisJS-compatible API. State-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) must carry a token that matches the one in the `XSRF-TOKEN` cookie — there is no server-side token store, so it scales horizontally (nothing to purge, nothing lost on restart).

### How it works

1. **Seed** — On every request the middleware ensures an `XSRF-TOKEN` cookie exists (minting one with CSPRNG randomness via `getrandom` if absent) and publishes the token as `ctx.request.csrfToken` (Adonis idiom) and in `ctx.store` (`csrfToken`) for templating.
2. **Submit** — On an unsafe request the client echoes the same token, via **any** of:
   - the `X-XSRF-TOKEN` header (Axios / Angular `HttpClient` read the cookie automatically),
   - the `X-CSRF-TOKEN` header (manual SPA clients),
   - the `_csrf` form field (server-rendered forms — see `csrfField()` below).
3. **Validate** — The submitted token is compared (constant-time) against the cookie. A mismatch or a missing token is rejected with `403 CSRF_FAILED`.

```
POST /orders                                       → 403 CSRF_FAILED (no token)
POST /orders  cookie: XSRF-TOKEN=a1b2…
              X-XSRF-TOKEN: a1b2…                  → 200 OK
POST /orders  cookie: XSRF-TOKEN=a1b2…  X-XSRF-TOKEN: ZZZ  → 403 CSRF_FAILED
```

### Configuration

```ts
// config/blackhole.ts
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  csrf: {
    exceptRoutes: ['/api/webhooks/*'],          // skip CSRF (exact or trailing-* prefix)
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // guarded verbs (default shown)
    cookie: { sameSite: 'lax', secure: true },   // XSRF-TOKEN cookie attributes
  },
})
```

`csrf: true` / `csrf: false` is shorthand for enabling/disabling with defaults. `GET`, `HEAD`, and `OPTIONS` are never guarded.

### Templating helpers

Rendered forms and SPAs read the token through `@c9up/inker` helpers:

- `{{ csrfField() }}` → `<input type="hidden" name="_csrf" value="…">`
- `{{ csrfMeta() }}` → `<meta name="csrf-token" content="…">` (for AJAX clients)

In a controller, the raw token is `ctx.request.csrfToken`.

## Rate Limiting

Tracks requests per client IP within a sliding time window.

```ts
rateLimit: { max: 100, windowSeconds: 60 } // 100 requests / 60s
```

When the limit is exceeded:

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }
```

HTTP status: `429 Too Many Requests`

The rate limiter:
- Buckets per resolved client IP — a request with **no** resolvable IP is rejected (`400 MISSING_IP`) rather than sharing a global bucket (which would let one client DoS everyone). IP resolution (trusted proxies) is the host framework's job.
- Resets the counter when the time window expires
- Periodically evicts stale entries to prevent unbounded memory growth

## Filter Results

The request phase resolves to one of:

| Result | Meaning |
|--------|---------|
| `Allow` | Request passed all checks — your handler runs |
| `Reject` | Request blocked — `400` (path-traversal / param-pollution / missing IP), `403` (CSRF), or `429` (rate limit) |

## Next Steps

- [Warden (Auth)](/en/modules/warden) — Application-level authentication and authorization
- [Middleware](/en/guide/middleware) — Node.js middleware pipeline
