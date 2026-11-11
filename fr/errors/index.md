# Codes d'erreur

Chaque erreur du framework porte un `code` stable qui commence par `E_`. Les codes
propres à un paquet ajoutent le nom du paquet (`E_ATLAS_EMPTY_SELECT`,
`E_WARDEN_FORBIDDEN`) ; quelques identifiants partagés gardent une forme simple
(`E_ROW_NOT_FOUND`, `E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Cherchez le
code ci-dessous.

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
│ Docs: https://docs.ream.dev/errors/E_CONTAINER_NOT_FOUND
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
| `E_CONTAINER_NOT_FOUND` | — | Aucun binding trouvé pour le token demandé. Inclut des suggestions « vouliez-vous dire ? » pour les fautes de frappe. Enregistrez-le avec `container.singleton()` ou décorez la classe avec `@inject()`. |
| `E_CIRCULAR_DEPENDENCY` | — | Dépendance circulaire (ou alias circulaire) détectée pendant la résolution. Utilisez des factories explicites ou découplez via des événements. |
| `E_CONTAINER_MISSING_METADATA` | — | Une classe déclare des paramètres de constructeur mais le conteneur ne trouve aucune métadonnée de dépendance pour eux. Activez les métadonnées de décorateurs, annotez les paramètres avec `@inject()`, ou déclarez `static containerInjections`. |
| `E_CONTAINER_RESERVED_TOKEN` | — | Le nom du token se lit comme une clé d'`Object.prototype` (`constructor`, `__proto__`…). Choisissez un autre nom. |

## Erreurs Router

| Code | HTTP | Description |
|------|------|-------------|
| `E_ROUTE_NOT_FOUND` | 404 | Aucune route ne correspond à la méthode et au chemin demandés. |
| `E_DUPLICATE_ROUTE` | — | Deux routes déclarent la même méthode et le même chemin. |
| `E_DUPLICATE_ROUTE_NAME` | — | Deux routes portent le même nom. |
| `E_MISSING_ROUTE_NAME` | — | Un groupe nommé préfixe une route qui n'a pas de nom. Nommez chaque route d'un groupe nommé. |
| `E_INVALID_ROUTE_DOMAIN` | — | Un domaine de route a un paramètre sans nom, ou deux fois le même paramètre. |
| `E_UNREGISTERED_CONTROLLER` | — | Une route nomme par une chaîne un contrôleur qui n'est pas enregistré. |
| `E_NO_VIEW_ENGINE` | — | `router.on(path).render()` est utilisé alors qu'aucun moteur de templates n'est installé. |
| `E_VALIDATOR_NOT_FOUND` | — | Une route nomme un validateur qui n'est pas enregistré. |

## Erreurs Pipeline

| Code | HTTP | Description |
|------|------|-------------|
| `E_PIPELINE_UNKNOWN_MIDDLEWARE` | — | Une route référence un middleware nommé non enregistré. Enregistrez-le avec `middleware.register()`. |
| `E_MIDDLEWARE_NOT_FOUND` | — | Un middleware nommé n'a pas pu être résolu à la construction du pipeline. Enregistrez-le avec `middleware.register()`. |
| `E_MIDDLEWARE_ENTRY` | — | Une entrée de middleware sans paramètre déclaré a été lue comme un import différé, et elle ne mène pas à un module avec un export par défaut. |
| `E_PIPELINE_DOUBLE_NEXT` | — | Un middleware a appelé `next()` plus d'une fois. Chaque middleware doit appeler `next()` au plus une fois. |
| `E_PIPELINE_ERROR` | — | Un handler a levé une erreur qui ne porte aucun code du framework. L'erreur garde la position de l'étape dans son contexte. |
| `E_VALIDATOR_UNUSABLE` | — | Un validateur de route n'expose ni `validateResultAsync()`, ni `validateResult()`, ni `validate()`. |

## Erreurs HTTP

Levées par les exceptions de `@c9up/ream` et par son serveur HTTP natif. Les refus du serveur lui-même sont répondus avant tout middleware.

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNKNOWN` | 500 | Le code par défaut d'une `Exception` qui n'en fixe aucun, et d'une erreur reconstruite depuis la couche native sans code. |
| `E_RUNTIME_EXCEPTION` | 500 | `RuntimeException` : une défaillance du programme, pas de la requête. |
| `E_INVALID_ARGUMENTS` | 500 | `InvalidArgumentsException` : une fonction a été appelée avec des arguments inutilisables. |
| `E_HTTP_EXCEPTION` | variable | Une erreur HTTP générique qui répond avec le statut qu'on lui a donné. |
| `E_HTTP_REQUEST_ABORTED` | 400 | `response.abort()` (ou `abortIf` / `abortUnless`) a arrêté la requête ; le corps donné part avec le statut donné, 400 par défaut. |
| `E_UNAUTHORIZED` | 401 | La requête n'est pas authentifiée. |
| `E_FORBIDDEN` | 403 | La requête est authentifiée mais pas autorisée. |
| `E_ROW_NOT_FOUND` | 404 | Un enregistrement qui doit exister est introuvable. |
| `E_VALIDATION_ERROR` | 422 | Les données de la requête n'ont pas passé la validation. Le corps porte un message par champ et par règle ; un formulaire de navigateur est renvoyé en arrière avec les erreurs en flash. |
| `E_REQUEST_ENTITY_TOO_LARGE` | 413 | Le corps de la requête dépasse la limite du body parser. Lire le corps brut d'une telle requête la lève aussi. |
| `E_HANDLER_FAILURE` | 500 | Le gestionnaire d'exceptions a lui-même levé une erreur en rendant une erreur. |
| `E_HTTP_CONTEXT_NOT_FOUND` | — | `HttpContext.getOrFail()` a été appelé hors d'une requête, ou avec le suivi du contexte ambiant désactivé. Passez `ctx` explicitement. |
| `E_RESPONSE_TOO_LARGE` | — | Un corps de réponse dépasse le plafond configuré. Les corps sont gardés entiers en mémoire : servez un gros fichier en flux ou depuis le stockage. |
| `E_BODYPARSER_CONFIG` | — | La configuration du body parser utilise une option qui n'est plus prise en charge. |
| `E_BODYPARSER_INVALID_SIZE` | — | Une limite de taille de corps n'est ni un nombre d'octets ni une taille comme `'1mb'`. |
| `E_HTTP_REQUEST_TIMEOUT` | 408 | Le serveur natif n'a pas reçu le corps de la requête à temps. |
| `E_REQUEST_ABORTED` | 400 | Le client a fermé la connexion pendant la lecture du corps. |
| `E_BAD_MULTIPART` | 400 | Un corps `multipart/form-data` est mal formé, ou son paramètre `boundary` manque. |
| `E_PATH_TRAVERSAL` | 400 | Le serveur natif a trouvé `..` dans le chemin, brut ou encodé en pourcentage. |
| `E_PARAMETER_POLLUTION` | 400 | Le serveur natif a trouvé deux fois la même clé dans la query string. |
| `E_TOO_MANY_REQUESTS` | 429 | La limite de débit du serveur natif a refusé la requête ; le corps porte `retryAfter`, avec les headers `Retry-After` et `X-RateLimit-*`. |
| `E_STREAM_UNKNOWN` | 500 | Un identifiant de flux server-sent events est inconnu du serveur. |

## Erreurs Session

| Code | HTTP | Description |
|------|------|-------------|
| `E_SESSION_NOT_READY` | 500 | `session.<method>()` exige un store de session, et cette session a été construite sans. |
| `E_SESSION_STORE_NOT_CONFIGURED` | 500 | La configuration de session ne nomme aucun store. Fixez `store`, ou `store: 'memory'` pour des sessions gardées dans ce seul processus. |
| `E_SESSION_STORE_NOT_CONDITIONAL` | 500 | Le store n'a pas d'`update()` : il ne peut pas réécrire une session seulement tant qu'elle existe, et une requête qui chevauche une déconnexion pourrait reconnecter l'utilisateur. |
| `E_SESSION_TAGGING_NOT_SUPPORTED` | 500 | Une méthode d'étiquetage de session a été appelée sur un store qui ne la prend pas en charge. Utilisez le store memory, redis ou database. |
| `E_SESSION_COOKIE_NOT_HTTP_ONLY` | 500 | Le cookie de session est configuré avec `httpOnly: false`. Retirez-le : un script capable de lire le cookie change toute XSS en prise de compte. |
| `E_SESSION_TEMPLATE_ENGINE_UNUSABLE` | — | Le moteur de templates est installé mais les tags de session ne peuvent pas y être enregistrés. |

## Erreurs Application

Levées pendant l'assemblage, la configuration et le démarrage de l'application.

| Code | HTTP | Description |
|------|------|-------------|
| `E_INVALID_ENV_VARIABLES` | — | `Env.create()` a trouvé des variables d'environnement qui ne respectent pas leur schéma. Le message les liste une par une. |
| `E_MISSING_APP_KEY` | — | Le chiffrement a été utilisé et `APP_KEY` n'est pas défini (au moins 16 caractères). |
| `E_INSECURE_APP_KEY` | — | `APP_KEY` n'est pas utilisable pour signer : trop court, ou une clé connue de la génération de projet ou de la documentation. |
| `E_REAMRC_UNKNOWN_OPTION` | — | `tests` dans `reamrc.ts` contient une option qui n'existe pas. |
| `E_IGNITOR_ALREADY_STARTED` | — | `warmUp()` a été appelé alors que l'application avait déjà dépassé cette phase. |
| `E_IGNITOR_WARMUP_ONLY` | — | Une application assemblée par `warmUp()` a été démarrée. Construisez un nouvel Ignitor pour en lancer une. |
| `E_IGNITOR_INVALID_PORT` | — | `PORT` n'est pas un entier entre 0 et 65535. |
| `E_IGNITOR_INVALID_HTTP_CONFIG` | — | Une limite `http.<clé>` n'est pas un nombre entier dans les bornes. |
| `E_IGNITOR_NO_SERVER_FACTORY` | — | `httpServer()` a été appelé sans `serverFactory` dans la configuration. |
| `E_IGNITOR_GRPC_UNSUPPORTED` | — | Un handler gRPC est enregistré, mais ce serveur ne sait pas servir gRPC. |
| `E_SERVER_GRPC_ALREADY_SET` | — | Un second handler gRPC a été enregistré sur le serveur. |
| `E_SERVER_GRPC_INVALID_LIMIT` | — | Une limite de taille de message gRPC n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| `E_REAM_STUB_SYNTAX` | — | Un template de stub a une erreur de syntaxe. |

## Erreurs Console

| Code | HTTP | Description |
|------|------|-------------|
| `E_CONSOLE_COMMAND_NOT_FOUND` | — | Aucune commande ne porte ce nom. |
| `E_CONSOLE_MISSING_ARGUMENT` | — | Un argument obligatoire n'a pas été donné. |
| `E_CONSOLE_MISSING_ARGUMENT_VALUE` | — | Un argument a été donné sans valeur. |
| `E_CONSOLE_UNEXPECTED_ARGUMENT` | — | Plus d'arguments que la commande n'en déclare. |
| `E_CONSOLE_UNKNOWN_FLAG` | — | Un flag que la commande ne déclare pas. |
| `E_CONSOLE_MISSING_FLAG` | — | Un flag obligatoire n'a pas été donné. |
| `E_CONSOLE_MISSING_FLAG_VALUE` | — | Un flag qui attend une valeur a été donné sans. |
| `E_CONSOLE_INVALID_FLAG_VALUE` | — | Une valeur de flag du mauvais type. |
| `E_CONSOLE_INVALID_FLAG_GROUP` | — | Des flags courts ont été groupés (`-abc`) avec un flag qui ne peut pas l'être. |
| `E_CONSOLE_NOT_INTERACTIVE` | — | Une commande a posé une question alors que stdin n'est pas interactif. Passez la valeur en flag. |
| `E_CONSOLE_PROMPT_CANCELLED` | — | L'utilisateur a annulé une question. |
| `E_CONSOLE_EMPTY_CHOICES` | — | Une question à choix a été posée sans aucune option. |
| `E_CONSOLE_INVALID_TRAP_VALUE` | — | Une réponse scriptée (un piège de question en test) a été rejetée par la validation de la question. |
| `E_CONSOLE_TRAP_OUT_OF_RANGE` | — | Un piège de question a choisi une option qui n'était pas proposée. |
| `E_CONSOLE_DUPLICATE_COMMAND` | — | Deux commandes revendiquent le même nom. |
| `E_CONSOLE_INVALID_COMMAND` | — | Une entrée de `commands` dans `reamrc.ts` n'est ni un chargeur de commandes ni une classe de commande exportée par défaut. |
| `E_CONSOLE_INVALID_COMMAND_METADATA` | — | Un chargeur de commandes a exporté des métadonnées qui ne décrivent pas une commande. |
| `E_CONSOLE_INVALID_ARGUMENT` | — | Une commande déclare ses arguments dans un ordre impossible à analyser : un argument après un argument spread, ou un obligatoire après un optionnel. |
| `E_CONSOLE_INVALID_ALIAS` | — | Un alias de commande ne se développe en rien. |
| `E_CONSOLE_LATE_GLOBAL_FLAG` | — | Un flag global a été déclaré après le démarrage du kernel. |
| `E_CONSOLE_LATE_LOADER` | — | Un chargeur de commandes a été ajouté après le démarrage du kernel. |
| `E_CONSOLE_KERNEL_RUNNING` | — | Une commande tourne déjà dans ce kernel. |
| `E_CONSOLE_KERNEL_COMPLETED` | — | Le kernel a terminé ; il ne peut pas exécuter une autre ligne de commande. |
| `E_CONSOLE_NOT_BOOTED` | — | Une méthode de l'application console a été appelée avant le chargement des commandes. |
| `E_CONSOLE_NO_APP` | — | Une commande a besoin de l'application et le kernel n'en a pas. Passez par le kernel console de l'Ignitor. |
| `E_CONSOLE_APP_NOT_STARTED` | — | Une commande a utilisé l'application sans déclarer `startApp: true` dans ses options. |

## Erreurs Scheduler

| Code | HTTP | Description |
|------|------|-------------|
| `E_SCHEDULE_INVALID_CRON` | — | L'expression cron d'une tâche planifiée n'a pas pu être enregistrée. |
| `E_SCHEDULE_INVALID_TARGET` | — | `@Schedule` a été posé sur une méthode statique. |
| `E_SCHEDULE_SYMBOL_METHOD` | — | `@Schedule` a été posé sur une méthode à clé symbole. |
| `E_SCHEDULE_ANONYMOUS_CLASS` | — | Une classe anonyme déclare `@Schedule` ; ses noms de tâches entreraient en collision. |
| `E_SCHEDULE_METHOD_NOT_FOUND` | — | Une méthode planifiée n'est pas appelable sur l'instance résolue par le conteneur. |
| `E_SCHEDULE_INVALID_CALLBACK` | — | `Scheduler.register()` a reçu autre chose qu'une fonction. |
| `E_SCHEDULE_INVALID_TASK_NAME` | — | `Scheduler.register()` a reçu un nom de tâche vide. |
| `E_SCHEDULE_INVALID_LOCK_BACKEND` | — | `lockBackend` n'implémente pas `acquire(name, ttlMs)` et `release(name)`. |
| `E_SCHEDULE_INVALID_LOCK_TTL` | — | `defaultLockTtlMs` n'est pas un nombre fini et positif. |
| `E_SCHEDULE_INVALID_EVENT_SINK` | — | `eventSink` n'implémente pas `emit(event)`. |
| `E_SCHEDULE_INVALID_ERROR_REPORTER` | — | `errorReporter` n'est pas une fonction. |
| `E_SCHEDULE_TASK_UNKNOWN` | — | `runTaskNow()` a nommé une tâche non enregistrée. |
| `E_SCHEDULE_TASK_TIMEOUT` | — | Une tâche n'a pas fini dans son `timeoutMs` ; elle continue en arrière-plan. |
| `E_SCHEDULE_PROVIDER_ALREADY_REGISTERED` | — | Le provider du scheduler a été enregistré deux fois sur le même conteneur. |
| `E_SCHEDULER_NATIVE_ERROR` | — | Un appel au scheduler natif a échoué. |

## Erreurs RPC et GraphQL

| Code | HTTP | Description |
|------|------|-------------|
| `E_RPC_INVALID_METHOD_NAME` | — | Un nom de méthode RPC est vide ou n'est pas une chaîne. |
| `E_RPC_RESERVED_METHOD_NAME` | — | Une méthode RPC prend un nom réservé (`rpc.*`). |
| `E_RPC_UNKNOWN_CONTROLLER_METHOD` | — | Une route RPC nomme une méthode de contrôleur qui n'existe pas. |
| `E_RPC_PROVIDER_ALREADY_REGISTERED` | — | Le provider RPC a été enregistré deux fois sur le même conteneur. |
| `E_GRAPHQL_PROVIDER_ALREADY_REGISTERED` | — | Le provider GraphQL a été enregistré deux fois sur le même conteneur. |

## Erreurs Client HTTP

Levées par le client HTTP sortant.

| Code | HTTP | Description |
|------|------|-------------|
| `E_HTTP_CLIENT_INVALID_URL` | — | L'URL ne peut pas être analysée, n'est ni http ni https, ou porte des identifiants (envoyez-les dans un header). |
| `E_HTTP_CLIENT_PRIVATE_ADDRESS` | — | L'hôte est, ou se résout en, une adresse qui n'est pas publique. |
| `E_HTTP_CLIENT_UNREACHABLE` | — | L'hôte n'a pas pu être joint. |
| `E_HTTP_CLIENT_TIMED_OUT` | — | La requête n'a pas abouti dans son délai. |
| `E_HTTP_CLIENT_TOO_LARGE` | — | Le corps de la réponse dépasse la limite de taille. |
| `E_HTTP_CLIENT_REDIRECT_REFUSED` | — | Une redirection a été refusée : trop nombreuses, de https vers http, ou vers un autre hôte. |

## Erreurs Archive

Levées par `@c9up/archive`. La route de fichiers signés répond ses refus en JSON avec le statut indiqué.

| Code | HTTP | Description |
|------|------|-------------|
| `E_ARCHIVE_INVALID_SIGNATURE` | 403 | La signature de l'URL signée est incomplète, mal formée ou ne correspond pas. |
| `E_ARCHIVE_EXPIRED_SIGNATURE` | 403 | L'URL signée a expiré. |
| `E_ARCHIVE_ACCESS_DENIED` | 403 | Une requête non signée a demandé un fichier privé. |
| `E_ARCHIVE_INVALID_KEY` | 403 | La route signée a refusé le chemin : une clé avec une remontée de répertoire ou des caractères interdits. |
| `E_ARCHIVE_NOT_FOUND` | 404 | Aucun fichier n'est stocké sous cette clé. La route signée répond 404 ; un appel au driver la lève. |
| `E_ARCHIVE_PATH_TRAVERSAL_DETECTED` | — | Une clé se résout hors de la racine du disque. |
| `E_ARCHIVE_UNALLOWED_CHARACTERS` | — | Une clé contient des caractères qu'une clé ne peut pas contenir. |
| `E_ARCHIVE_INVALID_EXPIRY` | — | Une expiration d'URL signée n'est pas une durée positive (un nombre de secondes ou une chaîne comme `'30mins'`). |
| `E_ARCHIVE_SIGNING_DISABLED` | — | `getSignedUrl()` a été appelé sur un disque local construit sans `signingSecret`. |
| `E_ARCHIVE_WEAK_SIGNING_SECRET` | — | Le `signingSecret` du disque local fait moins de 16 caractères. |
| `E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED` | — | Le disque local n'a pas d'URL d'envoi présignée ; seuls les disques cloud en ont. |
| `E_ARCHIVE_INVALID_HEADER_VALUE` | — | Une valeur à signer comme header de réponse contient un caractère de contrôle. |
| `E_ARCHIVE_INVALID_ROUTE_BASE_PATH` | — | Le `routeBasePath` du disque local n'est pas un chemin d'URL absolu comme `/storage`. |
| `E_ARCHIVE_PREFIX_MISMATCH` | — | `createSignedRouteHandler()` a reçu un préfixe différent du `routeBasePath` du disque : aucune URL signée ne l'atteindrait. |
| `E_ARCHIVE_VISIBILITY_CORRUPT` | — | L'enregistrement de visibilité d'un fichier est illisible ; archive refuse de traiter le fichier comme public. |
| `E_ARCHIVE_VISIBILITY_MOVE_FAILED` | — | `move()` a déplacé le fichier mais n'a pas pu écrire sa visibilité à la cible. |
| `E_ARCHIVE_INVALID_MOVE_OPTIONS` | — | `moveToDisk()` a reçu des options inutilisables. |
| `E_ARCHIVE_MULTIPART_NOT_MACROABLE` | — | Le `@c9up/ream` installé n'a pas de `MultipartFile` macroable : les fichiers envoyés ne peuvent pas recevoir `moveToDisk()`. |
| `E_ARCHIVE_REQUEST_TIMEOUT` | — | Le fournisseur de stockage n'a pas répondu, ou s'est figé pendant la lecture du corps, dans le délai d'inactivité. |
| `E_ARCHIVE_UNEXPECTED_RESPONSE` | — | Le fournisseur de stockage a répondu quelque chose qu'archive ne peut pas utiliser. |
| `E_ARCHIVE_UNKNOWN_DISK` | — | Un nom de disque, ou le disque par défaut, n'est pas dans la configuration. |
| `E_ARCHIVE_INVALID_DRIVER` | — | `config.driver` n'est ni `'local'`, ni `'s3'`, ni `'gcs'`. |
| `E_ARCHIVE_CONFIG_MISSING` | — | Le driver est `s3` ou `gcs` et sa section de configuration manque. |
| `E_ARCHIVE_PROVIDER_NOT_REGISTERED` | — | `ArchiveProvider.boot()` a tourné avant `register()`. |
| `E_ARCHIVE_TEMPLATE_ENGINE` | — | L'application rend avec inker, mais les helpers de template ne peuvent pas y être publiés. |

## Erreurs Atlas

Atlas normalise ses codes : un code qui commence déjà par `E_` est gardé, tout
autre reçoit le préfixe `E_ATLAS_`. Voir [Gestion des erreurs Atlas](../atlas/error-handling.md)
pour les sous-classes typées. Les refus du compilateur de requêtes sont des `Error`
simples dont le message commence par le code.

| Code | HTTP | Description |
|------|------|-------------|
| `E_ROW_NOT_FOUND` | 404 | Une requête qui doit rendre une ligne n'en a trouvé aucune : `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| `E_MASS_ASSIGNMENT` | — | `fill()` / `merge()` (et `create`, `createMany`, `updateOrCreate`) ont affecté un attribut hors de `fillable`, ou listé dans `guarded`. |
| `E_EXTRA_PROPERTIES` | — | Un remplissage a nommé une propriété qui n'est pas une colonne déclarée. |
| `E_UNKNOWN_COLUMN` | — | Une valeur a été affectée à une clé qui n'est pas une colonne. Passez `{ allowExtraProperties: true }` pour garder les clés inconnues dans `$extras`. |
| `E_INVALID_COLUMN` | — | Une requête nomme une colonne que l'entité ne déclare pas. |
| `E_INVALID_FIND_VALUE` | — | `find()` a été appelé sans valeur de clé primaire utilisable. |
| `E_MODEL_NOT_PERSISTED` | — | Une opération qui exige une ligne stockée (`delete()`, `refresh()`, `load*()`…) a tourné sur une instance locale. |
| `E_MISSING_PRIMARY_KEY` | — | La même opération a tourné sur une projection persistée qui ne contient pas la clé primaire. |
| `E_MODEL_DELETED` | — | `save()` a été appelé sur une instance supprimée. |
| `E_MISSING_OWNER_KEY` | — | `associate()` a reçu un parent dont la clé n'est pas renseignée. |
| `E_RELATION_NOT_LOADED` | — | Une relation a été lue avant d'être chargée. Appelez `.preload()` sur la requête ou `.load()` sur l'instance. |
| `E_OPTIMISTIC_LOCK` | — | Une sauvegarde a perdu un verrou optimiste : une autre transaction a modifié la ligne depuis sa lecture. |
| `E_STRICT_MODE` | — | SQL brut refusé par le mode strict (le `raw()` d'un repository, ou une valeur `db.raw()` écrite par un repository). |
| `E_NO_INTERACTIVE_TRANSACTION` | — | La connexion n'a pas de `transaction()` interactive (transaction de modèle, ou `useTransaction()` en test). |
| `E_ARRAY_PARAM` | — | Une liste a été liée à un seul paramètre. Développez-la en un paramètre par élément. |
| `E_ATLAS_MISSING_CONNECTION` | — | Un modèle ou un repository nomme une connexion non configurée. |
| `E_ATLAS_EMPTY_SELECT` | — | `select()` a été appelé sans colonnes. Fournissez au moins un nom de colonne. |
| `E_ATLAS_INVALID_PAGE` | — | `paginate()` a été appelé avec `page < 1`. |
| `E_ATLAS_INVALID_PER_PAGE` | — | `paginate()` a été appelé avec `perPage < 1`. |
| `E_ATLAS_INVALID_PAGINATION` | — | Une page, une taille de page ou un nombre de lignes qui n'est pas un entier fini et positif ou nul. |
| `E_ATLAS_INVALID_CTE_NAME` | — | Un nom de CTE doit être un identifiant valide (lettres, chiffres, underscores). |
| `E_ATLAS_INVALID_OPERATOR` | — | Un opérateur de `where()` ou `wherePivot()` hors de la liste autorisée. |
| `E_ATLAS_INVALID_INCREMENT` | — | `increment()` / `decrement()` a reçu une quantité qui n'est pas un nombre fini. |
| `E_ATLAS_INVALID_DATE_COLUMN_VALUE` | — | Une colonne de date a reçu une valeur qui n'est pas une date valide. |
| `E_ATLAS_UNDEFINED_BINDING` | — | Une valeur de requête vaut `undefined`. Validez l'entrée avant ; utilisez `whereNull()` pour chercher NULL. |
| `E_ATLAS_RAW_BINDINGS` | — | Une requête brute a des paramètres sans valeur liée. |
| `E_ATLAS_RAW_VALUE` | — | `defaultTo(db.raw())` a reçu des valeurs liées, qu'un défaut de colonne ne peut pas porter. |
| `E_ATLAS_NON_FINITE_NUMBER` | — | `defaultTo()` a reçu un nombre qui n'est pas un nombre SQL (`NaN`, `Infinity`). |
| `E_ATLAS_FACTORY_FAKER_MISSING` | — | Une factory utilise faker, dépendance pair optionnelle d'atlas, non installée. |
| `E_ATLAS_NAPI_NOT_FOUND` | — | Le compilateur de requêtes Rust n'est pas chargé. Une `Error` simple dont le message commence par le code. Voir [Dépannage](../atlas/troubleshooting.md). |
| `E_ATLAS_INSECURE_SSLMODE` | — | La connexion demande `sslmode=prefer` ou `allow` (URL ou `PGSSLMODE`), qui repassent en clair sans le dire. Utilisez `disable` ou `verify-full`. Voir [Connexions chiffrées](../atlas/connections.md#connexions-chiffrees-tls). |
| `E_ATLAS_LISTEN_UNSUPPORTED` | — | LISTEN / NOTIFY a été utilisé sur une connexion qui n'est pas PostgreSQL. |
| `E_ATLAS_LISTEN_CONNECT` | — | Le listener n'a pas pu ouvrir sa propre connexion PostgreSQL. |
| `E_ATLAS_LISTEN_CONNECTION` | — | La connexion du listener a échoué ; chaque abonnement en est informé. |
| `E_ATLAS_LISTEN_CHANNEL` | — | Un nom de canal LISTEN est vide, dépasse 63 octets, ou contient un NUL. |
| `E_ATLAS_LISTEN_CLOSED` | — | Le listener a été fermé pendant qu'une demande était en cours. |
| `E_ATLAS_LISTEN_EVENT` | — | Le listener natif a signalé un événement qu'atlas ne définit pas. |
| `E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | — | `migrations.tableName` n'est pas un identifiant simple. |
| `E_ATLAS_MIGRATION_NOT_FOUND` | — | Une migration à exécuter ou à annuler n'a pas de fichier dans le répertoire de migrations. |
| `E_ATLAS_MIGRATION_INVALID` | — | Un fichier de migration n'exporte pas de classe par défaut. |
| `E_ATLAS_MIGRATION_DUPLICATE` | — | Deux fichiers de migration partagent un nom. |
| `E_ATLAS_MIGRATION_COMPILE_EMPTY` | — | Une migration s'est compilée en aucune instruction SQL. |
| `E_MIGRATION_LOCKED` | — | Une autre exécution tient le verrou de migration. Attendez-la, ou libérez un verrou resté bloqué avec `migration:unlock`. |
| `E_ROLLBACK_DISABLED_IN_PRODUCTION` | — | Un rollback, reset, refresh, fresh ou wipe en production sans `--force`. |
| `E_ATLAS_DRY_RUN_WRITE` | — | Une migration a tenté d'écrire pendant un `dryRun()`. |
| `E_DEFER_REQUIRES_TRANSACTION` | — | Une migration utilise `this.defer()` sur un adaptateur sans `transaction()` interactive. |
| `E_MYSQL_FK_REQUIRES_TRANSACTION` | — | Suspendre les contrôles de clés étrangères MySQL exige une `transaction()` interactive pour les rétablir. |
| `E_SCHEMA_DUMP_DIALECT_MISMATCH` | — | Le dump de schéma a été fait pour un autre dialecte. |
| `E_SCHEMA_DUMP_TABLE_MISMATCH` | — | Le dump de schéma utilise une autre table de suivi des migrations. |
| `E_SEEDER_DIR_NOT_FOUND` | — | Le répertoire des seeders n'existe pas. |
| `E_SEEDER_INVALID` | — | Un fichier de seeder n'exporte pas de classe de seeder. |
| `E_SEEDER_INVALID_PATH` | — | Un chemin de seeder se résout hors du répertoire des seeders. |
| `E_NO_CONNECTION` | — | `schema.<méthode>()` exige une connexion active ; elle existe dans une migration, pas sur un `Schema` isolé. |
| `E_ALTER_EMPTY` | — | `schema.alterTable()` n'a déclaré aucune opération. |
| `E_ALTER_MISUSE` | — | `.alter()` ne suit pas une définition de colonne, ou une méthode réservée à la modification a servi sur une nouvelle table. |
| `E_CHECK_EMPTY` | — | Une contrainte check (ou `checkBetween`) n'a reçu aucune valeur ni intervalle. |
| `E_CHECK_RANGE` | — | `checkBetween` a reçu un intervalle qui n'est pas `[min, max]`. |
| `E_CONSTRAINT_EMPTY` | — | Une contrainte ne liste aucune colonne. |
| `E_ENUM_EMPTY` | — | Une colonne enum ne déclare aucune valeur. |
| `E_EMPTY_VIEW_SELECT` | — | Une vue n'a pas de SELECT, ou une vue matérialisée a été demandée à un dialecte qui n'en a pas. |
| `E_SPECIFIC_TYPE_EMPTY` | — | `specificType()` a reçu un type vide. |
| `E_SQLITE_DECIMAL_PRECISION` | — | Une précision décimale que SQLite ne peut pas stocker exactement. |
| `E_UNSUPPORTED` | — | Une fonctionnalité SQL que le dialecte de la connexion n'a pas (`DISTINCT ON` hors Postgres, variantes `ALL` sur SQLite…). |
| `E_UNSAFE_IDENTIFIER` | — | Le compilateur Rust a refusé un identifiant. |
| `E_UNSAFE_SQL` | — | Le compilateur Rust a refusé un fragment SQL. |
| `E_UNSAFE_EXPRESSION` | — | Le compilateur Rust a refusé une expression. |
| `E_UNSAFE_LITERAL` | — | Le compilateur Rust a refusé une valeur littérale. |
| `E_INJECTION_PATTERN` | — | Le compilateur Rust a refusé une entrée qui ressemble à une tentative d'injection. |

## Erreurs Aurora

| Code | HTTP | Description |
|------|------|-------------|
| `E_AURORA_ILLEGAL_PAGE_NAME` | — | Un nom de page contient des caractères interdits. |
| `E_AURORA_PAGE_OUTSIDE_ROOT` | — | Le chemin de page résolu tombe hors de la racine des pages configurée. |
| `E_AURORA_PAGE_NOT_FOUND` | — | Aucun fichier pour ce nom de page. |
| `E_AURORA_PAGE_IMPORT_FAILED` | — | La page est sur le disque et son graphe de modules refuse de se charger. |
| `E_AURORA_PAGE_INVALID_EXPORT` | — | Le module de page s'est chargé mais n'exporte pas de factory par défaut. |
| `E_AURORA_ILLEGAL_ROOT_TAG` | — | `renderPage` a reçu une balise racine qui n'est pas un simple nom d'élément. |
| `E_AURORA_OUTSIDE_COMPONENT` | — | `onMount` / `onUnmount` a été appelé hors de la fonction de setup d'un `component()`. |
| `E_AURORA_MISSING_CONTEXT` | — | `inject` n'a trouvé aucun fournisseur pour le contexte, et il ne déclare pas de défaut. |
| `E_AURORA_NOT_BOOTED` | — | Le singleton du manager a été lu avant qu'un provider ou `setAurora` ne le fixe. |
| `E_AURORA_UNKNOWN_ROUTE` | — | `urlFor` a reçu un nom absent du manifeste de routes. |
| `E_AURORA_MISSING_ROUTE_PARAMS` | — | `urlFor` a reçu une route dont les paramètres obligatoires ne sont pas tous fournis. |
| `E_AURORA_UNKNOWN_LIVE_COMPONENT` | — | Un composant live a été monté avant que `registry.define()` ne le nomme. |
| `E_AURORA_LIVE_SESSION_LIMIT` | — | Une session live a été refusée : le registre tient déjà `maxSessions`. |
| `E_AURORA_RELAY_REQUEST_FAILED` | — | Une requête relay est revenue avec un statut hors 2xx. |
| `E_AURORA_UNSAFE_URL` | — | Une URL de navigation a échoué au contrôle de même origine / de schéma. |
| `E_AURORA_SLOT_IN_TAG_NAME` | — | Un `${}` est tombé à la place d'un nom de balise. |
| `E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | — | Un `${}` est tombé à la place d'un nom d'attribut. |
| `E_AURORA_SLOT_IN_RAW_TEXT` | — | Un `${}` est tombé dans `<script>`, `<style>`, `<textarea>`, `<title>`… |
| `E_AURORA_SLOT_IN_COMMENT` | — | Un `${}` est tombé dans un commentaire, un `<!…>` / `<?…>` ou une section CDATA. |
| `E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | — | Un `${}` est tombé dans un attribut `on*`, dont la valeur est du JavaScript. |
| `E_AURORA_SLOT_IN_SRCDOC` | — | Un `${}` est tombé dans `srcdoc`, qu'une iframe analyse comme un document entier. |
| `E_AURORA_SLOT_IN_BASE_URL` | — | Un `${}` est tombé dans `<base href>`, qui rebase toutes les URL de la page. |
| `E_AURORA_SLOT_IN_SCRIPT_SOURCE` | — | Un `${}` est tombé dans l'URL d'où un `<script>` charge son code. |
| `E_AURORA_SLOT_IN_HTML_PROPERTY` | — | Une liaison `.prop` nomme une propriété qui analyse sa valeur comme du HTML. |
| `E_AURORA_TEMPLATE_IN_ATTRIBUTE` | — | Un template `html` imbriqué a atteint une valeur d'attribut ou `.value`. |
| `E_AURORA_FILE_INPUT_VALUE` | — | `.value` a reçu une chaîne non vide sur un `<input type="file">`. |
| `E_AURORA_DUPLICATE_KEY` | — | Deux éléments d'une liste `each()` partagent une clé, qui désigne une seule ligne. |
| `E_AURORA_INTERNAL` | — | Un invariant interne d'aurora a cassé : toujours un bug d'aurora. |

## Erreurs Blackhole

| Code | HTTP | Description |
|------|------|-------------|
| `E_BLACKHOLE_RATE_LIMITED` | 429 | Trop de requêtes de ce client, avec `Retry-After`. Attendez et réessayez. |
| `E_TOO_MANY_REQUESTS` | 429 | Un middleware de throttle ou `limiter.consume()` a trouvé la clé au-delà de son budget. |
| `E_BAD_CSRF_TOKEN` | 403 | Token CSRF invalide ou manquant. Renvoyez le cookie `XSRF-TOKEN` dans le header `X-XSRF-TOKEN` (ou le champ de formulaire `_csrf`). |
| `E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` | 403 | Une requête qui modifie l'état vient d'une autre origine — un autre hôte, ou le même hôte sur un autre schéma — absente de `csrf.trustedOrigins`. |
| `E_BLACKHOLE_PATH_TRAVERSAL` | 400 | Le chemin contient `..`, brut ou encodé en pourcentage. |
| `E_BLACKHOLE_PARAMETER_POLLUTION` | 400 | Une clé de la query string apparaît deux fois (les clés finissant par `[]` peuvent se répéter). |
| `E_BLACKHOLE_MISSING_IP` | 400 | La limite de débit est active et la requête n'a pas d'adresse client sous laquelle la compter. |
| `E_BLACKHOLE_SESSION_NOT_READY` | 500 | Les tokens CSRF sont liés à la session (`csrf.session`) et la requête a atteint blackhole sans session : enregistrez le middleware de session avant celui de blackhole. |
| `E_BLACKHOLE_BLOCKED` | variable | Un refus dont le moteur n'a pas fourni le corps sous forme d'erreur JSON. |

## Erreurs Echo

`E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` et `E_L2_CACHE_ERROR` gardent les identifiants que le code de cache intercepte déjà.

| Code | HTTP | Description |
|------|------|-------------|
| `E_FACTORY_ERROR` | — | La factory de `getOrSet()` a levé une erreur ; `cause` la contient. |
| `E_FACTORY_HARD_TIMEOUT` | — | La factory n'a pas fini dans son délai strict. |
| `E_UNDEFINED_VALUE` | — | Une valeur `null` ou `undefined` a été écrite dans le cache. |
| `E_L2_CACHE_ERROR` | — | Le second niveau d'un store étagé a échoué et l'échec n'est pas masqué. |
| `E_ECHO_LOCK_TIMEOUT` | — | Un appelant a attendu trop longtemps la factory d'un autre appelant pour la même clé. |
| `E_ECHO_INVALID_ARGUMENT` | — | Une méthode a reçu un argument inutilisable. |
| `E_ECHO_INVALID_DURATION` | — | Une durée n'est ni un nombre de millisecondes ni une chaîne lisible. |
| `E_ECHO_INVALID_CONFIG` | — | Une valeur de configuration est illisible, comme une taille qui n'est ni des octets ni `'10mb'`. |
| `E_ECHO_UNKNOWN_STORE` | — | Un nom de store, ou le store par défaut, n'est pas déclaré dans `stores`. |
| `E_ECHO_UNSUPPORTED_DRIVER` | — | Le provider par défaut a reçu un driver qu'il ne construit pas. |
| `E_ECHO_NOT_TAGGABLE` | — | Invalidation par tag sur un driver (ou un étage) sans tags. |
| `E_ECHO_SCAN_UNSUPPORTED` | — | `flush()` sur un client Redis sans `scan()` ; `KEYS` n'est pas utilisé. |
| `E_ECHO_UNSERIALIZABLE_VALUE` | — | Le driver mémoire stocke du JSON et la valeur n'a pas de forme JSON. Passez `serialize: false` pour la garder telle quelle. |
| `E_ECHO_QUASAR_MISSING` | — | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| `E_ECHO_INCOMPLETE_CONNECTION` | — | La connexion quasar n'a pas ce dont echo a besoin (`publish()` / `subscribe()`). |
| `E_ECHO_NOT_BOOTED` | — | Le singleton du cache a été utilisé avant `EchoProvider.boot()` ou `setCache()`. |

## Erreurs Eclipse

`E_LOCK_NOT_OWNED` et `E_LOCK_STORAGE_ERROR` gardent les identifiants que le code de verrou intercepte déjà.

| Code | HTTP | Description |
|------|------|-------------|
| `E_LOCK_NOT_OWNED` | — | Le verrou n'est pas tenu par ce détenteur : il a expiré, ou un autre le tient. Levée quand le travail a réussi mais que le bail a expiré pendant. |
| `E_LOCK_STORAGE_ERROR` | — | Le store de verrous a échoué en écriture, lecture ou suppression. |
| `E_ECLIPSE_INVALID_TTL` | — | Un TTL de verrou n'est ni un nombre fini et positif de millisecondes, ni `null`. |
| `E_ECLIPSE_INVALID_DURATION` | — | Une chaîne de durée est illisible. |
| `E_ECLIPSE_INVALID_RETRY` | — | Une option de `retry` est hors bornes. |
| `E_ECLIPSE_INVALID_CONFIG` | — | La configuration des verrous est invalide. |
| `E_ECLIPSE_MISSING_CONFIG` | — | `config/lock.ts` manque. |
| `E_ECLIPSE_UNKNOWN_STORE` | — | Un nom de store de verrous n'est pas déclaré. |
| `E_ECLIPSE_QUASAR_MISSING` | — | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| `E_ECLIPSE_INCOMPLETE_CONNECTION` | — | La connexion quasar n'a pas ce dont eclipse a besoin. |

## Erreurs Eon

La plupart des refus d'eon sont des `Error` simples dont le message commence par `[CODE]` ; ceux du compilateur de requêtes commencent par `CODE:`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_EON_MISSING_CONNECTION` | — | Un repository n'a pas de connexion sur laquelle tourner. |
| `E_EON_NOT_A_SUPERTABLE` | — | Une classe utilisée comme super-table n'est pas décorée avec `@SuperTable`. |
| `E_EON_NO_TAGS` | — | Une super-table n'a pas de colonne `@Tag` : une table enfant ne peut pas être routée. |
| `E_EON_NO_TIMESTAMP` | — | Une super-table n'a pas de colonne `@Timestamp`. |
| `E_EON_CHILD_STABLE` | — | `createChildTable()` n'a reçu ni `stable` ni `EntityClass`. |
| `E_EON_CHILD_COLLISION` | — | Deux jeux de tags distincts mènent à la même table enfant ; eon refuse d'écrire des lignes discordantes sous un seul jeu de tags. |
| `E_EON_BATCH_SIZE` | — | `batchSize` n'est pas un entier positif. |
| `E_EON_DECIMAL_STMT` | — | Une super-table avec des colonnes DECIMAL est passée par le chemin STMT en colonnes, qui ne sait pas les lier. Utilisez `ingestSql()`. |
| `E_EON_TYPE` | — | Une colonne ou un tag a un type inconnu ou absent. |
| `E_EON_TS_TYPE` | — | Un timestamp n'est ni un bigint ni un nombre entier sûr. |
| `E_EON_PARAM_PRECISION` | — | Un timestamp numérique n'est pas un entier sûr ; passez les timestamps en nanosecondes en bigint. |
| `E_EON_VALUE_TYPE` | — | Une colonne entière a reçu autre chose qu'un entier sûr ou un bigint. |
| `E_EON_VALUE_RANGE` | — | Une valeur sort de la plage du type de sa colonne ; le connecteur la tronquerait sans le dire. |
| `E_EON_TEMPLATE` | — | Le compilateur n'a rendu aucune instruction pour le template d'insertion STMT. |
| `E_EON_LITERAL_INSERT` | — | Une insertion littérale pour une table enfant s'est compilée en autre chose qu'une seule instruction. |
| `E_EON_HYDRATE_BIGINT` | — | Une colonne bigint ou timestamp est revenue avec une valeur non entière. |
| `E_EON_DECODE` | — | Une requête a rendu des lignes sans métadonnées de colonnes : elles ne peuvent pas être décodées. |
| `E_EON_SCHEMALESS_SCHEMA` | — | Un type de champ n'a pas de forme line-protocol. |
| `E_EON_SCHEMALESS_FIELD` | — | Une valeur de champ line-protocol sort de la plage de son type. |
| `E_EON_SCHEMALESS_TAG` | — | Une valeur de tag line-protocol ne peut pas être écrite. |
| `E_EON_SCHEMALESS_EMPTY_TAG` | — | Une valeur de tag line-protocol est vide. |
| `E_EON_SCHEMALESS_NO_FIELDS` | — | Un point line-protocol n'a aucun champ. |
| `E_EON_SCHEMALESS_MEASUREMENT` | — | Le nom de la super-table (measurement) est vide. |
| `E_EON_SCHEMALESS_CONTROL_CHAR` | — | Un nom ou une valeur line-protocol contient une fin de ligne ou un caractère de contrôle ; il est refusé, pas échappé. |
| `E_EON_INVALID_VALUE` | — | `where()` à un argument prend un callback qui remplit un groupe. |
| `E_EON_EMPTY_WHERE_GROUP` | — | Un groupe `where(callback)` n'a ajouté aucun prédicat. |
| `E_EON_INVALID_LIMIT` | — | `limit()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| `E_EON_INVALID_OFFSET` | — | `offset()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| `E_EON_COMPILE_EMPTY` | — | Le compilateur n'a rendu aucune instruction SQL. |
| `E_EON_UNEXPECTED_PARAMS` | — | Une requête temporelle s'est compilée avec des paramètres liés là où du SQL littéral est attendu. |
| `E_EON_INTERNAL` | — | Un invariant interne d'eon a cassé : toujours un bug d'eon. |
| `E_EON_ALTER_DB_ONE_OPTION` | — | `alterDatabase()` prend exactement une option. |
| `E_EON_MIGRATION_INVALID` | — | La table de suivi des migrations contient un `executed_at` illisible. |
| `E_EON_MIGRATION_LOCKED` | — | Une autre exécution tient le verrou de migration. |
| `E_EON_FACTORY_STATE` | — | Un état de factory n'est pas défini. |
| `E_EON_FAKE_UNSUPPORTED` | — | `FakeEonConnection` ne répond qu'aux SELECT simples ; le SQL fenêtré ou agrégé exige un TDengine réel. |
| `E_EON_TEST_IDENTIFIER` | — | Un helper de nettoyage de test a reçu un nom qui n'est pas un identifiant simple. |
| `E_EON_NAPI_NOT_FOUND` | — | Le binaire du compilateur de requêtes eon est introuvable. |
| `E_EON_NAPI_UNSUPPORTED` | — | Il n'existe pas de binaire du compilateur de requêtes eon pour cette plateforme. |
| `E_EON_INVALID_DURATION` | — | Une durée n'est pas un entier positif suivi d'une unité. |
| `E_EON_INVALID_FILL` | — | Un mode `FILL` n'est pas connu de TDengine, ou il lui manque sa valeur. |
| `E_EON_FILL_REQUIRES_INTERVAL` | — | `FILL` a été utilisé sans `INTERVAL`. |
| `E_EON_SLIDING_REQUIRES_INTERVAL` | — | `SLIDING` a été utilisé sans `INTERVAL`. |
| `E_EON_OFFSET_REQUIRES_LIMIT` | — | `OFFSET` a été utilisé sans `LIMIT`. |
| `E_EON_INVALID_ORDER_DIRECTION` | — | Une direction de tri n'est ni `asc` ni `desc`. |
| `E_EON_INVALID_PSEUDO_COLUMN` | — | Une pseudo-colonne n'est pas de celles qu'eon autorise. |
| `E_EON_INVALID_SELECT` | — | Une expression de sélection ne peut pas être compilée. |
| `E_EON_INVALID_SELECT_FUNCTION` | — | Une sélection nomme une fonction qu'eon n'autorise pas. |
| `E_EON_INVALID_DB_OPTION` | — | Une valeur d'option de base est invalide. |
| `E_EON_UNKNOWN_DB_OPTION` | — | Une option de base n'est pas modifiable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| `E_EON_IMMUTABLE_DB_OPTION` | — | Une option de base est fixée au CREATE et ne peut pas être modifiée. |
| `E_EON_INVALID_TTL` | — | Le TTL d'une table enfant n'est pas un nombre entier de jours positif ou nul. |
| `E_EON_INVALID_WAL_LEVEL` | — | Un `WAL_LEVEL` n'est pas accepté par TDengine. |
| `E_EON_INVALID_CACHEMODEL` | — | Un `CACHEMODEL` n'est pas accepté par TDengine. |
| `E_EON_INVALID_PRECISION` | — | Une précision de base n'est ni `ms`, ni `us`, ni `ns`. |
| `E_EON_KEEP_TOO_SMALL` | — | `KEEP` est inférieur à trois fois `DURATION`. |
| `E_TS_REQUIRED` | — | La première colonne d'une super-table n'est pas un TIMESTAMP. |
| `E_TAGS_REQUIRED` | — | Une super-table ne déclare aucun tag. |
| `E_JSON_TAG_RULE` | — | JSON est réservé aux tags et doit être le seul tag. |
| `E_TYPE_NOT_TAGGABLE` | — | Un type qui ne peut pas être un tag (DECIMAL) est utilisé comme tag. |
| `E_LENGTH_REQUIRED` | — | Un type qui exige une longueur (`BINARY(n)`, `NCHAR(n)`…) n'en a pas reçu. |
| `E_NAME_COLLISION` | — | Un nom figure plusieurs fois parmi les colonnes de tags et de valeurs du template STMT. |
| `E_INVALID_CLAUSE_TYPE` | — | Un connecteur WHERE n'est ni `and` ni `or`. |
| `E_INVALID_WHERE_GROUP` | — | Un groupe WHERE est vide, ou nomme aussi une colonne. |
| `E_INVALID_WHERE_VALUE` | — | Une valeur WHERE (ou un élément de liste) n'est pas un scalaire. |
| `E_UNSAFE_IDENTIFIER` | — | Le compilateur a refusé un identifiant. |
| `E_UNSAFE_LITERAL` | — | Le compilateur a refusé une valeur littérale. |
| `E_UNSAFE_OPERATOR` | — | Le compilateur a refusé un opérateur. |

## Erreurs Ephemeris

| Code | HTTP | Description |
|------|------|-------------|
| `E_EPHEMERIS_INVALID_NODE` | — | Un nœud de données structurées n'a pas de `@type`. |
| `E_EPHEMERIS_INVALID_URL` | — | Une URL n'est pas absolue. |
| `E_EPHEMERIS_INVALID_DATE` | — | Une date n'est pas au format ISO 8601. |
| `E_EPHEMERIS_INVALID_VALUE` | — | Une valeur ne peut pas être sérialisée (une `Date` invalide…). |
| `E_EPHEMERIS_INVALID_PRICE` | — | Un prix n'est ni un nombre ni des chiffres avec un point décimal. |
| `E_EPHEMERIS_INVALID_CURRENCY` | — | Une devise n'est pas un code ISO 4217. |
| `E_EPHEMERIS_MISSING_REQUIRED` | — | Un type n'a pas une propriété que les moteurs de recherche exigent pour lui. |
| `E_EPHEMERIS_UNSAFE_KEY` | — | Une clé que les données structurées ne peuvent pas utiliser (comme `__proto__`). |
| `E_EPHEMERIS_ID_TAKEN` | — | Un `@id` généré pour un nœud a été donné à un autre. |
| `E_EPHEMERIS_SLOT_TAKEN` | — | Un emplacement de nœud est déjà pris par un autre nœud. |
| `E_EPHEMERIS_CYCLE` | — | Un nœud se contient lui-même. |
| `E_EPHEMERIS_TOO_DEEP` | — | Les données sont imbriquées au-delà de la profondeur permise. |
| `E_EPHEMERIS_TOO_LONG` | — | Une valeur texte dépasse la longueur permise. |
| `E_EPHEMERIS_TOO_MANY` | — | Une liste (un fil d'Ariane…) a plus d'éléments que permis. |

## Erreurs Goldstone

Les limites du moteur de mail sont refusées avant que le message soit analysé plus loin.

| Code | HTTP | Description |
|------|------|-------------|
| `E_GOLDSTONE_MESSAGE_TOO_LARGE` | — | Un message dépasse la limite de taille ; refusé avant le téléchargement quand le serveur annonce sa taille. |
| `E_GOLDSTONE_NOT_A_MESSAGE` | — | Les octets ne sont pas un message mail. |
| `E_GOLDSTONE_TOO_MANY_PARTS` | — | Un message a plus de parties MIME que permis. |
| `E_GOLDSTONE_TOO_DEEP` | — | Les parties MIME sont imbriquées plus profond que permis. |
| `E_GOLDSTONE_TOO_MANY_HEADERS` | — | Un message a plus de headers que permis. |
| `E_GOLDSTONE_HEADERS_TOO_LARGE` | — | Les headers d'un message dépassent la limite de taille. |
| `E_GOLDSTONE_MISSING_BOUNDARIES` | — | Un message multipart déclare des délimiteurs qui n'apparaissent jamais. |
| `E_GOLDSTONE_BOUNDARY_TOO_LONG` | — | Un délimiteur multipart est plus long que permis. |
| `E_GOLDSTONE_TOO_MANY_ATTACHMENTS` | — | Un message a plus de pièces jointes que permis. |
| `E_GOLDSTONE_ATTACHMENT_TOO_LARGE` | — | Une pièce jointe dépasse la limite de taille. |
| `E_GOLDSTONE_HTML_TOO_LARGE` | — | Un corps HTML dépasse la limite de taille. |
| `E_GOLDSTONE_HTML_TOO_DEEP` | — | Un corps HTML est imbriqué plus profond que permis. |
| `E_GOLDSTONE_HTML_TOO_COMPLEX` | — | Un corps HTML a plus d'éléments que permis. |
| `E_GOLDSTONE_DNS_UNAVAILABLE` | — | Une vérification d'authenticité avait besoin du DNS et le DNS a échoué. |
| `E_GOLDSTONE_INVALID_ENVELOPE` | — | L'enveloppe donnée à une vérification d'authenticité est invalide (une adresse qui n'est pas une IP…). |
| `E_GOLDSTONE_ENGINE` | — | Le moteur a échoué sans l'un des codes ci-dessus. |
| `E_GOLDSTONE_NATIVE_REQUIRED` | — | Le moteur mail Rust n'est pas chargé. |
| `E_GOLDSTONE_INVALID_LIMITS` | — | Une limite d'analyse n'est pas un entier positif inférieur à 2^32. |
| `E_GOLDSTONE_INVALID_OPTIONS` | — | Une option de vérification d'authenticité n'est pas un entier positif inférieur à 2^32. |
| `E_GOLDSTONE_INVALID_CONFIG` | — | La configuration de la boîte de réception est invalide (aucune boîte déclarée…). |
| `E_GOLDSTONE_INSECURE_CONNECTION` | — | Une boîte se connecterait sans TLS. Fixez `starttls: true`, ou `allowInsecure` pour un serveur de test local. |
| `E_GOLDSTONE_UNKNOWN_MAILBOX` | — | Un nom de boîte n'est pas configuré. |
| `E_GOLDSTONE_UIDVALIDITY_CHANGED` | — | Un dossier surveillé a renuméroté ses messages ; la surveillance reprend depuis le plus récent. |

## Erreurs du plugin Helix

Levées par `@c9up/helix-plugin-ream` sous forme d'`Error` simples dont le message commence par `[CODE]`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_NO_SERVER` | — | `apiClient()` n'a reçu ni `testUtils` ni `boot`. |
| `E_SERVER_NOT_STARTED` | — | Aucun serveur ne tourne pour la suite. Ajoutez le hook qui le démarre. |
| `E_NO_TEST_CLIENT` | — | Aucun client en jeu. Ajoutez `apiClient()` aux plugins de `tests/bootstrap.ts`. |

## Erreurs Inker

| Code | HTTP | Description |
|------|------|-------------|
| `E_INKER_TEMPLATE_NOT_FOUND` | — | Aucun template ne porte ce nom. |
| `E_INKER_PARSE_ERROR` | — | Le template ne peut pas être analysé. |
| `E_INKER_UNKNOWN_IDENTIFIER` | — | Une expression nomme un identifiant hors de portée. |
| `E_INKER_INVALID_PATH` | — | Un chemin de template est invalide (remontée de répertoire, chemin absolu…). |
| `E_INKER_UNCLOSED_INTERPOLATION` | — | Un `{{` n'a pas de `}}` correspondant. |
| `E_INKER_UNCLOSED_BLOCK_TAG` | — | Un tag de bloc n'est pas fermé. |
| `E_INKER_UNCLOSED_BLOCK` | — | Un bloc n'a pas de `@end`. |
| `E_INKER_UNMATCHED_BLOCK_END` | — | Un `@end` ne ferme aucun bloc. |
| `E_INKER_MISMATCHED_BLOCK_END` | — | Un `@end` ferme un autre bloc que celui ouvert. |
| `E_INKER_UNKNOWN_DIRECTIVE` | — | Une directive que le moteur ne connaît pas. |
| `E_INKER_UNKNOWN_TAG` | — | Aucun tag n'est enregistré sous ce nom. Enregistrez-le avec `templates.registerTag()`. |
| `E_INKER_INVALID_LAYOUT_POSITION` | — | `@layout` n'est pas la première instruction du template. |
| `E_INKER_DUPLICATE_LAYOUT` | — | Un template déclare plus d'un layout. |
| `E_INKER_NESTED_LAYOUT_UNSUPPORTED` | — | Un layout en étend un autre. |
| `E_INKER_LAYOUT_IN_PARTIAL` | — | Un partial déclare un layout. |
| `E_INKER_CIRCULAR_INCLUDE` | — | Des templates s'incluent en boucle. |
| `E_INKER_MISSING_SLOT` | — | Un composant exige un slot que l'appelant n'a pas rempli. |
| `E_INKER_UNKNOWN_SLOT` | — | L'appelant remplit un slot que le composant ne déclare pas. |
| `E_INKER_DISK_REQUIRED` | — | Un nom de template exige un disque et aucun n'est monté. |
| `E_INKER_DISK_COLLISION` | — | Deux disques sont montés sous le même nom. |
| `E_INKER_TEMPLATE_COLLISION` | — | Deux templates sont enregistrés sous le même nom. |
| `E_INKER_INVALID_EXPRESSION` | — | Une expression ne peut pas être évaluée. |
| `E_INKER_INVALID_ITERABLE` | — | `@each` a reçu quelque chose qui n'est pas itérable. |
| `E_INKER_HELPER_THROW` | — | Un helper a levé une erreur pendant le rendu. |
| `E_INKER_ASYNC_NOT_SUPPORTED` | — | Une construction qui rend de façon synchrone a utilisé `await`. |
| `E_INKER_RENDER_DEPTH` | — | Le rendu s'est imbriqué trop profondément. |
| `E_INKER_DUMP_DIE` | — | `@dd()` a arrêté le rendu et affiché sa valeur. |
| `E_INKER_INVALID_JSON_LD` | — | Une valeur donnée au helper JSON-LD ne peut pas tenir en JSON-LD. |
| `E_INKER_TEMPLATE_ERROR` | — | Un template a levé une erreur lui-même. |
| `E_INKER_ENGINE_MISSING` | — | Un template a été rendu par le singleton inker avant que `InkerProvider` ne construise le moteur. |
| `E_INKER_NAPI_REQUIRED` | — | Il n'existe pas de binaire natif inker pour cette plateforme. |

## Erreurs Lumen

| Code | HTTP | Description |
|------|------|-------------|
| `E_LUMEN_INVALID_COLUMN` | — | Une table a reçu une forme de colonne qu'elle n'a pas. |

## Erreurs Neutrino

| Code | HTTP | Description |
|------|------|-------------|
| `E_NEUTRINO_INVALID_DESCRIPTOR` | — | Les octets ne sont pas un `FileDescriptorSet` valide. |
| `E_NEUTRINO_DUPLICATE_TYPE` | — | Deux descripteurs déclarent le même type différemment. |
| `E_NEUTRINO_UNKNOWN_TYPE` | — | Aucun type message ou enum de ce nom n'est chargé. |
| `E_NEUTRINO_UNKNOWN_METHOD` | — | Aucune méthode de ce chemin n'est chargée. |
| `E_NEUTRINO_INVALID_MESSAGE` | — | Les octets ne sont pas un message valide de ce type. |
| `E_NEUTRINO_INVALID_METADATA` | — | Des métadonnées gRPC binaires sont mal formées ; le serveur répond INTERNAL. |
| `E_NEUTRINO_GRPC_STATUS` | — | `GrpcError` : une méthode répond un statut gRPC au lieu d'une réponse ; son message part au client comme détail du statut. |
| `E_NEUTRINO_DUPLICATE_SERVICE` | — | Un service est enregistré deux fois. |
| `E_NEUTRINO_INVALID_IMPLEMENTATION` | — | L'implémentation d'une méthode n'est pas une fonction. |
| `E_NEUTRINO_STREAMING_UNSUPPORTED` | — | Une méthode en flux a été enregistrée ; seules les méthodes unaires sont servies. |
| `E_NEUTRINO_INVALID_OPTION` | — | Une option de taille n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| `E_NEUTRINO_GRPC_UNSUPPORTED` | — | Le serveur n'a pas de méthode `grpc()`. Mettez à jour `@c9up/ream`. |

## Erreurs Nova

| Code | HTTP | Description |
|------|------|-------------|
| `E_NOVA_INVALID_SUBSCRIPTION` | 400 | Le corps d'abonnement ou de désabonnement n'est pas un `PushSubscription` valide. |
| `E_NOVA_SUBSCRIPTION_CONFLICT` | 409 | Une autre requête écrivait le même point de terminaison au même moment. Relancez l'abonnement. |
| `E_NOVA_SUBSCRIPTION_NOT_FOUND` | 404 | L'utilisateur n'a pas cet abonnement. |
| `E_NOVA_MISSING_USER` | — | Le handler d'abonnement a tourné sans utilisateur authentifié. |
| `E_NOVA_INVALID_USER_ID` | — | L'utilisateur authentifié n'a pas d'id utilisable (une chaîne non vide ou un entier). |
| `E_NOVA_VAPID_NOT_CONFIGURED` | — | Une clé VAPID ou le sujet manque. |
| `E_NOVA_HTTP_CLIENT_MISSING` | — | Envoyer une notification exige le client HTTP sortant de `@c9up/ream`. |
| `E_NOVA_UNKNOWN_STORE` | — | La configuration nomme un store qu'elle ne déclare pas. |
| `E_NOVA_INVALID_TABLE` | — | Le nom de table du store SQL n'est pas un identifiant simple. |
| `E_NOVA_INVALID_PREFIX` | — | Le préfixe de clés du store Redis contient un espace. |
| `E_NOVA_STORE_BUSY` | — | Un abonnement a changé à chaque tentative d'écriture. |
| `E_NOVA_STORE_FILE_UNREADABLE` | — | Le fichier du store fichier n'est pas du JSON valide. |
| `E_NOVA_QUASAR_MISSING` | — | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| `E_NOVA_REDIS_INCOMPLETE` | — | La connexion quasar n'a pas ce dont nova a besoin. |

## Erreurs Parsec

| Code | HTTP | Description |
|------|------|-------------|
| `E_PARSEC_INVALID_NAME` | — | Un nom de métrique ou de label n'est pas valide. |
| `E_PARSEC_INVALID_INSTRUMENT` | — | Un instrument est déclaré avec des options qu'il ne peut pas avoir. |
| `E_PARSEC_INSTRUMENT_CONFLICT` | — | Un nom de métrique est déjà déclaré avec un autre type, une autre aide ou d'autres labels. |
| `E_PARSEC_INVALID_MEASUREMENT` | — | Une mesure n'est pas un nombre fini. |
| `E_PARSEC_INVALID_LABEL_VALUE` | — | Une valeur de label n'est ni une chaîne ni un nombre fini. |
| `E_PARSEC_UNDECLARED_LABEL` | — | Une mesure a reçu un label que la métrique ne déclare pas. |
| `E_PARSEC_UNKNOWN_EXPORTER` | — | Un nom d'exporteur n'est pas déclaré. |
| `E_PARSEC_UNPROTECTED_ENDPOINT` | — | Le point de terminaison des métriques serait servi sans protection. Fixez un token, ou `public: true` délibérément. |
| `E_PARSEC_EMPTY_TOKEN` | — | Le token du point de terminaison des métriques est vide, ce qui accepterait une requête sans identifiants. |

## Erreurs Photon

Les erreurs côté serveur sont levées par `@c9up/photon` (SSR / renderer) ; les erreurs côté navigateur par `@c9up/photon/client` (hydratation / SPA-nav). Chaque code expose un `docsUrl` qui pointe vers son ancre ci-dessous — l'opérateur saute directement du terminal aux instructions de récupération.

### E_PHOTON_INVALID_CONFIG

**Cause.** Un champ de `config/photon.ts` (ou la `PhotonConfig` passée à `PhotonRenderer`) échoue la validation : `buildDir` se résout en dehors de la racine du projet, ou `ssr.entrypoint` / `entryClient` contient des segments de path-traversal ou des caractères hors de `[\w./\-@#]`.

**Fix.**
1. Ouvre `config/photon.ts` et vérifie que `buildDir` est un path relatif INTÉRIEUR au projet (par ex. `dist`, PAS `../dist`).
2. Vérifie que `ssr.entrypoint` et `entryClient` sont des paths relatifs sans segments `..` et se terminent par `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Redémarre le renderer (`PhotonRenderer.boot()` revalide).

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
| `E_PRISM_IMAGE_NO_SOURCE` | 400 | `/__image` a été appelé sans `src`. |
| `E_PRISM_IMAGE_WIDTH_NOT_ALLOWED` | 400 | `w` n'est pas une des largeurs configurées. |
| `E_PRISM_IMAGE_FORMAT_NOT_ALLOWED` | 400 | `f` n'est pas un des formats configurés. |
| `E_PRISM_IMAGE_QUALITY_NOT_ALLOWED` | 400 | `q` n'est pas une des qualités configurées. |
| `E_PRISM_IMAGE_NOT_FOUND` | 404 | Aucune image à `src`. |
| `E_PRISM_IMAGE_UNPROCESSABLE` | 422 | La source n'est pas une image que le point de terminaison peut servir. |
| `E_PRISM_IMAGE_BUSY` | 503 | Trop d'images sont en cours de rendu ; réessayez sous peu. |
| `E_PRISM_EMPTY_INPUT` | — | L'entrée est vide. |
| `E_PRISM_INPUT_TOO_LARGE` | — | L'entrée dépasse la limite d'octets. |
| `E_PRISM_TOO_MANY_PIXELS` | — | L'image, ou celle qu'une opération construirait, dépasse le plafond de pixels ; refusée avant l'allocation. |
| `E_PRISM_ZERO_DIMENSION` | — | L'image a une largeur ou une hauteur nulle. |
| `E_PRISM_UNKNOWN_FORMAT` | — | Les octets ne sont pas un format d'image que prism reconnaît. |
| `E_PRISM_UNSUPPORTED_FORMAT` | — | Le format est reconnu mais pas pris en charge. |
| `E_PRISM_FORMAT_NOT_ALLOWED` | — | Une vraie image, dans un format que l'application a choisi de ne pas décoder. |
| `E_PRISM_UNREADABLE` | — | L'image ne peut pas être lue. |
| `E_PRISM_DECODE_FAILED` | — | Le décodage de l'image a échoué. |
| `E_PRISM_ENCODE_FAILED` | — | L'encodage de la sortie a échoué. |
| `E_PRISM_INVALID_GEOMETRY` | — | Une géométrie que l'image ne peut pas satisfaire : un recadrage hors de ses bords, une taille cible nulle. |
| `E_PRISM_INVALID_FONT` | — | Une police ne peut pas être utilisée. |
| `E_PRISM_COLOUR_SPACE` | — | Un espace colorimétrique innommable, ou une conversion que le modèle refuse. |
| `E_PRISM_INVALID_OPERATION` | — | Une opération n'a pas un champ requis, ou en a un hors bornes. |
| `E_PRISM_QR_TOO_LONG` | — | Plus de texte qu'un QR code ne peut en contenir au niveau et à la version choisis. |
| `E_PRISM_INVALID_QR_OPTION` | — | Une option de QR code hors bornes, ou une couleur qui n'est pas en hexadécimal strict. |
| `E_PRISM_INTERNAL_PANIC` | — | Le moteur a paniqué ; toujours un bug de prism. |
| `E_PRISM_ENGINE` | — | Le moteur a échoué sans code connu. |
| `E_PRISM_NATIVE_REQUIRED` | — | Le moteur d'images Rust n'est pas chargé. |

## Erreurs Quasar

| Code | HTTP | Description |
|------|------|-------------|
| `E_INVALID_BYTES_VALUE` | 500 | Un seuil mémoire du contrôle de santé Redis ne peut pas être lu comme une taille. |

## Erreurs Ream MCP

Renvoyées dans le résultat de l'outil de templates du serveur MCP.

| Code | HTTP | Description |
|------|------|-------------|
| `E_INKER_RENDER_TIMEOUT` | — | Un rendu de template a pris plus de temps que l'outil ne le permet. |
| `E_INKER_UNKNOWN` | — | Un rendu de template a échoué sans code inker. |

## Erreurs Relay

Renvoyées dans le corps JSON des routes relay, ou en événement `error` sur un hub.

| Code | HTTP | Description |
|------|------|-------------|
| `E_RELAY_BAD_REQUEST` | 400 | `subscribe` sans `uid` ni `channel` exploitables (deux chaînes non vides). |
| `E_RELAY_CHANNEL_TOO_LONG` | 400 | Le nom du canal dépasse 256 caractères. |
| `E_RELAY_NOT_CONNECTED` | 400 | Aucune connexion n'a cet uid sur cette instance — elle s'est fermée, ou la requête est arrivée sur une autre instance (voir *Plusieurs instances*). |
| `E_RELAY_NOT_OWNER` | 403 | La connexion a été ouverte par un autre utilisateur ; subscribe, unsubscribe et trames de hub doivent venir du même. |
| `E_RELAY_CHANNEL_NO_AUTHORIZER` | 403 | Aucun `relay.authorize()` ne couvre le canal, et `allowUnauthorizedChannels` est désactivé. |
| `E_RELAY_CHANNEL_FORBIDDEN` | 403 | L'autorisateur du canal a refusé, ou levé une erreur. |
| `E_RELAY_MAX_CHANNELS` | 429 | La connexion tient déjà `maxChannelsPerClient` canaux. |
| `E_RELAY_MAX_CLIENTS` | — | L'instance tient déjà `maxClients` connexions ; envoyé en trame `error` avant la fermeture du flux. |
| `E_RELAY_MAX_CLIENTS_PER_OWNER` | — | Cet utilisateur tient déjà le nombre maximal de connexions ; envoyé en trame `error` avant la fermeture du flux. |
| `E_RELAY_UNKNOWN_CONNECTION` | 400 | Une requête de hub sans token de connexion valide — appelez d'abord `<path>/negotiate`. |
| `E_RELAY_MAX_CONNECTIONS` | 503 | Un hub a déjà `maxConnections` flux ouverts. |
| `E_RELAY_MAX_CONNECTIONS_PER_OWNER` | 503 | Ce client a déjà le nombre maximal de flux de hub ouverts. |
| `E_RELAY_MAX_PENDING` | 503 | Trop de connexions de hub sont négociées et pas encore ouvertes. |
| `E_RELAY_SHUT_DOWN` | 503 | Le service temps réel est en cours d'arrêt. |
| `E_RELAY_UNAUTHORIZED` | — | Une invocation de hub exige un utilisateur authentifié, ou authentifié par un autre garde. |
| `E_RELAY_FORBIDDEN` | — | Une invocation de hub n'a pas le rôle ou la permission exigés. |
| `E_RELAY_UNKNOWN_EVENT` | — | Une invocation de hub ne nomme aucun handler. |
| `E_RELAY_HANDLER_ERROR` | — | Un handler de hub a levé une erreur. |

## Erreurs Rover

| Code | HTTP | Description |
|------|------|-------------|
| `E_MAIL_INVALID_MESSAGE` | — | Un message n'a pas ce que l'envoi exige (une adresse `from`, un destinataire…). |
| `E_MAIL_INVALID_ADDRESS` | — | Une adresse n'est pas une adresse mail valide. |
| `E_MAIL_HEADER_INJECTION` | — | Une valeur de header contient un saut de ligne ou un NUL. |
| `E_INVALID_LIST_HEADER` | — | Une entrée de header `List-*` n'est pas une URL (https, http, mailto ou ftp) ou une adresse simple. |
| `E_MAIL_FIELD_UNSUPPORTED` | — | Le transport ne sait pas fixer un champ que le message utilise (comme l'enveloppe SMTP). |
| `E_ATTACHMENT_UNREADABLE` | — | Le fichier d'une pièce jointe ne peut pas être lu. |
| `E_MAIL_PROVIDER_CONFIG` | — | La configuration d'un transport est invalide. |
| `E_MAIL_PROVIDER_ERROR` | — | Le transport n'a pas pu envoyer ; l'erreur porte le statut du fournisseur ou le code réseau. |
| `E_MAIL_RETRY_CONFIG` | — | Un réglage de nouvelle tentative est hors bornes. |
| `E_MAIL_CONFIG_MISSING` | — | Aucune configuration `mail` n'est enregistrée. Créez `config/mail.ts`, ou lancez `ream configure @c9up/rover`. |
| `E_MAIL_UNKNOWN_MAILER` | — | Un nom de mailer, ou le mailer par défaut, n'est pas configuré. |
| `E_MAIL_UNKNOWN_TRANSPORT` | — | Un type de transport est inconnu. |
| `E_MAIL_JOB_MALFORMED` | — | Le contenu d'une tâche mail en file manque ou n'est pas un objet. |
| `E_MAIL_TEMPLATE_ENGINE` | — | L'application utilise inker mais rover ne peut pas rendre les vues mail avec. |
| `E_MAIL_TEMPLATE_NOT_FOUND` | — | Un template mail est introuvable. |
| `E_MAIL_TEMPLATE_READ_ERROR` | — | Un template mail ne peut pas être lu. |
| `E_MAIL_TEMPLATE_SYNTAX` | — | Un template mail a une erreur de syntaxe. |
| `E_MAIL_TEMPLATE_RECURSION` | — | Des templates mail s'incluent trop profondément. |
| `E_MAIL_TEMPLATE_NAPI_REQUIRED` | — | Il n'existe pas de binaire natif rover pour cette plateforme. |
| `E_ASSERTION_FAILED` | — | Une assertion du faux mailer sur un message envoyé a échoué. |
| `E_ROVER_UNKNOWN` | — | Un envoi a échoué avec une erreur sans code propre. |

## Erreurs Rune

Rune normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_RUNE_`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_VALIDATION_ERROR` | 422 | `validateOrThrow()` a trouvé des données invalides. Porte un tableau `messages` avec une entrée par champ et par règle. |
| `E_RUNE_META_REQUIRED` | — | Un validateur construit avec `withMetaData()` a été appelé sans `{ meta }`. |
| `E_RUNE_NOT_A_REGULAR_FILE` | — | Une valeur `file()` n'est pas un fichier ordinaire : ce n'est pas un envoi. |
| `E_RUNE_INVALID_SIZE` | — | `file()` a reçu une taille illisible. |
| `E_RUNE_INVALID_ERROR_REPORTER` | — | `errorReporter` ne prend pas d'argument et n'a pas rendu de reporter (`{ report, createError }`). |
| `E_RUNE_INVALID_RULE` | — | `use()` a reçu autre chose qu'une règle compilée ; appelez d'abord la factory. |
| `E_RUNE_NO_RULE` | — | `message()` a été appelé avant toute règle. |
| `E_RUNE_NOT_AN_OBJECT` | — | `merge()` (ou une méthode de forme semblable) exige une forme `object()`. |
| `E_RUNE_PARTIAL_NOT_APPLICABLE` | — | `partial()` ne peut pas assouplir une forme qui a des groupes ou `allowUnknownProperties()`. |
| `E_RUNE_NO_TYPE_RULE` | — | Une branche de `unionOfTypes()` ne déclare aucun type. |
| `E_RUNE_DUPLICATE_UNION_TYPE` | — | Deux branches de `unionOfTypes()` déclarent le même type. |
| `E_RUNE_ASYNC_RULE_NOT_AWAITED` | — | Une exécution synchrone a rencontré une règle asynchrone. Utilisez la variante asynchrone. |
| `E_RUNE_NO_DATABASE_RESOLVER` | — | Une règle de base (`unique`, `exists`) n'a pas de résolveur. Appelez `bindDatabase()` au démarrage, ou passez un callback. |
| `E_RUNE_NO_HOST_RESOLVER` | — | `activeUrl()` exige un résolveur d'hôte. |
| `E_RUNE_UNSUPPORTED_LOCALE` | — | `mobile()` n'a pas de plan de numérotation pour la locale. |
| `E_RUNE_UNSUPPORTED_COUNTRY` | — | Une règle propre à un pays (`postalCode()`…) n'a pas de motif pour ce pays. |
| `E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET` | — | Une cible JSON Schema que rune n'émet pas. |
| `E_RUNE_NO_OUTPUT_SCHEMA` | — | La sortie d'un validateur ne peut pas être décrite en JSON Schema : une transformation peut produire n'importe quoi. |
| `E_RUNE_NAPI_REQUIRED` | — | Le moteur de validation Rust n'est pas chargé. |
| `E_RUNE_NAPI_NOT_FOUND` | — | Le binaire du moteur de validation Rust est introuvable. |
| `E_RUNE_NAPI_REQUEST_REFUSED` | — | Le moteur de validation Rust a refusé la demande. |
| `E_RUNE_NAPI_INVALID_RESPONSE` | — | Le moteur de validation Rust a rendu une forme inattendue. |

## Erreurs Sigil

| Code | HTTP | Description |
|------|------|-------------|
| `E_SIGIL_UNKNOWN_DRIVER` | — | Un hasher nomme un driver que sigil ne connaît pas. |
| `E_SIGIL_NAPI_REQUIRED` | — | Le driver exige le moteur Rust, qui n'est pas chargé. |
| `E_SIGIL_NOT_BOOTED` | — | `hash.<membre>` a été utilisé avant que `SigilProvider.boot()` ne tourne. |

## Erreurs Spectrum

| Code | HTTP | Description |
|------|------|-------------|
| `E_SPECTRUM_UNKNOWN_LEVEL` | — | Le niveau d'une cible de transport n'est pas un niveau de log. |
| `E_SPECTRUM_UNSUPPORTED_TARGET` | — | Une cible de transport que spectrum ne construit pas. Passez un `LogChannel` pour écrire ailleurs. |
| `E_SPECTRUM_INVALID_FILE_OPTIONS` | — | Une destination fichier n'est ni un chemin ni un descripteur de fichier. |
| `E_SPECTRUM_INVALID_LINE_OPTIONS` | — | Une option de ligne JSON est invalide. |
| `E_SPECTRUM_INVALID_REDACT_PATH` | — | Un chemin de masquage ne peut pas être analysé. |
| `E_SPECTRUM_INVALID_STRINGIFY_LIMIT` | — | Une limite de sérialisation n'est pas un entier positif. |
| `E_SPECTRUM_UNSUPPORTED_OPTION` | — | Une option de logger que spectrum ne prend pas en charge. |
| `E_SPECTRUM_LOGGER_NOT_BOUND` | — | Le conteneur a résolu autre chose qu'un `Logger` pour le token `Logger`. |

## Erreurs Station

| Code | HTTP | Description |
|------|------|-------------|
| `E_STATION_LOGIN_CREDENTIALS_REQUIRED` | 400 | Le formulaire de connexion admin a été envoyé sans email ou sans mot de passe. |
| `E_STATION_INVALID_CREDENTIALS` | 401 | Email ou mot de passe invalide. |
| `E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | 429 | Trop de tentatives de connexion ; réessayez plus tard. |
| `E_STATION_LOGIN_UNAVAILABLE` | 503 | La connexion est temporairement indisponible. |
| `E_STATION_CSRF_REQUIRED` | 403 | Une action admin exige un token CSRF actif et vérifié. |
| `E_VALIDATION_ERROR` | 422 | Un formulaire admin n'a pas passé la validation (clients JSON ; un navigateur est renvoyé en arrière). |

## Erreurs Transit

| Code | HTTP | Description |
|------|------|-------------|
| `E_TRANSIT_INVALID_XML` | — | Un fournisseur a répondu un XML illisible, ou qui utilise une construction que transit refuse. |

## Erreurs Vellum

Vellum normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_VELLUM_`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_VELLUM_INVALID_PDF` | — | Les octets ne sont pas un PDF que vellum sait lire. |
| `E_VELLUM_SIGNED_DOCUMENT` | — | Une modification invaliderait les signatures du document ; refusée sauf si l'appelant accepte de les perdre. |
| `E_VELLUM_INVALID_PAGE` | — | Un numéro de page n'est pas un entier à partir de 1. |
| `E_VELLUM_INVALID_ROTATION` | — | Une rotation n'est pas un multiple de 90. |
| `E_VELLUM_EMPTY_MERGE` | — | `merge()` n'a reçu aucun document. |
| `E_VELLUM_EMPTY_SELECTION` | — | Une sélection exige au moins une page. |
| `E_VELLUM_MERGE_FAILED` | — | La fusion de documents a échoué. |
| `E_VELLUM_SELECT_FAILED` | — | La sélection de pages a échoué. |
| `E_VELLUM_SPLIT_FAILED` | — | Le découpage du document a échoué. |
| `E_VELLUM_ROTATE_FAILED` | — | La rotation de pages a échoué. |
| `E_VELLUM_STAMP_FAILED` | — | L'apposition d'une image a échoué. |
| `E_VELLUM_STAMP_TEXT_FAILED` | — | L'apposition d'un texte a échoué. |
| `E_VELLUM_FILL_FAILED` | — | Le remplissage du formulaire a échoué. |
| `E_VELLUM_FLATTEN_FAILED` | — | L'aplatissement du formulaire a échoué. |
| `E_VELLUM_RENDER_FAILED` | — | Le rendu d'une page en image a échoué. |
| `E_VELLUM_EXTRACT_FAILED` | — | L'extraction du texte a échoué. |
| `E_VELLUM_WRITE_FAILED` | — | L'écriture du document a échoué. |
| `E_VELLUM_SIGN_FAILED` | — | La signature du document a échoué. |
| `E_VELLUM_VERIFY_FAILED` | — | La vérification des signatures a échoué. |
| `E_VELLUM_UNKNOWN_SIGNER` | — | Aucun signataire de ce nom n'est configuré. |
| `E_VELLUM_SIGNER_INVALID` | — | La clé ou le certificat d'un signataire est vide. |
| `E_VELLUM_TIMESTAMP_FAILED` | — | La construction ou la lecture d'un horodatage a échoué. |
| `E_VELLUM_TIMESTAMP_UNREACHABLE` | — | L'autorité d'horodatage n'a pas pu être jointe. |
| `E_VELLUM_TIMESTAMP_REFUSED` | — | L'autorité d'horodatage a répondu un statut d'erreur. |
| `E_VELLUM_FONT_UNREADABLE` | — | Un fichier de police configuré ne peut pas être lu. |
| `E_VELLUM_FILE_NOT_FOUND` | — | Un fichier donné par chemin ne peut pas être lu. |
| `E_VELLUM_INVALID_OPTIONS` | — | Une option de document, de page, de tableau ou de dessin est invalide. |
| `E_VELLUM_INVALID_COLOR` | — | Une couleur ne peut pas être lue. |
| `E_VELLUM_INVALID_IMAGE` | — | Une image ne peut pas être utilisée (illisible, ou ouverte par un autre document). |
| `E_VELLUM_INVALID_SVG` | — | Un SVG ne peut pas être utilisé ; passez un fichier en URL ou en octets. |
| `E_VELLUM_UNSUPPORTED_CONTENT` | — | Un tracé contient un opérateur que vellum ne dessine pas. |
| `E_VELLUM_INVALID_STRUCTURE` | — | Un élément de structure a été modifié après sa fin. |
| `E_VELLUM_NO_PAGE` | — | Il n'y a pas de page courante ; appelez d'abord `addPage()`. |
| `E_VELLUM_NO_FORM` | — | Des champs de formulaire ont été ajoutés avant `initForm()`. |
| `E_VELLUM_DOCUMENT_ENDED` | — | Le document est terminé ; on ne peut plus rien y ajouter. |
| `E_VELLUM_NAPI_REQUIRED` | — | Le moteur PDF Rust n'est pas chargé. |

## Erreurs Visa

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | 403 | `currentAccessToken.authorize()` a trouvé un token trop restreint pour l'ability demandée. 403, pas 401 : la requête est authentifiée (`insufficient_scope`). |
| `E_VISA_MISSING_ISSUER` | — | Aucun `issuer` n'est configuré. |
| `E_VISA_INVALID_ISSUER` | — | L'`issuer` n'est pas une URL. |
| `E_VISA_INSECURE_ISSUER` | — | L'`issuer` n'est pas en https (localhost excepté). |
| `E_VISA_NO_REDIRECT_URI` | — | Un client a été enregistré sans URI de redirection. |
| `E_VISA_INVALID_REDIRECT_URI` | — | Une URI de redirection n'est pas une URL complète. |
| `E_VISA_INVALID_INITIAL_ACCESS_TOKEN` | — | `registration.initialAccessToken` est vide, ce qui accepterait un bearer vide. |
| `E_VISA_INVALID_SECRET_TTL` | — | `registration.secretTtlSeconds` n'est pas un nombre entier de secondes positif. |
| `E_VISA_STORE_READ_ONLY` | — | Le store de clients ne peut pas enregistrer de clients. |

## Erreurs Warden

Warden normalise ses codes : un code qui commence déjà par `E_` est gardé, tout autre reçoit le préfixe `E_WARDEN_`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | 401 | Aucun garde n'a authentifié la requête. Une route gardée répond avec ce code. |
| `E_INVALID_CREDENTIALS` | 400 | La classe d'erreur qu'un flux de connexion lève quand les identifiants ne correspondent pas. |
| `E_WARDEN_AUTH_STRATEGY_ERROR` | 500 | Tous les gardes tentés ont planté (base de données indisponible, bug) : un incident serveur, distinct d'un refus d'identifiants. |
| `E_WARDEN_FORBIDDEN` | 403 | L'utilisateur n'a pas une permission ou un rôle que la route déclare. |
| `E_WARDEN_MFA_REQUIRED` | 403 | La route déclare `@RequireMfa` et l'utilisateur n'a pas passé l'étape renforcée. |
| `E_WARDEN_AUTHORIZATION_FAILURE` | 403 | Une ability ou une policy du bouncer a refusé l'action (403, sauf si la policy donne un autre statut). |
| `E_WARDEN_UNAUTHORIZED` | 401 | Le `expressMiddleware()` autonome n'a trouvé aucun token ou l'a refusé. |
| `E_WARDEN_AUTH_ERROR` | 500 | Le `expressMiddleware()` autonome a échoué en interne. |
| `E_WARDEN_NO_AUTH_CONFIG` | — | `WardenProvider` a démarré sans aucun garde configuré. |
| `E_WARDEN_NAPI_REQUIRED` | — | Le moteur JWT Rust n'est pas chargé. |
| `E_WARDEN_NOT_BOOTED` | — | Le singleton `AuthManager` a été utilisé avant que `WardenProvider.boot()` ne tourne. |
| `E_WARDEN_AUTH_NOT_REGISTERED` | — | `AuthManager` n'est pas dans le conteneur ; ajoutez `WardenProvider` aux providers. |
| `E_WARDEN_INVALID_CONFIG` | — | Un réglage de garde, de token, de MFA ou de limite de débit est invalide. |
| `E_WARDEN_STRATEGY_NOT_FOUND` | — | Un nom de garde n'est pas configuré. |
| `E_WARDEN_STRATEGY_CANNOT_ISSUE` | — | `issueFor()` sur un garde qui n'émet pas de tokens. |
| `E_WARDEN_STRATEGY_CANNOT_LOGIN` | — | `login()` / `logout()` sur un garde sans état (JWT, clé d'API). |
| `E_WARDEN_STRATEGY_HAS_NO_CLIENT` | — | Un garde n'a pas d'`authenticateAsClient()` : il ne peut pas forger une requête client en test. |
| `E_WARDEN_USE_LOGIN` | — | Le garde de session n'a pas d'étape d'identifiants. Vérifiez le mot de passe vous-même, puis appelez `login(user)`. |
| `E_WARDEN_NO_SESSION` | — | `login()` / `logout()` d'un garde de session a tourné sans `ctx.session` ; enregistrez d'abord le middleware de session. |
| `E_WARDEN_REMEMBER_ME_UNAVAILABLE` | — | Le « se souvenir de moi » a été demandé et aucun token de ce type n'est configuré. |
| `E_WARDEN_TOKEN_TTL_INVALID` | — | Le TTL d'un refresh token n'est pas un nombre fini et positif. |
| `E_WARDEN_OTP_STORE_FULL` | — | Le store OTP en mémoire tient son maximum de défis en attente. |
| `E_WARDEN_OTP_STORE_CONTRACT` | — | Le store de défis OTP n'implémente pas `take()`. |
| `E_WARDEN_WEBAUTHN_STORE_FULL` | — | Le store de défis WebAuthn en mémoire tient son maximum de cérémonies en attente. |
| `E_WARDEN_STORE_TTL_INVALID` | — | Le `ttlMs` d'un store de défis n'est pas un entier positif. |
| `E_WARDEN_STORE_LIMIT_INVALID` | — | Le `maxEntries` d'un store de défis n'est pas un entier positif. |
| `E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS` | — | L'identifiant de credential WebAuthn est déjà enregistré ; l'enregistrement répond `{ verified: false }`. |
| `E_WARDEN_INVALID_CREDENTIAL` | — | Une clé publique WebAuthn stockée est mal formée. |
| `E_WARDEN_INVALID_ABILITY` | — | `Bouncer.ability()` a reçu des options sans callback. |
| `E_WARDEN_UNKNOWN_ABILITY` | — | Aucune ability de ce nom n'est enregistrée sur le bouncer. |
| `E_WARDEN_UNKNOWN_POLICY` | — | Aucune policy de ce nom n'est enregistrée sur le bouncer. |
| `E_WARDEN_UNKNOWN_POLICY_ACTION` | — | Une policy n'a pas de méthode pour l'action. |
| `E_WARDEN_POLICY_RESOLUTION_FAILED` | — | Le conteneur a résolu une policy en autre chose qu'une instance de sa classe. |
| `E_WARDEN_TEMPLATE_ENGINE_UNUSABLE` | — | Le moteur de templates est installé mais `@can` / `@cannot` ne peuvent pas y être enregistrés. |
