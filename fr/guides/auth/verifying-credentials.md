# Vérifier des identifiants

Ce guide couvre la vérification sûre des identifiants :

- Vérification d'identifiants à temps constant — `authFinder`
- Hachage de mot de passe
- Limiter les connexions — AuthRateLimiter

## Vérification d'identifiants à temps constant — `authFinder`

Une connexion qui sort tôt pour un compte inconnu répond en microsecondes ; une
qui vérifie un hachage de mot de passe répond en ~100 ms. Cet écart suffit à
dire à un appelant anonyme quels emails sont inscrits. `authFinder` le referme :
un uid inconnu paie lui aussi un hachage, et chaque échec lève la même
`E_INVALID_CREDENTIALS` (400).

```ts
import { Hash } from '@c9up/sigil'
import { authFinder } from '@c9up/warden'

const users = authFinder({
  hash: new Hash({ default: 'argon2', drivers: { argon2: { driver: 'argon2' } } }),
  findForAuth: (uid) => User.findBy('email', uid),   // null si aucun
  passwordColumnName: 'password',                     // la valeur par défaut
})

const user = await users.verifyCredentials(email, password) // ou lève E_INVALID_CREDENTIALS
await users.verifyPassword(user, currentPassword)           // booléen
```

- Un uid ou un mot de passe vide échoue tout de suite — cela ne dit rien d'aucun
  compte.
- Un uid inconnu exécute `hash.make(password)`, le coût d'une vraie
  vérification, puis échoue.
- Une ligne sans hachage de mot de passe (un compte qui se connecte par SSO) est
  un identifiant refusé, après le même hachage — pas un plantage qui
  signalerait l'existence du compte.

Passez `users.verifyCredentials` tel quel à un garde, ou enveloppez-le pour
façonner le payload : un garde lit une `E_INVALID_CREDENTIALS` levée comme un
refus.

---

## Hachage de mot de passe

**Warden ne hash pas les mots de passe.** Utilisez [`@c9up/sigil`](/fr/guides/security/hashing) — le service canonique de hachage de mot de passe pour l'écosystème Ream.

| Préoccupation | Où ça vit |
|---|---|
| `Hash.make(password)` / `Hash.verify(hash, password)` | `@c9up/sigil` (Rust NAPI : argon2id, bcrypt, scrypt) |
| Stockage de session après login réussi | `@c9up/warden` `SessionStrategy.login(user, session)` |
| Signature / vérification JWT | `@c9up/warden` `JwtStrategy` (HMAC-SHA256 via warden NAPI) |
| Primitives stdlib HMAC + random + constant-time-eq | `@c9up/ream/crypto` |

Le découpage est délibéré (story 40.1, architecture.md « Hashing authority »). `SessionStrategy.authenticate()` lève volontairement une erreur pour que la frontière de design soit incontournable : les appelants vérifient les credentials avec Sigil, Warden suit la session.

Les quatre méthodes de l'interface `NativeWarden.hashPassword*` (`hashPasswordArgon2`, `verifyPasswordArgon2`, `hashPasswordBcrypt`, `verifyPasswordBcrypt`) ont été retirées de la surface TS dans la story 40.3 — c'était du code mort sans aucun appelant dans le workspace. Le crate Rust sous-jacent (`warden-engine` `argon2_hash` + `bcrypt_hash`) et les quatre bindings NAPI restent embarqués dans l'artefact `.node` prébuild ; leur nettoyage est planifié pour une story de durcissement à venir.

---

## Limiter les connexions — AuthRateLimiter

Comptez une tentative de connexion **avant** de vérifier le mot de passe, sous
l'IP du client et l'identifiant essayé, et effacez les deux en cas de succès :

```ts
import { AuthRateLimiter, RedisAttemptStore } from '@c9up/warden'

const limiter = new AuthRateLimiter({
  maxAttempts: 5,
  windowSeconds: 900,
  // store: new RedisAttemptStore(redis),   // partagé entre instances
})

const keys = AuthRateLimiter.loginKeys(ctx.request.ip(), email)
const decision = await limiter.attempt(...keys)
if (!decision.allowed) return response.status(429).json({ retryAfter: decision.retryAfterSeconds })
const user = await verify(email, password)
if (user) await limiter.clear(...keys)
```

Compter d'abord est ce qui tient face à une rafale : chaque tentative est un
incrément atomique, si bien que vingt essais simultanés ne peuvent pas tous lire
« pas encore bloqué ». L'identifiant est normalisé (casse, espaces autour) et
la clé en est l'empreinte SHA-256 : une clé a la même taille quoi que le client
envoie. `maxAttempts` et `windowSeconds` doivent être des entiers positifs.
`MfaManager` utilise le même limiteur pour son verrouillage.

Les clés sont comptées dans l'ordre — l'IP d'abord — et la première au-delà de
la limite arrête la tentative : les clés suivantes ne sont pas comptées. Une
adresse déjà limitée ne peut donc pas ouvrir une fenêtre par identifiant
qu'elle invente ; elle touche au plus `maxAttempts` identifiants par fenêtre.

Le `MemoryAttemptStore` par défaut compte par processus et il est borné
(100 000 clés). Quand il est plein et que toutes les fenêtres sont encore
actives, une **nouvelle** clé est refusée — sa tentative est comptée au-delà de
la limite — plutôt que d'abandonner un compteur actif pour faire de la place :
les clés sont choisies par celui qui devine, et évincer les plus anciennes
laisserait un déluge d'identifiants inventés effacer le verrouillage d'une
victime. Pendant un tel déluge, les premières tentatives sous de nouvelles clés
attendent que des fenêtres expirent. En production, utilisez
`RedisAttemptStore` : il est partagé par toutes les instances et n'a pas cette
borne. Avec un resolver (un nom de connexion quasar), il — comme
`RedisBlacklistDriver` et `RedisTotpReplayGuard` — abandonne une connexion que
quasar a retirée quand sa stratégie de reconnexion a abandonné (statut `end`) et
la redemande à l'appel suivant : connexions, vérifications de révocation et
codes TOTP se rétablissent tout seuls quand Redis revient.

---
