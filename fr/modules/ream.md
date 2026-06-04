# Ream — Core Framework

Ream (`@c9up/ream`) est le noyau du framework: bootstrap applicatif, IoC, providers, serveur HTTP, pipeline middleware, erreurs, lifecycle et orchestration des modules (`atlas`, `rune`, `warden`, `spectrum`, etc.).

> Statut: en evolution active. L'objectif est une DX proche Adonis/Laravel, avec une architecture modulaire agnostique.

## Ce que le core fait vraiment

1. Initialise et configure l'application via `Ignitor`.
2. Charge la configuration et les providers.
3. Monte le router, le kernel HTTP et le serveur.
4. Exécute le lifecycle (`register -> boot -> start -> ready -> shutdown`).
5. Fournit les primitives de framework (container, middleware, exceptions, services).

## Bootstrap minimal

```ts
import { Ignitor } from '@c9up/ream'

await new Ignitor({ port: 3333 })
  .httpServer()
  .routes((router) => {
    router.get('/health', (ctx) => {
      ctx.response.status(200).json({ ok: true })
    })
  })
  .start()
```

## Modes d'execution

- `httpServer()` pour API/web.
- `console()` pour commandes CLI.
- `testMode()` pour scenarios de test.

```ts
const ignitor = new Ignitor({ port: 3333 }).httpServer()
await ignitor.start()
```

## Lifecycle (important)

Ordre d'execution:

1. `register` - bind container, config, providers.
2. `boot` - initialisation dependances externes.
3. `start` - demarrage server / runtime.
4. `ready` - application operationnelle.
5. `shutdown` - fermeture propre.

Regle pratique:

- `register`: pas d'IO bloquant.
- `boot`: connexions DB/bus/cache.
- `shutdown`: close ressources, timeouts, workers.

## Providers (pattern recommande)

```ts
import { Provider } from '@c9up/ream'
import { CacheManager, MemoryDriver } from '@c9up/echo'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton('cache', () => {
      return new CacheManager(new MemoryDriver(), { prefix: 'app', ttl: 300 })
    })
  }
}
```

## Container IoC

Le container sert a:

- enregistrer des singletons/services,
- resoudre les dependances des classes,
- remplacer des implementations (tests/env).

Bonnes pratiques:

- binder par token stable (`'cache'`, `'db'`, `'bus'`),
- eviter les side effects dans les factories,
- centraliser les bindings dans les providers.

## Routing et middleware

```ts
await new Ignitor()
  .httpServer()
  .use(async (ctx, next) => {
    const start = Date.now()
    await next()
    ctx.response.header('x-duration-ms', String(Date.now() - start))
  })
  .routes((router) => {
    router.get('/users/:id', async (ctx) => {
      ctx.response.json({ id: ctx.params.id })
    })
  })
  .start()
```

Pipeline recommande:

1. middleware techniques (request-id, timing, body parser),
2. middleware securite (cors, headers, rate limit, shield),
3. middleware auth/acl,
4. logique metier route/controller.

## Gestion des erreurs

Utiliser les exceptions framework (`E_UNAUTHORIZED`, `E_FORBIDDEN`, etc.) et un handler central.

```ts
import { E_UNAUTHORIZED } from '@c9up/ream'

if (!token) {
  throw new E_UNAUTHORIZED('Bearer token required')
}
```

Regles:

- ne pas retourner d'erreur brute interne au client,
- logger le contexte utile sans fuite de secrets,
- mapper les erreurs metier vers des codes HTTP coherents.

## Services exposes par le core

Le core exporte notamment:

- `Ignitor`, `Application`, `Provider`,
- `Router`, `Server`, `HttpContext`, `Request`, `Response`,
- `MiddlewareRegistry`,
- `ReamError` et exceptions HTTP,
- utilitaires lifecycle (`HealthCheck`, graceful shutdown, hot reload).

## URLs signées

`SignedUrl` (depuis `@c9up/ream/security`) émet des URLs signées en
HMAC-SHA256 avec une expiration optionnelle. Le handler récepteur
appelle `verify()` pour redériver la signature et rejeter les liens
tampérés ou expirés.

```ts
import { SignedUrl } from '@c9up/ream/security'

const su = new SignedUrl({ secret: process.env.SIGNING_SECRET! })

// Lien d'1h vers /downloads/<id>
const url = su.make('/downloads/abc-123', { expiresIn: '1h' })

// Côté handler de vérification
if (!su.verify(req.url)) {
  return res.status(403).json({ error: 'E_BAD_SIGNATURE' })
}
```

`expiresIn` accepte un nombre de secondes ou une chaîne suffixée
(`s`/`m`/`h`/`d`). `expiresIn: 0` stampe l'epoch courant comme
expiration — l'URL est valide pour la seconde courante seulement, et
devient invalide dès que l'horloge avance. L'ancienne garde truthy
traitait silencieusement `0` comme « pas d'expiration », ce qui était
un bug de sécurité ; le comportement actuel respecte l'intention de
l'appelant.

`purpose` lie l'URL à un flow nommé :

```ts
const reset = su.make('/auth/reset', { expiresIn: '30m', purpose: 'pwd-reset' })
if (!su.verify(reset, 'pwd-reset')) return /* 403 */
```

Un token émis pour un purpose ne peut pas être rejoué contre un autre.

## Integration modules

Le core est l'orchestrateur. Les modules restent utilisables seuls, mais Ream simplifie leur composition:

- `atlas` pour ORM,
- le bus d'événements (core),
- `warden` pour auth,
- `rune` pour validation,
- `spectrum` pour logging,
- `echo` pour cache,
- `bay` pour queue/jobs.

## Checklist production

1. `NODE_ENV=production`.
2. Security middleware actif (shield/rate limit/cors configure).
3. Exception handling centralise et non verbeux.
4. Graceful shutdown verifie (SIGTERM/SIGINT).
5. Timeouts explicites (DB, HTTP externes, jobs).
6. Correlation ID present dans logs et erreurs.
7. Endpoints health/readiness utilises en orchestration.

## Limites actuelles connues

- surface API encore en evolution,
- certaines zones de doc restent moins profondes que la cible,
- convergence continue vers des conventions plus strictes type Adonis.

## Liens utiles

- Guide lifecycle: `/fr/guide/lifecycle`
- Guide providers: `/fr/guide/providers`
- Guide routing: `/fr/guide/routing`
- Guide middleware: `/fr/guide/middleware`
- Corrections package ream: `/fr/corrections/ream`
