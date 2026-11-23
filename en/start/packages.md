# The packages

Every package installs and works on its own: a ream application takes the ones it needs, and most of them run in another Node.js application too. Each has a reference page listing its whole API, and a guide when it has one.

![The packages of ream by domain. Core: ream, ream-cli, lumen. APIs: rune, comet, neutrino. Frontend: aurora, photon, inker, nebula, ephemeris. Data: atlas, quasar, eon. Auth and security: warden, transit, visa, sigil, blackhole. Realtime: relay. Mobile: orbit, orbit-clipboard, orbit-secure-store, robledo. Services: archive, atom, bay, chronos, echo, eclipse, goldstone, nova, parsec, prism, rosetta, rover, spectrum, station, vellum. Testing and tools: helix, helix-plugin-ream, ream-mcp. Every package installs and works on its own.](/images/packages-en.webp){width=640 height=640 loading=lazy}

## Core

- **`@c9up/ream`**: The framework core: the application and its lifecycle, the container, the environment, the HTTP server with its router, request, response, sessions and body parser, events, the scheduler, the console, and the test client. Guide: [Application](/en/guides/concepts/application) · [Reference](/en/reference/ream)
- **`@c9up/lumen`**: Terminal output with no dependencies: colours, a logger with a fixed vocabulary, tables, boxes, steps and task reports, plus a raw mode that makes all of it assertable. Guide: [Terminal output](/en/guides/command-line/terminal-output) · [Reference](/en/reference/lumen)
- **`@c9up/ream-cli`**: The `ream` binary, written in Rust: it creates projects, installs and configures packages, runs the dev server, builds, tests, and forwards every other command to the application's console. Guide: [Introduction](/en/guides/command-line/introduction) · [Reference](/en/reference/ream-cli)

## APIs

- **`@c9up/rune`**: Validation: fluent rule chains, object schemas with inferred types, transforms, custom and async rules, database rules, file checks, error messages and JSON Schema output, run by a native Rust engine. Guide: [Validating input](/en/guides/basics/validation/) · [Reference](/en/reference/rune)
- **`@c9up/comet`**: The JSON-RPC 2.0 protocol (envelopes, parsing, error codes) and a client that runs in the browser and in Node over a transport you inject. Guide: [JSON-RPC clients](/en/guides/apis/json-rpc-clients) · [Reference](/en/reference/comet)
- **`@c9up/neutrino`**: Protocol Buffers and unary gRPC, so that non-JS clients share one `.proto` contract with the server; gRPC calls are served on the application's HTTP port. Guide: [Protobuf and gRPC](/en/guides/digging-deeper/grpc) · [Reference](/en/reference/neutrino)

## Frontend

- **`@c9up/aurora`**: Components written as tagged templates over signals, rendered to HTML on the server and hydrated in the browser, with no build step. Guide: [Introduction](/en/guides/frontend/aurora/) · [Reference](/en/reference/aurora)
- **`@c9up/photon`**: Server-driven pages rendered by React, Vue or Svelte: the server picks the page component and its props, the client hydrates it and navigates without full reloads. Guide: [Introduction](/en/guides/frontend/photon/) · [Reference](/en/reference/photon)
- **`@c9up/inker`**: Server-side templates in `.inker` files, parsed in Rust, rendered with HTML escaping by default. Guide: [Templates](/en/guides/frontend/templates/) · [Reference](/en/reference/inker)
- **`@c9up/nebula`**: Component set: shadcn/ui ported to aurora, organised as atomic design, copied into your app as source. [Nebula section](/en/nebula/)
- **`@c9up/ephemeris`**: Schema.org structured data: the whole vocabulary typed, a page's entities linked into one `@graph`, JSON-LD that cannot break out of its script tag, and Google's rich-result requirements checked as each node is built. Guide: [Structured data](/en/guides/frontend/structured-data) · [Reference](/en/reference/ephemeris)

## Data layer

- **`@c9up/atlas`**: The ORM: entities and models, repositories, a query builder compiled to SQL by a Rust engine, migrations, a schema builder, seeders, factories and test helpers, on PostgreSQL, MySQL and SQLite. Guide: [ORM](/en/guides/database/orm/) · [Reference](/en/reference/atlas)
- **`@c9up/quasar`**: Redis connections for a ream application: named connections opened on first use, pub/sub on a separate socket, health checks and a clean shutdown. Guide: [Redis](/en/guides/database/redis) · [Reference](/en/reference/quasar)
- **`@c9up/eon`**: The time-series layer on TDengine: super-table entities, columnar ingest, a windowed query builder, migrations, change-data subscriptions and test helpers, over a WebSocket connection to taosAdapter. Guide: [Time series](/en/guides/database/time-series/) · [Reference](/en/reference/eon)

## Auth and security

- **`@c9up/warden`**: Authentication and authorization: session, JWT, access-token and HTTP Basic guards, route decorators, a bouncer with abilities and policies, scoped roles and permissions, remember-me and refresh tokens, multi-factor authentication (TOTP, backup codes, one-time codes, passkeys) and login rate limiting. Guide: [Authentication](/en/guides/auth/introduction) · [Reference](/en/reference/warden)
- **`@c9up/transit`**: Federated sign-in through an authority the application does not own: OAuth2 and OAuth1 social providers, any OpenID Connect issuer, SAML 2.0 identity providers and LDAP or Active Directory. Guide: [Social authentication](/en/guides/auth/social/) · [Reference](/en/reference/transit)
- **`@c9up/visa`**: An OAuth 2.1 authorization server that issues tokens to other applications on a user's behalf: authorization code with PKCE, refresh rotation, client credentials, revocation, introspection and client registration, on a store contract. Guide: [OAuth server](/en/guides/oauth-server/introduction) · [Reference](/en/reference/visa)
- **`@c9up/sigil`**: Password hashing with argon2, bcrypt and scrypt, run by a native Rust engine. Guide: [Hashing](/en/guides/security/hashing) · [Reference](/en/reference/sigil)
- **`@c9up/blackhole`**: A security filter run by a native Rust engine: CSRF tokens, rate limiting, path traversal and parameter pollution refusal, CORS, protective headers with a nonce-based CSP, and HTML response sanitization, for ream, Express, Fastify and Hono. It also holds the named per-route limiter. Guide: [CSRF protection](/en/guides/security/csrf) · [Reference](/en/reference/blackhole)

## Realtime

- **`@c9up/relay`**: Realtime messages to the browser: channels broadcast over Server-Sent Events, and hubs a stock SignalR client speaks to over WebSockets or SSE. Guide: [Broadcasting](/en/guides/realtime/broadcasting), [Hubs](/en/guides/realtime/hubs) · [Reference](/en/reference/relay)

## Mobile

- **`@c9up/orbit`**: Aurora components as native views on a phone, laid out and diffed by a Rust host. Guide: [Introduction](/en/guides/mobile/introduction) · [Reference](/en/reference/orbit)
- **`@c9up/orbit-clipboard`**: The system clipboard, with the same two calls in the browser and on a phone. Guide: [Device APIs](/en/guides/mobile/device-apis) · [Reference](/en/reference/orbit-clipboard)
- **`@c9up/orbit-secure-store`**: Strings kept encrypted on the phone (Android Keystore), optionally behind a biometric check. Guide: [Device APIs](/en/guides/mobile/device-apis) · [Reference](/en/reference/orbit-secure-store)
- **`@c9up/robledo`**: Over-the-air updates for a ream app's mobile build, signed by `ream android:publish`, served by the app, verified on the phone and rolled back when they never reach their first screen. Guide: [Over-the-air updates](/en/guides/mobile/building#over-the-air-updates) · [Reference](/en/reference/robledo)

## Services

- **`@c9up/archive`**: File storage on named disks: a local driver with HMAC-signed URLs, and S3-compatible and Google Cloud Storage drivers, behind one driver contract. Guide: [Drive](/en/guides/digging-deeper/drive) · [Reference](/en/reference/archive)
- **`@c9up/atom`**: Exact decimal arithmetic, statistics and currency-bound money values, on a Rust engine with a TypeScript fallback. Guide: [Decimals and money](/en/guides/digging-deeper/decimals) · [Reference](/en/reference/atom)
- **`@c9up/bay`**: Background jobs: job classes dispatched onto named queues and run by a worker, with memory and Redis drivers behind one driver contract. Guide: [Queues](/en/guides/digging-deeper/queues) · [Reference](/en/reference/bay)
- **`@c9up/chronos`**: Dates, durations, intervals, recurrence rules and public holidays, on a Rust engine that handles time zones, parsing and formatting. Guide: [Dates](/en/guides/digging-deeper/dates) · [Reference](/en/reference/chronos)
- **`@c9up/echo`**: A cache with named stores, one or two layers (memory, Redis), grace periods, timeouts, single-flight factories and tags. Guide: [Cache](/en/guides/digging-deeper/cache) · [Reference](/en/reference/echo)
- **`@c9up/eclipse`**: Distributed locks: one key, one holder, with memory, Redis and SQL database stores behind one store contract. Guide: [Locks](/en/guides/digging-deeper/locks) · [Reference](/en/reference/eclipse)
- **`@c9up/goldstone`**: Reading mail for ream: IMAP mailboxes (watched in real time with IDLE) and the inbound mail providers post to a webhook, each message parsed as hostile input, its HTML sanitized and its sender checked (DKIM, SPF, DMARC, ARC). Sending stays with [rover](/en/reference/rover). [Reference](/en/reference/goldstone)
- **`@c9up/nova`**: Web Push notifications for ream: VAPID signing, encrypted delivery to the browsers' push services, a subscription endpoint and a service worker scaffold. Guide: [Push notifications](/en/guides/digging-deeper/push/) · [Reference](/en/reference/nova)
- **`@c9up/parsec`**: Metrics: counters, gauges and histograms behind one driver contract, with a zero-dependency Prometheus driver, an OpenTelemetry driver, an HTTP middleware and a protected scrape endpoint. Guide: [Metrics](/en/guides/digging-deeper/metrics) · [Reference](/en/reference/parsec)
- **`@c9up/prism`**: Image processing for ream on a Rust engine: inspect, resize, crop, rotate, composite, watermark, filter and convert images, serve responsive variants, draw QR codes and Swiss QR-bills. Guide: [Images](/en/guides/digging-deeper/images/) · [Reference](/en/reference/prism)
- **`@c9up/rosetta`**: Internationalization: translation catalogs with ICU messages, locale negotiation and fallbacks, `Intl` number, date and list formatting, request locale detection and typed translation keys. Guide: [I18n](/en/guides/digging-deeper/i18n) · [Reference](/en/reference/rosetta)
- **`@c9up/rover`**: Sending mail for ream, through SMTP, the log mailer or a provider's HTTP API (SES, Mailgun, SendGrid, Resend, Brevo, SparkPost), with templates, retries, queued sending and delivery webhooks. Guide: [Mail](/en/guides/digging-deeper/mail/) · [Reference](/en/reference/rover)
- **`@c9up/spectrum`**: Structured logging, with named loggers, child loggers, redaction, serializers and console or file channels. Guide: [Logger](/en/guides/digging-deeper/logger/) · [Reference](/en/reference/spectrum)
- **`@c9up/station`**: An admin panel for a ream application, built from a declarative catalogue of resources (`defineResource`) that mounts list, show, create, edit and destroy routes under `/admin`, behind a sign-in, per-action permissions, CSRF checks and an audit trail. Guide: [Admin panel](/en/guides/digging-deeper/admin/) · [Reference](/en/reference/station)
- **`@c9up/vellum`**: A PDF toolkit on a Rust engine: render pages to images, read text, metadata and forms, merge, split, rotate and stamp documents, fill and flatten forms, sign and verify signatures, and author new documents with `PdfDocument`. Guide: [PDF](/en/guides/digging-deeper/pdf/) · [Reference](/en/reference/vellum)

## Testing and tools

- **`@c9up/helix`**: The test runner: a `helix test` CLI that runs each file in its own worker, a `test` / `describe` DSL with an injected test context, `expect` and `assert` assertions, `vi` mocks, container overrides and a frozen clock. Guide: [The test runner](/en/guides/testing/runner) · [Reference](/en/reference/helix)
- **`@c9up/helix-plugin-ream`**: The bridge between a ream app and the helix test runner: a plugin that puts an HTTP test client on each test's context, and the runner behind `ream test`. Guide: [HTTP tests](/en/guides/testing/http-tests) · [Reference](/en/reference/helix-plugin-ream)
- **`@c9up/ream-mcp`**: A Model Context Protocol server over stdio that lets a coding agent search the project's docs, introspect its routes and providers, scaffold code, run migrations and scan for security issues. Guide: [AI agents (MCP)](/en/guides/digging-deeper/mcp) · [Reference](/en/reference/ream-mcp)
