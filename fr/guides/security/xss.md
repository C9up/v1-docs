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

Elle utilise [ammonia](https://crates.io/crates/ammonia) (le parser html5ever utilisé par Firefox/Servo), pas un échappement naïf d'entités :

- les fragments `text/html` sont parsés et reconstruits à partir d'une liste blanche : scripts, styles, frames et handlers d'événements disparaissent (`<script>`, handlers `on*`, URIs `javascript:`), de même que formulaires, champs, boutons, SVG et médias ; toute balise hors de la liste — éléments custom et web components compris — est déballée, son contenu gardé. Les entités existantes ne sont jamais double-encodées.
- tout autre type de contenu (`text/plain`, JSON, CSV…) est rendu tel quel : avec `X-Content-Type-Options: nosniff` (un en-tête par défaut), le navigateur ne le lit jamais comme du markup, et l'échapper ne ferait que le corrompre.
- les fragments perdent `id`, `is`, `slot`, `part` et `data-*` : `<a id="config">` masque `window.config` (DOM clobbering), `is` fabrique un élément personnalisé, les frameworks côté client lisent des liaisons dans `data-*`, et `slot`/`part` atteignent le shadow DOM.

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
`xss: { allowAttributes: ['id', 'data-*'] }`.

Les query strings et corps de requête ne sont **pas** modifiés ; l'entrée utilisateur est neutralisée là où elle est stockée ou rendue, pas réécrite silencieusement à l'entrée.
