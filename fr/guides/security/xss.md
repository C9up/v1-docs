# Assainissement XSS

Ce guide couvre l’assainissement du HTML contre le XSS.

## Sanitization XSS

`sanitizeResponse(body, contentType)` nettoie un corps `text/html` comme du
markup non fiable — c'est ce qu'on appelle sur une entrée utilisateur avant de
la stocker ou de la renvoyer. Elle sanitize toujours, quoi que dise `xss` :

```ts
import { createBlackhole } from '@c9up/blackhole'

const filter = createBlackhole({ csrf: false })
const safe = filter.sanitizeResponse(comment.body, 'text/html')
```

L'entrée est bornée, car le parser HTML ne coûte pas pareil pour toutes les
entrées de même taille : des balises de mise en forme mal imbriquées sont
recréées dans chaque nouveau bloc, et quelques kilo-octets peuvent construire
des méga-octets. Un corps `text/html` qui dépasse une borne est refusé par une
erreur, jamais rendu tel quel :

| Borne | Défaut | Refus |
| --- | --- | --- |
| Longueur de l'entrée, en octets UTF-8 (`xss.maxInputBytes`) | 1 Mio | `E_BLACKHOLE_HTML_TOO_LARGE` |
| Imbrication des éléments (`xss.maxDepth`) | 512 | `E_BLACKHOLE_HTML_TOO_DEEP` |
| Balisage construit par le parser | 4 fois l'entrée, plus 64 Kio | `E_BLACKHOLE_HTML_TOO_COMPLEX` |

La profondeur et le balisage construit sont mesurés par le parser lui-même,
pendant qu'il construit l'arbre : le refus arrive tôt et coûte peu. La sortie
ne dépasse jamais environ quatre fois l'entrée plus 64 Kio. Quand vous
assainissez une entrée utilisateur, interceptez ces codes et répondez 422
(ou 413 pour la longueur) :

```ts
import { errors } from '@c9up/blackhole'

try {
  comment.body = filter.sanitizeResponse(input, 'text/html')
} catch (error) {
  if (error instanceof errors.E_BLACKHOLE_HTML_TOO_LARGE) return response.status(413).send('Trop long')
  if (error instanceof errors.E_BLACKHOLE_HTML_TOO_DEEP || error instanceof errors.E_BLACKHOLE_HTML_TOO_COMPLEX) {
    return response.status(422).send('Balisage trop complexe')
  }
  throw error
}
```

Augmentez `maxDepth` avec prudence : le parse ralentit avec le carré de
l'imbrication.

Elle utilise [ammonia](https://crates.io/crates/ammonia) (le parser html5ever utilisé par Firefox/Servo), pas un échappement naïf d'entités :

- les fragments `text/html` sont parsés et reconstruits à partir d'une liste blanche : scripts, styles, frames et handlers d'événements disparaissent (`<script>`, handlers `on*`, URIs `javascript:`), de même que formulaires, champs, boutons, SVG et médias ; toute balise hors de la liste — éléments custom et web components compris — est déballée, son contenu gardé. Les entités existantes ne sont jamais double-encodées.
- tout autre type de contenu (`text/plain`, JSON, CSV…) est rendu tel quel : avec `X-Content-Type-Options: nosniff` (un en-tête par défaut), le navigateur ne le lit jamais comme du markup, et l'échapper ne ferait que le corrompre.
- les fragments perdent `id`, `is`, `slot`, `part`, `data-*` et `class` : `<a id="config">` masque `window.config` (DOM clobbering), `is` fabrique un élément personnalisé, les frameworks côté client lisent des liaisons dans `data-*`, `slot`/`part` atteignent le shadow DOM, et `class` sélectionne toutes les règles de la feuille de style de la page — avec des classes utilitaires, `class="fixed inset-0 z-50"` dessine un calque sur toute la page.
- `style` ne garde que les propriétés de présentation (couleur, police, texte, marge, padding, bordure, largeur, hauteur). `position`, `top`/`right`/`bottom`/`left`, `z-index` et toute propriété qui prend une `url()` sont retirés.
- Gardés sur chaque balise autorisée : `style` (filtré comme ci-dessus), `role`, `tabindex`, `title`, `lang`, `dir`, `hidden`, et les attributs propres à la balise (`href`, `src`, `alt`…). Les liens reçoivent `rel="noopener noreferrer"`.

`xss: true` applique la même passe à chaque corps `text/html` que
l'application envoie — y compris celui qui commence comme un document
(`<!doctype html>`, `<html>`, un commentaire) : ces premiers octets sont écrits
par l'auteur du contenu, et un commentaire non fiable pourrait sinon se faire
passer pour une page et couper la passe. Une page que l'application rend
elle-même n'est laissée intacte que si le handler le dit pour cette réponse :

| Adaptateur | Marquer le HTML de la réponse comme celui de l'application |
| --- | --- |
| Ream | `ctx.store.set('trustedHtml', true)` |
| Express | `res.locals.trustedHtml = true` |
| Fastify | `reply.trustedHtml = true` |
| Hono | `c.set('trustedHtml', true)` |

Une page rendue par `ctx.aurora.render()` (aurora 0.1.52 ou plus récent) ou
`ctx.view.render()` (inker 0.1.24 ou plus récent) est marquée par le moteur de
rendu : rien à ajouter. Seul le littéral `true` compte. Ne marque que des corps dont le template a déjà
échappé les parties non fiables. Elle est **désactivée par
défaut** : les partiels de l'application elle-même — un fragment de formulaire avec son
champ `_csrf`, une icône `<svg>`, une `<video>` — perdraient tout ce qui sort de
la liste blanche. Ne l'active que là où chaque fragment peut porter du markup
non fiable. La forme objet l'active et réautorise des attributs, quand rien ne
les lit dans du markup non fiable :
`xss: { allowAttributes: ['id', 'data-*'] }`. Avec `class` dans cette liste,
le balisage non fiable peut utiliser toutes les classes de votre feuille de
style, calques compris.

Avec `xss: true`, un corps qui dépasse une borne est refusé aussi : la requête
se termine par une erreur 500 et le corps n'est pas envoyé.

Les query strings et corps de requête ne sont **pas** modifiés ; l'entrée utilisateur est neutralisée là où elle est stockée ou rendue, pas réécrite silencieusement à l'entrée.
