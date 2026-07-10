# Station — Admin

`@c9up/station` is Ream's admin scaffolding: it turns an Atlas entity into a
CRUD admin surface (list / show / create / edit / destroy) under `/admin/*`,
with form inference, an audit trail, and a login surface.

Station is one of Ream's integration packages — it adds an admin surface on top
of the Ream universe, consuming `@c9up/atlas` (data), `@c9up/warden`
(authentication and authorization), and `@c9up/ream`'s router. It consumes each
of them uniformly through the IoC container (resolved bindings + optional
peers), never through a hard static import, so a host that has not wired a given
peer degrades gracefully rather than failing to load.

## Config

Author the admin config with the `defineConfig` helper in `config/station.ts`
(AdonisJS config-helper parity):

```ts
import { defineConfig } from "@c9up/station";

export default defineConfig({
  requireAuth: true,
  requireRole: "admin",
});
```

## Views (Inker)

Station renders its admin pages through [`@c9up/inker`](./inker) templates that
ship inside the package, rather than a hand-rolled view layer. The templates
live in the package `templates/` root (`templates/layout.inker`, the shared
shell, and per-page templates such as `templates/errors/404.inker`), resolved
from the module URL so the same path holds whether Station runs from source or
from its published build.

This follows the **AdonisJS package-views pattern** (Edge `edge.mount(name, dir)`
+ `namespace::template`). Station does not construct its own view engine: it
resolves the host's **shared** inker renderer from the container under the
`"inker"` alias (the one `InkerProvider` binds), mounts its package `templates/`
directory as a named **disk** (`renderer.mount("station", …)`), and renders
`station::errors/404`. Inside a Station template, references to sibling
templates are namespaced too — the 404 declares `{% layout 'station::layout' %}`.

Like every other Ream-universe package Station integrates, the engine is
consumed **purely through the container** — exactly like `@c9up/warden`. There
is no static or dynamic `import "@c9up/inker"` anywhere in Station's source;
`@c9up/inker` is an **optional peer dependency** provided by the host.

Unlike Warden — whose absence keeps the open dev-preview path alive — the view
engine is a **hard render requirement**: there is no admin page without it. Once
an admin surface is registered, an unwired `"inker"` renderer fails **loud at
boot** (`register @c9up/inker (InkerProvider) to render admin views`) rather than
degrading silently or erroring on the first request. Wire `InkerProvider` (and
its `@c9up/rosetta` / router peers) before Station. A host that registers no
resources never needs it.

> **The admin view layer renders entirely through inker.** Every admin page —
> 404, `list`, `show`, the `create` / `edit` form, and `login` — renders through
> inker (`templates/list.inker`, `templates/show.inker`, `templates/form.inker`,
> `templates/login.inker`). Each handler builds a pure view-model and inker owns
> the HTML-escaping. The form and login views emit their CSRF hidden input via
> inker's canonical `{{ csrfField() }}` helper (guarded so a host without CSRF
> still renders). The hand-rolled TS view layer has been **retired** — there is
> no parallel view implementation left, and inker's `{{ }}` auto-escaping owns
> all view escaping. The only TS escaper that remains is a tiny local helper for
> the 404 / 405 error bodies that are sent as `text/html` outside the inker
> renderer; it escapes the same five characters as inker.

## Authorization

Station authorizes every admin action exclusively through Warden's unified
authorization layer. There is no Station-local RBAC: the gate's only decision
is `auth.hasPermission(user, "<resource>.<action>", "global")`, resolved by the
same `RightsResolver` that answers a coarse `auth.hasPermission` call and a
Warden Bouncer policy (the single resolution point).

### Per-action permission convention

Each action is gated behind a permission named `<resource>.<action>`, where
`<resource>` is the resource slug (lowercase, kebab-case) and `<action>` is one
of the five CRUD actions:

| Action    | Permission      |
| --------- | --------------- |
| `list`    | `users.list`    |
| `show`    | `users.show`    |
| `create`  | `users.create`  |
| `edit`    | `users.edit`    |
| `destroy` | `users.destroy` |

The gate is fail-closed: an authenticated user without the required permission
gets `403`; a request with no authenticated user is denied before the action
runs.

### Consumed through the `"auth"` alias

Station never imports `@c9up/warden`. It resolves the AuthManager from the
container under the `"auth"` string alias that `WardenProvider` registers for
exactly this purpose, and calls `hasPermission` / `hasRole` on it. `@c9up/warden`
stays an optional peer dependency. This is the same pattern Station uses to
consume `@c9up/ream` and `@c9up/atlas`.

### Seeding roles and permissions

Authorization is expressed as Warden roles, permissions, and direct grants in
the rights store — never as claims stuffed into the token (a token cannot grant
itself access). Seed them where you configure Warden:

```ts
import { MemoryRightsStore } from "@c9up/warden";

const store = new MemoryRightsStore();
store.defineRole("admin", [
  "users.list",
  "users.show",
  "users.create",
  "users.edit",
  "users.destroy",
]);
store.assignRole(adminUserId, "admin");
// optional one-off grant, no role needed:
store.grant(editorUserId, "users.edit");

// wire the seeded store via config/auth.ts -> rights: { store }
```

A host that wires Warden but seeds nothing gets a `403` on every admin request;
Station emits a one-time boot warning pointing at this when the auth layer is
wired.

### The `requireRole` blanket gate

Setting `station.requireRole` adds a coarse gate in front of every `/admin/*`
route, resolved through `auth.hasRole(user, role, "global")`. An authenticated
user without that role gets `403` (not a redirect); a request with no valid
token gets `401` (JSON) or a redirect to the login page (HTML).

### Dev-preview (no auth)

When `@c9up/warden` is not wired (or `station.requireAuth: false`), the gate
runs in dev-preview open mode: every action is allowed and Station emits a loud
boot warning that the admin is mounted without auth. This mode is for local
development only — never production.

## CSRF enforcement (fail-closed)

Every admin **write** route (`create`, `update`, `destroy`, plus login and
logout) requires an active, **verified** CSRF token. Station enforces this by
reading `ctx.request.csrfProtected` — the trustworthy signal published by the
host's [`@c9up/blackhole`](./blackhole) middleware, which is `true` only when
CSRF was enabled, the method guarded, the route not excepted, and the token
validated. A request that is not CSRF-verified is refused with `403` **before**
any authorization or database work — a forged request never touches the repo.

Station hand-rolls **no** CSRF logic of its own: inker's `{{ csrfField() }}`
emits the token field, blackhole verifies the double-submit, ream carries the
`csrfProtected` signal, and Station enforces it. To wire it, register the
blackhole middleware with `csrf: true` in `start/kernel.ts` and keep `/admin/*`
out of `csrf.exceptRoutes` (the default host already does both). If the check is
missing — middleware unwired, `csrf: false`, or `/admin/*` excepted — writes
return `403` and Station logs one diagnostic pointing at the misconfiguration.

## Migration note (from the 54.4 policy callbacks)

The `defineResource({ policies })` callback table — the per-action
`(ctx) => boolean` `PolicyFn` API and its fail-closed inline admin default —
has been removed. Express authorization as Warden roles, permissions, and
grants instead (see the seeding example above).

Per-row ownership checks (for example `user.id === row.ownerId`) are no longer
expressible in Station's coarse permission gate, which has no access to the
loaded row. Ownership is a Warden Bouncer-policy concern, reached through the
fuller Bouncer path rather than Station's coarse gate.

See [Warden](./warden) for the authentication and authorization layer Station
consumes.
