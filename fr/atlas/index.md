# Atlas

Atlas est l'ORM Data Mapper de Ream.

Il combine:

- des entités/repositories explicites en TypeScript,
- une compilation SQL en Rust (N-API),
- une validation stricte des identifiants et une génération SQL adaptée au dialecte.

> Statut: coeur prêt pour la production. La doc ci-dessous est alignée avec le code actuel.

## Parcours recommandé

1. [Démarrage](/fr/atlas/getting-started)
2. [Relations](/fr/atlas/relations)
3. [Query Builder](/fr/atlas/query-builder)
4. [ModelQuery avancé](/fr/atlas/model-query-advanced)
5. [Patterns Repository](/fr/atlas/repository-patterns)
6. [Migrations](/fr/atlas/migrations)
7. [Sécurité SQL](/fr/atlas/security)
8. [Performance](/fr/atlas/performance)
9. [Référence API](/fr/atlas/api-reference)
10. [Dépannage](/fr/atlas/troubleshooting)

## Principes de design

- Pas d'état global implicite: les repositories portent l'accès aux données.
- Défauts sûrs + échappatoires explicites (`whereRaw`, `joinRaw`) marquées non sûres.
- Support multi-dialectes: `sqlite`, `postgres`, `mysql`.
- Transactions et atomicité des migrations comme exigences de base.
