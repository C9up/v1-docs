# Drawer

Un panneau du bas qu'on écarte d'un glissement. C'est un [Sheet](/fr/nebula/components/sheet) venu du bord inférieur — modal, avec fond assombri, focus piégé et rendu, défilement de la page bloqué, page derrière masquée aux technologies d'assistance — plus le geste qui le rend naturel sur un téléphone : tirer le panneau vers le bas pour le fermer.

Le glissement suit des règles qui le distinguent d'un panneau qui se contente de suivre le doigt. Il ne va que vers le bas, puisque tirer vers le haut décollerait le panneau de son bord. Relâché à plus de 120 px il se ferme, et un geste vif de plus de 0,5 px/ms aussi, si court soit-il — la distance seule ignorerait ce que veut dire un geste vif ; en deçà, il revient en place. La transition est coupée pendant que le doigt bouge, pour que le panneau ne traîne pas derrière, et rétablie au relâcher. La poignée est décorative : <kbd>Échap</kbd>, le fond et un `DrawerClose` font tout ce que fait le glissement, parce qu'un geste ne doit jamais être la seule sortie d'une surface modale.

```sh
ream nebula:add drawer
```

Organisme · `organisms/Drawer.ts` · [Dialog](/fr/nebula/components/dialog)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import {
  buttonVariants, Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader,
  DrawerTitle, DrawerTrigger,
} from '@c9up/nebula'

Drawer({
  children: () => html`
    ${DrawerTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Partager' })}
    ${DrawerContent({
      children: () => html`
        ${DrawerHeader({ children: html`
          ${DrawerTitle({ children: 'Partager cette page' })}
          ${DrawerDescription({ children: 'Toute personne ayant le lien peut la voir.' })}
        ` })}
        ${DrawerFooter({ children: DrawerClose({ class: buttonVariants({ variant: 'outline' }), children: 'Annuler' }) })}
      `,
    })}
  `,
})
```

`DrawerHeader` reçoit une valeur, pas un `() =>` : le titre doit être enregistré quand le panneau le cherche — voir [Dialog](/fr/nebula/components/dialog#le-titre-est-une-valeur). Il n'y a pas de croix dans le coin ; mettez un `DrawerClose` dans le contenu.

## Exemples

### Une liste qui défile

Un glissement qui commence sur une liste se battrait avec le défilement de la liste. `disableDrag` coupe le geste ; <kbd>Échap</kbd>, le fond et `DrawerClose` ferment toujours le panneau. Le panneau fait au plus 80 % de la hauteur de l'écran, si bien qu'une longue liste défile à l'intérieur :

```ts
DrawerContent({
  disableDrag: true,
  children: () => html`
    ${DrawerHeader({ children: DrawerTitle({ children: 'Choisir un pays' }) })}
    <ul class="flex-1 overflow-y-auto px-4">${() => countries().map((country) => html`<li>${country}</li>`)}</ul>
    ${DrawerFooter({ children: DrawerClose({ class: buttonVariants(), children: 'Terminé' }) })}
  `,
})
```

### Sans la poignée

```ts
DrawerContent({ showHandle: false, children: () => DrawerTitle({ children: 'Filtres' }) })
```

Le glissement marche sans la poignée : il part de n'importe où sur le panneau.

### Ouvert d'ailleurs

```ts
import { signal } from '@c9up/aurora'

const actions = signal(false)

Drawer({
  open: actions,
  onOpenChange: actions,
  children: () => DrawerContent({ children: () => DrawerTitle({ children: 'Actions' }) }),
})

actions(true)
```

`onOpenChange` doit réécrire l'état : le glissement, <kbd>Échap</kbd> et le fond ferment tous à travers lui.

## API

### Drawer

L'état que lit chaque partie. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand le panneau n'est pas contrôlé. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un `() =>`. |

### DrawerTrigger

Un `<button>` qui ouvre le panneau.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### DrawerContent

Le panneau, épinglé au bord inférieur. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le contenu du panneau, dans un `() =>`. |
| `showHandle` | `boolean` | `true` | La barre de préhension en haut. Décorative. |
| `disableDrag` | `boolean` | `false` | Coupe le glissement pour fermer — pour un panneau qui contient une liste qui défile. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. Lue à chaque ouverture. |

### DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription

`DrawerSectionProps` :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. Passez une valeur à `DrawerHeader` quand il contient le titre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la partie. |

`DrawerTitle` est un `<h2>` qui nomme le panneau, `DrawerDescription` un `<p>` qui le décrit. `DrawerHeader` et `DrawerFooter` sont des colonnes avec remplissage, le pied poussé en bas.

### DrawerClose

Un `<button>` qui ferme le panneau, depuis n'importe où à l'intérieur.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### DrawerOverlay

Le fond assombri, pour composer votre propre surface ; `DrawerContent` en rend déjà un.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du fond. |

## Accessibilité

Le panneau est `role="dialog"` avec `aria-modal="true"`, nommé par `DrawerTitle` et décrit par `DrawerDescription` ; un titre manquant émet un avertissement. La poignée est `aria-hidden`. Tant que le panneau est ouvert, le reste de la page est `aria-hidden`, le focus est piégé à l'intérieur et le défilement de la page est bloqué. Le focus part sur le premier élément focalisable du panneau et revient au déclencheur à la fermeture, ou à ce qui l'avait avant quand le panneau n'a pas de déclencheur. Le déclencheur porte `aria-haspopup="dialog"`, `aria-expanded` et `data-state`.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Sur le déclencheur, ouvre le panneau. |
| <kbd>Tab</kbd> | Élément focalisable suivant du panneau ; boucle du dernier au premier. |
| <kbd>Maj</kbd> + <kbd>Tab</kbd> | Le précédent ; boucle du premier au dernier. |
| <kbd>Échap</kbd> | Ferme le panneau. |
