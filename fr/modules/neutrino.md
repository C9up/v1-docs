# Neutrino — Protocol Buffers et gRPC

`@c9up/neutrino` donne à une application un **contrat de schéma partagé entre langages** : un même `.proto` pour le serveur et ses clients non-JS — une application mobile, un service en Go ou en Rust — au lieu d'une forme JSON documentée à la main.

Un neutrino traverse presque tout sans être arrêté : celui-ci fait passer un message d'un langage à l'autre. Ce n'est pas une affaire de vitesse. JSON reste le format par défaut du web, et une application qui n'utilise pas Neutrino ne l'installe jamais.

Ce qu'il fait :

- il charge des **schémas compilés** — jeux de descripteurs ou fichiers générés — et encode / décode les messages ;
- il sert du **gRPC sur le port HTTP de l'application** : une requête dont le content-type est `application/grpc` est un appel gRPC, tout le reste reste du HTTP ;
- il protège ces appels par des **intercepteurs** — authentification et limite de débit — puisque les middlewares ne les voient pas.

## Installation

```sh
pnpm add @c9up/neutrino
```

## Schémas

Neutrino lit des schémas compilés, pas le texte d'un `.proto`. Deux formes, utilisables ensemble :

- un `FileDescriptorSet` binaire, tel que l'écrivent `buf build -o app.binpb` ou `protoc --include_imports --descriptor_set_out=app.binpb app.proto` ;
- les fichiers générés par `protoc-gen-es`, qui donnent en plus des messages et des services **typés**.

Les deux se produisent avec `buf` et `protoc-gen-es`, installés depuis npm — rien à installer sur la machine :

```sh
pnpm add -D @bufbuild/buf @bufbuild/protoc-gen-es
```

```yaml
# buf.yaml
version: v2
modules:
  - path: proto
```

```yaml
# buf.gen.yaml
version: v2
plugins:
  - local: protoc-gen-es
    out: app/generated
    opt:
      - target=ts
      - import_extension=js
```

```sh
pnpm buf generate                  # proto/*.proto → app/generated/*_pb.ts
pnpm buf build -o proto/app.binpb  # le jeu de descripteurs, si vous en chargez un
```

La génération est une étape côté serveur : les fichiers générés sont des modules ordinaires, et rien de ce qui arrive au navigateur n'a besoin d'une compilation pour fonctionner.

Les messages sont ceux de [`@bufbuild/protobuf`](https://github.com/bufbuild/protobuf-es). Le décodage ne génère aucun code à l'exécution — il fonctionne sous un `script-src` sans `'unsafe-eval'`, celui de Blackhole par défaut —, garde les champs qu'il ne connaît pas et s'arrête à 100 niveaux d'imbrication.

## Configuration

```ts
// config/protobuf.ts
import { defineConfig } from '@c9up/neutrino'
import app from '@c9up/ream/services/app'
import { file_echo } from '#generated/echo_pb.js'

export default defineConfig({
  descriptorSets: [app.makePath('proto/app.binpb')],
  files: [file_echo],
})
```

`defineConfig` refuse une configuration qui ne charge aucun schéma.

Deux sources qui déclarent **le même type différemment** arrêtent le démarrage avec `E_NEUTRINO_DUPLICATE_TYPE`, en les nommant toutes les deux. Sans ça, une copie périmée d'un `.proto` chargée après la bonne décoderait chaque message de ce type avec les mauvais champs. Le même fichier chargé deux fois est accepté, comparé sur ce qui compte pour le format des messages : les positions du source que `buf` garde dans un jeu de descripteurs ne comptent pas.

## Enregistrer le provider

```ts
// reamrc.ts
providers: [() => import('@c9up/neutrino/provider')]
```

Les schémas se chargent au **démarrage** : un fichier manquant ou un conflit arrête le lancement, plutôt que la première requête qui a besoin d'un type. Le provider lie les schémas sous `protobuf` et les services gRPC sous `grpc`, et confie le répartiteur gRPC au serveur.

## Encoder et décoder

```ts
import { create } from '@bufbuild/protobuf'
import protobuf from '@c9up/neutrino/services/main'
import { SayRequestSchema } from '#generated/echo_pb.js'

const bytes = protobuf.encode(SayRequestSchema, create(SayRequestSchema, { text: 'hi' }))
const request = protobuf.decode(SayRequestSchema, bytes)

protobuf.message('echo.SayRequest') // un schéma par nom de type
protobuf.service('echo.Echo')       // un service par nom
protobuf.method('/echo.Echo/Say')   // une méthode par chemin gRPC : entrée, sortie, type
```

Des octets qui ne se décodent pas — tronqués, mal formés, UTF-8 invalide dans une chaîne, trop imbriqués — lèvent `InvalidMessageError` (`E_NEUTRINO_INVALID_MESSAGE`) : l'erreur à laquelle un transport répond par une erreur client.

## Services gRPC

Les services s'enregistrent dans un preload, qui s'exécute après le démarrage du provider :

```ts
// start/grpc.ts
import { GrpcError, GrpcStatus } from '@c9up/neutrino'
import grpc from '@c9up/neutrino/services/grpc'
import { Echo } from '#generated/echo_pb.js'

grpc.service(Echo, {
  say(request) {
    if (request.times > 100) {
      throw new GrpcError(GrpcStatus.INVALID_ARGUMENT, 'times must be at most 100')
    }
    return { text: request.text.repeat(request.times) }
  },
})
```

- Avec un service généré par `protoc-gen-es`, requêtes et réponses sont **typées** depuis le `.proto` : une mauvaise réponse, une méthode mal orthographiée ou une méthode en streaming sont des erreurs de compilation.
- Un service venu d'un jeu de descripteurs s'obtient par `protobuf.service('echo.Echo')` ; ses requêtes sont des messages non typés.
- Une implémentation peut être un objet littéral ou une instance de classe ; ses méthodes sont appelées sur elle.
- Une méthode absente répond `UNIMPLEMENTED`.
- Une `GrpcError` est répondue avec son statut et son message. **Toute autre erreur répond `INTERNAL`, sans son message**, et elle est signalée — à `console.error`, sauf si `new GrpcServices(protobuf, { onError })` en décide autrement.
- L'enregistrement refuse ce qui échouerait plus tard en silence : un nom de méthode mal orthographié, une méthode en streaming, un service enregistré deux fois.

**Méthodes unaires seulement** pour l'instant. Les méthodes en streaming sont refusées à l'enregistrement.

Chaque appel traverse une seule fois vers JavaScript, en octets. Le message est limité à 4 Mio (au-delà, la réponse est `OUT_OF_RANGE`) et ne passe ni par la limite de taille du corps HTTP ni par le bodyparser.

## Protéger les appels

**Les middlewares et le routeur ne voient jamais un appel gRPC.** L'authentification, la limite de débit, tout ce qu'un middleware fait pour le HTTP doit être refait pour le gRPC — avec des intercepteurs.

Un intercepteur s'exécute autour de chaque appel pour lequel il est enregistré, **avant même le décodage de la requête** : un appel qu'il refuse ne fait jamais lire ses octets. Il refuse en levant une `GrpcError`, laisse passer en renvoyant `next()`, et transmet une valeur à la méthode par une `GrpcContextKey`.

```ts
grpc.use(async (context, next) => {          // tous les services
  if (context.ip.startsWith('10.')) return next()
  throw new GrpcError(GrpcStatus.PERMISSION_DENIED, 'internal only')
})

grpc.service(Admin, impl, { interceptors: [audit] })   // ce service seulement
```

Les intercepteurs s'exécutent dans l'ordre : ceux de `use()`, puis ceux du service. Un appel à une méthode que personne ne sert répond `UNIMPLEMENTED` sans en exécuter aucun.

Deux sont fournis. Les deux reçoivent l'objet qui protège par sa forme, si bien que Neutrino n'importe ni Warden ni Blackhole :

```ts
import app from '@c9up/ream/services/app'
import auth from '@c9up/warden/services/main'
import { bearerAuth, rateLimit } from '@c9up/neutrino'

grpc.use(rateLimit(await app.container.make('blackhole')))

const signedIn = bearerAuth(auth, { guard: 'jwt' })
grpc.service(
  Account,
  { me: (_request, context) => ({ id: signedIn.user(context).id }) },
  { interceptors: [signedIn.interceptor] },
)
```

- **`bearerAuth(verifier, { guard })`** vérifie `authorization: Bearer <jeton>` avec tout objet doté de `verify(token, guard)` — le gestionnaire d'authentification de Warden tel quel. Un jeton absent, mal formé ou refusé répond `UNAUTHENTICATED` ; un vérificateur qui plante répond `INTERNAL`. `signedIn.user(context)` renvoie l'utilisateur, et **échoue fermé** dans une méthode que l'intercepteur ne protège pas.
- **`rateLimit(limiter, { keyFor })`** compte avec tout objet doté de `checkRateLimit(key)` — Blackhole avec un `rateLimit.store` configuré. Au-delà de la limite, l'appel répond `RESOURCE_EXHAUSTED`. La clé est par défaut l'IP du client, celle sous laquelle Blackhole compte les requêtes HTTP : avec le même store, un client a un seul budget pour les deux. Sans store, Blackhole compte dans son moteur natif, par requête HTTP, et ce compteur n'est pas accessible depuis un appel gRPC.

## En production

Terminez TLS au reverse proxy et transmettez le gRPC en HTTP/2 non chiffré vers le port où va le trafic HTTP. Avec nginx :

```nginx
server {
  listen 443 ssl;
  http2 on;
  location / {
    if ($content_type ~ "^application/grpc") {
      grpc_pass grpc://127.0.0.1:3000;
    }
    proxy_pass http://127.0.0.1:3000;
  }
}
```

Les services du même réseau peuvent appeler directement le port de l'application : il accepte HTTP/2 sans TLS.

## Pas encore là

- **Méthodes en streaming** — serveur, client et bidirectionnel.
- **gRPC-web** — les navigateurs ne parlent pas gRPC directement.
- **Protobuf sur REST** — un corps `application/x-protobuf` sur une route ordinaire.
