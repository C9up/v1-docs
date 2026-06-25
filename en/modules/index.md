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
| Warden | `@c9up/warden` | Present | Auth (delegates password hashing to Sigil — Epic 40) |
| Spectrum | `@c9up/spectrum` | Present | Logging |
| Photon | `@c9up/photon` | Present | Frontend/SSR + client hydration + SPA-nav router (44.1) + SEO/`<head>` injection (44.2) |
| Aurora | `@c9up/aurora` | Present | Reactive UI runtime — tagged-template DOM + signals + SSR + isomorphic dist (no app-side bundler) |
| Comet | `@c9up/comet` | Present | Agnostic JSON-RPC 2.0 protocol + isomorphic, transport-injectable client (aurora binds it browser-side, ream's `RpcRouter` builds the server on it) |
| Relay | `@c9up/relay` | Present | Realtime SSE + WebSocket Hub + SignalR (renamed from `@c9up/raytrace` in Epic 45) |
| Echo | `@c9up/echo` | Present | Cache (Nebula rename) |
| Bay | `@c9up/bay` | Present | Queue/Jobs — memory / Redis drivers + retry + lease |
| Blackhole | `@c9up/blackhole` | Present | XSS-stripping body middleware |
| Rosetta | `@c9up/rosetta` | Present | Dedicated i18n module with locale fallback |
| Chronos | `@c9up/chronos` | Present | Date/Time + RRULE recurrence |
| Atom | `@c9up/atom` | Present | Exact decimal arithmetic (TS + Rust N-API) |
| Station | `@c9up/station` | Missing | Admin scaffolding |
| Inker | `@c9up/inker` | Missing | Templates |
| Archive | `@c9up/archive` | Present | Blob storage with S3 + memory drivers |
| Nova | `@c9up/nova` | Present | Web Push (VAPID + subscription + `nova.push()` delivery via `web-push` + durable-storage migration template + Atlas driver snippet in docs + Service Worker scaffold + `helix.nova.fake` test integration) |
| Helix | `@c9up/helix` | Present | Test runner — `TestClient`, parallel workers (`--threads`), used by every kitchen-sink e2e |
| Rover | `@c9up/rover` | Present | Mail transport — SMTP + log + pluggable transports (Spark rename) |

Each row in the table above has a dedicated page — pick it from the **Modules** sidebar.
