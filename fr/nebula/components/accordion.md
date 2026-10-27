# Accordion

Une pile de sections, chacune un en-tête qui montre ou cache le panneau placé dessous. Une seule section ouverte à la fois par défaut, plusieurs avec `type: 'multiple'`.

Choisir une section, c'est fermer les autres : l'accordéon doit donc connaître toutes ses sections à la fois. Le groupe détient l'ensemble des valeurs ouvertes et chaque élément demande s'il en fait partie — c'est ce que porte le contexte, et la raison pour laquelle les éléments sont construits dans le `() =>` de l'accordéon. Chaque élément fournit à son tour un contexte à lui, si bien que son déclencheur et son panneau partagent leurs ids sans qu'on répète la valeur sur chacun.

Le panneau s'anime par une grille CSS dont l'unique rangée passe de `0fr` à `1fr` : aucune hauteur mesurée, rien de périmé quand le contenu change pendant qu'il est fermé. Un panneau fermé reste dans le DOM pour cette transition, et il est rendu `inert` pour ne garder aucun arrêt de tabulation.

```sh
ream nebula:add accordion
```

Molécule · `molecules/Accordion.ts` · aucune dépendance

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@c9up/nebula'

Accordion({
  children: () => html`
    ${AccordionItem({ value: 'shipping', children: () => html`
      ${AccordionTrigger({ children: 'Livraison' })}
      ${AccordionContent({ children: 'De deux à quatre jours ouvrés.' })}
    ` })}
    ${AccordionItem({ value: 'returns', children: () => html`
      ${AccordionTrigger({ children: 'Retours' })}
      ${AccordionContent({ children: "Trente jours, dans l'emballage d'origine." })}
    ` })}
  `,
})
```

`Accordion` comme `AccordionItem` prennent leurs enfants en `() =>` : chacun fournit un contexte que ses pièces lisent — voir [composition](/fr/nebula/composition).

## Exemples

### Depuis des données

`faqs` est un signal. Le thunk ne s'exécute qu'une fois : la liste va donc dans un accesseur à l'intérieur, si bien qu'une question ajoutée plus tard reçoit sa section, et les éléments construits là atteignent quand même l'accordéon — voir [composition](/fr/nebula/composition).

```ts
Accordion({
  children: () => html`${() =>
    faqs().map((faq) =>
      AccordionItem({
        value: faq.id,
        children: () => html`
          ${AccordionTrigger({ children: faq.question })}
          ${AccordionContent({ children: faq.answer })}
        `,
      }),
    )}`,
})
```

`value` est la clé de la section dans l'ensemble ouvert : gardez-la stable, un id plutôt qu'une position.

### Plusieurs ouvertes à la fois

```ts
Accordion({
  type: 'multiple',
  defaultValue: ['shipping', 'returns'],
  onValueChange: (open) => rememberOpen(open),
  children: () => html`
    ${AccordionItem({ value: 'shipping', children: () => html`
      ${AccordionTrigger({ children: 'Livraison' })}
      ${AccordionContent({ children: 'De deux à quatre jours ouvrés.' })}
    ` })}
    ${AccordionItem({ value: 'returns', children: () => html`
      ${AccordionTrigger({ children: 'Retours' })}
      ${AccordionContent({ children: "Trente jours, dans l'emballage d'origine." })}
    ` })}
  `,
})
```

En mode `multiple`, chaque section s'ouvre et se ferme seule. `onValueChange` reçoit l'ensemble ouvert complet après chaque changement, dans les deux modes — `[]` quand tout est fermé.

### Une section toujours ouverte

Un accordéon simple peut normalement être entièrement refermé : un clic sur l'en-tête ouvert le ferme. `collapsible: false` garde ouverte la dernière section ouverte, pour un panneau où une section doit toujours être visible :

```ts
Accordion({
  collapsible: false,
  defaultValue: 'plan',
  children: () => html`
    ${AccordionItem({ value: 'plan', children: () => html`
      ${AccordionTrigger({ children: 'Formule' })}
      ${AccordionContent({ children: 'Pro, facturée à l’année.' })}
    ` })}
    ${AccordionItem({ value: 'billing', children: () => html`
      ${AccordionTrigger({ children: 'Facturation' })}
      ${AccordionContent({ children: 'Prochaine facture le 1er mars.' })}
    ` })}
  `,
})
```

Donnez-lui aussi un `defaultValue` : `collapsible: false` empêche seulement une section de se fermer, il n'en ouvre aucune.

### Une section désactivée

```ts
Accordion({
  children: () => html`
    ${AccordionItem({ value: 'profile', children: () => html`
      ${AccordionTrigger({ children: 'Profil' })}
      ${AccordionContent({ children: 'Nom, photo et biographie.' })}
    ` })}
    ${AccordionItem({ value: 'export', disabled: true, children: () => html`
      ${AccordionTrigger({ children: 'Export (formule Pro)' })}
      ${AccordionContent({ children: 'Exports CSV et JSON.' })}
    ` })}
  `,
})
```

L'en-tête reste visible, atténué ; il ne se clique pas et les flèches passent par-dessus.

## API

### Accordion

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Les `AccordionItem`, construits en `() =>`. |
| `type` | `'single' \| 'multiple'` | `'single'` | `'single'` ferme la section ouverte quand une autre s'ouvre. Lu une fois, à la construction. |
| `defaultValue` | `string \| readonly string[]` | — | Ouvert au premier rendu : une valeur, ou plusieurs avec `'multiple'`. Sans lui, rien n'est ouvert. |
| `collapsible` | `boolean` | `true` | En mode `'single'`, si la section ouverte peut se refermer et n'en laisser aucune ouverte. |
| `onValueChange` | `(open: readonly string[]) => void` | — | L'ensemble ouvert après chaque changement. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

L'ensemble ouvert vit dans l'accordéon : il n'y a pas de `value` contrôlée. `onValueChange` est la façon dont l'application apprend ce qui est ouvert.

### AccordionItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `value` | `string` | — | La clé stable de la section, dans l'ensemble ouvert et dans ses ids ARIA. |
| `disabled` | `boolean` | `false` | Désactive l'en-tête. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'élément. |
| `children` | `Parts` | — | `AccordionTrigger` et `AccordionContent`, construits en `() =>`. |

### AccordionTrigger

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le texte de l'en-tête. Un chevron est ajouté après lui et pivote quand la section s'ouvre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du bouton. |

### AccordionContent

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du panneau. |
| `class` | `Reactive<string>` | — | Fusionnée dans la boîte intérieure qui tient le contenu (`pt-0 pb-4`), pas dans l'enveloppe animée. |

## Accessibilité

Chaque en-tête est un `<button>` dans un `<h3>`, avec `aria-expanded` et `aria-controls` qui pointe vers son panneau ; le panneau est `role="region"`, avec `aria-labelledby` qui pointe en retour vers l'en-tête. Un panneau fermé est `inert` : hors de l'ordre de tabulation et de l'arbre d'accessibilité, tout en restant dans le DOM. La transition est supprimée sous `prefers-reduced-motion`. `data-state="open"` ou `"closed"` est posé sur l'élément, l'en-tête et le panneau, pour le style.

Les en-têtes forment un seul arrêt de tabulation, et les flèches circulent entre eux :

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Entre dans les en-têtes sur le dernier atteint aux flèches — le premier, au départ — puis en sort. |
| <kbd>ArrowDown</kbd> | En-tête suivant, en revenant du dernier au premier. |
| <kbd>ArrowUp</kbd> | En-tête précédent, en revenant du premier au dernier. |
| <kbd>Home</kbd> | Premier en-tête. |
| <kbd>End</kbd> | Dernier en-tête. |

Les en-têtes désactivés sont sautés.
