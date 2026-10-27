# Menubar

La barre de menus d'une application : Fichier, Édition, Affichage, chacun un menu. Il y a un seul panneau pour toute la barre, pas un par menu — un seul menu est ouvert à la fois, et passer de l'un à l'autre change l'ancre et le contenu du panneau plutôt que d'en fermer un pour en ouvrir un autre. C'est ce qui donne aux flèches la sensation de parcourir une barre plutôt que de congédier et convoquer.

Une fois un menu ouvert, le pointeur qui passe sur un autre déclencheur bascule vers lui ; tant qu'aucun n'est ouvert, le pointeur qui traverse la barre n'ouvre rien. Chaque `MenubarMenu` prend sa place dans la barre au moment où il est construit, et cet ordre est celui que parcourent les flèches.

Les entrées sont celles de [DropdownMenu](/fr/nebula/components/dropdown-menu), construites par le même module partagé : entrées à cocher et radio, libellés, raccourcis et sous-menus fonctionnent ici de la même façon.

```sh
ream nebula:add menubar
```

Organisme · `organisms/Menubar.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@c9up/nebula'

Menubar({
  children: () => html`
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Fichier' })}
      ${MenubarContent({ children: () => html`
        ${MenubarItem({ children: 'Nouvel onglet', onSelect: () => newTab() })}
        ${MenubarItem({ children: 'Imprimer…', onSelect: () => print() })}
      ` })}
    ` })}
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Édition' })}
      ${MenubarContent({ children: () => html`
        ${MenubarItem({ children: 'Annuler', onSelect: () => undo() })}
        ${MenubarItem({ children: 'Rétablir', onSelect: () => redo() })}
      ` })}
    ` })}
  `,
})
```

`Menubar`, `MenubarMenu`, `MenubarContent`, `MenubarRadioGroup`, `MenubarSub` et `MenubarSubContent` prennent leurs parties dans un thunk — voir [composition](/fr/nebula/composition).

## Exemples

### Une barre complète

```ts
import { html, signal } from '@c9up/aurora'
import {
  Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup,
  MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent,
  MenubarSubTrigger, MenubarTrigger,
} from '@c9up/nebula'

const bookmarksBar = signal(false)
const profile = signal<string | undefined>('benoit')

Menubar({
  children: () => html`
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Fichier' })}
      ${MenubarContent({ children: () => html`
        ${MenubarItem({ children: html`Nouvel onglet${MenubarShortcut({ children: '⌘T' })}` })}
        ${MenubarItem({ disabled: true, children: 'Nouvelle fenêtre privée' })}
        ${MenubarSeparator({})}
        ${MenubarSub({ children: () => html`
          ${MenubarSubTrigger({ children: 'Partager' })}
          ${MenubarSubContent({ children: () => html`
            ${MenubarItem({ children: 'Envoyer le lien par e-mail' })}
            ${MenubarItem({ children: 'Messages' })}
          ` })}
        ` })}
      ` })}
    ` })}
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Affichage' })}
      ${MenubarContent({ children: () =>
        MenubarCheckboxItem({ checked: bookmarksBar, onCheckedChange: bookmarksBar, children: 'Toujours afficher la barre des favoris' }),
      })}
    ` })}
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Profils' })}
      ${MenubarContent({ children: () =>
        MenubarRadioGroup({
          value: profile,
          onValueChange: profile,
          children: () => html`
            ${MenubarRadioItem({ value: 'andy', children: 'Andy' })}
            ${MenubarRadioItem({ value: 'benoit', children: 'Benoit' })}
          `,
        }),
      })}
    ` })}
  `,
})
```

Les entrées à cocher et radio ne gardent aucun état à elles : elles affichent `checked` ou `value` et signalent le changement, et un signal passé des deux côtés fait le reste — voir [DropdownMenu](/fr/nebula/components/dropdown-menu#entrees-a-cocher).

### Un menu qui ne peut pas s'ouvrir

Un déclencheur `disabled` garde sa place dans la barre, mais son menu ne s'ouvre jamais, ni au clic, ni au clavier, ni au survol :

```ts
MenubarMenu({ children: () => html`
  ${MenubarTrigger({ disabled: true, children: 'Historique' })}
  ${MenubarContent({ children: () => MenubarItem({ children: "Tout l'historique" }) })}
` })
```

Les flèches ne l'enjambent pas : parcourir la barre, depuis un déclencheur ou depuis un menu ouvert, s'arrête au menu qui le précède.

### Des menus tirés de données

Le thunk de la barre est appelé une fois, pendant la construction : il peut parcourir une liste.

```ts
import { html } from '@c9up/aurora'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@c9up/nebula'

const menus = [
  { label: 'Fichier', entries: [{ label: 'Nouveau', run: newTab }] },
  { label: 'Édition', entries: [{ label: 'Annuler', run: undo }] },
]

Menubar({
  children: () =>
    menus.map((menu) =>
      MenubarMenu({
        children: () => html`
          ${MenubarTrigger({ children: menu.label })}
          ${MenubarContent({ children: () => menu.entries.map((entry) => MenubarItem({ children: entry.label, onSelect: entry.run })) })}
        `,
      }),
    ),
})
```

## API

### Menubar

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les menus. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la barre. |

### MenubarMenu

Un menu de la barre. Il fournit sa place au déclencheur et au contenu qu'il contient, si bien qu'aucun des deux n'a à savoir à quel menu il appartient.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Un `MenubarTrigger` et un `MenubarContent`. |

### MenubarTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `disabled` | `boolean` | `false` | Le menu ne s'ouvre jamais. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du bouton. |

### MenubarContent

Ne rend rien là où il est écrit : le panneau de la barre l'affiche sous le déclencheur, aligné sur son bord de début, à 4 px.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

### MenubarItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `onSelect` | `() => void` | — | S'exécute quand l'entrée est choisie ; le menu se ferme ensuite. |
| `variant` | `'default' \| 'destructive'` | `'default'` | `destructive` dessine l'entrée dans la couleur destructive. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `inset` | `boolean` | `false` | Décale l'entrée pour l'aligner sur les entrées à cocher et radio. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### MenubarCheckboxItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `checked` | `Reactive<boolean>` | `false` | Si la coche s'affiche. |
| `onCheckedChange` | `(checked: boolean) => void` | — | Appelée avec l'inverse de `checked`. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### MenubarRadioGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées radio. |
| `value` | `Reactive<string \| undefined>` | — | La `value` de l'entrée cochée. |
| `onValueChange` | `(value: string) => void` | — | L'entrée choisie. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### MenubarRadioItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Comparée à la `value` du groupe. |
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### MenubarLabel

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte de l'intitulé. |
| `inset` | `boolean` | `false` | Le décale pour l'aligner sur les entrées à cocher et radio. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du libellé. |

### MenubarGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les entrées qu'il rassemble. |
| `class` | `Reactive<string>` | — | Les classes du groupe. |

### MenubarSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du filet. |

### MenubarShortcut

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les touches, alignées à droite dans l'entrée. Affichage seulement. |
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### MenubarSub

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Un `MenubarSubTrigger` et un `MenubarSubContent`. |

### MenubarSubTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. Un chevron s'ajoute après. |
| `disabled` | `boolean` | `false` | Tient les flèches et le pointeur à l'écart de l'entrée : son sous-menu ne s'ouvre jamais. Contrairement aux autres entrées, elle n'est ni estompée ni marquée `aria-disabled`. |
| `inset` | `boolean` | `false` | Décale l'entrée. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### MenubarSubContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées du sous-menu. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau du sous-menu. |

### MenubarPortal

Monte ses enfants à la fin de `container`, hors de la place du composant dans la page. `MenubarContent` n'en a pas besoin : le menu place son panneau dans un portail lui-même.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'il faut monter. |
| `container` | `() => Element \| null` | `document.body` | Où le monter. |

## Accessibilité

La barre est `role="menubar"` et chaque déclencheur un `<button>` avec `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, et `aria-controls` tant que son menu est ouvert. Le panneau est `role="menu"`, nommé par le déclencheur ouvert via `aria-labelledby`. Les entrées sont `menuitem`, `menuitemcheckbox` ou `menuitemradio`, les deux dernières avec `aria-checked` ; une entrée simple, à cocher ou radio désactivée a `aria-disabled="true"`. Une entrée de sous-menu a `aria-haspopup="menu"`, et `aria-expanded` avec `aria-controls` tant que son sous-menu est ouvert.

Ouvert au clavier, le focus arrive sur la première entrée du menu ; ouvert au pointeur, c'est le panneau lui-même qui prend le focus, pour que les flèches et Échap l'atteignent plutôt que la page derrière. Quand le menu se ferme alors que le focus est dans son panneau principal, le focus revient à son déclencheur. Chaque déclencheur est un arrêt de tabulation à lui seul. <kbd>ArrowRight</kbd> sur une entrée de sous-menu est aussi pris par la barre, qui passe au menu suivant : ouvrez un sous-menu avec <kbd>Entrée</kbd>, <kbd>Espace</kbd> ou le pointeur.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd>, <kbd>Espace</kbd>, <kbd>ArrowDown</kbd> | Sur un déclencheur : ouvrir son menu et donner le focus à la première entrée. |
| <kbd>ArrowRight</kbd>, <kbd>ArrowLeft</kbd> | Sur un déclencheur : donner le focus au déclencheur suivant ou précédent, en bouclant. Dans un menu ouvert : ouvrir le menu suivant ou précédent et donner le focus à sa première entrée. Un déclencheur désactivé n'est pas sauté. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Dans un menu : entrée suivante ou précédente, en bouclant. Les entrées désactivées sont sautées. |
| <kbd>Début</kbd>, <kbd>Fin</kbd> | Première ou dernière entrée. |
| <kbd>Entrée</kbd>, <kbd>Espace</kbd> | Choisir l'entrée qui a le focus, ou ouvrir son sous-menu. |
| <kbd>ArrowLeft</kbd> | Dans un sous-menu : le fermer et revenir à son entrée. |
| <kbd>Échap</kbd> | Fermer le menu, depuis un sous-menu aussi. |
| <kbd>Tab</kbd> | Fermer le menu. |
| Lettres | Donner le focus à l'entrée suivante dont le texte commence par ce qui a été tapé ; les touches tapées en moins d'une seconde forment une seule recherche. |
