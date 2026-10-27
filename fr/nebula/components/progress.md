# Progress

Une barre de progression déterminée : quelle part d'un tout connu est faite. Le remplissage est une barre pleine largeur décalée vers la gauche de ce qui reste, pas une largeur qui grandit — une transformation est composée hors du fil principal, alors qu'animer `width` recalcule la mise en page de la barre à chaque image, et cela se voit sur un long envoi.

Une `value` à `null` signifie que la quantité est inconnue. La barre retire alors `aria-valuenow`, qui est la façon dont ARIA dit « progression inconnue » ; annoncer `0` à la place dirait à l'utilisateur que le travail n'a pas commencé.

```sh
ream nebula:add progress
```

Atome · `atoms/Progress.ts` · aucune dépendance

## Utilisation

```ts
import { Progress } from '@c9up/nebula'

Progress({ value: 40, label: 'Profil complété' })
```

## Exemples

### Suivre un envoi

`value` et `max` prennent des accesseurs, et un signal en est un. La barre le suit pendant qu'il avance :

```ts
import { signal } from '@c9up/aurora'
import { Progress } from '@c9up/nebula'

const sent = signal(0)

Progress({ value: sent, max: file.size, label: `Envoi de ${file.name}` })

request.upload.addEventListener('progress', (event) => sent(event.loaded))
```

`value` est bornée entre `0` et `max` : un dernier événement de progression qui dépasse ne pousse pas le remplissage hors de la piste. Un `max` nul ou négatif retombe sur `100`.

### Étapes

```ts
Progress({ value: () => step(), max: 4, label: () => `Étape ${step()} sur 4` })
```

### Progression inconnue

```ts
Progress({ value: null, label: "Préparation de l'export" })
```

La barre reste vide et ne dessine aucun mouvement propre ; pour une activité sans fin mesurable, un [Spinner](/fr/nebula/components/spinner) en dit davantage.

### Hauteur et couleur

```ts
Progress({ value: 72, class: 'h-1' })
```

`class` est fusionnée dans les classes de la piste : une hauteur en conflit l'emporte. Le remplissage est `bg-primary`, et la piste la même couleur à 20 %.

## API

### Progress

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `Reactive<number \| null>` | `0` | De `0` à `max`, bornée. `null` pour une progression inconnue. |
| `max` | `Reactive<number>` | `100` | Le tout. Nul ou négatif, il est lu comme `100`. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la piste. |

## Accessibilité

`role="progressbar"` avec `aria-valuemin="0"`, `aria-valuemax` égal à `max` et `aria-valuenow` à la `value` bornée — absent quand `value` vaut `null`. Une barre de progression a besoin d'un nom pour être annoncée autrement que comme « barre de progression » : donnez-lui un `label`. Le composant ne prend aucun autre attribut : `label` est le seul moyen de la nommer. Elle n'est pas focalisable et ne gère aucune touche.
