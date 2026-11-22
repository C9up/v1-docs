# Introduction

This guide covers the admin panel, station:

- Config
- Views (Inker)
- Pagination
- Columns: what each view shows and what a write may set
- Migration note (from the 54.4 policy callbacks)

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
| `requireAuth`      | on when Warden is bound | `false` mounts the admin without authentication (see [No authentication](/en/guides/digging-deeper/admin/authorization#no-authentication)). |
| `requireRole`      | none               | A role every request must hold, on top of `accessPermission`.                                |
| `guard`            | the auth manager's default guard | The Warden guard sign-in, the gate and logout go through (see [Sign-in](/en/guides/digging-deeper/admin/sign-in#sign-in-session-cookie-and-logout)). |
| `permissionPrefix` | `"station"`        | Namespace of the admin permissions (`station.users.edit`).                                   |
| `accessPermission` | `"station.access"` | Permission needed to enter `/admin/*`; `false` removes this gate.                            |
| `loginPath`        | `"/admin/login"`   | Where an unauthenticated browser is sent.                                                    |
| `cookieName`       | `"station_auth"`   | Name of the auth cookie.                                                                     |
| `cookieSecure`     | see [Session cookie](/en/guides/digging-deeper/admin/sign-in#session-cookie-and-logout) | Forces the cookie's `Secure` flag on or off.                    |
| `loginRateLimit`   | 5 attempts / 15 min | Sign-in throttle; `{ maxAttempts, windowSeconds }`, `{ limiter }` or `false`.               |
| `middleware`       | none               | Named router middleware attached to every admin route.                                       |
| `audit`            | none               | Sink for sign-in, logout and refusal events (see [Audit trail](/en/guides/digging-deeper/admin/sign-in#audit-trail)).               |

## Views (Inker)

Station renders its admin pages through [`@c9up/inker`](/en/guides/frontend/templates/) templates that
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

The list view paginates through atlas's [`ModelQuery.paginate(page, perPage)`](/en/guides/database/orm/)
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

- **List and show** render every column except secrets and fields the form
  renders as a password input (`formFields.<col>.inputType: "password"`).
  `list.columns` and `show.columns` replace that with an explicit list, in the
  given order; naming such a column there is the opt-in that shows it.
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
on an edit an empty submission keeps the stored value. A field whose
`formFields` entry sets `inputType: "password"` is write-only too, whatever the
column's name: never pre-filled, kept out of the old input flashed back after a
failed validation, and redacted in audit snapshots.

Station never parses a request body itself: it reads `ctx.request.body()`, which
stays `{}` unless the host's body parser handled the request. Keep the body
parser registered in `start/kernel.ts` (the scaffolded default), ahead of every
route, or every admin form post — the sign-in included — reaches Station empty.

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

See [Warden](/en/guides/auth/introduction) for the authentication and authorization layer Station
consumes.
