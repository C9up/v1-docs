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

atom lève de simples `Error` et `TypeError`, sans code `E_` : une entrée invalide, une division par zéro, une perte de chiffres avec `exact`, des devises différentes. Les messages d'un plan bulk commencent par une étiquette entre crochets, comme `[ATOM_BULK_NOT_RUN]` pour une valeur planifiée lue avant `run`.

## Voir aussi

- [Décimaux et montants](/fr/guides/digging-deeper/decimals)
- [Relations](/fr/guides/database/orm/relations)
