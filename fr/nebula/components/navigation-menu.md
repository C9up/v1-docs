# NavigationMenu

La navigation principale d'un site : une rangée de liens, dont certains ouvrent un panneau d'autres liens. C'est un `<nav>` de liens, jamais un `menu` — un menu est une liste de commandes, et annoncer une navigation comme un menu d'application propose aux utilisateurs de lecteur d'écran les mauvais raccourcis.

Il y a un seul panneau pour toute la barre, comme dans [Menubar](/fr/nebula/components/menubar) : un seul est ouvert à la fois, et passer d'un déclencheur à l'autre change son ancre et son contenu. Ce sont les délais qui le rendent utilisable au pointeur. L'ouverture attend 150 ms, pour que traverser la barre ne fasse pas clignoter chaque panneau au passage ; la fermeture attend 250 ms, pour qu'aller en diagonale d'un déclencheur vers son panneau ne le congédie pas à mi-chemin. Un simple lien de la barre ferme au survol un panneau ouvert, parce que le pointeur a quitté cette branche.

```sh
ream nebula:add navigation-menu
```

Organisme · `organisms/NavigationMenu.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink,
  NavigationMenuList, NavigationMenuTrigger,
} from '@c9up/nebula'

NavigationMenu({
  children: () => NavigationMenuList({ children: html`
    ${NavigationMenuItem({ children: () => html`
      ${NavigationMenuTrigger({ children: 'Produits' })}
      ${NavigationMenuContent({ children: () => html`
        ${NavigationMenuLink({ href: '/analytics', children: 'Statistiques' })}
        ${NavigationMenuLink({ href: '/reports', children: 'Rapports' })}
      ` })}
    ` })}
    ${NavigationMenuItem({ children: () => NavigationMenuLink({ href: '/pricing', children: 'Tarifs' }) })}
  ` }),
})
```

`NavigationMenu`, `NavigationMenuItem` et `NavigationMenuContent` prennent leurs parties dans un thunk — voir [composition](/fr/nebula/composition). `NavigationMenuList` prend une valeur simple : elle ne partage rien, et les éléments qu'elle contient sont de toute façon construits dans le thunk du menu.

## Exemples

### Un panneau de liens décrits

Le panneau contient ce que vous lui donnez. Les enfants d'un lien peuvent être du balisage — un titre et une ligne dessous. Ce `NavigationMenuContent` se place dans son `NavigationMenuItem`, après le déclencheur :

```ts
import { html } from '@c9up/aurora'
import { NavigationMenuContent, NavigationMenuLink } from '@c9up/nebula'

const docs = [
  { href: '/docs/installation', title: 'Installation', text: 'Ajouter le paquet et ses styles.' },
  { href: '/docs/components', title: 'Composants', text: 'Chaque composant, avec ses props.' },
]

NavigationMenuContent({
  class: 'w-96',
  children: () => html`<ul class="grid gap-2">${docs.map((doc) => html`<li>${NavigationMenuLink({
    href: doc.href,
    children: html`<div class="font-medium">${doc.title}</div><p class="text-muted-foreground line-clamp-2">${doc.text}</p>`,
  })}</li>`)}</ul>`,
})
```

### La page où l'on se trouve

`active` prend un accesseur : la marque suit la route.

```ts
NavigationMenuLink({ href: '/pricing', active: () => path() === '/pricing', children: 'Tarifs' })
```

Un lien actif porte `aria-current="page"` et `data-active="true"`, que ses classes stylent.

### Un lien qui ressemble à un déclencheur

Un simple lien placé dans la barre entre des déclencheurs doit en avoir l'allure. `triggerClasses` est la liste de classes du déclencheur :

```ts
import { NavigationMenuItem, NavigationMenuLink, triggerClasses } from '@c9up/nebula'

NavigationMenuItem({ children: () => NavigationMenuLink({ href: '/docs', class: triggerClasses, children: 'Documentation' }) })
```

### Viewport et indicateur

Le panneau est placé dans un portail et positionné contre son déclencheur, 6 px dessous. `NavigationMenuViewport` est donc inerte — un élément vide, là seulement pour qu'une mise en page copiée d'ailleurs garde sa forme. `NavigationMenuIndicator` se rend là où vous le mettez, avec `data-state="visible"` tant qu'un panneau est ouvert et `"hidden"` sinon.

## API

### NavigationMenu

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | En général une `NavigationMenuList`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<nav>`. |

### NavigationMenuList

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les éléments. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<ul>`. |

### NavigationMenuItem

Un `<li>`. Il réserve une place dans la barre, qu'il contienne un panneau ou non : le déclencheur et le contenu se trouvent par elle, et un élément qui n'est qu'un lien ne remplit jamais son panneau.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Un `NavigationMenuTrigger` et un `NavigationMenuContent`, ou un seul `NavigationMenuLink`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<li>`. |

### NavigationMenuTrigger

Un `<button>`. Un chevron placé après son contenu se retourne tant que son panneau est ouvert.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du bouton. |

### NavigationMenuContent

Ne rend rien là où il est écrit : le menu l'affiche dans le panneau de la barre quand son déclencheur s'ouvre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le contenu du panneau : des liens, ou n'importe quoi d'autre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

### NavigationMenuLink

Un `<a>`. Utilisable dans la barre ou dans un panneau.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `href` | `string` | — | La destination. |
| `children` | `Slot` | — | Le contenu du lien. |
| `active` | `Reactive<boolean>` | — | La page où se trouve l'utilisateur. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du lien. |

### NavigationMenuViewport

Inerte : un `<div>` vide, positionné en absolu.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### NavigationMenuIndicator

Une petite flèche, affichée tant qu'un panneau est ouvert.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans ses classes. |

### triggerClasses

`triggerClasses: string` — la liste de classes que porte un `NavigationMenuTrigger`, pour un lien qui doit en avoir l'air.

## Accessibilité

La barre est un `<nav>` qui contient une liste de vrais liens — aucun rôle `menu` ni `menuitem` nulle part. Un déclencheur est un `<button>` avec `aria-expanded`, et `aria-controls` tant que son panneau est ouvert. Un lien `active` a `aria-current="page"`.

Ouvrir un panneau ne déplace pas le focus. Le panneau est placé dans un portail à la fin du document : dans l'ordre de tabulation, ses liens viennent après le reste de la page, pas après leur déclencheur. Quand le panneau se ferme alors que le focus est dedans, le focus revient à son déclencheur ; un clic ailleurs le ferme et laisse le focus là où le clic l'a mis.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd>, <kbd>Espace</kbd>, <kbd>ArrowDown</kbd> | Sur un déclencheur : ouvrir son panneau tout de suite, sans le délai du survol. |
| <kbd>Échap</kbd> | Fermer le panneau. |
