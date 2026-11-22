# QR codes

Ce guide couvre les QR codes et les QR-factures suisses :

- Style
- Bulletins QR suisses

## QR codes

`qrcode` écrit un QR code en SVG — la sortie à privilégier sur une page, nette à
toutes les tailles et de quelques centaines d'octets — ou en PNG, WebP ou AVIF
par les mêmes encodeurs que le reste de Prism :

```ts
import { qrcode } from '@c9up/prism'

const svg = await qrcode.toString(uri)                               // SVG
const png = await qrcode.toBuffer(uri, { width: 300 })               // PNG
const avif = await qrcode.toBuffer(uri, { type: 'avif', margin: 2 })
const src = await qrcode.toDataURL(uri, { type: 'svg' })             // <img src>
```

| Option | Défaut | |
|---|---|---|
| `errorCorrectionLevel` | `M` | `L`, `M`, `Q`, `H` (ou `low` … `high`) : environ 7 à 30 % du symbole peut être perdu |
| `version` | la plus petite qui suffit | 1 à 40 |
| `margin` | `4` | zone de silence, en modules — ce qu'attendent les lecteurs |
| `scale` | `4` | pixels par module |
| `width` | — | côté en pixels ; l'emporte sur `scale` dès qu'il contient le symbole |
| `color.dark` / `color.light` | `#000000ff` / `#ffffffff` | hexadécimal, de `#rgb` à `#rrggbbaa` ; une couleur claire transparente retire le fond |
| `type` | `svg` (`toString`), `png` | `png`, `webp`, `avif`, `svg`, ou leurs types MIME |
| `rendererOpts.quality` | `100` | WebP et AVIF ; 100 est sans perte en WebP — des bords dégradés font hésiter les lecteurs |

Le SVG est un seul `path` de segments horizontaux, un `viewBox`, et
`shape-rendering="crispEdges"`.

Tout peut venir d'une requête, donc tout est borné : un texte au-delà de ce que
contient un QR code au niveau choisi lève `E_PRISM_QR_TOO_LONG` ; une image de
plus de 4096 pixels de côté, une marge au-delà de 64, une version hors 1–40, une
couleur qui n'est pas de l'hexadécimal strict ou une couleur foncée à moins de
3:1 de contraste avec la claire lève `E_PRISM_INVALID_QR_OPTION`, jamais un repli silencieux. Le
SVG est écrit à partir des canaux de couleur analysés, jamais de la chaîne
fournie : une couleur ne peut pas injecter de balisage.

`toString` n'écrit que du SVG, et WebP et AVIF sont disponibles côté serveur.

### Style

Les options de style changent le dessin du code :
formes des modules, repères d'angle, couleurs ou dégradés, fond arrondi et
logo. Les mêmes options stylent le SVG et les images, qui sont ce SVG rendu.

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

| Option | Valeurs |
|---|---|
| `dotsOptions.type` | `square` (défaut), `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded` — les formes arrondies suivent leurs voisins |
| `cornersSquareOptions.type` | les cadres 7 × 7 des repères : `square`, `dot`, `extra-rounded`, ou une forme de module ; sans valeur, dessinés comme les modules |
| `cornersDotOptions.type` | les centres 3 × 3 des repères : `square`, `dot`, ou une forme de module autre que `dots` |
| `….color` | hexadécimal ; les cadres prennent par défaut la couleur des modules, les centres celle des cadres |
| `….gradient` | `{ type: 'linear' \| 'radial', rotation, colorStops }`, 1 à 16 arrêts ; l'emporte sur `color` |
| `backgroundOptions` | `color` (défaut `color.light`), `gradient`, `round` de 0 (carré) à 1 (un cercle) |
| `image` | les octets du logo — PNG, JPEG ou WebP |
| `imageOptions.imageSize` | part de la correction d'erreur que le logo peut couvrir, au-dessus de 0 et jusqu'à `0.5` ; défaut `0.4` |
| `imageOptions.margin` | espace autour du logo, en modules ; défaut `0` |
| `imageOptions.hideBackgroundDots` | retirer les modules sous le logo ; défaut `true` |

Les longueurs restent en modules : `margin`, `scale` et `width` gardent le sens
donné plus haut. Le logo est un envoi comme un autre : il passe par la sonde et
les limites de Prism, est décodé, puis intégré réencodé en PNG — jamais
téléchargé depuis une URL. Avec un logo, la correction d'erreur passe par
défaut à `H`, et la zone masquée est calculée sur la capacité de récupération du
niveau.

Un code doit rester lisible, donc ce qui ne le serait pas est refusé avec
`E_PRISM_INVALID_QR_OPTION` : un `imageSize` au-delà de 0.5, une couleur ou un
arrêt de dégradé à moins de 3:1 de contraste avec le fond (le seuil WCAG des
éléments graphiques ; un fond transparent n'est pas jugé), et des centres de
repère dessinés en neuf `dots` séparés, que ZXing — le décodeur de la plupart
des lecteurs sur téléphone — ne trouve pas. Avec des modules `dots` et sans
`cornersDotOptions.type`, les centres sont un seul rond `dot`. Chaque style est
relu par ZXing dans les tests.

### Bulletins QR suisses

Le bulletin de versement au pied d'une facture suisse — récépissé, section
paiement et QR code avec sa croix suisse — sous `@c9up/prism/swissqrbill/*`,
réparti en `pdf`, `svg`, `utils`, `errors` et `types`.

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
new SwissQRBill(data, { language: 'FR' }).attachTo(doc)  // vectoriel, dans votre document
doc.end()

const svg = new SwissQRBillSVG(data).toString()
```

Le constructeur valide : des données fausses lèvent une `ValidationError`
avant que rien ne soit dessiné. `attachTo(doc)` dessine le bulletin au pied de
la page courante s'il y tient, sur une nouvelle page sinon. Il dessine du
contenu vectoriel (texte, traits et QR code) dans le document PDFKit de
l'application, donc le texte reste sélectionnable. PDFKit est une dépendance de
l'application, pas de Prism. `SwissQRCode` dessine le QR code seul, et `utils`
regroupe les fonctions d'IBAN, de référence et de montant.

Le moteur encode le QR code avec le masque que choisit l'encodeur de référence
suisse : c'est le même symbole, module pour module. Une `ValidationError` porte un code
et un message (`CREDITOR_ACCOUNT_IS_INVALID`, `QR_REFERENCE_IS_INVALID`…) sur
lesquels brancher.

À savoir :

- des données trop longues pour le QR code sont refusées par le constructeur
  avec `E_PRISM_QR_TOO_LONG`, pas au milieu du dessin ;
- le SVG dessine le QR code en un seul tracé plutôt qu'un rectangle par
  module : le bulletin entier pèse environ 12 Ko ;
- les attributs du SVG sont échappés ;
- un caractère absent des tables de largeur de la police ne coupe pas une
  adresse SVG à un mot par ligne ;
- une référence de créancier (`RF…`) est vérifiée sans tenir compte de la
  casse, comme le prévoit ISO 11649.

Les classes SVG rendent une chaîne (pas d'élément DOM).
