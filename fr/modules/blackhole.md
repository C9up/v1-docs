# Blackhole — Sécurité

`@c9up/blackhole` est un filtre de sécurité Rust-natif pour tout framework Node.js. Les vérifications s'exécutent en Rust via NAPI — une requête rejetée reçoit sa réponse avant que ton handler ne s'exécute. Utilisable avec Ream (provider + middleware) ou standalone avec Express / Fastify.

## Installation

```bash
pnpm add @c9up/blackhole
ream configure @c9up/blackhole
```

Le package expose ces points d'entrée :
- `@c9up/blackhole/provider` — Provider IoC Ream (lit `config/blackhole.ts`)
- `@c9up/blackhole/middleware` — Middleware Ream
- `@c9up/blackhole/express` — `blackholeExpress(options)` pour Express
- `@c9up/blackhole/fastify` — `blackholeFastify(options)` plugin Fastify
- `@c9up/blackhole` — API bas-niveau `createBlackhole(options)` pour wirer n'importe quel framework toi-même

Les trois adaptateurs partagent un seul pipeline (`./core`) : aucune logique de sécurité dupliquée entre eux.

### Utilisation

```ts
// Ream — config/blackhole.ts + start/kernel.ts
router.use([() => import('@c9up/blackhole/middleware')])
// forme directe équivalente : import { blackholeMiddleware } from '@c9up/blackhole/middleware'
//                             router.use([blackholeMiddleware])

// Express
import { blackholeExpress } from '@c9up/blackhole/express'
app.use(blackholeExpress({ csrf: true, secret: process.env.APP_KEY, rateLimit: { max: 100, windowSeconds: 60 } }))

// Fastify
import { blackholeFastify } from '@c9up/blackhole/fastify'
fastify.register(blackholeFastify({ csrf: true, secret: process.env.APP_KEY }))
```

Après son passage, le token CSRF est sur `request.csrfToken` et le nonce CSP sur `response.nonce`.

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
  securityHeaders: { csp: "default-src 'self'" }, // façon Helmet ; `false` pour désactiver
  cors: { origin: ['https://app.test'], credentials: true }, // omettre pour ne pas gérer le CORS
})
```

Par défaut, la sanitization XSS et la validation CSRF sont **activées** ; le rate limiting et le CORS sont désactivés tant qu'ils ne sont pas configurés.

## Sanitization XSS

Les corps de **réponse** sortants sont sanitizés avec [ammonia](https://crates.io/crates/ammonia) (le parser html5ever utilisé par Firefox/Servo), pas un échappement naïf d'entités :

- les réponses `text/html` sont parsées et les nœuds dangereux neutralisés (`<script>`, handlers `on*`, URIs `javascript:`) tout en préservant les tags custom / web components, sans jamais double-encoder les entités existantes.
- les réponses `text/plain` sont échappées (entités).
- un **document complet** rendu côté serveur (commençant par `<!doctype>` ou `<html>`) est laissé intact — ammonia est fait pour des fragments, et traiter un document entier en stripperait les wrappers.

Les query strings et corps de requête ne sont **pas** modifiés ; l'entrée utilisateur est neutralisée là où elle est rendue (la réponse), pas réécrite silencieusement à l'entrée.

## Protection CSRF

Validation **double-submit cookie signé** sans état (HMAC-SHA256), avec une API compatible AdonisJS. Le cookie `XSRF-TOKEN` porte `<random>.<HMAC(secret, random)>`. Une requête qui modifie l'état (`POST`, `PUT`, `PATCH`, `DELETE`) doit renvoyer ce token exact **et** le token doit porter une signature valide. Aucun store côté serveur, donc ça scale horizontalement — chaque instance a juste besoin du même `secret`.

La signature est ce qui en fait un double-submit *signé* (la forme recommandée par l'OWASP) : un double-submit naïf accepte n'importe quelle paire auto-cohérente, donc un attaquant capable de poser un cookie `XSRF-TOKEN` (un sous-domaine frère, un MITM sur un frère HTTP) pourrait en forger un. Un token signé ne peut pas être forgé sans le secret.

::: warning Nécessite un secret (breaking)
Quand le CSRF est activé, un `secret` est **obligatoire**. `createBlackhole({ csrf: true })` sans secret **throw** — il n'y a aucun fallback silencieux vers un token non signé. Passe `secret: env.get('APP_KEY')` dans `config/blackhole.ts` (le provider retombe aussi sur `process.env.APP_KEY`). Le secret doit être une valeur stable à haute entropie (utilise ton `APP_KEY`) et **partagée entre les instances** — un token signé par une instance doit se vérifier sur une autre.
:::

### Fonctionnement

1. **Amorçage** — À chaque requête le middleware s'assure qu'un cookie `XSRF-TOKEN` existe (en générant `<random>.<HMAC>` avec du CSPRNG via `getrandom` s'il est absent) et publie le token dans `ctx.request.csrfToken` (idiome Adonis) et dans `ctx.store` (`csrfToken`) pour le templating.
2. **Soumission** — Sur une requête non sûre, le client renvoie le même token, via **l'un** de :
   - le header `X-XSRF-TOKEN` (Axios / Angular `HttpClient` lisent le cookie automatiquement),
   - le header `X-CSRF-TOKEN` (clients SPA manuels),
   - le champ de formulaire `_csrf` (formulaires rendus côté serveur — voir `csrfField()` ci-dessous).
3. **Validation** — Le token soumis doit égaler le cookie (temps constant) **et** porter une signature HMAC valide sous le secret. Une non-correspondance, une valeur forgée/non signée, ou un token manquant est rejeté avec `403 CSRF_FAILED`.

```
POST /orders                                       → 403 CSRF_FAILED (pas de token)
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG
              X-XSRF-TOKEN: a1b2.SIG               → 200 OK
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG  X-XSRF-TOKEN: ZZZ      → 403 CSRF_FAILED
POST /orders  cookie: XSRF-TOKEN=forged   X-XSRF-TOKEN: forged    → 403 CSRF_FAILED (pas de signature valide)
```

### Configuration

```ts
// config/blackhole.ts
import env from '#start/env'
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  secret: env.get('APP_KEY'),                   // clé HMAC — OBLIGATOIRE quand csrf est actif
  csrf: {
    exceptRoutes: ['/api/webhooks/*'],          // ignorer le CSRF (exact ou préfixe trailing-*)
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

## Rate Limiting

Suit les requêtes par IP client dans une fenêtre de temps glissante.

```ts
rateLimit: { max: 100, windowSeconds: 60 } // 100 requêtes / 60s
```

Quand la limite est dépassée, la requête est rejetée avec :

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }
```

Statut HTTP : `429 Too Many Requests`

Le rate limiter :
- Bucket par IP client résolue — une requête **sans** IP résolvable est rejetée (`400 MISSING_IP`) plutôt que de partager un bucket global (ce qui laisserait un client DoS tout le monde). La résolution d'IP (proxies de confiance) est le rôle du framework hôte.
- Réinitialise le compteur quand la fenêtre de temps expire
- Purge périodiquement les entrées obsolètes pour empêcher la croissance mémoire

## Résultats du filtre

La phase requête se résout en l'un de :

| Résultat | Signification |
|----------|---------------|
| `Allow` | La requête a passé toutes les vérifications — ton handler s'exécute |
| `Reject` | Requête bloquée — `400` (path-traversal / param-pollution / IP manquante), `403` (CSRF) ou `429` (rate limit) |

## Étapes suivantes

- [Warden (Auth)](/fr/modules/warden) — Authentification au niveau applicatif
- [Middleware](/fr/guide/middleware) — Pipeline middleware Node.js
