# DropdownMenu

Un menu ouvert depuis un bouton : des actions, des entrées à cocher et des entrées radio, des libellés, des séparateurs, des sous-menus. Le modèle clavier travaille sur les entrées rendues — leur `role` et un marqueur `data-nebula-item` — jamais sur une description de celles-ci : des entrées composées librement se comportent quand même comme un seul menu.

Deux comportements sont propres à un menu ouvert par un bouton. Ouvert au clavier, il donne le focus à sa première entrée ; ouvert au pointeur, non, parce que présélectionner une entrée pour un utilisateur de souris laisse croire qu'elle va être choisie. Et <kbd>ArrowDown</kbd> sur le déclencheur ouvre le menu *et* y entre, comme le fait tout bouton de menu natif.

DropdownMenu, [ContextMenu](/fr/nebula/components/context-menu) et [Menubar](/fr/nebula/components/menubar) sont le même menu ouvert de trois façons. Leurs entrées viennent d'un seul module partagé, si bien que les trois ne peuvent pas diverger : ce que cette page dit des entrées vaut pour les deux autres.

```sh
ream nebula:add dropdown-menu
```

Organisme · `organisms/DropdownMenu.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@c9up/nebula'

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Ouvrir' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuItem({ children: 'Profil', onSelect: () => openProfile() })}
      ${DropdownMenuItem({ children: 'Se déconnecter', onSelect: () => logOut() })}
    ` })}
  `,
})
```

`DropdownMenu`, `DropdownMenuContent`, `DropdownMenuRadioGroup`, `DropdownMenuSub` et `DropdownMenuSubContent` prennent leurs parties dans un thunk — voir [composition](/fr/nebula/composition). `DropdownMenuContent` doit être construit pendant la construction du menu, directement dans ce thunk : le menu le lit une fois pour mettre en place son panneau, et un contenu construit plus tard dans un accesseur laisse le menu sans rien à ouvrir.

## Exemples

### Un déclencheur qui ressemble à un bouton

Le déclencheur est un `<button>` nu, sans classe à lui. Donnez-lui l'allure d'un bouton avec `buttonVariants` :

```ts
import { buttonVariants, DropdownMenuTrigger } from '@c9up/nebula'

DropdownMenuTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Compte' })
```

### Libellés, groupes, raccourcis

```ts
import { html } from '@c9up/aurora'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger,
} from '@c9up/nebula'

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Menu' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuLabel({ children: 'Mon compte' })}
      ${DropdownMenuGroup({ children: html`
        ${DropdownMenuItem({ children: html`Profil${DropdownMenuShortcut({ children: '⇧⌘P' })}` })}
        ${DropdownMenuItem({ children: html`Réglages${DropdownMenuShortcut({ children: '⌘,' })}` })}
      ` })}
      ${DropdownMenuSeparator({})}
      ${DropdownMenuItem({ children: 'Archiver', disabled: true })}
      ${DropdownMenuItem({ variant: 'destructive', children: 'Supprimer', onSelect: () => remove() })}
    ` })}
  `,
})
```

`DropdownMenuShortcut` ne fait qu'afficher les touches : liez le vrai raccourci vous-même. Une entrée `disabled` reste dans le menu, estompée, et les flèches, le pointeur et le clic la sautent.

### Entrées à cocher

Une entrée à cocher ne garde aucun état à elle. Elle affiche `checked` et signale l'inverse dans `onCheckedChange` : un signal fait les deux à la fois.

```ts
import { html, signal } from '@c9up/aurora'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@c9up/nebula'

const statusBar = signal(true)
const activityBar = signal(false)

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Affichage' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuCheckboxItem({ checked: statusBar, onCheckedChange: statusBar, children: "Barre d'état" })}
      ${DropdownMenuCheckboxItem({ checked: activityBar, onCheckedChange: activityBar, children: "Barre d'activité" })}
    ` })}
  `,
})
```

Choisir une entrée à cocher ferme le menu, comme toute autre entrée.

### Entrées radio

Il en va de même d'un groupe radio : `value` dit quelle entrée est cochée, `onValueChange` signale celle qu'on choisit, et rien ne change tant que vous ne l'écrivez pas en retour.

```ts
import { html, signal } from '@c9up/aurora'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@c9up/nebula'

const layout = signal<string | undefined>('list')

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Disposition' })}
    ${DropdownMenuContent({ children: () =>
      DropdownMenuRadioGroup({
        value: layout,
        onValueChange: layout,
        children: () => html`
          ${DropdownMenuRadioItem({ value: 'list', children: 'Liste' })}
          ${DropdownMenuRadioItem({ value: 'grid', children: 'Grille' })}
        `,
      }),
    })}
  `,
})
```

### Sous-menus

`DropdownMenuSub` associe une entrée à un panneau. Le panneau s'ouvre à côté de l'entrée dès que le pointeur l'atteint, ou sur <kbd>ArrowRight</kbd>, <kbd>Entrée</kbd> ou <kbd>Espace</kbd>, et chevauche un peu son parent pour que le pointeur puisse y entrer en diagonale.

```ts
import { html } from '@c9up/aurora'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@c9up/nebula'

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Partager' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuItem({ children: 'Copier le lien' })}
      ${DropdownMenuSub({ children: () => html`
        ${DropdownMenuSubTrigger({ children: 'Envoyer à' })}
        ${DropdownMenuSubContent({ children: () => html`
          ${DropdownMenuItem({ children: 'E-mail' })}
          ${DropdownMenuItem({ children: 'Messages' })}
        ` })}
      ` })}
    ` })}
  `,
})
```

Choisir une entrée d'un sous-menu ferme toute la pile.

### L'ouvrir depuis votre code

Passez `open` pour tenir l'état vous-même. `onOpenChange` signale chaque demande — le déclencheur, Échap, un clic à l'extérieur, une entrée choisie — et le menu suit `open` : écrivez la demande en retour.

```ts
import { html, signal } from '@c9up/aurora'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@c9up/nebula'

const menuOpen = signal(false)

DropdownMenu({
  open: menuOpen,
  onOpenChange: menuOpen,
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Actions' })}
    ${DropdownMenuContent({ children: () => DropdownMenuItem({ children: 'Renommer' }) })}
  `,
})

menuOpen(true)
```

Sans `open`, le menu tient son propre état, en partant de `defaultOpen`.

### Placement

Le panneau s'ouvre sous le déclencheur, aligné sur son bord de début, à 4 px. `side`, `align` et `sideOffset` le déplacent ; il se retourne et se décale tout seul quand la fenêtre manque de place.

```ts
DropdownMenuContent({ side: 'top', align: 'end', sideOffset: 8, children: () => DropdownMenuItem({ children: 'Se déconnecter' }) })
```

## API

### DropdownMenu

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le déclencheur et le contenu. |
| `open` | `Reactive<boolean>` | — | Contrôle l'état. Présente, le menu la suit. |
| `defaultOpen` | `boolean` | `false` | L'état de départ quand `open` est absente. |
| `onOpenChange` | `(open: boolean) => void` | — | Chaque demande d'ouverture ou de fermeture. |

### DropdownMenuTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton. Il n'en a aucune à lui. |

### DropdownMenuContent

Ne rend rien là où il est écrit : le menu place le panneau dans un portail à l'ouverture.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées. |
| `side` | `Side` | `'bottom'` | `'top'`, `'right'`, `'bottom'` ou `'left'` du déclencheur. |
| `align` | `Align` | `'start'` | `'start'`, `'center'` ou `'end'` le long de ce côté. |
| `sideOffset` | `number` | `4` | Distance au déclencheur, en pixels. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

### DropdownMenuItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `onSelect` | `() => void` | — | S'exécute quand l'entrée est choisie ; le menu se ferme ensuite. |
| `variant` | `'default' \| 'destructive'` | `'default'` | `destructive` dessine l'entrée dans la couleur destructive. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `inset` | `boolean` | `false` | Décale l'entrée pour l'aligner sur les entrées à cocher et radio. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### DropdownMenuCheckboxItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `checked` | `Reactive<boolean>` | `false` | Si la coche s'affiche. |
| `onCheckedChange` | `(checked: boolean) => void` | — | Appelée avec l'inverse de `checked`. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### DropdownMenuRadioGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées radio. |
| `value` | `Reactive<string \| undefined>` | — | La `value` de l'entrée cochée. |
| `onValueChange` | `(value: string) => void` | — | L'entrée choisie. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### DropdownMenuRadioItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Comparée à la `value` du groupe. |
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### DropdownMenuLabel

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte de l'intitulé. |
| `inset` | `boolean` | `false` | Le décale pour l'aligner sur les entrées à cocher et radio. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du libellé. |

### DropdownMenuGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les entrées qu'il rassemble. |
| `class` | `Reactive<string>` | — | Les classes du groupe. |

### DropdownMenuSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du filet. |

### DropdownMenuShortcut

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les touches, alignées à droite dans l'entrée. Affichage seulement. |
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### DropdownMenuSub

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Un `DropdownMenuSubTrigger` et un `DropdownMenuSubContent`. |

### DropdownMenuSubTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. Un chevron s'ajoute après. |
| `disabled` | `boolean` | `false` | Tient les flèches et le pointeur à l'écart de l'entrée : son sous-menu ne s'ouvre jamais. Contrairement aux autres entrées, elle n'est ni estompée ni marquée `aria-disabled`. |
| `inset` | `boolean` | `false` | Décale l'entrée. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### DropdownMenuSubContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées du sous-menu. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau du sous-menu. |

### DropdownMenuPortal

Monte ses enfants à la fin de `container`, hors de la place du composant dans la page. `DropdownMenuContent` n'en a pas besoin : le menu place son panneau dans un portail lui-même.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'il faut monter. |
| `container` | `() => Element \| null` | `document.body` | Où le monter. |

## Accessibilité

Le déclencheur porte `aria-haspopup="menu"`, `aria-expanded`, et `aria-controls` tant que le menu est ouvert. Le panneau est `role="menu"`, nommé par le déclencheur via `aria-labelledby`. Les entrées sont `menuitem`, `menuitemcheckbox` ou `menuitemradio`, les deux dernières avec `aria-checked` ; une entrée simple, à cocher ou radio désactivée a `aria-disabled="true"`. Une entrée de sous-menu a `aria-haspopup="menu"`, et `aria-expanded` avec `aria-controls` tant que son sous-menu est ouvert.

Ouvert au clavier, le focus arrive sur la première entrée ; ouvert au pointeur, c'est le panneau lui-même qui prend le focus, pour que les flèches et Échap atteignent le menu plutôt que la page derrière. Quand le menu se ferme alors que le focus est dans son panneau principal, le focus revient au déclencheur. Le pointeur qui passe sur une entrée lui donne le focus.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd>, <kbd>Espace</kbd>, <kbd>ArrowDown</kbd> | Sur le déclencheur : ouvrir le menu et donner le focus à sa première entrée. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Entrée suivante ou précédente, en bouclant aux extrémités. Les entrées désactivées sont sautées. |
| <kbd>Début</kbd>, <kbd>Fin</kbd> | Première ou dernière entrée. |
| <kbd>Entrée</kbd>, <kbd>Espace</kbd> | Choisir l'entrée qui a le focus, ou ouvrir son sous-menu. |
| <kbd>ArrowRight</kbd> | Sur une entrée de sous-menu : ouvrir le sous-menu et donner le focus à sa première entrée. |
| <kbd>ArrowLeft</kbd> | Dans un sous-menu : le fermer et revenir à son entrée. |
| <kbd>Échap</kbd> | Fermer le menu, depuis un sous-menu aussi. |
| <kbd>Tab</kbd> | Fermer le menu. |
| Lettres | Donner le focus à l'entrée suivante dont le texte commence par ce qui a été tapé ; les touches tapées en moins d'une seconde forment une seule recherche. |
