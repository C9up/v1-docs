# Testing and custom drivers

This guide covers testing a sign-in and writing a driver:

- Testing a sign-in
- Writing a driver of your own

## Testing a sign-in

A sign-in cannot be exercised against a real provider in a test, so Transit
ships a double for the manager.

```ts
import { TransitManager } from '@c9up/transit'
import { FakeTransit } from '@c9up/transit/testing'

const transit = new FakeTransit().willReturn('google', {
  email: 'ada@acme.test',
})
container.singleton(TransitManager, () => transit)

// ... the code under test runs its sign-in

transit.assertSignedIn('google')
expect(transit.lastUser()?.email).toBe('ada@acme.test')
```

`willReturn` fills in whatever a test does not say, so a test about roles does
not have to invent an avatar. `assertBegan`, `assertSignedIn` and
`assertNobodySignedIn` cover what happened; `reset()` clears the recording and
keeps what was declared.

A directory is doubled the same way, and `willAccept` declares the credentials
it takes:

```ts
const transit = new FakeTransit()
  .willReturn('staff', { email: 'ada@acme.test' })
  .willAccept('staff', 'ada', 'correct horse')

await transit.authenticate('staff', 'ada', 'correct horse')
```

It is deliberately **not** lenient. The state round trip and the value
`begin()` asked you to keep are enforced exactly as the real drivers enforce
them:

```ts
const { state, secret } = await transit.begin('google')

// A controller that forgot to store the state fails here.
await transit.callback('google', code, state, undefined, secret)
// → requires expectedState for CSRF protection
```

The same goes for an empty password against a directory, which the real one
refuses because a bind without one is an anonymous bind the directory accepts.

A fake that let either pass would teach applications to ship exactly the
controller that has the bug.

## Writing a driver of your own

Extend `Oauth2Driver` and you write only what makes the provider itself: the
three URLs, its default scopes, and how to read its payload.

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

Override `tokenAuth = 'basic'` when the provider takes its credentials as HTTP
Basic, `requiresPkce = true` when it mandates PKCE, `authorizeParams()` and
`userInfoParams()` for its own query parameters, and `fetchUser()` when the
address needs a second call.

For an OAuth1 provider, extend `Oauth1Driver` instead: four URLs — request
token, authorize, access token, profile — and the same `mapUser`. The signing
is handled.

Anything answering `redirectUrl(state, secret?)` and
`callback(code, state, expected, secret?)` works too, without either base.
Validate the state round trip with `assertOAuthState(state, expected)` — it is
exported for exactly that, and it fails closed on a missing expected value.
