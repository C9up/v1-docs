# Tooltip

Une courte étiquette qui apparaît quand le pointeur se pose sur un contrôle ou que le clavier y arrive. Quatre parties : un `TooltipProvider` qui fixe les délais d'un groupe, un `Tooltip` qui porte l'état d'une infobulle, un `TooltipTrigger` autour du contrôle et un `TooltipContent` avec le texte.

Ce qui sépare une infobulle utile d'une infobulle agaçante, c'est le temps, pas l'apparence. Un **délai de fermeture** de 150 ms laisse le pointeur aller du déclencheur à l'infobulle — pour en lire une longue — sans la fermer en route. **Pas de délai entre voisines** : une fois qu'une infobulle s'est fermée, la suivante du même groupe s'ouvre aussitôt pendant `skipDelayDuration`, parce qu'un utilisateur qui longe une barre d'outils a décidé de la parcourir. Et **le focus l'ouvre tout de suite** : un utilisateur du clavier qui arrive sur un contrôle s'y est déjà engagé. Le délai d'ouverture au survol est de 0 ms, sauf si un fournisseur ou l'infobulle fixe `delayDuration`.

Une infobulle *décrit* son contrôle ; elle ne le nomme jamais. Le déclencheur pointe `aria-describedby` vers elle, et un bouton nommé seulement par son infobulle est sans nom pour tout ce qui ne survole pas — donnez à un bouton-icône son propre `label`.

```sh
ream nebula:add tooltip
```

Organisme · `organisms/Tooltip.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Button, SearchIcon, Tooltip, TooltipContent, TooltipTrigger } from '@c9up/nebula'

Tooltip({
  children: () => html`
    ${TooltipTrigger({ children: Button({ size: 'icon', label: 'Rechercher', children: SearchIcon() }) })}
    ${TooltipContent({ children: 'Rechercher dans les archives' })}
  `,
})
```

`TooltipTrigger` enveloppe le contrôle dans un `<span>` inline-flex ; c'est le contrôle à l'intérieur qui prend le focus, donc enveloppez quelque chose de focalisable — du texte seul serait hors de portée du clavier.

## Exemples

### Une barre d'outils

Un fournisseur donne à un groupe ses propres délais. Ici la première infobulle attend 500 ms, et ses voisines s'ouvrent aussitôt pendant 300 ms après qu'une s'est fermée :

```ts
import { ChevronLeftIcon, ChevronRightIcon, TooltipProvider } from '@c9up/nebula'

TooltipProvider({
  delayDuration: 500,
  children: () => html`
    ${Tooltip({ children: () => html`
      ${TooltipTrigger({ children: Button({ size: 'icon', label: 'Précédente', children: ChevronLeftIcon() }) })}
      ${TooltipContent({ children: 'Page précédente' })}
    ` })}
    ${Tooltip({ children: () => html`
      ${TooltipTrigger({ children: Button({ size: 'icon', label: 'Suivante', children: ChevronRightIcon() }) })}
      ${TooltipContent({ children: 'Page suivante' })}
    ` })}
  `,
})
```

Sans fournisseur, toutes les infobulles de la page partagent un même groupe par défaut.

### Placement

`TooltipContent` se place au-dessus du déclencheur par défaut et bascule quand la place manque. Sa flèche reste centrée sur le déclencheur, même quand l'infobulle glisse le long de son bord pour rester à l'écran :

```ts
TooltipContent({ side: 'right', sideOffset: 4, children: 'Épinglé à la barre latérale' })
```

### Un texte qui change

Les `children` de `TooltipContent` sont une valeur, pas un accesseur : ce qui change va dans un template.

```ts
TooltipContent({ children: html`${() => `${unread()} non lus`}` })
```

### Ouverte par l'application

```ts
import { signal } from '@c9up/aurora'

const hint = signal(false)

Tooltip({
  open: hint,
  children: () => html`
    ${TooltipTrigger({ children: Button({ children: 'Exporter' }) })}
    ${TooltipContent({ children: 'Nouveau : export en PDF' })}
  `,
})

hint(true)
```

Tant que `open` vaut un booléen, c'est lui qui décide. Sans `onOpenChange` qui réécrit l'état, le survol et le focus ne changent rien.

### Un contenu où le pointeur ne peut pas entrer

`disableHoverableContent` ferme l'infobulle 150 ms après que le pointeur a quitté le déclencheur, même en route vers l'infobulle — pour une infobulle posée sur quelque chose que l'utilisateur vise :

```ts
Tooltip({
  disableHoverableContent: true,
  children: () => html`
    ${TooltipTrigger({ children: Button({ variant: 'ghost', children: 'Infos' }) })}
    ${TooltipContent({ children: 'Synchronisé il y a 2 minutes' })}
  `,
})
```

## API

### TooltipProvider

Les délais partagés par toutes les infobulles qu'il contient. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `delayDuration` | `number` | `0` | Délai de survol avant l'ouverture, en ms. |
| `skipDelayDuration` | `number` | `300` | Combien de temps après la fermeture d'une infobulle la suivante du groupe s'ouvre aussitôt, en ms. |
| `disableHoverableContent` | `boolean` | `false` | Ferme dès que le pointeur quitte le déclencheur, même vers l'infobulle. |
| `children` | `Parts` | — | Les infobulles, dans un `() =>`. |

### Tooltip

L'état d'une infobulle. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand l'infobulle n'est pas contrôlée. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `delayDuration` | `number` | celui du fournisseur | Remplace le délai du fournisseur pour cette infobulle seulement. |
| `disableHoverableContent` | `boolean` | celui du fournisseur | Remplace le réglage du fournisseur pour cette infobulle seulement. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un `() =>`. |

### TooltipTrigger

Le contrôle décrit, enveloppé dans un `<span>` inline-flex.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contrôle. |
| `class` | `Reactive<string>` | — | Les classes de l'enveloppe. |

### TooltipContent

L'étiquette, avec sa flèche. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Child` | — | Le texte. Une valeur ; mettez ce qui change dans un accesseur à l'intérieur d'un template. |
| `side` | `Side` | `'top'` | `'top' \| 'right' \| 'bottom' \| 'left'`. Bascule quand la place manque. |
| `align` | `Align` | `'center'` | `'start' \| 'center' \| 'end'` le long de ce côté. |
| `sideOffset` | `number` | `0` | L'écart entre le déclencheur et l'infobulle, en px. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'infobulle. Lue à chaque ouverture. |

## Accessibilité

Le contenu est `role="tooltip"`. Tant qu'il est ouvert, l'enveloppe du déclencheur porte `aria-describedby` pointé vers lui — une description, jamais `aria-labelledby` — et `data-state`. L'infobulle ne prend jamais le focus et n'est pas une couche qu'un clic referme : elle se ferme parce que le pointeur ou le focus est parti, après 150 ms.

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Donner le focus au contrôle ouvre son infobulle tout de suite ; le quitter la ferme. |
| <kbd>Échap</kbd> | Ferme l'infobulle. |
