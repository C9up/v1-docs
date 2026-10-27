# HoverCard

A preview that appears when the pointer rests on a link — a profile behind an `@mention`, a page behind a URL. It takes longer than a [Tooltip](/en/nebula/components/tooltip) in both directions, for different reasons: it opens after 700 ms because a card covers content and should appear only on a deliberate rest, and it closes 300 ms after the pointer leaves because the card is meant to be entered — it holds links, and the pointer has to cross the gap to reach them.

It is `role="dialog"`, not `role="tooltip"`: a tooltip is a label and must contain nothing interactive, a hover card is a small window that may. Like a [Popover](/en/nebula/components/popover), it is portalled to `<body>`, flips when there is no room and follows its trigger on scroll.

```sh
ream nebula:add hover-card
```

Organism · `organisms/HoverCard.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@c9up/nebula'

HoverCard({
  children: () => html`
    ${HoverCardTrigger({ href: '/people/ada', children: '@ada' })}
    ${HoverCardContent({ children: 'Ada Lovelace — wrote the first published program.' })}
  `,
})
```

## Examples

### A profile card

The card holds whatever a preview needs, links included — the pointer can travel into it and it stays open:

```ts
HoverCard({
  children: () => html`
    ${HoverCardTrigger({ href: `/people/${user.handle}`, class: 'font-medium underline', children: `@${user.handle}` })}
    ${HoverCardContent({
      children: html`
        <div class="grid gap-1">
          <p class="font-semibold">${user.name}</p>
          <p class="text-muted-foreground text-sm">${user.bio}</p>
          <a class="text-sm underline" href="${`/people/${user.handle}/posts`}">Posts</a>
        </div>
      `,
    })}
  `,
})
```

`HoverCardContent` reads its `children` once, when the card is set up. Text that changes goes in an accessor inside the template — `` html`${() => profile().name}` `` — not around it.

### Without a link

With no `href`, the trigger is an inline `<span>` around its children. Put the card on something focusable if keyboard users should get it too, since focus opens it only from inside the trigger:

```ts
import { Button } from '@c9up/nebula'

HoverCard({
  children: () => html`
    ${HoverCardTrigger({ children: Button({ variant: 'link', children: 'Release notes' }) })}
    ${HoverCardContent({ side: 'top', children: 'Version 2.4 — faster search, dark mode.' })}
  `,
})
```

### Timing

```ts
HoverCard({
  openDelay: 300,
  closeDelay: 100,
  children: () => html`
    ${HoverCardTrigger({ href: '/docs', children: 'Docs' })}
    ${HoverCardContent({ children: 'Guides and reference.' })}
  `,
})
```

### Opened by the app

`open` makes it controlled — to show a card during a guided tour, say. While `open` reads as a boolean it decides; the hover only asks, through `onOpenChange`:

```ts
import { signal } from '@c9up/aurora'

const showing = signal(false)

HoverCard({
  open: showing,
  onOpenChange: showing,
  children: () => html`
    ${HoverCardTrigger({ href: '/billing', children: 'Billing' })}
    ${HoverCardContent({ children: 'Invoices moved here.' })}
  `,
})
```

## API

### HoverCard

The state its trigger and its content read. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `openDelay` | `number` | `700` | How long the pointer rests on the trigger before the card opens, in ms. |
| `closeDelay` | `number` | `300` | How long after the pointer leaves the trigger or the card before it closes, in ms. |
| `children` | `Parts` | — | The trigger and the content, in a `() =>`. |

### HoverCardTrigger

What the pointer rests on: an `<a>` when given an `href`, an inline-flex `<span>` otherwise.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The link's or the span's content. |
| `href` | `string` | — | Makes the trigger a link. |
| `class` | `Reactive<string>` | — | The element's classes. |

### HoverCardContent

The card, 256 px wide. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The card's content. Read once, at setup. |
| `side` | `Side` | `'bottom'` | `'top' \| 'right' \| 'bottom' \| 'left'`. Flips when there is no room. |
| `align` | `Align` | `'center'` | `'start' \| 'center' \| 'end'` along that side. |
| `sideOffset` | `number` | `8` | The gap between the trigger and the card, in px. |
| `class` | `Reactive<string>` | — | Merged into the card's classes. Read each time the card opens. |

## Accessibility

The card is `role="dialog"`, named by its trigger (`aria-labelledby`); the trigger carries `data-state`. Focus entering the trigger schedules the card the way the pointer does — after `openDelay` — and focus leaving it schedules the close. The card does not take focus, and it is portalled to the end of the page, so <kbd>Tab</kbd> from the trigger does not reach it: a hover card is a preview, and what it links to must be reachable another way.

| Key | Action |
|---|---|
| <kbd>Escape</kbd> | Closes the card. |
