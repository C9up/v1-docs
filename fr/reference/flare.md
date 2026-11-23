# flare

`@c9up/flare` : les exceptions que lèvent tous les paquets de ream. Une erreur a un `code` lisible par une machine, un `status` HTTP et, quand c'est utile, un texte d'aide `help`. Guide : [Gestion des exceptions](/fr/guides/basics/exception-handling).

## Installation

```bash
pnpm add @c9up/flare
```

Tous les paquets `@c9up` dépendent de flare, et `@c9up/ream` réexporte `Exception`, `createError`, `RuntimeException` et `InvalidArgumentsException`. Flare n'a aucune dépendance et fonctionne dans Node.js, dans les navigateurs et dans React Native.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/flare` | `Exception`, `createError`, `RuntimeException`, `InvalidArgumentsException`, `format`. |

## Exports

| Export | Type | Description |
|---|---|---|
| `Exception` | classe | La classe de base de toutes les erreurs de ream. |
| `createError` | fonction | Déclare une classe d'erreur en une ligne. |
| `RuntimeException` | classe | Une panne à l'exécution qu'aucune erreur plus précise ne décrit. |
| `InvalidArgumentsException` | classe | Une fonction a reçu des arguments dont elle ne peut rien faire. |
| `ErrorClass` | interface | Le type de la classe que renvoie `createError`. |
| `ExceptionOptions` | interface | `ErrorOptions` (`cause`), plus `code?: string` et `status?: number`. |
| `format` | fonction | Remplit les marqueurs `%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%O` et `%%`, comme `util.format` de Node.js. |

### `Exception`

Une sous-classe définit ses informations une seule fois, en propriétés statiques. Le constructeur les recopie sur l'instance.

```ts
import { Exception } from '@c9up/flare'

export class E_ROW_NOT_FOUND extends Exception {
  static status = 404
  static code = 'E_ROW_NOT_FOUND'
  static message = 'Row not found'
}
```

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Exception(message?: string, options?: ExceptionOptions)` | Sans message, le `message` statique sert ; sans statut, le `status` statique, puis 500. |
| `code` | `string \| undefined` | Le code lisible par une machine. Absent quand la classe n'en a pas. |
| `status` | `number` | Le statut HTTP qui correspond à l'erreur. |
| `help` | `string \| undefined` | Un conseil pour corriger l'erreur, tiré du `help` statique. |
| `cause` | `unknown` | L'erreur qui a causé celle-ci, quand elle est fournie. |
| `toString` | `toString(): string` | `Nom [CODE]: message`, ou `Nom: message` sans code. |

### `createError`

```ts
createError<T extends unknown[] = never>(message: string, code: string, status?: number): ErrorClass<T>
```

Renvoie une nouvelle sous-classe d'`Exception`. Le message peut contenir des marqueurs ; leurs valeurs se passent dans un tableau :

```ts
import { createError } from '@c9up/flare'

export const E_RESOURCE_NOT_FOUND = createError<[number]>(
  'Unable to find resource with id %d',
  'E_RESOURCE_NOT_FOUND',
  404,
)

throw new E_RESOURCE_NOT_FOUND([42])
throw new E_RESOURCE_NOT_FOUND([42], { cause: error })
```

## Comment un paquet expose ses erreurs

Chaque paquet déclare ses erreurs dans `src/errors.ts` et les exporte dans un seul espace de noms, `errors` :

```ts
import { errors } from '@c9up/bay'

try {
  await queue.dispatch(job)
} catch (error) {
  if (error instanceof errors.E_QUEUE_NOT_INITIALIZED) {
    // …
  }
}
```

Vous pouvez aussi tester `error.code` : chaque ligne de l'index des erreurs le documente.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_RUNTIME_EXCEPTION`](/fr/reference/errors#e-runtime-exception) | `RuntimeException` : une panne à l'exécution qu'aucune erreur plus précise ne décrit |
| [`E_INVALID_ARGUMENTS_EXCEPTION`](/fr/reference/errors#e-invalid-arguments-exception) | `InvalidArgumentsException` : une fonction a reçu des arguments dont elle ne peut rien faire |

## Voir aussi

- [Gestion des exceptions](/fr/guides/basics/exception-handling)
- [Index des erreurs](/fr/reference/errors)
