# Contraintes

Ce guide couvre les contraintes, les clés étrangères et CHECK :

- Contraintes
- Contraintes CHECK
- Supprimer des contraintes (mode alter)

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

t.uuid('author_id').references('users.id')  // shorthand pointé
```

Un argument unique sans point est le nom de la table (la colonne défaut à `id`).

### Clés étrangères — chaîne composite

`foreign(...)` retourne un chaînable qui se lit colonnes locales, colonnes référencées, table, puis actions :

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
> que si la connexion enregistre une fonction `regexp`.

## Supprimer des contraintes (mode alter)

```ts
this.schema.alterTable('accounts', (t) => {
  t.dropPrimary()                                  // nom Postgres par défaut <table>_pkey
  t.dropUnique(['tenant_id', 'slug'])              // par colonnes (nom par défaut)
  t.dropUnique(['tenant_id', 'slug'], 'named_uq')  // ou par nom explicite
  t.dropForeign(['author_id'])                     // par colonnes ou nom explicite
})
```

Supprimer par liste de colonnes utilise la convention de nommage
`<table>_<columns>_<suffix>`, donc `unique([...])` / `dropUnique([...])` (et la
paire foreign) s'accordent sans rien nommer.
