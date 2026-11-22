# Lancer et tester

Ce guide couvre le lancement et le test d'une application depuis la CLI :

- Ce que fait `ream build`
- Lancer la sortie du build
- Filtrer une exécution
- Couverture

## Lancer et tester

```bash
ream dev            # le serveur et ce qui construit les assets, sous un seul Ctrl-C
ream build          # les assets d'abord, puis TypeScript
ream build --ignore-ts-errors           # garder et terminer la sortie malgré les erreurs de types
ream build --tsconfig tsconfig.build.json
ream start          # node dist/bin/server.js
ream test           # les suites déclarées dans reamrc.ts
ream test unit --bail --reporters spec,json --threads 4
ream repl           # un REPL Node avec l'app démarrée : `app`, `container`, `await resolve(token)`
ream inspect        # routes, providers, liaisons du conteneur
```

### Ce que fait `ream build`

Le dossier de sortie est vidé, le pipeline d'assets déclaré dans `reamrc.ts`
tourne, le `tsc` du projet compile (`node_modules/.bin`, jusqu'à la racine d'un
workspace, puis `PATH` — jamais un téléchargement), puis le manifeste, le lockfile et ce que `metaFiles`
désigne sont copiés à côté de la sortie. Cette dernière étape n'est pas du
confort : `dist/reamrc.js` importe `#providers/AppProvider.js`, et Node résout
un spécifier `#` contre le `package.json` qui gouverne le fichier importateur —
sans lui dans `dist/`, il remonte jusqu'à celui du projet, dont la map pointe
sur les sources TypeScript.

Vidé **en premier**, parce que `tsc` écrase ce qu'il émet mais n'enlève jamais
ce qu'il n'émet plus : un module renommé ou supprimé laissait son ancien `.js`
derrière lui, et le `ream start` suivant continuait de l'importer. Un build qui
échoue au typage emporte sa propre sortie, pour qu'il n'y ait rien de
à-moitié-compilé à démarrer par erreur — sauf si `--ignore-ts-errors` demande
de la garder.

Rien n'est strippé. La surface réservée au développement — le client de reload,
la barre de debug, les routes du profiler — est conditionnée à `NODE_ENV` à
l'exécution, pas à la compilation : ce qui décide, c'est la façon de démarrer le
process, pas la façon dont il a été buildé. Une application buildée lancée en
`NODE_ENV=development` affiche la barre ; avec `NODE_ENV` absent ou autre chose,
la réponse est octet pour octet ce que le handler a produit.

### Lancer la sortie du build

La sortie du build est une racine d'application à part entière, et c'est ce
dossier qu'un déploiement embarque. Depuis ce dossier, `ream start` lance son
`bin/server.js`, et toute autre commande passe par son `bin/console.js` compilé,
avec `node` seul, sans le chargeur TypeScript qu'une installation de production
n'a pas :

```bash
cd dist
ream start              # node bin/server.js
ream migration:status   # node bin/console.js migration:status
```

Sous Linux et macOS, `ream` ne reste pas entre vous et node : `start`, une
commande de l'application, `test`, `repl` et `inspect` cèdent le processus à
node (`exec`). Un `docker stop`, un `kill -TERM`, un `timeout 600 ream test` ou
un terminal fermé atteint donc le serveur, le worker de file ou le run de tests
lui-même, qui s'arrête par ses propres hooks, et `ream` se termine avec le code
de sortie de node. Sous Windows, node tourne comme enfant, comme avant.

`ream test` lit ses suites dans le fichier rc et les passe au runner : les noms
de suites et leurs globs vivent donc à un seul endroit, pas dans un script. Un
projet `api` ou `web` frais les a déjà : une suite `unit`, une suite
`functional`, `tests/bootstrap.ts` et un premier test. Seule `functional` démarre
un serveur — c'est ce que fait son hook de suite, donc un fichier unitaire ne le
paie pas.

### Filtrer une exécution

```bash
ream test --files=tests/functional/root.test.ts
ream test --tests="renders the home page" --groups=Users
ream test --tags=@slow --tags=~@flaky
ream test --failed                    # seulement ce qui a échoué la dernière fois
ream test unit --timeout=5000 --retries=2
ream test --watch                     # relance à chaque changement ; --poll, --no-clear
```

`--files`, `--tests`, `--groups` et `--tags` se répètent pour plusieurs valeurs ;
une valeur n'est jamais découpée sur ses virgules, un titre de test peut donc en
contenir une.

### Couverture

```bash
ream test --coverage
ream test unit --coverage --coverage-reporters=text-summary,lcov --coverage-dir=coverage
ream test --coverage --coverage-thresholds='{"lines":80,"functions":75}'
ream test --coverage --coverage-include='app/**/*.ts' --coverage-exclude='app/**/*.stub.ts'
```

La couverture appartient au runner ; le CLI ne fait que nommer les drapeaux et
transmettre les valeurs, comme il transmet `--threads`. V8 enregistre ce que le
run a exécuté : rien n'a besoin d'être instrumenté au préalable.

Ce qui est mesuré, quand le run ne nomme rien, c'est l'arborescence de
l'application — `app/`, `start/`, `config/`, `commands/`, `database/`, plus
`src/` pour un paquet piloté par la même commande. Le défaut du runner est
`src/` seul, qu'une application n'a pas : tel quel, chaque run imprimerait un
rapport sur zéro fichier. `--coverage-include` remplace cette liste, il ne s'y
ajoute pas.

`--coverage-thresholds` prend un objet JSON et fait échouer le run quand une
métrique passe dessous — le code de sortie est celui du run, la CI n'a donc rien
à ajouter. Un drapeau `--coverage-*` donné sans `--coverage` est refusé plutôt
qu'ignoré : il ne collecterait rien, et un run vert avec un rapport vide est le
mode de panne qui mérite d'être nommé.
