# photon

`@c9up/photon` : des pages pilotées par le serveur et rendues par React, Vue ou Svelte : le serveur choisit le composant de page et ses props, le client l'hydrate et navigue sans rechargement complet. Guide : [Introduction](/fr/guides/frontend/photon/).

## Installation

```bash
pnpm add @c9up/photon
ream configure @c9up/photon
```

`ream configure @c9up/photon` enregistre le provider et écrit `config/photon.ts`. Ajoutez le framework de rendu (`react` et `react-dom`, `vue` ou `svelte`) et `vite` : toutes sont des dépendances pair optionnelles.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/photon` | Côté serveur : `PhotonRenderer`, `PhotonMiddleware`, `defineConfig`, les helpers de props, les helpers du protocole, le SEO, `PhotonError`. |
| `@c9up/photon/provider` | `PhotonProvider` (export par défaut). |
| `@c9up/photon/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/photon`. |
| `@c9up/photon/client` | Navigateur : `hydrate`, `bootPage`, `router`, les helpers de routes, le défilement infini, `PhotonClientError`. |
| `@c9up/photon/client/core` | Navigateur, sans les adaptateurs de framework : `bootPage`, `router`, les helpers de routes, `browserHost`, `PhotonClientError`. |
| `@c9up/photon/react` | Composants et hooks React. |
| `@c9up/photon/vue` | Composants et composables Vue. |
| `@c9up/photon/svelte` | Composants et fonctions Svelte. |

L'entrée serveur et les entrées navigateur ne s'importent pas l'une l'autre ; n'importez jamais `@c9up/photon` depuis du code navigateur.

## Exports

### `@c9up/photon`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig(config: PhotonConfig): PhotonConfig`. |
| `configure` | fonction | Identique à `@c9up/photon/configure`. |
| `PhotonRenderer` | classe | Construit les objets de page, fait le rendu serveur, écrit le document HTML. |
| `PhotonMiddleware` | classe | Le middleware de requête : attache `ctx.photon` et répond aux requêtes de page et de props. |
| `createPhotonContext` | fonction | `createPhotonContext(renderer: PhotonRenderer, url: string, requestContext?: SsrRequestContext): PhotonContext` : ce que le middleware pose sur `ctx.photon`. |
| `getValidationErrors` | fonction | `getValidationErrors(ctx: unknown, options?: ValidationErrorOptions): Record<string, unknown>` : les erreurs de validation flashées par la session, premier message par champ sauf avec `allMessages`. `{}` s'il n'y en a pas. |
| `always` | fonction | `always<T>(value: T): AlwaysProp<T>` : incluse même dans un rechargement partiel qui ne la demande pas. |
| `optional` | fonction | `optional<T>(fn: () => T \| Promise<T>): OptionalProp<T>` : résolue seulement quand un rechargement partiel la demande. |
| `defer` | fonction | `defer<T>(fn: () => T \| Promise<T>, groupOrOptions?: string \| DeferOptions): DeferProp<T>` : résolue dans une requête de suivi, par groupe (`'default'`). |
| `merge` / `deepMerge` | fonction | `merge<T>(value: T): MergeProp<T>` : fusionnée avec ce que tient le client. `.prepend()`, `.append()`, `.matchOn(key)`. |
| `once` | fonction | `once<T>(value: T, options?: OnceOptions): OnceProp<T>` : envoyée une fois, puis gardée par le client. |
| `scroll` | fonction | `scroll<T>(value: T, provider?: ScrollCursorProvider): ScrollProp<T>` : une liste paginée pour le défilement infini. `.deferred(group?)`, `.matchOn(key)`. |
| `isAlwaysProp`, `isOptionalProp`, `isDeferProp`, `isMergeProp`, `isOnceProp`, `isScrollProp` | fonction | Gardes de type. |
| `resolveProps` | fonction | `resolveProps(props: Record<string, unknown>, component: string, partial?: PropsRequest): Promise<ResolvedProps>`. |
| `buildPageObject` | fonction | `buildPageObject(component: string, props: Record<string, unknown>, options: PageObjectOptions): Promise<{ page: PageProps; rescuedErrors: readonly RescuedError[] }>` : l'objet de page, pour un renderer qui écrit son propre document. |
| `finishVisit` | fonction | `finishVisit(ctx: unknown, res: object, info: PhotonRequestInfo, options: { url: string; version: string; location?: string }): boolean` : répond à un écart de version des assets ou à un `location()` à la place de la page ; `true` quand c'est le cas. |
| `varyOnPhoton` | fonction | `varyOnPhoton(res: object): void` : ajoute `X-Photon` à `Vary`. |
| `readRequestInfo` | fonction | `readRequestInfo(ctx: unknown): PhotonRequestInfo`. |
| `readRequestUrl` | fonction | `readRequestUrl(ctx: unknown): string`. |
| `shouldReloadForAssetVersion` | fonction | `shouldReloadForAssetVersion(info: PhotonRequestInfo, serverVersion: string): boolean` : un GET du routeur client qui porte une autre version des assets. |
| `onRescue` | fonction | `onRescue(next?: RescueListener): void` : où sont signalées les erreurs des props différées secourues ; le logger de la requête par défaut. |
| `reportRescued` | fonction | `reportRescued(errors: readonly RescuedError[], ctx: SsrRequestContext \| undefined): void`. |
| `Meta` | fonction | `Meta<Ctx>(resolver: MetaResolver<Ctx>): MethodDecorator` : données `<head>` d'une action de contrôleur. |
| `getRouteMeta` | fonction | `getRouteMeta(target: object, propertyKey: string \| symbol): MetaResolver \| undefined`. |
| `resolveMeta` | fonction | `resolveMeta<Ctx>(resolver: MetaResolver<Ctx> \| undefined, ctx: Ctx): Promise<MetaTags \| undefined>`. |
| `mergeMeta` | fonction | `mergeMeta(...layers: Array<MetaTags \| undefined>): MetaTags` : la dernière l'emporte par champ. |
| `serializeMetaTags` | fonction | `serializeMetaTags(meta: MetaTags \| undefined, options?: { nonce?: string }): string` : le balisage du `<head>`. |
| `PhotonError` | erreur | Erreurs serveur : `code`, `hint?`, `context?`, `docsUrl` ; `toJSON()` garde la chaîne des causes. |
| `PhotonConfig` | interface | Voir [Configuration](#configuration). |
| `SsrConfig` | interface | `{ enabled?: boolean; entrypoint?: string; pages?: string[] \| ((ctx, page: string) => boolean \| Promise<boolean>) }`. |
| `SsrRequestContext` | type | Le contexte de requête sur lequel travaille le middleware. |
| `PageProps` | interface | L'objet de page : `component`, `props`, `url`, `version`, `framework`, `sharedProps?`, les extras du protocole et `PageFlags`. |
| `PageFlags` | interface | `{ clearHistory?: boolean; encryptHistory?: boolean; flash?: unknown }`. |
| `RenderResult` | interface | `{ html: string; status: number; headers: Record<string, string> }`. |
| `RootViewData` | interface | Ce avec quoi se rend une vue racine : `page`, `photon: { head; body; nonce? }`, et les props de vue. |
| `RootViewRenderer` | type | `(data: RootViewData) => string \| Promise<string>`. |
| `PhotonContext` | interface | `ctx.photon` ; voir ci-dessous. |
| `SharedData` | type | `Record<string, unknown>`. |
| `SharedDataProvider` | type | `() => SharedData \| Promise<SharedData>`. |
| `ValidationErrorOptions` | interface | `{ allMessages?: boolean }`. |
| `PhotonRequestInfo` | interface | `{ isPhotonRequest: boolean; version?: string; method: string; errorBag?: string; partial: PropsRequest }`. |
| `PageObjectOptions` | interface | `{ url; version; framework; partial?; sharedKeys?; flags? }`. |
| `RescueListener` | type | `(error: unknown, info: { prop: string; ctx: SsrRequestContext \| undefined }) => void`. |
| `AlwaysProp`, `OptionalProp`, `DeferProp`, `MergeProp`, `OnceProp`, `ScrollProp`, `SpecialProp` | type | Les enveloppes que renvoient les helpers. |
| `DeferOptions` | interface | `{ group?: string; rescue?: boolean }`. `rescue` envoie la page sans une prop dont le résolveur a levé une erreur. |
| `OnceOptions` | interface | `{ key?: string; expiresIn?: number \| string; expiresAt?: number \| Date; fresh?: boolean }`. |
| `ScrollCursor` | interface | `{ pageName; currentPage; nextPage; previousPage }`. |
| `ScrollCursorProvider` | type | Lit un curseur sur la valeur de défilement ; celui d'un paginateur par défaut. |
| `PropsRequest`, `PropsProtocolExtras`, `ResolvedProps`, `RescuedError`, `OncePropMeta`, `ScrollPropMeta` | interface | L'entrée et la sortie du résolveur. |
| `MetaTags` | interface | `{ title?; description?; canonical?; robots?; keywords?; og?: OgTags; twitter?: TwitterTags; custom?: CustomMetaTag[]; jsonLd?: JsonLd }`. |
| `OgTags`, `TwitterTags`, `CustomMetaTag` | interface | Balises Open Graph, carte Twitter et `<meta>` libres. |
| `JsonLd` | type | `object \| readonly object[]`. |
| `MetaResolver` | type | `MetaTags \| ((ctx: Ctx) => MetaTags \| undefined \| Promise<MetaTags \| undefined>)`. |

### `PhotonContext` (`ctx.photon`)

| Membre | Signature | Description |
|---|---|---|
| `render` | `render(component: string, props?: Record<string, unknown>, meta?: MetaTags, viewProps?: Record<string, unknown>): Promise<RenderResult>` | Rend une page : le document HTML à une première visite, l'objet de page à une visite du client. Les `viewProps` atteignent la vue racine. |
| `page` | `page(component: string, props?: Record<string, unknown>): Promise<PageProps>` | L'objet de page qu'enverrait `render()`, sans réponse. |
| `share` | `share(data: SharedData \| SharedDataProvider): void` | Des props pour toutes les pages de la requête ; un fournisseur s'exécute quand une page est construite. |
| `location` | `location(url: string): void` | Envoie le client vers une autre URL : 409 avec la cible pour le routeur client, 302 pour un chargement navigateur simple. |
| `meta` | `meta(tags: MetaTags): void` | Ajoute des données `<head>` ; les appels se fusionnent. |
| `getAccumulatedMeta` | `getAccumulatedMeta(): MetaTags \| undefined` | |
| `clearHistory` | `clearHistory(): void` | Demande au client d'oublier son historique en cache après cette réponse. |
| `encryptHistory` | `encryptHistory(encrypt?: boolean): void` | Chiffre (ou non) l'état d'historique de cette réponse. |
| `flash` | `flash(provider: () => unknown): void` | Le sac `flash` à usage unique envoyé à côté des props. |
| `getVersion` | `getVersion(): string` | La version des assets. |
| `ssrEnabled` | `ssrEnabled(component: string): Promise<boolean>` | |
| `requestInfo` | `requestInfo(): PhotonRequestInfo` | |

### `PhotonMiddleware`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new PhotonMiddleware(config: PhotonConfig)` | Construit son propre `PhotonRenderer`, démarré à la première requête. |
| `middleware` | `middleware(): (ctx, next) => Promise<void>` | La fonction à enregistrer dans le middleware du routeur. |
| `getRenderer` | `getRenderer(): PhotonRenderer` | |
| `share` | `share?(ctx: PhotonMiddlewareContext): SharedData \| Promise<SharedData>` | À définir dans une sous-classe pour partager des props avec chaque page. |
| `flash` | `flash?(ctx: PhotonMiddlewareContext): unknown` | À définir dans une sous-classe pour envoyer un sac `flash`. |

### `PhotonRenderer`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new PhotonRenderer(config: PhotonConfig)` | |
| `boot` | `boot(): Promise<void>` | Charge le module SSR et le manifeste Vite. |
| `close` | `close(): Promise<void>` | Arrête le compilateur SSR de développement. |
| `buildPage` | `buildPage(component: string, props: Record<string, unknown>, url: string, options: { flags?: PageFlags \| (() => Promise<PageFlags>); sharedKeys?: readonly string[]; partial?: PropsRequest; requestContext?: SsrRequestContext }): Promise<PageProps>` | |
| `render` | `render(component: string, props?: Record<string, unknown>, url: string, meta?: MetaTags, flags?: PageFlags): Promise<RenderResult>` | |
| `renderDocument` | `renderDocument(page: PageProps, meta?: MetaTags, requestContext?: SsrRequestContext, viewProps?: Record<string, unknown>): Promise<RenderResult>` | Fait le rendu serveur quand le SSR s'applique, puis écrit le document par la vue racine. |
| `renderPageObject` | `renderPageObject(page: PageProps, meta?: MetaTags): RenderResult` | La réponse JSON à une visite du client. |
| `renderProps` | `renderProps(component: string, props: Record<string, unknown>, url: string, meta?: MetaTags, extras?: PropsProtocolExtras & PageFlags & { sharedProps?: string[] }): RenderResult` | |
| `ssrEnabled` | `ssrEnabled(component: string, ctx?: SsrRequestContext): Promise<boolean>` | |
| `getVersion` | `getVersion(): string` | `assetsVersion`, ou une empreinte du manifeste. |
| `getFramework` | `getFramework(): Framework` | |
| `encryptsHistory` | `encryptsHistory(): boolean` | |
| `useSsrModule` | `useSsrModule(ssrModule: SsrModule): this` | Installe un module SSR au lieu de charger le build. |
| `useDevServer` | `useDevServer(server: ViteDevServerLike): this` | Installe un serveur de développement Vite au lieu d'en démarrer un. |

### `@c9up/photon/client`

| Export | Nature | Description |
|---|---|---|
| `hydrate` | fonction | `hydrate(options: HydrateOptions): Promise<void>` : lit la page envoyée par le serveur et la monte avec l'adaptateur du framework de la page, chargé à la demande. |
| `bootPage` | fonction | `bootPage(options: BootPageOptions): Promise<void>` : pareil avec votre propre `mount` ; ce qu'utilise le client d'un autre renderer. |
| `router` | const | La navigation côté client ; voir ci-dessous. |
| `urlFor` | fonction | `urlFor(name: string, params?: Record<string, string \| number>, options?: { qs?: Record<string, string \| number \| boolean> }): string`. |
| `setRoutes` | fonction | `setRoutes(routes: RouteManifest): void` : les routes nommées que lit `urlFor`. |
| `getRoute` | fonction | `getRoute(name: string): { path: string; methods: string[] }`. |
| `resolvePageComponent` | fonction | `resolvePageComponent<T>(path: string \| string[], pages: Record<string, Promise<T> \| (() => Promise<T>) \| T>, layout?: unknown): Promise<T>` : trouve une page dans une table `import.meta.glob`. |
| `useInfiniteScroll` | fonction | `useInfiniteScroll(options: UseInfiniteScrollOptions): UseInfiniteScrollProps` : le cœur du défilement infini, sans framework. |
| `useInfiniteScrollData` | fonction | `useInfiniteScrollData(options: InfiniteScrollDataOptions): InfiniteScrollData`. |
| `getScrollableParent` | fonction | L'ancêtre défilant le plus proche d'un élément. |
| `browserHost` | fonction | `browserHost(): PhotonHost` : l'adresse, l'historique et le `fetch` du navigateur. |
| `PhotonClientError` | erreur | Erreurs client : `code`, `hint?`, `context?`, `docsUrl`. |
| `HydrateOptions` | interface | `{ resolveComponent: ResolveComponent; target?: string; onHydrated?: () => void; svelteRoot?: unknown }`. `target` vaut `'#app'` par défaut. |
| `BootPageOptions` | interface | `{ target?; host?: PhotonHost; url?; resolveComponent; mount(target, Component, page); onHydrated? }`. |
| `PhotonPageData` | interface | L'objet de page tel que le lit le client. |
| `PhotonRoutes` | interface | Vide ; augmentez-la avec vos noms de routes et leurs paramètres pour typer `urlFor` et `router`. |
| `ResolveComponent` | type | `(name: string) => Promise<{ default: unknown }>`. |
| `VisitOptions`, `PartialRequest`, `VisitCallbacks`, `RouterEvents` | interface | Options du routeur, rechargements partiels, callbacks, événements. |
| `RouteManifest`, `RouteName`, `RouteParamsFor`, `RouteTarget` | type | Routes nommées. |
| `PhotonHost`, `PhotonEvent` | interface | Où tourne le routeur hors d'un navigateur. |
| `ClientFramework` | type | `'react' \| 'vue' \| 'svelte'`. |
| `ScrollPropMeta`, `PhotonAdapterHandle`, `PhotonClientErrorCode` | type | |
| `InfiniteScrollData`, `InfiniteScrollDataOptions`, `InfiniteScrollElementManager`, `InfiniteScrollOnCompleteDetails`, `InfiniteScrollPageIdentifier`, `UseInfiniteScrollOptions`, `UseInfiniteScrollProps` | type | Défilement infini. |

`@c9up/photon/client/core` exporte `bootPage`, `router`, `urlFor`, `setRoutes`, `getRoute`, `browserHost`, `PhotonClientError` et leurs types, sans `hydrate` ni les adaptateurs.

### `router`

| Membre | Signature | Description |
|---|---|---|
| `visit` | `visit(target: string \| RouteTarget, options?: VisitOptions): Promise<void>` | Récupère la page et la substitue ; avec `only`, `except` ou `reset`, un rechargement partiel. Une autre origine donne une navigation complète. |
| `reload` | `reload(request?: PartialRequest): Promise<void>` | `visit()` de l'URL courante, sans cache. |
| `get` / `post` / `put` / `patch` | `post(target: string \| RouteTarget, data?: RequestPayload, options?: VisitOptions)` | |
| `delete` | `delete(target: string \| RouteTarget, options?: VisitOptions)` | |
| `on` | `on<K extends keyof RouterEvents>(type: K, callback: (event: PhotonEvent<RouterEvents[K]>) => void): () => void` | `start`, `finish`, `success`, `error`, `flash`. |
| `remember` / `restore` | `remember(data: unknown, key?: string): void` | Un état gardé dans l'entrée d'historique. |
| `replace` | `replace({ url }: { url: string }): void` | Change l'URL sans visite. |

`VisitOptions` : `method`, `data`, `only`, `except`, `reset`, `headers`, `errorBag`, `preserveErrors`, `preserveUrl`, `preserveState`, `replace`, `forceFormData`, et les callbacks `onBefore`, `onCancelToken`, `onCancel`, `onStart`, `onBeforeUpdate`, `onSuccess`, `onError`, `onFinish`.

### `@c9up/photon/react`, `@c9up/photon/vue`, `@c9up/photon/svelte`

Les trois entrées offrent le même ensemble, chacune dans l'idiome de son framework.

| Export | React | Vue | Svelte | Description |
|---|---|---|---|---|
| `createPhotonApp` | fonction | fonction | fonction | Démarre l'application dans le navigateur ; dans l'entrée SSR (avec `page` et `render`), renvoie `{ head, body }`. |
| `App` | composant | composant | composant (`PhotonRoot`, aussi l'export par défaut) | La racine qui rend la page courante. |
| `usePage` | hook | composable | fonction | L'objet de page courant. |
| `Link` | composant | composant | composant | Un lien qui visite au lieu de recharger. |
| `Form` | composant | composant | composant | Un formulaire soumis comme une visite, avec erreurs et progression. |
| `useForm` | hook | composable | fonction | L'état d'un formulaire : données, erreurs, `processing`, helpers de soumission. |
| `useFormContext` | hook | composable | fonction | Les props de slot du `Form` englobant. |
| `Deferred` | composant | composant | composant | Affiche un contenu de repli jusqu'à l'arrivée des props différées. |
| `WhenVisible` | composant | composant | composant | Charge des props quand l'élément entre dans la vue. |
| `InfiniteScroll` | composant | composant | composant | Charge la page suivante ou précédente d'une prop `scroll()`. |
| `PhotonPage` | composant | composant | | Fournit un objet de page à un sous-arbre. |
| `plugin` | | plugin Vue | | Installe photon dans une application Vue. |
| `setPage` | | | fonction | Fixe la page courante. |
| `shouldIntercept` | fonction | | | Si un clic doit devenir une visite. |

Chaque entrée exporte aussi les types d'options et de props correspondants : `CreatePhotonAppOptions`, `CreatePhotonAppSsrOptions`, `SetupOptions`, `LinkProps`, `FormProps` (React), `InfiniteScrollProps`, `DeferredProps` et `WhenVisibleProps` (React), `InertiaFormProps` (React), `InertiaForm` et `InertiaFormExtras` (Vue, Svelte), `PhotonRootProps` (Svelte).

## Configuration

`config/photon.ts` exporte `defineConfig({ … })`. Le stub de configure écrit `framework: 'react'`, `entryClient: 'resources/app.tsx'` et le SSR activé avec `resources/ssr.tsx`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | (obligatoire) | Le framework frontend. |
| `entryClient` | `string` | (obligatoire) | L'entrée client (`'resources/app.tsx'`). |
| `buildDir` | `string` | `'public/build'` | Où le build client est écrit, sur disque. |
| `assetsUrl` | `string` | `'/build'` | L'URL d'où le build client est servi (un chemin relatif à la racine ou une URL http(s)). |
| `ssrBuildDir` | `string` | `'build/ssr'` | Où le bundle SSR est écrit ; refusé dans `buildDir` ou `public/`. |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | URL du serveur de développement Vite (développement seulement). |
| `dev` | `boolean` | selon l'environnement | Servir par le serveur de développement Vite. Non défini, seuls `ream dev` ou un `NODE_ENV` de développement ou de test l'activent. |
| `defaultMeta` | `MetaTags` | aucun | Balises `<head>` de toute l'application ; les valeurs par route se fusionnent par-dessus. |
| `ssr.enabled` | `boolean` | `false` | Rendre les pages côté serveur. |
| `ssr.entrypoint` | `string` | `'resources/ssr.tsx'` | L'entrée SSR. |
| `ssr.pages` | `string[] \| (ctx, page) => boolean \| Promise<boolean>` | toutes les pages | Quelles pages rendre côté serveur. |
| `encryptHistory` | `boolean` | `false` | Chiffrer l'état d'historique de chaque page ; `ctx.photon.encryptHistory(false)` le désactive pour une réponse. |
| `assetsVersion` | `string \| number` | empreinte du manifeste | Une version d'assets fixe, envoyée avec chaque page. |
| `appRoot` | `string` | `app.makePath()` | La racine depuis laquelle `buildDir` est résolu. |
| `rootView` | `string \| (ctx) => string \| RootViewRenderer` | le document de photon | Le document d'une première visite : un nom de template pour `ctx.view`, ou une fonction qui en renvoie un (ou qui écrit le document). |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `PhotonRenderer` (classe), `'photon'` | Le renderer, construit depuis `config/photon.ts` et démarré dans le `boot()` du provider. Une config absente lève une erreur. |

`'photon'` est déclaré sur `ContainerBindings`.

## Erreurs

Les deux classes d'erreur portent `code`, un `hint` et un `context` optionnels, et un `docsUrl` vers la ligne du code ci-dessous ; `docsUrl` est énumérable, donc les chaînes de logs le transmettent.

| Code | Levée quand |
|---|---|
| [`E_PHOTON_INVALID_CONFIG`](/fr/reference/errors#e-photon-invalid-config) | Une valeur de config échoue à la validation : `buildDir` hors du projet, un segment de remontée dans `entryClient` ou `ssr.entrypoint`. |
| [`E_PHOTON_MANIFEST_MISSING`](/fr/reference/errors#e-photon-manifest-missing) | `<buildDir>/manifest.json` est absent au boot en production. |
| [`E_PHOTON_MANIFEST_INVALID`](/fr/reference/errors#e-photon-manifest-invalid) | Le manifeste Vite est illisible, ou n'est pas un manifeste. |
| [`E_PHOTON_SSR_LOAD_FAILED`](/fr/reference/errors#e-photon-ssr-load-failed) | Le module d'entrée SSR ne s'est pas chargé. |
| [`E_PHOTON_SSR_RENDER_FAILED`](/fr/reference/errors#e-photon-ssr-render-failed) | Le module SSR a levé une erreur en rendant une page. |
| [`E_PHOTON_HYDRATION_NO_DATA`](/fr/reference/errors#e-photon-hydration-no-data) | Le document n'a pas de `<script id="photon-data">`. |
| [`E_PHOTON_HYDRATION_BAD_DATA`](/fr/reference/errors#e-photon-hydration-bad-data) | Le script de données n'est pas un objet de page valide. |
| [`E_PHOTON_HYDRATION_NO_TARGET`](/fr/reference/errors#e-photon-hydration-no-target) | La cible de montage (`#app` par défaut) ne correspond à aucun élément. |
| [`E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK`](/fr/reference/errors#e-photon-hydration-unsupported-framework) | La page nomme un autre framework que React, Vue ou Svelte. |
| [`E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED`](/fr/reference/errors#e-photon-hydration-adapter-load-failed) | Le runtime du framework n'est pas installé. |
| [`E_PHOTON_UNKNOWN_ROUTE`](/fr/reference/errors#e-photon-unknown-route) | Un `Link`, un `Form`, `router.visit` ou `urlFor` a nommé une route non transmise par `setRoutes()`. |
| [`E_PHOTON_MISSING_ROUTE_PARAMS`](/fr/reference/errors#e-photon-missing-route-params) | Les paramètres d'une route nommée n'ont pas tous été fournis. |
| [`E_PHOTON_UNKNOWN_PAGE`](/fr/reference/errors#e-photon-unknown-page) | Le `resolve` donné à `createPhotonApp` n'a rien renvoyé pour un nom de page. |

## Voir aussi

- [Introduction](/fr/guides/frontend/photon/)
- [Pages et props](/fr/guides/frontend/photon/pages)
- [Hydratation et navigation](/fr/guides/frontend/photon/hydration)
- [Head, SEO et CSP](/fr/guides/frontend/photon/head)
- [Frameworks](/fr/guides/frontend/photon/frameworks)
- [Vite](/fr/guides/frontend/vite)
