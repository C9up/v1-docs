# vellum

`@c9up/vellum` : une boîte à outils PDF sur un moteur Rust : rendre des pages en images, lire le texte, les métadonnées et les formulaires, fusionner, découper, pivoter et tamponner des documents, remplir et aplatir des formulaires, signer et vérifier des signatures, et créer de nouveaux documents avec `PdfDocument`. Guide : [PDF](/fr/guides/digging-deeper/pdf/).

## Installation

```bash
pnpm add @c9up/vellum
ream configure @c9up/vellum
```

`ream configure @c9up/vellum` ajoute le provider, la variable `VELLUM_FORMAT`, et écrit `config/vellum.ts`. Le moteur est livré en binaire précompilé par plateforme ; `@c9up/ream` est une dépendance pair facultative.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/vellum` | `Vellum`, `PdfDocument` et ses compagnons, `defineConfig`, les signataires, `inspect`, `createBlank`, `A4`, les types et les classes d'erreur. |
| `@c9up/vellum/provider` | `VellumProvider` (export par défaut). |
| `@c9up/vellum/services/main` | L'instance `Vellum` de l'application (export par défaut), utilisable une fois le provider démarré. |
| `@c9up/vellum/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/vellum`. |

## Exports

### `@c9up/vellum`

| Export | Nature | Description |
|---|---|---|
| `Vellum` | classe | Travaille sur des PDF existants : rendre, lire, modifier, remplir, signer, vérifier. |
| `defineConfig` | fonction | Vérifie et type `config/vellum.ts`. |
| `VellumConfig` | type | La configuration `vellum` ; aussi la base de `RenderOptions`. |
| `inspect` | fonction | `inspect(pdf: Buffer): Promise<DocumentInfo>` : nombre de pages, version, chiffrement. |
| `createBlank` | fonction | `createBlank(pages: ReadonlyArray<PageSize>): Buffer` : un document de pages blanches, en points. |
| `A4` | const | `{ width: 595.28, height: 841.89 }`. |
| `pkcs8Signer` | fonction | Un signataire à partir d'une clé PKCS#8 et de son certificat. |
| `timestamped` | fonction | Ajoute un horodatage RFC 3161 à n'importe quel signataire. |
| `Signer` | interface | `{ sign(digest: Buffer): Promise<Buffer> }` : transforme le SHA-256 de la plage d'octets signée en `SignedData` CMS. |
| `Pkcs8SignerOptions`, `TimestampOptions` | interface | Options des deux assistants de signature. |
| `ResponderPolicy`, `ResponderClient` | type | Les répondeurs de révocation autorisés, et le client qui les interroge. |
| `RenderOptions`, `PageOptions`, `Band`, `ImageFormat` | type | Les options de rendu. |
| `EditOptions`, `StampOptions`, `TextStampOptions`, `StandardFont` | type | Les options de modification. |
| `SignOptions`, `VerifyOptions`, `CheckedSignature` | type | Signature et vérification. |
| `DocumentInfo`, `DocumentMetadata`, `PageDimensions`, `PageSize`, `FormField`, `SignatureReport`, `RevocationAnswer` | type | Ce que renvoient les méthodes de lecture. |
| `PdfDocument` | classe | Crée un nouveau PDF, sous forme de flux lisible. |
| `PdfPage` | classe | Une page d'un `PdfDocument`. |
| `PdfTable` | classe | Un tableau en cours de dessin, issu de `doc.table()`. |
| `PdfGradient`, `PdfLinearGradient`, `PdfRadialGradient` | classe | Des dégradés, issus de `doc.linearGradient()` et `doc.radialGradient()`. |
| `toBytes` | fonction | `toBytes(document: PdfDocument): Promise<Uint8Array>` : tous les octets d'un document une fois terminé. |
| `registerFile` | fonction | `registerFile(path: string \| URL, data: Uint8Array \| undefined, stats?: FileStats): void` : sert `path` depuis la mémoire à chaque document qui le lit ; `undefined` l'oublie. |
| `PAGE_SIZES` | const | Les formats de page nommés (`A0`…`A10`, `B0`…, `letter`…), `[width, height]` en points. |
| `PageSizeName`, `Size`, `SideDefinition` | type | Formats de page et longueurs. |
| `PdfDocumentOptions`, `PdfPageOptions`, `PdfDocumentInfo`, `PageLayout`, `Permissions` | type | Options de `PdfDocument` et `addPage`. |
| `TextOptions`, `TextAlign`, `TextBaseline`, `WidthOptions`, `ListOptions`, `ListItems`, `FontSource` | type | Les options de texte. |
| `Colour`, `ColourValue`, `FillRule` | type | Couleurs et règles de remplissage. |
| `ImageOptions`, `ImageSource`, `PdfImage`, `SvgOptions` | type | Images et SVG. |
| `FileSource`, `FileStats`, `FileOptions`, `PdfFileSpec` | type | Fichiers lus et intégrés. |
| `AnnotationOptions`, `AnnotationSubtype`, `NoteOptions` | type | Annotations. |
| `FieldOptions`, `FieldFormat`, `PdfFormField` | type | Champs de formulaire. |
| `TableOptions`, `TableCell`, `TableCellStyle`, `CellStyle`, `ColumnStyle`, `RowStyle`, `TableAlign`, `TableFont` | type | Tableaux. |
| `isNativeAvailable` | fonction | Indique si le moteur Rust est chargé. |
| `VellumError` | erreur | Tout échec de vellum. |
| `VellumNativeRequiredError` | erreur | Le moteur Rust n'est pas chargé. |

### `Vellum`

Chaque méthode prend le PDF en `Buffer` et s'exécute sur le pool de threads. Les pages se comptent à partir de 1. La modification d'un document signé est refusée avec `E_VELLUM_SIGNED_DOCUMENT` sauf avec `discardSignatures: true`.

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Vellum(config?: VellumConfig)` | Vérifie les plafonds. |
| `config` | `get config(): Readonly<VellumConfig>` | |
| `render` | `render(pdf: Buffer, options?: RenderOptions): Promise<Buffer>` | Rend une page (`page`, 1 par défaut) ; `band` ne rend qu'un rectangle, et une bande qui ne tient pas dans la page est une erreur. |
| `renderAll` | `renderAll(pdf: Buffer, options?: RenderOptions): Promise<Buffer[]>` | Toutes les pages, dans la limite de `maxTotalPixels`. |
| `dimensions` | `dimensions(pdf: Buffer): Promise<PageDimensions[]>` | La taille naturelle de chaque page, en points. |
| `inspect` | `inspect(pdf: Buffer): Promise<DocumentInfo>` | Nombre de pages, version, chiffrement. |
| `metadata` | `metadata(pdf: Buffer): Promise<DocumentMetadata>` | Titre, auteur, sujet, mots-clés, créateur, producteur, dates. |
| `pageCount` | `pageCount(pdf: Buffer): Promise<number>` | |
| `extractText` | `extractText(pdf: Buffer, options?: PageOptions): Promise<string>` | Le texte d'une page. |
| `extractTextAll` | `extractTextAll(pdf: Buffer): Promise<string[]>` | Le texte de chaque page, dans l'ordre. |
| `merge` | `merge(pdfs: ReadonlyArray<Buffer>, options?: EditOptions): Promise<Buffer>` | Met des documents bout à bout. |
| `selectPages` | `selectPages(pdf: Buffer, pages: ReadonlyArray<number>, options?: EditOptions): Promise<Buffer>` | Un document des pages données, dans l'ordre donné. |
| `split` | `split(pdf: Buffer, options?: EditOptions): Promise<Buffer[]>` | Un document par page. |
| `rotate` | `rotate(pdf: Buffer, degrees: number, options?: { pages?: ReadonlyArray<number> } & EditOptions): Promise<Buffer>` | Pivote des pages dans le sens horaire d'un multiple de 90 ; toutes les pages sans `pages`. |
| `stamp` | `stamp(pdf: Buffer, image: Buffer, options?: StampOptions): Promise<Buffer>` | Dessine un PNG ou un JPEG en `x`, `y` (depuis le coin supérieur gauche, en points), `width`, `height`, `opacity` ; toutes les pages sans `page`. |
| `stampText` | `stampText(pdf: Buffer, text: string, options?: TextStampOptions): Promise<Buffer>` | Écrit une ligne de texte : `x`, `y` (jusqu'à la ligne de base), `size` (12 par défaut), `font` (une police configurée ou une `StandardFont`, `'Helvetica'` par défaut), `color` (noir par défaut), `opacity`. |
| `formFields` | `formFields(pdf: Buffer): Promise<FormField[]>` | Les champs du formulaire. |
| `fillForm` | `fillForm(pdf: Buffer, values: Record<string, string>, options?: EditOptions): Promise<Buffer>` | Remplit des champs par leur nom. |
| `flattenForm` | `flattenForm(pdf: Buffer, options?: EditOptions): Promise<Buffer>` | Transforme les champs en contenu de page. |
| `sign` | `sign(pdf: Buffer, options: SignOptions): Promise<Buffer>` | Signe avec un signataire configuré. |
| `verifySignatures` | `verifySignatures(pdf: Buffer, options?: VerifyOptions): Promise<CheckedSignature[]>` | Vérifie chaque signature avec les ancres de confiance, et interroge éventuellement chaque émetteur sur la révocation. |

| Champ de `SignOptions` | Type | Défaut | Description |
|---|---|---|---|
| `signer` | `string` | requis | Un signataire nommé dans la configuration. |
| `reason`, `location`, `contact`, `name` | `string` | | Ce que la signature dit d'elle-même. |
| `signedAt` | `Date` | maintenant | |
| `capacity` | `number` | `16384` | Les octets réservés à la valeur de signature. |

| Champ de `VerifyOptions` | Type | Défaut | Description |
|---|---|---|---|
| `anchors` | `ReadonlyArray<Buffer>` | `trustedAnchors` de la configuration | Les certificats racines de confiance, DER ou PEM. |
| `allowedResponders` | `ResponderPolicy` | configuration | Les répondeurs qui peuvent être contactés. |
| `checkRevocation` | `boolean` | | Interroger l'émetteur de chaque certificat de signature ; la réponse est `good`, `revoked` ou inconnue. |
| `revocationTimeoutMs` | `number` | `10000` | |

`SignatureReport` porte `field`, `coversWholeDocument`, `digestMatches`, `signatureVerifies`, `signer`, `signedAt`, `timestamped`, `trusted`, `chain`, `moment`, `momentAt`, `signerCertificate`, `issuerCertificate` et `problems` ; `CheckedSignature` ajoute `revocation?: RevocationAnswer` (`{ status: string; detail?: string }`). `FormField` vaut `{ name, kind, value?, options, readOnly, required, multiline, password, maxLength? }`.

`StandardFont` vaut `'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Times-Roman' | 'Times-Bold' | 'Times-Italic' | 'Courier' | 'Courier-Bold'`.

### Signataires

| Fonction | Signature | Description |
|---|---|---|
| `pkcs8Signer` | `pkcs8Signer(options: Pkcs8SignerOptions): Signer` | `key` (PKCS#8 DER), `certificate` (DER), `chain?` (DER, émetteur le plus proche en premier). |
| `timestamped` | `timestamped(inner: Signer, options: TimestampOptions): Signer` | `url` de l'autorité RFC 3161, `headers?`, `timeoutMs?` (10000 par défaut). |

`ResponderPolicy` vaut `ReadonlyArray<string> | ((url: URL) => boolean | Promise<boolean>)` : des hôtes ou des origines, ou un prédicat. `ResponderClient` vaut `{ post(url: URL, options: { headers; body: Uint8Array; timeout: number; maxResponseBytes: number }): Promise<…> }`.

### `PdfDocument`

Étend le `Readable` de Node : redirigez-le vers un fichier ou une réponse, ou collectez-le avec `toBytes`. Les coordonnées partent du coin supérieur gauche, en points ; les longueurs (`Size`) acceptent aussi des unités (`'2cm'`, `'1.5em'`, `'50%'`). La plupart des méthodes renvoient `this`.

| Groupe | Signatures |
|---|---|
| Document | `new PdfDocument(options?: PdfDocumentOptions)`<br>`readonly options: PdfDocumentOptions`, `readonly info: DocumentInfo`, `readonly outline: PdfOutline` (`addItem(title, options?)`)<br>`end(): this` |
| Pages | `addPage(options?: PageOptions): this`, `continueOnNewPage(options?: PageOptions): this`<br>`get page(): PdfPage`, `switchToPage(index: number): PdfPage`, `bufferedPageRange(): { start: number; count: number }`, `flushPages(): void`<br>`x`, `y` (lecture et écriture), `sizeToPoint(size, fallback?, page?, percentageOf?): number` |
| Polices et texte | `registerFont(name: string, src: FontSource, family?: string): this`<br>`font(src: FontSource, family?: string \| number, size?: Size): this`, `fontSize(size: Size): this`, `lineGap(gap: number): this`<br>`text(text: unknown, options?: TextOptions): this` / `text(text: unknown, x?: number, y?: number, options?: TextOptions): this`<br>`list(items: ListItems, x?: number \| ListOptions, y?: number, options?: ListOptions): this`<br>`moveDown(lines?: number): this`, `moveUp(lines?: number): this`<br>`widthOfString(text: string, options?: WidthOptions): number`, `heightOfString(text: unknown, options?: TextOptions): number`, `boundsOfString(…): { x; y; width; height }`, `currentLineHeight(includeGap?: boolean): number` |
| Transformations | `save()`, `restore()`, `transform(m11, m12, m21, m22, dx, dy)`, `translate(x, y)`, `rotate(angle, options?: { origin? })`, `scale(xFactor, yFactor?, options?)` |
| Tracés | `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`, `closePath`, `rect(x, y, width, height)`, `roundedRect(x, y, width, height, radius?)`, `ellipse(x, y, radiusX, radiusY?)`, `circle(x, y, radius)`, `arc(x, y, radius, startAngle, endAngle, anticlockwise?)`, `polygon(...points)`, `path(data: string)` (données de tracé SVG) |
| Peinture | `fill(colour?: Colour \| FillRule, rule?: FillRule)`, `stroke(colour?: Colour)`, `fillAndStroke(fillColour?, strokeColour?, rule?)`, `clip(rule?: FillRule)`<br>`fillColor(colour: Colour, opacity?: number)`, `strokeColor(colour: Colour, opacity?: number)`, `opacity(opacity)`, `fillOpacity(opacity)`, `strokeOpacity(opacity)`<br>`lineWidth(width)`, `lineCap(cap)`, `lineJoin(join)`, `miterLimit(limit)`, `dash(length, options?: { space?; phase? })`, `undash()`<br>`linearGradient(x1, y1, x2, y2): PdfLinearGradient`, `radialGradient(x1, y1, r1, x2, y2, r2): PdfRadialGradient`, `addSpotColor(name, c, m, y, k)` |
| Images et SVG | `image(src: ImageSource, x?: number \| ImageOptions, y?: number, options?: ImageOptions): this`<br>`openImage(src: ImageSource): PdfImage`<br>`svg(src: FileSource, x?: number \| SvgOptions, y?: number, options?: SvgOptions): this` |
| Tableaux | `table(options: TableOptions & { data }): this` (le dessine d'un coup)<br>`table(options?: TableOptions): PdfTable<this>` (puis `row(cells, lastRow?)` et `end()`) |
| Liens et navigation | `link(x, y, width, height, target: string \| number)`, `goTo(x, y, width, height, name)`, `addNamedDestination(name, ...view)` |
| Balisage | `struct(type, options?, children?): PdfStructureElement`, `addStructure(element)`, `markContent(tag, options?)`, `markStructureContent(tag, options?)`, `endMarkedContent()` |
| Fichiers | `file(src: FileSource, options?: FileOptions): PdfFileSpec` (intègre un fichier, au plus `maxFileBytes`) |
| Formulaires | `initForm(): this`, puis `formField(name, options?)`, `formText`, `formPushButton`, `formCombo`, `formList`, `formRadioButton`, `formCheckbox` `(name, x, y, width, height, options?: FieldOptions): PdfFormField`, `formAnnotation(name, type, x, y, width, height, options?)` |
| Annotations | `note(x, y, width, height, contents, options?)`, `highlight`, `underline`, `strike`, `rectAnnotation`, `ellipseAnnotation` `(x, y, width, height, options?)`, `lineAnnotation(x1, y1, x2, y2, options?)`, `textAnnotation(x, y, width, height, text, options?)`, `fileAnnotation(x, y, width, height, file, options?)`, `annotate(x, y, width, height, options)` |
| Brut | `addContent(content: string): this` |

| Champ de `PdfDocumentOptions` | Type | Défaut | Description |
|---|---|---|---|
| `size` | `string \| readonly [number, number]` | `'letter'` | Un nom de `PAGE_SIZES` (casse indifférente) ou `[width, height]` en points. |
| `layout` | `'portrait' \| 'landscape'` | `'portrait'` | |
| `margin`, `margins` | `SideDefinition<Size>` | 72 | |
| `font` | `FontSource` | | La police de la première page. |
| `pdfVersion` | `'1.4' \| '1.5' \| '1.6' \| '1.7' \| '2.0'` | `'1.7'` | |
| `compress` | `boolean` | | |
| `autoFirstPage` | `boolean` | | Ajouter la première page à la construction. |
| `bufferPages` | `boolean` | | Garder les pages pour `switchToPage`. |
| `info` | `PdfDocumentInfo` | | `Title`, `Author`, `Subject`, `Keywords`, `Creator`, `Producer`, `CreationDate`, `ModDate`. |
| `lang`, `displayTitle`, `pageLayout` | | | Indications pour la visionneuse. |
| `ignoreOrientation` | `boolean` | | Dessiner les JPEG tels que stockés, sans appliquer leur orientation EXIF. |
| `tagged` | `boolean` | | Écrire un arbre de structure. |
| `maxFileBytes` | `number` | 64 Mio | Le plus gros fichier qu'intègre `file()`. |
| `userPassword`, `ownerPassword` | `string` | | Chiffrer en AES-256. |
| `permissions` | `Permissions` | | Ce que permet le mot de passe utilisateur : `printing`, `modifying`, `copying`, `annotating`, `fillingForms`, `contentAccessibility`, `documentAssembly`. |
| `subset` | `'PDF/A-1'` … `'PDF/A-3u' \| 'PDF/UA'` | | La norme vérifiée pendant l'écriture ; ce qu'elle interdit est refusé à `end()`. |

`PdfPage` expose `width`, `height`, `size`, `layout`, `margins`, `userUnit`, `options`, `contentWidth`, `contentHeight` et `maxY()`. Un dégradé prend `stop(offset: number, colour: ColourValue, opacity?: number): this` et `setTransform(m11, m12, m21, m22, dx, dy): this`.

### `VellumError`

Étend `Error` ; `name` vaut `"VellumError"`. `VellumNativeRequiredError` l'étend avec le code `E_VELLUM_NAPI_REQUIRED`.

| Membre | Signature | Description |
|---|---|---|
| `code` | `readonly code: string` | Un code qui commence déjà par `E_` est gardé ; tout autre reçoit le préfixe `E_VELLUM_`. |
| constructeur | `new VellumError(code: string, message: string, options?: ErrorOptions)` | |
| `toString` | `toString(): string` | `VellumError [CODE]: message`. |

### `@c9up/vellum/provider`

| Export | Nature | Description |
|---|---|---|
| `VellumProvider` | provider (par défaut) | `register()` lie `Vellum` à partir de la configuration `vellum` ; `boot()` publie le service ; `shutdown()` l'efface. |

### `@c9up/vellum/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | L'instance `Vellum` de l'application. Tout accès à une propriété avant le démarrage du provider lève une erreur. |

```ts
import vellum from '@c9up/vellum/services/main'

const preview = await vellum.render(pdf, { page: 1, width: 1200 })
```

### `@c9up/vellum/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ce qu'exécute `ream configure @c9up/vellum`. |

## Configuration

`config/vellum.ts`, écrit par `ream configure @c9up/vellum`. Chaque option de rendu peut être remplacée à l'appel.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `format` | `'png' \| 'jpeg'` | `'png'` | L'encodage des images. La configuration générée lit `VELLUM_FORMAT` ; toute autre valeur est refusée. |
| `scale` | `number` | | Multiplicateur de la taille naturelle de la page, 1 valant 72 DPI. |
| `width` | `number` | | Largeur cible en pixels ; l'emporte sur `scale`. |
| `quality` | `number` | | Qualité JPEG, de 1 à 100. |
| `background` | `string` | | `#rgb`, `#rrggbb`, `#rrggbbaa` ou `'transparent'`. |
| `maxPixels` | `number` | 50 millions | Les pixels que peut produire le rendu d'une page. |
| `maxTotalPixels` | `number` | 500 millions | Les pixels que `renderAll` peut produire sur toutes les pages. |
| `maxDecodedBytes` | `number` | 256 Mio | Les octets de flux décodés dont la lecture d'une page peut avoir besoin. |
| `maxOperations` | `number` | 10 millions | Les opérateurs de contenu et glyphes que peut coûter une page. |
| `maxTotalDecodedBytes` | `number` | 1 Gio | Les octets décodés sur toutes les pages de `renderAll` et `extractTextAll`. |
| `maxTotalOperations` | `number` | 10 millions | Les opérateurs et glyphes sur toutes les pages de `renderAll` et `extractTextAll`. |
| `fonts` | `Record<string, string>` | | Des fichiers TrueType ou OpenType par nom, cherchés avant les polices standard. |
| `signers` | `Record<string, Signer>` | | Qui peut signer, par nom. |
| `trustedAnchors` | `ReadonlyArray<Buffer>` | `[]` | Les certificats de confiance pour vérifier une signature ; sans eux, chaque signature est non fiable. |
| `allowedResponders` | `ResponderPolicy` | adresses http(s) publiques | Les répondeurs de révocation qui peuvent être contactés. |
| `httpClient` | `ResponderClient` | `HttpClient` de `@c9up/ream/http-client` | Le client par lequel les répondeurs sont interrogés ; refuse les adresses privées. |

Chaque plafond est un entier de 1 à 4294967295.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `Vellum` | Le singleton `Vellum`. |
| `'vellum'` | La même instance ; déclaré sur `ContainerBindings`. |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_VELLUM_INVALID_PDF`](/fr/reference/errors#e-vellum-invalid-pdf) | Les octets ne sont pas un PDF que vellum sait lire. |
| [`E_VELLUM_SIGNED_DOCUMENT`](/fr/reference/errors#e-vellum-signed-document) | Une modification invaliderait les signatures du document. |
| [`E_VELLUM_INVALID_PAGE`](/fr/reference/errors#e-vellum-invalid-page) | Un numéro de page n'est pas un entier à partir de 1. |
| [`E_VELLUM_INVALID_ROTATION`](/fr/reference/errors#e-vellum-invalid-rotation) | Une rotation n'est pas un multiple de 90. |
| [`E_VELLUM_EMPTY_MERGE`](/fr/reference/errors#e-vellum-empty-merge) | `merge()` n'a reçu aucun document. |
| [`E_VELLUM_EMPTY_SELECTION`](/fr/reference/errors#e-vellum-empty-selection) | `selectPages()` n'a reçu aucune page. |
| [`E_VELLUM_MERGE_FAILED`](/fr/reference/errors#e-vellum-merge-failed) | La fusion a échoué. |
| [`E_VELLUM_SELECT_FAILED`](/fr/reference/errors#e-vellum-select-failed) | La sélection de pages a échoué. |
| [`E_VELLUM_SPLIT_FAILED`](/fr/reference/errors#e-vellum-split-failed) | Le découpage a échoué. |
| [`E_VELLUM_ROTATE_FAILED`](/fr/reference/errors#e-vellum-rotate-failed) | La rotation a échoué. |
| [`E_VELLUM_STAMP_FAILED`](/fr/reference/errors#e-vellum-stamp-failed) | Le tamponnage d'une image a échoué. |
| [`E_VELLUM_STAMP_TEXT_FAILED`](/fr/reference/errors#e-vellum-stamp-text-failed) | Le tamponnage de texte a échoué. |
| [`E_VELLUM_FILL_FAILED`](/fr/reference/errors#e-vellum-fill-failed) | Le remplissage du formulaire a échoué. |
| [`E_VELLUM_FLATTEN_FAILED`](/fr/reference/errors#e-vellum-flatten-failed) | L'aplatissement du formulaire a échoué. |
| [`E_VELLUM_RENDER_FAILED`](/fr/reference/errors#e-vellum-render-failed) | Le rendu d'une page a échoué. |
| [`E_VELLUM_EXTRACT_FAILED`](/fr/reference/errors#e-vellum-extract-failed) | L'extraction de texte a échoué. |
| [`E_VELLUM_WRITE_FAILED`](/fr/reference/errors#e-vellum-write-failed) | L'écriture du document a échoué. |
| [`E_VELLUM_SIGN_FAILED`](/fr/reference/errors#e-vellum-sign-failed) | La signature a échoué. |
| [`E_VELLUM_VERIFY_FAILED`](/fr/reference/errors#e-vellum-verify-failed) | La vérification des signatures a échoué. |
| [`E_VELLUM_UNKNOWN_SIGNER`](/fr/reference/errors#e-vellum-unknown-signer) | Aucun signataire de ce nom n'est configuré. |
| [`E_VELLUM_SIGNER_INVALID`](/fr/reference/errors#e-vellum-signer-invalid) | La clé ou le certificat d'un signataire est vide. |
| [`E_VELLUM_TIMESTAMP_FAILED`](/fr/reference/errors#e-vellum-timestamp-failed) | La construction ou la lecture d'un horodatage a échoué. |
| [`E_VELLUM_TIMESTAMP_UNREACHABLE`](/fr/reference/errors#e-vellum-timestamp-unreachable) | L'autorité d'horodatage est injoignable. |
| [`E_VELLUM_TIMESTAMP_REFUSED`](/fr/reference/errors#e-vellum-timestamp-refused) | L'autorité d'horodatage a répondu par un statut d'erreur. |
| [`E_VELLUM_FONT_UNREADABLE`](/fr/reference/errors#e-vellum-font-unreadable) | Un fichier de police configuré ne peut pas être lu. |
| [`E_VELLUM_FILE_NOT_FOUND`](/fr/reference/errors#e-vellum-file-not-found) | Un fichier donné par chemin ne peut pas être lu. |
| [`E_VELLUM_INVALID_OPTIONS`](/fr/reference/errors#e-vellum-invalid-options) | Une option de document, de page, de tableau, de dessin ou un plafond est invalide. |
| [`E_VELLUM_INVALID_COLOR`](/fr/reference/errors#e-vellum-invalid-color) | Une couleur ne peut pas être lue. |
| [`E_VELLUM_INVALID_IMAGE`](/fr/reference/errors#e-vellum-invalid-image) | Une image n'est pas utilisable. |
| [`E_VELLUM_INVALID_SVG`](/fr/reference/errors#e-vellum-invalid-svg) | Un SVG n'est pas utilisable. |
| [`E_VELLUM_UNSUPPORTED_CONTENT`](/fr/reference/errors#e-vellum-unsupported-content) | Un tracé contient un opérateur que vellum ne dessine pas. |
| [`E_VELLUM_INVALID_STRUCTURE`](/fr/reference/errors#e-vellum-invalid-structure) | Un élément de structure a été modifié après sa fin. |
| [`E_VELLUM_NO_PAGE`](/fr/reference/errors#e-vellum-no-page) | Il n'y a pas de page courante ; appelez d'abord `addPage()`. |
| [`E_VELLUM_NO_FORM`](/fr/reference/errors#e-vellum-no-form) | Des champs de formulaire ont été ajoutés avant `initForm()`. |
| [`E_VELLUM_DOCUMENT_ENDED`](/fr/reference/errors#e-vellum-document-ended) | Le document est terminé. |
| [`E_VELLUM_NAPI_REQUIRED`](/fr/reference/errors#e-vellum-napi-required) | Le moteur PDF Rust n'est pas chargé. |

## Voir aussi

- [Introduction](/fr/guides/digging-deeper/pdf/)
- [Générer des documents](/fr/guides/digging-deeper/pdf/documents)
- [Texte et polices](/fr/guides/digging-deeper/pdf/documents-text)
- [Images, graphiques et tableaux](/fr/guides/digging-deeper/pdf/documents-graphics)
- [Navigation, balisage et formulaires](/fr/guides/digging-deeper/pdf/documents-structure)
- [Lire et modifier](/fr/guides/digging-deeper/pdf/editing)
- [Formulaires](/fr/guides/digging-deeper/pdf/forms)
- [Signature](/fr/guides/digging-deeper/pdf/signing)
- [Venir de pdfkit](/fr/guides/digging-deeper/pdf/from-pdfkit)
