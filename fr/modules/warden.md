# Warden — Authentification

Warden gère les stratégies d'authentification et le contrôle d'accès basé sur les rôles (RBAC). Le coeur est la classe `AuthManager`, qui délègue l'authentification et la vérification des tokens aux stratégies enregistrées. La `JwtStrategy` intégrée couvre le cas d'usage JWT courant. Vous pouvez enregistrer des stratégies supplémentaires (session, clé API, OAuth) à tout moment.

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
export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET!, // minimum 32 caractères
    expiresInSeconds: 3600,          // 1 heure
  },
}
```

Le `secret` doit comporter au moins 32 caractères. La `JwtStrategy` lèvera une erreur à la construction s'il est plus court.

---

## WardenProvider

`WardenProvider` enregistre `AuthManager` comme singleton dans le conteneur. Il lit `config/auth.ts` afin que le manager soit disponible pour les middlewares et les contrôleurs via l'injection.

Le provider intégré enregistre un `AuthManager` vide (sans stratégies). Enregistrez votre propre provider dans `providers/AppProvider.ts` pour câbler les stratégies :

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'
import { JwtStrategy } from '@c9up/warden'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton(AuthManager, () => {
      const config = this.app.config.get<{
        defaultStrategy: string
        jwt: { secret: string; expiresInSeconds: number }
      }>('auth')!

      const jwt = new JwtStrategy({
        secret: config.jwt.secret,
        expiresInSeconds: config.jwt.expiresInSeconds,
        verifyCredentials: async (email, password) => {
          // Recherche de l'utilisateur et vérification du mot de passe
          const user = await UserService.findByEmail(email)
          if (!user || !await user.verifyPassword(password)) return null
          return { id: user.id, roles: user.roles, permissions: user.permissions }
        },
        findUser: async (id) => {
          const user = await UserService.findById(id)
          if (!user) return null
          return { id: user.id, roles: user.roles, permissions: user.permissions }
        },
      })

      return new AuthManager({
        defaultStrategy: config.defaultStrategy,
        strategies: { jwt },
      })
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
  const { token } = result.user as { token: string }
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

```typescript
import type { UserPayload } from '@c9up/warden'

const user: UserPayload = {
  id: 'user-1',
  roles: ['admin', 'editor'],
  permissions: ['posts.create', 'posts.read'],
}

auth.hasRole(user, 'admin')        // true
auth.hasRole(user, 'superadmin')   // false

auth.hasPermission(user, 'posts.create')  // true
auth.hasPermission(user, 'posts.delete')  // false

auth.hasAllPermissions(user, ['posts.create', 'posts.read'])   // true
auth.hasAllPermissions(user, ['posts.create', 'posts.delete']) // false
```

---

## JwtStrategy

`JwtStrategy` est l'implémentation JWT intégrée utilisant HMAC-SHA256 (HS256). Elle gère la signature des tokens, leur vérification et la recherche des utilisateurs.

### Configuration

```typescript
import { JwtStrategy } from '@c9up/warden'

const jwt = new JwtStrategy({
  // Obligatoire : minimum 32 caractères, lève une erreur à la construction si plus court
  secret: process.env.JWT_SECRET!,

  // Optionnel : durée de vie du token en secondes (par défaut : 3600)
  expiresInSeconds: 7200,

  // Appelé par authenticate() — vérifie email/mot de passe, retourne UserPayload ou null
  verifyCredentials: async (email, password) => {
    const user = await db.users.findByEmail(email)
    if (!user || !await verifyPassword(password, user.passwordHash)) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },

  // Appelé par verify() — charge l'utilisateur par ID depuis la claim `sub` du token
  findUser: async (id) => {
    const user = await db.users.findById(id)
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

### signToken()

Signe un token pour un `UserPayload` existant sans passer par `authenticate()`. Utile pour l'usurpation d'identité, les tokens de rafraîchissement ou les helpers de test.

```typescript
const token = jwt.signToken({
  id: 'user-1',
  roles: ['admin'],
  permissions: ['posts.create'],
})
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Payload du token

Le payload JWT contient toujours :

| Claim | Description |
|---|---|
| `sub` | ID de l'utilisateur (`user.id`) |
| `roles` | Tableau de rôles (optionnel) |
| `permissions` | Tableau de permissions (optionnel) |
| `iat` | Horodatage d'émission (secondes Unix) |
| `exp` | Horodatage d'expiration (secondes Unix) |

### generateJwtSecret()

Génère un secret aléatoire de 48 octets cryptographiquement sûr encodé en base64url — sûr à stocker dans `.env` :

```typescript
import { generateJwtSecret } from '@c9up/warden'

console.log(generateJwtSecret())
// 'wX3hK2qP9rZmYnLsVbTuCjEoAiDfGkNpQeRwXyZa1B2C3...'
```

---

## SessionStrategy

`SessionStrategy` est la stratégie cookie/session intégrée. Elle stocke l'`id` de l'utilisateur authentifié dans un store de session **après** que l'appelant ait vérifié le mot de passe — Warden ne hash et ne vérifie jamais de mot de passe lui-même.

```typescript
import { SessionStrategy } from '@c9up/warden'

const strategy = new SessionStrategy({
  // Optionnel : clé de session (défaut : 'auth_user_id')
  sessionKey: 'auth_user_id',

  // Appelée par verifyWithContext() — charge l'utilisateur via l'id en session.
  // `id` est `string | number` (le type stocké au moment du login).
  findUser: async (id: string | number) => {
    const user = await db.users.findById(String(id))
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

### login() / logout() / verifyWithContext()

`SessionStrategy.authenticate()` est volontairement un no-op — elle lève une erreur pour rendre le contrat explicite. Appelez `login(user, session)` après avoir vérifié le mot de passe vous-même, puis `verifyWithContext(unused, { session })` sur les requêtes suivantes :

```typescript
import { Hash } from '@c9up/sigil'

const hash = new Hash({
  default: 'argon2',
  drivers: { argon2: { driver: 'argon2' } },
})

// Flux de login — l'appelant vérifie le mot de passe, Warden mintie la session
const user = await db.users.findByEmail(email)
const ok = user ? await hash.verify(password, user.passwordHash) : false
if (!ok) throw new E_UNAUTHORIZED('Identifiants invalides')

await strategy.login({ id: user.id, roles: user.roles }, ctx.session)

// Requêtes suivantes
const result = await strategy.verifyWithContext('unused', { session: ctx.session })
if (result.authenticated) ctx.auth = { authenticated: true, user: result.user!, roles: result.user!.roles ?? [], permissions: result.user!.permissions ?? [] }

// Logout
await strategy.logout(ctx.session)
```

L'interface `SessionStore` est volontairement minimale — `get(key)`, `set(key, value)`, `forget(key)`. Branchez n'importe quel backend de session (cookie, Redis, en mémoire) qui s'y conforme.

---

## Hachage de mot de passe

**Warden ne hash pas les mots de passe.** Utilisez [`@c9up/sigil`](/fr/modules/sigil) — le service canonique de hachage de mot de passe pour l'écosystème Ream.

| Préoccupation | Où ça vit |
|---|---|
| `Hash.make(password)` / `Hash.verify(password, hash)` | `@c9up/sigil` (Rust NAPI : argon2id, bcrypt, scrypt) |
| Stockage de session après login réussi | `@c9up/warden` `SessionStrategy.login(user, session)` |
| Signature / vérification JWT | `@c9up/warden` `JwtStrategy` (HMAC-SHA256 via warden NAPI) |
| Primitives stdlib HMAC + random + constant-time-eq | `@c9up/ream/crypto` |

Le découpage est délibéré (story 40.1, architecture.md « Hashing authority »). `SessionStrategy.authenticate()` lève volontairement une erreur pour que la frontière de design soit incontournable : les appelants vérifient les credentials avec Sigil, Warden suit la session.

Les quatre méthodes de l'interface `NativeWarden.hashPassword*` (`hashPasswordArgon2`, `verifyPasswordArgon2`, `hashPasswordBcrypt`, `verifyPasswordBcrypt`) ont été retirées de la surface TS dans la story 40.3 — c'était du code mort sans aucun appelant dans le workspace. Le crate Rust sous-jacent (`warden-engine` `argon2_hash` + `bcrypt_hash`) et les quatre bindings NAPI restent embarqués dans l'artefact `.node` prébuild ; leur nettoyage est planifié pour une story de durcissement à venir.

---

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
      authenticated: true,
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

1. Si la route possède un guard, un rôle ou une permission quelconque et que `ctx.auth.authenticated` est `false` — lève `E_UNAUTHORIZED`.
2. Si la route exige des rôles et que `ctx.auth.roles` n'en contient aucun — lève `E_FORBIDDEN`.
3. Si la route exige des permissions et que `ctx.auth.permissions` ne les contient pas toutes — lève `E_FORBIDDEN`.

Les guards sont appliqués par le pipeline de middlewares, pas par Warden directement. `ctx.auth` doit être peuplé avant l'exécution de la vérification du guard — c'est le rôle du middleware d'authentification.

---

## E_UNAUTHORIZED et E_FORBIDDEN

Les deux exceptions sont définies dans `@c9up/ream` et gèrent elles-mêmes leurs réponses HTTP :

```typescript
import { E_UNAUTHORIZED, E_FORBIDDEN } from '@c9up/ream'

// 401 — levée quand ctx.auth.authenticated est false
throw new E_UNAUTHORIZED('Bearer token required')
// Réponse : { "error": { "code": "E_UNAUTHORIZED", "message": "Bearer token required" } }

// 403 — levée quand les rôles ou permissions sont insuffisants
throw new E_FORBIDDEN('Insufficient permissions', ['posts.create'])
// Réponse : { "error": { "code": "E_FORBIDDEN", "message": "Insufficient permissions", "required": ["posts.create"] } }
```

Vous pouvez lever ces exceptions manuellement dans vos propres middlewares ou contrôleurs — le gestionnaire global d'exceptions les traitera.

---

## Décorateurs (métadonnées au niveau du contrôleur)

`@Guard()`, `@Role()` et `@Permission()` sont des décorateurs de méthode qui attachent des métadonnées via `reflect-metadata`. Ils n'appliquent rien par eux-mêmes — ils sont lus par les outils d'inspection de routes (Forge, générateurs OpenAPI). Pour une application effective au moment de la requête, utilisez les méthodes fluides `.guard()`, `.role()`, `.permission()` du router ou le middleware d'authentification.

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

---

## Stratégies personnalisées

Implémentez l'interface `AuthStrategy` pour ajouter votre propre stratégie :

```typescript
import type { AuthStrategy, AuthResult } from '@c9up/warden'

const apiKeyStrategy: AuthStrategy = {
  name: 'apiKey',

  async authenticate(credentials): Promise<AuthResult> {
    // Non utilisé pour l'auth par clé API
    return { authenticated: false, error: 'Use verify() with an API key' }
  },

  async verify(key): Promise<AuthResult> {
    const user = await db.apiKeys.findUser(key)
    if (!user) return { authenticated: false, error: 'Invalid API key' }
    return { authenticated: true, user: { id: user.id, roles: user.roles } }
  },
}

auth.registerStrategy('apiKey', apiKeyStrategy)

// Utilisez-la sur le middleware d'une route spécifique ou en passant le nom de la stratégie :
const result = await auth.verify(apiKey, 'apiKey')
```

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

## Types

```typescript
interface AuthStrategy {
  name: string
  authenticate(credentials: Record<string, unknown>): Promise<AuthResult>
  verify(token: string): Promise<AuthResult>
}

interface AuthResult {
  authenticated: boolean
  user?: UserPayload
  error?: string
}

interface UserPayload {
  id: string
  roles?: string[]
  permissions?: string[]
  [key: string]: unknown
}

interface AuthConfig {
  defaultStrategy: string
  strategies: Record<string, AuthStrategy>
}

interface JwtStrategyConfig {
  secret: string
  expiresInSeconds?: number
  verifyCredentials: (email: string, password: string) => Promise<UserPayload | null>
  findUser: (id: string) => Promise<UserPayload | null>
}
```

---

## Codes d'erreur

| Code | Levé quand |
|---|---|
| `WARDEN_INVALID_CONFIG` | `defaultStrategy` n'est pas présent dans `strategies` |
| `WARDEN_STRATEGY_NOT_FOUND` | `getStrategy()` ou `verify()` appelé avec un nom de stratégie non enregistré |

---

## Prochaines étapes

- [Middleware](/fr/guide/middleware) — Écrire et enregistrer des classes middleware
- [Routing](/fr/guide/routing) — Guards, rôles et permissions au niveau des routes
- [Blackhole (Sécurité)](/fr/modules/blackhole) — Filtrage des requêtes côté Rust
