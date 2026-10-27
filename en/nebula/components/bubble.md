# Bubble

Conversational content in a speech bubble — the body of a [Message](/en/nebula/components/message), or a bubble on its own where a whole message would be too much.

Alignment is **logical**: `align: 'end'` pushes the bubble with `ms-auto`, so the same outgoing message sits on the right in English and on the left in Arabic without the caller knowing which. Long content can be clamped behind a "Show more" toggle; the clamp is `line-clamp`, which cuts at a line boundary and adds the ellipsis itself, where a max-height would slice through the middle of a line. Reactions are a list of toggle buttons with `aria-pressed`, not decorative spans: a reaction the user can add is a control.

```sh
ream nebula:add bubble
```

Molecule · `molecules/Bubble.ts` · no dependencies

## Usage

```ts
import { Bubble } from '@c9up/nebula'

Bubble({ children: 'Are we still on for Thursday?' })
```

## Examples

### Variants and sides

```ts
Bubble({ children: 'Their message' })                                   // default, start
Bubble({ variant: 'accent', align: 'end', children: 'Your message' })
Bubble({ variant: 'outline', children: 'A quoted message' })
Bubble({ variant: 'ghost', children: 'Plain text, no bubble' })
```

`ghost` drops the background and the inline padding: the text lines up with whatever sits above it, the way an assistant's long answer reads in a chat.

### Long content

```ts
Bubble({
  collapsible: true,
  collapsedLines: 4,
  children: longReply,
})
```

The bubble shows `collapsedLines` lines (6 by default) and a "Show more" toggle under them; once expanded the toggle reads "Show less". The labels are props:

```ts
Bubble({
  collapsible: true,
  expandLabel: 'Read more',
  collapseLabel: 'Read less',
  children: longReply,
})
```

The clamp class is built at runtime — `line-clamp-[${collapsedLines}]` — so Tailwind's scanner never sees it in the source. Write the class you use once in a file your build scans (`line-clamp-[6]` for the default), or the content is not clamped at all.

### Reactions

```ts
Bubble({
  children: 'Deployed to production.',
  reactions: [
    { emoji: '🎉', count: 3, active: true, onToggle: () => toggle('🎉') },
    { emoji: '👀', count: 1, onToggle: () => toggle('👀') },
  ],
})
```

`reactions` is read at setup: a reaction's `active` and `count` are drawn once. To follow them, build the bubble inside an accessor so it is drawn again when they change:

```ts
import { html } from '@c9up/aurora'

html`${() => Bubble({ children: 'Deployed to production.', reactions: reactionsFor(messageId) })}`
```

That redraws the whole bubble, collapse state included.

### Following state

`variant`, `align` and `class` take accessors:

```ts
Bubble({
  variant: () => (selected() ? 'outline' : 'default'),
  children: 'Pick me',
})
```

## API

### Bubble

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. |
| `variant` | `Reactive<'default' \| 'accent' \| 'outline' \| 'ghost'>` | `'default'` | The look. `accent` is the primary colour, for your own messages. |
| `align` | `Reactive<'start' \| 'end'>` | `'start'` | The side, in the writing direction. |
| `reactions` | `readonly BubbleReaction[]` | — | Toggle buttons under the content. Read at setup. |
| `collapsible` | `boolean` | `false` | Clamp long content behind a toggle. |
| `collapsedLines` | `number` | `6` | Lines shown while collapsed. |
| `expandLabel` | `string` | `'Show more'` | The toggle's text while collapsed. |
| `collapseLabel` | `string` | `'Show less'` | The toggle's text while expanded. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### BubbleReaction

| Prop | Type | Default | Description |
|---|---|---|---|
| `emoji` | `string` | — | The reaction. |
| `count` | `number` | — | How many people reacted. Hidden when absent. |
| `active` | `boolean` | `false` | The current user has reacted with this one. Sets `aria-pressed`. |
| `onToggle` | `() => void` | — | Called on click. |

### bubbleVariants

`bubbleVariants({ variant?, align?, class? }): string` — the class list a `Bubble` carries, for a bubble-shaped element of your own.

## Accessibility

The collapse toggle is a native `<button>` with `aria-expanded`. Each reaction is a `<button>` in a `<ul>`, with `aria-pressed` saying whether the current user has reacted, and an `aria-label` of the emoji and the count — `"🎉, 3"` — in place of its visible content. All of them are activated by <kbd>Enter</kbd> and <kbd>Space</kbd>; the bubble handles no key of its own.

The toggle's texts are built in: `expandLabel` replaces `"Show more"` and `collapseLabel` replaces `"Show less"` — see [languages](/en/nebula/languages).
