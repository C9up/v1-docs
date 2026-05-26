# Codes d'erreur

Chaque erreur Ream inclut un code unique qui renvoie vers cette documentation. Quand vous voyez une erreur, cliquez sur l'URL docs ou cherchez le code ci-dessous.

## Format des erreurs

En mode développement, les erreurs affichent un diagnostic complet :

```
┌──────────────────────────────────────────────┐
│ [ATLAS_QUERY_ERROR] Column 'statsu' not found
│ Pipeline: 8/10 (Handler)
│ at app/modules/order/services/OrderService.ts:15
│
│ table: orders
│ column: statsu
│
│ Hint: Column 'statsu' does not exist. Did you mean 'status'?
│ Docs: https://docs.ream.dev/errors/ATLAS_QUERY_ERROR
└──────────────────────────────────────────────┘
```

En mode production, seuls le code et le message sont affichés.

## Erreurs Container

| Code | Description |
|------|-------------|
| `CONTAINER_NOT_FOUND` | Aucun binding trouvé pour le token demandé. Enregistrez-le avec `container.singleton()` ou `@Service()`. |
| `CONTAINER_CIRCULAR_DEPENDENCY` | Dépendance circulaire détectée. Utilisez `@Lazy()`, des factories explicites, ou découpler via Pulsar. |
| `CONTAINER_OVERRIDE_UNKNOWN` | Tentative de remplacer un token qui n'a pas de binding enregistré. |

## Erreurs Router

| Code | Description |
|------|-------------|
| `ROUTER_NOT_FOUND` | Aucune route ne correspond à la méthode et au chemin demandés. |
| `ROUTER_DUPLICATE` | Une route avec la même méthode et le même chemin est déjà enregistrée. |

## Erreurs Pipeline

| Code | Description |
|------|-------------|
| `PIPELINE_STAGE_FAILED` | Une erreur s'est produite à une étape spécifique du pipeline. Vérifiez la position dans le contexte. |
| `PIPELINE_UNKNOWN_MIDDLEWARE` | Une route référence un middleware nommé non enregistré. Enregistrez-le avec `middleware.register()`. |
| `PIPELINE_ERROR` | Erreur générique de pipeline. Vérifiez l'erreur originale pour les détails. |

## Erreurs Photon

Les erreurs côté serveur sont levées par `@c9up/photon` (SSR / renderer) ; les erreurs côté navigateur par `@c9up/photon/client` (hydratation / SPA-nav). Chaque code expose un `docsUrl` qui pointe vers son ancre ci-dessous — l'opérateur saute directement du terminal aux instructions de récupération.

### PHOTON_INVALID_CONFIG

**Cause.** Un champ de `config/photon.ts` (ou la `PhotonConfig` passée à `PhotonRenderer`) échoue la validation : `buildDir` se résout en dehors de la racine du projet, ou `entryServer` / `entryClient` contient des segments de path-traversal ou des caractères hors de `[\w./\-@#]`.

**Fix.**
1. Ouvre `config/photon.ts` et vérifie que `buildDir` est un path relatif INTÉRIEUR au projet (par ex. `dist`, PAS `../dist`).
2. Vérifie que `entryServer` et `entryClient` sont des paths relatifs sans segments `..` et se terminent par `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Redémarre le renderer (`PhotonRenderer.boot()` revalide).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_MANIFEST_MISSING

**Cause.** Le manifest Vite à `${buildDir}/manifest.json` est absent au moment où `PhotonRenderer.boot()` tourne en mode production. Le manifest est un artefact de build — son absence signifie presque toujours que le build n'a jamais été lancé pour ce déploiement, ou que la sortie du build n'a pas été embarquée.

**Fix.**
1. Lance le script de build (par ex. `pnpm build`) avant de démarrer le serveur en production.
2. Vérifie que ton pipeline de déploiement copie bien le dossier de build (par défaut `public/build/`) dans l'image runtime.
3. Confirme que `PhotonConfig.buildDir` correspond au chemin où Vite écrit sa sortie.

L'erreur levée porte `context: { manifestPath, buildDir }` pour le diagnostic, et `cause` forwarde l'erreur `fs.access` originale (utile pour distinguer ENOENT d'EACCES).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_SSR_LOAD_FAILED

**Cause.** Le manifest Vite est présent, mais le module SSR échoue au chargement : sortie de build manquante pour `entryServer`, erreur de syntaxe dans le fichier SSR bundlé, ou peer dependency manquante au runtime. À distinguer de `PHOTON_MANIFEST_MISSING` — ce dernier code est levé quand le manifest est absent ; celui-ci quand le manifest est là mais que `import()` du SSR rejette.

**Fix.**
1. Relance `ream build` (ou ton script de build) et lis attentivement les warnings.
2. Vérifie que le fichier SSR existe à l'un des chemins attendus (`<buildDir>/ssr/ssr.js` ou `<buildDir>/ssr/<entryName>.js`).
3. Si le build tourne mais l'import échoue quand même, inspecte le fichier bundlé pour des peer dependencies absentes (par ex. `react-dom/server` pour l'adapter React).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_SSR_RENDER_FAILED

**Cause.** Le module SSR s'est bien chargé, mais son appel `render(pageData)` a levé ou retourné une valeur non-string. Causes courantes : un composant lève pendant le render, un équivalent `useEffect` tourne côté serveur et accède à `window`, ou le SSR retourne `undefined`.

**Fix.**
1. Lis `error.cause` (ou le `hint`) — il porte le message d'erreur original du module SSR.
2. Audite le composant page pour des globaux navigateur (`window`, `document`, `localStorage`) accédés au niveau module ou dans le render.
3. Confirme que l'export `render()` du SSR retourne bien une string (React : `renderToString(...)` ; Vue : `renderToString(...)` de `@vue/server-renderer` ; Svelte : `<App />.render(...).html`).

**Lieu du throw :** `packages/photon/src/PhotonRenderer.ts`.

### PHOTON_HYDRATION_NO_DATA

**Cause.** L'appel `hydrate()` côté navigateur a tourné mais aucun bloc `<script id="photon-data" type="application/json">` n'a été trouvé dans le document. Signifie presque toujours que la page n'a PAS été rendue via `PhotonRenderer.render()` (réponse HTML écrite à la main, fichier statique, ou page 404).

**Fix.**
1. Confirme que la route qui renvoie cette page passe bien par `PhotonMiddleware` / `PhotonRenderer.render()`.
2. Si tu sers un fallback SPA, rends-le aussi via Photon — même un shell vide a besoin du bloc data pour que `hydrate()` le trouve.

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_BAD_DATA

**Cause.** Le bloc `<script id="photon-data">` a été trouvé, mais son contenu n'est pas un objet JSON avec la forme attendue `{ component, props, url, framework }`. Causes : mangling HTML par un CDN / proxy qui réencode les blocs script, double-escaping par un middleware qui ne sait pas que le bloc est censé rester du JSON brut, ou édition manuelle du template SSR.

**Fix.**
1. Inspecte la source de la page : le contenu du bloc doit faire un round-trip propre via `JSON.parse`.
2. Désactive tout middleware qui réécrit le HTML (compression, link-rewriting, injection de nonce CSP) qui touche le body — vérifie que le bloc reste intact en production.
3. Si tu as personnalisé le template SSR, garde le bloc `<script type="application/json" id="photon-data">…</script>` exactement tel que `PhotonRenderer.render()` l'émet.

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_NO_TARGET

**Cause.** Le sélecteur de cible d'hydratation (par défaut `#app`) n'a matché aucun nœud DOM. Habituellement une option `target` custom qui n'existe pas dans le HTML SSR, ou un `id="app"` retiré d'un template custom.

**Fix.**
1. Confirme que le HTML SSR contient bien l'élément qui matche `hydrate({ target })`.
2. Si tu as personnalisé l'enveloppe HTML du renderer, garde le `<div id="app">…</div>` (ou override `target` pour matcher l'id de ton wrapper).

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK

**Cause.** Le champ `framework` du bloc page-data n'est pas l'une des valeurs `react`, `vue` ou `svelte`. Soit le côté SSR a écrit une valeur inattendue, soit page-data a été fabriqué à la main avec une typo.

**Fix.**
1. Vérifie que `PhotonConfig.framework` côté serveur est bien réglé sur une valeur supportée.
2. Si tu sérialises page-data manuellement (rare), assure-toi que `framework` matche exactement le literal du union.

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### PHOTON_HYDRATION_ADAPTER_LOAD_FAILED

**Cause.** Photon a bien lu page-data et dispatché vers le bon adapter, mais l'`import()` dynamique du runtime du framework a rejeté. Presque toujours une peer dependency manquante : `react` + `react-dom` pour React, `vue` pour Vue, `svelte` pour Svelte.

**Fix.**
1. Installe le runtime du framework : `pnpm add react react-dom` (ou `vue`, ou `svelte`).
2. Le `cause` de l'erreur porte l'échec de résolution module original — utile quand le package est installé mais qu'un sous-chemin manque (par ex. `react-dom/client` requiert React 18+).

**Lieu du throw :** `packages/photon/src/client/hydrate.ts`.

### À propos des hydration mismatches

Les hydration mismatches (le HTML rendu côté serveur diffère du premier render côté client) ne sont **pas** levés par Photon. Chaque framework gère ce diagnostic lui-même :

- **React** : émet un `console.error` avec `Hydration failed because ...`. Voir https://react.dev/errors/418.
- **Vue** : émet un warning console `[Vue warn]: Hydration ...`.
- **Svelte** : émet une `Error: hydration_failed` depuis `svelte/internal`.

Si tu en vois un, la cause est presque toujours un **render non déterministe** : un `Date.now()`, un `Math.random()`, un `useEffect` qui ne tourne que côté client, ou un check `process.env` qui diffère entre serveur et navigateur. Le contrat de Photon est que `render(component, props)` est pur ; assure-toi que ton composant l'est aussi.

## Erreurs Atlas

| Code | Description |
|------|-------------|
| `ATLAS_QUERY_ERROR` | La compilation de la requête SQL a échoué. Vérifiez les noms de colonnes et opérateurs. |
| `ATLAS_NOT_ENTITY` | La classe passée à `BaseRepository` n'est pas décorée avec `@Entity()`. |
| `ATLAS_INVALID_IDENTIFIER` | Un identifiant SQL contient des caractères illégaux (guillemets doubles ou octets nuls). |
| `ATLAS_EMPTY_SELECT` | `select()` a été appelé sans colonnes. Fournissez au moins un nom de colonne. |
| `ATLAS_INVALID_PAGE` | `paginate()` a été appelé avec `page < 1`. |
| `ATLAS_INVALID_LIMIT` | `limit()` a été appelé avec une valeur négative. |
| `ATLAS_INVALID_OFFSET` | `offset()` a été appelé avec une valeur négative. |
| `ATLAS_INVALID_IN` | L'opérateur `IN` ou `NOT IN` requiert un tableau. |

## Erreurs Rune

| Code | Description |
|------|-------------|
| `RUNE_VALIDATION_FAILED` | La validation du schéma a échoué. Vérifiez `result.errors` pour les détails par champ. |
| `RUNE_NO_RULE` | `.message()` a été appelé avant qu'une règle ne soit ajoutée à la chaîne. |

## Erreurs Warden

| Code | Description |
|------|-------------|
| `WARDEN_STRATEGY_NOT_FOUND` | La stratégie d'auth demandée n'est pas enregistrée. Appelez `registerStrategy()` ou vérifiez votre `AuthConfig`. |
| `WARDEN_INVALID_CONFIG` | Le `defaultStrategy` dans `AuthConfig` n'existe pas dans la map `strategies`. |
| `WARDEN_UNAUTHORIZED` | Authentification échouée — identifiants ou token invalides. |
| `WARDEN_JWT_EXPIRED` | Le token JWT a expiré (le claim `exp` est dans le passé). Demandez un nouveau token. |
| `WARDEN_JWT_NOT_YET_VALID` | Le token JWT n'est pas encore valide (le claim `nbf` est dans le futur). Attendez jusqu'à l'heure `nbf`. |
| `WARDEN_JWT_SECRET_TOO_SHORT` | Le secret JWT doit faire au moins 32 octets. Utilisez un secret plus long et cryptographiquement aléatoire. |

## Erreurs Pulsar

| Code | Description |
|------|-------------|
| `PULSAR_TIMEOUT` | Un request/reply a expiré en attendant une réponse. |
| `PULSAR_NO_HANDLER` | Aucun handler de requête n'est enregistré pour ce nom d'event. |

## Erreurs Forge

| Code | Description |
|------|-------------|
| `FORGE_UNKNOWN_TYPE` | Type de générateur inconnu. Disponibles : `service`, `entity`, `controller`, `validator`, `provider`, `migration`. |

## Erreurs Sécurité (Blackhole)

| Code | Description |
|------|-------------|
| `RATE_LIMITED` | Trop de requêtes depuis cette IP. Attendez et réessayez. |
| `CSRF_FAILED` | Token CSRF invalide ou manquant. Générez un nouveau token et incluez-le dans le header `x-csrf-token`. |
