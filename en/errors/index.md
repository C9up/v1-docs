# Error Codes

Every framework error carries a stable `code` that starts with `E_`. A package's
own codes add the package name (`E_ATLAS_EMPTY_SELECT`, `E_WARDEN_FORBIDDEN`); a
few shared identifiers keep a plain form (`E_ROW_NOT_FOUND`,
`E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Search for the code below.

## Error Format

Errors raised by the framework core (`ReamError`) print a diagnostic box in
development:

```
┌──────────────────────────────────────────────┐
│ [E_CONTAINER_NOT_FOUND] No binding found for 'mailer'. Did you mean 'mail'?
│
│ Hint: Register it with container.singleton() or decorate with @inject().
│ Docs: https://docs.ream.dev/errors/E_CONTAINER_NOT_FOUND
└──────────────────────────────────────────────┘
```

An error raised inside the request pipeline adds a `Pipeline: <n>/<total> (<stage>)`
line. In production mode, only the code and message are shown.

An HTTP error answers with `{ "error": { "code": "…", "message": "…" } }` and the
error's `status`.

## Container Errors

| Code | Description |
|------|-------------|
| `E_CONTAINER_NOT_FOUND` | No binding found for the requested token. Includes "did you mean?" suggestions for typos. Register it with `container.singleton()` or decorate the class with `@inject()`. |
| `E_CIRCULAR_DEPENDENCY` | Circular dependency (or circular alias) detected during resolution. Use explicit factories or decouple via events. |
| `E_CONTAINER_MISSING_METADATA` | A class declares constructor parameters but the container finds no dependency metadata for them. Enable decorator metadata, annotate the parameters with `@inject()`, or declare `static containerInjections`. |
| `E_CONTAINER_RESERVED_TOKEN` | The token name reads as an `Object.prototype` key (`constructor`, `__proto__`…). Pick another name. |

## Router Errors

| Code | Description |
|------|-------------|
| `E_ROUTE_NOT_FOUND` | No route matches the requested method and path (404). |

## Pipeline Errors

| Code | Description |
|------|-------------|
| `E_PIPELINE_UNKNOWN_MIDDLEWARE` | A route references a named middleware that is not registered. Register it with `middleware.register()`. |
| `E_PIPELINE_DOUBLE_NEXT` | A middleware called `next()` more than once. Each middleware should call `next()` at most once. |
| `E_PIPELINE_ERROR` | A handler threw an error that carries no framework code. The error keeps the stage position in its context. |

## Photon Errors

Server-side errors are thrown from `@c9up/photon` (SSR / renderer); client-side errors are thrown from `@c9up/photon/client` (hydration / SPA-nav). Every code carries a `docsUrl` that resolves to its anchor below — operators can jump from the terminal directly to the recovery instructions.

### E_PHOTON_INVALID_CONFIG

**Cause.** A field in `config/photon.ts` (or the `PhotonConfig` passed to `PhotonRenderer`) fails validation: `buildDir` resolves outside the project root, or `ssr.entrypoint` / `entryClient` contains path-traversal segments or characters outside `[\w./\-@#]`.

**Fix.**
1. Open `config/photon.ts` and verify `buildDir` is a relative path INSIDE your project (e.g. `dist`, NOT `../dist`).
2. Verify `ssr.entrypoint` and `entryClient` are relative paths without `..` segments and end in `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Restart the renderer (`PhotonRenderer.boot()` re-validates).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_MISSING

**Cause.** The Vite manifest at `${buildDir}/manifest.json` is absent when `PhotonRenderer.boot()` runs in production mode. The manifest is a build artefact — its absence almost always means the build never ran for this deployment, or the build output was not shipped.

**Fix.**
1. Run your build script (e.g. `pnpm build`) before starting the server in production.
2. Verify your deployment pipeline copies the build directory (default `public/build/`) into the runtime image.
3. Confirm `PhotonConfig.buildDir` matches where Vite writes its output.

The thrown error's `context` carries `{ manifestPath, buildDir }` for diagnostics.

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_INVALID

**Cause.** The Vite manifest is there but cannot be read, is not JSON, or is not a manifest object. Photon used to skip it with a warning and then point every page at a `client.js` the build never wrote, so the server looked healthy and nothing hydrated; it now fails the boot.

**Fix.**
1. Rebuild the client and redeploy the whole build directory — a partial copy is the usual cause.
2. Check the process can read the file.

The thrown error's `context` carries `{ manifestPath }`, and `cause` the read or parse error.

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_LOAD_FAILED

**Cause.** The Vite manifest is present, but the SSR entry module fails to load: missing build output for `ssr.entrypoint` (or, in development, no file there at all), syntax error in the bundled SSR file, or an unmet peer dependency at runtime. Distinct from `E_PHOTON_MANIFEST_MISSING` — that code fires when the manifest is absent; this one fires when the manifest is there but `import()` of the SSR entry rejects.

**Fix.**
1. Re-run `ream build` (or your project's build script) and check its output for warnings.
2. Verify the SSR entry file exists at one of the expected paths (`<ssrBuildDir>/ssr.js` or `<ssrBuildDir>/<entryName>.js`, `ssrBuildDir` defaulting to `build/ssr`).
3. If the build runs but the import still fails, inspect the bundled file for missing peer dependencies (e.g. `react-dom/server` for the React adapter).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_RENDER_FAILED

**Cause.** The SSR module loaded successfully, but its `render(pageData)` call threw or returned a non-string value. Common causes: a component throws during render, a `useEffect`-equivalent runs server-side and accesses `window`, or the SSR entry returns `undefined`.

**Fix.**
1. Read `error.cause` (or the `hint`) — it carries the original error message from the SSR module.
2. Audit the page component for browser-only globals (`window`, `document`, `localStorage`) accessed at module top level or in render.
3. Confirm the SSR entry's `render()` export returns a string (React: `renderToString(...)`; Vue: `renderToString(...)` from `@vue/server-renderer`; Svelte: `<App />.render(...).html`).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_HYDRATION_NO_DATA

**Cause.** The browser-side `hydrate()` call ran but no `<script id="photon-data" type="application/json">` block was found in the document. Almost always means the page was NOT rendered through `PhotonRenderer.render()` (a hand-rolled HTML response, a static file, or a 404 page).

**Fix.**
1. Confirm the route returning this page goes through `PhotonMiddleware` / `PhotonRenderer.render()`.
2. If you serve an SPA fallback, render it through Photon as well — even an empty shell needs the data block for `hydrate()` to find it.

**Throw site:** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_BAD_DATA

**Cause.** The `<script id="photon-data">` block was found, but its contents are not a JSON object with the expected `{ component, props, url, framework }` shape. Causes: HTML mangling by a CDN / proxy that re-encodes script blocks, double-escaping by middleware that doesn't know the block is meant to be raw JSON, or a manual edit of the SSR template.

**Fix.**
1. Inspect the page source: the block content must round-trip through `JSON.parse` cleanly.
2. Disable any HTML-rewriting middleware (compression, link-rewriting, CSP nonce injection) that touches the body — verify the block remains intact in production.
3. If you customised the SSR template, keep the `<script type="application/json" id="photon-data">…</script>` block exactly as `PhotonRenderer.render()` emits it.

**Throw site:** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_NO_TARGET

**Cause.** The hydrate target selector (default `#app`) matched no DOM node. Usually a custom `target` option that doesn't exist in the SSR HTML, or a stripped `id="app"` from a custom template.

**Fix.**
1. Confirm the SSR HTML contains the element matching `hydrate({ target })`.
2. If you customised the renderer's HTML envelope, keep the `<div id="app">…</div>` (or override `target` to match your wrapper's id).

**Throw site:** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK

**Cause.** The `framework` field in the page-data block is not one of `react`, `vue`, or `svelte`. Either the SSR side wrote an unexpected value, or page-data was hand-crafted with a typo.

**Fix.**
1. Verify `PhotonConfig.framework` on the server is set to a supported value.
2. If you serialise page-data manually (rare), ensure `framework` matches the union literal exactly.

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED

**Cause.** Photon successfully read the page-data and dispatched to the right adapter, but the dynamic `import()` of the framework runtime rejected. Almost always a missing peer dependency: `react` + `react-dom` for React, `vue` for Vue, `svelte` for Svelte.

**Fix.**
1. Install the framework's runtime: `pnpm add react react-dom` (or `vue`, or `svelte`).
2. The thrown error's `cause` carries the original module-resolution failure — useful when the package is installed but a sub-path is missing (e.g. `react-dom/client` requires React 18+).

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_UNKNOWN_ROUTE

**Cause.** A `Link`, a `Form`, `router.visit` or `urlFor` named a route the browser does not know: it is not among the routes handed over with `setRoutes()`, or `setRoutes()` was never called.

**Fix.**
1. Call `setRoutes(router.namedRoutes())` once, before the first page renders; the error's `hint` lists the routes it knows.
2. Check the name against the server's `router.as(...)`.

**Throw site:** `packages/photon/src/client/routes.ts`.

### E_PHOTON_MISSING_ROUTE_PARAMS

**Cause.** A named route has parameters (`/users/:id`) that `routeParams` did not supply. The message names them; `context` carries the route and the params given.

**Fix.** Pass every parameter of the route in `routeParams`.

**Throw site:** `packages/photon/src/client/routes.ts`.

### E_PHOTON_UNKNOWN_PAGE

**Cause.** The `resolve` given to `createPhotonApp` returned nothing for a page name — usually a path built from the name that matches no file of `import.meta.glob`.

**Fix.** Check the path `resolve` builds from the page name against your pages directory; `resolvePageComponent` throws with the path it looked for.

**Throw site:** `packages/photon/src/client/app.ts`.

### A note on hydration mismatches

Hydration mismatches (server-rendered HTML differs from the client's first render) are **not** thrown by Photon. Each framework owns this diagnostic:

- **React**: emits a `console.error` with `Hydration failed because ...`. See https://react.dev/errors/418.
- **Vue**: emits a `[Vue warn]: Hydration ...` console warning.
- **Svelte**: emits an `Error: hydration_failed` from `svelte/internal`.

If you see one, the cause is almost always a **non-deterministic render**: a `Date.now()`, `Math.random()`, `useEffect` that runs only on the client, or a `process.env` check that differs between server and browser. Photon's contract is that `render(component, props)` is pure; ensure your component is too.

## Atlas Errors

Atlas normalises its codes: a code that already starts with `E_` is kept, any
other gets the `E_ATLAS_` prefix. See [Atlas error handling](../atlas/error-handling.md)
for the typed subclasses.

| Code | Description |
|------|-------------|
| `E_ROW_NOT_FOUND` | A query that must return a row found none: `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. Carries `status = 404`. |
| `E_MASS_ASSIGNMENT` | `fill()` / `merge()` (and `create`, `createMany`, `updateOrCreate`) set an attribute outside `fillable`, or listed in `guarded`. |
| `E_EXTRA_PROPERTIES` | A fill named a property that is not a declared column. |
| `E_MODEL_NOT_PERSISTED` | An operation that needs a stored row (`delete()`, `refresh()`, `load*()`…) ran on a local instance. |
| `E_MISSING_PRIMARY_KEY` | The same operation ran on a persisted projection that holds no primary key. |
| `E_STRICT_MODE` | Raw SQL refused by strict mode (a repository's `raw()`, or a `db.raw()` value written by a repository). |
| `E_ATLAS_EMPTY_SELECT` | `select()` was called with no columns. Provide at least one column name. |
| `E_ATLAS_INVALID_PAGE` | `paginate()` was called with `page < 1`. |
| `E_ATLAS_INVALID_PER_PAGE` | `paginate()` was called with `perPage < 1`. |
| `E_ATLAS_INVALID_PAGINATION` | A page, page size or row count that is not a finite, non-negative integer. |
| `E_ATLAS_INVALID_CTE_NAME` | A CTE name must be a valid identifier (letters, numbers, underscores). |
| `E_ATLAS_INVALID_OPERATOR` | A `where()` or `wherePivot()` operator outside the allowed list. |
| `E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | `migrations.tableName` is not a plain identifier. |
| `E_ATLAS_MIGRATION_NOT_FOUND` | A migration to run or roll back has no file in the migrations directory. |
| `E_MIGRATION_LOCKED` | Another run holds the migration lock. Wait for it, or clear a stale lock with `migration:unlock`. |
| `E_ROLLBACK_DISABLED_IN_PRODUCTION` | A rollback, reset, refresh, fresh or wipe in production without `--force`. |
| `E_ATLAS_DRY_RUN_WRITE` | A migration tried to write while running under `dryRun()`. |
| `E_ATLAS_INSECURE_SSLMODE` | The connection asks for `sslmode=prefer` or `allow` (URL or `PGSSLMODE`), which fall back to plaintext without saying so. Use `disable` or `verify-full`. See [Encrypted connections](../atlas/connections.md#encrypted-connections-tls). |
| `E_ATLAS_NAPI_NOT_FOUND` | The Rust query compiler is not loaded. A plain `Error` whose message starts with the code. See [Troubleshooting](../atlas/troubleshooting.md). |
| `E_UNSAFE_IDENTIFIER`, `E_UNSAFE_SQL`, `E_UNSAFE_EXPRESSION` | The Rust compiler refused an identifier, a SQL fragment or an expression. A plain `Error` whose message starts with the code. |

## Rune Errors

| Code | Description |
|------|-------------|
| `E_VALIDATION_ERROR` | `validateOrThrow()` found invalid data. Carries `status = 422` and a `messages` array with one entry per field and rule. |
| `E_RUNE_NAPI_REQUIRED` | The Rust validation engine is not loaded. |

## Warden Errors

| Code | Description |
|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | No guard authenticated the request (401). A guarded route answers with this code. |
| `E_INVALID_CREDENTIALS` | The error class a login flow throws when the credentials do not match (400). |
| `E_WARDEN_AUTH_STRATEGY_ERROR` | Every attempted guard crashed (a database down, a bug): a server incident, answered 500, distinct from a credential rejection. |
| `E_WARDEN_FORBIDDEN` | The user lacks a permission or a role a route declares (403). |
| `E_WARDEN_MFA_REQUIRED` | The route declares `@RequireMfa` and the user has not passed the step-up (403). |
| `E_WARDEN_AUTHORIZATION_FAILURE` | A bouncer ability or policy denied the action (403 unless the policy gives another status). |
| `E_WARDEN_NO_AUTH_CONFIG` | `WardenProvider` booted without any guard configured. |
| `E_WARDEN_NAPI_REQUIRED` | The Rust JWT engine is not loaded. |
| `E_WARDEN_UNAUTHORIZED`, `E_WARDEN_AUTH_ERROR` | The standalone `expressMiddleware()` found no token or refused it (401), or failed internally (500). |

## Console Errors

| Code | Description |
|------|-------------|
| `E_CONSOLE_COMMAND_NOT_FOUND` | No command has this name. |
| `E_CONSOLE_MISSING_ARGUMENT` | A required argument was not given. |
| `E_CONSOLE_UNEXPECTED_ARGUMENT` | More arguments than the command declares. |
| `E_CONSOLE_UNKNOWN_FLAG` | A flag the command does not declare. |
| `E_CONSOLE_MISSING_FLAG` | A required flag was not given. |
| `E_CONSOLE_INVALID_FLAG_VALUE` | A flag value of the wrong type. |
| `E_CONSOLE_NOT_INTERACTIVE` | A command asked a question while stdin is not interactive. Pass the value as a flag. |

## Realtime Errors (Relay)

Returned in the JSON body of the relay routes, or as an `error` event on a hub.

| Code | Description |
|------|-------------|
| `E_RELAY_BAD_REQUEST` | `subscribe` without a usable `uid` or `channel` (both non-empty strings). |
| `E_RELAY_CHANNEL_TOO_LONG` | The channel name exceeds 256 characters. |
| `E_RELAY_NOT_CONNECTED` | No connection has this uid on this instance — it closed, or the request reached another instance (see *Running more than one instance*). |
| `E_RELAY_NOT_OWNER` | The connection was opened by another user; subscribe, unsubscribe and hub frames must come from the same one. |
| `E_RELAY_CHANNEL_NO_AUTHORIZER` | No `relay.authorize()` covers the channel, and `allowUnauthorizedChannels` is off. |
| `E_RELAY_CHANNEL_FORBIDDEN` | The channel's authorizer refused, or threw. |
| `E_RELAY_MAX_CHANNELS` | The connection holds `maxChannelsPerClient` channels already. |
| `E_RELAY_MAX_CLIENTS` | The instance holds `maxClients` connections already; sent as an `error` frame before the stream closes. |
| `E_RELAY_UNKNOWN_CONNECTION` | A hub request with no valid connection token — call `<path>/negotiate` first. |
| `E_RELAY_MAX_CONNECTIONS` | A hub already has `maxConnections` open streams (503). |
| `E_RELAY_UNAUTHORIZED` | A hub invocation needs an authenticated user, or one authenticated through another guard. |
| `E_RELAY_FORBIDDEN` | A hub invocation lacks the required role or permission. |
| `E_RELAY_UNKNOWN_EVENT` | A hub invocation names no handler. |
| `E_RELAY_HANDLER_ERROR` | A hub handler threw. |

## Security Errors (Blackhole)

| Code | Description |
|------|-------------|
| `E_BLACKHOLE_RATE_LIMITED` | Too many requests from this client (429, with `Retry-After`). Wait and retry. |
| `E_TOO_MANY_REQUESTS` | A throttle middleware or `limiter.consume()` found the key over its budget (429). |
| `E_BAD_CSRF_TOKEN` | Invalid or missing CSRF token. Echo the `XSRF-TOKEN` cookie in the `X-XSRF-TOKEN` header (or the `_csrf` form field). |
| `E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` | A state-changing request came from another origin — another host, or the same host over another scheme — not listed in `csrf.trustedOrigins` (403). |
| `E_BLACKHOLE_PATH_TRAVERSAL` | The path holds `..`, raw or percent-encoded (400). |
| `E_BLACKHOLE_PARAMETER_POLLUTION` | A query-string key appears twice (keys ending in `[]` may repeat) (400). |
| `E_BLACKHOLE_MISSING_IP` | Rate limiting is on and the request has no client address to count it under (400). |
| `E_BLACKHOLE_SESSION_NOT_READY` | CSRF tokens are bound to the session (`csrf.session`) and the request reached blackhole without one: register the session middleware before blackhole's (500). |
| `E_BLACKHOLE_BLOCKED` | A refusal whose body the engine did not supply as a JSON error. |
