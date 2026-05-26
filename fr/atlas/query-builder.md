# Atlas - Query Builder

## Objectif

Construire des requêtes lisibles et sûres sans concaténer du SQL.

## Exemple principal

```ts
import { QueryBuilder } from '@c9up/atlas'

const { sql, params } = new QueryBuilder('orders')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .paginate(1, 20)
  .toSQL()
```

## API courante

```ts
qb.select('id', 'status')
qb.where('total', '>', 100)
qb.orWhere('status', 'pending')
qb.whereIn('status', ['active', 'pending'])
qb.whereNull('deletedAt')
qb.orderBy('createdAt', 'desc')
qb.limit(20)
qb.offset(40)
qb.paginate(3, 20)
```

## Sécurité

- Les identifiants (table/colonne) sont validés.
- Les valeurs passent par paramètres (`params`) et non interpolation brute.
- Les placeholders sont adaptés au dialecte (`?` ou `$N`).

## Convention recommandée

- Pour le code applicatif: privilégier `ModelQuery` via `repo.query()`.
- Réserver `QueryBuilder` aux cas transverses ou requêtes avancées.
