# ream-cli

`@c9up/ream-cli` est la CLI native (Rust) de l'écosystème.

## Capacités

- création de projet (`new`, `template`)
- dev/build/start/test, et un `repl` avec l'application démarrée
- génération de code (`make:*`), avec des stubs par projet (`stubs:publish`)
- les commandes de l'application : tout nom que le binaire ne définit pas est
  transmis à son noyau console, et `list` montre les deux ensembles comme un seul
- diagnostics (`doctor`, `info`, `inspect`)
- installation de paquets (`add`, `configure`), génération de clé
  (`generate:key`), enregistrement MCP (`mcp`)

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
- **`web`** — le squelette api plus un kit d'auth session/cookie pré-câblé. Une app `web` fraîche démarre authentifiée par cookie d'emblée :
  - un kernel enchaînant blackhole (CSRF signé + en-têtes de sécurité) → body parser → `SessionMiddleware` cookie → middleware d'auth ;
  - `config/auth.ts` par défaut sur la stratégie session (`defaultStrategy: 'session'`, avec un `findUser` en stub TODO) ;
  - `config/blackhole.ts` avec le CSRF signé activé (`secret` lu depuis `APP_KEY`) ;
  - `app/middleware/auth_middleware.ts` qui peuple `ctx.auth` depuis `ctx.session` ;
  - les providers reamrc sigil + warden + blackhole ;
  - une `APP_KEY` fraîchement générée dans `.env` — chaque app créée reçoit la sienne, jamais un placeholder partagé — et un alias d'import `#middleware/*`.
- **`microservice`** / **`slim`** — légers, sans kit HTTP d'auth.

## Notes

- démarrage très rapide (binaire natif)
- la surface complète et toujours à jour est `ream --help` ; la référence est
  [la page CLI](/fr/cli/ream)

## Assets

`ream dev` lance le serveur et ce qui construit vos assets comme un tout, et `ream build` construit les assets avant TypeScript. Déclarez-les dans `reamrc.ts` :

```ts
export default {
  assets: {
    devServer: { command: 'pnpm', args: ['css:watch'] },
    build: { command: 'pnpm', args: ['css'] },
  },
}
```

Chaque flux est préfixé ligne par ligne, et l'arrêt de l'un arrête l'autre — un Ctrl-C ne laisse aucun watcher orphelin en train d'écrire dans le fichier de sortie, et une commande qui ne démarre pas emporte celle qui avait déjà démarré. C'est ce qui évite à une application de câbler elle-même `concurrently -k`.

`ream build` exécute les assets **d'abord** et s'arrête là s'ils échouent, plutôt que de livrer un dist avec une feuille de style périmée.

Les deux clés sont optionnelles : sans `assets`, `ream dev` et `ream build` se comportent exactement comme avant, le serveur gardant le terminal.
