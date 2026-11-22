# CSRF protection

This guide covers protection against cross-site request forgery:

- CSRF Protection
- CSRF options

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

1. **Seed** — On every request the middleware ensures an `XSRF-TOKEN` cookie exists (minting `<random>.<HMAC>` with CSPRNG randomness via `getrandom` if absent), sets it on the response — the token the client holds is sent back unchanged, so a client that cannot read its cookie jar (an app on a phone) learns it from any answer — and publishes the token as `ctx.request.csrfToken` and in `ctx.store` (`csrfToken`) for templating.
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
