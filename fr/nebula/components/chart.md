# Chart

Des graphiques en courbes, en aires et en barres dessinés en SVG intégré, sur un axe de catégories et un axe numérique — ce dont les tableaux de bord ont besoin dans l'immense majorité des cas. Ce périmètre est dit franchement plutôt qu'étiré : barres empilées avec des valeurs négatives, double axe, sélection de plage ou chandeliers sont le travail d'une bibliothèque de graphiques, et une application qui en a besoin devrait en installer une plutôt que de voir ce composant en devenir une mauvaise copie. Voir [périmètre](/fr/nebula/scope).

Les couleurs viennent de `--chart-1` … `--chart-5` : un graphique change de thème avec le reste du système de design au lieu de transporter sa propre palette. L'axe des valeurs part de zéro dès que les données sont positives ou nulles : un graphique en barres dont l'axe part de la plus petite valeur exagère chaque écart, et ce n'est pas proposé en option.

Un graphique SVG est invisible pour un lecteur d'écran, quel que soit l'ARIA qu'on y met : les mêmes nombres sont donc aussi écrits dans un vrai `<table>`, visuellement masqué. Le lecteur reçoit des lignes et des valeurs qu'il peut parcourir, pas une image décrite.

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

Chaque donnée est une catégorie : `categoryKey` nomme la propriété qui porte son libellé, et chaque série la propriété qui porte sa valeur. Une valeur absente ou qui n'est pas un nombre est dessinée à `0`. La légende sous le graphique liste les séries avec leurs couleurs.

## Exemples

### Aires et barres

```ts
Chart({ type: 'area', label: 'Visiteurs par mois', categoryKey: 'month', data: visits, series })
Chart({ type: 'bar', label: 'Visiteurs par mois', categoryKey: 'month', data: visits, series })
```

`area` remplit sous chaque courbe jusqu'à la ligne du zéro. `bar` groupe les séries côte à côte dans chaque catégorie, sur les trois quarts de sa largeur.

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

`color` accepte n'importe quelle couleur CSS ; sans elle, une série prend `--chart-1` à `--chart-5` selon sa position, et recommence après la cinquième. Une valeur négative dessine sa barre sous la ligne du zéro. Le graphique occupe la largeur de son conteneur et garde sa proportion : `height` se mesure contre un dessin de 600 unités de large, si bien que le 240 par défaut fait 2,5 : 1. Les cinq lignes horizontales découpent la plage de valeurs en quarts, haut et bas compris ; l'axe ne porte pas de valeurs écrites.

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
| `height` | `number` | `240` | La hauteur du dessin pour une largeur de 600 — sa proportion, pas des pixels. |
| `grid` | `boolean` | `true` | Dessine les lignes horizontales. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du `<figure>`. |

`ChartDatum` vaut `Record<string, string | number>`.

### ChartSeries

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `key` | `string` | — | La propriété de la donnée qui porte la valeur de cette série. |
| `label` | `string` | — | Son nom dans la légende et dans le tableau masqué. |
| `color` | `string` | `var(--chart-1)` … `var(--chart-5)` selon la position | N'importe quelle couleur CSS. |

### valueRange

`valueRange(data, series): { min: number; max: number }` — la plage que couvre l'axe des valeurs. `min` n'est jamais au-dessus de zéro ni `max` en dessous : des données positives ou nulles partent de zéro ; des données toutes nulles reçoivent `max: 1`, pour qu'il y ait toujours une plage à mettre à l'échelle.

## Accessibilité

Le graphique est un `<figure>`. Son SVG est `role="img"`, nommé par un `<title>` qui contient `label`. Le `<figcaption>` contient un `<table>` visuellement masqué avec les mêmes nombres : `label` comme légende, les catégories en en-têtes de ligne, une colonne par série sous son `label`. L'intitulé de la première colonne est `categoryKey` tel quel : une clé qui se lit comme un mot (`month`) passe mieux qu'une abréviation. Les pastilles de couleur de la légende sont `aria-hidden` ; ses libellés sont du texte simple.

Le graphique n'est pas interactif et ne gère aucune touche.
