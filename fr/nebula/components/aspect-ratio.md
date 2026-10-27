# AspectRatio

Une boîte qui garde son rapport largeur/hauteur quand sa largeur change : une photo dans une grille, un cadre vidéo, une carte. C'est la propriété CSS `aspect-ratio` et rien de plus — ni astuce de remplissage en pourcentage, ni mesure en JavaScript — posée en ligne, parce que le rapport est un nombre quelconque et ne peut pas être une classe utilitaire.

La boîte est `relative w-full` : sa largeur vient de son conteneur, sa hauteur du rapport. Le contenu la remplit avec `h-full w-full`, ou se positionne en `absolute inset-0` à l'intérieur.

```sh
ream nebula:add aspect-ratio
```

Atome · `atoms/AspectRatio.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { AspectRatio } from '@c9up/nebula'

AspectRatio({
  ratio: 16 / 9,
  children: html`<img src="/harbour.jpg" alt="Le port à l'aube" class="h-full w-full rounded-lg object-cover">`,
})
```

## Exemples

### Des carrés en grille

`ratio` vaut `1` par défaut. Avec `object-cover`, des photos de toutes formes s'alignent en une grille de carrés :

```ts
html`<div class="grid grid-cols-3 gap-2">
  ${photos.map((photo) => AspectRatio({
    class: 'bg-muted overflow-hidden rounded-md',
    children: html`<img src="${photo.src}" alt="${photo.alt}" class="h-full w-full object-cover">`,
  }))}
</div>`
```

### Un cadre intégré

Une `<iframe>` a sa propre taille intrinsèque ; positionnée en `absolute inset-0`, elle remplit la boîte à la place :

```ts
AspectRatio({
  ratio: 16 / 9,
  class: 'bg-muted rounded-lg',
  children: html`<iframe src="/embed/tour" title="Visite du produit" class="absolute inset-0 h-full w-full rounded-lg"></iframe>`,
})
```

### Suivre un choix

`ratio` prend un accesseur : un aperçu peut basculer entre portrait et paysage.

```ts
import { signal } from '@c9up/aurora'

const portrait = signal(false)

AspectRatio({
  ratio: () => (portrait() ? 3 / 4 : 4 / 3),
  class: 'bg-muted rounded-lg',
  children: preview,
})
```

## API

### AspectRatio

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce que contient la boîte. |
| `ratio` | `Reactive<number>` | `1` | La largeur divisée par la hauteur : `16 / 9` pour du panoramique, `1` pour un carré. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

## Accessibilité

La boîte n'a pas de rôle et ne dit rien : c'est son contenu qui porte le sens. Une `<img>` à l'intérieur a besoin de son `alt`, une `<iframe>` de son `title`.
