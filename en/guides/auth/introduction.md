# Introduction

This guide covers authentication with warden:

- Installation
- config/auth.ts
- WardenProvider
- AuthManager
- Multiple Strategies
- Dual-guard: session for the web, JWT for the API

Warden manages authentication strategies and role-based access control (RBAC). The core is the `AuthManager` class, which delegates authentication and token verification to registered strategies. The built-in `JwtStrategy` covers the common JWT use case. You can register additional strategies (session, access tokens, HTTP Basic) at any time. Signing someone in through an outside provider is [Transit](/en/guides/auth/social/).

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
import env from '#start/env.js'

export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: env.get('JWT_SECRET'), // minimum 32 characters
    expiresIn: '1h',                 // or 3600
  },
}
```

The `secret` must be at least 32 characters. `JwtStrategy` will throw at construction time if it is shorter.

---

## WardenProvider

`WardenProvider` registers `AuthManager` as a singleton in the container. It reads `config/auth.ts` and builds one strategy per guard. `ream configure @c9up/warden` writes the guard form — a `default` guard name and a `guards` map built with the guard factories (`jwtGuard`, `sessionGuard`, `apiKeyGuard`, `basicAuthGuard`):

```typescript
// config/auth.ts — the file `ream configure` writes
import { defineConfig, jwtGuard } from '@c9up/warden'
import env from '#start/env.js'

export default defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      secret: env.get('JWT_SECRET'),
      // Seconds, or a duration string: JWT_EXPIRY=1h works as written.
      expiresIn: env.get('JWT_EXPIRY', '1h'),
      // Both return a UserPayload ({ id, roles?, permissions? }) or null.
      findUser: (id) => users.findPayload(id),
      verifyCredentials: (email, password) => users.checkLogin(email, password),
    }),
  },
})
```

The driver-keyed form is accepted too: `defaultStrategy` plus one block per driver (`jwt`, `session`, `apiKey`), each turned into its strategy:

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

The token lifetime is `expiresIn` (seconds, or a duration string such as `'2h'`); `expiresInSeconds` is the seconds-only spelling and `expiresIn` wins when both are set. The default is 3600 seconds. Any other key, such as `expiry`, is not read.

A config with neither guards nor a driver block makes the provider throw `E_WARDEN_NO_AUTH_CONFIG` at boot.

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
  const token = result.user?.token
  if (typeof token === 'string') {
    // hand the token to the client
  }
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
direct grants); permissions carried in a JWT payload (`user.permissions`) are
**not** an authorization input. When the request was authenticated with a token
(`user.currentAccessToken`, set by the [access-tokens guard](/en/guides/auth/access-tokens-guard#access-tokens) or
an OAuth guard), the token must also allow the permission: the check is the
user's permission **and** the token's ability, never one or the other. `hasRole` reflects payload roles ∪ store roles,
so a token-carried role still satisfies it with no store config. When no `rights`
resolver is supplied, `AuthManager` defaults to an empty in-memory store — roles
still fold in from the payload, permissions resolve empty.

Inside a request, the same questions are asked of `ctx.auth`, without importing
the manager:

```typescript
await ctx.auth.hasAllPermissions?.(['posts.create', 'posts.read'])    // the signed-in user
await ctx.auth.hasAllPermissions?.(['posts.publish'], { tenant: 'acme' })
```

Warden's per-request authenticator has `hasPermission(permission, scope?)` and
`hasAllPermissions(permissions, scope?)`. Both delegate to the manager's
helpers above for the authenticated user, narrowed by the token the request
came with; a guest holds nothing, not even an empty list. Ream's `ctx.auth`
type declares `hasAllPermissions` only, as optional — an application without
Warden has no such method, hence the `?.`. The route, RPC and GraphQL
`.permission()` gates ask `ctx.auth.hasAllPermissions` when the auth layer
provides it, so a permission granted by the rights store passes them and one
present only in the token payload does not.

> **Migration note.** Earlier releases read these helpers **synchronously**
> straight off the token payload. They are now `async` and resolver-backed.
> Permissions you previously stuffed into the JWT/api-key token are no longer
> honoured by coarse `@Permission` checks — seed them as roles or direct grants
> in the rights store instead.

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

## Dual-guard: session for the web, JWT for the API

`AuthManager` holds a **map** of named strategies and picks one **per route**, so a single app can serve a cookie-authenticated web surface and a Bearer-token API side by side. Typically `session` serves the **web** side and `jwt` (access tokens) the **api** side.

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'session',          // the fallback when a route names no guard
  session: { findUser: async (id) => /* … */ null },
  jwt: { secret: process.env.JWT_SECRET, findUser, verifyCredentials },
}
```

```typescript
// browser/web routes — cookie sent automatically, CSRF-protected
router.get('/dashboard', [DashboardController, 'show']).guard('session')
router.get('/download/:id', [FileController, 'download']).guard('session')

// API / mobile routes — Authorization: Bearer <jwt>, CSRF-immune
router.get('/api/v1/orders', [OrderController, 'index']).guard('jwt')
```

A cookie ride on a plain `<a href>` navigation means a session-guarded download **knows who is asking** with no token to attach — the ergonomics a Bearer-only API can't give a link. Bearer requests carry no ambient cookie, so they're immune to CSRF; the cookie/session routes are the ones blackhole's signed CSRF protects (add the Bearer API prefixes to blackhole's `exceptRoutes`).

Strategy registration is introspectable at runtime — `auth.getStrategyNames()` lists the registered names and `auth.getStrategy(name)` returns one (it throws for an unregistered name, so guard with `getStrategyNames().includes(name)` first):

```typescript
auth.getStrategyNames()        // ['session', 'jwt']
if (auth.getStrategyNames().includes('session')) {
  const strategy = auth.getStrategy('session')
  // session strategies expose verifyWithContext(unused, { session })
}
```

---

## Next Steps
- [Middleware](/en/guides/basics/middleware) — Writing and registering middleware classes
- [Routing](/en/guides/basics/routing) — Route-level guards, roles, and permissions
- [Blackhole (Security)](/en/guides/security/securing-ssr) — Rust-side request filtering
