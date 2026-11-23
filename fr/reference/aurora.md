# aurora

`@c9up/aurora` : des composants écrits en templates balisés sur des signaux, rendus en HTML côté serveur et hydratés dans le navigateur, sans étape de build. Guide : [Introduction](/fr/guides/frontend/aurora/).

## Installation

```bash
pnpm add @c9up/aurora
ream configure @c9up/aurora
```

`ream configure @c9up/aurora` enregistre le provider et le middleware de routeur `@c9up/aurora/middleware`, et écrit `config/aurora.ts`. Dépendances pair optionnelles : `@c9up/comet` pour `@c9up/aurora/rpc`, `@c9up/photon` pour les visites de page (`visits: true`).

## Points d'entrée

aurora a des entrées navigateur et des entrées serveur. Les entrées navigateur n'importent aucun module Node ; les entrées serveur, si. N'importez une entrée serveur que depuis du code serveur.

| Import | S'exécute | Contenu |
|---|---|---|
| `@c9up/aurora` | navigateur, serveur | Tout ce qu'utilisent un composant et un script de page : `html`, `component`, les signaux, les listes, les formulaires, le client HTTP, `render`, `hydrate`, les outils du navigateur, les routes, le mouvement, les composants live. |
| `@c9up/aurora/core` | tout hôte | La partie de `@c9up/aurora` sans hôte : templates, composants, signaux, listes, formulaires, commandes, mouvement. Ni DOM ni module Node. |
| `@c9up/aurora/renderer` | tout hôte | Les pièces sur lesquelles se construit un renderer pour un autre hôte (natif). Le code applicatif n'en a pas besoin. |
| `@c9up/aurora/hydrate` | navigateur | `hydrate` et `resetHydrateWarnings`. |
| `@c9up/aurora/ssr` | tout hôte | `renderToString` et `renderRetaining`. |
| `@c9up/aurora/relay` | navigateur | Le client temps réel de `@c9up/relay`. |
| `@c9up/aurora/rpc` | navigateur | Un client JSON-RPC sur le client HTTP d'aurora. |
| `@c9up/aurora/server` | Node | `AuroraManager`, `Pages`, `renderPage`, `serveAssets`, `defineConfig`. |
| `@c9up/aurora/middleware` | Node | Le middleware qui pose `ctx.aurora` sur la requête. |
| `@c9up/aurora/provider` | Node | `AuroraProvider` (export par défaut). |
| `@c9up/aurora/services/main` | Node | `setAurora`, `getAurora`, `clearAurora`. |
| `@c9up/aurora/configure` | Node | `configure(codemods)`, exécuté par `ream configure @c9up/aurora`. |

## Exports

### `@c9up/aurora`

#### Templates et composants

| Export | Nature | Description |
|---|---|---|
| `html` | fonction | `` html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult `` : un template. Un `${}` placé là où il ne peut pas être lié sans risque lève une erreur (voir les codes `E_AURORA_SLOT_*`). |
| `isTemplateResult` | fonction | `isTemplateResult(value: unknown): value is TemplateResult`. |
| `component` | fonction | `component<P = Record<string, never>>(setup: (props: P) => TemplateResult): (props?: P) => TemplateResult`. `setup` s'exécute une fois. |
| `onMount` | fonction | `onMount(fn: EffectCallback): void` : s'exécute une fois le composant dans le DOM ; peut renvoyer un nettoyage. Seulement dans `setup`. |
| `onUnmount` | fonction | `onUnmount(fn: () => void): void`. Seulement dans `setup`. |
| `createContext` | fonction | `createContext<T>(name: string, defaultValue?: T): Context<T>`. |
| `provide` | fonction | `provide<T>(context: Context<T>, value: T): T` : pour les composants en dessous, pendant `setup`. |
| `inject` | fonction | `inject<T>(context: Context<T>): T` : la valeur fournie la plus proche, ou la valeur par défaut ; sans l'une ni l'autre, lève `E_AURORA_MISSING_CONTEXT`. |
| `render` | fonction | `render(result: TemplateResult, container: Element \| DocumentFragment): Disposer` : monte dans le navigateur. |
| `renderToString` | fonction | `renderToString(result: TemplateResult): string` : le HTML, avec les marqueurs que lit l'hydratation. |
| `hydrate` | fonction | `hydrate(container: Element, factory: () => TemplateResult, options?: HydrateOptions): Disposer` : s'attache au HTML rendu par le serveur au lieu de le reconstruire. |
| `onPageLeave` | fonction | `onPageLeave(end: () => void): () => void` : exécute `end` quand une visite de page (`visits: true`) quitte cette page ; renvoie de quoi l'annuler. |
| `cn` | fonction | `cn(...inputs: ClassValue[]): string` : `clsx` puis `twMerge`. |
| `clsx` | fonction | `clsx(...inputs: ClassValue[]): string` : joint les noms de classe vrais. |
| `twMerge` | fonction | `twMerge(classList: string): string` : garde la dernière de classes Tailwind en conflit. |

#### Signaux

| Export | Nature | Description |
|---|---|---|
| `signal` | fonction | `signal<T>(initial: T, options?: { equals?: (a: T, b: T) => boolean }): Signal<T>`. |
| `memo` | fonction | `memo<T>(fn: () => T, options?: { equals?: (a: T, b: T) => boolean }): ReadSignal<T>` : une valeur dérivée, recalculée quand ce qu'elle a lu change. |
| `effect` | fonction | `effect(fn: EffectCallback): () => void` : se réexécute quand ce qu'il a lu change ; renvoie sa fonction de libération. |
| `onCleanup` | fonction | `onCleanup(fn: () => void): void` : s'exécute avant que l'effet courant se réexécute ou soit libéré. |
| `batch` | fonction | `batch<T>(fn: () => T): T` : une seule mise à jour pour plusieurs écritures. |
| `untrack` | fonction | `untrack<T>(fn: () => T): T` : lit sans s'abonner. |
| `isSignal` | fonction | `isSignal<T = unknown>(value: unknown): value is Signal<T>`. |
| `Signal` | interface | `s()` lit, `s(next)` écrit, `s(prev => next)` met à jour. |
| `ReadSignal` | interface | `s()` lit. |

Des effets qui se relancent sans fin dans une même mise à jour lèvent `E_AURORA_REACTIVE_CYCLE`.

#### Listes

| Export | Nature | Description |
|---|---|---|
| `each` | fonction | `each<T>(items: EachItems<T>, key: (item: T, index: number) => unknown, render: (item: ReadSignal<T>, index: ReadSignal<number>) => unknown, options?: EachOptions): Each` : une liste à clés ; une ligne suit sa clé. Deux lignes de même clé lèvent `E_AURORA_DUPLICATE_KEY`. |
| `isEach` | fonction | `isEach(value: unknown): value is Each`. |
| `EachItems` | type | `readonly T[] \| Signal<readonly T[]> \| ReadSignal<readonly T[]> \| (() => readonly T[])`. |
| `EachOptions` | interface | `{ lazy?: boolean \| LazyOptions }` : ne rendre que les lignes visibles. |
| `LazyOptions` | interface | `{ estimate?: number; overscan?: number; from?: 'start' \| 'end' }`. |
| `Each` | interface | Ce que renvoie `each`. |

#### Formulaires et commandes

| Export | Nature | Description |
|---|---|---|
| `form` | fonction | `form<T>(options: FormOptions<T>): Form<T>` : valeurs, erreurs par champ, état de soumission. |
| `command` | fonction | `command<TArgs extends unknown[], TData>(task: (...args: TArgs) => Promise<TData>): Command<TArgs, TData>` : une action asynchrone avec des signaux `data`, `error` et `loading`. |
| `FormOptions` | interface | `{ initial: T; submit: (values: T) => Promise<unknown>; validate?: FormValidate<T> }`. |
| `FormValidate` | type | `((values: T) => FieldErrors<T>) \| FormSchema<T>`. |
| `FormSchema` | interface | Un objet validateur avec `validate?(values)` ou `validateResult?(values)` qui renvoie `{ valid; errors? }`. |
| `FieldErrors` | type | `Partial<Record<keyof T, string>>`. |
| `Form`, `FormField`, `Command` | interface | Voir ci-dessous. |

| Membre de `Form<T>` | Signature | Description |
|---|---|---|
| `values` / `errors` / `valid` / `submitting` / `submitError` | `readonly values: ReadSignal<T>` | Signaux d'état. |
| `field` | `field<K extends keyof T>(key: K): FormField<T[K]>` | `{ value, error, touched, set(value), markTouched() }`. |
| `set` | `set<K extends keyof T>(key: K, value: T[K]): void` | |
| `validate` | `validate(): boolean` | |
| `handleSubmit` | `handleSubmit(event?: { preventDefault(): void }): Promise<void>` | Valide, puis appelle `submit`. |
| `setErrors` / `reset` | `setErrors(errors: FieldErrors<T>): void` | |
| `onSuccess` / `onFail` | `onSuccess(handler: (data: unknown) => void): this` | |

| Membre de `Command` | Signature | Description |
|---|---|---|
| `data` / `error` / `loading` | `readonly data: ReadSignal<TData \| null>` | |
| `run` | `run(...args: TArgs): Promise<void>` | |
| `reset` | `reset(): void` | |
| `onSuccess` / `onFail` / `onSettled` | `onSuccess(handler: (data: TData) => void): this` | |

#### HTTP

| Export | Nature | Description |
|---|---|---|
| `HttpClient` | classe | Un client `fetch` avec URL de base, en-têtes par défaut, jeton bearer, délais et en-tête CSRF. |
| `http` | const | Un `HttpClient` par défaut. |
| `HttpError` | erreur | Une réponse hors 2xx : `status`, `response`, `data`. |
| `isHttpError` | fonction | `isHttpError(value: unknown): value is HttpError`. |
| `isAbortError` | fonction | `isAbortError(value: unknown): boolean`. |
| `HttpClientOptions` | interface | `{ baseURL?; headers?; token?: string \| null \| (() => string \| null \| undefined); credentials?; allowCrossOriginAuth?: boolean; timeout?: number; xsrf?: boolean; xsrfCookieName?: string; xsrfHeaderName?: string }`. |
| `HttpRequestOptions` | interface | `{ query?; headers?; token?; xsrf?; signal?; timeout?; credentials?; allowCrossOriginAuth?; parse?: (raw: unknown) => T }`. |
| `HttpResult` | type | `{ ok: true; data: T; error: null } \| { ok: false; data: null; error: HttpError }`. |

| Membre de `HttpClient` | Signature | Description |
|---|---|---|
| constructeur | `new HttpClient(options?: HttpClientOptions)` | |
| `get` / `delete` | `get<T>(url: string, options?: HttpRequestOptions<T>): Promise<T>` | Rejette avec une `HttpError` hors 2xx. |
| `post` / `put` / `patch` | `post<T>(url: string, body?: unknown, options?: HttpRequestOptions<T>): Promise<T>` | |
| `raw` | `raw(method: string, url: string, body?: unknown, options?: HttpRequestOptions)` | |
| `attempt` | `attempt<T>(request: Promise<T>): Promise<HttpResult<T>>` | Un résultat au lieu d'un rejet. |
| `extend` | `extend(options: HttpClientOptions): HttpClient` | Un client avec ces options par-dessus les siennes. |
| `setHeader` / `setHeaders` / `removeHeader` / `getHeaders` | `setHeader(name: string, value: string): this` | |

L'en-tête CSRF (`X-XSRF-TOKEN`, tiré du cookie `XSRF-TOKEN`) part sur les requêtes de même origine ; le jeton bearer ne part vers une autre origine qu'avec `allowCrossOriginAuth`.

#### Outils du navigateur

| Export | Nature | Description |
|---|---|---|
| `navigate` / `redirect` / `replace` / `reload` / `back` / `forward` | fonction | Adresse et historique. `navigate(url: string): void`. |
| `hash` | fonction | `hash(): Signal<string>`. |
| `queryParam` | fonction | `queryParam(key: string): Signal<string \| null>`. |
| `mediaQuery` | fonction | `mediaQuery(query: string): Signal<boolean>`. |
| `prefersDark` / `online` / `visibility` | fonction | `(): Signal<boolean>`. |
| `windowSize` | fonction | `windowSize(): Signal<WindowSize>`. |
| `WebStorage` | classe | `localStorage` ou `sessionStorage` sous un préfixe : `get`, `set`, `getJSON`, `setJSON`, `has`, `remove`, `getOrSet`, `keys`, `clear`. |
| `storage` / `session` | const | `WebStorage` sur `localStorage` / `sessionStorage`. |
| `persistedSignal` | fonction | `persistedSignal<T>(key: string, initial: T, options?: PersistedSignalOptions): Signal<T>` : un signal recopié dans le stockage web, et entre onglets pour `localStorage` (`crossTab`, `true` par défaut). |
| `cookie` | const | `get(name)`, `set(name, value, options?)`, `remove(name, options?)` ; lit les cookies de la requête pendant le SSR. |
| `cookieSignal` | fonction | `cookieSignal(name: string, initial: string, options?: CookieOptions): Signal<string>`. |
| `cookieState` | fonction | `cookieState<T>(name: string, initial: T, codec: CookieCodec<T>, options?: CookieOptions): Signal<T>`. |
| `booleanCookie` | const | `CookieCodec<boolean>`. |
| `jsonCookie` | fonction | `jsonCookie<T>(fallback: T): CookieCodec<T>`. |
| `setCookieStore` / `getCookieStore` | fonction | Les valeurs de cookies que lit le SSR. |
| `clipboard` | const | `copy(text: string): Promise<boolean>`, `read(): Promise<string \| null>`. |
| `share` | fonction | `share(data: ShareData): Promise<boolean>` : l'API Web Share. |
| `CookieOptions` | interface | `{ path?; maxAge?; expires?; domain?; sameSite?: 'strict' \| 'lax' \| 'none'; secure? }`. |
| `CookieCodec` | interface | `{ parse(raw: string): T; serialize(value: T): string }`. |
| `WebStorageOptions` | interface | `{ prefix?: string; area?: StorageArea }`. |
| `PersistedSignalOptions` | interface | `WebStorageOptions` plus `crossTab?: boolean`. |
| `StorageArea` | type | `'local' \| 'session'`. |
| `WindowSize` | interface | `{ width: number; height: number }`. |
| `ShareData` | interface | `{ title?; text?; url? }`. |

#### Routes

| Export | Nature | Description |
|---|---|---|
| `urlFor` | fonction | `urlFor(name: string, params?: Record<string, string \| number>, query?: Record<string, string \| number>): string` : l'URL d'une route nommée, côté serveur comme dans le navigateur. |
| `setRouteManifest` / `getRouteManifest` | fonction | La table nom vers motif que lit `urlFor` ; `renderPage` l'envoie au navigateur. |
| `auroraRoute` | fonction | `auroraRoute(config: AuroraRouteConfig): (ctx: AuroraHttpContext) => Promise<void>` : un handler de route qui rend un composant et envoie le document complet. |
| `AuroraRouteConfig` | interface | `{ render: (ctx) => TemplateResult \| Promise<TemplateResult>; entry?: string; shell?: (body: string, entry: string) => string }`. |
| `AuroraHttpContext`, `AuroraResponse` | interface | Le contexte de requête dont a besoin `auroraRoute`. |

#### État d'hydratation et identifiants

| Export | Nature | Description |
|---|---|---|
| `hydrationState` | fonction | `hydrationState(): HydrationState` : `'pending' \| 'hydrating' \| 'hydrated'`. |
| `whenHydrated` | fonction | `whenHydrated(): Promise<void>`. |
| `hydrationErrors` | fonction | `hydrationErrors(): readonly unknown[]`. |
| `uid` | fonction | `uid(prefix?: string): string` : un identifiant identique côté serveur et dans le navigateur. |
| `withIdScope` | fonction | `withIdScope<T>(scope: string, work: () => T): T`. |
| `resetIds` | fonction | `resetIds(scope?: string): void`. |
| `byId` | fonction | `byId(id: string): HTMLElement \| null`. |
| `HydrateOptions` | interface | `{ idScope?: string }`. |
| `HydrationState`, `HydrationDetail` | type | |

#### Mouvement

| Export | Nature | Description |
|---|---|---|
| `MotionValue` | classe | `new MotionValue(initial: number)` : `set(value)`, `stop()`, `timing(to: number, options?: TimingOptions)` (300 ms par défaut), `after(duration: number, to: number)`, `spring(to: number, options?: SpringOptions)` (raideur 180, amortissement 12, masse 1 par défaut). |
| `MotionNode` | classe | Une valeur dérivée par `interpolate(input, output)`. |
| `MotionModel` | classe | Le pilote de mouvement dans le processus. |
| `motionDriver` / `setMotionDriver` | fonction | Le pilote sur lequel tournent les valeurs de mouvement ; un renderer natif installe le sien. |
| `readMotionStyle` | fonction | `readMotionStyle(value: unknown): MotionStyle`. |
| `MotionStyle` | interface | `{ opacity?; translateX?; translateY?; scale?; visible? }`, les valeurs que pilote `motion=${…}`. Toute autre lève `E_AURORA_INVALID_MOTION`. |
| `TimingOptions` | interface | `{ duration?: number; loop?: boolean; yoyo?: boolean }`. |
| `SpringOptions` | interface | `{ stiffness?: number; damping?: number; mass?: number }`. |
| `MotionDriver`, `MotionTrack` | type | |

#### Composants live

| Export | Nature | Description |
|---|---|---|
| `createLiveRegistry` | fonction | `createLiveRegistry(options?: LiveRegistryOptions): LiveRegistry` : les sessions serveur des composants live. |
| `createLiveRouter` | fonction | `createLiveRouter(registry: LiveRegistry, relay: RelayBroadcaster): LiveRouter` : monte les sessions et route les événements du client ; les patchs sont diffusés par relay. |
| `wireLiveEvents` | fonction | `wireLiveEvents(router: LiveHttpRouter, live: LiveRouter, identify: IdentifyLiveCaller<LiveHttpContext>, options?: WireLiveEventsOptions): void` : la route `POST` qui reçoit les événements du client (`DEFAULT_LIVE_EVENT_PATH`, `/__live/event`). |
| `authorizeLiveChannel` | fonction | `authorizeLiveChannel<C>(live: LiveRouter, identify: IdentifyLiveCaller<C>): (ctx: C, params: { id: string }) => Promise<boolean>` : une autorisation relay qui ne laisse s'abonner que le propriétaire d'une session. |
| `mountLiveSession` | fonction | `mountLiveSession(factory: () => LiveComponentDefinition, idScope?: string): LiveSession`. |
| `liveStore` | fonction | `liveStore(factory: () => LiveComponentDefinition, relay: RelayBroadcaster, channel: string): LiveStore` : une session partagée, diffusée à tous les abonnés d'un canal. |
| `connectPatches` | fonction | `connectPatches(session: LiveSession, relay: RelayBroadcaster, channel: string): () => void`. |
| `liveClient` | fonction | `liveClient(opts: LiveClientOptions): () => void` : le côté navigateur ; applique les patchs et poste les événements. |
| `buildLiveTransport` | fonction | `buildLiveTransport(relayClient: RelaySubscribeClient, http: LiveHttpPoster, options?: { path?: string }): LiveClientTransport`. |
| `DEFAULT_LIVE_EVENT_PATH` | const | `'/__live/event'`. |
| `LiveComponentDefinition` | interface | `{ view: TemplateResult; handlers?: Record<string, (payload?: unknown) => void> }`. |
| `LiveSession` | interface | `renderToString()`, `dispatch(event, payload?)`, `drainPatches()`, `onPatch(listener)`, `dispose()`. |
| `SlotPatch` | interface | `{ slot: number; value: string }`. |
| `LiveRegistryOptions` | interface | `{ claimTimeoutMs?; idleTimeoutMs?; maxPerOwner?: number; maxSessions?: number }`. `maxPerOwner` 32, `maxSessions` 10 000, `idleTimeoutMs` désactivé par défaut. |
| `LiveRegistry` | interface | `define(name, factory)`, `has`, `mount(name, ownerId)`, `claim`, `get`, `ownerOf`, `dispose`, `disposeOwner`, `disposeAll`, `size`. |
| `LiveRouter` | interface | `mount(name, ownerId): LiveMount`, `event(id, event, payload, callerId): LiveEventOutcome`, `authorizeChannel`, `ownerOf`, `disconnect`, `channelFor`. |
| `LiveMount` | interface | `{ id: string; channel: string; html: string }`. |
| `LiveEventOutcome` | type | `'handled' \| 'unknown-session' \| 'forbidden' \| 'unknown-event'`. |
| `LiveStore`, `LiveSessionHandle`, `LiveClientOptions`, `LiveClientTransport`, `LiveHttpPoster`, `LiveHttpContext`, `LiveHttpRouter`, `LiveEventBody`, `WireLiveEventsOptions`, `RelayBroadcaster`, `RelaySubscribeClient`, `IdentifyLiveCaller` | type | |

#### Diagnostic, erreurs et types

| Export | Nature | Description |
|---|---|---|
| `countRerenders` | fonction | `countRerenders(options?: RerenderOptions): RerenderCounter` : compte les réexécutions d'effets, memos, slots, listes, attributs, propriétés et setups ; peut les surligner ou les journaliser. |
| `AuroraError` | erreur | Toutes les erreurs d'aurora : `readonly code: AuroraErrorCode`. |
| `AuroraErrorCode` | type | Les codes `E_AURORA_*` ci-dessous. |
| `TemplateResult` | interface | Ce que renvoie `html`. |
| `Disposer` | type | `() => void`. |
| `Context` | interface | `{ key: symbol; name: string; hasDefault: boolean; defaultValue: T \| undefined }`. |
| `ClassValue` | type | Ce que prennent `cn` et `clsx`. |
| `RerenderCounter`, `RerenderEvent`, `RerenderKind`, `RerenderOptions` | type | |

### `@c9up/aurora/core`

Le sous-ensemble sans hôte de `@c9up/aurora` : `html`, `isTemplateResult`, `component`, `onMount`, `onUnmount`, `createContext`, `provide`, `inject`, `signal`, `memo`, `effect`, `onCleanup`, `batch`, `untrack`, `isSignal`, `each`, `isEach`, `form`, `command`, `uid`, `withIdScope`, `cn`, `clsx`, `twMerge`, les exports de mouvement, `countRerenders`, `AuroraError` et leurs types. Un composant qui n'importe que d'ici tourne côté serveur, dans le navigateur et sur un téléphone.

### `@c9up/aurora/renderer`

| Export | Nature | Description |
|---|---|---|
| `TemplateScanner` | classe | Lit les parties statiques d'un template et dit où se trouve chaque slot. |
| `assertBindable` | fonction | `assertBindable(scanner: TemplateScanner): BindablePosition` : lève le code `E_AURORA_SLOT_*` d'une position refusée. |
| `assertBindableProperty` | fonction | `assertBindableProperty(element: string, property: string): void`. |
| `readComponentLifecycle` | fonction | `readComponentLifecycle(result: TemplateResult): ComponentLifecycle \| undefined` : les hooks de montage et nettoyages qu'a attachés un `component()`. |
| `bindTemplateContext` | fonction | `bindTemplateContext(result: TemplateResult, value: unknown): unknown` : exécute la fonction d'un slot sous le contexte de son template. |
| `captureContext` | fonction | `captureContext(): <T>(fn: () => T) => T` : les providers accessibles maintenant, pour un travail fait plus tard. |
| `setOwner` | fonction | `setOwner(owner: Array<() => void> \| undefined): Array<() => void> \| undefined` : où sont libérés les effets créés maintenant. |
| `readEach` / `readEachItems` | fonction | `readEach(value: unknown): EachList \| undefined` ; `readEachItems<T>(items: EachItems<T>): readonly T[]`. |
| `LazyLayout` | classe | Hauteurs des lignes et espaceurs d'une liste paresseuse. |
| `firstWindow` / `sameWindow` | fonction | Les premières lignes d'une liste paresseuse ; égalité de fenêtres. |
| `guardUrlAttribute` / `guardUrlProperty` | fonction | La garde d'URL appliquée aux attributs et propriétés qui portent une URL. |
| `isTemplateResult` | fonction | |
| `ComponentLifecycle`, `EachList`, `LazyList`, `LazyView`, `LazyWindow`, `BindablePosition`, `EffectCallback`, `TemplateResult` | type | |

### `@c9up/aurora/hydrate` et `@c9up/aurora/ssr`

| Export | Entrée | Description |
|---|---|---|
| `hydrate` | `/hydrate` | Identique à celui de `@c9up/aurora`. |
| `HydrateOptions` | `/hydrate` | `{ idScope?: string }`. |
| `resetHydrateWarnings` | `/hydrate` | `resetHydrateWarnings(): void` : laisse un avertissement d'écart s'afficher à nouveau. |
| `renderToString` | `/ssr` | Identique à celui de `@c9up/aurora`. |
| `renderRetaining` | `/ssr` | `renderRetaining(result: TemplateResult, owned: Set<() => void>): string` : rend et confie les fonctions de libération à l'appelant. |

### `@c9up/aurora/relay`

| Export | Nature | Description |
|---|---|---|
| `relay` | fonction | `relay(): RelayClient` : la connexion unique de la page à relay, ouverte au premier appel. |
| `configureRelay` | fonction | `configureRelay(options: RelayOptions): void`. |
| `RelayClient` | interface | `subscribe<E>(channel: string, handler: (event: E) => void): () => void`, `on(status, callback): () => void`, `close(): void`. |
| `RelayStatus` | type | `'connecting' \| 'connected' \| 'disconnected' \| 'reconnecting'`. |
| `RelayOptions` | interface | Voir ci-dessous. |
| `RelayStream`, `RelayStreamEvent`, `RelayFetch` | type | Ce que remplacent `stream` et `fetch`. |

| `RelayOptions` | Type | Défaut | Description |
|---|---|---|---|
| `sseUrl` | `string` | `'/__relay/events'` | |
| `subscribeUrl` | `string` | `'/__relay/subscribe'` | |
| `unsubscribeUrl` | `string` | `'/__relay/unsubscribe'` | |
| `bearer` | `string` | `''` | Jeton envoyé avec les demandes d'abonnement. |
| `maxReconnectAttempts` | `number` | `5` | |
| `onReconnectAttempt` / `onReconnectFailed` | fonction | aucun | |
| `stream` | `(url: string) => RelayStream` | `new EventSource(url)` | |
| `fetch` | `RelayFetch` | `fetch` | |

### `@c9up/aurora/rpc`

| Export | Nature | Description |
|---|---|---|
| `createRpcClient` | fonction | `createRpcClient(options?: RpcClientOptions): RpcClient` : un client `@c9up/comet` qui envoie par un `HttpClient`. |
| `RpcClientOptions` | interface | `{ url?: string; http?: HttpClient; headers?: Record<string, string>; xsrf?: boolean; xsrfCookieName?: string; xsrfHeaderName?: string }`. `url` vaut `/rpc` par défaut, `xsrf` vaut `true`. |
| `RpcError`, `isRpcError` | réexport | De `@c9up/comet`. |
| `RpcClient`, `RpcCall`, `RpcCallOptions`, `RpcResult` | type | De `@c9up/comet`. |

### `@c9up/aurora/server`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig(config: AuroraManagerConfig): AuroraManagerConfig`. |
| `AuroraManager` | classe | Pages, assets et rendu de l'application ; `ctx.aurora` rend par lui. |
| `Pages` | classe | Résout un nom de page vers son module sous `pages.root`. |
| `renderPage` | fonction | `renderPage<P>(ctx: RenderHttpContext, pages: Pages, name: string, props: P, options?: RenderPageOptions): Promise<void>` : rend une page et envoie le document. |
| `serveAssets` | fonction | `serveAssets(options: ServeAssetsOptions): (ctx: AssetsHttpContext) => Promise<void>` : un handler de fichiers statiques confiné à `root`. |
| `packageAssetDir` | fonction | `packageAssetDir(specifier: string): string` : le `dist/` d'un paquet installé. |
| `auroraContext` | fonction | Identique à celui de `@c9up/aurora/middleware`. |
| `AuroraError` | erreur | |
| `pageImportError` | fonction | Construit l'erreur d'une page qui n'a pas pu être importée. |
| `AuroraManagerConfig` | interface | Voir [Configuration](#configuration). |
| `PagesConfig` | interface | `{ root: string; urlPrefix?: string; extension?: string }`. |
| `PageFactory` | type | `(props: P) => TemplateResult \| Promise<TemplateResult>` : l'export par défaut d'un module de page. |
| `RenderPageOptions` | interface | Voir ci-dessous. |
| `SharedProps` | type | `Record<string, unknown>`. |
| `SharedPropsResolver` | type | `(ctx: RenderHttpContext) => SharedProps \| Promise<SharedProps>`. |
| `ClientRoutesFilter` | type | `{ only?: readonly string[]; except?: readonly string[] } \| ((name: string, pattern: string) => boolean)`. |
| `RenderHttpContext`, `RenderResponse`, `AssetsHttpContext`, `AssetsRequest`, `AssetsResponse`, `ServeAssetsOptions`, `AuroraRequestRenderer`, `AuroraErrorCode` | type | |

| Membre d'`AuroraManager` | Signature | Description |
|---|---|---|
| constructeur | `new AuroraManager(config: AuroraManagerConfig)` | |
| `render` | `render(ctx: RenderHttpContext, name: string, props: unknown, options?: RenderPageOptions): Promise<void>` | `renderPage` avec les défauts de la config. |
| `pages` | `readonly pages: Pages` | |
| `assetsPrefix` / `auroraAssetPath` / `pageAssetPath` | `readonly assetsPrefix: string` | `/__assets`, `/__assets/aurora`, `/__assets/pages` par défaut. |
| `browserPackages` | `readonly browserPackages: readonly BrowserPackage[]` | Les paquets servis au navigateur. |
| `importmap` | `readonly importmap: Record<string, string>` | |
| `auroraAssetsHandler` / `pageAssetsHandler` | `auroraAssetsHandler(): (ctx: AssetsHttpContext) => Promise<void>` | Les handlers d'assets que monte le provider. |

| Membre de `Pages` | Signature | Description |
|---|---|---|
| constructeur | `new Pages(config: PagesConfig)` | `urlPrefix` vaut `/__assets/pages` par défaut, `extension` vaut `.js`. |
| `register` | `register<P>(name: string, factory: PageFactory<P>): void` | Une page sans fichier, pour les applications groupées en un bundle et les tests. |
| `resolve` | `resolve(name: string): Promise<PageFactory>` | Importe le module de page à chaque appel. |
| `urlFor` | `urlFor(name: string): string` | L'URL du module de page pour le navigateur. |

| `RenderPageOptions` | Type | Description |
|---|---|---|
| `title` | `string` | `<title>`. |
| `lang` | `string` | `<html lang>`. |
| `nonce` | `string` | Nonce CSP des scripts en ligne. |
| `headExtra` | `string` | Balisage ajouté au `<head>`. |
| `jsonLd` | `object \| readonly object[]` | Données structurées. |
| `rootId` / `rootTag` / `rootClass` | `string` | L'élément dans lequel se rend la page. Une balise qui n'est pas un simple nom d'élément lève `E_AURORA_ILLEGAL_ROOT_TAG`. |
| `importmap` | `Record<string, string>` | Fusionné par-dessus celui de la config. |
| `shared` | `SharedProps \| SharedPropsResolver` | Fusionné par-dessus celui de la config. |
| `assetsVersion` | `string` | |
| `routes` / `clientRoutes` | `Record<string, string>` / `ClientRoutesFilter` | Routes nommées envoyées au navigateur pour `urlFor`. |
| `cookies` | `string[]` | Cookies que le serveur lit dans la requête pour que `cookieSignal` rende le même état que le navigateur. N'y mettez jamais un cookie de session, signé ou `httpOnly`. |

### `@c9up/aurora/middleware`, `@c9up/aurora/services/main`, `@c9up/aurora/provider`

| Export | Entrée | Description |
|---|---|---|
| `AuroraContextMiddleware` | `/middleware` (par défaut) | Classe de middleware : pose `ctx.aurora` sur la requête. |
| `auroraContext` | `/middleware` | `auroraContext(ctx, next: () => Promise<void>): Promise<void>` : la même chose en fonction. |
| `AuroraRequestRenderer` | `/middleware` | `ctx.aurora` : `render(name: string, props?: unknown, options?: RenderPageOptions): Promise<void>`. |
| `setAurora` / `getAurora` / `clearAurora` | `/services/main` | L'`AuroraManager` que tient le singleton de module. Le lire avant qu'il soit fixé lève `E_AURORA_NOT_BOOTED`. |
| `AuroraProvider` | `/provider` (par défaut) | Lie le gestionnaire et monte le middleware des assets. |
| `AuroraAppContext` | `/provider` | L'hôte dont a besoin le provider : `container`, `config`. |
| `configure` | `/configure` | `configure(codemods): Promise<void>`. |

## Configuration

`config/aurora.ts` exporte `defineConfig({ … })` de `@c9up/aurora/server`. Le stub de configure écrit `pages.root: 'resources/pages'` et `root.tag: 'div'`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `pages.root` | `string` | (obligatoire) | Le dossier des pages ; relatif à la racine de l'application. `ctx.aurora.render('dashboard/show')` y charge `dashboard/show.js`. |
| `pages.urlPrefix` | `string` | `<assetsPrefix>/pages` | L'URL d'où le navigateur charge les pages. |
| `pages.extension` | `string` | `'.js'` | |
| `shared` | `SharedProps \| SharedPropsResolver` | aucun | Des props fusionnées dans chaque page. |
| `root.tag` / `root.class` | `string` | | L'élément racine de la page. |
| `assetsVersion` | `string` | aucun | Version envoyée dans la page ; avec `visits`, un déploiement recharge les clients en retard. |
| `clientRoutes` | `ClientRoutesFilter` | aucun | Quelles routes nommées chaque page transmet au navigateur. |
| `assetsPrefix` | `string` | `'/__assets'` | Où se montent les routes d'assets. |
| `importmap` | `Record<string, string>` | celui d'aurora | Entrées d'importmap fusionnées par-dessus celles d'aurora. |
| `browserPackages` | `string[]` | `[]` | D'autres paquets servis au navigateur (`'@c9up/atom'`) ; `@c9up/comet` et `@c9up/chronos` le sont quand ils sont installés. |
| `visits` | `boolean` | `false` | Visites de page sans rechargement du document, par le protocole de photon. Demande `@c9up/photon` 0.1.25 ou plus récent. |
| `auroraDistRoot` / `cometDistRoot` / `chronosDistRoot` / `photonDistRoot` | `string` | le `dist/` du paquet installé | Servir un autre build. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `AuroraManager` (classe), `'aurora'` | L'`AuroraManager` construit depuis `config/aurora.ts`. |

`'aurora'` est déclaré sur `ContainerBindings`, et `ctx.aurora` sur le contexte HTTP, par `@c9up/aurora/server`. Dans `start()`, le provider monte les routes d'assets en middleware serveur : `/__assets/aurora/*`, `/__assets/pages/*`, et une route par paquet navigateur.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_AURORA_ILLEGAL_PAGE_NAME`](/fr/reference/errors#e-aurora-illegal-page-name) | Un nom de page contient des caractères interdits. |
| [`E_AURORA_PAGE_OUTSIDE_ROOT`](/fr/reference/errors#e-aurora-page-outside-root) | Le chemin résolu de la page sort de `pages.root`. |
| [`E_AURORA_PAGE_NOT_FOUND`](/fr/reference/errors#e-aurora-page-not-found) | Aucun fichier pour ce nom de page. |
| [`E_AURORA_PAGE_IMPORT_FAILED`](/fr/reference/errors#e-aurora-page-import-failed) | La page est sur le disque et son graphe de modules a refusé de se charger. |
| [`E_AURORA_PAGE_INVALID_EXPORT`](/fr/reference/errors#e-aurora-page-invalid-export) | Le module de page n'exporte pas de factory par défaut. |
| [`E_AURORA_ILLEGAL_ROOT_TAG`](/fr/reference/errors#e-aurora-illegal-root-tag) | `renderPage` a reçu une balise racine qui n'est pas un simple nom d'élément. |
| [`E_AURORA_OUTSIDE_COMPONENT`](/fr/reference/errors#e-aurora-outside-component) | `onMount` / `onUnmount` appelé hors du setup d'un `component()`. |
| [`E_AURORA_MISSING_CONTEXT`](/fr/reference/errors#e-aurora-missing-context) | `inject` n'a trouvé aucun provider, et le contexte n'a pas de défaut. |
| [`E_AURORA_NOT_BOOTED`](/fr/reference/errors#e-aurora-not-booted) | Le singleton du gestionnaire a été lu avant que le provider ou `setAurora` le fixe. |
| [`E_AURORA_UNKNOWN_ROUTE`](/fr/reference/errors#e-aurora-unknown-route) | `urlFor` a reçu un nom absent de la table des routes. |
| [`E_AURORA_MISSING_ROUTE_PARAMS`](/fr/reference/errors#e-aurora-missing-route-params) | `urlFor` n'a pas reçu tous les paramètres requis. |
| [`E_AURORA_UNKNOWN_LIVE_COMPONENT`](/fr/reference/errors#e-aurora-unknown-live-component) | Un composant live a été monté avant que `registry.define()` le nomme. |
| [`E_AURORA_LIVE_SESSION_LIMIT`](/fr/reference/errors#e-aurora-live-session-limit) | Le registre tient déjà `maxSessions` sessions. |
| [`E_AURORA_RELAY_REQUEST_FAILED`](/fr/reference/errors#e-aurora-relay-request-failed) | Une requête relay a reçu un statut hors 2xx. |
| [`E_AURORA_UNSAFE_URL`](/fr/reference/errors#e-aurora-unsafe-url) | Une URL de navigation a échoué au contrôle de même origine ou de schéma. |
| [`E_AURORA_SLOT_IN_TAG_NAME`](/fr/reference/errors#e-aurora-slot-in-tag-name) | Un `${}` à la place d'un nom de balise. |
| [`E_AURORA_SLOT_IN_ATTRIBUTE_NAME`](/fr/reference/errors#e-aurora-slot-in-attribute-name) | Un `${}` à la place d'un nom d'attribut. |
| [`E_AURORA_SLOT_IN_RAW_TEXT`](/fr/reference/errors#e-aurora-slot-in-raw-text) | Un `${}` dans `<script>`, `<style>`, `<textarea>`, `<title>`… |
| [`E_AURORA_SLOT_IN_COMMENT`](/fr/reference/errors#e-aurora-slot-in-comment) | Un `${}` dans un commentaire, un `<!…>` / `<?…>` ou une section CDATA. |
| [`E_AURORA_SLOT_IN_EVENT_ATTRIBUTE`](/fr/reference/errors#e-aurora-slot-in-event-attribute) | Un `${}` dans un attribut `on*`. |
| [`E_AURORA_SLOT_IN_SRCDOC`](/fr/reference/errors#e-aurora-slot-in-srcdoc) | Un `${}` dans `srcdoc`. |
| [`E_AURORA_SLOT_IN_BASE_URL`](/fr/reference/errors#e-aurora-slot-in-base-url) | Un `${}` dans `<base href>`. |
| [`E_AURORA_SLOT_IN_SCRIPT_SOURCE`](/fr/reference/errors#e-aurora-slot-in-script-source) | Un `${}` dans l'URL que charge un `<script>`. |
| [`E_AURORA_SLOT_IN_HTML_PROPERTY`](/fr/reference/errors#e-aurora-slot-in-html-property) | Une liaison `.prop` nomme une propriété qui analyse sa valeur comme du HTML. |
| [`E_AURORA_TEMPLATE_IN_ATTRIBUTE`](/fr/reference/errors#e-aurora-template-in-attribute) | Un template `html` imbriqué dans une valeur d'attribut ou dans `.value`. |
| [`E_AURORA_FILE_INPUT_VALUE`](/fr/reference/errors#e-aurora-file-input-value) | `.value` a reçu une chaîne non vide sur un `<input type="file">`. |
| [`E_AURORA_DUPLICATE_KEY`](/fr/reference/errors#e-aurora-duplicate-key) | Deux lignes d'une liste `each()` partagent une clé. |
| [`E_AURORA_INVALID_LAZY`](/fr/reference/errors#e-aurora-invalid-lazy) | `each(…, { lazy })` a reçu un `estimate` ou un `overscan` invalide. |
| [`E_AURORA_VISITS_NEED_PHOTON`](/fr/reference/errors#e-aurora-visits-need-photon) | `visits` est activé et `@c9up/photon` est absent ou trop ancien. |
| [`E_AURORA_VISIT_PROPS`](/fr/reference/errors#e-aurora-visit-props) | Avec `visits` activé, les props d'une page n'étaient pas un objet. |
| [`E_AURORA_INVALID_MOTION`](/fr/reference/errors#e-aurora-invalid-motion) | `motion=${…}` n'était pas un objet de valeurs de mouvement, ou nommait une propriété que le mouvement ne pilote pas. |
| [`E_AURORA_REACTIVE_CYCLE`](/fr/reference/errors#e-aurora-reactive-cycle) | Des effets se sont relancés sans fin dans une même mise à jour. |
| [`E_AURORA_INTERNAL`](/fr/reference/errors#e-aurora-internal) | Un invariant interne d'aurora a cédé : un bug d'aurora. |

## Voir aussi

- [Introduction](/fr/guides/frontend/aurora/)
- [Templates](/fr/guides/frontend/aurora/templates)
- [Signaux](/fr/guides/frontend/aurora/signals)
- [Formulaires et actions](/fr/guides/frontend/aurora/forms)
- [Outils du navigateur](/fr/guides/frontend/aurora/browser)
- [Rendu serveur](/fr/guides/frontend/aurora/server-rendering)
- [Composants live](/fr/guides/frontend/aurora/live)
- [Pages partagées](/fr/guides/frontend/aurora/shared-pages)
- [Clients JSON-RPC](/fr/guides/apis/json-rpc-clients)
- [Gestes et mouvement](/fr/guides/mobile/gestures-and-motion)
