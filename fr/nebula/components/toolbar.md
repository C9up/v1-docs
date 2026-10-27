# Toolbar

Une rangée de contrôles qui se comporte comme un seul arrêt de tabulation. Un `<div class="flex gap-2">` rempli de boutons a la même allure et n'est pas navigable : onze boutons dans une barre de mise en forme, ce sont onze pressions de <kbd>Tab</kbd> pour la passer, et un utilisateur au clavier qui vise le contenu dessous les paie toutes. Une barre d'outils est un seul arrêt, et les flèches circulent à l'intérieur.

Les éléments sont ce que vous y mettez — [Button](/fr/nebula/components/button), [Toggle](/fr/nebula/components/toggle), un déclencheur de `Select`, un simple `<a href>` — trouvés par le même sélecteur d'éléments tabulables que celui du piège à focus. Aucun attribut marqueur à retenir : un contrôle qu'un clavier atteindrait de lui-même est un contrôle que les flèches atteignent ici.

```sh
ream nebula:add toolbar
```

Molécule · `molecules/Toolbar.ts` · [button](/fr/nebula/components/button), [separator](/fr/nebula/components/separator)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import { Toolbar, ToolbarButton, ToolbarSeparator } from '@c9up/nebula'

Toolbar({
  label: 'Mise en forme',
  children: html`
    ${ToolbarButton({ children: 'Gras', onClick: () => format('bold') })}
    ${ToolbarButton({ children: 'Italique', onClick: () => format('italic') })}
    ${ToolbarSeparator({})}
    ${ToolbarButton({ children: 'Lien', onClick: () => format('link') })}
  `,
})
```

`Toolbar` ne fournit aucun contexte : ses enfants sont une simple valeur. `ToolbarButton` est un `Button` qui vaut `ghost` et `sm` par défaut, pour qu'une rangée d'entre eux se lise comme une barre plutôt que comme plusieurs actions principales qui se disputent l'attention.

## Exemples

### N'importe quel contrôle

```ts
import { signal } from '@c9up/aurora'
import { Button, Toggle } from '@c9up/nebula'

const bold = signal(false)

Toolbar({
  label: 'Éditeur',
  children: html`
    ${ToolbarButton({ children: 'Annuler', disabled: () => !canUndo(), onClick: () => undo() })}
    ${ToolbarButton({ children: 'Rétablir', onClick: () => redo() })}
    ${ToolbarSeparator({})}
    ${Toggle({ pressed: bold, onPressedChange: bold, size: 'sm', label: 'Gras', children: 'G' })}
    ${Button({ size: 'sm', children: 'Publier' })}
  `,
})
```

Le toggle et le bouton simple sont atteints aux flèches comme les boutons de la barre. Les éléments sont cherchés à chaque pression de touche, pas enregistrés une fois pour toutes : les flèches atteignent aussi un contrôle qui apparaît, ou devient actif, après le montage de la barre. Les arrêts de tabulation ne sont posés qu'au montage, en revanche : un tel contrôle garde aussi son propre arrêt de <kbd>Tab</kbd>.

### Verticale, sans boucler

```ts
Toolbar({
  label: 'Outils',
  orientation: 'vertical',
  loop: false,
  children: html`
    ${ToolbarButton({ children: 'Sélectionner' })}
    ${ToolbarButton({ children: 'Dessiner' })}
    ${ToolbarButton({ children: 'Effacer' })}
  `,
})
```

Une barre verticale empile ses contrôles et se parcourt avec <kbd>ArrowUp</kbd> et <kbd>ArrowDown</kbd>. `loop: false` s'arrête aux extrémités au lieu de revenir au début.

### Deux barres dans une page

C'est `label` qui les distingue. Un lecteur d'écran annonce « barre d'outils Mise en forme » et « barre d'outils Outils » ; sans nom, les deux ne sont que « barre d'outils ».

## API

### Toolbar

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les contrôles, et des séparateurs entre leurs groupes. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Les flèches qui déplacent le focus, et le sens de la rangée. Lu une fois, à la construction. |
| `loop` | `boolean` | `true` | Revient du dernier contrôle au premier, et inversement. |
| `label` | `Reactive<string>` | — | Le nom annoncé (`aria-label`). |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la barre. |

### ToolbarButton

Un [Button](/fr/nebula/components/button) aux défauts d'une barre d'outils ; il accepte toutes les props de `Button`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu : du texte, une icône, ou les deux. |
| `variant` | `Reactive<'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'>` | `'ghost'` | L'allure. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg' \| 'icon'>` | `'sm'` | `icon` est un carré à la taille d'un glyphe. |
| `type` | `Reactive<'button' \| 'submit' \| 'reset'>` | `'button'` | Le `type` natif. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`. Indispensable en pratique pour une icône seule. |
| `id` | `string` | — | L'`id` de l'élément. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `onClick` | `(event: MouseEvent) => void` | — | Gestionnaire de clic. |

### ToolbarSeparator

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du séparateur (`mx-1 h-6`). |

Un filet vertical de 24 px entre deux groupes de contrôles.

## Accessibilité

La barre est `role="toolbar"` avec `aria-orientation` et le `label` pour `aria-label`. `ToolbarSeparator` est un vrai `role="separator"` avec `aria-orientation="vertical"` : un lecteur d'écran entend où finit un groupe de contrôles — contrairement à un [Separator](/fr/nebula/components/separator) décoratif, qui reste muet.

La barre est un seul arrêt de tabulation, et les flèches circulent à l'intérieur :

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | Entre dans la barre sur le contrôle atteint en dernier aux flèches — le premier, au départ — puis en sort. |
| <kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd> | Contrôle suivant / précédent, à l'horizontale. Inversé dans une page de droite à gauche. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Contrôle suivant / précédent, à la verticale. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Premier / dernier contrôle. |

Les flèches reviennent au début aux extrémités, sauf avec `loop: false`. Une touche pressée avec <kbd>Alt</kbd>, <kbd>Ctrl</kbd> ou <kbd>Meta</kbd> est laissée au navigateur. Le sens est lu dans le style calculé de la page — voir [de droite à gauche](/fr/nebula/languages#de-droite-a-gauche).
