# Colonnes et index

Ce guide couvre les types de colonnes, leurs modificateurs et les index :

- Types de colonnes
- Modificateurs de colonne
- Raccourcis
- Clés auto-incrémentées
- Index
- Index
- Schema Builder

## Types de colonnes

```ts
t.uuid('id')
t.string('email', 320)   // length par défaut 255
t.text('body')           // text(name, 'text' | 'mediumtext' | 'longtext')
t.integer('count')
t.tinyint('flags')       // MySQL TINYINT ; pg → SMALLINT ; SQLite → INTEGER
t.smallint('rank')       // SMALLINT sur pg/mysql ; INTEGER sur SQLite
t.mediumint('offset')    // MySQL MEDIUMINT ; pg/SQLite → INTEGER
t.bigInteger('bytes')
t.decimal('total', 10, 2)         // decimal(name, precision=10, scale=2)
t.float('ratio')                  // float(name, precision?, scale?)
t.double('lat', 10, 6)            // double(name, precision?, scale?)
t.boolean('active')
t.date('born_on')
t.time('opens_at', 3)             // time(name, precision?)
t.timestamp('seen_at', { useTz: true, precision: 6 })
t.dateTime('seen_at')             // alias de timestamp
t.timestamptz('seen_at')          // tz-aware ; normalise les writers en UTC sur pg
t.json('meta')                    // JSON sur pg (ordre des clés conservé), JSON sur MySQL, TEXT sur SQLite
t.jsonb('meta')                   // JSONB sur pg, JSON sur MySQL, TEXT sur SQLite
t.binary('blob', 1024)            // binary(name, length?)
t.enum('status', ['draft', 'live']) // ENUM natif sur MySQL ; TEXT + CHECK IN ailleurs
```

La précision et l'échelle de `float`/`double` rendent `FLOAT(p, s)` /
`DOUBLE(p, s)` **sur MySQL uniquement** — Postgres et SQLite ont des flottants à
largeur fixe et les ignorent. La précision de `time` / `timestamp` rend
`TIME(p)` / `TIMESTAMP(p)` et est ignorée sur SQLite. `t.enum` exige au moins une
valeur.

`specificType` est l'échappatoire pour un type qu'atlas n'expose pas :

```ts
t.specificType('location', 'geometry(Point, 4326)')
t.specificType('search', 'tsvector')
```

> Le type atterrit verbatim dans le DDL, donc le compilateur le valide contre une grammaire étroite (lettres,
> chiffres, espaces, `_`, et une seule liste d'arguments entre parenthèses) et
> rejette tout le reste avec `E_UNSAFE_SQL`.

## Modificateurs de colonne

```ts
t.string('email').notNullable()
t.string('nick').nullable()
t.string('status', 20).defaultTo('pending')  // littéral JS → quoté/échappé
t.integer('qty').unsigned()                   // MySQL UNSIGNED ; no-op sur pg/sqlite
t.string('code').comment('SKU')               // commentaire de colonne
t.string('name').collate('utf8mb4_bin')       // collation de colonne
t.string('mi').after('first_name')           // position de colonne, MySQL uniquement
t.string('id_col').first()                    // MySQL uniquement : placer en premier
```

`defaultTo` quote/échappe les littéraux JS. Pour une
expression SQL, l'envelopper dans `this.raw(...)` ou utiliser `this.now()` :

```ts
t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
t.timestamp('created_at').notNullable().defaultTo(this.now())
```

> `after` / `first` sont réservés à MySQL — Postgres et SQLite ajoutent toujours
> à la fin, et le compilateur lève `E_UNSUPPORTED` plutôt que d'ignorer
> silencieusement l'instruction.
>
> `comment` et `collate` ici sont les modificateurs **de colonne**, appelés sur
> le column builder que renvoie une méthode de type. Les formes au niveau table
> portent les mêmes noms sur le table builder — `t.comment(...)`,
> `t.collate(...)` : c'est le receveur qui les distingue.

## Raccourcis

```ts
t.timestamps()              // created_at + updated_at, NOT NULL DEFAULT CURRENT_TIMESTAMP
t.timestamps(true, false)   // timestamps(useTimestamps?, defaultToNow?)
t.dropTimestamps()          // drop created_at + updated_at (mode alter)
```

`timestamps()` utilise `CURRENT_TIMESTAMP`, que tous les dialectes comprennent,
donc il se porte inchangé. `useTimestamps: false` utilise `dateTime` ;
`defaultToNow: false` laisse les colonnes nullable sans default.

> Les helpers `id()` et les raccourcis à default Postgres existent pour les
> migrations d'app utilisateur où le dialecte cible est connu comme étant
> Postgres. `id()` défaut à `gen_random_uuid()`, que SQLite et MySQL ne
> fournissent pas — ne l'utilise **pas** dans une migration censée tourner sur
> n'importe quel dialecte. Écris la colonne explicitement et fournis l'UUID au
> moment de l'insert.

## Clés auto-incrémentées

```ts
t.increments('id')      // PK auto-incrémentée 32 bits (nom par défaut 'id')
t.bigIncrements('id')   // PK auto-incrémentée 64 bits
```

Le compilateur émet la clause d'identité adaptée au dialecte : SQLite
`AUTOINCREMENT`, Postgres `GENERATED … AS IDENTITY`, MySQL `AUTO_INCREMENT`. Les
deux marquent la colonne primaire et non-null.

## Index

```ts
this.schema.createIndex('users', ['email'], 'idx_users_email', true) // unique
this.schema.dropIndex('idx_users_email')
```

Les index se composent aussi dans un callback de table — voir `index` /
`uniqueIndex` ci-dessous.

---

# TableBuilder

L'objet passé au callback de `createTable` / `alterTable`.

## Index

```ts
t.index('email')                       // idx_<table>_email
t.index(['tenant_id', 'created_at'], 'idx_tenant_recent')
t.uniqueIndex('email')                 // CREATE UNIQUE INDEX idx_<table>_email_unique
```

Dans `alterTable`, un index ajouté à côté d'opérations de colonne compile en son
propre `CREATE INDEX`, ajouté dans l'ordre de déclaration.

## Schema Builder

Le Schema Builder définit les tables de la base de données dans le code. Il s'utilise à l'intérieur des méthodes `up()` et `down()` d'une migration via `this.schema`.

### Types de colonnes

```typescript
this.schema.createTable('orders', (table) => {
  table.id()                           // Clé primaire UUID (raccourci)
  table.uuid('external_ref')           // UUID
  table.string('status', 50)           // VARCHAR(50)
  table.text('notes')                  // TEXT
  table.integer('quantity')            // INTEGER
  table.bigInteger('views')            // BIGINT
  table.decimal('total', 10, 2)        // DECIMAL(10,2)
  table.boolean('active')              // BOOLEAN
  table.date('birthday')               // DATE
  table.timestamp('published_at')      // TIMESTAMP (sans tz — UTC seulement si écrit via atlas)
  table.timestamptz('occurred_at')     // TIMESTAMPTZ (Postgres) — normalisé UTC pour TOUS les writers
  table.json('metadata')               // JSON (Postgres) / TEXT (SQLite)
  table.jsonb('settings')              // JSONB (Postgres) / TEXT (SQLite)
  table.binary('avatar')               // BYTEA (Postgres) / BLOB (SQLite)
  table.timestamps()                   // created_at + updated_at (NOT NULL, DEFAULT CURRENT_TIMESTAMP)
})
```

> **`timestamp` vs `timestamptz`.** `timestamp` (sans time zone) ne round-trip en UTC
> que pour les valeurs écrites par atlas ; un `DEFAULT now()` côté DB, du SQL brut ou
> un seed stocke le wall-clock local du serveur, relu décalé sur un hôte non-UTC.
> **`timestamptz` normalise tous les writers en UTC** — à utiliser pour toute valeur
> comparée exactement ou toute colonne avec un défaut côté DB. Il se combine avec
> `@column.dateTime()` sans changement (décorateur découplé du type SQL). Sur
> MySQL/SQLite (pas de vrai type tz), `timestamptz` dégrade vers le mapping timestamp.

### Index

```typescript
this.schema.createTable('memberships', (table) => {
  table.uuid('id').primary()
  table.uuid('user_id').notNullable().references('users')
  table.uuid('residence_id').notNullable().references('residences')
  table.string('role', 30).notNullable()

  // Index sur une seule colonne
  table.index('user_id')

  // Index composite
  table.index(['user_id', 'residence_id'])

  // Index unique
  table.uniqueIndex('email')

  // Nom personnalisé
  table.index('status', 'idx_orders_status')
})
```

Dans un `alterTable`, un index se supprime comme il a été créé — par colonnes,
pour qu'un `down()` défasse un `up()` sans rien avoir à nommer :

```typescript
this.schema.alterTable('orders', (table) => {
  table.index(['user_id', 'status'])
})

this.schema.alterTable('orders', (table) => {
  table.dropIndex(['user_id', 'status'])
  table.dropIndex('status', 'un_nom_explicite')   // ou par nom
})
```

Un index n'est pas une contrainte de table, donc `dropIndex` n'est pas
`dropUnique` : un `uniqueIndex()` porte un nom par défaut différent, et le
supprimer demande de passer ce nom.

Opérations d'index autonomes, hors de toute table :

```typescript
this.schema.createIndex('orders', ['user_id', 'status'])
this.schema.dropIndex('idx_orders_status')
this.schema.dropIndex('idx_orders_status', 'orders')   // MySQL exige la table
```

MySQL n'a ni `DROP INDEX` autonome ni `IF EXISTS` dessus — un index s'y supprime
à travers sa table. Passez le nom de la table, ou utilisez la forme `alterTable`
ci-dessus, qui la connaît par construction.

### Modificateurs de colonnes

```typescript
table.string('email', 255)
  .notNullable()                  // NOT NULL
  .unique()                       // Contrainte UNIQUE
  .defaultTo('pending')           // DEFAULT 'pending'

table.timestamp('seen_at')
  .defaultTo(this.now())          // DEFAULT CURRENT_TIMESTAMP (SQLite) / NOW()

table.uuid('user_id')
  .references('users', 'id')      // FOREIGN KEY → users(id)
  .notNullable()
```

`defaultTo()` met entre quotes et échappe la valeur JavaScript pour vous : passez
`'pending'`, pas `"'pending'"`, sinon la valeur par défaut stockée est le texte
`'pending'` avec ses quotes. Une expression SQL passe par `this.raw('...')` (émise
telle quelle) ou `this.now()`.

### Méthodes raccourcis

| Méthode | Effet |
|---------|-------|
| `table.id()` | Clé primaire UUID avec défaut `gen_random_uuid()` |
| `table.timestamps()` | Ajoute `created_at` et `updated_at` (NOT NULL, DEFAULT CURRENT_TIMESTAMP, valide sur tous les dialectes) |
