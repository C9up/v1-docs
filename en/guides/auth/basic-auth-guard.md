# Basic auth guard

This guide covers the basic auth guard.

## BasicAuthStrategy

HTTP Basic (the `basic_auth` driver). The browser prompts, then resends
the credentials on **every** request — which is why it fits a machine-to-machine
endpoint or an internal tool behind TLS, and does not fit a user-facing login.

```ts
import { authFinder, basicAuthGuard, safeCompare } from '@c9up/warden'

const users = authFinder({ hash, findForAuth: (email) => User.findBy('email', email) })

basicAuthGuard({
  realm: 'Admin area',                    // shown in the browser prompt
  verifyCredentials: async (uid, password) => {
    // Throws E_INVALID_CREDENTIALS on any failure: the guard answers 401.
    const user = await users.verifyCredentials(uid, password)
    return { id: user.id, email: user.email }
  },
})
```

Two things it does on your behalf:

- The header is split on the **first** colon (RFC 7617) — a password may contain
  colons, a username may not. Splitting on the last would accept the wrong pair.
- An unknown user and a wrong password return the **same** message. Telling them
  apart turns the endpoint into a username oracle — and so does answering one
  faster than the other, which is why the example builds on `authFinder`.
- A `verifyCredentials` may answer a wrong credential with `null` or by throwing
  `E_INVALID_CREDENTIALS`; both are a 401. Any other error is an outage and is
  reported as one, not as a wrong password.

Register it as a guard and `@Guard('basic')` routes read the
`Authorization: Basic …` header; a refusal answers 401 with
`WWW-Authenticate: Basic realm="…", charset="UTF-8"`, so the browser prompts.
`strategy.challenge` gives that value for a response you build yourself. `safeCompare(a, b)` is exported for an app checking a plaintext
shared secret — a plain `===` returns sooner on an early mismatch, and that
difference is measurable.

---
