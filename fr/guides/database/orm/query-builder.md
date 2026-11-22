# Query builder

Ce guide couvre le query builder :

- Objectif
- Exemple principal
- API courante
- Sécurité
- Convention recommandée
- Query Builder

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

## Query Builder

Le `QueryBuilder` fournit une API fluide. Lorsque vous appelez `toSQL()`, le builder sérialise la requête en JSON et délègue la compilation SQL au crate Rust `ream-query` via NAPI. Les noms de tables, les identifiants de colonnes et les opérateurs sont validés et échappés dans la couche Rust — et non par manipulation de chaînes — ce qui rejette les identifiants malformés avant même qu'une chaîne SQL soit produite.

Les placeholders sont dialect-aware : `?` pour SQLite/MySQL, `$N` pour PostgreSQL. Le quoting d'identifiants suit la même règle (`"col"` pour SQLite/PostgreSQL, `` `col` `` pour MySQL).

```typescript
import { QueryBuilder } from '@c9up/atlas'

const { sql, params } = new QueryBuilder('orders')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .paginate(1, 20)
  .toSQL()

// Sur SQLite (défaut) :
// sql:    SELECT * FROM "orders" WHERE "status" = ? ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
// params: ['active']
//
// Sur PostgreSQL :
// sql:    SELECT * FROM "orders" WHERE "status" = $1 ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
```

### Référence complète de l'API

```typescript
const qb = new QueryBuilder('orders')

// Projection
qb.select('id', 'status', 'total')        // SELECT id, status, total
qb.distinct()                              // SELECT DISTINCT

// Filtrage
qb.where('status', 'active')              // WHERE status = $1
qb.where('total', '>', 100)               // WHERE total > $1
qb.orWhere('status', 'pending')           // OR status = $1
qb.whereIn('status', ['a', 'b', 'c'])    // WHERE status IN ($1, $2, $3)
qb.whereNull('deletedAt')                 // WHERE deletedAt IS NULL
qb.whereNotNull('createdAt')              // WHERE createdAt IS NOT NULL
qb.whereExists(subquery)                  // WHERE EXISTS (subquery)

// Regroupement et agrégation
qb.groupBy('status', 'userId')            // GROUP BY status, userId
qb.having('total', '>', 500)              // HAVING total > $1

// Tri et pagination
qb.orderBy('createdAt', 'desc')           // ORDER BY createdAt DESC
qb.limit(10)                              // LIMIT 10
qb.offset(20)                             // OFFSET 20
qb.paginate(2, 20)                        // LIMIT 20 OFFSET 20

// Relations
qb.preload('items')                       // Chargement anticipé d'une relation

// Opérations ensemblistes
qb.union(otherQuery)                      // UNION
qb.unionAll(otherQuery)                   // UNION ALL

// CTEs
qb.with('recent', subquery)               // WITH recent AS (...)

// Compilation
const { sql, params } = qb.toSQL()
```

### SQL brut

Pour les cas qui sortent du cadre du builder, utilisez le tag `RawSql` :

```typescript
import { RawSql, QueryBuilder } from '@c9up/atlas'

const { sql } = new QueryBuilder('orders')
  .where('status', 'active')
  .with('totals', RawSql.sql`SELECT user_id, SUM(total) AS sum FROM orders GROUP BY user_id`)
  .toSQL()
```

#### Mode strict

Le mode strict coupe l'injection de SQL brut pour tout le processus. Il est
désactivé par défaut. Une fois activé, ces appels lèvent une erreur au lieu de
s'exécuter :

- toutes les méthodes `*Raw` de la requête de modèle et du builder `db.from()` /
  `db.table()` (`whereRaw` et ses variantes `and`/`or`/`Not`, `joinRaw`,
  `havingRaw`, `orderByRaw`, `groupByRaw`) ;
- un fragment `db.raw()` passé à toute autre méthode du builder, ou écrit comme
  valeur de colonne par un repository (`E_STRICT_MODE`) ;
- le `raw()` du repository (`E_STRICT_MODE`).

Un identifiant `db.ref()` est validé, ce n'est pas du SQL brut : il passe
toujours. `db.rawQuery()` et les `query()` / `execute()` de la connexion, avec
des paramètres liés, restent disponibles comme issue de secours explicite.

```typescript
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)   // au démarrage
```

`ATLAS_STRICT=1` (ou `true`) dans l'environnement l'active aussi ; la variable est
lue une fois, à la première vérification. `setAtlasStrictMode(false)` le
désactive.

### Vider des clauses

Un builder passé à un helper qui a ajouté un filtre, un tri ou une tranche se
remet à zéro clause par clause au lieu d'être reconstruit — ce qu'il faut à un
scope partagé ou à une requête de base réutilisable.

```ts
query.clearSelect().clearWhere().clearOrder().clearHaving().clearLimit().clearOffset()
```

### HAVING EXISTS

Une sous-requête corrélée dans `HAVING` filtre des **groupes** par quelque chose
d'extérieur à l'agrégat — « les groupes qui ont encore une commande ouverte » —
qu'aucune combinaison de `having(count)` n'exprime.

```ts
db.from('users')
  .groupBy('role')
  .havingExists((sub) => sub.from('orders').whereRaw('orders.role = users.role'))
```

`andHavingExists`, `orHavingExists`, `havingNotExists`, `andHavingNotExists` et
`orHavingNotExists` complètent la famille. Une requête de modèle les a aussi ; sa
sous-requête est une autre requête de modèle, ou un callback qui en construit une
sur le même modèle.

### Pagination par curseur

```ts
const page = await Post.query().cursorPaginate({
  limit: 20,
  orderBy: 'id',
  direction: 'desc',       // un fil du plus récent — la raison même du curseur
  cursor: previousCursor,
})
```

`direction` pilote l'`ORDER BY` **et** l'opérateur de comparaison. `nextCursor`
vaut `null` sur la dernière page — c'est ainsi que le client cesse de demander.

### Transactions

`trx.isCompleted` dit si une transaction a déjà été validée ou annulée. Une
fonction qui en reçoit une ne peut pas le savoir autrement, et une requête sur
une transaction terminée échoue au niveau du driver avec un message qui ne parle
pas de transaction.

```ts
if (!trx.isCompleted) await trx.rollback()
```

Un savepoint suit son propre état : le relâcher ne marque pas sa transaction
parente comme terminée.
