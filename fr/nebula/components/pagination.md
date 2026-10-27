# Pagination

Des liens de page pour une longue liste : un `<nav>` qui contient une liste de liens, un pas précédent et un pas suivant, et des points de suspension pour les pages qui ne tiennent pas.

Les pages à afficher sont décidées par `pageWindow`. Afficher toutes les pages casse à quelques centaines ; le remède habituel — une plage fixe autour de la page courante — se rétrécit près des extrémités, si bien que la rangée se recompose pendant qu'on clique et que les boutons bougent sous le pointeur. `pageWindow` garde au contraire un nombre de cases constant : la première page, la dernière, une plage autour de la courante et un ou deux trous, la même largeur de la page 1 à la page 500.

```sh
ream nebula:add pagination
```

Molécule · `molecules/Pagination.ts` · [Button](/fr/nebula/components/button)

## Utilisation

```ts
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@c9up/nebula'

Pagination({
  children: PaginationContent({
    children: [
      PaginationItem({ children: PaginationPrevious({ href: '?page=1' }) }),
      PaginationItem({ children: PaginationLink({ href: '?page=1', children: '1' }) }),
      PaginationItem({ children: PaginationLink({ href: '?page=2', isActive: true, children: '2' }) }),
      PaginationItem({ children: PaginationLink({ href: '?page=3', children: '3' }) }),
      PaginationItem({ children: PaginationEllipsis({}) }),
      PaginationItem({ children: PaginationNext({ href: '?page=3' }) }),
    ],
  }),
})
```

Les parties ne partagent aucun état et prennent leur contenu en valeurs simples. Chaque lien est un `<a>` : avec un `href` et sans gestionnaire, il navigue comme n'importe quel lien — une pagination rendue côté serveur fonctionne sans JavaScript.

## Exemples

### Les pages de pageWindow

Côté serveur, la page courante et le nombre de pages sont connus au moment de construire la page :

```ts
import { pageWindow } from '@c9up/nebula'

Pagination({
  children: PaginationContent({
    children: [
      PaginationItem({
        children: PaginationPrevious({ href: `?page=${current - 1}`, disabled: current <= 1 }),
      }),
      ...pageWindow(current, pageCount).map((entry) =>
        PaginationItem({
          children:
            entry === null
              ? PaginationEllipsis({})
              : PaginationLink({ href: `?page=${entry}`, isActive: entry === current, children: String(entry) }),
        }),
      ),
      PaginationItem({
        children: PaginationNext({ href: `?page=${current + 1}`, disabled: current >= pageCount }),
      }),
    ],
  }),
})
```

`null` dans la fenêtre est un trou. Un pas `disabled` garde sa place dans la rangée — grisé, `aria-disabled`, et un clic dessus est annulé.

### Paginer sur place

`onSelect` prend la main sur le clic : la navigation par défaut est annulée et le gestionnaire s'exécute. Les pages affichées dépendent de la page courante, donc la liste est un accesseur, reconstruit quand la page change. Gardez les `href` — ce sont eux qui mettent les liens dans l'ordre de tabulation :

```ts
import { signal } from '@c9up/aurora'

const page = signal(1)

Pagination({
  children: () =>
    PaginationContent({
      children: [
        PaginationItem({
          children: PaginationPrevious({
            href: `?page=${page() - 1}`,
            disabled: page() <= 1,
            onSelect: () => page(page() - 1),
          }),
        }),
        ...pageWindow(page(), pageCount).map((entry) =>
          PaginationItem({
            children:
              entry === null
                ? PaginationEllipsis({})
                : PaginationLink({
                    href: `?page=${entry}`,
                    isActive: entry === page(),
                    onSelect: () => page(entry),
                    children: String(entry),
                  }),
          }),
        ),
        PaginationItem({
          children: PaginationNext({
            href: `?page=${page() + 1}`,
            disabled: page() >= pageCount,
            onSelect: () => page(page() + 1),
          }),
        }),
      ],
    }),
})
```

### Une autre largeur de fenêtre

`pageWindow` rend sept cases par défaut. Un troisième argument change la largeur ; cinq est le minimum qu'elle construit — la première page, un trou, la page courante, un trou, la dernière :

```ts
pageWindow(25, 50)    // [1, null, 24, 25, 26, null, 50]
pageWindow(25, 50, 9) // [1, null, 23, 24, 25, 26, 27, null, 50]
pageWindow(2, 50)     // [1, 2, 3, 4, 5, null, 50]
```

### Dans une autre langue

`aria-label` remplace chaque nom accessible, et `children` remplace le mot visible d'un pas en gardant sa flèche :

```ts
Pagination({
  'aria-label': 'Pages des résultats',
  children: PaginationContent({
    children: [
      PaginationItem({ children: PaginationPrevious({ href: '?page=1', 'aria-label': 'Page précédente', children: 'Précédent' }) }),
      PaginationItem({ children: PaginationEllipsis({ label: 'Autres pages' }) }),
      PaginationItem({ children: PaginationNext({ href: '?page=3', 'aria-label': 'Page suivante', children: 'Suivant' }) }),
    ],
  }),
})
```

## API

### Pagination

Un `<nav>` (`PaginationNavProps`).

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le `PaginationContent`. |
| `aria-label` | `string` | `'pagination'` | Le nom du repère de navigation. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<nav>`. |

### PaginationContent, PaginationItem

Le `<ul>` et ses `<li>` (`PaginationProps`).

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les éléments ; le lien d'un élément. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<ul>`. `PaginationItem` ne la rend pas. |

### PaginationLink

Un `<a>`, dessiné avec les variantes de [Button](/fr/nebula/components/button) : `outline` quand il est actif, `ghost` sinon.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le numéro de page. |
| `href` | `string` | — | La destination. Sans elle, le `<a>` n'a pas de rôle de lien et sort de l'ordre de tabulation. |
| `isActive` | `Reactive<boolean>` | `false` | La page où se trouve l'utilisateur. Pose `aria-current="page"`. |
| `size` | `'default' \| 'icon'` | `'icon'` | `icon` est un carré pour un numéro. |
| `disabled` | `Reactive<boolean>` | `false` | Pose `aria-disabled`, grise le lien et annule ses clics. |
| `onSelect` | `(event: MouseEvent) => void` | — | Annule la navigation et s'exécute à la place. Sans lui, un `href` navigue. |
| `aria-label` | `string` | — | Le nom accessible. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### PaginationPrevious, PaginationNext

Un `PaginationLink` de taille `default` avec une flèche. Leurs props sont `PaginationStepProps` — celles de `PaginationLink` sans `size` ni `isActive`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | `'Previous'` / `'Next'` | Le mot visible à côté de la flèche, masqué sous le point de rupture `sm`. |
| `aria-label` | `string` | `'Go to previous page'` / `'Go to next page'` | Le nom accessible. |
| `href` | `string` | — | La destination. |
| `disabled` | `Reactive<boolean>` | `false` | Comme sur `PaginationLink`. |
| `onSelect` | `(event: MouseEvent) => void` | — | Comme sur `PaginationLink`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du pas. |

### PaginationEllipsis

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | `'More pages'` | Le texte visuellement masqué qu'il contient. Les points de suspension sont `aria-hidden` : un lecteur d'écran saute aussi ce texte. |
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### pageWindow

`pageWindow(page: number, pageCount: number, size = 7): readonly PageSlot[]` — les pages à afficher. Toutes quand `pageCount <= size` ; sinon exactement `size` cases (cinq au moins) : la première page, la dernière, une plage autour de `page` et `null` pour chaque trou. Près d'une extrémité il n'y a qu'un trou, alors la plage s'élargit d'une case pour compenser. `page` est ramenée dans `1 … pageCount`. `PageSlot` vaut `number | null`.

### PaginationLabels

Le type de `paginationLabels` sur [DataTable](/fr/nebula/components/data-table) — chaque texte qu'écrit une pagination :

| Clé | Défaut | Où |
|---|---|---|
| `navigation` | `'pagination'` | Le nom du `<nav>`. |
| `previous` | `'Previous'` | Le mot visible à côté de la flèche précédente. |
| `previousPage` | `'Go to previous page'` | Le nom du lien précédent. |
| `next` | `'Next'` | Le mot visible à côté de la flèche suivante. |
| `nextPage` | `'Go to next page'` | Le nom du lien suivant. |
| `morePages` | `'More pages'` | Le texte masqué des points de suspension. |

Ces défauts sont l'objet figé `paginationLabels`, exporté par `molecules/Pagination.ts` mais pas par le paquet.

## Accessibilité

La racine est un `<nav role="navigation">` nommé par `aria-label`. La page courante porte `aria-current="page"` — sans lui, le seul signal est la mise en évidence, que l'utilisateur d'un lecteur d'écran ne reçoit pas. Un pas désactivé est `aria-disabled="true"`. Les points de suspension sont `aria-hidden="true"`, texte masqué compris : un lecteur d'écran saute le trou et lit les numéros de part et d'autre.

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Parcourt les liens qui ont un `href`. |
| <kbd>Entrée</kbd> | Suit le lien, ou exécute son `onSelect`. |

Le nom du repère, les mots et les noms des deux pas et le texte des points de suspension sont en anglais par défaut ; les props ci-dessus les remplacent — voir [langues](/fr/nebula/languages).
