# Tests

Ce guide couvre le test du serveur OAuth.

## Les tests

`@c9up/visa/testing` vous donne le VRAI serveur sur un store mémoire, avec un
client déjà enregistré :

```ts
import { testVisa } from '@c9up/visa/testing'

const t = await testVisa({ scopes: ['profile', 'invoices:read'] })
const tokens = await t.tokensFor('user-7', 'invoices:read')

// Un test de ressource a maintenant un jeton qui se vérifie vraiment.
const grant = await t.visa.verify(tokens.access_token)
```

`tokensFor()` parcourt tout le chemin — autorisation, consentement, code,
échange — au lieu de frapper un jeton directement. Ce n'est délibérément pas un
double permissif : un helper qui accorderait tout ce qu'on lui demande
apprendrait aux applications à livrer un écran de consentement que personne n'a
jamais vu refuser, et un test qui passe contre un stub est un incident de
production avec une pastille verte.
