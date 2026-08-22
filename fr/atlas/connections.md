# Atlas - Connexions

Atlas expose un singleton `db` — le service `Database` de Lucid (AdonisJS) — ainsi
qu'un `ConnectionManager` (`db.manager`) qui détient la table des connexions
nommées. Le singleton est peuplé par `AtlasProvider.boot()` à partir des connexions
de votre `config/database.ts`.

```ts
import db from '@c9up/atlas/services/db'

const rows = await db.rawQuery('SELECT * FROM users WHERE id = ?', [id])
```

> Le singleton `db` lève une erreur s'il est accédé avant que `AtlasProvider.boot()`
> n'ait été exécuté — vérifiez que `@c9up/atlas/provider` figure dans les providers
> de votre `reamrc.ts` et que `config/database.ts` définit au moins une connexion.

## Points d'entrée du query builder

```ts
db.query()                    // un query builder au niveau de la connexion
db.from('users')              // builder avec la table présélectionnée
db.table('users')             // builder d'insertion/écriture sur une table
db.insertQuery()              // un builder d'insertion
db.modelQuery(User)           // builder pour un modèle résolu à l'exécution
```

- `query(options?)` renvoie un `DatabaseQueryBuilder`. Passez `{ client: trx }`
  pour le router à travers une transaction, ou `{ mode: 'read' }` pour rejeter les
  écritures sur ce builder.
- `from(table)` présélectionne la table. Elle accepte également une source de type
  table dérivée — un builder ou un callback qui en construit un — avec un alias
  optionnel : `db.from(subquery, 'recent')`.
- `table(table)` est le pendant écriture/insertion avec la table présélectionnée.
- `insertQuery(options?)` reflète `query` pour le chemin d'insertion (accepte les
  mêmes options `{ client }` / `{ mode }`).
- `modelQuery(Model)` construit une requête pour une classe de modèle résolue à
  l'exécution (Lucid `db.modelQuery`). Pour du code statique, préférez
  `Model.query()` directement.

## SQL brut et références

```ts
await db.rawQuery('SELECT * FROM users WHERE id = :id', { id })

t.uuid('id').defaultTo(db.raw('gen_random_uuid()'))

db.query().orderBy(db.ref('posts.created_at'), 'desc')

const { rowsAffected } = await db.execute('DELETE FROM sessions WHERE expired = ?', [1])
```

- `rawQuery(sql, bindings?)` renvoie une requête brute chaînable et « thenable ».
  Les liaisons peuvent être positionnelles (`?` / `??`) ou nommées (`:name` /
  `:name:`).
- `raw(sql, params?)` construit un fragment `RawSql` pour les fragments de requête
  et les valeurs par défaut de colonnes qui sont des expressions SQL.
- `ref(column)` produit une référence de colonne validée et échappée selon le
  dialecte — utilisez-la là où une position de valeur doit être lue comme une
  colonne. Ce n'est jamais une liaison de valeur.
- `execute(sql, params?)` exécute une instruction pour son effet et résout
  `{ rowsAffected }`.

Sur PostgreSQL, une liaison n'a besoin d'aucun transtypage `::type` : atlas
demande à Postgres le type qu'il infère pour chaque paramètre et y convertit la
valeur, si bien que
`rawQuery('SELECT * FROM users WHERE company_id = ?', [uuid])` fonctionne sur
une colonne `uuid` à partir d'une simple chaîne JS. Une valeur qui ne convient
pas est signalée par sa position — `parameter $1: 'abc' is not a valid uuid` —
plutôt que par une erreur d'opérateur. Là où Postgres ne peut pas inférer le
type (un `SELECT ?` isolé), la liaison retombe sur `text`, comme avant.

Une liaison temporelle accepte toutes les formes que Postgres accepte : un
instant complet (`2026-03-10T00:00:00.000Z`) convient donc à une colonne `date`
et n'en garde que la date. atlas n'est jamais plus strict que la base qu'il
pilote.

## État de santé et cycle de vie

```ts
await db.ping()   // vérification de disponibilité de la connexion liée
await db.close()  // ferme le pool de la connexion liée
```

`db.dialect` expose le dialecte de la connexion liée (`'sqlite'` | `'postgres'`
| `'mysql'`).

## Troncature

```ts
await db.truncate('sessions')          // vide une table
await db.truncate('posts', true)       // CASCADE sur Postgres
await db.truncateAllTables()           // vide toutes les tables utilisateur
await db.truncateAllTables(['audit_log'])
```

- `truncate(table, cascade?)` émet `TRUNCATE TABLE` sur Postgres/MySQL (avec
  `CASCADE` lorsque `cascade` est défini, Postgres uniquement) et `DELETE FROM`
  sur SQLite, qui n'a pas de `TRUNCATE`.
- `truncateAllTables(ignoreTables?)` vide toutes les tables utilisateur. Les tables
  du framework (`ream_*`) et les internes du dialecte sont laissées intactes ; les
  clés étrangères sont suspendues afin que l'ordre de suppression n'importe pas.
  C'est avant tout un utilitaire pour les suites de tests.

## Verrous consultatifs (advisory locks)

Les verrous consultatifs au niveau de la session permettent à des processus
coopérants de se sérialiser autour d'une clé partagée sans verrou de table — Atlas
reflète les méthodes `getAdvisoryLock` / `releaseAdvisoryLock` de Lucid.

```ts
const key = 'nightly-report'

if (await db.getAdvisoryLock(key)) {
  try {
    // section exclusive — un seul détenteur à la fois
  } finally {
    await db.releaseAdvisoryLock(key)
  }
}
```

- Les deux appels sont **non bloquants** : `getAdvisoryLock` renvoie si le verrou a
  été acquis (Postgres `pg_try_advisory_lock`, MySQL `GET_LOCK(key, 0)`), et
  `releaseAdvisoryLock` renvoie s'il a été libéré.
- La clé peut être une `string` ou un `number`. Une clé de type chaîne est hachée
  de façon déterministe vers l'entier requis par Postgres, afin que le verrouillage
  et le déverrouillage concordent au sein d'un processus.
- **Les deux lèvent une erreur sur SQLite** — SQLite n'a pas de verrous consultatifs
  (parité Lucid). Protégez-vous par dialecte si votre code s'exécute aussi sur
  SQLite.

## Le gestionnaire de connexions

`db.manager` est l'unique propriétaire des connexions nommées. `AtlasProvider`
enregistre les connexions qu'il ouvre au démarrage, et votre code peut ajouter,
ouvrir, modifier ou libérer des connexions à l'exécution.

### Enregistrer et utiliser une seconde connexion

```ts
// Enregistre une config sans encore l'ouvrir.
db.manager.add('analytics', {
  url: 'postgres://user:pass@analytics-db:5432/reports',
  pool: { min: 1, max: 5 },
})

// Ouvre-la (idempotent — renvoie le handle vivant si déjà ouverte).
await db.manager.connect('analytics')

// Scope le service db sur cette connexion.
const rows = await db.connection('analytics').rawQuery('SELECT count(*) AS n FROM events')
```

`db.connection(name, options?)` renvoie un `DbService` scopé sur la connexion
nommée. Appelée sans nom, elle renvoie le service de la connexion par défaut ;
passez `{ mode: 'read' }` pour rejeter les écritures sur le service renvoyé. Elle
lève une erreur si aucune connexion n'est enregistrée sous `name`.

Un modèle peut aussi se lier à une connexion non par défaut depuis un simple import
via `static connection = 'analytics'`, ce qui se résout à travers le même
gestionnaire.

### Configuration et ouverture

```ts
db.manager.add('reports', config)           // enregistre la config, N'ouvre PAS
await db.manager.connect('reports')         // ouvre (ou renvoie le handle vivant)
await db.manager.connect('reports', config) // ouvre avec une config en ligne
db.manager.patch('reports', newConfig)      // remplace la config ; le pool vivant se draine en arrière-plan
```

- `add(name, config)` enregistre une config de connexion sans l'ouvrir. C'est un
  no-op si le nom est déjà enregistré — utilisez `patch` pour remplacer une config
  existante.
- `connect(name, config?)` ouvre la connexion et est idempotente. La connexion doit
  avoir été `add`ée au préalable, ou vous passez sa config en ligne.
- `patch(name, config)` remplace la config d'une connexion. Si elle est actuellement
  ouverte, le pool vivant est déconnecté en arrière-plan (les requêtes en cours se
  drainent) et le nœud revient à `registered`, de sorte que le prochain `connect`
  ouvre un pool neuf.

### Résolution et inspection

```ts
db.manager.has('analytics')          // une connexion est-elle enregistrée ?
db.manager.isConnected('analytics')  // le pool est-il actif (open ou migrating) ?
db.manager.connection('analytics')   // le handle vivant, ou undefined si inactif
db.manager.connections               // ReadonlyMap<string, ConnectionNode>
db.manager.get('analytics')          // le ConnectionNode, ou undefined
```

- `has(name)` indique si une connexion est enregistrée (dans n'importe quel état).
- `isConnected(name)` vaut `true` uniquement lorsque le pool est actif — `open` ou
  `migrating`.
- `connection(name)` renvoie le handle vivant `AsyncDatabaseConnection`, ou
  `undefined` lorsque le pool n'est pas actif.

Chaque connexion gérée est un `ConnectionNode` — `{ name, config, connection?, state }`
— dont le `state` vaut `registered` | `open` | `migrating` | `closing` | `closed`.

### Fermeture et libération

```ts
await db.manager.close('analytics')        // ferme le pool, conserve le nœud (state → closed)
await db.manager.close('analytics', true)  // ferme ET retire le nœud
await db.manager.release('analytics')      // ferme et retire entièrement le nœud
await db.manager.closeAll()                // ferme tous les pools, conserve les nœuds
await db.manager.closeAll(true)            // ferme tous les pools ET retire tous les nœuds
```

- `close(name, release?)` ferme le pool de la connexion et conserve le nœud (state
  → `closed`) afin qu'il puisse être rouvert. Passez `release: true` pour aussi
  retirer le nœud.
- `closeAll(release?)` ferme le pool de chaque connexion ; `release: true` retire
  aussi chaque nœud.
- `release(name)` ferme et retire entièrement un nœud unique (équivalent à
  `close(name, true)`).

### État de migration

```ts
db.manager.markMigrating('analytics')  // open → migrating (le pool reste actif)
db.manager.endMigrating('analytics')   // migrating → open
```

`markMigrating` déplace une connexion ouverte vers l'état `migrating` — le pool
reste actif, de sorte que `isConnected` et `connection` continuent de résoudre.
`endMigrating` la restaure à `open`. C'est le runner de migrations qui pilote ces
transitions.

### Événements de cycle de vie

Le gestionnaire est un `EventEmitter` Node. Abonnez-vous avec `on` / `once` et
désabonnez-vous avec `off` :

```ts
db.manager.on('connect', (node) => log.info(`ouverte ${node.name}`))
db.manager.on('disconnect', (node) => log.info(`fermée ${node.name}`))
db.manager.on('error', (node, err) => log.error(`échec de connexion pour ${node.name}`, err))
```

- `connect` se déclenche à l'ouverture d'un pool ; `disconnect` à sa fermeture ;
  les deux appellent le listener avec le `ConnectionNode`.
- `error` se déclenche lorsque l'ouverture d'une connexion échoue et appelle le
  listener avec `(node, error)`.

### Enregistrement interne

`register(name, config, connection)` et `deregister(name, connection?)` enregistrent
et retirent une connexion déjà ouverte sans l'ouvrir ni la fermer — elles servent de
socle à `AtlasProvider`, qui ouvre lui-même les pools de démarrage avec sa propre
logique de retry/rollback. Dans le code applicatif, préférez `add` + `connect` (et
`close` / `release`).
