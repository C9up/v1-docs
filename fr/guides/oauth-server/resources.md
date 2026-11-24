# Protéger des ressources

Ce guide couvre la protection d'une ressource par jetons :

- Protéger une ressource
- Applications connectées

## Protéger une ressource

Le guard se déclare à côté des autres, dans `config/auth.ts` :

```ts
import { visaGuard } from '@c9up/visa'

export default defineConfig({
  default: 'visa',
  guards: {
    visa: visaGuard({
      store: () => visa.store,
      findUser: (id) => User.find(id),
    }),
  },
})
```

L'utilisateur authentifié porte le jeton qui l'a authentifié :

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities          // les scopes du jeton
token.allows('invoices.read')
token.authorize('invoices.write')   // lève E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

**Un scope n'est pas une permission.** Le garde place les scopes du jeton sur
`currentAccessToken` et laisse `user.permissions` tel que `findUser` l'a
renvoyé. Un scope est choisi par le client et accordé par consentement, et le
consentement ne vérifie jamais les droits propres de l'utilisateur — une route
qui a besoin des deux vérifie donc les deux. C'est ce que font `@Permission` et
`hasPermission` de Warden : sur une requête faite avec un jeton, ils exigent la
permission de l'utilisateur **et** le scope du jeton (voir
[Warden — les capacités ne sont pas des permissions](/fr/guides/auth/access-tokens-guard#les-capacites-ne-sont-pas-des-permissions)).

`findUser` est appelé à **chaque** requête, délibérément : un jeton émis pour
un compte désactivé depuis cesse de fonctionner ici, une fois pour toutes, au
lieu de là où chaque application pense à vérifier.

`createToken(user, abilities, { name, expiresInSeconds })` en frappe un
directement pour un client first-party — nommé par `tokenClientId` — et
`invalidateToken(token)` en révoque un. `expiresInSeconds`, dans la config de la
garde ou à l'appel, est un nombre entier positif de secondes ; toute autre
valeur lève `E_VISA_INVALID_TTL`.

La forme bas niveau reste disponible pour un serveur de ressources sans guard :

```ts
const grant = await visa.verify(bearerToken, new Date(), 'https://api.example/mcp')
if (!grant) return ctx.response.unauthorized({ error: 'invalid_token' })
```

### Un serveur de ressources dans un autre process (RFC 7662)

`verify()` lit le store. Un serveur de ressources qui ne le partage pas
interroge `/oauth/introspect` à la place — en tant que client à part entière,
et seulement une fois nommé :

```ts
// config/visa.ts
introspection: {
  resourceServers: ['api'],   // des ids de clients, enregistrés avec un secret
}
```

Sans cette clé, l'introspection ne répond qu'au client à qui le jeton a été
émis, et `{ active: false }` à tous les autres — la même réponse que pour un
jeton qui n'existe pas. Un serveur de ressources nommé obtient la vraie réponse
pour n'importe quel jeton d'accès, `aud` compris, et peut donc refuser un jeton
frappé pour une autre ressource (RFC 8707). Deux limites tiennent même pour
lui : un client public ne compte jamais, puisqu'il s'authentifie sans rien et
que le nommer ouvrirait l'introspection à quiconque connaît son id ; et les
jetons de rafraîchissement restent à leur propre client, puisqu'ils ne sont
jamais envoyés à un serveur de ressources (RFC 6749 §1.5). Les noms viennent de
cette config seulement : un client qui s'est enregistré lui-même n'y accède
jamais.

`token_type_hint` décide quelle table est lue en premier, jamais laquelle est
lue : un jeton envoyé avec le mauvais indice est quand même trouvé (RFC 7662
§2.1).

### Dire à un client où s'authentifier (RFC 9728)

Un 401 sans rien d'autre est une impasse : l'appelant apprend qu'il lui faut un
jeton, et rien sur d'où viennent les jetons. Déclarez la ressource et le
document de métadonnées est servi :

```ts
// config/visa.ts
protectedResource: {
  resource: 'https://api.example/mcp',
  scopesSupported: ['profile'],
}
```

Puis portez le défi sur le refus :

```ts
response.header('www-authenticate', guard.challenge())
// Bearer resource_metadata="https://api.example/.well-known/oauth-protected-resource/mcp"
```

Un client MCP remonte du 401 au document puis à ce serveur tout seul.

### Lier un jeton à un seul serveur (RFC 8707)

Un jeton sans audience déclarée est un jeton pour tout. Un client qui envoie
`resource=https://api.example/mcp` en obtient un qui y est lié, et
`verify(token, now, resource)` refuse celui frappé pour ailleurs. Le endpoint
d'autorisation lie ce que l'utilisateur a vu ; un échange peut rétrécir cette
liste, jamais l'élargir. `resourcesSupported` en config transforme une
ressource inconnue en `invalid_target` au lieu de quelque chose à frapper.

Les jetons émis avant qu'un client ne se mette à demander sont non liés, et
restent acceptés partout.

## Applications connectées

Ce qu'un utilisateur a autorisé, et comment il y met fin :

```ts
const apps = await visa.listAuthorizations(userId)
// [{ clientId, name, scopes, grantedAt, lastUsedAt?, active }]

await visa.revokeAuthorization(userId, clientId)
```

Une ligne par **application**, pas par jeton : une personne a autorisé une
application une fois, et les jetons vont et viennent sous cette décision. Une
application dont tous les jetons ont expiré reste affichée, marquée inactive —
« dernier usage » compte surtout quand plus rien n'est vivant, et la masquer
dirait qu'une application n'a jamais touché aux données alors que si.

Révoquer prend les deux types de jetons puis oublie le consentement, dans cet
ordre : qui révoque en urgence veut d'abord les sessions mortes.
