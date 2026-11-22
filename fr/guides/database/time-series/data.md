# Écrire et lire

Ce guide couvre l'ingestion des données et leur lecture :

- Ingestion
- Relire les valeurs
- Requêtes séries temporelles

## Ingestion

`SuperTableRepository` est l'API d'écriture façon Atlas, calquée sur le nommage de `BaseRepository` : `ingest` (≙ `create`) et `ingestMany` (≙ `createMany`, la primitive de masse). Elle résout la super-table, le timestamp, les colonnes et les tags depuis les métadonnées des décorateurs (jamais `key in instance`) et injecte la connexion structurellement.

```typescript
import { SuperTableRepository } from '@c9up/eon'

const repo = new SuperTableRepository(Meters, conn)

await repo.ingest({ ts: 1700000000000n, current: 10.3, voltage: 219, groupid: 1, location: 'north' })
await repo.ingestMany([/* … beaucoup de points … */])   // → { rowsAffected }
```

Les écritures TDengine sont **append / dernière-écriture-gagne** selon le timestamp fourni par l'appelant. Il n'y a délibérément pas de `save` / `upsert` / `firstOrCreate`, pas de `useTransaction` / BEGIN-COMMIT, pas de `RETURNING`, ni de ré-hydratation d'une PK générée par la base — TDengine n'a pas d'analogue.

### STMT colonnaire — le chemin de masse par défaut

`ingestMany` est le chemin haut-débit et sûr vis-à-vis de l'injection. Il groupe les points par leur table enfant déterministe (mêmes tags → même enfant), accumule des colonnes typées en **struct-of-arrays** par enfant (un tableau par colonne entière, jamais un tableau d'objets-lignes), découpe chaque enfant à `batchSize` (défaut **4096**, surchargé via `new SuperTableRepository(E, conn, { batchSize })`), et bind **une fois par lot** via l'API STMT2 du connecteur. Les tables enfants **s'auto-créent au premier insert** (`INSERT INTO ? USING <stable> (…) TAGS (?) VALUES (?)`, table remplie par `setTableName`). Les timestamps sont portés en `bigint` ; un `number` entier non sûr est rejeté (`E_EON_PARAM_PRECISION`) plutôt que lié avec perte de précision. Le template de préparation est produit par le compilateur Rust — le seam d'injection reste en Rust, jamais une chaîne construite à la main.

### Schemaless — line protocol

`ingestSchemaless` rend les points en **InfluxDB line protocol** et les insère via l'endpoint schemaless du connecteur (OpenTSDB telnet/JSON via l'option `protocol` ; la précision par défaut est la milliseconde). C'est **~8–10× plus lent** que STMT et ne doit pas être le chemin de masse par défaut.

```typescript
await repo.ingestSchemaless(points, { protocol: 'influxdb', precision: 'milliseconds', ttl: 0 })
```

Chaque champ porte son suffixe de type (`i8`/`i16`/`i32`/`i64`, `f32`/`f64`, `"…"` pour VARCHAR, `L"…"` pour NCHAR), de sorte que les points correspondent à la super-table que décrit l'entité. Le line protocol impose son propre schéma : la colonne d'horodatage s'appelle `_ts`, chaque tag est NCHAR, et les colonnes VARBINARY, JSON, DECIMAL et TIMESTAMP secondaires n'ont pas de forme en line protocol. Une entité hors de ces règles est refusée d'emblée avec `E_EON_SCHEMALESS_SCHEMA` ; écrivez-la avec `ingestMany` ou `ingestSql`.

```typescript
@SuperTable('readings')
class Reading {
  @Timestamp() declare _ts: bigint
  @Column({ type: 'double' }) declare value: number
  @Tag({ type: 'nchar', length: 32 }) declare site: string
}
```

### INSERT SQL littéral

`ingestSql` exécute un `INSERT … USING … TAGS … VALUES` littéral par table enfant via `exec` — un raccourci/repli. Chaque littéral de valeur est rendu par le mode littéral du compilateur Rust (réutilisant l'unique seam d'échappement `render_literal`) ; eon n'interpole jamais une valeur en chaîne côté TypeScript.

```typescript
await repo.ingestSql(points)   // → { rowsAffected }
```

## Relire les valeurs

### Cellules nulles

Un `NULL` SQL revient en `null` pour tout type de colonne, texte et binaire
compris : eon lit le bitmap des nulls du résultat, donc un `VARCHAR` vide vaut
`null` et une cellule contenant les quatre caractères `NULL` reste la chaîne
`"NULL"`.

```ts
const row = await repo.query().where('ts', t).first()   // repo: the prices super-table
row?.amount   // null, et non "NULL"
```

### Les nombres gardent leurs chiffres

`FLOAT` se relit comme le plus court décimal qui donne la même valeur binary32
(`0.1`, et non `0.10000000149011612`), `DOUBLE` tel que stocké, et `DECIMAL`
comme une chaîne exacte à l'échelle de la colonne (`'61.9900000000'` pour
`DECIMAL(20,10)`).

### Insérer un décimal

Une colonne `DECIMAL` fait l'aller-retour exact par les trois chemins.
`ingestMany()` lie chaque valeur comme un entier exact à l'échelle de la
colonne, lue dans le schéma du serveur ; une valeur qu'elle ne peut pas tenir
exactement — plus de décimales que l'échelle, plus de chiffres que la
précision, un exposant — est refusée avec `E_EON_BIND` plutôt qu'arrondie.
Passez les décimaux en chaînes (`'61.99'`) : un `number` a déjà été arrondi en
binaire quand eon le reçoit.

## Requêtes séries temporelles

`repo.query()` renvoie un `TimeSeriesQuery` — un builder fluide calqué sur le **sous-ensemble** pertinent de `ModelQuery` d'Atlas. Les noms de filtrage/tri/pagination (`where` / `orderBy` / `limit` / `offset` / `first` / le thenable `then`) sont ceux d'Atlas ; les méthodes de fenêtre (`interval` / `sliding` / `fill` / `partitionBy`) portent le nom des clauses SQL TDengine.

```typescript
const rows = await repo
  .query()
  .select(['tbname', '_wstart', { fn: 'avg', column: 'voltage', as: 'avg_v' }])
  .where('ts', '>', 1700000000000000000n)
  .partitionBy('tbname')
  .interval('1m').sliding('30s').fill('prev')
  .orderBy('_wstart', 'asc')
  .limit(100)
// SELECT tbname, _wstart, AVG(`voltage`) AS `avg_v` FROM `meters`
//   WHERE `ts` > 1700000000000000000 PARTITION BY tbname
//   INTERVAL(1m) SLIDING(30s) FILL(PREV) ORDER BY _wstart ASC LIMIT 100
```

Le builder est **thenable** (`await query` ≡ `await query.exec()`, comme dans atlas), avec aussi `.exec()` / `.all()` / `.first()` (row-ou-null, `LIMIT 1` implicite) et `.toSQL()` (`{ sql, params }` pour le debug). `.exec()` est mémoïsé : plusieurs `await` partagent un seul aller-retour.

Un callback regroupe des prédicats entre parenthèses, si bien qu'un `orWhere` ne peut pas s'échapper des filtres qui l'entourent : `.where('tenant_id', 42).where((q) => q.where('level', 'alarm').orWhere('sensor', 7))` compile en `` `tenant_id` = 42 AND (`level` = 'alarm' OR `sensor` = 7) ``. `andWhere` / `orWhere` acceptent aussi un callback, les groupes s'imbriquent, et un groupe vide est refusé (`E_EON_EMPTY_WHERE_GROUP`).

### La lecture est littérale — jamais paramétrée (le nœud sécurité)

`EonConnection.query(sql)` ne prend que du **SQL littéral** : le transport ws ne bind les `?` que via le chemin STMT (écritures / ingestion). Le builder compile donc chaque SELECT en mode **littéral** — les valeurs de `WHERE`, les listes `IN (…)` et les constantes `FILL(VALUE, …)` sont rendues en littéraux SQL **côté Rust**, par l'unique seam d'échappement `render_literal` (guillemets/backslash échappés, octet NUL rejeté). eon n'interpole **jamais** une valeur en chaîne côté TypeScript. `params` revient donc vide ; un `params` non vide est traité comme une régression du mode littéral et rejeté avant que le SQL n'atteigne la connexion. C'est la déviation nommée vis-à-vis d'Atlas (`db.query(sql, params)`), imposée par la contrainte lecture-littérale du transport ws.

### Fenêtres, fonctions et pseudo-colonnes

- **`interval(val, offset?)`** → `INTERVAL(val[, offset])`. Le token de durée est validé (`b`=ns, `u`=µs, `a`=ms, `s`, `m`=minutes, `h`, `d`, `w`, `n`=**mois**, `y`) — `b` est la nanoseconde, `n` est le mois. Une durée invalide ou nulle → `E_EON_INVALID_DURATION`.
- **`sliding(val)`** → `SLIDING(val)`, valide uniquement à l'intérieur d'un `INTERVAL` (`E_EON_SLIDING_REQUIRES_INTERVAL` sinon). La règle de magnitude `SLIDING ≤ INTERVAL` est laissée au serveur (comparaison inter-unités).
- **`fill(mode, ...values)`** → `FILL(mode[, v…])`, sous-clause de l'`INTERVAL` (jamais autonome ; `E_EON_FILL_REQUIRES_INTERVAL`). Modes : `none | null | prev | next | linear | value` ; `value` porte des constantes (littéraux Rust). `near` (INTERP-only) et tout mode inconnu → `E_EON_INVALID_FILL`.
- **`partitionBy(...cols)`** → `PARTITION BY …`, après le `WHERE` et **avant** la fenêtre. Les tags sont quotés ; `tbname` passe verbatim.
- **`select([...])`** accepte des colonnes nues, des **fonctions** (`{ fn: 'last_row', column: 'current' }` → `` LAST_ROW(`current`) `` ; allowlist avg/sum/min/max/count/first/last/last_row/spread/twa) et des **pseudo-colonnes** (`_wstart` / `_wend` / `_wduration` / `tbname`, rendues verbatim), chacune avec un `as` optionnel. Aucun passthrough de chaîne brute — l'argument passe par `quote_ident`.

Ordre de clause canonique émis : `SELECT … FROM … [WHERE …] [PARTITION BY …] [INTERVAL(…) [SLIDING(…)] [FILL(…)]] [ORDER BY … asc|desc] [LIMIT n [OFFSET m]]`.

### Hydratation

Les lignes brutes sont mappées via les métadonnées de colonnes (jamais `key in instance` — un champ `@Column() declare x` n'est pas une propriété d'instance). Les colonnes `timestamp` / `bigint` sont ravivées en `bigint` (parité avec le garde de précision de la frontière de compilation) ; les alias de fenêtre et pseudo-colonnes (`_wstart`, `avgV`, …), qui ne sont pas des colonnes déclarées, sont exposés bruts sur le point mappé (l'échappatoire `setExtra` d'Atlas pour les projections brutes).

Pour des points **typés**, passez un mapper à `query(mapPoint)` : il s'applique par-dessus l'hydrateur ravivant (les `bigint` sont déjà rétablis), sans aucun cast `as`.

```typescript
const series = await repo
  .query((row) => ({ start: row._wstart, avg: Number(row.avgV) }))
  .select([{ pseudo: '_wstart' }, { fn: 'avg', column: 'voltage', as: 'avgV' }])
  .interval('1m')
```
