# Atlas - API Reference

This page documents the concrete API exposed today by `@c9up/atlas`.

## Main exports

- `BaseEntity`
- `BaseRepository`
- `ModelQuery`
- `QueryBuilder`, `RawSql`
- `Schema`, `TableBuilder`
- `Migration`, `MigrationRunner`
- `transaction`, `createNapiConnection`
- decorators: `Entity`, `Column`, `column`, `PrimaryKey`, `computed`, relations, hooks, `scope`, `SoftDeletes`
- strict mode helpers: `setAtlasStrictMode`, `isAtlasStrictMode`

## BaseRepository

### Constructor

```ts
new BaseRepository(EntityClass, db, options?)
```

### Query entrypoints

- `query()`
- `find(id)` / `findOrFail(id)`
- `findBy(column, value)`
- `all()` / `allWithTrashed()` / `onlyTrashed()`
- `where(column, value)`

### Writes

- `create(data)`
- `createMany(rows)`
- `save(entity)`
- `saveMany(entities)`
- `upsert(data, uniqueBy)`
- `firstOrCreate(where, create?)`
- `firstOrNew(where, create?)`
- `updateOrCreate(where, data)`
- `updateById(id, data)`
- `updateWhere(column, value, data)`
- `delete(entity)` / `forceDelete(entity)` / `restore(entity)`

### Counters

- `increment(id, column, amount?)`
- `increment(id, { colA: 1, colB: 2 })`
- `decrement(id, column, amount?)`
- `decrement(id, { colA: 1, colB: 2 })`

### Relations and hydration helpers

- `loadRelation(entity, relationName, callback?)`
- `relatedProxy(entity, relationName)`
- `loadCount(entity, relationName, alias?)`
- `loadAggregate(entity, relationName, builder)`
- `refresh(entity)`
- `fresh(entity)`

### Transactions and low-level

- `useTransaction(trx)`
- `raw(sql, ...params)`
- `getTableName()`
- `getPrimaryKeyColumn()`

## ModelQuery

### Filtering

- `where(...)`, `orWhere(...)`
- `whereNull`, `whereNotNull`, `whereNot`
- `whereIn`, `whereNotIn`
- `whereBetween`, `whereNotBetween`
- `whereLike`, `whereILike`
- `whereRaw(sql, bindings)`
- `whereExpr(column, operator, value)`
- `whereExpr(column, extraExpression, operator, value)`

### Relations

- `preload(relation, callback?)`
- `whereHas`, `orWhereHas`
- `whereDoesntHave`, `orWhereDoesntHave`
- `has`, `orHas`, `doesntHave`

### Aggregates / extras

- `withCount(relation, callback?)`
- `withAggregate(relation, callback)`
- `count`, `sum`, `avg`, `min`, `max`
- `countDistinct`, `distinct`, `exists`, `doesntExist`, `pluck`
- `as(alias)`

### Joins / scope / locking

- `innerJoin`, `leftJoin`, `rightJoin`, `crossJoin`
- `joinOn(table, left, right)`
- `joinRaw(fragment)`
- `apply(callback)` / `withScopes(callback)`
- `forUpdate()` / `forShare()`

### Pagination and execution

- `orderBy`, `limit`, `offset`, `forPage`
- `paginate(page, perPage)`
- `cursorPaginate({ perPage, cursor, orderBy })`
- `first()`, `firstOrFail()`, `exec()`
- `toSQL()`, `toQuery()`, `debug(flag)`, `clone()`

### Bulk mutation from query

- `update(patch, returning?)`
- `delete(returning?)`
- `increment(column, amount)` / `increment({ ... })`
- `decrement(column, amount)` / `decrement({ ... })`

## Migrations API

### MigrationRunner

- `init()`
- `status()`
- `migrate()`
- `rollback()`
- `refresh()`
- `fresh()`
- `reset()`
- `dryRun()`

`DatabaseAdapter` can provide `runInTransaction(batch)` for atomic migrations.

## Strict mode

```ts
setAtlasStrictMode(true)
```

When enabled, unsafe entrypoints (`whereRaw`, `joinRaw`) throw in user code and force structured query paths.

## Minimal example

```ts
const users = new BaseRepository(User, db)

const page = await users
  .query()
  .where('status', 'active')
  .whereExpr('total', '>=', 100)
  .withCount('posts', (q) => q.as('postsCount'))
  .orderBy('id', 'desc')
  .cursorPaginate({ perPage: 20, orderBy: ['id'] })
```
