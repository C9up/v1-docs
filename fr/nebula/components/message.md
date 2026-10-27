# Message

Un tour dans une conversation : un avatar, l'auteur, une [Bubble](/fr/nebula/components/bubble) avec le contenu, ses pièces jointes, et un horodatage ou un statut en dessous, disposés dans l'ordre de lecture. `align: 'end'` marque le tour de l'utilisateur courant et inverse la rangée avec `flex-row-reverse` : l'avatar passe du côté de fin de ligne et toute la rangée suit le sens d'écriture — le même traitement logique que la bulle.

L'horodatage est toujours un `<time datetime>`. Le texte visible est mis en forme pour le lecteur et peut être relatif (« il y a 2 min »), ce qu'une machine ne sait pas analyser ; `datetime` porte l'instant ISO à côté, pour qu'un lecteur d'écran, un robot ou un copier-coller gardent la vraie valeur.

```sh
ream nebula:add message
```

Molécule · `molecules/Message.ts` · [Avatar](/fr/nebula/components/avatar), [Bubble](/fr/nebula/components/bubble)

## Utilisation

```ts
import { Message } from '@c9up/nebula'

Message({
  author: 'Ada Lovelace',
  avatarFallback: 'AL',
  timestamp: '2026-10-27T09:14:00Z',
  children: 'Le rapport est prêt à relire.',
})
```

## Exemples

### Votre propre tour

```ts
Message({
  align: 'end',
  variant: 'accent',
  timestamp: new Date(),
  children: 'Merci, je le lis.',
})
```

Votre propre tour n'a en général ni auteur ni avatar : chacun n'est dessiné que s'il est fourni. `align` est lu une seule fois, à la construction — un message ne change pas de côté.

### Une photo, ou des initiales

```ts
Message({
  author: 'Ada Lovelace',
  avatarSrc: '/avatars/ada.jpg',
  avatarFallback: 'AL',
  children: 'Bonjour !',
})
```

Les initiales s'affichent tant qu'il n'y a pas de photo et si la photo échoue à charger — pas pendant qu'elle charge encore, si bien qu'une image lente ne clignote pas des initiales à la photo. Quand `author` est une chaîne, c'est aussi l'`alt` de la photo.

### Envoi en cours, échec

`status` prend la place de l'horodatage sous la bulle pendant qu'un tour est en route. Il est lu à la construction : un tour qui passe d'« en cours » à « envoyé » est reconstruit par la liste où il vit :

```ts
import { signal } from '@c9up/aurora'
import { Message } from '@c9up/nebula'

interface Outgoing { text: string; sentAt?: string; failed?: boolean }

const outbox = signal<readonly Outgoing[]>([])

const turns = () =>
  outbox().map((turn) =>
    Message({
      align: 'end',
      variant: 'accent',
      status: turn.failed === true ? 'Non envoyé' : turn.sentAt === undefined ? 'Envoi…' : undefined,
      timestamp: turn.sentAt,
      children: turn.text,
    }),
  )
```

Passez `turns` comme `children` à un [MessageScroller](/fr/nebula/components/message-scroller).

### Comment se lit l'heure

Par défaut, l'heure est une heure locale courte (`Intl.DateTimeFormat` avec `timeStyle: 'short'`). `formatTime` la remplace :

```ts
const relative = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

Message({
  author: 'Ada',
  timestamp: sentAt,
  formatTime: (date) => relative.format(Math.round((date.getTime() - Date.now()) / 60_000), 'minute'),
  children: 'Correctif poussé.',
})
```

Une chaîne `timestamp` qui n'est pas une date n'affiche aucune heure plutôt qu'« Invalid Date ».

### Pièces jointes et réactions

```ts
import { Attachment, Message } from '@c9up/nebula'

Message({
  author: 'Ada',
  children: 'Voici les chiffres.',
  attachments: Attachment({ name: 'q3-figures.xlsx', size: 48_213, href: '/files/q3-figures.xlsx' }),
  reactions: [{ emoji: '👍', count: 2, active: true, onToggle: () => toggleReaction('👍') }],
})
```

`reactions` et `variant` sont transmis tels quels à la bulle — voir [Bubble](/fr/nebula/components/bubble#reactions).

## API

### Message

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du tour, rendu dans une `Bubble`. |
| `author` | `Child` | — | Le nom au-dessus de la bulle. Une chaîne sert aussi d'`alt` à l'avatar. |
| `avatarSrc` | `string` | — | La photo de l'auteur. |
| `avatarFallback` | `Child` | — | Des initiales, quand il n'y a pas de photo ou qu'elle échoue à charger. L'avatar est dessiné quand celle-ci ou `avatarSrc` est fourni. |
| `timestamp` | `Date \| string` | — | Une `Date` ou une chaîne ISO, rendue en `<time datetime>`. |
| `formatTime` | `(date: Date) => string` | heure locale courte | Comment se lit l'horodatage. |
| `align` | `Reactive<'start' \| 'end'>` | `'start'` | `'end'` pour le tour de l'utilisateur courant. La rangée n'est inversée que pour la constante `'end'`. |
| `variant` | `Reactive<'default' \| 'accent' \| 'outline' \| 'ghost'>` | `'default'` | L'allure de la bulle. |
| `reactions` | `readonly BubbleReaction[]` | — | Transmis à la bulle. |
| `attachments` | `Slot` | — | Des [Attachment](/fr/nebula/components/attachment), sous la bulle. |
| `status` | `Child` | — | Affiché sous la bulle à la place de l'horodatage — « Envoi… », « Échec ». |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la rangée. |

## Accessibilité

La rangée est `role="article"`, ce qui regroupe ses parties : un lecteur d'écran rencontre un tour plutôt qu'une photo, un nom, une heure et un paragraphe épars comme quatre choses sans rapport. L'article n'a pas de nom accessible propre ; l'auteur est lu comme son premier texte. L'heure est un `<time>` dont le `datetime` porte l'instant ISO, quoi que dise le texte visible. La photo de l'avatar prend `author` comme `alt` quand c'est une chaîne, et un `alt` vide sinon.

Le message ne gère aucune touche ; les boutons de réaction sont des boutons natifs — voir [Bubble](/fr/nebula/components/bubble#accessibilite). Un message ne transmet jamais `collapsible` à sa bulle : il n'a donc pas de bouton « Show more ». Le format d'heure par défaut suit la locale du navigateur ; `formatTime` le remplace — voir [langues](/fr/nebula/languages).
