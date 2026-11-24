# Agenda

Une grille horaire en colonnes, avec des plages dessinées derrière et des événements par-dessus : la semaine d'une personne, la journée de plusieurs, quelques jours de deux. Les événements se déplacent et s'allongent à la souris comme au clavier, et chaque pas est annoncé.

Les colonnes sont les vôtres. Une colonne est une clé et un libellé — un jour, un praticien un jour donné, une salle — si bien que le même composant fait une vue semaine, une vue d'équipe ou les deux, sans que l'agenda ait à savoir laquelle. Une colonne qui porte une `date` (`YYYY-MM-DD`) reçoit la marque du jour et la ligne de l'heure courante.

Les heures sont du texte d'horloge, `"08:30"`, jamais une `Date` : huit heures et demie restent huit heures et demie où que la page soit rendue, et un serveur en UTC qui hydrate une page pour un navigateur à Zurich dessine la même grille.

```sh
ream nebula:add agenda
```

Organisme · `organisms/Agenda.ts`

## Utilisation

```ts
import { signal } from '@c9up/aurora'
import { Agenda, type AgendaEvent } from '@c9up/nebula'

const events = signal<readonly AgendaEvent[]>([
  { key: 'a1', column: 'lun', start: '08:30', end: '09:00', title: 'Ada Martin', movable: true, resizable: true },
])

Agenda({
  label: 'Semaine du 16 novembre',
  columns: [
    { key: 'lun', label: 'lun. 16', date: '2026-11-16' },
    { key: 'mar', label: 'mar. 17', date: '2026-11-17' },
  ],
  events,
  onMove: (change) => events(events().map((e) => (e.key === change.event.key ? { ...e, column: change.column, start: change.start, end: change.end } : e))),
})
```

L'agenda est contrôlé : un dépôt appelle `onMove` ou `onResize` avec l'endroit où l'événement a été posé, et l'événement n'y est dessiné que lorsque `events` le dit. Mettez-le à jour tout de suite, ou quand le serveur a accepté ; un déplacement que le serveur refuse n'a rien à défaire, puisque rien n'a bougé.

## Exemples

### Plusieurs personnes un même jour

```ts
Agenda({
  label: 'Mardi 17 novembre',
  columns: practitioners.map((p) => ({ key: p.id, label: p.name, date: '2026-11-17' })),
  events: appointments,
  hours: [7, 19],
  step: 5,
})
```

La `column` d'un événement est une clé de colonne, quoi que les colonnes représentent. Plusieurs personnes sur plusieurs jours, c'est pareil : une colonne par personne et par jour, avec la clé de votre choix (`` `${day}:${person}` ``).

### Des plages derrière les événements

```ts
Agenda({
  label: 'Semaine',
  columns,
  events,
  ranges: [
    { key: 'b1', column: 'lun', start: '08:00', end: '12:00', label: 'Consultations', tone: 'primary' },
    { key: 'conge', column: 'ven', start: '07:00', end: '20:00', label: 'Absent', hatched: true },
  ],
  onRangeActivate: (range) => openBlock(range.key),
})
```

Une plage ne prend le focus que si `onRangeActivate` est donné : son libellé est alors un bouton.

### Tons, jours fériés, indications

`tone` dit ce qu'est un événement ou une plage — `'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted'` — et l'application y range ses propres états (libre, réservé, arrivé, annulé), un sens chacun. `accent` colore le bord gauche d'un événement de n'importe quelle couleur CSS, celle d'une catégorie. La valeur ne règle que cette propriété : une valeur qui n'est pas une couleur est ignorée et la couleur du ton reste. Une valeur enregistrée ne peut donc pas ajouter d'autres styles au bloc. `struck` le barre. Une colonne `holiday: true` a son en-tête et sa grille marqués ; `hint` est une seconde ligne sous son libellé.

### Créneaux libres et nouveaux événements

Un point de la grille cliqué là où il n'y a rien appelle `onSlotActivate({ column, start })`, `start` arrondi au pas inférieur. Pour le clavier, proposez les créneaux libres comme des événements à part entière (`tone: 'success'`, ni déplaçables ni redimensionnables) : on les parcourt et on les active comme les autres.

### Langue

```ts
Agenda({
  label: 'Semaine du 16 novembre',
  columns,
  events,
  locale: 'fr-CH',
  labels: {
    keyboardHint: 'Les flèches passent d’un rendez-vous à l’autre. Entrée l’ouvre, Espace le prend.',
    grabbed: '{title} pris. Les flèches le déplacent, Maj avec Haut ou Bas change sa fin, Entrée le pose, Échap le remet.',
    moved: '{title} : {column}, de {start} à {end}.',
    cancelled: '{title} remis en place.',
    now: 'Maintenant',
    resize: 'Changer la fin de {title}',
  },
})
```

`locale` met en forme les heures de la marge. Les mots que l'agenda écrit lui-même viennent de `labels` ; `{title}`, `{column}`, `{start}` et `{end}` y sont remplacés — voir [langues](/fr/nebula/languages).

## API

### Agenda

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | — | Le nom accessible de la grille. Obligatoire. |
| `columns` | `Reactive<readonly AgendaColumn[]>` | — | Les colonnes, de gauche à droite. |
| `events` | `Reactive<readonly AgendaEvent[]>` | — | Les événements. Celui d'une colonne inconnue, dont une heure n'est pas `HH:mm`, qui finit avant de commencer ou tombe entièrement hors de `hours` n'est pas dessiné. |
| `ranges` | `Reactive<readonly AgendaRange[]>` | `[]` | Les plages dessinées derrière les événements. |
| `hours` | `readonly [number, number]` | `[7, 20]` | Première et dernière heure affichées. Lu une fois. |
| `step` | `number` | `15` | Minutes entre deux lignes de la grille. |
| `snap` | `number` | `step` | Minutes dont un événement se déplace ou s'allonge. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Hauteur d'une heure : 3, 5 ou 8 rem. |
| `locale` | `string` | celle de l'environnement | Les heures de la marge. |
| `labels` | `Partial<AgendaLabels>` | en anglais | Les mots que l'agenda écrit lui-même. |
| `now` | `() => Date` | `() => new Date()` | L'horloge de la ligne de l'heure courante, relue chaque minute. |
| `scrollTo` | `string` | la première plage ou le premier événement | `HH:mm` atteint par défilement au montage. |
| `class` | `Reactive<string>` | — | Fusionné aux classes de la racine. |
| `bodyClass` | `string` | `'max-h-[40rem]'` | Classes du corps : sa hauteur, un corps qui défile seul. `''` laisse l'agenda prendre toute sa hauteur dans une page qui défile déjà : une seule barre de défilement, les en-têtes de colonnes collants. |
| `onActivate` | `(event: AgendaEvent) => void` | — | Un événement cliqué, ou Entrée dessus. |
| `onRangeActivate` | `(range: AgendaRange) => void` | — | Le libellé d'une plage choisi. |
| `onSlotActivate` | `(slot: AgendaSlot) => void` | — | Un point vide de la grille cliqué. |
| `onMove` | `(change: AgendaChange) => void` | — | Un événement posé à une autre heure ou dans une autre colonne ; sa fin suit. |
| `onResize` | `(change: AgendaChange) => void` | — | La fin d'un événement changée, son début et sa colonne inchangés. |
| `renderEvent` | `(event: ReadSignal<AgendaEvent>) => Child` | heures, titre, détail | Le contenu d'un événement. |

`AgendaColumn` vaut `{ key, label, hint?, date?, holiday? }`. `AgendaEvent` vaut `{ key, column, start, end, title, detail?, tone?, accent?, struck?, movable?, resizable? }`. `AgendaRange` vaut `{ key, column, start, end, label?, tone?, hatched? }`. `AgendaChange` vaut `{ event, column, start, end }`, `AgendaSlot` `{ column, start }`.

### Fonctions utilitaires

| Fonction | Rend |
|---|---|
| `minutesOf(clock: string): number \| null` | Les minutes depuis minuit de `HH:mm` (`24:00` compris), `null` pour tout le reste. |
| `clockOf(minutes: number): string` | `HH:mm`. |
| `isoDay(date: Date): string` | `YYYY-MM-DD` sur l'horloge propre de la date. |
| `lanesOf(events): Map<string, Lane>` | Les couloirs côte à côte : les événements qui se chevauchent, directement ou par une chaîne, se partagent la largeur ; se toucher n'est pas se chevaucher. |
| `clampMove`, `clampEnd`, `snapDown`, `snapNearest` | L'arithmétique d'un déplacement et d'un allongement, gardés dans la grille. |

## Géométrie et Content-Security-Policy

Les lignes horaires sont de vrais éléments d'une hauteur fixe : la grille a sa taille dès le balisage du serveur. Plages et événements sont placés en pourcentages par le CSSOM (`.style`), que ne régit pas une politique sans `'unsafe-inline'` : aucun attribut `style` n'est jamais écrit. Le serveur ne peut pas écrire le CSSOM, aussi plages et événements restent `hidden` jusqu'au montage de l'agenda plutôt que d'être dessinés au mauvais endroit.

## Accessibilité

L'agenda est un `role="group"` nommé par `label`. Les en-têtes de colonnes sont du texte simple : l'agenda n'est pas une grille de données, et chaque événement nomme lui-même sa colonne. Chaque événement est un `role="button"` nommé par son titre, son détail, sa colonne et ses heures, et décrit par l'indication clavier. Un seul événement est dans l'ordre de tabulation — le dernier où était le clavier, sinon le premier — si bien que <kbd>Tab</kbd> quitte la grille. Une zone live annonce chaque prise, pas, dépôt et annulation.

| Touche | Action |
|---|---|
| <kbd>↑</kbd> / <kbd>↓</kbd> | Événement précédent / suivant de la colonne. |
| <kbd>←</kbd> / <kbd>→</kbd> | L'événement le plus proche dans le temps de la colonne précédente / suivante qui en a un. |
| <kbd>Début</kbd> / <kbd>Fin</kbd> | Premier / dernier événement. |
| <kbd>Entrée</kbd> | Active l'événement. |
| <kbd>Espace</kbd> | Prend un événement déplaçable ou redimensionnable (`aria-pressed`) ; active les autres. |

Pendant qu'un événement est pris :

| Touche | Action |
|---|---|
| <kbd>↑</kbd> / <kbd>↓</kbd> | Plus tôt / plus tard de `snap`, sa durée gardée, dans `hours`. |
| <kbd>Maj</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Sa fin plus tôt / plus tard de `snap`, d'un `snap` au moins. |
| <kbd>←</kbd> / <kbd>→</kbd> | Colonne précédente / suivante. |
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Le pose : `onMove`, ou `onResize` si seule la fin a changé. |
| <kbd>Échap</kbd> / <kbd>Tab</kbd> | Le remet en place. |

À la souris, un événement se tire par son corps et s'allonge par son bord inférieur ; un appui qui ne parcourt pas quatre pixels est un clic. <kbd>Échap</kbd> pendant un glisser remet l'événement en place.
