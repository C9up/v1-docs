# relay

`@c9up/relay`: realtime messages to the browser: channels broadcast over Server-Sent Events, and hubs a stock SignalR client speaks to over WebSockets or SSE. Guides: [Broadcasting](/en/guides/realtime/broadcasting), [Hubs](/en/guides/realtime/hubs).

## Installation

```bash
pnpm add @c9up/relay
ream configure @c9up/relay
```

`ream configure @c9up/relay` registers the provider and writes `config/relay.ts`. A Redis bus by connection name needs `@c9up/quasar`, an optional peer dependency. The subscribe routes read a JSON body: keep ream's body parser in the router middleware.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/relay` | `Relay`, `Hub`, `SignalRAdapter`, `RedisRelayTransport`, `transports`, `defineConfig`, `registerHubRoutes` and the types. Also re-exports `RelayProvider`. |
| `@c9up/relay/provider` | `RelayProvider` (default export). |
| `@c9up/relay/configure` | `configure(codemods)`, run by `ream configure @c9up/relay`. |
| `@c9up/relay/services/main` | The application's `Relay` (default export), plus `setRelay`, `getRelay`, `clearRelay`. Before the provider binds one, it builds a default `Relay`; what was registered on it moves to the provider's. |
| `@c9up/relay/testing` | `FakeRelay`, which records broadcasts for assertions. |

## Exports

### `@c9up/relay`

| Export | Kind | Description |
|---|---|---|
| `Relay` | class | Channels, authorizers, broadcasts, hub mounting. |
| `Hub` | class | Abstract base of a hub: methods named `on<Event>` handle the client's invocations. |
| `SignalRAdapter` | class | The SignalR JSON protocol for one hub: negotiate, handshake, frames. |
| `RedisRelayTransport` | class | Redis pub/sub as the bus between instances. |
| `transports` | const | `transports.redis(options)`, the bus factory a config names. |
| `defineConfig` | function | `defineConfig<T extends RelayConfig>(config: T): T`. Returns the config unchanged. |
| `registerHubRoutes` | function | Mounts one hub's routes on a router; what `relay.hub()` calls through the provider. |
| `splitFrames` | function | `splitFrames(body: string): string[]`: splits a POST body on the SignalR record separator. |
| `PING_CHANNEL` | const | `'$$relay/ping'`, the event name of keep-alive frames. |
| `RelayProvider` | provider | Same as `@c9up/relay/provider`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `RelayConfig` | interface | See [Configuration](#configuration). |
| `RelayContext` | interface | What an authorizer receives: `auth?`, `session?`, `request?`, `bouncer?`. |
| `RelayAuth` | interface | `{ isAuthenticated: boolean; user?: { id: string; [key: string]: unknown }; roles?: string[]; permissions?: string[] }`. |
| `ChannelAuthorizer` | type | `(ctx: RelayContext, params: TParams) => Promise<boolean> \| boolean`. |
| `RelayTransport` | interface | A bus: `publish(channel, message)`, `subscribe(channel, handler)`, optional `unsubscribe(channel, handler?)` and `disconnect()`. |
| `RelayTransportFactory` | type | `() => RelayTransport`. |
| `RelayPubSubClient` | interface | The pub/sub commands `RedisRelayTransport` issues: `publish`, `subscribe`, `unsubscribe`, optional `quit`. |
| `RelayPubSubResolver` | type | `RelayPubSubClient \| (() => RelayPubSubClient \| Promise<RelayPubSubClient>)`. |
| `RelayLifecycleEvents` | interface | Payloads of `connect`, `disconnect`, `subscribe`, `unsubscribe`, `broadcast`. |
| `RelayRouteBuilder` | interface | The route object a customizer receives: `middleware`, `use`, `guard`, `role`, `permission`. |
| `RelayRouteCustomizer` | type | `(route: RelayRouteBuilder) => void`. |
| `RelaySseStream` | interface | An SSE stream as the relay writes to it: `id`, `isOpen()`, `send(event, data, eventId?)`, `onClose(cb)`, `end()`. |
| `SubscribeResult` | type | `SubscribeSuccess \| SubscribeFailure`. |
| `SubscribeSuccess` | interface | `{ ok: true }`. |
| `SubscribeFailure` | interface | `{ ok: false; status: number; code: string }`. |
| `HubContext` | interface | What a hub handler receives. |
| `HubAuth` | interface | The request's auth as a hub reads it: `{ isAuthenticated: boolean; strategy?: string; user?: Record<string, unknown>; roles?: string[]; permissions?: string[]; hasAllPermissions?(permissions: readonly string[]): Promise<boolean> }`. |
| `HubDenial` | interface | A refusal by a hub's guards: `{ status: 401 \| 403; code: 'E_RELAY_UNAUTHORIZED' \| 'E_RELAY_FORBIDDEN'; message: string }`. |
| `HubGuardOptions` | interface | `{ guard?: string; guards?: string[]; roles?: string[]; permissions?: string[] }`. |
| `ConnectedHubClient` | interface | A connection as a transport registers it: `{ id: string; groups: Set<string>; auth: HubAuth; send(event: string, data: unknown): void; close?(): void }`. `close` ends the stream or socket; `disconnect()` calls it. |
| `DispatchResult` | type | `{ ok: true; result: unknown } \| { ok: false; denial?: HubDenial }`: what `dispatch()` and `dispatchAs()` resolve to. `denial` is set when the guards refused. |
| `NegotiateResponse` | interface | `{ connectionId; connectionToken; negotiateVersion; availableTransports }`. |
| `SignalRMessageType` | type | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7`. |
| `MountedHub` | interface | `{ path: string; hub: Hub; adapter: SignalRAdapter }`. |
| `HubRouter` | interface | The router `registerHubRoutes` needs: `get`, `post`, optional `ws`. |
| `HubRouteOptions` | interface | `{ webSockets?: () => boolean }`: whether the server accepts WebSockets now; absent, SSE only. |
| `HubHttpContext` | interface | The request context the hub routes read. |
| `HubSocket` | interface | The WebSocket a hub writes to; matches ream's `ServerWebSocket`. |
| `HubSseStream` | interface | The SSE stream a hub writes to. |

### `Relay`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Relay(config?: RelayConfig)` | |
| `authorize` | `authorize<TParams extends Record<string, string> = Record<string, string>>(pattern: string, callback: ChannelAuthorizer<TParams>): void` | Who may subscribe to channels matching `pattern`: static segments, `:param`, `:param.suffix`, a trailing optional `:param?`, a trailing `*`. An exact registration wins; patterns are tried in order. |
| `registerRoutes` | `registerRoutes(customizer?: RelayRouteCustomizer): void` | Mounts `GET /__relay/events`, `POST /__relay/subscribe` and `POST /__relay/unsubscribe`, with `customizer` applied to each, and to the routes of every hub mounted afterwards (`route.guard('web')` to require an authenticated request, or `route.middleware(...)`). It does not replace a hub's `useGuards()`. The endpoints do not exist until it is called; call it from a preload. |
| `hub` | `hub(path: string, hub: Hub, adapter?: SignalRAdapter): void` | Takes a `Hub` and, optionally, a `SignalRAdapter` built over it. A JavaScript caller that passes something else gets `E_RELAY_INVALID_HUB` or `E_RELAY_INVALID_ADAPTER` when the hub is mounted. Mounts a hub: `POST <path>/negotiate`, `GET <path>` (SSE), `POST <path>` and, when the server supports it, a WebSocket route on `<path>`. Mounting a path twice throws. |
| `broadcast` | `broadcast(channel: string, payload: unknown): number` | Sends to every subscriber of `channel`; mirrored on the bus when there is one. Returns the local clients reached. |
| `broadcastExcept` | `broadcastExcept(channel: string, payload: unknown, senderUid: string \| string[]): number` | Same, skipping the given connection ids on every instance. |
| `on` | `on<E extends keyof RelayLifecycleEvents>(event: E, listener: (evt: RelayLifecycleEvents[E]) => void): () => void` | Lifecycle listener; returns its detacher. |
| `connect` | `connect(sse: RelaySseStream, ctx: RelayContext): { outcome: 'ok'; uid: string } \| { outcome: 'capped' } \| { outcome: 'owner-capped' } \| { outcome: 'closed' }` | Registers an opened stream and issues its uid. Called by the events route. |
| `subscribe` | `subscribe(uid: unknown, channel: unknown, ctx: RelayContext): Promise<SubscribeResult>` | Called by the subscribe route. |
| `unsubscribe` | `unsubscribe(uid: unknown, channel: unknown, ctx: RelayContext): Promise<'ok' \| 'forbidden'>` | Called by the unsubscribe route. |
| `clientCount` | `clientCount(): number` | SSE clients on this instance. |
| `channelSubscribers` | `channelSubscribers(channel: string): number` | Subscribers of `channel` on this instance. |
| `getSubscribersFor` | `getSubscribersFor(channel: string): string[]` | Their uids. |
| `startTransport` | `startTransport(): Promise<void>` | Joins the bus and starts the keep-alive; idempotent. The provider calls it in `ready()`. |
| `whenTransportReady` | `whenTransportReady(): Promise<void>` | Resolves once this instance listens to the bus; rejects if it never did. |
| `shutdown` | `shutdown(): Promise<void>` | Stops the keep-alive, ends every stream (hubs included) and leaves the bus. |

The connection uid is issued by the server and sent to the client in the first `connected` frame; a subscribe must come from the user (and session) that opened the stream. A channel name is the SSE event name of its frames: control characters, `connected`, `error` and `$$relay/ping` are refused, and so is a name over 256 characters.

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

Extend it and write handlers as methods named `on<Event>`: `onTaskUpdate` handles `taskUpdate`, matched case-insensitively. Inherited handlers count; nothing on `Hub` itself is reachable from the client.

| Member | Signature | Description |
|---|---|---|
| `useGuards` | `useGuards(options: HubGuardOptions): void` | What it takes to connect to the hub. Asked at negotiate, at the stream, at the WebSocket handshake and on every invocation. `roles` is met by any of the names, `permissions` by all of them. |
| `authorize` | `authorize(auth: HubAuth): Promise<HubDenial \| null>` | Whether `auth` meets the guards: `null` when it does, always on a hub with none. The hub's routes call it. A `permissions` guard asks `auth.hasAllPermissions` when it is there, else reads `auth.permissions` or `auth.user.permissions`; an access token on `auth.user.currentAccessToken` must allow each permission too. An error of the auth layer propagates. |
| `disconnect` | `disconnect(clientId: string): boolean` | Ends a connection held by this instance: off the hub at once, then its stream or socket is closed. `false` when there is no such client. |
| `disconnectUser` | `disconnectUser(userId: string \| number \| bigint): number` | Ends every connection this instance holds for that user; returns how many. |
| `onConnect` | `onConnect(ctx: HubContext): Promise<void>` | Override to react to a connection. |
| `onDisconnect` | `onDisconnect(clientId: string): Promise<void>` | Override to react to a disconnection. |
| `dispatch` | `dispatch(clientId: string, event: string, ...args: unknown[]): Promise<DispatchResult>` | Runs a handler against the connection's auth. `{ ok: true, result }` or `{ ok: false }`. When the guards refuse, the result carries `denial` and the client is taken off the hub: the transport closes the connection. |
| `dispatchAs` | `dispatchAs(clientId: string, auth: HubContext['auth'], event: string, args: readonly unknown[]): Promise<DispatchResult>` | Runs a handler against the auth of the request carrying the invocation. |
| `registerClient` | `registerClient(client: ConnectedHubClient): HubContext` | Registers a connection; the transport calls it, after `authorize()`. It does not ask the guards itself. |
| `removeClient` | `removeClient(clientId: string): void` | |
| `authFor` | `authFor(clientId: string): HubContext['auth'] \| undefined` | The auth recorded at connection. |
| `stats` | `stats(): { clients: number; groups: number }` | Clients and groups on this instance. |

| `HubContext` member | Signature | Description |
|---|---|---|
| `clientId` | `readonly clientId: string` | |
| `auth` | `readonly auth: HubAuth` | The invoking request's auth; the connection's in `onConnect`. |
| `joinGroup` / `leaveGroup` | `joinGroup(group: string): void` | |
| `send` | `send(event: string, data: unknown): void` | To this client. |
| `group` | `group(name: string): { send(event: string, data: unknown): void }` | To a group, on every instance. |
| `broadcast` | `broadcast(event: string, data: unknown): void` | To every client of the hub, on every instance. |
| `disconnect` | `disconnect(): void` | Ends this connection. |

A hub's guards are asked when a client connects and on each of its invocations, not while it only listens: end the connection of a user who logs out or loses a role with `disconnectUser()`. A connection opened with an access token is closed when `user.currentAccessToken.expiresAt` passes.

A hub connection lives on the instance that negotiated it: route a client's hub requests to one instance (sticky sessions on the hub paths).

### `SignalRAdapter`

| Member | Signature | Description |
|---|---|---|
| constructor | `new SignalRAdapter(hub: Hub, options?)` | Options below. |
| `negotiate` | `negotiate(connectionId: string, transports?: readonly string[], owner?: string, negotiator?: string): NegotiateResponse` | Issues a connection token; `transports` defaults to `['ServerSentEvents']`. Throws when the pending table, or the owner's share, is full: check `admits(owner)` first. |
| `admits` | `admits(owner?: string): boolean` | Whether a negotiate from `owner` would be accepted. |
| `handleFrame` | `handleFrame(clientId: string, frame: string, auth?: HubContext['auth']): Promise<string[]>` | Processes an inbound frame; returns the frames to send back. The first frame must be the handshake, from a client the hub holds. Frames are parsed without `__proto__` keys. An invocation the guards refuse is answered with a Close frame. |
| `encodeInvocation` | `encodeInvocation(target: string, args: unknown[]): string` | A server-to-client invocation frame. |
| `encodeClose` | `encodeClose(error?: string): string` | A Close frame, sent before the server ends a connection. |
| `resolveToken` | `resolveToken(connectionToken: string): string \| undefined` | |
| `forget` | `forget(clientId: string): void` | |

| Option | Type | Default | Description |
|---|---|---|---|
| `maxFrameSize` | `number` | `65536` | Largest frame, in bytes. |
| `tokenTtlMs` | `number` | `30000` | How long a negotiated token stays valid unclaimed. |
| `maxPendingTokens` | `number` | `1024` | Unclaimed tokens waiting at once. |
| `maxPendingTokensPerOwner` | `number \| false` | `20` | Per user, or per client address when anonymous. |
| `handshakeTimeoutMs` | `number` | `15000` | Time an opened stream has to complete the handshake. |
| `maxConnections` | `number` | `10000` | Open streams; a new one past it gets 503. |
| `maxConnectionsPerOwner` | `number \| false` | `20` | Open streams per owner. |
| `maxQueuedMessages` | `number` | `256` | Messages one connection may have sent that the hub has not started. Past it a socket is closed with `1013` and an upstream POST gets 429. Every message counts, however many one WebSocket message or POST packs. |

### `transports` and `RedisRelayTransport`

```ts
transports.redis(options: { connection: RelayPubSubResolver | string; owned?: boolean }): RelayTransportFactory
new RedisRelayTransport(client: RelayPubSubResolver, ownsConnection?: boolean)
```

`connection` takes a client, a function answering one, or the name of a `@c9up/quasar` connection. `owned: true` closes the client at shutdown; a named quasar connection is never closed by relay.

### `@c9up/relay/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeRelay` | class | Records `broadcast` and `broadcastExcept` calls, the payload as JSON would carry it. Both return `0`. |
| `CapturedBroadcast` | interface | `{ channel: string; data: unknown; clients: number }`. |
| `FakeRelayPredicate` | interface | `{ dataMatches?: (data: unknown) => boolean }`. |
| `FakeRelayPredicateArg` | type | `FakeRelayPredicate \| ((event: CapturedBroadcast) => boolean)`. |

| `FakeRelay` member | Signature | Description |
|---|---|---|
| `broadcast` | `broadcast(channel: string, data: unknown): number` | |
| `broadcastExcept` | `broadcastExcept(channel: string, data: unknown, senderUid: string \| string[]): number` | |
| `getSent` | `getSent(): CapturedBroadcast[]` | A copy of every captured broadcast. |
| `reset` | `reset(): void` | |
| `assertSent` | `assertSent(channel: string, predicate?: FakeRelayPredicateArg): void` | Throws when no broadcast on `channel` matches. |
| `assertNotSent` | `assertNotSent(channel: string, predicate?: FakeRelayPredicateArg): void` | Throws when one does. |

## Configuration

`config/relay.ts` exports `defineConfig({ … })`.

| Option | Type | Default | Description |
|---|---|---|---|
| `allowUnauthorizedChannels` | `boolean` | `false` | Serve channels no `authorize()` covers. Off, they refuse subscribers. |
| `maxClients` | `number` | `10000` | SSE clients per instance. |
| `maxClientsPerOwner` | `number \| false` | `20` | SSE clients per user, or per client address when anonymous. Configure trusted proxies behind a proxy. |
| `maxChannelsPerClient` | `number` | `100` | Channels one connection may hold. |
| `transport` | `RelayTransportSource \| { driver: RelayTransportSource; channel?: string } \| null` | none | The bus between instances. Without one, a broadcast reaches the clients of the instance that made it only. |
| `transportChannel` | `string` | `'relay::broadcast'` | Bus channel, when `transport` is given as a bare driver; `transport.channel` wins. |
| `pingInterval` | `number \| string \| false` | `false` | Keep-alive frames, in milliseconds or a duration (`'30s'`). The configure stub writes `30_000`. |

## Container bindings

| Token | Resolves to |
|---|---|
| `Relay` (class), `'relay'` | The application's `Relay`, built from `config/relay.ts`. |

`'relay'` is declared on `ContainerBindings`. The provider installs the route mounter in `boot()` and joins the bus in `ready()`; a failure to join fails the start.

## Errors

| Code | Raised when |
|---|---|
| [`E_RELAY_BAD_REQUEST`](/en/reference/errors#e-relay-bad-request) | `subscribe` without a usable `uid` or `channel`, or with a refused channel name. |
| [`E_RELAY_CHANNEL_TOO_LONG`](/en/reference/errors#e-relay-channel-too-long) | The channel name exceeds 256 characters. |
| [`E_RELAY_NOT_CONNECTED`](/en/reference/errors#e-relay-not-connected) | No connection has this uid here and no bus can reach the one holding it. Also a hub POST for a connection that has no open stream. |
| [`E_RELAY_BUS_UNAVAILABLE`](/en/reference/errors#e-relay-bus-unavailable) | The subscription had to cross the bus, and the bus refused it. |
| [`E_RELAY_NOT_OWNER`](/en/reference/errors#e-relay-not-owner) | The connection was opened by another user. |
| [`E_RELAY_CHANNEL_NO_AUTHORIZER`](/en/reference/errors#e-relay-channel-no-authorizer) | No `authorize()` covers the channel. |
| [`E_RELAY_CHANNEL_FORBIDDEN`](/en/reference/errors#e-relay-channel-forbidden) | The channel's authorizer refused, or threw. |
| [`E_RELAY_MAX_CHANNELS`](/en/reference/errors#e-relay-max-channels) | The connection holds `maxChannelsPerClient` channels already. |
| [`E_RELAY_MAX_CLIENTS`](/en/reference/errors#e-relay-max-clients) | The instance holds `maxClients` connections already. |
| [`E_RELAY_MAX_CLIENTS_PER_OWNER`](/en/reference/errors#e-relay-max-clients-per-owner) | This owner holds `maxClientsPerOwner` connections already. |
| [`E_RELAY_UNKNOWN_CONNECTION`](/en/reference/errors#e-relay-unknown-connection) | A hub request with no valid connection token. |
| [`E_RELAY_MAX_CONNECTIONS`](/en/reference/errors#e-relay-max-connections) | A hub has `maxConnections` open streams. |
| [`E_RELAY_MAX_CONNECTIONS_PER_OWNER`](/en/reference/errors#e-relay-max-connections-per-owner) | This client has `maxConnectionsPerOwner` open hub streams. |
| [`E_RELAY_MAX_PENDING`](/en/reference/errors#e-relay-max-pending) | Too many hub connections are negotiated and not yet open; `SignalRAdapter.negotiate()` throws it. |
| [`E_RELAY_MAX_QUEUED`](/en/reference/errors#e-relay-max-queued) | A hub connection has `maxQueuedMessages` messages waiting already. |
| [`E_RELAY_SHUT_DOWN`](/en/reference/errors#e-relay-shut-down) | The relay is shutting down. |
| [`E_RELAY_UNAUTHORIZED`](/en/reference/errors#e-relay-unauthorized) | A guarded hub needs an authenticated user, or one from another guard: 401 at negotiate, at the stream and at the WebSocket handshake, an `error` event on an invocation. |
| [`E_RELAY_FORBIDDEN`](/en/reference/errors#e-relay-forbidden) | The user lacks the role or the permissions a hub's guards require: 403 when connecting, an `error` event on an invocation. |
| [`E_RELAY_UNKNOWN_EVENT`](/en/reference/errors#e-relay-unknown-event) | A hub invocation names no handler. |
| [`E_RELAY_HANDLER_ERROR`](/en/reference/errors#e-relay-handler-error) | A hub handler threw. |
| [`E_RELAY_INVALID_CHANNEL_PATTERN`](/en/reference/errors#e-relay-invalid-channel-pattern) | `authorize()` was given a channel pattern that could never match. |
| [`E_RELAY_INVALID_PING_INTERVAL`](/en/reference/errors#e-relay-invalid-ping-interval) | `pingInterval` is neither milliseconds nor a duration like `'30s'`. |
| [`E_RELAY_HUB_PATH_TAKEN`](/en/reference/errors#e-relay-hub-path-taken) | `relay.hub()` names a path where a hub is already mounted. |
| [`E_RELAY_HUB_ALREADY_MOUNTED`](/en/reference/errors#e-relay-hub-already-mounted) | One hub instance is mounted a second time; give each mount its own instance. |
| [`E_RELAY_DUPLICATE_HANDLER`](/en/reference/errors#e-relay-duplicate-handler) | Two handlers of a hub differ only by case, so they answer the same invocation. |
| [`E_RELAY_INVALID_HUB`](/en/reference/errors#e-relay-invalid-hub) | The object mounted with `relay.hub()` does not extend `Hub`. |
| [`E_RELAY_INVALID_ADAPTER`](/en/reference/errors#e-relay-invalid-adapter) | The adapter given to `relay.hub()` is not a `SignalRAdapter`. |
| [`E_RELAY_TRANSPORT_NOT_STARTED`](/en/reference/errors#e-relay-transport-not-started) | `whenTransportReady()` was called before `startTransport()`. |
| [`E_RELAY_TRANSPORT_SUPERSEDED`](/en/reference/errors#e-relay-transport-superseded) | A `startTransport()` was overtaken by a shutdown or a newer start before it subscribed. |
| [`E_RELAY_TRANSPORT_UNRELEASED`](/en/reference/errors#e-relay-transport-unreleased) | `startTransport()` could not release the previous bus subscription, so it refuses to subscribe again; `cause` is the bus's error. |
| [`E_RELAY_QUASAR_MISSING`](/en/reference/errors#e-relay-quasar-missing) | A Redis bus names a quasar connection and `@c9up/quasar` is not installed, or its provider has not booted. |
| [`E_RELAY_REDIS_INCOMPLETE`](/en/reference/errors#e-relay-redis-incomplete) | The quasar connection lacks a command the bus issues. |
| [`E_RELAY_SUBSCRIBE_FAILED`](/en/reference/errors#e-relay-subscribe-failed) | The bus client's subscribe failed with something other than an `Error`; `cause` holds what it threw. |
| [`E_RELAY_ASSERTION_FAILED`](/en/reference/errors#e-relay-assertion-failed) | `FakeRelay.assertSent()` or `assertNotSent()` does not hold. |
| [`E_RELAY_INTERNAL`](/en/reference/errors#e-relay-internal) | An invariant of relay broke. A bug: report it. |

## Migration

- `useGuards()` on a hub is now a requirement to connect, not only to invoke. A client the guards refuse gets `401` or `403` at `<path>/negotiate`, at the stream and at the WebSocket handshake; it used to connect, run `onConnect` and receive every broadcast. A hub that anyone may listen to and only some may call: remove `useGuards()` and check `ctx.auth` in the methods to protect.
- An invocation the guards refuse now closes the connection, after the `error` event and the error Completion. A role granted after the connection opened no longer starts working mid-connection: the client reconnects.
- A hub's `permissions` guard now asks `ctx.auth.hasAllPermissions()` when the auth layer has it (Warden's rights resolver) instead of reading the permission list of the user payload, and an access token must allow each permission too. Grant the permission in the rights store, and give the token the ability.
- The message of `E_RELAY_UNAUTHORIZED` for a wrong guard no longer lists the accepted guards. Test `code`, not the message.
- A hub connection opened with an access token is closed when the token expires. Have the client reconnect with a fresh token (`withAutomaticReconnect()`).
- A hub connection whose `onConnect` throws is closed. Over Server-Sent Events it used to stay open and receive broadcasts.
- A hub connection with more than `maxQueuedMessages` messages waiting (256) is closed with `1013`, or its POST refused with 429. Raise the option on the `SignalRAdapter` for a client that sends many invocations without awaiting them.
- A hub POST sent before its stream is open now answers `400 E_RELAY_NOT_CONNECTED`; it used to answer 200 and drop the replies. Open the stream first, as the SignalR client does.
- The invocations of one hub connection run one after another over Server-Sent Events too, in the order they arrive. Concurrent POSTs on one connection used to run in parallel.
- Hub invocation arguments no longer carry a `__proto__` key, nor a `constructor` object that has `prototype`.
- `Hub` has three new methods, `authorize`, `disconnect` and `disconnectUser`, and `HubContext` has `disconnect`. A hub subclass that declares a method with one of these names must rename it.
- `relay.hub()` takes a `Hub` and a `SignalRAdapter`, no longer any `object`. TypeScript now refuses an object that is not a `Hub` at the call site; until now it compiled and failed with `E_RELAY_INVALID_HUB` at mount time. Pass an instance of a class that extends `Hub`.
- `RelayError` and `RelayTypeError` are gone: test `error.code`, or `error instanceof errors.E_RELAY_*` with `import { errors } from '@c9up/relay'`. `E_RELAY_INVALID_HUB` and `E_RELAY_INVALID_ADAPTER` are no longer a `TypeError`.

## See also

- [Broadcasting](/en/guides/realtime/broadcasting)
- [Hubs](/en/guides/realtime/hubs)
- [WebSockets](/en/guides/realtime/websockets)
