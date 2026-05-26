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

`@Guard()`, `@Role()`, and `@Permission()` are method decorators that attach metadata via `reflect-metadata`. They do not enforce anything on their own — they are read by route inspection tools (Forge, OpenAPI generators). For actual enforcement at request time, use the router's fluent `.guard()`, `.role()`, `.permission()` methods or the auth middleware.

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
