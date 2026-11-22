# SAML 2.0

This guide covers SAML 2.0:

- What is verified
- Replay, and a second replica
- The asserted email
- Attributes

## SAML 2.0

The enterprise directories — Okta, Entra ID, ADFS, OneLogin, Shibboleth.

```ts
import { defineConfig, saml, replayStores } from '@c9up/transit'

export default defineConfig({
  corp: saml({
    entityId: 'https://acme.test/saml',            // who this application is
    callbackUrl: 'https://acme.test/saml/acs',     // where the response lands
    issuer: 'https://idp.acme.test/metadata',      // who the provider is
    signOnUrl: 'https://idp.acme.test/sso',
    certificates: [env.get('IDP_CERTIFICATE')],
    replayStore: replayStores.redis({ connection: 'main' }),
  }),
})
```

`certificates` comes from the provider's metadata and nowhere else. Several are
accepted, so a key rotation is prepared before it happens rather than during an
outage. A driver with none refuses to exist, at boot rather than at the first
sign-in.

**The callback is a POST**, like Apple's: the provider posts a form carrying
`SAMLResponse` and `RelayState`. Those are the `code` and the `state`, and the
request id from `begin()` is the `secret` — the same controller as everywhere
else.

```ts
const { url, state, secret } = await transit.begin('corp')
ctx.session.put('transit_state', state)
ctx.session.put('transit_secret', secret)
return ctx.response.redirect(url)

// ... and at the ACS route, on a POST
const { user } = await transit.callback(
  'corp',
  ctx.request.input('SAMLResponse'),
  ctx.request.input('RelayState'),
  ctx.session.pull('transit_state'),
  ctx.session.pull('transit_secret'),
)
```

### What is verified

A valid signature says the provider wrote this. It says nothing about whether
the statement was meant for **this** application, at **this** moment, in answer
to **this** request — and a response that is genuine but none of those is what
a replay or a misdirected sign-in looks like.

| | |
| --- | --- |
| Signature | Against the metadata's certificate, over the assertion, before anything else is read. |
| Wrapping | The element the signature covers is the element that is read. Nothing is looked up in the document afterwards. |
| Issuer | The provider the config names. |
| Audience | This application's entity id. |
| Recipient | The URL this application answers at. |
| `InResponseTo` | The request this sign-in made. |
| Windows | The assertion's and the bearer confirmation's, with a minute of drift. |
| Replay | The assertion id, remembered for as long as the assertion could still be accepted. |

Absences are refused as firmly as mismatches: an assertion that restricts no
audience does not say who it is for, one with no expiry never stops being
usable, and one answering a request this application never made was obtained
somewhere else.

SHA-1 is refused, for signatures and for digests. XPath and XSLT transforms are
refused — one can make the digest cover something other than the element, and
the other is executable.

A response may be signed on the assertion, on the response, or on both (the
"sign response and assertion" setting of Entra ID, Okta, Keycloak or ADFS).
Signed on both, the response's own signature — the one enveloped in
`<samlp:Response>`, which covers everything inside it — is the one verified,
and the single assertion is read from the element it covers. Any other shape
with several signatures (two on the response, several inside it with none on
it) is refused.

### Replay, and a second replica

An assertion is a bearer token: captured once and posted twice it is valid both
times, and no condition on it changes that. Its id is therefore remembered
until the assertion stops being accepted: its later expiry — the assertion's
`NotOnOrAfter` or the bearer confirmation's, whichever ends last — plus
`clockSkewSeconds` (default 60), since that drift is what it was accepted with.
A validated assertion carries that instant as `rememberUntil`, and it is what a
replay store is asked to remember the id until. The Redis store keeps the key a
minute longer still, for the clock difference between the replica that stored it
and the one a replay lands on.

The in-process store remembers in this process's memory, which accepts the same
assertion **once per replica**. In production (`NODE_ENV` is `production` or
`prod`) the driver therefore refuses to choose it for you: a SAML provider with
no `replayStore` throws when the driver is built, and the application does not
boot. Say which store you want:

```ts
replayStore: replayStores.redis({ connection: 'main' })  // shared across replicas
replayStore: replayStores.memory()                       // a single process, deliberately
```

Outside production the in-process store remains the default: one dev process is
the case it is correct for.

The Redis store fails closed while Redis is down (the assertion is refused), and
recovers by itself once it is back: neither a failed resolution nor a connection
quasar retired (status `end`) is kept, so the next sign-in asks for the
connection again.

### The asserted email

Whoever administers a SAML provider can assert any address for any user. So an
address read from an assertion is reported `unsupported` by default, and only
the config can say that the provider is authoritative for it:

```ts
saml({ ...config, trustEmail: true })                     // your own provider: every address is verified
saml({ ...config, trustedEmailDomains: ['acme.test'] })   // a customer's: acme.test addresses are verified, others unverified
```

`trustedEmailDomains` is compared without case against what follows the
address's last `@`, exactly — a subdomain is listed on its own. Setting both
options, or listing something that is not a domain (`ada@acme.test`, an empty
string), is refused when the driver is built. `trustEmail` belongs only to a
provider that answers for every address it can assert: with a customer's
provider, it hands that customer every account your application links by email.

### Attributes

`user.raw.attributes` carries every attribute, values kept as a list because
SAML attributes are multi-valued and collapsing them loses group memberships.
The email, name and nickname are read from the names providers usually use;
`claims` names them when a provider invents its own:

```ts
saml({ ...config, claims: { email: 'urn:acme:mail' } })
```
