# Transactions et verrous

Ce guide couvre les transactions, les verrous, les délais et les écritures :

- Transactions
- Locks
- Le constructeur est une promesse entière
- Timeouts de requête
- Mutations via requête
- Écritures et upserts au niveau connexion

## Transactions

Dans les deux cas la transaction
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

// La même chose en méthode :
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
`repo.useTransaction(trx)`, ou à une requête construite avant que la transaction
existe avec `query.useTransaction(trx)` :

```ts
const query = User.query().where('id', 1)
await db.transaction(async (trx) => {
  await query.useTransaction(trx).update({ active: false })
  await db.from('audit').useTransaction(trx).insert({ note: 'deactivated' })
})
```

Une requête de modèle liée ainsi hydrate des lignes liées à la transaction (leurs
`save()` / `delete()` y restent) et diffère ses domain events jusqu'au commit,
comme `Model.query({ client: trx })`. Le builder de connexion, ses builders
d'écriture (`insert`, `update`, `delete`) et `db.rawQuery()` acceptent aussi
`useTransaction(trx)`. Une transaction ouverte sur une connexion d'un autre
dialecte est refusée (`E_ATLAS_DIALECT_MISMATCH`) : la requête a été construite
pour le sien.

**Hooks après-commit.** `trx.after('commit', cb)` / `trx.after('rollback', cb)`
enregistrent des effets de bord qui ne s'exécutent qu'une fois la transaction
durable ; les erreurs d'un hook sont avalées pour qu'un
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

// Verrous plus faibles, Postgres uniquement :
repo.query().where('id', id).forNoKeyUpdate().first()
repo.query().where('id', id).forKeyShare().first()

// Modificateurs — se composent sur n'importe quel verrou de base :
repo.query().forUpdate().skipLocked().all() // ignore les lignes déjà verrouillées
repo.query().forUpdate().noWait().all()      // erreur au lieu d'attendre
```

`forNoKeyUpdate`/`forKeyShare` sont réservés à Postgres (ignorés ailleurs avec un
avertissement). Les verrous sont silencieusement ignorés sur SQLite. Utiliser les
verrous de ligne uniquement dans une transaction.

### Un constructeur de requête est une promesse entière

`await query` l'exécute, et les deux autres moitiés du protocole de promesse
aussi :

```ts
const rows = await User.query().where('active', true)

await User.query().where('active', true).finally(() => span.end())
const safe = await User.query().whereRaw(untrusted).catch(() => [])
```

`catch` et `finally` levaient « not a function » — un objet qui répond à `then`
et à rien d'autre piège quiconque le traite comme la promesse dont il a l'air.

## Le constructeur est une promesse entière

Attendre un constructeur l'exécute — et les deux autres moitiés du protocole de
promesse aussi :

```ts
const users = await User.query().where('active', true)

await User.query().where('active', true).finally(() => span.end())

const rows = await User.query().whereRaw(suspect).catch(() => [])
```

`await query` marchait pendant que `query.catch(fn)` et `query.finally(fn)`
levaient « not a function ». Un objet qui répond à `then` et à rien d'autre
piège quiconque le traite comme la promesse dont il a l'air : le constructeur
porte donc les trois.

`exec()` mémoïse : attendre deux fois le même constructeur partage un seul
aller-retour. `clone()` en donne un neuf.

## Timeouts de requête

```ts
// Course côté client seulement : l'awaiter rejette après 2s ; le driver termine
// quand même la requête côté serveur (comportement par défaut).
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

La connexion du pool retrouve le timeout qu'elle avait avant la requête, y compris
une valeur par défaut de rôle ou de base (`ALTER ROLE app SET statement_timeout =
'5s'`) ou une valeur `options` de démarrage. Une connexion dont la valeur ne peut
pas être restaurée est fermée au lieu de retourner dans le pool.

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

## Écritures et upserts au niveau connexion

`db.table()` / `db.from()` (le builder de niveau connexion, pas une requête de
modèle) expose une surface insert / upsert. Les builders sont paresseux et
chaînables — l'instruction s'exécute au `await` / `.exec()`, donc les clauses se
lisent dans l'ordre SQL :

```ts
// Insérer une ligne, upsert sur une cible de conflit.
await db.table('users')
  .insert({ email, name })
  .onConflict('email')
  .merge()                      // UPDATE la ligne en cas de conflit …
  .returning(['id'])

await db.table('users').insert({ email, name }).onConflict('email').ignore() // … ou ne rien faire

// Insérer plusieurs lignes en une instruction — les clés manquantes sont mises à NULL.
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
