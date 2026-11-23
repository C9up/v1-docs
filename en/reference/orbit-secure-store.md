# orbit-secure-store

`@c9up/orbit-secure-store`: strings kept encrypted on the phone (Android Keystore), optionally behind a biometric check. Guide: [Device APIs](/en/guides/mobile/device-apis).

## Installation

```bash
pnpm add @c9up/orbit-secure-store
```

On a phone, React Native's autolinking adds the native module to an app built by `ream android:*`; there is nothing to wire.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/orbit-secure-store` | The four store calls, their option types and the error class. The import resolves per platform: the `react-native` build (the condition and the `react-native` field) on a phone, the default build elsewhere. Both builds export the same names. |

| Platform | Behaviour |
|---|---|
| Phone (Android) | Each value is AES-256-GCM ciphertext under a key that never leaves the Android Keystore, kept in the app's no-backup directory. A value set with `requireAuthentication` has its own key, unlocked only by a strong biometric check, each time; enrolling a new biometric invalidates it. Nothing logs a value. |
| Browser, server | No secure store: `setItem`, `getItem` and `deleteItem` reject with `E_ORBIT_SECURE_STORE_UNAVAILABLE` (after the key check), and `biometricStatus()` answers `{ hardware: false, enrolled: false }`. |

iOS is not supported yet.

## Exports

| Export | Kind | Description |
|---|---|---|
| `setItem` | function | Keeps a value under a key, encrypted. |
| `getItem` | function | Reads the value under a key. |
| `deleteItem` | function | Forgets the value under a key. |
| `biometricStatus` | function | Whether a strong biometric can protect a value here. |
| `SetItemOptions` | interface | Options of `setItem`. |
| `GetItemOptions` | interface | Options of `getItem`. |
| `PromptText` | interface | The words of the biometric prompt. |
| `BiometricStatus` | interface | What `biometricStatus()` answers. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |

### Functions

A key is 1 to 128 characters of `A-Z a-z 0-9 . _ -` (not `.` or `..`); any other key is refused with `E_ORBIT_SECURE_STORE_INVALID_KEY` before anything reaches the platform.

| Function | Signature | Description |
|---|---|---|
| `setItem` | `setItem(key: string, value: string, options?: SetItemOptions): Promise<void>` | Keeps `value` under `key`, encrypted; with `requireAuthentication`, behind a biometric check. |
| `getItem` | `getItem(key: string, options?: GetItemOptions): Promise<string \| null>` | The value under `key`, or `null` when there is none. |
| `deleteItem` | `deleteItem(key: string): Promise<void>` | Forgets the value under `key`; nothing happens when there is none. |
| `biometricStatus` | `biometricStatus(): Promise<BiometricStatus>` | Whether a strong biometric can protect a value on this phone. |

### Option types

| Type | Field | Type | Description |
|---|---|---|---|
| `SetItemOptions` | `requireAuthentication` | `boolean` | The value is readable only after a strong biometric check, each time. |
| `SetItemOptions` | `prompt` | `PromptText` | The biometric prompt's words, when one is shown. |
| `GetItemOptions` | `prompt` | `PromptText` | The biometric prompt's words, when the value requires one. |
| `PromptText` | `title`, `subtitle` | `string` | The prompt's title and subtitle. |
| `PromptText` | `cancel` | `string` | The label of the button that dismisses it. |
| `BiometricStatus` | `hardware` | `boolean` | The phone has a strong biometric sensor it can use. |
| `BiometricStatus` | `enrolled` | `boolean` | A strong biometric is enrolled: `requireAuthentication` will work. |

## Errors

Each code is a class of the `errors` export. An error never carries the stored value.

A cancelled biometric check has its own code, distinct from a failed one.

| Code | Raised when |
|---|---|
| [`E_ORBIT_SECURE_STORE_UNAVAILABLE`](/en/reference/errors#e-orbit-secure-store-unavailable) | There is no secure store: the browser, the server, or an app built without the module. |
| [`E_ORBIT_SECURE_STORE_INVALID_KEY`](/en/reference/errors#e-orbit-secure-store-invalid-key) | A key is not 1 to 128 of `A-Z a-z 0-9 . _ -`. |
| [`E_ORBIT_SECURE_STORE_NO_BIOMETRICS`](/en/reference/errors#e-orbit-secure-store-no-biometrics) | `requireAuthentication` is asked on a phone with no strong biometric enrolled. |
| [`E_ORBIT_SECURE_STORE_AUTH_CANCELLED`](/en/reference/errors#e-orbit-secure-store-auth-cancelled) | The user dismissed the biometric prompt. |
| [`E_ORBIT_SECURE_STORE_AUTH_FAILED`](/en/reference/errors#e-orbit-secure-store-auth-failed) | The biometric check failed for good: too many attempts, a lockout, a hardware error. |
| [`E_ORBIT_SECURE_STORE_INVALIDATED`](/en/reference/errors#e-orbit-secure-store-invalidated) | The key behind the value is gone (a new biometric enrolled, the app's data restored), and the value with it. |
| [`E_ORBIT_SECURE_STORE_FAILED`](/en/reference/errors#e-orbit-secure-store-failed) | The platform reported any other failure. |

## See also

- [Device APIs](/en/guides/mobile/device-apis)
- [orbit](/en/reference/orbit): `connectServer` takes a `tokenStore` built on these calls.
- [orbit-clipboard](/en/reference/orbit-clipboard)
