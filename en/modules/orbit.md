# Orbit — Native views

Orbit renders [aurora](/en/modules/aurora) components as native views on a
phone. A component written with `html`, `component`, signals and Tailwind
classes runs unchanged on Android: orbit keeps a tree of native nodes that
aurora's signals patch, commits it to a Rust host (orbit-host) that lays it
out with taffy, diffs it and hands mount operations to the platform's views.
Gestures, animations and scroll-driven values run on the UI thread, so a busy
JS thread does not freeze the screen.

React Native supplies the JS engine (Hermes), the module registry and the
activity; React itself is not used.

## Installation

```bash
pnpm add @c9up/orbit @c9up/aurora react-native
pnpm add -D tailwindcss @tailwindcss/cli @react-native-community/cli @react-native/metro-config
```

The app is built by `ream android:*` from the `mobile` block of `reamrc.ts`
— see [Mobile apps](/en/cli/ream#mobile-apps) in the CLI reference.

## Wiring an app

```ts
// mobile/index.ts — mobile.entry in reamrc.ts
import { run } from '@c9up/orbit/react-native'
import { App } from './App.js'

run(App)
```

```ts
// mobile/App.ts
import { component, html, signal } from '@c9up/aurora/core'

export const App = component(() => {
  const count = signal(0)
  return html`<div class="flex-1 items-center justify-center gap-4 bg-background">
    <p class="text-2xl font-semibold">${() => count()}</p>
    <button class="rounded-md bg-primary px-4 py-2 text-primary-foreground" @click=${() => count(count() + 1)}>
      Add one
    </button>
  </div>`
})
```

`run` registers the app under the name the generated activity starts, gives
orbit its native host and the app's style table, wires the Android back
button, and mounts the root component with the launch props (the intent's
extras). Outside an app built by ream, `useHost(host)` and
`mount(App(), { viewport })` do the same by hand.

## What maps to what

| Template | Native |
|---|---|
| block elements (`div`, `section`, `button`, …) | a view |
| `p`, `h1`–`h6`, `label` | a text |
| inline elements (`span`, `strong`, `em`, …) | a run inside the surrounding text |
| text sitting in a view | wrapped in an anonymous text, as CSS does |
| `class="…"` | the app's own Tailwind build (see Styles); text styles cascade |
| a `flex` container | each child its own item; `flex` is a row, as on the web |
| `overflow-y-auto` | a native scroll view around a content view |
| `overflow-hidden` | children clipped to the box and its rounded corners |
| `shadow-*` | a box shadow, drawn by the parent outside the box (Android 8+) |
| `backdrop-blur-*` | what is behind the view, blurred (Android 12+) |
| `@click`, `@longpress`, `@pan`, `@swipe` | gestures recognized natively (see Gestures) |
| `motion=${{ opacity, translateX, translateY, scale, visible }}` | UI-thread animation (see Motion) |
| `scroll-y=${value}` | the scroll offset feeds a `MotionValue` |
| `input`, `textarea` | the platform's text field: typing never waits for JS |
| `@input`, `@change`, `@focus`, `@blur`, Enter as `@keydown` | the field's events, `event.target.value` carrying the text |
| `img` | an image view, decoded off the UI thread at the size it is shown |
| `svg` | a vector view: paths, basic shapes and `g` (see Vector drawings) |
| `each(items, key, render)` | one row per key: a kept row keeps its views and moves |
| `each(…, { lazy })` | only the rows in the nearest scroll view's viewport exist |

The root lays out inside the safe area: the status bar, the navigation bar,
the display cutout and, when it is open, the keyboard.

## Styles

The app's classes are its Tailwind classes, styled by its own Tailwind build.
`ream android:*` runs Tailwind over the app (its `mobile.css`) and compiles
the output into a style table: every rule with its values resolved against
the theme — lengths in px, colours light and dark — and only what classes
compose at run time left open (`--tw-shadow`, `--tw-leading`…). The table
travels in the JS bundle.

Orbit applies it as a browser applies the stylesheet: rules matched by class,
cascaded by specificity and order, the base layer's element rules included
(a component set's `* { border-color }`, `body { background; color }` on the
root), custom properties resolved. Variants are conditions on orbit's own
tree, followed when they change:

- an attribute of the element: `data-[state=open]:`, `aria-invalid:`,
  `disabled:` (aurora's `?disabled`), `[class*=…]`;
- `dark:` and the theme's dark values, through `colorScheme('dark')`;
- an ancestor (`group-data-[…]:`), a previous sibling (`peer-checked:`), the
  element's children and descendants (`*:`, `space-y-*`, `[&_svg]:size-4`);
- the viewport's width (`sm:`, `md:`).

```ts
import { colorScheme, unknownClasses } from '@c9up/orbit'

colorScheme('dark')          // dark: variants and the theme's dark values
console.log(unknownClasses)  // classes the app's stylesheet does not have
```

Text gets its line height (`leading-*`, and a size's own) as CSS's line box —
every line exactly that tall, the glyphs centred — and its exact weight.

## Screens

A stack of screens, each an aurora component:

```ts
import { createStack, useScreen } from '@c9up/orbit'

export const App = component(() => html`${createStack(Home)}`)

const Home = component(() => {
  const screen = useScreen()
  return html`<div @click=${() => screen.push(Detail, { id: 3 })}>…</div>`
})
```

- `push(Screen, props)` shows a screen on top, `pop()` ends the top one,
  `replace(Screen, props)` swaps it. The Android back button and back gesture
  pop the innermost stack shown; with nothing to pop, the app goes back as any
  Android app does.
- A covered screen stays built — its views laid out (a scroll view keeps its
  offset), its signals and effects running — and is hidden once covered.
  `screen.focused()` is true while a screen is the one shown; an effect that
  should pause reads it.
- A popped or replaced screen ends at once: its effects stop and its
  `onUnmount` runs; its views go when its transition is over.
- Transitions play on the UI thread: the new screen slides in from the right
  edge while the covered one drifts left (`transition: 'none'` switches at
  once; `duration`, default 300 ms).
- A screen sees what was provided around its stack (`provide` / `inject`), even
  one pushed long after; a stack can sit in a screen (a tab with its own
  history).

## Server-driven pages

```ts
import { serverPages } from '@c9up/orbit/pages'
import Home from './pages/Home.js'
import Orders from './pages/Orders.js'

run(() => html`${serverPages({ server: 'https://app.example', pages: { Home, Orders } })}`)
```

The ream server stays the router. The app asks it for the first page object,
then each link or `router.visit()` asks for the next one through
[photon](/en/modules/photon)'s protocol — the one the browser speaks after
aurora's [`visits: true`](/en/modules/aurora). The same controller answers the
browser and the phone; the phone shows the page it names, an aurora component
bundled with the app. A page that imports from `@c9up/aurora` and
`@c9up/photon/client/core` is the very module the browser loads.

- Each page is a screen of a stack: a visit to a new address slides one in;
  a partial reload, a deferred prop or a redirect to the same address
  replaces it in place.
- The back button goes through photon's history: the covered page comes back
  as it was left, without a request.
- A stale version (the server was deployed again) starts over from the page
  asked for, as a browser's full load does.
- Requests carry the session cookie and echo the `XSRF-TOKEN` the server set.
  A link off the server goes to `open(url)`.
- An `<a href>` in a view is a touch target of its own (in a block, each link
  takes its line); one inside a sentence (`<p>… <a>…</a> …</p>`) is not
  pressable yet.
- `server` must be https. Plain http only reaches this machine (`localhost`,
  through `adb reverse`) or the emulator's host (`10.0.2.2`), and the app must
  allow cleartext traffic for it.
- `loading` replaces the blank screen shown until the first page arrives;
  `failed(error, retry)` replaces the default failure screen.

React Native's `URL` resolves a relative reference by appending it to its
base; the app entry installs a standard one (`installStandardUrl()` for an app
wired by hand).

## Gestures

Every touch goes to orbit-host's recognizer before any view, so the press
feedback starts even while the JS thread is busy, and JS receives the outcome
when it can.

- `@click`: fires on release if the finger stayed within 10 dp and nothing
  took the touch over. A ripple, masked by the view's rounded box, starts where
  the finger is — at once, or after 100 ms inside a scroll view, so a scroll
  that starts on a row does not flash it.
- `@longpress`: after 500 ms held; the release then fires no click.
- `@pan`: once the finger moves past the slop, `{ phase, dx, dy, vx, vy }`
  (dp, dp/s) on `start`, each `move`, and `end` or `cancel`.
- `@swipe`: a release faster than 500 dp/s, `{ direction, vx, vy }`.

## Motion

A `MotionValue` lives in the host and animates on the UI thread: JS declares
values, curves and bindings once, and a blocked JS thread stops none of it.

```ts
import { MotionValue } from '@c9up/orbit'

const x = new MotionValue(0)
const fade = x.interpolate([0, 200], [1, 0.2])

html`<div motion=${{ translateX: x, opacity: fade }}>…</div>`

x.timing(200, { duration: 300 })               // eased tween
x.spring(0, { stiffness: 180, damping: 12 })   // physical spring
x.set(40)                                      // at once
```

`scroll-y=${value}` feeds a value from a scroll view's offset (a header that
shrinks as the list scrolls). `visible` hides a view at or below 0.5: still
laid out, but not drawn and not touchable — unlike `opacity: 0`, which is drawn
transparent and takes touches, as on the web. `dispose()` frees a value made
for a view that goes for good.

## Long lists

`each(items, key, render, { lazy: { estimate, overscan, from } })` builds only
the rows intersecting its scroll view's viewport, plus `overscan` dp on each
side, between two spacers standing for the others at their measured heights
(`estimate` for a row not shown yet). It picks its rows with aurora's own
window math, so a list behaves as on the web; `from: 'end'` starts at the
bottom and follows new rows while the reader is there — a conversation.

## Images and vector drawings

`<img src>` takes `https://` URLs, `file:` and `content://` paths, `asset:`
files bundled with the app and bytes handed over from JS; it is decoded off the
UI thread at the size it is shown, and `object-*` sets its fit.

`<svg>` becomes a vector view. orbit-host reads the drawing — path data with
every command, `rect` (rounded), `circle`, `ellipse`, `line`, `polyline`,
`polygon`, `g`, `transform`, `fill` / `stroke` and their opacities — and the
platform replays plain paths scaled to the box. `currentColor` paints with the
text colour around it, so an icon takes the colour of the text it sits in;
`shape-rendering="crispEdges"` keeps a QR code's modules pure black and white.

## Limits

- Not mapped yet: `select`, `canvas`; inside an `svg`, `text`, `use`,
  gradients and masks.
- Known to the stylesheet but inert: `:has()`, positional pseudo-classes
  (`first:`, `last:`), `::before` / `::after`, transforms, transitions,
  gradients, `line-clamp`; `grid` lays out as a column; one box shadow is drawn
  (the first visible one) and corners share one radius.
- Accessibility and iOS are still to come.

## Errors

| Code | Cause |
|---|---|
| `E_ORBIT_NO_HOST` | `mount` ran before `useHost` gave orbit a native host, or the module is not orbit's. |
| `E_ORBIT_COMMIT_FAILED` | The native host refused a commit; the message carries its report. |
| `E_ORBIT_UNSUPPORTED_ELEMENT` | An element with no native mapping (`select`, `canvas`, or `text` / a gradient inside an `svg`). |
| `E_ORBIT_BLOCK_IN_TEXT` | A block element inside text: native text holds only inline runs. |
| `E_ORBIT_INVALID_MOTION` | `motion=${…}` was not an object of motion values. |
| `E_ORBIT_INVALID_SCROLL_BINDING` | `scroll-y=${…}` was not a motion value. |
| `E_ORBIT_INVALID_COLOR` | A colour orbit cannot read. |
| `E_ORBIT_INSECURE_IMAGE_URL` | `<img src>` over plain http: images are fetched over https only. |
| `E_ORBIT_IMAGE_SOURCE` | `<img src>` with a scheme that is not an image source (`data:`, `javascript:`…). |
| `E_ORBIT_DUPLICATE_KEY` | Two elements of an `each` list share a key. |
| `E_ORBIT_NO_SCREEN` | `useScreen()` in a component no screen of a stack built. |
| `E_ORBIT_STACK_SHOWN` | One stack put in two places: a stack is shown once. |
| `E_ORBIT_STYLE_TABLE` | `useStyles` got something other than a table `ream css:compile` wrote. |
| `E_ORBIT_INSECURE_SERVER` | `serverPages({ server })` over plain http to a host that is not this machine or the emulator's. |
| `E_ORBIT_UNKNOWN_PAGE` | The server named a page the app's `pages` does not have. |
