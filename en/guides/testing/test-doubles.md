# Test doubles and time

This guide covers container overrides and time travel:

- Container overrides
- Time-travel

## Container overrides

```ts
import { override, test, useContainer } from '@c9up/helix'
import { FakeMail } from '@c9up/rover/testing'

test('sends the welcome mail', async () => {
  useContainer(container)              // your app's container, once per test file or in a hook
  override('mail', new FakeMail())
  override('logger', captureLogger)
  // ...
})
```

`override(token, value)` replaces a binding on the container `useContainer`
made active, and undoes itself at the end of the test — the restore is queued on
the test's cleanup, so it runs even when the test body never asks for it. It
throws outside a test (a restore queued there would never run) and when no
container is active. `overrideOn(container, token, value)` targets a container
explicitly.

Undoing an override puts back what was there before it, not an empty slot. A
fake the file swapped in `beforeAll` is still in place for the next test, and
two overrides of the same token unwind one at a time. This needs a container
that can read its current swap: `@c9up/ream`'s `Container` does it through
`swapped(token)`. On a container without it, the cleanup calls
`restore(token)`, which removes every swap of the token.

## Time-travel

```ts
import { time } from '@c9up/helix'

time.freeze('2026-01-01T12:00:00Z')
time.travel(60_000)         // +1 minute
time.unfreeze()
```

The clock is pinned through `vi.setSystemTime`, which replaces `Date`, so
anything that reads the time through `Date` — chronos's `DateTime.now()`, Atlas's
`created_at` / `updated_at` columns — observes the frozen clock; helix imports
no date library.

`freeze` and `travel` undo themselves at the end of the test: the clock goes back
to what it was before the call — the pin a `beforeAll` set with
`vi.setSystemTime` or `vi.useFakeTimers`, or real time when there was none — so
the next test sees the clock the file chose, whatever the previous test did.

`Date` is replaced only while a clock is pinned; importing helix changes no
global. While pinned, the replacement still behaves as `Date`: a
`class X extends Date` keeps its own prototype and methods,
`new Date().constructor === Date`, and a date made before the pin is still
`instanceof Date`.
