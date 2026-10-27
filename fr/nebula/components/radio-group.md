# RadioGroup

Un choix parmi un ensemble. Chaque élément est un vrai `<input type="radio">`, et les éléments partagent un `name` — c'est ce qui fait que le navigateur les traite comme un seul groupe : les flèches passent de l'un à l'autre, un seul peut être coché, et le choix est envoyé avec un simple formulaire HTML. Un `div` avec `role="radio"` n'obtient rien de tout cela sans le réécrire.

C'est une différence voulue avec shadcn, qui rend un `<button role="radio">` parce que Radix a besoin d'un élément qu'il contrôle entièrement. nebula garde l'input natif et le style par `appearance-none` ; les noms `data-slot` et l'indicateur en point sont ceux de shadcn.

```sh
ream nebula:add radio-group
```

Molécule · `molecules/RadioGroup.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { RadioGroup, RadioGroupItem } from '@c9up/nebula'

RadioGroup({
  name: 'plan',
  defaultValue: 'free',
  children: () => html`
    ${RadioGroupItem({ value: 'free', children: 'Gratuit' })}
    ${RadioGroupItem({ value: 'pro', children: 'Pro' })}
  `,
})
```

`children` est typé `Parts` : le `() =>` permet aux éléments d'atteindre leur groupe — voir [composition](/fr/nebula/composition).

## Exemples

### Avec des descriptions

`description` est une ligne d'aide sous le libellé de l'élément, reliée à son bouton radio par `aria-describedby` :

```ts
RadioGroup({
  name: 'delivery',
  defaultValue: 'standard',
  children: () => html`
    ${RadioGroupItem({ value: 'standard', children: 'Standard', description: '4 à 6 jours ouvrés, gratuit.' })}
    ${RadioGroupItem({ value: 'express', children: 'Express', description: 'Jour ouvré suivant, 12 h.' })}
  `,
})
```

### Suivre un signal

```ts
import { html, signal } from '@c9up/aurora'
import { RadioGroup, RadioGroupItem } from '@c9up/nebula'

const density = signal('comfortable')

RadioGroup({
  name: 'density',
  value: density,
  onValueChange: (value) => density(value),
  children: () => html`
    ${RadioGroupItem({ value: 'comfortable', children: 'Confortable' })}
    ${RadioGroupItem({ value: 'compact', children: 'Compacte' })}
  `,
})
```

Écrire `density` depuis ailleurs déplace la coche. Sans `value`, le groupe part de `defaultValue` et le navigateur garde le choix ; `onValueChange` le signale dans les deux cas.

### Côte à côte

```ts
RadioGroup({
  name: 'size',
  orientation: 'horizontal',
  children: () => html`
    ${RadioGroupItem({ value: 's', children: 'S' })}
    ${RadioGroupItem({ value: 'm', children: 'M' })}
    ${RadioGroupItem({ value: 'l', children: 'L' })}
  `,
})
```

`orientation` dispose les éléments en ligne et pose `aria-orientation` ; les flèches marchent dans les deux sens de toute façon, puisque c'est le navigateur qui les gère.

### Désactivé

```ts
import { signal } from '@c9up/aurora'

const locked = signal(false)

RadioGroup({
  name: 'billing',
  disabled: locked,
  children: () => html`
    ${RadioGroupItem({ value: 'monthly', children: 'Mensuel' })}
    ${RadioGroupItem({ value: 'yearly', children: 'Annuel' })}
    ${RadioGroupItem({ value: 'lifetime', children: 'À vie', disabled: true })}
  `,
})
```

`disabled` sur le groupe suit son accesseur ; sur un élément, c'est un simple booléen, fixé à la construction.

### Avec une question

Un groupe radio répond à une question, et c'est un `<fieldset>` avec sa `<legend>` qui dit laquelle. [FieldSet](/fr/nebula/components/field) et `FieldLegend` lui donnent l'allure de la bibliothèque :

```ts
import { html } from '@c9up/aurora'
import { FieldLegend, FieldSet, RadioGroup, RadioGroupItem } from '@c9up/nebula'

FieldSet({
  children: html`
    ${FieldLegend({ variant: 'label', children: "M'avertir pour" })}
    ${RadioGroup({
      name: 'notify',
      defaultValue: 'mentions',
      children: () => html`
        ${RadioGroupItem({ value: 'all', children: 'Tous les nouveaux messages' })}
        ${RadioGroupItem({ value: 'mentions', children: 'Messages directs et mentions' })}
        ${RadioGroupItem({ value: 'none', children: 'Rien' })}
      `,
    })}
  `,
})
```

## API

### RadioGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | — | Obligatoire. Partagé par tous les éléments : ce qui en fait un groupe, et le nom sous lequel le choix est envoyé. |
| `value` | `Reactive<string \| undefined>` | — | La valeur choisie. Tant qu'elle vaut `undefined`, c'est `defaultValue` qui est coché. |
| `defaultValue` | `string` | — | La valeur cochée au départ quand `value` est absente. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive tous les éléments. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | La disposition, et `aria-orientation`. |
| `onValueChange` | `(value: string) => void` | — | Un élément a été choisi. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |
| `children` | `Parts` | — | Les éléments, dans un thunk. |

### RadioGroupItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Ce que le groupe envoie quand cet élément est choisi. |
| `children` | `Slot` | — | Le libellé de l'élément, rendu dans un `<label for>` lié à son bouton radio. |
| `description` | `Slot` | — | Une ligne d'aide sous le libellé, reliée par `aria-describedby`. |
| `disabled` | `boolean` | `false` | Désactive cet élément seul. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'input radio. |

## Accessibilité

Le groupe est `role="radiogroup"`, chaque élément un bouton radio natif dont le libellé est lié par `for` : cliquer le texte le choisit. Le clavier est celui du navigateur : <kbd>Tab</kbd> entre dans le groupe sur l'élément coché et en sort d'un coup, les flèches déplacent et choisissent, et <kbd>Espace</kbd> coche l'élément qui a le focus. Une description est reliée à son bouton radio par `aria-describedby`.

Le groupe lui-même ne prend pas de `label` : nommez la question par un `FieldSet` et un `FieldLegend` autour de lui, comme ci-dessus.
