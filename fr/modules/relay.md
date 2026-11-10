# Relay — Realtime

Relay est le module de transport realtime client de Ream (`@c9up/relay`) avec SSE + WebSocket Hub + SignalR. Remplace l'ancien package `@c9up/raytrace`.

## Capacites

- diffusion server → clients via SSE
- Hubs bidirectionnels parlant le protocole JSON SignalR sur SSE
- canaux subscribables
- autorisation de canaux
- diffusion multi-instances via un bus Redis

## API principale

```ts
// start/services.ts
import relay from '@c9up/relay/services/main'

relay.registerRoutes()
// L'autorisateur reçoit le contexte de la requête de souscription et les
// paramètres capturés par son motif.
relay.authorize<{ id: string }>('users/:id', (ctx, { id }) => ctx.auth?.user?.id === id)
relay.authorize('reports/*', (ctx) => ctx.bouncer?.allows('reports.read') ?? false)

// n'importe où dans l'app
relay.broadcast('users/42', { unread: 3 })
```

L'autorisateur reçoit tout le contexte de la requête de souscription, comme un
contrôleur : `ctx.bouncer`, le tenant, tout ce qu'un middleware y a mis. `auth`
et `bouncer` sont typés ; le reste est là à l'exécution.

### Motifs de canal

| Segment | Correspond à | Paramètre |
|---|---|---|
| `users` | ce segment exactement | — |
| `:id` | un segment quelconque | `id` |
| `:name.csv` | un segment qui finit par `.csv` | `name`, sans le suffixe |
| `:id?` | un segment, ou rien — en fin de motif seulement | `id` s'il est présent |
| `*` | un segment ou plus — en dernier seulement | `'*'`, le reste joint par `/` |

`orgs/:org/*` couvre `orgs/acme/projects/42` avec `{ org: 'acme', '*': 'projects/42' }` ;
`posts/:id?` couvre `posts` comme `posts/42`. Un enregistrement sans paramètre
ni joker l'emporte sur tous les motifs ; les motifs sont essayés dans l'ordre où
ils ont été enregistrés. Un motif qui ne pourrait jamais correspondre — un `*`
qui n'est pas le dernier, un nom de paramètre vide, un segment obligatoire après
un optionnel — lève une erreur dès `authorize()`.

### Ce que transporte un broadcast

La charge part en JSON, quelle qu'elle soit : `broadcast(ch, 'hello')` arrive au
client comme la chaîne `hello`, et `broadcast(ch, '{"a":1}')` comme cette
chaîne, pas comme un objet. Une chaîne n'est jamais écrite brute dans le flux :
aucun saut de ligne ni retour chariot qu'elle contient ne peut clore son
événement et en forger un autre. Une charge que JSON ne sait pas porter — un
cycle, un `BigInt` — fait lever `broadcast()` avant tout envoi ; `undefined`
part comme `null`.

`broadcastExcept(channel, payload, uid)` écarte le ou les uid donnés, sur cette
instance et, par le bus, sur toutes les autres.

## Configuration

Définissez vos réglages Relay dans `config/relay.ts` avec le helper `defineConfig` :

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  // Autoriser l'abonnement à un canal qu'aucun autorisateur ne couvre.
  // Par défaut false.
  allowUnauthorizedChannels: false,
  // Clients SSE simultanés acceptés par cette instance. Au-delà, 503.
  maxClients: 10_000,
  // Clients SSE simultanés qu'un même propriétaire peut détenir — un
  // utilisateur, ou l'adresse du client d'une connexion anonyme — pour qu'un
  // seul client ne prenne pas toutes les places. Par défaut 20 ; false pour
  // aucune limite. Derrière un proxy, déclarez les proxys de confiance, sinon
  // tous les visiteurs anonymes comptent comme le proxy.
  maxClientsPerOwner: 20,
  // Canaux qu'un client peut détenir. Les noms viennent du client et sont
  // indexés : sans borne, une seule socket peut immobiliser la mémoire.
  maxChannelsPerClient: 100,
  // Le bus qui transporte un broadcast d'une instance à l'autre. Voir plus bas.
  transport: transports.redis({ connection: 'main' }),
  // Une trame de keep-alive vers chaque client, pour que les proxys ne ferment
  // pas les flux inactifs : millisecondes ou durée. Par défaut false.
  pingInterval: '30s',
})
```

### Plusieurs instances

Un broadcast atteint les clients SSE rattachés à l'instance qui l'a émis.
Derrière un répartiteur de charge avec deux répliques, cela représente environ
la moitié de vos utilisateurs : chacun est connecté à l'instance que le
répartiteur a choisie pour lui.

`transport` comble ce trou : chaque broadcast est recopié sur le bus, et chaque
instance redistribue ce qui arrive à ses propres clients. La redistribution est
purement locale, donc un message ne repart jamais sur le bus, et chaque
publication porte l'identifiant du relais qui l'a émise, lequel ignore les
siennes — le bus rend aussi un message à son émetteur, dont les clients locaux
l'ont déjà reçu.

**Les souscriptions exigent l'instance qui tient le flux.** Le bus transporte
les broadcasts, pas les connexions : l'uid d'une connexion, ses canaux, les
tokens et les groupes d'un hub vivent sur l'instance qui a ouvert le flux. Un
`subscribe` qui arrive sur une autre instance répond `400 E_RELAY_NOT_CONNECTED`.
Dirigez les requêtes relay d'un client vers une seule instance — sessions
collantes sur `/__relay/*` et les chemins des hubs — ou faites-les servir par
une seule instance.

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  transport: transports.redis({ connection: 'main' }),
})
```

`connection` accepte le nom d'une connexion [`@c9up/quasar`](/fr/modules/quasar)
— résolue au premier broadcast, pas à la lecture du fichier de config — ou
votre propre client répondant à `publish`, `subscribe` et `unsubscribe`.

Un client partagé empile les écouteurs : `unsubscribe(channel, handler)` doit
donc honorer le handler qu'on lui passe et ne retirer que celui-là. Retirer
tous les écouteurs du canal ferait taire ce que l'application écoute par
ailleurs sur la même connexion.

`transportChannel` renomme le canal sur lequel le bus publie (par défaut
`relay::broadcast`) ; toutes les instances doivent s'accorder dessus.

**L'arrêt ne libère que ce que relay possède.** Une connexion quasar nommée
appartient à l'application — le cache, les sessions et les files la partagent
peut-être — donc `relay.shutdown()` retire son propre écouteur du canal et
laisse la connexion ouverte. Seul un client ouvert pour relay et utilisé par
rien d'autre doit être fermé avec lui :

```ts
transports.redis({ connection: monPropreClient, owned: true })
```

Un nom est une consultation dans le gestionnaire de connexions de quelqu'un
d'autre : il est emprunté par construction, et `owned` ne peut pas le
contredire.

**Un bus injoignable arrête le démarrage.** Une instance qui n'arrive pas à
s'abonner continue de servir ses propres clients et rate toutes les diffusions
publiées ailleurs — un split-brain que l'application déclarerait en bonne santé.
Le provider attend l'abonnement dans `ready()` : un Redis indisponible au
démarrage est donc un boot en échec, et non un déploiement à moitié fonctionnel
en silence.

Sans `transport`, relay reste mono-instance.

## Diffuser les événements de l'application

Relay n'a pas de correspondance événement → canal à lui : l'application écoute
ses événements et diffuse, dans un listener qu'elle écrit et lit comme les
autres — ce que fait une app AdonisJS avec Transmit.

```ts
// start/services.ts
import emitter from '@c9up/ream/events/services/main'
import relay from '@c9up/relay/services/main'
import { TaskAssigned } from '#events/task_assigned'

emitter.on(TaskAssigned, (event) => {
  relay.broadcast(`project/${event.projectId}`, { type: 'task.assigned', taskId: event.taskId })
})
```

Qui peut écouter `project/:id` se décide une fois, dans l'autorisateur du canal ;
ce que porte chaque événement, et vers quel canal, reste dans le listener.

## Endpoints typiques

- `GET /__relay/events` connexion SSE
- `POST /__relay/subscribe` abonnement canal
- `POST /__relay/unsubscribe` desabonnement

Aucune n'existe tant que l'application ne la demande pas — `registerRoutes()`
les pose, depuis un preload :

```ts
// start/services.ts
import relay from '@c9up/relay/services/main'

relay.registerRoutes()
// ou, pour mettre les endpoints derrière l'auth :
relay.registerRoutes((route) => route.middleware('auth'))
```

Poser la route là où la déclaration est écrite est ce qui la garde en avance sur
la socket. Les construire dans une phase ultérieure laissait une fenêtre, après
que le serveur écoutait, où une requête vers une route déjà demandée par
l'application répondait 404.

### Connexions

Chaque flux reçoit un uid du serveur — jamais du client — envoyé dans sa
première trame, `connected { uid }`, et renvoyé dans `subscribe` / `unsubscribe`.
Chaque connexion a le sien, si bien que deux onglets d'un même compte restent
ouverts côte à côte. Qui l'a ouverte est enregistré à côté — l'utilisateur, et
la session avec laquelle la requête est arrivée — et un `subscribe` ou un
`unsubscribe` doit porter les mêmes, dans les deux sens (`403 E_RELAY_NOT_OWNER`
sinon) : un flux ouvert par un utilisateur n'accepte que ses requêtes à lui, et
un flux ouvert anonymement, ou sans session, n'accepte que des requêtes qui n'en
portent pas. Sinon une requête munie des credentials de quelqu'un — une trame
forgée rejouée par son propre client, un formulaire d'un autre site — pourrait
faire approuver par l'autorisateur, avec ces credentials, un canal qui coule
vers une connexion tenue par un autre. Un client qui se connecte à son compte,
ou qui reçoit un cookie de session, se reconnecte pour obtenir un flux lié.

Les écouteurs de cycle de vie reçoivent le contexte de la requête à côté de
l'uid :

```ts
relay.on('subscribe', ({ uid, channel, context }) => {
  audit.log(context.auth?.user?.id, 'subscribed', channel)
})
```

`connect` et `disconnect` portent le contexte de la requête qui a ouvert le
flux ; `subscribe` et `unsubscribe` celui de leur propre requête.

`relay.shutdown()` arrête le timer de keep-alive, termine tous les flux ouverts
— ceux des événements et ceux des hubs montés — et refuse les nouveaux, puis
libère le bus. Un flux ouvert ensuite est terminé aussitôt, si bien que le
client se reconnecte, sur une autre instance s'il y en a une. Le
`startTransport()` suivant (le `ready()` du provider) accepte de nouveau les
connexions.

## Hubs (SignalR)

Un `Hub` est la moitié bidirectionnelle : le client invoque des méthodes côté
serveur, le serveur pousse vers un client, un groupe, ou tout le monde. On le
monte depuis un preload (`start/services.ts`), là même où `registerRoutes()`
est appelé — chaque déclaration pose sa route **au moment où elle est écrite**,
donc avant que le serveur écoute :

```ts
import relay from '@c9up/relay/services/main'
import { Hub, type HubContext } from '@c9up/relay'

class ChatHub extends Hub {
  // `onSendMessage` traite l'invocation `sendMessage` : le nom de méthode
  // après `on`, comparé sans tenir compte de la casse.
  async onSendMessage(ctx: HubContext, data: unknown) {
    ctx.group('room-1').send('message', data)
  }
}

relay.hub('/hubs/chat', new ChatHub())
```

`onConnect` s'exécute une fois le handshake du client acquitté — une trame
envoyée avant la réponse au handshake fait refuser la connexion par le client
SignalR. La valeur renvoyée par une méthode est ce que résout le `invoke()` du
client.

Un flux qui n'a pas terminé le handshake après `handshakeTimeoutMs` (15 s par
défaut, celui du client) est fermé, et au-delà de `maxConnections` flux ouverts
(10 000 par défaut) un nouveau est refusé en 503. Un même propriétaire — un
utilisateur, ou l'adresse du client d'une requête anonyme — peut tenir
`maxConnectionsPerOwner` flux (20 par défaut) et `maxPendingTokensPerOwner`
tokens négociés pas encore rattachés (20 par défaut) ; une table de tokens
pleine refuse une nouvelle négociation en 503 plutôt que de supprimer le token
d'un autre. Ce sont des options de l'adaptateur passé en troisième argument :

```ts
import { SignalRAdapter } from '@c9up/relay'

const hub = new ChatHub()
relay.hub('/hubs/chat', hub, new SignalRAdapter(hub, { handshakeTimeoutMs: 10_000, maxConnections: 2_000 }))
```

### Garder un hub

`useGuards` s'applique à chaque invocation du hub :

```ts
class AdminHub extends Hub {
  constructor() {
    super()
    this.useGuards({ guards: ['session'], roles: ['admin', 'owner'], permissions: ['chat.moderate'] })
  }
}
```

Chaque invocation est vérifiée contre la requête qui la porte — chacune arrive
dans son propre POST — et non contre celle qui a ouvert le flux : un rôle retiré
depuis cesse de fonctionner à l'appel suivant, et un rôle accordé fonctionne
sans reconnexion. `ctx.auth` dans la méthode est celui de cette même requête.
Un POST doit venir de l'utilisateur qui a ouvert le flux, et un flux ouvert
anonymement n'accepte que des POST anonymes (`403 E_RELAY_NOT_OWNER`).

`guards` nomme les gardes par lesquels la requête a pu s'authentifier — ce que
Warden expose comme `auth.authenticatedViaGuard`. `roles` est satisfait par
**n'importe lequel** des noms, `permissions` par
**tous**. L'asymétrie est voulue, et c'est le même partage que le pipeline HTTP,
le routeur RPC et le moteur GraphQL : un rôle dit qui on est — un admin *ou* un
propriétaire peut agir — tandis qu'une permission dit ce qu'une action exige, et
elle les exige toutes.

`onConnect` / `onDisconnect` sont des hooks de cycle de vie, non invocables.
Monter deux fois le même chemin lève une erreur au lieu de remplacer le premier
hub.

### Arguments d'invocation

Une méthode de hub reçoit **tous** les arguments envoyés par le client :

```ts
class MathHub extends Hub {
  async onSum(ctx: HubContext, a: number, b: number, c: number) {
    return a + b + c
  }
}

// client : await connection.invoke('Sum', 1, 2, 3)   // → 6
```

Une méthode qui déclare un seul paramètre n'est pas affectée — les arguments en
trop sont simplement ignorés, comme dans tout appel JavaScript. Seul le premier
argument passait jusqu'ici, et les autres disparaissaient sans que rien ne le
signale.

Le nom est comparé sans tenir compte de la casse, comme l'attendent les clients
SignalR : `invoke('Sum')`, `invoke('sum')` et `invoke('SUM')` atteignent tous
`onSum`. Deux méthodes dont les noms ne diffèrent que par la casse répondraient à
la même invocation : le hub refuse alors de se construire.

### Ce qui n'est pas supporté

Le streaming n'est pas implémenté. Une `StreamInvocation` reçoit une
**Completion d'erreur** qui en nomme la raison, au lieu d'être jetée :
l'identifiant d'invocation est la poignée qu'attend l'observable du client, et
le protocole promet une Completion — en jeter une laisse donc l'observable
suspendu pour toute la durée de la connexion.

`StreamItem` et `CancelInvocation` sont ignorés, ce qui est la réponse correcte
pour les deux — un item appartient à un flux dont l'invocation d'ouverture a
déjà été refusée, et une annulation vise un flux qui n'a jamais démarré.

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
