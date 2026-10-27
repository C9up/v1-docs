# Label

La légende d'un contrôle de formulaire : un `<label>` natif à la typographie de la bibliothèque, avec `select-none` pour qu'un double clic ne sélectionne pas son texte. Le renvoi du clic, raison d'être d'un libellé — cliquer la légende met le contrôle au focus ou le coche —, vient de `for`, que le navigateur gère déjà ; rien ne s'exécute dans le composant au clic.

L'état estompé ne se passe pas en prop. Il vient de l'entourage : `peer-disabled:` estompe le libellé placé après un élément désactivé portant la classe `peer`, et `group-data-[disabled=true]:` l'estompe à l'intérieur d'un élément portant `group` et `data-disabled="true"`.

```sh
ream nebula:add label
```

Atome · `atoms/Label.ts` · aucune dépendance

## Utilisation

```ts
import { Label } from '@c9up/nebula'

Label({ for: 'email', children: 'E-mail' })
```

## Exemples

### À côté d'un contrôle

```ts
import { html } from '@c9up/aurora'
import { Checkbox, Input, Label } from '@c9up/nebula'

html`
  <div class="grid gap-2">
    ${Label({ for: 'company', children: 'Entreprise' })}
    ${Input({ id: 'company', name: 'company' })}
  </div>
  <div class="flex items-center gap-2">
    ${Checkbox({ id: 'newsletter', name: 'newsletter' })}
    ${Label({ for: 'newsletter', children: "M'envoyer la newsletter" })}
  </div>
`
```

Le libellé est en `flex items-center gap-2` : une icône ou un badge placé dedans s'aligne sur le texte.

### Dans un Field

Dans un [Field](/fr/nebula/components/field), employez plutôt `FieldLabel` : il pointe son `for` vers le contrôle du champ sans qu'on lui donne l'id, marque un champ obligatoire et s'estompe avec le `disabled` du champ.

## API

### Label

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | La légende. |
| `for` | `string` | — | L'`id` du contrôle qu'il nomme. |
| `id` | `string` | — | L'`id` propre du libellé, pour un `aria-labelledby` ailleurs. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### labelClasses

`labelClasses: string` — la liste de classes du libellé, pour un `<label>` que vous écrivez vous-même.

## Accessibilité

Un `<label>` natif : `for` donne au contrôle son nom accessible, et cliquer la légende met le contrôle au focus, ou coche une case, un interrupteur ou un bouton radio. Un libellé sans `for` ne nomme rien — placez le contrôle dedans, ou faites pointer son `for` vers l'`id` du contrôle.
