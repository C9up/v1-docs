# MessageScroller

Une conversation qui reste calée sur son message le plus récent. Tout le composant tient en une règle et son exception : **suivre le bas, mais ne jamais arracher le lecteur à sa lecture.** Un fil qui défile toujours jusqu'à la fin devient inutilisable dès qu'on remonte relire quelque chose et qu'un message arrive ; un fil qui ne défile jamais l'est dans le cas ordinaire. Le scroller retient donc si le lecteur était en bas quand le contenu a grandi : s'il l'était, il suit ; s'il était remonté, il garde sa place et affiche un bouton « Jump to latest ».

La croissance est surveillée par un `ResizeObserver` sur le contenu, pas en comptant les enfants. Une image qui finit de charger, un bloc de code qui passe à la ligne, une réponse diffusée jeton par jeton — aucun n'ajoute d'enfant, et tous déplacent le bas. « En bas » tolère 24 px de jeu, parce qu'une position de défilement est fractionnaire sur un écran mis à l'échelle et qu'une comparaison exacte conclurait que le lecteur est parti alors qu'il ne l'est pas.

```sh
ream nebula:add message-scroller
```

Organisme · `organisms/MessageScroller.ts` · [Button](/fr/nebula/components/button)

## Utilisation

```ts
import { Message, MessageScroller } from '@c9up/nebula'

MessageScroller({
  label: 'Discussion avec le support',
  class: 'h-96',
  children: () => messages().map((m) => Message({ author: m.author, timestamp: m.sentAt, children: m.text })),
})
```

Le scroller occupe la hauteur que lui donne son parent et défile à l'intérieur : donnez-lui une hauteur (`h-96`), ou placez-le dans une colonne flex qui le borne.

## Exemples

### Une liste qui grandit

`children` est un [Slot](/fr/nebula/composition#props-reactives) : un accesseur redessine la liste dès que le signal qu'il lit change, et le scroller suit si le lecteur était en bas.

```ts
import { signal } from '@c9up/aurora'
import { Message, MessageScroller } from '@c9up/nebula'

interface Turn { id: string; author: string; mine: boolean; text: string; sentAt: string }

const turns = signal<readonly Turn[]>([])

MessageScroller({
  label: 'Conversation avec Ada',
  class: 'h-[60vh]',
  children: () =>
    turns().map((turn) =>
      Message({
        author: turn.mine ? undefined : turn.author,
        align: turn.mine ? 'end' : 'start',
        variant: turn.mine ? 'accent' : 'default',
        timestamp: turn.sentAt,
        children: turn.text,
      }),
    ),
})

socket.on('message', (turn: Turn) => turns([...turns(), turn]))
```

### Une réponse diffusée

Une réponse qui grandit sur place déplace le bas sans ajouter de nœud, et l'observateur la voit quand même. Le texte qui grandit est un accesseur à l'intérieur du message :

```ts
import { signal } from '@c9up/aurora'
import { Message, MessageScroller } from '@c9up/nebula'

const reply = signal('')

MessageScroller({
  class: 'h-96',
  children: Message({ author: 'Assistant', children: () => reply() }),
})

for await (const token of stream) reply(reply() + token)
```

### Jours et annonces entre les tours

Un [Marker](/fr/nebula/components/marker) est la ligne qui parle *de* la conversation plutôt qu'elle n'en fait partie :

```ts
import { html } from '@c9up/aurora'
import { Marker, Message, MessageScroller } from '@c9up/nebula'

MessageScroller({
  class: 'h-96',
  children: html`
    ${Marker({ label: 'Hier' })}
    ${Message({ author: 'Ada', children: 'Tu peux envoyer le rapport ?' })}
    ${Marker({ label: "Aujourd'hui" })}
    ${Message({ align: 'end', variant: 'accent', children: 'Le voici.' })}
  `,
})
```

### Remplacer les textes intégrés

Le nom du fil et le texte du bouton sont intégrés en anglais. Passez les vôtres pour une autre langue, ou pour des mots qui collent au produit :

```ts
MessageScroller({
  label: 'Conversation avec le support',
  jumpLabel: 'Revenir au dernier message',
  class: 'h-96',
  children: () => messages().map((m) => Message({ author: m.author, children: m.text })),
})
```

## API

### MessageScroller

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les tours. Un accesseur pour une liste qui change. |
| `label` | `string` | `'Conversation'` | Le nom accessible du fil. |
| `jumpLabel` | `string` | `'Jump to latest'` | Le texte du bouton de rattrapage. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. C'est là que va la hauteur. |

## Accessibilité

La zone qui défile est `role="log"` avec `aria-live="polite"` : les nouveaux tours sont annoncés à leur arrivée, sans interrompre ce qui est en cours de lecture. Elle est nommée par `label` et focalisable (`tabindex="0"`), si bien qu'un utilisateur au clavier la fait défiler avec les touches du navigateur — flèches, <kbd>Page préc.</kbd>, <kbd>Page suiv.</kbd>, <kbd>Début</kbd>, <kbd>Fin</kbd>. Le scroller ne gère aucune touche lui-même.

Le bouton de rattrapage est un `<button>` natif, `hidden` — hors de la page et de l'ordre de tabulation — tant que le lecteur est en bas. Un clic défile en douceur jusqu'au message le plus récent.

Les deux textes sont intégrés : `label` remplace `"Conversation"` et `jumpLabel` remplace `"Jump to latest"` — voir [langues](/fr/nebula/languages).
