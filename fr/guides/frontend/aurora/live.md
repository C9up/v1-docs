# Composants live

Ce guide couvre les composants dont l’état vit sur le serveur :

- Définir + monter (serveur)
- Câblage (provider/app)
- Côté client
- État partagé / multiplayer

## Composants Live (état résident serveur)

Les **composants live** gardent l'état **sur le serveur** (des signals aurora ordinaires) et ne renvoient au navigateur que des **patchs précis par slot** — pas un re-render HTML. Comme chaque signal sait déjà quel slot il alimente, le patch est `{slot, value}` pour les **seuls** slots changés (O(données changées), pas O(taille du composant)). C'est l'angle qui dépasse les libs qui diffent du HTML — et, l'état vivant côté serveur, ça donne du **temps réel multi-user** natif.

### Définir + monter (serveur)

```typescript
import { mountLiveSession, createLiveRegistry, html, signal } from '@c9up/aurora'

const registry = createLiveRegistry()
registry.define('Counter', () => {
  const count = signal(0)
  return {
    view: html`<button data-live-click="increment">Count: <span>${count}</span></button>`,
    handlers: { increment: () => count(count() + 1) },
  }
})
```

> **Règle d'authoring** : un slot texte réactif doit être le **seul contenu** de son élément (`<span>${count}</span>`, pas `Count: ${count}`) — le SSR fusionne le statique+dynamique adjacents et l'hydration ne peut pas re-splitter.

### Câblage (provider/app)

```typescript
import { authorizeLiveChannel, createLiveRouter, wireLiveEvents } from '@c9up/aurora'
// router HTTP + relay résolus du conteneur (idiome agnostique)
const live = createLiveRouter(registry, relay)

// Qui demande : le même principal que celui pour lequel la page monte la
// session — l'id utilisateur, l'id de session. undefined (ou une exception)
// signifie personne, et vaut un 403.
const identify = (ctx) => ctx.auth?.user?.id

// POST /__live/event — seul le propriétaire de la session l'atteint.
wireLiveEvents(httpRouter, live, identify)
// Son canal — seul le propriétaire de la session s'y abonne.
relay.authorize('live/:id', authorizeLiveChannel(live, identify))

// au rendu d'une page : const { id, channel, html } = live.mount('Counter', userId)
// à la déconnexion : live.disconnect(userId)
```

**Une session appartient au principal pour lequel elle a été montée.** Un id de
session est un `randomUUID`, mais un identifiant imprévisible est un secret, pas
un contrôle d'autorisation : il fuit par un référent, une ligne de log, une
capture d'écran partagée. La route d'événements et le canal comparent donc
l'appelant que renvoie `identify` au propriétaire de la session, et répondent
403 à tout autre — l'application n'écrit pas ce contrôle. La route répond 404
pour une session inconnue, 400 pour un événement dont le composant n'a pas de
gestionnaire propre (`constructor`, `toString` et le reste du prototype n'en
sont pas), et 500 sans détail quand un gestionnaire lève.

**Les sessions sont bornées.** `mount` s'exécute pendant le rendu de la page,
avant que le client ait ouvert quoi que ce soit ; un client qui ne revient
jamais — curl, un robot, un onglet fermé trop tôt — ne doit pas garder sa
session indéfiniment :

```typescript
const registry = createLiveRegistry({
  claimTimeoutMs: 60_000,      // non réclamée (ni abonnement ni événement traité) → libérée
  idleTimeoutMs: 10 * 60_000,  // réclamée, puis ni événement ni keep-alive → libérée
  maxPerOwner: 32,             // au-delà, la plus ancienne session du propriétaire part
  maxSessions: 10_000,         // au-delà, mount fait de la place ou lève E_AURORA_LIVE_SESSION_LIMIT
})
```

Les valeurs montrées sont les valeurs par défaut, et ce sont les réglages de
production : vous n'avez rien à régler. Une session est réclamée quand son
propriétaire s'abonne à son canal ou lui envoie un événement que le composant
traite. Un POST qui nomme un événement absent du composant (réponse 400) ne
réclame rien.

Une session réclamée reste tant que son client est là. Chaque événement traité
relance son délai d'inactivité, comme le keep-alive que `liveClient` envoie
toutes les deux minutes (`keepAliveMs`) par `buildLiveTransport`. Un client qui
ne fait que regarder garde sa session ; un onglet fermé n'envoie plus rien, et sa
session se termine dix minutes plus tard. Si vous écrivez votre propre transport,
donnez-lui un `keepAlive(id)` qui poste `{ id, keepAlive: true }` sur la route des
événements, ou réglez `idleTimeoutMs` sur la plus longue durée pendant laquelle
vos utilisateurs regardent sans cliquer. Gardez `idleTimeoutMs` nettement
au-dessus du `keepAliveMs` du client.

Quand le registre est plein, `mount` fait de la place avant de refuser : la plus
ancienne session que personne n'a réclamée part d'abord, puis la moins récemment
utilisée parmi celles silencieuses depuis la moitié de `idleTimeoutMs`. Une
session en cours d'usage n'est jamais évincée. `mount` ne lève
`E_AURORA_LIVE_SESSION_LIMIT` que quand toutes les sessions sont en usage ;
répondez-y par un 503.

### Côté client

```typescript
import { liveClient, buildLiveTransport, HttpClient } from '@c9up/aurora'
import { relay } from '@c9up/aurora/relay'

const container = document.querySelector('#app')
if (container === null) throw new Error('the page has no #app element')

liveClient({
  container,
  factory: () => html`<button data-live-click="increment">Count: <span>${count}</span></button>`,
  mount,                                       // { id, channel } injecté dans la page
  transport: buildLiveTransport(relay(), new HttpClient()),
})
```

`liveClient` **hydrate** le HTML SSR, applique les patchs entrants en posant le signal mirror (aurora patche le bon nœud), forwarde les `data-live-click` via le transport, et garde la session en vie toutes les `keepAliveMs` (deux minutes par défaut) tant qu'il est monté.

### État partagé / multiplayer

Un `liveStore` est **une** instance serveur dont l'état est partagé par tous les clients d'un canal : un `dispatch` mute une fois → un patch calculé une fois → `relay.broadcast` fan-out à tous (O(1) calcul, O(N) réseau).

```typescript
import { liveStore } from '@c9up/aurora'
const presence = liveStore(() => {
  const online = signal(0)
  return { view: html`<span><b>${online}</b> online</span>`, handlers: { join: () => online(online() + 1) } }
}, relay, 'room/lobby')
```

Gate l'accès au canal avec `relay.authorize('room/*', …)`. **Caveat** : `relay.broadcast` est in-process ; pour scaler sur plusieurs nodes il faut un backplane (Redis). Mono-process : rien à faire.
