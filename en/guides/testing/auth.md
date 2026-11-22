# Authenticating a test client

This guide covers signing a test client in.

## Authenticating a test client

Every guard answers `authenticateAsClient(...)` with what a client must send to
be that user. The test client's `loginAs()` applies it:

```ts
await client.get('/dashboard').loginAs(sessionGuard, user)
await client.get('/api/me').loginAs(jwtGuard, user)
await client.get('/keys').loginAs(apiKeyGuard, user, ['orders:read'])
await client.get('/admin').loginAs(basicGuard, 'ada', 'secret')
```

The **guard** decides what to send, so the test never reproduces how that guard
authenticates — and the request travels the same verification path as
production. A test that forges its own header proves only that the forgery works.

| guard | answers with | takes |
|---|---|---|
| jwt | `authorization: Bearer <signed>` | the user |
| session | a session entry under the guard's key | the user |
| access_tokens | `authorization: Bearer oat_…` — a real token minted through the provider | the user, then optional abilities and token options |
| basic | `authorization: Basic <base64>` | uid + password |

A session guard returns session **values**, which only something holding the
session driver can persist — configure `sessionSeeder` on the test client. Without
one, `loginAs()` throws instead of sending the request unauthenticated.

---
