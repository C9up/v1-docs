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

const created = users.create({
  id: crypto.randomUUID(),
  email: 'a@b.com',
  status: 'active',
})

await users.save(created)

const one = users.findOrFail(created.id)
users.updateById(created.id, { status: 'disabled' })
users.delete(created)
```

## Points de vigilance

- Toujours valider les données métier avant `save`.
- Préférer les méthodes typées du repo au SQL manuel.
- En cas de colonnes dynamiques, utiliser une whitelist explicite.
