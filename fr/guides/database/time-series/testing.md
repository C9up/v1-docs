# Tests

Ce guide couvre le test du code de séries temporelles :

- `FakeEonConnection` — magasin en mémoire
- `factory` — points de séries temporelles

## Tests

Écrivez des tests unitaires rapides et déterministes contre `@c9up/eon` sans docker,
en miroir de `@c9up/atlas/testing`. Exporté depuis `@c9up/eon/testing`.

### `FakeEonConnection` — magasin en mémoire

Un double `EonConnection` fait main (TDengine n'a pas de moteur embarquable ; à la
différence du vrai SQLite en mémoire d'atlas, c'est un double étroit, **pas** un
moteur SQL) :

```typescript
import { FakeEonConnection } from '@c9up/eon/testing'

const conn = new FakeEonConnection()
await syncSuperTable(conn, Meters)                 // vraie DDL compilée
conn.statements   // → ['CREATE STABLE IF NOT EXISTS `meters` (…) TAGS (…)']
await conn.query('SELECT `ts`, `current` FROM `t` WHERE `groupid` = 2 LIMIT 10')
conn.reset()
```

- `exec(sql)` **enregistre** chaque instruction (à vérifier via `conn.statements`) et
  met à jour un magasin de lignes par table pour les formes `CREATE` / `INSERT` /
  `DELETE` reconnues.
- `query(sql)` ne répond **qu'aux** `SELECT [cols] FROM t [WHERE col <op> val]
  [LIMIT n]` plats. La SQL fenêtrée / d'agrégation (`INTERVAL` / `FILL` /
  `PARTITION BY` / `avg(...)`) lève `E_EON_FAKE_UNSUPPORTED` — utilisez le harnais
  docker (`describeIfTdengine`) pour cela.
- `ingestColumnar` / `schemaless` requièrent un connecteur vivant →
  `E_EON_FAKE_UNSUPPORTED`.

### `factory` — points de séries temporelles

```typescript
import { factory } from '@c9up/eon/testing'

const MeterFactory = factory(Meters, () => ({
  ts: Date.now(),
  current: 10.5,
  groupid: 2,
})).state('spike', (d) => { d.current = 999 })

MeterFactory.make()                       // objet de données brut
MeterFactory.merge({ groupid: 7 }).apply('spike').makeStubbed()  // instance
await MeterFactory.create(conn)           // persiste via un INSERT littéral (routé vers l'enfant)
await MeterFactory.createMany(100, conn)
```

L'hydratation résout les colonnes via les getters de métadonnées des décorateurs,
jamais `key in instance` (le piège `@Column() declare x`). `create()` est un insert
réservé aux tests, routé vers la table enfant déterministe (`childTableName`) — pas
l'API d'ingestion `SuperTableRepository`.
