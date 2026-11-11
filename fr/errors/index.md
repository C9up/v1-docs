# Codes d'erreur

Chaque erreur du framework porte un `code` stable qui commence par `E_`. Les codes
propres à un paquet ajoutent le nom du paquet (`E_ATLAS_EMPTY_SELECT`,
`E_WARDEN_FORBIDDEN`) ; quelques identifiants partagés gardent une forme simple
(`E_ROW_NOT_FOUND`, `E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Cherchez le
code ci-dessous.

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

| Code | Description |
|------|-------------|
| `E_CONTAINER_NOT_FOUND` | Aucun binding trouvé pour le token demandé. Inclut des suggestions « vouliez-vous dire ? » pour les fautes de frappe. Enregistrez-le avec `container.singleton()` ou décorez la classe avec `@inject()`. |
| `E_CIRCULAR_DEPENDENCY` | Dépendance circulaire (ou alias circulaire) détectée pendant la résolution. Utilisez des factories explicites ou découplez via des événements. |
| `E_CONTAINER_MISSING_METADATA` | Une classe déclare des paramètres de constructeur mais le conteneur ne trouve aucune métadonnée de dépendance pour eux. Activez les métadonnées de décorateurs, annotez les paramètres avec `@inject()`, ou déclarez `static containerInjections`. |
| `E_CONTAINER_RESERVED_TOKEN` | Le nom du token se lit comme une clé d'`Object.prototype` (`constructor`, `__proto__`…). Choisissez un autre nom. |

## Erreurs Router

| Code | Description |
|------|-------------|
| `E_ROUTE_NOT_FOUND` | Aucune route ne correspond à la méthode et au chemin demandés (404). |

## Erreurs Pipeline

| Code | Description |
|------|-------------|
| `E_PIPELINE_UNKNOWN_MIDDLEWARE` | Une route référence un middleware nommé non enregistré. Enregistrez-le avec `middleware.register()`. |
| `E_PIPELINE_DOUBLE_NEXT` | Un middleware a appelé `next()` plus d'une fois. Chaque middleware doit appeler `next()` au plus une fois. |
| `E_PIPELINE_ERROR` | Un handler a levé une erreur qui ne porte aucun code du framework. L'erreur garde la position de l'étape dans son contexte. |

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

## Erreurs Atlas

Atlas normalise ses codes : un code qui commence déjà par `E_` est gardé, tout
autre reçoit le préfixe `E_ATLAS_`. Voir [Gestion des erreurs Atlas](../atlas/error-handling.md)
pour les sous-classes typées.

| Code | Description |
|------|-------------|
| `E_ROW_NOT_FOUND` | Une requête qui doit rendre une ligne n'en a trouvé aucune : `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. Porte `status = 404`. |
| `E_MASS_ASSIGNMENT` | `fill()` / `merge()` (et `create`, `createMany`, `updateOrCreate`) ont affecté un attribut hors de `fillable`, ou listé dans `guarded`. |
| `E_EXTRA_PROPERTIES` | Un remplissage a nommé une propriété qui n'est pas une colonne déclarée. |
| `E_MODEL_NOT_PERSISTED` | Une opération qui exige une ligne stockée (`delete()`, `refresh()`, `load*()`…) a tourné sur une instance locale. |
| `E_MISSING_PRIMARY_KEY` | La même opération a tourné sur une projection persistée qui ne contient pas la clé primaire. |
| `E_STRICT_MODE` | SQL brut refusé par le mode strict (le `raw()` d'un repository, ou une valeur `db.raw()` écrite par un repository). |
| `E_ATLAS_EMPTY_SELECT` | `select()` a été appelé sans colonnes. Fournissez au moins un nom de colonne. |
| `E_ATLAS_INVALID_PAGE` | `paginate()` a été appelé avec `page < 1`. |
| `E_ATLAS_INVALID_PER_PAGE` | `paginate()` a été appelé avec `perPage < 1`. |
| `E_ATLAS_INVALID_PAGINATION` | Une page, une taille de page ou un nombre de lignes qui n'est pas un entier fini et positif ou nul. |
| `E_ATLAS_INVALID_CTE_NAME` | Un nom de CTE doit être un identifiant valide (lettres, chiffres, underscores). |
| `E_ATLAS_INVALID_OPERATOR` | Un opérateur de `where()` ou `wherePivot()` hors de la liste autorisée. |
| `E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | `migrations.tableName` n'est pas un identifiant simple. |
| `E_ATLAS_MIGRATION_NOT_FOUND` | Une migration à exécuter ou à annuler n'a pas de fichier dans le répertoire de migrations. |
| `E_MIGRATION_LOCKED` | Une autre exécution tient le verrou de migration. Attendez-la, ou libérez un verrou resté bloqué avec `migration:unlock`. |
| `E_ROLLBACK_DISABLED_IN_PRODUCTION` | Un rollback, reset, refresh, fresh ou wipe en production sans `--force`. |
| `E_ATLAS_DRY_RUN_WRITE` | Une migration a tenté d'écrire pendant un `dryRun()`. |
| `E_ATLAS_INSECURE_SSLMODE` | La connexion demande `sslmode=prefer` ou `allow` (URL ou `PGSSLMODE`), qui repassent en clair sans le dire. Utilisez `disable` ou `verify-full`. Voir [Connexions chiffrées](../atlas/connections.md#connexions-chiffrees-tls). |
| `E_ATLAS_NAPI_NOT_FOUND` | Le compilateur de requêtes Rust n'est pas chargé. Une `Error` simple dont le message commence par le code. Voir [Dépannage](../atlas/troubleshooting.md). |
| `E_UNSAFE_IDENTIFIER`, `E_UNSAFE_SQL`, `E_UNSAFE_EXPRESSION` | Le compilateur Rust a refusé un identifiant, un fragment SQL ou une expression. Une `Error` simple dont le message commence par le code. |

## Erreurs Rune

| Code | Description |
|------|-------------|
| `E_VALIDATION_ERROR` | `validateOrThrow()` a trouvé des données invalides. Porte `status = 422` et un tableau `messages` avec une entrée par champ et par règle. |
| `E_RUNE_NAPI_REQUIRED` | Le moteur de validation Rust n'est pas chargé. |

## Erreurs Warden

| Code | Description |
|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | Aucun garde n'a authentifié la requête (401). Une route gardée répond avec ce code. |
| `E_INVALID_CREDENTIALS` | La classe d'erreur qu'un flux de connexion lève quand les identifiants ne correspondent pas (400). |
| `E_WARDEN_AUTH_STRATEGY_ERROR` | Tous les gardes tentés ont planté (base de données indisponible, bug) : un incident serveur, répondu en 500, distinct d'un refus d'identifiants. |
| `E_WARDEN_FORBIDDEN` | L'utilisateur n'a pas une permission ou un rôle que la route déclare (403). |
| `E_WARDEN_MFA_REQUIRED` | La route déclare `@RequireMfa` et l'utilisateur n'a pas passé l'étape renforcée (403). |
| `E_WARDEN_AUTHORIZATION_FAILURE` | Une ability ou une policy du bouncer a refusé l'action (403, sauf si la policy donne un autre statut). |
| `E_WARDEN_NO_AUTH_CONFIG` | `WardenProvider` a démarré sans aucun garde configuré. |
| `E_WARDEN_NAPI_REQUIRED` | Le moteur JWT Rust n'est pas chargé. |
| `E_WARDEN_UNAUTHORIZED`, `E_WARDEN_AUTH_ERROR` | Le `expressMiddleware()` autonome n'a trouvé aucun token ou l'a refusé (401), ou a échoué en interne (500). |

## Erreurs Console

| Code | Description |
|------|-------------|
| `E_CONSOLE_COMMAND_NOT_FOUND` | Aucune commande ne porte ce nom. |
| `E_CONSOLE_MISSING_ARGUMENT` | Un argument obligatoire n'a pas été donné. |
| `E_CONSOLE_UNEXPECTED_ARGUMENT` | Plus d'arguments que la commande n'en déclare. |
| `E_CONSOLE_UNKNOWN_FLAG` | Un flag que la commande ne déclare pas. |
| `E_CONSOLE_MISSING_FLAG` | Un flag obligatoire n'a pas été donné. |
| `E_CONSOLE_INVALID_FLAG_VALUE` | Une valeur de flag du mauvais type. |
| `E_CONSOLE_NOT_INTERACTIVE` | Une commande a posé une question alors que stdin n'est pas interactif. Passez la valeur en flag. |

## Erreurs Temps réel (Relay)

Renvoyées dans le corps JSON des routes relay, ou en événement `error` sur un hub.

| Code | Description |
|------|-------------|
| `E_RELAY_BAD_REQUEST` | `subscribe` sans `uid` ni `channel` exploitables (deux chaînes non vides). |
| `E_RELAY_CHANNEL_TOO_LONG` | Le nom du canal dépasse 256 caractères. |
| `E_RELAY_NOT_CONNECTED` | Aucune connexion n'a cet uid sur cette instance — elle s'est fermée, ou la requête est arrivée sur une autre instance (voir *Plusieurs instances*). |
| `E_RELAY_NOT_OWNER` | La connexion a été ouverte par un autre utilisateur ; subscribe, unsubscribe et trames de hub doivent venir du même. |
| `E_RELAY_CHANNEL_NO_AUTHORIZER` | Aucun `relay.authorize()` ne couvre le canal, et `allowUnauthorizedChannels` est désactivé. |
| `E_RELAY_CHANNEL_FORBIDDEN` | L'autorisateur du canal a refusé, ou levé une erreur. |
| `E_RELAY_MAX_CHANNELS` | La connexion tient déjà `maxChannelsPerClient` canaux. |
| `E_RELAY_MAX_CLIENTS` | L'instance tient déjà `maxClients` connexions ; envoyé en trame `error` avant la fermeture du flux. |
| `E_RELAY_UNKNOWN_CONNECTION` | Une requête de hub sans token de connexion valide — appelez d'abord `<path>/negotiate`. |
| `E_RELAY_MAX_CONNECTIONS` | Un hub a déjà `maxConnections` flux ouverts (503). |
| `E_RELAY_UNAUTHORIZED` | Une invocation de hub exige un utilisateur authentifié, ou authentifié par un autre garde. |
| `E_RELAY_FORBIDDEN` | Une invocation de hub n'a pas le rôle ou la permission exigés. |
| `E_RELAY_UNKNOWN_EVENT` | Une invocation de hub ne nomme aucun handler. |
| `E_RELAY_HANDLER_ERROR` | Un handler de hub a levé une erreur. |

## Erreurs Sécurité (Blackhole)

| Code | Description |
|------|-------------|
| `E_BLACKHOLE_RATE_LIMITED` | Trop de requêtes de ce client (429, avec `Retry-After`). Attendez et réessayez. |
| `E_TOO_MANY_REQUESTS` | Un middleware de throttle ou `limiter.consume()` a trouvé la clé au-delà de son budget (429). |
| `E_BAD_CSRF_TOKEN` | Token CSRF invalide ou manquant. Renvoyez le cookie `XSRF-TOKEN` dans le header `X-XSRF-TOKEN` (ou le champ de formulaire `_csrf`). |
| `E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` | Une requête qui modifie l'état vient d'une autre origine — un autre hôte, ou le même hôte sur un autre schéma — absente de `csrf.trustedOrigins` (403). |
| `E_BLACKHOLE_PATH_TRAVERSAL` | Le chemin contient `..`, brut ou encodé en pourcentage (400). |
| `E_BLACKHOLE_PARAMETER_POLLUTION` | Une clé de la query string apparaît deux fois (les clés finissant par `[]` peuvent se répéter) (400). |
| `E_BLACKHOLE_MISSING_IP` | La limite de débit est active et la requête n'a pas d'adresse client sous laquelle la compter (400). |
| `E_BLACKHOLE_SESSION_NOT_READY` | Les tokens CSRF sont liés à la session (`csrf.session`) et la requête a atteint blackhole sans session : enregistrez le middleware de session avant celui de blackhole (500). |
| `E_BLACKHOLE_BLOCKED` | Un refus dont le moteur n'a pas fourni le corps sous forme d'erreur JSON. |
