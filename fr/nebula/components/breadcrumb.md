# Breadcrumb

Le chemin de retour dans la hiérarchie : un `<nav>` nommé, une liste ordonnée de miettes, un chevron entre elles, et la dernière marquée comme la page où vous êtes. Toutes les parties sont visuelles — il n'y a pas de contexte à l'intérieur duquel se trouver — si bien qu'aucune ne prend `Parts`, et qu'un fil construit à partir d'un signal ne demande rien de particulier.

```sh
ream nebula:add breadcrumb
```

Molécule · `molecules/Breadcrumb.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@c9up/nebula'

Breadcrumb({
  children: BreadcrumbList({
    children: html`
      ${BreadcrumbItem({ children: BreadcrumbLink({ href: '/', children: 'Accueil' }) })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbLink({ href: '/settings', children: 'Réglages' }) })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbPage({ children: 'Profil' }) })}
    `,
  }),
})
```

Un séparateur est un élément de liste à part entière : il se place entre les `BreadcrumbItem`, pas à l'intérieur de l'un d'eux.

## Exemples

### Un fil replié

`BreadcrumbEllipsis` tient la place des ancêtres qui n'ont pas tenu :

```ts
import { html } from '@c9up/aurora'
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@c9up/nebula'

Breadcrumb({
  children: BreadcrumbList({
    children: html`
      ${BreadcrumbItem({ children: BreadcrumbLink({ href: '/', children: 'Accueil' }) })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbEllipsis() })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbPage({ children: 'Facture 2024-118' }) })}
    `,
  }),
})
```

### Votre propre séparateur

`children` remplace le chevron :

```ts
BreadcrumbSeparator({ children: '/' })
```

### Un fil qui suit la route

Les parties sont du simple balisage : toute la liste peut venir d'un accesseur.

```ts
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@c9up/nebula'

Breadcrumb({
  children: BreadcrumbList({
    children: () =>
      trail().flatMap((crumb, index, all) =>
        index === all.length - 1
          ? [BreadcrumbItem({ children: BreadcrumbPage({ children: crumb.label }) })]
          : [BreadcrumbItem({ children: BreadcrumbLink({ href: crumb.href, children: crumb.label }) }), BreadcrumbSeparator()],
      ),
  }),
})
```

`href` est lu une fois, à la construction du lien ; une miette dont la cible change est une nouvelle miette, et c'est ce que donne la reconstruction de la liste à partir de `trail()`.

### Dans une autre langue

```ts
Breadcrumb({
  'aria-label': 'Fil d’Ariane',
  children: BreadcrumbList({ children: BreadcrumbItem({ children: BreadcrumbEllipsis({ label: 'Plus' }) }) }),
})
```

## API

### Breadcrumb

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une `BreadcrumbList`. |
| `aria-label` | `string` | `'breadcrumb'` | Le nom accessible du `<nav>`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<nav>`. |

### BreadcrumbList

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les éléments et les séparateurs, dans l'ordre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'`<ol>`. |

### BreadcrumbItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un `BreadcrumbLink`, un `BreadcrumbPage` ou un `BreadcrumbEllipsis`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<li>`. |

### BreadcrumbLink

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `href` | `string` | — | Où mène la miette. |
| `children` | `Slot` | — | Le texte de la miette. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'`<a>`. |

### BreadcrumbPage

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le nom de la page courante. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la miette. |

### BreadcrumbSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | un chevron | Remplace le chevron. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du séparateur. |

### BreadcrumbEllipsis

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | `'More'` | Le texte caché qu'il porte. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'ellipse. |

## Accessibilité

`Breadcrumb` est un `<nav>` nommé par `aria-label` : ce nom est ce qui permet à un lecteur d'écran de distinguer cette navigation des autres repères de la page. La dernière miette, `BreadcrumbPage`, porte `aria-current="page"` — le changement de couleur ne dit à personne où il se trouve, l'attribut si. C'est un `<span role="link" aria-disabled="true">` plutôt qu'un `<a>` sans `href`, ce qui la garde dans le même rôle que ses voisines pour que la liste soit annoncée de façon cohérente.

Les séparateurs sont `aria-hidden` et `role="presentation"` : lu à voix haute, un chevron entre chaque miette n'est que du bruit, et la liste dit déjà l'ordre. `BreadcrumbEllipsis` est caché de la même façon, et le `label` qu'il contient avec lui — un lecteur d'écran le saute. Si l'ellipse ouvre les miettes repliées, placez-la dans un bouton ou un déclencheur de menu qui a son propre nom.

Les deux textes intégrés, `aria-label` et le `label` de l'ellipse, sont des props : voir [langues](/fr/nebula/languages).
