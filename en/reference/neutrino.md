# neutrino

`@c9up/neutrino`: Protocol Buffers and unary gRPC, so that non-JS clients share one `.proto` contract with the server; gRPC calls are served on the application's HTTP port. Guide: [Protobuf and gRPC](/en/guides/digging-deeper/grpc).

## Installation

```bash
pnpm add @c9up/neutrino
```

Register the provider in `reamrc.ts` (`providers: [() => import('@c9up/neutrino/provider')]`) and write `config/protobuf.ts` yourself: the package has no configure hook. Messages are `@bufbuild/protobuf` messages; typed messages and services come from `protoc-gen-es` (`pnpm add -D @bufbuild/buf @bufbuild/protoc-gen-es`).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/neutrino` | `Protobuf`, `GrpcServices`, the interceptors, `defineConfig`, the errors and the types. |
| `@c9up/neutrino/provider` | `NeutrinoProvider` (default export): loads the schemas at boot and serves gRPC on the HTTP port. |
| `@c9up/neutrino/services/main` | The booted `Protobuf` (default export), plus `setProtobuf`, `getProtobuf`, `clearProtobuf`. |
| `@c9up/neutrino/services/grpc` | The booted `GrpcServices` (default export), plus `setGrpc`, `getGrpc`, `clearGrpc`. |

The two service modules resolve the instance on first member access; reading one before the provider has booted throws.

## Exports

### `@c9up/neutrino`

| Export | Kind | Description |
|---|---|---|
| `Protobuf` | class | The loaded schemas and their codec. |
| `GrpcServices` | class | The gRPC services served, and the dispatcher handed to the server. |
| `GrpcMetadata` | class | A call's metadata, `-bin` values decoded. |
| `GrpcError` | error | Thrown by a method or an interceptor to answer a gRPC status; its message goes to the client. |
| `GrpcStatus` | const | The gRPC status codes, `OK: 0` to `UNAUTHENTICATED: 16`. |
| `GrpcContextKey` | class | A value an interceptor sets on a call for the method to read. |
| `bearerAuth` | function | Interceptor that requires `authorization: Bearer <token>`. |
| `rateLimit` | function | Interceptor that answers `RESOURCE_EXHAUSTED` over the limit. |
| `defineConfig` | function | `defineConfig(config: ProtobufConfig): ProtobufConfig`. Throws when no schema is given. |
| `NeutrinoError` | error | Base class: `readonly code: string`. |
| `InvalidDescriptorError` | error | `E_NEUTRINO_INVALID_DESCRIPTOR`. |
| `DuplicateTypeError` | error | `E_NEUTRINO_DUPLICATE_TYPE`. |
| `UnknownTypeError` | error | `E_NEUTRINO_UNKNOWN_TYPE`. |
| `UnknownMethodError` | error | `E_NEUTRINO_UNKNOWN_METHOD`. |
| `InvalidMessageError` | error | `E_NEUTRINO_INVALID_MESSAGE`. |
| `InvalidMetadataError` | error | `E_NEUTRINO_INVALID_METADATA`, with `readonly key: string`. |
| `ProtobufConfig` | interface | The shape of `config/protobuf.ts`. |
| `GrpcConfig` | type | The `GrpcServicesOptions` a config can set: `keepUnknownFields`, `maxReceiveMessageLength`, `maxSendMessageLength`, `maxInFlightRequestBytes`. |
| `ProtobufSources` | interface | `{ descriptorSets?: readonly Uint8Array[]; files?: readonly DescFile[] }`. |
| `DecodeOptions` | interface | `{ readUnknownFields?: boolean }`, `true` by default. |
| `GrpcServicesOptions` | interface | See [`GrpcServices`](#grpcservices). |
| `ServiceImpl` | type | One function per method, keyed by the method's local name (`say` for `rpc Say`); typed from a generated service. |
| `ServiceOptions` | interface | `{ interceptors?: readonly GrpcInterceptor[] }`. |
| `UntypedMethod` | type | `(request: Message, context: GrpcContext) => Promise<Record<string, unknown>> \| Record<string, unknown>`: a method of a service loaded from a descriptor set. |
| `GrpcInterceptor` | type | `(context: GrpcContext, next: () => Promise<unknown>) => Promise<unknown>`. |
| `GrpcContext` | interface | What a method receives beside the request. |
| `GrpcCall` | interface | One call as the server hands it over: `{ path: string; metadata: Readonly<Record<string, string \| readonly string[]>>; message: Uint8Array; ip: string; signal?: AbortSignal }`. |
| `GrpcReply` | type | `{ message: Uint8Array } \| { code: number; details: string }`. |
| `GrpcStatusCode` | type | A value of `GrpcStatus`. |
| `MetadataValue` | type | `string \| Uint8Array`. |
| `BearerAuth` | interface | What `bearerAuth` returns. |
| `TokenVerifier` | interface | What `bearerAuth` takes; warden's auth manager fits. |
| `CallLimiter` | interface | What `rateLimit` takes; blackhole with a `rateLimit.store` fits. |

### `Protobuf`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Protobuf(sources: ProtobufSources)` | Two sources that declare one type differently throw `DuplicateTypeError`; the same file twice is accepted. |
| `message` | `message(typeName: string): DescMessage` | A message schema by full name (`package.Message`). |
| `service` | `service(typeName: string): DescService` | A service by full name. |
| `method` | `method(path: string): DescMethod` | The method a gRPC path names (`/package.Service/Method`). |
| `decode` | `decode<Desc extends DescMessage>(schema: Desc, bytes: Uint8Array, options?: DecodeOptions): MessageShape<Desc>` | Throws `InvalidMessageError` on bytes that do not decode (truncated, malformed, invalid UTF-8, nested too deep). |
| `encode` | `encode<Desc extends DescMessage>(schema: Desc, message: MessageShape<Desc>): Uint8Array` | |

### `GrpcServices`

| Member | Signature | Description |
|---|---|---|
| constructor | `new GrpcServices(protobuf: Protobuf, options?: GrpcServicesOptions)` | |
| `use` | `use(interceptor: GrpcInterceptor): this` | Runs around every call, in the order added, before the request is decoded. |
| `service` | `service<S extends DescService>(service: S, impl: ServiceImpl<S>, options?: ServiceOptions): this` | Serves a service. A method left out answers `UNIMPLEMENTED`. Refuses a key that is not a method of the service, a non-function implementation, a streaming method and a service registered twice. |
| `handle` | `readonly handle: (call: GrpcCall) => Promise<GrpcReply>` | Serves one call; the function the provider hands to the server. |

A `GrpcError` is answered with its status and message. Any other error is answered `INTERNAL` without its message and passed to `onError`.

| `GrpcServicesOptions` | Type | Default | Description |
|---|---|---|---|
| `onError` | `(error: unknown, call: { path: string }) => void` | `console.error` | Told about every error that is not a `GrpcError`. |
| `keepUnknownFields` | `boolean` | `false` | Keep the request fields the schema does not know. |
| `maxReceiveMessageLength` | `number` | `4194304` (4 MiB) | Largest request, in bytes; `-1` for no limit. A larger one is answered `RESOURCE_EXHAUSTED` before any interceptor. |
| `maxSendMessageLength` | `number` | `-1` | Largest reply, in bytes; `-1` for no limit. |
| `maxInFlightRequestBytes` | `number` | `8388608` (8 MiB) | Request bytes decoded and held at once, over every call still running; `-1` for no limit. A call is always admitted when nothing else is in flight. |

### `GrpcContext`

| Member | Signature | Description |
|---|---|---|
| `metadata` | `readonly metadata: GrpcMetadata` | Request metadata, without the transport's headers (`content-type`, `te`, `grpc-timeout`, `grpc-encoding`, `grpc-accept-encoding`, `accept-encoding`). |
| `ip` | `readonly ip: string` | Resolved client IP. |
| `method` | `readonly method: DescMethod` | The method called. |
| `deadline` | `readonly deadline: number` | Epoch milliseconds from the client's `grpc-timeout`; `Infinity` without one. Past it the call is answered `DEADLINE_EXCEEDED`. |
| `signal` | `readonly signal: AbortSignal` | Aborted when the call is answered without the method (deadline passed, client cancelled). Pass it on to what the method waits for. |

### `GrpcMetadata`

| Member | Signature | Description |
|---|---|---|
| constructor | `new GrpcMetadata(headers?: Readonly<Record<string, string \| readonly string[]>>)` | Throws `InvalidMetadataError` on a `-bin` value that is not base64. |
| `get` | `get(key: string): MetadataValue[]` | Every value of the key, in order; `[]` when absent. |
| `getMap` | `getMap(): Record<string, MetadataValue>` | The first value of each key. |

### `GrpcContextKey`

| Member | Signature | Description |
|---|---|---|
| constructor | `new GrpcContextKey<T>(fallback: T)` | |
| `get` | `get(context: GrpcContext): T` | The value set on this call, or `fallback`. |
| `set` | `set(context: GrpcContext, value: T): void` | |

### Interceptors

| Function | Signature | Description |
|---|---|---|
| `bearerAuth` | `bearerAuth<User>(verifier: TokenVerifier<User>, options?: { guard?: string }): BearerAuth<User>` | `interceptor` answers `UNAUTHENTICATED` without a valid bearer token, or with two `authorization` values. `user(context)` returns the user, and throws `UNAUTHENTICATED` on a call the interceptor did not run for. |
| `rateLimit` | `rateLimit(limiter: CallLimiter, options?: { keyFor?: (context: GrpcContext) => string }): GrpcInterceptor` | The key is the client IP by default, the key blackhole counts HTTP requests under. |

```ts
interface TokenVerifier<User> {
  verify(token: string, guard?: string): Promise<{ authenticated: boolean; user?: User; strategyCrash?: boolean }>
}
interface CallLimiter {
  checkRateLimit(key: string): Promise<{ allowed: boolean; resetSeconds: number }>
}
```

## Configuration

`config/protobuf.ts` exports `defineConfig({ … })`. The schemas load at boot: a missing file or a conflict stops the start.

| Option | Type | Default | Description |
|---|---|---|---|
| `descriptorSets` | `readonly string[]` | `[]` | Paths of binary `FileDescriptorSet`s (`buf build -o app.binpb`). |
| `files` | `readonly DescFile[]` | `[]` | File descriptors generated by `protoc-gen-es` (its `file_*` exports). |
| `grpc` | `GrpcConfig` | `{}` | `keepUnknownFields`, `maxReceiveMessageLength`, `maxSendMessageLength`, `maxInFlightRequestBytes`, with the defaults of [`GrpcServicesOptions`](#grpcservices). |

At least one of `descriptorSets` and `files` must name a schema. The message limits are also handed to the server, which refuses a larger message before reading it.

## Container bindings

| Token | Resolves to |
|---|---|
| `Protobuf` (class), `'neutrino.protobuf'`, `'protobuf'` | The `Protobuf` over the configured schemas. |
| `GrpcServices` (class), `'neutrino.grpc'`, `'grpc'` | The `GrpcServices`, with the `grpc` config. |

The string tokens are declared on `ContainerBindings`. At boot the provider hands `grpc.handle` to the `server` binding's `grpc()` method; without a `server` binding, nothing is served.

## Errors

| Code | Raised when |
|---|---|
| [`E_NEUTRINO_INVALID_DESCRIPTOR`](/en/reference/errors#e-neutrino-invalid-descriptor) | The bytes are not a valid `FileDescriptorSet`. |
| [`E_NEUTRINO_DUPLICATE_TYPE`](/en/reference/errors#e-neutrino-duplicate-type) | Two sources declare the same type differently. |
| [`E_NEUTRINO_UNKNOWN_TYPE`](/en/reference/errors#e-neutrino-unknown-type) | No message or service of this name is loaded. |
| [`E_NEUTRINO_UNKNOWN_METHOD`](/en/reference/errors#e-neutrino-unknown-method) | No method of this path is loaded, or an implementation names a method the service does not have. |
| [`E_NEUTRINO_INVALID_MESSAGE`](/en/reference/errors#e-neutrino-invalid-message) | The bytes are not a valid message of the type. |
| [`E_NEUTRINO_INVALID_METADATA`](/en/reference/errors#e-neutrino-invalid-metadata) | A `-bin` metadata value is not base64; the call is answered `INTERNAL`. |
| [`E_NEUTRINO_GRPC_STATUS`](/en/reference/errors#e-neutrino-grpc-status) | A `GrpcError`: a method answers a status instead of a reply. |
| [`E_NEUTRINO_DUPLICATE_SERVICE`](/en/reference/errors#e-neutrino-duplicate-service) | A service is registered twice. |
| [`E_NEUTRINO_INVALID_IMPLEMENTATION`](/en/reference/errors#e-neutrino-invalid-implementation) | A method implementation is not a function. |
| [`E_NEUTRINO_STREAMING_UNSUPPORTED`](/en/reference/errors#e-neutrino-streaming-unsupported) | A streaming method was implemented; only unary methods are served. |
| [`E_NEUTRINO_INVALID_OPTION`](/en/reference/errors#e-neutrino-invalid-option) | A size option is not a whole number of bytes, or `-1`. |
| [`E_NEUTRINO_GRPC_UNSUPPORTED`](/en/reference/errors#e-neutrino-grpc-unsupported) | The server has no `grpc()` method. Upgrade `@c9up/ream`. |

## See also

- [Protobuf and gRPC](/en/guides/digging-deeper/grpc)
- [JSON-RPC clients](/en/guides/apis/json-rpc-clients)
