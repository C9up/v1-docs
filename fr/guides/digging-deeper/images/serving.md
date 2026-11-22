# Servir des images

Ce guide couvre le service des images à une page :

- Rien n'est monté sans le demander
- Chaque axe est sur liste blanche
- Ce qui revient
- Ce que coûte une variante

## Servir des images à une page

Une page qui propose une douzaine de largeurs par image a besoin que ces largeurs existent. Le bloc `serve` monte une route qui les produit à la demande :

```ts
// config/images.ts
export default defineConfig({
  quality: 82,
  serve: {
    roots: [app.publicPath('photos')],
    cacheDir: app.tmpPath('images'),
  },
})
```

C'est tout ce dont [l'`Image` de Nebula](/fr/nebula/components/image) a besoin — son résolveur par défaut pointe déjà sur `/__image`, et l'échelle de largeurs que les deux utilisent est la même.

Une requête nomme une source, une largeur, et éventuellement un format et une qualité :

```
/__image?src=hero.jpg&w=1280&f=webp&q=82
```

`src` est un chemin sous les racines. Une barre oblique initiale est acceptée, si bien que le chemin qu'une page utilise déjà pour un fichier public fonctionne tel quel : `src=/photos/hero.jpg` et `src=photos/hero.jpg` désignent le même fichier. Jamais deux — `//hote/a.png` est une URL relative au protocole, et refusée comme telle.

La réponse est redimensionnée, réencodée, marquée d'un `ETag` et déclarée `immutable` pour un an. Le tag couvre la taille et la date de modification de la source : remplacer un fichier sur le disque invalide donc toutes ses variantes sans que personne ne vide de cache — ce qui compte, puisque l'URL ne porte aucune version et que rien d'autre ne le ferait.

### Rien n'est monté sans le demander

Il n'y a pas de bloc `serve` par défaut. Une route qui lit des fichiers sur le disque et dépense du CPU à la demande n'est pas quelque chose qu'un paquet doit ajouter à une application sous prétexte qu'il est installé. En déclarer une sans `roots` fait échouer le démarrage au lieu de le laisser passer : elle répondrait 404 à chaque image, et cette erreur se trouve mieux au démarrage qu'en production.

Hors de Ream il n'y a pas de `router` dans le conteneur, et rien n'est monté non plus. Branche-la toi-même :

```ts
import { registerImageRoute } from '@c9up/prism'

registerImageRoute(router, images, { roots: [publicDir] })
```

### Chaque axe est sur liste blanche

Un endpoint de transformation ouvert est une bombe à cache avant d'être une fonctionnalité. Tout ce qu'un appelant peut faire varier est une dimension d'un cache que personne n'a bornée — dix mille requêtes pour dix mille largeurs, c'est dix mille décodages et dix mille fichiers, depuis une seule boucle `curl`.

Rien n'est donc validé pour sa vraisemblance ; chaque axe est vérifié contre une liste :

| Paramètre | Borné par | Défaut |
|---|---|---|
| `src` | se résout à l'intérieur de `roots` | rien n'est atteignable |
| `w` | `widths` | les 23 largeurs que Nebula génère |
| `f` | `formats` | AVIF, WebP, JPEG, PNG |
| `q` | `qualities` | l'unique `quality` configurée |

Le nombre de réponses distinctes reste donc à (fichiers × largeurs × formats × qualités), un nombre que tu as choisi. Tout ce qui sort des listes est un 400 et n'est jamais décodé — refuser avant le travail est tout l'intérêt. Les paramètres sont lus comme de simples chiffres décimaux : `0x190` et `4e2` sont refusés au lieu de devenir discrètement 400.

La hauteur et le recadrage sont absents à dessein. Ce sont les deux axes qu'on ne peut pas mettre sur liste blanche sans rendre le composant inutilisable, et aucun n'est nécessaire : une image responsive se recadre avec `object-fit`, dans le navigateur, gratuitement.

Un `src` qui sort de sa racine et un `src` qui ne nomme rien reçoivent le même 404. Les distinguer, c'est la façon dont un appelant cartographie le disque. Le contrôle porte aussi sur le chemin réel du fichier : un lien symbolique placé dans une racine et pointant au-dehors — laissé par une archive extraite dans un dossier d'upload, un volume partagé — répond 404, tandis qu'un lien qui reste dans la racine, ou une racine qui est elle-même un lien, fonctionne.

### Ce qui revient

Jamais plus grand que la source. Le composant propose une variante 2x sans savoir quelle taille fait l'original, et y répondre par un agrandissement serait pire que d'y répondre par l'original — plus d'octets, pas plus de détail. Une demande de 2560 px sur une source de 800 px renvoie 800 px.

Jamais d'EXIF. Le moteur réencode à partir des pixels décodés et les métadonnées n'y survivent pas : coordonnées GPS, numéros de série et horodatages n'atteignent pas la page. Une photo de vacances porte les coordonnées de la maison, et une miniature publique est exactement l'endroit où ça ressort.

Jamais autre chose que ce que le moteur a écrit. Un fichier qui n'est pas une image — un SVG, un `.env` qui traîne dans une racine — reçoit le même 404 qu'un fichier absent. Une image que le moteur refuse — au-delà du plafond de pixels, corrompue, dans un format que l'application n'accepte pas — reçoit un 422 `E_PRISM_IMAGE_UNPROCESSABLE`. Aucun n'est jamais envoyé tel quel : l'original d'un fichier dont le rendu a échoué est exactement le fichier que personne n'a vérifié, le SVG qui contient un script, la photo qui porte encore son bloc GPS. Les refus sont `Cache-Control: no-store`.

Le type de contenu est le format écrit par le moteur, jamais l'extension du fichier, et chaque réponse porte `Content-Security-Policy: default-src 'none'; sandbox` et `X-Content-Type-Options: nosniff`.

### Ce que coûte une variante

Les listes blanches bornent le nombre de réponses, pas le coût d'en produire une ni la fréquence à laquelle on la produit. Un encodage AVIF, ce sont des secondes de CPU sur le pool de threads de libuv — les quatre threads qui servent aussi les appels fichier, DNS et crypto de l'application. Donc :

- **Une variante n'est rendue qu'une fois.** Sa clé est la largeur qu'elle aura vraiment : 3200, 3840 et 5120 d'une source de 3000 px sont la même image et un seul rendu. La même variante demandée plusieurs fois en même temps n'est décodée qu'une fois.
- **Il y a toujours un cache.** Avec `cacheDir`, les variantes sont gardées sur le disque, un dossier par source ; remplacer une source supprime les variantes de sa version précédente quand les nouvelles sont écrites, si bien qu'un avatar renvoyé au même chemin ne s'accumule pas. Sans `cacheDir`, elles sont gardées en mémoire jusqu'à `memoryCacheBytes` (32 Mio), les moins récemment utilisées partant les premières.
- **Les rendus passent quelques-uns à la fois.** `concurrency` (2) rendus tournent en même temps, `queueLimit` (64) attendent ; au-delà, la réponse est un 503 `E_PRISM_IMAGE_BUSY` avec `Retry-After`, plutôt qu'une attente plus longue pour tout le monde.
- **Identifier une source est borné aussi.** Ses 64 premiers Kio sont lus pour distinguer une image de tout le reste ; une vidéo ou une archive posée dans une racine coûte cette lecture, une fois par version du fichier — la réponse, refus compris, est retenue. Une image plus grande n'est lue en entier qu'à l'intérieur de la porte de rendu ci-dessus, si bien que `concurrency` x `limits.maxBytes` est le maximum que les lectures de sources tiennent à la fois, et la même source demandée plusieurs fois en même temps n'est lue qu'une fois.
- **L'AVIF est encodé à l'`effort` 1** (0 le plus rapide, 9 le plus lent) : l'image est encodée pendant qu'un visiteur attend, et l'effort 4 prend environ quatre fois plus de temps pour des octets à un pour cent près.

| Option | Défaut | |
|---|---|---|
| `cacheDir` | — | variantes sur le disque |
| `memoryCacheBytes` | 32 Mio | cache en mémoire quand il n'y a pas de `cacheDir` ; 0 le coupe |
| `concurrency` | 2 | rendus simultanés ; à garder sous `UV_THREADPOOL_SIZE` |
| `queueLimit` | 64 | rendus en attente avant un 503 |
| `effort` | 1 | effort d'encodage AVIF, 0–9 |
