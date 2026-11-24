# orbit

`@c9up/orbit`: aurora components as native views on a phone, laid out and diffed by a Rust host. Guide: [Introduction](/en/guides/mobile/introduction).

## Installation

```bash
pnpm add @c9up/orbit
```

Peer dependencies: `@c9up/aurora` (required) and `@c9up/photon` (only for `@c9up/orbit/pages`). The app is built and run by `ream android:*`, which adds the native host and the app's style table; see [Building the app](/en/guides/mobile/building).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/orbit` | The core, free of React Native: mounting a template on the native host, stacks of screens, the style table, motion values, the server connection, and the standard `URL` and `TextDecoder`. |
| `@c9up/orbit/react-native` | The app's entry on the phone: `run(App)` registers the app with React Native, gives orbit its host and style table, and wires the back button. Importing it installs the standard `URL` and `TextDecoder`. |
| `@c9up/orbit/pages` | Pages driven by the ream server, shown as screens of a stack (needs `@c9up/photon`). |

The package has no `react-native` export condition: the phone entry is the `./react-native` subpath, imported by the app's entry file.

## Exports

### `@c9up/orbit`

| Export | Kind | Description |
|---|---|---|
| `mount` | function | Renders an aurora template as native views through the host. |
| `MountOptions` | interface | Options of `mount`. |
| `Root` | type | The mounted root that `mount` returns. |
| `OrbitReport` | interface | One commit's report from the host. |
| `afterCommit` | function | Runs a hook once the next commit has reached the host. |
| `useHost` | function | Gives orbit its native host, once, before `mount`. |
| `OrbitHost` | interface | What orbit needs from the native side. |
| `NATIVE_MODULE_NAME` | const | `"NativeOrbit"`, the TurboModule name the native side registers. |
| `GestureEvent` | type | What a gesture handler (`@click`, `@longpress`, `@pan`, `@swipe`) receives. |
| `createStack` | function | A stack of screens. |
| `useScreen` | function | The screen a component is part of. |
| `goBack` | function | What the back button does: pops the innermost shown stack. |
| `Stack` | type | A stack of screens (the class `createStack` returns). |
| `StackOptions` | interface | Options of `createStack`. |
| `Navigator` | interface | `push`, `pop`, `replace`, `canGoBack`. |
| `Screen` | interface | A `Navigator` plus `focused()`. |
| `ScreenComponent` | type | `(props: P) => TemplateResult`. |
| `useStyles` | function | Gives orbit the app's style table. |
| `colorScheme` | const | Signal of the scheme `dark:` follows. |
| `unknownClasses` | const | Classes elements asked for that the style table does not have. |
| `StyleTable` | interface | The table `ream css:compile` writes. |
| `bindMotion` | function | Wires a motion style to a committed view. |
| `bindScrollY` | function | Feeds a motion value from a scroll view's offset. |
| `MotionValue`, `MotionNode` | class | Re-exported from `@c9up/aurora/core`; on the phone the host drives them on the UI thread once `useHost` ran. |
| `MotionStyle`, `SpringOptions`, `TimingOptions` | type | Re-exported from `@c9up/aurora/core`. |
| `connectServer` | function | One connection to the app's ream server, for pages, comet and relay. |
| `ServerConnection` | interface | What `connectServer` returns. |
| `ConnectOptions` | interface | Options of `connectServer`. |
| `TokenStore` | interface | Where `authorize` keeps the API token. |
| `ServerEventStream` | class | Server-sent events over React Native's streaming XHR. |
| `ServerEvent` | interface | One server-sent event. |
| `colorToArgb` | function | A CSS colour as a 32-bit ARGB integer. |
| `installTextDecoder` | function | Installs a standard UTF-8 `TextDecoder` where the engine has none (Hermes). |
| `StandardTextDecoder` | class | The UTF-8 `TextDecoder` it installs. |
| `installStandardUrl` | function | Installs a standard `URL` in place of the platform's when it is not one. |
| `StandardURL` | class | The `URL` it installs. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |

#### Mounting

| Function | Signature | Description |
|---|---|---|
| `useHost` | `useHost(next: OrbitHost): void` | Gives orbit its native host, once, before `mount`. Motion values made from then on live in the host. |
| `mount` | `mount(result: TemplateResult, options: MountOptions): Root` | Renders the template; the root commits on its own after each change, batched to a microtask. |
| `afterCommit` | `afterCommit(hook: () => void): void` | Runs `hook` once the next commit has reached the host. |
| `colorToArgb` | `colorToArgb(css: string): number` | Reads `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` / `rgba()` (comma or space syntax) and `transparent`. |

| `MountOptions` field | Type | Description |
|---|---|---|
| `viewport` | `{ width: number; height: number }` | The root's size in dp (React Native: `Dimensions.get("window")`). |
| `host` | `OrbitHost` | Defaults to the host given to `useHost`. |
| `onError` | `(error: Error) => void` | Told of what orbit recovered from instead of throwing: a commit the host refused while nothing waited on it (a scheduled one), an image address from data orbit will not load, a value of a drawing the host left out. Without it, a development build (`__DEV__`) logs them with `console.warn` and a production build says nothing. |

| `Root` member | Signature | Description |
|---|---|---|
| `flush` | `flush(): OrbitReport` | Commits what changed now, instead of at the end of the turn. |
| `reports` | `readonly reports: OrbitReport[]` | Every commit's report, newest last (development and benchmarks). |

`OrbitReport` is `{ deleted: number[]; parseUs: number; layoutUs: number; diffUs: number; measures: number; nodes: number; opsBytes: number; warnings?: string[] }`. `warnings` lists the values of drawings the host left out, each starting with its code (`E_ORBIT_SVG_VALUE: …`); orbit also hands each one to `onError`.

A commit the host refuses is not lost: orbit sends what it carried again with the next commit. `mount` and `flush()` throw the refusal; a scheduled commit hands it to `onError`. Text reaches the host well formed: half of an emoji (`"Ana😀".slice(0, 4)`) is shown as U+FFFD, as a browser shows it.

Views may nest at most 100 levels deep under the root. The host lays the tree out on the JS thread, one level of its stack at a time, and refuses a deeper tree with `E_ORBIT_TREE_TOO_DEEP` before it lays it out. Data nested as deep as it likes (replies to replies) needs a limit of its own in the template.

`OrbitHost` is structural, so a test can pass a fake. Its methods: `setViewport(width, height)`, `commit(ops: string): string`, `imageBytes(tag, bytes: Uint8Array)`, `layout(tags: string): string`, `scroll(tag, by, toEnd)`, `setEventHandler(handler)`, and the motion methods `motionValue`, `motionInterpolate`, `motionSet`, `motionStop`, `motionFrames`, `motionSpring`, `motionDispose`, `motionBind`, `motionBindScroll`.

`GestureEvent` is `{ type: string } & { [key: string]: unknown }`: the shape a DOM handler reads, plus the gesture's numbers.

#### Stacks and screens

| Function | Signature | Description |
|---|---|---|
| `createStack` | `createStack(initial: () => TemplateResult, options?: StackOptions): Stack`<br>`createStack<P>(initial: ScreenComponent<P>, options: StackOptions & { props: P }): Stack` | A stack with `initial` at the bottom; show it with `` html`${stack}` ``. A stack is shown in one place only. |
| `useScreen` | `useScreen(): Screen` | The screen this component is part of, in its setup or in a slot it built. |
| `goBack` | `goBack(): boolean` | Pops the innermost shown stack that can; `false` when none can and the platform's own back applies. |

| `Stack` member | Signature | Description |
|---|---|---|
| `push` | `push(screen: () => TemplateResult): void`<br>`push<P>(screen: ScreenComponent<P>, props: P): void` | Shows `screen` on top; the one below keeps its state, covered. |
| `pop` | `pop(): boolean` | Ends the top screen and shows the one below; `false` when only one is left. |
| `replace` | `replace(screen: () => TemplateResult): void`<br>`replace<P>(screen: ScreenComponent<P>, props: P): void` | Swaps the top screen for `screen`; the replaced one ends. |
| `replaceInPlace` | `replaceInPlace<P>(screen: ScreenComponent<P>, props: P): void` | Swaps the top screen at once, with no transition. |
| `reset` | `reset<P>(screen: ScreenComponent<P>, props: P): void` | Ends every screen and starts again from `screen`, at once. |
| `back` | `back(): boolean` | What the back button does here: the `back` option, or `pop()`. |
| `canGoBack` | `canGoBack(): boolean` | Whether `pop` has a screen to go back to (reactive). |
| `isShown` | `isShown(): boolean` | Whether the stack is on screen, not inside a covered screen. |

`Screen` adds `focused(): boolean` to `Navigator`: true while this screen is the one shown (reactive). A covered screen's effects keep running.

| `StackOptions` field | Type | Default | Description |
|---|---|---|---|
| `transition` | `'slide' \| 'none'` | `'slide'` | `slide`: in from the right edge, the covered screen drifting left; `none`: at once. |
| `duration` | `number` | `300` | The transition's length in ms. |
| `background` | `string` | none | Painted behind each screen. |
| `back` | `() => boolean` | `pop()` | What the back button does when it reaches this stack; true when it went back. |

#### Styles and motion

| Function | Signature | Description |
|---|---|---|
| `useStyles` | `useStyles(table: unknown): void` | Gives orbit the app's style table; `run` does it on the phone. Anything other than a version 1 table from `ream css:compile` throws `E_ORBIT_STYLE_TABLE`. |
| `colorScheme` | `Signal<'light' \| 'dark'>` | The scheme `dark:` and the theme's dark values follow; starts at `'light'`. |
| `unknownClasses` | `Set<string>` | Classes an element asked for that the stylesheet does not have. |
| `bindMotion` | `bindMotion(viewTag: number, style: MotionStyle): void` | Wires `style` (`opacity`, `translateX`, `translateY`, `scale`, `visible`) to the view; call once the view is committed. |
| `bindScrollY` | `bindScrollY(scrollViewTag: number, value: MotionValue): void` | Feeds `value` from the scroll offset of the scroll view. |

#### Server connection

| Function | Signature | Description |
|---|---|---|
| `connectServer` | `connectServer(server: string, options?: ConnectOptions): ServerConnection` | Connects to the app's ream server: https, or http to `localhost`, `127.0.0.1`, `[::1]` or the emulator's host `10.0.2.2`. Any other plain http throws `E_ORBIT_INSECURE_SERVER`. |

| `ServerConnection` member | Signature | Description |
|---|---|---|
| `origin` | `readonly origin: string` | The server's origin. |
| `url` | `url(path: string): string` | `path` on the server, absolute. |
| `fetch` | `fetch(url: string, init?: RequestInit): Promise<Response>` | A request to the server: refused for another origin, carrying the session cookie and, on a mutation, the `X-XSRF-TOKEN` the server's `XSRF-TOKEN` cookie set. |
| `json` | `json(url: string, body: unknown, options?: { signal?: AbortSignal }): Promise<unknown>` | POSTs `body` as JSON and resolves the JSON answer (nothing for a 204): the shape of comet's `RpcTransport`. |
| `stream` | `stream(url: string): ServerEventStream` | A server-sent event stream: what relay's `stream` option takes. |
| `xsrf` | `xsrf(): string \| undefined` | The `XSRF-TOKEN` the server set last. |
| `authorize` | `authorize(token: string \| null): Promise<void>` | Sends `Authorization: Bearer <token>` with every request and stream from now on; `null` stops. With a `tokenStore`, the token is kept there too. |
| `restore` | `restore(): Promise<boolean>` | Authorizes again with the token the `tokenStore` kept; `false` when there was none or no store. |

| Type | Shape |
|---|---|
| `ConnectOptions` | `{ tokenStore?: TokenStore }` |
| `TokenStore` | `{ get(): Promise<string \| null>; set(token: string \| null): Promise<void> }` |
| `ServerEvent` | `{ readonly type: string; readonly data?: string; readonly lastEventId?: string }` |

| `ServerEventStream` member | Signature | Description |
|---|---|---|
| constructor | `new ServerEventStream(url: string, headers?: () => Record<string, string>, options?: { credentials?: boolean })` | Opens the stream; `credentials` defaults to `true`. |
| `CONNECTING`, `OPEN`, `CLOSED` | `static readonly` `0`, `1`, `2` | The `readyState` values. |
| `url` | `readonly url: string` | The stream's URL. |
| `readyState` | `number` | The current state. |
| `addEventListener` | `addEventListener(type: string, listener: (event: ServerEvent) => void): void` | Listens to events of `type`. |
| `removeEventListener` | `removeEventListener(type: string, listener: (event: ServerEvent) => void): void` | Stops listening. |
| `close` | `close(): void` | Closes the stream for good. |

A dropped connection dispatches `error` and reconnects after the server's `retry:` (3000 ms when unset) with `Last-Event-ID`. An answer that is not a 200 `text/event-stream` fails the stream for good.

#### Platform shims

| Export | Signature | Description |
|---|---|---|
| `installTextDecoder` | `installTextDecoder(): boolean` | Puts `StandardTextDecoder` in place when the engine has no `TextDecoder`; `true` when it did. |
| `StandardTextDecoder` | `new StandardTextDecoder(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean })` | UTF-8 only; `decode(input?: ArrayBuffer \| ArrayBufferView, options?: { stream?: boolean }): string`. |
| `installStandardUrl` | `installStandardUrl(): boolean` | Puts `StandardURL` in place of the platform's `URL` when that one is not standard; `true` when it did. The platform's `createObjectURL` stays reachable. |
| `StandardURL` | `new StandardURL(url: string \| StandardURL, base?: string \| StandardURL)` | A standard `URL`: `canParse`, `createObjectURL`, `revokeObjectURL`, the URL parts, `searchParams`, `href`, `toString()`, `toJSON()`. |

### `@c9up/orbit/react-native`

| Export | Kind | Description |
|---|---|---|
| `run` | function | Registers the root component as the app and mounts it when the activity starts. |
| `RunOptions` | interface | Options of `run`. |
| `LaunchProps` | type | `{ [key: string]: unknown }`: the props the app is started with. The activity `ream android:*` generates passes none, so `root` receives `{}`; the launch intent's extras are not read (another app can put anything in them). |
| `APP_NAME` | const | `"main"`, the name the generated activity starts the app by. |

| Function | Signature | Description |
|---|---|---|
| `run` | `run(root: (props: LaunchProps) => TemplateResult, options?: RunOptions): void` | Gives orbit the `NativeOrbit` host (throws `E_ORBIT_NO_HOST` when the module is not orbit's) and the style table, sets the colour scheme, sends the back button to `goBack`, and mounts `root` at the window's size with the launch props (`{}` from the generated activity). |

| `RunOptions` field | Type | Default | Description |
|---|---|---|---|
| `colorScheme` | `'system' \| 'light' \| 'dark'` | `'system'` | `system`: `dark:` follows the phone's setting until the app sets `colorScheme(…)` itself; `light` / `dark`: that one, whatever the phone says. |

### `@c9up/orbit/pages`

| Export | Kind | Description |
|---|---|---|
| `serverPages` | function | The stack the server's pages are shown in; put it in a template. |
| `ServerPagesOptions` | interface | Options of `serverPages`. |

| Function | Signature | Description |
|---|---|---|
| `serverPages` | `serverPages(options: ServerPagesOptions): Stack` | A link or a visit asks the server for the next page object and shows the page it names as a screen; the back button goes through the router's history, and a covered page comes back as it was, without a request. |

| `ServerPagesOptions` field | Type | Default | Description |
|---|---|---|---|
| `server` | `string \| ServerConnection` | required | The server's origin (same rule as `connectServer`), or the connection `connectServer` made. |
| `pages` | `{ [name: string]: (props) => TemplateResult }` | required | The pages the server may name, by the name it renders them under. A name not listed throws `E_ORBIT_UNKNOWN_PAGE`. |
| `url` | `string` | `'/'` | The first page's path. |
| `stack` | `Omit<StackOptions, 'back'>` | | How screens change (`transition`, `duration`, `background`). |
| `loading` | `() => TemplateResult` | an empty view | Shown until the first page has arrived. |
| `failed` | `(error: unknown, retry: () => void) => TemplateResult` | the message and a Retry button | Shown when the server could not give a page; `retry` asks again. |
| `open` | `(url: string) => void` | | Opens a link off the server (another site, `mailto:`). |

## Errors

| Code | Raised when |
|---|---|
| [`E_ORBIT_NO_HOST`](/en/reference/errors#e-orbit-no-host) | `mount` ran before `useHost`, or the `NativeOrbit` module is not orbit's host. |
| [`E_ORBIT_COMMIT_FAILED`](/en/reference/errors#e-orbit-commit-failed) | The native host refused a commit; the message carries its report. What the commit carried is sent again with the next one. |
| [`E_ORBIT_TREE_TOO_DEEP`](/en/reference/errors#e-orbit-tree-too-deep) | The views nest more than 100 levels deep: the host refuses the commit before it lays it out. |
| [`E_ORBIT_SVG_VALUE`](/en/reference/errors#e-orbit-svg-value) | A value of an `<svg>` the host cannot read (a `NaN` length, unreadable path data, `points` or `transform`). That shape is left out (path data and `points` are drawn up to the error) and the rest drawn. Reported to `onError`, never thrown. |
| [`E_ORBIT_UNSUPPORTED_ELEMENT`](/en/reference/errors#e-orbit-unsupported-element) | An element has no native mapping (`select`, `canvas`, or `text` or a gradient inside an `svg`). |
| [`E_ORBIT_BLOCK_IN_TEXT`](/en/reference/errors#e-orbit-block-in-text) | A block element sits inside text. |
| [`E_ORBIT_INVALID_MOTION`](/en/reference/errors#e-orbit-invalid-motion) | `motion=${…}` is not an object of motion values. |
| [`E_ORBIT_INVALID_SCROLL_BINDING`](/en/reference/errors#e-orbit-invalid-scroll-binding) | `scroll-y=${…}` is not a motion value. |
| [`E_ORBIT_INVALID_COLOR`](/en/reference/errors#e-orbit-invalid-color) | A colour orbit cannot read. |
| [`E_ORBIT_INSECURE_IMAGE_URL`](/en/reference/errors#e-orbit-insecure-image-url) | `<img src>` uses plain http. Thrown for an address written in the template; for one from data (`src=${…}`) the image shows nothing and the error goes to `onError`. |
| [`E_ORBIT_IMAGE_SOURCE`](/en/reference/errors#e-orbit-image-source) | `<img src>` uses a scheme that is not an image source (`data:`, `javascript:`…), a scheme-relative address (`//host/a.png`) or a `file:` URL that does not decode. Thrown or reported as `E_ORBIT_INSECURE_IMAGE_URL` is. |
| [`E_ORBIT_DUPLICATE_KEY`](/en/reference/errors#e-orbit-duplicate-key) | Two elements of an `each` list share a key. |
| [`E_ORBIT_NO_SCREEN`](/en/reference/errors#e-orbit-no-screen) | `useScreen()` runs in a component no screen built. |
| [`E_ORBIT_STACK_SHOWN`](/en/reference/errors#e-orbit-stack-shown) | One stack is put in two places. |
| [`E_ORBIT_STYLE_TABLE`](/en/reference/errors#e-orbit-style-table) | `useStyles` got something other than a table `ream css:compile` wrote. |
| [`E_ORBIT_INSECURE_SERVER`](/en/reference/errors#e-orbit-insecure-server) | `connectServer` or `serverPages` is given plain http to a host that is neither this machine nor the emulator's. |
| [`E_ORBIT_UNKNOWN_PAGE`](/en/reference/errors#e-orbit-unknown-page) | The server named a page that `serverPages({ pages })` does not list. |
| [`E_ORBIT_FOREIGN_ORIGIN`](/en/reference/errors#e-orbit-foreign-origin) | A server connection was asked for a path that resolves to another origin. |
| [`E_ORBIT_SERVER_REQUEST_FAILED`](/en/reference/errors#e-orbit-server-request-failed) | The server answered a `json` request with an empty non-2xx response. |
| [`E_ORBIT_NO_XHR`](/en/reference/errors#e-orbit-no-xhr) | Server events need an `XMLHttpRequest`, and the platform has none. |
| [`E_ORBIT_OBJECT_URL_UNAVAILABLE`](/en/reference/errors#e-orbit-object-url-unavailable) | `URL.createObjectURL` was called with no platform `URL` to make blob URLs. A `TypeError`, as the standard `URL` raises. |
| [`E_ORBIT_INVALID_URL`](/en/reference/errors#e-orbit-invalid-url) | The standard `URL` was given a URL, or a base, that does not parse. A `TypeError`, as the standard `URL` raises. |
| [`E_ORBIT_UNSUPPORTED_ENCODING`](/en/reference/errors#e-orbit-unsupported-encoding) | The standard `TextDecoder` was given an encoding label other than UTF-8's. A `RangeError`, as the standard `TextDecoder` raises. |
| [`E_ORBIT_INVALID_DECODER_INPUT`](/en/reference/errors#e-orbit-invalid-decoder-input) | `TextDecoder.decode` was given something that is not an `ArrayBuffer` or a view on one. A `TypeError`, as the standard `TextDecoder` raises. |
| [`E_ORBIT_INVALID_ENCODED_DATA`](/en/reference/errors#e-orbit-invalid-encoded-data) | A `fatal` `TextDecoder` met bytes that are not valid UTF-8. A `TypeError`, as the standard `TextDecoder` raises. |
| [`E_ORBIT_INTERNAL`](/en/reference/errors#e-orbit-internal) | An invariant inside orbit broke: a bug in orbit. |

Every error is a class of the `errors` export, named by its code. The five raised by the standard `URL` and `TextDecoder` orbit installs stay a `TypeError` or a `RangeError` (`name` included), as those APIs raise, with the code added; the others are ream exceptions with a `status`.

## Migration

- `OrbitError` is gone: test `error.code`, or `error instanceof errors.E_ORBIT_*` with `import { errors } from '@c9up/orbit'`.
- `OrbitTypeError` and `OrbitRangeError` are gone: the `URL` and `TextDecoder` refusals are still a `TypeError` / `RangeError`, now `errors.E_ORBIT_INVALID_URL` and the like. `E_ORBIT_FOREIGN_ORIGIN` and `E_ORBIT_NO_XHR` are no longer a `TypeError`: catch them by their code.
- The `OrbitErrorCode` type is gone: `error.code` is a `string`.
- An `<img src=${…}>` whose address comes from data no longer throws `E_ORBIT_INSECURE_IMAGE_URL` or `E_ORBIT_IMAGE_SOURCE`: that image shows nothing and the error goes to `mount`'s `onError`. To act on it, pass `onError`. An address written in the template still throws.
- `<img src="//host/a.png">` is now refused with `E_ORBIT_IMAGE_SOURCE`; it used to load nothing from a local path. Write `https://`.
- A scheduled commit the host refuses no longer rejects a microtask unseen: it goes to `onError`, and what it carried is sent with the next commit.
- A view tree more than 100 levels deep is refused with `E_ORBIT_TREE_TOO_DEEP` (it used to crash the app past about 170). Limit how deep a template nests data that nests (replies to replies).
- A value of an `<svg>` the host cannot read no longer fails the commit: that shape is left out and reported as `E_ORBIT_SVG_VALUE`.
- `<input maxlength>` given a longer value keeps the value whole, as HTML does; `maxlength` limits typing only. It used to crash the app on Android.

## See also

- [Introduction](/en/guides/mobile/introduction)
- [Styles and screens](/en/guides/mobile/styles-and-screens)
- [Gestures and motion](/en/guides/mobile/gestures-and-motion)
- [Server-driven pages](/en/guides/mobile/server-driven)
- [Building the app](/en/guides/mobile/building)
- [orbit-clipboard](/en/reference/orbit-clipboard), [orbit-secure-store](/en/reference/orbit-secure-store), [robledo](/en/reference/robledo)
