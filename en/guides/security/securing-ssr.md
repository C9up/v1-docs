# Securing server-rendered apps

This guide covers blackhole and the security headers:

- Installation
- Architecture
- Configuration
- Security headers
- Filter Results

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
- Any other `@keyword` is resolved per request by the resolver registered for
  it, which is how a package contributes a source (an asset server, a CDN, a
  dev server). A keyword nothing resolves throws when the filter is created
  (`E_BLACKHOLE_UNKNOWN_CSP_KEYWORD`) instead of reaching the browser as a host
  named `@keyword`; register it before the filter is built (in a provider's
  `register()`), since the resolvers are captured then:

  ```ts
  import { cspKeywords } from '@c9up/blackhole'

  // (request, response, nonce) — the framework's own objects
  cspKeywords.register('@assetsUrl', () => env.get('ASSETS_URL'))
  // csp: { directives: { scriptSrc: ["'self'", '@nonce', '@assetsUrl'] } }
  ```

  An empty answer drops the keyword; an answer with `;`, `,` or a line break
  throws (`E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE`) rather than ending the
  directive.
- `hsts.maxAge: 0` is valid: it tells browsers to drop the policy.

The headers are set before the handler runs and added afterwards only where
missing: a route that sets its own `X-Frame-Options` or CSP keeps it. An
unknown key inside one of these objects throws, and so does a
`securityHeaders` key — the headers are configured by the keys above.

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
- [Warden (Auth)](/en/guides/auth/introduction) — Application-level authentication and authorization
- [Middleware](/en/guides/basics/middleware) — Node.js middleware pipeline
