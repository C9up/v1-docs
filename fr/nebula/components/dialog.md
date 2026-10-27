# Dialog

Une fenêtre modale au-dessus de la page. L'ouvrir fait tout ce qu'une modale écrite à la main tend à oublier : un fond assombri, le focus piégé à l'intérieur et rendu au déclencheur à la fermeture, le défilement de la page bloqué sans le saut latéral quand la barre de défilement disparaît, <kbd>Échap</kbd> et un clic sur le fond pour fermer — et le reste de la page masqué aux technologies d'assistance, pour qu'un lecteur d'écran ne puisse pas sortir d'une boîte de dialogue qu'un utilisateur voyant ne peut pas quitter.

`DialogContent` ne rend rien là où il est écrit : la boîte de dialogue téléporte sa surface dans `<body>` à l'ouverture. Ses parties sont construites pendant la mise en place de `Dialog`, si bien que `DialogTitle` et `DialogDescription` sont enregistrés avant que le panneau soit câblé, et le panneau pointe `aria-labelledby` et `aria-describedby` vers eux. Une boîte de dialogue sans `DialogTitle` ne serait annoncée que comme « boîte de dialogue » : elle émet un avertissement.

```sh
ream nebula:add dialog
```

Organisme · `organisms/Dialog.ts` · [Button](/fr/nebula/components/button)

## Utilisation

```ts
import { html } from '@c9up/aurora'
import {
  Button, buttonVariants,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@c9up/nebula'

Dialog({
  children: () => html`
    ${DialogTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Modifier le profil' })}
    ${DialogContent({
      children: () => html`
        ${DialogHeader({ children: html`
          ${DialogTitle({ children: 'Modifier le profil' })}
          ${DialogDescription({ children: 'Changez votre nom et votre e-mail.' })}
        ` })}
        ${DialogFooter({ children: Button({ children: 'Enregistrer', onClick: () => save() }) })}
      `,
    })}
  `,
})
```

`DialogTrigger` et `DialogClose` sont eux-mêmes des `<button>`, sans allure propre : donnez-leur `buttonVariants(…)` plutôt qu'un `Button` à l'intérieur, qui imbriquerait un bouton dans un bouton.

## Exemples

### Le titre est une valeur

`Dialog` et `DialogContent` prennent leurs parties dans un thunk. Pas `DialogHeader` : il prend un `Slot`, que le moteur de rendu appelle après que le panneau a cherché son titre, si bien qu'un `DialogTitle` construit dans un `() =>` à cet endroit s'affiche mais laisse le panneau sans nom. Passez une valeur à l'en-tête, et mettez ce qui change *dans* le titre :

```ts
DialogHeader({ children: DialogTitle({ children: 'Modifier le profil' }) })              // ✓ une valeur
DialogHeader({ children: () => html`${DialogTitle({ children: 'Modifier le profil' })}` }) // ✗ trop tard
```

Voir [composition](/fr/nebula/composition#les-composants-composes-prennent-leurs-parties-dans-un-thunk).

### Une boîte, deux contenus

Une boîte de dialogue qui bascule entre création et modification. Le titre suit le signal parce que ses `children` sont un accesseur ; le corps le suit parce qu'il en est un aussi — une valeur serait capturée une fois, à la mise en place, et le premier formulaire resterait :

```ts
import { html, signal } from '@c9up/aurora'

const mode = signal<'create' | 'edit'>('create')

Dialog({
  children: () => html`
    ${DialogTrigger({ children: 'Ouvrir' })}
    ${DialogContent({
      children: () => html`
        ${DialogHeader({
          children: DialogTitle({ children: () => (mode() === 'create' ? 'Nouveau projet' : 'Modifier le projet') }),
        })}
        ${() => (mode() === 'create' ? createForm() : editForm())}
      `,
    })}
  `,
})
```

### Un formulaire qui se ferme à l'enregistrement

Le focus se pose sur le premier élément focalisable du panneau — ici le champ du nom. La boîte de dialogue est contrôlée, donc le gestionnaire d'envoi la ferme une fois l'enregistrement passé :

```ts
import { html, signal } from '@c9up/aurora'
import { Input, Label, DialogClose } from '@c9up/nebula'

const open = signal(false)

Dialog({
  open,
  onOpenChange: open,
  children: () => html`
    ${DialogTrigger({ class: buttonVariants(), children: 'Nouveau projet' })}
    ${DialogContent({
      children: () => html`
        <form
          class="grid gap-4"
          @submit="${async (event: SubmitEvent) => {
            event.preventDefault()
            await save()
            open(false)
          }}"
        >
          ${DialogHeader({ children: DialogTitle({ children: 'Nouveau projet' }) })}
          ${Label({ for: 'project-name', children: 'Nom' })}
          ${Input({ id: 'project-name', name: 'name', required: true })}
          ${DialogFooter({ children: html`
            ${DialogClose({ class: buttonVariants({ variant: 'outline' }), children: 'Annuler' })}
            ${Button({ type: 'submit', children: 'Créer' })}
          ` })}
        </form>
      `,
    })}
  `,
})
```

### Ouverte d'ailleurs

Sans `DialogTrigger`, la boîte de dialogue s'ouvre depuis un signal — une action de ligne, un raccourci clavier, un évènement serveur :

```ts
const expired = signal(false)

Dialog({
  open: expired,
  onOpenChange: expired,
  children: () => DialogContent({
    children: () => html`
      ${DialogHeader({ children: DialogTitle({ children: 'Session expirée' }) })}
      <p>Reconnectez-vous pour continuer.</p>
    `,
  }),
})

expired(true)
```

`onOpenChange` doit réécrire l'état. Un `open` contrôlé l'emporte à chaque lecture, et <kbd>Échap</kbd>, la croix du coin et le fond ferment tous en appelant `onOpenChange(false)` — une boîte dont `onOpenChange` l'ignore reste ouverte.

`useDialog()` emballe le même signal avec `show` et `hide` :

```ts
import { useDialog } from '@c9up/nebula'

const editor = useDialog()

Button({ children: 'Modifier', onClick: editor.show })

Dialog({
  open: editor.open,
  onOpenChange: (next) => (next ? editor.show() : editor.hide()),
  children: () => DialogContent({
    children: () => DialogTitle({ children: 'Modifier' }),
  }),
})
```

### Fermer de l'intérieur

`DialogClose` ferme la boîte de dialogue depuis n'importe où dans le contenu. Masquez la croix du coin quand un bouton du pied dit déjà la même chose :

```ts
Dialog({
  children: () => html`
    ${DialogTrigger({ children: 'Détails' })}
    ${DialogContent({
      showCloseButton: false,
      children: () => html`
        ${DialogHeader({ children: DialogTitle({ children: 'Commande n° 1042' }) })}
        ${DialogFooter({ children: DialogClose({ class: buttonVariants(), children: 'Terminé' }) })}
      `,
    })}
  `,
})
```

`DialogFooter({ showCloseButton: true })` ajoute un bouton « Close » en contour après les enfants du pied.

### Un titre que seuls les lecteurs d'écran entendent

Une boîte de dialogue dont le contenu dit déjà ce qu'elle est — un aperçu d'image — a quand même besoin d'un nom :

```ts
DialogTitle({ srOnly: true, children: "Aperçu de l'image" })
```

### Une décision à prendre

`dismissOnOutside: false` empêche un clic sur le fond de fermer la boîte de dialogue, et `dismissOnEscape: false` en empêche <kbd>Échap</kbd>. Pour une confirmation oui/non, [AlertDialog](/fr/nebula/components/alert-dialog) le fait déjà et donne le focus à la réponse sûre.

```ts
DialogContent({
  dismissOnOutside: false,
  showCloseButton: false,
  children: () => html`
    ${DialogHeader({ children: DialogTitle({ children: 'Accepter les nouvelles conditions' }) })}
    ${DialogFooter({ children: DialogClose({ class: buttonVariants(), children: 'Accepter' }) })}
  `,
})
```

## API

### Dialog

L'état que lit chaque partie. Ne rend aucun élément propre.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | État contrôlé. Tant qu'il vaut autre chose qu'`undefined`, il l'emporte sur celui de la boîte. |
| `defaultOpen` | `boolean` | `false` | État de départ quand la boîte n'est pas contrôlée. |
| `onOpenChange` | `(open: boolean) => void` | — | Prévenu de chaque changement, contrôlé ou non. |
| `children` | `Parts` | — | Le déclencheur et le contenu, dans un `() =>`. |

### DialogTrigger

Un `<button>` qui ouvre la boîte de dialogue.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### DialogContent

Le panneau. Enregistre ce qu'il faut rendre et ne rend rien sur place.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Parts` | — | Le contenu du panneau, dans un `() =>`. |
| `showCloseButton` | `boolean` | `true` | La croix du coin supérieur droit. |
| `closeLabel` | `string` | `'Close'` | Le nom accessible de la croix. |
| `dismissOnOutside` | `boolean` | `true` | Un clic hors du panneau le ferme. |
| `dismissOnEscape` | `boolean` | `true` | <kbd>Échap</kbd> le ferme. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du panneau. Lue à chaque ouverture. |

### DialogHeader

`DialogSectionProps` : une colonne pour le titre et la description, centrée sur les écrans étroits.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Passez une valeur quand il contient le `DialogTitle`. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de l'en-tête. |

### DialogFooter

Les actions, empilées sur les écrans étroits et alignées à droite à partir de `sm`.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Les boutons. |
| `showCloseButton` | `boolean` | `false` | Ajoute un bouton de fermeture en contour après les enfants. |
| `closeLabel` | `string` | `'Close'` | Le texte de ce bouton. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du pied. |

### DialogTitle

Un `<h2>` qui nomme le panneau.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le titre. Un accesseur suit un signal. |
| `srOnly` | `boolean` | `false` | Gardé pour les lecteurs d'écran, hors de la mise en page. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes du titre. |

### DialogDescription

Un `<p>` qui décrit le panneau. Prend `DialogSectionProps` : `children: Slot`, `class: Reactive<string>`.

### DialogClose

Un `<button>` qui ferme la boîte de dialogue, depuis n'importe où à l'intérieur.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Le contenu du bouton. |
| `class` | `Reactive<string>` | — | Les classes du bouton — il n'en a aucune à lui. |

### DialogOverlay

Le fond assombri, pour composer votre propre surface. `DialogContent` en rend déjà un.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Fusionnée dans `dialogBackdropClasses`. |

### DialogPortal

Monte ses enfants à la fin de `container`, hors de la position du composant. `DialogContent` n'en a pas besoin.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | `Slot` | — | Ce qu'il faut monter. |
| `container` | `() => Element \| null` | `document.body` | Où monter. |

### useDialog

`useDialog(initial = false): { open: () => boolean; show(): void; hide(): void }` — un signal pour une boîte de dialogue pilotée de l'extérieur, sans déclencheur propre.

### dialogBackdropClasses, dialogPanelClasses

Les chaînes de classes du fond et du panneau centré, pour une surface qui doit ressembler à une boîte de dialogue.

## Accessibilité

Le panneau est `role="dialog"` avec `aria-modal="true"`, nommé par son `DialogTitle` (`aria-labelledby`) et décrit par sa `DialogDescription` (`aria-describedby`) ; sans description, l'attribut est omis plutôt que pointé vers rien. Tant qu'elle est ouverte, chaque voisin de la surface reçoit `aria-hidden="true"` — ce qui était déjà masqué le reste à la fermeture, et la région live d'un toast est laissée tranquille. Le déclencheur porte `aria-haspopup="dialog"`, `aria-expanded` et `data-state`.

À l'ouverture, le focus va au premier élément focalisable du panneau (la croix du coin quand il n'y a rien d'autre). À la fermeture, il revient au déclencheur, ou à ce qui l'avait avant quand la boîte n'en a pas. Les boîtes ouvertes l'une sur l'autre s'empilent : <kbd>Échap</kbd> et le piège à focus appartiennent à la plus haute.

| Touche | Action |
|---|---|
| <kbd>Entrée</kbd> / <kbd>Espace</kbd> | Sur le déclencheur, ouvre la boîte de dialogue. |
| <kbd>Tab</kbd> | Élément focalisable suivant du panneau ; boucle du dernier au premier. |
| <kbd>Maj</kbd> + <kbd>Tab</kbd> | Le précédent ; boucle du premier au dernier. |
| <kbd>Échap</kbd> | Ferme la boîte de dialogue, sauf si `dismissOnEscape` vaut `false`. |

La croix du coin dit « Close » : `closeLabel` sur `DialogContent` la remplace, et `closeLabel` sur `DialogFooter` le texte du bouton du pied — voir [langues](/fr/nebula/languages).
