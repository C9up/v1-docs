# Checklist de production

Ce guide couvre ce qu’il faut vérifier avant la production :

- Checklist production
- Observabilité minimale

## Checklist production

1. `NODE_ENV=production`
2. middleware sécurité actifs et configures
3. strategy de rate-limit claire
4. CORS strict (pas de wildcard avec credentials)
5. graceful shutdown vérifie
6. health/readiness endpoint branches orchestration
7. correlation id dans logs et erreurs

## Observabilité minimale

- latence p95/p99 par route
- taux 4xx/5xx
- erreurs middleware/kernel
- saturation ressources externes (DB/cache/bus)
