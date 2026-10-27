# Select

Une option parmi une liste, dans une listbox que la bibliothèque dessine elle-même. C'est le seul endroit où nebula renonce à un contrôle natif : la liste déroulante d'un `<select>` est dessinée par le système d'exploitation, sa police, ses couleurs et ses coches ne se stylent pas, et ses options ne contiennent que du texte. Quand du simple texte suffit aux options, [NativeSelect](/fr/nebula/components/native-select) est le meilleur choix.

Tout ce qu'un select natif faisait gratuitement est remis à la main : `role="combobox"` sur le déclencheur et `role="listbox"` sur le panneau, la recherche à la frappe, les flèches, <kbd>Début</kbd>/<kbd>Fin</kbd>, <kbd>Entrée</kbd> et <kbd>Échap</kbd>, et un input caché pour que le choix soit encore envoyé avec un simple formulaire HTML. Le focus reste sur le déclencheur pendant que la liste est ouverte ; seul `aria-activedescendant` bouge, ce qui permet à un lecteur d'écran d'annoncer chaque option sans que l'anneau de focus saute.

Les éléments s'enregistrent eux-mêmes en se construisant — leur libellé, s'ils sont désactivés — et quelles options existent, dans quel ordre, se lit dans la liste telle qu'elle est montée. Fermée, la liste reste montée hors du document : le déclencheur peut afficher le libellé de l'option choisie avant que le panneau se soit jamais ouvert, et le clavier trouve les options dès qu'il l'ouvre.

```sh
ream nebula:add select
```

Organisme · `organisms/Select.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

Select({
  name: 'fruit',
  children: () => html`
    ${SelectTrigger({ label: 'Fruit', children: SelectValue({ placeholder: 'Choisir un fruit' }) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'apple', children: 'Pomme' })}
        ${SelectItem({ value: 'banana', children: 'Banane' })}
        ${SelectItem({ value: 'cherry', children: 'Cerise' })}
      `,
    })}
  `,
})
```

`Select` et `SelectContent` prennent leurs parties dans un thunk — leurs `children` sont typés `Parts`, voir [composition](/fr/nebula/composition). Les autres parties prennent de simples valeurs.

## Exemples

### Groupes, intitulés et séparateurs

```ts
import { html } from '@c9up/aurora'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@c9up/nebula'

Select({
  name: 'timezone',
  children: () => html`
    ${SelectTrigger({ label: 'Fuseau horaire', class: 'w-[220px]', children: SelectValue({ placeholder: 'Choisir un fuseau horaire' }) })}
    ${SelectContent({
      children: () => html`
        ${SelectGroup({
          children: html`
            ${SelectLabel({ children: 'Europe' })}
            ${SelectItem({ value: 'Europe/Zurich', children: 'Zurich' })}
            ${SelectItem({ value: 'Europe/Paris', children: 'Paris' })}
          `,
        })}
        ${SelectSeparator({})}
        ${SelectGroup({
          children: html`
            ${SelectLabel({ children: 'Amérique' })}
            ${SelectItem({ value: 'America/New_York', children: 'New York' })}
          `,
        })}
      `,
    })}
  `,
})
```

### Contrôlé

`value` avec `onValueChange` place le choix dans votre signal. Sans `value`, le select garde le choix lui-même, en partant de `defaultValue` :

```ts
import { html, signal } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

const status = signal<string | undefined>('open')

Select({
  value: status,
  onValueChange: (value) => status(value),
  children: () => html`
    ${SelectTrigger({ label: 'Statut', size: 'sm', children: SelectValue({}) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'open', children: 'Ouvert' })}
        ${SelectItem({ value: 'closed', children: 'Fermé' })}
      `,
    })}
  `,
})
```

Tant que `value` vaut `undefined`, le select se rabat sur son propre état : une valeur qui arrive après un chargement asynchrone prend la main en arrivant.

### Des options qui suivent un signal

Construisez les éléments dans un accesseur à l'intérieur du thunk. Une option ajoutée au signal apparaît dans la liste, une option retirée quitte la liste et le clavier, et le déclencheur continue d'afficher le nom actuel de l'option choisie :

```ts
import { html, signal } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

const roles = signal<readonly { id: string; name: string }[]>([{ id: 'reader', name: 'Lecteur' }])

Select({
  name: 'role',
  defaultValue: 'owner',
  children: () => html`
    ${SelectTrigger({ label: 'Rôle', children: SelectValue({ placeholder: 'Choisir un rôle' }) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'owner', children: 'Propriétaire' })}
        ${() => roles().map((role) => SelectItem({ value: role.id, children: role.name }))}
      `,
    })}
  `,
})
```

Quand le signal retire l'option choisie, la valeur est conservée — c'est à vous de la changer — mais le déclencheur affiche le placeholder jusqu'au retour d'une option de cette valeur.

### Des options avec du balisage

Un élément peut contenir une icône, une pastille, deux lignes. La recherche à la frappe porte sur les enfants quand ce sont une simple chaîne ; construit en balisage, un élément dit comment il s'appelle par `textValue`. Dans un `SelectContent` :

```ts
import { html } from '@c9up/aurora'
import { SelectItem } from '@c9up/nebula'

SelectItem({
  value: 'red',
  textValue: 'Rouge',
  children: html`<span class="size-3 rounded-full bg-red-500"></span>Rouge`,
})
```

Le déclencheur affiche le `textValue` de l'option choisie, pas son balisage. Sans `textValue`, un tel élément est cherché et affiché par sa `value`.

### Désactivé

```ts
import { html } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

Select({
  disabled: () => !canEdit(),
  children: () => html`
    ${SelectTrigger({ label: 'Formule', children: SelectValue({}) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'free', children: 'Gratuite' })}
        ${SelectItem({ value: 'team', children: 'Équipe' })}
        ${SelectItem({ value: 'enterprise', children: 'Entreprise', disabled: true })}
      `,
    })}
  `,
})
```

Un élément désactivé est sauté par les flèches et par la recherche à la frappe, et ignore les clics.

### Une longue liste

Le panneau est au moins aussi large que le déclencheur, et pas plus haut que l'espace restant à côté de lui : une longue liste défile. `SelectScrollUpButton` et `SelectScrollDownButton` ajoutent des flèches qui font défiler tant que le pointeur reste dessus — une commodité en plus du défilement propre au panneau, ce qui explique qu'elles n'aient pas d'équivalent clavier. Dans un `Select` :

```ts
import { html } from '@c9up/aurora'
import { SelectContent, SelectItem, SelectScrollDownButton, SelectScrollUpButton } from '@c9up/nebula'

SelectContent({
  side: 'bottom',
  align: 'start',
  children: () => html`
    ${SelectScrollUpButton({})}
    ${countries.map((country) => SelectItem({ value: country.code, children: country.name }))}
    ${SelectScrollDownButton({})}
  `,
})
```

À l'ouverture du panneau, l'option choisie est amenée dans la zone visible.

### Dans un formulaire

Le select garde un input caché qui porte la valeur choisie ; avec un `name`, elle est envoyée comme n'importe quel champ. Dans un [Field](/fr/nebula/components/field), donnez au déclencheur les ids du champ — voir [nommer un Select](/fr/nebula/components/field#nommer-un-select).

## API

### Select

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | — | Le nom sous lequel l'input caché envoie la valeur. |
| `value` | `Reactive<string \| undefined>` | — | La valeur choisie. Tant qu'elle vaut `undefined`, c'est l'état propre du select qui sert. |
| `defaultValue` | `string` | — | La valeur choisie au départ quand `value` est absente. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive le déclencheur et son clavier. |
| `invalid` | `Reactive<boolean>` | — | Pose `aria-invalid="true"` sur le déclencheur. |
| `required` | `boolean` | `false` | Pose `aria-required="true"` sur le déclencheur. |
| `onValueChange` | `(value: string) => void` | — | Une option a été choisie. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'enveloppe. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un thunk. |

### SelectTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'affiche le select fermé — en général un `SelectValue`. |
| `size` | `'default' \| 'sm'` | `'default'` | 36 ou 32 px de haut. |
| `id` | `string` | un id fabriqué | L'`id` du déclencheur — ce que vise un `FieldLabel` ou un `<label for>`. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`, pour un select qu'aucun `<label>` ne nomme. |
| `describedBy` | `Reactive<string \| undefined>` | — | Pose `aria-describedby`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### SelectValue

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Select…'` | Affiché tant qu'aucune option n'est choisie. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la valeur. |

### SelectContent

Ne rend rien là où il est écrit : le select le déplace dans un portail à l'ouverture.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les éléments, groupes et séparateurs, dans un thunk. |
| `side` | `Side` | `'bottom'` | Le côté du déclencheur où s'ouvre le panneau : `'top'`, `'right'`, `'bottom'` ou `'left'`. |
| `align` | `Align` | `'start'` | Comment le panneau s'aligne le long de ce côté : `'start'`, `'center'` ou `'end'`. |
| `sideOffset` | `number` | `4` | L'écart au déclencheur, en pixels. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau, lue à chaque ouverture. |

### SelectItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Obligatoire. Ce que pose le choix de cette option. |
| `children` | `Slot` | — | Le contenu de l'option. |
| `textValue` | `string` | les enfants quand c'est une chaîne, sinon `value` | Ce qu'utilisent la recherche à la frappe et le libellé du déclencheur. |
| `disabled` | `boolean` | `false` | Sauté par le clavier, ignore les clics. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'option. |

### SelectGroup, SelectLabel

`SelectGroup` est une boîte `role="group"` autour d'éléments liés ; `SelectLabel` est le petit intitulé à l'intérieur. Tous deux prennent `children: Slot` et `class: Reactive<string>`.

### SelectSeparator, SelectScrollUpButton, SelectScrollDownButton

Un filet entre des groupes, et les deux flèches de défilement. Chacun ne prend que `class: Reactive<string>`.

### selectTriggerClasses, selectContentClasses

`selectTriggerClasses: string` et `selectContentClasses: string` — les listes de classes du déclencheur et du panneau, pour un contrôle qui doit ressembler à un select. [Combobox](/fr/nebula/components/combobox) utilise la première.

## Accessibilité

Le déclencheur est un `<button role="combobox">` avec `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` qui nomme la liste quand elle est ouverte, et `aria-activedescendant` qui nomme l'option en surbrillance. Le panneau est `role="listbox"`, étiqueté par le déclencheur ; chaque élément est `role="option"`, avec `aria-selected="true"` sur celui qui est choisi et `"false"` sur les autres. Le focus n'entre jamais dans le panneau. Après un choix, il est remis sur le déclencheur.

| Touche | Action |
|---|---|
| <kbd>Flèche bas</kbd>, <kbd>Entrée</kbd>, <kbd>Espace</kbd> | Sur le déclencheur fermé : ouvrir, en surlignant l'option choisie ou sinon la première non désactivée. |
| <kbd>Flèche bas</kbd> / <kbd>Flèche haut</kbd> | Liste ouverte : surligner l'option non désactivée suivante / précédente. S'arrête aux deux bouts. |
| <kbd>Début</kbd> / <kbd>Fin</kbd> | Liste ouverte : surligner la première / dernière option non désactivée. |
| <kbd>Entrée</kbd>, <kbd>Espace</kbd> | Liste ouverte : choisir l'option en surbrillance et fermer. |
| Un caractère | Liste ouverte : recherche à la frappe, qui surligne l'option non désactivée suivante dont le texte commence par les lettres tapées. Une pause d'une seconde relance une nouvelle recherche. |
| <kbd>Échap</kbd> | Liste ouverte : fermer sans choisir. |

Un appui hors du panneau et du déclencheur le ferme aussi.

Un texte est intégré : `SelectValue` affiche `'Select…'` jusqu'à ce que `placeholder` le remplace. Le déclencheur n'a pas de nom à lui — donnez-lui `label`, ou un `id` que vise un `FieldLabel` ; voir [langues](/fr/nebula/languages).
