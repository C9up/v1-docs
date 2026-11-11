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

## Visibilité et URLs signées

Chaque objet stocké est `public` ou `private`. Passez `visibility` à
l'écriture, ou changez-la ensuite :

```ts
await disk.put('invoices/42.pdf', bytes, { visibility: 'private' })
await disk.setVisibility('avatars/1.png', 'public')
const visibility = await disk.getVisibility('invoices/42.pdf') // 'private'
```

Sur le disque local, un fichier sans marqueur de visibilité est `public` ; un
fichier rendu privé porte un marqueur à côté de lui. Sur S3, la visibilité est
l'ACL de l'objet (`public-read` ou `private`), et un objet dont l'ACL ne se lit
pas compte comme privé.

`url(path)` suit la visibilité : un fichier public reçoit son URL simple, un
fichier privé une URL signée. `getSignedUrl(path, { expiresIn })` signe
explicitement ; `expiresIn` est un nombre de secondes ou une durée en texte
(`'30m'`, `'7 days'`), 5 minutes par défaut, entre 1 seconde et 7 jours :

```ts
const link = await disk.getSignedUrl('invoices/42.pdf', { expiresIn: '30m' })
```

Le disque local signe avec son `signingSecret` (HMAC-SHA256). Sans lui,
`getSignedUrl` lève `E_ARCHIVE_SIGNING_DISABLED` ; les autres méthodes
fonctionnent toujours.

### Servir le disque local

Un disque local construit ses URLs sous son `routeBasePath` — `/storage` sauf
si `services.fs({ routeBasePath })` dit autre chose. Rien ne sert ce chemin
tant que vous ne montez pas la route signée de `@c9up/archive/signed-route`.
Elle lit le préfixe sur le driver, sert les fichiers publics, refuse un fichier
privé sauf si l'URL porte une signature valide, et envoie le fichier en flux
avec un ETag :

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

Le handler lève dès sa construction quand le driver n'a pas de
`signingSecret`, et répond `E_ARCHIVE_PREFIX_MISMATCH` quand une option
`prefix` contredit le `routeBasePath` du driver (laissez `prefix` de côté).
Une requête refusée reçoit un corps JSON `{ error: { code, message } }` :

| Statut | Code | Quand |
| --- | --- | --- |
| 403 | `E_ARCHIVE_INVALID_SIGNATURE` | La signature, son expiration ou une surcharge d'en-tête signée est mal formée ou ne correspond pas |
| 403 | `E_ARCHIVE_EXPIRED_SIGNATURE` | La signature est valide mais son `exp` est dépassé |
| 403 | `E_ARCHIVE_ACCESS_DENIED` | Une requête non signée vers un fichier privé |
| 403 | `E_ARCHIVE_INVALID_KEY` | Le chemin ne nomme aucune clé que le disque adresse |
| 404 | `E_ARCHIVE_NOT_FOUND` | Une signature valide pour un fichier qui n'est pas stocké |

Une requête non signée vers un nom qui n'est pas stocké passe au middleware
suivant.

### Fichiers statiques

`StaticMiddleware` sert un répertoire de ressources (`root`), sous `prefix`
(`/static` par défaut), avec un `max-age` réglé par `maxAge` (0 par défaut : le
navigateur garde les octets et les revalide par l'ETag) :

```ts
import { StaticMiddleware } from '@c9up/archive'

const assets = new StaticMiddleware({ root: 'public', prefix: '/assets' })
server.use([assets.handle.bind(assets)])
```

Pointez-le uniquement sur des ressources publiques, jamais sur le répertoire
d'un disque local. Il ne vérifie aucune signature : il refuse un fichier dont
le marqueur de visibilité dit privé et ne sert jamais les marqueurs eux-mêmes,
mais tout le reste sous `root` est servi à quiconque le demande. Les fichiers
privés passent par la route signée.

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
