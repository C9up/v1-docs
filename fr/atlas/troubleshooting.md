# Atlas - Dépannage

## `ATLAS_NAPI_NOT_FOUND`

Cause: package natif indisponible pour la plateforme/architecture courante.

Actions:

- réinstaller les dépendances (`pnpm install`)
- vérifier la résolution des dépendances optionnelles par plateforme
- vérifier version Node et environnement de build

## `E_INVALID_COLUMN`

Cause: colonne inconnue dans les métadonnées d'entité.

Actions:

- vérifier les décorateurs `@Column`
- vérifier les hypothèses de naming (camelCase vs snake_case)
- valider la whitelist de colonnes dynamiques

## `whereRaw()` ou `joinRaw()` lève une erreur

Cause: mode strict Atlas activé.

Actions:

- migrer vers les APIs structurées (`whereExpr`, builders de join)
- garder le raw SQL seulement en dernier recours

## Curseur invalide en `cursorPaginate`

Cause: curseur invalide ou altéré.

Action:

- traiter comme erreur d'entrée client (`400`)

## `findOrFail` lève une erreur

Cause: ligne introuvable.

Action:

- utiliser `find` quand `null` est acceptable
- mapper en HTTP `404`

## Warning migration non atomique

Cause: l'adapter n'implémente pas `runInTransaction`.

Actions:

- implémenter `runInTransaction(batch)` dans l'adapter
- éviter les migrations prod sans support atomique
