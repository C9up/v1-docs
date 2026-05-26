# Atlas - Performance

## Leviers à plus fort impact

1. Garder des jeux de résultats petits (`limit`, pagination, pagination curseur).
2. Sélectionner uniquement les colonnes utiles.
3. Éviter les preloads inutiles et trop profonds.
4. Aligner les index sur filtres + order-by.
5. Utiliser les opérations batch atomiques (`createMany`, `saveMany`, `update/delete` en masse) quand pertinent.

## Exemple de shape de requête

```ts
const page = await repo.query()
  .select(['id', 'email', 'status'])
  .where('status', 'active')
  .orderBy('id', 'asc')
  .cursorPaginate({ perPage: 100, orderBy: ['id'] })
```

## Cycle de vie repository/connexion

- Réutiliser les connexions gérées par le provider.
- Utiliser des repositories scoppés transaction (`useTransaction`) pour les écritures groupées.
- Éviter d'ouvrir des connexions ad-hoc à chaque requête.

## Observabilité

- Suivre p50/p95 des requêtes.
- Suivre le volume de lignes retournées par endpoint.
- Alerter sur requêtes non bornées et absence de pagination.
- Benchmarker les endpoints d'hydratation avec des datasets réalistes.
