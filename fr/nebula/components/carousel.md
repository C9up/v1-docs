# Carousel

Une bande de diapositives qui défile horizontalement, construite sur le scroll-snap CSS et `scrollBy` plutôt que sur un script qui anime une transformation. Le défilement natif apporte l'inertie tactile, les gestes du pavé tactile, le rebond propre à la plateforme et le défilement au clavier — tout ce qu'un carrousel à base de transformation doit reconstruire, et réussit d'habitude en partie seulement. Le défilement doux du navigateur se charge de l'animation.

La racine est une `region` qui s'annonce comme un carrousel, et chaque diapositive un `group` nommé « 3 of 7 » : sans cela, un utilisateur de lecteur d'écran n'a aucun moyen de savoir ce qui est hors champ, puisque la bande qui déborde du bord ne lui dit rien.

```sh
ream nebula:add carousel
```

Organisme · `organisms/Carousel.ts` · [Button](/fr/nebula/components/button)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@c9up/nebula'

Carousel({
  label: 'Produits à la une',
  class: 'mx-12',
  children: () => html`
    ${CarouselContent({
      children: html`
        ${CarouselItem({ children: 'Un' })}
        ${CarouselItem({ children: 'Deux' })}
        ${CarouselItem({ children: 'Trois' })}
      `,
    })}
    ${CarouselPrevious()}
    ${CarouselNext()}
  `,
})
```

Les `children` de `Carousel` sont typés `Parts` : le `() =>` est ce qui permet aux diapositives et aux flèches de le trouver — voir [composition](/fr/nebula/composition). Les flèches se placent hors de la bande, à trois rem de chaque côté, d'où le `mx-12` qui leur laisse la place.

## Exemples

### Des diapositives à partir de données

Chaque diapositive prend sa position au moment où elle est construite, et le total est lu quand les libellés sont écrits : une liste parcourue une fois est numérotée de « 1 of 5 » à « 5 of 5 ».

```ts
import { html } from '@c9up/aurora'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, Image } from '@c9up/nebula'

Carousel({
  label: 'Galerie',
  class: 'mx-12',
  children: () => html`
    ${CarouselContent({
      children: photos.map((photo) =>
        CarouselItem({ children: Image({ src: photo.src, alt: photo.alt, layout: 'full-width' }) }),
      ),
    })}
    ${CarouselPrevious()}
    ${CarouselNext()}
  `,
})
```

Construisez les diapositives comme une valeur, comme ici. Les positions sont seulement distribuées, jamais reprises : des diapositives reconstruites par un accesseur prendraient de nouvelles positions après les anciennes, et leurs libellés ne correspondraient plus.

### Plusieurs diapositives par vue

Une diapositive fait toute la largeur de la bande. Donnez-lui une base plus petite pour en montrer plusieurs ; la bande espace les diapositives avec `gap-4`, retirez donc les espaces de la fraction :

```ts
CarouselItem({ class: 'basis-[calc((100%_-_2rem)/3)]', children: 'Un' })
```

Suivant et Précédent font défiler de la largeur visible : avec trois par vue, chaque appui avance d'une vue entière, et le scroll-snap pose la bande sur le bord d'une diapositive.

### Vertical

```ts
Carousel({
  orientation: 'vertical',
  class: 'my-12',
  children: () => html`
    ${CarouselContent({ class: 'h-72', children: html`${CarouselItem({ children: 'Un' })}${CarouselItem({ children: 'Deux' })}` })}
    ${CarouselPrevious()}
    ${CarouselNext()}
  `,
})
```

La bande devient une colonne plafonnée à `max-h-96`, les flèches passent au-dessus et au-dessous en pointant vers le haut et le bas, et les touches fléchées deviennent <kbd>↑</kbd> et <kbd>↓</kbd>. `orientation` est lue une fois.

### Pas d'index à fixer

Il n'y a pas de diapositive courante à lire ou à fixer : la position est la position de défilement, et un glisser, une molette, un balayage et les flèches la déplacent tous. Les flèches ne font que la lire, pour se désactiver à chaque extrémité.

## API

### Carousel

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Un `CarouselContent`, puis les flèches. |
| `label` | `string` | `'Carousel'` | Le nom accessible de la région. |
| `roleDescription` | `string` | `'carousel'` | Comment un lecteur d'écran appelle la région. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | L'axe de défilement, et les touches fléchées qui le font avancer. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la région. |

### CarouselContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les `CarouselItem`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du conteneur défilant. |

### CarouselItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de la diapositive. |
| `roleDescription` | `string` | `'slide'` | Comment un lecteur d'écran appelle une diapositive. |
| `label` | `(position: number, count: number) => string` | `` `${position} of ${count}` `` | Le nom de la diapositive d'après sa position. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la diapositive ; `basis-*` fixe la part de la bande qu'elle occupe. |

### CarouselPrevious, CarouselNext

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | `'Previous slide'` / `'Next slide'` | Le nom accessible de la flèche. |
| `class` | `Reactive<string>` | — | Fusionnée après les classes de bouton-icône `outline` et le placement. |

## Accessibilité

La racine est `role="region"` avec `aria-roledescription="carousel"` et un `aria-label` tiré de `label`. Chaque diapositive est `role="group"` avec `aria-roledescription="slide"` et un `aria-label` comme « 3 of 7 ». Les flèches sont des `<button>` natifs nommés par `label`, désactivés au début et à la fin de la bande, d'après la position de défilement.

Le conteneur défilant prend le focus (`tabindex="0"`) : la bande peut être atteinte et défiler au clavier même sans les flèches.

| Touche | Action |
|---|---|
| <kbd>←</kbd> / <kbd>→</kbd> | Défile en arrière / en avant d'une largeur visible (horizontal). |
| <kbd>↑</kbd> / <kbd>↓</kbd> | La même chose, quand `orientation` vaut `vertical`. |

Les touches sont écoutées sur toute la région : elles fonctionnent avec le focus sur la bande, sur une flèche, ou sur n'importe quoi à l'intérieur d'une diapositive — y compris un champ de texte, dont les flèches ne déplacent alors plus le curseur.

Tous les textes intégrés sont des props — `label` et `roleDescription` sur `Carousel`, `roleDescription` et `label(position, count)` sur `CarouselItem`, `label` sur chaque flèche : voir [langues](/fr/nebula/languages).
