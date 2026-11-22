# Fichiers statiques

Ce guide couvre le service des fichiers statiques.

## Fichiers statiques

Enregistre le provider et `public/` est servi — c'est toute l'installation.

```ts
// reamrc.ts
providers: [() => import('@c9up/ream/storage/provider')]
```

`public/logo.png` répond alors à `GET /logo.png`. Aucune route n'est déclarée
pour lui, et une requête qui ne correspond à aucun fichier passe au routeur sans
être touchée.

Les défauts, réglables dans `config/static.ts` :

```ts
import { defineStaticConfig } from '@c9up/ream'

export default defineStaticConfig({
  maxAge: 86_400_000,   // millisecondes ; `Cache-Control: max-age` est en secondes
  immutable: true,      // honoré uniquement avec un maxAge
})
```

| Option | Défaut | Rôle |
| --- | --- | --- |
| `enabled` | `true` | `false` fait tout passer au suivant |
| `root` | `public/` | Répertoire servi |
| `acceptRanges` | `true` | `206` sur `Range`, pour se déplacer dans un audio ou une vidéo |
| `cacheControl` | `true` | Émet `Cache-Control` ; `false` ignore `maxAge` et `immutable` |
| `dotFiles` | `'ignore'` | `'deny'` répond 403, `'allow'` les sert |
| `etag` | `true` | `ETag` et `If-None-Match` |
| `extensions` | aucune | Liste de **repli** : `['html']` fait servir `about.html` sur `/about` |
| `immutable` | `false` | Ajoute `immutable` au `Cache-Control` |
| `index` | `'index.html'` | Fichier d'index d'un répertoire ; `false` désactive |
| `lastModified` | `true` | `Last-Modified` et `If-Modified-Since` |
| `maxAge` | `0` | Millisecondes |
| `prefix` | aucun | Ne servir que sous un préfixe d'URL |

`extensions` est une liste de repli, pas une liste blanche — il n'y a pas de
liste blanche et toutes les extensions sont servies. Ce qui garde un fichier
privé, c'est de ne pas le publier ici.

### Ce qui est inatteignable

Une requête ne peut pas sortir de la racine. La traversée est normalisée avant
toute ouverture, formes encodées comprises (`%2e%2e%2f`), et une séquence
malformée est refusée plutôt que levée. Un lien symbolique placé dans la racine
et pointant dehors est refusé, fichier comme répertoire, de même qu'un
répertoire voisin qui partage seulement un préfixe de nom avec la racine.

Le fichier est ouvert avec `O_NOFOLLOW` et ses métadonnées lues sur le
descripteur plutôt que relues par chemin : les octets servis sont donc ceux qui
ont passé les contrôles — un lien substitué après coup fait échouer l'ouverture
au lieu de détourner la lecture.

Les fichiers cachés sont ignorés par défaut, donc un `.env` qui atterrit dans le
répertoire servi n'est pas publié par accident. La règle porte sur le chemin
décodé : `/%2eenv` est le même fichier caché que `/.env`. Un fichier sans point initial
l'est : le répertoire est le répertoire public.
