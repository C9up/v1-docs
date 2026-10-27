# Picture

La même image dans plusieurs formats, et le navigateur prend le premier qu'il sait lire. [Image](/fr/nebula/components/image) demande un seul format et compte sur sa prise en charge — c'est bon pour le WebP, que tout navigateur actuel lit. L'AVIF est encore plus petit et toujours pas universel : il ne peut être proposé qu'*avec* un format de repli, et c'est à cela que sert `<picture>`.

L'`<img>` en dessous est `Image` elle-même, avec toutes les props transmises. C'est voulu : le calcul du `srcset`, le `sizes`, les attributs de chargement et les classes de disposition n'ont qu'une implémentation, si bien qu'une `<source>` ne peut pas finir par proposer une échelle différente de l'image qu'elle surmonte.

```sh
ream nebula:add picture
```

Molécule · `molecules/Picture.ts` · [Image](/fr/nebula/components/image)

## Utilisation

```ts
import { Picture } from '@c9up/nebula'

Picture({ src: '/photos/hero.jpg', alt: "L'atelier à l'aube", width: 1200, height: 800 })
```

```html
<picture data-slot="picture">
  <source data-slot="picture-source" type="image/avif" srcset="…" sizes="…">
  <source data-slot="picture-source" type="image/webp" srcset="…" sizes="…">
  <img data-slot="image" src="…&f=jpeg" srcset="…" sizes="…" width="1200" height="800"
       loading="lazy" decoding="async" alt="L'atelier à l'aube">
</picture>
```

Le navigateur prend le premier `type` qu'il comprend ; celui qui n'en comprend aucun prend l'`<img>`, qui est aussi ce que lit un robot d'indexation.

## Exemples

### L'ordre des formats

L'ordre de `formats` est tout le contrat — un navigateur prend le premier `type` qu'il gère sans comparer les tailles, donc lister WebP avant AVIF signifie que personne ne reçoit jamais le fichier le plus petit.

```ts
Picture({ src: '/photos/hero.jpg', alt: '…', width: 1200, height: 800, formats: ['webp'] })
```

`formats: ['webp']` retire l'AVIF — pour un endpoint qui ne l'encode pas, ou une source pour laquelle l'AVIF ne vaut pas son temps d'encodage.

### Le repli

Le format de l'`<img>` suit l'extension de la source : une source `.png` se replie en PNG, toute autre en JPEG. Un PNG transparent aplati en JPEG arrive avec un fond noir, et précisément sur le chemin emprunté par les navigateurs qu'on vérifie le moins.

```ts
Picture({ src: '/logo.png', alt: 'Acme', width: 200, layout: 'fixed' })
// <source type="image/avif">, <source type="image/webp">, <img src="…&f=png">
```

Laissé à lui-même, le repli n'est jamais de l'AVIF ni du WebP — une source `.webp` ou `.avif` se replie en JPEG, faute de quoi un navigateur qui ne lit ni l'un ni l'autre en recevrait un. `fallbackFormat` en décide d'office :

```ts
Picture({ src: '/photos/hero.jpg', alt: '…', width: 1200, fallbackFormat: 'png' })
```

### Tout ce que fait Image

Toutes les props d'[Image](/fr/nebula/components/image) fonctionnent ici. Celles qui façonnent l'échelle — `layout`, `width`, `widths`, `densities`, `sizes`, `breakpoints`, `originalWidth`, `quality` — atteignent chaque `<source>` comme l'`<img>` ; les autres — `priority`, `fit`, `position`, `class` — vont sur l'`<img>`, le seul élément dessiné.

```ts
Picture({
  src: '/photos/hero.jpg',
  alt: "L'atelier à l'aube",
  layout: 'full-width',
  priority: true,
  quality: 70,
})
```

Une disposition qui ne produit aucune échelle — `none`, ou une image `constrained`/`fixed` sans `width` — ne rend aucune `<source>`, seulement l'`<img>`. Un `srcset` vide serait pire qu'aucun : le navigateur choisirait cette source et n'afficherait rien.

## API

### Picture

Toutes les [props d'Image](/fr/nebula/components/image#api), plus :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `formats` | `Reactive<readonly ImageFormat[]>` | `['avif', 'webp']` | Une `<source>` par format, dans cet ordre. Le meilleur d'abord. |
| `fallbackFormat` | `Reactive<ImageFormat \| undefined>` | `'png'` pour une source `.png`, sinon `'jpeg'` | Le format de l'`<img>` en dessous. |

`format`, hérité d'`Image`, est sans effet ici : `formats` et `fallbackFormat` le remplacent.

### formatFromSource

`formatFromSource(src: string): ImageFormat | undefined` — le format que revendique l'extension d'une source (`.jpg` et `.jpeg` valent `'jpeg'`), sans tenir compte d'une chaîne de requête ni d'un fragment. Une revendication, pas une preuve : seul le serveur sait ce que sont les octets, et il les relit.

### mimeType

`mimeType(format: ImageFormat): string` — `'image/avif'`, `'image/webp'`…, le `type` que porte une `<source>`.

## Accessibilité

Le `<picture>` et ses `<source>` ne sont pas exposés aux technologies d'assistance ; l'`<img>` l'est, avec l'`alt` donné à `Picture`. Tout ce qui est dit d'`alt` sur [Image](/fr/nebula/components/image#accessibilite) s'applique : obligatoire, et `''` pour une image décorative.
