# Atlas - ModelQuery avancé

Cette page couvre les patterns de requêtes orientés production.

## Préférer `whereExpr` à `whereRaw`

```ts
const q = repo.query()
  .whereExpr('total', '>=', 100)
  .whereExpr('total', '+ tax', '>=', 100)
```

L'`extraExpression` optionnelle (2e arg de la forme à 4 args) est un fragment
**arithmétique** uniquement — colonnes, nombres, `+ - * / ,`, parenthèses et
fonctions. Les mots-clés SQL bruts (`OR`, `AND`, `IS`, `NOT`, `SELECT`, …) sont
rejetés pour que le fragment ne puisse pas altérer la logique du prédicat ; la
valeur comparée est toujours bindée. Utiliser `whereRaw` (avec bindings) pour
tout ce qui dépasse l'arithmétique.

Garder `whereRaw` seulement pour des fragments SQL réellement spécifiques au dialecte, toujours avec bindings.

## Mode strict pour durcir

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)
```

En mode strict, `whereRaw()`, `joinRaw()`, `havingRaw()` **et** le `raw()` du
repository lèvent une erreur — ils durcissent toutes les surfaces SQL brut de la
couche typée. Le break-glass reste `db.query()` / `db.execute()` au niveau de la
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
`andOnVal` / `orOnVal` joignent une colonne à une **valeur bindée** (parité
AdonisJS/Knex) — la valeur est paramétrée (jamais inline) et threadée dans le
compilateur avant les params du `WHERE`. `joinRaw(fragment, bindings?)` accepte ses
propres bindings `?`. Utiliser `joinOn(table, left, right)` pour les cas simples join-on-column.

Avec un join et le `SELECT *` **par défaut**, la projection est restreinte aux
colonnes du modèle (`<table>.col…`) pour qu'une table jointe ne puisse pas écraser
les champs du modèle à l'hydratation — passer un `select()` explicite pour l'élargir.
Les identifiants de join doivent être un strict `[table.]column` (lettres/chiffres/
underscore) ; sinon une erreur est levée (utiliser `joinRaw` pour les expressions).

## Pagination curseur

```ts
const page = await repo.query()
  .orderBy('id', 'asc')
  .cursorPaginate({
    limit: 20,
    orderBy: ['id'],
  })
```

Recommandations:

- Fournir un ordre déterministe.
- Utiliser des colonnes d'ordre stables.
- Mapper les erreurs de curseur invalide en `400`.

## Mutations via requête

```ts
repo.query().where('status', 'pending').update({ status: 'processed' })
repo.query().where('expired', true).delete()
repo.query().where('id', 10).increment('attempts', 1)
```

Pour des critères SQL complexes non couverts par les clauses sûres, passer par du raw SQL paramétré.

Sur un modèle `@SoftDeletes`, le DML bulk respecte le scope soft-delete comme les
lectures : `update`/`increment`/`decrement` **ne touchent pas** les lignes déjà
supprimées (scope par défaut), et `delete()` **soft-delete** (pose `deleted_at`)
au lieu d'un `DELETE` dur — cohérent avec le `delete()` d'instance. Pour un vrai
`DELETE`, utiliser `forceDelete()` ; `restore()` efface `deleted_at` en masse.
`withTrashed()` / `onlyTrashed()` élargissent / restreignent le scope avant la
mutation.

## Transactions

Atlas reprend l'API de transactions de Lucid. Dans les deux cas la transaction
est **épinglée à une seule connexion**, donc un lire-puis-décider-puis-écrire est
réellement atomique, et la connexion n'est rendue au pool qu'au commit/rollback.

**Managed** — commit automatique en cas de succès, rollback si une erreur est levée :

```ts
import { transaction } from '@c9up/atlas'

const next = await transaction(db, async (trx) => {
  const [row] = await trx.query<{ counter: number }>(
    'SELECT counter FROM counters WHERE id = ?', [id],
  )
  const value = row.counter + 1
  await trx.execute('UPDATE counters SET counter = ? WHERE id = ?', [value, id])
  return value // committé ; lever une erreur ici annule tout
})

// La même chose en méthode (parité Lucid) :
await db.transaction(async (trx) => { /* … */ })
```

**Manuel** — vous pilotez `commit()` / `rollback()` :

```ts
const trx = await db.transaction()
try {
  await trx.execute('UPDATE …')
  await trx.commit()
} catch (err) {
  await trx.rollback()
  throw err
}
```

**Niveau d'isolation** (`read uncommitted` | `read committed` | `repeatable read`
| `serializable` ; appliqué sur Postgres / MySQL, ignoré sur SQLite) :

```ts
await db.transaction(async (trx) => { /* … */ }, { isolationLevel: 'serializable' })
const trx = await db.transaction({ isolationLevel: 'repeatable read' })
```

Les appels `transaction()` imbriqués réutilisent la même connexion via
`SAVEPOINT` (rollback partiel). Passer le `trx` actif à un repository avec
`repo.useTransaction(trx)`.

**Hooks après-commit.** `trx.after('commit', cb)` / `trx.after('rollback', cb)`
enregistrent des effets de bord qui ne s'exécutent qu'une fois la transaction
durable (parité AdonisJS Lucid) ; les erreurs d'un hook sont avalées pour qu'un
effet post-commit ne puisse pas faire remonter un échec sur une transaction que
l'appelant a déjà vue réussir. Dans une transaction imbriquée (SAVEPOINT), un
hook `commit` est transféré au parent, donc il ne se déclenche qu'au commit
**racine** — et est abandonné si la transaction externe rollback ensuite. Atlas
s'en sert en interne pour flusher les domain events : un repo lié à une
transaction externe (`repo.useTransaction(trx)`) n'émet ses events qu'après le
commit de cette transaction externe, jamais au release du savepoint interne.

Conséquence observable : sur un chemin **transactionnel** (tout ce qui passe par
une transaction managée — `firstOrCreate`, `updateOrCreateMany`,
`related().create`, …), un échec de ton sink `onDomainEvents` est **avalé** —
l'écriture est déjà committée, un effet de bord tardif ne peut pas l'annuler. Sur
un `create()` / `save()` non transactionnel, le dispatch est inline et un échec du
sink **remonte** à l'appelant (la ligne est quand même écrite — le dispatch suit
l'INSERT). Si tu dois observer les échecs de dispatch, fais-le dans le sink.

> Ne jamais émuler une transaction en envoyant `BEGIN`/`COMMIT` via
> `db.execute()` sur une connexion du pool : chaque appel peut atterrir sur une
> connexion différente, les instructions se dispersent — rien n'est atomique et
> un verrou de ligne peut rester bloqué sur une connexion idle du pool. Toujours
> passer par `transaction()` / `db.transaction()`.

Pour une liste figée d'instructions sans lecture intermédiaire, utiliser
`runInTransaction(batch)` — atomique mais non interactif (utilisé par les
migrations).

## Locks

```ts
repo.query().where('id', id).forUpdate().first()
repo.query().where('id', id).forShare().first()

// Verrous plus faibles, Postgres uniquement (parité AdonisJS/Knex) :
repo.query().where('id', id).forNoKeyUpdate().first()
repo.query().where('id', id).forKeyShare().first()

// Modificateurs — se composent sur n'importe quel verrou de base :
repo.query().forUpdate().skipLocked().all() // ignore les lignes déjà verrouillées
repo.query().forUpdate().noWait().all()      // erreur au lieu d'attendre
```

`forNoKeyUpdate`/`forKeyShare` sont réservés à Postgres (ignorés ailleurs avec un
avertissement). Les verrous sont silencieusement ignorés sur SQLite. Utiliser les
verrous de ligne uniquement dans une transaction.

## Lectures en objets bruts avec `pojo()`

Court-circuite entièrement l'hydratation des modèles — aucune instance
`BaseEntity`, aucun suivi des changements, aucun `@column({ consume })`, aucun
preload. Retourne les lignes brutes de la base (colonnes snake_case). Chemin de
lecture rapide pour les rapports et exports (parité AdonisJS Lucid `pojo()`) :

```ts
const rows = await User.query().where('active', true).pojo()
// rows : Array<{ id: number; full_name: string; ... }>
```

`pojo()` s'enchaîne avec `first()`, ce que fait le code de Lucid lui-même :

```ts
const row = await User.query().where('email', email).pojo().first()
// row : { id: number; full_name: string; ... } | null
```

::: tip Écart nommé
Chez Lucid, `pojo()` est un drapeau posé sur le constructeur de requête, donc
toute sa surface reste disponible ensuite. `ModelQuery<T>` est contraint à
`T extends BaseEntity` et ne peut pas être re-paramétré vers un enregistrement
brut : le nôtre est donc une vue terminale, attendable pour les lignes et
enchaînable avec `first()`.
:::

Pour une seule colonne, `pluck()` saute l'hydratation de la même façon et rend
les valeurs plutôt que les lignes. Il refuse les colonnes objet et relation, ce
que celui de Knex ne fait pas :

```ts
const emails = await User.query().where('active', true).pluck<string>('email')
// ['ada@acme.test', 'grace@acme.test']
```

Un `select()` partiel de colonnes simples **inclut automatiquement la clé
primaire**, pour que l'entité hydratée reste sauvegardable (un `save()` ultérieur
fait un UPDATE, pas un INSERT). Pour les projections agrégat/alias
(`select('COUNT(*) as n')`) la PK ne peut être déduite — utiliser `pojo()`. Les
opérations prémisées sur une row existante (`delete()`, `forceDelete()`,
`restore()`, `refresh()`, `fresh()`, `load*()`) exigent une entité **persistée** :
elles lèvent `E_MODEL_NOT_PERSISTED` sur une instance locale (même avec une PK
posée à la main — ce n'est pas une row) et `E_MISSING_PRIMARY_KEY` sur une
projection persistée sans PK. `save()` lève aussi `E_MISSING_PRIMARY_KEY` sur une
telle projection. `related().create/save` **persiste le parent d'abord** dans une
transaction managée (parité AdonisJS/Lucid), pose le FK sur l'enfant, puis l'écrit —
atomique, rollback en cas d'échec ; un parent issu d'une projection sans PK est
rejeté (`E_MISSING_PRIMARY_KEY`).

## Contexte sideloaded

Attache un contexte arbitraire à chaque instance hydratée par une requête (parité
AdonisJS Lucid `sideload`) — p. ex. le tenant/utilisateur courant, lisible depuis
les hooks ou les propriétés calculées via `entity.$sideloaded` :

```ts
const posts = await Post.query().sideload({ tenantId }).exec()
posts[0].$sideloaded // { tenantId }
```

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
`*Of` et l'orthographe nue de Lucid — `whereJsonSuperset` / `whereJsonSubset` et
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
- `havingIn(col, values)` / `havingNotIn(col, values)`
- `havingBetween(col, [lo, hi])` / `havingNotBetween(col, [lo, hi])`
- `havingNull(col)` / `havingNotNull(col)`
- `havingRaw(sql, bindings?)`, `groupByRaw(sql)`, `orderByRaw(sql)`

Une colonne `having` nue est résolue via le mapping de colonnes de l'entité (en
respectant `@Column({ columnName })`) ; une expression d'agrégat ou un alias
`withCount` / `withAggregate` est laissé verbatim pour que `having` puisse le
référencer. `havingRaw`, `groupByRaw` et `orderByRaw` sont des surfaces SQL brut —
elles lèvent une erreur sous `setAtlasStrictMode(true)` / `ATLAS_STRICT`, exactement
comme `whereRaw`.

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

Le builder `ON` en callback porte l'ensemble complet des contraintes Lucid/Knex à
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

## Helpers de parité Lucid

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

## Timeouts de requête

```ts
// Course côté client seulement : l'awaiter rejette après 2s ; le driver termine
// quand même la requête côté serveur (sémantique par défaut de Lucid).
await repo.query().where('active', true).timeout(2000).exec()

// { cancel: true } annule AUSSI la requête côté serveur.
await repo.query().where('active', true).timeout(2000, { cancel: true }).exec()
```

Avec `{ cancel: true }`, Atlas applique un timeout d'**instruction** en session sur la
même connexion — Postgres `statement_timeout`, MySQL `MAX_EXECUTION_TIME` (SELECT
uniquement) — pour que le serveur avorte la requête en cours au lieu de la laisser
finir après que le client a déjà abandonné. SQLite n'a pas de timeout d'instruction
côté serveur, donc seule la course côté client s'y applique. Il n'y a pas de chemin
d'annulation séparé par KILL-by-PID (cette voie est indisponible sous le driver) ;
l'annulation est toujours le timeout d'instruction en session. Appeler `timeout()`
sans argument le supprime.

## Écritures et upserts au niveau connexion

`db.table()` / `db.from()` (le builder de niveau connexion, pas une requête de
modèle) expose la surface insert / upsert de Lucid. Les builders sont paresseux et
chaînables — l'instruction s'exécute au `await` / `.exec()`, donc l'ordre des clauses
Lucid fonctionne :

```ts
// Insérer une ligne, upsert sur une cible de conflit.
await db.table('users')
  .insert({ email, name })
  .onConflict('email')
  .merge()                      // UPDATE la ligne en cas de conflit …
  .returning(['id'])

await db.table('users').insert({ email, name }).onConflict('email').ignore() // … ou ne rien faire

// Insérer plusieurs lignes en une instruction — les clés manquantes sont mises à NULL (sémantique Lucid).
await db.table('audit_logs').multiInsert([
  { user_id: 1, action: 'login' },
  { user_id: 2, action: 'logout' },
])

// Update / delete sur le WHERE courant, avec RETURNING optionnel.
await db.from('users').where('id', 1).update({ is_active: false }).returning(['id'])
```

`insert(row)` résout vers les lignes RETURNING (ou `[insertId]` sur MySQL/SQLite,
`[]` sinon). `merge(...)` peut nommer des colonnes ou passer des assignations
personnalisées `{ col: value | db.raw(...) }` ; `ignore()` vaut `DO NOTHING` /
`INSERT IGNORE` ; `returning(...)` nomme les colonnes à retourner. Sur une requête de
modèle, `update()` / `delete()` / `forceDelete()` / `restore()` renvoient le même
`DmlBuilder` paresseux et acceptent une liste `returning` optionnelle.

## L'objet résultat du paginateur

`repo.query().paginate(page, perPage)` résout vers un `Paginator<T>` — les items plus
les métadonnées de parité Lucid et les helpers d'URL de page.

```ts
const page = await repo.query().orderBy('id').paginate(2, 20)

page.all()            // T[] — les lignes de cette page
page.total            // total de lignes toutes pages confondues
page.perPage          // 20
page.currentPage      // 2
page.lastPage         // ceil(total / perPage)
page.firstPage        // 1
page.hasPages         // plus d'une page ?
page.hasMorePages     // y a-t-il une page après celle-ci ?

// URLs de page — définir d'abord une base + la query string transmise.
page.baseUrl('/users').queryString({ sort: 'name' })
page.getUrl(3)                 // '/users?sort=name&page=3'
page.getNextPageUrl()          // URL de la page suivante, ou null sur la dernière page
page.getPreviousPageUrl()      // URL de la page précédente, ou null sur la première page
page.getUrlsForRange(1, 5)     // [{ page, url, isActive }, …], borné à [1, lastPage]

// Sérialiser pour une réponse API (meta en snake_case via la naming strategy).
page.serialize({ fields: ['id', 'name'] })
page.toJSON()                  // { data, meta }
```

`getUrl` renvoie `''` tant qu'aucun `baseUrl` n'est défini. `serialize` / `toJSON`
émettent `{ data, meta }` ; les clés de `meta` sont remappées via les
`paginationMetaKeys` de la naming strategy (snake_case par défaut) et incluent les
URLs de page dès qu'un `baseUrl` est présent.
