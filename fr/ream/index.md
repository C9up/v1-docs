# Ream Core

Cette section documente le noyau `@c9up/ream` en mode reference pratique.

## Parcours recommande

1. [Ignitor et bootstrap](/fr/ream/ignitor)
2. [Lifecycle applicatif](/fr/ream/lifecycle)
3. [Container IoC](/fr/ream/ioc-container)
4. [HTTP kernel et routing](/fr/ream/http-kernel)
5. [Erreurs et exception handling](/fr/ream/errors)
6. [Securite et operations](/fr/ream/security-ops)

## Positionnement

- Ream orchestre les modules agnostiques.
- Le core fixe les conventions framework (providers, lifecycle, middleware).
- La surface reste en evolution, avec convergence vers une DX type Adonis/Laravel.

## Contexte HTTP

### Logger par requête — `ctx.logger`

Chaque contexte de requête porte `ctx.logger`, un logger scopé à cette requête. Il
résout le binding `'logger'` du container (un logger `@c9up/spectrum`) en tant
qu'enfant scopé à l'id de la requête, si bien que chaque ligne est corrélée à la
requête ; en l'absence de logger enregistré, il retombe sur `console`. La signature
est **message-first** :

```ts
router.get('/orders/:id', async (ctx) => {
  ctx.logger.info('saved', { id: ctx.params.id })
})
```

### Accès ambiant — `HttpContext.get()` / `getOrFail()`

`HttpContext` expose le contexte de requête courant via `AsyncLocalStorage`, si bien
que n'importe quel code, n'importe où dans la pile d'appels, peut l'atteindre sans
faire transiter `ctx` à travers chaque fonction (parité AdonisJS).

```ts
import { HttpContext } from '@c9up/ream'

const ctx = HttpContext.get()        // contexte courant, ou undefined hors requête
const ctx2 = HttpContext.getOrFail() // lève si appelé hors d'une requête
```

`get()` retourne `undefined` hors d'une requête ; `getOrFail()` lève — à utiliser
quand un contexte de requête est requis.

### Session de requête — `ctx.session`

Quand `SessionMiddleware` est enregistré, la session de requête est exposée en
propriété top-level `ctx.session` (parité AdonisJS) — `ctx.session.get()` /
`.put()` / `.forget()` / `.regenerate()`. Elle est top-level pour que les
consommateurs et la session guard de Warden lisent `ctx.session` directement
plutôt que de la pêcher dans `ctx.store`. Vaut `undefined` si aucun middleware de
session n'a tourné.
