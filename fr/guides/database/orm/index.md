# Introduction

Ce guide couvre atlas, l'ORM SQL :

- Parcours recommandé
- Principes de design

Atlas est l'ORM Data Mapper de Ream.

Il combine:

- des entités/repositories explicites en TypeScript,
- une compilation SQL en Rust (N-API),
- une validation stricte des identifiants et une génération SQL adaptée au dialecte.

> Statut: coeur prêt pour la production. La doc ci-dessous est alignée avec le code actuel.

![Le trajet d'une requête Atlas jusqu'à la base. Votre code, en TypeScript, déclare un modèle (@Column() declare email: string) et construit une requête (await User.query().where('role', 'admin').exec()). Le compilateur SQL, en Rust, valide chaque nom de table et de colonne (un nom dangereux lève E_UNSAFE_IDENTIFIER), transforme les valeurs en paramètres liés et écrit le SQL du dialecte de la connexion. Le pilote, en Rust avec sqlx, parle à PostgreSQL, MySQL ou SQLite et n'abandonne jamais TLS en silence. Les lignes reviennent sous forme d'instances de User, avec leurs relations. Les changements de schéma s'appliquent avec ream migration:run.](/images/atlas-en.webp){width=640 height=640 loading=lazy}

## Parcours recommandé

1. [Démarrage](/fr/guides/database/orm/getting-started)
2. [Relations](/fr/guides/database/orm/relations)
3. [Query Builder](/fr/guides/database/orm/query-builder)
4. [ModelQuery avancé](/fr/guides/database/orm/advanced-queries)
5. [Hooks de cycle de vie](/fr/guides/database/orm/lifecycle-hooks)
6. [Patterns Repository](/fr/guides/database/orm/repositories)
7. [Migrations](/fr/guides/database/orm/migrations)
8. [Schema Builder](/fr/guides/database/orm/schema-builder)
9. [Dump & Vérif du schéma](/fr/guides/database/orm/schema-dump)
10. [Seeders](/fr/guides/database/orm/seeders)
11. [Factories](/fr/guides/database/orm/factories)
12. [Connexions](/fr/guides/database/orm/connections)
13. [Sécurité SQL](/fr/guides/database/orm/security)
14. [Performance](/fr/guides/database/orm/performance)
15. [Observabilité](/fr/guides/database/orm/observability)
16. [Référence API](/fr/reference/atlas)
17. [Gestion des erreurs](/fr/guides/database/orm/error-handling)
18. [Dépannage](/fr/guides/database/orm/troubleshooting)

## Principes de design

- Pas d'état global implicite: les repositories portent l'accès aux données.
- Défauts sûrs + échappatoires explicites (`whereRaw`, `joinRaw`) marquées non sûres.
- Support multi-dialectes: `sqlite`, `postgres`, `mysql`.
- Transactions et atomicité des migrations comme exigences de base.

Atlas est l'ORM Data Mapper de Ream. Les entités sont de pures classes TypeScript décorées avec des métadonnées. Les requêtes sont compilées en SQL via Rust grâce à NAPI. Les événements de domaine s'accumulent sur les entités et sont envoyés au bus d'événements après une sauvegarde réussie.

## Prochaines étapes
- [Rune (Validation)](/fr/guides/basics/validation/) — Valider les entrées avant de sauvegarder les entités
- [Event bus](/fr/guides/digging-deeper/emitter) — Envoyer les événements de domaine après la sauvegarde
