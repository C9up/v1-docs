# Inker — Templates côté serveur

Inker est le module de templating côté serveur de l'écosystème Ream (`@c9up/inker`). C'est un clone hand-rolled d'**AdonisJS Edge** : la même syntaxe à directives `@`, la même interpolation `{{ }}`, les mêmes layouts / sections / composants / slots — avec un lexer et un parser en Rust et un évaluateur en Node.

> Statut : moteur à parité Edge complète. L'interpolation `{{ }}` évalue de vraies expressions JavaScript ; `@if`/`@elseif`/`@else`/`@unless`, `@each`, `@let`, `@layout` + `@section`/`@super`, `@include`/`@includeIf`, `@component` + `@slot` avec `$props`/`$slots`, les globals du cœur, les helpers enregistrés, `@eval`/`@dump`, et les tags personnalisés (`registerTag`) sont tous livrés. Le provider Ream et le sous-chemin agnostique `@c9up/inker/testing` sont câblés.

## Architecture — Rust parse, Node évalue (le modèle Edge)

L'epic interdit de tirer une dépendance de templating (Handlebars, Mustache, Eta, EJS, Pug, Nunjucks, et même Edge.js). Inker est hand-rolled, réparti entre un cœur Rust et un renderer Node :

- **Rust (`inker-engine`)** — un lexer à balayage avant unique et un parser linéaire transforment une source `.inker` en un **AST JSON** (`parseTemplate` / `parseTemplateJson` via NAPI). C'est le travail CPU-bound ; chaque nœud porte la *source verbatim* de ses expressions.
- **Node (`renderNode.ts`)** — parcourt l'AST JSON et évalue la source de chaque expression dans le **V8** de Node, avec les helpers enregistrés, les globals du cœur et le scope de rendu tous en portée lexicale — exactement comme Edge (un seul runtime ; les helpers sont de simples fonctions appelables partout, y compris dans des arrow functions et des arguments scopés à une boucle).

> La source des expressions est contrôlée par l'auteur (fichiers `.inker`) — le même niveau de confiance que le reste du code de l'app. C'est le modèle d'Edge, et c'est pourquoi un helper peut être appelé *à l'intérieur* d'une expression riche (`{{ users.filter(u => can(u)).map(u => u.name).join(', ') }}`).

> **Frontière de confiance (sécurité).** Comme les expressions tournent dans V8, un template *est du code*. Ne passe jamais d'entrée non fiable à `renderString`, et ne charge jamais de template `.inker` depuis une source non fiable (un champ CMS, un upload utilisateur) — ce serait de l'exécution de code arbitraire, exactement comme dans Edge. En durcissement (une déviation nommée de la parité Edge stricte), les globals Node dangereux — `process`, `globalThis`, `global`, `require`, `module`, `exports`, `Function`, `eval` — sont masqués à `undefined` dans le scope d'expression, donc `{{ process.env.SECRET }}` ou `@eval(require('child_process')…)` échouent. Ce n'est **pas** un sandbox : un échappement déterminé par chaîne de propriétés (`({}).constructor.constructor(…)`) n'est pas bloqué. Traite les templates comme du code de confiance.

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

Le constructeur lève `InkerRenderError({ code: 'E_INKER_INVALID_PATH' })` si `root` est relatif, absent, ou pointe vers un fichier plutôt qu'un répertoire.

## Interpolation & expressions

Inker calque Adonis Edge pour la sortie :

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

Une valeur qui est une `SafeString` est émise brute (même dans la forme échappée `{{ }}`) ; `null` / `undefined` rendent la chaîne vide ; les scalaires sont convertis (les nombres sans `.0` traînant, `-0` → `0`). Une expression qui référence un identifiant inconnu (ou navigue dans `null`/`undefined`) lève `E_INKER_UNKNOWN_IDENTIFIER` avec la position source.

### Caractères d'échappement, commentaires, espaces

Utilisez `\{{` / `\}}` pour émettre des accolades littérales (le backslash est consommé). Les commentaires façon Edge sont supportés et retirés entièrement — ils n'émettent rien, et leur contenu n'est jamais parsé :

```inker
Use \{{ name \}} to interpolate.     →   Use {{ name }} to interpolate.
{{-- cette note, et tout {{ x }} à l'intérieur, est retirée --}}
```

Un `{{--` non terminé est une erreur de lex dure, afin qu'une ouverture de commentaire égarée ne puisse pas avaler silencieusement le reste d'un template.

## Contrôle de flux

Des block tags façon Adonis. `@if` / `@elseif` / `@else` / `@endif`, sa négation `@unless`, et `@each` / `@endeach` :

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

`@each` itère les tableaux, les objets, les `Map` et les `Set`, avec un `@else` optionnel pour le cas vide :

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

`@let` ajoute une liaison à portée de bloc pour chaque frère qui le suit, évaluée dans une grammaire d'expression pure restreinte :

```inker
@let(total = cart.items.reduce((s, i) => s + i.price, 0))
<p>Total: {{ total }}</p>
```

## Layouts & sections

Un template enfant déclare son layout avec `@layout` (qui doit être le premier nœud) ; le layout injecte le corps de l'enfant à `{{> body }}` et les sections nommées à leurs yields `@section` :

```inker
{{-- layouts/main.inker --}}
<html>
  <head><title>@section('title')Default title@endsection</title></head>
  <body>{{> body }}</body>
</html>
```

```inker
{{-- home.inker --}}
@layout('layouts/main')
@section('title')Home — @super@endsection
<h1>Welcome</h1>
```

Dans un layout, un `@section('name')…@endsection` est un **yield** avec un contenu par défaut ; dans un enfant, il **remplit** le yield correspondant. `@super` à l'intérieur d'une section enfant injecte le contenu par défaut du layout pour cette section. Les noms se résolvent par position — pas de déclaration séparée.

## Partials

`@include('name')` rend les nœuds d'un autre template dans le **même** scope ; `@includeIf(condition, 'name')` inclut seulement lorsque la condition est truthy :

```inker
@include('partials/header')
@includeIf(user.isAdmin, 'partials/admin-bar')
```

## Composants

`@component('name', { props })` rend un template de composant avec son **propre** scope construit à partir des props passées (il n'hérite pas des données de l'appelant). Le contenu du corps de bloc et les blocs `@slot('name')…@endslot` rendent dans le scope de **l'appelant** et sont injectés aux sorties de slot du composant :

```inker
{{-- components/card.inker --}}
<div {{ $props.only(['id']).toAttrs() }} class="{{ $props.get('class', 'card') }}">
  <header>{{ title }}</header>
  {{ $slots.main() }}
  @if($slots.footer)<footer>{{ $slots.footer() }}</footer>@endif
</div>
```

```inker
@component('components/card', { title: 'Invoice', class: 'card lg' })
  <p>Body goes to the default (main) slot.</p>
  @slot('footer')<a href="/pay">Pay now</a>@endslot
@endcomponent
```

À l'intérieur d'un composant :

- `$props` est une API chaînable — `all()`, `get(key, fallback)`, `has(key)`, `only(keys)`, `except(keys)`, `merge(defaults)` (les props de l'appelant l'emportent ; `class` est combiné), et `toAttrs()` (sérialise en une chaîne d'attributs HTML).
- `$slots.main()` rend le slot par défaut (body) ; `$slots.<name>()` un slot nommé ; `$slots.<name>` vaut `undefined` s'il est absent, donc `@if($slots.footer)` fonctionne.

## Helpers & globals

Deux couches de fonctions sont toujours en portée d'expression :

- **Globals du cœur** — casse de chaînes (`camelCase`, `pascalCase`, `snakeCase`, `dashCase`, `titleCase`), texte (`truncate`, `excerpt`, `nl2br`), `pluralize`, formatage (`prettyBytes`, `prettyMs`, `ordinal`), `inspect`, et les helpers `html` (`html.attrs`, `html.classNames`, `html.safe`). Ils calquent les globals intégrés d'Edge.
- **Helpers enregistrés** — passés au constructeur (option `helpers`) ou câblés par le provider : `t()` (i18n), `route`/`urlFor` et `signedUrlFor`, `asset`, `csrfField` / `csrfMeta`, etc. Un nom enregistré surcharge un global du cœur de même nom.

```ts
const templates = new Templates({
  root,
  helpers: new Map([
    ['t', (key) => i18n.translate(String(key))],
  ]),
})
```

Un helper (ou global) qui retourne une `SafeString` est émis brut — c'est ainsi qu'un helper embarque du markup de confiance (p. ex. un champ caché CSRF, ou un îlot Aurora rendu côté serveur).

## Tags personnalisés — `registerTag`

Enregistrez un `@`-tag personnalisé (parité `edge.registerTag` d'AdonisJS/Edge). La définition est un objet — `{ tagName, block, seekable, compile(parser, buffer, token) }` — et elle fait reconnaître par le parser `@<tagName>(jsArg)` dans chaque template :

```ts
import fs from 'node:fs'

templates.registerTag({
  tagName: 'svg',
  block: false,     // tag inline (les block tags ne sont pas encore supportés)
  seekable: true,   // accepte un argument entre parenthèses
  compile(parser, buffer, token) {
    const name = token.properties.jsArg.trim().replace(/['"]/g, '')
    buffer.writeRaw(fs.readFileSync(`./assets/icons/${name}.svg`, 'utf-8'))
  },
})
```

```inker
@svg('user')
<p>Rendered: @time()</p>
```

À l'intérieur de `compile` :

- `token.properties.jsArg` est la source **verbatim** des arguments entre les parenthèses.
- `buffer.writeRaw(text)` émet du markup verbatim.
- `buffer.outputExpression(jsExpression, filename, line, escape)` évalue une expression du template (une chaîne source JS) dans le scope de rendu et émet sa valeur — échappée lorsque `escape` vaut `true`.
- Un tag `seekable: false` rejette tout argument ; `block: true` est rejeté (seuls les tags inline sont livrés pour l'instant).

> **Déviation Inker (nommée) :** Edge exécute `compile` une seule fois à la *compilation* du template (il émet du JS). Inker parse en Rust et rend en parcourant l'AST JSON, donc `compile` s'exécute au moment du **rendu** — le modèle d'écriture est identique, il n'y a simplement pas de phase de compilation à imiter. Comme un nom de tag change la façon dont un template *parse*, `registerTag` vide le cache d'AST ; enregistrez vos tags au démarrage, avant tout rendu. Enregistrer un nom qui entre en collision avec une directive intégrée, ou un identifiant invalide, lève `E_INKER_INVALID_PATH` ; un `@word` non enregistré est inerte (rendu comme texte littéral, parité Edge).

Les types `InkerTag`, `InkerTagBuffer`, `InkerTagToken`, `InkerTagParser` sont exportés depuis `@c9up/inker`.

## Débogage — `@eval` / `@dump`

`@eval(expr)` évalue une expression pour ses effets de bord et n'émet rien ; `@dump(expr)` affiche joliment une valeur dans un `<pre class="inker-dump">` pour le débogage :

```inker
@eval(logger.debug('rendering invoice'))
@dump(invoice)
```

## API principale

```ts
import { Templates, InkerRenderError } from '@c9up/inker'

const templates = new Templates({
  root: '/abs/path/to/templates',
  cacheMode: 'auto',  // 'auto' (défaut) | 'mtime' | 'never'
  helpers: new Map(), // helpers enregistrés optionnels
})

await templates.render(name, data)      // async ; charge <root>/<name>.inker
templates.renderString(source, data)    // sync ; rend une chaîne en mémoire (pas de directive disque)
templates.registerTag(definition)       // enregistre un @tag personnalisé (vide le cache)
templates.clearCache()                  // vide tout le cache d'AST
templates.mount('admin', '/abs/admin')  // disque nommé → render 'admin::dashboard'
templates.unmount('admin')              // retire un disque nommé
```

### `render(name, data)`

Async. Résout `<root>/<name>.inker` depuis le disque, parse (mis en cache), compose layouts / partials / composants, et rend avec les données fournies. Les templates manquants lèvent `InkerRenderError({ code: 'E_INKER_TEMPLATE_NOT_FOUND', context: { templatePath } })` — strict par défaut ; l'ENOENT original de `fs.readFile` est préservé sur `.cause`.

### `renderString(source, data)`

Sync. Rend une chaîne en mémoire. Il ne peut pas résoudre les directives adossées au disque (`@layout`, `@include`, `@component`, `{{> body }}`) — celles-ci lèvent `E_INKER_DISK_REQUIRED` ; utilisez `render(name, data)` à la place. Les tags personnalisés et chaque directive intra-chaîne (`@if`, `@each`, …) fonctionnent.

### `mount(diskName, dir)` / `unmount(diskName)`

**Disques** nommés — parité `edge.mount(name, dir)` d'AdonisJS/Edge. Montez un second répertoire de templates sous un namespace, puis adressez ses templates comme `diskName::template` :

```ts
templates.mount('admin', '/abs/path/to/admin-templates')

await templates.render('admin::dashboard')   // <admin>/dashboard.inker
await templates.render('home')                // <root par défaut>/home.inker
```

Un nom **nu** se résout toujours contre le disque par défaut (le `root` du constructeur) ; un nom `disk::name` se résout contre le disque monté — exactement comme Edge. Les références à l'intérieur d'un template se résolvent de la même façon, donc la composition inter-disques est explicite :

```inker
@layout('admin::layout')
@include('admin::partials/sidebar')
@component('admin::button', { label: 'Save' })
```

C'est ainsi qu'un **package livre ses propres vues** : il résout le renderer partagé de l'hôte, `mount`e son répertoire de templates sous son propre namespace, et rend `pkg::template` — voir comment [Station](./station) monte ses vues admin. Le confinement est appliqué contre le **propre** root de chaque disque (la même validation de forme de chemin et le même garde-fou symlink que le root par défaut), donc monter un répertoire n'élargit jamais la traversée hors d'un root. Un nom de disque doit avoir la forme d'un identifiant (`[A-Za-z0-9_-]+`) ; les séparateurs de chemin et `::` sont rejetés. `unmount(name)` retire un disque (no-op s'il est absent). Re-monter un nom écrase son répertoire.

## Sémantique du cache

Le cache est une `Map<absPath, { ast, mtimeMs }>` par instance (deux instances `Templates` avec des roots différents ne partagent PAS d'entrées — gardez un `Templates` par tenant).

L'option `cacheMode` se résout UNE fois à la construction :

| Mode      | Comportement                                                                        |
|-----------|-------------------------------------------------------------------------------------|
| `'auto'`  | `process.env.NODE_ENV === 'production' ? 'never' : 'mtime'`                          |
| `'mtime'` | Posture dev — `stat()` à chaque rendu ; reparse quand le mtime avance               |
| `'never'` | Posture prod — **n'invalide jamais** ; le premier rendu gagne pour toujours (jusqu'à `clearCache`) |

`'never'` signifie « ne re-stat jamais / n'invalide jamais », pas « ne cache jamais » — caché pour toujours est la posture prod. Utilisez `clearCache()` (ou `registerTag`, qui le vide) pour forcer une relecture.

## Erreurs

Inker a une seule classe d'erreur typée avec un `code` discriminé :

```ts
import { InkerRenderError } from '@c9up/inker'

try {
  await templates.render('invoice', {})
} catch (e) {
  if (e instanceof InkerRenderError) {
    console.error(e.code)                 // 'E_INKER_UNKNOWN_IDENTIFIER'
    console.error(e.context.line)         // 4
    console.error(e.context.column)       // 12
    console.error(e.context.templatePath) // '/abs/path/invoice.inker'
  }
}
```

| Code                              | Quand                                                                                    |
|-----------------------------------|------------------------------------------------------------------------------------------|
| `E_INKER_TEMPLATE_NOT_FOUND`      | Le fichier `<root>/<name>.inker` n'existe pas (ENOENT). Erreur originale sur `.cause`.    |
| `E_INKER_PARSE_ERROR`             | Le lexer ou le parser a rejeté la source.                                                |
| `E_INKER_UNKNOWN_IDENTIFIER`      | Une expression a référencé un identifiant inconnu ou navigué dans `null`/`undefined`.    |
| `E_INKER_INVALID_EXPRESSION`      | Une expression n'a pas compilé ou a produit une valeur non interpolable.                 |
| `E_INKER_INVALID_ITERABLE`        | `@each` a reçu une valeur qui n'est pas un tableau / objet / Map / Set.                   |
| `E_INKER_UNKNOWN_HELPER`          | Un nom de helper inconnu a été appelé dans une expression.                               |
| `E_INKER_UNKNOWN_TAG`             | Un `@tag` a été parsé comme tag personnalisé mais aucun handler n'est enregistré.        |
| `E_INKER_DISK_REQUIRED`          | Une directive disque (`@layout`/`@include`/`@component`) a été utilisée depuis `renderString`. |
| `E_INKER_INVALID_PATH`            | `root`, nom de disque, ou définition `registerTag` invalide.                             |
| `E_INKER_UNCLOSED_INTERPOLATION` / `E_INKER_UNCLOSED_BLOCK` / `E_INKER_MISMATCHED_BLOCK_END` | Erreurs structurelles de source (accolades / block tags déséquilibrés). |

Toutes les erreurs incluent `context.line` / `context.column` (base 1) lorsque l'échec est localisable dans la source.

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
- Les identifiants inconnus lèvent avec la position source — ils ne rendent pas du vide.
- Les chemins de root invalides lèvent à la construction — ils n'échouent pas paresseusement au premier rendu.
- Les erreurs de parse lèvent avec ligne + colonne — elles ne font pas de rendu partiel au mieux.

Le compromis, c'est moins de bugs de prod « facture blanche » au prix de plus de discipline en amont ; pour la surface de rendu de données du framework (pages admin, factures, e-mails), c'est le bon côté du compromis.

## Îlots Aurora

Un helper peut retourner une [SafeString](#échappement-html-vs-brut) de markup [Aurora](/fr/modules/aurora) rendu côté serveur, embarquant un îlot réactif dans un template Inker — `renderToString(component(data))` sur le serveur, `hydrate(el, component)` sur le client. Aucun code de glue ne vit dans l'un ou l'autre package. Voir [Embarquer aurora dans les templates inker](/fr/modules/aurora#embedding-aurora-in-inker-templates).

## Checklist de production

- Résolvez `root` en un chemin absolu contre le layout de votre projet — ne passez pas de chemins relatifs.
- Laissez `cacheMode` sur `'auto'` pour que la prod obtienne la posture rapide « caché pour toujours » sans cérémonie.
- Enregistrez tous les tags personnalisés au démarrage (avant le premier rendu) — `registerTag` vide le cache.
- N'entourez chaque appel `render()` / `renderString()` d'un `try/catch` qu'à la frontière de route — laissez les erreurs strict-par-défaut remonter à travers les helpers et les view models pour qu'une mauvaise configuration soit bruyante.
- Liez `Templates` comme singleton du conteneur (le `InkerProvider` le fait) — ne le ré-instanciez jamais par requête.
- Pour les scénarios multi-tenant avec des roots de templates différents, gardez une instance `Templates` par tenant — le cache est par instance, par conception.
