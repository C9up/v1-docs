# Command

The palette: type to filter, arrows to move, Enter to run. It is a list you place anywhere — in a page, a popover, a sidebar. [CommandDialog](/en/nebula/components/command-dialog) puts it in a modal opened by a shortcut, and [Combobox](/en/nebula/components/combobox) builds on it to pick a value.

Filtering happens without re-rendering. Each item registers itself as it is built, then hides itself when the query stops matching it: rebuilding the list on every keystroke would lose the DOM the highlight and the scroll position live in. A group hides itself the same way once none of its own items are showing, so an empty heading never sits over nothing.

The arrows never take focus out of the search field. The list is a `listbox` whose options are pointed at rather than focused, which lets a screen reader read each result as the arrows pass over it while typing keeps working.

```sh
ream nebula:add command
```

Organism · `organisms/Command.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

Command({
  class: 'rounded-lg border shadow-md',
  children: () => html`
    ${CommandInput({ placeholder: 'Search…' })}
    ${CommandList({ children: () => html`
      ${CommandEmpty({ children: 'No results found.' })}
      ${CommandItem({ value: 'new', children: 'New file', onSelect: () => createFile() })}
      ${CommandItem({ value: 'open', children: 'Open folder', onSelect: () => openFolder() })}
    ` })}
  `,
})
```

`Command`, `CommandList` and `CommandGroup` take their parts in a thunk — see [composition](/en/nebula/composition).

## Examples

### Groups, separators, shortcuts

```ts
import { html } from '@c9up/aurora'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator, CommandShortcut,
} from '@c9up/nebula'

Command({
  children: () => html`
    ${CommandInput({})}
    ${CommandList({ children: () => html`
      ${CommandEmpty({ children: 'No results found.' })}
      ${CommandGroup({ heading: 'Files', children: () => html`
        ${CommandItem({ value: 'new', textValue: 'New file', children: html`New file${CommandShortcut({ children: '⌘N' })}` })}
        ${CommandItem({ value: 'save', textValue: 'Save', children: html`Save${CommandShortcut({ children: '⌘S' })}` })}
      ` })}
      ${CommandSeparator({})}
      ${CommandGroup({ heading: 'Help', children: () => CommandItem({ value: 'docs', children: 'Documentation' }) })}
    ` })}
  `,
})
```

`CommandShortcut` only displays the keys: bind the real shortcut yourself.

### What the filter matches

An item matches when its text contains the query, ignoring case. The text is `children` when it is a string; when `children` is markup — a shortcut beside the label, an icon — give `textValue`, or the item is matched on its `value`. `keywords` adds terms the label does not contain:

```ts
CommandItem({ value: 'open', children: 'Open folder', keywords: ['directory'] })
```

Typing `directory` finds *Open folder*. Predictable beats clever: a term you list is found, a fuzzy score nobody can anticipate is not used.

### Your own filter

`filter` replaces the built-in one. It receives the item's `value`, `textValue` and `keywords` and the query, and says whether the item stays. `defaultFilter` is exported, so a filter of your own can prepare its input and hand over — here, one that ignores accents, so `cafe` finds *Café*:

```ts
import { html } from '@c9up/aurora'
import { Command, defaultFilter } from '@c9up/nebula'

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '')

Command({
  filter: (candidate, query) =>
    defaultFilter({ ...candidate, textValue: fold(candidate.textValue), keywords: candidate.keywords.map(fold) }, fold(query)),
  children: () => html`…`,
})
```

### One handler for every item

Each item runs its own `onSelect`; the palette's `onSelect` then receives the item's `value`. Use the second when the items are data:

```ts
import { html } from '@c9up/aurora'
import { Command, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

const pages = [
  { value: '/settings', label: 'Settings' },
  { value: '/billing', label: 'Billing' },
]

Command({
  onSelect: (value) => navigate(value),
  children: () => html`
    ${CommandInput({ placeholder: 'Go to…' })}
    ${CommandList({ children: () => pages.map((page) => CommandItem({ value: page.value, children: page.label })) })}
  `,
})
```

`value` identifies the item: keep it unique within a palette.

### A list that changes

Items register as they are built and stay registered for the life of the palette. Build the palette when its list is known — [CommandDialog](/en/nebula/components/command-dialog) and [Combobox](/en/nebula/components/combobox) build theirs afresh each time they open — rather than feeding a fixed palette a list that changes.

## API

### Command

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The input and the list. |
| `filter` | `(candidate: CommandCandidate, query: string) => boolean` | `defaultFilter` | Says whether an item survives the query. |
| `onSelect` | `(value: string) => void` | — | Called with the `value` of any item run, after the item's own `onSelect`. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

### CommandInput

A search icon and the field.

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Type a command or search…'` | The field's placeholder. |
| `class` | `Reactive<string>` | — | Merged into the `<input>`'s classes. |

### CommandList

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | `CommandEmpty`, groups, items, separators. |
| `class` | `Reactive<string>` | — | Merged into the list's classes. It scrolls past 300 px. |

### CommandEmpty

Shown only while the query matches nothing.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The message. |
| `class` | `Reactive<string>` | — | Merged into its classes. |

### CommandGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `heading` | `Slot` | — | Shown above the items. |
| `children` | `Parts` | — | The group's items. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### CommandItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. Identifies the item and is what `Command`'s `onSelect` receives. |
| `children` | `Slot` | — | The item's content. |
| `textValue` | `string` | `children` when it is a string, else `value` | What the filter matches. |
| `keywords` | `readonly string[]` | `[]` | Extra terms that match the item. |
| `disabled` | `boolean` | `false` | Leaves the item out of the matches: it is hidden and never runs. |
| `onSelect` | `() => void` | — | Runs when the item is chosen. |
| `class` | `Reactive<string>` | — | Merged into the item's classes. |

### CommandSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the rule's classes. |

### CommandShortcut

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The keys, right-aligned in the item. Display only. |
| `class` | `Reactive<string>` | — | Merged into its classes. |

### defaultFilter

`defaultFilter(candidate: CommandCandidate, query: string): boolean` — the built-in filter. An empty query matches everything; otherwise the item matches when its `textValue` or one of its `keywords` contains the query, ignoring case.

`CommandCandidate` is `{ readonly value: string; readonly textValue: string; readonly keywords: readonly string[] }`.

## Accessibility

The field is `role="combobox"` with `aria-controls` pointing at the list and `aria-activedescendant` at the highlighted item. The list is `role="listbox"`, each item `role="option"` with `aria-selected="true"` on the highlighted one. A group is `role="group"`. Filtered-out items and empty groups are `hidden`, so they leave the accessibility tree too.

The keyboard never takes focus out of the field. Before the user moves, the first match is highlighted; every change to the query brings the highlight back to the first match, so Enter never runs an item the query has hidden. The pointer moving onto an item highlights it.

| Key | Action |
|---|---|
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Highlight the next or previous match, wrapping at the ends, and scroll it into view. |
| <kbd>Enter</kbd> | Run the highlighted item. |

The field's placeholder is English by default; `placeholder` replaces it, and `CommandEmpty` says whatever you give it — see [languages](/en/nebula/languages).
