# Button

Un `<button>` à l'allure de la bibliothèque : six variantes, quatre tailles, un emplacement d'icône qui se dimensionne tout seul. C'est le composant de référence — tous les autres suivent la forme fixée ici.

```sh
ream nebula:add button
```

Atome · `atoms/Button.ts` · aucune dépendance

## Utilisation

```ts
import { Button } from '@c9up/nebula'

Button({ children: 'Enregistrer', onClick: () => save() })
```

## Exemples

### Variantes

```ts
Button({ children: 'Enregistrer' })                         // default
Button({ variant: 'secondary', children: 'Annuler' })
Button({ variant: 'outline', children: 'Exporter' })
Button({ variant: 'ghost', children: 'Plus' })
Button({ variant: 'destructive', children: 'Supprimer' })
Button({ variant: 'link', children: 'Lire le guide' })
```

### Tailles et icônes

Un SVG placé dans le bouton fait 16 px, sauf s'il porte sa propre classe `size-*`, et le remplissage se resserre autour.

```ts
import { html } from '@c9up/aurora'
import { ArrowRightIcon, SearchIcon } from '@c9up/nebula'

Button({ size: 'sm', children: html`Suivant ${ArrowRightIcon()}` })
Button({ size: 'lg', children: 'Continuer' })
Button({ size: 'icon', label: 'Rechercher', children: SearchIcon() })
```

`size: 'icon'` laisse le bouton sans texte visible : il lui faut un `label`, c'est ce que lit un lecteur d'écran.

### Suivre un état

Toute prop susceptible de changer prend un accesseur. Un bouton désactivé pendant une requête :

```ts
import { signal } from '@c9up/aurora'

const saving = signal(false)

Button({
  disabled: saving,
  children: () => (saving() ? 'Enregistrement…' : 'Enregistrer'),
  onClick: async () => {
    saving(true)
    try { await save() } finally { saving(false) }
  },
})
```

`disabled: saving()` lirait le signal une seule fois, à la construction, et le bouton ne serait plus jamais désactivé — voir [props réactives](/fr/nebula/composition#props-reactives).

### Un lien qui ressemble à un bouton

Il n'y a pas d'`asChild`. Posez les variantes vous-même sur l'élément :

```ts
import { html } from '@c9up/aurora'
import { buttonVariants } from '@c9up/nebula'

html`<a href="/tarifs" class="${buttonVariants({ variant: 'outline', size: 'sm' })}">Tarifs</a>`
```

### Dans un formulaire

```ts
Button({ type: 'submit', children: 'Créer le compte' })
```

`type` vaut `"button"` par défaut, jamais le `"submit"` de HTML — la cause de la plupart des envois de formulaire involontaires. Un bouton d'envoi le dit.

## API

### Button

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu : du texte, une icône, ou les deux. |
| `variant` | `Reactive<'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'>` | `'default'` | L'allure. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg' \| 'icon'>` | `'default'` | `icon` est un carré à la taille d'un glyphe. |
| `type` | `Reactive<'button' \| 'submit' \| 'reset'>` | `'button'` | Le `type` natif. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`. Indispensable en pratique avec `size: 'icon'`. |
| `id` | `string` | — | L'`id` de l'élément. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `onClick` | `(event: MouseEvent) => void` | — | Gestionnaire de clic. |

### buttonVariants

`buttonVariants({ variant?, size?, class? }): string` — la liste de classes que porterait un `Button`, pour un élément qui doit en avoir l'air sans en être un.

## Accessibilité

Un `<button>` natif : atteignable au clavier, activé par <kbd>Entrée</kbd> et <kbd>Espace</kbd>, annoncé comme bouton, retiré de l'ordre de tabulation quand il est `disabled`. L'anneau de focus est dessiné sur `:focus-visible` : il apparaît au clavier, pas au clic de souris. `aria-invalid` sur le bouton le dessine dans la couleur destructive, ce qui est la façon dont un [Field](/fr/nebula/components/field) signale un contrôle en erreur.
