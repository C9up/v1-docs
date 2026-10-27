# InputOTP

A one-time code typed one character per box. What users expect of this control is all in the edge cases, and each is a rule of its own: typing moves to the next box, and the last one stays put rather than wrapping round; <kbd>Backspace</kbd> in an empty box clears the previous one and moves back, which is what makes holding it down erase the whole code; pasting fills every box from the one pasted into, so copying the code out of an email and pasting it in the first box just works.

Each box is a real `<input>`, not one field with drawn cells: that is what gives each its own caret, and the first one `autocomplete="one-time-code"`, the hint that makes the phone offer the code from the SMS — without it, the user leaves the app to read it. All the boxes are `inputmode="numeric"` for the number pad. The joined code is mirrored into one hidden input, so the control posts as a single field rather than six.

```sh
ream nebula:add input-otp
```

Molecule · `molecules/InputOTP.ts` · no dependencies

## Usage

```ts
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@c9up/nebula'

InputOTP({
  length: 6,
  name: 'code',
  onComplete: (code) => verify(code),
  children: () => InputOTPGroup({ children: Array.from({ length: 6 }, () => InputOTPSlot({})) }),
})
```

`InputOTP` takes its children as `() =>`: each slot claims its position from the field's context as it is built — see [composition](/en/nebula/composition). The slots take no index, so they cannot be numbered wrongly; `length` must match how many are built.

## Examples

### Two groups

```ts
import { html } from '@c9up/aurora'
import { InputOTPSeparator } from '@c9up/nebula'

InputOTP({
  length: 6,
  name: 'code',
  children: () => html`
    ${InputOTPGroup({ children: html`${InputOTPSlot({})}${InputOTPSlot({})}${InputOTPSlot({})}` })}
    ${InputOTPSeparator({})}
    ${InputOTPGroup({ children: html`${InputOTPSlot({})}${InputOTPSlot({})}${InputOTPSlot({})}` })}
  `,
})
```

A group is a run of boxes with no gap between them; the separator draws a dash between two runs. The positions carry on across groups: the fourth slot built is the fourth character.

### Verifying with a button

`onValueChange` gives the joined code after every change, partial or not. A signal can take it directly:

```ts
import { signal } from '@c9up/aurora'
import { Button } from '@c9up/nebula'

const code = signal('')
const checking = signal(false)

InputOTP({
  length: 4,
  disabled: checking,
  onValueChange: code,
  children: () => InputOTPGroup({ children: Array.from({ length: 4 }, () => InputOTPSlot({})) }),
})

Button({
  disabled: () => code().length < 4 || checking(),
  children: 'Verify',
  onClick: async () => {
    checking(true)
    try { await verify(code()) } finally { checking(false) }
  },
})
```

`onComplete` fires each time a change leaves every box filled — again if the user corrects a character after the code was complete.

### In a form

With `name`, the hidden input posts the joined code under that name. The boxes themselves have no `name`, so a classic form post receives `code=482913` and nothing else.

### Labels in another language

Each box is named from its position — "Character 2 of 6" by default. `slotLabel` replaces it:

```ts
InputOTP({
  length: 6,
  slotLabel: (position, length) => `Chiffre ${position} sur ${length}`,
  children: () => InputOTPGroup({ children: Array.from({ length: 6 }, () => InputOTPSlot({})) }),
})
```

## API

### InputOTP

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `6` | The number of boxes. Must match the slots built. |
| `slotLabel` | `(position: number, length: number) => string` | `` `Character ${position} of ${length}` `` | Each box's accessible name, from its 1-based position. |
| `name` | `string` | — | The hidden input's `name`: the code posts as one field. |
| `disabled` | `Reactive<boolean>` | `false` | Disables every box. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |
| `onValueChange` | `(value: string) => void` | — | The joined code after every change. |
| `onComplete` | `(value: string) => void` | — | Fired when a change leaves every box filled. |
| `children` | `Parts` | — | The groups, slots and separators, built in `() =>`. |

The characters live in the field: there is no controlled `value`.

### InputOTPGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The `InputOTPSlot`s of the run. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### InputOTPSlot

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the box's classes. |

One box. It claims the next position as it is built.

### InputOTPSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the separator's classes. |

## Accessibility

Each box is a text `<input>` named by `slotLabel` — "Character 1 of 6", "Character 2 of 6" — so a screen reader says where in the code the user is. Only the first box offers `one-time-code` autofill; the others are `autocomplete="off"`. The separator is `aria-hidden`: the dash is decoration, the boxes carry the labels. The labels are built-in English; replace them with `slotLabel` — see [languages](/en/nebula/languages).

| Key | Action |
|---|---|
| A character | Fills the box and moves to the next one — except in the last. A box reached by typing, by <kbd>Backspace</kbd> or with the arrows has its character selected, so typing replaces it. |
| <kbd>Backspace</kbd> | Clears the box; in an empty box, clears the previous one and moves to it. |
| <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Previous / next box, stopping at the ends. |
| Paste | Fills the boxes from this one onwards, and moves to the box after the last character pasted — or the last box. |

The boxes accept any character: `inputmode="numeric"` asks for the number pad, it does not filter. A pasted `482 913` fills a box with the space.
