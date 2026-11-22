# Testing

This guide covers testing the OAuth server.

## Testing

`@c9up/visa/testing` gives you the REAL server on a memory store, with a client
already registered:

```ts
import { testVisa } from '@c9up/visa/testing'

const t = await testVisa({ scopes: ['profile', 'invoices:read'] })
const tokens = await t.tokensFor('user-7', 'invoices:read')

// A resource test now has a token that actually verifies.
const grant = await t.visa.verify(tokens.access_token)
```

`tokensFor()` walks the whole path — authorize, consent, code, exchange —
rather than minting a token directly. It is not a lenient double on purpose: a
helper that granted whatever was asked would teach applications to ship a
consent screen nobody has ever seen refuse, and a test that passes against a
stub is a production incident with a green badge.
