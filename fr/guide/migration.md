# Migrations

Atlas suit les modifications du schéma grâce à des fichiers de migration. Chaque migration est une classe TypeScript qui décrit comment appliquer (`up`) et annuler (`down`) un ensemble de modifications de la base de données à l'aide d'une API fluide de construction de schéma.

## Fonctionnement des migrations

Démarrer l'application ne la migre pas. Les migrations s'exécutent quand vous lancez `ream migration:run`, qui :

1. Crée la table de suivi `ream_migrations` dans la base de données si elle n'existe pas encore.
2. Lit tous les fichiers `.ts` / `.js` du répertoire de migrations (`migrations.path`), triés par nom.
3. Ignore tout fichier dont le nom figure déjà dans `ream_migrations`.
4. Appelle `up()` sur chaque migration en attente et enregistre son nom dans `ream_migrations`, sous un nouveau numéro de batch.

L'annulation n'est jamais automatique : `ream migration:rollback` appelle `down()` sur le dernier batch.

Un hôte qui possède seul sa base de données (un conteneur qui démarre une fois, une application embarquée sur une base fichier) peut demander à `AtlasProvider` d'exécuter les migrations en attente au démarrage avec `migrations: { autoRun: true }`. L'option est désactivée par défaut, et ignorée en développement (`REAM_ENV`, ou à défaut `NODE_ENV`, valant `development`, `develop` ou `dev`). Voir [Quand les migrations tournent](/fr/atlas/migrations#quand-les-migrations-tournent).

## Configuration

```typescript
// config/database.ts
import app from '@c9up/ream/services/app'

export default {
  client: 'sqlite' as const,
  connection: {
    filename: app.makePath('data', 'app.db'),
  },
  migrations: {
    path: app.migrationsPath(),
  },
}
```

## Nommage des fichiers

Nommez les fichiers de migration avec un préfixe numérique à zéros de tête afin qu'ils soient triés et exécutés dans le bon ordre :

```
database/migrations/
  001_create_users.ts
  002_create_posts.ts
  003_create_comments.ts
```

## Écrire une migration

Étendez `Migration` depuis `@c9up/atlas` et implémentez `up()` et `down()`. La propriété `this.schema` vous donne accès à l'intégralité de l'API du schema builder.

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateUsers extends Migration {
  up() {
    this.schema.createTable('users', (t) => {
      t.uuid('id').primary()
      t.string('email', 255).notNullable().unique()
      t.string('first_name', 100).notNullable()
      t.string('last_name', 100).notNullable()
      t.string('phone', 30).nullable()
      t.string('password_hash', 255).notNullable()
      t.timestamps()
    })
  }

  down() {
    this.schema.dropTable('users')
  }
}
```

Une deuxième migration qui fait référence à la première :

```typescript
import { Migration } from '@c9up/atlas'

export default class CreatePosts extends Migration {
  up() {
    this.schema.createTable('posts', (t) => {
      t.uuid('id').primary()
      t.uuid('user_id').notNullable().references('users', 'id')
      t.string('title', 255).notNullable()
      t.text('body').notNullable()
      t.boolean('published').notNullable().defaultTo(false)
      t.timestamps()
    })
  }

  down() {
    this.schema.dropTable('posts')
  }
}
```

## API du schema builder

### Opérations sur les tables

| Méthode | Description |
|---------|-------------|
| `schema.createTable(name, callback)` | Crée une nouvelle table. Le callback reçoit un `TableBuilder`. |
| `schema.dropTable(name)` | Supprime la table (génère `DROP TABLE IF EXISTS`). |
| `schema.createIndex(table, columns, name?, unique?)` | Crée un index autonome. |
| `schema.dropIndex(name)` | Supprime un index. |
| `schema.raw(sql)` | Ajoute une instruction SQL brute à la migration en cours. |

### Types de colonnes

Toutes les méthodes de colonne s'appellent sur l'instance `TableBuilder` passée au callback de `createTable`. Chaque méthode renvoie `this` pour permettre le chaînage des modificateurs.

| Méthode | Type SQL (Postgres / SQLite) |
|---------|------------------------------|
| `id()` | Raccourci : `uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'))` |
| `uuid(name)` | `UUID` / `TEXT` |
| `string(name, length?)` | `VARCHAR(n)` / `TEXT` — longueur par défaut 255 |
| `text(name)` | `TEXT` / `TEXT` |
| `integer(name)` | `INTEGER` / `INTEGER` |
| `bigInteger(name)` | `BIGINT` / `INTEGER` |
| `decimal(name, precision?, scale?)` | `DECIMAL(p, s)` / `REAL` — valeurs par défaut 10, 2 |
| `boolean(name)` | `BOOLEAN` / `INTEGER` |
| `date(name)` | `DATE` / `TEXT` |
| `timestamp(name)` | `TIMESTAMP` / `TEXT` |
| `timestamps()` | Raccourci : `created_at` + `updated_at` tous deux `NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `json(name)` | `JSON` / `TEXT` |
| `jsonb(name)` | `JSONB` / `TEXT` |
| `binary(name)` | `BYTEA` / `BLOB` |

### Modificateurs de colonnes

Les modificateurs s'appliquent à la colonne définie par l'appel de colonne le plus récent.

| Modificateur | Effet |
|--------------|-------|
| `.primary()` | Marque la colonne comme `PRIMARY KEY` |
| `.notNullable()` | Ajoute la contrainte `NOT NULL` |
| `.nullable()` | Supprime `NOT NULL` (les colonnes sont nullables par défaut) |
| `.unique()` | Ajoute la contrainte `UNIQUE` |
| `.defaultTo(value)` | Définit une valeur par défaut de colonne — les littéraux JS sont mis entre quotes, les expressions SQL utilisent `raw()` |
| `.references(table, column?)` | Ajoute une référence de clé étrangère — `column` vaut `'id'` par défaut |

### Valeurs par défaut des colonnes

`defaultTo()` distingue littéraux et expressions : un **littéral** JavaScript est mis entre quotes et échappé pour vous, tandis qu'une **expression** SQL provient de `this.now()` (timestamps) ou `db.raw(...)` (`Database.raw` / `db.raw`).

```typescript
import db from '@c9up/atlas/services/db'

// Littéraux — mis entre quotes automatiquement
t.text('role').notNullable().defaultTo('member')      // → DEFAULT 'member'
t.integer('count').notNullable().defaultTo(0)         // → DEFAULT 0
t.boolean('active').notNullable().defaultTo(true)     // → DEFAULT true

// Expressions SQL — this.now() pour les timestamps, db.raw() pour toute autre fonction
t.timestamp('created_at').notNullable().defaultTo(this.now())          // NOW() / CURRENT_TIMESTAMP
t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'))
```

::: warning Pas de quotes à la main
`defaultTo()` met lui-même une string entre quotes, donc un littéral quoté à la main garde ses quotes : `defaultTo("'member'")` stocke les caractères `'member'`, quotes comprises. Une fonction SQL passée en string est elle aussi un littéral : `defaultTo('NOW()')` stocke le texte `NOW()`. Passez les littéraux tels quels et les expressions par `this.now()` / `db.raw(...)` ; `db.raw()` renvoie un `RawSql` (le même type raw que dans les requêtes).
:::

## Index

Ajoutez des index à l'intérieur de `createTable` :

```typescript
this.schema.createTable('memberships', (t) => {
  t.uuid('id').primary()
  t.uuid('user_id').notNullable().references('users')
  t.uuid('residence_id').notNullable().references('residences')

  t.index('user_id')                           // colonne unique
  t.index(['user_id', 'residence_id'])          // composite
  t.uniqueIndex('email')                        // unique
  t.index('status', 'idx_custom_name')          // nom personnalisé
})
```

Ou en opérations autonomes :

```typescript
this.schema.createIndex('orders', ['user_id', 'status'])
this.schema.dropIndex('idx_orders_status')
```

## Support des dialectes

Le même code de migration fonctionne avec PostgreSQL, SQLite, MySQL et MariaDB. Le dialecte est déterminé par `config/database.ts` :

```typescript
export default {
  client: 'mysql',  // 'postgres' | 'sqlite' | 'mysql' | 'mariadb'
  // ...
}
```

Consultez [Atlas — Système de dialectes](/fr/modules/atlas#systeme-de-dialectes) pour plus de détails.

## Exemple complet

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateMemberships extends Migration {
  up() {
    this.schema.createTable('memberships', (t) => {
      t.uuid('id').primary()
      t.uuid('user_id').notNullable().references('users', 'id')
      t.uuid('residence_id').notNullable().references('residences', 'id')
      t.string('role', 50).notNullable().defaultTo('member')
      t.boolean('active').notNullable().defaultTo(true)
      t.json('permissions').nullable()
      t.timestamps()
    })
  }

  down() {
    this.schema.dropTable('memberships')
  }
}
```

## Suivi des migrations

Atlas enregistre les fichiers appliqués dans une table `ream_migrations` (renommable avec `migrations.tableName`). Elle a quatre colonnes :

| Colonne | Contenu |
|---------|---------|
| `id` | Clé primaire auto-incrémentée |
| `name` | Le nom du fichier sans extension (par exemple `001_create_users`), unique |
| `batch` | L'exécution qui l'a appliquée ; `migration:rollback` annule le dernier batch |
| `executed_at` | Horodatage, `CURRENT_TIMESTAMP` par défaut |

Une migration est ignorée au prochain `migration:run` si son nom figure déjà dans cette table. Une seconde table, `ream_migrations_lock`, porte le verrou qui empêche deux exécutions de migrer la même base en même temps.

## Prochaines étapes

- [Atlas (ORM)](/fr/modules/atlas) — entités, repositories et query builder
- [Configuration](/fr/guide/configuration) — mise en place de la configuration de la base de données
- [Providers](/fr/guide/providers) — comment `AtlasProvider` s'intègre dans le cycle de démarrage
