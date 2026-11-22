# Device APIs

This guide covers the device APIs.

## Device APIs

What a phone app needs beyond the screen comes as one package per
capability, `@c9up/orbit-<capability>`, installed by the app that uses it:
a standard React Native library (a Kotlin TurboModule, added by React
Native's autolinking — nothing to wire), with the same call in the browser
where the web has one. Permissions are the app's to declare in `reamrc.ts`.

| Package | What | In the browser |
|---|---|---|
| `@c9up/orbit-clipboard` | `writeText`, `readText` | `navigator.clipboard` |
| `@c9up/orbit-secure-store` | `setItem`, `getItem`, `deleteItem`, `biometricStatus`: strings encrypted under an Android Keystore key, optionally behind a biometric check (`requireAuthentication`) | none: every call rejects with `E_ORBIT_SECURE_STORE_UNAVAILABLE` |

```ts
import { getItem, setItem, deleteItem } from '@c9up/orbit-secure-store'

const server = connectServer('https://app.example', {
  tokenStore: {
    get: () => getItem('session'),
    set: (token) => (token === null ? deleteItem('session') : setItem('session', token)),
  },
})
await server.restore()   // signed in again after a restart, if a token was kept
```

A cancelled biometric prompt (`E_ORBIT_SECURE_STORE_AUTH_CANCELLED`) is not a
failed one (`…_AUTH_FAILED`); a value whose key a new fingerprint invalidated
is gone (`…_INVALIDATED`). Sensors, location, camera, haptics, files and SMS
follow the same shape.
