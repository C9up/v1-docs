# AuthLayout

La page de connexion, d'inscription et de réinitialisation du mot de passe : une marque au-dessus, une carte qui contient un titre, une description et le formulaire, et une ligne sous la carte. La carte est centrée par flex dans une colonne `min-h-svh`, pas par un positionnement absolu et une translation — un formulaire d'inscription avec une erreur sous chacun de ses quatre champs devient plus haut que la fenêtre, et une carte centrée par une transformation pousserait son haut au-dessus de la ligne de flottaison, hors de portée du défilement.

```sh
ream nebula:add auth-layout
```

Template · `templates/AuthLayout.ts` · aucune dépendance

## Utilisation

```ts
import { AuthLayout } from '@c9up/nebula'

AuthLayout({ title: 'Connexion', children: signInForm })
```

## Exemples

### Marque, description et pied

```ts
import { html } from '@c9up/aurora'
import { AuthLayout, Button, Input, Label } from '@c9up/nebula'

AuthLayout({
  brand: html`<a href="/" class="text-lg font-semibold">Acme</a>`,
  title: 'Créer un compte',
  description: 'Saisissez votre e-mail pour commencer.',
  children: html`<form method="post" action="/register" class="flex flex-col gap-4">
    <div class="grid gap-2">
      ${Label({ for: 'email', children: 'E-mail' })}
      ${Input({ id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: true })}
    </div>
    ${Button({ type: 'submit', class: 'w-full', children: 'Continuer' })}
  </form>`,
  footer: html`Déjà un compte ? <a href="/login" class="underline underline-offset-4">Se connecter</a>`,
})
```

La carte fait au plus 24rem de large (`max-w-sm`) et a déjà sa marge intérieure : le formulaire n'a pas besoin d'enveloppe à lui.

### Un point de repère pour la page

La mise en page ne rend pas de `<main>`. Sur une page dont elle est tout le contenu, enveloppez-la dans un :

```ts
html`<main>${AuthLayout({ title: 'Réinitialiser le mot de passe', children: resetForm })}</main>`
```

## API

### AuthLayout

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `title` | `Child` | — | Obligatoire. Le titre de la carte — ce que fait la page. |
| `description` | `Child` | — | Une ligne atténuée sous le titre. |
| `children` | `Slot` | — | Le formulaire. |
| `brand` | `Slot` | — | Nom ou logo du produit, au-dessus de la carte. |
| `footer` | `Slot` | — | Sous la carte — « Déjà un compte ? » et ce genre de chose. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la page ; le fond est `bg-muted/40`. |

`title` et `description` sont de simples valeurs, lues une fois : une page d'authentification dit ce qu'elle est au moment où elle s'affiche. `brand`, `footer` et `description` sont absents du balisage quand ils ne sont pas fournis.

## Accessibilité

Le titre est le `<h1>` de la page : une marque au-dessus ne doit pas être un titre à son tour — plutôt un lien, ou une image avec son `alt`. La mise en page ne gère aucune touche et ne déplace pas le focus : ce sont les champs, les libellés et les erreurs du formulaire qui portent l'accessibilité de la page.
