# Command

La palette : on tape pour filtrer, les flèches pour se déplacer, Entrée pour exécuter. C'est une liste que l'on place n'importe où — dans une page, un popover, une barre latérale. [CommandDialog](/fr/nebula/components/command-dialog) la met dans une fenêtre modale ouverte par un raccourci, et [Combobox](/fr/nebula/components/combobox) s'appuie dessus pour choisir une valeur.

Le filtrage se fait sans nouveau rendu. Chaque élément s'enregistre au moment où il est construit, puis se masque quand la recherche cesse de lui correspondre : reconstruire la liste à chaque frappe perdrait le DOM où vivent le surlignage et la position de défilement. Un groupe se masque de la même façon dès qu'aucun de ses propres éléments n'est affiché, si bien qu'un intitulé vide ne surplombe jamais le néant.

Les flèches ne font jamais sortir le focus du champ de recherche. La liste est une `listbox` dont les options sont désignées plutôt que focalisées : un lecteur d'écran lit chaque résultat au passage des flèches, et la saisie continue de fonctionner.

```sh
ream nebula:add command
```

Organisme · `organisms/Command.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

Command({
  class: 'rounded-lg border shadow-md',
  children: () => html`
    ${CommandInput({ placeholder: 'Rechercher…' })}
    ${CommandList({ children: () => html`
      ${CommandEmpty({ children: 'Aucun résultat.' })}
      ${CommandItem({ value: 'new', children: 'Nouveau fichier', onSelect: () => createFile() })}
      ${CommandItem({ value: 'open', children: 'Ouvrir un dossier', onSelect: () => openFolder() })}
    ` })}
  `,
})
```

`Command`, `CommandList` et `CommandGroup` prennent leurs parties dans un thunk — voir [composition](/fr/nebula/composition).

## Exemples

### Groupes, séparateurs, raccourcis

```ts
import { html } from '@c9up/aurora'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator, CommandShortcut,
} from '@c9up/nebula'

Command({
  children: () => html`
    ${CommandInput({})}
    ${CommandList({ children: () => html`
      ${CommandEmpty({ children: 'Aucun résultat.' })}
      ${CommandGroup({ heading: 'Fichiers', children: () => html`
        ${CommandItem({ value: 'new', textValue: 'Nouveau fichier', children: html`Nouveau fichier${CommandShortcut({ children: '⌘N' })}` })}
        ${CommandItem({ value: 'save', textValue: 'Enregistrer', children: html`Enregistrer${CommandShortcut({ children: '⌘S' })}` })}
      ` })}
      ${CommandSeparator({})}
      ${CommandGroup({ heading: 'Aide', children: () => CommandItem({ value: 'docs', children: 'Documentation' }) })}
    ` })}
  `,
})
```

`CommandShortcut` ne fait qu'afficher les touches : liez le vrai raccourci vous-même.

### Ce que le filtre compare

Un élément correspond quand son texte contient la recherche, sans tenir compte de la casse. Ce texte est `children` quand c'est une chaîne ; quand `children` est du balisage — un raccourci à côté du libellé, une icône — donnez `textValue`, sinon l'élément est comparé sur sa `value`. `keywords` ajoute des termes que le libellé ne contient pas :

```ts
CommandItem({ value: 'open', children: 'Ouvrir un dossier', keywords: ['répertoire'] })
```

Taper `répertoire` trouve *Ouvrir un dossier*. Le prévisible l'emporte sur l'astucieux : un terme que vous listez est trouvé, et aucun score approximatif que personne ne peut anticiper n'est utilisé.

### Votre propre filtre

`filter` remplace le filtre intégré. Il reçoit la `value`, le `textValue` et les `keywords` de l'élément ainsi que la recherche, et dit si l'élément reste. `defaultFilter` est exporté : un filtre à vous peut préparer ses entrées puis lui passer la main — ici, un filtre qui ignore les accents, pour que `cafe` trouve *Café* :

```ts
import { html } from '@c9up/aurora'
import { Command, defaultFilter } from '@c9up/nebula'

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '')

Command({
  filter: (candidate, query) =>
    defaultFilter({ ...candidate, textValue: fold(candidate.textValue), keywords: candidate.keywords.map(fold) }, fold(query)),
  children: () => html`…`,
})
```

### Un seul gestionnaire pour tous les éléments

Chaque élément exécute son propre `onSelect` ; le `onSelect` de la palette reçoit ensuite la `value` de l'élément. Servez-vous du second quand les éléments sont des données :

```ts
import { html } from '@c9up/aurora'
import { Command, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

const pages = [
  { value: '/settings', label: 'Réglages' },
  { value: '/billing', label: 'Facturation' },
]

Command({
  onSelect: (value) => navigate(value),
  children: () => html`
    ${CommandInput({ placeholder: 'Aller à…' })}
    ${CommandList({ children: () => pages.map((page) => CommandItem({ value: page.value, children: page.label })) })}
  `,
})
```

`value` identifie l'élément : gardez-la unique dans une palette.

### Une liste qui change

Les éléments s'enregistrent au moment où ils sont construits et le restent pendant toute la vie de la palette. Construisez la palette quand sa liste est connue — [CommandDialog](/fr/nebula/components/command-dialog) et [Combobox](/fr/nebula/components/combobox) reconstruisent la leur à chaque ouverture — plutôt que d'alimenter une palette figée avec une liste qui change.

## API

### Command

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le champ et la liste. |
| `filter` | `(candidate: CommandCandidate, query: string) => boolean` | `defaultFilter` | Dit si un élément survit à la recherche. |
| `onSelect` | `(value: string) => void` | — | Appelée avec la `value` de tout élément exécuté, après le `onSelect` de l'élément lui-même. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

### CommandInput

Une icône de recherche et le champ.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Type a command or search…'` | Le texte indicatif du champ. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'`<input>`. |

### CommandList

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | `CommandEmpty`, groupes, éléments, séparateurs. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la liste. Elle défile au-delà de 300 px. |

### CommandEmpty

Affiché seulement tant que la recherche ne trouve rien.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le message. |
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### CommandGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `heading` | `Slot` | — | Affiché au-dessus des éléments. |
| `children` | `Parts` | — | Les éléments du groupe. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### CommandItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Identifie l'élément ; c'est ce que reçoit le `onSelect` de `Command`. |
| `children` | `Slot` | — | Le contenu de l'élément. |
| `textValue` | `string` | `children` si c'est une chaîne, sinon `value` | Ce que compare le filtre. |
| `keywords` | `readonly string[]` | `[]` | Des termes supplémentaires qui trouvent l'élément. |
| `disabled` | `boolean` | `false` | Écarte l'élément des correspondances : il est masqué et ne s'exécute jamais. |
| `onSelect` | `() => void` | — | S'exécute quand l'élément est choisi. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'élément. |

### CommandSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du filet. |

### CommandShortcut

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les touches, alignées à droite dans l'élément. Affichage seulement. |
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### defaultFilter

`defaultFilter(candidate: CommandCandidate, query: string): boolean` — le filtre intégré. Une recherche vide trouve tout ; sinon l'élément correspond quand son `textValue` ou l'un de ses `keywords` contient la recherche, sans tenir compte de la casse.

`CommandCandidate` vaut `{ readonly value: string; readonly textValue: string; readonly keywords: readonly string[] }`.

## Accessibilité

Le champ est `role="combobox"`, avec `aria-controls` qui pointe vers la liste et `aria-activedescendant` vers l'élément surligné. La liste est `role="listbox"`, chaque élément `role="option"`, avec `aria-selected="true"` sur celui qui est surligné. Un groupe est `role="group"`. Les éléments filtrés et les groupes vides sont `hidden` : ils quittent aussi l'arbre d'accessibilité.

Le clavier ne fait jamais sortir le focus du champ. Avant que l'utilisateur ne bouge, la première correspondance est surlignée ; chaque modification de la recherche ramène le surlignage sur la première correspondance, si bien qu'Entrée n'exécute jamais un élément que la recherche a masqué. Le pointeur qui passe sur un élément le surligne.

| Touche | Action |
|---|---|
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Surligner la correspondance suivante ou précédente, en bouclant aux extrémités, et la faire défiler à l'écran. |
| <kbd>Entrée</kbd> | Exécuter l'élément surligné. |

Le texte indicatif du champ est en anglais par défaut ; `placeholder` le remplace, et `CommandEmpty` dit ce que vous lui donnez — voir [langues](/fr/nebula/languages).
