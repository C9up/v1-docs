# Blackhole — Sécurité

`@c9up/blackhole` est un filtre de sécurité Rust-natif pour tout framework Node.js. Les vérifications s'exécutent en Rust via NAPI — une requête rejetée reçoit sa réponse avant que ton handler ne s'exécute. Utilisable avec Ream (provider + middleware) ou standalone avec Express / Fastify.

## Installation

```bash
pnpm add @c9up/blackhole
ream configure @c9up/blackhole
```

Le package expose ces points d'entrée :
- `@c9up/blackhole/provider` — Provider IoC Ream (lit `config/blackhole.ts`)
- `@c9up/blackhole/server_middleware` — Middleware Ream du tier server (limite de débit, bouclier, CORS, en-têtes de protection — sur chaque requête, 404 compris)
- `@c9up/blackhole/middleware` — Middleware Ream du tier router (CSRF ; tous les contrôles quand il est seul)
- `@c9up/blackhole/express` — `blackholeExpress(options)` pour Express
- `@c9up/blackhole/fastify` — `blackholeFastify(options)` plugin Fastify
- `@c9up/blackhole/hono` — `blackholeHono(options)` middleware Hono
- `@c9up/blackhole` — API bas-niveau `createBlackhole(options)` pour wirer n'importe quel framework toi-même

Tous les adaptateurs partagent un seul pipeline (`./core`) : aucune logique de sécurité dupliquée entre eux.

### Utilisation

```ts
// Ream — config/blackhole.ts + start/kernel.ts (ce qu'écrit `ream configure`)
server.use([() => import('@c9up/blackhole/server_middleware')])
router.use([() => import('@c9up/blackhole/middleware')])

// Hono
import { blackholeHono } from '@c9up/blackhole/hono'
app.use(blackholeHono({ csrf: true, secret: process.env.APP_KEY, clientIp: (c) => getConnInfo(c).remote.address ?? '' }))
// le token : c.get('csrfToken') ; le nonce CSP : c.get('cspNonce')

// Express
import { blackholeExpress } from '@c9up/blackhole/express'
app.use(blackholeExpress({ csrf: true, secret: process.env.APP_KEY, rateLimit: { max: 100, windowSeconds: 60 } }))

// Fastify
import { blackholeFastify } from '@c9up/blackhole/fastify'
fastify.register(blackholeFastify({ csrf: true, secret: process.env.APP_KEY }))
```

Après son passage, le token CSRF est sur `request.csrfToken` et le nonce CSP sur `response.nonce`. Les en-têtes de protection qu'il a posés sont aussi dans `ctx.store` (`securityHeaders`) : une couche de vue qui a ses propres en-têtes, comme Photon, sait ainsi qu'un en-tête absent a été omis exprès.

Dans Ream, le travail est réparti sur deux tiers. Le middleware du tier server
tourne avant la résolution de la route : une requête vers une route qui
n'existe pas est donc elle aussi limitée, filtrée, et reçoit les en-têtes de
protection. Celui du tier router fait le contrôle CSRF, qui a besoin du corps
parsé, et saute ce que le premier a déjà fait — chaque requête n'est comptée
qu'une fois. Quand `rateLimit.keyFor` est défini, la limite est prise au tier
router : la clé peut lire ce qu'un middleware router pose, comme l'utilisateur
authentifié. Inscrit seul, le middleware du tier router fait tous les
contrôles, comme avant.

Hono n'a pas d'adresse client indépendante du runtime : passe `clientIp` (par
défaut, la socket de `@hono/node-server`). Le schéma et l'hôte comparés à
l'Origin sont ceux de l'URL de la requête ; derrière un proxy, passe `protocol`
et `host`.

## Architecture

```
                ┌─ phase requête ─────────────────────────────┐
Requête HTTP →  │ CORS → rate-limit → path-traversal →        │ → ton handler
                │ param-pollution → CSRF (tout en Rust)       │
                └─────────────────────────────────────────────┘
                ┌─ phase réponse ────────────────┐
ton handler →   │ headers de sécurité → XSS       │ → Réponse HTTP
                └─────────────────────────────────┘
```

Les vérifications du filtre de requête s'exécutent en Rust (les requêtes rejetées sont répondues avant ton handler). Les headers de sécurité + CORS sont calculés dans la fine façade TS (logique de headers, pas CPU-bound). La sanitization XSS s'applique au corps de la **réponse**.

## Configuration

Déclarée dans `config/blackhole.ts` (bootée par le provider) :

```ts
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  xss: true,                                  // sanitization de la réponse (défaut : true)
  csrf: true,                                 // ou un objet { exceptRoutes, methods, cookie }
  rateLimit: { max: 100, windowSeconds: 60 }, // omettre pour désactiver
  pathTraversal: true,                        // rejette `..` / `%2e%2e` (défaut : true)
  paramPollution: true,                       // rejette les clés de query dupliquées (défaut : true)
  xFrame: { enabled: true, action: 'DENY' }, // en-têtes de protection : une clé chacun, actifs par défaut
  csp: { enabled: true, directives: { scriptSrc: ["'self'", '@nonce'] } },
  cors: { origin: ['https://app.test'], credentials: true }, // omettre pour ne pas gérer le CORS
})
```

Par défaut, la sanitization XSS, la validation CSRF et chaque en-tête de
protection sont **activés** ; le rate limiting et le CORS sont désactivés tant
qu'ils ne sont pas configurés. La config qu'écrit `ream configure` a
`csrf: true`.

## En-têtes de protection

Chaque en-tête de protection a sa propre clé de premier niveau,
`{ enabled, ... }`, et est **actif avec un défaut durci quand la clé est
omise** — on en coupe un avec `{ enabled: false }`. Un objet donné sans
`enabled` est actif.

| Clé | En-tête | Défaut |
| --- | --- | --- |
| `xFrame` (`action` : `DENY` / `SAMEORIGIN` / `ALLOW-FROM`, `domain`) | `X-Frame-Options` | `SAMEORIGIN` |
| `hsts` (`maxAge`, `includeSubDomains`, `preload`) | `Strict-Transport-Security` | 180 jours, sous-domaines compris |
| `contentTypeSniffing` | `X-Content-Type-Options: nosniff` | actif |
| `csp` (`directives`, `useDefaults`, `policy`, `reportOnly`) | `Content-Security-Policy` | voir ci-dessous |
| `referrerPolicy` (`policy`) | `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `permissionsPolicy` (`policy`) | `Permissions-Policy` | caméra, micro, géolocalisation refusés |

```ts
export default defineConfig({
  hsts: { enabled: true, maxAge: '180 days', includeSubDomains: true }, // secondes, ou une durée
  csp: {
    enabled: true,
    directives: {
      scriptSrc: ["'self'", '@nonce', 'https://cdn.example'], // camelCase ou 'script-src'
      imgSrc: ["'self'", 'data:'],
    },
    reportOnly: false,
  },
  referrerPolicy: { enabled: true, policy: 'no-referrer' },
})
```

- Sans `directives` ni `policy`, la CSP est
  `default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' @nonce`.
- `directives` fusionne une base durcie sous les tiennes (`useDefaults: false`
  pour partir de rien ; `getDefaultDirectives()` la renvoie, pour étendre une
  directive plutôt que la remplacer). Le `scriptSrc` de cette base n'a pas de
  `@nonce` : nomme-le à nouveau quand tu poses `scriptSrc`.
- `policy` prend l'en-tête entier sous forme de chaîne, à la place de
  `directives`.
- Les deux sont validés à la création du filtre : un mot-clé sans guillemets
  (`self`, `none`, `nonce-…`, `sha256-…`…) ou une directive donnée deux fois
  lève une erreur ; avec `directives`, un `;` ou une `,` dans une source et une
  politique sans `default-src` aussi. Une directive à `null` est retirée ;
  `default-src` seulement via `dangerouslyDisableDefaultSrc`.
- `@nonce` est remplacé à chaque requête par `'nonce-…'` ; la valeur brute est
  `response.nonce`.
- `hsts.maxAge: 0` est valide : il dit au navigateur d'oublier la politique.

Les en-têtes sont posés avant le handler, puis ajoutés après seulement s'ils
manquent : une route qui pose son propre `X-Frame-Options` ou sa propre CSP la
garde. Une clé inconnue dans l'un de ces objets lève une erreur, tout comme une
clé `securityHeaders` — les en-têtes se règlent avec les clés ci-dessus.

## CORS

```ts
cors: {
  origin: ['https://app.test'],  // true reflète toute origine, '*' est le joker littéral,
                                 // une chaîne séparée par des virgules, ou (origin, ctx) => boolean | string | string[]
  methods: ['GET', 'POST'],
  headers: true,                 // false, une liste, une chaîne, ou (headers, ctx) => …
  exposeHeaders: ['X-Total'],    // `exposedHeaders` est accepté aussi
  credentials: true,
  maxAge: 90,
  enabled: true,                 // ou (ctx) => boolean
}
```

`origin: true` ou `'*'` combiné à `credentials: true` est refusé au démarrage —
ce serait donner les cookies de l'utilisateur à tous les sites. Une option
inconnue lève une erreur : une clé mal orthographiée ne peut pas faire tomber
son réglage sans rien dire. Un préflight qui demande une méthode ou un en-tête
hors de ceux autorisés ne reçoit aucun en-tête CORS.

## Sanitization XSS

Les corps de **réponse** sortants sont sanitizés avec [ammonia](https://crates.io/crates/ammonia) (le parser html5ever utilisé par Firefox/Servo), pas un échappement naïf d'entités :

- les fragments `text/html` sont parsés et reconstruits à partir d'une liste blanche : les nœuds dangereux sont retirés (`<script>`, handlers `on*`, URIs `javascript:`), et toute balise hors de la liste — éléments custom et web components compris — est déballée, son contenu gardé. Les entités existantes ne sont jamais double-encodées.
- tout autre type de contenu (`text/plain`, JSON, CSV…) est envoyé tel quel : avec `X-Content-Type-Options: nosniff` (un en-tête par défaut), le navigateur ne le lit jamais comme du markup, et l'échapper ne ferait que le corrompre.
- un **document complet** rendu côté serveur (commençant par `<!doctype>` ou `<html>`) est laissé intact — ammonia est fait pour des fragments, et traiter un document entier en stripperait les wrappers.
- les fragments perdent `id`, `is`, `slot`, `part` et `data-*` : `<a id="config">` masque `window.config` (DOM clobbering), `is` fabrique un élément personnalisé, les frameworks côté client lisent des liaisons dans `data-*`, et `slot`/`part` atteignent le shadow DOM. Ne les réactive que si rien ne les lit dans du markup non fiable : `xss: { allowAttributes: ['id', 'data-*'] }`.

Les query strings et corps de requête ne sont **pas** modifiés ; l'entrée utilisateur est neutralisée là où elle est rendue (la réponse), pas réécrite silencieusement à l'entrée.

## Protection CSRF

Validation **double-submit cookie signé** sans état (HMAC-SHA256). Le cookie `XSRF-TOKEN` porte `<random>.<HMAC(secret, random)>`. Une requête qui modifie l'état (`POST`, `PUT`, `PATCH`, `DELETE`) doit renvoyer ce token exact **et** le token doit porter une signature valide. Aucun store côté serveur, donc ça scale horizontalement — chaque instance a juste besoin du même `secret`.

La signature est ce qui en fait un double-submit *signé* (la forme recommandée par l'OWASP) : un double-submit naïf accepte n'importe quelle paire auto-cohérente, donc un attaquant capable de poser un cookie `XSRF-TOKEN` (un sous-domaine frère, un MITM sur un frère HTTP) pourrait en forger un. Un token signé ne peut pas être forgé sans le secret.

**Lié à la session.** Sous le middleware Ream, quand la requête a une session,
la signature couvre aussi un secret propre à la session (`csrf-secret`, gardé
dans la session) : un token émis pour une session est refusé pour toute autre,
et meurt avec sa session. Le middleware de session doit passer avant le
middleware router de blackhole. Les adaptateurs autonomes n'ont pas de
session : le token y est signé mais lié à rien, et c'est le contrôle de
l'origine ci-dessous qui arrête un token rejoué.

::: warning Nécessite un secret (breaking)
Quand le CSRF est activé, un `secret` est **obligatoire**. `createBlackhole({ csrf: true })` sans secret **throw** — il n'y a aucun fallback silencieux vers un token non signé. Passe `secret: env.get('APP_KEY')` dans `config/blackhole.ts` (le provider retombe aussi sur `process.env.APP_KEY`). `secret` prend une chaîne ou un `Secret`, comme celui que renvoie `Env.schema.secret()` : il est libéré une seule fois, à la construction du filtre, et la config le garde enveloppé. Le secret doit être une valeur stable à haute entropie (utilise ton `APP_KEY`) et **partagée entre les instances** — un token signé par une instance doit se vérifier sur une autre.
:::

### Fonctionnement

1. **Amorçage** — À chaque requête le middleware s'assure qu'un cookie `XSRF-TOKEN` existe (en générant `<random>.<HMAC>` avec du CSPRNG via `getrandom` s'il est absent) et publie le token dans `ctx.request.csrfToken` et dans `ctx.store` (`csrfToken`) pour le templating.
2. **Soumission** — Sur une requête non sûre, le client renvoie le même token, via **l'un** de :
   - le header `X-XSRF-TOKEN` (Axios / Angular `HttpClient` lisent le cookie automatiquement),
   - le header `X-CSRF-TOKEN` (clients SPA manuels),
   - le champ de formulaire `_csrf` (formulaires rendus côté serveur — voir `csrfField()` ci-dessous).
3. **Validation** — Le token soumis doit égaler le cookie (temps constant) **et** porter une signature HMAC valide sous le secret. Une non-correspondance, une valeur forgée/non signée, ou un token manquant est rejeté avec `403 E_BAD_CSRF_TOKEN`.

```
POST /orders                                       → 403 E_BAD_CSRF_TOKEN (pas de token)
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG
              X-XSRF-TOKEN: a1b2.SIG               → 200 OK
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG  X-XSRF-TOKEN: ZZZ      → 403 E_BAD_CSRF_TOKEN
POST /orders  cookie: XSRF-TOKEN=forged   X-XSRF-TOKEN: forged    → 403 E_BAD_CSRF_TOKEN (pas de signature valide)
```

### Contrôle de l'origine

Avant le token, une requête protégée qui porte un `Origin` (ou, à défaut, un
`Referer`) doit venir de la même origine — le même hôte **et le même schéma**
que la requête — ou de l'une des `csrf.trustedOrigins`. Une page servie en
`http://app.test` est une autre origine que `https://app.test` : c'est ce que
contrôle un MITM, elle est donc refusée avec
`403 E_BLACKHOLE_CSRF_ORIGIN_MISMATCH`, même avec un token valide. Le schéma est
celui que le framework hôte a résolu (`request.protocol()` de Ream,
`req.protocol` d'Express, `request.protocol` de Fastify, chacun selon son
réglage de proxy de confiance), tout comme l'hôte (`request.host()` de Ream,
`req.hostname` d'Express, `request.host` de Fastify ; l'option `host` de Hono)
— derrière un proxy qui réécrit `Host`, c'est l'hôte transmis qui est comparé,
pas le nom amont. Une origine de confiance écrite avec un schéma ne correspond
qu'à ce schéma ; sans schéma, à tous. Un `Origin` vide compte comme absent, et
le `Referer` est contrôlé. Une requête sans aucun des deux en-têtes — un client
hors navigateur — passe au contrôle du token. Les deux contrôles dépendent de
l'interrupteur `csrf`.

### Configuration

```ts
// config/blackhole.ts
import env from '#start/env'
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  secret: env.get('APP_KEY'),                   // clé HMAC (chaîne ou Secret) — OBLIGATOIRE quand csrf est actif
  csrf: {
    exceptRoutes: ['/webhooks/:provider', '/api/hooks/*'], // motifs de route, ou chemins
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // verbes protégés (défaut affiché)
    cookie: { sameSite: 'lax' },                 // attributs du cookie XSRF-TOKEN
  },
})
```

`csrf: true` / `csrf: false` est un raccourci pour activer/désactiver avec les défauts. `GET`, `HEAD` et `OPTIONS` ne sont jamais protégés.

**Attributs du cookie.** Le cookie `XSRF-TOKEN` est désormais `Secure` par défaut en production (`NODE_ENV === 'production'`) — pas besoin de le poser à la main. Il n'est volontairement **pas** `httpOnly` : le flux double-submit a besoin que le JS du navigateur lise le cookie et le renvoie en `X-XSRF-TOKEN`. Mettre `cookie: { httpOnly: true }` rend le cookie illisible et tout POST non-formulaire fera `403` — blackhole log un avertissement si tu le fais. Ne l'active que pour une app entièrement rendue côté serveur qui soumet exclusivement via le champ `_csrf`.

> Les routes Bearer/JWT sont immunisées contre le CSRF (le navigateur ne peut pas attacher un header `Authorization` cross-site) : liste tes préfixes d'API token-authed dans `exceptRoutes` et réserve le CSRF aux routes cookie/session.

### Helpers de templating

Les formulaires rendus et les SPA lisent le token via les helpers `@c9up/inker` :

- `{{ csrfField() }}` → `<input type="hidden" name="_csrf" value="…">`
- `{{ csrfMeta() }}` → `<meta name="csrf-token" content="…">` (pour les clients AJAX)

Dans un contrôleur, le token brut est `ctx.request.csrfToken`.

### Signal de fermeture stricte — `request.csrfProtected`

Le middleware publie aussi `ctx.request.csrfProtected : boolean` — `true` **uniquement** lorsque le CSRF était activé, la méthode gardée, la route non exceptée, **et** le token validé. C'est la réponse fiable à « cette requête a-t-elle été vérifiée CSRF ? ». Contrairement à `csrfToken` (semé sur chaque requête qui passe, même un `GET`, une route `csrf: false` ou un chemin excepté), un consommateur qui doit **fermer strictement** — refuser de muter tant que le CSRF n'a pas été réellement appliqué — lit ce flag, jamais la simple présence d'un token :

```ts
if (ctx.request.csrfProtected !== true) {
  // blackhole non câblé, csrf: false, ou route exceptée → refus
  return ctx.response.status(403).send('CSRF requis')
}
```

`@c9up/station` utilise exactement cela pour fermer strictement chaque route d'écriture admin.

## Rate Limiting

Suit les requêtes par client dans une fenêtre de temps glissante. Le compteur
en processus garde deux compteurs par clé — la fenêtre courante et la
précédente, pondérée par la part qui chevauche encore — si bien que sa mémoire
ne grandit pas avec `max`. La clé par défaut est l'IP du client ; un client
IPv6 est compté par son /64, un même hôte détenant le /64 entier. `keyFor(ctx)`
choisit une autre clé.

```ts
rateLimit: { max: 100, windowSeconds: 60 } // 100 requêtes / 60s
```

Quand la limite est dépassée, la requête est rejetée avec :

```json
{ "error": { "code": "E_BLACKHOLE_RATE_LIMITED", "message": "Too many requests" } }
```

Statut HTTP : `429 Too Many Requests`

Le rate limiter :
- Bucket par IP client résolue — une requête **sans** IP résolvable est rejetée (`400 E_BLACKHOLE_MISSING_IP`) plutôt que de partager un bucket global (ce qui laisserait un client DoS tout le monde). La résolution d'IP (proxies de confiance) est le rôle du framework hôte.
- Exige que `max` et `windowSeconds` soient des entiers strictement positifs : `createBlackhole` lève une erreur sinon, plutôt que d'appliquer une limite ou une fenêtre de 0 qui laisserait tout passer
- Admet une requête tant que le compte glissant est sous `max` (pas de rafale du double de la limite à la frontière d'une fenêtre)
- Purge périodiquement les entrées obsolètes, et plafonne le nombre de clés gardées

## Limites par route

Une limite définie une fois, par nom, attachée aux routes qu'elle concerne :

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

La clé est `<nom>_<usingKey>`, ou `<nom>_ip_<IP client>` (IPv6 par /64). Au-delà
de la limite, le middleware lève `ThrottleException` (`E_TOO_MANY_REQUESTS`,
`429`), rendue avec `X-RateLimit-*` et `Retry-After` en texte, JSON ou JSON:API
selon `Accept`, son message traduit sous `errors.E_TOO_MANY_REQUESTS` quand le
contexte a un `i18n`. `limitExceeded((error) => error.setMessage(…))`
l'ajuste avant ; un builder qui renvoie `limiter.noLimit()` laisse passer la
requête sans la compter. Une réponse qui passe porte `X-RateLimit-Limit` et
`X-RateLimit-Remaining`.

À la main :

```ts
const login = limiter.use({ requests: 5, duration: '1 minute', blockDuration: '20 mins' })

// Ne compter que les échecs : un mauvais mot de passe coûte un essai, un bon les efface.
const [error, user] = await login.penalize(`login_${email}`, () => verify(email, password))

await login.attempt(key, () => sendResetMail()) // ne s'exécute que tant qu'il reste du budget
await login.consume(key)                        // lève une erreur une fois au-delà
```

`Limiter` a aussi `increment`, `decrement`, `get`, `set`, `block`, `delete`,
`remaining`, `availableIn`, `isBlocked` et `clear`. Le comptage est une fenêtre
fixe par clé, ouverte par sa première requête.

Les stores se déclarent sous `limiter` dans `config/blackhole.ts` (par défaut :
un store en mémoire) :

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

Le `clear()` du store Redis supprime ses propres clés (par préfixe), pas la base.

## Résultats du filtre

La phase requête se résout en l'un de :

| Résultat | Signification |
|----------|---------------|
| `Allow` | La requête a passé toutes les vérifications — ton handler s'exécute |
| `Reject` | Requête bloquée — `400` (`E_BLACKHOLE_PATH_TRAVERSAL` / `E_BLACKHOLE_PARAMETER_POLLUTION` / `E_BLACKHOLE_MISSING_IP`), `403` (`E_BAD_CSRF_TOKEN` / `E_BLACKHOLE_CSRF_ORIGIN_MISMATCH`) ou `429` (`E_BLACKHOLE_RATE_LIMITED`) |

Un rejet porte les mêmes en-têtes de protection (CSP, HSTS, `nosniff`…) qu'une
page, tout comme un préflight CORS. Ils sont posés avant le handler, si bien
qu'une page d'erreur construite après une exception les porte aussi.

## Étapes suivantes

- [Warden (Auth)](/fr/modules/warden) — Authentification au niveau applicatif
- [Middleware](/fr/guide/middleware) — Pipeline middleware Node.js

## Options CSRF

```ts
csrf: {
  enabled: true,
  enableXsrfCookie: true,                                    // défaut
  exceptRoutes: (ctx) => ctx.request.url().startsWith('/webhooks/'), // ou une liste
  cookieOptions: { sameSite: 'lax' },                        // `cookie` marche aussi
}
```

- **`enableXsrfCookie`** commande le cookie lisible `XSRF-TOKEN`. Une app
  entièrement rendue serveur envoie le jeton dans le champ `_csrf` et n'en a pas
  l'usage — et un cookie qu'on ne pose pas est une chose de moins à fuir. Le
  jeton reste disponible pour le champ de formulaire.
- **`exceptRoutes`** accepte une liste ou un prédicat. Une entrée correspond au
  motif de la route trouvée (`'/webhooks/:provider'`) sous Ream et Fastify, et
  au chemin de la requête — exactement, ou par préfixe avec un `*` final — sur
  tous les adaptateurs (Express et Hono n'ont pas encore de route à ce stade).
  Le prédicat reçoit le contexte de la requête : le contexte HTTP lui-même sous
  Ream ; sur les adaptateurs autonomes,
  `{ request: { method(), url(), header() }, route }`.
- **`cookieOptions`** et `cookie` sont deux noms pour la même option.

### Rejet

Un token refusé répond `403 E_BAD_CSRF_TOKEN`. Sous Ream, un formulaire de
navigateur (`Accept: text/html`) est redirigé en arrière avec les champs du
formulaire (sauf `_csrf`, `_method` et les mots de passe) et le message en
flash ; une visite Inertia (`X-Inertia`) reçoit la même redirection sans
re-flasher les champs ; un client JSON reçoit le corps JSON. Quand le contexte a
un `i18n`, le message est traduit sous `errors.E_BAD_CSRF_TOKEN`.
