# Card

A bordered surface holding one unit of content: a header with a title and a description, the content, a footer. Seven parts, all presentational — each is a `<div>` with a `data-slot` and a class list, no state and no context — so they nest as plain values, with no `() =>`.

`CardAction` is the part worth knowing. Placed in a `CardHeader`, it sits in the header's second column, opposite the title and aligned to its top, with no flex wrapper and no spacer: the header switches to two columns only when it holds an action.

```sh
ream nebula:add card
```

Molecule · `molecules/Card.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@c9up/nebula'

Card({
  children: html`
    ${CardHeader({ children: html`
      ${CardTitle({ children: 'Storage' })}
      ${CardDescription({ children: '12 GB of 50 GB used' })}
    ` })}
    ${CardContent({ children: 'Your files are synced on 3 devices.' })}
  `,
})
```

## Examples

### An action and a footer

```ts
import { Button, CardAction, CardFooter } from '@c9up/nebula'

Card({
  class: 'w-full max-w-sm',
  children: html`
    ${CardHeader({ children: html`
      ${CardTitle({ children: 'Deploy your project' })}
      ${CardDescription({ children: 'Ship the main branch to production.' })}
      ${CardAction({ children: Button({ variant: 'link', children: 'History' }) })}
    ` })}
    ${CardContent({ children: deployForm })}
    ${CardFooter({ class: 'justify-end gap-2', children: html`
      ${Button({ variant: 'outline', children: 'Cancel' })}
      ${Button({ children: 'Deploy', onClick: () => deploy() })}
    ` })}
  `,
})
```

The action spans both rows of the header, so a long description wraps under the title without running beneath the button.

### Ruled header and footer

A header given `border-b` pads itself below its rule, and a footer given `border-t` pads itself above it — the card's own spacing does not have to be undone:

```ts
Card({
  children: html`
    ${CardHeader({ class: 'border-b', children: CardTitle({ children: 'Team members' }) })}
    ${CardContent({ children: memberList })}
    ${CardFooter({ class: 'border-t', children: Button({ variant: 'outline', children: 'Invite' }) })}
  `,
})
```

### Following state

Every part's `children` is a `Slot`, so text that changes is an accessor:

```ts
CardDescription({ children: () => `${used()} GB of ${quota()} GB used` })
```

## API

Every part takes the same props, exported as `CardProps`.

### Card

The surface: border, rounded corners, a light shadow, and a 24 px gap between its parts.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The header, content and footer. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |
| `id` | `string` | — | The element's `id`. |

### CardHeader

A grid of title and description, with a second column when it holds a `CardAction`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | `CardTitle`, `CardDescription`, and an optional `CardAction`. |
| `class` | `Reactive<string>` | — | Merged last. `border-b` adds the padding under the rule. |
| `id` | `string` | — | The element's `id`. |

### CardTitle

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The title, in semibold. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### CardDescription

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A line under the title, small and muted. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### CardAction

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A button, a link or a menu trigger, placed opposite the title. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### CardContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The body, with the card's side padding. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### CardFooter

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A row of actions, centred vertically. |
| `class` | `Reactive<string>` | — | Merged last. `border-t` adds the padding over the rule. |
| `id` | `string` | — | The element's `id`. |

## Accessibility

A card is a set of `<div>`s with no role, and it handles no key. `CardTitle` is not a heading: where the page's outline needs one, put the heading inside it — ``CardTitle({ children: html`<h2>Storage</h2>` })`` — at the level the page calls for. An `id` on the title and `aria-labelledby` on a surrounding `<section>` make the card a named region when that helps.
