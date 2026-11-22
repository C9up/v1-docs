# Garde JWT

Ce guide couvre la garde JWT :

- JwtStrategy
- Blacklist JWT sur Redis

## JwtStrategy

`JwtStrategy` est l'implémentation JWT intégrée utilisant HMAC-SHA256 (HS256). Elle gère la signature des tokens, leur vérification et la recherche des utilisateurs.

### Configuration

```typescript
import { authFinder, JwtStrategy } from '@c9up/warden'
import env from '#start/env.js'

const users = authFinder({
  hash, // un Hash de @c9up/sigil
  findForAuth: (email) => db.users.findByEmail(email),
  passwordColumnName: 'passwordHash',
})

const jwt = new JwtStrategy({
  // Obligatoire : minimum 32 caractères, lève une erreur à la construction si plus court
  secret: env.get('JWT_SECRET'),

  // Optionnel : secondes ou chaîne de durée (par défaut : 3600)
  expiresIn: '2h',

  // Appelé par authenticate() — vérifie email/mot de passe. Bâti sur authFinder
  // (voir « Vérification d'identifiants à temps constant ») : un email inconnu
  // coûte le même hachage qu'un mauvais mot de passe, et les deux lèvent
  // E_INVALID_CREDENTIALS, que le garde lit comme un refus.
  verifyCredentials: async (email, password) => {
    const user = await users.verifyCredentials(email, password)
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },

  // Appelé par verify() — charge l'utilisateur par ID depuis la claim `sub` du token
  findUser: async (id) => {
    const user = await db.users.findById(id)
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

### signToken()

Signe un token pour un `UserPayload` existant sans passer par `authenticate()`. Utile pour l'usurpation d'identité, les tokens de rafraîchissement ou les helpers de test.

```typescript
const token = jwt.signToken({
  id: 'user-1',
  roles: ['admin'],
  permissions: ['posts.create'],
})
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Payload du token

Le payload JWT contient toujours :

| Claim | Description |
|---|---|
| `sub` | ID de l'utilisateur (`user.id`) |
| `roles` | Tableau de rôles (optionnel) |
| `permissions` | Tableau de permissions (optionnel) |
| `iat` | Horodatage d'émission (secondes Unix) |
| `exp` | Horodatage d'expiration (secondes Unix) |

### generateJwtSecret()

Génère un secret aléatoire de 48 octets cryptographiquement sûr encodé en base64url — sûr à stocker dans `.env` :

```typescript
import { generateJwtSecret } from '@c9up/warden'

console.log(generateJwtSecret())
// 'wX3hK2qP9rZmYnLsVbTuCjEoAiDfGkNpQeRwXyZa1B2C3...'
```

---

## Blacklist JWT sur Redis

La révocation de jetons peut vivre sur une connexion [Quasar](/fr/guides/database/redis) plutôt qu'en mémoire :

```ts
import { RedisBlacklistDriver, quasarConnection } from '@c9up/warden'

new RedisBlacklistDriver(quasarConnection())
```

La connexion est résolue au premier contrôle de révocation : une application dont la blacklist n'est jamais consultée n'ouvre donc aucun socket pour elle. Passer un client directement fonctionne toujours : `@c9up/quasar` est une peer **optionnelle**.

### Survivre à une panne Redis — `ResilientBlacklistDriver`

```ts
import { MemoryBlacklistDriver, RedisBlacklistDriver, ResilientBlacklistDriver, TokenBlacklist } from '@c9up/warden'

new TokenBlacklist(new ResilientBlacklistDriver(
  new RedisBlacklistDriver(quasarConnection()),
  new MemoryBlacklistDriver(),          // la valeur par défaut
  { onDegrade: (event) => log.warn(event) },
))
```

Une révocation est écrite dans les deux stockages, toujours : cette instance
sait ce qu'elle a révoqué sans aller-retour. Une vérification interroge d'abord
l'enregistrement local, puis Redis. Quand Redis ne peut pas répondre et que
l'enregistrement local ne connaît pas le credential, la vérification **échoue
fermée** : l'erreur est levée, et le garde la traite comme une stratégie en
échec — un 500, ou un invité sous l'authentification silencieuse —, jamais comme
« non révoqué ». La même blacklist sert aux déconnexions de session et à des JWT
émis pour plusieurs jours : répondre « non révoqué » pendant une panne
accepterait toutes les connexions révoquées ailleurs.

`{ failOpen: true }` laisse au contraire passer ces credentials. Cela convient à
un déploiement dont le seul consommateur est un garde JWT à `expiresIn` court,
où rester disponible pendant une panne vaut plus qu'une révocation manquée
pendant au plus la durée de vie d'un jeton. `onDegrade` est appelé à chaque
repli ; par défaut, il signale le premier échec d'une opération, puis un
décompte périodique.
