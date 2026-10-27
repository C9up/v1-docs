# InputGroup

Un champ avec quelque chose d'accroché : une devise devant, un `.com` derrière, une icône de recherche, un bouton pour vider. Il se lit comme une seule boîte, et il est dessiné comme tel.

La bordure, l'anneau de focus et l'état invalide vivent sur le **groupe**, pas sur le contrôle. Un champ avec sa propre bordure dans un groupe bordé dessine deux rectangles, et un anneau autour du seul champ laisse les ajouts dehors. Le contrôle intérieur renonce donc à tout cela — c'est tout le rôle de `inputGroupControlClasses` — et `focus-within` déplace l'anneau sur le groupe : donner le focus au champ allume tout le contrôle, ajouts compris.

```sh
ream nebula:add input-group
```

Molécule · `molecules/InputGroup.ts` · [button](/fr/nebula/components/button), [input](/fr/nebula/components/input), [textarea](/fr/nebula/components/textarea)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { InputGroup, InputGroupAddon, InputGroupInput, SearchIcon } from '@c9up/nebula'

InputGroup({
  children: html`
    ${InputGroupAddon({ children: SearchIcon() })}
    ${InputGroupInput({ name: 'q', type: 'search', label: 'Rechercher', placeholder: 'Rechercher…' })}
  `,
})
```

`InputGroup` ne fournit aucun contexte : ses enfants sont une simple valeur. `InputGroupInput` est un [Input](/fr/nebula/components/input) aux classes dépouillées ; il accepte toutes les props d'`Input`.

## Exemples

### Avant et après

```ts
import { InputGroupText } from '@c9up/nebula'

InputGroup({
  children: html`
    ${InputGroupAddon({ children: InputGroupText({ children: 'https://' }) })}
    ${InputGroupInput({ name: 'domain', label: 'Domaine', placeholder: 'exemple' })}
    ${InputGroupAddon({ align: 'inline-end', children: InputGroupText({ children: '.com' }) })}
  `,
})
```

Un ajout se place là où il vient dans `children` : mettez un ajout de fin après le contrôle. `align` est écrit dans le `data-align` de l'ajout pour que votre propre CSS s'y accroche ; les classes du groupe ne le lisent pas.

### Un bouton à l'intérieur

`InputGroupButton` est un [Button](/fr/nebula/components/button) qui vaut `ghost` et `sm` par défaut : un bouton plein de la hauteur du champ ferait du groupe deux contrôles côte à côte, ce que le groupe existe justement pour éviter.

```ts
import { signal } from '@c9up/aurora'
import { InputGroupButton } from '@c9up/nebula'

const query = signal('')

InputGroup({
  children: html`
    ${InputGroupAddon({ children: SearchIcon() })}
    ${InputGroupInput({ label: 'Rechercher', value: query, onInput: (value) => query(value) })}
    ${InputGroupAddon({ align: 'inline-end', children: InputGroupButton({
      children: 'Vider',
      disabled: () => query() === '',
      onClick: () => query(''),
    }) })}
  `,
})
```

### Invalide et désactivé

Le `invalid` et le `disabled` du groupe dessinent l'état ; ceux du contrôle le disent. Passez-les aux deux :

```ts
const invalid = () => errors().has('price')

InputGroup({
  invalid,
  disabled: sending,
  children: html`
    ${InputGroupAddon({ children: InputGroupText({ children: 'CHF' }) })}
    ${InputGroupInput({ name: 'price', type: 'number', label: 'Prix', invalid, disabled: sending })}
  `,
})
```

Le `invalid` du groupe passe la bordure et l'anneau dans la couleur destructive ; celui du champ pose `aria-invalid` sur le champ où se trouve le lecteur d'écran. Le `disabled` du groupe l'atténue et bloque le pointeur ; celui du champ est ce qui le sort de l'ordre de tabulation et du formulaire.

### Une zone de texte

Le groupe fait une ligne de haut. Donnez-lui `h-auto` pour une zone de texte, et empilez l'ajout dessous :

```ts
import { InputGroupTextarea } from '@c9up/nebula'

html`
  <label for="message" class="sr-only">Message</label>
  ${InputGroup({
    class: 'h-auto flex-col items-stretch',
    children: html`
      ${InputGroupTextarea({ id: 'message', name: 'message', placeholder: 'Écrire un message…' })}
      ${InputGroupAddon({ align: 'block-end', class: 'justify-end pb-2', children: InputGroupButton({
        variant: 'default',
        children: 'Envoyer',
        onClick: () => send(),
      }) })}
    `,
  })}
`
```

`InputGroupTextarea` ne prend pas de `label` : c'est un `<label>` pointant vers son `id` qui le nomme, ici réservé aux lecteurs d'écran par `sr-only`. Un placeholder n'est pas un nom.

## API

### InputGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contrôle et ses ajouts, dans l'ordre où ils sont dessinés. |
| `invalid` | `Reactive<boolean>` | `false` | Dessine le groupe dans la couleur destructive (`aria-invalid` sur le groupe). |
| `disabled` | `Reactive<boolean>` | `false` | Atténue le groupe et bloque le pointeur (`data-disabled`). Ne désactive pas le contrôle. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier dans les classes du groupe. |

### InputGroupInput

Un [Input](/fr/nebula/components/input) avec `inputGroupControlClasses` fusionnée avant votre `class`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` du champ. |
| `name` | `string` | — | Le `name` du champ. |
| `type` | `Reactive<string>` | `'text'` | Le `type` natif. |
| `value` | `Reactive<string>` | `''` | Lié à la propriété `value` : un signal et le champ restent synchrones. |
| `placeholder` | `Reactive<string>` | — | Le placeholder natif. Pas un nom. |
| `autocomplete` | `string` | — | L'`autocomplete` natif. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `readonly` | `Reactive<boolean>` | `false` | Pose le `readonly` natif. |
| `required` | `Reactive<boolean>` | `false` | Pose le `required` natif. |
| `invalid` | `Reactive<boolean>` | `false` | Pose `aria-invalid` sur le champ. |
| `describedBy` | `Reactive<string \| undefined>` | — | Pose `aria-describedby` : l'id de l'élément qui décrit l'erreur. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`, pour un champ qu'aucun `<label>` ne nomme. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `onInput` | `(value: string, event: Event) => void` | — | À chaque frappe, avec le texte du champ. |
| `onChange` | `(value: string, event: Event) => void` | — | À la validation, avec le texte du champ. |
| `onBlur` | `(event: FocusEvent) => void` | — | Le focus a quitté le champ. |
| `onKeyDown` | `(event: KeyboardEvent) => void` | — | Gestionnaire de touche. |

### InputGroupTextarea

Un [Textarea](/fr/nebula/components/textarea) avec `inputGroupControlClasses`, `resize-none` et `py-3` fusionnées avant votre `class`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` du champ. |
| `name` | `string` | — | Le `name` du champ. |
| `value` | `Reactive<string>` | `''` | Lié à la propriété `value`. |
| `placeholder` | `Reactive<string>` | — | Le placeholder natif. |
| `rows` | `Reactive<number>` | — | Le `rows` natif. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `readonly` | `Reactive<boolean>` | `false` | Pose le `readonly` natif. |
| `required` | `Reactive<boolean>` | `false` | Pose le `required` natif. |
| `invalid` | `Reactive<boolean>` | `false` | Pose `aria-invalid` sur le champ. |
| `describedBy` | `Reactive<string \| undefined>` | — | Pose `aria-describedby`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `onInput` | `(value: string, event: Event) => void` | — | À chaque frappe, avec le texte du champ. |
| `onChange` | `(value: string, event: Event) => void` | — | À la validation, avec le texte du champ. |
| `onBlur` | `(event: FocusEvent) => void` | — | Le focus a quitté le champ. |

### InputGroupAddon

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une icône, une unité, un bouton. Un SVG placé dedans fait 16 px. |
| `align` | `'inline-start' \| 'inline-end' \| 'block-start' \| 'block-end'` | `'inline-start'` | Écrit dans `data-align`. La position vient de l'ordre dans `children`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'ajout. |

### InputGroupButton

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Le `type` natif. |
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'ghost'` | L'allure. |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'sm'` | La taille. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `onClick` | `(event: MouseEvent) => void` | — | Gestionnaire de clic. |
| `class` | `Reactive<string>` | — | Fusionnée après `shadow-none`. |

### InputGroupText

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Du texte fixe : une devise, un suffixe de domaine. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du span. |

### inputGroupControlClasses

`inputGroupControlClasses: string` — ce à quoi un contrôle renonce pour prendre place dans un groupe : sa bordure, son fond, son ombre, son remplissage et son anneau de focus. Posez-la sur un contrôle à vous — un `<select>` natif, par exemple — pour le placer dans un `InputGroup`.

## Accessibilité

Le groupe est un simple `<div>` ; le contrôle intérieur garde sa propre sémantique et a besoin de son propre nom — `label`, ou un `<label>` qui pointe vers son `id`. Le texte d'un ajout ne fait pas partie de ce nom : « CHF » devant un champ de prix se voit, il n'est pas annoncé avec le champ — mettez-le dans le libellé quand il compte (« Prix en CHF »). L'anneau de focus est dessiné sur le groupe par `focus-within` : il entoure aussi les ajouts.

`InputGroupButton` ne prend pas de `label` : donnez-lui un texte visible, comme le font les exemples, plutôt qu'une icône seule.

Le groupe n'ajoute aucune gestion du clavier ; chaque contrôle qu'il contient garde son comportement clavier natif et son propre arrêt de tabulation.
