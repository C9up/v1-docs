# Helpers et tags personnalisés

Ce guide couvre l’extension du moteur de templates :

- Helpers & globals
- Contribuer depuis un autre paquet
- Tags personnalisés — `registerTag`

## Helpers & globals

Deux couches de fonctions sont toujours en portée d'expression :

- **Globals du cœur** — casse de chaînes (`camelCase`, `pascalCase`, `snakeCase`, `dashCase`, `titleCase`), texte (`truncate` garde les balises d'une entrée HTML et ferme celles qu'il coupe, `excerpt` les retire et compte chaque fin de paragraphe comme une espace — tous deux en mots entiers avec un suffixe `...` par défaut, `{ strict: true }` pour couper exactement à la longueur — et `nl2br`), `pluralize`, formatage (`prettyBytes`, `prettyMs`, `ordinal`, et `toBytes` / `toMs`, qui relisent `'2.5 MB'` ou `'1h'` en nombre et rendent `null` pour tout le reste, en un temps linéaire dans la longueur de l'entrée), `inspect`, et les helpers `html` (`html.attrs`, `html.classNames`, `html.safe`). S'y ajoute `html.jsonLd(data, cspNonce())`, qui écrit les données structurées d'une page en `<script type="application/ld+json">` — la valeur échappée comme le fait `js.stringify`, pour qu'aucune valeur ne ferme la balise, et le nonce sur la balise. Une valeur que JSON ne sait pas tenir (une fonction, un symbole, un bigint, `NaN`/`Infinity`, un cycle, une imbrication de plus de 512 niveaux) est refusée avec `E_INKER_INVALID_JSON_LD` plutôt qu'écrite en données structurées invalides ; le message nomme son chemin, par exemple `offers[1].price is NaN`. Un getter ou un `toJSON` des données qui lève une erreur est signalé par `E_INKER_HELPER_THROW` avec ce chemin, l'erreur d'origine en `cause`.
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

### Rendre dans une requête — `ctx.view`

`InkerProvider` donne à chaque contexte HTTP une `view` : un renderer qui lui
est propre, créé au premier accès et gardé pour la requête, avec `request` déjà
partagé. Ce qu'un middleware y `share()` atteint le rendu du contrôleur.

```ts
async create({ view }: HttpContext) {
  return view.render('posts/create', { categories })
}
```

Chaque rendu passé par `ctx.view` (`render`, `renderSync`, `renderString`,
`renderRaw`, `renderRawSync`, et ceux d'un `clone()`) voit la même requête que
`inker.render(ctx, …)` : `t()` traduit dans `ctx.locale`, `csrfField()` /
`csrfMeta()` écrivent le jeton de cette requête, `cspNonce()` rend son nonce.

Le provider a besoin d'un routeur dans le conteneur. `@c9up/rosetta` est
facultatif : sans lui, le moteur, `ctx.view` et le service `inker` démarrent
quand même, et inker n'enregistre pas de `t()` à lui — un template qui l'appelle
échoue avec « 't' is not a helper, a global or a function ». Installe rosetta
pour traduire.

## Contribuer depuis un autre paquet

Un paquet qui livre ses propres globals ou tags — le `t()` de rosetta, que
toute application voit — les pousse par l'export par défaut du paquet :

```ts
import inker from '@c9up/inker'

inker.use((engine) => {
  engine.global('money', (cents: number) => `${(cents / 100).toFixed(2)} €`)
})
```

Appelez-le quand vous voulez. `use()` ne fait qu'empiler : le moteur exécute
ses plugins une fois, juste avant le premier rendu, si bien qu'un plugin
enregistré avant que le moteur ne soit configuré observe quand même le moteur
tel qu'il finit. C'est pour ça que c'est un import de module et pas un binding
du conteneur — le binding du moteur n'est résoluble qu'une fois l'application
démarrée, et un paquet qui veut contribuer tourne généralement plus tôt.

Un provider qui fait ça doit d'abord vérifier le drapeau, pour rester
installable dans une application sans moteur de template :

```ts
async boot() {
  if (this.app.usingInker !== true) return
  const inker = await import('@c9up/inker')
  inker.default.use(myPlugin)
}
```

`usingInker` est posé par le constructeur d'`InkerProvider`, qui tourne avant
le boot de n'importe quel provider.

### Rendre hors d'une requête

Un paquet qui rend des templates sans requête HTTP autour — un mailer — passe
par le même export par défaut. `share(state)` lie des valeurs que voient tous
les partials et composants du rendu, et `render(template, data)` rend avec le
moteur qu'`InkerProvider` a construit :

```ts
if (this.app.usingInker === true) {
  const inker = await import('@c9up/inker')
  const html = await inker.default.share(sharedState).render('emails/welcome', data)
}
```

Rendre avant le démarrage d'`InkerProvider` lève `E_INKER_ENGINE_MISSING`.

## Tags personnalisés — `registerTag`

Enregistrez un `@`-tag personnalisé. La définition est un objet — `{ tagName, block, seekable, compile(parser, buffer, token) }` — et elle fait reconnaître par le parser `@<tagName>(jsArg)` dans chaque template :

```ts
import fs from 'node:fs'

templates.registerTag({
  tagName: 'svg',
  block: false,     // tag inline : pas de corps
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

Un tag enregistré avec `block: true` prend un corps, fermé par `@end<tagName>`
— ou aucun corps quand il est écrit auto-fermé, `@!<tagName>(…)`. Son `compile`
reçoit le corps déjà rendu, à la demande, par `token.renderBody()` :

```ts
templates.registerTag({
  tagName: 'card',
  block: true,
  seekable: true,
  async compile(parser, buffer, token) {
    buffer.writeRaw('<section class="card"><h2>')
    buffer.outputExpression(token.properties.jsArg, token.filename, token.loc.start.line, true)
    buffer.writeRaw('</h2>')
    buffer.writeRaw(await token.renderBody())
    buffer.writeRaw('</section>')
  },
})
```

```inker
@card(invoice.title)
  <p>{{ invoice.total }}</p>
@endcard
```

À l'intérieur de `compile` :

- `token.properties.jsArg` est la source **verbatim** des arguments entre les parenthèses.
- `buffer.writeRaw(text)` émet du markup verbatim.
- `buffer.outputExpression(jsExpression, filename, line, escape)` évalue une expression du template (une chaîne source JS) dans le scope de rendu et émet sa valeur — échappée lorsque `escape` vaut `true`.
- `token.renderBody(locals?)` rend le corps d'un tag de bloc dans le scope du tag, plus les `locals` que vous lui passez, et renvoie le HTML (une chaîne, ou une promesse quand le corps a attendu quelque chose) ; le corps d'un tag inline vaut `""`. Un tag qui ne l'appelle jamais ne paie jamais son corps.
- `token.evaluate(expression)` évalue une expression du template dans le scope où le tag a été atteint.
- `compile` peut être `async` : le rendu l'attend, et ce qu'il a écrit arrive dans l'ordre.
- Un tag `seekable: false` rejette tout argument (`E_INKER_INVALID_EXPRESSION`).

> **Quand `compile` s'exécute :** inker parse en Rust et rend en parcourant l'AST JSON, donc le `compile` d'un tag s'exécute au moment du **rendu**. Comme un nom de tag change la façon dont un template *parse*, `registerTag` vide le cache d'AST ; enregistrez vos tags au démarrage, avant tout rendu. Enregistrer un nom qui entre en collision avec une directive intégrée, ou un identifiant invalide, lève `E_INKER_INVALID_PATH` ; un `@word` non enregistré est inerte (rendu comme texte littéral).

Les types `InkerTag`, `InkerTagBuffer`, `InkerTagToken`, `InkerTagParser` sont exportés depuis `@c9up/inker`.
