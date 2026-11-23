# archive

`@c9up/archive`: file storage on named disks: a local driver with HMAC-signed URLs, and S3-compatible and Google Cloud Storage drivers, behind one driver contract. Guide: [Drive](/en/guides/digging-deeper/drive).

## Installation

```bash
pnpm add @c9up/archive
```

`ream configure @c9up/archive` registers the provider, writes `config/archive.ts` and adds `DRIVE_DISK=fs` to `.env`. `driveFake` in `@c9up/archive/testing` needs `@c9up/helix`; the template helpers need `@c9up/inker` (both optional peers).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/archive` | `DriveManager`, `StorageManager`, `defineConfig`, `services`, the three drivers, `DriveFile`, `DriveDirectory`, `StaticMiddleware`, `createSignedRouteHandler`, `errors`, types |
| `@c9up/archive/provider` | `ArchiveProvider` (default export) |
| `@c9up/archive/services/main` | The default disk, a `StorageManager` (default export), `setStorage`, `setStorageResolver`, `getStorage`, `clearStorage` |
| `@c9up/archive/signed-route` | `createSignedRouteHandler` and its types |
| `@c9up/archive/testing` | `FakeStorage`, `FakeStorageManager`, `driveFake` |
| `@c9up/archive/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/archive`

| Export | Kind | Description |
|---|---|---|
| `DriveManager` | class | The configured disks, built on first use; can swap a disk for a fake. |
| `StorageManager` | class | One disk: every key normalized and checked before its driver sees it. |
| `defineConfig` | function | `defineConfig<T extends DriveConfig \| ArchiveConfig>(config: T): T`. |
| `services` | const | Disk factories: `fs(options?: FsServiceOptions)`, `s3(config: S3Config)`, `gcs(config: GcsConfig)`. |
| `LocalDriver` | class | Files under a root directory; signed URLs served by the signed route. `new LocalDriver(root: string, options?: LocalDriverOptions)`. |
| `S3Driver` | class | Any S3-compatible service. `new S3Driver(config: S3Config)`. |
| `GcsDriver` | class | Google Cloud Storage with a service account. `new GcsDriver(config: GcsConfig)`. |
| `DriveFile` | class | A handle on one file, read only when a method asks. |
| `DriveDirectory` | class | A directory entry of `listAll()`: `{ isFile: false; isDirectory: true; name; prefix }`. |
| `StaticMiddleware` | class | Serves a directory under a URL prefix, with ETag and Last-Modified. `new StaticMiddleware(config: StaticConfig)`. |
| `createSignedRouteHandler` | function | `createSignedRouteHandler(options: SignedRouteOptions)`: middleware that verifies the local disk's signed URLs and serves the file. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `DriveConfig` | interface | `{ default: string; services: Record<string, DriveServiceFactory>; fakes?: { location?: string } }`. |
| `ArchiveConfig` | interface | The single-disk shape: `{ driver: 'local' \| 's3' \| 'gcs'; local?: { root; signingSecret?; routeBasePath? }; s3?: S3Config; gcs?: GcsConfig }`. Run as one disk named `default`. |
| `DriveServiceFactory` | type | `() => StorageDriver`. |
| `FsServiceOptions` | interface | `{ location?: string; root?: string; signingSecret?: string \| ReleasableSecret; routeBasePath?: string }`. |
| `LocalDriverOptions` | interface | `{ signingSecret?: string \| ReleasableSecret; routeBasePath?: string }`. |
| `S3Config` | interface | `{ bucket; region?; endpoint?; accessKeyId; secretAccessKey; publicUrl?; requestTimeoutMs? }`. |
| `GcsConfig` | interface | `{ bucket; serviceAccount: GcsServiceAccount; publicUrl?; requestTimeoutMs? }`. |
| `GcsServiceAccount` | interface | `{ client_email: string; private_key: string; project_id?: string }`. |
| `StorageDriver` | interface | The driver contract: every method of the table below. |
| `Visibility` | type | `'public' \| 'private'`. |
| `WriteOptions` | interface | `{ visibility?; contentType?; cacheControl?; contentDisposition?; contentLength? }`. |
| `PutStreamOptions` | interface | `{ contentType?: string; contentLength?: number }`. |
| `SignedUrlOptions` | interface | `{ expiresIn?: number \| string; contentType?: string; contentDisposition?: string }`. `expiresIn` in seconds or as `'30mins'`; default 300, at most 604800. |
| `Metadata` | interface | `{ size; contentLength; mimeType; contentType; lastModified: Date; etag; visibility }`. |
| `StorageEntry` | interface | `{ path: string; size: number; lastModified: Date }`. |
| `ListAllOptions` | interface | `{ recursive?: boolean; paginationToken?: string }`. |
| `ListAllResult` | interface | `{ paginationToken?: string; objects: Iterable<DriveFile \| DriveDirectory> }`. |
| `FileSnapshot` | interface | `{ key; name; contentLength; contentType?; lastModified: string; etag }`. |
| `MoveToDiskOptions` | interface | `WriteOptions & { moveAs?: 'stream' \| 'buffer' }`; `'stream'` by default. |
| `ReleasableSecret` | interface | `{ release(): string }`. |
| `StaticConfig` | interface | `{ root: string; prefix?: string; maxAge?: number; extensions?: string[] }`. |
| `StaticMiddlewareHttpContext` / `StaticMiddlewareResponse` | interface | The slice of the HTTP context the static middleware uses. |
| `SignedRouteOptions` | interface | `{ storage: StorageManager; driver: LocalDriver; prefix?: string }`. |
| `SignedRouteHttpContext` / `SignedRouteResponse` | interface | The slice of the HTTP context the signed route uses. |

### `@c9up/archive/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`ArchiveProvider`) | provider | `register()` binds the `DriveManager` and the default disk, both built on first use from the `archive` config (a local disk on `./storage` without one); `boot()` seats the disk on `services/main`, adds `moveToDisk()` to ream's uploaded files and, when the app renders with inker, publishes the `driveUrl` and `driveSignedUrl` template helpers. |
| `ArchiveAppContext` | interface | `{ container; config; usingInker? }`: the host the provider needs. |

The provider adds to ream's `MultipartFile`:

```ts
moveToDisk(key: string, disk?: string, options?: MoveToDiskOptions): Promise<void>
moveToDisk(key: string, options?: MoveToDiskOptions): Promise<void>
```

### `@c9up/archive/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The default disk; a member read before the provider booted throws. |
| `setStorage` | function | `setStorage(value: StorageManager): void`. |
| `setStorageResolver` | function | `setStorageResolver(factory: () => StorageManager): void`: build the disk on first read. |
| `getStorage` | function | `getStorage(): StorageManager \| undefined`. |
| `clearStorage` | function | `clearStorage(): void`. |

### `@c9up/archive/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeStorage` | class | An in-memory `StorageDriver` with `clear()`, `reset()`, `dump()`, `getStored()` and the assertions below. |
| `FakeStorageManager` | class | A `StorageManager` on a `FakeStorage`, what `drive.fake()` returns. |
| `driveFake` | function | `driveFake(drive: FakeableDrive)`: a helix plugin that sets `ctx.drive` to a fake disk for each test and restores the real one after it. |
| `FakeStoragePredicate` | interface | `{ contentContaining?: string; mimeType?: string }`. |
| `FakeStoragePredicateArg` | type | `FakeStoragePredicate \| ((entry: { path: string; content: Buffer; mimeType: string }) => boolean)`. |
| `FakeableDrive` | interface | `{ fake(service?: string): FakeStorageManager; restore(service?: string): void }`. |
| `DriveHost` / `DriveContext` | type | The slices of helix's plugin API and test context the plugin uses. |

| Member | Signature | Description |
|---|---|---|
| `assertExists` | `assertExists(paths: string \| string[]): void` | Throws an `AssertionError` unless every path exists. |
| `assertMissing` | `assertMissing(paths: string \| string[]): void` | Throws unless none exists. |
| `assertStored` | `assertStored(path: string, predicate?: FakeStoragePredicateArg): void` | Throws unless a stored file matches. |
| `assertNotStored` | `assertNotStored(path: string, predicate?: FakeStoragePredicateArg): void` | Throws if one matches. |
| `getStored` | `getStored(): Array<{ path; content: Buffer; mimeType; visibility }>` | Copies of the stored files. |
| `clear` | `clear(): void` | Wipe the fake. |

### `DriveManager`

`new DriveManager(config: DriveConfig)`; throws `E_ARCHIVE_UNKNOWN_DISK` when `default` is not a declared service.

| Member | Signature | Description |
|---|---|---|
| `use` | `use(service?: string): StorageManager` | The named disk (default one without a name), built once; its fake while one is active. |
| `fake` | `fake(service?: string): FakeStorageManager` | Swap a disk for an in-memory fake. |
| `restore` | `restore(service?: string): void` | Put the real disk back. |

### `StorageManager`

`new StorageManager(driver: StorageDriver)`. The driver contract has the same methods, minus `file`, `fromSnapshot`, `copyFromFs`, `moveFromFs` and the aliases. Every operation but `list` / `listAll` wraps a driver failure in its own `E_CANNOT_*` error (see [Errors](#errors)), the driver's error as `cause`; a refused key keeps its own code.

| Member | Signature | Description |
|---|---|---|
| `put` | `put(filePath: string, content: Buffer \| string, options?: WriteOptions): Promise<void>` | Write a file. |
| `putStream` | `putStream(filePath: string, readable: NodeJS.ReadableStream, options?: PutStreamOptions): Promise<void>` | Write from a stream. |
| `copyFromFs` / `moveFromFs` | `copyFromFs(source: string \| URL, destination: string, options?: WriteOptions): Promise<void>` | Copy (or move) a file of the local filesystem onto the disk. |
| `get` | `get(filePath: string): Promise<Buffer \| null>` | Contents, `null` when absent. |
| `getBytes` / `getArrayBuffer` | `getBytes(filePath: string): Promise<Uint8Array>` | Contents; an absent file throws `E_CANNOT_READ_FILE`, `E_ARCHIVE_NOT_FOUND` as its `cause`. |
| `getStream` | `getStream(filePath: string): Promise<NodeJS.ReadableStream>` | An absent file throws `E_CANNOT_READ_FILE`, `E_ARCHIVE_NOT_FOUND` as its `cause`. |
| `exists` | `exists(filePath: string): Promise<boolean>` | |
| `delete` | `delete(filePath: string): Promise<boolean>` | |
| `deleteAll` | `deleteAll(prefix: string): Promise<void>` | Every file under a prefix. |
| `copy` / `move` | `copy(from: string, to: string, options?: WriteOptions): Promise<void>` | Within the disk. `move` keeps the visibility. |
| `url` / `getUrl` | `url(filePath: string): Promise<string>` | Public URL for a public file, signed URL for a private one. |
| `publicUrl` | `publicUrl(filePath: string): string` | Unsigned URL, visibility ignored. |
| `getSignedUrl` | `getSignedUrl(filePath: string, options?: SignedUrlOptions): string \| Promise<string>` | Time-boxed read URL. |
| `getSignedUploadUrl` | `getSignedUploadUrl(filePath: string, options?: SignedUrlOptions): string \| Promise<string>` | Time-boxed upload URL; cloud disks only. |
| `getMetadata` / `getMetaData` | `getMetadata(filePath: string): Promise<Metadata>` | An absent file throws `E_CANNOT_GET_METADATA`, `E_ARCHIVE_NOT_FOUND` as its `cause`. |
| `getVisibility` / `setVisibility` | `setVisibility(filePath: string, visibility: Visibility): Promise<void>` | |
| `list` | `list(prefix: string): AsyncIterable<StorageEntry>` | Every file under a prefix, paged lazily. |
| `listAll` | `listAll(prefix: string, options?: ListAllOptions): Promise<ListAllResult>` | One page of files and directories. |
| `file` | `file(key: string): DriveFile` | A handle, nothing fetched. |
| `fromSnapshot` | `fromSnapshot(snapshot: FileSnapshot): DriveFile` | A handle rebuilt from a stored snapshot. |

`LocalDriver` adds `getRouteBasePath(): string` and `getSigningSecret(): string | null`.

### `DriveFile`

| Member | Signature | Description |
|---|---|---|
| `key` / `name` | `key: string` | The key, and its last segment. |
| `exists` / `get` / `getBytes` / `getArrayBuffer` / `getStream` | as on the disk | |
| `getMetaData` / `getVisibility` | as on the disk | |
| `getUrl` / `getSignedUrl` / `getSignedUploadUrl` | as on the disk | |
| `toSnapshot` | `toSnapshot(): Promise<FileSnapshot>` | Data to store and rebuild the handle from. |

## Configuration

`config/archive.ts`, read under the `archive` key.

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | — | The disk `use()` returns without a name. The generated config reads `DRIVE_DISK` (`fs` when unset). |
| `services` | `Record<string, DriveServiceFactory>` | — | Named disks, built on first use. |
| `fakes.location` | `string` | — | Accepted and not read: fakes live in memory. |
| `services.fs({ location })` | `string` | `'./storage'` | Root directory (`root` is accepted too). |
| `services.fs({ signingSecret })` | `string \| ReleasableSecret` | none | Enables `getSignedUrl` on the local disk; at least 16 characters. |
| `services.fs({ routeBasePath })` | `string` | `'/storage'` | URL path the local disk's URLs are built on. |
| `S3Config.requestTimeoutMs` / `GcsConfig.requestTimeoutMs` | `number` | `30000` | Longest silence from the provider during a request; `0` disables it. |
| `StaticConfig.prefix` | `string` | `'/static'` | URL prefix of the static middleware. |
| `StaticConfig.maxAge` | `number` | `0` | `max-age` in seconds. |

## Container bindings

| Token | Resolves to |
|---|---|
| `DriveManager` (class) | The `DriveManager` |
| `'archive.drive'` | The same `DriveManager` |
| `'drive'` | The same `DriveManager` |
| `StorageManager` (class) | The default disk |
| `'archive.storage'` | The default disk |
| `'storage'` | The default disk |

The string tokens are typed on `ContainerBindings` once `@c9up/archive` is imported.

## Errors

| Code | Raised when |
|---|---|
| [`E_ARCHIVE_INVALID_SIGNATURE`](/en/reference/errors#e-archive-invalid-signature) | A signed URL's signature is missing a part, malformed or does not match (403). |
| [`E_ARCHIVE_EXPIRED_SIGNATURE`](/en/reference/errors#e-archive-expired-signature) | A signed URL has expired (403). |
| [`E_ARCHIVE_ACCESS_DENIED`](/en/reference/errors#e-archive-access-denied) | An unsigned request asked for a private file (403). |
| [`E_ARCHIVE_INVALID_KEY`](/en/reference/errors#e-archive-invalid-key) | The signed route refused the path (403); also thrown for a key naming a visibility marker, or a `moveToDisk()` key that is not a string. |
| [`E_ARCHIVE_NOT_FOUND`](/en/reference/errors#e-archive-not-found) | No file under the key (status 404). A disk operation hands it on as the `cause` of its `E_CANNOT_*` error. |
| [`E_CANNOT_WRITE_FILE`](/en/reference/errors#e-cannot-write-file) | `put`, `putStream`, `copyFromFs` or `moveFromFs` could not write the file; the driver's error is the `cause`. |
| [`E_CANNOT_READ_FILE`](/en/reference/errors#e-cannot-read-file) | `get`, `getBytes`, `getArrayBuffer` or `getStream` could not read the file, an absent one included (`cause`: `E_ARCHIVE_NOT_FOUND`); `get` answers `null` for an absent file instead. |
| [`E_CANNOT_DELETE_FILE`](/en/reference/errors#e-cannot-delete-file) | `delete` failed; the driver's error is the `cause`. |
| [`E_CANNOT_DELETE_DIRECTORY`](/en/reference/errors#e-cannot-delete-directory) | `deleteAll` failed; the driver's error is the `cause`. |
| [`E_CANNOT_COPY_FILE`](/en/reference/errors#e-cannot-copy-file) | `copy` failed, a missing source included; the driver's error is the `cause`. |
| [`E_CANNOT_MOVE_FILE`](/en/reference/errors#e-cannot-move-file) | `move` failed, a missing source included; the driver's error is the `cause`. |
| [`E_CANNOT_CHECK_FILE_EXISTENCE`](/en/reference/errors#e-cannot-check-file-existence) | `exists` could not tell; an absent file answers `false` instead. |
| [`E_CANNOT_GET_METADATA`](/en/reference/errors#e-cannot-get-metadata) | `getMetadata` / `getMetaData` or `getVisibility` failed, an absent file included (`cause`: `E_ARCHIVE_NOT_FOUND`). |
| [`E_CANNOT_SET_VISIBILITY`](/en/reference/errors#e-cannot-set-visibility) | `setVisibility` failed; the driver's error is the `cause`. |
| [`E_CANNOT_GENERATE_URL`](/en/reference/errors#e-cannot-generate-url) | `url` / `getUrl`, `publicUrl`, `getSignedUrl` or `getSignedUploadUrl` could not build the URL (`cause`: `E_ARCHIVE_SIGNING_DISABLED`, `E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED`, `E_ARCHIVE_INVALID_EXPIRY`, …). |
| [`E_CANNOT_SERVE_FILE`](/en/reference/errors#e-cannot-serve-file) | The signed-URL route could not serve a file for a reason other than its absence (which answers 404); the failure is the `cause`. |
| [`E_ARCHIVE_PATH_TRAVERSAL_DETECTED`](/en/reference/errors#e-archive-path-traversal-detected) | A local path resolves outside the disk root, or through a link that points outside it. |
| [`E_UNALLOWED_CHARACTERS`](/en/reference/errors#e-unallowed-characters) | A key holds a control character, a backslash or an encoded separator. |
| [`E_PATH_TRAVERSAL_DETECTED`](/en/reference/errors#e-path-traversal-detected) | A key has a dot-only segment such as `..`. |
| [`E_INVALID_KEY`](/en/reference/errors#e-invalid-key) | A key is empty, or only separators, once normalised. |
| [`E_ARCHIVE_INVALID_EXPIRY`](/en/reference/errors#e-archive-invalid-expiry) | `expiresIn` is not a positive duration within bounds. |
| [`E_ARCHIVE_SIGNING_DISABLED`](/en/reference/errors#e-archive-signing-disabled) | `getSignedUrl()` on a local disk without `signingSecret`. |
| [`E_ARCHIVE_WEAK_SIGNING_SECRET`](/en/reference/errors#e-archive-weak-signing-secret) | The local `signingSecret` is shorter than 16 characters. |
| [`E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED`](/en/reference/errors#e-archive-signed-upload-unsupported) | `getSignedUploadUrl()` on a local disk. |
| [`E_ARCHIVE_INVALID_HEADER_VALUE`](/en/reference/errors#e-archive-invalid-header-value) | A header value to sign holds a control character. |
| [`E_ARCHIVE_INVALID_ROUTE_BASE_PATH`](/en/reference/errors#e-archive-invalid-route-base-path) | `routeBasePath` is not an absolute URL path. |
| [`E_ARCHIVE_PREFIX_MISMATCH`](/en/reference/errors#e-archive-prefix-mismatch) | `createSignedRouteHandler()` got a prefix other than the disk's `routeBasePath`. |
| [`E_ARCHIVE_VISIBILITY_CORRUPT`](/en/reference/errors#e-archive-visibility-corrupt) | A file's visibility record cannot be read. |
| [`E_ARCHIVE_VISIBILITY_MOVE_FAILED`](/en/reference/errors#e-archive-visibility-move-failed) | `move()` moved the file but could not write its visibility. |
| [`E_ARCHIVE_INVALID_MOVE_OPTIONS`](/en/reference/errors#e-archive-invalid-move-options) | `moveToDisk()` got options it cannot use. |
| [`E_ARCHIVE_MULTIPART_NOT_MACROABLE`](/en/reference/errors#e-archive-multipart-not-macroable) | The installed ream cannot receive `moveToDisk()`. |
| [`E_ARCHIVE_REQUEST_TIMEOUT`](/en/reference/errors#e-archive-request-timeout) | The storage provider stayed silent past `requestTimeoutMs`. |
| [`E_ARCHIVE_UNEXPECTED_RESPONSE`](/en/reference/errors#e-archive-unexpected-response) | The storage provider answered something archive cannot use. |
| [`E_ARCHIVE_UNKNOWN_DISK`](/en/reference/errors#e-archive-unknown-disk) | A disk name, or the default disk, is not configured. |
| [`E_ARCHIVE_INVALID_DRIVER`](/en/reference/errors#e-archive-invalid-driver) | `driver` is not `'local'`, `'s3'` or `'gcs'`. |
| [`E_ARCHIVE_CONFIG_MISSING`](/en/reference/errors#e-archive-config-missing) | The driver is `s3` or `gcs` and its section is missing. |
| [`E_ARCHIVE_PROVIDER_NOT_REGISTERED`](/en/reference/errors#e-archive-provider-not-registered) | `boot()` ran before `register()`. |
| [`E_ARCHIVE_TEMPLATE_ENGINE`](/en/reference/errors#e-archive-template-engine) | The template helpers cannot be published on inker. |
| [`E_ARCHIVE_REMOTE_FAILED`](/en/reference/errors#e-archive-remote-failed) | S3 or GCS refused a request or reported a failure; the provider's HTTP status is in `providerStatus`, while `status` stays 500. |
| [`E_ARCHIVE_INVALID_DRIVER_CONFIG`](/en/reference/errors#e-archive-invalid-driver-config) | `S3Driver` got neither `region` nor `endpoint`, or `GcsDriver` lacks `bucket` or the service account's `client_email` / `private_key`. |
| [`E_ARCHIVE_CONTENT_LENGTH_EXCEEDED`](/en/reference/errors#e-archive-content-length-exceeded) | `putStream()` read more bytes than its declared `contentLength`. |
| [`E_ARCHIVE_INVALID_STATIC_PREFIX`](/en/reference/errors#e-archive-invalid-static-prefix) | `StaticMiddleware` was given an empty `prefix`. |
| [`E_ARCHIVE_NOT_BOOTED`](/en/reference/errors#e-archive-not-booted) | The `storage` service was read before `ArchiveProvider` booted. |
| [`E_ARCHIVE_INVALID_PREDICATE`](/en/reference/errors#e-archive-invalid-predicate) | A fake assertion got an empty `contentContaining`, which would match every file. |
| [`E_ARCHIVE_INTERNAL`](/en/reference/errors#e-archive-internal) | An internal invariant broke: a bug in archive. |

Each code is a class of the `errors` namespace and a `@c9up/flare` `Exception`, with status 500 unless the table says otherwise: branch on `error.code` or on `error instanceof errors.E_*`. The advice an error carries is in `help`; for `E_UNALLOWED_CHARACTERS`, `help` names the refused character. A fake's `assertExists()`, `assertMissing()`, `assertStored()` and `assertNotStored()` throw `node:assert`'s `AssertionError`.

## Migration

- `ArchiveError` is gone: test `error.code`, or `error instanceof errors.E_ARCHIVE_*` with `import { errors } from '@c9up/archive'`.
- `ArchiveRemoteError` becomes `errors.E_ARCHIVE_REMOTE_FAILED`; `providerStatus` is unchanged.
- `error.hint` becomes `error.help`.
- The key refusals use new codes: `E_ARCHIVE_UNALLOWED_CHARACTERS` becomes `E_UNALLOWED_CHARACTERS`; a `..` segment raises `E_PATH_TRAVERSAL_DETECTED` and an empty key `E_INVALID_KEY`, where both raised `E_ARCHIVE_PATH_TRAVERSAL_DETECTED` / `E_ARCHIVE_INVALID_KEY` before.
- `E_ARCHIVE_NOT_FOUND` now has status 404.
- Each disk operation now wraps a driver failure in its own error, the driver's as `cause`: `E_CANNOT_WRITE_FILE`, `E_CANNOT_READ_FILE`, `E_CANNOT_DELETE_FILE`, `E_CANNOT_DELETE_DIRECTORY`, `E_CANNOT_COPY_FILE`, `E_CANNOT_MOVE_FILE`, `E_CANNOT_CHECK_FILE_EXISTENCE`, `E_CANNOT_GET_METADATA`, `E_CANNOT_SET_VISIBILITY`, `E_CANNOT_GENERATE_URL` (status 500). `E_ARCHIVE_NOT_FOUND`, `E_ARCHIVE_REMOTE_FAILED` and errno errors now reach you as that `cause`: read `error.cause` where you tested the error itself. A refused key keeps its own code.
- The signed-URL route throws `E_CANNOT_SERVE_FILE` for a file it cannot serve, other than an absent one.
- The key refusals read as the storage library writes them: `The key "a\\b" has unallowed characters` (the refused character is in `help`), `Path traversal segment detected in key "../a"`, `Invalid key "//". After normalization results in an empty string`.
- `E_ARCHIVE_ASSERTION_FAILED` is gone: `assertStored()` / `assertNotStored()` throw `node:assert`'s `AssertionError`, as `assertExists()` / `assertMissing()` already did.

## See also

- [Drive](/en/guides/digging-deeper/drive)
- [File uploads](/en/guides/basics/file-uploads)
- [Testing](/en/guides/testing/introduction)
