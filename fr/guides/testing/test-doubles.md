# Doublures et temps

Ce guide couvre les remplacements dans le conteneur et le voyage dans le temps :

- Overrides du container
- Voyage dans le temps

## Overrides du container

```ts
import { override, test, useContainer } from '@c9up/helix'
import { FakeMail } from '@c9up/rover/testing'

test('sends the welcome mail', async () => {
  useContainer(container)              // le container de ton app, une fois par fichier de test ou dans un hook
  override('mail', new FakeMail())
  override('logger', captureLogger)
  // ...
})
```

`override(token, value)` remplace une liaison du container que `useContainer` a
rendu actif, et s'annule de lui-même à la fin du test — la restauration est
mise dans le cleanup du test, donc elle s'exécute même si le corps du test ne
la demande jamais. Il lève hors d'un test (une restauration mise en file à cet
endroit ne s'exécuterait jamais) et quand aucun container n'est actif.
`overrideOn(container, token, value)` vise un container explicitement.

## Voyage dans le temps

```ts
import { time } from '@c9up/helix'

time.freeze('2026-01-01T12:00:00Z')
time.travel(60_000)         // +1 minute
time.unfreeze()
```

L'horloge est figée par `vi.setSystemTime`, qui remplace `Date` : tout ce qui
lit l'heure à travers `Date` — `DateTime.now()` de chronos, les colonnes Atlas
`created_at` / `updated_at` — voit l'horloge gelée ; helix n'importe aucune
bibliothèque de dates.

`freeze` et `travel` s'annulent d'eux-mêmes en fin de test : l'horloge revient à
ce qu'elle était avant l'appel — le réglage posé dans un `beforeAll` par
`vi.setSystemTime` ou `vi.useFakeTimers`, ou l'heure réelle s'il n'y en avait
pas —, si bien que le test suivant voit l'horloge choisie par le fichier, quoi
qu'ait fait le test précédent.

`Date` n'est remplacé que pendant qu'une horloge est figée ; importer helix ne
modifie aucune variable globale. Pendant ce temps, le remplaçant se comporte
toujours comme `Date` : une `class X extends Date` garde son prototype et ses
méthodes, `new Date().constructor === Date`, et une date créée avant le gel
reste `instanceof Date`.
