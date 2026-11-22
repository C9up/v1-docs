# Protecting routes

This guide covers protecting routes and controllers:

- Auth Middleware
- Guards on Routes
- E_UNAUTHORIZED and E_FORBIDDEN
- Decorators (Controller-Level Metadata)

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
      isAuthenticated: true,
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

The route builder's gate is Ream's, not Warden's. It throws Ream's own exceptions, which the exception handler renders:

1. If the route has any guard, role, or permission and `ctx.auth.isAuthenticated` is `false`, it throws `E_UNAUTHORIZED`: `401 { error: { code: 'E_UNAUTHORIZED', message: 'Authentication required' } }`.
2. If the route requires roles and the user holds **none** of them (`ctx.auth.roles`, or `ctx.auth.user.roles` where Warden puts them), it throws `E_FORBIDDEN`: `403 { error: { code: 'E_FORBIDDEN', message: 'Insufficient role', required: [...] } }`. `.role('a', 'b')` is any-of.
3. If the route requires permissions and the user does not hold **all** of them, it throws `E_FORBIDDEN`: `403 { error: { code: 'E_FORBIDDEN', message: 'Insufficient permissions', required: [...] } }`. When `ctx.auth` offers `hasAllPermissions()` — Warden's authenticator does — that answer decides, through the rights resolver; otherwise the gate reads the payload's permissions. A request that came with a token (`user.currentAccessToken`) also needs the token to allow each one.

`ctx.auth` must be populated before the gate runs — that is the auth middleware's job.

### The decorator gate

Warden's auth middleware (`@c9up/warden/middleware`) enforces the `@Guard`, `@Role` and `@Permission` decorators of the controller action and answers on its own, without the exception handler:

- Authentication failure: `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: ... } }` (an HTML request on a session guard with a login route is redirected instead).
- Missing permissions or roles: `403 { error: { code: 'E_WARDEN_FORBIDDEN', message: 'Missing permissions: ...' } }` or `'Missing roles: ...'`. Here roles are **all-of**: `@Role('a', 'b')` requires both, and permissions are checked before roles.

---

## E_UNAUTHORIZED and E_FORBIDDEN

The route gate's two exceptions are exported by `@c9up/ream` and render their own HTTP responses. Throw them from your own middleware or controllers:

```typescript
import { E_FORBIDDEN, E_UNAUTHORIZED } from '@c9up/ream'

// 401
throw new E_UNAUTHORIZED('Bearer token required')
// Response: { "error": { "code": "E_UNAUTHORIZED", "message": "Bearer token required" } }

// 403
throw new E_FORBIDDEN('Insufficient permissions', ['posts.create'])
// Response: { "error": { "code": "E_FORBIDDEN", "message": "Insufficient permissions", "required": ["posts.create"] } }
```

Warden's own failures are `WardenError`s: `E_UNAUTHORIZED_ACCESS` (401), `E_INVALID_CREDENTIALS` (400) and `E_AUTHORIZATION_FAILURE` (403, a denied `authorize()`) are exported classes; `E_WARDEN_FORBIDDEN` is the code the decorator gate writes, not a class.

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

When the auth middleware (`@c9up/warden/middleware`) reads them:

- **Authorization implies authentication.** An action carrying `@Role`,
  `@Permission` or `@RequireMfa` without `@Guard` is authenticated with the
  default guard, and an anonymous request gets a 401. A route declaring
  `@Role('admin')` alone is never public.
- **Decorators are inherited.** They are read through the prototype chain, so an
  action a controller inherits keeps the guard and the authorization its parent
  declared — `class UsersController extends AdminController {}` routes
  `[UsersController, 'index']` with `AdminController`'s decorators. An override
  that declares nothing inherits them too, so redefining a method never drops a
  guard by accident; an override that declares its own decorator replaces the
  parent's for that decorator.

---
