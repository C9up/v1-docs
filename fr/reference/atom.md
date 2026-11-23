# atom

`@c9up/atom` : arithmétique décimale exacte, statistiques et montants liés à une devise, sur un moteur Rust avec un repli TypeScript. Guide : [Décimaux et montants](/fr/guides/digging-deeper/decimals).

## Installation

```bash
pnpm add @c9up/atom
```

Le moteur Rust se charge par N-API dans Node, par WebAssembly dans le navigateur et par un module JSI sur un téléphone (déclaré dans `reamNative`, lié par `ream android:*`). Là où aucun ne se charge, le moteur TypeScript répond, avec les mêmes chiffres.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/atom` | `Decimal`, `Money`, les agrégats, l'espace de noms `Atom`, les fonctions de contexte et les plans `Atom.bulk`. |
| `@c9up/atom/atlas` | Les adaptateurs de colonne pour `@c9up/atlas` : `decimalColumn` et `decimalAtlasAdapter`. |

## Exports

### `@c9up/atom`

| Export | Nature | Description |
|---|---|---|
| `Decimal` | classe | Une valeur décimale exacte. Immuable : chaque opération en renvoie une nouvelle. |
| `decimal` | fonction | `decimal(value: DecimalInput): Decimal`, identique à `Decimal.from`. |
| `Money` | classe | Un montant lié à une devise et tenu à l'échelle de cette devise. |
| `money` | fonction | `money(amount: DecimalInput, currency: string, options?: MoneyOptions): Money`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `sum` | fonction | Somme exacte. Une entrée vide vaut `0`. |
| `avg` | fonction | Moyenne arithmétique. Lève une erreur sur une entrée vide. |
| `median` | fonction | Valeur du milieu ; la moyenne des deux valeurs du milieu pour un nombre pair. |
| `mode` | fonction | Les valeurs les plus fréquentes, triées. `[]` quand aucune valeur ne se répète. |
| `stddev` | fonction | Écart type, de population par défaut. |
| `min` | fonction | Plus petite valeur. Lève une erreur sur une entrée vide. |
| `max` | fonction | Plus grande valeur. Lève une erreur sur une entrée vide. |
| `Atom` | const | Espace de noms : `decimal`, `bulk`, `sum`, `avg`, `median`, `mode`, `stddev`, `min`, `max`, `parseLocale`, `money`. |
| `bulk` | fonction | Planifie un calcul sur des colonnes et l'exécute en un seul appel au moteur. |
| `Bulk` | classe | Un plan : le `b` que reçoit un callback de `bulk`. |
| `BulkColumn` | classe | Une colonne de valeurs planifiée. |
| `BulkScalar` | classe | Une valeur unique planifiée. |
| `configureAtomContext` | fonction | Change la précision et les modes d'arrondi par défaut. |
| `getAtomContext` | fonction | Une copie du contexte en vigueur. |
| `resetAtomContext` | fonction | Rétablit les valeurs par défaut. |
| `withAtomContext` | fonction | Exécute un callback sous d'autres valeurs par défaut. |
| `isNativeAvailable` | fonction | `isNativeAvailable(): boolean` : si le moteur Rust (N-API ou WASM) s'est chargé. |
| `DecimalInput` | type | `string \| number \| bigint \| Decimal`. |
| `RoundMode` | type | `'trunc' \| 'floor' \| 'ceil' \| 'half-up' \| 'half-even'`. |
| `DecimalScaled` | interface | `{ value: bigint; scale: number }`, tel que `toParts()` le renvoie. |
| `DecimalSafeParseResult` | type | `{ success: true; value: Decimal } \| { success: false; error: Error }`. |
| `DivOptions`, `PowOptions`, `SqrtOptions` | interface | `{ precision?: number; mode?: RoundMode }`. |
| `MedianOptions` | interface | `{ precision?: number; mode?: RoundMode }`. |
| `StddevOptions` | interface | `{ sample?: boolean; precision?: number; mode?: RoundMode }`. |
| `QuantizeOptions` | interface | `{ mode?: RoundMode }`. |
| `BetweenOptions` | interface | `{ inclusive?: boolean }`, `true` par défaut. |
| `ToMinorUnitsOptions` | interface | `{ exact?: boolean; mode?: RoundMode }`. |
| `MoneyOptions` | interface | `{ scale?: number; exact?: boolean; mode?: RoundMode }`. |
| `MoneyRoundingOptions` | interface | `{ mode?: RoundMode }`. |
| `MoneyFormatOptions` | interface | `Intl.NumberFormatOptions` sans `style` ni `currency`, plus `locale?: Intl.LocalesArgument`. |
| `AtomContext` | interface | `{ precision: number; roundMode: RoundMode; quantizeMode: RoundMode; maxDigits: number }`. |
| `AtomContextOptions` | type | `Partial<AtomContext>`. |
| `BulkDivOptions` | interface | `{ precision?: number; mode?: RoundMode }`. |
| `BulkStddevOptions` | interface | `BulkDivOptions` plus `sample?: boolean`. |

Passez des chaînes ou des bigints pour les données métier : un `number` qui n'est pas un entier sûr est refusé.

### Agrégats

Chaque agrégat prend soit un itérable, soit les valeurs en arguments.

| Fonction | Signature | Description |
|---|---|---|
| `sum` | `sum(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal` | Somme exacte, par l'entrée par lot du moteur. |
| `avg` | `avg(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal` | Somme divisée par le nombre de valeurs, à la précision du contexte. |
| `median` | `median(...args: [Iterable<DecimalInput>, MedianOptions?] \| DecimalInput[]): Decimal` | Les options ne s'appliquent qu'à la forme itérable. |
| `mode` | `mode(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal[]` | Toutes les valeurs les plus fréquentes. |
| `stddev` | `stddev(...args: [Iterable<DecimalInput>, StddevOptions?] \| DecimalInput[]): Decimal` | `sample: true` divise par N-1 et demande deux valeurs. La moyenne et la variance portent huit chiffres de plus que `precision`. |
| `min` / `max` | `min(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal` | |

### `Decimal`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Decimal(value: DecimalInput, scaleHint?: number)` | Analyse la valeur. `scaleHint` est l'échelle que rapporte `toParts()`. |
| `from` / `parse` | `static from(value: DecimalInput): Decimal` | Identique au constructeur. |
| `tryParse` | `static tryParse(value: unknown): Decimal \| null` | `null` au lieu de lever une erreur. |
| `safeParse` | `static safeParse(value: unknown): DecimalSafeParseResult` | Un objet résultat au lieu de lever une erreur. |
| `isDecimal` | `static isDecimal(value: unknown): value is Decimal` | |
| `sum` | `static sum(values: Iterable<DecimalInput>): Decimal` | Tout le lot en un appel au moteur ; égal à un repli de `plus`. |
| `dot` | `static dot(a: Iterable<DecimalInput>, b: Iterable<DecimalInput>): Decimal` | `Σ aᵢ·bᵢ` en un appel. Lève une erreur si les longueurs diffèrent. |
| `zero` / `one` | `static zero(): Decimal` | |
| `fromMinorUnits` | `static fromMinorUnits(value: string \| number \| bigint, scale: number): Decimal` | `fromMinorUnits(1999n, 2)` vaut `19.99`. |
| `parseLocale` | `static parseLocale(value: string, localesOrRosetta?: Intl.LocalesArgument \| RosettaLike): Decimal` | Analyse `'1.234,56'` avec les séparateurs de la locale. Une instance rosetta peut tenir lieu de locale. |
| `plus` / `minus` / `times` | `plus(other: DecimalInput): Decimal` | Exact. |
| `div` | `div(other: DecimalInput, options?: DivOptions): Decimal` | Arrondi une seule fois, depuis le quotient exact, à `precision` chiffres en `mode`. |
| `mod` | `mod(other: DecimalInput): Decimal` | |
| `pow` | `pow(exp: number, options?: PowOptions): Decimal` | Exposant entier jusqu'à `MAX_EXPONENT_ABS` (100 000), dans les deux signes ; un exposant négatif divise. |
| `sqrt` | `sqrt(options?: SqrtOptions): Decimal` | |
| `cmp` | `cmp(other: DecimalInput): -1 \| 0 \| 1` | |
| `eq` / `lt` / `lte` / `gt` / `gte` | `eq(other: DecimalInput): boolean` | |
| `min` / `max` | `min(other: DecimalInput): Decimal` | |
| `clamp` | `clamp(min: DecimalInput, max: DecimalInput): Decimal` | Lève une erreur si `min > max`. |
| `between` | `between(min: DecimalInput, max: DecimalInput, options?: BetweenOptions): boolean` | Bornes incluses par défaut. |
| `abs` / `neg` | `abs(): Decimal` | |
| `isZero` / `isPositive` / `isNegative` / `isInteger` | `isZero(): boolean` | `isPositive()` est faux pour zéro. |
| `trunc` / `floor` / `ceil` | `trunc(scale = 0): Decimal` | Arrondit à `scale` chiffres dans ce mode. |
| `round` / `toScale` | `toScale(scale = 0, mode?: RoundMode): Decimal` | Arrondit à `scale` chiffres, dans le `roundMode` du contexte par défaut. |
| `quantize` | `quantize(step: DecimalInput, options?: QuantizeOptions): Decimal` | Multiple de `step` le plus proche (`'0.05'`), dans le `quantizeMode` du contexte par défaut. |
| `toFixed` | `toFixed(scale: number, mode?: RoundMode): string` | Exactement `scale` chiffres après la virgule. |
| `toMinorUnits` | `toMinorUnits(scale: number, options?: ToMinorUnitsOptions): bigint` | Lève une erreur sur une perte de chiffres, sauf avec `exact: false`, qui arrondit en `mode` (`'trunc'` par défaut). |
| `percent` | `percent(rate: DecimalInput, options?: DivOptions): Decimal` | `this × rate / 100`. |
| `applyPercent` | `applyPercent(rate: DecimalInput, options?: DivOptions): Decimal` | `this + this × rate / 100`. |
| `percentageOf` | `percentageOf(total: DecimalInput, options?: DivOptions): Decimal` | `this / total × 100`. |
| `allocate` | `allocate(ratios: Array<string \| number \| bigint>): Decimal[]` | Répartit selon des ratios entiers ; les parts font exactement la valeur, le reste allant d'abord aux plus grands restes. |
| `toParts` | `toParts(): DecimalScaled` | Valeur entière et échelle. |
| `toString` / `toJSON` | `toString(): string` | Forme canonique, zéros finaux retirés (`'1.2300'` s'écrit `'1.23'`). |
| `toNumber` | `toNumber(): number` | Avec perte au-delà de 15 à 16 chiffres significatifs. |
| `toLocale` | `toLocale(localesOrRosetta?: Intl.LocalesArgument \| RosettaLike, options?: Intl.NumberFormatOptions): string` | Formatage localisé exact. |

L'échelle d'une valeur ne se conserve pas à travers les calculs : pour stocker ou répartir, passez l'échelle que déclare votre colonne (`toFixed(2)`, `toScale(2)`).

### `Money`

L'échelle vient de l'ISO 4217 (`JPY` et `ISK` 0, `JOD` et `KWD` 3, 2 pour toute devise non listée) ; `scale` la remplace. Une opération entre deux devises, ou deux échelles, lève une erreur.

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Money(amount: DecimalInput, currency: string, options?: MoneyOptions)` | `currency` est un code à trois lettres. Avec `exact` (par défaut), un montant qui a plus de chiffres que l'échelle lève une erreur ; `exact: false` arrondit en `mode`. |
| `fromMajor` | `static fromMajor(amount: DecimalInput, currency: string, options?: MoneyOptions): Money` | Identique au constructeur. |
| `fromMinorUnits` | `static fromMinorUnits(minorUnits: string \| number \| bigint, currency: string, options?: Omit<MoneyOptions, 'exact'>): Money` | `fromMinorUnits(1999n, 'EUR')` vaut `19.99 EUR`. |
| `amount` | `get amount(): Decimal` | |
| `currency` | `get currency(): string` | Code en majuscules. |
| `scale` | `get scale(): number` | |
| `plus` / `minus` | `plus(other: Money): Money` | |
| `times` | `times(multiplier: DecimalInput, options?: MoneyRoundingOptions): Money` | Arrondi à l'échelle de la devise. |
| `div` | `div(divisor: DecimalInput, options?: MoneyRoundingOptions): Money` | Arrondi une seule fois à l'échelle de la devise. |
| `allocate` | `allocate(ratios: Array<string \| number \| bigint>): Money[]` | Aucun centime perdu : `10.00` par `[1, 1, 1]` donne `3.34`, `3.33`, `3.33`. |
| `toMinorUnits` | `toMinorUnits(): bigint` | L'entier à stocker. |
| `format` | `format(options?: MoneyFormatOptions): string` | Formatage monétaire `Intl` à l'échelle de la devise. |
| `toString` | `toString(): string` | `'19.99 EUR'`. |
| `toJSON` | `toJSON(): { amount: string; currency: string }` | |

### `bulk`

```ts
function bulk<T extends Readonly<Record<string, BulkScalar>>>(build: (b: Bulk) => T): { [K in keyof T]: Decimal }
function bulk(): Bulk
```

La forme à callback planifie et exécute une fois. Sans callback, elle renvoie le plan, à exécuter plusieurs fois. Les valeurs planifiées refusent `toString()`, `valueOf()` et `toJSON()` tant que le plan n'a pas tourné. Le plan s'exécute sur le moteur Rust dans une largeur de 128 bits et repasse sur l'exécuteur BigInt quand une valeur est plus large.

| Membre de `Bulk` | Signature | Description |
|---|---|---|
| `column` | `column(values: Iterable<DecimalInput>): BulkColumn` | Toutes les colonnes d'un plan ont la même longueur. |
| `minorUnits` | `minorUnits(values: Iterable<string \| number \| bigint>, scale: number): BulkColumn` | Une colonne tenue en unités mineures ; l'entrée la plus rapide. |
| `of` | `of(value: DecimalInput): BulkScalar` | Une valeur unique. |
| `run` | `run<T>(outputs: T): { [K in keyof T]: Decimal }` | Calcule les sorties nommées. |
| `runAsync` | `runAsync<T>(outputs: T): Promise<{ [K in keyof T]: Decimal }>` | Hors du thread JS là où le moteur le peut (le module JSI sur un téléphone) ; sinon `run`. |

| Membre de `BulkColumn` | Description |
|---|---|
| `plus`, `minus`, `times` | Élément par élément, avec une colonne ou un scalaire. |
| `neg`, `abs`, `sorted` | Une nouvelle colonne. |
| `sum`, `min`, `max` | Un scalaire. |
| `dot(other: BulkColumn)` | `Σ aᵢ·bᵢ` en une passe. |
| `at(index: number)` | Un élément ; lève une erreur hors de la colonne. |
| `avg(options?)`, `median(options?)` | Prennent des `BulkDivOptions`. |
| `percentile(fraction: number)` | Rang le plus proche, `fraction` dans `[0, 1]`. |
| `stddev(options?: BulkStddevOptions)` | Même définition que `stddev`. |

`BulkScalar` a `plus`, `minus`, `times`, `div(other, options?)`, `neg`, `abs`, `min`, `max`, `pow(exp, options?)` et `sqrt(options?)`.

### `@c9up/atom/atlas`

| Export | Nature | Description |
|---|---|---|
| `decimalColumn` | fonction | `decimalColumn(options?: DecimalColumnOptions): DecimalAtlasColumn` : l'argument de `@Column(...)` pour une colonne décimale. |
| `decimalAtlasAdapter` | const | `{ consume, prepare }` sans échelle ni nullabilité ; gelé. |
| `DecimalColumnOptions` | interface | Voir ci-dessous. |
| `DecimalAtlasAdapter` | interface | `{ consume(raw: unknown): Decimal \| null; prepare(value: unknown): string \| null }`. |
| `DecimalAtlasColumn` | interface | `DecimalAtlasAdapter` plus `type: 'decimal' \| 'numeric'` et `nullable: boolean`. |

`prepare` refuse tout ce qui n'est pas un `Decimal` : un simple nombre n'atteint jamais la colonne. Configurez le pilote de base de données pour qu'il renvoie les colonnes décimales en chaînes : une valeur qui arrive en `number` JS a déjà perdu ses chiffres.

| `DecimalColumnOptions` | Type | Défaut | Description |
|---|---|---|---|
| `scale` | `number` | aucun | Échelle à laquelle la valeur est lue et écrite. |
| `exact` | `boolean` | `true` | Lever une erreur sur une valeur qui a plus de chiffres que `scale` ; `false` arrondit. |
| `mode` | `RoundMode` | `'half-up'` | Arrondi quand `exact` vaut `false`. |
| `nullable` | `boolean` | `true` | `false` lève une erreur sur un `null`, dans les deux sens. |
| `columnType` | `'decimal' \| 'numeric'` | `'decimal'` | Le type de colonne vers lequel les paramètres sont convertis. |

## Configuration

Le contexte fixe les valeurs par défaut de `div`, `pow`, `sqrt`, `quantize` et des agrégats. `configureAtomContext` les change pour le processus, ou pour la seule portée `withAtomContext` en cours ; sous Node, un callback asynchrone garde sa portée à travers les `await`.

```ts
configureAtomContext(options: AtomContextOptions): AtomContext
withAtomContext<T>(options: AtomContextOptions, callback: () => T): T
getAtomContext(): AtomContext
resetAtomContext(): AtomContext
```

| Option | Type | Défaut | Description |
|---|---|---|---|
| `precision` | `number` | `18` | Chiffres après la virgule d'un quotient, d'une racine ou d'une puissance négative. |
| `roundMode` | `RoundMode` | `'half-up'` | Arrondi de ces résultats et de `toScale`, `toFixed`. |
| `quantizeMode` | `RoundMode` | `'half-up'` | Arrondi de `quantize` et de `Money`. |
| `maxDigits` | `number` | `20000` | Nombre maximal de chiffres significatifs d'une entrée ; une entrée plus longue est refusée (plafond 1 000 000). |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_ATOM_INVALID_INPUT`](/fr/reference/errors#e-atom-invalid-input) | Une valeur donnée comme décimal n'est ni une chaîne, ni un nombre, ni un bigint, ni un `Decimal` |
| [`E_ATOM_INVALID_DECIMAL`](/fr/reference/errors#e-atom-invalid-decimal) | Une chaîne ou un nombre ne se lit pas comme un décimal (`parseLocale` compris) |
| [`E_ATOM_UNSAFE_INTEGER`](/fr/reference/errors#e-atom-unsafe-integer) | Un nombre JavaScript est un entier au-delà de `Number.MAX_SAFE_INTEGER` ; passez une chaîne ou un bigint |
| [`E_ATOM_INVALID_INTEGER`](/fr/reference/errors#e-atom-invalid-integer) | Des unités mineures ne sont pas un nombre entier |
| [`E_ATOM_DECIMAL_TOO_LARGE`](/fr/reference/errors#e-atom-decimal-too-large) | Une valeur ou un résultat dépasse la borne `maxDigits` de chiffres significatifs |
| [`E_ATOM_INVALID_SCALE`](/fr/reference/errors#e-atom-invalid-scale) | Une échelle ou une précision n'est pas un entier de 0 à 10 000 |
| [`E_ATOM_INVALID_EXPONENT`](/fr/reference/errors#e-atom-invalid-exponent) | Un exposant de `pow` n'est pas un entier dans les bornes |
| [`E_ATOM_INVALID_ROUNDING_MODE`](/fr/reference/errors#e-atom-invalid-rounding-mode) | Un mode d'arrondi n'est pas un de ceux que connaît atom |
| [`E_ATOM_INVALID_RANGE`](/fr/reference/errors#e-atom-invalid-range) | `clamp` / `between` a reçu un minimum plus grand que le maximum |
| [`E_ATOM_INVALID_STEP`](/fr/reference/errors#e-atom-invalid-step) | Le pas de `quantize` n'est pas strictement positif |
| [`E_ATOM_INVALID_RATIOS`](/fr/reference/errors#e-atom-invalid-ratios) | `allocate` n'a reçu aucun ratio, un ratio négatif, ou aucun positif |
| [`E_ATOM_PRECISION_LOSS`](/fr/reference/errors#e-atom-precision-loss) | `toMinorUnits` (et un `Money` exact) perdrait des chiffres à cette échelle |
| [`E_ATOM_LENGTH_MISMATCH`](/fr/reference/errors#e-atom-length-mismatch) | `Decimal.dot` a reçu deux listes de longueurs différentes |
| [`E_ATOM_DIVISION_BY_ZERO`](/fr/reference/errors#e-atom-division-by-zero) | Une division ou un modulo par zéro |
| [`E_ATOM_NEGATIVE_SQRT`](/fr/reference/errors#e-atom-negative-sqrt) | `sqrt` d'une valeur négative |
| [`E_ATOM_EMPTY_INPUT`](/fr/reference/errors#e-atom-empty-input) | `avg`, `min`, `max`, `median` ou `stddev` n'a reçu aucune valeur |
| [`E_ATOM_TOO_FEW_VALUES`](/fr/reference/errors#e-atom-too-few-values) | Un `stddev` d'échantillon a reçu moins de deux valeurs |
| [`E_ATOM_INVALID_CONTEXT`](/fr/reference/errors#e-atom-invalid-context) | `configureAtomContext` / `withAtomContext` a reçu un réglage invalide |
| [`E_ATOM_INVALID_CURRENCY`](/fr/reference/errors#e-atom-invalid-currency) | Un code de devise n'est pas fait de trois lettres |
| [`E_ATOM_CURRENCY_MISMATCH`](/fr/reference/errors#e-atom-currency-mismatch) | Deux valeurs `Money` de devises ou d'échelles différentes ont été combinées |
| [`E_ATOM_INVALID_COLUMN_VALUE`](/fr/reference/errors#e-atom-invalid-column-value) | L'adaptateur Atlas a reçu une valeur de colonne du mauvais type |
| [`E_ATOM_NULL_COLUMN_VALUE`](/fr/reference/errors#e-atom-null-column-value) | Une `decimalColumn` non nullable a reçu `null` |
| [`E_ATOM_ENGINE_NOT_FOUND`](/fr/reference/errors#e-atom-engine-not-found) | `nativeAtom()` n'a trouvé aucun moteur natif (N-API, WASM ou le module JSI du téléphone) |
| [`E_ATOM_NAPI_DISABLED`](/fr/reference/errors#e-atom-napi-disabled) | `nativeAtom()` a tourné alors qu'un test a désactivé le moteur natif |
| [`E_ATOM_INTERNAL`](/fr/reference/errors#e-atom-internal) | Un invariant interne a été rompu, ou le moteur natif a paniqué (un bug d'atom) |
| [`E_ATOM_BULK_NOT_RUN`](/fr/reference/errors#e-atom-bulk-not-run) | Une valeur planifiée a été lue avant `run()` |
| [`E_ATOM_BULK_NO_OUTPUT`](/fr/reference/errors#e-atom-bulk-no-output) | `run()` n'a reçu aucune valeur à calculer |
| [`E_ATOM_BULK_BAD_OUTPUT`](/fr/reference/errors#e-atom-bulk-bad-output) | `run()` a reçu autre chose qu'une valeur planifiée |
| [`E_ATOM_BULK_LENGTH_MISMATCH`](/fr/reference/errors#e-atom-bulk-length-mismatch) | Les colonnes d'un plan ont des longueurs différentes |
| [`E_ATOM_BULK_EMPTY_COLUMN`](/fr/reference/errors#e-atom-bulk-empty-column) | Une colonne n'a aucune valeur |
| [`E_ATOM_BULK_BAD_INDEX`](/fr/reference/errors#e-atom-bulk-bad-index) | `at()` tombe hors de la colonne |
| [`E_ATOM_BULK_BAD_PERCENTILE`](/fr/reference/errors#e-atom-bulk-bad-percentile) | Un percentile n'est pas une fraction entre 0 et 1 |
| [`E_ATOM_BULK_BAD_EXPONENT`](/fr/reference/errors#e-atom-bulk-bad-exponent) | L'exposant d'un `pow` planifié n'est pas un entier dans les bornes |
| [`E_ATOM_BULK_BAD_PRECISION`](/fr/reference/errors#e-atom-bulk-bad-precision) | Une précision planifiée n'est pas un entier de 0 à 10 000 |
| [`E_ATOM_BULK_BAD_SCALE`](/fr/reference/errors#e-atom-bulk-bad-scale) | `minorUnits()` a reçu une échelle invalide |
| [`E_ATOM_BULK_NOT_MINOR_UNITS`](/fr/reference/errors#e-atom-bulk-not-minor-units) | `minorUnits()` a reçu une valeur qui n'est pas un nombre entier d'unités mineures |
| [`E_ATOM_BULK_TOO_SHORT`](/fr/reference/errors#e-atom-bulk-too-short) | Un écart type d'échantillon planifié a moins de deux valeurs |
| [`E_ATOM_BULK_NO_LENGTH`](/fr/reference/errors#e-atom-bulk-no-length) | Une colonne a été construite sans source (un bug d'atom) |
| [`E_ATOM_BULK_BAD_PROGRAM`](/fr/reference/errors#e-atom-bulk-bad-program) | L'évaluateur TypeScript ou le moteur natif a rencontré un plan malformé (un bug d'atom) |
| [`E_ATOM_BULK_LOST_OUTPUT`](/fr/reference/errors#e-atom-bulk-lost-output) | Un calcul a rendu moins de valeurs que demandé (un bug d'atom) |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_ATOM_*`. Le moteur Rust et le moteur TypeScript lèvent les mêmes erreurs ; un refus du moteur Rust garde son erreur d'origine en `cause`.

## Migration

- `AtomError` disparaît : testez `error.code`, ou `error instanceof errors.E_ATOM_*` avec `import { errors } from '@c9up/atom'`.
- `AtomTypeError` disparaît, et les refus de l'adaptateur Atlas ne sont plus des `TypeError` : remplacez `instanceof TypeError` par `error.code === 'E_ATOM_INVALID_COLUMN_VALUE'` (ou `E_ATOM_NULL_COLUMN_VALUE`).
- Un refus du moteur Rust (division par zéro, racine d'un négatif…) porte désormais son code `E_ATOM_*` au lieu d'aucun : un code qui testait son message peut tester le code.

## Voir aussi

- [Décimaux et montants](/fr/guides/digging-deeper/decimals)
- [Relations](/fr/guides/database/orm/relations)
