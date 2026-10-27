# Empty

L'état vide d'une liste, d'un tableau ou d'un panneau sans rien dedans. C'est là qu'une application retombe le plus souvent sur un sec « Aucun résultat » qui laisse l'utilisateur sans suite possible ; les parties poussent vers la forme utile — une icône, un titre, une phrase qui dit pourquoi c'est vide, et quelque chose à faire.

Chaque partie est un `<div>` stylé avec son propre `data-slot` et aucun comportement : l'ensemble n'est que de la mise en page, qu'on lit et modifie sur un seul écran de source.

```sh
ream nebula:add empty
```

Molécule · `molecules/Empty.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@c9up/nebula'

Empty({
  children: EmptyHeader({
    children: html`
      ${EmptyTitle({ children: 'Aucune facture pour le moment' })}
      ${EmptyDescription({ children: 'Les factures que vous envoyez apparaissent ici.' })}
    `,
  }),
})
```

## Exemples

### Icône, explication et suite à donner

```ts
import { html } from '@c9up/aurora'
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  SearchIcon,
} from '@c9up/nebula'

Empty({
  class: 'border',
  children: html`
    ${EmptyHeader({
      children: html`
        ${EmptyMedia({ children: SearchIcon() })}
        ${EmptyTitle({ children: 'Aucun résultat' })}
        ${EmptyDescription({ children: 'Rien ne correspond à « factures 2019 ». Essayez un autre mot, ou effacez les filtres.' })}
      `,
    })}
    ${EmptyContent({
      children: Button({ variant: 'outline', children: 'Effacer les filtres', onClick: () => clearFilters() }),
    })}
  `,
})
```

`EmptyMedia` est une tuile atténuée de 40 px avec l'icône à 20 px, sauf si l'icône porte sa propre classe `size-*`. La racine ne dessine une bordure pointillée qu'une fois qu'on lui en donne une : `class: 'border'` l'active, et l'état vide reste sans bordure dans une carte qui a déjà la sienne.

Un lien dans `EmptyDescription` est souligné :

```ts
EmptyDescription({ children: html`Aucune clé d'API. <a href="/docs/keys">Comment fonctionnent les clés</a>.` })
```

### À la place d'une liste

L'état vide est une branche de l'accesseur qui dessine la liste :

```ts
import { html } from '@c9up/aurora'

html`${() =>
  projects().length === 0
    ? Empty({
        children: html`
          ${EmptyHeader({ children: EmptyTitle({ children: 'Aucun projet' }) })}
          ${EmptyContent({ children: Button({ children: 'Nouveau projet', onClick: () => createProject() }) })}
        `,
      })
    : html`<ul>${projects().map((project) => html`<li>${project.name}</li>`)}</ul>`}`
```

## API

### Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent

Les six prennent les mêmes props, `EmptyProps` :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `id` | `string` | — | L'`id` de l'élément. |

| Partie | `data-slot` | Ce que c'est |
|---|---|---|
| `Empty` | `empty` | Le cadre centré, plus aéré à partir de `md`. |
| `EmptyHeader` | `empty-header` | Une colonne pour l'icône, le titre et la description, au plus `max-w-sm`. |
| `EmptyMedia` | `empty-media` | Une tuile carrée atténuée pour une icône. |
| `EmptyTitle` | `empty-title` | Le titre, grand et de graisse moyenne. |
| `EmptyDescription` | `empty-description` | L'explication atténuée ; ses liens sont soulignés. |
| `EmptyContent` | `empty-content` | La suite à donner — un bouton, un formulaire, un lien. |

## Accessibilité

Les parties n'ajoutent aucun rôle : ce sont des `<div>`, et le titre n'est pas un titre de section. Là où l'état vide est une section à part entière du plan de la page, mettez un titre dedans — `EmptyTitle({ children: html\`<h2>Aucun résultat</h2>\` })` — pour qu'il apparaisse quand un lecteur d'écran liste les titres. Ce qui va dans `EmptyContent` apporte son propre comportement clavier ; les parties ne gèrent aucune touche.
