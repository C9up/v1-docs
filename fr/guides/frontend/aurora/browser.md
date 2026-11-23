# Outils du navigateur

Ce guide couvre le stockage, les cookies, HTTP et les URL dans le navigateur :

- Helpers navigateur & stockage
- Cookies isomorphes
- Client HTTP
- Constructeur d'URL — `urlFor`
- Classes Tailwind — `cn`

## Helpers navigateur & stockage

Le barrel client fournit des helpers DX sûrs en SSR (sans Node — ils sont no-op ou renvoient une valeur par défaut côté serveur, donc le même code de page tourne des deux côtés).

**Navigation** — `redirect(url)`, `replace(url)`, `reload()` (rechargement complet), plus l'historique SPA sans reload : `navigate(url)`, `back()`, `forward()`.

**Stockage** — `WebStorage` est un wrapper typé et namespacé par préfixe au-dessus de `localStorage` / `sessionStorage` :

```js
import { storage, session, WebStorage } from '@c9up/aurora'

storage.set('user', { id: 1 })          // sérialisé en JSON
storage.get('user')                     // { id: 1 } | null
storage.has('user'); storage.keys()
storage.getOrSet('seed', () => compute())

const prefs = new WebStorage({ prefix: 'prefs:', area: 'local' })
prefs.clear()                           // limité au préfixe — ne touche pas les autres clés
```

**`persistedSignal`** — un signal miroité dans le stockage, synchronisé entre onglets :

```js
import { persistedSignal } from '@c9up/aurora'

const theme = persistedSignal('theme', 'light')   // restauré au rechargement
theme('dark')                                      // persisté + diffusé aux autres onglets
```

**État navigateur réactif** — des signaux qui suivent l'environnement (à créer une fois au niveau module et à partager) :

```js
import { prefersDark, online, windowSize, visibility, hash } from '@c9up/aurora'

const dark = prefersDark()    // Signal<boolean>, change avec le thème de l'OS
const live = online()         // navigator.onLine
const size = windowSize()     // { width, height } au resize
```

**Query URL** — `queryParam(key)` est un signal lié à un paramètre de query (la lecture reflète l'URL, l'écriture fait un `pushState` sans reload).

**Presse-papiers / partage** — `clipboard.copy/read` et `share(data)` (Web Share API).

## Cookies isomorphes

`cookie.get/set/remove` est un accesseur sûr en SSR au-dessus de `document.cookie`.
Seul, il ne suffit pas au SSR : pendant un rendu serveur il n'y a pas de `document`,
donc une page qui décide sa mise en page depuis un cookie (sidebar repliée, thème,
locale) rend l'état **par défaut** — puis le navigateur lit le vrai cookie à
l'hydratation et repeint, p. ex. une sidebar qui s'anime déplié→replié à chaque
navigation.

La solution, c'est **`cookieSignal`** — un signal adossé à un cookie, initialisé
depuis le cookie des **deux** côtés (le seed de la requête côté serveur,
`document.cookie` côté navigateur) et qui persiste chaque écriture. Même valeur
serveur et client ⇒ le markup SSR correspond à l'hydratation ⇒ pas de flash, pas de
mismatch.

```js
import { cookieSignal, cookieState, booleanCookie, jsonCookie } from '@c9up/aurora'

// État string :
const locale = cookieSignal('locale', 'en')
locale('fr')                        // persisté dans le cookie

// État typé via un codec (boolean / enum / JSON) :
const collapsed = cookieState('sidebar', false, booleanCookie)   // "1" / "0"
const prefs = cookieState('prefs', { dense: false }, jsonCookie({ dense: false }))
```

Dans une page, à lire en haut (avant tout `await`) :

```js
export default function Sidebar() {
  const collapsed = cookieState('sidebar', false, booleanCookie)
  return html`<aside class="${() => (collapsed() ? 'w-16' : 'w-60')} transition-all">…</aside>`
}
```

Pour que le **serveur** seede le cookie, déclarez-le dans `render()` / `renderPage()`
via l'allowlist `cookies` — aurora lit uniquement ces noms depuis la requête et les
seede avant le rendu (ils ne sont PAS sérialisés dans la page ; le navigateur lit
`document.cookie`) :

```js
await aurora.render(ctx, 'Sidebar', props, {
  cookies: ['sidebar', 'theme'],   // uniquement des cookies UI bruts, lisibles en JS
})
```

> ⚠️ Ne jamais mettre un cookie de session / signé / chiffré / `httpOnly` dans
> `cookies` — ceux-là restent côté serveur. L'allowlist est pour les cookies d'état
> UI bruts.
>
> `cookieSignal` est le jumeau « cookie » de `persistedSignal` (qui miroite dans le
> web storage, côté client uniquement). Utilisez `cookieSignal` quand le **serveur**
> doit aussi lire la valeur ; `persistedSignal` quand c'est purement client.

## Client HTTP

`HttpClient` wrappe `fetch` pour écrire `await http.get('/auth/me')` au lieu de gérer à la main les headers, `res.json()` et les codes de statut. Isomorphe (utilise le `fetch` global).

```js
import { HttpClient } from '@c9up/aurora'

const api = new HttpClient({
  baseURL: 'https://api.example.com',
  token: () => authToken(),     // bearer, relu à chaque requête (string ou getter)
})

const me = await api.get('/auth/me')              // JSON parsé, Authorization auto
await api.post('/posts', { title: 'Hi' })         // objet simple → corps JSON + content-type
await api.get('/search', { query: { q: 'ream' } })// paramètres de query

api.setHeader('Accept-Language', 'fr')            // gestion des headers par défaut (chaînable)
   .setHeaders({ 'X-App': 'web' })
   .removeHeader('x-trace')
```

- Méthodes : `get` / `post` / `put` / `patch` / `delete`, plus `raw(method, url, body?)` pour la `Response` brute.
- Une réponse non-2xx lève `HttpError` (`status`, `response`, `data` parsé). `isHttpError(e)` est un type-guard pour un `catch` propre.
- `extend(options)` dérive un client enfant avec les défauts fusionnés, réglages XSRF compris. Quand son `baseURL` est sur une autre origine, les identifiants hérités — le token, un en-tête `Authorization` ou XSRF — restent en arrière : passez-les dans `options`, ou réglez `allowCrossOriginAuth: true`, pour les y envoyer délibérément. `token: null` signifie aucun token.
- Passez une option `parse` pour un résultat validé au runtime et entièrement typé ; sans elle, le type générique est une assertion non vérifiée de la forme de la réponse (la frontière HTTP habituelle).
- Une instance `http` same-origin par défaut est exportée pour les appels rapides.

**Gestion d'erreur sans try/catch** — `attempt()` transforme le throw en résultat discriminé, donc un submit de formulaire branche au lieu d'encapsuler chaque appel :

```js
import { HttpClient } from '@c9up/aurora'
const api = new HttpClient()

const r = await api.attempt(api.post('/auth/login', creds))
if (r.ok) user(r.data)
else fieldErrors(r.error.data)   // r.error = HttpError ; .data = corps 4xx parsé
```

`attempt` résout `{ ok: false, error }` sur un `HttpError` (non-2xx) ; les vraies pannes de transport (hors-ligne, DNS) rejettent toujours — elles sont exceptionnelles.

**Annulation & timeout** — passez un `signal` pour annuler (au démontage, ou une recherche-au-clavier supplantée), ou un `timeout` (ms) pour auto-abandonner ; les deux se combinent, le premier déclenché gagne. `isAbortError(e)` reconnaît une requête annulée ou expirée pour l'ignorer :

```js
const api = new HttpClient({ timeout: 8000 })          // timeout par défaut par requête
const controller = new AbortController()
api.get('/search', { query: { q }, signal: controller.signal })
controller.abort()                                      // annule en vol
```

## Constructeur d'URL — `urlFor`

Construisez les URL depuis des **routes nommées** (définies côté serveur avec
`.as()`) au lieu de coder les chemins en dur — la moitié client du
`router.urlFor` de Ream, isomorphe : le même appel marche au SSR et après
hydratation.

```ts
import { urlFor } from '@c9up/aurora'

urlFor('users.show', { id: 42 })           // → '/users/42'
urlFor('auth.login')                       // → '/login'
urlFor('search', {}, { q: 'ream', p: 2 })  // → '/search?q=ream&p=2'
```

Il résout sur un manifeste `nom → motif`. Passez-le au rendu depuis le serveur —
construisez-le avec `router.namedManifest()` :

```ts
await aurora.render(ctx, 'Users', { users }, {
  routes: router.namedManifest(), // seules les routes NOMMÉES sont exposées au client
})
```

`renderPage` installe le manifeste avant le SSR et le sérialise dans la page, si
bien que le bootstrap d'hydratation le réinstalle via `setRouteManifest` —
`urlFor` résout alors à l'identique côté serveur et navigateur.
(`setRouteManifest(routes)` est aussi exporté si vous devez l'installer à la
main.) Voir [Routage → Routes nommées](/fr/guides/basics/url-builder#routes-nommees).

**Le manifeste sérialisé est public** — tout visiteur de la page peut le lire :
`router.namedManifest()` tel quel livre à un visiteur anonyme de `/login` les noms
et chemins de vos routes d'administration et internes. N'exposez que les routes
sur lesquelles le navigateur appelle `urlFor`, avec `clientRoutes` — par appel, ou
une fois dans `config/aurora.ts` :

```ts
// config/aurora.ts
import { defineConfig } from '@c9up/aurora/server'

export default defineConfig({
  clientRoutes: { only: ['auth.*', 'users.*'] },  // ou { except: ['admin.*'] }
})                                                 // ou (name, pattern) => boolean
```

`*` correspond à n'importe quelle suite de caractères. Le serveur résout toujours
sur toute la table `routes` ; seule la copie de la page est filtrée. Sans
`clientRoutes`, toutes les routes sont sérialisées. En développement, une route
que la page a résolue côté serveur mais que le client n'aura pas est signalée :
un `urlFor` dessus lèverait une fois la page hydratée.

## Classes Tailwind — `cn`

Composez les noms de classes et résolvez les conflits Tailwind — une
réimplémentation **zéro dépendance** de `clsx` + `tailwind-merge` (aucune dep
externe). Le dédoublonnage est le but : dans un même scope de variante, la
**dernière** classe de chaque groupe en conflit l'emporte.

```ts
import { cn } from '@c9up/aurora'

cn('px-2 py-1', isActive && 'bg-indigo-600', props.class)
cn('px-2', 'px-4')             // → 'px-4'    (la dernière gagne)
cn('mr-4', 'mr-8')             // → 'mr-8'    (pas d'accumulation)
cn('text-red-500', 'text-sm')  // → 'text-red-500 text-sm' (groupes différents)
cn('hover:p-2', 'hover:p-4')   // → 'hover:p-4' (scopé par variante)
```

Cible le jeu d'utilitaires standard de Tailwind **v4** (variantes, important `!`,
valeurs/propriétés arbitraires `[…]`, `/opacité`, négatifs) ; les classes inconnues
sont conservées telles quelles. `clsx` et `twMerge` sont aussi exportés. Voir aussi
[Tailwind](/fr/guides/frontend/tailwind).
