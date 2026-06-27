# ream-cli

`@c9up/ream-cli` est la CLI native (Rust) de l'ecosysteme.

## Capacites

- scaffolding projet
- commandes de dev/build/start
- generation de code (`make:*`)
- diagnostics (`doctor`, `info`)
- configuration de packages (`ream configure`)

## Exemple

```bash
ream new my-app
ream dev
ream make:controller order Order
ream doctor
```

## Templates

`ream new` demande un template. `web` et `api` diffèrent désormais réellement :

- **`api`** — minimal : point d'entrée serveur, une route racine, un kernel de timing. Pas d'auth.
- **`web`** — le squelette api plus un kit d'auth session/cookie pré-câblé (parité web-kit AdonisJS). Une app `web` fraîche démarre authentifiée par cookie d'emblée :
  - un kernel enchaînant blackhole (CSRF signé + en-têtes de sécurité) → body parser → `SessionMiddleware` cookie → middleware d'auth ;
  - `config/auth.ts` par défaut sur la stratégie session (`defaultStrategy: 'session'`, avec un `findUser` en stub TODO) ;
  - `config/blackhole.ts` avec le CSRF signé activé (`secret` lu depuis `APP_KEY`) ;
  - `app/middleware/auth_middleware.ts` qui peuple `ctx.auth` depuis `ctx.session` ;
  - les providers reamrc sigil + warden + blackhole ;
  - `APP_KEY` dans `.env` (placeholder — mets un secret unique de 32+ octets par app/environnement) et un alias d'import `#middleware/*`.
- **`microservice`** / **`slim`** — légers, sans kit HTTP d'auth.

## Notes

- startup tres rapide (binaire natif)
- surface de commande en evolution continue
