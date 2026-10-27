# Slider

Pick a number from a range by dragging a thumb along a track: a volume, an opacity, a budget.

It is a native `<input type="range">`, restyled, with one thumb. For one thumb the native control already brings the keyboard, the right role and value announcements, and touch behaviour that a rebuilt slider would have to get right on its own. There is no two-thumb range slider; two sliders, or two number fields, cover a minimum and a maximum.

The price is the thumb, which can only be reached through two vendor pseudo-elements. Both are written out in full as literal classes — Tailwind finds classes by reading the file as text, so a variant assembled at runtime would generate no rule, and a browser drops a whole rule that names a pseudo-element it does not know, so the two cannot share one selector.

```sh
ream nebula:add slider
```

Atom · `atoms/Slider.ts` · no dependencies

## Usage

```ts
import { signal } from '@c9up/aurora'
import { Slider } from '@c9up/nebula'

const volume = signal(50)

Slider({ label: 'Volume', value: volume, onValueChange: (value) => volume(value) })
```

`value` is bound to the input's `value` property, so a signal and the thumb stay in step both ways: setting `volume(80)` elsewhere moves the thumb.

## Examples

### Range and step

```ts
const opacity = signal(1)

Slider({
  label: 'Opacity',
  min: 0,
  max: 1,
  step: 0.05,
  value: opacity,
  onValueChange: (value) => opacity(value),
})
```

`onValueChange` receives a `number`, not the input's string, and fires on every movement of the thumb, not only when it is let go.

### A visible label, a readout, and a form

```ts
import { html } from '@c9up/aurora'
import { Label } from '@c9up/nebula'

const budget = signal(500)

html`
  <div class="flex items-center justify-between">
    ${Label({ for: 'budget', children: 'Monthly budget' })}
    <span class="text-sm text-muted-foreground">${() => `CHF ${budget()}`}</span>
  </div>
  ${Slider({ id: 'budget', name: 'budget', min: 100, max: 2000, step: 50, value: budget, onValueChange: (value) => budget(value), disabled: locked })}
`
```

A [Label](/en/nebula/components/label) pointing at the slider's `id` names it, so `label` is not needed. With `name`, the slider posts with its form like any input.

## API

### Slider

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The input's `id`, for a `<label for>`. |
| `name` | `string` | — | The input's `name`, for a form post. |
| `value` | `Reactive<number>` | `0` | The thumb's position, bound to the `value` property. |
| `min` | `Reactive<number>` | `0` | The lowest value. |
| `max` | `Reactive<number>` | `100` | The highest value. |
| `step` | `Reactive<number>` | `1` | The increment the thumb snaps to. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`, for a slider no `<label>` names. |
| `class` | `Reactive<string>` | — | Merged last into the input's classes. |
| `onValueChange` | `(value: number, event: Event) => void` | — | Every movement of the thumb, with the value as a number. |

### sliderClasses

`sliderClasses: string` — the track and thumb classes, for a native `<input type="range">` you render yourself.

## Accessibility

A native range input: announced as a slider with its current value, its minimum and its maximum, focusable, removed from the tab order when `disabled`. It needs a name — `label`, or a `<label>` pointing at its `id`. The focus ring is drawn around the thumb on `:focus-visible`.

The keys are the browser's own:

| Key | Action |
|---|---|
| <kbd>ArrowRight</kbd> / <kbd>ArrowUp</kbd> | Increases by one `step`. |
| <kbd>ArrowLeft</kbd> / <kbd>ArrowDown</kbd> | Decreases by one `step`. |
| <kbd>PageUp</kbd> / <kbd>PageDown</kbd> | Increases / decreases by a larger amount, set by the browser. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Goes to `min` / `max`. |
