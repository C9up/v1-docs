# Archive — File Storage

Archive is the file-storage module of the Ream ecosystem (`@c9up/archive`), modeled after AdonisJS Drive.

## Configuration

Author your disks with `defineConfig` in `config/drive.ts`:

```ts
// config/drive.ts
import { defineConfig } from '@c9up/archive'

export default defineConfig({
  default: 'local',
  disks: {
    local: { driver: 'local', root: './storage' },
  },
})
```

> **Deliberate deviation from AdonisJS Drive.** Archive ships a single-disk
> surface and uses the driver key `local` (AdonisJS uses `fs`). This is leaner on
> purpose — multi-disk fan-out is a future concern.

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
