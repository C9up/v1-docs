# Chart

Des graphiques en courbes, en aires et en barres dessinés en SVG intégré, sur un axe de catégories et un axe numérique — ce dont les tableaux de bord ont besoin dans l'immense majorité des cas. Ce périmètre est dit franchement plutôt qu'étiré : barres empilées avec des valeurs négatives, double axe, sélection de plage, chandeliers, barres horizontales, cartes de chaleur ou entonnoirs sont le travail d'une bibliothèque de graphiques, et une application qui en a besoin devrait en installer une plutôt que de voir ce composant en devenir une mauvaise copie. Voir [périmètre](/fr/nebula/scope).

Les couleurs viennent de `--chart-1` … `--chart-5` : un graphique change de thème avec le reste du système de design au lieu de transporter sa propre palette. L'axe des valeurs est gradué par pas ronds — 1, 2, 2,5 ou 5 fois une puissance de dix — et part de zéro sauf indication contraire ; les barres, toujours, puisqu'une barre dont l'axe part de la plus petite valeur exagère chaque écart.

Le texte n'est jamais étiré : les libellés des axes sont dessinés à leur vraie taille, et seuls les courbes et les barres s'étirent à la largeur, avec des traits qui gardent leur épaisseur. Tout est attribut SVG — aucun attribut `style`, qu'une Content-Security-Policy stricte bloque — si bien que le balisage du serveur est le graphique fini.

Un graphique SVG est invisible pour un lecteur d'écran, quel que soit l'ARIA qu'on y met : les mêmes nombres sont donc aussi écrits dans un vrai `<table>`, visuellement masqué. Le lecteur reçoit des lignes et des valeurs qu'il peut parcourir, pas une image décrite. Le tracé prend aussi le focus : les flèches parcourent les catégories, et ce que le pointeur ou le clavier désigne est montré dans une bulle et annoncé.

```sh
ream nebula:add chart
```

Organisme · `organisms/Chart.ts` · aucune dépendance

## Utilisation

```ts
import { Chart } from '@c9up/nebula'

Chart({
  label: 'Visiteurs par mois',
  categoryKey: 'month',
  data: [
    { month: 'janv.', desktop: 186, mobile: 80 },
    { month: 'févr.', desktop: 305, mobile: 200 },
    { month: 'mars', desktop: 237, mobile: 120 },
  ],
  series: [
    { key: 'desktop', label: 'Ordinateur' },
    { key: 'mobile', label: 'Mobile' },
  ],
})
```

Chaque donnée est une catégorie : `categoryKey` nomme la propriété qui porte son libellé — une chaîne, un nombre ou une `Date` — et chaque série la propriété qui porte sa valeur. Une valeur absente, `null` ou qui n'est pas un nombre fini est un trou : la courbe s'interrompt, l'aire s'arrête, aucune barre n'est dessinée, et le tableau écrit `—`. La dessiner à `0` inventerait un chiffre. Une valeur entourée de deux trous est dessinée comme un point. La légende sous le graphique liste les séries avec leurs couleurs.

Les libellés des catégories sont éclaircis selon la place : un sur deux, sur cinq ou sur dix est écrit, ce qui empêche le plus large de toucher son voisin. Le serveur éclaircit pour 600 px nominaux ; le navigateur recommence pour la largeur réelle du tracé, et à chaque fois qu'elle change.

## Exemples

### Aires et barres

```ts
Chart({ type: 'area', label: 'Visiteurs par mois', categoryKey: 'month', data: visits, series })
Chart({ type: 'bar', label: 'Visiteurs par mois', categoryKey: 'month', data: visits, series })
```

`area` remplit sous chaque tronçon de courbe jusqu'à la ligne du zéro — ou jusqu'au bas de l'axe quand zéro n'y figure pas. `bar` groupe les séries côte à côte dans chaque catégorie, sur les trois quarts de sa largeur.

### Hors de zéro, bornes fixes, à l'envers

```ts
// Une latence entre 480 et 520 ms : zéro l'aplatirait.
Chart({ label: 'Latence', categoryKey: 'day', data: latency, series: [{ key: 'ms', label: 'p95' }], zero: false })

// Une position de recherche : 1 est le mieux, donc en haut, et l'axe part exactement de 1.
Chart({
  label: 'Position',
  categoryKey: 'day',
  data: positions,
  series: [{ key: 'position', label: 'Position' }],
  zero: false,
  reversed: true,
  domain: [1, 'auto'],
})
```

`domain` vaut `[min, max]`, chaque borne un nombre ou `'auto'`. Une borne `'auto'` suit les données et s'arrondit vers l'extérieur jusqu'à la graduation suivante ; un nombre est gardé tel quel et écrit comme une graduation à part entière. `zero: false` laisse une borne `'auto'` quitter zéro — les barres l'ignorent. `reversed` dessine la plus petite valeur en haut. `tickCount` demande environ autant de graduations (`5` par défaut) ; le pas reste rond, donc le nombre est approximatif.

### Formats

```ts
Chart({
  label: 'Chiffre d\'affaires',
  categoryKey: 'day',
  data: [{ day: new Date('2026-11-02'), revenue: 12500 }, { day: new Date('2026-11-03'), revenue: null }],
  series: [{ key: 'revenue', label: 'Chiffre d\'affaires' }],
  locale: 'fr-CH',
  formatValue: (value) => new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(value),
})
```

`formatValue` écrit chaque valeur — sur l'axe, dans la bulle, dans le tableau ; `formatCategory` chaque catégorie. Sans eux, les nombres passent par `Intl.NumberFormat` et les dates par `Intl.DateTimeFormat` (`dateStyle: 'medium'`) dans `locale`. Donnez `locale` explicitement quand la page est rendue côté serveur : la langue par défaut du serveur n'est pas celle du lecteur.

### Couleurs, hauteur, quadrillage

```ts
Chart({
  type: 'bar',
  label: 'Solde par mois',
  categoryKey: 'month',
  data: [
    { month: 'janv.', balance: 1200 },
    { month: 'févr.', balance: -300 },
  ],
  series: [{ key: 'balance', label: 'Solde', color: 'var(--primary)' }],
  height: 160,
  grid: false,
})
```

`color` accepte n'importe quelle couleur CSS ; sans elle, une série prend `--chart-1` à `--chart-5` selon sa position, et recommence après la cinquième. Une valeur négative dessine sa barre sous la ligne du zéro. Le graphique occupe la largeur de son conteneur ; `height` est sa hauteur en pixels, libellés des catégories compris. Une ligne horizontale traverse le tracé à chaque graduation de l'axe des valeurs.

### Suivre des données

`data` et `series` sont lues une seule fois, à la construction du graphique. Un graphique qui suit un signal est reconstruit depuis un accesseur :

```ts
import { html, signal } from '@c9up/aurora'
import { type ChartDatum } from '@c9up/nebula'

const live = signal<ChartDatum[]>([])

setInterval(async () => live(await fetchVisits()), 60_000)

html`${() => Chart({ label: 'Visiteurs par mois', categoryKey: 'month', data: live(), series })}`
```

## API

### Chart

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `data` | `readonly ChartDatum[]` | — | Une donnée par catégorie, dans l'ordre de l'axe. Lue une fois. |
| `series` | `readonly ChartSeries[]` | — | Les valeurs tirées de chaque donnée. Lues une fois. |
| `categoryKey` | `string` | — | La propriété de la donnée qui porte le libellé de la catégorie. |
| `label` | `string` | — | Le nom accessible du graphique, et la légende du tableau masqué. |
| `type` | `'line' \| 'area' \| 'bar'` | `'line'` | La façon de dessiner les séries. |
| `height` | `number` | `240` | La hauteur du graphique en pixels, libellés des catégories compris. |
| `grid` | `boolean` | `true` | Dessine une ligne à chaque graduation des valeurs. |
| `domain` | `readonly [ChartBound, ChartBound]` | `['auto', 'auto']` | Les bornes de l'axe des valeurs ; chacune un nombre, gardé tel quel, ou `'auto'`. |
| `zero` | `boolean` | `true` | Étend une borne `'auto'` jusqu'à zéro. Toujours actif pour les barres. |
| `reversed` | `boolean` | `false` | Dessine la plus petite valeur en haut. |
| `tickCount` | `number` | `5` | Environ combien de graduations de valeurs. |
| `formatValue` | `(value: number) => string` | `Intl.NumberFormat` | Écrit une valeur sur l'axe, dans la bulle et dans le tableau. |
| `formatCategory` | `(category: ChartCategory) => string` | `Intl.DateTimeFormat` pour une date, telle quelle sinon | Écrit une catégorie sur l'axe, dans la bulle et dans le tableau. |
| `locale` | `string` | celle de l'environnement | La langue des formateurs par défaut. |
| `roleDescription` | `string` | `'chart'` | Ce qu'un lecteur d'écran appelle le tracé. |
| `keyboardHint` | `string` | `'Arrow keys read each category.'` | Comment un lecteur d'écran apprend à lire le tracé. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<figure>`. |

`ChartDatum` vaut `Record<string, string | number | Date | null | undefined>`, `ChartCategory` vaut `string | number | Date`, et `ChartBound` vaut `number | 'auto'`.

### ChartSeries

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `key` | `string` | — | La propriété de la donnée qui porte la valeur de cette série. |
| `label` | `string` | — | Son nom dans la légende et dans le tableau masqué. |
| `color` | `string` | `var(--chart-1)` … `var(--chart-5)` selon la position | N'importe quelle couleur CSS. |

### Utilitaires

`valueAxis(data, series, { domain?, zero?, tickCount? }): { min, max, ticks }` — l'axe que dessine un graphique, bornes et graduations.

`niceTicks(min, max, count = 5): { min, max, step, ticks }` — des graduations rondes couvrant une plage, élargie vers l'extérieur jusqu'à une graduation.

`valueRange(data, series, { zero? }): { min: number; max: number }` — la plage que couvrent les données, trous ignorés. Avec `zero` (par défaut), elle inclut zéro ; une plage plate est élargie, et l'absence de données se lit `0`–`1`.

`visibleCategories(count, widestLabel, plotWidth): number[]` — les indices des libellés de catégories qui tiennent.

## Accessibilité

Le graphique est un `<figure>`. Ses dessins sont `aria-hidden` ; le tracé qui les entoure est un `role="group"` focalisable avec `aria-roledescription` (`roleDescription`), nommé par `label` et décrit par `keyboardHint`. Le `<figcaption>` contient un `<table>` visuellement masqué avec les mêmes nombres : `label` comme légende, les catégories en en-têtes de ligne, une colonne par série sous son `label`. L'intitulé de la première colonne est `categoryKey` tel quel : une clé qui se lit comme un mot (`month`) passe mieux qu'une abréviation. Les pastilles de couleur de la légende sont `aria-hidden` ; ses libellés sont du texte simple.

| Touche | Action |
|---|---|
| <kbd>→</kbd> <kbd>↓</kbd> | Catégorie suivante (la première, si aucune n'est désignée). |
| <kbd>←</kbd> <kbd>↑</kbd> | Catégorie précédente. |
| <kbd>Début</kbd> <kbd>Fin</kbd> | Première, dernière catégorie. |
| <kbd>Échap</kbd> | Cesse de désigner. |

La catégorie désignée — au clavier ou au pointeur — reçoit un repère pointillé, un point sur chaque valeur et une bulle ; le même texte (`mars — Ordinateur: 237, Mobile: 120`) part dans une région live polie, et la bulle elle-même est `aria-hidden` pour ne pas être lue deux fois. Quitter le tracé ou lui retirer le focus efface la désignation.
