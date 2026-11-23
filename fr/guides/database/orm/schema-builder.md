# Schema builder

Ce guide couvre le schema builder :

- Cycle de vie d'une table
- Modifier une table
- Vérifications d'existence
- Vues
- Schémas Postgres
- Options de table MySQL

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

`createTableLike` copie la structure d'une table.
Son callback optionnel ajoute des colonnes à la copie via un `ALTER TABLE` de
suivi :

```ts
this.schema.createTableLike('users_archive', 'users', (t) => {
  t.timestamp('archived_at')
})
```

> Portabilité : Postgres copie tout (`INCLUDING ALL`), MySQL utilise `LIKE`, et
> SQLite copie **les colonnes uniquement** — pas de contraintes ni d'index.

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
> réécrire la table dans votre dos.

`.alter()` ne déplace la nullabilité que si `.nullable()` / `.notNullable()` a été
appelé sur la même colonne — un `t.string('x').alter()` nu change le type et
laisse la contrainte `NOT NULL` exactement telle quelle.

Les helpers réservés au mode alter (`alter`, `dropColumn(s)`, `renameColumn`,
`setNullable`, `dropNullable`, `dropPrimary`, `dropUnique`, `dropForeign`,
`dropChecks`, `dropTimestamps`) lèvent `E_ALTER_MISUSE` s'ils sont appelés dans
`createTable` — une table neuve n'a rien à modifier.

## Vérifications d'existence

`hasTable` / `hasColumn` exécutent une requête live sur le catalogue,
donc ils reflètent les migrations déjà appliquées. Ils sont `async`
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
changement. Il est chaînable :

```ts
this.schema
  .withSchema('reporting')
  .createTable('metrics', (t) => { t.increments('id') })
// → "reporting"."metrics"
```

## Options de table MySQL

Ignorées sur Postgres et SQLite :

```ts
this.schema.createTable('events', (t) => {
  t.increments('id')
  t.engine('InnoDB')
  t.charset('utf8mb4')
  t.collate('utf8mb4_unicode_ci')
  t.comment('journal d\'événements append-only')
})
```

`collate` / `comment` sur le **table builder** sont les options de table ; les
mêmes noms sur un **column builder** (`t.string('x').comment(...)`) sont les
modificateurs de colonne.
