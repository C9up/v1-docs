# PieceMap

Un transfert dessiné comme le dessine un client torrent : un petit carré par morceau, coloré selon où en est ce morceau. Une barre de progression dit combien est arrivé ; la carte dit *lesquels*, si bien qu'un transfert bloqué, une couche manquante ou un pair qui n'en sert que la moitié se voit d'un coup d'œil.

```sh
ream nebula:add piece-map
```

Molécule · `molecules/PieceMap.ts` · aucune dépendance

## Utilisation

```ts
import { PieceMap } from '@c9up/nebula'

PieceMap<'have' | 'missing'>({
  groups: [[{ state: 'have' }, { state: 'have' }, { state: 'missing' }]],
  tones: { have: 'bg-primary', missing: 'border border-border' },
})
```

## Exemples

### Vos propres états, et une légende

Les états sont les vôtres, pas un ensemble figé : un téléchargement, une réplication et une sauvegarde n'ont pas les mêmes. Nommez-les par un type chaîne et donnez à chacun ses classes — `tones`. La légende lit les mêmes `tones`, si bien qu'un carré et sa clé ne peuvent pas diverger :

```ts
import { PieceMap, PieceMapLegend } from '@c9up/nebula'

type State = 'have' | 'peer' | 'coming' | 'missing'

const tones = {
  have: 'bg-primary',
  peer: 'bg-chart-2',
  coming: 'animate-pulse bg-chart-4',
  missing: 'border border-border',
} satisfies Record<State, string>

PieceMap<State>({
  groups: () => files().map((file) => file.pieces.map((state) => ({ state, title: file.name }))),
  tones,
  label: () => `${received()} morceaux sur ${total()}`,
})

PieceMapLegend<State>({
  tones,
  items: [
    { state: 'have', label: 'Ici' },
    { state: 'peer', label: "D'un pair" },
    { state: 'coming', label: 'En route' },
    { state: 'missing', label: 'Manquant' },
  ],
  children: '56 Mio',
})
```

Un état absent de `tones` est une erreur de type : `tones` est un `Record` sur les états donnés à la carte.

### Groupes

Les morceaux viennent par groupes — les fichiers d'un torrent, les couches d'une image — et chaque groupe après le premier est séparé par un filet. Une carte plate est un seul groupe : `groups: [pieces]`.

### Suivre un transfert

`groups` prend un accesseur. Les carrés sont redessinés dès que ce qu'il lit change : une carte alimentée par un signal interrogé à intervalles suit le transfert pendant qu'il avance.

## API

### PieceMap

`PieceMap<State extends string>(props)` — une fonction générique, pour que `tones` soit vérifié contre vos propres états.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `groups` | `Reactive<readonly (readonly Piece<State>[])[]>` | — | Les morceaux, groupe après groupe. |
| `tones` | `Readonly<Record<State, string>>` | — | Les classes qui peignent chaque état : un fond, une bordure, une pulsation. |
| `size` | `Reactive<'sm' \| 'default' \| 'lg'>` | `'default'` | Les carrés : 8, 10 ou 12 px. |
| `label` | `Reactive<string \| undefined>` | — | Ce que dit la carte dans son ensemble. En fait une seule image pour les technologies d'assistance. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

`Piece<State>` vaut `{ state: State; title?: string }` — `title` est l'infobulle du carré.

### PieceMapLegend

`PieceMapLegend<State extends string>(props)` — ce que veulent dire les couleurs des carrés.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `tones` | `Readonly<Record<State, string>>` | — | Les mêmes `tones` que la carte. |
| `items` | `readonly { state: State; label: Child }[]` | — | Les états à expliquer, dans l'ordre de lecture. |
| `children` | `Child` | — | Dit avant les clés — la taille du tout, par exemple. |
| `size` | `Reactive<'sm' \| 'default' \| 'lg'>` | `'default'` | La taille des pastilles. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la légende. |

### pieceVariants

`pieceVariants({ size?, class? }): string` — les classes d'un carré, pour en dessiner un hors d'une carte.

## Accessibilité

Avec un `label`, la carte est `role="img"` et le label est ce qu'elle dit : un lecteur d'écran qui parcourrait des centaines de carrés un à un n'apprendrait rien que la phrase ne dise. Chaque carré garde son `title` pour le pointeur. Sans `label`, la carte n'a pas de rôle : donnez-en un dès qu'elle est le seul endroit où la progression s'affiche.

La légende met un vrai espace entre ses clés : l'écart entre elles n'est que dessiné, et sans espace leurs libellés se colleraient pour un lecteur d'écran et au copier-coller.
