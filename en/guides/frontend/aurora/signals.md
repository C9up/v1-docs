# Signals

This guide covers signals, effects and memos:

- What runs again, and when
- Counting re-renders — `countRerenders`
- Lists — `each`
- Component lifecycle
- Ids that survive hydration — `uid`, `resetIds`, `byId`
- Context — `createContext`, `provide`, `inject`
- Motion values — `MotionValue`, `motion`, `scroll-y`

## Signals — `signal`, `effect`, `memo`

```ts
import { signal, effect, memo } from '@c9up/aurora'

const count = signal(0)

// Read
console.log(count())        // 0

// Write
count(1)
count((prev) => prev + 1)   // 2

// React
effect(() => {
  console.log('count is now', count())
})

// Derive
const doubled = memo(() => count() * 2)
```

`signal()` returns a function. Call it with no args to read, with one arg to write. Signals are tracked automatically inside `effect()` and `memo()` callbacks.

### What runs again, and when

Nothing re-runs unless something it read changed, and then it runs once:

- A write marks what read the signal and runs each marked effect once, after the write. An effect that reads a signal and a `memo` of it runs once per write, never with the memo's old value. Writes inside `batch(() => …)`, or inside a running effect, are applied together when it returns.
- A `memo` recomputes when it is read after a change. If it returns an equal value (`Object.is`), nothing that reads it runs. A memo that builds a new array or object each time takes `equals` to stay quiet when the content did not change: `memo(() => rows().filter(isOpen), { equals: sameIds })`.
- An effect or memo created inside an effect, an accessor or an `onMount` ends when that run is replaced or the component unmounts. A root from `render()` or `hydrate()` ends only through its disposer.
- A slot leaves its nodes alone when its accessor returns what it already shows: the same text, nothing again, or a template from the same `html` call with the same values. A scalar that changed updates its text node in place. Attributes and boolean attributes are written only when their value differs from the element's. A `.prop` is written only when the bound value differs from the last one written, so a field the user typed in keeps its text when something unrelated re-runs the binding.

What still rebuilds is what changed: an accessor that returns a template whose values differ, or a component (its setup runs again). Read the part that changes in an accessor of its own inside a stable template, and use `each` for lists. A plain helper function called from an accessor is tracked by it like any other read. Only a `component()` setup runs untracked.

### Counting re-renders — `countRerenders`

During development, switch the counter on to see what re-runs:

```ts
import { countRerenders } from '@c9up/aurora'

if (import.meta.env.DEV) {
  const rerenders = countRerenders({ highlight: true })
  // later, in the console:
  rerenders.counts()   // { effect, memo, slot, list, attribute, property, setup }
  rerenders.top(5)     // the elements re-rendered most, with their count
  rerenders.setups(5)  // the component setups that ran most, by function name
}
```

`highlight` outlines each element as it re-renders. `log` prints every re-run with `console.debug`. `onRerender(event)` receives each one (`kind`, `target`, `name`, `hint`). A slot that rebuilt a whole array carries a hint pointing to `each`. `reset()` starts the tallies over, and `stop()` ends counting. Until a counter starts, the runtime builds no event: each place that could report costs one property read. Give components a named setup function (`component(function UserCard(props) { … })`) so `setups()` can name them.

`E_AURORA_REACTIVE_CYCLE` is thrown when effects keep re-running each other in one update (an effect writes what it, or an effect it triggers, reads). When one effect throws during an update, the other effects still run, and the first error is rethrown afterwards.

### Lists — `each`

A slot that returns an array, `${() => rows().map(renderRow)}`, rebuilds every row whenever the array changes. Rows that hold an event handler or a component are new on every run, so a new array holding the same rows rebuilds them too. A list re-read every few seconds then loses its open menus, its focus and its hover each time. `each` keeps one row per key:

```ts
import { each, html } from '@c9up/aurora'

html`<ul>${each(
  rows,                       // an array, or a signal or accessor returning one
  (row) => row.id,            // the key: an id, never the index
  (row, index) => html`<li>${() => `${index() + 1}. ${row().name}`}</li>`,
)}</ul>`
```

`render` runs once per key. It receives accessors: `row()` is the row's current element and `index()` its current position. When the array changes, a row whose key stays keeps its nodes, its effects and its components. It moves if its position changed, and the parts that read `row()` in an accessor update in place. A new key builds a row, and a key that left disposes its row and runs its `onUnmount`. A part built from `row()` outside an accessor keeps the value it had when the row was built.

An accessor may return a list, to show something else when it is empty. It has to re-run only when that choice changes, so read the condition through a `memo`: an accessor that reads `rows()` itself builds a new list, and new rows, on every change.

```ts
const empty = memo(() => rows().length === 0)
html`<ul>${() => (empty() ? html`<li>None yet</li>` : each(rows, (row) => row.id, renderRow))}</ul>`
```

Two elements with the same key throw `E_AURORA_DUPLICATE_KEY`. On the server, `each` renders as the array of its rows; hydration adopts those rows and keeps them by key from then on.

#### Lazy lists

A list of thousands of rows, a conversation or a feed, should cost what the screen shows. `{ lazy }` builds only the rows that intersect the scroll viewport, plus a margin on each side:

```ts
html`<div class="h-full overflow-y-auto">
  <div class="flex flex-col gap-2">${each(
    messages,
    (message) => message.id,
    (message) => html`<p>${() => message().text}</p>`,
    { lazy: { estimate: 64, overscan: 600, from: 'end' } },
  )}</div>
</div>`
```

- `estimate` (default 48) is the height assumed for a row not shown yet, in CSS pixels. Rows are measured once shown, and may have any height.
- `overscan` (default 600) is how far beyond the viewport rows are built, so a fling does not show blank space.
- `from: 'end'` starts at the last rows and stays at the end as rows arrive, unless the reader has scrolled up.

The other rows are stood in for by two empty spacers, sized from the measured heights, so the scrollbar keeps the size of the whole list. When a measure corrects an estimate above the viewport, the list scrolls by the difference: what is on screen does not move. A row that leaves the window is disposed and its `onUnmount` runs; it is built again, from its element, when it comes back, so state that must outlive scrolling belongs in the element or a signal, not in the row.

The list scrolls with its nearest scrolling ancestor, or with the page. It lays out in a block or flex container, not a table: its spacers are `div`s. On the server it renders the rows a first viewport takes (from the start, or from the end), between its spacers; hydration adopts those rows and picks the window again once it can measure. A spacer's height is an inline `style`, which a Content-Security-Policy without `'unsafe-inline'` for styles drops until the client sets it. An `estimate` or `overscan` that is not a usable length throws `E_AURORA_INVALID_LAZY`.

### Component lifecycle

```ts
import { component, html, onMount, onUnmount, signal } from '@c9up/aurora'

const Counter = component(() => {
  const count = signal(0)
  onMount(() => console.log('mounted'))
  onUnmount(() => console.log('removed from DOM'))
  return html`<button @click=${() => count(count() + 1)}>${count}</button>`
})
```

State is plain `signal()` from the reactive layer — there's no separate "hooks" API. Signals work both inside and outside a component setup, so the same primitive serves module-level state, derived values (`memo`), and side effects (`effect`). The component-scoped helpers are `onMount` / `onUnmount` and the context pair below; they exist because they need the per-instance queues.

`onMount` follows the component, not the template. A component whose body IS
another component — `const TextField = component((props) => Field({ ... }))`,
the shape a compound set is built from — keeps both lifecycles: the outer one
runs first, then the inner.

Setup runs once, and it subscribes nothing. A component is built inside the
accessor of the slot that shows it — `${() => (open() ? Panel() : '')}` — and
that slot follows what the accessor itself reads (`open`), never what `Panel`'s
setup or its `onMount` read. A component updating its own state updates its
own bindings; it does not rebuild the slot around it. A value a setup reads
directly is therefore read once: put it in an accessor to follow it.

```ts
const Price = component((props) => {
  const once = props.amount()                    // read once, at setup
  return html`<b>${() => props.amount()}</b>`    // follows the signal
})
```

### Ids that survive hydration — `uid`, `resetIds`, `byId`

Templates have no `ref` directive, so a component that must measure, focus or
anchor a node finds it by id — and ARIA wiring needs one anyway, since a
trigger's `aria-controls` has to name the id its content actually carries.

```ts
import { byId, component, html, onMount, uid } from '@c9up/aurora'

const Anchored = component(() => {
  const id = uid('trigger')
  onMount(() => position(byId(id)))
  return html`<span id="${id}">?</span>`
})
```

The counter is monotonic, so the sequence depends only on the order components
are constructed in — identical on the server and in the browser for the same
tree. That holds as long as both passes start from the same place, and that is
the whole subtlety: a server process is long-lived, so without a reset its
counter climbs across requests and the second page it serves ships `trigger-14`
while the browser, starting fresh, looks up `trigger-1`. Every lookup then
answers `null`, silently — a tooltip that never opens on a page where every
binding works.

`renderPage` and `hydrate` each take a fresh counter before they build, so an
application using either gets matching sequences for free.

A counter alone is not enough once a page has more than one hydration root, and
a page with a live component has two: `renderPage` builds the page root and
`liveClient` hydrates its own container. So ids are also **namespaced per root**.
`renderPage` uses the root element's id, which is the same string its bootstrap
reads back off the container — `id="aurora-root-trigger-1"`. A live component
uses its session id, which the mount response already carries to both sides.
Nothing to wire either way.

An application rendering a root itself wraps both passes in `withIdScope`, with
the same scope on each side:

```ts
import { withIdScope } from '@c9up/aurora'

// server
const markup = withIdScope('sidebar', () => renderToString(Sidebar()))
// browser — `hydrate` takes the scope from the container's id by default
hydrate(document.getElementById('sidebar'), Sidebar)
```

### Context — `createContext`, `provide`, `inject`

A compound component owns state its parts all read. A `Select` holds the open
flag, the active item and the ids; its trigger, its list and each of its items
need them. Context hands the value down without threading a prop through every
level in between.

```ts
import { component, createContext, html, inject, provide, signal } from '@c9up/aurora'

const MenuContext = createContext('Menu')

const MenuTrigger = component(() => {
  const menu = inject(MenuContext)
  return html`<button @click=${() => menu.toggle()}>Open</button>`
})

const MenuContent = component(() => {
  const menu = inject(MenuContext)
  return html`<div ?hidden=${() => !menu.open()}>…</div>`
})

const Menu = component(() => {
  const open = signal(false)
  provide(MenuContext, { open: () => open(), toggle: () => open((v) => !v) })
  // Built HERE, inside setup — see the rule below.
  return html`<div>${MenuTrigger()}${MenuContent()}</div>`
})
```

`inject` walks outward to the nearest `provide`, so nesting the same context
shadows it for that subtree. Pass a second argument to `createContext` for a
default; without one, `inject` throws `E_AURORA_MISSING_CONTEXT` naming the
context — which is what you want when the component is meaningless on its own.

#### The one rule

A descendant sees the value only if it is **created inside the provider's
setup**. Aurora evaluates eagerly — there is no compiler deferring anything —
so children handed in as a built value ran before the provider existed:

```ts
Parent({ children: MenuItem() })       // ✗ MenuItem() ran first — throws
Parent({ children: () => MenuItem() }) // ✓ the setup calls it
```

A component that provides anything therefore takes its children as a function
and calls it itself, inside setup. Everything else follows from that.

A reactive slot written inside that setup keeps the providers it was written
under. The renderer calls it later — when it mounts, and each time what it
reads changes — and parts built in it still reach their provider, on the
client, on the server and when hydrating:

```ts
Menu({ children: () => html`${() => items().map((item) => MenuItem(item))}` })
```

Only `inject` sees them: `provide`, `onMount` and `onUnmount` still belong to a
component's own setup.

### Motion values — `MotionValue`, `motion`, `scroll-y`

```ts
import { html, MotionValue } from '@c9up/aurora/core'

const x = new MotionValue(0)
const fade = x.interpolate([0, 200], [1, 0.2])

html`<div motion=${{ translateX: x, opacity: fade }}>…</div>`

x.timing(200, { duration: 300 })               // eased tween
x.timing(300, { duration: 1200, loop: true, yoyo: true })
x.spring(0, { stiffness: 180, damping: 12 })   // physical spring
x.set(40)                                      // at once
x.stop()                                       // where it is
```

A motion value is a number that animates where the host animates best, bound
to an element with `motion=${{ opacity, translateX, translateY, scale, visible }}`;
`scroll-y=${value}` on a scroll container feeds `value` from its scroll
offset, so a header can fade as a list scrolls. The same component file runs in
the browser and on a phone ([orbit](/en/guides/mobile/gestures-and-motion#motion)).

- In the browser, each bound property is a Web Animation built from the
  value's curve: opacity and the `translate` / `scale` properties run on the
  compositor, so a busy main thread does not stop them. A scroll-fed value
  drives its bindings through a `ScrollTimeline` where the browser has one
  (no script per scroll), else on each scroll event. Without the Web
  Animations API the values are written inline every frame.
- A `translate-*` or `scale-*` class on a bound element is overridden while
  it is bound (the binding owns `translate` and `scale`); a `transform`
  (`rotate-*`) composes with it.
- `visible` hides at or below 0.5: still laid out, not drawn, not touchable.
- Rotation and colour are not supported, on either host.
- On the server nothing of `motion` or `scroll-y` is written; the client binds
  them when it hydrates.
