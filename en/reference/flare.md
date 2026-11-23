# flare

`@c9up/flare`: the exceptions every ream package raises. An error has a machine-readable `code`, an HTTP `status` and, when useful, a `help` text. Guide: [Exception handling](/en/guides/basics/exception-handling).

## Installation

```bash
pnpm add @c9up/flare
```

Every `@c9up` package depends on flare, and `@c9up/ream` re-exports `Exception`, `createError`, `RuntimeException` and `InvalidArgumentsException`. Flare has no dependency and runs in Node.js, in browsers and in React Native.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/flare` | `Exception`, `createError`, `RuntimeException`, `InvalidArgumentsException`, `format`. |

## Exports

| Export | Kind | Description |
|---|---|---|
| `Exception` | class | The base class of every ream error. |
| `createError` | function | Declares an error class in one line. |
| `RuntimeException` | class | A failure at run time that no more specific error describes. |
| `InvalidArgumentsException` | class | A function received arguments it cannot work with. |
| `ErrorClass` | interface | The type of the class `createError` returns. |
| `ExceptionOptions` | interface | `ErrorOptions` (`cause`) plus `code?: string` and `status?: number`. |
| `format` | function | Fills `%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%O` and `%%` placeholders, like Node.js `util.format`. |

### `Exception`

A subclass sets its metadata once, as static properties. The constructor copies them to the instance.

```ts
import { Exception } from '@c9up/flare'

export class E_ROW_NOT_FOUND extends Exception {
  static status = 404
  static code = 'E_ROW_NOT_FOUND'
  static message = 'Row not found'
}
```

| Member | Signature | Description |
|---|---|---|
| constructor | `new Exception(message?: string, options?: ExceptionOptions)` | The message falls back to the static `message`, the status to the static `status`, then 500. |
| `code` | `string \| undefined` | The machine-readable code. Absent when the class has none. |
| `status` | `number` | The HTTP status the error maps to. |
| `help` | `string \| undefined` | Advice to fix the error, from the static `help`. |
| `cause` | `unknown` | The error that caused this one, when given. |
| `toString` | `toString(): string` | `Name [CODE]: message`, or `Name: message` without a code. |

### `createError`

```ts
createError<T extends unknown[] = never>(message: string, code: string, status?: number): ErrorClass<T>
```

Returns a new `Exception` subclass. The message may hold placeholders; their values are passed as an array:

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

## How a package exposes its errors

Each package declares its errors in `src/errors.ts` and exports them as one namespace, `errors`:

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

You can also test `error.code`, which every error index row documents.

## Errors

| Code | Raised when |
|---|---|
| [`E_RUNTIME_EXCEPTION`](/en/reference/errors#e-runtime-exception) | `RuntimeException`: a failure at run time that no more specific error describes |
| [`E_INVALID_ARGUMENTS_EXCEPTION`](/en/reference/errors#e-invalid-arguments-exception) | `InvalidArgumentsException`: a function received arguments it cannot work with |

## See also

- [Exception handling](/en/guides/basics/exception-handling)
- [Error index](/en/reference/errors)
