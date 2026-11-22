# Droits (RBAC et ACL)

Ce guide couvre la résolution des droits :

- Scope
- RightsStore + MemoryRightsStore
- RightsResolver
- Adapter base de données

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
