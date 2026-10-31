# DataTable

A table with sorting, filtering, paging and row selection, built on the [Table](/en/nebula/components/table) parts. It covers the four features data tables are actually used for, and nothing else: no column grouping, pinning, virtualisation or faceted filters.

Everything happens on an in-memory array: sorting compares values, the filter scans rows, paging slices. That is the right answer up to a few thousand rows and the wrong one beyond, where the work belongs on the server — so rather than growing a half-server-side mode, the component stays client-side. A server-paged list is a [Table](/en/nebula/components/table) and a [Pagination](/en/nebula/components/pagination) composed by hand; see [scope](/en/nebula/scope).

`DataTable` is a generic function, `DataTable<Row>(props)`, so `cell`, `sortValue` and `filterMatch` receive your own row type rather than a record of unknowns.

```sh
ream nebula:add data-table
```

Organism · `organisms/DataTable.ts` · [Checkbox](/en/nebula/components/checkbox), [Input](/en/nebula/components/input), [Pagination](/en/nebula/components/pagination), [Table](/en/nebula/components/table)

## Usage

```ts
import { DataTable } from '@c9up/nebula'

interface Member {
  email: string
  name: string
  role: string
  joined: Date
}

DataTable<Member>({
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
  ],
  rows: members,
  rowKey: (member) => member.email,
})
```

A column without `cell` shows the row's property named by its `key`. Every column sorts unless it says otherwise: a click on its header sorts ascending, a second descending, and a click on another column starts that one ascending.

## Examples

### Columns

```ts
import { Badge, Button, type Column } from '@c9up/nebula'

const joined = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

const columns: readonly Column<Member>[] = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role', cell: (member) => Badge({ variant: 'secondary', children: member.role }) },
  {
    key: 'joined',
    header: 'Joined',
    cell: (member) => joined.format(member.joined),
    sortValue: (member) => member.joined.getTime(),
  },
  { key: 'actions', header: '', sortable: false, class: 'w-10', cell: (member) => Button({ variant: 'ghost', size: 'sm', children: 'Edit', onClick: () => edit(member) }) },
]
```

Sorting reads the row's property, not what `cell` renders. Numbers compare as numbers — 9 before 100 — and anything else as text, through `localeCompare`; a `Date` would sort by its string form, so `sortValue` hands over its timestamp. A column whose `key` is not a property at all (`actions`) is `sortable: false`. The sort works on a copy: your array is never reordered.

### Filter and pages

```ts
DataTable<Member>({
  columns,
  rows: members,
  rowKey: (member) => member.email,
  pageSize: 20,
  filterPlaceholder: 'Filter by name or email…',
  filterMatch: (member, query) =>
    member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query),
})
```

The filter box appears when `filterMatch` is given — it says what the box searches. The query reaches it trimmed and lowercased, and an empty query shows every row. Typing returns to the first page. `pageSize` adds the pager under the table; without it every row shows. When the filter leaves fewer pages than the one you were on, the table shows the last page rather than an empty one.

### Selecting rows

```ts
import { html, signal } from '@c9up/aurora'

const chosen = signal<readonly string[]>([])

html`
  ${DataTable<Member>({
    columns,
    rows: members,
    rowKey: (member) => member.email,
    pageSize: 20,
    selectable: true,
    onSelectionChange: chosen,
  })}
  ${Button({
    variant: 'destructive',
    disabled: () => chosen().length === 0,
    children: () => `Remove ${chosen().length}`,
    onClick: () => remove(chosen()),
  })}
`
```

`selectable` adds a checkbox column. The selection is a list of `rowKey`s, kept across pages, sorting and the filter. The header checkbox acts on the **visible page only** — selecting rows the user cannot see, and may have filtered away on purpose, is how a bulk action deletes more than was meant. It shows the mixed state when part of the page is selected. The table holds the selection itself and reports it through `onSelectionChange`; a key stays selected when its row leaves `rows`.

### Rows that change

```ts
const rows = signal<readonly Member[]>([])

setInterval(async () => rows(await fetchMembers()), 10_000)

DataTable<Member>({
  columns,
  rows,
  rowKey: (member) => member.email,
  pageSize: 20,
  autoResetPage: false,
  emptyMessage: 'No members yet.',
})
```

`rows` takes an accessor. New rows keep the sort and the filter; by default they also send the table back to the first page, since the page was chosen in data that is gone. `autoResetPage: false` keeps the page for rows refreshed in place, like this polled list. An accessor must return the same array until the data changes — a fresh array on every read counts as new data every time.

Rows are kept by `rowKey`, through aurora's [`each`](/en/modules/aurora#lists-—-each). A row whose key is still there keeps its element, along with an open menu, the focus or the hover inside it, and moves when the sort or the page changes its place. Its cells are redrawn when its element is a different object; a re-read that returns the same objects redraws nothing.

### In another language

```ts
DataTable<Member>({
  columns,
  rows: members,
  rowKey: (member) => member.email,
  pageSize: 20,
  selectable: true,
  filterPlaceholder: 'Filtrer…',
  filterMatch: (member, query) => member.name.toLowerCase().includes(query),
  selectAllLabel: 'Tout sélectionner sur cette page',
  selectRowLabel: (member) => `Sélectionner ${member.name}`,
  emptyMessage: 'Aucun résultat.',
  paginationLabels: {
    navigation: 'pagination',
    previous: 'Précédent',
    previousPage: 'Page précédente',
    next: 'Suivant',
    nextPage: 'Page suivante',
    morePages: 'Autres pages',
  },
})
```

A key left out of `paginationLabels` keeps its English default.

## API

### DataTable

`DataTable<Row>(props: DataTableProps<Row>): TemplateResult`

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `readonly Column<Row>[]` | — | The columns, in order. Read once, at setup. |
| `rows` | `Reactive<readonly Row[]>` | — | The rows, or an accessor for rows that change. |
| `rowKey` | `(row: Row) => string` | — | A stable identity per row — what the selection holds, and what keeps a row's element across changes. |
| `pageSize` | `number` | — | Rows per page. Omit to show every row and no pager. |
| `autoResetPage` | `boolean` | `true` | Return to the first page when `rows` changes. |
| `filterPlaceholder` | `string` | `'Filter…'` | The filter box's placeholder. |
| `filterLabel` | `string` | `filterPlaceholder`, else `'Filter…'` | The filter box's accessible name. |
| `filterMatch` | `(row: Row, query: string) => boolean` | — | Shows the filter box; says whether a row matches the trimmed, lowercased query. |
| `selectable` | `boolean` | `false` | Adds the checkbox column. |
| `selectAllLabel` | `string` | `'Select all rows on this page'` | The header checkbox's accessible name. |
| `selectRowLabel` | `(row: Row) => string` | `` `Select row ${key}` `` | A row checkbox's accessible name. |
| `paginationLabels` | `Partial<PaginationLabels>` | the [Pagination](/en/nebula/components/pagination#paginationlabels) defaults | The pager's words. |
| `onSelectionChange` | `(keys: readonly string[]) => void` | — | The selected keys, after every change. |
| `emptyMessage` | `Child` | `'No results.'` | Shown across the table when no row is left. |
| `class` | `string` | — | Merged into the root's classes. |

### Column

| Field | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | — | Identifies the column; also the property read when there is no `cell` or `sortValue`. |
| `header` | `Child` | — | The header's content. |
| `cell` | `(row: Row) => Child` | the property named by `key` | Renders the cell. Strings, numbers and booleans show as they are, `null` and `undefined` as an empty cell, anything else through `String()`. |
| `sortable` | `boolean` | sortable unless `false` | `false` takes the column out of sorting. |
| `sortValue` | `(row: Row) => string \| number` | the property named by `key` | What to compare when sorting. |
| `class` | `string` | — | Classes for the column's header and cells. |

## Accessibility

A sortable header carries `aria-sort` — `none`, `ascending` or `descending`: the chevron says which column is sorted to anyone who can see it, the attribute says it to everyone else. A column with `sortable: false` has none. The checkboxes are named by `selectAllLabel` and `selectRowLabel`, a selected row is marked `data-state="selected"`, and the filter is an `<input type="search">` named by `filterLabel`.

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Reaches the filter box and the checkboxes. |
| <kbd>Space</kbd> | Toggles the focused checkbox. |

Sorting and the pager answer the pointer: the header cells are not focusable, and the pager's links carry no `href`, which leaves them out of the tab order. A table that must be fully operable from the keyboard is composed from [Table](/en/nebula/components/table) and [Pagination](/en/nebula/components/pagination), with a button in each sortable header and an `href` on each page link.

The filter placeholder and name, the checkbox names, the empty message and the pager's words are built-in English; the props above replace them — see [languages](/en/nebula/languages).
