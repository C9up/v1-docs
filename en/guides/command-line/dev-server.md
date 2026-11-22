# Development server

This guide covers the development server and hot reloading:

- The development server
- Hot module replacement
- What the browser is told
- Assets
- Meta files

## The development server

`ream dev` runs the server and whatever the project builds its assets with,
under one Ctrl-C. When it is listening it says where:

```
╭─────────────────────────────────────────────╮
│                                             │
│    Server address: http://localhost:3333    │
│    Mode: HMR                                │
│    Ready in: 412 ms                         │
│    Press h to show help                     │
│                                             │
╰─────────────────────────────────────────────╯
```

The address is the one that was **bound**, port included — a server that found
3333 taken and took 3334 says 3334. A host of `0.0.0.0` shows as `localhost`,
because every-interface is not a link that opens.

### While it runs

| key | |
|---|---|
| `r` | restart the server |
| `c` | clear the console |
| `o` | open the address in your browser |
| `h` | show this list |
| `Ctrl-C` / `Ctrl-D` | quit |

`o` is the server's to ask and `ream dev`'s to do: the application, which
knows the port it bound, hands the address over through a file `ream dev`
names in `REAM_DEV_OPEN`, and `ream dev` opens it with the platform's opener
(`xdg-open`, `open`, `url.dll` on Windows) — the application itself starts no
process.

The keys need a terminal. `ream dev` reads the one it runs in and passes each
key to the server through a pseudo-terminal of the server's own, so the
server answers them while staying out of the terminal's foreground: it can
never be stopped for reading it. With no terminal on its input — an agent,
CI, input piped in — or with `ream dev` sent to the background,
nothing is read, no child gets a terminal, and the banner leaves out
`Press h to show help`. `c` clears the screen only when the server writes to
the terminal directly, that is with no assets command beside it.

### What a change prints

```
invalidated app/billing/InvoiceController.ts     ← swapped in the running process
update start/services.ts                         ← the process restarted
```

Which one you get is decided by `hotHook.boundaries` in `package.json`:

```json
{
  "hotHook": {
    "boundaries": ["./app/controllers/**/*.ts", "./app/middleware/*.ts"],
    "restart": ["./config/*.ts"]
  }
}
```

A module reached through a **boundary** can be swapped: whoever imports it does
so dynamically and will ask for it again, so the next request gets the new
code. Anything else — a file preloaded at boot, a provider, `start/*.ts` — has
nobody who can re-import it, so the process restarts instead. That is not a
failure to hot-reload; a file that runs once at boot would not re-run its
effects anyway.

`restart` names what always restarts, whatever the graph says. Env files are on
it already.

The terminal is cleared before a restart, so what follows is the only thing on
screen. `ream dev --no-clear` keeps the previous logs.

### When a save does nothing

If an edit changes nothing on screen, the file is not part of the running
process's import graph — nothing has imported it yet. Saving a file the app
never loaded produces no line, by design.

### The debug toolbar

Every HTML page served in development carries a bar at the bottom. A page that
scrolls is pushed up by the bar's height, so nothing at its bottom ends up
underneath it. A page whose shell fills the viewport and scrolls inside
(`h-screen` with an inner scrolling element) is left as it is — padding it
would only make the document scroll — and the bar's height is available as
`--ream-toolbar-height` on `<html>`, for such a shell to leave room for it
(`h-[calc(100vh-var(--ream-toolbar-height,0px))]`). Each item has a summary on
hover and opens a panel on click:

| Item | On the bar | In the panel |
|---|---|---|
| request | status, method, route | route, pattern, controller, params, query string, body, headers, cookie names, session, user, response status and headers |
| time | total duration | a timeline: the request, each query, each log line, each event, each cache operation |
| mem | heap used | heap used and total, resident memory, growth during the request |
| db | statements and their total time | each statement with its bindings, model, method, connection and start time; duplicates marked and countable, failed ones in red; filter, slowest first, copy |
| logs | errors, else warnings, else lines | each line with its level and context; filter by level and text |
| events | events emitted | each event with its payload; filter by name |
| cache | operations and their total time | hits (graced ones apart), misses, writes, deletes, clears and expirations; a table per store when there are several; each operation with its key, store, duration, TTL and value; filter by key or store |
| mail | messages | each `mail:*` event with its payload |
| ajax | requests the page made | each `fetch` and `XMLHttpRequest` with method, status and time; click one to show its profile on the bar |
| ream | framework version | Node.js version, environment, platform, process |

Payloads are capped in depth and size, and the value of any key that names a
secret (`password`, `token`, `authorization`, `cookie`, `apiKey`…) is replaced
by `[redacted]`. Cookies are listed by name only.

The bar remembers whether it is open, which panel was showing, its height (drag
the top edge) and whether it was hidden (`✕`, then the small `R` button brings
it back). `↗` opens the full profile.

```
/__ream/profiler                 every request kept, newest first
/__ream/profiler/<token>         one request, every panel
```

Each response also carries its token in an `X-Debug-Token` header, which is how
the bar follows the page's own `fetch` calls, and how a client that is not a
page — an API call, a test — finds the profile of the request it just made.

The bar is a script and a stylesheet served from `/__ream/profiler/_assets/`,
with nothing inline, so a `Content-Security-Policy` of `default-src 'self'`
runs and styles it.

The last 50 requests are kept, in memory, and the bar is injected only in
development. A production response is byte-for-byte what the handler produced.

#### The query panel

Queries reach the profiler as `db:query` events on the application's emitter.
In development, atlas reports every statement, so the panel needs no
configuration. A connection's `debug` flag now only decides what
`prettyPrintDebugQueries` prints in the terminal. A data layer other than atlas
gets the same panel by emitting the same event.

#### The log panel

Log lines arrive the same way, as `log:line`. `@c9up/spectrum` bridges its own
registry onto the emitter when the container has one, so an application logging
through `ctx.logger` gets the panel with no configuration. The panel is absent
from a request that logged nothing.

#### The events panel

Every event emitted while the request ran is listed, mail included, read
synchronously as it is emitted so each one lands on the request that caused it.
Queries, log lines and cache operations have their own panels and are not
repeated there.

#### The cache panel

Cache operations arrive as `cache:hit`, `cache:miss`, `cache:written`,
`cache:deleted`, `cache:cleared` and `cache:expire` on the application's
emitter. `@c9up/echo` emits them on the container's emitter, so an application
on echo gets the panel with no configuration. The panel is absent from a
request that never touched the cache.

echo reports how long each operation took (`duration`, in milliseconds) and,
on a write, how long the entry lives (`ttl`, in seconds, `null` for no expiry).
A `getOrSet` that misses reports its factory's time in its miss, and its write
on its own, so the total does not count the factory twice. Another cache gets
the same panel by emitting the same events; without `duration` its operations
are still counted and listed, untimed.

The counts stay true past the 300 operations the panel lists. A cached value is
capped like any payload, and a value stored under a key that names a secret
(`oauth:token:42`) is shown as `[redacted]`.

## Hot module replacement

`ream dev` replaces a changed module inside the running process instead of
restarting it. Editing a controller no longer replays the whole boot —
providers, connections, config — to pick up one edited function, and the page in
your browser reloads on its own.

It is on when the application has `hot-hook` installed, and a project without it
keeps the plain restart-on-change behaviour it had:

```bash
pnpm add -D hot-hook
```

Then declare what may be swapped, in `package.json`:

```json
{
  "hotHook": {
    "boundaries": [
      "./app/controllers/**/*.ts",
      "./app/middleware/*.ts"
    ]
  }
}
```

`ream new` writes both for you.

On a modular layout — one directory per bounded context — the globs name the
same two things through it:

```json
{
  "hotHook": {
    "boundaries": [
      "./app/modules/*/controllers/*.ts",
      "./app/modules/*/middleware/*.ts"
    ]
  }
}
```

### Your routes have to import lazily

This is the step that decides whether any of the above does anything, and it is
easy to skip because nothing fails when you do.

```ts
// Restarts on every save: the controller is part of the route file's own graph.
import CommentController from './controllers/CommentController.js'
router.post('/comments', [CommentController, 'create'])

// Swappable: the controller is reached only when a request arrives.
router.post('/comments', [() => import('./controllers/CommentController.js'), 'create'])
```

The router has always accepted both. Middleware is the same: `kernel.use()`
takes `() => import('#modules/x/middleware/Y.js')`.

**Boundaries name entry modules, and only entry modules.** A module can be
swapped only if it is reached by a *dynamic* import. A file that matches a
boundary and is imported statically anywhere is reported as
`shouldBeReloadable` and forces a FULL restart — so a `**` glob wide enough to
also catch the services and entities an entry imports makes every change
restart the server, and it looks exactly like hot reloading being broken.

### Telling it apart from a restart

A restart also shows your change, so the page updating proves nothing. The only
test that separates them is the process id:

```bash
pgrep -f bin/server.ts     # note it, edit a controller, run it again
```

Same id, changed output: the module was swapped. New id: the server restarted,
and something above is not in place yet.

A change outside the boundaries — a route file, a provider, `.env` — restarts
the server, as it must: those are read once while the application assembles.

### What the browser does

Pages served in development carry a small script that reloads them when the
server changes underneath: a module swapped in place, or a restart. It polls a
token rather than holding a socket, so a restart is detected by the token
changing rather than by a connection that has to be re-established.

Nothing is injected outside development, and the script carries the request's
CSP nonce, so an application with a nonce-based policy needs no exception for
it.

## What the browser is told

The development server injects a small script into HTML responses and pushes to
it over Server-Sent Events. A hot swap or a restart changes a token, the page
sees the new one and reloads.

Upstream gets this from Vite's websocket, and without Vite it gets nothing: the
assembler logs `invalidated <file>` in the terminal and the browser is never
told. This needs no bundler, because the server already speaks SSE.

The stream is answered BEFORE any application middleware. It is framework
plumbing, its content depends on no user, no session and no body, and an
application is free to put authentication in `server.use([...])` — which many
do, since it has to run before routing. Behind that stack the endpoint paid for
the whole pipeline on every message.

It reloads on a token CHANGE, never on a dropped connection: a restarting
server is unreachable for a moment, and reloading then shows the browser's
error page. `EventSource` reconnects by itself, and the server greets the new
connection with its token — after a restart a different boot id, so the reload
happens once the server can actually serve it.

## Assets

`ream dev` runs the server and whatever builds your assets as one thing, and `ream build` builds the assets before TypeScript. Declare them in `reamrc.ts`:

```ts
export default {
  assets: {
    devServer: { command: 'pnpm', args: ['css:watch'] },
    build: { command: 'pnpm', args: ['css'] },
  },
}
```

Output is line-prefixed per process, and when one stops the other is stopped with it — a Ctrl-C leaves no orphan watcher holding the output file, and a command that cannot start takes down whatever had already started. This is what spares an app from wiring `concurrently -k` itself.

Each process gets its own stdin: a pipe `ream dev` keeps open and never writes to, which ends when `ream dev` does. A watcher that stops at the end of its input — `tailwindcss --watch` does, so as not to outlive whoever started it — keeps watching for the whole session, whether `ream dev` runs in a terminal or with its output sent to a file, and still exits on its own if `ream dev` is killed. No `--watch=always` needed. The terminal itself stays with `ream dev`.

`ream build` runs the assets **first** and stops there if they fail, rather than shipping a dist with a stale stylesheet.

Both keys are optional: with no `assets`, `ream dev` and `ream build` behave exactly as before, with the server owning the terminal.

## Meta files

Translations, view templates, a mail signature: files the application owns that
no module ever imports. Nothing points at them, so the build has no way to know
they exist — and without being told it emits a `dist/` that boots and then
cannot find them.

Declare them in `reamrc.ts`:

```ts
export default {
  metaFiles: [
    { pattern: 'resources/lang/**/*.{json,yaml,yml}', reloadServer: false },
    { pattern: 'resources/views/**/*.edge', reloadServer: false },
  ],
}
```

`ream build` copies every match into the output, keeping its path: a loader
configured with `../resources/lang/` finds it from `dist/` because
`resources/lang/fr.json` landed at `dist/resources/lang/fr.json`.

`reloadServer` decides what a change does in DEVELOPMENT, and the default is
the interesting half:

- **`false`** — the file ships, and an edit does nothing. This is what
  translations want: they are read once at boot, so the change is seen on the
  next start.
- **`true`** — the development server restarts on a change. Ask for this only
  when the file is genuinely read at boot and you would otherwise be chasing a
  stale value.

The flag is required at every call site rather than defaulted: whether an edit
costs a restart is the whole decision the entry exists to record.

A package registers its own from `configure()`, so an application that installs
it gets the entry without writing one:

```ts
await codemods.addMetaFile('resources/lang/**/*.{json,yaml,yml}', false)
```

The glob dialect is the one the hot-reload boundaries already use — `*` inside
a segment, `**` across segments, `?` for one character — plus `{a,b}`
alternation. The CLI and the development loader match it with the same rules,
so an entry cannot copy at build time and never fire in development.
