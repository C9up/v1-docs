# Checkbox

Un `<input type="checkbox">` natif stylé par `appearance-none`, là où shadcn rend un `<button role="checkbox">` accompagné d'un input caché. Garder l'input est plus simple, et il se comporte mieux : la case est envoyée et réinitialisée avec son formulaire d'elle-même, `:checked` et `:indeterminate` pilotent l'allure sans état à synchroniser, et un `<label for>` la coche sans relais de clic.

La coche et le tiret sont des icônes sœurs affichées par `peer-checked:` et `peer-indeterminate:` : aucun script ne s'exécute quand on coche la case. `indeterminate` est lié comme propriété : il n'existe pas d'attribut pour lui, il n'existe que dans le DOM.

```sh
ream nebula:add checkbox
```

Atome · `atoms/Checkbox.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Checkbox, Label } from '@c9up/nebula'

html`
  <div class="flex items-center gap-2">
    ${Checkbox({ id: 'terms', name: 'terms', required: true })}
    ${Label({ for: 'terms', children: "J'accepte les conditions" })}
  </div>
`
```

## Exemples

### Suivre un signal

```ts
import { signal } from '@c9up/aurora'
import { Checkbox } from '@c9up/nebula'

const notify = signal(true)

Checkbox({
  label: "M'avertir par e-mail quand quelqu'un répond",
  checked: notify,
  onCheckedChange: (checked) => notify(checked),
})
```

Sans `checked`, la case part décochée et le navigateur garde son état ; `onCheckedChange` signale quand même chaque changement.

### Une case parente au-dessus d'une sélection

L'état mixte sert à une case qui représente plusieurs autres — « tout sélectionner » au-dessus de lignes dont certaines sont choisies :

```ts
import { signal } from '@c9up/aurora'
import { Checkbox } from '@c9up/nebula'

const rows = ['invoice-1042', 'invoice-1043', 'invoice-1044']
const selected = signal<readonly string[]>([])

Checkbox({
  label: 'Sélectionner toutes les factures',
  checked: () => selected().length === rows.length,
  indeterminate: () => selected().length > 0 && selected().length < rows.length,
  onCheckedChange: (checked) => selected(checked ? rows : []),
})

rows.map((row) =>
  Checkbox({
    label: `Sélectionner ${row}`,
    checked: () => selected().includes(row),
    onCheckedChange: (checked) =>
      selected(checked ? [...selected(), row] : selected().filter((id) => id !== row)),
  }),
)
```

Une case dans une ligne de tableau n'a à côté d'elle aucune légende qu'un lecteur d'écran puisse voir — il annoncerait « case à cocher, non cochée » et rien d'autre. `label` la nomme.

### Envoyée avec un formulaire

Une case cochée envoie `name=value` ; une case décochée n'envoie rien. `value` vaut par défaut le `"on"` du navigateur :

```ts
Checkbox({ id: 'plan-annual', name: 'billing', value: 'annual' })
```

### En erreur

```ts
Checkbox({ id: 'consent', name: 'consent', invalid: true })
```

`invalid` pose `aria-invalid`, qui dessine la bordure dans la couleur destructive.

## API

### Checkbox

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` de l'input — ce que vise un `<label for>`. |
| `name` | `string` | — | Le nom sous lequel la case est envoyée. |
| `value` | `string` | — | Ce qu'envoie une case cochée. Sans elle, le navigateur envoie `"on"`. |
| `checked` | `Reactive<boolean>` | `false` | Liée à la propriété `checked`. |
| `indeterminate` | `Reactive<boolean>` | `false` | L'état mixte, lié à la propriété `indeterminate`. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `required` | `Reactive<boolean>` | `false` | Pose le `required` natif. |
| `invalid` | `Reactive<boolean>` | — | Pose `aria-invalid="true"`. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`, pour une case qu'aucun `<label>` ne nomme. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier dans les classes de l'input. |
| `onCheckedChange` | `(checked: boolean, event: Event) => void` | — | La case a été basculée, avec son nouvel état. |

### checkboxClasses

`checkboxClasses: string` — la liste de classes de l'input. Elle porte `peer`, sur lequel se règlent la coche et le tiret.

## Accessibilité

Une case à cocher native : atteignable au clavier, basculée par <kbd>Espace</kbd>, annoncée cochée, non cochée ou — avec `indeterminate` — mixte. Les icônes sont décoratives et masquées aux technologies d'assistance. `invalid` pose `aria-invalid="true"` et `label` pose `aria-label`. L'anneau de focus est dessiné sur `:focus-visible`.
