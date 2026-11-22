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
    const id = request.param('id')
    const user = id ? await this.userService.findById(id) : null
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  async update({ request, response }: HttpContext) {
    const id = request.param('id')
    if (!id) return response.status(404).json({ error: 'Not found' })
    const user = await this.userService.update(id, request.all())
    response.json({ data: user })
  }

  async destroy({ request, response }: HttpContext) {
    const id = request.param('id')
    if (!id) return response.status(404).json({ error: 'Not found' })
    await this.userService.delete(id)
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

## Routes nommées

Nommez une route avec `.as()`, puis construisez les URL depuis le nom avec `urlFor` — sans jamais coder les chemins en dur :

```typescript
router.get('/users/:id', [UsersController, 'show']).as('users.show')

const url = router.urlFor('users.show', { id: '42' })
// → /users/42
```

> `router.makeUrl()` est un alias **déprécié** de `urlFor()`. Préférez `urlFor`.

Les routes de ressource sont nommées automatiquement : `posts.index`, `posts.store`, `posts.show`, `posts.update`, `posts.destroy`.

### Construire une URL morceau par morceau

`urlFor` prend tout d'un coup. Quand les morceaux arrivent séparément — les
params ici, une query string là, un préfixe venu de la config —
`router.builder()` est la forme fluide :

```typescript
router.builder().params({ id: '42' }).qs({ tab: 'posts' }).make('users.show')
// → /users/42?tab=posts

router.builderForDomain('https://acme.test').params({ id: '42' }).make('users.show')
// → https://acme.test/users/42

router.builder().prefixUrl('https://acme.test').makeSigned('invite', { expiresIn: '1h' })
// signée, avec la query string intégrée à la signature

router.builder().disableRouteLookup().make('/un/chemin/litteral')
```

Il s'appuie sur `urlFor` et `makeSignedUrl` : un param manquant échoue de la
même façon quelle que soit l'écriture choisie.

### Inspecter la table de routes

```typescript
router.toJSON()        // { root: [...routes], 'blog.example.com': [...] }
router.usingDomains    // une route est-elle scopée à un domaine ?
router.parsePattern('/posts/:id?')   // [{ name: 'id', optional: true }]
router.commit()        // construire l'index maintenant, pas à la 1re requête
router.commited        // est-il construit ?
```

`toJSON()` groupe par domaine servi, avec `root` pour celles qui répondent
partout — ce que lit une liste de routes, un générateur OpenAPI ou un écran de
debug.

### URL côté navigateur

Pour construire les mêmes URL côté client, sérialisez la map des routes nommées avec `router.namedManifest()` (seules les routes **nommées** sont exposées — les autres restent privées au serveur) et passez-la au rendu de page ; le `urlFor` isomorphe d'Aurora résout dessus. Voir [Aurora → constructeur d'URL](../modules/aurora.md#constructeur-d-url-—-urlfor).

```typescript
const routes = router.namedManifest()
// → { 'users.show': '/users/:id', ... }
```

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

Utilise `request.param()` plutôt que d'écrire ton propre accesseur. Il rend
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
refusé lui aussi. Plusieurs guards — ceux de la route, de son groupe et du
`@Guard` du contrôleur — forment une seule liste : n'importe lequel peut
authentifier. Les méthodes RPC et les resolvers GraphQL appliquent la même
vérification.

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

## WebSockets

`router.ws()` déclare une route qui accepte des connexions WebSocket. C'est une
route GET comme une autre — elle prend `.as()`, `.use()`, `.middleware()`, les
groupes et les préfixes — et son handler reçoit le contexte avec un `socket` :

```typescript
router.ws('/chat/:room', ({ socket, params, auth }) => {
  socket.send(JSON.stringify({ joined: params.room }))
  socket.on('message', (data, isBinary) => {
    // data : une chaîne pour un message texte, un Uint8Array pour un binaire
  })
  socket.on('close', (code, reason) => {})
}).use(middleware.auth())
```

Les middlewares et les gardes s'exécutent sur la **poignée de main**, avant
qu'aucun socket n'existe : un client que le middleware d'auth refuse reçoit son
`401` en HTTP ordinaire et n'obtient jamais de connexion ouverte. C'est seulement
quand le handler est atteint que la requête reçoit `101 Switching Protocols`. Un
simple GET sur le même chemin reçoit `426` avec `Upgrade: websocket` ; un handler
qui lève une erreur répond comme toute autre route, et aucun socket ne s'ouvre.

Branche les écouteurs dans le handler : des messages peuvent arriver dès que la
poignée de main est finie, et un message sans écouteur `message` est perdu.

| Sur `socket` | |
|---|---|
| `send(data)` | Une chaîne part en texte, un `Uint8Array` en binaire. `false` quand le socket se ferme, ou quand le message ferait passer l'arriéré du client au-delà de `maxBufferedBytes` — la connexion est alors fermée avec `1013` plutôt que de mettre en mémoire pour un client qui ne lit pas. |
| `close(code?, reason?)` | Ferme une fois écrit ce qui est en file. `code` vaut `1000` (défaut), `1001`–`1014` ou `3000`–`4999` ; `reason` fait au plus 123 octets. |
| `on('message' \| 'close', listener)`, `off(...)` | Un écouteur qui lève une erreur est signalé, jamais autorisé à faire tomber le process. |
| `closed` | Une promesse de `{ code, reason }` : le code de fermeture du client, celui du serveur, ou `1006` quand la connexion a coupé. |
| `bufferedAmount`, `readyState` | Octets en attente pour le client ; `open`, `closing` ou `closed`. |
| `acceptProtocol(name)`, `protocol`, `offeredProtocols` | Choisir, dans le handler, un des sous-protocoles proposés par le client (`Sec-WebSocket-Protocol`). |

Avant que ton code ne tourne, le serveur refuse de lui-même une poignée de main
mal formée (`400`), une version de WebSocket autre que 13 (`426`) et un `Origin`
de navigateur qu'il n'autorise pas (`403`). Un navigateur envoie les cookies du
site avec une poignée de main WebSocket depuis n'importe quelle page, et les
WebSockets ne sont pas couverts par la politique de même origine : par défaut,
seule l'origine de la requête elle-même est acceptée. Les autres origines se
listent dans `config/app.ts`, avec les limites des connexions (voir
[Configuration](/fr/guide/configuration)).

Le WebSocket sur HTTP/2 (RFC 8441) n'est pas proposé : les navigateurs ouvrent
leurs WebSockets en HTTP/1.1. La compression `permessage-deflate` n'est pas
négociée.

### Tester une route WebSocket

`TestClient.ws()` ouvre un socket sur l'application démarrée, avec les en-têtes
par défaut du client. Les messages attendent qu'un test les lise ; une poignée
de main refusée rejette avec `WebSocketRefused`, qui porte le statut.

```typescript
import { WebSocketRefused } from '@c9up/ream/testing'

const socket = await client.ws('/chat/general', { headers: { cookie } })
socket.send('hi')
expect(await socket.next()).toBe('hi')
socket.close()

await expect(client.ws('/chat/general')).rejects.toBeInstanceOf(WebSocketRefused)
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
  // auth     — { isAuthenticated, user?, roles?, permissions? }
  // id       — identifiant de corrélation (depuis l'en-tête x-request-id ou UUID auto-généré)
  // subdomains — ce que le domaine de la route a capturé { tenant: 'acme' } (voir Domaines)
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

Le corps derrière `input()`, `all()`, `only()`, `except()` et `body()` est ce que le body parser a produit : enregistrez `@c9up/ream/bodyparser_middleware` (voir [Envoi de fichiers](/fr/guide/file-uploads#activer-le-parser)), sinon ces méthodes ne voient que `{}` plus la chaîne de requête.

#### Derrière un reverse proxy

`request.ip()`, `request.ips()`, `request.protocol()` / `request.secure()` et
`request.host()` ne croient `X-Forwarded-For`, `X-Forwarded-Proto` et
`X-Forwarded-Host` que si la connexion vient d'un proxy déclaré avec
`server.trustedProxies()`. La liste est vide par défaut : les en-têtes sont
ignorés, et un client qui atteint directement le port de l'app ne peut pas les
choisir.

```typescript
// start/kernel.ts
server.trustedProxies(['10.0.0.0/8'])   // ou 'loopback', 'uniquelocal', '*'
```

`request.ips()` est la chaîne de confiance, du saut le plus proche au plus
lointain : le proxy qui s'est connecté, puis chaque adresse transmise dont un
proxy de confiance s'est porté garant. Sa dernière entrée est `request.ip()`.
Une connexion TLS est toujours `https`. Ce qui compte, c'est le pair qui s'est
connecté : le `X-Forwarded-Proto` et le `X-Forwarded-Host` d'un proxy de
confiance sont pris en compte, qu'il envoie aussi `X-Forwarded-For` ou non.

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
