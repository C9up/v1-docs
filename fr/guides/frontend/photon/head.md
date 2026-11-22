# Head, SEO et CSP

Ce guide couvre le head du document, le SEO et les en-têtes de sécurité :

- SEO et gestion du `<head>`
- En-têtes de sécurité et CSP

## SEO et gestion du `<head>`

Photon offre un contrôle par route sur `<title>`, `<meta>` description, Open Graph, Twitter Cards, URLs canoniques et tags arbitraires personnalises. Les tags se composent en quatre couches (la plus a droite gagne par champ feuille) : `defaultMeta` → décorateur `@Meta` → `ctx.photon.meta()` → argument explicite `render(comp, props, meta)`.

### API imperative — `ctx.photon.meta()`

Dans un handler de route, accumulez les tags avant le rendu :

```ts
router.get('/articles/:slug', async ({ params, photon }) => {
  const article = await loadArticle(params.slug)
  photon.meta({
    title: article.title,
    description: article.summary,
    canonical: `https://example.com/articles/${article.slug}`,
    og: {
      title: article.title,
      description: article.summary,
      image: article.coverUrl,
      type: 'article',
    },
    twitter: { card: 'summary_large_image' },
  })
  return photon.render('ArticleShow', { article })
})
```

Les appels multiples a `meta()` se fusionnent en profondeur. Les sous-objets `og` et `twitter` se fusionnent champ par champ (PAS de remplacement d'objet).

### Décorateur — `@Meta()`

`@Meta()` attache des métadonnées déclarativement a une méthode de contrôleur. Le middleware les lit depuis `ctx.route` (prototype du contrôleur + nom d'action) et amorce l'accumulateur avant l'exécution du handler.

```ts
import { Meta } from '@c9up/photon'

class HomeController {
  @Meta({ title: 'Accueil', description: 'Bienvenue' })
  async index({ photon }) {
    return photon.render('Home', {})
  }

  // Forme factory — recoit le contexte de la requete.
  @Meta((ctx) => ({ title: `Profil — ${ctx.params.user}` }))
  async show({ photon }) {
    return photon.render('Profile', {})
  }
}
```

Les appels impératifs `ctx.photon.meta()` dans le handler conservent la priorité sur les valeurs du décorateur.

### Défauts a l'échelle de l'app — `defaultMeta`

Dans `config/photon.ts` :

```ts
import { defineConfig } from '@c9up/photon'

export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  defaultMeta: {
    og: { siteName: 'Example', locale: 'fr_FR' },
    twitter: { site: '@example' },
    robots: 'index,follow',
  },
})
```

Les valeurs par route fusionnent par-dessus ces défauts.

### Données structurées (JSON-LD)

`jsonLd` décrit la page aux moteurs de recherche en JSON-LD schema.org : un
nœud, plusieurs, ou un document `{ "@context", "@graph" }` entier — ce que
construit `@c9up/ephemeris`, ou tout objet de cette forme.
Photon ne dépend que de la forme.

```ts
import { product, SchemaGraph } from '@c9up/ephemeris'

ctx.photon.meta({
  jsonLd: new SchemaGraph({ url: request.completeUrl() })
    .mainEntity(product({ '@type': 'Product', name: anvil.name, offers }))
    .toJsonLd(),
})
```

Il est écrit dans `<head>` en un seul `<script type="application/ld+json">`,
avec le nonce CSP de la requête, et remplacé à chaque navigation SPA — une page
qui n'en a pas ne garde rien de la précédente. `<`, `>`, `&`, U+2028 et U+2029
sont écrits en échappements `\u`, donc aucune valeur ne peut fermer le script.
Les couches fusionnent par `@id` : `defaultMeta` peut déclarer l'identité du
site et une page la compléter — les types s'additionnent et ce que la page
fixe l'emporte ; les nœuds sans `@id` suivent dans l'ordre.

### Precedence

Couches, de la plus basse a la plus haute :

| Couche | Source | Quand |
|---|---|---|
| 1 | `config.defaultMeta` | Défauts globaux de l'app |
| 2 | Décorateur `@Meta(...)` | Par méthode de contrôleur |
| 3 | `ctx.photon.meta(...)` | Impératif, plusieurs appels fusionnent en profondeur |
| 4 | `render(comp, props, meta)` | Override explicite a l'appel render |

Les sous-objets `og` / `twitter` fusionnent champ par champ ; les tableaux `keywords` et `custom` concatènent puis dédoublonnent.

### Sécurité XSS

Chaque valeur textuelle (`title`, `description`, og:*, twitter:*, `content` custom) passe par un echappeur d'attribut HTML qui remplace `&`, `<`, `>`, `"`, `'`. Un titre contrôle par l'utilisateur contenant `<script>...</script>` est rendu en toute sécurité comme `&lt;script&gt;...&lt;/script&gt;`. **Jamais** désactive — il n'y a pas d'opt-out, par design.

## En-têtes de sécurité et CSP

Les en-têtes de protection appartiennent à [Blackhole](/fr/guides/security/securing-ssr) :
la Content-Security-Policy (appliquée ou en observation), `X-Frame-Options` et
`X-Content-Type-Options`. Blackhole inscrit le jeu qu'il a posé dans le store de
la requête (`securityHeaders`), et une page rendue par Photon n'ajoute alors
aucun des siens : la politique, son nonce, son `report-to` et un `DENY`
arrivent au navigateur tels qu'ils sont configurés, et un en-tête que Blackhole
doit omettre reste omis.

Sans cette inscription, Photon complète chaque protection absente de la réponse
avec son jeu minimal : `default-src 'self'; script-src 'self'; object-src
'none'` (avec l'origine de Vite en développement), `X-Frame-Options: SAMEORIGIN`
et `nosniff`. Un en-tête déjà présent est gardé, et une politique en
observation compte comme la politique : un `X-Frame-Options: DENY` posé à la
main reçoit quand même une politique et `nosniff` à côté.

Quand la requête a un nonce (`response.nonce`, que Blackhole fournit pour une
politique qui nomme `@nonce`, ou `cspNonce` dans le store de la requête), Photon
l'écrit sur chaque `<script>` de la page : en production, une politique stricte
fonctionne telle quelle :

```ts
// config/blackhole.ts
export default defineConfig({
  csp: { directives: { 'script-src': ['@nonce', "'strict-dynamic'"] } },
})
```

En développement, les scripts viennent du serveur Vite, une autre origine. Avec
un nonce et `'strict-dynamic'`, ils se chargent grâce au nonce ; avec une
politique qui liste des origines, ajoutez celle de Vite à `script-src`. Dans les
deux cas, le rechargement à chaud ouvre un WebSocket vers Vite, que
`connect-src` (ou `default-src`) doit autoriser — en développement seulement :

```ts
const vite = app.inDev ? ['http://localhost:5173', 'ws://localhost:5173'] : []

export default defineConfig({
  csp: {
    directives: {
      'script-src': ["'self'", ...vite],
      'connect-src': ["'self'", ...vite],
    },
  },
})
```
