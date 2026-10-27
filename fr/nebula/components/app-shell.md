# AppShell

La mise en page derrière presque toutes les pages d'un utilisateur connecté : une colonne de navigation, une barre au-dessus du contenu, et la page. C'est un template — un squelette de page livré avec la bibliothèque plutôt que refait dans chaque application — c'est en le refaisant que deux pages d'un même produit finissent avec deux hauteurs d'en-tête.

La coquille est `h-svh` et seule la colonne de contenu défile — `overflow-auto` sur `<main>`, pas sur le body. L'en-tête et la navigation restent ainsi en place sans `position: fixed`, qui obligerait à tenir à la main une marge haute égale à la hauteur de l'en-tête, et casserait dès que l'en-tête passe sur deux lignes. `svh` plutôt que `vh` : les navigateurs mobiles réduisent la fenêtre quand leur barre d'adresse se replie, et `vh` laisserait le bas de la mise en page sous l'interface du navigateur.

```sh
ream nebula:add app-shell
```

Template · `templates/AppShell.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { AppShell } from '@c9up/nebula'

AppShell({
  sidebar: html`<nav aria-label="Principale" class="w-64 border-r p-4">${links}</nav>`,
  header: html`<h1 class="text-sm font-medium">Factures</h1>`,
  children: page,
})
```

## Exemples

### Avec la Sidebar

La [Sidebar](/fr/nebula/components/sidebar) va dans `sidebar` et son déclencheur dans `header`. Le `SidebarProvider` enveloppe toute la coquille, pour que la barre trouve son état au moment où elle est construite :

```ts
import { Separator, Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@c9up/nebula'

SidebarProvider({
  children: () => AppShell({
    sidebar: Sidebar({ children: () => SidebarContent({ children: navigation }) }),
    header: html`
      ${SidebarTrigger()}
      ${Separator({ orientation: 'vertical', class: 'data-[orientation=vertical]:h-4' })}
      <h1 class="text-sm font-medium">Factures</h1>
    `,
    children: page,
  }),
})
```

`AppShell` rend déjà la page dans un `<main>` : utilisez-le à la place de `SidebarInset`, pas autour.

### Sans en-tête

Sans `header`, aucune barre n'est rendue — la colonne de contenu commence en haut :

```ts
AppShell({ sidebar: nav, children: page })
```

La présence de l'en-tête se décide une fois, à la construction : un accesseur `header` qui ne renvoie rien laisse quand même une barre vide.

### Une page pleine largeur

La colonne de contenu a une marge intérieure (`p-4`, `p-6` à partir de `md`). `contentClass` la remplace pour une page qui a besoin de chaque pixel — une carte, un éditeur, ou un template qui a sa propre marge comme [SettingsLayout](/fr/nebula/components/settings-layout). Remplacez les deux valeurs, `p-0 md:p-0` : un simple `p-0` remplace `p-4` et laisse `md:p-6` en place.

```ts
AppShell({ sidebar: nav, header: toolbar, contentClass: 'p-0 md:p-0', children: map })
```

```ts
import { SettingsLayout } from '@c9up/nebula'

AppShell({
  sidebar: nav,
  contentClass: 'p-0 md:p-0',
  children: SettingsLayout({ title: 'Réglages', sections, children: panel }),
})
```

## API

### AppShell

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `sidebar` | `Slot` | — | La colonne de navigation — le plus souvent une `Sidebar`. |
| `header` | `Slot` | — | La barre du haut, 56 px, au-dessus de la colonne de contenu. Absente, pas de barre. |
| `children` | `Slot` | — | La page. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la coquille. |
| `contentClass` | `Reactive<string>` | — | Fusionnée dans les classes de la colonne de contenu — sa marge intérieure, avant tout. |

## Accessibilité

La coquille donne à la page ses points de repère : l'en-tête est un `<header>` et le contenu un `<main>`, si bien qu'un utilisateur de lecteur d'écran saute directement à l'un ou à l'autre. Le repère de navigation vient de ce que vous placez dans `sidebar` — une `Sidebar` est un `<nav>` sur un écran large ; une colonne à vous devrait en être un aussi, avec un `aria-label`. Rien dans la coquille n'est focalisable et elle ne gère aucune touche.
