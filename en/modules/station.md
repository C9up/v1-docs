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

Author the admin config with the `defineConfig` helper in `config/station.ts`:

```ts
import { defineConfig } from "@c9up/station";

export default defineConfig({
  requireAuth: true,
  requireRole: "admin",
});
```

| Option             | Default            | Effect                                                                                       |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------------- |
| `requireAuth`      | on when Warden is bound | `false` mounts the admin without authentication (see [No authentication](#no-authentication)). |
| `requireRole`      | none               | A role every request must hold, on top of `accessPermission`.                                |
| `permissionPrefix` | `"station"`        | Namespace of the admin permissions (`station.users.edit`).                                   |
| `accessPermission` | `"station.access"` | Permission needed to enter `/admin/*`; `false` removes this gate.                            |
| `loginPath`        | `"/admin/login"`   | Where an unauthenticated browser is sent.                                                    |
| `cookieName`       | `"station_auth"`   | Name of the auth cookie.                                                                     |
| `cookieSecure`     | see [Session cookie](#session-cookie-and-logout) | Forces the cookie's `Secure` flag on or off.                    |
| `loginRateLimit`   | 5 attempts / 15 min | Sign-in throttle; `{ maxAttempts, windowSeconds }`, `{ limiter }` or `false`.               |
| `middleware`       | none               | Named router middleware attached to every admin route.                                       |
| `audit`            | none               | Sink for sign-in, logout and refusal events (see [Audit trail](#audit-trail)).               |

## Views (Inker)

Station renders its admin pages through [`@c9up/inker`](./inker) templates that
ship inside the package, rather than a hand-rolled view layer. The templates
live in the package `templates/` root (`templates/layout.inker`, the shared
shell, and per-page templates such as `templates/errors/404.inker`), resolved
from the module URL so the same path holds whether Station runs from source or
from its published build.

Package views use a named disk and `namespace::template`. Station does not construct its own view engine: it
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

## Pagination

The list view paginates through atlas's [`ModelQuery.paginate(page, perPage)`](./atlas)
rather than a hand-rolled page/count/`ceil` computation. A single
`repo.query().orderBy(pk, "desc").paginate(page, perPage)` call runs the parallel
`COUNT(*)` + `LIMIT/OFFSET` fetch and returns a `Paginator` whose
`.meta` = `{ total, perPage, currentPage, lastPage, firstPage }` drives the table
caption and pager. Station no longer duplicates the `lastPage = ceil(total / perPage)`
math — atlas owns it.

Two thin policy wrappers stay on top:

- **`MAX_PER_PAGE` clamp (100).** atlas floors `perPage` to ≥ 1 but does not cap it,
  so Station still clamps `?perPage` down to `100` (warning once per process on the
  first over-cap request).
- **Redirect-to-last-page.** Requesting a page past the end (`page > meta.lastPage`
  while `meta.total > 0`) 302-redirects to `/admin/<name>?page=<lastPage>&perPage=<perPage>`
  so the caller never lands on an empty page. A page so large that its offset
  would exceed `Number.MAX_SAFE_INTEGER` is redirected the same way (to page 1
  when the table is empty) without reaching the database.

## Columns: what each view shows and what a write may set

A column holding a secret is kept out of the admin unless the resource names
it. Secrets are columns declared `@Column({ serializeAs: null })` and columns
whose name contains `password`, `passwd`, `secret`, `token` or `apikey`.

- **List and show** render every column except secrets. `list.columns` and
  `show.columns` replace that with an explicit list, in the given order.
- **Create and edit** accept the **editable** columns only, which are also the
  form's fields. By default: every column except the primary key, managed
  timestamps, the soft-delete column, relations, secrets and the fields
  `formFields` marks `hidden`. `editable` replaces that with an explicit list.

```ts
defineResource({
  entity: User,
  list: { columns: ["id", "email", "isAdmin"] },
  show: { columns: ["id", "email", "isAdmin", "createdAt"] },
  editable: ["email", "password"],
});
```

A field hidden with `formFields: { isAdmin: { hidden: true } }` is not writable
either: a body carrying it is ignored, and a hidden boolean keeps its stored
value on every edit. Naming an unknown column, a framework-managed column or a
hidden field in one of these lists fails at boot.

A secret listed in `editable` is **write-only**: the form renders it empty, and
on an edit an empty submission keeps the stored value. A `password` input is
never pre-filled, whatever the column.

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
whose `NODE_ENV` is `development` or `test`: every action is allowed and Station
emits a loud boot warning. In any other environment — `production`, `prod`,
`staging`, an unset `NODE_ENV` — Station refuses to start, because an open admin
is full create, update and delete for anyone who can reach it. Set
`station.requireAuth: false` to state that an unauthenticated admin is intended;
the warning then names the environment it runs in.

## Sign-in, session cookie and logout

### Brute-force protection

`POST /admin/login` counts every attempt under the client IP and under the
submitted email (lower-cased) **before** checking the password. The sixth
attempt in 15 minutes on either key is refused with `429` and a `Retry-After`
header, without reaching the credential check; a successful sign-in clears both
counters. A limiter that fails (a store outage) refuses the attempt with `503`.

The counters live in the process's memory by default. In a cluster, pass a
shared limiter — Warden's `AuthRateLimiter` over a `RedisAttemptStore` has the
expected shape and uses the same keys:

```ts
import { AuthRateLimiter, RedisAttemptStore } from "@c9up/warden";

export default defineConfig({
  loginRateLimit: {
    limiter: new AuthRateLimiter({ store: new RedisAttemptStore(redis) }),
  },
  // or tune the in-memory one: { maxAttempts: 10, windowSeconds: 600 }
});
```

`station.middleware` attaches named router middleware to every admin route,
for an application that applies its own throttling or headers.

### Session cookie and logout

The auth cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/admin` (the token
is never sent to the rest of the application) and lives as long as the browser
session. It is `Secure` everywhere except a `development`/`test` process served
over plain HTTP; `station.cookieSecure` forces the flag either way.

Logout revokes the token it carried through the auth guard's `revoke(token)`
before clearing the cookie, so a copy taken earlier is refused afterwards.
With Warden's JWT guard this needs a `blacklist`; without one, Station warns
once that logged-out tokens stay valid until they expire.

The sign-in page only displays messages Station produced; it never reads an
error message from the query string.

## Audit trail

Each resource's `audit` sink receives an event after every successful write:
`action`, `resource`, `recordId`, `userId`, the `before`/`after` images, the
client `ip`, `userAgent` and `requestId`, and `at`.

Secret column values (as defined in [Columns](#columns-what-each-view-shows-and-what-a-write-may-set))
are replaced with `"[redacted]"` in `before` and `after`. An edit that changes
one still says so: `redactedChanges` lists the secret columns whose value
changed. `defineResource({ auditSecrets: true })` hands the raw values to the
sink instead.

`station.audit` receives the security events of the admin surface:

| `action`          | When                                                  |
| ----------------- | ----------------------------------------------------- |
| `login`           | A successful sign-in (`userId`, `identifier`).        |
| `login_failed`    | Wrong credentials (`identifier`).                     |
| `login_throttled` | A sign-in refused by the rate limit (`identifier`).   |
| `logout`          | A logout (`userId`).                                  |
| `denied`          | A missing role or permission (`permission`, and `resource` / `resourceAction` for an action). |
| `csrf_denied`     | A write refused because CSRF was not verified.        |

Each carries `path`, `ip`, `userAgent`, `requestId` and `at`. A sink that throws
is logged and never changes the response.

```ts
export default defineConfig({
  audit: (event) => logger.info({ event }, "admin security event"),
});
```

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

## Mass-assignment & validation

Station validates every admin **create**/**update** body against a
[`@c9up/rune`](./rune) schema it derives — once, at mount — from the resource
entity's atlas `@Column` metadata, restricted to the
[editable columns](#columns-what-each-view-shows-and-what-a-write-may-set): the
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

## Migration note (from the 54.4 policy callbacks)

The `defineResource({ policies })` callback table — the per-action
`(ctx) => boolean` `PolicyFn` API and its fail-closed inline admin default —
has been removed.

The per-action permissions were renamed from `<resource>.<action>` to
`station.<resource>.<action>`, and entering the admin now requires
`station.access`: re-seed the roles accordingly, or set `permissionPrefix` /
`accessPermission` to match an existing scheme. Express authorization as Warden roles, permissions, and
grants instead (see the seeding example above).

Per-row ownership checks (for example `user.id === row.ownerId`) are no longer
expressible in Station's coarse permission gate, which has no access to the
loaded row. Ownership is a Warden Bouncer-policy concern, reached through the
fuller Bouncer path rather than Station's coarse gate.

See [Warden](./warden) for the authentication and authorization layer Station
consumes.
