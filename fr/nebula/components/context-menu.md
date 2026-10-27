# ContextMenu

Le menu qu'ouvre un clic droit. Il s'ouvre au pointeur, pas contre un contrôle : une ancre de taille nulle est déplacée aux coordonnées du clic et le panneau est placé contre elle, si bien qu'il se retourne et se décale au bord de la fenêtre exactement comme le menu d'un bouton. Le menu propre du navigateur est supprimé dans la zone.

Le tactile n'a pas de bouton droit : un appui long — une demi-seconde — l'ouvre à la place. Bouger le doigt annule l'appui, si bien qu'un défilement qui commence sur la zone n'ouvre pas de menu sous le pouce.

Les entrées sont celles de [DropdownMenu](/fr/nebula/components/dropdown-menu), construites par le même module partagé : entrées à cocher et radio, libellés, raccourcis et sous-menus fonctionnent ici de la même façon.

```sh
ream nebula:add context-menu
```

Organisme · `organisms/ContextMenu.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@c9up/nebula'

ContextMenu({
  children: () => html`
    ${ContextMenuTrigger({ class: 'rounded-md border border-dashed p-12 text-sm', children: 'Clic droit ici' })}
    ${ContextMenuContent({ children: () => html`
      ${ContextMenuItem({ children: 'Couper', onSelect: () => cut() })}
      ${ContextMenuItem({ children: 'Copier', onSelect: () => copy() })}
      ${ContextMenuItem({ children: 'Coller', onSelect: () => paste() })}
    ` })}
  `,
})
```

`ContextMenu`, `ContextMenuContent`, `ContextMenuRadioGroup`, `ContextMenuSub` et `ContextMenuSubContent` prennent leurs parties dans un thunk — voir [composition](/fr/nebula/composition). `ContextMenuContent` doit être construit pendant la construction du menu, directement dans ce thunk : le menu le lit une fois pour mettre en place son panneau.

## Exemples

### La zone

`ContextMenuTrigger` est un `<div>` sans classe à lui : c'est la zone, quelle qu'elle soit, qui doit répondre au clic droit, stylée comme il vous faut. Il porte `data-state="open"` tant que son menu est affiché, ce qui permet à une ligne de rester surlignée pendant que le menu ouvert dessus est visible :

```ts
ContextMenuTrigger({ class: 'rounded-sm px-2 py-1 data-[state=open]:bg-accent', children: fileName })
```

### Toutes les sortes d'entrées

```ts
import { html, signal } from '@c9up/aurora'
import {
  ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@c9up/nebula'

const showBookmarks = signal(true)
const person = signal<string | undefined>('pedro')

ContextMenu({
  children: () => html`
    ${ContextMenuTrigger({ children: 'Clic droit ici' })}
    ${ContextMenuContent({ class: 'w-52', children: () => html`
      ${ContextMenuItem({ inset: true, children: html`Précédent${ContextMenuShortcut({ children: '⌘[' })}` })}
      ${ContextMenuItem({ inset: true, disabled: true, children: html`Suivant${ContextMenuShortcut({ children: '⌘]' })}` })}
      ${ContextMenuSub({ children: () => html`
        ${ContextMenuSubTrigger({ inset: true, children: "Plus d'outils" })}
        ${ContextMenuSubContent({ children: () => html`
          ${ContextMenuItem({ children: 'Enregistrer la page…' })}
          ${ContextMenuItem({ children: 'Outils de développement' })}
        ` })}
      ` })}
      ${ContextMenuSeparator({})}
      ${ContextMenuCheckboxItem({ checked: showBookmarks, onCheckedChange: showBookmarks, children: 'Afficher les favoris' })}
      ${ContextMenuSeparator({})}
      ${ContextMenuLabel({ inset: true, children: 'Personnes' })}
      ${ContextMenuRadioGroup({
        value: person,
        onValueChange: person,
        children: () => html`
          ${ContextMenuRadioItem({ value: 'pedro', children: 'Pedro Duarte' })}
          ${ContextMenuRadioItem({ value: 'colm', children: 'Colm Tuite' })}
        `,
      })}
    ` })}
  `,
})
```

Les entrées à cocher et radio ne gardent aucun état à elles : elles affichent `checked` ou `value` et signalent le changement, et un signal passé des deux côtés fait le reste — voir [DropdownMenu](/fr/nebula/components/dropdown-menu#entrees-a-cocher).

### Savoir quand il s'ouvre

Il n'y a pas de prop `open` : seuls un clic droit ou un appui long ouvrent un menu contextuel. `onOpenChange` signale les deux sens :

```ts
import { html } from '@c9up/aurora'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@c9up/nebula'

ContextMenu({
  onOpenChange: (open) => (open ? pauseAutoRefresh() : resumeAutoRefresh()),
  children: () => html`
    ${ContextMenuTrigger({ children: 'Clic droit ici' })}
    ${ContextMenuContent({ children: () => ContextMenuItem({ children: 'Actualiser' }) })}
  `,
})
```

## API

### ContextMenu

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le déclencheur et le contenu. |
| `onOpenChange` | `(open: boolean) => void` | — | Appelée quand le menu s'ouvre et quand il se ferme. |

### ContextMenuTrigger

La zone qui répond au clic droit et à l'appui long, et l'endroit où vit l'ancre du menu.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de la zone. |
| `class` | `Reactive<string>` | — | Les classes de la zone. Elle n'en a aucune à elle. |

### ContextMenuContent

Ne rend rien là où il est écrit : le menu place le panneau dans un portail à l'ouverture, 2 px sous le pointeur et en partant de lui.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

### ContextMenuItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `onSelect` | `() => void` | — | S'exécute quand l'entrée est choisie ; le menu se ferme ensuite. |
| `variant` | `'default' \| 'destructive'` | `'default'` | `destructive` dessine l'entrée dans la couleur destructive. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `inset` | `boolean` | `false` | Décale l'entrée pour l'aligner sur les entrées à cocher et radio. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### ContextMenuCheckboxItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `checked` | `Reactive<boolean>` | `false` | Si la coche s'affiche. |
| `onCheckedChange` | `(checked: boolean) => void` | — | Appelée avec l'inverse de `checked`. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### ContextMenuRadioGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées radio. |
| `value` | `Reactive<string \| undefined>` | — | La `value` de l'entrée cochée. |
| `onValueChange` | `(value: string) => void` | — | L'entrée choisie. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### ContextMenuRadioItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Comparée à la `value` du groupe. |
| `children` | `Slot` | — | Le contenu de l'entrée. |
| `disabled` | `boolean` | `false` | Estompe l'entrée et la rend inatteignable. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### ContextMenuLabel

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte de l'intitulé. |
| `inset` | `boolean` | `false` | Le décale pour l'aligner sur les entrées à cocher et radio. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du libellé. |

### ContextMenuGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les entrées qu'il rassemble. |
| `class` | `Reactive<string>` | — | Les classes du groupe. |

### ContextMenuSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du filet. |

### ContextMenuShortcut

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les touches, alignées à droite dans l'entrée. Affichage seulement. |
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### ContextMenuSub

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Un `ContextMenuSubTrigger` et un `ContextMenuSubContent`. |

### ContextMenuSubTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de l'entrée. Un chevron s'ajoute après. |
| `disabled` | `boolean` | `false` | Tient les flèches et le pointeur à l'écart de l'entrée : son sous-menu ne s'ouvre jamais. Contrairement aux autres entrées, elle n'est ni estompée ni marquée `aria-disabled`. |
| `inset` | `boolean` | `false` | Décale l'entrée. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'entrée. |

### ContextMenuSubContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les entrées du sous-menu. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau du sous-menu. |

### ContextMenuPortal

Monte ses enfants à la fin de `container`, hors de la place du composant dans la page. `ContextMenuContent` n'en a pas besoin : le menu place son panneau dans un portail lui-même.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'il faut monter. |
| `container` | `() => Element \| null` | `document.body` | Où le monter. |

## Accessibilité

Le panneau est `role="menu"` avec `aria-orientation="vertical"`. Les entrées sont `menuitem`, `menuitemcheckbox` ou `menuitemradio`, les deux dernières avec `aria-checked` ; une entrée simple, à cocher ou radio désactivée a `aria-disabled="true"`. Une entrée de sous-menu a `aria-haspopup="menu"`, et `aria-expanded` avec `aria-controls` tant que son sous-menu est ouvert. La zone déclencheuse n'a pas de rôle : elle est le contenu que vous y mettez.

Le menu écoute l'événement `contextmenu`, que les navigateurs émettent aussi pour la touche <kbd>Menu</kbd> et pour <kbd>Maj</kbd>+<kbd>F10</kbd> quand le focus est dans la zone — mettez-y donc quelque chose de focalisable si les utilisateurs du clavier ont besoin du menu. À l'ouverture, le panneau prend le focus, pour que les flèches et Échap atteignent le menu plutôt que la page derrière. Le pointeur qui passe sur une entrée lui donne le focus.

| Touche | Action |
|---|---|
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Entrée suivante ou précédente, en bouclant aux extrémités. Les entrées désactivées sont sautées. |
| <kbd>Début</kbd>, <kbd>Fin</kbd> | Première ou dernière entrée. |
| <kbd>Entrée</kbd>, <kbd>Espace</kbd> | Choisir l'entrée qui a le focus, ou ouvrir son sous-menu. |
| <kbd>ArrowRight</kbd> | Sur une entrée de sous-menu : ouvrir le sous-menu et donner le focus à sa première entrée. |
| <kbd>ArrowLeft</kbd> | Dans un sous-menu : le fermer et revenir à son entrée. |
| <kbd>Échap</kbd> | Fermer le menu, depuis un sous-menu aussi. |
| <kbd>Tab</kbd> | Fermer le menu. |
| Lettres | Donner le focus à l'entrée suivante dont le texte commence par ce qui a été tapé ; les touches tapées en moins d'une seconde forment une seule recherche. |
