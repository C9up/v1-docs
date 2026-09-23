# Visa

`@c9up/visa` is an OAuth 2.1 authorization server: it issues tokens to **other**
applications on a user's behalf.

It authenticates nobody — that stays [warden](/en/modules/warden)'s job. Visa
asks your application who is signed in, and owns everything after that. Its
mirror image is [transit](/en/modules/transit), which *consumes* a provider;
visa *is* one.

No dependencies: `node:crypto` only. A package sitting in the path that mints
and compares credentials is a package that can replace them.

```bash
ream configure @c9up/visa
```

## What it implements

| | |
|---|---|
| Grants | `authorization_code` (PKCE required), `refresh_token`, `client_credentials` |
| Endpoints | `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`, `/.well-known/oauth-authorization-server` |
| Removed | `implicit` and `password` — gone from OAuth 2.1, and unavailable under any option |

`/authorize` is **not** mounted, and that is a decision rather than an
omission: it needs a signed-in user and a consent screen, and both belong to
your application. A route that guessed either would be wrong in a way that is
hard to notice — a server showing no consent screen grants silently.

## The decisions, and what each one prevents

- **PKCE on every client**, confidential ones included: a code on the front
  channel is interceptable whoever asked for it.
- **`S256` only.** `plain` puts the verifier in the authorization request, so
  anything that can read that request — a log, a referrer, a proxy — can
  complete the exchange, which is exactly what PKCE exists to stop.
  `allowPlainChallenge: true` brings it back.
- **Exact redirect URI matching**, with the single exception the spec names (a
  loopback port, since a native app cannot know which port the OS will hand
  it). A prefix match is how an open redirect on the client's own domain
  becomes a stolen authorization code.
- **An error is never redirected to an unverified URI.** A bad `redirect_uri`
  is shown to the user; bouncing it would tell an attacker the client exists
  and load a page of their choosing in the user's session.
- **Everything is hashed at rest** — codes, access tokens, refresh tokens,
  client secrets. A database dump is not a set of working credentials.
- **Refresh rotation with replay detection.** Every use mints a new token; a
  spent one coming back proves a leak, and since there is no telling the thief
  from the victim, the whole family is revoked and both are signed out.
- **A replayed authorization code revokes what it bought.** The legitimate
  exchange already happened, so the tokens in flight are the attacker's.
- **One sentence per failure.** "No such code", "expired", "already used" and
  "wrong client" all read `invalid_grant: The code is not valid.` — telling
  them apart is how a code space gets probed.

## Wiring `/authorize`

The decision is visa's; the page is yours.

```ts
// start/routes.ts
import visa from '@c9up/visa/services/main'

router.get('/oauth/authorize', async (ctx) => {
  const outcome = await visa.authorize(ctx.request.qs(), ctx.auth.user?.id)

  if (outcome.type === 'redirect') return ctx.response.redirect(outcome.url)
  if (outcome.type === 'error') {
    // NOT a redirect: the redirect URI is the thing that failed validation.
    return ctx.view.render('oauth/error', { error: outcome.error.toResponse() })
  }
  if (!ctx.auth.user) {
    return ctx.response.redirect(`/login?next=${encodeURIComponent(ctx.request.url(true))}`)
  }
  return ctx.view.render('oauth/consent', {
    client: outcome.request.client,
    scopes: outcome.request.scopes,
  })
})

router.post('/oauth/consent', async (ctx) => {
  const outcome = await visa.authorize(ctx.request.all(), ctx.auth.user.id)
  if (outcome.type !== 'consent') return ctx.response.redirect('/')
  const url = ctx.request.input('approve')
    ? await visa.grant(outcome.request, ctx.auth.user.id)
    : visa.deny(outcome.request)
  return ctx.response.redirect(url)
})
```

## Clients

```ts
const { client, secret } = await visa.registerClient({
  id: 'invoices',
  name: 'Invoices',
  redirectUris: ['https://invoices.example.com/callback'],
  scopes: ['profile', 'invoices:read'],
})
```

`secret` is returned once and stored only as a hash; a client that loses it
gets a new one. A public client — a SPA, a native app — registers with
`tokenEndpointAuthMethod: 'none'`, gets no secret, and may not use
`client_credentials`: "the client itself" means nothing when anyone can read
its id out of a browser.

A scope a client was not registered for is **refused**, never silently
dropped — granting less than was asked is how a client ends up believing it
holds a permission it does not.

## Protecting a resource

```ts
const grant = await visa.verify(bearerToken)
if (!grant) return ctx.response.unauthorized({ error: 'invalid_token' })
if (!grant.scopes.includes('invoices:read')) {
  return ctx.response.forbidden({ error: 'insufficient_scope' })
}
```

## What `ream configure` writes

```bash
ream configure @c9up/visa
```

Three things, and nothing else: `VISA_ISSUER` in `.env`, the provider in
`reamrc.ts`, and `config/visa.ts` with a `MemoryStore` and a comment saying to
replace it. The store and the `/authorize` route stay yours — both are
decisions rather than boilerplate, and a generated guess at either is wrong in
a way that only shows up in production.

Once the provider is registered, the manager resolves by token and is typed:

```ts
const visa = await container.make('visa')   // VisaManager, not unknown
```

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

## The store

`MemoryStore` is for tests and a single development process: a restart signs
every user out and a second instance sees none of the first one's tokens.
Anything else implements `VisaStore` — twelve methods.

Two of them, `consumeAuthorizationCode` and `consumeRefreshToken`, **must be
atomic**: two requests racing with the same code must not both succeed. That
single-use guarantee is what the whole replay detection is built on, so a
driver on a real database has to say how it achieves it.

## Not here yet

OpenID Connect — `id_token`, discovery, JWKS, `/userinfo`. The `nonce` is
already carried through the authorization code for it.
