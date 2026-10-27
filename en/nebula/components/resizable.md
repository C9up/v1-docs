# Resizable

Two panes and a divider between them, dragged with the pointer or moved with the keyboard. The split is one number — the first pane's share, in percent — driving both panes through `flex-basis`: with one source of truth the two panes can never disagree about their sizes. The handle captures the pointer while it drags, so a fast drag that outruns the few-pixel divider keeps going instead of dropping.

Two panes, not any number: a deliberate difference from shadcn, whose resizable groups distribute sizes across any count of panels, persist them, and collapse a panel to zero. A third `ResizablePanel` in a group has no share of its own; nest a group inside a pane for three. Nothing is persisted either — `onResize` reports every new split, and you store it where you like.

The group fills its container (`h-full w-full`): give the container — or the group's `class` — a size.

```sh
ream nebula:add resizable
```

Molecule · `molecules/Resizable.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@c9up/nebula'

ResizablePanelGroup({
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: 'Sidebar' })}
    ${ResizableHandle({ withHandle: true })}
    ${ResizablePanel({ children: 'Content' })}
  `,
})
```

`children` is `Parts`: the panels and the handle register with the group, so they are built inside `() =>` — see [composition](/en/nebula/composition).

## Examples

### Vertical

```ts
ResizablePanelGroup({
  direction: 'vertical',
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: 'Query' })}
    ${ResizableHandle({})}
    ${ResizablePanel({ children: 'Results' })}
  `,
})
```

The arrow keys follow the axis: left and right on a horizontal group, up and down on a vertical one.

### Starting size and bounds

`defaultSize` is the first pane's share at first render; `minSize` and `maxSize` bound it, for the pointer and the keyboard alike. A `defaultSize` outside the bounds is clamped into them.

```ts
ResizablePanelGroup({
  defaultSize: 25,
  minSize: 15,
  maxSize: 40,
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: fileTree })}
    ${ResizableHandle({})}
    ${ResizablePanel({ children: editor })}
  `,
})
```

### Remembering the split

`onResize` receives each new percentage — on every pointer move of a drag and on every arrow, <kbd>Home</kbd> or <kbd>End</kbd> press. A cookie keeps it across pages and, once its name is in the `cookies` list Aurora's `renderPage` may read, lets the server render the same split the browser will:

```ts
import { cookieState, jsonCookie } from '@c9up/aurora'

const split = cookieState('editor-split', 30, jsonCookie(30))

ResizablePanelGroup({
  defaultSize: split(),
  onResize: split,
  class: 'h-96 rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: fileTree })}
    ${ResizableHandle({})}
    ${ResizablePanel({ children: editor })}
  `,
})
```

`defaultSize` is read once, at setup, so `split()` is read there on purpose: the group owns the size from then on.

### Three panes

A group nested in the second pane splits it again. Each handle moves the split of the group it belongs to:

```ts
ResizablePanelGroup({
  class: 'h-[32rem] rounded-lg border',
  children: () => html`
    ${ResizablePanel({ children: fileTree })}
    ${ResizableHandle({})}
    ${ResizablePanel({
      children: ResizablePanelGroup({
        direction: 'vertical',
        defaultSize: 70,
        children: () => html`
          ${ResizablePanel({ children: editor })}
          ${ResizableHandle({})}
          ${ResizablePanel({ children: terminal })}
        `,
      }),
    })}
  `,
})
```

## API

### ResizablePanelGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | Two `ResizablePanel`s with a `ResizableHandle` between them, built in `() =>`. |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Side by side, or one above the other. Read once. |
| `defaultSize` | `number` | `50` | The first pane's share at first render, in percent. Read once. |
| `minSize` | `number` | `10` | The smallest share the first pane can be given. |
| `maxSize` | `number` | `90` | The largest share the first pane can be given. |
| `onResize` | `(percent: number) => void` | — | Called with each new share, already clamped. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### ResizablePanel

The first panel in a group takes the share; the second takes the rest.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The pane's content. It is clipped (`overflow-hidden`): put a [ScrollArea](/en/nebula/components/scroll-area) inside for content that scrolls. |
| `class` | `Reactive<string>` | — | Merged last. |

### ResizableHandle

| Prop | Type | Default | Description |
|---|---|---|---|
| `withHandle` | `boolean` | `false` | Draws a grip on the divider. |
| `label` | `string` | `'Resize panes'` | The divider's accessible name. |
| `class` | `Reactive<string>` | — | Merged last. |

## Accessibility

The divider is `role="separator"` and takes focus (`tabindex="0"`), with `aria-valuenow` — the first pane's share, rounded — between `aria-valuemin` and `aria-valuemax`. Its `aria-orientation` is the divider's own: `vertical` in a horizontal group, where the line stands upright. The focus ring is drawn on `:focus-visible`. A divider that only answered the pointer would leave a keyboard user no way to resize at all.

| Key | Action |
|---|---|
| <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | In a horizontal group, moves the divider 5 points left or right. |
| <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> | In a vertical group, moves the divider 5 points up or down. |
| <kbd>Home</kbd> | Shrinks the first pane to `minSize`. |
| <kbd>End</kbd> | Grows the first pane to `maxSize`. |

The divider's name is English by default; `label` replaces it — see [languages](/en/nebula/languages).
