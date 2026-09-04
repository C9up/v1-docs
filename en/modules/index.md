# Modules Overview

This page lists the current status of ecosystem modules.

## Current status

| Module | Package | Status | Notes |
|---|---|---|---|
| Ream (Core) | `@c9up/ream` | Present | Detailed section: `/en/ream/` |
| Atlas | `@c9up/atlas` | Present | Detailed section: `/en/atlas/` |
| Events | `@c9up/ream/events` | Core | Event bus — part of ream core |
| Rune | `@c9up/rune` | Present | Validation |
| Sigil | `@c9up/sigil` | Present | Canonical password hashing (argon2id, bcrypt, scrypt — TS + Rust N-API) |
| Warden | `@c9up/warden` | Present | Authentication — delegates password hashing to Sigil |
| Spectrum | `@c9up/spectrum` | Present | Logging |
| Photon | `@c9up/photon` | Present | Frontend/SSR — client hydration, SPA router, SEO injection into `<head>` |
| Aurora | `@c9up/aurora` | Present | Reactive UI runtime — tagged-template DOM + signals + SSR + isomorphic dist (no app-side bundler) |
| Comet | `@c9up/comet` | Present | Agnostic JSON-RPC 2.0 protocol + isomorphic, transport-injectable client (aurora binds it browser-side, ream's `RpcRouter` builds the server on it) |
| Relay | `@c9up/relay` | Present | Realtime — SSE, WebSocket hub, SignalR |
| Echo | `@c9up/echo` | Present | Cache — memory, file, Redis through Quasar |
| Bay | `@c9up/bay` | Present | Queue/Jobs — memory / Redis drivers + retry + lease |
| Blackhole | `@c9up/blackhole` | Present | XSS-stripping body middleware |
| Rosetta | `@c9up/rosetta` | Present | Dedicated i18n module with locale fallback |
| Chronos | `@c9up/chronos` | Present | Date/Time + RRULE recurrence |
| Atom | `@c9up/atom` | Present | Exact decimal arithmetic (TS + Rust N-API) |
| Station | `@c9up/station` | Present | Admin panel — consumes the Ream universe through the container |
| Inker | `@c9up/inker` | Present | Template engine |
| Archive | `@c9up/archive` | Present | Blob storage with S3 + memory drivers |
| Nova | `@c9up/nova` | Present | Web Push (VAPID + subscription + `nova.push()` delivery via `web-push` + durable-storage migration template + Atlas driver snippet in docs + Service Worker scaffold + `helix.nova.fake` test integration) |
| Helix | `@c9up/helix` | Present | Test runner — `TestClient`, parallel workers (`--threads`), used by every kitchen-sink e2e |
| Quasar | `@c9up/quasar` | Present | Redis connections — named connections, pub/sub on its own socket, health checks |
| Helix plugin | `@c9up/helix-plugin-ream` | Present | The ream↔helix bridge — `apiClient()` plugin + `ream test` runner |
| Rover | `@c9up/rover` | Present | Mail transport — SMTP, log, pluggable transports |
| Transit | `@c9up/transit` | Present | Federated sign-in — SAML 2.0, LDAP, generic OpenID Connect, Sign in with Apple, OAuth1/OAuth2 and the providers that speak them |
| Vellum | `@c9up/vellum` | Present | PDF — render to images, read, merge/split/rotate, stamp, sign and verify |
| Nebula | `@c9up/nebula` | Present | Component set — shadcn/ui ported to Aurora, organised as atomic design, copy-the-source |
| Eon | `@c9up/eon` | Present | Time series — TDengine connection, schemaless writes, queries |
| Ream MCP | `@c9up/ream-mcp` | Present | Model Context Protocol server — grounded docs, introspection, scaffolding for agents |
| Ream CLI | `@c9up/ream-cli` | Present | The `ream` binary — scaffolding, dev, doctor (Rust) |

Each row in the table above has a dedicated page — pick it from the **Modules** sidebar.
