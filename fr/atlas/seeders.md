# Atlas - Seeders

Les seeders remplissent la base de données avec des données par défaut, de
référence ou de test. Atlas reprend l'API des seeders d'Adonis Lucid — une
classe de base à étendre, un runner de répertoire et deux commandes console
(`make:seeder` / `db:seed`).

Atlas n'a pas de registre de configuration global (parité Lucid) : on passe
toujours ses propres chemins et sa connexion, donc rien n'est découvert
implicitement.

## Écrire un seeder

Étendre `BaseSeeder` et implémenter `run()`. La connexion à la base est injectée
via le constructeur et exposée à la fois comme `this.db` et `this.client`
(l'alias Lucid), ce qui permet de construire des repositories à l'intérieur de
`run()` sans recourir à des globals.

Rendre le corps idempotent — un `upsert` clé sur une colonne unique est le
pattern recommandé pour qu'un seeder puisse être rejoué sans risque.

```ts
// database/seeders/1700000000000_CountrySeeder.ts
import { BaseSeeder, BaseRepository } from '@c9up/atlas'
import { Country } from '#models/country'

export default class CountrySeeder extends BaseSeeder {
  async run() {
    const countries = new BaseRepository(Country, this.db)
    // Conflit sur isoCode → mise à jour de name. Rejouable sans risque.
    await countries.upsert(
      [
        { isoCode: 'FR', name: 'France' },
        { isoCode: 'IN', name: 'India' },
      ],
      ['isoCode'],
      ['name'],
    )
  }
}
```

`run()` peut retourner `void` ou une `Promise` — les corps asynchrones sont
attendus.

Chaque fichier de seeder doit faire un `export default` d'une classe étendant
`BaseSeeder` ; sinon le runner lève `E_SEEDER_INVALID`.

> `Seeder` est un alias hérité de `BaseSeeder`, conservé pour l'ancien code. Les
> nouveaux seeders devraient étendre `BaseSeeder`.

## Filtrage par environnement

Définir le tableau statique `environment` pour restreindre un seeder à certains
environnements. Quand on fournit l'environnement courant au runner, il ignore
tout seeder dont la liste l'exclut. Laisser `environment` non défini exécute le
seeder partout.

```ts
export default class DemoUsersSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // ne s'exécute qu'en development / testing
  }
}
```

## Exécuter les seeders par programme

### `runSeeders(seeders)`

Exécute dans l'ordre une liste d'**instances** de seeders déjà construites.
Chaque `run()` est attendu séquentiellement, donc l'ordre est déterministe et
les effets de bord d'un seeder sont visibles pour le suivant.

```ts
import { runSeeders } from '@c9up/atlas'

await runSeeders([
  new CountrySeeder(db),
  new CurrencySeeder(db),
])
```

### `runSeederDirectory(dir, db, options?)`

Découvre les fichiers de seeders `.ts` / `.js` sous `dir`, les importe dans
l'ordre trié, construit une instance de chacun avec `db`, puis les exécute
séquentiellement. Retourne la liste des noms de seeders exécutés (noms de
fichiers sans extension).

```ts
import { runSeederDirectory } from '@c9up/atlas'

const executed = await runSeederDirectory('database/seeders', db)
// → ['1700000000000_CountrySeeder', '1700000000001_CurrencySeeder']
```

Options :

- `files` — n'exécute que ces seeders, appariés par nom de base
  (`CountrySeeder`) ou par chemin de fichier complet / relatif
  (`database/seeders/CountrySeeder.ts`) ; le runner compare le nom de base sans
  extension. Reprend le `--files` de Lucid.
- `naturalSort` — trie les fichiers numériquement (`2_x` avant `10_x`) au lieu de
  l'ordre lexicographique par défaut. Reprend le `naturalSort` de Lucid.
- `environment` — l'environnement courant ; ignore tout seeder dont le
  `environment` statique l'exclut.

Si `dir` n'existe pas, le runner lève `E_SEEDER_DIR_NOT_FOUND`.

```ts
await runSeederDirectory('database/seeders', db, {
  files: ['CountrySeeder'],
  naturalSort: true,
  environment: 'development',
})
```

## Commandes console

Les commandes sont des classes idiomatiques à Ream — la même forme que les
commandes de migration — exportées par défaut depuis un fichier de `commands/`,
que le noyau console découvre automatiquement. Chaque factory prend le
`seedersDir` (et, pour `db:seed`, des valeurs par défaut optionnelles
`naturalSort` / `environment`).

```ts
export interface SeederCommandOptions {
  seedersDir: string
  naturalSort?: boolean
  environment?: string
}
```

### `make:seeder`

Génère un nouveau fichier de seeder dans `seedersDir`. Le fichier est préfixé par
`Date.now()` pour conserver l'ordre de création sous le tri lexicographique du
runner (la même convention que les migrations), et il est écrit avec le flag `wx`
pour ne jamais écraser un seeder existant. Le nom est validé — séparateurs de
chemin et traversée sont rejetés.

```ts
// commands/make-seeder.ts
import { makeSeederCommand } from '@c9up/atlas'

export default makeSeederCommand({ seedersDir: 'database/seeders' })
```

```sh
ream make:seeder CountrySeeder
# → Created database/seeders/1700000000000_CountrySeeder.ts
```

Le squelette étend `BaseSeeder` avec un `run()` asynchrone vide et un exemple
`upsert` commenté à compléter.

### `db:seed`

Exécute les seeders de `seedersDir`.

```ts
// commands/seed.ts
import { dbSeedCommand } from '@c9up/atlas'

export default dbSeedCommand({ seedersDir: 'database/seeders' })
```

```sh
ream db:seed
# → Seeded: 1700000000000_CountrySeeder, 1700000000001_CurrencySeeder
```

Flags :

- `--files=A,B` — n'exécute que les seeders nommés (séparés par des virgules).
  Reprend le `--files` de Lucid.
- `--connection=name` — exécute sur une connexion enregistrée précise au lieu de
  celle par défaut. Reprend le `--connection` de Lucid.
- `--environment=name` — surcharge l'environnement utilisé pour le filtrage
  `static environment` ; retombe sur l'`environment` de la factory, puis sur
  `NODE_ENV`.
- `--compact-output` — affiche une seule ligne de résumé (`Seeded N seeder(s)`)
  au lieu de lister chaque seeder.
- `--interactive` — accepté uniquement pour compatibilité Lucid. Le kernel
  console est non interactif : il affiche un avertissement et exécute tous les
  seeders sélectionnés sans demander de confirmation.

```sh
ream db:seed --files=CountrySeeder,CurrencySeeder --connection=pg
```

Si aucune connexion n'est disponible (ou si la `--connection` nommée n'est pas
enregistrée), `db:seed` affiche une erreur et sort avec un code non nul —
vérifier que `AtlasProvider` est enregistré.
