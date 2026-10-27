# Kbd

Une touche de clavier, rendue en ligne, dessinée comme un petit capuchon de touche. C'est un atome à part entière parce que les indications de raccourci apparaissent partout — infobulles, états vides, textes d'aide. Dans une [Command](/fr/nebula/components/command) ou un menu, l'indication alignée à droite au bout d'un élément est la partie `…Shortcut` de ce composant ; `Kbd` sert pour le reste.

```sh
ream nebula:add kbd
```

Atome · `atoms/Kbd.ts` · aucune dépendance

## Utilisation

```ts
import { Kbd } from '@c9up/nebula'

Kbd({ children: 'Échap' })
```

## Exemples

### Une combinaison

Un `Kbd` par touche, pour que chacune se lise comme son propre capuchon :

```ts
import { html } from '@c9up/aurora'
import { Kbd } from '@c9up/nebula'

html`Appuyez sur ${Kbd({ children: '⌘' })} ${Kbd({ children: 'K' })} pour chercher.`
```

### Dans une infobulle

Le déclencheur enveloppe un vrai contrôle, pour qu'un utilisateur du clavier atteigne aussi l'indication :

```ts
import { html } from '@c9up/aurora'
import { Button, Kbd, Tooltip, TooltipContent, TooltipTrigger } from '@c9up/nebula'

Tooltip({
  children: () => html`
    ${TooltipTrigger({ children: Button({ children: 'Enregistrer' }) })}
    ${TooltipContent({ children: html`Enregistrer ${Kbd({ children: 'Ctrl' })} ${Kbd({ children: 'S' })}` })}
  `,
})
```

### Avec une icône

```ts
import { html } from '@c9up/aurora'
import { ArrowRightIcon, Kbd } from '@c9up/nebula'

Kbd({ children: html`${ArrowRightIcon({ class: 'size-3' })}` })
```

## API

### Kbd

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le nom ou le symbole de la touche. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la touche. |

## Accessibilité

Un `<kbd>` natif, lu comme le texte qu'il contient. Un symbole comme `⌘` est lu par son nom, s'il l'est, et différemment d'un lecteur d'écran à l'autre ; quand le raccourci compte, la phrase qui l'entoure peut nommer la touche en toutes lettres. La touche ne capte pas le pointeur et ne peut pas être sélectionnée : un clic ou un glisser sur elle va à ce qui se trouve dessous.
