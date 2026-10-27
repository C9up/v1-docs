# MessageScroller

A conversation that stays pinned to its newest message. The whole component is one rule and its exception: **follow the bottom, but never yank the reader.** A log that always scrolls to the end is unusable the moment you scroll up to re-read something and a new message arrives; one that never scrolls is unusable in the ordinary case. So the scroller remembers whether the reader was at the bottom when the content grew: if they were, it follows; if they had scrolled away, it holds their place and shows a "Jump to latest" button.

Growth is watched with a `ResizeObserver` on the content, not by counting children. An image finishing its load, a code block wrapping, a reply streamed token by token — none of them adds a child, and all of them move the bottom. "At the bottom" allows 24 px of slack, because a scroll position is fractional on a scaled display and an exact comparison would decide the reader had left when they had not.

```sh
ream nebula:add message-scroller
```

Organism · `organisms/MessageScroller.ts` · [Button](/en/nebula/components/button)

## Usage

```ts
import { Message, MessageScroller } from '@c9up/nebula'

MessageScroller({
  label: 'Support chat',
  class: 'h-96',
  children: () => messages().map((m) => Message({ author: m.author, timestamp: m.sentAt, children: m.text })),
})
```

The scroller fills the height its parent gives it and scrolls inside it: give it a height (`h-96`), or put it in a flex column that bounds it.

## Examples

### A list that grows

`children` is a [Slot](/en/nebula/composition#reactive-props): an accessor re-renders the list whenever the signal it reads changes, and the scroller follows if the reader was at the bottom.

```ts
import { signal } from '@c9up/aurora'
import { Message, MessageScroller } from '@c9up/nebula'

interface Turn { id: string; author: string; mine: boolean; text: string; sentAt: string }

const turns = signal<readonly Turn[]>([])

MessageScroller({
  label: 'Conversation with Ada',
  class: 'h-[60vh]',
  children: () =>
    turns().map((turn) =>
      Message({
        author: turn.mine ? undefined : turn.author,
        align: turn.mine ? 'end' : 'start',
        variant: turn.mine ? 'accent' : 'default',
        timestamp: turn.sentAt,
        children: turn.text,
      }),
    ),
})

socket.on('message', (turn: Turn) => turns([...turns(), turn]))
```

### A streamed reply

A reply that grows in place moves the bottom without adding a node, and the observer catches it all the same. The growing text is an accessor inside the message:

```ts
import { signal } from '@c9up/aurora'
import { Message, MessageScroller } from '@c9up/nebula'

const reply = signal('')

MessageScroller({
  class: 'h-96',
  children: Message({ author: 'Assistant', children: () => reply() }),
})

for await (const token of stream) reply(reply() + token)
```

### Days and notices between turns

A [Marker](/en/nebula/components/marker) is the line that is *about* the conversation rather than part of it:

```ts
import { html } from '@c9up/aurora'
import { Marker, Message, MessageScroller } from '@c9up/nebula'

MessageScroller({
  class: 'h-96',
  children: html`
    ${Marker({ label: 'Yesterday' })}
    ${Message({ author: 'Ada', children: 'Can you send the report?' })}
    ${Marker({ label: 'Today' })}
    ${Message({ align: 'end', variant: 'accent', children: 'Here it is.' })}
  `,
})
```

### Replacing the built-in texts

The log's name and the button's text are built in English. Pass your own for another language, or for words that fit the product:

```ts
MessageScroller({
  label: 'Support conversation',
  jumpLabel: 'Back to the latest message',
  class: 'h-96',
  children: () => messages().map((m) => Message({ author: m.author, children: m.text })),
})
```

## API

### MessageScroller

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The turns. An accessor for a list that changes. |
| `label` | `string` | `'Conversation'` | The log's accessible name. |
| `jumpLabel` | `string` | `'Jump to latest'` | The text of the catch-up button. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. Where the height goes. |

## Accessibility

The scrolling viewport is `role="log"` with `aria-live="polite"`: new turns are announced as they arrive, without interrupting what is being read. It is named by `label` and is focusable (`tabindex="0"`), so a keyboard user can scroll it with the browser's own keys — arrows, <kbd>Page Up</kbd>, <kbd>Page Down</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>. The scroller handles no key of its own.

The catch-up button is a native `<button>`, `hidden` — out of the page and the tab order — while the reader is at the bottom. Clicking it scrolls smoothly to the newest message.

Both texts are built in: `label` replaces `"Conversation"` and `jumpLabel` replaces `"Jump to latest"` — see [languages](/en/nebula/languages).
