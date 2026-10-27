# Combobox

Une liste déroulante dans laquelle on peut taper. Un déclencheur dessiné comme celui d'un [Select](/fr/nebula/components/select) ouvre un panneau contenant une [Command](/fr/nebula/components/command) : le filtrage, le surlignage et les touches sont ceux de la palette et ne sont pas écrits deux fois. Ce qu'il ajoute, c'est la sélection — il retient ce qui a été choisi, l'affiche sur le déclencheur et l'envoie avec le formulaire, là où une Command exécute une action et oublie.

Il prend ses options sous forme de données, pas de parties. La palette qu'il contient est reconstruite à chaque ouverture du panneau : `options` est lue à ce moment-là plutôt que capturée une fois pour toutes.

Le focus passe dans le champ de recherche du panneau à l'ouverture — c'est tout l'intérêt du contrôle — et revient au déclencheur à la fermeture, pour que l'ordre de tabulation ne saute pas en haut de la page après un choix.

```sh
ream nebula:add combobox
```

Organisme · `organisms/Combobox.ts` · [command](/fr/nebula/components/command), [select](/fr/nebula/components/select)

## Utilisation

```ts
import { Combobox } from '@c9up/nebula'

Combobox({
  options: [
    { value: 'next', label: 'Next.js' },
    { value: 'svelte', label: 'SvelteKit' },
    { value: 'astro', label: 'Astro' },
  ],
  placeholder: 'Choisir un framework…',
  onValueChange: (value) => save(value),
})
```

## Exemples

### Suivre un signal

Passez `value` pour tenir le choix vous-même. Le déclencheur affiche ce que lit `value`, et `onValueChange` signale chaque choix :

```ts
import { signal } from '@c9up/aurora'
import { Combobox } from '@c9up/nebula'

const timezone = signal<string | undefined>('Europe/Zurich')

Combobox({
  options: zones.map((zone) => ({ value: zone, label: zone.replace('_', ' ') })),
  value: timezone,
  onValueChange: timezone,
})
```

Sans `value`, le combobox tient son propre choix, en partant de `defaultValue`.

### Groupes et mots-clés

Les options consécutives qui partagent un `group` sont rassemblées sous un même intitulé, dans l'ordre donné. Un groupe qui revient après une interruption reçoit un second intitulé : les fusionner réordonnerait votre liste et changerait l'option qu'atteignent ensuite les flèches. `keywords` ajoute des termes que le libellé ne contient pas :

```ts
Combobox({
  options: [
    { value: 'eur', label: 'Euro', group: 'Europe', keywords: ['€'] },
    { value: 'chf', label: 'Franc suisse', group: 'Europe', keywords: ['CHF'] },
    { value: 'usd', label: 'Dollar américain', group: 'Amériques', keywords: ['$'] },
    { value: 'cad', label: 'Dollar canadien', group: 'Amériques', keywords: ['CAD'] },
  ],
  placeholder: 'Devise',
})
```

### Dans un formulaire

Avec un `name`, un champ caché envoie la `value` choisie. `invalid` dessine le déclencheur dans la couleur destructive :

```ts
Combobox({
  name: 'country',
  options: countries,
  invalid: () => errors().country !== undefined,
  disabled: submitting,
})
```

### Dans une autre langue

Chaque texte qu'écrit le combobox a sa prop :

```ts
Combobox({
  options: fruits,
  placeholder: 'Choisir un fruit…',
  searchPlaceholder: 'Chercher un fruit…',
  emptyMessage: 'Aucun fruit de ce nom.',
})
```

## API

### Combobox

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `options` | `readonly ComboboxOption[]` | — | Obligatoire. Lue à chaque ouverture du panneau. |
| `value` | `Reactive<string \| undefined>` | — | Contrôle le choix. Présente, le déclencheur la suit. |
| `defaultValue` | `string` | — | Le choix de départ quand `value` est absente. |
| `onValueChange` | `(value: string) => void` | — | Chaque choix. |
| `name` | `string` | — | Envoie la `value` choisie avec le formulaire, par un champ caché. |
| `placeholder` | `string` | `'Select…'` | Le texte du déclencheur tant que rien n'est choisi. |
| `searchPlaceholder` | `string` | `'Search…'` | Le texte indicatif du champ de recherche. |
| `emptyMessage` | `string` | `'No results found.'` | Affiché quand la recherche ne trouve rien. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive le déclencheur. |
| `invalid` | `Reactive<boolean>` | — | Pose `aria-invalid` sur le déclencheur. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'enveloppe. |
| `contentClass` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

### ComboboxOption

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Ce qui est choisi et envoyé. |
| `label` | `string` | — | Obligatoire. Affiché dans la liste et sur le déclencheur ; le filtre le compare. |
| `keywords` | `readonly string[]` | — | Des termes supplémentaires qui trouvent l'option. |
| `disabled` | `boolean` | — | Écarte l'option des correspondances : elle est masquée et ne peut pas être choisie. |
| `group` | `string` | — | L'intitulé sous lequel elle est listée. |

## Accessibilité

Le déclencheur est un `<button>` avec `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` tant que le panneau est ouvert, et `aria-invalid` avec `invalid`. Dans le panneau, le champ de recherche et la liste sont [ceux de Command](/fr/nebula/components/command#accessibilite) : un champ `combobox` qui désigne l'`option` surlignée via `aria-activedescendant`.

À l'ouverture, le focus passe dans le champ de recherche et reste piégé dans le panneau. Choisir une option ferme le panneau et rend le focus au déclencheur, et Échap fait de même. Un clic à l'extérieur le ferme aussi.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd>, <kbd>Espace</kbd> | Sur le déclencheur : ouvrir ou fermer le panneau. |
| <kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd> | Dans le champ : surligner la correspondance suivante ou précédente, en bouclant. |
| <kbd>Entrée</kbd> | Dans le champ : choisir l'option surlignée. |
| <kbd>Échap</kbd> | Fermer le panneau. |

Ses trois textes sont en anglais par défaut ; `placeholder`, `searchPlaceholder` et `emptyMessage` les remplacent — voir [langues](/fr/nebula/languages).
