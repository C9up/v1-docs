# Archive — File Storage

Archive is the file-storage module of the Ream ecosystem (`@c9up/archive`).

## Configuration

Author your disks with `defineConfig` in `config/archive.ts` — this is what
`ream configure @c9up/archive` writes:

```ts
// config/archive.ts
import { defineConfig, services } from '@c9up/archive'
import env from '#start/env'

export default defineConfig({
  // The disk `drive.use()` picks when called with no argument.
  default: env.get('DRIVE_DISK', 'fs'),

  services: {
    fs: services.fs({
      location: 'storage/uploads',
      // Required before `getSignedUrl` will answer on the local disk.
      signingSecret: env.get('APP_KEY'),
    }),
    s3: services.s3({ bucket: env.get('S3_BUCKET'), region: env.get('S3_REGION') }),
  },
})
```

Disks are named and independent: `drive.use()` reaches the default one,
`drive.use('s3')` a named one, and neither sees the other's files.

```ts
await drive.use().put('a.txt', bytes)         // default disk
await drive.use('s3').put('a.txt', bytes)     // a different disk entirely
```

Three drivers ship: `services.fs`, `services.s3` and `services.gcs`.

## Main API

```ts
await storage.put('avatars/1.png', bytes)
const bytes = await storage.get('avatars/1.png')
const exists = await storage.exists('avatars/1.png')
await storage.delete('avatars/1.png')
```

### Method aliases

Two methods also answer to a second name:

- `storage.getUrl(path)` — alias of `storage.url(path)`
- `storage.getMetaData(path)` — alias of `storage.getMetadata(path)`

```ts
const url = await storage.getUrl('avatars/1.png')        // alias of url()
const meta = await storage.getMetaData('avatars/1.png')  // alias of getMetadata()
```

## Drivers

- `services.fs`: the local filesystem (`LocalDriver`)
- `services.s3`: S3 and S3-compatible object stores (`S3Driver`)
- `services.gcs`: Google Cloud Storage (`GcsDriver`)

The disk `default` names is the one `drive.use()` returns; nothing makes `fs`
the default unless the config says so.

## Visibility and signed URLs

Every stored object is `public` or `private`. Pass `visibility` when writing,
or change it afterwards:

```ts
await disk.put('invoices/42.pdf', bytes, { visibility: 'private' })
await disk.setVisibility('avatars/1.png', 'public')
const visibility = await disk.getVisibility('invoices/42.pdf') // 'private'
```

On the local disk a file with no visibility marker is `public`; a file made
private carries a marker beside it. On S3 the visibility is the object's ACL
(`public-read` or `private`), and an object whose ACL cannot be read counts as
private.

`url(path)` follows the visibility: a public file gets its plain URL, a
private one a signed URL. `getSignedUrl(path, { expiresIn })` signs
explicitly; `expiresIn` is a number of seconds or a duration string (`'30m'`,
`'7 days'`), 5 minutes by default, between 1 second and 7 days:

```ts
const link = await disk.getSignedUrl('invoices/42.pdf', { expiresIn: '30m' })
```

The local disk signs with its `signingSecret` (HMAC-SHA256). Without one,
`getSignedUrl` throws `E_ARCHIVE_SIGNING_DISABLED`; the other methods still
work.

### Serving the local disk

A local disk builds its URLs under its `routeBasePath` — `/storage` unless
`services.fs({ routeBasePath })` says otherwise. Nothing serves that path until
you mount the signed route from `@c9up/archive/signed-route`. It reads the
prefix from the driver, serves public files, refuses a private file unless the
URL carries a valid signature, and streams the file with an ETag:

```ts
// start/storage.ts
import { LocalDriver, StorageManager } from '@c9up/archive'
import { createSignedRouteHandler } from '@c9up/archive/signed-route'
import env from '#start/env'

export const driver = new LocalDriver('storage/uploads', {
  signingSecret: env.get('APP_KEY'),
})
export const uploads = new StorageManager(driver)
export const serveUploads = createSignedRouteHandler({ storage: uploads, driver })
```

```ts
// start/kernel.ts
import { serveUploads } from '#start/storage'

server.use([serveUploads])
```

The handler throws at construction when the driver has no `signingSecret`, and
answers `E_ARCHIVE_PREFIX_MISMATCH` when a `prefix` option disagrees with the
driver's `routeBasePath` (leave `prefix` out). A refused request gets a JSON
body `{ error: { code, message } }`:

| Status | Code | When |
| --- | --- | --- |
| 403 | `E_ARCHIVE_INVALID_SIGNATURE` | The signature, its expiry or a signed header override is malformed or does not match |
| 403 | `E_ARCHIVE_EXPIRED_SIGNATURE` | The signature is valid but its `exp` has passed |
| 403 | `E_ARCHIVE_ACCESS_DENIED` | An unsigned request for a private file |
| 403 | `E_ARCHIVE_INVALID_KEY` | The path names no key the disk will address |
| 404 | `E_ARCHIVE_NOT_FOUND` | A valid signature for a file that is not stored |

An unsigned request for a name that is not stored falls through to the next
middleware.

### Static files

`StaticMiddleware` serves a directory of assets (`root`), under `prefix`
(default `/static`), with `max-age` set by `maxAge` (default 0: the browser
keeps the bytes and revalidates them through the ETag):

```ts
import { StaticMiddleware } from '@c9up/archive'

const assets = new StaticMiddleware({ root: 'public', prefix: '/assets' })
server.use([assets.handle.bind(assets)])
```

Point it at public assets only, never at a local disk's directory. It has no
signature check: it refuses a file whose visibility marker says private and
never serves the markers themselves, but everything else under `root` is
served to anyone who asks. Private files are served through the signed route.

## Uploading from the local filesystem

```ts
await disk.moveFromFs(request.file('avatar').tmpPath, `avatars/${user.id}.png`)
await disk.copyFromFs(new URL('./seed.png', import.meta.url), 'seed.png')
```

This is the pair that follows a multipart upload. `copy()` moves **within** a
disk and cannot see a local path when the disk is remote, so it is not a
substitute. `moveFromFs` unlinks the source only after the write succeeded — a
failed upload that also destroyed the only copy is not a trade worth making.

## File handles and snapshots

```ts
const avatar = disk.file(`avatars/${user.id}.png`)
if (await avatar.exists()) return avatar.getUrl()

const snapshot = await avatar.toSnapshot()   // store it beside the record
disk.fromSnapshot(snapshot).name             // rebuilt without a round-trip
```

A snapshot carries no visibility, so rebuilt metadata reports `private`. Guessing
"public" for a file whose access is unknown is the error with a consequence.

## Request timeouts

Every S3/GCS request is bounded — 30 seconds by default, `requestTimeoutMs` to
change it, `0` to disable. Without a bound a stalled connection never settles:
the handler awaiting it waits forever, and enough of them stop the server serving.
