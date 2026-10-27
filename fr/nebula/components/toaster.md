# Toaster

Des notifications passagères : une région montée une fois près de la racine de l'application, et un objet `toast` appelable de n'importe où — un gestionnaire d'événement, la branche d'erreur d'un formulaire, un service — sans poignée à faire descendre jusqu'à lui. La file vit dans l'état du module et la région s'y abonne ; tout le design tient dans ce découplage.

Les règles d'accessibilité sont plus strictes qu'il n'y paraît, et la région est statique pour pouvoir les tenir. Une région live insérée avec son contenu déjà dedans n'est pas annoncée par la plupart des lecteurs d'écran : la région est donc montée vide, et elle reste. Il y en a deux : les erreurs vont dans une région assertive qui interrompt, tout le reste dans une région polie qui attend — tout faire interrompre est le plus sûr moyen de rendre un lecteur d'écran inutilisable. Survoler la région suspend tous les comptes à rebours, parce qu'une notification qui disparaît pendant qu'on la lit est le reproche le plus courant fait à ce motif.

```sh
ream nebula:add toaster
```

Organisme · `organisms/Toaster.ts` · aucune dépendance

## Utilisation

```ts
import { Toaster, toast } from '@c9up/nebula'

// Une fois, dans le layout de l'application.
Toaster()

// N'importe où.
toast.success('Modifications enregistrées')
```

## Exemples

### Variantes

```ts
toast.show({ title: 'Invitation envoyée' })                       // default
toast.success('Modifications enregistrées', 'Elles sont visibles par tous.')
toast.warning('Stockage presque plein', 'Vous avez utilisé 92 % de votre forfait.')
toast.error("Impossible d'enregistrer", "Le serveur n'a pas répondu.")
toast.loading('Envoi de rapport.pdf…')
```

Chaque variante a son propre temps d'affichage, sauf si `duration` en décide autrement : 5 secondes, le double pour une `error` — l'utilisateur doit la lire et souvent agir — et une notification `loading` ne part jamais d'elle-même : elle attend un résultat.

### Une action

```ts
toast.show({
  title: 'Conversation archivée',
  action: { label: 'Annuler', onClick: () => unarchive(conversationId) },
  duration: 10_000,
})
```

L'action exécute son `onClick`, puis ferme la notification qui la proposait. Le compte à rebours ne se suspend que pour le pointeur : un utilisateur au clavier qui tabule jusqu'à l'action voit le temps continuer de courir. Une notification dont l'action compte reçoit donc une `duration` plus longue, ou `0` pour rester jusqu'à sa fermeture.

### Une notification par problème

Une notification affichée sous un `id` déjà à l'écran met celle-ci à jour au lieu d'en empiler une autre : « vous êtes hors ligne », levé à chaque requête échouée, fait une notification et non neuf :

```ts
toast.show({ id: 'offline', variant: 'warning', title: 'Vous êtes hors ligne', duration: 0 })
toast.show({ id: 'offline', variant: 'warning', title: 'Toujours hors ligne — nouvelle tentative', duration: 0 })

// De retour en ligne.
toast.dismiss('offline')
```

### Modifier une notification à l'écran

`toast.update` modifie une notification encore présente et ne fait rien à une notification partie. Il relance aussi le compte à rebours, ce qu'un appelant ne penserait pas à demander : une notification `loading` n'a pas de minuterie, et changée en succès sans en recevoir une, elle resterait à l'écran pour toujours.

```ts
const id = toast.loading('Envoi de rapport.pdf…')

upload(file).then(
  () => toast.update(id, { variant: 'success', title: 'rapport.pdf envoyé' }),
  () => toast.update(id, { variant: 'error', title: "Échec de l'envoi" }),
)
```

Passer la variante à `error`, ou la quitter, déplace la notification d'une région live à l'autre.

### Suivre une promesse

`toast.promise` fait la même chose en un appel : une seule notification pour toute la vie d'un appel asynchrone, d'abord le chargement, puis le résultat. Chaque étape est un titre, un jeu d'options complet, ou une fonction du résultat :

```ts
const saved = await toast.promise(saveDocument(form), {
  loading: 'Enregistrement…',
  success: (doc) => `${doc.name} enregistré`,
  error: (reason) => ({ title: "Impossible d'enregistrer", description: String(reason) }),
})
```

Elle renvoie la promesse qu'elle a reçue, rejet compris. Elle signale, elle ne traite pas : le chemin d'erreur de l'appelant s'exécute toujours, et un appel échoué ne se réduit pas à une notification rouge.

### Réagir au départ d'une notification

```ts
toast.show({
  title: 'Brouillon supprimé',
  onClose: () => analytics.track('draft-discarded-toast-closed'),
})

// À la navigation, par exemple.
toast.clear()
```

`onClose` s'exécute une fois, quelle que soit la façon dont la notification est partie : sa minuterie, sa croix, son action, `dismiss` ou `clear`. Un `onClose` qui lève une exception est journalisé et ne casse pas la fermeture qui l'a appelé.

### Position et libellés

```ts
Toaster({ position: 'top-right', closeButtonAriaLabel: 'Fermer la notification' })
```

Le coin par défaut est `bottom-right`. Les deux sont lus une seule fois, à la construction.

## API

### Toaster

La région. Montez-la une seule fois : la file est un état de module, si bien que chaque `Toaster` monté affiche chaque notification.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Le coin. Lu à la construction. |
| `closeButtonAriaLabel` | `string` | `'Dismiss notification'` | Le nom accessible de la croix de fermeture de chaque notification. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la région. |

### toast

| Méthode | Renvoie | Description |
|---|---|---|
| `toast.show(options: ToastOptions)` | `ToastId` | Lève une notification. Un `id` déjà à l'écran met celle-ci à jour. |
| `toast.success(title: Child, description?: Child)` | `ToastId` | `show` avec `variant: 'success'`. |
| `toast.error(title: Child, description?: Child)` | `ToastId` | `show` avec `variant: 'error'`, dans la région assertive. |
| `toast.warning(title: Child, description?: Child)` | `ToastId` | `show` avec `variant: 'warning'`. |
| `toast.loading(title: Child, description?: Child)` | `ToastId` | `show` avec `variant: 'loading'` : un glyphe qui tourne et pas de minuterie. |
| `toast.update(id: ToastId, patch: Partial<ToastOptions>)` | `void` | Modifie une notification à l'écran et relance son compte à rebours. Sans effet si elle est partie. |
| `toast.dismiss(id: ToastId)` | `void` | Retire une notification et exécute son `onClose`. |
| `toast.promise<T>(work: Promise<T>, messages)` | `Promise<T>` | Une notification de `loading` à `success` ou `error`. `messages` vaut `{ loading: ToastMessage; success: ToastMessage \| ((value: T) => ToastMessage); error: ToastMessage \| ((reason: unknown) => ToastMessage) }`. Renvoie `work`. |
| `toast.clear()` | `void` | Retire toutes les notifications, puis exécute leurs `onClose`. |

### ToastOptions

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `title` | `Child` | — | Obligatoire. La première ligne. |
| `description` | `Child` | — | Une seconde ligne, atténuée. |
| `variant` | `ToastVariant` | `'default'` | L'allure, la région live (`error` est assertive) et la `duration` par défaut. |
| `duration` | `number` | `5000` ; `10000` pour `error` ; `0` pour `loading` | Millisecondes à l'écran. `0` la garde jusqu'à sa fermeture. |
| `action` | `{ label: string; onClick: () => void }` | — | Un bouton qui exécute `onClick`, puis ferme la notification. |
| `id` | `string` | un nombre, attribué par `show` | Un identifiant stable. Afficher une notification sous un id déjà à l'écran met celle-ci à jour. |
| `onClose` | `() => void` | — | Appelé une fois la notification partie, quelle qu'en soit la façon. |

`ToastVariant` vaut `'default' | 'success' | 'error' | 'warning' | 'loading'`. `ToastId` vaut `number | string` — un nombre quand `show` l'a attribué, une chaîne quand vous l'avez fourni. `ToastMessage`, ce que dit une étape de `promise`, vaut `Child | Omit<ToastOptions, 'id' | 'variant'>` : un objet simple doté d'un `title` est lu comme des options, tout le reste comme le titre lui-même.

## Accessibilité

La région contient deux régions live, montées vides avant toute notification : `role="status"` avec `aria-live="polite"` pour toutes les variantes sauf `error`, et `role="alert"` avec `aria-live="assertive"` pour les erreurs. La région porte `data-nebula-live`, qui l'exempte de l'`aria-hidden` qu'un [Dialog](/fr/nebula/components/dialog) modal pose sur ses voisins — une notification levée pendant qu'un dialogue est ouvert est quand même annoncée.

Le toaster ne gère aucune touche et ne prend jamais le focus : une notification est annoncée, pas focalisée. La croix de fermeture et l'action sont des `<button>` natifs, atteints avec <kbd>Tab</kbd> et activés par <kbd>Entrée</kbd> et <kbd>Espace</kbd>. Survoler la région suspend tous les comptes à rebours ; la quitter les relance avec au moins une seconde restante, pour qu'une notification sur laquelle le pointeur s'est attardé jusqu'à son terme ne disparaisse pas à l'instant où il s'en va. Le focus ne les suspend pas.

La croix de fermeture s'appelle `"Dismiss notification"` ; `closeButtonAriaLabel` le remplace — voir [langues](/fr/nebula/languages). Le glyphe qui tourne d'une notification `loading` est décoratif.
