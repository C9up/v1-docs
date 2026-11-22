# Pagination and reads

This guide covers paginating and reading rows:

- Cursor pagination
- The paginator result
- Plain-object reads with `pojo()`
- Sideloaded context

## Cursor pagination

```ts
const page = await repo.query()
  .orderBy('id', 'asc')
  .cursorPaginate({
    limit: 20,
    orderBy: ['id'],
  })
```

Recommendations:

- Always provide deterministic ordering columns.
- Keep ordering columns immutable when possible.
- Treat malformed cursor errors as `400` at HTTP layer.

## The paginator result

`repo.query().paginate(page, perPage)` resolves to a `Paginator<T>` — the items plus
pagination metadata and page-URL helpers.

```ts
const page = await repo.query().orderBy('id').paginate(2, 20)

page.all()            // T[] — the rows on this page
page.total            // total rows across all pages
page.perPage          // 20
page.currentPage      // 2
page.lastPage         // ceil(total / perPage)
page.firstPage        // 1
page.hasPages         // more than one page?
page.hasMorePages     // is there a page after this one?

// Page URLs — set a base + carried query string first.
page.baseUrl('/users').queryString({ sort: 'name' })
page.getUrl(3)                 // '/users?sort=name&page=3'
page.getNextPageUrl()          // next page URL, or null on the last page
page.getPreviousPageUrl()      // previous page URL, or null on the first page
page.getUrlsForRange(1, 5)     // [{ page, url, isActive }, …], clamped to [1, lastPage]

// Serialize for an API response (snake_case meta via the naming strategy).
page.serialize({ fields: ['id', 'name'] })
page.toJSON()                  // { data, meta }
```

`serialize` takes the same options as a model's `serialize` (`fields` and
`relations`) and runs each row through its model's serializer, so hidden and
renamed columns behave as they do on a single model.

`getUrl` returns `''` until a `baseUrl` is set. `serialize` / `toJSON` emit
`{ data, meta }`; the `meta` keys are remapped through the naming strategy's
`paginationMetaKeys` (snake_case by default) and include the page URLs once a
`baseUrl` is present.

## Plain-object reads with `pojo()`

Skip model hydration entirely — no `BaseEntity` instances, no dirty-tracking, no
`@column({ consume })`, no preloads. Returns the raw snake_case DB rows. A fast
read path for reports and exports:

```ts
const rows = await User.query().where('active', true).pojo()
// rows: Array<{ id: number; full_name: string; ... }>
```

`pojo()` is chainable into `first()`:

```ts
const row = await User.query().where('email', email).pojo().first()
// row: { id: number; full_name: string; ... } | null
```

::: tip `pojo()` ends the chain
`ModelQuery<T>` is constrained to `T extends BaseEntity` and cannot be
re-parametrised to a plain record, so `pojo()` returns a terminal view: it is
awaitable for the rows and chainable into `first()`. Put it last in the chain.
:::

For a single column, `pluck()` skips hydration the same way and returns the
values rather than the rows:

```ts
const emails = await User.query().where('active', true).pluck<string>('email')
// ['ada@acme.test', 'grace@acme.test']
```

`V` is your claim about the column, not something atlas verifies: `pluck()`
only checks that every value is a scalar or `null`, and throws on an object
value (an object or relation column). Narrow the values yourself when the column
type is not certain.

A partial `select()` of plain columns **auto-includes the primary key**, so the
hydrated entity is still saveable (a later `save()` UPDATEs rather than INSERTs). For
aggregate/alias projections (`select('COUNT(*) as n')`) the PK can't be inferred —
use `pojo()`. Operations premised on an existing row (`delete()`, `forceDelete()`,
`restore()`, `refresh()`, `fresh()`, `load*()`) require a **persisted** entity:
they throw `E_MODEL_NOT_PERSISTED` on a local instance (even with a hand-set PK —
it isn't a row) and `E_MISSING_PRIMARY_KEY` on a persisted projection with no PK.
`save()` also throws `E_MISSING_PRIMARY_KEY` on such a projection. `related().create/save`
**persists the parent first** inside a managed transaction,
sets the child FK, then writes the child — atomic, rolled back on failure; a parent
from a projection with no PK is rejected (`E_MISSING_PRIMARY_KEY`).

## Sideloaded context

Thread arbitrary context onto every instance a query hydrates — e.g. the current tenant/user, readable from hooks or computed
properties via `entity.$sideloaded`:

```ts
const posts = await Post.query().sideload({ tenantId }).exec()
posts[0].$sideloaded // { tenantId }
```
