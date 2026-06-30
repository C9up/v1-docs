# Authorization

Ream answers two different questions about a request. *Who are you?* is
**authentication** — handled by Warden's strategies (JWT, session, API key).
*What may you do?* is **authorization** — the subject of this guide.

Before this model, "what may you do?" was answered by three unrelated
mechanisms: route-level `@Role` / `@Permission` guards, Station's
`defineResource({ policies })` callback table, and ad-hoc ownership checks in
controllers. They drifted apart and each read permissions differently. The
unified layer replaces all three with **one model** — RBAC, ACL, ownership and
multi-tenancy are *facets* of it, not separate engines.

## The model — two layers and a scope

```
Layer 1 — RIGHTS DATA (resolution)
  users → roles → permissions          (RBAC)
  + direct user → permission grants     (ACL)
  all keyed by scope: global | tenant:X (multi-tenant)
  resolve(user, scope) → effective permissions   ← the single unification point

Layer 2 — EVALUATION (Bouncer-shaped, consults Layer 1)
  ability(user, ...args) / Policy.method(user, resource)
      resolved(user, scope).has("post.edit")   // data: role-derived ∪ direct grant
   || user.id === resource.authorId             // ownership
   && this.sameTenant(resource)                 // tenant isolation
```

A request flows top to bottom:

1. **Authn** — a Warden strategy verifies the credential and produces a
   `UserPayload` (or `null` for a guest).
2. **Rights resolution (Layer 1)** — `RightsResolver.resolve(user, scope)` reads
   the rights store and returns the user's **effective permissions** for the
   active scope: role-derived permissions ∪ direct grants, with `global` rights
   inherited into every tenant. This is the single point that the epic calls
   `user.permissions` — a token's own `user.permissions` claim is **not** an
   input.
3. **Evaluation (Layer 2)** — a `Bouncer` runs an ability or a policy method.
   The predicate decides using the resolved permissions (`this.permissions`),
   ownership (`user.id === resource.authorId`), and tenant isolation
   (`this.sameTenant(resource)`) — freely combined.
4. **HTTP integration** — the `initializeBouncer` middleware builds a
   per-request `ctx.bouncer`; a denial throws `WARDEN_AUTHORIZATION_FAILURE`,
   which Ream maps to a **403**.

The evaluation layer is faithful to AdonisJS Bouncer — the contract is familiar
— but it is an independent Ream implementation with **no `@adonisjs/bouncer`
dependency**.

The reference for each piece lives in the Warden module page:
[Rights Resolution](/en/modules/warden#rights-resolution-rbac-acl),
[Authorization](/en/modules/warden#authorization-bouncer-shaped-evaluation), and
[HTTP integration](/en/modules/warden#http-integration).

## A worked example

A small blog with editors, per-post ownership, a publish grant, and tenant
isolation — every facet in one app.

**1. Seed the rights model.** Roles and grants live in a `RightsStore`. The
in-memory driver ships with Warden; a DB-backed one is a
[copy-in adapter](/en/modules/warden#db-backed-adapter).

```ts
import { MemoryRightsStore } from "@c9up/warden"

export const rights = new MemoryRightsStore()
  // RBAC: the editor role grants post.edit (global)
  .defineRole("editor", ["post.edit"], "global")
  .assignRole("alice", "editor", "global")
  // ACL: a single direct grant, no role needed
  .grant("bob", "post.publish", "global")
  // Tenant-scoped: a manager may archive, but only within acme
  .defineRole("manager", ["post.archive"], { tenant: "acme" })
  .assignRole("carol", "manager", { tenant: "acme" })
```

**2. Write a policy** that combines the facets. Inside a policy,
`this.permissions` is the resolved set and `this.sameTenant` enforces isolation.

```ts
import { BasePolicy } from "@c9up/warden"

interface Post {
  authorId: string
  tenantId?: string | null
}

export class PostPolicy extends BasePolicy {
  // RBAC / ACL — both fold into the same resolved set
  edit(user: { id: string }, post: Post) {
    return this.permissions.has("post.edit") || user.id === post.authorId // + ownership
  }

  publish() {
    return this.permissions.has("post.publish")
  }

  // tenant-scoped permission with explicit isolation
  archive(_user: { id: string }, post: Post) {
    return this.sameTenant(post) && this.permissions.has("post.archive")
  }
}
```

**3. Wire it** in `config/auth.ts` — register the policy, the abilities, and how
a request's tenant scope is derived:

```ts
import { defineConfig } from "@c9up/warden/config"
import { PostPolicy } from "#app/policies/post_policy.js"
import { rights } from "#app/rights.js"

export default defineConfig({
  // ...jwt config...
  rights: { store: rights },
  policies: { PostPolicy },
  resolveScope: (ctx) =>
    ctx.request.headers["x-tenant"]
      ? { tenant: ctx.request.headers["x-tenant"] }
      : "global",
})
```

Then register `initializeBouncer` as a global middleware (after the auth
middleware) so `ctx.bouncer` is built per request — see
[HTTP integration](/en/modules/warden#http-integration).

**4. Authorize in a handler:**

```ts
class PostController {
  async update(ctx) {
    const post = await Post.find(ctx.params.id)
    await ctx.bouncer.with("PostPolicy").authorize("edit", post) // 403 on denial
  }
}
```

`alice` passes `edit` through her editor role; the post's author passes it
through ownership; `bob` can `publish` via his direct grant; `carol` can
`archive` an acme post but not a globex one. No token needs to carry any of
these — they all resolve from the rights store.

## Migration

Pre-56, authorization was spread across three mechanisms. Each maps cleanly onto
the unified layer — and **no compatibility shim was kept** (clean replace).

### Guard RBAC — `@Role` / `@Permission` / `hasRole` / `hasPermission`

These still exist, but they are now **resolver-backed**: `@Role` and
`@Permission` on a route, and the `hasRole` / `hasPermission` helpers, all read
the same `RightsResolver.resolve(user, scope)` set instead of their own logic.

- **What stays the same** — the decorators and helper names, and the
  AND-gate semantics (a user must satisfy every required role *and* permission).
- **What changed** — the helpers are now **async** (resolution may hit a DB).
  A token-carried `user.permissions` claim is **no longer** an authorization
  input; seed permissions in the rights store instead.

### Station — `defineResource({ policies })` callbacks

Station's per-action `PolicyFn` callback table is **removed**. Coarse access is
now a `${resource}.${action}` permission gate resolved through Warden, and
per-row ownership moves into a Warden Bouncer **policy** (where `this.permissions`
and the resource are both available). See the
[Station authorization section](/en/modules/station#authorization) for the
ownership note. This coarse gate resolves permissions at **global scope** — a
grant scoped to a single tenant does not gate a Station admin action, since the
admin surface is a global concern.

```ts
// before (54.4): a PolicyFn table on the resource
defineResource({ policies: { update: (user, row) => user.id === row.ownerId } })

// after: a coarse permission gate + a Bouncer policy for per-row ownership
class ArticlePolicy extends BasePolicy {
  update(user: { id: string }, row: { ownerId: string }) {
    return this.permissions.has("article.update") && user.id === row.ownerId
  }
}
```

### The fail-closed admin stopgap

The Epic 54 fail-closed stopgap (which denied admin actions outright until a
real policy existed) is **removed**. Grant the corresponding
`<resource>.<action>` permissions in the rights store instead:

```ts
rights
  .defineRole("admin", ["user.create", "user.delete", "article.update"], "global")
  .assignRole("root", "admin", "global")
```

### DB-backed rights store

The shipped store is in-memory. For production, copy in a `RightsStore` adapter
backed by your database — there is **no hard DB dependency**. The full
`AtlasRightsStore` snippet is in the module reference:
[DB-backed adapter](/en/modules/warden#db-backed-adapter).

### No shims

The three old mechanisms were replaced, not wrapped. There is no
`checkPolicy`, no `PolicyFn`, and no `@deprecated` alias to fall back on — the
unified layer is the only path, and a package-shape test fails the build if any
of them reappear.
