# Chiffrement

Ce guide couvre le chiffrement.

## Chiffrement

```ts
const token = encryption.encrypt(userId, 3_600_000, 'password-reset')
encryption.decrypt(token, 'password-reset')   // l'id
encryption.decrypt(token, 'session')          // null
```

`purpose` est ce qui empêche une valeur scellée pour un usage d'être rejouée
ailleurs — un jeton de réinitialisation présenté comme cookie de session échoue
ici au lieu d'être honoré. `expiresIn` est en millisecondes. Les deux valent
aussi pour `sign()` / `unsign()`.

L'APP_KEY est validée à la construction : absente elle lève `E_MISSING_APP_KEY`,
plus courte que 16 caractères `E_INSECURE_APP_KEY`. Une clé qui figure dans un
squelette ou une documentation (`change-me`, `secret`, `your-app-key-here`, la
valeur provisoire du squelette) est refusée elle aussi par `E_INSECURE_APP_KEY`,
au démarrage : une clé lisible par tous permet à n'importe qui de forger cookies,
sessions, jetons CSRF et URL signées. Lancez `ream generate:key` pour en écrire
une nouvelle dans `.env`.

N'importe quelle valeur JSON peut être scellée, pas seulement une chaîne :

```ts
const signed = encryption.sign({ id: 1, roles: ['admin'] })
encryption.unsign<{ id: number; roles: string[] }>(signed)
```

Un `0`, `false`, `""` ou `null` signé est une vraie valeur et revient comme
telle ; un document JSON signé qui n'est pas des nôtres reste refusé — élargir
la charge utile n'a pas élargi ce qui compte comme enveloppe valide.

### `verifier`, `child` et `base64`

```ts
encryption.verifier.sign(payload, expiresIn, purpose)   // signer sans chiffrer
encryption.verifier.unsign<T>(value, purpose)
encryption.algorithm                                    // 'aes-256-gcm'
encryption.base64.encode(value)                         // url-safe, sans padding
encryption.base64.decode(value)                         // null si ça ne fait pas l'aller-retour

const previous = encryption.child(ANCIENNE_APP_KEY)     // rotation de clés
previous.unsign(cookieEncoreEnCirculation)
```

`child()` est ce sur quoi repose la rotation de clés : on garde le signeur de
l'ancien secret pour lire ce qui est déjà dans les navigateurs pendant que le
nouveau écrit.

> **Chiffre.** Ream chiffre en **aes-256-gcm**, où l'authentification fait
> partie du chiffre, plutôt qu'en CBC plus un HMAC assemblé à la main — un
> encrypt-then-MAC monté à la main est une source connue de failles subtiles.
