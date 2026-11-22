# Introduction

Ce guide couvre les séries temporelles avec eon et TDengine :

- La frontière de compilation
- Provider
- Transport / connexion
- Versions épinglées

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

Les clauses à fenêtre temporelle (`INTERVAL` / `SLIDING` / `FILL` / `PARTITION BY`), les fonctions de sélection et les pseudo-colonnes `_wstart` / `_wend` / `_wduration` compilent aussi — on construit rarement ces specs à la main ; voir [Requêtes séries temporelles](/fr/guides/database/time-series/data#requetes-series-temporelles) pour le builder fluide qui les produit.

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

## Versions épinglées

- Serveur TDengine : `3.3.6.13` (testé) ; `ingestMany` utilise stmt2 et demande `3.3.6.0` ou plus récent — sur un serveur plus ancien il échoue avec `E_EON_SERVER_VERSION`, tandis que `ingestSql` et `ingestSchemaless` fonctionnent toujours.
- Node : `24` ou plus récent (`WebSocket` intégré).
