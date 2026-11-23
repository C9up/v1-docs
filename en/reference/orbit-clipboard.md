# orbit-clipboard

`@c9up/orbit-clipboard`: the system clipboard, with the same two calls in the browser and on a phone. Guide: [Device APIs](/en/guides/mobile/device-apis).

## Installation

```bash
pnpm add @c9up/orbit-clipboard
```

On a phone, React Native's autolinking adds the native module to an app built by `ream android:*`; there is nothing to wire.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/orbit-clipboard` | `writeText`, `readText` and the error class. The import resolves per platform: the default build in the browser and on the server, the `react-native` build (the condition and the `react-native` field) on a phone. Both builds export the same names. |

| Platform | What the calls reach |
|---|---|
| Browser | `navigator.clipboard`, on a secure page (https, localhost). Reading asks the user. |
| Phone (Android) | The app's `OrbitClipboard` TurboModule over `ClipboardManager`. Android lets an app read the clipboard only while it has focus (10+) and tells the user when it does (13+). |
| Server | No clipboard: both calls reject with `E_ORBIT_CLIPBOARD_UNAVAILABLE`. |

Plain text only.

## Exports

| Export | Kind | Description |
|---|---|---|
| `writeText` | function | Puts text on the system clipboard. |
| `readText` | function | Reads the text on the system clipboard. |
| `OrbitClipboardError` | error | Every failure of the two calls. |
| `OrbitClipboardErrorCode` | type | The codes an `OrbitClipboardError` carries. |

### Functions

| Function | Signature | Description |
|---|---|---|
| `writeText` | `writeText(text: string): Promise<void>` | Puts `text` on the system clipboard. |
| `readText` | `readText(): Promise<string>` | The text on the system clipboard; `""` when it holds none. |

### `OrbitClipboardError`

Extends `Error`; `name` is `"OrbitClipboardError"`. A platform failure is kept as `cause`.

| Member | Signature | Description |
|---|---|---|
| `code` | `readonly code: OrbitClipboardErrorCode` | The stable code to branch on, the same in the browser and on a phone. |
| constructor | `new OrbitClipboardError(code: OrbitClipboardErrorCode, message: string, options?: ErrorOptions)` | |

```ts
type OrbitClipboardErrorCode =
  | 'E_ORBIT_CLIPBOARD_UNAVAILABLE'
  | 'E_ORBIT_CLIPBOARD_DENIED'
```

## Errors

| Code | Raised when |
|---|---|
| [`E_ORBIT_CLIPBOARD_UNAVAILABLE`](/en/reference/errors#e-orbit-clipboard-unavailable) | There is no clipboard to reach: the server, a page that is not a secure context, or an app built without the native module. |
| [`E_ORBIT_CLIPBOARD_DENIED`](/en/reference/errors#e-orbit-clipboard-denied) | The platform refused: no permission, or the page or app was not in focus. |

## See also

- [Device APIs](/en/guides/mobile/device-apis)
- [Building the app](/en/guides/mobile/building)
- [orbit-secure-store](/en/reference/orbit-secure-store)
