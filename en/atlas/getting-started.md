# Atlas - Getting Started

## Install

```bash
pnpm add @c9up/atlas
```

## Define an entity

```ts
import { BaseEntity, Entity, PrimaryKey, Column } from '@c9up/atlas'

@Entity('users')
export class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare email: string
  @Column() declare status: string
}
```

## Wire a repository

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

## Basic CRUD

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

## Notes

- Validate business inputs before `save`.
- Prefer typed repository methods over ad-hoc SQL.
- For dynamic columns, use explicit whitelists.
