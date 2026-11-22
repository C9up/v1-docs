# Sécuriser une app rendue côté serveur

Ce guide couvre blackhole et les en-têtes de sécurité :

- Installation
- Architecture
- Configuration
- En-têtes de protection
- Résultats du filtre

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
router.use([
  () => import('@c9up/ream/bodyparser_middleware'),
  () => import('@c9up/ream/session_middleware'),
  // Après la session : les tokens CSRF lui sont liés.
  () => import('@c9up/blackhole/middleware'),
])

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

Le middleware du tier router passe **après** le body parser et le middleware
de session : le contrôle CSRF lit `_csrf` dans le corps parsé, et le token est
lié à la session. C'est pourquoi `ream configure` l'ajoute à la fin du tier
router. Quand l'application a une config de session (`config/session.ts`) et
que blackhole passe en premier, chaque requête est refusée avec
`E_BLACKHOLE_SESSION_NOT_READY` plutôt que de recevoir un token lié à rien.

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
                ┌─ phase réponse ───────────────────────────┐
ton handler →   │ headers de sécurité → XSS (xss: true)     │ → Réponse HTTP
                └───────────────────────────────────────────┘
```

Les vérifications du filtre de requête s'exécutent en Rust (les requêtes rejetées sont répondues avant ton handler). Les headers de sécurité + CORS sont calculés dans la fine façade TS (logique de headers, pas CPU-bound). La sanitization XSS, quand `xss` est activé, s'applique au corps de la **réponse**.

## Configuration

Déclarée dans `config/blackhole.ts` (bootée par le provider) :

```ts
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  xss: false,                                 // sanitize chaque fragment text/html envoyé (défaut : false)
  csrf: true,                                 // ou un objet { exceptRoutes, methods, cookie }
  rateLimit: { max: 100, windowSeconds: 60 }, // omettre pour désactiver
  pathTraversal: true,                        // rejette `..` / `%2e%2e` (défaut : true)
  paramPollution: true,                       // rejette les clés de query dupliquées (défaut : true)
  xFrame: { enabled: true, action: 'DENY' }, // en-têtes de protection : une clé chacun, actifs par défaut
  csp: { enabled: true, directives: { scriptSrc: ["'self'", '@nonce'] } },
  cors: { origin: ['https://app.test'], credentials: true }, // omettre pour ne pas gérer le CORS
})
```

Par défaut, la validation CSRF et chaque en-tête de protection sont
**activés** ; la passe XSS automatique, le rate limiting et le CORS sont
désactivés tant qu'ils ne sont pas configurés. La config qu'écrit `ream configure` a
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
- Tout autre `@mot-clé` est résolu à chaque requête par le résolveur enregistré
  pour lui : c'est ainsi qu'un paquet apporte une source (serveur d'assets, CDN,
  serveur de dev). Un mot-clé que rien ne résout lève une erreur à la création
  du filtre (`E_BLACKHOLE_UNKNOWN_CSP_KEYWORD`) au lieu d'arriver au navigateur
  comme un hôte nommé `@mot-clé` ; enregistre-le avant la construction du filtre
  (dans le `register()` d'un provider), les résolveurs étant capturés à ce
  moment-là :

  ```ts
  import { cspKeywords } from '@c9up/blackhole'

  // (request, response, nonce) — les objets du framework
  cspKeywords.register('@assetsUrl', () => env.get('ASSETS_URL'))
  // csp: { directives: { scriptSrc: ["'self'", '@nonce', '@assetsUrl'] } }
  ```

  Une réponse vide retire le mot-clé ; une réponse contenant `;`, `,` ou un saut
  de ligne lève une erreur (`E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE`) plutôt que
  de clore la directive.
- `hsts.maxAge: 0` est valide : il dit au navigateur d'oublier la politique.

Les en-têtes sont posés avant le handler, puis ajoutés après seulement s'ils
manquent : une route qui pose son propre `X-Frame-Options` ou sa propre CSP la
garde. Une clé inconnue dans l'un de ces objets lève une erreur, tout comme une
clé `securityHeaders` — les en-têtes se règlent avec les clés ci-dessus.

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
- [Warden (Auth)](/fr/guides/auth/introduction) — Authentification au niveau applicatif
- [Middleware](/fr/guides/basics/middleware) — Pipeline middleware Node.js
