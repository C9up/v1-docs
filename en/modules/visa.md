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
| Endpoints | `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`, `/oauth/register`*, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`* |
| Also | RFC 9728 (where to authenticate), RFC 8707 (which server a token is for), RFC 7591 (clients that register themselves)* |
| Removed | `implicit` and `password` — gone from OAuth 2.1, and unavailable under any option |

\* mounted only once declared in `config/visa.ts`.

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
- **Parameters in the body only.** `/oauth/token`, `/oauth/introspect`,
  `/oauth/revoke` and `/oauth/register` read the request body only, and answer
  `invalid_request` to a request that puts an OAuth parameter
  (`client_secret`, `code`, `token`, `refresh_token`, registration metadata on
  `/oauth/register`…) in the query string: a secret, a code or a token in a URL
  ends up in access logs, proxies and traces. Other query parameters are
  ignored.
- **A scope is not a permission.** See
  [Protecting a resource](#protecting-a-resource).
- **One sentence per failure.** "No such code", "expired", "already used" and
  "wrong client" all read `invalid_grant: The code is not valid.` — telling
  them apart is how a code space gets probed.

## Wiring `/authorize`

The decision is visa's; the page is yours. The consent page is the one place a
user hands an application their data, so three things are not optional:

- **The consent POST is CSRF-protected.** Without it, a page on another site
  auto-submits the form — its own client, its own PKCE challenge, `approve=1` —
  and a signed-in user grants the attacker's application without seeing
  anything. Turn on blackhole's CSRF (`csrf: true` in `config/blackhole.ts`) and
  put `{{ csrfField() }}` in the form.
- **The consent page cannot be framed.** A framed page lets another site lay its
  own button over "Allow". Send `X-Frame-Options: DENY` from this page, and
  `frame-ancestors 'none'` if you build its `Content-Security-Policy` yourself.
- **The POST grants what the page showed, not what the POST says.** The
  validated request stays on the server, in a single-use ticket bound to the
  session and the user. The form carries only the ticket's id.

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

  // Kept server-side: the POST below grants this, whatever it is sent.
  const ticket = visa.consentTicket(outcome.request, ctx.auth.user.id)
  ctx.session.put('visa.consent', ticket)

  ctx.response.header('x-frame-options', 'DENY')
  return ctx.view.render('oauth/consent', {
    client: outcome.request.client,
    scopes: outcome.request.scopes,
    ticket: ticket.id,
  })
})

// CSRF-protected by blackhole, like every other form POST.
router.post('/oauth/consent', async (ctx) => {
  const user = ctx.auth.getUserOrFail()
  // Pulled, not read: a second POST of the same form finds nothing.
  const validated = await visa.redeemConsentTicket(
    ctx.session.pull('visa.consent'),
    ctx.request.input('ticket'),
    user.id,
  )
  if (validated === null) {
    // No ticket, another page's ticket, another user, expired, or a client
    // that changed since the page was shown: start again.
    return ctx.view.render('oauth/error', { error: { error: 'invalid_request' } })
  }

  const url = ctx.request.input('approve') === '1'
    ? await visa.grant(validated, user.id)
    : visa.deny(validated)
  return ctx.response.redirect(url)
})
```

```html
<!-- resources/views/oauth/consent.inker -->
<form method="POST" action="/oauth/consent">
  {{ csrfField() }}
  <input type="hidden" name="ticket" value="{{ ticket }}">
  <button name="approve" value="1">Allow</button>
  <button name="approve" value="0">Deny</button>
</form>
```

`consentTicket(request, userId)` returns plain values — a random 256-bit `id`,
the `userId`, an `expiresAt`, and the authorization request as it was validated
(the scope list the user saw, not the client record) — so any session store can
hold it. `redeemConsentTicket(ticket, presentedId, userId)` answers `null` when
there is no ticket, the form names another ticket (a form left open in one tab
cannot approve what another tab put in the session since), the user differs,
the ticket expired, or the request no longer validates — the client may have
lost a scope or a redirect URI meanwhile, or registered more scopes than the
page listed. It mints nothing: the code exists only once `grant` runs. A ticket
lasts ten minutes; `consentTicketTtlSeconds` in the config changes it.

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

The `tokenEndpointAuthMethod` a client registers is the **only** one accepted:
a client declared `client_secret_basic` sending its secret in the body is
refused, and the other way round. Accepting both would make the registered
method decorative — and the body is readable by things that could not read the
header.

A scope a client was not registered for is **refused**, never silently
dropped — granting less than was asked is how a client ends up believing it
holds a permission it does not.

## Protecting a resource

Declare the guard beside the others in `config/auth.ts`:

```ts
import { visaGuard } from '@c9up/visa'

export default defineConfig({
  default: 'visa',
  guards: {
    visa: visaGuard({
      store: () => visa.store,
      findUser: (id) => User.find(id),
    }),
  },
})
```

The authenticated user carries the token it was authenticated with:

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities          // the token's scopes
token.allows('invoices.read')
token.authorize('invoices.write')   // throws E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

**A scope is not a permission.** The guard puts the token's scopes on
`currentAccessToken` and leaves `user.permissions` as `findUser` returned it. A
scope is chosen by the client and granted by consent, and consent never checks
the user's own rights — so a route that needs both checks both. Warden's
`@Permission` and `hasPermission` do: on a request made with a token they
require the user's permission **and** the token's scope (see
[Warden — abilities are not permissions](/en/modules/warden#abilities-are-not-permissions)).

`findUser` runs on **every** request, deliberately: a token issued to an
account that has since been disabled stops working here, once, instead of
wherever each application remembers to check.

`createToken(user, abilities, { name, expiresInSeconds })` mints one directly
for a first-party client — name it with `tokenClientId` — and
`invalidateToken(token)` revokes one.

The lower-level form is still there for a resource server with no guard:

```ts
const grant = await visa.verify(bearerToken, new Date(), 'https://api.example/mcp')
if (!grant) return ctx.response.unauthorized({ error: 'invalid_token' })
```

### Telling a client where to authenticate (RFC 9728)

A 401 with nothing else in it is a dead end: the caller learns it needs a token
and nothing about where tokens come from. Declare the resource and the metadata
document is served:

```ts
// config/visa.ts
protectedResource: {
  resource: 'https://api.example/mcp',
  scopesSupported: ['profile'],
}
```

Then carry the challenge on the refusal:

```ts
response.header('www-authenticate', guard.challenge())
// Bearer resource_metadata="https://api.example/.well-known/oauth-protected-resource/mcp"
```

An MCP client walks from the 401 to that document to this server on its own.

### Binding a token to one server (RFC 8707)

A token with no stated audience is a token for everything. A client that sends
`resource=https://api.example/mcp` gets one bound to it, and
`verify(token, now, resource)` refuses one minted for somewhere else. The
authorization endpoint binds what the user was shown; an exchange may narrow
that list, never widen it. `resourcesSupported` in config turns an unknown
resource into `invalid_target` instead of something to mint for.

Tokens issued before a client started asking are unbound, and stay accepted
everywhere.

## Connected applications

What a user has authorised, and how they end it:

```ts
const apps = await visa.listAuthorizations(userId)
// [{ clientId, name, scopes, grantedAt, lastUsedAt?, active }]

await visa.revokeAuthorization(userId, clientId)
```

One row per **application**, not per token: a person authorised an application
once, and tokens come and go under that decision. An application whose tokens
have all expired still shows, marked inactive — "last used" matters most when
nothing is live, and hiding it would say an application never touched their
data when it did.

Revoking takes both kinds of token and then forgets the consent, in that order:
someone revoking in a hurry wants the sessions dead first.

## Clients that register themselves (RFC 7591)

Off unless you turn it on. An MCP client such as claude.ai has nobody to fill
in a form for it; a server on the public internet with this open lets anyone
create a client.

```ts
// config/visa.ts
registration: {
  enabled: true,
  initialAccessToken: env.get('VISA_REGISTRATION_TOKEN'),
  scopes: ['profile'],
}
```

What a self-registered client may **be** is the server's decision, not the
request's: grants, scopes and auth method come from this config, the id is
chosen here, and a redirect URI must be https or http on a loopback address.

## What `ream configure` writes

```bash
ream configure @c9up/visa
```

Four things: `VISA_ISSUER` in `.env`, the provider in `reamrc.ts`,
`config/visa.ts` with a `MemoryStore` and a comment saying to replace it, and
the migrations for the five tables the atlas store reads —
`9000_create_visa_tables` and `9001_add_visa_client_secret_expiry`. A migration
already in the project is left alone. It fails before touching the project if
those migrations cannot be read — a provider registered and a config written
with no tables underneath is worse than stopping.

The store and the `/authorize` route stay yours — both are
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

## The issuer

It identifies the SERVER, and that is all it does. An access token here is
opaque — a random string with no claims inside — so nothing is bound to an
issuer cryptographically; the only thing that can vouch for such a token is the
server that minted it. That is why `/oauth/introspect` answers with `iss`, and
why the metadata document names it.

Validated at boot rather than at the first request: a URL, `https` (localhost
excepted), no query string, no fragment, and a trailing slash dropped — every
endpoint is built by concatenation, so `https://auth.test/` would otherwise
produce `https://auth.test//oauth/token`.

## The store

`MemoryStore` is for tests and a single development process: a restart signs
every user out and a second instance sees none of the first one's tokens.
An application running atlas gets one:

```ts
import { AtlasStore } from '@c9up/visa/stores/atlas'

const store = new AtlasStore(db)
```

`ream configure @c9up/visa` writes the migration for its five tables. It is
built on the query builder rather than on SQL text, so dialects stay atlas'
problem, and it takes the `db` service through a structural slice of what it
calls — visa itself imports nothing.

Anything else implements `VisaStore`.

`saveClient` is optional, for clients that live in a table you do not own.
Without it `registerClient` throws, and a server with `registration.enabled`
refuses to boot rather than answering 500 to every registration.

### Upgrading a `visa_clients` table

A client's secret can expire — a `client_secret_expires_at` answered at
registration — and that expiry is enforced at every client authentication from
the `secret_expires_at` column (`null`: the secret does not expire).
`AtlasStore` writes that column on every client, and a `visa_clients` table
created by visa 0.1.3 or earlier does not have it. Run `ream configure
@c9up/visa` again before upgrading: your existing `9000_create_visa_tables` is
left alone, `9001_add_visa_client_secret_expiry` lands beside it, and
`migration:run` adds the column.

Two of its methods, `consumeAuthorizationCode` and `consumeRefreshToken`,
**must be atomic**: two requests racing with the same code must not both
succeed. That single-use guarantee is what the whole replay detection is built
on, so a driver on a real database has to say how it achieves it — the atlas
store does it in one UPDATE guarded on the column still being null, and never
reads first.

## Not here yet

OpenID Connect — `id_token`, discovery, JWKS, `/userinfo`. The `nonce` is
already carried through the authorization code for it.
