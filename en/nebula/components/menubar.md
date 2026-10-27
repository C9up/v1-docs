# Menubar

The application menu bar: File, Edit, View, each a menu. There is one panel for the whole bar, not one per menu — only one menu is ever open, and moving between them changes the panel's anchor and contents rather than closing one and opening another. That is what makes the arrows feel like walking a bar instead of dismissing and summoning.

Once a menu is open, the pointer moving onto another trigger switches to it; while none is open, the pointer passing over the bar opens nothing. Each `MenubarMenu` takes its place in the bar as it is built, and that order is the order the arrows walk.

The rows are the [DropdownMenu](/en/nebula/components/dropdown-menu)'s, built from the same shared module: checkbox and radio rows, labels, shortcuts and submenus all work here the same way.

```sh
ream nebula:add menubar
```

Organism · `organisms/Menubar.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@c9up/nebula'

Menubar({
  children: () => html`
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'File' })}
      ${MenubarContent({ children: () => html`
        ${MenubarItem({ children: 'New tab', onSelect: () => newTab() })}
        ${MenubarItem({ children: 'Print…', onSelect: () => print() })}
      ` })}
    ` })}
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Edit' })}
      ${MenubarContent({ children: () => html`
        ${MenubarItem({ children: 'Undo', onSelect: () => undo() })}
        ${MenubarItem({ children: 'Redo', onSelect: () => redo() })}
      ` })}
    ` })}
  `,
})
```

`Menubar`, `MenubarMenu`, `MenubarContent`, `MenubarRadioGroup`, `MenubarSub` and `MenubarSubContent` take their parts in a thunk — see [composition](/en/nebula/composition).

## Examples

### A full bar

```ts
import { html, signal } from '@c9up/aurora'
import {
  Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup,
  MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent,
  MenubarSubTrigger, MenubarTrigger,
} from '@c9up/nebula'

const bookmarksBar = signal(false)
const profile = signal<string | undefined>('benoit')

Menubar({
  children: () => html`
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'File' })}
      ${MenubarContent({ children: () => html`
        ${MenubarItem({ children: html`New tab${MenubarShortcut({ children: '⌘T' })}` })}
        ${MenubarItem({ disabled: true, children: 'New incognito window' })}
        ${MenubarSeparator({})}
        ${MenubarSub({ children: () => html`
          ${MenubarSubTrigger({ children: 'Share' })}
          ${MenubarSubContent({ children: () => html`
            ${MenubarItem({ children: 'Email link' })}
            ${MenubarItem({ children: 'Messages' })}
          ` })}
        ` })}
      ` })}
    ` })}
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'View' })}
      ${MenubarContent({ children: () =>
        MenubarCheckboxItem({ checked: bookmarksBar, onCheckedChange: bookmarksBar, children: 'Always show bookmarks bar' }),
      })}
    ` })}
    ${MenubarMenu({ children: () => html`
      ${MenubarTrigger({ children: 'Profiles' })}
      ${MenubarContent({ children: () =>
        MenubarRadioGroup({
          value: profile,
          onValueChange: profile,
          children: () => html`
            ${MenubarRadioItem({ value: 'andy', children: 'Andy' })}
            ${MenubarRadioItem({ value: 'benoit', children: 'Benoit' })}
          `,
        }),
      })}
    ` })}
  `,
})
```

Checkbox and radio rows hold no state of their own: they show `checked` or `value` and report the change, and a signal passed to both sides does the rest — see [DropdownMenu](/en/nebula/components/dropdown-menu#checkbox-rows).

### A menu that cannot open

A `disabled` trigger keeps its place in the bar but its menu never opens, by click, key or hover:

```ts
MenubarMenu({ children: () => html`
  ${MenubarTrigger({ disabled: true, children: 'History' })}
  ${MenubarContent({ children: () => MenubarItem({ children: 'Show full history' }) })}
` })
```

The arrows do not step over it: walking the bar, from a trigger or from an open menu, stops at the menu before it.

### Menus from data

The bar's thunk is called once, during setup, so it can map over a list:

```ts
import { html } from '@c9up/aurora'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@c9up/nebula'

const menus = [
  { label: 'File', entries: [{ label: 'New', run: newTab }] },
  { label: 'Edit', entries: [{ label: 'Undo', run: undo }] },
]

Menubar({
  children: () =>
    menus.map((menu) =>
      MenubarMenu({
        children: () => html`
          ${MenubarTrigger({ children: menu.label })}
          ${MenubarContent({ children: () => menu.entries.map((entry) => MenubarItem({ children: entry.label, onSelect: entry.run })) })}
        `,
      }),
    ),
})
```

## API

### Menubar

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The menus. |
| `class` | `Reactive<string>` | — | Merged into the bar's classes. |

### MenubarMenu

One menu in the bar. It provides its place to the trigger and the content inside it, so neither has to be told which menu it belongs to.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | One `MenubarTrigger` and one `MenubarContent`. |

### MenubarTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `disabled` | `boolean` | `false` | The menu never opens. |
| `class` | `Reactive<string>` | — | Merged into the button's classes. |

### MenubarContent

Renders nothing where it is written: the bar's panel shows it below the trigger, aligned on its start edge, 4 px away.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The rows. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. |

### MenubarItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. |
| `onSelect` | `() => void` | — | Runs when the row is chosen; the menu then closes. |
| `variant` | `'default' \| 'destructive'` | `'default'` | `destructive` draws the row in the destructive colour. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `inset` | `boolean` | `false` | Indents the row to line up with checkbox and radio rows. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### MenubarCheckboxItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. |
| `checked` | `Reactive<boolean>` | `false` | Whether the check mark shows. |
| `onCheckedChange` | `(checked: boolean) => void` | — | Called with the opposite of `checked`. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### MenubarRadioGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The radio rows. |
| `value` | `Reactive<string \| undefined>` | — | The checked row's `value`. |
| `onValueChange` | `(value: string) => void` | — | The row chosen. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### MenubarRadioItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. Compared with the group's `value`. |
| `children` | `Slot` | — | The row's content. |
| `disabled` | `boolean` | `false` | Dims the row and makes it unreachable. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### MenubarLabel

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The heading's text. |
| `inset` | `boolean` | `false` | Indents it to line up with checkbox and radio rows. |
| `class` | `Reactive<string>` | — | Merged into the label's classes. |

### MenubarGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The rows it gathers. |
| `class` | `Reactive<string>` | — | The group's classes. |

### MenubarSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the rule's classes. |

### MenubarShortcut

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The keys, right-aligned in the row. Display only. |
| `class` | `Reactive<string>` | — | Merged into its classes. |

### MenubarSub

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | One `MenubarSubTrigger` and one `MenubarSubContent`. |

### MenubarSubTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's content. A chevron is added after it. |
| `disabled` | `boolean` | `false` | Keeps the arrows and the pointer off the row, so its submenu never opens. Unlike the other rows, it is not dimmed and not marked `aria-disabled`. |
| `inset` | `boolean` | `false` | Indents the row. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

### MenubarSubContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The submenu's rows. |
| `class` | `Reactive<string>` | — | Merged into the submenu panel's classes. |

### MenubarPortal

Mounts its children at the end of `container`, outside the component's own place in the page. `MenubarContent` does not need it: the menu portals its own panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What to mount. |
| `container` | `() => Element \| null` | `document.body` | Where to mount it. |

## Accessibility

The bar is `role="menubar"` and each trigger a `<button>` with `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` while its menu is open. The panel is `role="menu"`, named by the open trigger through `aria-labelledby`. Rows are `menuitem`, `menuitemcheckbox` or `menuitemradio`, the last two with `aria-checked`; a disabled item, checkbox or radio row has `aria-disabled="true"`. A submenu row has `aria-haspopup="menu"`, and `aria-expanded` with `aria-controls` while its submenu is open.

Opened with the keyboard, focus lands on the menu's first row; opened with the pointer, the panel itself takes focus, so the arrows and Escape reach it rather than the page behind. When the menu closes while focus is in its top-level panel, focus goes back to its trigger. Each trigger is its own tab stop. <kbd>ArrowRight</kbd> on a submenu row is taken by the bar too, which walks to the next menu: open a submenu with <kbd>Enter</kbd>, <kbd>Space</kbd> or the pointer.

| Key | Action |
|---|---|
| <kbd>Enter</kbd>, <kbd>Space</kbd>, <kbd>ArrowDown</kbd> | On a trigger: open its menu and focus the first row. |
| <kbd>ArrowRight</kbd>, <kbd>ArrowLeft</kbd> | On a trigger: focus the next or previous trigger, wrapping. In an open menu: open the next or previous menu and focus its first row. A disabled trigger is not skipped. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | In a menu: next or previous row, wrapping. Disabled rows are skipped. |
| <kbd>Home</kbd>, <kbd>End</kbd> | First or last row. |
| <kbd>Enter</kbd>, <kbd>Space</kbd> | Choose the focused row, or open its submenu. |
| <kbd>ArrowLeft</kbd> | In a submenu: close it and return to its row. |
| <kbd>Escape</kbd> | Close the menu, from a submenu too. |
| <kbd>Tab</kbd> | Close the menu. |
| Letters | Focus the next row whose text starts with what was typed; keys typed within a second build one search. |
