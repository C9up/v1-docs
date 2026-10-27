# Calendar

Une grille mensuelle pour choisir un jour ou une période. Elle ne s'appuie que sur `Date` et `Intl` : la longueur des mois et les années bissextiles viennent de `Date`, les noms des mois et des jours d'`Intl.DateTimeFormat` dans la `locale` que vous lui donnez — une page en français affiche des noms français sans table de traduction à entretenir.

Toute date que rend le calendrier est à minuit, heure locale. Une case veut dire « ce jour », pas « cet instant », et mélanger les deux est ce qui décale un sélecteur de date d'un jour à l'ouest d'UTC : `new Date("2026-03-14")` se lit comme minuit UTC, déjà le 13 à New York. Construisez les dates avec `new Date(2026, 2, 14)`, ou passez-les par `startOfDay`.

La grille compte toujours six semaines — 42 cases, même quand cinq suffiraient. Une grille qui change de hauteur d'un mois à l'autre fait sauter le popover qui l'entoure à chaque changement de mois.

```sh
ream nebula:add calendar
```

Organisme · `organisms/Calendar.ts` · [Button](/fr/nebula/components/button)

## Utilisation

```ts
import { signal } from '@c9up/aurora'
import { Calendar } from '@c9up/nebula'

const day = signal<Date | undefined>(undefined)

Calendar({ value: day, onValueChange: day })
```

En mode simple, le calendrier dessine la `value` qu'on lui donne et signale un clic par `onValueChange` ; il ne garde pas lui-même le jour cliqué. Un signal passé dans les deux sens est le plus petit calendrier qui montre ce qui a été choisi.

## Exemples

### Une période

`mode: 'range'` choisit une période en deux clics, et le calendrier la garde lui-même :

```ts
Calendar({
  mode: 'range',
  onRangeChange: (range) => {
    if (range.to !== undefined) book(range.from, range.to)
  },
})
```

`onRangeChange` est appelé aux deux clics — après le premier, `to` est absent. Tant qu'une seule borne est fixée, la bande suit le pointeur : l'utilisateur voit la période avant de la fermer. Un second clic *avant* le premier recommence la période au lieu de la retourner : qui clique le 3 après le 10 voulait presque toujours recommencer. Cliquer deux fois le même jour donne une période d'un jour, et un clic après une période complète en commence une nouvelle.

### Garder la période vous-même

```ts
import { signal } from '@c9up/aurora'
import { type DateRange } from '@c9up/nebula'

const stay = signal<DateRange | undefined>(undefined)

Calendar({ mode: 'range', range: stay, onRangeChange: stay })
```

`DateRange` vaut `{ from, to? }` : l'état à moitié ouvert fait partie du type, parce que c'est contre lui que l'aperçu se dessine. Un `range` qui lit `undefined` rend le dessin à la période que le calendrier garde lui-même.

### Exclure des jours

```ts
import { addMonths, isSameDay } from '@c9up/nebula'

Calendar({
  value: day,
  onValueChange: day,
  min: new Date(),
  max: addMonths(new Date(), 3),
  disabled: (date) =>
    date.getDay() === 0 || date.getDay() === 6 || holidays.some((holiday) => isSameDay(holiday, date)),
})
```

`min` et `max` comparent des jours, pas des instants — `new Date()` à 15 h autorise encore aujourd'hui. Un jour exclu est grisé et ne peut être ni cliqué ni choisi au clavier.

### Le mois d'ouverture

Le premier mois affiché est celui de `defaultValue`, puis de `defaultRange.from`, puis `defaultMonth`, puis le mois courant. `value` n'est pas consultée : un calendrier piloté par `value` seule s'ouvre sur le mois courant ; donnez-lui `defaultMonth` quand la valeur tombe ailleurs :

```ts
Calendar({ value: day, onValueChange: day, defaultMonth: new Date(2026, 11, 1) })
```

### Langue et premier jour de la semaine

```ts
Calendar({
  value: day,
  onValueChange: day,
  locale: 'fr-CH',
  labels: { previousMonth: 'Mois précédent', nextMonth: 'Mois suivant' },
})
```

`locale` nomme les mois et les jours et choisit le premier jour de la semaine, lu dans `Intl.Locale` quand le moteur l'expose, lundi sinon — y compris côté serveur sans `locale`. `weekStartsOn` le remplace : `0` pour dimanche, `1` pour lundi.

```ts
Calendar({ value: day, onValueChange: day, weekStartsOn: 0 })
```

## API

### Calendar

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `mode` | `'single' \| 'range'` | `'single'` | Un jour, ou une période en deux clics. Lue une fois, à la construction. |
| `value` | `Reactive<Date \| undefined>` | — | Le jour choisi, en mode `'single'`. |
| `defaultValue` | `Date` | — | Le jour mis en évidence quand `value` lit `undefined` ; place aussi le premier mois et le curseur clavier. |
| `range` | `Reactive<DateRange \| undefined>` | — | La période choisie, en mode `'range'`. |
| `defaultRange` | `DateRange` | — | La période de départ quand le calendrier la garde lui-même. |
| `defaultMonth` | `Date` | le mois courant | Le premier mois affiché, et le jour où part le curseur clavier, quand il n'y a ni `defaultValue` ni `defaultRange` — ces deux-là priment. |
| `min` | `Date` | — | Les jours antérieurs sont exclus. |
| `max` | `Date` | — | Les jours postérieurs sont exclus. |
| `disabled` | `(date: Date) => boolean` | — | Exclut des jours un par un — week-ends, jours fériés, créneaux pris. |
| `weekStartsOn` | `number` | le premier jour de la locale, lundi s'il est illisible | `0` dimanche … `6` samedi. |
| `locale` | `string` | celle du navigateur | Noms des mois et des jours, date complète annoncée par chaque case, premier jour de la semaine. |
| `labels` | `Partial<CalendarLabels>` | `{ previousMonth: 'Previous month', nextMonth: 'Next month' }` | Les noms accessibles des flèches de mois. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |
| `onValueChange` | `(date: Date) => void` | — | Un jour a été choisi, en mode `'single'`. Minuit local. |
| `onRangeChange` | `(range: DateRange) => void` | — | Un clic en mode `'range'` — aux deux clics, `to` absent après le premier. |

`DateRange` vaut `{ readonly from: Date; readonly to?: Date }`. `CalendarLabels` vaut `{ previousMonth: string; nextMonth: string }`.

### Fonctions de date

Le calcul de dates qu'utilise le calendrier, exporté pour le code qui doit tomber d'accord avec lui :

| Fonction | Rend |
|---|---|
| `startOfDay(date: Date): Date` | Minuit local de ce jour — la forme que prend toute date du calendrier. |
| `isSameDay(a: Date, b: Date): boolean` | Si deux dates tombent le même jour, quelle que soit leur heure. |
| `addDays(date: Date, days: number): Date` | Par le constructeur de `Date` : le 32 mars est le 1er avril, et un jour de changement d'heure compte toujours pour un. |
| `addMonths(date: Date, months: number): Date` | Ramené dans le mois visé : le 31 janvier plus un mois donne le 28 février, pas le 3 mars. |
| `monthGrid(month: Date, weekStartsOn: number): Date[]` | Les 42 jours de la grille de six semaines qui couvre `month`. |

Les règles de période vivent dans le même fichier sous forme de fonctions pures — `nextRange(current, date)`, la période après un clic, et `rangePosition(date, range, end)`, la place d'un jour dans une période (un `RangePosition` : `'single' | 'start' | 'end' | 'middle' | 'none'`). `organisms/Calendar.ts` les exporte ; le paquet, non.

## Accessibilité

Les jours forment un `role="grid"` nommé par le titre du mois, et ce titre est `aria-live="polite"` : changer de mois annonce le nouveau. Les en-têtes de jours sont `role="columnheader"`. Chaque jour est un `<button role="gridcell">` nommé par sa date complète dans la `locale` (« samedi 14 mars 2026 »), avec `aria-selected` sur les jours choisis et `aria-current="date"` sur aujourd'hui ; un jour exclu est un bouton désactivé. Les flèches de mois portent leurs `labels`.

Un jour au plus est dans l'ordre de tabulation — le curseur clavier — si bien que <kbd>Tab</kbd> quitte la grille au lieu de parcourir trente et un boutons. Le curseur part de là où s'ouvre le premier mois : `defaultValue`, `defaultRange.from` ou `defaultMonth`, sinon aujourd'hui ; une `value` seule ne le déplace pas. Quand le clavier franchit la limite d'un mois, la grille affiche ce mois, et le focus suit le curseur. Les flèches de mois changent la vue sans déplacer le curseur.

| Touche | Action |
|---|---|
| <kbd>←</kbd> / <kbd>→</kbd> | Jour précédent / suivant. |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Même jour de la semaine, semaine précédente / suivante. |
| <kbd>Page préc.</kbd> / <kbd>Page suiv.</kbd> | Même jour, mois précédent / suivant, ramené à la longueur du mois. |
| <kbd>Début</kbd> / <kbd>Fin</kbd> | Premier / dernier jour de la semaine. |
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Choisit le jour qui a le focus. |

En mode période, le clavier n'a pas d'aperçu : la période apparaît à <kbd>Entrée</kbd>, car une bande qui suivrait le curseur annoncerait une sélection qui n'a pas eu lieu.

Les noms des mois et des jours suivent `locale` ; les noms des deux flèches non, et `labels` les remplace — voir [langues](/fr/nebula/languages).
