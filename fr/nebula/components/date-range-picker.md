# DateRangePicker

Un [Calendar](/fr/nebula/components/calendar) en mode période, derrière un bouton. C'est la même coque que [DatePicker](/fr/nebula/components/date-picker), et c'est voulu : les deux diffèrent par ce qu'ils recueillent, pas par leur comportement. Tous deux se ferment une fois la saisie complète, rendent le focus au déclencheur, formatent par `Intl` et envoient des dates ISO.

La seule différence est le moment de fermer. Une date seule est faite en un clic ; une période ne l'est qu'au second, donc le popover reste ouvert entre les deux — le fermer au premier clic et le rouvrir pour le second donne l'impression d'un contrôle cassé. Le déclencheur affiche `14 mars 2026 — …` tant que la seconde borne manque.

Deux champs cachés plutôt qu'un seul joint par une virgule : un serveur qui lit `from` et `to` séparément n'a jamais à découper une chaîne, et un `to` vide ne prête à aucune confusion.

```sh
ream nebula:add date-range-picker
```

Organisme · `organisms/DateRangePicker.ts` · [Button](/fr/nebula/components/button), [Calendar](/fr/nebula/components/calendar), [DatePicker](/fr/nebula/components/date-picker)

## Utilisation

```ts
import { DateRangePicker } from '@c9up/nebula'

DateRangePicker({ name: 'stay' })
```

Dans un `<form>`, cela envoie `stay_from=2026-07-04` et `stay_to=2026-07-11`, chacun vide tant que sa borne n'est pas choisie.

## Exemples

### Suivre un signal

```ts
import { signal } from '@c9up/aurora'
import { type DateRange } from '@c9up/nebula'

const stay = signal<DateRange | undefined>(undefined)

DateRangePicker({ value: stay, onValueChange: stay })
```

Sans `value`, le sélecteur garde la période lui-même, à partir de `defaultValue`. Une `value` qui lit `undefined` rend l'affichage à cet état propre : il montre la dernière période choisie, pas le texte d'attente.

### Agir sur une période complète

`onValueChange` est appelé aux deux clics — `to` est absent après le premier, ce qui permet à un signal lié de montrer la période à moitié choisie. Le code qui a besoin des deux bornes attend `to` :

```ts
DateRangePicker({
  name: 'stay',
  min: new Date(),
  onValueChange: (range) => {
    if (range.to !== undefined) quote(range.from, range.to)
  },
})
```

La période suit les règles du [Calendar](/fr/nebula/components/calendar#une-periode) : un second clic avant le premier recommence, et un clic après une période complète en commence une nouvelle.

### Dans une autre langue

```ts
DateRangePicker({
  name: 'stay',
  locale: 'fr-CH',
  placeholder: 'Choisir les dates',
  labels: { dialog: 'Choisir une période', previousMonth: 'Mois précédent', nextMonth: 'Mois suivant' },
})
```

## API

### DateRangePicker

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | — | Nom de base des champs cachés — `'stay'` envoie `stay_from` et `stay_to`. |
| `value` | `Reactive<DateRange \| undefined>` | — | La période choisie, quand vous la gardez. |
| `defaultValue` | `DateRange` | — | La période de départ, quand le sélecteur la garde. |
| `placeholder` | `string` | `'Pick a date range'` | Le texte du déclencheur tant que rien n'est choisi. |
| `min` | `Date` | — | Premier jour qu'on peut choisir. |
| `max` | `Date` | — | Dernier jour qu'on peut choisir. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive le déclencheur. |
| `invalid` | `Reactive<boolean>` | `false` | Pose `aria-invalid` sur le déclencheur. |
| `locale` | `string` | celle du navigateur | Le format de date du déclencheur et les noms du calendrier. |
| `labels` | `Partial<DatePickerLabels>` | `{ dialog: 'Choose a date range', previousMonth: 'Previous month', nextMonth: 'Next month' }` | Le nom accessible de la fenêtre et les flèches du calendrier. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |
| `onValueChange` | `(range: DateRange) => void` | — | Aux deux clics — `to` absent après le premier. Minuit local. |

`DateRange` vaut `{ readonly from: Date; readonly to?: Date }` ; `DatePickerLabels` est décrit sur [DatePicker](/fr/nebula/components/date-picker#api).

## Accessibilité

Comme pour [DatePicker](/fr/nebula/components/date-picker#accessibilite) : le déclencheur est un `<button>` avec `aria-haspopup="dialog"`, `aria-expanded` et `aria-controls` ; la fenêtre est un `role="dialog"` nommé par `labels.dialog` ; elle s'ouvre sur le début choisi — ou aujourd'hui — plutôt que sur la flèche de mois, garde le focus tant qu'elle est ouverte et le rend au déclencheur quand une période complète ou <kbd>Échap</kbd> la ferme — un clic à l'extérieur laisse le focus là où ce clic le met.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> sur le déclencheur | Ouvre ou ferme la fenêtre. |
| <kbd>Tab</kbd> / <kbd>Maj</kbd>+<kbd>Tab</kbd> | Passe des flèches de mois à la grille, en bouclant dans la fenêtre. |
| <kbd>Échap</kbd> | Ferme la fenêtre, en gardant une période à moitié choisie. |
| Flèches, <kbd>Page préc.</kbd>/<kbd>Page suiv.</kbd>, <kbd>Début</kbd>/<kbd>Fin</kbd> | Comme dans le [Calendar](/fr/nebula/components/calendar#accessibilite). |
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> sur un jour | Fixe une borne ; la seconde ferme la fenêtre. |

Le texte d'attente, le nom de la fenêtre et les noms des deux flèches sont en anglais par défaut : `placeholder` et `labels` les remplacent — voir [langues](/fr/nebula/languages).
