# robledo

`@c9up/robledo` : des mises à jour à distance pour le build mobile d'une app ream, signées par `ream android:publish`, servies par l'app, vérifiées sur le téléphone et annulées quand elles n'atteignent jamais leur premier écran. Guide : [Mises à jour à distance](/fr/guides/mobile/building#mises-a-jour-a-distance).

## Installation

```bash
pnpm add @c9up/robledo
```

Ajoutez `() => import('@c9up/robledo/provider')` aux providers de `reamrc.ts`, et renseignez-y `mobile.updates` pour le build de l'app. L'app construite par `ream android:*` reçoit le module natif par l'autolinking.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/robledo` | Le côté serveur : la classe `Robledo`, son type de configuration, l'assistant de routes et la classe d'erreur. |
| `@c9up/robledo/provider` | `RobledoProvider` (export par défaut) : lie `Robledo` et lui remet le routeur de l'hôte. |
| `@c9up/robledo/services/main` | L'instance `Robledo` de l'application (export par défaut), utilisable une fois le provider démarré. |
| `@c9up/robledo/mobile` | Le côté app, exécuté sur le téléphone : vérifier, télécharger et préparer les mises à jour, et confirmer celle en cours. |

## Exports

### `@c9up/robledo`

| Export | Nature | Description |
|---|---|---|
| `Robledo` | classe | Sert les mises à jour que `ream android:publish` a signées et écrites dans le répertoire `robledo/` de l'app. |
| `RobledoConfig` | interface | La configuration `robledo`. |
| `LatestUpdate` | interface | `{ manifest: string; signature: string }` : le texte du manifeste de la mise à jour la plus récente et sa signature. |
| `registerRobledoRoutes` | fonction | Monte les deux routes de robledo sur un routeur. |
| `RobledoRouter` | interface | La forme de routeur dont les routes ont besoin : `get(path, handler)`. |
| `RobledoHttpContext` | interface | La partie d'un contexte HTTP qu'utilisent les routes. |
| `RobledoError` | erreur | Tout échec de robledo. |
| `RobledoErrorCode` | type | Les codes que porte une `RobledoError`. |

### `Robledo`

Le serveur ne signe rien et ne détient aucune clé : chaque mise à jour est vérifiée sur le téléphone avec la clé intégrée à l'app.

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Robledo(config?: RobledoConfig, resolvePath?: (path: string) => string)` | `resolvePath` résout depuis la racine de l'app. Lève `E_ROBLEDO_INVALID_PREFIX` pour un `prefix` invalide. |
| `directory` | `readonly directory: string` | Le répertoire résolu des mises à jour publiées. |
| `prefix` | `readonly prefix: string` | Le préfixe des routes. |
| `latest` | `latest(platform: string, runtime: string): Promise<LatestUpdate \| null>` | La mise à jour la plus récente publiée pour cette plateforme (`android`, `ios`) et ce runtime, ou `null`. |
| `filePath` | `filePath(platform: string, runtime: string, id: string, segments: readonly string[]): string \| null` | L'emplacement sur disque d'un fichier d'une mise à jour, ou `null` pour un chemin qui n'en est pas un (plateforme inconnue, runtime ou id mal formé, segment qui sort du `files/` de la mise à jour). |
| `registerRoutes` | `registerRoutes(): void` | Pose les deux routes sur le routeur ; appelez-la depuis un preload pour qu'elles existent avant que le serveur écoute. Un second appel est sans effet. |
| `hasRegisteredRoutes` | `hasRegisteredRoutes(): boolean` | Indique si `registerRoutes` a été appelée. |

Les routes :

| Route | Réponse |
|---|---|
| `GET <prefix>/:platform/:runtime/latest` | La mise à jour la plus récente en JSON (`cache-control: no-store`), ou 204 s'il n'y en a pas. |
| `GET <prefix>/:platform/:runtime/:id/files/*` | Un de ses fichiers, mis en cache comme immuable ; 404 pour un chemin qui n'en est pas un. |

### `registerRobledoRoutes`

| Fonction | Signature | Description |
|---|---|---|
| `registerRobledoRoutes` | `registerRobledoRoutes(router: RobledoRouter, robledo: Robledo): void` | Monte directement les routes sur `router`, pour un hôte qui les câble lui-même. |

### `@c9up/robledo/provider`

| Export | Nature | Description |
|---|---|---|
| `RobledoProvider` | provider (par défaut) | `register()` lie le singleton `Robledo` à partir de la configuration `robledo` ; `boot()` lui remet la liaison `router` quand elle existe. Il ne monte aucune route lui-même. |
| `RobledoAppContext` | interface | Ce que le provider lit de l'application : `container`, `config`, `makePath`. |

### `@c9up/robledo/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | L'instance `Robledo` de l'application. Avant le démarrage du provider, tout accès à une propriété lève `E_ROBLEDO_NOT_BOOTED`. |

```ts
// start/routes.ts
import robledo from '@c9up/robledo/services/main'

robledo.registerRoutes()
```

### `@c9up/robledo/mobile`

| Export | Nature | Description |
|---|---|---|
| `checkForUpdate` | fonction | Demande au serveur une mise à jour plus récente et la prépare pour le prochain démarrage. |
| `markReady` | fonction | Signale à robledo que la mise à jour en cours a atteint son premier écran. |
| `updateStatus` | fonction | Ce que sait le côté natif : serveur, runtime, plateforme, mise à jour en cours et en attente. |
| `CheckResult` | type | Ce que résout `checkForUpdate`. |
| `UpdateStatus` | interface | Ce que renvoie `updateStatus`. |
| `NativeRobledo` | interface | Le module natif, structurellement : `status()`, `stage(…)`, `ready()`. |
| `NATIVE_MODULE_NAME` | const | `"NativeRobledo"`. |

| Fonction | Signature | Description |
|---|---|---|
| `checkForUpdate` | `checkForUpdate(options?: { fetch?: Fetch }): Promise<CheckResult>` | Interroge `<url>/<platform>/<runtime>/latest`, télécharge les fichiers que liste le manifeste et les remet au côté natif, qui vérifie la signature et chaque empreinte avant de les garder. La mise à jour prend effet au prochain démarrage. `fetch` vaut par défaut le `fetch` global. |
| `markReady` | `markReady(): void` | Conserve la mise à jour en cours. Une mise à jour qui ne l'appelle jamais est abandonnée au démarrage suivant, et la précédente reprend. |
| `updateStatus` | `updateStatus(): UpdateStatus` | Lit l'état natif. |

```ts
type CheckResult =
  | { kind: 'none' }
  | { kind: 'current'; id: string }
  | { kind: 'staged'; id: string }
```

| Champ de `UpdateStatus` | Type | Description |
|---|---|---|
| `url` | `string` | Le serveur de mises à jour avec lequel l'app a été construite. |
| `runtimeVersion` | `string` | Le runtime natif de l'app. |
| `platform` | `string` | La plateforme. |
| `current` | `string \| null` | La mise à jour en cours, ou `null` pour le bundle intégré à l'app. |
| `pending` | `string \| null` | Une mise à jour préparée pour le prochain démarrage. |

### `RobledoError`

Étend `Error` ; `name` vaut le nom de la classe.

| Membre | Signature | Description |
|---|---|---|
| `code` | `readonly code: RobledoErrorCode` | Le code stable sur lequel brancher. |
| constructeur | `new RobledoError(code: RobledoErrorCode, message: string, options?: ErrorOptions)` | |

## Configuration

La clé `robledo`, depuis `config/robledo.ts` ou le magasin de configuration.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `directory` | `string` | `'robledo'` | L'emplacement des mises à jour publiées, depuis la racine de l'app. |
| `prefix` | `string` | `'/__robledo'` | Le préfixe des routes : commence par `/` et ne se termine pas par `/`. |

Le côté app lit `mobile.updates` (`url`, `publicKey`) dans `reamrc.ts` au moment du build ; voir le guide.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `Robledo` | Le singleton `Robledo`. |
| `'robledo'` | La même instance. |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_ROBLEDO_INVALID_PREFIX`](/fr/reference/errors#e-robledo-invalid-prefix) | Le préfixe des routes ne commence pas par `/`, ou se termine par `/`. |
| [`E_ROBLEDO_NOT_BOOTED`](/fr/reference/errors#e-robledo-not-booted) | `@c9up/robledo/services/main` est utilisé avant le démarrage du provider. |
| [`E_ROBLEDO_NO_NATIVE_MODULE`](/fr/reference/errors#e-robledo-no-native-module) | L'app n'a pas de module `NativeRobledo` : elle n'a pas été construite avec robledo installé. |
| [`E_ROBLEDO_BAD_RESPONSE`](/fr/reference/errors#e-robledo-bad-response) | Le serveur a répondu à une vérification, ou à un téléchargement de fichier, par autre chose qu'une mise à jour. |
| [`E_ROBLEDO_REFUSED`](/fr/reference/errors#e-robledo-refused) | Le téléphone a refusé la mise à jour : signature invalide, fichier altéré, mauvais runtime. |

## Voir aussi

- [Construire l'app](/fr/guides/mobile/building)
- [orbit](/fr/reference/orbit)
