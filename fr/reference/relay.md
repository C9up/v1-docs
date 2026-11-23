# relay

`@c9up/relay` : des messages temps réel vers le navigateur : des canaux diffusés en Server-Sent Events, et des hubs auxquels un client SignalR standard parle en WebSockets ou en SSE. Guides : [Diffusion](/fr/guides/realtime/broadcasting), [Hubs](/fr/guides/realtime/hubs).

## Installation

```bash
pnpm add @c9up/relay
ream configure @c9up/relay
```

`ream configure @c9up/relay` enregistre le provider et écrit `config/relay.ts`. Un bus Redis désigné par nom de connexion demande `@c9up/quasar`, dépendance pair optionnelle. Les routes d'abonnement lisent un corps JSON : gardez le body parser de ream dans le middleware du routeur.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/relay` | `Relay`, `Hub`, `SignalRAdapter`, `RedisRelayTransport`, `transports`, `defineConfig`, `registerHubRoutes` et les types. Réexporte aussi `RelayProvider`. |
| `@c9up/relay/provider` | `RelayProvider` (export par défaut). |
| `@c9up/relay/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/relay`. |
| `@c9up/relay/services/main` | Le `Relay` de l'application (export par défaut), plus `setRelay`, `getRelay`, `clearRelay`. Avant que le provider en lie un, il construit un `Relay` par défaut ; ce qui y a été enregistré passe à celui du provider. |
| `@c9up/relay/testing` | `FakeRelay`, qui enregistre les diffusions pour les assertions. |

## Exports

### `@c9up/relay`

| Export | Nature | Description |
|---|---|---|
| `Relay` | classe | Canaux, autorisations, diffusions, montage des hubs. |
| `Hub` | classe | Base abstraite d'un hub : les méthodes nommées `on<Event>` traitent les invocations du client. |
| `SignalRAdapter` | classe | Le protocole JSON de SignalR pour un hub : negotiate, poignée de main, trames. |
| `RedisRelayTransport` | classe | Le pub/sub Redis comme bus entre instances. |
| `transports` | const | `transports.redis(options)`, la factory de bus que nomme une config. |
| `defineConfig` | fonction | `defineConfig<T extends RelayConfig>(config: T): T`. Renvoie la config telle quelle. |
| `registerHubRoutes` | fonction | Monte les routes d'un hub sur un routeur ; ce qu'appelle `relay.hub()` par le provider. |
| `splitFrames` | fonction | `splitFrames(body: string): string[]` : découpe un corps POST sur le séparateur d'enregistrement de SignalR. |
| `PING_CHANNEL` | const | `'$$relay/ping'`, le nom d'événement des trames de maintien. |
| `RelayProvider` | provider | Identique à `@c9up/relay/provider`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `RelayConfig` | interface | Voir [Configuration](#configuration). |
| `RelayContext` | interface | Ce que reçoit une autorisation : `auth?`, `session?`, `request?`, `bouncer?`. |
| `RelayAuth` | interface | `{ isAuthenticated: boolean; user?: { id: string; [key: string]: unknown }; roles?: string[]; permissions?: string[] }`. |
| `ChannelAuthorizer` | type | `(ctx: RelayContext, params: TParams) => Promise<boolean> \| boolean`. |
| `RelayTransport` | interface | Un bus : `publish(channel, message)`, `subscribe(channel, handler)`, `unsubscribe(channel, handler?)` et `disconnect()` en option. |
| `RelayTransportFactory` | type | `() => RelayTransport`. |
| `RelayPubSubClient` | interface | Les commandes pub/sub qu'émet `RedisRelayTransport` : `publish`, `subscribe`, `unsubscribe`, `quit` en option. |
| `RelayPubSubResolver` | type | `RelayPubSubClient \| (() => RelayPubSubClient \| Promise<RelayPubSubClient>)`. |
| `RelayLifecycleEvents` | interface | Contenu de `connect`, `disconnect`, `subscribe`, `unsubscribe`, `broadcast`. |
| `RelayRouteBuilder` | interface | L'objet route que reçoit un personnalisateur : `middleware`, `use`, `guard`, `role`, `permission`. |
| `RelayRouteCustomizer` | type | `(route: RelayRouteBuilder) => void`. |
| `RelaySseStream` | interface | Un flux SSE tel que relay y écrit : `id`, `isOpen()`, `send(event, data, eventId?)`, `onClose(cb)`, `end()`. |
| `SubscribeResult` | type | `SubscribeSuccess \| SubscribeFailure`. |
| `SubscribeSuccess` | interface | `{ ok: true }`. |
| `SubscribeFailure` | interface | `{ ok: false; status: number; code: string }`. |
| `HubContext` | interface | Ce que reçoit un handler de hub. |
| `HubGuardOptions` | interface | `{ guard?: string; guards?: string[]; roles?: string[]; permissions?: string[] }`. |
| `NegotiateResponse` | interface | `{ connectionId; connectionToken; negotiateVersion; availableTransports }`. |
| `SignalRMessageType` | type | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7`. |
| `MountedHub` | interface | `{ path: string; hub: Hub; adapter: SignalRAdapter }`. |
| `HubRouter` | interface | Le routeur qu'il faut à `registerHubRoutes` : `get`, `post`, `ws` en option. |
| `HubRouteOptions` | interface | `{ webSockets?: () => boolean }` : si le serveur accepte les WebSockets à cet instant ; absent, SSE seulement. |
| `HubHttpContext` | interface | Le contexte de requête que lisent les routes de hub. |
| `HubSocket` | interface | La WebSocket où écrit un hub ; correspond au `ServerWebSocket` de ream. |
| `HubSseStream` | interface | Le flux SSE où écrit un hub. |

### `Relay`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Relay(config?: RelayConfig)` | |
| `authorize` | `authorize<TParams extends Record<string, string> = Record<string, string>>(pattern: string, callback: ChannelAuthorizer<TParams>): void` | Qui peut s'abonner aux canaux qui correspondent à `pattern` : segments statiques, `:param`, `:param.suffix`, un `:param?` optionnel final, un `*` final. Un enregistrement exact l'emporte ; les motifs sont essayés dans l'ordre. |
| `registerRoutes` | `registerRoutes(customizer?: RelayRouteCustomizer): void` | Monte `GET /__relay/events`, `POST /__relay/subscribe` et `POST /__relay/unsubscribe`, en appliquant `customizer` à chacune (pour ajouter le middleware `auth`). Ces routes n'existent pas avant l'appel ; appelez-la depuis un preload. |
| `hub` | `hub(path: string, hub: HubLike, adapter?: SignalRAdapterLike): void` | Prend un `Hub` et, en option, un `SignalRAdapter` construit sur lui. Monte un hub : `POST <path>/negotiate`, `GET <path>` (SSE), `POST <path>` et, quand le serveur le permet, une route WebSocket sur `<path>`. Monter deux fois un chemin lève une erreur. |
| `broadcast` | `broadcast(channel: string, payload: unknown): number` | Envoie à chaque abonné de `channel` ; recopié sur le bus s'il y en a un. Renvoie le nombre de clients locaux atteints. |
| `broadcastExcept` | `broadcastExcept(channel: string, payload: unknown, senderUid: string \| string[]): number` | Pareil, en sautant les identifiants de connexion donnés, sur toutes les instances. |
| `on` | `on<E extends keyof RelayLifecycleEvents>(event: E, listener: (evt: RelayLifecycleEvents[E]) => void): () => void` | Écouteur de cycle de vie ; renvoie sa fonction de retrait. |
| `connect` | `connect(sse: RelaySseStream, ctx: RelayContext): { outcome: 'ok'; uid: string } \| { outcome: 'capped' } \| { outcome: 'owner-capped' } \| { outcome: 'closed' }` | Enregistre un flux ouvert et lui attribue son uid. Appelé par la route des événements. |
| `subscribe` | `subscribe(uid: unknown, channel: unknown, ctx: RelayContext): Promise<SubscribeResult>` | Appelé par la route d'abonnement. |
| `unsubscribe` | `unsubscribe(uid: unknown, channel: unknown, ctx: RelayContext): Promise<'ok' \| 'forbidden'>` | Appelé par la route de désabonnement. |
| `clientCount` | `clientCount(): number` | Clients SSE de cette instance. |
| `channelSubscribers` | `channelSubscribers(channel: string): number` | Abonnés de `channel` sur cette instance. |
| `getSubscribersFor` | `getSubscribersFor(channel: string): string[]` | Leurs uids. |
| `startTransport` | `startTransport(): Promise<void>` | Rejoint le bus et lance le maintien ; idempotent. Le provider l'appelle dans `ready()`. |
| `whenTransportReady` | `whenTransportReady(): Promise<void>` | Se résout quand cette instance écoute le bus ; rejette si elle n'y est jamais parvenue. |
| `shutdown` | `shutdown(): Promise<void>` | Arrête le maintien, ferme tous les flux (hubs compris) et quitte le bus. |

L'uid de connexion est attribué par le serveur et envoyé au client dans la première trame `connected` ; un abonnement doit venir de l'utilisateur (et de la session) qui a ouvert le flux. Le nom d'un canal est le nom d'événement SSE de ses trames : les caractères de contrôle, `connected`, `error` et `$$relay/ping` sont refusés, de même qu'un nom de plus de 256 caractères.

```ts
interface RelayLifecycleEvents {
  connect: { uid: string; context: RelayContext }
  disconnect: { uid: string; context: RelayContext }
  subscribe: { uid: string; channel: string; context: RelayContext }
  unsubscribe: { uid: string; channel: string; context: RelayContext }
  broadcast: { channel: string; payload: unknown }
}
```

### `Hub`

Étendez-la et écrivez les handlers comme des méthodes nommées `on<Event>` : `onTaskUpdate` traite `taskUpdate`, sans tenir compte de la casse. Les handlers hérités comptent ; rien de `Hub` lui-même n'est accessible depuis le client.

| Membre | Signature | Description |
|---|---|---|
| `useGuards` | `useGuards(options: HubGuardOptions): void` | Exigences pour chaque invocation. `roles` est satisfait par l'un des noms, `permissions` par tous. |
| `onConnect` | `onConnect(ctx: HubContext): Promise<void>` | À redéfinir pour réagir à une connexion. |
| `onDisconnect` | `onDisconnect(clientId: string): Promise<void>` | À redéfinir pour réagir à une déconnexion. |
| `dispatch` | `dispatch(clientId: string, event: string, ...args: unknown[]): Promise<DispatchResult>` | Exécute un handler avec l'authentification de la connexion. `{ ok: true, result }` ou `{ ok: false }`. |
| `dispatchAs` | `dispatchAs(clientId: string, auth: HubContext['auth'], event: string, args: readonly unknown[]): Promise<DispatchResult>` | Exécute un handler avec l'authentification de la requête qui porte l'invocation. |
| `registerClient` | `registerClient(client): HubContext` | Enregistre une connexion ; le transport l'appelle. |
| `removeClient` | `removeClient(clientId: string): void` | |
| `authFor` | `authFor(clientId: string): HubContext['auth'] \| undefined` | L'authentification enregistrée à la connexion. |
| `stats` | `stats(): { clients: number; groups: number }` | Clients et groupes de cette instance. |

| Membre de `HubContext` | Signature | Description |
|---|---|---|
| `clientId` | `readonly clientId: string` | |
| `auth` | `readonly auth: { isAuthenticated: boolean; strategy?: string; user?: Record<string, unknown>; roles?: string[]; permissions?: string[] }` | |
| `joinGroup` / `leaveGroup` | `joinGroup(group: string): void` | |
| `send` | `send(event: string, data: unknown): void` | À ce client. |
| `group` | `group(name: string): { send(event: string, data: unknown): void }` | À un groupe, sur toutes les instances. |
| `broadcast` | `broadcast(event: string, data: unknown): void` | À tous les clients du hub, sur toutes les instances. |

Une connexion de hub vit sur l'instance qui l'a négociée : envoyez les requêtes de hub d'un client vers une seule instance (sessions persistantes sur les chemins du hub).

### `SignalRAdapter`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new SignalRAdapter(hub: Hub, options?)` | Options ci-dessous. |
| `negotiate` | `negotiate(connectionId: string, transports?: readonly string[], owner?: string, negotiator?: string): NegotiateResponse` | Émet un jeton de connexion ; `transports` vaut `['ServerSentEvents']` par défaut. Lève une erreur quand la table d'attente, ou la part du propriétaire, est pleine : vérifiez d'abord `admits(owner)`. |
| `admits` | `admits(owner?: string): boolean` | Si un negotiate de `owner` serait accepté. |
| `handleFrame` | `handleFrame(clientId: string, frame: string, auth?: HubContext['auth']): Promise<string[]>` | Traite une trame entrante ; renvoie les trames à renvoyer. La première trame doit être la poignée de main. |
| `encodeInvocation` | `encodeInvocation(target: string, args: unknown[]): string` | Une trame d'invocation du serveur vers le client. |
| `resolveToken` | `resolveToken(connectionToken: string): string \| undefined` | |
| `forget` | `forget(clientId: string): void` | |

| Option | Type | Défaut | Description |
|---|---|---|---|
| `maxFrameSize` | `number` | `65536` | Plus grande trame, en octets. |
| `tokenTtlMs` | `number` | `30000` | Durée de validité d'un jeton négocié non réclamé. |
| `maxPendingTokens` | `number` | `1024` | Jetons non réclamés en attente simultanément. |
| `maxPendingTokensPerOwner` | `number \| false` | `20` | Par utilisateur, ou par adresse client pour un anonyme. |
| `handshakeTimeoutMs` | `number` | `15000` | Temps laissé à un flux ouvert pour finir la poignée de main. |
| `maxConnections` | `number` | `10000` | Flux ouverts ; un nouveau au-delà reçoit 503. |
| `maxConnectionsPerOwner` | `number \| false` | `20` | Flux ouverts par propriétaire. |

### `transports` et `RedisRelayTransport`

```ts
transports.redis(options: { connection: RelayPubSubResolver | string; owned?: boolean }): RelayTransportFactory
new RedisRelayTransport(client: RelayPubSubResolver, ownsConnection?: boolean)
```

`connection` prend un client, une fonction qui en renvoie un, ou le nom d'une connexion `@c9up/quasar`. `owned: true` ferme le client à l'arrêt ; relay ne ferme jamais une connexion quasar nommée.

### `@c9up/relay/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeRelay` | classe | Enregistre les appels à `broadcast` et `broadcastExcept`, avec le contenu tel que JSON le transporterait. Les deux renvoient `0`. |
| `CapturedBroadcast` | interface | `{ channel: string; data: unknown; clients: number }`. |
| `FakeRelayPredicate` | interface | `{ dataMatches?: (data: unknown) => boolean }`. |
| `FakeRelayPredicateArg` | type | `FakeRelayPredicate \| ((event: CapturedBroadcast) => boolean)`. |

| Membre de `FakeRelay` | Signature | Description |
|---|---|---|
| `broadcast` | `broadcast(channel: string, data: unknown): number` | |
| `broadcastExcept` | `broadcastExcept(channel: string, data: unknown, senderUid: string \| string[]): number` | |
| `getSent` | `getSent(): CapturedBroadcast[]` | Une copie de toutes les diffusions enregistrées. |
| `reset` | `reset(): void` | |
| `assertSent` | `assertSent(channel: string, predicate?: FakeRelayPredicateArg): void` | Lève une erreur quand aucune diffusion sur `channel` ne correspond. |
| `assertNotSent` | `assertNotSent(channel: string, predicate?: FakeRelayPredicateArg): void` | Lève une erreur quand l'une correspond. |

## Configuration

`config/relay.ts` exporte `defineConfig({ … })`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `allowUnauthorizedChannels` | `boolean` | `false` | Servir les canaux qu'aucun `authorize()` ne couvre. Désactivé, ils refusent les abonnés. |
| `maxClients` | `number` | `10000` | Clients SSE par instance. |
| `maxClientsPerOwner` | `number \| false` | `20` | Clients SSE par utilisateur, ou par adresse client pour un anonyme. Derrière un proxy, configurez les proxys de confiance. |
| `maxChannelsPerClient` | `number` | `100` | Canaux qu'une connexion peut tenir. |
| `transport` | `RelayTransportSource \| { driver: RelayTransportSource; channel?: string } \| null` | aucun | Le bus entre instances. Sans lui, une diffusion n'atteint que les clients de l'instance qui l'a faite. |
| `transportChannel` | `string` | `'relay::broadcast'` | Canal du bus, quand `transport` est donné comme driver nu ; `transport.channel` l'emporte. |
| `pingInterval` | `number \| string \| false` | `false` | Trames de maintien, en millisecondes ou en durée (`'30s'`). Le stub de configure écrit `30_000`. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `Relay` (classe), `'relay'` | Le `Relay` de l'application, construit depuis `config/relay.ts`. |

`'relay'` est déclaré sur `ContainerBindings`. Le provider installe le monteur de routes dans `boot()` et rejoint le bus dans `ready()` ; un échec fait échouer le démarrage.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_RELAY_BAD_REQUEST`](/fr/reference/errors#e-relay-bad-request) | `subscribe` sans `uid` ni `channel` utilisables, ou avec un nom de canal refusé. |
| [`E_RELAY_CHANNEL_TOO_LONG`](/fr/reference/errors#e-relay-channel-too-long) | Le nom du canal dépasse 256 caractères. |
| [`E_RELAY_NOT_CONNECTED`](/fr/reference/errors#e-relay-not-connected) | Aucune connexion n'a cet uid ici et aucun bus n'atteint celle qui le tient. |
| [`E_RELAY_BUS_UNAVAILABLE`](/fr/reference/errors#e-relay-bus-unavailable) | L'abonnement devait passer par le bus, et le bus l'a refusé. |
| [`E_RELAY_NOT_OWNER`](/fr/reference/errors#e-relay-not-owner) | La connexion a été ouverte par un autre utilisateur. |
| [`E_RELAY_CHANNEL_NO_AUTHORIZER`](/fr/reference/errors#e-relay-channel-no-authorizer) | Aucun `authorize()` ne couvre le canal. |
| [`E_RELAY_CHANNEL_FORBIDDEN`](/fr/reference/errors#e-relay-channel-forbidden) | L'autorisation du canal a refusé, ou a levé une erreur. |
| [`E_RELAY_MAX_CHANNELS`](/fr/reference/errors#e-relay-max-channels) | La connexion tient déjà `maxChannelsPerClient` canaux. |
| [`E_RELAY_MAX_CLIENTS`](/fr/reference/errors#e-relay-max-clients) | L'instance tient déjà `maxClients` connexions. |
| [`E_RELAY_MAX_CLIENTS_PER_OWNER`](/fr/reference/errors#e-relay-max-clients-per-owner) | Ce propriétaire tient déjà `maxClientsPerOwner` connexions. |
| [`E_RELAY_UNKNOWN_CONNECTION`](/fr/reference/errors#e-relay-unknown-connection) | Une requête de hub sans jeton de connexion valide. |
| [`E_RELAY_MAX_CONNECTIONS`](/fr/reference/errors#e-relay-max-connections) | Un hub a `maxConnections` flux ouverts. |
| [`E_RELAY_MAX_CONNECTIONS_PER_OWNER`](/fr/reference/errors#e-relay-max-connections-per-owner) | Ce client a `maxConnectionsPerOwner` flux de hub ouverts. |
| [`E_RELAY_MAX_PENDING`](/fr/reference/errors#e-relay-max-pending) | Trop de connexions de hub négociées et pas encore ouvertes ; `SignalRAdapter.negotiate()` la lève. |
| [`E_RELAY_SHUT_DOWN`](/fr/reference/errors#e-relay-shut-down) | relay est en cours d'arrêt. |
| [`E_RELAY_UNAUTHORIZED`](/fr/reference/errors#e-relay-unauthorized) | Une invocation de hub demande un utilisateur authentifié, ou par un autre guard. |
| [`E_RELAY_FORBIDDEN`](/fr/reference/errors#e-relay-forbidden) | Il manque à une invocation de hub le rôle ou la permission requis. |
| [`E_RELAY_UNKNOWN_EVENT`](/fr/reference/errors#e-relay-unknown-event) | Une invocation de hub ne nomme aucun handler. |
| [`E_RELAY_HANDLER_ERROR`](/fr/reference/errors#e-relay-handler-error) | Un handler de hub a levé une erreur. |
| [`E_RELAY_INVALID_CHANNEL_PATTERN`](/fr/reference/errors#e-relay-invalid-channel-pattern) | `authorize()` a reçu un motif de canal qui ne pourrait jamais correspondre. |
| [`E_RELAY_INVALID_PING_INTERVAL`](/fr/reference/errors#e-relay-invalid-ping-interval) | `pingInterval` n'est ni des millisecondes ni une durée comme `'30s'`. |
| [`E_RELAY_HUB_PATH_TAKEN`](/fr/reference/errors#e-relay-hub-path-taken) | `relay.hub()` nomme un chemin où un hub est déjà monté. |
| [`E_RELAY_HUB_ALREADY_MOUNTED`](/fr/reference/errors#e-relay-hub-already-mounted) | Une même instance de hub est montée une seconde fois ; donnez à chaque montage sa propre instance. |
| [`E_RELAY_DUPLICATE_HANDLER`](/fr/reference/errors#e-relay-duplicate-handler) | Deux handlers d'un hub ne diffèrent que par la casse, et répondent donc à la même invocation. |
| [`E_RELAY_INVALID_HUB`](/fr/reference/errors#e-relay-invalid-hub) | L'objet monté par `relay.hub()` n'étend pas `Hub`. |
| [`E_RELAY_INVALID_ADAPTER`](/fr/reference/errors#e-relay-invalid-adapter) | L'adaptateur passé à `relay.hub()` n'est pas un `SignalRAdapter`. |
| [`E_RELAY_TRANSPORT_NOT_STARTED`](/fr/reference/errors#e-relay-transport-not-started) | `whenTransportReady()` a été appelée avant `startTransport()`. |
| [`E_RELAY_TRANSPORT_SUPERSEDED`](/fr/reference/errors#e-relay-transport-superseded) | Un `startTransport()` a été devancé par un arrêt ou un démarrage plus récent avant de s'abonner. |
| [`E_RELAY_TRANSPORT_UNRELEASED`](/fr/reference/errors#e-relay-transport-unreleased) | `startTransport()` n'a pas pu libérer l'abonnement précédent au bus, et refuse donc de s'abonner à nouveau ; `cause` porte l'erreur du bus. |
| [`E_RELAY_QUASAR_MISSING`](/fr/reference/errors#e-relay-quasar-missing) | Un bus Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son provider n'a pas démarré. |
| [`E_RELAY_REDIS_INCOMPLETE`](/fr/reference/errors#e-relay-redis-incomplete) | La connexion quasar n'offre pas une commande qu'émet le bus. |
| [`E_RELAY_SUBSCRIBE_FAILED`](/fr/reference/errors#e-relay-subscribe-failed) | Le `subscribe` du client du bus a échoué avec autre chose qu'une `Error` ; `cause` porte ce qu'il a levé. |
| [`E_RELAY_ASSERTION_FAILED`](/fr/reference/errors#e-relay-assertion-failed) | `FakeRelay.assertSent()` ou `assertNotSent()` n'est pas vérifiée. |
| [`E_RELAY_INTERNAL`](/fr/reference/errors#e-relay-internal) | Un invariant de relay a cédé. Un bug : signalez-le. |

## Migration

- `RelayError` et `RelayTypeError` disparaissent : testez `error.code`, ou `error instanceof errors.E_RELAY_*` avec `import { errors } from '@c9up/relay'`. `E_RELAY_INVALID_HUB` et `E_RELAY_INVALID_ADAPTER` ne sont plus des `TypeError`.

## Voir aussi

- [Diffusion](/fr/guides/realtime/broadcasting)
- [Hubs](/fr/guides/realtime/hubs)
- [WebSockets](/fr/guides/realtime/websockets)
