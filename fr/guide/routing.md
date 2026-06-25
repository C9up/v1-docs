# Routage

Les routes sont définies comme des effets de bord dans les fichiers de routes des modules. Le singleton du router est importé depuis `@c9up/ream/services/router` et accessible après que l'Ignitor l'a initialisé.

## Définir des routes

### Routes de base

```typescript
import router from '@c9up/ream/services/router'

router.get('/users', async ({ response }) => {
  response.json({ users: [] })
})

router.post('/users', async ({ request, response }) => {
  const data = request.all()
  response.status(201).json({ user: data })
})
```

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

## Contrôleurs

Les contrôleurs sont des classes décorées avec `@inject()`, ce qui les enregistre pour une résolution IoC transiente. Le conteneur résout automatiquement les dépendances du constructeur à chaque requête.

```typescript
// app/modules/user/controllers/UsersController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  async index({ response }: HttpContext) {
    const users = await this.userService.findAll()
    response.json({ data: users })
  }

  async store({ request, response }: HttpContext) {
    const data = request.all()
    const user = await this.userService.create(data)
    response.status(201).json({ data: user })
  }

  async show({ request, response }: HttpContext) {
    const user = await this.userService.findById(request.param('id')!)
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  async update({ request, response }: HttpContext) {
    const user = await this.userService.update(request.param('id')!, request.all())
    response.json({ data: user })
  }

  async destroy({ request, response }: HttpContext) {
    await this.userService.delete(request.param('id')!)
    response.noContent()
  }
}
```

### Associer les contrôleurs aux routes

Utilisez la syntaxe tuple `[ControllerClass, 'methodName']`. Le conteneur instancie le contrôleur et résout ses dépendances à chaque requête :

```typescript
import router from '@c9up/ream/services/router'
import UsersController from './controllers/UsersController.js'

router.get('/users', [UsersController, 'index'])
router.post('/users', [UsersController, 'store'])
router.get('/users/:id', [UsersController, 'show'])
router.put('/users/:id', [UsersController, 'update'])
router.delete('/users/:id', [UsersController, 'destroy'])
```

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

Les routes sont automatiquement nommées (`posts.index`, `posts.store`, `posts.show`, etc.). `resource()` retourne un `GroupBuilder`, vous pouvez donc chaîner un préfixe, des middlewares et des guards :

```typescript
router.resource('posts', PostsController).prefix('/api/v1').guard('jwt')
```

## Groupes de routes

Les groupes appliquent une configuration partagée (préfixe, middleware, guards) à un ensemble de routes. La syntaxe préférée est la forme avec callback fluide :

```typescript
router.group(() => {
  router.get('/users', [UsersController, 'index'])
  router.post('/users', [UsersController, 'store'])
  router.get('/users/:id', [UsersController, 'show'])
}).prefix('/api/v1').middleware('throttle').guard('jwt')
```

La forme héritée avec objet de configuration est également supportée :

```typescript
router.group({ prefix: '/api/v1', guards: ['jwt'] }, (r) => {
  r.get('/users', [UsersController, 'index'])
})
```

Les groupes peuvent être imbriqués :

```typescript
router.group(() => {
  router.group(() => {
    router.resource('users', UsersController)
  }).prefix('/v1')

  router.group(() => {
    router.resource('users', UsersController)
  }).prefix('/v2')
}).prefix('/api').guard('jwt')
```

## Routes nommées

Nommez une route avec `.as()`, puis construisez les URL depuis le nom avec `urlFor` — sans jamais coder les chemins en dur :

```typescript
router.get('/users/:id', [UsersController, 'show']).as('users.show')

const url = router.urlFor('users.show', { id: '42' })
// → /users/42
```

> `router.makeUrl()` est un alias **déprécié** de `urlFor()` (AdonisJS v7 a renommé `makeUrl` → `urlFor`). Préférez `urlFor`.

Les routes de ressource sont nommées automatiquement : `posts.index`, `posts.store`, `posts.show`, `posts.update`, `posts.destroy`.

### URL côté navigateur

Pour construire les mêmes URL côté client, sérialisez la map des routes nommées avec `router.namedManifest()` (seules les routes **nommées** sont exposées — les autres restent privées au serveur) et passez-la au rendu de page ; le `urlFor` isomorphe d'Aurora résout dessus. Voir [Aurora → constructeur d'URL](../modules/aurora.md#constructeur-durl--urlfor).

```typescript
const routes = router.namedManifest()
// → { 'users.show': '/users/:id', ... }
```

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

## Le HttpContext

Chaque gestionnaire et middleware reçoit une instance `HttpContext`. Déstructurez uniquement ce dont vous avez besoin :

```typescript
router.get('/example', async ({ request, response, params, auth, id }: HttpContext) => {
  // request  — Request typé (method, path, params, body, headers, qs)
  // response — builder Response typé (json, send, status, header, redirect, noContent)
  // params   — paramètres de route extraits du modèle d'URL { id: '...' }
  // auth     — { authenticated, user?, roles?, permissions? }
  // id       — identifiant de corrélation (depuis l'en-tête x-request-id ou UUID auto-généré)
})
```

### API Request

```typescript
request.method()            // 'GET' | 'POST' | ...
request.path()              // '/users/42'
request.url()               // '/users/42?page=1'
request.param('id')         // Paramètre de route
request.qs()                // Chaîne de requête analysée en objet
request.input('name')       // Valeur unique depuis le corps ou la qs
request.all()               // Corps + qs fusionnés
request.only(['name', 'email'])
request.except(['password'])
request.header('authorization')
request.ip()
request.is(['json'])        // Vérification du Content-type
request.accepts(['json'])   // Négociation de l'en-tête Accept
```

### API Response

```typescript
response.json({ data })             // Définit le content-type et sérialise
response.send('Hello')              // Détecte automatiquement le content-type
response.status(201).json({ data }) // Status chaînable
response.noContent()                // 204 No Content
response.header('x-trace', id)      // Définir un en-tête
response.type('application/xml')    // Définir le content-type
response.cookie('session', token, { httpOnly: true, maxAge: 3600 })
response.redirect().toPath('/login')
response.redirect().status(301).toPath('/new')
response.redirect().toRoute('users.show', { id: '1' })
```

## Étapes suivantes

- [Middleware](/fr/guide/middleware) — Middleware serveur, router et nommé
- [Conteneur IoC](/fr/guide/container) — Injection de dépendances et `@inject()`
- [Warden](/fr/modules/warden) — Authentification et autorisation
