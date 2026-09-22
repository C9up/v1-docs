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

## Remplacement de module à chaud

`ream dev` remplace un module modifié dans le processus vivant au lieu de le
redémarrer. Éditer un contrôleur ne rejoue plus tout le démarrage — providers,
connexions, config — pour reprendre une seule fonction, et la page ouverte dans
le navigateur se recharge d'elle-même.

C'est actif dès que l'application a `hot-hook` installé ; un projet qui ne l'a
pas garde exactement le comportement précédent, un redémarrage à chaque
changement :

```bash
pnpm add -D hot-hook
```

Puis on déclare ce qui peut être échangé, dans `package.json` :

```json
{
  "hotHook": {
    "boundaries": [
      "./app/controllers/**/*.ts",
      "./app/middleware/*.ts"
    ]
  }
}
```

`ream new` écrit les deux pour vous.

Sur une structure modulaire — un répertoire par contexte — les globs désignent
les deux mêmes choses à travers elle :

```json
{
  "hotHook": {
    "boundaries": [
      "./app/modules/*/controllers/*.ts",
      "./app/modules/*/middleware/*.ts"
    ]
  }
}
```

### Vos routes doivent importer paresseusement

C'est l'étape qui décide si tout ce qui précède sert à quelque chose, et on
l'oublie facilement parce que rien n'échoue quand on la saute.

```ts
// Redémarre à chaque sauvegarde : le contrôleur fait partie du graphe du
// fichier de routes lui-même.
import CommentController from './controllers/CommentController.js'
router.post('/comments', [CommentController, 'create'])

// Échangeable : le contrôleur n'est atteint qu'à l'arrivée d'une requête.
router.post('/comments', [() => import('./controllers/CommentController.js'), 'create'])
```

Le routeur accepte les deux formes depuis toujours. Même chose pour les
middlewares : `kernel.use()` prend `() => import('#modules/x/middleware/Y.js')`.

**Les frontières désignent des modules d'entrée, et rien d'autre.** Un module
n'est échangeable que s'il est atteint par un import *dynamique*. Un fichier qui
correspond à une frontière et qu'on importe statiquement quelque part est
signalé `shouldBeReloadable` et force un redémarrage **complet** — un glob `**`
assez large pour attraper aussi les services et les entités qu'une entrée
importe fait donc redémarrer le serveur à chaque changement, et cela ressemble
exactement à un rechargement à chaud cassé.

### Distinguer un échange d'un redémarrage

Un redémarrage affiche aussi votre modification : voir la page changer ne prouve
donc rien. Le seul test qui les sépare est l'identifiant du processus :

```bash
pgrep -f bin/server.ts     # notez-le, modifiez un contrôleur, relancez-le
```

Même identifiant et sortie changée : le module a été échangé. Nouvel
identifiant : le serveur a redémarré, et quelque chose au-dessus n'est pas
encore en place.

Un changement hors des frontières — un fichier de routes, un provider, `.env` —
redémarre le serveur, et c'est normal : ces fichiers sont lus une fois, pendant
l'assemblage de l'application.

### Ce que fait le navigateur

Les pages servies en développement portent un petit script qui les recharge
quand le serveur change dessous : un module échangé sur place, ou un
redémarrage. Il scrute un jeton plutôt que de tenir une socket, donc un
redémarrage se détecte au changement du jeton et non à une connexion qu'il
faudrait rétablir.

Rien n'est injecté hors développement, et le script porte le nonce CSP de la
requête : une application avec une politique à nonce n'a aucune exception à
prévoir pour lui.

## Ce que le navigateur apprend

Le serveur de développement injecte un petit script dans les réponses HTML et
lui pousse les changements en Server-Sent Events. Un swap à chaud ou un
redémarrage fait bouger un jeton, la page voit le nouveau et se recharge.

Upstream obtient ça du websocket de Vite, et sans Vite il n'obtient rien : son
assembler écrit `invalidated <fichier>` dans le terminal et le navigateur n'est
jamais prévenu. Ici aucun bundler n'est nécessaire, le serveur parle déjà SSE.

Le flux répond AVANT tout middleware applicatif. C'est de la plomberie de
framework, son contenu ne dépend d'aucun utilisateur, d'aucune session et
d'aucun corps de requête, et une application est libre de mettre son
authentification dans `server.use([...])` — beaucoup le font, puisqu'elle doit
tourner avant le routage. Derrière cette pile, le point d'entrée payait tout le
pipeline à chaque message.

Il recharge sur un CHANGEMENT de jeton, jamais sur une connexion coupée : un
serveur qui redémarre est injoignable un instant, et recharger à ce
moment-là affiche la page d'erreur du navigateur. `EventSource` se reconnecte
tout seul, et le serveur salue la nouvelle connexion avec son jeton — après un
redémarrage, un identifiant de démarrage différent, donc le rechargement a lieu
quand le serveur peut réellement servir.

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

## Fichiers annexes

Traductions, gabarits de vue, signature d'e-mail : des fichiers qui appartiennent
à l'application et qu'aucun module n'importe. Rien ne pointe dessus, donc le
build n'a aucun moyen de savoir qu'ils existent — et sans qu'on le lui dise il
produit un `dist/` qui démarre puis ne les trouve pas.

Déclare-les dans `reamrc.ts` :

```ts
export default {
  metaFiles: [
    { pattern: 'resources/lang/**/*.{json,yaml,yml}', reloadServer: false },
    { pattern: 'resources/views/**/*.edge', reloadServer: false },
  ],
}
```

`ream build` copie chaque correspondance dans la sortie en conservant son
chemin : un loader configuré sur `../resources/lang/` le trouve depuis `dist/`
parce que `resources/lang/fr.json` a atterri sur `dist/resources/lang/fr.json`.

`reloadServer` décide de ce qu'une modification déclenche en DÉVELOPPEMENT, et
c'est la valeur par défaut qui est intéressante :

- **`false`** — le fichier est livré, et une modification ne fait rien. C'est ce
  que veulent les traductions : elles sont lues une fois au démarrage, donc le
  changement est visible au prochain lancement.
- **`true`** — le serveur de développement redémarre. À demander seulement quand
  le fichier est réellement lu au démarrage et que tu courrais sinon après une
  valeur périmée.

Le drapeau est exigé à chaque appel plutôt que défaillé : savoir si une
modification coûte un redémarrage est toute la décision que l'entrée existe pour
consigner.

Un paquet inscrit les siens depuis `configure()`, si bien qu'une application qui
l'installe obtient l'entrée sans l'écrire :

```ts
await codemods.addMetaFile('resources/lang/**/*.{json,yaml,yml}', false)
```

Le dialecte de glob est celui que les frontières de rechargement à chaud
utilisent déjà — `*` dans un segment, `**` à travers les segments, `?` pour un
caractère — plus l'alternance `{a,b}`. La CLI et le loader de développement
l'interprètent avec les mêmes règles, de sorte qu'une entrée ne peut pas être
copiée au build et ne jamais se déclencher en développement.
