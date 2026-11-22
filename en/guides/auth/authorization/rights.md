# Rights (RBAC and ACL)

This guide covers how rights are resolved:

- Scope
- RightsStore + MemoryRightsStore
- RightsResolver
- DB-backed adapter

## Rights Resolution (RBAC + ACL)

The `RBAC helpers` above are thin sugar over this layer — they consult
`resolve(user, scope)` rather than reading the token payload. This is the richer
model underneath: roles map to permissions (RBAC) and individual users can
receive direct permission grants (ACL), all keyed by scope. A single call —
`resolve(user, scope)` — returns a user's **effective permissions**, and every
authorization check (coarse helpers, the middleware gate, and policy evaluation)
consults that one point.

This is **Layer 1** of Warden's authorization model: the data and its
resolution. The policy-based evaluation layer (the `Bouncer`'s `allows` /
`denies` / `authorize`) builds on top of it and is documented separately.

### Scope

```typescript
import type { Scope } from '@c9up/warden'

const global: Scope = 'global'          // the implicit single-tenant scope
const tenant: Scope = { tenant: 'acme' } // a tenant scope
```

Single-tenant apps never pass a scope and always operate in `'global'`.
Multi-tenant apps pass `{ tenant }`. **Global-scope rights are inherited into
every tenant scope**: a user who is `admin` in `'global'` is admin in every
tenant, while a right granted in `{ tenant: 'acme' }` applies only inside
`acme`.

`scopeKey(scope)` gives the stable string key a store uses internally
(`'global'` → `'global'`, `{ tenant: 'acme' }` → `'tenant:acme'`).

### RightsStore + MemoryRightsStore

`RightsStore` is the read-only contract the resolver depends on:

```typescript
interface RightsStore {
  rolePermissions(role: string, scope: Scope): Promise<readonly string[]>
  userRoles(userId: string, scope: Scope): Promise<readonly string[]>
  userGrants(userId: string, scope: Scope): Promise<readonly string[]>
}
```

`MemoryRightsStore` is the shipped in-memory driver. It implements the read
contract and adds chainable seeding methods for app boot and tests:

```typescript
import { MemoryRightsStore } from '@c9up/warden'

const rights = new MemoryRightsStore()
  .defineRole('editor', ['post.edit', 'post.view'])
  .defineRole('admin', ['tenant.manage'])
  .assignRole('user-1', 'editor')         // defaults to the 'global' scope
  .assignRole('user-1', 'admin', { tenant: 'acme' })
  .grant('user-1', 'post.delete')         // direct ACL grant

rights.revoke('user-1', 'post.delete')    // remove a direct grant
```

`defineRole` / `assignRole` / `grant` / `revoke` each take an optional trailing
`scope` (default `'global'`) and return `this` for chaining. They are part of
the in-memory driver, not the `RightsStore` contract.

### RightsResolver

```typescript
import { RightsResolver } from '@c9up/warden'

const resolver = new RightsResolver(rights)

const eff = await resolver.resolve(user)                  // 'global' scope
const inAcme = await resolver.resolve(user, { tenant: 'acme' })
```

`resolve(user, scope?)` returns `EffectivePermissions`:

```typescript
interface EffectivePermissions {
  has(permission: string): boolean
  hasAll(permissions: readonly string[]): boolean   // empty list ⇒ true
  hasAny(permissions: readonly string[]): boolean   // empty list ⇒ false
  readonly permissions: ReadonlySet<string>
  readonly roles: ReadonlySet<string>
  readonly scope: Scope
}

eff.has('post.edit')                 // true
eff.hasAll(['post.edit', 'post.view']) // true
eff.hasAny(['post.publish'])         // false
```

Resolution rules:

- **Roles** = roles carried on the payload (`user.roles`) **∪** roles assigned
  in the store. Stateless JWT apps that put roles in the token keep working;
  multi-tenant apps add per-tenant assignments in the store.
- **Permissions** = the permissions of every resolved role **∪** the user's
  direct grants (ACL). The payload's `user.permissions` is **not** an input —
  permissions are derived from the rights model, never asserted by the token.
- **Fail-closed**: an unknown role contributes nothing, a user with no roles
  and no grants resolves to an empty set, and `resolve()` never throws on
  absent data.
- Permissions and roles are compared by **exact string equality** — no
  wildcard or role-hierarchy expansion.

### DB-backed adapter

There is no shipped database driver: a DB-backed `RightsStore` is a copy-in
adapter you implement over your own Atlas tables, so the package stays
dependency-free. The contract is three read methods:

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

Seeding (writing roles and grants) is the adapter's own concern — typically
migrations or an admin UI — and is deliberately outside the read contract.

---
