# AppShell

The layout behind almost every signed-in page: a navigation column, a top bar over the content, and the page. It is a template — a page skeleton shipped with the library rather than rebuilt per app — rebuilding it is how two pages of one product end up with two header heights.

The shell is `h-svh` and only the content column scrolls — `overflow-auto` on `<main>`, not on the body. That keeps the header and the navigation in place without `position: fixed`, which would mean keeping a top padding in step with the header's height by hand, and breaking the moment the header wraps to two lines. `svh` rather than `vh`: mobile browsers shrink the viewport as their address bar retracts, and `vh` would leave the bottom of the layout under the browser's chrome.

```sh
ream nebula:add app-shell
```

Template · `templates/AppShell.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { AppShell } from '@c9up/nebula'

AppShell({
  sidebar: html`<nav aria-label="Main" class="w-64 border-r p-4">${links}</nav>`,
  header: html`<h1 class="text-sm font-medium">Invoices</h1>`,
  children: page,
})
```

## Examples

### With the Sidebar

The [Sidebar](/en/nebula/components/sidebar) goes in `sidebar` and its trigger in `header`. The `SidebarProvider` wraps the whole shell, so the sidebar finds its state when it is built:

```ts
import { Separator, Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@c9up/nebula'

SidebarProvider({
  children: () => AppShell({
    sidebar: Sidebar({ children: () => SidebarContent({ children: navigation }) }),
    header: html`
      ${SidebarTrigger()}
      ${Separator({ orientation: 'vertical', class: 'data-[orientation=vertical]:h-4' })}
      <h1 class="text-sm font-medium">Invoices</h1>
    `,
    children: page,
  }),
})
```

`AppShell` already renders the page in a `<main>`: use it instead of `SidebarInset`, not around it.

### Without a header

Leave `header` out and no top bar is rendered — the content column starts at the top:

```ts
AppShell({ sidebar: nav, children: page })
```

Whether there is a header is decided once, when the shell is built: a `header` accessor that returns nothing still leaves an empty bar.

### A full-bleed page

The content column is padded (`p-4`, `p-6` from `md`). `contentClass` overrides it for a page that needs every pixel — a map, an editor, or a template with its own padding such as [SettingsLayout](/en/nebula/components/settings-layout). Override both values, `p-0 md:p-0`: a plain `p-0` replaces `p-4` and leaves the `md:p-6` in place.

```ts
AppShell({ sidebar: nav, header: toolbar, contentClass: 'p-0 md:p-0', children: map })
```

```ts
import { SettingsLayout } from '@c9up/nebula'

AppShell({
  sidebar: nav,
  contentClass: 'p-0 md:p-0',
  children: SettingsLayout({ title: 'Settings', sections, children: panel }),
})
```

## API

### AppShell

| Prop | Type | Default | Description |
|---|---|---|---|
| `sidebar` | `Slot` | — | The navigation column — usually a `Sidebar`. |
| `header` | `Slot` | — | The top bar, 56 px high, spanning the content column. Left out, there is no bar. |
| `children` | `Slot` | — | The page. |
| `class` | `Reactive<string>` | — | Merged into the shell's classes. |
| `contentClass` | `Reactive<string>` | — | Merged into the content column's classes — its padding, above all. |

## Accessibility

The shell gives the page its landmarks: the header is a `<header>` and the content a `<main>`, so a screen-reader user jumps straight to either. The navigation landmark comes from what you put in `sidebar` — a `Sidebar` is a `<nav>` on a wide screen; a column of your own should be one too, with an `aria-label`. Nothing in the shell is focusable and it handles no key.
