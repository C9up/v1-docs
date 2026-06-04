# Migrations

Atlas suit les modifications du schéma grâce à des fichiers de migration. Chaque migration est une classe TypeScript qui décrit comment appliquer (`up`) et annuler (`down`) un ensemble de modifications de la base de données à l'aide d'une API fluide de construction de schéma.

## Fonctionnement des migrations

Quand `AtlasProvider` démarre, il vérifie si `migrations.path` est défini dans votre `config/database.ts`. Si c'est le cas, Atlas :

1. Crée une table `_migrations` dans la base de données si elle n'existe pas encore.
2. Lit tous les fichiers `.ts` / `.js` du répertoire de migrations, triés par ordre alphabétique.
3. Ignore tout fichier dont le nom figure déjà dans `_migrations`.
4. Appelle `up()` sur chaque migration en attente et enregistre son nom dans `_migrations`.

L'annulation n'est pas automatique — vous appelez `down()` manuellement ou via une commande CLI.

## Configuration

```typescript
// config/database.ts
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  client: 'sqlite' as const,
  connection: {
    filename: join(__dirname, '..', 'data', 'app.db'),
  },
  migrations: {
    path: join(__dirname, '..', 'database', 'migrations'),
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
      t.boolean('published').notNullable().defaultTo('0')
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
| `id()` | Raccourci : `uuid('id').primary().defaultTo('gen_random_uuid()')` |
| `uuid(name)` | `UUID` / `TEXT` |
| `string(name, length?)` | `VARCHAR(n)` / `TEXT` — longueur par défaut 255 |
| `text(name)` | `TEXT` / `TEXT` |
| `integer(name)` | `INTEGER` / `INTEGER` |
| `bigInteger(name)` | `BIGINT` / `INTEGER` |
| `decimal(name, precision?, scale?)` | `DECIMAL(p, s)` / `REAL` — valeurs par défaut 10, 2 |
| `boolean(name)` | `BOOLEAN` / `INTEGER` |
| `date(name)` | `DATE` / `TEXT` |
| `timestamp(name)` | `TIMESTAMP` / `TEXT` |
| `timestamps()` | Raccourci : `created_at` + `updated_at` tous deux `NOT NULL DEFAULT NOW()` |
| `json(name)` | `JSONB` / `TEXT` |
| `binary(name)` | `BYTEA` / `BLOB` |

### Modificateurs de colonnes

Les modificateurs s'appliquent à la colonne définie par l'appel de colonne le plus récent.

| Modificateur | Effet |
|--------------|-------|
| `.primary()` | Marque la colonne comme `PRIMARY KEY` |
| `.notNullable()` | Ajoute la contrainte `NOT NULL` |
| `.nullable()` | Supprime `NOT NULL` (les colonnes sont nullables par défaut) |
| `.unique()` | Ajoute la contrainte `UNIQUE` |
| `.defaultTo(value)` | Définit une expression SQL brute par défaut |
| `.references(table, column?)` | Ajoute une référence de clé étrangère — `column` vaut `'id'` par défaut |

`defaultTo()` accepte une chaîne SQL brute, pas une valeur JavaScript. Utilisez des littéraux ou des fonctions SQL :

```typescript
t.boolean('active').notNullable().defaultTo('true')       // Postgres
t.boolean('active').notNullable().defaultTo('1')          // SQLite
t.timestamp('expires_at').defaultTo('NOW()')
t.string('role', 50).notNullable().defaultTo("'member'")
```

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

Consultez [Atlas — Système de dialectes](/fr/modules/atlas#système-de-dialectes) pour plus de détails.

## Exemple complet

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateMemberships extends Migration {
  up() {
    this.schema.createTable('memberships', (t) => {
      t.uuid('id').primary()
      t.uuid('user_id').notNullable().references('users', 'id')
      t.uuid('residence_id').notNullable().references('residences', 'id')
      t.string('role', 50).notNullable().defaultTo("'member'")
      t.boolean('active').notNullable().defaultTo('1')
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

Atlas utilise une table `_migrations` pour enregistrer les fichiers qui ont été appliqués :

```sql
CREATE TABLE "_migrations" (
  "name"        TEXT PRIMARY KEY,
  "executed_at" TEXT NOT NULL DEFAULT (datetime('now'))
);
```

La colonne `name` stocke le nom du fichier sans extension (par exemple `001_create_users`). Une migration est ignorée au prochain démarrage si son nom figure déjà dans cette table.

## Prochaines étapes

- [Atlas (ORM)](/fr/modules/atlas) — entités, repositories et query builder
- [Configuration](/fr/guide/configuration) — mise en place de la configuration de la base de données
- [Providers](/fr/guide/providers) — comment `AtlasProvider` s'intègre dans le cycle de démarrage
