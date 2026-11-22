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
- `isReamError(error, ...codes)`

`@c9up/ream` expose une petite famille de sous-classes d'`Exception` identifiées par un code `E_*`. Chacune se self-handle en réponse JSON structurée — un `throw new E_FORBIDDEN()` dans un handler arrive au client en 403 avec `{ error: { code: 'E_FORBIDDEN', message } }`, sans try/catch dans le contrôleur.

Pour les catalogues spécifiques aux modules (photon, atlas, container, pipeline), voir le [catalogue d'erreurs](/fr/reference/errors) dédié.

## Classe de base

### `Exception`

Parent de toutes les exceptions HTTP intégrées. Porte `status` + `code` et expose les hooks optionnels `handle(error, ctx)` et `report(error, ctx)` pour le self-handling et le logging custom.

```ts
import { Exception } from '@c9up/ream'

class PaymentFailed extends Exception {
  static override status = 402
  static override code = 'E_PAYMENT_FAILED'
}
```

## Codes intégrés

| Code | Statut | Throws | Notes |
|---|---|---|---|
| `E_HTTP_EXCEPTION` | configurable | `new E_HTTP_EXCEPTION(message, status)` | Erreur HTTP générique. Préférer une sous-classe spécifique quand elle existe. |
| `E_UNAUTHORIZED` | 401 | `new E_UNAUTHORIZED('Bearer token required')` | Self-handle vers `{ error: { code, message } }`. Message par défaut : `Authentication required`. |
| `E_FORBIDDEN` | 403 | `new E_FORBIDDEN('Insufficient permissions', ['admin'])` | `required: string[]` optionnel des rôles/permissions manquants, exposé dans le body de réponse. |
| `E_VALIDATION_ERROR` | 422 | `new E_VALIDATION_ERROR(errors)` | Le body de réponse est `{ errors }` directement (pas wrappé). `errors: unknown[]` est ce que ton validateur émet. |
| `E_ROUTE_NOT_FOUND` | 404 | lancé en interne par le router quand aucune route ne matche | Auto-émis ; tu ne l'instancies normalement pas. |
| `E_ROW_NOT_FOUND` | 404 | `new E_ROW_NOT_FOUND('User')` | À coupler avec un lookup côté service qui retourne `null`. Le nom de modèle optionnel est interpolé dans le message par défaut. |
| `E_UNKNOWN` | 500 | fallback pour les throws non-Exception attrapés par `ExceptionHandler` | Surface en 500 générique. |

## Utilisation

```ts
import { E_FORBIDDEN, E_UNAUTHORIZED, E_VALIDATION_ERROR } from '@c9up/ream'

router.post('/orders', async ({ auth, request }) => {
  if (!auth.user) throw new E_UNAUTHORIZED()
  if (!auth.user.roles.includes('staff')) {
    throw new E_FORBIDDEN('Staff only', ['staff'])
  }
  const parsed = OrderValidator.validate(await request.body())
  if (!parsed.valid) throw new E_VALIDATION_ERROR(parsed.errors)
  // …
})
```

## Self-handling vs `ExceptionHandler` global

Les exceptions intégrées surchargent `handle(error, ctx)` et bypassent donc le handler global. Tes propres sous-classes peuvent faire pareil :

```ts
class TenantSuspended extends Exception {
  static override status = 423
  static override code = 'E_TENANT_SUSPENDED'

  override handle(_error: this, ctx: HttpContext): void {
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
4. Hors mode debug, n'affiche le message de l'erreur que s'il est écrit pour le client : une `Exception` (quel que soit son statut), toute erreur de statut inférieur à 500, ou une erreur portant `expose: true`. Tout le reste — erreur de driver, erreur système Node comme `ECONNREFUSED`, `Error` simple — répond `An internal error occurred`, même avec un `code`. L'erreur levée garde son message pour `report()`.

## Reporting

Override `report(error, ctx)` sur une exception custom (ou sur une sous-classe d'`ExceptionHandler`) pour envoyer l'échec vers ta stack de monitoring. Le reporter par défaut log sur `stderr` et skip les statuts dans `ignoreStatuses` (défauts : `400`, `401`, `404`, `422`).

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
- Réserve `E_HTTP_EXCEPTION` aux codes one-off que tu ne prévois pas de typer. Pour tout ce que tu throw plus de deux fois, écris une sous-classe nommée.

## Gestion des erreurs

Utiliser les exceptions framework (`E_UNAUTHORIZED`, `E_FORBIDDEN`, etc.) et un handler central.

```ts
import { E_UNAUTHORIZED } from '@c9up/ream'

if (!token) {
  throw new E_UNAUTHORIZED('Bearer token required')
}
```

Règles :

- ne pas retourner d'erreur brute interne au client,
- logger le contexte utile sans fuite de secrets,
- mapper les erreurs métier vers des codes HTTP cohérents.

## `prettyPrintError(error)`

Formate une erreur survenue au démarrage pour le terminal et l'écrit dans `stderr`. Les instances de `ReamError` incluent un message structuré avec un indice et du contexte. Les instances `Error` ordinaires affichent le message et la trace de la pile.

```typescript
.start()
.catch((error) => {
  process.exitCode = 1
  prettyPrintError(error)
})
```

## `isReamError(error, ...codes)`

Teste en une fois qu'une valeur **est** une erreur du framework et qu'elle porte
l'un des codes attendus :

```typescript
import { isReamError } from '@c9up/ream'
import consoleApp from '@c9up/ream/services/console'

try {
  await consoleApp.exec('provision')
} catch (error) {
  if (isReamError(error, 'E_CONSOLE_MISSING_FLAG', 'E_CONSOLE_MISSING_ARGUMENT')) {
    console.error(error.hint)   // narrowing : `error` est une ReamError ici
    return
  }
  throw error
}
```

Sans code, il répond simplement « est-ce une `ReamError` ». Avec un ou
plusieurs, il vérifie aussi le code — et TypeScript restreint `error.code` au(x)
littéral(aux) demandé(s), donc une faute de frappe dans un code se voit à la
compilation.

C'est la forme que prend `instanceof MonErreur` dans Ream : le framework porte
**un** type d'erreur muni d'un code, parce qu'une erreur peut naître en Rust et
être reconstruite en TypeScript à la traversée de NAPI — ce qu'une classe par
code ne sait pas faire.

## Voir aussi
- [Catalogue d'erreurs](/fr/reference/errors) — Codes container, router, pipeline, photon
- [Middleware](/fr/guides/basics/middleware) — Là où naissent la plupart des exceptions
- [Démarrage rapide](/fr/start/tutorial) — Exemple bout en bout avec rejets de guard d'auth
