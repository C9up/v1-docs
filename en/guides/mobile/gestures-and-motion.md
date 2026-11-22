# Gestures and motion

This guide covers gestures and motion:

- Gestures
- Motion

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

A `MotionValue` — aurora's, the same in the browser (see
[motion values](/en/guides/frontend/aurora/signals#motion-values-—-motionvalue-motion-scroll-y)) —
lives in the host and animates on the UI thread: JS declares values, curves
and bindings once, and a blocked JS thread stops none of it.

```ts
import { MotionValue } from '@c9up/aurora/core'

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
