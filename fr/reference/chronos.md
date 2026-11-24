# chronos

`@c9up/chronos` : dates, durées, intervalles, règles de récurrence et jours fériés, sur un moteur Rust qui gère les fuseaux horaires, l'analyse et le formatage. Guide : [Dates](/fr/guides/digging-deeper/dates).

## Installation

```bash
pnpm add @c9up/chronos
```

chronos n'a ni provider ni configuration. Sous Node, le moteur natif est livré dans un petit paquet par plateforme, `@c9up/chronos-<plateforme>`, pour linux x64 et arm64 (glibc), macOS x64 et arm64, et Windows x64. `@c9up/chronos` les déclare en dépendances optionnelles, et votre gestionnaire de paquets installe seulement celui de votre machine. Vous n'avez pas besoin de toolchain Rust. N'installez pas avec les dépendances optionnelles désactivées (`--no-optional`, `--omit=optional`) : le moteur serait absent. Dans un navigateur, chronos utilise sa build WASM, livrée dans `@c9up/chronos` lui-même.

Il n'existe pas de repli JavaScript. Sans le moteur, le premier appel lève `E_CHRONOS_ENGINE_REQUIRED`, et son message nomme le paquet à installer, par exemple `@c9up/chronos-linux-x64-gnu`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/chronos` | `DateTime`, `Duration`, `Interval`, les aides de plages, les règles de récurrence, les jours fériés, `Chronos`, `at` |
| `@c9up/chronos/atlas` | `dateTimeAtlasAdapter`, l'adaptateur de colonne pour atlas |

## Exports

### `@c9up/chronos`

| Export | Nature | Description |
|---|---|---|
| `DateTime` | classe | Un instant immuable, avec un fuseau et une locale. |
| `Duration` | classe | Une durée immuable en unités calendaires. |
| `Interval` | classe | Un intervalle semi-ouvert entre deux `DateTime`. |
| `inRange` | fonction | `inRange(input: DateInput, range: DateRange, options?: RangeCompareOptions): boolean`. |
| `containsRange` | fonction | `containsRange(outer: DateRange, inner: DateRange, options?: RangeCompareOptions): boolean`. |
| `overlapsRange` | fonction | `overlapsRange(a: DateRange, b: DateRange, options?: RangeCompareOptions): boolean`. |
| `analyzeRange` | fonction | `analyzeRange(a: DateRange, b: DateRange, options?: RangeCompareOptions): RangeRelation`. |
| `expandRRule` | fonction | `expandRRule(start: DateInput, rrule: string \| RRuleBuild, options?: number \| ExpandRRuleOptions): string[]`, ou `expandRRule(rule: string, options?)` avec `DTSTART` dans le texte. Occurrences en chaînes ISO UTC. |
| `toRRuleString` | fonction | `toRRuleString(rule: RRuleBuild): string` : une ligne `RRULE:` construite depuis des champs, chacun vérifié. |
| `holidays` | fonction | `holidays(year: number, options: HolidayOptions): Holiday[]` : les jours fériés d'un pays (et d'un canton suisse) pour une année. |
| `isHoliday` | fonction | `isHoliday(date: string \| DateTime, options: HolidayOptions): boolean`. |
| `easterDate` | fonction | `easterDate(year: number): string` : le dimanche de Pâques grégorien en `YYYY-MM-DD`, de 1583 à 9999. |
| `SWISS_CANTONS` | constante | Les 26 codes de canton à deux lettres. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Chacune est une `Exception` de flare avec un `code` textuel. |
| `at` | fonction | `at(input?: string \| Date): DateTime`. |
| `Chronos` | constante | Raccourcis : `at`, `now`, `parse`, `add`, `subtract`, `diff`, `inRange`, `rangeContains`, `rangesOverlap`, `rangeRelation`, `rrule`, `buildRRule`. |
| `DateInput` | type | `string \| Date \| DateTime`. |
| `DateUnit` | type | `'second' \| 'minute' \| 'hour' \| 'day' \| 'week' \| 'month' \| 'year'`. |
| `BoundUnit` | type | Les mêmes unités, pour `startOf`, `endOf`, `hasSame`. |
| `DateRange` | interface | `{ start: DateInput; end: DateInput }`. |
| `RangeCompareOptions` | interface | `{ inclusiveStart?: boolean; inclusiveEnd?: boolean }`. |
| `RangeRelation` | interface | `{ overlaps; aContainsB; bContainsA; aStartInB; aEndInB; bStartInA; bEndInA }`, tous booléens. |
| `CalendarParts` | interface | `{ year; month; day; hour; minute; second; millisecond; weekday; weekNumber; weekYear }`. |
| `RelativeUnit` | type | `'years' \| 'months' \| 'weeks' \| 'days' \| 'hours' \| 'minutes' \| 'seconds'`. |
| `RelativeUnitLike` | type | Un `RelativeUnit`, au pluriel ou au singulier. |
| `RelativeRounding` | type | `'trunc' \| 'expand' \| 'round' \| 'floor' \| 'ceil'`. |
| `ToRelativeOptions` | interface | `{ base?; locale?; style?; numberingSystem?; unit?; round?; rounding?; padding? }`. |
| `ToRelativeCalendarOptions` | interface | `{ base?; locale?; style?; numberingSystem?; unit? }`. |
| `DurationObject` | interface | `{ years?; months?; weeks?; days?; hours?; minutes?; seconds?; milliseconds? }`, tous des nombres. |
| `DurationUnit` | type | `keyof DurationObject`. |
| `DurationUnitLike` | type | Un `DurationUnit`, au pluriel ou au singulier. |
| `RRuleBuild` | interface | `{ freq; interval?; wkst?; byDay?; byMonthDay?; byMonth?; byWeekNo?; byYearDay?; bySetPos?; byHour?; byMinute?; bySecond?; count?; until? }`. |
| `ExpandRRuleOptions` | interface | `{ limit?: number; tzid?: string }` : `limit` de 1 à 10 000, 100 par défaut ; `tzid` le fuseau dont l'heure locale fait foi. |
| `Holiday` | interface | `{ date: string; key: HolidayKey }`. |
| `HolidayKey` | type | Un identifiant stable de jour férié (`'new_year'`, `'easter_monday'`, `'national_day'`…). |
| `HolidayCountry` | type | `'CH' \| 'FR'`. |
| `HolidayOptions` | type | `{ country: 'CH'; region?: SwissCanton } \| { country: 'FR'; region?: undefined }`. |
| `SwissCanton` | type | L'un des `SWISS_CANTONS`. |

### `@c9up/chronos/atlas`

| Export | Nature | Description |
|---|---|---|
| `dateTimeAtlasAdapter` | constante | `{ consume(raw: unknown): DateTime \| null; prepare(value: unknown): string \| null }`. Lit une chaîne, une `Date`, un nombre ou un bigint en `DateTime` ; écrit un `DateTime` en chaîne ISO UTC. |

### `DateTime`

`new DateTime(input?: string | Date, zone = 'UTC')`. Chaque méthode renvoie une nouvelle valeur.

| Membre | Signature | Description |
|---|---|---|
| `from` | `static from(input: DateInput): DateTime` | Depuis n'importe quelle entrée. |
| `now` | `static now(zone?: string): DateTime` | L'instant présent. |
| `local` | `static local(year?: number, month = 1, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0): DateTime` | Maintenant, ou une heure locale, dans le fuseau de l'hôte. |
| `utc` | `static utc(year?: number, month = 1, …): DateTime` | Idem, en UTC. |
| `fromMillis` / `fromSeconds` / `fromUnix` | `static fromMillis(ms: number): DateTime` | Depuis une valeur epoch. |
| `fromJSDate` | `static fromJSDate(date: Date): DateTime` | Depuis une `Date`. |
| `fromISO` | `static fromISO(text: string, options?: { zone?: string }): DateTime` | ISO 8601 strict. |
| `fromObject` | `static fromObject(obj: { year; month; day; hour?; minute?; second?; millisecond? }, options?: { zone?: string }): DateTime` | Depuis des champs calendaires, chacun borné. |
| `fromSQL` | `static fromSQL(input: string, options?: { zone?: string }): DateTime` | Depuis une date ou un timestamp SQL. |
| `fromHTTP` | `static fromHTTP(input: string): DateTime` | Depuis une date HTTP. |
| `fromFormat` | `static fromFormat(text: string, format: string, options?: { zone?: string; locale?: string }): DateTime` | Analyse selon un format. |
| `zoneName` / `offset` / `locale` | accesseurs | Nom du fuseau, décalage UTC en minutes, locale. |
| `setZone` | `setZone(zone: string, options?: { keepLocalTime?: boolean }): DateTime` | Même instant dans un autre fuseau, ou même heure locale avec `keepLocalTime`. |
| `toUTC` | `toUTC(): DateTime` | |
| `setLocale` | `setLocale(locale: string): DateTime` | |
| `isValid` | `get isValid(): boolean` | |
| `set` | `set(values: { year?; month?; day?; hour?; minute?; second?; millisecond? }): DateTime` | Remplace des champs calendaires. |
| `plus` / `minus` | `plus(amount: number, unit: DateUnit): DateTime` ou `plus(duration: Duration \| DurationObject): DateTime` | Arithmétique calendaire. |
| `diff` | `diff(other: DateInput, unit?: DateUnit \| DurationUnit \| 'millisecond' \| ReadonlyArray<…>): Duration` | Écart, en millisecondes par défaut. |
| `equals` / `isBefore` / `isAfter` | `equals(other: DateInput): boolean` | |
| `hasSame` | `hasSame(other: DateInput, unit: BoundUnit): boolean` | Même unité calendaire. |
| `isSameDay` | `isSameDay(other: DateInput): boolean` | |
| `startOf` / `endOf` | `startOf(unit: BoundUnit): DateTime` | |
| `isWithin` | `isWithin(range: DateRange, options?: RangeCompareOptions): boolean` | |
| `format` | `format(pattern = 'YYYY-MM-DD HH:mm:ss'): string` | Jetons de style `YYYY`. |
| `toFormat` | `toFormat(pattern: string): string` | Jetons de style `yyyy` (`yyyy-MM-dd HH:mm`, `dd LLL yyyy`, `EEEE`, `ZZ`) ; le texte `'entre apostrophes'` est littéral. |
| `toISO` / `toISOTime` | `toISO(options?: { suppressMilliseconds?: boolean; includeOffset?: boolean }): string` | |
| `toISODate` / `toZonedISO` | `toISODate(): string` | |
| `toSQL` / `toSQLDate` / `toSQLTime` | `toSQL(options?: { includeOffset?: boolean }): string` | |
| `toDate` / `toMillis` / `toSeconds` / `valueOf` | `toMillis(): number` | |
| `toString` / `toJSON` | `toJSON(): string` | Chaîne ISO. |
| `toLocaleString` | `toLocaleString(locale?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string` | |
| `toRelative` | `toRelative(options?: ToRelativeOptions): string` | « dans 3 jours », « il y a 2 heures ». |
| `toRelativeCalendar` | `toRelativeCalendar(options?: ToRelativeCalendarOptions): string` | « demain », « la semaine dernière ». |
| `calendar` | `get calendar(): CalendarParts` | Tous les champs d'un coup. |
| `year` … `millisecond`, `weekday`, `weekNumber`, `weekYear`, `ordinal`, `quarter`, `daysInMonth`, `daysInYear`, `isInLeapYear` | accesseurs | Champs calendaires sur l'heure locale de la valeur. |

### `Duration`

| Membre | Signature | Description |
|---|---|---|
| `fromObject` | `static fromObject(obj: DurationObject): Duration` | |
| `fromMillis` | `static fromMillis(ms: number): Duration` | |
| `fromISO` | `static fromISO(iso: string): Duration` | `P1DT2H`. |
| `years` … `milliseconds` | accesseurs | Chaque unité. |
| `get` | `get(unit: DurationUnitLike): number` | |
| `toObject` | `toObject(): Required<DurationObject>` | |
| `plus` / `minus` | `plus(other: Duration \| DurationObject \| number): Duration` | |
| `negate` | `negate(): Duration` | |
| `mapUnits` | `mapUnits(fn: (value: number, unit: DurationUnit) => number): Duration` | |
| `normalize` | `normalize(): Duration` | Reporte les dépassements vers le haut et équilibre les signes ; années, mois et semaines sont gardés. |
| `shiftTo` | `shiftTo(...requested: DurationUnitLike[]): Duration` | Exprime dans les unités données. |
| `shiftToAll` | `shiftToAll(): Duration` | Répartit sur toutes les unités. |
| `rescale` | `rescale(): Duration` | Les plus grandes unités possibles. |
| `as` | `as(unit: DurationUnitLike): number` | Toute la durée dans une unité. |
| `toMillis` / `valueOf` | `toMillis(): number` | |
| `toISO` / `toString` / `toJSON` | `toISO(): string` | |
| `toFormat` | `toFormat(pattern: string): string` | Le texte `[entre crochets]` est littéral. |
| `toHuman` | `toHuman(): string` | « 2 hours, 15 minutes », en anglais. |

### `Interval`

| Membre | Signature | Description |
|---|---|---|
| `fromDateTimes` | `static fromDateTimes(start: DateInput, end: DateInput): Interval` | |
| `after` / `before` | `static after(start: DateInput, duration: Duration \| DurationObject \| { amount: number; unit: DateUnit }): Interval` | |
| `fromISO` | `static fromISO(text: string, options?: { zone?: string }): Interval` | `début/fin`. |
| `merge` | `static merge(intervals: readonly Interval[]): Interval[]` | Fusionne les intervalles qui se chevauchent ou se touchent. |
| `xor` | `static xor(intervals: readonly Interval[]): Interval[]` | Le temps couvert par un seul. |
| `start` / `end` | accesseurs | |
| `length` | `length(unit?: DurationUnit \| DateUnit): number` | En millisecondes par défaut. |
| `count` | `count(unit: DateUnit): number` | Unités touchées, partielles comprises. |
| `toDuration` | `toDuration(): Duration` | |
| `contains` / `isBefore` / `isAfter` | `contains(dt: DateInput): boolean` | |
| `isEmpty` | `isEmpty(): boolean` | Longueur nulle. |
| `overlaps` / `engulfs` / `abutsStart` / `abutsEnd` | `overlaps(other: Interval): boolean` | |
| `intersection` | `intersection(other: Interval): Interval \| null` | |
| `union` | `union(other: Interval): Interval` | |
| `difference` | `difference(...intervals: Interval[]): Interval[]` | Les parties qu'aucun ne couvre. |
| `splitBy` | `splitBy(duration: Duration \| DurationObject \| { amount: number; unit: DateUnit }): Interval[]` | |
| `splitAt` | `splitAt(...dts: DateInput[]): Interval[]` | |
| `toString` / `toJSON` | `toJSON(): { start: string; end: string }` | |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_CHRONOS_INVALID_YEAR`](/fr/reference/errors#e-chronos-invalid-year) | `easterDate` ou `holidays` a reçu une année qui n'est pas un entier de 1583 à 9999. |
| [`E_CHRONOS_UNKNOWN_COUNTRY`](/fr/reference/errors#e-chronos-unknown-country) | `holidays` ou `isHoliday` a reçu un pays sans calendrier de jours fériés. |
| [`E_CHRONOS_UNKNOWN_REGION`](/fr/reference/errors#e-chronos-unknown-region) | La région n'est pas un code de canton suisse, ou une région a été donnée pour `FR`. |
| [`E_CHRONOS_INVALID_DATE`](/fr/reference/errors#e-chronos-invalid-date) | Une date qui n'existe pas ou ne se lit pas : `2026-02-30`, un champ hors bornes, une chaîne que `fromFormat` ne reconnaît pas, une `Invalid Date`, un instant `NaN` ; ou `isHoliday` a reçu une chaîne qui n'est pas `YYYY-MM-DD`. |
| [`E_CHRONOS_ENGINE_REQUIRED`](/fr/reference/errors#e-chronos-engine-required) | Le moteur Chronos (le binaire NAPI sous Node, la build WASM dans un navigateur) ne s'est pas chargé. |
| [`E_CHRONOS_INVALID_ARGUMENT`](/fr/reference/errors#e-chronos-invalid-argument) | Un argument est du mauvais type (`fromMillis("12")`, `fromFormat` sans chaîne, `expandRRule(rule, options)` sans le texte de la règle), ou `toRelative` a reçu un `rounding` inconnu. |
| [`E_CHRONOS_OUT_OF_RANGE`](/fr/reference/errors#e-chronos-out-of-range) | Une valeur, ou le résultat d'un `plus`/`minus`, sort des années 0000-9999. |
| [`E_CHRONOS_CONFLICTING_FIELDS`](/fr/reference/errors#e-chronos-conflicting-fields) | Un format mêle des champs qui se contredisent : un méridien avec une heure sur 24 h, des champs de semaine avec année/mois/jour, un ordinal avec mois/jour. |
| [`E_CHRONOS_UNSUPPORTED_UNIT`](/fr/reference/errors#e-chronos-unsupported-unit) | Une unité que chronos ne connaît pas (`fortnight`) a été passée à `plus`, `diff`, `toRelative`, `Duration` ou une méthode d'`Interval`. |
| [`E_CHRONOS_MISSING_UNIT`](/fr/reference/errors#e-chronos-missing-unit) | `plus(amount)` / `minus(amount)` sans unité, ou `diff` / `toRelative` avec une liste d'unités vide. |
| [`E_CHRONOS_INVALID_UNIT_VALUE`](/fr/reference/errors#e-chronos-invalid-unit-value) | Une quantité d'unité n'est pas un nombre fini (`NaN`, `Infinity`, une chaîne). |
| [`E_CHRONOS_INVALID_DURATION`](/fr/reference/errors#e-chronos-invalid-duration) | Une durée illisible ou inutilisable : une durée ISO 8601 qui ne se lit pas, une valeur qui n'est pas un objet d'unités, un pas de `splitBy` nul ou négatif. |
| [`E_CHRONOS_INVALID_INTERVAL`](/fr/reference/errors#e-chronos-invalid-interval) | Un `Interval` dont le début suit la fin, ou un intervalle ISO 8601 qui ne se lit pas. |
| [`E_CHRONOS_INVALID_RANGE`](/fr/reference/errors#e-chronos-invalid-range) | Un `DateRange` passé à `inRange`, `containsRange`, `overlapsRange` ou `analyzeRange` commence après sa fin. |
| [`E_CHRONOS_INVALID_LOCALE`](/fr/reference/errors#e-chronos-invalid-locale) | `setLocale` a reçu une étiquette qu'`Intl` refuse. |
| [`E_CHRONOS_INVALID_RRULE`](/fr/reference/errors#e-chronos-invalid-rrule) | `toRRuleString` (ou `expandRRule` avec une règle structurée) a reçu un champ qu'il ne peut pas écrire dans le texte de la règle. |
| [`E_CHRONOS_INVALID_RRULE_LIMIT`](/fr/reference/errors#e-chronos-invalid-rrule-limit) | La limite d'`expandRRule` n'est pas un entier positif. |
| [`E_CHRONOS_RRULE_LIMIT_EXCEEDED`](/fr/reference/errors#e-chronos-rrule-limit-exceeded) | La limite d'`expandRRule` dépasse le plafond de 10 000. |
| [`E_CHRONOS_INVALID_COLUMN_VALUE`](/fr/reference/errors#e-chronos-invalid-column-value) | L'adaptateur de colonne `DateTime` d'atlas a lu une valeur de base d'un type inattendu, ou a dû stocker autre chose qu'un `DateTime`. |
| [`E_CHRONOS_UNKNOWN_ZONE`](/fr/reference/errors#e-chronos-unknown-zone) | Un fuseau que la base tz ne connaît pas : `new DateTime(input, zone)`, `DateTime.now(zone)`, `setZone`, `fromSQL`, le `tzid` d'`expandRRule` ou un `TZID` dans son texte. |
| [`E_CHRONOS_UNREADABLE_RRULE`](/fr/reference/errors#e-chronos-unreadable-rrule) | `expandRRule` a reçu un texte de règle que le moteur ne sait ni lire ni dérouler : une propriété inconnue ou répétée, une valeur hors bornes, pas de début, une règle au-delà de la taille permise. |
| [`E_CHRONOS_INTERNAL`](/fr/reference/errors#e-chronos-internal) | Le moteur a répondu quelque chose que chronos n'attend pas (un bug de chronos, pas de votre code). |

Chaque code se lit sur `error.code`, et chaque code est une classe du namespace `errors` : `error instanceof errors.E_CHRONOS_INVALID_DATE`, avec `import { errors } from '@c9up/chronos'`. Chacune est une `Exception` de flare.

Les refus du moteur Rust vous parviennent avec les mêmes codes : chronos relit le message du moteur dans l'erreur correspondante, et garde l'échec du moteur dans `cause`.

## Migration

- `ChronosError`, `ChronosTypeError` et `ChronosRangeError` disparaissent. Remplacez `instanceof ChronosError` (ou l'une des deux autres) par un test sur `error.code`, ou par `instanceof errors.E_CHRONOS_...`, `errors` venant de `@c9up/chronos`.
- Un refus n'est plus une `TypeError` ni une `RangeError` : `catch (e) { if (e instanceof RangeError) ... }` doit tester le code à la place.
- Les refus du moteur ne portent plus `code: 'GenericFailure'` avec le code en tête du message : un fuseau inconnu est `E_CHRONOS_UNKNOWN_ZONE`, un texte de règle illisible `E_CHRONOS_UNREADABLE_RRULE`, un résultat d'arithmétique de dates hors 0000-9999 `E_CHRONOS_OUT_OF_RANGE`, et `E_CHRONOS_UNKNOWN_COUNTRY`, `E_CHRONOS_UNKNOWN_REGION`, `E_CHRONOS_INVALID_YEAR`, `E_CHRONOS_INVALID_DATE` se lisent sur `error.code`, plus dans le message.

## Voir aussi

- [Dates](/fr/guides/digging-deeper/dates)
- [Entités : colonnes de date](/fr/guides/database/orm/entities)
