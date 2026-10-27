# Tabs

Several panels in one place, one shown at a time, chosen from a row of tabs.

A trigger and its panel find each other through the `value` they share: the ids are minted once per value by the context, so neither part has to know the other exists, and they can be built in any order. Selection follows focus — arrowing to a tab shows its panel — which is the right default when panels are already rendered and switching costs nothing; `activateOnFocus: false` is there for panels that fetch on display, where arrowing past three tabs would fire three requests.

Hidden panels stay mounted, so a half-filled form or a scroll position inside one survives a trip to another tab. They carry `hidden`, which keeps them out of the layout and the accessibility tree without removing them from the DOM.

```sh
ream nebula:add tabs
```

Molecule · `molecules/Tabs.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@c9up/nebula'

Tabs({
  defaultValue: 'account',
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'account', children: 'Account' })}
      ${TabsTrigger({ value: 'password', children: 'Password' })}
    ` })}
    ${TabsContent({ value: 'account', children: 'Your profile.' })}
    ${TabsContent({ value: 'password', children: 'Change your password.' })}
  `,
})
```

`Tabs` takes its children as `() =>`, because its parts read its context — see [composition](/en/nebula/composition). `TabsList` provides nothing, so its children can be a plain value: they are built inside the `Tabs` thunk anyway.

## Examples

### From data

`sections` is a signal, so the triggers and the panels are each built in an accessor: the `Tabs` thunk runs once, and a list read directly in it would never change again.

```ts
Tabs({
  children: () => html`
    ${TabsList({
      children: () =>
        sections().map((section) =>
          TabsTrigger({ value: section.id, children: section.title, disabled: section.locked }),
        ),
    })}
    ${() => sections().map((section) => TabsContent({ value: section.id, children: section.body }))}
  `,
})
```

With no `defaultValue`, the first **enabled** trigger built is selected: a disabled tab selected by default would show a panel that nothing can navigate back to.

### Controlled

Pass `value` and the app owns the selection. A signal can be both the value and the change handler, and then anything in the page can switch tabs:

```ts
import { signal } from '@c9up/aurora'
import { Button } from '@c9up/nebula'

const tab = signal('overview')

Tabs({
  value: tab,
  onValueChange: tab,
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'overview', children: 'Overview' })}
      ${TabsTrigger({ value: 'activity', children: 'Activity' })}
    ` })}
    ${TabsContent({ value: 'overview', children: 'Twelve open issues.' })}
    ${TabsContent({ value: 'activity', children: 'Three commits today.' })}
  `,
})

Button({ variant: 'link', children: 'See the activity', onClick: () => tab('activity') })
```

`value` wins whenever it reads as a string. `onValueChange` is called only when the selection actually changes — clicking the tab already selected says nothing.

### Underlined tabs

`variant: 'line'` on the list drops the filled surface for a rule under the active tab:

```ts
Tabs({
  defaultValue: 'code',
  children: () => html`
    ${TabsList({ variant: 'line', children: html`
      ${TabsTrigger({ value: 'code', children: 'Code' })}
      ${TabsTrigger({ value: 'issues', children: 'Issues' })}
    ` })}
    ${TabsContent({ value: 'code', children: 'src/, tests/, README.md' })}
    ${TabsContent({ value: 'issues', children: 'No open issues.' })}
  `,
})
```

### Vertical

```ts
Tabs({
  orientation: 'vertical',
  defaultValue: 'general',
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'general', children: 'General' })}
      ${TabsTrigger({ value: 'members', children: 'Members' })}
      ${TabsTrigger({ value: 'danger', children: 'Danger zone' })}
    ` })}
    ${TabsContent({ value: 'general', children: 'Name and avatar.' })}
    ${TabsContent({ value: 'members', children: 'Four members.' })}
    ${TabsContent({ value: 'danger', children: 'Delete the project.' })}
  `,
})
```

The list stacks beside the panels, and the arrows that move between tabs become <kbd>ArrowUp</kbd> and <kbd>ArrowDown</kbd>.

### Panels that load on display

```ts
Tabs({
  activateOnFocus: false,
  defaultValue: 'sales',
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'sales', children: 'Sales' })}
      ${TabsTrigger({ value: 'refunds', children: 'Refunds' })}
    ` })}
    ${TabsContent({ value: 'sales', children: ReportPanel({ kind: 'sales' }) })}
    ${TabsContent({ value: 'refunds', children: ReportPanel({ kind: 'refunds' }) })}
  `,
})
```

The arrows now only move focus; <kbd>Enter</kbd>, <kbd>Space</kbd> or a click selects. `ReportPanel` stands for your own component.

## API

### Tabs

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | the first enabled trigger | Selected at first render when uncontrolled. |
| `value` | `Reactive<string \| undefined>` | — | Controlled selection. When it reads as a string, it wins over the internal one. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | The list's direction, and which arrows move between tabs. Read once, at setup. |
| `activateOnFocus` | `boolean` | `true` | Selecting follows focus. `false` waits for <kbd>Enter</kbd>, <kbd>Space</kbd> or a click. |
| `onValueChange` | `(value: string) => void` | — | Called when the selection changes. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |
| `children` | `Parts` | — | The list and the panels, built in `() =>`. |

### TabsList

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'default' \| 'line'` | `'default'` | `default` gives the active tab a surface; `line` underlines it. Read once, at setup. |
| `children` | `Slot` | — | The `TabsTrigger`s. |
| `class` | `Reactive<string>` | — | Merged last into the list's classes. |

### TabsTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | The panel it shows. |
| `children` | `Slot` | — | The tab's label. An SVG inside is sized to 16 px. |
| `disabled` | `boolean` | `false` | Disables the tab; the arrows skip it. |
| `class` | `Reactive<string>` | — | Merged into the button's classes. |

### TabsContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | The tab that shows it. |
| `children` | `Slot` | — | The panel's content. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. |

### tabsListVariants

`tabsListVariants({ variant?, class? }): string` — the classes a `TabsList` carries, for a list you render yourself.

## Accessibility

The WAI-ARIA tabs pattern: the list is `role="tablist"` with `aria-orientation`; each trigger is `role="tab"` with `aria-selected` and `aria-controls` pointing at its panel; each panel is `role="tabpanel"` with `aria-labelledby` pointing back at its tab, and `tabindex="0"` so <kbd>Tab</kbd> from the list reaches the panel even when it holds nothing focusable. `data-state="active"` or `"inactive"` is set on each tab for styling.

The list is one tab stop:

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Enters the list on the tab last reached with the arrows — the first enabled one to begin with, even when another is selected — then moves on to the panel. |
| <kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd> | Next / previous tab, when horizontal. Mirrored in a right-to-left page. Selects it unless `activateOnFocus: false`. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Next / previous tab, when vertical. Selects it unless `activateOnFocus: false`. |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last tab. Selects it unless `activateOnFocus: false`. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Selects the focused tab. |

The arrows wrap from the last tab to the first and back, and skip disabled tabs. The direction is read from the page's computed style — see [right to left](/en/nebula/languages#right-to-left).
