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

## Envoyer depuis le système de fichiers local

```ts
await disk.moveFromFs(request.file('avatar').tmpPath, `avatars/${user.id}.png`)
await disk.copyFromFs(new URL('./seed.png', import.meta.url), 'seed.png')
```

C'est la paire qui suit un upload multipart. `copy()` déplace **à l'intérieur**
d'un disque et ne voit pas un chemin local quand le disque est distant : ce n'est
donc pas un substitut. `moveFromFs` ne supprime la source qu'après l'écriture
réussie — un envoi échoué qui aurait aussi détruit l'unique copie n'est pas un
échange acceptable.

## Poignées de fichier et instantanés

```ts
const avatar = disk.file(`avatars/${user.id}.png`)
if (await avatar.exists()) return avatar.getUrl()

const snapshot = await avatar.toSnapshot()   // à ranger près de l'enregistrement
disk.fromSnapshot(snapshot).name             // reconstruit sans aller-retour
```

Un instantané ne porte pas la visibilité : les métadonnées reconstruites disent
donc `private`. Deviner « public » pour un fichier dont on ignore l'accès est
l'erreur qui a une conséquence.

## Délais de requête

Chaque requête S3/GCS est bornée — 30 secondes par défaut, `requestTimeoutMs`
pour changer, `0` pour désactiver. Sans borne, une connexion bloquée ne se
résout jamais : le handler qui l'attend attend indéfiniment, et il en suffit de
quelques-unes pour que le serveur cesse de servir.
