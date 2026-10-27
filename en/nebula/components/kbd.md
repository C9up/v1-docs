# Kbd

A keyboard key, rendered inline, drawn as a small key cap. It is an atom of its own because shortcut hints turn up everywhere — tooltips, empty states, help text. Inside a [Command](/en/nebula/components/command) or a menu, the right-aligned hint at the end of an item is that component's own `…Shortcut` part; `Kbd` is for the rest.

```sh
ream nebula:add kbd
```

Atom · `atoms/Kbd.ts` · no dependencies

## Usage

```ts
import { Kbd } from '@c9up/nebula'

Kbd({ children: 'Esc' })
```

## Examples

### A combination

One `Kbd` per key, so each reads as its own cap:

```ts
import { html } from '@c9up/aurora'
import { Kbd } from '@c9up/nebula'

html`Press ${Kbd({ children: '⌘' })} ${Kbd({ children: 'K' })} to search.`
```

### In a tooltip

The trigger wraps a real control, so a keyboard user reaches the hint too:

```ts
import { html } from '@c9up/aurora'
import { Button, Kbd, Tooltip, TooltipContent, TooltipTrigger } from '@c9up/nebula'

Tooltip({
  children: () => html`
    ${TooltipTrigger({ children: Button({ children: 'Save' }) })}
    ${TooltipContent({ children: html`Save ${Kbd({ children: 'Ctrl' })} ${Kbd({ children: 'S' })}` })}
  `,
})
```

### With an icon

```ts
import { html } from '@c9up/aurora'
import { ArrowRightIcon, Kbd } from '@c9up/nebula'

Kbd({ children: html`${ArrowRightIcon({ class: 'size-3' })}` })
```

## API

### Kbd

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The key's name or symbol. |
| `class` | `Reactive<string>` | — | Merged into the key's classes. |

## Accessibility

A native `<kbd>`, read as the text it holds. A symbol such as `⌘` is read by its name, if at all, and differently from one screen reader to the next; where the shortcut matters, the sentence around it can name the key in words. The key does not catch the pointer and cannot be selected, so a click or a drag on it goes to what lies beneath.
