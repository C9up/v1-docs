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
- Erreurs Aurora
- Erreurs Blackhole
- Erreurs Chronos
- Erreurs Comet
- Erreurs Echo
- Erreurs Eclipse
- Erreurs Eon
- Erreurs Ephemeris
- Erreurs Goldstone
- Erreurs du plugin Helix
- Erreurs Inker
- Erreurs Lumen
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
`E_WARDEN_FORBIDDEN`) ; quelques identifiants partagés gardent une forme simple
(`E_ROW_NOT_FOUND`, `E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Cherchez le
code ci-dessous : chacun a sa propre ancre, le code en minuscules avec `-` à la
place de `_` (`#e-atlas-empty-select`), et c'est là que pointe le `docsUrl` d'une
erreur.

Les codes de `@c9up/ream` lui-même viennent d'abord, puis ceux de chaque paquet,
par ordre alphabétique. La colonne **HTTP** donne le statut avec lequel l'erreur
répond ; `—` signifie que ce n'est pas une réponse HTTP mais une erreur levée vers
l'appelant (configuration, programmation ou exécution).

## Format des erreurs

Les erreurs levées par le cœur du framework (`ReamError`) affichent un encadré de
diagnostic en développement :

```
┌──────────────────────────────────────────────┐
│ [E_CONTAINER_NOT_FOUND] No binding found for 'mailer'. Did you mean 'mail'?
│
│ Hint: Register it with container.singleton() or decorate with @inject().
│ Docs: https://r-eam.com/en/reference/errors#e-container-not-found
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
| <span id="e-container-not-found"></span>`E_CONTAINER_NOT_FOUND` | — | Aucun binding trouvé pour le token demandé. Inclut des suggestions « vouliez-vous dire ? » pour les fautes de frappe. Enregistrez-le avec `container.singleton()` ou décorez la classe avec `@inject()`. |
| <span id="e-circular-dependency"></span>`E_CIRCULAR_DEPENDENCY` | — | Dépendance circulaire (ou alias circulaire) détectée pendant la résolution. Utilisez des factories explicites ou découplez via des événements. |
| <span id="e-container-missing-metadata"></span>`E_CONTAINER_MISSING_METADATA` | — | Une classe déclare des paramètres de constructeur mais le conteneur ne trouve aucune métadonnée de dépendance pour eux. Activez les métadonnées de décorateurs, annotez les paramètres avec `@inject()`, ou déclarez `static containerInjections`. |
| <span id="e-container-reserved-token"></span>`E_CONTAINER_RESERVED_TOKEN` | — | Le nom du token se lit comme une clé d'`Object.prototype` (`constructor`, `__proto__`…). Choisissez un autre nom. |

## Erreurs Router

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-route-not-found"></span>`E_ROUTE_NOT_FOUND` | 404 | Aucune route ne correspond à la méthode et au chemin demandés. |
| <span id="e-duplicate-route"></span>`E_DUPLICATE_ROUTE` | — | Deux routes déclarent la même méthode et le même chemin. |
| <span id="e-duplicate-route-name"></span>`E_DUPLICATE_ROUTE_NAME` | — | Deux routes portent le même nom. |
| <span id="e-missing-route-name"></span>`E_MISSING_ROUTE_NAME` | — | Un groupe nommé préfixe une route qui n'a pas de nom. Nommez chaque route d'un groupe nommé. |
| <span id="e-invalid-route-domain"></span>`E_INVALID_ROUTE_DOMAIN` | — | Un domaine de route a un paramètre sans nom, ou deux fois le même paramètre. |
| <span id="e-unregistered-controller"></span>`E_UNREGISTERED_CONTROLLER` | — | Une route nomme par une chaîne un contrôleur qui n'est pas enregistré. |
| <span id="e-no-view-engine"></span>`E_NO_VIEW_ENGINE` | — | `router.on(path).render()` est utilisé alors qu'aucun moteur de templates n'est installé. |
| <span id="e-validator-not-found"></span>`E_VALIDATOR_NOT_FOUND` | — | Une route nomme un validateur qui n'est pas enregistré. |

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
| <span id="e-websocket-register"></span>`E_WEBSOCKET_REGISTER` | — | Le serveur natif a refusé un nouvel identifiant de socket. |
| <span id="e-websocket-context"></span>`E_WEBSOCKET_CONTEXT` | — | Le handler d'une route WebSocket a tourné sans son socket (appelé hors du kernel). |
| <span id="e-websocket-close-code"></span>`E_WEBSOCKET_CLOSE_CODE` | — | `socket.close()` avec un code qu'une trame de fermeture ne peut pas porter (RFC 6455 §7.4). |
| <span id="e-websocket-close-reason"></span>`E_WEBSOCKET_CLOSE_REASON` | — | Une raison de fermeture de plus de 123 octets. |
| <span id="e-invalid-websocket-config"></span>`E_INVALID_WEBSOCKET_CONFIG` | — | Une limite WebSocket native de 0 octet. |

## Erreurs Pipeline

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-pipeline-unknown-middleware"></span>`E_PIPELINE_UNKNOWN_MIDDLEWARE` | — | Une route référence un middleware nommé non enregistré. Enregistrez-le avec `middleware.register()`. |
| <span id="e-middleware-not-found"></span>`E_MIDDLEWARE_NOT_FOUND` | — | Un middleware nommé n'a pas pu être résolu à la construction du pipeline. Enregistrez-le avec `middleware.register()`. |
| <span id="e-middleware-entry"></span>`E_MIDDLEWARE_ENTRY` | — | Une entrée de middleware sans paramètre déclaré a été lue comme un import différé, et elle ne mène pas à un module avec un export par défaut. |
| <span id="e-pipeline-double-next"></span>`E_PIPELINE_DOUBLE_NEXT` | — | Un middleware a appelé `next()` plus d'une fois. Chaque middleware doit appeler `next()` au plus une fois. |
| <span id="e-pipeline-error"></span>`E_PIPELINE_ERROR` | — | Un handler a levé une erreur qui ne porte aucun code du framework. L'erreur garde la position de l'étape dans son contexte. |
| <span id="e-validator-unusable"></span>`E_VALIDATOR_UNUSABLE` | — | Un validateur de route n'expose ni `validateResultAsync()`, ni `validateResult()`, ni `validate()`. |

## Erreurs HTTP

Levées par les exceptions de `@c9up/ream` et par son serveur HTTP natif. Les refus du serveur lui-même sont répondus avant tout middleware.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unknown"></span>`E_UNKNOWN` | 500 | Le code par défaut d'une `Exception` qui n'en fixe aucun, et d'une erreur reconstruite depuis la couche native sans code. |
| <span id="e-runtime-exception"></span>`E_RUNTIME_EXCEPTION` | 500 | `RuntimeException` : une défaillance du programme, pas de la requête. |
| <span id="e-invalid-arguments"></span>`E_INVALID_ARGUMENTS` | 500 | `InvalidArgumentsException` : une fonction a été appelée avec des arguments inutilisables. |
| <span id="e-http-exception"></span>`E_HTTP_EXCEPTION` | variable | Une erreur HTTP générique qui répond avec le statut qu'on lui a donné. |
| <span id="e-http-request-aborted"></span>`E_HTTP_REQUEST_ABORTED` | 400 | `response.abort()` (ou `abortIf` / `abortUnless`) a arrêté la requête ; le corps donné part avec le statut donné, 400 par défaut. |
| <span id="e-unauthorized"></span>`E_UNAUTHORIZED` | 401 | La requête n'est pas authentifiée. |
| <span id="e-forbidden"></span>`E_FORBIDDEN` | 403 | La requête est authentifiée mais pas autorisée. |
| <span id="e-row-not-found"></span>`E_ROW_NOT_FOUND` | 404 | Un enregistrement qui doit exister est introuvable. |
| <span id="e-validation-error"></span>`E_VALIDATION_ERROR` | 422 | Les données de la requête n'ont pas passé la validation. Le corps porte un message par champ et par règle ; un formulaire de navigateur est renvoyé en arrière avec les erreurs en flash. |
| <span id="e-request-entity-too-large"></span>`E_REQUEST_ENTITY_TOO_LARGE` | 413 | Le corps de la requête dépasse la limite du body parser. Lire le corps brut d'une telle requête la lève aussi. |
| <span id="e-handler-failure"></span>`E_HANDLER_FAILURE` | 500 | Le gestionnaire d'exceptions a lui-même levé une erreur en rendant une erreur. |
| <span id="e-http-context-not-found"></span>`E_HTTP_CONTEXT_NOT_FOUND` | — | `HttpContext.getOrFail()` a été appelé hors d'une requête, ou avec le suivi du contexte ambiant désactivé. Passez `ctx` explicitement. |
| <span id="e-response-too-large"></span>`E_RESPONSE_TOO_LARGE` | — | Un corps de réponse dépasse le plafond configuré. Les corps sont gardés entiers en mémoire : servez un gros fichier en flux ou depuis le stockage. |
| <span id="e-bodyparser-config"></span>`E_BODYPARSER_CONFIG` | — | La configuration du body parser utilise une option qui n'est plus prise en charge. |
| <span id="e-bodyparser-invalid-size"></span>`E_BODYPARSER_INVALID_SIZE` | — | Une limite de taille de corps n'est ni un nombre d'octets ni une taille comme `'1mb'`. |
| <span id="e-bodyparser-invalid-json"></span>`E_BODYPARSER_INVALID_JSON` | 400 / 422 | Un corps JSON est mal formé (400), ou, avec `json.strict`, n'est ni un objet ni un tableau (422). |
| <span id="e-http-request-timeout"></span>`E_HTTP_REQUEST_TIMEOUT` | 408 | Le serveur natif n'a pas reçu le corps de la requête à temps. |
| <span id="e-request-aborted"></span>`E_REQUEST_ABORTED` | 400 | Le client a fermé la connexion pendant la lecture du corps. |
| <span id="e-bad-multipart"></span>`E_BAD_MULTIPART` | 400 | Un corps `multipart/form-data` est mal formé, ou son paramètre `boundary` manque. |
| <span id="e-path-traversal"></span>`E_PATH_TRAVERSAL` | 400 | Le serveur natif a trouvé `..` dans le chemin, brut ou encodé en pourcentage. |
| <span id="e-parameter-pollution"></span>`E_PARAMETER_POLLUTION` | 400 | Le serveur natif a trouvé deux fois la même clé dans la query string. |
| <span id="e-too-many-requests"></span>`E_TOO_MANY_REQUESTS` | 429 | La limite de débit du serveur natif a refusé la requête ; le corps porte `retryAfter`, avec les headers `Retry-After` et `X-RateLimit-*`. |
| <span id="e-stream-unknown"></span>`E_STREAM_UNKNOWN` | 500 | Un identifiant de flux server-sent events est inconnu du serveur. |

## Erreurs Session

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-session-not-ready"></span>`E_SESSION_NOT_READY` | 500 | `session.<method>()` exige un store de session, et cette session a été construite sans. |
| <span id="e-session-store-not-configured"></span>`E_SESSION_STORE_NOT_CONFIGURED` | 500 | La configuration de session ne nomme aucun store. Fixez `store`, ou `store: 'memory'` pour des sessions gardées dans ce seul processus. |
| <span id="e-session-store-not-conditional"></span>`E_SESSION_STORE_NOT_CONDITIONAL` | 500 | Le store n'a pas d'`update()` : il ne peut pas réécrire une session seulement tant qu'elle existe, et une requête qui chevauche une déconnexion pourrait reconnecter l'utilisateur. |
| <span id="e-session-tagging-not-supported"></span>`E_SESSION_TAGGING_NOT_SUPPORTED` | 500 | Une méthode d'étiquetage de session a été appelée sur un store qui ne la prend pas en charge. Utilisez le store memory, redis ou database. |
| <span id="e-session-cookie-not-http-only"></span>`E_SESSION_COOKIE_NOT_HTTP_ONLY` | 500 | Le cookie de session est configuré avec `httpOnly: false`. Retirez-le : un script capable de lire le cookie change toute XSS en prise de compte. |
| <span id="e-session-template-engine-unusable"></span>`E_SESSION_TEMPLATE_ENGINE_UNUSABLE` | — | Le moteur de templates est installé mais les tags de session ne peuvent pas y être enregistrés. |

## Erreurs Application

Levées pendant l'assemblage, la configuration et le démarrage de l'application.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-env-variables"></span>`E_INVALID_ENV_VARIABLES` | — | `Env.create()` a trouvé des variables d'environnement qui ne respectent pas leur schéma. Le message les liste une par une. |
| <span id="e-missing-app-key"></span>`E_MISSING_APP_KEY` | — | Le chiffrement a été utilisé et `APP_KEY` n'est pas défini (au moins 16 caractères). |
| <span id="e-insecure-app-key"></span>`E_INSECURE_APP_KEY` | — | `APP_KEY` n'est pas utilisable pour signer : trop court, ou une clé connue de la génération de projet ou de la documentation. |
| <span id="e-reamrc-unknown-option"></span>`E_REAMRC_UNKNOWN_OPTION` | — | `tests` dans `reamrc.ts` contient une option qui n'existe pas. |
| <span id="e-ignitor-already-started"></span>`E_IGNITOR_ALREADY_STARTED` | — | `warmUp()` a été appelé alors que l'application avait déjà dépassé cette phase. |
| <span id="e-ignitor-warmup-only"></span>`E_IGNITOR_WARMUP_ONLY` | — | Une application assemblée par `warmUp()` a été démarrée. Construisez un nouvel Ignitor pour en lancer une. |
| <span id="e-ignitor-invalid-port"></span>`E_IGNITOR_INVALID_PORT` | — | `PORT` n'est pas un entier entre 0 et 65535. |
| <span id="e-ignitor-invalid-http-config"></span>`E_IGNITOR_INVALID_HTTP_CONFIG` | — | Une limite `http.<clé>` n'est pas un nombre entier dans les bornes. |
| <span id="e-ignitor-no-server-factory"></span>`E_IGNITOR_NO_SERVER_FACTORY` | — | `httpServer()` a été appelé sans `serverFactory` dans la configuration. |
| <span id="e-ignitor-grpc-unsupported"></span>`E_IGNITOR_GRPC_UNSUPPORTED` | — | Un handler gRPC est enregistré, mais ce serveur ne sait pas servir gRPC. |
| <span id="e-server-grpc-already-set"></span>`E_SERVER_GRPC_ALREADY_SET` | — | Un second handler gRPC a été enregistré sur le serveur. |
| <span id="e-server-grpc-invalid-limit"></span>`E_SERVER_GRPC_INVALID_LIMIT` | — | Une limite de taille de message gRPC n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| <span id="e-ream-stub-syntax"></span>`E_REAM_STUB_SYNTAX` | — | Un template de stub a une erreur de syntaxe. |
| <span id="e-env-file-not-found"></span>`E_ENV_FILE_NOT_FOUND` | — | Une valeur `.env` `file:<chemin>` désigne un fichier qui n'existe pas. Le message nomme la variable et le chemin. |
| <span id="e-env-circular-reference"></span>`E_ENV_CIRCULAR_REFERENCE` | — | Des valeurs `.env` se citent en boucle (`A=$B`, `B=$A`). |
| <span id="e-identifier-already-defined"></span>`E_IDENTIFIER_ALREADY_DEFINED` | — | `Env.defineIdentifier()` a reçu un nom déjà enregistré (`file` est fourni). Utilisez `defineIdentifierIfMissing()` ou retirez d'abord l'identifiant. |
| <span id="e-app-missing-importer"></span>`E_APP_MISSING_IMPORTER` | — | `app.import()` / `app.importDefault(id)` a été appelé sur une application construite sans `importer`. |
| <span id="e-dump-die-exception"></span>`E_DUMP_DIE_EXCEPTION` | 500 | `dd()` a arrêté la requête (réponse avec un dump HTML) ou la commande (dump affiché). Jamais rapporté. |

## Erreurs Console

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-console-command-not-found"></span>`E_CONSOLE_COMMAND_NOT_FOUND` | — | Aucune commande ne porte ce nom. |
| <span id="e-console-missing-argument"></span>`E_CONSOLE_MISSING_ARGUMENT` | — | Un argument obligatoire n'a pas été donné. |
| <span id="e-console-missing-argument-value"></span>`E_CONSOLE_MISSING_ARGUMENT_VALUE` | — | Un argument a été donné sans valeur. |
| <span id="e-console-unexpected-argument"></span>`E_CONSOLE_UNEXPECTED_ARGUMENT` | — | Plus d'arguments que la commande n'en déclare. |
| <span id="e-console-unknown-flag"></span>`E_CONSOLE_UNKNOWN_FLAG` | — | Un flag que la commande ne déclare pas. |
| <span id="e-console-missing-flag"></span>`E_CONSOLE_MISSING_FLAG` | — | Un flag obligatoire n'a pas été donné. |
| <span id="e-console-missing-flag-value"></span>`E_CONSOLE_MISSING_FLAG_VALUE` | — | Un flag qui attend une valeur a été donné sans. |
| <span id="e-console-invalid-flag-value"></span>`E_CONSOLE_INVALID_FLAG_VALUE` | — | Une valeur de flag du mauvais type. |
| <span id="e-console-invalid-flag-group"></span>`E_CONSOLE_INVALID_FLAG_GROUP` | — | Des flags courts ont été groupés (`-abc`) avec un flag qui ne peut pas l'être. |
| <span id="e-console-not-interactive"></span>`E_CONSOLE_NOT_INTERACTIVE` | — | Une commande a posé une question alors que stdin n'est pas interactif. Passez la valeur en flag. |
| <span id="e-console-prompt-cancelled"></span>`E_CONSOLE_PROMPT_CANCELLED` | — | L'utilisateur a annulé une question. |
| <span id="e-console-empty-choices"></span>`E_CONSOLE_EMPTY_CHOICES` | — | Une question à choix a été posée sans aucune option. |
| <span id="e-console-invalid-trap-value"></span>`E_CONSOLE_INVALID_TRAP_VALUE` | — | Une réponse scriptée (un piège de question en test) a été rejetée par la validation de la question. |
| <span id="e-console-trap-out-of-range"></span>`E_CONSOLE_TRAP_OUT_OF_RANGE` | — | Un piège de question a choisi une option qui n'était pas proposée. |
| <span id="e-console-duplicate-command"></span>`E_CONSOLE_DUPLICATE_COMMAND` | — | Deux commandes revendiquent le même nom. |
| <span id="e-console-invalid-command"></span>`E_CONSOLE_INVALID_COMMAND` | — | Une entrée de `commands` dans `reamrc.ts` n'est ni un chargeur de commandes ni une classe de commande exportée par défaut. |
| <span id="e-console-invalid-command-metadata"></span>`E_CONSOLE_INVALID_COMMAND_METADATA` | — | Un chargeur de commandes a exporté des métadonnées qui ne décrivent pas une commande. |
| <span id="e-console-invalid-argument"></span>`E_CONSOLE_INVALID_ARGUMENT` | — | Une commande déclare ses arguments dans un ordre impossible à analyser : un argument après un argument spread, ou un obligatoire après un optionnel. |
| <span id="e-console-invalid-alias"></span>`E_CONSOLE_INVALID_ALIAS` | — | Un alias de commande ne se développe en rien. |
| <span id="e-console-late-global-flag"></span>`E_CONSOLE_LATE_GLOBAL_FLAG` | — | Un flag global a été déclaré après le démarrage du kernel. |
| <span id="e-console-late-loader"></span>`E_CONSOLE_LATE_LOADER` | — | Un chargeur de commandes a été ajouté après le démarrage du kernel. |
| <span id="e-console-kernel-running"></span>`E_CONSOLE_KERNEL_RUNNING` | — | Une commande tourne déjà dans ce kernel. |
| <span id="e-console-kernel-completed"></span>`E_CONSOLE_KERNEL_COMPLETED` | — | Le kernel a terminé ; il ne peut pas exécuter une autre ligne de commande. |
| <span id="e-console-not-booted"></span>`E_CONSOLE_NOT_BOOTED` | — | Une méthode de l'application console a été appelée avant le chargement des commandes. |
| <span id="e-console-no-app"></span>`E_CONSOLE_NO_APP` | — | Une commande a besoin de l'application et le kernel n'en a pas. Passez par le kernel console de l'Ignitor. |
| <span id="e-console-app-not-started"></span>`E_CONSOLE_APP_NOT_STARTED` | — | Une commande a utilisé l'application sans déclarer `startApp: true` dans ses options. |

## Erreurs Scheduler

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-schedule-invalid-cron"></span>`E_SCHEDULE_INVALID_CRON` | — | L'expression cron d'une tâche planifiée n'a pas pu être enregistrée. |
| <span id="e-schedule-invalid-target"></span>`E_SCHEDULE_INVALID_TARGET` | — | `@Schedule` a été posé sur une méthode statique. |
| <span id="e-schedule-symbol-method"></span>`E_SCHEDULE_SYMBOL_METHOD` | — | `@Schedule` a été posé sur une méthode à clé symbole. |
| <span id="e-schedule-anonymous-class"></span>`E_SCHEDULE_ANONYMOUS_CLASS` | — | Une classe anonyme déclare `@Schedule` ; ses noms de tâches entreraient en collision. |
| <span id="e-schedule-method-not-found"></span>`E_SCHEDULE_METHOD_NOT_FOUND` | — | Une méthode planifiée n'est pas appelable sur l'instance résolue par le conteneur. |
| <span id="e-schedule-invalid-callback"></span>`E_SCHEDULE_INVALID_CALLBACK` | — | `Scheduler.register()` a reçu autre chose qu'une fonction. |
| <span id="e-schedule-invalid-task-name"></span>`E_SCHEDULE_INVALID_TASK_NAME` | — | `Scheduler.register()` a reçu un nom de tâche vide. |
| <span id="e-schedule-invalid-lock-backend"></span>`E_SCHEDULE_INVALID_LOCK_BACKEND` | — | `lockBackend` n'implémente pas `acquire(name, ttlMs)` et `release(name)`. |
| <span id="e-schedule-invalid-lock-ttl"></span>`E_SCHEDULE_INVALID_LOCK_TTL` | — | `defaultLockTtlMs` n'est pas un nombre fini et positif. |
| <span id="e-schedule-invalid-event-sink"></span>`E_SCHEDULE_INVALID_EVENT_SINK` | — | `eventSink` n'implémente pas `emit(event)`. |
| <span id="e-schedule-invalid-error-reporter"></span>`E_SCHEDULE_INVALID_ERROR_REPORTER` | — | `errorReporter` n'est pas une fonction. |
| <span id="e-schedule-task-unknown"></span>`E_SCHEDULE_TASK_UNKNOWN` | — | `runTaskNow()` a nommé une tâche non enregistrée. |
| <span id="e-schedule-task-timeout"></span>`E_SCHEDULE_TASK_TIMEOUT` | — | Une tâche n'a pas fini dans son `timeoutMs` ; elle continue en arrière-plan. |
| <span id="e-schedule-provider-already-registered"></span>`E_SCHEDULE_PROVIDER_ALREADY_REGISTERED` | — | Le provider du scheduler a été enregistré deux fois sur le même conteneur. |
| <span id="e-scheduler-native-error"></span>`E_SCHEDULER_NATIVE_ERROR` | — | Un appel au scheduler natif a échoué. |

## Erreurs Events

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-events-unsupported-store"></span>`E_EVENTS_UNSUPPORTED_STORE` | — | `config/events.ts` nomme un `store` autre que `'memory'`, le seul de ce build. |
| <span id="e-events-unsupported-option"></span>`E_EVENTS_UNSUPPORTED_OPTION` | — | `config/events.ts` contient une option que rien ne lit (`retries` compris), ou n'est pas un objet. |

## Erreurs RPC et GraphQL

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-rpc-invalid-method-name"></span>`E_RPC_INVALID_METHOD_NAME` | — | Un nom de méthode RPC est vide ou n'est pas une chaîne. |
| <span id="e-rpc-reserved-method-name"></span>`E_RPC_RESERVED_METHOD_NAME` | — | Une méthode RPC prend un nom réservé (`rpc.*`). |
| <span id="e-rpc-unknown-controller-method"></span>`E_RPC_UNKNOWN_CONTROLLER_METHOD` | — | Une route RPC nomme une méthode de contrôleur qui n'existe pas. |
| <span id="e-rpc-provider-already-registered"></span>`E_RPC_PROVIDER_ALREADY_REGISTERED` | — | Le provider RPC a été enregistré deux fois sur le même conteneur. |
| <span id="e-graphql-provider-already-registered"></span>`E_GRAPHQL_PROVIDER_ALREADY_REGISTERED` | — | Le provider GraphQL a été enregistré deux fois sur le même conteneur. |

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
| <span id="e-archive-access-denied"></span>`E_ARCHIVE_ACCESS_DENIED` | 403 | Une requête non signée a demandé un fichier privé. |
| <span id="e-archive-invalid-key"></span>`E_ARCHIVE_INVALID_KEY` | 403 | La route signée a refusé le chemin : une clé avec une remontée de répertoire ou des caractères interdits. |
| <span id="e-archive-not-found"></span>`E_ARCHIVE_NOT_FOUND` | 404 | Aucun fichier n'est stocké sous cette clé. La route signée répond 404 ; un appel au driver la lève. |
| <span id="e-archive-path-traversal-detected"></span>`E_ARCHIVE_PATH_TRAVERSAL_DETECTED` | — | Une clé se résout hors de la racine du disque. |
| <span id="e-archive-unallowed-characters"></span>`E_ARCHIVE_UNALLOWED_CHARACTERS` | — | Une clé contient des caractères qu'une clé ne peut pas contenir. |
| <span id="e-archive-invalid-expiry"></span>`E_ARCHIVE_INVALID_EXPIRY` | — | Une expiration d'URL signée n'est pas une durée positive (un nombre de secondes ou une chaîne comme `'30mins'`). |
| <span id="e-archive-signing-disabled"></span>`E_ARCHIVE_SIGNING_DISABLED` | — | `getSignedUrl()` a été appelé sur un disque local construit sans `signingSecret`. |
| <span id="e-archive-weak-signing-secret"></span>`E_ARCHIVE_WEAK_SIGNING_SECRET` | — | Le `signingSecret` du disque local fait moins de 16 caractères. |
| <span id="e-archive-signed-upload-unsupported"></span>`E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED` | — | Le disque local n'a pas d'URL d'envoi présignée ; seuls les disques cloud en ont. |
| <span id="e-archive-invalid-header-value"></span>`E_ARCHIVE_INVALID_HEADER_VALUE` | — | Une valeur à signer comme header de réponse contient un caractère de contrôle. |
| <span id="e-archive-invalid-route-base-path"></span>`E_ARCHIVE_INVALID_ROUTE_BASE_PATH` | — | Le `routeBasePath` du disque local n'est pas un chemin d'URL absolu comme `/storage`. |
| <span id="e-archive-prefix-mismatch"></span>`E_ARCHIVE_PREFIX_MISMATCH` | — | `createSignedRouteHandler()` a reçu un préfixe différent du `routeBasePath` du disque : aucune URL signée ne l'atteindrait. |
| <span id="e-archive-visibility-corrupt"></span>`E_ARCHIVE_VISIBILITY_CORRUPT` | — | L'enregistrement de visibilité d'un fichier est illisible ; archive refuse de traiter le fichier comme public. |
| <span id="e-archive-visibility-move-failed"></span>`E_ARCHIVE_VISIBILITY_MOVE_FAILED` | — | `move()` a déplacé le fichier mais n'a pas pu écrire sa visibilité à la cible. |
| <span id="e-archive-invalid-move-options"></span>`E_ARCHIVE_INVALID_MOVE_OPTIONS` | — | `moveToDisk()` a reçu des options inutilisables. |
| <span id="e-archive-multipart-not-macroable"></span>`E_ARCHIVE_MULTIPART_NOT_MACROABLE` | — | Le `@c9up/ream` installé n'a pas de `MultipartFile` macroable : les fichiers envoyés ne peuvent pas recevoir `moveToDisk()`. |
| <span id="e-archive-request-timeout"></span>`E_ARCHIVE_REQUEST_TIMEOUT` | — | Le fournisseur de stockage n'a pas répondu, ou s'est figé pendant la lecture du corps, dans le délai d'inactivité. |
| <span id="e-archive-unexpected-response"></span>`E_ARCHIVE_UNEXPECTED_RESPONSE` | — | Le fournisseur de stockage a répondu quelque chose qu'archive ne peut pas utiliser. |
| <span id="e-archive-unknown-disk"></span>`E_ARCHIVE_UNKNOWN_DISK` | — | Un nom de disque, ou le disque par défaut, n'est pas dans la configuration. |
| <span id="e-archive-invalid-driver"></span>`E_ARCHIVE_INVALID_DRIVER` | — | `config.driver` n'est ni `'local'`, ni `'s3'`, ni `'gcs'`. |
| <span id="e-archive-config-missing"></span>`E_ARCHIVE_CONFIG_MISSING` | — | Le driver est `s3` ou `gcs` et sa section de configuration manque. |
| <span id="e-archive-provider-not-registered"></span>`E_ARCHIVE_PROVIDER_NOT_REGISTERED` | — | `ArchiveProvider.boot()` a tourné avant `register()`. |
| <span id="e-archive-template-engine"></span>`E_ARCHIVE_TEMPLATE_ENGINE` | — | L'application rend avec inker, mais les helpers de template ne peuvent pas y être publiés. |

## Erreurs Atlas

Atlas normalise ses codes : un code qui commence déjà par `E_` est gardé, tout
autre reçoit le préfixe `E_ATLAS_`. Voir [Gestion des erreurs Atlas](/fr/guides/database/orm/error-handling)
pour les sous-classes typées. Les refus du compilateur de requêtes sont des `Error`
simples dont le message commence par le code.

| Code | HTTP | Description |
|------|------|-------------|
| `E_ROW_NOT_FOUND` | 404 | Une requête qui doit rendre une ligne n'en a trouvé aucune : `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| <span id="e-mass-assignment"></span>`E_MASS_ASSIGNMENT` | — | `fill()` / `merge()` (et `create`, `createMany`, `updateOrCreate`) ont affecté un attribut hors de `fillable`, ou listé dans `guarded`. |
| <span id="e-extra-properties"></span>`E_EXTRA_PROPERTIES` | — | Un remplissage a nommé une propriété qui n'est pas une colonne déclarée. |
| <span id="e-unknown-column"></span>`E_UNKNOWN_COLUMN` | — | Une valeur a été affectée à une clé qui n'est pas une colonne. Passez `{ allowExtraProperties: true }` pour garder les clés inconnues dans `$extras`. |
| <span id="e-invalid-column"></span>`E_INVALID_COLUMN` | — | Une requête nomme une colonne que l'entité ne déclare pas. |
| <span id="e-invalid-find-value"></span>`E_INVALID_FIND_VALUE` | — | `find()` a été appelé sans valeur de clé primaire utilisable. |
| <span id="e-model-not-persisted"></span>`E_MODEL_NOT_PERSISTED` | — | Une opération qui exige une ligne stockée (`delete()`, `refresh()`, `load*()`…) a tourné sur une instance locale. |
| <span id="e-missing-primary-key"></span>`E_MISSING_PRIMARY_KEY` | — | La même opération a tourné sur une projection persistée qui ne contient pas la clé primaire. |
| <span id="e-model-deleted"></span>`E_MODEL_DELETED` | — | `save()` a été appelé sur une instance supprimée. |
| <span id="e-missing-owner-key"></span>`E_MISSING_OWNER_KEY` | — | `associate()` a reçu un parent dont la clé n'est pas renseignée. |
| <span id="e-relation-not-loaded"></span>`E_RELATION_NOT_LOADED` | — | Une relation a été lue avant d'être chargée. Appelez `.preload()` sur la requête ou `.load()` sur l'instance. |
| <span id="e-optimistic-lock"></span>`E_OPTIMISTIC_LOCK` | — | Une sauvegarde a perdu un verrou optimiste : une autre transaction a modifié la ligne depuis sa lecture. |
| <span id="e-strict-mode"></span>`E_STRICT_MODE` | — | SQL brut refusé par le mode strict (le `raw()` d'un repository, ou une valeur `db.raw()` écrite par un repository). |
| <span id="e-no-interactive-transaction"></span>`E_NO_INTERACTIVE_TRANSACTION` | — | La connexion n'a pas de `transaction()` interactive (transaction de modèle, ou `useTransaction()` en test). |
| <span id="e-array-param"></span>`E_ARRAY_PARAM` | — | Une liste a été liée à un seul paramètre. Développez-la en un paramètre par élément. |
| <span id="e-atlas-missing-connection"></span>`E_ATLAS_MISSING_CONNECTION` | — | Un modèle ou un repository nomme une connexion non configurée. |
| <span id="e-atlas-empty-select"></span>`E_ATLAS_EMPTY_SELECT` | — | `select()` a été appelé sans colonnes. Fournissez au moins un nom de colonne. |
| <span id="e-atlas-invalid-page"></span>`E_ATLAS_INVALID_PAGE` | — | `paginate()` a été appelé avec `page < 1`. |
| <span id="e-atlas-invalid-per-page"></span>`E_ATLAS_INVALID_PER_PAGE` | — | `paginate()` a été appelé avec `perPage < 1`. |
| <span id="e-atlas-invalid-pagination"></span>`E_ATLAS_INVALID_PAGINATION` | — | Une page, une taille de page ou un nombre de lignes qui n'est pas un entier fini et positif ou nul. |
| <span id="e-atlas-invalid-cte-name"></span>`E_ATLAS_INVALID_CTE_NAME` | — | Un nom de CTE doit être un identifiant valide (lettres, chiffres, underscores). |
| <span id="e-atlas-invalid-operator"></span>`E_ATLAS_INVALID_OPERATOR` | — | Un opérateur de `where()` ou `wherePivot()` hors de la liste autorisée. |
| <span id="e-atlas-invalid-increment"></span>`E_ATLAS_INVALID_INCREMENT` | — | `increment()` / `decrement()` a reçu une quantité qui n'est pas un nombre fini. |
| <span id="e-atlas-invalid-date-column-value"></span>`E_ATLAS_INVALID_DATE_COLUMN_VALUE` | — | Une colonne de date a reçu une valeur qui n'est pas une date valide. |
| <span id="e-atlas-undefined-binding"></span>`E_ATLAS_UNDEFINED_BINDING` | — | Une valeur de requête vaut `undefined`. Validez l'entrée avant ; utilisez `whereNull()` pour chercher NULL. |
| <span id="e-atlas-dialect-mismatch"></span>`E_ATLAS_DIALECT_MISMATCH` | — | `useTransaction(trx)` a reçu une transaction d'un autre dialecte que celui pour lequel la requête a été construite. Ouvrez la transaction sur la connexion de la requête, ou construisez la requête depuis la transaction. |
| <span id="e-atlas-raw-bindings"></span>`E_ATLAS_RAW_BINDINGS` | — | Une requête brute a des paramètres sans valeur liée. |
| <span id="e-atlas-raw-value"></span>`E_ATLAS_RAW_VALUE` | — | `defaultTo(db.raw())` a reçu des valeurs liées, qu'un défaut de colonne ne peut pas porter. |
| <span id="e-atlas-non-finite-number"></span>`E_ATLAS_NON_FINITE_NUMBER` | — | `defaultTo()` a reçu un nombre qui n'est pas un nombre SQL (`NaN`, `Infinity`). |
| <span id="e-atlas-factory-faker-missing"></span>`E_ATLAS_FACTORY_FAKER_MISSING` | — | Une factory utilise faker, dépendance pair optionnelle d'atlas, non installée. |
| <span id="e-atlas-napi-not-found"></span>`E_ATLAS_NAPI_NOT_FOUND` | — | Le compilateur de requêtes Rust n'est pas chargé. Une `Error` simple dont le message commence par le code. Voir [Dépannage](/fr/guides/database/orm/troubleshooting). |
| <span id="e-atlas-insecure-sslmode"></span>`E_ATLAS_INSECURE_SSLMODE` | — | La connexion demande `sslmode=prefer` ou `allow` (URL ou `PGSSLMODE`), qui repassent en clair sans le dire. Utilisez `disable` ou `verify-full`. Voir [Connexions chiffrées](/fr/guides/database/orm/connections#connexions-chiffrees-tls). |
| <span id="e-atlas-listen-unsupported"></span>`E_ATLAS_LISTEN_UNSUPPORTED` | — | LISTEN / NOTIFY a été utilisé sur une connexion qui n'est pas PostgreSQL. |
| <span id="e-atlas-listen-connect"></span>`E_ATLAS_LISTEN_CONNECT` | — | Le listener n'a pas pu ouvrir sa propre connexion PostgreSQL. |
| <span id="e-atlas-listen-connection"></span>`E_ATLAS_LISTEN_CONNECTION` | — | La connexion du listener a échoué ; chaque abonnement en est informé. |
| <span id="e-atlas-listen-channel"></span>`E_ATLAS_LISTEN_CHANNEL` | — | Un nom de canal LISTEN est vide, dépasse 63 octets, ou contient un NUL. |
| <span id="e-atlas-listen-closed"></span>`E_ATLAS_LISTEN_CLOSED` | — | Le listener a été fermé pendant qu'une demande était en cours. |
| <span id="e-atlas-listen-event"></span>`E_ATLAS_LISTEN_EVENT` | — | Le listener natif a signalé un événement qu'atlas ne définit pas. |
| <span id="e-atlas-migration-invalid-table-name"></span>`E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | — | `migrations.tableName` n'est pas un identifiant simple. |
| <span id="e-atlas-migration-not-found"></span>`E_ATLAS_MIGRATION_NOT_FOUND` | — | Une migration à exécuter ou à annuler n'a pas de fichier dans le répertoire de migrations. |
| <span id="e-atlas-migration-invalid"></span>`E_ATLAS_MIGRATION_INVALID` | — | Un fichier de migration n'exporte pas de classe par défaut. |
| <span id="e-atlas-migration-duplicate"></span>`E_ATLAS_MIGRATION_DUPLICATE` | — | Deux fichiers de migration partagent un nom. |
| <span id="e-atlas-migration-compile-empty"></span>`E_ATLAS_MIGRATION_COMPILE_EMPTY` | — | Une migration s'est compilée en aucune instruction SQL. |
| <span id="e-migration-locked"></span>`E_MIGRATION_LOCKED` | — | Une autre exécution tient le verrou de migration. Attendez-la, ou libérez un verrou resté bloqué avec `migration:unlock`. |
| <span id="e-rollback-disabled-in-production"></span>`E_ROLLBACK_DISABLED_IN_PRODUCTION` | — | Un rollback, reset, refresh, fresh ou wipe en production sans `--force`. |
| <span id="e-atlas-dry-run-write"></span>`E_ATLAS_DRY_RUN_WRITE` | — | Une migration a tenté d'écrire pendant un `dryRun()`. |
| <span id="e-defer-requires-transaction"></span>`E_DEFER_REQUIRES_TRANSACTION` | — | Une migration utilise `this.defer()` sur un adaptateur sans `transaction()` interactive. |
| <span id="e-mysql-fk-requires-transaction"></span>`E_MYSQL_FK_REQUIRES_TRANSACTION` | — | Suspendre les contrôles de clés étrangères MySQL exige une `transaction()` interactive pour les rétablir. |
| <span id="e-schema-dump-dialect-mismatch"></span>`E_SCHEMA_DUMP_DIALECT_MISMATCH` | — | Le dump de schéma a été fait pour un autre dialecte. |
| <span id="e-schema-dump-table-mismatch"></span>`E_SCHEMA_DUMP_TABLE_MISMATCH` | — | Le dump de schéma utilise une autre table de suivi des migrations. |
| <span id="e-seeder-dir-not-found"></span>`E_SEEDER_DIR_NOT_FOUND` | — | Le répertoire des seeders n'existe pas. |
| <span id="e-seeder-invalid"></span>`E_SEEDER_INVALID` | — | Un fichier de seeder n'exporte pas de classe de seeder. |
| <span id="e-seeder-invalid-path"></span>`E_SEEDER_INVALID_PATH` | — | Un chemin de seeder se résout hors du répertoire des seeders. |
| <span id="e-no-connection"></span>`E_NO_CONNECTION` | — | `schema.<méthode>()` exige une connexion active ; elle existe dans une migration, pas sur un `Schema` isolé. |
| <span id="e-alter-empty"></span>`E_ALTER_EMPTY` | — | `schema.alterTable()` n'a déclaré aucune opération. |
| <span id="e-alter-misuse"></span>`E_ALTER_MISUSE` | — | `.alter()` ne suit pas une définition de colonne, ou une méthode réservée à la modification a servi sur une nouvelle table. |
| <span id="e-check-empty"></span>`E_CHECK_EMPTY` | — | Une contrainte check (ou `checkBetween`) n'a reçu aucune valeur ni intervalle. |
| <span id="e-check-range"></span>`E_CHECK_RANGE` | — | `checkBetween` a reçu un intervalle qui n'est pas `[min, max]`. |
| <span id="e-constraint-empty"></span>`E_CONSTRAINT_EMPTY` | — | Une contrainte ne liste aucune colonne. |
| <span id="e-enum-empty"></span>`E_ENUM_EMPTY` | — | Une colonne enum ne déclare aucune valeur. |
| <span id="e-empty-view-select"></span>`E_EMPTY_VIEW_SELECT` | — | Une vue n'a pas de SELECT, ou une vue matérialisée a été demandée à un dialecte qui n'en a pas. |
| <span id="e-specific-type-empty"></span>`E_SPECIFIC_TYPE_EMPTY` | — | `specificType()` a reçu un type vide. |
| <span id="e-sqlite-decimal-precision"></span>`E_SQLITE_DECIMAL_PRECISION` | — | Une précision décimale que SQLite ne peut pas stocker exactement. |
| <span id="e-unsupported"></span>`E_UNSUPPORTED` | — | Une fonctionnalité SQL que le dialecte de la connexion n'a pas (`DISTINCT ON` hors Postgres, variantes `ALL` sur SQLite…). |
| <span id="e-unsafe-identifier"></span>`E_UNSAFE_IDENTIFIER` | — | Le compilateur Rust a refusé un identifiant. |
| <span id="e-unsafe-sql"></span>`E_UNSAFE_SQL` | — | Le compilateur Rust a refusé un fragment SQL. |
| <span id="e-unsafe-expression"></span>`E_UNSAFE_EXPRESSION` | — | Le compilateur Rust a refusé une expression. |
| <span id="e-unsafe-literal"></span>`E_UNSAFE_LITERAL` | — | Le compilateur Rust a refusé une valeur littérale. |
| <span id="e-injection-pattern"></span>`E_INJECTION_PATTERN` | — | Le compilateur Rust a refusé une entrée qui ressemble à une tentative d'injection. |

## Erreurs Aurora

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-aurora-illegal-page-name"></span>`E_AURORA_ILLEGAL_PAGE_NAME` | — | Un nom de page contient des caractères interdits. |
| <span id="e-aurora-page-outside-root"></span>`E_AURORA_PAGE_OUTSIDE_ROOT` | — | Le chemin de page résolu tombe hors de la racine des pages configurée. |
| <span id="e-aurora-page-not-found"></span>`E_AURORA_PAGE_NOT_FOUND` | — | Aucun fichier pour ce nom de page. |
| <span id="e-aurora-page-import-failed"></span>`E_AURORA_PAGE_IMPORT_FAILED` | — | La page est sur le disque et son graphe de modules refuse de se charger. |
| <span id="e-aurora-page-invalid-export"></span>`E_AURORA_PAGE_INVALID_EXPORT` | — | Le module de page s'est chargé mais n'exporte pas de factory par défaut. |
| <span id="e-aurora-illegal-root-tag"></span>`E_AURORA_ILLEGAL_ROOT_TAG` | — | `renderPage` a reçu une balise racine qui n'est pas un simple nom d'élément. |
| <span id="e-aurora-outside-component"></span>`E_AURORA_OUTSIDE_COMPONENT` | — | `onMount` / `onUnmount` a été appelé hors de la fonction de setup d'un `component()`. |
| <span id="e-aurora-missing-context"></span>`E_AURORA_MISSING_CONTEXT` | — | `inject` n'a trouvé aucun fournisseur pour le contexte, et il ne déclare pas de défaut. |
| <span id="e-aurora-not-booted"></span>`E_AURORA_NOT_BOOTED` | — | Le singleton du manager a été lu avant qu'un provider ou `setAurora` ne le fixe. |
| <span id="e-aurora-unknown-route"></span>`E_AURORA_UNKNOWN_ROUTE` | — | `urlFor` a reçu un nom absent du manifeste de routes. |
| <span id="e-aurora-missing-route-params"></span>`E_AURORA_MISSING_ROUTE_PARAMS` | — | `urlFor` a reçu une route dont les paramètres obligatoires ne sont pas tous fournis. |
| <span id="e-aurora-unknown-live-component"></span>`E_AURORA_UNKNOWN_LIVE_COMPONENT` | — | Un composant live a été monté avant que `registry.define()` ne le nomme. |
| <span id="e-aurora-live-session-limit"></span>`E_AURORA_LIVE_SESSION_LIMIT` | — | Une session live a été refusée : le registre tient déjà `maxSessions`. |
| <span id="e-aurora-relay-request-failed"></span>`E_AURORA_RELAY_REQUEST_FAILED` | — | Une requête relay est revenue avec un statut hors 2xx. |
| <span id="e-aurora-unsafe-url"></span>`E_AURORA_UNSAFE_URL` | — | Une URL de navigation a échoué au contrôle de même origine / de schéma. |
| <span id="e-aurora-slot-in-tag-name"></span>`E_AURORA_SLOT_IN_TAG_NAME` | — | Un `${}` est tombé à la place d'un nom de balise. |
| <span id="e-aurora-slot-in-attribute-name"></span>`E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | — | Un `${}` est tombé à la place d'un nom d'attribut. |
| <span id="e-aurora-slot-in-raw-text"></span>`E_AURORA_SLOT_IN_RAW_TEXT` | — | Un `${}` est tombé dans `<script>`, `<style>`, `<textarea>`, `<title>`… |
| <span id="e-aurora-slot-in-comment"></span>`E_AURORA_SLOT_IN_COMMENT` | — | Un `${}` est tombé dans un commentaire, un `<!…>` / `<?…>` ou une section CDATA. |
| <span id="e-aurora-slot-in-event-attribute"></span>`E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | — | Un `${}` est tombé dans un attribut `on*`, dont la valeur est du JavaScript. |
| <span id="e-aurora-slot-in-srcdoc"></span>`E_AURORA_SLOT_IN_SRCDOC` | — | Un `${}` est tombé dans `srcdoc`, qu'une iframe analyse comme un document entier. |
| <span id="e-aurora-slot-in-base-url"></span>`E_AURORA_SLOT_IN_BASE_URL` | — | Un `${}` est tombé dans `<base href>`, qui rebase toutes les URL de la page. |
| <span id="e-aurora-slot-in-script-source"></span>`E_AURORA_SLOT_IN_SCRIPT_SOURCE` | — | Un `${}` est tombé dans l'URL d'où un `<script>` charge son code. |
| <span id="e-aurora-slot-in-html-property"></span>`E_AURORA_SLOT_IN_HTML_PROPERTY` | — | Une liaison `.prop` nomme une propriété qui analyse sa valeur comme du HTML. |
| <span id="e-aurora-template-in-attribute"></span>`E_AURORA_TEMPLATE_IN_ATTRIBUTE` | — | Un template `html` imbriqué a atteint une valeur d'attribut ou `.value`. |
| <span id="e-aurora-file-input-value"></span>`E_AURORA_FILE_INPUT_VALUE` | — | `.value` a reçu une chaîne non vide sur un `<input type="file">`. |
| <span id="e-aurora-duplicate-key"></span>`E_AURORA_DUPLICATE_KEY` | — | Deux éléments d'une liste `each()` partagent une clé, qui désigne une seule ligne. |
| <span id="e-aurora-invalid-lazy"></span>`E_AURORA_INVALID_LAZY` | — | `each(…, { lazy })` a reçu un `estimate` qui n'est pas une longueur positive, ou un `overscan` négatif ou non numérique. |
| <span id="e-aurora-visits-need-photon"></span>`E_AURORA_VISITS_NEED_PHOTON` | — | `visits` est activé mais `@c9up/photon` n'est pas installé, ou trop ancien (le protocole pour aurora est là depuis 0.1.25). |
| <span id="e-aurora-visit-props"></span>`E_AURORA_VISIT_PROPS` | — | Avec `visits`, les props d'une page (props partagées comprises) n'étaient pas un objet, comme le `page.props` du protocole l'exige. |
| <span id="e-aurora-invalid-motion"></span>`E_AURORA_INVALID_MOTION` | — | `motion=${…}` n'était pas un objet de valeurs animées, ou nommait une propriété que l'animation ne pilote pas (rotation, couleur). |
| <span id="e-aurora-reactive-cycle"></span>`E_AURORA_REACTIVE_CYCLE` | — | Des effets se sont relancés sans fin au cours d'une même mise à jour : l'un écrit ce que lui-même, ou un effet qu'il déclenche, lit. |
| <span id="e-aurora-internal"></span>`E_AURORA_INTERNAL` | — | Un invariant interne d'aurora a cassé : toujours un bug d'aurora. |

## Erreurs Blackhole

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-blackhole-rate-limited"></span>`E_BLACKHOLE_RATE_LIMITED` | 429 | Trop de requêtes de ce client, avec `Retry-After`. Attendez et réessayez. |
| `E_TOO_MANY_REQUESTS` | 429 | Un middleware de throttle ou `limiter.consume()` a trouvé la clé au-delà de son budget. |
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

## Erreurs Chronos

Levées comme de simples `Error` (`RangeError` pour une année refusée avant le moteur) dont le message commence par `CODE:`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-chronos-invalid-year"></span>`E_CHRONOS_INVALID_YEAR` | — | `easterDate` / `holidays` ont reçu une année qui n'est pas un entier de 1583 à 9999 (le comput grégorien). |
| <span id="e-chronos-unknown-country"></span>`E_CHRONOS_UNKNOWN_COUNTRY` | — | `holidays` / `isHoliday` ont reçu un pays sans calendrier de jours fériés (connus : `CH`, `FR`). |
| <span id="e-chronos-unknown-region"></span>`E_CHRONOS_UNKNOWN_REGION` | — | La région n'est pas le code à deux lettres d'un canton suisse, ou une région a été donnée pour `FR`. |
| <span id="e-chronos-invalid-date"></span>`E_CHRONOS_INVALID_DATE` | — | `isHoliday` a reçu une chaîne qui n'est pas une date calendaire `YYYY-MM-DD`. |

## Erreurs Comet

Levées par le transport WebSocket (`createWebSocketTransport()`) sous forme de `RpcTransportError` : l'appel a échoué sans réponse JSON-RPC. Une erreur JSON-RPC renvoyée par le serveur garde son code numérique.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-comet-connection-failed"></span>`E_COMET_CONNECTION_FAILED` | — | Le socket n'a pas pu s'ouvrir : handshake refusé, URL invalide ou réseau. |
| <span id="e-comet-connection-closed"></span>`E_COMET_CONNECTION_CLOSED` | — | Le socket s'est fermé pendant que l'appel attendait, ou reste fermé (`reconnect: false`). |
| <span id="e-comet-transport-closed"></span>`E_COMET_TRANSPORT_CLOSED` | — | `close()` a été appelé sur le transport ; les appels suivants échouent de la même façon. |
| <span id="e-comet-timeout"></span>`E_COMET_TIMEOUT` | — | Aucune réponse dans le délai. |
| <span id="e-comet-message-too-large"></span>`E_COMET_MESSAGE_TOO_LARGE` | — | Un message au-delà de `maxMessageBytes`, envoyé ou reçu. |
| <span id="e-comet-backpressure"></span>`E_COMET_BACKPRESSURE` | — | Plus de `maxBufferedBytes` attendent déjà d'être envoyés. |
| <span id="e-comet-protocol-error"></span>`E_COMET_PROTOCOL_ERROR` | — | Le pair a envoyé ce qu'aucun serveur JSON-RPC ne répond : le socket a été fermé. |
| <span id="e-comet-invalid-message"></span>`E_COMET_INVALID_MESSAGE` | — | Le client a transmis autre chose qu'un message JSON-RPC, ou autre chose que du JSON. |

## Erreurs Echo

`E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` et `E_L2_CACHE_ERROR` gardent les identifiants que le code de cache intercepte déjà.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-factory-error"></span>`E_FACTORY_ERROR` | — | La factory de `getOrSet()` a levé une erreur ; `cause` la contient. |
| <span id="e-factory-hard-timeout"></span>`E_FACTORY_HARD_TIMEOUT` | — | La factory n'a pas fini dans son délai strict. |
| <span id="e-undefined-value"></span>`E_UNDEFINED_VALUE` | — | Une valeur `null` ou `undefined` a été écrite dans le cache. |
| <span id="e-l2-cache-error"></span>`E_L2_CACHE_ERROR` | — | Le second niveau d'un store étagé a échoué et l'échec n'est pas masqué. |
| <span id="e-echo-lock-timeout"></span>`E_ECHO_LOCK_TIMEOUT` | — | Un appelant a attendu trop longtemps la factory d'un autre appelant pour la même clé. |
| <span id="e-echo-invalid-argument"></span>`E_ECHO_INVALID_ARGUMENT` | — | Une méthode a reçu un argument inutilisable. |
| <span id="e-echo-invalid-duration"></span>`E_ECHO_INVALID_DURATION` | — | Une durée n'est ni un nombre de millisecondes ni une chaîne lisible. |
| <span id="e-echo-invalid-config"></span>`E_ECHO_INVALID_CONFIG` | — | Une valeur de configuration est illisible, comme une taille qui n'est ni des octets ni `'10mb'`. |
| <span id="e-echo-unknown-store"></span>`E_ECHO_UNKNOWN_STORE` | — | Un nom de store, ou le store par défaut, n'est pas déclaré dans `stores`. |
| <span id="e-echo-unsupported-driver"></span>`E_ECHO_UNSUPPORTED_DRIVER` | — | Le provider par défaut a reçu un driver qu'il ne construit pas. |
| <span id="e-echo-not-taggable"></span>`E_ECHO_NOT_TAGGABLE` | — | Invalidation par tag sur un driver (ou un étage) sans tags. |
| <span id="e-echo-scan-unsupported"></span>`E_ECHO_SCAN_UNSUPPORTED` | — | `flush()` sur un client Redis sans `scan()` ; `KEYS` n'est pas utilisé. |
| <span id="e-echo-unserializable-value"></span>`E_ECHO_UNSERIALIZABLE_VALUE` | — | Le driver mémoire stocke du JSON et la valeur n'a pas de forme JSON. Passez `serialize: false` pour la garder telle quelle. |
| <span id="e-echo-quasar-missing"></span>`E_ECHO_QUASAR_MISSING` | — | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| <span id="e-echo-incomplete-connection"></span>`E_ECHO_INCOMPLETE_CONNECTION` | — | La connexion quasar n'a pas ce dont echo a besoin (`publish()` / `subscribe()`). |
| <span id="e-echo-not-booted"></span>`E_ECHO_NOT_BOOTED` | — | Le singleton du cache a été utilisé avant `EchoProvider.boot()` ou `setCache()`. |

## Erreurs Eclipse

`E_LOCK_NOT_OWNED` et `E_LOCK_STORAGE_ERROR` gardent les identifiants que le code de verrou intercepte déjà.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lock-not-owned"></span>`E_LOCK_NOT_OWNED` | — | Le verrou n'est pas tenu par ce détenteur : il a expiré, ou un autre le tient. Levée quand le travail a réussi mais que le bail a expiré pendant. |
| <span id="e-lock-storage-error"></span>`E_LOCK_STORAGE_ERROR` | — | Le store de verrous a échoué en écriture, lecture ou suppression. |
| <span id="e-eclipse-invalid-ttl"></span>`E_ECLIPSE_INVALID_TTL` | — | Un TTL de verrou n'est ni un nombre fini et positif de millisecondes, ni `null`. |
| <span id="e-eclipse-invalid-duration"></span>`E_ECLIPSE_INVALID_DURATION` | — | Une chaîne de durée est illisible. |
| <span id="e-eclipse-invalid-retry"></span>`E_ECLIPSE_INVALID_RETRY` | — | Une option de `retry` est hors bornes. |
| <span id="e-eclipse-invalid-config"></span>`E_ECLIPSE_INVALID_CONFIG` | — | La configuration des verrous est invalide. |
| <span id="e-eclipse-missing-config"></span>`E_ECLIPSE_MISSING_CONFIG` | — | `config/lock.ts` manque. |
| <span id="e-eclipse-unknown-store"></span>`E_ECLIPSE_UNKNOWN_STORE` | — | Un nom de store de verrous n'est pas déclaré. |
| <span id="e-eclipse-quasar-missing"></span>`E_ECLIPSE_QUASAR_MISSING` | — | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| <span id="e-eclipse-incomplete-connection"></span>`E_ECLIPSE_INCOMPLETE_CONNECTION` | — | La connexion quasar n'a pas ce dont eclipse a besoin. |
| <span id="e-eclipse-database-unavailable"></span>`E_ECLIPSE_DATABASE_UNAVAILABLE` | — | Un store de verrous en base demande atlas, qui n'est pas installé ou n'a pas démarré. |
| <span id="e-eclipse-unsupported-database"></span>`E_ECLIPSE_UNSUPPORTED_DATABASE` | — | Un store de verrous en base a reçu un dialecte autre que PostgreSQL, MySQL ou SQLite. |

## Erreurs Eon

La plupart des refus d'eon sont des `Error` simples dont le message commence par `[CODE]` ; ceux du compilateur de requêtes commencent par `CODE:`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-eon-missing-connection"></span>`E_EON_MISSING_CONNECTION` | — | Un repository n'a pas de connexion sur laquelle tourner. |
| <span id="e-eon-not-a-supertable"></span>`E_EON_NOT_A_SUPERTABLE` | — | Une classe utilisée comme super-table n'est pas décorée avec `@SuperTable`. |
| <span id="e-eon-no-tags"></span>`E_EON_NO_TAGS` | — | Une super-table n'a pas de colonne `@Tag` : une table enfant ne peut pas être routée. |
| <span id="e-eon-no-timestamp"></span>`E_EON_NO_TIMESTAMP` | — | Une super-table n'a pas de colonne `@Timestamp`. |
| <span id="e-eon-child-stable"></span>`E_EON_CHILD_STABLE` | — | `createChildTable()` n'a reçu ni `stable` ni `EntityClass`. |
| <span id="e-eon-child-collision"></span>`E_EON_CHILD_COLLISION` | — | Deux jeux de tags distincts mènent à la même table enfant ; eon refuse d'écrire des lignes discordantes sous un seul jeu de tags. |
| <span id="e-eon-child-migration"></span>`E_EON_CHILD_MIGRATION` | — | `migrateChildTableNames()` a lu une ligne de la liste des enfants sans nom de table. |
| <span id="e-eon-batch-size"></span>`E_EON_BATCH_SIZE` | — | `batchSize` n'est pas un entier positif. |
| <span id="e-eon-bind"></span>`E_EON_BIND` | — | Une valeur ne peut pas être écrite telle quelle dans son paramètre STMT : mauvais type, ou décimal que la colonne ne peut pas tenir exactement. |
| <span id="e-eon-server-version"></span>`E_EON_SERVER_VERSION` | — | Le chemin STMT en colonnes demande TDengine 3.3.6.0 ou plus récent (stmt2). |
| <span id="e-eon-type"></span>`E_EON_TYPE` | — | Une colonne ou un tag a un type inconnu ou absent. |
| <span id="e-eon-ts-type"></span>`E_EON_TS_TYPE` | — | Un timestamp n'est ni un bigint ni un nombre entier sûr. |
| <span id="e-eon-param-precision"></span>`E_EON_PARAM_PRECISION` | — | Un timestamp numérique n'est pas un entier sûr ; passez les timestamps en nanosecondes en bigint. |
| <span id="e-eon-value-type"></span>`E_EON_VALUE_TYPE` | — | Une colonne entière a reçu autre chose qu'un entier sûr ou un bigint. |
| <span id="e-eon-value-range"></span>`E_EON_VALUE_RANGE` | — | Une valeur sort de la plage du type de sa colonne ; le connecteur la tronquerait sans le dire. |
| <span id="e-eon-template"></span>`E_EON_TEMPLATE` | — | Le compilateur n'a rendu aucune instruction pour le template d'insertion STMT. |
| <span id="e-eon-literal-insert"></span>`E_EON_LITERAL_INSERT` | — | Une insertion littérale pour une table enfant s'est compilée en autre chose qu'une seule instruction. |
| <span id="e-eon-hydrate-bigint"></span>`E_EON_HYDRATE_BIGINT` | — | Une colonne bigint ou timestamp est revenue avec une valeur non entière. |
| <span id="e-eon-decode"></span>`E_EON_DECODE` | — | Une réponse du serveur ou un bloc de résultat ne suit pas le protocole (tronqué, type inconnu, lignes sans métadonnées de colonnes) ; une trame qui ne peut plus être crue ferme la connexion. |
| <span id="e-eon-timeout"></span>`E_EON_TIMEOUT` | — | Une requête à TDengine n'a pas eu de réponse dans le délai `timeoutMs`. |
| <span id="e-eon-closed"></span>`E_EON_CLOSED` | — | La connexion TDengine s'est fermée alors qu'une requête attendait, ou une requête a été envoyée sur une connexion fermée. |
| <span id="e-eon-connect"></span>`E_EON_CONNECT` | — | Le WebSocket vers taosAdapter n'a pas pu s'ouvrir : URL invalide, connexion refusée, ou pas de handshake dans le délai. |
| <span id="e-eon-schemaless-schema"></span>`E_EON_SCHEMALESS_SCHEMA` | — | Un type de champ n'a pas de forme line-protocol. |
| <span id="e-eon-schemaless-field"></span>`E_EON_SCHEMALESS_FIELD` | — | Une valeur de champ line-protocol sort de la plage de son type. |
| <span id="e-eon-schemaless-tag"></span>`E_EON_SCHEMALESS_TAG` | — | Une valeur de tag line-protocol ne peut pas être écrite. |
| <span id="e-eon-schemaless-empty-tag"></span>`E_EON_SCHEMALESS_EMPTY_TAG` | — | Une valeur de tag line-protocol est vide. |
| <span id="e-eon-schemaless-no-fields"></span>`E_EON_SCHEMALESS_NO_FIELDS` | — | Un point line-protocol n'a aucun champ. |
| <span id="e-eon-schemaless-measurement"></span>`E_EON_SCHEMALESS_MEASUREMENT` | — | Le nom de la super-table (measurement) est vide. |
| <span id="e-eon-schemaless-control-char"></span>`E_EON_SCHEMALESS_CONTROL_CHAR` | — | Un nom ou une valeur line-protocol contient une fin de ligne ou un caractère de contrôle ; il est refusé, pas échappé. |
| <span id="e-eon-invalid-value"></span>`E_EON_INVALID_VALUE` | — | `where()` à un argument prend un callback qui remplit un groupe. |
| <span id="e-eon-empty-where-group"></span>`E_EON_EMPTY_WHERE_GROUP` | — | Un groupe `where(callback)` n'a ajouté aucun prédicat. |
| <span id="e-eon-invalid-limit"></span>`E_EON_INVALID_LIMIT` | — | `limit()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| <span id="e-eon-invalid-offset"></span>`E_EON_INVALID_OFFSET` | — | `offset()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| <span id="e-eon-compile-empty"></span>`E_EON_COMPILE_EMPTY` | — | Le compilateur n'a rendu aucune instruction SQL. |
| <span id="e-eon-unexpected-params"></span>`E_EON_UNEXPECTED_PARAMS` | — | Une requête temporelle s'est compilée avec des paramètres liés là où du SQL littéral est attendu. |
| <span id="e-eon-internal"></span>`E_EON_INTERNAL` | — | Un invariant interne d'eon a cassé : toujours un bug d'eon. |
| <span id="e-eon-alter-db-one-option"></span>`E_EON_ALTER_DB_ONE_OPTION` | — | `alterDatabase()` prend exactement une option. |
| <span id="e-eon-migration-invalid"></span>`E_EON_MIGRATION_INVALID` | — | La table de suivi des migrations contient un `executed_at` illisible. |
| <span id="e-eon-migration-locked"></span>`E_EON_MIGRATION_LOCKED` | — | Une autre exécution tient le verrou de migration. |
| <span id="e-eon-factory-state"></span>`E_EON_FACTORY_STATE` | — | Un état de factory n'est pas défini. |
| <span id="e-eon-fake-unsupported"></span>`E_EON_FAKE_UNSUPPORTED` | — | `FakeEonConnection` ne répond qu'aux SELECT simples ; le SQL fenêtré ou agrégé exige un TDengine réel. |
| <span id="e-eon-test-identifier"></span>`E_EON_TEST_IDENTIFIER` | — | Un helper de nettoyage de test a reçu un nom qui n'est pas un identifiant simple. |
| <span id="e-eon-napi-not-found"></span>`E_EON_NAPI_NOT_FOUND` | — | Le binaire du compilateur de requêtes eon est introuvable. |
| <span id="e-eon-napi-unsupported"></span>`E_EON_NAPI_UNSUPPORTED` | — | Il n'existe pas de binaire du compilateur de requêtes eon pour cette plateforme. |
| <span id="e-eon-invalid-duration"></span>`E_EON_INVALID_DURATION` | — | Une durée n'est pas un entier positif suivi d'une unité. |
| <span id="e-eon-invalid-fill"></span>`E_EON_INVALID_FILL` | — | Un mode `FILL` n'est pas connu de TDengine, ou il lui manque sa valeur. |
| <span id="e-eon-fill-requires-interval"></span>`E_EON_FILL_REQUIRES_INTERVAL` | — | `FILL` a été utilisé sans `INTERVAL`. |
| <span id="e-eon-sliding-requires-interval"></span>`E_EON_SLIDING_REQUIRES_INTERVAL` | — | `SLIDING` a été utilisé sans `INTERVAL`. |
| <span id="e-eon-offset-requires-limit"></span>`E_EON_OFFSET_REQUIRES_LIMIT` | — | `OFFSET` a été utilisé sans `LIMIT`. |
| <span id="e-eon-invalid-order-direction"></span>`E_EON_INVALID_ORDER_DIRECTION` | — | Une direction de tri n'est ni `asc` ni `desc`. |
| <span id="e-eon-invalid-pseudo-column"></span>`E_EON_INVALID_PSEUDO_COLUMN` | — | Une pseudo-colonne n'est pas de celles qu'eon autorise. |
| <span id="e-eon-invalid-select"></span>`E_EON_INVALID_SELECT` | — | Une expression de sélection ne peut pas être compilée. |
| <span id="e-eon-invalid-select-function"></span>`E_EON_INVALID_SELECT_FUNCTION` | — | Une sélection nomme une fonction qu'eon n'autorise pas. |
| <span id="e-eon-invalid-db-option"></span>`E_EON_INVALID_DB_OPTION` | — | Une valeur d'option de base est invalide. |
| <span id="e-eon-unknown-db-option"></span>`E_EON_UNKNOWN_DB_OPTION` | — | Une option de base n'est pas modifiable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| <span id="e-eon-immutable-db-option"></span>`E_EON_IMMUTABLE_DB_OPTION` | — | Une option de base est fixée au CREATE et ne peut pas être modifiée. |
| <span id="e-eon-invalid-ttl"></span>`E_EON_INVALID_TTL` | — | Le TTL d'une table enfant n'est pas un nombre entier de jours positif ou nul. |
| <span id="e-eon-invalid-wal-level"></span>`E_EON_INVALID_WAL_LEVEL` | — | Un `WAL_LEVEL` n'est pas accepté par TDengine. |
| <span id="e-eon-invalid-cachemodel"></span>`E_EON_INVALID_CACHEMODEL` | — | Un `CACHEMODEL` n'est pas accepté par TDengine. |
| <span id="e-eon-invalid-precision"></span>`E_EON_INVALID_PRECISION` | — | Une précision de base n'est ni `ms`, ni `us`, ni `ns`. |
| <span id="e-eon-keep-too-small"></span>`E_EON_KEEP_TOO_SMALL` | — | `KEEP` est inférieur à trois fois `DURATION`. |
| <span id="e-ts-required"></span>`E_TS_REQUIRED` | — | La première colonne d'une super-table n'est pas un TIMESTAMP. |
| <span id="e-tags-required"></span>`E_TAGS_REQUIRED` | — | Une super-table ne déclare aucun tag. |
| <span id="e-json-tag-rule"></span>`E_JSON_TAG_RULE` | — | JSON est réservé aux tags et doit être le seul tag. |
| <span id="e-type-not-taggable"></span>`E_TYPE_NOT_TAGGABLE` | — | Un type qui ne peut pas être un tag (DECIMAL) est utilisé comme tag. |
| <span id="e-length-required"></span>`E_LENGTH_REQUIRED` | — | Un type qui exige une longueur (`BINARY(n)`, `NCHAR(n)`…) n'en a pas reçu. |
| <span id="e-name-collision"></span>`E_NAME_COLLISION` | — | Un nom figure plusieurs fois parmi les colonnes de tags et de valeurs du template STMT. |
| <span id="e-invalid-clause-type"></span>`E_INVALID_CLAUSE_TYPE` | — | Un connecteur WHERE n'est ni `and` ni `or`. |
| <span id="e-invalid-where-group"></span>`E_INVALID_WHERE_GROUP` | — | Un groupe WHERE est vide, ou nomme aussi une colonne. |
| <span id="e-invalid-where-value"></span>`E_INVALID_WHERE_VALUE` | — | Une valeur WHERE (ou un élément de liste) n'est pas un scalaire. |
| `E_UNSAFE_IDENTIFIER` | — | Le compilateur a refusé un identifiant. |
| `E_UNSAFE_LITERAL` | — | Le compilateur a refusé une valeur littérale. |
| <span id="e-unsafe-operator"></span>`E_UNSAFE_OPERATOR` | — | Le compilateur a refusé un opérateur. |

## Erreurs Ephemeris

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-ephemeris-invalid-node"></span>`E_EPHEMERIS_INVALID_NODE` | — | Un nœud de données structurées n'a pas de `@type`. |
| <span id="e-ephemeris-invalid-url"></span>`E_EPHEMERIS_INVALID_URL` | — | Une URL n'est pas absolue. |
| <span id="e-ephemeris-invalid-date"></span>`E_EPHEMERIS_INVALID_DATE` | — | Une date n'est pas au format ISO 8601. |
| <span id="e-ephemeris-invalid-value"></span>`E_EPHEMERIS_INVALID_VALUE` | — | Une valeur ne peut pas être sérialisée (une `Date` invalide…). |
| <span id="e-ephemeris-invalid-price"></span>`E_EPHEMERIS_INVALID_PRICE` | — | Un prix n'est ni un nombre ni des chiffres avec un point décimal. |
| <span id="e-ephemeris-invalid-currency"></span>`E_EPHEMERIS_INVALID_CURRENCY` | — | Une devise n'est pas un code ISO 4217. |
| <span id="e-ephemeris-missing-required"></span>`E_EPHEMERIS_MISSING_REQUIRED` | — | Un type n'a pas une propriété que les moteurs de recherche exigent pour lui. |
| <span id="e-ephemeris-unsafe-key"></span>`E_EPHEMERIS_UNSAFE_KEY` | — | Une clé que les données structurées ne peuvent pas utiliser (comme `__proto__`). |
| <span id="e-ephemeris-id-taken"></span>`E_EPHEMERIS_ID_TAKEN` | — | Un `@id` généré pour un nœud a été donné à un autre. |
| <span id="e-ephemeris-slot-taken"></span>`E_EPHEMERIS_SLOT_TAKEN` | — | Un emplacement de nœud est déjà pris par un autre nœud. |
| <span id="e-ephemeris-cycle"></span>`E_EPHEMERIS_CYCLE` | — | Un nœud se contient lui-même. |
| <span id="e-ephemeris-too-deep"></span>`E_EPHEMERIS_TOO_DEEP` | — | Les données sont imbriquées au-delà de la profondeur permise. |
| <span id="e-ephemeris-too-long"></span>`E_EPHEMERIS_TOO_LONG` | — | Une valeur texte dépasse la longueur permise. |
| <span id="e-ephemeris-too-many"></span>`E_EPHEMERIS_TOO_MANY` | — | Une liste (un fil d'Ariane…) a plus d'éléments que permis. |

## Erreurs Goldstone

Les limites du moteur de mail sont refusées avant que le message soit analysé plus loin.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-goldstone-message-too-large"></span>`E_GOLDSTONE_MESSAGE_TOO_LARGE` | — | Un message dépasse la limite de taille ; refusé avant le téléchargement quand le serveur annonce sa taille. |
| <span id="e-goldstone-not-a-message"></span>`E_GOLDSTONE_NOT_A_MESSAGE` | — | Les octets ne sont pas un message mail. |
| <span id="e-goldstone-too-many-parts"></span>`E_GOLDSTONE_TOO_MANY_PARTS` | — | Un message a plus de parties MIME que permis. |
| <span id="e-goldstone-too-deep"></span>`E_GOLDSTONE_TOO_DEEP` | — | Les parties MIME sont imbriquées plus profond que permis. |
| <span id="e-goldstone-too-many-headers"></span>`E_GOLDSTONE_TOO_MANY_HEADERS` | — | Un message a plus de headers que permis. |
| <span id="e-goldstone-headers-too-large"></span>`E_GOLDSTONE_HEADERS_TOO_LARGE` | — | Les headers d'un message dépassent la limite de taille. |
| <span id="e-goldstone-missing-boundaries"></span>`E_GOLDSTONE_MISSING_BOUNDARIES` | — | Un message multipart déclare des délimiteurs qui n'apparaissent jamais. |
| <span id="e-goldstone-boundary-too-long"></span>`E_GOLDSTONE_BOUNDARY_TOO_LONG` | — | Un délimiteur multipart est plus long que permis. |
| <span id="e-goldstone-too-many-attachments"></span>`E_GOLDSTONE_TOO_MANY_ATTACHMENTS` | — | Un message a plus de pièces jointes que permis. |
| <span id="e-goldstone-attachment-too-large"></span>`E_GOLDSTONE_ATTACHMENT_TOO_LARGE` | — | Une pièce jointe dépasse la limite de taille. |
| <span id="e-goldstone-html-too-large"></span>`E_GOLDSTONE_HTML_TOO_LARGE` | — | Un corps HTML dépasse la limite de taille. |
| <span id="e-goldstone-html-too-deep"></span>`E_GOLDSTONE_HTML_TOO_DEEP` | — | Un corps HTML est imbriqué plus profond que permis. |
| <span id="e-goldstone-html-too-complex"></span>`E_GOLDSTONE_HTML_TOO_COMPLEX` | — | Un corps HTML a plus d'éléments que permis. |
| <span id="e-goldstone-dns-unavailable"></span>`E_GOLDSTONE_DNS_UNAVAILABLE` | — | Une vérification d'authenticité avait besoin du DNS et le DNS a échoué. |
| <span id="e-goldstone-invalid-envelope"></span>`E_GOLDSTONE_INVALID_ENVELOPE` | — | L'enveloppe donnée à une vérification d'authenticité est invalide (une adresse qui n'est pas une IP…). |
| <span id="e-goldstone-engine"></span>`E_GOLDSTONE_ENGINE` | — | Le moteur a échoué sans l'un des codes ci-dessus. |
| <span id="e-goldstone-native-required"></span>`E_GOLDSTONE_NATIVE_REQUIRED` | — | Le moteur mail Rust n'est pas chargé. |
| <span id="e-goldstone-invalid-limits"></span>`E_GOLDSTONE_INVALID_LIMITS` | — | Une limite d'analyse n'est pas un entier positif inférieur à 2^32. |
| <span id="e-goldstone-invalid-options"></span>`E_GOLDSTONE_INVALID_OPTIONS` | — | Une option de vérification d'authenticité n'est pas un entier positif inférieur à 2^32. |
| <span id="e-goldstone-invalid-config"></span>`E_GOLDSTONE_INVALID_CONFIG` | — | La configuration de la boîte de réception est invalide (aucune boîte déclarée…). |
| <span id="e-goldstone-insecure-connection"></span>`E_GOLDSTONE_INSECURE_CONNECTION` | — | Une boîte se connecterait sans TLS. Fixez `starttls: true`, ou `allowInsecure` pour un serveur de test local. |
| <span id="e-goldstone-unknown-mailbox"></span>`E_GOLDSTONE_UNKNOWN_MAILBOX` | — | Un nom de boîte n'est pas configuré. |
| <span id="e-goldstone-uidvalidity-changed"></span>`E_GOLDSTONE_UIDVALIDITY_CHANGED` | — | Un dossier surveillé a renuméroté ses messages ; la surveillance reprend depuis le plus récent. |

## Erreurs du plugin Helix

Levées par `@c9up/helix-plugin-ream` sous forme d'`Error` simples dont le message commence par `[CODE]`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-no-server"></span>`E_NO_SERVER` | — | `apiClient()` n'a reçu ni `testUtils` ni `boot`. |
| <span id="e-server-not-started"></span>`E_SERVER_NOT_STARTED` | — | Aucun serveur ne tourne pour la suite. Ajoutez le hook qui le démarre. |
| <span id="e-no-test-client"></span>`E_NO_TEST_CLIENT` | — | Aucun client en jeu. Ajoutez `apiClient()` aux plugins de `tests/bootstrap.ts`. |

## Erreurs Inker

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-template-not-found"></span>`E_INKER_TEMPLATE_NOT_FOUND` | — | Aucun template ne porte ce nom. |
| <span id="e-inker-parse-error"></span>`E_INKER_PARSE_ERROR` | — | Le template ne peut pas être analysé. |
| <span id="e-inker-unknown-identifier"></span>`E_INKER_UNKNOWN_IDENTIFIER` | — | Une expression nomme un identifiant hors de portée. |
| <span id="e-inker-invalid-path"></span>`E_INKER_INVALID_PATH` | — | Un chemin de template est invalide (remontée de répertoire, chemin absolu…). |
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
| <span id="e-inker-disk-required"></span>`E_INKER_DISK_REQUIRED` | — | Un nom de template exige un disque et aucun n'est monté. |
| <span id="e-inker-disk-collision"></span>`E_INKER_DISK_COLLISION` | — | Deux disques sont montés sous le même nom. |
| <span id="e-inker-template-collision"></span>`E_INKER_TEMPLATE_COLLISION` | — | Deux templates sont enregistrés sous le même nom. |
| <span id="e-inker-invalid-expression"></span>`E_INKER_INVALID_EXPRESSION` | — | Une expression ne peut pas être évaluée. |
| <span id="e-inker-invalid-iterable"></span>`E_INKER_INVALID_ITERABLE` | — | `@each` a reçu quelque chose qui n'est pas itérable. |
| <span id="e-inker-helper-throw"></span>`E_INKER_HELPER_THROW` | — | Un helper a levé une erreur pendant le rendu. |
| <span id="e-inker-async-not-supported"></span>`E_INKER_ASYNC_NOT_SUPPORTED` | — | Une construction qui rend de façon synchrone a utilisé `await`. |
| <span id="e-inker-render-depth"></span>`E_INKER_RENDER_DEPTH` | — | Le rendu s'est imbriqué trop profondément. |
| <span id="e-inker-dump-die"></span>`E_INKER_DUMP_DIE` | — | `@dd()` a arrêté le rendu et affiché sa valeur. |
| <span id="e-inker-invalid-json-ld"></span>`E_INKER_INVALID_JSON_LD` | — | Une valeur donnée au helper JSON-LD ne peut pas tenir en JSON-LD. |
| <span id="e-inker-template-error"></span>`E_INKER_TEMPLATE_ERROR` | — | Un template a levé une erreur lui-même. |
| <span id="e-inker-engine-missing"></span>`E_INKER_ENGINE_MISSING` | — | Un template a été rendu par le singleton inker avant que `InkerProvider` ne construise le moteur. |
| <span id="e-inker-napi-required"></span>`E_INKER_NAPI_REQUIRED` | — | Il n'existe pas de binaire natif inker pour cette plateforme. |

## Erreurs Lumen

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lumen-invalid-column"></span>`E_LUMEN_INVALID_COLUMN` | — | Une table a reçu une forme de colonne qu'elle n'a pas. |

## Erreurs Neutrino

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-neutrino-invalid-descriptor"></span>`E_NEUTRINO_INVALID_DESCRIPTOR` | — | Les octets ne sont pas un `FileDescriptorSet` valide. |
| <span id="e-neutrino-duplicate-type"></span>`E_NEUTRINO_DUPLICATE_TYPE` | — | Deux descripteurs déclarent le même type différemment. |
| <span id="e-neutrino-unknown-type"></span>`E_NEUTRINO_UNKNOWN_TYPE` | — | Aucun type message ou enum de ce nom n'est chargé. |
| <span id="e-neutrino-unknown-method"></span>`E_NEUTRINO_UNKNOWN_METHOD` | — | Aucune méthode de ce chemin n'est chargée. |
| <span id="e-neutrino-invalid-message"></span>`E_NEUTRINO_INVALID_MESSAGE` | — | Les octets ne sont pas un message valide de ce type. |
| <span id="e-neutrino-invalid-metadata"></span>`E_NEUTRINO_INVALID_METADATA` | — | Des métadonnées gRPC binaires sont mal formées ; le serveur répond INTERNAL. |
| <span id="e-neutrino-grpc-status"></span>`E_NEUTRINO_GRPC_STATUS` | — | `GrpcError` : une méthode répond un statut gRPC au lieu d'une réponse ; son message part au client comme détail du statut. |
| <span id="e-neutrino-duplicate-service"></span>`E_NEUTRINO_DUPLICATE_SERVICE` | — | Un service est enregistré deux fois. |
| <span id="e-neutrino-invalid-implementation"></span>`E_NEUTRINO_INVALID_IMPLEMENTATION` | — | L'implémentation d'une méthode n'est pas une fonction. |
| <span id="e-neutrino-streaming-unsupported"></span>`E_NEUTRINO_STREAMING_UNSUPPORTED` | — | Une méthode en flux a été enregistrée ; seules les méthodes unaires sont servies. |
| <span id="e-neutrino-invalid-option"></span>`E_NEUTRINO_INVALID_OPTION` | — | Une option de taille n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| <span id="e-neutrino-grpc-unsupported"></span>`E_NEUTRINO_GRPC_UNSUPPORTED` | — | Le serveur n'a pas de méthode `grpc()`. Mettez à jour `@c9up/ream`. |

## Erreurs Nova

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-nova-invalid-subscription"></span>`E_NOVA_INVALID_SUBSCRIPTION` | 400 | Le corps d'abonnement ou de désabonnement n'est pas un `PushSubscription` valide. |
| <span id="e-nova-subscription-conflict"></span>`E_NOVA_SUBSCRIPTION_CONFLICT` | 409 | Une autre requête écrivait le même point de terminaison au même moment. Relancez l'abonnement. |
| <span id="e-nova-subscription-not-found"></span>`E_NOVA_SUBSCRIPTION_NOT_FOUND` | 404 | L'utilisateur n'a pas cet abonnement. |
| <span id="e-nova-missing-user"></span>`E_NOVA_MISSING_USER` | — | Le handler d'abonnement a tourné sans utilisateur authentifié. |
| <span id="e-nova-invalid-user-id"></span>`E_NOVA_INVALID_USER_ID` | — | L'utilisateur authentifié n'a pas d'id utilisable (une chaîne non vide ou un entier). |
| <span id="e-nova-vapid-not-configured"></span>`E_NOVA_VAPID_NOT_CONFIGURED` | — | Une clé VAPID ou le sujet manque. |
| <span id="e-nova-http-client-missing"></span>`E_NOVA_HTTP_CLIENT_MISSING` | — | Envoyer une notification exige le client HTTP sortant de `@c9up/ream`. |
| <span id="e-nova-unknown-store"></span>`E_NOVA_UNKNOWN_STORE` | — | La configuration nomme un store qu'elle ne déclare pas. |
| <span id="e-nova-invalid-table"></span>`E_NOVA_INVALID_TABLE` | — | Le nom de table du store SQL n'est pas un identifiant simple. |
| <span id="e-nova-invalid-prefix"></span>`E_NOVA_INVALID_PREFIX` | — | Le préfixe de clés du store Redis contient un espace. |
| <span id="e-nova-store-busy"></span>`E_NOVA_STORE_BUSY` | — | Un abonnement a changé à chaque tentative d'écriture. |
| <span id="e-nova-store-file-unreadable"></span>`E_NOVA_STORE_FILE_UNREADABLE` | — | Le fichier du store fichier n'est pas du JSON valide. |
| <span id="e-nova-quasar-missing"></span>`E_NOVA_QUASAR_MISSING` | — | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| <span id="e-nova-redis-incomplete"></span>`E_NOVA_REDIS_INCOMPLETE` | — | La connexion quasar n'a pas ce dont nova a besoin. |

## Erreurs Orbit

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-no-host"></span>`E_ORBIT_NO_HOST` | — | `mount` a tourné avant que `useHost` donne à orbit un hôte natif, ou le module n'est pas celui d'orbit. |
| <span id="e-orbit-commit-failed"></span>`E_ORBIT_COMMIT_FAILED` | — | L'hôte natif a refusé une transmission ; le message porte son rapport. |
| <span id="e-orbit-unsupported-element"></span>`E_ORBIT_UNSUPPORTED_ELEMENT` | — | Un élément sans correspondance native (`select`, `canvas`, ou `text` / un dégradé dans un `svg`). |
| <span id="e-orbit-block-in-text"></span>`E_ORBIT_BLOCK_IN_TEXT` | — | Un élément bloc dans du texte : un texte natif ne contient que des passages en ligne. |
| <span id="e-orbit-invalid-motion"></span>`E_ORBIT_INVALID_MOTION` | — | `motion=${…}` n'était pas un objet de valeurs animées. |
| <span id="e-orbit-invalid-scroll-binding"></span>`E_ORBIT_INVALID_SCROLL_BINDING` | — | `scroll-y=${…}` n'était pas une valeur animée. |
| <span id="e-orbit-invalid-color"></span>`E_ORBIT_INVALID_COLOR` | — | Une couleur qu'orbit ne sait pas lire. |
| <span id="e-orbit-insecure-image-url"></span>`E_ORBIT_INSECURE_IMAGE_URL` | — | `<img src>` en http simple : les images ne se chargent qu'en https. |
| <span id="e-orbit-image-source"></span>`E_ORBIT_IMAGE_SOURCE` | — | `<img src>` avec un schéma qui n'est pas une source d'image (`data:`, `javascript:`…). |
| <span id="e-orbit-duplicate-key"></span>`E_ORBIT_DUPLICATE_KEY` | — | Deux éléments d'une liste `each` partagent une clé. |
| <span id="e-orbit-no-screen"></span>`E_ORBIT_NO_SCREEN` | — | `useScreen()` dans un composant qu'aucun écran d'une pile n'a construit. |
| <span id="e-orbit-stack-shown"></span>`E_ORBIT_STACK_SHOWN` | — | Une même pile placée à deux endroits : une pile s'affiche une fois. |
| <span id="e-orbit-style-table"></span>`E_ORBIT_STYLE_TABLE` | — | `useStyles` a reçu autre chose qu'une table écrite par `ream css:compile`. |
| <span id="e-orbit-insecure-server"></span>`E_ORBIT_INSECURE_SERVER` | — | `serverPages({ server })` en http simple vers un hôte qui n'est ni cette machine ni celle de l'émulateur. |
| <span id="e-orbit-unknown-page"></span>`E_ORBIT_UNKNOWN_PAGE` | — | Le serveur a nommé une page que l'app n'a pas (`serverPages({ pages })`). |

## Erreurs Orbit Clipboard

Levées par `@c9up/orbit-clipboard` sous forme d'`OrbitClipboardError`, les mêmes dans le navigateur et sur un téléphone.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-clipboard-unavailable"></span>`E_ORBIT_CLIPBOARD_UNAVAILABLE` | — | Aucun presse-papiers accessible : le serveur, une page non sécurisée, ou une app construite sans le module natif. |
| <span id="e-orbit-clipboard-denied"></span>`E_ORBIT_CLIPBOARD_DENIED` | — | La plateforme a refusé : pas de permission, ou la page ou l'app n'avait pas le focus. |

## Erreurs Orbit Secure Store

Levées par `@c9up/orbit-secure-store` sous forme d'`OrbitSecureStoreError`. Une vérification biométrique annulée n'est pas une vérification échouée.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-secure-store-unavailable"></span>`E_ORBIT_SECURE_STORE_UNAVAILABLE` | — | Pas de stockage sécurisé ici : le navigateur, le serveur, ou une app construite sans le module. |
| <span id="e-orbit-secure-store-invalid-key"></span>`E_ORBIT_SECURE_STORE_INVALID_KEY` | — | Une clé qui n'est pas faite de 1 à 128 caractères parmi `A-Z a-z 0-9 . _ -`. |
| <span id="e-orbit-secure-store-no-biometrics"></span>`E_ORBIT_SECURE_STORE_NO_BIOMETRICS` | — | `requireAuthentication` sur un téléphone sans biométrie forte enregistrée. |
| <span id="e-orbit-secure-store-auth-cancelled"></span>`E_ORBIT_SECURE_STORE_AUTH_CANCELLED` | — | L'utilisateur a fermé la demande biométrique. |
| <span id="e-orbit-secure-store-auth-failed"></span>`E_ORBIT_SECURE_STORE_AUTH_FAILED` | — | La vérification biométrique a échoué pour de bon : trop d'essais, un verrouillage, une erreur matérielle. |
| <span id="e-orbit-secure-store-invalidated"></span>`E_ORBIT_SECURE_STORE_INVALIDATED` | — | La clé derrière la valeur a disparu (nouvelle biométrie enregistrée, données de l'app restaurées), et la valeur avec elle. |
| <span id="e-orbit-secure-store-failed"></span>`E_ORBIT_SECURE_STORE_FAILED` | — | Tout autre échec signalé par la plateforme ; l'erreur ne porte jamais la valeur. |

## Erreurs Parsec

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-parsec-invalid-name"></span>`E_PARSEC_INVALID_NAME` | — | Un nom de métrique ou de label n'est pas valide. |
| <span id="e-parsec-invalid-instrument"></span>`E_PARSEC_INVALID_INSTRUMENT` | — | Un instrument est déclaré avec des options qu'il ne peut pas avoir. |
| <span id="e-parsec-instrument-conflict"></span>`E_PARSEC_INSTRUMENT_CONFLICT` | — | Un nom de métrique est déjà déclaré avec un autre type, une autre aide ou d'autres labels. |
| <span id="e-parsec-invalid-measurement"></span>`E_PARSEC_INVALID_MEASUREMENT` | — | Une mesure n'est pas un nombre fini. |
| <span id="e-parsec-invalid-label-value"></span>`E_PARSEC_INVALID_LABEL_VALUE` | — | Une valeur de label n'est ni une chaîne ni un nombre fini. |
| <span id="e-parsec-undeclared-label"></span>`E_PARSEC_UNDECLARED_LABEL` | — | Une mesure a reçu un label que la métrique ne déclare pas. |
| <span id="e-parsec-unknown-exporter"></span>`E_PARSEC_UNKNOWN_EXPORTER` | — | Un nom d'exporteur n'est pas déclaré. |
| <span id="e-parsec-unprotected-endpoint"></span>`E_PARSEC_UNPROTECTED_ENDPOINT` | — | Le point de terminaison des métriques serait servi sans protection. Fixez un token, ou `public: true` délibérément. |
| <span id="e-parsec-empty-token"></span>`E_PARSEC_EMPTY_TOKEN` | — | Le token du point de terminaison des métriques est vide, ce qui accepterait une requête sans identifiants. |

## Erreurs Photon

Les erreurs côté serveur sont levées par `@c9up/photon` (SSR / renderer) ; les erreurs côté navigateur par `@c9up/photon/client` (hydratation / SPA-nav). Chaque code expose un `docsUrl` qui pointe vers son ancre ci-dessous — l'opérateur saute directement du terminal aux instructions de récupération.

### E_PHOTON_INVALID_CONFIG

**Cause.** Un champ de `config/photon.ts` (ou la `PhotonConfig` passée à `PhotonRenderer`) échoue la validation : `buildDir` se résout en dehors de la racine du projet, ou `ssr.entrypoint` / `entryClient` contient des segments de path-traversal ou des caractères hors de `[\w./\-@#]`.

**Fix.**
1. Ouvre `config/photon.ts` et vérifie que `buildDir` est un path relatif INTÉRIEUR au projet (par ex. `dist`, PAS `../dist`).
2. Vérifie que `ssr.entrypoint` et `entryClient` sont des paths relatifs sans segments `..` et se terminent par `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Redémarre le renderer (`PhotonRenderer.boot()` revalide).

Levée aussi au rendu quand `rootView` nomme un template mais que la requête n'a pas de moteur de vues (`ctx.view`) : installe-en un (`@c9up/inker` le pose), ou fais renvoyer à `rootView` une fonction qui écrit le document.

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_MISSING

**Cause.** Le manifest Vite à `${buildDir}/manifest.json` est absent au moment où `PhotonRenderer.boot()` tourne en mode production. Le manifest est un artefact de build — son absence signifie presque toujours que le build n'a jamais été lancé pour ce déploiement, ou que la sortie du build n'a pas été embarquée.

**Fix.**
1. Lance le script de build (par ex. `pnpm build`) avant de démarrer le serveur en production.
2. Vérifie que ton pipeline de déploiement copie bien le dossier de build (par défaut `public/build/`) dans l'image runtime.
3. Confirme que `PhotonConfig.buildDir` correspond au chemin où Vite écrit sa sortie.

L'erreur levée porte `context: { manifestPath, buildDir }` pour le diagnostic, et `cause` forwarde l'erreur `fs.access` originale (utile pour distinguer ENOENT d'EACCES).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_INVALID

**Cause.** Le manifest Vite est là mais illisible, pas du JSON, ou pas un objet de manifest. Photon l'ignorait avec un warning puis pointait chaque page vers un `client.js` que le build n'avait jamais écrit : le serveur semblait sain et rien ne s'hydratait. Le boot échoue désormais.

**Fix.**
1. Reconstruis le client et redéploie tout le dossier de build — une copie partielle en est la cause habituelle.
2. Vérifie que le processus peut lire le fichier.

L'erreur levée porte `context: { manifestPath }`, et `cause` l'erreur de lecture ou de parsing.

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_LOAD_FAILED

**Cause.** Le manifest Vite est présent, mais le module SSR échoue au chargement : sortie de build manquante pour `ssr.entrypoint` (ou, en développement, aucun fichier à cet endroit), erreur de syntaxe dans le fichier SSR bundlé, ou peer dependency manquante au runtime. À distinguer de `E_PHOTON_MANIFEST_MISSING` — ce dernier code est levé quand le manifest est absent ; celui-ci quand le manifest est là mais que `import()` du SSR rejette.

**Fix.**
1. Relance `ream build` (ou ton script de build) et lis attentivement les warnings.
2. Vérifie que le fichier SSR existe à l'un des chemins attendus (`<ssrBuildDir>/ssr.js` ou `<ssrBuildDir>/<entryName>.js`, `ssrBuildDir` valant `build/ssr` par défaut).
3. Si le build tourne mais l'import échoue quand même, inspecte le fichier bundlé pour des peer dependencies absentes (par ex. `react-dom/server` pour l'adapter React).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_RENDER_FAILED

**Cause.** Le module SSR s'est bien chargé, mais son appel `render(pageData)` a levé ou retourné une valeur non-string. Causes courantes : un composant lève pendant le render, un équivalent `useEffect` tourne côté serveur et accède à `window`, ou le SSR retourne `undefined`.

**Fix.**
1. Lis `error.cause` (ou le `hint`) — il porte le message d'erreur original du module SSR.
2. Audite le composant page pour des globaux navigateur (`window`, `document`, `localStorage`) accédés au niveau module ou dans le render.
3. Confirme que l'export `render()` du SSR retourne bien une string (React : `renderToString(...)` ; Vue : `renderToString(...)` de `@vue/server-renderer` ; Svelte : `<App />.render(...).html`).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_HYDRATION_NO_DATA

**Cause.** L'appel `hydrate()` côté navigateur a tourné mais aucun bloc `<script id="photon-data" type="application/json">` n'a été trouvé dans le document. Signifie presque toujours que la page n'a PAS été rendue via `PhotonRenderer.render()` (réponse HTML écrite à la main, fichier statique, ou page 404).

**Fix.**
1. Confirme que la route qui renvoie cette page passe bien par `PhotonMiddleware` / `PhotonRenderer.render()`.
2. Si tu sers un fallback SPA, rends-le aussi via Photon — même un shell vide a besoin du bloc data pour que `hydrate()` le trouve.

**Lieu du throw :** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_BAD_DATA

**Cause.** Le bloc `<script id="photon-data">` a été trouvé, mais son contenu n'est pas un objet JSON avec la forme attendue `{ component, props, url, framework }`. Causes : mangling HTML par un CDN / proxy qui réencode les blocs script, double-escaping par un middleware qui ne sait pas que le bloc est censé rester du JSON brut, ou édition manuelle du template SSR.

**Fix.**
1. Inspecte la source de la page : le contenu du bloc doit faire un round-trip propre via `JSON.parse`.
2. Désactive tout middleware qui réécrit le HTML (compression, link-rewriting, injection de nonce CSP) qui touche le body — vérifie que le bloc reste intact en production.
3. Si tu as personnalisé le template SSR, garde le bloc `<script type="application/json" id="photon-data">…</script>` exactement tel que `PhotonRenderer.render()` l'émet.

**Lieu du throw :** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_NO_TARGET

**Cause.** Le sélecteur de cible d'hydratation (par défaut `#app`) n'a matché aucun nœud DOM. Habituellement une option `target` custom qui n'existe pas dans le HTML SSR, ou un `id="app"` retiré d'un template custom.

**Fix.**
1. Confirme que le HTML SSR contient bien l'élément qui matche `hydrate({ target })`.
2. Si tu as personnalisé l'enveloppe HTML du renderer, garde le `<div id="app">…</div>` (ou override `target` pour matcher l'id de ton wrapper).

**Lieu du throw :** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK

**Cause.** Le champ `framework` du bloc page-data n'est pas l'une des valeurs `react`, `vue` ou `svelte`. Soit le côté SSR a écrit une valeur inattendue, soit page-data a été fabriqué à la main avec une typo.

**Fix.**
1. Vérifie que `PhotonConfig.framework` côté serveur est bien réglé sur une valeur supportée.
2. Si tu sérialises page-data manuellement (rare), assure-toi que `framework` matche exactement le literal du union.

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED

**Cause.** Photon a bien lu page-data et dispatché vers le bon adapter, mais l'`import()` dynamique du runtime du framework a rejeté. Presque toujours une peer dependency manquante : `react` + `react-dom` pour React, `vue` pour Vue, `svelte` pour Svelte.

**Fix.**
1. Installe le runtime du framework : `pnpm add react react-dom` (ou `vue`, ou `svelte`).
2. Le `cause` de l'erreur porte l'échec de résolution module original — utile quand le package est installé mais qu'un sous-chemin manque (par ex. `react-dom/client` requiert React 18+).

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_UNKNOWN_ROUTE

**Cause.** Un `Link`, un `Form`, `router.visit` ou `urlFor` a nommé une route que le navigateur ne connaît pas : elle n'est pas parmi les routes transmises avec `setRoutes()`, ou `setRoutes()` n'a jamais été appelé.

**Fix.**
1. Appelle `setRoutes(router.namedRoutes())` une fois, avant le rendu de la première page ; le `hint` de l'erreur liste les routes connues.
2. Vérifie le nom par rapport au `router.as(...)` du serveur.

**Lieu du throw :** `packages/photon/src/client/routes.ts`.

### E_PHOTON_MISSING_ROUTE_PARAMS

**Cause.** Une route nommée a des paramètres (`/users/:id`) que `routeParams` n'a pas fournis. Le message les nomme ; `context` porte la route et les paramètres donnés.

**Fix.** Passe chaque paramètre de la route dans `routeParams`.

**Lieu du throw :** `packages/photon/src/client/routes.ts`.

### E_PHOTON_UNKNOWN_PAGE

**Cause.** Le `resolve` donné à `createPhotonApp` n'a rien renvoyé pour un nom de page — le plus souvent un chemin construit depuis le nom qui ne correspond à aucun fichier d'`import.meta.glob`.

**Fix.** Compare le chemin que `resolve` construit depuis le nom de page avec ton dossier de pages ; `resolvePageComponent` lève une erreur avec le chemin cherché.

**Lieu du throw :** `packages/photon/src/client/app.ts`.

### À propos des hydration mismatches

Les hydration mismatches (le HTML rendu côté serveur diffère du premier render côté client) ne sont **pas** levés par Photon. Chaque framework gère ce diagnostic lui-même :

- **React** : émet un `console.error` avec `Hydration failed because ...`. Voir https://react.dev/errors/418.
- **Vue** : émet un warning console `[Vue warn]: Hydration ...`.
- **Svelte** : émet une `Error: hydration_failed` depuis `svelte/internal`.

Si tu en vois un, la cause est presque toujours un **render non déterministe** : un `Date.now()`, un `Math.random()`, un `useEffect` qui ne tourne que côté client, ou un check `process.env` qui diffère entre serveur et navigateur. Le contrat de Photon est que `render(component, props)` est pur ; assure-toi que ton composant l'est aussi.

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
| <span id="e-prism-empty-input"></span>`E_PRISM_EMPTY_INPUT` | — | L'entrée est vide. |
| <span id="e-prism-input-too-large"></span>`E_PRISM_INPUT_TOO_LARGE` | — | L'entrée dépasse la limite d'octets. |
| <span id="e-prism-too-many-pixels"></span>`E_PRISM_TOO_MANY_PIXELS` | — | L'image, ou celle qu'une opération construirait, dépasse le plafond de pixels ; refusée avant l'allocation. |
| <span id="e-prism-zero-dimension"></span>`E_PRISM_ZERO_DIMENSION` | — | L'image a une largeur ou une hauteur nulle. |
| <span id="e-prism-unknown-format"></span>`E_PRISM_UNKNOWN_FORMAT` | — | Les octets ne sont pas un format d'image que prism reconnaît. |
| <span id="e-prism-unsupported-format"></span>`E_PRISM_UNSUPPORTED_FORMAT` | — | Le format est reconnu mais pas pris en charge. |
| <span id="e-prism-format-not-allowed"></span>`E_PRISM_FORMAT_NOT_ALLOWED` | — | Une vraie image, dans un format que l'application a choisi de ne pas décoder. |
| <span id="e-prism-unreadable"></span>`E_PRISM_UNREADABLE` | — | L'image ne peut pas être lue. |
| <span id="e-prism-decode-failed"></span>`E_PRISM_DECODE_FAILED` | — | Le décodage de l'image a échoué. |
| <span id="e-prism-encode-failed"></span>`E_PRISM_ENCODE_FAILED` | — | L'encodage de la sortie a échoué. |
| <span id="e-prism-invalid-geometry"></span>`E_PRISM_INVALID_GEOMETRY` | — | Une géométrie que l'image ne peut pas satisfaire : un recadrage hors de ses bords, une taille cible nulle. |
| <span id="e-prism-invalid-font"></span>`E_PRISM_INVALID_FONT` | — | Une police ne peut pas être utilisée. |
| <span id="e-prism-colour-space"></span>`E_PRISM_COLOUR_SPACE` | — | Un espace colorimétrique innommable, ou une conversion que le modèle refuse. |
| <span id="e-prism-invalid-operation"></span>`E_PRISM_INVALID_OPERATION` | — | Une opération n'a pas un champ requis, ou en a un hors bornes. |
| <span id="e-prism-qr-too-long"></span>`E_PRISM_QR_TOO_LONG` | — | Plus de texte qu'un QR code ne peut en contenir au niveau et à la version choisis. |
| <span id="e-prism-invalid-qr-option"></span>`E_PRISM_INVALID_QR_OPTION` | — | Une option de QR code hors bornes, ou une couleur qui n'est pas en hexadécimal strict. |
| <span id="e-prism-internal-panic"></span>`E_PRISM_INTERNAL_PANIC` | — | Le moteur a paniqué ; toujours un bug de prism. |
| <span id="e-prism-engine"></span>`E_PRISM_ENGINE` | — | Le moteur a échoué sans code connu. |
| <span id="e-prism-native-required"></span>`E_PRISM_NATIVE_REQUIRED` | — | Le moteur d'images Rust n'est pas chargé. |

## Erreurs Quasar

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-bytes-value"></span>`E_INVALID_BYTES_VALUE` | 500 | Un seuil mémoire du contrôle de santé Redis ne peut pas être lu comme une taille. |

## Erreurs Ream MCP

Renvoyées dans le résultat de l'outil de templates du serveur MCP.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-render-timeout"></span>`E_INKER_RENDER_TIMEOUT` | — | Un rendu de template a pris plus de temps que l'outil ne le permet. |
| <span id="e-inker-unknown"></span>`E_INKER_UNKNOWN` | — | Un rendu de template a échoué sans code inker. |

## Erreurs Relay

Renvoyées dans le corps JSON des routes relay, ou en événement `error` sur un hub.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-relay-bad-request"></span>`E_RELAY_BAD_REQUEST` | 400 | `subscribe` sans `uid` ni `channel` exploitables (deux chaînes non vides). |
| <span id="e-relay-channel-too-long"></span>`E_RELAY_CHANNEL_TOO_LONG` | 400 | Le nom du canal dépasse 256 caractères. |
| <span id="e-relay-not-connected"></span>`E_RELAY_NOT_CONNECTED` | 400 | Aucune connexion n'a cet uid sur cette instance et aucun bus n'est configuré pour relayer la requête à l'instance qui la tient — ou la connexion s'est fermée. |
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
| <span id="e-relay-unauthorized"></span>`E_RELAY_UNAUTHORIZED` | — | Une invocation de hub exige un utilisateur authentifié, ou authentifié par un autre garde. |
| <span id="e-relay-forbidden"></span>`E_RELAY_FORBIDDEN` | — | Une invocation de hub n'a pas le rôle ou la permission exigés. |
| <span id="e-relay-unknown-event"></span>`E_RELAY_UNKNOWN_EVENT` | — | Une invocation de hub ne nomme aucun handler. |
| <span id="e-relay-handler-error"></span>`E_RELAY_HANDLER_ERROR` | — | Un handler de hub a levé une erreur. |

## Erreurs Robledo

Levées par `@c9up/robledo` sous forme de `RobledoError`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-robledo-invalid-prefix"></span>`E_ROBLEDO_INVALID_PREFIX` | — | Le préfixe des routes ne commence pas par `/`, ou se termine par un `/`. |
| <span id="e-robledo-not-booted"></span>`E_ROBLEDO_NOT_BOOTED` | — | `services/main` utilisé avant le démarrage du provider. |
| <span id="e-robledo-no-native-module"></span>`E_ROBLEDO_NO_NATIVE_MODULE` | — | L'app n'a pas le module natif de robledo : elle n'a pas été construite avec robledo installé. |
| <span id="e-robledo-bad-response"></span>`E_ROBLEDO_BAD_RESPONSE` | — | Le serveur a répondu à une vérification de mise à jour par autre chose qu'une mise à jour. |
| <span id="e-robledo-refused"></span>`E_ROBLEDO_REFUSED` | — | Le téléphone a refusé une mise à jour : signature invalide, fichier altéré, mauvais runtime… |

## Erreurs Rover

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-mail-invalid-message"></span>`E_MAIL_INVALID_MESSAGE` | — | Un message n'a pas ce que l'envoi exige (une adresse `from`, un destinataire…). |
| <span id="e-mail-invalid-address"></span>`E_MAIL_INVALID_ADDRESS` | — | Une adresse n'est pas une adresse mail valide. |
| <span id="e-mail-header-injection"></span>`E_MAIL_HEADER_INJECTION` | — | Une valeur de header contient un saut de ligne ou un NUL. |
| <span id="e-invalid-list-header"></span>`E_INVALID_LIST_HEADER` | — | Une entrée de header `List-*` n'est pas une URL (https, http, mailto ou ftp) ou une adresse simple. |
| <span id="e-mail-field-unsupported"></span>`E_MAIL_FIELD_UNSUPPORTED` | — | Le transport ne sait pas fixer un champ que le message utilise (comme l'enveloppe SMTP). |
| <span id="e-attachment-unreadable"></span>`E_ATTACHMENT_UNREADABLE` | — | Le fichier d'une pièce jointe ne peut pas être lu. |
| <span id="e-mail-provider-config"></span>`E_MAIL_PROVIDER_CONFIG` | — | La configuration d'un transport est invalide. |
| <span id="e-mail-provider-error"></span>`E_MAIL_PROVIDER_ERROR` | — | Le transport n'a pas pu envoyer ; l'erreur porte le statut du fournisseur ou le code réseau. |
| <span id="e-mail-retry-config"></span>`E_MAIL_RETRY_CONFIG` | — | Un réglage de nouvelle tentative est hors bornes. |
| <span id="e-mail-config-missing"></span>`E_MAIL_CONFIG_MISSING` | — | Aucune configuration `mail` n'est enregistrée. Créez `config/mail.ts`, ou lancez `ream configure @c9up/rover`. |
| <span id="e-mail-unknown-mailer"></span>`E_MAIL_UNKNOWN_MAILER` | — | Un nom de mailer, ou le mailer par défaut, n'est pas configuré. |
| <span id="e-mail-unknown-transport"></span>`E_MAIL_UNKNOWN_TRANSPORT` | — | Un type de transport est inconnu. |
| <span id="e-mail-job-malformed"></span>`E_MAIL_JOB_MALFORMED` | — | Le contenu d'une tâche mail en file manque ou n'est pas un objet. |
| <span id="e-mail-template-engine"></span>`E_MAIL_TEMPLATE_ENGINE` | — | L'application utilise inker mais rover ne peut pas rendre les vues mail avec. |
| <span id="e-mail-template-not-found"></span>`E_MAIL_TEMPLATE_NOT_FOUND` | — | Un template mail est introuvable. |
| <span id="e-mail-template-read-error"></span>`E_MAIL_TEMPLATE_READ_ERROR` | — | Un template mail ne peut pas être lu. |
| <span id="e-mail-template-syntax"></span>`E_MAIL_TEMPLATE_SYNTAX` | — | Un template mail a une erreur de syntaxe. |
| <span id="e-mail-template-recursion"></span>`E_MAIL_TEMPLATE_RECURSION` | — | Des templates mail s'incluent trop profondément. |
| <span id="e-mail-template-napi-required"></span>`E_MAIL_TEMPLATE_NAPI_REQUIRED` | — | Il n'existe pas de binaire natif rover pour cette plateforme. |
| <span id="e-assertion-failed"></span>`E_ASSERTION_FAILED` | — | Une assertion du faux mailer sur un message envoyé a échoué. |
| <span id="e-rover-unknown"></span>`E_ROVER_UNKNOWN` | — | Un envoi a échoué avec une erreur sans code propre. |

## Erreurs Rune

Rune normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_RUNE_`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_VALIDATION_ERROR` | 422 | `validateOrThrow()` a trouvé des données invalides. Porte un tableau `messages` avec une entrée par champ et par règle. |
| <span id="e-rune-meta-required"></span>`E_RUNE_META_REQUIRED` | — | Un validateur construit avec `withMetaData()` a été appelé sans `{ meta }`. |
| <span id="e-rune-not-a-regular-file"></span>`E_RUNE_NOT_A_REGULAR_FILE` | — | Une valeur `file()` n'est pas un fichier ordinaire : ce n'est pas un envoi. |
| <span id="e-rune-invalid-size"></span>`E_RUNE_INVALID_SIZE` | — | `file()` a reçu une taille illisible. |
| <span id="e-rune-invalid-error-reporter"></span>`E_RUNE_INVALID_ERROR_REPORTER` | — | `errorReporter` ne prend pas d'argument et n'a pas rendu de reporter (`{ report, createError }`). |
| <span id="e-rune-invalid-rule"></span>`E_RUNE_INVALID_RULE` | — | `use()` a reçu autre chose qu'une règle compilée ; appelez d'abord la factory. |
| <span id="e-rune-no-rule"></span>`E_RUNE_NO_RULE` | — | `message()` a été appelé avant toute règle. |
| <span id="e-rune-not-an-object"></span>`E_RUNE_NOT_AN_OBJECT` | — | `merge()` (ou une méthode de forme semblable) exige une forme `object()`. |
| <span id="e-rune-partial-not-applicable"></span>`E_RUNE_PARTIAL_NOT_APPLICABLE` | — | `partial()` ne peut pas assouplir une forme qui a des groupes ou `allowUnknownProperties()`. |
| <span id="e-rune-no-type-rule"></span>`E_RUNE_NO_TYPE_RULE` | — | Une branche de `unionOfTypes()` ne déclare aucun type. |
| <span id="e-rune-duplicate-union-type"></span>`E_RUNE_DUPLICATE_UNION_TYPE` | — | Deux branches de `unionOfTypes()` déclarent le même type. |
| <span id="e-rune-async-rule-not-awaited"></span>`E_RUNE_ASYNC_RULE_NOT_AWAITED` | — | Une exécution synchrone a rencontré une règle asynchrone. Utilisez la variante asynchrone. |
| <span id="e-rune-no-database-resolver"></span>`E_RUNE_NO_DATABASE_RESOLVER` | — | Une règle de base (`unique`, `exists`) n'a pas de résolveur. Appelez `bindDatabase()` au démarrage, ou passez un callback. |
| <span id="e-rune-no-host-resolver"></span>`E_RUNE_NO_HOST_RESOLVER` | — | `activeUrl()` exige un résolveur d'hôte. |
| <span id="e-rune-unsupported-locale"></span>`E_RUNE_UNSUPPORTED_LOCALE` | — | `mobile()` n'a pas de plan de numérotation pour la locale. |
| <span id="e-rune-unsupported-country"></span>`E_RUNE_UNSUPPORTED_COUNTRY` | — | Une règle propre à un pays (`postalCode()`…) n'a pas de motif pour ce pays. |
| <span id="e-rune-unsupported-json-schema-target"></span>`E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET` | — | Une cible JSON Schema que rune n'émet pas. |
| <span id="e-rune-no-output-schema"></span>`E_RUNE_NO_OUTPUT_SCHEMA` | — | La sortie d'un validateur ne peut pas être décrite en JSON Schema : une transformation peut produire n'importe quoi. |
| <span id="e-rune-napi-required"></span>`E_RUNE_NAPI_REQUIRED` | — | Le moteur de validation Rust n'est pas chargé. |
| <span id="e-rune-napi-not-found"></span>`E_RUNE_NAPI_NOT_FOUND` | — | Le binaire du moteur de validation Rust est introuvable. |
| <span id="e-rune-napi-request-refused"></span>`E_RUNE_NAPI_REQUEST_REFUSED` | — | Le moteur de validation Rust a refusé la demande. |
| <span id="e-rune-napi-invalid-response"></span>`E_RUNE_NAPI_INVALID_RESPONSE` | — | Le moteur de validation Rust a rendu une forme inattendue. |

## Erreurs Sigil

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-sigil-unknown-driver"></span>`E_SIGIL_UNKNOWN_DRIVER` | — | Un hasher nomme un driver que sigil ne connaît pas. |
| <span id="e-sigil-napi-required"></span>`E_SIGIL_NAPI_REQUIRED` | — | Le driver exige le moteur Rust, qui n'est pas chargé. |
| <span id="e-sigil-not-booted"></span>`E_SIGIL_NOT_BOOTED` | — | `hash.<membre>` a été utilisé avant que `SigilProvider.boot()` ne tourne. |
| <span id="e-sigil-unknown-hasher"></span>`E_SIGIL_UNKNOWN_HASHER` | — | `hash.use(name)` (ou le `default` de la config) nomme un hasher que la config de hachage ne déclare pas. |

## Erreurs Spectrum

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-spectrum-unknown-level"></span>`E_SPECTRUM_UNKNOWN_LEVEL` | — | Le niveau d'une cible de transport n'est pas un niveau de log. |
| <span id="e-spectrum-unsupported-target"></span>`E_SPECTRUM_UNSUPPORTED_TARGET` | — | Une cible de transport que spectrum ne construit pas. Passez un `LogChannel` pour écrire ailleurs. |
| <span id="e-spectrum-invalid-file-options"></span>`E_SPECTRUM_INVALID_FILE_OPTIONS` | — | Une destination fichier n'est ni un chemin ni un descripteur de fichier. |
| <span id="e-spectrum-invalid-line-options"></span>`E_SPECTRUM_INVALID_LINE_OPTIONS` | — | Une option de ligne JSON est invalide. |
| <span id="e-spectrum-invalid-redact-path"></span>`E_SPECTRUM_INVALID_REDACT_PATH` | — | Un chemin de masquage ne peut pas être analysé. |
| <span id="e-spectrum-invalid-stringify-limit"></span>`E_SPECTRUM_INVALID_STRINGIFY_LIMIT` | — | Une limite de sérialisation n'est pas un entier positif. |
| <span id="e-spectrum-unsupported-option"></span>`E_SPECTRUM_UNSUPPORTED_OPTION` | — | Une option de logger que spectrum ne prend pas en charge. |
| <span id="e-spectrum-logger-not-bound"></span>`E_SPECTRUM_LOGGER_NOT_BOUND` | — | Le conteneur a résolu autre chose qu'un `Logger` pour le token `Logger`. |

## Erreurs Station

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-station-login-credentials-required"></span>`E_STATION_LOGIN_CREDENTIALS_REQUIRED` | 400 | Le formulaire de connexion admin a été envoyé sans email ou sans mot de passe. |
| <span id="e-station-login-identifier-too-long"></span>`E_STATION_LOGIN_IDENTIFIER_TOO_LONG` | 400 | L'email de connexion admin dépasse 254 caractères (RFC 5321) ; refusé avant le limiteur. |
| <span id="e-station-invalid-credentials"></span>`E_STATION_INVALID_CREDENTIALS` | 401 | Email ou mot de passe invalide. |
| <span id="e-station-too-many-login-attempts"></span>`E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | 429 | Trop de tentatives de connexion ; réessayez plus tard. |
| <span id="e-station-login-unavailable"></span>`E_STATION_LOGIN_UNAVAILABLE` | 503 | La connexion est temporairement indisponible. |
| <span id="e-station-csrf-required"></span>`E_STATION_CSRF_REQUIRED` | 403 | Une action admin exige un token CSRF actif et vérifié. |
| `E_VALIDATION_ERROR` | 422 | Un formulaire admin n'a pas passé la validation (clients JSON ; un navigateur est renvoyé en arrière). |

## Erreurs Transit

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-transit-invalid-xml"></span>`E_TRANSIT_INVALID_XML` | — | Un fournisseur a répondu un XML illisible, ou qui utilise une construction que transit refuse. |
| <span id="e-transit-protected-parameter"></span>`E_TRANSIT_PROTECTED_PARAMETER` | — | Un callback de `begin()`/`redirect()` a tenté de poser ou retirer un paramètre que la connexion possède (`state`, `nonce`, le challenge PKCE, `client_id`, `redirect_uri`, `response_type`), ou `scope` via `param()` au lieu des méthodes de scope. |

## Erreurs Vellum

Vellum normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_VELLUM_`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-vellum-invalid-pdf"></span>`E_VELLUM_INVALID_PDF` | — | Les octets ne sont pas un PDF que vellum sait lire. |
| <span id="e-vellum-signed-document"></span>`E_VELLUM_SIGNED_DOCUMENT` | — | Une modification invaliderait les signatures du document ; refusée sauf si l'appelant accepte de les perdre. |
| <span id="e-vellum-invalid-page"></span>`E_VELLUM_INVALID_PAGE` | — | Un numéro de page n'est pas un entier à partir de 1. |
| <span id="e-vellum-invalid-rotation"></span>`E_VELLUM_INVALID_ROTATION` | — | Une rotation n'est pas un multiple de 90. |
| <span id="e-vellum-empty-merge"></span>`E_VELLUM_EMPTY_MERGE` | — | `merge()` n'a reçu aucun document. |
| <span id="e-vellum-empty-selection"></span>`E_VELLUM_EMPTY_SELECTION` | — | Une sélection exige au moins une page. |
| <span id="e-vellum-merge-failed"></span>`E_VELLUM_MERGE_FAILED` | — | La fusion de documents a échoué. |
| <span id="e-vellum-select-failed"></span>`E_VELLUM_SELECT_FAILED` | — | La sélection de pages a échoué. |
| <span id="e-vellum-split-failed"></span>`E_VELLUM_SPLIT_FAILED` | — | Le découpage du document a échoué. |
| <span id="e-vellum-rotate-failed"></span>`E_VELLUM_ROTATE_FAILED` | — | La rotation de pages a échoué. |
| <span id="e-vellum-stamp-failed"></span>`E_VELLUM_STAMP_FAILED` | — | L'apposition d'une image a échoué. |
| <span id="e-vellum-stamp-text-failed"></span>`E_VELLUM_STAMP_TEXT_FAILED` | — | L'apposition d'un texte a échoué. |
| <span id="e-vellum-fill-failed"></span>`E_VELLUM_FILL_FAILED` | — | Le remplissage du formulaire a échoué. |
| <span id="e-vellum-flatten-failed"></span>`E_VELLUM_FLATTEN_FAILED` | — | L'aplatissement du formulaire a échoué. |
| <span id="e-vellum-render-failed"></span>`E_VELLUM_RENDER_FAILED` | — | Le rendu d'une page en image a échoué. |
| <span id="e-vellum-extract-failed"></span>`E_VELLUM_EXTRACT_FAILED` | — | L'extraction du texte a échoué. |
| <span id="e-vellum-write-failed"></span>`E_VELLUM_WRITE_FAILED` | — | L'écriture du document a échoué. |
| <span id="e-vellum-sign-failed"></span>`E_VELLUM_SIGN_FAILED` | — | La signature du document a échoué. |
| <span id="e-vellum-verify-failed"></span>`E_VELLUM_VERIFY_FAILED` | — | La vérification des signatures a échoué. |
| <span id="e-vellum-unknown-signer"></span>`E_VELLUM_UNKNOWN_SIGNER` | — | Aucun signataire de ce nom n'est configuré. |
| <span id="e-vellum-signer-invalid"></span>`E_VELLUM_SIGNER_INVALID` | — | La clé ou le certificat d'un signataire est vide. |
| <span id="e-vellum-timestamp-failed"></span>`E_VELLUM_TIMESTAMP_FAILED` | — | La construction ou la lecture d'un horodatage a échoué. |
| <span id="e-vellum-timestamp-unreachable"></span>`E_VELLUM_TIMESTAMP_UNREACHABLE` | — | L'autorité d'horodatage n'a pas pu être jointe. |
| <span id="e-vellum-timestamp-refused"></span>`E_VELLUM_TIMESTAMP_REFUSED` | — | L'autorité d'horodatage a répondu un statut d'erreur. |
| <span id="e-vellum-font-unreadable"></span>`E_VELLUM_FONT_UNREADABLE` | — | Un fichier de police configuré ne peut pas être lu. |
| <span id="e-vellum-file-not-found"></span>`E_VELLUM_FILE_NOT_FOUND` | — | Un fichier donné par chemin ne peut pas être lu. |
| <span id="e-vellum-invalid-options"></span>`E_VELLUM_INVALID_OPTIONS` | — | Une option de document, de page, de tableau ou de dessin est invalide. |
| <span id="e-vellum-invalid-color"></span>`E_VELLUM_INVALID_COLOR` | — | Une couleur ne peut pas être lue. |
| <span id="e-vellum-invalid-image"></span>`E_VELLUM_INVALID_IMAGE` | — | Une image ne peut pas être utilisée (illisible, ou ouverte par un autre document). |
| <span id="e-vellum-invalid-svg"></span>`E_VELLUM_INVALID_SVG` | — | Un SVG ne peut pas être utilisé ; passez un fichier en URL ou en octets. |
| <span id="e-vellum-unsupported-content"></span>`E_VELLUM_UNSUPPORTED_CONTENT` | — | Un tracé contient un opérateur que vellum ne dessine pas. |
| <span id="e-vellum-invalid-structure"></span>`E_VELLUM_INVALID_STRUCTURE` | — | Un élément de structure a été modifié après sa fin. |
| <span id="e-vellum-no-page"></span>`E_VELLUM_NO_PAGE` | — | Il n'y a pas de page courante ; appelez d'abord `addPage()`. |
| <span id="e-vellum-no-form"></span>`E_VELLUM_NO_FORM` | — | Des champs de formulaire ont été ajoutés avant `initForm()`. |
| <span id="e-vellum-document-ended"></span>`E_VELLUM_DOCUMENT_ENDED` | — | Le document est terminé ; on ne peut plus rien y ajouter. |
| <span id="e-vellum-napi-required"></span>`E_VELLUM_NAPI_REQUIRED` | — | Le moteur PDF Rust n'est pas chargé. |

## Erreurs Visa

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access"></span>`E_UNAUTHORIZED_ACCESS` | 403 | `currentAccessToken.authorize()` a trouvé un token trop restreint pour l'ability demandée. 403, pas 401 : la requête est authentifiée (`insufficient_scope`). |
| <span id="e-visa-missing-issuer"></span>`E_VISA_MISSING_ISSUER` | — | Aucun `issuer` n'est configuré. |
| <span id="e-visa-invalid-issuer"></span>`E_VISA_INVALID_ISSUER` | — | L'`issuer` n'est pas une URL. |
| <span id="e-visa-insecure-issuer"></span>`E_VISA_INSECURE_ISSUER` | — | L'`issuer` n'est pas en https (localhost excepté). |
| <span id="e-visa-no-redirect-uri"></span>`E_VISA_NO_REDIRECT_URI` | — | Un client a été enregistré sans URI de redirection. |
| <span id="e-visa-invalid-redirect-uri"></span>`E_VISA_INVALID_REDIRECT_URI` | — | Une URI de redirection n'est pas une URL complète. |
| <span id="e-visa-invalid-initial-access-token"></span>`E_VISA_INVALID_INITIAL_ACCESS_TOKEN` | — | `registration.initialAccessToken` est vide, ce qui accepterait un bearer vide. |
| <span id="e-visa-invalid-secret-ttl"></span>`E_VISA_INVALID_SECRET_TTL` | — | `registration.secretTtlSeconds` n'est pas un nombre entier de secondes positif. |
| <span id="e-visa-store-read-only"></span>`E_VISA_STORE_READ_ONLY` | — | Le store de clients ne peut pas enregistrer de clients. |

## Erreurs Warden

Warden normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_WARDEN_`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | 401 | Aucun garde n'a authentifié la requête. Une route gardée répond avec ce code. |
| <span id="e-invalid-credentials"></span>`E_INVALID_CREDENTIALS` | 400 | Les identifiants ne correspondent pas. `authFinder().verifyCredentials` la lève pour un compte inconnu comme pour un mauvais mot de passe, après le même travail de hachage. |
| <span id="e-warden-auth-strategy-error"></span>`E_WARDEN_AUTH_STRATEGY_ERROR` | 500 | Tous les gardes tentés ont planté (base de données indisponible, bug) : un incident serveur, distinct d'un refus d'identifiants. |
| <span id="e-warden-forbidden"></span>`E_WARDEN_FORBIDDEN` | 403 | L'utilisateur n'a pas une permission ou un rôle que la route déclare. |
| <span id="e-warden-mfa-required"></span>`E_WARDEN_MFA_REQUIRED` | 403 | La route déclare `@RequireMfa` et l'utilisateur n'a pas passé l'étape renforcée. |
| <span id="e-authorization-failure"></span>`E_AUTHORIZATION_FAILURE` | 403 | Une ability ou une policy du bouncer a refusé l'action (403, sauf si le refus donne un autre statut). La classe exportée porte le refus dans `error.response`, traduction comprise. |
| <span id="e-warden-unauthorized"></span>`E_WARDEN_UNAUTHORIZED` | 401 | Le `expressMiddleware()` autonome n'a trouvé aucun token ou l'a refusé. |
| <span id="e-warden-auth-error"></span>`E_WARDEN_AUTH_ERROR` | 500 | Le `expressMiddleware()` autonome a échoué en interne. |
| <span id="e-warden-no-auth-config"></span>`E_WARDEN_NO_AUTH_CONFIG` | — | `WardenProvider` a démarré sans aucun garde configuré. |
| <span id="e-warden-napi-required"></span>`E_WARDEN_NAPI_REQUIRED` | — | Le moteur JWT Rust n'est pas chargé. |
| <span id="e-warden-not-booted"></span>`E_WARDEN_NOT_BOOTED` | — | Le singleton `AuthManager` a été utilisé avant que `WardenProvider.boot()` ne tourne. |
| <span id="e-warden-auth-not-registered"></span>`E_WARDEN_AUTH_NOT_REGISTERED` | — | `AuthManager` n'est pas dans le conteneur ; ajoutez `WardenProvider` aux providers. |
| <span id="e-warden-invalid-config"></span>`E_WARDEN_INVALID_CONFIG` | — | Un réglage de garde, de token, de MFA ou de limite de débit est invalide. |
| <span id="e-warden-strategy-not-found"></span>`E_WARDEN_STRATEGY_NOT_FOUND` | — | Un nom de garde n'est pas configuré. |
| <span id="e-warden-strategy-cannot-issue"></span>`E_WARDEN_STRATEGY_CANNOT_ISSUE` | — | `issueFor()` sur un garde qui n'émet pas de tokens. |
| <span id="e-warden-strategy-cannot-login"></span>`E_WARDEN_STRATEGY_CANNOT_LOGIN` | — | `login()` / `logout()` sur un garde sans état (JWT, clé d'API). |
| <span id="e-warden-strategy-has-no-client"></span>`E_WARDEN_STRATEGY_HAS_NO_CLIENT` | — | Un garde n'a pas d'`authenticateAsClient()` : il ne peut pas forger une requête client en test. |
| <span id="e-warden-use-login"></span>`E_WARDEN_USE_LOGIN` | — | Le garde de session n'a pas d'étape d'identifiants. Vérifiez le mot de passe vous-même, puis appelez `login(user)`. |
| <span id="e-warden-no-session"></span>`E_WARDEN_NO_SESSION` | — | `login()` / `logout()` d'un garde de session a tourné sans `ctx.session` ; enregistrez d'abord le middleware de session. |
| <span id="e-warden-remember-me-unavailable"></span>`E_WARDEN_REMEMBER_ME_UNAVAILABLE` | — | Le « se souvenir de moi » a été demandé et aucun token de ce type n'est configuré. |
| <span id="e-warden-token-ttl-invalid"></span>`E_WARDEN_TOKEN_TTL_INVALID` | — | Le TTL d'un refresh token n'est pas un nombre fini et positif. |
| <span id="e-warden-otp-store-full"></span>`E_WARDEN_OTP_STORE_FULL` | — | Le store OTP en mémoire tient son maximum de défis en attente. |
| <span id="e-warden-otp-store-contract"></span>`E_WARDEN_OTP_STORE_CONTRACT` | — | Le store de défis OTP n'implémente pas `take()`. |
| <span id="e-warden-webauthn-store-full"></span>`E_WARDEN_WEBAUTHN_STORE_FULL` | — | Le store de défis WebAuthn en mémoire tient son maximum de cérémonies en attente. |
| <span id="e-warden-store-ttl-invalid"></span>`E_WARDEN_STORE_TTL_INVALID` | — | Le `ttlMs` d'un store de défis n'est pas un entier positif. |
| <span id="e-warden-store-limit-invalid"></span>`E_WARDEN_STORE_LIMIT_INVALID` | — | Le `maxEntries` d'un store de défis n'est pas un entier positif. |
| <span id="e-warden-webauthn-credential-exists"></span>`E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS` | — | L'identifiant de credential WebAuthn est déjà enregistré ; l'enregistrement répond `{ verified: false }`. |
| <span id="e-warden-invalid-credential"></span>`E_WARDEN_INVALID_CREDENTIAL` | — | Une clé publique WebAuthn stockée est mal formée. |
| <span id="e-warden-invalid-ability"></span>`E_WARDEN_INVALID_ABILITY` | — | `Bouncer.ability()` a reçu des options sans callback. |
| <span id="e-warden-unknown-ability"></span>`E_WARDEN_UNKNOWN_ABILITY` | — | Aucune ability de ce nom n'est enregistrée sur le bouncer. |
| <span id="e-warden-unknown-policy"></span>`E_WARDEN_UNKNOWN_POLICY` | — | Aucune policy de ce nom n'est enregistrée sur le bouncer. |
| <span id="e-warden-unknown-policy-action"></span>`E_WARDEN_UNKNOWN_POLICY_ACTION` | — | Une policy n'a pas de méthode pour l'action. |
| <span id="e-warden-policy-resolution-failed"></span>`E_WARDEN_POLICY_RESOLUTION_FAILED` | — | Le conteneur a résolu une policy en autre chose qu'une instance de sa classe. |
| <span id="e-warden-template-engine-unusable"></span>`E_WARDEN_TEMPLATE_ENGINE_UNUSABLE` | — | Le moteur de templates est installé mais `@can` / `@cannot` ne peuvent pas y être enregistrés. |
