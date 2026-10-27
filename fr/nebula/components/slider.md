# Slider

Choisir un nombre dans une plage en faisant glisser un curseur le long d'une piste : un volume, une opacité, un budget.

C'est un `<input type="range">` natif, restylé, avec un seul curseur. Pour un seul curseur, le contrôle natif apporte déjà le clavier, le bon rôle et l'annonce des valeurs, et un comportement tactile qu'un slider reconstruit devrait réussir par ses propres moyens. Il n'y a pas de slider de plage à deux curseurs ; deux sliders, ou deux champs numériques, couvrent un minimum et un maximum.

Le prix à payer, c'est le curseur, qu'on n'atteint qu'à travers deux pseudo-éléments propres à chaque moteur. Les deux sont écrits en entier, en classes littérales — Tailwind trouve les classes en lisant le fichier comme du texte, si bien qu'une variante assemblée à l'exécution ne produirait aucune règle, et un navigateur rejette toute une règle qui nomme un pseudo-élément qu'il ne connaît pas, si bien que les deux ne peuvent pas partager un sélecteur.

```sh
ream nebula:add slider
```

Atome · `atoms/Slider.ts` · aucune dépendance

## Utilisation

```ts
import { signal } from '@c9up/aurora'
import { Slider } from '@c9up/nebula'

const volume = signal(50)

Slider({ label: 'Volume', value: volume, onValueChange: (value) => volume(value) })
```

`value` est lié à la propriété `value` du champ : un signal et le curseur restent synchrones dans les deux sens, et `volume(80)` appelé ailleurs déplace le curseur.

## Exemples

### Plage et pas

```ts
const opacity = signal(1)

Slider({
  label: 'Opacité',
  min: 0,
  max: 1,
  step: 0.05,
  value: opacity,
  onValueChange: (value) => opacity(value),
})
```

`onValueChange` reçoit un `number`, pas la chaîne du champ, et se déclenche à chaque mouvement du curseur, pas seulement quand on le relâche.

### Un libellé visible, un affichage de la valeur, et un formulaire

```ts
import { html } from '@c9up/aurora'
import { Label } from '@c9up/nebula'

const budget = signal(500)

html`
  <div class="flex items-center justify-between">
    ${Label({ for: 'budget', children: 'Budget mensuel' })}
    <span class="text-sm text-muted-foreground">${() => `CHF ${budget()}`}</span>
  </div>
  ${Slider({ id: 'budget', name: 'budget', min: 100, max: 2000, step: 50, value: budget, onValueChange: (value) => budget(value), disabled: locked })}
`
```

Un [Label](/fr/nebula/components/label) qui pointe vers l'`id` du slider le nomme : `label` devient inutile. Avec `name`, le slider s'envoie avec son formulaire comme n'importe quel champ.

## API

### Slider

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` du champ, pour un `<label for>`. |
| `name` | `string` | — | Le `name` du champ, pour l'envoi d'un formulaire. |
| `value` | `Reactive<number>` | `0` | La position du curseur, liée à la propriété `value`. |
| `min` | `Reactive<number>` | `0` | La plus petite valeur. |
| `max` | `Reactive<number>` | `100` | La plus grande valeur. |
| `step` | `Reactive<number>` | `1` | Le pas sur lequel le curseur s'aligne. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`, pour un slider qu'aucun `<label>` ne nomme. |
| `class` | `Reactive<string>` | — | Fusionnée en dernier dans les classes du champ. |
| `onValueChange` | `(value: number, event: Event) => void` | — | Chaque mouvement du curseur, avec la valeur en nombre. |

### sliderClasses

`sliderClasses: string` — les classes de la piste et du curseur, pour un `<input type="range">` natif que vous rendez vous-même.

## Accessibilité

Un champ de plage natif : annoncé comme un curseur avec sa valeur courante, son minimum et son maximum, atteignable au clavier, retiré de l'ordre de tabulation quand il est `disabled`. Il lui faut un nom — `label`, ou un `<label>` qui pointe vers son `id`. L'anneau de focus est dessiné autour du curseur sur `:focus-visible`.

Les touches sont celles du navigateur :

| Touche | Action |
|---|---|
| <kbd>ArrowRight</kbd> / <kbd>ArrowUp</kbd> | Augmente d'un `step`. |
| <kbd>ArrowLeft</kbd> / <kbd>ArrowDown</kbd> | Diminue d'un `step`. |
| <kbd>PageUp</kbd> / <kbd>PageDown</kbd> | Augmente / diminue d'un pas plus grand, fixé par le navigateur. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Va à `min` / `max`. |
