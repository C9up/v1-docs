# AlertDialog

Une modale qui interrompt pour poser une question. C'est un [Dialog](/fr/nebula/components/dialog) — même fond, même piège à focus, même blocage du défilement, même page masquée derrière — dont on a retiré tout ce qui permettrait d'écarter la question par mégarde : un clic sur le fond ne fait rien, il n'y a pas de croix dans le coin, et le focus se pose sur **Annuler**, pas sur l'action qui confirme, pour qu'un <kbd>Entrée</kbd> précipité prenne la sortie sûre.

<kbd>Échap</kbd> la ferme toujours, et annule plutôt que de confirmer : c'est la façon clavier de prendre la même sortie sûre. La réponse vous parvient par `onConfirm` et `onCancel` ; les deux ferment la boîte après vous avoir appelé.

```sh
ream nebula:add alert-dialog
```

Organisme · `organisms/AlertDialog.ts` · [Button](/fr/nebula/components/button), [Dialog](/fr/nebula/components/dialog)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, buttonVariants,
} from '@c9up/nebula'

AlertDialog({
  onConfirm: () => remove(),
  children: () => html`
    ${AlertDialogTrigger({ class: buttonVariants({ variant: 'destructive' }), children: 'Supprimer' })}
    ${AlertDialogContent({
      children: () => html`
        ${AlertDialogHeader({ children: html`
          ${AlertDialogTitle({ children: 'Supprimer ce projet ?' })}
          ${AlertDialogDescription({ children: 'Ses fichiers et son historique partent avec lui. Impossible de revenir en arrière.' })}
        ` })}
        ${AlertDialogFooter({ children: html`
          ${AlertDialogCancel({ children: 'Annuler' })}
          ${AlertDialogAction({ variant: 'destructive', children: 'Supprimer' })}
        ` })}
      `,
    })}
  `,
})
```

`AlertDialogHeader` reçoit une valeur, pas un `() =>` : le titre doit être enregistré quand le panneau le cherche — voir [Dialog](/fr/nebula/components/dialog#le-titre-est-une-valeur). `AlertDialogAction` et `AlertDialogCancel` sont déjà des boutons stylés ; `AlertDialogTrigger` est un `<button>` nu qui prend `buttonVariants(…)`.

## Exemples

### Petite, avec une icône

`size: 'sm'` rétrécit le panneau, centre l'en-tête et met les deux boutons côte à côte. `AlertDialogMedia` est le bloc au-dessus du titre pour un pictogramme d'alerte ou une marque ; un SVG placé dedans fait 32 px, sauf s'il porte sa propre classe `size-*`.

```ts
import { AlertDialogMedia, CircleIcon } from '@c9up/nebula'

AlertDialogContent({
  size: 'sm',
  children: () => html`
    ${AlertDialogHeader({ children: html`
      ${AlertDialogMedia({ children: CircleIcon() })}
      ${AlertDialogTitle({ children: 'Quitter sans enregistrer ?' })}
    ` })}
    ${AlertDialogFooter({ children: html`
      ${AlertDialogCancel({ children: 'Rester' })}
      ${AlertDialogAction({ children: 'Quitter' })}
    ` })}
  `,
})
```

### Posée d'ailleurs

Une confirmation ouverte par le menu d'une ligne plutôt que par un déclencheur à elle :

```ts
import { signal } from '@c9up/aurora'

const confirming = signal(false)

AlertDialog({
  open: confirming,
  onOpenChange: confirming,
  onConfirm: () => archive(),
  children: () => AlertDialogContent({
    children: () => html`
      ${AlertDialogHeader({ children: AlertDialogTitle({ children: 'Archiver 12 factures ?' }) })}
      ${AlertDialogFooter({ children: html`
        ${AlertDialogCancel({ children: 'Annuler' })}
        ${AlertDialogAction({ children: 'Archiver' })}
      ` })}
    `,
  }),
})

confirming(true)
```

### Rester ouverte pendant la requête

`onConfirm` est appelé et la boîte demande aussitôt à se fermer. Une boîte contrôlée peut refuser : `onOpenChange` n'est qu'une demande, et un gestionnaire qui ignore le `false` laisse la boîte affichée — Échap compris — jusqu'à la fin du travail :

```ts
const open = signal(false)
const deleting = signal(false)

AlertDialog({
  open,
  onOpenChange: (next) => { if (!deleting()) open(next) },
  onConfirm: async () => {
    if (deleting()) return
    deleting(true)
    try { await remove() } finally { deleting(false) }
    open(false)
  },
  children: () => html`
    ${AlertDialogTrigger({ class: buttonVariants({ variant: 'destructive' }), children: 'Supprimer' })}
    ${AlertDialogContent({
      children: () => html`
        ${AlertDialogHeader({ children: AlertDialogTitle({ children: 'Supprimer ce projet ?' }) })}
        ${AlertDialogFooter({ children: html`
          ${AlertDialogCancel({ children: 'Annuler' })}
          ${AlertDialogAction({ variant: 'destructive', children: () => (deleting() ? 'Suppression…' : 'Supprimer') })}
        ` })}
      `,
    })}
  `,
})
```

## API

### AlertDialog

L'état que lit chaque partie. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand la boîte n'est pas contrôlée. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `onConfirm` | `() => void` | — | L'action a été pressée. Appelé avant la fermeture. |
| `onCancel` | `() => void` | — | Annuler a été pressé, ou <kbd>Échap</kbd>. Appelé avant la fermeture. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un `() =>`. |

### AlertDialogTrigger

Un `<button>` qui ouvre la boîte.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### AlertDialogContent

Le panneau. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le contenu du panneau, dans un `() =>`. |
| `size` | `'default' \| 'sm'` | `'default'` | `sm` est un panneau étroit, en-tête centré et deux boutons égaux. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. Lue à chaque ouverture. |

### AlertDialogHeader, AlertDialogFooter, AlertDialogMedia, AlertDialogTitle, AlertDialogDescription

Tous prennent `AlertDialogSectionProps` :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. Passez une valeur à `AlertDialogHeader` quand il contient le titre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la partie. |

`AlertDialogTitle` est un `<h2>` qui nomme le panneau, `AlertDialogDescription` un `<p>` qui le décrit. `AlertDialogMedia` est un bloc de 64 px qui se place à côté du titre et de la description dans un panneau de taille normale à partir du point de rupture `sm`, au-dessus sinon.

### AlertDialogAction, AlertDialogCancel

`AlertDialogButtonProps` — les boutons qui répondent, stylés par [buttonVariants](/fr/nebula/components/button#buttonvariants).

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte du bouton. |
| `variant` | `ButtonVariants['variant']` | `'default'` (action), `'outline'` (annulation) | Une variante de [Button](/fr/nebula/components/button). |
| `size` | `ButtonVariants['size']` | `'default'` | Une taille de Button. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

L'action appelle `onConfirm` puis ferme ; l'annulation appelle `onCancel` puis ferme, et c'est sur elle que se pose le focus à l'ouverture.

### AlertDialogOverlay

Le fond assombri, pour composer votre propre surface ; `AlertDialogContent` en rend déjà un. Prend `AlertDialogSectionProps` ; seule `class` sert.

### AlertDialogPortal

Monte ses enfants à la fin de `container`. `AlertDialogContent` n'en a pas besoin.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'il faut monter. |
| `container` | `() => Element \| null` | `document.body` | Où monter. |

## Accessibilité

Le panneau est `role="alertdialog"` avec `aria-modal="true"`, ce qui dit à un lecteur d'écran qu'il interrompt. Il est nommé par `AlertDialogTitle` (`aria-labelledby`) et décrit par `AlertDialogDescription` (`aria-describedby`) ; un titre manquant émet un avertissement. Tant qu'elle est ouverte, le reste de la page est `aria-hidden`, le focus est piégé à l'intérieur et le défilement de la page est bloqué. Le focus part sur `AlertDialogCancel` — ou sur le premier élément focalisable s'il n'y en a pas — et revient au déclencheur à la fermeture, ou à ce qui l'avait avant quand la boîte n'a pas de déclencheur. Le déclencheur porte `aria-haspopup="dialog"`, `aria-expanded` et `data-state`.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Sur le déclencheur, ouvre la boîte ; sur un bouton focalisé, le presse. |
| <kbd>Tab</kbd> | Élément focalisable suivant du panneau ; boucle du dernier au premier. |
| <kbd>Maj</kbd> + <kbd>Tab</kbd> | Le précédent ; boucle du premier au dernier. |
| <kbd>Échap</kbd> | Annule : appelle `onCancel` et ferme. |

Un clic hors du panneau ne la ferme jamais.
