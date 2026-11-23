# Application

Ce guide couvre ce que fait le cœur et comment une application démarre :

- Ce que le cœur fait vraiment
- Bootstrap minimal
- Modes d'exécution
- Routing et middleware
- Services exposés par le core
- Intégration des modules
- Checklist production
- Limites actuelles connues
- Liens utiles
- Parcours recommande
- Positionnement
- Mode de l'application
- Bootstrap minimal
- Modes
- Points clé

Ream (`@c9up/ream`) est le noyau du framework: bootstrap applicatif, IoC, providers, serveur HTTP, pipeline middleware, erreurs, lifecycle et orchestration des modules (`atlas`, `rune`, `warden`, `spectrum`, etc.).

> Statut : en évolution active. L'objectif est une DX « batteries incluses », guidée par les conventions, avec une architecture modulaire agnostique.

## Ce que le cœur fait vraiment

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

## Modes d'exécution

- `httpServer()` pour API/web.
- `console()` pour commandes CLI.
- `testMode()` pour scénarios de test.

```ts
const ignitor = new Ignitor({ port: 3333 }).httpServer()
await ignitor.start()
```

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

Pipeline recommandé :

1. middleware techniques (request-id, timing, body parser),
2. middleware sécurité (cors, headers, rate limit, shield),
3. middleware auth/acl,
4. logique métier route/controller.

## Services exposés par le core

Le core exporte notamment :

- `Ignitor`, `Application`, `Provider`,
- `Router`, `Server`, `HttpContext`, `Request`, `Response`,
- `MiddlewareRegistry`,
- `errors`, une classe `Exception` par code, et le gestionnaire d'exceptions HTTP,
- utilitaires lifecycle (`HealthCheck`, graceful shutdown, hot reload).

## Intégration des modules

Le core est l'orchestrateur. Les modules restent utilisables seuls, mais Ream simplifie leur composition :

- `atlas` pour ORM,
- le bus d'événements (core),
- `warden` pour auth,
- `rune` pour validation,
- `spectrum` pour logging,
- `echo` pour cache,
- `bay` pour queue/jobs.

## Checklist production

1. `NODE_ENV=production`.
2. Security middleware actif (shield/rate limit/cors configuré).
3. Exception handling centralisé et non verbeux.
4. Graceful shutdown vérifié (SIGTERM/SIGINT).
5. Timeouts explicites (DB, HTTP externes, jobs).
6. Correlation ID présent dans logs et erreurs.
7. Endpoints health/readiness utilisés en orchestration.

## Limites actuelles connues

- surface API encore en évolution,
- certaines zones de doc restent moins profondes que la cible,
- les conventions continuent de se resserrer.

## Liens utiles

- Guide lifecycle : `/fr/guides/concepts/lifecycle`
- Guide providers : `/fr/guides/concepts/providers`
- Guide routing : `/fr/guides/basics/routing`
- Guide middleware : `/fr/guides/basics/middleware`

Cette section documente le noyau `@c9up/ream` en mode référence pratique.

## Parcours recommande

1. [Ignitor et bootstrap](/fr/guides/concepts/application)
2. [Lifecycle applicatif](/fr/guides/concepts/lifecycle)
3. [Container IoC](/fr/guides/concepts/dependency-injection)
4. [HTTP kernel et routing](/fr/guides/basics/middleware)
5. [Erreurs et exception handling](/fr/guides/basics/exception-handling)
6. [Sécurité et opérations](/fr/guides/security/production)

## Positionnement

- Ream orchestre les modules agnostiques.
- Le core fixe les conventions framework (providers, lifecycle, middleware).
- La surface reste en évolution, vers une DX « batteries incluses », guidée par les conventions.

## Mode de l'application

```ts
async start() {
  if (this.app.getMode() !== 'run') return
  await startQueueWorkers()
}
```

`getMode()` vaut `run` ou `warmup`. Une commande de génération ou d'inspection
pose `warmup`, ce qui permet à un provider de sauter ses **effets de bord** —
démarrer des workers, ouvrir une connexion — tout en enregistrant tous ses
bindings. Il ne doit jamais changer *quels* bindings existent : l'app inspectée
doit être identique à l'app qui tourne, sinon les types générés décrivent autre
chose. `setMode()` refuse après le boot.

`Ignitor` est le point d'entrée du core: il configure et démarre l'application.

## Bootstrap minimal

```ts
import { Ignitor } from '@c9up/ream'

await new Ignitor({ port: 3333 })
  .httpServer()
  .routes((router) => {
    router.get('/health', (ctx) => ctx.response.json({ ok: true }))
  })
  .start()
```

## Modes

- `httpServer()` pour API/web
- `console()` pour commandes
- `testMode()` pour scénarios tests

## Points clé

- `useRcFile()` pour charger la config framework
- `provider()` pour ajouter des providers inline
- `use()` / `named()` pour middleware global/nomme
- `onError()` pour brancher un handling transversal
