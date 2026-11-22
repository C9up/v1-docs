# Pages pilotées par le serveur

Ce guide couvre les pages pilotées par le serveur, comet et relay sur le téléphone :

- Pages pilotées par le serveur
- Comet et relay

## Pages pilotées par le serveur

```ts
import { serverPages } from '@c9up/orbit/pages'
import Home from './pages/Home.js'
import Orders from './pages/Orders.js'

run(() => html`${serverPages({ server: 'https://app.example', pages: { Home, Orders } })}`)
```

Le serveur ream reste le routeur. L'app lui demande l'objet de la première
page, puis chaque lien ou `router.visit()` demande le suivant par le protocole
de [photon](/fr/guides/frontend/photon/) — celui que parle le navigateur avec
[`visits: true`](/fr/guides/frontend/aurora/) d'aurora. Le même contrôleur répond au
navigateur et au téléphone ; le téléphone affiche la page nommée, un composant
aurora livré avec l'app. Une page qui importe depuis `@c9up/aurora` et
`@c9up/photon/client/core` est le module même que charge le navigateur.

- Chaque page est un écran d'une pile : une visite vers une nouvelle adresse
  en fait glisser un ; un rechargement partiel, une prop différée ou une
  redirection vers la même adresse le remplace sur place.
- Le bouton retour passe par l'historique de photon : la page couverte
  revient telle qu'on l'a laissée, sans requête.
- Une version périmée (le serveur a été redéployé) repart de la page demandée,
  comme le chargement complet d'un navigateur.
- Les requêtes portent le cookie de session et renvoient le `XSRF-TOKEN` posé
  par le serveur. Un lien hors du serveur part vers `open(url)`.
- Un `<a href>` dans une vue est une cible tactile à part entière (dans un
  bloc, chaque lien prend sa ligne) ; un lien au milieu d'une phrase
  (`<p>… <a>…</a> …</p>`) n'est pas encore pressable.
- `server` (une origine, ou la connexion ci-dessous) doit être en https. Le http simple n'atteint que cette machine
  (`localhost`, via `adb reverse`) ou l'hôte de l'émulateur (`10.0.2.2`), et
  l'app doit alors autoriser le trafic en clair.
- `loading` remplace l'écran vide affiché jusqu'à la première page ;
  `failed(error, retry)` remplace l'écran d'échec par défaut.

Le `URL` de React Native résout une référence relative en l'ajoutant au bout
de sa base ; l'entrée de l'app en installe un standard (`installStandardUrl()`
pour une app câblée à la main).

## Comet et relay

Le serveur de l'app est une seule connexion, par laquelle passent les pages,
les appels comet et les abonnements relay :

```ts
import { connectServer } from '@c9up/orbit'
import { serverPages } from '@c9up/orbit/pages'
import { createRpcClient } from '@c9up/comet/client'
import { configureRelay, relay } from '@c9up/aurora/relay'

const server = connectServer('https://app.example')

const rpc = createRpcClient({ url: server.url('/rpc'), transport: server.json })
configureRelay({
  sseUrl: server.url('/__relay/events'),
  subscribeUrl: server.url('/__relay/subscribe'),
  unsubscribeUrl: server.url('/__relay/unsubscribe'),
  stream: server.stream,
  fetch: server.fetch,
})

run(() => html`${serverPages({ server, pages })}`)
```

- `server.fetch` n'atteint que l'origine du serveur, envoie le cookie de
  session et renvoie sur chaque mutation le `XSRF-TOKEN` posé par le serveur —
  ce qu'un navigateur fait pour une page, et qu'il faut donner à une app.
- `server.json` est le transport de comet : un POST JSON, sa réponse JSON.
- `server.stream` lit les événements envoyés par le serveur dans le XHR en flux
  de React Native, comme les lit `EventSource` (événements nommés, `retry:`,
  `Last-Event-ID` à la reconnexion) ; une réponse qui n'est pas un flux
  d'événements l'arrête pour de bon.
- `server.authorize(token)` envoie `Authorization: Bearer <token>` avec chaque
  requête et chaque flux à partir de là ; avec un `tokenStore` (plus bas), le
  jeton est gardé et `server.restore()` reconnecte au lancement suivant — le jeton d'une API, que le
  téléphone, contrairement à l'`EventSource` d'un navigateur, peut aussi
  envoyer sur le flux d'événements.
