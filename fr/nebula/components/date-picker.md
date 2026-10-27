# DatePicker

Un [Calendar](/fr/nebula/components/calendar) dans un popover, derrière un bouton. L'assemblage a l'air trivial et cache trois détails faciles à rater : nebula le livre plutôt que de laisser chaque projet les redécouvrir.

Le popover se ferme sur un choix — un sélecteur qui reste ouvert après coup laisse l'utilisateur chercher la sortie — et le focus revient au déclencheur, si bien que l'ordre de tabulation ne repart pas du haut de la page. Le déclencheur affiche la date par `Intl.DateTimeFormat` dans la `locale`, pas dans un ordre américain que tous les autres doivent déchiffrer. Et un champ caché porte la valeur en ISO `YYYY-MM-DD`, ce qu'attend un serveur — jamais le texte localisé du bouton.

```sh
ream nebula:add date-picker
```

Organisme · `organisms/DatePicker.ts` · [Button](/fr/nebula/components/button), [Calendar](/fr/nebula/components/calendar)

## Utilisation

```ts
import { DatePicker } from '@c9up/nebula'

DatePicker({ name: 'due' })
```

Dans un `<form>`, cela envoie `due=2026-03-14`, ou `due=` tant que rien n'est choisi.

## Exemples

### Suivre un signal

```ts
import { signal } from '@c9up/aurora'

const due = signal<Date | undefined>(undefined)

DatePicker({ value: due, onValueChange: due })
```

Sans `value`, le sélecteur garde la date lui-même, à partir de `defaultValue`. `onValueChange` reçoit le jour choisi à minuit local. Une `value` qui lit `undefined` rend l'affichage à l'état propre du sélecteur : il montre le dernier jour choisi, pas le texte d'attente.

### Bornes et texte d'attente

```ts
import { addMonths } from '@c9up/nebula'

DatePicker({
  name: 'due',
  min: new Date(),
  max: addMonths(new Date(), 6),
  placeholder: "Pas d'échéance",
})
```

`min` et `max` sont transmis au calendrier. Une règle jour par jour (`disabled(date)`) ou un premier jour de la semaine imposé ne le sont pas : pour ceux-là, placez vous-même un [Calendar](/fr/nebula/components/calendar) dans un [Popover](/fr/nebula/components/popover).

### Signaler une erreur

```ts
DatePicker({ name: 'due', invalid: () => errors().due !== undefined })
```

`invalid` pose `aria-invalid` sur le déclencheur, ce qui le dessine dans la couleur destructive.

### Envoyer la date ailleurs

`toISODate` donne le même `YYYY-MM-DD` que le champ caché, à partir de la date locale, sans l'aller-retour par le fuseau que ferait `toISOString()` :

```ts
import { toISODate } from '@c9up/nebula'

DatePicker({ onValueChange: (date) => reschedule(toISODate(date)) })
```

### Dans une autre langue

```ts
DatePicker({
  name: 'due',
  locale: 'fr-CH',
  placeholder: 'Choisir une date',
  labels: { dialog: 'Choisir une date', previousMonth: 'Mois précédent', nextMonth: 'Mois suivant' },
})
```

## API

### DatePicker

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | — | Le `name` du champ caché. Sa valeur est `YYYY-MM-DD`, ou vide. |
| `value` | `Reactive<Date \| undefined>` | — | Le jour choisi, quand vous le gardez. |
| `defaultValue` | `Date` | — | Le jour de départ, quand le sélecteur le garde. |
| `placeholder` | `string` | `'Pick a date'` | Le texte du déclencheur tant que rien n'est choisi. |
| `min` | `Date` | — | Premier jour qu'on peut choisir. |
| `max` | `Date` | — | Dernier jour qu'on peut choisir. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive le déclencheur. |
| `invalid` | `Reactive<boolean>` | `false` | Pose `aria-invalid` sur le déclencheur. |
| `locale` | `string` | celle du navigateur | Le format de date du déclencheur et les noms du calendrier. |
| `labels` | `Partial<DatePickerLabels>` | `{ dialog: 'Choose a date', previousMonth: 'Previous month', nextMonth: 'Next month' }` | Le nom accessible de la fenêtre et les flèches du calendrier. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |
| `onValueChange` | `(date: Date) => void` | — | Un jour a été choisi. Minuit local. |

`DatePickerLabels` vaut `CalendarLabels` plus `dialog: string`, le nom de la fenêtre.

### toISODate

`toISODate(date: Date): string` — `YYYY-MM-DD` à partir de la date locale.

## Accessibilité

Le déclencheur est un `<button>` avec `aria-haspopup="dialog"`, `aria-expanded`, et `aria-controls` qui pointe sur la fenêtre tant qu'elle est ouverte. La fenêtre est un `role="dialog"` nommé par `labels.dialog`. À l'ouverture, le focus va sur le jour choisi — ou aujourd'hui — et non sur la flèche du mois précédent, où la première flèche du clavier changerait de mois au lieu de déplacer d'un jour. Le focus reste dans la fenêtre jusqu'à sa fermeture. La fermer par un choix ou <kbd>Échap</kbd> rend le focus au déclencheur ; un clic à l'extérieur la ferme et laisse le focus là où ce clic le met.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> sur le déclencheur | Ouvre ou ferme la fenêtre. |
| <kbd>Tab</kbd> / <kbd>Maj</kbd>+<kbd>Tab</kbd> | Passe des flèches de mois à la grille, en bouclant dans la fenêtre. |
| <kbd>Échap</kbd> | Ferme la fenêtre. |
| Flèches, <kbd>Page préc.</kbd>/<kbd>Page suiv.</kbd>, <kbd>Début</kbd>/<kbd>Fin</kbd>, <kbd>Entrée</kbd> | Comme dans le [Calendar](/fr/nebula/components/calendar#accessibilite) ; <kbd>Entrée</kbd> choisit et ferme. |

Le texte d'attente, le nom de la fenêtre et les noms des deux flèches sont en anglais par défaut : `placeholder` et `labels` les remplacent — voir [langues](/fr/nebula/languages).
