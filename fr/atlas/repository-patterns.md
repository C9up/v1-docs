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

## Restreindre toutes les requêtes — `scope`

Un repository peut porter une contrainte que reçoit chacune de ses requêtes —
c'est la place d'un filtre par tenant :

```ts
import { BaseRepository } from '@c9up/atlas'

const TENANT_TABLES = new Set(['invoices', 'invoice_lines', 'customers'])

const invoices = new BaseRepository(Invoice, db, {
  scope: (q, table) => {
    if (TENANT_TABLES.has(table)) q.where('company_id', currentCompanyId())
  },
})
```

Le scope s'applique aux finders du repository, à `query()` et à ses écritures
par id ou par colonne — `updateById`, `updateWhere`, `increment`, `decrement`.
Il est transmis à toutes les requêtes que lancent ses relations :

- les preloads, imbriqués compris ;
- la table pivot d'un many-to-many et la table intermédiaire d'une relation
  through ;
- les sous-requêtes de `whereHas` / `withCount` ;
- `load()` / `related()` sur les entités que le repository a hydratées ;
- la copie que renvoie `useTransaction(trx)`.

La fonction reçoit chaque requête avec la table qu'elle lit, et y ajoute des
contraintes `WHERE` ; tout autre réglage est ignoré. Une table qui ne la
concerne pas passe telle quelle si elle n'ajoute rien. Ses contraintes sont
combinées en ET, dans leurs propres parenthèses, avec celles de la requête : un
`orWhere` chaîné par l'appelant ne peut pas les contourner. Elle s'exécute à
chaque compilation d'une requête, donc lit l'état de ce moment-là (un tenant
porté par le contexte asynchrone), et peut lever une erreur pour refuser une
requête d'emblée.

Les écritures sur une entité (`save`, `delete`) ne sont pas filtrées : l'entité
provient d'une lecture déjà restreinte.

## Bonnes pratiques

- exposer des méthodes métier, pas uniquement CRUD générique
- éviter de laisser la couche HTTP composer du SQL/requêtes complexes
- centraliser les colonnes dynamiques derrière des whitelists

## Soft delete

Atlas gère les scopes soft delete selon la config de l'entité:

- défaut: exclut les supprimés
- `withTrashed()` inclut tout
- `onlyTrashed()` ne garde que les supprimés
