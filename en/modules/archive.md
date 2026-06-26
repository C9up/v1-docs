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
