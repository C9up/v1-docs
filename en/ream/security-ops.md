# Security and Operations

## Production checklist

1. `NODE_ENV=production`
2. security middleware enabled and configured
3. explicit rate-limit policy
4. strict CORS (no wildcard with credentials)
5. graceful shutdown validated
6. health/readiness endpoints wired for orchestration
7. correlation IDs in logs and errors

## Minimal observability

- route p95/p99 latency
- 4xx/5xx rates
- middleware/kernel errors
- external resource saturation (DB/cache/bus)
