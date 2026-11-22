# Sécurité SQL

Ce guide couvre la sécurité SQL :

- Défenses par défaut
- Surfaces sensibles à contrôler
- Durcissement recommandé
- Règles raw SQL
- Gestion d'erreurs

## Défenses par défaut

Atlas applique déjà plusieurs garde-fous:

- validation des identifiants de colonnes/tables
- valeurs paramétrées dans le SQL compilé
- compilation SQL native Rust
- mode strict optionnel pour bloquer les méthodes raw non sûres
- aucun mode TLS qui repasse en clair en silence : `sslmode=prefer` et
  `allow` sont refusés

## Surfaces sensibles à contrôler

- `whereRaw(sql, bindings)`
- `joinRaw(fragment, bindings?)`
- `havingRaw(sql, bindings)`
- sélection/tri de colonnes pilotés par entrées HTTP

`select()` et `having()` acceptent des expressions en plus des colonnes —
`count(*)`, `coalesce(sum(total), 0)` — et les valident avant de les compiler.
En plus des sous-requêtes et des mots-clés d'instruction, elles refusent :

- une barre oblique inverse dans un littéral de chaîne : MySQL et les chaînes
  `E'…'` de Postgres lisent `\'` comme une apostrophe échappée, le standard SQL
  comme une barre oblique inverse suivie de l'apostrophe fermante. Là où les deux
  ne s'accordent pas sur la fin d'un littéral, ce que la vérification a sauté
  comme « dans la chaîne » s'exécuterait comme du SQL. Aucun agrégat n'en a
  besoin.
- tout `#`, y compris dans un littéral : il ouvre un commentaire sur MySQL.
  Aucune colonne, aucun alias ni aucun agrégat accepté par ces méthodes n'en a
  besoin.
- une fonction qu'elles ne listent pas, quelle que soit son écriture : un nom
  entre guillemets doubles ou entre backticks (`"pg_sleep"(30)`,
  `` `sleep`(5) ``) et un nom qualifié par un schéma (`pg_catalog.pg_sleep(1)`,
  `public.count(id)`) sont des appels que le serveur exécute ; ils sont donc
  refusés comme un nom nu non listé. Une fonction autorisée s'écrit toujours
  nue.

L'expression supplémentaire de `whereExpr()` (`whereExpr('total', '+ tax', '>=',
100)`) reste disponible en mode strict ; elle n'appelle donc qu'un ensemble
autorisé de fonctions scalaires (`abs`, `round`, `coalesce`, `length`, `lower`,
…) : `pg_sleep()`, `version()` ou `current_setting()` y sont refusés. Voir
[ModelQuery avancé](/fr/guides/database/orm/advanced-queries).

Une apostrophe doublée dans un littéral (`'it''s'`) reste acceptée. Ce que ces
vérifications refusent relève d'une surface brute avec bindings.

Le mode strict (`setAtlasStrictMode(true)` / `ATLAS_STRICT=1`) désactive toutes les
surfaces SQL brut de la couche typée — `whereRaw`, `joinRaw`, `havingRaw` et le
`raw()` du repository. Le break-glass reste `db.query()` / `db.execute()` au niveau
de la connexion (toujours paramétré).

## Durcissement recommandé

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(process.env.NODE_ENV === 'production')
```

Quand la base est jointe par un réseau que vous ne contrôlez pas, chiffrez la
connexion et vérifiez le nom du serveur avec `sslmode=verify-full` (voir
[Connexions chiffrées](/fr/guides/database/orm/connections#connexions-chiffrees-tls)).
`require` et `verify-ca` chiffrent sans vérifier le nom : n'importe quel
certificat de la même autorité passe. Atlas les accepte avec un avertissement.

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
