# Questions

Ce guide couvre les questions posées par une commande.

## Poser des questions

`this.prompt` couvre toute la surface de prompt :

```ts
await this.prompt.ask('Nom du modèle', { default: 'User' })
await this.prompt.secure('Mot de passe', {
  // saisie masquée — une astérisque par caractère tapé
  validate: (value) => (value.length < 6 ? 'Au moins 6 caractères' : true),
})
await this.prompt.confirm('Continuer ?')
await this.prompt.toggle('Tout supprimer ?', ['Oui', 'Non'])
await this.prompt.choice('Base de données', [
  { name: 'pg', message: 'PostgreSQL' },
  { name: 'sqlite', message: 'SQLite' },
])
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'])
await this.prompt.autocomplete('Votre ville', villes, { limit: 10 })
```

Options communes : `default`, `name`, `hint`, `validate` (retourne `true` ou le
message d'erreur), `result` (transforme la valeur retournée), et `format`.

`format` **ne change pas la valeur retournée** : il ne concerne
que l'affichage. Utilisez `result` pour transformer. (Le formatage à la frappe
demande le mode raw ; ici `format` ne s'applique donc qu'au défaut affiché.)

Pour `choice`, `multiple` et `autocomplete`, `default` est un **index** (ou une
liste d'index) — une saisie vide sélectionne cette option, et
le libellé affiche son nom.

`multiple()` reçoit la **sélection entière** dans `validate` et `result`, pas
chaque élément : la valeur du prompt *est* le tableau, et une règle du type
« au moins deux » serait sinon inexprimable.

```ts
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'], {
  validate: (values) => (values.length >= 2 ? true : 'Choisissez-en au moins deux'),
  result: (values) => values.join('+'),
})
```

`result` s'applique aussi à `confirm` et `toggle` : le type de retour suit ce
que la fonction renvoie.

Sur une entrée non interactive — CI — un prompt **échoue immédiatement** au lieu
d'attendre une frappe qui ne viendra pas.

### Tester une commande interactive

Fournissez le prompt au noyau et scriptez les réponses. Sans ça, une commande
qui pose une question n'est pas testable : elle attendrait un terminal absent.

```ts
const prompt = new Prompt()
prompt.trap('thing-name').replyWith('Widget')
prompt.trap('overwrite').accept()

const kernel = new Kernel({ prompt }).register(MakeThing)
const command = await kernel.exec('make:thing')

command.exitCode // 0
```

`trap(name)` cible `options.name`, ou le message si vous n'en donnez pas.
`replyWith`, `accept`, `reject`, `chooseOption(index)`, `chooseOptions([...])`.

Une réponse scriptée passe par la **même validation** qu'une réponse tapée. Si
elle échoue, le prompt lève : il n'y a personne à qui redemander, et un test qui
injecte une valeur que le vrai prompt refuserait donne une confiance imméritée.

Les prompts de sélection se naviguent : **↑ ↓** déplacent le pointeur,
**espace** coche sur un `multiple`, **entrée** valide, **échap** ou **Ctrl-C**
annulent. Une longue liste garde une fenêtre autour du curseur, et le pointeur
boucle aux deux bouts. `autocomplete` filtre au fil de la frappe.

Un défaut est un **index** : le pointeur y démarre sur un `choice`, et ces
lignes sont déjà cochées sur un `multiple` — entrée tout de suite le prend.

Annuler n'est pas une réponse vide : ça lève `E_CONSOLE_PROMPT_CANCELLED` au
lieu de ne rien retourner en laissant la commande continuer.
