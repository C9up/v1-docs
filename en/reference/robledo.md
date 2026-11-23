# robledo

`@c9up/robledo`: over-the-air updates for a ream app's mobile build, signed by `ream android:publish`, served by the app, verified on the phone and rolled back when they never reach their first screen. Guide: [Over-the-air updates](/en/guides/mobile/building#over-the-air-updates).

## Installation

```bash
pnpm add @c9up/robledo
```

Add `() => import('@c9up/robledo/provider')` to the providers in `reamrc.ts`, and set `mobile.updates` there for the app build. The app built by `ream android:*` gets the native module through autolinking.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/robledo` | The server side: the `Robledo` class, its config type, the route helper and the error class. |
| `@c9up/robledo/provider` | `RobledoProvider` (default export): binds `Robledo` and hands it the host router. |
| `@c9up/robledo/services/main` | The application's `Robledo` instance (default export), usable once the provider booted. |
| `@c9up/robledo/mobile` | The app's side, run on the phone: check, download and stage updates, and confirm the running one. |

## Exports

### `@c9up/robledo`

| Export | Kind | Description |
|---|---|---|
| `Robledo` | class | Serves the updates `ream android:publish` signed and wrote under the app's `robledo/` directory. |
| `RobledoConfig` | interface | The `robledo` config. |
| `LatestUpdate` | interface | `{ manifest: string; signature: string }`: the newest update's manifest text and its signature. |
| `registerRobledoRoutes` | function | Mounts robledo's two routes on a router. |
| `RobledoRouter` | interface | The router shape the routes need: `get(path, handler)`. |
| `RobledoHttpContext` | interface | The part of an HTTP context the routes use. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |

### `Robledo`

The server signs nothing and holds no key: each update is checked on the phone against the key built into the app.

| Member | Signature | Description |
|---|---|---|
| constructor | `new Robledo(config?: RobledoConfig, resolvePath?: (path: string) => string)` | `resolvePath` resolves against the app's root. Throws `E_ROBLEDO_INVALID_PREFIX` for a bad `prefix`. |
| `directory` | `readonly directory: string` | The resolved directory of published updates. |
| `prefix` | `readonly prefix: string` | The routes' prefix. |
| `latest` | `latest(platform: string, runtime: string): Promise<LatestUpdate \| null>` | The newest update published for this platform (`android`, `ios`) and runtime, or `null`. |
| `filePath` | `filePath(platform: string, runtime: string, id: string, segments: readonly string[]): string \| null` | Where a file of an update is on disk, or `null` for a path that is not one (unknown platform, malformed runtime or id, a segment leaving the update's `files/`). |
| `registerRoutes` | `registerRoutes(): void` | Puts the two routes on the router; call it from a preload so they exist before the server listens. Calling it again does nothing. |
| `hasRegisteredRoutes` | `hasRegisteredRoutes(): boolean` | Whether `registerRoutes` ran. |

The routes:

| Route | Answer |
|---|---|
| `GET <prefix>/:platform/:runtime/latest` | The newest update as JSON (`cache-control: no-store`), or 204 when there is none. |
| `GET <prefix>/:platform/:runtime/:id/files/*` | One of its files, cached as immutable; 404 for a path that is not one. |

### `registerRobledoRoutes`

| Function | Signature | Description |
|---|---|---|
| `registerRobledoRoutes` | `registerRobledoRoutes(router: RobledoRouter, robledo: Robledo): void` | Mounts the routes on `router` directly, for a host that wires them itself. |

### `@c9up/robledo/provider`

| Export | Kind | Description |
|---|---|---|
| `RobledoProvider` | provider (default) | `register()` binds the `Robledo` singleton from the `robledo` config; `boot()` gives it the `router` binding when there is one. It mounts no route itself. |
| `RobledoAppContext` | interface | What the provider reads of the application: `container`, `config`, `makePath`. |

### `@c9up/robledo/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `Robledo`. Before the provider booted, any property access throws `E_ROBLEDO_NOT_BOOTED`. |

```ts
// start/routes.ts
import robledo from '@c9up/robledo/services/main'

robledo.registerRoutes()
```

### `@c9up/robledo/mobile`

| Export | Kind | Description |
|---|---|---|
| `checkForUpdate` | function | Asks the server for a newer update and stages it for the next start. |
| `markReady` | function | Tells robledo the running update reached its first screen. |
| `updateStatus` | function | What the native side knows: server, runtime, platform, current and pending update. |
| `CheckResult` | type | What `checkForUpdate` resolves to. |
| `UpdateStatus` | interface | What `updateStatus` returns. |
| `NativeRobledo` | interface | The native module, structurally: `status()`, `stage(…)`, `ready()`. |
| `NATIVE_MODULE_NAME` | const | `"NativeRobledo"`. |
| `errors` | namespace | The same namespace as `@c9up/robledo`'s, see [Errors](#errors) |

| Function | Signature | Description |
|---|---|---|
| `checkForUpdate` | `checkForUpdate(options?: { fetch?: Fetch }): Promise<CheckResult>` | Fetches `<url>/<platform>/<runtime>/latest`, downloads the files the manifest lists, and hands them to the native side, which verifies the signature and every digest before keeping them. The update takes effect at the next start. `fetch` defaults to the global one. |
| `markReady` | `markReady(): void` | Keeps the running update. An update that never calls it is abandoned at the start after, and the previous one runs again. |
| `updateStatus` | `updateStatus(): UpdateStatus` | Reads the native status. |

```ts
type CheckResult =
  | { kind: 'none' }
  | { kind: 'current'; id: string }
  | { kind: 'staged'; id: string }
```

| `UpdateStatus` field | Type | Description |
|---|---|---|
| `url` | `string` | The update server the app was built with. |
| `runtimeVersion` | `string` | The app's native runtime. |
| `platform` | `string` | The platform. |
| `current` | `string \| null` | The update running now, or `null` for the bundle inside the app. |
| `pending` | `string \| null` | An update staged for the next start. |

## Configuration

The `robledo` key, from `config/robledo.ts` or the config store.

| Option | Type | Default | Description |
|---|---|---|---|
| `directory` | `string` | `'robledo'` | Where the published updates are, from the app's root. |
| `prefix` | `string` | `'/__robledo'` | The routes' prefix: starts with `/` and does not end with one. |

The app side reads `mobile.updates` (`url`, `publicKey`) in `reamrc.ts` at build time; see the guide.

## Container bindings

| Token | Resolves to |
|---|---|
| `Robledo` | The `Robledo` singleton. |
| `'robledo'` | The same instance. |

## Errors

| Code | Raised when |
|---|---|
| [`E_ROBLEDO_INVALID_PREFIX`](/en/reference/errors#e-robledo-invalid-prefix) | The routes' prefix does not start with `/`, or ends with one. |
| [`E_ROBLEDO_NOT_BOOTED`](/en/reference/errors#e-robledo-not-booted) | `@c9up/robledo/services/main` is used before the provider booted. |
| [`E_ROBLEDO_NO_NATIVE_MODULE`](/en/reference/errors#e-robledo-no-native-module) | The app has no `NativeRobledo` module: it was not built with robledo installed. |
| [`E_ROBLEDO_BAD_RESPONSE`](/en/reference/errors#e-robledo-bad-response) | The server answered an update check, or a file download, with something other than an update. |
| [`E_ROBLEDO_REFUSED`](/en/reference/errors#e-robledo-refused) | The phone refused the update: bad signature, altered file, wrong runtime. |

## Migration

- `RobledoError` is gone: test `error.code`, or `error instanceof errors.E_ROBLEDO_*` with `import { errors } from '@c9up/robledo'` (or from `@c9up/robledo/mobile` on the phone).
- The `RobledoErrorCode` type is gone: `error.code` is a `string`.

## See also

- [Building the app](/en/guides/mobile/building)
- [orbit](/en/reference/orbit)
