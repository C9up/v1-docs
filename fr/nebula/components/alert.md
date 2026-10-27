# Alert

Un message en ligne sur le contenu qui l'entoure — un avis au-dessus d'un formulaire, un avertissement en haut d'une page de réglages, une erreur là où quelque chose a échoué. Il reste dans la page, contrairement à une [notification](/fr/nebula/components/toaster).

Seule la variante destructive est une région live. `role="alert"` interrompt un lecteur d'écran à l'instant où l'élément apparaît : juste pour une erreur, faux pour la variante informative, qui couvrirait ce que l'utilisateur lisait pour annoncer une chose qu'il n'a pas demandée. La variante par défaut est une `note`. La mise en page est une grille, ce qui permet à une icône de tête facultative de s'aligner sur le titre pendant que la description passe à la ligne sous les deux, sans qu'aucune partie ait à savoir si l'autre est là.

```sh
ream nebula:add alert
```

Molécule · `molecules/Alert.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Alert, AlertDescription, AlertTitle } from '@c9up/nebula'

Alert({
  children: html`
    ${AlertTitle({ children: 'À noter' })}
    ${AlertDescription({ children: 'Les factures partent désormais le premier du mois.' })}
  `,
})
```

## Exemples

### Avec une icône

Un `<svg>` placé directement dans l'alerte occupe la première colonne, à 16 px et dans la couleur du texte ; le titre et la description passent dans la seconde.

```ts
import { html } from '@c9up/aurora'
import { Alert, AlertDescription, AlertTitle, CheckIcon } from '@c9up/nebula'

Alert({
  children: html`
    ${CheckIcon()}
    ${AlertTitle({ children: 'Domaine vérifié' })}
    ${AlertDescription({ children: 'Les e-mails de example.com sont désormais signés.' })}
  `,
})
```

### Destructive

```ts
Alert({
  variant: 'destructive',
  children: html`
    ${AlertTitle({ children: 'Paiement refusé' })}
    ${AlertDescription({ children: html`<p>Votre carte a été refusée.</p><p>Mettez-la à jour pour garder votre forfait.</p>` })}
  `,
})
```

La description est elle-même une grille : plusieurs paragraphes s'empilent avec un petit écart et un interlignage aéré.

### Affichée sous condition

Une alerte qui apparaît en réponse à quelque chose est construite au moment où elle apparaît — c'est ce qu'une région live annonce :

```ts
import { html, signal } from '@c9up/aurora'

const error = signal<string | null>(null)

html`${() =>
  error() === null
    ? null
    : Alert({
        variant: 'destructive',
        children: html`
          ${AlertTitle({ children: "Impossible d'enregistrer" })}
          ${AlertDescription({ children: error() })}
        `,
      })}`
```

## API

### Alert

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | L'icône, `AlertTitle` et `AlertDescription`. |
| `variant` | `Reactive<'default' \| 'destructive'>` | `'default'` | L'allure, et le rôle : `destructive` est `alert`, `default` est `note`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |

### AlertTitle, AlertDescription

Le titre (graisse moyenne, une ligne) et la description (atténuée, sur plusieurs lignes). Chacun est un `<div>` avec son `data-slot`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### alertVariants

`alertVariants({ variant?, class? }): string` — la liste de classes que porte une `Alert`.

## Accessibilité

`variant: 'destructive'` donne `role="alert"`, une région live assertive : son contenu est annoncé dès que l'alerte est insérée. La variante par défaut est `role="note"`, lue sur place et jamais annoncée d'elle-même. Le rôle suit `variant` : une alerte passée en `destructive` alors qu'elle est déjà à l'écran change de rôle, mais la plupart des lecteurs d'écran n'annoncent une alerte qu'à son insertion — construisez-la au moment où l'erreur survient, comme ci-dessus. Une alerte ne contient aucun contrôle propre et ne gère aucune touche.
