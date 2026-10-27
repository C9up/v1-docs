# NavigationMenu

A site's top-level navigation: a row of links, some of which open a panel of further links. It is a `<nav>` of links, never a `menu` — a menu is a list of commands, and announcing navigation as an application menu offers screen-reader users the wrong shortcuts.

There is one panel for the whole bar, as in [Menubar](/en/nebula/components/menubar): only one is ever open, and moving between triggers changes its anchor and contents. The delays are what make it usable with a pointer. Opening waits 150 ms, so crossing the bar does not flash every panel on the way; closing waits 250 ms, so travelling diagonally from a trigger into its panel does not dismiss it halfway. A plain link in the bar closes an open panel on hover, because the pointer has left that branch.

```sh
ream nebula:add navigation-menu
```

Organism · `organisms/NavigationMenu.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink,
  NavigationMenuList, NavigationMenuTrigger,
} from '@c9up/nebula'

NavigationMenu({
  children: () => NavigationMenuList({ children: html`
    ${NavigationMenuItem({ children: () => html`
      ${NavigationMenuTrigger({ children: 'Products' })}
      ${NavigationMenuContent({ children: () => html`
        ${NavigationMenuLink({ href: '/analytics', children: 'Analytics' })}
        ${NavigationMenuLink({ href: '/reports', children: 'Reports' })}
      ` })}
    ` })}
    ${NavigationMenuItem({ children: () => NavigationMenuLink({ href: '/pricing', children: 'Pricing' }) })}
  ` }),
})
```

`NavigationMenu`, `NavigationMenuItem` and `NavigationMenuContent` take their parts in a thunk — see [composition](/en/nebula/composition). `NavigationMenuList` takes a plain value: it shares nothing, and the items in it are built inside the menu's thunk anyway.

## Examples

### A panel of described links

The panel holds whatever you give it. A link's children can be markup — a title and a line under it. This `NavigationMenuContent` sits in its `NavigationMenuItem`, after the trigger:

```ts
import { html } from '@c9up/aurora'
import { NavigationMenuContent, NavigationMenuLink } from '@c9up/nebula'

const docs = [
  { href: '/docs/installation', title: 'Installation', text: 'Add the package and its styles.' },
  { href: '/docs/components', title: 'Components', text: 'Every component, with its props.' },
]

NavigationMenuContent({
  class: 'w-96',
  children: () => html`<ul class="grid gap-2">${docs.map((doc) => html`<li>${NavigationMenuLink({
    href: doc.href,
    children: html`<div class="font-medium">${doc.title}</div><p class="text-muted-foreground line-clamp-2">${doc.text}</p>`,
  })}</li>`)}</ul>`,
})
```

### The page you are on

`active` takes an accessor, so the mark follows the route:

```ts
NavigationMenuLink({ href: '/pricing', active: () => path() === '/pricing', children: 'Pricing' })
```

An active link carries `aria-current="page"` and `data-active="true"`, which its classes style.

### A link that looks like a trigger

A plain link sitting in the bar between triggers should have their look. `triggerClasses` is the trigger's class list:

```ts
import { NavigationMenuItem, NavigationMenuLink, triggerClasses } from '@c9up/nebula'

NavigationMenuItem({ children: () => NavigationMenuLink({ href: '/docs', class: triggerClasses, children: 'Docs' }) })
```

### Viewport and indicator

The panel is portalled and placed against its trigger, 6 px below it. `NavigationMenuViewport` is therefore inert — an empty element, there only so a layout copied from elsewhere keeps its shape. `NavigationMenuIndicator` renders where you put it, with `data-state="visible"` while a panel is open and `"hidden"` otherwise.

## API

### NavigationMenu

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | Usually one `NavigationMenuList`. |
| `class` | `Reactive<string>` | — | Merged into the `<nav>`'s classes. |

### NavigationMenuList

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The items. |
| `class` | `Reactive<string>` | — | Merged into the `<ul>`'s classes. |

### NavigationMenuItem

An `<li>`. It claims a place in the bar whether or not it holds a panel: the trigger and the content find each other through it, and an item that is only a link never fills its panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | A `NavigationMenuTrigger` and a `NavigationMenuContent`, or a single `NavigationMenuLink`. |
| `class` | `Reactive<string>` | — | Merged into the `<li>`'s classes. |

### NavigationMenuTrigger

A `<button>`. A chevron after its content turns over while its panel is open.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | Merged into the button's classes. |

### NavigationMenuContent

Renders nothing where it is written: the menu shows it in the bar's panel when its trigger opens.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The panel's content: links, or anything else. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. |

### NavigationMenuLink

An `<a>`. Usable in the bar or in a panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | — | The destination. |
| `children` | `Slot` | — | The link's content. |
| `active` | `Reactive<boolean>` | — | The page the user is on. |
| `class` | `Reactive<string>` | — | Merged into the link's classes. |

### NavigationMenuViewport

Inert: an empty, absolutely placed `<div>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into its classes. |

### NavigationMenuIndicator

A small arrow, shown while a panel is open.

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into its classes. |

### triggerClasses

`triggerClasses: string` — the class list a `NavigationMenuTrigger` carries, for a link that should look like one.

## Accessibility

The bar is a `<nav>` holding a list of real links — no `menu` or `menuitem` role anywhere. A trigger is a `<button>` with `aria-expanded`, and `aria-controls` while its panel is open. An `active` link has `aria-current="page"`.

Opening a panel does not move focus. The panel is portalled to the end of the document, so in the tab order its links come after the rest of the page, not after their trigger. When the panel closes while focus is inside it, focus goes back to its trigger; a click elsewhere closes it and leaves focus where the click put it.

| Key | Action |
|---|---|
| <kbd>Enter</kbd>, <kbd>Space</kbd>, <kbd>ArrowDown</kbd> | On a trigger: open its panel at once, without the hover delay. |
| <kbd>Escape</kbd> | Close the panel. |
