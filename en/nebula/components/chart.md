# Chart

Line, area and bar charts drawn as inline SVG, over one categorical axis and one numeric axis — what dashboards overwhelmingly need. That scope is stated plainly rather than stretched: stacked bars with negative values, dual axes, brushes or candlesticks are a charting library's job, and an app that needs them should install one rather than have this component grow into a bad copy of it. See [scope](/en/nebula/scope).

The colours come from `--chart-1` … `--chart-5`, so a chart re-themes with the rest of the design system instead of carrying its own palette. The value axis starts at zero whenever the data is non-negative: a bar chart whose axis starts at the smallest value exaggerates every difference, and that is not offered as an option.

An SVG chart is invisible to a screen reader whatever ARIA is put on it, so the same numbers are also written out as a real `<table>`, visually hidden. The reader gets rows and values it can walk through, not a described picture.

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

Each datum is one category: `categoryKey` names the property holding its label, and each series names the property holding its value. A value that is missing or not a number is drawn as `0`. The legend under the chart lists the series with their colours.

## Examples

### Area and bars

```ts
Chart({ type: 'area', label: 'Visitors per month', categoryKey: 'month', data: visits, series })
Chart({ type: 'bar', label: 'Visitors per month', categoryKey: 'month', data: visits, series })
```

`area` fills under each line down to the zero line. `bar` groups the series side by side within each category, sharing three quarters of its width.

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

`color` takes any CSS colour; without it a series takes `--chart-1` to `--chart-5` by position, starting over after the fifth. A negative value draws its bar below the zero line. The chart fills its container's width and keeps its proportion: `height` is measured against a drawing 600 units wide, so the default 240 is 2.5 : 1. The five horizontal gridlines split the value range into quarters, top and bottom included; there are no value labels on the axis.

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
| `height` | `number` | `240` | The drawing's height against a width of 600 — its proportion, not pixels. |
| `grid` | `boolean` | `true` | Draws the horizontal gridlines. |
| `class` | `Reactive<string>` | — | Merged into the `<figure>`'s classes. |

`ChartDatum` is `Record<string, string | number>`.

### ChartSeries

| Field | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | — | The datum property holding this series' value. |
| `label` | `string` | — | Its name in the legend and the hidden table. |
| `color` | `string` | `var(--chart-1)` … `var(--chart-5)` by position | Any CSS colour. |

### valueRange

`valueRange(data, series): { min: number; max: number }` — the range the value axis covers. `min` is never above zero and `max` never below it, so non-negative data starts at zero; all-zero data gets `max: 1`, so there is always a range to scale against.

## Accessibility

The chart is a `<figure>`. Its SVG is `role="img"`, named by a `<title>` holding `label`. The `<figcaption>` holds a visually hidden `<table>` with the same numbers: `label` as its caption, the categories as row headers, one column per series under its `label`. The first column's heading is `categoryKey` as written, so a key that reads as a word (`month`) reads better than an abbreviation. The legend's colour swatches are `aria-hidden`; its labels are plain text.

The chart is not interactive and handles no keys.
