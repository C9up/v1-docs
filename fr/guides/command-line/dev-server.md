# Serveur de développement

Ce guide couvre le serveur de développement et le rechargement à chaud :

- Le serveur de développement
- Remplacement de module à chaud
- Ce que le navigateur apprend
- Assets
- Fichiers annexes

## Le serveur de développement

`ream dev` lance le serveur et ce qui construit les assets, sous un seul
Ctrl-C. Quand il écoute, il dit où :

```
╭─────────────────────────────────────────────╮
│                                             │
│    Server address: http://localhost:3333    │
│    Mode: HMR                                │
│    Ready in: 412 ms                         │
│    Press h to show help                     │
│                                             │
╰─────────────────────────────────────────────╯
```

C'est l'adresse **effectivement liée**, port compris — un serveur qui trouve
3333 occupé et prend 3334 annonce 3334. Un hôte `0.0.0.0` s'affiche
`localhost` : toutes-les-interfaces n'est pas un lien qui s'ouvre.

### Pendant qu'il tourne

| touche | |
|---|---|
| `r` | redémarrer le serveur |
| `c` | effacer la console |
| `o` | ouvrir l'adresse dans le navigateur |
| `h` | afficher cette liste |
| `Ctrl-C` / `Ctrl-D` | quitter |

`o` se demande au serveur et se fait par `ream dev` : l'application, qui
connaît le port qu'elle a pris, transmet l'adresse par un fichier que
`ream dev` nomme dans `REAM_DEV_OPEN`, et `ream dev` l'ouvre avec l'ouvreur de
la plateforme (`xdg-open`, `open`, `url.dll` sous Windows) — l'application ne
lance elle-même aucun processus.

Les touches demandent un terminal. `ream dev` lit celui dans lequel il tourne
et passe chaque touche au serveur par un pseudo-terminal propre au serveur :
le serveur y répond tout en restant hors du premier plan du terminal, et ne
peut donc jamais être stoppé pour l'avoir lu. Sans terminal en entrée — un
agent, la CI, une entrée venue d'un tube — ou avec `ream dev` passé en
arrière-plan, rien
n'est lu, aucun enfant ne reçoit de terminal, et le bandeau omet
`Press h to show help`. `c` n'efface l'écran que lorsque le serveur écrit
directement dans le terminal, c'est-à-dire sans commande d'assets à côté.

### Ce qu'un changement imprime

```
invalidated app/billing/InvoiceController.ts     ← échangé dans le process vivant
update start/services.ts                         ← le process a redémarré
```

Lequel des deux dépend de `hotHook.boundaries`, dans `package.json` :

```json
{
  "hotHook": {
    "boundaries": ["./app/controllers/**/*.ts", "./app/middleware/*.ts"],
    "restart": ["./config/*.ts"]
  }
}
```

Un module atteint via une **frontière** peut être échangé : celui qui l'importe
le fait dynamiquement et le redemandera, donc la requête suivante obtient le
nouveau code. Tout le reste — un fichier préchargé au boot, un provider,
`start/*.ts` — n'a personne pour le réimporter, donc le process redémarre. Ce
n'est pas un échec du rechargement à chaud : un fichier qui tourne une fois au
démarrage ne rejouerait pas ses effets de toute façon.

`restart` nomme ce qui redémarre toujours, quoi qu'en dise le graphe. Les
fichiers d'environnement y sont déjà.

Le terminal est effacé avant un redémarrage, pour que ce qui suit soit seul à
l'écran. `ream dev --no-clear` garde les logs précédents.

### Quand une sauvegarde ne fait rien

Si une modification ne change rien à l'écran, c'est que le fichier n'est pas
dans le graphe d'imports du process — rien ne l'a encore importé. Sauvegarder
un fichier que l'app n'a jamais chargé ne produit aucune ligne, c'est voulu.

### La barre de debug

Toute page HTML servie en développement porte une barre en bas. Une page qui
défile est décalée de la hauteur de la barre : rien en bas de la page ne se
retrouve dessous. Une page dont la coque remplit l'écran et défile à
l'intérieur (`h-screen` avec un élément intérieur qui défile) est laissée telle
quelle — la décaler ne ferait que faire défiler le document — et la hauteur de
la barre est disponible dans `--ream-toolbar-height` sur `<html>`, pour qu'une
telle coque lui laisse la place (`h-[calc(100vh-var(--ream-toolbar-height,0px))]`).
Chaque élément montre un résumé au survol et ouvre un panneau au clic :

| Élément | Sur la barre | Dans le panneau |
|---|---|---|
| request | statut, méthode, route | route, motif, contrôleur, paramètres, query string, corps, en-têtes, noms des cookies, session, utilisateur, statut et en-têtes de la réponse |
| time | durée totale | une timeline : la requête, chaque requête SQL, chaque ligne de log, chaque événement, chaque opération de cache |
| mem | tas utilisé | tas utilisé et total, mémoire résidente, croissance pendant la requête |
| db | requêtes SQL et leur durée totale | chaque requête avec ses paramètres, son modèle, sa méthode, sa connexion et son instant de départ ; doublons signalés et comptés, échecs en rouge ; filtre, plus lentes d'abord, copie |
| logs | erreurs, sinon avertissements, sinon lignes | chaque ligne avec son niveau et son contexte ; filtre par niveau et par texte |
| events | événements émis | chaque événement avec son contenu ; filtre par nom |
| cache | opérations et leur durée totale | hits (ceux servis en grâce à part), misses, écritures, suppressions, vidages et expirations ; un tableau par store quand il y en a plusieurs ; chaque opération avec sa clé, son store, sa durée, sa TTL et sa valeur ; filtre par clé ou par store |
| mail | messages | chaque événement `mail:*` avec son contenu |
| ajax | requêtes faites par la page | chaque `fetch` et `XMLHttpRequest` avec méthode, statut et durée ; un clic affiche son profil dans la barre |
| ream | version du framework | version de Node.js, environnement, plateforme, processus |

Les contenus sont bornés en profondeur et en taille, et la valeur de toute clé
qui désigne un secret (`password`, `token`, `authorization`, `cookie`,
`apiKey`…) est remplacée par `[redacted]`. Les cookies ne sont listés que par
leur nom.

La barre retient si elle est ouverte, le panneau affiché, sa hauteur (glisser le
bord du haut) et si elle est masquée (`✕`, puis le petit bouton `R` pour la
retrouver). `↗` ouvre le profil complet.

```
/__ream/profiler                 toutes les requêtes gardées, la plus récente d'abord
/__ream/profiler/<token>         une requête, tous les panneaux
```

Chaque réponse porte aussi son token dans un en-tête `X-Debug-Token` : c'est
ainsi que la barre suit les appels `fetch` de la page, et qu'un client qui n'est
pas une page — un appel d'API, un test — retrouve le profil de la requête qu'il
vient de faire.

La barre est un script et une feuille de style servis depuis
`/__ream/profiler/_assets/`, sans rien d'inline : une
`Content-Security-Policy` en `default-src 'self'` l'exécute et la met en forme.

Les 50 dernières requêtes sont gardées, en mémoire, et la barre n'est injectée
qu'en développement. Une réponse de production est octet pour octet ce que le
handler a produit.

#### Le panneau des requêtes SQL

Les requêtes arrivent au profiler sous forme d'événements `db:query` sur
l'émetteur de l'application. En développement, atlas rapporte chaque requête :
le panneau ne demande aucune configuration. Le flag `debug` d'une connexion ne
décide plus que de ce que `prettyPrintDebugQueries` affiche dans le terminal.
Une autre couche de données que atlas obtient le même panneau en émettant le
même événement.

#### Le panneau des logs

Les lignes de log arrivent de la même façon, en `log:line`. `@c9up/spectrum`
branche son propre registre sur l'émetteur quand le conteneur en expose un :
une application qui logue via `ctx.logger` a donc le panneau sans configuration.
Le panneau est absent d'une requête qui n'a rien logué.

#### Le panneau des événements

Chaque événement émis pendant la requête y figure, mails compris. Il est lu au
moment même de l'émission, donc chacun est rattaché à la requête qui l'a causé.
Les requêtes SQL, les lignes de log et les opérations de cache ont leurs propres
panneaux et n'y sont pas répétées.

#### Le panneau du cache

Les opérations de cache arrivent sous forme de `cache:hit`, `cache:miss`,
`cache:written`, `cache:deleted`, `cache:cleared` et `cache:expire` sur
l'émetteur de l'application. `@c9up/echo` les émet sur l'émetteur du conteneur :
une application sur echo a donc le panneau sans configuration. Le panneau est
absent d'une requête qui n'a pas touché au cache.

echo indique la durée de chaque opération (`duration`, en millisecondes) et,
pour une écriture, la durée de vie de l'entrée (`ttl`, en secondes, `null` si
elle n'expire pas). Un `getOrSet` qui rate compte le temps de sa factory dans
son miss, et son écriture à part : le total ne compte pas la factory deux fois.
Un autre cache obtient le même panneau en émettant les mêmes événements ; sans
`duration`, ses opérations sont comptées et listées, sans durée.

Les compteurs restent justes au-delà des 300 opérations que le panneau liste.
Une valeur en cache est bornée comme tout contenu, et une valeur stockée sous
une clé qui désigne un secret (`oauth:token:42`) s'affiche `[redacted]`.

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

Chaque processus reçoit son propre stdin : un tube que `ream dev` garde ouvert sans jamais y écrire, et qui se ferme quand `ream dev` se termine. Un watcher qui s'arrête à la fin de son entrée — c'est le cas de `tailwindcss --watch`, pour ne pas survivre à qui l'a lancé — continue de surveiller pendant toute la session, que `ream dev` tourne dans un terminal ou avec sa sortie envoyée dans un fichier, et s'arrête quand même de lui-même si `ream dev` est tué. Inutile d'ajouter `--watch=always`. Le terminal, lui, reste à `ream dev`.

`ream build` exécute les assets **d'abord** et s'arrête là s'ils échouent, plutôt que de livrer un dist avec une feuille de style périmée.

Les deux clés sont optionnelles : sans `assets`, `ream dev` et `ream build` se comportent exactement comme avant, le serveur gardant le terminal.

## Fichiers annexes

Traductions, gabarits de vue, signature d'e-mail : des fichiers qui appartiennent
à l'application et qu'aucun module n'importe. Rien ne pointe dessus, donc le
build n'a aucun moyen de savoir qu'ils existent — et sans qu'on le lui dise il
produit un `dist/` qui démarre puis ne les trouve pas.

Déclarez-les dans `reamrc.ts` :

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
  le fichier est réellement lu au démarrage et que vous courriez sinon après une
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
