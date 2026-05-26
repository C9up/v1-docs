# Atlas - Performance

## High-impact levers

1. Keep result sets small (`limit`, pagination, cursor pagination).
2. Select only needed columns.
3. Avoid unnecessary preloads and deep preload trees.
4. Ensure indexes match filter + order-by columns.
5. Use atomic batch operations (`createMany`, `saveMany`, bulk `update/delete`) when suitable.

## Query shape example

```ts
const page = await repo.query()
  .select(['id', 'email', 'status'])
  .where('status', 'active')
  .orderBy('id', 'asc')
  .cursorPaginate({ perPage: 100, orderBy: ['id'] })
```

## Repository and connection lifecycle

- Reuse provider-managed DB connections.
- Use transaction-scoped repositories (`useTransaction`) for grouped writes.
- Avoid opening ad-hoc connections per request.

## Observability

- Track p50/p95 query duration.
- Track rows returned per endpoint.
- Alert on unbounded queries and missing pagination.
- Benchmark hydration-heavy endpoints with realistic datasets.
