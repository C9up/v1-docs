# vellum

`@c9up/vellum`: a PDF toolkit on a Rust engine: render pages to images, read text, metadata and forms, merge, split, rotate and stamp documents, fill and flatten forms, sign and verify signatures, and author new documents with `PdfDocument`. Guide: [PDF](/en/guides/digging-deeper/pdf/).

## Installation

```bash
pnpm add @c9up/vellum
ream configure @c9up/vellum
```

`ream configure @c9up/vellum` adds the provider, the `VELLUM_FORMAT` variable, and writes `config/vellum.ts`. The engine ships as a prebuilt binary per platform; `@c9up/ream` is an optional peer.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/vellum` | `Vellum`, `PdfDocument` and its companions, `defineConfig`, signers, `inspect`, `createBlank`, `A4`, the types and the error classes. |
| `@c9up/vellum/provider` | `VellumProvider` (default export). |
| `@c9up/vellum/services/main` | The application's `Vellum` (default export), usable once the provider booted. |
| `@c9up/vellum/configure` | `configure(codemods)`, run by `ream configure @c9up/vellum`. |

## Exports

### `@c9up/vellum`

| Export | Kind | Description |
|---|---|---|
| `Vellum` | class | Works on existing PDFs: render, read, edit, fill, sign, verify. |
| `defineConfig` | function | Checks and types `config/vellum.ts`. |
| `VellumConfig` | type | The `vellum` config; also the base of `RenderOptions`. |
| `inspect` | function | `inspect(pdf: Buffer): Promise<DocumentInfo>`: page count, version, encryption. |
| `createBlank` | function | `createBlank(pages: ReadonlyArray<PageSize>): Buffer`: a document of blank pages, in points. |
| `A4` | const | `{ width: 595.28, height: 841.89 }`. |
| `pkcs8Signer` | function | A signer from a PKCS#8 key and its certificate. |
| `timestamped` | function | Adds an RFC 3161 timestamp to any signer. |
| `Signer` | interface | `{ sign(digest: Buffer): Promise<Buffer> }`: turns the SHA-256 of the signed byte range into CMS `SignedData`. |
| `Pkcs8SignerOptions`, `TimestampOptions` | interface | Options of the two signer helpers. |
| `ResponderPolicy`, `ResponderClient` | type | Which revocation responders may be asked, and the client that asks them. |
| `RenderOptions`, `PageOptions`, `Band`, `ImageFormat` | type | Rendering options. |
| `EditOptions`, `StampOptions`, `TextStampOptions`, `StandardFont` | type | Editing options. |
| `SignOptions`, `VerifyOptions`, `CheckedSignature` | type | Signing and verification. |
| `DocumentInfo`, `DocumentMetadata`, `PageDimensions`, `PageSize`, `FormField`, `SignatureReport`, `RevocationAnswer` | type | What the reading methods return. |
| `PdfDocument` | class | Authors a new PDF, as a readable stream. |
| `PdfPage` | class | One page of a `PdfDocument`. |
| `PdfTable` | class | A table being drawn, from `doc.table()`. |
| `PdfGradient`, `PdfLinearGradient`, `PdfRadialGradient` | class | Gradients, from `doc.linearGradient()` and `doc.radialGradient()`. |
| `toBytes` | function | `toBytes(document: PdfDocument): Promise<Uint8Array>`: every byte of a document once it has ended. |
| `registerFile` | function | `registerFile(path: string \| URL, data: Uint8Array \| undefined, stats?: FileStats): void`: serves `path` from memory to every document that reads it; `undefined` forgets it. |
| `PAGE_SIZES` | const | Named page sizes (`A0`…`A10`, `B0`…, `letter`…), `[width, height]` in points. |
| `PageSizeName`, `Size`, `SideDefinition` | type | Page sizes and lengths. |
| `PdfDocumentOptions`, `PdfPageOptions`, `PdfDocumentInfo`, `PageLayout`, `Permissions` | type | Options of `PdfDocument` and `addPage`. |
| `TextOptions`, `TextAlign`, `TextBaseline`, `WidthOptions`, `ListOptions`, `ListItems`, `FontSource` | type | Text options. |
| `Colour`, `ColourValue`, `FillRule` | type | Colours and fill rules. |
| `ImageOptions`, `ImageSource`, `PdfImage`, `SvgOptions` | type | Images and SVG. |
| `FileSource`, `FileStats`, `FileOptions`, `PdfFileSpec` | type | Files read and embedded. |
| `AnnotationOptions`, `AnnotationSubtype`, `NoteOptions` | type | Annotations. |
| `FieldOptions`, `FieldFormat`, `PdfFormField` | type | Form fields. |
| `TableOptions`, `TableCell`, `TableCellStyle`, `CellStyle`, `ColumnStyle`, `RowStyle`, `TableAlign`, `TableFont` | type | Tables. |
| `isNativeAvailable` | function | Whether the Rust engine is loaded. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |

### `Vellum`

Every method takes the PDF as a `Buffer` and runs on the thread pool. Pages count from 1. An edit of a signed document is refused with `E_VELLUM_SIGNED_DOCUMENT` unless `discardSignatures: true`.

| Member | Signature | Description |
|---|---|---|
| constructor | `new Vellum(config?: VellumConfig)` | Checks the ceilings. |
| `config` | `get config(): Readonly<VellumConfig>` | |
| `render` | `render(pdf: Buffer, options?: RenderOptions): Promise<Buffer>` | Rasterises one page (`page`, default 1); `band` renders only a rectangle, and a band that does not fit the page is an error. |
| `renderAll` | `renderAll(pdf: Buffer, options?: RenderOptions): Promise<Buffer[]>` | Every page, within `maxTotalPixels`. |
| `dimensions` | `dimensions(pdf: Buffer): Promise<PageDimensions[]>` | Every page's natural size, in points. |
| `inspect` | `inspect(pdf: Buffer): Promise<DocumentInfo>` | Page count, version, encryption. |
| `metadata` | `metadata(pdf: Buffer): Promise<DocumentMetadata>` | Title, author, subject, keywords, creator, producer, dates. |
| `pageCount` | `pageCount(pdf: Buffer): Promise<number>` | |
| `extractText` | `extractText(pdf: Buffer, options?: PageOptions): Promise<string>` | The text of one page. |
| `extractTextAll` | `extractTextAll(pdf: Buffer): Promise<string[]>` | The text of every page, in order. |
| `merge` | `merge(pdfs: ReadonlyArray<Buffer>, options?: EditOptions): Promise<Buffer>` | Joins documents end to end. |
| `selectPages` | `selectPages(pdf: Buffer, pages: ReadonlyArray<number>, options?: EditOptions): Promise<Buffer>` | A document of the given pages, in the given order. |
| `split` | `split(pdf: Buffer, options?: EditOptions): Promise<Buffer[]>` | One document per page. |
| `rotate` | `rotate(pdf: Buffer, degrees: number, options?: { pages?: ReadonlyArray<number> } & EditOptions): Promise<Buffer>` | Rotates pages clockwise by a multiple of 90; every page without `pages`. |
| `stamp` | `stamp(pdf: Buffer, image: Buffer, options?: StampOptions): Promise<Buffer>` | Draws a PNG or JPEG at `x`, `y` (from the top-left, in points), `width`, `height`, `opacity`; every page without `page`. |
| `stampText` | `stampText(pdf: Buffer, text: string, options?: TextStampOptions): Promise<Buffer>` | Writes a line of text: `x`, `y` (to the baseline), `size` (default 12), `font` (a configured font or a `StandardFont`, default `'Helvetica'`), `color` (default black), `opacity`. |
| `formFields` | `formFields(pdf: Buffer): Promise<FormField[]>` | The form's fields. |
| `fillForm` | `fillForm(pdf: Buffer, values: Record<string, string>, options?: EditOptions): Promise<Buffer>` | Fills fields by name. |
| `flattenForm` | `flattenForm(pdf: Buffer, options?: EditOptions): Promise<Buffer>` | Turns the fields into page content. |
| `sign` | `sign(pdf: Buffer, options: SignOptions): Promise<Buffer>` | Signs with a configured signer. |
| `verifySignatures` | `verifySignatures(pdf: Buffer, options?: VerifyOptions): Promise<CheckedSignature[]>` | Checks every signature against the trusted anchors, and optionally asks each issuer about revocation. |

| `SignOptions` field | Type | Default | Description |
|---|---|---|---|
| `signer` | `string` | required | A signer named in the config. |
| `reason`, `location`, `contact`, `name` | `string` | | What the signature says about itself. |
| `signedAt` | `Date` | now | |
| `capacity` | `number` | `16384` | Bytes reserved for the signature value. |

| `VerifyOptions` field | Type | Default | Description |
|---|---|---|---|
| `anchors` | `ReadonlyArray<Buffer>` | config `trustedAnchors` | Root certificates to trust, DER or PEM. |
| `allowedResponders` | `ResponderPolicy` | config | Which responders may be contacted. |
| `checkRevocation` | `boolean` | | Ask each signing certificate's issuer; the answer is `good`, `revoked` or unknown. |
| `revocationTimeoutMs` | `number` | `10000` | |

`SignatureReport` carries `field`, `coversWholeDocument`, `digestMatches`, `signatureVerifies`, `signer`, `signedAt`, `timestamped`, `trusted`, `chain`, `moment`, `momentAt`, `signerCertificate`, `issuerCertificate` and `problems`; `CheckedSignature` adds `revocation?: RevocationAnswer` (`{ status: string; detail?: string }`). `FormField` is `{ name, kind, value?, options, readOnly, required, multiline, password, maxLength? }`.

`StandardFont` is `'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Times-Roman' | 'Times-Bold' | 'Times-Italic' | 'Courier' | 'Courier-Bold'`.

### Signers

| Function | Signature | Description |
|---|---|---|
| `pkcs8Signer` | `pkcs8Signer(options: Pkcs8SignerOptions): Signer` | `key` (PKCS#8 DER), `certificate` (DER), `chain?` (DER, nearest issuer first). |
| `timestamped` | `timestamped(inner: Signer, options: TimestampOptions): Signer` | `url` of the RFC 3161 authority, `headers?`, `timeoutMs?` (default 10000). |

`ResponderPolicy` is `ReadonlyArray<string> | ((url: URL) => boolean | Promise<boolean>)`: hosts or origins, or a predicate. `ResponderClient` is `{ post(url: URL, options: { headers; body: Uint8Array; timeout: number; maxResponseBytes: number }): Promise<…> }`.

### `PdfDocument`

Extends Node's `Readable`: pipe it to a file or a response, or collect it with `toBytes`. Coordinates count from the top-left corner, in points; lengths (`Size`) also take units (`'2cm'`, `'1.5em'`, `'50%'`). Most methods return `this`.

| Group | Signatures |
|---|---|
| Document | `new PdfDocument(options?: PdfDocumentOptions)`<br>`readonly options: PdfDocumentOptions`, `readonly info: DocumentInfo`, `readonly outline: PdfOutline` (`addItem(title, options?)`)<br>`end(): this` |
| Pages | `addPage(options?: PageOptions): this`, `continueOnNewPage(options?: PageOptions): this`<br>`get page(): PdfPage`, `switchToPage(index: number): PdfPage`, `bufferedPageRange(): { start: number; count: number }`, `flushPages(): void`<br>`x`, `y` (get and set), `sizeToPoint(size, fallback?, page?, percentageOf?): number` |
| Fonts and text | `registerFont(name: string, src: FontSource, family?: string): this`<br>`font(src: FontSource, family?: string \| number, size?: Size): this`, `fontSize(size: Size): this`, `lineGap(gap: number): this`<br>`text(text: unknown, options?: TextOptions): this` / `text(text: unknown, x?: number, y?: number, options?: TextOptions): this`<br>`list(items: ListItems, x?: number \| ListOptions, y?: number, options?: ListOptions): this`<br>`moveDown(lines?: number): this`, `moveUp(lines?: number): this`<br>`widthOfString(text: string, options?: WidthOptions): number`, `heightOfString(text: unknown, options?: TextOptions): number`, `boundsOfString(…): { x; y; width; height }`, `currentLineHeight(includeGap?: boolean): number` |
| Transform | `save()`, `restore()`, `transform(m11, m12, m21, m22, dx, dy)`, `translate(x, y)`, `rotate(angle, options?: { origin? })`, `scale(xFactor, yFactor?, options?)` |
| Paths | `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`, `closePath`, `rect(x, y, width, height)`, `roundedRect(x, y, width, height, radius?)`, `ellipse(x, y, radiusX, radiusY?)`, `circle(x, y, radius)`, `arc(x, y, radius, startAngle, endAngle, anticlockwise?)`, `polygon(...points)`, `path(data: string)` (SVG path data) |
| Painting | `fill(colour?: Colour \| FillRule, rule?: FillRule)`, `stroke(colour?: Colour)`, `fillAndStroke(fillColour?, strokeColour?, rule?)`, `clip(rule?: FillRule)`<br>`fillColor(colour: Colour, opacity?: number)`, `strokeColor(colour: Colour, opacity?: number)`, `opacity(opacity)`, `fillOpacity(opacity)`, `strokeOpacity(opacity)`<br>`lineWidth(width)`, `lineCap(cap)`, `lineJoin(join)`, `miterLimit(limit)`, `dash(length, options?: { space?; phase? })`, `undash()`<br>`linearGradient(x1, y1, x2, y2): PdfLinearGradient`, `radialGradient(x1, y1, r1, x2, y2, r2): PdfRadialGradient`, `addSpotColor(name, c, m, y, k)` |
| Images and SVG | `image(src: ImageSource, x?: number \| ImageOptions, y?: number, options?: ImageOptions): this`<br>`openImage(src: ImageSource): PdfImage`<br>`svg(src: FileSource, x?: number \| SvgOptions, y?: number, options?: SvgOptions): this` |
| Tables | `table(options: TableOptions & { data }): this` (draws it at once)<br>`table(options?: TableOptions): PdfTable<this>` (then `row(cells, lastRow?)` and `end()`) |
| Links and navigation | `link(x, y, width, height, target: string \| number)`, `goTo(x, y, width, height, name)`, `addNamedDestination(name, ...view)` |
| Tagging | `struct(type, options?, children?): PdfStructureElement`, `addStructure(element)`, `markContent(tag, options?)`, `markStructureContent(tag, options?)`, `endMarkedContent()` |
| Files | `file(src: FileSource, options?: FileOptions): PdfFileSpec` (embeds a file, at most `maxFileBytes`) |
| Forms | `initForm(): this`, then `formField(name, options?)`, `formText`, `formPushButton`, `formCombo`, `formList`, `formRadioButton`, `formCheckbox` `(name, x, y, width, height, options?: FieldOptions): PdfFormField`, `formAnnotation(name, type, x, y, width, height, options?)` |
| Annotations | `note(x, y, width, height, contents, options?)`, `highlight`, `underline`, `strike`, `rectAnnotation`, `ellipseAnnotation` `(x, y, width, height, options?)`, `lineAnnotation(x1, y1, x2, y2, options?)`, `textAnnotation(x, y, width, height, text, options?)`, `fileAnnotation(x, y, width, height, file, options?)`, `annotate(x, y, width, height, options)` |
| Raw | `addContent(content: string): this` |

| `PdfDocumentOptions` field | Type | Default | Description |
|---|---|---|---|
| `size` | `string \| readonly [number, number]` | `'letter'` | A `PAGE_SIZES` name (any case) or `[width, height]` in points. |
| `layout` | `'portrait' \| 'landscape'` | `'portrait'` | |
| `margin`, `margins` | `SideDefinition<Size>` | 72 | |
| `font` | `FontSource` | | The first page's font. |
| `pdfVersion` | `'1.4' \| '1.5' \| '1.6' \| '1.7' \| '2.0'` | `'1.7'` | |
| `compress` | `boolean` | | |
| `autoFirstPage` | `boolean` | | Add the first page at construction. |
| `bufferPages` | `boolean` | | Keep pages for `switchToPage`. |
| `info` | `PdfDocumentInfo` | | `Title`, `Author`, `Subject`, `Keywords`, `Creator`, `Producer`, `CreationDate`, `ModDate`. |
| `lang`, `displayTitle`, `pageLayout` | | | Viewer hints. |
| `ignoreOrientation` | `boolean` | | Draw JPEGs as stored, not turned by their EXIF orientation. |
| `tagged` | `boolean` | | Write a structure tree. |
| `maxFileBytes` | `number` | 64 MiB | The largest file `file()` embeds. |
| `userPassword`, `ownerPassword` | `string` | | Encrypt with AES-256. |
| `permissions` | `Permissions` | | What the user password allows: `printing`, `modifying`, `copying`, `annotating`, `fillingForms`, `contentAccessibility`, `documentAssembly`. |
| `subset` | `'PDF/A-1'` … `'PDF/A-3u' \| 'PDF/UA'` | | The standard checked as the document is written; what it forbids is refused at `end()`. |

`PdfPage` exposes `width`, `height`, `size`, `layout`, `margins`, `userUnit`, `options`, `contentWidth`, `contentHeight` and `maxY()`. A gradient takes `stop(offset: number, colour: ColourValue, opacity?: number): this` and `setTransform(m11, m12, m21, m22, dx, dy): this`.

### `@c9up/vellum/provider`

| Export | Kind | Description |
|---|---|---|
| `VellumProvider` | provider (default) | `register()` binds `Vellum` from the `vellum` config; `boot()` publishes the service; `shutdown()` clears it. |

### `@c9up/vellum/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `Vellum`. Any property access before the provider booted throws. |

```ts
import vellum from '@c9up/vellum/services/main'

const preview = await vellum.render(pdf, { page: 1, width: 1200 })
```

### `@c9up/vellum/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: what `ream configure @c9up/vellum` runs. |

## Configuration

`config/vellum.ts`, written by `ream configure @c9up/vellum`. Every rendering option can be overridden per call.

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `'png' \| 'jpeg'` | `'png'` | Image encoding. The generated config reads `VELLUM_FORMAT`; any other value is refused. |
| `scale` | `number` | | Multiplier over the page's natural size, 1 being 72 DPI. |
| `width` | `number` | | Target width in pixels; wins over `scale`. |
| `quality` | `number` | | JPEG quality, 1–100. |
| `background` | `string` | | `#rgb`, `#rrggbb`, `#rrggbbaa` or `'transparent'`. |
| `maxPixels` | `number` | 50 million | Pixels one page may rasterise to. |
| `maxTotalPixels` | `number` | 500 million | Pixels `renderAll` may rasterise across every page. |
| `maxDecodedBytes` | `number` | 256 MiB | Decoded stream bytes reading one page may need. |
| `maxOperations` | `number` | 10 million | Content operators and glyphs one page may take. |
| `maxTotalDecodedBytes` | `number` | 1 GiB | Decoded bytes across every page of `renderAll` and `extractTextAll`. |
| `maxTotalOperations` | `number` | 10 million | Operators and glyphs across every page of `renderAll` and `extractTextAll`. |
| `fonts` | `Record<string, string>` | | TrueType or OpenType files by name, looked up before the standard fonts. |
| `signers` | `Record<string, Signer>` | | Who may sign, by name. |
| `trustedAnchors` | `ReadonlyArray<Buffer>` | `[]` | Certificates to trust when checking a signature; with none, every signature is untrusted. |
| `allowedResponders` | `ResponderPolicy` | public http(s) addresses | Which revocation responders may be contacted. |
| `httpClient` | `ResponderClient` | `HttpClient` from `@c9up/ream/http-client` | The client responders are asked through; refuses private addresses. |

Every ceiling is a whole number from 1 to 4294967295.

## Container bindings

| Token | Resolves to |
|---|---|
| `Vellum` | The `Vellum` singleton. |
| `'vellum'` | The same instance; declared on `ContainerBindings`. |

## Errors

Each code is a class of the `errors` namespace (`import { errors } from '@c9up/vellum'`): a flare `Exception` with `code` and `status`. `E_VELLUM_INVALID_PDF` has status 422 (the input is not a PDF); the others 500.

| Code | Raised when |
|---|---|
| [`E_VELLUM_INVALID_PDF`](/en/reference/errors#e-vellum-invalid-pdf) | The bytes are not a PDF vellum can read. |
| [`E_VELLUM_SIGNED_DOCUMENT`](/en/reference/errors#e-vellum-signed-document) | An edit would invalidate the document's signatures. |
| [`E_VELLUM_INVALID_PAGE`](/en/reference/errors#e-vellum-invalid-page) | A page number is not a whole number from 1. |
| [`E_VELLUM_INVALID_ROTATION`](/en/reference/errors#e-vellum-invalid-rotation) | A rotation is not a multiple of 90. |
| [`E_VELLUM_EMPTY_MERGE`](/en/reference/errors#e-vellum-empty-merge) | `merge()` was given no document. |
| [`E_VELLUM_EMPTY_SELECTION`](/en/reference/errors#e-vellum-empty-selection) | `selectPages()` was given no page. |
| [`E_VELLUM_MERGE_FAILED`](/en/reference/errors#e-vellum-merge-failed) | Merging failed. |
| [`E_VELLUM_SELECT_FAILED`](/en/reference/errors#e-vellum-select-failed) | Selecting pages failed. |
| [`E_VELLUM_SPLIT_FAILED`](/en/reference/errors#e-vellum-split-failed) | Splitting failed. |
| [`E_VELLUM_ROTATE_FAILED`](/en/reference/errors#e-vellum-rotate-failed) | Rotating failed. |
| [`E_VELLUM_STAMP_FAILED`](/en/reference/errors#e-vellum-stamp-failed) | Stamping an image failed. |
| [`E_VELLUM_STAMP_TEXT_FAILED`](/en/reference/errors#e-vellum-stamp-text-failed) | Stamping text failed. |
| [`E_VELLUM_FILL_FAILED`](/en/reference/errors#e-vellum-fill-failed) | Filling the form failed. |
| [`E_VELLUM_FLATTEN_FAILED`](/en/reference/errors#e-vellum-flatten-failed) | Flattening the form failed. |
| [`E_VELLUM_RENDER_FAILED`](/en/reference/errors#e-vellum-render-failed) | Rendering a page failed. |
| [`E_VELLUM_EXTRACT_FAILED`](/en/reference/errors#e-vellum-extract-failed) | Extracting text failed. |
| [`E_VELLUM_WRITE_FAILED`](/en/reference/errors#e-vellum-write-failed) | Writing the document failed. |
| [`E_VELLUM_SIGN_FAILED`](/en/reference/errors#e-vellum-sign-failed) | Signing failed. |
| [`E_VELLUM_VERIFY_FAILED`](/en/reference/errors#e-vellum-verify-failed) | Verifying the signatures failed. |
| [`E_VELLUM_UNKNOWN_SIGNER`](/en/reference/errors#e-vellum-unknown-signer) | No signer of this name is configured. |
| [`E_VELLUM_SIGNER_INVALID`](/en/reference/errors#e-vellum-signer-invalid) | A signer's key or certificate is empty. |
| [`E_VELLUM_TIMESTAMP_FAILED`](/en/reference/errors#e-vellum-timestamp-failed) | Building or reading a timestamp failed. |
| [`E_VELLUM_TIMESTAMP_UNREACHABLE`](/en/reference/errors#e-vellum-timestamp-unreachable) | The timestamp authority could not be reached. |
| [`E_VELLUM_TIMESTAMP_REFUSED`](/en/reference/errors#e-vellum-timestamp-refused) | The timestamp authority answered with an error status. |
| [`E_VELLUM_FONT_UNREADABLE`](/en/reference/errors#e-vellum-font-unreadable) | A configured font file cannot be read. |
| [`E_VELLUM_FILE_NOT_FOUND`](/en/reference/errors#e-vellum-file-not-found) | A file given by path cannot be read. |
| [`E_VELLUM_INVALID_OPTIONS`](/en/reference/errors#e-vellum-invalid-options) | A document, page, table, drawing option or ceiling is invalid, or `config/vellum.ts` asks for a `format` other than `"png"` or `"jpeg"`. |
| [`E_VELLUM_INVALID_COLOR`](/en/reference/errors#e-vellum-invalid-color) | A colour cannot be read. |
| [`E_VELLUM_INVALID_IMAGE`](/en/reference/errors#e-vellum-invalid-image) | An image cannot be used. |
| [`E_VELLUM_INVALID_SVG`](/en/reference/errors#e-vellum-invalid-svg) | An SVG cannot be used. |
| [`E_VELLUM_UNSUPPORTED_CONTENT`](/en/reference/errors#e-vellum-unsupported-content) | A path holds an operator vellum does not draw. |
| [`E_VELLUM_INVALID_STRUCTURE`](/en/reference/errors#e-vellum-invalid-structure) | A structure element was changed after it ended. |
| [`E_VELLUM_NO_PAGE`](/en/reference/errors#e-vellum-no-page) | There is no current page; call `addPage()` first. |
| [`E_VELLUM_NO_FORM`](/en/reference/errors#e-vellum-no-form) | Form fields were added before `initForm()`. |
| [`E_VELLUM_DOCUMENT_ENDED`](/en/reference/errors#e-vellum-document-ended) | The document has ended. |
| [`E_VELLUM_NAPI_REQUIRED`](/en/reference/errors#e-vellum-napi-required) | The Rust PDF engine is not loaded. |
| [`E_VELLUM_NOT_BOOTED`](/en/reference/errors#e-vellum-not-booted) | The `services/main` service was used before `VellumProvider` booted. |
| [`E_VELLUM_TABLE_ENDED`](/en/reference/errors#e-vellum-table-ended) | A row was added to a table after `lastRow` ended it. |
| [`E_VELLUM_INVALID_LINK`](/en/reference/errors#e-vellum-invalid-link) | A link or a named destination cannot be used. |
| [`E_VELLUM_INVALID_OUTLINE`](/en/reference/errors#e-vellum-invalid-outline) | An outline entry cannot be used. |
| [`E_VELLUM_INVALID_FONT`](/en/reference/errors#e-vellum-invalid-font) | A font cannot be used. |
| [`E_VELLUM_NO_FONT`](/en/reference/errors#e-vellum-no-font) | Text was written before a font was selected. |
| [`E_VELLUM_PAGE_OUT_OF_RANGE`](/en/reference/errors#e-vellum-page-out-of-range) | A page index names no page of the document. |
| [`E_VELLUM_UNBALANCED_RESTORE`](/en/reference/errors#e-vellum-unbalanced-restore) | `restore()` was called without a matching `save()`. |
| [`E_VELLUM_NOTHING_TO_RESUME`](/en/reference/errors#e-vellum-nothing-to-resume) | No text is waiting for a page. |
| [`E_VELLUM_VALIDATION`](/en/reference/errors#e-vellum-validation) | The document does not meet its `subset` (PDF/A, PDF/UA), or a form field or an annotation breaks a PDF rule. |
| [`E_VELLUM_DOCUMENT_BROKEN`](/en/reference/errors#e-vellum-document-broken) | An earlier call failed inside the engine; start a new document. |
| [`E_VELLUM_INTERNAL`](/en/reference/errors#e-vellum-internal) | The engine panicked. |

## Migration

- `VellumError` is gone: test `error.code`, or `error instanceof errors.E_VELLUM_*` with `import { errors } from '@c9up/vellum'`.
- `VellumNativeRequiredError` becomes `errors.E_VELLUM_NAPI_REQUIRED`.
- The `name` of an error is no longer `"VellumError"`.
- `E_VELLUM_INVALID_PDF` now has `status` 422.

## See also

- [Introduction](/en/guides/digging-deeper/pdf/)
- [Generating documents](/en/guides/digging-deeper/pdf/documents)
- [Text and fonts](/en/guides/digging-deeper/pdf/documents-text)
- [Images, graphics and tables](/en/guides/digging-deeper/pdf/documents-graphics)
- [Navigation, tagging and forms](/en/guides/digging-deeper/pdf/documents-structure)
- [Reading and editing](/en/guides/digging-deeper/pdf/editing)
- [Forms](/en/guides/digging-deeper/pdf/forms)
- [Signing](/en/guides/digging-deeper/pdf/signing)
- [Coming from pdfkit](/en/guides/digging-deeper/pdf/from-pdfkit)
