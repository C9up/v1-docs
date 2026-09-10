# Archive — File Storage

Archive is the file-storage module of the Ream ecosystem (`@c9up/archive`), modeled after AdonisJS Drive.

## Configuration

Author your disks with `defineConfig` in `config/archive.ts` — this is what
`node ace configure @c9up/archive` writes:

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

Three drivers ship: `services.fs`, `services.s3` and `services.gcs`, which are
the shape AdonisJS Drive uses.

## Main API

```ts
await storage.put('avatars/1.png', bytes)
const bytes = await storage.get('avatars/1.png')
const exists = await storage.exists('avatars/1.png')
await storage.delete('avatars/1.png')
```

### AdonisJS Drive aliases

For parity with AdonisJS Drive, Archive exposes the Adonis method names alongside
its own:

- `storage.getUrl(path)` — alias of `storage.url(path)`
- `storage.getMetaData(path)` — alias of `storage.getMetadata(path)`

```ts
const url = await storage.getUrl('avatars/1.png')        // alias of url()
const meta = await storage.getMetaData('avatars/1.png')  // alias of getMetadata()
```

## Drivers

- `local`: filesystem-backed, default driver

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
