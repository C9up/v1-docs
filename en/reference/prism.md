# prism

`@c9up/prism`: image processing for ream on a Rust engine: inspect, resize, crop, rotate, composite, watermark, filter and convert images, serve responsive variants, draw QR codes and Swiss QR-bills. Guide: [Images](/en/guides/digging-deeper/images/).

## Installation

```bash
pnpm add @c9up/prism
ream configure @c9up/prism
```

`ream configure @c9up/prism` adds the provider, the `IMAGE_MAX_PIXELS` variable, and writes `config/images.ts`. The engine ships as a prebuilt binary per platform; `@c9up/ream` is an optional peer.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/prism` | `Prism` and its `Pipeline`, `defineConfig`, the image endpoint, `qrcode`, the types and the error classes. |
| `@c9up/prism/provider` | `PrismProvider` (default export). |
| `@c9up/prism/services/main` | The application's `Prism` (default export), usable once the provider booted. |
| `@c9up/prism/configure` | `configure(codemods)`, run by `ream configure @c9up/prism`. |
| `@c9up/prism/testing` | `fakeImages()`. |
| `@c9up/prism/swissqrbill/pdf` | `SwissQRBill` and `SwissQRCode` drawn into a PDFKit document. |
| `@c9up/prism/swissqrbill/svg` | `SwissQRBill` and `SwissQRCode` as SVG. |
| `@c9up/prism/swissqrbill/utils` | IBAN, reference and amount helpers, unit conversions. |
| `@c9up/prism/swissqrbill/errors` | `ValidationError` and its codes. |
| `@c9up/prism/swissqrbill/types` | The QR-bill data and option types. |

## Exports

### `@c9up/prism`

| Export | Kind | Description |
|---|---|---|
| `Prism` | class | The image engine an application holds. |
| `Pipeline` | class | Operations queued over one image, run once on `toBuffer`. |
| `defineConfig` | function | Types `config/images.ts`. |
| `registerImageRoute` | function | Mounts the image transformation endpoint. |
| `DEFAULT_WIDTHS` | const | The widths the endpoint allows by default. |
| `ImageHttpContext`, `ImageRouter` | interface | The HTTP context and router the endpoint needs. |
| `qrcode` | const | `toString`, `toBuffer`, `toDataURL`: QR codes as SVG or images. |
| `QRCodeOptions` and the other `QRCode*` types | type | The QR code options. |
| `isNativeAvailable` | function | Whether the Rust engine is loaded. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |
| `PRISM_CODES` | const | The engine's codes, without the `E_PRISM_` prefix. |
| `PrismCode` | type | One of `PRISM_CODES`. |
| `PrismConfig`, `Limits`, `ImageServingConfig` | type | The configuration. |
| `ReadableFormat`, `ImageFormat` | type | The formats the engine reads and writes. |
| `Metadata` | type | What `inspect` returns. |
| `Operation` | type | One queued operation, a union on `kind`. |
| `OutputOptions` | type | Options of `toBuffer`. |
| `ResizeOptions`, `CropOptions`, `CompositeOptions`, `WatermarkTextOptions`, `ThumbnailOptions`, `SharpenOptions`, `ConvertColorSpaceOptions` | type | Operation options. |
| `Fit`, `Colour`, `ColorSpace` | type | Option values. |

### `Prism`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Prism(config?: PrismConfig)` | |
| `config` | `config(): PrismConfig` | The configuration it was built with. |
| `inspect` | `inspect(bytes: Buffer, limits?: Limits): Metadata` | Identifies the image from its content and describes it without decoding the pixels. |
| `edit` | `edit(bytes: Buffer): Pipeline` | Starts a pipeline over an encoded image. |

### `Pipeline`

Every operation queues and returns `this`; nothing touches the engine until `toBuffer` or `toFormat`, which decode, run every operation and encode once.

| Member | Signature | Description |
|---|---|---|
| `resize` | `resize(options: ResizeOptions): this` | `{ width?, height?, fit? }`, `fit` defaulting to `'cover'`. |
| `crop` | `crop(options: CropOptions): this` | `{ x, y, width, height }`. |
| `rotate` | `rotate(degrees: number): this` | A multiple of 90; negative and over-360 values are normalised. |
| `flip` | `flip(axis: 'horizontal' \| 'vertical'): this` | |
| `composite` | `composite(options: CompositeOptions): this` | Overlays an encoded `image` at `x`, `y` (signed, default 0) with `opacity` 0–1 (default 1); the overlay goes through the same guards as the input. |
| `watermarkText` | `watermarkText(options: WatermarkTextOptions): this` | Draws `text` with `font` (the font's bytes; none is bundled), `size` (default 32), `color` (default opaque white), `x`, `y`. |
| `thumbnail` | `thumbnail(options: ThumbnailOptions): this` | Fast box downscale, `{ width?, height?, exact? }`; softer than `resize`. |
| `blur` | `blur(sigma: number): this` | Gaussian blur. |
| `fastBlur` | `fastBlur(sigma: number): this` | Box-approximated blur, far cheaper. |
| `sharpen` | `sharpen(options: SharpenOptions): this` | Unsharp mask: `sigma` above 0 up to 100, `threshold` 0–65535 (default 0). |
| `brighten` | `brighten(value: number): this` | -255 to 255. |
| `contrast` | `contrast(value: number): this` | -255 to 255. |
| `hueRotate` | `hueRotate(value: number): this` | Degrees; wraps. |
| `invert` | `invert(): this` | |
| `grayscale` | `grayscale(): this` | |
| `filter3x3` | `filter3x3(kernel: readonly number[]): this` | A 3×3 convolution, row-major, exactly nine values. |
| `convertColorSpace` | `convertColorSpace(options: ConvertColorSpaceOptions): this` | Converts the samples `to` a colour space; `from` overrides what the file claims. |
| `operations` | `operations(): readonly Operation[]` | The operations queued so far. |
| `toBuffer` | `toBuffer(output: OutputOptions): Promise<Buffer>` | Runs everything and encodes. |
| `toFormat` | `toFormat(format: ImageFormat, quality?: number): Promise<Buffer>` | `toBuffer` naming only the format. |

| `OutputOptions` field | Type | Default | Description |
|---|---|---|---|
| `format` | `ImageFormat` | required | |
| `quality` | `number` | config `quality`, else 82 | An integer 1–100, for formats with a quality setting. |
| `background` | `Colour` | opaque white | What transparency is blended against for a format without alpha. |
| `depth` | `8 \| 16` | `8` | Bits per channel; only PNG and TIFF carry 16, others narrow it back. |
| `effort` | `number` | `4` | AVIF CPU effort, 0 (fastest) to 9. |

| Type | Values |
|---|---|
| `ReadableFormat` | `'jpeg' \| 'png' \| 'webp' \| 'gif' \| 'bmp' \| 'ico' \| 'tiff' \| 'tga' \| 'qoi' \| 'pnm' \| 'dds' \| 'farbfeld' \| 'hdr' \| 'openexr' \| 'avif'` |
| `ImageFormat` | `ReadableFormat` without `'dds'` (readable, not writable). |
| `Fit` | `'fill'` (exact size, distorts), `'contain'` (fits inside), `'cover'` (fills and crops, centred), `'inside'` (as `contain`, never enlarges). |
| `Colour` | `{ r: number; g: number; b: number; a?: number }`, 0–255. |
| `ColorSpace` | `'srgb' \| 'linear-srgb' \| 'display-p3' \| 'dci-p3' \| 'rec709'` |

| `Metadata` field | Type | Description |
|---|---|---|
| `width`, `height` | `number` | From the header. |
| `orientedWidth`, `orientedHeight` | `number` | After the EXIF orientation is applied. |
| `orientation` | `number` | EXIF orientation, 1–8; `1` when there is none. |
| `format` | `ImageFormat \| string` | Established from the content. |
| `hasAlpha` | `boolean` | |
| `colorSpace` | `string` | The colour space the file declares (`srgb` when it declares none). |

### Image endpoint

| Function | Signature | Description |
|---|---|---|
| `registerImageRoute` | `registerImageRoute(router: ImageRouter, images: Prism, config: ImageServingConfig): unknown` | Mounts `GET <path>?src=&w=&f=&q=`; returns what the router returns, so middleware can be added. Every axis is allow-listed and a request outside the lists is refused before any decode; answers carry no EXIF and a sandboxing CSP. The provider calls it when `serve` is configured. |

`DEFAULT_WIDTHS` is `16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560, 3200, 3840, 4480, 5120, 6016`.

### `qrcode`

| Member | Signature | Description |
|---|---|---|
| `toString` | `toString(text: string, options?: QRCodeToStringOptions): Promise<string>` | The QR code as an SVG document. |
| `toBuffer` | `toBuffer(text: string, options?: QRCodeToBufferOptions): Promise<Buffer>` | PNG by default, or WebP, AVIF, SVG (`type`); `rendererOpts.quality` 1–100 for WebP and AVIF (default 100). |
| `toDataURL` | `toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>` | A `data:` URL for an `<img src>`. |

| `QRCodeOptions` field | Type | Default | Description |
|---|---|---|---|
| `errorCorrectionLevel` | `QRCodeErrorCorrectionLevel` | `'M'`, `'H'` with a logo | `L`, `M`, `Q`, `H` or `low`, `medium`, `quartile`, `high`. |
| `version` | `number` | smallest that fits | 1–40. |
| `margin` | `number` | `4` | Quiet zone, in modules. |
| `scale` | `number` | `4` | Pixels per module. |
| `width` | `number` | | Side in pixels; wins over `scale` once it holds the symbol. |
| `color` | `{ dark?: string; light?: string }` | black on white | Hex, `#rgb` to `#rrggbbaa`. |
| `dotsOptions` | `QRCodeFigureOptions<QRCodeDotType>` | `square` | `type` (`square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`), `color`, `gradient`. |
| `cornersSquareOptions` | `QRCodeFigureOptions<QRCodeCornerSquareType>` | as the modules | The finders' frames. |
| `cornersDotOptions` | `QRCodeFigureOptions<QRCodeCornerDotType>` | as the modules | The finders' centres; `dots` is refused. |
| `backgroundOptions` | `{ round?: number; color?: string; gradient?: QRCodeGradient }` | | `round` 0 (square) to 1 (circle). |
| `image` | `Uint8Array` | | A logo: PNG, JPEG or WebP bytes. |
| `imageOptions` | `{ imageSize?: number; margin?: number; hideBackgroundDots?: boolean }` | `0.4`, `0`, `true` | `imageSize` at most 0.5. |

`QRCodeGradient` is `{ type?: 'linear' | 'radial'; rotation?: number; colorStops: Array<{ offset: number; color: string }> }` with 1 to 16 stops. Anything drawn must keep a 3:1 contrast with the background. Invalid options are refused with `E_PRISM_INVALID_QR_OPTION`.

### `@c9up/prism/provider`

| Export | Kind | Description |
|---|---|---|
| `PrismProvider` | provider (default) | `register()` binds `Prism` from the `images` config (loading no binary); `boot()` publishes the service and mounts the image endpoint when `serve` is set and a `router` binding exists; `shutdown()` clears the service. |

### `@c9up/prism/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `Prism`. Any property access before the provider booted throws. |

### `@c9up/prism/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: what `ream configure @c9up/prism` runs. |

### `@c9up/prism/testing`

| Export | Kind | Description |
|---|---|---|
| `fakeImages` | function | `fakeImages(config?: PrismConfig): { images: Prism; restore: () => void }`: publishes a real `Prism` on `services/main` for a test; `restore()` clears it. |

### `@c9up/prism/swissqrbill/pdf`

Draws into a PDFKit document the caller owns; PDFKit is not a dependency. The constructors clean and validate the data and encode the QR code, throwing `ValidationError` or `E_PRISM_QR_TOO_LONG`.

| Export | Signature | Description |
|---|---|---|
| `SwissQRBill` | `new SwissQRBill(data: Data, options?: PDFOptions)` | The payment slip, 210 × 105 mm. |
| `SwissQRBill.attachTo` | `attachTo(doc: PDFKitDocument, x?: number, y?: number): void` | Draws the slip, at the page bottom by default; adds a slip-sized page when the current one has no room. |
| `SwissQRBill.isSpaceSufficient` | `static isSpaceSufficient(doc: PDFKitDocument, x?: number, y?: number): boolean` | Whether the slip fits at that position. |
| `SwissQRBill.width`, `SwissQRBill.height` | `static readonly number` | The slip's size in points. |
| `SwissQRCode` | `new SwissQRCode(data: Data, size?: number)` | The QR code alone, `size` in mm (default 46); `attachTo(doc, x?, y?)`. |
| `PDFKitDocument`, `PDFKitTextOptions` | interface | The part of a PDFKit document the bill draws with. |
| `Data`, `PDFOptions` | type | Re-exported from `swissqrbill/types`. |

### `@c9up/prism/swissqrbill/svg`

| Export | Signature | Description |
|---|---|---|
| `SwissQRBill` | `new SwissQRBill(data: Data, options?: SVGOptions)` | The slip as SVG; `toString(): string`. |
| `SwissQRCode` | `new SwissQRCode(data: Data, size?: number)` | The QR code alone as SVG; `toString(): string`. |
| `Data`, `SVGOptions` | type | Re-exported from `swissqrbill/types`. |

### `@c9up/prism/swissqrbill/utils`

| Function | Signature |
|---|---|
| `isQRIBAN`, `isIBANValid` | `(iban: string): boolean` |
| `formatIBAN` | `(iban: string): string` |
| `isQRReference`, `isQRReferenceValid`, `isSCORReference`, `isSCORReferenceValid` | `(reference: string): boolean` |
| `calculateQRReferenceChecksum`, `calculateSCORReferenceChecksum` | `(reference: string): string` |
| `formatQRReference`, `formatSCORReference`, `formatReference` | `(reference: string): string` |
| `getReferenceType` | `(reference: string \| undefined): 'NON' \| 'QRR' \| 'SCOR'` |
| `formatAmount` | `(amount: number): string` |
| `mm2pt`, `pt2mm`, `mm2px`, `px2mm` | `(value: number): number` |

### `@c9up/prism/swissqrbill/errors`

| Export | Kind | Description |
|---|---|---|
| `ValidationError` | error | A QR-bill the Swiss rules refuse; a flare `Exception`. Its `code` is a key of `ValidationErrors` (such as `ACCOUNT_IS_QR_IBAN_BUT_REFERENCE_IS_MISSING`), not an `E_` code. |
| `ValidationErrors` | const | Every validation code and its message. |
| `ValidationErrorCode` | type | `keyof typeof ValidationErrors`. |

### `@c9up/prism/swissqrbill/types`

| Type | Shape |
|---|---|
| `Data` | `{ creditor: Creditor; currency: 'CHF' \| 'EUR'; amount?: number; reference?: string; message?: string; additionalInformation?: string; av1?: string; av2?: string; debtor?: Debtor }` |
| `Debtor` | `{ name: string; address: string; buildingNumber?: number \| string; zip: number \| string; city: string; country: string }` |
| `Creditor` | `Debtor & { account: string }` |
| `SVGOptions` | `{ fontName?: FontName; language?: Language; outlines?: boolean; renderAdditionalInformation?: boolean; scissors?: boolean }` |
| `PDFOptions` | `SVGOptions` fields plus `separate?: boolean` |
| `Language` | `'DE' \| 'EN' \| 'FR' \| 'IT' \| 'RM'` (default `DE`) |
| `FontName` | `'Arial' \| 'Frutiger' \| 'Helvetica' \| 'Liberation Sans'` (default Helvetica in a PDF, Arial in an SVG) |
| `Currency` | `'CHF' \| 'EUR'` |

## Configuration

`config/images.ts`, written by `ream configure @c9up/prism`:

| Option | Type | Default | Description |
|---|---|---|---|
| `limits.maxPixels` | `number` | `50000000` | Largest decoded pixel count, checked before decoding. The generated config reads `IMAGE_MAX_PIXELS`. |
| `limits.maxBytes` | `number` | `67108864` (64 MiB) | Largest input accepted. |
| `limits.allowedFormats` | `readonly ReadableFormat[]` | `['jpeg', 'png', 'webp']` | Formats this application decodes; an unknown name raises. |
| `quality` | `number` | `82` | Default output quality. |
| `autoOrient` | `boolean` | `true` | Apply the EXIF orientation on decode. |
| `serve` | `ImageServingConfig` | none | Mounts the image endpoint; absent, no route is added. |
| `serve.path` | `string` | `'/__image'` | Route path. |
| `serve.roots` | `readonly string[]` | required | Absolute directories a `src` may resolve inside; an empty list is refused at boot. |
| `serve.widths` | `readonly number[]` | `DEFAULT_WIDTHS` | Widths that may be requested. |
| `serve.formats` | `readonly ImageFormat[]` | AVIF, WebP, JPEG, PNG | Formats that may be requested. |
| `serve.qualities` | `readonly number[]` | `[serve.quality]` | Qualities that may be requested. |
| `serve.quality` | `number` | `82` | Quality when the request names none. |
| `serve.cacheDir` | `string` | | Keeps rendered variants on disk. |
| `serve.memoryCacheBytes` | `number` | 32 MiB | Without `cacheDir`, the in-memory cache size; 0 turns it off. |
| `serve.maxAge` | `number` | one year | `max-age`, in seconds. |
| `serve.concurrency` | `number` | `2` | Renders run at once; keep it below `UV_THREADPOOL_SIZE`. |
| `serve.queueLimit` | `number` | `64` | Renders allowed to wait; past it, 503 with `Retry-After`. |
| `serve.effort` | `number` | `1` | AVIF encoding effort for the endpoint. |

## Container bindings

| Token | Resolves to |
|---|---|
| `Prism` | The `Prism` singleton. |
| `'prism.images'` | The same instance. |
| `'images'` | The same instance. |

The string tokens are declared on `ContainerBindings`.

## Errors

The `E_PRISM_IMAGE_*` codes are not thrown: the image endpoint answers them as `{ error: { code, message } }` with the status shown. Every other code is a class of the `errors` namespace (`import { errors } from '@c9up/prism'`): a flare `Exception` with `code` and `status`. The engine refusals that mean the input is not an image prism takes (`E_PRISM_EMPTY_INPUT`, `E_PRISM_INPUT_TOO_LARGE`, `E_PRISM_TOO_MANY_PIXELS`, `E_PRISM_ZERO_DIMENSION`, `E_PRISM_UNKNOWN_FORMAT`, `E_PRISM_UNSUPPORTED_FORMAT`, `E_PRISM_FORMAT_NOT_ALLOWED`, `E_PRISM_UNREADABLE`, `E_PRISM_DECODE_FAILED`) have status 422; the others 500.

| Code | Raised when |
|---|---|
| [`E_PRISM_IMAGE_NO_SOURCE`](/en/reference/errors#e-prism-image-no-source) | The endpoint was called without `src` (400). |
| [`E_PRISM_IMAGE_WIDTH_NOT_ALLOWED`](/en/reference/errors#e-prism-image-width-not-allowed) | `w` is not a configured width (400). |
| [`E_PRISM_IMAGE_FORMAT_NOT_ALLOWED`](/en/reference/errors#e-prism-image-format-not-allowed) | `f` is not a configured format (400). |
| [`E_PRISM_IMAGE_QUALITY_NOT_ALLOWED`](/en/reference/errors#e-prism-image-quality-not-allowed) | `q` is not a configured quality (400). |
| [`E_PRISM_IMAGE_NOT_FOUND`](/en/reference/errors#e-prism-image-not-found) | No image at `src` (404). |
| [`E_PRISM_IMAGE_UNPROCESSABLE`](/en/reference/errors#e-prism-image-unprocessable) | The source is not an image the endpoint can serve (422). |
| [`E_PRISM_IMAGE_BUSY`](/en/reference/errors#e-prism-image-busy) | Too many renders are waiting (503). |
| [`E_PRISM_EMPTY_INPUT`](/en/reference/errors#e-prism-empty-input) | The input is empty. |
| [`E_PRISM_INPUT_TOO_LARGE`](/en/reference/errors#e-prism-input-too-large) | The input is over `maxBytes`. |
| [`E_PRISM_TOO_MANY_PIXELS`](/en/reference/errors#e-prism-too-many-pixels) | The image, or one an operation would build, is over `maxPixels`. |
| [`E_PRISM_ZERO_DIMENSION`](/en/reference/errors#e-prism-zero-dimension) | The image has a zero width or height. |
| [`E_PRISM_UNKNOWN_FORMAT`](/en/reference/errors#e-prism-unknown-format) | The bytes are not an image format prism recognises. |
| [`E_PRISM_UNSUPPORTED_FORMAT`](/en/reference/errors#e-prism-unsupported-format) | The format is recognised but not supported. |
| [`E_PRISM_FORMAT_NOT_ALLOWED`](/en/reference/errors#e-prism-format-not-allowed) | The format is not in `allowedFormats`. |
| [`E_PRISM_UNREADABLE`](/en/reference/errors#e-prism-unreadable) | The image cannot be read. |
| [`E_PRISM_DECODE_FAILED`](/en/reference/errors#e-prism-decode-failed) | Decoding failed. |
| [`E_PRISM_ENCODE_FAILED`](/en/reference/errors#e-prism-encode-failed) | Encoding the output failed. |
| [`E_PRISM_INVALID_GEOMETRY`](/en/reference/errors#e-prism-invalid-geometry) | A crop outside the image, a target size of zero. |
| [`E_PRISM_INVALID_FONT`](/en/reference/errors#e-prism-invalid-font) | A font cannot be used. |
| [`E_PRISM_COLOUR_SPACE`](/en/reference/errors#e-prism-colour-space) | A colour space cannot be named, or a conversion is refused. |
| [`E_PRISM_INVALID_OPERATION`](/en/reference/errors#e-prism-invalid-operation) | An operation lacks a field or has one out of range. |
| [`E_PRISM_QR_TOO_LONG`](/en/reference/errors#e-prism-qr-too-long) | More text than a QR code can hold at the chosen level and version. |
| [`E_PRISM_INVALID_QR_OPTION`](/en/reference/errors#e-prism-invalid-qr-option) | A QR code option is out of range, or a colour is not strict hex. |
| [`E_PRISM_INTERNAL_PANIC`](/en/reference/errors#e-prism-internal-panic) | The engine panicked. |
| [`E_PRISM_ENGINE`](/en/reference/errors#e-prism-engine) | The engine failed without a known code. |
| [`E_PRISM_NATIVE_REQUIRED`](/en/reference/errors#e-prism-native-required) | The Rust image engine is not loaded. |
| [`E_PRISM_NOT_BOOTED`](/en/reference/errors#e-prism-not-booted) | The `services/main` engine was used before `PrismProvider` booted or `setPrism()` was called. |
| [`E_PRISM_INVALID_CONFIG`](/en/reference/errors#e-prism-invalid-config) | `config/images.ts` does not export a `defineConfig({ ... })` config. |
| [`E_PRISM_INVALID_SERVE_CONFIG`](/en/reference/errors#e-prism-invalid-serve-config) | `images.serve` declares no roots, or one of its counts (`concurrency`, `queueLimit`, `effort`, `memoryCacheBytes`…) is out of range. |
| [`E_PRISM_INVALID_BINDING`](/en/reference/errors#e-prism-invalid-binding) | The container resolved something other than a `Prism` for the `Prism` token, or other than a router for `router`. |

## Migration

- `PrismError` is gone: test `error.code`, or `error instanceof errors.E_PRISM_*` with `import { errors } from '@c9up/prism'`.
- `PrismNativeRequiredError` becomes `errors.E_PRISM_NATIVE_REQUIRED`.
- `ValidationError` (`@c9up/prism/swissqrbill/errors`) no longer extends `PrismError`; its `code` is unchanged.
- An engine refusal of the input now has `status` 422 (see [Errors](#errors)).

## See also

- [Introduction](/en/guides/digging-deeper/images/)
- [Serving images](/en/guides/digging-deeper/images/serving)
- [Formats and colour](/en/guides/digging-deeper/images/formats)
- [QR codes](/en/guides/digging-deeper/images/qr-codes)
- [Safety and testing](/en/guides/digging-deeper/images/safety)
