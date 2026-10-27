# Message

One turn in a conversation: an avatar, the author, a [Bubble](/en/nebula/components/bubble) with the content, its attachments, and a timestamp or a status underneath, laid out in reading order. `align: 'end'` marks the current user's own turn and mirrors the row with `flex-row-reverse`, so the avatar moves to the inline end and the whole row follows the writing direction — the same logical treatment as the bubble.

The timestamp is always a `<time datetime>`. The visible text is formatted for the reader and may be relative ("2 min ago"), which a machine cannot parse; `datetime` carries the ISO instant beside it, so a screen reader, a scraper and a copy keep the real value.

```sh
ream nebula:add message
```

Molecule · `molecules/Message.ts` · [Avatar](/en/nebula/components/avatar), [Bubble](/en/nebula/components/bubble)

## Usage

```ts
import { Message } from '@c9up/nebula'

Message({
  author: 'Ada Lovelace',
  avatarFallback: 'AL',
  timestamp: '2026-10-27T09:14:00Z',
  children: 'The report is ready for review.',
})
```

## Examples

### Your own turn

```ts
Message({
  align: 'end',
  variant: 'accent',
  timestamp: new Date(),
  children: 'Thanks, reading it now.',
})
```

Your own turn usually has no author and no avatar: each is drawn only when given. `align` is read once, at setup — a message does not change sides.

### A picture, or initials

```ts
Message({
  author: 'Ada Lovelace',
  avatarSrc: '/avatars/ada.jpg',
  avatarFallback: 'AL',
  children: 'Morning!',
})
```

The initials show while there is no picture and if the picture fails to load — not while it is still loading, so a slow image does not flicker from initials to photo. When `author` is a string, it is also the picture's `alt`.

### Sending, failed

`status` takes the timestamp's place under the bubble while a turn is in flight. It is read at setup, so a turn that goes from sending to sent is rebuilt by the list it lives in:

```ts
import { signal } from '@c9up/aurora'
import { Message } from '@c9up/nebula'

interface Outgoing { text: string; sentAt?: string; failed?: boolean }

const outbox = signal<readonly Outgoing[]>([])

const turns = () =>
  outbox().map((turn) =>
    Message({
      align: 'end',
      variant: 'accent',
      status: turn.failed === true ? 'Not sent' : turn.sentAt === undefined ? 'Sending…' : undefined,
      timestamp: turn.sentAt,
      children: turn.text,
    }),
  )
```

Hand `turns` to a [MessageScroller](/en/nebula/components/message-scroller) as its `children`.

### How the time reads

By default the time is a short local time (`Intl.DateTimeFormat` with `timeStyle: 'short'`). `formatTime` replaces it:

```ts
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

Message({
  author: 'Ada',
  timestamp: sentAt,
  formatTime: (date) => relative.format(Math.round((date.getTime() - Date.now()) / 60_000), 'minute'),
  children: 'Pushed the fix.',
})
```

A `timestamp` string that is not a date shows no time at all rather than "Invalid Date".

### Attachments and reactions

```ts
import { Attachment, Message } from '@c9up/nebula'

Message({
  author: 'Ada',
  children: 'Here are the figures.',
  attachments: Attachment({ name: 'q3-figures.xlsx', size: 48_213, href: '/files/q3-figures.xlsx' }),
  reactions: [{ emoji: '👍', count: 2, active: true, onToggle: () => toggleReaction('👍') }],
})
```

`reactions` and `variant` go to the bubble as they are — see [Bubble](/en/nebula/components/bubble#reactions).

## API

### Message

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The turn's content, rendered inside a `Bubble`. |
| `author` | `Child` | — | The name above the bubble. A string is also the avatar's `alt`. |
| `avatarSrc` | `string` | — | The author's picture. |
| `avatarFallback` | `Child` | — | Initials, when there is no picture or it fails to load. The avatar is drawn when this or `avatarSrc` is given. |
| `timestamp` | `Date \| string` | — | A `Date` or an ISO string, rendered as `<time datetime>`. |
| `formatTime` | `(date: Date) => string` | short local time | How the timestamp reads. |
| `align` | `Reactive<'start' \| 'end'>` | `'start'` | `'end'` for the current user's own turn. The row is mirrored only for the constant `'end'`. |
| `variant` | `Reactive<'default' \| 'accent' \| 'outline' \| 'ghost'>` | `'default'` | The bubble's look. |
| `reactions` | `readonly BubbleReaction[]` | — | Passed to the bubble. |
| `attachments` | `Slot` | — | [Attachments](/en/nebula/components/attachment), under the bubble. |
| `status` | `Child` | — | Shown under the bubble in place of the timestamp — "Sending…", "Failed". |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |

## Accessibility

The row is `role="article"`, which groups its parts: a screen reader meets one turn rather than a loose picture, a name, a time and a paragraph as four unrelated things. The article has no accessible name of its own; the author is read as its first text. The time is a `<time>` whose `datetime` holds the ISO instant whatever the visible text says. The avatar picture takes `author` as its `alt` when it is a string, and an empty `alt` otherwise.

The message handles no key of its own; reaction buttons are native buttons — see [Bubble](/en/nebula/components/bubble#accessibility). A message never passes `collapsible` to its bubble, so it has no "Show more" toggle. The default time format follows the browser's locale; `formatTime` replaces it — see [languages](/en/nebula/languages).
