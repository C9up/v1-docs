# Protéger les routes

Ce guide couvre la protection des routes et des contrôleurs :

- Middleware d'authentification
- Guards sur les routes
- E_UNAUTHORIZED_ACCESS et E_AUTHORIZATION_FAILURE
- Décorateurs (métadonnées au niveau du contrôleur)

## Middleware d'authentification

Créez une classe `AuthMiddleware` qui appelle `auth.verify()` avec le guard `jwt` et peuple `ctx.auth`. Le conteneur résout `AuthManager` via l'injection par constructeur : c'est `@inject()` qui lui indique la classe à injecter. Sans lui, la requête échoue avec une 500.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { errors, inject } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

@inject()
export default class AuthMiddleware {
  constructor(private auth: AuthManager) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const bearer = ctx.request.header('authorization')
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined

    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
    }

    const result = await this.auth.verify(token, 'jwt')
    if (!result.authenticated || !result.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid or expired token')
    }

    ctx.auth = {
      isAuthenticated: true,
      // Le guard qui a authentifié la requête : le `.guard('jwt')` d'une route
      // ne laisse passer la requête que si ce champ nomme l'un de ses guards.
      authenticatedViaGuard: 'jwt',
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

Une route ou un groupe l'utilise ensuite par son nom, `.middleware('auth')`, comme dans les exemples ci-dessous. La forme fabrique fait la même chose et passe en plus des arguments au troisième paramètre de `handle()` : `.use(middleware.auth({ guards: ['jwt'] }))`. Un nom donné à `.middleware()` doit être déclaré dans `router.named()` : un `.middleware('auht')` mal orthographié arrête l'application au démarrage avec `E_MIDDLEWARE_NOT_FOUND`, qui nomme la route.

Les middlewares de `router.use()` passent avant lui. Il peut donc lire ce qu'ils ont posé (la session, l'utilisateur trouvé par `@c9up/warden/silent-auth`).

---

## Guards sur les routes

Appliquez des guards au niveau de la route ou du groupe avec `.guard()`, `.role()` et `.permission()`, sur le constructeur de route ou sur celui du groupe. Le pipeline de middlewares les applique avant d'appeler le contrôleur. Vous n'avez pas besoin d'une autre classe middleware. Le gate lit seulement `ctx.auth` : le middleware d'authentification ci-dessus doit donc passer avant. Attachez-le aux routes (`.middleware('auth')`, comme ci-dessous) ou à la pile du serveur.

Chaque appel doit nommer au moins un guard, un rôle ou une permission. `.guard()`, `.role()` ou `.permission()` sans argument, et `group({ guards: [] })`, lèvent `E_EMPTY_GATE_REQUIREMENT` à la déclaration de la route : une exigence vide ne protégerait rien. Cela attrape aussi une liste lue dans la configuration et qui est vide (`.role(...ADMIN_ROLES)`). Il en va de même pour le `@Role()`, le `@Permission()` ou le `@Guard()` d'une action de contrôleur qui ne nomme rien : le décorateur lui-même lève `E_WARDEN_EMPTY_GATE_REQUIREMENT` au chargement de la classe, et des métadonnées qui ne nomment quand même rien (écrites à la main) sont refusées à la requête : le gate de route répond `E_EMPTY_GATE_REQUIREMENT` (500), le middleware de Warden `E_WARDEN_EMPTY_GATE_REQUIREMENT` (500). Pour une route sans exigence, n'écrivez pas l'appel.

```typescript
import router from '@c9up/ream/services/router'
import PostsController from './controllers/PostsController.js'
import UsersController from './controllers/UsersController.js'

// Exiger l'authentification via le guard 'jwt'
router.get('/posts', [PostsController, 'index'])
  .middleware('auth')
  .guard('jwt')

// Exiger un rôle
router.delete('/posts/:id', [PostsController, 'destroy'])
  .middleware('auth')
  .guard('jwt')
  .role('admin')

// Exiger une permission
router.post('/posts', [PostsController, 'store'])
  .middleware('auth')
  .guard('jwt')
  .permission('posts.create')

// Appliquer à un groupe — toutes les routes du groupe héritent de ces contraintes
router.group(() => {
  router.get('/admin/users', [UsersController, 'index'])
  router.delete('/admin/users/:id', [UsersController, 'destroy'])
    .permission('users.delete')
}).prefix('/api').middleware('auth').guard('jwt').role('admin')
```

Les `.guard()`, `.role()` et `.permission()` du groupe atteignent toutes les routes déclarées dans son callback, groupes imbriqués compris. Ils font ce que fait la forme objet `router.group({ guards, roles, permissions }, (r) => { ... })`. Un groupe n'élargit jamais ce que demande une route :

- **Guards.** Chaque `.guard()` est un niveau : la requête doit être authentifiée par l'un des guards qu'il nomme. Le `.guard()` du groupe, celui de chaque groupe imbriqué, chaque appel `.guard()` sur la route et le `@Guard()` de l'action sont des niveaux séparés. Le guard qui a authentifié la requête doit figurer dans chacun. Un `.guard('web')` de route dans un groupe `.guard('jwt')` n'accepte aucune requête. Pour accepter l'un ou l'autre guard, nommez les deux dans un seul appel : `.guard('jwt', 'web')`.
- **Rôles.** Chaque `.role()` est une exigence : l'utilisateur doit avoir l'un des rôles qu'il nomme. Le `.role()` du groupe, celui de chaque groupe imbriqué et chaque appel `.role()` sur la route sont des exigences séparées. L'utilisateur doit toutes les satisfaire. Un `.role('editor')` de route dans un groupe `.role('admin')` exige un utilisateur à la fois admin et éditeur. Pour accepter l'un ou l'autre rôle, nommez les deux dans un seul appel : `.role('admin', 'editor')`.
- **Permissions.** Les permissions du groupe s'ajoutent à celles de la route, et l'utilisateur doit toutes les avoir.

Dans l'exemple ci-dessus, `DELETE /api/admin/users/:id` demande le rôle `admin` et la permission `users.delete`.

### Comportement d'application des guards

Le gate du constructeur de route appartient à Ream, pas à Warden. Il lève les exceptions de Ream, avec les codes, statuts et messages que Warden lève pour les mêmes refus. Chacune se rend elle-même par son propre `handle`, qui écrit les mêmes octets que l'erreur de Warden du même code : un refus répond donc de la même façon, quel que soit le gate qui l'a levé :

1. Si la route a des guards, la requête doit être authentifiée par un guard que chaque niveau nomme : `ctx.auth.authenticatedViaGuard` figure dans chaque niveau. Sinon, quand `ctx.auth` offre `authenticateUsing()` (c'est le cas de l'authenticator de Warden), le gate l'appelle une fois, avec les guards que nomment tous les niveaux. Quand aucun guard ne figure dans tous les niveaux, rien ne peut passer. À défaut, il lève `E_UNAUTHORIZED_ACCESS` : `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: 'Unauthorized access' } }`, pour tout client. Une requête authentifiée par un autre guard est refusée elle aussi.
   Si la route a des rôles ou des permissions, ou si son action porte `@RequireMfa()`, et que `ctx.auth.isAuthenticated` est `false`, il lève le même 401.
2. Si la route exige des rôles, l'utilisateur doit satisfaire chaque exigence : un rôle de chaque appel `.role()`, du `.role()` de chaque groupe, et tous les rôles du `@Role()` de l'action. Les rôles sont lus dans `ctx.auth.roles`, ou dans `ctx.auth.user.roles` où Warden les range. Sinon, il lève `E_AUTHORIZATION_FAILURE` (403). `.role('a', 'b')` accepte `a` ou `b` ; `.role('a').role('b')` exige les deux.
3. Si la route exige des permissions et que l'utilisateur ne les détient pas **toutes**, il lève `E_AUTHORIZATION_FAILURE` (403). Les rôles et permissions que demande la route ne sont jamais envoyés : ils diraient au client quoi obtenir. Quand `ctx.auth` offre `hasAllPermissions()` — c'est le cas de l'authenticator de Warden —, sa réponse décide, via le résolveur de droits ; sinon le gate lit les permissions du payload. Une requête venue avec un jeton (`user.currentAccessToken`) exige en plus que le jeton autorise chacune.

4. Si l'action du contrôleur porte `@RequireMfa()`, `ctx.auth.user.mfa` doit valoir `true` : le credential a passé le step-up MFA. Sinon, il lève `E_WARDEN_MFA_REQUIRED` : `403 { error: { code: 'E_WARDEN_MFA_REQUIRED', message: 'Multi-factor authentication is required for this action.' } }`, le corps qu'écrit le middleware de Warden. Voir [MFA](/fr/guides/auth/mfa).

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

`@Guard()`, `@Role()`, `@Permission()` et `@RequireMfa()` sont des décorateurs de méthode qui attachent des métadonnées via `reflect-metadata`. Deux gates les appliquent au moment de la requête :

- Le gate de route de Ream, pour une route dont le handler est une action de contrôleur (`[PostsController, 'store']` ou `'PostsController.store'`). Il ajoute les guards, les rôles, les permissions et l'exigence MFA de l'action à ceux de la route, puis les vérifie comme le décrit [Comportement d'application des guards](#comportement-d-application-des-guards). Là aussi, l'utilisateur doit avoir tous les rôles de `@Role('a', 'b')`, en plus des exigences de la route et des groupes. Le gate applique les quatre décorateurs sur toutes les piles, dès la première requête, que le contrôleur soit importé à la demande ou non.
- Le middleware d'authentification de Warden, si vous l'utilisez. Il lit les mêmes décorateurs, comme le décrit [Le gate des décorateurs](#le-gate-des-decorateurs). Là, l'utilisateur doit avoir tous les rôles.

Si les deux gates tournent, la requête doit passer les deux.

```typescript
import { Guard, Permission, Role } from '@c9up/warden'

class PostsController {
  @Guard('jwt')
  @Permission('posts.create')
  @Role('admin')
  async store() {
    // Ne s'exécute qu'une fois que les gates ci-dessus ont laissé passer la requête
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
