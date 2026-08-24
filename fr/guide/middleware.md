# Middleware

Ream utilise un pipeline middleware en pattern oignon qui fonctionne à la fois pour les requêtes HTTP et les events du bus.

## Écrire un middleware

Un middleware reçoit un `Context` et une fonction `next()` :

```typescript
import type { MiddlewareFunction } from '@c9up/ream'

const loggerMiddleware: MiddlewareFunction = async (ctx, next) => {
  const start = Date.now()

  // Avant le handler
  console.log(`→ ${ctx.request?.method} ${ctx.request?.path}`)

  await next()  // Appeler le middleware suivant ou le handler

  // Après le handler
  const duration = Date.now() - start
  console.log(`← ${duration}ms`)
}
```

## Middleware global

S'exécute sur **chaque** requête et event :

```typescript
import { MiddlewareRegistry } from '@c9up/ream'

const middleware = new MiddlewareRegistry()
middleware.use(loggerMiddleware)
middleware.use(corsMiddleware)
```

Ou via Ignitor :

```typescript
new Ignitor(config)
  .use(loggerMiddleware)
  .use(corsMiddleware)
  .start()
```

## Middleware nommé

Enregistrez par nom, appliquez sur des routes spécifiques :

```typescript
middleware.register('auth', async (ctx, next) => {
  const token = ctx.request?.headers['authorization']
  if (!token) {
    ctx.response!.status = 401
    ctx.response!.body = JSON.stringify({ error: 'Unauthorized' })
    return  // Court-circuit — le handler ne s'exécute jamais
  }
  await next()
})

middleware.register('throttle', throttleMiddleware)
```

Appliquer sur les routes :

```typescript
router.post('/orders', handler).middleware('auth', 'throttle')
```

## Ordre d'exécution (Pattern oignon)

```
Requête entrante
  → Middleware global 1 (avant)
    → Middleware global 2 (avant)
      → Middleware nommé (auth, throttle)
        → Handler de route
      → Middleware nommé (après)
    → Middleware global 2 (après)
  → Middleware global 1 (après)
Réponse envoyée
```

```typescript
middleware.use(async (ctx, next) => {
  console.log('1: avant')
  await next()
  console.log('1: après')
})

middleware.use(async (ctx, next) => {
  console.log('2: avant')
  await next()
  console.log('2: après')
})

// Sortie : 1: avant → 2: avant → handler → 2: après → 1: après
```

## Court-circuit

Un middleware peut arrêter la chaîne en n'appelant pas `next()` :

```typescript
middleware.use(async (ctx, next) => {
  if (ctx.request?.path === '/blocked') {
    ctx.response!.status = 403
    ctx.response!.body = 'Forbidden'
    return  // Ne pas appeler next() — le handler ne s'exécute jamais
  }
  await next()
})
```

## Context

L'objet `Context` est partagé entre tous les middleware et handlers :

```typescript
ctx.id                    // ID de corrélation (depuis le header x-request-id ou auto-généré)
ctx.type                  // 'http' ou 'event'
ctx.is('http')            // true pour les requêtes HTTP
ctx.is('event')           // true pour les events du bus
ctx.auth                  // { authenticated, user?, roles?, permissions? }
ctx.locale                // Locale détectée (défaut 'en')
ctx.containerResolver     // Résolveur IoC par requête (idiome Adonis) : ctx.containerResolver?.make(Service)

// Spécifique HTTP
ctx.request?.method       // 'GET', 'POST', etc.
ctx.request?.path         // '/api/orders'
ctx.request?.query        // 'page=1&limit=20'
ctx.request?.headers      // { 'content-type': 'application/json' }
ctx.request?.body         // Corps de la requête (string)
ctx.params                // { id: '123' } (extrait de la route)
ctx.response!.status      // Définir le statut de réponse (défaut 200)
ctx.response!.headers     // Définir les headers de réponse
ctx.response!.body        // Définir le corps de la réponse

// Spécifique event
ctx.event?.name           // 'order.created'
ctx.event?.data           // Payload de l'event
ctx.event?.correlationId  // ID de traçage de chaîne
```

## Résoudre un service dans un middleware

Un middleware résout les services enregistrés dans le conteneur via `ctx.containerResolver` (idiome AdonisJS), plutôt qu'en important le singleton applicatif. C'est ce qui permet à un middleware — surtout livré comme package autonome — de rester sans import runtime de `@c9up/ream` :

```typescript
import type { HttpContext } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class WardenMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const auth = ctx.containerResolver?.make(AuthManager)
    // ...authentifie via `auth`, puis :
    await next()
  }
}
```

`ctx.containerResolver` est le résolveur par requête que Ream construit avec `container.createResolver()` (AdonisJS Fold) ; `.make(token)` résout une classe, une string ou un symbol. C'est ainsi que `@c9up/warden` et `@c9up/blackhole` consomment les services de l'hôte tout en restant agnostiques du framework.

Il porte aussi le reste de la surface du résolveur AdonisJS — `call()`, `hasBinding()`, `hasAllBindings()` et `bindValue()` :

```typescript
// Lié à CETTE requête uniquement — aucune autre ne le voit
ctx.containerResolver?.bindValue(CurrentTenant, tenant)
```

Ream lie le `HttpContext` à chaque requête, donc un contrôleur — ou un service dont il dépend — peut le prendre en dépendance de constructeur :

```typescript
class Auditor {
  constructor(@inject(HttpContext) private ctx: HttpContext) {}
}
```

Un singleton qui lit une valeur liée à la requête pendant sa construction n'est **pas** mis en cache au niveau applicatif — il appartient à cette requête. Celui qui n'en lit aucune est mis en cache exactement comme avant.

### Liaisons contextuelles

Donner à une seule classe une autre implémentation d'une dépendance, en laissant toutes les autres sur la liaison du conteneur :

```typescript
container.when(UsersController).asksFor(Hash).provide(() => new Argon2())
// ou en un appel
container.contextualBinding(UsersController, Hash, () => new Argon2())
```

La clé est la classe qui **déclare** la dépendance, pas un ancêtre : si `AdminController` dépend de `PasswordService` et que c'est `PasswordService` qui demande `Hash`, la liaison à écrire est `when(PasswordService)`.

`resolveFor(parent, token)` résout comme si `parent` avait demandé, aussi bien sur le conteneur que sur un résolveur de requête.

## Pipeline unifié

Le même middleware fonctionne pour les requêtes HTTP et les events du bus :

```typescript
middleware.use(async (ctx, next) => {
  if (ctx.is('http')) {
    console.log(`HTTP: ${ctx.request?.method} ${ctx.request?.path}`)
  } else {
    console.log(`Event: ${ctx.event?.name}`)
  }
  await next()
})
```

## Étapes suivantes

- [Configuration](/fr/guide/configuration) — Config typée par module
- [Warden (Auth)](/fr/modules/warden) — Middleware d'authentification
