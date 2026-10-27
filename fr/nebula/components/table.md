# Table

Les parties stylées d'un tableau — et de vrais éléments de tableau, pas une grille de divs. Un `<table>` donne gratuitement au lecteur d'écran le contexte de ligne et de colonne (« ligne 3, Montant, 42 ») ; le reconstruire sur des divs oblige à tenir à la main `role="grid"`, `aria-rowindex` et `aria-colindex` sur chaque cellule. Le conteneur défile horizontalement sur un écran étroit sans toucher à la sémantique.

Ces parties ne font que la présentation. Le tri, le filtre, la pagination et la sélection sur un tableau de données, c'est [DataTable](/fr/nebula/components/data-table), construit à partir d'elles.

```sh
ream nebula:add table
```

Molécule · `molecules/Table.ts` · aucune dépendance

## Utilisation

```ts
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@c9up/nebula'

Table({
  children: [
    TableHeader({
      children: TableRow({
        children: [TableHead({ children: 'Facture' }), TableHead({ class: 'text-right', children: 'Montant' })],
      }),
    }),
    TableBody({
      children: invoices.map((invoice) =>
        TableRow({
          children: [TableCell({ children: invoice.id }), TableCell({ class: 'text-right', children: invoice.amount })],
        }),
      ),
    }),
  ],
})
```

Les parties ne partagent aucun état : elles prennent leur contenu en valeurs simples — un tableau de parties est un contenu comme un autre. Pas besoin de thunk.

## Exemples

### Légende et pied

```ts
import { TableCaption, TableFooter } from '@c9up/nebula'

Table({
  children: [
    TableCaption({ children: 'Factures émises en mars.' }),
    TableHeader({ children: TableRow({ children: [TableHead({ children: 'Facture' }), TableHead({ class: 'text-right', children: 'Montant' })] }) }),
    TableBody({ children: invoices.map((invoice) => TableRow({ children: [TableCell({ children: invoice.id }), TableCell({ class: 'text-right', children: invoice.amount })] })) }),
    TableFooter({
      children: TableRow({
        children: [TableCell({ children: 'Total' }), TableCell({ class: 'text-right', children: total })],
      }),
    }),
  ],
})
```

La légende est dessinée sous le tableau, et c'est le nom accessible du tableau.

### En-têtes de ligne et fusions

```ts
TableRow({
  children: [
    TableHead({ scope: 'row', children: 'Mars' }),
    TableCell({ colspan: 2, children: 'Aucune facture' }),
  ],
})
```

### Des lignes qui changent

Un contenu qui change est un accesseur. Le corps est reconstruit dès que ce qu'il lit change :

```ts
TableBody({
  children: () =>
    liveInvoices().map((invoice) =>
      TableRow({ children: [TableCell({ children: invoice.id }), TableCell({ children: invoice.status })] }),
    ),
})
```

### Une ligne sélectionnée

`selected` dessine la ligne dans la couleur atténuée, par `data-state="selected"` :

```ts
import { signal } from '@c9up/aurora'

const picked = signal<string | undefined>(undefined)

TableBody({
  children: invoices.map((invoice) =>
    TableRow({
      selected: () => picked() === invoice.id,
      onClick: () => picked(invoice.id),
      children: [TableCell({ children: invoice.id }), TableCell({ children: invoice.status })],
    }),
  ),
})
```

Une ligne ne prend pas le focus : un clic dessus est un raccourci pour le pointeur — mettez aussi l'action dont le clavier a besoin sur un contrôle dans la ligne.

### Une colonne triée

`sort` est écrit dans `aria-sort`, c'est ce qui annonce la colonne triée. Placez la bascule sur un bouton dans l'en-tête, que le clavier peut atteindre :

```ts
import { Button } from '@c9up/nebula'

const order = signal<'ascending' | 'descending'>('ascending')

TableHead({
  sort: order,
  children: Button({
    variant: 'ghost',
    size: 'sm',
    children: 'Montant',
    onClick: () => order(order() === 'ascending' ? 'descending' : 'ascending'),
  }),
})
```

## API

### Table

Le `<table>`, dans un `<div data-slot="table-container">` qui défile horizontalement.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | La légende, l'en-tête, le corps et le pied. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<table>`. |
| `id` | `string` | — | Acceptée par `StyledProps`, non rendue. |

### TableHeader, TableBody, TableFooter, TableCaption

`<thead>`, `<tbody>`, `<tfoot>` et `<caption>`, avec les mêmes props que `Table` (`TableProps`) : `children`, `class`, et un `id` non rendu.

### TableRow

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les cellules de la ligne. |
| `selected` | `Reactive<boolean>` | `false` | Pose `data-state="selected"`, sur lequel s'appuie le style de la ligne. |
| `onClick` | `(event: MouseEvent) => void` | — | Gestionnaire de clic sur le `<tr>`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la ligne. |
| `id` | `string` | — | Acceptée, non rendue. |

### TableHead

Un `<th>`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | L'intitulé. |
| `scope` | `'col' \| 'row'` | `'col'` | `row` pour un en-tête de ligne. |
| `colspan` | `number` | — | Le `colspan` natif. |
| `rowspan` | `number` | — | Le `rowspan` natif. |
| `sort` | `Reactive<'ascending' \| 'descending' \| 'none' \| undefined>` | — | Écrit dans `aria-sort`. À poser sur la colonne triée. |
| `onClick` | `(event: MouseEvent) => void` | — | Gestionnaire de clic sur le `<th>`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la cellule. |
| `id` | `string` | — | Acceptée, non rendue. |

### TableCell

Un `<td>`. Il prend les mêmes `TableCellProps` que `TableHead` mais ne rend que `children`, `class`, `colspan` et `rowspan` ; `scope`, `sort`, `onClick` et `id` n'ont aucun effet sur lui.

## Accessibilité

La sémantique native d'un tableau : les cellules `<th>` sont des en-têtes de colonne sauf si `scope: 'row'` dit autre chose, un `TableCaption` nomme le tableau, et `sort` pose `aria-sort` sur son en-tête. Les parties ne gèrent aucune touche — le clavier atteint les contrôles placés dans les cellules.
