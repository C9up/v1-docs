# Chart

Line, area and bar charts drawn as inline SVG, over one categorical axis and one numeric axis — what dashboards overwhelmingly need. That scope is stated plainly rather than stretched: stacked bars with negative values, dual axes, brushes, candlesticks, horizontal bars, heatmaps or funnels are a charting library's job, and an app that needs them should install one rather than have this component grow into a bad copy of it. See [scope](/en/nebula/scope).

The colours come from `--chart-1` … `--chart-5`, so a chart re-themes with the rest of the design system instead of carrying its own palette. The value axis is graduated in round steps — 1, 2, 2.5 or 5 times a power of ten — and starts at zero unless told otherwise; bars always do, since a bar whose axis starts at the smallest value exaggerates every difference.

Text is never stretched: the axis labels are drawn at their real size, and only the curves and bars stretch to the width, with lines that keep their thickness. Everything is an SVG attribute — no `style` attribute, which a strict Content-Security-Policy blocks — so the server's markup is the finished chart.

An SVG chart is invisible to a screen reader whatever ARIA is put on it, so the same numbers are also written out as a real `<table>`, visually hidden. The reader gets rows and values it can walk through, not a described picture. The plot also takes focus: the arrow keys walk the categories, and what the pointer or the keyboard points at is shown in a tooltip and announced.

```sh
ream nebula:add chart
```

Organism · `organisms/Chart.ts` · no dependencies

## Usage

```ts
import { Chart } from '@c9up/nebula'

Chart({
  label: 'Visitors per month',
  categoryKey: 'month',
  data: [
    { month: 'Jan', desktop: 186, mobile: 80 },
    { month: 'Feb', desktop: 305, mobile: 200 },
    { month: 'Mar', desktop: 237, mobile: 120 },
  ],
  series: [
    { key: 'desktop', label: 'Desktop' },
    { key: 'mobile', label: 'Mobile' },
  ],
})
```

Each datum is one category: `categoryKey` names the property holding its label — a string, a number or a `Date` — and each series names the property holding its value. A value that is missing, `null` or not a finite number is a gap: the line breaks, the area stops, no bar is drawn, and the table writes `—`. Drawing it as `0` would invent a number. A value with a gap on both sides is drawn as a dot. The legend under the chart lists the series with their colours.

Category labels are thinned to the room they have: every second, fifth or tenth one is written, whichever keeps the widest from touching its neighbour. The server thins for a nominal 600 px; the browser thins again for the plot's real width, and again whenever it changes.

## Examples

### Area and bars

```ts
Chart({ type: 'area', label: 'Visitors per month', categoryKey: 'month', data: visits, series })
Chart({ type: 'bar', label: 'Visitors per month', categoryKey: 'month', data: visits, series })
```

`area` fills under each stretch of line down to the zero line — or to the bottom of the axis when zero is not on it. `bar` groups the series side by side within each category, sharing three quarters of its width.

### Off zero, fixed ends, upside down

```ts
// A latency between 480 and 520 ms: zero would flatten it.
Chart({ label: 'Latency', categoryKey: 'day', data: latency, series: [{ key: 'ms', label: 'p95' }], zero: false })

// A search position: 1 is best, so it goes at the top, and the axis starts exactly at 1.
Chart({
  label: 'Position',
  categoryKey: 'day',
  data: positions,
  series: [{ key: 'position', label: 'Position' }],
  zero: false,
  reversed: true,
  domain: [1, 'auto'],
})
```

`domain` is `[min, max]`, each end a number or `'auto'`. An `'auto'` end fits the data and is rounded outwards to the next tick; a number is kept exactly and written as a tick of its own. `zero: false` lets an `'auto'` end leave zero — bars ignore it. `reversed` draws the smallest value at the top. `tickCount` asks for about that many ticks (default `5`); the step stays round, so the count is approximate.

### Formats

```ts
Chart({
  label: 'Revenue',
  categoryKey: 'day',
  data: [{ day: new Date('2026-11-02'), revenue: 12500 }, { day: new Date('2026-11-03'), revenue: null }],
  series: [{ key: 'revenue', label: 'Revenue' }],
  locale: 'fr-CH',
  formatValue: (value) => new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(value),
})
```

`formatValue` writes every value — on the axis, in the tooltip, in the table; `formatCategory` every category. Without them, numbers go through `Intl.NumberFormat` and dates through `Intl.DateTimeFormat` (`dateStyle: 'medium'`) in `locale`. Pass `locale` explicitly when the page is rendered on the server: the server's default locale is not the reader's.

### Colours, height, gridlines

```ts
Chart({
  type: 'bar',
  label: 'Balance per month',
  categoryKey: 'month',
  data: [
    { month: 'Jan', balance: 1200 },
    { month: 'Feb', balance: -300 },
  ],
  series: [{ key: 'balance', label: 'Balance', color: 'var(--primary)' }],
  height: 160,
  grid: false,
})
```

`color` takes any CSS colour; without it a series takes `--chart-1` to `--chart-5` by position, starting over after the fifth. A negative value draws its bar below the zero line. The chart fills its container's width; `height` is its height in pixels, category labels included. A gridline runs across at each tick of the value axis.

### Following data

`data` and `series` are read once, when the chart is built. A chart that follows a signal is rebuilt from an accessor:

```ts
import { html, signal } from '@c9up/aurora'
import { type ChartDatum } from '@c9up/nebula'

const live = signal<ChartDatum[]>([])

setInterval(async () => live(await fetchVisits()), 60_000)

html`${() => Chart({ label: 'Visitors per month', categoryKey: 'month', data: live(), series })}`
```

## API

### Chart

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `readonly ChartDatum[]` | — | One datum per category, in axis order. Read once. |
| `series` | `readonly ChartSeries[]` | — | The values drawn from each datum. Read once. |
| `categoryKey` | `string` | — | The datum property holding the category label. |
| `label` | `string` | — | The chart's accessible name, and the hidden table's caption. |
| `type` | `'line' \| 'area' \| 'bar'` | `'line'` | How the series are drawn. |
| `height` | `number` | `240` | The chart's height in pixels, category labels included. |
| `grid` | `boolean` | `true` | Draws a gridline at each value tick. |
| `domain` | `readonly [ChartBound, ChartBound]` | `['auto', 'auto']` | The value axis' ends; each a number, kept exactly, or `'auto'`. |
| `zero` | `boolean` | `true` | Stretches an `'auto'` end to include zero. Always on for bars. |
| `reversed` | `boolean` | `false` | Draws the smallest value at the top. |
| `tickCount` | `number` | `5` | About how many value ticks. |
| `formatValue` | `(value: number) => string` | `Intl.NumberFormat` | Writes a value on the axis, in the tooltip and in the table. |
| `formatCategory` | `(category: ChartCategory) => string` | `Intl.DateTimeFormat` for a date, as is otherwise | Writes a category on the axis, in the tooltip and in the table. |
| `locale` | `string` | the runtime's | The locale of the default formatters. |
| `roleDescription` | `string` | `'chart'` | What a screen reader calls the plot. |
| `keyboardHint` | `string` | `'Arrow keys read each category.'` | How a screen reader is told to read the plot. |
| `class` | `Reactive<string>` | — | Merged into the `<figure>`'s classes. |

`ChartDatum` is `Record<string, string | number | Date | null | undefined>`, `ChartCategory` is `string | number | Date`, and `ChartBound` is `number | 'auto'`.

### ChartSeries

| Field | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | — | The datum property holding this series' value. |
| `label` | `string` | — | Its name in the legend and the hidden table. |
| `color` | `string` | `var(--chart-1)` … `var(--chart-5)` by position | Any CSS colour. |

### Helpers

`valueAxis(data, series, { domain?, zero?, tickCount? }): { min, max, ticks }` — the axis a chart draws, ends and ticks.

`niceTicks(min, max, count = 5): { min, max, step, ticks }` — round ticks covering a range, widened outwards to a tick.

`valueRange(data, series, { zero? }): { min: number; max: number }` — the range the data covers, gaps skipped. With `zero` (the default) it includes zero; a flat range is widened, and no data reads as `0`–`1`.

`visibleCategories(count, widestLabel, plotWidth): number[]` — the indexes of the category labels that fit.

## Accessibility

The chart is a `<figure>`. Its drawings are `aria-hidden`; the plot around them is a focusable `role="group"` with `aria-roledescription` (`roleDescription`), named by `label` and described by `keyboardHint`. The `<figcaption>` holds a visually hidden `<table>` with the same numbers: `label` as its caption, the categories as row headers, one column per series under its `label`. The first column's heading is `categoryKey` as written, so a key that reads as a word (`month`) reads better than an abbreviation. The legend's colour swatches are `aria-hidden`; its labels are plain text.

| Key | Action |
|---|---|
| <kbd>→</kbd> <kbd>↓</kbd> | Next category (the first one, if none is pointed at). |
| <kbd>←</kbd> <kbd>↑</kbd> | Previous category. |
| <kbd>Home</kbd> <kbd>End</kbd> | First, last category. |
| <kbd>Esc</kbd> | Stops pointing. |

The category pointed at — by the keyboard or the pointer — gets a dashed guide, a dot on each value and a tooltip; the same text (`Mar — Desktop: 237, Mobile: 120`) goes to a polite live region, and the tooltip itself is `aria-hidden` so it is not read twice. Leaving the plot or blurring it clears the pointing.
