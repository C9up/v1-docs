# Warden — Authentification

Warden gère les stratégies d'authentification et le contrôle d'accès basé sur les rôles (RBAC). Le coeur est la classe `AuthManager`, qui délègue l'authentification et la vérification des tokens aux stratégies enregistrées. La `JwtStrategy` intégrée couvre le cas d'usage JWT courant. Vous pouvez enregistrer des stratégies supplémentaires (session, jetons d'accès, HTTP Basic) à tout moment. Connecter quelqu'un via un fournisseur extérieur, c'est [Transit](/fr/modules/transit).

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
rôles ∪ grants directs) ; les permissions portées par un payload JWT
(`user.permissions`) ne sont **pas** une entrée d'autorisation. Quand la requête
a été authentifiée avec un jeton (`user.currentAccessToken`, posé par le
[garde à jetons d'accès](#jetons-d-acces) ou par un garde OAuth), le jeton doit
aussi autoriser la permission : la vérification exige la permission de
l'utilisateur **et** la capacité du jeton, jamais l'une ou l'autre. `hasRole` reflète
les rôles du payload ∪ les rôles du store, donc un rôle porté par le token le
satisfait toujours sans configuration de store. Sans resolver `rights` fourni,
`AuthManager` retombe sur un store en mémoire vide — les rôles du payload comptent
toujours, les permissions se résolvent à vide.

> **Note de migration.** Les versions précédentes lisaient ces helpers de manière
> **synchrone** directement sur le payload du token. Ils sont désormais `async` et
> adossés au resolver. Les permissions que vous mettiez auparavant dans le token
> JWT/api-key ne sont plus honorées par les vérifications grossières `@Permission` —
> seedez-les plutôt comme rôles ou grants directs dans le rights store.

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
`authorize` du `Bouncer`) se construit par-dessus et est documentée
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

## Autorisation (évaluation par le Bouncer)

L'autorisation de Warden tient en deux couches. La couche 1 — la **Résolution
des droits** ci-dessus — répond à *quelles permissions possède cet
utilisateur ?*. La couche 2 — le **Bouncer** — répond à *cet utilisateur a-t-il
le droit de faire ceci ?*, par des abilities autonomes, des policies basées sur des classes avec des hooks
`before` / `after`, les décorateurs `@allowGuest` / `@action`, un type valeur
`AuthorizationResponse`, et les quatre verbes `allows` / `denies` / `authorize`
/ `execute`.

Les exemples d'abilities autonomes ci-dessous écrivent leurs prédicats
directement sur `(user, resource)`. Les deux
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
dans cet ordre — **before → refus-invité → action → after** :

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
[Helpers RBAC](#helpers-rbac).

### Intégration HTTP

Dans une app HTTP Ream, vous ne construisez jamais un `Bouncer` à la main. Le
middleware global `initializeBouncer` en construit un **par requête** et
l'attache comme `ctx.bouncer`. Enregistrez-le dans `start/kernel.ts` comme
middleware global, après le middleware d'authentification qui peuple `ctx.auth` :

```ts
// start/kernel.ts
import router from "@c9up/ream/services/router"
import { initializeBouncer } from "@c9up/warden/middleware"

// 1. Middleware auth — peuple ctx.auth depuis les décorateurs @Guard/@Role/
//    @Permission de la route. La forme lazy utilise le default export de warden :
router.use([() => import("@c9up/warden/middleware")])
//    (forme directe équivalente : import { wardenMiddleware }; router.use([wardenMiddleware]))

// 2. Bouncer — construit ctx.bouncer par requête (invités compris). À enregistrer
//    APRÈS l'auth. C'est un export nommé → enregistre la fonction directement (PAS
//    `() => initializeBouncer`, que Ream essaierait de `new`) :
router.use([initializeBouncer])
```

Il construit `ctx.bouncer` à partir de trois choses, toutes enregistrées par
`WardenProvider` depuis votre `config/auth.ts` :

- l'utilisateur authentifié — `ctx.auth?.user`, ou `null` pour un invité. Il est
  lu au moment de la première vérification, pas au passage du middleware : un
  handler qui appelle `await ctx.auth.authenticate()` puis autorise est jugé en
  tant que l'utilisateur qu'il vient de connecter ;
- le `RightsResolver` partagé (Layer 1), pour que `this.permissions` dans une
  policy se résolve sur le rights store ;
- le `bouncer:registry` — les tables `abilities` / `policies` et le hook optionnel
  `resolveScope(ctx)` qui dérive le scope tenant de la requête.

Vous déclarez tout cela dans `config/auth.ts` :

```ts
// config/auth.ts
import { defineConfig } from "@c9up/warden/config"
import { Bouncer } from "@c9up/warden"
import { PostPolicy } from "#app/policies/post_policy.js"

export default defineConfig({
  // ...config jwt / session...
  abilities: {
    "post.edit": Bouncer.ability((user, post: { ownerId: string }) =>
      user.id === post.ownerId,
    ),
  },
  policies: { PostPolicy },
  // dérive un scope tenant depuis un header / sous-domaine (omis ⇒ toujours "global")
  resolveScope: (ctx) =>
    ctx.request.headers["x-tenant"]
      ? { tenant: ctx.request.headers["x-tenant"] }
      : "global",
})
```

Si la couche de droits n'est pas câblée, `initializeBouncer` attache quand même
un Bouncer vide plutôt que de planter — `ctx.bouncer` est toujours défini.

Dans un handler, autorisez avec les quatre mêmes verbes, désormais à l'échelle de
la requête :

```ts
class PostController {
  async update(ctx) {
    const post = await Post.find(ctx.params.id)
    // lève WARDEN_AUTHORIZATION_FAILURE (status 403) en cas de refus
    await ctx.bouncer.authorize("post.edit", post)
    // ...ou branchez sans lever
    if (await ctx.bouncer.allows("post.publish", post)) { /* ... */ }
    // policy basée sur une classe, par nom enregistré
    await ctx.bouncer.with("PostPolicy").authorize("archive", post)
  }
}
```

Quand `authorize()` refuse, il lève une `WardenError` de
`code: "WARDEN_AUTHORIZATION_FAILURE"` portant `status: 403` et le message de
refus. L'`ExceptionHandler` de Ream lit ce `status` par duck-typing et le mappe
sur une réponse **403** :

```json
{ "error": { "code": "WARDEN_AUTHORIZATION_FAILURE", "message": "Authorization failed" } }
```

Un `deny(message, status)` personnalisé — ou un `before` de policy renvoyant
`deny("not found", 404)` — propage **son propre** status jusqu'à la réponse,
permettant à une policy de répondre 404 plutôt que de révéler l'existence d'une
ressource.

Le Bouncer par requête résout les permissions d'un utilisateur **une seule fois
par requête** et partage le résultat entre tous les checks de cette requête
(mémoïsé sur l'instance).

---

## JwtStrategy

`JwtStrategy` est l'implémentation JWT intégrée utilisant HMAC-SHA256 (HS256). Elle gère la signature des tokens, leur vérification et la recherche des utilisateurs.

### Configuration

```typescript
import { JwtStrategy } from '@c9up/warden'

const jwt = new JwtStrategy({
  // Obligatoire : minimum 32 caractères, lève une erreur à la construction si plus court
  secret: process.env.JWT_SECRET!,

  // Optionnel : secondes ou chaîne de durée (par défaut : 3600)
  expiresIn: '2h',

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

Configurez-la depuis `config/auth.ts` avec un bloc `session` — fournissez `findUser` et le `WardenProvider` enregistre la stratégie sous le nom `session` :

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'session',          // session-first (app web)
  session: {
    findUser: async (id) => /* résout ton utilisateur via l'id stocké */ null,
  },
}
```

Sans bloc `session`, la stratégie n'est pas enregistrée et `@Guard('session')` lève une erreur.

### login() / logout() / verifyWithContext()

`SessionStrategy.authenticate()` est volontairement un no-op — elle lève une erreur pour rendre le contrat explicite. Appelez `login(user, session)` après avoir vérifié le mot de passe vous-même, puis `verifyWithContext(unused, { session })` sur les requêtes suivantes. `login()` **fait tourner l'id de session** (`session.regenerate()`) avant de stocker l'id utilisateur — la défense standard contre la fixation de session (CWE-384) :

```typescript
import { Hash } from '@c9up/sigil'

const hash = new Hash({
  default: 'argon2',
  drivers: { argon2: { driver: 'argon2' } },
})

// Flux de login — l'appelant vérifie le mot de passe, Warden mintie la session
const user = await db.users.findByEmail(email)
const ok = user ? await hash.verify(user.passwordHash, password) : false
if (!ok) throw new E_WARDEN_UNAUTHORIZED('Identifiants invalides')

await strategy.login({ id: user.id, roles: user.roles }, ctx.session)

// Requêtes suivantes
const result = await strategy.verifyWithContext('unused', { session: ctx.session })
if (result.authenticated) ctx.auth = { authenticated: true, user: result.user!, roles: result.user!.roles ?? [], permissions: result.user!.permissions ?? [] }

// Logout
await strategy.logout(ctx.session)
```

`logout()` oublie l'id utilisateur et **fait aussi tourner l'id de session**.
Une requête encore en cours au moment de la déconnexion tient l'ancien id ;
son entrée ayant disparu, le stockage de session de Ream n'y réécrit rien : la
requête ne peut pas reconnecter l'utilisateur, et une copie de l'ancien id non
plus.

### Révoquer une connexion — `blacklist`

Avec le stockage de session cookie, la session vit dans le navigateur, et le
serveur n'a rien à supprimer à la déconnexion : un cookie copié avant, ou
renvoyé par une requête en cours pendant la déconnexion, resterait connecté.
Donne au guard une `blacklist`, la même `TokenBlacklist` qui révoque les jetons
de `JwtStrategy` :

```typescript
import { RedisBlacklistDriver, SessionStrategy, TokenBlacklist } from '@c9up/warden'

new SessionStrategy({
  findUser,
  blacklist: new TokenBlacklist(new RedisBlacklistDriver(client)),
})
```

Sans elle, `login()` sur une telle session lève `INVALID_CONFIG` : une
application sur le stockage cookie s'en aperçoit à sa première connexion, pas
après un vol de cookie.

Chaque connexion reçoit alors un id, rangé dans la session à côté de l'id
utilisateur (`auth_user_id_sid`). `logout()` l'inscrit pour deux fois la durée
de la session, si bien que l'inscription survit à toutes les copies du cookie :
Ream compte la durée d'un cookie réémis depuis le moment où sa requête a lu la
session, si bien que même une requête en cours pendant la déconnexion ne rend
rien qui vive plus d'une durée après elle.
Une session qui porte un id inscrit est déconnectée, et ses clés sont oubliées :
le cookie renvoyé ne porte plus rien. Une autre connexion du même utilisateur,
sur un autre appareil, n'est pas touchée.

Dès qu'une `blacklist` est posée, une session sans id de connexion est refusée,
comme `JwtStrategy` refuse un jeton sans `jti` : elle ne pourrait jamais être
révoquée. Les utilisateurs connectés avant le changement se reconnectent une
fois.

La durée se lit sur la session de Ream (`session.config.ttl`). Un autre
stockage de session peut passer `sessionAge` (en secondes) à la place ; le
défaut est de deux heures. `MemoryBlacklistDriver` suffit pour un seul
processus ; plusieurs instances demandent un stockage partagé comme
`RedisBlacklistDriver`.

L'interface `SessionStore` est volontairement minimale — `get(key)`, `put(key, value)`, `forget(key)`, `regenerate()`. Les noms de méthodes épousent l'**API `Session` de Ream** (`put`, pas `set`), si bien que la `Session` de Ream — exposée sur `ctx.session` par `SessionMiddleware` — satisfait le contrat structurellement, sans adaptateur. (Si tu avais écrit un `SessionStore` maison contre l'ancien `set()`, renomme-le en `put()`.)

> **`ctx.session`.** La session de requête vit sur `ctx.session`, peuplée par le `SessionMiddleware` de Ream. Enregistre ce middleware **avant** le middleware d'auth pour que `ctx.session` soit posé quand la stratégie session résout l'utilisateur.

### Se souvenir de moi

« Rester connecté » — un identifiant qui survit au cookie de session. Câbler
un driver de tokens **est** l'activation :

```ts
import { MemoryRememberMeTokenDriver, SessionStrategy } from '@c9up/warden'

new SessionStrategy({
  findUser: (id) => User.find(id),
  rememberMeTokens: new MemoryRememberMeTokenDriver(), // votre propre driver en production
  rememberMeAge: 63_072_000,                           // secondes ; 2 ans, la valeur par défaut
  rememberMeCookieName: 'remember_web',                // `remember_<guard>`
  rememberMeCookie: { sameSite: 'strict' },            // surcharges facultatives, voir plus bas
})
```

`ctx.auth.use('web').login(user, true)` écrit le cookie pour vous : chiffré,
`HttpOnly`, `SameSite=Lax`, `Path=/`, et `Secure` en production — un credential
qui vit des années ne part jamais en HTTP clair ni dans une requête cross-site.
`rememberMeCookie` surcharge `path`, `domain`, `sameSite` et `secure` ; `HttpOnly`
reste. `rememberMeAge` doit être un nombre entier positif de secondes.

À la connexion, émettez-en un et posez-le en cookie **httpOnly** ; sur une
requête sans session, essayez-le ; à la déconnexion, révoquez-le :

```ts
const value = await guard.issueRememberMeToken(user)
if (value) response.cookie(guard.rememberMeCookieName, value, { httpOnly: true, maxAge: 63_072_000 })

const revived = await guard.authenticateViaRememberMeToken(request.cookie(guard.rememberMeCookieName))
if (revived) {
  await guard.login(revived.user, session)
  // Le token a été RECYCLÉ — le navigateur doit prendre la nouvelle valeur.
  response.cookie(guard.rememberMeCookieName, revived.cookieValue, { httpOnly: true })
}

await guard.revokeRememberMeToken(request.cookie(guard.rememberMeCookieName))
```

Ce qui rend le mécanisme sûr, et pourquoi chaque point compte :

- **Seul `sha256(secret)` est stocké.** Une fuite de la table ne permet à
  personne de se connecter : le secret n'existe que dans le cookie.
- **Chaque usage recycle le secret, une seule fois.** La valeur que détenait le
  navigateur cesse de fonctionner dès qu'elle sert, donc un cookie volé meurt au
  retour du véritable utilisateur. La rotation est un compare-and-set : de deux
  requêtes présentant le même cookie au même instant, une seule passe. C'est
  pourquoi l'appelant doit écrire le `cookieValue` renvoyé.
- **L'utilisateur est relu, jamais déduit du token.** Un token survit à la
  ligne qu'il désigne ; un compte supprimé ou désactivé ne doit pas revenir.
- **Les empreintes sont comparées en temps constant**, et un mauvais secret, un
  identifiant inconnu et un token expiré sont indiscernables de l'extérieur —
  un « identifiant inconnu » distinguable permettrait de les énumérer.
- **Un token par connexion**, pour qu'une déconnexion sur un appareil laisse les
  autres tranquilles.
- **La déconnexion y met fin.** `ctx.auth.use('web').logout()` efface le cookie
  et supprime le token stocké que le cookie désigne, quel que soit son secret —
  un cookie dont le secret ne correspond plus est un cookie qu'une copie volée a
  déjà recyclé. Le cookie est effacé en premier : un stockage qui échoue à
  supprimer la ligne ne laisse jamais le navigateur en possession du
  credential ; cet échec est tout de même levé, une fois la session terminée.

`MemoryRememberMeTokenDriver` convient aux tests et aux applications
mono-process ; un cluster a besoin d'un stockage partagé implémentant
`RememberMeTokenDriver` (`create` / `find` / `update` / `delete` /
`deleteAllForUser`). `update(identifier, previousHash, hash, expiresAt)` ne doit
remplacer la ligne **que si son empreinte vaut encore `previousHash`** —
`UPDATE … WHERE identifier = ? AND hash = ?` — et dire s'il l'a fait.

### Savoir COMMENT l'utilisateur est arrivé là

```ts
guard.viaRemember           // ressuscité depuis le cookie, pas depuis un mot de passe
guard.attemptedViaRemember  // un jeton a été tenté, qu'il ait marché ou non
guard.isLoggedOut           // logout() a tourné sur ce garde
guard.sessionKeyName        // 'auth_user_id'
guard.rememberMeKeyName     // 'remember_web'
```

`viaRemember` est celui qui compte. Une session restaurée depuis un cookie
ressemblait exactement à une où l'utilisateur venait de taper son mot de passe :
impossible pour une app de le redemander avant une action sensible.

```ts
if (guard.viaRemember) {
  return response.redirect().toRoute('auth.confirm_password')
}
await deleteAccount(user)
```

Une vraie connexion remet le drapeau à zéro : la demande cesse dès que le mot de
passe a réellement été fourni.

#### La classe `RememberMeToken`

Pour du code qui manipule les jetons directement — un driver maison, une
migration, un écran d'admin — la classe `RememberMeToken` est exportée à côté des
fonctions qu'utilise le garde. Les deux reposent sur le même encodage et le même
hachage : elles ne peuvent pas diverger sur ce qu'est un jeton.

```ts
import { RememberMeToken, Secret } from '@c9up/warden'

const decoded = RememberMeToken.decode(cookieValue)   // null si malformé
decoded?.identifier                                    // la moitié publique
decoded?.secret                                        // Secret<string>

const { secret, hash } = RememberMeToken.seed()
const transient = RememberMeToken.createTransientToken(user.id, 40, 63_072_000)

const token = RememberMeToken.fromStored(row)
token.isExpired()
token.verify(decoded.secret)                           // temps constant
token.toStored()                                       // retour à la forme du driver
```

Les secrets reviennent enveloppés dans un `Secret`, pour qu'aucun
ne finisse dans un log en étant interpolé dans une chaîne :

```ts
`${decoded.secret}`          // '[redacted]'
JSON.stringify(decoded)      // {"secret":"[redacted]", ...}
decoded.secret.release()     // la vraie valeur, délibérément
```

`expiresIn` accepte soit des secondes, soit une chaîne de durée — `3600`,
`'1h'`, `'7 days'`. Un nombre nu vaut toujours des **secondes**, comme partout
ailleurs dans ce module. Le `expiresInSeconds` livré au départ fonctionne
encore ; si une config pose les deux, `expiresIn` l'emporte. Une durée est un
nombre entier de secondes : `'500ms'` est refusé, car le `exp` d'un jeton ne
peut pas contenir de fraction.

::: tip Pourquoi warden a son propre `Secret`
warden embarque son propre `Secret` plutôt que d'importer `@c9up/ream` : il n'a
aucune dépendance runtime et expose un point d'entrée autonome, un import de
pair casserait le mode sans framework.
:::

---

## BasicAuthStrategy

HTTP Basic (le pilote `basic_auth`). Le navigateur demande, puis
renvoie les identifiants à **chaque** requête — d'où sa pertinence pour un
endpoint machine-à-machine ou un outil interne derrière TLS, et son inadéquation
pour une connexion utilisateur.

```ts
import { basicAuthGuard, safeCompare } from '@c9up/warden'

basicAuthGuard({
  realm: 'Espace admin',                  // affiché dans l'invite du navigateur
  verifyCredentials: async (uid, password) => {
    const user = await User.findBy('email', uid)
    if (!user || !(await hash.verify(user.password, password))) return null
    return { id: user.id, email: user.email }
  },
})
```

Deux choses qu'il fait pour vous :

- L'en-tête est découpé sur le **premier** deux-points (RFC 7617) — un mot de
  passe peut en contenir, un nom d'utilisateur non. Découper sur le dernier
  accepterait la mauvaise paire.
- Un utilisateur inconnu et un mot de passe faux renvoient le **même** message.
  Les distinguer transforme l'endpoint en oracle de noms d'utilisateurs.

Inscrite comme garde, les routes `@Guard('basic')` lisent l'en-tête
`Authorization: Basic …` ; un refus répond 401 avec
`WWW-Authenticate: Basic realm="…", charset="UTF-8"`, pour que le navigateur
demande. `strategy.challenge` donne cette valeur pour une réponse construite à
la main. `safeCompare(a, b)` est exporté pour une app qui
vérifie un secret partagé en clair — un `===` simple sort plus tôt sur une
divergence précoce, et cet écart est mesurable.

---

## Jetons d'accès

Des jetons porteurs opaques pour les API, les outils en ligne de commande et les
applications mobiles. Une valeur de jeton a la forme `oat_<identifiant>.<secret>`.
Seul `sha256(secret)` est stocké, la comparaison se fait en temps constant, et le
secret se termine par une somme de contrôle CRC-32 pour qu'un scanner de secrets
reconnaisse un jeton qui a fuité.

```ts
import { AccessTokensProvider, MemoryAccessTokenStore } from '@c9up/warden'
import { apiKeyGuard, defineConfig } from '@c9up/warden/config'

// En production, implémentez AccessTokenStore sur votre propre table.
const tokens = new AccessTokensProvider({
  store: new MemoryAccessTokenStore(),
  expiresIn: '30 days',               // durée de vie par défaut ; absente, les jetons n'expirent pas
})

export default defineConfig({
  default: 'api',
  guards: { api: apiKeyGuard({ tokens, findUser: (id) => User.find(id) }) },
})
```

L'émission renvoie le seul objet qui porte jamais la valeur — remettez-la au
client tout de suite, rien de ce qui est stocké ne permet de la reconstruire :

```ts
const token = await tokens.create(user, ['orders:read'], { name: 'CI', expiresIn: '7 days' })
token.value.release()   // "oat_…"
token.toJSON()          // { type: 'bearer', name, token, abilities, lastUsedAt, expiresAt }
```

`abilities` vaut `['*']` par défaut, c'est-à-dire toutes les capacités.
`AccessTokensProvider` prend `store`, `prefix` (`oat_` par défaut ; non vide,
sans `.`), `type` (`auth_token` par défaut, pour qu'une même table contienne
plusieurs sortes de jetons), `tokenSecretLength` (40 par défaut, au moins 32 :
un secret plus court se devine) et `expiresIn` (en secondes ou sous forme de
durée). Une valeur qui ne convient pas est refusée à la construction.
L'identifiant est fait de 128 bits aléatoires plutôt que d'un id de ligne : on ne
peut pas viser un jeton en énumérant les lignes.

### Le garde

`apiKeyGuard({ tokens, findUser })` construit une `ApiKeyStrategy`, enregistrée
comme driver `access_tokens`. Elle lit `Authorization: Bearer <jeton>` ou
l'en-tête `x-api-key` (`headerName` le change), et vérifie la valeur auprès du
provider : une valeur qui n'est pas l'un de nos jetons, un identifiant inconnu,
un jeton d'un autre type, un mauvais secret et un jeton expiré donnent tous le
même refus. Seul un jeton vérifié voit son `lastUsedAt` mis à jour.
L'utilisateur est ensuite rechargé via `findUser` à **chaque** requête : un jeton
dont le compte a été supprimé ou désactivé cesse de fonctionner dès que
`findUser` répond `null`.

Une config qui passe encore `findByKey` au lieu de `tokens` est refusée à la
construction du garde, pas à la première requête.

### Les capacités ne sont pas des permissions

L'utilisateur authentifié porte le jeton dans `user.currentAccessToken` :

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities               // ['orders:read']
token.allows('orders:read')   // true — '*' autorise tout
token.denies('orders:write')  // true
token.authorize('orders:write') // lève E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

Les capacités d'un jeton ne sont **jamais** fusionnées dans `user.permissions`,
qui contient les permissions propres de l'utilisateur. Ce qu'une requête faite
avec un jeton peut faire, c'est ce que l'utilisateur peut faire **et** ce que le
jeton autorise : une capacité qui porte le nom d'une permission n'accorde rien
que l'utilisateur n'a pas, et un jeton limité à quelques capacités ne porte pas
toutes les permissions de son utilisateur. `@Permission(...)`, `hasPermission`
et `hasAllPermissions` appliquent exactement cette intersection ;
`tokenAllows(user, permission)` en est la moitié « jeton », seule. Un
utilisateur connecté par session ou par JWT n'a pas de `currentAccessToken` et
n'est vérifié que sur ses propres permissions.

### Gérer les jetons d'un utilisateur

```ts
await tokens.all(user)                 // les plus récemment utilisés d'abord, jamais utilisés à la fin
await tokens.find(user, identifier)    // null s'il n'est pas à cet utilisateur
await tokens.delete(user, identifier)  // 0 ou 1
await tokens.deleteAll(user)
await tokens.invalidate(new Secret(presentedValue)) // révoque depuis la valeur elle-même
guard.invalidateToken(presentedValue)                // la même chose, depuis le garde
```

`find` et `delete` ne touchent qu'un jeton appartenant à l'utilisateur nommé.
`invalidate` ne révoque que si le secret correspond : un identifiant seul — lu
dans une ligne de log ou une liste de jetons — ne suffit pas à révoquer le jeton
de quelqu'un d'autre.

`AccessTokenStore` est la table : `create`, `find(identifier)`,
`touch(identifier, lastUsedAt)`, `delete(identifier)` (indique si une ligne est
partie) et `listForUser(userId)`. Les horodatages sont en millisecondes depuis
l'epoch et `expiresAt` vaut `null` pour un jeton qui n'expire jamais.
`MemoryAccessTokenStore` sert aux tests et aux outils mono-processus. Une
application qui a son propre schéma de jetons implémente
`AccessTokensProviderContract` (`create`, `verify`, `invalidate`) au lieu
d'utiliser `AccessTokensProvider`.

---

## Limiter les connexions — AuthRateLimiter

Comptez une tentative de connexion **avant** de vérifier le mot de passe, sous
l'IP du client et l'identifiant essayé, et effacez les deux en cas de succès :

```ts
import { AuthRateLimiter, RedisAttemptStore } from '@c9up/warden'

const limiter = new AuthRateLimiter({
  maxAttempts: 5,
  windowSeconds: 900,
  // store: new RedisAttemptStore(redis),   // partagé entre instances
})

const keys = AuthRateLimiter.loginKeys(ctx.request.ip(), email)
const decision = await limiter.attempt(...keys)
if (!decision.allowed) return response.status(429).json({ retryAfter: decision.retryAfterSeconds })
const user = await verify(email, password)
if (user) await limiter.clear(...keys)
```

Compter d'abord est ce qui tient face à une rafale : chaque tentative est un
incrément atomique, si bien que vingt essais simultanés ne peuvent pas tous lire
« pas encore bloqué ». L'identifiant est normalisé (casse, espaces autour), et
`maxAttempts` et `windowSeconds` doivent être des entiers positifs.
`MfaManager` utilise le même limiteur pour son verrouillage.

Le `MemoryAttemptStore` par défaut compte par processus et il est borné
(100 000 clés). Quand il est plein et que toutes les fenêtres sont encore
actives, une **nouvelle** clé est refusée — sa tentative est comptée au-delà de
la limite — plutôt que d'abandonner un compteur actif pour faire de la place :
les clés sont choisies par celui qui devine, et évincer les plus anciennes
laisserait un déluge d'identifiants inventés effacer le verrouillage d'une
victime. Pendant un tel déluge, les premières tentatives sous de nouvelles clés
attendent que des fenêtres expirent. En production, utilisez
`RedisAttemptStore` : il est partagé par toutes les instances et n'a pas cette
borne.

---

## Authentifier un client de test

Chaque guard répond à `authenticateAsClient(...)` par ce qu'un client doit
envoyer pour être cet utilisateur. Le `loginAs()`
du client de test l'applique :

```ts
await client.get('/dashboard').loginAs(sessionGuard, user)
await client.get('/api/me').loginAs(jwtGuard, user)
await client.get('/keys').loginAs(apiKeyGuard, user, ['orders:read'])
await client.get('/admin').loginAs(basicGuard, 'ada', 'secret')
```

C'est le **guard** qui décide quoi envoyer : le test ne reproduit donc jamais la
façon dont ce guard authentifie, et la requête emprunte le même chemin de
vérification qu'en production. Un test qui forge son en-tête ne prouve que le bon
fonctionnement de la forge.

| guard | répond par | reçoit |
|---|---|---|
| jwt | `authorization: Bearer <signé>` | l'utilisateur |
| session | une entrée de session sous la clé du guard | l'utilisateur |
| access_tokens | `authorization: Bearer oat_…` — un vrai jeton émis par le provider | l'utilisateur, puis des capacités et des options de jeton facultatives |
| basic | `authorization: Basic <base64>` | uid + mot de passe |

Un guard session renvoie des **valeurs** de session, que seul quelque chose
détenant le driver peut persister — configurez `sessionSeeder` sur le client de
test. Sans lui, `loginAs()` lève au lieu d'envoyer la requête non authentifiée.

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

## Hachage de mot de passe

**Warden ne hash pas les mots de passe.** Utilisez [`@c9up/sigil`](/fr/modules/sigil) — le service canonique de hachage de mot de passe pour l'écosystème Ream.

| Préoccupation | Où ça vit |
|---|---|
| `Hash.make(password)` / `Hash.verify(hash, password)` | `@c9up/sigil` (Rust NAPI : argon2id, bcrypt, scrypt) |
| Stockage de session après login réussi | `@c9up/warden` `SessionStrategy.login(user, session)` |
| Signature / vérification JWT | `@c9up/warden` `JwtStrategy` (HMAC-SHA256 via warden NAPI) |
| Primitives stdlib HMAC + random + constant-time-eq | `@c9up/ream/crypto` |

Le découpage est délibéré (story 40.1, architecture.md « Hashing authority »). `SessionStrategy.authenticate()` lève volontairement une erreur pour que la frontière de design soit incontournable : les appelants vérifient les credentials avec Sigil, Warden suit la session.

Les quatre méthodes de l'interface `NativeWarden.hashPassword*` (`hashPasswordArgon2`, `verifyPasswordArgon2`, `hashPasswordBcrypt`, `verifyPasswordBcrypt`) ont été retirées de la surface TS dans la story 40.3 — c'était du code mort sans aucun appelant dans le workspace. Le crate Rust sous-jacent (`warden-engine` `argon2_hash` + `bcrypt_hash`) et les quatre bindings NAPI restent embarqués dans l'artefact `.node` prébuild ; leur nettoyage est planifié pour une story de durcissement à venir.

---

## Authentification multi-facteurs (MFA)

Warden embarque quatre providers MFA, tous implémentés sur `node:crypto` avec **zéro dépendance tierce** — WebAuthn compris (le parsing CBOR / COSE / attestation est fait maison). Chaque provider et le `MfaManager` prennent des stores enfichables qui par défaut sont en mémoire ; fournissez des stores persistants (Atlas, KeyDB…) en production.

| Provider | Rôle |
|---|---|
| `TotpProvider` | codes d'application d'authentification RFC 6238 (Google Authenticator, 1Password…) |
| `BackupCodesProvider` | codes de secours à usage unique, hachés salés au repos |
| `OtpProvider` | codes à usage unique livrés par email / SMS (canal enfichable) |
| `WebauthnProvider` | passkeys / FIDO2 (aucune librairie WebAuthn tierce) |

### MfaManager — cycle d'enrôlement

`MfaManager` orchestre le flux stateful « activer la 2FA » pour TOTP + codes de secours, avec une protection anti-brute-force par utilisateur sur `verify()`.

```typescript
import { MfaManager, TotpProvider, BackupCodesProvider } from '@c9up/warden'

const mfa = new MfaManager({
  issuer: 'Fluveo',
  totp: new TotpProvider(),
  backupCodes: new BackupCodesProvider(),
  // store: new AtlasMfaFactorStore(db),   // facteurs persistants en production
  rateLimit: { maxAttempts: 5, windowSeconds: 900 }, // + store: new RedisAttemptStore(redis) en cluster
})

// 1. Enrôlement — affichez `uri` sous forme de QR code (avec @c9up/prism : `await qrcode.toString(uri)`)
const { factorId, uri } = await mfa.enrollTotp({ id: user.id, name: user.email })
// 2. Confirmation avec un premier code de l'application d'authentification
await mfa.confirmTotp(user.id, factorId, code)     // → true une fois confirmé
// 3. Codes de secours — à afficher UNE SEULE fois
const codes = await mfa.createBackupCodes(user.id)

// Step-up à la connexion — un code TOTP OU un code de secours, rate-limité par utilisateur
if (await mfa.verify(user.id, submitted)) {
  // JWT : un jeton qui porte le step-up
  const token = auth.issueFor(user, 'jwt', { mfa: true })
  // session : l'enregistrer sur cette session
  ctx.auth.use('web').markMfaVerified()
}
```

Helpers de statut : `isEnabled(userId)`, `listFactors(userId)` (ne divulgue jamais de secret), `disableFactor(userId, factorId)`, `await isLocked(userId)`.

Les opérations sur un facteur nomment son propriétaire à côté de l'id du facteur
et refusent un facteur qui appartient à quelqu'un d'autre : un id de facteur
transite par les requêtes, et un id qui a fuité par un log ou un outil de
support ne doit pas permettre à un autre compte d'agir dessus. `disableFactor`
répond `true` quand il a supprimé le facteur, `false` pour un id inconnu ou le
facteur d'un autre utilisateur, qui reste en place. `confirmTotp` répond `false`
dans le même cas, et ses tentatives comptent dans le même verrouillage que
`verify()` : un premier code ne peut pas être deviné sans limite.

Chaque code ne sert qu'une fois, même quand deux requêtes le présentent au même
instant : le garde anti-rejeu TOTP réserve un code atomiquement
(`claim(key, ttlMs)`, écriture si absent), et un code de secours est consommé par
`MfaFactorStore.consumeBackupHash(factorId, hash)`, qui ne doit retirer
l'empreinte que si elle est encore là. Une tentative est comptée **avant** la
vérification du code, si bien qu'une rafale d'essais simultanés ne peut pas
atteindre tous les providers. Sur plusieurs instances, partagez les compteurs et
le garde anti-rejeu : `rateLimit.store: new RedisAttemptStore(redis)` et
`new TotpProvider({ replayGuard: new RedisTotpReplayGuard(redis) })`. Les nombres
sont vérifiés à la construction : TOTP `digits` 6–8, `period` 1–3600 s, `window`
0–10 ; codes de secours `count` 1–100, `length` 8–64.

### @RequireMfa — protéger des routes

Une route décorée par `@RequireMfa()` n'est accessible que si le credential de la requête a passé un step-up MFA : un JWT signé avec `{ mfa: true }`, ou une session sur laquelle `markMfaVerified()` a tourné. Sinon le middleware d'auth renvoie **403 `E_WARDEN_MFA_REQUIRED`**. `user.mfa` est posé par le garde d'après ce credential, jamais d'après ce que renvoie `findUser` — un compte où la MFA est *activée* n'a pas pour autant passé le step-up. Une nouvelle connexion et une déconnexion effacent le step-up de la session.

```typescript
import { Guard, RequireMfa } from '@c9up/warden'

class TransferController {
  @Guard('jwt')
  @RequireMfa()
  async transfer() { /* accessible uniquement après le step-up MFA */ }
}
```

Enregistrez le manager via la config pour qu'il atterrisse dans le conteneur sous `MfaManager` / `"mfa"` :

```typescript
// config/auth.ts
import { defineConfig } from '@c9up/warden/config'
export default defineConfig({ jwt: { /* … */ }, mfa: { manager: mfa } })
```

### OTP email / SMS et WebAuthn

`OtpProvider` et `WebauthnProvider` s'utilisent directement — leurs flux sont basés sur un challenge / une cérémonie, pas sur un cycle d'enrôlement :

```typescript
import { OtpProvider, WebauthnProvider } from '@c9up/warden'

// OTP livré — vous fournissez le canal email/SMS
const otp = new OtpProvider({ channel: { send: (to, code) => mailer.send(to, code) } })
const { challengeId } = await otp.start(user.email)
await otp.verify(challengeId, submitted)           // usage unique, TTL + budget d'essais

// Passkeys — l'attestation est en trust-on-registration (demandez attestation: 'none')
const webauthn = new WebauthnProvider({ rpName: 'Fluveo', rpID: 'fluveo.ch', origin: 'https://fluveo.ch' })
const reg = await webauthn.startRegistration({ id: user.id, name: user.email })
// … cérémonie navigateur … puis :
await webauthn.finishRegistration(reg.state, user.id, browserResponse)
```

#### Écrire son propre store de challenges

Les stores par défaut gardent les challenges en mémoire, ce qui convient à un
processus et pas à plusieurs : un code émis par une instance ne peut pas être
vérifié par une autre. Un store partagé est une implémentation Redis ou SQL de
`OtpChallengeStore`.

Il doit une opération que les autres n'impliquent pas :

```typescript
interface OtpChallengeStore {
  save(challenge: OtpChallenge): Promise<void>
  find(id: string): Promise<OtpChallenge | null>
  delete(id: string): Promise<void>
  /** Retire le challenge ET le rend, de façon indivisible. */
  take(id: string): Promise<OtpChallenge | null>
}
```

**`take` doit être atomique.** C'est ce qui rend un code à usage unique
réellement unique : au plus un appelant concurrent peut recevoir un challenge
donné, tous les autres reçoivent `null`. Le lire puis le supprimer en deux
opérations, et deux requêtes portant le même bon code sont toutes deux
acceptées — un code volé reste dépensable tant que son propriétaire ne l'a pas
dépensé. Le budget d'essais suit le même chemin : des tentatives erronées
concurrentes lisent toutes le même compteur et écrivent le même incrément, donc
vingt d'entre elles coûtent un essai.

Utilisez la primitive que votre base offre déjà :

```
SQL     DELETE FROM otp_challenges WHERE id = $1 RETURNING *
Redis   GETDEL, ou un script Lua quand la valeur doit être décodée
autre   un compare-and-set sur une colonne de version
```

Un store incapable de faire cela atomiquement n'est pas utilisable pour du MFA,
et un store qui n'implémente pas `take` du tout est refusé à la construction du
provider plutôt qu'à la première vérification.

> **Cassant en 0.2.0.** `take` a été ajouté à l'interface : un store écrit pour
> 0.1.x ne la satisfait plus. Sur une version `0.x` le mineur est la position
> cassante et un caret ne le franchit pas — rien n'y monte par accident — mais
> une montée volontaire demande la méthode.

Les stores mémoire balaient les challenges expirés à mesure que de nouveaux
arrivent, pour qu'une connexion abandonnée — un code demandé et jamais soumis —
ne s'accumule pas. Ils portent aussi un plafond (10 000 par défaut,
`new MemoryOtpChallengeStore(max)`) : le balayage ne retire que ce qui a
**expiré**, donc un flot de challenges encore valides grossirait sans limite.

Pleins, ils **refusent** un nouveau challenge plutôt que d'en évincer un ancien.
Faire de la place en supprimant le challenge en attente de quelqu'un d'autre,
c'est ainsi qu'un flot verrouille un vrai utilisateur dehors ; refuser fait
porter l'échec à celui qui inonde. Limitez le débit de l'endpoint qui émet les
codes, ou utilisez un store persistant avec un TTL sur la ligne.

> **Persistance.** Les stores par défaut sont en mémoire — facteurs et passkeys sont perdus au redémarrage. En production, implémentez `MfaFactorStore` / `WebauthnCredentialStore` au-dessus de votre base de données (Atlas) et les stores de challenge au-dessus d'un cache rapide (KeyDB).

---

## Middleware d'authentification

Créez une classe `AuthMiddleware` qui appelle `auth.verify()` et peuple `ctx.auth`. Le conteneur résout `AuthManager` via l'injection par constructeur.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { E_WARDEN_UNAUTHORIZED } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class AuthMiddleware {
  constructor(private auth: AuthManager) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const bearer = ctx.request.header('authorization')
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined

    if (!token) {
      throw new E_WARDEN_UNAUTHORIZED('Bearer token required')
    }

    const result = await this.auth.verify(token)
    if (!result.authenticated || !result.user) {
      throw new E_WARDEN_UNAUTHORIZED('Invalid or expired token')
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

1. Si la route possède un guard, un rôle ou une permission quelconque et que `ctx.auth.authenticated` est `false` — lève `E_WARDEN_UNAUTHORIZED`.
2. Si la route exige des rôles et que `ctx.auth.roles` n'en contient aucun — lève `E_WARDEN_FORBIDDEN`.
3. Si la route exige des permissions et que l'utilisateur ne les détient pas toutes — ou que la requête est venue avec un jeton (`user.currentAccessToken`) qui n'en autorise pas une — lève `E_WARDEN_FORBIDDEN`.

Les guards sont appliqués par le pipeline de middlewares, pas par Warden directement. `ctx.auth` doit être peuplé avant l'exécution de la vérification du guard — c'est le rôle du middleware d'authentification.

---

## E_WARDEN_UNAUTHORIZED et E_WARDEN_FORBIDDEN

Les deux exceptions sont définies dans `@c9up/ream` et gèrent elles-mêmes leurs réponses HTTP :

```typescript
import { E_WARDEN_UNAUTHORIZED, E_WARDEN_FORBIDDEN } from '@c9up/ream'

// 401 — levée quand ctx.auth.authenticated est false
throw new E_WARDEN_UNAUTHORIZED('Bearer token required')
// Réponse : { "error": { "code": "E_WARDEN_UNAUTHORIZED", "message": "Bearer token required" } }

// 403 — levée quand les rôles ou permissions sont insuffisants
throw new E_WARDEN_FORBIDDEN('Insufficient permissions', ['posts.create'])
// Réponse : { "error": { "code": "E_WARDEN_FORBIDDEN", "message": "Insufficient permissions", "required": ["posts.create"] } }
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
  permissions?: string[]                    // celles de l'utilisateur, jamais élargies par un jeton
  currentAccessToken?: CurrentAccessToken   // posé par un garde à jetons
  [key: string]: unknown
}

interface CurrentAccessToken {
  readonly abilities: readonly string[]
  allows(ability: string): boolean
  denies(ability: string): boolean
  authorize(ability: string): void
}

interface AuthConfig {
  defaultStrategy: string
  strategies: Record<string, AuthStrategy>
}

interface JwtStrategyConfig {
  secret: string
  expiresIn?: number | string
  expiresInSeconds?: number
  verifyCredentials: (email: string, password: string) => Promise<UserPayload | null>
  findUser: (id: string) => Promise<UserPayload | null>
}
```

---

### Vérifier sans lever

`authenticate()` lève ; `check()` répond. La même paire existe pour une liste de
gardes :

```ts
await auth.authenticate()              // lève E_UNAUTHORIZED_ACCESS
await auth.check()                     // true | false

await auth.authenticateUsing(['web', 'api'])
await auth.checkUsing(['web', 'api'])  // le pendant qui ne lève pas
```

Un handler qui se demande « quelqu'un est-il connecté via l'un des deux » devait
écrire le try/catch lui-même. Un refus d'identifiants est une réponse ; une
stratégie **plantée** se propage toujours, plutôt que d'être rapportée comme
« pas connecté ».

`auth.createAuthenticator(ctx)` construit ce que le middleware HTTP construit
par requête, pour une commande console ou un job sans requête autour.

## Événements d'authentification

Branche un emitter et chaque décision d'authentification est annoncée. Le nom de
l'événement est préfixé par le **pilote** du garde — une app
qui audite les connexions de session n'entend donc pas parler du trafic par
jeton porteur sous le même nom :

| Pilote | Préfixe d'événement |
| --- | --- |
| `session` | `session_auth:*` |
| `access_tokens` / `api-key` | `access_tokens_auth:*` |
| `basic_auth` | `basic_auth:*` |
| `jwt` | `jwt_auth:*` |

```ts
auth.setEmitter(emitter)

emitter.on('session_auth:login_succeeded', ({ guardName, user }) => audit(user))
emitter.on('jwt_auth:authentication_failed', ({ guardName, error }) => alert(error))
```

Le préfixe vient du pilote de la stratégie, pas de la clé de config du garde : un
garde nommé `web` portant une `SessionStrategy` reste le pilote session.
`authEventPrefix(driverName)` est exporté si tu as
besoin de construire un nom toi-même. `jwt` devient `jwt_auth`.

Événements : `login_attempted`, `login_succeeded`, `logged_out` (gardes avec état
seulement), plus `authentication_attempted`, `authentication_succeeded` et
`authentication_failed` sur chaque garde. L'événement de succès porte le nom du
garde qui a réellement répondu, pas de celui demandé en premier.

Un écouteur qui lève ne casse jamais une connexion — ce n'est pas au bus
d'événements de mettre son veto à une authentification.

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

## Blacklist JWT sur Redis

La révocation de jetons peut vivre sur une connexion [Quasar](/fr/modules/quasar) plutôt qu'en mémoire :

```ts
import { RedisBlacklistDriver, quasarConnection } from '@c9up/warden'

new RedisBlacklistDriver(quasarConnection())
```

La connexion est résolue au premier contrôle de révocation : une application dont la blacklist n'est jamais consultée n'ouvre donc aucun socket pour elle. Passer un client directement fonctionne toujours : `@c9up/quasar` est une peer **optionnelle**.

### Survivre à une panne Redis — `ResilientBlacklistDriver`

```ts
import { MemoryBlacklistDriver, RedisBlacklistDriver, ResilientBlacklistDriver, TokenBlacklist } from '@c9up/warden'

new TokenBlacklist(new ResilientBlacklistDriver(
  new RedisBlacklistDriver(quasarConnection()),
  new MemoryBlacklistDriver(),          // la valeur par défaut
  { onDegrade: (event) => log.warn(event) },
))
```

Une révocation est écrite dans les deux stockages, toujours : cette instance
sait ce qu'elle a révoqué sans aller-retour. Une vérification interroge d'abord
l'enregistrement local, puis Redis. Quand Redis ne peut pas répondre et que
l'enregistrement local ne connaît pas le credential, la vérification **échoue
fermée** : l'erreur est levée, et le garde la traite comme une stratégie en
échec — un 500, ou un invité sous l'authentification silencieuse —, jamais comme
« non révoqué ». La même blacklist sert aux déconnexions de session et à des JWT
émis pour plusieurs jours : répondre « non révoqué » pendant une panne
accepterait toutes les connexions révoquées ailleurs.

`{ failOpen: true }` laisse au contraire passer ces credentials. Cela convient à
un déploiement dont le seul consommateur est un garde JWT à `expiresIn` court,
où rester disponible pendant une panne vaut plus qu'une révocation manquée
pendant au plus la durée de vie d'un jeton. `onDegrade` est appelé à chaque
repli ; par défaut, il signale le premier échec d'une opération, puis un
décompte périodique.
