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

Une colonne qui contient un document JSON garde sa forme JavaScript des deux
côtés :

```ts
@Entity('instruments')
class Instrument extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column.json() declare metadata: Record<string, unknown> | null
  @Column.json({ type: 'json' }) declare tags: string[] | null
}

instrument.metadata = { isin: 'CH0012032048' }
instrument.tags = ['XSWX', 'XVTX']
await repo.save(instrument)

const found = await repo.find(instrument.id)
found.tags        // ['XSWX', 'XVTX'] — un tableau, pas une chaîne
```

Atlas sérialise la valeur à l'écriture de la ligne et la parse à la lecture.
Rien à convertir à la main dans l'application, et les trois dialectes se
comportent pareil : Postgres décode le JSON lui-même, SQLite et MySQL stockent
du texte.

`@Column.json()` déclare du `jsonb` ; passez `{ type: 'json' }` pour la forme
textuelle. Le type est aussi ce qui ajoute le cast Postgres `::jsonb`, donc
`@Column({ type: 'jsonb' })` fait la même chose — le décorateur le dit à un seul
endroit et ne peut pas être mal orthographié.

Donnez à la colonne ses propres `prepare` / `consume` quand le document demande
un autre encodage ; les vôtres l'emportent sur l'automatique :

```ts
@Column.json({
  prepare: (value) => encrypt(JSON.stringify(value)),
  consume: (value) => JSON.parse(decrypt(value as string)),
})
declare secrets: Record<string, string>
```

Un `null` reste `null` — il n'est jamais stocké comme la chaîne `"null"`. Sur
SQLite, où la colonne est du TEXT et où rien n'impose la forme, un texte qui ne
se parse pas revient en chaîne brute plutôt que de faire échouer toute la ligne:
les autres colonnes restent lisibles, et rien n'est réécrit.

::: warning Une liste liée à une colonne non déclarée JSON est refusée
Atlas refuse un tableau de premier niveau comme valeur unique :

```
[E_ARRAY_PARAM] Parameter $1 is an array, which cannot be bound as a single value.
```

La cause habituelle est une liste destinée à un `IN` — et sur Postgres ces
octets sont lus comme un en-tête de tableau binaire, qui rapporte un nombre de
dimensions absurde au lieu d'une erreur de type. Utilisez
`whereIn(colonne, valeurs)` pour une liste, et déclarez la colonne pour une
valeur JSON. Sur une requête brute sans entité derrière, passez
`JSON.stringify(valeur)`.
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
