# Sidebar

La colonne de navigation de l'application, avec deux présentations pour une seule définition — une barre latérale est moins un composant qu'une décision de mise en page qui change avec la fenêtre. Sur un écran large, c'est une colonne à côté du contenu, repliable en une bande d'icônes ou hors de vue. Sous 768 px, c'est une [Sheet](/fr/nebula/components/sheet) qui glisse par-dessus la page : une colonne de 16rem sur un téléphone ne laisse rien au contenu. Les deux présentations lisent le même état d'ouverture : sur un téléphone, le panneau s'affiche dès que l'état est ouvert, et le fermer replie aussi la colonne large.

L'état ouvert ou replié vit dans un cookie, `nebula:sidebar`, gardé un an, pas dans `localStorage`. Le serveur rend la coquille, et seul un cookie y est lisible : avec `localStorage`, la barre serait rendue dépliée, puis se refermerait d'un coup à l'hydratation, à chaque chargement. Pour que le serveur le lise, ajoutez-le aux cookies que le `renderPage` d'Aurora a le droit de lire — `cookies: ['nebula:sidebar']`. Cet état est un seul signal pour toute la page, partagé par toutes les parties de la barre, si bien qu'un déclencheur placé dans un en-tête hors du fournisseur fonctionne quand même. <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>B</kbd> la bascule, la convention de tous les éditeurs qui en ont une.

```sh
ream nebula:add sidebar
```

Organisme · `organisms/Sidebar.ts` · [button](/fr/nebula/components/button), [input](/fr/nebula/components/input), [separator](/fr/nebula/components/separator), [sheet](/fr/nebula/components/sheet), [skeleton](/fr/nebula/components/skeleton), [tooltip](/fr/nebula/components/tooltip)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@c9up/nebula'

SidebarProvider({
  children: () => html`
    ${Sidebar({
      children: () => SidebarContent({
        children: SidebarMenu({ children: html`
          ${SidebarMenuItem({ children: SidebarMenuButton({ href: '/', active: true, children: 'Accueil' }) })}
          ${SidebarMenuItem({ children: SidebarMenuButton({ href: '/inbox', children: 'Boîte de réception' }) })}
        ` }),
      }),
    })}
    ${SidebarInset({ children: html`
      <header class="flex h-12 items-center border-b px-2">${SidebarTrigger()}</header>
      ${page}
    ` })}
  `,
})
```

`SidebarProvider` et `Sidebar` prennent leur `children` en `Parts`, dans `() =>` ; toutes les parties à l'intérieur de la barre sont de simples valeurs — voir [composition](/fr/nebula/composition). Pour une page avec une barre d'en-tête, l'[AppShell](/fr/nebula/components/app-shell) prend la `Sidebar` dans son emplacement `sidebar` et remplace `SidebarInset`.

## Exemples

### Groupes, icônes et infobulles

```ts
import { CalendarIcon, SearchIcon, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel } from '@c9up/nebula'

SidebarContent({
  children: SidebarGroup({ children: html`
    ${SidebarGroupLabel({ children: 'Planification' })}
    ${SidebarGroupAction({ label: 'Chercher dans le planning', onClick: () => openSearch(), children: SearchIcon() })}
    ${SidebarGroupContent({ children: SidebarMenu({ children: html`
      ${SidebarMenuItem({ children: SidebarMenuButton({
        href: '/calendar',
        tooltip: 'Calendrier',
        active: () => path() === '/calendar',
        children: html`${CalendarIcon()}<span>Calendrier</span>`,
      }) })}
    ` }) })}
  ` }),
})
```

Placez le texte de l'entrée dans un `<span>` : le dernier span est tronqué quand la colonne est étroite, et l'icône garde ses 16 px. `tooltip` ne s'affiche que lorsque la barre est repliée en icônes — une entrée dont le libellé est à l'écran n'a pas besoin d'être répétée au survol, et sans infobulle une barre repliée n'est qu'une colonne de glyphes sans nom. `active` prend un accesseur : il peut suivre la route.

### Replier en icônes, ou hors de vue

`collapsible` dit ce que fait le repli : `'icon'` (par défaut) réduit la colonne à une bande de 3rem, `'offcanvas'` la sort de l'écran, `'none'` la garde ouverte. Une fois la barre repliée, le `<nav>` porte `data-state="collapsed"` et `data-collapsible` avec le mode, et en mode `'icon'` les parties s'y adaptent : les libellés de groupe s'effacent, les actions, badges et sous-menus disparaissent, et les boutons de menu deviennent des carrés de 32 px.

Les largeurs sont des variables CSS, `--sidebar-width` (16rem) et `--sidebar-width-icon` (3rem), lues par la cascade — posez-les sur le fournisseur :

```ts
SidebarProvider({
  class: '[--sidebar-width:20rem]',
  children: () => html`
    ${Sidebar({ collapsible: 'offcanvas', children: () => SidebarContent({ children: navigation }) })}
    ${SidebarInset({ children: page })}
  `,
})
```

### En-tête, pied, recherche et rail

```ts
import { signal } from '@c9up/aurora'
import { SidebarFooter, SidebarHeader, SidebarInput, SidebarRail, SidebarSeparator } from '@c9up/nebula'

const query = signal('')

Sidebar({
  children: () => html`
    ${SidebarHeader({ children: SidebarInput({ placeholder: 'Rechercher…', value: query, onInput: query }) })}
    ${SidebarContent({ children: navigation })}
    ${SidebarSeparator()}
    ${SidebarFooter({ children: account })}
    ${SidebarRail()}
  `,
})
```

`SidebarContent` prend la hauteur libre et défile ; l'en-tête et le pied restent en place. `SidebarRail` est une fine zone de clic le long du bord de la colonne qui la bascule — une cible plus large que le déclencheur, et toujours là où l'œil se trouve déjà.

### Badges, actions de rangée et sous-menus

```ts
import {
  MoreHorizontalIcon,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@c9up/nebula'

SidebarMenuItem({ children: html`
  ${SidebarMenuButton({ href: '/inbox', children: html`<span>Boîte de réception</span>` })}
  ${SidebarMenuBadge({ children: unread })}
` })

SidebarMenuItem({ children: html`
  ${SidebarMenuButton({ href: '/projects/atlas', children: html`<span>Atlas</span>` })}
  ${SidebarMenuAction({ label: 'Options du projet', onClick: () => openOptions('atlas'), children: MoreHorizontalIcon() })}
` })

SidebarMenuItem({ children: html`
  ${SidebarMenuButton({ children: html`<span>Projets</span>` })}
  ${SidebarMenuSub({ children: html`
    ${SidebarMenuSubItem({ children: SidebarMenuSubButton({ href: '/projects/atlas', children: html`<span>Atlas</span>` }) })}
    ${SidebarMenuSubItem({ children: SidebarMenuSubButton({ href: '/projects/helix', active: true, children: html`<span>Helix</span>` }) })}
  ` })}
` })
```

Le badge et l'action se placent en fin de rangée, à côté du bouton, et le bouton laisse la place à une action quand sa rangée en a une.

### Pendant le chargement de la navigation

```ts
import { SidebarMenuSkeleton } from '@c9up/nebula'

SidebarMenu({
  children: () => loading()
    ? [1, 2, 3, 4].map(() => SidebarMenuItem({ children: SidebarMenuSkeleton({ showIcon: true }) }))
    : entries().map((entry) => SidebarMenuItem({
        children: SidebarMenuButton({ href: entry.href, children: html`<span>${entry.label}</span>` }),
      })),
})
```

Chaque rangée d'attente tire sa propre largeur, de 50 à 89 %, une fois, à sa construction — une colonne de barres égales en chargement se lit comme un graphique.

### Contrôlé

`open` et `onOpenChange` vous confient l'état :

```ts
const open = signal(true)

SidebarProvider({
  open,
  onOpenChange: open,
  children: () => html`
    ${Sidebar({ children: () => SidebarContent({ children: navigation }) })}
    ${SidebarInset({ children: html`${SidebarTrigger({ onToggle: () => open(!open()) })}${page}` })}
  `,
})
```

`SidebarTrigger` et `SidebarRail` basculent directement l'état partagé du cookie au lieu de passer par le fournisseur : une barre contrôlée donne `onToggle` à son déclencheur, et n'a pas de rail. Le raccourci clavier, lui, passe par le fournisseur : il bascule l'état partagé et transmet le résultat à `onOpenChange`. Les infobulles des entrées repliées suivent l'état partagé, pas `open`.

### Lire l'état

Dans le fournisseur, `useSidebar()` — appelé depuis la construction d'un composant — donne l'état et ses setters. Une marque qui se raccourcit avec la colonne :

```ts
import { component } from '@c9up/aurora'
import { useSidebar } from '@c9up/nebula'

const Brand = component(() => {
  const sidebar = useSidebar()
  return html`<a href="/" class="px-2 font-semibold">${() => (sidebar.state() === 'collapsed' ? 'A' : 'Acme')}</a>`
})

SidebarProvider({
  children: () => html`
    ${Sidebar({ children: () => html`${SidebarHeader({ children: Brand() })}${SidebarContent({ children: navigation })}` })}
    ${SidebarInset({ children: page })}
  `,
})
```

En dehors, `sidebarCollapsed()` lit l'état partagé et `sidebarState()` renvoie le signal lui-même :

```ts
import { sidebarCollapsed, sidebarState } from '@c9up/nebula'

html`<header class="flex items-center gap-2">
  ${SidebarTrigger()}
  <span class="${() => (sidebarCollapsed() ? 'font-semibold' : 'sr-only')}">Acme</span>
</header>`

const open = sidebarState()
open(false)
```

### Une entrée qui est un autre élément

`sidebarMenuButtonVariants` est la liste de classes d'un bouton de menu, pour un élément que `SidebarMenuButton` ne rend pas :

```ts
import { sidebarMenuButtonVariants } from '@c9up/nebula'

html`<a href="/" class="${sidebarMenuButtonVariants({ size: 'lg' })}">${CalendarIcon()}<span>Agenda</span></a>`
```

## API

### SidebarProvider

Tient l'état et rend l'enveloppe (`flex min-h-svh w-full`) autour de la barre et de la page.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | La `Sidebar` et la page, construites dans `() =>`. |
| `defaultOpen` | `boolean` | `true` | L'état de départ tant qu'il n'y a pas de cookie. Seul le premier fournisseur de la page le fixe. |
| `open` | `Reactive<boolean>` | — | L'état, contrôlé. |
| `onOpenChange` | `(open: boolean) => void` | — | Appelée quand le fournisseur change l'état : <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>B</kbd>, fermeture du panneau mobile, `useSidebar().setOpen`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'enveloppe ; c'est là que vont `--sidebar-width` et `--sidebar-width-icon`. |

### Sidebar

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les parties de la barre, construites dans `() =>`. |
| `side` | `'left' \| 'right'` | `'left'` | Le bord où la colonne trace sa bordure, et celui d'où glisse le panneau sur mobile. Sur un écran large, la colonne reste où le balisage la place : pour une barre à droite, placez-la après la page. |
| `collapsible` | `'icon' \| 'offcanvas' \| 'none'` | `'icon'` | Ce que fait le repli : réduire en icônes, disparaître, ou rien. |
| `label` | `string` | `'Sidebar'` | Le nom du point de repère de navigation. Sur mobile, le titre du panneau, qui vaut par défaut `'Navigation'`. |
| `closeLabel` | `string` | `'Close'` | La croix de fermeture du panneau qu'elle devient sur mobile. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la colonne. |

### SidebarTrigger

Un bouton-icône qui bascule la barre. Il fonctionne n'importe où dans la page, dans le fournisseur ou non.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `onToggle` | `() => void` | — | Remplace la bascule — pour une barre contrôlée. |
| `label` | `string` | `'Toggle sidebar'` | Le nom accessible du bouton. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarRail

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | `'Toggle sidebar'` | Nom accessible et infobulle. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarInset

La page à côté de la barre, dans un `<main>`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | La page. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarInput

Un [Input](/fr/nebula/components/input) à la taille de la colonne.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `placeholder` | `string` | — | L'indication affichée tant que le champ est vide. |
| `value` | `Reactive<string>` | — | La valeur. |
| `onInput` | `(value: string) => void` | — | Appelée à chaque saisie avec la nouvelle valeur. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarHeader

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le haut de la colonne : une marque, un sélecteur d'espace de travail, un champ de recherche. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### SidebarContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les groupes. Prend la hauteur libre et défile. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### SidebarFooter

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le bas de la colonne : le compte, un lien d'aide. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### SidebarSeparator

Un [Separator](/fr/nebula/components/separator) à la couleur des bordures de la barre, en retrait des bords.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un libellé, une action et le contenu du groupe. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### SidebarGroupLabel

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le nom du groupe, petit et atténué. S'efface quand la barre est repliée en icônes. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### SidebarGroupContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le menu du groupe. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### SidebarGroupAction

Un bouton dans le coin haut du groupe — « ajouter », « filtrer ». Masqué quand la barre est repliée en icônes.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | En général une icône. |
| `label` | `string` | — | Le nom accessible du bouton — indispensable pour une icône. |
| `onClick` | `() => void` | — | Gestionnaire de clic. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenu

Un `<ul>` d'entrées.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Des `SidebarMenuItem`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuItem

Un `<li>` : une rangée, qui contient un bouton et éventuellement une action et un badge.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un `SidebarMenuButton`, et un `SidebarMenuAction`, un `SidebarMenuBadge` ou un `SidebarMenuSub`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuButton

Un lien avec `href`, un `<button>` sans.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une icône et le texte, dans un `<span>`. |
| `href` | `string` | — | Rend un `<a>` vers cette URL. |
| `active` | `Reactive<boolean>` | `false` | L'entrée en cours : mise en évidence, `data-active="true"` et `aria-current="page"`. |
| `tooltip` | `string` | — | Affiché à côté de l'entrée quand la barre est repliée en icônes. |
| `variant` | `'default' \| 'outline'` | `'default'` | `outline` trace un anneau autour de l'entrée. |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | 32, 28 ou 48 px de haut. |
| `onClick` | `() => void` | — | Gestionnaire de clic — forme bouton seulement. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### SidebarMenuAction

Un second bouton sur une rangée — un menu « plus », un bouton de retrait. Masqué quand la barre est repliée en icônes.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | En général une icône. |
| `label` | `string` | — | Le nom accessible du bouton — indispensable pour une icône. |
| `onClick` | `() => void` | — | Gestionnaire de clic. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuBadge

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un compte ou un statut, en fin de rangée. Masqué quand la barre est repliée en icônes. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuSkeleton

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `showIcon` | `boolean` | `false` | Réserve la place d'une icône, comme en ont les vraies rangées. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuSub

Un `<ul>` imbriqué, souligné d'un filet à gauche. Masqué quand la barre est repliée en icônes.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Des `SidebarMenuSubItem`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuSubItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un `SidebarMenuSubButton`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### SidebarMenuSubButton

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte de l'entrée, dans un `<span>`. |
| `href` | `string` | — | Rend un `<a>` vers cette URL ; sans, un `<button>`. |
| `active` | `Reactive<boolean>` | `false` | L'entrée en cours : mise en évidence et `aria-current="page"`. |
| `size` | `'sm' \| 'md'` | `'md'` | La taille du texte. |
| `onClick` | `() => void` | — | Gestionnaire de clic — forme bouton seulement. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |

### sidebarMenuButtonVariants

`sidebarMenuButtonVariants({ variant?, size?, class? }): string` — la liste de classes d'un `SidebarMenuButton`. `SidebarMenuButtonVariants` est le type de ses options.

### useSidebar

`useSidebar(): SidebarApi` — l'état de la barre, depuis la construction d'un composant placé dans un `SidebarProvider`. Lève une erreur hors de lui.

| Membre | Type | Description |
|---|---|---|
| `open` | `() => boolean` | Si elle est ouverte — le `open` contrôlé quand il y en a un. |
| `isMobile` | `() => boolean` | Si la fenêtre fait moins de 768 px, là où la barre est un panneau. |
| `state` | `() => 'expanded' \| 'collapsed'` | `open`, sous la forme du mot écrit dans `data-state`. |
| `setOpen` | `(next: boolean) => void` | Fixe l'état partagé et appelle `onOpenChange`. |
| `toggleSidebar` | `() => void` | Bascule l'état partagé et appelle `onOpenChange`. |

### sidebarState et sidebarCollapsed

`sidebarState(defaultOpen = true): Signal<boolean>` — l'état d'ouverture adossé au cookie, partagé par toutes les barres de la page, créé au premier appel ; `defaultOpen` ne compte qu'à cet appel. `sidebarCollapsed(): boolean` vaut `!sidebarState()()`.

## Accessibilité

Sur un écran large, la barre est un point de repère `<nav>` nommé par `label`. Sur un téléphone, c'est une [Sheet](/fr/nebula/components/sheet) — une boîte de dialogue modale qui garde le focus en elle et se ferme avec <kbd>Échap</kbd> — titrée par `label` pour les seuls lecteurs d'écran, avec une croix de fermeture nommée par `closeLabel`.

Le déclencheur est un [Button](/fr/nebula/components/button) nommé par son `label`. Le rail est un `<button>` nommé et titré par son `label`, laissé hors de l'ordre de tabulation exprès : le clavier a déjà le raccourci et le déclencheur, et un troisième arrêt sur chaque page serait du bruit. L'entrée en cours porte `aria-current="page"`. Une entrée repliée garde son texte dans le balisage, donc son nom accessible ; l'infobulle est pour l'œil. `SidebarGroupAction` et `SidebarMenuAction` n'ont pas de nom par défaut — donnez un `label` à celles qui ne sont qu'une icône. `SidebarInput` ne prend pas de libellé : son placeholder est tout ce qu'il a, placez donc un `SidebarGroupLabel` ou un titre visible à côté.

| Touche | Action |
|---|---|
| <kbd>Cmd</kbd> + <kbd>B</kbd> / <kbd>Ctrl</kbd> + <kbd>B</kbd> | Bascule la barre, depuis n'importe où dans la page. |

Les textes intégrés sont en anglais ; `label` et `closeLabel` sur `Sidebar`, et `label` sur `SidebarTrigger` et `SidebarRail`, les remplacent — voir [langues](/fr/nebula/languages).
