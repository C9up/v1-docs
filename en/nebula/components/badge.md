# Badge

A small status or count marker: four variants, one size, an icon slot sized to the text. The variants are exported as well as the component, for the same reason as [Button](/en/nebula/components/button)'s — a badge is often a link to the thing it counts, and an anchor needs the classes without the element.

```sh
ream nebula:add badge
```

Atom · `atoms/Badge.ts` · no dependencies

## Usage

```ts
import { Badge } from '@c9up/nebula'

Badge({ children: 'New' })
```

## Examples

### Variants

```ts
Badge({ children: 'Active' })                             // default
Badge({ variant: 'secondary', children: 'Draft' })
Badge({ variant: 'destructive', children: 'Overdue' })
Badge({ variant: 'outline', children: 'v2.4' })
```

### With an icon

An SVG inside the badge is sized to 12 px and does not catch the pointer.

```ts
import { html } from '@c9up/aurora'
import { CheckIcon } from '@c9up/nebula'

Badge({ variant: 'secondary', children: html`${CheckIcon()} Verified` })
```

### A count that follows a signal

`children` takes an accessor, and so does `variant`:

```ts
Badge({
  variant: () => (unread() > 0 ? 'default' : 'outline'),
  children: () => `${unread()} unread`,
})
```

### A badge that is a link

There is no `asChild`. Put the variants on the anchor yourself — the hover colour is written for an `<a>` and only applies to one:

```ts
import { html } from '@c9up/aurora'
import { badgeVariants } from '@c9up/nebula'

html`<a href="/inbox" class="${badgeVariants({ variant: 'secondary' })}">3 unread</a>`
```

## API

### Badge

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Text, an icon, or both. |
| `variant` | `Reactive<'default' \| 'secondary' \| 'destructive' \| 'outline'>` | `'default'` | The look. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### badgeVariants

`badgeVariants({ variant?, class? }): string` — the class list a `Badge` would carry, for an element that should look like one without being one. `BadgeVariants` is that argument without `class`: `{ variant? }`.

## Accessibility

A `<span>` with no role: it is read as the text it holds, where it stands. A colour says nothing to a screen reader, so the words carry the meaning — `"Overdue"`, not a red dot. A count is clearer with its noun (`"3 unread"`, not `"3"`). On an anchor made with `badgeVariants`, the focus ring is drawn on `:focus-visible`, and `aria-invalid` draws it in the destructive colour.
