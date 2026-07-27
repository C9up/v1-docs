# Atlas - Schema Builder

Le schema builder est la surface DDL utilisée à l'intérieur des migrations.
Chaque méthode ajoute des instructions compilées (via le compilateur Rust —
aucune chaîne SQL n'est construite en TS) que le runner de migration envoie à la
base. Dans une migration, on y accède par `this.schema`, et le callback par
colonne reçoit un `TableBuilder` :

```ts
import { BaseSchema } from '@c9up/atlas'

export default class CreateOrders extends BaseSchema {
  async up() {
    this.schema.createTable('orders', (table) => {
      table.increments('id')
      table.string('status', 50).notNullable().defaultTo('pending')
      table.decimal('total', 10, 2).notNullable()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable('orders')
  }
}
```

Cette page est la référence pour tout ce qui va au-delà d'un simple
`createTable`.

## Cycle de vie d'une table

```ts
this.schema.createTable('users', (t) => { t.increments('id') })
this.schema.createTableIfNotExists('users', (t) => { t.increments('id') })
this.schema.renameTable('users', 'accounts')
this.schema.dropTable('accounts')          // erreur si absente
this.schema.dropTableIfExists('accounts')  // no-op si absente
```

`createTableLike` copie la structure d'une table (Lucid/Knex `createTableLike`).
Son callback optionnel ajoute des colonnes à la copie via un `ALTER TABLE` de
suivi :

```ts
this.schema.createTableLike('users_archive', 'users', (t) => {
  t.timestamp('archived_at')
})
```

> Portabilité : Postgres copie tout (`INCLUDING ALL`), MySQL utilise `LIKE`, et
> SQLite copie **les colonnes uniquement** — pas de contraintes ni d'index, la
> même limitation que celle documentée par Knex.

## Modifier une table

`alterTable` (alias `table`) ouvre le builder en mode `alter`. Une méthode de
type de colonne devient un `ADD COLUMN` ; `.alter()` transforme l'ajout en
attente en changement de type ; les helpers drop/rename/nullability font ce
qu'ils disent. Les opérations se compilent dans l'ordre d'appel.

```ts
this.schema.alterTable('users', (t) => {
  t.string('nickname', 40)              // ADD COLUMN
  t.string('email', 320).notNullable().alter()  // change le type
  t.renameColumn('bio', 'about')
  t.dropColumn('legacy_flag')
  t.dropColumns('col_a', 'col_b')       // supprimées dans l'ordre d'appel
})
```

Un `alterTable` avec un callback vide lève `E_ALTER_EMPTY` — un `ALTER` no-op est
un bug de l'appelant, pas un skip silencieux.

### Nullabilité

```ts
this.schema.alterTable('users', (t) => {
  t.setNullable('middle_name')   // DROP NOT NULL
  t.dropNullable('email')        // SET NOT NULL
})
```

> `setNullable` / `dropNullable` sont **réservés à Postgres** — Postgres est le
> seul dialecte dont la syntaxe n'a pas besoin du type de la colonne, et atlas
> compile le SQL de façon synchrone sans aller-retour pour le récupérer. Sur
> MySQL, redéclarer le type avec `t.<type>('col').nullable().alter()` ; SQLite ne
> peut pas modifier une colonne en place du tout. Les deux lèvent `E_UNSUPPORTED`
> en indiquant l'alternative.
>
> `.alter()` sur SQLite est de même rejeté avec `E_UNSUPPORTED` plutôt que de
> réécrire la table dans ton dos.

`.alter()` ne déplace la nullabilité que si `.nullable()` / `.notNullable()` a été
appelé sur la même colonne — un `t.string('x').alter()` nu change le type et
laisse la contrainte `NOT NULL` exactement telle quelle.

Les helpers réservés au mode alter (`alter`, `dropColumn(s)`, `renameColumn`,
`setNullable`, `dropNullable`, `dropPrimary`, `dropUnique`, `dropForeign`,
`dropChecks`, `dropTimestamps`) lèvent `E_ALTER_MISUSE` s'ils sont appelés dans
`createTable` — une table neuve n'a rien à modifier.

## Vérifications d'existence

`hasTable` / `hasColumn` exécutent une requête live sur le catalogue (parité
Lucid/Knex), donc ils reflètent les migrations déjà appliquées. Ils sont `async`
et nécessitent la connexion que le runner attache dans une migration — les
appeler sur un `Schema` autonome lève `E_NO_CONNECTION`.

```ts
async up() {
  if (!(await this.schema.hasColumn('users', 'timezone'))) {
    this.schema.alterTable('users', (t) => t.string('timezone', 64))
  }
}
```

> Ils voient le catalogue live, **pas** les instructions que cette même migration
> n'a fait que mettre en tampon — celles-ci s'exécutent après le retour de
> `up()`.

## Vues

```ts
this.schema.createView('active_users', 'SELECT * FROM users WHERE active = true')
this.schema.createView('u', 'SELECT id, email FROM users', { columns: ['id', 'email'] })
this.schema.createViewOrReplace('active_users', 'SELECT * FROM users WHERE active')
this.schema.dropView('active_users')          // erreur si absente
this.schema.dropViewIfExists('active_users')  // no-op si absente
this.schema.renameView('active_users', 'live_users')
```

Le `select` est du SQL brut écrit par le développeur et embarqué verbatim — le
même niveau de confiance que `raw`, donc ne jamais le construire à partir d'une
entrée utilisateur. Le nom de la vue et la liste de colonnes sont validés et
quotés par le compilateur.

`createViewOrReplace` est rejeté sur SQLite. `alterView` (alias `view`) renomme
les colonnes d'une vue et est **réservé à Postgres** — ailleurs, drop puis
re-création :

```ts
this.schema.alterView('active_users', (v) => {
  v.column('id').rename('user_id')
})
```

### Vues matérialisées (Postgres uniquement)

```ts
this.schema.createMaterializedView('sales_by_day',
  'SELECT date, SUM(total) AS total FROM orders GROUP BY date')
this.schema.refreshMaterializedView('sales_by_day')
this.schema.refreshMaterializedView('sales_by_day', true) // CONCURRENTLY
this.schema.dropMaterializedView('sales_by_day')
this.schema.dropMaterializedViewIfExists('sales_by_day')
```

## Schémas Postgres

```ts
this.schema.createSchema('reporting')
this.schema.createSchemaIfNotExists('reporting')
this.schema.dropSchema('reporting')            // dropSchema(name, cascade?)
this.schema.dropSchema('reporting', true)      // DROP SCHEMA … CASCADE (pg uniquement)
this.schema.dropSchemaIfExists('reporting', true)
```

`CREATE SCHEMA` vise Postgres et MySQL (où un schéma est une base de données) ;
il est rejeté sur SQLite, qui n'a pas de schémas. `CASCADE` est réservé à
Postgres.

`withSchema` qualifie chaque méthode prenant une table par la suite, jusqu'à
changement (parité Lucid/Knex). Il est chaînable :

```ts
this.schema
  .withSchema('reporting')
  .createTable('metrics', (t) => { t.increments('id') })
// → "reporting"."metrics"
```

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

## Clés auto-incrémentées

```ts
t.increments('id')      // PK auto-incrémentée 32 bits (nom par défaut 'id')
t.bigIncrements('id')   // PK auto-incrémentée 64 bits
```

Le compilateur émet la clause d'identité adaptée au dialecte : SQLite
`AUTOINCREMENT`, Postgres `GENERATED … AS IDENTITY`, MySQL `AUTO_INCREMENT`. Les
deux marquent la colonne primaire et non-null.

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
t.json('meta')
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

> Contrairement au pass-through direct de Knex, le type atterrit verbatim dans le
> DDL, donc le compilateur le valide contre une grammaire étroite (lettres,
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

`defaultTo` quote/échappe les littéraux JS (sémantique Lucid/Knex). Pour une
expression SQL, l'envelopper dans `this.raw(...)` ou utiliser `this.now()` :

```ts
t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
t.timestamp('created_at').notNullable().defaultTo(this.now())
```

> `after` / `first` sont réservés à MySQL — Postgres et SQLite ajoutent toujours
> à la fin, et le compilateur lève `E_UNSUPPORTED` plutôt que d'ignorer
> silencieusement l'instruction.
>
> `comment` et `collate` ici sont les modificateurs **de colonne** ; les formes
> au niveau table sont `tableComment` / `tableCollate` (atlas aplatit les
> modificateurs de colonne sur le table builder, d'où des noms distincts plutôt
> qu'une déduction par contexte).

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

## Contraintes

`primary` / `unique` sans argument marquent la colonne courante ; avec une liste
de colonnes ils déclarent une contrainte de table composite :

```ts
t.uuid('id').primary()
t.string('email').unique()

t.primary(['tenant_id', 'user_id'])
t.unique(['tenant_id', 'slug'], 'accounts_tenant_slug_unique')
```

> `unique([...])` est une vraie **contrainte** `UNIQUE`, distincte de
> `uniqueIndex`, qui émet un `CREATE UNIQUE INDEX` séparé.

### Clés étrangères — colonne unique

Déclarées comme modificateurs de colonne, à la suite de `references` :

```ts
t.uuid('author_id')
  .references('users', 'id')       // forme atlas : (table, column='id')
  .onDelete('cascade')
  .onUpdate('restrict')

t.uuid('author_id').references('users.id')  // shorthand pointé Lucid/Knex
```

Un argument unique sans point est le nom de la table (la colonne défaut à `id`).

### Clés étrangères — chaîne composite

`foreign(...)` retourne un chaînable qui se lit dans l'ordre Knex :

```ts
t.foreign(['tenant_id', 'user_id'])
  .references(['tenant_id', 'id'])
  .inTable('members')
  .onDelete('cascade')
  .onUpdate('cascade')
```

`onDelete` / `onUpdate` prennent une action référentielle
(`cascade` | `restrict` | `set null` | `no action` | `set default`).

## Contraintes CHECK

Chaque helper `check*` suit une définition de colonne et y épingle un prédicat.
Les valeurs sont quotées, jamais interpolées brutes :

```ts
t.integer('qty').checkPositive()               // CHECK (qty > 0)
t.integer('delta').checkNegative()             // CHECK (delta < 0)
t.string('role').checkIn(['admin', 'user'])    // CHECK (role IN (...))
t.string('tier').checkNotIn(['banned'])
t.integer('age').checkBetween([18, 120])       // CHECK (age BETWEEN 18 AND 120)
t.integer('score').checkBetween([[0, 40], [60, 100]]) // plusieurs intervalles en OR
t.string('code').checkLength('=', 8)           // CHECK (LENGTH(code) = 8)
t.string('slug').checkRegex('^[a-z-]+$')       // CHECK (slug ~ 'pattern')
```

Chacun accepte un nom de contrainte optionnel en dernier argument. L'opérateur de
`checkLength` est allow-listé par le compilateur. `check(predicate, name?)` est
l'échappatoire libre — le prédicat est émis **verbatim** (aussi digne de
confiance que `raw`), donc préférer les helpers typés, sûrs par construction :

```ts
t.check('price >= cost', 'chk_margin')
```

Supprimer des checks nommés en mode `alter` :

```ts
this.schema.alterTable('products', (t) => t.dropChecks('chk_margin'))
```

> `checkRegex` est `~` sur Postgres et `REGEXP` sur MySQL/SQLite. SQLite parse
> `REGEXP` mais ne fournit aucune implémentation — la contrainte ne fonctionne
> que si la connexion enregistre une fonction `regexp` (comme Knex).

## Supprimer des contraintes (mode alter)

```ts
this.schema.alterTable('accounts', (t) => {
  t.dropPrimary()                                  // nom Postgres par défaut <table>_pkey
  t.dropUnique(['tenant_id', 'slug'])              // par colonnes (nom par défaut)
  t.dropUnique(['tenant_id', 'slug'], 'named_uq')  // ou par nom explicite
  t.dropForeign(['author_id'])                     // par colonnes ou nom explicite
})
```

Supprimer par liste de colonnes utilise la convention de nommage Knex
`<table>_<columns>_<suffix>`, donc `unique([...])` / `dropUnique([...])` (et la
paire foreign) s'accordent sans rien nommer.

## Index

```ts
t.index('email')                       // idx_<table>_email
t.index(['tenant_id', 'created_at'], 'idx_tenant_recent')
t.uniqueIndex('email')                 // CREATE UNIQUE INDEX idx_<table>_email_unique
```

Dans `alterTable`, un index ajouté à côté d'opérations de colonne compile en son
propre `CREATE INDEX`, ajouté dans l'ordre de déclaration.

## Options de table MySQL

Ignorées sur Postgres et SQLite :

```ts
this.schema.createTable('events', (t) => {
  t.increments('id')
  t.engine('InnoDB')
  t.charset('utf8mb4')
  t.tableCollate('utf8mb4_unicode_ci')
  t.tableComment('journal d\'événements append-only')
})
```

`tableCollate` / `tableComment` portent un nom distinct des modificateurs **de
colonne** `collate` / `comment` parce qu'atlas aplatit les modificateurs de
colonne sur le même builder.
