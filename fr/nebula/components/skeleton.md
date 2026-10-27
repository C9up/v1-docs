# Skeleton

Un bloc de remplacement pendant que le contenu charge : une forme qui pulse là où seront le texte, l'image ou la ligne, pour que la page garde sa mise en page au lieu de sauter quand les données arrivent.

Il est `aria-hidden`, sans région live, à dessein. Une boîte grise qui pulse ne porte aucune information, et en annoncer une par ligne d'un tableau en chargement est pire que le silence. C'est la zone autour des squelettes qui porte `aria-busy`, ce qui dit la même chose une seule fois.

```sh
ream nebula:add skeleton
```

Atome · `atoms/Skeleton.ts` · aucune dépendance

## Utilisation

```ts
import { Skeleton } from '@c9up/nebula'

Skeleton({ class: 'h-4 w-48' })
```

Un squelette n'a pas de taille propre : `class` lui donne la forme de ce qu'il remplace.

## Exemples

### Une carte pendant qu'elle charge

```ts
import { html } from '@c9up/aurora'
import { Skeleton } from '@c9up/nebula'

html`<div class="flex items-center gap-4">
  ${Skeleton({ class: 'size-12 rounded-full' })}
  <div class="space-y-2">
    ${Skeleton({ class: 'h-4 w-64' })}
    ${Skeleton({ class: 'h-4 w-48' })}
  </div>
</div>`
```

### La zone dit qu'elle est occupée

```ts
import { html } from '@c9up/aurora'

html`<ul aria-busy="${() => (loading() ? 'true' : 'false')}" class="space-y-3">
  ${() =>
    loading()
      ? [1, 2, 3].map(() => html`<li>${Skeleton({ class: 'h-10 w-full' })}</li>`)
      : rows().map((row) => html`<li>${row.name}</li>`)}
</ul>`
```

## API

### Skeleton

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | La forme : une hauteur, une largeur, un arrondi. Fusionnée en dernier : `rounded-full` remplace le `rounded-md` par défaut. |

## Accessibilité

`aria-hidden="true"` : un squelette est invisible pour les technologies d'assistance. Posez `aria-busy="true"` sur la zone qu'il remplit pendant le chargement, et mettez le contenu à sa place une fois chargé. La pulsation est `animate-pulse` ; elle ne s'arrête pas quand les animations sont réduites, sauf si vous ajoutez `motion-reduce:animate-none` à `class`.
