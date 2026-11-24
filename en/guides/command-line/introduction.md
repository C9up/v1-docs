# Introduction

This guide covers the ream command line:

- Install
- Project Management
- Package Configuration
- Diagnostics
- Built with Rust
- Capabilities
- Example
- Templates
- Notes

Rust-native command-line tool for the Ream framework. Instant startup (<10ms), no Node.js boot penalty.

## Install

```bash
npm install -g @c9up/ream-cli
```

## Project Management

```bash
ream new my-app           # Create a new project (interactive)
ream new my-app --yes     # …taking the defaults, with no terminal needed
ream dev                   # Start development server
ream build                 # Compile TypeScript
ream start                 # Run production server
```

## Package Configuration

> If you also want to install the package in one step, see [Add a Package](/en/guides/command-line/generators#add-a-package).

```bash
ream configure @c9up/atlas     # DB config, provider, env vars
ream configure @c9up/warden    # JWT config, provider
ream configure @c9up/photon    # frontend rendering config
ream configure @c9up/some-pkg --transports=smtp  # forward flags to configure()
```

> **Tailwind?** Tailwind is not a Ream-managed package. Install it directly into your Vite stack: `pnpm add -D tailwindcss @tailwindcss/vite`, then add `tailwindcss()` to your `vite.config.ts` plugins. See `/en/guides/frontend/tailwind` for the full recipe.

## Diagnostics

```bash
ream doctor    # Environment health checks
ream info      # Version + environment info
```

`ream doctor` checks Node, pnpm, `.env`, `reamrc.ts`, `package.json`,
`tsconfig.json` — and `@swc-node/register`.

That last one matters more than it looks. `ream dev`, `build`, `console`,
`test`, `inspect`, `repl`, `migration:*` and `schedule:*` all run your
TypeScript through that loader, resolved from **your** project's
`node_modules`: the CLI is a Rust binary and ships no JavaScript dependencies
of its own. Without it those commands stop, while the generators keep working
— so a project can look healthy while two thirds of the CLI is unusable.

`ream new` puts it in the generated `package.json`. For a project created
before, `doctor` names the fix, and each affected command refuses up front
rather than dying on Node's `ERR_MODULE_NOT_FOUND`:

```
[XX] @swc-node/register: missing — `ream dev`, `build`, `console`, `test`,
     `inspect`, `repl`, `migration:*` and `schedule:*` cannot run
     Fix: Run `pnpm add -D @swc-node/register`
```

Declared in `package.json` but absent from `node_modules` is a different
sentence — the manifest is right and the tree is stale, so it says
`pnpm install` rather than `pnpm add`.

## Built with Rust

The `ream` binary is a compiled Rust executable. Code generation, scaffolding, configuration, and diagnostics run in pure Rust with no Node.js overhead. Only `ream dev`, `ream start`, `ream build`, `ream test`, `ream repl`, `ream inspect` and the dispatch to the application's own commands spawn a Node.js process.

Binary size: ~700KB.

`@c9up/ream-cli` is the native Rust CLI for the ecosystem.

## Capabilities

- project scaffolding (`new`, `template`)
- dev/build/start/test, and a `repl` with the app booted
- the application's own commands: any name the binary does not define is
  dispatched to its console kernel, and `list` shows both sets as one. The
  `make:*` generators and `eject` reach it that way too — they are commands of
  `@c9up/ream`, not of this binary
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

- **`api`** — minimal: server entry, a root route, a kernel with a timing middleware and the body parser. No auth. Blackhole in its two halves: the server half (`@c9up/blackhole/server_middleware`) on every request, and the router half after the body parser. `config/blackhole.ts` turns on `X-Frame-Options: DENY`, HSTS and `nosniff`, turns CSRF and the content security policy off (an API authenticates with tokens and serves no HTML), and allows no CORS origin until you list one.
- **`web`** — the api skeleton plus a pre-wired session/cookie auth kit. A fresh `web` app boots cookie-authenticated out of the box:
  - a kernel with blackhole's server half (`@c9up/blackhole/server_middleware`) on the server tier, so a 404 also carries the protective headers and counts for the rate limit, and on the router tier body parser → cookie `SessionMiddleware` → blackhole's router half (signed CSRF) → `@c9up/warden/silent-auth`. The order is load-bearing: blackhole runs after the body parser because a form post carries its CSRF token in the body, and after the session because the token is bound to it (with a session config, blackhole before the session refuses every request with `E_BLACKHOLE_SESSION_NOT_READY`); the session runs before silent auth so the session guard finds the signed-in user;
  - `config/auth.ts` defaulting to the session strategy (`defaultStrategy: 'session'`, with a `findUser` TODO stub);
  - `config/blackhole.ts` with signed CSRF enabled (`secret` read from `APP_KEY`);
  - silent auth on every route: it reads who is signed in, records the guard that vouched for the user, and refuses nobody. A route chained with `.guard('session')` then answers 401 to an anonymous request and runs for a signed-in user;
  - `app/middleware/auth_middleware.ts`, the middleware that refuses a request nobody is signed in to, registered as the named `auth` middleware in `start/kernel.ts` (`.use(middleware.auth())` on a route);
  - reamrc providers for sigil + warden + blackhole;
  - a freshly generated `APP_KEY` in `.env` — every scaffolded app gets its own, never a shared placeholder — and a `#middleware/*` import alias.
- **`microservice`** / **`slim`** — lightweight, no HTTP auth kit.

## Notes

- very fast startup (native binary)
- the full, always-current surface is `ream --help`; the reference is
  [the CLI page](/en/guides/command-line/introduction)
