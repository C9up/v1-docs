# PieceMap

A transfer drawn the way a torrent client draws it: one small square per piece, coloured by where that piece stands. A progress bar says how much has arrived; the map says *which* pieces, so a stalled run, a missing layer or a peer serving only half shows at a glance.

```sh
ream nebula:add piece-map
```

Molecule · `molecules/PieceMap.ts` · no dependencies

## Usage

```ts
import { PieceMap } from '@c9up/nebula'

PieceMap<'have' | 'missing'>({
  groups: [[{ state: 'have' }, { state: 'have' }, { state: 'missing' }]],
  tones: { have: 'bg-primary', missing: 'border border-border' },
})
```

## Examples

### Your own states, and a legend

The states are yours, not a fixed set: a download, a replication and a backup do not have the same ones. Name them as a string type and give each one its classes — `tones`. The legend reads the same `tones`, so a square and its key cannot drift apart:

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
  label: () => `${received()} of ${total()} pieces`,
})

PieceMapLegend<State>({
  tones,
  items: [
    { state: 'have', label: 'Here' },
    { state: 'peer', label: 'From a peer' },
    { state: 'coming', label: 'Coming' },
    { state: 'missing', label: 'Missing' },
  ],
  children: '56 MiB',
})
```

A state missing from `tones` is a type error: `tones` is a `Record` over the states the map was given.

### Groups

Pieces come in groups — a torrent's files, an image's layers — and each group after the first is set off by a rule. A flat map is one group: `groups: [pieces]`.

### Following a transfer

`groups` takes an accessor. The squares are drawn again whenever what it reads changes, so a map fed from a polled signal follows the transfer as it runs.

## API

### PieceMap

`PieceMap<State extends string>(props)` — a generic function, so `tones` is checked against your own states.

| Prop | Type | Default | Description |
|---|---|---|---|
| `groups` | `Reactive<readonly (readonly Piece<State>[])[]>` | — | The pieces, group after group. |
| `tones` | `Readonly<Record<State, string>>` | — | The classes that paint each state: a background, a border, a pulse. |
| `size` | `Reactive<'sm' \| 'default' \| 'lg'>` | `'default'` | The squares: 8, 10 or 12 px. |
| `label` | `Reactive<string \| undefined>` | — | What the map says as a whole. Makes it one image to assistive technology. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

`Piece<State>` is `{ state: State; title?: string }` — `title` is the square's tooltip.

### PieceMapLegend

`PieceMapLegend<State extends string>(props)` — what the squares' colours mean.

| Prop | Type | Default | Description |
|---|---|---|---|
| `tones` | `Readonly<Record<State, string>>` | — | The same `tones` as the map's. |
| `items` | `readonly { state: State; label: Child }[]` | — | The states to explain, in the order they are read. |
| `children` | `Child` | — | Said before the keys — the size of the whole, say. |
| `size` | `Reactive<'sm' \| 'default' \| 'lg'>` | `'default'` | The swatches' size. |
| `class` | `Reactive<string>` | — | Merged into the legend's classes. |

### pieceVariants

`pieceVariants({ size?, class? }): string` — a square's classes, for drawing one outside a map.

## Accessibility

With a `label`, the map is `role="img"` and the label is what it says: a screen reader walking hundreds of squares one by one learns nothing the sentence does not. Each square keeps its `title` for the pointer. Without a `label` the map has no role, so give it one whenever the map is the only place the progress is shown.

The legend puts a real space between its keys: the gap between them is only drawn, and without one their labels would run together for a screen reader and a copy.
