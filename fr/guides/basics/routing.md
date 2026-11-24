# Routage

Ce guide couvre le routage :

- Définir des routes
- Routes de ressource
- Groupes de routes
- Domaines
- Les doublons sont refusés
- Matchers
- Paramètres attrape-tout
- Builder de route fluide
- Raccourcis de route
- Routes de modules

Les routes sont définies comme des effets de bord dans les fichiers de routes des modules. Le singleton du router est importé depuis `@c9up/ream/services/router` et accessible après que l'Ignitor l'a initialisé.

## Définir des routes

### Routes de base

```typescript
import router from '@c9up/ream/services/router'

router.get('/users', async ({ response }) => {
  response.json({ users: [] })
})

router.post('/users', async ({ request, response }) => {
  const data = await request.validateUsing(createUser)
  response.status(201).json({ user: data })
})
```

`createUser` est un validateur : il ne garde que les champs qu'il déclare. Voir
[Validation](/fr/guides/basics/validation/).

### Méthodes disponibles

```typescript
router.get('/resource', handler)
router.post('/resource', handler)
router.put('/resource/:id', handler)
router.patch('/resource/:id', handler)
router.delete('/resource/:id', handler)
router.head('/resource', handler)
router.options('/resource', handler)
router.any('/resource', handler)   // correspond à toutes les méthodes HTTP
```

### Paramètres de route

Les paramètres sont extraits du modèle d'URL et disponibles via `ctx.params` et `request.param()` :

```typescript
router.get('/users/:id', async ({ request, response }) => {
  const id = request.param('id')
  response.json({ id })
})

router.get('/orders/:orderId/items/:itemId', async ({ params, response }) => {
  const { orderId, itemId } = params
  response.json({ orderId, itemId })
})
```

### Contraintes de paramètres

Contraignez un paramètre à un modèle spécifique. Les requêtes qui ne correspondent pas sont transmises à la route suivante :

```typescript
// Contraintes intégrées
router.get('/users/:id', handler).where('id', router.matchers.number())
router.get('/posts/:slug', handler).where('slug', router.matchers.slug())
router.get('/tasks/:id', handler).where('id', router.matchers.uuid())

// Regex personnalisée
router.get('/files/:name', handler).where('name', /^[\w-]+\.pdf$/)
```

| Contrainte | Modèle |
|---|---|
| `router.matchers.number()` | Chiffres uniquement (`\d+`) |
| `router.matchers.uuid()` | UUID v4 |
| `router.matchers.slug()` | Alphanumérique minuscule avec tirets |

## Routes de ressource

`router.resource()` enregistre l'ensemble complet des routes CRUD pour un contrôleur en un seul appel :

```typescript
router.resource('posts', PostsController)
// GET    /posts        → PostsController.index
// POST   /posts        → PostsController.store
// GET    /posts/:id    → PostsController.show
// PUT    /posts/:id    → PostsController.update
// PATCH  /posts/:id    → PostsController.update
// DELETE /posts/:id    → PostsController.destroy
```

Les routes sont automatiquement nommées (`posts.index`, `posts.store`, `posts.show`, etc.). `resource()` retourne une `RouteResource` : elle filtre les actions et pose des middlewares par action, mais n'a ni `prefix()` ni `guard()`. Pour préfixer ou protéger une ressource, placez-la dans un groupe :

```typescript
router.group(() => {
  router.resource('posts', PostsController)
}).prefix('/api/v1').guard('jwt')
```

## Groupes de routes

Les groupes appliquent une configuration partagée (préfixe, middleware, guards, rôles, permissions) à un ensemble de routes. La syntaxe préférée est la forme avec callback fluide :

```typescript
router.group(() => {
  router.get('/users', [UsersController, 'index'])
  router.post('/users', [UsersController, 'store'])
  router.get('/users/:id', [UsersController, 'show'])
}).prefix('/api/v1').middleware('throttle').guard('jwt')
```

`.guard()`, `.role()` et `.permission()` marchent sur un groupe comme sur une route, et ne font que restreindre. La requête doit être authentifiée par un guard que le groupe et la route nomment tous deux. L'utilisateur doit avoir l'un des rôles du groupe ET satisfaire les exigences de rôles de la route. Il doit aussi avoir toutes les permissions du groupe et de la route. Voir [Protéger les routes](/fr/guides/auth/protecting-routes#guards-sur-les-routes).

La forme héritée avec objet de configuration est également supportée :

```typescript
router.group({ prefix: '/api/v1', guards: ['jwt'], roles: ['admin'] }, (r) => {
  r.get('/users', [UsersController, 'index'])
})
```

Les groupes peuvent être imbriqués :

```typescript
router.group(() => {
  router.group(() => {
    router.resource('users', UsersController)
  }).prefix('/v1').as('v1')

  router.group(() => {
    router.resource('users', UsersController)
  }).prefix('/v2').as('v2')
}).prefix('/api').guard('jwt')
```

`.as('v1')` et `.as('v2')` séparent les noms des routes (`v1.users.index`, `v2.users.index`). Sans eux, les deux ressources nomment leurs routes `users.index`, et le routeur refuse le même nom sur deux chemins (`E_DUPLICATE_ROUTE_NAME`).

## Domaines

`.domain()` limite une route, ou toutes les routes d'un groupe, à un hôte :

```typescript
router.get('/', [AdminController, 'index']).domain('admin.example.com')

router.group(() => {
  router.get('/dashboard', [TenantController, 'dashboard'])
}).domain(':tenant.example.com')

router.get('/status', [StatusController, 'show']).domain('*.example.com')
```

Un domaine est exact (`admin.example.com`), paramétré (`:tenant.example.com`) ou
joker (`*.example.com`, à toute profondeur). Chaque `:nom` capture exactement
**un** label fait de lettres, chiffres, `-` ou `_`, à n'importe quelle position
(`api.:tenant.example.com`, `:tenant.:region.example.com`) : `a.b.example.com` et
`.example.com` ne désignent aucun tenant. L'hôte est comparé sans son port et
sans tenir compte de la casse.

Le routeur rattache l'hôte de la requête à **un** domaine enregistré avant de
regarder le chemin — un domaine exact d'abord, puis un domaine paramétré, puis un
joker, quel que soit leur ordre d'enregistrement. Quand un domaine correspond,
seules ses routes sont candidates : **aucun repli** vers les routes enregistrées
sans domaine, donc un `/` sans domaine ne peut jamais répondre pour
`admin.example.com`. Quand aucun domaine ne correspond, ou que la requête n'a pas
d'hôte, seules les routes sans domaine le sont.

Les valeurs capturées sont sur `ctx.subdomains` :

```typescript
// acme.example.com/dashboard
async dashboard({ subdomains, response }: HttpContext) {
  response.json({ tenant: subdomains.tenant })   // { tenant: 'acme' }
}
```

`ctx.subdomains` est vide pour une route sans domaine paramétré. Les labels de
l'hôte lui-même sont `ctx.request.subdomains()`. Un paramètre sans nom, ou le
même nom deux fois, lève `E_INVALID_ROUTE_DOMAIN` quand les routes sont validées.

## Les doublons sont refusés

Enregistrer deux fois la même méthode et le même chemin, ou réutiliser un nom de
route pour un chemin différent, lève au lieu d'écraser en silence :

```
E_DUPLICATE_ROUTE       Duplicate route found. "GET: /admin" route already exists.
E_DUPLICATE_ROUTE_NAME  A route with name "users.show" already exists
```

Un écrasement silencieux, c'est ainsi qu'un endpoint authentifié se fait masquer
par une route ultérieure non gardée sur le même chemin — sans rien dans les logs.
Un même nom sur les verbes d'un **seul** chemin reste permis :
`route(['PUT','PATCH'], …)` et `resource().update` sont une seule route logique.

## Matchers

`.where()` contraint un paramètre. Le matcher d'une route **remplace** le matcher
global pour ce paramètre, ce qui permet à une route d'assouplir ce que l'app a
restreint :

```typescript
router.where('id', /^[0-9]+$/)                            // global
router.get('/posts/:id', show).where('id', /^[a-z-]+$/)   // cette route prend des slugs
```

## Paramètres attrape-tout

Un segment `*` avale le reste du chemin, et `params['*']` est le **tableau des
segments** — les joindre effacerait la frontière entre un segment contenant un
`/` encodé et un vrai séparateur :

```typescript
router.get('/assets/*', serve)
// GET /assets/css/main.css → params['*'] === ['css', 'main.css']
```

`request.param('*')` les joint par commodité ; `request.params()` donne le
tableau. Un matcher sur `*` est testé contre **chaque** segment.


### Ce que ça coûte au type de `ctx.params`

Comme un attrape-tout rend un tableau, `ctx.params` est typé
`Record<string, string | string[]>`. La déstructuration idiomatique lit donc une
union et demande un affinage :

```typescript
async show({ params }: HttpContext) {
  await User.find(params.id)        // string | string[] — ne compile pas
}
```

Utilisez `request.param()` plutôt que d'écrire votre propre accesseur. Il rend
`string | undefined`, et joint un attrape-tout
avec `/` :

```typescript
async show({ request }: HttpContext) {
  await User.find(request.param('id'))   // string | undefined
}
```

> **Pourquoi pas `any`.** Un attrape-tout est bien un tableau à l'exécution :
> typer `ctx.params` en `Record<string, any>` ne ferait que le masquer. Le
> type honnête est conservé : une valeur qui peut être un tableau ne doit pas
> être typée comme si elle ne pouvait pas l'être, et une erreur de compilation
> vaut mieux qu'un `.toUpperCase()` sur un tableau en production.

## Builder de route fluide

Chaque enregistrement de route retourne un `RouteBuilder` qui supporte le chaînage complet :

```typescript
router
  .post('/orders', [OrdersController, 'store'])
  .middleware('throttle')        // middleware nommé
  .guard('jwt')                  // guard d'authentification
  .role('admin')                 // exiger un rôle
  .permission('orders:write')    // exiger une permission
  .validate('CreateOrderSchema') // attacher un validateur
  .as('orders.store')            // route nommée
  .where('id', router.matchers.uuid())
```

`.guard('jwt')` nomme les guards qui peuvent répondre de la requête : être
authentifié par un autre ne suffit pas. Une requête déjà authentifiée par l'un
d'eux passe ; sinon le gate appelle `ctx.auth.authenticateUsing(guards)`, comme
`middleware.auth({ guards })`, et le `401` d'un guard (avec sa redirection vers
la connexion ou son challenge `WWW-Authenticate`) fait la réponse. Une requête
authentifiée par session sur une route `.guard('jwt')` est refusée : un
formulaire posté depuis un autre site avec le cookie de session ne peut pas
atteindre un endpoint prévu pour des jetons bearer. Un état d'authentification
qui n'indique pas `authenticatedViaGuard` et n'a pas d'`authenticateUsing` est
refusé lui aussi.

`.guard('jwt', 'web')` accepte l'un ou l'autre guard. Chaque autre déclaration
est un niveau à part : le `.guard()` d'un groupe, celui de chaque groupe
imbriqué, un deuxième appel `.guard()` sur la route et le `@Guard` du
contrôleur. La requête doit être authentifiée par un guard que CHAQUE niveau
nomme. Une requête est authentifiée par un seul guard : un `.guard('web')` de
route dans un groupe `.guard('jwt')` refuse donc toute requête. Le gate
n'authentifie jamais la requête une fois par niveau. Les méthodes RPC (et
leurs groupes, imbriqués compris) appliquent la même règle ; un resolver
GraphQL n'a qu'un niveau.

`.guard()`, `.role()` et `.permission()` doivent nommer au moins un guard, un
rôle ou une permission. Appelés sans argument, ou avec une liste vide
(`.role(...roles)`, `group({ guards: [] })`), ils lèvent
`E_EMPTY_GATE_REQUIREMENT` à la déclaration de la route, au lieu de laisser la
route publique. Il en va de même pour les méthodes et les groupes RPC, pour
`guards` dans `config/rpc.ts`, et pour les options `guards`, `roles` et
`permissions` d'un resolver GraphQL.

`.permission()` vérifie les permissions propres à l'utilisateur authentifié,
telles que la couche d'authentification les résout : quand
`ctx.auth.hasAllPermissions()` existe (l'authentificateur de warden la fournit et
interroge son résolveur de droits), sa réponse décide et une liste `permissions`
périmée dans le payload est ignorée ; sans elle, le gate lit
`ctx.auth.permissions` ou `ctx.auth.user.permissions`.
Quand la requête s'est authentifiée avec un jeton
(`ctx.auth.user.currentAccessToken`), le jeton doit aussi autoriser chaque
permission : un scope de jeton n'accorde jamais une permission que l'utilisateur
n'a pas, et un jeton restreint ne porte pas toutes les permissions de son
utilisateur. Les méthodes RPC et les resolvers GraphQL appliquent la même règle.

### Middleware inline

Attachez une fonction middleware ponctuelle directement à une route avec `.use()` :

```typescript
router.get('/special', [SpecialController, 'index']).use(async (ctx, next) => {
  ctx.store.set('feature-flag', true)
  await next()
})
```

## Raccourcis de route

```typescript
// Rendre une vue (nécessite un provider de vue)
router.on('/').render('home')
router.on('/').render('home', { title: 'Welcome' })

// Redirection permanente ou temporaire
router.on('/old-page').redirect('/new-page')         // 302
router.on('/old-page').redirect('/new-page', 301)    // 301

// Redirection vers une route nommée
router.on('/go').redirectToRoute('users.show', { id: '1' })
```

## Routes de modules

Chaque module déclare ses routes dans `app/modules/<name>/routes.ts`. Ces fichiers sont chargés automatiquement par l'Ignitor lorsque `modules.path` est défini dans `reamrc.ts` :

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  modules: { path: './app/modules' },
})
```

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.group(() => {
  router.resource('tasks', TasksController)
}).prefix('/api/v1').guard('jwt')
```

L'Ignitor parcourt chaque sous-répertoire de `modules.path` et importe le fichier `routes.ts` qu'il y trouve. Aucun enregistrement manuel n'est nécessaire.

## Étapes suivantes
- [Middleware](/fr/guides/basics/middleware) — Middleware serveur, router et nommé
- [Conteneur IoC](/fr/guides/concepts/dependency-injection) — Injection de dépendances et `@inject()`
- [Warden](/fr/guides/auth/introduction) — Authentification et autorisation
