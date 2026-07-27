# Atlas - Observabilité

Atlas expose chaque instruction exécutée via une petite couche d'observabilité des
requêtes — son équivalent de l'événement `db:query` de Lucid. Utilise-la pour
journaliser les requêtes lentes, tracer ce qu'une requête HTTP a réellement exécuté,
ou brancher atlas sur la télémétrie de ton application.

L'émission est **opt-in et gratuite tant qu'elle n'est pas utilisée**. Une
instruction n'est chronométrée que lorsque sa connexion est configurée avec
`debug: true` *ou* que la requête individuelle le demande via `.debug()` — et même
dans ce cas, rien n'est émis si personne n'écoute.

## S'abonner aux requêtes

`onDbQuery(listener)` enregistre un écouteur et renvoie une fonction de
désabonnement.

```ts
import { onDbQuery } from '@c9up/atlas'

const off = onDbQuery((event) => {
  console.log(event.duration, event.sql, event.bindings)
})

// plus tard, pour arrêter d'écouter :
off()
```

Un écouteur qui lève une exception est absorbé — l'observabilité ne doit jamais
modifier le comportement de la requête qu'elle rapporte.

`clearDbQueryListeners()` supprime tous les écouteurs d'un coup. Il est prévu pour
le teardown des tests :

```ts
import { clearDbQueryListeners } from '@c9up/atlas'

afterEach(() => clearDbQueryListeners())
```

## La forme de `DbQueryEvent`

Chaque écouteur reçoit un `DbQueryEvent`, qui reflète la charge utile `db:query`
de Lucid :

```ts
interface DbQueryEvent {
  sql: string                    // le SQL tel qu'envoyé au driver, placeholders inclus
  bindings: readonly unknown[]   // paramètres liés — jamais interpolés dans `sql`
  duration: number               // durée en millisecondes, aller-retour NAPI compris
  connection?: string            // nom de la connexion, quand l'app l'a nommée
  model?: string                 // nom de la classe d'entité, quand la requête vient d'un repository/modèle
  method?: string                // l'appel qui l'a produite (`exec`, `first`, `paginate`, …)
  ddl?: boolean                  // true pour les instructions de schéma (migrations)
  inTransaction?: boolean        // true quand l'instruction a tourné dans une transaction interactive
  error?: Error                  // défini quand l'instruction a échoué — l'événement est émis dans tous les cas
  reporterData?: Record<string, unknown> // métadonnées attachées via `query.reporterData({...})`
}
```

Les `bindings` sont volontairement gardés séparés de `sql` — les paramètres ne sont
jamais interpolés dans l'instruction, donc un écouteur peut journaliser la chaîne
exacte vue par le driver aux côtés de ses valeurs échappées et sûres.

L'événement se déclenche même en cas d'échec : quand une instruction lève une
exception, `error` est renseigné et l'événement est tout de même émis, de sorte que
les requêtes lentes-et-échouées apparaissent dans tes journaux.

## Impression lisible

`prettyPrintQuery(event)` rend un événement sous forme d'une seule ligne de journal
(le `prettyPrint` de Lucid) :

```ts
import { onDbQuery, prettyPrintQuery } from '@c9up/atlas'

onDbQuery((event) => {
  console.log(prettyPrintQuery(event))
})
// [atlas] 1.42ms primary User first SELECT * FROM users WHERE id = ? LIMIT 1 -- [10]
```

Les bindings sont ajoutés en JSON après `--`, et **non** interpolés dans le SQL.
Une ligne interpolée se lit comme du SQL exécutable tout en n'ayant aucun des
échappements qui rendaient l'instruction réelle sûre — et c'est exactement la
chaîne que quelqu'un copierait plus tard dans une console.

## Activer l'émission

### Par requête — `.debug()`

Appelle `.debug()` sur une requête pour forcer un événement `db:query` pour cette
seule instruction, même quand la connexion a `debug: false` :

```ts
const user = await User.query()
  .where('id', id)
  .debug()
  .first()
```

`.reporterData({...})` attache des métadonnées arbitraires à l'événement (id de
requête, id d'utilisateur, feature flag, …), lisibles depuis `event.reporterData`.
Le définir force aussi l'émission, afin que les données atteignent réellement un
écouteur ; les appels répétés fusionnent :

```ts
await User.query()
  .where('active', true)
  .reporterData({ requestId, userId })
  .exec()
```

### Par connexion — `debug: true`

Mets `debug: true` sur une connexion pour émettre un événement pour **chaque**
instruction qu'elle exécute. Désactivé par défaut :

```ts
// config/database.ts
export default {
  connections: {
    primary: {
      client: 'postgres',
      connection: env.get('DATABASE_URL'),
      debug: true,
    },
  },
}
```

Sans abonné, rien n'est émis dans tous les cas — donc `debug: true` sur une
connexion sans écouteur `onDbQuery` ne coûte rien.

## Brancher sur l'émetteur de ton application

Atlas est un package autonome et ne peut pas importer l'émetteur d'événements de
ton framework, il possède donc plutôt ce petit registre d'écouteurs. Pour faire
remonter les requêtes sur l'émetteur que ton application utilise déjà, transfère-les
en une ligne au démarrage :

```ts
onDbQuery((event) => emitter.emit('db:query', event))
```
