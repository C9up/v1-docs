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
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). |

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

A refusal raised at boot or by the registry is a class of the `errors` namespace and a `@c9up/flare` `Exception` (status 500): branch on `error.code` or on `error instanceof errors.E_STATION_*`, with `import { errors } from '@c9up/station'`. The sign-in and CSRF codes are not thrown: they are the `code` of the refused HTTP response.

| Code | Raised when |
|---|---|
| [`E_STATION_LOGIN_CREDENTIALS_REQUIRED`](/en/reference/errors#e-station-login-credentials-required) | The sign-in form was sent without an email or a password (400). |
| [`E_STATION_LOGIN_IDENTIFIER_TOO_LONG`](/en/reference/errors#e-station-login-identifier-too-long) | The sign-in email is longer than 254 characters (400). |
| [`E_STATION_INVALID_CREDENTIALS`](/en/reference/errors#e-station-invalid-credentials) | Invalid email or password (401). |
| [`E_STATION_TOO_MANY_LOGIN_ATTEMPTS`](/en/reference/errors#e-station-too-many-login-attempts) | Too many sign-in attempts (429). |
| [`E_STATION_LOGIN_UNAVAILABLE`](/en/reference/errors#e-station-login-unavailable) | Sign-in is temporarily unavailable (503). |
| [`E_STATION_CSRF_REQUIRED`](/en/reference/errors#e-station-csrf-required) | An admin action lacks an active, verified CSRF token (403). |
| [`E_VALIDATION_ERROR`](/en/reference/errors#e-validation-error-station) | An admin form failed validation (422 for JSON clients; a browser is redirected back). |
| [`E_STATION_NOT_BOOTED`](/en/reference/errors#e-station-not-booted) | The `services/main` registry was used before `StationProvider` booted, or before `setStation()`. |
| [`E_STATION_INVALID_RESOURCE`](/en/reference/errors#e-station-invalid-resource) | `defineResource()` was given an invalid declaration (entity, name, actions, column lists, `formFields`, `audit`, `onAuditError`). |
| [`E_STATION_DUPLICATE_RESOURCE`](/en/reference/errors#e-station-duplicate-resource) | Two resources were registered under the same name. |
| [`E_STATION_UNKNOWN_RESOURCE`](/en/reference/errors#e-station-unknown-resource) | `getOrThrow()` named a resource that is not registered. |
| [`E_STATION_UNKNOWN_COLUMN`](/en/reference/errors#e-station-unknown-column) | A resource's `list.columns`, `show.columns` or `editable` names a property that is not a column of the entity. |
| [`E_STATION_COLUMN_NOT_EDITABLE`](/en/reference/errors#e-station-column-not-editable) | `editable` names a column the framework manages (primary key, timestamp, relation, soft delete) or one `formFields` hides. |
| [`E_STATION_PRIMARY_KEY_MISSING`](/en/reference/errors#e-station-primary-key-missing) | An admin entity declares no `@PrimaryKey()` column. |
| [`E_STATION_INVALID_CONFIG`](/en/reference/errors#e-station-invalid-config) | A `station` option is invalid (`audit`, `permissionPrefix`, `guard`, `loginRateLimit`). |
| [`E_STATION_UNKNOWN_GUARD`](/en/reference/errors#e-station-unknown-guard) | `station.guard` names a guard warden does not know. |
| [`E_STATION_GUARD_NOT_JWT`](/en/reference/errors#e-station-guard-not-jwt) | The admin guard does not issue a bearer token; Station needs a JWT guard. |
| [`E_STATION_AUTH_REQUIRED`](/en/reference/errors#e-station-auth-required) | No working `auth` binding is registered while `requireAuth: true` is set, or outside development and test. |
| [`E_STATION_DATABASE_REQUIRED`](/en/reference/errors#e-station-database-required) | No `db` connection is registered for the admin (register `@c9up/atlas/provider`). |
| [`E_STATION_RUNE_REQUIRED`](/en/reference/errors#e-station-rune-required) | A resource with write forms needs `@c9up/rune`, which is not installed. |
| [`E_STATION_INKER_REQUIRED`](/en/reference/errors#e-station-inker-required) | No `@c9up/inker` view engine is registered to render the admin. |
| [`E_STATION_INKER_UNUSABLE`](/en/reference/errors#e-station-inker-unusable) | `@c9up/inker` is registered but does not resolve to a usable view renderer; see `cause`. |
| [`E_STATION_ROUTE_MIDDLEWARE_UNSUPPORTED`](/en/reference/errors#e-station-route-middleware-unsupported) | `station.middleware` is set but the router's routes have no `middleware()` method. |
| [`E_STATION_INTERNAL`](/en/reference/errors#e-station-internal) | An internal invariant broke (the view engine was not initialised); report it as a bug. |

## Migration

- A refusal is no longer a plain `Error` or `TypeError`: test `error.code`, or `error instanceof errors.E_STATION_*`. The ones that were a `TypeError` (a `defineResource()` option or `station.audit` of the wrong type) no longer are: replace `instanceof TypeError` with `error.code === 'E_STATION_INVALID_RESOURCE'` or `'E_STATION_INVALID_CONFIG'`.

## See also

- [Admin panel](/en/guides/digging-deeper/admin/)
- [Authorization and writes](/en/guides/digging-deeper/admin/authorization)
- [Sign-in, CSRF and audit](/en/guides/digging-deeper/admin/sign-in)
