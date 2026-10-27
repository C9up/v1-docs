# Typography

Des styles de texte courant pour le contenu que nebula ne possède pas par ailleurs : titres, paragraphes, une citation, du code en ligne, une liste, et quatre tailles de texte. Ils sont livrés comme composants plutôt que laissés en extraits à recopier, parce que ce sont eux qui font qu'une page marketing, un journal des modifications et un état vide se lisent comme un seul produit.

`text-balance` sur `H1` et `text-pretty` sur `P` et `Lead` font l'essentiel du travail : ils évitent qu'un titre finisse sur un ou deux mots isolés, et qu'un paragraphe finisse sur un mot seul.

```sh
ream nebula:add typography
```

Molécule · `molecules/Typography.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { H1, Lead, P } from '@c9up/nebula'

html`
  ${H1({ children: 'Notes de version' })}
  ${Lead({ children: "Ce qui change en 2.4, et ce qu'il faut en faire." })}
  ${P({ children: 'Les imports sont désormais résolus à la construction.' })}
`
```

## Exemples

### Titres

```ts
import { H1, H2, H3, H4 } from '@c9up/nebula'

H1({ children: 'Notes de version' })
H2({ id: 'breaking-changes', children: 'Changements incompatibles' })
H3({ children: 'Imports' })
H4({ children: 'Résolus à la construction' })
```

Chaque titre porte `scroll-m-20`, si bien qu'un titre atteint par son `id` — `#breaking-changes` — n'atterrit pas sous un en-tête collant. `H2` trace un filet sous lui et perd sa marge haute quand il est le premier enfant.

### Texte courant

```ts
import { html } from '@c9up/aurora'
import { Blockquote, InlineCode, List, P } from '@c9up/nebula'

html`
  ${P({ children: "Les imports sont désormais résolus à la construction de l'application." })}
  ${P({ children: html`Lancez ${InlineCode({ children: 'ream nebula:diff' })} avant de mettre à jour.` })}
  ${Blockquote({ children: "Moins de surprises à l'exécution, davantage à la construction." })}
  ${List({ children: html`<li>Démarrage à froid plus rapide</li><li>Erreurs signalées à la construction</li>` })}
`
```

Un `P` qui suit autre chose reçoit une marge haute ; le premier n'en a pas, si bien qu'une pile de paragraphes s'espace sans enveloppe. `List` est un `<ul>` — ses enfants sont vos éléments `<li>`.

### Tailles de texte

```ts
import { Large, Lead, Muted, Small } from '@c9up/nebula'

Lead({ children: 'Tout ce qui a changé depuis la 2.3.' })
Large({ children: 'Mise à jour requise' })
Small({ children: "Mis à jour aujourd'hui" })
Muted({ children: "S'applique à toutes les applications en 2.x." })
```

### Suivre un signal

`children` prend un accesseur, comme tout emplacement :

```ts
import { html } from '@c9up/aurora'
import { H2, P } from '@c9up/nebula'

html`${() => releases().map((release) => html`
  ${H2({ children: release.version })}
  ${P({ children: release.notes })}
`)}`
```

## API

Toutes les parties prennent les mêmes props, `TypographyProps` :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'élément. |
| `id` | `string` | — | L'`id` de l'élément. Non rendu par `InlineCode` et `List`. |

### Les parties

| Partie | Élément | Style |
|---|---|---|
| `H1` | `<h1>` | 4xl, extra-gras, équilibré |
| `H2` | `<h2>` | 3xl, demi-gras, filet dessous |
| `H3` | `<h3>` | 2xl, demi-gras |
| `H4` | `<h4>` | xl, demi-gras |
| `P` | `<p>` | interligne aéré, coupure soignée, espacé de ce qui précède |
| `Blockquote` | `<blockquote>` | italique, filet à gauche |
| `InlineCode` | `<code>` | chasse fixe sur fond atténué |
| `List` | `<ul>` | puces, éléments espacés |
| `Lead` | `<div data-slot="lead">` | xl, atténué, coupure soignée |
| `Large` | `<div data-slot="large">` | lg, demi-gras |
| `Small` | `<div data-slot="small">` | sm, graisse moyenne, interligne serré |
| `Muted` | `<div data-slot="muted">` | sm, atténué |

### styledDiv, styledSpan

`styledDiv(name: string, base: string)` et `styledSpan(name, base)` renvoient un composant qui prend `{ children?, class?, id? }` et rend un `<div>` (ou un `<span>`) avec `data-slot={name}` et les classes `base`, `class` fusionnée après. `Lead`, `Large`, `Small` et `Muted` sont faits ainsi ; vos propres parties purement visuelles peuvent l'être aussi :

```ts
import { styledDiv } from '@c9up/nebula'

const Eyebrow = styledDiv('eyebrow', 'text-primary text-xs font-semibold uppercase tracking-wide')

Eyebrow({ children: 'Journal des modifications' })
```

Dès qu'une partie a besoin d'un événement, d'un état ou d'une relation ARIA, écrivez-la en entier.

## Accessibilité

Les titres sont de vrais `<h1>`–`<h4>` : ils forment le plan par lequel navigue un lecteur d'écran. Choisissez le niveau d'après la structure, pas d'après la taille, et restylez avec `class` si les deux divergent. `Lead`, `Large`, `Small` et `Muted` sont des `<div>` sans signification propre — `Small` n'est pas un `<small>`, `Muted` n'est pas une aide rattachée à un champ. Pour la description d'un champ, utilisez les parties de [Field](/fr/nebula/components/field), qui la relient au contrôle.
