# Protéger les routes

Ce guide couvre la protection des routes et des contrôleurs :

- Middleware d'authentification
- Guards sur les routes
- E_UNAUTHORIZED et E_FORBIDDEN
- Décorateurs (métadonnées au niveau du contrôleur)

## Middleware d'authentification

Créez une classe `AuthMiddleware` qui appelle `auth.verify()` et peuple `ctx.auth`. Le conteneur résout `AuthManager` via l'injection par constructeur.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { E_UNAUTHORIZED } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class AuthMiddleware {
  constructor(private auth: AuthManager) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const bearer = ctx.request.header('authorization')
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined

    if (!token) {
      throw new E_UNAUTHORIZED('Bearer token required')
    }

    const result = await this.auth.verify(token)
    if (!result.authenticated || !result.user) {
      throw new E_UNAUTHORIZED('Invalid or expired token')
    }

    ctx.auth = {
      isAuthenticated: true,
      user: result.user,
      roles: result.user.roles ?? [],
      permissions: result.user.permissions ?? [],
    }

    await next()
  }
}
```

Enregistrez-le comme middleware nommé dans `start/kernel.ts` :

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'

export const middleware = router.named({
  auth: () => import('#app/middleware/auth_middleware.js'),
})
```

---

## Guards sur les routes

Appliquez des guards au niveau de la route ou du groupe en utilisant `.guard()`, `.role()` et `.permission()` sur le constructeur de route. Le pipeline de middlewares les applique avant d'appeler le contrôleur — aucune classe middleware n'est nécessaire.

```typescript
import router from '@c9up/ream/services/router'
import PostsController from './controllers/PostsController.js'

// Exiger l'authentification via le guard 'jwt'
router.get('/posts', [PostsController, 'index'])
  .guard('jwt')

// Exiger un rôle
router.delete('/posts/:id', [PostsController, 'destroy'])
  .guard('jwt')
  .role('admin')

// Exiger une permission
router.post('/posts', [PostsController, 'store'])
  .guard('jwt')
  .permission('posts.create')

// Appliquer à un groupe — toutes les routes du groupe héritent de ces contraintes
router.group(() => {
  router.get('/admin/users', [UsersController, 'index'])
  router.delete('/admin/users/:id', [UsersController, 'destroy'])
    .permission('users.delete')
}).prefix('/api').guard('jwt').role('admin')
```

### Comportement d'application des guards

Le gate du constructeur de route appartient à Ream, pas à Warden. Il lève les exceptions de Ream, que le gestionnaire d'exceptions rend :

1. Si la route possède un guard, un rôle ou une permission quelconque et que `ctx.auth.isAuthenticated` est `false`, il lève `E_UNAUTHORIZED` : `401 { error: { code: 'E_UNAUTHORIZED', message: 'Authentication required' } }`.
2. Si la route exige des rôles et que l'utilisateur n'en détient **aucun** (`ctx.auth.roles`, ou `ctx.auth.user.roles` où Warden les range), il lève `E_FORBIDDEN` : `403 { error: { code: 'E_FORBIDDEN', message: 'Insufficient role', required: [...] } }`. `.role('a', 'b')` vaut « l'un ou l'autre ».
3. Si la route exige des permissions et que l'utilisateur ne les détient pas **toutes**, il lève `E_FORBIDDEN` : `403 { error: { code: 'E_FORBIDDEN', message: 'Insufficient permissions', required: [...] } }`. Quand `ctx.auth` offre `hasAllPermissions()` — c'est le cas de l'authenticator de Warden —, sa réponse décide, via le résolveur de droits ; sinon le gate lit les permissions du payload. Une requête venue avec un jeton (`user.currentAccessToken`) exige en plus que le jeton autorise chacune.

`ctx.auth` doit être peuplé avant l'exécution du gate — c'est le rôle du middleware d'authentification.

### Le gate des décorateurs

Le middleware d'authentification de Warden (`@c9up/warden/middleware`) applique les décorateurs `@Guard`, `@Role` et `@Permission` de l'action du contrôleur et répond lui-même, sans passer par le gestionnaire d'exceptions :

- Échec d'authentification : `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: ... } }` (une requête HTML sur un guard session doté d'une route de login est redirigée à la place).
- Permissions ou rôles manquants : `403 { error: { code: 'E_WARDEN_FORBIDDEN', message: 'Missing permissions: ...' } }` ou `'Missing roles: ...'`. Ici les rôles sont **tous requis** : `@Role('a', 'b')` exige les deux, et les permissions sont vérifiées avant les rôles.

---

## E_UNAUTHORIZED et E_FORBIDDEN

Les deux exceptions du gate de route sont exportées par `@c9up/ream` et rendent elles-mêmes leur réponse HTTP. Levez-les depuis vos propres middlewares ou contrôleurs :

```typescript
import { E_FORBIDDEN, E_UNAUTHORIZED } from '@c9up/ream'

// 401
throw new E_UNAUTHORIZED('Bearer token required')
// Réponse : { "error": { "code": "E_UNAUTHORIZED", "message": "Bearer token required" } }

// 403
throw new E_FORBIDDEN('Insufficient permissions', ['posts.create'])
// Réponse : { "error": { "code": "E_FORBIDDEN", "message": "Insufficient permissions", "required": ["posts.create"] } }
```

Les échecs propres à Warden sont des `WardenError` : `E_UNAUTHORIZED_ACCESS` (401), `E_INVALID_CREDENTIALS` (400) et `E_AUTHORIZATION_FAILURE` (403, un `authorize()` refusé) sont des classes exportées ; `E_WARDEN_FORBIDDEN` est le code qu'écrit le gate des décorateurs, pas une classe.

---

## Décorateurs (métadonnées au niveau du contrôleur)

`@Guard()`, `@Role()` et `@Permission()` sont des décorateurs de méthode qui attachent des métadonnées via `reflect-metadata`. Ils n'appliquent rien par eux-mêmes — ils sont lus par les outils d'inspection de routes (la CLI `ream`, générateurs OpenAPI). Pour une application effective au moment de la requête, utilisez les méthodes fluides `.guard()`, `.role()`, `.permission()` du router ou le middleware d'authentification.

```typescript
import { Guard, Permission, Role } from '@c9up/warden'

class PostsController {
  @Guard('jwt')
  @Permission('posts.create')
  @Role('admin')
  async store() {
    // Métadonnées uniquement — l'application vient du constructeur de route ou du middleware
  }
}

// Lire les métadonnées :
import { getGuardMetadata, getPermissionMetadata, getRoleMetadata } from '@c9up/warden'

getGuardMetadata(PostsController.prototype, 'store')       // ['jwt']
getPermissionMetadata(PostsController.prototype, 'store')  // ['posts.create']
getRoleMetadata(PostsController.prototype, 'store')        // ['admin']
```

Quand le middleware d'authentification (`@c9up/warden/middleware`) les lit :

- **L'autorisation implique l'authentification.** Une action portant `@Role`,
  `@Permission` ou `@RequireMfa` sans `@Guard` est authentifiée avec le garde
  par défaut, et une requête anonyme reçoit un 401. Une route qui ne déclare que
  `@Role('admin')` n'est jamais publique.
- **Les décorateurs s'héritent.** Ils sont lus à travers la chaîne de
  prototypes : une action qu'un contrôleur hérite garde le garde et
  l'autorisation que son parent a déclarés — `class UsersController extends
  AdminController {}` route `[UsersController, 'index']` avec les décorateurs
  d'`AdminController`. Une surcharge qui ne déclare rien en hérite aussi, si
  bien que redéfinir une méthode ne fait jamais tomber un garde par accident ;
  une surcharge qui déclare son propre décorateur remplace celui du parent pour
  ce décorateur-là.

---
