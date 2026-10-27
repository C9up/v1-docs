# Textarea

Un champ de texte sur plusieurs lignes. Il reprend [Input](/fr/nebula/components/input) à dessein — la même liaison de valeur, les mêmes `invalid` et `describedBy`, les mêmes callbacks — parce qu'un champ ne devrait pas changer de forme parce qu'il a pris une deuxième ligne.

Le seul ajout est `field-sizing-content` : le navigateur agrandit la zone avec son texte, à partir d'une hauteur minimale, là où il fallait autrefois un observateur de redimensionnement et une mesure de hauteur de défilement à chaque frappe.

```sh
ream nebula:add textarea
```

Atome · `atoms/Textarea.ts` · aucune dépendance

## Utilisation

```ts
import { Textarea } from '@c9up/nebula'

Textarea({ name: 'bio', placeholder: 'Quelques mots sur vous' })
```

## Exemples

### Suivre un signal

```ts
import { html, signal } from '@c9up/aurora'
import { Textarea } from '@c9up/nebula'

const note = signal('')

html`
  ${Textarea({ id: 'note', value: note, onInput: (value) => note(value) })}
  <p class="text-muted-foreground text-sm">${() => `${note().length} / 500`}</p>
`
```

### Avec un libellé et un texte d'aide

`Textarea` ne prend pas de prop `label` : nommez-le par un `<label for>`, ou placez-le dans un [Field](/fr/nebula/components/field) :

```ts
import { html } from '@c9up/aurora'
import { Field, FieldDescription, FieldLabel, Textarea, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Message' })}
    ${Textarea({ id: ids.control, name: 'message', rows: 4, describedBy: ids.describedBy })}
    ${FieldDescription({ children: "Votre message sera transmis à l'équipe support." })}
  `,
})
```

### Lecture seule et désactivé

```ts
Textarea({ value: 'Généré par le serveur.', readonly: true })
Textarea({ disabled: true, placeholder: 'Les commentaires sont fermés' })
```

Un champ en lecture seule peut encore recevoir le focus et être copié ; un champ désactivé sort de l'ordre de tabulation et n'est pas envoyé.

### Lié à un formulaire

[TextAreaField](/fr/nebula/components/form) relie un `Textarea` à une clé d'un `form()` d'Aurora, avec son libellé et son erreur.

## API

### Textarea

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` de l'élément — ce que vise un `<label for>`. |
| `name` | `string` | — | Le nom sous lequel la valeur est envoyée. |
| `value` | `Reactive<string>` | `''` | Liée à la propriété `value`. Absente, le navigateur garde le texte. |
| `placeholder` | `Reactive<string>` | — | Indication affichée tant que le champ est vide. Pas un libellé. |
| `rows` | `Reactive<number>` | — | Le `rows` natif. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `readonly` | `Reactive<boolean>` | `false` | Pose le `readonly` natif. |
| `required` | `Reactive<boolean>` | `false` | Pose le `required` natif. |
| `invalid` | `Reactive<boolean>` | — | Pose `aria-invalid="true"`, sur lequel se règlent la bordure et l'anneau de focus. |
| `describedBy` | `Reactive<string \| undefined>` | — | Pose `aria-describedby` : l'id du texte d'aide ou de l'erreur. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `onInput` | `(value: string, event: Event) => void` | — | À chaque frappe, avec le texte courant. |
| `onChange` | `(value: string, event: Event) => void` | — | Le `change` natif : à la validation, en général quand le champ perd le focus. |
| `onBlur` | `(event: FocusEvent) => void` | — | Le champ a perdu le focus. |

### textareaClasses

`textareaClasses: string` — la liste de classes du champ, pour un `<textarea>` natif que vous écrivez vous-même.

## Accessibilité

Un `<textarea>` natif : <kbd>Entrée</kbd> insère une ligne, <kbd>Tab</kbd> quitte le champ. `invalid` pose `aria-invalid="true"` et rien quand il est faux, et `describedBy` pose `aria-describedby`. Sans prop `label`, le champ tient son nom d'un `<label for>` qui vise son `id` — un placeholder seul le laisse sans nom dès que l'utilisateur commence à taper.
