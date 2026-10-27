# NativeSelect

Un vrai `<select>`, stylé — et celui à prendre en premier. [Select](/fr/nebula/components/select) construit une listbox en `div` parce que la liste déroulante d'un select natif est dessinée par le système d'exploitation et ne se style pas du tout ; cette liberté coûte tout ce que le contrôle natif fait gratuitement, et Select doit tout remettre à la main.

Quand les options sont du simple texte, rien de cela ne vaut la peine d'être payé. Un select natif apporte le sélecteur de la plateforme — la roue sur un téléphone, la recherche à la frappe sur un ordinateur —, participe à son formulaire et n'exécute aucun script. `appearance-none` et un chevron l'accordent au reste de la bibliothèque partout, sauf dans la liste ouverte. Prenez Select quand une option a besoin d'une icône, d'une description ou d'une pastille de couleur ; celui-ci sinon.

```sh
ream nebula:add native-select
```

Atome · `atoms/NativeSelect.ts` · aucune dépendance

## Utilisation

```ts
import { NativeSelect } from '@c9up/nebula'

NativeSelect({
  name: 'country',
  placeholder: 'Choisir un pays',
  options: [
    { value: 'ch', label: 'Suisse' },
    { value: 'fr', label: 'France' },
    { value: 'de', label: 'Allemagne' },
  ],
})
```

## Exemples

### Prérempli, et suivant un signal

La valeur qu'il reçoit est la valeur qu'il affiche :

```ts
import { signal } from '@c9up/aurora'
import { NativeSelect } from '@c9up/nebula'

const envelope = signal('fr.cto')

NativeSelect({
  name: 'envelope',
  value: envelope,
  onValueChange: (value) => envelope(value),
  options: [
    { value: 'fr.cto', label: 'Compte-titres' },
    { value: 'fr.pea', label: 'PEA' },
    { value: 'fr.av', label: 'Assurance-vie' },
  ],
})
```

Le choix est marqué par `selected` sur l'option elle-même, pas seulement par la propriété `value` du select. Une propriété affectée avant que les options existent est ignorée sans bruit, et le contrôle afficherait sa première option en tenant une autre valeur — la valeur à l'écran ne serait pas la valeur enregistrée. Marquer l'option est aussi ce qui rend le choix juste dans le HTML rendu côté serveur, avant que le moindre script s'exécute.

### Groupes

Les options consécutives qui partagent un `group` vont dans un même `<optgroup>`, dans l'ordre donné. Un groupe qui revient plus loin dans la liste devient un second `<optgroup>` ; la liste n'est jamais retriée.

```ts
NativeSelect({
  name: 'timezone',
  options: [
    { value: 'Europe/Zurich', label: 'Zurich', group: 'Europe' },
    { value: 'Europe/Paris', label: 'Paris', group: 'Europe' },
    { value: 'America/New_York', label: 'New York', group: 'Amérique' },
    { value: 'America/Los_Angeles', label: 'Los Angeles', group: 'Amérique' },
  ],
})
```

### Options désactivées

```ts
NativeSelect({
  name: 'seats',
  options: [
    { value: '5', label: '5 places' },
    { value: '10', label: '10 places' },
    { value: '50', label: '50 places — contacter les ventes', disabled: true },
  ],
})
```

### Des options qui changent

`options` est lu une fois, à la construction. Pour une liste qui suit un signal, construisez le select dans un accesseur, si bien qu'une nouvelle liste construit un nouveau contrôle :

```ts
import { html, signal } from '@c9up/aurora'
import { NativeSelect } from '@c9up/nebula'

const teams = signal<readonly { id: string; name: string }[]>([])
const team = signal<string | undefined>(undefined)

html`${() =>
  NativeSelect({
    name: 'team',
    placeholder: 'Aucune équipe',
    value: team,
    onValueChange: (value) => team(value),
    options: teams().map((entry) => ({ value: entry.id, label: entry.name })),
  })}`
```

### Dans un Field

```ts
import { html } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, NativeSelect, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Devise' })}
    ${NativeSelect({
      id: ids.control,
      name: 'currency',
      describedBy: ids.describedBy,
      invalid: true,
      options: [
        { value: 'CHF', label: 'Franc suisse' },
        { value: 'EUR', label: 'Euro' },
      ],
    })}
    ${FieldError({ children: 'Choisissez la devise dans laquelle le compte est tenu.' })}
  `,
})
```

## API

### NativeSelect

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `options` | `readonly NativeSelectOption[]` | — | Obligatoire. Les entrées, dans l'ordre. Lu une fois, à la construction. |
| `id` | `string` | — | L'`id` du `<select>` — ce que vise un `<label for>`. |
| `name` | `string` | — | Le nom sous lequel la valeur est envoyée. |
| `value` | `Reactive<string \| undefined>` | — | La valeur choisie. Absente, le navigateur garde le choix. |
| `placeholder` | `string` | — | Une première entrée désactivée à valeur vide, affichée tant que rien n'est choisi. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `required` | `Reactive<boolean>` | `false` | Pose le `required` natif. |
| `invalid` | `Reactive<boolean>` | — | Pose `aria-invalid="true"`, qui dessine la bordure dans la couleur destructive. |
| `describedBy` | `Reactive<string \| undefined>` | — | Pose `aria-describedby`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier dans les classes du `<select>`. |
| `onValueChange` | `(value: string, event: Event) => void` | — | Le `change` natif, avec la valeur choisie. |

`NativeSelectOption` vaut `{ value: string; label: string; disabled?: boolean; group?: string }` — `group` place l'option sous un `<optgroup>` portant ce libellé.

### nativeSelectClasses

`nativeSelectClasses: string` — la liste de classes du `<select>`. Elle garde la place du chevron, qui est dessiné à côté du `<select>`, pas par lui.

## Accessibilité

Un `<select>` natif : le clavier, le sélecteur et les annonces sont ceux de la plateforme. Le chevron est décoratif et masqué aux technologies d'assistance. `invalid` pose `aria-invalid="true"` et `describedBy` pose `aria-describedby`. Il n'y a pas de prop `label` : nommez le select par un `<label for>` ou un [Field](/fr/nebula/components/field).
