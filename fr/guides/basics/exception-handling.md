# Gestion des exceptions

Ce guide couvre les erreurs, leurs codes et leur signalement :

- Classe de base
- Codes intégrés
- Utilisation
- Self-handling vs `ExceptionHandler` global
- Reporting
- Conventions
- Gestion des erreurs
- `prettyPrintError(error)`
- Intercepter une erreur par son code

`@c9up/ream` expose ses erreurs dans un seul sac `errors` : une classe `Exception` par code `E_*`. Chacune porte son `status` et son `code`, et le gestionnaire d'exceptions en fait une réponse : un `throw new errors.E_AUTHORIZATION_FAILURE()` dans un handler arrive à un client JSON en 403 avec `{ error: { code: 'E_AUTHORIZATION_FAILURE', message: 'Access denied' } }`, sans try/catch dans le contrôleur.

Pour les catalogues spécifiques aux modules (photon, atlas, container, pipeline), voir le [catalogue d'erreurs](/fr/reference/errors) dédié.

## Classe de base

### `Exception`

Parent de toutes les erreurs du framework et de ses paquets (elle vient de `@c9up/flare`). Porte `status` + `code` (et `help`, un conseil pour corriger l'erreur), et le handler appelle les hooks optionnels `handle(error, ctx)` et `report(error, ctx)` pour le self-handling et le logging custom.

```ts
import { createError, Exception } from '@c9up/ream'

class PaymentFailed extends Exception {
  static override status = 402
  static override code = 'E_PAYMENT_FAILED'
}

// La même, en une ligne ; les valeurs des `%s` se passent en tableau.
const E_PLAN_LIMIT = createError<[string]>('The %s plan has no more seats', 'E_PLAN_LIMIT', 402)
throw new E_PLAN_LIMIT(['starter'])
```

## Codes intégrés

| Code | Statut | Throws | Notes |
|---|---|---|---|
| `E_HTTP_EXCEPTION` | configurable | `E_HTTP_EXCEPTION.invoke(body, status)` | Erreur HTTP générique qui porte le `body` de la réponse. Le message est le corps s'il est une chaîne, ou le `message` d'un corps objet. Préférez une sous-classe spécifique quand elle existe. |
| `E_HTTP_REQUEST_ABORTED` | configurable (400) | `response.abort(body, status?)` | Étend `E_HTTP_EXCEPTION` et en porte le code. Se self-handle : envoie `body` avec `status`. |
| `E_UNAUTHORIZED_ACCESS` | 401 | `new E_UNAUTHORIZED_ACCESS()` | Levée par le garde `.auth()` d'une route. Message : `Unauthorized access`, comme `@c9up/warden` la lève. Se rend elle-même (`handle`) comme celle de warden : `401 { error: { code, message } }`. |
| `E_AUTHORIZATION_FAILURE` | 403 | `new E_AUTHORIZATION_FAILURE()` | Levée par le `.role()` / `.permission()` d'une route. Message : `Access denied`, comme `@c9up/warden` la lève. Se rend elle-même (`handle`) comme celle de warden : `{ errors: [{ message }] }` en JSON, le message en texte pour du HTML, un formulaire refusé redirigé vers la page précédente avec un flash. Les rôles et permissions demandés ne sont pas envoyés. |
| `E_VALIDATION_ERROR` | 422 | `new E_VALIDATION_ERROR(messages)` | Message `Validation failure`. Le body de réponse est `{ errors: messages }` directement (pas wrappé). `messages: unknown[]` est ce que votre validateur émet. |
| `E_ROUTE_NOT_FOUND` | 404 | lancé en interne quand aucune route ne correspond | Message `Cannot GET:/chemin`. Auto-émis ; vous ne l'instanciez normalement pas. |
| `E_ROW_NOT_FOUND` | 404 | `new errors.E_ROW_NOT_FOUND(User)` (de `@c9up/atlas`) | À coupler avec un lookup côté service qui retourne `null`. La classe du modèle est dans `model` ; le message reste `Row not found`, ce qui était cherché n'atteint donc jamais le client. |
| `E_UNKNOWN` | 500 | fallback pour les throws non-Exception attrapés par `ExceptionHandler` | Surface en 500 générique. |

## Utilisation

```ts
import { errors } from '@c9up/ream'

router.post('/orders', async ({ auth, request }) => {
  if (!auth.user) throw new errors.E_UNAUTHORIZED_ACCESS()
  if (!auth.user.roles.includes('staff')) {
    throw new errors.E_AUTHORIZATION_FAILURE()
  }
  const parsed = OrderValidator.validate(await request.body())
  if (!parsed.valid) throw new errors.E_VALIDATION_ERROR(parsed.errors)
  // …
})
```

## Self-handling vs `ExceptionHandler` global

Une exception qui définit `handle(error, ctx)` contourne le handler global : c'est le cas d'`E_HTTP_REQUEST_ABORTED`, qui envoie le corps donné à `response.abort()`. Vos propres sous-classes peuvent faire pareil :

```ts
class TenantSuspended extends Exception {
  static override status = 423
  static override code = 'E_TENANT_SUSPENDED'

  handle(_error: this, ctx: HttpContext): void {
    ctx.response.status(423).json({
      error: { code: this.code, message: this.message, supportUrl: '/help/billing' },
    })
  }
}
```

Quand une exception ne définit PAS `handle`, `ExceptionHandler.handle()` (le handler global enregistré via `server.errorHandler(...)`) prend le relais. Il :

1. Détermine la forme de réponse voulue par content negotiation (`Accept: application/json` → JSON, sinon page HTML minimale).
2. Récupère `status` + `code` depuis l'instance `Exception` (ou défaut `500` / `E_UNKNOWN`).
3. Inclut une stack trace dans le body JSON si `debug: true`.
4. Hors mode debug, n'affiche le message de l'erreur que s'il est écrit pour le client : une erreur de statut inférieur à 500, ou une erreur portant `expose: true`. Tout le reste répond `An internal error occurred`, même avec un `code` : erreur de driver, erreur système Node comme `ECONNREFUSED`, `Error` simple, et `Exception` de statut 500. Être une `Exception` ne suffit pas, car chaque paquet lève des `Exception`, de statut 500 par défaut, dont les messages nomment des hôtes, des chemins et des requêtes. L'erreur levée garde son message pour `report()`.

### Où l'erreur est traitée

Le gestionnaire s'exécute là où l'erreur est levée, dans la chaîne de middlewares, et non une fois toute la chaîne déroulée. Les middlewares autour finissent ensuite normalement : le middleware de session enregistre la session, donc un `handle()` qui met un message en flash et redirige en arrière fonctionne comme prévu, et un en-tête posé après `await next()` s'ajoute à la réponse d'erreur.

### Afficher le message d'une erreur 5xx

Pour montrer au client le message d'une erreur 5xx, posez `expose = true` sur elle :

```ts
class ProviderDown extends Exception {
  static override status = 503
  static override code = 'E_PROVIDER_DOWN'
  expose = true
}

throw new ProviderDown('Payments are paused, retry in a few minutes')
```

Ne le faites que pour un message écrit pour le client : il est affiché tel quel.

## Reporting

Surchargez `report(error, ctx)` sur une exception custom (ou sur une sous-classe d'`ExceptionHandler`) pour envoyer l'échec vers votre stack de monitoring. Le reporter par défaut log sur `stderr` et skip les statuts dans `ignoreStatuses` (défauts : `400`, `401`, `404`, `422`).

```ts
class Handler extends ExceptionHandler {
  protected override ignoreStatuses = [400, 404, 422]

  override async report(error: unknown, ctx: HttpContext) {
    if (error instanceof Exception && this.ignoreStatuses.includes(error.status)) return
    sentry.captureException(error, { user: { id: ctx.auth.user?.id } })
  }
}
```

## Conventions

- Ne jamais laisser fuiter une stack trace interne en production. Mettre `ExceptionHandler.debug = false` (ou tester `app.inProduction`).
- Mapper les erreurs métier vers des statuts HTTP au plus tôt — un service qui throw `E_ROW_NOT_FOUND` est plus clair qu'un service qui retourne `null` et oblige chaque appelant à se rappeler du 404.
- Réservez `E_HTTP_EXCEPTION` aux codes one-off que vous ne prévoyez pas de typer. Pour tout ce que vous levez plus de deux fois, écrivez une sous-classe nommée.

## Gestion des erreurs

Utilisez les exceptions framework (`E_UNAUTHORIZED_ACCESS`, `E_AUTHORIZATION_FAILURE`, etc.) et un handler central.

```ts
import { errors } from '@c9up/ream'

if (!token) {
  throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
}
```

Règles :

- ne pas retourner d'erreur brute interne au client,
- logger le contexte utile sans fuite de secrets,
- mapper les erreurs métier vers des codes HTTP cohérents.

## `prettyPrintError(error)`

Formate une erreur survenue au démarrage pour le terminal et l'écrit dans `stderr`. Une erreur du framework (l'une des `errors`) s'affiche dans un cadre avec son code, son conseil (`help`) et le lien vers sa documentation. Toute autre erreur affiche le message et la trace de la pile.

```typescript
.start()
.catch((error) => {
  process.exitCode = 1
  prettyPrintError(error)
})
```

## Intercepter une erreur par son code

Chaque erreur du framework et de ses paquets est une classe `Exception` nommée
d'après son code, dans le `errors` du paquet. Testez la classe, ou le code :

```typescript
import { errors } from '@c9up/ream'
import consoleApp from '@c9up/ream/services/console'

try {
  await consoleApp.exec('provision')
} catch (error) {
  if (
    error instanceof errors.E_CONSOLE_MISSING_FLAG ||
    error instanceof errors.E_CONSOLE_MISSING_ARGUMENT
  ) {
    console.error(error.help)
    return
  }
  throw error
}
```

`instanceof` restreint le type de `error` : `help` et les champs propres à
l'erreur sont typés. `error.code` est la même chaîne que le nom de la classe :
testez-le là où vous ne voulez pas importer le paquet qui a levé l'erreur.

## Voir aussi
- [Catalogue d'erreurs](/fr/reference/errors) — Codes container, router, pipeline, photon
- [Middleware](/fr/guides/basics/middleware) — Là où naissent la plupart des exceptions
- [Démarrage rapide](/fr/start/tutorial) — Exemple bout en bout avec rejets de guard d'auth
