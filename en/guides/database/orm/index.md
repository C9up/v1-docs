# Introduction

This guide covers atlas, the SQL ORM:

- Recommended path
- Design principles

Atlas is Ream's Data Mapper ORM.

It combines:

- explicit entities/repositories in TypeScript,
- SQL compilation in Rust (N-API),
- strict identifier validation and dialect-aware query generation.

> Status: production-ready core. The API below matches the current codebase.

## Recommended path

1. [Getting Started](/en/guides/database/orm/getting-started)
2. [Relations](/en/guides/database/orm/relations)
3. [Query Builder](/en/guides/database/orm/query-builder)
4. [Advanced ModelQuery](/en/guides/database/orm/advanced-queries)
5. [Lifecycle Hooks](/en/guides/database/orm/lifecycle-hooks)
6. [Repository Patterns](/en/guides/database/orm/repositories)
7. [Migrations](/en/guides/database/orm/migrations)
8. [Schema Builder](/en/guides/database/orm/schema-builder)
9. [Schema Dump & Verify](/en/guides/database/orm/schema-dump)
10. [Seeders](/en/guides/database/orm/seeders)
11. [Factories](/en/guides/database/orm/factories)
12. [Connections](/en/guides/database/orm/connections)
13. [SQL Security](/en/guides/database/orm/security)
14. [Performance](/en/guides/database/orm/performance)
15. [Observability](/en/guides/database/orm/observability)
16. [API Reference](/en/reference/atlas)
17. [Error Handling](/en/guides/database/orm/error-handling)
18. [Troubleshooting](/en/guides/database/orm/troubleshooting)

## Design principles

- No hidden global model state: repositories own data access.
- Strong defaults, explicit escape hatches (`whereRaw`, `joinRaw`) marked unsafe.
- Multi-dialect support: `sqlite`, `postgres`, `mysql`.
- Transactions and migration atomicity are first-class concerns.

Atlas is Ream's Data Mapper ORM. Entities are pure TypeScript classes decorated with metadata. Queries compile to SQL through Rust via NAPI. Domain events accumulate on entities and dispatch through the event bus after a successful save.

## Next Steps
- [Rune (Validation)](/en/guides/basics/validation/) — Validate input before saving entities
- [Event Bus](/en/guides/digging-deeper/emitter) — Dispatch domain events after save
