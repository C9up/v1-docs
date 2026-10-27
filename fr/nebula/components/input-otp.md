# InputOTP

Un code à usage unique saisi un caractère par case. Ce que les utilisateurs attendent de ce contrôle tient tout entier dans les cas limites, et chacun est une règle à part : taper passe à la case suivante, et la dernière reste en place au lieu de revenir au début ; <kbd>Retour arrière</kbd> dans une case vide efface la précédente et y revient, ce qui fait qu'en le maintenant on efface tout le code ; coller remplit toutes les cases à partir de celle où l'on colle, si bien que copier le code d'un e-mail et le coller dans la première case fonctionne sans plus.

Chaque case est un vrai `<input>`, pas un seul champ aux cellules dessinées : c'est ce qui donne à chacune son propre curseur, et à la première `autocomplete="one-time-code"`, l'indice qui fait proposer au téléphone le code reçu par SMS — sans lui, l'utilisateur quitte l'application pour aller le lire. Toutes les cases sont `inputmode="numeric"` pour le pavé numérique. Le code assemblé est recopié dans un seul champ caché : le contrôle s'envoie comme un champ, pas comme six.

```sh
ream nebula:add input-otp
```

Molécule · `molecules/InputOTP.ts` · aucune dépendance

## Utilisation

```ts
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@c9up/nebula'

InputOTP({
  length: 6,
  name: 'code',
  onComplete: (code) => verify(code),
  children: () => InputOTPGroup({ children: Array.from({ length: 6 }, () => InputOTPSlot({})) }),
})
```

`InputOTP` prend ses enfants en `() =>` : chaque case réclame sa position au contexte du champ au moment où elle est construite — voir [composition](/fr/nebula/composition). Les cases ne prennent pas d'index, elles ne peuvent donc pas être mal numérotées ; `length` doit correspondre au nombre de cases construites.

## Exemples

### Deux groupes

```ts
import { html } from '@c9up/aurora'
import { InputOTPSeparator } from '@c9up/nebula'

InputOTP({
  length: 6,
  name: 'code',
  children: () => html`
    ${InputOTPGroup({ children: html`${InputOTPSlot({})}${InputOTPSlot({})}${InputOTPSlot({})}` })}
    ${InputOTPSeparator({})}
    ${InputOTPGroup({ children: html`${InputOTPSlot({})}${InputOTPSlot({})}${InputOTPSlot({})}` })}
  `,
})
```

Un groupe est une suite de cases sans écart entre elles ; le séparateur trace un tiret entre deux suites. Les positions continuent d'un groupe à l'autre : la quatrième case construite est le quatrième caractère.

### Vérifier avec un bouton

`onValueChange` donne le code assemblé après chaque changement, partiel ou non. Un signal peut le recevoir directement :

```ts
import { signal } from '@c9up/aurora'
import { Button } from '@c9up/nebula'

const code = signal('')
const checking = signal(false)

InputOTP({
  length: 4,
  disabled: checking,
  onValueChange: code,
  children: () => InputOTPGroup({ children: Array.from({ length: 4 }, () => InputOTPSlot({})) }),
})

Button({
  disabled: () => code().length < 4 || checking(),
  children: 'Vérifier',
  onClick: async () => {
    checking(true)
    try { await verify(code()) } finally { checking(false) }
  },
})
```

`onComplete` se déclenche chaque fois qu'un changement laisse toutes les cases remplies — à nouveau si l'utilisateur corrige un caractère une fois le code complet.

### Dans un formulaire

Avec `name`, le champ caché envoie le code assemblé sous ce nom. Les cases elles-mêmes n'ont pas de `name` : un envoi de formulaire classique reçoit `code=482913` et rien d'autre.

### Libellés dans une autre langue

Chaque case est nommée d'après sa position — « Character 2 of 6 » par défaut. `slotLabel` le remplace :

```ts
InputOTP({
  length: 6,
  slotLabel: (position, length) => `Chiffre ${position} sur ${length}`,
  children: () => InputOTPGroup({ children: Array.from({ length: 6 }, () => InputOTPSlot({})) }),
})
```

## API

### InputOTP

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `length` | `number` | `6` | Le nombre de cases. Doit correspondre aux cases construites. |
| `slotLabel` | `(position: number, length: number) => string` | `` `Character ${position} of ${length}` `` | Le nom accessible de chaque case, d'après sa position comptée depuis 1. |
| `name` | `string` | — | Le `name` du champ caché : le code s'envoie comme un seul champ. |
| `disabled` | `Reactive<boolean>` | `false` | Désactive toutes les cases. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |
| `onValueChange` | `(value: string) => void` | — | Le code assemblé après chaque changement. |
| `onComplete` | `(value: string) => void` | — | Déclenché quand un changement laisse toutes les cases remplies. |
| `children` | `Parts` | — | Les groupes, cases et séparateurs, construits en `() =>`. |

Les caractères vivent dans le champ : il n'y a pas de `value` contrôlée.

### InputOTPGroup

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les `InputOTPSlot` de la suite. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du groupe. |

### InputOTPSlot

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la case. |

Une case. Elle réclame la position suivante au moment où elle est construite.

### InputOTPSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du séparateur. |

## Accessibilité

Chaque case est un `<input>` texte nommé par `slotLabel` — « Character 1 of 6 », « Character 2 of 6 » — pour qu'un lecteur d'écran dise où l'utilisateur en est dans le code. Seule la première case propose le remplissage `one-time-code` ; les autres sont `autocomplete="off"`. Le séparateur est `aria-hidden` : le tiret est décoratif, ce sont les cases qui portent les libellés. Les libellés intégrés sont en anglais ; remplacez-les par `slotLabel` — voir [langues](/fr/nebula/languages).

| Touche | Action |
|---|---|
| Un caractère | Remplit la case et passe à la suivante — sauf dans la dernière. Une case atteinte en tapant, par <kbd>Retour arrière</kbd> ou aux flèches a son caractère sélectionné : taper le remplace. |
| <kbd>Retour arrière</kbd> | Vide la case ; dans une case vide, vide la précédente et y revient. |
| <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Case précédente / suivante, en s'arrêtant aux extrémités. |
| Coller | Remplit les cases à partir de celle-ci, et passe à la case qui suit le dernier caractère collé — ou à la dernière case. |

Les cases acceptent n'importe quel caractère : `inputmode="numeric"` demande le pavé numérique, il ne filtre pas. Un `482 913` collé met l'espace dans une case.
