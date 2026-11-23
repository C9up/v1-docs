# blackhole

`@c9up/blackhole` : un filtre de sécurité exécuté par un moteur Rust natif : jetons CSRF, limitation de débit, refus du path traversal et de la pollution de paramètres, CORS, en-têtes de protection avec une CSP à nonce, et assainissement des réponses HTML, pour ream, Express, Fastify et Hono. Il porte aussi le limiteur nommé par route. Guide : [Protection CSRF](/fr/guides/security/csrf).

## Installation

```bash
pnpm add @c9up/blackhole
```

`ream configure @c9up/blackhole` enregistre le provider, enregistre `@c9up/blackhole/server_middleware` sur le niveau serveur et `@c9up/blackhole/middleware` à la fin du niveau routeur, et écrit `config/blackhole.ts`. Un stockage Redis demande `@c9up/quasar` (ou votre propre client) ; le stockage base de données du limiteur utilise `@c9up/atlas` s'il est présent ; `@c9up/blackhole/hono` demande `hono`. Le paquet embarque son moteur natif ; sans lui, `createBlackhole()` lève une erreur.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/blackhole` | `createBlackhole`, `defineConfig`, les types d'options, les mots-clés CSP, les stockages de limitation, le limiteur, les erreurs |
| `@c9up/blackhole/config` | `defineConfig`, `BlackholeConfig` |
| `@c9up/blackhole/provider` | `BlackholeProvider` (export par défaut) et ses clés de conteneur |
| `@c9up/blackhole/server_middleware` | Le middleware du niveau serveur : limitation, contrôles du chemin, CORS, en-têtes |
| `@c9up/blackhole/middleware` | Le middleware du niveau routeur : CSRF, nonce CSP, assainissement des réponses |
| `@c9up/blackhole/express` | `blackholeExpress()` |
| `@c9up/blackhole/fastify` | `blackholeFastify()` |
| `@c9up/blackhole/hono` | `blackholeHono()` |
| `@c9up/blackhole/limiter` | Le limiteur nommé et manuel |
| `@c9up/blackhole/services/limiter` | Le `LimiterManager` de l'application (export par défaut) |
| `@c9up/blackhole/configure` | `configure()`, exécuté par `ream configure @c9up/blackhole` |

## Exports

### `@c9up/blackhole`

Le filtre :

| Export | Nature | Description |
|---|---|---|
| `createBlackhole` | fonction | `createBlackhole(options?: BlackholeOptions): Blackhole` ; valide les options et lève une erreur sur une mauvaise configuration |
| `Blackhole` | interface | L'instance du filtre (voir plus bas) |
| `BlackholeOptions` | interface | Options de `createBlackhole` (voir Configuration) |
| `defineConfig` | fonction | `defineConfig(config: BlackholeConfig): BlackholeConfig` |
| `BlackholeConfig` | interface | `BlackholeOptions` plus `limiter` et les stockages de limitation nommés |
| `CheckResult` | interface | `{ allowed, status?, body?, headers?, rateLimit?: RateLimitMeta, csrfEnforced? }` |
| `EngineCheck` | type | `'rateLimit' \| 'shield' \| 'csrf'` |
| `RateLimitMeta` | interface | `{ limit, remaining, resetSeconds }` |
| `BlackholeContext` | interface | `{ request: { method(), url(), header(name) }, route? }`, ce que reçoit un callback CORS ou CSRF |
| `pathContext` | fonction | `pathContext(method: string, path: string, headers?, routePattern?): BlackholeContext`, pour un hôte sans objet de contexte |
| `clientKey` | fonction | `clientKey(ip: string): string` ; une adresse IPv6 compte par son /64 |
| `assertNoRetiredOptions` | fonction | `assertNoRetiredOptions(options: object): void` ; lève une erreur pour une option retirée |
| `ReleasableSecret` | interface | `{ release(): string }`, un `Secret` d'environnement |

En-têtes et CSP :

| Export | Nature | Description |
|---|---|---|
| `SecurityHeadersOptions` | interface | `{ xFrame?, hsts?, contentTypeSniffing?, csp?, referrerPolicy?, permissionsPolicy? }` |
| `XFrameConfig` | interface | `{ enabled?, action?: 'DENY' \| 'SAMEORIGIN' \| 'ALLOW-FROM', domain? }` |
| `HstsConfig` | interface | `{ enabled?, maxAge?: number \| string, includeSubDomains?, preload? }` |
| `ContentTypeSniffingConfig` | interface | `{ enabled? }` |
| `CspConfig` | interface | `{ enabled?, directives?, useDefaults?, policy?, reportOnly? }` |
| `ReferrerPolicyConfig`, `PermissionsPolicyConfig` | interface | `{ enabled?, policy? }` |
| `DEFAULT_CSP_POLICY` | const | `"default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' @nonce"` |
| `getDefaultDirectives` | fonction | `getDefaultDirectives(): Record<string, string[]>`, la base fusionnée sous `csp.directives` |
| `dangerouslyDisableDefaultSrc` | const | Symbole à donner à `csp.directives.defaultSrc` pour retirer `default-src` |
| `cspKeywords` | const | Le registre `CspKeywords` : `register(keyword, resolver)`, `has(keyword)` |
| `CspKeywords` | classe | La classe du registre |
| `CspKeywordResolver` | type | `(request: unknown, response: unknown, nonce: string \| undefined) => string` ; une réponse vide retire le mot-clé |
| `CspKeywordTarget` | interface | `{ request?, response? }` |

CSRF, CORS, XSS :

| Export | Nature | Description |
|---|---|---|
| `CsrfConfig` | interface | Options CSRF (voir Configuration) |
| `CsrfCookieConfig` | interface | `{ sameSite?: 'strict' \| 'lax' \| 'none', secure?, httpOnly?, path? }` |
| `CorsConfig` | interface | Options CORS (voir Configuration) |
| `CorsResult` | interface | `{ headers, varyOrigin, preflight }` |
| `CorsOriginValue`, `CorsHeadersValue` | type | `boolean \| string \| string[]` |
| `XssConfig` | interface | `{ enabled?, allowAttributes?: XssOptInAttribute[] }` |
| `XssOptInAttribute` | type | `'id' \| 'is' \| 'slot' \| 'part' \| 'data-*'` |

Stockages de limitation (l'option globale `rateLimit`) :

| Export | Nature | Description |
|---|---|---|
| `RateLimitStore` | interface | `{ increment(key: string, windowSeconds: number): Promise<{ count: number; resetSeconds: number }> }` |
| `RateLimitStoreFactory` | type | `() => RateLimitStore` |
| `stores` | const | `stores.memory()`, `stores.redis({ connection, prefix? })` ; `connection` est un client, un résolveur ou un nom de connexion `@c9up/quasar` |
| `MemoryRateLimitStore` | classe | Compte dans ce processus |
| `RedisRateLimitStore` | classe | `new RedisRateLimitStore(source: RateLimitRedisSource, options?: { prefix?: string })` ; préfixe `blackhole:rate` |
| `RateLimitRedisClient` | interface | `{ incr, expire, ttl }` |
| `RateLimitRedisSource` | type | Un client, ou une fonction qui en renvoie un |
| `RateLimitContext` | interface | `{ request: { ip(): string }; auth?: { user?: { id? } \| null } }`, ce que reçoit `keyFor` |
| `RateLimitDecision` | interface | `{ allowed, limit, remaining, resetSeconds }` |
| `quasarConnection` | fonction | `quasarConnection(name?: string): Promise<RateLimitRedisClient>`, une connexion `@c9up/quasar` vérifiée pour les commandes qu'émet le compteur |

Requêtes SQL refusées :

| Export | Nature | Description |
|---|---|---|
| `onUnsafeStatement` | fonction | `onUnsafeStatement(policy: UnsafeStatementPolicy): (event: UnsafeStatementLike) => Promise<void>` : compte par clé les requêtes que le query builder a refusées et bloque une clé au-delà d'un seuil (notifie seulement, hors production) |
| `UnsafeStatementPolicy` | interface | `{ keyFor, store: RateLimitStore, windowSeconds?, thresholds?: { injectionPattern?, invalidShape? }, onBlock, onNotify?, blocking? }` ; fenêtre d'une heure, seuils 1 et 5 |
| `UnsafeStatementLike` | interface | `{ kind: 'injection-pattern' \| 'invalid-shape'; code; message; connection? }` |
| `UnsafeStatementDecision` | interface | `{ key?, count, threshold, blocked, event }` |

Erreurs : `E_BLACKHOLE_SESSION_NOT_READY`, `E_BLACKHOLE_UNKNOWN_CSP_KEYWORD`, `E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE`, `E_BLACKHOLE_DATABASE_UNAVAILABLE` et `E_BLACKHOLE_UNSUPPORTED_DATABASE` sont des classes d'erreur exportées (voir Erreurs). Chaque export de `@c9up/blackhole/limiter` est aussi exporté ici.

### `Blackhole`

| Membre | Signature | Description |
|---|---|---|
| `check` | `check(req: { method; path; query?; headers; body?; remoteAddr?; protocol?; host?; csrfBinding?; checks?: EngineCheck[] }): CheckResult` | Exécute les contrôles de la requête dans le moteur |
| `checkRateLimit` | `checkRateLimit(key: string): Promise<RateLimitDecision>` | Compte sur le stockage configuré ; lève une erreur sans stockage |
| `hasRateLimitStore` | `hasRateLimitStore(): boolean` | Indique si un stockage compte à la place du moteur |
| `rateLimitKey` | `rateLimitKey(ctx: RateLimitContext): string` | `rateLimit.keyFor(ctx)`, ou la clé client de l'IP |
| `rateLimitKeyedByRequest` | `rateLimitKeyedByRequest(): boolean` | Indique si `keyFor` est défini |
| `generateCsrfToken` | `generateCsrfToken(binding?: string): string` | Un jeton signé, lié à un secret de session s'il est fourni |
| `csrfTokenIsValid` | `csrfTokenIsValid(token: string, binding?: string): boolean` | Indique si un jeton détenu se vérifie encore (pour décider de le réémettre) |
| `csrfEnabled` / `xsrfCookieEnabled` / `csrfSessionRequired` | `(): boolean` | Interrupteurs CSRF |
| `csrfExempt` | `csrfExempt(ctx: BlackholeContext): boolean` | Indique si `exceptRoutes` exempte la requête |
| `csrfCookie` | `csrfCookie(): { name: string; options: Record<string, unknown> }` | Le cookie `XSRF-TOKEN` à déposer |
| `securityHeaders` | `securityHeaders(nonce?: string, target?: CspKeywordTarget): Record<string, string>` | Les en-têtes de protection, `@nonce` et les autres mots-clés résolus |
| `cspHasNonce` | `cspHasNonce(): boolean` | Indique si la CSP nomme `@nonce` |
| `generateNonce` | `generateNonce(): string` | Un nonce neuf |
| `cors` | `cors(requestOrigin: string, method: string, requestMethod?: string, requestHeaders?: string, ctx?: BlackholeContext): CorsResult \| undefined` | La décision CORS ; `undefined` sans `cors` |
| `sanitizeResponse` | `sanitizeResponse(body: string, contentType: string): string` | Assainit un corps `text/html` comme balisage non fiable, quoi que dise `xss` |
| `xssEnabled` | `xssEnabled(): boolean` | Indique si les réponses sont assainies |

### `@c9up/blackhole/config`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | Identique à celle de `@c9up/blackhole` |
| `BlackholeConfig` | interface | Identique à celle de `@c9up/blackhole` |

### `@c9up/blackhole/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `BlackholeProvider` : construit le filtre depuis la configuration `blackhole` (secret par défaut `APP_KEY` ; CSRF lié à la session quand `config/session.ts` existe) et le `LimiterManager` depuis `limiter` |
| `BlackholeAppContext` | interface | `{ container, config }` |
| `BLACKHOLE_KEY` | const | `'blackhole'` |
| `BLACKHOLE_LIMITER_KEY` | const | `'blackhole.limiter'` |

### `@c9up/blackhole/server_middleware`

| Export | Nature | Description |
|---|---|---|
| `default` | classe | `BlackholeServerMiddleware`, `handle(ctx, next)` : limitation (sauf si `keyFor` la diffère), contrôles de path traversal et de pollution de paramètres, CORS et en-têtes de protection, sur chaque requête, 404 comprise |
| `blackholeServerMiddleware` | fonction | `blackholeServerMiddleware(ctx: ReamContext, next): Promise<void>`, la même chose sous forme de fonction |

### `@c9up/blackhole/middleware`

| Export | Nature | Description |
|---|---|---|
| `default` | classe | `BlackholeMiddleware`, `handle(ctx, next)` : contrôle CSRF après le body parser et la session, nonce CSP sur `response.nonce`, jeton CSRF sur `request.csrfToken`, assainissement des réponses ; exécute aussi les contrôles du niveau serveur quand cette moitié n'est pas enregistrée |
| `blackholeMiddleware` | fonction | `blackholeMiddleware(ctx: ReamContext, next): Promise<void>` |
| `blackholeServerMiddleware` | fonction | Identique à celle de `@c9up/blackhole/server_middleware` |
| `createBlackhole`, `Blackhole`, `BlackholeOptions` | fonction / type | Identiques à ceux de `@c9up/blackhole` |
| `ReamContext` | interface | La partie du contexte HTTP que lit le middleware |

### `@c9up/blackhole/express`, `/fastify`, `/hono`

| Export | Nature | Description |
|---|---|---|
| `blackholeExpress` | fonction | `blackholeExpress(options?: BlackholeOptions)`, un middleware Express pour tout le pipeline |
| `blackholeFastify` | fonction | `blackholeFastify(options?: BlackholeOptions)`, un plugin Fastify ; enregistrez-le à la racine |
| `blackholeHono` | fonction | `blackholeHono(options?: BlackholeHonoOptions): MiddlewareHandler` |
| `BlackholeHonoOptions` | interface | `BlackholeOptions` plus `clientIp?(c)`, `protocol?(c)`, `host?(c)` ; par défaut, lus depuis `@hono/node-server` et l'URL de la requête |

Les adaptateurs n'ont pas de session : `csrf.session: true` y refuse toutes les requêtes. Une page que l'application rend elle-même échappe à l'assainissement quand `trustedHtml` vaut `true` dans `res.locals` (Express), sur la réponse (Fastify), via `c.set` (Hono) ou dans `ctx.store` (ream).

### `@c9up/blackhole/limiter`

| Export | Nature | Description |
|---|---|---|
| `LimiterManager` | classe | Stockages et limites nommés : `use`, `multi`, `allowRequests`, `define`, `noLimit`, `clear` |
| `Limiter` | classe | Une limite sur un stockage |
| `MultiLimiter` | classe | Plusieurs limites comptées ensemble, chacune sur sa clé |
| `HttpLimiter` | classe | Constructeur d'une limite de route : `store`, `allowRequests`, `every`, `usingKey`, `blockFor`, `limitExceeded` |
| `defineThrottle` | fonction | `defineThrottle(name: string, builder: (ctx) => HttpLimiter \| null \| Promise<HttpLimiter \| null>): ThrottleMiddleware` |
| `ThrottleMiddleware` | type | `(ctx: LimiterHttpContext, next) => Promise<void>` |
| `LimiterResponse` | classe | `{ limit, remaining, consumed, availableIn }`, `toJSON()` |
| `ThrottleException` | erreur | `code` `E_TOO_MANY_REQUESTS`, `status` 429, `response` ; `setMessage`, `setStatus`, `setHeaders`, `t(identifier, data?)`, `getDefaultHeaders()` |
| `limiterStores` | const | `memory()`, `redis({ connection, prefix? })`, `database({ connection?, tableName? })` |
| `MemoryLimiterStore` | classe | Stockage dans le processus |
| `RedisLimiterStore` | classe | `new RedisLimiterStore(source: LimiterRedisSource, options?: { prefix?: string })` ; préfixe `blackhole:limiter` |
| `DatabaseLimiterStore` | classe | `new DatabaseLimiterStore(source: LimiterDatabaseSource, options?: { tableName?: string })` ; PostgreSQL, MySQL ou SQLite, table `rate_limits` |
| `LimiterStore` | interface | `{ name; increment(key, amount, durationSeconds); set(key, consumed, durationSeconds); get(key); delete(key); clear() }`, chacune renvoyant une promesse |
| `LimiterRecord` | interface | `{ consumed: number; msBeforeNext: number }` |
| `LimiterStoreFactory` | type | `() => LimiterStore` |
| `LimiterRedisClient`, `LimiterRedisSource` | interface / type | Ce qu'appelle le stockage Redis |
| `LimiterDatabase`, `LimiterDatabaseSource` | interface / type | `{ dialect; rawQuery(sql, bindings) }`, ou une fonction qui en renvoie un |
| `LimiterOptions` | interface | `{ requests: number; duration: number \| string; blockDuration?: number \| string }` |
| `MultiLimiterOptions` | interface | `LimiterOptions & { key: string \| number }` |
| `LimiterConfig` | interface | `{ default: string; stores: Record<string, LimiterStoreFactory> }` |
| `ThrottleContext`, `LimiterHttpContext` | interface | La partie du contexte HTTP que lit une limite |

`LimiterManager` :

| Membre | Signature | Description |
|---|---|---|
| `use` | `use(options: LimiterOptions): Limiter`<br>`use(store: string, options: LimiterOptions): Limiter` | Un limiteur sur le stockage par défaut ou nommé |
| `multi` | `multi(options: MultiLimiterOptions[]): MultiLimiter`<br>`multi(store: string, options: MultiLimiterOptions[]): MultiLimiter` | |
| `allowRequests` | `allowRequests(requests: number): HttpLimiter` | Commence une limite de route |
| `define` | `define(name: string, builder): ThrottleMiddleware` | Un middleware de route nommé ; le builder renvoie `null` pour ne pas limiter |
| `noLimit` | `noLimit(): null` | |
| `clear` | `clear(stores?: string[]): Promise<void>` | Vide tous les stockages, ou ceux nommés |
| `config` | `readonly config: LimiterConfig` | |

`Limiter` (`new Limiter(store: LimiterStore, options: LimiterOptions)`) :

| Membre | Signature | Description |
|---|---|---|
| `consume` | `consume(key: string, amount?: number): Promise<LimiterResponse>` | Compte ; lève `ThrottleException` au-delà du budget |
| `increment` / `decrement` | `increment(key: string, amount?: number): Promise<LimiterResponse>` | Compte sans lever d'erreur |
| `attempt` | `attempt<T>(key: string, callback: () => T \| Promise<T>, amount?: number): Promise<T \| undefined>` | Exécute `callback` s'il reste du budget à la clé |
| `penalize` | `penalize<T>(key: string, callback: () => T \| Promise<T>, amount?: number): Promise<[ThrottleException, null] \| [null, T]>` | Exécute `callback` ; une erreur compte contre la clé |
| `block` | `block(key: string, duration: number \| string): Promise<LimiterResponse>` | Bloque la clé |
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

| Export | Nature | Description |
|---|---|---|
| `default` | const | `limiter: LimiterManager`, le gestionnaire installé par `BlackholeProvider`, ou un gestionnaire en mémoire sinon |
| `setLimiter` / `clearLimiter` | fonction | `setLimiter(manager: LimiterManager): void` / `clearLimiter(manager: LimiterManager): void` |

### `@c9up/blackhole/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : enregistre le provider et les deux middlewares, écrit `config/blackhole.ts` |

## Configuration

`config/blackhole.ts`, lu sous la clé `blackhole`.

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

| Option | Type | Défaut | Description |
|---|---|---|---|
| `secret` | `string \| ReleasableSecret` | `APP_KEY` (provider) | Signe les jetons CSRF ; obligatoire tant que CSRF est actif, une valeur publique est refusée |
| `csrf` | `boolean \| CsrfConfig` | `true` | Contrôle CSRF sur les méthodes non sûres |
| `rateLimit` | `{ max; windowSeconds; keyFor?; default?; stores?; store? }` | — | Un budget pour toutes les requêtes ; sans stockage, le moteur compte dans ce processus |
| `limiter` | `LimiterConfig` | `{ default: 'memory', stores: { memory } }` | Stockages des limites nommées et manuelles |
| `pathTraversal` | `boolean` | `true` | Refuse `..` dans le chemin, brut ou encodé |
| `paramPollution` | `boolean` | `true` | Refuse une clé de query répétée (sauf les clés finissant par `[]`) |
| `cors` | `CorsConfig` | — | Absent, CORS n'est pas géré |
| `xss` | `boolean \| XssConfig` | `false` | Assainit chaque réponse `text/html` comme balisage non fiable |
| `xFrame` | `XFrameConfig` | actif, `SAMEORIGIN` | `X-Frame-Options` |
| `hsts` | `HstsConfig` | actif, 180 jours, `includeSubDomains` | `Strict-Transport-Security` ; `maxAge` en secondes ou en durée |
| `contentTypeSniffing` | `ContentTypeSniffingConfig` | actif | `X-Content-Type-Options: nosniff` |
| `csp` | `CspConfig` | actif, `DEFAULT_CSP_POLICY` | `Content-Security-Policy` ; `directives` fusionnées sur `getDefaultDirectives()` sauf `useDefaults: false`, ou une chaîne `policy` ; `reportOnly` |
| `referrerPolicy` | `ReferrerPolicyConfig` | actif, `strict-origin-when-cross-origin` | `Referrer-Policy` |
| `permissionsPolicy` | `PermissionsPolicyConfig` | actif, `camera=(), microphone=(), geolocation=()` | `Permissions-Policy` |

`X-XSS-Protection: 0` est toujours envoyé. Un en-tête n'est ajouté que si le handler ne l'a pas fixé. Une clé inconnue dans l'objet d'un en-tête lève une erreur.

`CsrfConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | |
| `methods` | `string[]` | `POST`, `PUT`, `PATCH`, `DELETE` | Méthodes contrôlées |
| `exceptRoutes` | `string[] \| ((ctx: BlackholeContext) => boolean)` | — | Motifs de route, chemins, préfixes de chemin finissant par `*`, ou un prédicat |
| `trustedOrigins` | `string[]` | — | Autres origines autorisées pour les requêtes qui modifient l'état ; la même origine l'est toujours |
| `enableXsrfCookie` | `boolean` | `true` | Dépose le cookie lisible `XSRF-TOKEN` |
| `session` | `boolean` | `true` quand `config/session.ts` existe (provider) | Lie les jetons à la session et refuse une requête sans session |
| `cookie` / `cookieOptions` | `CsrfCookieConfig` | `sameSite: 'lax'`, `path: '/'` | Attributs du cookie `XSRF-TOKEN` |

Le jeton est lu dans `X-XSRF-TOKEN`, `X-CSRF-TOKEN` ou le champ de formulaire `_csrf`.

`CorsConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `origin` | `CorsOriginValue \| ((origin, ctx) => CorsOriginValue)` | — | `true` renvoie l'origine, `'*'` est le joker, `false` aucune, une chaîne ou un tableau est une liste autorisée ; `true` et `'*'` sont refusés avec `credentials` |
| `enabled` | `boolean \| ((ctx) => boolean)` | `true` | |
| `methods` | `string[]` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` | Méthodes du preflight |
| `headers` | `CorsHeadersValue \| ((headers, ctx) => CorsHeadersValue)` | `Content-Type`, `Authorization`, `Accept`, `X-Requested-With` | En-têtes de requête du preflight ; `true` les renvoie |
| `exposeHeaders` / `exposedHeaders` | `string[]` | — | `Access-Control-Expose-Headers` |
| `credentials` | `boolean` | — | `Access-Control-Allow-Credentials: true` |
| `maxAge` | `number` | — | Cache du preflight, en secondes |

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `'blackhole'` (`BLACKHOLE_KEY`) | Le `Blackhole` construit depuis la configuration `blackhole` |
| `'blackhole.limiter'` (`BLACKHOLE_LIMITER_KEY`) | Le `LimiterManager` |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_BLACKHOLE_RATE_LIMITED`](/fr/reference/errors#e-blackhole-rate-limited) | La limitation globale a refusé la requête (429, `Retry-After`) |
| [`E_TOO_MANY_REQUESTS`](/fr/reference/errors#e-too-many-requests-blackhole) | Un middleware de limite ou `limiter.consume()` a trouvé la clé au-delà de son budget (`ThrottleException`, 429) |
| [`E_BAD_CSRF_TOKEN`](/fr/reference/errors#e-bad-csrf-token) | Le jeton CSRF manque ou est invalide (403) |
| [`E_BLACKHOLE_CSRF_ORIGIN_MISMATCH`](/fr/reference/errors#e-blackhole-csrf-origin-mismatch) | Une requête qui modifie l'état vient d'une origine non approuvée (403) |
| [`E_BLACKHOLE_PATH_TRAVERSAL`](/fr/reference/errors#e-blackhole-path-traversal) | Le chemin contient `..` (400) |
| [`E_BLACKHOLE_PARAMETER_POLLUTION`](/fr/reference/errors#e-blackhole-parameter-pollution) | Une clé de query apparaît deux fois (400) |
| [`E_BLACKHOLE_MISSING_IP`](/fr/reference/errors#e-blackhole-missing-ip) | La limitation est active et la requête n'a pas d'adresse client (400) |
| [`E_BLACKHOLE_BLOCKED`](/fr/reference/errors#e-blackhole-blocked) | Un refus pour lequel le moteur n'a pas fourni de corps JSON |
| [`E_BLACKHOLE_SESSION_NOT_READY`](/fr/reference/errors#e-blackhole-session-not-ready) | CSRF est lié à la session et la requête a atteint le middleware sans session (500) |
| [`E_BLACKHOLE_UNKNOWN_CSP_KEYWORD`](/fr/reference/errors#e-blackhole-unknown-csp-keyword) | La CSP nomme un `@keyword` sans résolveur, ou un mot-clé a été enregistré sous un nom invalide |
| [`E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE`](/fr/reference/errors#e-blackhole-invalid-csp-keyword-value) | Le résolveur d'un mot-clé a répondu une valeur contenant `;`, `,` ou un saut de ligne |
| [`E_BLACKHOLE_DATABASE_UNAVAILABLE`](/fr/reference/errors#e-blackhole-database-unavailable) | Le stockage base de données du limiteur n'a pas de base où compter |
| [`E_BLACKHOLE_UNSUPPORTED_DATABASE`](/fr/reference/errors#e-blackhole-unsupported-database) | Le stockage base de données du limiteur a reçu une base autre que PostgreSQL, MySQL ou SQLite |

Une option invalide (une source CSP sans guillemets, `credentials` CORS avec une origine joker, une limite fractionnaire, un secret absent ou public) lève une `Error` simple à la construction du filtre.

## Migration

`securityHeaders` n'est plus une option, et une configuration qui la fixe encore lève une erreur. Déplacez chaque en-tête sur sa propre clé de premier niveau : `xFrame`, `hsts`, `contentTypeSniffing`, `csp`, `referrerPolicy`, `permissionsPolicy`, chacune `{ enabled, ... }`.

## Voir aussi

- [Protection CSRF](/fr/guides/security/csrf)
- [Limitation de débit](/fr/guides/security/rate-limiting)
- [Assainissement XSS](/fr/guides/security/xss)
- [Sécuriser une app rendue côté serveur](/fr/guides/security/securing-ssr)
