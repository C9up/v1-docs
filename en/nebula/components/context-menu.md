# ContextMenu

The menu a right-click opens. It opens at the pointer, not against a control: a zero-size anchor is moved to the click's coordinates and the panel is placed against it, so it flips and shifts off a viewport edge exactly as a button's menu would. The browser's own menu is suppressed inside the region.

Touch has no right button, so a long press — half a second — opens it instead. Moving the finger cancels the press, so a scroll that starts on the region does not open a menu under the thumb.

The rows are the [DropdownMenu](/en/nebula/components/dropdown-menu)'s, built from the same shared module: checkbox and radio rows, labels, shortcuts and submenus all work here the same way.

```sh
ream nebula:add context-menu
```

Organism · `organisms/ContextMenu.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@c9up/nebula'

ContextMenu({
  children: () => html`
    ${ContextMenuTrigger({ class: 'rounded-md border border-dashed p-12 text-sm', children: 'Right-click here' })}
    ${ContextMenuContent({ children: () => html`
      ${ContextMenuItem({ children: 'Cut', onSelect: () => cut() })}
      ${ContextMenuItem({ children: 'Copy', onSelect: () => copy() })}
      ${ContextMenuItem({ children: 'Paste', onSelect: () => paste() })}
    ` })}
  `,
})
```

`ContextMenu`, `ContextMenuContent`, `ContextMenuRadioGroup`, `ContextMenuSub` and `ContextMenuSubContent` take their parts in a thunk — see [composition](/en/nebula/composition). `ContextMenuContent` has to be built during the menu's setup, directly in that thunk: the menu reads it once to set up its panel.

## Examples

### The region

`ContextMenuTrigger` is a `<div>` with no classes of its own: it is whatever area should answer to the right-click, styled as you need. It carries `data-state="open"` while its menu is showing, which is how a row stays highlighted while the menu opened on it is up:

```ts
ContextMenuTrigger({ class: 'rounded-sm px-2 py-1 data-[state=open]:bg-accent', children: fileName })
```

### Every kind of row

```ts
import { html, signal } from '@c9up/aurora'
import {
  ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@c9up/nebula'

const showBookmarks = signal(true)
const person = signal<string | undefined>('pedro')

ContextMenu({
  children: () => html`
    ${ContextMenuTrigger({ children: 'Right-click here' })}
    ${ContextMenuContent({ class: 'w-52', children: () => html`
      ${ContextMenuItem({ inset: true, children: html`Back${ContextMenuShortcut({ children: '⌘[' })}` })}
      ${ContextMenuItem({ inset: true, disabled: true, children: html`Forward${ContextMenuShortcut({ children: '⌘]' })}` })}
      ${ContextMenuSub({ children: () => html`
        ${ContextMenuSubTrigger({ inset: true, children: 'More tools' })}
        ${ContextMenuSubContent({ children: () => html`
          ${ContextMenuItem({ children: 'Save page…' })}
          ${ContextMenuItem({ children: 'Developer tools' })}
        ` })}
      ` })}
      ${ContextMenuSeparator({})}
      ${ContextMenuCheckboxItem({ checked: showBookmarks, onCheckedChange: showBookmarks, children: 'Show bookmarks' })}
      ${ContextMenuSeparator({})}
      ${ContextMenuLabel({ inset: true, children: 'People' })}
      ${ContextMenuRadioGroup({
        value: person,
        onValueChange: person,
        children: () => html`
          ${ContextMenuRadioItem({ value: 'pedro', children: 'Pedro Duarte' })}
          ${ContextMenuRadioItem({ value: 'colm', children: 'Colm Tuite' })}
        `,
      })}
    ` })}
  `,
})
```

Checkbox and radio rows hold no state of their own: they show `checked` or `value` and report the change, and a signal passed to both sides does the rest — see [DropdownMenu](/en/nebula/components/dropdown-menu#checkbox-rows).

### Knowing when it opens

There is no `open` prop: only a right-click or a long press opens a context menu. `onOpenChange` reports both directions:

```ts
import { html } from '@c9up/aurora'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@c9up/nebula'

ContextMenu({
  onOpenChange: (open) => (open ? pauseAutoRefresh() : resumeAutoRefresh()),
  children: () => html`
    ${ContextMenuTrigger({ children: 'Right-click here' })}
    ${ContextMenuContent({ children: () => ContextMenuItem({ children: 'Refresh' }) })}
  `,
})
```

## API

### ContextMenu

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The trigger and the content. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the menu opens and when it closes. |

### ContextMenuTrigger

The region that answers to the right-click and the long press, and the place the menu's anchor lives.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The region's content. |
| `class` | `Reactive<string>` | — | The region's classes. It has none of its own. |

### ContextMenuContent

Renders nothing where it is written: the menu portals the panel when it opens, 2 px below the pointer and starting at it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The rows. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. |

### ContextMenuItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. |
| `onSelect` | `() => void` | — | Runs when the row is chosen; the menu then closes. |
| `variant` | `'default' \| 'destructive'` | `'default'` | `destructive` draws the row in the destructive colour. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `inset` | `boolean` | `false` | Indents the row to line up with checkbox and radio rows. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### ContextMenuCheckboxItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. |
| `checked` | `Reactive<boolean>` | `false` | Whether the check mark shows. |
| `onCheckedChange` | `(checked: boolean) => void` | — | Called with the opposite of `checked`. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### ContextMenuRadioGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The radio rows. |
| `value` | `Reactive<string \| undefined>` | — | The checked row's `value`. |
| `onValueChange` | `(value: string) => void` | — | The row chosen. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### ContextMenuRadioItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. Compared with the group's `value`. |
| `children` | `Slot` | — | The row's content. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### ContextMenuLabel

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The heading's text. |
| `inset` | `boolean` | `false` | Indents it to line up with checkbox and radio rows. |
| `class` | `Reactive<string>` | — | Merged into the label's classes. |

### ContextMenuGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The rows it gathers. |
| `class` | `Reactive<string>` | — | The group's classes. |

### ContextMenuSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the rule's classes. |

### ContextMenuShortcut

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The keys, right-aligned in the row. Display only. |
| `class` | `Reactive<string>` | — | Merged into its classes. |

### ContextMenuSub

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | One `ContextMenuSubTrigger` and one `ContextMenuSubContent`. |

### ContextMenuSubTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. A chevron is added after it. |
| `disabled` | `boolean` | `false` | Keeps the arrows and the pointer off the row, so its submenu never opens. Unlike the other rows, it is not dimmed and not marked `aria-disabled`. |
| `inset` | `boolean` | `false` | Indents the row. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### ContextMenuSubContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The submenu's rows. |
| `class` | `Reactive<string>` | — | Merged into the submenu panel's classes. |

### ContextMenuPortal

Mounts its children at the end of `container`, outside the component's own place in the page. `ContextMenuContent` does not need it: the menu portals its own panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What to mount. |
| `container` | `() => Element \| null` | `document.body` | Where to mount it. |

## Accessibility

The panel is `role="menu"` with `aria-orientation="vertical"`. Rows are `menuitem`, `menuitemcheckbox` or `menuitemradio`, the last two with `aria-checked`; a disabled item, checkbox or radio row has `aria-disabled="true"`. A submenu row has `aria-haspopup="menu"`, and `aria-expanded` with `aria-controls` while its submenu is open. The trigger region has no role: it is whatever content you put in it.

The menu listens to the `contextmenu` event, which browsers also fire for the <kbd>Menu</kbd> key and <kbd>Shift</kbd>+<kbd>F10</kbd> when focus is inside the region — so put something focusable in it if keyboard users need the menu. On open, the panel takes focus, so the arrows and Escape reach the menu rather than the page behind it. The pointer moving onto a row focuses it.

| Key | Action |
|---|---|
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Next or previous row, wrapping at the ends. Disabled rows are skipped. |
| <kbd>Home</kbd>, <kbd>End</kbd> | First or last row. |
| <kbd>Enter</kbd>, <kbd>Space</kbd> | Choose the focused row, or open its submenu. |
| <kbd>ArrowRight</kbd> | On a submenu row: open the submenu and focus its first row. |
| <kbd>ArrowLeft</kbd> | In a submenu: close it and return to its row. |
| <kbd>Escape</kbd> | Close the menu, from a submenu too. |
| <kbd>Tab</kbd> | Close the menu. |
| Letters | Focus the next row whose text starts with what was typed; keys typed within a second build one search. |
