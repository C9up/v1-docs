# SettingsLayout

Une page de réglages : un titre et une description, une liste de rubriques, et le panneau de la rubrique en cours. La liste est un `<nav>` de liens, pas des [Tabs](/fr/nebula/components/tabs) : les rubriques de réglages sont des pages, chacune avec son URL, si bien qu'un lien vers « Facturation » ouvre la Facturation et que le bouton Retour ramène à la rubrique précédente au lieu de quitter les réglages. Des onglets donneraient le même aspect et rien de tout cela.

La liste se place au-dessus du panneau sur les écrans étroits — en défilant de côté quand elle est longue — et à côté à partir de `md` : c'est la seule décision de mise en page adaptative que prend ce template.

```sh
ream nebula:add settings-layout
```

Template · `templates/SettingsLayout.ts` · aucune dépendance

## Utilisation

```ts
import { SettingsLayout } from '@c9up/nebula'

SettingsLayout({
  title: 'Réglages',
  sections: [
    { label: 'Profil', href: '/settings/profile', active: true },
    { label: 'Facturation', href: '/settings/billing' },
  ],
  children: profileForm,
})
```

## Exemples

### La rubrique en cours d'après la route

`sections` est lue une fois, au rendu de la page — chaque rubrique est sa propre page, et la page sait laquelle elle est. Marquez-la d'après le chemin servi :

```ts
import { type SettingsSection, SettingsLayout } from '@c9up/nebula'

const sections: SettingsSection[] = [
  { label: 'Profil', href: '/settings/profile' },
  { label: 'Compte', href: '/settings/account' },
  { label: 'Notifications', href: '/settings/notifications' },
]

SettingsLayout({
  title: 'Réglages',
  description: 'Gérez votre compte et vos préférences de courriel.',
  sections: sections.map((section) => ({ ...section, active: section.href === currentPath })),
  children: panel,
})
```

### Dans la coquille d'application

Le template a sa propre marge intérieure (`p-4`, `p-10` à partir de `md`) ; dans un [AppShell](/fr/nebula/components/app-shell), coupez celle de la coquille avec `contentClass: 'p-0 md:p-0'` — l'exemple est sur la page d'AppShell.

## API

### SettingsLayout

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `title` | `Child` | — | Obligatoire. Le titre de la page. |
| `description` | `Child` | — | Une ligne atténuée sous le titre. |
| `sections` | `readonly SettingsSection[]` | — | Obligatoire. Les liens des rubriques, dans l'ordre. Lue une fois. |
| `navLabel` | `string` | `'Settings sections'` | Le nom accessible de la liste des rubriques. |
| `children` | `Slot` | — | Le panneau de la rubrique en cours. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

### SettingsSection

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `Child` | — | Le texte du lien. |
| `href` | `string` | — | L'URL de la rubrique. |
| `active` | `boolean` | `false` | Marque la rubrique affichée : mise en évidence, et `aria-current="page"`. |

## Accessibilité

Le titre est le `<h1>` de la page. La liste des rubriques est un point de repère `<nav>` nommé par `navLabel`, et le lien de la rubrique en cours porte `aria-current="page"`, qu'un lecteur d'écran annonce comme « page actuelle » — la mise en évidence est dessinée d'après ce même attribut, les deux ne peuvent donc pas diverger. Les liens sont natifs : <kbd>Tab</kbd> les parcourt et <kbd>Entrée</kbd> en suit un ; le template ne gère lui-même aucune touche.

Le nom de la liste est en anglais par défaut ; `navLabel` le remplace — voir [langues](/fr/nebula/languages).
