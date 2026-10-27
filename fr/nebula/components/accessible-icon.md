# AccessibleIcon

Une icône avec un nom que seul un lecteur d'écran entend. Une icône seule est l'image d'un mot : un utilisateur voyant lit l'image, et un lecteur d'écran ne lit rien du tout, parce qu'un `<svg>` sans libellé est annoncé comme rien — c'est ainsi qu'un bouton de suppression devient un bouton sans nom dans une rangée de boutons sans nom.

Deux moitiés, et les deux comptent. L'icône est marquée `aria-hidden`, pour que ses propres entrailles — un `<title>`, un `<text>` égaré — ne soient pas annoncées en plus du libellé ; le libellé est un texte [visuellement caché](/fr/nebula/components/visually-hidden) posé à côté. Du vrai texte plutôt qu'un `aria-label` sur le parent, parce que le texte survit aux outils de traduction qui sautent les attributs.

```sh
ream nebula:add accessible-icon
```

Atome · `atoms/AccessibleIcon.ts` · [VisuallyHidden](/fr/nebula/components/visually-hidden)

## Utilisation

```ts
import { AccessibleIcon, XIcon } from '@c9up/nebula'

AccessibleIcon({ label: 'Fermer', children: XIcon() })
```

## Exemples

### Dans un bouton-icône

```ts
import { html } from '@c9up/aurora'
import { AccessibleIcon, XIcon } from '@c9up/nebula'

html`<button type="button" @click="${() => remove()}">
  ${AccessibleIcon({ label: 'Retirer', children: XIcon() })}
</button>`
```

Le bouton est annoncé « Retirer, bouton ». L'enveloppe est en `display: contents` : elle n'ajoute aucune boîte, et l'icône est disposée comme si elle était l'enfant direct du bouton.

### Avec un Button

[Button](/fr/nebula/components/button) dimensionne tout SVG qu'il contient : l'icône est donc dimensionnée à travers l'enveloppe aussi :

```ts
import { AccessibleIcon, Button, SearchIcon } from '@c9up/nebula'

Button({ size: 'icon', children: AccessibleIcon({ label: 'Rechercher', children: SearchIcon() }) })
```

Le `label` de `Button` est le chemin le plus court vers la même annonce ; `AccessibleIcon` sert quand le nom doit être du texte dans la page — pour un outil de traduction, une recherche dans la page, un copier.

### Un libellé qui suit un état

`label` prend un accesseur :

```ts
import { signal } from '@c9up/aurora'
import { AccessibleIcon, ChevronDownIcon } from '@c9up/nebula'

const open = signal(false)

AccessibleIcon({ label: () => (open() ? 'Replier' : 'Déplier'), children: ChevronDownIcon() })
```

## API

### AccessibleIcon

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `Reactive<string>` | — | Obligatoire. Ce que veut dire l'icône, en mots. |
| `children` | `Slot` | — | L'icône. Retirée de l'arbre d'accessibilité. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'enveloppe. |

## Accessibilité

L'icône est dans un `<span aria-hidden="true">`, le libellé dans un span `VisuallyHidden` à côté, tous deux dans une enveloppe en `display: contents`. Un lecteur d'écran lit le libellé là où se trouve l'icône, et rien de l'icône elle-même. Le composant n'ajoute ni focus ni rôle : placez-le dans le contrôle qu'il nomme, et le contrôle est annoncé sous ce nom.
