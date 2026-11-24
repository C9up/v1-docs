# Requêtes avancées

Ce guide couvre les fonctions avancées de ModelQuery :

- Préférer `whereExpr` à `whereRaw`
- Mode strict pour durcir
- Filtrage relationnel
- Joins
- Jointures externes et contraintes `ON`
- Prédicats JSON
- Filtres pivot (`@ManyToMany`)
- GROUP BY / HAVING
- Opérations d'ensemble
- Common Table Expressions (CTE)
- Autres helpers de requête

Cette page couvre les patterns de requêtes orientés production.

## Préférer `whereExpr` à `whereRaw`

```ts
const q = repo.query()
  .whereExpr('total', '>=', 100)
  .whereExpr('total', '+ tax', '>=', 100)
```

L'`extraExpression` optionnelle (2e argument de la forme à 4 arguments) est une
suite **arithmétique**, ajoutée après la colonne entre guillemets. C'est une ou
plusieurs paires `opérateur opérande` :

- les opérateurs sont `+ - * /` ;
- un opérande est un nombre, une colonne, un opérande entre parenthèses, ou un
  appel à `abs`, `ceil`, `floor`, `round`, `coalesce`, `nullif`, `length`,
  `lower`, `upper`, `trim`, `replace`, `substring` ou `now`.

Le compilateur découpe tout le fragment en jetons et refuse ce qu'il ne sait
pas placer. Sont donc refusés :

- tout autre appel (`pg_sleep()`, `version()`, `current_setting()`, une
  fonction définie par l'utilisateur), quelle que soit son écriture ;
- un commentaire (`--`, `/*`, `*/`) : `pg_sleep/**/(2)` est un appel pour le
  serveur ;
- une apostrophe, un littéral de chaîne, un nom qualifié (`orders.tax`), tout
  autre opérateur ;
- un mot-clé SQL (`OR`, `AND`, `IS`, `NOT`, `SELECT`, …) et les mots qu'un
  serveur évalue sans parenthèses (`current_user`, `session_user`,
  `current_date`, …) ;
- un fragment qui ne commence pas par un opérateur, comme `(tax)`.

La valeur comparée est toujours liée. La forme à 4 arguments reste disponible
en mode strict : c'est pourquoi elle repose sur une liste d'autorisation.
Utilisez `whereRaw` (avec bindings) pour tout le reste.

Garder `whereRaw` seulement pour des fragments SQL réellement spécifiques au dialecte, toujours avec bindings.

## Mode strict pour durcir

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)
```

En mode strict, `whereRaw()`, `joinRaw()`, `havingRaw()` **et** le `raw()` du
repository lèvent une erreur — ils durcissent toutes les surfaces SQL brut de la
couche typée. Un fragment `db.raw()` passé à `select()`, `orderBy()`, `update()`,
comme valeur de `where()` ou comme valeur qu'un modèle écrit (`create()`,
`createMany()`, `save()`) est refusé de la même façon ; `db.ref()`, une
référence de colonne validée et échappée, reste permis. Le break-glass reste `db.query()` / `db.execute()` au niveau de la
connexion (toujours paramétré) : un chemin explicite et greppable, jamais un
contournement silencieux du mode strict.

## Filtrage relationnel

```ts
const users = repo.query()
  .whereHas('posts', (q) => q.where('published', true))
  .orWhereDoesntHave('posts')
  .exec()
```

Aussi disponible:

- `has('posts')`
- `has('posts', '>=', 3)`
- `orHas(...)`
- `doesntHave('posts')`

## Joins

```ts
const rows = repo.query()
  .leftJoin('profiles', (j) => j.on('users.id', 'profiles.user_id').andOnVal('profiles.is_public', true))
  .select(['users.id', 'profiles.avatar'])
  .exec()
```

Dans le callback : `on` / `andOn` / `orOn` joignent deux **colonnes** ; `onVal` /
`andOnVal` / `orOnVal` joignent une colonne à une **valeur bindée** — la valeur est paramétrée (jamais inline) et threadée dans le
compilateur avant les params du `WHERE`. `joinRaw(fragment, bindings?)` accepte ses
propres bindings `?`. Utiliser `joinOn(table, left, right)` pour les cas simples join-on-column.

Avec un join et le `SELECT *` **par défaut**, la projection est restreinte aux
colonnes du modèle (`<table>.col…`) pour qu'une table jointe ne puisse pas écraser
les champs du modèle à l'hydratation — passer un `select()` explicite pour l'élargir.
Les identifiants de join doivent être un strict `[table.]column` (lettres/chiffres/
underscore) ; sinon une erreur est levée (utiliser `joinRaw` pour les expressions).

## Jointures externes et contraintes `ON`

Au-delà de `innerJoin` / `leftJoin` / `rightJoin`, Atlas expose les orthographes
externes et `fullOuterJoin` :

```ts
repo.query().leftOuterJoin('profiles', 'users.id', 'profiles.user_id')
repo.query().rightOuterJoin('teams', 'users.team_id', 'teams.id')
repo.query().fullOuterJoin('audits', 'users.id', 'audits.user_id') // Postgres
```

`leftOuterJoin` / `rightOuterJoin` sont des alias de `leftJoin` / `rightJoin`.
`fullOuterJoin` est réservé à Postgres — MySQL et SQLite n'ont pas de
`FULL OUTER JOIN`.

Le builder `ON` en callback porte l'ensemble complet des contraintes à
côté de `on` / `andOn` / `orOn` et `onVal` / `andOnVal` / `orOnVal` :

```ts
repo.query().leftJoin('orders', (j) =>
  j.on('users.id', 'orders.user_id')
   .onIn('orders.status', ['paid', 'shipped'])
   .onNotNull('orders.confirmed_at')
   .onBetween('orders.total', [10, 1000])
   .onExists((s) => s.select('1').from('refunds').whereColumn('refunds.order_id', '=', 'orders.id')))
```

Chaque valeur `on*` est paramétrée : `onIn` / `onNotIn` (liste `IN` bindée),
`onNull` / `onNotNull`, `onBetween` / `onNotBetween` (inclusif), et `onExists` /
`onNotExists` (un builder ou un callback). Les identifiants sont quotés selon le
dialecte ; l'opérateur est allowlisté.

## Prédicats JSON

Filtrer sur une colonne JSON/JSONB par chemin ou par inclusion. Chaque valeur — le
chemin **et** la valeur comparée — traverse la frontière comme un paramètre bindé ;
seule la colonne est un identifiant quoté.

```ts
// Comparer une valeur à un JSONPath ($.a.b, $.items[0]) ; l'opérateur vaut `=` par défaut.
repo.query().whereJsonPath('data', '$.address.city', 'Paris')
repo.query().whereJsonPath('data', '$.total', '>', 1000)

// Égalité structurelle — le JSON de la colonne doit correspondre à `value`.
repo.query().whereJson('prefs', { theme: 'dark', compact: true })

// Inclusion (Postgres/MySQL) : `@>` superset / `<@` subset.
repo.query().whereJsonSupersetOf('tags', ['urgent'])
repo.query().whereJsonSubsetOf('scopes', ['read', 'write', 'admin'])
```

Chacun expose la famille complète `and*` / `or*` / `whereNot*` : `andWhereJsonPath`,
`orWhereJsonPath` ; `whereJson` / `andWhereJson` / `orWhereJson` / `whereNotJson` /
`andWhereNotJson` / `orWhereNotJson` ; et pour l'inclusion à la fois l'orthographe
`*Of` et l'orthographe nue — `whereJsonSuperset` / `whereJsonSubset` et
leurs variantes `and*` / `or*` / `whereNot*` / `orWhereNot*`.

> L'inclusion est réservée à Postgres/MySQL — SQLite n'a pas d'opérateur d'inclusion
> JSON, donc le compilateur lève `E_UNSUPPORTED` là plutôt que d'émettre du SQL
> cassé. Un JSONPath doit commencer à la racine du document (`$`).

## Filtres pivot (`@ManyToMany`)

Dans un callback `preload` m2m, filtrer les relations chargées par une colonne de la
table **pivot** (pas la table liée). Ces contraintes sont enregistrées séparément et
appliquées au lookup pivot par le résolveur m2m — inertes sur les relations non-m2m.

```ts
userRepo.query()
  .preload('roles', (q) =>
    q.wherePivot('active', true)
     .whereInPivot('scope', ['admin', 'owner'])
     .pivotColumns(['notes']),
  )
```

La famille complète :

- `wherePivot(col, [op,] value)` + `andWherePivot` / `orWherePivot`
- `whereInPivot(col, values)` / `whereNotInPivot(col, values)` + `and*` / `or*`
  (plus l'ancien alias `wherePivotIn`)
- `whereNotPivot(col, [op,] value)` — négation de la comparaison — + `and*` / `or*`
- `whereNullPivot(col)` / `whereNotNullPivot(col)` + `and*` / `or*`

Les colonnes pivot supplémentaires demandées avec `pivotColumns([...])` se lisent sur
chaque relation chargée via `$extras.pivot_<col>`. Un filtre pivot `or*` est compilé
dans un groupe parenthésé, donc il ne peut jamais échapper au cadrage
`pivot_fk IN (parents)` qui garde le preload correct.

## GROUP BY / HAVING

```ts
const rows = await repo.query()
  .select({ status: 'status', n: 'COUNT(*)' })
  .groupBy('status')
  .having('COUNT(*)', '>', 5)
  .havingBetween('COUNT(*)', [5, 100])
  .orderByRaw('COUNT(*) DESC')
  .pojo()
```

- `having(col, op, value)` / `orHaving(col, op, value)`
- `having((q) => …)` / `orHaving((q) => …)` : les clauses du callback, entre
  parenthèses comme un seul groupe (`HAVING (count(*) > ? OR sum(total) < ?)`)
- `having(db.raw(sql, bindings))` / `orHaving(db.raw(…))`
- `havingIn(col, values)` / `havingNotIn(col, values)`
- `havingBetween(col, [lo, hi])` / `havingNotBetween(col, [lo, hi])`
- `havingNull(col)` / `havingNotNull(col)`
- `havingExists(sub)` / `havingNotExists(sub)` : `sub` est une autre requête de
  modèle ou un callback qui en construit une sur ce modèle
- `havingRaw(sql, bindings?)`, `groupByRaw(sql, bindings?)`, `orderByRaw(sql, bindings?)`
- `groupBy(...columns)` : des noms de colonnes seulement. Sur `db.from()`, un
  fragment `db.raw()` est accepté aussi ; toute autre valeur (un objet venu du
  corps d'une requête) est refusée avec `E_UNSAFE_IDENTIFIER`

Chaque méthode `having*` a une forme `or*` (`orHavingIn`, `orHavingNull`,
`orHavingBetween`, `orHavingExists`, `orHavingRaw`, …) et un alias `and*`
(`andHaving`, `andHavingIn`, …), sur la requête de modèle comme sur `db.from()`.

Une colonne `having` nue est résolue via le mapping de colonnes de l'entité (en
respectant `@Column({ columnName })`) ; une expression d'agrégat ou un alias
`withCount` / `withAggregate` est laissé verbatim pour que `having` puisse le
référencer. `havingRaw`, `groupByRaw` et `orderByRaw` sont des surfaces SQL brut —
elles lèvent une erreur sous `setAtlasStrictMode(true)` / `ATLAS_STRICT`, exactement
comme `whereRaw` ; de même pour `orHavingRaw`, `andHavingRaw` et
`having(db.raw(…))`.

## Opérations d'ensemble

Combiner la requête avec une autre requête entière — un `ModelQuery` sur le même
modèle, ou un callback qui en construit un.

```ts
const ids = await repo.query().select('id').where('region', 'eu')
  .union((q) => q.select('id').where('vip', true))
  .exec()

repo.query().intersect((q) => q.where('active', true))
repo.query().except((q) => q.where('banned', true))
```

Disponibles : `union` / `unionAll`, `intersect` / `intersectAll`, `except` /
`exceptAll`. Les bindings de l'autre requête sont réindexés dans la liste de
paramètres externe.

> `intersectAll` / `exceptAll` sont réservés à Postgres/MySQL — la grammaire composée
> de SQLite n'a pas d'`INTERSECT ALL` / `EXCEPT ALL`, donc le compilateur lève
> `E_UNSUPPORTED` là plutôt qu'une erreur de syntaxe.

## Common Table Expressions (CTE)

```ts
// Parcours récursif d'un arbre par adjacence.
const tree = await repo.query()
  .withRecursive('subtree', (q) =>
    q.select('id', 'parent_id').where('id', rootId)
     .unionAll((r) => r.select('c.id', 'c.parent_id')
       .from('categories as c')
       .innerJoin('subtree', 's.id', 'c.parent_id')),
    ['id', 'parent_id'],
  )
  .exec()
```

- `with(name, query)` — un simple `WITH name AS (…)`
- `withRecursive(name, query, columns?)` — une CTE auto-référençante (le terme
  récursif est un `union` / `unionAll` à l'intérieur de `query`) ; une seule entrée
  récursive rend toute la clause `WITH` récursive
- `withMaterialized(name, query)` / `withNotMaterialized(name, query)` — le hint du
  planificateur Postgres 12+ / SQLite 3.35+ (MySQL lève `E_UNSUPPORTED`)

Le nom de la CTE est validé comme identifiant ; les bindings de la sous-requête sont
réindexés dans la liste externe.

## Autres helpers de requête

```ts
// Exactement une ligne, sinon erreur — un second match est un bug que first() cacherait.
const user = await repo.query().where('email', email).sole()

// Top-N par parent dans un preload has-many (fenêtré, pas un LIMIT global).
authorRepo.query().preload('posts', (q) =>
  q.groupLimit(3).groupOrderBy('created_at', 'desc'))

// DISTINCT ON Postgres — première ligne par ensemble distinct.
repo.query().distinctOn('user_id').orderBy('user_id').orderBy('created_at', 'desc')

// Agrégats distincts.
const uniqueTotal = await repo.query().sumDistinct('amount')
const uniqueAvg = await repo.query().avgDistinct('score')

// Clauses conditionnelles selon le dialecte.
repo.query()
  .ifDialect('postgres', (q) => q.distinctOn('user_id'))
  .unlessDialect('sqlite', (q) => q.forUpdate())

// Premier [guard, callback] correspondant ; un callback nu final est le défaut.
repo.query().match(
  [sort === 'new', (q) => q.orderBy('created_at', 'desc')],
  [sort === 'top', (q) => q.orderBy('score', 'desc')],
  (q) => q.orderBy('id'),
)

// Un commentaire SQL en tête de l'instruction compilée (pour pg_stat_statements, etc.).
repo.query().comment('dashboard:active-users').exec()
```

`groupLimit` compile en une fenêtre `ROW_NUMBER() OVER (PARTITION BY <fk> …)` et n'a
de sens que dans un callback de preload has-many ; un simple `.limit()` plafonne tout
le jeu de résultats à travers les parents. `distinctOn` est réservé à Postgres (le
compilateur le refuse ailleurs plutôt que de renvoyer un résultat silencieusement
différent). `comment()` rejette un terminateur `*/` pour qu'un commentaire ne puisse
jamais s'échapper du wrapper `/* … */`.

> Les helpers conditionnels simples `if(condition, cb, elseCb?)` / `unless(...)`
> vivent sur le builder de niveau connexion `db.query()` ; sur une requête de modèle,
> utiliser `match` ou les `ifDialect` / `unlessDialect` scopés au dialecte.
