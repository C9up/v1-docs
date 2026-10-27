# Toggle

A button that stays pressed: bold, mute, a filter switched on. It is announced as a toggle button with `aria-pressed`, not as a checkbox, because its effect applies at once — it is not a value collected for a form. A screen reader says "toggle button, pressed", which is what the user needs to hear.

A toggle holds no state of its own. `pressed` says how it is drawn and `onPressedChange` asks for the opposite; nothing changes until the app writes the new value back. A signal does both, which is the usual way to wire one.

```sh
ream nebula:add toggle
```

Atom · `atoms/Toggle.ts` · no dependencies

## Usage

```ts
import { signal } from '@c9up/aurora'
import { Toggle } from '@c9up/nebula'

const bold = signal(false)

Toggle({ pressed: bold, onPressedChange: bold, label: 'Bold', children: 'B' })
```

Without `pressed` the toggle never shows as pressed, whatever is clicked: it draws what it is given.

## Examples

### Variants and sizes

```ts
const italic = signal(false)

Toggle({ variant: 'outline', pressed: italic, onPressedChange: italic, label: 'Italic', children: 'I' })
Toggle({ size: 'sm', pressed: italic, onPressedChange: italic, label: 'Italic', children: 'I' })
Toggle({ size: 'lg', pressed: italic, onPressedChange: italic, label: 'Italic', children: 'I' })
```

`default` is transparent until pressed; `outline` adds a border. Pressed, both take the accent colour.

### With an icon and text

An SVG inside is sized to 16 px unless it carries its own `size-*` class. With visible text, no `label` is needed:

```ts
import { html } from '@c9up/aurora'
import { CheckIcon } from '@c9up/nebula'

const done = signal(false)

Toggle({
  variant: 'outline',
  pressed: done,
  onPressedChange: done,
  children: html`${CheckIcon()} Done`,
})
```

### Doing something on change

`onPressedChange` is where the effect goes. Write the value back, then act on it — and let the label and content follow the same signal:

```ts
const muted = signal(false)

Toggle({
  pressed: muted,
  label: () => (muted() ? 'Unmute' : 'Mute'),
  children: () => (muted() ? 'Muted' : 'Sound on'),
  onPressedChange: (on) => {
    muted(on)
    savePreference('muted', on)
  },
})
```

Several toggles that act as one control belong in a [ToggleGroup](/en/nebula/components/toggle-group).

## API

### Toggle

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content: text, an icon, or both. |
| `pressed` | `Reactive<boolean>` | `false` | Whether it is drawn and announced as pressed. |
| `variant` | `Reactive<'default' \| 'outline'>` | `'default'` | The look. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg'>` | `'default'` | 36, 32 or 40 px high. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`. Required in practice when the content is an icon or a single letter. |
| `value` | `string` | — | Written to `data-value`, for host CSS or tests to find the toggle by. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |
| `onPressedChange` | `(pressed: boolean) => void` | — | Called on click with the opposite of the current `pressed`. |

### toggleVariants

`toggleVariants({ variant?, size?, class? }): string` — a toggle's classes. [ToggleGroup](/en/nebula/components/toggle-group) builds its items from them, so a grouped toggle and a standalone one cannot drift apart. The pressed colours key off `aria-pressed`, so an element given these classes needs that attribute too.

## Accessibility

A native `<button type="button">` with `aria-pressed="true"` or `"false"`: focusable, announced as a toggle button and its state, removed from the tab order when `disabled`. The focus ring is drawn on `:focus-visible`.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Calls `onPressedChange` (the native button's click). |
