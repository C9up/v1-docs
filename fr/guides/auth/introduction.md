# Introduction

Ce guide couvre l'authentification avec warden :

- Installation
- config/auth.ts
- WardenProvider
- AuthManager
- Stratégies multiples
- Dual-guard : session pour le web, JWT pour l'API

Warden gère les stratégies d'authentification et le contrôle d'accès basé sur les rôles (RBAC). Le coeur est la classe `AuthManager`, qui délègue l'authentification et la vérification des tokens aux stratégies enregistrées. La `JwtStrategy` intégrée couvre le cas d'usage JWT courant. Vous pouvez enregistrer des stratégies supplémentaires (session, jetons d'accès, HTTP Basic) à tout moment. Connecter quelqu'un via un fournisseur extérieur, c'est [Transit](/fr/guides/auth/social/).

## Installation

```bash
npm install @c9up/warden
```

Ou via l'installeur du framework :

```bash
pnpm ream add @c9up/warden
```

L'installeur génère `config/auth.ts` avec des stubs TODO pour
`findUser` et `verifyCredentials` (les deux `throw new Error('TODO …')`).
Une note est aussi écrite sur stderr au moment de l'install listant les
deux stubs — **le login et la vérification JWT échouent au runtime tant
que vous ne les avez pas remplacés**.

---

## config/auth.ts

Warden lit sa configuration depuis `config/auth.ts`. Le fichier est chargé automatiquement par l'Ignitor dans `app.config.get('auth')` pendant la phase d'enregistrement.

```typescript
// config/auth.ts
import env from '#start/env.js'

export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: env.get('JWT_SECRET'), // minimum 32 caractères
    expiresIn: '1h',                 // ou 3600
  },
}
```

Le `secret` doit comporter au moins 32 caractères. La `JwtStrategy` lèvera une erreur à la construction s'il est plus court.

---

## WardenProvider

`WardenProvider` enregistre `AuthManager` comme singleton dans le conteneur. Il lit `config/auth.ts` et construit une stratégie par guard. `ream configure @c9up/warden` écrit la forme à guards — un nom de guard `default` et une map `guards` construite avec les fabriques de guard (`jwtGuard`, `sessionGuard`, `apiKeyGuard`, `basicAuthGuard`) :

```typescript
// config/auth.ts — le fichier qu'écrit `ream configure`
import { defineConfig, jwtGuard } from '@c9up/warden'
import env from '#start/env.js'

export default defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      secret: env.get('JWT_SECRET'),
      // Des secondes, ou une durée : JWT_EXPIRY=1h marche tel quel.
      expiresIn: env.get('JWT_EXPIRY', '1h'),
      // Les deux renvoient un UserPayload ({ id, roles?, permissions? }) ou null.
      findUser: (id) => users.findPayload(id),
      verifyCredentials: (email, password) => users.checkLogin(email, password),
    }),
  },
})
```

La forme par driver est acceptée aussi : `defaultStrategy` plus un bloc par driver (`jwt`, `session`, `apiKey`), chacun transformé en sa stratégie :

```typescript
// config/auth.ts
import { defineConfig } from '@c9up/warden'
import env from '#start/env.js'

export default defineConfig({
  defaultStrategy: 'jwt',
  jwt: {
    secret: env.get('JWT_SECRET'),
    expiresIn: env.get('JWT_EXPIRY', '1h'),
  },
})
```

La durée de vie du jeton est `expiresIn` (des secondes, ou une durée comme `'2h'`) ; `expiresInSeconds` est l'écriture en secondes seulement, et `expiresIn` l'emporte quand les deux sont posés. Le défaut est 3600 secondes. Aucune autre clé, comme `expiry`, n'est lue.

Une config sans guards ni bloc de driver fait lever `E_WARDEN_NO_AUTH_CONFIG` au provider dès le boot.

```typescript
// reamrc.ts
providers: [
  () => import('@c9up/warden/provider'),
]
```

Pour des stratégies personnalisées (session, api-key) ou un câblage supplémentaire, créez votre propre provider :

```typescript
// providers/AuthProvider.ts
import type { AppContext } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class AuthProvider {
  constructor(protected app: AppContext) {}

  register() {
    this.app.container.singleton(AuthManager, () => {
      // Construisez et renvoyez votre propre AuthManager avec les stratégies voulues.
      return new AuthManager({ defaultStrategy: 'jwt', strategies: {} })
    })
  }
}
```

---

## AuthManager

`AuthManager` est la classe centrale. Elle maintient une map de stratégies nommées et expose `authenticate()`, `verify()` et des helpers RBAC.

```typescript
import { AuthManager } from '@c9up/warden'
import type { AuthConfig } from '@c9up/warden'

const auth = new AuthManager({
  defaultStrategy: 'jwt',
  strategies: { jwt: jwtStrategy },
})
```

### authenticate()

Échange des identifiants (email + mot de passe) contre un token. Utilise la stratégie par défaut sauf si vous passez un nom de stratégie.

```typescript
const result = await auth.authenticate({ email: 'user@example.com', password: 'secret' })

if (result.authenticated) {
  // result.user contient id, roles, permissions et token (pour JwtStrategy)
  const token = result.user?.token
  if (typeof token === 'string') {
    // remettre le jeton au client
  }
} else {
  console.error(result.error) // 'Invalid credentials'
}
```

### verify()

Vérifie un token (JWT, ID de session, clé API). Appelle `findUser()` en interne pour s'assurer que l'utilisateur existe toujours.

```typescript
const result = await auth.verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')

if (result.authenticated) {
  console.log(result.user?.id)
} else {
  console.error(result.error) // 'Invalid or expired token'
}

// Utiliser une stratégie spécifique
const result2 = await auth.verify(sessionId, 'session')
```

### registerStrategy()

Ajouter une stratégie à l'exécution :

```typescript
auth.registerStrategy('apiKey', apiKeyStrategy)
auth.getStrategyNames() // ['jwt', 'apiKey']
```

### Helpers RBAC

Les helpers grossiers — `hasRole` / `hasPermission` / `hasAllPermissions` — sont
du sucre **asynchrone** au-dessus de la couche de résolution des droits ci-dessous :
ils consultent `resolve(user, scope)` et ne lisent jamais le payload du token
directement. Chacun accepte un `scope` final optionnel (défaut `'global'`).

```typescript
import { AuthManager, MemoryRightsStore, RightsResolver } from '@c9up/warden'
import type { UserPayload } from '@c9up/warden'

// Seed des rôles → permissions (RBAC) et/ou des grants directs (ACL) dans le store.
const store = new MemoryRightsStore()
  .defineRole('editor', ['posts.create', 'posts.read'])
  .assignRole('user-1', 'editor')

const auth = new AuthManager({
  defaultStrategy: 'jwt',
  strategies: { jwt },
  rights: new RightsResolver(store),
})

const user: UserPayload = { id: 'user-1', roles: ['admin'] }

await auth.hasRole(user, 'admin')          // true — les rôles du payload comptent
await auth.hasRole(user, 'superadmin')     // false

await auth.hasPermission(user, 'posts.create')  // true — dérivé d'un rôle
await auth.hasPermission(user, 'posts.delete')  // false

await auth.hasAllPermissions(user, ['posts.create', 'posts.read'])   // true
await auth.hasAllPermissions(user, ['posts.create', 'posts.delete']) // false

// Multi-tenant : passez un scope (les droits globaux sont hérités par chaque tenant).
await auth.hasPermission(user, 'posts.publish', { tenant: 'acme' })
```

`hasPermission` / `hasAllPermissions` reflètent l'**ensemble résolu** (dérivé des
rôles ∪ grants directs) ; les permissions portées par un payload JWT
(`user.permissions`) ne sont **pas** une entrée d'autorisation. Quand la requête
a été authentifiée avec un jeton (`user.currentAccessToken`, posé par le
[garde à jetons d'accès](/fr/guides/auth/access-tokens-guard#jetons-d-acces) ou par un garde OAuth), le jeton doit
aussi autoriser la permission : la vérification exige la permission de
l'utilisateur **et** la capacité du jeton, jamais l'une ou l'autre. `hasRole` reflète
les rôles du payload ∪ les rôles du store, donc un rôle porté par le token le
satisfait toujours sans configuration de store. Sans resolver `rights` fourni,
`AuthManager` retombe sur un store en mémoire vide — les rôles du payload comptent
toujours, les permissions se résolvent à vide.

Dans une requête, les mêmes questions se posent à `ctx.auth`, sans importer le
manager :

```typescript
await ctx.auth.hasAllPermissions?.(['posts.create', 'posts.read'])    // l'utilisateur connecté
await ctx.auth.hasAllPermissions?.(['posts.publish'], { tenant: 'acme' })
```

L'authenticator par requête de Warden a `hasPermission(permission, scope?)` et
`hasAllPermissions(permissions, scope?)`. Les deux délèguent aux helpers du
manager ci-dessus pour l'utilisateur authentifié, restreint par le jeton avec
lequel la requête est venue ; un invité ne détient rien, pas même une liste
vide. Le type `ctx.auth` de Ream ne déclare que `hasAllPermissions`, et comme
facultative — une application sans Warden n'a pas cette méthode, d'où le `?.`.
Les gates `.permission()` des routes, du RPC et de GraphQL interrogent
`ctx.auth.hasAllPermissions` quand la couche d'authentification la fournit :
une permission accordée par le store de droits les franchit, une permission
présente seulement dans le payload du jeton non.

> **Note de migration.** Les versions précédentes lisaient ces helpers de manière
> **synchrone** directement sur le payload du token. Ils sont désormais `async` et
> adossés au resolver. Les permissions que vous mettiez auparavant dans le token
> JWT/api-key ne sont plus honorées par les vérifications grossières `@Permission` —
> seedez-les plutôt comme rôles ou grants directs dans le rights store.

---

## Stratégies multiples

```typescript
const auth = new AuthManager({
  defaultStrategy: 'jwt',
  strategies: {
    jwt: jwtStrategy,
    apiKey: apiKeyStrategy,
    session: sessionStrategy,
  },
})

// Stratégie par défaut
await auth.authenticate({ email, password })

// Stratégie nommée
await auth.verify(token, 'jwt')
await auth.verify(apiKey, 'apiKey')
await auth.verify(sessionId, 'session')
```

---

## Dual-guard : session pour le web, JWT pour l'API

`AuthManager` tient une **map** de stratégies nommées et en choisit une **par route**, si bien qu'une même app sert une surface web authentifiée par cookie et une API à token Bearer côte à côte. En général, `session` sert le côté **web** et `jwt` (access tokens) le côté **api**.

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'session',          // le fallback quand une route ne nomme aucun guard
  session: { findUser: async (id) => /* … */ null },
  jwt: { secret: process.env.JWT_SECRET, findUser, verifyCredentials },
}
```

```typescript
// routes web/navigateur — cookie envoyé automatiquement, protégé CSRF
router.get('/dashboard', [DashboardController, 'show']).guard('session')
router.get('/download/:id', [FileController, 'download']).guard('session')

// routes API / mobile — Authorization: Bearer <jwt>, immunes au CSRF
router.get('/api/v1/orders', [OrderController, 'index']).guard('jwt')
```

Le cookie part automatiquement sur une navigation `<a href>` simple : un download gardé par `session` **sait qui demande**, sans token à attacher — l'ergonomie qu'une API Bearer-only ne peut pas donner à un lien. Les requêtes Bearer ne portent aucun cookie ambiant, donc elles sont immunes au CSRF ; ce sont les routes cookie/session que le CSRF signé de blackhole protège (ajoute les préfixes d'API Bearer aux `exceptRoutes` de blackhole).

L'enregistrement des stratégies est introspectable à l'exécution — `auth.getStrategyNames()` liste les noms enregistrés et `auth.getStrategy(name)` en retourne une (elle lève pour un nom non enregistré, donc garde avec `getStrategyNames().includes(name)` d'abord) :

```typescript
auth.getStrategyNames()        // ['session', 'jwt']
if (auth.getStrategyNames().includes('session')) {
  const strategy = auth.getStrategy('session')
  // les stratégies session exposent verifyWithContext(unused, { session })
}
```

---

## Prochaines étapes
- [Middleware](/fr/guides/basics/middleware) — Écrire et enregistrer des classes middleware
- [Routing](/fr/guides/basics/routing) — Guards, rôles et permissions au niveau des routes
- [Blackhole (Sécurité)](/fr/guides/security/securing-ssr) — Filtrage des requêtes côté Rust
