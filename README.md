# Ream Documentation

VitePress documentation for the Ream framework. English + French.

## Development

```bash
pnpm install
pnpm dev
```

## Structure

- `en/` — English documentation
- `fr/` — French documentation
- `.vitepress/` — VitePress configuration

## Ecosystem

### Core

| Package | What it is | Repository |
|---|---|---|
| `@c9up/ream` | HTTP kernel + IoC + lifecycle | [C9up/ream](https://github.com/C9up/ream) |
| `@c9up/ream-cli` | Rust-native CLI (`ream`) — scaffold, generators, migrate, template | [C9up/ream-cli](https://github.com/C9up/ream-cli) |

### Data & validation

| Package | What it is | Repository |
|---|---|---|
| `@c9up/atlas` | ORM — entities, repository, query builder, schema/migrations (Rust compiler) | [C9up/atlas](https://github.com/C9up/atlas) |
| `@c9up/atom` | Exact decimal arithmetic (Rust + NAPI + WASM) | [C9up/atom](https://github.com/C9up/atom) |
| `@c9up/chronos` | Date/time + recurrence (Rust + NAPI + WASM) | [C9up/chronos](https://github.com/C9up/chronos) |
| `@c9up/rune` | Schema validation engine (Rust + TS fallback) | [C9up/rune](https://github.com/C9up/rune) |
| `@c9up/rosetta` | i18n + ICU MessageFormat (Rust + NAPI + WASM) | [C9up/rosetta](https://github.com/C9up/rosetta) |

### Auth & security

| Package | What it is | Repository |
|---|---|---|
| `@c9up/warden` | Auth — JWT / session / API-key strategies + OAuth (GitHub, Google) | [C9up/warden](https://github.com/C9up/warden) |
| `@c9up/sigil` | Password hashing — argon2 / bcrypt / scrypt (Rust) | [C9up/sigil](https://github.com/C9up/sigil) |
| `@c9up/blackhole` | Security filter — XSS / CSRF / rate-limit (Rust, ammonia-based) | [C9up/blackhole](https://github.com/C9up/blackhole) |

### HTTP & UI

| Package | What it is | Repository |
|---|---|---|
| `@c9up/aurora` | Reactive SSR — signals, html\`\`, hydrate | [C9up/aurora](https://github.com/C9up/aurora) |
| `@c9up/photon` | Inertia-style SSR + SPA hydration (React / Vue / Svelte adapters) | [C9up/photon](https://github.com/C9up/photon) |
| `@c9up/inker` | Server-side templating engine (lex / parse / render) | [C9up/inker](https://github.com/C9up/inker) |

### Infrastructure

| Package | What it is | Repository |
|---|---|---|
| `@c9up/archive` | File storage — Local / S3 / GCS + signed URLs + static middleware | [C9up/archive](https://github.com/C9up/archive) |
| `@c9up/bay` | Job queue — memory / Redis drivers + retry + lease | [C9up/bay](https://github.com/C9up/bay) |
| `@c9up/echo` | Cache — memory / Redis drivers | [C9up/echo](https://github.com/C9up/echo) |
| `@c9up/spectrum` | Structured logging — console / file channels + Rust bridge | [C9up/spectrum](https://github.com/C9up/spectrum) |
| `@c9up/ream/events` | Event bus + wildcard subscribers (Rust + NAPI) — part of ream core | [C9up/ream](https://github.com/C9up/ream) |
| `@c9up/relay` | Realtime — Hub + SignalR adapter | [C9up/relay](https://github.com/C9up/relay) |
| `@c9up/rover` | Mail — Resend / Mailgun / SES / SMTP + webhooks + send-later via bay | [C9up/rover](https://github.com/C9up/rover) |
| `@c9up/nova` | Web Push (PWA + VAPID + subscription store) | [C9up/nova](https://github.com/C9up/nova) |

### Admin & tooling

| Package | What it is | Repository |
|---|---|---|
| `@c9up/station` | Admin scaffolding — defineResource + CRUD + policies + audit | [C9up/station](https://github.com/C9up/station) |
| `@c9up/ream-mcp` | Model Context Protocol server (bmad / docs / inker / migration / security / station tools) | [C9up/ream-mcp](https://github.com/C9up/ream-mcp) |

### Testing

| Package | What it is | Repository |
|---|---|---|
| `@c9up/helix` | Test runner + fakes for every package (`helix` CLI + Vitest-compatible) | [C9up/helix](https://github.com/C9up/helix) |

### Apps & workspace

| Repo | What it is |
|---|---|
| [C9up/kitchen-sink](https://github.com/C9up/kitchen-sink) | Reference app exercising every module — installable via `ream template kitchen-sink` |
| [C9up/ream-dev](https://github.com/C9up/ream-dev) | Dev workspace (pnpm + Rust + Cargo) with all packages as submodules |

## License

MIT
