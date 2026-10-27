# Popover

Un panneau flottant ancré à un déclencheur : quelques réglages, une date, un court formulaire, un paragraphe d'aide. Il est téléporté dans `<body>` et positionné en coordonnées fixes, si bien qu'aucun `overflow: hidden` ni `transform` entre le déclencheur et la racine ne peut le rogner ; il bascule du côté opposé quand la place manque, glisse le long de son bord pour rester à l'écran, et suit le déclencheur quand la page défile ou se redimensionne.

`modal` décide si le focus est piégé. Un popover qui contient un formulaire doit le piéger — sortir à la tabulation d'un formulaire à moitié rempli vers la page derrière fait perdre sa place à l'utilisateur. Un popover qui contient de l'aide ne doit pas, parce que piéger le focus dans ce que l'utilisateur ne peut que lire est une impasse. Dans les deux cas, il n'est pas modal au sens d'une boîte de dialogue : la page reste vivante, et un clic à l'extérieur le ferme.

```sh
ream nebula:add popover
```

Organisme · `organisms/Popover.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { buttonVariants, Popover, PopoverContent, PopoverTrigger } from '@c9up/nebula'

Popover({
  children: () => html`
    ${PopoverTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Livraison' })}
    ${PopoverContent({ children: 'Les commandes passées avant 14 h partent le jour même.' })}
  `,
})
```

`PopoverTrigger` est un `<button>` sans allure propre ; donnez-lui `buttonVariants(…)`. `PopoverContent` ne rend rien là où il est écrit : le popover construit son panneau à chaque ouverture.

## Exemples

### En-tête, titre et description

```ts
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@c9up/nebula'

Popover({
  children: () => html`
    ${PopoverTrigger({ children: 'Ouvrir' })}
    ${PopoverContent({
      children: () => html`
        ${PopoverHeader({ children: html`
          ${PopoverTitle({ children: 'Dimensions' })}
          ${PopoverDescription({ children: 'Réglez la taille de la boîte.' })}
        ` })}
      `,
    })}
  `,
})
```

`PopoverTitle` est un `<div>`, pas un titre : dans un `role="dialog"`, un titre changerait la façon dont un lecteur d'écran annonce le panneau, qui est déjà nommé par son déclencheur.

### Un formulaire qui garde le focus

`modal: true` piège <kbd>Tab</kbd> dans le panneau. Le popover est contrôlé, donc l'enregistrement le ferme :

```ts
import { signal } from '@c9up/aurora'
import { Button, Input, Label } from '@c9up/nebula'

const open = signal(false)
const name = signal(board.name)

Popover({
  open,
  onOpenChange: open,
  children: () => html`
    ${PopoverTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Renommer' })}
    ${PopoverContent({
      modal: true,
      children: html`
        <div class="grid gap-2">
          ${Label({ for: 'board-name', children: 'Nom' })}
          ${Input({ id: 'board-name', value: name, onInput: name })}
          ${Button({ children: 'Enregistrer', onClick: () => { rename(name()); open(false) } })}
        </div>
      `,
    })}
  `,
})
```

### Placement

`side` choisit le bord du déclencheur, `align` l'alignement le long de ce bord, `sideOffset` l'écart en pixels :

```ts
PopoverContent({ side: 'right', align: 'start', sideOffset: 8, children: 'Panneau' })
```

Le panneau bascule du côté opposé quand le côté choisi n'a pas la place. Dans une page de droite à gauche, `left` et `right` s'échangent, et de même `start` et `end` pour un panneau en haut ou en bas. `data-side` sur le panneau dit où il a fini, et l'animation d'entrée glisse depuis ce côté.

### Contre un autre élément

`PopoverAnchor` positionne le panneau contre autre chose que le déclencheur — toute une cellule de tableau dont le bouton de menu est dans un coin, un repère de curseur dans un éditeur :

```ts
import { PopoverAnchor } from '@c9up/nebula'

Popover({
  children: () => html`
    ${PopoverAnchor({ class: 'block w-full', children: cell })}
    ${PopoverTrigger({ children: '⋯' })}
    ${PopoverContent({ children: 'Panneau' })}
  `,
})
```

## API

### Popover

L'état que lisent son déclencheur et son contenu. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand le popover n'est pas contrôlé. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `children` | `Parts` | — | Le déclencheur, le contenu et une ancre éventuelle, dans un `() =>`. |

### PopoverTrigger

Un `<button>` qui ouvre ou ferme le popover.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### PopoverAnchor

Un `<span>` contre lequel le panneau est positionné à la place du déclencheur.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'il enveloppe. |
| `class` | `Reactive<string>` | — | Les classes du span. |

### PopoverContent

Le panneau, large de 288 px par défaut. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du panneau, rendu à chaque ouverture ; un accesseur est alors rappelé. |
| `side` | `Side` | `'bottom'` | `'top' \| 'right' \| 'bottom' \| 'left'`. Bascule quand la place manque. |
| `align` | `Align` | `'center'` | `'start' \| 'center' \| 'end'` le long de ce côté. |
| `sideOffset` | `number` | `4` | L'écart entre l'ancre et le panneau, en px. |
| `modal` | `boolean` | `false` | Piège le focus à l'intérieur. Pour les panneaux qui contiennent des champs. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. Lue à chaque ouverture. |

### PopoverHeader, PopoverTitle, PopoverDescription

`PopoverSectionProps` :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la partie. |

`PopoverHeader` est une colonne en petit texte, `PopoverTitle` un `<div>` en graisse moyenne, `PopoverDescription` un `<p>` atténué.

### popoverContentClasses

La chaîne de classes du panneau, pour une surface qui doit ressembler à un popover.

## Accessibilité

Le panneau est `role="dialog"`, nommé par le déclencheur (`aria-labelledby`). Le déclencheur porte `aria-haspopup="dialog"`, `aria-expanded`, `data-state`, et `aria-controls` pointé vers le panneau tant qu'il est ouvert.

À l'ouverture, le focus va au premier élément focalisable du panneau. S'il n'y en a aucun, un panneau `modal` prend le focus lui-même et un panneau non modal le laisse où il était. Quand le panneau se ferme alors qu'il tient le focus, le focus revient : avec `modal`, à ce qui l'avait avant l'ouverture ; sans, au déclencheur — ou, avec un `PopoverAnchor`, à cette ancre, qui, simple `<span>`, ne peut pas le prendre. Un clic ailleurs ferme le panneau sans reprendre le focus. Les popovers ouverts dans une boîte de dialogue ou un autre popover s'empilent : <kbd>Échap</kbd> ferme d'abord le plus intérieur.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Sur le déclencheur, ouvre ou ferme le panneau. |
| <kbd>Tab</kbd> / <kbd>Maj</kbd> + <kbd>Tab</kbd> | Avec `modal`, parcourt le panneau et boucle aux deux bouts. |
| <kbd>Échap</kbd> | Ferme le panneau. |
