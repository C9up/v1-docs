# Switch

Un réglage marche/arrêt qui prend effet dès qu'on le bascule. C'est une case à cocher native comme [Checkbox](/fr/nebula/components/checkbox), avec `role="switch"` pour que les technologies d'assistance annoncent « activé » et « désactivé » plutôt que « coché ». La différence n'est pas cosmétique : une case est un choix confirmé en envoyant un formulaire, un interrupteur est un réglage déjà appliqué.

Le curseur est un élément frère déplacé par `peer-checked:`, pas un pseudo-élément : sa course reste exprimée en classes utilitaires, et la taille se change sans quitter la chaîne de classes.

```sh
ream nebula:add switch
```

Atome · `atoms/Switch.ts` · aucune dépendance

## Utilisation

```ts
import { Switch } from '@c9up/nebula'

Switch({ label: 'Mode avion', onCheckedChange: (on) => setAirplaneMode(on) })
```

## Exemples

### Suivre un signal

```ts
import { signal } from '@c9up/aurora'
import { Switch } from '@c9up/nebula'

const dark = signal(false)

Switch({ label: 'Mode sombre', checked: dark, onCheckedChange: (on) => dark(on) })
```

### Une ligne de réglages

Un libellé et une ligne d'aide d'un côté, l'interrupteur de l'autre — un [Field](/fr/nebula/components/field) horizontal :

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldContent, FieldDescription, FieldLabel, Switch, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const marketing = signal(false)

Field({
  ids,
  orientation: 'horizontal',
  children: () => html`
    ${FieldContent({
      children: html`
        ${FieldLabel({ children: 'E-mails marketing' })}
        ${FieldDescription({ children: 'Les nouveautés sur les produits et les fonctionnalités.' })}
      `,
    })}
    ${Switch({ id: ids.control, checked: marketing, onCheckedChange: (on) => marketing(on) })}
  `,
})
```

Le `FieldLabel` vise l'`id` de l'interrupteur : cliquer la légende le bascule.

### Désactivé pendant l'enregistrement

```ts
import { signal } from '@c9up/aurora'

const saving = signal(false)
const publicProfile = signal(true)

Switch({
  label: 'Profil public',
  checked: publicProfile,
  disabled: saving,
  onCheckedChange: async (on) => {
    publicProfile(on)
    saving(true)
    try {
      await savePreference('public', on)
    } catch {
      publicProfile(!on)
    } finally {
      saving(false)
    }
  },
})
```

Le navigateur a déjà déplacé le curseur quand `onCheckedChange` s'exécute. Écrire le signal le garde d'accord, et le réécrire en cas d'échec est ce qui ramène le curseur — laisser le signal intact laisserait l'interrupteur afficher un réglage qui n'a jamais été enregistré.

## API

### Switch

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `id` | `string` | — | L'`id` de l'input — ce que vise un `<label for>`. |
| `name` | `string` | — | Le nom sous lequel l'interrupteur est envoyé : `"on"` quand il est activé, rien sinon. |
| `checked` | `Reactive<boolean>` | `false` | Liée à la propriété `checked`. |
| `disabled` | `Reactive<boolean>` | `false` | Pose le `disabled` natif. |
| `label` | `Reactive<string \| undefined>` | — | Pose `aria-label`, pour un interrupteur qu'aucun `<label>` ne nomme. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'enveloppe — la boîte qui fixe la taille de l'interrupteur. |
| `onCheckedChange` | `(checked: boolean, event: Event) => void` | — | L'interrupteur a été basculé, avec son nouvel état. |

### switchTrackClasses

`switchTrackClasses: string` — la liste de classes du rail. Elle porte `peer`, sur lequel se règle le curseur.

## Accessibilité

Une case à cocher native avec `role="switch"` : atteignable au clavier, basculée par <kbd>Espace</kbd>, annoncée activée ou désactivée. `label` pose `aria-label`. Il n'y a pas de `describedBy` : dans une ligne de réglages, la description à côté de l'interrupteur n'est pas lue avec lui. L'anneau de focus est dessiné sur `:focus-visible`.
