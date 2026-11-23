# Le lanceur de tests

Ce guide couvre le lanceur de tests helix :

- Ce qui fait échouer un run
- Timeouts
- Scripts package.json
- Diff coverage en monorepo

## Runner CLI (`helix test`)

```sh
helix test                       # un run
helix test app                   # ne lance que les tests sous ./app
helix test --watch               # re-run au changement
helix test --coverage            # couverture V8 + LCOV + seuils
helix test --diff-cov            # diff coverage vs `main`
helix test --tsx=false           # utilise le loader du parent (pas tsx)
```

### Ce qui fait échouer un run

Un run qui n'exécute rien n'est pas un succès. `helix test` sort en 1 quand
la découverte ne trouve aucun fichier de test, quand un chemin, un filtre
`--files` ou une suite nommée ne désigne rien — une sélection restreint le
run, elle ne s'élargit jamais à tout l'arbre — et quand un fichier ne déclare
aucun test. `--pass-with-no-tests` (ou `passWithNoTests` dans
`helix.config.ts`) accepte un run vide.

En CI (`CI` défini), un `.only` ou un `.pin()` fait échouer les tests qu'il
sélectionne au lieu de restreindre le run : oublié dans un commit, il ne peut
pas rendre le build vert. `--allow-only` (ou `allowOnly`) le laisse
restreindre malgré tout ; `--allow-only=false` l'interdit partout.

Une erreur que personne ne gère — une rejection flottante, un timer qui
lève — est une erreur de fichier, rapportée à côté des résultats du fichier,
sur les deux pools, y compris quand elle survient après que le fichier a
rendu son résultat. De même pour un worker qui sort avec un code que ses
résultats n'expliquent pas, et pour un teardown de runner (`api.cleanup`) qui
lève. Une assertion `.resolves` / `.rejects` que le test n'a pas attendue
fait échouer ce test.

Ce qu'un test affiche arrive au terminal quand son fichier se termine, sous
un en-tête `stdout | <fichier>` ou `stderr | <fichier>`, pour que des
fichiers en parallèle ne s'entremêlent pas. `--silent` le supprime ; avec
`--reporter=json`, il part sur stderr pour que stdout reste lisible en JSON.

### Timeouts

`--timeout` s'applique par test. Du plus fort au plus faible : le timeout du
test lui-même, `--timeout`, le `timeout` de la suite, `configure({ timeout })`
ou un plugin qui modifie `api.config.timeout`, le `timeout` du fichier de
config, puis 60 s. Les hooks `beforeEach` / `afterEach` et `test.setup` /
`test.teardown` tournent sous l'échéance de leur test et le font échouer, en
se nommant, s'ils restent bloqués.

Une échéance par fichier, distincte (`--file-timeout`, `fileTimeout`,
10 minutes par défaut), tue un worker bloqué là où aucun timeout de test
n'arrive, comme une boucle synchrone. Tuer un worker tue tout son groupe de
processus : ce que ses tests ont lancé ne lui survit pas. Un worker dont la CLI
meurt sans pouvoir nettoyer (SIGKILL, manque de mémoire) le remarque et sort
lui aussi avec son groupe de processus.

`helix test` fixe `NODE_ENV=test` avant de lire la config ou de lancer les
`runnerHooks` du bootstrap, et les suites résolvent leurs fichiers avant que
`runnerHooks.setup` ne tourne : un callback `files` qui lève ne laisse rien
d'installé.

### Scripts package.json

Utilisez le bin `helix` directement — dans les scripts npm il résout vers
`node_modules/.bin/helix`, qui amorce déjà le loader TS. **Inutile** d'écrire la
forme verbeuse `node --import tsx node_modules/@c9up/helix/bin/helix.js …` :

```json
{
  "scripts": {
    "test": "helix test app --threads=1",
    "test:coverage": "helix test app --threads=1 --coverage"
  }
}
```

`app` est le chemin des tests (ne lance que `./app`) ; `--threads=1` exécute en
série — à choisir quand une suite partage de l'état de process (ex. une seule DB
SQLite en mémoire, fake timers), à retirer pour paralléliser des suites indépendantes.

### Diff coverage en monorepo

`diffCoverage.cwd` défaut sur `coverage.root` et le runner accepte
toute direction où les deux chemins partagent une ascendance :

- `cwd` est un ancêtre de `root` (cas monorepo : `cwd` = racine git,
  `root` = `packages/foo/src`)
- `cwd` est un descendant de `root` (cas single-repo classique)
- `cwd === root`

Seuls les arbres **entièrement disjoints** sont refusés (sinon overlay
0 % silencieux).
