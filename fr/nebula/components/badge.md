# Badge

Un petit marqueur d'état ou de compte : quatre variantes, une taille, un emplacement d'icône à la taille du texte. Les variantes sont exportées en plus du composant, pour la même raison que celles de [Button](/fr/nebula/components/button) : un badge est souvent un lien vers ce qu'il compte, et une ancre a besoin des classes sans l'élément.

```sh
ream nebula:add badge
```

Atome · `atoms/Badge.ts` · aucune dépendance

## Utilisation

```ts
import { Badge } from '@c9up/nebula'

Badge({ children: 'Nouveau' })
```

## Exemples

### Variantes

```ts
Badge({ children: 'Actif' })                              // default
Badge({ variant: 'secondary', children: 'Brouillon' })
Badge({ variant: 'destructive', children: 'En retard' })
Badge({ variant: 'outline', children: 'v2.4' })
```

### Avec une icône

Un SVG placé dans le badge fait 12 px et ne capte pas le pointeur.

```ts
import { html } from '@c9up/aurora'
import { CheckIcon } from '@c9up/nebula'

Badge({ variant: 'secondary', children: html`${CheckIcon()} Vérifié` })
```

### Un compte qui suit un signal

`children` prend un accesseur, `variant` aussi :

```ts
Badge({
  variant: () => (unread() > 0 ? 'default' : 'outline'),
  children: () => `${unread()} non lus`,
})
```

### Un badge qui est un lien

Il n'y a pas d'`asChild`. Posez les variantes vous-même sur l'ancre — la couleur de survol est écrite pour un `<a>` et ne s'applique qu'à lui :

```ts
import { html } from '@c9up/aurora'
import { badgeVariants } from '@c9up/nebula'

html`<a href="/inbox" class="${badgeVariants({ variant: 'secondary' })}">3 non lus</a>`
```

## API

### Badge

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Du texte, une icône, ou les deux. |
| `variant` | `Reactive<'default' \| 'secondary' \| 'destructive' \| 'outline'>` | `'default'` | L'allure. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### badgeVariants

`badgeVariants({ variant?, class? }): string` — la liste de classes que porterait un `Badge`, pour un élément qui doit en avoir l'air sans en être un. `BadgeVariants` est cet argument sans `class` : `{ variant? }`.

## Accessibilité

Un `<span>` sans rôle : il est lu comme le texte qu'il contient, là où il se trouve. Une couleur ne dit rien à un lecteur d'écran, ce sont donc les mots qui portent le sens — `"En retard"`, pas un point rouge. Un compte est plus clair avec son nom (`"3 non lus"`, pas `"3"`). Sur une ancre faite avec `badgeVariants`, l'anneau de focus est dessiné sur `:focus-visible`, et `aria-invalid` le dessine dans la couleur destructive.
