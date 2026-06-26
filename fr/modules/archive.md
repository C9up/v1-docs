# Archive — Stockage de fichiers

Archive est le module de stockage de fichiers de l'ecosysteme Ream (`@c9up/archive`), calqué sur AdonisJS Drive.

## Configuration

Déclarez vos disques avec `defineConfig` dans `config/drive.ts` :

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

> **Déviation volontaire par rapport à AdonisJS Drive.** Archive expose une
> surface mono-disque et utilise la clé de driver `local` (AdonisJS utilise `fs`).
> C'est volontairement plus léger — le multi-disque est une préoccupation future.

## API principale

```ts
await storage.put('avatars/1.png', bytes)
const bytes = await storage.get('avatars/1.png')
const exists = await storage.exists('avatars/1.png')
await storage.delete('avatars/1.png')
```

### Alias AdonisJS Drive

Pour la parité avec AdonisJS Drive, Archive expose les noms de méthodes Adonis à
côté des siens :

- `storage.getUrl(path)` — alias de `storage.url(path)`
- `storage.getMetaData(path)` — alias de `storage.getMetadata(path)`

```ts
const url = await storage.getUrl('avatars/1.png')        // alias de url()
const meta = await storage.getMetaData('avatars/1.png')  // alias de getMetadata()
```

## Drivers

- `local`: adossé au système de fichiers, driver par défaut
