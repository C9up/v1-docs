# neutrino

`@c9up/neutrino` : Protocol Buffers et gRPC unaire, pour que les clients non JS partagent un même contrat `.proto` avec le serveur ; les appels gRPC sont servis sur le port HTTP de l'application. Guide : [Protobuf et gRPC](/fr/guides/digging-deeper/grpc).

## Installation

```bash
pnpm add @c9up/neutrino
```

Enregistrez le provider dans `reamrc.ts` (`providers: [() => import('@c9up/neutrino/provider')]`) et écrivez `config/protobuf.ts` vous-même : le paquet n'a pas de hook configure. Les messages sont des messages `@bufbuild/protobuf` ; les messages et services typés viennent de `protoc-gen-es` (`pnpm add -D @bufbuild/buf @bufbuild/protoc-gen-es`).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/neutrino` | `Protobuf`, `GrpcServices`, les intercepteurs, `defineConfig`, les erreurs et les types. |
| `@c9up/neutrino/provider` | `NeutrinoProvider` (export par défaut) : charge les schémas au boot et sert gRPC sur le port HTTP. |
| `@c9up/neutrino/services/main` | Le `Protobuf` démarré (export par défaut), plus `setProtobuf`, `getProtobuf`, `clearProtobuf`. |
| `@c9up/neutrino/services/grpc` | Le `GrpcServices` démarré (export par défaut), plus `setGrpc`, `getGrpc`, `clearGrpc`. |

Les deux modules de service résolvent l'instance au premier accès à un membre ; en lire un avant le boot du provider lève une erreur.

## Exports

### `@c9up/neutrino`

| Export | Nature | Description |
|---|---|---|
| `Protobuf` | classe | Les schémas chargés et leur codec. |
| `GrpcServices` | classe | Les services gRPC servis, et le répartiteur remis au serveur. |
| `GrpcMetadata` | classe | Les métadonnées d'un appel, valeurs `-bin` décodées. |
| `GrpcError` | erreur | Levée par une méthode ou un intercepteur pour répondre un statut gRPC ; son message part au client. |
| `GrpcStatus` | const | Les codes de statut gRPC, de `OK: 0` à `UNAUTHENTICATED: 16`. |
| `GrpcContextKey` | classe | Une valeur qu'un intercepteur pose sur un appel pour que la méthode la lise. |
| `bearerAuth` | fonction | Intercepteur qui exige `authorization: Bearer <token>`. |
| `rateLimit` | fonction | Intercepteur qui répond `RESOURCE_EXHAUSTED` au-delà de la limite. |
| `defineConfig` | fonction | `defineConfig(config: ProtobufConfig): ProtobufConfig`. Lève une erreur quand aucun schéma n'est donné. |
| `NeutrinoError` | erreur | Classe de base : `readonly code: string`. |
| `InvalidDescriptorError` | erreur | `E_NEUTRINO_INVALID_DESCRIPTOR`. |
| `DuplicateTypeError` | erreur | `E_NEUTRINO_DUPLICATE_TYPE`. |
| `UnknownTypeError` | erreur | `E_NEUTRINO_UNKNOWN_TYPE`. |
| `UnknownMethodError` | erreur | `E_NEUTRINO_UNKNOWN_METHOD`. |
| `InvalidMessageError` | erreur | `E_NEUTRINO_INVALID_MESSAGE`. |
| `InvalidMetadataError` | erreur | `E_NEUTRINO_INVALID_METADATA`, avec `readonly key: string`. |
| `ProtobufConfig` | interface | La forme de `config/protobuf.ts`. |
| `GrpcConfig` | type | Les `GrpcServicesOptions` qu'une config peut fixer : `keepUnknownFields`, `maxReceiveMessageLength`, `maxSendMessageLength`, `maxInFlightRequestBytes`. |
| `ProtobufSources` | interface | `{ descriptorSets?: readonly Uint8Array[]; files?: readonly DescFile[] }`. |
| `DecodeOptions` | interface | `{ readUnknownFields?: boolean }`, `true` par défaut. |
| `GrpcServicesOptions` | interface | Voir [`GrpcServices`](#grpcservices). |
| `ServiceImpl` | type | Une fonction par méthode, indexée par le nom local de la méthode (`say` pour `rpc Say`) ; typée depuis un service généré. |
| `ServiceOptions` | interface | `{ interceptors?: readonly GrpcInterceptor[] }`. |
| `UntypedMethod` | type | `(request: Message, context: GrpcContext) => Promise<Record<string, unknown>> \| Record<string, unknown>` : une méthode d'un service chargé depuis un descriptor set. |
| `GrpcInterceptor` | type | `(context: GrpcContext, next: () => Promise<unknown>) => Promise<unknown>`. |
| `GrpcContext` | interface | Ce que reçoit une méthode à côté de la requête. |
| `GrpcCall` | interface | Un appel tel que le serveur le remet : `{ path: string; metadata: Readonly<Record<string, string \| readonly string[]>>; message: Uint8Array; ip: string; signal?: AbortSignal }`. |
| `GrpcReply` | type | `{ message: Uint8Array } \| { code: number; details: string }`. |
| `GrpcStatusCode` | type | Une valeur de `GrpcStatus`. |
| `MetadataValue` | type | `string \| Uint8Array`. |
| `BearerAuth` | interface | Ce que renvoie `bearerAuth`. |
| `TokenVerifier` | interface | Ce que prend `bearerAuth` ; le gestionnaire d'authentification de warden convient. |
| `CallLimiter` | interface | Ce que prend `rateLimit` ; blackhole avec un `rateLimit.store` convient. |

### `Protobuf`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Protobuf(sources: ProtobufSources)` | Deux sources qui déclarent un même type différemment lèvent `DuplicateTypeError` ; le même fichier deux fois est accepté. |
| `message` | `message(typeName: string): DescMessage` | Un schéma de message par nom complet (`package.Message`). |
| `service` | `service(typeName: string): DescService` | Un service par nom complet. |
| `method` | `method(path: string): DescMethod` | La méthode que désigne un chemin gRPC (`/package.Service/Method`). |
| `decode` | `decode<Desc extends DescMessage>(schema: Desc, bytes: Uint8Array, options?: DecodeOptions): MessageShape<Desc>` | Lève `InvalidMessageError` sur des octets qui ne se décodent pas (tronqués, malformés, UTF-8 invalide, imbrication trop profonde). |
| `encode` | `encode<Desc extends DescMessage>(schema: Desc, message: MessageShape<Desc>): Uint8Array` | |

### `GrpcServices`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new GrpcServices(protobuf: Protobuf, options?: GrpcServicesOptions)` | |
| `use` | `use(interceptor: GrpcInterceptor): this` | S'exécute autour de chaque appel, dans l'ordre d'ajout, avant le décodage de la requête. |
| `service` | `service<S extends DescService>(service: S, impl: ServiceImpl<S>, options?: ServiceOptions): this` | Sert un service. Une méthode omise répond `UNIMPLEMENTED`. Refuse une clé qui n'est pas une méthode du service, une implémentation qui n'est pas une fonction, une méthode en streaming et un service enregistré deux fois. |
| `handle` | `readonly handle: (call: GrpcCall) => Promise<GrpcReply>` | Sert un appel ; la fonction que le provider remet au serveur. |

Une `GrpcError` reçoit en réponse son statut et son message. Toute autre erreur reçoit `INTERNAL`, sans son message, et part à `onError`.

| `GrpcServicesOptions` | Type | Défaut | Description |
|---|---|---|---|
| `onError` | `(error: unknown, call: { path: string }) => void` | `console.error` | Informé de chaque erreur qui n'est pas une `GrpcError`. |
| `keepUnknownFields` | `boolean` | `false` | Garder les champs de la requête que le schéma ne connaît pas. |
| `maxReceiveMessageLength` | `number` | `4194304` (4 Mio) | Plus grande requête, en octets ; `-1` pour aucune limite. Une requête plus grande reçoit `RESOURCE_EXHAUSTED` avant tout intercepteur. |
| `maxSendMessageLength` | `number` | `-1` | Plus grande réponse, en octets ; `-1` pour aucune limite. |
| `maxInFlightRequestBytes` | `number` | `8388608` (8 Mio) | Octets de requête décodés et tenus en même temps, sur tous les appels en cours ; `-1` pour aucune limite. Un appel est toujours admis quand rien d'autre n'est en cours. |

### `GrpcContext`

| Membre | Signature | Description |
|---|---|---|
| `metadata` | `readonly metadata: GrpcMetadata` | Métadonnées de la requête, sans les en-têtes du transport (`content-type`, `te`, `grpc-timeout`, `grpc-encoding`, `grpc-accept-encoding`, `accept-encoding`). |
| `ip` | `readonly ip: string` | IP résolue du client. |
| `method` | `readonly method: DescMethod` | La méthode appelée. |
| `deadline` | `readonly deadline: number` | Millisecondes epoch tirées du `grpc-timeout` du client ; `Infinity` sans lui. Passé ce délai, l'appel reçoit `DEADLINE_EXCEEDED`. |
| `signal` | `readonly signal: AbortSignal` | Annulé quand l'appel reçoit une réponse sans la méthode (délai dépassé, client qui annule). Transmettez-le à ce que la méthode attend. |

### `GrpcMetadata`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new GrpcMetadata(headers?: Readonly<Record<string, string \| readonly string[]>>)` | Lève `InvalidMetadataError` sur une valeur `-bin` qui n'est pas du base64. |
| `get` | `get(key: string): MetadataValue[]` | Toutes les valeurs de la clé, dans l'ordre ; `[]` en son absence. |
| `getMap` | `getMap(): Record<string, MetadataValue>` | La première valeur de chaque clé. |

### `GrpcContextKey`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new GrpcContextKey<T>(fallback: T)` | |
| `get` | `get(context: GrpcContext): T` | La valeur posée sur cet appel, ou `fallback`. |
| `set` | `set(context: GrpcContext, value: T): void` | |

### Intercepteurs

| Fonction | Signature | Description |
|---|---|---|
| `bearerAuth` | `bearerAuth<User>(verifier: TokenVerifier<User>, options?: { guard?: string }): BearerAuth<User>` | `interceptor` répond `UNAUTHENTICATED` sans jeton bearer valide, ou avec deux valeurs `authorization`. `user(context)` renvoie l'utilisateur, et lève `UNAUTHENTICATED` sur un appel où l'intercepteur n'a pas tourné. |
| `rateLimit` | `rateLimit(limiter: CallLimiter, options?: { keyFor?: (context: GrpcContext) => string }): GrpcInterceptor` | La clé est l'IP du client par défaut, celle sous laquelle blackhole compte les requêtes HTTP. |

```ts
interface TokenVerifier<User> {
  verify(token: string, guard?: string): Promise<{ authenticated: boolean; user?: User; strategyCrash?: boolean }>
}
interface CallLimiter {
  checkRateLimit(key: string): Promise<{ allowed: boolean; resetSeconds: number }>
}
```

## Configuration

`config/protobuf.ts` exporte `defineConfig({ … })`. Les schémas se chargent au boot : un fichier manquant ou un conflit arrête le démarrage.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `descriptorSets` | `readonly string[]` | `[]` | Chemins de `FileDescriptorSet` binaires (`buf build -o app.binpb`). |
| `files` | `readonly DescFile[]` | `[]` | Descripteurs de fichier générés par `protoc-gen-es` (ses exports `file_*`). |
| `grpc` | `GrpcConfig` | `{}` | `keepUnknownFields`, `maxReceiveMessageLength`, `maxSendMessageLength`, `maxInFlightRequestBytes`, avec les défauts de [`GrpcServicesOptions`](#grpcservices). |

`descriptorSets` ou `files` doit nommer au moins un schéma. Les limites de message sont aussi remises au serveur, qui refuse un message plus grand avant de le lire.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `Protobuf` (classe), `'neutrino.protobuf'`, `'protobuf'` | Le `Protobuf` sur les schémas configurés. |
| `GrpcServices` (classe), `'neutrino.grpc'`, `'grpc'` | Le `GrpcServices`, avec la config `grpc`. |

Les jetons chaîne sont déclarés sur `ContainerBindings`. Au boot, le provider remet `grpc.handle` à la méthode `grpc()` de la liaison `server` ; sans liaison `server`, rien n'est servi.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_NEUTRINO_INVALID_DESCRIPTOR`](/fr/reference/errors#e-neutrino-invalid-descriptor) | Les octets ne sont pas un `FileDescriptorSet` valide. |
| [`E_NEUTRINO_DUPLICATE_TYPE`](/fr/reference/errors#e-neutrino-duplicate-type) | Deux sources déclarent le même type différemment. |
| [`E_NEUTRINO_UNKNOWN_TYPE`](/fr/reference/errors#e-neutrino-unknown-type) | Aucun message ni service de ce nom n'est chargé. |
| [`E_NEUTRINO_UNKNOWN_METHOD`](/fr/reference/errors#e-neutrino-unknown-method) | Aucune méthode de ce chemin n'est chargée, ou une implémentation nomme une méthode que le service n'a pas. |
| [`E_NEUTRINO_INVALID_MESSAGE`](/fr/reference/errors#e-neutrino-invalid-message) | Les octets ne sont pas un message valide du type. |
| [`E_NEUTRINO_INVALID_METADATA`](/fr/reference/errors#e-neutrino-invalid-metadata) | Une valeur de métadonnée `-bin` n'est pas du base64 ; l'appel reçoit `INTERNAL`. |
| [`E_NEUTRINO_GRPC_STATUS`](/fr/reference/errors#e-neutrino-grpc-status) | Une `GrpcError` : une méthode répond un statut au lieu d'une réponse. |
| [`E_NEUTRINO_DUPLICATE_SERVICE`](/fr/reference/errors#e-neutrino-duplicate-service) | Un service est enregistré deux fois. |
| [`E_NEUTRINO_INVALID_IMPLEMENTATION`](/fr/reference/errors#e-neutrino-invalid-implementation) | L'implémentation d'une méthode n'est pas une fonction. |
| [`E_NEUTRINO_STREAMING_UNSUPPORTED`](/fr/reference/errors#e-neutrino-streaming-unsupported) | Une méthode en streaming a été implémentée ; seules les méthodes unaires sont servies. |
| [`E_NEUTRINO_INVALID_OPTION`](/fr/reference/errors#e-neutrino-invalid-option) | Une option de taille n'est ni un nombre entier d'octets ni `-1`. |
| [`E_NEUTRINO_GRPC_UNSUPPORTED`](/fr/reference/errors#e-neutrino-grpc-unsupported) | Le serveur n'a pas de méthode `grpc()`. Mettez à jour `@c9up/ream`. |

## Voir aussi

- [Protobuf et gRPC](/fr/guides/digging-deeper/grpc)
- [Clients JSON-RPC](/fr/guides/apis/json-rpc-clients)
