# Atlas

Atlas is Ream's Data Mapper ORM.

It combines:

- explicit entities/repositories in TypeScript,
- SQL compilation in Rust (N-API),
- strict identifier validation and dialect-aware query generation.

> Status: production-ready core. The API below matches the current codebase.

## Recommended path

1. [Getting Started](/en/atlas/getting-started)
2. [Relations](/en/atlas/relations)
3. [Query Builder](/en/atlas/query-builder)
4. [Advanced ModelQuery](/en/atlas/model-query-advanced)
5. [Repository Patterns](/en/atlas/repository-patterns)
6. [Migrations](/en/atlas/migrations)
7. [SQL Security](/en/atlas/security)
8. [Performance](/en/atlas/performance)
9. [API Reference](/en/atlas/api-reference)
10. [Troubleshooting](/en/atlas/troubleshooting)

## Design principles

- No hidden global model state: repositories own data access.
- Strong defaults, explicit escape hatches (`whereRaw`, `joinRaw`) marked unsafe.
- Multi-dialect support: `sqlite`, `postgres`, `mysql`.
- Transactions and migration atomicity are first-class concerns.
