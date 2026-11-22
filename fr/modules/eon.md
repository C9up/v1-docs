# Eon — Séries temporelles

Eon est la couche de données séries temporelles de Ream, adossée à [TDengine](https://tdengine.com). Les descriptions de requêtes sont compilées en SQL TDengine paramétré via un compilateur Rust `eon-query` exposé par NAPI, et le transport est ws-first (le client taosAdapter d'eon lui-même, sur le `WebSocket` intégré à Node).

## La frontière de compilation

TypeScript n'assemble jamais lui-même les chaînes SQL. Il construit une description de statement en JSON et la passe au compilateur Rust, qui renvoie `{ statements, params }` avec :

- **des identifiants entre backticks** (`` `meters` ``) validés par un seam anti-injection — tout nom de table/colonne/tag contenant un backtick, un NUL ou un caractère hors de `[A-Za-z0-9_]` est rejeté avec `E_UNSAFE_IDENTIFIER`, jamais interpolé ;
- **des placeholders `?` (style STMT)** pour chaque valeur et tag — aucune valeur de l'appelant n'est jamais insérée dans la chaîne SQL.

```typescript
import { compileStatementNative } from '@c9up/eon'

// Insert simple
compileStatementNative({
  kind: 'insert',
  table: 'd1001',
  columns: ['ts', 'current'],
  rows: [[1700000000000, 10.3]],
})
// → { statements: ['INSERT INTO `d1001` (`ts`, `current`) VALUES (?, ?)'],
//     params: [1700000000000, 10.3] }

// Auto-création de table enfant (TDengine `USING <stable> TAGS (...)`) — les params de tags sont liés en premier
compileStatementNative({
  kind: 'insert',
  table: 'd1001',
  using: 'meters',
  tags: ['California.SanFrancisco'],
  columns: ['ts', 'current'],
  rows: [[1700000000000, 10.3]],
})
// → { statements: ['INSERT INTO `d1001` USING `meters` TAGS (?) VALUES (?, ?)'],
//     params: ['California.SanFrancisco', 1700000000000, 10.3] }

// SELECT basique (FROM / WHERE / LIMIT)
compileStatementNative({
  kind: 'select',
  table: 'meters',
  select: ['ts', 'current'],
  wheres: [{ column: 'groupid', operator: '=', value: 2 }],
  limit: 10,
})
// → { statements: ['SELECT `ts`, `current` FROM `meters` WHERE `groupid` = ? LIMIT 10'],
//     params: [2] }
```

Les clauses à fenêtre temporelle (`INTERVAL` / `SLIDING` / `FILL` / `PARTITION BY`), les fonctions de sélection et les pseudo-colonnes `_wstart` / `_wend` / `_wduration` compilent aussi — on construit rarement ces specs à la main ; voir [Requêtes séries temporelles](#requetes-series-temporelles) pour le builder fluide qui les produit.

## Provider

`EonProvider` est une feuille agnostique : il consomme le conteneur hôte de façon structurelle et n'importe jamais `@c9up/ream`. Au boot, il ouvre la ou les connexions configurées et les enregistre sous `eon` (par défaut), `eon.connection` (alias) et `eon:<nom>` (par connexion nommée), ainsi que le singleton de module `@c9up/eon/services/connection`. Le compilateur (indépendant du transport) est enregistré sous `eon.compiler`. `shutdown()` ferme chaque connexion (fail-open — une fermeture bloquée n'empêche jamais les autres) et libère les singletons.

## Transport / connexion

Eon est **ws-first** : il dialogue avec TDengine par l'API WebSocket de taosAdapter, avec un client à lui construit sur le `WebSocket` intégré à Node (Node 24 ou plus récent) — sans paquet pilote, sans `libtaos`, sans FFI natif, sans script d'installation, et sans rien toucher au process (ni gestionnaire de signal, ni fichier de log). Un futur transport natif `taos` est différé derrière le même seam, pas retiré du périmètre.

Le client borne ce que le serveur peut lui faire : chaque requête a une échéance (`timeoutMs`, 60 s par défaut), une trame de plus de 256 Mio ou qui ne se décode pas ferme la connexion, et la fermer — d'un côté ou de l'autre — rejette tout ce qui attend encore. Ces échecs portent `E_EON_TIMEOUT`, `E_EON_DECODE`, `E_EON_CLOSED` ou `E_EON_CONNECT` ; un refus du serveur porte à la place le `code` numérique du serveur.

### Configuration

La configuration vit sous la clé `timeseries` (repli sur `eon`), écrite avec `defineConfig` :

```typescript
// config/timeseries.ts
import { defineConfig } from '@c9up/eon'
import env from '#start/env'

export default defineConfig({
  url: env.get('TDENGINE_URL'), // URL WebSocket de taosAdapter, ex. ws://localhost:6041
  user: env.get('TDENGINE_USER'),
  password: env.get('TDENGINE_PASSWORD'),
  database: env.get('TDENGINE_DATABASE'), // base par défaut (optionnelle)
  timeoutMs: 30_000,
  connectRetries: 5,            // retente la connexion INITIALE (serveur froid)
  connectBackoffMs: 200,        // exponentiel, plafonné à 30s
})
```

`ream configure @c9up/eon` écrit ce fichier, déclare les quatre variables dans `start/env.ts` (le mot de passe est optionnel, pour l'authentification par jeton) et amorce `.env` avec `TDENGINE_PASSWORD=change-me` : un substitut qui n'authentifie nulle part. Renseignez le vrai mot de passe avant le premier lancement ; ne gardez jamais le `taosdata` d'usine, livré avec chaque image TDengine. La configuration n'a aucune valeur de repli : un déploiement auquel il manque une variable échoue au démarrage au lieu de se connecter à localhost.

Les identifiants se mettent dans `user` / `password` / `token` : l'utilisateur et le mot de passe partent dans la requête de connexion, le jeton dans la query de l'URL, comme taosAdapter l'attend. Ils sont aussi acceptés dans l'URL (`ws://user:pass@host`, `?token=`, une base comme chemin) ; eon masque alors le mot de passe et chaque valeur de paramètre de l'URL dans ses messages d'erreur. Il n'y a pas de pool de connexions — eon garde une unique connexion longue durée ; `connectRetries` couvre la course au démarrage initial (démarrage à froid docker/k8s), pas une reconnexion par requête.

### Le seam `EonConnection`

Chaque transport satisfait une petite interface — l'implémentation ws aujourd'hui, une implémentation native `taos` plus tard. La méthode d'ingestion en masse STMT colonnaire et l'aide schemaless vivent sur cette même connexion (seul le transport détient le handle STMT vivant, donc l'ingestion ne touche jamais un type spécifique à ws) :

```typescript
interface EonConnection {
  readonly transport: 'websocket'                                // futur : 'native'
  exec(sql: string): Promise<{ rowsAffected: number }>           // DDL/DML littéral
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>  // SELECT littéral
  ping(): Promise<void>
  ingestColumnar(request: EonColumnarIngest): Promise<{ rowsAffected: number }>
  schemaless(lines: readonly string[], options?: EonSchemalessOptions): Promise<void>
  close(): Promise<void>
}
```

### Arrêt

`close()` ferme le socket de la connexion, et c'est tout ce qu'une connexion
détient : une fois chaque connexion et chaque consommateur fermés, le process
peut sortir. `destroyEonConnector()` reste exporté pour le code qui l'appelle ;
il ne fait rien.

`exec` / `query` ne prennent que du **SQL littéral**. TDengine lie les placeholders positionnels `?` exclusivement via le chemin STMT (le travail d'ingestion en masse), donc le tableau `params` du compilateur n'est pas passé à `exec` — un statement compilé sans paramètre s'exécute en SQL littéral.

### Les timestamps sont des `BigInt`

`query()` mappe chaque ligne en un objet indexé par nom de colonne et garde les valeurs natives du connecteur. Un `TIMESTAMP` (et tout `BIGINT`) revient en **`BigInt`** — des millisecondes epoch en `PRECISION 'ms'` — jamais un `Date`. La coercition est laissée à la couche consommatrice, donc rien n'est silencieusement réduit en `double` lossy.

### Pourquoi ws-first, natif différé

Le spike 58-0 a mesuré l'ingestion STMT native à ~2× le chemin ws en loopback, franchissant la barre — mais ws-first tient. La production fait tourner l'app et TDengine dans des conteneurs séparés sur un unique hôte CapRover, donc le lien est en loopback (l'avantage du natif ne s'amplifie pas sans saut inter-machine), et ws maximise la maintenabilité (JS pur, pas de `libtaos`, pas de Rust en CI, pas de verrou glibc/musl) tout en atteignant déjà ~2,8M lignes/s. Un transport natif `taos` se branche derrière le seam `EonConnection` sans changement si l'ingestion devient un jour un goulot d'étranglement avéré ou si TDengine sort de l'hôte.

## Schéma — décorateurs & DDL

On modélise une super-table comme on modélise une `@Entity` Atlas — de façon déclarative. Les décorateurs enregistrent les métadonnées ; une façade fine compile ces métadonnées en vraie DDL TDengine (via le même compilateur Rust `eon-query`) et l'exécute sur une `EonConnection`.

```typescript
import { SuperTable, Timestamp, Column, Tag } from '@c9up/eon'

@SuperTable('meters')
class Meters {
  @Timestamp() declare ts: bigint
  @Column({ type: 'float' }) declare current: number
  @Column({ type: 'int' }) declare voltage: number
  @Tag({ type: 'int' }) declare groupid: number
  @Tag({ type: 'nchar', length: 24 }) declare location: string
}
```

TDengine a **trois** sortes de colonnes, donc eon ajoute un décorateur dont Atlas n'a pas besoin :

- `@SuperTable(name)` — marque la classe (miroir de `@Entity`).
- `@Timestamp(options?)` — la **première colonne `TIMESTAMP`** obligatoire, clé primaire. Exactement une par super-table (l'analogue eon de `@PrimaryKey`).
- `@Column(options?)` — une colonne métrique.
- `@Tag(options?)` — un tag, stocké dans un registre **séparé** (les tags TDengine n'ont pas d'analogue Atlas).

`type` est une chaîne **logique** (`float`, `int`, `bigint`, `smallint`, `tinyint`, `double`, `bool`, `string`/`varchar`, `nchar`, `varbinary`, `json`, `decimal`, `timestamp`) ; le compilateur la mappe vers le type physique TDengine. On relit le schéma via les getters — jamais `key in instance`, car les champs `@Column() declare x` sont effacés à l'exécution :

```typescript
getSuperTableMetadata(Meters) // → { name: 'meters' }
getTimestampColumn(Meters)    // → 'ts'
getColumnMetadata(Meters)     // → [{ propertyKey: 'ts', ... }, { propertyKey: 'current', ... }, ...]
getTagMetadata(Meters)        // → [{ propertyKey: 'groupid', ... }, ...]
```

### Table de types (logique → physique TDengine)

`timestamp`→`TIMESTAMP`, `int`/`integer`→`INT`, `bigint`→`BIGINT`, `smallint`→`SMALLINT`, `tinyint`→`TINYINT`, `float`→`FLOAT`, `double`→`DOUBLE`, `bool`/`boolean`→`BOOL`, `string`/`varchar`→`VARCHAR(n)`, `nchar`→`NCHAR(n)`, `binary`/`varbinary`→`VARBINARY(n)`, `json`→`JSON`, `decimal`→`DECIMAL(p[, s])`.

### Exécuter la DDL

```typescript
import { syncSuperTable, createChildTable, dropSuperTable, childTableName } from '@c9up/eon'

await syncSuperTable(conn, Meters)
// → CREATE STABLE IF NOT EXISTS `meters`
//     (`ts` TIMESTAMP, `current` FLOAT, `voltage` INT)
//     TAGS (`groupid` INT, `location` NCHAR(24))

// Table enfant explicite pour un jeu de tags (valeurs inlinées en littéraux SQL typés)
await createChildTable(conn, { EntityClass: Meters, name: 'd0', tags: [1, 'north'] })
// → CREATE TABLE IF NOT EXISTS `d0` USING `meters` TAGS (1, 'north')

// Un nom d'enfant déterministe pour un jeu de tags (création idempotente + routage stable)
childTableName(Meters, [1, 'north']) // → 't_031da91ff5add6466e2222f61b95a541'

await dropSuperTable(conn, Meters)   // → DROP STABLE IF EXISTS `meters`
```

Les tables enfants s'auto-créent aussi au premier insert (`INSERT INTO d1 USING meters TAGS (2) VALUES (...)`, la forme de la frontière de compilation ci-dessus) — `createChildTable` est la forme *explicite*.

#### Noms des tables enfants

Chaque chemin d'ingestion (STMT, SQL littéral, la factory de test) écrit un point dans l'enfant que `childTableName` nomme pour ses valeurs de tags. Ce nom est l'identité d'une série, et une valeur de tag vient souvent de l'extérieur (l'identifiant d'un appareil, un capteur nommé par un utilisateur) : il doit donc être impossible à forger. C'est `t_` suivi des 128 premiers bits d'un SHA-256 sur un encodage versionné, préfixé par les longueurs, du nom de la stable et de chaque valeur de tag. Trouver une autre valeur de tag qui tombe sur un enfant existant est hors de portée.

Jusqu'à eon 0.2.15 le nom était un FNV-1a 64 bits, qui ne résiste pas aux collisions : une valeur de tag choisie pour atteindre un enfant existant se calculait en une trentaine de secondes, et la forme `USING … TAGS` de TDengine écrit dans un enfant existant en ignorant les TAGS donnés, si bien que ces lignes étaient rangées sous les tags de l'autre série. Le changement donne un nouveau nom à chaque jeu de tags. Une base écrite par une version antérieure garde ses anciens enfants, et la prochaine ingestion ouvre un second enfant pour les mêmes tags. Déplace-les une fois, avant d'ingérer à nouveau :

```typescript
import { migrateChildTableNames } from '@c9up/eon'

const report = await migrateChildTableNames(conn, Meters, { dryRun: true })
// { renamed: [{ from: 't_…', to: 't_…', tags: [1, 'north'] }], current: [...], unmatched: [...] }
await migrateChildTableNames(conn, Meters)
```

Pour chaque enfant dont le nom est l'ancien nom de ses propres tags, il crée le nouvel enfant avec les mêmes tags, copie les lignes (`INSERT … SELECT`) et supprime l'ancien ; TDengine ne sait pas renommer une table enfant. Le relancer après une interruption est sans risque : une ligne copiée deux fois garde son horodatage, que TDengine écrase. Un enfant créé avec un `name` explicite, ou dont les tags se relisent dans un autre type JavaScript que celui ingéré (un `number` pour un tag BIGINT ingéré en `bigint`), figure dans `unmatched` et reste en place. `legacyChildTableName()` donne l'ancien nom d'un jeu de tags si tu déplaces les données toi-même.

`ALTER STABLE` compile une instruction par changement (`addColumn` / `dropColumn` / `modifyColumn` / `addTag` / `dropTag` / `modifyTag` / `renameTag`) :

```typescript
compileStatementNative({
  kind: 'alterStable',
  name: 'meters',
  changes: [{ op: 'addColumn', name: 'power', type: { kind: 'int' } }],
})
// → { statements: ['ALTER STABLE `meters` ADD COLUMN `power` INT'], params: [] }
```

### Règles de schéma (imposées dans le compilateur — erreurs typées, jamais de SQL erroné)

Le compilateur rejette, avec une erreur typée `E_*`, toute super-table qui viole une règle TDengine :

- la première colonne doit être `TIMESTAMP`, et exactement une colonne timestamp — `E_TS_REQUIRED` / `E_TS_DUPLICATE` ;
- au moins un tag — `E_TAGS_REQUIRED` ;
- `VARCHAR` / `NCHAR` / `VARBINARY` exigent une longueur `(n)`, `DECIMAL` une précision — `E_LENGTH_REQUIRED` ;
- `JSON` est **réservé aux tags** et doit être le **seul** tag — `E_JSON_TAG_RULE` ;
- `DECIMAL` ne peut pas être un tag — `E_TYPE_NOT_TAGGABLE` ;
- un nom utilisé à la fois comme colonne et comme tag — `E_NAME_COLLISION`.

`ALTER` ne fait qu'élargir : TDengine ne peut pas réduire une longueur de chaîne, changer un type de base (`INT`→`BIGINT`), ni modifier la clé primaire `TIMESTAMP`.

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

## Migrations & gestion du schéma

Faites évoluer un schéma de séries temporelles avec la même rigueur suivie que les
migrations atlas. Étendez `Migration`, pilotez le `EonSchema` fluide, puis
exécutez les fichiers via un `EonMigrationRunner`.

```typescript
// database/eon-migrations/0001_create_metrics.ts
import { Migration } from '@c9up/eon'

export default class extends Migration {
  up() {
    // Rétention base de données (KEEP / DURATION / PRECISION). KEEP >= 3 × DURATION.
    this.schema.createDatabase('metrics', {
      keep: '90d',
      duration: '10d',
      precision: 'ms',
    })
    this.schema.createStable('meters', (t) => {
      t.timestamp('ts')
      t.float('current')
      t.int('voltage')
      t.int('groupid').tag()          // `.tag()` reclasse la colonne en TAG
      t.nchar('location', 24).tag()
    }, { keep: '365d' })              // KEEP de STABLE optionnel (3.3.x+)
  }

  down() {
    this.schema.dropStable('meters')
  }
}
```

Le `StableBuilder` est volontairement **plus mince** que le `TableBuilder` d'atlas :
les colonnes TDengine n'ont pas de `DEFAULT`, pas de choix de `PRIMARY KEY` par
colonne (le premier `TIMESTAMP` est toujours la clé), pas de `UNIQUE`, pas de clés
étrangères, pas d'index secondaires SQL — donc `defaultTo` / `primary` / `unique` /
`references` / `increments` **n'ont pas d'équivalent et sont absents**. Méthodes de
colonne : `timestamp` / `int` / `bigInteger` / `float` / `double` / `bool` /
`varchar(n)` / `nchar(n)` / `binary(n)` / `decimal(p, s?)` / `json`, plus `.tag()`.
`alterStable` expose `addColumn(name).<type>()` / `modifyColumn` / `dropColumn` /
`addTag` / `modifyTag` / `dropTag` / `renameTag` ; `createDatabase` / `alterDatabase`
(une option par instruction) / `createTable` (basique, sans tags) / `dropTable` /
`raw(sql)`.

Chaque instruction est compilée en **Rust** (`compileStatementNative`) — les
identifiants via `quote_ident`, les valeurs d'options validées (durées, listes
blanches `PRECISION` / `CACHEMODEL` / `WAL_LEVEL`, `KEEP >= 3 × DURATION`). Le côté
TypeScript ne construit jamais de SQL par concaténation.

### Le runner

```typescript
import { EonMigrationRunner } from '@c9up/eon'

const runner = new EonMigrationRunner(conn, {
  migrationsDir: 'database/eon-migrations', // défaut
  tableName: 'ream_eon_migrations',         // défaut (ream_ = table système protégée)
})

await runner.migrate()   // exécute les migrations en attente (ordre des noms), enregistre chacune
await runner.status()    // [{ name, state: 'applied' | 'pending', batch? }]
await runner.rollback()  // annule le dernier lot (fichiers en ordre inverse), exécute down()
await runner.reset()     // annule tout
await runner.refresh()   // reset + migrate (alias : fresh)
await runner.dryRun()    // [{ name, sql[] }] — calcule le SQL, n'exécute rien
await runner.forceUnlock() // libère un verrou laissé par un process tué -> boolean
```

Comme atlas, chaque commande mutante s'exécute **sous un verrou de migration** :
deux processus qui démarrent en même temps ne peuvent pas migrer simultanément.
`refresh` tient un seul verrou sur tout le rollback + re-migration, pour qu'aucune
autre exécution ne s'engouffre dans l'intervalle. Ne passez `disableLocks: true`
que là où des exécutions concurrentes sont impossibles par construction.

**Trois déviations TDengine nommées par rapport à atlas :**

1. **Pas de transactions / pas de rollback moteur.** La DDL TDengine n'est pas
   transactionnelle, un lot ne peut donc pas être appliqué atomiquement. Le runner
   exécute les instructions **séquentiellement** ; un échec en cours de migration
   laisse les instructions précédentes appliquées. La mitigation est une DDL
   idempotente — `createStable` / `createDatabase` / `createTable` sont en
   `IF NOT EXISTS` par défaut, les drops en `IF EXISTS` — pour qu'une ré-exécution
   converge. `down()` est au mieux : certaines opérations (une extension de
   longueur `MODIFY`, les données d'une colonne supprimée) sont irréversibles.
2. **Pas de `UNIQUE`, pas d'auto-incrément.** La table de suivi est une table
   basique `ream_eon_migrations(executed_at TIMESTAMP, name VARCHAR(255), batch INT)` ;
   l'ensemble appliqué est dédupliqué **par nom en JS**, et chaque enregistrement
   est écrit avec un `executed_at` strictement croissant afin que le rollback puisse
   le supprimer par cette clé temporelle unique (TDengine n'autorise un prédicat
   `DELETE` que sur la colonne timestamp primaire).
3. **Le verrou est l'existence d'une table, pas la valeur d'une ligne.** atlas
   sérialise les runners avec un `UPDATE … WHERE is_locked = 0`
   conditionnel. TDengine n'a pas d'`UPDATE` conditionnel : cette forme exacte est
   impossible — mais la garantie, elle, ne l'est pas. `CREATE TABLE` **sans**
   `IF NOT EXISTS` est un compare-and-swap atomique : le mnode sérialise les
   métadonnées, donc sur N créateurs concurrents exactement un réussit et les
   autres reçoivent l'erreur `1539`. Créer `ream_eon_migrations_lock`, **c'est**
   prendre le verrou ; le supprimer le relâche, et `forceUnlock()` nettoie un
   verrou bloqué via le `DROP` symétrique sans `IF EXISTS` (`9731` = rien n'était
   tenu). Vérifié contre un TDengine 3.3.5.0 réel : huit runners concurrents,
   exactement un migre. L'API reste celle d'atlas (`disableLocks`, `forceUnlock`)
   — seul le primitif sous-jacent diffère.

> Hors périmètre : auto-diff de schéma / `db push` (le territoire `checkSchema`
> d'atlas) — il s'agit uniquement de migrations `up()`/`down()` versionnées.

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

## Versions épinglées

- Serveur TDengine : `3.3.6.13` (testé) ; `ingestMany` utilise stmt2 et demande `3.3.6.0` ou plus récent — sur un serveur plus ancien il échoue avec `E_EON_SERVER_VERSION`, tandis que `ingestSql` et `ingestSchemaless` fonctionnent toujours.
- Node : `24` ou plus récent (`WebSocket` intégré).
