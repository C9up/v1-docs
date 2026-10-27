# Marker

An inline annotation in a stream of content — "Yesterday", "3 unread", "Ada joined the conversation", "Context truncated". A line that is *about* the conversation rather than part of it, drawn as a label between two thin rules.

Its role depends on whether it says something. A bare rule between two days is structure, a `separator`; a label like "Context truncated" is information the reader needs, a `status`, and would be lost if it were announced as a mere boundary. The rules either side are `<span>`s with a background, not an `<hr>`: a horizontal rule cannot sit either side of a label without absolute positioning and a background matched to whatever is behind it, which breaks the moment the surface changes.

```sh
ream nebula:add marker
```

Atom · `atoms/Marker.ts` · no dependencies

## Usage

```ts
import { Marker } from '@c9up/nebula'

Marker({ label: 'Yesterday' })
```

## Examples

### A plain rule

```ts
Marker()
```

With no `label`, the marker is a full-width rule and a `separator`.

### Variants and an icon

```ts
import { CheckIcon, Marker } from '@c9up/nebula'

Marker({ label: '3 unread' })                                              // default
Marker({ variant: 'muted', label: 'Ada joined the conversation' })
Marker({ variant: 'destructive', label: 'Context truncated' })
Marker({ icon: CheckIcon(), label: 'Marked as resolved' })
```

An SVG passed as `icon` is sized to 14 px unless it carries its own `size-*` class.

### Without rules, aligned to the start

```ts
Marker({ label: 'Edited', rules: false, align: 'start' })
```

`rules: false` drops both lines and leaves the label alone; `align: 'start'` moves it to the inline start.

### Between turns

```ts
import { html } from '@c9up/aurora'
import { Marker, Message } from '@c9up/nebula'

html`
  ${Message({ author: 'Ada', children: 'See you tomorrow.' })}
  ${Marker({ label: 'Today' })}
  ${Message({ author: 'Ada', children: 'Morning!' })}
`
```

## API

### Marker

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `Child` | — | The annotation. Omit for a plain rule. |
| `icon` | `Child` | — | Drawn before the label. Only shown with a `label`. |
| `variant` | `Reactive<'default' \| 'muted' \| 'destructive'>` | `'default'` | The colour: muted text, fainter text, or the destructive colour. |
| `align` | `Reactive<'center' \| 'start'>` | `'center'` | Where the label sits. |
| `rules` | `boolean` | `true` | Draw a rule either side of the label. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

`label`, `icon` and `rules` are read once, at setup — a marker whose text changes is built again by the list it lives in.

### markerVariants

`markerVariants({ variant?, align?, class? }): string` — the class list a `Marker` carries.

## Accessibility

With a `label` the marker is `role="status"`; without one it is `role="separator"`. `status` is a polite live region, but one inserted with its text already inside is not announced by every screen reader. A marker that appears later — "Ada joined the conversation" — is announced reliably inside a [MessageScroller](/en/nebula/components/message-scroller), whose log announces what is added to it. The rules are `aria-hidden`. A marker is not interactive and handles no key.
