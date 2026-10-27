# Item

One row in a list of things: a leading media slot, a title and a description, trailing actions. Settings rows, search results, members of a team and files in an upload list are all this shape, and building each by hand is how one product ends up with four different vertical rhythms.

`ItemContent` is `min-w-0`, so it shrinks to the room left: a long title wraps and a description clamps to two lines, instead of pushing the actions off the row — the most common bug in a flex row built by hand. Every part but `Item` is a plain styled `<div>`, so they nest as values, with no `() =>`.

```sh
ream nebula:add item
```

Molecule · `molecules/Item.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Button, Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@c9up/nebula'

Item({
  variant: 'outline',
  children: html`
    ${ItemContent({ children: html`
      ${ItemTitle({ children: 'Two-factor authentication' })}
      ${ItemDescription({ children: 'Ask for a code from your phone at every sign-in.' })}
    ` })}
    ${ItemActions({ children: Button({ variant: 'outline', size: 'sm', children: 'Enable' }) })}
  `,
})
```

## Examples

### Variants and sizes

```ts
Item({ children: 'No border, no background' })              // default
Item({ variant: 'outline', children: 'A border of its own' })
Item({ variant: 'muted', children: 'A tinted background' })
Item({ size: 'sm', children: 'Tighter padding and gap' })
```

### Media

`ItemMedia` holds an icon — sized to 16 px unless it carries its own `size-*` class — an avatar or a thumbnail, and never shrinks:

```ts
import { Avatar, AvatarFallback, AvatarImage, ItemMedia, SearchIcon } from '@c9up/nebula'

Item({
  variant: 'outline',
  size: 'sm',
  children: html`
    ${ItemMedia({ children: SearchIcon() })}
    ${ItemContent({ children: ItemTitle({ children: 'Saved search: open invoices' }) })}
  `,
})

Item({
  children: html`
    ${ItemMedia({ children: Avatar({ children: () => html`
      ${AvatarImage({ src: user.avatarUrl, alt: user.name })}
      ${AvatarFallback({ children: user.initials })}
    ` }) })}
    ${ItemContent({ children: html`
      ${ItemTitle({ children: user.name })}
      ${ItemDescription({ children: user.email })}
    ` })}
  `,
})
```

The [Avatar](/en/nebula/components/avatar) takes its parts in a thunk because it provides context; the Item parts around it do not.

### A list that follows a signal

`ItemGroup` stacks rows; `ItemSeparator` draws the rule between two of them. Its `children` is an accessor, so the list follows `people`:

```ts
import { ItemGroup, ItemSeparator } from '@c9up/nebula'

ItemGroup({
  children: () => people().map((person, index) => html`
    ${index > 0 ? ItemSeparator() : null}
    ${Item({ children: html`
      ${ItemContent({ children: html`
        ${ItemTitle({ children: person.name })}
        ${ItemDescription({ children: person.role })}
      ` })}
      ${ItemActions({ children: Button({ variant: 'ghost', size: 'sm', children: 'Remove', onClick: () => remove(person.id) }) })}
    ` })}
  `),
})
```

### A row that is a link

`Item` always renders a `<div>`. For a row that navigates, put `itemVariants` on an `<a>` yourself — the variants already carry a hover background and a focus ring for exactly that case:

```ts
import { ChevronRightIcon, itemVariants } from '@c9up/nebula'

html`<a href="/settings/billing" class="${itemVariants({ variant: 'outline', size: 'sm' })}">
  ${ItemContent({ children: ItemTitle({ children: 'Billing' }) })}
  ${ItemActions({ children: ChevronRightIcon() })}
</a>`
```

## API

### Item

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The parts: media, content, actions. |
| `variant` | `Reactive<ItemVariants['variant']>` | `'default'` | `'default'` (transparent), `'outline'` (bordered) or `'muted'` (tinted). |
| `size` | `Reactive<ItemVariants['size']>` | `'default'` | `'default'` or `'sm'`, which tightens padding and gap. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### ItemGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The rows, stacked in a column. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### ItemMedia

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | An icon, an avatar or an image, at the start of the row. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### ItemContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The title and description. Takes the free width; a second `ItemContent` in the same row keeps its own size. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### ItemTitle

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's name, in medium weight; an icon or a badge can sit beside it. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### ItemDescription

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A muted line under the title, clamped to two lines. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### ItemActions

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Buttons or an icon, at the end of the row. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### ItemSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Leave it empty: the separator is a 1 px rule, and content would spill out of it. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### itemVariants

`itemVariants({ variant?, size?, class? }): string` — the class list an `Item` would carry, for a row that has to be another element, such as a link. `ItemVariants` is the type of its options.

## Accessibility

An item is a `<div>` with no role, and it handles no key. The focus ring on `:focus-visible` shows only on a row that can take focus — the link form above. `ItemGroup` is not announced as a list and `ItemSeparator` is a drawn line, not a [Separator](/en/nebula/components/separator): for a screen reader to hear "list, 12 items", render the rows inside a `<ul>` with one `<li>` each.
