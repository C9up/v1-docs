# Endpoint d’autorisation et clients

Ce guide couvre l'endpoint d'autorisation et les clients :

- Câbler `/authorize`
- Les clients
- Les clients qui s'enregistrent (RFC 7591)

## Câbler `/authorize`

La décision est celle de visa ; la page est la vôtre. La page de consentement
est le seul endroit où un utilisateur confie ses données à une application :
trois choses n'y sont pas optionnelles.

- **Le POST de consentement est protégé contre le CSRF.** Sans cela, une page
  d'un autre site soumet le formulaire toute seule — son propre client, son
  propre challenge PKCE, `approve=1` — et un utilisateur connecté autorise
  l'application de l'attaquant sans rien voir. Activez le CSRF de blackhole
  (`csrf: true` dans `config/blackhole.ts`) et placez `{{ csrfField() }}` dans le
  formulaire.
- **La page de consentement ne peut pas être encadrée.** Une page dans une
  iframe permet à un autre site de poser son propre bouton sur « Autoriser ».
  Envoyez `X-Frame-Options: DENY` depuis cette page, et `frame-ancestors 'none'`
  si vous construisez vous-même sa `Content-Security-Policy`.
- **Le POST accorde ce que la page a montré, pas ce que dit le POST.** La
  requête validée reste sur le serveur, dans un ticket à usage unique lié à la
  session et à l'utilisateur. Le formulaire ne porte que l'id du ticket.

```ts
// start/routes.ts
import visa from '@c9up/visa/services/main'

router.get('/oauth/authorize', async (ctx) => {
  const outcome = await visa.authorize(ctx.request.qs(), ctx.auth.user?.id)

  if (outcome.type === 'redirect') return ctx.response.redirect(outcome.url)
  if (outcome.type === 'error') {
    // PAS une redirection : c'est la redirect URI qui a échoué à la validation.
    return ctx.view.render('oauth/error', { error: outcome.error.toResponse() })
  }
  if (!ctx.auth.user) {
    return ctx.response.redirect(`/login?next=${encodeURIComponent(ctx.request.url(true))}`)
  }

  // Gardé côté serveur : le POST ci-dessous accorde ceci, quoi qu'on lui envoie.
  const ticket = visa.consentTicket(outcome.request, ctx.auth.user.id)
  ctx.session.put('visa.consent', ticket)

  ctx.response.header('x-frame-options', 'DENY')
  return ctx.view.render('oauth/consent', {
    client: outcome.request.client,
    scopes: outcome.request.scopes,
    ticket: ticket.id,
  })
})

// Protégé contre le CSRF par blackhole, comme tout autre POST de formulaire.
router.post('/oauth/consent', async (ctx) => {
  const user = ctx.auth.getUserOrFail()
  // Retiré, pas lu : un second POST du même formulaire ne trouve rien.
  const validated = await visa.redeemConsentTicket(
    ctx.session.pull('visa.consent'),
    ctx.request.input('ticket'),
    user.id,
  )
  if (validated === null) {
    // Pas de ticket, le ticket d'une autre page, un autre utilisateur, expiré,
    // ou un client qui a changé depuis l'affichage de la page : on recommence.
    return ctx.view.render('oauth/error', { error: { error: 'invalid_request' } })
  }

  const url = ctx.request.input('approve') === '1'
    ? await visa.grant(validated, user.id)
    : visa.deny(validated)
  return ctx.response.redirect(url)
})
```

```html
<!-- resources/views/oauth/consent.inker -->
<form method="POST" action="/oauth/consent">
  {{ csrfField() }}
  <input type="hidden" name="ticket" value="{{ ticket }}">
  <button name="approve" value="1">Autoriser</button>
  <button name="approve" value="0">Refuser</button>
</form>
```

`consentTicket(request, userId)` renvoie des valeurs simples — un `id` aléatoire
de 256 bits, le `userId`, un `expiresAt` et la requête d'autorisation telle
qu'elle a été validée (la liste de scopes que l'utilisateur a vue, pas la fiche
du client) — si bien que n'importe quel store de session peut le garder.
`redeemConsentTicket(ticket, presentedId, userId)` répond `null` quand il n'y a
pas de ticket, que le formulaire désigne un autre ticket (un formulaire resté
ouvert dans un onglet ne peut pas approuver ce qu'un autre onglet a mis depuis
dans la session), que l'utilisateur diffère, que le ticket a expiré, ou que la
requête ne se valide plus — le client a pu perdre un scope ou une redirect URI
entre-temps, ou enregistrer plus de scopes que la page n'en listait. Elle ne
frappe rien : le code n'existe qu'une fois `grant` exécuté. Un ticket dure dix
minutes ; `consentTicketTtlSeconds` dans la config change cette durée.

### Quand l'écran de consentement est évité

`authorize()` répond `redirect` sans écran de consentement dans deux cas : le
client est `trusted`, ou l'utilisateur a déjà accepté tous les scopes demandés
(et la requête ne porte pas `prompt=consent`).

Aucun des deux ne vaut pour un client public dont l'URI de redirection est une
adresse de loopback, `localhost` ou un schéma privé
(`com.example.app:/callback`). Ce client voit l'écran à chaque fois. N'importe
quel autre programme de la machine de l'utilisateur peut envoyer le même
`client_id`, avec sa propre paire PKCE et son propre port : rien ne prouve que
la requête vient de l'application que l'utilisateur a acceptée (RFC 8252 §8.6).
Sans l'écran, ce programme recevrait les jetons de l'utilisateur, et
l'utilisateur ne verrait rien. Un client confidentiel prouve son identité avec
son secret, et un client public sur une URI de redirection `https` reçoit le
code sur un hôte qui lui appartient : les deux gardent le chemin sans écran.

### L'émetteur dans la redirection

Chaque redirection construite par `grant()`, `deny()` et `authorize()` porte
`iss`, l'émetteur (RFC 9207), à côté de `code` ou `error` et de `state`. Un
client qui parle à plusieurs serveurs d'autorisation le compare au serveur vers
lequel il a envoyé l'utilisateur. Il détecte ainsi un code venu d'un autre
serveur (l'attaque mix-up). Le document de métadonnées l'annonce avec
`authorization_response_iss_parameter_supported: true`. Si vous construisez une
redirection vous-même avec `successRedirect()` ou `errorRedirect()`, passez
`visa.issuer`.

`authorize()` prend la query telle que le parser la livre. Un paramètre envoyé
deux fois (`scope=a&scope=b`) ou entre crochets (`scope[]=a`, `scope[x]=1`)
arrive sous forme de tableau ou d'objet, et la RFC 6749 §3.1 interdit qu'un
paramètre figure plus d'une fois : c'est un `invalid_request` — montré à
l'utilisateur quand il s'agit de `client_id` ou de `redirect_uri`, redirigé
sinon (sans `state` quand c'est `state` qui est répété). `resource` fait
exception, puisque la RFC 8707 permet à une requête d'en nommer plusieurs : une
chaîne ou plusieurs chaînes, rien d'autre.

## Les clients

```ts
const { client, secret } = await visa.registerClient({
  id: 'invoices',
  name: 'Factures',
  redirectUris: ['https://invoices.example.com/callback'],
  scopes: ['profile', 'invoices:read'],
})
```

`secret` n'est renvoyé qu'une fois et n'est stocké que haché ; un client qui le
perd en reçoit un nouveau. Un client public — une SPA, une application native
— s'enregistre avec `tokenEndpointAuthMethod: 'none'`, n'a pas de secret, et ne
peut pas utiliser `client_credentials` : « le client lui-même » ne veut rien
dire quand n'importe qui peut lire son id dans un navigateur. Un client public
sur une URI de redirection en loopback, sur `localhost` ou sur un schéma privé
voit aussi l'écran de consentement à chaque fois — voir
[Quand l'écran de consentement est évité](#quand-l-ecran-de-consentement-est-evite).

Le `tokenEndpointAuthMethod` qu'un client enregistre est le **seul** accepté :
un client déclaré `client_secret_basic` qui envoie son secret dans le body est
refusé, et inversement. Accepter les deux rendrait la méthode enregistrée
décorative — et le body est lisible par ce qui ne pouvait pas lire l'en-tête.

Un scope pour lequel le client n'est pas enregistré est **refusé**, jamais
silencieusement retiré — accorder moins que demandé, c'est ainsi qu'un client
finit par croire qu'il détient une permission qu'il n'a pas.

## Les clients qui s'enregistrent (RFC 7591)

Éteint tant que vous ne l'allumez pas. Un client MCP comme claude.ai n'a
personne pour remplir un formulaire à sa place ; un serveur sur l'internet
public avec ça ouvert laisse n'importe qui créer un client.

```ts
// config/visa.ts
registration: {
  enabled: true,
  initialAccessToken: env.get('VISA_REGISTRATION_TOKEN'),
  scopes: ['profile'],
}
```

Ce qu'un client auto-enregistré **peut être** est la décision du serveur, pas
celle de la requête : grants, scopes et méthode d'auth viennent de cette
config, l'id est choisi ici, et une redirect URI doit être en https ou en http
sur une adresse de loopback.

Un jeton d'accès initial absent ou faux est un échec d'authentification, pas un
problème de métadonnées : `401` avec `{ "error": "invalid_token" }` et un défi
`Bearer` (RFC 7591 §3, RFC 6750 §3.1) — `WWW-Authenticate: Bearer` quand aucun
jeton n'a été envoyé, `Bearer error="invalid_token"` quand c'était le mauvais.
