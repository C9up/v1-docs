# Styles and screens

This guide covers styles, screens, lists and images:

- Styles
- Screens
- Long lists
- Images and vector drawings

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
UI thread at the size it is shown, and `object-*` sets its fit. An address
written in the template that orbit will not load (`http:`, `data:`, `//host/…`)
throws. One that comes from data, such as a user's avatar, shows nothing for
that image and goes to `mount`'s `onError`; the rest of the screen is shown.

`<svg>` becomes a vector view. orbit-host reads the drawing — path data with
every command, `rect` (rounded), `circle`, `ellipse`, `line`, `polyline`,
`polygon`, `g`, `transform`, `fill` / `stroke` and their opacities — and the
platform replays plain paths scaled to the box. `currentColor` paints with the
text colour around it, so an icon takes the colour of the text it sits in;
`shape-rendering="crispEdges"` keeps a QR code's modules pure black and white.
A value the host cannot read does not stop the screen. A number that is not
finite (`NaN` from `0 / 0`) counts as absent. Path data and `points` are drawn
up to their first error. A shape whose `transform` or paint cannot be read is
left out. Each goes to `onError` as `E_ORBIT_SVG_VALUE`.
