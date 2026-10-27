# HoverCard

Un aperçu qui apparaît quand le pointeur se pose sur un lien — un profil derrière une `@mention`, une page derrière une URL. Il prend plus de temps qu'un [Tooltip](/fr/nebula/components/tooltip) dans les deux sens, pour des raisons différentes : il s'ouvre après 700 ms parce qu'une carte recouvre du contenu et ne doit apparaître que sur un arrêt délibéré, et il se ferme 300 ms après le départ du pointeur parce que la carte est faite pour qu'on y entre — elle contient des liens, et le pointeur doit franchir l'écart pour les atteindre.

Il est `role="dialog"`, pas `role="tooltip"` : une infobulle est une étiquette et ne doit rien contenir d'interactif, une carte de survol est une petite fenêtre qui le peut. Comme un [Popover](/fr/nebula/components/popover), il est téléporté dans `<body>`, bascule quand la place manque et suit son déclencheur au défilement.

```sh
ream nebula:add hover-card
```

Organisme · `organisms/HoverCard.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@c9up/nebula'

HoverCard({
  children: () => html`
    ${HoverCardTrigger({ href: '/people/ada', children: '@ada' })}
    ${HoverCardContent({ children: 'Ada Lovelace — a écrit le premier programme publié.' })}
  `,
})
```

## Exemples

### Une carte de profil

La carte contient ce dont un aperçu a besoin, liens compris — le pointeur peut y entrer et elle reste ouverte :

```ts
HoverCard({
  children: () => html`
    ${HoverCardTrigger({ href: `/people/${user.handle}`, class: 'font-medium underline', children: `@${user.handle}` })}
    ${HoverCardContent({
      children: html`
        <div class="grid gap-1">
          <p class="font-semibold">${user.name}</p>
          <p class="text-muted-foreground text-sm">${user.bio}</p>
          <a class="text-sm underline" href="${`/people/${user.handle}/posts`}">Publications</a>
        </div>
      `,
    })}
  `,
})
```

`HoverCardContent` lit ses `children` une fois, à la mise en place de la carte. Un texte qui change va dans un accesseur à l'intérieur du template — `` html`${() => profile().name}` `` — pas autour.

### Sans lien

Sans `href`, le déclencheur est un `<span>` en ligne autour de ses enfants. Placez la carte sur quelque chose de focalisable si les utilisateurs du clavier doivent l'avoir aussi, puisque le focus ne l'ouvre que depuis l'intérieur du déclencheur :

```ts
import { Button } from '@c9up/nebula'

HoverCard({
  children: () => html`
    ${HoverCardTrigger({ children: Button({ variant: 'link', children: 'Notes de version' }) })}
    ${HoverCardContent({ side: 'top', children: 'Version 2.4 — recherche plus rapide, mode sombre.' })}
  `,
})
```

### Délais

```ts
HoverCard({
  openDelay: 300,
  closeDelay: 100,
  children: () => html`
    ${HoverCardTrigger({ href: '/docs', children: 'Docs' })}
    ${HoverCardContent({ children: 'Guides et référence.' })}
  `,
})
```

### Ouverte par l'application

`open` la rend contrôlée — pour montrer une carte pendant une visite guidée, par exemple. Tant que `open` vaut un booléen, c'est lui qui décide ; le survol ne fait que demander, par `onOpenChange` :

```ts
import { signal } from '@c9up/aurora'

const showing = signal(false)

HoverCard({
  open: showing,
  onOpenChange: showing,
  children: () => html`
    ${HoverCardTrigger({ href: '/billing', children: 'Facturation' })}
    ${HoverCardContent({ children: 'Les factures ont déménagé ici.' })}
  `,
})
```

## API

### HoverCard

L'état que lisent son déclencheur et son contenu. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand la carte n'est pas contrôlée. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `openDelay` | `number` | `700` | Combien de temps le pointeur reste sur le déclencheur avant l'ouverture, en ms. |
| `closeDelay` | `number` | `300` | Combien de temps après le départ du pointeur du déclencheur ou de la carte avant la fermeture, en ms. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un `() =>`. |

### HoverCardTrigger

Ce sur quoi le pointeur se pose : un `<a>` quand il reçoit un `href`, un `<span>` inline-flex sinon.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du lien ou du span. |
| `href` | `string` | — | Fait du déclencheur un lien. |
| `class` | `Reactive<string>` | — | Les classes de l'élément. |

### HoverCardContent

La carte, large de 256 px. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu de la carte. Lu une fois, à la mise en place. |
| `side` | `Side` | `'bottom'` | `'top' \| 'right' \| 'bottom' \| 'left'`. Bascule quand la place manque. |
| `align` | `Align` | `'center'` | `'start' \| 'center' \| 'end'` le long de ce côté. |
| `sideOffset` | `number` | `8` | L'écart entre le déclencheur et la carte, en px. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la carte. Lue à chaque ouverture. |

## Accessibilité

La carte est `role="dialog"`, nommée par son déclencheur (`aria-labelledby`) ; le déclencheur porte `data-state`. Le focus qui entre dans le déclencheur programme l'ouverture comme le fait le pointeur — après `openDelay` — et le focus qui en sort programme la fermeture. La carte ne prend pas le focus, et elle est téléportée à la fin de la page, si bien que <kbd>Tab</kbd> depuis le déclencheur ne l'atteint pas : une carte de survol est un aperçu, et ce vers quoi elle pointe doit être joignable autrement.

| Touche | Action |
|---|---|
| <kbd>Échap</kbd> | Ferme la carte. |
