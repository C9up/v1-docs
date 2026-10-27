# VisuallyHidden

Du texte pour un lecteur d'écran et pour rien d'autre. Pas `display: none`, qui le retire aussi de l'arbre d'accessibilité, et pas `opacity: 0`, qui lui laisse prendre de la place : le rectangle de découpe — le `sr-only` de Tailwind — est la seule technique qui laisse un nœud annoncé sans le dessiner.

Son rôle principal est le libellé dont un utilisateur voyant n'a pas besoin : une boîte de dialogue dont le titre est un logo, un bouton-icône, la légende d'un tableau. `aria-label` couvre une partie de ces cas, mais pas ceux où le contenu est un vrai balisage — un titre vers lequel un `aria-labelledby` doit pointer, par exemple. Avec `focusable`, il reste caché jusqu'à ce qu'on y arrive au clavier, ce dont a besoin un lien d'évitement.

```sh
ream nebula:add visually-hidden
```

Atome · `atoms/VisuallyHidden.ts` · aucune dépendance

## Utilisation

```ts
import { VisuallyHidden } from '@c9up/nebula'

VisuallyHidden({ children: 'Supprimer' })
```

## Exemples

### Un titre caché

C'est toujours un `<span>`, jamais l'élément qu'il nomme. Pour cacher le texte d'un titre, placez-le *dans* le titre :

```ts
import { html } from '@c9up/aurora'
import { VisuallyHidden } from '@c9up/nebula'

html`<h2 id="filters-heading">${VisuallyHidden({ children: 'Filtres' })}</h2>`
```

Le `<h2>` reste dans le plan que parcourt un lecteur d'écran, et `aria-labelledby="filters-heading"` peut nommer une région d'après lui.

### Un lien d'évitement

```ts
import { html } from '@c9up/aurora'
import { VisuallyHidden } from '@c9up/nebula'

VisuallyHidden({
  focusable: true,
  children: html`<a href="#main">Aller au contenu</a>`,
})
```

`focusable` le révèle dès que quelque chose à l'intérieur prend le focus — ici le lien, atteint en premier dans la page — et le cache de nouveau quand il le perd. Révélé, il prend sa place dans le flux, là où il a été écrit : mettez-le en tête du `<body>`.

### Un texte qui change

`children` prend un accesseur :

```ts
import { signal } from '@c9up/aurora'
import { VisuallyHidden } from '@c9up/nebula'

const count = signal(3)

VisuallyHidden({ children: () => `${count()} articles dans votre panier` })
```

### Le nom d'une icône

Pour le cas icône-plus-mot, [AccessibleIcon](/fr/nebula/components/accessible-icon) enveloppe ce composant et retire en plus l'icône de l'arbre d'accessibilité.

## API

### VisuallyHidden

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'annonce un lecteur d'écran. |
| `focusable` | `boolean` | `false` | Le révéler tant que lui, ou ce qu'il contient, a le focus — pour un lien d'évitement. Fixée une fois. |
| `class` | `Reactive<string>` | — | Fusionnée après `sr-only`. |

## Accessibilité

Le texte reste dans l'arbre d'accessibilité et se lit là où il se trouve dans le document, sans rôle propre. Il est échappé comme tout emplacement : un libellé construit à partir du nom d'un enregistrement est du texte, pas du balisage, même si personne ne le voit. Un élément visuellement caché qui peut recevoir le focus doit devenir visible quand il l'a — c'est ce que fait `focusable` ; un lien ou un bouton dans un `VisuallyHidden` sans lui serait un arrêt de tabulation que personne ne voit.
