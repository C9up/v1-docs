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

## `E_ATLAS_INSECURE_SSLMODE`

Cause: la connexion demande `sslmode=prefer` ou `allow`, dans son URL ou par
`PGSSLMODE`. Les deux repassent en clair quand le TLS échoue, sans le dire.

Actions:

- `sslmode=disable` pour une base sur un réseau que vous contrôlez
- sinon `sslmode=verify-full` avec `sslrootcert` (voir
  [Connexions chiffrées](./connections.md#connexions-chiffrees-tls))

## Connexion TLS refusée

Le message dit quel côté refuse:

- `not valid for name "…"`: le certificat du serveur ne nomme pas l'hôte de
  l'URL. Connectez-vous avec un nom que le certificat contient.
- `UnknownIssuer`: le certificat du serveur n'est pas signé par `sslrootcert`.
- `requires a valid client certificate` ou `UnknownCA`: le serveur attend un
  certificat client (`sslcert`, `sslkey`) signé par l'autorité qu'il reconnaît.
- `Cannot read the TLS …`, `… is not a PEM file`: le fichier nommé est absent
  ou illisible par le processus.
- une clé qui `is encrypted`: la déchiffrer avec la commande `openssl pkey`
  que donne le message.

## `pool timed out while waiting for an open connection`

Cause: le pool n'a pas pu ouvrir ses `pool.min` connexions à temps. Le
serveur les a refusées, ou n'a pas répondu. Un PostgreSQL à
`max_connections`, ou un proxy à sa propre limite de sessions, refuse avec
`too many connections`, et le pool réessaie jusqu'à l'échéance.

Actions:

- baisser `pool.min` / `pool.max`, ou relever la limite du serveur
- compter les sessions qu'ouvre chaque instance de l'app: chaque connexion
  du pool en tient une
