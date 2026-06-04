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
