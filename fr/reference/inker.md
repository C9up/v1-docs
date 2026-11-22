# inker

Ce guide couvre l'API d'inker, son cache, ses erreurs et sa checklist de production :

- API principale
- Sémantique du cache
- Erreurs
- Checklist de production

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

**Disques** nommés. Montez un second répertoire de templates sous un namespace, puis adressez ses templates comme `diskName::template` :

```ts
templates.mount('admin', '/abs/path/to/admin-templates')

await templates.render('admin::dashboard')   // <admin>/dashboard.inker
await templates.render('home')                // <root par défaut>/home.inker
```

Un nom **nu** se résout contre le disque par défaut — le `root` du constructeur, jusqu'à ce que `templates.mount(dir)` (ou `mount('default', dir)`) le redirige ; `templates.mounted.default` indique la racine en vigueur. Un nom `disk::name` se résout contre le disque monté. Un template en mémoire (`registerTemplate`) ne répond qu'au nom sous lequel il a été enregistré, préfixe de disque compris. Un nom déjà enregistré est refusé avec `E_INKER_TEMPLATE_COLLISION` au lieu d'être remplacé — deux paquets livrant un template sous le même nom rendraient sinon le balisage l'un de l'autre ; `removeTemplate(name)` d'abord est le remplacement explicite. Les références à l'intérieur d'un template se résolvent de la même façon, donc la composition inter-disques est explicite :

```inker
@layout('admin::layout')
@include('admin::partials/sidebar')
@component('admin::button', { label: 'Save' })
```

C'est ainsi qu'un **package livre ses propres vues** : il résout le renderer partagé de l'hôte, `mount`e son répertoire de templates sous son propre namespace, et rend `pkg::template` — voir comment [Station](/fr/guides/digging-deeper/admin/) monte ses vues admin. Le confinement est appliqué contre le **propre** root de chaque disque (la même validation de forme de chemin et le même garde-fou symlink que le root par défaut), donc monter un répertoire n'élargit jamais la traversée hors d'un root. Un nom de disque doit avoir la forme d'un identifiant (`[A-Za-z0-9_-]+`) ; les séparateurs de chemin et `::` sont rejetés. `unmount(name)` retire un disque (no-op s'il est absent). Re-monter un nom écrase son répertoire.

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
| `E_INKER_UNKNOWN_IDENTIFIER`      | Une expression a navigué dans `null`/`undefined`.                                         |
| `E_INKER_INVALID_EXPRESSION`      | Une expression n'a pas compilé ou a produit une valeur non interpolable.                 |
| `E_INKER_INVALID_ITERABLE`        | `@each` a reçu une valeur qui n'est pas un tableau / objet / Map / Set.                   |
| `E_INKER_RENDER_DEPTH`            | Plus de 100 niveaux de partials/composants imbriqués, ou un helper a débordé la pile.     |
| `E_INKER_ENGINE_MISSING`          | `inker.share().render()` a tourné avant qu'`InkerProvider` ait construit un moteur.       |
| `E_INKER_UNKNOWN_TAG`             | Un `@tag` a été parsé comme tag personnalisé mais aucun handler n'est enregistré.        |
| `E_INKER_DISK_REQUIRED`          | Une directive disque (`@layout`/`@include`/`@component`) a été utilisée depuis `renderString`. |
| `E_INKER_INVALID_PATH`            | `root`, nom de disque, ou définition `registerTag` invalide.                             |
| `E_INKER_TEMPLATE_COLLISION`      | `registerTemplate` a reçu un nom déjà enregistré (le `removeTemplate` d'abord).          |
| `E_INKER_UNCLOSED_INTERPOLATION` / `E_INKER_UNCLOSED_BLOCK` / `E_INKER_MISMATCHED_BLOCK_END` | Erreurs structurelles de source (accolades / block tags déséquilibrés). |

Toutes les erreurs incluent `context.line` / `context.column` (base 1) lorsque l'échec est localisable dans la source.

## Checklist de production

- Résolvez `root` en un chemin absolu contre le layout de votre projet — ne passez pas de chemins relatifs.
- Laissez `cacheMode` sur `'auto'` pour que la prod obtienne la posture rapide « caché pour toujours » sans cérémonie.
- Enregistrez tous les tags personnalisés au démarrage (avant le premier rendu) — `registerTag` vide le cache.
- N'entourez chaque appel `render()` / `renderString()` d'un `try/catch` qu'à la frontière de route — laissez les erreurs strict-par-défaut remonter à travers les helpers et les view models pour qu'une mauvaise configuration soit bruyante.
- Liez `Templates` comme singleton du conteneur (le `InkerProvider` le fait) — ne le ré-instanciez jamais par requête.
- Pour les scénarios multi-tenant avec des roots de templates différents, gardez une instance `Templates` par tenant — le cache est par instance, par conception.
