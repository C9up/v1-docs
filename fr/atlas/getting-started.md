# Atlas - Démarrage Rapide

## Installer

```bash
pnpm add @c9up/atlas
```

## Définir une entité

```ts
import { BaseEntity, Entity, PrimaryKey, Column } from '@c9up/atlas'

@Entity('users')
export class User extends BaseEntity {
  @PrimaryKey() id!: string
  @Column() email!: string
  @Column() status!: string
}
```

## Brancher un repository

```ts
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'

export class UserService {
  constructor(private db: DatabaseConnection) {}

  repo() {
    return new BaseRepository(User, this.db)
  }
}
```

## CRUD de base

```ts
const users = service.repo()

const created = await users.create({
  id: crypto.randomUUID(),
  email: 'a@b.com',
  status: 'active',
})

await users.save(created)

const one = users.findOrFail(created.id)
users.updateById(created.id, { status: 'disabled' })
users.delete(created)
```

## Colonnes JSON

Déclarez le type et la valeur fait l'aller-retour en tant que valeur, dans les
deux sens :

```ts
@Entity('instruments')
class Instrument extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column({ type: 'jsonb' }) declare metadata: Record<string, unknown> | null
  @Column({ type: 'json' }) declare tags: string[] | null
}

instrument.tags = ['XSWX', 'XVTX']   // stocké en JSON, relu en tableau
```

Aucune paire `prepare` / `consume` à écrire. Le type déclaré est ce qui ajoute
le cast Postgres `::jsonb` ; c'est désormais aussi ce qui sérialise la valeur à
l'aller et la parse au retour — donc SQLite et MySQL, où la colonne est du
TEXT, s'accordent avec le pool Postgres natif, qui décode le JSON tout seul.

::: warning Une liste liée à une colonne non déclarée est refusée
Atlas refuse un tableau de premier niveau comme valeur unique : la cause de loin
la plus fréquente est une liste `IN` mal construite, et sur Postgres ces octets
sont lus comme un en-tête de tableau binaire — un nombre de dimensions absurde
au lieu d'une erreur de type. Déclarer la colonne est le correctif pour une
valeur JSON ; `whereIn(colonne, valeurs)` est le correctif pour une liste. Sur
une requête brute sans entité derrière, passez `JSON.stringify(valeur)`.

Knex n'est plus permissif que pour les objets : node-postgres sérialise un objet
simple tout seul, mais transforme un TABLEAU en littéral de tableau Postgres —
d'où le `prepare: JSON.stringify` qu'écrivent les applications Lucid pour une
liste.
:::

## Points de vigilance

- Toujours valider les données métier avant `save`.
- Préférer les méthodes typées du repo au SQL manuel.
- En cas de colonnes dynamiques, utiliser une whitelist explicite.

## Configuration

### Le hook `configure`

Atlas expose un point d'entrée `configure` que le framework exécute lorsque vous
ajoutez le paquet à un projet. Il branche le provider, initialise les variables
d'environnement de la base et écrit un `config/database.ts` de départ :

```ts
import { configure } from '@c9up/atlas'
```

Vous ne l'appelez pas à la main — la commande de configuration du framework
l'invoque et lui transmet les codemods nécessaires. Une fois exécuté, vous
disposez de :

- `@c9up/atlas/provider` enregistré.
- `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USER` / `DB_PASSWORD` ajoutés à votre environnement.
- Un `config/database.ts` avec une connexion Postgres construite depuis `DATABASE_URL`
  (ou les variables `DB_*` individuelles).

### Pragmas SQLite de production

Pour SQLite en production, diffusez (`spread`) `SQLITE_PROD_PRAGMAS` dans les
`pragmas` de votre connexion. C'est la recette WAL canonique — `journal_mode = WAL`
(les écritures ne bloquent pas les lecteurs) plus `synchronous = NORMAL` (un seul
fsync par commit), qui réduit la latence des INSERT d'environ 5 à 10x par rapport
aux valeurs par défaut de SQLite sans sacrifier la durabilité en cas de crash :

```ts
import { defineConfig, SQLITE_PROD_PRAGMAS } from '@c9up/atlas'

export default defineConfig({
  default: 'sqlite',
  connections: {
    sqlite: {
      url: 'sqlite:data/app.db',
      pragmas: { ...SQLITE_PROD_PRAGMAS, foreign_keys: 'ON' },
    },
  },
})
```

La constante est gelée (`frozen`), il faut donc la diffuser — les surcharges
propres à l'application (comme `foreign_keys`) restent ainsi littérales à ses côtés.

### Stratégie de nommage

Par défaut, Atlas fait correspondre les propriétés TS en camelCase aux colonnes DB
en snake_case, met les noms de tables au pluriel et dérive des clés étrangères
`<parent>_<pk>`. Ce comportement vit dans `CamelCaseNamingStrategy`, exposé via le
singleton `defaultNamingStrategy` et appliqué à toute entité qui ne s'en écarte pas.

Pour adapter Atlas à un schéma existant (colonnes en PascalCase, tables préfixées,
noms de pivots personnalisés), implémentez l'interface `NamingStrategy` et
attachez-la à une entité via un champ statique `namingStrategy` :

```ts
import { BaseEntity, Entity, CamelCaseNamingStrategy } from '@c9up/atlas'
import type { NamingStrategy } from '@c9up/atlas'

class LegacyStrategy extends CamelCaseNamingStrategy implements NamingStrategy {
  // Les tables héritées sont au singulier et en PascalCase : « AppUser », pas « app_users ».
  tableName(className: string): string {
    return className
  }
}

@Entity()
export class AppUser extends BaseEntity {
  static namingStrategy = new LegacyStrategy()
}
```

L'interface `NamingStrategy` couvre toute la surface :

- `tableName(className)` — nom de table pour une classe d'entité.
- `columnName(propertyName)` — colonne DB pour une propriété TS (`userId` → `user_id`).
- `propertyName(columnName)` — mapping inverse, utilisé lors de l'hydratation des lignes.
- `serializedName(propertyName)` — nom du champ émis par `toJSON()`.
- `relationLocalKey(kind, parentPk)` — clé locale pour une relation.
- `relationForeignKey(kind, parentClass, parentPk)` — clé étrangère du côté propriétaire.
- `relationPivotTable(aClass, bClass)` — table pivot par défaut pour un `manyToMany`.
- `paginationMetaKeys?()` — remappage optionnel des clés meta de `Paginator.toJSON()`.

Étendez `CamelCaseNamingStrategy` et ne surchargez que les hooks dont vous avez
besoin — les autres conservent le comportement par défaut.

La résolution parcourt la chaîne de prototypes : une sous-classe hérite de la
stratégie de son parent, sauf si elle déclare la sienne. `getNamingStrategy(entityClass)`
renvoie la stratégie en vigueur pour une classe donnée, avec repli sur
`defaultNamingStrategy` :

```ts
import { getNamingStrategy } from '@c9up/atlas'

const strategy = getNamingStrategy(AppUser)
strategy.tableName('AppUser') // 'AppUser'
```
