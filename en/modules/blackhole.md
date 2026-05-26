# Blackhole — Security

`@c9up/blackhole` is a standalone Rust-native security filter for any Node.js framework. It runs **before** the NAPI boundary — rejected requests never reach Node.js. Works with Ream via `@c9up/blackhole/middleware`, or standalone with Express/Fastify via `blackholeExpress()` / `blackholeFastify()`.

## Installation

```bash
pnpm add @c9up/blackhole
ream configure @c9up/blackhole
```

The package provides three adapters:
- `@c9up/blackhole/provider` — Ream IoC provider
- `@c9up/blackhole/middleware` — Ream middleware
- `blackholeExpress(options)` / `blackholeFastify(...)` — standalone adapters

## Architecture

```
HTTP Request → [Blackhole Filter (Rust)] → NAPI → Node.js
                   ├── XSS Sanitization
                   ├── CSRF Validation
                   └── Rate Limiting
```

Blackhole implements the `SecurityFilter` trait from `ream-http`. Each check runs in Rust, before the request crosses to JavaScript.

## Configuration

```rust
BlackholeConfig {
    xss_enabled: true,           // Default: true
    csrf_enabled: true,          // Default: true
    rate_limit: Some((100, 60)), // 100 requests per 60 seconds window
}
```

With defaults, XSS sanitization and CSRF validation are on. Rate limiting is disabled unless explicitly configured.

## XSS Sanitization

All request query strings and bodies are sanitized by escaping HTML entities:

| Input | Output |
|-------|--------|
| `<script>` | `&lt;script&gt;` |
| `"onclick="` | `&quot;onclick=&quot;` |
| `'alert(1)'` | `&#x27;alert(1)&#x27;` |

Sanitization is **always applied** when enabled — there is no detection guard that can be bypassed. If the input was modified, the request continues with `FilterResult::Sanitized(request)` containing the cleaned data.

## CSRF Protection

State-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid CSRF token in the `x-csrf-token` header.

### Token Lifecycle

1. **Generate** — Call `generate_csrf_token()` to get a cryptographically random 32-byte token (sourced from `getrandom`)
2. **Send** — Return the token to the client (e.g., in a response header or JSON body)
3. **Submit** — Client includes it in `x-csrf-token` on the next state-changing request
4. **Validate** — Token is verified and **consumed** (single-use)

```
GET  /csrf-token                            → 200 { "token": "a1b2c3..." }
POST /orders                                → 403 CSRF_FAILED (no token)
POST /orders + x-csrf-token: a1b2c3...     → 200 OK (token consumed)
POST /orders + x-csrf-token: a1b2c3...     → 403 CSRF_FAILED (already used)
```

Properties:

- **Cryptographic randomness** — `getrandom` crate (CSPRNG), not timestamp-based
- **Single-use** — Each token is consumed on validation, preventing replay attacks
- **TTL** — Tokens expire after 1 hour (configurable)
- **Auto-purge** — Expired tokens are cleaned up on generation

### Safe Methods

`GET`, `HEAD`, and `OPTIONS` do not require CSRF tokens.

## Rate Limiting

Tracks requests per client IP within a sliding time window.

```rust
// Allow 100 requests per 60-second window
rate_limit: Some((100, 60))
```

When the limit is exceeded:

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }
```

HTTP status: `429 Too Many Requests`

The rate limiter:
- Extracts the client IP from the `X-Forwarded-For` header (falls back to `"unknown"`)
- Resets the counter when the time window expires
- Periodically evicts stale entries to prevent unbounded memory growth

## Filter Results

The security filter returns one of three results:

| Result | Meaning |
|--------|---------|
| `Allow(request)` | Request passed all checks unchanged |
| `Sanitized(request)` | XSS sanitization modified the request body or query |
| `Reject(response)` | Request blocked — `403` for CSRF, `429` for rate limiting |

## Next Steps

- [Warden (Auth)](/en/modules/warden) — Application-level authentication and authorization
- [Middleware](/en/guide/middleware) — Node.js middleware pipeline
