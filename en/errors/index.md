# Error Codes

Every Ream error includes a unique code that links to this documentation. When you see an error, click the docs URL or search for the code below.

## Error Format

In development mode, errors display a full diagnostic box:

```
┌──────────────────────────────────────────────┐
│ [ATLAS_QUERY_ERROR] Column 'statsu' not found
│ Pipeline: 8/10 (Handler)
│ at app/modules/order/services/OrderService.ts:15
│
│ table: orders
│ column: statsu
│
│ Hint: Column 'statsu' does not exist. Did you mean 'status'?
│ Docs: https://docs.ream.dev/errors/ATLAS_QUERY_ERROR
└──────────────────────────────────────────────┘
```

In production mode, only the code and message are shown.

## Container Errors

| Code | Description |
|------|-------------|
| `CONTAINER_NOT_FOUND` | No binding found for the requested token. Includes "did you mean?" suggestions for typos. Register it with `container.singleton()` or `@Service()`. |
| `CIRCULAR_DEPENDENCY` | Circular dependency detected during resolution. Use explicit factories or decouple via events. |
| `CONTAINER_NOT_DECORATED` | A class passed to `resolve()` is not decorated with `@Service()`. Add the decorator or register manually. |

## Router Errors

| Code | Description |
|------|-------------|
| `NOT_FOUND` | No route matches the requested method and path. |

## Pipeline Errors

| Code | Description |
|------|-------------|
| `PIPELINE_UNKNOWN_MIDDLEWARE` | A route references a named middleware that is not registered. Register it with `middleware.register()`. |
| `PIPELINE_DOUBLE_NEXT` | A middleware called `next()` more than once. Each middleware should call `next()` at most once. |
| `PIPELINE_ERROR` | Generic pipeline error from an unhandled handler exception. Includes stage position context. |

## Photon Errors

Server-side errors are thrown from `@c9up/photon` (SSR / renderer); client-side errors are thrown from `@c9up/photon/client` (hydration / SPA-nav). Every code carries a `docsUrl` that resolves to its anchor below — operators can jump from the terminal directly to the recovery instructions.

### PHOTON_INVALID_CONFIG

**Cause.** A field in `config/photon.ts` (or the `PhotonConfig` passed to `PhotonRenderer`) fails validation: `buildDir` resolves outside the project root, or `entryServer` / `entryClient` contains path-traversal segments or characters outside `[\w./\-@#]`.

**Fix.**
1. Open `config/photon.ts` and verify `buildDir` is a relative path INSIDE your project (e.g. `dist`, NOT `../dist`).
2. Verify `entryServer` and `entryClient` are relative paths without `..` segments and end in `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Restart the renderer (`PhotonRenderer.boot()` re-validates).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_MANIFEST_MISSING

**Cause.** The Vite manifest at `${buildDir}/manifest.json` is absent when `PhotonRenderer.boot()` runs in production mode. The manifest is a build artefact — its absence almost always means the build never ran for this deployment, or the build output was not shipped.

**Fix.**
1. Run your build script (e.g. `pnpm build`) before starting the server in production.
2. Verify your deployment pipeline copies the build directory (default `public/build/`) into the runtime image.
3. Confirm `PhotonConfig.buildDir` matches where Vite writes its output.

The thrown error's `context` carries `{ manifestPath, buildDir }` for diagnostics.

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_SSR_LOAD_FAILED

**Cause.** The Vite manifest is present, but the SSR entry module fails to load: missing build output for `entryServer`, syntax error in the bundled SSR file, or an unmet peer dependency at runtime. Distinct from `PHOTON_MANIFEST_MISSING` — that code fires when the manifest is absent; this one fires when the manifest is there but `import()` of the SSR entry rejects.

**Fix.**
1. Re-run `ream build` (or your project's build script) and check its output for warnings.
2. Verify the SSR entry file exists at one of the expected paths (`<buildDir>/ssr/ssr.js` or `<buildDir>/ssr/<entryName>.js`).
3. If the build runs but the import still fails, inspect the bundled file for missing peer dependencies (e.g. `react-dom/server` for the React adapter).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_SSR_RENDER_FAILED

**Cause.** The SSR module loaded successfully, but its `render(pageData)` call threw or returned a non-string value. Common causes: a component throws during render, a `useEffect`-equivalent runs server-side and accesses `window`, or the SSR entry returns `undefined`.

**Fix.**
1. Read `error.cause` (or the `hint`) — it carries the original error message from the SSR module.
2. Audit the page component for browser-only globals (`window`, `document`, `localStorage`) accessed at module top level or in render.
3. Confirm the SSR entry's `render()` export returns a string (React: `renderToString(...)`; Vue: `renderToString(...)` from `@vue/server-renderer`; Svelte: `<App />.render(...).html`).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_HYDRATION_NO_DATA

**Cause.** The browser-side `hydrate()` call ran but no `<script id="photon-data" type="application/json">` block was found in the document. Almost always means the page was NOT rendered through `PhotonRenderer.render()` (a hand-rolled HTML response, a static file, or a 404 page).

**Fix.**
1. Confirm the route returning this page goes through `PhotonMiddleware` / `PhotonRenderer.render()`.
2. If you serve an SPA fallback, render it through Photon as well — even an empty shell needs the data block for `hydrate()` to find it.

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_BAD_DATA

**Cause.** The `<script id="photon-data">` block was found, but its contents are not a JSON object with the expected `{ component, props, url, framework }` shape. Causes: HTML mangling by a CDN / proxy that re-encodes script blocks, double-escaping by middleware that doesn't know the block is meant to be raw JSON, or a manual edit of the SSR template.

**Fix.**
1. Inspect the page source: the block content must round-trip through `JSON.parse` cleanly.
2. Disable any HTML-rewriting middleware (compression, link-rewriting, CSP nonce injection) that touches the body — verify the block remains intact in production.
3. If you customised the SSR template, keep the `<script type="application/json" id="photon-data">…</script>` block exactly as `PhotonRenderer.render()` emits it.

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_NO_TARGET

**Cause.** The hydrate target selector (default `#app`) matched no DOM node. Usually a custom `target` option that doesn't exist in the SSR HTML, or a stripped `id="app"` from a custom template.

**Fix.**
1. Confirm the SSR HTML contains the element matching `hydrate({ target })`.
2. If you customised the renderer's HTML envelope, keep the `<div id="app">…</div>` (or override `target` to match your wrapper's id).

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK

**Cause.** The `framework` field in the page-data block is not one of `react`, `vue`, or `svelte`. Either the SSR side wrote an unexpected value, or page-data was hand-crafted with a typo.

**Fix.**
1. Verify `PhotonConfig.framework` on the server is set to a supported value.
2. If you serialise page-data manually (rare), ensure `framework` matches the union literal exactly.

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_ADAPTER_LOAD_FAILED

**Cause.** Photon successfully read the page-data and dispatched to the right adapter, but the dynamic `import()` of the framework runtime rejected. Almost always a missing peer dependency: `react` + `react-dom` for React, `vue` for Vue, `svelte` for Svelte.

**Fix.**
1. Install the framework's runtime: `pnpm add react react-dom` (or `vue`, or `svelte`).
2. The thrown error's `cause` carries the original module-resolution failure — useful when the package is installed but a sub-path is missing (e.g. `react-dom/client` requires React 18+).

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### A note on hydration mismatches

Hydration mismatches (server-rendered HTML differs from the client's first render) are **not** thrown by Photon. Each framework owns this diagnostic:

- **React**: emits a `console.error` with `Hydration failed because ...`. See https://react.dev/errors/418.
- **Vue**: emits a `[Vue warn]: Hydration ...` console warning.
- **Svelte**: emits an `Error: hydration_failed` from `svelte/internal`.

If you see one, the cause is almost always a **non-deterministic render**: a `Date.now()`, `Math.random()`, `useEffect` that runs only on the client, or a `process.env` check that differs between server and browser. Photon's contract is that `render(component, props)` is pure; ensure your component is too.

## Atlas Errors

| Code | Description |
|------|-------------|
| `ATLAS_QUERY_ERROR` | SQL query compilation failed. Check column names and operators. |
| `ATLAS_NOT_ENTITY` | A class passed to `BaseRepository` is not decorated with `@Entity()`. |
| `ATLAS_INVALID_IDENTIFIER` | A SQL identifier contains illegal characters (double-quotes or null bytes). |
| `ATLAS_EMPTY_SELECT` | `select()` was called with no columns. Provide at least one column name. |
| `ATLAS_INVALID_PAGE` | `paginate()` was called with `page < 1`. |
| `ATLAS_INVALID_LIMIT` | `limit()` was called with a negative value. |
| `ATLAS_INVALID_OFFSET` | `offset()` was called with a negative value. |
| `ATLAS_INVALID_IN` | `IN` or `NOT IN` operator requires an array value. |
| `ATLAS_INVALID_PER_PAGE` | `paginate()` was called with `perPage < 1`. |
| `ATLAS_INVALID_CTE_NAME` | CTE name must be a valid identifier (letters, numbers, underscores). |

## Rune Errors

| Code | Description |
|------|-------------|
| `RUNE_VALIDATION_FAILED` | Schema validation failed. Check `result.errors` for field-level details. |
| `RUNE_NO_RULE` | `.message()` was called before any rule was added to the chain. |

## Warden Errors

| Code | Description |
|------|-------------|
| `WARDEN_STRATEGY_NOT_FOUND` | The requested auth strategy is not registered. Call `registerStrategy()` or check your `AuthConfig`. |
| `WARDEN_INVALID_CONFIG` | The `defaultStrategy` in `AuthConfig` does not exist in the `strategies` map. |
| `WARDEN_JWT_EXPIRED` | The JWT token has expired (`exp` claim is in the past). Request a new token. |
| `WARDEN_JWT_NOT_YET_VALID` | The JWT token is not yet valid (`nbf` claim is in the future). Wait until the `nbf` time. |
| `WARDEN_JWT_SECRET_TOO_SHORT` | The JWT secret must be at least 32 bytes. Use a longer, cryptographically random secret. |

## CLI Errors (`ream` / ream-cli)

| Code | Description |
|------|-------------|
| `REAM_UNKNOWN_TYPE` | Unknown generator type. Available: `service`, `entity`, `controller`, `validator`, `provider`, `migration`. |

## Security Errors (Blackhole)

| Code | Description |
|------|-------------|
| `RATE_LIMITED` | Too many requests from this IP. Wait and retry. |
| `CSRF_FAILED` | Invalid or missing CSRF token. Echo the `XSRF-TOKEN` cookie in the `X-XSRF-TOKEN` header (or the `_csrf` form field). |
