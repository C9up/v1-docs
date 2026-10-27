# Bubble

Un contenu conversationnel dans une bulle — le corps d'un [Message](/fr/nebula/components/message), ou une bulle seule là où un message entier serait de trop.

L'alignement est **logique** : `align: 'end'` pousse la bulle avec `ms-auto`, si bien que le même message sortant se place à droite en français et à gauche en arabe sans que l'appelant ait à savoir lequel. Un contenu long peut être tronqué derrière un bouton « Show more » ; la troncature est un `line-clamp`, qui coupe à la fin d'une ligne et ajoute lui-même les points de suspension, là où une hauteur maximale trancherait une ligne en son milieu. Les réactions sont une liste de boutons bascule avec `aria-pressed`, pas des `span` décoratifs : une réaction que l'utilisateur peut ajouter est un contrôle.

```sh
ream nebula:add bubble
```

Molécule · `molecules/Bubble.ts` · aucune dépendance

## Utilisation

```ts
import { Bubble } from '@c9up/nebula'

Bubble({ children: 'On se voit toujours jeudi ?' })
```

## Exemples

### Variantes et côtés

```ts
Bubble({ children: 'Son message' })                                     // default, start
Bubble({ variant: 'accent', align: 'end', children: 'Votre message' })
Bubble({ variant: 'outline', children: 'Un message cité' })
Bubble({ variant: 'ghost', children: 'Texte brut, sans bulle' })
```

`ghost` retire le fond et le remplissage horizontal : le texte s'aligne sur ce qui est au-dessus, comme se lit la longue réponse d'un assistant dans une discussion.

### Contenu long

```ts
Bubble({
  collapsible: true,
  collapsedLines: 4,
  children: longReply,
})
```

La bulle affiche `collapsedLines` lignes (6 par défaut) et un bouton « Show more » dessous ; une fois dépliée, le bouton dit « Show less ». Les libellés sont des props :

```ts
Bubble({
  collapsible: true,
  expandLabel: 'Lire la suite',
  collapseLabel: 'Réduire',
  children: longReply,
})
```

La classe de troncature est construite à l'exécution — `line-clamp-[${collapsedLines}]` — et l'analyseur de Tailwind ne la voit donc jamais dans le source. Écrivez une fois la classe que vous utilisez dans un fichier que votre build analyse (`line-clamp-[6]` pour la valeur par défaut), sinon le contenu n'est pas tronqué du tout.

### Réactions

```ts
Bubble({
  children: 'Déployé en production.',
  reactions: [
    { emoji: '🎉', count: 3, active: true, onToggle: () => toggle('🎉') },
    { emoji: '👀', count: 1, onToggle: () => toggle('👀') },
  ],
})
```

`reactions` est lu à la construction : l'`active` et le `count` d'une réaction sont dessinés une fois. Pour les suivre, construisez la bulle dans un accesseur, qui la redessine quand ils changent :

```ts
import { html } from '@c9up/aurora'

html`${() => Bubble({ children: 'Déployé en production.', reactions: reactionsFor(messageId) })}`
```

Cela redessine toute la bulle, état de dépliage compris.

### Suivre un état

`variant`, `align` et `class` prennent des accesseurs :

```ts
Bubble({
  variant: () => (selected() ? 'outline' : 'default'),
  children: 'Choisissez-moi',
})
```

## API

### Bubble

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. |
| `variant` | `Reactive<'default' \| 'accent' \| 'outline' \| 'ghost'>` | `'default'` | L'allure. `accent` prend la couleur primaire, pour vos propres messages. |
| `align` | `Reactive<'start' \| 'end'>` | `'start'` | Le côté, dans le sens d'écriture. |
| `reactions` | `readonly BubbleReaction[]` | — | Des boutons bascule sous le contenu. Lu à la construction. |
| `collapsible` | `boolean` | `false` | Tronque un contenu long derrière un bouton. |
| `collapsedLines` | `number` | `6` | Lignes affichées une fois replié. |
| `expandLabel` | `string` | `'Show more'` | Le texte du bouton une fois replié. |
| `collapseLabel` | `string` | `'Show less'` | Le texte du bouton une fois déplié. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### BubbleReaction

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `emoji` | `string` | — | La réaction. |
| `count` | `number` | — | Combien de personnes ont réagi. Masqué s'il est absent. |
| `active` | `boolean` | `false` | L'utilisateur courant a réagi avec celle-ci. Pose `aria-pressed`. |
| `onToggle` | `() => void` | — | Appelé au clic. |

### bubbleVariants

`bubbleVariants({ variant?, align?, class? }): string` — la liste de classes que porte une `Bubble`, pour un élément à vous en forme de bulle.

## Accessibilité

Le bouton de dépliage est un `<button>` natif avec `aria-expanded`. Chaque réaction est un `<button>` dans un `<ul>`, avec `aria-pressed` qui dit si l'utilisateur courant a réagi, et un `aria-label` fait de l'emoji et du nombre — `"🎉, 3"` — à la place de son contenu visible. Tous s'activent avec <kbd>Entrée</kbd> et <kbd>Espace</kbd> ; la bulle ne gère aucune touche elle-même.

Les textes du bouton sont intégrés : `expandLabel` remplace `"Show more"` et `collapseLabel` remplace `"Show less"` — voir [langues](/fr/nebula/languages).
