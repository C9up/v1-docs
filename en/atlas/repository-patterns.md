# Atlas - Repository Patterns

## Goal

Encapsulate data access logic inside explicit repositories.

## Example business repository

```ts
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'

export class UserRepository {
  private repo: BaseRepository<User>

  constructor(db: DatabaseConnection) {
    this.repo = new BaseRepository(User, db)
  }

  findActiveByEmail(email: string) {
    return this.repo.query()
      .where('email', email)
      .where('status', 'active')
      .first()
  }

  listRecent(limit = 20) {
    return this.repo.query()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .exec()
  }
}
```

## Best practices

- expose business-level methods, not only generic CRUD
- avoid composing complex SQL/query logic in HTTP layer
- centralize dynamic columns behind explicit whitelists

## Soft delete

Atlas supports soft-delete scopes depending on entity configuration:

- default: excludes soft-deleted rows
- `withTrashed()` includes all
- `onlyTrashed()` returns only soft-deleted rows
