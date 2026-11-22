# Pagination et lectures

Ce guide couvre la pagination et la lecture des lignes :

- Pagination curseur
- L'objet résultat du paginateur
- Lectures en objets bruts avec `pojo()`
- Contexte sideloaded

## Pagination curseur

```ts
const page = await repo.query()
  .orderBy('id', 'asc')
  .cursorPaginate({
    limit: 20,
    orderBy: ['id'],
  })
```

Recommandations:

- Fournir un ordre déterministe.
- Utiliser des colonnes d'ordre stables.
- Mapper les erreurs de curseur invalide en `400`.

## L'objet résultat du paginateur

`repo.query().paginate(page, perPage)` résout vers un `Paginator<T>` — les items plus
les métadonnées de pagination et les helpers d'URL de page.

```ts
const page = await repo.query().orderBy('id').paginate(2, 20)

page.all()            // T[] — les lignes de cette page
page.total            // total de lignes toutes pages confondues
page.perPage          // 20
page.currentPage      // 2
page.lastPage         // ceil(total / perPage)
page.firstPage        // 1
page.hasPages         // plus d'une page ?
page.hasMorePages     // y a-t-il une page après celle-ci ?

// URLs de page — définir d'abord une base + la query string transmise.
page.baseUrl('/users').queryString({ sort: 'name' })
page.getUrl(3)                 // '/users?sort=name&page=3'
page.getNextPageUrl()          // URL de la page suivante, ou null sur la dernière page
page.getPreviousPageUrl()      // URL de la page précédente, ou null sur la première page
page.getUrlsForRange(1, 5)     // [{ page, url, isActive }, …], borné à [1, lastPage]

// Sérialiser pour une réponse API (meta en snake_case via la naming strategy).
page.serialize({ fields: ['id', 'name'] })
page.toJSON()                  // { data, meta }
```

`serialize` prend les mêmes options que le `serialize` d'un modèle (`fields` et
`relations`) et fait passer chaque ligne par le sérialiseur de son modèle : les
colonnes masquées ou renommées se comportent comme sur un modèle seul.

`getUrl` renvoie `''` tant qu'aucun `baseUrl` n'est défini. `serialize` / `toJSON`
émettent `{ data, meta }` ; les clés de `meta` sont remappées via les
`paginationMetaKeys` de la naming strategy (snake_case par défaut) et incluent les
URLs de page dès qu'un `baseUrl` est présent.

## Lectures en objets bruts avec `pojo()`

Court-circuite entièrement l'hydratation des modèles — aucune instance
`BaseEntity`, aucun suivi des changements, aucun `@column({ consume })`, aucun
preload. Retourne les lignes brutes de la base (colonnes snake_case). Chemin de
lecture rapide pour les rapports et exports :

```ts
const rows = await User.query().where('active', true).pojo()
// rows : Array<{ id: number; full_name: string; ... }>
```

`pojo()` s'enchaîne avec `first()` :

```ts
const row = await User.query().where('email', email).pojo().first()
// row : { id: number; full_name: string; ... } | null
```

::: tip `pojo()` termine la chaîne
`ModelQuery<T>` est contraint à `T extends BaseEntity` et ne peut pas être
re-paramétré vers un enregistrement brut : `pojo()` rend donc une vue terminale,
attendable pour les lignes et enchaînable avec `first()`. Placez-le en dernier.
:::

Pour une seule colonne, `pluck()` saute l'hydratation de la même façon et rend
les valeurs plutôt que les lignes :

```ts
const emails = await User.query().where('active', true).pluck<string>('email')
// ['ada@acme.test', 'grace@acme.test']
```

`V` est ce que vous affirmez de la colonne, pas ce qu'atlas vérifie : `pluck()`
vérifie seulement que chaque valeur est un scalaire ou `null`, et lève une erreur
sur une valeur objet (colonne objet ou relation). Affinez vous-même les valeurs
quand le type de la colonne n'est pas certain.

Un `select()` partiel de colonnes simples **inclut automatiquement la clé
primaire**, pour que l'entité hydratée reste sauvegardable (un `save()` ultérieur
fait un UPDATE, pas un INSERT). Pour les projections agrégat/alias
(`select('COUNT(*) as n')`) la PK ne peut être déduite — utiliser `pojo()`. Les
opérations prémisées sur une row existante (`delete()`, `forceDelete()`,
`restore()`, `refresh()`, `fresh()`, `load*()`) exigent une entité **persistée** :
elles lèvent `E_MODEL_NOT_PERSISTED` sur une instance locale (même avec une PK
posée à la main — ce n'est pas une row) et `E_MISSING_PRIMARY_KEY` sur une
projection persistée sans PK. `save()` lève aussi `E_MISSING_PRIMARY_KEY` sur une
telle projection. `related().create/save` **persiste le parent d'abord** dans une
transaction managée, pose le FK sur l'enfant, puis l'écrit —
atomique, rollback en cas d'échec ; un parent issu d'une projection sans PK est
rejeté (`E_MISSING_PRIMARY_KEY`).

## Contexte sideloaded

Attache un contexte arbitraire à chaque instance hydratée par une requête — p. ex. le tenant/utilisateur courant, lisible depuis
les hooks ou les propriétés calculées via `entity.$sideloaded` :

```ts
const posts = await Post.query().sideload({ tenantId }).exec()
posts[0].$sideloaded // { tenantId }
```
