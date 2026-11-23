# Rendu serveur

Ce guide couvre le rendu côté serveur et l’hydratation :

- Cœur sans hôte — `@c9up/aurora/core`
- SSR — `renderToString`
- Bas niveau — hydration directe
- Intégrer aurora dans les templates inker

## Cœur sans hôte — `@c9up/aurora/core`

`@c9up/aurora` est l'entrée du navigateur : elle embarque le rendu DOM,
l'hydratation et les utilitaires du navigateur. Le code qui doit tourner sur
**tous** les hôtes — le serveur, le navigateur, un téléphone via un moteur de
rendu natif — importe plutôt depuis `@c9up/aurora/core` :

```ts
import { component, html, signal, memo, each, onMount } from '@c9up/aurora/core'

export const Counter = component((props: { label: string }) => {
  const count = signal(0)
  return html`<button @click=${() => count((n) => n + 1)}>${props.label} : ${count}</button>`
})
```

Cette entrée contient ce avec quoi on écrit un composant : les signaux
(`signal`, `memo`, `effect`, `batch`, `untrack`, `onCleanup`), `html`,
`component` avec son cycle de vie et son contexte, `each`, `uid`, `cn`,
`command`, `form` et `AuroraError`. Elle se charge là où il n'y a ni DOM, ni
module Node, ni `await` de haut niveau — un test parcourt son graphe d'imports
pour que ça le reste. `@c9up/aurora` réexporte les mêmes fonctions : une app
existante ne change rien, et un composant écrit avec le cœur se rend toujours
avec `render()` et `aurora.render()`.

`byId` n'est pas dans le cœur : il lit `document`.

### Écrire un moteur de rendu — `@c9up/aurora/renderer`

Un moteur de rendu pour un autre hôte lit le même `TemplateResult` que le rendu
DOM. `@c9up/aurora/renderer` lui donne les briques que partagent les moteurs
d'aurora, pour qu'un composant se comporte partout de la même façon :

| Export | À quoi il sert |
|---|---|
| `TemplateScanner`, `assertBindable`, `assertBindableProperty` | Refuser les positions de slot que le rendu DOM refuse |
| `readComponentLifecycle` | Les hooks de montage et de démontage qu'un `component()` a attachés à son résultat |
| `bindTemplateContext` | Exécuter la fonction d'un slot sous le contexte où elle a été écrite |
| `setOwner` | Recueillir les effets créés pendant la construction d'un sous-arbre, pour les libérer avec lui |
| `readEach`, `readEachItems` | Les listes à clé |
| `guardUrlAttribute`, `guardUrlProperty` | Les contrôles d'URL que tout hôte applique |

Le code applicatif n'a jamais besoin de cette entrée.

## SSR — `renderToString`

```ts
import { renderToString } from '@c9up/aurora'

const html = renderToString(html`<p>Bonjour le monde !</p>`)
// "<p>Bonjour le monde !</p>"
```

Le walker SSR est synchrone, alloue une seule string, et ne touche jamais à un DOM. Il tourne tel quel dans Node, dans les Workers et dans Deno.

## Bas niveau — hydration directe

Si vous ne voulez pas le helper `aurora.render()` (vous faites votre propre coquille HTML), les primitives sont toujours exposées :

```js
import { hydrate, html, signal } from '@c9up/aurora'

hydrate(
  document.getElementById('aurora-root'),
  () => Dashboard({ status }),
)
```

La factory **doit produire la même forme de `TemplateResult`** que celle rendue par le serveur — mêmes slots, même ordre. Aurora parcourt l'arbre SSR le long du chemin du template parsé ; un mismatch tombe en warning console mais la page reste fonctionnelle.

`auroraRoute()` est le handler de route bas niveau sous les mêmes primitives. Il
appelle `render(ctx)`, rend le résultat avec `renderToString`, enveloppe le
balisage dans `shell(body, entry)` et l'envoie en `text/html` :

```js
import { auroraRoute } from '@c9up/aurora'

router.get('/dashboard', auroraRoute({
  render: () => Dashboard({ status }),
  entry: '/dashboard.client.js',   // par défaut : '/aurora-client.js'
}))
```

Le shell par défaut est un document minimal avec une `<div id="aurora-root">`
autour du balisage et un `<script type="module" src="…">` pour `entry`. Il
n'apporte ni importmap ni données de page : le module `entry` est à servir par
vous, et il appelle `hydrate()` lui-même. Dans une application à contrôleurs,
`aurora.render()` / `ctx.aurora.render()` fait tout cela pour vous.

## Intégrer aurora dans les templates inker

Les îlots aurora fonctionnent dans un template serveur [Inker](/fr/guides/frontend/templates/) — aucun code de liaison ne vit dans l'un ou l'autre package, vous le câblez avec un seul helper. Inker émet le `SafeString` d'un helper verbatim, et `renderToString` d'aurora produit le HTML d'un composant côté serveur :

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

La factory client doit reproduire la même forme de `TemplateResult` que le serveur a rendue (même contrainte que l'hydratation de `aurora.render()`). Ne renvoyez un `SafeString` que depuis du markup que vous contrôlez — aurora échappe les interpolations `${}`, mais la chaîne enveloppante reste sous votre responsabilité.
