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
5. [Lifecycle Hooks](/en/atlas/lifecycle-hooks)
6. [Repository Patterns](/en/atlas/repository-patterns)
7. [Migrations](/en/atlas/migrations)
8. [Schema Builder](/en/atlas/schema-builder)
9. [Schema Dump & Verify](/en/atlas/schema-dump)
10. [Seeders](/en/atlas/seeders)
11. [Factories](/en/atlas/factories)
12. [Connections](/en/atlas/connections)
13. [SQL Security](/en/atlas/security)
14. [Performance](/en/atlas/performance)
15. [Observability](/en/atlas/observability)
16. [API Reference](/en/atlas/api-reference)
17. [Error Handling](/en/atlas/error-handling)
18. [Troubleshooting](/en/atlas/troubleshooting)

## Design principles

- No hidden global model state: repositories own data access.
- Strong defaults, explicit escape hatches (`whereRaw`, `joinRaw`) marked unsafe.
- Multi-dialect support: `sqlite`, `postgres`, `mysql`.
- Transactions and migration atomicity are first-class concerns.
