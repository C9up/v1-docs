# Chronos — DateTime & Recurrence

Statut: **Present (TS + Rust N-API)**.

- Package: `@c9up/chronos`
- Objectif: operations calendaires avancees (arithmetique dates + recurrence RRULE), pas un wrapper Date basique.

## Exemples Rapides

Arithmetique date:

```ts
import { Chronos } from '@c9up/chronos'

const invoiceDate = Chronos.parse('2026-01-15T10:00:00Z')
invoiceDate.plus(30, 'day').toISO() // date d'echeance
invoiceDate.minus(1, 'month').toISO()
```

Bornes calendaires:

```ts
const dt = Chronos.parse('2026-01-15T10:34:55Z')
dt.startOf('day').toISO() // 2026-01-15T00:00:00.000Z
dt.endOf('day').toISO()   // 2026-01-15T23:59:59.999Z
```

Recurrence style RRULE:

```ts
// Tous les 15 du mois
Chronos.rrule('2026-01-15T15:00:00Z', 'FREQ=MONTHLY;BYMONTHDAY=15;COUNT=3')

// Tous les mardis a 15h
Chronos.rrule('2026-01-06T15:00:00Z', {
  freq: 'WEEKLY',
  byDay: ['TU'],
  byHour: [15],
  byMinute: [0],
  bySecond: [0],
  count: 3,
})
```

Exemples avances:

```ts
// Dernier dimanche de chaque mois
Chronos.rrule('2026-01-01T12:00:00Z', {
  freq: 'MONTHLY',
  byDay: ['-1SU'],
  count: 3,
})

// Horaire, on garde la derniere occurrence generee dans chaque heure
Chronos.rrule('2026-01-01T10:00:00Z', {
  freq: 'HOURLY',
  byMinute: [0, 30],
  bySecond: [0],
  bySetPos: [-1],
  count: 3,
})

// Resultat:
// [
//   '2026-01-01T10:30:00Z',
//   '2026-01-01T11:30:00Z',
//   '2026-01-01T12:30:00Z',
// ]
//
// Explication:
// - HOURLY => chaque heure
// - byMinute [0, 30] => candidats a :00 et :30
// - bySetPos [-1] => on garde le dernier candidat de chaque heure => :30
// - count 3 => on renvoie les 3 prochaines occurrences
```

Formatage:

```ts
Chronos.parse('2026-01-15T10:34:55Z').format('YYYY-MM-DD HH:mm:ss')
```

Comparaison de plages:

```ts
const outer = { start: '2026-01-01T00:00:00Z', end: '2026-01-31T23:59:59Z' }
const inner = { start: '2026-01-10T00:00:00Z', end: '2026-01-20T23:59:59Z' }

Chronos.rangeContains(outer, inner) // true
Chronos.rangesOverlap(outer, { start: '2026-01-31T23:59:59Z', end: '2026-02-05T00:00:00Z' }) // true
Chronos.inRange('2026-01-15T12:00:00Z', outer) // true

Chronos.rangeRelation(
  { start: '2026-01-05T00:00:00Z', end: '2026-01-12T00:00:00Z' },
  { start: '2026-01-10T00:00:00Z', end: '2026-01-20T00:00:00Z' },
)
// {
//   overlaps: true,
//   aStartInB: false,
//   aEndInB: true,
//   bStartInA: true,
//   bEndInA: false,
//   aContainsB: false,
//   bContainsA: false
// }
```

## Lire une date

Une chaîne est lue en ISO 8601 et rien d'autre : `YYYY-MM-DD`, avec en option
une heure (`T` ou, comme l'écrit SQL, une espace), des fractions de seconde et
un décalage (`Z`, `+02`, `+0200`, `+02:00`). `"1"`, `"foo 2026"` ou
`"March 7"` sont refusés au lieu d'être devinés en date.

Une heure sans décalage est lue dans le fuseau donné, et en UTC sinon —
jamais dans le fuseau de la machine qui exécute le code :

```ts
new DateTime('2026-08-10T12:00:00').toISO()                 // 2026-08-10T12:00:00.000Z
new DateTime('2026-08-10T12:00:00', 'Europe/Paris').toISO() // 2026-08-10T12:00:00.000+02:00
DateTime.fromISO('2026-08-10T12:00', { zone: 'America/New_York' })
DateTime.fromObject({ year: 2026, month: 8, day: 10, hour: 9 }, { zone: 'Europe/Paris' })
DateTime.fromSQL('2026-08-10 12:00:00+00')                  // texte timestamptz de PostgreSQL
```

Les valeurs hors des années 0000-9999 sont refusées dès leur construction, et
`fromObject` contrôle chaque champ (`minute: 90` et `hour: 1.5` sont des
erreurs ; l'année 50 est l'année 0050).

`toISO()` écrit la valeur sur sa propre horloge — `Z` en UTC, le décalage local
dans tout autre fuseau ; `toUTC().toISO()` donne la forme UTC.

Une date de calendrier qui n'existe pas est refusée, plutôt que ramenée à la
suivante qui existe.

```ts
DateTime.from('2026-02-30')
// Invalid date '2026-02-30': February 2026 has 28 days, so there is no day 30.
```

Il en va de même d'un fuseau que la base tz ne connaît pas — à chaque point
d'entrée qui en prend un, `DateTime.now(zone)`, `new DateTime(input, zone)`
comme `setZone(zone)` :

```ts
DateTime.now('Mars/Olympus')
// Unknown IANA timezone: 'Mars/Olympus'. Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
```

Seule la date *écrite* est contrôlée, jamais l'instant vers lequel elle se
résout : un décalage qui déplace légitimement le jour UTC n'est pas concerné.

```ts
DateTime.from('2026-08-10T23:00:00-05:00').toISO()  // 2026-08-11T04:00:00.000Z
```

L'arithmétique, elle, continue de se déplacer vers la date existante la plus
proche — c'est le comportement attendu à cet endroit — et elle s'arrête à la
fin du mois au lieu de déborder dessus :

```ts
DateTime.from('2026-01-31').plus(1, 'month').toISO()  // 2026-02-28T00:00:00.000Z
```

## Mesurer entre deux instants

`a.diff(b, unit)` vaut `a - b`, sous forme de `Duration` : positif quand `a`
est le plus tardif des deux, négatif quand il est le plus ancien. L'unité la
plus basse conserve sa fraction ; `.as(unit)` la lit comme un nombre.

```ts
const d = DateTime.from('2026-06-05T14:30:00Z')

d.diff('2026-01-01T00:00:00Z', 'day').as('day')    // 155.60416666666666
d.diff('2026-01-01T00:00:00Z', 'hour').as('hour')  // 3734.5
d.diff('2026-08-01T00:00:00Z', 'day').as('day')    // -56.395833333333336
d.diff('2026-01-01T00:00:00Z', ['months', 'days']).toObject()
// { months: 5, days: 4.604166666666667, ... }
```

Les jours et les semaines se comptent sur le calendrier de la valeur : à
Europe/Paris, de midi à midi pendant la nuit du changement d'heure, il y a un
jour, et non 23/24 de jour.

Les mois et les années se comptent sur le calendrier, pas sur une longueur
moyenne : le reste est mesuré contre le mois où il tombe réellement, donc 15
jours dans février valent 15/28 de mois et non 15/30.

```ts
DateTime.from('2026-03-15T10:00:00Z').diff('2026-02-28T00:00:00Z', 'month')
// 0.5505952380952381
```

## Unités d'Interval

`Interval` accepte une unité écrite dans les deux formes — `'day'` comme
`DateTime` l'écrit, `'days'` comme les durées l'écrivent — et refuse celle
qu'il ne reconnaît pas au lieu de retomber sur les millisecondes.

```ts
june.length('days')   // 30
june.length('day')    // 30
june.length('week')   // 4.285714285714286
```

## Reference

`Chronos`:
- `Chronos.now()`
- `Chronos.at(input?)`
- `Chronos.parse(input)`
- `Chronos.add(input, amount, unit)`
- `Chronos.subtract(input, amount, unit)`
- `Chronos.diff(a, b, unit)` — un nombre
- `Chronos.rrule(start, rrule, limit | { limit, tzid })`
- `Chronos.buildRRule(rule)`

`DateTime`:
- Construction: `from`, `now`, `local`, `utc`, `fromISO`, `fromObject`, `fromSQL`, `fromMillis`, `fromJSDate`, `fromRFC2822`, `fromHTTP`
- Arithmetique: `plus`, `minus` (une quantite et une unite, ou une `Duration`), `diff` (une `Duration`), `set`
- Bornes: `startOf`, `endOf`
- Fuseau et locale: `setZone` (avec `keepLocalTime`), `toUTC`, `setLocale`
- Sorties: `toFormat` (jetons `yyyy-MM-dd`, `dd LLL yyyy`, `EEEE`), `format` (jetons `YYYY-MM-DD`), `toISO`, `toISODate`, `toISOTime`, `toSQL`, `toSQLDate`, `toSQLTime`, `toLocaleString`, `toDate`, `toMillis`, `valueOf`, `toJSON`

Mode natif:
- Le binaire NAPI Rust est requis — pas de fallback JavaScript. Compilez-le avec `cd packages/chronos && pnpm build:napi`.

Cles RRULE supportees par le moteur natif (toute autre cle est une erreur):
- `FREQ`: `SECONDLY | MINUTELY | HOURLY | DAILY | WEEKLY | MONTHLY | YEARLY`
- `INTERVAL`, `COUNT`, `WKST`
- `UNTIL` en `YYYYMMDD` (toute la journee incluse), `YYYYMMDDTHHMMSS` (heure locale) ou `YYYYMMDDTHHMMSSZ`
- `BYDAY` (simple + ordinal, ex: `MO`, `-1SU`, `1MO`)
- `BYMONTHDAY`, `BYMONTH`, `BYWEEKNO`, `BYYEARDAY`, `BYSETPOS`
- `BYHOUR`, `BYMINUTE`, `BYSECOND` (multi-valeurs)

## Récurrence sur une horloge locale

Avec un fuseau, une récurrence suit l'horloge de ce fuseau : une réunion
hebdomadaire à 09:00 reste à 09:00 après le changement d'heure. Le fuseau vient
de `tzid`, d'un `DateTime` de départ zoné, ou d'une ligne `DTSTART;TZID=…` dans
le texte de la règle.

```ts
expandRRule('2026-03-23T08:00:00Z', 'FREQ=WEEKLY;COUNT=2', { tzid: 'Europe/Paris' })
// ['2026-03-23T08:00:00.000Z', '2026-03-30T07:00:00.000Z']  — 09:00 locale les deux fois

expandRRule('DTSTART;TZID=Europe/Paris:20260323T090000\nRRULE:FREQ=WEEKLY;COUNT=2')
```

Une heure locale qui n'existe pas (02:30 la nuit du passage à l'heure d'été)
est lue avec le décalage en vigueur avant le saut, et tombe donc à 03:30 ; une
heure qui existe deux fois prend la première.

Ce que la règle ne précise pas vient du départ : `FREQ=MONTHLY` se répète le
même jour du mois que le départ, `FREQ=WEEKLY` le même jour de la semaine.

Une règle venue d'une saisie utilisateur ou d'un .ics importé peut être
développée sans risque : le texte est plafonné à 8 Ko, chaque liste BY* est un
ensemble, au plus 10 000 occurrences sont renvoyées, et l'itération s'arrête en
l'an 9999 — une règle impossible répond `[]` en quelques millisecondes au lieu
de bloquer le fil d'exécution.
