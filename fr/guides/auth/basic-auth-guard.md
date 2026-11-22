# Garde Basic auth

Ce guide couvre la garde Basic auth.

## BasicAuthStrategy

HTTP Basic (le pilote `basic_auth`). Le navigateur demande, puis
renvoie les identifiants à **chaque** requête — d'où sa pertinence pour un
endpoint machine-à-machine ou un outil interne derrière TLS, et son inadéquation
pour une connexion utilisateur.

```ts
import { authFinder, basicAuthGuard, safeCompare } from '@c9up/warden'

const users = authFinder({ hash, findForAuth: (email) => User.findBy('email', email) })

basicAuthGuard({
  realm: 'Espace admin',                  // affiché dans l'invite du navigateur
  verifyCredentials: async (uid, password) => {
    // Lève E_INVALID_CREDENTIALS sur tout échec : le garde répond 401.
    const user = await users.verifyCredentials(uid, password)
    return { id: user.id, email: user.email }
  },
})
```

Deux choses qu'il fait pour vous :

- L'en-tête est découpé sur le **premier** deux-points (RFC 7617) — un mot de
  passe peut en contenir, un nom d'utilisateur non. Découper sur le dernier
  accepterait la mauvaise paire.
- Un utilisateur inconnu et un mot de passe faux renvoient le **même** message.
  Les distinguer transforme l'endpoint en oracle de noms d'utilisateurs — et
  répondre plus vite à l'un qu'à l'autre aussi, d'où l'exemple bâti sur
  `authFinder`.
- Un `verifyCredentials` peut répondre à un mauvais identifiant par `null` ou en
  levant `E_INVALID_CREDENTIALS` ; les deux donnent un 401. Toute autre erreur
  est une panne, et rapportée comme telle, pas comme un mauvais mot de passe.

Inscrite comme garde, les routes `@Guard('basic')` lisent l'en-tête
`Authorization: Basic …` ; un refus répond 401 avec
`WWW-Authenticate: Basic realm="…", charset="UTF-8"`, pour que le navigateur
demande. `strategy.challenge` donne cette valeur pour une réponse construite à
la main. `safeCompare(a, b)` est exporté pour une app qui
vérifie un secret partagé en clair — un `===` simple sort plus tôt sur une
divergence précoce, et cet écart est mesurable.

---
