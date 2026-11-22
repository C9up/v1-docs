# Commandes de base de données

Ce guide couvre les commandes de base de données :

- Tous les stores, pas seulement le relationnel
- Écrire un runner pour son propre store

## Migrations

```bash
ream migrate                # Exécute les migrations en attente, pour chaque store enregistré
ream migrate:rollback       # Annule le dernier batch
ream migrate:status         # Montre ce qui a tourné et ce qui reste
ream migrate --only eon     # Un seul store
```

### Tous les stores, pas seulement le relationnel

La sortie est préfixée par le store d'où elle vient :

```
  [atlas] ✓ 001_create_users (batch 1)
  [eon]   ○ 001_create_meters
```

Ream s'attend à plusieurs stores dans une même app — un relationnel, un
temporel, ce qui viendra ensuite — donc la commande n'en nomme aucun : elle
pilote ce qui se trouve dans le registre `migrations`.

Un paquet de données enregistre son runner depuis son provider, sous la liaison
`migrations` de l'app. Deux conséquences à connaître :

- **Livrer un nouveau store ne demande jamais un nouveau CLI.** Le binaire
  `ream` est publié à part des paquets ; tout nom de paquet qu'il connaîtrait
  serait un couplage de version.
- **Une app qui n'a qu'un store temporel peut migrer.** La commande refusait de
  démarrer sans répertoire `database/migrations/`, qui est la convention
  d'atlas. Chaque runner connaît désormais le sien.

Les sources tournent **séquentiellement**, pas en parallèle : deux stores
partageant un serveur se disputeraient les verrous, et une sortie entrelacée
rend un échec impossible à attribuer.

### Écrire un runner pour son propre store

Trois méthodes sont requises — les trois qu'appellent les commandes :

```ts
interface MigrationRunnerContract {
  migrate(): Promise<string[]>              // noms appliqués, dans l'ordre
  rollback(): Promise<string[]>             // noms annulés
  status(): Promise<MigrationStatusNode[]>  // { name, status, batch? }

  reset?(): Promise<string[]>               // le reste est optionnel
  refresh?(): Promise<unknown>
  fresh?(): Promise<unknown>
  dryRun?(): Promise<unknown>
  forceUnlock?(): Promise<boolean>
}
```

Le reste est optionnel à dessein : un store doit pouvoir s'enregistrer avec un
runner qui sait seulement avancer, plutôt que de simuler des méthodes qu'il ne
peut pas honorer.

On l'enregistre depuis son provider, en résolvant la liaison structurellement
pour que le paquet ne dépende pas de `@c9up/ream` :

```ts
const registry = await container.resolve('migrations')
registry.register({
  name: 'mystore',
  directory: 'database/mystore-migrations',
  runner: myRunner,
})
```

Enregistrer deux fois le même nom est refusé, pas remplacé en silence : l'un des
deux providers ne migrerait rien pendant que la commande annoncerait un succès.

::: tip Où vivent ces commandes
`migrate`, `migrate:rollback`, `migrate:status`, `schedule:list` et
`schedule:run` sont des classes de commande de `@c9up/ream`, enregistrées par
le framework lui-même — pas des sous-commandes du binaire. Le binaire transmet
au noyau console de l'application tout nom qu'il ne connaît pas, et c'est aussi
comme ça que les commandes d'un paquet tournent sans une ligne de Rust. Une app
sans paquet de données signale que rien ne s'est enregistré, et sort en 0.
:::
