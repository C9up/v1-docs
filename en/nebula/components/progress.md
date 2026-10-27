# Progress

A determinate progress bar: how much of a known whole is done. The fill is a full-width bar slid left by what remains, not a growing width — a transform is composited off the main thread, where animating `width` lays the bar out again on every frame, and that shows on a long upload.

A `value` of `null` means the amount is unknown. The bar then drops `aria-valuenow`, which is how ARIA says "progress unknown"; reporting `0` instead would tell the user the work has not started.

```sh
ream nebula:add progress
```

Atom · `atoms/Progress.ts` · no dependencies

## Usage

```ts
import { Progress } from '@c9up/nebula'

Progress({ value: 40, label: 'Profile completion' })
```

## Examples

### Following an upload

`value` and `max` take accessors, and a signal is one. The bar follows it as it moves:

```ts
import { signal } from '@c9up/aurora'
import { Progress } from '@c9up/nebula'

const sent = signal(0)

Progress({ value: sent, max: file.size, label: `Uploading ${file.name}` })

request.upload.addEventListener('progress', (event) => sent(event.loaded))
```

`value` is clamped between `0` and `max`, so a last progress event that overshoots does not push the fill off the track. A `max` of zero or less falls back to `100`.

### Steps

```ts
Progress({ value: () => step(), max: 4, label: () => `Step ${step()} of 4` })
```

### Unknown progress

```ts
Progress({ value: null, label: 'Preparing the export' })
```

The bar stays empty and draws no motion of its own; for an activity with no measurable end, a [Spinner](/en/nebula/components/spinner) says more.

### Height and colour

```ts
Progress({ value: 72, class: 'h-1' })
```

`class` is merged into the track's classes, so a conflicting height wins. The fill is `bg-primary` and the track the same colour at 20 %.

## API

### Progress

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `Reactive<number \| null>` | `0` | `0` to `max`, clamped. `null` for unknown progress. |
| `max` | `Reactive<number>` | `100` | The whole. Zero or less is read as `100`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`. |
| `class` | `Reactive<string>` | — | Merged into the track's classes. |

## Accessibility

`role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax` set to `max` and `aria-valuenow` to the clamped `value` — left out when `value` is `null`. A progress bar needs a name to be announced as something more than "progress bar": give it a `label`. The component takes no other attribute, so `label` is the only way to name it. It is not focusable and handles no key.
