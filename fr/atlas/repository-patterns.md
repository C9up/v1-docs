# Atlas - Patterns Repository

## Objectif

Encapsuler la logique d'accès aux données dans des repositories explicites.

## Exemple de repository métier

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

## Bonnes pratiques

- exposer des méthodes métier, pas uniquement CRUD générique
- éviter de laisser la couche HTTP composer du SQL/requêtes complexes
- centraliser les colonnes dynamiques derrière des whitelists

## Soft delete

Atlas gère les scopes soft delete selon la config de l'entité:

- défaut: exclut les supprimés
- `withTrashed()` inclut tout
- `onlyTrashed()` ne garde que les supprimés
