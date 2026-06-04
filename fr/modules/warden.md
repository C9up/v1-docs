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
rôles ∪ grants directs) ; les permissions portées par le token JWT/api-key
(`user.permissions`) ne sont **pas** une entrée d'autorisation. `hasRole` reflète
les rôles du payload ∪ les rôles du store, donc un rôle porté par le token le
satisfait toujours sans configuration de store. Sans resolver `rights` fourni,
`AuthManager` retombe sur un store en mémoire vide — les rôles du payload comptent
toujours, les permissions se résolvent à vide.

> **Note de migration.** Les versions précédentes lisaient ces helpers de manière
> **synchrone** directement sur le payload du token. Ils sont désormais `async` et
> adossés au resolver. Les permissions que vous mettiez auparavant dans le token
> JWT/api-key ne sont plus honorées par les vérifications grossières `@Permission` —
> seedez-les plutôt comme rôles ou grants directs dans le rights store. Le chemin
> scope api-key → grant est complété dans une story ultérieure.

---

## Résolution des droits (RBAC + ACL)

Les `Helpers RBAC` ci-dessus sont du sucre au-dessus de cette couche — ils
consultent `resolve(user, scope)` plutôt que de lire le payload du token. Voici le
modèle plus riche en dessous : les rôles donnent des permissions (RBAC) et chaque
utilisateur peut recevoir des permissions accordées directement (ACL), le tout
indexé par portée (scope). Un seul appel — `resolve(user, scope)` — renvoie les
**permissions effectives** d'un utilisateur, et toute vérification d'autorisation
(helpers grossiers, gate du middleware, et évaluation par policies) consulte ce
point unique.

C'est la **Couche 1** du modèle d'autorisation de Warden : les données et leur
résolution. La couche d'évaluation par policies (un `allows` / `denies` /
`authorize` de forme Bouncer) se construit par-dessus et est documentée
séparément.

### Scope

```typescript
import type { Scope } from '@c9up/warden'

const global: Scope = 'global'          // la portée mono-tenant implicite
const tenant: Scope = { tenant: 'acme' } // une portée tenant
```

Les applications mono-tenant ne passent jamais de scope et opèrent toujours en
`'global'`. Les applications multi-tenant passent `{ tenant }`. **Les droits de
portée globale sont hérités dans chaque portée tenant** : un utilisateur
`admin` en `'global'` est admin dans tous les tenants, tandis qu'un droit
accordé dans `{ tenant: 'acme' }` ne s'applique qu'à l'intérieur d'`acme`.

`scopeKey(scope)` renvoie la clé string stable qu'un store utilise en interne
(`'global'` → `'global'`, `{ tenant: 'acme' }` → `'tenant:acme'`).

### RightsStore + MemoryRightsStore

`RightsStore` est le contrat en lecture seule dont dépend le resolver :

```typescript
interface RightsStore {
  rolePermissions(role: string, scope: Scope): Promise<readonly string[]>
  userRoles(userId: string, scope: Scope): Promise<readonly string[]>
  userGrants(userId: string, scope: Scope): Promise<readonly string[]>
}
```

`MemoryRightsStore` est le driver en mémoire fourni. Il implémente le contrat
en lecture et ajoute des méthodes de seeding chaînables pour le boot et les
tests :

```typescript
import { MemoryRightsStore } from '@c9up/warden'

const rights = new MemoryRightsStore()
  .defineRole('editor', ['post.edit', 'post.view'])
  .defineRole('admin', ['tenant.manage'])
  .assignRole('user-1', 'editor')         // portée 'global' par défaut
  .assignRole('user-1', 'admin', { tenant: 'acme' })
  .grant('user-1', 'post.delete')         // permission ACL directe

rights.revoke('user-1', 'post.delete')    // retire une permission directe
```

`defineRole` / `assignRole` / `grant` / `revoke` prennent chacune une portée
`scope` optionnelle en dernier argument (défaut `'global'`) et renvoient `this`
pour le chaînage. Elles font partie du driver en mémoire, pas du contrat
`RightsStore`.

### RightsResolver

```typescript
import { RightsResolver } from '@c9up/warden'

const resolver = new RightsResolver(rights)

const eff = await resolver.resolve(user)                  // portée 'global'
const inAcme = await resolver.resolve(user, { tenant: 'acme' })
```

`resolve(user, scope?)` renvoie `EffectivePermissions` :

```typescript
interface EffectivePermissions {
  has(permission: string): boolean
  hasAll(permissions: readonly string[]): boolean   // liste vide ⇒ true
  hasAny(permissions: readonly string[]): boolean   // liste vide ⇒ false
  readonly permissions: ReadonlySet<string>
  readonly roles: ReadonlySet<string>
  readonly scope: Scope
}

eff.has('post.edit')                 // true
eff.hasAll(['post.edit', 'post.view']) // true
eff.hasAny(['post.publish'])         // false
```

Règles de résolution :

- **Rôles** = rôles portés par le payload (`user.roles`) **∪** rôles assignés
  dans le store. Les applications JWT stateless qui mettent les rôles dans le
  token continuent de fonctionner ; les applications multi-tenant ajoutent des
  assignations par tenant dans le store.
- **Permissions** = les permissions de chaque rôle résolu **∪** les permissions
  directes de l'utilisateur (ACL). Le champ `user.permissions` du payload n'est
  **pas** une entrée — les permissions sont dérivées du modèle de droits,
  jamais affirmées par le token.
- **Fail-closed** : un rôle inconnu ne contribue rien, un utilisateur sans rôle
  ni permission résout à un ensemble vide, et `resolve()` ne lève jamais
  d'erreur sur des données absentes.
- Les permissions et les rôles sont comparés par **égalité exacte de chaîne** —
  pas d'expansion de wildcard ni de hiérarchie de rôles.

### Adapter base de données

Aucun driver base de données n'est fourni : un `RightsStore` adossé à une base
est un adapter à copier que vous implémentez sur vos propres tables Atlas, afin
que le package reste sans dépendance. Le contrat se résume à trois méthodes de
lecture :

```typescript
class AtlasRightsStore implements RightsStore {
  constructor(private readonly db: Database) {}

  async rolePermissions(role: string, scope: Scope): Promise<readonly string[]> {
    const rows = await this.db.query(
      'SELECT permission FROM role_permissions WHERE role = ? AND scope = ?',
      [role, scopeKey(scope)],
    )
    return rows.map((r) => r.permission)
  }

  async userRoles(userId: string, scope: Scope): Promise<readonly string[]> {
    const rows = await this.db.query(
      'SELECT role FROM user_roles WHERE user_id = ? AND scope = ?',
      [userId, scopeKey(scope)],
    )
    return rows.map((r) => r.role)
  }

  async userGrants(userId: string, scope: Scope): Promise<readonly string[]> {
    const rows = await this.db.query(
      'SELECT permission FROM user_grants WHERE user_id = ? AND scope = ?',
      [userId, scopeKey(scope)],
    )
    return rows.map((r) => r.permission)
  }
}
```

Le seeding (écriture des rôles et permissions) est la responsabilité de
l'adapter — typiquement des migrations ou une interface d'administration — et
reste délibérément hors du contrat de lecture.

---

## Autorisation (évaluation façon Bouncer)

L'autorisation de Warden tient en deux couches. La couche 1 — la **Résolution
des droits** ci-dessus — répond à *quelles permissions possède cet
utilisateur ?*. La couche 2 — le **Bouncer** — répond à *cet utilisateur a-t-il
le droit de faire ceci ?*, avec une surface fidèle à AdonisJS Bouncer : des
abilities autonomes, des policies basées sur des classes avec des hooks
`before` / `after`, les décorateurs `@allowGuest` / `@action`, un type valeur
`AuthorizationResponse`, et les quatre verbes `allows` / `denies` / `authorize`
/ `execute`.

Les exemples d'abilities autonomes ci-dessous écrivent leurs prédicats
directement sur `(user, resource)`, exactement comme le fait Adonis. Les deux
couches se connectent via les **policies** : un Bouncer peut porter un scope + un
resolver de couche 1, et une policy lit alors les permissions résolues via
`this.permissions` — voir **Scope multi-tenant** ci-dessous.

### Abilities

Une ability est une vérification nommée unique. `Bouncer.ability` renvoie une
référence opaque utilisable par référence ou enregistrable par nom. Un invité
(un utilisateur `null`) est **refusé par défaut** sans que le callback ne soit
exécuté — passez `{ allowGuest: true }` pour l'autoriser explicitement.

```ts
import { Bouncer } from "@c9up/warden";

const editPost = Bouncer.ability(
  (user, post: { authorId: string }) => user.id === post.authorId,
);

// Autoriser un invité explicitement :
const viewPublic = Bouncer.ability(
  { allowGuest: true },
  (user, post: { published: boolean }) => post.published || user !== null,
);

const bouncer = new Bouncer(currentUser); // currentUser: UserPayload | null
await bouncer.allows(editPost, post); // Promise<boolean>
```

### Les quatre verbes

```ts
await bouncer.allows(editPost, post); // Promise<boolean> — ne lève jamais
await bouncer.denies(editPost, post); // Promise<boolean> — !allows
await bouncer.execute(editPost, post); // Promise<AuthorizationResponse>
await bouncer.authorize(editPost, post); // résout si autorisé, lève si refusé
```

`allows` / `denies` ne lèvent jamais — un refus vaut `false`. `execute` renvoie
la réponse complète `AuthorizationResponse` (`authorized`, `message`, `status`).
`authorize` résout à `void` si autorisé et lève `WARDEN_AUTHORIZATION_FAILURE`
si refusé (le mapping vers HTTP 403 arrive dans la story d'intégration HTTP).

Les abilities peuvent être enregistrées par nom et vérifiées des deux façons —
les deux produisent des résultats identiques :

```ts
const bouncer = new Bouncer(currentUser, { editPost });
await bouncer.allows("editPost", post);
```

### AuthorizationResponse

Un prédicat peut renvoyer un `boolean` (sucre pour allow / deny) ou un
`AuthorizationResponse` explicite portant un message et un statut personnalisés :

```ts
import { AuthorizationResponse } from "@c9up/warden";

AuthorizationResponse.allow(); // { authorized: true }
AuthorizationResponse.deny(); // { authorized: false, status: 403 }
AuthorizationResponse.deny("Post introuvable", 404); // message + statut personnalisés
```

### Policies

Regroupez les vérifications d'une ressource dans une classe étendant
`BasePolicy`. Les méthodes d'action sont positionnelles `(user, resource)` ;
décorez une méthode avec `@allowGuest()` (≡ `@action({ allowGuest: true })`)
pour qu'un invité puisse l'atteindre.

```ts
import { BasePolicy, allowGuest } from "@c9up/warden";

class PostPolicy extends BasePolicy {
  edit(user, post: Post) {
    return user.id === post.authorId;
  }

  @allowGuest()
  view(user, post: Post) {
    return post.published || user !== null;
  }
}

const bouncer = new Bouncer(currentUser);
await bouncer.with(PostPolicy).allows("edit", post);
await bouncer.with(PostPolicy).authorize("edit", post);
```

`with` accepte la classe de policy directement, ou un nom lorsque les policies
sont enregistrées : `new Bouncer(user, abilities, { Post: PostPolicy })` →
`bouncer.with("Post")`. Une instance de policy fraîche est construite à chaque
vérification.

### Hooks before / after

Les hooks optionnels `before` et `after` s'exécutent autour de chaque action
dans l'ordre Adonis — **before → refus-invité → action → after** :

- `before(user, action, ...args)` s'exécute en premier. Un retour
  non-`undefined` court-circuite l'action (c'est ainsi que fonctionnent un
  bypass de modérateur, ou un `deny("introuvable", 404)` précoce — y compris
  pour un invité).
- la règle de refus-invité ne s'applique que si `before` n'a rien renvoyé.
- `after(user, action, response)` s'exécute en dernier. Un retour non-`undefined`
  remplace la réponse ; `undefined` la conserve.

```ts
class PostPolicy extends BasePolicy {
  before(user) {
    if (user?.roles?.includes("admin")) return true; // les modérateurs bypassent
    return undefined;
  }

  delete(user, post: Post) {
    return user.id === post.authorId;
  }
}
```

### Scope multi-tenant

Un Bouncer porte un **scope** actif — `"global"` (le défaut implicite
mono-tenant) ou `{ tenant: string }`. Passez-le, avec un resolver de couche 1
optionnel, comme 4ᵉ argument du constructeur :

```ts
import { Bouncer, RightsResolver } from "@c9up/warden";

const resolver = new RightsResolver(store); // store: RightsStore
const bouncer = new Bouncer(currentUser, abilities, policies, {
  scope: { tenant: "acme" },
  resolver,
});

bouncer.scope; // { tenant: "acme" }
```

À l'intérieur d'une policy, deux membres protégés exposent le contexte actif :

- `this.scope` — le scope du Bouncer (`"global"` si aucun n'a été fourni).
- `this.permissions` — les `EffectivePermissions` résolues pour `(user, scope)`
  (dérivées des rôles ∪ grants ACL, avec héritage global→tenant via la couche 1).
  Résolues **une seule fois par Bouncer** et partagées sur chaque vérification.
  Un invité, ou un Bouncer sans resolver, obtient un ensemble vide.

`this.sameTenant(resource)` applique l'isolation tenant explicitement — elle
renvoie `true` sous `global` (aucune frontière) et
`resource.tenantId === scope.tenant` sous un scope tenant :

```ts
class PostPolicy extends BasePolicy {
  edit(user, post: { tenantId?: string | null; authorId: string }) {
    if (!this.sameTenant(post)) return false; // inter-tenant ⇒ refus
    return this.permissions.has("post.edit") || user.id === post.authorId;
  }
}

await new Bouncer(user, {}, {}, { scope: { tenant: "acme" }, resolver })
  .with(PostPolicy)
  .allows("edit", post);
```

**Les apps mono-tenant ne demandent aucune config** — omettez le 4ᵉ argument et
le Bouncer se comporte exactement comme avant : `scope === "global"`,
`this.permissions` vide, et `sameTenant` toujours `true`.

L'isolation est *applicable, pas automatique* — une policy décide où appeler
`sameTenant` ; le Bouncer ne refuse jamais automatiquement sur une discordance
de tenant.

Les helpers grossiers `hasRole` / `hasPermission` (et le gate `@Permission` /
`@Role` du middleware) sont ré-exprimés sur ce même ensemble résolu — voir
[Helpers RBAC](#helpers-rbac). La mise en cache au niveau du contexte de requête
(résoudre une fois par requête plutôt qu'une fois par Bouncer) s'appuie sur cette
base dans une release ultérieure.

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
