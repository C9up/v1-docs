# Protéger les routes

Ce guide couvre la protection des routes et des contrôleurs :

- Middleware d'authentification
- Guards sur les routes
- E_UNAUTHORIZED_ACCESS et E_AUTHORIZATION_FAILURE
- Décorateurs (métadonnées au niveau du contrôleur)

## Middleware d'authentification

Créez une classe `AuthMiddleware` qui appelle `auth.verify()` et peuple `ctx.auth`. Le conteneur résout `AuthManager` via l'injection par constructeur.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { errors } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class AuthMiddleware {
  constructor(private auth: AuthManager) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const bearer = ctx.request.header('authorization')
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined

    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
    }

    const result = await this.auth.verify(token)
    if (!result.authenticated || !result.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid or expired token')
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

Le gate du constructeur de route appartient à Ream, pas à Warden. Il lève les exceptions de Ream, avec les codes, statuts et messages que Warden lève pour les mêmes refus. Chacune se rend elle-même par son propre `handle`, qui écrit les mêmes octets que l'erreur de Warden du même code : un refus répond donc de la même façon, quel que soit le gate qui l'a levé :

1. Si la route possède un guard, un rôle ou une permission quelconque et que `ctx.auth.isAuthenticated` est `false`, il lève `E_UNAUTHORIZED_ACCESS` : `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: 'Unauthorized access' } }`, pour tout client.
2. Si la route exige des rôles et que l'utilisateur n'en détient **aucun** (`ctx.auth.roles`, ou `ctx.auth.user.roles` où Warden les range), il lève `E_AUTHORIZATION_FAILURE` (403). `.role('a', 'b')` vaut « l'un ou l'autre ».
3. Si la route exige des permissions et que l'utilisateur ne les détient pas **toutes**, il lève `E_AUTHORIZATION_FAILURE` (403). Les rôles et permissions que demande la route ne sont jamais envoyés : ils diraient au client quoi obtenir. Quand `ctx.auth` offre `hasAllPermissions()` — c'est le cas de l'authenticator de Warden —, sa réponse décide, via le résolveur de droits ; sinon le gate lit les permissions du payload. Une requête venue avec un jeton (`user.currentAccessToken`) exige en plus que le jeton autorise chacune.

`E_AUTHORIZATION_FAILURE` se rend en négociant le contenu : `403 { errors: [{ message: 'Access denied' }] }` pour un client JSON, `{ errors: [{ code: 'E_AUTHORIZATION_FAILURE', title: 'Access denied' }] }` en JSON:API, le message en texte pour une requête HTML, et une soumission de formulaire (`POST`, `PUT`, `PATCH`, `DELETE`) d'un navigateur avec une session est redirigée vers la page précédente avec le message en flash sous `error` et sous le code. Le message est traduit sous `errors.E_AUTHORIZATION_FAILURE` quand le contexte a un `i18n`.

`ctx.auth` doit être peuplé avant l'exécution du gate — c'est le rôle du middleware d'authentification.

### Le gate des décorateurs

Le middleware d'authentification de Warden (`@c9up/warden/middleware`) applique les décorateurs `@Guard`, `@Role` et `@Permission` de l'action du contrôleur. Un refus est levé, comme le lèvent le middleware `auth` et le bouncer d'AdonisJS, et le gestionnaire d'exceptions de l'hôte appelle le `handle` propre à l'erreur, qui écrit la réponse :

- Échec d'authentification : `errors.E_UNAUTHORIZED_ACCESS`, `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: ... } }` (une requête HTML sur un guard session doté d'une route de login est redirigée à la place ; un guard Basic ajoute son challenge `WWW-Authenticate`).
- Permissions ou rôles manquants : `errors.E_AUTHORIZATION_FAILURE`, rendue comme un `authorize()` refusé et comme le `.role()` / `.permission()` du gate de route : `403 { errors: [{ message: 'Access denied' }] }` pour un client JSON, les autres formats comme ci-dessus. Le message est traduit sous `errors.E_AUTHORIZATION_FAILURE` quand le contexte a un `i18n` ; les rôles et permissions manquants ne sont pas envoyés. Ici les rôles sont **tous requis** : `@Role('a', 'b')` exige les deux.

---

## E_UNAUTHORIZED_ACCESS et E_AUTHORIZATION_FAILURE

Les deux exceptions du gate de route sont des classes de l'`errors` de `@c9up/ream`, et chacune se rend elle-même. Levez-les depuis vos propres middlewares ou contrôleurs :

```typescript
import { errors } from '@c9up/ream'

// 401
throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
// Réponse : { "error": { "code": "E_UNAUTHORIZED_ACCESS", "message": "Bearer token required" } }

// 403
throw new errors.E_AUTHORIZATION_FAILURE()
// Réponse à un client JSON : { "errors": [{ "message": "Access denied" }] }
```

Les échecs propres à Warden sont des classes de son namespace `errors` : `errors.E_UNAUTHORIZED_ACCESS` (401), `errors.E_INVALID_CREDENTIALS` (400) et `errors.E_AUTHORIZATION_FAILURE` (403, un `authorize()` refusé, ou un rôle ou une permission que refuse le gate des décorateurs). Les classes de Ream et de Warden sont distinctes, avec les mêmes codes : testez `error.code` pour intercepter l'une ou l'autre.

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
