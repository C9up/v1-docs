# Combobox

A select you can type into. A trigger drawn like a [Select](/en/nebula/components/select)'s opens a panel that holds a [Command](/en/nebula/components/command): the filtering, the highlight and the keys are the palette's and are not written twice. What it adds is selection — it remembers what was picked, shows it on the trigger and posts it with the form, where a Command runs an action and forgets.

It takes its options as data, not as parts. The palette inside is built afresh each time the panel opens, so `options` is read at that moment rather than captured once.

Focus moves into the panel's search field on open — that is the point of the control — and returns to the trigger on close, so the tab order does not jump to the top of the page after choosing.

```sh
ream nebula:add combobox
```

Organism · `organisms/Combobox.ts` · [command](/en/nebula/components/command), [select](/en/nebula/components/select)

## Usage

```ts
import { Combobox } from '@c9up/nebula'

Combobox({
  options: [
    { value: 'next', label: 'Next.js' },
    { value: 'svelte', label: 'SvelteKit' },
    { value: 'astro', label: 'Astro' },
  ],
  placeholder: 'Select a framework…',
  onValueChange: (value) => save(value),
})
```

## Examples

### Following a signal

Pass `value` to hold the choice yourself. The trigger shows whatever `value` reads, and `onValueChange` reports each pick:

```ts
import { signal } from '@c9up/aurora'
import { Combobox } from '@c9up/nebula'

const timezone = signal<string | undefined>('Europe/Zurich')

Combobox({
  options: zones.map((zone) => ({ value: zone, label: zone.replace('_', ' ') })),
  value: timezone,
  onValueChange: timezone,
})
```

Without `value`, the combobox holds its own choice, starting from `defaultValue`.

### Groups and keywords

Consecutive options sharing a `group` are gathered under one heading, in the order given. A group that comes back after an interruption gets a second heading: merging them would reorder your list and change which option the arrows reach next. `keywords` adds terms the label does not contain:

```ts
Combobox({
  options: [
    { value: 'eur', label: 'Euro', group: 'Europe', keywords: ['€'] },
    { value: 'chf', label: 'Swiss franc', group: 'Europe', keywords: ['CHF'] },
    { value: 'usd', label: 'US dollar', group: 'Americas', keywords: ['$'] },
    { value: 'cad', label: 'Canadian dollar', group: 'Americas', keywords: ['CAD'] },
  ],
  placeholder: 'Currency',
})
```

### In a form

With a `name`, a hidden input posts the chosen `value`. `invalid` draws the trigger in the destructive colour:

```ts
Combobox({
  name: 'country',
  options: countries,
  invalid: () => errors().country !== undefined,
  disabled: submitting,
})
```

### In another language

Every text the combobox writes has a prop:

```ts
Combobox({
  options: fruits,
  placeholder: 'Choose a fruit…',
  searchPlaceholder: 'Search fruits…',
  emptyMessage: 'No fruit by that name.',
})
```

## API

### Combobox

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `readonly ComboboxOption[]` | — | Required. Read each time the panel opens. |
| `value` | `Reactive<string \| undefined>` | — | Controls the choice. Present means the trigger follows it. |
| `defaultValue` | `string` | — | The starting choice when `value` is absent. |
| `onValueChange` | `(value: string) => void` | — | Each pick. |
| `name` | `string` | — | Posts the chosen `value` with the form through a hidden input. |
| `placeholder` | `string` | `'Select…'` | The trigger's text while nothing is chosen. |
| `searchPlaceholder` | `string` | `'Search…'` | The search field's placeholder. |
| `emptyMessage` | `string` | `'No results found.'` | Shown when the query matches nothing. |
| `disabled` | `Reactive<boolean>` | `false` | Disables the trigger. |
| `invalid` | `Reactive<boolean>` | — | Sets `aria-invalid` on the trigger. |
| `class` | `Reactive<string>` | — | Merged into the wrapper's classes. |
| `contentClass` | `Reactive<string>` | — | Merged into the panel's classes. |

### ComboboxOption

| Field | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. What is chosen and posted. |
| `label` | `string` | — | Required. Shown in the list and on the trigger; the filter matches it. |
| `keywords` | `readonly string[]` | — | Extra terms that match the option. |
| `disabled` | `boolean` | — | Leaves the option out of the matches: it is hidden and cannot be picked. |
| `group` | `string` | — | The heading it is listed under. |

## Accessibility

The trigger is a `<button>` with `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` while the panel is open, and `aria-invalid` when `invalid`. Inside the panel, the search field and the list are [Command's](/en/nebula/components/command#accessibility): a `combobox` field pointing at the highlighted `option` through `aria-activedescendant`.

On open, focus moves to the search field and is held inside the panel. Choosing an option closes the panel and puts focus back on the trigger, and so does Escape. A click outside closes it too.

| Key | Action |
|---|---|
| <kbd>Enter</kbd>, <kbd>Space</kbd> | On the trigger: open or close the panel. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | In the field: highlight the next or previous match, wrapping. |
| <kbd>Enter</kbd> | In the field: choose the highlighted option. |
| <kbd>Escape</kbd> | Close the panel. |

Its three texts are English by default; `placeholder`, `searchPlaceholder` and `emptyMessage` replace them — see [languages](/en/nebula/languages).
