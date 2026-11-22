# Server rendering

This guide covers rendering on the server and hydrating:

- Host-free core — `@c9up/aurora/core`
- SSR — `renderToString`
- Low-level — direct hydration
- Embedding aurora in inker templates

## Host-free core — `@c9up/aurora/core`

`@c9up/aurora` is the browser entry: it carries the DOM renderer, hydration and
the browser helpers. Code that has to run on **every** host — the server, the
browser, a phone through a native renderer — imports from `@c9up/aurora/core`
instead:

```ts
import { component, html, signal, memo, each, onMount } from '@c9up/aurora/core'

export const Counter = component((props: { label: string }) => {
  const count = signal(0)
  return html`<button @click=${() => count((n) => n + 1)}>${props.label}: ${count}</button>`
})
```

The entry holds what a component is written with: signals (`signal`, `memo`,
`effect`, `batch`, `untrack`, `onCleanup`), `html`, `component` and its
lifecycle and context, `each`, `uid`, `cn`, `command`, `form` and `AuroraError`.
It loads where there is no DOM, no Node module and no top-level await — a test
walks its import graph so it stays that way. `@c9up/aurora` re-exports the same
functions, so an existing app changes nothing, and a component written against
the core still renders with `render()` and `aurora.render()`.

`byId` is not in the core: it reads `document`.

### Writing a renderer — `@c9up/aurora/renderer`

A renderer for another host reads the same `TemplateResult` as the DOM
renderer. `@c9up/aurora/renderer` gives it the pieces the built-in renderers
share, so a component behaves the same everywhere:

| Export | What for |
|---|---|
| `TemplateScanner`, `assertBindable`, `assertBindableProperty` | Refuse the slot positions the DOM renderer refuses |
| `readComponentLifecycle` | The mount hooks and teardowns a `component()` attached to its result |
| `bindTemplateContext` | Run a slot's function under the context it was written in |
| `setOwner` | Collect the effects created while a subtree is built, to dispose them with it |
| `readEach`, `readEachItems` | Keyed lists |
| `guardUrlAttribute`, `guardUrlProperty` | The URL checks every host applies |

Application code never needs this entry.

## SSR — `renderToString`

```ts
import { renderToString } from '@c9up/aurora'

const html = renderToString(html`<p>Hello, World!</p>`)
// "<p>Hello, World!</p>"
```

The SSR walker is synchronous, allocates one string, and never touches a DOM. It runs unchanged in Node, Workers, and Deno.

## Low-level — direct hydration

If you don't want the `aurora.render()` helper (you're rolling a custom shell), the same primitives are still exposed:

```js
import { hydrate, html, signal } from '@c9up/aurora'

hydrate(
  document.getElementById('aurora-root'),
  () => Dashboard({ status }),
)
```

The factory **must produce the same `TemplateResult` shape** the server rendered — same slots, same order. Aurora walks the SSR tree along the parsed template path; a mismatch falls back to a console warning but the page stays functional.

`auroraRoute()` is the low-level route handler under the same primitives. It
calls `render(ctx)`, renders the result with `renderToString`, wraps the markup
in `shell(body, entry)` and sends it as `text/html`:

```js
import { auroraRoute } from '@c9up/aurora'

router.get('/dashboard', auroraRoute({
  render: () => Dashboard({ status }),
  entry: '/dashboard.client.js',   // default: '/aurora-client.js'
}))
```

The default shell is a minimal document with a `<div id="aurora-root">` around
the markup and a `<script type="module" src="…">` for `entry`. It ships no
importmap and no page data: the `entry` module is yours to serve, and it calls
`hydrate()` itself. In an application with controllers, `aurora.render()` /
`ctx.aurora.render()` does all of that for you.

## Embedding aurora in inker templates

Aurora islands work inside a server-rendered [Inker](/en/guides/frontend/templates/) template — no glue code lives in either package, you wire it with one helper. Inker emits a helper's `SafeString` return verbatim, and aurora's `renderToString` produces a component's HTML on the server:

```ts
// boot — register the helper via the Templates helpers Map (or the InkerProvider's
// merged helper map). Helper args cross NAPI as JSON, so pass plain data.
import { renderToString } from '@c9up/aurora'
import { SafeString, Templates } from '@c9up/inker'
import { Counter } from '../islands/Counter.js'

const islands = { Counter }   // name → aurora component factory

const templates = new Templates({
  root: 'resources/templates',
  helpers: new Map([
    ['aurora', (name, data) =>
      new SafeString(
        `<div data-aurora="${name}">${renderToString(islands[name](data))}</div>`,
      ),
    ],
  ]),
})
```

```inker
<!-- inker server template — a SafeString is emitted raw, even in double braces -->
<section>{{ aurora("Counter", page.counter) }}</section>
```

```ts
// client — hydrate the island to attach reactivity
import { hydrate } from '@c9up/aurora'
import { Counter } from './islands/Counter.js'

for (const el of document.querySelectorAll('[data-aurora=Counter]')) hydrate(el, Counter)
```

The client factory must reproduce the same `TemplateResult` shape the server rendered (same constraint as `aurora.render()` hydration). Only return a `SafeString` from author-controlled markup — aurora escapes `${}` interpolations, but the surrounding wrapper string is your responsibility.
