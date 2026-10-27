# CommandDialog

La palette de commandes au sens où on l'entend d'habitude : une [Command](/fr/nebula/components/command) dans une fenêtre modale au-dessus de la page, ouverte par un raccourci clavier, congédiée par Échap ou un clic à l'extérieur. Rien de la palette n'est réécrit — le filtre, le surlignage et les touches sont ceux de `Command` — et ce composant n'ajoute que l'enveloppe modale et le raccourci.

Le raccourci est facultatif mais intégré, parce que bien le lier est plus délicat qu'il n'y paraît. Il écoute le document en phase de capture, pour qu'un menu ou une boîte de dialogue déjà ouverts ne l'avalent pas ; il empêche l'action par défaut du navigateur, puisque ⌘K donne le focus à la barre de recherche dans plusieurs navigateurs ; et il bascule plutôt qu'il n'ouvre, si bien que la même combinaison ferme la palette.

La boîte de dialogue a un titre même quand aucun ne s'affiche. Une boîte de dialogue sans nom accessible est annoncée comme un simple « dialogue » ; le champ de recherche de la palette est l'indice visible, et le titre est là pour le lecteur d'écran.

```sh
ream nebula:add command-dialog
```

Organisme · `organisms/CommandDialog.ts` · [command](/fr/nebula/components/command), [dialog](/fr/nebula/components/dialog)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

CommandDialog({
  shortcut: 'k',
  children: () => html`
    ${CommandInput({})}
    ${CommandList({ children: () => html`
      ${CommandEmpty({ children: 'Aucun résultat.' })}
      ${CommandItem({ value: 'new', children: 'Nouveau fichier', onSelect: () => createFile() })}
      ${CommandItem({ value: 'settings', children: 'Réglages', onSelect: () => openSettings() })}
    ` })}
  `,
})
```

<kbd>⌘</kbd>+<kbd>K</kbd> ou <kbd>Ctrl</kbd>+<kbd>K</kbd> l'ouvre et la ferme — l'un ou l'autre modificateur, sur toutes les plateformes, sans détecter le navigateur. `children` est un thunk, transmis tel quel à la `Command` qu'elle contient — voir [composition](/fr/nebula/composition).

## Exemples

### L'ouvrir depuis un bouton

La palette n'a pas de déclencheur à elle. Pour l'ouvrir aussi depuis votre interface, tenez l'état : `onOpenChange` signale le raccourci, Échap, un clic à l'extérieur et un élément choisi, et la boîte de dialogue suit `open`.

```ts
import { html, signal } from '@c9up/aurora'
import { Button, CommandDialog, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

const paletteOpen = signal(false)

Button({ variant: 'outline', children: 'Rechercher…', onClick: () => paletteOpen(true) })

CommandDialog({
  open: paletteOpen,
  onOpenChange: paletteOpen,
  shortcut: 'k',
  children: () => html`
    ${CommandInput({})}
    ${CommandList({ children: () => CommandItem({ value: 'new', children: 'Nouveau fichier' }) })}
  `,
})
```

Sans `open`, la boîte de dialogue tient son propre état, en partant de `defaultOpen`. Laissez `shortcut` de côté pour une palette qu'ouvre seulement votre code.

### Exécuter l'élément choisi

Choisir un élément exécute son propre `onSelect`, puis le `onSelect` de la boîte de dialogue avec sa `value`, puis ferme la boîte de dialogue — après l'action, pour qu'un gestionnaire qui ouvre une autre surface n'ait pas celle-ci en train de démonter le focus sous ses pieds.

```ts
CommandDialog({
  shortcut: 'p',
  onSelect: (value) => navigate(value),
  children: () => html`
    ${CommandInput({ placeholder: 'Aller à…' })}
    ${CommandList({ children: () => pages.map((page) => CommandItem({ value: page.path, children: page.title })) })}
  `,
})
```

La palette est reconstruite à chaque ouverture : la recherche repart vide, et c'est la liste `pages` du moment qui s'affiche.

### Titre et description

`title` et `description` sont lus par un lecteur d'écran à l'ouverture. Le titre est masqué visuellement sauf avec `showTitle` ; la description l'est toujours.

```ts
CommandDialog({
  title: 'Chercher dans la documentation',
  description: "Tapez le nom d'une page, puis Entrée.",
  showTitle: true,
  contentClass: 'max-w-xl',
  children: () => html`
    ${CommandInput({ placeholder: 'Chercher dans la documentation…' })}
    ${CommandList({ children: () => pages.map((page) => CommandItem({ value: page.path, children: page.title })) })}
  `,
})
```

## API

### CommandDialog

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les parties de la palette : `CommandInput`, `CommandList` et ce qu'elle contient. |
| `shortcut` | `string` | — | Un caractère : avec ⌘ ou Ctrl, il bascule la palette. Absente, il n'y a pas de raccourci. |
| `open` | `Reactive<boolean>` | — | Contrôle l'état. Présente, la boîte de dialogue la suit. |
| `defaultOpen` | `boolean` | `false` | L'état de départ quand `open` est absente. |
| `onOpenChange` | `(open: boolean) => void` | — | Chaque demande d'ouverture ou de fermeture. |
| `onSelect` | `(value: string) => void` | — | Appelée avec la `value` de l'élément choisi, avant la fermeture. |
| `filter` | `(candidate: CommandCandidate, query: string) => boolean` | `defaultFilter` | Transmise à la `Command` — voir [son filtre](/fr/nebula/components/command#votre-propre-filtre). |
| `title` | `Child` | `'Command palette'` | Le nom accessible de la boîte de dialogue. |
| `description` | `Child` | — | Lue après le titre. Toujours masquée visuellement. |
| `showTitle` | `boolean` | `false` | Affiche le titre au-dessus du champ. |
| `contentClass` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

## Accessibilité

Le panneau est `role="dialog"` avec `aria-modal="true"`, nommé par son titre via `aria-labelledby` et décrit par `description` via `aria-describedby` quand elle existe. Tant qu'il est ouvert, le reste de la page est caché aux technologies d'assistance par `aria-hidden`, le focus est piégé à l'intérieur et la page ne défile pas.

À l'ouverture, le focus va au champ de recherche plutôt qu'au premier élément focalisable — tout l'intérêt de la palette est qu'on peut taper aussitôt. À la fermeture, le focus revient à ce qui l'avait avant. À l'intérieur, les touches sont [celles de Command](/fr/nebula/components/command#accessibilite).

| Touche | Action |
|---|---|
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + `shortcut` | Ouvrir ou fermer la palette, depuis n'importe où dans la page. |
| <kbd>Échap</kbd> | Fermer la palette. |
| <kbd>Tab</kbd>, <kbd>Maj</kbd>+<kbd>Tab</kbd> | Parcourir les éléments focalisables du panneau sans en sortir. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Surligner la correspondance suivante ou précédente. |
| <kbd>Entrée</kbd> | Exécuter l'élément surligné et fermer la palette. |

Le titre vaut par défaut l'anglais « Command palette » : `title` le remplace, et le `placeholder` de `CommandInput` remplace celui du champ — voir [langues](/fr/nebula/languages).
