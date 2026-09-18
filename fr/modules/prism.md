# Prism — Images

Prism est la couche de traitement d'images de l'écosystème Ream
(`@c9up/prism`). Redimensionner, convertir, recadrer, composer et filigraner,
sur un moteur Rust.

## Capacités

- redimensionnement à quatre modes d'ajustement, la dimension absente étant déduite
- conversion entre JPEG, PNG et WebP, avec qualité
- recadrage, rotation par angles droits, retournement
- composition d'une autre image, avec opacité
- filigrane texte à partir d'une police fournie par l'appelant
- lecture de l'en-tête d'une image sans la décoder
- auto-orientation EXIF, et métadonnées supprimées à la sortie

## Configurer

```ts
// config/images.ts
import { defineConfig } from '@c9up/prism'
import env from '#start/env'

export default defineConfig({
  limits: {
    maxPixels: Number(env.get('IMAGE_MAX_PIXELS', '50000000')),
    maxBytes: 64 * 1024 * 1024,
  },
  quality: 82,
  autoOrient: true,
})
```

```ts
// reamrc.ts
providers: [() => import('@c9up/prism/provider')]
```

`ream configure @c9up/prism` écrit les deux et déclare `IMAGE_MAX_PIXELS`.

La configuration est plate — pas de `default`, pas de `use()`. Il n'y a qu'un
moteur, et la forme multi-driver appartient à un module qui a réellement
plusieurs backends. [Vellum](/fr/modules/vellum) prend la même forme pour la
même raison.

## API principale

```ts
import images from '@c9up/prism/services/main'
```

### Un pipeline

```ts
const thumb = await images
  .edit(upload)
  .resize({ width: 300, height: 300, fit: 'cover' })
  .toFormat('webp')
```

Un pipeline est inerte tant qu'on ne lui demande pas d'octets. Tout ce qui est
empilé franchit alors la frontière Rust **une seule fois** : un
redimensionnement suivi d'un filigrane décode et encode une fois, sur un thread
de travail, donc la boucle d'événements n'attend jamais le rééchantillonnage.

### Inspecter avant d'accepter

```ts
const meta = images.inspect(upload)
```

| Champ | Signification |
|---|---|
| `width` / `height` | tels que l'en-tête les déclare |
| `orientedWidth` / `orientedHeight` | après application de la rotation EXIF |
| `format` | `jpeg`, `png` ou `webp`, lu depuis le CONTENU |
| `orientation` | orientation EXIF 1-8 ; `1` s'il n'y en a pas |
| `hasAlpha` | si le format porte la transparence |

Ne lit que l'en-tête et n'alloue jamais de tampon de pixels : assez peu coûteux
pour tourner sur chaque upload. Les deux paires de dimensions comptent : une
photo de téléphone en portrait déclare des dimensions en paysage plus une
balise disant de la tourner, et une galerie construite sur le seul en-tête se
trompe de rapport pour chaque photo de téléphone.

### Ajustement

| `fit` | Résultat |
|---|---|
| `cover` (défaut) | remplit la boîte, rogne le débordement, centré |
| `contain` | plus grande taille tenant dans la boîte |
| `fill` | exactement la taille demandée — déforme |
| `inside` | comme `contain`, mais n'agrandit jamais |

Donnez une dimension et l'autre suit le rapport d'aspect.

### Géométrie

```ts
await images.edit(photo)
  .crop({ x: 10, y: 10, width: 200, height: 200 })
  .rotate(90)          // multiples de 90 ; -270 et 450 sont normalisés
  .flip('horizontal')
  .toFormat('png')
```

Un recadrage qui sort de l'image est **refusé**, pas rogné. Le rogner rendrait
une image plus petite que demandé sans rien dire — une vignette qui a
silencieusement perdu son sujet.

### Composition et filigrane

```ts
await images.edit(photo)
  .composite({ image: logo, x: 20, y: 20, opacity: 0.6 })
  .watermarkText({ text: 'ACME', font, size: 28, x: 20, y: 60 })
  .toFormat('png')
```

Aucune police n'est embarquée — passez les octets. En livrer une lierait chaque
consommateur à sa licence et ajouterait des mégaoctets pour la majorité qui ne
dessine jamais de texte.

**Le texte n'est pas façonné.** Les glyphes sont cherchés caractère par
caractère, crénés et avancés de gauche à droite. C'est correct pour le latin,
le cyrillique et le grec, et faux pour toute écriture demandant un façonnage ou
un réordonnancement : l'arabe rend non lié, le devanagari et le thaï placent
mal leurs signes, le droite-à-gauche sort inversé. Un filigrane est court et
choisi par l'exploitant, donc l'arbitrage est délibéré — apposer du texte
fourni par l'utilisateur dans une langue quelconque demande un moteur de
façonnage que ce paquet ne porte pas.

### Filtres

```ts
await images.edit(photo)
  .grayscale()
  .blur(2)                              // gaussien, précis et lent
  .fastBlur(2)                          // approximation par boîte, bien moins cher
  .sharpen({ sigma: 2, threshold: 5 })  // masque flou
  .brighten(20)                         // -255 à 255
  .contrast(15)                         // -255 à 255
  .hueRotate(90)                        // degrés, circulaire
  .invert()
  .filter3x3([0, -1, 0, -1, 5, -1, 0, -1, 0])
  .toFormat('png')
```

Le `threshold` de `sharpen` supprime l'accentuation sous un certain écart de
contraste — c'est ce qui empêche un masque flou d'amplifier le bruit du capteur
dans les zones plates, un ciel dégagé étant la victime habituelle.

Chaque réglage numérique est borné, parce que chacun arrive d'une requête : un
sigma de 1000 sur une image 4000x3000, ce sont des minutes de CPU sur un thread
de travail. Le rayon de flou est plafonné, luminosité et contraste sont
vérifiés, et un noyau 3x3 doit porter exactement neuf valeurs finies. La teinte
fait exception : elle est circulaire, donc 400 degrés valent 40 plutôt qu'une
erreur.

### Vignettes

```ts
await images.edit(photo).thumbnail({ width: 32, height: 32 }).toFormat('webp')
```

Un filtre boîte plutôt que Lanczos : plusieurs fois moins cher et visiblement
plus doux, ce qui est le bon arbitrage pour un avatar de 32 px et le mauvais
pour une bannière de 1200. `exact: true` ignore le rapport d'aspect, comme
`fit: 'fill'`.

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

C'est tout ce dont `Image` de [Nebula](/fr/modules/nebula) a besoin — son résolveur par défaut pointe déjà sur `/__image`, et l'échelle de largeurs que les deux utilisent est la même.

Une requête nomme une source, une largeur, et éventuellement un format et une qualité :

```
/__image?src=hero.jpg&w=1280&f=webp&q=82
```

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

Un `src` qui sort de sa racine et un `src` qui ne nomme rien reçoivent le même 404. Les distinguer, c'est la façon dont un appelant cartographie le disque.

### Ce qui revient

Jamais plus grand que la source. Le composant propose une variante 2x sans savoir quelle taille fait l'original, et y répondre par un agrandissement serait pire que d'y répondre par l'original — plus d'octets, pas plus de détail. Une demande de 2560 px sur une source de 800 px renvoie 800 px.

Jamais d'EXIF. Le moteur réencode à partir des pixels décodés et les métadonnées n'y survivent pas : coordonnées GPS, numéros de série et horodatages n'atteignent pas la page. Une photo de vacances porte les coordonnées de la maison, et une miniature publique est exactement l'endroit où ça ressort.

Un fichier que le moteur ne sait pas réencoder — un SVG, par exemple — est transmis tel quel avec son propre type de contenu. Il a déjà passé le contrôle de racine, et un 415 à cet endroit donnerait une image cassée pour un fichier qui se sert très bien en l'état.

La même variante demandée plusieurs fois en même temps n'est décodée qu'une fois. Une page contenant un `<picture>` en résout plusieurs dans le même tick, et sans cela la première visite décode chaque image autant de fois qu'elle apparaît.

## Sûreté

Chaque octet arrivant ici vient d'un upload, et les gardes s'exécutent avant
toute allocation.

**Le format vient du contenu**, jamais d'un nom de fichier ni d'un
`Content-Type` — les deux sont fournis par celui qui a fourni les octets.

**Trois décodeurs, sur liste blanche.** Chaque décodeur compilé est une surface
d'analyse exposée à une entrée hostile. Un format que personne n'a demandé est
un passif, pas une fonctionnalité — un GIF est une image parfaitement valide et
reste refusé.

**Un plafond de pixels, vérifié sur l'en-tête.** Un PNG de 40 Ko peut déclarer
50000x50000, et le décoder demande dix gigaoctets avant que quoi que ce soit ne
proteste. Le produit est calculé en 64 bits : en 32 il déborde vers un petit
nombre pour exactement la plus grande image exprimable, et le test passerait.

**Un filet anti-panique sur chaque frontière.** Une panique qui traverse NAPI
fait tomber le processus Node ; sur un thread libuv elle l'avorte purement.

**Les recouvrements sont gardés comme l'entrée** — un filigrane par locataire
est un upload lui aussi.

**Les métadonnées ne survivent jamais** au passage dans le moteur. Réencoder
depuis des pixels décodés n'emporte ni EXIF, ni GPS, ni XMP, ni profil
colorimétrique. Une photo de vacances porte les coordonnées de la maison :
les supprimer est le bon défaut, pas une option à activer.

## Formats

Quinze décodeurs sont compilés — `jpeg png webp gif bmp ico tiff tga qoi pnm
dds farbfeld hdr openexr avif` — et quatorze savent encoder (`image` ne livre
pas d'encodeur DDS, donc le nommer en sortie est refusé d'emblée).

**Lesquels une application accepte est une décision d'exécution, et le défaut
est de trois.** Chaque décodeur est une surface d'analyse atteignable depuis ce
qu'un formulaire d'upload reçoit, donc élargir se fait délibérément :

```ts
export default defineConfig({
  limits: { allowedFormats: ['jpeg', 'png', 'webp', 'gif'] },
})
```

Un nom inconnu lève au lieu d'être ignoré — une coquille qui rétrécirait
silencieusement la liste se manifesterait par des uploads refusés en production
sans raison visible.

### Un qui s'écrit mais ne se relit pas

Prism identifie par le CONTENU, jamais par un nom de fichier, et ça a un prix :
un format dont les octets ne portent pas de signature en tête ne peut pas être
reconnu.

**TGA** place son identifiant dans un *pied de fichier* : il n'est pas reconnu
du tout. Il s'écrit sans jamais pouvoir être accepté en upload — mettre `tga`
dans `allowedFormats` ne rend pas un TGA téléversable.

AVIF était dans ce paragraphe. Il fait l'aller-retour désormais, et c'est
pourquoi ce paquet prend une dépendance système — voir plus bas.

### Le WebP est avec perte par défaut

Un WebP sans perte pèse plusieurs fois le poids d'un WebP avec perte, et le
poids est toute la raison d'utiliser ce format. `image` ne livre pas
d'encodeur avec perte, donc ce chemin passe par libwebp. `quality: 100`
sélectionne le sans-perte — la seule valeur qui ne peut pas vouloir dire
« compresse un peu ».

### Ce qu'il faut pour l'installer : rien

Les binaires publiés embarquent leurs codecs. libwebp est vendorisée, et
libdav1d — le *décodeur* AVIF, sans lequel un AVIF s'écrirait sans jamais
pouvoir se relire — est compilée depuis les sources et liée statiquement par le
workflow de release. `ldd` sur un binaire publié ne liste que libc, libm et
libgcc, et c'est tout.

### Ce qu'il faut pour le compiler depuis les sources

Seulement si aucun binaire précompilé ne correspond à la plateforme, ou pour
travailler sur la crate elle-même. libwebp ne coûte toujours qu'un compilateur
C. libdav1d est celle qui demande quelque chose, et il y a deux façons de la
lui donner :

- **une libdav1d système** — `libdav1d-dev` sur Debian, `dav1d` sur Homebrew,
  le paquet vcpkg sur Windows. `dav1d-sys` la trouve via pkg-config. Le binaire
  produit *dépend* alors de cette bibliothèque à l'exécution, ce qui convient à
  une compilation locale et explique pourquoi ce n'est pas ainsi qu'on publie.
- **`SYSTEM_DEPS_DAV1D_BUILD_INTERNAL=auto`**, avec `meson`, `ninja` et (sur
  x86) `nasm` dans le PATH. `dav1d-sys` clone dav1d et la compile en statique.
  C'est ce que fait la CI.

Un piège à connaître si une compilation part de travers : `dav1d-sys` lance
meson par un appel qui vérifie que le processus a pu *démarrer*, pas qu'il a
réussi. Sans `nasm`, meson échoue, rien n'est signalé, et l'édition de liens
retombe silencieusement sur ce qu'elle trouve d'autre sur le système. Vérifiez
que les trois outils répondent avant d'accuser la crate.

### Le poids du binaire

Les quinze formats font passer le binaire natif d'environ 2,3 Mo à 11 Mo, le
codec AVIF pour l'essentiel. Multiplié par les plateformes précompilées, c'est
le coût dominant du paquet : une application qui ne traite que du jpeg, png et
webp paie douze codecs qu'elle n'autorisera jamais. Rendre le jeu configurable
à la compilation autant qu'à l'exécution corrigerait ça, et n'a pas été fait.

## Couleur

```ts
await images.edit(photo).convertColorSpace({ to: 'display-p3' }).toFormat('png')
```

Les échantillons sont *transformés* — primaires et fonction de transfert
appliquées — et non réinterprétés. `inspect()` rapporte ce que le fichier
déclare dans `colorSpace`.

Cinq espaces : `srgb`, `linear-srgb`, `display-p3`, `dci-p3`, `rec709`. La
liste est courte parce qu'elle a été **prouvée** et non supposée : `rec2020` et
les deux transferts HDR ont été implémentés, essayés contre la bibliothèque,
trouvés en échec (« not supported » pour les primaires BT.2020) et retirés. Un
nom qui ne peut qu'échouer est pire qu'un nom absent.

**Deux choses impossibles ici**, par le modèle et non par le code :

- **`image` ne lit aucun profil ICC.** Un JPEG portant un profil Adobe RGB est
  décodé comme du sRGB, parce que le profil n'est jamais vu. Passez `from`
  quand vous en savez plus — il écrase ce que prétend le fichier au lieu de
  convertir : `convertColorSpace({ to: 'srgb', from: 'display-p3' })`.
- **Adobe RGB n'a aucun point de code CICP**, donc personne ne peut le nommer
  ici. Un travail qui en dépend demande une chaîne ICC, c'est-à-dire une autre
  dépendance.

## Profondeur de bits

```ts
await images.edit(scan).toBuffer({ format: 'png', depth: 16 })
```

Seuls PNG et TIFF portent seize bits. Ailleurs l'encodeur redescend à huit au
lieu de refuser — un pipeline qui règle `depth` une fois ne doit pas casser
quand son format de sortie change.

## Erreurs

| Code | Levée quand |
|---|---|
| `E_PRISM_EMPTY_INPUT` | rien n'a été passé |
| `E_PRISM_INPUT_TOO_LARGE` | au-delà du plafond d'octets |
| `E_PRISM_TOO_MANY_PIXELS` | l'en-tête déclare plus de pixels qu'autorisé |
| `E_PRISM_UNKNOWN_FORMAT` | les octets ne sont pas une image |
| `E_PRISM_UNSUPPORTED_FORMAT` | une vraie image, dans un format hors liste blanche |
| `E_PRISM_INVALID_GEOMETRY` | recadrage hors image, rotation hors angles droits |
| `E_PRISM_INVALID_FONT` | la police du filigrane est illisible |
| `E_PRISM_INVALID_OPERATION` | une opération à laquelle il manque un champ |
| `E_PRISM_NATIVE_REQUIRED` | le moteur Rust n'est pas installé pour cette plateforme |

## Le moteur

Rust, chargé comme un `.node` précompilé. Il n'est **pas** optionnel et il n'y
a pas de repli JavaScript : un binaire manquant lève avec les instructions de
compilation plutôt que de se dégrader silencieusement, pour qu'un déploiement
ne puisse pas se comporter différemment d'un autre. Compilation locale par
`pnpm build:napi`.

## Tests

```ts
import { fakeImages } from '@c9up/prism/testing'

const { images, restore } = fakeImages()
afterEach(restore)
```

Le vrai moteur, pas un bouchon — une assertion sur les dimensions d'une
vignette ne vaut que contre le code qui la produit.

## Checklist de production

- fixer `maxPixels` d'après ce que votre stockage et votre mémoire encaissent
  réellement, pas d'après le défaut
- appeler `inspect()` avant d'accepter un upload, et rejeter sur ses erreurs
- ne jamais dériver un nom de fichier stocké de celui du client — le format que
  le moteur rapporte est celui auquel se fier
- préférer un binaire publié : il embarque dav1d, une compilation locale non
