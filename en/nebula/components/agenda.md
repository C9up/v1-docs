# Agenda

A time grid of columns, with ranges drawn behind and events on top: a week of one person, a day of several, a few days of two. Events move and stretch by pointer and by keyboard, and every step is announced.

The columns are yours. A column is a key and a label — a day, a practitioner on a day, a room — so the same component is a week view, a team view or both, and the agenda never has to know which. A column with a `date` (`YYYY-MM-DD`) gets the today mark and the now line.

Times are wall-clock text, `"08:30"`, never a `Date`: half past eight is half past eight wherever the page is rendered, and a server in UTC hydrating a page for a browser in Zurich draws the same grid.

```sh
ream nebula:add agenda
```

Organism · `organisms/Agenda.ts`

## Usage

```ts
import { signal } from '@c9up/aurora'
import { Agenda, type AgendaEvent } from '@c9up/nebula'

const events = signal<readonly AgendaEvent[]>([
  { key: 'a1', column: 'mon', start: '08:30', end: '09:00', title: 'Ada Martin', movable: true, resizable: true },
])

Agenda({
  label: 'Week of 16 November',
  columns: [
    { key: 'mon', label: 'Mon 16', date: '2026-11-16' },
    { key: 'tue', label: 'Tue 17', date: '2026-11-17' },
  ],
  events,
  onMove: (change) => events(events().map((e) => (e.key === change.event.key ? { ...e, column: change.column, start: change.start, end: change.end } : e))),
})
```

The agenda is controlled: a drop calls `onMove` or `onResize` with where the event landed, and the event is drawn there only once `events` says so. Update it at once, or once the server agrees; a move the server refuses needs no undo, since nothing moved.

## Examples

### Several people on one day

```ts
Agenda({
  label: 'Tuesday 17 November',
  columns: practitioners.map((p) => ({ key: p.id, label: p.name, date: '2026-11-17' })),
  events: appointments,
  hours: [7, 19],
  step: 5,
})
```

An event's `column` is a column key, whatever the columns stand for. Several people over several days is the same: one column per person and day, keyed as you like (`` `${day}:${person}` ``).

### Ranges behind the events

```ts
Agenda({
  label: 'Week',
  columns,
  events,
  ranges: [
    { key: 'b1', column: 'mon', start: '08:00', end: '12:00', label: 'Consultations', tone: 'primary' },
    { key: 'off', column: 'fri', start: '07:00', end: '20:00', label: 'Away', hatched: true },
  ],
  onRangeActivate: (range) => openBlock(range.key),
})
```

A range is not focusable unless `onRangeActivate` is given: then its label is a button.

### Tones, holidays, hints

`tone` says what an event or a range is — `'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted'` — and an app maps its own states onto them (free, booked, arrived, cancelled), one meaning each. `accent` colours an event's left edge with any CSS colour, a category's own; `struck` draws it struck through. A column with `holiday: true` has its header and its grid marked; `hint` is a second line under its label.

### Free slots and new events

A point of the grid clicked with nothing on it calls `onSlotActivate({ column, start })`, `start` snapped down. For keyboard users, offer free slots as events of their own (`tone: 'success'`, neither movable nor resizable): they are walked and activated like the rest.

### Language

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

`locale` formats the hours of the gutter. The words the agenda writes itself come from `labels`; `{title}`, `{column}`, `{start}` and `{end}` are replaced where they appear — see [languages](/en/nebula/languages).

## API

### Agenda

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | The grid's accessible name. Required. |
| `columns` | `Reactive<readonly AgendaColumn[]>` | — | The columns, left to right. |
| `events` | `Reactive<readonly AgendaEvent[]>` | — | The events. One in an unknown column, with a time that is not `HH:mm`, ending before it starts or wholly outside `hours` is not drawn. |
| `ranges` | `Reactive<readonly AgendaRange[]>` | `[]` | Spans drawn behind the events. |
| `hours` | `readonly [number, number]` | `[7, 20]` | First and last hour shown. Read once. |
| `step` | `number` | `15` | Minutes between two grid lines. |
| `snap` | `number` | `step` | Minutes an event moves or stretches by. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Height of an hour: 3, 5 or 8 rem. |
| `locale` | `string` | the runtime's | The hours of the gutter. |
| `labels` | `Partial<AgendaLabels>` | English | The words the agenda writes itself. |
| `now` | `() => Date` | `() => new Date()` | The clock of the now line, read every minute. |
| `scrollTo` | `string` | the first range or event | `HH:mm` scrolled to when mounted. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |
| `bodyClass` | `string` | `'max-h-[40rem]'` | Classes of the scrolling body: its height. |
| `onActivate` | `(event: AgendaEvent) => void` | — | An event clicked, or Enter on it. |
| `onRangeActivate` | `(range: AgendaRange) => void` | — | A range's label chosen. |
| `onSlotActivate` | `(slot: AgendaSlot) => void` | — | An empty point of the grid clicked. |
| `onMove` | `(change: AgendaChange) => void` | — | An event dropped at another time or in another column; its end follows. |
| `onResize` | `(change: AgendaChange) => void` | — | An event's end changed, its start and column unchanged. |
| `renderEvent` | `(event: ReadSignal<AgendaEvent>) => Child` | times, title, detail | The content of an event. |

`AgendaColumn` is `{ key, label, hint?, date?, holiday? }`. `AgendaEvent` is `{ key, column, start, end, title, detail?, tone?, accent?, struck?, movable?, resizable? }`. `AgendaRange` is `{ key, column, start, end, label?, tone?, hatched? }`. `AgendaChange` is `{ event, column, start, end }`, `AgendaSlot` `{ column, start }`.

### Helpers

| Function | Returns |
|---|---|
| `minutesOf(clock: string): number \| null` | Minutes since midnight of `HH:mm` (`24:00` included), `null` for anything else. |
| `clockOf(minutes: number): string` | `HH:mm`. |
| `isoDay(date: Date): string` | `YYYY-MM-DD` on the date's own wall clock. |
| `lanesOf(events): Map<string, Lane>` | Side-by-side lanes: events overlapping, directly or through a chain, share the width; touching is not overlapping. |
| `clampMove`, `clampEnd`, `snapDown`, `snapNearest` | The arithmetic of a move and a stretch, kept within the grid. |

## Geometry and the Content-Security-Policy

The hour rows are real elements of a fixed height, so the grid has its size in the server's markup. Ranges and events are placed in percentages through the CSSOM (`.style`), which a policy without `'unsafe-inline'` does not govern — no `style` attribute is ever written. The server cannot write the CSSOM, so ranges and events are `hidden` until the agenda is mounted rather than drawn in the wrong place.

## Accessibility

The agenda is a `role="group"` named by `label`. The column headers are plain text: the agenda is not a data grid, and each event names its column itself. Each event is a `role="button"` named by its title, detail, column and times, and described by the keyboard hint. One event is in the tab order — the last one the keyboard was on, else the first — so <kbd>Tab</kbd> leaves the grid. A live region announces every pick-up, step, drop and cancel.

| Key | Action |
|---|---|
| <kbd>↑</kbd> / <kbd>↓</kbd> | Previous / next event in the column. |
| <kbd>←</kbd> / <kbd>→</kbd> | The event nearest in time in the previous / next column that has one. |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last event. |
| <kbd>Enter</kbd> | Activates the event. |
| <kbd>Space</kbd> | Picks a movable or resizable event up (`aria-pressed`); activates any other. |

While an event is held:

| Key | Action |
|---|---|
| <kbd>↑</kbd> / <kbd>↓</kbd> | Earlier / later by `snap`, its duration kept, within `hours`. |
| <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Its end earlier / later by `snap`, one `snap` long at least. |
| <kbd>←</kbd> / <kbd>→</kbd> | Previous / next column. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Drops it: `onMove`, or `onResize` when only the end changed. |
| <kbd>Escape</kbd> / <kbd>Tab</kbd> | Puts it back. |

With a pointer, an event is dragged from its body and stretched from its bottom edge; a press that does not travel four pixels is a click. <kbd>Escape</kbd> during a drag puts the event back.
