# CORS

Ce guide couvre CORS.

## CORS

```ts
cors: {
  origin: ['https://app.test'],  // true reflète toute origine, '*' est le joker littéral,
                                 // une chaîne séparée par des virgules, ou (origin, ctx) => boolean | string | string[]
  methods: ['GET', 'POST'],
  headers: true,                 // false, une liste, une chaîne, ou (headers, ctx) => …
  exposeHeaders: ['X-Total'],    // `exposedHeaders` est accepté aussi
  credentials: true,
  maxAge: 90,
  enabled: true,                 // ou (ctx) => boolean
}
```

`origin: true` ou `'*'` combiné à `credentials: true` est refusé au démarrage —
ce serait donner les cookies de l'utilisateur à tous les sites. Une option
inconnue lève une erreur : une clé mal orthographiée ne peut pas faire tomber
son réglage sans rien dire. Un préflight qui demande une méthode ou un en-tête
hors de ceux autorisés ne reçoit aucun en-tête CORS.
