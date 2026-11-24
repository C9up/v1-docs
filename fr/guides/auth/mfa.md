# Authentification multifacteur

Ce guide couvre l'authentification multifacteur :

- MfaManager — cycle d'enrôlement
- @RequireMfa — protéger des routes
- OTP email / SMS et WebAuthn

## Authentification multi-facteurs (MFA)

Warden embarque quatre providers MFA, tous implémentés sur `node:crypto` avec **zéro dépendance tierce** — WebAuthn compris (le parsing CBOR / COSE / attestation est fait maison). Chaque provider et le `MfaManager` prennent des stores enfichables qui par défaut sont en mémoire ; fournissez des stores persistants (Atlas, KeyDB…) en production.

| Provider | Rôle |
|---|---|
| `TotpProvider` | codes d'application d'authentification RFC 6238 (Google Authenticator, 1Password…) |
| `BackupCodesProvider` | codes de secours à usage unique, hachés salés au repos |
| `OtpProvider` | codes à usage unique livrés par email / SMS (canal enfichable) |
| `WebauthnProvider` | passkeys / FIDO2 (aucune librairie WebAuthn tierce) |

### MfaManager — cycle d'enrôlement

`MfaManager` orchestre le flux stateful « activer la 2FA » pour TOTP + codes de secours, avec une protection anti-brute-force par utilisateur sur `verify()`.

```typescript
import { MfaManager, TotpProvider, BackupCodesProvider } from '@c9up/warden'

const mfa = new MfaManager({
  issuer: 'Fluveo',
  totp: new TotpProvider(),
  backupCodes: new BackupCodesProvider(),
  // store: new AtlasMfaFactorStore(db),   // facteurs persistants en production
  rateLimit: { maxAttempts: 5, windowSeconds: 900 }, // + store: new RedisAttemptStore(redis) en cluster
})

// Cette requête a-t-elle passé le step-up ? Nécessaire pour modifier les
// facteurs d'un compte qui a déjà la MFA ; le premier enrôlement s'en passe.
const stepUp = ctx.auth.user?.mfa === true

// 1. Enrôlement — affichez `uri` sous forme de QR code (avec @c9up/prism : `await qrcode.toString(uri)`)
const { factorId, uri } = await mfa.enrollTotp({ id: user.id, name: user.email }, { stepUp })
// 2. Confirmation avec un premier code de l'application d'authentification
await mfa.confirmTotp(user.id, factorId, code, { stepUp }) // → true une fois confirmé
// 3. Codes de secours — à afficher UNE SEULE fois
const codes = await mfa.createBackupCodes(user.id, { stepUp })

// Step-up à la connexion — un code TOTP OU un code de secours, rate-limité par utilisateur
if (await mfa.verify(user.id, submitted)) {
  // JWT : un jeton qui porte le step-up
  const token = auth.issueFor(user, 'jwt', { mfa: true })
  // session : l'enregistrer sur cette session
  ctx.auth.use('web').markMfaVerified()
}
```

Helpers de statut : `isEnabled(userId)`, `listFactors(userId)` (ne divulgue jamais de secret), `disableFactor(userId, factorId, { stepUp })`, `await isLocked(userId)`.

Dès qu'un compte a un facteur confirmé, `enrollTotp`, `confirmTotp`,
`createBackupCodes` et `disableFactor` demandent `{ stepUp: true }`, et lèvent
**403 `E_WARDEN_MFA_REQUIRED`** sans lui. Passez `ctx.auth.user.mfa === true` :
la garde le fixe d'après l'identifiant présenté, donc seule une requête qui a
passé le second facteur peut en ajouter, en remplacer ou en supprimer un. Sans
cela, quelqu'un qui connaît seulement le mot de passe pourrait se connecter,
générer de nouveaux codes de secours ou supprimer l'authentificateur, et le
second facteur ne protégerait plus rien. Avant que le premier facteur soit
confirmé, il n'y a rien à passer : le premier enrôlement fonctionne sans. Un
appel refusé ne change rien et ne consomme aucune tentative.

Les opérations sur un facteur nomment son propriétaire à côté de l'id du facteur
et refusent un facteur qui appartient à quelqu'un d'autre : un id de facteur
transite par les requêtes, et un id qui a fuité par un log ou un outil de
support ne doit pas permettre à un autre compte d'agir dessus. `disableFactor`
répond `true` quand il a supprimé le facteur, `false` pour un id inconnu ou le
facteur d'un autre utilisateur, qui reste en place. `confirmTotp` répond `false`
dans le même cas, et ses tentatives comptent dans le même verrouillage que
`verify()` : un premier code ne peut pas être deviné sans limite.

Chaque code ne sert qu'une fois, même quand deux requêtes le présentent au même
instant : le garde anti-rejeu TOTP réserve un code atomiquement
(`claim(key, ttlMs)`, écriture si absent), et un code de secours est consommé par
`MfaFactorStore.consumeBackupHash(factorId, hash)`, qui ne doit retirer
l'empreinte que si elle est encore là. Une tentative est comptée **avant** la
vérification du code, si bien qu'une rafale d'essais simultanés ne peut pas
atteindre tous les providers. Sur plusieurs instances, partagez les compteurs et
le garde anti-rejeu : `rateLimit.store: new RedisAttemptStore(redis)` et
`new TotpProvider({ replayGuard: new RedisTotpReplayGuard(redis) })`. Les nombres
sont vérifiés à la construction : TOTP `digits` 6–8, `period` 1–3600 s, `window`
0–10 ; codes de secours `count` 1–100, `length` 8–64.

### @RequireMfa — protéger des routes

Une route décorée par `@RequireMfa()` n'est accessible que si le credential de la requête a passé un step-up MFA : un JWT signé avec `{ mfa: true }`, ou une session sur laquelle `markMfaVerified()` a tourné. Sinon la requête est refusée avec **403 `E_WARDEN_MFA_REQUIRED`**. Deux gates l'appliquent, et un seul suffit : le gate de route de Ream, sur toute route dont le handler est une action de contrôleur, et le middleware d'auth de Warden (`router.use([() => import('@c9up/warden/middleware')])`), qui authentifie aussi la requête. Avec le gate de route seul, quelque chose doit d'abord remplir `ctx.auth` : le middleware de Warden, `@c9up/warden/silent-auth`, ou votre propre middleware d'auth. `@RequireMfa()` sans `@Guard` exige quand même une requête authentifiée : une requête anonyme reçoit un 401. `user.mfa` est posé par le garde d'après ce credential, jamais d'après ce que renvoie `findUser` — un compte où la MFA est *activée* n'a pas pour autant passé le step-up. Un credential sans notion de step-up — un jeton d'accès, un identifiant Basic, une session ranimée par un cookie remember-me — porte toujours `mfa: false`, quoi que contienne la ligne de l'utilisateur. Une nouvelle connexion et une déconnexion effacent le step-up de la session.

```typescript
import { Guard, RequireMfa } from '@c9up/warden'

class TransferController {
  @Guard('jwt')
  @RequireMfa()
  async transfer() { /* accessible uniquement après le step-up MFA */ }
}
```

Enregistrez le manager via la config pour qu'il atterrisse dans le conteneur sous `MfaManager` / `"mfa"` :

```typescript
// config/auth.ts
import { defineConfig } from '@c9up/warden/config'
export default defineConfig({ jwt: { /* … */ }, mfa: { manager: mfa } })
```

### OTP email / SMS et WebAuthn

`OtpProvider` et `WebauthnProvider` s'utilisent directement — leurs flux sont basés sur un challenge / une cérémonie, pas sur un cycle d'enrôlement :

```typescript
import { OtpProvider, WebauthnProvider } from '@c9up/warden'

// OTP livré — vous fournissez le canal email/SMS
const otp = new OtpProvider({ channel: { send: (to, code) => mailer.send(to, code) } })
const { challengeId } = await otp.start(user.email)
await otp.verify(challengeId, user.email, submitted) // usage unique, TTL + budget d'essais

// Passkeys — l'attestation est en trust-on-registration (demandez attestation: 'none')
const webauthn = new WebauthnProvider({ rpName: 'Fluveo', rpID: 'fluveo.ch', origin: 'https://fluveo.ch' })
const reg = await webauthn.startRegistration({ id: user.id, name: user.email })
// … cérémonie navigateur … puis :
await webauthn.finishRegistration(reg.state, user.id, browserResponse)
```

Un code est lié au destinataire à qui il a été envoyé. `verify()` prend ce
destinataire tel que l'application le connaît pour la connexion en cours —
l'email de l'utilisateur en attente, jamais une valeur lue dans la requête. Un
challenge ouvert pour un autre destinataire répond
`{ ok: false, reason: 'not_found' }` et reste intact pour son propriétaire.
Gardez le `challengeId` côté serveur entre les deux requêtes (dans la session,
ou dans un jeton de connexion en attente signé), à côté de l'utilisateur en
attente.

#### Écrire son propre store de challenges

Les stores par défaut gardent les challenges en mémoire, ce qui convient à un
processus et pas à plusieurs : un code émis par une instance ne peut pas être
vérifié par une autre. Un store partagé est une implémentation Redis ou SQL de
`OtpChallengeStore`.

Il doit une opération que les autres n'impliquent pas :

```typescript
interface OtpChallengeStore {
  save(challenge: OtpChallenge): Promise<void>
  find(id: string): Promise<OtpChallenge | null>
  delete(id: string): Promise<void>
  /** Retire le challenge ET le rend, de façon indivisible. */
  take(id: string): Promise<OtpChallenge | null>
}
```

**`take` doit être atomique.** C'est ce qui rend un code à usage unique
réellement unique : au plus un appelant concurrent peut recevoir un challenge
donné, tous les autres reçoivent `null`. Le lire puis le supprimer en deux
opérations, et deux requêtes portant le même bon code sont toutes deux
acceptées — un code volé reste dépensable tant que son propriétaire ne l'a pas
dépensé. Le budget d'essais suit le même chemin : des tentatives erronées
concurrentes lisent toutes le même compteur et écrivent le même incrément, donc
vingt d'entre elles coûtent un essai.

Utilisez la primitive que votre base offre déjà :

```
SQL     DELETE FROM otp_challenges WHERE id = $1 RETURNING *
Redis   GETDEL, ou un script Lua quand la valeur doit être décodée
autre   un compare-and-set sur une colonne de version
```

Un store incapable de faire cela atomiquement n'est pas utilisable pour du MFA,
et un store qui n'implémente pas `take` du tout est refusé à la construction du
provider plutôt qu'à la première vérification.

> **Cassant en 0.2.0.** `take` a été ajouté à l'interface : un store écrit pour
> 0.1.x ne la satisfait plus. Sur une version `0.x` le mineur est la position
> cassante et un caret ne le franchit pas — rien n'y monte par accident — mais
> une montée volontaire demande la méthode.

Les stores mémoire balaient les challenges expirés à mesure que de nouveaux
arrivent, pour qu'une connexion abandonnée — un code demandé et jamais soumis —
ne s'accumule pas. Ils portent aussi un plafond (10 000 par défaut,
`new MemoryOtpChallengeStore(max)`) : le balayage ne retire que ce qui a
**expiré**, donc un flot de challenges encore valides grossirait sans limite.

Pleins, ils **refusent** un nouveau challenge plutôt que d'en évincer un ancien.
Faire de la place en supprimant le challenge en attente de quelqu'un d'autre,
c'est ainsi qu'un flot verrouille un vrai utilisateur dehors ; refuser fait
porter l'échec à celui qui inonde. Limitez le débit de l'endpoint qui émet les
codes, ou utilisez un store persistant avec un TTL sur la ligne.

> **Persistance.** Les stores par défaut sont en mémoire — facteurs et passkeys sont perdus au redémarrage. En production, implémentez `MfaFactorStore` / `WebauthnCredentialStore` au-dessus de votre base de données (Atlas) et les stores de challenge au-dessus d'un cache rapide (KeyDB).

---
