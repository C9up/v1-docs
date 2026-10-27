# Marker

Une annotation dans un flux de contenu — « Hier », « 3 non lus », « Ada a rejoint la conversation », « Contexte tronqué ». Une ligne qui parle *de* la conversation plutôt qu'elle n'en fait partie, dessinée comme un libellé entre deux filets.

Son rôle dépend de ce qu'il dit. Un simple filet entre deux jours est de la structure, un `separator` ; un libellé comme « Contexte tronqué » est une information dont le lecteur a besoin, un `status`, et se perdrait s'il était annoncé comme une simple frontière. Les filets de part et d'autre sont des `<span>` avec un fond, pas un `<hr>` : un filet horizontal ne peut pas encadrer un libellé sans positionnement absolu et sans un fond assorti à ce qu'il y a derrière, ce qui casse dès que la surface change.

```sh
ream nebula:add marker
```

Atome · `atoms/Marker.ts` · aucune dépendance

## Utilisation

```ts
import { Marker } from '@c9up/nebula'

Marker({ label: 'Hier' })
```

## Exemples

### Un simple filet

```ts
Marker()
```

Sans `label`, le marqueur est un filet sur toute la largeur et un `separator`.

### Variantes et icône

```ts
import { CheckIcon, Marker } from '@c9up/nebula'

Marker({ label: '3 non lus' })                                             // default
Marker({ variant: 'muted', label: 'Ada a rejoint la conversation' })
Marker({ variant: 'destructive', label: 'Contexte tronqué' })
Marker({ icon: CheckIcon(), label: 'Marqué comme résolu' })
```

Un SVG passé en `icon` fait 14 px, sauf s'il porte sa propre classe `size-*`.

### Sans filets, aligné au début

```ts
Marker({ label: 'Modifié', rules: false, align: 'start' })
```

`rules: false` retire les deux lignes et laisse le libellé seul ; `align: 'start'` le place au début de la ligne.

### Entre les tours

```ts
import { html } from '@c9up/aurora'
import { Marker, Message } from '@c9up/nebula'

html`
  ${Message({ author: 'Ada', children: 'À demain.' })}
  ${Marker({ label: "Aujourd'hui" })}
  ${Message({ author: 'Ada', children: 'Bonjour !' })}
`
```

## API

### Marker

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `Child` | — | L'annotation. À omettre pour un simple filet. |
| `icon` | `Child` | — | Dessinée avant le libellé. Affichée seulement avec un `label`. |
| `variant` | `Reactive<'default' \| 'muted' \| 'destructive'>` | `'default'` | La couleur : texte atténué, texte plus pâle, ou couleur destructive. |
| `align` | `Reactive<'center' \| 'start'>` | `'center'` | La place du libellé. |
| `rules` | `boolean` | `true` | Dessine un filet de chaque côté du libellé. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

`label`, `icon` et `rules` sont lus une seule fois, à la construction — un marqueur dont le texte change est reconstruit par la liste où il vit.

### markerVariants

`markerVariants({ variant?, align?, class? }): string` — la liste de classes que porte un `Marker`.

## Accessibilité

Avec un `label`, le marqueur est `role="status"` ; sans, il est `role="separator"`. `status` est une région live polie, mais une région insérée avec son texte déjà dedans n'est pas annoncée par tous les lecteurs d'écran. Un marqueur qui apparaît plus tard — « Ada a rejoint la conversation » — est annoncé de façon fiable dans un [MessageScroller](/fr/nebula/components/message-scroller), dont le fil annonce ce qu'on y ajoute. Les filets sont `aria-hidden`. Un marqueur n'est pas interactif et ne gère aucune touche.
