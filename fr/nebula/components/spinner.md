# Spinner

Un indicateur d'activité indéterminée : quelque chose se passe, sans fin mesurable. C'est un `role="status"` avec un libellé masqué visuellement, si bien qu'un lecteur d'écran annonce qu'un chargement est en cours — un simple glyphe qui tourne est invisible pour un lecteur, et laisse un silence là où un utilisateur voyant voit du mouvement.

La rotation s'arrête pour les utilisateurs qui ont demandé à leur système de réduire les animations (`motion-reduce:animate-none`). Le glyphe reste, pour que l'indicateur ne disparaisse pas avec elle.

```sh
ream nebula:add spinner
```

Atome · `atoms/Spinner.ts` · aucune dépendance

## Utilisation

```ts
import { Spinner } from '@c9up/nebula'

Spinner()
```

## Exemples

### Dire ce qui charge

```ts
Spinner({ label: 'Chargement des factures' })
```

« Loading » dit peu de chose quand trois éléments de la page chargent en même temps. Le libellé n'est jamais affiché ; c'est ce qu'entend un lecteur d'écran.

### Taille et couleur

```ts
Spinner({ class: 'size-8 text-muted-foreground' })
```

`class` va sur le glyphe, pas sur l'enveloppe : c'est une icône de 16 px dans la couleur du texte, et une utilitaire `size-*` ou `text-*` remplace l'une ou l'autre. Elle est lue une seule fois, à la construction.

### Dans un bouton

```ts
import { html, signal } from '@c9up/aurora'
import { Button, Spinner } from '@c9up/nebula'

const saving = signal(false)

Button({
  disabled: saving,
  children: () => (saving() ? html`${Spinner({ label: 'Enregistrement' })} Enregistrer` : 'Enregistrer'),
  onClick: async () => {
    saving(true)
    try { await save() } finally { saving(false) }
  },
})
```

Le spinner donne à un lecteur d'écran le mot « Enregistrement », et le bouton désactivé garde le sien, visible. Une région live insérée avec son texte déjà dedans n'est pas annoncée par tous les lecteurs d'écran : ne comptez pas sur le spinner seul pour signaler le changement.

### Pendant qu'une zone charge

```ts
import { html } from '@c9up/aurora'

html`<section aria-busy="${() => (loading() ? 'true' : 'false')}">
  ${() => (loading() ? Spinner({ label: 'Chargement du rapport' }) : report())}
</section>`
```

## API

### Spinner

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `Reactive<string>` | `'Loading'` | Annoncé aux technologies d'assistance, jamais affiché. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du glyphe. Lue à la construction. |

## Accessibilité

Un `<span role="status">` — une région live polie — qui contient le glyphe, `aria-hidden`, et le libellé dans un `span` `sr-only`. Il n'est pas focalisable et ne gère aucune touche.

Le libellé est intégré : `label` remplace `"Loading"` — voir [langues](/fr/nebula/languages).
