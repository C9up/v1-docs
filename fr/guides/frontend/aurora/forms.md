# Formulaires et actions

Ce guide couvre les formulaires et les actions asynchrones :

- Actions async — `command`
- Formulaires — `form`

## Actions async — `command`

`command()` enveloppe une tâche async (typiquement un appel `HttpClient`) avec des
signaux réactifs `loading` / `data` / `error`, des handlers chaînables
`onSuccess` / `onFail` / `onSettled`, et un lanceur `run(...args)` — zéro
then/catch au call-site, et le template binde directement l'état en cours.

```js
import { command, HttpClient, isHttpError } from '@c9up/aurora'
const api = new HttpClient()

const login = command((creds) => api.post('/auth/login', creds))
  .onSuccess((u) => redirect('/app'))
  .onFail((e) => formError(isHttpError(e) ? e.data : 'Erreur réseau'))

login.run(creds)            // lance — pas de try/catch
login.loading()             // réactif : spinner / bouton désactivé
login.data(); login.error() // dernier résultat / erreur
```

- `run(...args)` est **relançable** avec des params différents à chaque fois ; les
  signaux reflètent le **dernier** run. Un run supplanté (plus lent) qui résout
  après un plus récent est ignoré — sûr pour search-as-you-type / retry.
- `run()` résout toujours (ne throw jamais) : succès → `data` + `onSuccess`, échec
  → `error` + `onFail`, toujours `onSettled`.
- `reset()` remet `data`/`error`/`loading` à zéro.
- Ce **n'est pas** une Promise — c'est une *fabrique* de promises relançable + un
  état réactif. Pour un appel one-shot sans état d'UI, `attempt()` suffit.
- La tâche est une `Promise` quelconque, donc un appel « multi » c'est juste un
  `Promise.all` à l'intérieur : `command(() => Promise.all([api.get('/a'), api.get('/b')]))`.

## Formulaires — `form`

`form()` est un contrôleur de formulaire réactif minimal : signaux `value` /
`error` / `touched` par champ, validation optionnelle, et un submit piloté par
`command` (donc `submitting` / `submitError` sont réactifs). Il assemble les
briques ci-dessus — les champs sont des signaux, le submit est un `command`.

```js
import { form, HttpClient, isHttpError } from '@c9up/aurora'
const api = new HttpClient()

const f = form({
  initial: { email: '', password: '' },
  submit: (values) => api.post('/auth/login', values),
})
  .onSuccess(() => redirect('/app'))
  .onFail((e) => { if (isHttpError(e)) f.setErrors(e.data?.errors ?? {}) })

const email = f.field('email')   // { value, error, touched, set, markTouched }
```

```js
// dans un template
html`
  <form @submit=${(e) => f.handleSubmit(e)}>
    <input value=${email.value}
           @input=${(e) => email.set(e.target.value)}
           @blur=${email.markTouched} />
    ${() => email.touched() && email.error()
      ? html`<span class="err">${email.error()}</span>`
      : null}

    <button ?disabled=${f.submitting}>
      ${() => f.submitting() ? 'Connexion…' : 'Se connecter'}
    </button>
  </form>
`
```

`handleSubmit()` appelle `preventDefault()`, marque tous les champs touched,
valide, et ne submit que si valide. `setErrors()` injecte des erreurs serveur par
champ (ex. depuis `HttpError.data`). `reset()` restaure `initial` et vide
erreurs/touched.

### Validation avec rune (optionnel)

La validation est **agnostique et optionnelle**. Passe une fonction `validate`
renvoyant une map `{ champ: message }`, OU n'importe quel objet avec une méthode
`.validate(values)` — un schéma [rune](/fr/guides/basics/validation/) satisfait cette forme,
donc il se branche **sans dépendance dure** (aurora n'importe jamais de
validateur) :

```js
import { rules, schema } from '@c9up/rune'

const f = form({
  initial: { email: '', password: '' },
  validate: schema({
    email: rules.string().email(),
    password: rules.string().min(8),
  }),
  submit: (values) => api.post('/auth/login', values),
})
```

Un schéma rune renvoie `{ valid, errors: [{ field, message }] }` ; le form mappe
ces erreurs sur le signal `error` de chaque champ. Sans `validate`, le form ne
reporte simplement aucune erreur de champ.

### Messages localisés avec rosetta (optionnel)

rune fait passer ses messages par [rosetta](/fr/guides/digging-deeper/i18n) via
`bindRosetta` — appelle-le une fois au boot et chaque message de validation (donc
chaque `field.error()`) est traduit dans la locale active :

```js
import { bindRosetta } from '@c9up/rune'
import { rosetta } from '../config/rosetta.js'

bindRosetta(rosetta)   // les messages rune passent par rosetta.t(key, params)
```

aurora ignore les deux — `form` ne lit que le `{ field, message }` produit par
rune, déjà localisé. Tu choisis ton validateur et ton traducteur librement.
