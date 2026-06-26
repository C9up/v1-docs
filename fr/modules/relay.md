# Relay — Realtime

Relay est le module de transport realtime client de Ream (`@c9up/relay`) avec SSE + WebSocket Hub + SignalR. Remplace l'ancien package `@c9up/raytrace`.

## Capacites

- diffusion server → clients via SSE
- Hubs WebSocket bidirectionnels
- support du protocole SignalR
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

## Bonnes pratiques

- toujours proteger les canaux sensibles
- limiter le nombre de canaux par client
- tracer les abonnements pour detecter les fuites
