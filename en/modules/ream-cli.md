# ream-cli

`@c9up/ream-cli` is the native Rust CLI for the ecosystem.

## Capabilities

- project scaffolding
- dev/build/start commands
- code generation (`make:*`)
- diagnostics (`doctor`, `info`)
- package setup (`ream configure`)

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
- **`web`** — the api skeleton plus a pre-wired session/cookie auth kit (AdonisJS web-kit parity). A fresh `web` app boots cookie-authenticated out of the box:
  - a kernel chaining blackhole (signed-CSRF + security headers) → body parser → cookie `SessionMiddleware` → auth middleware;
  - `config/auth.ts` defaulting to the session strategy (`defaultStrategy: 'session'`, with a `findUser` TODO stub);
  - `config/blackhole.ts` with signed CSRF enabled (`secret` read from `APP_KEY`);
  - `app/middleware/auth_middleware.ts` that populates `ctx.auth` from `ctx.session`;
  - reamrc providers for sigil + warden + blackhole;
  - `APP_KEY` in `.env` (placeholder — set a unique 32+ byte secret per app/environment) and a `#middleware/*` import alias.
- **`microservice`** / **`slim`** — lightweight, no HTTP auth kit.

## Notes

- very fast startup (native binary)
- command surface is still evolving

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

Output is line-prefixed per process, and when one stops the other is stopped with it — a Ctrl-C leaves no orphan watcher holding the output file. This is what spares an app from wiring `concurrently -k` itself, the same way `node ace serve` does in AdonisJS.

`ream build` runs the assets **first** and stops there if they fail, rather than shipping a dist with a stale stylesheet.

Both keys are optional: with no `assets`, `ream dev` and `ream build` behave exactly as before, with the server owning the terminal.
