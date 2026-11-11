# Middleware

Un middleware intercepte les requêtes HTTP avant qu'elles n'atteignent le handler de la route. Ream suit le pattern oignon : le code placé avant `await next()` s'exécute à l'aller, celui placé après au retour. Tous les middlewares s'enregistrent dans `start/kernel.ts`.

## Classes de middleware

La forme standard est une classe dotée d'une méthode `handle`. Elle correspond à l'interface `MiddlewareClass` qu'attendent `server.use()` et `router.use()` :

```typescript
// app/middleware/log_request_middleware.ts
import type { HttpContext } from '@c9up/ream'

export default class LogRequestMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`${ctx.request.method()} ${ctx.request.path()} ${ctx.response.getStatus()} — ${ms}ms`)
  }
}
```

## Le fichier kernel

Enregistrez tous les middlewares dans `start/kernel.ts`. Ce fichier est un preload — l'Ignitor l'importe avant de traiter la moindre requête :

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'
import server from '@c9up/ream/services/server'

// Gestionnaire d'erreurs personnalisé
server.errorHandler(() => import('#exceptions/handler.js'))

// Middlewares serveur — s'exécutent sur TOUTES les requêtes, même les 404
server.use([
  () => import('#middleware/log_request_middleware.js'),
  () => import('#middleware/cors_middleware.js'),
])

// Middlewares routeur — s'exécutent seulement sur les routes trouvées
router.use([
  // Analyse les corps de requête — sans lui body(), input() et all() lisent `{}`
  () => import('@c9up/ream/bodyparser_middleware'),
  () => import('#middleware/auth_middleware.js'),
])

// Middlewares nommés — à assigner explicitement aux routes
export const middleware = router.named({
  admin: () => import('#middleware/admin_middleware.js'),
  throttle: () => import('#middleware/throttle_middleware.js'),
})
```

Déclarez le kernel comme preload dans `reamrc.ts` :

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  preloads: [
    () => import('./start/kernel.js'),
  ],
  modules: { path: './app/modules' },
})
```

## Trois niveaux de middleware

### Middlewares serveur

Enregistrés via `server.use()`. Ils s'exécutent sur chaque requête HTTP — y compris celles qui ne correspondent à aucune route. C'est l'endroit pour la journalisation, les en-têtes CORS et le traçage des requêtes.

```typescript
server.use([
  () => import('#middleware/log_request_middleware.js'),
])
```

### Middlewares routeur

Enregistrés via `router.use()`. Ils s'exécutent seulement quand une route correspond, après les middlewares serveur et avant tout middleware propre à la route :

```typescript
router.use([
  // Analyse les corps de requête — sans lui body(), input() et all() lisent `{}`
  () => import('@c9up/ream/bodyparser_middleware'),
  () => import('#middleware/auth_middleware.js'),
])
```

### Middlewares nommés

Enregistrés via `router.named()`. Ils doivent être assignés explicitement à des routes ou à des groupes. La valeur renvoyée est une table typée — exportez-la pour que les fichiers de routes puissent en citer les noms :

```typescript
export const middleware = router.named({
  admin: () => import('#middleware/admin_middleware.js'),
  throttle: () => import('#middleware/throttle_middleware.js'),
})
```

Sur une route :

```typescript
router.get('/admin/dashboard', [AdminController, 'index']).middleware('admin')
router.post('/orders', [OrdersController, 'store']).middleware('throttle')
```

Sur un groupe :

```typescript
router.group(() => {
  router.get('/users', [UsersController, 'index'])
  router.post('/users', [UsersController, 'store'])
}).prefix('/admin').middleware('admin')
```

## Middleware en ligne

Attachez une fonction middleware ponctuelle directement à une route avec `.use()`. Pratique pour une logique propre à une route qui ne mérite pas une classe :

```typescript
router.get('/report', [ReportController, 'index']).use(async (ctx, next) => {
  ctx.store.set('report-format', ctx.request.input('format', 'json'))
  await next()
})
```

Plusieurs middlewares en ligne s'exécutent dans l'ordre où ils sont chaînés :

```typescript
router
  .post('/upload', [UploadController, 'store'])
  .use(validateContentType)
  .use(checkQuota)
```

## Ordre d'exécution

::: warning Les appels gRPC contournent le pipeline
Un appel gRPC servi par [Neutrino](/fr/modules/neutrino) ne traverse jamais les middlewares serveur, routeur ou nommés. Protégez-le avec les intercepteurs de Neutrino.
:::

Pour une route trouvée, le pipeline s'exécute dans cet ordre fixe :

```
1. Middlewares serveur      (server.use — sur toutes les requêtes)
2. Middlewares routeur      (router.use — sur les routes trouvées)
3. Middlewares nommés       (route.middleware('nom') ou group.middleware('nom'))
4. Middlewares en ligne     (route.use(fn))
5. Application des guards   (route.guard / .role / .permission)
6. Handler de la route
```

Toutes les couches s'emboîtent selon le pattern oignon, donc le code placé après `await next()` s'exécute dans l'ordre inverse :

```typescript
// Exemple illustrant l'ordre
export default class TraceMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    console.log('avant le handler')   // s'exécute en premier
    await next()
    console.log('après le handler')   // s'exécute en dernier
  }
}
```

## Court-circuit

Un middleware peut arrêter le pipeline en n'appelant pas `next()`. Le handler et tous les middlewares en aval ne s'exécutent pas :

```typescript
export default class MaintenanceModeMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    if (process.env.MAINTENANCE === 'true') {
      ctx.response.status(503).json({ error: 'Service temporarily unavailable' })
      return   // next() n'est pas appelé — le pipeline s'arrête ici
    }
    await next()
  }
}
```

## Chargement paresseux

Toutes les entrées passées à `server.use()`, `router.use()` et `router.named()` sont des imports paresseux — des fonctions qui renvoient une promesse. Le module est chargé à la première requête qui atteint ce middleware, puis mis en cache :

```typescript
// Import paresseux — le module n'est chargé qu'au besoin
() => import('#middleware/heavy_middleware.js')
```

Les fonctions middleware directes (à deux paramètres `(ctx, next)`) sont aussi acceptées quand une classe n'est pas nécessaire :

```typescript
server.use([
  async (ctx, next) => {
    ctx.response.header('x-powered-by', 'Ream')
    await next()
  },
])
```

## Écrire un middleware d'authentification

Un middleware d'authentification typique lit un jeton, le vérifie et remplit `ctx.auth` :

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { TokenService } from '#services/token_service.js'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const header = ctx.request.header('authorization') ?? ''
    const token = header.replace(/^Bearer\s+/, '')

    if (token) {
      const payload = await TokenService.verify(token)
      if (payload) {
        ctx.auth = {
          isAuthenticated: true,
          user: { id: payload.sub, email: payload.email },
          roles: payload.roles ?? [],
          permissions: payload.permissions ?? [],
        }
      }
    }

    await next()
  }
}
```

Une fois `ctx.auth` rempli, les guards déclarés sur la route (`.guard('jwt')`, `.role('admin')`, `.permission('orders:write')`) sont appliqués automatiquement par le pipeline — inutile de les vérifier à la main dans le middleware.

## Le HttpContext dans un middleware

Chaque middleware reçoit le même `HttpContext`, qui traverse tout le pipeline. Utilisez `ctx.store` pour faire passer des données d'une couche à l'autre :

```typescript
// Un middleware en amont pose une valeur
ctx.store.set('tenant-id', resolveTenant(ctx.request))

// Un middleware ou un handler en aval la lit — le store contient `unknown`, réduisez-le
const tenantId = ctx.store.get('tenant-id')
if (typeof tenantId !== 'string') throw new Error('The tenant middleware did not run')
```

Propriétés clés disponibles dans chaque middleware :

```typescript
ctx.id                      // ID de corrélation (x-request-id ou UUID)
ctx.request.method()        // 'GET' | 'POST' | ...
ctx.request.path()          // '/api/users'
ctx.request.header('key')   // Valeur d'un en-tête
ctx.request.ip()            // IP du client
ctx.auth                    // { isAuthenticated, user?, roles?, permissions? }
ctx.params                  // Paramètres de route { id: '...' }
ctx.response.status(code)   // Fixe le statut de la réponse (chaînable)
ctx.response.header(k, v)   // Fixe un en-tête de réponse (chaînable)
ctx.response.json(data)     // Envoie une réponse JSON
ctx.store                   // Map par requête pour transmettre des données en aval
ctx.containerResolver       // Résolveur IoC par requête : await ctx.containerResolver?.make(Service)
```

### Résoudre des services dans un middleware

Résolvez les services enregistrés dans le conteneur via `ctx.containerResolver` plutôt qu'en important le singleton de l'application. Un middleware — surtout s'il est livré comme paquet autonome — reste ainsi libre de tout import d'exécution de `@c9up/ream` :

```typescript
import type { HttpContext } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class WardenMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const auth = await ctx.containerResolver?.make(AuthManager)
    // ...authentifier avec `auth`, puis :
    await next()
  }
}
```

`ctx.containerResolver` est le résolveur par requête que Ream construit avec `container.createResolver()` ; `.make(token)` résout un jeton classe, chaîne ou symbole et renvoie une promesse. C'est ainsi que `@c9up/warden` et `@c9up/blackhole` consomment les services de l'hôte tout en restant indépendants du framework.

Il porte aussi le reste de la surface du résolveur — `call()`, `hasBinding()`, `hasAllBindings()` et `bindValue()` :

```typescript
// Lié pour CETTE requête seulement — aucune autre requête ne le voit
ctx.containerResolver?.bindValue(CurrentTenant, tenant)
```

Ream lie le `HttpContext` à chaque requête, donc un contrôleur ou un service dont
il dépend peut le recevoir en dépendance de constructeur :

```typescript
class Auditor {
  constructor(@inject(HttpContext) private ctx: HttpContext) {}
}
```

Un singleton qui lit une valeur liée à la requête pendant sa construction n'est
**pas** mis en cache pour toute l'application — il appartient à cette requête.
Celui qui n'en lit aucune est mis en cache comme avant.

### Liaisons contextuelles

Donnez à une classe une autre implémentation d'une dépendance, en laissant tous
les autres sur la liaison du conteneur :

```typescript
container.when(UsersController).asksFor(Hash).provide(() => new Argon2())
// ou en un appel
container.contextualBinding(UsersController, Hash, () => new Argon2())
```

La clé est la classe qui **déclare** la dépendance, pas un de ses ancêtres : si
`AdminController` dépend de `PasswordService` et que c'est `PasswordService` qui
demande `Hash`, la liaison à écrire est `when(PasswordService)`.

`resolveFor(parent, token)` résout comme si `parent` l'avait demandé, aussi bien
sur le conteneur que sur un résolveur de requête.

## Étapes suivantes

- [Routing](/fr/guide/routing) — Contrôleurs, groupes et routes nommées
- [Warden](/fr/modules/warden) — Stratégies d'authentification et RBAC
- [Conteneur](/fr/guide/container) — Injection de dépendances dans les classes de middleware
