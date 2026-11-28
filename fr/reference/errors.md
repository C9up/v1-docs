# Erreurs

Ce guide couvre tous les codes d'erreur :

- Format des erreurs
- Erreurs Container
- Erreurs Router
- Erreurs WebSocket
- Erreurs Pipeline
- Erreurs HTTP
- Erreurs Session
- Erreurs Application
- Erreurs Console
- Erreurs Scheduler
- Erreurs Events
- Erreurs RPC et GraphQL
- Erreurs Client HTTP
- Erreurs Archive
- Erreurs Atlas
- Erreurs Atom
- Erreurs Aurora
- Erreurs Bay
- Erreurs Blackhole
- Erreurs Chronos
- Erreurs Comet
- Erreurs Echo
- Erreurs Eclipse
- Erreurs Eon
- Erreurs Ephemeris
- Erreurs Flare
- Erreurs Goldstone
- Erreurs du plugin Helix
- Erreurs Helix
- Erreurs Inker
- Erreurs Lumen
- Erreurs Nebula
- Erreurs Neutrino
- Erreurs Nova
- Erreurs Orbit
- Erreurs Orbit Clipboard
- Erreurs Orbit Secure Store
- Erreurs Parsec
- Erreurs Photon
- Erreurs Prism
- Erreurs Quasar
- Erreurs Ream MCP
- Erreurs Relay
- Erreurs Robledo
- Erreurs Rosetta
- Erreurs Rover
- Erreurs Rune
- Erreurs Sigil
- Erreurs Spectrum
- Erreurs Station
- Erreurs Transit
- Erreurs Vellum
- Erreurs Visa
- Erreurs Warden

Chaque erreur du framework porte un `code` stable qui commence par `E_`. Les codes
propres à un paquet ajoutent le nom du paquet (`E_ATLAS_EMPTY_SELECT`,
`E_WARDEN_MFA_REQUIRED`) ; quelques identifiants partagés gardent une forme simple
(`E_ROW_NOT_FOUND`, `E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Cherchez le
code ci-dessous : chacun a sa propre ancre, le code en minuscules avec `-` à la
place de `_` (`#e-atlas-empty-select`), et c'est là que pointe le `docsUrl` d'une
erreur.

Les codes de `@c9up/ream` lui-même viennent d'abord, puis ceux de chaque paquet,
par ordre alphabétique. La colonne **HTTP** donne le statut avec lequel l'erreur
répond ; `—` signifie que ce n'est pas une réponse HTTP mais une erreur levée vers
l'appelant (configuration, programmation ou exécution).

## Format des erreurs

Les erreurs levées par le cœur du framework affichent un encadré de
diagnostic en développement :

```
┌──────────────────────────────────────────────┐
│ [E_CONTAINER_NOT_FOUND] No binding found for 'mailer'. Did you mean 'mail'?
│
│ Hint: Register it with container.singleton() or decorate with @inject().
│ Docs: https://reamjs.com/en/reference/errors#e-container-not-found
└──────────────────────────────────────────────┘
```

Une erreur levée dans le pipeline de requête ajoute une ligne
`Pipeline: <n>/<total> (<étape>)`. En production, seuls le code et le message
sont affichés.

Une erreur HTTP répond `{ "error": { "code": "…", "message": "…" } }` avec le
`status` de l'erreur.

## Erreurs Container

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-container-not-found"></span>`E_CONTAINER_NOT_FOUND` | 500 | Aucun binding trouvé pour le token demandé. Inclut des suggestions « vouliez-vous dire ? » pour les fautes de frappe. Enregistrez-le avec `container.singleton()` ou décorez la classe avec `@inject()`. |
| <span id="e-circular-dependency"></span>`E_CIRCULAR_DEPENDENCY` | 500 | Dépendance circulaire (ou alias circulaire) détectée pendant la résolution. Utilisez des factories explicites ou découplez via des événements. |
| <span id="e-container-missing-metadata"></span>`E_CONTAINER_MISSING_METADATA` | 500 | Une classe déclare des paramètres de constructeur mais le conteneur ne trouve aucune métadonnée de dépendance pour eux. Activez les métadonnées de décorateurs, annotez les paramètres avec `@inject()`, ou déclarez `static containerInjections`. |
| <span id="e-container-reserved-token"></span>`E_CONTAINER_RESERVED_TOKEN` | 500 | Le nom du token se lit comme une clé d'`Object.prototype` (`constructor`, `__proto__`…). Choisissez un autre nom. |
| <span id="e-container-missing-asks-for"></span>`E_CONTAINER_MISSING_ASKS_FOR` | 500 | `container.when(...).provide()` a été appelé avant `asksFor()` : la liaison contextuelle ne dit pas quelle dépendance elle remplace. |
| <span id="e-container-method-not-callable"></span>`E_CONTAINER_METHOD_NOT_CALLABLE` | 500 | `container.call()` a nommé un membre de l'instance qui n'est pas une méthode. |
| <span id="e-container-invalid-decorator-target"></span>`E_CONTAINER_INVALID_DECORATOR_TARGET` | 500 | `@Service()` ou `@inject()` a été posé sur autre chose qu'une classe (ou, pour `@inject()`, l'une de ses méthodes). |

## Erreurs Router

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-route-not-found"></span>`E_ROUTE_NOT_FOUND` | 404 | Aucune route ne correspond à la méthode et au chemin demandés. Le message est `Cannot GET:/chemin`. |
| <span id="e-duplicate-route"></span>`E_DUPLICATE_ROUTE` | 500 | Deux routes déclarent la même méthode et le même chemin. |
| <span id="e-duplicate-route-name"></span>`E_DUPLICATE_ROUTE_NAME` | 500 | Deux routes portent le même nom. |
| <span id="e-missing-route-name"></span>`E_MISSING_ROUTE_NAME` | 500 | Un groupe nommé préfixe une route qui n'a pas de nom. Nommez chaque route d'un groupe nommé. |
| <span id="e-invalid-route-domain"></span>`E_INVALID_ROUTE_DOMAIN` | 500 | Un domaine de route a un paramètre sans nom, ou deux fois le même paramètre. |
| <span id="e-unregistered-controller"></span>`E_UNREGISTERED_CONTROLLER` | 500 | Une route nomme par une chaîne un contrôleur qui n'est pas enregistré. |
| <span id="e-no-view-engine"></span>`E_NO_VIEW_ENGINE` | 500 | `router.on(path).render()` est utilisé alors qu'aucun moteur de templates n'est installé. |
| <span id="e-validator-not-found"></span>`E_VALIDATOR_NOT_FOUND` | 500 | Une route nomme un validateur qui n'est pas enregistré. |
| <span id="e-invalid-controller-reference"></span>`E_INVALID_CONTROLLER_REFERENCE` | 500 | Une chaîne de handler de route n'a pas la forme `'Controller.method'`. |
| <span id="e-invalid-resource-name"></span>`E_INVALID_RESOURCE_NAME` | 500 | `router.resource()` a reçu un nom vide. |
| <span id="e-controller-method-not-found"></span>`E_CONTROLLER_METHOD_NOT_FOUND` | 500 | Le contrôleur que nomme une route n'a pas cette méthode. Répond 500. |
| <span id="e-missing-route-params"></span>`E_MISSING_ROUTE_PARAMS` | 500 | Une URL a été construite pour une route sans l'un de ses paramètres requis. |
| <span id="e-cannot-lookup-route"></span>`E_CANNOT_LOOKUP_ROUTE` | 500 | `urlFor()`, `findOrFail()` ou le `visit()` du client de test a nommé une route qui n'existe pas. |
| <span id="e-empty-gate-requirement"></span>`E_EMPTY_GATE_REQUIREMENT` | 500 | `.guard()`, `.role()` ou `.permission()` a été appelé sans argument, ou un groupe de routes, un groupe RPC, `config/rpc.ts`, `config/openapi.ts` ou un resolver GraphQL a reçu une liste `guards`, `roles` ou `permissions` vide. Une exigence vide ne protégerait rien. Levée là où la route, la méthode ou le resolver est déclaré ; pour une action de contrôleur dont le `@Role()`, le `@Permission()` ou le `@Guard()` ne nomme rien, à chaque requête vers elle. |

## Erreurs WebSocket

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-websocket-upgrade-required"></span>`E_WEBSOCKET_UPGRADE_REQUIRED` | 426 | Une requête ordinaire a atteint une route WebSocket. |
| <span id="e-websocket-unsupported"></span>`E_WEBSOCKET_UNSUPPORTED` | 501 | Une route WebSocket a été atteinte sur un serveur qui ne sait pas tenir de WebSocket. |
| <span id="e-websocket-bad-handshake"></span>`E_WEBSOCKET_BAD_HANDSHAKE` | 400 | La poignée de main n'est pas un GET HTTP/1.1, n'a pas `Connection: upgrade`, ou sa `Sec-WebSocket-Key` ne fait pas 16 octets. Répondu par le serveur, avant le routage. |
| <span id="e-websocket-version"></span>`E_WEBSOCKET_VERSION` | 426 | Une version de WebSocket autre que 13. Répondu avec `Sec-WebSocket-Version: 13`, avant le routage. |
| <span id="e-websocket-origin"></span>`E_WEBSOCKET_ORIGIN` | 403 | Une origine de navigateur que `http.webSocket.allowedOrigins` n'autorise pas (même origine par défaut). Répondu avant le routage. |
| <span id="e-websocket-protocol"></span>`E_WEBSOCKET_PROTOCOL` | 500 | `socket.acceptProtocol()` a nommé un sous-protocole que le client n'a pas proposé. |
| <span id="e-websocket-not-registered"></span>`E_WEBSOCKET_NOT_REGISTERED` | 500 | Une réponse `101` sans socket enregistré. |
| <span id="e-websocket-not-upgrade"></span>`E_WEBSOCKET_NOT_UPGRADE` | 500 | Un `101` en réponse à une requête qui n'était pas une poignée de main WebSocket. |
| <span id="e-websocket-register"></span>`E_WEBSOCKET_REGISTER` | 500 | Le serveur natif a refusé un nouvel identifiant de socket. |
| <span id="e-websocket-context"></span>`E_WEBSOCKET_CONTEXT` | 500 | Le handler d'une route WebSocket a tourné sans son socket (appelé hors du kernel). |
| <span id="e-websocket-close-code"></span>`E_WEBSOCKET_CLOSE_CODE` | 500 | `socket.close()` avec un code qu'une trame de fermeture ne peut pas porter (RFC 6455 §7.4). |
| <span id="e-websocket-close-reason"></span>`E_WEBSOCKET_CLOSE_REASON` | 500 | Une raison de fermeture de plus de 123 octets. |
| <span id="e-invalid-websocket-config"></span>`E_INVALID_WEBSOCKET_CONFIG` | 500 | Une limite WebSocket native de 0 octet. |
| <span id="e-test-client-websocket-refused"></span>`E_TEST_CLIENT_WEBSOCKET_REFUSED` | 500 | La poignée de main WebSocket du client de test a été refusée (`WebSocketRefused` porte le `status`) ou a échoué. |

## Erreurs Pipeline

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-pipeline-unknown-middleware"></span>`E_PIPELINE_UNKNOWN_MIDDLEWARE` | 500 | Une route référence un middleware nommé non enregistré. Enregistrez-le avec `middleware.register()`. |
| <span id="e-middleware-not-found"></span>`E_MIDDLEWARE_NOT_FOUND` | 500 | Une route, une méthode RPC ou un résolveur GraphQL nomme un middleware que rien ne déclare. Déclarez-le avec `router.named()` (ou `middleware.register()`). Les noms d'une route HTTP sont vérifiés à la construction du kernel : l'application s'arrête au démarrage, et le message nomme la route. |
| <span id="e-middleware-entry"></span>`E_MIDDLEWARE_ENTRY` | 500 | Une entrée de middleware sans paramètre déclaré a été lue comme un import différé, et elle ne mène pas à un module avec un export par défaut. |
| <span id="e-pipeline-double-next"></span>`E_PIPELINE_DOUBLE_NEXT` | 500 | Un middleware a appelé `next()` plus d'une fois. Chaque middleware doit appeler `next()` au plus une fois. |
| <span id="e-pipeline-error"></span>`E_PIPELINE_ERROR` | 500 | Un handler a levé une erreur qui ne porte aucun code du framework. L'erreur garde la position de l'étape dans son contexte. |
| <span id="e-validator-unusable"></span>`E_VALIDATOR_UNUSABLE` | 500 | Un validateur de route n'expose ni `validateResultAsync()`, ni `validateResult()`, ni `validate()`. |

## Erreurs HTTP

Levées par les exceptions de `@c9up/ream` et par son serveur HTTP natif. Les refus du serveur lui-même sont répondus avant tout middleware.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unknown"></span>`E_UNKNOWN` | 500 | Le code par défaut d'une `Exception` qui n'en fixe aucun, et d'une erreur reconstruite depuis la couche native sans code. |
| <span id="e-http-exception"></span>`E_HTTP_EXCEPTION` | 500 | Une erreur HTTP générique qui porte le `body` de la réponse. `E_HTTP_EXCEPTION.invoke(body, status, code?)` en construit une : le message est le corps s'il est une chaîne, ou le `message` d'un corps objet. |
| <span id="e-http-request-aborted"></span>`E_HTTP_REQUEST_ABORTED` | 400 | La classe que lève `response.abort()` (ou `abortIf` / `abortUnless`) ; le corps donné part avec le statut donné, 400 par défaut. Elle étend `E_HTTP_EXCEPTION` et en porte le code. |
| <span id="e-validation-error"></span>`E_VALIDATION_ERROR` | 422 | Les données de la requête n'ont pas passé la validation. Le message est `Validation failure`, `messages` porte une entrée par champ et par règle ; un formulaire de navigateur est renvoyé en arrière avec les erreurs en flash. |
| <span id="e-request-entity-too-large"></span>`E_REQUEST_ENTITY_TOO_LARGE` | 413 | Le corps de la requête dépasse la limite du body parser. Lire le corps brut d'une telle requête la lève aussi. |
| <span id="e-handler-failure"></span>`E_HANDLER_FAILURE` | 500 | Le gestionnaire d'exceptions a lui-même levé une erreur en rendant une erreur. |
| <span id="e-http-context-not-found"></span>`E_HTTP_CONTEXT_NOT_FOUND` | 500 | `HttpContext.getOrFail()` a été appelé hors d'une requête, ou avec le suivi du contexte ambiant désactivé. Passez `ctx` explicitement. |
| <span id="e-response-too-large"></span>`E_RESPONSE_TOO_LARGE` | 500 | Un corps de réponse dépasse le plafond configuré. Les corps sont gardés entiers en mémoire : servez un gros fichier en flux ou depuis le stockage. |
| <span id="e-bodyparser-config"></span>`E_BODYPARSER_CONFIG` | 500 | La configuration du body parser utilise une option qui n'est plus prise en charge. |
| <span id="e-bodyparser-invalid-size"></span>`E_BODYPARSER_INVALID_SIZE` | 500 | Une limite de taille de corps n'est ni un nombre d'octets ni une taille comme `'1mb'`. |
| <span id="e-bodyparser-invalid-json"></span>`E_BODYPARSER_INVALID_JSON` | 400 | Un corps JSON est mal formé (400), ou, avec `json.strict`, n'est ni un objet ni un tableau (422). |
| <span id="e-http-request-timeout"></span>`E_HTTP_REQUEST_TIMEOUT` | 408 | Le serveur natif n'a pas reçu le corps de la requête à temps. |
| <span id="e-request-aborted"></span>`E_REQUEST_ABORTED` | 400 | Le client a fermé la connexion pendant la lecture du corps. |
| <span id="e-path-traversal"></span>`E_PATH_TRAVERSAL` | 400 | Le serveur natif a trouvé `..` dans le chemin, brut ou encodé en pourcentage. |
| <span id="e-parameter-pollution"></span>`E_PARAMETER_POLLUTION` | 400 | Le serveur natif a trouvé deux fois la même clé dans la query string. |
| <span id="e-too-many-requests"></span>`E_TOO_MANY_REQUESTS` | 429 | La limite de débit du serveur natif a refusé la requête ; le corps porte `retryAfter`, avec les headers `Retry-After` et `X-RateLimit-*`. |
| <span id="e-stream-unknown"></span>`E_STREAM_UNKNOWN` | 500 | Un identifiant de flux server-sent events est inconnu du serveur. |
| <span id="e-response-invalid-header"></span>`E_RESPONSE_INVALID_HEADER` | 500 | Un nom ou une valeur d'en-tête contient CR, LF ou NUL, ce qui scinderait la réponse. |
| <span id="e-response-invalid-cookie"></span>`E_RESPONSE_INVALID_COOKIE` | 500 | Un cookie qu'un navigateur rejetterait ou lirait mal : un nom hors de la grammaire des noms de cookie, un `path` ou un `domain` hors de la grammaire des attributs, `sameSite: true`, `SameSite=None` ou `partitioned` sans `secure`, une date `expires` invalide, ou un bloc `http.cookie` avec une clé inconnue ou une valeur du mauvais type. |
| <span id="e-response-no-context"></span>`E_RESPONSE_NO_CONTEXT` | 500 | `response.redirect()` sur une réponse construite hors d'une requête. |
| <span id="e-response-sse-unsupported"></span>`E_RESPONSE_SSE_UNSUPPORTED` | 500 | `response.sse()` sur un serveur qui n'a pas de backend de flux. |
| <span id="e-redirect-no-router"></span>`E_REDIRECT_NO_ROUTER` | 500 | `redirect().toRoute()` sans résolveur d'URL de route branché. |
| <span id="e-stream-register"></span>`E_STREAM_REGISTER` | 500 | Le serveur a refusé un nouvel identifiant de flux d'événements serveur. |
| <span id="e-multipart-unsafe-file-name"></span>`E_MULTIPART_UNSAFE_FILE_NAME` | 500 | `file.move()` a reçu, ou a tiré du nom de fichier du client, un nom qui n'est pas un simple nom de fichier. |
| <span id="e-multipart-file-exists"></span>`E_MULTIPART_FILE_EXISTS` | 500 | `file.move()` a trouvé un fichier à la destination et `overwrite` est désactivé. |
| <span id="e-test-client-no-route-manifest"></span>`E_TEST_CLIENT_NO_ROUTE_MANIFEST` | 500 | Le `visit()` du client de test exige `routes: router.namedManifest()` dans les options du client. |
| <span id="e-test-client-timeout"></span>`E_TEST_CLIENT_TIMEOUT` | 500 | Une requête du client de test, ou un message WebSocket de test, n'est pas arrivé dans son délai. |
| <span id="e-test-client-missing-csrf-token"></span>`E_TEST_CLIENT_MISSING_CSRF_TOKEN` | 500 | `withCsrf()` a été appelé sans token et sans cookie CSRF posé. |
| <span id="e-test-client-no-auth-strategy"></span>`E_TEST_CLIENT_NO_AUTH_STRATEGY` | 500 | `withAuth()` ou `asUser()` a servi sans stratégie `auth` dans les options du client. |
| <span id="e-test-client-no-session-seeder"></span>`E_TEST_CLIENT_NO_SESSION_SEEDER` | 500 | `loginAs()` avec un guard de session, et aucun `sessionSeeder` dans les options du client. |
| <span id="e-test-client-unknown-serializer"></span>`E_TEST_CLIENT_UNKNOWN_SERIALIZER` | 500 | `serialize()` a nommé un sérialiseur qui n'est pas enregistré. |
| <span id="e-test-client-assertion-failed"></span>`E_TEST_CLIENT_ASSERTION_FAILED` | 500 | Une assertion sur la réponse du client de test a échoué. |
| <span id="e-unauthorized-access-ream"></span>`E_UNAUTHORIZED_ACCESS` | 403 | Le garde `.auth()` d'une route a refusé la requête, ou `.role()` / `.permission()` n'a trouvé aucun utilisateur authentifié. Mêmes code, statut, message (`Unauthorized access`) et rendu (`handle`) que celle de `@c9up/warden`. |
| <span id="e-authorization-failure-ream"></span>`E_AUTHORIZATION_FAILURE` | 403 | Le `.role()` ou le `.permission()` d'une route a refusé un utilisateur authentifié. Mêmes code, statut, message (`Access denied`) et rendu (`handle`) que celle de `@c9up/warden` ; les rôles et permissions demandés ne sont pas envoyés. |
| <span id="e-encoding-unsupported"></span>`E_ENCODING_UNSUPPORTED` | 415 | Un corps JSON, formulaire ou texte arrive avec un `Content-Encoding` autre que `identity`. Le parseur de corps ne décompresse pas les corps, gzip et deflate compris. |
| <span id="e-invalid-multipart-request"></span>`E_INVALID_MULTIPART_REQUEST` | 400 | Un corps `multipart/form-data` est mal formé, ou son paramètre `boundary` manque. |
| <span id="e-server-invalid-port"></span>`E_SERVER_INVALID_PORT` | 500 | Le serveur natif a reçu un port au-dessus de 65535. |
| <span id="e-server-invalid-host"></span>`E_SERVER_INVALID_HOST` | 500 | L'adresse d'écoute du serveur natif n'est ni une adresse IPv4 ou IPv6, ni `localhost`. |
| <span id="e-server-invalid-trusted-proxy"></span>`E_SERVER_INVALID_TRUSTED_PROXY` | 500 | Une entrée de `trustedProxies()` n'est ni une adresse, ni une plage CIDR, ni une plage avec masque, ni une plage nommée, ni `*`. Le serveur refuse de démarrer. |
| <span id="e-server-invalid-body-limit"></span>`E_SERVER_INVALID_BODY_LIMIT` | 500 | Une limite de corps passée au serveur natif n'est pas un nombre d'octets ou de parties positif ou nul. |
| <span id="e-server-bind-failed"></span>`E_SERVER_BIND_FAILED` | 500 | Le serveur natif n'a pas pu écouter sur son adresse : le port est pris, ou l'adresse n'est pas sur cette machine. |
| <span id="e-server-no-handler"></span>`E_SERVER_NO_HANDLER` | 500 | Le serveur natif a démarré avant qu'un handler de requêtes soit enregistré. |
| <span id="e-server-not-started"></span>`E_SERVER_NOT_STARTED` | 500 | Le port du serveur natif a été lu avant le démarrage du serveur. |
| <span id="e-server-lock-poisoned"></span>`E_SERVER_LOCK_POISONED` | 500 | Un verrou du serveur natif est resté empoisonné après une panique. C'est un bogue de Ream. |
| <span id="e-crypto-failed"></span>`E_CRYPTO_FAILED` | 500 | Un appel crypto natif (`hmacSign()`, `randomHex()`…) a échoué dans le moteur. |
| <span id="e-warden-mfa-required-ream"></span>`E_WARDEN_MFA_REQUIRED` | 403 | Le gate de route a atteint une action de contrôleur portant `@RequireMfa()` avec un credential qui n'a pas passé le step-up MFA (`ctx.auth.user.mfa` ne vaut pas `true`). Mêmes code, statut, message et corps que le middleware de `@c9up/warden` : `403 { error: { code, message } }`. |

## Erreurs Session

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-session-not-ready"></span>`E_SESSION_NOT_READY` | 500 | `session.<method>()` exige un store de session, et cette session a été construite sans. |
| <span id="e-session-store-not-configured"></span>`E_SESSION_STORE_NOT_CONFIGURED` | 500 | La configuration de session ne nomme aucun store. Fixez `store`, ou `store: 'memory'` pour des sessions gardées dans ce seul processus. |
| <span id="e-session-store-not-conditional"></span>`E_SESSION_STORE_NOT_CONDITIONAL` | 500 | Le store n'a pas d'`update()` : il ne peut pas réécrire une session seulement tant qu'elle existe, et une requête qui chevauche une déconnexion pourrait reconnecter l'utilisateur. |
| <span id="e-session-tagging-not-supported"></span>`E_SESSION_TAGGING_NOT_SUPPORTED` | 500 | Une méthode d'étiquetage de session a été appelée sur un store qui ne la prend pas en charge. Utilisez le store memory, redis ou database. |
| <span id="e-session-cookie-not-http-only"></span>`E_SESSION_COOKIE_NOT_HTTP_ONLY` | 500 | Le cookie de session est configuré avec `httpOnly: false`. Retirez-le : un script capable de lire le cookie change toute XSS en prise de compte. |
| <span id="e-session-template-engine-unusable"></span>`E_SESSION_TEMPLATE_ENGINE_UNUSABLE` | 500 | Le moteur de templates est installé mais les tags de session ne peuvent pas y être enregistrés. |
| <span id="e-session-missing-secret"></span>`E_SESSION_MISSING_SECRET` | 500 | Le store de session cookie n'a pas de secret. |
| <span id="e-session-missing-location"></span>`E_SESSION_MISSING_LOCATION` | 500 | Le store de session fichier n'a pas de `location`. |
| <span id="e-session-invalid-connection"></span>`E_SESSION_INVALID_CONNECTION` | 500 | La `connection` du store de session base de données n'a pas `query()` et `execute()`. |
| <span id="e-session-unknown-driver"></span>`E_SESSION_UNKNOWN_DRIVER` | 500 | La configuration de session nomme un driver qui n'existe pas. |
| <span id="e-session-invalid-gc-probability"></span>`E_SESSION_INVALID_GC_PROBABILITY` | 500 | `gcProbability` n'est pas un pourcentage entre 0 et 100. |
| <span id="e-session-invalid-table-name"></span>`E_SESSION_INVALID_TABLE_NAME` | 500 | Le nom de la table de session n'est pas un simple identifiant. |
| <span id="e-session-file-locked"></span>`E_SESSION_FILE_LOCKED` | 500 | Une autre requête a gardé le fichier de session verrouillé plus longtemps que le store n'attend. |
| <span id="e-session-quasar-missing"></span>`E_SESSION_QUASAR_MISSING` | 500 | Un store de session Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé. |
| <span id="e-session-incomplete-connection"></span>`E_SESSION_INCOMPLETE_CONNECTION` | 500 | La connexion quasar n'a pas les commandes qu'envoie un store de session. |

## Erreurs Application

Levées pendant l'assemblage, la configuration et le démarrage de l'application.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-env-variables"></span>`E_INVALID_ENV_VARIABLES` | 500 | `Env.create()` a trouvé des variables d'environnement qui ne respectent pas leur schéma. Le message est `Validation failed for one or more environment variables` ; `help` les liste une par ligne `- `, et `failures` les contient. |
| <span id="e-reamrc-unknown-option"></span>`E_REAMRC_UNKNOWN_OPTION` | 500 | `tests` dans `reamrc.ts` contient une option qui n'existe pas. |
| <span id="e-ignitor-already-started"></span>`E_IGNITOR_ALREADY_STARTED` | 500 | `warmUp()` a été appelé alors que l'application avait déjà dépassé cette phase. |
| <span id="e-ignitor-warmup-only"></span>`E_IGNITOR_WARMUP_ONLY` | 500 | Une application assemblée par `warmUp()` a été démarrée. Construisez un nouvel Ignitor pour en lancer une. |
| <span id="e-ignitor-invalid-port"></span>`E_IGNITOR_INVALID_PORT` | 500 | `PORT` n'est pas un entier entre 0 et 65535. |
| <span id="e-ignitor-invalid-http-config"></span>`E_IGNITOR_INVALID_HTTP_CONFIG` | 500 | Une limite `http.<clé>` n'est pas un nombre entier dans les bornes. |
| <span id="e-ignitor-no-server-factory"></span>`E_IGNITOR_NO_SERVER_FACTORY` | 500 | `httpServer()` a été appelé sans `serverFactory` dans la configuration. |
| <span id="e-ignitor-grpc-unsupported"></span>`E_IGNITOR_GRPC_UNSUPPORTED` | 500 | Un handler gRPC est enregistré, mais ce serveur ne sait pas servir gRPC. |
| <span id="e-server-grpc-already-set"></span>`E_SERVER_GRPC_ALREADY_SET` | 500 | Un second handler gRPC a été enregistré sur le serveur. |
| <span id="e-server-grpc-invalid-limit"></span>`E_SERVER_GRPC_INVALID_LIMIT` | 500 | Une limite de taille de message gRPC n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| <span id="e-ream-stub-syntax"></span>`E_REAM_STUB_SYNTAX` | 500 | Un template de stub a une erreur de syntaxe. |
| <span id="e-env-file-not-found"></span>`E_ENV_FILE_NOT_FOUND` | 500 | Une valeur `.env` `file:<chemin>` désigne un fichier qui n'existe pas. Le message nomme la variable et le chemin. |
| <span id="e-env-circular-reference"></span>`E_ENV_CIRCULAR_REFERENCE` | 500 | Des valeurs `.env` se citent en boucle (`A=$B`, `B=$A`). |
| <span id="e-identifier-already-defined"></span>`E_IDENTIFIER_ALREADY_DEFINED` | 500 | `Env.defineIdentifier()` a reçu un nom déjà enregistré (`file` est fourni). Utilisez `defineIdentifierIfMissing()` ou retirez d'abord l'identifiant. |
| <span id="e-app-missing-importer"></span>`E_APP_MISSING_IMPORTER` | 500 | `app.import()` / `app.importDefault(id)` a été appelé sur une application construite sans `importer`. |
| <span id="e-dump-die-exception"></span>`E_DUMP_DIE_EXCEPTION` | 500 | `dd()` a arrêté la requête (réponse avec un dump HTML) ou la commande (dump affiché). Jamais rapporté. |
| <span id="e-app-already-booted"></span>`E_APP_ALREADY_BOOTED` | 500 | `app.setMode()` ou `app.setEnvironment()` a été appelé après le boot de l'application. |
| <span id="e-app-root-not-set"></span>`E_APP_ROOT_NOT_SET` | 500 | `app.makePath()` (ou un autre helper de chemin) sur une application sans racine. |
| <span id="e-app-missing-default-export"></span>`E_APP_MISSING_DEFAULT_EXPORT` | 500 | Un module importé paresseusement (`app.importDefault()`, un listener paresseux, le contrôleur paresseux d'une route) n'a pas d'export par défaut. |
| <span id="e-app-shutdown-failed"></span>`E_APP_SHUTDOWN_FAILED` | 500 | Plusieurs hooks d'arrêt ont échoué ; l'erreur porte chaque échec dans `errors`. |
| <span id="e-service-not-booted"></span>`E_SERVICE_NOT_BOOTED` | 500 | Un accesseur `@c9up/ream/services/*`, `urlFor()` ou `signedUrlFor()` a servi avant que l'application ne le démarre. |
| <span id="e-env-path-no-file"></span>`E_ENV_PATH_NO_FILE` | 500 | `ENV_PATH` désigne un dossier qui ne contient aucun des fichiers `.env`. |
| <span id="e-migration-source-conflict"></span>`E_MIGRATION_SOURCE_CONFLICT` | 500 | Deux providers ont enregistré une source de migrations sous le même nom. |
| <span id="e-invalid-duration"></span>`E_INVALID_DURATION` | 500 | Une durée (âge de session, `maxAge` de cookie, expiration d'URL signée…) n'est ni un nombre ni une chaîne comme `'30m'`. |
| <span id="e-base64-malformed"></span>`E_BASE64_MALFORMED` | 500 | `base64.decode()` ou `base64.urlDecode()` en mode strict a rencontré une valeur malformée. |
| <span id="e-health-invalid-threshold"></span>`E_HEALTH_INVALID_THRESHOLD` | 500 | Un seuil de vérification de santé mémoire n'est pas une taille en octets, ou pas un pourcentage entre 0 et 100. |
| <span id="e-ream-stub-not-found"></span>`E_REAM_STUB_NOT_FOUND` | 500 | Aucun stub au chemin donné. |
| <span id="e-ream-stub-unsafe-path"></span>`E_REAM_STUB_UNSAFE_PATH` | 500 | Le chemin d'un stub, ou la destination qu'il déclare, est absolu ou sort de sa racine, ou la destination d'un générateur est un lien symbolique menant hors du projet ou vers rien. |
| <span id="e-ream-stub-no-destination"></span>`E_REAM_STUB_NO_DESTINATION` | 500 | Un stub ne déclare aucune destination (pas de ligne `to:` en front matter), ou une destination vide. |
| <span id="e-ream-stub-forbidden-key"></span>`E_REAM_STUB_FORBIDDEN_KEY` | 500 | Un template de stub lit ou écrit une clé qui lui est interdite (`constructor`, `__proto__`…). |
| <span id="e-ream-stub-evaluation"></span>`E_REAM_STUB_EVALUATION` | 500 | Un template de stub a échoué au rendu : un nom inconnu, une propriété de rien, un appel à ce qui n'est pas une fonction, `{{#each}}` sur ce qui n'est pas une liste. |
| <span id="e-codemods-file-not-found"></span>`E_CODEMODS_FILE_NOT_FOUND` | 500 | Un codemod a besoin de `reamrc.ts`, `start/kernel.ts` ou `start/env.ts` et le fichier n'existe pas. |
| <span id="e-codemods-unrecognized-source"></span>`E_CODEMODS_UNRECOGNIZED_SOURCE` | 500 | Un codemod n'a pas trouvé ce qu'il modifie dans le fichier (`providers: [`, `defineConfig({ ... })`, `router.use([`, `Env.create(...)`…). Faites la modification à la main. |
| <span id="e-codemods-unsafe-path"></span>`E_CODEMODS_UNSAFE_PATH` | 500 | Un codemod devait écrire hors du projet : un chemin absolu, `..`, un lien symbolique qui pointe dehors, ou un chemin de module dangereux. |
| <span id="e-codemods-invalid-option"></span>`E_CODEMODS_INVALID_OPTION` | 500 | Une option de codemod est hors domaine : la `position` ou le `tier` d'un middleware, l'environnement d'un preload. |
| <span id="e-codemods-invalid-env-variable"></span>`E_CODEMODS_INVALID_ENV_VARIABLE` | 500 | Un nom de variable d'environnement n'est pas un identifiant, ou sa valeur contient un saut de ligne. |
| <span id="e-codemods-invalid-env-validation"></span>`E_CODEMODS_INVALID_ENV_VALIDATION` | 500 | `defineEnvValidations()` a reçu un commentaire sur plusieurs lignes, ou une règle qui n'est pas une expression complète. |
| <span id="e-codemods-middleware-conflict"></span>`E_CODEMODS_MIDDLEWARE_CONFLICT` | 500 | Un middleware est déjà enregistré dans l'autre tier de `start/kernel.ts`. |
| <span id="e-ream-internal"></span>`E_REAM_INTERNAL` | 500 | Un invariant interne de `@c9up/ream` a cédé ; un bogue à signaler. |
| <span id="e-ream-napi-unsupported-platform"></span>`E_REAM_NAPI_UNSUPPORTED_PLATFORM` | 500 | Aucun binaire natif précompilé (scheduler, bus d'événements, GraphQL) n'existe pour cette plateforme et cette architecture. |
| <span id="e-ream-napi-load-failed"></span>`E_REAM_NAPI_LOAD_FAILED` | 500 | Un binaire natif de ream existe mais ne se charge pas (mauvaise plateforme, ABI Node ou fichier corrompu) ; `cause` est l'erreur du chargeur. |
| <span id="e-ream-napi-not-found"></span>`E_REAM_NAPI_NOT_FOUND` | 500 | Un binaire natif de ream est introuvable. Sur Alpine/musl : les binaires Linux précompilés visent la glibc. |
| <span id="e-missing-encrypter-key"></span>`E_MISSING_ENCRYPTER_KEY` | 500 | Le chiffrement, un cookie signé ou une URL signée a été utilisé et `APP_KEY` n'est pas défini. `help` nomme ce qui en avait besoin. |
| <span id="e-insecure-encrypter-key"></span>`E_INSECURE_ENCRYPTER_KEY` | 500 | `APP_KEY` fait moins de 16 caractères, ou est une clé connue de la génération de projet ou de la documentation. |
| <span id="e-missing-provider-file"></span>`E_MISSING_PROVIDER_FILE` | 500 | Une entrée `providers` de `reamrc.ts` n'a pas de `file`. |
| <span id="e-invalid-provider"></span>`E_INVALID_PROVIDER` | 500 | Une entrée `providers` de `reamrc.ts` a un `file` qui n'est pas une fonction. Un module de provider sans export par défaut, ou dont l'export par défaut n'est pas une classe, lève `E_RUNTIME_EXCEPTION`. |
| <span id="e-missing-preload-file"></span>`E_MISSING_PRELOAD_FILE` | 500 | Une entrée `preloads` de `reamrc.ts` n'a pas de `file`. |
| <span id="e-invalid-preload-file"></span>`E_INVALID_PRELOAD_FILE` | 500 | Une entrée `preloads` de `reamrc.ts` a un `file` qui n'est pas une fonction. |
| <span id="e-native-callback-failed"></span>`E_NATIVE_CALLBACK_FAILED` | 500 | Un callback JavaScript que le binding natif n'a pas pu garder : napi a refusé de l'envelopper. Le statut de napi est dans le message. |
| <span id="e-native-panic"></span>`E_NATIVE_PANIC` | 500 | Une panique Rust dans un binding natif, rattrapée avant d'arrêter le processus. C'est un bogue de Ream. Le scheduler la signale comme `E_SCHEDULER_NATIVE_ERROR`. |

## Erreurs Console

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-console-command-not-found"></span>`E_CONSOLE_COMMAND_NOT_FOUND` | 500 | Aucune commande ne porte ce nom. |
| <span id="e-console-missing-argument"></span>`E_CONSOLE_MISSING_ARGUMENT` | 500 | Un argument obligatoire n'a pas été donné. |
| <span id="e-console-missing-argument-value"></span>`E_CONSOLE_MISSING_ARGUMENT_VALUE` | 500 | Un argument a été donné sans valeur. |
| <span id="e-console-unexpected-argument"></span>`E_CONSOLE_UNEXPECTED_ARGUMENT` | 500 | Plus d'arguments que la commande n'en déclare. |
| <span id="e-console-unknown-flag"></span>`E_CONSOLE_UNKNOWN_FLAG` | 500 | Un flag que la commande ne déclare pas. |
| <span id="e-console-missing-flag"></span>`E_CONSOLE_MISSING_FLAG` | 500 | Un flag obligatoire n'a pas été donné. |
| <span id="e-console-missing-flag-value"></span>`E_CONSOLE_MISSING_FLAG_VALUE` | 500 | Un flag qui attend une valeur a été donné sans. |
| <span id="e-console-invalid-flag-value"></span>`E_CONSOLE_INVALID_FLAG_VALUE` | 500 | Une valeur de flag du mauvais type. |
| <span id="e-console-invalid-flag-group"></span>`E_CONSOLE_INVALID_FLAG_GROUP` | 500 | Des flags courts ont été groupés (`-abc`) avec un flag qui ne peut pas l'être. |
| <span id="e-console-not-interactive"></span>`E_CONSOLE_NOT_INTERACTIVE` | 500 | Une commande a posé une question alors que stdin n'est pas interactif. Passez la valeur en flag. |
| <span id="e-console-prompt-cancelled"></span>`E_CONSOLE_PROMPT_CANCELLED` | 500 | L'utilisateur a annulé une question. |
| <span id="e-console-empty-choices"></span>`E_CONSOLE_EMPTY_CHOICES` | 500 | Une question à choix a été posée sans aucune option. |
| <span id="e-console-invalid-trap-value"></span>`E_CONSOLE_INVALID_TRAP_VALUE` | 500 | Une réponse scriptée (un piège de question en test) a été rejetée par la validation de la question. |
| <span id="e-console-trap-out-of-range"></span>`E_CONSOLE_TRAP_OUT_OF_RANGE` | 500 | Un piège de question a choisi une option qui n'était pas proposée. |
| <span id="e-console-duplicate-command"></span>`E_CONSOLE_DUPLICATE_COMMAND` | 500 | Deux commandes revendiquent le même nom. |
| <span id="e-console-invalid-command"></span>`E_CONSOLE_INVALID_COMMAND` | 500 | Une entrée de `commands` dans `reamrc.ts` n'est ni un chargeur de commandes ni une classe de commande exportée par défaut. |
| <span id="e-console-invalid-command-metadata"></span>`E_CONSOLE_INVALID_COMMAND_METADATA` | 500 | Un chargeur de commandes a exporté des métadonnées qui ne décrivent pas une commande. |
| <span id="e-console-invalid-argument"></span>`E_CONSOLE_INVALID_ARGUMENT` | 500 | Une commande déclare ses arguments dans un ordre impossible à analyser : un argument après un argument spread, ou un obligatoire après un optionnel. |
| <span id="e-console-invalid-alias"></span>`E_CONSOLE_INVALID_ALIAS` | 500 | Un alias de commande ne se développe en rien. |
| <span id="e-console-late-global-flag"></span>`E_CONSOLE_LATE_GLOBAL_FLAG` | 500 | Un flag global a été déclaré après le démarrage du kernel. |
| <span id="e-console-late-loader"></span>`E_CONSOLE_LATE_LOADER` | 500 | Un chargeur de commandes a été ajouté après le démarrage du kernel. |
| <span id="e-console-kernel-running"></span>`E_CONSOLE_KERNEL_RUNNING` | 500 | Une commande tourne déjà dans ce kernel. |
| <span id="e-console-kernel-completed"></span>`E_CONSOLE_KERNEL_COMPLETED` | 500 | Le kernel a terminé ; il ne peut pas exécuter une autre ligne de commande. |
| <span id="e-console-not-booted"></span>`E_CONSOLE_NOT_BOOTED` | 500 | Une méthode de l'application console a été appelée avant le chargement des commandes. |
| <span id="e-console-no-app"></span>`E_CONSOLE_NO_APP` | 500 | Une commande a besoin de l'application et le kernel n'en a pas. Passez par le kernel console de l'Ignitor. |
| <span id="e-console-app-not-started"></span>`E_CONSOLE_APP_NOT_STARTED` | 500 | Une commande a utilisé l'application sans déclarer `startApp: true` dans ses options. |
| <span id="e-console-assertion-failed"></span>`E_CONSOLE_ASSERTION_FAILED` | 500 | Une assertion sur une commande lancée dans un test a échoué (`assertSucceeded()`, `assertLog()`, `assertTableRows()`…). |

## Erreurs Scheduler

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-schedule-invalid-cron"></span>`E_SCHEDULE_INVALID_CRON` | 500 | L'expression cron d'une tâche planifiée n'a pas pu être enregistrée. |
| <span id="e-schedule-invalid-target"></span>`E_SCHEDULE_INVALID_TARGET` | 500 | `@Schedule` a été posé sur une méthode statique. |
| <span id="e-schedule-symbol-method"></span>`E_SCHEDULE_SYMBOL_METHOD` | 500 | `@Schedule` a été posé sur une méthode à clé symbole. |
| <span id="e-schedule-anonymous-class"></span>`E_SCHEDULE_ANONYMOUS_CLASS` | 500 | Une classe anonyme déclare `@Schedule` ; ses noms de tâches entreraient en collision. |
| <span id="e-schedule-method-not-found"></span>`E_SCHEDULE_METHOD_NOT_FOUND` | 500 | Une méthode planifiée n'est pas appelable sur l'instance résolue par le conteneur. |
| <span id="e-schedule-invalid-callback"></span>`E_SCHEDULE_INVALID_CALLBACK` | 500 | `Scheduler.register()` a reçu autre chose qu'une fonction. |
| <span id="e-schedule-invalid-task-name"></span>`E_SCHEDULE_INVALID_TASK_NAME` | 500 | `Scheduler.register()` a reçu un nom de tâche vide. |
| <span id="e-schedule-invalid-lock-backend"></span>`E_SCHEDULE_INVALID_LOCK_BACKEND` | 500 | `lockBackend` n'implémente pas `acquire(name, ttlMs)` et `release(name)`. |
| <span id="e-schedule-invalid-lock-ttl"></span>`E_SCHEDULE_INVALID_LOCK_TTL` | 500 | `defaultLockTtlMs` n'est pas un nombre fini et positif. |
| <span id="e-schedule-invalid-event-sink"></span>`E_SCHEDULE_INVALID_EVENT_SINK` | 500 | `eventSink` n'implémente pas `emit(event)`. |
| <span id="e-schedule-invalid-error-reporter"></span>`E_SCHEDULE_INVALID_ERROR_REPORTER` | 500 | `errorReporter` n'est pas une fonction. |
| <span id="e-schedule-task-unknown"></span>`E_SCHEDULE_TASK_UNKNOWN` | 500 | `runTaskNow()` a nommé une tâche non enregistrée. |
| <span id="e-schedule-task-timeout"></span>`E_SCHEDULE_TASK_TIMEOUT` | 500 | Une tâche n'a pas fini dans son `timeoutMs` ; elle continue en arrière-plan. |
| <span id="e-schedule-provider-already-registered"></span>`E_SCHEDULE_PROVIDER_ALREADY_REGISTERED` | 500 | Le provider du scheduler a été enregistré deux fois sur le même conteneur. |
| <span id="e-scheduler-native-error"></span>`E_SCHEDULER_NATIVE_ERROR` | 500 | Un appel au scheduler natif a échoué. |
| <span id="e-schedule-quasar-missing"></span>`E_SCHEDULE_QUASAR_MISSING` | 500 | Le verrou du planificateur nomme une connexion quasar et `@c9up/quasar` n'est pas installé. |
| <span id="e-schedule-incomplete-connection"></span>`E_SCHEDULE_INCOMPLETE_CONNECTION` | 500 | La connexion quasar n'a pas les commandes qu'envoie un verrou du planificateur. |
| <span id="e-scheduler-invalid-cron"></span>`E_SCHEDULER_INVALID_CRON` | 500 | Le scheduler natif a refusé une expression cron (`INVALID_CRON` côté Rust). `help` rappelle la forme d'une expression cron. |
| <span id="e-scheduler-cron-no-fire"></span>`E_SCHEDULER_CRON_NO_FIRE` | 500 | Le scheduler natif a refusé une expression cron qui ne se déclenche jamais (`CRON_NO_FIRE` côté Rust). |
| <span id="e-scheduler-duplicate-task"></span>`E_SCHEDULER_DUPLICATE_TASK` | 500 | Le scheduler natif a déjà une tâche de ce nom (`DUPLICATE_TASK` côté Rust). |

## Erreurs Events

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-events-unsupported-store"></span>`E_EVENTS_UNSUPPORTED_STORE` | 500 | `config/events.ts` nomme un `store` autre que `'memory'`, le seul de ce build. |
| <span id="e-events-unsupported-option"></span>`E_EVENTS_UNSUPPORTED_OPTION` | 500 | `config/events.ts` contient une option que rien ne lit (`retries` compris), ou n'est pas un objet. |
| <span id="e-events-missing-listener-method"></span>`E_EVENTS_MISSING_LISTENER_METHOD` | 500 | Une classe listener n'a pas de méthode du nom sous lequel le listener a été enregistré. |
| <span id="e-events-invalid-argument"></span>`E_EVENTS_INVALID_ARGUMENT` | 500 | `onAny()` sans listener, ou `waitForChain()` sans noms d'événements. |
| <span id="e-events-assertion-failed"></span>`E_EVENTS_ASSERTION_FAILED` | 500 | Une assertion sur les événements a échoué (`assertEmitted()`, `assertNotEmitted()`, sur les helpers ou le `FakeBus`). |
| <span id="e-events-timeout"></span>`E_EVENTS_TIMEOUT` | 500 | Un événement, une chaîne d'événements ou la réponse à une requête factice attendus ne sont pas arrivés dans leur délai. |
| <span id="e-events-duplicate-request-handler"></span>`E_EVENTS_DUPLICATE_REQUEST_HANDLER` | 500 | `FakeBus.onRequest()` a reçu un second handler pour le même nom. |
| <span id="e-events-no-request-handler"></span>`E_EVENTS_NO_REQUEST_HANDLER` | 500 | `emitter.request()` ou `FakeBus.request()` a nommé une requête à laquelle aucun handler ne répond. |
| <span id="e-events-handler-failed"></span>`E_EVENTS_HANDLER_FAILED` | 500 | Un handler de requête a paniqué, ou a refusé la requête avec sa propre erreur. |
| <span id="e-events-bus-failed"></span>`E_EVENTS_BUS_FAILED` | 500 | Le bus d'événements natif a échoué : sa tâche a paniqué ou a été annulée, ou un événement n'a pas pu être sérialisé. |

## Erreurs RPC et GraphQL

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-rpc-invalid-method-name"></span>`E_RPC_INVALID_METHOD_NAME` | 500 | Un nom de méthode RPC est vide ou n'est pas une chaîne. |
| <span id="e-rpc-reserved-method-name"></span>`E_RPC_RESERVED_METHOD_NAME` | 500 | Une méthode RPC prend un nom réservé (`rpc.*`). |
| <span id="e-rpc-unknown-controller-method"></span>`E_RPC_UNKNOWN_CONTROLLER_METHOD` | 500 | Une route RPC nomme une méthode de contrôleur qui n'existe pas. |
| <span id="e-rpc-provider-already-registered"></span>`E_RPC_PROVIDER_ALREADY_REGISTERED` | 500 | Le provider RPC a été enregistré deux fois sur le même conteneur. |
| <span id="e-graphql-provider-already-registered"></span>`E_GRAPHQL_PROVIDER_ALREADY_REGISTERED` | 500 | Le provider GraphQL a été enregistré deux fois sur le même conteneur. |
| <span id="e-graphql-schema-not-found"></span>`E_GRAPHQL_SCHEMA_NOT_FOUND` | 500 | Le `schemaPath` GraphQL désigne un fichier qui n'existe pas. |
| <span id="e-graphql-invalid-schema"></span>`E_GRAPHQL_INVALID_SCHEMA` | 500 | Le schéma GraphQL ne se lit pas, déclare deux fois un type, ou nomme un type qu'il ne déclare pas. Chaque requête est alors refusée avec `GraphQL schema could not be read`, et la raison est journalisée. |
| <span id="e-graphql-serialize-failed"></span>`E_GRAPHQL_SERIALIZE_FAILED` | 500 | Le parseur GraphQL natif n'a pas pu sérialiser son résultat. |
| <span id="e-graphql-invalid-result"></span>`E_GRAPHQL_INVALID_RESULT` | 500 | Un resolver GraphQL a renvoyé une valeur que le type déclaré de son champ ne peut pas porter : un objet sous un `String`, autre chose qu'une liste sous `[Task]`, une valeur d'interface ou d'union dont le type objet n'est pas connu. Le champ échoue ; hors debug, le client lit `Internal server error`. |

## Erreurs Client HTTP

Levées par le client HTTP sortant.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-http-client-invalid-url"></span>`E_HTTP_CLIENT_INVALID_URL` | — | L'URL ne peut pas être analysée, n'est ni http ni https, ou porte des identifiants (envoyez-les dans un header). |
| <span id="e-http-client-private-address"></span>`E_HTTP_CLIENT_PRIVATE_ADDRESS` | — | L'hôte est, ou se résout en, une adresse qui n'est pas publique. |
| <span id="e-http-client-unreachable"></span>`E_HTTP_CLIENT_UNREACHABLE` | — | L'hôte n'a pas pu être joint. |
| <span id="e-http-client-timed-out"></span>`E_HTTP_CLIENT_TIMED_OUT` | — | La requête n'a pas abouti dans son délai. |
| <span id="e-http-client-too-large"></span>`E_HTTP_CLIENT_TOO_LARGE` | — | Le corps de la réponse dépasse la limite de taille. |
| <span id="e-http-client-redirect-refused"></span>`E_HTTP_CLIENT_REDIRECT_REFUSED` | — | Une redirection a été refusée : trop nombreuses, de https vers http, ou vers un autre hôte. |

## Erreurs Archive

Levées par `@c9up/archive`. La route de fichiers signés répond ses refus en JSON avec le statut indiqué.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-archive-invalid-signature"></span>`E_ARCHIVE_INVALID_SIGNATURE` | 403 | La signature de l'URL signée est incomplète, mal formée ou ne correspond pas. |
| <span id="e-archive-expired-signature"></span>`E_ARCHIVE_EXPIRED_SIGNATURE` | 403 | L'URL signée a expiré. |
| <span id="e-archive-access-denied"></span>`E_ARCHIVE_ACCESS_DENIED` | 403 | Une requête non signée a demandé autre chose qu'un fichier public stocké : un fichier privé, un nom absent, n'importe quel fichier d'un disque privé. |
| <span id="e-archive-invalid-key"></span>`E_ARCHIVE_INVALID_KEY` | 500 | La route signée a refusé le chemin : une clé avec une remontée de répertoire ou des caractères interdits. |
| <span id="e-archive-not-found"></span>`E_ARCHIVE_NOT_FOUND` | 404 | Aucun fichier n'est stocké sous cette clé. La route signée répond 404 ; un appel au driver la lève. |
| <span id="e-archive-path-traversal-detected"></span>`E_ARCHIVE_PATH_TRAVERSAL_DETECTED` | 500 | Une clé se résout hors de la racine du disque. |
| <span id="e-archive-invalid-expiry"></span>`E_ARCHIVE_INVALID_EXPIRY` | 500 | Une expiration d'URL signée n'est pas une durée positive (un nombre de secondes ou une chaîne comme `'30mins'`). |
| <span id="e-archive-signing-disabled"></span>`E_ARCHIVE_SIGNING_DISABLED` | 500 | `getSignedUrl()` a été appelé sur un disque local construit sans `signingSecret`. |
| <span id="e-archive-weak-signing-secret"></span>`E_ARCHIVE_WEAK_SIGNING_SECRET` | 500 | Le `signingSecret` du disque local fait moins de 16 caractères. |
| <span id="e-archive-signed-upload-unsupported"></span>`E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED` | 500 | Le disque local n'a pas d'URL d'envoi présignée ; seuls les disques cloud en ont. |
| <span id="e-archive-invalid-header-value"></span>`E_ARCHIVE_INVALID_HEADER_VALUE` | 500 | Une valeur à signer comme header de réponse contient un caractère de contrôle. |
| <span id="e-archive-invalid-route-base-path"></span>`E_ARCHIVE_INVALID_ROUTE_BASE_PATH` | 500 | Le `routeBasePath` du disque local n'est pas un chemin d'URL absolu comme `/storage`. |
| <span id="e-archive-prefix-mismatch"></span>`E_ARCHIVE_PREFIX_MISMATCH` | 500 | `createSignedRouteHandler()` a reçu un préfixe différent du `routeBasePath` du disque : aucune URL signée ne l'atteindrait. |
| <span id="e-archive-visibility-corrupt"></span>`E_ARCHIVE_VISIBILITY_CORRUPT` | 500 | L'enregistrement de visibilité d'un fichier est illisible ; archive refuse de traiter le fichier comme public. |
| <span id="e-archive-visibility-move-failed"></span>`E_ARCHIVE_VISIBILITY_MOVE_FAILED` | 500 | `move()` a déplacé le fichier mais n'a pas pu écrire sa visibilité à la cible. |
| <span id="e-archive-invalid-move-options"></span>`E_ARCHIVE_INVALID_MOVE_OPTIONS` | 500 | `moveToDisk()` a reçu des options inutilisables. |
| <span id="e-archive-multipart-not-macroable"></span>`E_ARCHIVE_MULTIPART_NOT_MACROABLE` | 500 | Le `@c9up/ream` installé n'a pas de `MultipartFile` macroable : les fichiers envoyés ne peuvent pas recevoir `moveToDisk()`. |
| <span id="e-archive-request-timeout"></span>`E_ARCHIVE_REQUEST_TIMEOUT` | 500 | Le fournisseur de stockage n'a pas répondu, ou s'est figé pendant la lecture du corps, dans le délai d'inactivité. |
| <span id="e-archive-unexpected-response"></span>`E_ARCHIVE_UNEXPECTED_RESPONSE` | 500 | Le fournisseur de stockage a répondu quelque chose qu'archive ne peut pas utiliser. |
| <span id="e-archive-unknown-disk"></span>`E_ARCHIVE_UNKNOWN_DISK` | 500 | Un nom de disque, ou le disque par défaut, n'est pas dans la configuration. |
| <span id="e-archive-invalid-driver"></span>`E_ARCHIVE_INVALID_DRIVER` | 500 | `config.driver` n'est ni `'local'`, ni `'s3'`, ni `'gcs'`. |
| <span id="e-archive-config-missing"></span>`E_ARCHIVE_CONFIG_MISSING` | 500 | Le driver est `s3` ou `gcs` et sa section de configuration manque. |
| <span id="e-archive-provider-not-registered"></span>`E_ARCHIVE_PROVIDER_NOT_REGISTERED` | 500 | `ArchiveProvider.boot()` a tourné avant `register()`. |
| <span id="e-archive-template-engine"></span>`E_ARCHIVE_TEMPLATE_ENGINE` | 500 | L'application rend avec inker, mais les helpers de template ne peuvent pas y être publiés. |
| <span id="e-archive-remote-failed"></span>`E_ARCHIVE_REMOTE_FAILED` | 500 | S3 ou GCS a refusé une requête ou signalé un échec. Le statut HTTP du fournisseur est dans `providerStatus`. |
| <span id="e-archive-invalid-driver-config"></span>`E_ARCHIVE_INVALID_DRIVER_CONFIG` | 500 | `S3Driver` n'a reçu ni `region` ni `endpoint`, `GcsDriver` n'a pas de `bucket` ou pas de `client_email` / `private_key` de compte de service, ou la `visibility` d'un disque local n'est ni `'public'` ni `'private'`. |
| <span id="e-archive-content-length-exceeded"></span>`E_ARCHIVE_CONTENT_LENGTH_EXCEEDED` | 500 | `putStream()` a lu plus d'octets que le `contentLength` que vous avez déclaré. |
| <span id="e-archive-invalid-static-prefix"></span>`E_ARCHIVE_INVALID_STATIC_PREFIX` | 500 | Vous avez passé un `prefix` vide à `StaticMiddleware`. |
| <span id="e-archive-not-booted"></span>`E_ARCHIVE_NOT_BOOTED` | 500 | Le service `storage` a été lu avant le boot d'`ArchiveProvider`. |
| <span id="e-archive-invalid-predicate"></span>`E_ARCHIVE_INVALID_PREDICATE` | 500 | Une assertion du fake de stockage a reçu un `contentContaining` vide, qui correspondrait à tous les fichiers. |
| <span id="e-archive-internal"></span>`E_ARCHIVE_INTERNAL` | 500 | Un invariant interne d'archive est rompu : un bogue du paquet. |
| <span id="e-unallowed-characters"></span>`E_UNALLOWED_CHARACTERS` | 500 | Une clé contient un caractère de contrôle, une barre oblique inverse ou un séparateur encodé. |
| <span id="e-path-traversal-detected"></span>`E_PATH_TRAVERSAL_DETECTED` | 500 | Une clé a un segment fait seulement de points, comme `..`, en clair ou encodé en pourcentage. |
| <span id="e-invalid-key"></span>`E_INVALID_KEY` | 500 | Une clé est vide, ou faite seulement de séparateurs, une fois normalisée. |
| <span id="e-cannot-write-file"></span>`E_CANNOT_WRITE_FILE` | 500 | `put`, `putStream`, `copyFromFs` ou `moveFromFs` d'un disque n'a pas pu écrire le fichier ; l'erreur du driver est la `cause`. |
| <span id="e-cannot-read-file"></span>`E_CANNOT_READ_FILE` | 500 | `get`, `getBytes`, `getArrayBuffer` ou `getStream` d'un disque n'a pas pu lire le fichier, absent compris (`cause` : `E_ARCHIVE_NOT_FOUND`) ; `get` répond plutôt `null` pour un fichier absent. |
| <span id="e-cannot-delete-file"></span>`E_CANNOT_DELETE_FILE` | 500 | Le `delete` d'un disque a échoué ; l'erreur du driver est la `cause`. |
| <span id="e-cannot-delete-directory"></span>`E_CANNOT_DELETE_DIRECTORY` | 500 | Le `deleteAll` d'un disque a échoué ; l'erreur du driver est la `cause`. |
| <span id="e-cannot-copy-file"></span>`E_CANNOT_COPY_FILE` | 500 | Le `copy` d'un disque a échoué, source absente comprise ; l'erreur du driver est la `cause`. |
| <span id="e-cannot-move-file"></span>`E_CANNOT_MOVE_FILE` | 500 | Le `move` d'un disque a échoué, source absente comprise ; l'erreur du driver est la `cause`. |
| <span id="e-cannot-check-file-existence"></span>`E_CANNOT_CHECK_FILE_EXISTENCE` | 500 | Le `exists` d'un disque n'a pas pu trancher ; un fichier absent répond plutôt `false`. |
| <span id="e-cannot-get-metadata"></span>`E_CANNOT_GET_METADATA` | 500 | `getMetadata` / `getMetaData` ou `getVisibility` d'un disque a échoué, fichier absent compris (`cause` : `E_ARCHIVE_NOT_FOUND`). |
| <span id="e-cannot-set-visibility"></span>`E_CANNOT_SET_VISIBILITY` | 500 | Le `setVisibility` d'un disque a échoué ; l'erreur du driver est la `cause`. |
| <span id="e-cannot-generate-url"></span>`E_CANNOT_GENERATE_URL` | 500 | `url` / `getUrl`, `publicUrl`, `getSignedUrl` ou `getSignedUploadUrl` d'un disque n'a pas pu construire l'URL (`cause` : `E_ARCHIVE_SIGNING_DISABLED`, `E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED`, `E_ARCHIVE_INVALID_EXPIRY`, …). |
| <span id="e-cannot-serve-file"></span>`E_CANNOT_SERVE_FILE` | 500 | La route des URL signées d'archive n'a pas pu servir un fichier pour une autre raison que son absence (qui répond 404) ; l'échec est la `cause`. |

## Erreurs Atlas

Chaque code est une classe de l'espace de noms `errors` d'atlas, nommée comme
le code. Voir [Gestion des erreurs Atlas](/fr/guides/database/orm/error-handling)
pour les classes qui portent des données. Les refus propres au compilateur de
requêtes et au pilote Rust (`E_UNSAFE_*`, `E_INJECTION_PATTERN`, `E_UNSUPPORTED`…)
sont relancés eux aussi en leur classe, avec `error.code` renseigné et l'erreur
native en `cause`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-row-not-found"></span>`E_ROW_NOT_FOUND` | 404 | Une requête qui doit rendre une ligne n'en a trouvé aucune : `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| <span id="e-mass-assignment"></span>`E_MASS_ASSIGNMENT` | 500 | `fill()` / `merge()` (et `create`, `createMany`, `updateOrCreate`) ont affecté un attribut hors de `fillable`, ou listé dans `guarded`. |
| <span id="e-extra-properties"></span>`E_EXTRA_PROPERTIES` | 500 | Un remplissage a nommé une propriété qui n'est pas une colonne déclarée. |
| <span id="e-unknown-column"></span>`E_UNKNOWN_COLUMN` | 500 | Une valeur a été affectée à une clé qui n'est pas une colonne. Passez `{ allowExtraProperties: true }` pour garder les clés inconnues dans `$extras`. |
| <span id="e-invalid-column"></span>`E_INVALID_COLUMN` | 500 | Une requête nomme une colonne que l'entité ne déclare pas. |
| <span id="e-invalid-find-value"></span>`E_INVALID_FIND_VALUE` | 500 | `find()` a été appelé sans valeur de clé primaire utilisable. |
| <span id="e-model-not-persisted"></span>`E_MODEL_NOT_PERSISTED` | 500 | Une opération qui exige une ligne stockée (`delete()`, `refresh()`, `load*()`…) a tourné sur une instance locale. |
| <span id="e-missing-primary-key"></span>`E_MISSING_PRIMARY_KEY` | 500 | La même opération a tourné sur une projection persistée qui ne contient pas la clé primaire. |
| <span id="e-model-deleted"></span>`E_MODEL_DELETED` | 500 | `save()` a été appelé sur une instance supprimée. |
| <span id="e-missing-owner-key"></span>`E_MISSING_OWNER_KEY` | 500 | `associate()` a reçu un parent dont la clé n'est pas renseignée. |
| <span id="e-relation-not-loaded"></span>`E_RELATION_NOT_LOADED` | 500 | Une relation a été lue avant d'être chargée. Appelez `.preload()` sur la requête ou `.load()` sur l'instance. |
| <span id="e-optimistic-lock"></span>`E_OPTIMISTIC_LOCK` | 500 | Une sauvegarde a perdu un verrou optimiste : une autre transaction a modifié la ligne depuis sa lecture. |
| <span id="e-strict-mode"></span>`E_STRICT_MODE` | 500 | SQL brut refusé par le mode strict : le `raw()` d'un repository, une valeur `db.raw()` écrite par un repository, ou `whereRaw()`, `havingRaw()`, `joinRaw()`. |
| <span id="e-no-interactive-transaction"></span>`E_NO_INTERACTIVE_TRANSACTION` | 500 | La connexion n'a pas de `transaction()` interactive (transaction de modèle, ou `useTransaction()` en test). |
| <span id="e-array-param"></span>`E_ARRAY_PARAM` | — | Une liste a été liée à un seul paramètre. Développez-la en un paramètre par élément. |
| <span id="e-atlas-missing-connection"></span>`E_ATLAS_MISSING_CONNECTION` | 500 | Aucune connexion utilisable : pas de connexion par défaut (atlas n'a pas démarré), un `default` que la config ne déclare pas, ou un repository construit sans connexion. |
| <span id="e-atlas-empty-select"></span>`E_ATLAS_EMPTY_SELECT` | 500 | `select()` a été appelé sans colonnes. Fournissez au moins un nom de colonne. |
| <span id="e-atlas-invalid-page"></span>`E_ATLAS_INVALID_PAGE` | 500 | `paginate()` a été appelé avec `page < 1`. |
| <span id="e-atlas-invalid-per-page"></span>`E_ATLAS_INVALID_PER_PAGE` | 500 | `paginate()` a été appelé avec `perPage < 1`. |
| <span id="e-atlas-invalid-pagination"></span>`E_ATLAS_INVALID_PAGINATION` | 500 | Une page, une taille de page ou un nombre de lignes qui n'est pas un entier fini et positif ou nul. |
| <span id="e-atlas-invalid-cte-name"></span>`E_ATLAS_INVALID_CTE_NAME` | 500 | Un nom de CTE doit être un identifiant valide (lettres, chiffres, underscores). |
| <span id="e-atlas-invalid-operator"></span>`E_ATLAS_INVALID_OPERATOR` | 500 | Un opérateur de `where()` ou `wherePivot()` hors de la liste autorisée. |
| <span id="e-atlas-invalid-increment"></span>`E_ATLAS_INVALID_INCREMENT` | 500 | `increment()` / `decrement()` a reçu une quantité qui n'est pas un nombre fini. |
| <span id="e-atlas-undefined-binding"></span>`E_ATLAS_UNDEFINED_BINDING` | 500 | Une valeur de requête vaut `undefined`. Validez l'entrée avant ; utilisez `whereNull()` pour chercher NULL. |
| <span id="e-atlas-dialect-mismatch"></span>`E_ATLAS_DIALECT_MISMATCH` | 500 | `useTransaction(trx)` a reçu une transaction d'un autre dialecte que celui pour lequel la requête a été construite. Ouvrez la transaction sur la connexion de la requête, ou construisez la requête depuis la transaction. |
| <span id="e-atlas-raw-bindings"></span>`E_ATLAS_RAW_BINDINGS` | 500 | Les paramètres et les valeurs liées d'un fragment brut ne correspondent pas : un paramètre sans valeur, une valeur qu'aucun paramètre n'utilise, `?` mêlé à `$N` ou à des valeurs nommées, ou une valeur `??` qui n'est pas une chaîne. |
| <span id="e-atlas-raw-value"></span>`E_ATLAS_RAW_VALUE` | 500 | Un `db.raw()` placé là où il ne peut pas aller : `defaultTo(db.raw())` avec des valeurs liées, ou une valeur brute comparée avec un opérateur qui n'en prend pas (`IS NULL`, `BETWEEN`). |
| <span id="e-atlas-non-finite-number"></span>`E_ATLAS_NON_FINITE_NUMBER` | 500 | `defaultTo()` a reçu un nombre qui n'est pas un nombre SQL (`NaN`, `Infinity`). |
| <span id="e-atlas-factory-faker-missing"></span>`E_ATLAS_FACTORY_FAKER_MISSING` | 500 | Une factory utilise faker, dépendance pair optionnelle d'atlas, non installée. |
| <span id="e-atlas-factory-invalid"></span>`E_ATLAS_FACTORY_INVALID` | 500 | `make:factory` a reçu un nom de modèle qui sortirait du dossier des factories (séparateur de chemin, guillemet, backtick ou `..`). |
| <span id="e-atlas-seeder-invalid"></span>`E_ATLAS_SEEDER_INVALID` | 500 | `make:seeder` a reçu un nom qui sortirait du dossier des seeders (séparateur de chemin, guillemet, backtick ou `..`). |
| <span id="e-atlas-napi-not-found"></span>`E_ATLAS_NAPI_NOT_FOUND` | 500 | Le compilateur de requêtes Rust n'est pas chargé : le paquet natif de votre plateforme manque. Voir [Dépannage](/fr/guides/database/orm/troubleshooting). |
| <span id="e-atlas-insecure-sslmode"></span>`E_ATLAS_INSECURE_SSLMODE` | 500 | La connexion demande `sslmode=prefer` ou `allow` (URL ou `PGSSLMODE`), qui repassent en clair sans le dire. Utilisez `disable` ou `verify-full`. Voir [Connexions chiffrées](/fr/guides/database/orm/connections#connexions-chiffrees-tls). |
| <span id="e-atlas-listen-unsupported"></span>`E_ATLAS_LISTEN_UNSUPPORTED` | 500 | LISTEN / NOTIFY a été utilisé sur une connexion qui n'est pas PostgreSQL. |
| <span id="e-atlas-listen-connect"></span>`E_ATLAS_LISTEN_CONNECT` | 500 | Le listener n'a pas pu ouvrir sa propre connexion PostgreSQL. |
| <span id="e-atlas-listen-connection"></span>`E_ATLAS_LISTEN_CONNECTION` | 500 | La connexion du listener a échoué ; chaque abonnement en est informé. |
| <span id="e-atlas-listen-channel"></span>`E_ATLAS_LISTEN_CHANNEL` | 500 | Un nom de canal LISTEN est vide, dépasse 63 octets, ou contient un NUL. |
| <span id="e-atlas-listen-closed"></span>`E_ATLAS_LISTEN_CLOSED` | 500 | Le listener a été fermé pendant qu'une demande était en cours. |
| <span id="e-atlas-listen-event"></span>`E_ATLAS_LISTEN_EVENT` | 500 | Le listener natif a signalé un événement qu'atlas ne définit pas. |
| <span id="e-atlas-migration-invalid-table-name"></span>`E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | 500 | `migrations.tableName` n'est pas un identifiant simple. |
| <span id="e-atlas-migration-invalid"></span>`E_ATLAS_MIGRATION_INVALID` | 500 | Un fichier de migration n'exporte pas de classe par défaut. |
| <span id="e-atlas-migration-duplicate"></span>`E_ATLAS_MIGRATION_DUPLICATE` | 500 | Deux fichiers de migration partagent un nom. |
| <span id="e-atlas-migration-compile-empty"></span>`E_ATLAS_MIGRATION_COMPILE_EMPTY` | 500 | Une migration s'est compilée en aucune instruction SQL. |
| <span id="e-rollback-disabled-in-production"></span>`E_ROLLBACK_DISABLED_IN_PRODUCTION` | 500 | Un rollback, reset, refresh, fresh ou wipe en production sans `--force`. |
| <span id="e-atlas-dry-run-write"></span>`E_ATLAS_DRY_RUN_WRITE` | 500 | Une migration a tenté d'écrire pendant un `dryRun()`. |
| <span id="e-defer-requires-transaction"></span>`E_DEFER_REQUIRES_TRANSACTION` | 500 | Une migration utilise `this.defer()` sur un adaptateur sans `transaction()` interactive. |
| <span id="e-mysql-fk-requires-transaction"></span>`E_MYSQL_FK_REQUIRES_TRANSACTION` | 500 | Suspendre les contrôles de clés étrangères MySQL exige une `transaction()` interactive pour les rétablir. |
| <span id="e-schema-dump-dialect-mismatch"></span>`E_SCHEMA_DUMP_DIALECT_MISMATCH` | 500 | Le dump de schéma a été fait pour un autre dialecte. |
| <span id="e-schema-dump-table-mismatch"></span>`E_SCHEMA_DUMP_TABLE_MISMATCH` | 500 | Le dump de schéma utilise une autre table de suivi des migrations. |
| <span id="e-seeder-dir-not-found"></span>`E_SEEDER_DIR_NOT_FOUND` | 500 | Le répertoire des seeders n'existe pas. |
| <span id="e-seeder-invalid"></span>`E_SEEDER_INVALID` | 500 | Un fichier de seeder n'exporte pas de classe de seeder. |
| <span id="e-seeder-invalid-path"></span>`E_SEEDER_INVALID_PATH` | 500 | Un chemin de seeder se résout hors du répertoire des seeders. |
| <span id="e-no-connection"></span>`E_NO_CONNECTION` | 500 | `schema.<méthode>()` exige une connexion active ; elle existe dans une migration, pas sur un `Schema` isolé. |
| <span id="e-alter-empty"></span>`E_ALTER_EMPTY` | 500 | `schema.alterTable()` n'a déclaré aucune opération. |
| <span id="e-alter-misuse"></span>`E_ALTER_MISUSE` | 500 | `.alter()` ne suit pas une définition de colonne, ou une méthode réservée à la modification a servi sur une nouvelle table. |
| <span id="e-check-empty"></span>`E_CHECK_EMPTY` | 500 | Une contrainte check (ou `checkBetween`) n'a reçu aucune valeur ni intervalle. |
| <span id="e-check-range"></span>`E_CHECK_RANGE` | 500 | `checkBetween` a reçu un intervalle qui n'est pas `[min, max]`. |
| <span id="e-constraint-empty"></span>`E_CONSTRAINT_EMPTY` | 500 | Une contrainte ne liste aucune colonne. |
| <span id="e-enum-empty"></span>`E_ENUM_EMPTY` | 500 | Une colonne enum ne déclare aucune valeur. |
| <span id="e-empty-view-select"></span>`E_EMPTY_VIEW_SELECT` | 500 | Une vue n'a pas de SELECT, ou une vue matérialisée a été demandée à un dialecte qui n'en a pas. |
| <span id="e-specific-type-empty"></span>`E_SPECIFIC_TYPE_EMPTY` | 500 | `specificType()` a reçu un type vide. |
| <span id="e-sqlite-decimal-precision"></span>`E_SQLITE_DECIMAL_PRECISION` | 500 | Une précision décimale que SQLite ne peut pas stocker exactement. |
| <span id="e-unsupported"></span>`E_UNSUPPORTED` | 500 | Une fonctionnalité SQL que le dialecte de la connexion n'a pas (`DISTINCT ON` hors Postgres, variantes `ALL` sur SQLite, verrous consultatifs sur SQLite…). |
| <span id="e-unsafe-identifier"></span>`E_UNSAFE_IDENTIFIER` | 500 | Un identifiant (table, colonne, alias) n'est pas un nom SQL simple. Atlas le vérifie avant la compilation, et le compilateur Rust le vérifie à nouveau. |
| <span id="e-unsafe-sql"></span>`E_UNSAFE_SQL` | 500 | Le compilateur Rust a refusé un fragment SQL, ou un mot-clé hors de sa liste autorisée (opération ensembliste, sens d'un ORDER BY, mode de verrou, action référentielle…). |
| <span id="e-unsafe-expression"></span>`E_UNSAFE_EXPRESSION` | 500 | Le compilateur Rust a refusé une expression. |
| <span id="e-unsafe-literal"></span>`E_UNSAFE_LITERAL` | 500 | Le compilateur Rust a refusé une valeur littérale. |
| <span id="e-injection-pattern"></span>`E_INJECTION_PATTERN` | 500 | Le compilateur Rust a refusé une entrée qui ressemble à une tentative d'injection. |
| <span id="e-atlas-no-url"></span>`E_ATLAS_NO_URL` | 500 | Une configuration de connexion n'a pas d'`url` (ni de `connection`), ou la configuration de base n'a ni `url` de premier niveau ni `connections`. |
| <span id="e-atlas-not-booted"></span>`E_ATLAS_NOT_BOOTED` | 500 | Le service `db` (`@c9up/atlas/services/db`) a servi avant que `AtlasProvider.boot()` ne tourne. |
| <span id="e-atlas-connection-unavailable"></span>`E_ATLAS_CONNECTION_UNAVAILABLE` | 500 | Un jeton de connexion du conteneur a été résolu avant que le boot ne l'ouvre, ou après que l'arrêt l'a fermé. |
| <span id="e-atlas-boot-failed"></span>`E_ATLAS_BOOT_FAILED` | 500 | `AtlasProvider.boot()` n'a pas pu ouvrir une ou plusieurs des connexions configurées ; `cause` porte le premier échec. |
| <span id="e-atlas-read-only"></span>`E_ATLAS_READ_ONLY` | 500 | Une écriture a tourné sur un query builder lié à une connexion ouverte avec `{ mode: 'read' }`. |
| <span id="e-atlas-invalid-pragma"></span>`E_ATLAS_INVALID_PRAGMA` | 500 | Une clé ou une valeur de pragma SQLite sort de `[A-Za-z0-9_]`. |
| <span id="e-atlas-db-driver-not-found"></span>`E_ATLAS_DB_DRIVER_NOT_FOUND` | 500 | Le driver de base Rust n'a pas pu être chargé, ou le binaire chargé est périmé ; `cause` porte l'échec du chargement. |
| <span id="e-atlas-no-repository"></span>`E_ATLAS_NO_REPOSITORY` | 500 | `refresh()`, `fresh()`, `load()`, `loadCount()`, `loadAggregate()` ou `related()` a été appelé sur une entité qu'aucun repository n'a hydratée. |
| <span id="e-atlas-fillable-and-guarded"></span>`E_ATLAS_FILLABLE_AND_GUARDED` | 500 | Un modèle déclare à la fois `static fillable` et `static guarded`. |
| <span id="e-atlas-invalid-entity-class"></span>`E_ATLAS_INVALID_ENTITY_CLASS` | 500 | La cible d'une relation (ou son modèle intermédiaire) ne se résout pas en une sous-classe de `BaseEntity`. |
| <span id="e-atlas-invalid-hook"></span>`E_ATLAS_INVALID_HOOK` | 500 | Un décorateur de hook n'est pas posé sur une méthode statique, ou `addHook()` a reçu autre chose qu'une fonction. |
| <span id="e-atlas-invalid-decorator"></span>`E_ATLAS_INVALID_DECORATOR` | 500 | Un décorateur de colonne date a été posé ailleurs que sur une propriété de classe. |
| <span id="e-atlas-invalid-relation"></span>`E_ATLAS_INVALID_RELATION` | 500 | Les métadonnées d'une relation n'ont pas ce que leur type exige : un `@ManyToMany` sans options de pivot, une relation through sans modèle intermédiaire. |
| <span id="e-atlas-relation-unsupported-operation"></span>`E_ATLAS_RELATION_UNSUPPORTED_OPERATION` | 500 | `related()` a reçu une opération que sa relation n'a pas : une écriture sur `@BelongsTo` autre que `associate()` / `dissociate()`, une écriture sur une relation through (en lecture seule), une écriture groupée sur `@HasOne`. |
| <span id="e-atlas-associate-null"></span>`E_ATLAS_ASSOCIATE_NULL` | 500 | `associate()` a reçu `null` ou `undefined` ; utilisez `dissociate()`. |
| <span id="e-atlas-pivot-key-collision"></span>`E_ATLAS_PIVOT_KEY_COLLISION` | 500 | Les colonnes supplémentaires d'`attach()` / `sync()` nomment une clé du pivot ou une colonne d'horodatage du pivot. |
| <span id="e-atlas-column-adapter"></span>`E_ATLAS_COLUMN_ADAPTER` | 500 | Un adaptateur `prepare` / `consume` de `@Column` a levé une erreur (`cause` la porte) ou a rendu une Promise. |
| <span id="e-atlas-has-one-multiple-rows"></span>`E_ATLAS_HAS_ONE_MULTIPLE_ROWS` | 500 | Un preload `@HasOne` a trouvé plus d'une ligne liée pour un parent. |
| <span id="e-atlas-through-key-not-unique"></span>`E_ATLAS_THROUGH_KEY_NOT_UNIQUE` | 500 | Le `secondLocalKey` d'une relation through correspond à plusieurs parents. |
| <span id="e-atlas-multiple-rows"></span>`E_ATLAS_MULTIPLE_ROWS` | 500 | `sole()` a trouvé plus d'une ligne. |
| <span id="e-atlas-subquery-alias"></span>`E_ATLAS_SUBQUERY_ALIAS` | 500 | `select()` a reçu une sous-requête non nommée avec `.as()`. |
| <span id="e-atlas-invalid-alias"></span>`E_ATLAS_INVALID_ALIAS` | 500 | Un alias n'est pas un identifiant simple. |
| <span id="e-atlas-invalid-expression"></span>`E_ATLAS_INVALID_EXPRESSION` | 500 | L'expression supplémentaire de `whereExpr()` contient des caractères interdits, des parenthèses déséquilibrées, un mot-clé SQL ou une fonction hors de la liste autorisée. |
| <span id="e-atlas-invalid-json-path"></span>`E_ATLAS_INVALID_JSON_PATH` | 500 | Un chemin de `whereJsonPath()` ne commence pas par `$`. |
| <span id="e-atlas-invalid-group-limit"></span>`E_ATLAS_INVALID_GROUP_LIMIT` | 500 | `groupLimit()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| <span id="e-atlas-invalid-lock"></span>`E_ATLAS_INVALID_LOCK` | 500 | `skipLocked()` / `noWait()` a été utilisé sans verrou de ligne de base. |
| <span id="e-atlas-invalid-comment"></span>`E_ATLAS_INVALID_COMMENT` | 500 | Le texte de `comment()` contient `*/`. |
| <span id="e-atlas-invalid-join"></span>`E_ATLAS_INVALID_JOIN` | 500 | Un `join()` sous forme de chaînes n'a pas d'opérande droite. |
| <span id="e-atlas-invalid-aggregate"></span>`E_ATLAS_INVALID_AGGREGATE` | 500 | Un callback de `withAggregate()` n'a défini aucun agrégat. |
| <span id="e-atlas-invalid-pluck"></span>`E_ATLAS_INVALID_PLUCK` | 500 | `pluck()` a lu une colonne dont la valeur est un objet ou une relation. |
| <span id="e-atlas-unknown-scope"></span>`E_ATLAS_UNKNOWN_SCOPE` | 500 | `apply()` a atteint un scope que le modèle ne déclare pas, ou un modèle sans `static scopes`. |
| <span id="e-atlas-cursor-order-required"></span>`E_ATLAS_CURSOR_ORDER_REQUIRED` | 500 | `cursorPaginate()` a été appelé sans colonne de tri. |
| <span id="e-atlas-invalid-cursor"></span>`E_ATLAS_INVALID_CURSOR` | 500 | Un curseur de `cursorPaginate()` ne se décode pas, ou la longueur de son tuple ne correspond pas aux colonnes de tri. |
| <span id="e-atlas-empty-update"></span>`E_ATLAS_EMPTY_UPDATE` | 500 | Une mise à jour a reçu un contenu vide : le `update()` d'une requête de modèle, ou un UPDATE sans affectation SET arrivé au compilateur. |
| <span id="e-atlas-query-timeout"></span>`E_ATLAS_QUERY_TIMEOUT` | 500 | Une requête a duré plus longtemps que son `timeout(ms)`. |
| <span id="e-atlas-compile-empty"></span>`E_ATLAS_COMPILE_EMPTY` | 500 | Le compilateur de requêtes n'a rendu aucune instruction. |
| <span id="e-atlas-schema-mismatch"></span>`E_ATLAS_SCHEMA_MISMATCH` | 500 | `verifySchema()` en mode `throw` a trouvé un écart entre les modèles et la base ; le message liste les constats. |
| <span id="e-atlas-schema-dump-manifest"></span>`E_ATLAS_SCHEMA_DUMP_MANIFEST` | 500 | Un manifeste de dump de schéma (`.meta.json`) n'est pas en version 1 avec un `schemaTableName`. |
| <span id="e-atlas-schema-dump-sequence"></span>`E_ATLAS_SCHEMA_DUMP_SEQUENCE` | 500 | `schema:dump` a lu dans le catalogue un paramètre de séquence qui n'est pas un entier. |
| <span id="e-atlas-schema-dump-prune"></span>`E_ATLAS_SCHEMA_DUMP_PRUNE` | 500 | `schema:dump --prune` a tourné sans `migrationsDir`. |
| <span id="e-atlas-schema-generate-identifier"></span>`E_ATLAS_SCHEMA_GENERATE_IDENTIFIER` | 500 | `schema:generate` a lu un nom de table ou de colonne qui ne donne pas un identifiant TypeScript. |
| <span id="e-atlas-db-assertion"></span>`E_ATLAS_DB_ASSERTION` | 500 | Une assertion de base (`assertHas`, `assertMissing`, `assertCount`, `assertEmpty`) n'est pas vérifiée. |
| <span id="e-atlas-factory-no-connection"></span>`E_ATLAS_FACTORY_NO_CONNECTION` | 500 | Le `create()` d'une factory n'a pas de connexion : aucune passée, aucune liée avec `.client()` / `.connection()`. |
| <span id="e-atlas-factory-state"></span>`E_ATLAS_FACTORY_STATE` | 500 | Un état de factory n'est pas défini. |
| <span id="e-atlas-factory-unknown-relation"></span>`E_ATLAS_FACTORY_UNKNOWN_RELATION` | 500 | Le `with()` d'une factory nomme une relation que le modèle ne déclare pas, ou une relation sans factory liée. |
| <span id="e-atlas-factory-pivot-length"></span>`E_ATLAS_FACTORY_PIVOT_LENGTH` | 500 | La longueur du tableau `pivotAttributes` d'une factory diffère du nombre de lignes liées. |
| <span id="e-atlas-factory-unsupported-relation"></span>`E_ATLAS_FACTORY_UNSUPPORTED_RELATION` | 500 | Le `with()` d'une factory nomme un type de relation qu'elle ne sait pas construire (une relation through). |
| <span id="e-atlas-seeder-dir-required"></span>`E_ATLAS_SEEDER_DIR_REQUIRED` | 500 | `testUtils().db().seed()` a tourné sans `seedersDir`. |
| <span id="e-atlas-internal"></span>`E_ATLAS_INTERNAL` | 500 | Un invariant interne d'atlas a cassé, ou le compilateur Rust a paniqué ou n'a pas pu sérialiser son résultat : toujours un bug d'atlas. |
| <span id="e-invalid-date-column-value"></span>`E_INVALID_DATE_COLUMN_VALUE` | 500 | Une colonne de date a reçu une valeur qui n'est pas une date valide : une `Date` JavaScript, qui ne porte pas de fuseau, ou une date-heure sans décalage. |
| <span id="e-undefined-relationship"></span>`E_UNDEFINED_RELATIONSHIP` | 500 | Un nom de relation que le modèle ne déclare pas (`load()`, `withCount()`, `whereHas()`…). |
| <span id="e-unable-acquire-lock"></span>`E_UNABLE_ACQUIRE_LOCK` | 500 | Une autre exécution tient le verrou de migration. Attendez-la, ou libérez un verrou resté bloqué avec `migration:unlock`. |
| <span id="e-unable-release-lock"></span>`E_UNABLE_RELEASE_LOCK` | 500 | Une migration a réussi, mais son verrou a été libéré pendant qu'elle le tenait (`migration:unlock` en cours d'exécution) : une autre exécution a pu migrer en même temps. |
| <span id="e-missing-schema-files"></span>`E_MISSING_SCHEMA_FILES` | 500 | Une migration enregistrée comme appliquée n'a pas de fichier dans le répertoire de migrations : elle ne peut pas être annulée. |
| <span id="e-unmanaged-db-connection"></span>`E_UNMANAGED_DB_CONNECTION` | 500 | Un nom de connexion non enregistré : le `static connection` d'un modèle, `db.connection(name)`, le `connection(name)` d'une factory, `manager.connect(name)`. |
| <span id="e-atlas-invalid-spec"></span>`E_ATLAS_INVALID_SPEC` | 500 | L'instruction reçue par le compilateur Rust est mal formée : une clause n'a pas un champ requis, un champ n'a pas la bonne forme, ou la spec ne se lit pas. Atlas construit toutes les specs lui-même : c'est donc un bug d'atlas ou une spec écrite à la main. |
| <span id="e-atlas-empty-insert"></span>`E_ATLAS_EMPTY_INSERT` | 500 | Un INSERT ou un upsert n'a aucune ligne (`insert([])`, `multiInsert([])`), ou a plusieurs lignes sans colonne : une seule ligne peut prendre toutes les valeurs par défaut. |
| <span id="e-atlas-empty-table"></span>`E_ATLAS_EMPTY_TABLE` | 500 | `schema.createTable()` n'a déclaré aucune colonne. |
| <span id="e-unsupported-client"></span>`E_UNSUPPORTED_CLIENT` | 500 | La connexion nomme un dialecte qu'atlas ne connaît pas. Atlas compile pour `sqlite`, `postgres` (ou `postgresql`) et `mysql` (ou `mariadb`). |

## Erreurs Atom

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-atom-invalid-input"></span>`E_ATOM_INVALID_INPUT` | 500 | Une valeur donnée comme décimal n'est ni une chaîne, ni un nombre, ni un bigint, ni un `Decimal`. |
| <span id="e-atom-invalid-decimal"></span>`E_ATOM_INVALID_DECIMAL` | 500 | Une chaîne ou un nombre ne se lit pas comme un décimal (`parseLocale` compris). |
| <span id="e-atom-unsafe-integer"></span>`E_ATOM_UNSAFE_INTEGER` | 500 | Un nombre JavaScript est un entier au-delà de `Number.MAX_SAFE_INTEGER` ; passez une chaîne ou un bigint. |
| <span id="e-atom-invalid-integer"></span>`E_ATOM_INVALID_INTEGER` | 500 | Des unités mineures ne sont pas un nombre entier. |
| <span id="e-atom-decimal-too-large"></span>`E_ATOM_DECIMAL_TOO_LARGE` | 500 | Une valeur ou un résultat dépasse la borne `maxDigits` de chiffres significatifs, ou l'exposant d'un littéral scientifique dépasse `maxExponent`. |
| <span id="e-atom-invalid-scale"></span>`E_ATOM_INVALID_SCALE` | 500 | Une échelle ou une précision n'est pas un entier de 0 à `maxScale` (10 000 par défaut). |
| <span id="e-atom-invalid-exponent"></span>`E_ATOM_INVALID_EXPONENT` | 500 | Un exposant de `pow` n'est pas un entier dans les bornes. |
| <span id="e-atom-invalid-rounding-mode"></span>`E_ATOM_INVALID_ROUNDING_MODE` | 500 | Un mode d'arrondi n'est pas un de ceux que connaît atom. |
| <span id="e-atom-invalid-range"></span>`E_ATOM_INVALID_RANGE` | 500 | `clamp` / `between` a reçu un minimum plus grand que le maximum. |
| <span id="e-atom-invalid-step"></span>`E_ATOM_INVALID_STEP` | 500 | Le pas de `quantize` n'est pas strictement positif. |
| <span id="e-atom-invalid-ratios"></span>`E_ATOM_INVALID_RATIOS` | 500 | `allocate` n'a reçu aucun ratio, un ratio négatif, ou aucun positif. |
| <span id="e-atom-precision-loss"></span>`E_ATOM_PRECISION_LOSS` | 500 | `toMinorUnits` (et un `Money` exact) perdrait des chiffres à cette échelle. |
| <span id="e-atom-length-mismatch"></span>`E_ATOM_LENGTH_MISMATCH` | 500 | `Decimal.dot` a reçu deux listes de longueurs différentes. |
| <span id="e-atom-division-by-zero"></span>`E_ATOM_DIVISION_BY_ZERO` | 500 | Une division ou un modulo par zéro, sur le moteur TypeScript (le moteur natif répond par sa propre erreur). |
| <span id="e-atom-negative-sqrt"></span>`E_ATOM_NEGATIVE_SQRT` | 500 | `sqrt` d'une valeur négative, sur le moteur TypeScript (le moteur natif répond par sa propre erreur). |
| <span id="e-atom-empty-input"></span>`E_ATOM_EMPTY_INPUT` | 500 | `avg`, `min`, `max`, `median` ou `stddev` n'a reçu aucune valeur. |
| <span id="e-atom-too-few-values"></span>`E_ATOM_TOO_FEW_VALUES` | 500 | Un `stddev` d'échantillon a reçu moins de deux valeurs. |
| <span id="e-atom-invalid-context"></span>`E_ATOM_INVALID_CONTEXT` | 500 | `configureAtomContext` / `withAtomContext` a reçu un réglage invalide. |
| <span id="e-atom-invalid-currency"></span>`E_ATOM_INVALID_CURRENCY` | 500 | Un code de devise n'est pas fait de trois lettres. |
| <span id="e-atom-currency-mismatch"></span>`E_ATOM_CURRENCY_MISMATCH` | 500 | Deux valeurs `Money` de devises ou d'échelles différentes ont été combinées. |
| <span id="e-atom-invalid-column-value"></span>`E_ATOM_INVALID_COLUMN_VALUE` | 500 | L'adaptateur Atlas a reçu une valeur de colonne du mauvais type. |
| <span id="e-atom-null-column-value"></span>`E_ATOM_NULL_COLUMN_VALUE` | 500 | Une `decimalColumn` non nullable a reçu `null`. |
| <span id="e-atom-engine-not-found"></span>`E_ATOM_ENGINE_NOT_FOUND` | 500 | `nativeAtom()` n'a trouvé aucun moteur natif (N-API, WASM ou le module JSI du téléphone). |
| <span id="e-atom-napi-disabled"></span>`E_ATOM_NAPI_DISABLED` | 500 | `nativeAtom()` a tourné alors qu'un test a désactivé le moteur natif. |
| <span id="e-atom-internal"></span>`E_ATOM_INTERNAL` | 500 | Un invariant interne a été rompu (un bug d'atom). |
| <span id="e-atom-bulk-not-run"></span>`E_ATOM_BULK_NOT_RUN` | 500 | Une valeur planifiée a été lue avant `run()`. |
| <span id="e-atom-bulk-no-output"></span>`E_ATOM_BULK_NO_OUTPUT` | 500 | `run()` n'a reçu aucune valeur à calculer. |
| <span id="e-atom-bulk-bad-output"></span>`E_ATOM_BULK_BAD_OUTPUT` | 500 | `run()` a reçu autre chose qu'une valeur planifiée. |
| <span id="e-atom-bulk-length-mismatch"></span>`E_ATOM_BULK_LENGTH_MISMATCH` | 500 | Les colonnes d'un plan ont des longueurs différentes. |
| <span id="e-atom-bulk-empty-column"></span>`E_ATOM_BULK_EMPTY_COLUMN` | 500 | Une colonne n'a aucune valeur. |
| <span id="e-atom-bulk-bad-index"></span>`E_ATOM_BULK_BAD_INDEX` | 500 | `at()` tombe hors de la colonne. |
| <span id="e-atom-bulk-bad-percentile"></span>`E_ATOM_BULK_BAD_PERCENTILE` | 500 | Un percentile n'est pas une fraction entre 0 et 1. |
| <span id="e-atom-bulk-bad-exponent"></span>`E_ATOM_BULK_BAD_EXPONENT` | 500 | L'exposant d'un `pow` planifié n'est pas un entier dans les bornes. |
| <span id="e-atom-bulk-bad-precision"></span>`E_ATOM_BULK_BAD_PRECISION` | 500 | Une précision planifiée n'est pas un entier de 0 à `maxScale` (10 000 par défaut). |
| <span id="e-atom-bulk-bad-scale"></span>`E_ATOM_BULK_BAD_SCALE` | 500 | `minorUnits()` a reçu une échelle invalide. |
| <span id="e-atom-bulk-not-minor-units"></span>`E_ATOM_BULK_NOT_MINOR_UNITS` | 500 | `minorUnits()` a reçu une valeur qui n'est pas un nombre entier d'unités mineures. |
| <span id="e-atom-bulk-too-short"></span>`E_ATOM_BULK_TOO_SHORT` | 500 | Un écart type d'échantillon planifié a moins de deux valeurs. |
| <span id="e-atom-bulk-no-length"></span>`E_ATOM_BULK_NO_LENGTH` | 500 | Une colonne a été construite sans source (un bug d'atom). |
| <span id="e-atom-bulk-bad-program"></span>`E_ATOM_BULK_BAD_PROGRAM` | 500 | L'évaluateur TypeScript a rencontré un plan malformé (un bug d'atom). |
| <span id="e-atom-bulk-lost-output"></span>`E_ATOM_BULK_LOST_OUTPUT` | 500 | Un calcul a rendu moins de valeurs que demandé (un bug d'atom). |
| <span id="e-atom-bulk-overflow"></span>`E_ATOM_BULK_OVERFLOW` | — | Interne : le moteur de calcul en masse Rust a dépassé 128 bits ; atom l'intercepte et relance le calcul en BigInt exact, vous ne le recevez donc jamais. |
| <span id="e-atom-bulk-foreign-column"></span>`E_ATOM_BULK_FOREIGN_COLUMN` | 500 | `run()` / `runAsync()` a reçu une valeur planifiée qui lit une colonne chargée sur un autre `Bulk`. |

## Erreurs Aurora

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-aurora-illegal-page-name"></span>`E_AURORA_ILLEGAL_PAGE_NAME` | 500 | Un nom de page contient des caractères interdits. |
| <span id="e-aurora-page-outside-root"></span>`E_AURORA_PAGE_OUTSIDE_ROOT` | 500 | Le chemin de page résolu tombe hors de la racine des pages configurée. |
| <span id="e-aurora-page-not-found"></span>`E_AURORA_PAGE_NOT_FOUND` | 500 | Aucun fichier pour ce nom de page. |
| <span id="e-aurora-page-import-failed"></span>`E_AURORA_PAGE_IMPORT_FAILED` | 500 | La page est sur le disque et son graphe de modules refuse de se charger. |
| <span id="e-aurora-page-invalid-export"></span>`E_AURORA_PAGE_INVALID_EXPORT` | 500 | Le module de page s'est chargé mais n'exporte pas de factory par défaut. |
| <span id="e-aurora-illegal-root-tag"></span>`E_AURORA_ILLEGAL_ROOT_TAG` | 500 | `renderPage` a reçu une balise racine qui n'est pas un simple nom d'élément. |
| <span id="e-aurora-outside-component"></span>`E_AURORA_OUTSIDE_COMPONENT` | 500 | `onMount` / `onUnmount` a été appelé hors de la fonction de setup d'un `component()`. |
| <span id="e-aurora-missing-context"></span>`E_AURORA_MISSING_CONTEXT` | 500 | `inject` n'a trouvé aucun fournisseur pour le contexte, et il ne déclare pas de défaut. |
| <span id="e-aurora-not-booted"></span>`E_AURORA_NOT_BOOTED` | 500 | Le singleton du manager a été lu avant qu'un provider ou `setAurora` ne le fixe. |
| <span id="e-aurora-unknown-route"></span>`E_AURORA_UNKNOWN_ROUTE` | 500 | `urlFor` a reçu un nom absent du manifeste de routes. |
| <span id="e-aurora-missing-route-params"></span>`E_AURORA_MISSING_ROUTE_PARAMS` | 500 | `urlFor` a reçu une route dont les paramètres obligatoires ne sont pas tous fournis. |
| <span id="e-aurora-unknown-live-component"></span>`E_AURORA_UNKNOWN_LIVE_COMPONENT` | 500 | Un composant live a été monté avant que `registry.define()` ne le nomme. |
| <span id="e-aurora-live-session-limit"></span>`E_AURORA_LIVE_SESSION_LIMIT` | 503 | Une session live a été refusée : le registre tient déjà `maxSessions` sessions, toutes en usage (réclamées et vues depuis moins de la moitié de `idleTimeoutMs`). |
| <span id="e-aurora-relay-request-failed"></span>`E_AURORA_RELAY_REQUEST_FAILED` | 500 | Une requête relay est revenue avec un statut hors 2xx. |
| <span id="e-aurora-unsafe-url"></span>`E_AURORA_UNSAFE_URL` | 500 | Une URL de navigation a échoué au contrôle de même origine / de schéma. |
| <span id="e-aurora-slot-in-tag-name"></span>`E_AURORA_SLOT_IN_TAG_NAME` | 500 | Un `${}` est tombé à la place d'un nom de balise. |
| <span id="e-aurora-slot-in-attribute-name"></span>`E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | 500 | Un `${}` est tombé à la place d'un nom d'attribut. |
| <span id="e-aurora-slot-in-raw-text"></span>`E_AURORA_SLOT_IN_RAW_TEXT` | 500 | Un `${}` est tombé dans `<script>`, `<style>`, `<textarea>`, `<title>`… |
| <span id="e-aurora-slot-in-comment"></span>`E_AURORA_SLOT_IN_COMMENT` | 500 | Un `${}` est tombé dans un commentaire, un `<!…>` / `<?…>` ou une section CDATA. |
| <span id="e-aurora-slot-in-event-attribute"></span>`E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | 500 | Un `${}` est tombé dans un attribut `on*`, dont la valeur est du JavaScript. |
| <span id="e-aurora-slot-in-srcdoc"></span>`E_AURORA_SLOT_IN_SRCDOC` | 500 | Un `${}` est tombé dans `srcdoc`, qu'une iframe analyse comme un document entier. |
| <span id="e-aurora-slot-in-base-url"></span>`E_AURORA_SLOT_IN_BASE_URL` | 500 | Un `${}` est tombé dans `<base href>`, qui rebase toutes les URL de la page. |
| <span id="e-aurora-slot-in-script-source"></span>`E_AURORA_SLOT_IN_SCRIPT_SOURCE` | 500 | Un `${}` est tombé dans l'URL d'où un `<script>` charge son code. |
| <span id="e-aurora-slot-in-html-property"></span>`E_AURORA_SLOT_IN_HTML_PROPERTY` | 500 | Une liaison `.prop` nomme une propriété qui analyse sa valeur comme du HTML. |
| <span id="e-aurora-template-in-attribute"></span>`E_AURORA_TEMPLATE_IN_ATTRIBUTE` | 500 | Un template `html` imbriqué a atteint une valeur d'attribut ou `.value`. |
| <span id="e-aurora-file-input-value"></span>`E_AURORA_FILE_INPUT_VALUE` | 500 | `.value` a reçu une chaîne non vide sur un `<input type="file">`. |
| <span id="e-aurora-duplicate-key"></span>`E_AURORA_DUPLICATE_KEY` | 500 | Deux éléments d'une liste `each()` partagent une clé, qui désigne une seule ligne. |
| <span id="e-aurora-invalid-lazy"></span>`E_AURORA_INVALID_LAZY` | 500 | `each(…, { lazy })` a reçu un `estimate` qui n'est pas une longueur positive, ou un `overscan` négatif ou non numérique. |
| <span id="e-aurora-visits-need-photon"></span>`E_AURORA_VISITS_NEED_PHOTON` | 500 | `visits` est activé mais `@c9up/photon` n'est pas installé, ou trop ancien (le protocole pour aurora est là depuis 0.1.25). |
| <span id="e-aurora-visit-props"></span>`E_AURORA_VISIT_PROPS` | 500 | Avec `visits`, les props d'une page (props partagées comprises) n'étaient pas un objet, comme le `page.props` du protocole l'exige. |
| <span id="e-aurora-invalid-motion"></span>`E_AURORA_INVALID_MOTION` | 500 | `motion=${…}` n'était pas un objet de valeurs animées, ou nommait une propriété que l'animation ne pilote pas (rotation, couleur). |
| <span id="e-aurora-reactive-cycle"></span>`E_AURORA_REACTIVE_CYCLE` | 500 | Des effets se sont relancés sans fin au cours d'une même mise à jour : l'un écrit ce que lui-même, ou un effet qu'il déclenche, lit. |
| <span id="e-aurora-internal"></span>`E_AURORA_INTERNAL` | 500 | Un invariant interne d'aurora a cassé : toujours un bug d'aurora. |
| <span id="e-aurora-visit-no-page-data"></span>`E_AURORA_VISIT_NO_PAGE_DATA` | 500 | Avec `visits` actif, la page ne porte aucun script de données exploitable (`script[data-aurora-page][type="application/json"]`) pour démarrer. |
| <span id="e-aurora-visit-async-first-page"></span>`E_AURORA_VISIT_ASYNC_FIRST_PAGE` | 500 | Avec `visits` actif, la fabrique de la première page est asynchrone : une page hydratée se rend de façon synchrone. |
| <span id="e-aurora-invalid-live-limit"></span>`E_AURORA_INVALID_LIVE_LIMIT` | 500 | Une limite du registre live (`maxSessions`, `maxPerOwner`, `claimTimeoutMs`, `idleTimeoutMs`) n'est pas un nombre positif. |
| <span id="e-aurora-browser-entry-outside-dist"></span>`E_AURORA_BROWSER_ENTRY_OUTSIDE_DIST` | 500 | Un paquet navigateur déclare son point d'entrée hors du `dist/` qu'aurora sert pour lui. |
| <span id="e-aurora-browser-entry-at-root"></span>`E_AURORA_BROWSER_ENTRY_AT_ROOT` | 500 | Un paquet navigateur a son point d'entrée à la racine du paquet : le servir publierait tout le paquet. |
| <span id="e-aurora-browser-package-clash"></span>`E_AURORA_BROWSER_PACKAGE_CLASH` | 500 | Deux paquets navigateur se monteraient sur le même chemin d'assets. |
| <span id="e-aurora-http-request-failed"></span>`E_AURORA_HTTP_REQUEST_FAILED` | 500 | Une requête `HttpClient` a reçu un statut hors 2xx (l'erreur porte ce `status`). |
| <span id="e-aurora-visit-cross-origin-module"></span>`E_AURORA_VISIT_CROSS_ORIGIN_MODULE` | 500 | Avec `visits` actif, l'URL d'un module de page (le motif `modules` des données de page, `{name}` rempli) n'est pas sur l'origine et le schéma de la page, ou son chemin commence par `//`. Rien n'est importé. Servez les modules de page depuis votre propre origine. |

## Erreurs Bay

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-bay-invalid-adapter"></span>`E_BAY_INVALID_ADAPTER` | 500 | Une fabrique d'adaptateur n'a pas construit de driver de file. |
| <span id="e-bay-unsupported-driver"></span>`E_BAY_UNSUPPORTED_DRIVER` | 500 | La clé `driver` nomme un driver ; déclarez-le plutôt sous `adapters`. |
| <span id="e-bay-invalid-binding"></span>`E_BAY_INVALID_BINDING` | 500 | Le conteneur répond autre chose qu'un `QueueManager` pour le jeton `QueueManager`. |
| <span id="e-bay-quasar-missing"></span>`E_BAY_QUASAR_MISSING` | 500 | Un adaptateur Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son gestionnaire n'est pas encore disponible. |
| <span id="e-bay-incomplete-connection"></span>`E_BAY_INCOMPLETE_CONNECTION` | 500 | La connexion Redis n'a pas une commande qu'émet le driver (EVALSHA, SCRIPT LOAD, …). |
| <span id="e-bay-unexpected-reply"></span>`E_BAY_UNEXPECTED_REPLY` | 500 | Un script Redis a répondu quelque chose que le driver ne sait pas lire. |
| <span id="e-bay-invalid-job-options"></span>`E_BAY_INVALID_JOB_OPTIONS` | 500 | Une classe de job déclare une option avec laquelle elle ne peut pas tourner ; le refus précis est dans `cause`. |
| <span id="e-bay-invalid-job-name"></span>`E_BAY_INVALID_JOB_NAME` | 500 | Le `options.name` d'un job est vide, ou `make:job` reçoit un nom qui ne peut devenir ni un fichier ni une classe. |
| <span id="e-bay-duplicate-job"></span>`E_BAY_DUPLICATE_JOB` | 500 | Deux classes de job répondent au même nom. |
| <span id="e-bay-invalid-attempts"></span>`E_BAY_INVALID_ATTEMPTS` | 500 | `maxAttempts` / `maxRetries` n'est pas un entier >= 1, ou un backoff est demandé pour une tentative inférieure à 1. |
| <span id="e-bay-invalid-priority"></span>`E_BAY_INVALID_PRIORITY` | 500 | Une priorité n'est pas un entier de 1 à 10. |
| <span id="e-bay-invalid-retention"></span>`E_BAY_INVALID_RETENTION` | 500 | `removeOnComplete` / `removeOnFail` n'est ni un booléen ni un `{ age?, count? }` valide. |
| <span id="e-bay-invalid-dedup"></span>`E_BAY_INVALID_DEDUP` | 500 | Un `dedup` a un id vide, un ttl qui n'est pas un entier à partir de 1, ou `extend` sans ttl. |
| <span id="e-bay-invalid-worker-options"></span>`E_BAY_INVALID_WORKER_OPTIONS` | 500 | Une option du worker est hors limites : `idleDelay`, `stalledInterval`, `concurrency`, `unknownJobRetries` ou `queues`. |
| <span id="e-bay-unsupported-operation"></span>`E_BAY_UNSUPPORTED_OPERATION` | 500 | Le driver de file n'a pas de `getJob()` ou de `sizeOf()` pour la recherche demandée. |
| <span id="e-bay-invalid-job-factory"></span>`E_BAY_INVALID_JOB_FACTORY` | 500 | La fabrique de jobs a construit autre chose que la classe de job, ou un handler sans `handle()` ; la tentative échoue avec cette erreur. |
| <span id="e-bay-unserializable-job"></span>`E_BAY_UNSERIALIZABLE_JOB` | 500 | Un enregistrement de job ne peut pas être stocké en JSON comme Redis le transporterait. |
| <span id="e-bay-jobs-directory-unreadable"></span>`E_BAY_JOBS_DIRECTORY_UNREADABLE` | 500 | Un répertoire de jobs déclaré existe mais ne peut pas être lu. |
| <span id="e-bay-no-jobs-found"></span>`E_BAY_NO_JOBS_FOUND` | 500 | Des fichiers de jobs ont été parcourus et aucun n'a fourni de sous-classe de `Job`. |
| <span id="e-bay-duplicate-job-id"></span>`E_BAY_DUPLICATE_JOB_ID` | 500 | `FakeQueue.push()` reçoit un id de job qu'elle détient déjà. |
| <span id="e-job-timeout"></span>`E_JOB_TIMEOUT` | 500 | Une tentative a dépassé son `timeout` ; porte `job` (son nom) et `timeout` (ms). C'est ce que `failOnTimeout` reconnaît. |
| <span id="e-worker-already-running"></span>`E_WORKER_ALREADY_RUNNING` | 500 | `work()` est appelée alors que le worker du gestionnaire tourne déjà. |
| <span id="e-invalid-timeout"></span>`E_INVALID_TIMEOUT` | 500 | Le `timeout` d'un job n'est ni `0` ni un nombre entier de millisecondes que `setTimeout` peut tenir (1 à 2147483647). |
| <span id="e-configuration-error"></span>`E_CONFIGURATION_ERROR` | 500 | bay : `config.queue` n'est pas ce que renvoie `defineConfig`, déclare des adaptateurs sans `default`, son `default` nomme un adaptateur qu'il ne déclare pas, un backoff nomme une stratégie inconnue, ou une option de `RedisDriver` (`visibilityTimeoutMs`, `maxStalledCount`, `maxFailedJobs`) est hors limites. |
| <span id="e-queue-not-initialized"></span>`E_QUEUE_NOT_INITIALIZED` | 500 | La file sert avant le boot de `BayProvider` ou l'appel à `setQueue()` (accesseur du service, `Job.dispatch()`, `queue:work`), ou `ready()` passe avant `boot()`. |
| <span id="e-invalid-duration-expression"></span>`E_INVALID_DURATION_EXPRESSION` | 500 | Une durée de bay n'est ni un nombre positif ou nul de millisecondes ni une chaîne comme `'10s'`. Le message nomme la valeur ; `help` nomme l'option qui la portait. |
| <span id="e-bay-fake-job-not-found"></span>`E_BAY_FAKE_JOB_NOT_FOUND` | 500 | Vous demandez à `FakeQueue` de terminer, d'échouer ou de relancer un job qu'elle ne détient pas. |
| <span id="e-adapter-init-error"></span>`E_ADAPTER_INIT_ERROR` | 500 | La fabrique de l'adaptateur de file choisi a levé une erreur en construisant son driver ; cette erreur est la `cause`. |
| <span id="e-invalid-base-delay"></span>`E_INVALID_BASE_DELAY` | 500 | Le `baseDelay` d'un backoff n'est pas supérieur à zéro. |
| <span id="e-invalid-max-delay"></span>`E_INVALID_MAX_DELAY` | 500 | Le `maxDelay` d'un backoff n'est pas supérieur à zéro, ou pas supérieur à `baseDelay`. |
| <span id="e-invalid-multiplier"></span>`E_INVALID_MULTIPLIER` | 500 | Le `multiplier` d'un backoff n'est pas supérieur à zéro, ou est inférieur à 1 pour la stratégie exponentielle. |
| <span id="e-job-not-found"></span>`E_JOB_NOT_FOUND` | 500 | Un job auquel aucun handler ni aucune classe ne répond reste inconnu au-delà de `unknownJobRetries` ; l'enregistrement en échec garde son message. |
| <span id="e-job-max-attempts-reached"></span>`E_JOB_MAX_ATTEMPTS_REACHED` | 500 | Remise au hook `failed()` d'un job une fois ses relances épuisées ; l'erreur de la dernière tentative est la `cause`. |
| <span id="e-job-stalled"></span>`E_JOB_STALLED` | 500 | Le driver Redis de la file classe en échec un job repris à un worker mort plus de `maxStalledCount` fois ; l'enregistrement en échec garde son message. |

## Erreurs Blackhole

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-too-many-requests-blackhole"></span>`E_TOO_MANY_REQUESTS` | 429 | La limitation globale de blackhole a refusé la requête (avec `Retry-After`), ou un middleware de throttle ou `limiter.consume()` a trouvé la clé au-delà de son budget. Attendez et réessayez. |
| <span id="e-bad-csrf-token"></span>`E_BAD_CSRF_TOKEN` | 403 | Token CSRF invalide ou manquant. Renvoyez le cookie `XSRF-TOKEN` dans le header `X-XSRF-TOKEN` (ou le champ de formulaire `_csrf`). |
| <span id="e-blackhole-csrf-origin-mismatch"></span>`E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` | 403 | Une requête qui modifie l'état vient d'une autre origine — un autre hôte, ou le même hôte sur un autre schéma — absente de `csrf.trustedOrigins`. |
| <span id="e-blackhole-path-traversal"></span>`E_BLACKHOLE_PATH_TRAVERSAL` | 400 | Le chemin contient `..`, brut ou encodé en pourcentage. |
| <span id="e-blackhole-parameter-pollution"></span>`E_BLACKHOLE_PARAMETER_POLLUTION` | 400 | Une clé de la query string apparaît deux fois (les clés finissant par `[]` peuvent se répéter). |
| <span id="e-blackhole-missing-ip"></span>`E_BLACKHOLE_MISSING_IP` | 400 | La limite de débit est active et la requête n'a pas d'adresse client sous laquelle la compter. |
| <span id="e-blackhole-session-not-ready"></span>`E_BLACKHOLE_SESSION_NOT_READY` | 500 | Les tokens CSRF sont liés à la session (`csrf.session`) et la requête a atteint blackhole sans session : enregistrez le middleware de session avant celui de blackhole. |
| <span id="e-blackhole-unknown-csp-keyword"></span>`E_BLACKHOLE_UNKNOWN_CSP_KEYWORD` | 500 | La CSP nomme un `@mot-clé` sans résolveur enregistré (`cspKeywords.register`), ou un mot-clé a été enregistré sous un nom invalide. Levée à la création du filtre. |
| <span id="e-blackhole-invalid-csp-keyword-value"></span>`E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE` | 500 | Le résolveur d'un mot-clé CSP a renvoyé une valeur contenant `;`, `,` ou un saut de ligne, qui clorait la directive. |
| <span id="e-blackhole-database-unavailable"></span>`E_BLACKHOLE_DATABASE_UNAVAILABLE` | 500 | Le store de limitation en base n'a rien où compter : `@c9up/atlas` n'est pas installé, pas démarré, ou la connexion nommée n'en est pas une. Passez un client en `connection`, ou configurez atlas. |
| <span id="e-blackhole-unsupported-database"></span>`E_BLACKHOLE_UNSUPPORTED_DATABASE` | 500 | Le store de limitation en base a reçu une base autre que PostgreSQL, MySQL ou SQLite. |
| <span id="e-blackhole-blocked"></span>`E_BLACKHOLE_BLOCKED` | variable | Un refus dont le moteur n'a pas fourni le corps sous forme d'erreur JSON. |
| <span id="e-blackhole-invalid-csp"></span>`E_BLACKHOLE_INVALID_CSP` | 500 | La Content-Security-Policy est invalide : un nom ou une valeur de directive incorrects, un mot-clé sans guillemets, une directive donnée deux fois, pas de `default-src`, un saut de ligne, ou à la fois `directives` et `policy`. |
| <span id="e-blackhole-removed-option"></span>`E_BLACKHOLE_REMOVED_OPTION` | 500 | La configuration fixe encore une option retirée (`securityHeaders`) ; le message nomme son remplacement. |
| <span id="e-blackhole-unknown-option"></span>`E_BLACKHOLE_UNKNOWN_OPTION` | 500 | Une option d'en-tête ou CORS nomme une clé qu'elle n'a pas. |
| <span id="e-blackhole-invalid-header-value"></span>`E_BLACKHOLE_INVALID_HEADER_VALUE` | 500 | La valeur d'une option ne peut pas s'écrire comme valeur d'en-tête (vide, ou un caractère de contrôle ou non ASCII). |
| <span id="e-blackhole-invalid-xframe"></span>`E_BLACKHOLE_INVALID_XFRAME` | 500 | `xFrame.action` n'est ni DENY, ni SAMEORIGIN, ni ALLOW-FROM, ou ALLOW-FROM n'a pas de `domain`. |
| <span id="e-blackhole-invalid-cors"></span>`E_BLACKHOLE_INVALID_CORS` | 500 | CORS combine une origine joker avec `credentials: true`, ou sa liste d'origines contient autre chose que des chaînes non vides. |
| <span id="e-blackhole-invalid-duration"></span>`E_BLACKHOLE_INVALID_DURATION` | 500 | Une durée (`maxAge` de HSTS, une durée de limiteur) est négative ou illisible. |
| <span id="e-blackhole-invalid-rate-limit"></span>`E_BLACKHOLE_INVALID_RATE_LIMIT` | 500 | Une limite de débit ou un limiteur reçoit un nombre de requêtes ou une durée qui n'est pas un entier positif. |
| <span id="e-blackhole-secret-missing"></span>`E_BLACKHOLE_SECRET_MISSING` | — | CSRF est activé et aucun `secret` n'a été donné. |
| <span id="e-blackhole-weak-secret"></span>`E_BLACKHOLE_WEAK_SECRET` | 500 | Le `secret` CSRF est l'exemple de l'échafaudage, ou fait moins de 16 caractères. |
| <span id="e-blackhole-invalid-secret"></span>`E_BLACKHOLE_INVALID_SECRET` | 500 | Le `secret` CSRF n'est ni une chaîne ni un `Secret` qui en enveloppe une. |
| <span id="e-blackhole-napi-required"></span>`E_BLACKHOLE_NAPI_REQUIRED` | — | Le moteur natif de blackhole n'est pas chargé pour cette plateforme ; `cause` porte l'échec du chargement. |
| <span id="e-blackhole-not-registered"></span>`E_BLACKHOLE_NOT_REGISTERED` | 500 | Le middleware a tourné sans instance Blackhole : `BlackholeProvider` n'est pas enregistré, ou l'hôte n'expose pas `ctx.containerResolver`. |
| <span id="e-blackhole-rate-limit-store-missing"></span>`E_BLACKHOLE_RATE_LIMIT_STORE_MISSING` | 500 | `checkRateLimit()` a été appelé sans `rateLimit.store` configuré. |
| <span id="e-blackhole-empty-rate-limit-key"></span>`E_BLACKHOLE_EMPTY_RATE_LIMIT_KEY` | 500 | `checkRateLimit()` a reçu une clé vide, qui compterait toutes les requêtes dans un seul compteur. |
| <span id="e-blackhole-unknown-store"></span>`E_BLACKHOLE_UNKNOWN_STORE` | 500 | Un limiteur ou `rateLimit` nomme un store qui n'est pas déclaré dans `stores`. |
| <span id="e-blackhole-no-default-store"></span>`E_BLACKHOLE_NO_DEFAULT_STORE` | — | `rateLimit` déclare `stores` mais aucun `default` qui nomme celui qui compte. |
| <span id="e-blackhole-limiter-options-missing"></span>`E_BLACKHOLE_LIMITER_OPTIONS_MISSING` | 500 | `limiter.use()` ou `limiter.multi()` a été appelé sans le nombre de requêtes et la durée de son ou ses limiteurs. |
| <span id="e-blackhole-incomplete-throttle"></span>`E_BLACKHOLE_INCOMPLETE_THROTTLE` | 500 | Un middleware de limitation a tourné sur un limiteur sans `allowRequests()` ni `every()`. |
| <span id="e-blackhole-invalid-table-name"></span>`E_BLACKHOLE_INVALID_TABLE_NAME` | 500 | Le `tableName` du store de limiteur en base n'est pas un nom de table. |
| <span id="e-blackhole-quasar-missing"></span>`E_BLACKHOLE_QUASAR_MISSING` | 500 | Un store Redis nomme une connexion et `@c9up/quasar` n'est pas installé. |
| <span id="e-blackhole-incomplete-connection"></span>`E_BLACKHOLE_INCOMPLETE_CONNECTION` | 500 | La connexion quasar nommée n'a pas les commandes que le compteur envoie. |
| <span id="e-blackhole-invalid-xss-attribute"></span>`E_BLACKHOLE_INVALID_XSS_ATTRIBUTE` | 500 | `xss.allowAttributes` nomme un attribut hors de la liste autorisée (`id`, `is`, `slot`, `part`, `data-*`, `class`) ; le moteur natif le refuse. |
| <span id="e-blackhole-unknown-check"></span>`E_BLACKHOLE_UNKNOWN_CHECK` | 500 | `check()` a demandé une vérification que le moteur n'a pas (seules `rateLimit`, `shield` et `csrf` existent). |
| <span id="e-blackhole-invalid-headers"></span>`E_BLACKHOLE_INVALID_HEADERS` | 500 | `check()` a reçu des en-têtes de requête qui ne sont pas un objet de chaînes. |
| <span id="e-blackhole-internal-panic"></span>`E_BLACKHOLE_INTERNAL_PANIC` | 500 | Le moteur natif a paniqué pendant la vérification d'une requête ; `cause` porte l'erreur native. |
| <span id="e-blackhole-invalid-xss-limit"></span>`E_BLACKHOLE_INVALID_XSS_LIMIT` | 500 | `xss.maxInputBytes` ou `xss.maxDepth` n'est pas un entier positif. |
| <span id="e-blackhole-html-too-large"></span>`E_BLACKHOLE_HTML_TOO_LARGE` | 500 | `sanitizeResponse()` (ou la passe `xss`) a reçu un corps `text/html` plus long que `xss.maxInputBytes` (1 Mio par défaut). |
| <span id="e-blackhole-html-too-deep"></span>`E_BLACKHOLE_HTML_TOO_DEEP` | 500 | Le HTML à assainir imbrique des éléments plus profond que `xss.maxDepth` (512 par défaut), mesuré sur l'arbre que construit le parser. |
| <span id="e-blackhole-html-too-complex"></span>`E_BLACKHOLE_HTML_TOO_COMPLEX` | 500 | Le HTML à assainir construit plus de quatre fois sa taille plus 64 Kio (balises de mise en forme mal imbriquées recréées dans chaque bloc). |

## Erreurs Chronos

Chaque refus, côté TypeScript comme dans le moteur Rust, porte son code dans `error.code`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-chronos-invalid-year"></span>`E_CHRONOS_INVALID_YEAR` | 500 | `easterDate` / `holidays` ont reçu une année qui n'est pas un entier de 1583 à 9999 (le comput grégorien). |
| <span id="e-chronos-unknown-country"></span>`E_CHRONOS_UNKNOWN_COUNTRY` | 500 | `holidays` / `isHoliday` ont reçu un pays sans calendrier de jours fériés (connus : `CH`, `FR`). |
| <span id="e-chronos-unknown-region"></span>`E_CHRONOS_UNKNOWN_REGION` | 500 | La région n'est pas le code à deux lettres d'un canton suisse, ou une région a été donnée pour `FR`. |
| <span id="e-chronos-invalid-date"></span>`E_CHRONOS_INVALID_DATE` | 500 | Une date qui n'existe pas : `isHoliday` a reçu une chaîne qui n'est pas une date calendaire `YYYY-MM-DD`, ou un `DateTime` a été construit depuis une `Date` JavaScript invalide. |
| <span id="e-chronos-engine-required"></span>`E_CHRONOS_ENGINE_REQUIRED` | — | Le moteur Chronos (le binaire NAPI sous Node, la build WASM dans un navigateur) ne s'est pas chargé. |
| <span id="e-chronos-invalid-argument"></span>`E_CHRONOS_INVALID_ARGUMENT` | 500 | Un argument est du mauvais type (`fromMillis("12")`, `fromFormat` sans chaîne, `expandRRule(rule, options)` sans le texte de la règle), ou `toRelative` a reçu un `rounding` inconnu. |
| <span id="e-chronos-out-of-range"></span>`E_CHRONOS_OUT_OF_RANGE` | 500 | Une valeur, ou le résultat d'un `plus`/`minus`, sort des années 0000-9999. |
| <span id="e-chronos-conflicting-fields"></span>`E_CHRONOS_CONFLICTING_FIELDS` | 500 | Un format mêle des champs qui se contredisent : un méridien avec une heure sur 24 h, des champs de semaine avec année/mois/jour, un ordinal avec mois/jour. |
| <span id="e-chronos-unsupported-unit"></span>`E_CHRONOS_UNSUPPORTED_UNIT` | 500 | Une unité que chronos ne connaît pas (`fortnight`) a été passée à `plus`, `diff`, `toRelative`, `Duration` ou une méthode d'`Interval`. |
| <span id="e-chronos-missing-unit"></span>`E_CHRONOS_MISSING_UNIT` | 500 | `plus(amount)` / `minus(amount)` sans unité, ou `diff` / `toRelative` avec une liste d'unités vide. |
| <span id="e-chronos-invalid-unit-value"></span>`E_CHRONOS_INVALID_UNIT_VALUE` | 500 | Une quantité d'unité n'est pas un nombre fini (`NaN`, `Infinity`, une chaîne). |
| <span id="e-chronos-invalid-duration"></span>`E_CHRONOS_INVALID_DURATION` | 500 | Une durée illisible ou inutilisable : une durée ISO 8601 qui ne se lit pas, une valeur qui n'est pas un objet d'unités, un pas de `splitBy` nul ou négatif. |
| <span id="e-chronos-invalid-interval"></span>`E_CHRONOS_INVALID_INTERVAL` | 500 | Un `Interval` dont le début suit la fin, ou un intervalle ISO 8601 qui ne se lit pas. |
| <span id="e-chronos-invalid-range"></span>`E_CHRONOS_INVALID_RANGE` | 500 | Un `DateRange` passé à `inRange`, `containsRange`, `overlapsRange` ou `analyzeRange` commence après sa fin. |
| <span id="e-chronos-invalid-locale"></span>`E_CHRONOS_INVALID_LOCALE` | 500 | `setLocale` a reçu une étiquette qu'`Intl` refuse. |
| <span id="e-chronos-invalid-rrule"></span>`E_CHRONOS_INVALID_RRULE` | 500 | `toRRuleString` (ou `expandRRule` avec une règle structurée) a reçu un champ qu'il ne peut pas écrire dans le texte de la règle. |
| <span id="e-chronos-invalid-rrule-limit"></span>`E_CHRONOS_INVALID_RRULE_LIMIT` | 500 | La limite d'`expandRRule` n'est pas un entier positif. |
| <span id="e-chronos-rrule-limit-exceeded"></span>`E_CHRONOS_RRULE_LIMIT_EXCEEDED` | 500 | La limite d'`expandRRule` dépasse le plafond de 10 000. |
| <span id="e-chronos-invalid-column-value"></span>`E_CHRONOS_INVALID_COLUMN_VALUE` | 500 | L'adaptateur de colonne `DateTime` d'atlas a lu une valeur de base d'un type inattendu, ou a dû stocker autre chose qu'un `DateTime`. |
| <span id="e-chronos-internal"></span>`E_CHRONOS_INTERNAL` | 500 | Le moteur a répondu quelque chose que chronos n'attend pas (un bug de chronos, pas de votre code). |
| <span id="e-chronos-unknown-zone"></span>`E_CHRONOS_UNKNOWN_ZONE` | 500 | Un fuseau que la base tz ne connaît pas : `new DateTime(input, zone)`, `DateTime.now(zone)`, `setZone`, `fromSQL`, le `tzid` d'`expandRRule` ou un `TZID` dans son texte. |
| <span id="e-chronos-unreadable-rrule"></span>`E_CHRONOS_UNREADABLE_RRULE` | 500 | `expandRRule` a reçu un texte de règle que le moteur ne sait ni lire ni dérouler : une propriété inconnue ou répétée, une valeur hors bornes, pas de début, une règle au-delà de la taille permise. |

## Erreurs Comet

Levées par le transport WebSocket (`createWebSocketTransport()`), avec l'un des codes ci-dessous : l'appel a échoué sans réponse JSON-RPC. Une erreur JSON-RPC renvoyée par le serveur garde son code numérique.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-comet-connection-failed"></span>`E_COMET_CONNECTION_FAILED` | 500 | Le socket n'a pas pu s'ouvrir : handshake refusé, URL invalide ou réseau. |
| <span id="e-comet-connection-closed"></span>`E_COMET_CONNECTION_CLOSED` | 500 | Le socket s'est fermé pendant que l'appel attendait, ou reste fermé (`reconnect: false`). |
| <span id="e-comet-transport-closed"></span>`E_COMET_TRANSPORT_CLOSED` | 500 | `close()` a été appelé sur le transport ; les appels suivants échouent de la même façon. |
| <span id="e-comet-timeout"></span>`E_COMET_TIMEOUT` | 500 | Aucune réponse dans le délai. |
| <span id="e-comet-message-too-large"></span>`E_COMET_MESSAGE_TOO_LARGE` | 500 | Un message au-delà de `maxMessageBytes`, envoyé ou reçu. |
| <span id="e-comet-backpressure"></span>`E_COMET_BACKPRESSURE` | 500 | Plus de `maxBufferedBytes` attendent déjà d'être envoyés. |
| <span id="e-comet-protocol-error"></span>`E_COMET_PROTOCOL_ERROR` | 500 | Le pair a envoyé ce qu'aucun serveur JSON-RPC ne répond : le socket a été fermé. |
| <span id="e-comet-invalid-message"></span>`E_COMET_INVALID_MESSAGE` | 500 | Le client a transmis autre chose qu'un message JSON-RPC, ou autre chose que du JSON. |
| <span id="e-comet-invalid-option"></span>`E_COMET_INVALID_OPTION` | 500 | `createWebSocketTransport()` a reçu un `timeout`, un `maxMessageBytes` ou un `maxBufferedBytes` qui n'est pas un nombre positif, ou un `timeout` au-delà de ce qu'un minuteur peut attendre. |

## Erreurs Echo

`E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` et `E_L2_CACHE_ERROR` gardent les identifiants que le code de cache intercepte déjà.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-factory-error"></span>`E_FACTORY_ERROR` | 500 | La factory de `getOrSet()` a levé une erreur ; `cause` la contient. |
| <span id="e-factory-hard-timeout"></span>`E_FACTORY_HARD_TIMEOUT` | 500 | La factory n'a pas fini dans son délai strict. |
| <span id="e-undefined-value"></span>`E_UNDEFINED_VALUE` | 500 | Une valeur `null` ou `undefined` a été écrite dans le cache. |
| <span id="e-l2-cache-error"></span>`E_L2_CACHE_ERROR` | 500 | Le second niveau d'un store étagé a échoué et l'échec n'est pas masqué. |
| <span id="e-echo-lock-timeout"></span>`E_ECHO_LOCK_TIMEOUT` | 500 | Un appelant a attendu trop longtemps la factory d'un autre appelant pour la même clé. |
| <span id="e-echo-invalid-argument"></span>`E_ECHO_INVALID_ARGUMENT` | 500 | Une méthode a reçu un argument inutilisable. |
| <span id="e-echo-invalid-duration"></span>`E_ECHO_INVALID_DURATION` | 500 | Une durée n'est ni un nombre de millisecondes ni une chaîne lisible. |
| <span id="e-echo-invalid-config"></span>`E_ECHO_INVALID_CONFIG` | 500 | Une valeur de configuration est illisible, comme une taille qui n'est ni des octets ni `'10mb'`, ou le `keyPrefix` d'une connexion Redis n'est pas une chaîne quand `clear()` en a besoin. |
| <span id="e-echo-unknown-store"></span>`E_ECHO_UNKNOWN_STORE` | 500 | Un nom de store, ou le store par défaut, n'est pas déclaré dans `stores`. |
| <span id="e-echo-unsupported-driver"></span>`E_ECHO_UNSUPPORTED_DRIVER` | — | Le provider par défaut a reçu un driver qu'il ne construit pas. |
| <span id="e-echo-not-taggable"></span>`E_ECHO_NOT_TAGGABLE` | 500 | Invalidation par tag sur un driver (ou un étage) sans tags. |
| <span id="e-echo-scan-unsupported"></span>`E_ECHO_SCAN_UNSUPPORTED` | — | `flush()` sur un client Redis, ou sur un maître de cluster, sans `scan()` ; `KEYS` n'est pas utilisé. |
| <span id="e-echo-unserializable-value"></span>`E_ECHO_UNSERIALIZABLE_VALUE` | — | Le driver mémoire stocke du JSON et la valeur n'a pas de forme JSON. Passez `serialize: false` pour la garder telle quelle. |
| <span id="e-echo-quasar-missing"></span>`E_ECHO_QUASAR_MISSING` | 500 | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| <span id="e-echo-incomplete-connection"></span>`E_ECHO_INCOMPLETE_CONNECTION` | 500 | La connexion quasar n'a pas ce dont echo a besoin (`publish()` / `subscribe()`). |
| <span id="e-echo-not-booted"></span>`E_ECHO_NOT_BOOTED` | — | Le singleton du cache a été utilisé avant `EchoProvider.boot()` ou `setCache()`. |
| <span id="e-echo-bus-subscribe-failed"></span>`E_ECHO_BUS_SUBSCRIBE_FAILED` | 500 | Le bus de cache quasar a signalé un échec d'abonnement qui n'est pas une `Error` ; `cause` contient ce qu'il a signalé. |
| <span id="e-factory-soft-timeout"></span>`E_FACTORY_SOFT_TIMEOUT` | 500 | Jamais levée par echo : au délai souple, la valeur périmée est servie. Exportée sur `errors` pour le code qui la teste. |

## Erreurs Eclipse

`E_LOCK_NOT_OWNED` et `E_LOCK_STORAGE_ERROR` gardent les identifiants que le code de verrou intercepte déjà.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lock-not-owned"></span>`E_LOCK_NOT_OWNED` | 500 | Le verrou n'est pas tenu par ce détenteur : il a expiré, ou un autre le tient. Levée quand le travail a réussi mais que le bail a expiré pendant. |
| <span id="e-lock-storage-error"></span>`E_LOCK_STORAGE_ERROR` | 500 | Le store de verrous a échoué en écriture, lecture ou suppression. |
| <span id="e-eclipse-invalid-ttl"></span>`E_ECLIPSE_INVALID_TTL` | 500 | Un TTL de verrou n'est ni un nombre fini et positif de millisecondes, ni `null`. |
| <span id="e-eclipse-invalid-duration"></span>`E_ECLIPSE_INVALID_DURATION` | 500 | Une chaîne de durée est illisible. |
| <span id="e-eclipse-invalid-retry"></span>`E_ECLIPSE_INVALID_RETRY` | 500 | Une option de `retry` est hors bornes. |
| <span id="e-eclipse-invalid-config"></span>`E_ECLIPSE_INVALID_CONFIG` | 500 | La configuration des verrous est invalide. |
| <span id="e-eclipse-missing-config"></span>`E_ECLIPSE_MISSING_CONFIG` | 500 | `config/lock.ts` manque. |
| <span id="e-eclipse-unknown-store"></span>`E_ECLIPSE_UNKNOWN_STORE` | 500 | Un nom de store de verrous n'est pas déclaré. |
| <span id="e-eclipse-quasar-missing"></span>`E_ECLIPSE_QUASAR_MISSING` | 500 | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| <span id="e-eclipse-incomplete-connection"></span>`E_ECLIPSE_INCOMPLETE_CONNECTION` | 500 | La connexion quasar n'a pas ce dont eclipse a besoin. |
| <span id="e-eclipse-database-unavailable"></span>`E_ECLIPSE_DATABASE_UNAVAILABLE` | 500 | Un store de verrous en base demande atlas, qui n'est pas installé ou n'a pas démarré. |
| <span id="e-eclipse-unsupported-database"></span>`E_ECLIPSE_UNSUPPORTED_DATABASE` | 500 | Un store de verrous en base a reçu un dialecte autre que PostgreSQL, MySQL ou SQLite. |
| <span id="e-eclipse-not-booted"></span>`E_ECLIPSE_NOT_BOOTED` | 500 | Le singleton du gestionnaire de verrous a servi avant `EclipseProvider.boot()` ou `setLocks()`. |
| <span id="e-eclipse-invalid-binding"></span>`E_ECLIPSE_INVALID_BINDING` | 500 | Le conteneur a résolu le jeton `LockManager` en autre chose qu'un `LockManager`. |

## Erreurs Eon

Chaque refus, y compris ceux du compilateur de requêtes, porte son code dans `error.code`. Le code d'erreur numérique de TDengine est dans `taosCode`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-eon-missing-connection"></span>`E_EON_MISSING_CONNECTION` | 500 | Un repository n'a pas de connexion sur laquelle tourner. |
| <span id="e-eon-not-a-supertable"></span>`E_EON_NOT_A_SUPERTABLE` | 500 | Une classe utilisée comme super-table n'est pas décorée avec `@SuperTable`. |
| <span id="e-eon-no-tags"></span>`E_EON_NO_TAGS` | 500 | Une super-table n'a pas de colonne `@Tag` : une table enfant ne peut pas être routée. |
| <span id="e-eon-no-timestamp"></span>`E_EON_NO_TIMESTAMP` | 500 | Une super-table n'a pas de colonne `@Timestamp`. |
| <span id="e-eon-child-stable"></span>`E_EON_CHILD_STABLE` | 500 | `createChildTable()` n'a reçu ni `stable` ni `EntityClass`. |
| <span id="e-eon-child-collision"></span>`E_EON_CHILD_COLLISION` | 500 | Deux jeux de tags distincts mènent à la même table enfant ; eon refuse d'écrire des lignes discordantes sous un seul jeu de tags. |
| <span id="e-eon-child-migration"></span>`E_EON_CHILD_MIGRATION` | 500 | `migrateChildTableNames()` a lu une ligne de la liste des enfants sans nom de table. |
| <span id="e-eon-batch-size"></span>`E_EON_BATCH_SIZE` | 500 | `batchSize` n'est pas un entier positif. |
| <span id="e-eon-bind"></span>`E_EON_BIND` | 500 | Une valeur ne peut pas être écrite telle quelle dans son paramètre STMT : mauvais type, ou décimal que la colonne ne peut pas tenir exactement. |
| <span id="e-eon-server-version"></span>`E_EON_SERVER_VERSION` | 500 | Le chemin STMT en colonnes demande TDengine 3.3.6.0 ou plus récent (stmt2). |
| <span id="e-eon-type"></span>`E_EON_TYPE` | 500 | Une colonne ou un tag a un type inconnu ou absent. |
| <span id="e-eon-ts-type"></span>`E_EON_TS_TYPE` | 500 | Un timestamp n'est ni un bigint ni un nombre entier sûr. |
| <span id="e-eon-param-precision"></span>`E_EON_PARAM_PRECISION` | 500 | Un timestamp numérique n'est pas un entier sûr ; passez les timestamps en nanosecondes en bigint. |
| <span id="e-eon-value-type"></span>`E_EON_VALUE_TYPE` | 500 | Une colonne entière a reçu autre chose qu'un entier sûr ou un bigint. |
| <span id="e-eon-value-range"></span>`E_EON_VALUE_RANGE` | 500 | Une valeur sort de la plage du type de sa colonne ; le connecteur la tronquerait sans le dire. |
| <span id="e-eon-template"></span>`E_EON_TEMPLATE` | 500 | Le compilateur n'a rendu aucune instruction pour le template d'insertion STMT. |
| <span id="e-eon-literal-insert"></span>`E_EON_LITERAL_INSERT` | 500 | Une insertion littérale pour une table enfant s'est compilée en autre chose qu'une seule instruction. |
| <span id="e-eon-hydrate-bigint"></span>`E_EON_HYDRATE_BIGINT` | 500 | Une colonne bigint ou timestamp est revenue avec une valeur non entière. |
| <span id="e-eon-decode"></span>`E_EON_DECODE` | 500 | Une réponse du serveur ou un bloc de résultat ne suit pas le protocole (tronqué, type inconnu, lignes sans métadonnées de colonnes) ; une trame qui ne peut plus être crue ferme la connexion. |
| <span id="e-eon-timeout"></span>`E_EON_TIMEOUT` | 500 | Une requête à TDengine n'a pas eu de réponse dans le délai `timeoutMs`. |
| <span id="e-eon-closed"></span>`E_EON_CLOSED` | 500 | La connexion TDengine s'est fermée alors qu'une requête attendait, ou une requête a été envoyée sur une connexion fermée. |
| <span id="e-eon-connect"></span>`E_EON_CONNECT` | 500 | Le WebSocket vers taosAdapter n'a pas pu s'ouvrir : URL invalide, connexion refusée, ou pas de handshake dans le délai. |
| <span id="e-eon-schemaless-schema"></span>`E_EON_SCHEMALESS_SCHEMA` | 500 | Un type de champ n'a pas de forme line-protocol. |
| <span id="e-eon-schemaless-field"></span>`E_EON_SCHEMALESS_FIELD` | 500 | Une valeur de champ line-protocol sort de la plage de son type. |
| <span id="e-eon-schemaless-tag"></span>`E_EON_SCHEMALESS_TAG` | 500 | Une valeur de tag line-protocol ne peut pas être écrite. |
| <span id="e-eon-schemaless-empty-tag"></span>`E_EON_SCHEMALESS_EMPTY_TAG` | 500 | Une valeur de tag line-protocol est vide. |
| <span id="e-eon-schemaless-no-fields"></span>`E_EON_SCHEMALESS_NO_FIELDS` | 500 | Un point line-protocol n'a aucun champ. |
| <span id="e-eon-schemaless-measurement"></span>`E_EON_SCHEMALESS_MEASUREMENT` | 500 | Le nom de la super-table (measurement) est vide. |
| <span id="e-eon-schemaless-control-char"></span>`E_EON_SCHEMALESS_CONTROL_CHAR` | 500 | Un nom ou une valeur line-protocol contient une fin de ligne ou un caractère de contrôle ; il est refusé, pas échappé. |
| <span id="e-eon-invalid-value"></span>`E_EON_INVALID_VALUE` | 500 | `where()` à un argument prend un callback qui remplit un groupe. |
| <span id="e-eon-empty-where-group"></span>`E_EON_EMPTY_WHERE_GROUP` | 500 | Un groupe `where(callback)` n'a ajouté aucun prédicat. |
| <span id="e-eon-invalid-limit"></span>`E_EON_INVALID_LIMIT` | 500 | `limit()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| <span id="e-eon-invalid-offset"></span>`E_EON_INVALID_OFFSET` | 500 | `offset()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| <span id="e-eon-compile-empty"></span>`E_EON_COMPILE_EMPTY` | 500 | Le compilateur n'a rendu aucune instruction SQL. |
| <span id="e-eon-unexpected-params"></span>`E_EON_UNEXPECTED_PARAMS` | 500 | Une requête temporelle s'est compilée avec des paramètres liés là où du SQL littéral est attendu. |
| <span id="e-eon-internal"></span>`E_EON_INTERNAL` | 500 | Un invariant interne d'eon a cassé, ou le compilateur Rust a paniqué ou n'a pas pu sérialiser son résultat : toujours un bug d'eon. |
| <span id="e-eon-alter-db-one-option"></span>`E_EON_ALTER_DB_ONE_OPTION` | 500 | `alterDatabase()` prend exactement une option. |
| <span id="e-eon-migration-invalid"></span>`E_EON_MIGRATION_INVALID` | 500 | La table de suivi des migrations contient un `executed_at` illisible. |
| <span id="e-eon-migration-locked"></span>`E_EON_MIGRATION_LOCKED` | 500 | Une autre exécution tient le verrou de migration. |
| <span id="e-eon-factory-state"></span>`E_EON_FACTORY_STATE` | 500 | Un état de factory n'est pas défini. |
| <span id="e-eon-fake-unsupported"></span>`E_EON_FAKE_UNSUPPORTED` | 500 | `FakeEonConnection` ne répond qu'aux SELECT simples ; le SQL fenêtré ou agrégé exige un TDengine réel. |
| <span id="e-eon-test-identifier"></span>`E_EON_TEST_IDENTIFIER` | 500 | Un helper de nettoyage de test a reçu un nom qui n'est pas un identifiant simple. |
| <span id="e-eon-napi-not-found"></span>`E_EON_NAPI_NOT_FOUND` | 500 | Le binaire du compilateur de requêtes eon est introuvable. |
| <span id="e-eon-napi-unsupported"></span>`E_EON_NAPI_UNSUPPORTED` | 500 | Il n'existe pas de binaire du compilateur de requêtes eon pour cette plateforme. |
| <span id="e-eon-invalid-duration"></span>`E_EON_INVALID_DURATION` | 500 | Une durée n'est pas un entier positif suivi d'une unité. |
| <span id="e-eon-invalid-fill"></span>`E_EON_INVALID_FILL` | 500 | Un mode `FILL` n'est pas connu de TDengine, ou il lui manque sa valeur. |
| <span id="e-eon-fill-requires-interval"></span>`E_EON_FILL_REQUIRES_INTERVAL` | 500 | `FILL` a été utilisé sans `INTERVAL`. |
| <span id="e-eon-sliding-requires-interval"></span>`E_EON_SLIDING_REQUIRES_INTERVAL` | 500 | `SLIDING` a été utilisé sans `INTERVAL`. |
| <span id="e-eon-offset-requires-limit"></span>`E_EON_OFFSET_REQUIRES_LIMIT` | 500 | `OFFSET` a été utilisé sans `LIMIT`. |
| <span id="e-eon-invalid-order-direction"></span>`E_EON_INVALID_ORDER_DIRECTION` | 500 | Une direction de tri n'est ni `asc` ni `desc`. |
| <span id="e-eon-invalid-pseudo-column"></span>`E_EON_INVALID_PSEUDO_COLUMN` | 500 | Une pseudo-colonne n'est pas de celles qu'eon autorise. |
| <span id="e-eon-invalid-select"></span>`E_EON_INVALID_SELECT` | 500 | Une expression de sélection ne peut pas être compilée. |
| <span id="e-eon-invalid-select-function"></span>`E_EON_INVALID_SELECT_FUNCTION` | 500 | Une sélection nomme une fonction qu'eon n'autorise pas. |
| <span id="e-eon-invalid-db-option"></span>`E_EON_INVALID_DB_OPTION` | 500 | Une valeur d'option de base est invalide. |
| <span id="e-eon-unknown-db-option"></span>`E_EON_UNKNOWN_DB_OPTION` | 500 | Une option de base n'est pas modifiable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| <span id="e-eon-immutable-db-option"></span>`E_EON_IMMUTABLE_DB_OPTION` | 500 | Une option de base est fixée au CREATE et ne peut pas être modifiée. |
| <span id="e-eon-invalid-ttl"></span>`E_EON_INVALID_TTL` | 500 | Le TTL d'une table enfant n'est pas un nombre entier de jours positif ou nul. |
| <span id="e-eon-invalid-wal-level"></span>`E_EON_INVALID_WAL_LEVEL` | 500 | Un `WAL_LEVEL` n'est pas accepté par TDengine. |
| <span id="e-eon-invalid-cachemodel"></span>`E_EON_INVALID_CACHEMODEL` | 500 | Un `CACHEMODEL` n'est pas accepté par TDengine. |
| <span id="e-eon-invalid-precision"></span>`E_EON_INVALID_PRECISION` | 500 | Une précision de base n'est ni `ms`, ni `us`, ni `ns`. |
| <span id="e-eon-keep-too-small"></span>`E_EON_KEEP_TOO_SMALL` | 500 | `KEEP` est inférieur à trois fois `DURATION`. |
| <span id="e-ts-required"></span>`E_TS_REQUIRED` | 500 | La première colonne d'une super-table n'est pas un TIMESTAMP. |
| <span id="e-tags-required"></span>`E_TAGS_REQUIRED` | 500 | Une super-table ne déclare aucun tag, ou un INSERT qui crée une table enfant (`using`), ou son modèle STMT, n'a aucun tag. |
| <span id="e-json-tag-rule"></span>`E_JSON_TAG_RULE` | 500 | JSON est réservé aux tags et doit être le seul tag. |
| <span id="e-type-not-taggable"></span>`E_TYPE_NOT_TAGGABLE` | 500 | Un type qui ne peut pas être un tag (DECIMAL) est utilisé comme tag. |
| <span id="e-length-required"></span>`E_LENGTH_REQUIRED` | 500 | Un type qui exige une longueur (`BINARY(n)`, `NCHAR(n)`…) n'en a pas reçu. |
| <span id="e-name-collision"></span>`E_NAME_COLLISION` | 500 | Un nom figure plusieurs fois parmi les colonnes de tags et de valeurs du template STMT. |
| <span id="e-invalid-clause-type"></span>`E_INVALID_CLAUSE_TYPE` | 500 | Un connecteur WHERE n'est ni `and` ni `or`. |
| <span id="e-invalid-where-group"></span>`E_INVALID_WHERE_GROUP` | 500 | Un groupe WHERE est vide, ou nomme aussi une colonne. |
| <span id="e-invalid-where-value"></span>`E_INVALID_WHERE_VALUE` | 500 | Une valeur WHERE (ou un élément de liste) n'est pas un scalaire, ou la valeur d'un `IN` n'est pas une liste. |
| <span id="e-unsafe-identifier-eon"></span>`E_UNSAFE_IDENTIFIER` | 500 | Le compilateur a refusé un identifiant. |
| <span id="e-unsafe-literal-eon"></span>`E_UNSAFE_LITERAL` | 500 | Le compilateur a refusé une valeur littérale. |
| <span id="e-unsafe-operator"></span>`E_UNSAFE_OPERATOR` | 500 | Le compilateur a refusé un opérateur. |
| <span id="e-eon-not-booted"></span>`E_EON_NOT_BOOTED` | 500 | Une connexion eon (le jeton `eon`, `eon:<nom>` ou `@c9up/eon/services/connection`) a servi avant que `EonProvider.boot()` ne l'ouvre. |
| <span id="e-eon-already-booted"></span>`E_EON_ALREADY_BOOTED` | 500 | `EonProvider.boot()` a tourné une seconde fois alors que ses connexions sont ouvertes ; appelez d'abord `shutdown()`. |
| <span id="e-eon-boot-failed"></span>`E_EON_BOOT_FAILED` | 500 | `EonProvider.boot()` n'a pas pu ouvrir une ou plusieurs des connexions configurées ; `cause` porte le premier échec. |
| <span id="e-eon-unknown-connection"></span>`E_EON_UNKNOWN_CONNECTION` | 500 | La connexion par défaut nommée dans `config/timeseries.ts` ne figure pas parmi ses `connections`. |
| <span id="e-eon-no-database"></span>`E_EON_NO_DATABASE` | 500 | `createDatabase` est activé mais aucune `database` n'est configurée. |
| <span id="e-eon-test-url"></span>`E_EON_TEST_URL` | 500 | `connectTestEon()` a été appelé sans `EON_TEST_URL`. |
| <span id="e-eon-server-error"></span>`E_EON_SERVER_ERROR` | 500 | Le serveur TDengine a refusé une requête (instruction invalide, table absente, identifiants refusés) ; `taosCode` porte le code d'erreur numérique de TDengine. |
| <span id="e-eon-no-topic"></span>`E_EON_NO_TOPIC` | 500 | `subscribe()` n'a reçu aucun topic ; le serveur l'accepterait et ne livrerait rien. |
| <span id="e-eon-seek-no-offset"></span>`E_EON_SEEK_NO_OFFSET` | 500 | `seek()` a reçu une partition sans `offset`. |
| <span id="e-eon-invalid-insert"></span>`E_EON_INVALID_INSERT` | 500 | Un INSERT est arrivé au compilateur sans colonne, sans ligne, avec une ligne dont la largeur diffère de la liste de colonnes, ou avec des `tags` sans `using`. |
| <span id="e-eon-alter-empty"></span>`E_EON_ALTER_EMPTY` | 500 | Un ALTER STABLE est arrivé au compilateur sans aucun changement. |
| <span id="e-unsupported-client-eon"></span>`E_UNSUPPORTED_CLIENT` | 500 | Le compilateur a reçu un autre dialecte que `tdengine`. |
| <span id="e-eon-invalid-spec"></span>`E_EON_INVALID_SPEC` | 500 | L'instruction reçue par le compilateur ne se lit pas. Eon construit toutes les specs lui-même : c'est donc un bug d'eon ou une spec écrite à la main. |

## Erreurs Ephemeris

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-ephemeris-invalid-node"></span>`E_EPHEMERIS_INVALID_NODE` | 500 | Un nœud de données structurées n'a pas de `@type`. |
| <span id="e-ephemeris-invalid-url"></span>`E_EPHEMERIS_INVALID_URL` | 500 | Une URL n'est pas absolue. |
| <span id="e-ephemeris-invalid-date"></span>`E_EPHEMERIS_INVALID_DATE` | 500 | Une date n'est pas au format ISO 8601. |
| <span id="e-ephemeris-invalid-value"></span>`E_EPHEMERIS_INVALID_VALUE` | 500 | Une valeur ne peut pas être sérialisée (une `Date` invalide…). |
| <span id="e-ephemeris-invalid-price"></span>`E_EPHEMERIS_INVALID_PRICE` | 500 | Un prix n'est ni un nombre ni des chiffres avec un point décimal. |
| <span id="e-ephemeris-invalid-currency"></span>`E_EPHEMERIS_INVALID_CURRENCY` | 500 | Une devise n'est pas un code ISO 4217. |
| <span id="e-ephemeris-missing-required"></span>`E_EPHEMERIS_MISSING_REQUIRED` | 500 | Un type n'a pas une propriété que les moteurs de recherche exigent pour lui. |
| <span id="e-ephemeris-unsafe-key"></span>`E_EPHEMERIS_UNSAFE_KEY` | 500 | Une clé que les données structurées ne peuvent pas utiliser (comme `__proto__`). |
| <span id="e-ephemeris-id-taken"></span>`E_EPHEMERIS_ID_TAKEN` | 500 | Un `@id` généré pour un nœud a été donné à un autre. |
| <span id="e-ephemeris-slot-taken"></span>`E_EPHEMERIS_SLOT_TAKEN` | 500 | Un emplacement de nœud est déjà pris par un autre nœud. |
| <span id="e-ephemeris-cycle"></span>`E_EPHEMERIS_CYCLE` | 500 | Un nœud se contient lui-même. |
| <span id="e-ephemeris-too-deep"></span>`E_EPHEMERIS_TOO_DEEP` | 500 | Les données sont imbriquées au-delà de la profondeur permise. |
| <span id="e-ephemeris-too-long"></span>`E_EPHEMERIS_TOO_LONG` | 500 | Une valeur texte dépasse la longueur permise. |
| <span id="e-ephemeris-too-many"></span>`E_EPHEMERIS_TOO_MANY` | 500 | Une liste (un fil d'Ariane…) a plus d'éléments que permis. |

## Erreurs Flare

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-runtime-exception"></span>`E_RUNTIME_EXCEPTION` | 500 | `RuntimeException` : une panne à l'exécution qu'aucune erreur plus précise ne décrit. |
| <span id="e-invalid-arguments-exception"></span>`E_INVALID_ARGUMENTS_EXCEPTION` | 500 | `InvalidArgumentsException` : une fonction a reçu des arguments dont elle ne peut rien faire. |

## Erreurs Goldstone

Les limites du moteur de mail sont refusées avant que le message soit analysé plus loin.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-goldstone-message-too-large"></span>`E_GOLDSTONE_MESSAGE_TOO_LARGE` | 422 | Un message dépasse la limite de taille ; refusé avant le téléchargement quand le serveur annonce sa taille. |
| <span id="e-goldstone-not-a-message"></span>`E_GOLDSTONE_NOT_A_MESSAGE` | 422 | Les octets ne sont pas un message mail. |
| <span id="e-goldstone-too-many-parts"></span>`E_GOLDSTONE_TOO_MANY_PARTS` | 422 | Un message a plus de parties MIME que permis. |
| <span id="e-goldstone-too-deep"></span>`E_GOLDSTONE_TOO_DEEP` | 422 | Les parties MIME sont imbriquées plus profond que permis. |
| <span id="e-goldstone-too-many-headers"></span>`E_GOLDSTONE_TOO_MANY_HEADERS` | 422 | Un message a plus de headers que permis. |
| <span id="e-goldstone-headers-too-large"></span>`E_GOLDSTONE_HEADERS_TOO_LARGE` | 422 | Un bloc d'en-têtes dépasse `maxHeaderBytes`, ou les blocs d'en-têtes des parties d'un message dépassent ensemble `maxPartHeaderBytes`. |
| <span id="e-goldstone-missing-boundaries"></span>`E_GOLDSTONE_MISSING_BOUNDARIES` | 422 | Un message multipart déclare des délimiteurs qui n'apparaissent jamais. |
| <span id="e-goldstone-boundary-too-long"></span>`E_GOLDSTONE_BOUNDARY_TOO_LONG` | 422 | Un délimiteur multipart est plus long que permis. |
| <span id="e-goldstone-too-many-attachments"></span>`E_GOLDSTONE_TOO_MANY_ATTACHMENTS` | 422 | Un message a plus de pièces jointes que permis. |
| <span id="e-goldstone-attachment-too-large"></span>`E_GOLDSTONE_ATTACHMENT_TOO_LARGE` | 422 | Une pièce jointe dépasse la limite de taille. |
| <span id="e-goldstone-html-too-large"></span>`E_GOLDSTONE_HTML_TOO_LARGE` | 422 | Un corps HTML dépasse la limite de taille. |
| <span id="e-goldstone-html-too-deep"></span>`E_GOLDSTONE_HTML_TOO_DEEP` | 422 | Un corps HTML imbrique plus de 1000 éléments, mesurés sur l'arbre que construit l'analyseur HTML. |
| <span id="e-goldstone-html-too-complex"></span>`E_GOLDSTONE_HTML_TOO_COMPLEX` | 422 | Un corps HTML construit un arbre hors de proportion avec son balisage : trop de nœuds, ou trop de travail pour les placer. |
| <span id="e-goldstone-dns-unavailable"></span>`E_GOLDSTONE_DNS_UNAVAILABLE` | 500 | Une vérification d'authenticité avait besoin du DNS et le DNS a échoué. |
| <span id="e-goldstone-invalid-envelope"></span>`E_GOLDSTONE_INVALID_ENVELOPE` | 500 | L'enveloppe donnée à une vérification d'authenticité est invalide (une adresse qui n'est pas une IP…). |
| <span id="e-goldstone-engine"></span>`E_GOLDSTONE_ENGINE` | 500 | Le moteur a échoué sans l'un des codes ci-dessus. |
| <span id="e-goldstone-native-required"></span>`E_GOLDSTONE_NATIVE_REQUIRED` | 500 | Le moteur mail Rust n'est pas chargé. |
| <span id="e-goldstone-invalid-limits"></span>`E_GOLDSTONE_INVALID_LIMITS` | 500 | Une limite d'analyse n'est pas un entier positif inférieur à 2^32. |
| <span id="e-goldstone-invalid-options"></span>`E_GOLDSTONE_INVALID_OPTIONS` | 500 | Une option de vérification d'authenticité n'est pas un entier positif inférieur à 2^32. |
| <span id="e-goldstone-invalid-config"></span>`E_GOLDSTONE_INVALID_CONFIG` | 500 | La configuration de la boîte de réception est invalide (aucune boîte déclarée…). |
| <span id="e-goldstone-insecure-connection"></span>`E_GOLDSTONE_INSECURE_CONNECTION` | 500 | Une boîte se connecterait sans TLS. Fixez `starttls: true`, ou `allowInsecure` pour un serveur de test local. |
| <span id="e-goldstone-unknown-mailbox"></span>`E_GOLDSTONE_UNKNOWN_MAILBOX` | 500 | Un nom de boîte n'est pas configuré. |
| <span id="e-goldstone-uidvalidity-changed"></span>`E_GOLDSTONE_UIDVALIDITY_CHANGED` | 500 | Un dossier surveillé a renuméroté ses messages ; la surveillance reprend depuis le plus récent. |
| <span id="e-goldstone-missing-config"></span>`E_GOLDSTONE_MISSING_CONFIG` | 500 | `GoldstoneProvider` s'est enregistré sans `config/inbox.ts`. |
| <span id="e-goldstone-not-booted"></span>`E_GOLDSTONE_NOT_BOOTED` | 500 | La boîte de `services/main` a servi avant l'enregistrement de `GoldstoneProvider` ou l'appel de `setInbox()`. |
| <span id="e-goldstone-too-many-addresses"></span>`E_GOLDSTONE_TOO_MANY_ADDRESSES` | 422 | Les en-têtes d'adresses d'un message comptent plus d'adresses que `maxAddresses`, comptées avant l'analyse du message. |

## Erreurs du plugin Helix

Levées par `@c9up/helix-plugin-ream`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-helix-plugin-ream-unknown-suite"></span>`E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE` | 500 | Un nom de suite a été demandé mais le fichier rc ne le déclare pas. |
| <span id="e-helix-plugin-ream-suite-configure-unreachable"></span>`E_HELIX_PLUGIN_REAM_SUITE_CONFIGURE_UNREACHABLE` | 500 | Une suite déclare `configure` et le lanceur n'a aucun chemin de module pour le réimporter dans chaque worker. |
| <span id="e-helix-plugin-ream-no-server"></span>`E_HELIX_PLUGIN_REAM_NO_SERVER` | — | `apiClient()` n'a reçu ni `testUtils` ni `boot`. |
| <span id="e-helix-plugin-ream-server-not-started"></span>`E_HELIX_PLUGIN_REAM_SERVER_NOT_STARTED` | — | Aucun serveur ne tourne pour la suite. Ajoutez le hook qui le démarre. |
| <span id="e-helix-plugin-ream-no-test-client"></span>`E_HELIX_PLUGIN_REAM_NO_TEST_CLIENT` | — | Aucun client en jeu. Ajoutez `apiClient()` aux plugins de `tests/bootstrap.ts`. |

## Erreurs Helix

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-helix-assertion-failed"></span>`E_HELIX_ASSERTION_FAILED` | 500 | Une vérification `expect()` ou `assert` a échoué (`AssertionError`). |
| <span id="e-helix-timeout"></span>`E_HELIX_TIMEOUT` | 500 | Un test ou un hook ne s'est pas terminé dans son délai. C'est aussi le code d'une erreur de fichier quand le fichier dépasse `--file-timeout`. |
| <span id="e-helix-test-aborted"></span>`E_HELIX_TEST_ABORTED` | 500 | Le test en cours a appelé `meta.abort(message)`. |
| <span id="e-helix-no-active-test"></span>`E_HELIX_NO_ACTIVE_TEST` | 500 | Une aide réservée aux tests (`getActiveTestOrFail()`, `time.freeze`/`travel`, `override()`, une fonction de `test.macro`) a été appelée hors d'un test en cours. |
| <span id="e-helix-no-active-container"></span>`E_HELIX_NO_ACTIVE_CONTAINER` | 500 | `override()` a été appelé avant `useContainer()`. |
| <span id="e-helix-async-describe"></span>`E_HELIX_ASYNC_DESCRIBE` | 500 | Le corps d'un `describe` a renvoyé une Promise ; attendez la mise en place dans `beforeAll` à la place. |
| <span id="e-helix-nested-group"></span>`E_HELIX_NESTED_GROUP` | 500 | Un `test.group()` a été déclaré dans un autre groupe. |
| <span id="e-helix-invalid-time"></span>`E_HELIX_INVALID_TIME` | 500 | Une valeur de temps est inutilisable : epoch non fini ou hors plage, date illisible, mois ou année fractionnaire, unité inconnue, ou `advanceTimersByTime` négatif. |
| <span id="e-helix-fake-timers-not-installed"></span>`E_HELIX_FAKE_TIMERS_NOT_INSTALLED` | 500 | Un contrôle de timers de `vi` a été appelé avant `vi.useFakeTimers()`. |
| <span id="e-helix-timer-loop"></span>`E_HELIX_TIMER_LOOP` | 500 | Vider les faux timers a dépassé sa limite d'itérations : un timer se reprogramme sans fin. |
| <span id="e-helix-spy-no-property"></span>`E_HELIX_SPY_NO_PROPERTY` | 500 | `vi.spyOn()` vise une propriété que l'objet n'a pas. |
| <span id="e-helix-spy-not-function"></span>`E_HELIX_SPY_NOT_FUNCTION` | 500 | `vi.spyOn()` vise une valeur qui n'est pas une fonction ; passez `{ accessor }` pour un getter ou un setter. |
| <span id="e-helix-spy-no-accessor"></span>`E_HELIX_SPY_NO_ACCESSOR` | 500 | `vi.spyOn()` demande un getter ou un setter que la propriété ne définit pas. |
| <span id="e-helix-already-spied"></span>`E_HELIX_ALREADY_SPIED` | 500 | `vi.spyOn()` vise une méthode déjà espionnée ; appelez d'abord `mockRestore()`. |
| <span id="e-helix-runner-not-drivable"></span>`E_HELIX_RUNNER_NOT_DRIVABLE` | 500 | Un plugin a appelé `runner.add/start/exec/end()` : la découverte et l'exécution appartiennent à la CLI. |
| <span id="e-helix-relative-path"></span>`E_HELIX_RELATIVE_PATH` | 500 | `runTestFile()` a reçu un chemin relatif. |
| <span id="e-helix-invalid-glob"></span>`E_HELIX_INVALID_GLOB` | 500 | Un glob d'inclusion ou d'exclusion a un `{`, `(` ou `[` non fermé ; `cause` contient l'erreur de regex. |
| <span id="e-helix-invalid-threads"></span>`E_HELIX_INVALID_THREADS` | 500 | Le nombre de threads n'est pas un nombre fini. |
| <span id="e-helix-invalid-coverage-threshold"></span>`E_HELIX_INVALID_COVERAGE_THRESHOLD` | 500 | Un seuil de couverture n'est pas un nombre de 0 à 100, ou un seuil de couverture de diff nomme `functions` ou `branches` (la couverture de diff ne compte que les lignes). |
| <span id="e-helix-invalid-diff-coverage"></span>`E_HELIX_INVALID_DIFF_COVERAGE` | 500 | La couverture de diff est activée sans la couverture, ou son `cwd` et `coverage.root` sont disjoints. |
| <span id="e-helix-invalid-watch-options"></span>`E_HELIX_INVALID_WATCH_OPTIONS` | 500 | Le mode watch a reçu un `include` vide ou un `debounceMs` hors plage. |
| <span id="e-helix-watch-failed"></span>`E_HELIX_WATCH_FAILED` | 500 | Le mode watch n'a pas pu surveiller son dossier racine ; `cause` contient l'erreur de `fs.watch`. |
| <span id="e-helix-native-required"></span>`E_HELIX_NATIVE_REQUIRED` | 500 | Le binaire natif de helix manque, n'a pas pu se charger ou est périmé, ou la plateforme n'en a pas. |
| <span id="e-helix-internal"></span>`E_HELIX_INTERNAL` | 500 | Un invariant interne de helix est rompu : un bug de helix, à signaler. Les refus du moteur natif arrivent sous ce code. |
| <span id="e-helix-worker-failed"></span>`E_HELIX_WORKER_FAILED` | 500 | Jamais levée : le `code` d'une erreur de fichier quand le worker n'a pas pu démarrer, a envoyé une trame illisible, est sorti sans résultat, ou est sorti d'une façon que son résultat n'explique pas. |
| <span id="e-helix-unexpected-only"></span>`E_HELIX_UNEXPECTED_ONLY` | 500 | Jamais levée : le `code` de l'erreur d'un test qu'un `.only` ou un `.pin()` sélectionne dans un run qui ne les permet pas (en CI, ou avec `--allow-only=false`). |
| <span id="e-helix-no-test-suite"></span>`E_HELIX_NO_TEST_SUITE` | 500 | Le `code` de l'erreur de fichier pour un fichier qui ne déclare aucun test, sauf avec `--pass-with-no-tests`. |

## Erreurs Inker

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-template-not-found"></span>`E_INKER_TEMPLATE_NOT_FOUND` | 500 | Aucun template ne porte ce nom. |
| <span id="e-inker-parse-error"></span>`E_INKER_PARSE_ERROR` | — | Le template ne peut pas être analysé. |
| <span id="e-inker-unknown-identifier"></span>`E_INKER_UNKNOWN_IDENTIFIER` | — | Une expression nomme un identifiant hors de portée. |
| <span id="e-inker-invalid-path"></span>`E_INKER_INVALID_PATH` | 500 | Un chemin de template est invalide (remontée de répertoire, chemin absolu…). |
| <span id="e-inker-unclosed-interpolation"></span>`E_INKER_UNCLOSED_INTERPOLATION` | — | Un `{{` n'a pas de `}}` correspondant. |
| <span id="e-inker-unclosed-block-tag"></span>`E_INKER_UNCLOSED_BLOCK_TAG` | — | Un tag de bloc n'est pas fermé. |
| <span id="e-inker-unclosed-block"></span>`E_INKER_UNCLOSED_BLOCK` | — | Un bloc n'a pas de `@end`. |
| <span id="e-inker-unmatched-block-end"></span>`E_INKER_UNMATCHED_BLOCK_END` | — | Un `@end` ne ferme aucun bloc. |
| <span id="e-inker-mismatched-block-end"></span>`E_INKER_MISMATCHED_BLOCK_END` | — | Un `@end` ferme un autre bloc que celui ouvert. |
| <span id="e-inker-unknown-directive"></span>`E_INKER_UNKNOWN_DIRECTIVE` | — | Une directive que le moteur ne connaît pas. |
| <span id="e-inker-unknown-tag"></span>`E_INKER_UNKNOWN_TAG` | — | Aucun tag n'est enregistré sous ce nom. Enregistrez-le avec `templates.registerTag()`. |
| <span id="e-inker-invalid-layout-position"></span>`E_INKER_INVALID_LAYOUT_POSITION` | — | `@layout` n'est pas la première instruction du template. |
| <span id="e-inker-duplicate-layout"></span>`E_INKER_DUPLICATE_LAYOUT` | — | Un template déclare plus d'un layout. |
| <span id="e-inker-nested-layout-unsupported"></span>`E_INKER_NESTED_LAYOUT_UNSUPPORTED` | — | Un layout en étend un autre. |
| <span id="e-inker-layout-in-partial"></span>`E_INKER_LAYOUT_IN_PARTIAL` | — | Un partial déclare un layout. |
| <span id="e-inker-circular-include"></span>`E_INKER_CIRCULAR_INCLUDE` | — | Des templates s'incluent en boucle. |
| <span id="e-inker-missing-slot"></span>`E_INKER_MISSING_SLOT` | — | Un composant exige un slot que l'appelant n'a pas rempli. |
| <span id="e-inker-unknown-slot"></span>`E_INKER_UNKNOWN_SLOT` | — | L'appelant remplit un slot que le composant ne déclare pas. |
| <span id="e-inker-disk-required"></span>`E_INKER_DISK_REQUIRED` | — | Un template rendu depuis une chaîne (`renderString`, `renderRaw`) utilise `@layout`, `@include`, `@component` ou `{{> nom }}`, qui ont besoin de fichiers de templates : rendez-le par son nom avec `render(nom, data)`. |
| <span id="e-inker-disk-collision"></span>`E_INKER_DISK_COLLISION` | 500 | Deux disques sont montés sous le même nom. |
| <span id="e-inker-template-collision"></span>`E_INKER_TEMPLATE_COLLISION` | 500 | Deux templates sont enregistrés sous le même nom. |
| <span id="e-inker-invalid-expression"></span>`E_INKER_INVALID_EXPRESSION` | 500 | Une expression ne peut pas être évaluée. |
| <span id="e-inker-invalid-iterable"></span>`E_INKER_INVALID_ITERABLE` | — | `@each` a reçu quelque chose qui n'est pas itérable. |
| <span id="e-inker-helper-throw"></span>`E_INKER_HELPER_THROW` | 500 | Un helper a levé une erreur pendant le rendu. |
| <span id="e-inker-async-not-supported"></span>`E_INKER_ASYNC_NOT_SUPPORTED` | — | Une construction qui rend de façon synchrone a utilisé `await`. |
| <span id="e-inker-render-depth"></span>`E_INKER_RENDER_DEPTH` | — | Le rendu s'est imbriqué trop profondément. |
| <span id="e-inker-dump-die"></span>`E_INKER_DUMP_DIE` | — | `@dd()` a arrêté le rendu et affiché sa valeur. |
| <span id="e-inker-invalid-json-ld"></span>`E_INKER_INVALID_JSON_LD` | 500 | Une valeur donnée au helper JSON-LD ne peut pas tenir en JSON-LD. |
| <span id="e-inker-template-error"></span>`E_INKER_TEMPLATE_ERROR` | — | Un template a levé une erreur lui-même. |
| <span id="e-inker-engine-missing"></span>`E_INKER_ENGINE_MISSING` | 500 | Un template a été rendu par le singleton inker avant que `InkerProvider` ne construise le moteur. |
| <span id="e-inker-napi-required"></span>`E_INKER_NAPI_REQUIRED` | 500 | Le moteur natif d'inker est absent ou ne se charge pas ; le message nomme le paquet de plateforme à installer. |
| <span id="e-inker-not-booted"></span>`E_INKER_NOT_BOOTED` | 500 | Le moteur de rendu (`@c9up/inker/services/main`, ou l'`InkerRenderer` du conteneur) a servi avant l'exécution de `InkerProvider.start()` ou avant que `setInker()` en installe un. |
| <span id="e-inker-invalid-config"></span>`E_INKER_INVALID_CONFIG` | 500 | `config.inker` contient une valeur que le provider ne peut pas utiliser : un `cacheMode` autre que `mtime`, `never` ou `auto`, ou une entrée d'`additionalHelpers` qui n'est pas une fonction. |
| <span id="e-inker-invalid-helper-argument"></span>`E_INKER_INVALID_HELPER_ARGUMENT` | 500 | Un helper de vue (`t`, `url`, `route`, `signedRoute`, `config`, `formAttributes`, `asset`) a reçu un argument inutilisable : un nom ou une clé qui n'est pas une chaîne, ou des paramètres de route qui ne sont pas un objet simple de primitives finies et non nulles. |
| <span id="e-inker-outside-render"></span>`E_INKER_OUTSIDE_RENDER` | 500 | Un helper qui lit la requête a été appelé hors de `inker.render()`. |

## Erreurs Lumen

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lumen-invalid-column"></span>`E_LUMEN_INVALID_COLUMN` | 500 | Une table a reçu une forme de colonne qu'elle n'a pas. |
| <span id="e-lumen-task-no-result"></span>`E_LUMEN_TASK_NO_RESULT` | 500 | Le callback d'une tâche n'a rien renvoyé sans marquer la tâche lui-même. Se lit sur l'`error` du résultat, n'est pas levée. |
| <span id="e-lumen-task-failed"></span>`E_LUMEN_TASK_FAILED` | 500 | Une tâche a échoué avec autre chose qu'une `Error` (une chaîne, une valeur levée, un `{ message, isError: true }` renvoyé) ; `cause` contient la valeur d'origine. |
| <span id="e-lumen-internal"></span>`E_LUMEN_INTERNAL` | 500 | Un invariant interne de lumen a cédé ; un bogue à signaler. |

## Erreurs Nebula

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-nebula-invalid-config"></span>`E_NEBULA_INVALID_CONFIG` | 500 | `config/nebula.ts` n'a pas d'export par défaut, ou une entrée `paths` / `language` n'a pas la bonne forme. |
| <span id="e-nebula-sources-not-built"></span>`E_NEBULA_SOURCES_NOT_BUILT` | 500 | `nebula add` a été demandé dans un langage dont le paquet n'a pas construit les sources (`dist/` pour JavaScript). |
| <span id="e-nebula-invalid-registry"></span>`E_NEBULA_INVALID_REGISTRY` | 500 | Le `registry.json` du paquet installé n'est pas un registre nebula. |
| <span id="e-nebula-unknown-component"></span>`E_NEBULA_UNKNOWN_COMPONENT` | 500 | `nebula add` a reçu un composant que le registre ne contient pas. |
| <span id="e-nebula-unknown-adapter"></span>`E_NEBULA_UNKNOWN_ADAPTER` | 500 | `configure --adapter` a nommé un adaptateur autre que `tailwind`, `unocss` ou `css`. |

## Erreurs Neutrino

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-neutrino-invalid-descriptor"></span>`E_NEUTRINO_INVALID_DESCRIPTOR` | 500 | Les octets ne sont pas un `FileDescriptorSet` valide. |
| <span id="e-neutrino-duplicate-type"></span>`E_NEUTRINO_DUPLICATE_TYPE` | 500 | Deux descripteurs déclarent le même type différemment. |
| <span id="e-neutrino-unknown-type"></span>`E_NEUTRINO_UNKNOWN_TYPE` | 500 | Aucun type message ou enum de ce nom n'est chargé. |
| <span id="e-neutrino-unknown-method"></span>`E_NEUTRINO_UNKNOWN_METHOD` | 500 | Aucune méthode de ce chemin n'est chargée. |
| <span id="e-neutrino-invalid-message"></span>`E_NEUTRINO_INVALID_MESSAGE` | 400 | Les octets ne sont pas un message valide de ce type. |
| <span id="e-neutrino-invalid-metadata"></span>`E_NEUTRINO_INVALID_METADATA` | 500 | Des métadonnées gRPC binaires sont mal formées ; le serveur répond INTERNAL. |
| <span id="e-neutrino-grpc-status"></span>`E_NEUTRINO_GRPC_STATUS` | 500 | Une méthode répond un statut gRPC au lieu d'une réponse ; son message part au client comme détail du statut. |
| <span id="e-neutrino-duplicate-service"></span>`E_NEUTRINO_DUPLICATE_SERVICE` | 500 | Un service est enregistré deux fois. |
| <span id="e-neutrino-invalid-implementation"></span>`E_NEUTRINO_INVALID_IMPLEMENTATION` | 500 | L'implémentation d'une méthode n'est pas une fonction. |
| <span id="e-neutrino-streaming-unsupported"></span>`E_NEUTRINO_STREAMING_UNSUPPORTED` | 500 | Une méthode en flux a été enregistrée ; seules les méthodes unaires sont servies. |
| <span id="e-neutrino-invalid-option"></span>`E_NEUTRINO_INVALID_OPTION` | 500 | Une option de taille n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| <span id="e-neutrino-grpc-unsupported"></span>`E_NEUTRINO_GRPC_UNSUPPORTED` | 500 | Le serveur n'a pas de méthode `grpc()`. Mettez à jour `@c9up/ream`. |
| <span id="e-neutrino-invalid-config"></span>`E_NEUTRINO_INVALID_CONFIG` | 500 | `defineConfig` ne charge aucun schéma, ou `config/protobuf.ts` n'exporte pas la forme de `defineConfig`. |
| <span id="e-neutrino-missing-config"></span>`E_NEUTRINO_MISSING_CONFIG` | 500 | `config/protobuf.ts` manque au boot. |
| <span id="e-neutrino-invalid-binding"></span>`E_NEUTRINO_INVALID_BINDING` | 500 | Le conteneur a renvoyé autre chose pour le jeton `Protobuf` ou `GrpcServices`. |
| <span id="e-neutrino-not-booted"></span>`E_NEUTRINO_NOT_BOOTED` | 500 | `@c9up/neutrino/services/main` ou `services/grpc` a servi avant le boot de `NeutrinoProvider`. |
| <span id="e-neutrino-invalid-reply"></span>`E_NEUTRINO_INVALID_REPLY` | 500 | Une méthode, ou un intercepteur, a renvoyé autre chose qu'un objet message ; l'appel reçoit `INTERNAL` et l'erreur part vers `onError`. |
| <span id="e-neutrino-next-called-twice"></span>`E_NEUTRINO_NEXT_CALLED_TWICE` | 500 | Un intercepteur a appelé `next()` plus d'une fois ; l'appel reçoit `INTERNAL`. |
| <span id="e-neutrino-verifier-failed"></span>`E_NEUTRINO_VERIFIER_FAILED` | 500 | Le vérificateur de jeton de `bearerAuth` a lui-même échoué ; l'appel reçoit `INTERNAL`. |

## Erreurs Nova

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-nova-invalid-subscription"></span>`E_NOVA_INVALID_SUBSCRIPTION` | 400 | Le corps d'abonnement ou de désabonnement n'est pas un `PushSubscription` valide. |
| <span id="e-nova-subscription-conflict"></span>`E_NOVA_SUBSCRIPTION_CONFLICT` | 409 | Une autre requête écrivait le même point de terminaison au même moment. Relancez l'abonnement. |
| <span id="e-nova-subscription-not-found"></span>`E_NOVA_SUBSCRIPTION_NOT_FOUND` | 404 | L'utilisateur n'a pas cet abonnement. |
| <span id="e-nova-missing-user"></span>`E_NOVA_MISSING_USER` | 500 | Le handler d'abonnement a tourné sans utilisateur authentifié. |
| <span id="e-nova-invalid-user-id"></span>`E_NOVA_INVALID_USER_ID` | 500 | L'utilisateur authentifié n'a pas d'id utilisable (une chaîne non vide ou un entier), ou `pushToUser` a reçu un id qui n'en est pas un. |
| <span id="e-nova-vapid-not-configured"></span>`E_NOVA_VAPID_NOT_CONFIGURED` | 500 | Une clé VAPID ou le sujet manque. |
| <span id="e-nova-http-client-missing"></span>`E_NOVA_HTTP_CLIENT_MISSING` | 500 | Envoyer une notification exige le client HTTP sortant de `@c9up/ream`. |
| <span id="e-nova-unknown-store"></span>`E_NOVA_UNKNOWN_STORE` | 500 | La configuration nomme un store qu'elle ne déclare pas. |
| <span id="e-nova-invalid-table"></span>`E_NOVA_INVALID_TABLE` | 500 | Le nom de table du store SQL n'est pas un identifiant simple. |
| <span id="e-nova-invalid-prefix"></span>`E_NOVA_INVALID_PREFIX` | 500 | Le préfixe de clés du store Redis contient un espace. |
| <span id="e-nova-store-busy"></span>`E_NOVA_STORE_BUSY` | 500 | Un abonnement a changé à chaque tentative d'écriture. |
| <span id="e-nova-store-file-unreadable"></span>`E_NOVA_STORE_FILE_UNREADABLE` | 500 | Le fichier du store fichier n'est pas du JSON valide. |
| <span id="e-nova-quasar-missing"></span>`E_NOVA_QUASAR_MISSING` | 500 | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| <span id="e-nova-redis-incomplete"></span>`E_NOVA_REDIS_INCOMPLETE` | 500 | La connexion quasar n'a pas ce dont nova a besoin. |
| <span id="e-nova-not-booted"></span>`E_NOVA_NOT_BOOTED` | 500 | `@c9up/nova/services/main` a servi avant l'exécution de `NovaProvider.boot()`. |
| <span id="e-nova-invalid-option"></span>`E_NOVA_INVALID_OPTION` | 500 | Une option d'envoi ou de magasin sort de ses limites : `concurrency`, `timeout`, une entrée de `pushServices` ou `allowHosts`, `maxSubscriptionsPerUser`, `maxPerUser`, ou le `ttl` ou le `topic` d'un envoi. |
| <span id="e-nova-assertion-failed"></span>`E_NOVA_ASSERTION_FAILED` | 500 | `FakeNova.assertPushed()` ou `assertNotPushed()` n'est pas vérifiée. |
| <span id="e-nova-invalid-predicate"></span>`E_NOVA_INVALID_PREDICATE` | 500 | Une assertion de `FakeNova` a reçu un `containing` vide, qui correspondrait à tout envoi. |
| <span id="e-nova-internal"></span>`E_NOVA_INTERNAL` | 500 | Un invariant de nova a cédé (la paire de clés VAPID générée par Node a une forme inattendue). Un bug : signalez-le. |
| <span id="e-nova-service-worker-unsupported"></span>`E_NOVA_SERVICE_WORKER_UNSUPPORTED` | 500 | `@c9up/nova/client` s'est exécuté sans `navigator.serviceWorker`. |
| <span id="e-nova-push-subscribe-failed"></span>`E_NOVA_PUSH_SUBSCRIBE_FAILED` | 500 | Le navigateur a refusé `pushManager.subscribe()` ; son erreur est la `cause`. |
| <span id="e-nova-endpoint-rejected"></span>`E_NOVA_ENDPOINT_REJECTED` | 500 | La route d'abonnement a refusé `subscribe()` ou `unsubscribe()` ; `status` et `responseBody` gardent sa réponse. |

## Erreurs Orbit

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-no-host"></span>`E_ORBIT_NO_HOST` | 500 | `mount` a tourné avant que `useHost` donne à orbit un hôte natif, ou le module n'est pas celui d'orbit. |
| <span id="e-orbit-commit-failed"></span>`E_ORBIT_COMMIT_FAILED` | 500 | L'hôte natif a refusé une transmission ; le message porte son rapport. Ce qu'elle portait est renvoyé avec la suivante ; le refus d'une transmission planifiée va à `onError` de `mount`. |
| <span id="e-orbit-unsupported-element"></span>`E_ORBIT_UNSUPPORTED_ELEMENT` | 500 | Un élément sans correspondance native (`select`, `canvas`, ou `text` / un dégradé dans un `svg`). |
| <span id="e-orbit-block-in-text"></span>`E_ORBIT_BLOCK_IN_TEXT` | 500 | Un élément bloc dans du texte : un texte natif ne contient que des passages en ligne. |
| <span id="e-orbit-invalid-motion"></span>`E_ORBIT_INVALID_MOTION` | 500 | `motion=${…}` n'était pas un objet de valeurs animées. |
| <span id="e-orbit-invalid-scroll-binding"></span>`E_ORBIT_INVALID_SCROLL_BINDING` | 500 | `scroll-y=${…}` n'était pas une valeur animée. |
| <span id="e-orbit-invalid-color"></span>`E_ORBIT_INVALID_COLOR` | 500 | Une couleur qu'orbit ne sait pas lire. |
| <span id="e-orbit-insecure-image-url"></span>`E_ORBIT_INSECURE_IMAGE_URL` | 500 | `<img src>` en http simple : les images ne se chargent qu'en https. Levée pour une adresse écrite dans le template ; pour une adresse venue des données, l'image n'affiche rien et l'erreur va à `onError` de `mount`. |
| <span id="e-orbit-image-source"></span>`E_ORBIT_IMAGE_SOURCE` | 500 | `<img src>` avec un schéma qui n'est pas une source d'image (`data:`, `javascript:`…), sans schéma (`//hote/a.png`) ou une URL `file:` qui ne se décode pas. Levée ou signalée comme `E_ORBIT_INSECURE_IMAGE_URL`. |
| <span id="e-orbit-duplicate-key"></span>`E_ORBIT_DUPLICATE_KEY` | 500 | Deux éléments d'une liste `each` partagent une clé. |
| <span id="e-orbit-no-screen"></span>`E_ORBIT_NO_SCREEN` | 500 | `useScreen()` dans un composant qu'aucun écran d'une pile n'a construit. |
| <span id="e-orbit-stack-shown"></span>`E_ORBIT_STACK_SHOWN` | 500 | Une même pile placée à deux endroits : une pile s'affiche une fois. |
| <span id="e-orbit-style-table"></span>`E_ORBIT_STYLE_TABLE` | 500 | `useStyles` a reçu autre chose qu'une table écrite par `ream css:compile`. |
| <span id="e-orbit-insecure-server"></span>`E_ORBIT_INSECURE_SERVER` | 500 | `serverPages({ server })` en http simple vers un hôte qui n'est ni cette machine ni celle de l'émulateur. |
| <span id="e-orbit-unknown-page"></span>`E_ORBIT_UNKNOWN_PAGE` | 500 | Le serveur a nommé une page que l'app n'a pas (`serverPages({ pages })`). |
| <span id="e-orbit-foreign-origin"></span>`E_ORBIT_FOREIGN_ORIGIN` | 500 | Une connexion au serveur a reçu un chemin qui mène à une autre origine. |
| <span id="e-orbit-server-request-failed"></span>`E_ORBIT_SERVER_REQUEST_FAILED` | 500 | Le serveur a répondu à une requête `json` par une réponse vide hors 2xx. |
| <span id="e-orbit-no-xhr"></span>`E_ORBIT_NO_XHR` | 500 | Les événements serveur demandent un `XMLHttpRequest`, et la plateforme n'en a pas. |
| <span id="e-orbit-object-url-unavailable"></span>`E_ORBIT_OBJECT_URL_UNAVAILABLE` | 500 | `URL.createObjectURL` a été appelé sans `URL` de la plateforme pour fabriquer des URL de blob. Une `TypeError`, comme l'API native. |
| <span id="e-orbit-invalid-url"></span>`E_ORBIT_INVALID_URL` | 500 | Le `URL` standard a reçu une URL, ou une base, qui ne s'analyse pas. Une `TypeError`, comme l'API native. |
| <span id="e-orbit-unsupported-encoding"></span>`E_ORBIT_UNSUPPORTED_ENCODING` | 500 | Le `TextDecoder` standard a reçu un label d'encodage autre que celui d'UTF-8. Une `RangeError`, comme l'API native. |
| <span id="e-orbit-invalid-decoder-input"></span>`E_ORBIT_INVALID_DECODER_INPUT` | 500 | `TextDecoder.decode` a reçu autre chose qu'un `ArrayBuffer` ou une vue sur l'un d'eux. Une `TypeError`, comme l'API native. |
| <span id="e-orbit-invalid-encoded-data"></span>`E_ORBIT_INVALID_ENCODED_DATA` | 500 | Un `TextDecoder` `fatal` a rencontré des octets qui ne sont pas de l'UTF-8 valide. Une `TypeError`, comme l'API native. |
| <span id="e-orbit-internal"></span>`E_ORBIT_INTERNAL` | 500 | Un invariant interne d'orbit a cédé : un bug d'orbit. |
| <span id="e-orbit-tree-too-deep"></span>`E_ORBIT_TREE_TOO_DEEP` | 500 | Les vues s'imbriquent sur plus de 100 niveaux : l'hôte calcule la mise en page sur la pile du fil JS et refuse donc la transmission avant la mise en page. Ce qu'elle portait est renvoyé avec la suivante. |
| <span id="e-orbit-svg-value"></span>`E_ORBIT_SVG_VALUE` | 500 | Une valeur d'un `<svg>` que l'hôte ne sait pas lire (une longueur `NaN`, des données de chemin, `points` ou `transform` illisibles). Cette forme est laissée de côté et le reste est dessiné ; passée à `onError` de `mount`, jamais levée. |

## Erreurs Orbit Clipboard

Levées par `@c9up/orbit-clipboard`, les mêmes dans le navigateur et sur un téléphone.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-clipboard-unavailable"></span>`E_ORBIT_CLIPBOARD_UNAVAILABLE` | 500 | Aucun presse-papiers accessible : le serveur, une page non sécurisée, ou une app construite sans le module natif. |
| <span id="e-orbit-clipboard-denied"></span>`E_ORBIT_CLIPBOARD_DENIED` | 500 | La plateforme a refusé : pas de permission, ou la page ou l'app n'avait pas le focus. |

## Erreurs Orbit Secure Store

Levées par `@c9up/orbit-secure-store`. Une vérification biométrique annulée n'est pas une vérification échouée.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-secure-store-unavailable"></span>`E_ORBIT_SECURE_STORE_UNAVAILABLE` | 500 | Pas de stockage sécurisé ici : le navigateur, le serveur, ou une app construite sans le module. |
| <span id="e-orbit-secure-store-invalid-key"></span>`E_ORBIT_SECURE_STORE_INVALID_KEY` | 500 | Une clé qui n'est pas faite de 1 à 128 caractères parmi `A-Z a-z 0-9 . _ -`. |
| <span id="e-orbit-secure-store-no-biometrics"></span>`E_ORBIT_SECURE_STORE_NO_BIOMETRICS` | 500 | `requireAuthentication` sur un téléphone sans biométrie forte enregistrée. |
| <span id="e-orbit-secure-store-auth-cancelled"></span>`E_ORBIT_SECURE_STORE_AUTH_CANCELLED` | 500 | L'utilisateur a fermé la demande biométrique. |
| <span id="e-orbit-secure-store-auth-failed"></span>`E_ORBIT_SECURE_STORE_AUTH_FAILED` | 500 | La vérification biométrique a échoué pour de bon : trop d'essais, un verrouillage, une erreur matérielle. |
| <span id="e-orbit-secure-store-invalidated"></span>`E_ORBIT_SECURE_STORE_INVALIDATED` | 500 | La clé derrière la valeur a disparu (nouvelle biométrie enregistrée, données de l'app restaurées), et la valeur avec elle. |
| <span id="e-orbit-secure-store-failed"></span>`E_ORBIT_SECURE_STORE_FAILED` | 500 | Tout autre échec signalé par la plateforme ; l'erreur ne porte jamais la valeur. |

## Erreurs Parsec

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-parsec-invalid-name"></span>`E_PARSEC_INVALID_NAME` | 500 | Un nom de métrique ou de label n'est pas valide. |
| <span id="e-parsec-invalid-instrument"></span>`E_PARSEC_INVALID_INSTRUMENT` | 500 | Un instrument est déclaré avec des options qu'il ne peut pas avoir. |
| <span id="e-parsec-instrument-conflict"></span>`E_PARSEC_INSTRUMENT_CONFLICT` | 500 | Un nom de métrique est déjà déclaré avec un autre type, une autre aide ou d'autres labels. |
| <span id="e-parsec-invalid-measurement"></span>`E_PARSEC_INVALID_MEASUREMENT` | 500 | Une mesure n'est pas un nombre fini. |
| <span id="e-parsec-invalid-label-value"></span>`E_PARSEC_INVALID_LABEL_VALUE` | 500 | Une valeur de label n'est ni une chaîne ni un nombre fini. |
| <span id="e-parsec-undeclared-label"></span>`E_PARSEC_UNDECLARED_LABEL` | 500 | Une mesure a reçu un label que la métrique ne déclare pas. |
| <span id="e-parsec-unknown-exporter"></span>`E_PARSEC_UNKNOWN_EXPORTER` | 500 | Un nom d'exporteur n'est pas déclaré. |
| <span id="e-parsec-unprotected-endpoint"></span>`E_PARSEC_UNPROTECTED_ENDPOINT` | 500 | Le point de terminaison des métriques serait servi sans protection. Fixez un token, ou `public: true` délibérément. |
| <span id="e-parsec-empty-token"></span>`E_PARSEC_EMPTY_TOKEN` | 500 | Le token du point de terminaison des métriques est vide, ce qui accepterait une requête sans identifiants. |
| <span id="e-parsec-invalid-config"></span>`E_PARSEC_INVALID_CONFIG` | 500 | `config/metrics.ts` n'exporte pas `defineConfig({ default, exporters })`. |
| <span id="e-parsec-invalid-binding"></span>`E_PARSEC_INVALID_BINDING` | 500 | Le conteneur répond autre chose qu'un `MetricsManager` pour le jeton `MetricsManager`. |
| <span id="e-parsec-not-booted"></span>`E_PARSEC_NOT_BOOTED` | 500 | Le service `metrics` ou le middleware HTTP a servi avant que `ParsecProvider` ait lié le gestionnaire, ou avant `setMetrics()`. |

## Erreurs Photon

Les erreurs côté serveur sont levées par `@c9up/photon` (SSR / renderer) ; les erreurs côté navigateur par `@c9up/photon/client` (hydratation / SPA-nav). Chaque code expose un `docsUrl` qui pointe vers son ancre ci-dessous — l'opérateur saute directement du terminal aux instructions de récupération.

### E_PHOTON_INVALID_CONFIG

**Cause.** Un champ de `config/photon.ts` (ou la `PhotonConfig` passée à `PhotonRenderer`) échoue la validation : `buildDir` se résout en dehors de la racine du projet, ou `ssr.entrypoint` / `entryClient` contient des segments de path-traversal ou des caractères hors de `[\w./\-@#]`.

**Fix.**
1. Ouvrez `config/photon.ts` et vérifiez que `buildDir` est un path relatif INTÉRIEUR au projet (par ex. `dist`, PAS `../dist`).
2. Vérifiez que `ssr.entrypoint` et `entryClient` sont des paths relatifs sans segments `..` et se terminent par `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Redémarrez le renderer (`PhotonRenderer.boot()` revalide).

Levée aussi au rendu quand `rootView` nomme un template mais que la requête n'a pas de moteur de vues (`ctx.view`) : installez-en un (`@c9up/inker` le pose), ou faites renvoyer à `rootView` une fonction qui écrit le document.

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_MISSING

**Cause.** Le manifest Vite à `${buildDir}/manifest.json` est absent au moment où `PhotonRenderer.boot()` tourne en mode production. Le manifest est un artefact de build — son absence signifie presque toujours que le build n'a jamais été lancé pour ce déploiement, ou que la sortie du build n'a pas été embarquée.

**Fix.**
1. Lancez le script de build (par ex. `pnpm build`) avant de démarrer le serveur en production.
2. Vérifiez que votre pipeline de déploiement copie bien le dossier de build (par défaut `public/build/`) dans l'image runtime.
3. Confirmez que `PhotonConfig.buildDir` correspond au chemin où Vite écrit sa sortie.

L'erreur levée porte `context: { manifestPath, buildDir }` pour le diagnostic, et `cause` forwarde l'erreur `fs.access` originale (utile pour distinguer ENOENT d'EACCES).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_INVALID

**Cause.** Le manifest Vite est là mais illisible, pas du JSON, ou pas un objet de manifest. Photon l'ignorait avec un warning puis pointait chaque page vers un `client.js` que le build n'avait jamais écrit : le serveur semblait sain et rien ne s'hydratait. Le boot échoue désormais.

**Fix.**
1. Reconstruisez le client et redéployez tout le dossier de build — une copie partielle en est la cause habituelle.
2. Vérifiez que le processus peut lire le fichier.

L'erreur levée porte `context: { manifestPath }`, et `cause` l'erreur de lecture ou de parsing.

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_LOAD_FAILED

**Cause.** Le manifest Vite est présent, mais le module SSR échoue au chargement : sortie de build manquante pour `ssr.entrypoint` (ou, en développement, aucun fichier à cet endroit), erreur de syntaxe dans le fichier SSR bundlé, ou peer dependency manquante au runtime. À distinguer de `E_PHOTON_MANIFEST_MISSING` — ce dernier code est levé quand le manifest est absent ; celui-ci quand le manifest est là mais que `import()` du SSR rejette.

**Fix.**
1. Relancez `ream build` (ou votre script de build) et lisez attentivement les warnings.
2. Vérifiez que le fichier SSR existe à l'un des chemins attendus (`<ssrBuildDir>/ssr.js` ou `<ssrBuildDir>/<entryName>.js`, `ssrBuildDir` valant `build/ssr` par défaut).
3. Si le build tourne mais l'import échoue quand même, inspectez le fichier bundlé pour des peer dependencies absentes (par ex. `react-dom/server` pour l'adapter React).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_RENDER_FAILED

**Cause.** Le module SSR s'est bien chargé, mais son appel `render(pageData)` a levé ou retourné une valeur non-string. Causes courantes : un composant lève pendant le render, un équivalent `useEffect` tourne côté serveur et accède à `window`, ou le SSR retourne `undefined`.

**Fix.**
1. Lisez `error.cause` (ou le `hint`) — il porte le message d'erreur original du module SSR.
2. Auditez le composant page pour des globaux navigateur (`window`, `document`, `localStorage`) accédés au niveau module ou dans le render.
3. Confirmez que l'export `render()` du SSR retourne bien une string (React : `renderToString(...)` ; Vue : `renderToString(...)` de `@vue/server-renderer` ; Svelte : `<App />.render(...).html`).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_HYDRATION_NO_DATA

**Cause.** L'appel `hydrate()` côté navigateur a tourné mais aucun bloc `<script id="photon-data" type="application/json">` n'a été trouvé dans le document. Signifie presque toujours que la page n'a PAS été rendue via `PhotonRenderer.render()` (réponse HTML écrite à la main, fichier statique, ou page 404).

**Fix.**
1. Confirmez que la route qui renvoie cette page passe bien par `PhotonMiddleware` / `PhotonRenderer.render()`.
2. Si vous servez un fallback SPA, rendez-le aussi via Photon — même un shell vide a besoin du bloc data pour que `hydrate()` le trouve.

**Lieu du throw :** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_BAD_DATA

**Cause.** Le bloc `<script id="photon-data">` a été trouvé, mais son contenu n'est pas un objet JSON avec la forme attendue `{ component, props, url, framework }`. Causes : mangling HTML par un CDN / proxy qui réencode les blocs script, double-escaping par un middleware qui ne sait pas que le bloc est censé rester du JSON brut, ou édition manuelle du template SSR.

**Fix.**
1. Inspectez la source de la page : le contenu du bloc doit faire un round-trip propre via `JSON.parse`.
2. Désactivez tout middleware qui réécrit le HTML (compression, link-rewriting, injection de nonce CSP) qui touche le body — vérifiez que le bloc reste intact en production.
3. Si vous avez personnalisé le template SSR, gardez le bloc `<script type="application/json" id="photon-data">…</script>` exactement tel que `PhotonRenderer.render()` l'émet.

**Lieu du throw :** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_NO_TARGET

**Cause.** Le sélecteur de cible d'hydratation (par défaut `#app`) n'a matché aucun nœud DOM. Habituellement une option `target` custom qui n'existe pas dans le HTML SSR, ou un `id="app"` retiré d'un template custom.

**Fix.**
1. Confirmez que le HTML SSR contient bien l'élément qui matche `hydrate({ target })`.
2. Si vous avez personnalisé l'enveloppe HTML du renderer, gardez le `<div id="app">…</div>` (ou surchargez `target` pour qu'il corresponde à l'id de votre wrapper).

**Lieu du throw :** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK

**Cause.** Le champ `framework` du bloc page-data n'est pas l'une des valeurs `react`, `vue` ou `svelte`. Soit le côté SSR a écrit une valeur inattendue, soit page-data a été fabriqué à la main avec une typo.

**Fix.**
1. Vérifiez que `PhotonConfig.framework` côté serveur est bien réglé sur une valeur supportée.
2. Si vous sérialisez page-data manuellement (rare), assurez-vous que `framework` matche exactement le literal du union.

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED

**Cause.** Photon a bien lu page-data et dispatché vers le bon adapter, mais l'`import()` dynamique du runtime du framework a rejeté. Presque toujours une peer dependency manquante : `react` + `react-dom` pour React, `vue` pour Vue, `svelte` pour Svelte.

**Fix.**
1. Installez le runtime du framework : `pnpm add react react-dom` (ou `vue`, ou `svelte`).
2. Le `cause` de l'erreur porte l'échec de résolution module original — utile quand le package est installé mais qu'un sous-chemin manque (par ex. `react-dom/client` requiert React 18+).

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_UNKNOWN_ROUTE

**Cause.** Un `Link`, un `Form`, `router.visit` ou `urlFor` a nommé une route que le navigateur ne connaît pas : elle n'est pas parmi les routes transmises avec `setRoutes()`, ou `setRoutes()` n'a jamais été appelé.

**Fix.**
1. Appelez `setRoutes(router.namedRoutes())` une fois, avant le rendu de la première page ; le `hint` de l'erreur liste les routes connues.
2. Vérifiez le nom par rapport au `router.as(...)` du serveur.

**Lieu du throw :** `packages/photon/src/client/routes.ts`.

### E_PHOTON_MISSING_ROUTE_PARAMS

**Cause.** Une route nommée a des paramètres (`/users/:id`) que `routeParams` n'a pas fournis. Le message les nomme ; `context` porte la route et les paramètres donnés.

**Fix.** Passez chaque paramètre de la route dans `routeParams`.

**Lieu du throw :** `packages/photon/src/client/routes.ts`.

### E_PHOTON_UNKNOWN_PAGE

**Cause.** Le `resolve` donné à `createPhotonApp` n'a rien renvoyé pour un nom de page — le plus souvent un chemin construit depuis le nom qui ne correspond à aucun fichier d'`import.meta.glob`.

**Fix.** Comparez le chemin que `resolve` construit depuis le nom de page avec votre dossier de pages ; `resolvePageComponent` lève une erreur avec le chemin cherché.

**Lieu du throw :** `packages/photon/src/client/app.ts`.

### À propos des hydration mismatches

Les hydration mismatches (le HTML rendu côté serveur diffère du premier render côté client) ne sont **pas** levés par Photon. Chaque framework gère ce diagnostic lui-même :

- **React** : émet un `console.error` avec `Hydration failed because ...`. Voir https://react.dev/errors/418.
- **Vue** : émet un warning console `[Vue warn]: Hydration ...`.
- **Svelte** : émet une `Error: hydration_failed` depuis `svelte/internal`.

Si vous en voyez un, la cause est presque toujours un **render non déterministe** : un `Date.now()`, un `Math.random()`, un `useEffect` qui ne tourne que côté client, ou un check `process.env` qui diffère entre serveur et navigateur. Le contrat de Photon est que `render(component, props)` est pur ; assurez-vous que votre composant l'est aussi.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-photon-missing-config"></span>`E_PHOTON_MISSING_CONFIG` | — | Le conteneur a résolu `PhotonRenderer` et il n'y a pas de `config/photon.ts`. |
| <span id="e-photon-invalid-duration"></span>`E_PHOTON_INVALID_DURATION` | — | L'`expiresIn` d'une prop `once()` n'est ni des millisecondes ni une durée comme `30s`, `5m`, `7d`. |
| <span id="e-photon-scroll-cursor-underivable"></span>`E_PHOTON_SCROLL_CURSOR_UNDERIVABLE` | — | `scroll()` a reçu une valeur qui n'est pas un paginateur par offset, sans callback de curseur ; passez-en un en second argument. |
| <span id="e-photon-invalid-page-module"></span>`E_PHOTON_INVALID_PAGE_MODULE` | — | `resolvePageComponent` a chargé un module sans export par défaut. |
| <span id="e-photon-invalid-page-response"></span>`E_PHOTON_INVALID_PAGE_RESPONSE` | — | La première page demandée au serveur a répondu un statut d'erreur, ou autre chose qu'un objet page JSON. |
| <span id="e-photon-no-router-host"></span>`E_PHOTON_NO_ROUTER_HOST` | — | Le routeur client a tourné sans hôte : pas de document de navigateur, et aucun passé à `bootPage`. |
| <span id="e-photon-no-page"></span>`E_PHOTON_NO_PAGE` | — | `usePage()` a été appelé hors d'une page Photon (côté serveur, hors de `<PhotonPage>`). |
| <span id="e-photon-unknown-scroll-prop"></span>`E_PHOTON_UNKNOWN_SCROLL_PROP` | — | Un défilement infini nomme une prop pour laquelle l'objet page n'a pas de prop de défilement. |
| <span id="e-photon-invalid-deferred"></span>`E_PHOTON_INVALID_DEFERRED` | — | Il manque à `<Deferred>` sa prop `data` ou son fallback. |
| <span id="e-photon-form-data-missing"></span>`E_PHOTON_FORM_DATA_MISSING` | — | `useForm(rememberKey)` a été appelé sans les données du formulaire. |
| <span id="e-photon-form-defaults-unsupported"></span>`E_PHOTON_FORM_DEFAULTS_UNSUPPORTED` | — | `setDefaults()` a été appelé sur un formulaire dont les données sont une fonction. |
| <span id="e-photon-invalid-svelte-root"></span>`E_PHOTON_INVALID_SVELTE_ROOT` | — | Le `svelteRoot` passé à l'adaptateur Svelte n'exporte pas `setPage()` ; passez la racine de `@c9up/photon/svelte`. |
| <span id="e-photon-invalid-ssr-setup"></span>`E_PHOTON_INVALID_SSR_SETUP` | — | Le `createPhotonApp` de Svelte a rendu côté serveur sans `setup`, ou son `setup` n'a pas renvoyé `render(App, { props })` de `svelte/server`. |
| <span id="e-photon-deferred-props-missing"></span>`E_PHOTON_DEFERRED_PROPS_MISSING` | — | La réponse à un groupe différé ne contient pas les props demandées ; signalée par l'événement `exception` du routeur (`photon:exception`), pas levée, et pas redemandée pendant cette visite. |

## Erreurs Prism

Le moteur d'images rapporte un code stable à chaque échec ; `/__image` répond ses refus en JSON avec le statut indiqué.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-prism-image-no-source"></span>`E_PRISM_IMAGE_NO_SOURCE` | 400 | `/__image` a été appelé sans `src`. |
| <span id="e-prism-image-width-not-allowed"></span>`E_PRISM_IMAGE_WIDTH_NOT_ALLOWED` | 400 | `w` n'est pas une des largeurs configurées. |
| <span id="e-prism-image-format-not-allowed"></span>`E_PRISM_IMAGE_FORMAT_NOT_ALLOWED` | 400 | `f` n'est pas un des formats configurés. |
| <span id="e-prism-image-quality-not-allowed"></span>`E_PRISM_IMAGE_QUALITY_NOT_ALLOWED` | 400 | `q` n'est pas une des qualités configurées. |
| <span id="e-prism-image-not-found"></span>`E_PRISM_IMAGE_NOT_FOUND` | 404 | Aucune image à `src`. |
| <span id="e-prism-image-unprocessable"></span>`E_PRISM_IMAGE_UNPROCESSABLE` | 422 | La source n'est pas une image que le point de terminaison peut servir. |
| <span id="e-prism-image-busy"></span>`E_PRISM_IMAGE_BUSY` | 503 | Trop d'images sont en cours de rendu ; réessayez sous peu. |
| <span id="e-prism-empty-input"></span>`E_PRISM_EMPTY_INPUT` | 422 | L'entrée est vide. |
| <span id="e-prism-input-too-large"></span>`E_PRISM_INPUT_TOO_LARGE` | 422 | L'entrée dépasse la limite d'octets. |
| <span id="e-prism-too-many-pixels"></span>`E_PRISM_TOO_MANY_PIXELS` | 422 | L'image (son en-tête, ou une trame d'un GIF), ou celle qu'une opération construirait, dépasse le plafond de pixels ; refusée avant l'allocation. |
| <span id="e-prism-zero-dimension"></span>`E_PRISM_ZERO_DIMENSION` | 422 | L'image a une largeur ou une hauteur nulle. |
| <span id="e-prism-unknown-format"></span>`E_PRISM_UNKNOWN_FORMAT` | 422 | Les octets ne sont pas un format d'image que prism reconnaît. |
| <span id="e-prism-unsupported-format"></span>`E_PRISM_UNSUPPORTED_FORMAT` | 422 | Le format est reconnu mais pas pris en charge. |
| <span id="e-prism-format-not-allowed"></span>`E_PRISM_FORMAT_NOT_ALLOWED` | 422 | Une vraie image, dans un format que l'application a choisi de ne pas décoder. |
| <span id="e-prism-unreadable"></span>`E_PRISM_UNREADABLE` | 422 | L'image ne peut pas être lue : corrompue, un flux WebP qui n'a pas la taille de sa trame, un item AVIF placé dans plus d'octets que le fichier n'en contient. |
| <span id="e-prism-decode-failed"></span>`E_PRISM_DECODE_FAILED` | 422 | Le décodage de l'image a échoué. |
| <span id="e-prism-encode-failed"></span>`E_PRISM_ENCODE_FAILED` | 500 | L'encodage de la sortie a échoué. |
| <span id="e-prism-invalid-geometry"></span>`E_PRISM_INVALID_GEOMETRY` | 500 | Une géométrie que l'image ne peut pas satisfaire : un recadrage hors de ses bords, une taille cible nulle. |
| <span id="e-prism-invalid-font"></span>`E_PRISM_INVALID_FONT` | 500 | Une police ne peut pas être utilisée. |
| <span id="e-prism-colour-space"></span>`E_PRISM_COLOUR_SPACE` | 500 | Un espace colorimétrique innommable, ou une conversion que le modèle refuse. |
| <span id="e-prism-invalid-operation"></span>`E_PRISM_INVALID_OPERATION` | 500 | Une opération n'a pas un champ requis, ou en a un hors bornes. |
| <span id="e-prism-qr-too-long"></span>`E_PRISM_QR_TOO_LONG` | 500 | Plus de texte qu'un QR code ne peut en contenir au niveau et à la version choisis. |
| <span id="e-prism-invalid-qr-option"></span>`E_PRISM_INVALID_QR_OPTION` | 500 | Une option de QR code hors bornes, ou une couleur qui n'est pas en hexadécimal strict. |
| <span id="e-prism-internal-panic"></span>`E_PRISM_INTERNAL_PANIC` | 500 | Le moteur a paniqué ; toujours un bug de prism. |
| <span id="e-prism-engine"></span>`E_PRISM_ENGINE` | 500 | Le moteur a échoué sans code connu. |
| <span id="e-prism-native-required"></span>`E_PRISM_NATIVE_REQUIRED` | 500 | Le moteur d'images Rust n'est pas chargé. |
| <span id="e-prism-not-booted"></span>`E_PRISM_NOT_BOOTED` | — | Le moteur de `services/main` a servi avant le boot de `PrismProvider` ou l'appel de `setPrism()`. |
| <span id="e-prism-invalid-config"></span>`E_PRISM_INVALID_CONFIG` | 500 | `config/images.ts` n'exporte pas une configuration `defineConfig({ ... })`. |
| <span id="e-prism-invalid-serve-config"></span>`E_PRISM_INVALID_SERVE_CONFIG` | 500 | `images.serve` ne déclare aucune racine, l'un de ses compteurs (`concurrency`, `queueLimit`, `effort`, `memoryCacheBytes`, `maxCacheBytes`…) sort de sa plage, ou `cacheControl` n'est ni `'public'`, ni `'private'`, ni `false`. |
| <span id="e-prism-invalid-binding"></span>`E_PRISM_INVALID_BINDING` | 500 | Le conteneur a résolu autre chose qu'un `Prism` pour le token `Prism`, ou autre chose qu'un routeur pour `router`. |
| <span id="e-prism-memory-limit"></span>`E_PRISM_MEMORY_LIMIT` | 422 | Une étape du pipeline (l'image décodée, l'intermédiaire flottant d'un redimensionnement, la copie d'un encodeur) garderait plus de `limits.maxMemory` octets ; refusée avant l'allocation. |

## Erreurs Quasar

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-bytes-value"></span>`E_INVALID_BYTES_VALUE` | 500 | Un seuil mémoire du contrôle de santé Redis ne peut pas être lu comme une taille. |
| <span id="e-quasar-missing-config"></span>`E_QUASAR_MISSING_CONFIG` | 500 | `QuasarProvider` s'enregistre et `config/redis.ts` n'existe pas. |
| <span id="e-quasar-invalid-config"></span>`E_QUASAR_INVALID_CONFIG` | 500 | `defineConfig` ne déclare aucune connexion, ou nomme une connexion par défaut qu'il ne déclare pas. |
| <span id="e-quasar-invalid-port"></span>`E_QUASAR_INVALID_PORT` | 500 | Le `port` d'une connexion n'est pas un entier entre 0 et 65535. |
| <span id="e-quasar-unknown-connection"></span>`E_QUASAR_UNKNOWN_CONNECTION` | 500 | `connection(name)` nomme une connexion que la configuration ne déclare pas. |
| <span id="e-quasar-unknown-command"></span>`E_QUASAR_UNKNOWN_COMMAND` | 500 | `runCommand()` nomme une commande jamais définie avec `defineCommand()`, ou la connexion n'a pas une commande relayée. |
| <span id="e-quasar-not-a-cluster"></span>`E_QUASAR_NOT_A_CLUSTER` | 500 | `nodes()` est appelée sur une connexion autonome. |
| <span id="e-quasar-invalid-duration"></span>`E_QUASAR_INVALID_DURATION` | 500 | `cacheFor()` d'un contrôle de santé reçoit une durée illisible. |
| <span id="e-quasar-not-booted"></span>`E_QUASAR_NOT_BOOTED` | 500 | Un membre de `services/main` a été lu avant que `QuasarProvider` ait installé un gestionnaire, ou avant `setQuasar()`. |

## Erreurs Ream MCP

Renvoyées dans le résultat de l'outil de templates du serveur MCP.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-render-timeout"></span>`E_INKER_RENDER_TIMEOUT` | — | Un rendu de template a pris plus de temps que l'outil ne le permet. |
| <span id="e-inker-unknown"></span>`E_INKER_UNKNOWN` | — | Un rendu de template a échoué sans code inker. |
| <span id="e-ream-mcp-invalid-argument"></span>`E_REAM_MCP_INVALID_ARGUMENT` | 500 | Un outil ou une fonction a été appelé sans un argument requis (`docs.get`, `docs.explain`, une chaîne vide) ou avec un seuil de détection de doublons hors limites. |
| <span id="e-ream-mcp-project-root-not-found"></span>`E_REAM_MCP_PROJECT_ROOT_NOT_FOUND` | — | Aucune racine de projet Ream n'a été trouvée en remontant depuis le répertoire courant, ou celle trouvée au-dessus appartient à un autre utilisateur ou est accessible en écriture au groupe ou aux autres ; définissez `REAM_PROJECT_ROOT`. |
| <span id="e-ream-mcp-native-unavailable"></span>`E_REAM_MCP_NATIVE_UNAVAILABLE` | 500 | Le cœur natif n'a pas donné de version au démarrage : le binaire est absent ou incompatible. |
| <span id="e-ream-mcp-native-mismatch"></span>`E_REAM_MCP_NATIVE_MISMATCH` | 500 | Le cœur natif a répondu quelque chose que le serveur n'attend pas (trace, statistiques d'index, manifeste du modèle) : le binaire est périmé ou d'une autre version. |
| <span id="e-ream-mcp-path-escape"></span>`E_REAM_MCP_PATH_ESCAPE` | 500 | Un nom de fichier de migration ou un chemin de fichier du modèle sort de son répertoire. |
| <span id="e-ream-mcp-invalid-migration"></span>`E_REAM_MCP_INVALID_MIGRATION` | 500 | L'export par défaut d'une migration n'est pas une classe de migration, ou son `getDownSQL()` ne renvoie pas une liste de chaînes. |
| <span id="e-ream-mcp-model-download-failed"></span>`E_REAM_MCP_MODEL_DOWNLOAD_FAILED` | 500 | Le téléchargement d'un fichier du modèle d'embeddings a répondu une erreur HTTP ou aucun corps. |
| <span id="e-ream-mcp-model-integrity"></span>`E_REAM_MCP_MODEL_INTEGRITY` | 500 | Un fichier du modèle téléchargé ne correspond pas à sa taille ou à son SHA-256 épinglés ; rien n'est conservé. |
| <span id="e-ream-mcp-shell-disallowed"></span>`E_REAM_MCP_SHELL_DISALLOWED` | 500 | `REAM_MCP_NO_SHELL=1` interdit de lancer le binaire `ream`. |
| <span id="e-ream-mcp-cli-not-found"></span>`E_REAM_MCP_CLI_NOT_FOUND` | — | Le binaire `ream` n'est ni à `$REAM_BIN` ni dans le `node_modules/.bin` du projet. |
| <span id="e-ream-mcp-cli-output-invalid"></span>`E_REAM_MCP_CLI_OUTPUT_INVALID` | 500 | La dernière ligne de la sortie de la CLI `ream` n'est pas un objet JSON. |
| <span id="e-ream-mcp-already-connected"></span>`E_REAM_MCP_ALREADY_CONNECTED` | 500 | `McpServer.connect()` a été appelé sur un serveur déjà connecté. |
| <span id="e-ream-mcp-internal"></span>`E_REAM_MCP_INTERNAL` | 500 | Un invariant interne a été rompu (un type d'outil inconnu a atteint un aiguilleur) ; signalez-le comme un bug. |
| <span id="e-ream-mcp-index-failed"></span>`E_REAM_MCP_INDEX_FAILED` | 500 | L'index natif du corpus n'a pas pu être construit, ouvert ou lu (outils `docs.*`, réindexation au démarrage, `ream-mcp-reindex`) ; `cause` est l'erreur native. |
| <span id="e-ream-mcp-invalid-json"></span>`E_REAM_MCP_INVALID_JSON` | 500 | Le cœur natif n'a pas pu lire le JSON qu'il a reçu (options de recherche) ou écrire sa réponse en JSON ; `cause` est l'erreur native. |
| <span id="e-ream-mcp-unsupported-platform"></span>`E_REAM_MCP_UNSUPPORTED_PLATFORM` | 500 | Import de `@c9up/ream-mcp/napi` sur une plateforme sans binaire natif (prises en charge : linux-x64, linux-arm64 sous glibc, darwin-x64, darwin-arm64, win32-x64). |
| <span id="e-ream-mcp-native-load-failed"></span>`E_REAM_MCP_NATIVE_LOAD_FAILED` | 500 | Le binaire natif de `@c9up/ream-mcp/napi` est absent ou ne se charge pas ; le message nomme le paquet de plateforme à installer, `cause` est l'erreur de Node. |

## Erreurs Relay

Renvoyées dans le corps JSON des routes relay, ou en événement `error` sur un hub.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-relay-bad-request"></span>`E_RELAY_BAD_REQUEST` | 400 | `subscribe` sans `uid` ni `channel` exploitables (deux chaînes non vides). |
| <span id="e-relay-channel-too-long"></span>`E_RELAY_CHANNEL_TOO_LONG` | 400 | Le nom du canal dépasse 256 caractères. |
| <span id="e-relay-not-connected"></span>`E_RELAY_NOT_CONNECTED` | 400 | Aucune connexion n'a cet uid sur cette instance et aucun bus n'est configuré pour relayer la requête vers l'instance qui la tient — ou la connexion s'est fermée. Aussi un POST de hub pour une connexion qui n'a pas de flux ouvert. |
| <span id="e-relay-bus-unavailable"></span>`E_RELAY_BUS_UNAVAILABLE` | 503 | La souscription devait être relayée à l'instance qui tient le flux, et le bus a refusé le message. |
| <span id="e-relay-not-owner"></span>`E_RELAY_NOT_OWNER` | 403 | La connexion a été ouverte par un autre utilisateur ; subscribe, unsubscribe et trames de hub doivent venir du même. |
| <span id="e-relay-channel-no-authorizer"></span>`E_RELAY_CHANNEL_NO_AUTHORIZER` | 403 | Aucun `relay.authorize()` ne couvre le canal, et `allowUnauthorizedChannels` est désactivé. |
| <span id="e-relay-channel-forbidden"></span>`E_RELAY_CHANNEL_FORBIDDEN` | 403 | L'autorisateur du canal a refusé, ou levé une erreur. |
| <span id="e-relay-max-channels"></span>`E_RELAY_MAX_CHANNELS` | 429 | La connexion tient déjà `maxChannelsPerClient` canaux. |
| <span id="e-relay-max-clients"></span>`E_RELAY_MAX_CLIENTS` | — | L'instance tient déjà `maxClients` connexions ; envoyé en trame `error` avant la fermeture du flux. |
| <span id="e-relay-max-clients-per-owner"></span>`E_RELAY_MAX_CLIENTS_PER_OWNER` | — | Cet utilisateur tient déjà le nombre maximal de connexions ; envoyé en trame `error` avant la fermeture du flux. |
| <span id="e-relay-unknown-connection"></span>`E_RELAY_UNKNOWN_CONNECTION` | 400 | Une requête de hub sans token de connexion valide — appelez d'abord `<path>/negotiate`. |
| <span id="e-relay-max-connections"></span>`E_RELAY_MAX_CONNECTIONS` | 503 | Un hub a déjà `maxConnections` flux ouverts. |
| <span id="e-relay-max-connections-per-owner"></span>`E_RELAY_MAX_CONNECTIONS_PER_OWNER` | 503 | Ce client a déjà le nombre maximal de flux de hub ouverts. |
| <span id="e-relay-max-pending"></span>`E_RELAY_MAX_PENDING` | 503 | Trop de connexions de hub sont négociées et pas encore ouvertes. |
| <span id="e-relay-shut-down"></span>`E_RELAY_SHUT_DOWN` | 503 | Le service temps réel est en cours d'arrêt. |
| <span id="e-relay-unauthorized"></span>`E_RELAY_UNAUTHORIZED` | 401 | Un hub gardé exige un utilisateur authentifié, ou authentifié par un autre garde. Répondu à la négociation, au flux et à la poignée de main WebSocket ; envoyé comme événement `error`, avant la fermeture de la connexion, quand une invocation est refusée. |
| <span id="e-relay-forbidden"></span>`E_RELAY_FORBIDDEN` | 403 | L'utilisateur n'a pas le rôle ou les permissions qu'exigent les gardes d'un hub. Répondu à la négociation, au flux et à la poignée de main WebSocket ; envoyé comme événement `error`, avant la fermeture de la connexion, quand une invocation est refusée. |
| <span id="e-relay-unknown-event"></span>`E_RELAY_UNKNOWN_EVENT` | — | Une invocation de hub ne nomme aucun handler. |
| <span id="e-relay-handler-error"></span>`E_RELAY_HANDLER_ERROR` | — | Un handler de hub a levé une erreur. |
| <span id="e-relay-invalid-channel-pattern"></span>`E_RELAY_INVALID_CHANNEL_PATTERN` | 500 | `authorize()` a reçu un motif de canal qui ne pourrait jamais correspondre. |
| <span id="e-relay-invalid-ping-interval"></span>`E_RELAY_INVALID_PING_INTERVAL` | 500 | `pingInterval` n'est ni des millisecondes ni une durée comme `'30s'`. |
| <span id="e-relay-hub-path-taken"></span>`E_RELAY_HUB_PATH_TAKEN` | 500 | `relay.hub()` nomme un chemin où un hub est déjà monté. |
| <span id="e-relay-hub-already-mounted"></span>`E_RELAY_HUB_ALREADY_MOUNTED` | 500 | Une même instance de hub est montée une seconde fois ; donnez à chaque montage sa propre instance. |
| <span id="e-relay-duplicate-handler"></span>`E_RELAY_DUPLICATE_HANDLER` | 500 | Deux handlers d'un hub ne diffèrent que par la casse, et répondent donc à la même invocation. |
| <span id="e-relay-invalid-hub"></span>`E_RELAY_INVALID_HUB` | 500 | L'objet monté par `relay.hub()` n'étend pas `Hub`. |
| <span id="e-relay-invalid-adapter"></span>`E_RELAY_INVALID_ADAPTER` | 500 | L'adaptateur passé à `relay.hub()` n'est pas un `SignalRAdapter`. |
| <span id="e-relay-transport-not-started"></span>`E_RELAY_TRANSPORT_NOT_STARTED` | 500 | `whenTransportReady()` a été appelée avant `startTransport()`. |
| <span id="e-relay-transport-superseded"></span>`E_RELAY_TRANSPORT_SUPERSEDED` | 500 | Un `startTransport()` a été devancé par un arrêt ou un démarrage plus récent avant de s'abonner. |
| <span id="e-relay-transport-unreleased"></span>`E_RELAY_TRANSPORT_UNRELEASED` | 500 | `startTransport()` n'a pas pu libérer l'abonnement précédent au bus, et refuse donc de s'abonner à nouveau ; `cause` porte l'erreur du bus. |
| <span id="e-relay-quasar-missing"></span>`E_RELAY_QUASAR_MISSING` | 500 | Un bus Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son provider n'a pas démarré. |
| <span id="e-relay-redis-incomplete"></span>`E_RELAY_REDIS_INCOMPLETE` | 500 | La connexion quasar n'offre pas une commande qu'émet le bus. |
| <span id="e-relay-assertion-failed"></span>`E_RELAY_ASSERTION_FAILED` | 500 | `FakeRelay.assertSent()` ou `assertNotSent()` n'est pas vérifiée. |
| <span id="e-relay-internal"></span>`E_RELAY_INTERNAL` | 500 | Un invariant de relay a cédé. Un bug : signalez-le. |
| <span id="e-relay-subscribe-failed"></span>`E_RELAY_SUBSCRIBE_FAILED` | 500 | Le `subscribe` du client du bus a échoué avec autre chose qu'une `Error` ; `cause` porte ce qu'il a levé. |
| <span id="e-relay-max-queued"></span>`E_RELAY_MAX_QUEUED` | 429 | Une connexion de hub a déjà `maxQueuedMessages` messages en attente du hub ; le POST est refusé et rien de son contenu ne s'exécute. Un WebSocket dans le même état est fermé avec le code `1013`. |

## Erreurs Robledo

Levées par `@c9up/robledo`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-robledo-invalid-prefix"></span>`E_ROBLEDO_INVALID_PREFIX` | 500 | Le préfixe des routes ne commence pas par `/`, ou se termine par un `/`. |
| <span id="e-robledo-not-booted"></span>`E_ROBLEDO_NOT_BOOTED` | 500 | `services/main` utilisé avant le démarrage du provider. |
| <span id="e-robledo-no-native-module"></span>`E_ROBLEDO_NO_NATIVE_MODULE` | 500 | L'app n'a pas le module natif de robledo : elle n'a pas été construite avec robledo installé. |
| <span id="e-robledo-bad-response"></span>`E_ROBLEDO_BAD_RESPONSE` | 500 | Le serveur a répondu à une vérification de mise à jour, ou à un téléchargement de fichier, par autre chose qu'une mise à jour : un statut d'erreur, pas de manifeste, une réponse `latest` de plus de 1 Mio, ou un fichier plus grand que sa taille signée. |
| <span id="e-robledo-refused"></span>`E_ROBLEDO_REFUSED` | 500 | Le téléphone a refusé une mise à jour : signature invalide (vérifiée avant tout téléchargement), fichier altéré, mauvais runtime, mise à jour d'une autre app… |
| <span id="e-robledo-not-newer"></span>`E_ROBLEDO_NOT_NEWER` | 500 | Le téléphone a refusé une mise à jour qui n'est pas plus récente (selon son `createdAt` signé) que la plus récente qu'il a acceptée, ni que le bundle inclus dans l'app : une ancienne mise à jour, validement signée, servie à nouveau. Un retour en arrière volontaire se publie comme une nouvelle mise à jour. |

## Erreurs Rosetta

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-rosetta-not-booted"></span>`E_ROSETTA_NOT_BOOTED` | — | Le singleton de `services/main` a servi avant le boot de `RosettaProvider`, ou avant `setI18n()`. |
| <span id="e-rosetta-config-missing"></span>`E_ROSETTA_CONFIG_MISSING` | 500 | `config/i18n` n'exporte aucune configuration construite avec `defineConfig()`. |
| <span id="e-rosetta-invalid-config"></span>`E_ROSETTA_INVALID_CONFIG` | 500 | La configuration i18n n'a pas de `formatter`. |
| <span id="e-rosetta-invalid-argument"></span>`E_ROSETTA_INVALID_ARGUMENT` | 500 | Un constructeur ou une méthode a reçu un argument de mauvaise forme (un émetteur, un gestionnaire, une locale, un `FileSystemLoader` sans `location` ni `rootDir`, une clé de format vide). |
| <span id="e-rosetta-unsafe-key"></span>`E_ROSETTA_UNSAFE_KEY` | 500 | Une clé de catalogue ou une clé de format ICU personnalisée atteindrait le prototype (`__proto__`, `constructor`, `prototype`). |
| <span id="e-rosetta-duplicate-key"></span>`E_ROSETTA_DUPLICATE_KEY` | 500 | Un catalogue définit deux fois la même clé : une clé YAML, ou une clé imbriquée et une clé pointée qui donnent la même clé à plat. |
| <span id="e-rosetta-invalid-catalog"></span>`E_ROSETTA_INVALID_CATALOG` | 500 | Un fichier de catalogue ne s'analyse pas (YAML non pris en charge) ou contient une valeur qui n'est ni un dictionnaire ni un message scalaire. |
| <span id="e-rosetta-catalog-limit-exceeded"></span>`E_ROSETTA_CATALOG_LIMIT_EXCEEDED` | 500 | Un catalogue est trop profond, a trop de clés, ou un fichier de catalogue est trop gros. |
| <span id="e-rosetta-unsafe-path"></span>`E_ROSETTA_UNSAFE_PATH` | 500 | Un répertoire ou un fichier de traductions est un lien symbolique, ou se résout hors de la racine du chargeur. |
| <span id="e-rosetta-invalid-path"></span>`E_ROSETTA_INVALID_PATH` | 500 | Un chemin de traductions n'est pas un répertoire, ou pas un fichier, là où il en faut un. |
| <span id="e-rosetta-unsupported-runtime"></span>`E_ROSETTA_UNSUPPORTED_RUNTIME` | 500 | `FileSystemLoader` a servi depuis le build navigateur, qui n'a pas de système de fichiers. |
| <span id="e-rosetta-invalid-icu-message"></span>`E_ROSETTA_INVALID_ICU_MESSAGE` | 500 | Un message ICU ne s'analyse pas, ou utilise un style, un squelette ou une option que Rosetta ou `Intl` ne prend pas en charge. |
| <span id="e-rosetta-icu-limit-exceeded"></span>`E_ROSETTA_ICU_LIMIT_EXCEEDED` | 500 | Un message ICU est trop long, trop imbriqué, ou a trop de nœuds. |
| <span id="e-rosetta-missing-variable"></span>`E_ROSETTA_MISSING_VARIABLE` | 500 | Un message ICU utilise une variable que l'appel n'a pas fournie. |
| <span id="e-rosetta-invalid-date"></span>`E_ROSETTA_INVALID_DATE` | 500 | Une valeur de date ou d'heure ICU n'est ni une `Date`, ni un horodatage, ni une chaîne ISO, ni un `DateTime` à la Luxon, ou désigne une date impossible. |
| <span id="e-rosetta-catalog-mismatch"></span>`E_ROSETTA_CATALOG_MISMATCH` | 500 | `verifyCatalogs({ mode: 'throw' })` a trouvé des catalogues qui divergent ; le message est le rapport. |
| <span id="e-rosetta-internal"></span>`E_ROSETTA_INTERNAL` | 500 | Un invariant interne a été rompu (un nœud ICU inconnu, un état de l'analyseur) ; signalez-le comme un bug. |

## Erreurs Rover

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-mail-invalid-message"></span>`E_MAIL_INVALID_MESSAGE` | 500 | Un message n'a pas ce que l'envoi exige (une adresse `from`, un destinataire…). |
| <span id="e-mail-invalid-address"></span>`E_MAIL_INVALID_ADDRESS` | 500 | Une adresse n'est pas une adresse mail valide. |
| <span id="e-mail-header-injection"></span>`E_MAIL_HEADER_INJECTION` | 500 | Une valeur de header contient un saut de ligne ou un NUL. |
| <span id="e-invalid-list-header"></span>`E_INVALID_LIST_HEADER` | 500 | Une entrée de header `List-*` n'est pas une URL (https, http, mailto ou ftp) ou une adresse simple. |
| <span id="e-mail-field-unsupported"></span>`E_MAIL_FIELD_UNSUPPORTED` | 500 | Le transport ne sait pas fixer un champ que le message utilise (comme l'enveloppe SMTP). |
| <span id="e-attachment-unreadable"></span>`E_ATTACHMENT_UNREADABLE` | 500 | Le fichier d'une pièce jointe ne peut pas être lu. |
| <span id="e-mail-retry-config"></span>`E_MAIL_RETRY_CONFIG` | 500 | Un réglage de nouvelle tentative est hors bornes. |
| <span id="e-mail-config-missing"></span>`E_MAIL_CONFIG_MISSING` | 500 | Aucune configuration `mail` n'est enregistrée. Créez `config/mail.ts`, ou lancez `ream configure @c9up/rover`. |
| <span id="e-mail-unknown-mailer"></span>`E_MAIL_UNKNOWN_MAILER` | 500 | Un nom de mailer, ou le mailer par défaut, n'est pas configuré. |
| <span id="e-mail-unknown-transport"></span>`E_MAIL_UNKNOWN_TRANSPORT` | 500 | Un type de transport est inconnu. |
| <span id="e-mail-job-malformed"></span>`E_MAIL_JOB_MALFORMED` | 500 | Le contenu d'une tâche mail en file manque ou n'est pas un objet. |
| <span id="e-mail-template-engine"></span>`E_MAIL_TEMPLATE_ENGINE` | 500 | L'application utilise inker mais rover ne peut pas rendre les vues mail avec. |
| <span id="e-mail-template-not-found"></span>`E_MAIL_TEMPLATE_NOT_FOUND` | 500 | Un template mail est introuvable. |
| <span id="e-mail-template-read-error"></span>`E_MAIL_TEMPLATE_READ_ERROR` | 500 | Un template mail ne peut pas être lu. |
| <span id="e-mail-template-syntax"></span>`E_MAIL_TEMPLATE_SYNTAX` | 500 | Un template mail a une erreur de syntaxe. |
| <span id="e-mail-template-recursion"></span>`E_MAIL_TEMPLATE_RECURSION` | 500 | Des templates mail s'incluent trop profondément. |
| <span id="e-mail-template-napi-required"></span>`E_MAIL_TEMPLATE_NAPI_REQUIRED` | 500 | Le moteur natif de rover est absent ou ne se charge pas ; le message nomme le paquet de plateforme à installer. |
| <span id="e-rover-unknown"></span>`E_ROVER_UNKNOWN` | — | Un envoi a échoué avec une erreur sans code propre. |
| <span id="e-rover-not-booted"></span>`E_ROVER_NOT_BOOTED` | 500 | Le singleton mail de `services/main` a servi avant le boot de `RoverProvider`. |
| <span id="e-rover-fake-active"></span>`E_ROVER_FAKE_ACTIVE` | 500 | `mail.fake()` a été appelé alors qu'un faux est déjà actif ; appelez d'abord `restore()`. |
| <span id="e-rover-invalid-predicate"></span>`E_ROVER_INVALID_PREDICATE` | 500 | Une assertion du faux mailer a reçu un `containing` vide, qui correspondrait à tous les messages. |
| <span id="e-rover-abstract-mail"></span>`E_ROVER_ABSTRACT_MAIL` | 500 | `BaseMail` a été instancié directement au lieu d'une sous-classe. |
| <span id="e-rover-webhook-key-missing"></span>`E_ROVER_WEBHOOK_KEY_MISSING` | 500 | Un handler de webhook a été créé sans son secret, sa clé publique ou sa clé de signature. |
| <span id="e-rover-webhook-invalid-secret"></span>`E_ROVER_WEBHOOK_INVALID_SECRET` | 500 | Le secret du webhook Resend n'est pas du base64 valide, ou fait moins de 16 octets une fois décodé. |
| <span id="e-rover-internal"></span>`E_ROVER_INTERNAL` | 500 | Un invariant interne a été rompu (nodemailer n'a composé aucun message) ; signalez-le comme un bug. |
| <span id="e-mail-transport-error"></span>`E_MAIL_TRANSPORT_ERROR` | 500 | Le transport de mail n'a pas pu envoyer. Son `context` porte le statut du fournisseur ou le code réseau ; elle se construit avec `new E_MAIL_TRANSPORT_ERROR(message, { context, cause, help })`. |
| <span id="e-invalid-config"></span>`E_INVALID_CONFIG` | 500 | Il manque une propriété à la configuration d'un transport de mail, ou l'une d'elles est invalide (`Invalid config for "resend" transport. The "apiKey" property is missing`). Un message sans destinataire lève plutôt `E_MAIL_INVALID_MESSAGE`. |
| <span id="e-rover-ical-unavailable"></span>`E_ROVER_ICAL_UNAVAILABLE` | 500 | `icalEvent(callback)` a besoin d'`ical-generator`, qui n'est pas installé ou ne construit pas de calendrier. |
| <span id="e-rover-webhook-invalid-key"></span>`E_ROVER_WEBHOOK_INVALID_KEY` | 500 | La `publicKey` du webhook SendGrid n'est pas une clé publique, ou pas la clé ECDSA P-256 avec laquelle SendGrid signe son webhook d'événements. |

## Erreurs Rune

Rune normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_RUNE_`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-validation-error-rune"></span>`E_VALIDATION_ERROR` | 422 | `validateOrThrow()` a trouvé des données invalides. Porte un tableau `messages` avec une entrée par champ et par règle. |
| <span id="e-rune-meta-required"></span>`E_RUNE_META_REQUIRED` | 500 | Un validateur construit avec `withMetaData()` a été appelé sans `{ meta }`. |
| <span id="e-rune-not-a-regular-file"></span>`E_RUNE_NOT_A_REGULAR_FILE` | 500 | Une valeur `file()` n'est pas un fichier ordinaire : ce n'est pas un envoi. |
| <span id="e-rune-invalid-size"></span>`E_RUNE_INVALID_SIZE` | 500 | `file()` a reçu une taille illisible. |
| <span id="e-rune-invalid-error-reporter"></span>`E_RUNE_INVALID_ERROR_REPORTER` | 500 | `errorReporter` ne prend pas d'argument et n'a pas rendu de reporter (`{ report, createError }`). |
| <span id="e-rune-invalid-rule"></span>`E_RUNE_INVALID_RULE` | 500 | `use()` a reçu autre chose qu'une règle compilée ; appelez d'abord la factory. |
| <span id="e-rune-no-rule"></span>`E_RUNE_NO_RULE` | 500 | `message()` a été appelé avant toute règle. |
| <span id="e-rune-not-an-object"></span>`E_RUNE_NOT_AN_OBJECT` | 500 | `merge()` (ou une méthode de forme semblable) exige une forme `object()`. |
| <span id="e-rune-partial-not-applicable"></span>`E_RUNE_PARTIAL_NOT_APPLICABLE` | 500 | `partial()` ne peut pas assouplir une forme qui a des groupes ou `allowUnknownProperties()`. |
| <span id="e-rune-no-type-rule"></span>`E_RUNE_NO_TYPE_RULE` | 500 | Une branche de `unionOfTypes()` ne déclare aucun type. |
| <span id="e-rune-duplicate-union-type"></span>`E_RUNE_DUPLICATE_UNION_TYPE` | 500 | Deux branches de `unionOfTypes()` déclarent le même type. |
| <span id="e-rune-async-rule-not-awaited"></span>`E_RUNE_ASYNC_RULE_NOT_AWAITED` | 500 | Une exécution synchrone a rencontré une règle asynchrone. Utilisez la variante asynchrone. |
| <span id="e-rune-no-database-resolver"></span>`E_RUNE_NO_DATABASE_RESOLVER` | 500 | Une règle de base (`unique`, `exists`) n'a pas de résolveur. Appelez `bindDatabase()` au démarrage, ou passez un callback. |
| <span id="e-rune-no-host-resolver"></span>`E_RUNE_NO_HOST_RESOLVER` | 500 | `activeUrl()` exige un résolveur d'hôte. |
| <span id="e-rune-unsupported-locale"></span>`E_RUNE_UNSUPPORTED_LOCALE` | 500 | `mobile()` n'a pas de plan de numérotation pour la locale. |
| <span id="e-rune-unsupported-country"></span>`E_RUNE_UNSUPPORTED_COUNTRY` | 500 | Une règle propre à un pays (`postalCode()`…) n'a pas de motif pour ce pays. |
| <span id="e-rune-unsupported-json-schema-target"></span>`E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET` | 500 | Une cible JSON Schema que rune n'émet pas. |
| <span id="e-rune-no-output-schema"></span>`E_RUNE_NO_OUTPUT_SCHEMA` | 500 | La sortie d'un validateur ne peut pas être décrite en JSON Schema : une transformation peut produire n'importe quoi. |
| <span id="e-rune-napi-required"></span>`E_RUNE_NAPI_REQUIRED` | 500 | Le moteur de validation Rust est absent ou ne se charge pas ; le message nomme le paquet de plateforme à installer. |
| <span id="e-rune-napi-not-found"></span>`E_RUNE_NAPI_NOT_FOUND` | 500 | Le binaire du moteur de validation Rust est introuvable ; le message nomme le paquet de plateforme à installer. |
| <span id="e-rune-napi-request-refused"></span>`E_RUNE_NAPI_REQUEST_REFUSED` | 500 | Le moteur de validation Rust a refusé la demande. |
| <span id="e-rune-napi-invalid-response"></span>`E_RUNE_NAPI_INVALID_RESPONSE` | 500 | Le moteur de validation Rust a rendu une forme inattendue. |
| <span id="e-rune-conflicting-url-options"></span>`E_RUNE_CONFLICTING_URL_OPTIONS` | 500 | `normalizeUrl()` a reçu à la fois `forceHttp` et `forceHttps`. |

## Erreurs Sigil

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-sigil-unknown-driver"></span>`E_SIGIL_UNKNOWN_DRIVER` | 500 | Un hasher nomme un driver que sigil ne connaît pas. |
| <span id="e-sigil-napi-required"></span>`E_SIGIL_NAPI_REQUIRED` | — | Le driver exige le moteur Rust, qui n'est pas chargé. |
| <span id="e-sigil-not-booted"></span>`E_SIGIL_NOT_BOOTED` | — | `hash.<membre>` a été utilisé avant que `SigilProvider.boot()` ne tourne. |
| <span id="e-sigil-unknown-hasher"></span>`E_SIGIL_UNKNOWN_HASHER` | 500 | `hash.use(name)` (ou le `default` de la config) nomme un hasher que la config de hachage ne déclare pas. |
| <span id="e-sigil-invalid-option"></span>`E_SIGIL_INVALID_OPTION` | 500 | Une option du driver de hachage n'est pas un entier, sort de ses limites, n'est pas une valeur permise, ou les options cumulées coûtent plus que ce qu'accepte `verify`. |
| <span id="e-sigil-password-too-long"></span>`E_SIGIL_PASSWORD_TOO_LONG` | 500 | `make` a reçu un mot de passe plus long que ce qu'accepte le driver (le plafond commun en octets, ou 72 octets pour bcrypt). |

## Erreurs Spectrum

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-spectrum-unknown-level"></span>`E_SPECTRUM_UNKNOWN_LEVEL` | 500 | Le niveau d'une cible de transport n'est pas un niveau de log. |
| <span id="e-spectrum-unsupported-target"></span>`E_SPECTRUM_UNSUPPORTED_TARGET` | 500 | Une cible de transport que spectrum ne construit pas. Passez un `LogChannel` pour écrire ailleurs. |
| <span id="e-spectrum-invalid-file-options"></span>`E_SPECTRUM_INVALID_FILE_OPTIONS` | 500 | Une destination fichier n'est ni un chemin ni un descripteur de fichier. |
| <span id="e-spectrum-invalid-line-options"></span>`E_SPECTRUM_INVALID_LINE_OPTIONS` | 500 | Une option de ligne JSON est invalide. |
| <span id="e-spectrum-invalid-redact-path"></span>`E_SPECTRUM_INVALID_REDACT_PATH` | 500 | Un chemin de masquage ne peut pas être analysé. |
| <span id="e-spectrum-invalid-stringify-limit"></span>`E_SPECTRUM_INVALID_STRINGIFY_LIMIT` | 500 | Une limite de sérialisation n'est pas un entier positif. |
| <span id="e-spectrum-unsupported-option"></span>`E_SPECTRUM_UNSUPPORTED_OPTION` | 500 | Une option de logger que spectrum ne prend pas en charge. |
| <span id="e-spectrum-logger-not-bound"></span>`E_SPECTRUM_LOGGER_NOT_BOUND` | 500 | Le conteneur a résolu autre chose qu'un `Logger` pour le token `Logger`. |
| <span id="e-spectrum-missing-default-logger"></span>`E_SPECTRUM_MISSING_DEFAULT_LOGGER` | 500 | Une configuration multi-loggers (`{ default, loggers }`) ne nomme aucun logger `default`. |
| <span id="e-spectrum-unknown-default-logger"></span>`E_SPECTRUM_UNKNOWN_DEFAULT_LOGGER` | 500 | Le logger `default` n'est pas déclaré dans `loggers`. |
| <span id="e-spectrum-unknown-logger"></span>`E_SPECTRUM_UNKNOWN_LOGGER` | 500 | `logger.use(name)` nomme un logger absent de `loggers`. |
| <span id="e-spectrum-not-booted"></span>`E_SPECTRUM_NOT_BOOTED` | — | Le logger de `services/main` a servi avant le boot de `SpectrumProvider`. |
| <span id="e-spectrum-assertion-failed"></span>`E_SPECTRUM_ASSERTION_FAILED` | 500 | `FakeLogger.assertLogged` / `assertNotLogged` a échoué : les entrées capturées ne correspondent pas. |
| <span id="e-spectrum-invalid-predicate"></span>`E_SPECTRUM_INVALID_PREDICATE` | 500 | Une assertion de `FakeLogger` a reçu un `containing` vide, qui correspondrait à toutes les entrées. |

## Erreurs Station

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-station-login-credentials-required"></span>`E_STATION_LOGIN_CREDENTIALS_REQUIRED` | 400 | Le formulaire de connexion admin a été envoyé sans email ou sans mot de passe. |
| <span id="e-station-login-identifier-too-long"></span>`E_STATION_LOGIN_IDENTIFIER_TOO_LONG` | 400 | L'email de connexion admin dépasse 254 caractères (RFC 5321) ; refusé avant le limiteur. |
| <span id="e-station-invalid-credentials"></span>`E_STATION_INVALID_CREDENTIALS` | 401 | Email ou mot de passe invalide. |
| <span id="e-station-too-many-login-attempts"></span>`E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | 429 | Trop de tentatives de connexion ; réessayez plus tard. |
| <span id="e-station-login-unavailable"></span>`E_STATION_LOGIN_UNAVAILABLE` | 503 | La connexion est temporairement indisponible. |
| <span id="e-station-csrf-required"></span>`E_STATION_CSRF_REQUIRED` | 403 | Une action admin exige un token CSRF actif et vérifié. |
| <span id="e-validation-error-station"></span>`E_VALIDATION_ERROR` | 422 | Un formulaire admin n'a pas passé la validation (clients JSON ; un navigateur est renvoyé en arrière). |
| <span id="e-station-not-booted"></span>`E_STATION_NOT_BOOTED` | — | Le registre de `services/main` a servi avant le boot de `StationProvider`, ou avant `setStation()`. |
| <span id="e-station-invalid-resource"></span>`E_STATION_INVALID_RESOURCE` | 500 | `defineResource()` a reçu une déclaration invalide (entité, nom, actions, listes de colonnes, `formFields`, `audit`, `onAuditError`). |
| <span id="e-station-duplicate-resource"></span>`E_STATION_DUPLICATE_RESOURCE` | 500 | Deux ressources ont été enregistrées sous le même nom. |
| <span id="e-station-unknown-resource"></span>`E_STATION_UNKNOWN_RESOURCE` | 500 | `getOrThrow()` a nommé une ressource qui n'est pas enregistrée. |
| <span id="e-station-unknown-column"></span>`E_STATION_UNKNOWN_COLUMN` | 500 | `list.columns`, `show.columns` ou `editable` d'une ressource nomme une propriété qui n'est pas une colonne de l'entité. |
| <span id="e-station-column-not-editable"></span>`E_STATION_COLUMN_NOT_EDITABLE` | 500 | `editable` nomme une colonne que le framework gère (clé primaire, horodatage, relation, suppression douce) ou que `formFields` masque. |
| <span id="e-station-primary-key-missing"></span>`E_STATION_PRIMARY_KEY_MISSING` | 500 | Une entité d'administration ne déclare aucune colonne `@PrimaryKey()`. |
| <span id="e-station-invalid-config"></span>`E_STATION_INVALID_CONFIG` | 500 | Une option `station` est invalide (`audit`, `permissionPrefix`, `guard`, `loginRateLimit`). |
| <span id="e-station-unknown-guard"></span>`E_STATION_UNKNOWN_GUARD` | 500 | `station.guard` nomme une garde que warden ne connaît pas. |
| <span id="e-station-guard-not-jwt"></span>`E_STATION_GUARD_NOT_JWT` | — | La garde de l'administration n'émet pas de jeton bearer ; Station a besoin d'une garde JWT. |
| <span id="e-station-auth-required"></span>`E_STATION_AUTH_REQUIRED` | 500 | Aucune liaison `auth` utilisable n'est enregistrée alors que `requireAuth: true` est posé, ou hors développement et test. |
| <span id="e-station-database-required"></span>`E_STATION_DATABASE_REQUIRED` | 500 | Aucune connexion `db` n'est enregistrée pour l'administration (enregistrez `@c9up/atlas/provider`). |
| <span id="e-station-rune-required"></span>`E_STATION_RUNE_REQUIRED` | 500 | Une ressource avec des formulaires d'écriture a besoin de `@c9up/rune`, qui n'est pas installé. |
| <span id="e-station-inker-required"></span>`E_STATION_INKER_REQUIRED` | 500 | Aucun moteur de vues `@c9up/inker` n'est enregistré pour rendre l'administration. |
| <span id="e-station-inker-unusable"></span>`E_STATION_INKER_UNUSABLE` | 500 | `@c9up/inker` est enregistré mais ne se résout pas en un moteur de rendu utilisable ; voir `cause`. |
| <span id="e-station-route-middleware-unsupported"></span>`E_STATION_ROUTE_MIDDLEWARE_UNSUPPORTED` | 500 | `station.middleware` est défini mais les routes du routeur n'ont pas de méthode `middleware()`. |
| <span id="e-station-internal"></span>`E_STATION_INTERNAL` | 500 | Un invariant interne a été rompu (le moteur de vues n'était pas initialisé) ; signalez-le comme un bug. |

## Erreurs Transit

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-transit-invalid-xml"></span>`E_TRANSIT_INVALID_XML` | 500 | Un fournisseur a répondu un XML illisible, ou qui utilise une construction que transit refuse. |
| <span id="e-transit-protected-parameter"></span>`E_TRANSIT_PROTECTED_PARAMETER` | 500 | Un callback de `begin()`/`redirect()` a tenté de poser ou retirer un paramètre que la connexion possède (`state`, `nonce`, le challenge PKCE, `client_id`, `redirect_uri`, `response_type`), ou `scope` via `param()` au lieu des méthodes de scope. |
| <span id="e-transit-not-booted"></span>`E_TRANSIT_NOT_BOOTED` | 500 | `@c9up/transit/services/main` a été lu avant le boot du provider, ou avant `setTransit()`. |
| <span id="e-transit-unknown-provider"></span>`E_TRANSIT_UNKNOWN_PROVIDER` | 404 | Aucun fournisseur de ce nom n'est enregistré. Le message ne nomme que le fournisseur demandé. |
| <span id="e-transit-not-a-redirect-provider"></span>`E_TRANSIT_NOT_A_REDIRECT_PROVIDER` | 500 | `use()` / `begin()` a nommé un annuaire (LDAP) ; appelez `authenticate()`. |
| <span id="e-transit-not-a-directory"></span>`E_TRANSIT_NOT_A_DIRECTORY` | 500 | `directory()` / `authenticate()` a nommé un fournisseur à redirection ; appelez `begin()`. |
| <span id="e-transit-begin-unsupported"></span>`E_TRANSIT_BEGIN_UNSUPPORTED` | 500 | `begin()` sur un driver qui n'a pas de `begin()`. |
| <span id="e-transit-token-profile-unsupported"></span>`E_TRANSIT_TOKEN_PROFILE_UNSUPPORTED` | 500 | `userFromToken()` sur un driver qui ne sait pas lire un profil depuis un jeton. |
| <span id="e-transit-use-begin"></span>`E_TRANSIT_USE_BEGIN` | 500 | `redirectUrl()` sur un fournisseur dont la redirection demande un aller-retour (OAuth1, OpenID Connect, SAML) ; appelez `begin()`. |
| <span id="e-transit-no-authorize-params"></span>`E_TRANSIT_NO_AUTHORIZE_PARAMS` | 500 | Un customizer a été passé à une connexion OAuth1 ou SAML, qui n'a ni scopes ni paramètres par requête. |
| <span id="e-transit-state-required"></span>`E_TRANSIT_STATE_REQUIRED` | 500 | Un callback a tourné sans `expectedState`. |
| <span id="e-transit-missing-secret"></span>`E_TRANSIT_MISSING_SECRET` | 500 | Un flux n'a pas le secret qu'il lui faut : le `secret` que `begin()` a rendu (vérificateur PKCE, secret du jeton de requête OAuth1), ou le secret de jeton avec lequel signe un jeton d'accès OAuth1. |
| <span id="e-transit-pkce-required"></span>`E_TRANSIT_PKCE_REQUIRED` | 500 | Un fournisseur qui exige PKCE n'a reçu aucun vérificateur de code. |
| <span id="e-transit-token-exchange-failed"></span>`E_TRANSIT_TOKEN_EXCHANGE_FAILED` | 500 | Le point de jetons du fournisseur a répondu une erreur HTTP. |
| <span id="e-transit-no-access-token"></span>`E_TRANSIT_NO_ACCESS_TOKEN` | 500 | La réponse de jetons ne porte aucun jeton d'accès. |
| <span id="e-transit-profile-request-failed"></span>`E_TRANSIT_PROFILE_REQUEST_FAILED` | 500 | Le point de profil ou userinfo du fournisseur a répondu une erreur HTTP. |
| <span id="e-transit-invalid-response"></span>`E_TRANSIT_INVALID_RESPONSE` | 500 | La réponse d'un fournisseur n'est pas du JSON, ou pas un objet JSON. |
| <span id="e-transit-no-email"></span>`E_TRANSIT_NO_EMAIL` | 500 | LinkedIn n'a renvoyé aucune adresse e-mail ; l'application a besoin du scope `r_emailaddress`. |
| <span id="e-transit-callback-not-confirmed"></span>`E_TRANSIT_CALLBACK_NOT_CONFIRMED` | 500 | Un fournisseur OAuth1 n'a pas confirmé l'URL de callback. |
| <span id="e-transit-no-request-token"></span>`E_TRANSIT_NO_REQUEST_TOKEN` | 500 | Un fournisseur OAuth1 a répondu sans jeton de requête. |
| <span id="e-transit-discovery-failed"></span>`E_TRANSIT_DISCOVERY_FAILED` | 500 | La découverte OpenID Connect a répondu une erreur HTTP. |
| <span id="e-transit-invalid-discovery"></span>`E_TRANSIT_INVALID_DISCOVERY` | 500 | Le document de découverte n'a pas un champ requis, nomme un autre émetteur, ou donne un endpoint qui n'est pas en `https`. |
| <span id="e-transit-jwks-failed"></span>`E_TRANSIT_JWKS_FAILED` | 500 | La récupération du JWKS du fournisseur a échoué, ou il n'a pas de tableau `keys`. Des clés plus anciennes que `cache.ttlMs` ne sont pas utilisées à sa place. |
| <span id="e-transit-unknown-signing-key"></span>`E_TRANSIT_UNKNOWN_SIGNING_KEY` | 500 | L'id_token nomme une clé de signature que le fournisseur n'a pas publiée. |
| <span id="e-transit-unsupported-algorithm"></span>`E_TRANSIT_UNSUPPORTED_ALGORITHM` | 500 | Le fournisseur ne déclare que des algorithmes d'id_token que transit refuse (les signatures asymétriques sont exigées). |
| <span id="e-transit-no-id-token"></span>`E_TRANSIT_NO_ID_TOKEN` | 500 | La réponse de jetons ne porte aucun id_token ; vérifiez que le scope `openid` est accordé. |
| <span id="e-transit-invalid-id-token"></span>`E_TRANSIT_INVALID_ID_TOKEN` | 500 | L'id_token est refusé : malformé, signature ou algorithme invalide, mauvais émetteur, audience ou nonce, expiré. |
| <span id="e-transit-no-userinfo-endpoint"></span>`E_TRANSIT_NO_USERINFO_ENDPOINT` | 500 | Un profil a été demandé à partir d'un seul jeton et le fournisseur ne publie aucun point userinfo. |
| <span id="e-transit-userinfo-mismatch"></span>`E_TRANSIT_USERINFO_MISMATCH` | 500 | La réponse userinfo décrit un autre sujet que l'id_token. |
| <span id="e-transit-saml-rejected"></span>`E_TRANSIT_SAML_REJECTED` | 500 | Une réponse ou une assertion SAML est refusée. |
| <span id="e-transit-invalid-signature"></span>`E_TRANSIT_INVALID_SIGNATURE` | 500 | Une signature XML ne se vérifie pas, ou n'est pas une que transit accepte. |
| <span id="e-transit-invalid-ber"></span>`E_TRANSIT_INVALID_BER` | 500 | Un message LDAP ne s'encode pas ou ne se décode pas en BER, ou un DN, un attribut ou une valeur de filtre passé à `LdapConnection` n'est pas une chaîne. |
| <span id="e-transit-quasar-missing"></span>`E_TRANSIT_QUASAR_MISSING` | 500 | Un stockage anti-rejeu Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son provider n'a pas démarré. |
| <span id="e-transit-incomplete-connection"></span>`E_TRANSIT_INCOMPLETE_CONNECTION` | 500 | La connexion quasar n'a pas une commande qu'émet le stockage anti-rejeu. |
| <span id="e-transit-fake-not-declared"></span>`E_TRANSIT_FAKE_NOT_DECLARED` | 500 | `FakeTransit` a été sollicité pour un fournisseur qu'aucun `willReturn()` n'a déclaré. |
| <span id="e-transit-fake-assertion"></span>`E_TRANSIT_FAKE_ASSERTION` | 500 | Une assertion de `FakeTransit` (`assertBegan`, `assertSignedIn`, `assertNobodySignedIn`) a échoué. |
| <span id="e-transit-ldap-error"></span>`E_TRANSIT_LDAP_ERROR` | 500 | Un annuaire a refusé ou n'a pas pu être joint. `resultCode` porte le code de résultat LDAP quand l'annuaire en a rendu un ; 400 pour des identifiants invalides (49), pour un identifiant ou un mot de passe vide, et pour un identifiant ou un mot de passe qui n'est pas une chaîne (signalé comme 49). |
| <span id="e-oauth-state-mismatch"></span>`E_OAUTH_STATE_MISMATCH` | 400 | Le state du callback OAuth manque ou diffère de celui stocké à la redirection (CSRF possible). Recommencez la connexion. |
| <span id="e-oauth-missing-code"></span>`E_OAUTH_MISSING_CODE` | 500 | Le callback OAuth est revenu sans son autorisation (`code`, `oauth_verifier` en OAuth1, `SAMLResponse` en SAML), comme quand l'utilisateur a refusé l'accès. Rien n'a été envoyé au fournisseur. |
| <span id="e-transit-insecure-issuer"></span>`E_TRANSIT_INSECURE_ISSUER` | 500 | L'`issuer` OpenID Connect n'est pas une URL `https` (`http://localhost` excepté). Levée à la construction du driver. |

## Erreurs Vellum

Vellum normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_VELLUM_`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-vellum-invalid-pdf"></span>`E_VELLUM_INVALID_PDF` | 422 | Les octets ne sont pas un PDF que vellum sait lire. |
| <span id="e-vellum-signed-document"></span>`E_VELLUM_SIGNED_DOCUMENT` | 500 | Une modification invaliderait les signatures du document ; refusée sauf si l'appelant accepte de les perdre. |
| <span id="e-vellum-invalid-page"></span>`E_VELLUM_INVALID_PAGE` | 500 | Un numéro de page n'est pas un entier à partir de 1. |
| <span id="e-vellum-invalid-rotation"></span>`E_VELLUM_INVALID_ROTATION` | 500 | Une rotation n'est pas un multiple de 90. |
| <span id="e-vellum-empty-merge"></span>`E_VELLUM_EMPTY_MERGE` | 500 | `merge()` n'a reçu aucun document. |
| <span id="e-vellum-empty-selection"></span>`E_VELLUM_EMPTY_SELECTION` | 500 | Une sélection exige au moins une page. |
| <span id="e-vellum-merge-failed"></span>`E_VELLUM_MERGE_FAILED` | 500 | La fusion de documents a échoué. |
| <span id="e-vellum-select-failed"></span>`E_VELLUM_SELECT_FAILED` | 500 | La sélection de pages a échoué. |
| <span id="e-vellum-split-failed"></span>`E_VELLUM_SPLIT_FAILED` | 500 | Le découpage du document a échoué. |
| <span id="e-vellum-rotate-failed"></span>`E_VELLUM_ROTATE_FAILED` | 500 | La rotation de pages a échoué. |
| <span id="e-vellum-stamp-failed"></span>`E_VELLUM_STAMP_FAILED` | 500 | L'apposition d'une image a échoué. |
| <span id="e-vellum-stamp-text-failed"></span>`E_VELLUM_STAMP_TEXT_FAILED` | 500 | L'apposition d'un texte a échoué. |
| <span id="e-vellum-fill-failed"></span>`E_VELLUM_FILL_FAILED` | 500 | Le remplissage du formulaire a échoué. |
| <span id="e-vellum-flatten-failed"></span>`E_VELLUM_FLATTEN_FAILED` | 500 | L'aplatissement du formulaire a échoué. |
| <span id="e-vellum-render-failed"></span>`E_VELLUM_RENDER_FAILED` | 500 | Le rendu d'une page en image a échoué. |
| <span id="e-vellum-extract-failed"></span>`E_VELLUM_EXTRACT_FAILED` | 500 | L'extraction du texte a échoué. |
| <span id="e-vellum-write-failed"></span>`E_VELLUM_WRITE_FAILED` | 500 | L'écriture du document a échoué. |
| <span id="e-vellum-sign-failed"></span>`E_VELLUM_SIGN_FAILED` | 500 | La signature du document a échoué. |
| <span id="e-vellum-verify-failed"></span>`E_VELLUM_VERIFY_FAILED` | 500 | La vérification des signatures a échoué. |
| <span id="e-vellum-unknown-signer"></span>`E_VELLUM_UNKNOWN_SIGNER` | 500 | Aucun signataire de ce nom n'est configuré. |
| <span id="e-vellum-signer-invalid"></span>`E_VELLUM_SIGNER_INVALID` | 500 | La clé ou le certificat d'un signataire est vide. |
| <span id="e-vellum-timestamp-failed"></span>`E_VELLUM_TIMESTAMP_FAILED` | 500 | La construction ou la lecture d'un horodatage a échoué. |
| <span id="e-vellum-timestamp-unreachable"></span>`E_VELLUM_TIMESTAMP_UNREACHABLE` | 500 | L'autorité d'horodatage n'a pas pu être jointe. |
| <span id="e-vellum-timestamp-refused"></span>`E_VELLUM_TIMESTAMP_REFUSED` | 500 | L'autorité d'horodatage a répondu un statut d'erreur. |
| <span id="e-vellum-font-unreadable"></span>`E_VELLUM_FONT_UNREADABLE` | 500 | Un fichier de police configuré ne peut pas être lu. |
| <span id="e-vellum-file-not-found"></span>`E_VELLUM_FILE_NOT_FOUND` | 500 | Un fichier donné par chemin ne peut pas être lu. |
| <span id="e-vellum-invalid-options"></span>`E_VELLUM_INVALID_OPTIONS` | 500 | Une option de document, de page, de tableau ou de dessin, ou un plafond, est invalide, ou `config/vellum.ts` demande un `format` autre que `"png"` ou `"jpeg"`. |
| <span id="e-vellum-invalid-color"></span>`E_VELLUM_INVALID_COLOR` | 500 | Une couleur ne peut pas être lue. |
| <span id="e-vellum-invalid-image"></span>`E_VELLUM_INVALID_IMAGE` | 500 | Une image ne peut pas être utilisée (illisible, ou ouverte par un autre document). |
| <span id="e-vellum-invalid-svg"></span>`E_VELLUM_INVALID_SVG` | 500 | Un SVG ne peut pas être utilisé ; passez un fichier en URL ou en octets. |
| <span id="e-vellum-unsupported-content"></span>`E_VELLUM_UNSUPPORTED_CONTENT` | 500 | Un tracé contient un opérateur que vellum ne dessine pas. |
| <span id="e-vellum-invalid-structure"></span>`E_VELLUM_INVALID_STRUCTURE` | 500 | Un élément de structure a été modifié après sa fin. |
| <span id="e-vellum-no-page"></span>`E_VELLUM_NO_PAGE` | 500 | Il n'y a pas de page courante ; appelez d'abord `addPage()`. |
| <span id="e-vellum-no-form"></span>`E_VELLUM_NO_FORM` | 500 | Des champs de formulaire ont été ajoutés avant `initForm()`. |
| <span id="e-vellum-document-ended"></span>`E_VELLUM_DOCUMENT_ENDED` | 500 | Le document est terminé ; on ne peut plus rien y ajouter. |
| <span id="e-vellum-napi-required"></span>`E_VELLUM_NAPI_REQUIRED` | 500 | Le moteur PDF Rust n'est pas chargé. |
| <span id="e-vellum-not-booted"></span>`E_VELLUM_NOT_BOOTED` | — | Le service de `services/main` a servi avant le boot de `VellumProvider`. |
| <span id="e-vellum-table-ended"></span>`E_VELLUM_TABLE_ENDED` | 500 | Une ligne a été ajoutée à un tableau après que `lastRow` l'a terminé. |
| <span id="e-vellum-invalid-link"></span>`E_VELLUM_INVALID_LINK` | 500 | Un lien ou une destination nommée est inutilisable. |
| <span id="e-vellum-invalid-outline"></span>`E_VELLUM_INVALID_OUTLINE` | 500 | Une entrée du sommaire est inutilisable. |
| <span id="e-vellum-invalid-font"></span>`E_VELLUM_INVALID_FONT` | 500 | Une police est inutilisable. |
| <span id="e-vellum-no-font"></span>`E_VELLUM_NO_FONT` | 500 | Du texte a été écrit avant qu'une police soit choisie. |
| <span id="e-vellum-page-out-of-range"></span>`E_VELLUM_PAGE_OUT_OF_RANGE` | 500 | Un index de page ne désigne aucune page du document. |
| <span id="e-vellum-unbalanced-restore"></span>`E_VELLUM_UNBALANCED_RESTORE` | 500 | `restore()` a été appelé sans `save()` correspondant. |
| <span id="e-vellum-nothing-to-resume"></span>`E_VELLUM_NOTHING_TO_RESUME` | 500 | Aucun texte n'attend de page. |
| <span id="e-vellum-validation"></span>`E_VELLUM_VALIDATION` | 500 | Le document ne satisfait pas son `subset` (PDF/A, PDF/UA), ou un champ de formulaire ou une annotation enfreint une règle du PDF. |
| <span id="e-vellum-document-broken"></span>`E_VELLUM_DOCUMENT_BROKEN` | 500 | Un appel précédent a échoué dans le moteur ; commencez un nouveau document. |
| <span id="e-vellum-internal"></span>`E_VELLUM_INTERNAL` | 500 | Le moteur a paniqué. |

## Erreurs Visa

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access"></span>`E_UNAUTHORIZED_ACCESS` | 403 | `currentAccessToken.authorize()` a trouvé un token trop restreint pour l'ability demandée. 403, pas 401 : la requête est authentifiée (`insufficient_scope`). |
| <span id="e-visa-missing-issuer"></span>`E_VISA_MISSING_ISSUER` | 500 | Aucun `issuer` n'est configuré. |
| <span id="e-visa-invalid-issuer"></span>`E_VISA_INVALID_ISSUER` | 500 | L'`issuer` n'est pas une URL. |
| <span id="e-visa-insecure-issuer"></span>`E_VISA_INSECURE_ISSUER` | 500 | L'`issuer` n'est pas en https (localhost excepté). |
| <span id="e-visa-no-redirect-uri"></span>`E_VISA_NO_REDIRECT_URI` | 500 | Un client a été enregistré sans URI de redirection. |
| <span id="e-visa-invalid-redirect-uri"></span>`E_VISA_INVALID_REDIRECT_URI` | 500 | Une URI de redirection n'est pas une URL complète. |
| <span id="e-visa-invalid-initial-access-token"></span>`E_VISA_INVALID_INITIAL_ACCESS_TOKEN` | 500 | `registration.initialAccessToken` est vide, ce qui accepterait un bearer vide. |
| <span id="e-visa-invalid-secret-ttl"></span>`E_VISA_INVALID_SECRET_TTL` | 500 | `registration.secretTtlSeconds` n'est pas un nombre entier de secondes positif. |
| <span id="e-visa-store-read-only"></span>`E_VISA_STORE_READ_ONLY` | 500 | Le store de clients ne peut pas enregistrer de clients. |
| <span id="e-visa-missing-config"></span>`E_VISA_MISSING_CONFIG` | 500 | `VisaProvider` n'a trouvé aucun `config/visa.ts` ; lancez `ream configure @c9up/visa`. |
| <span id="e-visa-not-booted"></span>`E_VISA_NOT_BOOTED` | 500 | `@c9up/visa/services/main` a été lu avant le boot de `VisaProvider`, ou avant `setVisa()`. |
| <span id="e-visa-credentials-unsupported"></span>`E_VISA_CREDENTIALS_UNSUPPORTED` | 500 | `authenticate()` avec des identifiants sur la garde visa, qui ne vérifie qu'un jeton bearer. |
| <span id="e-visa-no-token-client"></span>`E_VISA_NO_TOKEN_CLIENT` | 500 | Le `createToken()` de la garde a tourné sans `tokenClientId` : un jeton est toujours émis pour un client. |
| <span id="e-visa-invalid-resource"></span>`E_VISA_INVALID_RESOURCE` | 500 | Un identifiant de ressource protégée n'est pas une URI absolue, ou porte un fragment (RFC 8707 §2). |
| <span id="e-visa-invalid-challenge-parameter"></span>`E_VISA_INVALID_CHALLENGE_PARAMETER` | 500 | Un paramètre de `WWW-Authenticate` contient un guillemet, une barre oblique inverse ou un caractère de contrôle, et ne peut donc pas être une chaîne entre guillemets. |
| <span id="e-visa-corrupt-row"></span>`E_VISA_CORRUPT_ROW` | 500 | Le stockage Atlas a lu une colonne qu'il ne sait pas décoder : une liste, une date, une chaîne ou une méthode d'authentification client hors des trois admises. |
| <span id="e-visa-test-authorize-failed"></span>`E_VISA_TEST_AUTHORIZE_FAILED` | 500 | La requête d'autorisation de l'aide `@c9up/visa/testing` a été refusée ; le message porte l'erreur OAuth. |
| <span id="e-visa-internal"></span>`E_VISA_INTERNAL` | 500 | Un invariant interne a été rompu : un bug de visa, à signaler. |
| <span id="e-visa-oauth-error"></span>`E_VISA_OAUTH_ERROR` | 400 | Une erreur du client, renvoyée sur le fil : `oauthCode` porte la chaîne du protocole (`invalid_grant`, `invalid_client`…). 401 pour `invalid_client` et `invalid_token`, sinon 400. |
| <span id="e-visa-unredirectable"></span>`E_VISA_UNREDIRECTABLE` | 400 | Un échec d'autorisation qui ne peut pas être redirigé (client ou URI de redirection inconnus) : montrez `error` à l'utilisateur. |
| <span id="e-visa-invalid-ttl"></span>`E_VISA_INVALID_TTL` | 500 | Une durée de vie n'est pas un nombre entier de secondes positif : `accessTokenTtlSeconds`, `refreshTokenTtlSeconds`, `codeTtlSeconds` ou `consentTicketTtlSeconds` (vérifié à la construction du `VisaManager`, et par `token()` et `issueAuthorizationCode()` appelées directement), ou l'`expiresInSeconds` de la garde (vérifié par `visaGuard()` et à chaque `createToken()`). |

## Erreurs Warden

Warden normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_WARDEN_`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access-warden"></span>`E_UNAUTHORIZED_ACCESS` | 403 | Aucun garde n'a authentifié la requête. Une route gardée répond avec ce code. |
| <span id="e-invalid-credentials"></span>`E_INVALID_CREDENTIALS` | 400 | Les identifiants ne correspondent pas. `authFinder().verifyCredentials` la lève pour un compte inconnu comme pour un mauvais mot de passe, après le même travail de hachage. |
| <span id="e-warden-auth-strategy-error"></span>`E_WARDEN_AUTH_STRATEGY_ERROR` | 500 | Tous les gardes tentés ont planté (base de données indisponible, bug) : un incident serveur, distinct d'un refus d'identifiants. |
| <span id="e-warden-mfa-required"></span>`E_WARDEN_MFA_REQUIRED` | 403 | La route déclare `@RequireMfa` et l'utilisateur n'a pas passé l'étape renforcée. |
| <span id="e-authorization-failure"></span>`E_AUTHORIZATION_FAILURE` | 403 | Une ability ou une policy du bouncer a refusé l'action (403, sauf si le refus donne un autre statut). La classe exportée porte le refus dans `error.response`, traduction comprise. |
| <span id="e-warden-unauthorized"></span>`E_WARDEN_UNAUTHORIZED` | 401 | Le `expressMiddleware()` autonome n'a trouvé aucun token ou l'a refusé. |
| <span id="e-warden-auth-error"></span>`E_WARDEN_AUTH_ERROR` | 500 | Le `expressMiddleware()` autonome a échoué en interne. |
| <span id="e-warden-no-auth-config"></span>`E_WARDEN_NO_AUTH_CONFIG` | 500 | `WardenProvider` a démarré sans aucun garde configuré. |
| <span id="e-warden-napi-required"></span>`E_WARDEN_NAPI_REQUIRED` | 500 | Le moteur JWT Rust n'est pas chargé. |
| <span id="e-warden-not-booted"></span>`E_WARDEN_NOT_BOOTED` | 500 | Le singleton `AuthManager` a été utilisé avant que `WardenProvider.boot()` ne tourne. |
| <span id="e-warden-auth-not-registered"></span>`E_WARDEN_AUTH_NOT_REGISTERED` | 500 | `AuthManager` n'est pas dans le conteneur ; ajoutez `WardenProvider` aux providers. |
| <span id="e-warden-invalid-config"></span>`E_WARDEN_INVALID_CONFIG` | 500 | Un réglage de garde, de token, de MFA ou de limite de débit est invalide. |
| <span id="e-warden-strategy-not-found"></span>`E_WARDEN_STRATEGY_NOT_FOUND` | 500 | Un nom de garde n'est pas configuré. |
| <span id="e-warden-strategy-cannot-issue"></span>`E_WARDEN_STRATEGY_CANNOT_ISSUE` | 500 | `issueFor()` sur un garde qui n'émet pas de tokens. |
| <span id="e-warden-strategy-cannot-login"></span>`E_WARDEN_STRATEGY_CANNOT_LOGIN` | 500 | `login()` / `logout()` sur un garde sans état (JWT, clé d'API). |
| <span id="e-warden-strategy-has-no-client"></span>`E_WARDEN_STRATEGY_HAS_NO_CLIENT` | 500 | Un garde n'a pas d'`authenticateAsClient()` : il ne peut pas forger une requête client en test. |
| <span id="e-warden-use-login"></span>`E_WARDEN_USE_LOGIN` | 500 | Le garde de session n'a pas d'étape d'identifiants. Vérifiez le mot de passe vous-même, puis appelez `login(user)`. |
| <span id="e-warden-no-session"></span>`E_WARDEN_NO_SESSION` | 500 | `login()` / `logout()` d'un garde de session a tourné sans `ctx.session` ; enregistrez d'abord le middleware de session. |
| <span id="e-warden-remember-me-unavailable"></span>`E_WARDEN_REMEMBER_ME_UNAVAILABLE` | 500 | Le « se souvenir de moi » a été demandé et aucun token de ce type n'est configuré. |
| <span id="e-warden-token-ttl-invalid"></span>`E_WARDEN_TOKEN_TTL_INVALID` | 500 | Une durée de vie de jeton (le TTL d'un refresh token, la durée d'un jeton d'accès) n'est pas un nombre fini et positif ; une durée de vie de jeton doit aussi être un nombre entier de secondes. |
| <span id="e-warden-otp-store-full"></span>`E_WARDEN_OTP_STORE_FULL` | 500 | Le store OTP en mémoire tient son maximum de défis en attente. |
| <span id="e-warden-otp-store-contract"></span>`E_WARDEN_OTP_STORE_CONTRACT` | 500 | Le store de défis OTP n'implémente pas `take()`. |
| <span id="e-warden-webauthn-store-full"></span>`E_WARDEN_WEBAUTHN_STORE_FULL` | 500 | Le store de défis WebAuthn en mémoire tient son maximum de cérémonies en attente. |
| <span id="e-warden-store-ttl-invalid"></span>`E_WARDEN_STORE_TTL_INVALID` | 500 | Le `ttlMs` d'un store de défis n'est pas un entier positif. |
| <span id="e-warden-store-limit-invalid"></span>`E_WARDEN_STORE_LIMIT_INVALID` | 500 | Le `maxEntries` d'un store de défis n'est pas un entier positif. |
| <span id="e-warden-webauthn-credential-exists"></span>`E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS` | 500 | L'identifiant de credential WebAuthn est déjà enregistré ; l'enregistrement répond `{ verified: false }`. |
| <span id="e-warden-invalid-credential"></span>`E_WARDEN_INVALID_CREDENTIAL` | 500 | Une clé publique WebAuthn stockée est mal formée. |
| <span id="e-warden-invalid-ability"></span>`E_WARDEN_INVALID_ABILITY` | 500 | `Bouncer.ability()` a reçu des options sans callback. |
| <span id="e-warden-unknown-ability"></span>`E_WARDEN_UNKNOWN_ABILITY` | 500 | Aucune ability de ce nom n'est enregistrée sur le bouncer. |
| <span id="e-warden-unknown-policy"></span>`E_WARDEN_UNKNOWN_POLICY` | 500 | Aucune policy de ce nom n'est enregistrée sur le bouncer. |
| <span id="e-warden-unknown-policy-action"></span>`E_WARDEN_UNKNOWN_POLICY_ACTION` | 500 | Une policy n'a pas de méthode pour l'action. |
| <span id="e-warden-policy-resolution-failed"></span>`E_WARDEN_POLICY_RESOLUTION_FAILED` | 500 | Le conteneur a résolu une policy en autre chose qu'une instance de sa classe. |
| <span id="e-warden-template-engine-unusable"></span>`E_WARDEN_TEMPLATE_ENGINE_UNUSABLE` | 500 | Le moteur de templates est installé mais `@can` / `@cannot` ne peuvent pas y être enregistrés. |
| <span id="e-warden-invalid-duration"></span>`E_WARDEN_INVALID_DURATION` | 500 | Une chaîne de durée ne se lit pas, ou nomme une unité inconnue. |
| <span id="e-warden-invalid-totp-secret"></span>`E_WARDEN_INVALID_TOTP_SECRET` | 500 | Le secret passé à `TotpProvider.generate()` / `verify()` n'est pas du base32. |
| <span id="e-warden-blacklist-required"></span>`E_WARDEN_BLACKLIST_REQUIRED` | 500 | `JwtStrategy.revoke()` sur une garde construite sans `blacklist`. |
| <span id="e-warden-strategy-cannot-authenticate"></span>`E_WARDEN_STRATEGY_CANNOT_AUTHENTICATE` | 500 | `authenticate()` avec des identifiants sur une garde de clé d'API ; le jeton va à `verify()`. |
| <span id="e-warden-quasar-missing"></span>`E_WARDEN_QUASAR_MISSING` | 500 | Une liste noire Redis des jetons nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son provider n'a pas démarré. |
| <span id="e-warden-incomplete-connection"></span>`E_WARDEN_INCOMPLETE_CONNECTION` | 500 | La connexion quasar n'a pas une commande qu'émet la liste noire des jetons (`set`, `exists`). |
| <span id="e-warden-refresh-store-contract"></span>`E_WARDEN_REFRESH_STORE_CONTRACT` | 500 | Le driver de jetons de rafraîchissement passé à `rotateRefreshToken` n'a pas de `consume()` ou pas de `revokeFamily()`. `consume(familyId, presentedHash, successor)` doit remplacer le hachage de la famille seulement s'il est encore celui présenté, en une seule opération indivisible (un `UPDATE … WHERE family_id = ? AND hash = ?` et son nombre de lignes modifiées, ou un script Lua sur Redis). |
| <span id="e-warden-empty-gate-requirement"></span>`E_WARDEN_EMPTY_GATE_REQUIREMENT` | 500 | `@Guard()`, `@Role()` ou `@Permission()` ne nomme rien à exiger (aucun argument, ou seulement des noms vides, comme une liste vide lue dans la configuration). Levée quand le décorateur est appliqué, au chargement de la classe, et par le middleware de warden pour une action dont les métadonnées ne nomment rien : l'action n'est jamais lue comme publique. Nommez au moins un guard, un rôle ou une permission, ou retirez le décorateur. |
