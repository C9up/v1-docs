# archive

`@c9up/archive` : le stockage de fichiers sur des disques nommés : un driver local avec URL signées par HMAC, et des drivers compatibles S3 et Google Cloud Storage, derrière un même contrat. Guide : [Drive](/fr/guides/digging-deeper/drive).

## Installation

```bash
pnpm add @c9up/archive
```

`ream configure @c9up/archive` enregistre le provider, écrit `config/archive.ts` et ajoute `DRIVE_DISK=fs` au `.env`. `driveFake` de `@c9up/archive/testing` demande `@c9up/helix` ; les aides de templates demandent `@c9up/inker` (deux pairs facultatifs).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/archive` | `DriveManager`, `StorageManager`, `defineConfig`, `services`, les trois drivers, `DriveFile`, `DriveDirectory`, `StaticMiddleware`, `createSignedRouteHandler`, `errors`, les types |
| `@c9up/archive/provider` | `ArchiveProvider` (export par défaut) |
| `@c9up/archive/services/main` | Le disque par défaut, un `StorageManager` (export par défaut), `setStorage`, `setStorageResolver`, `getStorage`, `clearStorage` |
| `@c9up/archive/signed-route` | `createSignedRouteHandler` et ses types |
| `@c9up/archive/testing` | `FakeStorage`, `FakeStorageManager`, `driveFake` |
| `@c9up/archive/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/archive`

| Export | Nature | Description |
|---|---|---|
| `DriveManager` | classe | Les disques configurés, construits au premier usage ; peut remplacer un disque par un faux. |
| `StorageManager` | classe | Un disque : chaque clé est normalisée et vérifiée avant que son driver la voie. |
| `defineConfig` | fonction | `defineConfig<T extends DriveConfig \| ArchiveConfig>(config: T): T`. |
| `services` | constante | Fabriques de disques : `fs(options?: FsServiceOptions)`, `s3(config: S3Config)`, `gcs(config: GcsConfig)`. |
| `LocalDriver` | classe | Des fichiers sous un répertoire racine ; URL signées servies par la route signée. `new LocalDriver(root: string, options?: LocalDriverOptions)`. |
| `S3Driver` | classe | Tout service compatible S3. `new S3Driver(config: S3Config)`. |
| `GcsDriver` | classe | Google Cloud Storage avec un compte de service. `new GcsDriver(config: GcsConfig)`. |
| `DriveFile` | classe | Un handle sur un fichier, lu seulement quand une méthode le demande. |
| `DriveDirectory` | classe | Une entrée de répertoire de `listAll()` : `{ isFile: false; isDirectory: true; name; prefix }`. |
| `StaticMiddleware` | classe | Sert un répertoire sous un préfixe d'URL, avec ETag et Last-Modified. `new StaticMiddleware(config: StaticConfig)`. |
| `createSignedRouteHandler` | fonction | `createSignedRouteHandler(options: SignedRouteOptions)` : un middleware qui vérifie les URL signées du disque local et sert le fichier. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `DriveConfig` | interface | `{ default: string; services: Record<string, DriveServiceFactory>; fakes?: { location?: string } }`. |
| `ArchiveConfig` | interface | La forme à disque unique : `{ driver: 'local' \| 's3' \| 'gcs'; local?: { root; signingSecret?; routeBasePath? }; s3?: S3Config; gcs?: GcsConfig }`. Exécutée comme un disque nommé `default`. |
| `DriveServiceFactory` | type | `() => StorageDriver`. |
| `FsServiceOptions` | interface | `{ location?: string; root?: string; signingSecret?: string \| ReleasableSecret; routeBasePath?: string }`. |
| `LocalDriverOptions` | interface | `{ signingSecret?: string \| ReleasableSecret; routeBasePath?: string }`. |
| `S3Config` | interface | `{ bucket; region?; endpoint?; accessKeyId; secretAccessKey; publicUrl?; requestTimeoutMs? }`. |
| `GcsConfig` | interface | `{ bucket; serviceAccount: GcsServiceAccount; publicUrl?; requestTimeoutMs? }`. |
| `GcsServiceAccount` | interface | `{ client_email: string; private_key: string; project_id?: string }`. |
| `StorageDriver` | interface | Le contrat d'un driver : chaque méthode du tableau plus bas. |
| `Visibility` | type | `'public' \| 'private'`. |
| `WriteOptions` | interface | `{ visibility?; contentType?; cacheControl?; contentDisposition?; contentLength? }`. |
| `PutStreamOptions` | interface | `{ contentType?: string; contentLength?: number }`. |
| `SignedUrlOptions` | interface | `{ expiresIn?: number \| string; contentType?: string; contentDisposition?: string }`. `expiresIn` en secondes ou sous la forme `'30mins'` ; 300 par défaut, 604800 au plus. |
| `Metadata` | interface | `{ size; contentLength; mimeType; contentType; lastModified: Date; etag; visibility }`. |
| `StorageEntry` | interface | `{ path: string; size: number; lastModified: Date }`. |
| `ListAllOptions` | interface | `{ recursive?: boolean; paginationToken?: string }`. |
| `ListAllResult` | interface | `{ paginationToken?: string; objects: Iterable<DriveFile \| DriveDirectory> }`. |
| `FileSnapshot` | interface | `{ key; name; contentLength; contentType?; lastModified: string; etag }`. |
| `MoveToDiskOptions` | interface | `WriteOptions & { moveAs?: 'stream' \| 'buffer' }` ; `'stream'` par défaut. |
| `ReleasableSecret` | interface | `{ release(): string }`. |
| `StaticConfig` | interface | `{ root: string; prefix?: string; maxAge?: number; extensions?: string[] }`. |
| `StaticMiddlewareHttpContext` / `StaticMiddlewareResponse` | interface | La partie du contexte HTTP qu'utilise le middleware statique. |
| `SignedRouteOptions` | interface | `{ storage: StorageManager; driver: LocalDriver; prefix?: string }`. |
| `SignedRouteHttpContext` / `SignedRouteResponse` | interface | La partie du contexte HTTP qu'utilise la route signée. |

### `@c9up/archive/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`ArchiveProvider`) | provider | `register()` lie le `DriveManager` et le disque par défaut, construits au premier usage depuis la configuration `archive` (un disque local sur `./storage` sans elle) ; `boot()` installe le disque sur `services/main`, ajoute `moveToDisk()` aux fichiers téléversés de ream et, si l'application rend avec inker, publie les aides de templates `driveUrl` et `driveSignedUrl`. |
| `ArchiveAppContext` | interface | `{ container; config; usingInker? }` : l'hôte dont le provider a besoin. |

Le provider ajoute au `MultipartFile` de ream :

```ts
moveToDisk(key: string, disk?: string, options?: MoveToDiskOptions): Promise<void>
moveToDisk(key: string, options?: MoveToDiskOptions): Promise<void>
```

### `@c9up/archive/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | constante | Le disque par défaut ; lire un membre avant le démarrage du provider lève une erreur. |
| `setStorage` | fonction | `setStorage(value: StorageManager): void`. |
| `setStorageResolver` | fonction | `setStorageResolver(factory: () => StorageManager): void` : construit le disque à la première lecture. |
| `getStorage` | fonction | `getStorage(): StorageManager \| undefined`. |
| `clearStorage` | fonction | `clearStorage(): void`. |

### `@c9up/archive/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeStorage` | classe | Un `StorageDriver` en mémoire avec `clear()`, `reset()`, `dump()`, `getStored()` et les assertions ci-dessous. |
| `FakeStorageManager` | classe | Un `StorageManager` sur un `FakeStorage`, ce que rend `drive.fake()`. |
| `driveFake` | fonction | `driveFake(drive: FakeableDrive)` : un plugin helix qui place un faux disque dans `ctx.drive` pour chaque test et remet le vrai ensuite. |
| `FakeStoragePredicate` | interface | `{ contentContaining?: string; mimeType?: string }`. |
| `FakeStoragePredicateArg` | type | `FakeStoragePredicate \| ((entry: { path: string; content: Buffer; mimeType: string }) => boolean)`. |
| `FakeableDrive` | interface | `{ fake(service?: string): FakeStorageManager; restore(service?: string): void }`. |
| `DriveHost` / `DriveContext` | type | Les parties de l'API de plugin et du contexte de test de helix qu'utilise le plugin. |

| Membre | Signature | Description |
|---|---|---|
| `assertExists` | `assertExists(paths: string \| string[]): void` | Lève une `AssertionError` sauf si chaque chemin existe. |
| `assertMissing` | `assertMissing(paths: string \| string[]): void` | Lève une erreur si l'un existe. |
| `assertStored` | `assertStored(path: string, predicate?: FakeStoragePredicateArg): void` | Lève une erreur si aucun fichier stocké ne correspond. |
| `assertNotStored` | `assertNotStored(path: string, predicate?: FakeStoragePredicateArg): void` | Lève une erreur si l'un correspond. |
| `getStored` | `getStored(): Array<{ path; content: Buffer; mimeType; visibility }>` | Copies des fichiers stockés. |
| `clear` | `clear(): void` | Vide le faux disque. |

### `DriveManager`

`new DriveManager(config: DriveConfig)` ; lève `E_ARCHIVE_UNKNOWN_DISK` si `default` n'est pas un service déclaré.

| Membre | Signature | Description |
|---|---|---|
| `use` | `use(service?: string): StorageManager` | Le disque nommé (celui par défaut sans nom), construit une fois ; son faux tant qu'il est actif. |
| `fake` | `fake(service?: string): FakeStorageManager` | Remplace un disque par un faux en mémoire. |
| `restore` | `restore(service?: string): void` | Remet le vrai disque. |

### `StorageManager`

`new StorageManager(driver: StorageDriver)`. Le contrat d'un driver a les mêmes méthodes, sauf `file`, `fromSnapshot`, `copyFromFs`, `moveFromFs` et les alias. Toute opération sauf `list` / `listAll` enveloppe un échec du driver dans sa propre erreur `E_CANNOT_*` (voir [Erreurs](#erreurs)), l'erreur du driver en `cause` ; une clé refusée garde son propre code.

| Membre | Signature | Description |
|---|---|---|
| `put` | `put(filePath: string, content: Buffer \| string, options?: WriteOptions): Promise<void>` | Écrit un fichier. |
| `putStream` | `putStream(filePath: string, readable: NodeJS.ReadableStream, options?: PutStreamOptions): Promise<void>` | Écrit depuis un flux. |
| `copyFromFs` / `moveFromFs` | `copyFromFs(source: string \| URL, destination: string, options?: WriteOptions): Promise<void>` | Copie (ou déplace) un fichier du système de fichiers local vers le disque. |
| `get` | `get(filePath: string): Promise<Buffer \| null>` | Contenu, `null` s'il est absent. |
| `getBytes` / `getArrayBuffer` | `getBytes(filePath: string): Promise<Uint8Array>` | Contenu ; un fichier absent lève `E_CANNOT_READ_FILE`, avec `E_ARCHIVE_NOT_FOUND` en `cause`. |
| `getStream` | `getStream(filePath: string): Promise<NodeJS.ReadableStream>` | Un fichier absent lève `E_CANNOT_READ_FILE`, avec `E_ARCHIVE_NOT_FOUND` en `cause`. |
| `exists` | `exists(filePath: string): Promise<boolean>` | |
| `delete` | `delete(filePath: string): Promise<boolean>` | |
| `deleteAll` | `deleteAll(prefix: string): Promise<void>` | Chaque fichier sous un préfixe. |
| `copy` / `move` | `copy(from: string, to: string, options?: WriteOptions): Promise<void>` | Au sein du disque. `move` garde la visibilité. |
| `url` / `getUrl` | `url(filePath: string): Promise<string>` | URL publique pour un fichier public, URL signée pour un fichier privé. |
| `publicUrl` | `publicUrl(filePath: string): string` | URL non signée, sans égard à la visibilité. |
| `getSignedUrl` | `getSignedUrl(filePath: string, options?: SignedUrlOptions): string \| Promise<string>` | URL de lecture limitée dans le temps. |
| `getSignedUploadUrl` | `getSignedUploadUrl(filePath: string, options?: SignedUrlOptions): string \| Promise<string>` | URL de téléversement limitée dans le temps ; disques cloud seulement. |
| `getMetadata` / `getMetaData` | `getMetadata(filePath: string): Promise<Metadata>` | Un fichier absent lève `E_CANNOT_GET_METADATA`, avec `E_ARCHIVE_NOT_FOUND` en `cause`. |
| `getVisibility` / `setVisibility` | `setVisibility(filePath: string, visibility: Visibility): Promise<void>` | |
| `list` | `list(prefix: string): AsyncIterable<StorageEntry>` | Chaque fichier sous un préfixe, paginé à la demande. |
| `listAll` | `listAll(prefix: string, options?: ListAllOptions): Promise<ListAllResult>` | Une page de fichiers et de répertoires. |
| `file` | `file(key: string): DriveFile` | Un handle, rien n'est lu. |
| `fromSnapshot` | `fromSnapshot(snapshot: FileSnapshot): DriveFile` | Un handle reconstruit depuis un instantané stocké. |

`LocalDriver` ajoute `getRouteBasePath(): string` et `getSigningSecret(): string | null`.

### `DriveFile`

| Membre | Signature | Description |
|---|---|---|
| `key` / `name` | `key: string` | La clé, et son dernier segment. |
| `exists` / `get` / `getBytes` / `getArrayBuffer` / `getStream` | comme sur le disque | |
| `getMetaData` / `getVisibility` | comme sur le disque | |
| `getUrl` / `getSignedUrl` / `getSignedUploadUrl` | comme sur le disque | |
| `toSnapshot` | `toSnapshot(): Promise<FileSnapshot>` | Des données à stocker pour reconstruire le handle. |

## Configuration

`config/archive.ts`, lu sous la clé `archive`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | — | Le disque que rend `use()` sans nom. La configuration générée lit `DRIVE_DISK` (`fs` s'il est absent). |
| `services` | `Record<string, DriveServiceFactory>` | — | Disques nommés, construits au premier usage. |
| `fakes.location` | `string` | — | Accepté sans être lu : les faux vivent en mémoire. |
| `services.fs({ location })` | `string` | `'./storage'` | Répertoire racine (`root` est accepté aussi). |
| `services.fs({ signingSecret })` | `string \| ReleasableSecret` | aucun | Active `getSignedUrl` sur le disque local ; 16 caractères au moins. |
| `services.fs({ routeBasePath })` | `string` | `'/storage'` | Chemin d'URL sur lequel sont construites les URL du disque local. |
| `S3Config.requestTimeoutMs` / `GcsConfig.requestTimeoutMs` | `number` | `30000` | Plus long silence permis au fournisseur pendant une requête ; `0` le désactive. |
| `StaticConfig.prefix` | `string` | `'/static'` | Préfixe d'URL du middleware statique. |
| `StaticConfig.maxAge` | `number` | `0` | `max-age` en secondes. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `DriveManager` (classe) | Le `DriveManager` |
| `'archive.drive'` | Le même `DriveManager` |
| `'drive'` | Le même `DriveManager` |
| `StorageManager` (classe) | Le disque par défaut |
| `'archive.storage'` | Le disque par défaut |
| `'storage'` | Le disque par défaut |

Les jetons texte sont typés sur `ContainerBindings` dès que `@c9up/archive` est importé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_ARCHIVE_INVALID_SIGNATURE`](/fr/reference/errors#e-archive-invalid-signature) | La signature d'une URL signée est incomplète, malformée ou fausse (403). |
| [`E_ARCHIVE_EXPIRED_SIGNATURE`](/fr/reference/errors#e-archive-expired-signature) | Une URL signée a expiré (403). |
| [`E_ARCHIVE_ACCESS_DENIED`](/fr/reference/errors#e-archive-access-denied) | Une requête non signée demande un fichier privé (403). |
| [`E_ARCHIVE_INVALID_KEY`](/fr/reference/errors#e-archive-invalid-key) | La route signée refuse le chemin (403) ; levée aussi pour une clé qui nomme un marqueur de visibilité, ou une clé de `moveToDisk()` qui n'est pas une chaîne. |
| [`E_ARCHIVE_NOT_FOUND`](/fr/reference/errors#e-archive-not-found) | Aucun fichier sous la clé (statut 404). Une opération du disque la transmet comme `cause` de son erreur `E_CANNOT_*`. |
| [`E_CANNOT_WRITE_FILE`](/fr/reference/errors#e-cannot-write-file) | `put`, `putStream`, `copyFromFs` ou `moveFromFs` n'a pas pu écrire le fichier ; l'erreur du driver est la `cause`. |
| [`E_CANNOT_READ_FILE`](/fr/reference/errors#e-cannot-read-file) | `get`, `getBytes`, `getArrayBuffer` ou `getStream` n'a pas pu lire le fichier, absent compris (`cause` : `E_ARCHIVE_NOT_FOUND`) ; `get` répond plutôt `null` pour un fichier absent. |
| [`E_CANNOT_DELETE_FILE`](/fr/reference/errors#e-cannot-delete-file) | `delete` a échoué ; l'erreur du driver est la `cause`. |
| [`E_CANNOT_DELETE_DIRECTORY`](/fr/reference/errors#e-cannot-delete-directory) | `deleteAll` a échoué ; l'erreur du driver est la `cause`. |
| [`E_CANNOT_COPY_FILE`](/fr/reference/errors#e-cannot-copy-file) | `copy` a échoué, source absente comprise ; l'erreur du driver est la `cause`. |
| [`E_CANNOT_MOVE_FILE`](/fr/reference/errors#e-cannot-move-file) | `move` a échoué, source absente comprise ; l'erreur du driver est la `cause`. |
| [`E_CANNOT_CHECK_FILE_EXISTENCE`](/fr/reference/errors#e-cannot-check-file-existence) | `exists` n'a pas pu trancher ; un fichier absent répond plutôt `false`. |
| [`E_CANNOT_GET_METADATA`](/fr/reference/errors#e-cannot-get-metadata) | `getMetadata` / `getMetaData` ou `getVisibility` a échoué, fichier absent compris (`cause` : `E_ARCHIVE_NOT_FOUND`). |
| [`E_CANNOT_SET_VISIBILITY`](/fr/reference/errors#e-cannot-set-visibility) | `setVisibility` a échoué ; l'erreur du driver est la `cause`. |
| [`E_CANNOT_GENERATE_URL`](/fr/reference/errors#e-cannot-generate-url) | `url` / `getUrl`, `publicUrl`, `getSignedUrl` ou `getSignedUploadUrl` n'a pas pu construire l'URL (`cause` : `E_ARCHIVE_SIGNING_DISABLED`, `E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED`, `E_ARCHIVE_INVALID_EXPIRY`, …). |
| [`E_CANNOT_SERVE_FILE`](/fr/reference/errors#e-cannot-serve-file) | La route des URL signées n'a pas pu servir un fichier pour une autre raison que son absence (qui répond 404) ; l'échec est la `cause`. |
| [`E_ARCHIVE_PATH_TRAVERSAL_DETECTED`](/fr/reference/errors#e-archive-path-traversal-detected) | Un chemin local sort de la racine du disque, directement ou par un lien qui pointe au dehors. |
| [`E_UNALLOWED_CHARACTERS`](/fr/reference/errors#e-unallowed-characters) | Une clé contient un caractère de contrôle, une barre oblique inverse ou un séparateur encodé. |
| [`E_PATH_TRAVERSAL_DETECTED`](/fr/reference/errors#e-path-traversal-detected) | Une clé a un segment fait seulement de points, comme `..`. |
| [`E_INVALID_KEY`](/fr/reference/errors#e-invalid-key) | Une clé est vide, ou faite seulement de séparateurs, une fois normalisée. |
| [`E_ARCHIVE_INVALID_EXPIRY`](/fr/reference/errors#e-archive-invalid-expiry) | `expiresIn` n'est pas une durée positive dans les bornes. |
| [`E_ARCHIVE_SIGNING_DISABLED`](/fr/reference/errors#e-archive-signing-disabled) | `getSignedUrl()` sur un disque local sans `signingSecret`. |
| [`E_ARCHIVE_WEAK_SIGNING_SECRET`](/fr/reference/errors#e-archive-weak-signing-secret) | Le `signingSecret` local fait moins de 16 caractères. |
| [`E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED`](/fr/reference/errors#e-archive-signed-upload-unsupported) | `getSignedUploadUrl()` sur un disque local. |
| [`E_ARCHIVE_INVALID_HEADER_VALUE`](/fr/reference/errors#e-archive-invalid-header-value) | Une valeur d'en-tête à signer contient un caractère de contrôle. |
| [`E_ARCHIVE_INVALID_ROUTE_BASE_PATH`](/fr/reference/errors#e-archive-invalid-route-base-path) | `routeBasePath` n'est pas un chemin d'URL absolu. |
| [`E_ARCHIVE_PREFIX_MISMATCH`](/fr/reference/errors#e-archive-prefix-mismatch) | `createSignedRouteHandler()` a reçu un préfixe différent du `routeBasePath` du disque. |
| [`E_ARCHIVE_VISIBILITY_CORRUPT`](/fr/reference/errors#e-archive-visibility-corrupt) | L'enregistrement de visibilité d'un fichier est illisible. |
| [`E_ARCHIVE_VISIBILITY_MOVE_FAILED`](/fr/reference/errors#e-archive-visibility-move-failed) | `move()` a déplacé le fichier sans pouvoir écrire sa visibilité. |
| [`E_ARCHIVE_INVALID_MOVE_OPTIONS`](/fr/reference/errors#e-archive-invalid-move-options) | `moveToDisk()` a reçu des options inutilisables. |
| [`E_ARCHIVE_MULTIPART_NOT_MACROABLE`](/fr/reference/errors#e-archive-multipart-not-macroable) | La version de ream installée ne peut pas recevoir `moveToDisk()`. |
| [`E_ARCHIVE_REQUEST_TIMEOUT`](/fr/reference/errors#e-archive-request-timeout) | Le fournisseur de stockage est resté muet au-delà de `requestTimeoutMs`. |
| [`E_ARCHIVE_UNEXPECTED_RESPONSE`](/fr/reference/errors#e-archive-unexpected-response) | Le fournisseur de stockage a répondu quelque chose d'inutilisable. |
| [`E_ARCHIVE_UNKNOWN_DISK`](/fr/reference/errors#e-archive-unknown-disk) | Un nom de disque, ou le disque par défaut, n'est pas configuré. |
| [`E_ARCHIVE_INVALID_DRIVER`](/fr/reference/errors#e-archive-invalid-driver) | `driver` n'est ni `'local'`, ni `'s3'`, ni `'gcs'`. |
| [`E_ARCHIVE_CONFIG_MISSING`](/fr/reference/errors#e-archive-config-missing) | Le driver est `s3` ou `gcs` et sa section manque. |
| [`E_ARCHIVE_PROVIDER_NOT_REGISTERED`](/fr/reference/errors#e-archive-provider-not-registered) | `boot()` a tourné avant `register()`. |
| [`E_ARCHIVE_TEMPLATE_ENGINE`](/fr/reference/errors#e-archive-template-engine) | Les aides de templates ne peuvent pas être publiées sur inker. |
| [`E_ARCHIVE_REMOTE_FAILED`](/fr/reference/errors#e-archive-remote-failed) | S3 ou GCS a refusé une requête ou signalé un échec ; le statut HTTP du fournisseur est dans `providerStatus`, et `status` reste 500. |
| [`E_ARCHIVE_INVALID_DRIVER_CONFIG`](/fr/reference/errors#e-archive-invalid-driver-config) | `S3Driver` n'a reçu ni `region` ni `endpoint`, ou `GcsDriver` n'a pas de `bucket` ou pas de `client_email` / `private_key` de compte de service. |
| [`E_ARCHIVE_CONTENT_LENGTH_EXCEEDED`](/fr/reference/errors#e-archive-content-length-exceeded) | `putStream()` a lu plus d'octets que le `contentLength` que vous avez déclaré. |
| [`E_ARCHIVE_INVALID_STATIC_PREFIX`](/fr/reference/errors#e-archive-invalid-static-prefix) | Vous avez passé un `prefix` vide à `StaticMiddleware`. |
| [`E_ARCHIVE_NOT_BOOTED`](/fr/reference/errors#e-archive-not-booted) | Le service `storage` a été lu avant le boot d'`ArchiveProvider`. |
| [`E_ARCHIVE_INVALID_PREDICATE`](/fr/reference/errors#e-archive-invalid-predicate) | Une assertion du fake a reçu un `contentContaining` vide, qui correspondrait à tous les fichiers. |
| [`E_ARCHIVE_INTERNAL`](/fr/reference/errors#e-archive-internal) | Un invariant interne est rompu : un bogue d'archive. |

Chaque code est une classe du namespace `errors` et une `Exception` de `@c9up/flare`, de statut 500 sauf mention contraire dans le tableau : testez `error.code` ou `error instanceof errors.E_*`. Le conseil que porte une erreur est dans `help` ; pour `E_UNALLOWED_CHARACTERS`, `help` nomme le caractère refusé. Les `assertExists()`, `assertMissing()`, `assertStored()` et `assertNotStored()` d'un fake lèvent l'`AssertionError` de `node:assert`.

## Migration

- `ArchiveError` disparaît : testez `error.code`, ou `error instanceof errors.E_ARCHIVE_*` avec `import { errors } from '@c9up/archive'`.
- `ArchiveRemoteError` devient `errors.E_ARCHIVE_REMOTE_FAILED` ; `providerStatus` ne change pas.
- `error.hint` devient `error.help`.
- Les refus de clé changent de code : `E_ARCHIVE_UNALLOWED_CHARACTERS` devient `E_UNALLOWED_CHARACTERS` ; un segment `..` lève `E_PATH_TRAVERSAL_DETECTED` et une clé vide `E_INVALID_KEY`, là où ils levaient `E_ARCHIVE_PATH_TRAVERSAL_DETECTED` / `E_ARCHIVE_INVALID_KEY`.
- `E_ARCHIVE_NOT_FOUND` a désormais le statut 404.
- Chaque opération du disque enveloppe désormais un échec du driver dans sa propre erreur, celle du driver en `cause` : `E_CANNOT_WRITE_FILE`, `E_CANNOT_READ_FILE`, `E_CANNOT_DELETE_FILE`, `E_CANNOT_DELETE_DIRECTORY`, `E_CANNOT_COPY_FILE`, `E_CANNOT_MOVE_FILE`, `E_CANNOT_CHECK_FILE_EXISTENCE`, `E_CANNOT_GET_METADATA`, `E_CANNOT_SET_VISIBILITY`, `E_CANNOT_GENERATE_URL` (statut 500). `E_ARCHIVE_NOT_FOUND`, `E_ARCHIVE_REMOTE_FAILED` et les erreurs errno vous parviennent comme cette `cause` : lisez `error.cause` là où vous testiez l'erreur elle-même. Une clé refusée garde son propre code.
- La route des URL signées lève `E_CANNOT_SERVE_FILE` pour un fichier qu'elle ne peut pas servir, hors fichier absent.
- Les refus de clé se lisent comme la bibliothèque de stockage les écrit : `The key "a\\b" has unallowed characters` (le caractère refusé est dans `help`), `Path traversal segment detected in key "../a"`, `Invalid key "//". After normalization results in an empty string`.
- `E_ARCHIVE_ASSERTION_FAILED` disparaît : `assertStored()` / `assertNotStored()` lèvent l'`AssertionError` de `node:assert`, comme le faisaient déjà `assertExists()` / `assertMissing()`.

## Voir aussi

- [Drive](/fr/guides/digging-deeper/drive)
- [Téléversement de fichiers](/fr/guides/basics/file-uploads)
- [Tests](/fr/guides/testing/introduction)
