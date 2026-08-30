# Transit — Federated sign-in

Transit is where a person proves who they are through an authority your
application does not own. Today that means OAuth1, OAuth2, and the providers
that speak them.

It is a package of its own rather than a corner of [Warden](/en/modules/warden)
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

## Configuration

```ts
// config/transit.ts
import { defineConfig, socials } from '@c9up/transit'

export default defineConfig({
  google: socials.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/google/callback',
  }),
  github: socials.github({
    clientId: env.get('GITHUB_CLIENT_ID'),
    clientSecret: env.get('GITHUB_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/github/callback',
    scopes: ['user', 'user:email'],
  }),
})
```

The keys are yours. Two entries may reach the same provider with different
credentials — a `staff` sign-in and a `customers` one, both on Google — and
`use(name)` asks for the key, not the provider.

The manager is registered as `TransitManager` and under the `"transit"` alias,
and reachable from anywhere through the service accessor.

## The providers

| Helper | Default scopes |
| --- | --- |
| `socials.discord` | `identify`, `email` |
| `socials.facebook` | `email` |
| `socials.github` | `read:user`, `user:email` |
| `socials.google` | `openid`, `email`, `profile` |
| `socials.linkedin` | `r_liteprofile`, `r_emailaddress` |
| `socials.linkedinOpenidConnect` | `openid`, `profile`, `email` |
| `socials.spotify` | `user-read-email` |
| `socials.twitter` | *(OAuth1 — X has no scopes)* |
| `socials.twitterX` | `tweet.read`, `users.read`, `users.email` |

`scopes` replaces the defaults. `authorizeParams` adds whatever else a provider
takes on its authorize URL — `prompt`, `display`, `show_dialog`, `guild_id` —
without a config type per provider:

```ts
socials.discord({ ...credentials, authorizeParams: { prompt: 'none' } })
```

Two LinkedIn entries because LinkedIn has two flows. **A new application wants
`linkedinOpenidConnect`** — LinkedIn no longer grants `r_liteprofile` to new
apps. `linkedin` is the member API, for an application that already holds those
scopes; it reads the address from a second endpoint.

Two X entries for the same reason: two protocols. A new application wants
`twitterX`; `twitter` is the only one whose profile call returns the address.

## OpenID Connect

One driver for every provider that conforms — Keycloak, Auth0, Okta, Entra ID,
Authentik, Zitadel, Ping, Google. Give it an issuer; it reads the rest.

```ts
import { defineConfig, oidc } from '@c9up/transit'

export default defineConfig({
  work: oidc({
    issuer: 'https://id.acme.com',
    clientId: env.get('OIDC_CLIENT_ID'),
    clientSecret: env.get('OIDC_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/work/callback',
  }),
})
```

The endpoints, the signing keys and the algorithms come from the provider's own
`/.well-known/openid-configuration`, so there is nothing else to configure and
nothing to change when it rotates a key. The controller is the one below,
unchanged.

`scopes` defaults to `openid profile email`, and `openid` is added back if a
config drops it — without it the provider runs a plain OAuth2 flow and returns
no `id_token`. `authorizeParams` carries `prompt`, `login_hint`, `acr_values`.
`userinfo: false` stops the extra profile call when the token's claims are
enough. `leewaySeconds` (default 60) is the clock drift tolerated against the
provider.

### What is verified

An OpenID Connect provider does not just hand back a token to go asking with —
it hands back a **signed statement about who the user is**. That statement is
worth nothing until it has been checked, so every one of these is enforced
before a user is returned:

| | |
| --- | --- |
| Signature | Against the provider's published key, fetched from its JWKS. |
| Algorithm | Chosen from what the provider **declared it signs with** — never read from the token. |
| Key | Must be the kind the algorithm is defined over, and on the right curve. |
| `iss` | The issuer that was configured, matched against the discovery document. |
| `aud` | Must name this client. With several audiences, `azp` must name it too. |
| `exp` / `iat` | Not expired, not issued in the future. |
| `nonce` | The one this sign-in sent. |
| `sub` | The userinfo response must describe the same person as the token. |

Two of those deserve a sentence. Taking the algorithm from the token's own
header is what makes `alg: none` work, and what lets an RS256 public key be
replayed as an HS256 shared secret — so the header may only *select* from a set
computed beforehand, never introduce one. And the `nonce` is what stops a token
captured from an earlier sign-in of the same user being replayed into a fresh
session; it travels in `secret`, which is why `begin()` asks you to keep it.

Only asymmetric signatures are accepted. The `HS*` family signs with the client
secret, so every copy of the config — and every log line that ever leaked it —
could mint a token for any user.

### Keys, and when they are fetched

The discovery document is cached for an hour; the signing keys are cached until
a token names one that is not held, which is how a rotation is picked up. That
refetch is rate-limited to once every five minutes, so a stream of tokens naming
invented keys cannot turn your application into a load generator against the
provider. Both are tunable through `cache`.

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

`begin()` is the path that works for every provider: it mints the state, asks
the provider for a request token where the protocol needs one, and hands back
whatever must survive until the user returns.

`secret` is `undefined` for a plain OAuth2 provider, the PKCE verifier for one
that mandates it, and the request-token secret for OAuth1. Storing and
returning it unconditionally is what lets one controller serve all three.

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

## PKCE, and OAuth1

The controller above already handles both. What differs is only what `secret`
holds.

**X on OAuth2** (`twitterX`) mandates PKCE. `begin()` mints the verifier;
`redirect()` would refuse to build a URL without one rather than sending the
user somewhere X rejects. Only the hash of the verifier travels in the URL —
the verifier itself is sent once, on the token exchange, which is what makes an
intercepted authorization code useless to whoever intercepted it. Mint one
yourself with `createCodeVerifier()` if you are not using `begin()`.

**X on OAuth1** (`twitter`) is a different protocol, not a variation. Its
redirect cannot be built offline at all: the URL carries a request token only X
can issue, which is why `begin()` performs a round trip there. Its callback
carries an `oauth_token` and an `oauth_verifier` rather than a code, and they
land in the same arguments — the verifier is the code, the returned token is
the state, and matching it against the one you issued **is** the CSRF check.

## A token you already hold

```ts
const user = await transit.userFromToken('google', accessToken)
```

No code to exchange — for a refreshed token, or one a mobile client obtained
itself. An OAuth1 provider needs the token secret too:
`userFromToken('twitter', accessToken, tokenSecret)`.

## Another provider

Extend `Oauth2Driver` and you write only what makes the provider itself: the
three URLs, its default scopes, and how to read its payload.

```ts
import { Oauth2Driver, type TransitUser } from '@c9up/transit'

class GitLabDriver extends Oauth2Driver {
  protected readonly provider = 'GitLab'
  protected readonly authorizeUrl = 'https://gitlab.com/oauth/authorize'
  protected readonly accessTokenUrl = 'https://gitlab.com/oauth/token'
  protected readonly userInfoUrl = 'https://gitlab.com/api/v4/user'
  protected readonly defaultScopes = ['read_user'] as const

  protected mapUser(raw: Record<string, unknown>): TransitUser {
    return {
      id: String(raw.id ?? ''),
      email: String(raw.email ?? ''),
      name: String(raw.name ?? ''),
      avatarUrl: raw.avatar_url as string | undefined,
      raw,
    }
  }
}

export default defineConfig({
  gitlab: new GitLabDriver({ clientId, clientSecret, callbackUrl }),
})
```

Override `tokenAuth = 'basic'` when the provider takes its credentials as HTTP
Basic, `requiresPkce = true` when it mandates PKCE, `authorizeParams()` and
`userInfoParams()` for its own query parameters, and `fetchUser()` when the
address needs a second call.

For an OAuth1 provider, extend `Oauth1Driver` instead: four URLs — request
token, authorize, access token, profile — and the same `mapUser`. The signing
is handled.

Anything answering `redirectUrl(state, secret?)` and
`callback(code, state, expected, secret?)` works too, without either base.
Validate the state round trip with `assertOAuthState(state, expected)` — it is
exported for exactly that, and it fails closed on a missing expected value.

## Next steps

- [Warden (Auth)](/en/modules/warden) — turn the returned user into a session
