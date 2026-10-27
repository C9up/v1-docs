# ToggleGroup

Une rangée de toggles qui forment un seul contrôle : l'alignement d'un texte, un jeu de filtres, un sélecteur de vue.

`type` décide à la fois du comportement et de la sémantique, parce que les deux doivent aller ensemble. `'single'` est un groupe radio — une valeur, `role="radio"` sur chaque bouton, et en choisir un efface les autres. `'multiple'` est un ensemble de boutons bascule indépendants, chacun avec `aria-pressed`. Rater cette association est le bogue habituel de ce contrôle : un groupe à choix unique qui annonce chaque option comme « enfoncée » dit à un utilisateur de lecteur d'écran qu'il peut en activer plusieurs.

Les éléments sont dessinés avec le `toggleVariants` de [Toggle](/fr/nebula/components/toggle) lui-même : un toggle groupé et un toggle seul ne peuvent pas diverger. Seuls les coins sont redéfinis, pour souder la rangée en une seule forme.

```sh
ream nebula:add toggle-group
```

Molécule · `molecules/ToggleGroup.ts` · [toggle](/fr/nebula/components/toggle)

## Utilisation

```ts
import { html, signal } from '@c9up/aurora'
import { ToggleGroup, ToggleGroupItem } from '@c9up/nebula'

const align = signal('left')

ToggleGroup({
  type: 'single',
  defaultValue: 'left',
  onValueChange: (value) => align(value[0] ?? 'left'),
  children: () => html`
    ${ToggleGroupItem({ value: 'left', children: 'Gauche' })}
    ${ToggleGroupItem({ value: 'center', children: 'Centre' })}
    ${ToggleGroupItem({ value: 'right', children: 'Droite' })}
  `,
})
```

Les éléments vont dans `() =>` : ils lisent la sélection dans le contexte du groupe — voir [composition](/fr/nebula/composition). `onValueChange` reçoit toujours un tableau, dans les deux modes ; en mode `'single'`, il contient au plus une valeur.

## Exemples

### Plusieurs actifs à la fois

```ts
ToggleGroup({
  type: 'multiple',
  defaultValue: ['bold'],
  children: () => html`
    ${ToggleGroupItem({ value: 'bold', ariaLabel: 'Gras', children: 'G' })}
    ${ToggleGroupItem({ value: 'italic', ariaLabel: 'Italique', children: 'I' })}
    ${ToggleGroupItem({ value: 'underline', ariaLabel: 'Souligné', children: 'S' })}
  `,
})
```

Une lettre seule ou une icône n'est pas un nom : `ariaLabel` en donne un à l'élément.

### Depuis des données, espacés

```ts
ToggleGroup({
  type: 'multiple',
  variant: 'outline',
  spacing: 'default',
  onValueChange: (value) => filterBy(value),
  children: () =>
    html`${() => statuses().map((status) => ToggleGroupItem({ value: status.id, children: status.name }))}`,
})
```

`statuses` est un signal : les éléments sont donc construits dans un accesseur à l'intérieur du thunk, qui ne s'exécute qu'une fois — voir [composition](/fr/nebula/composition). `spacing: '0'`, le défaut, soude les éléments en une barre dont seuls les coins extérieurs sont arrondis ; `'default'` laisse un écart entre eux, chacun arrondi pour lui-même.

### Contour, avec une icône

```ts
import { CheckIcon } from '@c9up/nebula'

ToggleGroup({
  type: 'single',
  variant: 'outline',
  size: 'sm',
  children: () => html`
    ${ToggleGroupItem({ value: 'all', children: 'Tous' })}
    ${ToggleGroupItem({ value: 'done', children: html`${CheckIcon()} Faits` })}
  `,
})
```

`variant` et `size` posés sur le groupe l'emportent sur les mêmes props posées sur un élément.

### Désactivé

```ts
const saving = signal(false)

ToggleGroup({
  type: 'single',
  disabled: saving,
  children: () => html`
    ${ToggleGroupItem({ value: 'draft', children: 'Brouillon' })}
    ${ToggleGroupItem({ value: 'published', children: 'Publié' })}
    ${ToggleGroupItem({ value: 'archived', disabled: true, children: 'Archivé' })}
  `,
})
```

Le `disabled` du groupe suit son accesseur et désactive tous les éléments ; le `disabled` d'un élément ne désactive que lui.

### Effacer le choix

En mode `'single'`, cliquer l'élément actif le désactive et laisse le groupe vide — `onValueChange` reçoit `[]`. C'est la différence avec un [RadioGroup](/fr/nebula/components/radio-group), qui en garde toujours un ; traitez le cas vide, comme le fait le `?? 'left'` de l'utilisation.

## API

### ToggleGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `type` | `'single' \| 'multiple'` | `'single'` | Une valeur ou plusieurs — et les rôles qui vont avec. Lu une fois, à la construction. |
| `defaultValue` | `string \| readonly string[]` | — | Actif au premier rendu. Sans lui, rien n'est actif. |
| `variant` | `Reactive<'default' \| 'outline'>` | — | L'allure des éléments, au-dessus de la leur. Lu une fois, à la construction, pour les éléments. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg'>` | — | La taille des éléments, au-dessus de la leur. Lu une fois, à la construction, pour les éléments. |
| `spacing` | `'default' \| '0'` | `'0'` | `'0'` soude les éléments en une barre ; `'default'` les espace. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive tous les éléments. |
| `onValueChange` | `(value: readonly string[]) => void` | — | Les valeurs actives, après chaque clic. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |
| `children` | `Parts` | — | Les `ToggleGroupItem`, construits en `() =>`. |

La sélection vit dans le groupe : il n'y a pas de `value` contrôlée. `onValueChange` est la façon dont l'application l'apprend.

### ToggleGroupItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Ce que l'élément apporte à la valeur du groupe. |
| `children` | `Slot` | — | Le contenu : du texte, une icône, ou les deux. |
| `ariaLabel` | `string` | — | Pose `aria-label`. Indispensable quand le contenu est une icône seule. |
| `disabled` | `boolean` | `false` | Désactive cet élément. |
| `variant` | `'default' \| 'outline'` | `'default'` | Utilisée quand le groupe n'en pose aucune. |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | Utilisée quand le groupe n'en pose aucune. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier dans les classes de l'élément. |

## Accessibilité

`type: 'single'` rend `role="radiogroup"`, avec `role="radio"` et `aria-checked` sur chaque élément ; `type: 'multiple'` rend `role="group"`, avec `aria-pressed` sur chaque élément et aucun rôle. `data-state="on"` ou `"off"` est posé sur chaque élément pour le style, et l'élément qui a le focus passe au-dessus de ses voisins pour que son anneau ne soit pas caché sous eux.

Le groupe ne prend aucun nom à lui. Là où son rôle ne ressort pas clairement de ce qui l'entoure, placez-le dans un `FieldSet` avec un `FieldLegend` (voir [Field](/fr/nebula/components/field)) : le `<fieldset>` est annoncé avec sa légende avant les éléments.

Chaque élément est un `<button>` natif et son propre arrêt de tabulation ; le groupe n'ajoute aucune navigation aux flèches.

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Passe à l'élément suivant, puis sort du groupe. |
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Active ou désactive l'élément qui a le focus (le clic du bouton natif). |
