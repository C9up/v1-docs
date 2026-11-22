# Evaluating abilities

This guide covers how an ability is evaluated:

- Abilities
- The four verbs
- AuthorizationResponse
- Policies
- before / after hooks
- Multi-tenant scope
- HTTP integration

## Authorization (Bouncer evaluation)

Warden's authorization is two layers. Layer 1 — **Rights Resolution** above —
answers *what permissions does this user have?*. Layer 2 — the **Bouncer** —
answers *is this user allowed to do this thing?*, through standalone abilities, class-based policies with `before` /
`after` hooks, the `@allowGuest` / `@action` decorators, an
`AuthorizationResponse` value type, and the four verbs `allows` / `denies` /
`authorize` / `execute`.

The standalone-ability examples here write their predicates directly against
`(user, resource)`. The two layers connect through
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
resolves to `void` on allow and throws `E_AUTHORIZATION_FAILURE` (status 403 unless the
denial gives another) on deny.

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
AuthorizationResponse.deny("Not yours").t("errors.post_not_owned", { id: post.id }); // i18n key
```

`.t(identifier, data)` names the translation of the denial. It travels on the
thrown error (`error.response.translation`), and
`error.getResponseMessage(ctx)` resolves it through `ctx.i18n` when the request
has one.

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

The optional `before` and `after` hooks run around every action in this
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
  Bouncer with no resolver, gets an empty set. When the request came in with an
  access token, the set is narrowed by the token's abilities exactly as
  `ctx.auth.hasPermission()` is: `this.permissions.has('orders:delete')` is
  `false` for a token minted with `['orders:read']`, whatever the user holds.
  `hasAll`, `hasAny` and `permissions` are narrowed the same way; `roles` stay
  the user's.

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
see [RBAC helpers](/en/guides/auth/introduction#rbac-helpers).

### HTTP integration

In a Ream HTTP app you never construct a `Bouncer` by hand. The
`initializeBouncer` global middleware builds one **per request** and attaches it
as `ctx.bouncer`. Register it in `start/kernel.ts` as a global middleware, after
the auth middleware that populates `ctx.auth`:

```ts
// start/kernel.ts
import router from "@c9up/ream/services/router"
import { initializeBouncer } from "@c9up/warden/middleware"

// 1. Auth middleware — populates ctx.auth from the route's @Guard/@Role/
//    @Permission decorators. The lazy form uses warden's default export:
router.use([() => import("@c9up/warden/middleware")])
//    (equivalent direct form: import { wardenMiddleware }; router.use([wardenMiddleware]))

// 2. Bouncer — builds ctx.bouncer per request (guests included). Register AFTER
//    auth. It's a named export, so register the function directly (NOT
//    `() => initializeBouncer`, which Ream would try to `new`):
router.use([initializeBouncer])
```

It builds `ctx.bouncer` from three things, all registered by `WardenProvider`
from your `config/auth.ts`:

- the authenticated user — `ctx.auth?.user`, or `null` for a guest. It is read
  when the first check runs, not when the middleware runs, so a handler that
  calls `await ctx.auth.authenticate()` and then authorizes is judged as the
  user it just signed in;
- the shared `RightsResolver` (Layer 1), so `this.permissions` inside a policy
  resolves against the rights store;
- the `bouncer:registry` — the `abilities` / `policies` tables and the optional
  `resolveScope(ctx)` hook that derives the request's tenant scope.

You declare those in `config/auth.ts`:

```ts
// config/auth.ts
import { defineConfig } from "@c9up/warden/config"
import { Bouncer } from "@c9up/warden"
import { PostPolicy } from "#app/policies/post_policy.js"

export default defineConfig({
  // ...jwt / session config...
  abilities: {
    "post.edit": Bouncer.ability((user, post: { ownerId: string }) =>
      user.id === post.ownerId,
    ),
  },
  policies: { PostPolicy },
  // derive a tenant scope from a header / subdomain (omit ⇒ always "global")
  resolveScope: (ctx) =>
    ctx.request.headers["x-tenant"]
      ? { tenant: ctx.request.headers["x-tenant"] }
      : "global",
})
```

If the rights layer is not wired, `initializeBouncer` still attaches an empty
Bouncer rather than crashing — `ctx.bouncer` is always defined.

Inside a handler, authorize with the same four verbs, now scoped to the request:

```ts
class PostController {
  async update(ctx) {
    const post = await Post.find(ctx.params.id)
    // throws E_AUTHORIZATION_FAILURE (status 403) on denial
    await ctx.bouncer.authorize("post.edit", post)
    // ...or branch without throwing
    if (await ctx.bouncer.allows("post.publish", post)) { /* ... */ }
    // class-based policy by registered name
    await ctx.bouncer.with("PostPolicy").authorize("archive", post)
  }
}
```

When `authorize()` denies it throws `E_AUTHORIZATION_FAILURE` — an exported
class (a `WardenError`) whose `code` is `"E_AUTHORIZATION_FAILURE"`, carrying
`status` (403 unless the denial gives another), the denial's message ("Access
denied" when it has none) and the `AuthorizationResponse` itself as
`error.response`. Ream's `ExceptionHandler` duck-types that `status` and maps it
to the response:

```json
{ "error": { "code": "E_AUTHORIZATION_FAILURE", "message": "Access denied" } }
```

An exception handler that wants the denial's translation reads it from the
error:

```ts
import { E_AUTHORIZATION_FAILURE } from "@c9up/warden"

if (error instanceof E_AUTHORIZATION_FAILURE) {
  error.response.translation  // { identifier, data } set by .t()
  error.getResponseMessage(ctx) // ctx.i18n.t(identifier, data, { defaultValue: message })
}
```

`getResponseMessage` falls back to the identifier `errors.E_AUTHORIZATION_FAILURE`
when the denial sets no translation, and to the plain message when the context
has no `i18n`.

A custom `deny(message, status)` — or a policy `before` returning
`deny("not found", 404)` — propagates **its own** status through to the response,
so a policy can answer 404 instead of leaking that a resource exists.

The per-request Bouncer resolves a user's permissions **once per request** and
shares the result across every check in that request (memoised on the instance).

---
