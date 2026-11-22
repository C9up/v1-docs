# Introduction

Ce guide couvre les images avec prism :

- Capacités
- Configurer
- API principale
- Checklist de production

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
- QR codes en SVG, PNG, WebP ou AVIF, stylés ou simples, avec un logo

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
plusieurs backends. [Vellum](/fr/guides/digging-deeper/pdf/) prend la même forme pour la
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
| `format` | le format lu depuis le CONTENU, l'un des quinze noms de [Formats](/fr/guides/digging-deeper/images/formats#formats) ; une image hors de `allowedFormats` (par défaut `jpeg`, `png`, `webp`) lève `E_PRISM_FORMAT_NOT_ALLOWED` à la place |
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

Aucun réglage n'est converti en douce en chemin vers le moteur : NaN, un infini,
une valeur qui déborde le flottant 32 bits du moteur, ou une fraction là où un
entier est attendu (`brighten`, `hueRotate`, `rotate`, le `threshold` de
`sharpen`) est refusé avec `E_PRISM_INVALID_OPERATION`, et l'`opacity` d'une
composition doit être comprise entre 0 et 1. Un sigma vaut 0 ou un nombre
normal — un sigma sous-normal comme `1e-40` est refusé plutôt que confié au
flou — et `sharpen` exige un sigma supérieur à 0.

### Vignettes

```ts
await images.edit(photo).thumbnail({ width: 32, height: 32 }).toFormat('webp')
```

Un filtre boîte plutôt que Lanczos : plusieurs fois moins cher et visiblement
plus doux, ce qui est le bon arbitrage pour un avatar de 32 px et le mauvais
pour une bannière de 1200. `exact: true` ignore le rapport d'aspect, comme
`fit: 'fill'`.

## Checklist de production

- fixer `maxPixels` d'après ce que votre stockage et votre mémoire encaissent
  réellement, pas d'après le défaut
- appeler `inspect()` avant d'accepter un upload, et rejeter sur ses erreurs
- ne jamais dériver un nom de fichier stocké de celui du client — le format que
  le moteur rapporte est celui auquel se fier
- préférer un binaire publié : il embarque dav1d, une compilation locale non
