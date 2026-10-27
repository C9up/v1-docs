# Composition et réactivité

Deux règles façonnent chaque appel dans nebula : les composants composés s'assemblent à partir de **parties construites dans un thunk**, et tout ce qui peut changer se passe sous forme d'**accesseur**. Les deux découlent du même fait à propos d'[Aurora](/fr/modules/aurora) : un composant exécute son setup une seule fois et ne re-rend jamais.

## Les composants composés prennent leurs parties dans un thunk

Un composant composé — `Tabs`, `Dialog`, `Select`, `DropdownMenu` — partage son état avec ses parties par le contexte d'Aurora, comme les parties de shadcn le partagent par celui de React. Les parties sont les mêmes, avec les mêmes noms et le même balisage :

```ts
import { html } from '@c9up/aurora'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@c9up/nebula'

Tabs({
  defaultValue: 'account',
  children: () => html`
    ${TabsList({ children: () => html`
      ${TabsTrigger({ value: 'account', children: 'Compte' })}
      ${TabsTrigger({ value: 'password', children: 'Mot de passe' })}
    ` })}
    ${TabsContent({ value: 'account', children: 'Votre profil.' })}
    ${TabsContent({ value: 'password', children: 'Changez votre mot de passe.' })}
  `,
})
```

Le `() =>` n'est pas décoratif. Le contexte n'atteint que ce que le fournisseur construit **pendant son propre setup**, et Aurora évalue tout de suite : un `TabsTrigger` construit comme simple valeur s'exécuterait avant que `Tabs` existe et ne trouverait rien auprès de quoi s'enregistrer. Une prop typée `Parts` est le signal — écrivez `() =>` là, et une simple valeur partout ailleurs :

```ts
Tooltip({ children: TooltipTrigger({ … }) })       // ✗ construit trop tôt
Tooltip({ children: () => TooltipTrigger({ … }) }) // ✓ le setup l'appelle
```

Le thunk est appelé **une seule fois**, pendant le setup. Ce qui change va dans un accesseur placé à l'intérieur, et les parties construites là atteignent quand même leur fournisseur — Aurora appelle l'accesseur avec les fournisseurs sous lesquels il a été écrit :

```ts
SelectContent({
  children: () => html`${() => roles().map((role) => SelectItem({ value: role.id, children: role.name }))}`,
})
```

Un rôle ajouté à `roles` apparaît dans la liste, un rôle retiré quitte la liste et le parcours au clavier, et le déclencheur affiche toujours le nom actuel du rôle choisi.

Une partie qui doit être **connue au setup** fait exception. `DialogTitle` nomme le panneau, et le panneau regarde s'il y a un titre avant de rendre ses enfants, donc un titre construit plus tard dans un accesseur le laisse sans nom :

```ts
DialogHeader({ children: html`${DialogTitle({ children: 'Modifier le profil' })}` })       // ✓ une valeur
DialogHeader({ children: () => html`${DialogTitle({ children: 'Modifier le profil' })}` }) // ✗ trop tard
```

La page de chaque composant dit lesquelles de ses props sont des `Parts`.

## Props réactives

Toute prop susceptible de changer est `Reactive<T>` — passez une constante quand elle ne bouge pas, un accesseur quand elle bouge :

```ts
Button({ disabled: true })              // statique
Button({ disabled: () => !form.valid }) // suivi
```

Un signal est un accesseur, il se passe donc tel quel : `Progress({ value: uploaded })`. Ce qui ne marche **pas**, c'est de le lire vous-même — `Button({ disabled: form.pending() })` donne au bouton un booléen qui a été vrai ou faux une fois, au setup, et plus jamais ensuite.

Le contenu suit la même règle. Des `children` typés `Slot` prennent une valeur ou un accesseur ; un texte qui change est un accesseur :

```ts
Badge({ children: () => `${unread()} non lus` })
```

Les callbacks sont la seule sorte de prop fonction qui n'est pas un accesseur : `onClick`, `onValueChange`, `onOpenChange` ont leurs propres types et sont appelés, jamais lus.

## Pas d'`asChild`

L'`asChild` de shadcn clone un élément pour y fusionner des props, et un template Aurora est du balisage compilé, sans élément à cloner. Là où shadcn écrirait un bouton enveloppant un lien, nebula exporte les variantes et vous les posez vous-même sur l'élément — ce que le Slot faisait de toute façon, avec un runtime entre les deux :

```ts
html`<a href="/docs" class="${buttonVariants({ variant: 'outline' })}">Docs</a>`
```

Chaque composant qui a une variante visuelle exporte sa fonction `…Variants` pour ça : `buttonVariants`, `badgeVariants`, `toggleVariants`, `alertVariants`…

## Points d'accroche pour le style

Les parties qu'un composant rend portent un `data-slot` qui les nomme — `data-slot="button"`, `data-slot="dialog-content"` — comme le fait shadcn v4. Le CSS de l'application et les tests peuvent viser une partie sans dépendre des classes utilitaires, qui sont justement la part que vous êtes censé modifier. Chaque composant prend aussi une `class`, fusionnée en dernier par `cn`, si bien qu'une utilitaire en conflit que vous passez l'emporte sur celle du composant.
