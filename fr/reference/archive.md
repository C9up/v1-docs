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
| `@c9up/archive` | `DriveManager`, `StorageManager`, `defineConfig`, `services`, les trois drivers, `DriveFile`, `DriveDirectory`, `StaticMiddleware`, `createSignedRouteHandler`, `ArchiveError`, les types |
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
| `ArchiveError` | erreur | Toute erreur d'archive : `code` (`E_ARCHIVE_…`) et un `hint` facultatif. |
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

`new StorageManager(driver: StorageDriver)`. Le contrat d'un driver a les mêmes méthodes, sauf `file`, `fromSnapshot`, `copyFromFs`, `moveFromFs` et les alias.

| Membre | Signature | Description |
|---|---|---|
| `put` | `put(filePath: string, content: Buffer \| string, options?: WriteOptions): Promise<void>` | Écrit un fichier. |
| `putStream` | `putStream(filePath: string, readable: NodeJS.ReadableStream, options?: PutStreamOptions): Promise<void>` | Écrit depuis un flux. |
| `copyFromFs` / `moveFromFs` | `copyFromFs(source: string \| URL, destination: string, options?: WriteOptions): Promise<void>` | Copie (ou déplace) un fichier du système de fichiers local vers le disque. |
| `get` | `get(filePath: string): Promise<Buffer \| null>` | Contenu, `null` s'il est absent. |
| `getBytes` / `getArrayBuffer` | `getBytes(filePath: string): Promise<Uint8Array>` | Contenu ; lève `E_ARCHIVE_NOT_FOUND`. |
| `getStream` | `getStream(filePath: string): Promise<NodeJS.ReadableStream>` | Lève `E_ARCHIVE_NOT_FOUND`. |
| `exists` | `exists(filePath: string): Promise<boolean>` | |
| `delete` | `delete(filePath: string): Promise<boolean>` | |
| `deleteAll` | `deleteAll(prefix: string): Promise<void>` | Chaque fichier sous un préfixe. |
| `copy` / `move` | `copy(from: string, to: string, options?: WriteOptions): Promise<void>` | Au sein du disque. `move` garde la visibilité. |
| `url` / `getUrl` | `url(filePath: string): Promise<string>` | URL publique pour un fichier public, URL signée pour un fichier privé. |
| `publicUrl` | `publicUrl(filePath: string): string` | URL non signée, sans égard à la visibilité. |
| `getSignedUrl` | `getSignedUrl(filePath: string, options?: SignedUrlOptions): string \| Promise<string>` | URL de lecture limitée dans le temps. |
| `getSignedUploadUrl` | `getSignedUploadUrl(filePath: string, options?: SignedUrlOptions): string \| Promise<string>` | URL de téléversement limitée dans le temps ; disques cloud seulement. |
| `getMetadata` / `getMetaData` | `getMetadata(filePath: string): Promise<Metadata>` | Lève `E_ARCHIVE_NOT_FOUND`. |
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
| [`E_ARCHIVE_INVALID_KEY`](/fr/reference/errors#e-archive-invalid-key) | La route signée refuse le chemin (403). |
| [`E_ARCHIVE_NOT_FOUND`](/fr/reference/errors#e-archive-not-found) | Aucun fichier sous la clé (404 sur la route signée). |
| [`E_ARCHIVE_PATH_TRAVERSAL_DETECTED`](/fr/reference/errors#e-archive-path-traversal-detected) | Une clé sort de la racine du disque. |
| [`E_ARCHIVE_UNALLOWED_CHARACTERS`](/fr/reference/errors#e-archive-unallowed-characters) | Une clé contient des caractères interdits. |
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

## Voir aussi

- [Drive](/fr/guides/digging-deeper/drive)
- [Téléversement de fichiers](/fr/guides/basics/file-uploads)
- [Tests](/fr/guides/testing/introduction)
