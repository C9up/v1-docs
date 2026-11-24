# aurora

`@c9up/aurora`: components written as tagged templates over signals, rendered to HTML on the server and hydrated in the browser, with no build step. Guide: [Introduction](/en/guides/frontend/aurora/).

## Installation

```bash
pnpm add @c9up/aurora
ream configure @c9up/aurora
```

`ream configure @c9up/aurora` registers the provider and the `@c9up/aurora/middleware` router middleware, and writes `config/aurora.ts`. Optional peer dependencies: `@c9up/comet` for `@c9up/aurora/rpc`, `@c9up/photon` for page visits (`visits: true`).

## Entry points

aurora has browser entries and server entries. The browser entries import no Node module; the server entries do. Import a server entry only from server code.

| Import | Runs in | Contents |
|---|---|---|
| `@c9up/aurora` | browser, server | Everything a component and a page script use: `html`, `component`, signals, lists, forms, the HTTP client, `render`, `hydrate`, browser helpers, routes, motion, live components. |
| `@c9up/aurora/core` | any host | The host-free part of `@c9up/aurora`: templates, components, signals, lists, forms, commands, motion. No DOM, no Node module. |
| `@c9up/aurora/renderer` | any host | The pieces a renderer for another host (a native one) builds on. Application code does not need it. |
| `@c9up/aurora/hydrate` | browser | `hydrate` and `resetHydrateWarnings`. |
| `@c9up/aurora/ssr` | any host | `renderToString` and `renderRetaining`. |
| `@c9up/aurora/relay` | browser | The realtime client of `@c9up/relay`. |
| `@c9up/aurora/rpc` | browser | A JSON-RPC client on aurora's HTTP client. |
| `@c9up/aurora/server` | Node | `AuroraManager`, `Pages`, `renderPage`, `serveAssets`, `defineConfig`. |
| `@c9up/aurora/middleware` | Node | The middleware that puts `ctx.aurora` on the request. |
| `@c9up/aurora/provider` | Node | `AuroraProvider` (default export). |
| `@c9up/aurora/services/main` | Node | `setAurora`, `getAurora`, `clearAurora`. |
| `@c9up/aurora/configure` | Node | `configure(codemods)`, run by `ream configure @c9up/aurora`. |

## Exports

### `@c9up/aurora`

#### Templates and components

| Export | Kind | Description |
|---|---|---|
| `html` | function | `` html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult ``: a template. A `${}` in a position that cannot be bound safely throws (see the `E_AURORA_SLOT_*` codes). |
| `isTemplateResult` | function | `isTemplateResult(value: unknown): value is TemplateResult`. |
| `component` | function | `component<P = Record<string, never>>(setup: (props: P) => TemplateResult): (props?: P) => TemplateResult`. `setup` runs once. |
| `onMount` | function | `onMount(fn: EffectCallback): void`: runs after the component is in the DOM; may return a cleanup. Only inside `setup`. |
| `onUnmount` | function | `onUnmount(fn: () => void): void`. Only inside `setup`. |
| `createContext` | function | `createContext<T>(name: string, defaultValue?: T): Context<T>`. |
| `provide` | function | `provide<T>(context: Context<T>, value: T): T`: for the components below, during `setup`. |
| `inject` | function | `inject<T>(context: Context<T>): T`: the nearest provided value, or the default; neither throws `E_AURORA_MISSING_CONTEXT`. |
| `render` | function | `render(result: TemplateResult, container: Element \| DocumentFragment): Disposer`: mounts in the browser. |
| `renderToString` | function | `renderToString(result: TemplateResult): string`: the HTML, with the markers hydration reads. |
| `hydrate` | function | `hydrate(container: Element, factory: () => TemplateResult, options?: HydrateOptions): Disposer`: attaches to server-rendered HTML instead of rebuilding it. |
| `onPageLeave` | function | `onPageLeave(end: () => void): () => void`: runs `end` when a page visit (`visits: true`) leaves this page; returns what takes it back. |
| `cn` | function | `cn(...inputs: ClassValue[]): string`: `clsx` then `twMerge`. |
| `clsx` | function | `clsx(...inputs: ClassValue[]): string`: joins truthy class names. |
| `twMerge` | function | `twMerge(classList: string): string`: keeps the last of conflicting Tailwind classes. |

#### Signals

| Export | Kind | Description |
|---|---|---|
| `signal` | function | `signal<T>(initial: T, options?: { equals?: (a: T, b: T) => boolean }): Signal<T>`. |
| `memo` | function | `memo<T>(fn: () => T, options?: { equals?: (a: T, b: T) => boolean }): ReadSignal<T>`: a derived value, recomputed when what it read changes. |
| `effect` | function | `effect(fn: EffectCallback): () => void`: reruns when what it read changes; returns its disposer. |
| `onCleanup` | function | `onCleanup(fn: () => void): void`: runs before the current effect reruns or is disposed. |
| `batch` | function | `batch<T>(fn: () => T): T`: one update for several writes. |
| `untrack` | function | `untrack<T>(fn: () => T): T`: reads without subscribing. |
| `isSignal` | function | `isSignal<T = unknown>(value: unknown): value is Signal<T>`. |
| `Signal` | interface | `s()` reads, `s(next)` writes, `s(prev => next)` updates. |
| `ReadSignal` | interface | `s()` reads. |

Effects that keep re-triggering each other in one update throw `E_AURORA_REACTIVE_CYCLE`.

#### Lists

| Export | Kind | Description |
|---|---|---|
| `each` | function | `each<T>(items: EachItems<T>, key: (item: T, index: number) => unknown, render: (item: ReadSignal<T>, index: ReadSignal<number>) => unknown, options?: EachOptions): Each`: a keyed list; a row moves with its key. Two rows with one key throw `E_AURORA_DUPLICATE_KEY`. |
| `isEach` | function | `isEach(value: unknown): value is Each`. |
| `EachItems` | type | `readonly T[] \| Signal<readonly T[]> \| ReadSignal<readonly T[]> \| (() => readonly T[])`. |
| `EachOptions` | interface | `{ lazy?: boolean \| LazyOptions }`: render only the rows in view. |
| `LazyOptions` | interface | `{ estimate?: number; overscan?: number; from?: 'start' \| 'end' }`. |
| `Each` | interface | What `each` returns. |

#### Forms and commands

| Export | Kind | Description |
|---|---|---|
| `form` | function | `form<T>(options: FormOptions<T>): Form<T>`: values, field errors, submission state. |
| `command` | function | `command<TArgs extends unknown[], TData>(task: (...args: TArgs) => Promise<TData>): Command<TArgs, TData>`: an async action with `data`, `error` and `loading` signals. |
| `FormOptions` | interface | `{ initial: T; submit: (values: T) => Promise<unknown>; validate?: FormValidate<T> }`. |
| `FormValidate` | type | `((values: T) => FieldErrors<T>) \| FormSchema<T>`. |
| `FormSchema` | interface | A validator object with `validate?(values)` or `validateResult?(values)` returning `{ valid; errors? }`. |
| `FieldErrors` | type | `Partial<Record<keyof T, string>>`. |
| `Form`, `FormField`, `Command` | interface | See below. |

| `Form<T>` member | Signature | Description |
|---|---|---|
| `values` / `errors` / `valid` / `submitting` / `submitError` | `readonly values: ReadSignal<T>` | State signals. |
| `field` | `field<K extends keyof T>(key: K): FormField<T[K]>` | `{ value, error, touched, set(value), markTouched() }`. |
| `set` | `set<K extends keyof T>(key: K, value: T[K]): void` | |
| `validate` | `validate(): boolean` | |
| `handleSubmit` | `handleSubmit(event?: { preventDefault(): void }): Promise<void>` | Validates, then calls `submit`. |
| `setErrors` / `reset` | `setErrors(errors: FieldErrors<T>): void` | |
| `onSuccess` / `onFail` | `onSuccess(handler: (data: unknown) => void): this` | |

| `Command` member | Signature | Description |
|---|---|---|
| `data` / `error` / `loading` | `readonly data: ReadSignal<TData \| null>` | |
| `run` | `run(...args: TArgs): Promise<void>` | |
| `reset` | `reset(): void` | |
| `onSuccess` / `onFail` / `onSettled` | `onSuccess(handler: (data: TData) => void): this` | |

#### HTTP

| Export | Kind | Description |
|---|---|---|
| `HttpClient` | class | A `fetch` client with a base URL, default headers, a bearer token, timeouts and the CSRF header. |
| `http` | const | A default `HttpClient`. |
| `isHttpError` | function | `isHttpError(value: unknown): value is errors.E_AURORA_HTTP_REQUEST_FAILED`: the error of a non-2xx answer, with `status`, `response` and `data`. |
| `isAbortError` | function | `isAbortError(value: unknown): boolean`. |
| `HttpClientOptions` | interface | `{ baseURL?; headers?; token?: string \| null \| (() => string \| null \| undefined); credentials?; allowCrossOriginAuth?: boolean; timeout?: number; xsrf?: boolean; xsrfCookieName?: string; xsrfHeaderName?: string }`. |
| `HttpRequestOptions` | interface | `{ query?; headers?; token?; xsrf?; signal?; timeout?; credentials?; allowCrossOriginAuth?; parse?: (raw: unknown) => T }`. |
| `HttpResult` | type | `{ ok: true; data: T; error: null } \| { ok: false; data: null; error: errors.E_AURORA_HTTP_REQUEST_FAILED }`. |

| `HttpClient` member | Signature | Description |
|---|---|---|
| constructor | `new HttpClient(options?: HttpClientOptions)` | |
| `get` / `delete` | `get<T>(url: string, options?: HttpRequestOptions<T>): Promise<T>` | Rejects with `errors.E_AURORA_HTTP_REQUEST_FAILED` on a non-2xx. |
| `post` / `put` / `patch` | `post<T>(url: string, body?: unknown, options?: HttpRequestOptions<T>): Promise<T>` | |
| `raw` | `raw(method: string, url: string, body?: unknown, options?: HttpRequestOptions)` | |
| `attempt` | `attempt<T>(request: Promise<T>): Promise<HttpResult<T>>` | A result instead of a rejection. |
| `extend` | `extend(options: HttpClientOptions): HttpClient` | A client with these options over its own. |
| `setHeader` / `setHeaders` / `removeHeader` / `getHeaders` | `setHeader(name: string, value: string): this` | |

The CSRF header (`X-XSRF-TOKEN` from the `XSRF-TOKEN` cookie) is sent on same-origin requests; the bearer token is not sent to another origin unless `allowCrossOriginAuth`.

#### Browser helpers

| Export | Kind | Description |
|---|---|---|
| `navigate` / `redirect` / `replace` / `reload` / `back` / `forward` | function | Location and history. `navigate(url: string): void`. |
| `hash` | function | `hash(): Signal<string>`. |
| `queryParam` | function | `queryParam(key: string): Signal<string \| null>`. |
| `mediaQuery` | function | `mediaQuery(query: string): Signal<boolean>`. |
| `prefersDark` / `online` / `visibility` | function | `(): Signal<boolean>`. |
| `windowSize` | function | `windowSize(): Signal<WindowSize>`. |
| `WebStorage` | class | `localStorage` or `sessionStorage` under a prefix: `get`, `set`, `getJSON`, `setJSON`, `has`, `remove`, `getOrSet`, `keys`, `clear`. |
| `storage` / `session` | const | `WebStorage` over `localStorage` / `sessionStorage`. |
| `persistedSignal` | function | `persistedSignal<T>(key: string, initial: T, options?: PersistedSignalOptions): Signal<T>`: a signal mirrored to web storage, and across tabs for `localStorage` (`crossTab`, `true` by default). |
| `cookie` | const | `get(name)`, `set(name, value, options?)`, `remove(name, options?)`; reads the request's cookies during SSR. |
| `cookieSignal` | function | `cookieSignal(name: string, initial: string, options?: CookieOptions): Signal<string>`. |
| `cookieState` | function | `cookieState<T>(name: string, initial: T, codec: CookieCodec<T>, options?: CookieOptions): Signal<T>`. |
| `booleanCookie` | const | `CookieCodec<boolean>`. |
| `jsonCookie` | function | `jsonCookie<T>(fallback: T): CookieCodec<T>`. |
| `setCookieStore` / `getCookieStore` | function | The cookie values SSR reads. |
| `clipboard` | const | `copy(text: string): Promise<boolean>`, `read(): Promise<string \| null>`. |
| `share` | function | `share(data: ShareData): Promise<boolean>`: the Web Share API. |
| `CookieOptions` | interface | `{ path?; maxAge?; expires?; domain?; sameSite?: 'strict' \| 'lax' \| 'none'; secure? }`. |
| `CookieCodec` | interface | `{ parse(raw: string): T; serialize(value: T): string }`. |
| `WebStorageOptions` | interface | `{ prefix?: string; area?: StorageArea }`. |
| `PersistedSignalOptions` | interface | `WebStorageOptions` plus `crossTab?: boolean`. |
| `StorageArea` | type | `'local' \| 'session'`. |
| `WindowSize` | interface | `{ width: number; height: number }`. |
| `ShareData` | interface | `{ title?; text?; url? }`. |

#### Routes

| Export | Kind | Description |
|---|---|---|
| `urlFor` | function | `urlFor(name: string, params?: Record<string, string \| number>, query?: Record<string, string \| number>): string`: a named route's URL, on the server and in the browser. |
| `setRouteManifest` / `getRouteManifest` | function | The name-to-pattern map `urlFor` reads; `renderPage` ships it to the browser. |
| `auroraRoute` | function | `auroraRoute(config: AuroraRouteConfig): (ctx: AuroraHttpContext) => Promise<void>`: a route handler that renders a component and sends the whole document. |
| `AuroraRouteConfig` | interface | `{ render: (ctx) => TemplateResult \| Promise<TemplateResult>; entry?: string; shell?: (body: string, entry: string) => string }`. |
| `AuroraHttpContext`, `AuroraResponse` | interface | The request context `auroraRoute` needs. |

#### Hydration state and ids

| Export | Kind | Description |
|---|---|---|
| `hydrationState` | function | `hydrationState(): HydrationState`: `'pending' \| 'hydrating' \| 'hydrated'`. |
| `whenHydrated` | function | `whenHydrated(): Promise<void>`. |
| `hydrationErrors` | function | `hydrationErrors(): readonly unknown[]`. |
| `uid` | function | `uid(prefix?: string): string`: an id that is the same on the server and in the browser. |
| `withIdScope` | function | `withIdScope<T>(scope: string, work: () => T): T`. |
| `resetIds` | function | `resetIds(scope?: string): void`. |
| `byId` | function | `byId(id: string): HTMLElement \| null`. |
| `HydrateOptions` | interface | `{ idScope?: string }`. |
| `HydrationState`, `HydrationDetail` | type | |

#### Motion

| Export | Kind | Description |
|---|---|---|
| `MotionValue` | class | `new MotionValue(initial: number)`: `set(value)`, `stop()`, `timing(to: number, options?: TimingOptions)` (300 ms by default), `after(duration: number, to: number)`, `spring(to: number, options?: SpringOptions)` (stiffness 180, damping 12, mass 1 by default). |
| `MotionNode` | class | A value derived by `interpolate(input, output)`. |
| `MotionModel` | class | The in-process motion driver. |
| `motionDriver` / `setMotionDriver` | function | The driver motion values run on; a native renderer installs its own. |
| `readMotionStyle` | function | `readMotionStyle(value: unknown): MotionStyle`. |
| `MotionStyle` | interface | `{ opacity?; translateX?; translateY?; scale?; visible? }`, the values `motion=${…}` drives. Anything else throws `E_AURORA_INVALID_MOTION`. |
| `TimingOptions` | interface | `{ duration?: number; loop?: boolean; yoyo?: boolean }`. |
| `SpringOptions` | interface | `{ stiffness?: number; damping?: number; mass?: number }`. |
| `MotionDriver`, `MotionTrack` | type | |

#### Live components

| Export | Kind | Description |
|---|---|---|
| `createLiveRegistry` | function | `createLiveRegistry(options?: LiveRegistryOptions): LiveRegistry`: server sessions of live components. |
| `createLiveRouter` | function | `createLiveRouter(registry: LiveRegistry, relay: RelayBroadcaster): LiveRouter`: mounts sessions and routes client events, patches broadcast through relay. |
| `wireLiveEvents` | function | `wireLiveEvents(router: LiveHttpRouter, live: LiveRouter, identify: IdentifyLiveCaller<LiveHttpContext>, options?: WireLiveEventsOptions): void`: the `POST` route that receives client events (`DEFAULT_LIVE_EVENT_PATH`, `/__live/event`). |
| `authorizeLiveChannel` | function | `authorizeLiveChannel<C>(live: LiveRouter, identify: IdentifyLiveCaller<C>): (ctx: C, params: { id: string }) => Promise<boolean>`: a relay authorizer that lets only a session's owner subscribe. |
| `mountLiveSession` | function | `mountLiveSession(factory: () => LiveComponentDefinition, idScope?: string): LiveSession`. |
| `liveStore` | function | `liveStore(factory: () => LiveComponentDefinition, relay: RelayBroadcaster, channel: string): LiveStore`: one shared session broadcast to everyone on a channel. |
| `connectPatches` | function | `connectPatches(session: LiveSession, relay: RelayBroadcaster, channel: string): () => void`. |
| `liveClient` | function | `liveClient(opts: LiveClientOptions): () => void`: the browser side; applies patches and posts events. |
| `buildLiveTransport` | function | `buildLiveTransport(relayClient: RelaySubscribeClient, http: LiveHttpPoster, options?: { path?: string }): LiveClientTransport`. Its `keepAlive(id)` posts `{ id, keepAlive: true }` to the event route. |
| `DEFAULT_LIVE_KEEP_ALIVE_MS` | const | `120000`: how often `liveClient` keeps its session alive (`LiveClientOptions.keepAliveMs`). |
| `DEFAULT_LIVE_EVENT_PATH` | const | `'/__live/event'`. |
| `LiveComponentDefinition` | interface | `{ view: TemplateResult; handlers?: Record<string, (payload?: unknown) => void> }`. |
| `LiveSession` | interface | `renderToString()`, `dispatch(event, payload?)`, `drainPatches()`, `onPatch(listener)`, `dispose()`. |
| `SlotPatch` | interface | `{ slot: number; value: string }`. |
| `LiveRegistryOptions` | interface | `{ claimTimeoutMs?; idleTimeoutMs?; maxPerOwner?: number; maxSessions?: number }`. `maxPerOwner` 32, `maxSessions` 10 000, `idleTimeoutMs` ten minutes. |
| `LiveRegistry` | interface | `define(name, factory)`, `has`, `mount(name, ownerId)`, `claim`, `get`, `ownerOf`, `dispose`, `disposeOwner`, `disposeAll`, `size`. |
| `LiveRouter` | interface | `mount(name, ownerId): LiveMount`, `event(id, event, payload, callerId): LiveEventOutcome`, `keepAlive(id, callerId): LiveEventOutcome`, `authorizeChannel`, `ownerOf`, `disconnect`, `channelFor`. |
| `LiveMount` | interface | `{ id: string; channel: string; html: string }`. |
| `LiveEventOutcome` | type | `'handled' \| 'unknown-session' \| 'forbidden' \| 'unknown-event'`. |
| `LiveStore`, `LiveSessionHandle`, `LiveClientOptions`, `LiveClientTransport`, `LiveHttpPoster`, `LiveHttpContext`, `LiveHttpRouter`, `LiveEventBody`, `LiveKeepAliveBody`, `WireLiveEventsOptions`, `RelayBroadcaster`, `RelaySubscribeClient`, `IdentifyLiveCaller` | type | |

#### Diagnostics, errors and types

| Export | Kind | Description |
|---|---|---|
| `countRerenders` | function | `countRerenders(options?: RerenderOptions): RerenderCounter`: counts effect, memo, slot, list, attribute, property and setup reruns; can highlight or log them. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `TemplateResult` | interface | What `html` returns. |
| `Disposer` | type | `() => void`. |
| `Context` | interface | `{ key: symbol; name: string; hasDefault: boolean; defaultValue: T \| undefined }`. |
| `ClassValue` | type | What `cn` and `clsx` take. |
| `RerenderCounter`, `RerenderEvent`, `RerenderKind`, `RerenderOptions` | type | |

### `@c9up/aurora/core`

The host-free subset of `@c9up/aurora`: `html`, `isTemplateResult`, `component`, `onMount`, `onUnmount`, `createContext`, `provide`, `inject`, `signal`, `memo`, `effect`, `onCleanup`, `batch`, `untrack`, `isSignal`, `each`, `isEach`, `form`, `command`, `uid`, `withIdScope`, `cn`, `clsx`, `twMerge`, the motion exports, `countRerenders`, `errors` and their types. A component that imports only from here runs on the server, in the browser and on a phone.

### `@c9up/aurora/renderer`

| Export | Kind | Description |
|---|---|---|
| `TemplateScanner` | class | Reads a template's static parts and says where each slot sits. |
| `assertBindable` | function | `assertBindable(scanner: TemplateScanner): BindablePosition`: throws the `E_AURORA_SLOT_*` code for a refused position. |
| `assertBindableProperty` | function | `assertBindableProperty(element: string, property: string): void`. |
| `readComponentLifecycle` | function | `readComponentLifecycle(result: TemplateResult): ComponentLifecycle \| undefined`: the mount hooks and cleanups a `component()` attached. |
| `bindTemplateContext` | function | `bindTemplateContext(result: TemplateResult, value: unknown): unknown`: runs a slot's function under its template's context. |
| `captureContext` | function | `captureContext(): <T>(fn: () => T) => T`: the providers in reach now, for work done later. |
| `setOwner` | function | `setOwner(owner: Array<() => void> \| undefined): Array<() => void> \| undefined`: where effects created now are disposed. |
| `readEach` / `readEachItems` | function | `readEach(value: unknown): EachList \| undefined`; `readEachItems<T>(items: EachItems<T>): readonly T[]`. |
| `LazyLayout` | class | Row heights and spacers of a lazy list. |
| `firstWindow` / `sameWindow` | function | The first rows of a lazy list; window equality. |
| `guardUrlAttribute` / `guardUrlProperty` | function | The URL guard applied to URL-bearing attributes and properties. |
| `isTemplateResult` | function | |
| `ComponentLifecycle`, `EachList`, `LazyList`, `LazyView`, `LazyWindow`, `BindablePosition`, `EffectCallback`, `TemplateResult` | type | |

### `@c9up/aurora/hydrate` and `@c9up/aurora/ssr`

| Export | Entry | Description |
|---|---|---|
| `hydrate` | `/hydrate` | Same as in `@c9up/aurora`. |
| `HydrateOptions` | `/hydrate` | `{ idScope?: string }`. |
| `resetHydrateWarnings` | `/hydrate` | `resetHydrateWarnings(): void`: lets a mismatch warning print again. |
| `renderToString` | `/ssr` | Same as in `@c9up/aurora`. |
| `renderRetaining` | `/ssr` | `renderRetaining(result: TemplateResult, owned: Set<() => void>): string`: renders and hands the disposers to the caller. |

### `@c9up/aurora/relay`

| Export | Kind | Description |
|---|---|---|
| `relay` | function | `relay(): RelayClient`: the page's single connection to relay, opened on first call. |
| `configureRelay` | function | `configureRelay(options: RelayOptions): void`. |
| `RelayClient` | interface | `subscribe<E>(channel: string, handler: (event: E) => void): () => void`, `on(status, callback): () => void`, `close(): void`. |
| `RelayStatus` | type | `'connecting' \| 'connected' \| 'disconnected' \| 'reconnecting'`. |
| `RelayOptions` | interface | See below. |
| `RelayStream`, `RelayStreamEvent`, `RelayFetch` | type | What `stream` and `fetch` replace. |

| `RelayOptions` | Type | Default | Description |
|---|---|---|---|
| `sseUrl` | `string` | `'/__relay/events'` | |
| `subscribeUrl` | `string` | `'/__relay/subscribe'` | |
| `unsubscribeUrl` | `string` | `'/__relay/unsubscribe'` | |
| `bearer` | `string` | `''` | Token sent with subscribe requests. |
| `maxReconnectAttempts` | `number` | `5` | |
| `onReconnectAttempt` / `onReconnectFailed` | function | none | |
| `stream` | `(url: string) => RelayStream` | `new EventSource(url)` | |
| `fetch` | `RelayFetch` | `fetch` | |

### `@c9up/aurora/rpc`

| Export | Kind | Description |
|---|---|---|
| `createRpcClient` | function | `createRpcClient(options?: RpcClientOptions): RpcClient`: a `@c9up/comet` client sending through an `HttpClient`. |
| `RpcClientOptions` | interface | `{ url?: string; http?: HttpClient; headers?: Record<string, string>; xsrf?: boolean; xsrfCookieName?: string; xsrfHeaderName?: string }`. `url` defaults to `/rpc`, `xsrf` to `true`. |
| `RpcError`, `isRpcError` | re-export | From `@c9up/comet`. |
| `RpcClient`, `RpcCall`, `RpcCallOptions`, `RpcResult` | type | From `@c9up/comet`. |

### `@c9up/aurora/server`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig(config: AuroraManagerConfig): AuroraManagerConfig`. |
| `AuroraManager` | class | Pages, assets and rendering for the application; `ctx.aurora` renders through it. |
| `Pages` | class | Resolves a page name to its module under `pages.root`. |
| `renderPage` | function | `renderPage<P>(ctx: RenderHttpContext, pages: Pages, name: string, props: P, options?: RenderPageOptions): Promise<void>`: renders a page and sends the document. |
| `serveAssets` | function | `serveAssets(options: ServeAssetsOptions): (ctx: AssetsHttpContext) => Promise<void>`: a static file handler confined to `root`. |
| `packageAssetDir` | function | `packageAssetDir(specifier: string): string`: the `dist/` of an installed package. |
| `auroraContext` | function | Same as in `@c9up/aurora/middleware`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `pageImportError` | function | Builds the error of a page that failed to import. |
| `AuroraManagerConfig` | interface | See [Configuration](#configuration). |
| `PagesConfig` | interface | `{ root: string; urlPrefix?: string; extension?: string }`. |
| `PageFactory` | type | `(props: P) => TemplateResult \| Promise<TemplateResult>`: a page module's default export. |
| `RenderPageOptions` | interface | See below. |
| `SharedProps` | type | `Record<string, unknown>`. |
| `SharedPropsResolver` | type | `(ctx: RenderHttpContext) => SharedProps \| Promise<SharedProps>`. |
| `ClientRoutesFilter` | type | `{ only?: readonly string[]; except?: readonly string[] } \| ((name: string, pattern: string) => boolean)`. |
| `RenderHttpContext`, `RenderResponse`, `AssetsHttpContext`, `AssetsRequest`, `AssetsResponse`, `ServeAssetsOptions`, `AuroraRequestRenderer` | type | |

| `AuroraManager` member | Signature | Description |
|---|---|---|
| constructor | `new AuroraManager(config: AuroraManagerConfig)` | |
| `render` | `render(ctx: RenderHttpContext, name: string, props: unknown, options?: RenderPageOptions): Promise<void>` | `renderPage` with the config's defaults. |
| `pages` | `readonly pages: Pages` | |
| `assetsPrefix` / `auroraAssetPath` / `pageAssetPath` | `readonly assetsPrefix: string` | `/__assets`, `/__assets/aurora`, `/__assets/pages` by default. |
| `browserPackages` | `readonly browserPackages: readonly BrowserPackage[]` | Packages served to the browser. |
| `importmap` | `readonly importmap: Record<string, string>` | |
| `auroraAssetsHandler` / `pageAssetsHandler` | `auroraAssetsHandler(): (ctx: AssetsHttpContext) => Promise<void>` | The asset handlers the provider mounts. |

| `Pages` member | Signature | Description |
|---|---|---|
| constructor | `new Pages(config: PagesConfig)` | `urlPrefix` defaults to `/__assets/pages`, `extension` to `.js`. |
| `register` | `register<P>(name: string, factory: PageFactory<P>): void` | A page without a file, for bundled apps and tests. |
| `resolve` | `resolve(name: string): Promise<PageFactory>` | Imports the page module on every call. |
| `urlFor` | `urlFor(name: string): string` | The page module's URL for the browser. |

| `RenderPageOptions` | Type | Description |
|---|---|---|
| `title` | `string` | `<title>`. |
| `lang` | `string` | `<html lang>`. |
| `nonce` | `string` | CSP nonce for the inline scripts. |
| `headExtra` | `string` | Markup added to `<head>`. |
| `jsonLd` | `object \| readonly object[]` | Structured data. |
| `rootId` / `rootTag` / `rootClass` | `string` | The element the page renders into. A tag that is not a plain element name throws `E_AURORA_ILLEGAL_ROOT_TAG`. |
| `importmap` | `Record<string, string>` | Merged over the config's. |
| `shared` | `SharedProps \| SharedPropsResolver` | Merged over the config's. |
| `assetsVersion` | `string` | |
| `routes` / `clientRoutes` | `Record<string, string>` / `ClientRoutesFilter` | Named routes sent to the browser for `urlFor`. |
| `cookies` | `string[]` | Cookies the server reads from the request so `cookieSignal` renders the same state as the browser. Never list a session, signed or `httpOnly` cookie. |

### `@c9up/aurora/middleware`, `@c9up/aurora/services/main`, `@c9up/aurora/provider`

| Export | Entry | Description |
|---|---|---|
| `AuroraContextMiddleware` | `/middleware` (default) | Middleware class: puts `ctx.aurora` on the request. |
| `auroraContext` | `/middleware` | `auroraContext(ctx, next: () => Promise<void>): Promise<void>`: the same as a function. |
| `AuroraRequestRenderer` | `/middleware` | `ctx.aurora`: `render(name: string, props?: unknown, options?: RenderPageOptions): Promise<void>`. |
| `setAurora` / `getAurora` / `clearAurora` | `/services/main` | The `AuroraManager` the module singleton holds. Reading it before it is set throws `E_AURORA_NOT_BOOTED`. |
| `AuroraProvider` | `/provider` (default) | Binds the manager and mounts the asset middleware. |
| `AuroraAppContext` | `/provider` | The host the provider needs: `container`, `config`. |
| `configure` | `/configure` | `configure(codemods): Promise<void>`. |

## Configuration

`config/aurora.ts` exports `defineConfig({ … })` from `@c9up/aurora/server`. The configure stub writes `pages.root: 'resources/pages'` and `root.tag: 'div'`.

| Option | Type | Default | Description |
|---|---|---|---|
| `pages.root` | `string` | (required) | The pages directory; relative to the application root. `ctx.aurora.render('dashboard/show')` loads `dashboard/show.js` there. |
| `pages.urlPrefix` | `string` | `<assetsPrefix>/pages` | URL the browser loads pages from. |
| `pages.extension` | `string` | `'.js'` | |
| `shared` | `SharedProps \| SharedPropsResolver` | none | Props merged into every page. |
| `root.tag` / `root.class` | `string` | | The page's root element. |
| `assetsVersion` | `string` | none | Version sent in the page; with `visits`, a deploy reloads stale clients. |
| `clientRoutes` | `ClientRoutesFilter` | none | Which named routes every page carries to the browser. |
| `assetsPrefix` | `string` | `'/__assets'` | Where the asset routes mount. |
| `importmap` | `Record<string, string>` | aurora's own | Importmap entries merged over aurora's. |
| `browserPackages` | `string[]` | `[]` | More packages served to the browser (`'@c9up/atom'`); `@c9up/comet` and `@c9up/chronos` are served when installed. |
| `visits` | `boolean` | `false` | Page visits without a document reload, through photon's protocol. Needs `@c9up/photon` 0.1.25 or later. |
| `auroraDistRoot` / `cometDistRoot` / `chronosDistRoot` / `photonDistRoot` | `string` | the installed package's `dist/` | Serve another build. |

## Container bindings

| Token | Resolves to |
|---|---|
| `AuroraManager` (class), `'aurora'` | The `AuroraManager` built from `config/aurora.ts`. |

`'aurora'` is declared on `ContainerBindings`, and `ctx.aurora` on the HTTP context, by `@c9up/aurora/server`. In `start()` the provider mounts the asset routes as server middleware: `/__assets/aurora/*`, `/__assets/pages/*`, and one route per browser package.

## Errors

| Code | Raised when |
|---|---|
| [`E_AURORA_ILLEGAL_PAGE_NAME`](/en/reference/errors#e-aurora-illegal-page-name) | A page name holds characters a page name may not. |
| [`E_AURORA_PAGE_OUTSIDE_ROOT`](/en/reference/errors#e-aurora-page-outside-root) | The resolved page path lands outside `pages.root`. |
| [`E_AURORA_PAGE_NOT_FOUND`](/en/reference/errors#e-aurora-page-not-found) | No file for this page name. |
| [`E_AURORA_PAGE_IMPORT_FAILED`](/en/reference/errors#e-aurora-page-import-failed) | The page is on disk and its module graph refused to load. |
| [`E_AURORA_PAGE_INVALID_EXPORT`](/en/reference/errors#e-aurora-page-invalid-export) | The page module does not default-export a factory. |
| [`E_AURORA_ILLEGAL_ROOT_TAG`](/en/reference/errors#e-aurora-illegal-root-tag) | `renderPage` was given a root tag that is not a plain element name. |
| [`E_AURORA_OUTSIDE_COMPONENT`](/en/reference/errors#e-aurora-outside-component) | `onMount` / `onUnmount` was called outside a `component()` setup. |
| [`E_AURORA_MISSING_CONTEXT`](/en/reference/errors#e-aurora-missing-context) | `inject` found no provider, and the context has no default. |
| [`E_AURORA_NOT_BOOTED`](/en/reference/errors#e-aurora-not-booted) | The manager singleton was read before the provider or `setAurora` set it. |
| [`E_AURORA_UNKNOWN_ROUTE`](/en/reference/errors#e-aurora-unknown-route) | `urlFor` was given a name absent from the route manifest. |
| [`E_AURORA_MISSING_ROUTE_PARAMS`](/en/reference/errors#e-aurora-missing-route-params) | `urlFor` was not given every required param. |
| [`E_AURORA_UNKNOWN_LIVE_COMPONENT`](/en/reference/errors#e-aurora-unknown-live-component) | A live component was mounted before `registry.define()` named it. |
| [`E_AURORA_LIVE_SESSION_LIMIT`](/en/reference/errors#e-aurora-live-session-limit) | The registry holds `maxSessions` already, all of them in use. Status 503. |
| [`E_AURORA_RELAY_REQUEST_FAILED`](/en/reference/errors#e-aurora-relay-request-failed) | A relay request came back with a non-2xx status. |
| [`E_AURORA_UNSAFE_URL`](/en/reference/errors#e-aurora-unsafe-url) | A navigation URL failed the same-origin or scheme check. |
| [`E_AURORA_SLOT_IN_TAG_NAME`](/en/reference/errors#e-aurora-slot-in-tag-name) | A `${}` where a tag name goes. |
| [`E_AURORA_SLOT_IN_ATTRIBUTE_NAME`](/en/reference/errors#e-aurora-slot-in-attribute-name) | A `${}` where an attribute name goes. |
| [`E_AURORA_SLOT_IN_RAW_TEXT`](/en/reference/errors#e-aurora-slot-in-raw-text) | A `${}` inside `<script>`, `<style>`, `<textarea>`, `<title>`… |
| [`E_AURORA_SLOT_IN_COMMENT`](/en/reference/errors#e-aurora-slot-in-comment) | A `${}` inside a comment, a `<!…>` / `<?…>` or a CDATA section. |
| [`E_AURORA_SLOT_IN_EVENT_ATTRIBUTE`](/en/reference/errors#e-aurora-slot-in-event-attribute) | A `${}` in an `on*` attribute. |
| [`E_AURORA_SLOT_IN_SRCDOC`](/en/reference/errors#e-aurora-slot-in-srcdoc) | A `${}` in `srcdoc`. |
| [`E_AURORA_SLOT_IN_BASE_URL`](/en/reference/errors#e-aurora-slot-in-base-url) | A `${}` in `<base href>`. |
| [`E_AURORA_SLOT_IN_SCRIPT_SOURCE`](/en/reference/errors#e-aurora-slot-in-script-source) | A `${}` in the URL a `<script>` loads. |
| [`E_AURORA_SLOT_IN_HTML_PROPERTY`](/en/reference/errors#e-aurora-slot-in-html-property) | A `.prop` binding names a property that parses its value as HTML. |
| [`E_AURORA_TEMPLATE_IN_ATTRIBUTE`](/en/reference/errors#e-aurora-template-in-attribute) | A nested `html` template in an attribute value or `.value`. |
| [`E_AURORA_FILE_INPUT_VALUE`](/en/reference/errors#e-aurora-file-input-value) | `.value` was given a non-empty string on an `<input type="file">`. |
| [`E_AURORA_DUPLICATE_KEY`](/en/reference/errors#e-aurora-duplicate-key) | Two rows of an `each()` list share a key. |
| [`E_AURORA_INVALID_LAZY`](/en/reference/errors#e-aurora-invalid-lazy) | `each(…, { lazy })` was given an invalid `estimate` or `overscan`. |
| [`E_AURORA_VISITS_NEED_PHOTON`](/en/reference/errors#e-aurora-visits-need-photon) | `visits` is on and `@c9up/photon` is missing or too old. |
| [`E_AURORA_VISIT_PROPS`](/en/reference/errors#e-aurora-visit-props) | With `visits` on, a page's props were not an object. |
| [`E_AURORA_INVALID_MOTION`](/en/reference/errors#e-aurora-invalid-motion) | `motion=${…}` was not an object of motion values, or named a property motion cannot drive. |
| [`E_AURORA_REACTIVE_CYCLE`](/en/reference/errors#e-aurora-reactive-cycle) | Effects kept re-running each other in one update. |
| [`E_AURORA_VISIT_NO_PAGE_DATA`](/en/reference/errors#e-aurora-visit-no-page-data) | With `visits` on, the page carries no usable page data script (`script[data-aurora-page]`) to boot from. |
| [`E_AURORA_VISIT_CROSS_ORIGIN_MODULE`](/en/reference/errors#e-aurora-visit-cross-origin-module) | With `visits` on, a page module's URL is not on the page's own origin. |
| [`E_AURORA_VISIT_ASYNC_FIRST_PAGE`](/en/reference/errors#e-aurora-visit-async-first-page) | With `visits` on, the first page's factory is async: a hydrated page renders synchronously. |
| [`E_AURORA_INVALID_LIVE_LIMIT`](/en/reference/errors#e-aurora-invalid-live-limit) | A live registry limit (`maxSessions`, `maxPerOwner`, `claimTimeoutMs`, `idleTimeoutMs`) is not a positive number. |
| [`E_AURORA_BROWSER_ENTRY_OUTSIDE_DIST`](/en/reference/errors#e-aurora-browser-entry-outside-dist) | A browser package declares its entry outside the `dist/` aurora serves for it. |
| [`E_AURORA_BROWSER_ENTRY_AT_ROOT`](/en/reference/errors#e-aurora-browser-entry-at-root) | A browser package has its entry at the package root: serving it would publish the whole package. |
| [`E_AURORA_BROWSER_PACKAGE_CLASH`](/en/reference/errors#e-aurora-browser-package-clash) | Two browser packages would mount on the same asset path. |
| [`E_AURORA_HTTP_REQUEST_FAILED`](/en/reference/errors#e-aurora-http-request-failed) | An `HttpClient` request came back with a non-2xx status. Carries `response` and the parsed `data`; `status` is the response's. |
| [`E_AURORA_INTERNAL`](/en/reference/errors#e-aurora-internal) | An invariant inside aurora broke: a bug in aurora. |

## Migration

- `AuroraError` is gone: test `error.code`, or `error instanceof errors.E_AURORA_*` with `import { errors } from '@c9up/aurora'` (also exported by `@c9up/aurora/core` and `@c9up/aurora/server`).
- `AuroraRangeError` is gone: `E_AURORA_INVALID_LIVE_LIMIT` is no longer a `RangeError`; catch it by its code.
- `HttpError` becomes `errors.E_AURORA_HTTP_REQUEST_FAILED`, with the same `status`, `response` and `data`; `isHttpError` still narrows to it.
- The `AuroraErrorCode` type is gone: `error.code` is a `string`.
- Templates are read the way the browser reads them. A slot in `onclick ="${v}"`, `srcdoc ="${v}"`, `<script src ="${v}">` or `<base href ="${v}">` (whitespace before the `=`), in `x/onclick="${v}"`, in `<img ='${v}'>`, or inside `<script/x>` or `<style/x>` now throws the error the ordinary spelling throws. `href = "${url}"` (whitespace on both sides) no longer throws `E_AURORA_SLOT_IN_ATTRIBUTE_NAME`: it is an `href`, guarded like `href="${url}"`. Write the ordinary spelling.
- `renderToString` writes an unquoted value that holds a slot between double quotes: `title=${x}` comes out as `title="…"`, and `title=""` when `x` is empty. A test that compared the markup byte for byte must expect the quotes.
- The page data script is now `<script type="application/json" data-aurora-page>`, written first in the `<body>`, before the root; it no longer has `id="aurora-page-data"`. Code that read it with `getElementById('aurora-page-data')` must use `document.querySelector('script[data-aurora-page][type="application/json"]')`.
- With `visits` on, a page module is imported only from the page's own origin: a `modules` pattern on another origin (or `data:`, or `//host/…`) throws `E_AURORA_VISIT_CROSS_ORIGIN_MODULE`. Serve page modules from your own origin.
- A live registry ends a claimed session after ten minutes without an event or a keep-alive (`idleTimeoutMs`, was off). `liveClient` sends the keep-alive through `buildLiveTransport`; a custom transport needs a `keepAlive(id)` posting `{ id, keepAlive: true }`, or set `idleTimeoutMs` yourself.
- A full live registry now evicts the oldest unclaimed session, or the least recently used one silent for half of `idleTimeoutMs`, before `mount` throws `E_AURORA_LIVE_SESSION_LIMIT`. An event the component does not handle no longer claims the session.
- `@click ="${h}"`, `@click= "${h}"` and `x="1"@click="${h}"` are listeners on the server too: `renderToString` no longer calls `h` and writes nothing for them.

## See also

- [Introduction](/en/guides/frontend/aurora/)
- [Templates](/en/guides/frontend/aurora/templates)
- [Signals](/en/guides/frontend/aurora/signals)
- [Forms and actions](/en/guides/frontend/aurora/forms)
- [Browser helpers](/en/guides/frontend/aurora/browser)
- [Server rendering](/en/guides/frontend/aurora/server-rendering)
- [Live components](/en/guides/frontend/aurora/live)
- [Shared pages](/en/guides/frontend/aurora/shared-pages)
- [JSON-RPC clients](/en/guides/apis/json-rpc-clients)
- [Gestures and motion](/en/guides/mobile/gestures-and-motion)
