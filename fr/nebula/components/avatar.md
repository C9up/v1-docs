# Avatar

La photo d'un utilisateur, avec un repli quand il n'y en a pas. Il a trois états, pas deux : une image qui n'est *pas encore* chargée n'affiche pas le repli — glisser des initiales puis une photo par-dessus un instant plus tard, c'est le scintillement que ce composant existe pour éviter. Le repli n'apparaît qu'une fois l'image réellement en échec, ou quand il n'y a pas d'`AvatarImage` du tout.

C'est ce que les parties partagent par `Avatar` : l'image signale son propre état de chargement, le repli le lit, et aucun des deux ne connaît l'autre. Autour, une pastille d'état pour le coin et un groupe qui empile plusieurs visages.

```sh
ream nebula:add avatar
```

Atome · `atoms/Avatar.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Avatar, AvatarFallback, AvatarImage } from '@c9up/nebula'

Avatar({
  children: () => html`
    ${AvatarImage({ src: user.photo, alt: user.name })}
    ${AvatarFallback({ children: user.initials })}
  `,
})
```

`children` est typé `Parts` : le `() =>` est ce qui permet à l'image et au repli de trouver leur `Avatar` — voir [composition](/fr/nebula/composition). Une `AvatarImage` ou un `AvatarFallback` utilisé hors d'un `Avatar` lève une erreur.

## Exemples

### Initiales seules

Un avatar sans `AvatarImage` affiche son repli tout de suite, sans attendre un chargement qui n'arrivera jamais. Une `AvatarImage` dont le `src` vaut `undefined` ou `''` compte comme absente :

```ts
Avatar({ children: () => AvatarFallback({ children: 'AB' }) })
```

### Tailles

```ts
Avatar({ size: 'sm', children: () => AvatarFallback({ children: 'AB' }) })  // 24 px
Avatar({ children: () => AvatarFallback({ children: 'AB' }) })               // 32 px
Avatar({ size: 'lg', children: () => AvatarFallback({ children: 'AB' }) })  // 40 px
```

Le texte du repli et la pastille suivent la taille de l'avatar.

### Une pastille d'état

`AvatarBadge` se place dans le coin inférieur droit, cerclé de la couleur de fond pour se détacher de la photo. Une icône à l'intérieur prend la taille de la pastille, et disparaît en `sm`, où il n'y a pas la place.

```ts
import { html } from '@c9up/aurora'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@c9up/nebula'

Avatar({
  children: () => html`
    ${AvatarImage({ src: user.photo, alt: user.name })}
    ${AvatarFallback({ children: user.initials })}
    ${() => (online() ? AvatarBadge({ class: 'bg-green-600' }) : null)}
  `,
})
```

### Un groupe

`AvatarGroup` fait se chevaucher ses avatars et cercle chacun d'eux, pour que la pile se lise comme des visages distincts. `AvatarGroupCount` la clôt avec le nombre de ceux qui n'y figurent pas, et prend la taille des avatars qui l'entourent.

```ts
import { html } from '@c9up/aurora'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@c9up/nebula'

AvatarGroup({
  children: html`
    ${team.slice(0, 3).map((member) =>
      Avatar({
        children: () => html`
          ${AvatarImage({ src: member.photo, alt: member.name })}
          ${AvatarFallback({ children: member.initials })}
        `,
      }),
    )}
    ${AvatarGroupCount({ children: `+${team.length - 3}` })}
  `,
})
```

`AvatarGroup` ne fournit rien : ses `children` sont une simple valeur, et chaque `Avatar` à l'intérieur garde son propre thunk.

### Une autre personne

Une `AvatarImage` signale son état quand elle est construite, et une image en échec le reste. Pour montrer quelqu'un d'autre, construisez un nouvel avatar plutôt que de donner un nouveau `src` au même :

```ts
html`${() => {
  const person = current()
  return Avatar({
    children: () => html`
      ${AvatarImage({ src: person.photo, alt: person.name })}
      ${AvatarFallback({ children: person.initials })}
    `,
  })
}}`
```

## API

### Avatar

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Une `AvatarImage`, un `AvatarFallback`, un `AvatarBadge`. |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | 24, 32 ou 40 px. Fixée une fois. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

### AvatarImage

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `src` | `Reactive<string \| undefined>` | — | `undefined` ou `''` vaut absence d'image : le repli s'affiche d'emblée. |
| `alt` | `Reactive<string>` | `''` | Le nom de la personne. Laissé vide, l'image est décorative. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'`<img>`. |

### AvatarFallback

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Des initiales, une icône. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du repli. |

### AvatarBadge

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une icône facultative ; masquée en `size: 'sm'`. |
| `class` | `Reactive<string>` | — | Sa couleur, en général. |

### AvatarGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les `Avatar`, puis un `AvatarGroupCount`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### AvatarGroupCount

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | `"+3"`, ou une icône. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du compteur. |

## Accessibilité

L'image est une `<img>` native et son `alt` est ce que dit un lecteur d'écran. Il vaut `''` par défaut, ce qui rend la photo décorative — juste quand le nom de la personne est écrit à côté, faux quand l'avatar est seul : donnez-lui alors le nom en `alt`. Le repli est du texte simple, lu tel quel : des initiales seules disent peu de chose, et un avatar isolé est mieux servi par un `alt` d'image ou un nom à côté. `AvatarBadge` n'a pas de texte à lui ; si l'état qu'il montre compte, dites-le en mots à proximité. Rien ici ne prend le focus.
