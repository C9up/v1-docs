# OpenID Connect

This guide covers OpenID Connect:

- What is verified
- Keys, and when they are fetched
- Providers that need no driver

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
nothing to change when it rotates a key. The controller is the one above, unchanged.

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
| `iss` | Identical, byte for byte, to the issuer that was configured — which the discovery document's `issuer` must match too. |
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

The issuer is kept exactly as written: no trailing slash is added or removed
before it is compared with the discovery document's `issuer` and with each
token's `iss`. Write it the way the provider does — Auth0's ends with a slash
(`https://tenant.auth0.com/`), and dropping it makes every sign-in fail. Only
the well-known URL is built without the slash.

### Keys, and when they are fetched

The discovery document is cached for an hour; the signing keys are cached until
a token names one that is not held, which is how a rotation is picked up. That
refetch is rate-limited to once every five minutes, so a stream of tokens naming
invented keys cannot turn your application into a load generator against the
provider. Both are tunable through `cache`.

### Providers that need no driver

Anything that speaks OpenID Connect needs no driver of its own — give `oidc()`
the issuer:

| Provider | Issuer |
| --- | --- |
| Keycloak | `https://<host>/realms/<realm>` |
| Auth0 | `https://<tenant>.auth0.com/` (with the slash) |
| Okta | `https://<tenant>.okta.com` |
| Microsoft Entra ID | `https://login.microsoftonline.com/<tenant>/v2.0` |
| Authentik | `https://<host>/application/o/<slug>` |
| Zitadel | `https://<instance>` |
| GitLab | `https://gitlab.com` |

Each publishes `/.well-known/openid-configuration`, which is all the driver
needs. A named helper exists only where a provider deviates from the standard
enough to need one.
