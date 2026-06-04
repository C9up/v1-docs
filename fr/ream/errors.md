# Exceptions HTTP

`@c9up/ream` expose une petite famille de sous-classes d'`Exception` identifiées par un code `E_*`. Chacune se self-handle en réponse JSON structurée — un `throw new E_FORBIDDEN()` dans un handler arrive au client en 403 avec `{ error: { code: 'E_FORBIDDEN', message } }`, sans try/catch dans le contrôleur.

Pour les catalogues spécifiques aux modules (photon, atlas, container, pipeline), voir le [catalogue d'erreurs](/fr/errors/) dédié.

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

## Voir aussi

- [Catalogue d'erreurs](/fr/errors/) — Codes container, router, pipeline, photon
- [Middleware](/fr/guide/middleware) — Là où naissent la plupart des exceptions
- [Démarrage rapide](/fr/guide/quick-start) — Exemple bout en bout avec rejets de guard d'auth
