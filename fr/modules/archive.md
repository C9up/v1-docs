# Archive — Stockage de fichiers

Archive est le module de stockage de fichiers de l'écosystème Ream (`@c9up/archive`).

## Configuration

Déclarez vos disques avec `defineConfig` dans `config/archive.ts` — c'est ce
qu'écrit `ream configure @c9up/archive` :

```ts
// config/archive.ts
import { defineConfig, services } from '@c9up/archive'
import env from '#start/env'

export default defineConfig({
  // Le disque que `drive.use()` choisit sans argument.
  default: env.get('DRIVE_DISK', 'fs'),

  services: {
    fs: services.fs({
      location: 'storage/uploads',
      // Requis pour que `getSignedUrl` réponde sur le disque local.
      signingSecret: env.get('APP_KEY'),
    }),
    s3: services.s3({ bucket: env.get('S3_BUCKET'), region: env.get('S3_REGION') }),
  },
})
```

Les disques sont nommés et indépendants : `drive.use()` atteint celui par
défaut, `drive.use('s3')` un disque nommé, et aucun ne voit les fichiers de
l'autre.

```ts
await drive.use().put('a.txt', bytes)         // disque par défaut
await drive.use('s3').put('a.txt', bytes)     // un tout autre disque
```

Trois drivers sont livrés : `services.fs`, `services.s3` et `services.gcs`.

## API principale

```ts
await storage.put('avatars/1.png', bytes)
const bytes = await storage.get('avatars/1.png')
const exists = await storage.exists('avatars/1.png')
await storage.delete('avatars/1.png')
```

### Alias de méthodes

Deux méthodes répondent aussi à un second nom :

- `storage.getUrl(path)` — alias de `storage.url(path)`
- `storage.getMetaData(path)` — alias de `storage.getMetadata(path)`

```ts
const url = await storage.getUrl('avatars/1.png')        // alias de url()
const meta = await storage.getMetaData('avatars/1.png')  // alias de getMetadata()
```

## Drivers

- `services.fs` : le système de fichiers local (`LocalDriver`)
- `services.s3` : S3 et les stockages compatibles S3 (`S3Driver`)
- `services.gcs` : Google Cloud Storage (`GcsDriver`)

Le disque que nomme `default` est celui que renvoie `drive.use()` ; rien ne
fait de `fs` le disque par défaut si la configuration ne le dit pas.

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
