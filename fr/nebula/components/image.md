# Image

Une `<img>`, avec les attributs qui la rendent rapide déjà écrits : un `srcset` d'une douzaine de largeurs, un `sizes` qui va avec, `width`/`height` pour que la page ne saute pas à l'arrivée des octets, et `loading`/`decoding`. Une `<img src>` nue coûte deux fois à une page — elle envoie des pixels de bureau à un téléphone, et elle ne réserve aucune place avant d'arriver, si bien que tout ce qui est dessous bouge.

Le composant décide seulement *quelles* variantes demander. D'où viennent les octets, c'est l'affaire d'un résolveur que l'application installe une fois ; celui par défaut pointe sur `/__image`, l'endpoint que [Prism](/fr/modules/prism) enregistre. Pour proposer de l'AVIF avec un format de repli, utilisez [Picture](/fr/nebula/components/picture), qui rend ce composant comme son `<img>`.

```sh
ream nebula:add image
```

Atome · `atoms/Image.ts` · aucune dépendance

## Utilisation

```ts
import { Image } from '@c9up/nebula'

Image({ src: '/photos/hero.jpg', alt: "L'atelier à l'aube", width: 1200, height: 800 })
```

```html
<img data-slot="image" data-layout="constrained"
     src="/__image?src=%2Fphotos%2Fhero.jpg&w=1280&f=webp"
     srcset="/__image?src=…&w=640&f=webp 640w, … /__image?src=…&w=2560&f=webp 2560w"
     sizes="(min-width: 1200px) 1200px, 100vw"
     alt="L'atelier à l'aube" width="1200" height="800"
     loading="lazy" decoding="async" class="h-auto max-w-full">
```

`alt` est obligatoire dans le type, et ce n'est pas un geste de principe : une `<img>` sans `alt` est annoncée par un lecteur d'écran sous son nom de fichier. Une image décorative passe `alt: ''` — la chaîne vide est le balisage qui dit « ignore-moi », elle doit donc être écrite et non oubliée.

## Exemples

### Dispositions

`layout` est la seule prop à choisir délibérément. Elle décide des largeurs proposées et de ce que `sizes` en dit.

| Disposition | Comportement | Propose |
|---|---|---|
| `constrained` *(défaut)* | se réduit pour tenir, jamais au-delà de `width` | 1x, 2x, et toutes les largeurs d'appareils sous celle du 2x |
| `full-width` | toujours la largeur de son conteneur | toute l'échelle d'appareils |
| `fixed` | la taille déclarée, quel que soit l'écran | 1x et 2x |
| `none` | ni `srcset` ni `sizes` | rien |

```ts
import { Image } from '@c9up/nebula'

Image({ src: '/logo.png', alt: 'Acme', width: 48, height: 48, layout: 'fixed' })
Image({ src: '/banner.jpg', alt: '', layout: 'full-width' })
```

`full-width` est la seule disposition qui se passe de `width`. Une image `constrained` ou `fixed` sans `width` n'a aucun `srcset` — seulement son `src`. Sans `width`, ce `src` est la source telle quelle, pas une URL issue du résolveur.

Toutes les largeurs proposées sortent d'une liste fixe — une petite échelle pour les éléments qui ne font pas la largeur d'un écran (avatars, icônes, vignettes) et une échelle d'appareils au-dessus. **La largeur déclarée n'est jamais émise telle quelle.** `width: 1200` demandant 1200 et 2400, ce serait deux largeurs qu'aucune liste blanche ne contient — et mettre sur liste blanche ce qu'un auteur tape au clavier n'est pas une liste blanche. On arrondit *vers le haut*, aux barreaux qui les couvrent — 1280 et 2560 — parce qu'arrondir vers le bas est la façon dont un écran dense reçoit moins de pixels qu'il ne peut en afficher. Le `src` est arrondi de la même façon : `width: 1200` charge 1280 dans un navigateur qui ignore `srcset`.

Cette liste et le `widths` de [Prism](/fr/modules/prism) sont la même liste, et c'est la seule chose qui ne peut pas changer d'un seul côté. Une largeur que l'endpoint ne sert pas est une entrée de `srcset` qui répond 400, et une page qui retombe silencieusement sur son unique `src`.

L'échelle d'appareils est faite de vraies largeurs d'appareils, pas de nombres ronds — 828 est un iPhone XR, 1668 un iPad. C'est sa densité qui rend l'arrondi vers le haut peu coûteux : le barreau au-dessus de 2400 est 2560, six pour cent plus haut.

### Au-dessus de la ligne de flottaison

`priority` pose `loading="eager"`, `decoding="sync"` et `fetchpriority="high"` ensemble. N'en poser qu'un sur les trois est la raison habituelle pour laquelle une image de héros n'est toujours pas la première chose peinte.

```ts
import { Image } from '@c9up/nebula'

Image({ src: '/photos/hero.jpg', alt: "L'atelier à l'aube", layout: 'full-width', priority: true })
```

Un `loading`, un `decoding` ou un `fetchPriority` explicite l'emporte sur ce que `priority` poserait, attribut par attribut :

```ts
Image({ src: '/photos/hero.jpg', alt: '…', width: 800, priority: true, loading: 'lazy' })
// loading="lazy" decoding="sync" fetchpriority="high"
```

### Recadrer

L'image n'est jamais recadrée côté serveur. `fit` et `position` sont `object-fit` et `object-position`, posés en classes sur l'élément, où un recadrage ne coûte rien :

```ts
Image({
  src: '/photos/team.jpg',
  alt: "L'équipe",
  width: 400,
  height: 400,
  fit: 'cover',
  position: 'top',
  class: 'aspect-square',
})
```

### Par densité de pixels

`densities` sert des descripteurs `x` au lieu de largeurs — `1x`, `2x` — pour un élément dont la taille ne change jamais avec l'écran. Il lui faut un `width`, et l'image ne porte alors plus de `sizes` : un `srcset` en densités se décrit lui-même.

```ts
Image({ src: '/icons/badge.png', alt: 'Vérifié', width: 100, densities: [1, 2] })
// srcset="…&w=128… 1x, …&w=256… 2x"
```

`densities` et `widths` ne peuvent pas partager un `srcset` — un `srcset` qui mélange descripteurs `w` et `x` est invalide, et un navigateur qui en voit un ignore l'attribut entier. Si les deux sont donnés, `widths` l'emporte.

### Votre propre échelle

`breakpoints` remplace l'échelle d'appareils dont les largeurs sont tirées. `LIMITED_RESOLUTIONS` en est une plus courte, qui s'arrête à 2560 — sept variantes de moins à stocker et à préchauffer pour une image pleine largeur :

```ts
import { Image, LIMITED_RESOLUTIONS } from '@c9up/nebula'

Image({ src: '/banner.jpg', alt: '', layout: 'full-width', breakpoints: LIMITED_RESOLUTIONS })
```

`widths` remplace d'office la liste calculée. Accompagnez-le d'un `sizes` qui dit à quelle largeur l'image est dessinée, sinon le navigateur suppose tout l'écran :

```ts
Image({
  src: '/photos/card.jpg',
  alt: 'Le produit',
  width: 320,
  widths: [384, 640, 750],
  sizes: '(min-width: 768px) 320px, 100vw',
})
```

Une liste `widths` écrite à la main doit rester faite de largeurs que l'endpoint sert.

Passez `originalWidth` quand la largeur de la source est connue. Ce n'est qu'un raffinement : l'endpoint refuse d'agrandir quoi que ce soit, donc l'omettre coûte une URL en double servant les mêmes octets, jamais un agrandissement flou.

### Suivre un signal

Chaque attribut est lié par un accesseur : une galerie qui change de photo repointe `src` et `srcset`, et une largeur qui change recalcule l'échelle :

```ts
import { signal } from '@c9up/aurora'
import { Image } from '@c9up/nebula'

const photo = signal({ src: '/photos/1.jpg', alt: 'Le banc au bord du lac' })

Image({ src: () => photo().src, alt: () => photo().alt, width: 800, height: 600 })
```

### D'où viennent les octets

Le composant ne le sait pas. Il demande une URL à un résolveur, et celui par défaut pointe sur `/__image` — l'endpoint que [Prism](/fr/modules/prism) enregistre. Le pointer sur un CDN tient en un appel :

```ts
import { setImageResolver } from '@c9up/nebula'

setImageResolver((src, { width, format, quality }) => {
  const url = new URL(src, 'https://cdn.example.com')
  url.searchParams.set('w', String(width))
  if (format !== undefined) url.searchParams.set('fm', format)
  if (quality !== undefined) url.searchParams.set('q', String(quality))
  return url.toString()
})
```

Installez-le une fois au démarrage, depuis un module que le serveur et le navigateur exécutent tous les deux. Ils doivent être d'accord : un `src` qui diffère entre les deux fait jeter au navigateur l'image que le serveur avait déjà commencé à charger, pour en demander une autre. `setImageResolver(null)` remet celui par défaut.

On demande à un résolveur une largeur, un format et une qualité, jamais une hauteur ni un recadrage. Ce sont les deux axes qu'un endpoint ne peut pas borner, et aucun n'est nécessaire — le recadrage, c'est `fit` et `position`, sur l'élément.

Pour garder le résolveur par défaut et ne déplacer que sa route : `setImageEndpoint('/media/image')`.

## API

### Image

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `src` | `Reactive<string>` | — | La source, telle que le résolveur la reçoit. |
| `alt` | `Reactive<string>` | — | Obligatoire. `''` marque une image décorative. |
| `width` | `Reactive<number \| undefined>` | — | Largeur affichée en pixels, et l'attribut `width`. Avec `height`, ce qui réserve la place. Nécessaire à toutes les dispositions sauf `full-width`. |
| `height` | `Reactive<number \| undefined>` | — | L'attribut `height`. |
| `layout` | `Reactive<ImageLayout>` | `'constrained'` | `'constrained' \| 'full-width' \| 'fixed' \| 'none'` — voir [Dispositions](#dispositions). |
| `fit` | `Reactive<ImageFit \| undefined>` | — | `object-fit` : `'cover' \| 'contain' \| 'fill' \| 'none' \| 'scale-down'`. |
| `position` | `Reactive<ImagePosition \| undefined>` | — | `object-position`, quand `fit` recadre : `'center'`, `'top'`, `'bottom left'`… |
| `format` | `Reactive<ImageFormat \| undefined>` | `'webp'` | Le format à demander : `'avif' \| 'webp' \| 'jpeg' \| 'png'`. |
| `quality` | `Reactive<number \| undefined>` | — | 1–100. L'endpoint décide des valeurs qu'il accepte. |
| `widths` | `Reactive<readonly number[] \| undefined>` | — | Remplace la liste de largeurs calculée. À accompagner d'un `sizes`. |
| `densities` | `Reactive<readonly number[] \| undefined>` | — | Servir par densité (`[1, 2]`) plutôt que par largeur. Ignoré quand `widths` est donné. |
| `sizes` | `Reactive<string \| undefined>` | d'après `layout` et `width` | Remplace le `sizes` calculé. |
| `breakpoints` | `Reactive<readonly number[] \| undefined>` | `DEFAULT_RESOLUTIONS` | L'échelle d'appareils dont les largeurs sont tirées. |
| `originalWidth` | `Reactive<number \| undefined>` | — | La largeur propre de la source. Écarte les variantes qu'elle ne peut pas remplir. |
| `priority` | `Reactive<boolean>` | `false` | Au-dessus de la ligne de flottaison : `loading="eager"`, `decoding="sync"`, `fetchpriority="high"`. |
| `loading` | `Reactive<'lazy' \| 'eager' \| undefined>` | `'lazy'` (`'eager'` avec `priority`) | L'emporte sur `priority`. |
| `decoding` | `Reactive<'async' \| 'sync' \| 'auto' \| undefined>` | `'async'` (`'sync'` avec `priority`) | L'emporte sur `priority`. |
| `fetchPriority` | `Reactive<'high' \| 'low' \| 'auto' \| undefined>` | — (`'high'` avec `priority`) | L'emporte sur `priority`. |
| `class` | `Reactive<string>` | — | Fusionnée après les classes de disposition, de `fit` et de `position`. |

### Le résolveur

| Fonction | Description |
|---|---|
| `setImageResolver(next: ImageUrlResolver \| null): void` | Installe le résolveur de toutes les images. `null` remet celui par défaut. |
| `setImageEndpoint(path: string): void` | Déplace le résolveur par défaut hors de `/__image`. |
| `getImageResolver(): ImageUrlResolver` | Le résolveur installé. |
| `imageUrl(src: string, transform: ImageTransform): string` | Une URL à travers le résolveur installé — pour un `background-image`, un `og:image`. |
| `defaultImageResolver` | `/__image?src=…&w=…&f=…&q=…`, paramètres d'une lettre parce qu'ils se répètent dans chaque entrée de `srcset`. `f` et `q` sont omis quand ils ne sont pas demandés ; `w` est arrondi. |

`ImageUrlResolver` vaut `(src: string, transform: ImageTransform) => string`, et `ImageTransform` vaut `{ width: number; format?: ImageFormat; quality?: number }`.

### Échelles

| Export | Description |
|---|---|
| `DEFAULT_RESOLUTIONS` | L'échelle d'appareils : 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560, 3200, 3840, 4480, 5120, 6016. |
| `LIMITED_RESOLUTIONS` | 640, 750, 828, 1080, 1280, 1668, 2048, 2560 — l'échelle par défaut sans 960, 1920 ni rien au-delà de 2560. |
| `allSizes(breakpoints): number[]` | Toutes les largeurs qu'un composant peut demander : la petite échelle (16 à 384) et `breakpoints`, croissantes. La liste qu'un endpoint doit autoriser. |

### Briques

Le calcul est pur — des largeurs en entrée, des chaînes en sortie — et exporté pour un balisage que les composants n'écrivent pas.

| Fonction | Description |
|---|---|
| `imageWidths({ width?, layout, breakpoints?, originalWidth? }): number[]` | Les largeurs à proposer, croissantes. |
| `imageSizes({ width?, layout }): string \| undefined` | Le `sizes` d'une disposition. |
| `imageSrcSet({ src, widths, format?, quality?, resolve? }): string \| undefined` | Un `srcset` en descripteurs `w`. |
| `densitySrcSet({ src, width, densities, format?, quality?, originalWidth?, breakpoints?, resolve? }): string \| undefined` | Un `srcset` en descripteurs `x`, une entrée par largeur distincte. |
| `layoutClasses(layout)`, `fitClass(fit)`, `positionClass(position)` | Les classes Tailwind de chacun. |
| `resolvedWidths(props)`, `resolvedSrcSet(props, format)`, `resolvedSizes(props)`, `resolvedSrc(props, format)`, `imageClasses(props)`, `loadingAttributes(props)` | Ce qu'`Image` calcule à partir de ses props — ce que `Picture` réutilise pour que ses `<source>` proposent exactement l'échelle de l'`<img>`. |

## Accessibilité

Une `<img>` native. `alt` est obligatoire dans le type et toujours rendu, y compris vide : `alt=""` garde une image décorative hors de l'arbre d'accessibilité, là où un `alt` manquant la ferait lire sous son nom de fichier. `width` et `height` réservent la place avant le chargement : rien ne bouge sous l'image pendant qu'on lit.
