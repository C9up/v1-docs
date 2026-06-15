# Inker — Templates côté serveur

Inker est le module de templates côté serveur de l'écosystème Ream (`@c9up/inker`).

> Statut : la Story 53.1 livre le moteur minimum crédible — lexer + parser + renderer écrits à la main, interpolation HTML-escape-par-défaut, résolution d'expressions par accès aux membres, cache d'AST par instance. Les layouts (53.2), le contrôle de flot (53.3), les helpers (53.4), le provider Ream (53.5) et le sous-chemin agnostique `@c9up/inker/testing` (53.6) arrivent dans les stories suivantes.

## Pourquoi écrit à la main

L'epic interdit explicitement d'embarquer une dépendance de templating (Handlebars, Mustache, Eta, EJS, Pug, Nunjucks, Edge.js lui-même). Inker est donc une trinité lexer + AST + renderer faits maison :

- Le lexer est un scan linéaire sur la source — aucun chemin regex-only.
- Le parser parcourt le flux de tokens linéairement, gèle l'AST, et utilise un check d'exhaustivité TypeScript : ajouter un nouveau type de nœud en 53.2-53.4 sera une erreur de compilation si le renderer oublie de s'étendre.
- Le renderer accumule dans un buffer `string[]` puis joint à la fin (économe en mémoire vs. `+=`).

Le package est ainsi zero-peer-dep, agnostique par construction, et facile à étendre story après story.

## Convention de fichier

Les templates sont des fichiers `<root>/<name>.inker`. L'appelant résout la racine une seule fois (chemin absolu) et la passe à la construction. Pas de chemin de recherche implicite, pas de résolution automatique contre `process.cwd()`, pas d'expansion `~` — explicite bat implicite :

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

Le constructeur lève `InkerRenderError({ code: 'E_INKER_INVALID_PATH' })` si `root` est relatif, inexistant, ou pointe sur un fichier au lieu d'un répertoire.

## Syntaxe d'interpolation

Inker reprend la syntaxe de sortie d'Adonis Edge :

```inker
<!-- Échappé (sûr HTML par défaut — protège du XSS stocké) -->
<h1>Bonjour {{ customer.name }}</h1>

<!-- Brut / non-échappé (à utiliser délibérément pour des fragments HTML déjà sûrs) -->
<div>{{{ richBody }}}</div>
```

L'`expr` entre accolades est un **chemin d'accès aux membres**, pas une expression JavaScript. La 53.1 accepte :

| Forme              | Résout en                                              |
|--------------------|--------------------------------------------------------|
| `name`             | `data.name`                                            |
| `customer.name`    | `data.customer.name`                                   |
| `items[0]`         | `data.items[0]` (entier non-négatif uniquement)        |
| `items["clé bizarre"]` | `data["clé bizarre"]` (échappements `\"`/`\'`/`\\`) |
| `items[0].title`   | mélange imbriqué                                       |

L'arithmétique (`a + b`), les appels de fonction (`fn(x)`), les ternaires (`a ? b : c`), l'optional chaining (`a?.b`) et les template literals lèvent tous `E_INKER_PARSE_ERROR` avec une raison descriptive — l'évaluation complète d'expressions JS arrive avec les helpers en Story 53.4.

### Caractères d'échappement

`\{{` et `\}}` produisent des accolades littérales `{{` / `}}` dans la sortie (le backslash est consommé) :

```inker
Utilise \{{ name \}} pour interpoler.   →   Utilise {{ name }} pour interpoler.
```

### Espaces et commentaires

La 53.1 préserve chaque octet hors des accolades verbatim. La syntaxe Edge `{{- expr -}}` (trim d'espaces) et `{{-- commentaire --}}` ne sont PAS implémentées en 53.1 (différé par D7 de la Story 53.1) ; la sortie est byte-stable contre la source.

## API principale

```ts
import { Templates, InkerRenderError } from '@c9up/inker'

const templates = new Templates({
  root: '/chemin/abs/vers/templates',
  cacheMode: 'auto',  // 'auto' (défaut) | 'mtime' | 'never'
})

await templates.render(name, data)      // async ; charge <root>/<name>.inker
templates.renderString(source, data)    // sync ; rend une chaîne en mémoire
templates.clearCache()                  // vide tout le cache d'AST
```

### `render(name, data)`

Async. Résout `<root>/<name>.inker` depuis le disque, parse (en cache), rend avec l'objet `data` fourni :

```ts
const html = await templates.render('invoice', {
  customer: { name: 'Alice' },
  total: 42,
})
```

Les templates manquants lèvent `InkerRenderError({ code: 'E_INKER_TEMPLATE_NOT_FOUND', context: { templatePath } })` — strict par défaut ; aucun fallback silencieux. L'ENOENT d'origine de `fs.readFile` est préservé sur `.cause`.

### `renderString(source, data)`

Sync. Utile pour des templates inline, du rendu one-shot, et le `inker.render()` côté contrôleur que la Story 53.5 construira par-dessus :

```ts
const fragment = templates.renderString(
  '<li>{{ item.title }}</li>',
  { item: { title: 'Widget' } },
)
```

Aucune clé de cache — l'appelant est responsable du cache de ses propres sources.

### `clearCache()`

Vide chaque AST en cache. Utilisé par le provider de la Story 53.5 sur `shutdown` et par les tests qui assertent du cache-bust.

## Sémantique du cache

Le cache est un `Map<absPath, { ast, mtimeMs }>` par instance (deux `Templates` avec des racines différentes ne partagent PAS d'entrée — gardez un `Templates` par tenant).

L'option `cacheMode` est résolue UNE SEULE FOIS à la construction :

| Mode      | Comportement                                                                                   |
|-----------|------------------------------------------------------------------------------------------------|
| `'auto'`  | `process.env.NODE_ENV === 'production' ? 'never' : 'mtime'`                                    |
| `'mtime'` | Posture dev — `stat()` à chaque render ; reparse quand le mtime avance                         |
| `'never'` | Posture prod — **jamais invalidé** ; premier render gagne pour toujours (jusqu'à `clearCache`) |

Note : `'never'` signifie "jamais re-stat / jamais invalider", pas "jamais cacher" — caché pour toujours est la posture prod. Utilisez `clearCache()` pour forcer une relecture.

```ts
// dev (auto-dérivé depuis NODE_ENV !== 'production')
const dev = new Templates({ root })

// scénario CI / test où on veut un hot-reload explicite
const reload = new Templates({ root, cacheMode: 'mtime' })

// prod explicite (aussi implicite quand NODE_ENV=production)
const prod = new Templates({ root, cacheMode: 'never' })
```

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
    console.error(e.context.expression)   // 'customer.name'
    console.error(e.context.templatePath) // '/chemin/abs/invoice.inker'
  }
}
```

| Code                              | Quand                                                                                              |
|-----------------------------------|----------------------------------------------------------------------------------------------------|
| `E_INKER_TEMPLATE_NOT_FOUND`      | Le fichier `<root>/<name>.inker` n'existe pas (ENOENT). Erreur d'origine sur `.cause`.             |
| `E_INKER_PARSE_ERROR`             | Lexer ou path-parser a rejeté la source (interpolation vide, expression JS, chemin invalide).      |
| `E_INKER_UNKNOWN_IDENTIFIER`      | L'objet `data` ne possède pas le chemin résolu (strict ; aucun fallback silencieux).               |
| `E_INKER_INVALID_PATH`            | Le `root` du constructeur est relatif, manquant ou pointe sur un fichier.                          |
| `E_INKER_UNCLOSED_INTERPOLATION`  | Le lexer a atteint EOF ou une accolade asymétrique avant un closing valide.                        |

Toutes les erreurs incluent `context.line` / `context.column` (1-based, position source) quand l'erreur est localisable, et `context.expression` (le texte verbatim de l'interpolation fautive).

## HTML-escape vs raw

```inker
<!-- XSS-safe par défaut -->
{{ comment.body }}

<!-- sortie raw explicite -->
{{{ comment.body }}}
```

La table d'échappement reprend l'ensemble OWASP canonique pour le contexte HTML :

| Caractère | Échappé en |
|-----------|------------|
| `&`       | `&amp;`    |
| `<`       | `&lt;`     |
| `>`       | `&gt;`     |
| `"`       | `&quot;`   |
| `'`       | `&#39;`    |

`null` et `undefined` se coercent en chaîne vide dans les deux modes — aucune chaîne `"null"` / `"undefined"` ne fuit jamais dans la sortie.

## Strict-by-default

Inker partage la posture framework établie par Atlas, Rune et Warden : la mauvaise configuration lève fort, descriptivement, immédiatement. Concrètement :

- Templates manquants → lève — pas de retour `null`.
- Identifiants inconnus → lève avec le chemin consommé — pas de rendu blanc.
- Chemins racine invalides → lève à la construction — pas d'échec paresseux au premier render.
- Erreurs de parse → lève avec ligne + colonne — pas de rendu best-effort partiel.

Le compromis : moins de bugs prod "facture blanche" au prix de plus de discipline en amont ; pour la surface data-rendering du framework (pages admin, factures, emails), c'est le bon côté du trade-off.

## Limitations en 53.1

Volontaires, suivies par la story dédiée :

- **Pas de layouts / partials** — Story 53.2 ajoutera `{% layout %}` / `{% include %}`.
- **Pas de contrôle de flot** — Story 53.3 ajoutera `@if` / `@each` / `@component` (block tags style Adonis).
- **Pas de helpers** — Story 53.4 ajoutera `t()` / `csrfField()` / `url()` / `asset()` et l'évaluateur d'expressions helper-aware.
- **Pas de provider Ream** — Story 53.5 ajoutera `inker.render(ctx, name, data)` et le câblage container-singleton.
- **Pas de `@c9up/inker/testing`** — Story 53.6 ajoutera le renderer fake agnostique avec les assertions style `assertRendered(name, dataMatcher)`.

## Îlots aurora

Un helper peut renvoyer un [SafeString](#html-escape-vs-raw) de markup [Aurora](/fr/modules/aurora) rendu côté serveur, embarquant un îlot réactif dans un template Inker — `renderToString(component(data))` côté serveur, `hydrate(el, component)` côté client. Aucun code de liaison ne vit dans l'un ou l'autre package. Voir [Intégrer aurora dans les templates inker](/fr/modules/aurora#integrer-aurora-dans-les-templates-inker).

## Checklist production

- Résoudre `root` vers un chemin absolu relatif à la structure projet — ne pas passer de chemin relatif.
- Laisser `cacheMode` sur `'auto'` pour que la prod prenne la posture cached-forever rapide sans cérémonie.
- Encapsuler chaque appel `render()` / `renderString()` dans un `try/catch` SEULEMENT au boundary route — laisser les erreurs strict-by-default remonter à travers helpers et view-models pour que la mauvaise config soit bruyante.
- Lier `Templates` comme singleton du container (le `InkerProvider` de la Story 53.5 le fera pour vous) — ne jamais ré-instancier par requête.
- Pour les scénarios multi-tenant avec racines différentes, garder une instance `Templates` par tenant — le cache est par instance par design.
