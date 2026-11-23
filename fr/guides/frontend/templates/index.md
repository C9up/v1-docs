# Templates

Ce guide couvre les templates côté serveur avec inker :

- Architecture — Rust parse, Node évalue
- Convention de fichiers
- Interpolation & expressions
- Contrôle de flux
- Débogage — `@eval` / `@dump`
- Échappement HTML vs brut
- Strict par défaut

Inker est le module de templating côté serveur de l'écosystème Ream (`@c9up/inker`). Les templates s'écrivent avec des directives `@`, l'interpolation `{{ }}`, des layouts / sections / composants / slots — analysés par un lexer et un parser en Rust, rendus par un évaluateur en Node.

> Statut : complet. L'interpolation `{{ }}` évalue de vraies expressions JavaScript ; `@if`/`@elseif`/`@else`/`@unless`, `@each`, `@let`, `@layout` + `@section`/`@super`, `@include`/`@includeIf`, `@component` + `@slot` avec `$props`/`$slots`, les globals du cœur, les helpers enregistrés, `@eval`/`@dump`, et les tags personnalisés (`registerTag`) sont tous livrés. Le provider Ream et le sous-chemin agnostique `@c9up/inker/testing` sont câblés.

## Architecture — Rust parse, Node évalue

Inker ne tire aucune dépendance de templating. Il est hand-rolled, réparti entre un cœur Rust et un renderer Node :

- **Rust (`inker-engine`)** — un lexer à balayage avant unique et un parser linéaire transforment une source `.inker` en un **AST JSON** (`parseTemplate` via NAPI, sérialisé par `astToJson`). C'est le travail CPU-bound ; chaque nœud porte la *source verbatim* de ses expressions. Le troisième appel du binaire, `openedPath`, donne le chemin système d'un fichier de template ouvert : le chargeur vérifie ainsi que le fichier réellement ouvert se trouve dans la racine des templates (Linux lit `/proc/self/fd` à la place).
- **Node (`renderNode.ts`)** — parcourt l'AST JSON et évalue la source de chaque expression dans le **V8** de Node, avec les helpers enregistrés, les globals du cœur et le scope de rendu tous en portée lexicale (un seul runtime ; les helpers sont de simples fonctions appelables partout, y compris dans des arrow functions et des arguments scopés à une boucle).

> La source des expressions est contrôlée par l'auteur (fichiers `.inker`) — le même niveau de confiance que le reste du code de l'app. C'est pourquoi un helper peut être appelé *à l'intérieur* d'une expression riche (`{{ users.filter(u => can(u)).map(u => u.name).join(', ') }}`).

> **Frontière de confiance (sécurité).** Comme les expressions tournent dans V8, un template *est du code*. Ne passe jamais d'entrée non fiable à `renderString`, et ne charge jamais de template `.inker` depuis une source non fiable (un champ CMS, un upload utilisateur) — ce serait de l'exécution de code arbitraire. En durcissement, les globals Node dangereux — `process`, `globalThis`, `global`, `require`, `module`, `exports`, `Function`, `eval` — sont masqués à `undefined` dans le scope d'expression, donc `{{ process.env.SECRET }}` ou `@eval(require('child_process')…)` échouent. Ce n'est **pas** un sandbox : un échappement déterminé par chaîne de propriétés (`({}).constructor.constructor(…)`) n'est pas bloqué. Traite les templates comme du code de confiance.

Le package reste ainsi sans dépendance runtime, agnostique par construction, et exempt de toute VM JS embarquée (un spike QuickJS antérieur a été abandonné : deux runtimes impliquaient un pont FFI sujet aux crashs, et V8-dans-Node est à la fois plus simple et plus rapide).

## Convention de fichiers

Les templates sont des fichiers `<root>/<name>.inker`. L'appelant résout la racine une fois (chemin absolu) et la passe à la construction. Pas de chemin de recherche implicite, pas de résolution automatique contre `process.cwd()`, pas d'expansion de `~` — l'explicite l'emporte sur l'implicite :

```ts
import path from 'node:path'
import { Templates } from '@c9up/inker'

const templates = new Templates({
  root: path.join(process.cwd(), 'resources/templates'),
})

const html = await templates.render('invoice', {
  customer: { name: 'Alice' },
  total: 42,
})
```

Le constructeur lève `E_INKER_INVALID_PATH` si `root` est relatif, absent, ou pointe vers un fichier plutôt qu'un répertoire.

### Vérifier un template sans le rendre

`compile(name)` et `compileRaw(source, name?)` analysent et s'arrêtent là — la
vérification de syntaxe que veut un linter, une étape de CI ou une intégration
éditeur. Ils lèvent une `InkerError` portant `code`, ainsi que le `filename`,
la `line` et la `col` où le template est fautif, et ne renvoient rien quand le
template est valide. Un template qui n'existe pas lève plutôt
`errors.E_INKER_TEMPLATE_NOT_FOUND`, qui n'a pas de position. Le rendu n'est
pas un substitut : il exige des données et il exécute les expressions du
template.

```ts
import { InkerError } from '@c9up/inker'

try {
  templates.compile('invoice')
} catch (error) {
  if (!(error instanceof InkerError)) throw error
  console.error(error.code, `${error.filename}:${error.line}:${error.col}`)
}
```

> **Pourquoi rien n'est renvoyé :** le compilateur d'inker est en Rust et produit un handle
> d'AST natif opaque, sans signification de ce côté du pont — ces méthodes
> indiquent donc si le template s'analyse, au lieu de rendre l'artefact.

## Interpolation & expressions

La sortie prend deux formes :

```inker
<!-- Échappé (HTML-safe par défaut — défend contre le XSS stocké) -->
<h1>Hello {{ customer.name }}</h1>

<!-- Brut / non échappé (à utiliser délibérément pour des fragments HTML de confiance) -->
<div>{{{ richBody }}}</div>
```

L'`expr` entre accolades est une **expression JavaScript complète**, évaluée dans V8 avec les helpers, les globals et le scope de rendu en portée :

```inker
{{ n > 1 ? n * 2 : 0 }}
{{ items.map(i => i.title).join(', ') }}
{{ users.filter(u => u.active).length }}
{{ truncate(post.body, 120) }}
{{ customer?.address?.city ?? 'n/a' }}
```

Une valeur qui est une `SafeString` est émise brute (même dans la forme échappée `{{ }}`) ; `null` / `undefined` rendent la chaîne vide ; toute autre valeur s'affiche via `String(valeur)` (les nombres sans `.0` traînant, `-0` → `0` ; une `Date`, un tableau ou un objet doté de son propre `toString()` s'affichent comme JavaScript les affiche), et `{{ }}` échappe cette chaîne. Un nom absent des données de rendu vaut `undefined` : une donnée optionnelle se garde avec `@if(errors)` et s'affiche comme chaîne vide ; naviguer dedans (`{{ missing.name }}`) lève `E_INKER_UNKNOWN_IDENTIFIER` avec la position source.

### Caractères d'échappement, commentaires, espaces

Utilisez `\{{` / `\}}` pour émettre des accolades littérales (le backslash est consommé). Les commentaires de template sont supportés et retirés entièrement — ils n'émettent rien, et leur contenu n'est jamais parsé :

```inker
Use \{{ name \}} to interpolate.     →   Use {{ name }} to interpolate.
{{-- cette note, et tout {{ x }} à l'intérieur, est retirée --}}
```

Un `{{--` non terminé est une erreur de lex dure, afin qu'une ouverture de commentaire égarée ne puisse pas avaler silencieusement le reste d'un template.

## Contrôle de flux

Les block tags : `@if` / `@elseif` / `@else` / `@endif`, sa négation `@unless`, et `@each` / `@endeach` :

```inker
@if(cart.items.length > 0)
  <p>{{ cart.items.length }} item(s)</p>
@elseif(cart.savedForLater.length)
  <p>Nothing in the cart, but you have saved items.</p>
@else
  <p>Your cart is empty.</p>
@endif

@unless(user.verified)
  <banner>Please verify your email.</banner>
@endunless
```

Tout bloc se ferme aussi avec le `@end` générique, qui ferme le bloc le plus intérieur (`@if(x)…@end`, `@each(…)…@end`, `@component(…)…@end`, `@slot(…)…@end`, les tags de bloc personnalisés). Terminer une ligne de tag par `~` (`@if(x)~`, `@end~`) supprime le saut de ligne qui mène à la ligne suivante de la sortie : une boucle peut ainsi émettre des `<li>` sans retour à la ligne entre eux.

Les sauts de ligne suivent un modèle par lignes fixe :

- Un tag écrit en début de ligne (indentation permise, et supprimée) ne produit pas de saut de ligne à lui. Le saut de ligne avant une ligne de contenu est gardé ; celui avant une ligne de tag ne l'est que si la ligne précédente était aussi une ligne de tag ; une ligne de tag fermant n'en a jamais.
- `@let`, `@assign`, `@eval`, `@inject`, `@slot`, `@pushTo`, `@pushOnceTo`, `@debugger`, `@newError` et `@layout` suppriment aussi le saut de ligne suivant, comme un tag enregistré avec `noNewLine: true`.
- Le slot par défaut d'un composant ignore son premier saut de ligne. Une page perd un saut de ligne à son tout début et un à sa toute fin ; les partials et les composants gardent les leurs.
- Une stack joint les contenus qu'on y pousse par un saut de ligne.
- Un tag écrit au milieu d'une ligne reste un tag : il ne touche pas aux sauts de ligne de la ligne.

`@each` itère les tableaux, les chaînes (un caractère par point de code), les objets (chaque clé propre), les `Map` et les `Set`, avec un `@else` optionnel pour le cas vide :

```inker
@each(item in cart.items)
  <li>{{ item.title }} — {{ item.price }}</li>
@else
  <li>empty</li>
@endeach

@each((value, key) in settings)
  <tr><td>{{ key }}</td><td>{{ value }}</td></tr>
@endeach
```

`(value, index)` lie l'élément et sa position (index numérique pour les tableaux/Sets, clé de propriété pour les objets). Itérer une valeur `null`/`undefined` lève `E_INKER_INVALID_ITERABLE` et vous oriente vers l'encadrement de la boucle dans un `@if()`.

`@let` ajoute une liaison à portée de bloc pour chaque frère qui le suit, évaluée comme une expression JavaScript complète :

```inker
@let(total = cart.items.reduce((s, i) => s + i.price, 0))
<p>Total: {{ total }}</p>
```

Il prend aussi en charge la déstructuration d'objets et de tableaux, y compris le renommage, les valeurs par défaut et le rest :

```inker
@let({ name, email } = user)
@let([first, second, ...rest] = items)
@let({ role = 'guest' } = session)
<p>{{ name }} — {{ role }}</p>
```

Les noms de liaison sont validés au parsing : un identifiant invalide, un mot réservé ou une clé de prototype-pollution (`__proto__`/`constructor`/`prototype`) lève `E_INKER_INVALID_EXPRESSION` avant même le rendu du template.

## Débogage — `@eval` / `@dump`

`@eval(expr)` évalue une expression pour ses effets de bord et n'émet rien ; `@dump(expr)` affiche joliment une valeur dans un `<pre class="inker-dump">` pour le débogage :

```inker
@eval(logger.debug('rendering invoice'))
@dump(invoice)
```

## Échappement HTML vs brut

```inker
{{ comment.body }}     <!-- xss-safe par défaut -->
{{{ comment.body }}}   <!-- sortie brute explicite -->
```

La table d'échappement couvre l'ensemble du contexte HTML plus les deux code points de séparateur de ligne JS (qui peuvent casser le contexte inline `<script>`) :

| Caractère   | Échappé en  |
|-------------|-------------|
| `&`         | `&amp;`     |
| `<`         | `&lt;`      |
| `>`         | `&gt;`      |
| `"`         | `&quot;`    |
| `'`         | `&#39;`     |
| `` ` ``     | `&#96;`     |
| U+2028      | `&#x2028;`  |
| U+2029      | `&#x2029;`  |

`null` et `undefined` sont convertis en chaîne vide en mode échappé comme brut — aucune chaîne `"null"` / `"undefined"` ne fuit jamais dans la sortie. Une `SafeString` retournée par un helper (ou une expression) est émise brute même à l'intérieur de `{{ }}`.

## Strict par défaut

Inker partage la posture de framework établie par Atlas, Rune et Warden : une mauvaise configuration lève fort, de façon descriptive, immédiatement.

- Les templates manquants lèvent — ils ne retournent pas `null`.
- Naviguer dans une valeur absente (`{{ order.customer.name }}` sans `customer`) lève avec la position source — cela ne rend pas du vide.
- Les chemins de root invalides lèvent à la construction — ils n'échouent pas paresseusement au premier rendu.
- Les erreurs de parse lèvent avec ligne + colonne — elles ne font pas de rendu partiel au mieux.

Le compromis, c'est moins de bugs de prod « facture blanche » au prix de plus de discipline en amont ; pour la surface de rendu de données du framework (pages admin, factures, e-mails), c'est le bon côté du compromis.
