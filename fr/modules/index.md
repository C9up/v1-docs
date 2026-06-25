# Modules Overview

Cette page liste l'etat des modules de l'ecosysteme.

## Statut actuel

| Module | Package | Statut | Notes |
|---|---|---|---|
| Ream (Core) | `@c9up/ream` | Présent | Section detaillee: `/fr/ream/` |
| Atlas | `@c9up/atlas` | Présent | Section detaillee: `/fr/atlas/` |
| Events | `@c9up/ream/events` | Core | Event bus — partie du core ream |
| Rune | `@c9up/rune` | Présent | Validation |
| Sigil | `@c9up/sigil` | Présent | Hachage de mots de passe canonique (argon2id, bcrypt, scrypt — TS + Rust N-API) |
| Warden | `@c9up/warden` | Présent | Auth (délègue le hachage de mots de passe à Sigil — Epic 40) |
| Spectrum | `@c9up/spectrum` | Présent | Logs |
| Photon | `@c9up/photon` | Présent | Frontend/SSR + hydratation client + router SPA-nav (44.1) + injection SEO/`<head>` (44.2) |
| Aurora | `@c9up/aurora` | Présent | Runtime UI réactif — DOM via tagged-templates + signaux + SSR + dist isomorphe (pas de bundler côté app) |
| Comet | `@c9up/comet` | Présent | Protocole JSON-RPC 2.0 agnostique + client isomorphe à transport injectable (aurora le branche côté navigateur, le `RpcRouter` de ream construit le serveur dessus) |
| Relay | `@c9up/relay` | Présent | Realtime SSE + WebSocket Hub + SignalR (renomme depuis `@c9up/raytrace` dans l'Epic 45) |
| Echo | `@c9up/echo` | Présent | Cache (rename de Nebula) |
| Bay | `@c9up/bay` | Présent | Queue/Jobs (rename de Comet) |
| Blackhole | `@c9up/blackhole` | Présent | Middleware d'assainissement XSS du body |
| Rosetta | `@c9up/rosetta` | Présent | Module i18n dédié avec fallback de locale |
| Chronos | `@c9up/chronos` | Présent | Date/Time + récurrence RRULE |
| Atom | `@c9up/atom` | Présent | Arithmétique décimale exacte (TS + Rust N-API) |
| Station | `@c9up/station` | Manquant | Admin scaffolding |
| Inker | `@c9up/inker` | Manquant | Templates |
| Archive | `@c9up/archive` | Présent | Stockage de blobs avec drivers S3 + mémoire |
| Nova | `@c9up/nova` | Présent | Web Push (VAPID + abonnement + livraison `nova.push()` via `web-push` + template de migration pour stockage durable + snippet driver Atlas dans la doc + scaffold Service Worker + intégration test `helix.nova.fake`) |
| Helix | `@c9up/helix` | Présent | Test runner — `TestClient`, workers parallèles (`--threads`), utilisé par chaque e2e du kitchen-sink |
| Rover | `@c9up/rover` | Présent | Transport mail — SMTP + log + transports pluggables (rename de Spark) |

Chaque ligne du tableau ci-dessus a une page dédiée — choisis-la dans la sidebar **Modules**.
