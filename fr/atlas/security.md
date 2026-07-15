# Atlas - Sécurité

## Défenses par défaut

Atlas applique déjà plusieurs garde-fous:

- validation des identifiants de colonnes/tables
- valeurs paramétrées dans le SQL compilé
- compilation SQL native Rust
- mode strict optionnel pour bloquer les méthodes raw non sûres

## Surfaces sensibles à contrôler

- `whereRaw(sql, bindings)`
- `joinRaw(fragment, bindings?)`
- `havingRaw(sql, bindings)`
- sélection/tri de colonnes pilotés par entrées HTTP

Le mode strict (`setAtlasStrictMode(true)` / `ATLAS_STRICT=1`) désactive les trois
méthodes raw (`whereRaw`, `joinRaw`, `havingRaw`).

## Durcissement recommandé

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(process.env.NODE_ENV === 'production')
```

Puis validation des colonnes dynamiques:

```ts
const sortable = new Set(['id', 'email', 'createdAt'])
const sortBy = sortable.has(input.sortBy) ? input.sortBy : 'id'
const dir = input.sortDir === 'asc' ? 'asc' : 'desc'

return repo.query().orderBy(sortBy, dir).exec()
```

## Règles raw SQL

- Ne jamais injecter une chaîne utilisateur dans un fragment SQL.
- Toujours utiliser des bindings pour les valeurs.
- Préférer `whereExpr` et les méthodes structurées.

## Gestion d'erreurs

- mapper les curseurs invalides / query invalide en `400`
- mapper `findOrFail`/not-found en `404`
- éviter de renvoyer le SQL complet dans les erreurs prod
