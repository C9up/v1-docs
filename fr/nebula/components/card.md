# Card

Une surface bordée qui contient une unité de contenu : un en-tête avec un titre et une description, le contenu, un pied. Sept parties, toutes de présentation — chacune est un `<div>` avec un `data-slot` et une liste de classes, sans état ni contexte — si bien qu'elles s'imbriquent comme de simples valeurs, sans `() =>`.

`CardAction` est la partie à connaître. Placée dans un `CardHeader`, elle se range dans la seconde colonne de l'en-tête, face au titre et alignée sur son haut, sans conteneur flex ni espaceur : l'en-tête ne passe à deux colonnes que lorsqu'il contient une action.

```sh
ream nebula:add card
```

Molécule · `molecules/Card.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@c9up/nebula'

Card({
  children: html`
    ${CardHeader({ children: html`
      ${CardTitle({ children: 'Stockage' })}
      ${CardDescription({ children: '12 Go utilisés sur 50 Go' })}
    ` })}
    ${CardContent({ children: 'Vos fichiers sont synchronisés sur 3 appareils.' })}
  `,
})
```

## Exemples

### Une action et un pied

```ts
import { Button, CardAction, CardFooter } from '@c9up/nebula'

Card({
  class: 'w-full max-w-sm',
  children: html`
    ${CardHeader({ children: html`
      ${CardTitle({ children: 'Déployer le projet' })}
      ${CardDescription({ children: 'Envoyer la branche principale en production.' })}
      ${CardAction({ children: Button({ variant: 'link', children: 'Historique' }) })}
    ` })}
    ${CardContent({ children: deployForm })}
    ${CardFooter({ class: 'justify-end gap-2', children: html`
      ${Button({ variant: 'outline', children: 'Annuler' })}
      ${Button({ children: 'Déployer', onClick: () => deploy() })}
    ` })}
  `,
})
```

L'action couvre les deux rangées de l'en-tête : une longue description passe à la ligne sous le titre sans glisser sous le bouton.

### En-tête et pied soulignés

Un en-tête qui reçoit `border-b` ajoute son propre espace sous le filet, un pied qui reçoit `border-t` au-dessus — sans avoir à défaire l'espacement de la carte :

```ts
Card({
  children: html`
    ${CardHeader({ class: 'border-b', children: CardTitle({ children: "Membres de l'équipe" }) })}
    ${CardContent({ children: memberList })}
    ${CardFooter({ class: 'border-t', children: Button({ variant: 'outline', children: 'Inviter' }) })}
  `,
})
```

### Suivre un état

Le `children` de chaque partie est un `Slot` : un texte qui change est un accesseur.

```ts
CardDescription({ children: () => `${used()} Go utilisés sur ${quota()} Go` })
```

## API

Toutes les parties prennent les mêmes props, exportées sous le nom `CardProps`.

### Card

La surface : bordure, coins arrondis, ombre légère, et 24 px d'écart entre ses parties.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | L'en-tête, le contenu et le pied. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `id` | `string` | — | L'`id` de l'élément. |

### CardHeader

Une grille de titre et de description, avec une seconde colonne quand il contient un `CardAction`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | `CardTitle`, `CardDescription`, et un `CardAction` facultatif. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. `border-b` ajoute l'espace sous le filet. |
| `id` | `string` | — | L'`id` de l'élément. |

### CardTitle

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le titre, en demi-gras. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### CardDescription

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une ligne sous le titre, petite et atténuée. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### CardAction

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Un bouton, un lien ou un déclencheur de menu, placé face au titre. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### CardContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le corps, avec la marge latérale de la carte. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. |
| `id` | `string` | — | L'`id` de l'élément. |

### CardFooter

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Une rangée d'actions, centrées verticalement. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier. `border-t` ajoute l'espace au-dessus du filet. |
| `id` | `string` | — | L'`id` de l'élément. |

## Accessibilité

Une carte est un ensemble de `<div>` sans rôle, et elle ne gère aucune touche. `CardTitle` n'est pas un titre de section : quand le plan de la page en demande un, placez-le dedans — ``CardTitle({ children: html`<h2>Stockage</h2>` })`` — au niveau qu'exige la page. Un `id` sur le titre et un `aria-labelledby` sur une `<section>` englobante font de la carte une région nommée quand c'est utile.
