# Atlas - ModelQuery avancé

Cette page couvre les patterns de requêtes orientés production.

## Préférer `whereExpr` à `whereRaw`

```ts
const q = repo.query()
  .whereExpr('total', '>=', 100)
  .whereExpr('total', '+ tax', '>=', 100)
```

Garder `whereRaw` seulement pour des fragments SQL réellement spécifiques au dialecte, toujours avec bindings.

## Mode strict pour durcir

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)
```

En mode strict, `whereRaw()` et `joinRaw()` lèvent une erreur pour bloquer les usages risqués.

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

Utiliser `joinOn(table, left, right)` pour les cas simples join-on-column.

## Pagination curseur

```ts
const page = await repo.query()
  .orderBy('id', 'asc')
  .cursorPaginate({
    perPage: 20,
    orderBy: ['id'],
    cursor: null,
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
```

Utiliser les verrous de ligne uniquement dans une transaction.
