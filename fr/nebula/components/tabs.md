# Tabs

Plusieurs panneaux au même endroit, un seul affiché à la fois, choisi dans une rangée d'onglets.

Un déclencheur et son panneau se trouvent par la `value` qu'ils partagent : les ids sont créés une fois par valeur par le contexte, si bien qu'aucune des deux pièces n'a à connaître l'autre et qu'elles peuvent être construites dans n'importe quel ordre. La sélection suit le focus — atteindre un onglet aux flèches affiche son panneau — ce qui est le bon défaut quand les panneaux sont déjà rendus et que passer de l'un à l'autre ne coûte rien ; `activateOnFocus: false` existe pour les panneaux qui chargent à l'affichage, où passer trois onglets aux flèches lancerait trois requêtes.

Les panneaux cachés restent montés : un formulaire à moitié rempli ou une position de défilement à l'intérieur survit à un passage par un autre onglet. Ils portent `hidden`, qui les sort de la mise en page et de l'arbre d'accessibilité sans les retirer du DOM.

```sh
ream nebula:add tabs
```

Molécule · `molecules/Tabs.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@c9up/nebula'

Tabs({
  defaultValue: 'account',
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'account', children: 'Compte' })}
      ${TabsTrigger({ value: 'password', children: 'Mot de passe' })}
    ` })}
    ${TabsContent({ value: 'account', children: 'Votre profil.' })}
    ${TabsContent({ value: 'password', children: 'Changez votre mot de passe.' })}
  `,
})
```

`Tabs` prend ses enfants en `() =>`, parce que ses pièces lisent son contexte — voir [composition](/fr/nebula/composition). `TabsList` ne fournit rien : ses enfants peuvent être une simple valeur, ils sont de toute façon construits dans le thunk de `Tabs`.

## Exemples

### Depuis des données

`sections` est un signal : les déclencheurs et les panneaux sont donc construits chacun dans un accesseur. Le thunk de `Tabs` ne s'exécute qu'une fois, et une liste lue directement dedans ne changerait plus jamais.

```ts
Tabs({
  children: () => html`
    ${TabsList({
      children: () =>
        sections().map((section) =>
          TabsTrigger({ value: section.id, children: section.title, disabled: section.locked }),
        ),
    })}
    ${() => sections().map((section) => TabsContent({ value: section.id, children: section.body }))}
  `,
})
```

Sans `defaultValue`, c'est le premier déclencheur **actif** construit qui est sélectionné : un onglet désactivé sélectionné par défaut afficherait un panneau vers lequel rien ne permet de revenir.

### Contrôlé

Passez `value` et c'est l'application qui détient la sélection. Un signal peut être à la fois la valeur et le gestionnaire de changement, et alors n'importe quoi dans la page peut changer d'onglet :

```ts
import { signal } from '@c9up/aurora'
import { Button } from '@c9up/nebula'

const tab = signal('overview')

Tabs({
  value: tab,
  onValueChange: tab,
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'overview', children: 'Aperçu' })}
      ${TabsTrigger({ value: 'activity', children: 'Activité' })}
    ` })}
    ${TabsContent({ value: 'overview', children: 'Douze tickets ouverts.' })}
    ${TabsContent({ value: 'activity', children: "Trois commits aujourd'hui." })}
  `,
})

Button({ variant: 'link', children: "Voir l'activité", onClick: () => tab('activity') })
```

`value` l'emporte dès qu'il vaut une chaîne. `onValueChange` n'est appelé que si la sélection change vraiment — cliquer l'onglet déjà sélectionné ne dit rien.

### Onglets soulignés

`variant: 'line'` sur la liste remplace la surface pleine par un trait sous l'onglet actif :

```ts
Tabs({
  defaultValue: 'code',
  children: () => html`
    ${TabsList({ variant: 'line', children: html`
      ${TabsTrigger({ value: 'code', children: 'Code' })}
      ${TabsTrigger({ value: 'issues', children: 'Tickets' })}
    ` })}
    ${TabsContent({ value: 'code', children: 'src/, tests/, README.md' })}
    ${TabsContent({ value: 'issues', children: 'Aucun ticket ouvert.' })}
  `,
})
```

### Vertical

```ts
Tabs({
  orientation: 'vertical',
  defaultValue: 'general',
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'general', children: 'Général' })}
      ${TabsTrigger({ value: 'members', children: 'Membres' })}
      ${TabsTrigger({ value: 'danger', children: 'Zone dangereuse' })}
    ` })}
    ${TabsContent({ value: 'general', children: 'Nom et avatar.' })}
    ${TabsContent({ value: 'members', children: 'Quatre membres.' })}
    ${TabsContent({ value: 'danger', children: 'Supprimer le projet.' })}
  `,
})
```

La liste s'empile à côté des panneaux, et les flèches qui passent d'un onglet à l'autre deviennent <kbd>ArrowUp</kbd> et <kbd>ArrowDown</kbd>.

### Des panneaux qui chargent à l'affichage

```ts
Tabs({
  activateOnFocus: false,
  defaultValue: 'sales',
  children: () => html`
    ${TabsList({ children: html`
      ${TabsTrigger({ value: 'sales', children: 'Ventes' })}
      ${TabsTrigger({ value: 'refunds', children: 'Remboursements' })}
    ` })}
    ${TabsContent({ value: 'sales', children: ReportPanel({ kind: 'sales' }) })}
    ${TabsContent({ value: 'refunds', children: ReportPanel({ kind: 'refunds' }) })}
  `,
})
```

Les flèches ne font plus que déplacer le focus ; <kbd>Entrée</kbd>, <kbd>Espace</kbd> ou un clic sélectionne. `ReportPanel` tient lieu de votre propre composant.

## API

### Tabs

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `defaultValue` | `string` | le premier déclencheur actif | Sélectionné au premier rendu quand il n'est pas contrôlé. |
| `value` | `Reactive<string \| undefined>` | — | Sélection contrôlée. Quand elle vaut une chaîne, elle l'emporte sur l'état interne. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Le sens de la liste, et les flèches qui passent d'un onglet à l'autre. Lu une fois, à la construction. |
| `activateOnFocus` | `boolean` | `true` | La sélection suit le focus. `false` attend <kbd>Entrée</kbd>, <kbd>Espace</kbd> ou un clic. |
| `onValueChange` | `(value: string) => void` | — | Appelé quand la sélection change. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |
| `children` | `Parts` | — | La liste et les panneaux, construits en `() =>`. |

### TabsList

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `'default' \| 'line'` | `'default'` | `default` donne une surface à l'onglet actif ; `line` le souligne. Lu une fois, à la construction. |
| `children` | `Slot` | — | Les `TabsTrigger`. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier dans les classes de la liste. |

### TabsTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | Le panneau qu'il affiche. |
| `children` | `Slot` | — | Le libellé de l'onglet. Un SVG placé dedans fait 16 px. |
| `disabled` | `boolean` | `false` | Désactive l'onglet ; les flèches le sautent. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du bouton. |

### TabsContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | L'onglet qui l'affiche. |
| `children` | `Slot` | — | Le contenu du panneau. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. |

### tabsListVariants

`tabsListVariants({ variant?, class? }): string` — les classes que porte un `TabsList`, pour une liste que vous rendez vous-même.

## Accessibilité

Le motif d'onglets WAI-ARIA : la liste est `role="tablist"` avec `aria-orientation` ; chaque déclencheur est `role="tab"` avec `aria-selected` et `aria-controls` qui pointe vers son panneau ; chaque panneau est `role="tabpanel"` avec `aria-labelledby` qui pointe en retour vers son onglet, et `tabindex="0"` pour que <kbd>Tab</kbd> depuis la liste atteigne le panneau même s'il ne contient rien de focalisable. `data-state="active"` ou `"inactive"` est posé sur chaque onglet pour le style.

La liste est un seul arrêt de tabulation :

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Entre dans la liste sur l'onglet atteint en dernier aux flèches — au départ le premier actif, même si un autre est sélectionné — puis passe au panneau. |
| <kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd> | Onglet suivant / précédent, à l'horizontale. Inversé dans une page de droite à gauche. Le sélectionne, sauf avec `activateOnFocus: false`. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Onglet suivant / précédent, à la verticale. Le sélectionne, sauf avec `activateOnFocus: false`. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Premier / dernier onglet. Le sélectionne, sauf avec `activateOnFocus: false`. |
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Sélectionne l'onglet qui a le focus. |

Les flèches reviennent du dernier onglet au premier et inversement, et sautent les onglets désactivés. Le sens est lu dans le style calculé de la page — voir [de droite à gauche](/fr/nebula/languages#de-droite-a-gauche).
