# station

`@c9up/station` : un panneau d'administration pour une application ream, construit à partir d'un catalogue déclaratif de ressources (`defineResource`) qui monte les routes de liste, d'affichage, de création, de modification et de suppression sous `/admin`, derrière une connexion, des permissions par action, des vérifications CSRF et une piste d'audit. Guide : [Panneau d'administration](/fr/guides/digging-deeper/admin/).

## Installation

```bash
pnpm add @c9up/station
```

Ajoutez `() => import('@c9up/station/provider')` aux providers de `reamrc.ts`, et éventuellement un `config/station.ts`. Les dépendances pairs sont facultatives pour le paquet mais nécessaires à une surface d'administration : `@c9up/ream` (routeur), `@c9up/atlas` (les entités et la connexion `db`), `@c9up/inker` (les vues, requis dès qu'une ressource est déclarée), `@c9up/rune` (validation du corps, requis quand une ressource monte `create` ou `edit`), et `@c9up/warden` (la connexion et le contrôle des permissions ; sans lui, l'administration reste ouverte).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/station` | `defineResource`, `defineConfig`, `ResourceRegistry`, la classe du provider, les types de ressource et d'audit, et les assistants de casse. |
| `@c9up/station/provider` | `StationProvider` (export par défaut) et ses types de configuration. |
| `@c9up/station/services/main` | Le `ResourceRegistry` de l'application (export par défaut). |

## Exports

### `@c9up/station`

| Export | Nature | Description |
|---|---|---|
| `defineResource` | fonction | Déclare une ressource d'administration à partir d'une classe d'entité. |
| `defineConfig` | fonction | Type `config/station.ts` ; identité à l'exécution. |
| `ResourceRegistry` | classe | Le catalogue des ressources déclarées. |
| `StationProvider` | provider | Aussi l'export par défaut de `@c9up/station/provider`. |
| `StationConfig` | interface | La configuration `station`. |
| `StationAppContext` | interface | Ce que le provider lit de l'application. |
| `StationLoginRateLimitConfig` | interface | La limitation des tentatives de connexion. |
| `StationLoginLimiter` | interface | Un limiteur partagé entre instances. |
| `Resource` | interface | Une ressource déclarée, telle que la renvoie `defineResource`. |
| `ResourceOptions` | interface | Ce que prend `defineResource`. |
| `ResourceAction` | type | `'list' \| 'show' \| 'create' \| 'edit' \| 'destroy'`. |
| `RESOURCE_ACTIONS` | const | Les cinq actions, figées. |
| `FormFieldOverride` | interface | Les surcharges de formulaire par champ. |
| `AuditEvent`, `AuditSink` | type | L'enregistrement d'audit d'une écriture et son récepteur. |
| `SecurityAuditEvent`, `SecurityAuditAction`, `SecurityAuditSink` | type | Les événements de connexion, déconnexion, refus et CSRF et leur récepteur. |
| `kebabCase`, `titleCase`, `pluralise` | fonction | `(input: string): string` : la casse qui sert à dériver slugs et libellés. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). |

### `defineResource`

| Fonction | Signature | Description |
|---|---|---|
| `defineResource` | `defineResource<T>(options: ResourceOptions<T>): Resource<T>` | Lève une erreur si `entity` n'est pas une classe ou si `actions` est vide. |

| Champ de `ResourceOptions` | Type | Défaut | Description |
|---|---|---|---|
| `entity` | `new (...args: never[]) => T` | requis | La classe d'entité atlas. |
| `label` | `string` | dérivé de la classe | Affiché dans la barre latérale. |
| `actions` | `ReadonlyArray<ResourceAction>` | les cinq | Les actions montées. |
| `name` | `string` | dérivé de la classe | Le slug d'URL. |
| `audit` | `AuditSink` | un avertissement unique par processus | Appelé après chaque écriture réussie. |
| `auditSecrets` | `boolean` | `false` | Transmettre au récepteur les valeurs des colonnes secrètes telles quelles ; sinon elles valent `"[redacted]"`. |
| `onAuditError` | `(event: AuditEvent, error: unknown) => void` | journalisé au niveau `error` | Appelé quand le récepteur lève une erreur ; l'écriture est déjà validée. |
| `formFields` | `Readonly<Record<string, FormFieldOverride>>` | | Des surcharges par nom de propriété : `hidden`, `inputType`, `label`, `placeholder`, `required`. |
| `list`, `show` | `{ columns?: ReadonlyArray<string> }` | toutes les colonnes non secrètes | Les colonnes que rend chaque vue, dans l'ordre. |
| `editable` | `ReadonlyArray<string>` | toutes les colonnes sauf celles gérées par le framework, les secrets et les champs masqués | Les colonnes qu'une création ou une modification peut poser ; un secret listé ici est en écriture seule. |

`FormFieldOverride.inputType` vaut `'text' | 'number' | 'email' | 'password' | 'date' | 'datetime-local' | 'checkbox' | 'textarea'`.

### `ResourceRegistry`

| Membre | Signature | Description |
|---|---|---|
| `register` | `register<T>(resource: Resource<T>): void` | Ajoute une ressource et monte ses routes une fois le provider lancé ; un nom en double lève une erreur. |
| `get` | `get(name: string): Resource \| undefined` | |
| `getOrThrow` | `getOrThrow(name: string): Resource` | |
| `has` | `has(name: string): boolean` | |
| `count` | `count(): number` | |
| `all` | `all(): ReadonlyArray<Resource>` | Dans l'ordre d'enregistrement. |
| `useMounter` | `useMounter(mounter: ResourceMounter): void` | Posé par le provider ; monte ce qui était déjà enregistré. |

### Événements d'audit

| Champ de `AuditEvent` | Type |
|---|---|
| `action` | `ResourceAction` |
| `resource` | `string` |
| `recordId`, `userId` | `unknown` |
| `before`, `after` | `Readonly<Record<string, unknown>>` |
| `redactedChanges` | `ReadonlyArray<string>` |
| `ip`, `userAgent`, `requestId` | `string` |
| `at` | `Date` |

`SecurityAuditEvent` porte `action` (`'login' | 'login_failed' | 'login_throttled' | 'logout' | 'denied' | 'csrf_denied'`), `userId`, `identifier`, `resource`, `resourceAction`, `permission`, `path`, `ip`, `userAgent`, `requestId` et `at`. Un récepteur vaut `(event) => void | Promise<void>`.

### `@c9up/station/provider`

| Export | Nature | Description |
|---|---|---|
| `StationProvider` | provider (par défaut) | `register()` lie le `ResourceRegistry` ; `boot()` le publie ; `start()` lit la configuration `station`, charge les dépendances pairs, monte la surface de connexion et chaque ressource à mesure qu'elle est enregistrée, et s'arrête sans bruit quand une dépendance nécessaire n'est pas installée. |
| `StationConfig`, `StationAppContext` | interface | |

Les routes, sous les middlewares configurés :

| Route | Action |
|---|---|
| `GET /admin` | Redirige vers la première ressource listable, ou vers la page de connexion. |
| `GET /admin/login`, `POST /admin/login`, `POST /admin/logout` | Connexion et déconnexion (avec le contrôle d'accès). |
| `GET /admin/<slug>` | `list` |
| `GET /admin/<slug>/new`, `POST /admin/<slug>` | `create` |
| `GET /admin/<slug>/:id` | `show` |
| `GET /admin/<slug>/:id/edit`, `PUT /admin/<slug>/:id` | `edit` |
| `DELETE /admin/<slug>/:id` | `destroy` |

Un formulaire qui envoie vers `POST /admin/<slug>/:id` choisit la méthode avec `_method`.

### `@c9up/station/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | Le `ResourceRegistry` de l'application. Tout accès à une propriété avant le démarrage du provider lève une erreur. |

```ts
// start/admin.ts
import station from '@c9up/station/services/main'
import { defineResource } from '@c9up/station'
import User from '#models/user'

station.register(defineResource({ entity: User, label: 'Users' }))
```

## Configuration

`config/station.ts`, via `defineConfig`. Chaque clé est facultative.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `requireAuth` | `boolean` | `true` quand `@c9up/warden` est installé | Monter la surface de connexion et protéger chaque route `/admin/*`. |
| `requireRole` | `string` | | Un rôle exigé en plus de `accessPermission`. |
| `permissionPrefix` | `string` | `'station'` | Les actions exigent `<prefix>.<resource>.<action>`, l'entrée exige `<prefix>.access`. |
| `accessPermission` | `string \| false` | `<prefix>.access` | La permission pour entrer dans `/admin/*` ; `false` retire ce contrôle. |
| `loginPath` | `string` | `'/admin/login'` | La redirection en cas d'échec du contrôle d'authentification. |
| `cookieName` | `string` | `'station_auth'` | Le cookie qui porte le jeton. |
| `cookieSecure` | `boolean` | actif, sauf un processus de développement ou de test servi en HTTP | L'attribut `Secure` du cookie. |
| `loginRateLimit` | `StationLoginRateLimitConfig \| false` | 5 tentatives par IP et par identifiant toutes les 15 minutes, en mémoire | `maxAttempts`, `windowSeconds`, ou un `limiter` partagé ; `false` le désactive. |
| `middleware` | `ReadonlyArray<string>` | | Des middlewares de routeur nommés, attachés à chaque route de station. |
| `guard` | `string` | le guard par défaut du gestionnaire d'authentification | Le guard warden ; ce doit être un guard à jeton, un guard de session est refusé au démarrage. |
| `audit` | `SecurityAuditSink` | | Le récepteur des événements de sécurité de l'administration. |

`StationLoginLimiter` vaut `{ attempt(...keys: string[]): Promise<{ allowed: boolean; retryAfterSeconds: number }>; clear(...keys: string[]): Promise<void> }`.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `ResourceRegistry` | Le singleton du registre. |
| `'station'` | La même instance ; déclaré sur `ContainerBindings`. |

## Erreurs

Un refus levé au boot ou par le registre est une classe du namespace `errors` et une `Exception` de `@c9up/flare` (statut 500) : testez `error.code` ou `error instanceof errors.E_STATION_*`, avec `import { errors } from '@c9up/station'`. Les codes de connexion et de CSRF ne sont pas levés : ce sont le `code` de la réponse HTTP refusée.

| Code | Levée quand |
|---|---|
| [`E_STATION_LOGIN_CREDENTIALS_REQUIRED`](/fr/reference/errors#e-station-login-credentials-required) | Le formulaire de connexion est envoyé sans e-mail ou sans mot de passe (400). |
| [`E_STATION_LOGIN_IDENTIFIER_TOO_LONG`](/fr/reference/errors#e-station-login-identifier-too-long) | L'e-mail de connexion dépasse 254 caractères (400). |
| [`E_STATION_INVALID_CREDENTIALS`](/fr/reference/errors#e-station-invalid-credentials) | E-mail ou mot de passe invalide (401). |
| [`E_STATION_TOO_MANY_LOGIN_ATTEMPTS`](/fr/reference/errors#e-station-too-many-login-attempts) | Trop de tentatives de connexion (429). |
| [`E_STATION_LOGIN_UNAVAILABLE`](/fr/reference/errors#e-station-login-unavailable) | La connexion est temporairement indisponible (503). |
| [`E_STATION_CSRF_REQUIRED`](/fr/reference/errors#e-station-csrf-required) | Une action d'administration n'a pas de jeton CSRF actif et vérifié (403). |
| [`E_VALIDATION_ERROR`](/fr/reference/errors#e-validation-error-station) | Un formulaire d'administration n'a pas passé la validation (422 pour un client JSON ; un navigateur est redirigé). |
| [`E_STATION_NOT_BOOTED`](/fr/reference/errors#e-station-not-booted) | Le registre de `services/main` a servi avant le boot de `StationProvider`, ou avant `setStation()`. |
| [`E_STATION_INVALID_RESOURCE`](/fr/reference/errors#e-station-invalid-resource) | `defineResource()` a reçu une déclaration invalide (entité, nom, actions, listes de colonnes, `formFields`, `audit`, `onAuditError`). |
| [`E_STATION_DUPLICATE_RESOURCE`](/fr/reference/errors#e-station-duplicate-resource) | Deux ressources ont été enregistrées sous le même nom. |
| [`E_STATION_UNKNOWN_RESOURCE`](/fr/reference/errors#e-station-unknown-resource) | `getOrThrow()` a nommé une ressource qui n'est pas enregistrée. |
| [`E_STATION_UNKNOWN_COLUMN`](/fr/reference/errors#e-station-unknown-column) | `list.columns`, `show.columns` ou `editable` d'une ressource nomme une propriété qui n'est pas une colonne de l'entité. |
| [`E_STATION_COLUMN_NOT_EDITABLE`](/fr/reference/errors#e-station-column-not-editable) | `editable` nomme une colonne que le framework gère (clé primaire, horodatage, relation, suppression douce) ou que `formFields` masque. |
| [`E_STATION_PRIMARY_KEY_MISSING`](/fr/reference/errors#e-station-primary-key-missing) | Une entité d'administration ne déclare aucune colonne `@PrimaryKey()`. |
| [`E_STATION_INVALID_CONFIG`](/fr/reference/errors#e-station-invalid-config) | Une option `station` est invalide (`audit`, `permissionPrefix`, `guard`, `loginRateLimit`). |
| [`E_STATION_UNKNOWN_GUARD`](/fr/reference/errors#e-station-unknown-guard) | `station.guard` nomme une garde que warden ne connaît pas. |
| [`E_STATION_GUARD_NOT_JWT`](/fr/reference/errors#e-station-guard-not-jwt) | La garde de l'administration n'émet pas de jeton bearer ; Station a besoin d'une garde JWT. |
| [`E_STATION_AUTH_REQUIRED`](/fr/reference/errors#e-station-auth-required) | Aucune liaison `auth` utilisable n'est enregistrée alors que `requireAuth: true` est posé, ou hors développement et test. |
| [`E_STATION_DATABASE_REQUIRED`](/fr/reference/errors#e-station-database-required) | Aucune connexion `db` n'est enregistrée pour l'administration (enregistrez `@c9up/atlas/provider`). |
| [`E_STATION_RUNE_REQUIRED`](/fr/reference/errors#e-station-rune-required) | Une ressource avec des formulaires d'écriture a besoin de `@c9up/rune`, qui n'est pas installé. |
| [`E_STATION_INKER_REQUIRED`](/fr/reference/errors#e-station-inker-required) | Aucun moteur de vues `@c9up/inker` n'est enregistré pour rendre l'administration. |
| [`E_STATION_INKER_UNUSABLE`](/fr/reference/errors#e-station-inker-unusable) | `@c9up/inker` est enregistré mais ne se résout pas en un moteur de rendu utilisable ; voir `cause`. |
| [`E_STATION_ROUTE_MIDDLEWARE_UNSUPPORTED`](/fr/reference/errors#e-station-route-middleware-unsupported) | `station.middleware` est défini mais les routes du routeur n'ont pas de méthode `middleware()`. |
| [`E_STATION_INTERNAL`](/fr/reference/errors#e-station-internal) | Un invariant interne a été rompu (le moteur de vues n'était pas initialisé) ; signalez-le comme un bug. |

## Migration

- `@c9up/station/provider` n'exporte plus que le provider et ses deux types de configuration. `resourcesNeedValidation`, `deriveWritableSchema`, `validateWritableBody`, `isModuleNotFound`, `isPackageMissing` et `resetStationProviderFlags` disparaissent : c'étaient des points d'accès pour les tests du paquet, pas une API applicative. Retirez tout import de l'une d'elles.
- Un refus n'est plus une simple `Error` ou `TypeError` : testez `error.code`, ou `error instanceof errors.E_STATION_*`. Ceux qui étaient une `TypeError` (une option de `defineResource()` ou `station.audit` du mauvais type) ne le sont plus : remplacez `instanceof TypeError` par `error.code === 'E_STATION_INVALID_RESOURCE'` ou `'E_STATION_INVALID_CONFIG'`.
- Une connexion admin réussie ne remet plus à zéro que la clé de l'identifiant (`id:<empreinte>`), plus celle de l'IP (`ip:<adresse>`). Un limiteur passé en `loginRateLimit.limiter` reçoit désormais `clear()` avec cette seule clé ; une adresse qui continue d'échouer reste limitée jusqu'à la fin de sa fenêtre.

## Voir aussi

- [Panneau d'administration](/fr/guides/digging-deeper/admin/)
- [Autorisation et écritures](/fr/guides/digging-deeper/admin/authorization)
- [Connexion, CSRF et audit](/fr/guides/digging-deeper/admin/sign-in)
