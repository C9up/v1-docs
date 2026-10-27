# ButtonGroup

Des boutons soudés en un seul contrôle : un jeu d'alignements, une pagination, un bouton d'enregistrement et ses options à côté. Le groupe est `role="group"` avec un libellé : un lecteur d'écran annonce l'ensemble avant ses membres, plutôt que trois boutons sans rapport alignés.

L'arrondi et les bordures partagées sont posés par des sélecteurs `:first-child` et `:last-child` sur le groupe, pas par des props sur chaque bouton. C'est ce qui permet aux membres de rester de simples appels à [Button](/fr/nebula/components/button) : en ajouter un n'oblige pas à redécider quel bouton se trouve désormais au bout.

```sh
ream nebula:add button-group
```

Molécule · `molecules/ButtonGroup.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Button, ButtonGroup } from '@c9up/nebula'

ButtonGroup({
  label: 'Alignement du texte',
  children: html`
    ${Button({ variant: 'outline', children: 'Gauche' })}
    ${Button({ variant: 'outline', children: 'Centre' })}
    ${Button({ variant: 'outline', children: 'Droite' })}
  `,
})
```

`ButtonGroup` ne fournit aucun contexte : ses enfants sont une simple valeur. La variante `outline` est le choix habituel : la bordure de chaque membre est tirée d'un pixel par-dessus celle de son voisin, si bien que deux bordures se rejoignent en une.

## Exemples

### Vertical

```ts
ButtonGroup({
  label: 'Zoom',
  orientation: 'vertical',
  children: html`
    ${Button({ variant: 'outline', size: 'icon', label: 'Zoom avant', children: '+' })}
    ${Button({ variant: 'outline', size: 'icon', label: 'Zoom arrière', children: '−' })}
  `,
})
```

### Du texte entre les boutons

`ButtonGroupText` est une boîte stylée pour prendre place dans la rangée — un numéro de page, une unité, un compte :

```ts
import { ButtonGroupText, ChevronLeftIcon, ChevronRightIcon } from '@c9up/nebula'

ButtonGroup({
  label: 'Pages',
  children: html`
    ${Button({ variant: 'outline', size: 'icon', label: 'Page précédente', children: ChevronLeftIcon(), onClick: () => previous() })}
    ${ButtonGroupText({ children: () => `Page ${page()}` })}
    ${Button({ variant: 'outline', size: 'icon', label: 'Page suivante', children: ChevronRightIcon(), onClick: () => next() })}
  `,
})
```

### Un bouton scindé

Des boutons sans bordure propre — `secondary`, `default` — se fondent l'un dans l'autre. `ButtonGroupSeparator` trace la ligne entre eux :

```ts
import { ButtonGroupSeparator, ChevronDownIcon } from '@c9up/nebula'

ButtonGroup({
  label: 'Enregistrer',
  children: html`
    ${Button({ variant: 'secondary', children: 'Enregistrer' })}
    ${ButtonGroupSeparator()}
    ${Button({ variant: 'secondary', size: 'icon', label: "Plus d'options d'enregistrement", children: ChevronDownIcon() })}
  `,
})
```

Le séparateur est une ligne verticale, dessinée pour un groupe horizontal.

## API

### ButtonGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les boutons, et d'éventuels `ButtonGroupText` ou `ButtonGroupSeparator`. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Dispose les membres en rangée ou en colonne. Lu une fois, à la construction. |
| `label` | `string` | — | Pose `aria-label`, annoncé avant le contenu du groupe. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### ButtonGroupText

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte, une icône, ou les deux. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la boîte. |
| `id` | `string` | — | L'`id` de l'élément. |

### ButtonGroupSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Rendu dans la ligne ; normalement laissé vide. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la ligne. |
| `id` | `string` | — | L'`id` de l'élément. |

## Accessibilité

Le groupe est `role="group"` avec `label` pour `aria-label`. Donnez-lui-en un dès que les boutons ne s'expliquent pas ensemble : « Gauche, Centre, Droite » ne dit pas grand-chose avant de devenir « Alignement du texte ». `ButtonGroupSeparator` est un simple `<div>` sans rôle — une ligne dessinée, non annoncée.

Le membre qui a le focus passe au-dessus de ses voisins, pour que son anneau de focus ne soit pas caché sous le bord du bouton suivant. Le groupe n'ajoute aucune gestion du clavier : chaque bouton est son propre arrêt de tabulation, activé par <kbd>Entrée</kbd> et <kbd>Espace</kbd> comme tout bouton. Pour une rangée qui doit être un seul arrêt de tabulation avec les flèches à l'intérieur, prenez une [Toolbar](/fr/nebula/components/toolbar).
