# Tests et drivers personnalisés

Ce guide couvre le test d'une connexion et l'écriture d'un driver :

- Tester une connexion
- Écrire son propre driver

## Tester une connexion

Une connexion ne peut pas être exercée contre un vrai fournisseur dans un test,
donc Transit livre une doublure du manager.

```ts
import { TransitManager } from '@c9up/transit'
import { FakeTransit } from '@c9up/transit/testing'

const transit = new FakeTransit().willReturn('google', {
  email: 'ada@acme.test',
})
container.singleton(TransitManager, () => transit)

// ... le code testé exécute sa connexion

transit.assertSignedIn('google')
expect(transit.lastUser()?.email).toBe('ada@acme.test')
```

`willReturn` complète ce que le test ne dit pas : un test sur les rôles n'a pas
à inventer un avatar. `assertBegan`, `assertSignedIn` et `assertNobodySignedIn`
couvrent ce qui s'est passé ; `reset()` efface l'enregistrement et conserve ce
qui a été déclaré.

Un annuaire se double de la même façon, et `willAccept` déclare les
identifiants qu'il accepte :

```ts
const transit = new FakeTransit()
  .willReturn('staff', { email: 'ada@acme.test' })
  .willAccept('staff', 'ada', 'correct horse')

await transit.authenticate('staff', 'ada', 'correct horse')
```

Elle n'est délibérément **pas** permissive. L'aller-retour du state et la valeur
que `begin()` demande de conserver sont exigés exactement comme les vrais
drivers les exigent :

```ts
const { state, secret } = await transit.begin('google')

// Un contrôleur qui a oublié de stocker le state échoue ici.
await transit.callback('google', code, state, undefined, secret)
// → requires expectedState for CSRF protection
```

Idem pour un mot de passe vide contre un annuaire, que la vraie refuse parce
qu'un bind sans mot de passe est un bind anonyme que l'annuaire accepte.

Une doublure qui laisserait passer l'un ou l'autre apprendrait aux applications
à livrer précisément le contrôleur qui a le bug.

## Écrire son propre driver

Étendez `Oauth2Driver` et vous n'écrivez que ce qui fait le fournisseur : les
trois URLs, ses scopes par défaut, et la lecture de sa charge utile.

```ts
import { Oauth2Driver, type TransitUser } from '@c9up/transit'

class GitLabDriver extends Oauth2Driver {
  protected readonly provider = 'GitLab'
  protected readonly authorizeUrl = 'https://gitlab.com/oauth/authorize'
  protected readonly accessTokenUrl = 'https://gitlab.com/oauth/token'
  protected readonly userInfoUrl = 'https://gitlab.com/api/v4/user'
  protected readonly defaultScopes = ['read_user'] as const

  protected mapUser(raw: Record<string, unknown>): TransitUser {
    return {
      id: String(raw.id ?? ''),
      email: String(raw.email ?? ''),
      name: String(raw.name ?? ''),
      avatarUrl: typeof raw.avatar_url === 'string' ? raw.avatar_url : undefined,
      raw,
    }
  }
}

export default defineConfig({
  gitlab: new GitLabDriver({ clientId, clientSecret, callbackUrl }),
})
```

Redéfinissez `tokenAuth = 'basic'` quand le fournisseur veut ses identifiants en
HTTP Basic, `requiresPkce = true` quand il impose PKCE, `authorizeParams()` et
`userInfoParams()` pour ses propres paramètres, et `fetchUser()` quand l'adresse
demande un second appel.

Pour un fournisseur OAuth1, étendez plutôt `Oauth1Driver` : quatre URLs — jeton
de requête, autorisation, jeton d'accès, profil — et le même `mapUser`. La
signature est prise en charge.

Tout ce qui répond à `redirectUrl(state, secret?)` et
`callback(code, state, expected, secret?)` fonctionne aussi, sans aucune des
deux bases. Validez l'aller-retour du state avec
`assertOAuthState(state, expected)` — il est exporté exactement pour ça, et il
échoue fermé sur une valeur attendue absente.
