# CORS

This guide covers CORS.

## CORS

```ts
cors: {
  origin: ['https://app.test'],  // true reflects any origin, '*' is the literal wildcard,
                                 // a comma-separated string, or (origin, ctx) => boolean | string | string[]
  methods: ['GET', 'POST'],
  headers: true,                 // false, a list, a string, or (headers, ctx) => …
  exposeHeaders: ['X-Total'],    // `exposedHeaders` is accepted too
  credentials: true,
  maxAge: 90,
  enabled: true,                 // or (ctx) => boolean
}
```

`origin: true` or `'*'` combined with `credentials: true` is refused at boot —
it would hand every site the user's cookies. An unknown option throws, so a
misspelt key cannot drop its setting without a word. A preflight asking for a
method or a header outside the allowed ones gets no CORS headers.
