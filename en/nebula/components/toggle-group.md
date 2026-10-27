# ToggleGroup

A row of toggles acting as one control: text alignment, a set of filters, a view switcher.

`type` decides the behaviour and the semantics together, because they have to move together. `'single'` is a radio group — one value, `role="radio"` on each button, and picking one clears the rest. `'multiple'` is a set of independent toggle buttons, each with `aria-pressed`. Getting that pairing wrong is the usual bug with this control: a single-select group announcing each option as "pressed" tells a screen-reader user they can turn several on at once.

The items are drawn with [Toggle](/en/nebula/components/toggle)'s own `toggleVariants`, so a grouped toggle and a standalone one cannot drift apart. Only the corners are overridden, to weld the row into one shape.

```sh
ream nebula:add toggle-group
```

Molecule · `molecules/ToggleGroup.ts` · [toggle](/en/nebula/components/toggle)

## Usage

```ts
import { html, signal } from '@c9up/aurora'
import { ToggleGroup, ToggleGroupItem } from '@c9up/nebula'

const align = signal('left')

ToggleGroup({
  type: 'single',
  defaultValue: 'left',
  onValueChange: (value) => align(value[0] ?? 'left'),
  children: () => html`
    ${ToggleGroupItem({ value: 'left', children: 'Left' })}
    ${ToggleGroupItem({ value: 'center', children: 'Center' })}
    ${ToggleGroupItem({ value: 'right', children: 'Right' })}
  `,
})
```

The items go in `() =>`: they read the selection from the group's context — see [composition](/en/nebula/composition). `onValueChange` always receives an array, in both modes; in `'single'` mode it holds at most one value.

## Examples

### Several on at once

```ts
ToggleGroup({
  type: 'multiple',
  defaultValue: ['bold'],
  children: () => html`
    ${ToggleGroupItem({ value: 'bold', ariaLabel: 'Bold', children: 'B' })}
    ${ToggleGroupItem({ value: 'italic', ariaLabel: 'Italic', children: 'I' })}
    ${ToggleGroupItem({ value: 'underline', ariaLabel: 'Underline', children: 'U' })}
  `,
})
```

A single letter or an icon is not a name: `ariaLabel` gives the item one.

### From data, spaced apart

```ts
ToggleGroup({
  type: 'multiple',
  variant: 'outline',
  spacing: 'default',
  onValueChange: (value) => filterBy(value),
  children: () =>
    html`${() => statuses().map((status) => ToggleGroupItem({ value: status.id, children: status.name }))}`,
})
```

`statuses` is a signal, so the items are built in an accessor inside the thunk, which runs only once — see [composition](/en/nebula/composition). `spacing: '0'`, the default, joins the items into one bar with only the outer corners rounded; `'default'` leaves a gap between them, each rounded on its own.

### Outline, with an icon

```ts
import { CheckIcon } from '@c9up/nebula'

ToggleGroup({
  type: 'single',
  variant: 'outline',
  size: 'sm',
  children: () => html`
    ${ToggleGroupItem({ value: 'all', children: 'All' })}
    ${ToggleGroupItem({ value: 'done', children: html`${CheckIcon()} Done` })}
  `,
})
```

`variant` and `size` set on the group win over the same props on an item.

### Disabled

```ts
const saving = signal(false)

ToggleGroup({
  type: 'single',
  disabled: saving,
  children: () => html`
    ${ToggleGroupItem({ value: 'draft', children: 'Draft' })}
    ${ToggleGroupItem({ value: 'published', children: 'Published' })}
    ${ToggleGroupItem({ value: 'archived', disabled: true, children: 'Archived' })}
  `,
})
```

The group's `disabled` follows its accessor and disables every item; an item's own `disabled` disables just that one.

### Clearing the choice

In `'single'` mode, clicking the item that is on turns it off and leaves the group empty — `onValueChange` receives `[]`. That is the difference with a [RadioGroup](/en/nebula/components/radio-group), which always keeps one; handle the empty case, as the `?? 'left'` in the usage does.

## API

### ToggleGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `'single' \| 'multiple'` | `'single'` | One value or several — and the matching roles. Read once, at setup. |
| `defaultValue` | `string \| readonly string[]` | — | On at first render. Nothing is on without it. |
| `variant` | `Reactive<'default' \| 'outline'>` | — | The items' look, over their own. Read once, at setup, for the items. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg'>` | — | The items' size, over their own. Read once, at setup, for the items. |
| `spacing` | `'default' \| '0'` | `'0'` | `'0'` joins the items into one bar; `'default'` spaces them. |
| `disabled` | `Reactive<boolean>` | `false` | Disables every item. |
| `onValueChange` | `(value: readonly string[]) => void` | — | The values that are on, after each click. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |
| `children` | `Parts` | — | The `ToggleGroupItem`s, built in `() =>`. |

The selection lives in the group: there is no controlled `value`. `onValueChange` is how the app learns it.

### ToggleGroupItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | What the item contributes to the group's value. |
| `children` | `Slot` | — | The content: text, an icon, or both. |
| `ariaLabel` | `string` | — | Sets `aria-label`. Required when the content is an icon alone. |
| `disabled` | `boolean` | `false` | Disables this item. |
| `variant` | `'default' \| 'outline'` | `'default'` | Used when the group sets none. |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | Used when the group sets none. |
| `class` | `Reactive<string>` | — | Merged last into the item's classes. |

## Accessibility

`type: 'single'` renders `role="radiogroup"` with `role="radio"` and `aria-checked` on each item; `type: 'multiple'` renders `role="group"` with `aria-pressed` on each item and no role. `data-state="on"` or `"off"` is set on every item for styling, and the focused item is raised above its neighbours so its ring is not hidden under them.

The group takes no name of its own. Where its purpose is not plain from what surrounds it, put it in a `FieldSet` with a `FieldLegend` (see [Field](/en/nebula/components/field)): the `<fieldset>` is announced with its legend before the items.

Each item is a native `<button>` and its own tab stop; the group adds no arrow-key navigation.

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Moves to the next item, then out of the group. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Turns the focused item on or off (the native button's click). |
