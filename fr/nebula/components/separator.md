# Separator

Un filet d'un pixel entre deux contenus, horizontal ou vertical. Il est décoratif par défaut : la plupart des lignes d'un écran sont du dessin, pas de la structure, et un lecteur d'écran qui annoncerait comme une frontière chaque trait entre deux boutons d'une barre d'outils annoncerait du bruit. Passez `decorative: false` quand la ligne coupe vraiment la page en sections.

```sh
ream nebula:add separator
```

Atome · `atoms/Separator.ts` · aucune dépendance

## Utilisation

```ts
import { Separator } from '@c9up/nebula'

Separator()
```

## Exemples

### Vertical

Un séparateur vertical est `h-full` : il prend la hauteur de sa rangée, il faut donc que la rangée en ait une.

```ts
import { html } from '@c9up/aurora'
import { Separator } from '@c9up/nebula'

html`<div class="flex h-5 items-center gap-4 text-sm">
  <a href="/blog">Blog</a>
  ${Separator({ orientation: 'vertical' })}
  <a href="/docs">Docs</a>
  ${Separator({ orientation: 'vertical' })}
  <a href="/source">Source</a>
</div>`
```

La hauteur et la largeur du filet sont posées sous `data-[orientation=…]:`, qui l'emporte sur une utilitaire simple : `class: 'h-4'` perd face au `h-full`. Dimensionnez-le sous la même variante — `class: 'data-[orientation=vertical]:h-4'`.

### Une vraie frontière

Entre deux parties d'une page qu'un lecteur doit distinguer — les réglages qui façonnent le compte, puis ceux qui le suppriment :

```ts
html`<section>${accountSettings}</section>
${Separator({ decorative: false, class: 'my-6' })}
<section>${dangerZone}</section>`
```

Le séparateur trace une ligne et rien d'autre : l'espace autour vient de `class` ou du `gap` du parent.

### Suivre la mise en page

`orientation` prend un accesseur, pour un filet qui tourne avec sa rangée :

```ts
Separator({ orientation: () => (wide() ? 'vertical' : 'horizontal') })
```

## API

### Separator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `orientation` | `Reactive<'horizontal' \| 'vertical'>` | `'horizontal'` | Horizontal : 1 px de haut, toute la largeur ; vertical : 1 px de large, toute la hauteur. Recopiée dans `data-orientation`. |
| `decorative` | `Reactive<boolean>` | `true` | `false` l'expose aux technologies d'assistance comme une vraie frontière. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. Une hauteur ou une largeur se pose sous `data-[orientation=…]:` pour battre celle du filet. |

## Accessibilité

Décoratif, le séparateur est `role="none"` et rien n'est annoncé. Avec `decorative: false`, il est `role="separator"` avec `aria-orientation`, qu'un lecteur d'écran restitue comme une frontière entre ce qui précède et ce qui suit. Il n'est jamais atteignable au clavier et ne gère aucune touche.
