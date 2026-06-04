# Securite et Operations

## Checklist production

1. `NODE_ENV=production`
2. middleware securite actifs et configures
3. strategy de rate-limit claire
4. CORS strict (pas de wildcard avec credentials)
5. graceful shutdown verifie
6. health/readiness endpoint branches orchestration
7. correlation id dans logs et erreurs

## Observabilite minimale

- latence p95/p99 par route
- taux 4xx/5xx
- erreurs middleware/kernel
- saturation ressources externes (DB/cache/bus)
