# prism

`@c9up/prism` : le traitement d'images pour ream sur un moteur Rust : inspecter, redimensionner, recadrer, pivoter, superposer, filigraner, filtrer et convertir des images, servir des variantes responsives, dessiner des QR codes et des bulletins QR suisses. Guide : [Images](/fr/guides/digging-deeper/images/).

## Installation

```bash
pnpm add @c9up/prism
ream configure @c9up/prism
```

`ream configure @c9up/prism` ajoute le provider, la variable `IMAGE_MAX_PIXELS`, et écrit `config/images.ts`. Le moteur est livré en binaire précompilé par plateforme ; `@c9up/ream` est une dépendance pair facultative.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/prism` | `Prism` et son `Pipeline`, `defineConfig`, le point d'accès images, `qrcode`, les types et les classes d'erreur. |
| `@c9up/prism/provider` | `PrismProvider` (export par défaut). |
| `@c9up/prism/services/main` | L'instance `Prism` de l'application (export par défaut), utilisable une fois le provider démarré. |
| `@c9up/prism/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/prism`. |
| `@c9up/prism/testing` | `fakeImages()`. |
| `@c9up/prism/swissqrbill/pdf` | `SwissQRBill` et `SwissQRCode` dessinés dans un document PDFKit. |
| `@c9up/prism/swissqrbill/svg` | `SwissQRBill` et `SwissQRCode` en SVG. |
| `@c9up/prism/swissqrbill/utils` | Les assistants IBAN, référence et montant, les conversions d'unités. |
| `@c9up/prism/swissqrbill/errors` | `ValidationError` et ses codes. |
| `@c9up/prism/swissqrbill/types` | Les types de données et d'options du bulletin QR. |

## Exports

### `@c9up/prism`

| Export | Nature | Description |
|---|---|---|
| `Prism` | classe | Le moteur d'images que détient une application. |
| `Pipeline` | classe | Des opérations en attente sur une image, exécutées une seule fois par `toBuffer`. |
| `defineConfig` | fonction | Type `config/images.ts`. |
| `registerImageRoute` | fonction | Monte le point d'accès de transformation d'images. |
| `DEFAULT_WIDTHS` | const | Les largeurs que le point d'accès autorise par défaut. |
| `ImageHttpContext`, `ImageRouter` | interface | Le contexte HTTP et le routeur dont a besoin le point d'accès. |
| `qrcode` | const | `toString`, `toBuffer`, `toDataURL` : des QR codes en SVG ou en image. |
| `QRCodeOptions` et les autres types `QRCode*` | type | Les options des QR codes. |
| `isNativeAvailable` | fonction | Indique si le moteur Rust est chargé. |
| `PrismError` | erreur | Tout échec de prism. |
| `PrismNativeRequiredError` | erreur | Le moteur Rust n'est pas chargé. |
| `PRISM_CODES` | const | Les codes du moteur, sans le préfixe `E_PRISM_`. |
| `PrismCode` | type | Un des `PRISM_CODES`. |
| `PrismConfig`, `Limits`, `ImageServingConfig` | type | La configuration. |
| `ReadableFormat`, `ImageFormat` | type | Les formats que le moteur lit et écrit. |
| `Metadata` | type | Ce que renvoie `inspect`. |
| `Operation` | type | Une opération en attente, une union sur `kind`. |
| `OutputOptions` | type | Options de `toBuffer`. |
| `ResizeOptions`, `CropOptions`, `CompositeOptions`, `WatermarkTextOptions`, `ThumbnailOptions`, `SharpenOptions`, `ConvertColorSpaceOptions` | type | Les options des opérations. |
| `Fit`, `Colour`, `ColorSpace` | type | Des valeurs d'options. |

### `Prism`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Prism(config?: PrismConfig)` | |
| `config` | `config(): PrismConfig` | La configuration avec laquelle il a été construit. |
| `inspect` | `inspect(bytes: Buffer, limits?: Limits): Metadata` | Identifie l'image à partir de son contenu et la décrit sans décoder les pixels. |
| `edit` | `edit(bytes: Buffer): Pipeline` | Démarre un pipeline sur une image encodée. |

### `Pipeline`

Chaque opération se met en attente et renvoie `this` ; rien ne touche le moteur avant `toBuffer` ou `toFormat`, qui décodent, exécutent chaque opération et encodent une seule fois.

| Membre | Signature | Description |
|---|---|---|
| `resize` | `resize(options: ResizeOptions): this` | `{ width?, height?, fit? }`, `fit` valant `'cover'` par défaut. |
| `crop` | `crop(options: CropOptions): this` | `{ x, y, width, height }`. |
| `rotate` | `rotate(degrees: number): this` | Un multiple de 90 ; les valeurs négatives et supérieures à 360 sont normalisées. |
| `flip` | `flip(axis: 'horizontal' \| 'vertical'): this` | |
| `composite` | `composite(options: CompositeOptions): this` | Superpose une `image` encodée en `x`, `y` (signés, 0 par défaut) avec une `opacity` de 0 à 1 (1 par défaut) ; la superposition passe par les mêmes garde-fous que l'entrée. |
| `watermarkText` | `watermarkText(options: WatermarkTextOptions): this` | Dessine `text` avec `font` (les octets de la police ; aucune n'est fournie), `size` (32 par défaut), `color` (blanc opaque par défaut), `x`, `y`. |
| `thumbnail` | `thumbnail(options: ThumbnailOptions): this` | Réduction rapide par boîte, `{ width?, height?, exact? }` ; plus douce que `resize`. |
| `blur` | `blur(sigma: number): this` | Flou gaussien. |
| `fastBlur` | `fastBlur(sigma: number): this` | Flou approché par boîtes, bien moins coûteux. |
| `sharpen` | `sharpen(options: SharpenOptions): this` | Masque flou : `sigma` au-dessus de 0 jusqu'à 100, `threshold` de 0 à 65535 (0 par défaut). |
| `brighten` | `brighten(value: number): this` | De -255 à 255. |
| `contrast` | `contrast(value: number): this` | De -255 à 255. |
| `hueRotate` | `hueRotate(value: number): this` | En degrés ; boucle. |
| `invert` | `invert(): this` | |
| `grayscale` | `grayscale(): this` | |
| `filter3x3` | `filter3x3(kernel: readonly number[]): this` | Une convolution 3×3, par lignes, exactement neuf valeurs. |
| `convertColorSpace` | `convertColorSpace(options: ConvertColorSpaceOptions): this` | Convertit les échantillons vers l'espace `to` ; `from` remplace ce que déclare le fichier. |
| `operations` | `operations(): readonly Operation[]` | Les opérations en attente. |
| `toBuffer` | `toBuffer(output: OutputOptions): Promise<Buffer>` | Exécute tout et encode. |
| `toFormat` | `toFormat(format: ImageFormat, quality?: number): Promise<Buffer>` | `toBuffer` en ne nommant que le format. |

| Champ de `OutputOptions` | Type | Défaut | Description |
|---|---|---|---|
| `format` | `ImageFormat` | requis | |
| `quality` | `number` | `quality` de la configuration, sinon 82 | Un entier de 1 à 100, pour les formats qui ont un réglage de qualité. |
| `background` | `Colour` | blanc opaque | Ce sur quoi la transparence est fondue pour un format sans alpha. |
| `depth` | `8 \| 16` | `8` | Bits par canal ; seuls PNG et TIFF portent 16, les autres le réduisent. |
| `effort` | `number` | `4` | L'effort CPU d'AVIF, de 0 (le plus rapide) à 9. |

| Type | Valeurs |
|---|---|
| `ReadableFormat` | `'jpeg' \| 'png' \| 'webp' \| 'gif' \| 'bmp' \| 'ico' \| 'tiff' \| 'tga' \| 'qoi' \| 'pnm' \| 'dds' \| 'farbfeld' \| 'hdr' \| 'openexr' \| 'avif'` |
| `ImageFormat` | `ReadableFormat` sans `'dds'` (lisible, pas inscriptible). |
| `Fit` | `'fill'` (taille exacte, déforme), `'contain'` (tient dedans), `'cover'` (remplit et recadre, centré), `'inside'` (comme `contain`, n'agrandit jamais). |
| `Colour` | `{ r: number; g: number; b: number; a?: number }`, de 0 à 255. |
| `ColorSpace` | `'srgb' \| 'linear-srgb' \| 'display-p3' \| 'dci-p3' \| 'rec709'` |

| Champ de `Metadata` | Type | Description |
|---|---|---|
| `width`, `height` | `number` | Lus dans l'en-tête. |
| `orientedWidth`, `orientedHeight` | `number` | Après application de l'orientation EXIF. |
| `orientation` | `number` | L'orientation EXIF, de 1 à 8 ; `1` s'il n'y en a pas. |
| `format` | `ImageFormat \| string` | Établi à partir du contenu. |
| `hasAlpha` | `boolean` | |
| `colorSpace` | `string` | L'espace colorimétrique que déclare le fichier (`srgb` s'il n'en déclare aucun). |

### Point d'accès images

| Fonction | Signature | Description |
|---|---|---|
| `registerImageRoute` | `registerImageRoute(router: ImageRouter, images: Prism, config: ImageServingConfig): unknown` | Monte `GET <path>?src=&w=&f=&q=` ; renvoie ce que renvoie le routeur, pour pouvoir ajouter des middlewares. Chaque axe est sur liste blanche et une requête hors des listes est refusée avant tout décodage ; les réponses ne portent pas d'EXIF et ont une CSP en bac à sable. Le provider l'appelle quand `serve` est configuré. |

`DEFAULT_WIDTHS` vaut `16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560, 3200, 3840, 4480, 5120, 6016`.

### `qrcode`

| Membre | Signature | Description |
|---|---|---|
| `toString` | `toString(text: string, options?: QRCodeToStringOptions): Promise<string>` | Le QR code en document SVG. |
| `toBuffer` | `toBuffer(text: string, options?: QRCodeToBufferOptions): Promise<Buffer>` | PNG par défaut, ou WebP, AVIF, SVG (`type`) ; `rendererOpts.quality` de 1 à 100 pour WebP et AVIF (100 par défaut). |
| `toDataURL` | `toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>` | Une URL `data:` pour un `<img src>`. |

| Champ de `QRCodeOptions` | Type | Défaut | Description |
|---|---|---|---|
| `errorCorrectionLevel` | `QRCodeErrorCorrectionLevel` | `'M'`, `'H'` avec un logo | `L`, `M`, `Q`, `H` ou `low`, `medium`, `quartile`, `high`. |
| `version` | `number` | la plus petite qui suffit | De 1 à 40. |
| `margin` | `number` | `4` | Zone de silence, en modules. |
| `scale` | `number` | `4` | Pixels par module. |
| `width` | `number` | | Côté en pixels ; l'emporte sur `scale` dès qu'il contient le symbole. |
| `color` | `{ dark?: string; light?: string }` | noir sur blanc | Hexadécimal, de `#rgb` à `#rrggbbaa`. |
| `dotsOptions` | `QRCodeFigureOptions<QRCodeDotType>` | `square` | `type` (`square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`), `color`, `gradient`. |
| `cornersSquareOptions` | `QRCodeFigureOptions<QRCodeCornerSquareType>` | comme les modules | Les cadres des repères. |
| `cornersDotOptions` | `QRCodeFigureOptions<QRCodeCornerDotType>` | comme les modules | Les centres des repères ; `dots` est refusé. |
| `backgroundOptions` | `{ round?: number; color?: string; gradient?: QRCodeGradient }` | | `round` de 0 (carré) à 1 (cercle). |
| `image` | `Uint8Array` | | Un logo : octets PNG, JPEG ou WebP. |
| `imageOptions` | `{ imageSize?: number; margin?: number; hideBackgroundDots?: boolean }` | `0.4`, `0`, `true` | `imageSize` au plus 0,5. |

`QRCodeGradient` vaut `{ type?: 'linear' | 'radial'; rotation?: number; colorStops: Array<{ offset: number; color: string }> }` avec 1 à 16 arrêts. Tout ce qui est dessiné doit garder un contraste de 3:1 avec le fond. Les options invalides sont refusées avec `E_PRISM_INVALID_QR_OPTION`.

### `PrismError`

Étend `Error` ; `name` vaut le nom de la classe. `PrismNativeRequiredError` l'étend avec le code `E_PRISM_NATIVE_REQUIRED`.

| Membre | Signature | Description |
|---|---|---|
| `code` | `readonly code: string` | `E_PRISM_<code>` pour un code du moteur, `E_PRISM_ENGINE` sinon. |
| constructeur | `new PrismError(code: string, message: string, options?: ErrorOptions)` | |

### `@c9up/prism/provider`

| Export | Nature | Description |
|---|---|---|
| `PrismProvider` | provider (par défaut) | `register()` lie `Prism` à partir de la configuration `images` (sans charger de binaire) ; `boot()` publie le service et monte le point d'accès images quand `serve` est défini et qu'une liaison `router` existe ; `shutdown()` efface le service. |

### `@c9up/prism/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | L'instance `Prism` de l'application. Tout accès à une propriété avant le démarrage du provider lève une erreur. |

### `@c9up/prism/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ce qu'exécute `ream configure @c9up/prism`. |

### `@c9up/prism/testing`

| Export | Nature | Description |
|---|---|---|
| `fakeImages` | fonction | `fakeImages(config?: PrismConfig): { images: Prism; restore: () => void }` : publie un vrai `Prism` sur `services/main` le temps d'un test ; `restore()` l'efface. |

### `@c9up/prism/swissqrbill/pdf`

Dessine dans un document PDFKit qui appartient à l'appelant ; PDFKit n'est pas une dépendance. Les constructeurs nettoient et valident les données et encodent le QR code, en levant `ValidationError` ou `E_PRISM_QR_TOO_LONG`.

| Export | Signature | Description |
|---|---|---|
| `SwissQRBill` | `new SwissQRBill(data: Data, options?: PDFOptions)` | Le bulletin de versement, 210 × 105 mm. |
| `SwissQRBill.attachTo` | `attachTo(doc: PDFKitDocument, x?: number, y?: number): void` | Dessine le bulletin, en bas de page par défaut ; ajoute une page à sa taille si la page courante n'a pas la place. |
| `SwissQRBill.isSpaceSufficient` | `static isSpaceSufficient(doc: PDFKitDocument, x?: number, y?: number): boolean` | Indique si le bulletin tient à cette position. |
| `SwissQRBill.width`, `SwissQRBill.height` | `static readonly number` | La taille du bulletin en points. |
| `SwissQRCode` | `new SwissQRCode(data: Data, size?: number)` | Le QR code seul, `size` en mm (46 par défaut) ; `attachTo(doc, x?, y?)`. |
| `PDFKitDocument`, `PDFKitTextOptions` | interface | La partie d'un document PDFKit avec laquelle dessine le bulletin. |
| `Data`, `PDFOptions` | type | Réexportés de `swissqrbill/types`. |

### `@c9up/prism/swissqrbill/svg`

| Export | Signature | Description |
|---|---|---|
| `SwissQRBill` | `new SwissQRBill(data: Data, options?: SVGOptions)` | Le bulletin en SVG ; `toString(): string`. |
| `SwissQRCode` | `new SwissQRCode(data: Data, size?: number)` | Le QR code seul en SVG ; `toString(): string`. |
| `Data`, `SVGOptions` | type | Réexportés de `swissqrbill/types`. |

### `@c9up/prism/swissqrbill/utils`

| Fonction | Signature |
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

| Export | Nature | Description |
|---|---|---|
| `ValidationError` | erreur | Un bulletin QR que les règles suisses refusent ; étend `PrismError`. Son `code` est une clé de `ValidationErrors` (comme `ACCOUNT_IS_QR_IBAN_BUT_REFERENCE_IS_MISSING`), pas un code `E_`. |
| `ValidationErrors` | const | Chaque code de validation et son message. |
| `ValidationErrorCode` | type | `keyof typeof ValidationErrors`. |

### `@c9up/prism/swissqrbill/types`

| Type | Forme |
|---|---|
| `Data` | `{ creditor: Creditor; currency: 'CHF' \| 'EUR'; amount?: number; reference?: string; message?: string; additionalInformation?: string; av1?: string; av2?: string; debtor?: Debtor }` |
| `Debtor` | `{ name: string; address: string; buildingNumber?: number \| string; zip: number \| string; city: string; country: string }` |
| `Creditor` | `Debtor & { account: string }` |
| `SVGOptions` | `{ fontName?: FontName; language?: Language; outlines?: boolean; renderAdditionalInformation?: boolean; scissors?: boolean }` |
| `PDFOptions` | les champs de `SVGOptions` plus `separate?: boolean` |
| `Language` | `'DE' \| 'EN' \| 'FR' \| 'IT' \| 'RM'` (`DE` par défaut) |
| `FontName` | `'Arial' \| 'Frutiger' \| 'Helvetica' \| 'Liberation Sans'` (Helvetica par défaut dans un PDF, Arial dans un SVG) |
| `Currency` | `'CHF' \| 'EUR'` |

## Configuration

`config/images.ts`, écrit par `ream configure @c9up/prism` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `limits.maxPixels` | `number` | `50000000` | Le plus grand nombre de pixels décodés, vérifié avant décodage. La configuration générée lit `IMAGE_MAX_PIXELS`. |
| `limits.maxBytes` | `number` | `67108864` (64 Mio) | La plus grande entrée acceptée. |
| `limits.allowedFormats` | `readonly ReadableFormat[]` | `['jpeg', 'png', 'webp']` | Les formats que l'application décode ; un nom inconnu lève une erreur. |
| `quality` | `number` | `82` | La qualité de sortie par défaut. |
| `autoOrient` | `boolean` | `true` | Appliquer l'orientation EXIF au décodage. |
| `serve` | `ImageServingConfig` | aucun | Monte le point d'accès images ; absent, aucune route n'est ajoutée. |
| `serve.path` | `string` | `'/__image'` | Le chemin de la route. |
| `serve.roots` | `readonly string[]` | requis | Les répertoires absolus dans lesquels un `src` peut se résoudre ; une liste vide est refusée au démarrage. |
| `serve.widths` | `readonly number[]` | `DEFAULT_WIDTHS` | Les largeurs autorisées. |
| `serve.formats` | `readonly ImageFormat[]` | AVIF, WebP, JPEG, PNG | Les formats autorisés. |
| `serve.qualities` | `readonly number[]` | `[serve.quality]` | Les qualités autorisées. |
| `serve.quality` | `number` | `82` | La qualité quand la requête n'en nomme aucune. |
| `serve.cacheDir` | `string` | | Conserve les variantes rendues sur disque. |
| `serve.memoryCacheBytes` | `number` | 32 Mio | Sans `cacheDir`, la taille du cache en mémoire ; 0 le désactive. |
| `serve.maxAge` | `number` | un an | `max-age`, en secondes. |
| `serve.concurrency` | `number` | `2` | Le nombre de rendus simultanés ; gardez-le sous `UV_THREADPOOL_SIZE`. |
| `serve.queueLimit` | `number` | `64` | Le nombre de rendus autorisés à attendre ; au-delà, 503 avec `Retry-After`. |
| `serve.effort` | `number` | `1` | L'effort d'encodage AVIF pour le point d'accès. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `Prism` | Le singleton `Prism`. |
| `'prism.images'` | La même instance. |
| `'images'` | La même instance. |

Les jetons en chaîne sont déclarés sur `ContainerBindings`.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_PRISM_IMAGE_NO_SOURCE`](/fr/reference/errors#e-prism-image-no-source) | Le point d'accès est appelé sans `src` (400). |
| [`E_PRISM_IMAGE_WIDTH_NOT_ALLOWED`](/fr/reference/errors#e-prism-image-width-not-allowed) | `w` n'est pas une largeur configurée (400). |
| [`E_PRISM_IMAGE_FORMAT_NOT_ALLOWED`](/fr/reference/errors#e-prism-image-format-not-allowed) | `f` n'est pas un format configuré (400). |
| [`E_PRISM_IMAGE_QUALITY_NOT_ALLOWED`](/fr/reference/errors#e-prism-image-quality-not-allowed) | `q` n'est pas une qualité configurée (400). |
| [`E_PRISM_IMAGE_NOT_FOUND`](/fr/reference/errors#e-prism-image-not-found) | Aucune image à `src` (404). |
| [`E_PRISM_IMAGE_UNPROCESSABLE`](/fr/reference/errors#e-prism-image-unprocessable) | La source n'est pas une image que le point d'accès sait servir (422). |
| [`E_PRISM_IMAGE_BUSY`](/fr/reference/errors#e-prism-image-busy) | Trop de rendus attendent (503). |
| [`E_PRISM_EMPTY_INPUT`](/fr/reference/errors#e-prism-empty-input) | L'entrée est vide. |
| [`E_PRISM_INPUT_TOO_LARGE`](/fr/reference/errors#e-prism-input-too-large) | L'entrée dépasse `maxBytes`. |
| [`E_PRISM_TOO_MANY_PIXELS`](/fr/reference/errors#e-prism-too-many-pixels) | L'image, ou celle qu'une opération construirait, dépasse `maxPixels`. |
| [`E_PRISM_ZERO_DIMENSION`](/fr/reference/errors#e-prism-zero-dimension) | L'image a une largeur ou une hauteur nulle. |
| [`E_PRISM_UNKNOWN_FORMAT`](/fr/reference/errors#e-prism-unknown-format) | Les octets ne sont pas un format d'image que prism reconnaît. |
| [`E_PRISM_UNSUPPORTED_FORMAT`](/fr/reference/errors#e-prism-unsupported-format) | Le format est reconnu mais non pris en charge. |
| [`E_PRISM_FORMAT_NOT_ALLOWED`](/fr/reference/errors#e-prism-format-not-allowed) | Le format n'est pas dans `allowedFormats`. |
| [`E_PRISM_UNREADABLE`](/fr/reference/errors#e-prism-unreadable) | L'image ne peut pas être lue. |
| [`E_PRISM_DECODE_FAILED`](/fr/reference/errors#e-prism-decode-failed) | Le décodage a échoué. |
| [`E_PRISM_ENCODE_FAILED`](/fr/reference/errors#e-prism-encode-failed) | L'encodage de la sortie a échoué. |
| [`E_PRISM_INVALID_GEOMETRY`](/fr/reference/errors#e-prism-invalid-geometry) | Un recadrage hors de l'image, une taille cible nulle. |
| [`E_PRISM_INVALID_FONT`](/fr/reference/errors#e-prism-invalid-font) | Une police n'est pas utilisable. |
| [`E_PRISM_COLOUR_SPACE`](/fr/reference/errors#e-prism-colour-space) | Un espace colorimétrique ne peut pas être nommé, ou une conversion est refusée. |
| [`E_PRISM_INVALID_OPERATION`](/fr/reference/errors#e-prism-invalid-operation) | Il manque un champ à une opération, ou l'un est hors limites. |
| [`E_PRISM_QR_TOO_LONG`](/fr/reference/errors#e-prism-qr-too-long) | Plus de texte qu'un QR code n'en contient au niveau et à la version choisis. |
| [`E_PRISM_INVALID_QR_OPTION`](/fr/reference/errors#e-prism-invalid-qr-option) | Une option de QR code est hors limites, ou une couleur n'est pas en hexadécimal strict. |
| [`E_PRISM_INTERNAL_PANIC`](/fr/reference/errors#e-prism-internal-panic) | Le moteur a paniqué. |
| [`E_PRISM_ENGINE`](/fr/reference/errors#e-prism-engine) | Le moteur a échoué sans code connu. |
| [`E_PRISM_NATIVE_REQUIRED`](/fr/reference/errors#e-prism-native-required) | Le moteur d'images Rust n'est pas chargé. |

## Voir aussi

- [Introduction](/fr/guides/digging-deeper/images/)
- [Servir des images](/fr/guides/digging-deeper/images/serving)
- [Formats et couleur](/fr/guides/digging-deeper/images/formats)
- [QR codes](/fr/guides/digging-deeper/images/qr-codes)
- [Sécurité et tests](/fr/guides/digging-deeper/images/safety)
