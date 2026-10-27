# Table

The styled parts of a table — and real table elements, not a grid of divs. A `<table>` gives a screen reader row and column context for free ("row 3, Amount, 42"); rebuilding that over divs means maintaining `role="grid"`, `aria-rowindex` and `aria-colindex` on every cell by hand. The container scrolls sideways on a narrow screen without touching the semantics.

These parts are presentation only. Sorting, filtering, paging and selection over an array are [DataTable](/en/nebula/components/data-table), which is built from them.

```sh
ream nebula:add table
```

Molecule · `molecules/Table.ts` · no dependencies

## Usage

```ts
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@c9up/nebula'

Table({
  children: [
    TableHeader({
      children: TableRow({
        children: [TableHead({ children: 'Invoice' }), TableHead({ class: 'text-right', children: 'Amount' })],
      }),
    }),
    TableBody({
      children: invoices.map((invoice) =>
        TableRow({
          children: [TableCell({ children: invoice.id }), TableCell({ class: 'text-right', children: invoice.amount })],
        }),
      ),
    }),
  ],
})
```

The parts share no state, so they take their content as plain values — an array of parts is content like any other. No thunk is needed.

## Examples

### Caption and footer

```ts
import { TableCaption, TableFooter } from '@c9up/nebula'

Table({
  children: [
    TableCaption({ children: 'Invoices issued in March.' }),
    TableHeader({ children: TableRow({ children: [TableHead({ children: 'Invoice' }), TableHead({ class: 'text-right', children: 'Amount' })] }) }),
    TableBody({ children: invoices.map((invoice) => TableRow({ children: [TableCell({ children: invoice.id }), TableCell({ class: 'text-right', children: invoice.amount })] })) }),
    TableFooter({
      children: TableRow({
        children: [TableCell({ children: 'Total' }), TableCell({ class: 'text-right', children: total })],
      }),
    }),
  ],
})
```

The caption is drawn under the table, and it is the table's accessible name.

### Row headers and spans

```ts
TableRow({
  children: [
    TableHead({ scope: 'row', children: 'March' }),
    TableCell({ colspan: 2, children: 'No invoices' }),
  ],
})
```

### Rows that change

Content that changes is an accessor. The body is rebuilt whenever what it reads changes:

```ts
TableBody({
  children: () =>
    liveInvoices().map((invoice) =>
      TableRow({ children: [TableCell({ children: invoice.id }), TableCell({ children: invoice.status })] }),
    ),
})
```

### A selected row

`selected` draws the row in the muted colour through `data-state="selected"`:

```ts
import { signal } from '@c9up/aurora'

const picked = signal<string | undefined>(undefined)

TableBody({
  children: invoices.map((invoice) =>
    TableRow({
      selected: () => picked() === invoice.id,
      onClick: () => picked(invoice.id),
      children: [TableCell({ children: invoice.id }), TableCell({ children: invoice.status })],
    }),
  ),
})
```

A row is not focusable, so a click on it is a shortcut for the pointer — put the action the keyboard needs on a control inside the row as well.

### A sorted column

`sort` is written to `aria-sort`, which is how the sorted column is announced. Put the toggle on a button inside the header, which the keyboard can reach:

```ts
import { Button } from '@c9up/nebula'

const order = signal<'ascending' | 'descending'>('ascending')

TableHead({
  sort: order,
  children: Button({
    variant: 'ghost',
    size: 'sm',
    children: 'Amount',
    onClick: () => order(order() === 'ascending' ? 'descending' : 'ascending'),
  }),
})
```

## API

### Table

The `<table>`, inside a `<div data-slot="table-container">` that scrolls horizontally.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The caption, header, body and footer. |
| `class` | `Reactive<string>` | — | Merged into the `<table>`'s classes. |
| `id` | `string` | — | Accepted by `StyledProps`, not rendered. |

### TableHeader, TableBody, TableFooter, TableCaption

`<thead>`, `<tbody>`, `<tfoot>` and `<caption>`, with the same props as `Table` (`TableProps`): `children`, `class`, and an `id` that is not rendered.

### TableRow

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The row's cells. |
| `selected` | `Reactive<boolean>` | `false` | Sets `data-state="selected"`, which the row's styling keys off. |
| `onClick` | `(event: MouseEvent) => void` | — | Click handler on the `<tr>`. |
| `class` | `Reactive<string>` | — | Merged into the row's classes. |
| `id` | `string` | — | Accepted, not rendered. |

### TableHead

A `<th>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The heading. |
| `scope` | `'col' \| 'row'` | `'col'` | `row` for a row header. |
| `colspan` | `number` | — | The native `colspan`. |
| `rowspan` | `number` | — | The native `rowspan`. |
| `sort` | `Reactive<'ascending' \| 'descending' \| 'none' \| undefined>` | — | Written to `aria-sort`. Set it on the column currently sorted. |
| `onClick` | `(event: MouseEvent) => void` | — | Click handler on the `<th>`. |
| `class` | `Reactive<string>` | — | Merged into the cell's classes. |
| `id` | `string` | — | Accepted, not rendered. |

### TableCell

A `<td>`. It takes the same `TableCellProps` as `TableHead` but renders only `children`, `class`, `colspan` and `rowspan`; `scope`, `sort`, `onClick` and `id` have no effect on it.

## Accessibility

Native table semantics: `<th>` cells are column headers unless `scope: 'row'` says otherwise, a `TableCaption` names the table, and `sort` sets `aria-sort` on its header. The parts handle no keys — the keyboard reaches whatever controls are inside the cells.
