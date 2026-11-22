# QR codes

This guide covers QR codes and Swiss QR-bills:

- Styling
- Swiss QR-bills

## QR codes

`qrcode` writes a QR code as SVG — the output to reach for on a page, sharp at
every size and a few hundred bytes — or as PNG, WebP or AVIF through the same
encoders as the rest of Prism:

```ts
import { qrcode } from '@c9up/prism'

const svg = await qrcode.toString(uri)                               // SVG
const png = await qrcode.toBuffer(uri, { width: 300 })               // PNG
const avif = await qrcode.toBuffer(uri, { type: 'avif', margin: 2 })
const src = await qrcode.toDataURL(uri, { type: 'svg' })             // <img src>
```

| Option | Default | |
|---|---|---|
| `errorCorrectionLevel` | `M` | `L`, `M`, `Q`, `H` (or `low` … `high`): about 7 to 30 % of the symbol may be lost |
| `version` | smallest that fits | 1 to 40 |
| `margin` | `4` | quiet zone, in modules — what scanners expect |
| `scale` | `4` | pixels per module |
| `width` | — | side in pixels; wins over `scale` once it holds the symbol |
| `color.dark` / `color.light` | `#000000ff` / `#ffffffff` | hex, `#rgb` to `#rrggbbaa`; a transparent light colour drops the background |
| `type` | `svg` (`toString`), `png` | `png`, `webp`, `avif`, `svg`, or their MIME types |
| `rendererOpts.quality` | `100` | WebP and AVIF; 100 is lossless for WebP — lossy edges make scanners hesitate |

The SVG is one `path` of horizontal runs, a `viewBox`, and
`shape-rendering="crispEdges"`.

Everything may come from a request, so everything is bounded: text beyond what
a QR code holds at the chosen level is `E_PRISM_QR_TOO_LONG`; an image over
4096 pixels a side, a margin over 64, a version outside 1–40, a colour that is
not strict hex or a dark colour with less than 3:1 contrast against the light
one is `E_PRISM_INVALID_QR_OPTION`, never a quiet fallback. The SVG is written from the parsed colour channels, never from the
string given, so a colour cannot inject markup.

`toString` writes SVG only, and WebP and AVIF are available on the server.

### Styling

Styling options change how the code is drawn:
module shapes, the finder patterns, colours or gradients, a rounded background
and a logo. The same options style the SVG and the images, which are that SVG
rendered.

```ts
const svg = await qrcode.toString(url, {
  dotsOptions: {
    type: 'classy-rounded',
    gradient: {
      type: 'linear',
      rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: '#1e3a8a' },
        { offset: 1, color: '#7c3aed' },
      ],
    },
  },
  cornersSquareOptions: { type: 'extra-rounded', color: '#111827' },
  cornersDotOptions: { type: 'dot', color: '#be123c' },
  backgroundOptions: { round: 0.15, color: '#f8fafc' },
  image: await readFile(app.makePath('resources/logo.png')),
})
```

| Option | Values |
|---|---|
| `dotsOptions.type` | `square` (default), `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded` — the rounded shapes follow their neighbours |
| `cornersSquareOptions.type` | the finders' 7 × 7 frames: `square`, `dot`, `extra-rounded`, or a module shape; unset, drawn as the modules are |
| `cornersDotOptions.type` | the finders' 3 × 3 centres: `square`, `dot`, or a module shape other than `dots` |
| `….color` | hex; the frames default to the modules' colour, the centres to the frames' |
| `….gradient` | `{ type: 'linear' \| 'radial', rotation, colorStops }`, 1 to 16 stops; wins over `color` |
| `backgroundOptions` | `color` (default `color.light`), `gradient`, `round` from 0 (square) to 1 (a circle) |
| `image` | the logo's bytes — PNG, JPEG or WebP |
| `imageOptions.imageSize` | share of the error correction the logo may cover, above 0 and up to `0.5`; default `0.4` |
| `imageOptions.margin` | space around the logo, in modules; default `0` |
| `imageOptions.hideBackgroundDots` | leave out the modules under the logo; default `true` |

Lengths stay in modules, so `margin`, `scale` and `width` mean what they mean
above. The logo is an upload like any other: it goes through Prism's probe and
limits, is decoded, and is embedded re-encoded as PNG — never fetched from a
URL. With a logo the error correction defaults to `H`, and the area it hides is
sized from the level's recovery capacity.

A code must still scan, so what would not is refused with
`E_PRISM_INVALID_QR_OPTION`: an `imageSize` over 0.5, a colour or gradient stop
with less than 3:1 contrast against the background (WCAG's figure for graphics;
a transparent background is not judged), and finder centres drawn as nine
separate `dots`, which ZXing — the decoder behind most phone scanners — does not
find. With `dots` modules and no `cornersDotOptions.type`, the centres are one
round `dot` instead. Every style is read back by ZXing in the tests.

### Swiss QR-bills

The payment slip at the foot of a Swiss invoice — receipt, payment part and the
QR code with its Swiss cross — under `@c9up/prism/swissqrbill/*`, split into
`pdf`, `svg`, `utils`, `errors` and `types`.

```ts
import PDFDocument from 'pdfkit'
import { SwissQRBill } from '@c9up/prism/swissqrbill/pdf'
import { SwissQRBill as SwissQRBillSVG } from '@c9up/prism/swissqrbill/svg'
import { ValidationError } from '@c9up/prism/swissqrbill/errors'
import { calculateQRReferenceChecksum, isQRIBAN } from '@c9up/prism/swissqrbill/utils'

const data = {
  amount: 1199.95,
  currency: 'CHF',
  creditor: {
    account: 'CH44 3199 9123 0008 8901 2',
    name: 'Robert Schneider AG',
    address: 'Rue du Lac',
    buildingNumber: 1268,
    zip: 2501,
    city: 'Biel',
    country: 'CH',
  },
  reference: '210000000003139471430009017',
}

const doc = new PDFDocument({ size: 'A4' })
new SwissQRBill(data, { language: 'FR' }).attachTo(doc)  // vector, into your document
doc.end()

const svg = new SwissQRBillSVG(data).toString()
```

The constructor validates: wrong data throws a `ValidationError` before
anything is drawn. `attachTo(doc)` draws the slip at the foot of the current
page when it fits, on a new page otherwise. It draws vector content (text,
lines and the QR code) into the PDFKit document the application owns, so the
text stays selectable. PDFKit is the application's dependency, not Prism's.
`SwissQRCode` draws the QR code alone, and `utils` holds the IBAN, reference
and amount helpers.

The QR code is encoded by the engine with the mask the Swiss reference encoder
picks, so it is the same symbol module for module. A `ValidationError` carries a code
and a message (`CREDITOR_ACCOUNT_IS_INVALID`, `QR_REFERENCE_IS_INVALID`…) to
branch on.

Worth knowing:

- data too long for the QR code is refused by the constructor with
  `E_PRISM_QR_TOO_LONG`, not halfway through drawing;
- the SVG draws the QR code as one path rather than a rectangle per module:
  the whole slip weighs about 12 KB;
- SVG attributes are escaped;
- a character outside the font width tables does not break an SVG address
  one word per line;
- a creditor reference (`RF…`) is checked without regard to case, as
  ISO 11649 reads.

The SVG classes return a string (no DOM element).
