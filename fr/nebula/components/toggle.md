# Toggle

Un bouton qui reste enfoncé : gras, sourdine, un filtre activé. Il est annoncé comme un bouton bascule avec `aria-pressed`, pas comme une case à cocher, parce que son effet s'applique tout de suite — ce n'est pas une valeur recueillie pour un formulaire. Un lecteur d'écran dit « bouton bascule, enfoncé », ce que l'utilisateur a besoin d'entendre.

Un toggle ne détient aucun état à lui. `pressed` dit comment il est dessiné et `onPressedChange` demande l'inverse ; rien ne change tant que l'application n'a pas réécrit la nouvelle valeur. Un signal fait les deux, et c'est la façon habituelle d'en brancher un.

```sh
ream nebula:add toggle
```

Atome · `atoms/Toggle.ts` · aucune dépendance

## Utilisation

```ts
import { signal } from '@c9up/aurora'
import { Toggle } from '@c9up/nebula'

const bold = signal(false)

Toggle({ pressed: bold, onPressedChange: bold, label: 'Gras', children: 'G' })
```

Sans `pressed`, le toggle n'apparaît jamais enfoncé, quoi qu'on clique : il dessine ce qu'on lui donne.

## Exemples

### Variantes et tailles

```ts
const italic = signal(false)

Toggle({ variant: 'outline', pressed: italic, onPressedChange: italic, label: 'Italique', children: 'I' })
Toggle({ size: 'sm', pressed: italic, onPressedChange: italic, label: 'Italique', children: 'I' })
Toggle({ size: 'lg', pressed: italic, onPressedChange: italic, label: 'Italique', children: 'I' })
```

`default` est transparent tant qu'il n'est pas enfoncé ; `outline` ajoute une bordure. Enfoncés, les deux prennent la couleur d'accent.

### Avec une icône et du texte

Un SVG placé dedans fait 16 px, sauf s'il porte sa propre classe `size-*`. Avec un texte visible, pas besoin de `label` :

```ts
import { html } from '@c9up/aurora'
import { CheckIcon } from '@c9up/nebula'

const done = signal(false)

Toggle({
  variant: 'outline',
  pressed: done,
  onPressedChange: done,
  children: html`${CheckIcon()} Fait`,
})
```

### Agir au changement

`onPressedChange` est l'endroit où va l'effet. Réécrivez la valeur, puis agissez — et laissez le libellé et le contenu suivre le même signal :

```ts
const muted = signal(false)

Toggle({
  pressed: muted,
  label: () => (muted() ? 'Réactiver le son' : 'Couper le son'),
  children: () => (muted() ? 'Son coupé' : 'Son actif'),
  onPressedChange: (on) => {
    muted(on)
    savePreference('muted', on)
  },
})
```

Plusieurs toggles qui forment un seul contrôle ont leur place dans un [ToggleGroup](/fr/nebula/components/toggle-group).

## API

### Toggle

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu : du texte, une icône, ou les deux. |
| `pressed` | `Reactive<boolean>` | `false` | S'il est dessiné et annoncé comme enfoncé. |
| `variant` | `Reactive<'default' \| 'outline'>` | `'default'` | L'allure. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg'>` | `'default'` | 36, 32 ou 40 px de haut. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`. Indispensable en pratique quand le contenu est une icône ou une seule lettre. |
| `value` | `string` | — | Écrit dans `data-value`, pour que le CSS hôte ou les tests retrouvent le toggle. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier : une utilitaire en conflit l'emporte. |
| `onPressedChange` | `(pressed: boolean) => void` | — | Appelé au clic avec l'inverse du `pressed` courant. |

### toggleVariants

`toggleVariants({ variant?, size?, class? }): string` — les classes d'un toggle. [ToggleGroup](/fr/nebula/components/toggle-group) en construit ses éléments, si bien qu'un toggle groupé et un toggle seul ne peuvent pas diverger. Les couleurs d'état enfoncé se règlent sur `aria-pressed` : un élément qui reçoit ces classes a besoin de cet attribut aussi.

## Accessibilité

Un `<button type="button">` natif avec `aria-pressed="true"` ou `"false"` : atteignable au clavier, annoncé comme bouton bascule avec son état, retiré de l'ordre de tabulation quand il est `disabled`. L'anneau de focus est dessiné sur `:focus-visible`.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Appelle `onPressedChange` (le clic du bouton natif). |
