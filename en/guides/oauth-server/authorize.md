# Authorization endpoint and clients

This guide covers the authorization endpoint and the clients:

- Wiring `/authorize`
- Clients
- Clients that register themselves (RFC 7591)

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

`authorize()` takes the query as the parser hands it over. A parameter sent
twice (`scope=a&scope=b`) or bracketed (`scope[]=a`, `scope[x]=1`) arrives as an
array or an object, and RFC 6749 §3.1 says a parameter MUST NOT be included
more than once: it is an `invalid_request` — shown to the user when it is
`client_id` or `redirect_uri`, redirected otherwise (without `state` when
`state` is the repeated one). `resource` is the exception, since RFC 8707 lets a
request name several: one string or several strings, nothing else.

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

A missing or wrong initial access token is a credential failure, not a
metadata one: `401` with `{ "error": "invalid_token" }` and a `Bearer`
challenge (RFC 7591 §3, RFC 6750 §3.1) — `WWW-Authenticate: Bearer` when no
token was sent, `Bearer error="invalid_token"` when the wrong one was.
