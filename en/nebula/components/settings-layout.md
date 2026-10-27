# SettingsLayout

A settings page: a title and a description, a list of sections, and the current section's panel. The list is a `<nav>` of links, not [Tabs](/en/nebula/components/tabs): settings sections are pages, each with its own URL, so a link to "Billing" opens Billing and the back button returns to the previous section instead of leaving settings altogether. Tabs would give the same look and none of that.

The list sits above the panel on narrow screens — scrolling sideways when it is long — and beside it from `md` up, which is the one responsive decision this layout makes.

```sh
ream nebula:add settings-layout
```

Template · `templates/SettingsLayout.ts` · no dependencies

## Usage

```ts
import { SettingsLayout } from '@c9up/nebula'

SettingsLayout({
  title: 'Settings',
  sections: [
    { label: 'Profile', href: '/settings/profile', active: true },
    { label: 'Billing', href: '/settings/billing' },
  ],
  children: profileForm,
})
```

## Examples

### The current section from the route

`sections` is read once, when the page renders — each section is its own page, so the page knows which one it is. Mark it from the path being served:

```ts
import { type SettingsSection, SettingsLayout } from '@c9up/nebula'

const sections: SettingsSection[] = [
  { label: 'Profile', href: '/settings/profile' },
  { label: 'Account', href: '/settings/account' },
  { label: 'Notifications', href: '/settings/notifications' },
]

SettingsLayout({
  title: 'Settings',
  description: 'Manage your account and your email preferences.',
  sections: sections.map((section) => ({ ...section, active: section.href === currentPath })),
  children: panel,
})
```

### Inside the app shell

The layout has its own padding (`p-4`, `p-10` from `md`); inside an [AppShell](/en/nebula/components/app-shell), turn the shell's off with `contentClass: 'p-0 md:p-0'` — the example is on the AppShell page.

## API

### SettingsLayout

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `Child` | — | Required. The page's heading. |
| `description` | `Child` | — | A muted line under the title. |
| `sections` | `readonly SettingsSection[]` | — | Required. The section links, in order. Read once. |
| `navLabel` | `string` | `'Settings sections'` | The section list's accessible name. |
| `children` | `Slot` | — | The current section's panel. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

### SettingsSection

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `Child` | — | The link's text. |
| `href` | `string` | — | The section's URL. |
| `active` | `boolean` | `false` | Marks the section being shown: highlighted, and `aria-current="page"`. |

## Accessibility

The title is the page's `<h1>`. The section list is a `<nav>` landmark named by `navLabel`, and the current section's link carries `aria-current="page"`, which a screen reader announces as "current page" — the highlight is drawn from that same attribute, so the two cannot disagree. The links are native: <kbd>Tab</kbd> walks them and <kbd>Enter</kbd> follows one; the layout handles no key itself.

The list's name is English by default; `navLabel` replaces it — see [languages](/en/nebula/languages).
