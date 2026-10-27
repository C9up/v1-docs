# Collapsible

Un déclencheur qui montre et cache un panneau : « afficher plus », un bloc de réglages avancés, une liste qui se replie. Un [Accordion](/fr/nebula/components/accordion), c'est plusieurs de ceux-ci qui se connaissent ; un collapsible, c'en est un, tout seul.

Le panneau s'anime par une grille CSS dont l'unique rangée passe de `0fr` à `1fr` : l'ouverture et la fermeture s'animent sans hauteur mesurée, sans observateur de redimensionnement, et sans hauteur périmée quand le contenu change pendant qu'il est fermé. Il faut pour cela que le panneau fermé reste dans le DOM, et il est donc rendu `inert` : sinon il garderait ses arrêts de tabulation et sa place dans l'arbre d'accessibilité, et un utilisateur au clavier tabulerait dans un contenu absent de l'écran.

Le déclencheur est volontairement nu — une rangée flex sans bordure, sans remplissage ni anneau de focus — parce que son allure dépend entièrement de l'endroit où il se trouve. Stylez-le avec `class`.

```sh
ream nebula:add collapsible
```

Molécule · `molecules/Collapsible.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@c9up/nebula'

Collapsible({
  children: () => html`
    ${CollapsibleTrigger({ children: "Afficher l'adresse de livraison" })}
    ${CollapsibleContent({ children: '12 Rue du Lac, 1003 Lausanne' })}
  `,
})
```

Les pièces vont dans `() =>` : elles lisent l'état ouvert dans le contexte de `Collapsible` — voir [composition](/fr/nebula/composition).

## Exemples

### Ouvert au premier rendu

```ts
Collapsible({
  defaultOpen: true,
  children: () => html`
    ${CollapsibleTrigger({ children: 'Détail de la commande' })}
    ${CollapsibleContent({ children: 'Trois articles, expédiés ensemble.' })}
  `,
})
```

### Contrôlé

Passez `open` et c'est l'application qui détient l'état ; le déclencheur demande un changement par `onOpenChange`. Un signal fait les deux, si bien que le panneau peut s'ouvrir depuis n'importe où ailleurs dans la page :

```ts
import { signal } from '@c9up/aurora'
import { Button } from '@c9up/nebula'

const open = signal(false)

Collapsible({
  open,
  onOpenChange: open,
  children: () => html`
    ${CollapsibleTrigger({ children: 'Réglages avancés' })}
    ${CollapsibleContent({ children: 'Proxy, délais, nouvelles tentatives.' })}
  `,
})

Button({ variant: 'link', children: 'Afficher les réglages avancés', onClick: () => open(true) })
```

`open` l'emporte à chaque lecture tant qu'il vaut autre chose qu'`undefined` : une valeur qui n'arrive qu'après un chargement prend quand même la main. `onOpenChange` est appelé dans tous les cas, contrôlé ou non.

### Un déclencheur stylé

Le déclencheur accepte n'importe quelles classes ; `buttonVariants` lui donne l'allure d'un bouton et son anneau de focus :

```ts
import { ChevronsUpDownIcon, buttonVariants } from '@c9up/nebula'

Collapsible({
  class: 'gap-2',
  children: () => html`
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">3 dépôts favoris</h4>
      ${CollapsibleTrigger({
        class: buttonVariants({ variant: 'ghost', size: 'icon', class: 'size-8' }),
        children: html`${ChevronsUpDownIcon()}<span class="sr-only">Déplier</span>`,
      })}
    </div>
    ${CollapsibleContent({ class: 'flex flex-col gap-2', children: html`
      <div class="rounded-md border px-4 py-2 text-sm">c9up/aurora</div>
      <div class="rounded-md border px-4 py-2 text-sm">c9up/nebula</div>
    ` })}
  `,
})
```

`class` sur `CollapsibleContent` atterrit sur la boîte qui tient le contenu, à l'intérieur de la grille animée : une mise en page comme `flex flex-col gap-2` s'applique aux enfants eux-mêmes.

### Désactivé

```ts
Collapsible({
  disabled: () => !user.canSeeBilling(),
  children: () => html`
    ${CollapsibleTrigger({ children: 'Historique de facturation' })}
    ${CollapsibleContent({ children: 'Douze factures.' })}
  `,
})
```

Un collapsible désactivé garde l'état où il se trouve : le déclencheur est désactivé et un clic ne change rien.

## API

### Collapsible

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Quand il vaut un booléen, il l'emporte sur l'état interne. |
| `defaultOpen` | `boolean` | `false` | État de départ quand il n'est pas contrôlé. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive le déclencheur et refuse toute bascule. |
| `onOpenChange` | `(open: boolean) => void` | — | Appelé à chaque bascule, contrôlé ou non. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine (`flex flex-col`). |
| `children` | `Parts` | — | Le déclencheur et le contenu, construits en `() =>`. |

### CollapsibleTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du déclencheur. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du bouton. |

### CollapsibleContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du panneau. |
| `class` | `Reactive<string>` | — | Fusionnée dans la boîte intérieure (`overflow-hidden`), pas dans la grille animée. |

## Accessibilité

Le déclencheur est un `<button>` natif avec `aria-expanded` et `aria-controls` qui pointe vers le panneau ; le panneau est `role="region"`, avec `aria-labelledby` qui pointe en retour vers le déclencheur. Un panneau fermé est `inert` : hors de l'ordre de tabulation et de l'arbre d'accessibilité. La transition est supprimée sous `prefers-reduced-motion`. `data-state="open"` ou `"closed"` est posé sur la racine, le déclencheur et le panneau.

Le déclencheur ne dessine aucun anneau de focus à lui, et son `outline-none` retire aussi le contour du navigateur : laissé sans style, il ne montre aucun focus. Donnez-lui un anneau par `class`, comme le fait `buttonVariants` dans l'exemple plus haut.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Ouvre ou ferme le panneau (le clic du bouton natif). |
