# station

`@c9up/station`: an admin panel for a ream application, built from a declarative catalogue of resources (`defineResource`) that mounts list, show, create, edit and destroy routes under `/admin`, behind a sign-in, per-action permissions, CSRF checks and an audit trail. Guide: [Admin panel](/en/guides/digging-deeper/admin/).

## Installation

```bash
pnpm add @c9up/station
```

Add `() => import('@c9up/station/provider')` to the providers in `reamrc.ts`, and optionally a `config/station.ts`. The peers are optional for the package but needed for an admin surface: `@c9up/ream` (router), `@c9up/atlas` (the entities and the `db` connection), `@c9up/inker` (the views, required once a resource is declared), `@c9up/rune` (body validation, required when a resource mounts `create` or `edit`), and `@c9up/warden` (the sign-in and permission gate; without it the admin stays open).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/station` | `defineResource`, `defineConfig`, `ResourceRegistry`, the provider class, the resource and audit types, and the casing helpers. |
| `@c9up/station/provider` | `StationProvider` (default export) and its config types. |
| `@c9up/station/services/main` | The application's `ResourceRegistry` (default export). |

## Exports

### `@c9up/station`

| Export | Kind | Description |
|---|---|---|
| `defineResource` | function | Declares one admin resource from an entity class. |
| `defineConfig` | function | Types `config/station.ts`; identity at runtime. |
| `ResourceRegistry` | class | The catalogue of declared resources. |
| `StationProvider` | provider | Also the default export of `@c9up/station/provider`. |
| `StationConfig` | interface | The `station` config. |
| `StationAppContext` | interface | What the provider reads of the application. |
| `StationLoginRateLimitConfig` | interface | The sign-in throttle. |
| `StationLoginLimiter` | interface | A limiter shared across instances. |
| `Resource` | interface | A declared resource, as `defineResource` returns it. |
| `ResourceOptions` | interface | What `defineResource` takes. |
| `ResourceAction` | type | `'list' \| 'show' \| 'create' \| 'edit' \| 'destroy'`. |
| `RESOURCE_ACTIONS` | const | The five actions, frozen. |
| `FormFieldOverride` | interface | Per-field form overrides. |
| `AuditEvent`, `AuditSink` | type | A write's audit record and its sink. |
| `SecurityAuditEvent`, `SecurityAuditAction`, `SecurityAuditSink` | type | Sign-in, logout, denial and CSRF events and their sink. |
| `kebabCase`, `titleCase`, `pluralise` | function | `(input: string): string`: the casing used to derive slugs and labels. |

### `defineResource`

| Function | Signature | Description |
|---|---|---|
| `defineResource` | `defineResource<T>(options: ResourceOptions<T>): Resource<T>` | Throws when `entity` is not a class or `actions` is empty. |

| `ResourceOptions` field | Type | Default | Description |
|---|---|---|---|
| `entity` | `new (...args: never[]) => T` | required | The atlas entity class. |
| `label` | `string` | derived from the class | Shown in the admin sidebar. |
| `actions` | `ReadonlyArray<ResourceAction>` | all five | The actions mounted. |
| `name` | `string` | derived from the class | The URL slug. |
| `audit` | `AuditSink` | a once-per-process warning | Called after each successful write. |
| `auditSecrets` | `boolean` | `false` | Hand secret column values to the sink as they are; otherwise they are `"[redacted]"`. |
| `onAuditError` | `(event: AuditEvent, error: unknown) => void` | logged at `error` | Called when the sink throws; the write has already committed. |
| `formFields` | `Readonly<Record<string, FormFieldOverride>>` | | Overrides keyed by property name: `hidden`, `inputType`, `label`, `placeholder`, `required`. |
| `list`, `show` | `{ columns?: ReadonlyArray<string> }` | every non-secret column | The columns each view renders, in order. |
| `editable` | `ReadonlyArray<string>` | every column except framework-managed ones, secrets and hidden fields | The columns a create or edit may set; a secret listed here is write-only. |

`FormFieldOverride.inputType` is `'text' | 'number' | 'email' | 'password' | 'date' | 'datetime-local' | 'checkbox' | 'textarea'`.

### `ResourceRegistry`

| Member | Signature | Description |
|---|---|---|
| `register` | `register<T>(resource: Resource<T>): void` | Adds a resource and mounts its routes once the provider started; a duplicate name throws. |
| `get` | `get(name: string): Resource \| undefined` | |
| `getOrThrow` | `getOrThrow(name: string): Resource` | |
| `has` | `has(name: string): boolean` | |
| `count` | `count(): number` | |
| `all` | `all(): ReadonlyArray<Resource>` | In registration order. |
| `useMounter` | `useMounter(mounter: ResourceMounter): void` | Set by the provider; mounts what was already registered. |

### Audit events

| `AuditEvent` field | Type |
|---|---|
| `action` | `ResourceAction` |
| `resource` | `string` |
| `recordId`, `userId` | `unknown` |
| `before`, `after` | `Readonly<Record<string, unknown>>` |
| `redactedChanges` | `ReadonlyArray<string>` |
| `ip`, `userAgent`, `requestId` | `string` |
| `at` | `Date` |

`SecurityAuditEvent` carries `action` (`'login' | 'login_failed' | 'login_throttled' | 'logout' | 'denied' | 'csrf_denied'`), `userId`, `identifier`, `resource`, `resourceAction`, `permission`, `path`, `ip`, `userAgent`, `requestId` and `at`. A sink is `(event) => void | Promise<void>`.

### `@c9up/station/provider`

| Export | Kind | Description |
|---|---|---|
| `StationProvider` | provider (default) | `register()` binds the `ResourceRegistry`; `boot()` publishes it; `start()` reads the `station` config, loads the peers, mounts the sign-in surface and every resource as it is registered, and stops silently when a peer it needs is not installed. |
| `StationConfig`, `StationAppContext` | interface | |
| `resourcesNeedValidation`, `deriveWritableSchema`, `validateWritableBody`, `isModuleNotFound`, `isPackageMissing`, `resetStationProviderFlags` | function | Exported for the package's tests; not part of the application API. |

The routes, under the configured middleware:

| Route | Action |
|---|---|
| `GET /admin` | Redirects to the first listable resource, or the sign-in page. |
| `GET /admin/login`, `POST /admin/login`, `POST /admin/logout` | Sign-in and logout (with the auth gate). |
| `GET /admin/<slug>` | `list` |
| `GET /admin/<slug>/new`, `POST /admin/<slug>` | `create` |
| `GET /admin/<slug>/:id` | `show` |
| `GET /admin/<slug>/:id/edit`, `PUT /admin/<slug>/:id` | `edit` |
| `DELETE /admin/<slug>/:id` | `destroy` |

A form posting to `POST /admin/<slug>/:id` chooses the method with `_method`.

### `@c9up/station/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `ResourceRegistry`. Any property access before the provider booted throws. |

```ts
// start/admin.ts
import station from '@c9up/station/services/main'
import { defineResource } from '@c9up/station'
import User from '#models/user'

station.register(defineResource({ entity: User, label: 'Users' }))
```

## Configuration

`config/station.ts`, through `defineConfig`. Every key is optional.

| Option | Type | Default | Description |
|---|---|---|---|
| `requireAuth` | `boolean` | `true` when `@c9up/warden` is installed | Mount the sign-in surface and gate every `/admin/*` route. |
| `requireRole` | `string` | | A role required on top of `accessPermission`. |
| `permissionPrefix` | `string` | `'station'` | Actions need `<prefix>.<resource>.<action>`, entry needs `<prefix>.access`. |
| `accessPermission` | `string \| false` | `<prefix>.access` | The permission to enter `/admin/*`; `false` removes this gate. |
| `loginPath` | `string` | `'/admin/login'` | Where a failed auth check redirects. |
| `cookieName` | `string` | `'station_auth'` | The cookie carrying the auth token. |
| `cookieSecure` | `boolean` | on, except a development or test process over plain HTTP | The cookie's `Secure` flag. |
| `loginRateLimit` | `StationLoginRateLimitConfig \| false` | 5 attempts per IP and per identifier every 15 minutes, in memory | `maxAttempts`, `windowSeconds`, or a shared `limiter`; `false` turns it off. |
| `middleware` | `ReadonlyArray<string>` | | Named router middleware attached to every station route. |
| `guard` | `string` | the auth manager's default | The warden guard; it must be a token guard, a session guard is refused at boot. |
| `audit` | `SecurityAuditSink` | | Sink for the admin's security events. |

`StationLoginLimiter` is `{ attempt(...keys: string[]): Promise<{ allowed: boolean; retryAfterSeconds: number }>; clear(...keys: string[]): Promise<void> }`.

## Container bindings

| Token | Resolves to |
|---|---|
| `ResourceRegistry` | The registry singleton. |
| `'station'` | The same instance; declared on `ContainerBindings`. |

## Errors

| Code | Raised when |
|---|---|
| [`E_STATION_LOGIN_CREDENTIALS_REQUIRED`](/en/reference/errors#e-station-login-credentials-required) | The sign-in form was sent without an email or a password (400). |
| [`E_STATION_LOGIN_IDENTIFIER_TOO_LONG`](/en/reference/errors#e-station-login-identifier-too-long) | The sign-in email is longer than 254 characters (400). |
| [`E_STATION_INVALID_CREDENTIALS`](/en/reference/errors#e-station-invalid-credentials) | Invalid email or password (401). |
| [`E_STATION_TOO_MANY_LOGIN_ATTEMPTS`](/en/reference/errors#e-station-too-many-login-attempts) | Too many sign-in attempts (429). |
| [`E_STATION_LOGIN_UNAVAILABLE`](/en/reference/errors#e-station-login-unavailable) | Sign-in is temporarily unavailable (503). |
| [`E_STATION_CSRF_REQUIRED`](/en/reference/errors#e-station-csrf-required) | An admin action lacks an active, verified CSRF token (403). |
| [`E_VALIDATION_ERROR`](/en/reference/errors#e-validation-error-station) | An admin form failed validation (422 for JSON clients; a browser is redirected back). |

## See also

- [Admin panel](/en/guides/digging-deeper/admin/)
- [Authorization and writes](/en/guides/digging-deeper/admin/authorization)
- [Sign-in, CSRF and audit](/en/guides/digging-deeper/admin/sign-in)
