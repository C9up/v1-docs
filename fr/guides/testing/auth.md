# Authentifier un client de test

Ce guide couvre la connexion d'un client de test.

## Authentifier un client de test

Chaque guard répond à `authenticateAsClient(...)` par ce qu'un client doit
envoyer pour être cet utilisateur. Le `loginAs()`
du client de test l'applique :

```ts
await client.get('/dashboard').loginAs(sessionGuard, user)
await client.get('/api/me').loginAs(jwtGuard, user)
await client.get('/keys').loginAs(apiKeyGuard, user, ['orders:read'])
await client.get('/admin').loginAs(basicGuard, 'ada', 'secret')
```

C'est le **guard** qui décide quoi envoyer : le test ne reproduit donc jamais la
façon dont ce guard authentifie, et la requête emprunte le même chemin de
vérification qu'en production. Un test qui forge son en-tête ne prouve que le bon
fonctionnement de la forge.

| guard | répond par | reçoit |
|---|---|---|
| jwt | `authorization: Bearer <signé>` | l'utilisateur |
| session | une entrée de session sous la clé du guard | l'utilisateur |
| access_tokens | `authorization: Bearer oat_…` — un vrai jeton émis par le provider | l'utilisateur, puis des capacités et des options de jeton facultatives |
| basic | `authorization: Basic <base64>` | uid + mot de passe |

Un guard session renvoie des **valeurs** de session, que seul quelque chose
détenant le driver peut persister — configurez `sessionSeeder` sur le client de
test. Sans lui, `loginAs()` lève au lieu d'envoyer la requête non authentifiée.

---
