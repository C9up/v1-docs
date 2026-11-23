# blackhole

`@c9up/blackhole`: a security filter run by a native Rust engine: CSRF tokens, rate limiting, path traversal and parameter pollution refusal, CORS, protective headers with a nonce-based CSP, and HTML response sanitization, for ream, Express, Fastify and Hono. It also holds the named per-route limiter. Guide: [CSRF protection](/en/guides/security/csrf).

## Installation

```bash
pnpm add @c9up/blackhole
```

`ream configure @c9up/blackhole` registers the provider, registers `@c9up/blackhole/server_middleware` on the server tier and `@c9up/blackhole/middleware` at the end of the router tier, and writes `config/blackhole.ts`. A Redis-backed store needs `@c9up/quasar` (or a client of your own); the database limiter store uses `@c9up/atlas` when present; `@c9up/blackhole/hono` needs `hono`. The package ships its native engine; without it, `createBlackhole()` throws.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/blackhole` | `createBlackhole`, `defineConfig`, the option types, CSP keywords, rate-limit stores, the limiter, errors |
| `@c9up/blackhole/config` | `defineConfig`, `BlackholeConfig` |
| `@c9up/blackhole/provider` | `BlackholeProvider` (default export) and its container keys |
| `@c9up/blackhole/server_middleware` | The server-tier middleware: rate limit, path checks, CORS, headers |
| `@c9up/blackhole/middleware` | The router-tier middleware: CSRF, CSP nonce, response sanitization |
| `@c9up/blackhole/express` | `blackholeExpress()` |
| `@c9up/blackhole/fastify` | `blackholeFastify()` |
| `@c9up/blackhole/hono` | `blackholeHono()` |
| `@c9up/blackhole/limiter` | The named and manual rate limiter |
| `@c9up/blackhole/services/limiter` | The application's `LimiterManager` (default export) |
| `@c9up/blackhole/configure` | `configure()`, run by `ream configure @c9up/blackhole` |

## Exports

### `@c9up/blackhole`

The filter:

| Export | Kind | Description |
|---|---|---|
| `createBlackhole` | function | `createBlackhole(options?: BlackholeOptions): Blackhole`; validates the options and throws on a misconfiguration |
| `Blackhole` | interface | The filter instance (see below) |
| `BlackholeOptions` | interface | Options of `createBlackhole` (see Configuration) |
| `defineConfig` | function | `defineConfig(config: BlackholeConfig): BlackholeConfig` |
| `BlackholeConfig` | interface | `BlackholeOptions` plus `limiter` and the named rate-limit stores |
| `CheckResult` | interface | `{ allowed, status?, body?, headers?, rateLimit?: RateLimitMeta, csrfEnforced? }` |
| `EngineCheck` | type | `'rateLimit' \| 'shield' \| 'csrf'` |
| `RateLimitMeta` | interface | `{ limit, remaining, resetSeconds }` |
| `BlackholeContext` | interface | `{ request: { method(), url(), header(name) }, route? }`, what a CORS or CSRF callback receives |
| `pathContext` | function | `pathContext(method: string, path: string, headers?, routePattern?): BlackholeContext`, for a host without a context object |
| `clientKey` | function | `clientKey(ip: string): string`; an IPv6 address counts by its /64 |
| `assertNoRetiredOptions` | function | `assertNoRetiredOptions(options: object): void`; throws for a removed option |
| `ReleasableSecret` | interface | `{ release(): string }`, an environment `Secret` |

Headers and CSP:

| Export | Kind | Description |
|---|---|---|
| `SecurityHeadersOptions` | interface | `{ xFrame?, hsts?, contentTypeSniffing?, csp?, referrerPolicy?, permissionsPolicy? }` |
| `XFrameConfig` | interface | `{ enabled?, action?: 'DENY' \| 'SAMEORIGIN' \| 'ALLOW-FROM', domain? }` |
| `HstsConfig` | interface | `{ enabled?, maxAge?: number \| string, includeSubDomains?, preload? }` |
| `ContentTypeSniffingConfig` | interface | `{ enabled? }` |
| `CspConfig` | interface | `{ enabled?, directives?, useDefaults?, policy?, reportOnly? }` |
| `ReferrerPolicyConfig`, `PermissionsPolicyConfig` | interface | `{ enabled?, policy? }` |
| `DEFAULT_CSP_POLICY` | const | `"default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' @nonce"` |
| `getDefaultDirectives` | function | `getDefaultDirectives(): Record<string, string[]>`, the baseline merged under `csp.directives` |
| `dangerouslyDisableDefaultSrc` | const | Symbol to set `csp.directives.defaultSrc` to, to drop `default-src` |
| `cspKeywords` | const | The `CspKeywords` registry: `register(keyword, resolver)`, `has(keyword)` |
| `CspKeywords` | class | The registry's class |
| `CspKeywordResolver` | type | `(request: unknown, response: unknown, nonce: string \| undefined) => string`; an empty answer drops the keyword |
| `CspKeywordTarget` | interface | `{ request?, response? }` |

CSRF, CORS, XSS:

| Export | Kind | Description |
|---|---|---|
| `CsrfConfig` | interface | CSRF options (see Configuration) |
| `CsrfCookieConfig` | interface | `{ sameSite?: 'strict' \| 'lax' \| 'none', secure?, httpOnly?, path? }` |
| `CorsConfig` | interface | CORS options (see Configuration) |
| `CorsResult` | interface | `{ headers, varyOrigin, preflight }` |
| `CorsOriginValue`, `CorsHeadersValue` | type | `boolean \| string \| string[]` |
| `XssConfig` | interface | `{ enabled?, allowAttributes?: XssOptInAttribute[] }` |
| `XssOptInAttribute` | type | `'id' \| 'is' \| 'slot' \| 'part' \| 'data-*'` |

Rate-limit stores (the global `rateLimit` option):

| Export | Kind | Description |
|---|---|---|
| `RateLimitStore` | interface | `{ increment(key: string, windowSeconds: number): Promise<{ count: number; resetSeconds: number }> }` |
| `RateLimitStoreFactory` | type | `() => RateLimitStore` |
| `stores` | const | `stores.memory()`, `stores.redis({ connection, prefix? })`; `connection` is a client, a resolver or a `@c9up/quasar` connection name |
| `MemoryRateLimitStore` | class | Counts in this process |
| `RedisRateLimitStore` | class | `new RedisRateLimitStore(source: RateLimitRedisSource, options?: { prefix?: string })`; prefix `blackhole:rate` |
| `RateLimitRedisClient` | interface | `{ incr, expire, ttl }` |
| `RateLimitRedisSource` | type | A client, or a function returning one |
| `RateLimitContext` | interface | `{ request: { ip(): string }; auth?: { user?: { id? } \| null } }`, what `keyFor` receives |
| `RateLimitDecision` | interface | `{ allowed, limit, remaining, resetSeconds }` |
| `quasarConnection` | function | `quasarConnection(name?: string): Promise<RateLimitRedisClient>`, a `@c9up/quasar` connection checked for the commands the counter issues |

Refused SQL statements:

| Export | Kind | Description |
|---|---|---|
| `onUnsafeStatement` | function | `onUnsafeStatement(policy: UnsafeStatementPolicy): (event: UnsafeStatementLike) => Promise<void>`: counts the statements the query builder refused per key, and blocks a key past a threshold (notifies only, outside production) |
| `UnsafeStatementPolicy` | interface | `{ keyFor, store: RateLimitStore, windowSeconds?, thresholds?: { injectionPattern?, invalidShape? }, onBlock, onNotify?, blocking? }`; window 1 hour, thresholds 1 and 5 |
| `UnsafeStatementLike` | interface | `{ kind: 'injection-pattern' \| 'invalid-shape'; code; message; connection? }` |
| `UnsafeStatementDecision` | interface | `{ key?, count, threshold, blocked, event }` |

Errors: `E_BLACKHOLE_SESSION_NOT_READY`, `E_BLACKHOLE_UNKNOWN_CSP_KEYWORD`, `E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE`, `E_BLACKHOLE_DATABASE_UNAVAILABLE` and `E_BLACKHOLE_UNSUPPORTED_DATABASE` are exported error classes (see Errors). Every export of `@c9up/blackhole/limiter` is also exported here.

### `Blackhole`

| Member | Signature | Description |
|---|---|---|
| `check` | `check(req: { method; path; query?; headers; body?; remoteAddr?; protocol?; host?; csrfBinding?; checks?: EngineCheck[] }): CheckResult` | Run the request checks in the engine |
| `checkRateLimit` | `checkRateLimit(key: string): Promise<RateLimitDecision>` | Count against the configured store; throws without one |
| `hasRateLimitStore` | `hasRateLimitStore(): boolean` | Whether a store counts instead of the engine |
| `rateLimitKey` | `rateLimitKey(ctx: RateLimitContext): string` | `rateLimit.keyFor(ctx)`, or the client key of the IP |
| `rateLimitKeyedByRequest` | `rateLimitKeyedByRequest(): boolean` | Whether `keyFor` is set |
| `generateCsrfToken` | `generateCsrfToken(binding?: string): string` | A signed token, bound to a session secret when given |
| `csrfTokenIsValid` | `csrfTokenIsValid(token: string, binding?: string): boolean` | Whether a held token still verifies (to decide on reissuing it) |
| `csrfEnabled` / `xsrfCookieEnabled` / `csrfSessionRequired` | `(): boolean` | CSRF switches |
| `csrfExempt` | `csrfExempt(ctx: BlackholeContext): boolean` | Whether `exceptRoutes` exempts the request |
| `csrfCookie` | `csrfCookie(): { name: string; options: Record<string, unknown> }` | The `XSRF-TOKEN` cookie to seed |
| `securityHeaders` | `securityHeaders(nonce?: string, target?: CspKeywordTarget): Record<string, string>` | The protective headers, `@nonce` and other keywords resolved |
| `cspHasNonce` | `cspHasNonce(): boolean` | Whether the CSP names `@nonce` |
| `generateNonce` | `generateNonce(): string` | A fresh nonce |
| `cors` | `cors(requestOrigin: string, method: string, requestMethod?: string, requestHeaders?: string, ctx?: BlackholeContext): CorsResult \| undefined` | The CORS decision; `undefined` without `cors` |
| `sanitizeResponse` | `sanitizeResponse(body: string, contentType: string): string` | Sanitize a `text/html` body as untrusted markup, whatever `xss` says |
| `xssEnabled` | `xssEnabled(): boolean` | Whether responses are sanitized |

### `@c9up/blackhole/config`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | Same as in `@c9up/blackhole` |
| `BlackholeConfig` | interface | Same as in `@c9up/blackhole` |

### `@c9up/blackhole/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `BlackholeProvider`: builds the filter from the `blackhole` config (secret defaults to `APP_KEY`; CSRF bound to the session when `config/session.ts` exists) and the `LimiterManager` from `limiter` |
| `BlackholeAppContext` | interface | `{ container, config }` |
| `BLACKHOLE_KEY` | const | `'blackhole'` |
| `BLACKHOLE_LIMITER_KEY` | const | `'blackhole.limiter'` |

### `@c9up/blackhole/server_middleware`

| Export | Kind | Description |
|---|---|---|
| `default` | class | `BlackholeServerMiddleware`, `handle(ctx, next)`: rate limit (unless `keyFor` defers it), path traversal and parameter pollution checks, CORS and protective headers, on every request including a 404 |
| `blackholeServerMiddleware` | function | `blackholeServerMiddleware(ctx: ReamContext, next): Promise<void>`, the same as a function |

### `@c9up/blackhole/middleware`

| Export | Kind | Description |
|---|---|---|
| `default` | class | `BlackholeMiddleware`, `handle(ctx, next)`: CSRF check after the body parser and the session, CSP nonce on `response.nonce`, CSRF token on `request.csrfToken`, response sanitization; runs the server-tier checks too when that half is not registered |
| `blackholeMiddleware` | function | `blackholeMiddleware(ctx: ReamContext, next): Promise<void>` |
| `blackholeServerMiddleware` | function | Same as in `@c9up/blackhole/server_middleware` |
| `createBlackhole`, `Blackhole`, `BlackholeOptions` | function / type | Same as in `@c9up/blackhole` |
| `ReamContext` | interface | The slice of the HTTP context the middleware reads |

### `@c9up/blackhole/express`, `/fastify`, `/hono`

| Export | Kind | Description |
|---|---|---|
| `blackholeExpress` | function | `blackholeExpress(options?: BlackholeOptions)`, an Express middleware for the whole pipeline |
| `blackholeFastify` | function | `blackholeFastify(options?: BlackholeOptions)`, a Fastify plugin; register it at the root scope |
| `blackholeHono` | function | `blackholeHono(options?: BlackholeHonoOptions): MiddlewareHandler` |
| `BlackholeHonoOptions` | interface | `BlackholeOptions` plus `clientIp?(c)`, `protocol?(c)`, `host?(c)`; defaults read `@hono/node-server` and the request URL |

The adapters have no session: `csrf.session: true` refuses every request there. A page the application renders itself skips response sanitization when `trustedHtml` is `true` in `res.locals` (Express), on the reply (Fastify), with `c.set` (Hono) or in `ctx.store` (ream).

### `@c9up/blackhole/limiter`

| Export | Kind | Description |
|---|---|---|
| `LimiterManager` | class | Named stores and limits: `use`, `multi`, `allowRequests`, `define`, `noLimit`, `clear` |
| `Limiter` | class | One limit on one store |
| `MultiLimiter` | class | Several limits counted together, each on its key |
| `HttpLimiter` | class | Builder of a route limit: `store`, `allowRequests`, `every`, `usingKey`, `blockFor`, `limitExceeded` |
| `defineThrottle` | function | `defineThrottle(name: string, builder: (ctx) => HttpLimiter \| null \| Promise<HttpLimiter \| null>): ThrottleMiddleware` |
| `ThrottleMiddleware` | type | `(ctx: LimiterHttpContext, next) => Promise<void>` |
| `LimiterResponse` | class | `{ limit, remaining, consumed, availableIn }`, `toJSON()` |
| `ThrottleException` | error | `code` `E_TOO_MANY_REQUESTS`, `status` 429, `response`; `setMessage`, `setStatus`, `setHeaders`, `t(identifier, data?)`, `getDefaultHeaders()` |
| `limiterStores` | const | `memory()`, `redis({ connection, prefix? })`, `database({ connection?, tableName? })` |
| `MemoryLimiterStore` | class | In-process store |
| `RedisLimiterStore` | class | `new RedisLimiterStore(source: LimiterRedisSource, options?: { prefix?: string })`; prefix `blackhole:limiter` |
| `DatabaseLimiterStore` | class | `new DatabaseLimiterStore(source: LimiterDatabaseSource, options?: { tableName?: string })`; PostgreSQL, MySQL or SQLite, table `rate_limits` |
| `LimiterStore` | interface | `{ name; increment(key, amount, durationSeconds); set(key, consumed, durationSeconds); get(key); delete(key); clear() }`, each returning a promise |
| `LimiterRecord` | interface | `{ consumed: number; msBeforeNext: number }` |
| `LimiterStoreFactory` | type | `() => LimiterStore` |
| `LimiterRedisClient`, `LimiterRedisSource` | interface / type | What the Redis store calls |
| `LimiterDatabase`, `LimiterDatabaseSource` | interface / type | `{ dialect; rawQuery(sql, bindings) }`, or a function returning one |
| `LimiterOptions` | interface | `{ requests: number; duration: number \| string; blockDuration?: number \| string }` |
| `MultiLimiterOptions` | interface | `LimiterOptions & { key: string \| number }` |
| `LimiterConfig` | interface | `{ default: string; stores: Record<string, LimiterStoreFactory> }` |
| `ThrottleContext`, `LimiterHttpContext` | interface | The HTTP context slice a throttle reads |

`LimiterManager`:

| Member | Signature | Description |
|---|---|---|
| `use` | `use(options: LimiterOptions): Limiter`<br>`use(store: string, options: LimiterOptions): Limiter` | A limiter on the default or the named store |
| `multi` | `multi(options: MultiLimiterOptions[]): MultiLimiter`<br>`multi(store: string, options: MultiLimiterOptions[]): MultiLimiter` | |
| `allowRequests` | `allowRequests(requests: number): HttpLimiter` | Start a route limit |
| `define` | `define(name: string, builder): ThrottleMiddleware` | A named route middleware; the builder returns `null` for no limit |
| `noLimit` | `noLimit(): null` | |
| `clear` | `clear(stores?: string[]): Promise<void>` | Empty every store, or the named ones |
| `config` | `readonly config: LimiterConfig` | |

`Limiter` (`new Limiter(store: LimiterStore, options: LimiterOptions)`):

| Member | Signature | Description |
|---|---|---|
| `consume` | `consume(key: string, amount?: number): Promise<LimiterResponse>` | Count; throws `ThrottleException` over the budget |
| `increment` / `decrement` | `increment(key: string, amount?: number): Promise<LimiterResponse>` | Count without throwing |
| `attempt` | `attempt<T>(key: string, callback: () => T \| Promise<T>, amount?: number): Promise<T \| undefined>` | Run `callback` if the key has budget left |
| `penalize` | `penalize<T>(key: string, callback: () => T \| Promise<T>, amount?: number): Promise<[ThrottleException, null] \| [null, T]>` | Run `callback`; a throw counts against the key |
| `block` | `block(key: string, duration: number \| string): Promise<LimiterResponse>` | Block the key |
| `set` | `set(key: string, requests: number, duration?: number \| string): Promise<LimiterResponse>` | |
| `get` | `get(key: string): Promise<LimiterResponse \| null>` | |
| `delete` | `delete(key: string): Promise<boolean>` | |
| `remaining` / `availableIn` | `remaining(key: string): Promise<number>` | |
| `isBlocked` | `isBlocked(key: string): Promise<boolean>` | |
| `clear` | `clear(): Promise<void>` | |

```ts
import limiter from '@c9up/blackhole/services/limiter'

export const throttle = limiter.define('api', (ctx) =>
  limiter.allowRequests(60).every('1 minute').usingKey(ctx.auth?.user?.id),
)

const login = limiter.use({ requests: 5, duration: '1 minute', blockDuration: '20 mins' })
const [error, user] = await login.penalize(`login_${email}`, () => verify(email, password))
```

### `@c9up/blackhole/services/limiter`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `limiter: LimiterManager`, the manager `BlackholeProvider` seated, or an in-memory one when none was |
| `setLimiter` / `clearLimiter` | function | `setLimiter(manager: LimiterManager): void` / `clearLimiter(manager: LimiterManager): void` |

### `@c9up/blackhole/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: registers the provider and both middleware, writes `config/blackhole.ts` |

## Configuration

`config/blackhole.ts`, read under the `blackhole` key.

```ts
import { defineConfig, stores } from '@c9up/blackhole'
import env from '#start/env'

export default defineConfig({
  secret: env.get('APP_KEY'),
  csrf: { trustedOrigins: ['https://admin.example.com'] },
  rateLimit: {
    max: 100,
    windowSeconds: 60,
    default: env.get('RATE_LIMIT_STORE', 'memory'),
    stores: { memory: stores.memory(), redis: stores.redis({ connection: 'main' }) },
  },
  csp: { directives: { scriptSrc: ["'self'", '@nonce', 'https://cdn.example'] } },
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `secret` | `string \| ReleasableSecret` | `APP_KEY` (provider) | Signs CSRF tokens; required while CSRF is on, a publicly known value is refused |
| `csrf` | `boolean \| CsrfConfig` | `true` | CSRF check on unsafe methods |
| `rateLimit` | `{ max; windowSeconds; keyFor?; default?; stores?; store? }` | — | One budget for every request; without a store, the engine counts in this process |
| `limiter` | `LimiterConfig` | `{ default: 'memory', stores: { memory } }` | Stores behind the named and manual limits |
| `pathTraversal` | `boolean` | `true` | Refuse `..` in the path, raw or percent-encoded |
| `paramPollution` | `boolean` | `true` | Refuse a repeated query key (keys ending in `[]` excepted) |
| `cors` | `CorsConfig` | — | Omitted, CORS is not handled |
| `xss` | `boolean \| XssConfig` | `false` | Sanitize every `text/html` response as untrusted markup |
| `xFrame` | `XFrameConfig` | on, `SAMEORIGIN` | `X-Frame-Options` |
| `hsts` | `HstsConfig` | on, 180 days, `includeSubDomains` | `Strict-Transport-Security`; `maxAge` in seconds or a duration string |
| `contentTypeSniffing` | `ContentTypeSniffingConfig` | on | `X-Content-Type-Options: nosniff` |
| `csp` | `CspConfig` | on, `DEFAULT_CSP_POLICY` | `Content-Security-Policy`; `directives` merge over `getDefaultDirectives()` unless `useDefaults: false`, or a `policy` string; `reportOnly` |
| `referrerPolicy` | `ReferrerPolicyConfig` | on, `strict-origin-when-cross-origin` | `Referrer-Policy` |
| `permissionsPolicy` | `PermissionsPolicyConfig` | on, `camera=(), microphone=(), geolocation=()` | `Permissions-Policy` |

`X-XSS-Protection: 0` is always sent. A header is added only where the handler did not set it. An unknown key in a header object throws.

`CsrfConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | |
| `methods` | `string[]` | `POST`, `PUT`, `PATCH`, `DELETE` | Methods checked |
| `exceptRoutes` | `string[] \| ((ctx: BlackholeContext) => boolean)` | — | Route patterns, paths, path prefixes ending in `*`, or a predicate |
| `trustedOrigins` | `string[]` | — | Other origins allowed for state-changing requests; same origin always is |
| `enableXsrfCookie` | `boolean` | `true` | Seed the readable `XSRF-TOKEN` cookie |
| `session` | `boolean` | `true` when `config/session.ts` exists (provider) | Bind tokens to the session and refuse a request without one |
| `cookie` / `cookieOptions` | `CsrfCookieConfig` | `sameSite: 'lax'`, `path: '/'` | `XSRF-TOKEN` cookie attributes |

The token is read from `X-XSRF-TOKEN`, `X-CSRF-TOKEN` or the `_csrf` form field.

`CorsConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `origin` | `CorsOriginValue \| ((origin, ctx) => CorsOriginValue)` | — | `true` reflects, `'*'` is the wildcard, `false` none, a string or array is an allow-list; `true` and `'*'` are refused with `credentials` |
| `enabled` | `boolean \| ((ctx) => boolean)` | `true` | |
| `methods` | `string[]` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` | Preflight methods |
| `headers` | `CorsHeadersValue \| ((headers, ctx) => CorsHeadersValue)` | `Content-Type`, `Authorization`, `Accept`, `X-Requested-With` | Preflight request headers; `true` reflects |
| `exposeHeaders` / `exposedHeaders` | `string[]` | — | `Access-Control-Expose-Headers` |
| `credentials` | `boolean` | — | `Access-Control-Allow-Credentials: true` |
| `maxAge` | `number` | — | Preflight cache, in seconds |

## Container bindings

| Token | Resolves to |
|---|---|
| `'blackhole'` (`BLACKHOLE_KEY`) | The `Blackhole` built from the `blackhole` config |
| `'blackhole.limiter'` (`BLACKHOLE_LIMITER_KEY`) | The `LimiterManager` |

## Errors

| Code | Raised when |
|---|---|
| [`E_BLACKHOLE_RATE_LIMITED`](/en/reference/errors#e-blackhole-rate-limited) | The global rate limit refused the request (429, `Retry-After`) |
| [`E_TOO_MANY_REQUESTS`](/en/reference/errors#e-too-many-requests) | A throttle middleware or `limiter.consume()` found the key over its budget (`ThrottleException`, 429) |
| [`E_BAD_CSRF_TOKEN`](/en/reference/errors#e-bad-csrf-token) | The CSRF token is missing or invalid (403) |
| [`E_BLACKHOLE_CSRF_ORIGIN_MISMATCH`](/en/reference/errors#e-blackhole-csrf-origin-mismatch) | A state-changing request came from an origin not trusted (403) |
| [`E_BLACKHOLE_PATH_TRAVERSAL`](/en/reference/errors#e-blackhole-path-traversal) | The path holds `..` (400) |
| [`E_BLACKHOLE_PARAMETER_POLLUTION`](/en/reference/errors#e-blackhole-parameter-pollution) | A query key appears twice (400) |
| [`E_BLACKHOLE_MISSING_IP`](/en/reference/errors#e-blackhole-missing-ip) | Rate limiting is on and the request has no client address (400) |
| [`E_BLACKHOLE_BLOCKED`](/en/reference/errors#e-blackhole-blocked) | A refusal the engine gave no JSON body for |
| [`E_BLACKHOLE_SESSION_NOT_READY`](/en/reference/errors#e-blackhole-session-not-ready) | CSRF is bound to the session and the request reached the middleware without one (500) |
| [`E_BLACKHOLE_UNKNOWN_CSP_KEYWORD`](/en/reference/errors#e-blackhole-unknown-csp-keyword) | The CSP names an `@keyword` with no resolver, or a keyword was registered under an invalid name |
| [`E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE`](/en/reference/errors#e-blackhole-invalid-csp-keyword-value) | A keyword resolver answered a value with `;`, `,` or a line break |
| [`E_BLACKHOLE_DATABASE_UNAVAILABLE`](/en/reference/errors#e-blackhole-database-unavailable) | The database limiter store has no database to count in |
| [`E_BLACKHOLE_UNSUPPORTED_DATABASE`](/en/reference/errors#e-blackhole-unsupported-database) | The database limiter store was given a database other than PostgreSQL, MySQL or SQLite |

An invalid option (a CSP source left unquoted, CORS `credentials` with a wildcard origin, a fractional rate limit, a missing or public secret) throws a plain `Error` when the filter is built.

## Migration

`securityHeaders` is no longer an option, and a config that still sets it throws. Move each header to its own top-level key: `xFrame`, `hsts`, `contentTypeSniffing`, `csp`, `referrerPolicy`, `permissionsPolicy`, each `{ enabled, ... }`.

## See also

- [CSRF protection](/en/guides/security/csrf)
- [Rate limiting](/en/guides/security/rate-limiting)
- [XSS sanitization](/en/guides/security/xss)
- [Securing server-rendered apps](/en/guides/security/securing-ssr)
