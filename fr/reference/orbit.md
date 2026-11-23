# orbit

`@c9up/orbit` : des composants aurora rendus en vues natives sur un téléphone, mis en page et comparés par un hôte Rust. Guide : [Introduction](/fr/guides/mobile/introduction).

## Installation

```bash
pnpm add @c9up/orbit
```

Dépendances pairs : `@c9up/aurora` (requise) et `@c9up/photon` (uniquement pour `@c9up/orbit/pages`). L'app est construite et lancée par `ream android:*`, qui ajoute l'hôte natif et la table de styles de l'app ; voir [Construire l'app](/fr/guides/mobile/building).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/orbit` | Le cœur, sans React Native : le montage d'un template sur l'hôte natif, les piles d'écrans, la table de styles, les valeurs de mouvement, la connexion au serveur, et les `URL` et `TextDecoder` standard. |
| `@c9up/orbit/react-native` | L'entrée de l'app sur le téléphone : `run(App)` enregistre l'app auprès de React Native, donne à orbit son hôte et sa table de styles, et branche le bouton retour. Son import installe les `URL` et `TextDecoder` standard. |
| `@c9up/orbit/pages` | Des pages pilotées par le serveur ream, affichées comme écrans d'une pile (nécessite `@c9up/photon`). |

Le paquet n'a pas de condition d'export `react-native` : l'entrée du téléphone est le sous-chemin `./react-native`, importé par le fichier d'entrée de l'app.

## Exports

### `@c9up/orbit`

| Export | Nature | Description |
|---|---|---|
| `mount` | fonction | Rend un template aurora en vues natives via l'hôte. |
| `MountOptions` | interface | Options de `mount`. |
| `Root` | type | La racine montée que renvoie `mount`. |
| `OrbitReport` | interface | Le rapport d'un commit, renvoyé par l'hôte. |
| `afterCommit` | fonction | Exécute un hook dès que le commit suivant a atteint l'hôte. |
| `useHost` | fonction | Donne à orbit son hôte natif, une fois, avant `mount`. |
| `OrbitHost` | interface | Ce dont orbit a besoin du côté natif. |
| `NATIVE_MODULE_NAME` | const | `"NativeOrbit"`, le nom du TurboModule que le côté natif enregistre. |
| `GestureEvent` | type | Ce que reçoit un gestionnaire de geste (`@click`, `@longpress`, `@pan`, `@swipe`). |
| `createStack` | fonction | Une pile d'écrans. |
| `useScreen` | fonction | L'écran dont fait partie un composant. |
| `goBack` | fonction | Ce que fait le bouton retour : dépiler la pile affichée la plus intérieure. |
| `Stack` | type | Une pile d'écrans (la classe que renvoie `createStack`). |
| `StackOptions` | interface | Options de `createStack`. |
| `Navigator` | interface | `push`, `pop`, `replace`, `canGoBack`. |
| `Screen` | interface | Un `Navigator` plus `focused()`. |
| `ScreenComponent` | type | `(props: P) => TemplateResult`. |
| `useStyles` | fonction | Donne à orbit la table de styles de l'app. |
| `colorScheme` | const | Signal du schéma que suit `dark:`. |
| `unknownClasses` | const | Les classes demandées par des éléments et absentes de la table de styles. |
| `StyleTable` | interface | La table qu'écrit `ream css:compile`. |
| `bindMotion` | fonction | Relie un style de mouvement à une vue commitée. |
| `bindScrollY` | fonction | Alimente une valeur de mouvement avec le défilement d'une vue. |
| `MotionValue`, `MotionNode` | classe | Réexportées de `@c9up/aurora/core` ; sur le téléphone, l'hôte les pilote sur le thread UI une fois `useHost` appelé. |
| `MotionStyle`, `SpringOptions`, `TimingOptions` | type | Réexportés de `@c9up/aurora/core`. |
| `connectServer` | fonction | Une connexion au serveur ream de l'app, pour les pages, comet et relay. |
| `ServerConnection` | interface | Ce que renvoie `connectServer`. |
| `ConnectOptions` | interface | Options de `connectServer`. |
| `TokenStore` | interface | Où `authorize` conserve le jeton d'API. |
| `ServerEventStream` | classe | Des server-sent events sur le XHR en flux de React Native. |
| `ServerEvent` | interface | Un server-sent event. |
| `colorToArgb` | fonction | Une couleur CSS en entier ARGB 32 bits. |
| `installTextDecoder` | fonction | Installe un `TextDecoder` UTF-8 standard là où le moteur n'en a pas (Hermes). |
| `StandardTextDecoder` | classe | Le `TextDecoder` UTF-8 qu'il installe. |
| `installStandardUrl` | fonction | Installe une `URL` standard à la place de celle de la plateforme quand celle-ci ne l'est pas. |
| `StandardURL` | classe | L'`URL` qu'il installe. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |

#### Montage

| Fonction | Signature | Description |
|---|---|---|
| `useHost` | `useHost(next: OrbitHost): void` | Donne à orbit son hôte natif, une fois, avant `mount`. Les valeurs de mouvement créées ensuite vivent dans l'hôte. |
| `mount` | `mount(result: TemplateResult, options: MountOptions): Root` | Rend le template ; la racine commite d'elle-même après chaque changement, regroupés en une microtâche. |
| `afterCommit` | `afterCommit(hook: () => void): void` | Exécute `hook` dès que le commit suivant a atteint l'hôte. |
| `colorToArgb` | `colorToArgb(css: string): number` | Lit `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` / `rgba()` (syntaxe à virgules ou à espaces) et `transparent`. |

| Champ de `MountOptions` | Type | Description |
|---|---|---|
| `viewport` | `{ width: number; height: number }` | La taille de la racine en dp (React Native : `Dimensions.get("window")`). |
| `host` | `OrbitHost` | Par défaut, l'hôte donné à `useHost`. |

| Membre de `Root` | Signature | Description |
|---|---|---|
| `flush` | `flush(): OrbitReport` | Commite les changements maintenant, au lieu de la fin du tour. |
| `reports` | `readonly reports: OrbitReport[]` | Le rapport de chaque commit, le plus récent en dernier (développement et benchmarks). |

`OrbitReport` vaut `{ deleted: number[]; parseUs: number; layoutUs: number; diffUs: number; measures: number; nodes: number; opsBytes: number }`.

`OrbitHost` est structurel : un test peut passer un faux. Ses méthodes : `setViewport(width, height)`, `commit(ops: string): string`, `imageBytes(tag, bytes: Uint8Array)`, `layout(tags: string): string`, `scroll(tag, by, toEnd)`, `setEventHandler(handler)`, et les méthodes de mouvement `motionValue`, `motionInterpolate`, `motionSet`, `motionStop`, `motionFrames`, `motionSpring`, `motionDispose`, `motionBind`, `motionBindScroll`.

`GestureEvent` vaut `{ type: string } & { [key: string]: unknown }` : la forme que lit un gestionnaire DOM, plus les valeurs du geste.

#### Piles et écrans

| Fonction | Signature | Description |
|---|---|---|
| `createStack` | `createStack(initial: () => TemplateResult, options?: StackOptions): Stack`<br>`createStack<P>(initial: ScreenComponent<P>, options: StackOptions & { props: P }): Stack` | Une pile avec `initial` en bas ; affichez-la avec `` html`${stack}` ``. Une pile ne s'affiche qu'à un seul endroit. |
| `useScreen` | `useScreen(): Screen` | L'écran dont fait partie ce composant, dans son setup ou dans un slot qu'il a construit. |
| `goBack` | `goBack(): boolean` | Dépile la pile affichée la plus intérieure qui le peut ; `false` si aucune ne le peut, et le retour de la plateforme s'applique. |

| Membre de `Stack` | Signature | Description |
|---|---|---|
| `push` | `push(screen: () => TemplateResult): void`<br>`push<P>(screen: ScreenComponent<P>, props: P): void` | Affiche `screen` au-dessus ; celui du dessous garde son état, recouvert. |
| `pop` | `pop(): boolean` | Termine l'écran du dessus et affiche celui du dessous ; `false` s'il n'en reste qu'un. |
| `replace` | `replace(screen: () => TemplateResult): void`<br>`replace<P>(screen: ScreenComponent<P>, props: P): void` | Remplace l'écran du dessus par `screen` ; le remplacé se termine. |
| `replaceInPlace` | `replaceInPlace<P>(screen: ScreenComponent<P>, props: P): void` | Remplace l'écran du dessus immédiatement, sans transition. |
| `reset` | `reset<P>(screen: ScreenComponent<P>, props: P): void` | Termine tous les écrans et repart de `screen`, immédiatement. |
| `back` | `back(): boolean` | Ce que fait le bouton retour ici : l'option `back`, ou `pop()`. |
| `canGoBack` | `canGoBack(): boolean` | Indique si `pop` a un écran où revenir (réactif). |
| `isShown` | `isShown(): boolean` | Indique si la pile est à l'écran, hors d'un écran recouvert. |

`Screen` ajoute `focused(): boolean` à `Navigator` : vrai tant que cet écran est celui affiché (réactif). Les effets d'un écran recouvert continuent de tourner.

| Champ de `StackOptions` | Type | Défaut | Description |
|---|---|---|---|
| `transition` | `'slide' \| 'none'` | `'slide'` | `slide` : entrée depuis le bord droit, l'écran recouvert glissant vers la gauche ; `none` : immédiat. |
| `duration` | `number` | `300` | La durée de la transition en ms. |
| `background` | `string` | aucun | Peint derrière chaque écran. |
| `back` | `() => boolean` | `pop()` | Ce que fait le bouton retour quand il atteint cette pile ; vrai s'il est revenu en arrière. |

#### Styles et mouvement

| Fonction | Signature | Description |
|---|---|---|
| `useStyles` | `useStyles(table: unknown): void` | Donne à orbit la table de styles de l'app ; `run` le fait sur le téléphone. Tout autre chose qu'une table version 1 issue de `ream css:compile` lève `E_ORBIT_STYLE_TABLE`. |
| `colorScheme` | `Signal<'light' \| 'dark'>` | Le schéma que suivent `dark:` et les valeurs sombres du thème ; vaut d'abord `'light'`. |
| `unknownClasses` | `Set<string>` | Les classes demandées par un élément et absentes de la feuille de styles. |
| `bindMotion` | `bindMotion(viewTag: number, style: MotionStyle): void` | Relie `style` (`opacity`, `translateX`, `translateY`, `scale`, `visible`) à la vue ; appelez-la une fois la vue commitée. |
| `bindScrollY` | `bindScrollY(scrollViewTag: number, value: MotionValue): void` | Alimente `value` avec le défilement de la vue défilante. |

#### Connexion au serveur

| Fonction | Signature | Description |
|---|---|---|
| `connectServer` | `connectServer(server: string, options?: ConnectOptions): ServerConnection` | Se connecte au serveur ream de l'app : en https, ou en http vers `localhost`, `127.0.0.1`, `[::1]` ou l'hôte de l'émulateur `10.0.2.2`. Tout autre http lève `E_ORBIT_INSECURE_SERVER`. |

| Membre de `ServerConnection` | Signature | Description |
|---|---|---|
| `origin` | `readonly origin: string` | L'origine du serveur. |
| `url` | `url(path: string): string` | `path` sur le serveur, en absolu. |
| `fetch` | `fetch(url: string, init?: RequestInit): Promise<Response>` | Une requête au serveur : refusée vers une autre origine, avec le cookie de session et, sur une mutation, le `X-XSRF-TOKEN` posé par le cookie `XSRF-TOKEN` du serveur. |
| `json` | `json(url: string, body: unknown, options?: { signal?: AbortSignal }): Promise<unknown>` | Envoie `body` en JSON par POST et résout la réponse JSON (rien pour un 204) : la forme du `RpcTransport` de comet. |
| `stream` | `stream(url: string): ServerEventStream` | Un flux de server-sent events : ce que prend l'option `stream` de relay. |
| `xsrf` | `xsrf(): string \| undefined` | Le dernier `XSRF-TOKEN` posé par le serveur. |
| `authorize` | `authorize(token: string \| null): Promise<void>` | Envoie désormais `Authorization: Bearer <token>` avec chaque requête et chaque flux ; `null` arrête. Avec un `tokenStore`, le jeton y est aussi conservé. |
| `restore` | `restore(): Promise<boolean>` | Réautorise avec le jeton conservé par le `tokenStore` ; `false` s'il n'y en avait pas, ou sans magasin. |

| Type | Forme |
|---|---|
| `ConnectOptions` | `{ tokenStore?: TokenStore }` |
| `TokenStore` | `{ get(): Promise<string \| null>; set(token: string \| null): Promise<void> }` |
| `ServerEvent` | `{ readonly type: string; readonly data?: string; readonly lastEventId?: string }` |

| Membre de `ServerEventStream` | Signature | Description |
|---|---|---|
| constructeur | `new ServerEventStream(url: string, headers?: () => Record<string, string>, options?: { credentials?: boolean })` | Ouvre le flux ; `credentials` vaut `true` par défaut. |
| `CONNECTING`, `OPEN`, `CLOSED` | `static readonly` `0`, `1`, `2` | Les valeurs de `readyState`. |
| `url` | `readonly url: string` | L'URL du flux. |
| `readyState` | `number` | L'état courant. |
| `addEventListener` | `addEventListener(type: string, listener: (event: ServerEvent) => void): void` | Écoute les événements de `type`. |
| `removeEventListener` | `removeEventListener(type: string, listener: (event: ServerEvent) => void): void` | Arrête d'écouter. |
| `close` | `close(): void` | Ferme le flux pour de bon. |

Une connexion coupée émet `error` et se reconnecte après le `retry:` du serveur (3000 ms s'il n'est pas défini) avec `Last-Event-ID`. Une réponse qui n'est pas un 200 `text/event-stream` fait échouer le flux pour de bon.

#### Adaptateurs de plateforme

| Export | Signature | Description |
|---|---|---|
| `installTextDecoder` | `installTextDecoder(): boolean` | Met `StandardTextDecoder` en place quand le moteur n'a pas de `TextDecoder` ; `true` s'il l'a fait. |
| `StandardTextDecoder` | `new StandardTextDecoder(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean })` | UTF-8 uniquement ; `decode(input?: ArrayBuffer \| ArrayBufferView, options?: { stream?: boolean }): string`. |
| `installStandardUrl` | `installStandardUrl(): boolean` | Met `StandardURL` à la place de l'`URL` de la plateforme quand celle-ci n'est pas standard ; `true` s'il l'a fait. Le `createObjectURL` de la plateforme reste accessible. |
| `StandardURL` | `new StandardURL(url: string \| StandardURL, base?: string \| StandardURL)` | Une `URL` standard : `canParse`, `createObjectURL`, `revokeObjectURL`, les parties de l'URL, `searchParams`, `href`, `toString()`, `toJSON()`. |

### `@c9up/orbit/react-native`

| Export | Nature | Description |
|---|---|---|
| `run` | fonction | Enregistre le composant racine comme app et le monte au démarrage de l'activité. |
| `RunOptions` | interface | Options de `run`. |
| `LaunchProps` | type | `{ [key: string]: unknown }` : les props de lancement (extras de l'intent). |
| `APP_NAME` | const | `"main"`, le nom sous lequel l'activité générée démarre l'app. |

| Fonction | Signature | Description |
|---|---|---|
| `run` | `run(root: (props: LaunchProps) => TemplateResult, options?: RunOptions): void` | Donne à orbit l'hôte `NativeOrbit` (lève `E_ORBIT_NO_HOST` si le module n'est pas celui d'orbit) et la table de styles, règle le schéma de couleurs, envoie le bouton retour à `goBack`, et monte `root` avec les props de lancement à la taille de la fenêtre. |

| Champ de `RunOptions` | Type | Défaut | Description |
|---|---|---|---|
| `colorScheme` | `'system' \| 'light' \| 'dark'` | `'system'` | `system` : `dark:` suit le réglage du téléphone jusqu'à ce que l'app appelle elle-même `colorScheme(…)` ; `light` / `dark` : celui-là, quel que soit le réglage du téléphone. |

### `@c9up/orbit/pages`

| Export | Nature | Description |
|---|---|---|
| `serverPages` | fonction | La pile où s'affichent les pages du serveur ; placez-la dans un template. |
| `ServerPagesOptions` | interface | Options de `serverPages`. |

| Fonction | Signature | Description |
|---|---|---|
| `serverPages` | `serverPages(options: ServerPagesOptions): Stack` | Un lien ou une visite demande au serveur l'objet de page suivant et affiche la page qu'il nomme comme un écran ; le bouton retour passe par l'historique du routeur, et une page recouverte revient telle qu'elle était, sans requête. |

| Champ de `ServerPagesOptions` | Type | Défaut | Description |
|---|---|---|---|
| `server` | `string \| ServerConnection` | requis | L'origine du serveur (même règle que `connectServer`), ou la connexion créée par `connectServer`. |
| `pages` | `{ [name: string]: (props) => TemplateResult }` | requis | Les pages que le serveur peut nommer, sous le nom avec lequel il les rend. Un nom absent lève `E_ORBIT_UNKNOWN_PAGE`. |
| `url` | `string` | `'/'` | Le chemin de la première page. |
| `stack` | `Omit<StackOptions, 'back'>` | | La façon dont les écrans changent (`transition`, `duration`, `background`). |
| `loading` | `() => TemplateResult` | une vue vide | Affiché jusqu'à l'arrivée de la première page. |
| `failed` | `(error: unknown, retry: () => void) => TemplateResult` | le message et un bouton Retry | Affiché quand le serveur n'a pas pu donner de page ; `retry` redemande. |
| `open` | `(url: string) => void` | | Ouvre un lien hors du serveur (un autre site, `mailto:`). |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_ORBIT_NO_HOST`](/fr/reference/errors#e-orbit-no-host) | `mount` s'exécute avant `useHost`, ou le module `NativeOrbit` n'est pas l'hôte d'orbit. |
| [`E_ORBIT_COMMIT_FAILED`](/fr/reference/errors#e-orbit-commit-failed) | L'hôte natif a refusé un commit ; le message porte son rapport. |
| [`E_ORBIT_UNSUPPORTED_ELEMENT`](/fr/reference/errors#e-orbit-unsupported-element) | Un élément n'a pas d'équivalent natif (`select`, `canvas`, ou `text` ou un dégradé dans un `svg`). |
| [`E_ORBIT_BLOCK_IN_TEXT`](/fr/reference/errors#e-orbit-block-in-text) | Un élément bloc se trouve dans du texte. |
| [`E_ORBIT_INVALID_MOTION`](/fr/reference/errors#e-orbit-invalid-motion) | `motion=${…}` n'est pas un objet de valeurs de mouvement. |
| [`E_ORBIT_INVALID_SCROLL_BINDING`](/fr/reference/errors#e-orbit-invalid-scroll-binding) | `scroll-y=${…}` n'est pas une valeur de mouvement. |
| [`E_ORBIT_INVALID_COLOR`](/fr/reference/errors#e-orbit-invalid-color) | Une couleur qu'orbit ne sait pas lire. |
| [`E_ORBIT_INSECURE_IMAGE_URL`](/fr/reference/errors#e-orbit-insecure-image-url) | `<img src>` utilise http en clair. |
| [`E_ORBIT_IMAGE_SOURCE`](/fr/reference/errors#e-orbit-image-source) | `<img src>` utilise un schéma qui n'est pas une source d'image (`data:`, `javascript:`…). |
| [`E_ORBIT_DUPLICATE_KEY`](/fr/reference/errors#e-orbit-duplicate-key) | Deux éléments d'une liste `each` partagent une clé. |
| [`E_ORBIT_NO_SCREEN`](/fr/reference/errors#e-orbit-no-screen) | `useScreen()` s'exécute dans un composant qu'aucun écran n'a construit. |
| [`E_ORBIT_STACK_SHOWN`](/fr/reference/errors#e-orbit-stack-shown) | Une même pile est placée à deux endroits. |
| [`E_ORBIT_STYLE_TABLE`](/fr/reference/errors#e-orbit-style-table) | `useStyles` a reçu autre chose qu'une table écrite par `ream css:compile`. |
| [`E_ORBIT_INSECURE_SERVER`](/fr/reference/errors#e-orbit-insecure-server) | `connectServer` ou `serverPages` reçoit du http en clair vers un hôte qui n'est ni cette machine ni celui de l'émulateur. |
| [`E_ORBIT_UNKNOWN_PAGE`](/fr/reference/errors#e-orbit-unknown-page) | Le serveur a nommé une page que `serverPages({ pages })` ne liste pas. |
| [`E_ORBIT_FOREIGN_ORIGIN`](/fr/reference/errors#e-orbit-foreign-origin) | Une connexion au serveur a reçu un chemin qui mène à une autre origine. |
| [`E_ORBIT_SERVER_REQUEST_FAILED`](/fr/reference/errors#e-orbit-server-request-failed) | Le serveur a répondu à une requête `json` par une réponse vide hors 2xx. |
| [`E_ORBIT_NO_XHR`](/fr/reference/errors#e-orbit-no-xhr) | Les événements serveur demandent un `XMLHttpRequest`, et la plateforme n'en a pas. |
| [`E_ORBIT_OBJECT_URL_UNAVAILABLE`](/fr/reference/errors#e-orbit-object-url-unavailable) | `URL.createObjectURL` a été appelé sans `URL` de la plateforme pour fabriquer des URL de blob. Une `TypeError`, comme la lève l'`URL` standard. |
| [`E_ORBIT_INVALID_URL`](/fr/reference/errors#e-orbit-invalid-url) | Le `URL` standard a reçu une URL, ou une base, qui ne s'analyse pas. Une `TypeError`, comme la lève l'`URL` standard. |
| [`E_ORBIT_UNSUPPORTED_ENCODING`](/fr/reference/errors#e-orbit-unsupported-encoding) | Le `TextDecoder` standard a reçu un label d'encodage autre que celui d'UTF-8. Une `RangeError`, comme la lève le `TextDecoder` standard. |
| [`E_ORBIT_INVALID_DECODER_INPUT`](/fr/reference/errors#e-orbit-invalid-decoder-input) | `TextDecoder.decode` a reçu autre chose qu'un `ArrayBuffer` ou une vue sur l'un d'eux. Une `TypeError`, comme la lève le `TextDecoder` standard. |
| [`E_ORBIT_INVALID_ENCODED_DATA`](/fr/reference/errors#e-orbit-invalid-encoded-data) | Un `TextDecoder` `fatal` a rencontré des octets qui ne sont pas de l'UTF-8 valide. Une `TypeError`, comme la lève le `TextDecoder` standard. |
| [`E_ORBIT_INTERNAL`](/fr/reference/errors#e-orbit-internal) | Un invariant interne d'orbit a cédé : un bug d'orbit. |

Chaque erreur est une classe de l'export `errors`, nommée par son code. Les cinq que lèvent l'`URL` et le `TextDecoder` standard installés par orbit restent une `TypeError` ou une `RangeError` (`name` compris), comme ces API les lèvent, avec le code en plus ; les autres sont des exceptions ream avec un `status`.

## Migration

- `OrbitError` disparaît : testez `error.code`, ou `error instanceof errors.E_ORBIT_*` avec `import { errors } from '@c9up/orbit'`.
- `OrbitTypeError` et `OrbitRangeError` disparaissent : les refus de `URL` et de `TextDecoder` restent une `TypeError` / `RangeError`, désormais `errors.E_ORBIT_INVALID_URL` et consorts. `E_ORBIT_FOREIGN_ORIGIN` et `E_ORBIT_NO_XHR` ne sont plus une `TypeError` : attrapez-les par leur code.
- Le type `OrbitErrorCode` disparaît : `error.code` est une `string`.

## Voir aussi

- [Introduction](/fr/guides/mobile/introduction)
- [Styles et écrans](/fr/guides/mobile/styles-and-screens)
- [Gestes et mouvement](/fr/guides/mobile/gestures-and-motion)
- [Pages pilotées par le serveur](/fr/guides/mobile/server-driven)
- [Construire l'app](/fr/guides/mobile/building)
- [orbit-clipboard](/fr/reference/orbit-clipboard), [orbit-secure-store](/fr/reference/orbit-secure-store), [robledo](/fr/reference/robledo)
