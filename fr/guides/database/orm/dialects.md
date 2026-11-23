# Dialectes

Ce guide couvre les dialectes SQL et le choix de l’un d’eux :

- Dialectes supportés
- Configuration
- Retry & timeout de connexion
- Ajouter un nouveau dialecte

## Système de dialectes

Atlas supporte SQLite, PostgreSQL et MySQL/MariaDB. Les différences de dialecte (quoting d'identifiants, mapping de types, format de placeholders) sont gérées par le crate Rust `ream-query` — il n'y a **aucune implémentation de dialecte côté TypeScript**. Le même code d'entité, de requête et de migration fonctionne sur n'importe quel backend supporté.

### Dialectes supportés

| Dialecte | Identifiant | Placeholders | Notes |
|----------|-------------|--------------|-------|
| `sqlite` | `"col"` | `?` | Mapping de types : TEXT / INTEGER / REAL / BLOB |
| `postgres` | `"col"` | `$N` | Support complet, JSONB, RETURNING |
| `mysql` | `` `col` `` | `?` | VARCHAR, TINYINT(1) pour les booléens, backticks |

`mariadb` est un alias de `mysql`.

### Configuration

Le dialecte est détecté automatiquement à partir du schéma de l'URL de connexion. Vous ne le définissez jamais directement :

```typescript
// config/database.ts
export default {
  // sqlite: → Dialect.Sqlite
  url: 'sqlite:data/app.db',

  // postgres:// → Dialect.Postgres
  // url: 'postgres://user:pass@localhost/mydb',

  // mysql:// → Dialect.Mysql
  // url: 'mysql://user:pass@localhost/mydb',

  poolMin: 1,
  poolMax: 10,
  migrations: { path: './database/migrations' },
}
```

`AtlasProvider` appelle `setAtlasDialect(...)` au démarrage selon le schéma de l'URL. L'état module-level garantit que `BaseRepository`, `ModelQuery`, `QueryBuilder` et `SchemaBuilder` récupèrent tous le bon dialecte sans configuration.

Si vous avez besoin de forcer le dialecte par code (par exemple dans un setup de tests multi-tenant) :

```typescript
import { setAtlasDialect, getAtlasDialect } from '@c9up/atlas'

setAtlasDialect('postgres')
const current = getAtlasDialect() // 'postgres'
```

### Retry & timeout de connexion

Par défaut, la connexion initiale est une **tentative unique** : si la DB est
injoignable au boot, atlas échoue immédiatement. Trois réglages opt-in permettent
de retenter — utile quand la base démarre un instant après l'app (docker-compose /
k8s) ou pour un blip réseau au démarrage :

```typescript
// config/database.ts
export default {
  url: 'postgres://user:pass@db/mydb',
  poolMin: 1,
  poolMax: 10,

  connectRetries: 5,       // tentatives supplémentaires si le 1er connect échoue (défaut 0)
  connectBackoffMs: 500,   // backoff de base entre tentatives — exponentiel, plafonné 30s (défaut 200)
  connectTimeoutMs: 2000,  // timeout d'acquire par tentative (voir note) — absent ⇒ défaut sqlx (~30s)
}
```

Avec ça, atlas tente jusqu'à 6 fois, chaque tentative abandonnant après 2s, en
attendant 500ms → 1s → 2s → … entre elles.

> **Pourquoi `connectTimeoutMs` est important.** sqlx retente déjà *l'établissement*
> de la connexion en interne pendant toute la durée de son acquire timeout (~30s par
> défaut). Donc sans `connectTimeoutMs`, chacune de vos tentatives `connectRetries`
> peut bloquer ~30s avant d'abandonner — `connectRetries: 5` ferait ~150s. Baisser
> `connectTimeoutMs` fait échouer chaque tentative vite, pour que les retries pollent
> à la cadence voulue.

Les mêmes réglages sont disponibles par connexion nommée (sous `connections.<name>`)
et sur le bas niveau `createNapiConnection(url, poolMin, poolMax, pragmas, { retries, backoffMs, timeoutMs })`.

### Ajouter un nouveau dialecte

Les nouveaux dialectes s'ajoutent en étendant l'enum `Dialect` dans le crate Rust `ream-query` (`crates/ream-query/src/dialect.rs`) — pas en TypeScript. Implémentez `quote_ident`, `placeholder` et `map_column_type` pour le nouveau variant, recompilez le binaire NAPI, et toute la surface TS le prend en charge automatiquement.
