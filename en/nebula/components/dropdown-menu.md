# DropdownMenu

A menu opened from a button: actions, checkbox and radio rows, labels, separators, submenus. The keyboard model works on the rendered rows — their `role` and a `data-nebula-item` marker — never on a description of them, so rows you compose freely still behave as one menu.

Two behaviours are specific to a menu opened from a button. Opening it with the keyboard focuses the first row; opening it with the pointer does not, because pre-highlighting a row for a mouse user suggests it is about to be chosen. And <kbd>ArrowDown</kbd> on the trigger opens the menu *and* enters it, as every native menu button does.

DropdownMenu, [ContextMenu](/en/nebula/components/context-menu) and [Menubar](/en/nebula/components/menubar) are the same menu opened three ways. Their rows come from one shared module, so the three cannot drift apart: what this page says about the rows holds for the other two.

```sh
ream nebula:add dropdown-menu
```

Organism · `organisms/DropdownMenu.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@c9up/nebula'

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Open' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuItem({ children: 'Profile', onSelect: () => openProfile() })}
      ${DropdownMenuItem({ children: 'Log out', onSelect: () => logOut() })}
    ` })}
  `,
})
```

`DropdownMenu`, `DropdownMenuContent`, `DropdownMenuRadioGroup`, `DropdownMenuSub` and `DropdownMenuSubContent` take their parts in a thunk — see [composition](/en/nebula/composition). `DropdownMenuContent` has to be built during the menu's setup, directly in that thunk: the menu reads it once to set up its panel, and a content built later in an accessor leaves the menu with nothing to open.

## Examples

### A trigger that looks like a button

The trigger is a bare `<button>` with no classes of its own. Give it a button's look with `buttonVariants`:

```ts
import { buttonVariants, DropdownMenuTrigger } from '@c9up/nebula'

DropdownMenuTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Account' })
```

### Labels, groups, shortcuts

```ts
import { html } from '@c9up/aurora'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger,
} from '@c9up/nebula'

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Menu' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuLabel({ children: 'My account' })}
      ${DropdownMenuGroup({ children: html`
        ${DropdownMenuItem({ children: html`Profile${DropdownMenuShortcut({ children: '⇧⌘P' })}` })}
        ${DropdownMenuItem({ children: html`Settings${DropdownMenuShortcut({ children: '⌘,' })}` })}
      ` })}
      ${DropdownMenuSeparator({})}
      ${DropdownMenuItem({ children: 'Archive', disabled: true })}
      ${DropdownMenuItem({ variant: 'destructive', children: 'Delete', onSelect: () => remove() })}
    ` })}
  `,
})
```

`DropdownMenuShortcut` only displays the keys: bind the real shortcut yourself. A `disabled` row stays in the menu, dimmed, and is skipped by the arrows, the pointer and the click.

### Checkbox rows

A checkbox row holds no state of its own. It shows `checked` and reports the opposite in `onCheckedChange`, so a signal does both jobs:

```ts
import { html, signal } from '@c9up/aurora'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@c9up/nebula'

const statusBar = signal(true)
const activityBar = signal(false)

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'View' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuCheckboxItem({ checked: statusBar, onCheckedChange: statusBar, children: 'Status bar' })}
      ${DropdownMenuCheckboxItem({ checked: activityBar, onCheckedChange: activityBar, children: 'Activity bar' })}
    ` })}
  `,
})
```

Choosing a checkbox row closes the menu, like any other row.

### Radio rows

The same holds for a radio group: `value` says which row is checked, `onValueChange` reports the one chosen, and nothing changes until you write it back.

```ts
import { html, signal } from '@c9up/aurora'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@c9up/nebula'

const layout = signal<string | undefined>('list')

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Layout' })}
    ${DropdownMenuContent({ children: () =>
      DropdownMenuRadioGroup({
        value: layout,
        onValueChange: layout,
        children: () => html`
          ${DropdownMenuRadioItem({ value: 'list', children: 'List' })}
          ${DropdownMenuRadioItem({ value: 'grid', children: 'Grid' })}
        `,
      }),
    })}
  `,
})
```

### Submenus

`DropdownMenuSub` pairs a row with a panel. The panel opens beside the row as soon as the pointer reaches it, or on <kbd>ArrowRight</kbd>, <kbd>Enter</kbd> or <kbd>Space</kbd>, overlapping the parent slightly so the pointer can travel diagonally into it.

```ts
import { html } from '@c9up/aurora'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@c9up/nebula'

DropdownMenu({
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Share' })}
    ${DropdownMenuContent({ children: () => html`
      ${DropdownMenuItem({ children: 'Copy link' })}
      ${DropdownMenuSub({ children: () => html`
        ${DropdownMenuSubTrigger({ children: 'Send to' })}
        ${DropdownMenuSubContent({ children: () => html`
          ${DropdownMenuItem({ children: 'Email' })}
          ${DropdownMenuItem({ children: 'Messages' })}
        ` })}
      ` })}
    ` })}
  `,
})
```

Choosing a row in a submenu closes the whole stack.

### Opening it from your code

Pass `open` to hold the state yourself. `onOpenChange` reports every request — the trigger, Escape, a click outside, a chosen row — and the menu follows `open`, so write the request back:

```ts
import { html, signal } from '@c9up/aurora'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@c9up/nebula'

const menuOpen = signal(false)

DropdownMenu({
  open: menuOpen,
  onOpenChange: menuOpen,
  children: () => html`
    ${DropdownMenuTrigger({ children: 'Actions' })}
    ${DropdownMenuContent({ children: () => DropdownMenuItem({ children: 'Rename' }) })}
  `,
})

menuOpen(true)
```

Without `open`, the menu holds its own state, starting from `defaultOpen`.

### Placement

The panel opens below the trigger, aligned on its start edge, 4 px away. `side`, `align` and `sideOffset` move it; it flips and shifts on its own when the viewport has no room.

```ts
DropdownMenuContent({ side: 'top', align: 'end', sideOffset: 8, children: () => DropdownMenuItem({ children: 'Sign out' }) })
```

## API

### DropdownMenu

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The trigger and the content. |
| `open` | `Reactive<boolean>` | — | Controls the state. Present means the menu follows it. |
| `defaultOpen` | `boolean` | `false` | The starting state when `open` is absent. |
| `onOpenChange` | `(open: boolean) => void` | — | Every request to open or close. |

### DropdownMenuTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes. It has none of its own. |

### DropdownMenuContent

Renders nothing where it is written: the menu portals the panel when it opens.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The rows. |
| `side` | `Side` | `'bottom'` | `'top'`, `'right'`, `'bottom'` or `'left'` of the trigger. |
| `align` | `Align` | `'start'` | `'start'`, `'center'` or `'end'` along that side. |
| `sideOffset` | `number` | `4` | Distance from the trigger, in pixels. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. |

### DropdownMenuItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. |
| `onSelect` | `() => void` | — | Runs when the row is chosen; the menu then closes. |
| `variant` | `'default' \| 'destructive'` | `'default'` | `destructive` draws the row in the destructive colour. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `inset` | `boolean` | `false` | Indents the row to line up with checkbox and radio rows. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### DropdownMenuCheckboxItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. |
| `checked` | `Reactive<boolean>` | `false` | Whether the check mark shows. |
| `onCheckedChange` | `(checked: boolean) => void` | — | Called with the opposite of `checked`. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### DropdownMenuRadioGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The radio rows. |
| `value` | `Reactive<string \| undefined>` | — | The checked row's `value`. |
| `onValueChange` | `(value: string) => void` | — | The row chosen. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### DropdownMenuRadioItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. Compared with the group's `value`. |
| `children` | `Slot` | — | The row's content. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### DropdownMenuLabel

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The heading's text. |
| `inset` | `boolean` | `false` | Indents it to line up with checkbox and radio rows. |
| `class` | `Reactive<string>` | — | Merged into the label's classes. |

### DropdownMenuGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The rows it gathers. |
| `class` | `Reactive<string>` | — | The group's classes. |

### DropdownMenuSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the rule's classes. |

### DropdownMenuShortcut

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The keys, right-aligned in the row. Display only. |
| `class` | `Reactive<string>` | — | Merged into its classes. |

### DropdownMenuSub

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | One `DropdownMenuSubTrigger` and one `DropdownMenuSubContent`. |

### DropdownMenuSubTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. A chevron is added after it. |
| `disabled` | `boolean` | `false` | Keeps the arrows and the pointer off the row, so its submenu never opens. Unlike the other rows, it is not dimmed and not marked `aria-disabled`. |
| `inset` | `boolean` | `false` | Indents the row. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### DropdownMenuSubContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The submenu's rows. |
| `class` | `Reactive<string>` | — | Merged into the submenu panel's classes. |

### DropdownMenuPortal

Mounts its children at the end of `container`, outside the component's own place in the page. `DropdownMenuContent` does not need it: the menu portals its own panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What to mount. |
| `container` | `() => Element \| null` | `document.body` | Where to mount it. |

## Accessibility

The trigger carries `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` while the menu is open. The panel is `role="menu"`, named by the trigger through `aria-labelledby`. Rows are `menuitem`, `menuitemcheckbox` or `menuitemradio`, the last two with `aria-checked`; a disabled item, checkbox or radio row has `aria-disabled="true"`. A submenu row has `aria-haspopup="menu"`, and `aria-expanded` with `aria-controls` while its submenu is open.

Opened with the keyboard, focus lands on the first row; opened with the pointer, the panel itself takes focus, so the arrows and Escape reach the menu rather than the page behind it. When the menu closes while focus is in its top-level panel, focus goes back to the trigger. The pointer moving onto a row focuses it.

| Key | Action |
|---|---|
| <kbd>Enter</kbd>, <kbd>Space</kbd>, <kbd>ArrowDown</kbd> | On the trigger: open the menu and focus its first row. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Next or previous row, wrapping at the ends. Disabled rows are skipped. |
| <kbd>Home</kbd>, <kbd>End</kbd> | First or last row. |
| <kbd>Enter</kbd>, <kbd>Space</kbd> | Choose the focused row, or open its submenu. |
| <kbd>ArrowRight</kbd> | On a submenu row: open the submenu and focus its first row. |
| <kbd>ArrowLeft</kbd> | In a submenu: close it and return to its row. |
| <kbd>Escape</kbd> | Close the menu, from a submenu too. |
| <kbd>Tab</kbd> | Close the menu. |
| Letters | Focus the next row whose text starts with what was typed; keys typed within a second build one search. |
