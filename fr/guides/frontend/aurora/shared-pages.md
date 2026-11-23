# Pages partagées

Ce guide couvre les pages partagées entre le serveur et le navigateur :

- Pages partagées — `aurora.render()`
- Visites de pages — `visits: true`
- Savoir quand le client a pris la main

![Le rendu serveur puis l'hydratation. Sur le serveur : le contrôleur appelle aurora.render('Dashboard', { user }) ; les props font un aller-retour par JSON et renderToString(Dashboard(props)) produit le HTML ; le document contient le balisage, déjà visible, les props dans aurora-page-data et un script module qui hydrate. Un seul document HTML part vers le navigateur, où la page s'affiche aussitôt, sans JavaScript pour la lire ; hydrate(root, () => Page(props)) adopte le DOM du serveur sur place et y attache les signaux et les écouteurs d'événements ; puis onMount s'exécute, aurora:load se déclenche et whenHydrated() se résout. resources/pages/Dashboard.js est le même fichier des deux côtés.](/images/ssr-en.webp){width=640 height=640 loading=lazy}

## Pages partagées — `aurora.render()`

Un fichier par page, **même source côté serveur et côté navigateur** (ESM JS plain, sans étape de compilation).

### Câblage

`ream configure @c9up/aurora` écrit ces trois morceaux. À la main :

```ts
// reamrc.ts
providers: [
  () => import('@c9up/aurora/provider'),
]
```

```ts
// start/kernel.ts
router.use([
  () => import('@c9up/aurora/middleware'),   // en premier : pose ctx.aurora
  // ...les middlewares de routeur de l'application
])
```

```ts
// config/aurora.ts
import { defineConfig } from '@c9up/aurora/server'

export default defineConfig({
  pages: { root: 'resources/pages' },
  root: { tag: 'div' },
})
```

Le middleware passe en premier pour que tout middleware de routeur placé après
lui — un guard qui rend une page de connexion, par exemple — trouve
`ctx.aurora` en place ; il ne lit rien de la requête, donc passer avant le body
parser et la session ne coûte rien.

Le provider d'aurora :
- met `pages.root` par défaut sur `<projectRoot>/resources/pages` — il suffit de poser vos pages dedans ;
- sert `/__assets/aurora/*` (le `dist/` pré-compilé d'aurora) ;
- sert `/__assets/pages/*` (votre dossier de pages) ;
- sert `/__assets/<package>/dist/*` pour chaque entrée de `browserPackages`.

Ce sont des **middlewares serveur**, pas des routes, servis avant le routage.
Une page est livrée sans bundler : un
chargement, c'est des dizaines de requêtes `.js`. En routes, chacune traversait
toute votre pile de middlewares, et une application qui résout un utilisateur
depuis un cookie de session payait un `SELECT` par fichier pour des octets
identiques pour tout le monde. Servies avant le routage, elles n'atteignent
jamais votre kernel — et vous n'avez pas à écrire l'exemption vous-même. Seuls `GET`
et `HEAD` sont captés ; le reste retombe sur vos routes.

Un chemin dont un segment commence par `.` — `.env`, `.git/config`, le fichier
d'échange d'un éditeur — répond 404 sur chaque montage, lien qui y pointe compris :
le montage des pages est votre dossier de sources. `serveAssets({ root, dotFiles: "allow" })`
les sert sur un montage à vous.

Pour utiliser un autre dossier, changez `pages.root` dans `config/aurora.ts` :

```ts
import { defineConfig } from '@c9up/aurora/server'

export default defineConfig({
  pages: { root: './app/views' },
})
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

`relay()` ouvre un seul flux par page. Son uid ne vient que de la première trame
`connected` du flux — une suivante sur le même flux est ignorée — et, après une
coupure, de celle du flux reconnecté. Le relay lie un flux à l'utilisateur et à
la session qui l'ont ouvert : un flux ouvert avant une connexion est refusé
(`E_RELAY_NOT_OWNER`), et le client ouvre alors un nouveau flux puis réabonne
ses canaux, une fois. Une connexion refusée pour un plafond
(`E_RELAY_MAX_CLIENTS`, `E_RELAY_MAX_CLIENTS_PER_OWNER`) compte pour une
tentative de reconnexion échouée, dans la limite de
`configureRelay({ maxReconnectAttempts })`. Une charge diffusée est du JSON —
une chaîne arrive telle quelle — et une charge qui n'en est pas est écartée
avec un avertissement.

Hors du navigateur, `configureRelay({ stream, fetch })` donne à relay le flux
d'événements et les requêtes de la plateforme : une app sur un téléphone n'a
ni `EventSource` ni origine de page, et passe ceux que donne [la connexion au
serveur d'orbit](/fr/guides/mobile/server-driven#comet-et-relay).

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

1. Résout `resources/pages/${name}.js` (import dynamique — les éditions du fichier de page sont visibles à la requête suivante ; voir [Live-reload en dev](/fr/guides/frontend/aurora/shared-pages#live-reload-en-dev-hmr) pour ses imports transitifs)
2. Appelle la factory avec `props` tels que le navigateur les recevra — passés par JSON, donc une `Date` y est sa chaîne ISO et un modèle ce que renvoie son `toJSON()` (les colonnes qu'il masque en sont donc absentes) — et fait le SSR via `renderToString`. Le serveur et le navigateur rendent à partir des mêmes données : une page n'hydrate jamais contre des valeurs qu'elle n'avait pas côté serveur.
3. Enveloppe le markup dans un document HTML complet avec :
   - l'importmap qui alias `@c9up/aurora` → `/__assets/aurora/index.js`
   - un blob `<script id="aurora-page-data" type="application/json">` qui transporte `{ name, props, url, rootId }`
   - un `<script type="module">` inline qui importe aurora + le même module de page et appelle `hydrate(root, () => Page(data.props))`

Côté navigateur, aurora adopte le DOM SSR en place, attache signaux + écouteurs d'événements + hooks de cycle de vie. Le `onMount` que vous avez écrit s'exécute une fois l'arbre vivant.

### Lié au contexte — `ctx.aurora.render(name, props)`

`ctx.aurora.render(name, props)` est le sucre lié au contexte. Le `ctx` est déjà capturé, donc un contrôleur rend une page sans avoir à le faire transiter :

```ts
async show({ aurora }) {
  return aurora.render('Dashboard', { user })
}
```

`ctx.aurora` est posé par le middleware de routeur `@c9up/aurora/middleware` que `ream configure` place en tête de `start/kernel.ts` (voir [Câblage](/fr/guides/frontend/aurora/shared-pages#cablage)) — `reamrc.ts` n'a pas de clé pour ça. Sans lui, `ctx.aurora` vaut undefined. Il ne fait rien quand aucun gestionnaire aurora n'est enregistré : on peut donc le monter sans condition.

Le même middleware est exporté comme fonction, `auroraContext` depuis `@c9up/aurora/server`, pour les endroits qui acceptent un middleware en ligne — le niveau serveur, une route ou un groupe (le niveau routeur n'accepte que des imports paresseux) :

```ts
// start/kernel.ts
import server from '@c9up/ream/services/server'
import { auroraContext } from '@c9up/aurora/server'

server.use([auroraContext])
```

`auroraContext` **est** le middleware `(ctx, next)`, pas une fabrique : l'appeler ici l'exécuterait avec un contexte inexistant, au chargement du fichier.

Le `aurora.render(ctx, name, props)` au niveau module (le cœur agnostique) marche toujours exactement comme montré ci-dessus — `ctx.aurora.render(name, props)` n'en est que le raccourci lié au contexte.

### Options

| Option | Défaut | Rôle |
|---|---|---|
| `lang` | `'en'` | Valeur de `<html lang="…">` |
| `rootId` | `'aurora-root'` | id du `<div>` qui enveloppe le body SSR — doit matcher ce que le client attend |
| `headExtra` | `''` | HTML brut inséré dans `<head>` après l'importmap. Pour `<title>`, meta tags, stylesheets |
| `jsonLd` | — | Les données structurées de la page : un nœud schema.org, une liste ou un document `{ "@context", "@graph" }` (ce que construit `@c9up/ephemeris`, ou tout objet simple). Écrites dans `<head>` en `<script type="application/ld+json">` avec le nonce de la requête, échappées pour qu'aucune valeur ne ferme la balise — à préférer à une balise construite dans `headExtra`, écrit tel quel |
| `importmap` | `{ "@c9up/aurora": "/__assets/aurora/index.js" }` | Entrées additionnelles à fusionner dans l'importmap de la page |

### Pourquoi JS pur (pas TS) ?

Parce que **le même module doit se charger dans Node ET dans le navigateur**, sans étape de build côté app. Aurora ship son JS dans `dist/` et arrive au navigateur via l'importmap. Vos pages vivent dans `resources/pages/*.js` et arrivent de la même façon. Si vous voulez des types sur une page, écrivez un `.d.ts` à côté — votre éditeur le ramasse, le runtime reste JS.

### Live-reload en dev (HMR)

Le comportement de développement — rechargement des pages, assets de page servis `no-cache`, avertissements de dev — n'est actif que si l'environnement le dit : `ream dev` (`REAM_DEV=true`), ou un `NODE_ENV` qui vaut `development`, `dev`, `develop`, `test` ou `testing` (casse indifférente). Un `NODE_ENV` absent, `production`, `prod`, `staging` ou toute autre valeur tourne en production : l'arbre des pages n'est pas parcouru à chaque rendu et les assets de page gardent leur durée de cache.

Les pages sont importées dynamiquement à chaque requête, donc aurora bust en dev le **module de page** par mtime — éditer directement `resources/pages/Foo.js` est visible à la requête suivante sans restart. Mais les imports **transitifs** d'une page (les composants, layouts et services qu'elle tire des sous-dossiers de `resources/pages/**`) résolvent vers des URLs stables que le loader ESM de Node garde en cache pour toute la vie du process. Éditez l'un d'eux et le HTML SSR reste périmé (avec un warning d'hydratation) jusqu'au redémarrage.

La forme la plus vicieuse de ce piège, c'est un export présent sur le disque mais absent du module chargé. Ajoutez une fonction à `services/portfolio.js`, utilisez-la depuis une page, et la requête échoue sur :

```
The requested module './services/portfolio.js' does not provide an export named 'amountParts'
```

L'export est pourtant bien dans le fichier. La page a été relue ; le module qu'elle importe, non. Si votre suite e2e passe sur le même code — elle démarre un process neuf à chaque exécution — c'est la confirmation. Redémarrez, ou câblez hot-hook ci-dessous.

[`hot-hook`](https://github.com/Julien-R44/hot-hook) comble ce manque — un loader-hook Node qui suit le graphe ESM et invalide **tout le sous-arbre** d'une boundary au changement. Câblez-le dans votre app ; aurora n'a besoin d'aucune modif (son `import()` calculé est déjà compatible graph-aware, et son bust `?v=` de dev coexiste avec le versioning propre de hot-hook) :

```bash
pnpm add -D hot-hook @hot-hook/runner
```

```jsonc
// package.json
{
  "scripts": {
    "dev": "hot-runner --node-args=--import=tsx --node-args=--import=hot-hook/register bin/server.ts"
  },
  "hotHook": {
    "boundaries": ["./resources/pages/*.js"]
  }
}
```

Désormais, éditer une page **ou** n'importe quel composant/layout/service qu'elle importe recharge le SSR à chaud, sans restart. Les éditions hors de l'arbre des pages (`app/`, `config/`, `start/`, `providers/`) déclenchent un restart complet via `hot-runner`, exactement comme avant.

> **Visez les `boundaries` sur les _entrées_ de page uniquement** — `./resources/pages/*.js` (enfants directs), **pas** `**/*.js`. hot-hook exige que tout fichier matché par `boundaries` soit importé dynamiquement ; un composant importé statiquement mais qui matche la glob est marqué « wrongly imported » et force un restart complet. Gardez les pages en enfants directs de `resources/pages/` et les composants dans des sous-dossiers (`atoms/`, `molecules/`, …) — ils deviennent hot-reloadables en tant que dépendances en aval d'une page boundary.

### Servir un autre paquet au navigateur

`@c9up/comet` et `@c9up/chronos` le sont déjà — ce sont les peers optionnelles
d'aurora. Tout autre paquet qu'une application importe par spécificateur nu,
sans bundler, tient en une ligne :

```ts
// config/aurora.ts
import { defineConfig } from '@c9up/aurora/server'

export default defineConfig({
  browserPackages: ['@c9up/atom'],
})
```

Chaque paquet résolu obtient `<assetsPrefix>/<nom>/dist/*`, une route `wasm/*`
s'il en a une, et une entrée d'importmap. Un paquet non installé est ignoré en
silence.

L'entrée d'importmap est lue dans les `exports` du paquet (son entrée `"."`),
en préférant la condition `browser`, puis `import`, puis `default`, quel que
soit leur ordre : une page n'est lue que par un navigateur, et un paquet qui
livre une build navigateur séparée a une entrée `import` qui va chercher
`node:fs`. Une cible TypeScript (un paquet de workspace qui exporte
`./src/index.ts`) est ignorée. Sans `exports` exploitable, l'entrée est
`dist/index.js`. Une entrée déclarée hors de `dist/` — le seul répertoire servi —
est refusée par une erreur qui la nomme : déclarez alors ce paquet
vous-même avec `importmap` dans `config/aurora.ts`.

Le montage se fait sur deux racines étroites, jamais sur la racine du paquet :
un paquet adossé à du wasm importe `../wasm/…` — un frère de son `dist` — et le
glue bindgen va ensuite chercher le binaire à côté de lui. L'importmap pointe
donc **dans** `dist/` pour que ce chemin relatif atterrisse sur la route frère.
Servir la racine du paquet répondrait aux deux et publierait aussi les
`index.*.node`, des binaires serveur qui se comptent en dizaines de méga-octets.
Un paquet dont l'entrée est à sa racine (`./index.mjs` à côté de son
`package.json`) n'a pas de tel dossier étroit : il est refusé au démarrage par
une erreur qui le nomme. Retirez-le de `browserPackages` et mappez-le avec
`importmap` vers un montage des seuls fichiers dont le navigateur a besoin.

### Attraper une erreur d'aurora

Toute erreur levée par aurora est une `AuroraError` portant un `code` stable :
on peut donc brancher sur ce qui a échoué sans filtrer un message — la prose est
libre d'évoluer, un code est un contrat.

```js
import { AuroraError } from '@c9up/aurora'

try {
  await pages.resolve('Dashboard')
} catch (error) {
  if (error instanceof AuroraError && error.code === 'E_AURORA_PAGE_NOT_FOUND') {
    // …
  }
}
```

`E_AURORA_PAGE_NOT_FOUND` signifie qu'aucun fichier ne porte ce nom.
`E_AURORA_PAGE_IMPORT_FAILED` signifie que la page existe et que son graphe de
modules a refusé de se charger — une erreur de syntaxe n'importe où dedans, un
throw au niveau module, un export manquant dans ce qu'elle importe. Les deux
étaient autrefois rapportés comme un seul, contre le chemin de la page, ce qui
envoyait le lecteur vers le seul fichier dont on était sûr qu'il allait bien.

L'erreur d'origine est toujours attachée en `cause`, donc la pile qui désigne la
ligne survit.

## Visites de pages — `visits: true`

Par défaut, chaque lien charge un document entier : le serveur rend la page et
le navigateur l'hydrate à nouveau. Avec `visits`, seul le premier chargement le
fait. Ensuite, un lien de même origine demande au serveur l'objet de la page
suivante en JSON, et le client la rend dans la racine — le document,
l'importmap, l'état des modules et tout ce qui est hors de la racine restent.
C'est le protocole de photon (celui d'Inertia), parlé par aurora :
[@c9up/photon](/fr/guides/frontend/photon/) construit les objets page et son routeur
client mène les visites.

```bash
pnpm add @c9up/photon
```

```ts
// config/aurora.ts
export default defineConfig({
  pages: { root: app.makePath('resources/pages') },
  visits: true,
  assetsVersion: process.env.BUILD_ID,  // un déploiement recharge les clients d'un build antérieur
})
```

Les contrôleurs ne changent pas : `aurora.render(ctx, 'Dashboard', props)`
répond le document à un premier chargement et l'objet page à une visite
(`X-Photon: true`). Le middleware d'aurora ajoute ce que le protocole répond
autour d'une page : `Vary: X-Photon`, un 409 qui fait recharger le document à un
client d'un build antérieur, un 303 après un PUT / PATCH / DELETE redirigé.

Ce qui vient avec le protocole marche comme dans photon : rechargements
partiels, props `defer()`, `merge()`, `once()` et `optional()` (importées de
`@c9up/photon`), retour et avance restaurés depuis l'historique,
`router.visit()` / `router.put()` de `@c9up/photon/client`. Les props doivent
être un objet ; `title` dans les options de rendu devient le `<title>` de la
page et suit une visite.

- Liens : chaque `<a href>` de même origine est suivi en visite.
  `data-photon="external"`, un `target`, un `download` ou un clic avec
  modificateur le laissent au navigateur.
- Une visite quitte d'abord la page : les effets et `onUnmount` de ses
  composants, et les composants live qu'elle a ouverts (`liveClient`), se
  terminent avant que la page suivante se rende. Votre code qui doit finir avec
  la page s'inscrit avec `onPageLeave(end)`.
- Le module d'une page visitée est importé une fois, puis servi depuis le cache
  des modules. L'importmap est celle du premier document : une page qui a
  besoin d'un spécificateur que seule sa propre `importmap` d'appel ajoute doit
  être atteinte par un chargement complet.

## Savoir quand le client a pris la main

`hydrate()` s'annonce, donc plus rien n'a besoin de deviner ni de sonder.

```js
import { whenHydrated, hydrationState, hydrationErrors } from '@c9up/aurora'

document.addEventListener('aurora:hydrate', (e) => e.detail.container)  // par racine
document.addEventListener('aurora:load', () => {})                       // page stabilisée

await whenHydrated()        // résolu immédiatement si c'est déjà fait
hydrationState()            // 'pending' | 'hydrating' | 'hydrated'
hydrationErrors()           // ce qui a échoué, le cas échéant
```

`aurora:hydrate` part sur chaque racine adoptée et remonte, comme
`turbo:frame-load` et `htmx:load` le font par fragment. `aurora:load` part une
fois sur `document`, après la dernière racine — une page à plusieurs îlots
s'annonce quand ils sont tous là, pas au premier.

Deux écarts assumés avec les runtimes dont ceci s'inspire :

**L'événement part même si une racine lève**, avec la raison dans
`detail.error` et dans `hydrationErrors()`. Un signal retenu en cas d'échec
transforme une course en blocage silencieux, et celui qui attend ne peut pas
distinguer les deux.

**Un état lisible accompagne l'événement.** Un événement seul porte la course
qu'il est censé supprimer : abonnez-vous après son émission et vous attendez
pour toujours. `whenHydrated()` se résout immédiatement quand le travail est
déjà fait — exactement ce que fait le DOM avec `document.readyState` à côté de
`DOMContentLoaded`. Il ne rejette jamais : une racine en échec stabilise quand
même la page.

Une navigation côté client ré-hydrate, et l'état repasse à `hydrating` avant de
se stabiliser de nouveau. Turbo réémet `turbo:load` à chaque visite pour la
même raison : avoir été prêt une fois, ce n'est pas être prêt.
