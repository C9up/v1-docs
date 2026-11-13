# Sonner

Des notifications passagères, telles que shadcn les livre : une région montée une fois près de la racine de l'application, et une fonction `toast` appelable de n'importe où — un gestionnaire d'événement, la branche d'erreur d'un formulaire, un service — sans poignée à faire descendre jusqu'à elle. L'API est celle de sonner : les mêmes méthodes `toast`, les mêmes options, les mêmes props du Toaster et les mêmes valeurs par défaut — quatre secondes à l'écran, trois notifications visibles, un écart de 14 px, 356 px de large, <kbd>Alt</kbd>+<kbd>T</kbd> pour atteindre la région. L'apparence est celle de shadcn : la surface du popover et les icônes lucide.

Les notifications s'empilent derrière la plus récente, réduites, et se déploient tant que le pointeur les survole — ce qui suspend aussi tous les minuteurs : une notification en cours de lecture ne disparaît pas. La pile est calculée en propriétés de style plutôt que pilotée par une feuille de style injectée, si bien qu'elle fonctionne sous tous les adaptateurs. Elles passent par le CSSOM, jamais par un attribut `style` : une Content-Security-Policy stricte — sans `'unsafe-inline'`, comme blackhole l'envoie par défaut — les laisse passer. Le serveur n'écrit pas de propriétés : avant l'hydratation, la liste est déjà `fixed` par une classe, et elle est vide de toute façon, puisque les notifications naissent côté client.

```sh
ream nebula:add sonner
```

Organisme · `organisms/Sonner.ts` · aucune dépendance

## Utilisation

```ts
import { Sonner, sonnerToast } from '@c9up/nebula'

// Une fois, dans le layout de l'application.
Sonner({ richColors: true, closeButton: true })

// N'importe où.
sonnerToast('Événement créé', { description: 'Dimanche, 9 h' })
```

Le fichier exporte `Toaster` et `toast`, comme sonner. Le barrel du paquet les renomme `Sonner` et `sonnerToast`, parce que le [Toaster](/fr/nebula/components/toaster) déprécié possède encore ces noms ; une copie ajoutée avec `ream nebula:add sonner` garde les noms d'origine :

```ts
import { Toaster, toast } from './components/organisms/Sonner.js'
```

Les exemples ci-dessous utilisent les noms du fichier.

## Exemples

### Types

```ts
toast('Invitation envoyée')                                          // simple : sans icône
toast.success('Modifications enregistrées', { description: 'Elles sont en ligne pour tout le monde.' })
toast.info('Une nouvelle version est disponible')
toast.warning('Stockage presque plein')
toast.error('Enregistrement impossible')
toast.loading('Envoi de rapport.pdf…')                               // reste jusqu'à être remplacée
```

Chaque type, sauf le simple, porte l'icône de shadcn. Une notification `loading` n'a pas de minuteur : elle attend une issue. `duration: Infinity` garde n'importe quelle autre notification jusqu'à ce qu'elle soit fermée.

### Couleurs riches

```ts
Toaster({ richColors: true })
toast.error('Paiement refusé')   // une surface rouge au lieu de celle du popover
```

`richColors` peut aussi se poser sur une seule notification. `theme` (`'light'`, `'dark'`, ou `'system'`, la valeur par défaut, qui suit la variante `dark` de l'application) et `invert` changent la surface.

### Une action, et une annulation

```ts
toast('Conversation archivée', {
  action: { label: 'Annuler', onClick: () => unarchive(conversationId) },
})

toast('Supprimer ce brouillon ?', {
  cancel: { label: 'Le garder', onClick: () => {} },
  action: { label: 'Supprimer', onClick: () => remove(draftId) },
})
```

L'action exécute son `onClick`, puis ferme la notification — sauf si le gestionnaire a appelé `event.preventDefault()`, ce qui la garde. Le bouton d'annulation exécute son `onClick` et ferme la notification sans appeler `onDismiss`. Les deux prennent `{ label, onClick }` ; pour un contenu à vous, utilisez `toast.custom`.

### Une notification par problème

Une notification émise sous un `id` déjà à l'écran la met à jour au lieu d'en empiler une autre : « vous êtes hors ligne », émis à chaque requête en échec, reste une seule notification :

```ts
toast.warning('Vous êtes hors ligne', { id: 'offline', duration: Infinity })
toast.warning('Toujours hors ligne — nouvelle tentative', { id: 'offline', duration: Infinity })

// De retour en ligne.
toast.dismiss('offline')
```

Le même mécanisme transforme une notification de chargement en son issue :

```ts
const id = toast.loading('Enregistrement…')
// plus tard
toast.success('Enregistré', { id })
```

`toast.dismiss()` sans id ferme toutes les notifications, et `toast.getToasts()` liste celles qui sont à l'écran, la plus récente d'abord.

### Suivre une promesse

```ts
const { id, unwrap } = toast.promise(save(form), {
  loading: 'Enregistrement…',
  success: (saved) => `${saved.name} enregistré`,
  error: 'Enregistrement impossible',
})

const saved = await unwrap()   // la valeur, ou le rejet rendu à l'appelant
```

Une seule notification passe de `loading` à `success` ou `error`. Une étape est un message, une fonction de l'issue (éventuellement asynchrone), ou `{ message, ...options }`. Une réponse HTTP dont `ok` vaut `false` est signalée via `error`, avec `HTTP error! status: <code>`. Quand aucune étape ne dit ce qui s'est passé, la notification de chargement est fermée. `finally` s'exécute une fois la promesse réglée. `work` peut aussi être une fonction qui renvoie la promesse.

`toast.promise` renvoie `{ id, unwrap }` plutôt que l'id auquel on aurait greffé `unwrap` : un rejet est signalé dans la notification, et `unwrap()` le rend au chemin d'erreur de l'appelant.

### Votre propre contenu

```ts
toast.custom((id) => html`<div class="rounded-md border p-4">
  Envoyé. ${Button({ size: 'sm', onClick: () => toast.dismiss(id), children: 'OK' })}
</div>`)
```

`render` reçoit l'id de la notification. Le résultat s'affiche à la place du titre, sans habillage.

### Position, plusieurs régions

```ts
Toaster({ position: 'top-center', expand: true, visibleToasts: 5 })

toast('Copié', { position: 'bottom-center' })   // un coin à elle
```

Il y a six positions — `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right` (par défaut). Une notification avec sa propre `position` obtient sa propre liste dans ce coin. `expand` garde la pile déployée. Une seconde région prend un `id`, et n'affiche que les notifications émises avec ce `toasterId` :

```ts
Toaster({ id: 'editor', position: 'top-right' })
toast('Brouillon enregistré', { toasterId: 'editor' })
```

## API

### Toaster

La région. Montez-la une fois près de la racine ; elle affiche les notifications adressées à son `id`, ou celles sans `toasterId` quand elle n'en a pas.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `position` | `Position` | `'bottom-right'` | Le coin. |
| `richColors` | `boolean` | `false` | Des surfaces colorées selon le type. |
| `closeButton` | `boolean` | `false` | Une croix de fermeture sur chaque notification. |
| `expand` | `boolean` | `false` | Garder la pile déployée au lieu de l'empiler. |
| `duration` | `number` | `4000` | Millisecondes à l'écran. |
| `visibleToasts` | `number` | `3` | Combien s'affichent à la fois ; les autres sont gardées, masquées. |
| `gap` | `number` | `14` | L'espace entre les notifications déployées, en px. |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | `system` suit la variante `dark` de l'application. |
| `invert` | `boolean` | `false` | Inverser les surfaces claire et sombre. |
| `hotkey` | `string[]` | `['altKey', 'KeyT']` | Touches et codes `KeyboardEvent` qui atteignent la région. |
| `offset` | `Offset` | `'24px'` | Depuis les bords de la fenêtre : une valeur, ou `{ top, right, bottom, left }`. |
| `mobileOffset` | `Offset` | `'16px'` | La même chose, à 600 px de large et moins. |
| `dir` | `'rtl' \| 'ltr' \| 'auto'` | — | Sens d'écriture de la région. |
| `icons` | `ToastIcons` | celles de shadcn | Remplace l'icône de `success`, `info`, `warning`, `error`, `loading`, ou la croix de fermeture ; `null` n'en affiche aucune. |
| `toastOptions` | `ToastOptions` | — | Valeurs par défaut de chaque notification : `class`, `descriptionClass`, `classNames`, `closeButton`, `duration`, `unstyled`, `closeButtonAriaLabel` (par défaut `'Close toast'`). |
| `containerAriaLabel` | `string` | `'Notifications'` | Le nom de la région, avant le raccourci. |
| `customAriaLabel` | `string` | — | Remplace tout le nom accessible de la région. |
| `id` | `string` | — | N'afficher que les notifications émises avec ce `toasterId`. |
| `class` | `Reactive<string>` | — | Fusionné dans les classes de la région. |

### toast

| Méthode | Renvoie | Description |
|---|---|---|
| `toast(message, options?)` | `ToastId` | Une notification simple. `toast.message` est identique. |
| `toast.success` / `info` / `warning` / `error` `(message, options?)` | `ToastId` | Une notification de ce type, avec son icône. |
| `toast.loading(message, options?)` | `ToastId` | Un indicateur de chargement et aucun minuteur. |
| `toast.custom(render: (id) => Child, options?)` | `ToastId` | Votre propre contenu, sans habillage. |
| `toast.promise(work, data?)` | `{ id, unwrap }` | Une seule notification pour toute la vie d'un appel asynchrone. |
| `toast.dismiss(id?)` | `ToastId \| undefined` | Fermer une notification, ou toutes sans id. |
| `toast.getToasts()` | `ToastT[]` | Les notifications à l'écran, la plus récente d'abord. |

### Options d'une notification

Ce que prend chaque appel de `toast` après son message (`ExternalToast`).

| Option | Type | Description |
|---|---|---|
| `id` | `number \| string` | Un id stable. Une notification émise sous un id déjà à l'écran la met à jour. |
| `description` | `Slot` | Une seconde ligne, atténuée. |
| `duration` | `number` | Millisecondes à l'écran. `Infinity` la garde jusqu'à sa fermeture. |
| `action` / `cancel` | `{ label, onClick }` | Les deux boutons. |
| `onDismiss` | `(toast) => void` | Appelé quand la croix de fermeture ou `toast.dismiss` la retire — pas sur `cancel`. |
| `onAutoClose` | `(toast) => void` | Appelé quand son temps est écoulé. |
| `dismissible` | `boolean` | `false` empêche la croix de fermeture et le bouton d'annulation de la retirer ; son minuteur tourne toujours, associez-la donc à `duration: Infinity` pour l'épingler. |
| `closeButton`, `richColors`, `invert` | `boolean` | Surcharges par notification de ceux du Toaster. |
| `icon` | `Child` | Remplace l'icône du type ; `null` n'en affiche aucune. |
| `position` | `Position` | Un coin à elle. |
| `toasterId` | `string` | Affichée seulement par le Toaster qui a cet `id`. |
| `class`, `descriptionClass`, `classNames` | `string`, `string`, `ToastClassnames` | Des classes en plus, fusionnées après celles de nebula. |
| `unstyled` | `boolean` | Retire l'apparence de nebula, ne garde que la mise en page. |
| `testId` | `string` | Écrit en `data-testid`. |

## Accessibilité

La région est une `<section>` nommée d'après son raccourci (`"Notifications alt+T"`), et elle contient deux régions live masquées, montées vides avant qu'aucune notification n'existe : une polie (`role="status"`) pour chaque notification, et une assertive (`role="alert"`) pour les erreurs — une erreur n'attend pas derrière ce qui est en cours de lecture. Une mise à jour est annoncée elle aussi : une promesse qui atteint son issue s'entend. La région porte `data-nebula-live`, qui l'exempte du `aria-hidden` qu'un [Dialog](/fr/nebula/components/dialog) modal pose sur ses voisins.

| Touche | Action |
|---|---|
| <kbd>Alt</kbd>+<kbd>T</kbd> | Déploie la pile et déplace le focus dans la région. `hotkey` la change. |
| <kbd>Escape</kbd> | Focus dans la région, ré-empile la pile. |
| <kbd>Tab</kbd> | Atteint la croix de fermeture et les boutons, des `<button>` natifs. |

Survoler la pile, appuyer dessus, ou un onglet masqué suspendent tous les minuteurs ; chacun reprend avec le temps qu'il lui restait. Il n'y a pas de balayage pour fermer, ni de `getHistory`. La croix de fermeture — jamais affichée sur une notification `loading` ou personnalisée — s'appelle `"Close toast"`, ce que `toastOptions.closeButtonAriaLabel` remplace.
