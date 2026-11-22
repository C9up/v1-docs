# Providers

This guide covers the OAuth providers:

- The providers
- PKCE, and OAuth1
- Sign in with Apple

## The providers

| Helper | Default scopes |
| --- | --- |
| `socials.apple` | `name`, `email` *(see below — no client secret)* |
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

Both can change for one redirect: `begin()` and `redirect()` take a callback
that receives an `AuthorizeRequest`, starting from the configured scopes and
parameters — to ask for a scope only when a feature needs it, or pass a
`login_hint` to one sign-in:

```ts
const { url, state, secret } = await transit.begin('github', (request) => {
  request.mergeScopes(['repo']).param('prompt', 'consent')
})
// with a state of your own: transit.begin('github', state, (request) => …)
// offline: transit.redirect('github', state, secret, (request) => …)
```

`scopes()` replaces, `mergeScopes()` adds, `clearScopes()` empties (an OpenID
Connect provider still gets `openid`), `transformScopes()` rewrites what the
next two receive; `param()` and `clearParam()` set and drop parameters, and
`getScopes()` / `getParams()` read them back. What the flow's security rests
on — `state`, `nonce`, `code_challenge`, `code_challenge_method`, `client_id`,
`redirect_uri`, `response_type` — cannot be set or cleared there
(`E_TRANSIT_PROTECTED_PARAMETER`), nor through `authorizeParams`; scopes go
through the scope methods. OAuth1 and SAML providers refuse a callback rather
than ignoring it. `FakeTransit` records what the callback asked for in
`begun[i].authorize`.

Two LinkedIn entries because LinkedIn has two flows. **A new application wants
`linkedinOpenidConnect`** — LinkedIn no longer grants `r_liteprofile` to new
apps. `linkedin` is the member API, for an application that already holds those
scopes; it reads the address from a second endpoint.

Two X entries for the same reason: two protocols. A new application wants
`twitterX`; `twitter` is the only one whose profile call returns the address.

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

## Sign in with Apple

Required on iOS as soon as an application offers another social sign-in. It
speaks OpenID Connect, so the flow is the one above — but it differs in three
places, and each is where an implementation gets caught.

```ts
import { defineConfig, socials } from '@c9up/transit'

export default defineConfig({
  apple: socials.apple({
    clientId: 'com.acme.web',          // the Services ID
    teamId: env.get('APPLE_TEAM_ID'),
    keyId: env.get('APPLE_KEY_ID'),
    privateKey: env.get('APPLE_PRIVATE_KEY'),   // the contents of the .p8
    callbackUrl: 'https://acme.test/auth/apple/callback',
  }),
})
```

**There is no client secret.** Apple takes a short-lived JWT signed with the
`.p8`, minted per request. Nothing to store, nothing to rotate — and nothing to
get wrong, since a DER-encoded signature is what usually turns into an
unhelpful `invalid_client`.

**The callback is a POST.** Asking for a name or an address forces
`response_mode=form_post`, so the callback route has to accept `POST` and read
`code` and `state` from the body rather than the query string.

**The name is sent once**, in that first consent POST, in a `user` field.
Never in a token, never on a later sign-in:

```ts
import { parseAppleUser } from '@c9up/transit'

const identity = parseAppleUser(ctx.request.input('user'))
// { name: 'Ada Lovelace' } — or undefined
```

Store it when it is there. `undefined` is the normal case for a returning user,
not an error.

Only the name is read from that field. It also carries an `email`, but the
field is plain form data, signed by nothing: the person signing in can set it
to any address before the browser posts it, and their id_token still verifies.
The address is `user.email` from the callback — the id_token's, with
`emailVerificationState` — and never this field's.

The address may be a private relay (`is_private_email` in `user.raw`), which
forwards and can be turned off by the person at any time. Apple sends its
booleans as the strings `"true"` / `"false"`; the driver reads them, so
`emailVerificationState` is `verified` where Apple says so.
