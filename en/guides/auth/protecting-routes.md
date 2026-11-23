# Protecting routes

This guide covers protecting routes and controllers:

- Auth Middleware
- Guards on Routes
- E_UNAUTHORIZED_ACCESS and E_AUTHORIZATION_FAILURE
- Decorators (Controller-Level Metadata)

## Auth Middleware

Create an `AuthMiddleware` class that calls `auth.verify()` and populates `ctx.auth`. The container resolves `AuthManager` via constructor injection.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { errors } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

export default class AuthMiddleware {
  constructor(private auth: AuthManager) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const bearer = ctx.request.header('authorization')
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined

    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
    }

    const result = await this.auth.verify(token)
    if (!result.authenticated || !result.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid or expired token')
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

The route builder's gate is Ream's, not Warden's. It throws Ream's own exceptions, with the codes, statuses and messages Warden raises for the same refusals. Each renders itself through its own `handle`, which writes the same bytes as Warden's error of the same code, so a refusal answers the same way whichever gate raised it:

1. If the route has any guard, role, or permission and `ctx.auth.isAuthenticated` is `false`, it throws `E_UNAUTHORIZED_ACCESS`: `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: 'Unauthorized access' } }`, to every client.
2. If the route requires roles and the user holds **none** of them (`ctx.auth.roles`, or `ctx.auth.user.roles` where Warden puts them), it throws `E_AUTHORIZATION_FAILURE` (403). `.role('a', 'b')` is any-of.
3. If the route requires permissions and the user does not hold **all** of them, it throws `E_AUTHORIZATION_FAILURE` (403). The roles and permissions the route asks for are never sent: they would tell the client what to obtain. When `ctx.auth` offers `hasAllPermissions()` — Warden's authenticator does — that answer decides, through the rights resolver; otherwise the gate reads the payload's permissions. A request that came with a token (`user.currentAccessToken`) also needs the token to allow each one.

`E_AUTHORIZATION_FAILURE` renders by content negotiation: `403 { errors: [{ message: 'Access denied' }] }` for a JSON client, `{ errors: [{ code: 'E_AUTHORIZATION_FAILURE', title: 'Access denied' }] }` for JSON:API, the message as text for an HTML request, and a form submission (`POST`, `PUT`, `PATCH`, `DELETE`) from a browser with a session is redirected back with the message flashed under `error` and under the code. The message is translated under `errors.E_AUTHORIZATION_FAILURE` when the context has an `i18n`.

`ctx.auth` must be populated before the gate runs — that is the auth middleware's job.

### The decorator gate

Warden's auth middleware (`@c9up/warden/middleware`) enforces the `@Guard`, `@Role` and `@Permission` decorators of the controller action. A refusal is thrown, as AdonisJS's `auth` middleware and bouncer throw it, and the host's exception handler calls the error's own `handle`, which writes the response:

- Authentication failure: `errors.E_UNAUTHORIZED_ACCESS`, `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: ... } }` (an HTML request on a session guard with a login route is redirected instead; a Basic guard adds its `WWW-Authenticate` challenge).
- Missing permissions or roles: `errors.E_AUTHORIZATION_FAILURE`, rendered as a denied `authorize()` and as the route gate's `.role()` / `.permission()`: `403 { errors: [{ message: 'Access denied' }] }` for a JSON client, the other formats as above. The message is translated under `errors.E_AUTHORIZATION_FAILURE` when the context has an `i18n`; the missing roles and permissions are not sent. Here roles are **all-of**: `@Role('a', 'b')` requires both.

---

## E_UNAUTHORIZED_ACCESS and E_AUTHORIZATION_FAILURE

The route gate's two exceptions are classes of the `errors` of `@c9up/ream`, and each renders itself. Throw them from your own middleware or controllers:

```typescript
import { errors } from '@c9up/ream'

// 401
throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
// Response: { "error": { "code": "E_UNAUTHORIZED_ACCESS", "message": "Bearer token required" } }

// 403
throw new errors.E_AUTHORIZATION_FAILURE()
// Response to a JSON client: { "errors": [{ "message": "Access denied" }] }
```

Warden's own failures are classes of its `errors` namespace: `errors.E_UNAUTHORIZED_ACCESS` (401), `errors.E_INVALID_CREDENTIALS` (400) and `errors.E_AUTHORIZATION_FAILURE` (403, a denied `authorize()` or a role or permission the decorator gate refused). Ream's and Warden's classes are distinct, with the same codes: test `error.code` to catch either.

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
