# Field

Un contrôle avec son libellé, son texte d'aide et son erreur. Les ids sont la raison d'être du composant : shadcn les laisse à l'appelant — un `FieldLabel` avec `htmlFor="x"` à côté d'un `Input` avec `id="x"` — ce qui marche jusqu'à ce que les deux divergent. `fieldIds()` fabrique un jeu assorti, et `Field` le partage avec ses parties, si bien que le libellé, la description et l'erreur visent le bon élément sans que personne ne répète une chaîne.

Le contrôle est la seule partie que `Field` ne construit pas : il lui faut donc quand même le jeu. Appelez `fieldIds()` vous-même, passez-le à `Field`, et posez `ids.control` et `ids.describedBy` sur le contrôle. `describedBy` nomme la description *et* l'erreur, toujours : un lecteur d'écran ignore un id qui ne mène à rien, alors que recalculer l'attribut à l'apparition d'une erreur obligerait à reconstruire le contrôle, ce qu'Aurora ne fait pas.

```sh
ream nebula:add field
```

Molécule · `molecules/Field.ts` · aucune dépendance

## Utilisation

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldDescription, FieldError, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const error = signal<string | undefined>(undefined)

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'E-mail' })}
    ${Input({ id: ids.control, type: 'email', describedBy: ids.describedBy, invalid: () => error() !== undefined })}
    ${FieldDescription({ children: 'Nous ne le communiquons jamais.' })}
    ${FieldError({ children: error })}
  `,
})
```

`children` est typé `Parts` : `FieldLabel`, `FieldDescription` et `FieldError` lisent les ids du champ, ils sont donc construits dans le thunk — voir [composition](/fr/nebula/composition).

## Exemples

### Plusieurs erreurs

`errors` prend une liste. Un seul message s'affiche en texte, plusieurs en liste à puces :

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const problems = signal<readonly string[]>([])

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Mot de passe' })}
    ${Input({ id: ids.control, type: 'password', describedBy: ids.describedBy, invalid: () => problems().length > 0 })}
    ${FieldError({ errors: problems })}
  `,
})
```

`FieldError` reste dans le DOM quand il est vide, masqué par `empty:hidden` : l'id que nomme `describedBy` doit mener quelque part dès qu'une erreur apparaît, et un nœud ajouté après coup est annoncé en retard, ou pas du tout.

### Obligatoire et désactivé

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const locked = signal(false)

Field({
  ids,
  required: true,
  disabled: locked,
  children: () => html`
    ${FieldLabel({ children: 'Entreprise' })}
    ${Input({ id: ids.control, required: true, disabled: locked })}
  `,
})
```

Les deux props portent sur l'*allure* du champ : `required` ajoute un astérisque au libellé, `disabled` estompe le libellé. Aucune n'atteint le contrôle — donnez-lui ses propres `required` et `disabled`.

### Un champ horizontal

`orientation: 'horizontal'` met le texte d'un côté et le contrôle de l'autre. `FieldContent` contient la moitié texte :

```ts
import { html } from '@c9up/aurora'
import { Checkbox, Field, FieldContent, FieldDescription, FieldLabel, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  orientation: 'horizontal',
  children: () => html`
    ${Checkbox({ id: ids.control, name: 'sync' })}
    ${FieldContent({
      children: html`
        ${FieldLabel({ children: 'Synchroniser entre appareils' })}
        ${FieldDescription({ children: 'Vos réglages vous suivent sur chaque appareil où vous vous connectez.' })}
      `,
    })}
  `,
})
```

### Nommer un Select

Le déclencheur d'un [Select](/fr/nebula/components/select) prend les ids du champ comme n'importe quel contrôle, si bien que le libellé nomme la combobox :

```ts
import { html } from '@c9up/aurora'
import { Field, FieldDescription, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Rôle' })}
    ${Select({
      defaultValue: 'reader',
      children: () => html`
        ${SelectTrigger({ id: ids.control, describedBy: ids.describedBy, children: SelectValue({}) })}
        ${SelectContent({
          children: () => html`
            ${SelectItem({ value: 'reader', children: 'Lecteur' })}
            ${SelectItem({ value: 'owner', children: 'Propriétaire' })}
          `,
        })}
      `,
    })}
    ${FieldDescription({ children: 'Ce que le membre a le droit de faire.' })}
  `,
})
```

### Une section de formulaire

`FieldSet` et `FieldLegend` regroupent des champs qui répondent à une même question ; `FieldGroup` empile des champs avec l'espacement d'un formulaire :

```ts
import { html } from '@c9up/aurora'
import {
  Field, FieldGroup, FieldLabel, FieldLegend, FieldSet, Input, fieldIds,
} from '@c9up/nebula'

const street = fieldIds()
const city = fieldIds()

FieldSet({
  children: html`
    ${FieldLegend({ children: 'Adresse de facturation' })}
    <p class="text-muted-foreground text-sm">Imprimée sur chaque facture.</p>
    ${FieldGroup({
      children: html`
        ${Field({ ids: street, children: () => html`${FieldLabel({ children: 'Rue' })}${Input({ id: street.control })}` })}
        ${Field({ ids: city, children: () => html`${FieldLabel({ children: 'Ville' })}${Input({ id: city.control })}` })}
      `,
    })}
  `,
})
```

Le texte d'aide sous la légende est un simple paragraphe : `FieldLabel`, `FieldDescription` et `FieldError` lisent les ids d'un champ, et hors d'un `Field` ils lèvent une erreur faute d'en trouver un.

### Un filet entre deux possibilités

```ts
import { html } from '@c9up/aurora'
import { Button, FieldGroup, FieldSeparator } from '@c9up/nebula'

FieldGroup({
  children: html`
    ${Button({ variant: 'outline', children: "Continuer avec une clé d'accès" })}
    ${FieldSeparator({ children: 'ou' })}
    ${Button({ type: 'submit', children: "M'envoyer un lien de connexion" })}
  `,
})
```

Sans `children`, le séparateur est un simple filet.

### Un titre qui n'est pas un libellé

`FieldTitle` ressemble à un libellé mais c'est un `<div>` sans `for` — l'intitulé d'un champ dont le contrôle a son propre libellé, comme un groupe de choix.

## API

### Field

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `ids` | `FieldIds` | un nouveau `fieldIds()` | Le jeu que visent les parties. Passez celui que vous avez posé sur le contrôle. |
| `required` | `boolean` | `false` | Ajoute un astérisque à `FieldLabel`. Ne pose pas `required` sur le contrôle. |
| `disabled` | `Reactive<boolean>` | — | Pose `data-disabled`, qui estompe le libellé. Ne désactive pas le contrôle. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Libellé au-dessus du contrôle, ou texte et contrôle côte à côte. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du champ. |
| `children` | `Parts` | — | Le libellé, le contrôle, la description et l'erreur, dans un thunk. |

### FieldLabel

Un `<label>` dont le `for` vaut `ids.control` et l'`id` vaut `ids.label`. Un `<label>`, pas un `<div>` : le cliquer met le contrôle au focus, ce qu'`aria-labelledby` ne donnerait pas.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | La légende. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du libellé. |

### FieldDescription

Un `<p>` dont l'`id` vaut `ids.description`. Mêmes props que `FieldLabel`.

### FieldError

Un `<p role="alert">` dont l'`id` vaut `ids.error`. Reste dans le DOM tant qu'il n'a rien à dire, vide et masqué par `empty:hidden`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Reactive<string \| undefined>` | — | Un message. |
| `errors` | `Reactive<readonly string[] \| undefined>` | — | Plusieurs messages. L'emporte sur `children` quand elle n'est pas vide ; une liste d'un seul message s'affiche en texte. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'erreur. |

### FieldTitle, FieldSet

`FieldTitle` est un `<div>` stylé comme un libellé ; `FieldSet` est un `<fieldset>`. Tous deux prennent `children: Slot` et `class: Reactive<string>`, et aucun ne lit les ids du champ.

### FieldLegend

Une `<legend>`, premier enfant d'un `FieldSet`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `'legend' \| 'label'` | `'legend'` | `legend` est composée à la taille de base, `label` à la taille plus petite d'un libellé. |
| `children` | `Slot` | — | La question à laquelle répond l'ensemble. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la légende. |

### FieldGroup, FieldContent

De simples `<div>` avec un `data-slot` et une liste de classes : `FieldGroup` empile des champs, `FieldContent` est la moitié texte d'un champ horizontal. Tous deux prennent `children?: Slot`, `class?: Reactive<string>` et `id?: string`.

### FieldSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un mot posé au milieu du filet — « ou ». |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du séparateur. |

### fieldIds

`fieldIds(): FieldIds` — un nouveau jeu d'ids assortis.

| Champ | Description |
|---|---|
| `control` | À poser sur le contrôle. Le `for` de `FieldLabel` pointe ici. |
| `label` | L'`id` propre de `FieldLabel`. |
| `description` | L'`id` de `FieldDescription`. |
| `error` | L'`id` de `FieldError`. |
| `describedBy` | `"<description> <error>"` — prêt pour le `describedBy` du contrôle. |

## Accessibilité

`FieldLabel` nomme le contrôle par `for`, et `describedBy` fait lire au lecteur d'écran le texte d'aide et l'erreur avec le contrôle. `FieldError` est `role="alert"` et toujours présent : un message qui apparaît est annoncé au moment où il apparaît. L'astérisque d'un champ obligatoire est `aria-hidden` : c'est le `required` du contrôle lui-même que rapportent les technologies d'assistance. Les ids viennent du compteur d'Aurora, remis à zéro à chaque rendu serveur et à chaque hydratation : les ids avec lesquels une page a été rendue sont ceux que son script retrouve.
