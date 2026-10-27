# Resizable

Deux volets et un séparateur entre eux, qu'on tire au pointeur ou qu'on déplace au clavier. Le partage est un seul nombre — la part du premier volet, en pourcentage — qui pilote les deux volets par `flex-basis` : avec une seule source de vérité, les deux volets ne peuvent jamais être en désaccord sur leur taille. La poignée capture le pointeur pendant qu'elle glisse, si bien qu'un geste rapide qui sort du séparateur, large de quelques pixels, continue au lieu de lâcher.

Deux volets, pas un nombre quelconque : une différence voulue avec shadcn, dont les groupes redimensionnables répartissent des tailles entre autant de panneaux qu'on veut, les mémorisent et replient un panneau à zéro. Un troisième `ResizablePanel` dans un groupe n'a pas de part à lui ; imbriquez un groupe dans un volet pour en avoir trois. Rien n'est mémorisé non plus — `onResize` signale chaque nouveau partage, et vous le rangez où vous voulez.

Le groupe remplit son conteneur (`h-full w-full`) : donnez une taille au conteneur — ou à la `class` du groupe.

```sh
ream nebula:add resizable
```

Molécule · `molecules/Resizable.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@c9up/nebula'

ResizablePanelGroup({
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: 'Navigation' })}
    ${ResizableHandle({ withHandle: true })}
    ${ResizablePanel({ children: 'Contenu' })}
  `,
})
```

`children` est de type `Parts` : les volets et la poignée s'inscrivent auprès du groupe, ils sont donc construits dans `() =>` — voir [composition](/fr/nebula/composition).

## Exemples

### Vertical

```ts
ResizablePanelGroup({
  direction: 'vertical',
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: 'Requête' })}
    ${ResizableHandle({})}
    ${ResizablePanel({ children: 'Résultats' })}
  `,
})
```

Les flèches suivent l'axe : gauche et droite sur un groupe horizontal, haut et bas sur un groupe vertical.

### Taille de départ et bornes

`defaultSize` est la part du premier volet au premier rendu ; `minSize` et `maxSize` la bornent, au pointeur comme au clavier. Un `defaultSize` hors des bornes y est ramené.

```ts
ResizablePanelGroup({
  defaultSize: 25,
  minSize: 15,
  maxSize: 40,
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: fileTree })}
    ${ResizableHandle({})}
    ${ResizablePanel({ children: editor })}
  `,
})
```

### Mémoriser le partage

`onResize` reçoit chaque nouveau pourcentage — à chaque mouvement du pointeur pendant un glissement et à chaque flèche, <kbd>Début</kbd> ou <kbd>Fin</kbd>. Un cookie le garde d'une page à l'autre et, une fois son nom dans la liste `cookies` que le `renderPage` d'Aurora a le droit de lire, permet au serveur de rendre le même partage que le navigateur :

```ts
import { cookieState, jsonCookie } from '@c9up/aurora'

const split = cookieState('editor-split', 30, jsonCookie(30))

ResizablePanelGroup({
  defaultSize: split(),
  onResize: split,
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: fileTree })}
    ${ResizableHandle({})}
    ${ResizablePanel({ children: editor })}
  `,
})
```

`defaultSize` n'est lu qu'une fois, à la construction : `split()` y est donc lu exprès, et le groupe tient la taille ensuite.

### Trois volets

Un groupe imbriqué dans le second volet le partage à nouveau. Chaque poignée déplace le partage du groupe auquel elle appartient :

```ts
ResizablePanelGroup({
  class: 'h-[32rem] rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: fileTree })}
    ${ResizableHandle({})}
    ${ResizablePanel({
      children: ResizablePanelGroup({
        direction: 'vertical',
        defaultSize: 70,
        children: () => html`
          ${ResizablePanel({ children: editor })}
          ${ResizableHandle({})}
          ${ResizablePanel({ children: terminal })}
        `,
      }),
    })}
  `,
})
```

## API

### ResizablePanelGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Deux `ResizablePanel` séparés par un `ResizableHandle`, construits dans `() =>`. |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Côte à côte, ou l'un au-dessus de l'autre. Lue une fois. |
| `defaultSize` | `number` | `50` | La part du premier volet au premier rendu, en pourcentage. Lue une fois. |
| `minSize` | `number` | `10` | La plus petite part que peut recevoir le premier volet. |
| `maxSize` | `number` | `90` | La plus grande part que peut recevoir le premier volet. |
| `onResize` | `(percent: number) => void` | — | Appelée avec chaque nouvelle part, déjà bornée. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### ResizablePanel

Le premier volet d'un groupe prend la part ; le second prend le reste.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du volet. Il est coupé (`overflow-hidden`) : placez une [ScrollArea](/fr/nebula/components/scroll-area) dedans pour un contenu qui défile. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### ResizableHandle

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `withHandle` | `boolean` | `false` | Dessine une prise sur le séparateur. |
| `label` | `string` | `'Resize panes'` | Le nom accessible du séparateur. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

## Accessibilité

Le séparateur est `role="separator"` et prend le focus (`tabindex="0"`), avec `aria-valuenow` — la part du premier volet, arrondie — entre `aria-valuemin` et `aria-valuemax`. Son `aria-orientation` est celle du trait lui-même : `vertical` dans un groupe horizontal, où la ligne se tient debout. L'anneau de focus est dessiné sur `:focus-visible`. Un séparateur qui ne répondrait qu'au pointeur ne laisserait à un utilisateur du clavier aucun moyen de redimensionner.

| Touche | Action |
|---|---|
| <kbd>←</kbd> / <kbd>→</kbd> | Dans un groupe horizontal, déplace le séparateur de 5 points vers la gauche ou la droite. |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Dans un groupe vertical, déplace le séparateur de 5 points vers le haut ou le bas. |
| <kbd>Début</kbd> | Réduit le premier volet à `minSize`. |
| <kbd>Fin</kbd> | Agrandit le premier volet jusqu'à `maxSize`. |

Le nom du séparateur est en anglais par défaut ; `label` le remplace — voir [langues](/fr/nebula/languages).
