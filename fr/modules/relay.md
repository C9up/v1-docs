# Relay — Realtime

Relay est le module de transport realtime client de Ream (`@c9up/relay`) avec SSE + WebSocket Hub + SignalR. Remplace l'ancien package `@c9up/raytrace`.

## Capacites

- diffusion server → clients via SSE
- Hubs bidirectionnels parlant le protocole JSON SignalR sur SSE
- canaux subscribables
- autorisation de canaux
- relai d'événements

## API principale

```ts
import { Relay } from '@c9up/relay'

const rt = new Relay()
rt.authorize('user:*', async (ctx, userId) => ctx.auth.user?.id === userId)
rt.relay('task.*')
```

## Configuration

Définissez vos réglages Relay dans `config/relay.ts` avec le helper `defineConfig` :

```ts
import { defineConfig } from '@c9up/relay'

export default defineConfig({
  // Options Relay
})
```

## Endpoints typiques

- `GET /__relay/events` connexion SSE (hint optionnel `?uid=<id>`)
- `POST /__relay/subscribe` abonnement canal
- `POST /__relay/unsubscribe` desabonnement

### Sécurité du uid hint

Quand un client authentifié se connecte à `/__relay/events?uid=<id>`,
le serveur pré-flight le hint contre `ctx.auth.user.id` AVANT
d'upgrade la réponse en SSE. Si les deux ne matchent pas, une
réponse bufferisée `403 E_UID_HIJACK` est renvoyée et le stream
n'est jamais ouvert. Le hint est donc purement informationnel —
le uid canonique vient toujours de `ctx.auth`, jamais du query string.

## Hubs (SignalR)

Un `Hub` est la moitié bidirectionnelle : le client invoque des méthodes côté
serveur, le serveur pousse vers un client, un groupe, ou tout le monde. On le
monte depuis un preload (`start/services.ts`), là même où `registerRoutes()`
est appelé — le provider pose les routes en `start()`, après les preloads :

```ts
import relay from '@c9up/relay/services/main'
import { Hub, type HubContext } from '@c9up/relay'

class ChatHub extends Hub {
  // `onSendMessage` traite l'invocation `sendMessage` : le nom de méthode
  // après `on`, première lettre en minuscule.
  async onSendMessage(ctx: HubContext, data: unknown) {
    ctx.group('room-1').send('message', data)
  }
}

relay.hub('/hubs/chat', new ChatHub())
```

`onConnect` / `onDisconnect` sont des hooks de cycle de vie, non invocables.
Monter deux fois le même chemin lève une erreur au lieu de remplacer le premier
hub.

### Le fil

Le transport est le **Server-Sent Events** — ce que relay sert déjà, ce
qu'utilise le paquet temps réel d'AdonisJS, et un transport SignalR de première
classe. Un client `@microsoft/signalr` standard configuré en
`HttpTransportType.ServerSentEvents` le parle sans modification :

| Route | Rôle |
|---|---|
| `POST <path>/negotiate` | émet un `connectionId` + `connectionToken` |
| `GET <path>?id=<token>` | le flux, serveur → client |
| `POST <path>?id=<token>` | messages encadrés, client → serveur |

`negotiate` n'annonce que les transports que le serveur sait réellement servir.
Annoncer WebSockets alors que rien ne peut faire l'upgrade envoie chaque client
dans une impasse : le défaut est donc `ServerSentEvents` seul.

Le customizer passé à `registerRoutes()` s'applique aussi aux trois routes d'un
hub — un hub a autant besoin du middleware `auth` que le flux d'événements.

## Bonnes pratiques

- toujours proteger les canaux sensibles
- limiter le nombre de canaux par client
- tracer les abonnements pour detecter les fuites
