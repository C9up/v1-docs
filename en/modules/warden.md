# Warden — Authentication

Warden manages authentication strategies and role-based access control (RBAC). The core is the `AuthManager` class, which delegates authentication and token verification to registered strategies. The built-in `JwtStrategy` covers the common JWT use case. You can register additional strategies (session, API key, OAuth) at any time.

## Installation

```bash
npm install @c9up/warden
```

Or via the framework installer:

```bash
pnpm ream add @c9up/warden
```

The installer scaffolds `config/auth.ts` with TODO stubs for
`findUser` and `verifyCredentials` (both `throw new Error('TODO …')`).
A note is also written to stderr at install time listing the two stubs
— **login and JWT verify both fail at runtime until you fill them in**.

---

## config/auth.ts

Warden reads its configuration from `config/auth.ts`. The file is auto-loaded by the Ignitor into `app.config.get('auth')` during the register phase.

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET!, // minimum 32 characters
    expiresInSeconds: 3600,          // 1 hour
  },
}
```

The `secret` must be at least 32 characters. `JwtStrategy` will throw at construction time if it is shorter.

---

## WardenProvider

`WardenProvider` registers `AuthManager` as a singleton in the container. It reads `config/auth.ts` and auto-wires `JwtStrategy` when `config.auth.jwt` is provided:

```typescript
// config/auth.ts
import { defineConfig } from '@c9up/warden'

export default defineConfig({
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: Number(process.env.JWT_EXPIRY ?? '3600'),
  },
})
```

```typescript
// reamrc.ts
providers: [
  () => import('@c9up/warden/provider'),
]
```

For custom strategies (session, api-key) or additional wiring, create your own provider:

```typescript
// providers/AuthProvider.ts
import type { AppContext } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class AuthProvider {
  constructor(protected app: AppContext) {}

  register() {
    this.app.container.singleton(AuthManager, () => {
      // Build and return your own AuthManager with the strategies you need.
      return new AuthManager({ defaultStrategy: 'jwt', strategies: {} })
    })
  }
}
```

---

## AuthManager

`AuthManager` is the central class. It holds a map of named strategies and exposes `authenticate()`, `verify()`, and RBAC helpers.

```typescript
import { AuthManager } from '@c9up/warden'
import type { AuthConfig } from '@c9up/warden'

const auth = new AuthManager({
  defaultStrategy: 'jwt',
  strategies: { jwt: jwtStrategy },
})
```

### authenticate()

Exchange credentials (email + password) for a token. Uses the default strategy unless you pass a strategy name.

```typescript
const result = await auth.authenticate({ email: 'user@example.com', password: 'secret' })

if (result.authenticated) {
  // result.user contains id, roles, permissions, and token (for JwtStrategy)
  const { token } = result.user as { token: string }
} else {
  console.error(result.error) // 'Invalid credentials'
}
```

### verify()

Verify a token (JWT, session ID, API key). Calls `findUser()` internally to ensure the user still exists.

```typescript
const result = await auth.verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')

if (result.authenticated) {
  console.log(result.user?.id)
} else {
  console.error(result.error) // 'Invalid or expired token'
}

// Use a specific strategy
const result2 = await auth.verify(sessionId, 'session')
```

### registerStrategy()

Add a strategy at runtime:

```typescript
auth.registerStrategy('apiKey', apiKeyStrategy)
auth.getStrategyNames() // ['jwt', 'apiKey']
```

### RBAC helpers

The coarse helpers — `hasRole` / `hasPermission` / `hasAllPermissions` — are thin
**async** sugar over the rights-resolution layer below: they consult
`resolve(user, scope)` and never read the token payload directly. Each takes an
optional trailing `scope` (default `'global'`).

```typescript
import { AuthManager, MemoryRightsStore, RightsResolver } from '@c9up/warden'
import type { UserPayload } from '@c9up/warden'

// Seed roles → permissions (RBAC) and/or direct grants (ACL) in the store.
const store = new MemoryRightsStore()
  .defineRole('editor', ['posts.create', 'posts.read'])
  .assignRole('user-1', 'editor')

const auth = new AuthManager({
  defaultStrategy: 'jwt',
  strategies: { jwt },
  rights: new RightsResolver(store),
})

const user: UserPayload = { id: 'user-1', roles: ['admin'] }

await auth.hasRole(user, 'admin')          // true — payload roles fold in
await auth.hasRole(user, 'superadmin')     // false

await auth.hasPermission(user, 'posts.create')  // true — role-derived
await auth.hasPermission(user, 'posts.delete')  // false

await auth.hasAllPermissions(user, ['posts.create', 'posts.read'])   // true
await auth.hasAllPermissions(user, ['posts.create', 'posts.delete']) // false

// Multi-tenant: pass a scope (global rights inherit into every tenant).
await auth.hasPermission(user, 'posts.publish', { tenant: 'acme' })
```

`hasPermission` / `hasAllPermissions` reflect the **resolved set** (role-derived ∪
direct grants); permissions carried in the JWT/api-key token (`user.permissions`)
are **not** an authorization input. `hasRole` reflects payload roles ∪ store roles,
so a token-carried role still satisfies it with no store config. When no `rights`
resolver is supplied, `AuthManager` defaults to an empty in-memory store — roles
still fold in from the payload, permissions resolve empty.

> **Migration note.** Earlier releases read these helpers **synchronously**
> straight off the token payload. They are now `async` and resolver-backed.
> Permissions you previously stuffed into the JWT/api-key token are no longer
> honoured by coarse `@Permission` checks — seed them as roles or direct grants
> in the rights store instead. The api-key scope → grant path is completed in a
> later story.

---

## Rights Resolution (RBAC + ACL)

The `RBAC helpers` above are thin sugar over this layer — they consult
`resolve(user, scope)` rather than reading the token payload. This is the richer
model underneath: roles map to permissions (RBAC) and individual users can
receive direct permission grants (ACL), all keyed by scope. A single call —
`resolve(user, scope)` — returns a user's **effective permissions**, and every
authorization check (coarse helpers, the middleware gate, and policy evaluation)
consults that one point.

This is **Layer 1** of Warden's authorization model: the data and its
resolution. The policy-based evaluation layer (a Bouncer-shaped `allows` /
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

## Authorization (Bouncer-shaped evaluation)

Warden's authorization is two layers. Layer 1 — **Rights Resolution** above —
answers *what permissions does this user have?*. Layer 2 — the **Bouncer** —
answers *is this user allowed to do this thing?*, with a surface faithful to
AdonisJS Bouncer: standalone abilities, class-based policies with `before` /
`after` hooks, the `@allowGuest` / `@action` decorators, an
`AuthorizationResponse` value type, and the four verbs `allows` / `denies` /
`authorize` / `execute`.

The standalone-ability examples here write their predicates directly against
`(user, resource)`, exactly as Adonis does. The two layers connect through
**policies**: a Bouncer can carry a scope + a Layer-1 resolver, and a policy
then reads the resolved permissions via `this.permissions` — see **Multi-tenant
scope** below.

### Abilities

An ability is a single named check. `Bouncer.ability` returns an opaque
reference you use by-reference or register by name. A guest (a `null` user) is
**denied by default** without the callback ever running — pass
`{ allowGuest: true }` to opt in.

```ts
import { Bouncer } from "@c9up/warden";

const editPost = Bouncer.ability(
  (user, post: { authorId: string }) => user.id === post.authorId,
);

// Opt a guest in explicitly:
const viewPublic = Bouncer.ability(
  { allowGuest: true },
  (user, post: { published: boolean }) => post.published || user !== null,
);

const bouncer = new Bouncer(currentUser); // currentUser: UserPayload | null
await bouncer.allows(editPost, post); // Promise<boolean>
```

### The four verbs

```ts
await bouncer.allows(editPost, post); // Promise<boolean> — never throws
await bouncer.denies(editPost, post); // Promise<boolean> — !allows
await bouncer.execute(editPost, post); // Promise<AuthorizationResponse>
await bouncer.authorize(editPost, post); // resolves on allow, throws on deny
```

`allows` / `denies` never throw — a denial is `false`. `execute` returns the
full `AuthorizationResponse` (`authorized`, `message`, `status`). `authorize`
resolves to `void` on allow and throws `WARDEN_AUTHORIZATION_FAILURE` on deny
(the HTTP-403 mapping arrives in the HTTP-integration story).

Abilities can be registered by name and checked either way — both produce
identical results:

```ts
const bouncer = new Bouncer(currentUser, { editPost });
await bouncer.allows("editPost", post);
```

### AuthorizationResponse

A predicate may return a `boolean` (sugar for allow / deny) or an explicit
`AuthorizationResponse` carrying a custom message and status:

```ts
import { AuthorizationResponse } from "@c9up/warden";

AuthorizationResponse.allow(); // { authorized: true }
AuthorizationResponse.deny(); // { authorized: false, status: 403 }
AuthorizationResponse.deny("Post not found", 404); // custom message + status
```

### Policies

Group the checks for a resource in a class extending `BasePolicy`. Action
methods are positional `(user, resource)`; decorate a method with
`@allowGuest()` (≡ `@action({ allowGuest: true })`) to let a guest reach it.

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

`with` accepts the policy class directly, or a name when policies are
registered: `new Bouncer(user, abilities, { Post: PostPolicy })` →
`bouncer.with("Post")`. A fresh policy instance is constructed per check.

### before / after hooks

The optional `before` and `after` hooks run around every action in the Adonis
order — **before → guest-deny → action → after**:

- `before(user, action, ...args)` runs first. A non-`undefined` return
  short-circuits the action (this is how a moderator bypass, or an early
  `deny("not found", 404)`, works — including for a guest).
- the guest-deny rule applies only if `before` fell through.
- `after(user, action, response)` runs last. A non-`undefined` return overrides
  the response; `undefined` keeps it.

```ts
class PostPolicy extends BasePolicy {
  before(user) {
    if (user?.roles?.includes("admin")) return true; // moderators bypass
    return undefined;
  }

  delete(user, post: Post) {
    return user.id === post.authorId;
  }
}
```

### Multi-tenant scope

A Bouncer carries an active **scope** — `"global"` (the implicit single-tenant
default) or `{ tenant: string }`. Pass it, with an optional Layer-1 resolver, as
the 4th constructor argument:

```ts
import { Bouncer, RightsResolver } from "@c9up/warden";

const resolver = new RightsResolver(store); // store: RightsStore
const bouncer = new Bouncer(currentUser, abilities, policies, {
  scope: { tenant: "acme" },
  resolver,
});

bouncer.scope; // { tenant: "acme" }
```

Inside a policy, two protected members expose the active context:

- `this.scope` — the Bouncer's scope (`"global"` when none was given).
- `this.permissions` — the resolved `EffectivePermissions` for `(user, scope)`
  (role-derived ∪ ACL grants, with global→tenant inheritance per Layer 1).
  Resolved **once per Bouncer** and shared across every check. A guest, or a
  Bouncer with no resolver, gets an empty set.

`this.sameTenant(resource)` enforces tenant isolation explicitly — it returns
`true` under `global` (no boundary) and `resource.tenantId === scope.tenant`
under a tenant scope:

```ts
class PostPolicy extends BasePolicy {
  edit(user, post: { tenantId?: string | null; authorId: string }) {
    if (!this.sameTenant(post)) return false; // cross-tenant ⇒ deny
    return this.permissions.has("post.edit") || user.id === post.authorId;
  }
}

await new Bouncer(user, {}, {}, { scope: { tenant: "acme" }, resolver })
  .with(PostPolicy)
  .allows("edit", post);
```

**Single-tenant apps need zero config** — omit the 4th argument and the Bouncer
behaves exactly as before: `scope === "global"`, `this.permissions` empty, and
`sameTenant` always `true`.

Isolation is *enforceable, not automatic* — a policy decides where to call
`sameTenant`; the Bouncer never auto-denies on a tenant mismatch.

The coarse `hasRole` / `hasPermission` helpers (and the middleware
`@Permission` / `@Role` gate) are re-expressed over this same resolved set —
see [RBAC helpers](#rbac-helpers). Request-context caching (resolve once per
request rather than once per Bouncer) builds on this in a later release.

---

## JwtStrategy

`JwtStrategy` is the built-in JWT implementation using HMAC-SHA256 (HS256). It handles token signing, verification, and user lookup.

### Configuration

```typescript
import { JwtStrategy } from '@c9up/warden'

const jwt = new JwtStrategy({
  // Required: minimum 32 characters, throws at construction if shorter
  secret: process.env.JWT_SECRET!,

  // Optional: token lifetime in seconds (default: 3600)
  expiresInSeconds: 7200,

  // Called by authenticate() — verify email/password, return UserPayload or null
  verifyCredentials: async (email, password) => {
    const user = await db.users.findByEmail(email)
    if (!user || !await verifyPassword(password, user.passwordHash)) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },

  // Called by verify() — load user by ID from the token's `sub` claim
  findUser: async (id) => {
    const user = await db.users.findById(id)
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

### signToken()

Sign a token for an existing `UserPayload` without going through `authenticate()`. Useful for impersonation, refresh tokens, or test helpers.

```typescript
const token = jwt.signToken({
  id: 'user-1',
  roles: ['admin'],
  permissions: ['posts.create'],
})
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Token Payload

The JWT payload always includes:

| Claim | Description |
|---|---|
| `sub` | User ID (`user.id`) |
| `roles` | Role array (optional) |
| `permissions` | Permission array (optional) |
| `iat` | Issued-at timestamp (Unix seconds) |
| `exp` | Expiry timestamp (Unix seconds) |

### generateJwtSecret()

Generate a cryptographically random 48-byte secret encoded as base64url — safe to store in `.env`:

```typescript
import { generateJwtSecret } from '@c9up/warden'

console.log(generateJwtSecret())
// 'wX3hK2qP9rZmYnLsVbTuCjEoAiDfGkNpQeRwXyZa1B2C3...'
```

---

## SessionStrategy

`SessionStrategy` is the built-in cookie/session-based strategy. It stores the authenticated user's id in a session store after the caller has verified the password — Warden itself never hashes or verifies passwords.

```typescript
import { SessionStrategy } from '@c9up/warden'

const strategy = new SessionStrategy({
  // Optional: session key (default: 'auth_user_id')
  sessionKey: 'auth_user_id',

  // Called by verifyWithContext() — load user by id stored in session.
  // `id` is `string | number` (the type stored at login time).
  findUser: async (id: string | number) => {
    const user = await db.users.findById(String(id))
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

### login() / logout() / verifyWithContext()

`SessionStrategy.authenticate()` is a deliberate no-op — it throws to make the contract explicit. Call `login(user, session)` after you've verified the password yourself, then `verifyWithContext(unused, { session })` on subsequent requests:

```typescript
import { Hash } from '@c9up/sigil'

const hash = new Hash({
  default: 'argon2',
  drivers: { argon2: { driver: 'argon2' } },
})

// Login flow — the caller verifies the password, Warden mints the session
const user = await db.users.findByEmail(email)
const ok = user ? await hash.verify(password, user.passwordHash) : false
if (!ok) throw new E_UNAUTHORIZED('Invalid credentials')

await strategy.login({ id: user.id, roles: user.roles }, ctx.session)

// Subsequent requests
const result = await strategy.verifyWithContext('unused', { session: ctx.session })
if (result.authenticated) ctx.auth = { authenticated: true, user: result.user!, roles: result.user!.roles ?? [], permissions: result.user!.permissions ?? [] }

// Logout
await strategy.logout(ctx.session)
```

The `SessionStore` interface is intentionally minimal — `get(key)`, `set(key, value)`, `forget(key)`. Plug in any session backend (cookie, Redis, in-memory) that conforms.

---

## Password Hashing

**Warden does not hash passwords.** Use [`@c9up/sigil`](/en/modules/sigil) — the canonical password-hashing service for the Ream ecosystem.

| Concern | Where it lives |
|---|---|
| `Hash.make(password)` / `Hash.verify(password, hash)` | `@c9up/sigil` (Rust NAPI: argon2id, bcrypt, scrypt) |
| Session storage after a successful login | `@c9up/warden` `SessionStrategy.login(user, session)` |
| JWT signing / verification | `@c9up/warden` `JwtStrategy` (HMAC-SHA256 via warden NAPI) |
| HMAC + random + constant-time-eq stdlib primitives | `@c9up/ream/crypto` |

The split is deliberate (story 40.1, architecture.md "Hashing authority"). `SessionStrategy.authenticate()` throws on purpose so the design boundary is unmissable: callers verify credentials with Sigil, Warden tracks the session.

The four `NativeWarden.hashPassword*` interface methods (`hashPasswordArgon2`, `verifyPasswordArgon2`, `hashPasswordBcrypt`, `verifyPasswordBcrypt`) were removed from the TS surface in story 40.3 — they were dead code with zero callers in the workspace. The underlying Rust crate (`warden-engine` `argon2_hash` + `bcrypt_hash`) and the four NAPI bindings still ship in the prebuilt `.node` artifact; their cleanup is queued for a follow-up hardening story.

---

## Auth Middleware

Create an `AuthMiddleware` class that calls `auth.verify()` and populates `ctx.auth`. The container resolves `AuthManager` via constructor injection.

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

Register it as a named middleware in `start/kernel.ts`:

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'

export const middleware = router.named({
  auth: () => import('#app/middleware/auth_middleware.js'),
})
```

---

## Guards on Routes

Apply guards at the route or group level using `.guard()`, `.role()`, and `.permission()` on the route builder. The middleware pipeline enforces these before calling the controller — no middleware class needed.

```typescript
import router from '@c9up/ream/services/router'
import PostsController from './controllers/PostsController.js'

// Require authentication via the 'jwt' guard
router.get('/posts', [PostsController, 'index'])
  .guard('jwt')

// Require a role
router.delete('/posts/:id', [PostsController, 'destroy'])
  .guard('jwt')
  .role('admin')

// Require a permission
router.post('/posts', [PostsController, 'store'])
  .guard('jwt')
  .permission('posts.create')

// Apply to a group — all routes in the group inherit these constraints
router.group(() => {
  router.get('/admin/users', [UsersController, 'index'])
  router.delete('/admin/users/:id', [UsersController, 'destroy'])
    .permission('users.delete')
}).prefix('/api').guard('jwt').role('admin')
```

### Guard Enforcement Behaviour

1. If the route has any guard, role, or permission and `ctx.auth.authenticated` is `false` — sends `401 { error: { code: 'UNAUTHORIZED', message: ... } }` and returns.
2. If the route requires roles and `ctx.auth.roles` does not contain any of them — sends `403 { error: { code: 'FORBIDDEN', message: 'Missing roles: ...' } }` and returns.
3. If the route requires permissions and `ctx.auth.permissions` does not contain all of them — sends `403 { error: { code: 'FORBIDDEN', message: 'Missing permissions: ...' } }` and returns.

Guards are enforced by the middleware pipeline, not by Warden directly. `ctx.auth` must be populated before the guard check runs — that is the auth middleware's job.

---

## E_UNAUTHORIZED and E_FORBIDDEN

Both exceptions are defined in `@c9up/ream` and self-handle their HTTP responses:

```typescript
import { E_UNAUTHORIZED, E_FORBIDDEN } from '@c9up/ream'

// 401 — thrown when ctx.auth.authenticated is false
throw new E_UNAUTHORIZED('Bearer token required')
// Response: { "error": { "code": "E_UNAUTHORIZED", "message": "Bearer token required" } }

// 403 — thrown when roles or permissions are insufficient
throw new E_FORBIDDEN('Insufficient permissions', ['posts.create'])
// Response: { "error": { "code": "E_FORBIDDEN", "message": "Insufficient permissions", "required": ["posts.create"] } }
```

You can throw these manually in your own middleware or controllers — the global exception handler will handle them.

---

## Decorators (Controller-Level Metadata)

`@Guard()`, `@Role()`, and `@Permission()` are method decorators that attach metadata via `reflect-metadata`. They do not enforce anything on their own — they are read by route inspection tools (the `ream` CLI, OpenAPI generators). For actual enforcement at request time, use the router's fluent `.guard()`, `.role()`, `.permission()` methods or the auth middleware.

```typescript
import { Guard, Permission, Role } from '@c9up/warden'

class PostsController {
  @Guard('jwt')
  @Permission('posts.create')
  @Role('admin')
  async store() {
    // Metadata only — enforcement comes from the route builder or middleware
  }
}

// Read the metadata:
import { getGuardMetadata, getPermissionMetadata, getRoleMetadata } from '@c9up/warden'

getGuardMetadata(PostsController.prototype, 'store')       // ['jwt']
getPermissionMetadata(PostsController.prototype, 'store')  // ['posts.create']
getRoleMetadata(PostsController.prototype, 'store')        // ['admin']
```

---

## Custom Strategies

Implement the `AuthStrategy` interface to add your own strategy:

```typescript
import type { AuthStrategy, AuthResult } from '@c9up/warden'

const apiKeyStrategy: AuthStrategy = {
  name: 'apiKey',

  async authenticate(credentials): Promise<AuthResult> {
    // Not used for API key auth
    return { authenticated: false, error: 'Use verify() with an API key' }
  },

  async verify(key): Promise<AuthResult> {
    const user = await db.apiKeys.findUser(key)
    if (!user) return { authenticated: false, error: 'Invalid API key' }
    return { authenticated: true, user: { id: user.id, roles: user.roles } }
  },
}

auth.registerStrategy('apiKey', apiKeyStrategy)

// Use it on a specific route's middleware or by passing the strategy name:
const result = await auth.verify(apiKey, 'apiKey')
```

---

## Multiple Strategies

```typescript
const auth = new AuthManager({
  defaultStrategy: 'jwt',
  strategies: {
    jwt: jwtStrategy,
    apiKey: apiKeyStrategy,
    session: sessionStrategy,
  },
})

// Default strategy
await auth.authenticate({ email, password })

// Named strategy
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

## Error Codes

| Code | Thrown when |
|---|---|
| `WARDEN_INVALID_CONFIG` | `defaultStrategy` is not present in `strategies` |
| `WARDEN_STRATEGY_NOT_FOUND` | `getStrategy()` or `verify()` called with an unregistered strategy name |

---

## Next Steps

- [Middleware](/en/guide/middleware) — Writing and registering middleware classes
- [Routing](/en/guide/routing) — Route-level guards, roles, and permissions
- [Blackhole (Security)](/en/modules/blackhole) — Rust-side request filtering
