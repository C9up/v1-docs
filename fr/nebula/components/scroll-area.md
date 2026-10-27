# ScrollArea

Un conteneur défilant avec une barre de défilement fine, à la couleur des bordures du thème. Le défilement reste natif : le navigateur dessine la barre à partir de `scrollbar-width` et `scrollbar-color`, avec les pseudo-éléments WebKit là où ils manquent, si bien que l'inertie au toucher, le rebond et le comportement d'accessibilité propre à la plateforme sont conservés — pour une poignée de classes et aucun JavaScript.

C'est une différence voulue avec shadcn, dont la zone de défilement masque la barre native et en dessine une à partir d'éléments resynchronisés à chaque défilement. S'il vous faut une barre dessinée au pixel près, prenez une bibliothèque dédiée ; ce composant n'en fera pas pousser une.

Un conteneur ne défile qu'une fois borné : donnez-lui une hauteur — ou une largeur, pour un défilement horizontal.

```sh
ream nebula:add scroll-area
```

Atome · `atoms/ScrollArea.ts` · aucune dépendance

## Utilisation

```ts
import { ScrollArea } from '@c9up/nebula'

ScrollArea({ class: 'h-72 rounded-md border p-4', children: terms })
```

## Exemples

### Une liste

```ts
import { html } from '@c9up/aurora'
import { ScrollArea, Separator } from '@c9up/nebula'

const tags = Array.from({ length: 50 }, (_, index) => `v1.2.0-beta.${50 - index}`)

ScrollArea({
  class: 'h-72 w-48 rounded-md border',
  children: html`<div class="p-4">
    <h4 class="mb-4 text-sm leading-none font-medium">Versions</h4>
    ${tags.map((tag) => html`<div class="text-sm">${tag}</div>${Separator({ class: 'my-2' })}`)}
  </div>`,
})
```

### Horizontal

`orientation: 'horizontal'` défile de côté et coupe à la verticale. La rangée intérieure doit être plus large que la zone — `w-max` — sinon il n'y a rien à faire défiler :

```ts
ScrollArea({
  orientation: 'horizontal',
  class: 'w-96 rounded-md border whitespace-nowrap',
  children: html`<div class="flex w-max gap-4 p-4">
    ${photos.map((photo) => html`<figure class="shrink-0">
      <img src="${photo.src}" alt="${photo.alt}" class="h-48 w-36 rounded-md object-cover">
      <figcaption class="text-muted-foreground pt-2 text-xs">${photo.author}</figcaption>
    </figure>`)}
  </div>`,
})
```

### Deux axes

Pour un tableau plus large et plus haut que sa place :

```ts
ScrollArea({ orientation: 'both', class: 'max-h-96 rounded-md border', children: wideTable })
```

### Un contenu qui change

`children` prend un accesseur :

```ts
ScrollArea({ class: 'h-64', children: () => messages().map((message) => html`<p>${message}</p>`) })
```

### Les classes seules

Un élément qui défile déjà — un `<pre>`, le corps d'une boîte de dialogue — reçoit la même barre avec `scrollAreaClasses` :

```ts
import { cn, scrollAreaClasses } from '@c9up/nebula'

html`<pre class="${cn(scrollAreaClasses, 'max-h-96 rounded-md bg-muted p-4 text-sm')}">${source}</pre>`
```

## API

### ScrollArea

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qui défile. |
| `orientation` | `Reactive<'vertical' \| 'horizontal' \| 'both'>` | `'vertical'` | L'axe qui peut défiler ; l'autre est coupé. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. C'est là que va la hauteur ou la largeur qui la borne. |

### scrollAreaClasses

`scrollAreaClasses: string` — les classes de la barre, avec `relative overflow-auto`, pour un élément qui doit défiler comme une `ScrollArea` sans en être une.

## Accessibilité

Le défilement est celui du navigateur : la molette, le toucher, et les touches de défilement — flèches, <kbd>Page préc.</kbd>, <kbd>Page suiv.</kbd>, <kbd>Espace</kbd>, <kbd>Début</kbd>, <kbd>Fin</kbd> — dès que le focus est dans la zone. Le composant ne gère lui-même aucune touche et n'ajoute ni rôle ni `tabindex` : une zone qui contient des liens ou des champs s'atteint par eux, et une zone qui ne contient que du texte ne s'atteint au clavier que dans les navigateurs qui rendent d'eux-mêmes les conteneurs défilants focalisables.
