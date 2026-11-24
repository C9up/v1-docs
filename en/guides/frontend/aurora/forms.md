# Forms and actions

This guide covers forms and asynchronous actions:

- Async actions — `command`
- Forms — `form`

## Async actions — `command`

`command()` wraps an async task (typically an `HttpClient` call) with reactive
`loading` / `data` / `error` signals plus chainable `onSuccess` / `onFail` /
`onSettled` handlers and a `run(...args)` launcher — so call sites never write
`then`/`catch` and the template binds the in-flight state directly.

```js
import { command, HttpClient, isHttpError } from '@c9up/aurora'
const api = new HttpClient()

const login = command((creds) => api.post('/auth/login', creds))
  .onSuccess((u) => redirect('/app'))
  .onFail((e) => formError(isHttpError(e) ? e.data : 'Network error'))

login.run(creds)            // launch — no try/catch
login.loading()             // reactive: bind to a spinner / disabled button
login.data(); login.error() // latest result / error
```

- `run(...args)` is **re-runnable** with different args each time; the signals
  reflect the LATEST run. A superseded (slower) run that resolves after a newer
  one is silently dropped — safe for search-as-you-type / retry.
- `run()` always resolves (never throws): success → `data` + `onSuccess`, failure
  → `error` + `onFail`, always `onSettled`.
- `reset()` clears `data`/`error`/`loading`.
- It is **not** a Promise — it's a *re-runnable* factory of promises plus
  reactive state. For a one-shot call with no UI state, `attempt()` is enough.
- The task is any `Promise`, so a "multi" call is just `Promise.all` inside it:
  `command(() => Promise.all([api.get('/a'), api.get('/b')]))`.

## Forms — `form`

`form()` is a minimal reactive form controller: per-field `value` / `error` /
`touched` signals, optional validation, and a submit driven by `command` (so
`submitting` / `submitError` are reactive). It composes the pieces above —
fields are signals, the submit is a `command`.

```js
import { form, HttpClient, isHttpError } from '@c9up/aurora'
const api = new HttpClient()

const f = form({
  initial: { email: '', password: '' },
  submit: (values) => api.post('/auth/login', values),
})
  .onSuccess(() => redirect('/app'))
  .onFail((e) => { if (isHttpError(e)) f.setErrors(e.data?.errors ?? {}) })

const email = f.field('email')   // { value, error, touched, set, markTouched }
```

```js
// in a template
html`
  <form @submit=${(e) => f.handleSubmit(e)}>
    <input value="${email.value}"
           @input=${(e) => email.set(e.target.value)}
           @blur=${email.markTouched} />
    ${() => email.touched() && email.error()
      ? html`<span class="err">${email.error()}</span>`
      : null}

    <button ?disabled=${f.submitting}>
      ${() => f.submitting() ? 'Signing in…' : 'Sign in'}
    </button>
  </form>
`
```

`handleSubmit()` calls `preventDefault()`, marks every field touched, validates,
and submits only when valid. `setErrors()` injects server-side field errors (e.g.
from the `data` of `errors.E_AURORA_HTTP_REQUEST_FAILED`). `reset()` restores `initial` and clears errors/touched.

### Validation with rune (optional)

Validation is **agnostic and optional**. Pass a `validate` function returning a
`{ field: message }` map, OR any object with a `.validate(values)` method — a
[rune](/en/guides/basics/validation/) schema satisfies that shape, so it drops in with **no
hard dependency** (aurora never imports a validator):

```js
import { rules, schema } from '@c9up/rune'

const f = form({
  initial: { email: '', password: '' },
  validate: schema({
    email: rules.string().email(),
    password: rules.string().min(8),
  }),
  submit: (values) => api.post('/auth/login', values),
})
```

A rune schema returns `{ valid, errors: [{ field, message }] }`; the form maps
those onto each field's `error` signal. With no `validate`, the form simply never
reports field errors.

### Localized messages with rosetta (optional)

rune routes its messages through [rosetta](/en/guides/digging-deeper/i18n) via
`bindRosetta` — call it once at boot and every validation message (and therefore
every `field.error()`) is translated in the active locale:

```js
import { bindRosetta } from '@c9up/rune'
import { rosetta } from '../config/rosetta.js'

bindRosetta(rosetta)   // rune messages now go through rosetta.t(key, params)
```

aurora stays unaware of both — `form` only reads the `{ field, message }` rune
produces, already localized. Pick your own validator or translator freely.
