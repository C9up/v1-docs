# photon

`@c9up/photon`: server-driven pages rendered by React, Vue or Svelte: the server picks the page component and its props, the client hydrates it and navigates without full reloads. Guide: [Introduction](/en/guides/frontend/photon/).

## Installation

```bash
pnpm add @c9up/photon
ream configure @c9up/photon
```

`ream configure @c9up/photon` registers the provider and writes `config/photon.ts`. Add the framework you render with (`react` and `react-dom`, `vue`, or `svelte`) and `vite`: all are optional peer dependencies.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/photon` | Server side: `PhotonRenderer`, `PhotonMiddleware`, `defineConfig`, the prop helpers, the protocol helpers, SEO, `errors`. |
| `@c9up/photon/provider` | `PhotonProvider` (default export). |
| `@c9up/photon/configure` | `configure(codemods)`, run by `ream configure @c9up/photon`. |
| `@c9up/photon/client` | Browser: `hydrate`, `bootPage`, `router`, the route helpers, infinite scroll, the client's `errors`. |
| `@c9up/photon/client/core` | Browser, without the framework adapters: `bootPage`, `router`, the route helpers, `browserHost`, the client's `errors`. |
| `@c9up/photon/react` | React components and hooks. |
| `@c9up/photon/vue` | Vue components and composables. |
| `@c9up/photon/svelte` | Svelte components and functions. |

The server entry and the browser entries do not import each other; never import `@c9up/photon` from browser code.

## Exports

### `@c9up/photon`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig(config: PhotonConfig): PhotonConfig`. |
| `configure` | function | Same as `@c9up/photon/configure`. |
| `PhotonRenderer` | class | Builds page objects, server-renders, writes the HTML document. |
| `PhotonMiddleware` | class | The request middleware: attaches `ctx.photon` and answers page and props requests. |
| `createPhotonContext` | function | `createPhotonContext(renderer: PhotonRenderer, url: string, requestContext?: SsrRequestContext): PhotonContext`: what the middleware puts on `ctx.photon`. |
| `getValidationErrors` | function | `getValidationErrors(ctx: unknown, options?: ValidationErrorOptions): Record<string, unknown>`: the validation errors the session flashed, first message per field unless `allMessages`. `{}` when none. |
| `always` | function | `always<T>(value: T): AlwaysProp<T>`: included even in a partial reload that did not ask for it. |
| `optional` | function | `optional<T>(fn: () => T \| Promise<T>): OptionalProp<T>`: resolved only when a partial reload asks for it. |
| `defer` | function | `defer<T>(fn: () => T \| Promise<T>, groupOrOptions?: string \| DeferOptions): DeferProp<T>`: resolved in a follow-up request, per group (`'default'`). |
| `merge` / `deepMerge` | function | `merge<T>(value: T): MergeProp<T>`: merged into what the client holds. `.prepend()`, `.append()`, `.matchOn(key)`. |
| `once` | function | `once<T>(value: T, options?: OnceOptions): OnceProp<T>`: sent once, then kept by the client. |
| `scroll` | function | `scroll<T>(value: T, provider?: ScrollCursorProvider): ScrollProp<T>`: a paginated list for infinite scroll. `.deferred(group?)`, `.matchOn(key)`. |
| `isAlwaysProp`, `isOptionalProp`, `isDeferProp`, `isMergeProp`, `isOnceProp`, `isScrollProp` | function | Type guards. |
| `resolveProps` | function | `resolveProps(props: Record<string, unknown>, component: string, partial?: PropsRequest): Promise<ResolvedProps>`. |
| `buildPageObject` | function | `buildPageObject(component: string, props: Record<string, unknown>, options: PageObjectOptions): Promise<{ page: PageProps; rescuedErrors: readonly RescuedError[] }>`: the page object, for a renderer that writes its own document. |
| `finishVisit` | function | `finishVisit(ctx: unknown, res: object, info: PhotonRequestInfo, options: { url: string; version: string; location?: string }): boolean`: answers an asset-version mismatch or a `location()` instead of the page; `true` when it did. |
| `varyOnPhoton` | function | `varyOnPhoton(res: object): void`: adds `X-Photon` to `Vary`. |
| `readRequestInfo` | function | `readRequestInfo(ctx: unknown): PhotonRequestInfo`. |
| `readRequestUrl` | function | `readRequestUrl(ctx: unknown): string`. |
| `shouldReloadForAssetVersion` | function | `shouldReloadForAssetVersion(info: PhotonRequestInfo, serverVersion: string): boolean`: a GET from the client router carrying another asset version. |
| `onRescue` | function | `onRescue(next?: RescueListener): void`: where errors of rescued deferred props are reported; the request's logger by default. |
| `reportRescued` | function | `reportRescued(errors: readonly RescuedError[], ctx: SsrRequestContext \| undefined): void`. |
| `Meta` | function | `Meta<Ctx>(resolver: MetaResolver<Ctx>): MethodDecorator`: `<head>` data for a controller action. |
| `getRouteMeta` | function | `getRouteMeta(target: object, propertyKey: string \| symbol): MetaResolver \| undefined`. |
| `resolveMeta` | function | `resolveMeta<Ctx>(resolver: MetaResolver<Ctx> \| undefined, ctx: Ctx): Promise<MetaTags \| undefined>`. |
| `mergeMeta` | function | `mergeMeta(...layers: Array<MetaTags \| undefined>): MetaTags`: last wins per field. |
| `serializeMetaTags` | function | `serializeMetaTags(meta: MetaTags \| undefined, options?: { nonce?: string }): string`: the `<head>` markup. |
| `errors` | namespace | The package's server errors, one class per code, see [Errors](#errors) |
| `PhotonError`, `PhotonErrorCode` | type | What every server error holds: `code`, `help?`, `context?`, `docsUrl`; `toJSON()` keeps the cause chain. |
| `PhotonConfig` | interface | See [Configuration](#configuration). |
| `SsrConfig` | interface | `{ enabled?: boolean; entrypoint?: string; pages?: string[] \| ((ctx, page: string) => boolean \| Promise<boolean>) }`. |
| `SsrRequestContext` | type | The request context the middleware works on. |
| `PageProps` | interface | The page object: `component`, `props`, `url`, `version`, `framework`, `sharedProps?`, the protocol extras and `PageFlags`. |
| `PageFlags` | interface | `{ clearHistory?: boolean; encryptHistory?: boolean; flash?: unknown }`. |
| `RenderResult` | interface | `{ html: string; status: number; headers: Record<string, string> }`. |
| `RootViewData` | interface | What a root view renders with: `page`, `photon: { head; body; nonce? }`, and the view props. |
| `RootViewRenderer` | type | `(data: RootViewData) => string \| Promise<string>`. |
| `PhotonContext` | interface | `ctx.photon`; see below. |
| `SharedData` | type | `Record<string, unknown>`. |
| `SharedDataProvider` | type | `() => SharedData \| Promise<SharedData>`. |
| `ValidationErrorOptions` | interface | `{ allMessages?: boolean }`. |
| `PhotonRequestInfo` | interface | `{ isPhotonRequest: boolean; version?: string; method: string; errorBag?: string; partial: PropsRequest }`. |
| `PageObjectOptions` | interface | `{ url; version; framework; partial?; sharedKeys?; flags? }`. |
| `RescueListener` | type | `(error: unknown, info: { prop: string; ctx: SsrRequestContext \| undefined }) => void`. |
| `AlwaysProp`, `OptionalProp`, `DeferProp`, `MergeProp`, `OnceProp`, `ScrollProp`, `SpecialProp` | type | The wrappers the helpers return. |
| `DeferOptions` | interface | `{ group?: string; rescue?: boolean }`. `rescue` sends the page without a prop whose resolver threw. |
| `OnceOptions` | interface | `{ key?: string; expiresIn?: number \| string; expiresAt?: number \| Date; fresh?: boolean }`. |
| `ScrollCursor` | interface | `{ pageName; currentPage; nextPage; previousPage }`. |
| `ScrollCursorProvider` | type | Reads a cursor off the scroll value; a paginator's by default. |
| `PropsRequest`, `PropsProtocolExtras`, `ResolvedProps`, `RescuedError`, `OncePropMeta`, `ScrollPropMeta` | interface | The resolver's input and output. |
| `MetaTags` | interface | `{ title?; description?; canonical?; robots?; keywords?; og?: OgTags; twitter?: TwitterTags; custom?: CustomMetaTag[]; jsonLd?: JsonLd }`. |
| `OgTags`, `TwitterTags`, `CustomMetaTag` | interface | Open Graph, Twitter card and free `<meta>` tags. |
| `JsonLd` | type | `object \| readonly object[]`. |
| `MetaResolver` | type | `MetaTags \| ((ctx: Ctx) => MetaTags \| undefined \| Promise<MetaTags \| undefined>)`. |

### `PhotonContext` (`ctx.photon`)

| Member | Signature | Description |
|---|---|---|
| `render` | `render(component: string, props?: Record<string, unknown>, meta?: MetaTags, viewProps?: Record<string, unknown>): Promise<RenderResult>` | Renders a page: the HTML document on a first visit, the page object on a client visit. `viewProps` reach the root view. |
| `page` | `page(component: string, props?: Record<string, unknown>): Promise<PageProps>` | The page object `render()` would send, without a response. |
| `share` | `share(data: SharedData \| SharedDataProvider): void` | Props for every page of the request; a provider runs when a page is built. |
| `location` | `location(url: string): void` | Sends the client to another URL: 409 with the target for the client router, 302 for a plain browser load. |
| `meta` | `meta(tags: MetaTags): void` | Adds `<head>` data; calls merge. |
| `getAccumulatedMeta` | `getAccumulatedMeta(): MetaTags \| undefined` | |
| `clearHistory` | `clearHistory(): void` | Tells the client to drop its cached history after this response. |
| `encryptHistory` | `encryptHistory(encrypt?: boolean): void` | Encrypts (or not) this response's history state. |
| `flash` | `flash(provider: () => unknown): void` | The one-shot `flash` bag sent beside the props. |
| `getVersion` | `getVersion(): string` | The asset version. |
| `ssrEnabled` | `ssrEnabled(component: string): Promise<boolean>` | |
| `requestInfo` | `requestInfo(): PhotonRequestInfo` | |

### `PhotonMiddleware`

| Member | Signature | Description |
|---|---|---|
| constructor | `new PhotonMiddleware(config: PhotonConfig)` | Builds its own `PhotonRenderer`, booted on the first request. |
| `middleware` | `middleware(): (ctx, next) => Promise<void>` | The function to register in the router middleware. |
| `getRenderer` | `getRenderer(): PhotonRenderer` | |
| `share` | `share?(ctx: PhotonMiddlewareContext): SharedData \| Promise<SharedData>` | Define it in a subclass to share props with every page. |
| `flash` | `flash?(ctx: PhotonMiddlewareContext): unknown` | Define it in a subclass to send a `flash` bag. |

### `PhotonRenderer`

| Member | Signature | Description |
|---|---|---|
| constructor | `new PhotonRenderer(config: PhotonConfig)` | |
| `boot` | `boot(): Promise<void>` | Loads the SSR module and the Vite manifest. |
| `close` | `close(): Promise<void>` | Stops the dev SSR compiler. |
| `buildPage` | `buildPage(component: string, props: Record<string, unknown>, url: string, options: { flags?: PageFlags \| (() => Promise<PageFlags>); sharedKeys?: readonly string[]; partial?: PropsRequest; requestContext?: SsrRequestContext }): Promise<PageProps>` | |
| `render` | `render(component: string, props?: Record<string, unknown>, url: string, meta?: MetaTags, flags?: PageFlags): Promise<RenderResult>` | |
| `renderDocument` | `renderDocument(page: PageProps, meta?: MetaTags, requestContext?: SsrRequestContext, viewProps?: Record<string, unknown>): Promise<RenderResult>` | Server-renders when SSR applies, then writes the document through the root view. |
| `renderPageObject` | `renderPageObject(page: PageProps, meta?: MetaTags): RenderResult` | The JSON answer to a client visit. |
| `renderProps` | `renderProps(component: string, props: Record<string, unknown>, url: string, meta?: MetaTags, extras?: PropsProtocolExtras & PageFlags & { sharedProps?: string[] }): RenderResult` | |
| `ssrEnabled` | `ssrEnabled(component: string, ctx?: SsrRequestContext): Promise<boolean>` | |
| `getVersion` | `getVersion(): string` | `assetsVersion`, or a fingerprint of the manifest. |
| `getFramework` | `getFramework(): Framework` | |
| `encryptsHistory` | `encryptsHistory(): boolean` | |
| `useSsrModule` | `useSsrModule(ssrModule: SsrModule): this` | Installs an SSR module instead of loading the build. |
| `useDevServer` | `useDevServer(server: ViteDevServerLike): this` | Installs a Vite dev server instead of starting one. |

### `@c9up/photon/client`

| Export | Kind | Description |
|---|---|---|
| `hydrate` | function | `hydrate(options: HydrateOptions): Promise<void>`: reads the page the server sent and mounts it with the page's framework adapter, loaded on demand. |
| `bootPage` | function | `bootPage(options: BootPageOptions): Promise<void>`: the same with your own `mount`; what another renderer's client uses. |
| `router` | const | Client navigation; see below. |
| `urlFor` | function | `urlFor(name: string, params?: Record<string, string \| number>, options?: { qs?: Record<string, string \| number \| boolean> }): string`. |
| `setRoutes` | function | `setRoutes(routes: RouteManifest): void`: the named routes `urlFor` reads. |
| `getRoute` | function | `getRoute(name: string): { path: string; methods: string[] }`. |
| `resolvePageComponent` | function | `resolvePageComponent<T>(path: string \| string[], pages: Record<string, Promise<T> \| (() => Promise<T>) \| T>, layout?: unknown): Promise<T>`: finds a page in an `import.meta.glob` map. |
| `useInfiniteScroll` | function | `useInfiniteScroll(options: UseInfiniteScrollOptions): UseInfiniteScrollProps`: the framework-free core of infinite scroll. |
| `useInfiniteScrollData` | function | `useInfiniteScrollData(options: InfiniteScrollDataOptions): InfiniteScrollData`. |
| `getScrollableParent` | function | The nearest scrolling ancestor of an element. |
| `browserHost` | function | `browserHost(): PhotonHost`: the browser's address, history and `fetch`. |
| `errors` | namespace | The client's errors, one class per code, see [Errors](#errors) |
| `PhotonClientError` | type | What every client error holds: `code`, `help?`, `context?`, `docsUrl`. |
| `HydrateOptions` | interface | `{ resolveComponent: ResolveComponent; target?: string; onHydrated?: () => void; svelteRoot?: unknown }`. `target` defaults to `'#app'`. |
| `BootPageOptions` | interface | `{ target?; host?: PhotonHost; url?; resolveComponent; mount(target, Component, page); onHydrated? }`. |
| `PhotonPageData` | interface | The page object as the client reads it. |
| `PhotonRoutes` | interface | Empty; augment it with your route names and params to type `urlFor` and `router`. |
| `ResolveComponent` | type | `(name: string) => Promise<{ default: unknown }>`. |
| `VisitOptions`, `PartialRequest`, `VisitCallbacks`, `RouterEvents` | interface | Router options, partial reloads, callbacks, events. |
| `RouteManifest`, `RouteName`, `RouteParamsFor`, `RouteTarget` | type | Named routes. |
| `PhotonHost`, `PhotonEvent` | interface | Where the router runs when not in a browser. |
| `ClientFramework` | type | `'react' \| 'vue' \| 'svelte'`. |
| `ScrollPropMeta`, `PhotonAdapterHandle`, `PhotonClientErrorCode` | type | |
| `InfiniteScrollData`, `InfiniteScrollDataOptions`, `InfiniteScrollElementManager`, `InfiniteScrollOnCompleteDetails`, `InfiniteScrollPageIdentifier`, `UseInfiniteScrollOptions`, `UseInfiniteScrollProps` | type | Infinite scroll. |

`@c9up/photon/client/core` exports `bootPage`, `router`, `urlFor`, `setRoutes`, `getRoute`, `browserHost`, `errors` and their types, without `hydrate` and the adapters.

### `router`

| Member | Signature | Description |
|---|---|---|
| `visit` | `visit(target: string \| RouteTarget, options?: VisitOptions): Promise<void>` | Fetches the page and swaps it in; with `only`, `except` or `reset`, a partial reload. Another origin is a full navigation. |
| `reload` | `reload(request?: PartialRequest): Promise<void>` | `visit()` of the current URL, uncached. |
| `get` / `post` / `put` / `patch` | `post(target: string \| RouteTarget, data?: RequestPayload, options?: VisitOptions)` | |
| `delete` | `delete(target: string \| RouteTarget, options?: VisitOptions)` | |
| `on` | `on<K extends keyof RouterEvents>(type: K, callback: (event: PhotonEvent<RouterEvents[K]>) => void): () => void` | `start`, `finish`, `success`, `error`, `flash`. |
| `remember` / `restore` | `remember(data: unknown, key?: string): void` | State kept in the history entry. |
| `replace` | `replace({ url }: { url: string }): void` | Changes the URL without a visit. |

`VisitOptions`: `method`, `data`, `only`, `except`, `reset`, `headers`, `errorBag`, `preserveErrors`, `preserveUrl`, `preserveState`, `replace`, `forceFormData`, and the callbacks `onBefore`, `onCancelToken`, `onCancel`, `onStart`, `onBeforeUpdate`, `onSuccess`, `onError`, `onFinish`.

### `@c9up/photon/react`, `@c9up/photon/vue`, `@c9up/photon/svelte`

The three entries offer the same set, each in its framework's idiom.

| Export | React | Vue | Svelte | Description |
|---|---|---|---|---|
| `createPhotonApp` | function | function | function | Starts the app in the browser; in the SSR entry (with `page` and `render`) returns `{ head, body }`. |
| `App` | component | component | component (`PhotonRoot`, also the default export) | The root that renders the current page. |
| `usePage` | hook | composable | function | The current page object. |
| `Link` | component | component | component | A link that visits instead of reloading. |
| `Form` | component | component | component | A form submitted as a visit, with errors and progress. |
| `useForm` | hook | composable | function | Form state: data, errors, `processing`, submit helpers. |
| `useFormContext` | hook | composable | function | The enclosing `Form`'s slot props. |
| `Deferred` | component | component | component | Shows a fallback until deferred props arrive. |
| `WhenVisible` | component | component | component | Loads props when the element scrolls into view. |
| `InfiniteScroll` | component | component | component | Loads the next or previous page of a `scroll()` prop. |
| `PhotonPage` | component | component | | Provides a page object to a subtree. |
| `plugin` | | Vue plugin | | Installs photon in a Vue app. |
| `setPage` | | | function | Sets the current page. |
| `shouldIntercept` | function | | | Whether a click event should become a visit. |

Each entry also exports the option and prop types of these: `CreatePhotonAppOptions`, `CreatePhotonAppSsrOptions`, `SetupOptions`, `LinkProps`, `FormProps` (React), `InfiniteScrollProps`, `DeferredProps` and `WhenVisibleProps` (React), `InertiaFormProps` (React), `InertiaForm` and `InertiaFormExtras` (Vue, Svelte), `PhotonRootProps` (Svelte).

## Configuration

`config/photon.ts` exports `defineConfig({ … })`. The configure stub writes `framework: 'react'`, `entryClient: 'resources/app.tsx'` and SSR on with `resources/ssr.tsx`.

| Option | Type | Default | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | (required) | The frontend framework. |
| `entryClient` | `string` | (required) | The client entry (`'resources/app.tsx'`). |
| `buildDir` | `string` | `'public/build'` | Where the client build is written, on disk. |
| `assetsUrl` | `string` | `'/build'` | URL the client build is served from (a root-relative path or an http(s) URL). |
| `ssrBuildDir` | `string` | `'build/ssr'` | Where the SSR bundle is written; refused inside `buildDir` or `public/`. |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | Vite dev server URL (development only). |
| `dev` | `boolean` | from the environment | Serve through the Vite dev server. Unset, only `ream dev` or a development or test `NODE_ENV` turns it on. |
| `defaultMeta` | `MetaTags` | none | Application-wide `<head>` tags; per-route values merge on top. |
| `ssr.enabled` | `boolean` | `false` | Server-render pages. |
| `ssr.entrypoint` | `string` | `'resources/ssr.tsx'` | The SSR entry. |
| `ssr.pages` | `string[] \| (ctx, page) => boolean \| Promise<boolean>` | every page | Which pages to server-render. |
| `encryptHistory` | `boolean` | `false` | Encrypt every page's history state; `ctx.photon.encryptHistory(false)` turns it off for one response. |
| `assetsVersion` | `string \| number` | manifest fingerprint | A fixed asset version, sent with every page. |
| `appRoot` | `string` | `app.makePath()` | The root `buildDir` is resolved against. |
| `rootView` | `string \| (ctx) => string \| RootViewRenderer` | photon's document | The document of a first visit: a template name for `ctx.view`, or a function returning one (or a function that writes the document). |

## Container bindings

| Token | Resolves to |
|---|---|
| `PhotonRenderer` (class), `'photon'` | The renderer, built from `config/photon.ts` and booted in the provider's `boot()`. A missing config throws. |

`'photon'` is declared on `ContainerBindings`.

## Errors

Every error, server or client, is a flare `Exception` named by its code, and carries `code`, an optional `help` and `context`, and a `docsUrl` to the code's row below; `docsUrl` is enumerable, so log pipelines ship it.

| Code | Raised when |
|---|---|
| [`E_PHOTON_INVALID_CONFIG`](/en/reference/errors#e-photon-invalid-config) | A config value fails validation: `buildDir` outside the project, a path-traversal segment in `entryClient` or `ssr.entrypoint`. |
| [`E_PHOTON_MANIFEST_MISSING`](/en/reference/errors#e-photon-manifest-missing) | `<buildDir>/manifest.json` is absent at boot in production. |
| [`E_PHOTON_MANIFEST_INVALID`](/en/reference/errors#e-photon-manifest-invalid) | The Vite manifest cannot be read, or is not a manifest. |
| [`E_PHOTON_SSR_LOAD_FAILED`](/en/reference/errors#e-photon-ssr-load-failed) | The SSR entry module did not load. |
| [`E_PHOTON_SSR_RENDER_FAILED`](/en/reference/errors#e-photon-ssr-render-failed) | The SSR module threw while rendering a page. |
| [`E_PHOTON_HYDRATION_NO_DATA`](/en/reference/errors#e-photon-hydration-no-data) | The document has no `<script id="photon-data">`. |
| [`E_PHOTON_HYDRATION_BAD_DATA`](/en/reference/errors#e-photon-hydration-bad-data) | The page-data script is not a valid page object. |
| [`E_PHOTON_HYDRATION_NO_TARGET`](/en/reference/errors#e-photon-hydration-no-target) | The mount target (`#app` by default) matches no element. |
| [`E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK`](/en/reference/errors#e-photon-hydration-unsupported-framework) | The page names a framework other than React, Vue or Svelte. |
| [`E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED`](/en/reference/errors#e-photon-hydration-adapter-load-failed) | The framework's runtime is not installed, or is too old (Svelte before 5). |
| [`E_PHOTON_UNKNOWN_ROUTE`](/en/reference/errors#e-photon-unknown-route) | A `Link`, a `Form`, `router.visit` or `urlFor` named a route not handed over with `setRoutes()`. |
| [`E_PHOTON_MISSING_ROUTE_PARAMS`](/en/reference/errors#e-photon-missing-route-params) | A named route's params were not all supplied. |
| [`E_PHOTON_UNKNOWN_PAGE`](/en/reference/errors#e-photon-unknown-page) | The `resolve` given to `createPhotonApp` returned nothing for a page name, or `resolvePageComponent` found no page at the path. |
| [`E_PHOTON_MISSING_CONFIG`](/en/reference/errors#e-photon-missing-config) | The container resolved `PhotonRenderer` and there is no `config/photon.ts`. |
| [`E_PHOTON_INVALID_DURATION`](/en/reference/errors#e-photon-invalid-duration) | A `once()` prop's `expiresIn` is neither milliseconds nor a duration like `30s`, `5m`, `7d`. |
| [`E_PHOTON_SCROLL_CURSOR_UNDERIVABLE`](/en/reference/errors#e-photon-scroll-cursor-underivable) | `scroll()` was given a value that is not an offset paginator and no cursor callback; pass one as its second argument. |
| [`E_PHOTON_INVALID_PAGE_MODULE`](/en/reference/errors#e-photon-invalid-page-module) | `resolvePageComponent` loaded a module with no default export. |
| [`E_PHOTON_INVALID_PAGE_RESPONSE`](/en/reference/errors#e-photon-invalid-page-response) | The first page requested from the server answered an error status, or something other than a JSON page object. |
| [`E_PHOTON_NO_ROUTER_HOST`](/en/reference/errors#e-photon-no-router-host) | The client router ran with no host: no browser document, and none given to `bootPage`. |
| [`E_PHOTON_NO_PAGE`](/en/reference/errors#e-photon-no-page) | `usePage()` was called outside a Photon page (on the server, outside `<PhotonPage>`). |
| [`E_PHOTON_UNKNOWN_SCROLL_PROP`](/en/reference/errors#e-photon-unknown-scroll-prop) | An infinite scroll names a prop the page object has no scroll prop for. |
| [`E_PHOTON_INVALID_DEFERRED`](/en/reference/errors#e-photon-invalid-deferred) | `<Deferred>` is missing its `data` prop or its fallback. |
| [`E_PHOTON_FORM_DATA_MISSING`](/en/reference/errors#e-photon-form-data-missing) | `useForm(rememberKey)` was called without the form data. |
| [`E_PHOTON_FORM_DEFAULTS_UNSUPPORTED`](/en/reference/errors#e-photon-form-defaults-unsupported) | `setDefaults()` was called on a form whose data is a function. |
| [`E_PHOTON_INVALID_SVELTE_ROOT`](/en/reference/errors#e-photon-invalid-svelte-root) | The `svelteRoot` given to the Svelte adapter does not export `setPage()`; pass the root from `@c9up/photon/svelte`. |
| [`E_PHOTON_INVALID_SSR_SETUP`](/en/reference/errors#e-photon-invalid-ssr-setup) | Svelte's `createPhotonApp` rendered on the server without a `setup`, or its `setup` did not return `render(App, { props })` from `svelte/server`. |

## Migration

- `PhotonError` is gone as a class: test `error.code`, or `error instanceof errors.E_PHOTON_*` with `import { errors } from '@c9up/photon'`. `PhotonError` remains as the type every server error satisfies.
- `PhotonClientError` is gone as a class too: `import { errors } from '@c9up/photon/client'` (or `/client/core`) and test `errors.E_PHOTON_*`.
- `error.hint` is now `error.help`, and `toJSON()` emits `help`. `error.name` is now the code.

## See also

- [Introduction](/en/guides/frontend/photon/)
- [Pages and props](/en/guides/frontend/photon/pages)
- [Hydration and navigation](/en/guides/frontend/photon/hydration)
- [Head, SEO and CSP](/en/guides/frontend/photon/head)
- [Frameworks](/en/guides/frontend/photon/frameworks)
- [Vite](/en/guides/frontend/vite)
