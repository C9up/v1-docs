# Input

Un champ de texte sur une ligne. La valeur est liée à la *propriété* `value` de l'élément, pas à son attribut : l'attribut ne fait qu'amorcer le champ, et dès que l'utilisateur a tapé, les deux divergent. Lier la propriété est ce qui garde un signal et le champ d'accord dans les deux sens.

Il n'y a pas de partage contrôlé/non contrôlé. Passez une `value` et le champ la suit ; ne passez rien et le navigateur garde ce qui est tapé — le bon défaut pour un formulaire envoyé à l'ancienne.

```sh
ream nebula:add input
```

Atome · `atoms/Input.ts` · aucune dépendance

## Utilisation

```ts
import { Input } from '@c9up/nebula'

Input({ name: 'email', type: 'email', autocomplete: 'email' })
```

## Exemples

### Suivre un signal

`onInput` remet le texte sous forme de chaîne, déjà lu dans l'événement :

```ts
import { signal } from '@c9up/aurora'
import { Input } from '@c9up/nebula'

const query = signal('')

Input({
  type: 'search',
  label: 'Rechercher un membre',
  value: query,
  onInput: (value) => query(value),
})
```

Écrire dans `query` depuis ailleurs — un bouton « effacer », un paramètre d'URL — met le champ à jour.

### Avec un libellé

Un `<label for>` nomme le champ et le met au focus au clic :

```ts
import { html } from '@c9up/aurora'
import { Input, Label } from '@c9up/nebula'

html`
  ${Label({ for: 'display-name', children: "Nom d'affichage" })}
  ${Input({ id: 'display-name', name: 'display_name' })}
`
```

Dans un formulaire, un [Field](/fr/nebula/components/field) fabrique les ids assortis et ajoute le texte d'aide et l'erreur.

### Sans libellé visible

Un champ de recherche dans une barre d'outils n'a pas de `<label>` à côté. `label` lui donne un nom ; un `placeholder` n'en est pas un, puisqu'il disparaît dès que l'utilisateur tape :

```ts
Input({ type: 'search', label: 'Rechercher', placeholder: 'Rechercher…' })
```

### En erreur

`invalid` pose `aria-invalid`, qui dessine la bordure et l'anneau de focus dans la couleur destructive. `describedBy` pointe vers le message, si bien qu'un lecteur d'écran le lit avec le champ :

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const error = signal<string | undefined>(undefined)

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'E-mail' })}
    ${Input({
      id: ids.control,
      type: 'email',
      invalid: () => error() !== undefined,
      describedBy: ids.describedBy,
    })}
    ${FieldError({ children: error })}
  `,
})
```

### Un gestionnaire de touches

```ts
Input({
  label: 'Nouvelle tâche',
  onKeyDown: (event) => {
    if (event.key === 'Enter') addTask()
  },
})
```

### Fichiers

`type: 'file'` garde le même cadre, et le bouton « Choisir un fichier » du navigateur est restylé pour s'accorder :

```ts
Input({ type: 'file', name: 'avatar' })
```

## API

### Input

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` de l'élément — ce que vise un `<label for>`. |
| `name` | `string` | — | Le nom sous lequel la valeur est envoyée. |
| `type` | `Reactive<string>` | `'text'` | Le `type` natif : `email`, `password`, `search`, `file`… |
| `value` | `Reactive<string>` | `''` | Liée à la propriété `value`. Absente, le navigateur garde le texte. |
| `placeholder` | `Reactive<string>` | — | Indication affichée tant que le champ est vide. Pas un libellé. |
| `autocomplete` | `string` | — | Le jeton `autocomplete` natif. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `readonly` | `Reactive<boolean>` | `false` | Pose le `readonly` natif. |
| `required` | `Reactive<boolean>` | `false` | Pose le `required` natif. |
| `invalid` | `Reactive<boolean>` | — | Pose `aria-invalid="true"`, sur lequel se règlent la bordure et l'anneau de focus. |
| `describedBy` | `Reactive<string \| undefined>` | — | Pose `aria-describedby` : l'id du texte d'aide ou de l'erreur. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`, pour un champ qu'aucun `<label>` ne nomme. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `onInput` | `(value: string, event: Event) => void` | — | À chaque frappe, avec le texte courant. |
| `onChange` | `(value: string, event: Event) => void` | — | Le `change` natif : à la validation, en général quand le champ perd le focus. |
| `onBlur` | `(event: FocusEvent) => void` | — | Le champ a perdu le focus. |
| `onKeyDown` | `(event: KeyboardEvent) => void` | — | Gestionnaire de touches brut. |

### inputClasses

`inputClasses: string` — la liste de classes du champ, pour un `<input>` natif que vous écrivez vous-même.

## Accessibilité

Un `<input>` natif : tout ce que le navigateur donne à un champ texte — les touches d'édition, le remplissage automatique, le clavier à l'écran choisi d'après `type` — est conservé. `invalid` pose `aria-invalid="true"` et rien quand il est faux, `describedBy` pose `aria-describedby`, et `label` pose `aria-label`. L'anneau de focus est dessiné sur `:focus-visible`.
