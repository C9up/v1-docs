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

`select()` et `having()` acceptent des expressions en plus des colonnes :
`count(*)`, `coalesce(sum(total), 0)`. Une chaîne qui contient une parenthèse
est une expression. Elle est compilée telle quelle : elle est donc d'abord
découpée en jetons, puis lue selon une grammaire. Ce que la grammaire ne sait
pas placer est refusé avec `E_UNSAFE_EXPRESSION`.

Une expression peut contenir :

- des références de colonnes, nues ou entre guillemets, avec deux qualificateurs
  au plus ;
- des nombres et des littéraux de chaîne ;
- les opérateurs `+ - * / %`, `||`, `->`, `->>`, les comparaisons, `AND`, `OR`,
  `NOT`, `IS [NOT] NULL`, `[NOT] LIKE`, `[NOT] IN (…)`, `[NOT] BETWEEN` ;
- `CASE … WHEN … THEN … ELSE … END`, `CAST(x AS type)` et `x::type` pour une
  liste fixe de types, `INTERVAL '…'`, `CURRENT_DATE`, `CURRENT_TIME`,
  `CURRENT_TIMESTAMP` ;
- des appels aux fonctions listées : les agrégats (`count`, `sum`, `avg`,
  `min`, `max`, `array_agg`, `string_agg`, `json_agg`), les fonctions de
  fenêtrage (`row_number`, `rank`, `dense_rank`, `ntile`, `lag`, `lead`,
  `first_value`, `last_value`) et `coalesce`, `nullif`, `extract`,
  `date_trunc`, `now`, `length`, `lower`, `upper`, `trim`, `replace`,
  `substring`, `round`, `ceil`, `floor`, `abs` ;
- dans un appel seulement, les mots-clés propres à cet appel : `DISTINCT`,
  `ORDER BY`, `FILTER (WHERE …)`, `OVER (PARTITION BY … ORDER BY …)`,
  `EXTRACT(x FROM y)` ;
- dans `select()`, un alias après l'expression (`AS nom`).

Tout le reste est refusé. En particulier :

- un mot-clé d'instruction, à n'importe quelle profondeur : `SELECT`, `FROM`,
  `WHERE`, `JOIN`, `ON`, `TABLE`, `UNION`, `VALUES`, `LIMIT`, `INTO`.
  `(table api_keys limit 1)` est une sous-requête sans le mot : elle est
  refusée ;
- un constructeur de ligne `(a, b)` et une seconde expression après une
  virgule ;
- un mot qu'un serveur évalue sans parenthèses (`current_user`,
  `session_user`, `current_schema`, …). Écrivez-le entre guillemets
  (`"current_user"`) pour une colonne de ce nom ;
- un commentaire (`--`, `/*`, `*/`) et tout `#`, y compris dans un littéral :
  `#` ouvre un commentaire sur MySQL ;
- une barre oblique inverse dans un littéral de chaîne : MySQL et les chaînes
  `E'…'` de Postgres lisent `\'` comme une apostrophe échappée, le standard SQL
  comme une barre oblique inverse suivie de l'apostrophe fermante. Là où les
  deux ne s'accordent pas sur la fin d'un littéral, ce que la vérification a
  sauté comme « dans la chaîne » s'exécuterait comme du SQL ;
- une fonction qui n'est pas listée, quelle que soit son écriture : un nom
  entre guillemets doubles ou entre backticks (`"pg_sleep"(30)`,
  `` `sleep`(5) ``) et un nom qualifié par un schéma (`pg_catalog.pg_sleep(1)`,
  `public.count(id)`) sont des appels que le serveur exécute. Une fonction
  autorisée s'écrit toujours nue ;
- tout caractère pour lequel il n'existe pas de jeton : `;`, `$`, `@`, `?`, un
  `:` ou un `|` isolé, un caractère de contrôle.

La grammaire garde une expression dans les tables de sa propre requête. Elle
ne choisit pas les colonnes à votre place : une liste de champs prise dans la
requête HTTP peut encore nommer n'importe quelle colonne de ces tables.
Comparez-la à une liste que vous tenez vous-même, comme pour `orderBy`
ci-dessous.

Un agrégat du builder `db.from()` (`count`, `sum`, `avg`, `min`, `max` et
leurs formes `Distinct`) prend une colonne ou `*`, jamais une expression.
`groupBy()` prend des noms de colonnes : un objet comme `{ raw: '…' }`, qu'un
corps JSON ou `?groupBy[raw]=…` peut produire, est refusé avec
`E_UNSAFE_IDENTIFIER`. Un fragment passe par `groupByRaw()` ou `db.raw()`.

L'expression supplémentaire de `whereExpr()` (`whereExpr('total', '+ tax', '>=',
100)`) reste disponible en mode strict. Elle est lue par le même découpage en
jetons et ne contient que de l'arithmétique : `+ - * /`, des nombres, des
colonnes et un ensemble autorisé de fonctions scalaires (`abs`, `round`,
`coalesce`, `length`, `lower`, …). `pg_sleep()`, `version()` ou
`current_setting()` y sont refusés, avec ou sans commentaire avant la
parenthèse. Voir [ModelQuery avancé](/fr/guides/database/orm/advanced-queries).

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
