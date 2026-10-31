# DataTable

Un tableau avec tri, filtre, pagination et sélection de lignes, construit sur les parties de [Table](/fr/nebula/components/table). Il couvre les quatre fonctions pour lesquelles on se sert réellement d'un tableau de données, et rien d'autre : ni regroupement de colonnes, ni colonnes figées, ni virtualisation, ni filtres à facettes.

Tout se passe sur un tableau en mémoire : le tri compare des valeurs, le filtre parcourt les lignes, la pagination découpe. C'est la bonne réponse jusqu'à quelques milliers de lignes et la mauvaise au-delà, où le travail revient au serveur — alors plutôt que de se doter d'un mode à moitié serveur, le composant reste côté client. Une liste paginée par le serveur se compose à la main avec [Table](/fr/nebula/components/table) et [Pagination](/fr/nebula/components/pagination) ; voir [périmètre](/fr/nebula/scope).

`DataTable` est une fonction générique, `DataTable<Row>(props)`, pour que `cell`, `sortValue` et `filterMatch` reçoivent votre propre type de ligne plutôt qu'un enregistrement d'inconnues.

```sh
ream nebula:add data-table
```

Organisme · `organisms/DataTable.ts` · [Checkbox](/fr/nebula/components/checkbox), [Input](/fr/nebula/components/input), [Pagination](/fr/nebula/components/pagination), [Table](/fr/nebula/components/table)

## Utilisation

```ts
import { DataTable } from '@c9up/nebula'

interface Member {
  email: string
  name: string
  role: string
  joined: Date
}

DataTable<Member>({
  columns: [
    { key: 'name', header: 'Nom' },
    { key: 'email', header: 'E-mail' },
  ],
  rows: members,
  rowKey: (member) => member.email,
})
```

Une colonne sans `cell` affiche la propriété de la ligne nommée par sa `key`. Toute colonne se trie sauf si elle dit le contraire : un clic sur son en-tête trie en ordre croissant, un second en décroissant, et un clic sur une autre colonne la trie à son tour en croissant.

## Exemples

### Colonnes

```ts
import { Badge, Button, type Column } from '@c9up/nebula'

const joined = new Intl.DateTimeFormat('fr', { dateStyle: 'medium' })

const columns: readonly Column<Member>[] = [
  { key: 'name', header: 'Nom' },
  { key: 'role', header: 'Rôle', cell: (member) => Badge({ variant: 'secondary', children: member.role }) },
  {
    key: 'joined',
    header: 'Arrivée',
    cell: (member) => joined.format(member.joined),
    sortValue: (member) => member.joined.getTime(),
  },
  { key: 'actions', header: '', sortable: false, class: 'w-10', cell: (member) => Button({ variant: 'ghost', size: 'sm', children: 'Modifier', onClick: () => edit(member) }) },
]
```

Le tri lit la propriété de la ligne, pas ce que rend `cell`. Les nombres se comparent comme des nombres — 9 avant 100 — et le reste comme du texte, par `localeCompare` ; une `Date` se trierait selon sa forme texte, alors `sortValue` transmet son horodatage. Une colonne dont la `key` n'est pas du tout une propriété (`actions`) est `sortable: false`. Le tri travaille sur une copie : votre tableau n'est jamais réordonné.

### Filtre et pages

```ts
DataTable<Member>({
  columns,
  rows: members,
  rowKey: (member) => member.email,
  pageSize: 20,
  filterPlaceholder: 'Filtrer par nom ou e-mail…',
  filterMatch: (member, query) =>
    member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query),
})
```

Le champ de filtre apparaît quand `filterMatch` est fourni — c'est lui qui dit ce que le champ cherche. La requête lui arrive sans espaces autour et en minuscules, et une requête vide montre toutes les lignes. Taper ramène à la première page. `pageSize` ajoute la pagination sous le tableau ; sans lui, toutes les lignes s'affichent. Quand le filtre laisse moins de pages que celle où vous étiez, le tableau montre la dernière page plutôt qu'une page vide.

### Sélectionner des lignes

```ts
import { html, signal } from '@c9up/aurora'

const chosen = signal<readonly string[]>([])

html`
  ${DataTable<Member>({
    columns,
    rows: members,
    rowKey: (member) => member.email,
    pageSize: 20,
    selectable: true,
    onSelectionChange: chosen,
  })}
  ${Button({
    variant: 'destructive',
    disabled: () => chosen().length === 0,
    children: () => `Retirer ${chosen().length}`,
    onClick: () => remove(chosen()),
  })}
`
```

`selectable` ajoute une colonne de cases à cocher. La sélection est une liste de `rowKey`, conservée d'une page à l'autre, au tri et au filtre. La case d'en-tête n'agit que sur **la page visible** — sélectionner des lignes que l'utilisateur ne voit pas, et qu'il a peut-être écartées exprès par le filtre, est la façon dont une action groupée supprime plus que prévu. Elle prend l'état mixte quand une partie de la page est sélectionnée. Le tableau garde la sélection lui-même et la signale par `onSelectionChange` ; une clé reste sélectionnée quand sa ligne quitte `rows`.

### Des lignes qui changent

```ts
const rows = signal<readonly Member[]>([])

setInterval(async () => rows(await fetchMembers()), 10_000)

DataTable<Member>({
  columns,
  rows,
  rowKey: (member) => member.email,
  pageSize: 20,
  autoResetPage: false,
  emptyMessage: 'Aucun membre pour le moment.',
})
```

`rows` prend un accesseur. De nouvelles lignes gardent le tri et le filtre ; par défaut, elles ramènent aussi le tableau à la première page, puisque la page avait été choisie dans des données disparues. `autoResetPage: false` garde la page pour des lignes rafraîchies sur place, comme cette liste interrogée à intervalles. Un accesseur doit rendre le même tableau tant que les données ne changent pas — un tableau neuf à chaque lecture compte à chaque fois comme de nouvelles données.

Les lignes sont gardées par `rowKey`, avec le [`each`](/fr/modules/aurora#listes-—-each) d'aurora. Une ligne dont la clé est toujours là garde son élément, et avec lui un menu ouvert, le focus ou le survol qu'il contient ; elle se déplace quand le tri ou la page change sa place. Ses cellules sont redessinées quand son élément est un autre objet ; une relecture qui rend les mêmes objets ne redessine rien.

### Dans une autre langue

```ts
DataTable<Member>({
  columns,
  rows: members,
  rowKey: (member) => member.email,
  pageSize: 20,
  selectable: true,
  filterPlaceholder: 'Filtrer…',
  filterMatch: (member, query) => member.name.toLowerCase().includes(query),
  selectAllLabel: 'Tout sélectionner sur cette page',
  selectRowLabel: (member) => `Sélectionner ${member.name}`,
  emptyMessage: 'Aucun résultat.',
  paginationLabels: {
    navigation: 'pagination',
    previous: 'Précédent',
    previousPage: 'Page précédente',
    next: 'Suivant',
    nextPage: 'Page suivante',
    morePages: 'Autres pages',
  },
})
```

Une clé absente de `paginationLabels` garde son défaut anglais.

## API

### DataTable

`DataTable<Row>(props: DataTableProps<Row>): TemplateResult`

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `columns` | `readonly Column<Row>[]` | — | Les colonnes, dans l'ordre. Lues une fois, à la construction. |
| `rows` | `Reactive<readonly Row[]>` | — | Les lignes, ou un accesseur pour des lignes qui changent. |
| `rowKey` | `(row: Row) => string` | — | Une identité stable par ligne — ce que contient la sélection, et ce qui garde l'élément d'une ligne d'un changement à l'autre. |
| `pageSize` | `number` | — | Lignes par page. Omise : toutes les lignes, sans pagination. |
| `autoResetPage` | `boolean` | `true` | Revenir à la première page quand `rows` change. |
| `filterPlaceholder` | `string` | `'Filter…'` | Le texte d'attente du champ de filtre. |
| `filterLabel` | `string` | `filterPlaceholder`, sinon `'Filter…'` | Le nom accessible du champ de filtre. |
| `filterMatch` | `(row: Row, query: string) => boolean` | — | Affiche le champ de filtre ; dit si une ligne correspond à la requête, sans espaces autour et en minuscules. |
| `selectable` | `boolean` | `false` | Ajoute la colonne de cases à cocher. |
| `selectAllLabel` | `string` | `'Select all rows on this page'` | Le nom accessible de la case d'en-tête. |
| `selectRowLabel` | `(row: Row) => string` | `` `Select row ${key}` `` | Le nom accessible de la case d'une ligne. |
| `paginationLabels` | `Partial<PaginationLabels>` | les défauts de [Pagination](/fr/nebula/components/pagination#paginationlabels) | Les mots de la pagination. |
| `onSelectionChange` | `(keys: readonly string[]) => void` | — | Les clés sélectionnées, après chaque changement. |
| `emptyMessage` | `Child` | `'No results.'` | Affiché sur toute la largeur quand il ne reste aucune ligne. |
| `class` | `string` | — | Fusionnée dans les classes de la racine. |

### Column

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `key` | `string` | — | Identifie la colonne ; c'est aussi la propriété lue sans `cell` ni `sortValue`. |
| `header` | `Child` | — | Le contenu de l'en-tête. |
| `cell` | `(row: Row) => Child` | la propriété nommée par `key` | Rend la cellule. Chaînes, nombres et booléens s'affichent tels quels, `null` et `undefined` en cellule vide, le reste par `String()`. |
| `sortable` | `boolean` | triable sauf `false` | `false` retire la colonne du tri. |
| `sortValue` | `(row: Row) => string \| number` | la propriété nommée par `key` | Ce qu'on compare pour trier. |
| `class` | `string` | — | Classes de l'en-tête et des cellules de la colonne. |

## Accessibilité

Un en-tête triable porte `aria-sort` — `none`, `ascending` ou `descending` : le chevron dit quelle colonne est triée à qui peut le voir, l'attribut le dit à tous les autres. Une colonne `sortable: false` n'en a pas. Les cases à cocher sont nommées par `selectAllLabel` et `selectRowLabel`, une ligne sélectionnée est marquée `data-state="selected"`, et le filtre est un `<input type="search">` nommé par `filterLabel`.

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Atteint le champ de filtre et les cases à cocher. |
| <kbd>Espace</kbd> | Coche ou décoche la case qui a le focus. |

Le tri et la pagination répondent au pointeur : les cellules d'en-tête ne prennent pas le focus, et les liens de la pagination n'ont pas de `href`, ce qui les sort de l'ordre de tabulation. Un tableau qui doit s'utiliser entièrement au clavier se compose avec [Table](/fr/nebula/components/table) et [Pagination](/fr/nebula/components/pagination), avec un bouton dans chaque en-tête triable et un `href` sur chaque lien de page.

Le texte d'attente et le nom du filtre, les noms des cases, le message vide et les mots de la pagination sont en anglais par défaut ; les props ci-dessus les remplacent — voir [langues](/fr/nebula/languages).
