# Sidebar

The application's navigation column, with two presentations from one definition — a sidebar is less a component than a layout decision that changes with the viewport. On a wide screen it is a column beside the content, collapsible to a strip of icons or out of sight. Below 768 px it is a [Sheet](/en/nebula/components/sheet) that slides over the page: a 16rem column on a phone leaves nothing for the content. Both presentations read the same open state, so on a phone the sheet is shown whenever the state is open, and closing it collapses the wide column too.

Whether it is open lives in a cookie, `nebula:sidebar`, kept for a year, not in `localStorage`. The server renders the shell, and only a cookie is readable there: with `localStorage` the sidebar would render expanded, then snap shut once the page hydrates, on every load. For the server to read it, list it in the cookies Aurora's `renderPage` may read — `cookies: ['nebula:sidebar']`. That state is one signal for the whole page, shared by every sidebar part, so a trigger in a header outside the provider still works. <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>B</kbd> toggles it, the convention of every editor that has a sidebar.

```sh
ream nebula:add sidebar
```

Organism · `organisms/Sidebar.ts` · [button](/en/nebula/components/button), [input](/en/nebula/components/input), [separator](/en/nebula/components/separator), [sheet](/en/nebula/components/sheet), [skeleton](/en/nebula/components/skeleton), [tooltip](/en/nebula/components/tooltip)

## Usage

```ts
import { html } from '@c9up/aurora'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@c9up/nebula'

SidebarProvider({
  children: () => html`
    ${Sidebar({
      children: () => SidebarContent({
        children: SidebarMenu({ children: html`
          ${SidebarMenuItem({ children: SidebarMenuButton({ href: '/', active: true, children: 'Home' }) })}
          ${SidebarMenuItem({ children: SidebarMenuButton({ href: '/inbox', children: 'Inbox' }) })}
        ` }),
      }),
    })}
    ${SidebarInset({ children: html`
      <header class="flex h-12 items-center border-b px-2">${SidebarTrigger()}</header>
      ${page}
    ` })}
  `,
})
```

`SidebarProvider` and `Sidebar` take their `children` as `Parts`, in `() =>`; every part inside the sidebar is a plain value — see [composition](/en/nebula/composition). For a page with a header bar, the [AppShell](/en/nebula/components/app-shell) takes the `Sidebar` in its `sidebar` slot and replaces `SidebarInset`.

## Examples

### Groups, icons and tooltips

```ts
import { CalendarIcon, SearchIcon, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel } from '@c9up/nebula'

SidebarContent({
  children: SidebarGroup({ children: html`
    ${SidebarGroupLabel({ children: 'Planning' })}
    ${SidebarGroupAction({ label: 'Search the plan', onClick: () => openSearch(), children: SearchIcon() })}
    ${SidebarGroupContent({ children: SidebarMenu({ children: html`
      ${SidebarMenuItem({ children: SidebarMenuButton({
        href: '/calendar',
        tooltip: 'Calendar',
        active: () => path() === '/calendar',
        children: html`${CalendarIcon()}<span>Calendar</span>`,
      }) })}
    ` }) })}
  ` }),
})
```

Put the entry's text in a `<span>`: the last span truncates when the column is narrow, and the icon keeps its 16 px. `tooltip` shows only while the sidebar is collapsed to icons — an entry whose label is on screen needs no repeat on hover, and without one a collapsed rail is a column of unlabelled glyphs. `active` takes an accessor, so it can follow the route.

### Collapsing to icons, or out of sight

`collapsible` says what collapsing does: `'icon'` (the default) shrinks the column to a 3rem strip, `'offcanvas'` takes it off the screen, `'none'` keeps it open. While collapsed, the `<nav>` carries `data-state="collapsed"` and `data-collapsible` with the mode, and in `'icon'` mode the parts adapt to it: group labels fade out, actions, badges and sub-menus hide, and menu buttons become 32 px squares.

The widths are CSS variables, `--sidebar-width` (16rem) and `--sidebar-width-icon` (3rem), read through the cascade — set them on the provider:

```ts
SidebarProvider({
  class: '[--sidebar-width:20rem]',
  children: () => html`
    ${Sidebar({ collapsible: 'offcanvas', children: () => SidebarContent({ children: navigation }) })}
    ${SidebarInset({ children: page })}
  `,
})
```

### Header, footer, search and rail

```ts
import { signal } from '@c9up/aurora'
import { SidebarFooter, SidebarHeader, SidebarInput, SidebarRail, SidebarSeparator } from '@c9up/nebula'

const query = signal('')

Sidebar({
  children: () => html`
    ${SidebarHeader({ children: SidebarInput({ placeholder: 'Search…', value: query, onInput: query }) })}
    ${SidebarContent({ children: navigation })}
    ${SidebarSeparator()}
    ${SidebarFooter({ children: account })}
    ${SidebarRail()}
  `,
})
```

`SidebarContent` takes the free height and scrolls; the header and footer stay put. `SidebarRail` is a thin hit area along the column's edge that toggles it — a wider target than the trigger, and always where the eye already is.

### Badges, row actions and sub-menus

```ts
import {
  MoreHorizontalIcon,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@c9up/nebula'

SidebarMenuItem({ children: html`
  ${SidebarMenuButton({ href: '/inbox', children: html`<span>Inbox</span>` })}
  ${SidebarMenuBadge({ children: unread })}
` })

SidebarMenuItem({ children: html`
  ${SidebarMenuButton({ href: '/projects/atlas', children: html`<span>Atlas</span>` })}
  ${SidebarMenuAction({ label: 'Project options', onClick: () => openOptions('atlas'), children: MoreHorizontalIcon() })}
` })

SidebarMenuItem({ children: html`
  ${SidebarMenuButton({ children: html`<span>Projects</span>` })}
  ${SidebarMenuSub({ children: html`
    ${SidebarMenuSubItem({ children: SidebarMenuSubButton({ href: '/projects/atlas', children: html`<span>Atlas</span>` }) })}
    ${SidebarMenuSubItem({ children: SidebarMenuSubButton({ href: '/projects/helix', active: true, children: html`<span>Helix</span>` }) })}
  ` })}
` })
```

The badge and the action sit at the end of the row, beside the button, and the button leaves room for an action when its row has one.

### While the navigation loads

```ts
import { SidebarMenuSkeleton } from '@c9up/nebula'

SidebarMenu({
  children: () => loading()
    ? [1, 2, 3, 4].map(() => SidebarMenuItem({ children: SidebarMenuSkeleton({ showIcon: true }) }))
    : entries().map((entry) => SidebarMenuItem({
        children: SidebarMenuButton({ href: entry.href, children: html`<span>${entry.label}</span>` }),
      })),
})
```

Each placeholder row draws its own width, from 50 to 89 %, once, when it is built — a loading column of equal bars reads as a chart.

### Controlled

`open` and `onOpenChange` hand the state to you:

```ts
const open = signal(true)

SidebarProvider({
  open,
  onOpenChange: open,
  children: () => html`
    ${Sidebar({ children: () => SidebarContent({ children: navigation }) })}
    ${SidebarInset({ children: html`${SidebarTrigger({ onToggle: () => open(!open()) })}${page}` })}
  `,
})
```

`SidebarTrigger` and `SidebarRail` flip the shared cookie state directly rather than going through the provider, so a controlled sidebar gives its trigger `onToggle`, and has no rail. The keyboard shortcut does go through the provider: it flips the shared state and reports the result to `onOpenChange`. Tooltips on collapsed entries follow the shared state, not `open`.

### Reading the state

Inside the provider, `useSidebar()` — called from a component's setup — gives the state and its setters. A brand that shortens with the column:

```ts
import { component } from '@c9up/aurora'
import { useSidebar } from '@c9up/nebula'

const Brand = component(() => {
  const sidebar = useSidebar()
  return html`<a href="/" class="px-2 font-semibold">${() => (sidebar.state() === 'collapsed' ? 'A' : 'Acme')}</a>`
})

SidebarProvider({
  children: () => html`
    ${Sidebar({ children: () => html`${SidebarHeader({ children: Brand() })}${SidebarContent({ children: navigation })}` })}
    ${SidebarInset({ children: page })}
  `,
})
```

Outside it, `sidebarCollapsed()` reads the shared state and `sidebarState()` returns the signal itself:

```ts
import { sidebarCollapsed, sidebarState } from '@c9up/nebula'

html`<header class="flex items-center gap-2">
  ${SidebarTrigger()}
  <span class="${() => (sidebarCollapsed() ? 'font-semibold' : 'sr-only')}">Acme</span>
</header>`

const open = sidebarState()
open(false)
```

### An entry that is another element

`sidebarMenuButtonVariants` is the class list of a menu button, for an element `SidebarMenuButton` does not render:

```ts
import { sidebarMenuButtonVariants } from '@c9up/nebula'

html`<a href="/" class="${sidebarMenuButtonVariants({ size: 'lg' })}">${CalendarIcon()}<span>Agenda</span></a>`
```

## API

### SidebarProvider

Holds the state and renders the wrapper (`flex min-h-svh w-full`) around the sidebar and the page.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The `Sidebar` and the page, built in `() =>`. |
| `defaultOpen` | `boolean` | `true` | The starting state when there is no cookie yet. Only the first provider on the page sets it. |
| `open` | `Reactive<boolean>` | — | The state, controlled. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the provider changes the state: <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>B</kbd>, closing the mobile sheet, `useSidebar().setOpen`. |
| `class` | `Reactive<string>` | — | Merged into the wrapper's classes; where `--sidebar-width` and `--sidebar-width-icon` go. |

### Sidebar

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The sidebar's parts, built in `() =>`. |
| `side` | `'left' \| 'right'` | `'left'` | The edge the column's border is drawn on, and the one the sheet slides from on mobile. On a wide screen the column stays where the markup puts it: for a right-hand sidebar, place it after the page. |
| `collapsible` | `'icon' \| 'offcanvas' \| 'none'` | `'icon'` | What collapsing does: shrink to icons, disappear, or nothing. |
| `label` | `string` | `'Sidebar'` | The navigation landmark's name. On mobile, the sheet's title, which defaults to `'Navigation'`. |
| `closeLabel` | `string` | `'Close'` | The close cross of the sheet it becomes on mobile. |
| `class` | `Reactive<string>` | — | Merged into the column's classes. |

### SidebarTrigger

An icon button that toggles the sidebar. It works anywhere on the page, inside the provider or not.

| Prop | Type | Default | Description |
|---|---|---|---|
| `onToggle` | `() => void` | — | Replaces the toggle — for a controlled sidebar. |
| `label` | `string` | `'Toggle sidebar'` | The button's accessible name. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarRail

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Toggle sidebar'` | Accessible name and tooltip. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarInset

The page beside the sidebar, as a `<main>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The page. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarInput

An [Input](/en/nebula/components/input) sized for the column.

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | — | The hint shown while empty. |
| `value` | `Reactive<string>` | — | The value. |
| `onInput` | `(value: string) => void` | — | Called on each keystroke with the new value. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarHeader

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The top of the column: a brand, a workspace switcher, a search field. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### SidebarContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The groups. Takes the free height and scrolls. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### SidebarFooter

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The bottom of the column: the account, a help link. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### SidebarSeparator

A [Separator](/en/nebula/components/separator) in the sidebar's border colour, inset from the edges.

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A label, an action and the group's content. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### SidebarGroupLabel

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The group's name, small and muted. Fades out while collapsed to icons. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### SidebarGroupContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The group's menu. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### SidebarGroupAction

A button in the group's top corner — "add", "filter". Hidden while collapsed to icons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Usually an icon. |
| `label` | `string` | — | The button's accessible name — needed for an icon. |
| `onClick` | `() => void` | — | Click handler. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenu

A `<ul>` of entries.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | `SidebarMenuItem`s. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuItem

An `<li>`: one row, holding a button and optionally an action and a badge.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A `SidebarMenuButton`, and a `SidebarMenuAction`, `SidebarMenuBadge` or `SidebarMenuSub`. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuButton

A link with `href`, a `<button>` without.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | An icon and the text, in a `<span>`. |
| `href` | `string` | — | Renders an `<a>` to this URL. |
| `active` | `Reactive<boolean>` | `false` | The current entry: highlighted, `data-active="true"` and `aria-current="page"`. |
| `tooltip` | `string` | — | Shown beside the entry while the sidebar is collapsed to icons. |
| `variant` | `'default' \| 'outline'` | `'default'` | `outline` draws a ring around the entry. |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | 32, 28 or 48 px high. |
| `onClick` | `() => void` | — | Click handler — the button form only. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### SidebarMenuAction

A second button on a row — a "more" menu, a remove button. Hidden while collapsed to icons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Usually an icon. |
| `label` | `string` | — | The button's accessible name — needed for an icon. |
| `onClick` | `() => void` | — | Click handler. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuBadge

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A count or a status, at the end of the row. Hidden while collapsed to icons. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuSkeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `showIcon` | `boolean` | `false` | Leaves room for an icon, as the real rows have. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuSub

A nested `<ul>`, ruled on its left. Hidden while collapsed to icons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | `SidebarMenuSubItem`s. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuSubItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A `SidebarMenuSubButton`. |
| `class` | `Reactive<string>` | — | Merged last. |

### SidebarMenuSubButton

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The entry's text, in a `<span>`. |
| `href` | `string` | — | Renders an `<a>` to this URL; without it, a `<button>`. |
| `active` | `Reactive<boolean>` | `false` | The current entry: highlighted and `aria-current="page"`. |
| `size` | `'sm' \| 'md'` | `'md'` | The text size. |
| `onClick` | `() => void` | — | Click handler — the button form only. |
| `class` | `Reactive<string>` | — | Merged last. |

### sidebarMenuButtonVariants

`sidebarMenuButtonVariants({ variant?, size?, class? }): string` — the class list of a `SidebarMenuButton`. `SidebarMenuButtonVariants` is the type of its options.

### useSidebar

`useSidebar(): SidebarApi` — the sidebar's state, from a component's setup inside a `SidebarProvider`. Throws outside one.

| Member | Type | Description |
|---|---|---|
| `open` | `() => boolean` | Whether it is open — the controlled `open` when there is one. |
| `isMobile` | `() => boolean` | Whether the viewport is under 768 px, where the sidebar is a sheet. |
| `state` | `() => 'expanded' \| 'collapsed'` | `open`, as the word written to `data-state`. |
| `setOpen` | `(next: boolean) => void` | Sets the shared state and calls `onOpenChange`. |
| `toggleSidebar` | `() => void` | Flips the shared state and calls `onOpenChange`. |

### sidebarState and sidebarCollapsed

`sidebarState(defaultOpen = true): Signal<boolean>` — the cookie-backed open state shared by every sidebar on the page, created on the first call; `defaultOpen` counts only on that call. `sidebarCollapsed(): boolean` is `!sidebarState()()`.

## Accessibility

On a wide screen the sidebar is a `<nav>` landmark named by `label`. On a phone it is a [Sheet](/en/nebula/components/sheet) — a modal dialog that keeps focus inside it and closes on <kbd>Escape</kbd> — titled by `label` for screen readers only, with a close cross named by `closeLabel`.

The trigger is a [Button](/en/nebula/components/button) named by its `label`. The rail is a `<button>` named and titled by its `label`, kept out of the tab order on purpose: the keyboard already has the shortcut and the trigger, and a third stop on every page would be noise. The current entry carries `aria-current="page"`. A collapsed entry keeps its text in the markup, so it keeps its accessible name; the tooltip is for the eye. `SidebarGroupAction` and `SidebarMenuAction` have no default name — give an icon-only one a `label`. `SidebarInput` takes no label: its placeholder is all it has, so put a visible `SidebarGroupLabel` or heading next to it.

| Key | Action |
|---|---|
| <kbd>Cmd</kbd> + <kbd>B</kbd> / <kbd>Ctrl</kbd> + <kbd>B</kbd> | Toggles the sidebar, from anywhere on the page. |

The built-in texts are English; `label` and `closeLabel` on `Sidebar`, and `label` on `SidebarTrigger` and `SidebarRail`, replace them — see [languages](/en/nebula/languages).
