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

**Boundaries name entry modules, and only entry modules.** A module can be
swapped only if it is reached by a *dynamic* import — which is what a route
handler or a middleware reference is. A `**` glob wide enough to also catch the
components an entry imports statically makes those "wrongly imported", every
change falls back to a full restart, and it looks exactly like hot reloading
being broken.

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
