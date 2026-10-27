# Form

La jonction entre le contrôleur `form()` d'Aurora et le balisage des champs de nebula. Aurora fournit déjà le contrôleur — les valeurs, une erreur par champ, l'état « touché », l'envoi en cours, une validation facultative — et nebula n'en livre donc pas un second. C'est une différence voulue avec shadcn, dont le Form est un jeu d'adaptateurs au-dessus de `react-hook-form` : ici, il n'y a que la liaison.

Ce dont la liaison se charge, ce sont les trois choses qu'on oublie sinon : `aria-invalid` quand un champ affiche une erreur, `aria-describedby` qui pointe vers cette erreur, et le marquage d'un champ comme touché quand on le quitte, pour qu'avant un envoi une erreur ne s'affiche que sur un champ que l'utilisateur a déjà quitté.

```sh
ream nebula:add form
```

Organisme · `organisms/Form.ts` · [Button](/fr/nebula/components/button), [Field](/fr/nebula/components/field), [Input](/fr/nebula/components/input), [Spinner](/fr/nebula/components/spinner), [Textarea](/fr/nebula/components/textarea)

## Utilisation

```ts
import { form } from '@c9up/aurora'
import { Form, SubmitButton, TextField, bind } from '@c9up/nebula'

const login = form({
  initial: { email: '', password: '' },
  validate: (values) => (values.email === '' ? { email: "L'e-mail est obligatoire" } : {}),
  submit: (values) => signIn(values),
})

Form({
  form: login,
  children: [
    TextField({ bind: bind(login, 'email'), label: 'E-mail', type: 'email', autocomplete: 'email' }),
    TextField({ bind: bind(login, 'password'), label: 'Mot de passe', type: 'password' }),
    SubmitButton({ form: login, label: 'Se connecter' }),
  ],
})
```

## Exemples

### Quand les erreurs apparaissent

L'ordre est celui d'Aurora, et il vaut d'être connu. La validation s'exécute à l'envoi : `handleSubmit` valide, marque tous les champs comme touchés, et n'envoie que si rien n'a échoué. L'erreur d'un champ s'efface dès qu'on y écrit. L'utilisateur envoie donc, voit tous les problèmes d'un coup, et les regarde disparaître un à un à mesure qu'il les corrige.

Un champ n'affiche son erreur qu'une fois touché. Taper dans un champ neuf ne lève rien, et le quitter ne valide pas — cela lève seulement la barrière devant une erreur que la validation a déjà trouvée. C'est ce qui évite qu'un formulaire vierge s'ouvre avec « Obligatoire » sous chaque case vide.

### Texte d'aide, champ multiligne et libellé d'attente

```ts
import { form } from '@c9up/aurora'
import { Form, SubmitButton, TextAreaField, TextField, bind } from '@c9up/nebula'

const ticket = form({
  initial: { subject: '', body: '' },
  validate: (values) => (values.body.length < 20 ? { body: 'Décrivez le problème en quelques phrases.' } : {}),
  submit: (values) => openTicket(values),
})

Form({
  form: ticket,
  children: [
    TextField({ bind: bind(ticket, 'subject'), label: 'Objet', required: true }),
    TextAreaField({
      bind: bind(ticket, 'body'),
      label: "Que s'est-il passé ?",
      description: 'Les étapes, ce que vous attendiez, ce que vous avez vu à la place.',
      rows: 6,
    }),
    SubmitButton({ form: ticket, label: 'Envoyer', pendingLabel: 'Envoi…' }),
  ],
})
```

`SubmitButton` est désactivé pendant l'envoi, avec un spinner devant son libellé — et seulement à ce moment-là. Il n'est jamais désactivé parce que le formulaire est invalide : un bouton mort tant que le formulaire n'est pas juste ne donne à l'utilisateur rien à presser ni aucune raison, alors que le presser et voir toutes les erreurs est la façon dont un formulaire dit ce qui ne va pas.

### Les erreurs du serveur

Un envoi refusé aboutit dans le `onFail` d'Aurora. `setErrors` place les messages du serveur sur leurs champs, où `TextField` les affiche comme les siens :

```ts
import { form, isHttpError } from '@c9up/aurora'

const signup = form({
  initial: { email: '' },
  submit: (values) => register(values),
})

signup.onFail((error) => {
  if (isHttpError(error) && error.status === 409) signup.setErrors({ email: 'Un compte utilise déjà cette adresse.' })
})
```

### Un champ que la liaison ne livre pas

`TextField` et `TextAreaField` couvrent le texte. Tout autre contrôle prend les trois mêmes fils à la main, avec `bind()` et un [Field](/fr/nebula/components/field) :

```ts
import { form, html } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, NativeSelect, bind, fieldIds } from '@c9up/nebula'

const invite = form({
  initial: { email: '', role: '' },
  validate: (values) => (values.role === '' ? { role: 'Choisissez un rôle.' } : {}),
  submit: (values) => sendInvite(values),
})

const role = bind(invite, 'role')
const ids = fieldIds()
const visibleError = () => (role.field.touched() ? (role.field.error() ?? undefined) : undefined)

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Rôle' })}
    ${NativeSelect({
      id: ids.control,
      name: role.name,
      placeholder: 'Choisir…',
      options: [
        { value: 'reader', label: 'Lecteur' },
        { value: 'editor', label: 'Éditeur' },
      ],
      value: () => role.field.value(),
      onValueChange: (value) => role.set(value),
      invalid: () => visibleError() !== undefined,
      describedBy: ids.describedBy,
    })}
    ${FieldError({ children: visibleError })}
  `,
})
```

`NativeSelect` n'a pas de callback de perte de focus pour marquer le champ comme touché : son erreur apparaît donc au premier envoi du formulaire — qui marque tous les champs comme touchés.

### Des liaisons typées

`bind()` s'appelle là où le champ est utilisé, avec une clé littérale : son type est donc celui du champ. `bind(invite, 'email')` est un `FieldBinding<string>`. `TextField` ne prend qu'un `FieldBinding<string>`, si bien qu'un champ numérique confié à une saisie de texte est attrapé par le compilateur :

```ts
import { form } from '@c9up/aurora'
import { TextField, bind } from '@c9up/nebula'

const order = form({ initial: { reference: '', quantity: 1 }, submit: (values) => placeOrder(values) })

TextField({ bind: bind(order, 'reference'), label: 'Référence' })
// @ts-expect-error — quantity est un nombre
TextField({ bind: bind(order, 'quantity'), label: 'Quantité' })
```

## API

### Form

`Form<T>(props)` — l'élément `<form>`, générique sur les valeurs du contrôleur.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `form` | `AuroraForm<T>` | — | Obligatoire. Le contrôleur issu du `form()` d'Aurora. Son `handleSubmit` s'exécute à l'envoi. |
| `children` | `Slot` | — | Les champs et le bouton d'envoi. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du formulaire. |

Le formulaire est `novalidate` : les bulles du navigateur ne se stylent pas, apparaissent une à une, et se déclencheraient avant la validation du contrôleur, ce qui donnerait deux présentations à la même erreur. Un validateur qui lève une exception est signalé dans la console par `[nebula] Form submit failed:` plutôt que perdu dans une promesse non gérée.

### TextField

Un `Field` qui contient un `FieldLabel`, un `Input`, un `FieldDescription` facultatif et un `FieldError`, lié à une clé.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `bind` | `FieldBinding<string>` | — | Obligatoire. Issu de `bind(form, key)`. |
| `label` | `Child` | — | Obligatoire. La légende. |
| `description` | `Child` | — | Texte d'aide sous le contrôle. |
| `placeholder` | `string` | — | Le placeholder de l'input. |
| `required` | `boolean` | — | Pose le `required` de l'input et ajoute un astérisque au libellé. |
| `disabled` | `Reactive<boolean>` | — | Désactive l'input et estompe le libellé. |
| `type` | `string` | `'text'` | Le `type` de l'input. |
| `autocomplete` | `string` | — | L'`autocomplete` de l'input. |

### TextAreaField

La même chose avec un `Textarea`. Il prend toutes les props de `TextField` sauf `type` et `autocomplete`, plus :

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `rows` | `number` | — | Le `rows` du textarea. |

### SubmitButton

`SubmitButton<T>(props)` — un `Button` avec `type="submit"`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `form` | `AuroraForm<T>` | — | Obligatoire. Le contrôleur dont `submitting` désactive le bouton. |
| `label` | `Child` | — | Obligatoire. Le texte du bouton. |
| `pendingLabel` | `Child` | `label` | Remplace le libellé pendant l'envoi. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du bouton. |

### bind

`bind<T, K extends keyof T & string>(form: AuroraForm<T>, name: K): FieldBinding<T[K]>` — une clé d'un formulaire, avec un setter qui sait déjà quelle clé il écrit.

`FieldBinding<V>` vaut `{ readonly name: string; readonly field: FormField<V>; set(value: V): void }`. `field` est la prise d'Aurora sur la clé — `value()`, `error()`, `touched()`, `markTouched()`.

`AuroraForm<T>` est le `Form<T>` d'Aurora, renommé à l'import pour ne pas entrer en collision avec ce composant.

## Accessibilité

Chaque `TextField` nomme son input par un `<label for>`, pose `aria-describedby` vers sa description et son erreur, et pose `aria-invalid="true"` tant qu'une erreur est affichée. L'erreur est un élément `role="alert"` présent dès le départ : un message est annoncé au moment où il apparaît. `required` pose le `required` natif ; l'astérisque à côté du libellé est masqué aux technologies d'assistance. <kbd>Entrée</kbd> dans un champ texte envoie le formulaire, comme dans tout formulaire HTML.

Pendant l'envoi, `SubmitButton` affiche un [Spinner](/fr/nebula/components/spinner), qui annonce « Loading ». `SubmitButton` n'a pas de prop pour ce texte : pour le changer, modifiez l'appel dans votre copie de `organisms/Form.ts` — voir [posséder la source](/fr/nebula/owning-the-source) et [langues](/fr/nebula/languages).
