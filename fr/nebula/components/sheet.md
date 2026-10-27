# Sheet

Un panneau qui glisse depuis un bord de l'écran — des filtres, un panier, un menu de navigation sur téléphone. Structurellement c'est un [Dialog](/fr/nebula/components/dialog) épinglé à un côté plutôt que centré, donc tout aussi modal : fond assombri, focus piégé et rendu au déclencheur, défilement de la page bloqué, page derrière masquée aux technologies d'assistance, <kbd>Échap</kbd> et un clic sur le fond pour fermer.

Ce qui change, c'est le mouvement et la forme. Le panneau glisse au lieu de grandir, entre en 500 ms et sort en 300 — une surface qui apparaît veut être remarquée, une surface congédiée veut s'écarter. Un panneau latéral occupe toute la hauteur et les trois quarts de la largeur, plafonné à `max-w-sm` à partir du point de rupture `sm` ; un panneau du haut ou du bas occupe toute la largeur et prend la hauteur de son contenu.

```sh
ream nebula:add sheet
```

Organisme · `organisms/Sheet.ts` · [Dialog](/fr/nebula/components/dialog)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import {
  buttonVariants, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle, SheetTrigger,
} from '@c9up/nebula'

Sheet({
  children: () => html`
    ${SheetTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Filtres' })}
    ${SheetContent({
      children: () => html`
        ${SheetHeader({ children: html`
          ${SheetTitle({ children: 'Filtres' })}
          ${SheetDescription({ children: 'Affinez la liste.' })}
        ` })}
        ${SheetFooter({ children: SheetClose({ class: buttonVariants(), children: 'Terminé' }) })}
      `,
    })}
  `,
})
```

`SheetHeader` reçoit une valeur, pas un `() =>` : le titre doit être enregistré quand le panneau le cherche — voir [Dialog](/fr/nebula/components/dialog#le-titre-est-une-valeur). `SheetTrigger` et `SheetClose` sont des `<button>` nus qui prennent `buttonVariants(…)`.

## Exemples

### Depuis un autre côté

```ts
SheetContent({ side: 'left', children: () => SheetTitle({ children: 'Menu' }) })
SheetContent({ side: 'top', children: () => SheetTitle({ children: 'Recherche' }) })
SheetContent({ side: 'bottom', children: () => SheetTitle({ children: 'Partager' }) })
```

Le côté est physique : `left` reste le bord gauche dans une page de droite à gauche, parce que le bord par lequel entre un panneau est un choix de mise en page, pas un sens de lecture.

### Un milieu long

L'en-tête et le pied portent leur propre remplissage ; l'espace entre eux est à vous. Un milieu qui peut dépasser l'écran défile en prenant la hauteur restante :

```ts
SheetContent({
  children: () => html`
    ${SheetHeader({ children: SheetTitle({ children: 'Panier' }) })}
    <div class="flex-1 overflow-y-auto px-4">${() => items().map((item) => html`<p>${item.name}</p>`)}</div>
    ${SheetFooter({ children: SheetClose({ class: buttonVariants(), children: 'Commander' }) })}
  `,
})
```

`SheetFooter` porte `mt-auto` : il reste en bas d'un panneau latéral quel que soit le contenu du milieu.

### Fermer par le pied seulement

```ts
SheetContent({
  showCloseButton: false,
  children: () => html`
    ${SheetTitle({ children: 'Filtres' })}
    ${SheetFooter({ children: SheetClose({ class: buttonVariants(), children: 'Terminé' }) })}
  `,
})
```

Sans la croix du coin, <kbd>Échap</kbd> et le fond le ferment toujours.

### Ouvert d'ailleurs

```ts
import { signal } from '@c9up/aurora'

const cart = signal(false)

Sheet({
  open: cart,
  onOpenChange: cart,
  children: () => SheetContent({ children: () => SheetTitle({ children: 'Panier' }) }),
})

cart(true)
```

`onOpenChange` doit réécrire l'état : <kbd>Échap</kbd>, la croix et le fond ferment tous à travers lui.

## API

### Sheet

L'état que lit chaque partie. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand le panneau n'est pas contrôlé. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un `() =>`. |

### SheetTrigger

Un `<button>` qui ouvre le panneau.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### SheetContent

Le panneau. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le contenu du panneau, dans un `() =>`. |
| `side` | `Side` | `'right'` | Le bord d'où il vient : `'top' \| 'right' \| 'bottom' \| 'left'`. |
| `showCloseButton` | `boolean` | `true` | La croix du coin supérieur droit. |
| `closeLabel` | `string` | `'Close'` | Le nom accessible de la croix. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. Lue à chaque ouverture. |

### SheetHeader, SheetFooter, SheetDescription

`SheetSectionProps` :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. Passez une valeur à `SheetHeader` quand il contient le titre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la partie. |

`SheetHeader` et `SheetFooter` sont des colonnes avec remplissage, le pied poussé en bas. `SheetDescription` est un `<p>` qui décrit le panneau.

### SheetTitle

Un `<h2>` qui nomme le panneau.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le titre. |
| `srOnly` | `boolean` | `false` | Gardé pour les lecteurs d'écran, hors de la mise en page. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du titre. |

### SheetClose

Un `<button>` qui ferme le panneau, depuis n'importe où à l'intérieur.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### SheetOverlay

Le fond assombri, pour composer votre propre surface ; `SheetContent` en rend déjà un.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du fond. |

## Accessibilité

Le panneau est `role="dialog"` avec `aria-modal="true"`, nommé par `SheetTitle` et décrit par `SheetDescription` ; un titre manquant émet un avertissement. Tant qu'il est ouvert, le reste de la page est `aria-hidden`, le focus est piégé à l'intérieur et le défilement de la page est bloqué. Le focus part sur le premier élément focalisable du panneau et revient au déclencheur à la fermeture, ou à ce qui l'avait avant quand le panneau n'a pas de déclencheur. Le déclencheur porte `aria-haspopup="dialog"`, `aria-expanded` et `data-state`.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Sur le déclencheur, ouvre le panneau. |
| <kbd>Tab</kbd> | Élément focalisable suivant du panneau ; boucle du dernier au premier. |
| <kbd>Maj</kbd> + <kbd>Tab</kbd> | Le précédent ; boucle du premier au dernier. |
| <kbd>Échap</kbd> | Ferme le panneau. |

La croix du coin dit « Close » : `closeLabel` sur `SheetContent` la remplace — voir [langues](/fr/nebula/languages).
