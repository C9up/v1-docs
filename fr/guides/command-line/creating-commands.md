# Créer des commandes

Ce guide couvre l'écriture d'une commande console :

- Créer une commande
- Arguments et flags
- Options de commande
- Injection de dépendances
- Sortie et interaction
- Cycle de vie d'une commande
- Transformer une entrée : `parse()`
- `this.parsed`
- Flags globaux
- Commandes longues : `terminate()`
- Alias de commandes
- Aide longue d'une commande
- Couleurs

La console de Ream. Une commande est une classe, ses entrées
sont déclarées, et le CLI la lance directement :

```bash
ream provision --email hugo@exemple.ch --name "Hugo Dubois"
```

Pas de `pnpm exec tsx bin/mon-script.ts` : toute commande inconnue de `ream`
est transmise au noyau console de l'application.

## Créer une commande

```bash
ream make:command provision
```

Cela écrit `commands/provision.ts`. Rien à enregistrer : le dossier `commands/`
est découvert automatiquement, sous-dossiers compris. Les fichiers préfixés
d'un `_` sont ignorés (ce sont des helpers, pas des commandes).

```ts
import { BaseCommand, args, flags } from '@c9up/ream/console'
import type { CommandOptions } from '@c9up/ream/console'

export default class Provision extends BaseCommand {
  static commandName = 'provision'
  static description = 'Crée le compte propriétaire'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Adresse e-mail du propriétaire', required: true })
  declare email: string

  @flags.string({ default: 'Owner' })
  declare name: string

  async run(): Promise<void> {
    const users = await this.app.container.resolve('users')
    await users.createOwner({ email: this.email, name: this.name })
    this.logger.success(`Propriétaire créé : ${this.email}`)
  }
}
```

## Arguments et flags

Les décorateurs déclarent les entrées ; le noyau parse, type et valide avant
d'appeler `run()`.

| Décorateur | Ligne de commande |
| --- | --- |
| `@args.string()` | positionnel : `ream greet Hugo` |
| `@args.spread()` | tout le reste : `ream greet a b c` (à déclarer en dernier) |
| `@flags.string()` | `--email x`, `--email=x` |
| `@flags.boolean()` | `--force`, `--no-force`, `-f` |
| `@flags.number()` | `--batch 2` (une valeur non numérique est rejetée) |
| `@flags.array()` | `--tag a --tag b` → `['a', 'b']` |

Options communes : `argumentName` / `flagName` (le nom affiché, par défaut le
nom de propriété en tirets), `description`, `default`, `required`, `alias` pour
les raccourcis à une lettre, et `parse` pour transformer la valeur.

Un booléen est toujours négable (`--no-force`) ; `showNegatedVariantInHelp: true`
décide seulement si l'aide le mentionne.

Ce qui est validé pour vous : argument requis manquant, flag requis manquant,
valeur absente après un flag qui en attend une, valeur non numérique, et flag
inconnu — avec la liste des flags acceptés. `--` arrête l'analyse : tout ce qui
suit est positionnel.

## Options de commande

```ts
static options: CommandOptions = { startApp: true }
```

| Option | Effet |
| --- | --- |
| `startApp` | Boote l'application (providers, conteneur, base) avant `run()`. **Faux par défaut** : une commande qui n'écrit que des fichiers n'a pas à ouvrir une connexion. Lire `this.app` sans l'avoir demandé lève une erreur qui nomme le correctif. |
| `staysAlive` | Garde le process en vie après `run()` (worker, watcher). |
| `allowUnknownFlags` | Accepte les flags non déclarés au lieu de les refuser. |
| `drivesMigrations` | Cette commande EST le passage des migrations, donc le boot ne doit pas le faire à sa place. Pose `REAM_SKIP_BOOT_MIGRATE=1` avant le démarrage de l'application, ce qu'un paquet de données guette. Sans ça, un paquet qui migre au boot pour la commodité de `dev` applique tout juste avant que la commande ne tourne — `migrate` n'a plus rien à signaler, et `migrate:status`, à qui on demandait seulement de regarder, a modifié le schéma sur lequel il rapporte. |

## Injection de dépendances

Une commande qui déclare `startApp: true` est construite **par le conteneur**.
Les dépendances peuvent être injectées dans les méthodes du cycle de vie :

```ts
export default class Notify extends BaseCommand {
  static commandName = 'notify'
  static description = 'Prévient les propriétaires'
  static options: CommandOptions = { startApp: true }

  async prepare(@Inject('reporter') reporter: Reporter): Promise<void> {}

  async run(@Inject('users') users: UserService): Promise<void> {
    for (const owner of await users.owners()) {
      this.logger.info(owner.email)
    }
  }
}
```

L'injection dans le constructeur fonctionne aussi :

```ts
constructor(@Inject('mailer') private mailer: Mailer) {
  super()
}
```

Chaque exécution obtient sa propre instance : deux `consoleApp.exec()` ne partagent
aucun état.

Sans `startApp`, il n'y a pas de conteneur : la commande est construite
directement et ses méthodes appelées telles quelles. C'est le cas d'un
générateur, qui n'a besoin de rien d'autre que du disque.

## Sortie et interaction

`this.logger` : `info`, `success`, `warning`, `error`, `fatal`, `debug` (actif
si `DEBUG` est défini), `log`. Les niveaux d'alerte écrivent sur stderr pour que
la sortie de données reste redirigeable.

`this.prompt` : voir « Poser des questions » plus bas.

Pour un code de sortie non nul sans lever d'exception : `this.exitCode = 1`.

## Cycle de vie d'une commande

Le noyau appelle, dans cet ordre : `prepare()`, `interact()`, `run()`, puis
`completed()`. Seul `run()` est obligatoire.

```ts
export default class Provision extends BaseCommand {
  static commandName = 'provision'
  static description = 'Crée le compte propriétaire'

  async prepare(): Promise<void> {
    // avant tout le reste — ouvrir un fichier, préparer un état
  }

  async interact(): Promise<void> {
    // les questions interactives vont ici
  }

  async run(): Promise<void> {}

  async completed(): Promise<boolean> {
    // s'exécute MÊME si une étape précédente a levé : l'erreur est dans
    // `this.error`. Retourner `true` la marque comme traitée.
    if (this.error) this.logger.error(this.error instanceof Error ? this.error : String(this.error))
    return true
  }
}
```

## Transformer une entrée : `parse()`

```ts
@args.string({ parse: (value) => String(value).toUpperCase() })
declare name: string

@flags.number({ parse: (value) => Number(value) * 2 })
declare retries: number
```

Le callback reçoit la valeur **déjà typée** (un nombre pour un flag numérique) et
n'est pas appelé pour une entrée optionnelle absente.

## `this.parsed`

Toutes les entrées analysées, dans la forme du parseur. `this.parsed` décrit **ce qui
a été tapé** ; les propriétés de la commande, elles, portent les valeurs
assignées.

```ts
// ream hire Ada --user-email=ada@example.ch
this.userName            // 'Ada'          ← la propriété déclarée
this.parsed.args         // ['Ada']        ← une LISTE, dans l'ordre de déclaration
this.parsed.flags        // { 'user-email': 'ada@example.ch' }  ← nom de LIGNE DE COMMANDE
```

Également : `this.parsed.unknownFlags` — les *noms* des flags passés mais non
déclarés —, `this.parsed.extraArgs` (aussi exposé sous `_`) — les
positionnels au-delà de ce que la commande déclare, normalement une erreur, et
conservés seulement pour une commande `allowUnknownFlags` dont le rôle est de
faire suivre ce qu'elle reçoit — et `this.parsed.nodeArgs`, les arguments avec
lesquels node lui-même a été lancé.

## Flags globaux

Un flag que **toutes** les commandes acceptent, sans qu'aucune ait à le
redéclarer (`kernel.defineFlag`) :

```ts
kernel.defineFlag('verbose', { type: 'boolean', description: 'Tout dire' })
kernel.on('verbose', (Command, kernel, parsed) => {
  if (parsed.flags.verbose === true) enableDebugLogs()
})
```

`kernel.flags` liste les flags globaux, et l'aide de chaque commande les affiche
sous « Global flags ». Ils apparaissent dans `this.parsed.flags` mais ne sont
**pas** assignés aux propriétés de la commande : ils pilotent le CLI, pas la
commande. Une commande qui redéclare le même nom garde le sien.

Le listener n'est appelé que pour la commande lancée depuis la ligne de commande,
avant qu'elle ne soit construite — renvoyer `true` arrête là, sans exécuter la
commande ni démarrer l'application. C'est ainsi que `--ansi` / `--no-ansi` sont
implémentés, et ils s'écrivent avant ou après le nom de la commande
indifféremment. Une commande qui redéclare le nom garde la main de bout en bout :
son flag est parsé, et le listener global n'est pas appelé.

`consoleApp.exec()` **n'accepte pas** les flags globaux : ils
appartiennent à la ligne de commande. Passer `--no-ansi` à `exec()`, c'est passer
un flag que la commande ne déclare pas, et l'entendre dire est précisément
l'intérêt.

Un flag global déclaré après qu'une commande a déjà tourné lève : il n'aurait
plus servi à rien.

## Commandes longues : `terminate()`

Une commande `staysAlive: true` garde le process en vie ; `await this.terminate()`
est ce qui rend la main et arrête l'application proprement.

## Alias de commandes

Une commande peut porter ses propres alias :

```ts
export default class Welcome extends BaseCommand {
  static commandName = 'app:welcome'
  static description = 'Souhaite la bienvenue'
  static aliases = ['welcome', 'hi']
  async run(): Promise<void> {}
}
```

Et l'application peut en définir dans `reamrc.ts` — `commandsAliases`,
et la forme qui accepte des flags :

```ts
export default defineConfig({
  commandsAliases: {
    recontrol: 'make:controller --force',
  },
})
```

`ream recontrol billing Invoice` exécute alors `ream make:controller --force billing Invoice`.

Le noyau les accepte aussi à chaud — c'est ce que fait le fichier rc, et ce
qu'un loader peut publier dans ses métadonnées :

```ts
kernel.addAlias('recontrol', 'make:controller --force')
kernel.getAliases()                  // ['recontrol']
kernel.getAliasCommand('recontrol')  // les métadonnées de make:controller
```

## Aide longue d'une commande

`static help` s'affiche sous la ligne d'usage. `{{ binaryName }}` y est remplacé
par le nom du binaire, pour donner un exemple exécutable :

```ts
static help = ['Exemple : {{ binaryName }} provision --email a@b.ch']
```

## Couleurs

`--ansi` force la couleur, `--no-ansi` la désactive ; ce sont des **flags
globaux**, donc acceptés par toutes les commandes, avant ou après le nom, et
jamais assignés aux propriétés de la vôtre (ils restent lisibles dans
`this.parsed.flags`). `NO_COLOR` et `FORCE_COLOR` sont également respectés.
