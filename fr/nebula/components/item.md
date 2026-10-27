# Item

Une rangée dans une liste de choses : un emplacement de média en tête, un titre et une description, des actions en fin. Les lignes de réglages, les résultats de recherche, les membres d'une équipe et les fichiers d'une liste d'envoi ont tous cette forme, et construire chacune à la main est la façon dont un même produit finit avec quatre rythmes verticaux différents.

`ItemContent` est `min-w-0` : il se réduit à la place qui reste, un long titre passe à la ligne et une description est limitée à deux lignes, au lieu de pousser les actions hors de la rangée — le bug le plus courant d'une rangée flex faite à la main. Toutes les parties sauf `Item` sont de simples `<div>` stylés : elles s'imbriquent comme des valeurs, sans `() =>`.

```sh
ream nebula:add item
```

Molécule · `molecules/Item.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Button, Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@c9up/nebula'

Item({
  variant: 'outline',
  children: html`
    ${ItemContent({ children: html`
      ${ItemTitle({ children: 'Double authentification' })}
      ${ItemDescription({ children: 'Demander un code depuis votre téléphone à chaque connexion.' })}
    ` })}
    ${ItemActions({ children: Button({ variant: 'outline', size: 'sm', children: 'Activer' }) })}
  `,
})
```

## Exemples

### Variantes et tailles

```ts
Item({ children: 'Ni bordure ni fond' })                    // default
Item({ variant: 'outline', children: 'Une bordure à elle' })
Item({ variant: 'muted', children: 'Un fond teinté' })
Item({ size: 'sm', children: 'Marges et écarts resserrés' })
```

### Média

`ItemMedia` contient une icône — 16 px, sauf si elle porte sa propre classe `size-*` —, un avatar ou une vignette, et ne rétrécit jamais :

```ts
import { Avatar, AvatarFallback, AvatarImage, ItemMedia, SearchIcon } from '@c9up/nebula'

Item({
  variant: 'outline',
  size: 'sm',
  children: html`
    ${ItemMedia({ children: SearchIcon() })}
    ${ItemContent({ children: ItemTitle({ children: 'Recherche enregistrée : factures ouvertes' }) })}
  `,
})

Item({
  children: html`
    ${ItemMedia({ children: Avatar({ children: () => html`
      ${AvatarImage({ src: user.avatarUrl, alt: user.name })}
      ${AvatarFallback({ children: user.initials })}
    ` }) })}
    ${ItemContent({ children: html`
      ${ItemTitle({ children: user.name })}
      ${ItemDescription({ children: user.email })}
    ` })}
  `,
})
```

L'[Avatar](/fr/nebula/components/avatar) prend ses parties dans un thunk parce qu'il fournit un contexte ; les parties d'Item autour de lui, non.

### Une liste qui suit un signal

`ItemGroup` empile les rangées ; `ItemSeparator` trace le filet entre deux d'entre elles. Son `children` est un accesseur : la liste suit `people`.

```ts
import { ItemGroup, ItemSeparator } from '@c9up/nebula'

ItemGroup({
  children: () => people().map((person, index) => html`
    ${index > 0 ? ItemSeparator() : null}
    ${Item({ children: html`
      ${ItemContent({ children: html`
        ${ItemTitle({ children: person.name })}
        ${ItemDescription({ children: person.role })}
      ` })}
      ${ItemActions({ children: Button({ variant: 'ghost', size: 'sm', children: 'Retirer', onClick: () => remove(person.id) }) })}
    ` })}
  `),
})
```

### Une rangée qui est un lien

`Item` rend toujours un `<div>`. Pour une rangée qui navigue, posez vous-même `itemVariants` sur un `<a>` — les variantes portent déjà un fond au survol et un anneau de focus prévus pour ce cas :

```ts
import { ChevronRightIcon, itemVariants } from '@c9up/nebula'

html`<a href="/settings/billing" class="${itemVariants({ variant: 'outline', size: 'sm' })}">
  ${ItemContent({ children: ItemTitle({ children: 'Facturation' }) })}
  ${ItemActions({ children: ChevronRightIcon() })}
</a>`
```

## API

### Item

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les parties : média, contenu, actions. |
| `variant` | `Reactive<ItemVariants['variant']>` | `'default'` | `'default'` (transparente), `'outline'` (bordée) ou `'muted'` (teintée). |
| `size` | `Reactive<ItemVariants['size']>` | `'default'` | `'default'` ou `'sm'`, qui resserre marges et écarts. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### ItemGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les rangées, empilées en colonne. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### ItemMedia

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une icône, un avatar ou une image, en tête de rangée. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### ItemContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le titre et la description. Prend la largeur libre ; un second `ItemContent` dans la même rangée garde sa propre taille. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### ItemTitle

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le nom de la rangée, en graisse moyenne ; une icône ou un badge peut se placer à côté. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### ItemDescription

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une ligne atténuée sous le titre, limitée à deux lignes. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### ItemActions

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Des boutons ou une icône, en fin de rangée. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### ItemSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | À laisser vide : le séparateur est un filet de 1 px, et un contenu en déborderait. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### itemVariants

`itemVariants({ variant?, size?, class? }): string` — la liste de classes que porterait un `Item`, pour une rangée qui doit être un autre élément, comme un lien. `ItemVariants` est le type de ses options.

## Accessibilité

Un item est un `<div>` sans rôle, et il ne gère aucune touche. L'anneau de focus sur `:focus-visible` n'apparaît que sur une rangée qui peut prendre le focus — la forme lien ci-dessus. `ItemGroup` n'est pas annoncé comme une liste et `ItemSeparator` est un trait dessiné, pas un [Separator](/fr/nebula/components/separator) : pour qu'un lecteur d'écran entende « liste, 12 éléments », rendez les rangées dans un `<ul>` avec un `<li>` chacune.
