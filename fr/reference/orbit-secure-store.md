# orbit-secure-store

`@c9up/orbit-secure-store` : des chaînes conservées chiffrées sur le téléphone (Keystore d'Android), éventuellement derrière une vérification biométrique. Guide : [API de l'appareil](/fr/guides/mobile/device-apis).

## Installation

```bash
pnpm add @c9up/orbit-secure-store
```

Sur un téléphone, l'autolinking de React Native ajoute le module natif à une app construite par `ream android:*` ; il n'y a rien à câbler.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/orbit-secure-store` | Les quatre appels du magasin, leurs types d'options et la classe d'erreur. L'import se résout selon la plateforme : le build `react-native` (la condition et le champ `react-native`) sur un téléphone, le build par défaut ailleurs. Les deux builds exportent les mêmes noms. |

| Plateforme | Comportement |
|---|---|
| Téléphone (Android) | Chaque valeur est un chiffré AES-256-GCM sous une clé qui ne quitte jamais le Keystore d'Android, rangé dans le répertoire sans sauvegarde de l'app. Une valeur posée avec `requireAuthentication` a sa propre clé, déverrouillée uniquement par une vérification biométrique forte, à chaque fois ; l'enrôlement d'une nouvelle biométrie l'invalide. Aucune valeur n'est journalisée. |
| Navigateur, serveur | Pas de magasin sécurisé : `setItem`, `getItem` et `deleteItem` rejettent avec `E_ORBIT_SECURE_STORE_UNAVAILABLE` (après la vérification de la clé), et `biometricStatus()` répond `{ hardware: false, enrolled: false }`. |

iOS n'est pas encore pris en charge.

## Exports

| Export | Nature | Description |
|---|---|---|
| `setItem` | fonction | Conserve une valeur sous une clé, chiffrée. |
| `getItem` | fonction | Lit la valeur sous une clé. |
| `deleteItem` | fonction | Oublie la valeur sous une clé. |
| `biometricStatus` | fonction | Indique si une biométrie forte peut protéger une valeur ici. |
| `SetItemOptions` | interface | Options de `setItem`. |
| `GetItemOptions` | interface | Options de `getItem`. |
| `PromptText` | interface | Les textes de l'invite biométrique. |
| `BiometricStatus` | interface | Ce que répond `biometricStatus()`. |
| `OrbitSecureStoreError` | erreur | Tout échec du magasin. |
| `OrbitSecureStoreErrorCode` | type | Les codes que porte une `OrbitSecureStoreError`. |

### Fonctions

Une clé compte de 1 à 128 caractères parmi `A-Z a-z 0-9 . _ -` (ni `.` ni `..`) ; toute autre clé est refusée avec `E_ORBIT_SECURE_STORE_INVALID_KEY` avant que rien n'atteigne la plateforme.

| Fonction | Signature | Description |
|---|---|---|
| `setItem` | `setItem(key: string, value: string, options?: SetItemOptions): Promise<void>` | Conserve `value` sous `key`, chiffrée ; avec `requireAuthentication`, derrière une vérification biométrique. |
| `getItem` | `getItem(key: string, options?: GetItemOptions): Promise<string \| null>` | La valeur sous `key`, ou `null` s'il n'y en a pas. |
| `deleteItem` | `deleteItem(key: string): Promise<void>` | Oublie la valeur sous `key` ; sans effet s'il n'y en a pas. |
| `biometricStatus` | `biometricStatus(): Promise<BiometricStatus>` | Indique si une biométrie forte peut protéger une valeur sur ce téléphone. |

### Types d'options

| Type | Champ | Type | Description |
|---|---|---|---|
| `SetItemOptions` | `requireAuthentication` | `boolean` | La valeur n'est lisible qu'après une vérification biométrique forte, à chaque fois. |
| `SetItemOptions` | `prompt` | `PromptText` | Les textes de l'invite biométrique, quand elle s'affiche. |
| `GetItemOptions` | `prompt` | `PromptText` | Les textes de l'invite biométrique, quand la valeur en exige une. |
| `PromptText` | `title`, `subtitle` | `string` | Le titre et le sous-titre de l'invite. |
| `PromptText` | `cancel` | `string` | Le libellé du bouton qui la ferme. |
| `BiometricStatus` | `hardware` | `boolean` | Le téléphone dispose d'un capteur biométrique fort utilisable. |
| `BiometricStatus` | `enrolled` | `boolean` | Une biométrie forte est enrôlée : `requireAuthentication` fonctionnera. |

### `OrbitSecureStoreError`

Étend `Error` ; `name` vaut `"OrbitSecureStoreError"`. L'erreur ne porte jamais la valeur stockée.

| Membre | Signature | Description |
|---|---|---|
| `code` | `readonly code: OrbitSecureStoreErrorCode` | Le code stable sur lequel brancher. |
| constructeur | `new OrbitSecureStoreError(code: OrbitSecureStoreErrorCode, message: string, options?: ErrorOptions)` | |

`OrbitSecureStoreErrorCode` est l'union des sept codes ci-dessous.

## Erreurs

Une vérification biométrique annulée a son propre code, distinct d'un échec.

| Code | Levée quand |
|---|---|
| [`E_ORBIT_SECURE_STORE_UNAVAILABLE`](/fr/reference/errors#e-orbit-secure-store-unavailable) | Aucun magasin sécurisé : le navigateur, le serveur, ou une app construite sans le module. |
| [`E_ORBIT_SECURE_STORE_INVALID_KEY`](/fr/reference/errors#e-orbit-secure-store-invalid-key) | Une clé ne compte pas de 1 à 128 caractères parmi `A-Z a-z 0-9 . _ -`. |
| [`E_ORBIT_SECURE_STORE_NO_BIOMETRICS`](/fr/reference/errors#e-orbit-secure-store-no-biometrics) | `requireAuthentication` est demandé sur un téléphone sans biométrie forte enrôlée. |
| [`E_ORBIT_SECURE_STORE_AUTH_CANCELLED`](/fr/reference/errors#e-orbit-secure-store-auth-cancelled) | L'utilisateur a fermé l'invite biométrique. |
| [`E_ORBIT_SECURE_STORE_AUTH_FAILED`](/fr/reference/errors#e-orbit-secure-store-auth-failed) | La vérification biométrique a échoué pour de bon : trop de tentatives, un verrouillage, une erreur matérielle. |
| [`E_ORBIT_SECURE_STORE_INVALIDATED`](/fr/reference/errors#e-orbit-secure-store-invalidated) | La clé derrière la valeur a disparu (une nouvelle biométrie enrôlée, les données de l'app restaurées), et la valeur avec elle. |
| [`E_ORBIT_SECURE_STORE_FAILED`](/fr/reference/errors#e-orbit-secure-store-failed) | La plateforme a signalé tout autre échec. |

## Voir aussi

- [API de l'appareil](/fr/guides/mobile/device-apis)
- [orbit](/fr/reference/orbit) : `connectServer` prend un `tokenStore` construit sur ces appels.
- [orbit-clipboard](/fr/reference/orbit-clipboard)
