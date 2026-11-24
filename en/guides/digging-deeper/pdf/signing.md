# Signing

This guide covers signing a PDF:

- With a key you hold
- Adapters
- Timestamping
- Checking one
- Trust
- Revocation

## Signing

A PDF signature covers a byte range **of the document it lives in**, which
rules out the usual order: the value cannot be computed and then assembled,
because assembling it would change what it covers. The document is written with
a hole where the value goes, `/ByteRange` records everything but the hole, and
the value is dropped into the reserved space without moving another byte.

For the same reason, an edit after signing would break the signature: stamping,
writing text, rotating, selecting, splitting, merging, filling and flattening
all write the file anew. A signed document is therefore refused with
`E_VELLUM_SIGNED_DOCUMENT`, rather than handed back looking fine and no longer
signed; draw on a document before signing it. `{ discardSignatures: true }`
edits it anyway, for a caller who means to.

That is also what makes a key you hold and a key held by a certified provider
the same interface — **a signer never sees the document, only the digest of
it** — so which one signs is a line of configuration:

```ts
// config/vellum.ts
export default defineConfig({
  signers: {
    internal: myLocalSigner,
    qualified: myProviderSigner,
  },
})

const signed = await vellum.sign(mandate, {
  signer: 'qualified',
  reason: 'Mandat de prévoyance',
  name: 'Amélie Durand',
})
```

A `Signer` is anything with `sign(digest: Buffer): Promise<Buffer>` returning
the CMS `SignedData`. Signing over the network belongs there rather than in the
engine, which does no I/O.

The signature is appended as an **incremental revision**: the original bytes
are preserved exactly. Rewriting the file would invalidate any signature
already on it and destroy the history a signature exists to establish.
Signing a signed document countersigns it: the new signature gets a field of
its own (`Signature2`, and so on), and the earlier one still matches what it
signed.

A visible signature — a drawn one, an image — is a separate matter: `stamp` it
on first, then sign.

### With a key you hold

`pkcs8Signer` is the one signer that ships, because it is the one with no
vendor behind it:

```ts
signers: {
  internal: pkcs8Signer({
    key: readFileSync(app.makePath('storage/signing.key.der')),
    certificate: readFileSync(app.makePath('storage/signing.crt.der')),
  }),
}
```

It builds a CAdES `SignedData` whose signed attributes carry the content type,
the document's digest, the signing time and — as PAdES requires —
`signing-certificate-v2`. That last is not decoration: without it a signature
is bound to a key but not to an identity.

PKCS#8 and DER rather than a `.p12` bundle;
`openssl pkcs12 -in bundle.p12 -nodes` gets you there in one command.

This is an **advanced** signature: it proves the document has not changed since
a particular key signed it. Where the law requires a *qualified* one, the key
has to live with a certified provider — and that is an adapter, not this.

### Adapters

A provider is a `Signer` and nothing more, so an adapter is a short function
returning one. None ship here: naming a vendor would tie an agnostic package to
one, and an HTTP client is not a dependency it should carry.

### Timestamping

`timestamped` wraps any signer, the local one or a provider's:

```ts
signers: {
  internal: timestamped(pkcs8Signer({ key, certificate }), {
    url: 'https://freetsa.org/tsr',
  }),
}
```

A signature proves a document has not changed since a key signed it, not
*when*. Once the certificate expires a verifier cannot tell a signature made
while it was valid from one forged afterwards, and stops accepting it. For a
document kept for years this is what keeps it verifiable.

The token goes on as an **unsigned** attribute, which is what lets it be added
without disturbing the signature. When it is attached, the authority's answer
is checked: its status, that it stamped the signature actually sent, and that
it answered *this* request rather than replaying an older answer — read out of
the token's structure, not looked for in its bytes. An answer that cannot be
read is refused, which fails closed.

Being unsigned, the attribute is also anybody's to add or replace once the
document leaves you, so a verifier believes a token only after checking it
again, as [Trust](/en/guides/digging-deeper/pdf/signing#trust) describes.

The signature grows by a few kilobytes, so a document prepared with a tight
`capacity` may need a larger one.

### Checking one

```ts
for (const signature of await vellum.verifySignatures(mandate)) {
  if (!signature.coversWholeDocument) reject('content was added after signing')
  if (!signature.digestMatches) reject('the document has changed')
  if (!signature.signatureVerifies) reject('the signature does not match')
}
```

`coversWholeDocument` catches the trap everybody meets first: **content
appended after a signature is not covered by it**, and the arithmetic over the
covered part still checks out. A reader that verifies only the digest will
happily call such a document signed. It is false as well when the one region
the signature leaves out is anything but its own value, the `/Contents` entry
of its own signature dictionary: any other region would be bytes nobody signed.

The report also names the signer, the time they stated (`signedAt`, shown and
never used to judge anything), and whether a timestamp that checks out vouches
for when (`timestamped`). `signatureVerifies` is about the certificate the
signature names — by issuer and serial number, or key identifier — not
whichever one the document lists first, and a `signing-certificate-v2`
attribute naming another certificate is reported and makes the signature
untrusted. Signatures are checked as RSA PKCS#1 v1.5 over SHA-256, -384 or
-512, everywhere — the document, each certificate link, an OCSP answer, a
timestamp; any other algorithm is reported as uncheckable rather than assumed,
and an RSA key under 2048 bits is not believed. Whatever could not be checked,
or checked out wrong, is listed in `problems`. A document with no signatures
reports none — that is an answer, not a failure.

### Trust

Checking that a signature matches the certificate it carries says nothing about
who that certificate belongs to: anyone can make one. Trust comes from a path
to an anchor you have decided to accept.

```ts
// config/vellum.ts
export default defineConfig({
  trustedAnchors: [readFileSync(app.makePath('storage/anchors/authority.pem'))],
})
```

Supply the roots your supervisory body publishes — they are distributed as
trusted lists in the ETSI TS 119 612 format — or your own authority's, and
`trusted` says whether a path was found. DER or PEM. Supplying none is a
position too: every signature comes back untrusted, which is the honest answer
rather than a comfortable one.

The path is judged **now** — `momentAt` says the instant, in seconds since the
epoch — unless a timestamp proves the signature existed earlier. Then it is
judged at the authority's instant, and a certificate valid then and expired or
revoked since did not retroactively unsign anything. That is the concrete
reason timestamping is worth the round trip. A timestamp is believed only when
the authority's signature over it verifies with the certificate it names, that
certificate is marked for timestamping, was valid when it stamped and chains to
your anchors today, and the token stamps this very signature; otherwise the
report says why and the signature is judged now. The time the signer wrote into
its own signature is shown and never used: the holder of a lapsed certificate
could write any date there. `moment` says which case applied — `"timestamp"`,
or `"claimed"` / `"unknown"`, both judged now.

Every link is checked: each certificate's signature verifies with the key of
the one above it, each issuer says it is an authority (`cA` in its basic
constraints) and, when its key usage is restricted, that it may sign
certificates, the path length and the name constraints an authority was given
are honoured, and the signing certificate is allowed to sign at all. An
ordinary certificate issuing one under its own name is no exception: its
holder would otherwise pick a new key, a new responder and new key usages
under the name the authority certified. An anchor is matched by the whole
certificate or by its name and key — never by a name and serial number, which
anyone can copy. A certificate that signed itself and is not an anchor ends the
path, and a path longer than eight is treated as a loop.

### Revocation

A certificate can be valid on its face and worthless in fact. Only the issuer
knows, and only if asked:

```ts
const signatures = await vellum.verifySignatures(mandate, { checkRevocation: true })
// signatures[0].revocation → { status: 'good' | 'revoked' | 'unknown', detail? }
```

That is a network call per signing certificate, to the responder it names, so
it is off unless asked for. Only a `trusted` signature is asked about: off a
trusted path its "issuer" could be anybody, and so could the answer it signs,
so the answer is `unknown`. Signatures sharing a certificate share one
question; at most four are asked at once, and no more than sixteen
certificates per call — the rest answer `unknown` without anything being
asked, since the document chooses the responders.

The answer has **three** values, not two. `unknown` covers everything else —
unreachable responder, an answer about a different certificate, an answer
nobody entitled to give it signed. Collapsing it into either of the others is
the mistake: as good it waves a withdrawn certificate through, as revoked it
rejects documents whenever a server is down. **Which to do is your policy**, so
it is reported rather than decided.

An answer is only read if the issuer signed it, or a delegate whose own
certificate the issuer signed, still valid and marked for answering — the
delegate travels inside the answer, so its name and usage alone prove nothing.
It has to be current: past its `nextUpdate`, dated ahead of this clock, or, with
no `nextUpdate`, more than a day old, it is `unknown`. And it is read at
`momentAt`: a certificate withdrawn after a verified timestamp's instant does
not taint the signature, while one withdrawn before now does, whatever time the
signer claimed.

The responder's address comes out of the certificate, which is to say from
whoever sent the document. Only public addresses are asked, judged on the
address the connection goes to rather than on how the URL is spelled, so a
name that resolves to your own network is refused as well. A redirect is not
followed, and an answer is read up to 64 KiB. The request goes through
`HttpClient` from `@c9up/ream/http-client`; pass `httpClient` to use another,
or its test fake.

An authority on your own network is named in `allowedResponders`, as a host
(`ocsp.internal`, on the default ports) or an origin
(`https://ocsp.internal:8443`):

```ts
// config/vellum.ts
export default defineConfig({
  allowedResponders: ['https://ocsp.internal:8443'],
})
```
