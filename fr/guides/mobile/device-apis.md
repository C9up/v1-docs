# API de l’appareil

Ce guide couvre les API de l'appareil.

## API de l'appareil

Ce dont une app a besoin au-delà de l'écran arrive en un paquet par capacité,
`@c9up/orbit-<capacité>`, installé par l'app qui s'en sert : une bibliothèque
React Native standard (un TurboModule Kotlin, ajouté par l'autolinking de
React Native — rien à câbler), avec le même appel dans le navigateur quand le
web en a un. Les permissions sont déclarées par l'app dans `reamrc.ts`.

| Paquet | Quoi | Dans le navigateur |
|---|---|---|
| `@c9up/orbit-clipboard` | `writeText`, `readText` | `navigator.clipboard` |
| `@c9up/orbit-secure-store` | `setItem`, `getItem`, `deleteItem`, `biometricStatus` : des chaînes chiffrées sous une clé du Keystore d'Android, éventuellement derrière une vérification biométrique (`requireAuthentication`) | aucun : chaque appel rejette avec `E_ORBIT_SECURE_STORE_UNAVAILABLE` |

```ts
import { getItem, setItem, deleteItem } from '@c9up/orbit-secure-store'

const server = connectServer('https://app.example', {
  tokenStore: {
    get: () => getItem('session'),
    set: (token) => (token === null ? deleteItem('session') : setItem('session', token)),
  },
})
await server.restore()   // reconnecté après un redémarrage, si un jeton était gardé
```

Une invite biométrique annulée (`E_ORBIT_SECURE_STORE_AUTH_CANCELLED`) n'est
pas une vérification échouée (`…_AUTH_FAILED`) ; une valeur dont une nouvelle
empreinte a invalidé la clé est perdue (`…_INVALIDATED`). Capteurs,
localisation, caméra, haptique, fichiers et SMS suivent la même forme.
