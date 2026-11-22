# Introduction

This guide covers signing in with another identity provider:

- Installation
- Configuration
- The round trip
- What you get back
- A token you already hold

Transit is where a person proves who they are through an authority your
application does not own: SAML 2.0, OpenID Connect, Sign in with Apple, OAuth1
and OAuth2, and the directories that answer over LDAP.

All of it is written here, with no dependency at any layer — down to the XML
reader a signature is canonicalized over, and the BER a directory is asked in.

It is a package of its own rather than a corner of [Warden](/en/guides/auth/introduction)
because the two answer different questions. Warden owns the people you already
have — guards, sessions, tokens, permissions. Transit owns the moment someone
arrives from somewhere else.

## Installation

```bash
pnpm add @c9up/transit
```

```ts
// reamrc.ts
providers: [
  () => import('@c9up/transit/provider'),
]
```

| Entry point | |
| --- | --- |
| `@c9up/transit` | the whole API |
| `@c9up/transit/config` | `defineConfig`, `socials`, `oidc`, `saml`, `ldap` |
| `@c9up/transit/provider` | the Ream provider |
| `@c9up/transit/services/main` | the manager, from anywhere |
| `@c9up/transit/testing` | `FakeTransit` |

## Configuration

```ts
// config/transit.ts
import { defineConfig, ldap, oidc, saml, socials } from '@c9up/transit'

export default defineConfig({
  google: socials.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/google/callback',
  }),
  work: oidc({ issuer: 'https://id.acme.com', /* ... */ }),
  corp: saml({ issuer: 'https://idp.acme.test/metadata', /* ... */ }),
  staff: ldap({ url: 'ldaps://directory.acme.test', /* ... */ }),
})
```

Every protocol lives in the same map, and each has its own section below.

The keys are yours. Two entries may reach the same provider with different
credentials — a `staff` sign-in and a `customers` one, both on Google — and
`use(name)` asks for the key, not the provider.

The manager is registered as `TransitManager` and under the `"transit"` alias,
and reachable from anywhere through the service accessor.

## The round trip

```ts
import transit from '@c9up/transit/services/main'

// Send the user off
const { url, state, secret } = await transit.begin('google')
ctx.session.put('transit_state', state)
ctx.session.put('transit_secret', secret)
return ctx.response.redirect(url)

// ... and receive them back
const { user, token } = await transit.callback(
  'google',
  ctx.request.input('code'),
  ctx.request.input('state'),
  ctx.session.pull('transit_state'),
  ctx.session.pull('transit_secret'),
)
```

`begin()` is the path for every provider a browser is sent to — OAuth2, OAuth1,
OpenID Connect, Apple, SAML. It mints the state, performs whatever round trip
the protocol needs first, and hands back what must survive until the user
returns.

`secret` is what differs, and the caller never has to know which:

| | |
| --- | --- |
| Plain OAuth2 | `undefined` |
| OAuth2 with PKCE | the code verifier |
| OpenID Connect | the code verifier and the nonce |
| OAuth1 | the request-token secret |
| SAML | the request id the response must answer |

Storing and returning it unconditionally is what lets one controller serve all
of them. A directory is the exception, because nothing is redirected — see
[LDAP](/en/guides/auth/social/ldap#ldap-and-active-directory).

`transit.redirect(name, state)` still exists for a plain OAuth2 provider whose
URL can be built offline. An OAuth1 provider throws there and says to use
`begin()`.

The `state` is not optional. The callback **refuses** to run without an
expected value to compare against: an OAuth callback that trusts whatever code
arrives lets an attacker link their own provider account to a signed-in
victim's session. There is no way to turn that check off.

## What you get back

`user` carries `id`, `email`, `name`, the provider's `nickName` (a login, a
username, a display name), an optional `avatarUrl`, an
`emailVerificationState` and the raw payload. `token` carries `accessToken`
and, when the provider issues them, `refreshToken` and `expiresIn` — plus
`tokenSecret` for OAuth1, whose access token signs nothing on its own.

### Before you link an account by email

```ts
if (user.emailVerificationState !== 'verified') {
  // Ask the user to confirm the address instead of linking on it.
}
```

`unverified` means anyone able to type that address at the provider now holds
it — linking on that basis hands them the account. `unsupported` means the
provider says nothing either way, which is not the same as saying yes; Spotify,
X and the LinkedIn member API all report it.

GitHub is worth knowing about: most accounts keep the address private, so the
profile returns none. The driver then reads `/user/emails`, prefers the
verified primary, and reports what GitHub says about it. An account that
declined `user:email` still signs in — with no address.

## A token you already hold

```ts
const user = await transit.userFromToken('google', accessToken)
```

No code to exchange — for a refreshed token, or one a mobile client obtained
itself. An OAuth1 provider needs the token secret too:
`userFromToken('twitter', accessToken, tokenSecret)`.

## Next steps
- [Warden (Auth)](/en/guides/auth/introduction) — turn the returned user into a session
- [Quasar (Redis)](/en/guides/database/redis) — the connection a replay store names
