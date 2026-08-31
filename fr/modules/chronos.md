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
dt.startOf('day').toISO() // 2026-01-15T00:00:00Z
dt.endOf('day').toISO()   // 2026-01-15T23:59:59Z
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

Une date de calendrier qui n'existe pas est refusée, plutôt que ramenée à la
suivante qui existe.

```ts
DateTime.from('2026-02-30')
// Invalid date '2026-02-30': February 2026 has 28 days, so there is no day 30.
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

`a.diff(b, unit)` vaut `a - b` : positif quand `a` est le plus tardif des deux,
négatif quand il est le plus ancien. Le résultat conserve sa fraction.

```ts
const d = DateTime.from('2026-06-05T14:30:00Z')

d.diff('2026-01-01T00:00:00Z', 'day')    // 155.60416666666666
d.diff('2026-01-01T00:00:00Z', 'hour')   // 3734.5
d.diff('2026-08-01T00:00:00Z', 'day')    // -56.395833333333336
```

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
- `Chronos.diff(a, b, unit)`
- `Chronos.rrule(startIso, rrule, limit?)`
- `Chronos.buildRRule(rule)`

`DateTime`:
- Arithmetique: `plus`, `minus`, `diff`
- Bornes: `startOf`, `endOf`
- Sorties: `format`, `toISO`, `toDate`, `toString`, `toJSON`

Mode natif:
- Le binaire NAPI Rust est requis — pas de fallback JavaScript. Compilez-le avec `cd packages/chronos && pnpm build:napi`.

Cles RRULE supportees actuellement par le moteur natif:
- `FREQ`: `SECONDLY | MINUTELY | HOURLY | DAILY | WEEKLY | MONTHLY | YEARLY`
- `INTERVAL`, `COUNT`, `UNTIL`, `WKST`
- `BYDAY` (simple + ordinal, ex: `MO`, `-1SU`, `1MO`)
- `BYMONTHDAY`, `BYMONTH`, `BYWEEKNO`, `BYYEARDAY`, `BYSETPOS`
- `BYHOUR`, `BYMINUTE`, `BYSECOND` (multi-valeurs)
