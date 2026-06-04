# Atlas - Reference API

Cette page documente l'API réellement exposée aujourd'hui par `@c9up/atlas`.

## Exports principaux

- `BaseEntity`
- `BaseRepository`
- `ModelQuery`
- `QueryBuilder`, `RawSql`
- `Schema`, `TableBuilder`
- `Migration`, `MigrationRunner`
- `transaction`, `createNapiConnection`
- décorateurs: `Entity`, `Column`, `column`, `PrimaryKey`, `computed`, relations, hooks, `scope`, `SoftDeletes`
- helpers de mode strict: `setAtlasStrictMode`, `isAtlasStrictMode`

## BaseRepository

### Constructeur

```ts
new BaseRepository(EntityClass, db, options?)
```

### Points d'entrée lecture

- `query()`
- `find(id)` / `findOrFail(id)`
- `findBy(column, value)`
- `all()` / `allWithTrashed()` / `onlyTrashed()`
- `where(column, value)`

### Ecritures

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

### Compteurs

- `increment(id, column, amount?)`
- `increment(id, { colA: 1, colB: 2 })`
- `decrement(id, column, amount?)`
- `decrement(id, { colA: 1, colB: 2 })`

### Relations et hydratation

- `loadRelation(entity, relationName, callback?)`
- `relatedProxy(entity, relationName)`
- `loadCount(entity, relationName, alias?)`
- `loadAggregate(entity, relationName, builder)`
- `refresh(entity)`
- `fresh(entity)`

### Transactions et bas niveau

- `useTransaction(trx)`
- `raw(sql, ...params)`
- `getTableName()`
- `getPrimaryKeyColumn()`

## ModelQuery

### Filtres

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

### Agrégats / extras

- `withCount(relation, callback?)`
- `withAggregate(relation, callback)`
- `count`, `sum`, `avg`, `min`, `max`
- `countDistinct`, `distinct`, `exists`, `doesntExist`, `pluck`
- `as(alias)`

### Joins / scopes / locks

- `innerJoin`, `leftJoin`, `rightJoin`, `crossJoin`
- `joinOn(table, left, right)`
- `joinRaw(fragment)`
- `apply(callback)` / `withScopes(callback)`
- `forUpdate()` / `forShare()`

### Pagination et exécution

- `orderBy`, `limit`, `offset`, `forPage`
- `paginate(page, perPage)`
- `cursorPaginate({ perPage, cursor, orderBy })`
- `first()`, `firstOrFail()`, `exec()`
- `toSQL()`, `toQuery()`, `debug(flag)`, `clone()`

### Mutations via requête

- `update(patch, returning?)`
- `delete(returning?)`
- `increment(column, amount)` / `increment({ ... })`
- `decrement(column, amount)` / `decrement({ ... })`

## API Migrations

### MigrationRunner

- `init()`
- `status()`
- `migrate()`
- `rollback()`
- `refresh()`
- `fresh()`
- `reset()`
- `dryRun()`

`DatabaseAdapter` peut fournir `runInTransaction(batch)` pour des migrations atomiques.

## Mode strict

```ts
setAtlasStrictMode(true)
```

Quand activé, les entrées non sûres (`whereRaw`, `joinRaw`) lèvent une erreur côté code applicatif.

## Exemple minimal

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
