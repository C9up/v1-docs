# Vellum — PDF

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/vellum`
- Goal: convert PDF pages to images, read what a document holds, and reshape it
  — merge, split, rotate, stamp.

The work happens in Rust behind N-API, because PDF has no adequate JavaScript
implementation. This is a capability the platform lacks, not an optimisation of
one it has.

## Quick Examples

```ts
import vellum from '@c9up/vellum/services/main'

// A preview of the first page, 1200px wide
const preview = await vellum.render(pdf, { page: 1, width: 1200 })

// Every page as JPEG
const pages = await vellum.renderAll(pdf, { format: 'jpeg', quality: 82 })

// What the document holds
const { pageCount, encrypted } = await vellum.inspect(pdf)
const { title, author, createdAt } = await vellum.metadata(pdf)
const text = await vellum.extractText(pdf, { page: 1 })

// Reshaping it
const dossier = await vellum.merge([contract, annexe])
const extract = await vellum.selectPages(pdf, [1, 3, 4])
const parts = await vellum.split(pdf)
const upright = await vellum.rotate(scan, 90, { pages: [1] })

// Stamping it
const signed = await vellum.stamp(workOrder, signature, {
  page: 1, x: 380, y: 690, width: 140,
})
const marked = await vellum.stampText(invoice, 'PAID', {
  x: 400, y: 80, size: 24, color: '#c00', opacity: 0.6,
})
```

Every method is asynchronous. Rasterising an A4 page is around 30ms of pure
computation, so it runs on the libuv thread pool rather than on the thread
serving requests.

**Pages are numbered from 1** — the number printed on the page, not an array
index.

## Installation

```bash
ream configure @c9up/vellum
```

That registers the provider and writes `config/vellum.ts`:

```ts
import { defineConfig } from '@c9up/vellum'
import env from '#start/env'

export default defineConfig({
  format: env.get('VELLUM_FORMAT', 'png'),
  scale: 1,
  quality: 82,
  background: '#ffffff',
})
```

Every option is a default that any call can override.

The service is also a class, usable without a host:

```ts
import { Vellum } from '@c9up/vellum'

const vellum = new Vellum({ format: 'jpeg', quality: 82 })
```

## Rendering

| Option | Meaning |
| --- | --- |
| `page` | Which page to render, from 1. `render` only. |
| `scale` | Multiplier over natural size; 1 is 72 DPI. |
| `width` | Target width in pixels. Takes precedence over `scale`. |
| `format` | `"png"` (default) or `"jpeg"`. |
| `quality` | JPEG quality 1-100. Refused without `format: 'jpeg'`. |
| `background` | `#rgb`, `#rrggbb`, `#rrggbbaa` or `"transparent"`. Default opaque white. |

A PDF paints no background of its own, so the default is opaque white: rendering
it transparent makes black text invisible over a dark viewer.

`quality` without `format: 'jpeg'` is refused rather than ignored — a caller
passing a quality wants a lossy image, and answering with a multi-megabyte PNG
is a surprise nobody notices until previews crawl.

```ts
const sizes = await vellum.dimensions(pdf) // natural size, in points
```

## Reading

`inspect` reports the page count, the format version and whether the document is
encrypted. `metadata` reads the `/Info` dictionary — title, author, subject,
keywords, the applications involved, and the dates. Every field is optional,
because a PDF is valid with no `/Info` at all.

Dates come back as ISO 8601 when the producer wrote a conforming one, and as the
raw string it did write otherwise — reporting nothing would discard information.

`extractText` returns the text of one page, `extractTextAll` one entry per page.
Glyphs come back in the order the page draws them, with a line break where the
baseline moves. That order is the reading order in practice; no reordering by
coordinates is attempted, because doing it well needs column detection and doing
it badly makes multi-column pages worse. No spaces are invented either — a PDF
encodes its own.

A scanned document with no text layer yields an empty string rather than an
error: it has no text to give.

## Reshaping

`merge`, `selectPages`, `split` and `rotate` all move pages between page trees,
which is where PDF hides a trap: `Resources`, `MediaBox`, `CropBox` and `Rotate`
may live on a parent node and be *inherited* by the page. Re-parent such a page
naively and it loses its size — readers then fall back to Letter, quietly
resizing an A4 document. Every operation materialises the inherited attributes
onto the page first.

Rotation adds to whatever a page already carries, because a scan can arrive
already turned. The angle must be a multiple of 90.

## Stamping

`stamp` draws an image; `stampText` writes a line of text.

```ts
await vellum.stamp(pdf, signature, { page: 1, x: 380, y: 690, width: 140 })
await vellum.stampText(pdf, 'DRAFT', { size: 48, opacity: 0.15 })
```

Coordinates count from the **top-left** corner, the way a screen layout is
written. For `stampText`, `y` is the text's baseline. Naming no page stamps every
page, which is what a watermark wants.

Images are PNG or JPEG, chosen by file signature rather than by name. Giving
`width` alone keeps the aspect ratio.

Both write into the document that already exists rather than re-authoring it,
which is what lets the document survive being stamped on: its **interactive
form, its annotations and its links are all still there** afterwards. A
signature is stamped onto exactly the kind of document that has all three.

A JPEG goes in untouched, so a photograph stays the size it arrived at — a
photo report does not become something nobody can email. A PNG's alpha channel
becomes a soft mask, which is what makes a signature drawn on a tablet
transparent everywhere but the stroke. A CMYK JPEG is refused rather than
silently inverted.

`stampText` uses the 14 standard fonts — `Helvetica`, `Helvetica-Bold`,
`Helvetica-Oblique`, `Times-Roman`, `Times-Bold`, `Times-Italic`, `Courier`,
`Courier-Bold` — which a PDF may reference without embedding. Nothing is added to
the file and no font has to be supplied. The trade-off is the WinAnsi character
set: Western European text is covered, accents and typographic punctuation
included, and anything outside it is **refused rather than mangled** — silently
dropping a character from a contract is worse than failing.

### Supplying your own

Declare it in `config/vellum.ts` and ask for it by name:

```ts
export default defineConfig({
  fonts: { body: app.makePath('resources/fonts/Inter-Regular.ttf') },
})

await vellum.stampText(pdf, 'Uměl Řehoř', { font: 'body' })
```

That lifts the WinAnsi limit, at the cost of carrying the glyphs. The font is
**subsetted to the characters actually written** — embedding a family whole
would put megabytes into every stamped document — and a `/ToUnicode` table goes
in with it, without which the text would be drawn correctly and still be
impossible to select, copy or search.

A configured name is looked up **before** the standard fonts, so calling one
`Helvetica` shadows the standard one. A name that is not configured falls
through, which is what keeps `font: 'Times-Roman'` working with no
configuration at all. A character the supplied font has no glyph for is refused
by name.

## Errors

Failures raise `VellumError`, carrying a `code`:

| Code | Raised when |
| --- | --- |
| `E_VELLUM_NAPI_REQUIRED` | The native engine is not loadable on this platform |
| `E_VELLUM_INVALID_PDF` | The bytes are not a readable PDF |
| `E_VELLUM_INVALID_PAGE` | A page number below 1 |
| `E_VELLUM_INVALID_ROTATION` | An angle that is not a whole multiple of 90 |
| `E_VELLUM_RENDER_FAILED` | Rasterising failed |
| `E_VELLUM_EXTRACT_FAILED` | Text extraction failed |
| `E_VELLUM_MERGE_FAILED` · `E_VELLUM_SELECT_FAILED` · `E_VELLUM_SPLIT_FAILED` · `E_VELLUM_ROTATE_FAILED` | The operation failed |
| `E_VELLUM_STAMP_FAILED` · `E_VELLUM_STAMP_TEXT_FAILED` | Stamping failed |

The engine is **not optional**: there is no JavaScript fallback, so a missing
binary is a hard failure with an actionable message rather than a silent
degradation that lets one deployment behave differently from another.

## Guardrails

Every input is treated as hostile, because these documents come from uploads:

- Engine work runs behind a panic net — a panic on a worker thread would abort
  the whole process.
- The rendered size is bounded; an unbounded `scale` is a memory-exhaustion
  vector.
- A malformed colour is refused rather than falling back to white, which would
  be a wrong render nobody reports.
- Text written onto a page is escaped, so a document title cannot inject content
  stream operators.

## Interactive forms

`formFields` lists a document's AcroForm fields in declaration order; `name` is
the fully qualified name — every ancestor's partial name joined with dots —
which is the name a field is filled in by.

```ts
const fields = await vellum.formFields(mandate)

const filled = await vellum.fillForm(mandate, {
  'insured.name': 'Amélie Durand',
  accepted: 'Yes',
  country: 'CH',
})

// Close it: the answers become ink, the fields go away
const closed = await vellum.flattenForm(filled)
```

Three details of PDF 32000-1 §12.7.3 this resolves for the caller:

- A field's type, flags and value are **inherited** down `/Parent`, so a field
  commonly declares none of them itself.
- A checkbox or radio's "on" state is chosen by the **document** (`/Yes`,
  `/On`, `/1`, …), not fixed by the spec. Those accepted states are reported in
  `options`; writing anything else leaves the control untouched.
- For a choice field, `options` reports the **exported** values rather than the
  labels, since the export value is what gets written back.

`fillForm` regenerates each filled field's **appearance stream**. That half is
the one that matters: most readers paint a field from its appearance, not from
its value, so a document filled without it opens looking empty while holding
every answer.

Refusals are loud rather than silent, because a filled document quietly missing
an answer is worse than a failure. An unknown field name (the error lists the
names that do exist), a read-only field, a value over the declared maximum
length, a choice the form does not offer and a checkbox state the document does
not accept are all errors.

### How the text is laid out

A standard font is referenced without being embedded, so the reader lays the
text out with the **published widths**. Filling measures with those same
widths, which is what lets it place text where the reader will:

- The field's `/Q` is honoured — left, centred or right.
- A **multiline** field wraps at the width of its box, on top of any line
  breaks you write yourself.
- A `/DA` asking for size **0** — "whatever fits" — gets a size chosen by
  stepping down until the answer fits the box. The specification does not
  define what auto means, so this is a heuristic.
- A word too long for its line is **broken across lines** rather than left to
  run past the edge, where the appearance's bounding box would clip it away.

The widths are generated from the URW base-35 metrics and cross-checked against
published Adobe values in the tests, so a table that had drifted could not
reach a release.

## Flattening

A filled form is still a form: anyone who opens it can edit the answers back.
`flattenForm` closes it. Every widget's appearance becomes ordinary page
content, the widget annotations are removed, and the form itself is dropped.
What comes back looks the same and is no longer interactive.

Where each appearance lands follows §12.5.5: its `/BBox` is transformed by its
`/Matrix`, and the box that results is mapped onto the annotation's `/Rect`.
Painting at the rectangle's corner instead would misplace every appearance
whose form matrix is not the identity — which is most of the ones a real form
ships. The page's own content is wrapped in `q`/`Q` first, because a `cm`
outside any such pair is legal and never restored, and appended content would
otherwise inherit a transform it never asked for.

Three things it deliberately does not do:

- Annotations that are **not form widgets** — links, notes — are left where
  they are. Flattening removes the form, not the document's other furniture.
- A **hidden** widget is dropped without being painted. Making visible what a
  document hid is not preservation.
- A field holding a value that ships **no appearance to paint** is an error,
  not a silent erasure: the answer would vanish from a document that still
  looks complete.

## Signing

A PDF signature covers a byte range **of the document it lives in**, which
rules out the usual order: the value cannot be computed and then assembled,
because assembling it would change what it covers. The document is written with
a hole where the value goes, `/ByteRange` records everything but the hole, and
the value is dropped into the reserved space without moving another byte.

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
without disturbing the signature. What comes back is checked rather than
trusted: the authority's status, that it stamped the signature actually sent,
and that it answered *this* request rather than replaying an older answer. A
token that cannot be read is refused.

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
happily call such a document signed.

The report also names the signer, the time they stated, and whether an
authority has timestamped it. A document with no signatures reports none —
that is an answer, not a failure.

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

The path is judged **at the moment of signing**, not now: a certificate valid
then and expired since did not retroactively unsign anything. `moment` says
where that instant came from — `"timestamp"` if an authority vouched for it,
`"claimed"` if it rests on the signer's own word. That is the concrete reason
timestamping is worth the round trip.

Every link is checked: each certificate is signed by the one above it, each
issuer says it is an authority, and the signing certificate is allowed to sign
at all.

**Revocation is not checked.** A certificate withdrawn after it was issued
still looks valid here, because knowing otherwise means asking OCSP or a CRL
over the network, and the engine does no I/O.

## Not yet

Two things this package cannot supply for you. An adapter for a **certified
provider** — a short function returning a `Signer`, which belongs to whoever
has the account. And a **revocation check**, which means asking OCSP or a CRL
over the network.
