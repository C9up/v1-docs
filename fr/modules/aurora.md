# Aurora — Runtime UI réactif

Aurora est le runtime UI léger de Ream (`@c9up/aurora`) : DOM via tagged-templates, état basé sur des signaux, SSR isomorphe et hydration côté navigateur. Pas de JSX, pas de bundler dans l'app, pas de virtual DOM.

Aurora est **le même code côté serveur et navigateur**. Le package livre les sources TypeScript pour Node (transpilées à la volée par `@swc-node/register`) **et** un `dist/` pré-compilé en modules ES2022 que le navigateur charge directement via un importmap.

## Installation

```bash
pnpm add @c9up/aurora
```

Le `dist/` du package est construit une fois au niveau framework (`pnpm -w build` à la racine de l'espace de travail) — les apps qui consomment `@c9up/aurora` n'ont pas besoin de bundler.

## Templates — `html`

Le tag `html` retourne un `TemplateResult`. Il ne touche pas au DOM par lui-même ; le rendu (`render`, `renderToString`, `hydrate`) est ce qui rattache le résultat quelque part.

```ts
import { html } from '@c9up/aurora'

const greeting = (name: string) => html`<p>Bonjour, ${name} !</p>`
```

Les emplacements dans les templates sont typés :

- **Slot texte** — `<p>${value}</p>` interpole une string, un nombre ou un signal en nœud texte.
- **Slot attribut** — `<a href="${url}">` pose un attribut ; si la valeur est un signal, l'attribut se re-render au changement.
- **Slot propriété** — `<input .value="${signal}">` (préfixe pointé) écrit une propriété DOM.
- **Attribut booléen** — `<button ?disabled="${signal}">` toggle la présence de l'attribut.
- **Slot événement** — `<button @click="${handler}">` ajoute un écouteur.
- **Template imbriqué** — voir l'exemple ci-dessous.

  ```ts
  html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`
  ```

Les templates sont cachés par leur tableau de strings statiques, le re-rendu du même template est donc bon marché.

## Signaux — `signal`, `effect`, `memo`

```ts
import { signal, effect, memo } from '@c9up/aurora'

const count = signal(0)

// Lire
console.log(count())        // 0

// Écrire
count(1)
count((prev) => prev + 1)   // 2

// Réagir
effect(() => {
  console.log('count vaut maintenant', count())
})

// Dériver
const doubled = memo(() => count() * 2)
```

`signal()` retourne une fonction. On l'appelle sans arg pour lire, avec un arg pour écrire. Les signaux sont trackés automatiquement à l'intérieur de `effect()` et `memo()`.

### Cycle de vie d'un composant

```ts
import { component, html, onMount, onUnmount, signal } from '@c9up/aurora'

const Counter = component(() => {
  const count = signal(0)
  onMount(() => console.log('monté'))
  onUnmount(() => console.log('retiré du DOM'))
  return html`<button @click=${() => count(count() + 1)}>${count}</button>`
})
```

L'état c'est `signal()` du layer réactif — pas d'API "hooks" séparée. Les signaux fonctionnent à l'intérieur ET en dehors d'un setup de composant, donc la même primitive sert pour l'état au niveau module, les valeurs dérivées (`memo`), et les effets de bord (`effect`). `onMount` / `onUnmount` sont les seuls helpers liés au cycle de vie d'un composant ; ils existent parce qu'ils ont besoin d'accès à la file de cleanup propre à l'instance.

## SSR — `renderToString`

```ts
import { renderToString } from '@c9up/aurora'

const html = renderToString(html`<p>Bonjour le monde !</p>`)
// "<p>Bonjour le monde !</p>"
```

Le walker SSR est synchrone, alloue une seule string, et ne touche jamais à un DOM. Il tourne tel quel dans Node, dans les Workers et dans Deno.

## Pages partagées — `aurora.render()`

Le pattern Adonis-Inertia, adapté à aurora. Un fichier par page, **même source côté serveur et côté navigateur** (ESM JS plain, sans étape de compilation).

### Câblage

```ts
// reamrc.ts
providers: [
  () => import('@c9up/aurora/provider'),
]
```

C'est tout. Le provider d'aurora :
- met `pages.root` par défaut sur `<projectRoot>/resources/pages` — il suffit de poser tes pages dedans ;
- auto-monte `GET /_assets/aurora/*` (le `dist/` pré-compilé d'aurora) ;
- auto-monte `GET /_assets/pages/*` (ton dossier de pages).

Pour utiliser un autre dossier, crée `config/aurora.ts` :

```ts
export default {
  pages: { root: './app/views' },
}
```

`pages.root` est résolu relativement à la racine du projet (même convention que `modules.path` dans `reamrc.ts`). Les chemins absolus passent tels quels.

### Écrire une page

```js
// resources/pages/Dashboard.js
import { component, html, onMount, signal } from '@c9up/aurora'
import { relay } from '@c9up/aurora/relay'

export default component((props) => {
  const status = signal('idle')

  onMount(() => {
    return relay().subscribe(props.channel, (ev) => {
      status(`last: ${ev.event}`)
    })
  })

  return html`<main>
    <h1>${props.title}</h1>
    <aside data-status=${() => status()}>${() => status()}</aside>
  </main>`
})
```

### La rendre depuis un contrôleur

```ts
import aurora from '@c9up/aurora/services/main'

router.get('/dashboard', async (ctx) => {
  await aurora.render(ctx, 'Dashboard', {
    title: 'Hello',
    channel: 'user/123/notifications',
  })
})
```

C'est tout. `aurora.render(ctx, name, props)` :

1. Résout `resources/pages/${name}.js` (import dynamique — les changements sur disque sont visibles à chaque requête)
2. Appelle la factory avec `props`, fait le SSR via `renderToString`
3. Enveloppe le markup dans un document HTML complet avec :
   - l'importmap qui alias `@c9up/aurora` → `/_assets/aurora/index.js`
   - un blob `<script id="aurora-page-data" type="application/json">` qui transporte `{ name, props, url, rootId }`
   - un `<script type="module">` inline qui importe aurora + le même module de page et appelle `hydrate(root, () => Page(data.props))`

Côté navigateur, aurora adopte le DOM SSR en place, attache signaux + écouteurs d'événements + hooks de cycle de vie. Le `onMount` que tu as écrit s'exécute une fois l'arbre vivant.

### Options

| Option | Défaut | Rôle |
|---|---|---|
| `lang` | `'en'` | Valeur de `<html lang="…">` |
| `rootId` | `'aurora-root'` | id du `<div>` qui enveloppe le body SSR — doit matcher ce que le client attend |
| `headExtra` | `''` | HTML brut inséré dans `<head>` après l'importmap. Pour `<title>`, meta tags, stylesheets |
| `importmap` | `{ "@c9up/aurora": "/_assets/aurora/index.js" }` | Entrées additionnelles à fusionner dans l'importmap de la page |

### Pourquoi JS pur (pas TS) ?

Parce que **le même module doit se charger dans Node ET dans le navigateur**, sans étape de build côté app. Aurora ship son JS dans `dist/` et arrive au navigateur via l'importmap. Tes pages vivent dans `resources/pages/*.js` et arrivent de la même façon. Si tu veux des types sur une page, écris un `.d.ts` à côté — ton éditeur le ramasse, le runtime reste JS.

## Bas niveau — hydration directe

Si tu ne veux pas le helper `aurora.render()` (tu fais ta propre coquille HTML), les primitives sont toujours exposées :

```js
import { hydrate, html, signal } from '@c9up/aurora'

hydrate(
  document.getElementById('aurora-root'),
  () => Dashboard({ status }),
)
```

La factory **doit produire la même forme de `TemplateResult`** que celle rendue par le serveur — mêmes slots, même ordre. Aurora parcourt l'arbre SSR le long du chemin du template parsé ; un mismatch tombe en warning console mais la page reste fonctionnelle.

L'helper `auroraRoute()` antérieur à `aurora.render()` reste exporté pour compatibilité ; les nouvelles apps doivent préférer l'API Inertia-shape.

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

**Cookies / presse-papiers / partage** — `cookie.get/set/remove` (sûr en SSR), `clipboard.copy/read`, et `share(data)` (Web Share API).

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
- Une réponse non-2xx lève `HttpError` (`status`, `response`, `data` parsé).
- `extend(options)` dérive un client enfant avec les défauts fusionnés.
- Passe une option `parse` pour un résultat validé au runtime et entièrement typé ; sans elle, le type générique est une assertion non vérifiée de la forme de la réponse (la frontière HTTP habituelle).
- Une instance `http` same-origin par défaut est exportée pour les appels rapides.

## Intégrer aurora dans les templates inker

Les îlots aurora fonctionnent dans un template serveur [Inker](/fr/modules/inker) — aucun code de liaison ne vit dans l'un ou l'autre package, tu le câbles avec un seul helper. Inker émet le `SafeString` d'un helper verbatim, et `renderToString` d'aurora produit le HTML d'un composant côté serveur :

```ts
// boot — enregistrement du helper via la Map helpers de Templates (ou la map fusionnée
// de l'InkerProvider). Les args du helper passent en JSON via NAPI : données simples.
import { renderToString } from '@c9up/aurora'
import { SafeString, Templates } from '@c9up/inker'
import { Counter } from '../islands/Counter.js'

const islands = { Counter }   // nom → factory de composant aurora

const templates = new Templates({
  root: 'resources/templates',
  helpers: new Map([
    ['aurora', (name, data) =>
      new SafeString(
        `<div data-aurora="${name}">${renderToString(islands[name](data))}</div>`,
      ),
    ],
  ]),
})
```

```inker
<!-- template serveur inker — un SafeString est émis brut, même en double accolade -->
<section>{{ aurora("Counter", page.counter) }}</section>
```

```ts
// client — hydratation de l'îlot pour rebrancher la réactivité
import { hydrate } from '@c9up/aurora'
import { Counter } from './islands/Counter.js'

for (const el of document.querySelectorAll('[data-aurora=Counter]')) hydrate(el, Counter)
```

La factory client doit reproduire la même forme de `TemplateResult` que le serveur a rendue (même contrainte que l'hydratation de `aurora.render()`). Ne renvoie un `SafeString` que depuis du markup que tu contrôles — aurora échappe les interpolations `${}`, mais la chaîne enveloppante reste sous ta responsabilité.

## Aurora vs Photon

| | Aurora | Photon |
|---|---|---|
| Authoring | Tagged-template literals | Composants React / Vue / Svelte |
| Build step (app) | Aucun | Vite |
| Taille runtime client | ~6 Ko | dépend du framework (~40 Ko+ React+ReactDOM) |
| État | Signaux (fine-grained) | Natif framework (hooks, refs, stores) |
| Hydration | Marche les chemins de templates parsés | Primitive hydrate du framework |
| Cas d'usage | Pages server-driven, dashboards, admin UIs | Apps SPA avec interaction riche |

Les deux coexistent — aurora pour tout ce qui n'a pas besoin de l'écosystème React, photon quand on en a besoin.

## Référence bout en bout

La démo kitchen-sink câble toute la stack avec l'API Inertia-shape :

- `reamrc.ts` — enregistre `@c9up/aurora/provider`
- `config/aurora.ts` — pointe le provider sur `resources/pages/`
- `resources/pages/ProjectPage.js` — page SSR + hydrate partagée utilisant `component()` + `signal()` + `onMount()` + `relay()`
- `app/modules/site/controllers/SiteController.ts` — `showProjectLive` se résume à un seul appel `aurora.render(ctx, 'ProjectPage', props)`

Pas d'`AssetController`, pas de script bootstrap client, pas d'importmap manuelle : le provider gère tout.

## Étapes suivantes

- [Photon](/fr/modules/photon) — Quand il vous faut React / Vue / Svelte + Vite
- [Relay](/fr/modules/relay) — Canaux realtime qui se marient à la surface réactive d'aurora
- [Démarrage rapide](/fr/guide/quick-start) — Bootstrapper une app complète
