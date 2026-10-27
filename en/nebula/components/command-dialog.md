# CommandDialog

The command palette people mean when they say "command palette": a [Command](/en/nebula/components/command) in a modal over the page, opened by a keyboard shortcut, dismissed by Escape or a click outside. Nothing about the palette is re-implemented — the filter, the highlight and the keys are `Command`'s — and this component adds only the modal shell and the shortcut.

The shortcut is opt-in but built in, because binding it correctly is fiddlier than it looks. It listens on the document in the capture phase, so a menu or a dialog already open does not swallow it; it prevents the browser's default, since ⌘K focuses the search bar in several browsers; and it toggles rather than opens, so the same keystroke closes the palette.

The dialog has a title even when none shows. A dialog with no accessible name is announced as just "dialog"; the palette's search field is the visible affordance, and the title is there for the screen reader.

```sh
ream nebula:add command-dialog
```

Organism · `organisms/CommandDialog.ts` · [command](/en/nebula/components/command), [dialog](/en/nebula/components/dialog)

## Usage

```ts
import { html } from '@c9up/aurora'
import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

CommandDialog({
  shortcut: 'k',
  children: () => html`
    ${CommandInput({})}
    ${CommandList({ children: () => html`
      ${CommandEmpty({ children: 'No results found.' })}
      ${CommandItem({ value: 'new', children: 'New file', onSelect: () => createFile() })}
      ${CommandItem({ value: 'settings', children: 'Settings', onSelect: () => openSettings() })}
    ` })}
  `,
})
```

<kbd>⌘</kbd>+<kbd>K</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> opens and closes it — either modifier, on every platform, so nothing sniffs the user agent. `children` is a thunk, passed straight to the `Command` inside — see [composition](/en/nebula/composition).

## Examples

### Opening it from a button

The palette has no trigger of its own. To open it from your interface too, hold the state: `onOpenChange` reports the shortcut, Escape, a click outside and a chosen item, and the dialog follows `open`.

```ts
import { html, signal } from '@c9up/aurora'
import { Button, CommandDialog, CommandInput, CommandItem, CommandList } from '@c9up/nebula'

const paletteOpen = signal(false)

Button({ variant: 'outline', children: 'Search…', onClick: () => paletteOpen(true) })

CommandDialog({
  open: paletteOpen,
  onOpenChange: paletteOpen,
  shortcut: 'k',
  children: () => html`
    ${CommandInput({})}
    ${CommandList({ children: () => CommandItem({ value: 'new', children: 'New file' }) })}
  `,
})
```

Without `open`, the dialog holds its own state, starting from `defaultOpen`. Leave `shortcut` out for a palette opened only from your code.

### Running the chosen item

Choosing an item runs its own `onSelect`, then the dialog's `onSelect` with its `value`, then closes the dialog — after the action, so a handler that opens another surface does not have this one tearing down focus underneath it.

```ts
CommandDialog({
  shortcut: 'p',
  onSelect: (value) => navigate(value),
  children: () => html`
    ${CommandInput({ placeholder: 'Go to…' })}
    ${CommandList({ children: () => pages.map((page) => CommandItem({ value: page.path, children: page.title })) })}
  `,
})
```

The palette is built afresh each time it opens: the query starts empty, and a `pages` list that has changed since is the one shown.

### Title and description

`title` and `description` are read by a screen reader as the dialog opens. The title is visually hidden unless `showTitle`; the description always is.

```ts
CommandDialog({
  title: 'Search the docs',
  description: 'Type a page name, then press Enter.',
  showTitle: true,
  contentClass: 'max-w-xl',
  children: () => html`
    ${CommandInput({ placeholder: 'Search the docs…' })}
    ${CommandList({ children: () => pages.map((page) => CommandItem({ value: page.path, children: page.title })) })}
  `,
})
```

## API

### CommandDialog

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The palette's parts: `CommandInput`, `CommandList` and what goes in it. |
| `shortcut` | `string` | — | One character: with ⌘ or Ctrl, it toggles the palette. Absent, there is no shortcut. |
| `open` | `Reactive<boolean>` | — | Controls the state. Present means the dialog follows it. |
| `defaultOpen` | `boolean` | `false` | The starting state when `open` is absent. |
| `onOpenChange` | `(open: boolean) => void` | — | Every request to open or close. |
| `onSelect` | `(value: string) => void` | — | Called with the chosen item's `value`, before the dialog closes. |
| `filter` | `(candidate: CommandCandidate, query: string) => boolean` | `defaultFilter` | Passed to the `Command` — see [its filter](/en/nebula/components/command#your-own-filter). |
| `title` | `Child` | `'Command palette'` | The dialog's accessible name. |
| `description` | `Child` | — | Read after the title. Always visually hidden. |
| `showTitle` | `boolean` | `false` | Shows the title above the field. |
| `contentClass` | `Reactive<string>` | — | Merged into the panel's classes. |

## Accessibility

The panel is `role="dialog"` with `aria-modal="true"`, named by its title through `aria-labelledby` and described by `description` through `aria-describedby` when there is one. While it is open, the rest of the page is hidden from assistive technology with `aria-hidden`, focus is trapped inside, and the page does not scroll.

On open, focus goes to the search field rather than the first focusable element — the point of the palette is that you can start typing at once. On close, focus goes back to whatever held it before. Inside, the keys are [Command's](/en/nebula/components/command#accessibility).

| Key | Action |
|---|---|
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + `shortcut` | Open or close the palette, from anywhere on the page. |
| <kbd>Escape</kbd> | Close the palette. |
| <kbd>Tab</kbd>, <kbd>Shift</kbd>+<kbd>Tab</kbd> | Cycle through the panel's focusable elements without leaving it. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Highlight the next or previous match. |
| <kbd>Enter</kbd> | Run the highlighted item and close the palette. |

The title defaults to the English "Command palette": `title` replaces it, and `CommandInput`'s `placeholder` replaces the field's — see [languages](/en/nebula/languages).
