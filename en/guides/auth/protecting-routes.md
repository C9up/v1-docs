# Protecting routes

This guide covers protecting routes and controllers:

- Auth Middleware
- Guards on Routes
- E_UNAUTHORIZED_ACCESS and E_AUTHORIZATION_FAILURE
- Decorators (Controller-Level Metadata)

## Auth Middleware

Create an `AuthMiddleware` class that calls `auth.verify()` with the `jwt` guard and populates `ctx.auth`. The container resolves `AuthManager` via constructor injection: `@inject()` is what tells it which class to inject. Without it, the request fails with a 500.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { errors, inject } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'

@inject()
export default class AuthMiddleware {
  constructor(private auth: AuthManager) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const bearer = ctx.request.header('authorization')
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined

    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
    }

    const result = await this.auth.verify(token, 'jwt')
    if (!result.authenticated || !result.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid or expired token')
    }

    ctx.auth = {
      isAuthenticated: true,
      // The guard that vouched for the request: a route's `.guard('jwt')`
      // only lets the request through when this names one of its guards.
      authenticatedViaGuard: 'jwt',
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

A route or a group then uses it by its name, `.middleware('auth')`, as in the examples below. The factory form does the same and also passes arguments to the third parameter of `handle()`: `.use(middleware.auth({ guards: ['jwt'] }))`. A name given to `.middleware()` must be declared in `router.named()`: a misspelt `.middleware('auht')` stops the application at boot with `E_MIDDLEWARE_NOT_FOUND`, naming the route.

The middlewares of `router.use()` run before it, so it can read what they set (the session, the user found by `@c9up/warden/silent-auth`).

---

## Guards on Routes

Apply guards at the route or group level using `.guard()`, `.role()`, and `.permission()` on the route builder or on the group builder. The middleware pipeline enforces these before calling the controller — no extra middleware class needed. The gate only reads `ctx.auth`, so the auth middleware above must run first: attach it to the routes (`.middleware('auth')`, as below) or to the server stack.

Each call must name at least one guard, role or permission. `.guard()`, `.role()` or `.permission()` with nothing, and `group({ guards: [] })`, throw `E_EMPTY_GATE_REQUIREMENT` when the route is declared: an empty requirement would protect nothing. This also catches a list read from configuration that is empty (`.role(...ADMIN_ROLES)`). The same goes for a controller action's `@Role()`, `@Permission()` or `@Guard()` that names nothing: the decorator itself throws `E_WARDEN_EMPTY_GATE_REQUIREMENT` when the class loads, and metadata that names nothing anyway (written by hand) is refused at request time: the route gate answers `E_EMPTY_GATE_REQUIREMENT` (500), Warden's middleware `E_WARDEN_EMPTY_GATE_REQUIREMENT` (500). For a route with no requirement, leave the call out.

```typescript
import router from '@c9up/ream/services/router'
import PostsController from './controllers/PostsController.js'
import UsersController from './controllers/UsersController.js'

// Require authentication via the 'jwt' guard
router.get('/posts', [PostsController, 'index'])
  .middleware('auth')
  .guard('jwt')

// Require a role
router.delete('/posts/:id', [PostsController, 'destroy'])
  .middleware('auth')
  .guard('jwt')
  .role('admin')

// Require a permission
router.post('/posts', [PostsController, 'store'])
  .middleware('auth')
  .guard('jwt')
  .permission('posts.create')

// Apply to a group — all routes in the group inherit these constraints
router.group(() => {
  router.get('/admin/users', [UsersController, 'index'])
  router.delete('/admin/users/:id', [UsersController, 'destroy'])
    .permission('users.delete')
}).prefix('/api').middleware('auth').guard('jwt').role('admin')
```

The group's `.guard()`, `.role()` and `.permission()` reach every route declared in its callback, nested groups included. They do what the object form `router.group({ guards, roles, permissions }, (r) => { ... })` does. A group never widens what a route asks for:

- **Guards.** Each `.guard()` is a level: the request must be authenticated by one of the guards it names. The group's `.guard()`, each nested group's, each `.guard()` call on the route and the action's `@Guard()` are separate levels, and the guard that authenticated the request must be in all of them. A route `.guard('web')` inside a group `.guard('jwt')` accepts no request. To accept either guard, name both in one call: `.guard('jwt', 'web')`.
- **Roles.** Each `.role()` is a requirement: the user needs one of the roles it names. The group's `.role()`, each nested group's and each `.role()` call on the route are separate requirements, and the user must meet all of them. A route `.role('editor')` inside a group `.role('admin')` needs a user who is both an admin and an editor. To accept either role, name both in one call: `.role('admin', 'editor')`.
- **Permissions.** The group's permissions join the route's own, and the user needs every one.

In the example above, `DELETE /api/admin/users/:id` asks for the `admin` role and the `users.delete` permission.

### Guard Enforcement Behaviour

The route builder's gate is Ream's, not Warden's. It throws Ream's own exceptions, with the codes, statuses and messages Warden raises for the same refusals. Each renders itself through its own `handle`, which writes the same bytes as Warden's error of the same code, so a refusal answers the same way whichever gate raised it:

1. If the route has guards, the request must be authenticated by a guard every level names: `ctx.auth.authenticatedViaGuard` is in each level. When it is not and `ctx.auth` offers `authenticateUsing()` (Warden's authenticator does), the gate calls it once, with the guards every level names. When no guard is in every level, nothing can pass. Otherwise it throws `E_UNAUTHORIZED_ACCESS`: `401 { error: { code: 'E_UNAUTHORIZED_ACCESS', message: 'Unauthorized access' } }`, to every client. A request authenticated by another guard is refused too.
   If the route has roles or permissions, or its action carries `@RequireMfa()`, and `ctx.auth.isAuthenticated` is `false`, it throws the same 401.
2. If the route requires roles, the user must meet every role requirement: one role of each `.role()` call, of each group's `.role()`, and every role of the action's `@Role()`. The roles are read from `ctx.auth.roles`, or `ctx.auth.user.roles` where Warden puts them. Otherwise it throws `E_AUTHORIZATION_FAILURE` (403). `.role('a', 'b')` accepts `a` or `b`; `.role('a').role('b')` needs both.
3. If the route requires permissions and the user does not hold **all** of them, it throws `E_AUTHORIZATION_FAILURE` (403). The roles and permissions the route asks for are never sent: they would tell the client what to obtain. When `ctx.auth` offers `hasAllPermissions()` — Warden's authenticator does — that answer decides, through the rights resolver; otherwise the gate reads the payload's permissions. A request that came with a token (`user.currentAccessToken`) also needs the token to allow each one.

4. If the controller action carries `@RequireMfa()`, `ctx.auth.user.mfa` must be `true`: the credential completed the MFA step-up. Otherwise it throws `E_WARDEN_MFA_REQUIRED`: `403 { error: { code: 'E_WARDEN_MFA_REQUIRED', message: 'Multi-factor authentication is required for this action.' } }`, the body Warden's middleware writes. See [MFA](/en/guides/auth/mfa).

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

`@Guard()`, `@Role()`, `@Permission()` and `@RequireMfa()` are method decorators that attach metadata via `reflect-metadata`. Two gates enforce them at request time:

- Ream's route gate, for a route whose handler is a controller action (`[PostsController, 'store']` or `'PostsController.store'`). It adds the action's guards, roles, permissions and MFA requirement to the route's own and checks them as described in [Guard Enforcement Behaviour](#guard-enforcement-behaviour). There too, a user needs every role of `@Role('a', 'b')`, on top of the route's and the groups' own requirements. The gate enforces all four decorators on every stack, from the first request, whether the controller is imported lazily or not.
- Warden's auth middleware, when you use it. It reads the same decorators, as described in [The decorator gate](#the-decorator-gate). There a user needs every role.

When both run, a request must pass both.

```typescript
import { Guard, Permission, Role } from '@c9up/warden'

class PostsController {
  @Guard('jwt')
  @Permission('posts.create')
  @Role('admin')
  async store() {
    // Runs only once the gates above let the request through
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
