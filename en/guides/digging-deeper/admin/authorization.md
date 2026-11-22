# Authorization and writes

This guide covers who may see and change what:

- Authorization
- Mass-assignment & validation

## Authorization

Station authorizes every admin action exclusively through Warden's unified
authorization layer. There is no Station-local RBAC: the gate's decisions are
`auth.hasPermission(user, "station.access", "global")` to enter the admin, then
`auth.hasPermission(user, "station.<resource>.<action>", "global")` per action,
resolved by the
same `RightsResolver` that answers a coarse `auth.hasPermission` call and a
Warden Bouncer policy (the single resolution point).

### Per-action permission convention

Each action is gated behind a permission named
`<prefix>.<resource>.<action>`, where `<prefix>` is `station.permissionPrefix`
(`"station"` by default), `<resource>` is the resource slug (lowercase,
kebab-case) and `<action>` is one of the five CRUD actions:

| Action    | Permission              |
| --------- | ----------------------- |
| `list`    | `station.users.list`    |
| `show`    | `station.users.show`    |
| `create`  | `station.users.create`  |
| `edit`    | `station.users.edit`    |
| `destroy` | `station.users.destroy` |

The namespace keeps admin rights apart from the application's own: a role
granted `users.edit` for a feature of the public application does not open the
admin.

Before any action, a request must also hold the **access permission**
(`station.access`, or `<prefix>.access`). Set `station.accessPermission` to
another name, or to `false` to rely on the per-action permissions alone.

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
  "station.access",
  "station.users.list",
  "station.users.show",
  "station.users.create",
  "station.users.edit",
  "station.users.destroy",
]);
store.assignRole(adminUserId, "admin");
// optional one-off grants, no role needed:
store.grant(editorUserId, "station.access");
store.grant(editorUserId, "station.users.edit");

// wire the seeded store via config/auth.ts -> rights: { store }
```

A host that wires Warden but seeds nothing gets a `403` on every admin request;
Station emits a one-time boot warning pointing at this when the auth layer is
wired.

### The `requireRole` blanket gate

Setting `station.requireRole` adds a coarse gate in front of every `/admin/*`
route, on top of the access permission, resolved through
`auth.hasRole(user, role, "global")`. An authenticated
user without that role gets `403` (not a redirect); a request with no valid
token gets `401` (JSON) or a redirect to the login page (HTML).

### No authentication

When `@c9up/warden` is not wired, the admin can only mount open in a process
whose `NODE_ENV` is `development` or `test`, or one of their aliases `dev`,
`develop` and `testing` (in any case): every action is allowed and Station
emits a loud boot warning. In any other environment — `production`, `prod`,
`staging`, an unset `NODE_ENV` — Station refuses to start, because an open admin
is full create, update and delete for anyone who can reach it. Set
`station.requireAuth: false` to state that an unauthenticated admin is intended;
the warning then names the environment it runs in.

## Mass-assignment & validation

Station validates every admin **create**/**update** body against a
[`@c9up/rune`](/en/guides/basics/validation/) schema it derives — once, at mount — from the resource
entity's atlas `@Column` metadata, restricted to the
[editable columns](/en/guides/digging-deeper/admin/#columns-what-each-view-shows-and-what-a-write-may-set): the
primary key, framework-managed timestamps (`created_at` / `updated_at` /
`deleted_at` and any `autoCreate`/`autoUpdate` column), the soft-delete column,
relations, secrets and hidden fields are excluded unless `editable` says
otherwise. Because the schema contains only those columns, **mass-assignment
protection is inherent** — a body carrying an unknown key, a hidden or secret
column, the PK, or a timestamp has those keys dropped automatically; they never
reach the repository.

Form posts arrive as strings, and rune does **not** coerce, so the derivation
adds the coercion the wire shape needs: `number`/`integer` columns accept a
numeric string (`"42"` → `42`; a non-numeric value fails), and boolean columns
are read as checkboxes (a checked box → `true`, an **absent** box → `false`, so
an unchecked box clears the column on edit). Only editable booleans are read
this way: a boolean that is not on the form keeps its value. Other columns validate as strings.
A column is required when the model declares neither nullability nor a default.

Invalid input **fail-closes before any database write** — no row is created, no
entity mutated, no audit event emitted. The response depends on content
negotiation:

- **JSON / XHR** → `422` with `{ errors: [{ field, rule, message }] }` (the
  shape of ream's own `E_VALIDATION_ERROR` handler).
- **Browser (with a session)** → the PRG pattern: the submitted input and
  per-field errors are flashed to `ctx.session`, then `redirect().back()` to the
  form, which re-reads the flash and re-renders with the values + errors. No body
  is re-POSTed on refresh. (Register ream's `SessionMiddleware` to enable this.)
- **Browser (no session)** → a graceful fallback: the form is re-rendered inline
  at `422` so the values + errors are never silently lost.

`@c9up/rune` is an optional peer, consumed through a tolerant dynamic import
(the same seam as atlas). When a write-capable admin is mounted but rune is not
installed, Station **refuses to boot** rather than accept unvalidated bodies —
there is no fallback to unchecked mass-assignment.

> **Requiredness caveat.** Requiredness is inferred from model metadata only, so
> a column whose default lives DB-side (a `SERIAL`, a SQL `DEFAULT`) with no
> model-declared default may be treated as required and reject a create that
> legitimately omits it. Declare the default on the model, or mark the column
> nullable, to relax it.
