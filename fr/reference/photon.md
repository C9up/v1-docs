# photon

Ce guide couvre la configuration et les erreurs de photon :

- Référence PhotonConfig
- Erreurs

## Référence PhotonConfig

| Propriété | Type | Défaut | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | — | Framework frontend a utiliser |
| `entryClient` | `string` | — | Chemin vers le point d'entrée d'hydratation client (ex. `'resources/app.tsx'`) |
| `buildDir` | `string` | `'public/build'` | Où le build client est écrit, sur disque |
| `assetsUrl` | `string` | `'/build'` | URL d'où le build client est servi (chemin depuis la racine ou URL http(s)) |
| `ssrBuildDir` | `string` | `'build/ssr'` | Où le bundle SSR est écrit ; refusé dans `buildDir` ou `public/` |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | URL du serveur de dev Vite (développement uniquement) |
| `dev` | `boolean` | selon l'environnement | Servir via le serveur de dev Vite ; non défini, seuls `ream dev` ou un `NODE_ENV` de développement/test l'activent |
| `defaultMeta` | `MetaTags` | — | Tags `<head>` par défaut a l'échelle de l'app (44.2) |
| `ssr.enabled` | `boolean` | `false` | Rendre les pages côté serveur |
| `ssr.entrypoint` | `string` | `'resources/ssr.tsx'` | Chemin vers le point d'entrée SSR |
| `ssr.pages` | `string[] \| (ctx, page) => boolean \| Promise<boolean>` | toutes les pages | Les pages rendues côté serveur |
| `encryptHistory` | `boolean` | `false` | Chiffrer l'historique de chaque page ; `ctx.photon.encryptHistory(false)` le désactive pour une réponse |
| `assetsVersion` | `string \| number` | empreinte du manifest | Une version d'assets fixe, envoyée avec chaque page |
| `rootView` | `string \| (ctx) => string \| RootViewRenderer` | document de Photon | Le document HTML d'une première visite : un nom de template pour `ctx.view`, ou une fonction qui en renvoie un (ou une fonction qui écrit le document) |

## Erreurs

Photon lève `PhotonError` (côté serveur, depuis `@c9up/photon`) et `PhotonClientError` (côté navigateur, depuis `@c9up/photon/client`). Les deux portent un `code`, un `hint` optionnel, un `context: Record<string, unknown>` optionnel, et un `docsUrl` qui résout l'ancre matchante dans le [catalogue d'erreurs Photon](/fr/reference/errors#erreurs-photon). Le `docsUrl` est énumérable sur l'instance d'erreur, donc les pipelines de log-shipping (Sentry, Datadog, vanilla `JSON.stringify`) l'embarquent sans configuration supplémentaire.

```ts
try {
  await renderer.boot()
} catch (err) {
  if (err instanceof PhotonError) {
    console.error(`[${err.code}] ${err.message}`)
    console.error(`Docs: ${err.docsUrl}`)
  }
  throw err
}
```

Voir le [catalogue complet](/fr/reference/errors#erreurs-photon) pour cause + fix par code.
