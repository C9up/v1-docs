# ream-cli

`@c9up/ream-cli` is the native Rust CLI for the ecosystem.

## Capabilities

- project scaffolding (`new`, `template`)
- dev/build/start/test, and a `repl` with the app booted
- code generation (`make:*`), with per-project stubs (`stubs:publish`)
- the application's own commands: any name the binary does not define is
  dispatched to its console kernel, and `list` shows both sets as one
- diagnostics (`doctor`, `info`, `inspect`)
- package setup (`add`, `configure`), key generation (`generate:key`), MCP
  registration (`mcp`)

## Example

```bash
ream new my-app
ream dev
ream make:controller order Order
ream doctor
```

## Templates

`ream new` prompts for a template. `web` and `api` now differ meaningfully:

- **`api`** — minimal: server entry, a root route, a timing kernel. No auth.
- **`web`** — the api skeleton plus a pre-wired session/cookie auth kit. A fresh `web` app boots cookie-authenticated out of the box:
  - a kernel chaining blackhole (signed-CSRF + security headers) → body parser → cookie `SessionMiddleware` → auth middleware;
  - `config/auth.ts` defaulting to the session strategy (`defaultStrategy: 'session'`, with a `findUser` TODO stub);
  - `config/blackhole.ts` with signed CSRF enabled (`secret` read from `APP_KEY`);
  - `app/middleware/auth_middleware.ts` that populates `ctx.auth` from `ctx.session`;
  - reamrc providers for sigil + warden + blackhole;
  - a freshly generated `APP_KEY` in `.env` — every scaffolded app gets its own, never a shared placeholder — and a `#middleware/*` import alias.
- **`microservice`** / **`slim`** — lightweight, no HTTP auth kit.

## Notes

- very fast startup (native binary)
- the full, always-current surface is `ream --help`; the reference is
  [the CLI page](/en/cli/ream)

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
